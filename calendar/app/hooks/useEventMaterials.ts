'use client'

import useSWR from 'swr'
import { EventWithMaterials } from '../types/eventMaterial'

/**
 * イベント資料データ取得用のカスタムフック
 * 要件5.1, 5.2, 6.2: パフォーマンス最適化
 *
 * SWRを使用してデータキャッシュと自動再取得を実装
 */

interface EventMaterialsResponse {
  count: number
  total: number
  events: EventWithMaterials[]
}

interface UseEventMaterialsOptions {
  months?: number
  refreshInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
}

/**
 * APIからイベント資料データを取得するfetcher関数
 */
const fetcher = async (url: string): Promise<EventWithMaterials[]> => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const fullUrl = `${apiBaseUrl}${url}`
  const response = await fetch(fullUrl)

  if (!response.ok) {
    // HTTPステータスコードに応じた詳細なエラーメッセージ
    let errorMessage: string
    switch (response.status) {
      case 400:
        errorMessage = 'リクエストパラメータが正しくありません'
        break
      case 401:
        errorMessage = '認証に失敗しました'
        break
      case 403:
        errorMessage = 'アクセス権限がありません'
        break
      case 404:
        errorMessage = 'APIエンドポイントが見つかりません'
        break
      case 429:
        errorMessage =
          'リクエスト数が上限を超えました。しばらく待ってから再試行してください'
        break
      case 500:
        errorMessage = 'サーバー内部エラーが発生しました'
        break
      case 502:
      case 503:
      case 504:
        errorMessage =
          'サーバーが一時的に利用できません。しばらく待ってから再試行してください'
        break
      default:
        errorMessage = `サーバーエラーが発生しました (HTTP ${response.status})`
    }

    const error = new Error(errorMessage)
    error.name = `HTTPError${response.status}`
    throw error
  }

  const data: EventMaterialsResponse = await response.json()
  return data.events
}

/**
 * ネットワークエラーを判定する関数
 */
const isNetworkError = (error: Error): boolean => {
  return error instanceof TypeError && error.message.includes('fetch')
}

/**
 * イベント資料データを取得するカスタムフック
 */
export function useEventMaterials(options: UseEventMaterialsOptions = {}) {
  const {
    months = 6,
    refreshInterval = 5 * 60 * 1000, // 5分間隔で自動更新
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
  } = options

  const { data, error, isLoading, mutate } = useSWR(
    `/api/events/materials?months=${months}`,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect,
      // エラー時の再試行設定
      errorRetryCount: 3,
      errorRetryInterval: 5000, // 5秒間隔で再試行
      // キャッシュの有効期限（1時間）
      dedupingInterval: 60 * 60 * 1000,
      // フォーカス時の再検証を制限（1分以内は再検証しない）
      focusThrottleInterval: 60 * 1000,
    }
  )

  // エラーメッセージの処理
  let errorMessage: string | null = null
  if (error) {
    if (isNetworkError(error)) {
      errorMessage =
        'ネットワークに接続できません。インターネット接続を確認してください'
    } else {
      errorMessage = error.message
    }
  }

  return {
    events: data || [],
    isLoading,
    error: errorMessage,
    retry: mutate,
    // キャッシュされたデータがあるかどうか
    hasCache: !!data,
    // 最後の更新時刻（SWRの内部状態から推定）
    lastUpdated: data ? new Date() : null,
  }
}

/**
 * イベント資料データのプリロード用関数
 * ページ遷移前にデータをプリロードする際に使用
 */
export function preloadEventMaterials(months: number = 6) {
  // SWRのキャッシュにデータをプリロード
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  return fetch(`${apiBaseUrl}/api/events/materials?months=${months}`)
    .then(response => response.json())
    .catch(() => {
      // プリロードのエラーは無視（実際の使用時にエラーハンドリングされる）
    })
}
