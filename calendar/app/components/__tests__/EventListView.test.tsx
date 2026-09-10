import { render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { StudySessionEvent } from '../../types/studySessionEvent'

/**
 * EventListView は各行を EventListItem に委譲し、EventListItem はサムネイル表示を
 * EventThumbnail 経由で OptimizedThumbnail（next/image + IntersectionObserver）に
 * 依存する。本テストは EventListView 自身の責務（同一 JST 日付のグルーピング・
 * 日付見出しの生成・日付昇順表示・リンク提供の委譲）を決定的に検証するため、
 * EventListItem.test.tsx / EventThumbnail.test.tsx と同様に OptimizedImage を
 * 軽量スタブへ差し替える。
 */
vi.mock('../OptimizedImage', () => {
  return {
    OptimizedThumbnail: (props: {
      src: string
      alt: string
      width: number
      height: number
      variant?: string
      responsive?: boolean
      className?: string
      onError?: () => void
    }) => (
      <img
        data-testid="optimized-thumbnail"
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        data-variant={props.variant}
        onError={props.onError}
      />
    ),
  }
})

// モック定義後に import する（vi.mock は巻き上げられる）
import EventListView from '../EventListView'

/**
 * テスト用イベントを生成するファクトリ。
 * startDate は UTC 指定にすることで、実行環境のローカルタイムゾーンに依存せず
 * JST 射影（UTC+9）の期待値を安定させる。
 */
function createEvent(
  overrides: Partial<StudySessionEvent> = {}
): StudySessionEvent {
  const startDate = new Date('2025-01-15T10:30:00Z') // JST 2025-01-15 19:30
  return {
    id: 'evt-1',
    title: 'React勉強会 #42',
    startDate,
    endDate: new Date('2025-01-15T12:00:00Z'),
    status: 'approved',
    ...overrides,
  }
}

/** 日付見出し要素（<h3 class="event-list-day-heading">）を DOM 出現順に取得する */
function getDayHeadings(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('.event-list-day-heading')
  )
}

describe('EventListView', () => {
  describe('同一日付のグルーピング（Requirement 5.3）', () => {
    test('同一 JST 日付の複数イベントは同一見出しの下にまとまる', () => {
      // どちらも JST 2025-01-15（UTC 10:30 / 08:00）
      const events: StudySessionEvent[] = [
        createEvent({
          id: 'a',
          title: 'React勉強会 #42',
          startDate: new Date('2025-01-15T10:30:00Z'),
        }),
        createEvent({
          id: 'b',
          title: 'TypeScript入門',
          startDate: new Date('2025-01-15T08:00:00Z'),
        }),
      ]

      const { container } = render(<EventListView events={events} />)

      // 見出しは 1 つのみ
      const headings = getDayHeadings(container)
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent('2025年1月15日（水）')

      // その見出しを持つ section 内に両イベントが含まれる
      const section = headings[0].closest('section') as HTMLElement
      expect(section).not.toBeNull()
      expect(within(section).getByText('React勉強会 #42')).toBeInTheDocument()
      expect(within(section).getByText('TypeScript入門')).toBeInTheDocument()
    })

    test('UTC 上は同日でも JST 射影で別日になるイベントは別見出しに分かれる', () => {
      // UTC 2025-01-15T16:00:00Z → JST 2025-01-16 01:00（翌日）
      // UTC 2025-01-15T10:00:00Z → JST 2025-01-15 19:00（当日）
      const events: StudySessionEvent[] = [
        createEvent({
          id: 'same-day',
          title: '当日イベント',
          startDate: new Date('2025-01-15T10:00:00Z'),
        }),
        createEvent({
          id: 'next-day',
          title: '翌日イベント',
          startDate: new Date('2025-01-15T16:00:00Z'),
        }),
      ]

      const { container } = render(<EventListView events={events} />)

      const headings = getDayHeadings(container)
      expect(headings).toHaveLength(2)
      expect(headings[0]).toHaveTextContent('2025年1月15日（水）')
      expect(headings[1]).toHaveTextContent('2025年1月16日（木）')
    })
  })

  describe('日付見出しの昇順表示（Requirement 5.1, 5.2）', () => {
    test('入力順に従い日付見出しが登場順に描画される（昇順入力）', () => {
      // 呼び出し側（selectEventsForMonth）で昇順ソート済みの入力を想定する。
      // EventListView は入力順のグループ登場順を保つ。
      const events: StudySessionEvent[] = [
        createEvent({
          id: 'jan-05',
          title: '1月5日イベント',
          startDate: new Date('2025-01-05T01:00:00Z'), // JST 01-05 10:00
        }),
        createEvent({
          id: 'jan-15',
          title: '1月15日イベント',
          startDate: new Date('2025-01-15T01:00:00Z'), // JST 01-15 10:00
        }),
        createEvent({
          id: 'jan-28',
          title: '1月28日イベント',
          startDate: new Date('2025-01-28T01:00:00Z'), // JST 01-28 10:00
        }),
      ]

      const { container } = render(<EventListView events={events} />)

      const headingTexts = getDayHeadings(container).map(h =>
        h.textContent?.trim()
      )
      expect(headingTexts).toEqual([
        '2025年1月5日（日）',
        '2025年1月15日（水）',
        '2025年1月28日（火）',
      ])
    })

    test('見出しには年月日と曜日が JST で表示される', () => {
      const { container } = render(
        <EventListView
          events={[
            createEvent({
              startDate: new Date('2025-01-15T10:30:00Z'), // JST 01-15（水）
            }),
          ]}
        />
      )

      const headings = getDayHeadings(container)
      expect(headings).toHaveLength(1)
      expect(headings[0]).toHaveTextContent('2025年1月15日（水）')
    })
  })

  describe('イベントページリンクの提供（Requirement 5.4）', () => {
    test('pageUrl を持つイベントはリンクとして提供される', () => {
      const pageUrl = 'https://connpass.com/event/364/'
      render(
        <EventListView
          events={[createEvent({ title: 'React勉強会 #42', pageUrl })]}
        />
      )

      const link = screen.getByRole('link', { name: 'React勉強会 #42' })
      expect(link).toHaveAttribute('href', pageUrl)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    test('pageUrl を持たないイベントはリンクにならずテキスト表示される', () => {
      render(
        <EventListView
          events={[
            createEvent({ title: 'リンクなしイベント', pageUrl: undefined }),
          ]}
        />
      )

      expect(screen.queryByRole('link')).toBeNull()
      expect(screen.getByText('リンクなしイベント')).toBeInTheDocument()
    })
  })
})
