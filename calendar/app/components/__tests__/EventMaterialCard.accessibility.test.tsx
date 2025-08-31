/**
 * EventMaterialCard アクセシビリティテスト
 * 要件6.1, 6.2, 6.3, 6.4の検証
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import EventMaterialCard from '../EventMaterialCard'
import { EventWithMaterials } from '../../types/eventMaterial'

// テスト用のモックデータ
const mockEvent: EventWithMaterials = {
  id: 'test-event-1',
  title: 'React勉強会 #42',
  eventDate: '2025-01-15',
  eventUrl: 'https://example.com/event/1',
  connpassUrl: 'https://connpass.com/event/1',
  materials: [
    {
      id: 'material-1',
      title: 'Reactの新機能について',
      url: 'https://example.com/slide1',
      type: 'slide',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      createdAt: '2025-01-15T00:00:00Z',
    },
    {
      id: 'material-2',
      title: '実演動画',
      url: 'https://example.com/video1',
      type: 'video',
      createdAt: '2025-01-15T00:00:00Z',
    },
  ],
}

describe('EventMaterialCard Accessibility', () => {
  describe('要件6.1: ARIAラベルとロールの適切な設定', () => {
    test('カードに適切なARIA属性が設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute(
        'aria-labelledby',
        `event-title-${mockEvent.id}`
      )
      expect(card).toHaveAttribute(
        'aria-describedby',
        `event-materials-${mockEvent.id} event-date-${mockEvent.id}`
      )
      expect(card).toHaveAttribute(
        'aria-label',
        `${mockEvent.title}のイベント情報と資料`
      )
    })

    test('日付セクションに適切なARIA属性が設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const dateSection = screen.getByRole('text')
      expect(dateSection).toHaveAttribute('aria-label', '開催日: 2025/01/15')
    })

    test('資料セクションに適切なARIA属性が設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const materialsRegion = screen.getByRole('region')
      expect(materialsRegion).toHaveAttribute(
        'aria-labelledby',
        `materials-heading-${mockEvent.id}`
      )

      const materialsList = screen.getByRole('list')
      expect(materialsList).toHaveAttribute(
        'aria-label',
        `${mockEvent.title}の資料一覧`
      )
    })

    test('各資料アイテムがリストアイテムとして認識される', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(mockEvent.materials.length)
    })
  })

  describe('要件6.2: キーボードナビゲーションの論理的なタブ順序', () => {
    test('カードがフォーカス可能である', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    test('Enterキーでカード内の最初のリンクが開かれる', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')
      const firstLink = screen.getAllByRole('link')[0]
      const clickSpy = vi.spyOn(firstLink, 'click').mockImplementation(() => {})

      card.focus()
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(clickSpy).toHaveBeenCalled()
    })

    test('スペースキーでカード内の最初のリンクが開かれる', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')
      const firstLink = screen.getAllByRole('link')[0]
      const clickSpy = vi.spyOn(firstLink, 'click').mockImplementation(() => {})

      card.focus()
      fireEvent.keyDown(card, { key: ' ' })

      expect(clickSpy).toHaveBeenCalled()
    })

    test('Escapeキーでフォーカスが外れる', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')
      const blurSpy = vi.spyOn(card, 'blur').mockImplementation(() => {})

      card.focus()
      fireEvent.keyDown(card, { key: 'Escape' })

      expect(blurSpy).toHaveBeenCalled()
    })

    test('すべてのリンクがキーボードでアクセス可能である', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).not.toHaveAttribute('tabIndex', '-1')
      })
    })
  })

  describe('要件6.3: スクリーンリーダー対応のセマンティックHTML構造', () => {
    test('見出し構造が適切である', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const eventTitle = screen.getByRole('heading', { level: 3 })
      expect(eventTitle).toHaveTextContent(mockEvent.title)

      const materialsHeading = screen.getByRole('heading', { level: 4 })
      expect(materialsHeading).toHaveTextContent('資料 (2件)')
    })

    test('時間要素が適切に設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const timeElement = screen.getByText('2025/01/15').closest('time')
      expect(timeElement).toHaveAttribute('dateTime', mockEvent.eventDate)
    })

    test('リンクに適切な説明が設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const eventLink = screen.getByTitle(
        `${mockEvent.title}のイベントページを開く`
      )
      expect(eventLink).toHaveAttribute(
        'title',
        `${mockEvent.title}のイベントページを開く`
      )

      const connpassLink = screen.getByLabelText(
        `${mockEvent.title}のconnpassページを開く`
      )
      expect(connpassLink).toHaveAttribute(
        'aria-label',
        `${mockEvent.title}のconnpassページを開く`
      )
    })

    test('装飾的なアイコンがaria-hiddenに設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      // SVG要素を直接取得してaria-hiddenをチェック
      const container = screen.getByRole('article')
      const svgElements = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(svgElements.length).toBeGreaterThan(0)
    })
  })

  describe('要件6.4: フォーカス表示の十分なコントラストと視認性', () => {
    test('カードにフォーカスリングが適用される', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass(
        'focus-within:ring-2',
        'focus-within:ring-blue-500',
        'focus-within:ring-offset-2'
      )
    })

    test('リンクに適切なフォーカススタイルが適用される', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('focus:outline-none')
        // フォーカスリングまたは他のフォーカス表示があることを確認
        expect(
          link.className.includes('focus:ring') ||
            link.className.includes('focusRing')
        ).toBe(true)
      })
    })
  })

  describe('アクセシビリティ全般', () => {
    test('基本的なアクセシビリティ要素が存在する', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      // 基本的なランドマークとロールが存在することを確認
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(
        mockEvent.materials.length
      )
    })

    test('タブレットレイアウトでも基本要素が保たれる', () => {
      render(<EventMaterialCard event={mockEvent} layout="tablet" />)

      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    test('資料がない場合でも基本構造が保たれる', () => {
      const eventWithoutMaterials = { ...mockEvent, materials: [] }
      render(
        <EventMaterialCard event={eventWithoutMaterials} layout="mobile" />
      )

      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('タッチターゲットサイズ', () => {
    test('すべてのタッチターゲットが最小44pxである', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        // style属性またはCSSクラスでminHeightが設定されていることを確認
        const hasMinHeight =
          link.style.minHeight === '44px' ||
          link.className.includes('min-h-[44px]') ||
          link.className.includes('touchTarget')
        expect(hasMinHeight).toBe(true)
      })
    })
  })
})
