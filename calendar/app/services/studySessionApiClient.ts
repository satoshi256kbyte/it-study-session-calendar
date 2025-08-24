/**
 * 勉強会データ取得APIクライアント
 * 管理者向けAPIから承認済み勉強会データを取得
 * 要件1.4, 4.3に対応
 */

import {
  StudySessionApiResponse,
  StudySessionListResponse,
  StudySessionEvent,
  convertApiResponseToStudySessionEvent,
  isValidStudySessionApiResponse,
} from '../types/studySessionEvent'

/**
 * APIクライアントの設定
 */
interface ApiClientConfig {
  /** API ベースURL */
  baseUrl: string
  /** リクエストタイムアウト（ミリ秒） */
  timeout?: number
}

/**
 * APIエラークラス
 */
export class StudySessionApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'StudySessionApiError'
  }
}

/**
 * 勉強会データ取得APIクライアント
 * 要件1.4, 4.3に対応
 */
export class StudySessionApiClient {
  private config: Required<ApiClientConfig>

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000, // デフォルト10秒
      ...config,
    }
  }

  /**
   * 承認済み勉強会データを取得
   * 要件1.4, 4.3に対応
   */
  async getApprovedStudySessions(): Promise<StudySessionEvent[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/api/admin/study-sessions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new StudySessionApiError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          response
        )
      }

      const data = await response.json()

      // レスポンス形式の検証
      if (!this.isValidStudySessionListResponse(data)) {
        throw new StudySessionApiError(
          'Invalid API response format',
          response.status,
          response
        )
      }

      // 承認済みのイベントのみをフィルタリングして変換
      const approvedEvents = data.sessions
        .filter(
          (session: StudySessionApiResponse) => session.status === 'approved'
        )
        .map((session: StudySessionApiResponse) =>
          convertApiResponseToStudySessionEvent(session)
        )

      return approvedEvents
    } catch (error) {
      if (error instanceof StudySessionApiError) {
        throw error
      }

      // ネットワークエラーやその他のエラー
      throw new StudySessionApiError(
        `Failed to fetch study sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined
      )
    }
  }

  /**
   * タイムアウト付きfetch
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new StudySessionApiError(
          `Request timeout after ${this.config.timeout}ms`
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * StudySessionListResponseの型ガード
   */
  private isValidStudySessionListResponse(
    data: any
  ): data is { sessions: StudySessionApiResponse[] } {
    return (
      typeof data === 'object' &&
      data !== null &&
      Array.isArray(data.sessions) &&
      data.sessions.every((session: any) =>
        isValidStudySessionApiResponse(session)
      )
    )
  }
}

/**
 * デフォルトAPIクライアントインスタンス
 * 本番環境とローカル開発環境を自動判定
 */
export const defaultStudySessionApiClient = new StudySessionApiClient({
  baseUrl:
    process.env.NODE_ENV === 'production'
      ? 'https://it-study-session.satoshi256kbyte.net'
      : 'http://localhost:3001', // ローカル開発時のプロキシ先
  timeout: 10000,
})

/**
 * 承認済み勉強会データを取得するヘルパー関数
 * 要件1.4, 4.3に対応
 */
export async function fetchApprovedStudySessions(): Promise<
  StudySessionEvent[]
> {
  return defaultStudySessionApiClient.getApprovedStudySessions()
}

/**
 * エラーハンドリング用のヘルパー関数
 * 要件4.1, 4.2に対応
 */
export function handleStudySessionApiError(error: unknown): {
  message: string
  isRetryable: boolean
} {
  if (error instanceof StudySessionApiError) {
    // HTTPステータスコードに基づいてリトライ可能性を判定
    const isRetryable =
      !error.statusCode ||
      error.statusCode >= 500 ||
      error.statusCode === 408 || // Request Timeout
      error.statusCode === 429 // Too Many Requests

    return {
      message: error.message,
      isRetryable,
    }
  }

  // その他のエラー（ネットワークエラーなど）
  return {
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    isRetryable: true, // ネットワークエラーは基本的にリトライ可能
  }
}

/**
 * リトライ機能付きの勉強会データ取得関数
 * 要件4.1, 4.2に対応
 */
export async function fetchApprovedStudySessionsWithRetry(
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<StudySessionEvent[]> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchApprovedStudySessions()
    } catch (error) {
      lastError = error
      const errorInfo = handleStudySessionApiError(error)

      // リトライ不可能なエラーの場合は即座に失敗
      if (!errorInfo.isRetryable) {
        throw error
      }

      // 最後の試行の場合はリトライしない
      if (attempt === maxRetries) {
        break
      }

      // 指数バックオフでリトライ
      const delay = retryDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // すべてのリトライが失敗した場合
  throw lastError
}
