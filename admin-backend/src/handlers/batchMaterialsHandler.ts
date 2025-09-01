import { ScheduledEvent, Context, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBService } from '../services/DynamoDBService'
import { ConnpassApiService } from '../services/ConnpassApiService'
import { SecretsManagerService } from '../services/SecretsManagerService'
import {
  HiroshimaEventDiscoveryService,
  HiroshimaDiscoveryResult,
} from '../services/HiroshimaEventDiscoveryService'
import { NotificationService } from '../services/NotificationService'
import { EventRecord, Material } from '../types/EventMaterial'
import { logger } from '../utils/logger'

/**
 * バッチ処理結果の型定義
 * 要件5.4に対応
 */
export interface BatchUpdateResult {
  /** 資料更新処理の結果 */
  processedCount: number
  successCount: number
  errorCount: number
  errors?: string[]

  /** 広島イベント発見処理の結果 */
  hiroshimaDiscovery?: HiroshimaDiscoveryResult
}

/**
 * connpass資料取得バッチ処理Lambda関数
 * EventBridge経由で日次実行される
 * 要件5.1, 5.2, 6.1, 6.3, 6.4に対応
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
  const notificationService = new NotificationService()

  let processedCount = 0
  let successCount = 0
  let errorCount = 0
  const errors: string[] = []
  let hiroshimaDiscoveryResult: HiroshimaDiscoveryResult | undefined

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
      logger.info(
        'No events to process for materials update, continuing with Hiroshima discovery'
      )
    }

    // 5. 各イベントの資料データを更新（イベントがある場合のみ）
    for (const eventRecord of events) {
      processedCount++

      try {
        logger.info(`Processing event ${processedCount}/${events.length}`, {
          eventId: eventRecord.eventId,
          title: eventRecord.title,
          eventUrl: eventRecord.eventUrl,
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

        // 次のイベント処理前に追加の待機時間を設ける（並列処理を完全に回避）
        if (processedCount < events.length) {
          logger.debug('Waiting before processing next event...')
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
        }
      } catch (error) {
        // 要件6.3, 6.4: 詳細なエラーログとスタックトレース出力を実装
        const eventErrorDetails = {
          eventId: eventRecord.eventId,
          title: eventRecord.title,
          eventUrl: eventRecord.eventUrl,
          connpassUrl: eventRecord.connpassUrl,
          operation: 'materialUpdate',
          errorType:
            error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }

        const errorMessage = `Failed to update materials for event ${eventRecord.eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error(errorMessage, eventErrorDetails)
        errors.push(errorMessage)
        errorCount++

        // エラーが発生してもバッチ処理は継続
        // 次のイベント処理前に追加の待機時間を設ける
        if (processedCount < events.length) {
          logger.debug('Waiting before processing next event after error...')
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
        }
        continue
      }
    }

    // 6. 広島イベント発見処理を実行
    // 要件5.1, 5.2: 既存のバッチ処理に広島イベント発見処理を統合
    logger.info('Starting Hiroshima event discovery process')
    try {
      const hiroshimaEventDiscoveryService = new HiroshimaEventDiscoveryService(
        connpassApiService,
        dynamoDBService,
        notificationService
      )

      hiroshimaDiscoveryResult =
        await hiroshimaEventDiscoveryService.discoverAndRegisterEvents()
      logger.info('Hiroshima event discovery completed successfully', {
        totalFound: hiroshimaDiscoveryResult.totalFound,
        newRegistrations: hiroshimaDiscoveryResult.newRegistrations,
        duplicatesSkipped: hiroshimaDiscoveryResult.duplicatesSkipped,
        errors: hiroshimaDiscoveryResult.errors.length,
      })
    } catch (hiroshimaError) {
      // 要件5.2, 6.3, 6.4: 広島イベント発見の失敗が既存処理に影響しないエラーハンドリング
      const hiroshimaErrorDetails = {
        operation: 'hiroshimaEventDiscovery',
        errorType:
          hiroshimaError instanceof Error
            ? hiroshimaError.constructor.name
            : 'Unknown',
        errorMessage:
          hiroshimaError instanceof Error
            ? hiroshimaError.message
            : 'Unknown error',
        stack:
          hiroshimaError instanceof Error ? hiroshimaError.stack : undefined,
      }

      const errorMessage = `Hiroshima event discovery failed: ${hiroshimaError instanceof Error ? hiroshimaError.message : 'Unknown error'}`
      logger.error(errorMessage, hiroshimaErrorDetails)

      // 広島イベント発見の失敗は既存の資料更新処理の成功に影響しない
      hiroshimaDiscoveryResult = {
        totalFound: 0,
        newRegistrations: 0,
        duplicatesSkipped: 0,
        errors: [errorMessage],
        registeredEvents: [],
      }
    }

    // 7. 統合処理結果をログ出力
    logger.info('Complete batch update finished', {
      materials: {
        processedCount,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      },
      hiroshimaDiscovery: {
        totalFound: hiroshimaDiscoveryResult.totalFound,
        newRegistrations: hiroshimaDiscoveryResult.newRegistrations,
        duplicatesSkipped: hiroshimaDiscoveryResult.duplicatesSkipped,
        errors:
          hiroshimaDiscoveryResult.errors.length > 0
            ? hiroshimaDiscoveryResult.errors
            : undefined,
      },
    })

    // 8. 統合レスポンスを生成
    // 要件5.4: バッチ処理が完了した時、システムはレスポンスに広島イベント発見結果を含める
    const batchResult: BatchUpdateResult = {
      processedCount,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      hiroshimaDiscovery: hiroshimaDiscoveryResult,
    }

    const result: APIGatewayProxyResult = {
      statusCode:
        processedCount > 0 && errorCount === processedCount ? 500 : 200,
      body: JSON.stringify({
        message: 'Complete batch update finished',
        ...batchResult,
      }),
    }

    return result
  } catch (error) {
    // 要件6.3, 6.4: 詳細なエラーログとスタックトレース出力を実装
    const batchErrorDetails = {
      processedCount,
      successCount,
      errorCount,
      operation: 'batchUpdate',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: context.awsRequestId,
    }

    const errorMessage = `Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error(errorMessage, batchErrorDetails)

    const batchResult: BatchUpdateResult = {
      processedCount,
      successCount,
      errorCount,
      errors: [...errors, errorMessage],
      hiroshimaDiscovery: hiroshimaDiscoveryResult,
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: errorMessage,
        ...batchResult,
      }),
    }
  }
}

/**
 * 手動実行用のヘルパー関数
 * テスト目的で使用
 * 要件5.5: 手動バッチ実行がトリガーされた時、システムは手動実行に広島イベント発見を含める
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
