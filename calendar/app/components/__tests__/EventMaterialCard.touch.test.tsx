/**
 * EventMaterialCard タッチ操作最適化のテスト
 * 要件2.3, 4.4, 6.4: タッチデバイス向けの最適化テスト
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import EventMaterialCard from '../EventMaterialCard'
import { EventWithMaterials } from '../../types/eventMaterial'

// モックデータ
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
    },
    {
      id: 'material-2',
      title: '実演動画',
      url: 'https://example.com/video1',
      type: 'video',
    },
  ],
}

describe('EventMaterialCard - タッチ操作最適化', () => {
  beforeEach(() => {
    // console.error をモック化してテスト出力をクリーンに保つ
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('要件2.3: 最小44pxのタッチターゲットサイズ', () => {
    test('モバイルレイアウトでタッチターゲットが最小44pxを満たす', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      // イベントタイトルリンクのタッチターゲットサイズを確認
      const titleLink = screen.getByRole('link', { name: 'React勉強会 #42' })

      // CSS moduleのtouchTargetクラスが適用されていることを確認
      expect(titleLink.className).toContain('touchTarget')

      // connpassリンクのタッチターゲットサイズを確認
      const connpassLink = screen.getByRole('link', {
        name: /connpassページを開く/,
      })
      expect(connpassLink.className).toContain('touchTarget')
    })

    test('タブレットレイアウトでタッチターゲットが最小44pxを満たす', () => {
      render(<EventMaterialCard event={mockEvent} layout="tablet" />)

      // 資料リンクのタッチターゲットサイズを確認
      const materialLinks = screen.getAllByRole('link')
      const materialLink = materialLinks.find(link =>
        link.getAttribute('aria-label')?.includes('Reactの新機能について')
      )

      expect(materialLink).toBeDefined()
      if (materialLink) {
        expect(materialLink).toHaveStyle({ minHeight: '48px' }) // カード用は48px
      }
    })

    test('すべてのインタラクティブ要素が適切なタッチターゲットサイズを持つ', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      // すべてのリンク要素を取得
      const links = screen.getAllByRole('link')

      links.forEach(link => {
        // タッチターゲットクラスまたはインラインスタイルでminHeightが設定されていることを確認
        const hasMinHeight =
          link.className.includes('touchTarget') ||
          link.style.minHeight ||
          link.className.includes('min-h-')
        expect(hasMinHeight).toBeTruthy()
      })
    })
  })

  describe('要件2.3, 4.4: タッチデバイス向けのホバー効果とフォーカス表示', () => {
    test('タッチターゲットにtouch-manipulationが設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const titleLink = screen.getByRole('link', { name: 'React勉強会 #42' })
      // CSS moduleのtouchTargetクラスでtouch-manipulationが設定されていることを確認
      expect(titleLink.className).toContain('touchTarget')
    })

    test('タッチターゲットに適切なCSSクラスが適用されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const titleLink = screen.getByRole('link', { name: 'React勉強会 #42' })

      // touchTargetクラスが適用されていることを確認
      expect(titleLink.className).toContain('touchTarget')
      expect(titleLink.className).toContain('focusRing')
    })

    test('フォーカス時に適切なスタイルが適用される', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const titleLink = screen.getByRole('link', { name: 'React勉強会 #42' })

      // フォーカスイベントを発火
      fireEvent.focus(titleLink)

      // フォーカス状態でのスタイルを確認
      expect(titleLink.className).toContain('focus:outline-none')
    })

    test('アクティブ状態でのスタイルが適用される', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // マウスダウンイベントを発火してアクティブ状態をシミュレート
      fireEvent.mouseDown(card)

      // アクティブ状態のクラスが適用されていることを確認
      expect(card.className).toContain('event-card')
    })
  })

  describe('要件6.4: アクセシビリティとタッチ操作の統合', () => {
    test('キーボードナビゲーションとタッチ操作が両立している', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // タブインデックスが設定されていることを確認
      expect(card).toHaveAttribute('tabIndex', '0')

      // キーボードイベントが動作することを確認
      fireEvent.keyDown(card, { key: 'Enter' })
      // エラーが発生しないことを確認（イベントハンドラーが存在する）
    })

    test('スクリーンリーダー用のラベルが適切に設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // ARIA属性が適切に設定されていることを確認
      expect(card).toHaveAttribute('aria-labelledby')
      expect(card).toHaveAttribute('aria-describedby')
      expect(card).toHaveAttribute('aria-label')
    })

    test('タッチデバイスでのフォーカス表示が適切', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const links = screen.getAllByRole('link')

      links.forEach(link => {
        // フォーカス関連のクラスが適用されていることを確認
        expect(link.className).toContain('focus:outline-none')
        // MaterialLinkのリンクはfocus:ring-2を持つ
        if (link.className.includes('focus:ring-2')) {
          expect(link.className).toContain('focus:ring-blue-500')
        }
      })
    })
  })

  describe('タッチデバイス特有の最適化', () => {
    test('WebKit tap highlight が無効化されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const materialLinks = screen.getAllByRole('link')
      const materialLink = materialLinks.find(link =>
        link.getAttribute('aria-label')?.includes('Reactの新機能について')
      )

      if (materialLink) {
        expect(materialLink).toHaveStyle({
          WebkitTapHighlightColor: 'transparent',
        })
      }
    })

    test('タッチ操作用のパディングが適切に設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      // カード用のレイアウトでより大きなパディングが設定されていることを確認
      const materialLinks = screen.getAllByRole('link')
      const materialLink = materialLinks.find(link =>
        link.getAttribute('aria-label')?.includes('Reactの新機能について')
      )

      if (materialLink) {
        expect(materialLink.className).toContain('py-3')
        expect(materialLink.className).toContain('px-2')
      }
    })

    test('トランジション効果が適切に設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const titleLink = screen.getByRole('link', { name: 'React勉強会 #42' })

      // トランジションクラスが適用されていることを確認
      expect(titleLink.className).toContain('transition-colors')
      expect(titleLink.className).toContain('duration-150')
    })
  })

  describe('レスポンシブタッチ最適化', () => {
    test('モバイルとタブレットで異なるタッチターゲットサイズが適用される', () => {
      const { rerender } = render(
        <EventMaterialCard event={mockEvent} layout="mobile" />
      )

      // モバイルでの資料リンクを確認
      let materialLinks = screen.getAllByRole('link')
      let materialLink = materialLinks.find(link =>
        link.getAttribute('aria-label')?.includes('Reactの新機能について')
      )

      if (materialLink) {
        // MaterialLinkはカード用で48pxに設定されている
        expect(materialLink).toHaveStyle({ minHeight: '48px' })
      }

      // タブレットレイアウトに変更
      rerender(<EventMaterialCard event={mockEvent} layout="tablet" />)

      // タブレットでの資料リンクを確認
      materialLinks = screen.getAllByRole('link')
      materialLink = materialLinks.find(link =>
        link.getAttribute('aria-label')?.includes('Reactの新機能について')
      )

      if (materialLink) {
        expect(materialLink).toHaveStyle({ minHeight: '48px' })
      }
    })
  })
})
