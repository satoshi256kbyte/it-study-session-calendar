'use client'

import { memo, useMemo } from 'react'
import {
  EventMaterialsTableProps,
  formatEventDateWithWeekday,
  MaterialType,
} from '../types/eventMaterial'
import MaterialLink from './MaterialLink'

/**
 * イベント資料一覧コンポーネント（デスクトップ表示）
 * 要件2.1, 2.2, 2.3, 6.2に対応
 *
 * - 上部カレンダー（EventListView）と表示形式を揃える
 * - 左に開催日（YYYY年M月D日（曜））の見出し、右にイベント名と資料
 * - イベント名は青リンク（アイコンなし）
 * - 資料は箇条書き表示
 * - 不要な再レンダリングの防止
 */
function EventMaterialsTable({
  events,
  loading,
  error,
}: EventMaterialsTableProps) {
  /**
   * イベントを開催日時の降順でソート（要件1.3: 最新が最初）
   * 各イベント内の資料も指定された順序でソート
   * 要件6.2: useMemoでソート処理を最適化
   */
  const sortedEvents = useMemo(() => {
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

    return [...events]
      .sort((a, b) => {
        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      })
      .map(event => ({
        ...event,
        materials: [...event.materials].sort((a, b) => {
          const priorityA = materialTypePriority[a.type] || 5
          const priorityB = materialTypePriority[b.type] || 5

          // 優先順位が同じ場合は名称の昇順
          if (priorityA === priorityB) {
            return a.title.localeCompare(b.title, 'ja', { numeric: true })
          }

          return priorityA - priorityB
        }),
      }))
  }, [events])

  return (
    <div className="relative">
      {/* 上部カレンダー（EventListView）と揃えた、日付見出し＋本体の横並びレイアウト */}
      <div className="event-materials-list flex flex-col gap-6">
        {sortedEvents.map(event => (
          <section
            key={event.id}
            className="event-materials-day flex flex-col md:flex-row md:gap-6"
          >
            {/* 開催日の見出し（左） - EventListView と同じ形式・幅 */}
            <h3 className="event-materials-day-heading text-sm font-semibold text-gray-700 mb-2 md:mb-0 md:w-40 md:flex-shrink-0">
              {formatEventDateWithWeekday(event.eventDate)}
            </h3>

            {/* 本体（右）: イベント名 + 資料 */}
            <div className="flex-1 min-w-0">
              {/* イベント名 - 元のイベントページへのリンク（アイコンなし） */}
              <a
                href={event.eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-words"
                title={`${event.title}のイベントページを開く`}
              >
                {event.title}
              </a>

              {/* 資料リスト（箇条書き・行間は詰める） */}
              {event.materials.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-sm marker:text-gray-400">
                  {event.materials.map(material => (
                    <li key={material.id} className="leading-snug">
                      <MaterialLink
                        material={material}
                        eventTitle={event.title}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* ローディング状態のオーバーレイ */}
      {loading && events.length > 0 && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">更新中...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// メモ化してパフォーマンスを最適化（要件6.2: 不要な再レンダリングの防止）
export default memo(EventMaterialsTable)
