import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBService } from '../services/DynamoDBService'
import { GoogleCalendarService } from '../services/GoogleCalendarService'
import { NotificationService } from '../services/NotificationService'
import { CreateStudySessionRequest } from '../types/StudySession'
import { logger } from '../utils/logger'

const dynamoDBService = new DynamoDBService()
const googleCalendarService = new GoogleCalendarService()
const notificationService = new NotificationService()

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

// 勉強会登録（エンドユーザー向け）
export const createStudySession: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions()
    }

    const request: CreateStudySessionRequest = JSON.parse(event.body || '{}')

    // バリデーション
    if (!request.title || !request.url || !request.datetime) {
      return createErrorResponse(400, '必須項目が不足しています')
    }

    // 勉強会をDynamoDBに登録
    const session = await dynamoDBService.createStudySession(request)

    // 非同期でSNS通知を送信（エラーが発生しても登録処理は継続）
    const sessionForNotification = { ...session } // セッションデータをコピー
    setImmediate(async () => {
      try {
        await notificationService.publishStudySessionNotification(
          sessionForNotification
        )
        logger.info('Study session notification process completed', {
          sessionId: sessionForNotification.id,
        })
      } catch (notificationError) {
        logger.error('Study session notification process failed', {
          sessionId: sessionForNotification.id,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : 'Unknown error',
          stack:
            notificationError instanceof Error
              ? notificationError.stack
              : undefined,
        })
      }
    })

    logger.info('Study session created successfully', {
      sessionId: session.id,
      title: session.title,
      datetime: session.datetime,
    })

    return createSuccessResponse(201, session)
  } catch (error) {
    logger.error('Error creating study session:', error)
    return createErrorResponse(500, '内部サーバーエラー')
  }
}

// 勉強会一覧取得（管理者向け）
export const getStudySessions: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug('getStudySessions handler started')
    logger.debug('Event:', JSON.stringify(event, null, 2))

    if (event.httpMethod === 'OPTIONS') {
      logger.debug('OPTIONS request received, returning CORS headers')
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      }
    }

    logger.debug('Calling DynamoDBService.getStudySessions()')
    const sessions = await dynamoDBService.getStudySessions()

    logger.info(`Retrieved ${sessions.length} study sessions from database`)
    logger.debug('Sessions data:', JSON.stringify(sessions, null, 2))

    // レスポンス前の最終チェック
    const responseBody = { sessions }
    logger.debug(
      'Response body before sending:',
      JSON.stringify(responseBody, null, 2)
    )
    logger.debug(`Final count before response: ${sessions.length} sessions`)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseBody),
    }
  } catch (error) {
    logger.error('Error getting study sessions:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '内部サーバーエラー' }),
    }
  }
}

// 勉強会承認（管理者向け）
export const approveStudySession: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions()
    }

    const id = event.pathParameters?.id
    if (!id) {
      return createErrorResponse(400, 'IDが指定されていません')
    }

    // ステータスを承認済みに更新
    const session = await dynamoDBService.updateStudySessionStatus(
      id,
      'approved'
    )

    // Googleカレンダーにイベントを追加
    try {
      const eventUrl = await googleCalendarService.addEventToCalendar(session)
      logger.info('Event added to calendar:', eventUrl)
    } catch (calendarError) {
      logger.error('Failed to add to calendar:', calendarError)
      // カレンダー追加に失敗してもステータス更新は成功とする
    }

    return createSuccessResponse(200, session)
  } catch (error) {
    logger.error('Error approving study session:', error)
    return createErrorResponse(500, '内部サーバーエラー')
  }
}

// 勉強会却下（管理者向け）
export const rejectStudySession: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      }
    }

    const id = event.pathParameters?.id
    if (!id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'IDが指定されていません' }),
      }
    }

    const session = await dynamoDBService.updateStudySessionStatus(
      id,
      'rejected'
    )

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(session),
    }
  } catch (error) {
    logger.error('Error rejecting study session:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '内部サーバーエラー' }),
    }
  }
}

// 勉強会削除（管理者向け）
export const deleteStudySession: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      }
    }

    const id = event.pathParameters?.id
    if (!id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'IDが指定されていません' }),
      }
    }

    await dynamoDBService.deleteStudySession(id)

    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    }
  } catch (error) {
    logger.error('Error deleting study session:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '内部サーバーエラー' }),
    }
  }
}
