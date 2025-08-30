'use client'

import { memo } from 'react'
import { useEventMaterials } from '../hooks/useEventMaterials'
import EventMaterialsTable from './EventMaterialsTable'

/**
 * イベント資料一覧コンポーネント
 * 要件1.1, 5.1, 5.2, 5.3, 6.2に対応
 *
 * - APIからデータを取得する非同期処理を実装（SWRでキャッシュ最適化）
 * - シンプルなローディング状態の表示
 * - エラー状態とリトライ機能を実装
 * - 不要な再レンダリングの防止
 */
function EventMaterialsList() {
  /**
   * SWRを使用したデータ取得とキャッシュ
   * 要件6.2: データキャッシュの実装、不要な再レンダリングの防止
   */
  const { events, isLoading, error, retry, hasCache, lastUpdated } =
    useEventMaterials({
      months: 6,
      refreshInterval: 5 * 60 * 1000, // 5分間隔で自動更新
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    })

  /**
   * ローディング状態の表示
   * 要件5.2: シンプルなローディング表示
   * 要件6.2: キャッシュがある場合は既存データを表示しながらローディング
   */
  if (isLoading && events.length === 0) {
    return (
      <div className="w-full py-8">
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            aria-label="読み込み中"
            role="status"
          ></div>
          <p className="mt-2 text-gray-600">イベント資料を読み込み中...</p>
        </div>
      </div>
    )
  }

  /**
   * エラー状態の表示
   * 要件5.3, 6.1: 再試行オプション付きのエラーメッセージを表示
   * ネットワークエラー時の適切なメッセージ表示
   */
  if (error && events.length === 0) {
    const isNetworkError =
      error.includes('ネットワーク') || error.includes('接続')
    const isServerError =
      error.includes('サーバー') || error.includes('一時的に利用できません')

    return (
      <div className="w-full py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            {/* エラータイプに応じたアイコン表示 */}
            {isNetworkError ? (
              <svg
                className="mx-auto h-12 w-12 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              </svg>
            ) : isServerError ? (
              <svg
                className="mx-auto h-12 w-12 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            ) : (
              <svg
                className="mx-auto h-12 w-12 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            )}

            <p className="text-lg font-medium">
              {isNetworkError
                ? 'ネットワークエラー'
                : isServerError
                  ? 'サーバーエラー'
                  : 'データの読み込みに失敗しました'}
            </p>
            <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
              {error}
            </p>

            {/* エラータイプに応じた追加の説明 */}
            {isNetworkError && (
              <p className="text-xs text-gray-500 mt-2">
                インターネット接続を確認してから再試行してください
              </p>
            )}
            {isServerError && (
              <p className="text-xs text-gray-500 mt-2">
                サーバーの問題により一時的に利用できません
              </p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => retry()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              再試行
            </button>

            {/* ネットワークエラーの場合は追加のヘルプ */}
            {isNetworkError && (
              <div className="text-xs text-gray-500">
                <p>問題が続く場合は：</p>
                <ul className="mt-1 space-y-1 text-left max-w-xs mx-auto">
                  <li>• ページを再読み込みしてください</li>
                  <li>• ブラウザのキャッシュをクリアしてください</li>
                  <li>• しばらく時間をおいてから再度お試しください</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * データなし状態の表示
   * 要件5.5, 6.1: 該当期間に資料のあるconnpassイベントがありません
   */
  if (!isLoading && events.length === 0) {
    return (
      <div className="w-full py-8">
        <div className="text-center text-gray-600">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div className="max-w-md mx-auto">
            <p className="text-lg font-medium text-gray-900 mb-2">
              該当期間に資料のあるconnpassイベントがありません
            </p>
            <p className="text-sm text-gray-500">
              過去6ヶ月間で発表資料が登録されているconnpassイベントが見つかりませんでした。
            </p>
            <p className="text-xs text-gray-400 mt-3">
              ※
              connpass以外のイベントや資料が登録されていないイベントは表示されません
            </p>
          </div>
        </div>
      </div>
    )
  }

  /**
   * メインコンテンツの表示
   * EventMaterialsTableコンポーネントにデータを渡す
   * 要件6.2: キャッシュがある場合は既存データを表示しながら更新
   */
  return (
    <div className="w-full">
      {/* 更新状態とキャッシュ情報の表示 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            {lastUpdated && (
              <p className="text-sm text-gray-600">
                最終更新: {lastUpdated.toLocaleString('ja-JP')}
              </p>
            )}
          </div>

          {/* バックグラウンド更新中のインジケーター */}
          {isLoading && events.length > 0 && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              更新中
            </div>
          )}
        </div>

        {/* キャッシュ状態の表示（開発時のデバッグ用、本番では非表示） */}
        {process.env.NODE_ENV === 'development' && hasCache && (
          <div className="text-xs text-green-600 mt-1">
            ✓ キャッシュからデータを表示中
          </div>
        )}
      </div>

      <EventMaterialsTable
        events={events}
        loading={isLoading && events.length === 0}
        error={error}
      />

      {/* バックグラウンド更新中のエラー表示 */}
      {error && events.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-yellow-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="text-sm text-yellow-800">
              データの更新中にエラーが発生しました: {error}
            </span>
            <button
              onClick={() => retry()}
              className="ml-auto text-sm text-yellow-800 hover:text-yellow-900 underline"
            >
              再試行
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// メモ化してパフォーマンスを最適化（要件6.2: 不要な再レンダリングの防止）
export default memo(EventMaterialsList)
