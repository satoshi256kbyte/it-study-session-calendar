import { logger } from '../utils/logger'
import {
  ConnpassPresentationData,
  ConnpassPresentationsResponse,
  ConnpassEventData,
  ConnpassSearchResult,
  Material,
  MaterialType,
} from '../types/EventMaterial'

/**
 * connpass API専用エラークラス
 * 要件1.4, 1.5に対応
 */
export class ConnpassApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly httpStatus: number,
    public readonly retryable: boolean
  ) {
    super(message)
    this.name = 'ConnpassApiError'
  }
}

/**
 * connpass API v2クライアントサービス
 * 要件6.1, 6.6に対応
 */
export class ConnpassApiService {
  private static readonly BASE_URL = 'https://connpass.com/api/v2'
  private static readonly RATE_LIMIT_DELAY = 5000 // 5秒間隔
  private static lastRequestTime = 0 // 全インスタンス間で共有

  constructor(private apiKey: string) {
    logger.debug('ConnpassApiService initialized')
  }

  /**
   * レート制限を遵守するための待機処理
   * 要件6.6に対応
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - ConnpassApiService.lastRequestTime

    if (timeSinceLastRequest < ConnpassApiService.RATE_LIMIT_DELAY) {
      const waitTime =
        ConnpassApiService.RATE_LIMIT_DELAY - timeSinceLastRequest
      logger.debug(`Rate limiting: waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    ConnpassApiService.lastRequestTime = Date.now()
  }

  /**
   * connpass API v2への認証付きHTTPリクエスト
   * 要件6.1, 1.4, 1.5に対応
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
    retryCount: number = 0
  ): Promise<T> {
    await this.enforceRateLimit()

    const url = new URL(`${ConnpassApiService.BASE_URL}${endpoint}`)

    // クエリパラメータを追加
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString())
    })

    logger.debug(`Making request to connpass API: ${url.toString()}`, {
      endpoint,
      params,
      retryCount,
    })

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'IT-Study-Calendar-Bot/1.0',
        },
      })

      if (!response.ok) {
        // 要件1.4: connpass APIエラー（401, 429, その他）の分類と対応を実装
        await this.handleApiError(response, endpoint, retryCount)
      }

      const data = await response.json()
      logger.debug('connpass API response received successfully', {
        endpoint,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      })

      return data as T
    } catch (error) {
      // 要件1.5: 詳細なエラーログとスタックトレース出力を実装
      const errorDetails = {
        endpoint,
        params,
        retryCount,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }

      logger.error(
        'connpass API request failed with detailed context:',
        errorDetails
      )

      // エラーを再スローして上位で処理継続判断を行う
      throw error
    }
  }

  /**
   * connpass APIエラーの分類と対応処理
   * 要件1.4に対応
   */
  private async handleApiError(
    response: Response,
    endpoint: string,
    retryCount: number
  ): Promise<never> {
    const errorContext = {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      retryCount,
    }

    if (response.status === 401) {
      // 認証エラー（401）: ログ記録、処理継続
      logger.error(
        'connpass API authentication failed: Invalid API key',
        errorContext
      )
      throw new ConnpassApiError(
        'connpass API authentication failed: Invalid API key',
        'AUTHENTICATION_FAILED',
        response.status,
        false // リトライ不可
      )
    } else if (response.status === 429) {
      // レート制限エラー（429）: 待機後リトライ（1回のみ）
      logger.warn('connpass API rate limit exceeded', errorContext)

      if (retryCount === 0) {
        logger.info('Attempting retry after rate limit with extended wait time')
        // 通常の5秒に加えて追加の10秒待機
        await new Promise(resolve => setTimeout(resolve, 10000))
        // リトライを実行（再帰呼び出しでretryCountを1に設定）
        throw new ConnpassApiError(
          'connpass API rate limit exceeded - retry needed',
          'RATE_LIMIT_RETRY',
          response.status,
          true // リトライ可能
        )
      } else {
        logger.error(
          'connpass API rate limit exceeded after retry',
          errorContext
        )
        throw new ConnpassApiError(
          'connpass API rate limit exceeded after retry',
          'RATE_LIMIT_EXCEEDED',
          response.status,
          false // リトライ済み
        )
      }
    } else {
      // その他APIエラー: ログ記録、処理継続
      logger.error('connpass API request failed with HTTP error', errorContext)
      throw new ConnpassApiError(
        `connpass API request failed: ${response.status} ${response.statusText}`,
        'HTTP_ERROR',
        response.status,
        false // リトライ不可
      )
    }
  }

