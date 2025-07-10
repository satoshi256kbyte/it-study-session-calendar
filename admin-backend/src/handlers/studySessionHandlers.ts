import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBService } from '../services/DynamoDBService'
import { GoogleCalendarService } from '../services/GoogleCalendarService'
import { CreateStudySessionRequest } from '../types/StudySession'

const dynamoDBService = new DynamoDBService()
const googleCalendarService = new GoogleCalendarService()

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

    const session = await dynamoDBService.createStudySession(request)
    return createSuccessResponse(201, session)
  } catch (error) {
    console.error('Error creating study session:', error)
    return createErrorResponse(500, '内部サーバーエラー')
  }
}

// 勉強会一覧取得（管理者向け）
export const getStudySessions: APIGatewayProxyHandler = async (
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

    const sessions = await dynamoDBService.getStudySessions()
    console.log('Count of study sessions:', sessions.length)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ sessions }),
    }
  } catch (error) {
    console.error('Error getting study sessions:', error)
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
      console.log('Event added to calendar:', eventUrl)
    } catch (calendarError) {
      console.error('Failed to add to calendar:', calendarError)
      // カレンダー追加に失敗してもステータス更新は成功とする
    }

    return createSuccessResponse(200, session)
  } catch (error) {
    console.error('Error approving study session:', error)
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
    console.error('Error rejecting study session:', error)
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
    console.error('Error deleting study session:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '内部サーバーエラー' }),
    }
  }
}
