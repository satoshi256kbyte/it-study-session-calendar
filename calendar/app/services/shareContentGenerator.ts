/**
 * Twitter共有コンテンツ生成サービス
 * 勉強会データをTwitterシェア用テキストに変換するロジックを実装
 * 要件1.1, 1.3, 3.3に対応
 * パフォーマンス最適化: メモ化とキャッシュ機能を追加
 */

import {
  StudySessionEvent,
  filterUpcomingEventsThisMonth,
  formatEventDateForShare,
} from '../types/studySessionEvent'

/**
 * Twitter文字数制限（280文字）
 */
const TWITTER_CHARACTER_LIMIT = 280

/**
 * シェアコンテンツ生成設定
 */
interface ShareContentConfig {
  /** カレンダーURL */
  calendarUrl: string
  /** ハッシュタグ */
  hashtags?: string[]
  /** 基本メッセージ */
  baseMessage?: string
}

/**
 * シェアコンテンツ生成結果
 */
interface ShareContentResult {
  /** 生成されたシェアテキスト */
  shareText: string
  /** 含まれたイベント数 */
  includedEventsCount: number
  /** 切り詰められたかどうか */
  wasTruncated: boolean
}

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry {
  result: ShareContentResult
  timestamp: number
  eventsHash: string
}

/**
 * シェアコンテンツ生成サービス
 * 勉強会データをTwitterシェア用テキストに変換
 * パフォーマンス最適化: メモ化とキャッシュ機能付き
 */
export class ShareContentGenerator {
  private config: ShareContentConfig
  private cache: Map<string, CacheEntry> = new Map()
  private readonly cacheExpiryMs: number = 5 * 60 * 1000 // 5分間キャッシュ
  private readonly maxCacheSize: number = 10 // 最大キャッシュサイズ

  constructor(config: ShareContentConfig) {
    this.config = config
  }

  /**
   * イベント配列のハッシュを生成（キャッシュキー用）
   */
  private generateEventsHash(events: StudySessionEvent[]): string {
    const eventIds = events
      .map(event => `${event.id}-${event.startDate.getTime()}-${event.title}`)
      .sort()
      .join('|')

    // Unicode文字を含む可能性があるため、単純なハッシュ関数を使用
    let hash = 0
    for (let i = 0; i < eventIds.length; i++) {
      const char = eventIds.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 32bit整数に変換
    }
    return Math.abs(hash).toString(36).slice(0, 16) // 36進数で短縮
  }