  /**
   * connpassイベントIDから資料データを取得
   * 要件6.1, 1.4, 1.5に対応
   */
  async getPresentations(eventId: string): Promise<Material[]> {
    logger.debug(`Getting presentations for connpass event: ${eventId}`)

    try {
      // connpass API v2の/events/{id}/presentationsエンドポイントを使用
      const response =
        await this.makeAuthenticatedRequestWithRetry<ConnpassPresentationsResponse>(
          `/events/${eventId}/presentations?count=100`
        )

      logger.debug(
        `Retrieved ${response.results_returned} presentations from connpass API`
      )

      // connpass APIレスポンスをMaterial型に変換
      const materials: Material[] = response.presentations.map(
        (presentation, index) => this.convertToMaterial(presentation, index)
      )

      logger.debug(
        `Converted ${materials.length} presentations to Material format`
      )

      return materials
    } catch (error) {
      // 要件1.5: 詳細なエラーログとスタックトレース出力を実装
      const errorDetails = {
        eventId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isConnpassApiError: error instanceof ConnpassApiError,
        stack: error instanceof Error ? error.stack : undefined,
      }

      logger.error(
        `Failed to get presentations for event ${eventId} with detailed context:`,
        errorDetails
      )
      throw error
    }
  }

  /**
   * connpass URLからイベントIDを抽出
   * 例: https://connpass.com/event/123456/ -> "123456"
   */
  static extractEventIdFromUrl(connpassUrl: string): string | null {
    try {
      logger.debug(`Extracting event ID from URL: ${connpassUrl}`)
      const match = connpassUrl.match(/\/event\/(\d+)\/?/)
      const eventId = match ? match[1] : null
      logger.debug(`Extracted event ID: ${eventId}`)
      return eventId
    } catch (error) {
      logger.error('Failed to extract event ID from connpass URL:', error)
      return null
    }
  }

  /**
   * ConnpassPresentationDataをMaterial型に変換
   * 要件6.1に対応
   */
  private convertToMaterial(
    presentation: ConnpassPresentationData,
    index: number
  ): Material {
    const now = new Date().toISOString()

    // connpass APIのpresentation_typeとURLから資料の種類を推定
    const materialType = this.inferMaterialType(
      presentation.url,
      presentation.presentation_type
    )

    // 一意なIDを生成（connpass APIには資料IDがないため）
    const materialId = `connpass_${Date.now()}_${index}`

    const material: Material = {
      id: materialId,
      title: presentation.name || 'Untitled Presentation',
      url: presentation.url,
      type: materialType,
      createdAt: presentation.created_at || now,
    }

    // 発表者のニックネームを追加
    if (presentation.presenter?.nickname) {
      material.presenterNickname = presentation.presenter.nickname
    }

    // connpass APIの元の資料種別を保存
    if (presentation.presentation_type) {
      material.originalType = presentation.presentation_type
    }

    return material
  }

