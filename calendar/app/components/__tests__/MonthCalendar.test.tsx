import { render, screen, fireEvent, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { StudySessionEvent } from '../../types/studySessionEvent'

/**
 * MonthCalendar は list 状態で EventListView → EventListItem → EventThumbnail
 * → OptimizedThumbnail（next/image + IntersectionObserver）へ委譲する。本テストは
 * MonthCalendar 自身の責務（表示状態の優先順位・月移動・アクセシブルネーム）を
 * 決定的に検証するため、EventListView.test.tsx 等と同様に OptimizedImage を
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
import MonthCalendar, { MonthCalendarProps } from '../MonthCalendar'

/**
 * テスト用イベントを生成するファクトリ。
 * startDate は UTC 指定にすることで、実行環境のローカルタイムゾーンに依存せず
 * JST 射影（UTC+9）の期待値を安定させる。
 */
function createEvent(
  overrides: Partial<StudySessionEvent> = {}
): StudySessionEvent {
  const startDate = new Date('2025-06-15T01:00:00Z') // JST 2025-06-15 10:00
  return {
    id: 'evt-1',
    title: 'React勉強会 #42',
    startDate,
    endDate: new Date('2025-06-15T03:00:00Z'),
    status: 'approved',
    ...overrides,
  }
}

/** Props のデフォルト（正常・list 状態向け）を生成する */
function createProps(
  overrides: Partial<MonthCalendarProps> = {}
): MonthCalendarProps {
  return {
    events: [],
    isLoading: false,
    error: null,
    isRetryable: false,
    onRetry: vi.fn(),
    ...overrides,
  }
}

/** 年月ラベル（<h2 class="month-calendar-label">）を取得する */
function getMonthLabel(container: HTMLElement): HTMLElement {
  const label = container.querySelector<HTMLElement>('.month-calendar-label')
  expect(label).not.toBeNull()
  return label as HTMLElement
}

describe('MonthCalendar', () => {
  // 表示月は getCurrentYearMonthJst() が new Date() を用いて初期化するため、
  // 決定的なラベル検証のためにシステム時刻を JST 2025-06-15 に固定する。
  // （UTC 2025-06-15T00:00:00Z → JST 2025-06-15 09:00 → 2025年6月）
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('表示状態の優先順位（error > loading > empty > list）', () => {
    test('error は loading・empty より優先される（error!=null かつ isLoading=true かつ events=[]）', () => {
      render(
        <MonthCalendar
          {...createProps({
            events: [],
            isLoading: true,
            error: '取得に失敗しました',
            isRetryable: true,
          })}
        />
      )

      // error（role="alert"）が表示される
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(
        within(alert).getByText('勉強会データの取得に失敗しました')
      ).toBeInTheDocument()
      expect(within(alert).getByText('取得に失敗しました')).toBeInTheDocument()

      // loading（role="status"）・empty は表示されない
      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.queryByText('この月の勉強会はありません')).toBeNull()
    })

    test('loading は empty・list より優先される（error=null かつ isLoading=true）', () => {
      render(
        <MonthCalendar
          {...createProps({
            // 表示月に含まれる approved イベントがあっても loading が優先される
            events: [createEvent()],
            isLoading: true,
            error: null,
          })}
        />
      )

      // loading（LoadingSpinner: role="status"）が表示される
      const status = screen.getByRole('status')
      expect(status).toBeInTheDocument()
      expect(status).toHaveAttribute('aria-label', '勉強会を読み込み中')

      // error・empty・list は表示されない
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByText('この月の勉強会はありません')).toBeNull()
      expect(screen.queryByText('React勉強会 #42')).toBeNull()
    })

    test('empty は list より優先される（表示月に対象イベント 0 件）', () => {
      // 表示月（2025-06）に含まれないイベントのみ → 0 件 → empty
      render(
        <MonthCalendar
          {...createProps({
            events: [
              createEvent({
                id: 'other-month',
                startDate: new Date('2025-05-15T01:00:00Z'), // JST 2025-05
              }),
            ],
            isLoading: false,
            error: null,
          })}
        />
      )

      expect(screen.getByText('この月の勉強会はありません')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByRole('status')).toBeNull()
    })

    test('list は正常・非空・0件超で表示される（approved かつ表示月内）', () => {
      render(
        <MonthCalendar
          {...createProps({
            events: [createEvent({ title: 'React勉強会 #42' })],
            isLoading: false,
            error: null,
          })}
        />
      )

      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.queryByText('この月の勉強会はありません')).toBeNull()
    })

    test('pending / rejected や表示月外は list から除外され empty になる', () => {
      render(
        <MonthCalendar
          {...createProps({
            events: [
              createEvent({ id: 'pending', status: 'pending' }),
              createEvent({ id: 'rejected', status: 'rejected' }),
            ],
            isLoading: false,
            error: null,
          })}
        />
      )

      expect(screen.getByText('この月の勉強会はありません')).toBeInTheDocument()
    })
  })

  describe('月移動によるラベル更新（Requirement 4.1, 4.4）', () => {
    test('初期ラベルは JST 現在年月（2025年6月）', () => {
      const { container } = render(<MonthCalendar {...createProps()} />)
      expect(getMonthLabel(container)).toHaveTextContent('2025年6月')
    })

    test('「次の月へ」クリックで翌月ラベルに更新される', () => {
      const { container } = render(<MonthCalendar {...createProps()} />)
      const label = getMonthLabel(container)
      expect(label).toHaveTextContent('2025年6月')

      fireEvent.click(screen.getByRole('button', { name: '次の月へ' }))
      expect(label).toHaveTextContent('2025年7月')
    })

    test('「前の月へ」クリックで前月ラベルに更新される', () => {
      const { container } = render(<MonthCalendar {...createProps()} />)
      const label = getMonthLabel(container)
      expect(label).toHaveTextContent('2025年6月')

      fireEvent.click(screen.getByRole('button', { name: '前の月へ' }))
      expect(label).toHaveTextContent('2025年5月')
    })

    test('年境界をまたぐ月移動（12月→翌年1月 / 1月→前年12月）', () => {
      // 2025-12 に固定
      vi.setSystemTime(new Date('2025-12-15T00:00:00Z'))
      const { container, unmount } = render(
        <MonthCalendar {...createProps()} />
      )
      const label = getMonthLabel(container)
      expect(label).toHaveTextContent('2025年12月')

      fireEvent.click(screen.getByRole('button', { name: '次の月へ' }))
      expect(label).toHaveTextContent('2026年1月')
      unmount()

      // 2026-01 に固定
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'))
      const { container: c2 } = render(<MonthCalendar {...createProps()} />)
      const label2 = getMonthLabel(c2)
      expect(label2).toHaveTextContent('2026年1月')

      fireEvent.click(screen.getByRole('button', { name: '前の月へ' }))
      expect(label2).toHaveTextContent('2025年12月')
    })

    test('月移動でラベルに応じて表示月のイベントへ切り替わる', () => {
      // 6月と7月に 1 件ずつ approved イベントを用意する
      const events = [
        createEvent({
          id: 'june',
          title: '6月イベント',
          startDate: new Date('2025-06-10T01:00:00Z'), // JST 2025-06
        }),
        createEvent({
          id: 'july',
          title: '7月イベント',
          startDate: new Date('2025-07-10T01:00:00Z'), // JST 2025-07
        }),
      ]
      render(<MonthCalendar {...createProps({ events })} />)

      // 初期は 6 月 → 6月イベントのみ
      expect(screen.getByText('6月イベント')).toBeInTheDocument()
      expect(screen.queryByText('7月イベント')).toBeNull()

      // 翌月へ → 7月イベントのみ
      fireEvent.click(screen.getByRole('button', { name: '次の月へ' }))
      expect(screen.getByText('7月イベント')).toBeInTheDocument()
      expect(screen.queryByText('6月イベント')).toBeNull()
    })
  })

  describe('読み込み中の月移動抑止（Requirement 4.6, 8.3）', () => {
    test('isLoading=true のとき月移動ボタンは disabled', () => {
      render(<MonthCalendar {...createProps({ isLoading: true })} />)

      expect(screen.getByRole('button', { name: '前の月へ' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '次の月へ' })).toBeDisabled()
    })

    test('isLoading=true のとき「次の月へ」をクリックしてもラベルは変わらない', () => {
      const { container } = render(
        <MonthCalendar {...createProps({ isLoading: true })} />
      )
      const label = getMonthLabel(container)
      expect(label).toHaveTextContent('2025年6月')

      fireEvent.click(screen.getByRole('button', { name: '次の月へ' }))
      expect(label).toHaveTextContent('2025年6月')
    })

    test('isLoading=true のとき「前の月へ」をクリックしてもラベルは変わらない', () => {
      const { container } = render(
        <MonthCalendar {...createProps({ isLoading: true })} />
      )
      const label = getMonthLabel(container)
      expect(label).toHaveTextContent('2025年6月')

      fireEvent.click(screen.getByRole('button', { name: '前の月へ' }))
      expect(label).toHaveTextContent('2025年6月')
    })
  })

  describe('月移動操作要素のアクセシブルネーム（Requirement 2.4, 2.5, 5.5）', () => {
    test('aria-label「前の月へ」「次の月へ」のボタンが提供される', () => {
      render(<MonthCalendar {...createProps()} />)

      expect(
        screen.getByRole('button', { name: '前の月へ' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '次の月へ' })
      ).toBeInTheDocument()
    })

    test('月移動ヘッダーは全状態（error/loading/empty/list）で共通表示される', () => {
      const states: Partial<MonthCalendarProps>[] = [
        { error: 'err', isRetryable: false }, // error
        { isLoading: true }, // loading
        { events: [] }, // empty
        { events: [createEvent()] }, // list
      ]

      for (const state of states) {
        const { unmount } = render(<MonthCalendar {...createProps(state)} />)
        expect(
          screen.getByRole('button', { name: '前の月へ' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: '次の月へ' })
        ).toBeInTheDocument()
        unmount()
      }
    })
  })
})
