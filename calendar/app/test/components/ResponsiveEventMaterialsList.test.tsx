import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '../test-utils'
import ResponsiveEventMaterialsList from '../../components/ResponsiveEventMaterialsList'
import { EventWithMaterials } from '../../types/eventMaterial'

/**
 * ResponsiveEventMaterialsListコンポーネントの単体テスト
 */
describe('ResponsiveEventMaterialsList', () => {
  const mockEvents: EventWithMaterials[] = [
    {
      id: 'event-1',
      title: 'テストイベント1',
      eventDate: '2024-01-15T19:00:00+09:00',
      eventUrl: 'https://connpass.com/event/123/',
      connpassUrl: 'https://connpass.com/event/123/',
      materials: [
        {
          id: 'material-1',
          title: 'テスト資料1',
          url: 'https://example.com/slide1',
          type: 'slide',
          createdAt: '2024-01-15T20:00:00+09:00',
        },
      ],
    },
  ]

  beforeEach(() => {
    // window.innerWidthをモック
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  it('should render without crashing', () => {
    expect(() => {
      render(<ResponsiveEventMaterialsList events={mockEvents} />)
    }).not.toThrow()
  })

  it('should display events correctly', () => {
    render(<ResponsiveEventMaterialsList events={mockEvents} />)

    expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    expect(screen.getByText('テスト資料1')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<ResponsiveEventMaterialsList events={[]} loading={true} />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('should show error state', () => {
    render(<ResponsiveEventMaterialsList events={[]} error="テストエラー" />)

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByText('テストエラー')).toBeInTheDocument()
  })

  it('should show empty state', () => {
    render(<ResponsiveEventMaterialsList events={[]} />)

    expect(screen.getByText('表示するイベントがありません')).toBeInTheDocument()
  })

  it('should switch to mobile layout on small screens', () => {
    // モバイルサイズに設定
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    })

    render(<ResponsiveEventMaterialsList events={mockEvents} />)

    // モバイルレイアウトが適用されることを確認
    expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
  })

  it('should switch to tablet layout on medium screens', () => {
    // タブレットサイズに設定
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    render(<ResponsiveEventMaterialsList events={mockEvents} />)

    // タブレットレイアウトが適用されることを確認
    expect(screen.getByTestId('tablet-grid')).toBeInTheDocument()
  })
})
