import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBService } from '../services/DynamoDBService'
import {
  EventMaterialsResponse,
  EventMaterialsQuery,
} from '../types/EventMaterial'
import { logger } from '../utils/logger'

const dynamoDBService = new DynamoDBService()

// CORS ヘッダー（緩い設定）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': '*',
  'Access-Control-Max-Age': '3600',
}

// OPTIONSリクエストのハンドリング
const handleOptions = (): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: corsHeaders,
  body: '',
})

// エラーレスポンスの生成
const createErrorResponse = (
  statusCode: number,
  message: string
): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify({ error: message }),
})

// 成功レスポンスの生成
const createSuccessResponse = (
  statusCode: number,
  data: any
): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data),
})

/**
 * イベント資料一覧取得API
 * GET /api/events/materials
 * 要件1.2, 5.3, 6.4に対応
 */
export const getEventMaterials: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug('getEventMaterials handler started')
    logger.debug('Event:', JSON.stringify(event, null, 2))

    if (event.httpMethod === 'OPTIONS') {
      logger.debug('OPTIONS request received, returning CORS headers')
      return handleOptions()
    }

    // クエリパラメータの解析
    const queryParams = event.queryStringParameters || {}

    // パラメータの解析とデフォルト値の設定
    const monthsParam = queryParams.months
      ? parseInt(queryParams.months, 10)
      : 6
    const startParam = queryParams.start ? parseInt(queryParams.start, 10) : 1
    const countParam = queryParams.count ? parseInt(queryParams.count, 10) : 100

    // パラメータバリデーション（要件6.1: 包括的なエラーハンドリング）
    if (
      queryParams.months &&
      (isNaN(monthsParam) || monthsParam < 1 || monthsParam > 24)
    ) {
      logger.warn('Invalid months parameter:', queryParams.months)
      return createErrorResponse(
        400,
        'months パラメータは1-24の範囲で指定してください。指定された値: ' +
          queryParams.months
      )
    }

    if (queryParams.start && (isNaN(startParam) || startParam < 1)) {
      logger.warn('Invalid start parameter:', queryParams.start)
      return createErrorResponse(
        400,
        'start パラメータは1以上で指定してください。指定された値: ' +
          queryParams.start
      )
    }

    if (
      queryParams.count &&
      (isNaN(countParam) || countParam < 1 || countParam > 100)
    ) {
      logger.warn('Invalid count parameter:', queryParams.count)
      return createErrorResponse(
        400,
        'count パラメータは1-100の範囲で指定してください。指定された値: ' +
          queryParams.count
      )
    }

    const query: EventMaterialsQuery = {
      months: monthsParam,
      start: startParam,
      count: countParam,
    }

    logger.debug('Parsed query parameters:', query)

    logger.debug(
      `Fetching events with materials for past ${query.months} months`
    )

    // connpassイベントで資料があるもののみを取得
    const allEvents = await dynamoDBService.getEventsWithMaterials(
      query.months!
    )

    logger.debug(
      `Retrieved ${allEvents.length} events with materials from database`
    )

    // ページネーション処理
    const startIndex = query.start! - 1
    const endIndex = startIndex + query.count!
    const paginatedEvents = allEvents.slice(startIndex, endIndex)

    logger.debug(
      `Paginated events: ${paginatedEvents.length} events (${startIndex}-${endIndex} of ${allEvents.length})`
    )

    // レスポンス構築
    const response: EventMaterialsResponse = {
      count: paginatedEvents.length,
      total: allEvents.length,
      events: paginatedEvents,
    }

    logger.info(
      `Returning ${response.count} events with materials (total: ${response.total})`
    )

    // デバッグ用：各イベントの基本情報をログ出力
    if (logger.getLogLevel() >= 3) {
      // DEBUG level
      paginatedEvents.forEach((event, index) => {
        logger.debug(
          `Event ${index + 1}: ID=${event.id}, Title="${event.title}", Materials=${event.materials.length}, ConnpassUrl=${event.connpassUrl}`
        )
      })
    }

    return createSuccessResponse(200, response)
  } catch (error) {
    logger.error('Error getting event materials:', error)

    // エラーの詳細をログに記録（要件6.1: 包括的なエラーハンドリング）
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })

      // DynamoDBエラーの場合は特別な処理
      if (error.name === 'ResourceNotFoundException') {
        logger.error('DynamoDB table not found')
        return createErrorResponse(
          503,
          'データベースが利用できません。しばらく待ってから再試行してください'
        )
      }

      if (error.name === 'ValidationException') {
        logger.error('DynamoDB validation error')
        return createErrorResponse(
          400,
          'データベースクエリのパラメータが正しくありません'
        )
      }

      if (error.name === 'ProvisionedThroughputExceededException') {
        logger.error('DynamoDB throughput exceeded')
        return createErrorResponse(
          429,
          'リクエスト数が上限を超えました。しばらく待ってから再試行してください'
        )
      }

      if (error.name === 'ServiceUnavailableException') {
        logger.error('DynamoDB service unavailable')
        return createErrorResponse(
          503,
          'データベースサービスが一時的に利用できません'
        )
      }
    }

    return createErrorResponse(
      500,
      'サーバー内部エラーが発生しました。しばらく待ってから再試行してください'
    )
  }
}
