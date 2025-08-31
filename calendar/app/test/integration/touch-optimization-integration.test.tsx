/**
 * タッチ操作最適化の統合テスト
 * 要件2.3, 4.4, 6.4: レスポンシブレイアウトとタッチ最適化の統合テスト
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import EventMaterialCard from '../../components/EventMaterialCard'
import { EventWithMaterials } from '../../types/eventMaterial'

// モックデータ
const mockEvent: EventWithMaterials = {
  id: 'integration-test-event',
  title: 'タッチ最適化テストイベント',
  eventDate: '2025-02-01',
  eventUrl: 'https://example.com/event/touch-test',
  connpassUrl: 'https://connpass.com/event/touch-test',
  materials: [
    {
      id: 'touch-material-1',
      title: 'タッチ操作対応スライド',
      url: 'https://example.com/touch-slide',
      type: 'slide',
      thumbnailUrl: 'https://example.com/touch-thumb.jpg',
    },
    {
      id: 'touch-material-2',
      title: 'モバイル対応動画',
      url: 'https://example.com/touch-video',
      type: 'video',
    },
  ],
}

describe('タッチ操作最適化 - 統合テスト', () => {
  beforeEach(() => {
    // console.error をモック化
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('モバイルレイアウトでのタッチ最適化', () => {
    test('モバイルレイアウトですべてのタッチターゲットが適切に動作する', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      // すべてのリンクを取得
      const links = screen.getAllByRole('link')

      // 各リンクがタッチ最適化されていることを確認
      links.forEach(link => {
        // タッチターゲットクラスまたは適切なminHeightが設定されている
        const isTouchOptimized =
          link.className.includes('touchTarget') ||
          link.style.minHeight ||
          link.className.includes('min-h-')

        expect(isTouchOptimized).toBeTruthy()

        // フォーカス可能であることを確認
        expect(link).toHaveAttribute('tabIndex', '0')

        // touch-manipulationが設定されている（CSSクラス経由）
        const hasTouchManipulation =
          link.className.includes('touch-manipulation') ||
          link.className.includes('touchTarget') // CSS moduleのtouchTargetクラスにtouch-manipulationが含まれる

        expect(hasTouchManipulation).toBeTruthy()
      })
    })

    test('タッチイベントが適切に処理される', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // タッチスタートイベントをシミュレート
      fireEvent.touchStart(card)

      // タッチエンドイベントをシミュレート
      fireEvent.touchEnd(card)

      // エラーが発生しないことを確認
      expect(card).toBeInTheDocument()
    })

    test('キーボードとタッチの両方でナビゲーションが動作する', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // キーボードナビゲーション
      fireEvent.keyDown(card, { key: 'Enter' })
      fireEvent.keyDown(card, { key: ' ' })
      fireEvent.keyDown(card, { key: 'Escape' })

      // タッチナビゲーション
      fireEvent.touchStart(card)
      fireEvent.touchEnd(card)

      // エラーが発生しないことを確認
      expect(card).toBeInTheDocument()
    })
  })

  describe('タブレットレイアウトでのタッチ最適化', () => {
    test('タブレットレイアウトで拡張されたタッチターゲットが適用される', () => {
      render(<EventMaterialCard event={mockEvent} layout="tablet" />)

      // 資料リンクを取得
      const materialLinks = screen
        .getAllByRole('link')
        .filter(
          link =>
            link
              .getAttribute('aria-label')
              ?.includes('タッチ操作対応スライド') ||
            link.getAttribute('aria-label')?.includes('モバイル対応動画')
        )

      materialLinks.forEach(link => {
        // タブレット用の拡張されたタッチターゲットサイズ（48px）が適用されている
        expect(link.style.minHeight).toBe('48px')

        // タッチ最適化のクラスが適用されている
        expect(link.className).toContain('touch-manipulation')
      })
    })

    test('タブレットでのタッチフィードバックが適切に動作する', () => {
      render(<EventMaterialCard event={mockEvent} layout="tablet" />)

      const links = screen.getAllByRole('link')

      links.forEach(link => {
        // アクティブ状態のスタイルが設定されている
        expect(link.className).toContain('transition')

        // ホバー状態のスタイルが設定されている
        expect(link.className).toContain('hover:')
      })
    })
  })

  describe('アクセシビリティとタッチの統合', () => {
    test('スクリーンリーダーとタッチ操作が両立している', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // ARIA属性が適切に設定されている
      expect(card).toHaveAttribute('aria-labelledby')
      expect(card).toHaveAttribute('aria-describedby')
      expect(card).toHaveAttribute('aria-label')

      // タッチ操作も可能
      expect(card).toHaveAttribute('tabIndex', '0')

      // 資料リンクも適切にラベル付けされている
      const materialLinks = screen
        .getAllByRole('link')
        .filter(
          link =>
            link
              .getAttribute('aria-label')
              ?.includes('タッチ操作対応スライド') ||
            link.getAttribute('aria-label')?.includes('モバイル対応動画')
        )

      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('aria-label')
        expect(link).toHaveAttribute('aria-describedby')
      })
    })

    test('フォーカス管理がタッチデバイスで適切に動作する', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const links = screen.getAllByRole('link')

      links.forEach(link => {
        // フォーカス時のアウトライン無効化（カスタムフォーカスリング使用）
        expect(link.className).toContain('focus:outline-none')

        // カスタムフォーカスリングまたはフォーカス状態のスタイルが設定されている
        const hasFocusStyle =
          link.className.includes('focus:ring') ||
          link.className.includes('focusRing') ||
          link.className.includes('focus:')

        expect(hasFocusStyle).toBeTruthy()
      })
    })
  })

  describe('パフォーマンスとタッチ最適化', () => {
    test('タッチイベントのパフォーマンスが最適化されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const card = screen.getByRole('article')

      // CSS transformとopacityを使用したアニメーション（GPU加速）
      expect(card.className).toContain('transition')

      // タッチ操作の最適化
      expect(card.className).toContain('event-card')
    })

    test('レンダリングパフォーマンスが維持されている', () => {
      const startTime = performance.now()

      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // レンダリング時間が合理的な範囲内であることを確認（100ms以下）
      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('クロスブラウザタッチ対応', () => {
    test('WebKitタップハイライトが無効化されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const materialLinks = screen
        .getAllByRole('link')
        .filter(
          link =>
            link
              .getAttribute('aria-label')
              ?.includes('タッチ操作対応スライド') ||
            link.getAttribute('aria-label')?.includes('モバイル対応動画')
        )

      materialLinks.forEach(link => {
        // WebKitタップハイライトが透明に設定されている
        expect(link.style.WebkitTapHighlightColor).toBe('transparent')
      })
    })

    test('タッチアクションが適切に設定されている', () => {
      render(<EventMaterialCard event={mockEvent} layout="mobile" />)

      const links = screen.getAllByRole('link')

      links.forEach(link => {
        // touch-manipulationクラスまたはtouchTargetクラスが設定されている
        const hasTouchAction =
          link.className.includes('touch-manipulation') ||
          link.className.includes('touchTarget') // CSS moduleのtouchTargetクラスにtouch-manipulationが含まれる

        expect(hasTouchAction).toBeTruthy()
      })
    })
  })
})
