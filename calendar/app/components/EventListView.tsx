'use client'

import { memo } from 'react'
import { StudySessionEvent } from '../types/studySessionEvent'
import { groupEventsByJstDate } from '../utils/calendarMonth'
import EventListItem from './EventListItem'

/** JST オフセット（ミリ秒）。UTC+9 = 9 時間 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** JST の曜日ラベル（日曜始まり） */
const JST_WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * EventListView の Props
 */
export interface EventListViewProps {
  /** 表示対象（Displayed_Month に含まれ、Approved で、ソート済み） */
  events: StudySessionEvent[]
}

/**
 * 日付グループの見出しに表示する「年月日 + 曜日」を JST で生成する。
 *
 * 実行環境のローカルタイムゾーンに依存しないよう、UTC のミリ秒に JST オフセットを
 * 加算し UTC ゲッタで読み出す（`calendarMonth.ts` と同じ JST 射影方針）。
 * 無効な Date（Invalid Date）は空文字を返す。
 *
 * 対応要件: 5.2
 */
function formatDateHeadingJst(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  const year = jst.getUTCFullYear()
  const month = jst.getUTCMonth() + 1
  const day = jst.getUTCDate()
  const weekday = JST_WEEKDAY_LABELS[jst.getUTCDay()]
  return `${year}年${month}月${day}日（${weekday}）`
}

/**
 * イベント一覧ビュー。
 *
 * 単一責任として「与えられた表示対象イベント（フィルタ・ソート済み）を日付ごとに
 * グルーピングして描画する」ことを扱う。
 *
 * - `groupEventsByJstDate()` で JST の年月日ごとにまとめる（Requirement 5.3）。
 * - 各日付見出しに「年月日 + 曜日」を JST で表示する（Requirement 5.2）。
 * - 各行の描画は `EventListItem` に委譲する（Requirement 5.4）。
 * - 空状態の描画責務は `MonthCalendar` 側に集約するため、本コンポーネントは
 *   1 件以上のときのみレンダリングされる前提とする。
 * - レスポンシブ: モバイル（幅768px未満）は単一カラム、デスクトップ（768px以上）は
 *   グループの見出しと本文を横並びにするレイアウトへ切り替える（Requirement 8.1, 8.2）。
 */
function EventListView({ events }: EventListViewProps) {
  const groups = groupEventsByJstDate(events)

  return (
    <div className="event-list-view flex flex-col gap-6">
      {groups.map(group => {
        // グループ内の代表日時（先頭イベント）から見出しを生成する。
        // groupEventsByJstDate により同一グループは同一 JST 年月日を持つ。
        const heading = formatDateHeadingJst(group.events[0]?.startDate)

        return (
          <section
            key={group.dateKey}
            className="event-list-day flex flex-col md:flex-row md:gap-6"
          >
            <h3 className="event-list-day-heading text-sm font-semibold text-gray-700 mb-2 md:mb-0 md:w-40 md:flex-shrink-0">
              {heading}
            </h3>
            <ul className="event-list-day-items flex-1 divide-y divide-gray-100">
              {group.events.map(event => (
                <EventListItem key={event.id} event={event} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default memo(EventListView)
