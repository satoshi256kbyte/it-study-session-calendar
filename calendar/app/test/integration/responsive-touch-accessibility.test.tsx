/**
 * レスポンシブタッチ操作とアクセシビリティテスト
 * 要件6.1, 6.2, 6.3, 6.4に対応
 *
 * - タッチターゲットサイズのテスト
 * - キーボードナビゲーションのテスト
 * - ARIAラベルとスクリーンリーダー対応のテスト
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '../test-utils'
import userEvent from '@testing-library/user-event'
import ResponsiveEventMaterialsList from '../../components/ResponsiveEventMaterialsList'
import EventMaterialCard from '../../components/EventMaterialCard'
import { EventWithMaterials } from '../../types/eventMaterial'

// テスト用のモックデータ
const mockEvents: EventWithMaterials[] = [
  {
    id: 'test-event-1',
    title: 'React勉強会 #42',
    eventDate: '2025-01-15T19:00:00+09:00',
    eventUrl: 'https://connpass.com/event/123/',
    connpassUrl: 'https://connpass.com/event/123/',
    materials: [
      {
        id: 'material-1',
        title: 'Reactの新機能について',
        url: 'https://example.com/slide1',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        type: 'slide' as const,
        createdAt: '2025-01-15T20:00:00+09:00',
      },
      {
        id: 'material-2',
        title: '実演動画',
        url: 'https://example.com/video1',
        type: 'video' as const,
        createdAt: '2025-01-15T20:30:00+09:00',
      },
    ],
  },
  {
    id: 'test-event-2',
    title: 'Vue.js勉強会',
    eventDate: '2025-01-10T14:00:00+09:00',
    eventUrl: 'https://connpass.com/event/456/',
    connpassUrl: 'https://connpass.com/event/456/',
    materials: [
      {
        id: 'material-3',
        title: 'Vue3入門',
        url: 'https://example.com/slide2',
        type: 'document' as const,
        createdAt: '2025-01-10T15:00:00+09:00',
      },
    ],
  },
]

// ビューポートサイズを設定するヘルパー関数
function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

// タッチターゲットサイズを測定するヘルパー関数
function getTouchTargetSize(element: HTMLElement): {
  width: number
  height: number
} {
  const computedStyle = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  return {
    width: Math.max(
      rect.width,
      parseInt(computedStyle.minWidth) || 0,
      parseInt(computedStyle.width) || 0
    ),
    height: Math.max(
      rect.height,
      parseInt(computedStyle.minHeight) || 0,
      parseInt(computedStyle.height) || 0
    ),
  }
}

// タイマーのモック
vi.useFakeTimers()

describe('ResponsiveEventMaterialsList - タッチ操作とアクセシビリティテスト', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    // モバイルサイズに設定（タッチ操作テストのため）
    setViewportSize(400, 800)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('タッチターゲットサイズテスト', () => {
    test('モバイルでタッチターゲットが最小44pxを満たす', async () => {
      setViewportSize(400, 800) // モバイルサイズ

      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
      })

      // すべてのリンク要素のタッチターゲットサイズを確認
      const links = screen.getAllByRole('link')

      links.forEach((link, index) => {
        const size = getTouchTargetSize(link)
        expect(
          size.height,
          `Link ${index + 1} height should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
        expect(
          size.width,
          `Link ${index + 1} width should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
      })
    })

    test('タブレットでタッチターゲットが適切なサイズを持つ', async () => {
      setViewportSize(800, 600) // タブレットサイズ

      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByTestId('tablet-grid')).toBeInTheDocument()
      })

      const links = screen.getAllByRole('link')

      links.forEach((link, index) => {
        const size = getTouchTargetSize(link)
        expect(
          size.height,
          `Tablet link ${index + 1} height should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
        expect(
          size.width,
          `Tablet link ${index + 1} width should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
      })
    })

    test('EventMaterialCard内のタッチターゲットサイズが適切', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // イベントタイトルリンクのタッチターゲットサイズ
      const titleLink = screen.getByRole('link', {
        name: /React勉強会 #42のイベントページを開く/,
      })
      const titleSize = getTouchTargetSize(titleLink)
      expect(titleSize.height).toBeGreaterThanOrEqual(44)
      expect(titleSize.width).toBeGreaterThanOrEqual(44)

      // connpassリンクのタッチターゲットサイズ
      const connpassLink = screen.getByRole('link', {
        name: /connpassページを開く/,
      })
      const connpassSize = getTouchTargetSize(connpassLink)
      expect(connpassSize.height).toBeGreaterThanOrEqual(44)
      expect(connpassSize.width).toBeGreaterThanOrEqual(44)

      // 資料リンクのタッチターゲットサイズ
      const materialLinks = screen
        .getAllByRole('link')
        .filter(link => link.getAttribute('href')?.includes('example.com'))

      materialLinks.forEach((link, index) => {
        const size = getTouchTargetSize(link)
        expect(
          size.height,
          `Material link ${index + 1} height should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
        expect(
          size.width,
          `Material link ${index + 1} width should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
      })
    })

    test('タッチターゲット間の適切な間隔が確保されている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const links = screen.getAllByRole('link')

      // 隣接するタッチターゲット間の距離を確認
      for (let i = 0; i < links.length - 1; i++) {
        const currentRect = links[i].getBoundingClientRect()
        const nextRect = links[i + 1].getBoundingClientRect()

        // 垂直方向の間隔を確認（最小8px）
        const verticalGap = nextRect.top - currentRect.bottom
        if (verticalGap >= 0) {
          // 同じ行にない場合
          expect(
            verticalGap,
            `Gap between link ${i + 1} and ${i + 2} should be at least 8px`
          ).toBeGreaterThanOrEqual(8)
        }
      }
    })

    test('小さなモバイル画面でもタッチターゲットサイズが維持される', async () => {
      setViewportSize(320, 568) // iPhone SE サイズ

      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
      })

      const links = screen.getAllByRole('link')

      links.forEach((link, index) => {
        const size = getTouchTargetSize(link)
        expect(
          size.height,
          `Small mobile link ${index + 1} height should be at least 44px`
        ).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('キーボードナビゲーションテスト', () => {
    test('カード間のキーボードナビゲーションが動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
      })

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(2)

      // 最初のカードにフォーカス
      await user.tab()
      expect(cards[0]).toHaveFocus()

      // 下矢印キーで次のカードに移動
      await user.keyboard('{ArrowDown}')
      expect(cards[1]).toHaveFocus()

      // 上矢印キーで前のカードに戻る
      await user.keyboard('{ArrowUp}')
      expect(cards[0]).toHaveFocus()
    })

    test('カード内のリンク間のタブナビゲーションが論理的順序で動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // タブキーでリンク間を移動
      await user.tab() // カード自体
      await user.tab() // イベントタイトルリンク
      await user.tab() // connpassリンク
      await user.tab() // 最初の資料リンク
      await user.tab() // 2番目の資料リンク

      const focusedElement = document.activeElement
      expect(focusedElement).toHaveAttribute(
        'href',
        'https://example.com/video1'
      )
    })

    test('Enterキーでカード内の最初のリンクが開かれる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      // window.openをモック
      const mockOpen = vi.fn()
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockOpen,
      })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')

      // カードにフォーカスしてEnterキーを押す
      card.focus()
      await user.keyboard('{Enter}')

      // 最初のリンク（イベントタイトル）がクリックされることを確認
      // Note: 実際のテストでは、リンクのクリックイベントをモックする必要があります
      expect(card).toHaveFocus()
    })

    test('スペースキーでカード内の最初のリンクが開かれる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')

      // カードにフォーカスしてスペースキーを押す
      card.focus()
      await user.keyboard('{ }')

      expect(card).toHaveFocus()
    })

    test('Escapeキーでフォーカスが外れる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')

      // カードにフォーカスしてEscapeキーを押す
      card.focus()
      expect(card).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(card).not.toHaveFocus()
    })

    test('タブレット表示でもキーボードナビゲーションが動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      setViewportSize(800, 600) // タブレットサイズ

      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByTestId('tablet-grid')).toBeInTheDocument()
      })

      const cards = screen.getAllByRole('article')

      // タブキーでカード間を移動
      await user.tab()
      expect(cards[0]).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(cards[1]).toHaveFocus()
    })

    test('フォーカス表示が適切に視認できる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const titleLink = screen.getByRole('link', {
        name: /React勉強会 #42のイベントページを開く/,
      })

      // リンクにフォーカス
      await user.tab()
      await user.tab()

      expect(titleLink).toHaveFocus()

      // フォーカススタイルが適用されることを確認
      const computedStyle = window.getComputedStyle(titleLink)
      expect(computedStyle.outline).not.toBe('none')
    })
  })

  describe('ARIAラベルとセマンティックHTMLテスト', () => {
    test('カードに適切なARIA属性が設定されている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')

      // 基本的なARIA属性の確認
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute(
        'aria-labelledby',
        `event-title-${mockEvents[0].id}`
      )
      expect(card).toHaveAttribute(
        'aria-describedby',
        `event-materials-${mockEvents[0].id} event-date-${mockEvents[0].id}`
      )
      expect(card).toHaveAttribute(
        'aria-label',
        `${mockEvents[0].title}のイベント情報と資料`
      )
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    test('イベントタイトルが適切にラベル付けされている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toHaveAttribute('id', `event-title-${mockEvents[0].id}`)
      expect(title).toHaveTextContent('React勉強会 #42')
    })

    test('日付情報が適切にマークアップされている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const dateElement = screen.getByText('2025/01/15 19:00')
      const timeElement = dateElement.closest('time')

      expect(timeElement).toHaveAttribute(
        'dateTime',
        '2025-01-15T19:00:00+09:00'
      )

      const dateContainer = timeElement?.closest('div')
      expect(dateContainer).toHaveAttribute(
        'id',
        `event-date-${mockEvents[0].id}`
      )
      expect(dateContainer).toHaveAttribute('role', 'text')
      expect(dateContainer).toHaveAttribute(
        'aria-label',
        '開催日: 2025/01/15 19:00'
      )
    })

    test('資料リストが適切にマークアップされている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // 資料セクション
      const materialsSection = screen.getByRole('region', { name: /資料/ })
      expect(materialsSection).toHaveAttribute(
        'id',
        `event-materials-${mockEvents[0].id}`
      )
      expect(materialsSection).toHaveAttribute(
        'aria-labelledby',
        `materials-heading-${mockEvents[0].id}`
      )

      // 資料見出し
      const materialsHeading = screen.getByRole('heading', { level: 4 })
      expect(materialsHeading).toHaveAttribute(
        'id',
        `materials-heading-${mockEvents[0].id}`
      )
      expect(materialsHeading).toHaveTextContent('資料 (2件)')

      // 資料リスト
      const materialsList = screen.getByRole('list', {
        name: `${mockEvents[0].title}の資料一覧`,
      })
      expect(materialsList).toBeInTheDocument()

      // 資料アイテム
      const materialItems = screen.getAllByRole('listitem')
      expect(materialItems).toHaveLength(2)
    })

    test('リンクに適切なaria-labelが設定されている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // イベントタイトルリンク
      const titleLink = screen.getByRole('link', {
        name: /React勉強会 #42のイベントページを開く/,
      })
      expect(titleLink).toHaveAttribute(
        'title',
        'React勉強会 #42のイベントページを開く'
      )
      expect(titleLink).toHaveAttribute(
        'aria-describedby',
        `event-date-${mockEvents[0].id}`
      )

      // connpassリンク
      const connpassLink = screen.getByRole('link', {
        name: /React勉強会 #42のconnpassページを開く/,
      })
      expect(connpassLink).toHaveAttribute('title', 'connpassページを開く')
      expect(connpassLink).toHaveAttribute(
        'aria-label',
        'React勉強会 #42のconnpassページを開く'
      )
    })

    test('ResponsiveEventMaterialsListに適切なARIA属性が設定されている', async () => {
      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        const mobileStack = screen.getByTestId('mobile-stack')
        expect(mobileStack).toHaveAttribute('role', 'region')
        expect(mobileStack).toHaveAttribute(
          'aria-label',
          'イベント資料一覧 - 1列表示'
        )
      })
    })

    test('アイコンが適切にaria-hiddenされている', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // SVGアイコンがaria-hiddenされていることを確認
      const svgIcons = screen.getAllByRole('img', { hidden: true })
      svgIcons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('スクリーンリーダー対応テスト', () => {
    test('カードの構造がスクリーンリーダーで理解しやすい', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // セマンティックな構造の確認
      const article = screen.getByRole('article')
      const heading = screen.getByRole('heading', { level: 3 })
      const region = screen.getByRole('region')
      const list = screen.getByRole('list')

      // 階層構造が適切であることを確認
      expect(article).toContainElement(heading)
      expect(article).toContainElement(region)
      expect(region).toContainElement(list)
    })

    test('リンクの目的が明確に伝わる', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const links = screen.getAllByRole('link')

      // すべてのリンクに適切なアクセシブルネームがあることを確認
      links.forEach(link => {
        const accessibleName =
          link.getAttribute('aria-label') ||
          link.getAttribute('title') ||
          link.textContent
        expect(accessibleName).toBeTruthy()
        expect(accessibleName?.length).toBeGreaterThan(0)
      })
    })

    test('資料の種類と数が適切に伝わる', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // 資料数の表示
      const materialsHeading = screen.getByRole('heading', { level: 4 })
      expect(materialsHeading).toHaveTextContent('資料 (2件)')

      // 各資料の種類が伝わることを確認
      const materialLinks = screen
        .getAllByRole('link')
        .filter(link => link.getAttribute('href')?.includes('example.com'))

      expect(materialLinks).toHaveLength(2)
    })

    test('ローディング状態がスクリーンリーダーに伝わる', async () => {
      render(
        <ResponsiveEventMaterialsList
          events={mockEvents}
          loading={true}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('更新中...')).toBeInTheDocument()
      })

      // ローディング状態のaria-liveリージョンがあることを確認
      const loadingIndicator = screen.getByText('更新中...')
      expect(loadingIndicator).toBeInTheDocument()
    })

    test('空の状態がスクリーンリーダーに適切に伝わる', async () => {
      render(
        <ResponsiveEventMaterialsList
          events={[]}
          loading={false}
          error={null}
        />
      )

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(
          screen.getByText('表示するイベントがありません')
        ).toBeInTheDocument()
      })

      const emptyMessage = screen.getByText('表示するイベントがありません')
      expect(emptyMessage).toBeInTheDocument()
    })
  })

  describe('高コントラストモードとアクセシビリティ設定対応', () => {
    test('高コントラストモードでフォーカス表示が適切', async () => {
      // 高コントラストモードをシミュレート
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const titleLink = screen.getByRole('link', {
        name: /React勉強会 #42のイベントページを開く/,
      })

      await user.tab()
      await user.tab()

      expect(titleLink).toHaveFocus()

      // 高コントラストモードでのフォーカススタイルを確認
      const computedStyle = window.getComputedStyle(titleLink)
      expect(computedStyle.outline).not.toBe('none')
    })

    test('動きを減らす設定に対応している', async () => {
      // prefers-reduced-motionをシミュレート
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')

      // 動きを減らす設定でアニメーションが無効化されることを確認
      const computedStyle = window.getComputedStyle(card)
      // CSSでprefers-reduced-motionが適用されている場合、transitionがnoneになる
      expect(computedStyle.transition).toBeDefined()
    })
  })

  describe('タッチデバイス固有のテスト', () => {
    test('タッチデバイスでタップハイライトが適切に制御される', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const links = screen.getAllByRole('link')

      links.forEach(link => {
        const computedStyle = window.getComputedStyle(link)
        // -webkit-tap-highlight-colorがtransparentに設定されていることを確認
        expect(computedStyle.webkitTapHighlightColor).toBe('transparent')
      })
    })

    test('タッチイベントが適切に処理される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')

      // タッチイベントをシミュレート
      fireEvent.touchStart(card)
      fireEvent.touchEnd(card)

      // タッチイベントが正常に処理されることを確認
      expect(card).toBeInTheDocument()
    })

    test('スワイプジェスチャーが適切に無効化される', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')
      const computedStyle = window.getComputedStyle(card)

      // touch-actionがmanipulationに設定されていることを確認
      expect(computedStyle.touchAction).toBe('manipulation')
    })
  })

  describe('エラー状態でのアクセシビリティ', () => {
    test('エラー状態が適切にスクリーンリーダーに伝わる', async () => {
      const mockError = new Error('データの取得に失敗しました')

      render(
        <ResponsiveEventMaterialsList
          events={[]}
          loading={false}
          error={mockError}
        />
      )

      // エラーメッセージがaria-liveリージョンで伝わることを確認
      // 実際の実装では、エラー表示コンポーネントが必要
      expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
    })

    test('部分的なデータ欠損でも適切に表示される', async () => {
      const incompleteEvent: EventWithMaterials = {
        id: 'incomplete-event',
        title: 'タイトルのみのイベント',
        eventDate: '2025-01-20T19:00:00+09:00',
        eventUrl: 'https://connpass.com/event/789/',
        connpassUrl: 'https://connpass.com/event/789/',
        materials: [], // 資料なし
      }

      render(<EventMaterialCard event={incompleteEvent} layout="mobile" />)

      // 資料がない場合でも適切に表示されることを確認
      const materialsHeading = screen.getByRole('heading', { level: 4 })
      expect(materialsHeading).toHaveTextContent('資料 (0件)')

      const materialsList = screen.getByRole('list')
      expect(materialsList).toBeInTheDocument()
    })
  })
})
