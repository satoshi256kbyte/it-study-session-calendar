'use client'

import { memo } from 'react'
import { StudySessionEvent } from '../types/studySessionEvent'

/** JST オフセット（ミリ秒）。UTC+9 = 9 時間 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * EventListItem の Props
 */
export interface EventListItemProps {
  /** 表示対象の単一イベント */
  event: StudySessionEvent
}

/**
 * 開始日時を JST の「HH:mm」形式にフォーマットする。
 *
 * 実行環境のローカルタイムゾーンに依存しないよう、UTC のミリ秒に JST オフセットを
 * 加算し UTC ゲッタで読み出す（`calendarMonth.ts` と同じ JST 射影方針）。
 * 無効な Date（Invalid Date）は空文字を返す。
 */
function formatStartTimeJst(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  const hours = String(jst.getUTCHours()).padStart(2, '0')
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * イベント一覧の単一行。
 *
 * 単一責任として「開始時刻（JST の時分）・タイトル・イベントページリンクの表示」を扱う。
 *
 * - 開始時刻は JST の時分で表示（Requirement 5.2）。
 * - `event.pageUrl` があればタイトルをリンク化し、`target="_blank"` と
 *   `rel="noopener noreferrer"` を付与する（Requirement 5.4）。
 *   `pageUrl` が無い場合はテキストのみ表示する。
 */
function EventListItem({ event }: EventListItemProps) {
  const startTime = formatStartTimeJst(event.startDate)

  return (
    <li className="event-list-item min-w-0 py-2">
      {startTime !== '' && (
        <time className="event-list-item-time block text-sm text-gray-500">
          {startTime}
        </time>
      )}
      {event.pageUrl ? (
        <a
          href={event.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="event-list-item-title text-blue-600 hover:underline break-words"
        >
          {event.title}
        </a>
      ) : (
        <span className="event-list-item-title text-gray-900 break-words">
          {event.title}
        </span>
      )}
    </li>
  )
}

export default memo(EventListItem)
