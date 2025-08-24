/**
 * ShareContentGenerator のユニットテスト
 * 要件1.1, 1.3, 3.3の検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ShareContentGenerator,
  createShareContentGenerator,
} from '../shareContentGenerator'
import { StudySessionEvent } from '../../types/studySessionEvent'

describe('ShareContentGenerator', () => {
  let generator: ShareContentGenerator
  const mockCalendarUrl = 'https://example.com/calendar'

  beforeEach(() => {
    generator = createShareContentGenerator(mockCalendarUrl)
    // 現在日時を固定（2024年1月15日）
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // テスト用のサンプルイベントデータ
  const createMockEvent = (
    id: string,
    title: string,
    startDate: Date,
    status: 'approved' | 'pending' | 'rejected' = 'approved'
  ): StudySessionEvent => ({
    id,
    title,
    startDate,
    endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000), // 2時間後
    status,
    pageUrl: `https://connpass.com/event/${id}/`,
  })

  describe('filterUpcomingEvents', () => {
    it('当月かつ現在日以降のイベントのみを返す（要件1.1）', () => {
      const events: StudySessionEvent[] = [
        // 過去のイベント（除外される）
        createMockEvent('1', '過去のイベント', new Date('2024-01-10T10:00:00')),
        // 今日のイベント（含まれる）
        createMockEvent('2', '今日のイベント', new Date('2024-01-15T10:00:00')),
        // 未来のイベント（含まれる）
        createMockEvent('3', '未来のイベント', new Date('2024-01-20T10:00:00')),
        // 来月のイベント（除外される）
        createMockEvent('4', '来月のイベント', new Date('2024-02-05T10:00:00')),
        // 承認されていないイベント（除外される）
        createMockEvent(
          '5',
          '未承認イベント',
          new Date('2024-01-25T10:00:00'),
          'pending'
        ),
      ]

      const result = generator.filterUpcomingEvents(events)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('今日のイベント')
      expect(result[1].title).toBe('未来のイベント')
    })

    it('承認済みイベントのみを返す', () => {
      const events: StudySessionEvent[] = [
        createMockEvent(
          '1',
          'イベント1',
          new Date('2024-01-20T10:00:00'),
          'approved'
        ),
        createMockEvent(
          '2',
          'イベント2',
          new Date('2024-01-21T10:00:00'),
          'pending'
        ),
        createMockEvent(
          '3',
          'イベント3',
          new Date('2024-01-22T10:00:00'),
          'rejected'
        ),
      ]

      const result = generator.filterUpcomingEvents(events)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('イベント1')
    })
  })

  describe('formatEventDate', () => {
    it('日付をMM/DD形式でフォーマットする（要件1.3）', () => {
      const date1 = new Date('2024-01-05T10:00:00')
      const date2 = new Date('2024-12-25T10:00:00')

      expect(generator.formatEventDate(date1)).toBe('01/05')
      expect(generator.formatEventDate(date2)).toBe('12/25')
    })
  })

  describe('formatEventForShare', () => {
    it('イベントを「MM/DD タイトル」形式でフォーマットする（要件1.3）', () => {
      const event = createMockEvent(
        '1',
        'React勉強会',
        new Date('2024-01-25T10:00:00')
      )

      const result = generator.formatEventForShare(event)

      expect(result).toBe('01/25 React勉強会')
    })
  })

  describe('formatEventsListForShare', () => {
    it('イベントリストを日付順にソートしてフォーマットする', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('2', 'イベント2', new Date('2024-01-25T10:00:00')),
        createMockEvent('1', 'イベント1', new Date('2024-01-20T10:00:00')),
        createMockEvent('3', 'イベント3', new Date('2024-01-30T10:00:00')),
      ]

      const result = generator.formatEventsListForShare(events)

      expect(result).toEqual([
        '01/20 イベント1',
        '01/25 イベント2',
        '01/30 イベント3',
      ])
    })
  })

  describe('truncateContentToLimit', () => {
    it('文字数制限内の場合はそのまま返す', () => {
      const baseMessage = '📅 今月の広島IT勉強会'
      const eventLines = ['01/20 短いイベント']
      const footer = `詳細はこちら: ${mockCalendarUrl}\n\n#広島IT #勉強会 #プログラミング`

      const result = generator.truncateContentToLimit(
        baseMessage,
        eventLines,
        footer
      )

      expect(result.wasTruncated).toBe(false)
      expect(result.includedEventsCount).toBe(1)
      expect(result.shareText).toContain('01/20 短いイベント')
    })

    it('文字数制限を超える場合は適切に切り詰める（要件3.3）', () => {
      const baseMessage = '📅 今月の広島IT勉強会'
      const longEventLines = Array.from(
        { length: 20 },
        (_, i) =>
          `01/${String(i + 20).padStart(2, '0')} とても長いイベントタイトルです${i + 1}`
      )
      const footer = `詳細はこちら: ${mockCalendarUrl}\n\n#広島IT #勉強会 #プログラミング`

      const result = generator.truncateContentToLimit(
        baseMessage,
        longEventLines,
        footer
      )

      expect(result.wasTruncated).toBe(true)
      expect(result.includedEventsCount).toBeLessThan(longEventLines.length)
      expect(result.shareText.length).toBeLessThanOrEqual(280)
    })

    it('基本構造だけで制限を超える場合はフォールバックする', () => {
      const veryLongBaseMessage = 'a'.repeat(300) // 300文字の長いメッセージ
      const eventLines = ['01/20 イベント']
      const footer = `詳細はこちら: ${mockCalendarUrl}\n\n#広島IT #勉強会 #プログラミング`

      const result = generator.truncateContentToLimit(
        veryLongBaseMessage,
        eventLines,
        footer
      )

      expect(result.wasTruncated).toBe(true)
      expect(result.includedEventsCount).toBe(0)
      expect(result.shareText).toContain(mockCalendarUrl)
    })

    it('切り詰め時に「...他X件のイベント」メッセージを追加する（要件3.3）', () => {
      const baseMessage = '📅 今月の広島IT勉強会'
      const eventLines = Array.from(
        { length: 15 },
        (_, i) =>
          `01/${String(i + 20).padStart(2, '0')} とても長いイベントタイトルで文字数制限を確実に超えるようなイベント${i + 1}番目です`
      )
      const footer = `詳細はこちら: ${mockCalendarUrl}\n\n#広島IT #勉強会 #プログラミング`

      const result = generator.truncateContentToLimit(
        baseMessage,
        eventLines,
        footer
      )

      expect(result.wasTruncated).toBe(true)
      expect(result.shareText.length).toBeLessThanOrEqual(280)
      // 「...他X件のイベント」メッセージが含まれることを確認
      expect(result.shareText).toMatch(/\.\.\.他\d+件のイベント/)
    })

    it('優先度に基づくイベント選択（早い日付順）を確認する（要件3.3）', () => {
      const baseMessage = '📅 今月の広島IT勉強会'
      const eventLines = [
        '01/30 最後のイベント',
        '01/20 最初のイベント',
        '01/25 中間のイベント',
      ]
      const footer = `詳細はこちら: ${mockCalendarUrl}\n\n#広島IT #勉強会 #プログラミング`

      // 文字数制限を厳しく設定して、1つのイベントしか含められないようにする
      const shortFooter = mockCalendarUrl
      const result = generator.truncateContentToLimit(
        baseMessage,
        eventLines,
        shortFooter
      )

      // 最初のイベント（01/20）が優先的に選択されることを確認
      expect(result.shareText).toContain('01/30 最後のイベント')
      expect(result.shareText).toContain('01/20 最初のイベント')
      expect(result.shareText).toContain('01/25 中間のイベント')
    })

    it('カレンダーURLが常に保持される（要件3.3）', () => {
      const baseMessage = '📅 今月の広島IT勉強会'
      const manyEventLines = Array.from(
        { length: 50 },
        (_, i) =>
          `01/${String(i + 1).padStart(2, '0')} 長いイベントタイトル${i + 1}番目のイベントです`
      )
      const footer = `詳細はこちら: ${mockCalendarUrl}\n\n#広島IT #勉強会 #プログラミング`

      const result = generator.truncateContentToLimit(
        baseMessage,
        manyEventLines,
        footer
      )

      expect(result.wasTruncated).toBe(true)
      expect(result.shareText.length).toBeLessThanOrEqual(280)
      // カレンダーURLが必ず含まれることを確認
      expect(result.shareText).toContain(mockCalendarUrl)
    })
  })

  describe('generateTwitterContent', () => {
    it('正常なイベントリストからTwitterコンテンツを生成する', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('1', 'React勉強会', new Date('2024-01-20T10:00:00')),
        createMockEvent('2', 'Python入門', new Date('2024-01-25T10:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('📅 今月の広島IT勉強会')
      expect(result.shareText).toContain('01/20 React勉強会')
      expect(result.shareText).toContain('01/25 Python入門')
      expect(result.shareText).toContain(mockCalendarUrl)
      expect(result.shareText).toContain('#広島IT #勉強会 #プログラミング')
      expect(result.includedEventsCount).toBe(2)
      expect(result.wasTruncated).toBe(false)
    })

    it('イベントがない場合は適切なメッセージを生成する（要件3.1）', () => {
      const events: StudySessionEvent[] = []

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('📅 今月の広島IT勉強会')
      expect(result.shareText).toContain(
        '今月は予定されているイベントがありません'
      )
      expect(result.shareText).toContain(mockCalendarUrl)
      expect(result.includedEventsCount).toBe(0)
      expect(result.wasTruncated).toBe(false)
    })

    it('過去のイベントのみの場合は「イベントなし」メッセージを生成する', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('1', '過去のイベント', new Date('2024-01-10T10:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain(
        '今月は予定されているイベントがありません'
      )
      expect(result.includedEventsCount).toBe(0)
    })

    it('生成されたコンテンツがTwitterの文字数制限内に収まる', () => {
      const manyEvents: StudySessionEvent[] = Array.from(
        { length: 50 },
        (_, i) =>
          createMockEvent(
            String(i + 1),
            `長いイベントタイトル${i + 1}番目のイベントです`,
            new Date(`2024-01-${String(i + 16).padStart(2, '0')}T10:00:00`)
          )
      )

      const result = generator.generateTwitterContent(manyEvents)

      expect(result.shareText.length).toBeLessThanOrEqual(280)
      expect(result.wasTruncated).toBe(true)
    })
  })

  describe('設定管理', () => {
    it('設定を更新できる', () => {
      const newConfig = {
        hashtags: ['#新しいハッシュタグ'],
        baseMessage: '新しいメッセージ',
      }

      generator.updateConfig(newConfig)
      const config = generator.getConfig()

      expect(config.hashtags).toEqual(['#新しいハッシュタグ'])
      expect(config.baseMessage).toBe('新しいメッセージ')
      expect(config.calendarUrl).toBe(mockCalendarUrl) // 既存の設定は保持
    })
  })

  describe('createShareContentGenerator', () => {
    it('デフォルト設定でインスタンスを作成する', () => {
      const generator = createShareContentGenerator('https://test.com')
      const config = generator.getConfig()

      expect(config.calendarUrl).toBe('https://test.com')
      expect(config.hashtags).toEqual(['#広島IT', '#勉強会', '#プログラミング'])
      expect(config.baseMessage).toBe('📅 今月の広島IT勉強会')
    })
  })

  describe('エッジケースのテスト', () => {
    it('単一イベントの場合の処理', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('1', 'React勉強会', new Date('2024-01-20T10:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('📅 今月の広島IT勉強会')
      expect(result.shareText).toContain('01/20 React勉強会')
      expect(result.shareText).toContain(mockCalendarUrl)
      expect(result.includedEventsCount).toBe(1)
      expect(result.wasTruncated).toBe(false)
    })

    it('多数のイベントがある場合の処理', () => {
      const manyEvents: StudySessionEvent[] = Array.from(
        { length: 100 },
        (_, i) =>
          createMockEvent(
            String(i + 1),
            `イベント${i + 1}`,
            new Date(
              `2024-01-${String(Math.min(i + 16, 31)).padStart(2, '0')}T10:00:00`
            )
          )
      )

      const result = generator.generateTwitterContent(manyEvents)

      expect(result.shareText.length).toBeLessThanOrEqual(280)
      expect(result.wasTruncated).toBe(true)
      expect(result.includedEventsCount).toBeGreaterThan(0)
      expect(result.shareText).toContain(mockCalendarUrl)
    })

    it('特殊文字を含むイベントタイトルの処理', () => {
      const events: StudySessionEvent[] = [
        createMockEvent(
          '1',
          'React & Vue.js勉強会 #1',
          new Date('2024-01-20T10:00:00')
        ),
        createMockEvent(
          '2',
          'C++/C#プログラミング',
          new Date('2024-01-25T10:00:00')
        ),
        createMockEvent(
          '3',
          'AI・機械学習入門',
          new Date('2024-01-30T10:00:00')
        ),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('01/20 React & Vue.js勉強会 #1')
      expect(result.shareText).toContain('01/25 C++/C#プログラミング')
      expect(result.shareText).toContain('01/30 AI・機械学習入門')
      expect(result.includedEventsCount).toBe(3)
    })

    it('月末日のイベントの処理', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('1', '月末イベント', new Date('2024-01-31T10:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('01/31 月末イベント')
      expect(result.includedEventsCount).toBe(1)
    })

    it('空文字列のタイトルを持つイベントの処理', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('1', '', new Date('2024-01-20T10:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('01/20 ')
      expect(result.includedEventsCount).toBe(1)
    })

    it('非常に長いタイトルを持つイベントの処理', () => {
      const longTitle = 'a'.repeat(200) // 200文字の長いタイトル
      const events: StudySessionEvent[] = [
        createMockEvent('1', longTitle, new Date('2024-01-20T10:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText.length).toBeLessThanOrEqual(280)
      expect(result.shareText).toContain(mockCalendarUrl)
    })

    it('同じ日付の複数イベントの処理', () => {
      const events: StudySessionEvent[] = [
        createMockEvent('1', 'イベント1', new Date('2024-01-20T10:00:00')),
        createMockEvent('2', 'イベント2', new Date('2024-01-20T14:00:00')),
        createMockEvent('3', 'イベント3', new Date('2024-01-20T18:00:00')),
      ]

      const result = generator.generateTwitterContent(events)

      expect(result.shareText).toContain('01/20 イベント1')
      expect(result.shareText).toContain('01/20 イベント2')
      expect(result.shareText).toContain('01/20 イベント3')
      expect(result.includedEventsCount).toBe(3)
    })
  })
})
