import { logger } from '../utils/logger'
import {
  ConnpassPresentationData,
  ConnpassPresentationsResponse,
  Material,
  MaterialType,
} from '../types/EventMaterial'

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
   * 要件6.1に対応
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<T> {
    await this.enforceRateLimit()

    const url = new URL(`${ConnpassApiService.BASE_URL}${endpoint}`)

    // クエリパラメータを追加
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString())
    })

    logger.debug(`Making request to connpass API: ${url.toString()}`)

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
        if (response.status === 401) {
          throw new Error('connpass API authentication failed: Invalid API key')
        } else if (response.status === 429) {
          throw new Error('connpass API rate limit exceeded')
        } else {
          throw new Error(
            `connpass API request failed: ${response.status} ${response.statusText}`
          )
        }
      }

      const data = await response.json()
      logger.debug('connpass API response received successfully')

      return data as T
    } catch (error) {
      logger.error('connpass API request failed:', error)
      throw error
    }
  }

  /**
   * connpassイベントIDから資料データを取得
   * 要件6.1に対応
   */
  async getPresentations(eventId: string): Promise<Material[]> {
    logger.debug(`Getting presentations for connpass event: ${eventId}`)

    try {
      // connpass API v2の/events/{id}/presentationsエンドポイントを使用
      const response =
        await this.makeAuthenticatedRequest<ConnpassPresentationsResponse>(
          `/events/${eventId}/presentations`
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
      logger.error(`Failed to get presentations for event ${eventId}:`, error)
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
}
