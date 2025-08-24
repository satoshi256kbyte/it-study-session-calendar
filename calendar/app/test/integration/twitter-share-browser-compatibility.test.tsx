/**
 * Twitter Share Button Browser Compatibility Integration Tests
 * 要件2.2, 2.3: ブラウザ互換性とモバイル対応テスト
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import TwitterShareButton from '../../components/TwitterShareButton'

// モックの設定
const mockWindowOpen = vi.fn()

// グローバルオブジェクトのモック
const originalWindow = global.window

describe('TwitterShareButton Browser Compatibility Tests', () => {
  const defaultProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会 #1\n01/28 Python入門セミナー\n\n詳細はこちら: https://example.com/calendar',
    calendarUrl: 'https://example.com/calendar',
  }

  beforeEach(() => {
    // window.openのモック
    Object.defineProperty(global.window, 'open', {
      value: mockWindowOpen,
      writable: true,
    })

    // alertのモック
    global.alert = vi.fn()

    // console.warnのモック
    global.console.warn = vi.fn()
    global.console.error = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    global.window = originalWindow
  })

  describe('Modern Browser Support', () => {
    test('should open Twitter Web Intent in modern browsers', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet?text='),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )

      // URLエンコーディングの確認
      const calledUrl = mockWindowOpen.mock.calls[0][0]
      expect(calledUrl).toContain(encodeURIComponent('📅 今月の広島IT勉強会'))
      expect(calledUrl).toContain(encodeURIComponent('React勉強会 #1'))
    })

    test('should handle popup blocker gracefully', async () => {
      mockWindowOpen.mockReturnValue(null) // ポップアップブロック

      // navigator.clipboardのモック
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // ポップアップブロック時の警告が出ることを確認
      await vi.waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'ポップアップがブロックされました。クリップボードにコピーします。'
        )
      })
    })
  })

  describe('Mobile Device Support', () => {
    test('should handle touch events properly', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // タッチイベントをシミュレート
      fireEvent.touchStart(shareButton)
      fireEvent.touchEnd(shareButton)
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalled()
    })

    test('should display mobile-optimized text', () => {
      render(<TwitterShareButton {...defaultProps} />)

      // モバイル用の短縮テキストが表示されることを確認
      const textElements = screen.getAllByText('共有')
      const mobileText = textElements.find(el =>
        el.classList.contains('sm:hidden')
      )
      const desktopText = textElements.find(
        el =>
          el.classList.contains('hidden') && el.classList.contains('sm:inline')
      )

      expect(mobileText).toBeInTheDocument()
      expect(desktopText).toBeInTheDocument()
    })

    test('should have touch-friendly button size', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveClass('min-h-[44px]') // 44px minimum for touch targets
    })
  })

  describe('Accessibility Support', () => {
    test('should support keyboard navigation', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Enter key activation
      fireEvent.keyDown(shareButton, { key: 'Enter' })
      expect(mockWindowOpen).toHaveBeenCalled()
    })

    test('should support space key activation', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      fireEvent.keyDown(shareButton, { key: ' ' })
      expect(mockWindowOpen).toHaveBeenCalled()
    })

    test('should handle escape key properly', async () => {
      const mockBlur = vi.fn()

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      shareButton.blur = mockBlur

      fireEvent.keyDown(shareButton, { key: 'Escape' })
      expect(mockBlur).toHaveBeenCalled()
    })

    test('should have proper ARIA attributes', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で勉強会情報を共有する'
      )
      expect(shareButton).toHaveAttribute(
        'aria-describedby',
        'twitter-share-help'
      )
      expect(shareButton).toHaveAttribute('tabIndex', '0')
    })

    test('should update ARIA attributes when disabled', () => {
      render(<TwitterShareButton {...defaultProps} disabled />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveAttribute('aria-disabled', 'true')
      expect(shareButton).toHaveAttribute(
        'aria-describedby',
        'twitter-share-disabled-help'
      )
      expect(shareButton).toHaveAttribute('tabIndex', '-1')
    })

    test('should update ARIA attributes when loading', () => {
      render(<TwitterShareButton {...defaultProps} isLoading />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveAttribute('aria-busy', 'true')
      expect(shareButton).toHaveAttribute('aria-live', 'polite')
      expect(shareButton).toHaveAttribute(
        'aria-describedby',
        'twitter-share-loading-help'
      )
    })
  })

  describe('Error Handling', () => {
    test('should show error state UI', () => {
      render(<TwitterShareButton {...defaultProps} hasError />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveClass(
        'border-red-300',
        'text-red-700',
        'bg-red-50'
      )
      expect(shareButton).toHaveAttribute('aria-invalid', 'true')
      expect(shareButton).toHaveAttribute(
        'aria-describedby',
        'twitter-share-error-help'
      )

      // エラー状態のテキストを確認
      const errorTexts = screen.getAllByText('再試行')
      expect(errorTexts.length).toBeGreaterThan(0)
    })
  })

  describe('URL Generation', () => {
    test('should properly encode special characters', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      const specialCharText =
        'Test with special chars: #hashtag @mention & symbols 日本語'

      render(
        <TwitterShareButton
          shareText={specialCharText}
          calendarUrl={defaultProps.calendarUrl}
        />
      )

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      const calledUrl = mockWindowOpen.mock.calls[0][0]
      expect(calledUrl).toContain(encodeURIComponent(specialCharText))
      expect(calledUrl).not.toContain('#hashtag') // Should be encoded
      expect(calledUrl).not.toContain('@mention') // Should be encoded
      expect(calledUrl).not.toContain('日本語') // Should be encoded
    })

    test('should handle very long text gracefully', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      const longText = 'A'.repeat(1000) // Very long text

      render(
        <TwitterShareButton
          shareText={longText}
          calendarUrl={defaultProps.calendarUrl}
        />
      )

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalled()
      const calledUrl = mockWindowOpen.mock.calls[0][0]
      expect(calledUrl).toContain('https://twitter.com/intent/tweet')
    })
  })

  describe('Performance', () => {
    test('should not cause memory leaks with multiple renders', () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      // Multiple re-renders to test for memory leaks
      for (let i = 0; i < 10; i++) {
        rerender(
          <TwitterShareButton
            {...defaultProps}
            shareText={`Updated text ${i}`}
          />
        )
      }

      // Should still work after multiple re-renders
      const shareButton = screen.getByRole('button')
      expect(shareButton).toBeInTheDocument()
    })

    test('should handle rapid clicks', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Rapid clicks
      fireEvent.click(shareButton)
      fireEvent.click(shareButton)
      fireEvent.click(shareButton)

      // Should handle all clicks (no debouncing implemented, but should not crash)
      expect(mockWindowOpen).toHaveBeenCalledTimes(3)
    })
  })

  describe('Browser Window Features', () => {
    test('should open Twitter window with correct dimensions', () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.any(String),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )
    })

    test('should handle window.open returning null', () => {
      mockWindowOpen.mockReturnValue(null)

      // Mock clipboard for fallback
      Object.defineProperty(global.navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should not throw error when window.open returns null
      expect(shareButton).toBeInTheDocument()
    })
  })
})
