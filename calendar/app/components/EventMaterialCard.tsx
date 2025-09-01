'use client'

import { memo, useMemo } from 'react'
import {
  EventWithMaterials,
  formatEventDate,
  MaterialType,
  Material,
} from '../types/eventMaterial'

/**
 * EventMaterialCardコンポーネントのProps
 */
export interface EventMaterialCardProps {
  /** イベント情報 */
  event: EventWithMaterials
  /** レイアウトタイプ */
  layout: 'mobile' | 'tablet'
  /** 追加のCSSクラス */
  className?: string
  /** インラインスタイル（アニメーション用） */
  style?: React.CSSProperties
}

/**
 * イベント資料カードコンポーネント
 * モバイル・タブレット用のカードレイアウト
 */
function EventMaterialCard({
  event,
  layout,
  className = '',
  style = {},
}: EventMaterialCardProps) {
  /**
   * 資料を指定された順序でソート
   * EventMaterialsTableと同じ並び順ロジックを適用
   */
  const sortedMaterials = useMemo(() => {
    /**
     * 資料タイプの優先順位を定義
     * ビデオ、スライド、ブログ、ドキュメント、その他の順
     */
    const materialTypePriority: Record<MaterialType, number> = {
      video: 1,
      slide: 2,
      blog: 3,
      document: 4,
      other: 5,
    }

    return [...event.materials].sort((a, b) => {
      const priorityA = materialTypePriority[a.type] || 5
      const priorityB = materialTypePriority[b.type] || 5

      // 優先順位が同じ場合は名称の昇順
      if (priorityA === priorityB) {
        return a.title.localeCompare(b.title, 'ja', { numeric: true })
      }

      return priorityA - priorityB
    })
  }, [event.materials])
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${className}`}
      style={style}
    >
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
        <time dateTime={event.eventDate}>
          {formatEventDate(event.eventDate)}
        </time>
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
      {sortedMaterials && sortedMaterials.length > 0 && (
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
            資料 ({sortedMaterials.length}件)
          </h4>
          <ul className="space-y-2">
            {sortedMaterials.map((material: Material) => (
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
// 要件7.1: React.memoを使用したコンポーネントの最適化
export default memo(EventMaterialCard)
