import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import EventMaterialCard from '../EventMaterialCard'
import { EventWithMaterials } from '../../types/eventMaterial'

// モックデータ
const mockEvent: EventWithMaterials = {
  id: 'test-event-1',
  title: 'React勉強会 #42',
  eventDate: '2025-01-15T19:00:00+09:00',
  eventUrl: 'https://example.com/event/1',
  connpassUrl: 'https://connpass.com/event/123456/',
  materials: [
    {
      id: 'material-1',
      title: 'Reactの新機能について',
      url: 'https://example.com/slide1',
      type: 'slide',
      createdAt: '2025-01-15T20:00:00+09:00',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
    },
    {
      id: 'material-2',
      title: '実演動画',
      url: 'https://example.com/video1',
      type: 'video',
      createdAt: '2025-01-15T20:30:00+09:00',
    },
  ],
}

describe('EventMaterialCard', () => {
  test('モバイルレイアウトで正しく表示される', () => {
    render(<EventMaterialCard event={mockEvent} layout="mobile" />)

    // イベントタイトルが表示される
    expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()

    // 日付が正しい形式で表示される
    expect(screen.getByText('2025/01/15')).toBeInTheDocument()

    // connpassリンクが表示される
    expect(screen.getByText('connpass')).toBeInTheDocument()

    // 資料数が表示される
    expect(screen.getByText('資料 (2件)')).toBeInTheDocument()

    // 各資料が表示される
    expect(screen.getByText('Reactの新機能について')).toBeInTheDocument()
    expect(screen.getByText('実演動画')).toBeInTheDocument()
  })

  test('タブレットレイアウトで正しく表示される', () => {
    render(<EventMaterialCard event={mockEvent} layout="tablet" />)

    // 基本的な要素が表示される
    expect(screen.getByText('React勉強会 #42')).toBeInTheDocument()
    expect(screen.getByText('2025/01/15')).toBeInTheDocument()
  })

  test('アクセシビリティ属性が正しく設定される', () => {
    render(<EventMaterialCard event={mockEvent} layout="mobile" />)

    // article要素にrole属性が設定される
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute(
      'aria-labelledby',
      'event-title-test-event-1'
    )
    expect(article).toHaveAttribute('aria-describedby')

    // 見出し要素が正しく設定される
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveAttribute('id', 'event-title-test-event-1')

    // リスト要素が正しく設定される
    const list = screen.getByRole('list')
    expect(list).toHaveAttribute('aria-label', 'React勉強会 #42の資料一覧')

    // リストアイテムが正しく設定される
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(2)
  })

  test('キーボードナビゲーションが動作する', () => {
    render(<EventMaterialCard event={mockEvent} layout="mobile" />)

    const article = screen.getByRole('article')
    const firstLink = screen.getAllByRole('link')[0]

    // Enterキーでリンクがクリックされる
    const clickSpy = vi.spyOn(firstLink, 'click').mockImplementation(() => {})
    fireEvent.keyDown(article, { key: 'Enter' })
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
  })

  test('タッチターゲットサイズが適切に設定される', () => {
    render(<EventMaterialCard event={mockEvent} layout="mobile" />)

    // イベントタイトルリンクとconnpassリンクをチェック
    const eventTitleLink = screen.getByTitle(
      'React勉強会 #42のイベントページを開く'
    )
    const connpassLink = screen.getByTitle('connpassページを開く')

    // CSS Moduleのクラス名が適用されていることを確認
    expect(eventTitleLink.className).toContain('touchTarget')
    expect(connpassLink.className).toContain('touchTarget')

    // 資料リンクは最小高さが設定されていることを確認
    const materialLinks = screen
      .getAllByRole('link')
      .filter(
        link =>
          link.getAttribute('title')?.includes('を開く') &&
          !link.getAttribute('title')?.includes('イベントページ') &&
          !link.getAttribute('title')?.includes('connpass')
      )

    materialLinks.forEach(link => {
      // MaterialLinkコンポーネントでmin-h-[44px]が設定されている
      expect(link.className).toContain('min-h-[44px]')
    })
  })

  test('外部リンクが正しく設定される', () => {
    render(<EventMaterialCard event={mockEvent} layout="mobile" />)

    const eventLink = screen.getByTitle('React勉強会 #42のイベントページを開く')
    expect(eventLink).toHaveAttribute('href', 'https://example.com/event/1')
    expect(eventLink).toHaveAttribute('target', '_blank')
    expect(eventLink).toHaveAttribute('rel', 'noopener noreferrer')

    const connpassLink = screen.getByTitle('connpassページを開く')
    expect(connpassLink).toHaveAttribute(
      'href',
      'https://connpass.com/event/123456/'
    )
    expect(connpassLink).toHaveAttribute('target', '_blank')
    expect(connpassLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