  /**
   * キャッシュをクリーンアップ（期限切れエントリを削除）
   */
  private cleanupCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiryMs) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key))

    // サイズ制限を超えている場合、古いエントリから削除
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      const entriesToRemove = entries.slice(
        0,
        this.cache.size - this.maxCacheSize
      )
      entriesToRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * キャッシュからエントリを取得
   */
  private getCachedResult(cacheKey: string): ShareContentResult | null {
    const entry = this.cache.get(cacheKey)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > this.cacheExpiryMs) {
      this.cache.delete(cacheKey)
      return null
    }

    return entry.result
  }

  /**
   * 結果をキャッシュに保存
   */
  private setCachedResult(
    cacheKey: string,
    result: ShareContentResult,
    eventsHash: string
  ): void {
    this.cleanupCache()

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      eventsHash,
    })
  }

  /**
   * 当月かつ現在日以降のイベントをフィルタリング
   * 要件1.1に対応
   */
  public filterUpcomingEvents(
    events: StudySessionEvent[]
  ): StudySessionEvent[] {
    return filterUpcomingEventsThisMonth(events)
  }

  /**
   * イベント日付をMM/DD形式でフォーマット
   * 要件1.3に対応
   */
  public formatEventDate(date: Date): string {
    return formatEventDateForShare(date)
  }

  /**
   * 単一イベントをシェア用テキスト行に変換
   * 要件1.3に対応
   */
  public formatEventForShare(event: StudySessionEvent): string {
    const formattedDate = this.formatEventDate(event.startDate)
    return `${formattedDate} ${event.title}`
  }

  /**
   * イベントリストをシェア用テキストに変換
   * 要件1.3に対応
   */
  public formatEventsListForShare(events: StudySessionEvent[]): string[] {
    // 日付順にソート（早い順）
    const sortedEvents = [...events].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    )

    return sortedEvents.map(event => this.formatEventForShare(event))
  }

  /**
   * 基本シェアメッセージを生成
   */
  private generateBaseMessage(): string {
    return this.config.baseMessage || '📅 今月の広島IT勉強会'
  }

  /**
   * ハッシュタグ部分を生成
   */
  private generateHashtags(): string {
    const defaultHashtags = ['#広島IT', '#勉強会', '#プログラミング']
    const hashtags = this.config.hashtags || defaultHashtags
    return hashtags.join(' ')
  }

  /**
   * フッター部分（URL + ハッシュタグ）を生成
   */
  private generateFooter(): string {
    const urlLine = `詳細はこちら: ${this.config.calendarUrl}`
    const hashtagsLine = this.generateHashtags()
    return `${urlLine}\n\n${hashtagsLine}`
  }

  /**
   * 文字数制限に対応したコンテンツ切り詰め処理
   * 要件3.3に対応
   */
  public truncateContentToLimit(
    baseMessage: string,
    eventLines: string[],
    footer: string
  ): ShareContentResult {
    // 基本構造の文字数を計算（改行文字も含む）
    const baseStructureLength = baseMessage.length + footer.length + 2 // 2つの改行

    // イベントリストに使用可能な文字数
    const availableForEvents = TWITTER_CHARACTER_LIMIT - baseStructureLength

    if (availableForEvents <= 0) {
      // 基本構造だけで制限を超える場合は、フォールバック
      return {
        shareText: `${baseMessage}\n\n${this.config.calendarUrl}`,
        includedEventsCount: 0,
        wasTruncated: true,
      }
    }

    // イベントを順番に追加していき、制限内に収まる最大数を見つける
    let includedEvents: string[] = []
    let currentLength = 0

    for (const eventLine of eventLines) {
      const lineWithNewline = eventLine + '\n'
      if (currentLength + lineWithNewline.length <= availableForEvents) {
        includedEvents.push(eventLine)
        currentLength += lineWithNewline.length
      } else {
        break
      }
    }

    // 切り詰められた場合の処理
    const wasTruncated = includedEvents.length < eventLines.length
    if (wasTruncated && includedEvents.length > 0) {
      const remainingCount = eventLines.length - includedEvents.length
      const moreEventsMessage = `...他${remainingCount}件のイベント`

      // 最後のイベントを削除して「...他X件」メッセージを追加できるかチェック
      if (includedEvents.length > 1) {
        const lastEventLength =
          includedEvents[includedEvents.length - 1].length + 1 // +1 for newline
        if (lastEventLength >= moreEventsMessage.length + 1) {
          includedEvents.pop()
          includedEvents.push(moreEventsMessage)
        }
      }
    }

    // 最終的なシェアテキストを組み立て
    const eventsSection =
      includedEvents.length > 0 ? '\n\n' + includedEvents.join('\n') : ''
    const shareText = `${baseMessage}${eventsSection}\n\n${footer}`

    return {
      shareText,
      includedEventsCount: wasTruncated
        ? includedEvents.length - 1
        : includedEvents.length,
      wasTruncated,
    }
  }

  /**
   * メインのTwitterコンテンツ生成メソッド（キャッシュ機能付き）
   * 要件1.1, 1.3, 3.3に対応
   * パフォーマンス最適化: 結果をキャッシュして同じ入力に対する再計算を避ける
   */
  public generateTwitterContent(
    events: StudySessionEvent[]
  ): ShareContentResult {
    // キャッシュキーを生成
    const eventsHash = this.generateEventsHash(events)
    const configString = JSON.stringify(this.config)
    let configHash = 0
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i)
      configHash = (configHash << 5) - configHash + char
      configHash = configHash & configHash
    }
    const configHashString = Math.abs(configHash).toString(36).slice(0, 8)
    const cacheKey = `${eventsHash}-${configHashString}`

    // キャッシュから結果を取得を試行
    const cachedResult = this.getCachedResult(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    // キャッシュにない場合は新規計算
    const result = this.generateTwitterContentInternal(events)

    // 結果をキャッシュに保存
    this.setCachedResult(cacheKey, result, eventsHash)

    return result
  }

  /**
   * 内部的なTwitterコンテンツ生成メソッド（キャッシュなし）
   * 要件1.1, 1.3, 3.3に対応
   */
  private generateTwitterContentInternal(
    events: StudySessionEvent[]
  ): ShareContentResult {
    // 1. 当月かつ現在日以降のイベントをフィルタリング（要件1.1）
    const upcomingEvents = this.filterUpcomingEvents(events)

    // イベントがない場合の処理（要件3.1）
    if (upcomingEvents.length === 0) {
      const baseMessage = this.generateBaseMessage()
      const noEventsMessage = '\n\n今月は予定されているイベントがありません。'
      const footer = this.generateFooter()

      return {
        shareText: `${baseMessage}${noEventsMessage}\n\n${footer}`,
        includedEventsCount: 0,
        wasTruncated: false,
      }
    }

    // 2. イベントをシェア用テキストにフォーマット（要件1.3）
    const eventLines = this.formatEventsListForShare(upcomingEvents)

    // 3. 基本メッセージとフッターを生成
    const baseMessage = this.generateBaseMessage()
    const footer = this.generateFooter()

    // 4. 文字数制限に対応した切り詰め処理（要件3.3）
    return this.truncateContentToLimit(baseMessage, eventLines, footer)
  }

  /**
   * 設定を更新（キャッシュをクリア）
   */
  public updateConfig(newConfig: Partial<ShareContentConfig>): void {
    this.config = { ...this.config, ...newConfig }
    // 設定変更時はキャッシュをクリア
    this.cache.clear()
  }

  /**
   * 現在の設定を取得
   */
  public getConfig(): ShareContentConfig {
    return { ...this.config }
  }

  /**
   * キャッシュ統計を取得（デバッグ用）
   */
  public getCacheStats(): {
    size: number
    maxSize: number
    expiryMs: number
    entries: Array<{ key: string; timestamp: number; age: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      age: now - entry.timestamp,
    }))

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      expiryMs: this.cacheExpiryMs,
      entries,
    }
  }

  /**
   * キャッシュを手動でクリア
   */
  public clearCache(): void {
    this.cache.clear()
  }
}

/**
 * デフォルト設定でShareContentGeneratorインスタンスを作成するファクトリー関数
 */
export function createShareContentGenerator(
  calendarUrl: string
): ShareContentGenerator {
  return new ShareContentGenerator({
    calendarUrl,
    hashtags: ['#広島IT', '#勉強会', '#プログラミング'],
    baseMessage: '📅 今月の広島IT勉強会',
  })
}

/**
 * 型エクスポート
 */
export type { ShareContentConfig, ShareContentResult }
