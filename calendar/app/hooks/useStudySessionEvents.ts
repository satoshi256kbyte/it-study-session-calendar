'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StudySessionEvent } from '../types/studySessionEvent'
import {
  fetchApprovedStudySessionsWithRetry,
  handleStudySessionApiError,
} from '../services/studySessionApiClient'
import {
  createShareContentGenerator,
  ShareContentResult,
} from '../services/shareContentGenerator'
import { performanceMonitor, measureAsync } from '../utils/performance'

/**
 * useStudySessionEventsフックの戻り値型
 * 要件1.4, 4.1に対応
 */
export interface UseStudySessionEventsReturn {
  /** 取得された勉強会イベント一覧 */
  events: StudySessionEvent[]
  /** 生成されたシェアテキスト */
  shareText: string
  /** シェアコンテンツの詳細情報 */
  shareContentResult: ShareContentResult | null
  /** ローディング状態 */
  isLoading: boolean
  /** エラーメッセージ */
  error: string | null
  /** エラーがリトライ可能かどうか */
  isRetryable: boolean
  /** リトライ関数 */
  retry: () => void
  /** 最後の更新時刻 */
  lastUpdated: Date | null
  /** フォールバックモードかどうか */
  isFallbackMode: boolean
  /** リトライ回数 */
  retryCount: number
}

/**
 * useStudySessionEventsフックのオプション
 */
export interface UseStudySessionEventsOptions {
  /** カレンダーURL（シェアテキスト生成用） */
  calendarUrl: string
  /** 最大リトライ回数 */
  maxRetries?: number
  /** リトライ間隔（ミリ秒） */
  retryDelay?: number
  /** 自動リトライを有効にするか */
  enableAutoRetry?: boolean
  /** 自動リトライの間隔（ミリ秒） */
  autoRetryDelay?: number
  /** フォールバック用のカスタムメッセージ */
  fallbackMessage?: string
}

/**
 * 勉強会データ取得とシェアテキスト生成を統合したカスタムフック
 * 要件1.4, 4.1, 4.2に対応
 */
