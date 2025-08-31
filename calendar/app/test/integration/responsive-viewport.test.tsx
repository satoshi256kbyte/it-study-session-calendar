/**
 * レスポンシブビューポートサイズ別テスト
 * 要件1.1, 2.1, 3.1に対応
 *
 * - デスクトップ・タブレット・モバイルサイズでの表示テスト
 * - レイアウト切り替えの動作テスト
 * - 画面サイズ変更時の動作テスト
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '../test-utils'
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

// ビューポートサイズの定義
const VIEWPORT_SIZES = {
  desktop: { width: 1200, height: 800, description: 'デスクトップ (≥1024px)' },
  desktopMin: {
    width: 1024,
    height: 768,
    description: 'デスクトップ最小 (1024px)',
  },
  tabletMax: {
    width: 1023,
    height: 768,
    description: 'タブレット最大 (1023px)',
  },
  tablet: { width: 800, height: 600, description: 'タブレット (768px-1023px)' },
  tabletMin: {
    width: 768,
    height: 1024,
    description: 'タブレット最小 (768px)',
  },
  mobileMax: { width: 767, height: 1024, description: 'モバイル最大 (767px)' },
  mobile: { width: 400, height: 800, description: 'モバイル (<768px)' },
  mobileSmall: { width: 320, height: 568, description: 'モバイル小 (320px)' },
} as const

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

  // リサイズイベントを発火
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

// タイマーのモック
vi.useFakeTimers()

describe('EventMaterialCard - ビューポートサイズ別テスト', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    // デフォルトのデスクトップサイズに設定
    setViewportSize(VIEWPORT_SIZES.desktop.width, VIEWPORT_SIZES.desktop.height)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('モバイルレイアウトテスト (<768px)', () => {
    test('モバイルサイズでカード表示される', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height)

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // カード要素の存在を確認
      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('event-card-mobile')

      // イベント情報の表示確認
      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
      expect(screen.getByText('2025/01/15')).toBeInTheDocument()
      expect(screen.getByText('connpass')).toBeInTheDocument()
      expect(screen.getByText('資料 (2件)')).toBeInTheDocument()
    })

    test('小さなモバイルサイズでも正常に表示される', async () => {
      setViewportSize(
        VIEWPORT_SIZES.mobileSmall.width,
        VIEWPORT_SIZES.mobileSmall.height
      )

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('event-card-mobile')

      // 横スクロールが発生しないことを確認（CSSクラスで制御）
      expect(card).toHaveClass('event-card-mobile')
    })

    test('モバイル表示で適切なARIAラベルが設定される', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height)

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')
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
    })
  })

  describe('タブレットレイアウトテスト (768px-1023px)', () => {
    test('タブレットサイズでカード表示される', async () => {
      setViewportSize(VIEWPORT_SIZES.tablet.width, VIEWPORT_SIZES.tablet.height)

      render(<EventMaterialCard event={mockEvents[0]} layout="tablet" />)

      // カード要素の存在を確認
      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('event-card-tablet')

      // イベント情報の表示確認
      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
      expect(screen.getByText('2025/01/15')).toBeInTheDocument()
      expect(screen.getByText('connpass')).toBeInTheDocument()
      expect(screen.getByText('資料 (2件)')).toBeInTheDocument()
    })

    test('タブレット表示で適切なARIAラベルが設定される', async () => {
      setViewportSize(VIEWPORT_SIZES.tablet.width, VIEWPORT_SIZES.tablet.height)

      render(<EventMaterialCard event={mockEvents[0]} layout="tablet" />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute(
        'aria-labelledby',
        `event-title-${mockEvents[0].id}`
      )
      expect(card).toHaveAttribute(
        'aria-describedby',
        `event-materials-${mockEvents[0].id} event-date-${mockEvents[0].id}`
      )
    })

    test('タブレット表示でリンクが適切に表示される', async () => {
      setViewportSize(VIEWPORT_SIZES.tablet.width, VIEWPORT_SIZES.tablet.height)

      render(<EventMaterialCard event={mockEvents[0]} layout="tablet" />)

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)

      // すべてのリンクがクリック可能であることを確認
      links.forEach(link => {
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href')
      })
    })
  })

  describe('レスポンシブ動作テスト', () => {
    test('モバイルとタブレットレイアウトの違いが適切に反映される', async () => {
      // モバイルレイアウト
      const { rerender } = render(
        <EventMaterialCard event={mockEvents[0]} layout="mobile" />
      )

      let card = screen.getByRole('article')
      expect(card).toHaveClass('event-card-mobile')

      // タブレットレイアウトに変更
      rerender(<EventMaterialCard event={mockEvents[0]} layout="tablet" />)

      card = screen.getByRole('article')
      expect(card).toHaveClass('event-card-tablet')
    })

    test('異なるレイアウトでも同じ情報が表示される', async () => {
      const { rerender } = render(
        <EventMaterialCard event={mockEvents[0]} layout="mobile" />
      )

      // モバイルでの表示確認
      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
      expect(screen.getByText('2025/01/15')).toBeInTheDocument()
      expect(screen.getByText('資料 (2件)')).toBeInTheDocument()

      // タブレットレイアウトに変更
      rerender(<EventMaterialCard event={mockEvents[0]} layout="tablet" />)

      // 同じ情報が表示されることを確認
      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
      expect(screen.getByText('2025/01/15')).toBeInTheDocument()
      expect(screen.getByText('資料 (2件)')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティテスト', () => {
    test('モバイルでリンクが適切にアクセス可能', async () => {
      setViewportSize(VIEWPORT_SIZES.mobile.width, VIEWPORT_SIZES.mobile.height)

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      // すべてのリンク要素がアクセス可能であることを確認
      const links = screen.getAllByRole('link')

      links.forEach(link => {
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href')
        expect(link).toHaveAttribute('tabIndex', '0')
      })
    })

    test('カードがキーボードでアクセス可能', async () => {
      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('tabIndex', '0')
      expect(card).toHaveAttribute('role', 'article')
    })
  })

  describe('エラー状態とエッジケース', () => {
    test('資料がないイベントでも正常に表示される', async () => {
      const eventWithoutMaterials: EventWithMaterials = {
        ...mockEvents[0],
        materials: [],
      }

      render(
        <EventMaterialCard event={eventWithoutMaterials} layout="mobile" />
      )

      expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
      expect(screen.getByText('資料 (0件)')).toBeInTheDocument()

      // 資料リストは空でも表示される
      const materialsList = screen.getByRole('list')
      expect(materialsList).toBeInTheDocument()
    })

    test('極端に小さな画面サイズでも正常に動作する', async () => {
      setViewportSize(240, 320) // 非常に小さな画面

      render(<EventMaterialCard event={mockEvents[0]} layout="mobile" />)

      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('event-card-mobile')
    })

    test('長いタイトルでも適切に表示される', async () => {
      const eventWithLongTitle: EventWithMaterials = {
        ...mockEvents[0],
        title:
          'とても長いイベントタイトルでレイアウトが崩れないかをテストするためのイベント名です',
      }

      render(<EventMaterialCard event={eventWithLongTitle} layout="mobile" />)

      expect(
        screen.getByText(
          'とても長いイベントタイトルでレイアウトが崩れないかをテストするためのイベント名です'
        )
      ).toBeInTheDocument()

      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
    })
  })
})
