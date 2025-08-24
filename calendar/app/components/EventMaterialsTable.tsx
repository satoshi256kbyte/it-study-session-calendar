'use client'

import { memo, useMemo } from 'react'
import {
  EventMaterialsTableProps,
  formatEventDate,
} from '../types/eventMaterial'
import MaterialLink from './MaterialLink'

/**
 * イベント資料テーブルコンポーネント
 * 要件2.1, 2.2, 2.3, 6.2に対応
 *
 * - テーブル形式でのイベント表示機能
 * - イベント名、開催日時、資料の列を実装
 * - 日付フォーマット（YYYY/MM/DD）を実装
 * - 不要な再レンダリングの防止
 */
function EventMaterialsTable({
  events,
  loading,
  error,
}: EventMaterialsTableProps) {
  /**
   * イベントを開催日時の降順でソート（要件1.3: 最新が最初）
   * 要件6.2: useMemoでソート処理を最適化
   */
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    })
  }, [events])

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      {/* 要件4.2: 水平スクロール機能の実装 */}
      {/* 要件4.1: 小画面でのテーブル表示最適化 - スムーズなスクロール */}
      <div className="overflow-x-auto smooth-scroll contain-layout">
        <table className="min-w-full sm:min-w-[600px] divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {/* 要件2.1: イベント名、開催日時、資料の列 */}
              <th
                scope="col"
                className="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                イベント名
              </th>
              <th
                scope="col"
                className="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                開催日時
              </th>
              <th
                scope="col"
                className="px-3 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                資料
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEvents.map(event => (
              <tr key={event.id} className="hover:bg-gray-50">
                {/* イベント名列 - 要件2.2: 元のイベントページへのクリック可能なリンク */}
                {/* 要件4.1: 小画面でのテーブル表示最適化 */}
                <td className="px-3 py-4 sm:px-6 min-w-0">
                  <div className="text-sm">
                    <a
                      href={event.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium block leading-5 break-words"
                      title={`${event.title}のイベントページを開く`}
                    >
                      {event.title}
                    </a>
                    {/* connpass URLも表示（小さく） */}
                    <div className="text-xs text-gray-500 mt-1">
                      <a
                        href={event.connpassUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-700 inline-block py-1"
                        title="connpassページを開く"
                      >
                        connpass
                      </a>
                    </div>
                  </div>
                </td>

                {/* 開催日時列 - 要件2.3: YYYY/MM/DD形式 */}
                <td className="px-3 py-4 sm:px-6 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatEventDate(event.eventDate)}
                  </div>
                </td>

                {/* 資料列 - 要件2.4, 2.5: 資料リンクとサムネイル、複数資料対応 */}
                <td className="px-3 py-4 sm:px-6 min-w-0">
                  <div className="space-y-2">
                    {event.materials.map(material => (
                      <MaterialLink
                        key={material.id}
                        material={material}
                        eventTitle={event.title}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