export function useStudySessionEvents(
  options: UseStudySessionEventsOptions
): UseStudySessionEventsReturn {
  const {
    calendarUrl,
    maxRetries = 3,
    retryDelay = 1000,
    enableAutoRetry = true,
    autoRetryDelay = 5000,
    fallbackMessage,
  } = options

  // 状態管理
  const [events, setEvents] = useState<StudySessionEvent[]>([])
  const [shareText, setShareText] = useState<string>('')
  const [shareContentResult, setShareContentResult] =
    useState<ShareContentResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetryable, setIsRetryable] = useState<boolean>(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [autoRetryTimeoutId, setAutoRetryTimeoutId] =
    useState<NodeJS.Timeout | null>(null)

  // ShareContentGeneratorインスタンスをメモ化（calendarUrlが変わった時のみ再作成）
  const shareContentGenerator = useMemo(() => {
    return createShareContentGenerator(calendarUrl)
  }, [calendarUrl])

  // 前回の結果をキャッシュするためのref
  const lastResultRef = useRef<{
    events: StudySessionEvent[]
    shareContentResult: ShareContentResult | null
    eventsHash: string
  } | null>(null)

  /**
   * イベント配列のハッシュを生成（メモ化用）
   */
  const generateEventsHash = useCallback(
    (events: StudySessionEvent[]): string => {
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
    },
    []
  )

  /**
   * フォールバック用のシェアテキストを生成する関数（メモ化）
   * 要件4.1, 4.2に対応
   */
  const generateFallbackShareText = useMemo(() => {
    try {
      if (fallbackMessage) {
        // カスタムフォールバックメッセージが指定されている場合
        return `${fallbackMessage}\n\n詳細はこちら: ${calendarUrl}\n\n#広島IT #勉強会 #プログラミング`
      }

      // デフォルトのフォールバックメッセージ
      const fallbackResult = shareContentGenerator.generateTwitterContent([])
      return fallbackResult.shareText
    } catch (fallbackError) {
      // フォールバック生成でもエラーが発生した場合の最終フォールバック
      console.warn(
        'フォールバックシェアテキスト生成でエラーが発生しました:',
        fallbackError
      )
      return `📅 広島IT勉強会カレンダー\n\n最新の勉強会情報をチェック！\n\n詳細はこちら: ${calendarUrl}\n\n#広島IT #勉強会 #プログラミング`
    }
  }, [fallbackMessage, calendarUrl, shareContentGenerator])

  /**
   * 自動リトライのタイマーをクリアする関数
   */
  const clearAutoRetryTimer = useCallback(() => {
    if (autoRetryTimeoutId) {
      clearTimeout(autoRetryTimeoutId)
      setAutoRetryTimeoutId(null)
    }
  }, [autoRetryTimeoutId])

  /**
   * 勉強会データを取得してシェアテキストを生成する関数
   * 要件1.4, 4.1に対応
   */
  const fetchEventsAndGenerateShareText = useCallback(
    async (isRetry: boolean = false) => {
      try {
        setIsLoading(true)
        setError(null)
        setIsRetryable(false)

        // リトライの場合はカウントを増加
        if (isRetry) {
          setRetryCount(prev => prev + 1)
        } else {
          setRetryCount(0)
        }

        // 既存の自動リトライタイマーをクリア
        clearAutoRetryTimer()

        // 承認済み勉強会データを取得（リトライ機能付き）
        const fetchedEvents = await measureAsync('studySessionDataFetch', () =>
          fetchApprovedStudySessionsWithRetry(maxRetries, retryDelay)
        )

        // パフォーマンス最適化: 前回と同じデータの場合は再計算をスキップ
        const currentEventsHash = generateEventsHash(fetchedEvents)
        let result: ShareContentResult

        if (
          lastResultRef.current &&
          lastResultRef.current.eventsHash === currentEventsHash
        ) {
          // 前回と同じデータの場合は既存の結果を再利用
          result = lastResultRef.current.shareContentResult!
          console.log('ShareContent generation skipped (same data)')
        } else {
          // 新しいデータまたは初回の場合は新規計算
          result = await measureAsync('shareTextGeneration', async () =>
            shareContentGenerator.generateTwitterContent(fetchedEvents)
          )

          // 結果をキャッシュ
          lastResultRef.current = {
            events: fetchedEvents,
            shareContentResult: result,
            eventsHash: currentEventsHash,
          }
        }

        // 状態を更新（成功時）
        setEvents(fetchedEvents)
        setShareText(result.shareText)
        setShareContentResult(result)
        setLastUpdated(new Date())
        setError(null)
        setIsFallbackMode(false)
        setIsRetryable(false)
      } catch (err) {
        // エラーハンドリング（要件4.1, 4.2）
        console.error('勉強会データ取得でエラーが発生しました:', err)

        const errorInfo = handleStudySessionApiError(err)
        setError(errorInfo.message)
        setIsRetryable(errorInfo.isRetryable)
        setIsFallbackMode(true)

        // フォールバック用のシェアテキストを設定
        setShareText(generateFallbackShareText)

        // フォールバック用のShareContentResultを作成
        const fallbackResult: ShareContentResult = {
          shareText: generateFallbackShareText,
          includedEventsCount: 0,
          wasTruncated: false,
        }
        setShareContentResult(fallbackResult)

        // 自動リトライが有効で、リトライ可能なエラーの場合
        if (
          enableAutoRetry &&
          errorInfo.isRetryable &&
          retryCount < maxRetries
        ) {
          console.log(
            `自動リトライを実行します (${retryCount + 1}/${maxRetries})`
          )
          const timeoutId = setTimeout(() => {
            fetchEventsAndGenerateShareText(true)
          }, autoRetryDelay)
          setAutoRetryTimeoutId(timeoutId)
        } else if (retryCount >= maxRetries) {
          console.warn(
            `最大リトライ回数 (${maxRetries}) に達しました。フォールバックモードで継続します。`
          )
        }
      } finally {
        setIsLoading(false)
      }
    },
    [
      maxRetries,
      retryDelay,
      enableAutoRetry,
      autoRetryDelay,
      shareContentGenerator,
      generateFallbackShareText,
      generateEventsHash,
      clearAutoRetryTimer,
      retryCount,
    ]
  )

  /**
   * 手動リトライ関数
   * 要件4.2に対応
   */
  const retry = useCallback(() => {
    // 既存の自動リトライタイマーをクリア
    clearAutoRetryTimer()
    // 手動リトライを実行
    fetchEventsAndGenerateShareText(true)
  }, [fetchEventsAndGenerateShareText, clearAutoRetryTimer])

  // 初回データ取得
  useEffect(() => {
    fetchEventsAndGenerateShareText(false)
  }, [fetchEventsAndGenerateShareText])

  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      clearAutoRetryTimer()
    }
  }, [clearAutoRetryTimer])

  return {
    events,
    shareText,
    shareContentResult,
    isLoading,
    error,
    isRetryable,
    retry,
    lastUpdated,
    isFallbackMode,
    retryCount,
  }
}

