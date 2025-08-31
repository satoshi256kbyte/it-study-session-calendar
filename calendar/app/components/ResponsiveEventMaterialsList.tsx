'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import { EventMaterialsTableProps } from '../types/eventMaterial'
import EventMaterialsTable from './EventMaterialsTable'
import EventMaterialCard from './EventMaterialCard'

/**
 * レスポンシブイベント資料一覧コンポーネント
 * 要件1.1, 2.1, 3.1に対応
 *
 * - 画面サイズに応じたレイアウト切り替え
 * - デスクトップ: テーブル表示
 * - タブレット: 2列グリッド
 * - モバイル: 1列スタック
 */
function ResponsiveEventMaterialsList({
  events,
  loading,
  error,
}: EventMaterialsTableProps) {
  // 画面サイズの状態管理
  const [screenWidth, setScreenWidth] = useState(1024)
  const [layoutType, setLayoutType] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop'
  )

  // 画面サイズの監視
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      setScreenWidth(width)

      if (width >= 1024) {
        setLayoutType('desktop')
      } else if (width >= 768) {
        setLayoutType('tablet')
      } else {
        setLayoutType('mobile')
      }
    }

    // 初期設定
    updateScreenSize()

    // リサイズイベントリスナー
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  // エラー状態の処理
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg
            className="w-6 h-6 text-red-600 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-red-800">
            エラーが発生しました
          </h2>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          ページを再読み込み
        </button>
      </div>
    )
  }

  // ローディング状態の処理
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    )
  }

  // イベントが空の場合
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
        <p className="text-gray-500">表示するイベントがありません</p>
      </div>
    )
  }

  // デスクトップ表示（≥1024px）
  if (layoutType === 'desktop') {
    return (
      <div className="event-materials-desktop">
        <EventMaterialsTable events={events} loading={loading} error={error} />
      </div>
    )
  }

  // モバイル・タブレット表示（<1024px）
  const gridClassName =
    layoutType === 'tablet'
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'
      : 'space-y-4'

  return (
    <div className="event-materials-responsive">
      <div
        className={gridClassName}
        data-testid={layoutType === 'tablet' ? 'tablet-grid' : 'mobile-stack'}
        role="region"
        aria-label={`イベント資料一覧 - ${layoutType === 'tablet' ? '2列' : '1列'}表示`}
      >
        {events.map((event, index) => (
          <SimpleEventCard key={event.id} event={event} layout={layoutType} />
        ))}
      </div>
    </div>
  )
}

/**
 * シンプルなイベントカードコンポーネント
 */
function SimpleEventCard({
  event,
  layout,
}: {
  event: any
  layout: 'mobile' | 'tablet'
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* イベント日付 */}
      <div className="flex items-center text-sm text-gray-500 mb-3">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <time dateTime={event.eventDate}>{formatDate(event.eventDate)}</time>
      </div>

      {/* イベントタイトル */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-tight">
        <a
          href={event.eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline block min-h-[44px] py-2"
          title={`${event.title}のイベントページを開く`}
        >
          {event.title}
        </a>
      </h3>

      {/* connpassリンク */}
      <div className="mb-4">
        <a
          href={event.connpassUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 min-h-[44px] py-2"
          title={`${event.title}のconnpassページを開く`}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          connpass
        </a>
      </div>

      {/* 資料リスト */}
      {event.materials && event.materials.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
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
            資料 ({event.materials.length}件)
          </h4>
          <ul className="space-y-2">
            {event.materials.map((material: any) => (
              <li key={material.id}>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline text-sm block min-h-[44px] py-2"
                  title={`${material.title || material.url}を開く`}
                >
                  {material.title || material.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// メモ化してパフォーマンスを最適化
export default memo(ResponsiveEventMaterialsList)
