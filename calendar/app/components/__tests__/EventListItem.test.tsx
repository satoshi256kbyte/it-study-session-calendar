import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { StudySessionEvent } from '../../types/studySessionEvent'

/**
 * EventListItem はサムネイル表示を EventThumbnail に委譲し、EventThumbnail は
 * OptimizedThumbnail（next/image + IntersectionObserver）に依存する。
 * 本テストは EventListItem 自身の責務（開始時刻の JST 時分表示・タイトル表示・
 * pageUrl 有無によるリンク表示切替）を決定的に検証するため、
 * EventThumbnail.test.tsx と同様に OptimizedImage を軽量スタブへ差し替える。
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
import EventListItem from '../EventListItem'

/**
 * テスト用イベントを生成するファクトリ。
 * startDate は UTC 指定にすることで、実行環境のローカルタイムゾーンに依存せず
 * JST 射影（UTC+9）の期待値を安定させる。
 */
function createEvent(
  overrides: Partial<StudySessionEvent> = {}
): StudySessionEvent {
  const startDate = new Date('2025-01-15T10:30:00Z') // JST 19:30
  return {
    id: 'evt-1',
    title: 'React勉強会 #42',
    startDate,
    endDate: new Date('2025-01-15T12:00:00Z'),
    status: 'approved',
    ...overrides,
  }
}

describe('EventListItem', () => {
  describe('開始時刻・タイトルの表示（Requirement 5.2）', () => {
    test('開始時刻を JST の HH:mm 形式で表示する', () => {
      // UTC 10:30 → JST 19:30
      render(<EventListItem event={createEvent()} />)

      expect(screen.getByText('19:30')).toBeInTheDocument()
    })

    test('日付をまたぐ JST 射影も正しく HH:mm 表示される', () => {
      // UTC 2025-01-15T20:15:00Z → JST 2025-01-16 05:15
      render(
        <EventListItem
          event={createEvent({
            startDate: new Date('2025-01-15T20:15:00Z'),
          })}
        />
      )

      expect(screen.getByText('05:15')).toBeInTheDocument()
    })

    test('時分は 0 埋めされる', () => {
      // UTC 2025-01-15T00:05:00Z → JST 09:05
      render(
        <EventListItem
          event={createEvent({
            startDate: new Date('2025-01-15T00:05:00Z'),
          })}
        />
      )

      expect(screen.getByText('09:05')).toBeInTheDocument()
    })

    test('無効な日時（Invalid Date）の場合は時刻を表示しない', () => {
      const { container } = render(
        <EventListItem
          event={createEvent({ startDate: new Date('invalid') })}
        />
      )

      expect(container.querySelector('.event-list-item-time')).toBeNull()
    })

    test('イベントタイトルを表示する', () => {
      render(<EventListItem event={createEvent({ title: 'TypeScript入門' })} />)

      expect(screen.getByText('TypeScript入門')).toBeInTheDocument()
    })
  })

  describe('pageUrl 有無によるリンク表示の切り替え（Requirement 5.4）', () => {
    test('pageUrl があればタイトルをリンク化する', () => {
      const pageUrl = 'https://connpass.com/event/364/'
      render(<EventListItem event={createEvent({ pageUrl })} />)

      const link = screen.getByRole('link', { name: 'React勉強会 #42' })
      expect(link).toHaveAttribute('href', pageUrl)
    })

    test('リンクは target="_blank" と rel="noopener noreferrer" を付与する', () => {
      render(
        <EventListItem
          event={createEvent({
            pageUrl: 'https://connpass.com/event/364/',
          })}
        />
      )

      const link = screen.getByRole('link', { name: 'React勉強会 #42' })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    test('pageUrl が無い場合はリンクにせずテキストのみ表示する', () => {
      render(<EventListItem event={createEvent({ pageUrl: undefined })} />)

      expect(screen.queryByRole('link')).toBeNull()
      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
    })
  })
})
