/**
 * カレンダー月表示のための純粋関数ユーティリティ
 *
 * 月境界計算・フィルタ・ソート・月移動・グルーピングを、UI から分離した
 * 純粋ロジックとして提供する。すべて JST（UTC+9）固定で計算し、実行環境の
 * ローカルタイムゾーンに依存しない。
 *
 * 対応要件: 2.3, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3, 5.7
 */

import { StudySessionEvent } from '../types/studySessionEvent'

/** JST オフセット（ミリ秒）。UTC+9 = 9 時間 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 表示対象の年月（JST 基準）
 */
export interface YearMonth {
  /** 西暦年 */
  year: number
  /** 月インデックス 0-11（JS の月インデックス。JST 基準） */
  month: number
}

/**
 * startDate が有効な Date か判定する内部ヘルパー
 */
function hasValidStartDate(event: StudySessionEvent): boolean {
  return (
    event.startDate instanceof Date && !Number.isNaN(event.startDate.getTime())
  )
}

/**
 * Date を JST に射影した各要素（年・月・日・時・分・秒）を返す内部ヘルパー。
 * UTC のミリ秒に JST オフセットを加算し、UTC ゲッタで読み出すことで、
 * 実行環境のタイムゾーンに依存せず JST の暦要素を得る。
 */
function toJstParts(date: Date): {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
} {
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth(),
    day: jst.getUTCDate(),
    hours: jst.getUTCHours(),
    minutes: jst.getUTCMinutes(),
    seconds: jst.getUTCSeconds(),
  }
}

/**
 * JST の現在年月を返す。
 * 時刻を注入可能にし（テスト容易性）、省略時は現在時刻を用いる。
 *
 * 対応要件: 3.2
 */
export function getCurrentYearMonthJst(now: Date = new Date()): YearMonth {
  const { year, month } = toJstParts(now)
  return { year, month }
}

/**
 * 暦上の月加算。year ロールオーバーに対応する。
 * 12 月の翌月は翌年 1 月、1 月の前月は前年 12 月となる。
 *
 * 対応要件: 4.2, 4.3
 */
export function addMonths(ym: YearMonth, delta: number): YearMonth {
  // 総月数（0 始まり）で計算し、正規化する
  const totalMonths = ym.year * 12 + ym.month + delta
  const year = Math.floor(totalMonths / 12)
  const month = ((totalMonths % 12) + 12) % 12
  return { year, month }
}

/**
 * JST 月初（含む）と翌月初（含まない）を UTC の Date で返す。
 *
 * JST の月初 00:00:00 は UTC 換算で `Date.UTC(year, month, 1) - 9h`。
 * 判定は「start <= startDate < endExclusive」の半開区間で行い、
 * これは「末日 23:59:59.xxx JST まで含む」と等価。
 *
 * 対応要件: 3.4
 */
export function getJstMonthRange(ym: YearMonth): {
  start: Date
  endExclusive: Date
} {
  const start = new Date(
    Date.UTC(ym.year, ym.month, 1, 0, 0, 0, 0) - JST_OFFSET_MS
  )
  const endExclusive = new Date(
    Date.UTC(ym.year, ym.month + 1, 1, 0, 0, 0, 0) - JST_OFFSET_MS
  )
  return { start, endExclusive }
}

/**
 * startDate が JST 月境界に含まれる Approved イベントのみ抽出する。
 * 無効な startDate（Invalid Date）を持つイベントは静かに除外する。
 *
 * 対応要件: 2.3, 3.1, 3.4, 4.5, 5.7
 */
export function filterEventsInMonth(
  events: StudySessionEvent[],
  ym: YearMonth
): StudySessionEvent[] {
  const { start, endExclusive } = getJstMonthRange(ym)
  const startMs = start.getTime()
  const endMs = endExclusive.getTime()

  return events.filter(event => {
    if (event.status !== 'approved') return false
    if (!hasValidStartDate(event)) return false
    const t = event.startDate.getTime()
    return t >= startMs && t < endMs
  })
}

/**
 * 表示用ソート。開始日時昇順、同一開始日時はタイトル昇順で安定ソートする。
 * 無効な startDate を持つイベントは除外する。
 *
 * 対応要件: 5.1, 5.7
 */
export function sortEventsForDisplay(
  events: StudySessionEvent[]
): StudySessionEvent[] {
  return events
    .filter(hasValidStartDate)
    .slice()
    .sort((a, b) => {
      const diff = a.startDate.getTime() - b.startDate.getTime()
      if (diff !== 0) return diff
      // 同一開始日時はタイトル昇順（安定ソートは Array.prototype.sort が保証）
      if (a.title < b.title) return -1
      if (a.title > b.title) return 1
      return 0
    })
}

/**
 * 表示用イベント選択。フィルタ（Approved + JST 月境界）とソートを合成する。
 *
 * 対応要件: 2.3, 3.4, 4.5, 5.1
 */
export function selectEventsForMonth(
  events: StudySessionEvent[],
  ym: YearMonth
): StudySessionEvent[] {
  return sortEventsForDisplay(filterEventsInMonth(events, ym))
}

/**
 * イベントを JST の年月日キー（YYYY-MM-DD）でグルーピングする。
 * 入力の順序を保った登場順でグループを構築する。
 * 無効な startDate を持つイベントは除外する。
 *
 * 対応要件: 5.3, 5.7
 */
export function groupEventsByJstDate(
  events: StudySessionEvent[]
): { dateKey: string; events: StudySessionEvent[] }[] {
  const groups: { dateKey: string; events: StudySessionEvent[] }[] = []
  const indexByKey = new Map<string, number>()

  for (const event of events) {
    if (!hasValidStartDate(event)) continue
    const { year, month, day } = toJstParts(event.startDate)
    const dateKey = `${String(year).padStart(4, '0')}-${String(
      month + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const existingIndex = indexByKey.get(dateKey)
    if (existingIndex === undefined) {
      indexByKey.set(dateKey, groups.length)
      groups.push({ dateKey, events: [event] })
    } else {
      groups[existingIndex].events.push(event)
    }
  }

  return groups
}

/**
 * 年月ラベルを JST で生成する（例: 2025年6月）。
 * 年（西暦）と月（1-12 表記）の両方を可読な形で含む。
 *
 * 対応要件: 3.3, 4.4
 */
export function formatYearMonthLabel(ym: YearMonth): string {
  return `${ym.year}年${ym.month + 1}月`
}