  /**
   * connpass APIのpresentation_typeとURLから資料の種類を推定
   * 要件6.1に対応
   */
  private inferMaterialType(
    url: string,
    presentationType?: string
  ): MaterialType {
    // connpass APIのpresentation_typeを優先的に使用
    if (presentationType) {
      switch (presentationType.toLowerCase()) {
        case 'slide':
        case 'slides':
          return 'slide'
        case 'video':
          return 'video'
        case 'blog':
          return 'blog'
        case 'document':
          return 'document'
        default:
          // 不明な場合はURLから推定
          break
      }
    }
    const lowerUrl = url.toLowerCase()

    // スライド系サービス
    if (
      lowerUrl.includes('speakerdeck.com') ||
      lowerUrl.includes('slideshare.net') ||
      lowerUrl.includes('slides.com') ||
      lowerUrl.includes('docs.google.com/presentation')
    ) {
      return 'slide'
    }

    // 動画系サービス
    if (
      lowerUrl.includes('youtube.com') ||
      lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('vimeo.com')
    ) {
      return 'video'
    }

    // ドキュメント系
    if (
      lowerUrl.includes('docs.google.com/document') ||
      lowerUrl.includes('notion.so') ||
      lowerUrl.includes('github.com') ||
      lowerUrl.includes('qiita.com') ||
      lowerUrl.includes('zenn.dev')
    ) {
      return 'document'
    }

    // ファイル拡張子による判定
    if (lowerUrl.match(/\.(pdf|ppt|pptx)$/)) {
      return 'slide'
    }

    if (lowerUrl.match(/\.(doc|docx|txt|md)$/)) {
      return 'document'
    }

    if (lowerUrl.match(/\.(mp4|avi|mov|wmv)$/)) {
      return 'video'
    }

    // デフォルトはその他
    return 'other'
  }

  /**
   * キーワードでイベントを検索
   * 要件1.1, 1.3, 1.4, 1.5に対応
   */
  async searchEventsByKeyword(
    keyword: string,
    count: number = 100
  ): Promise<ConnpassSearchResult> {
    logger.debug(`Searching connpass events with keyword: ${keyword}`)

    try {
      // connpass API v2の/events/エンドポイントを使用してキーワード検索
      const response = await this.makeAuthenticatedRequestWithRetry<{
        results_returned: number
        results_available: number
        results_start: number
        events: ConnpassEventData[]
      }>('/events/', {
        keyword: keyword,
        count: count,
        order: 2, // 開催日時順
      })

      logger.debug(
        `Retrieved ${response.results_returned} events from connpass API (total: ${response.results_available})`
      )

      // レスポンスをConnpassSearchResult型に変換
      const searchResult: ConnpassSearchResult = {
        events: response.events || [],
        totalCount: response.results_available || 0,
      }

      logger.debug(
        `Converted search result: ${searchResult.events.length} events`
      )

      return searchResult
    } catch (error) {
      // 要件1.5: 詳細なエラーログとスタックトレース出力を実装
      const errorDetails = {
        keyword,
        count,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isConnpassApiError: error instanceof ConnpassApiError,
        stack: error instanceof Error ? error.stack : undefined,
      }

      logger.error(
        `Failed to search events with keyword "${keyword}" with detailed context:`,
        errorDetails
      )
      throw error
    }
  }

  /**
   * APIキーの有効性をテスト
   * 要件6.1に対応
   */
  async testApiKey(): Promise<boolean> {
    logger.debug('Testing connpass API key validity')

    try {
      // 簡単なAPIコールでキーの有効性をテスト
      await this.makeAuthenticatedRequest('/events/', {
        count: 1,
      })

      logger.debug('connpass API key is valid')
      return true
    } catch (error) {
      logger.error('connpass API key test failed:', error)
      return false
    }
  }

  /**
   * リトライ機能付きのconnpass APIリクエスト
   * 要件1.4に対応
   */
  private async makeAuthenticatedRequestWithRetry<T>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<T> {
    try {
      return await this.makeAuthenticatedRequest<T>(endpoint, params, 0)
    } catch (error) {
      if (
        error instanceof ConnpassApiError &&
        error.errorCode === 'RATE_LIMIT_RETRY' &&
        error.retryable
      ) {
        // レート制限エラーの場合、1回だけリトライ
        logger.info('Retrying connpass API request after rate limit')
        return await this.makeAuthenticatedRequest<T>(endpoint, params, 1)
      }
      // その他のエラーまたはリトライ不可の場合はそのまま再スロー
      throw error
    }
  }
}
