import { ScheduledEvent, Context, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBService } from '../services/DynamoDBService'
import { ConnpassApiService } from '../services/ConnpassApiService'
import { SecretsManagerService } from '../services/SecretsManagerService'
import { EventRecord, Material } from '../types/EventMaterial'
import { logger } from '../utils/logger'

/**
 * connpass資料取得バッチ処理Lambda関数
 * EventBridge経由で日次実行される
 * 要件6.1, 6.3, 6.4に対応
 */
export const batchUpdateMaterials = async (
  event: ScheduledEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  logger.info('Starting connpass materials batch update', {
    eventId: event.id,
    time: event.time,
    requestId: context.awsRequestId,
  })

  const dynamoDBService = new DynamoDBService()
  const secretsManagerService = new SecretsManagerService()

  let processedCount = 0
  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    // 1. connpass APIキーを取得
    logger.info('Retrieving connpass API key from Secrets Manager')
    const apiKey = await secretsManagerService.getConnpassApiKey()
    logger.info('connpass API key retrieved successfully')

    // 2. connpass APIサービスを初期化
    const connpassApiService = new ConnpassApiService(apiKey)

    // 3. APIキーの有効性をテスト
    logger.info('Testing connpass API key validity')
    const isValidKey = await connpassApiService.testApiKey()
    if (!isValidKey) {
      throw new Error('connpass API key is invalid')
    }
    logger.info('connpass API key is valid')

    // 4. connpass URLを持つ承認済みイベントを取得
    logger.info('Fetching approved events with connpass URLs')
    const events = await dynamoDBService.getApprovedEventsWithConnpassUrl()
    logger.info(`Found ${events.length} approved events with connpass URLs`)

    if (events.length === 0) {
      logger.info('No events to process, batch update completed')
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No events to process',
          processedCount: 0,
          successCount: 0,
          errorCount: 0,
        }),
      }
    }

    // 5. 各イベントの資料データを更新
    for (const eventRecord of events) {
      processedCount++

      try {
        logger.info(`Processing event ${processedCount}/${events.length}`, {
          eventId: eventRecord.eventId,
          title: eventRecord.title,
          connpassUrl: eventRecord.connpassUrl,
        })

        // connpass URLからイベントIDを抽出
        const connpassEventId = ConnpassApiService.extractEventIdFromUrl(
          eventRecord.connpassUrl
        )
        if (!connpassEventId) {
          const error = `Invalid connpass URL format: ${eventRecord.connpassUrl}`
          logger.warn(error, { eventId: eventRecord.eventId })
          errors.push(`Event ${eventRecord.eventId}: ${error}`)
          errorCount++
          continue
        }

        logger.debug(`Extracted connpass event ID: ${connpassEventId}`)

        // connpass APIから資料データを取得
        logger.debug(
          `Fetching presentations for connpass event: ${connpassEventId}`
        )
        const materials =
          await connpassApiService.getPresentations(connpassEventId)

        logger.info(
          `Retrieved ${materials.length} materials for event ${eventRecord.eventId}`
        )

        // イベントレコードを更新
        const updatedEventRecord: EventRecord = {
          ...eventRecord,
          materials,
          updatedAt: new Date().toISOString(),
        }

        // DynamoDBに保存
        await dynamoDBService.upsertEventRecord(updatedEventRecord)

        logger.info(
          `Successfully updated materials for event ${eventRecord.eventId}`
        )
        successCount++
      } catch (error) {
        const errorMessage = `Failed to update materials for event ${eventRecord.eventId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
        logger.error(errorMessage, error)
        errors.push(errorMessage)
        errorCount++

        // エラーが発生してもバッチ処理は継続
        continue
      }
    }

    // 6. 処理結果をログ出力
    logger.info('Batch update completed', {
      processedCount,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    })

    // 7. 結果を返す
    const result: APIGatewayProxyResult = {
      statusCode: errorCount === processedCount ? 500 : 200,
      body: JSON.stringify({
        message: 'Batch update completed',
        processedCount,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
    }

    return result
  } catch (error) {
    const errorMessage = `Batch update failed: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error(errorMessage, error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: errorMessage,
        processedCount,
        successCount,
        errorCount,
        errors: [...errors, errorMessage],
      }),
    }
  }
}

/**
 * 手動実行用のヘルパー関数
 * テスト目的で使用
 */
export const manualBatchUpdate = async (): Promise<APIGatewayProxyResult> => {
  const mockEvent: ScheduledEvent = {
    id: 'manual-execution',
    'detail-type': 'Scheduled Event',
    source: 'manual',
    account: 'manual',
    time: new Date().toISOString(),
    region: 'manual',
    detail: {},
    version: '0',
    resources: [],
  }

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'batchUpdateMaterials',
    functionVersion: '$LATEST',
    invokedFunctionArn:
      'arn:aws:lambda:region:account:function:batchUpdateMaterials',
    memoryLimitInMB: '128',
    awsRequestId: `manual-${Date.now()}`,
    logGroupName: '/aws/lambda/batchUpdateMaterials',
    logStreamName: 'manual-execution',
    getRemainingTimeInMillis: () => 300000, // 5 minutes
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }

  return await batchUpdateMaterials(mockEvent, mockContext)
}

/**
 * バッチ処理の統計情報を取得
 */
export interface BatchStatistics {
  totalEvents: number
  eventsWithMaterials: number
  eventsWithoutMaterials: number
  lastUpdateTime?: string
}

export const getBatchStatistics = async (): Promise<BatchStatistics> => {
  logger.info('Getting batch statistics')

  const dynamoDBService = new DynamoDBService()

  try {
    // connpass URLを持つ承認済みイベントを取得
    const events = await dynamoDBService.getApprovedEventsWithConnpassUrl()

    const eventsWithMaterials = events.filter(
      event => event.materials && event.materials.length > 0
    ).length

    const eventsWithoutMaterials = events.length - eventsWithMaterials

    // 最新の更新時刻を取得
    const lastUpdateTime = events
      .filter(event => event.updatedAt)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .map(event => event.updatedAt)[0]

    const statistics: BatchStatistics = {
      totalEvents: events.length,
      eventsWithMaterials,
      eventsWithoutMaterials,
      lastUpdateTime,
    }

    logger.info('Batch statistics retrieved', statistics)
    return statistics
  } catch (error) {
    logger.error('Failed to get batch statistics:', error)
    throw error
  }
}