/**
 * エラー状態の詳細情報を提供するヘルパー関数
 * 要件4.1, 4.2に対応
 */
export function getErrorStateInfo(
  error: string | null,
  isRetryable: boolean,
  retryCount: number
) {
  if (!error) {
    return null
  }

  return {
    message: error,
    isRetryable,
    retryCount,
    canRetry: isRetryable && retryCount < 3,
    userFriendlyMessage: getUserFriendlyErrorMessage(error, isRetryable),
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成する関数
 * 要件4.1, 4.2に対応
 */
function getUserFriendlyErrorMessage(
  error: string,
  isRetryable: boolean
): string {
  // タイムアウトエラー
  if (
    error.includes('timeout') ||
    error.includes('タイムアウト') ||
    error.includes('Request timeout')
  ) {
    return 'サーバーへの接続がタイムアウトしました。ネットワーク接続を確認してください。'
  }

  // ネットワークエラー
  if (
    error.includes('network') ||
    error.includes('ネットワーク') ||
    error.includes('Network') ||
    error.includes('fetch')
  ) {
    return 'ネットワークに接続できません。インターネット接続を確認してください。'
  }

  // サーバーエラー (5xx)
  if (
    error.includes('500') ||
    error.includes('502') ||
    error.includes('503') ||
    error.includes('504') ||
    error.includes('サーバー内部エラー') ||
    error.includes('Internal Server Error')
  ) {
    return 'サーバーで一時的な問題が発生しています。しばらく待ってから再試行してください。'
  }

  // レート制限エラー
  if (
    error.includes('429') ||
    error.includes('Too Many Requests') ||
    error.includes('レート制限')
  ) {
    return 'アクセスが集中しています。しばらく待ってから再試行してください。'
  }

  // 認証エラー
  if (
    error.includes('401') ||
    error.includes('403') ||
    error.includes('Unauthorized') ||
    error.includes('Forbidden')
  ) {
    return 'アクセス権限がありません。管理者にお問い合わせください。'
  }

  // 見つからないエラー
  if (
    error.includes('404') ||
    error.includes('見つかりません') ||
    error.includes('Not Found')
  ) {
    return 'データの取得先が見つかりません。管理者にお問い合わせください。'
  }

  // 無効なレスポンス形式
  if (
    error.includes('Invalid API response') ||
    error.includes('不正なレスポンス')
  ) {
    return 'サーバーからの応答が正しくありません。管理者にお問い合わせください。'
  }

  // CORS エラー
  if (error.includes('CORS') || error.includes('Cross-Origin')) {
    return 'セキュリティ制限によりデータを取得できません。管理者にお問い合わせください。'
  }

  // 一般的なリトライ可能エラー
  if (isRetryable) {
    return 'データの取得に失敗しました。自動的に再試行します。'
  }

  // その他のエラー
  return 'データの取得に失敗しました。ページを再読み込みしてください。'
}

/**
 * デフォルト設定でuseStudySessionEventsフックを使用するヘルパー関数
 */
export function useStudySessionEventsWithDefaults(
  calendarUrl: string
): UseStudySessionEventsReturn {
  return useStudySessionEvents({
    calendarUrl,
    maxRetries: 3,
    retryDelay: 1000,
    enableAutoRetry: true,
    autoRetryDelay: 5000,
  })
}

/**
 * カスタムフォールバックメッセージ付きでuseStudySessionEventsフックを使用するヘルパー関数
 */
export function useStudySessionEventsWithFallback(
  calendarUrl: string,
  fallbackMessage: string
): UseStudySessionEventsReturn {
  return useStudySessionEvents({
    calendarUrl,
    maxRetries: 3,
    retryDelay: 1000,
    enableAutoRetry: true,
    autoRetryDelay: 5000,
    fallbackMessage,
  })
}

/**
 * 高可用性設定でuseStudySessionEventsフックを使用するヘルパー関数
 * より多くのリトライとより短い間隔で設定
 */
export function useStudySessionEventsHighAvailability(
  calendarUrl: string
): UseStudySessionEventsReturn {
  return useStudySessionEvents({
    calendarUrl,
    maxRetries: 5,
    retryDelay: 500,
    enableAutoRetry: true,
    autoRetryDelay: 2000,
  })
}

/**
 * 低レイテンシ設定でuseStudySessionEventsフックを使用するヘルパー関数
 * リトライを無効にして高速レスポンスを優先
 */
export function useStudySessionEventsLowLatency(
  calendarUrl: string
): UseStudySessionEventsReturn {
  return useStudySessionEvents({
    calendarUrl,
    maxRetries: 1,
    retryDelay: 0,
    enableAutoRetry: false,
    autoRetryDelay: 0,
  })
}

/**
 * エラー状態の詳細な診断情報を提供するヘルパー関数
 * 要件4.1, 4.2に対応
 */
export function getErrorDiagnostics(
  error: string | null,
  isRetryable: boolean,
  retryCount: number,
  lastUpdated: Date | null
): {
  severity: 'low' | 'medium' | 'high'
  category: string
  recommendation: string
  canAutoRecover: boolean
  timeSinceLastSuccess?: number
} | null {
  if (!error) {
    return null
  }

  let severity: 'low' | 'medium' | 'high' = 'medium'
  let category = 'unknown'
  let recommendation = ''
  let canAutoRecover = isRetryable

  // エラーカテゴリの判定
  if (error.includes('timeout') || error.includes('タイムアウト')) {
    category = 'timeout'
    severity = 'medium'
    recommendation =
      'ネットワーク接続を確認し、しばらく待ってから再試行してください。'
  } else if (error.includes('network') || error.includes('ネットワーク')) {
    category = 'network'
    severity = 'high'
    recommendation = 'インターネット接続を確認してください。'
  } else if (
    error.includes('500') ||
    error.includes('502') ||
    error.includes('503')
  ) {
    category = 'server'
    severity = 'medium'
    recommendation =
      'サーバーの問題です。しばらく待ってから再試行してください。'
  } else if (error.includes('404')) {
    category = 'not_found'
    severity = 'high'
    canAutoRecover = false
    recommendation = '管理者にお問い合わせください。'
  } else if (error.includes('401') || error.includes('403')) {
    category = 'auth'
    severity = 'high'
    canAutoRecover = false
    recommendation = 'アクセス権限の問題です。管理者にお問い合わせください。'
  } else if (retryCount >= 3) {
    category = 'persistent'
    severity = 'high'
    recommendation = 'ページを再読み込みするか、管理者にお問い合わせください。'
  }

  // 最後の成功からの経過時間を計算
  const timeSinceLastSuccess = lastUpdated
    ? Date.now() - lastUpdated.getTime()
    : undefined

  return {
    severity,
    category,
    recommendation,
    canAutoRecover,
    timeSinceLastSuccess,
  }
}
