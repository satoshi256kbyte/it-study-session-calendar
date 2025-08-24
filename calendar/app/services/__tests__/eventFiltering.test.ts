/**
 * イベントフィルタリングロジックのテスト
 * 要件1.1の検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  StudySessionEvent,
  filterUpcomingEventsThisMonth,
} from '../../types/studySessionEvent'

describe('Event Filtering Logic', () => {
  let mockEvents: StudySessionEvent[]

  beforeEach(() => {
    // 現在日時を2024年1月15日に固定
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 0, 15, 10, 0, 0))

    // テスト用のイベントデータを準備（ローカル時間で作成）
    mockEvents = [
      // 当月・過去のイベント（除外されるべき）
      {
        id: '1',
        title: '過去のイベント',
        startDate: new Date(2024, 0, 10, 19, 0, 0), // 2024年1月10日
        endDate: new Date(2024, 0, 10, 21, 0, 0),
        status: 'approved',
      },
      // 当月・今日のイベント（含まれるべき）
      {
        id: '2',
        title: '今日のイベント',
        startDate: new Date(2024, 0, 15, 19, 0, 0), // 2024年1月15日
        endDate: new Date(2024, 0, 15, 21, 0, 0),
        status: 'approved',
      },
      // 当月・未来のイベント（含まれるべき）
      {
        id: '3',
        title: '未来のイベント',
        startDate: new Date(2024, 0, 20, 19, 0, 0), // 2024年1月20日
        endDate: new Date(2024, 0, 20, 21, 0, 0),
        status: 'approved',
      },
      // 翌月のイベント（除外されるべき）
      {
        id: '4',
        title: '翌月のイベント',
        startDate: new Date(2024, 1, 5, 19, 0, 0), // 2024年2月5日
        endDate: new Date(2024, 1, 5, 21, 0, 0),
        status: 'approved',
      },
      // 前月のイベント（除外されるべき）
      {
        id: '5',
        title: '前月のイベント',
        startDate: new Date(2023, 11, 25, 19, 0, 0), // 2023年12月25日
        endDate: new Date(2023, 11, 25, 21, 0, 0),
        status: 'approved',
      },
      // 当月・未来だが未承認のイベント（除外されるべき）
      {
        id: '6',
        title: '未承認のイベント',
        startDate: new Date(2024, 0, 25, 19, 0, 0), // 2024年1月25日
        endDate: new Date(2024, 0, 25, 21, 0, 0),
        status: 'pending',
      },
      // 当月・未来だが却下されたイベント（除外されるべき）
      {
        id: '7',
        title: '却下されたイベント',
        startDate: new Date(2024, 0, 30, 19, 0, 0), // 2024年1月30日
        endDate: new Date(2024, 0, 30, 21, 0, 0),
        status: 'rejected',
      },
    ]
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('当月かつ現在日以降の承認済みイベントのみを返す', () => {
    const filteredEvents = filterUpcomingEventsThisMonth(mockEvents)

    expect(filteredEvents).toHaveLength(2)
    expect(filteredEvents[0].id).toBe('2') // 今日のイベント
    expect(filteredEvents[1].id).toBe('3') // 未来のイベント
  })

  it('過去のイベントは除外される', () => {
    const filteredEvents = filterUpcomingEventsThisMonth(mockEvents)
    const pastEventIds = filteredEvents.map(e => e.id)

    expect(pastEventIds).not.toContain('1') // 過去のイベント
  })

  it('翌月のイベントは除外される', () => {
    const filteredEvents = filterUpcomingEventsThisMonth(mockEvents)
    const eventIds = filteredEvents.map(e => e.id)

    expect(eventIds).not.toContain('4') // 翌月のイベント
  })

  it('前月のイベントは除外される', () => {
    const filteredEvents = filterUpcomingEventsThisMonth(mockEvents)
    const eventIds = filteredEvents.map(e => e.id)

    expect(eventIds).not.toContain('5') // 前月のイベント
  })

  it('未承認のイベントは除外される', () => {
    const filteredEvents = filterUpcomingEventsThisMonth(mockEvents)
    const eventIds = filteredEvents.map(e => e.id)

    expect(eventIds).not.toContain('6') // 未承認のイベント
    expect(eventIds).not.toContain('7') // 却下されたイベント
  })

  it('空の配列を渡した場合は空の配列を返す', () => {
    const filteredEvents = filterUpcomingEventsThisMonth([])

    expect(filteredEvents).toHaveLength(0)
  })

  it('条件に合うイベントがない場合は空の配列を返す', () => {
    const pastOnlyEvents: StudySessionEvent[] = [
      {
        id: '1',
        title: '過去のイベント',
        startDate: new Date(2024, 0, 10, 19, 0, 0), // 2024年1月10日
        endDate: new Date(2024, 0, 10, 21, 0, 0),
        status: 'approved',
      },
    ]

    const filteredEvents = filterUpcomingEventsThisMonth(pastOnlyEvents)

    expect(filteredEvents).toHaveLength(0)
  })

  describe('月末・月初のエッジケース', () => {
    it('月末の日付で正しくフィルタリングする', () => {
      // 1月31日に設定
      vi.setSystemTime(new Date(2024, 0, 31, 10, 0, 0))

      const monthEndEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: '今日のイベント',
          startDate: new Date(2024, 0, 31, 19, 0, 0), // 2024年1月31日
          endDate: new Date(2024, 0, 31, 21, 0, 0),
          status: 'approved',
        },
        {
          id: '2',
          title: '翌月のイベント',
          startDate: new Date(2024, 1, 1, 19, 0, 0), // 2024年2月1日
          endDate: new Date(2024, 1, 1, 21, 0, 0),
          status: 'approved',
        },
      ]

      const filteredEvents = filterUpcomingEventsThisMonth(monthEndEvents)

      expect(filteredEvents).toHaveLength(1)
      expect(filteredEvents[0].id).toBe('1')
    })

    it('月初の日付で正しくフィルタリングする', () => {
      // 2月1日に設定
      vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0))

      const monthStartEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: '前月のイベント',
          startDate: new Date(2024, 0, 31, 19, 0, 0), // 2024年1月31日
          endDate: new Date(2024, 0, 31, 21, 0, 0),
          status: 'approved',
        },
        {
          id: '2',
          title: '今日のイベント',
          startDate: new Date(2024, 1, 1, 19, 0, 0), // 2024年2月1日
          endDate: new Date(2024, 1, 1, 21, 0, 0),
          status: 'approved',
        },
      ]

      const filteredEvents = filterUpcomingEventsThisMonth(monthStartEvents)

      expect(filteredEvents).toHaveLength(1)
      expect(filteredEvents[0].id).toBe('2')
    })
  })

  describe('年跨ぎのエッジケース', () => {
    it('12月から1月への年跨ぎで正しくフィルタリングする', () => {
      // 12月31日に設定
      vi.setSystemTime(new Date(2023, 11, 31, 10, 0, 0))

      const yearEndEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: '今日のイベント',
          startDate: new Date(2023, 11, 31, 19, 0, 0), // 2023年12月31日
          endDate: new Date(2023, 11, 31, 21, 0, 0),
          status: 'approved',
        },
        {
          id: '2',
          title: '翌年のイベント',
          startDate: new Date(2024, 0, 1, 19, 0, 0), // 2024年1月1日
          endDate: new Date(2024, 0, 1, 21, 0, 0),
          status: 'approved',
        },
      ]

      const filteredEvents = filterUpcomingEventsThisMonth(yearEndEvents)

      expect(filteredEvents).toHaveLength(1)
      expect(filteredEvents[0].id).toBe('1')
    })
  })

  describe('時刻の影響テスト', () => {
    it('同じ日付でも時刻に関係なく含まれる', () => {
      // 1月15日の午後に設定
      vi.setSystemTime(new Date(2024, 0, 15, 15, 0, 0))

      const samedayEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: '午前のイベント',
          startDate: new Date(2024, 0, 15, 9, 0, 0), // 2024年1月15日 午前
          endDate: new Date(2024, 0, 15, 11, 0, 0),
          status: 'approved',
        },
        {
          id: '2',
          title: '午後のイベント',
          startDate: new Date(2024, 0, 15, 19, 0, 0), // 2024年1月15日 午後
          endDate: new Date(2024, 0, 15, 21, 0, 0),
          status: 'approved',
        },
      ]

      const filteredEvents = filterUpcomingEventsThisMonth(samedayEvents)

      expect(filteredEvents).toHaveLength(2)
    })
  })
})
