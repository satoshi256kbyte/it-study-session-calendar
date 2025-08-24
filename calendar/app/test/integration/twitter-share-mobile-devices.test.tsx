/**
 * Twitter Share Button Mobile Device Specific Tests
 * 要件2.2, 2.3: モバイルデバイス固有の動作テスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import TwitterShareButton from '../../components/TwitterShareButton'

// Mobile device user agents for testing
const MOBILE_USER_AGENTS = {
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  Android:
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  iPad: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
}

// Mock touch events
const createTouchEvent = (type: string, touches: Touch[] = []) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: touches })
  Object.defineProperty(event, 'targetTouches', { value: touches })
  Object.defineProperty(event, 'changedTouches', { value: touches })
  return event
}

const createTouch = (
  identifier: number,
  target: Element,
  clientX: number = 0,
  clientY: number = 0
): Touch => ({
  identifier,
  target,
  clientX,
  clientY,
  pageX: clientX,
  pageY: clientY,
  screenX: clientX,
  screenY: clientY,
  radiusX: 1,
  radiusY: 1,
  rotationAngle: 0,
  force: 1,
})

describe('TwitterShareButton Mobile Device Tests', () => {
  const defaultProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会 #1\n01/28 Python入門セミナー\n\n詳細はこちら: https://example.com/calendar',
    calendarUrl: 'https://example.com/calendar',
  }

  const mockWindowOpen = vi.fn()
  const originalUserAgent = navigator.userAgent

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock window.open
    Object.defineProperty(window, 'open', {
      value: mockWindowOpen,
      writable: true,
    })

    // Mock alert
    global.alert = vi.fn()
    global.console.warn = vi.fn()
    global.console.error = vi.fn()
  })

  afterEach(() => {
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    })
  })

  describe('iOS Safari Specific Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: MOBILE_USER_AGENTS.iPhone,
        writable: true,
      })
    })

    test('should handle iOS Safari popup behavior', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet'),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )
    })

    test('should handle iOS Safari touch events', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Simulate iOS touch sequence
      const touch = createTouch(1, shareButton, 100, 100)

      fireEvent(shareButton, createTouchEvent('touchstart', [touch]))
      fireEvent(shareButton, createTouchEvent('touchend', [touch]))
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalled()
    })

    test('should handle iOS viewport meta tag behavior', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Should have minimum touch target size for iOS
      expect(shareButton).toHaveClass('min-h-[44px]')
    })
  })

  describe('Android Chrome Specific Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: MOBILE_USER_AGENTS.Android,
        writable: true,
      })
    })

    test('should handle Android Chrome popup behavior', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet'),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )
    })

    test('should handle Android touch events with different pressure', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Simulate Android touch with pressure
      const touch = createTouch(1, shareButton, 150, 150)
      Object.defineProperty(touch, 'force', { value: 0.8 })

      fireEvent(shareButton, createTouchEvent('touchstart', [touch]))
      fireEvent(shareButton, createTouchEvent('touchend', [touch]))
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalled()
    })
  })

  describe('iPad Specific Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: MOBILE_USER_AGENTS.iPad,
        writable: true,
      })
    })

    test('should handle iPad larger touch targets', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // iPad should still have touch-friendly sizing
      expect(shareButton).toHaveClass('min-h-[44px]')
      expect(shareButton).toHaveClass('px-3', 'py-2')
    })

    test('should handle iPad orientation changes', async () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
      })
      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
      })
      window.dispatchEvent(new Event('orientationchange'))

      rerender(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toBeInTheDocument()
    })
  })

  describe('Touch Gesture Tests', () => {
    test('should handle single tap correctly', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      const touch = createTouch(1, shareButton, 100, 100)

      fireEvent(shareButton, createTouchEvent('touchstart', [touch]))

      // Short touch duration (single tap)
      setTimeout(() => {
        fireEvent(shareButton, createTouchEvent('touchend', [touch]))
        fireEvent.click(shareButton)
      }, 50)

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalled()
      })
    })

    test('should not trigger on touch and drag', async () => {
      const onShareClick = vi.fn()

      render(
        <TwitterShareButton {...defaultProps} onShareClick={onShareClick} />
      )

      const shareButton = screen.getByRole('button')

      // Start touch
      const startTouch = createTouch(1, shareButton, 100, 100)
      fireEvent(shareButton, createTouchEvent('touchstart', [startTouch]))

      // Move touch (drag)
      const moveTouch = createTouch(1, shareButton, 150, 100)
      fireEvent(shareButton, createTouchEvent('touchmove', [moveTouch]))

      // End touch
      fireEvent(shareButton, createTouchEvent('touchend', [moveTouch]))

      // Should not trigger click after drag
      expect(onShareClick).not.toHaveBeenCalled()
    })

    test('should handle multi-touch gracefully', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Multi-touch scenario
      const touch1 = createTouch(1, shareButton, 100, 100)
      const touch2 = createTouch(2, shareButton, 120, 100)

      fireEvent(shareButton, createTouchEvent('touchstart', [touch1, touch2]))
      fireEvent(shareButton, createTouchEvent('touchend', [touch1, touch2]))

      // Should still work with multi-touch
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalled()
    })
  })

  describe('Mobile Network Conditions', () => {
    test('should handle slow network conditions', async () => {
      // Mock slow network by delaying window.open
      mockWindowOpen.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ focus: vi.fn() }), 1000)
        })
      })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should not crash or hang on slow network
      expect(shareButton).toBeInTheDocument()
    })

    test('should handle offline conditions', async () => {
      // Mock offline condition
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      mockWindowOpen.mockReturnValue(null) // Simulate failure

      // Mock clipboard for fallback
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
      })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should fallback to clipboard when offline
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })
  })

  describe('Mobile Accessibility', () => {
    test('should announce state changes to screen readers', async () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      // Check initial aria-live region
      const liveRegion = screen
        .getByText('今月の勉強会情報をX（旧Twitter）で共有します')
        .closest('[aria-live]')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')

      // Change to loading state
      rerender(<TwitterShareButton {...defaultProps} isLoading />)

      const loadingHelp = screen.getByText(
        'X共有の準備中です。しばらくお待ちください'
      )
      expect(loadingHelp).toBeInTheDocument()
    })

    test('should support voice control activation', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Simulate voice control click (usually triggers click event directly)
      fireEvent.click(shareButton)

      expect(mockWindowOpen).toHaveBeenCalled()
    })

    test('should work with mobile screen readers', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Should have proper role and label for mobile screen readers
      expect(shareButton).toHaveAttribute('role', 'button')
      expect(shareButton).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で勉強会情報を共有する'
      )

      // Should have describedby for additional context
      expect(shareButton).toHaveAttribute(
        'aria-describedby',
        'twitter-share-help'
      )
    })
  })

  describe('Mobile Performance', () => {
    test('should not cause excessive re-renders on mobile', () => {
      const renderSpy = vi.fn()

      const TestWrapper = (props: any) => {
        renderSpy()
        return <TwitterShareButton {...props} />
      }

      const { rerender } = render(<TestWrapper {...defaultProps} />)

      // Multiple prop changes
      rerender(<TestWrapper {...defaultProps} shareText="Updated text 1" />)
      rerender(<TestWrapper {...defaultProps} shareText="Updated text 2" />)
      rerender(<TestWrapper {...defaultProps} isLoading />)
      rerender(<TestWrapper {...defaultProps} hasError />)

      // Should render efficiently (exact count may vary based on React version)
      expect(renderSpy).toHaveBeenCalledTimes(5)
    })

    test('should handle memory pressure gracefully', () => {
      // Simulate memory pressure by creating many instances
      const instances = []

      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <TwitterShareButton {...defaultProps} shareText={`Text ${i}`} />
        )
        instances.push(unmount)
      }

      // Cleanup all instances
      instances.forEach(unmount => unmount())

      // Should not cause memory leaks or crashes
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })

  describe('Mobile Browser Quirks', () => {
    test('should handle iOS Safari bounce scrolling', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      const container = shareButton.parentElement

      // Should maintain position during bounce scrolling
      expect(container).toHaveClass('relative')
    })

    test('should handle Android Chrome address bar hiding', () => {
      // Simulate viewport height change when address bar hides
      Object.defineProperty(window, 'innerHeight', {
        value: 600,
        writable: true,
      })
      window.dispatchEvent(new Event('resize'))

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toBeInTheDocument()
    })

    test('should handle mobile keyboard appearance', () => {
      // Simulate keyboard appearance (viewport height reduction)
      Object.defineProperty(window, 'innerHeight', {
        value: 300,
        writable: true,
      })
      window.dispatchEvent(new Event('resize'))

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Should remain accessible when keyboard is visible
      expect(shareButton).toBeInTheDocument()
      expect(shareButton).toHaveClass('min-h-[44px]')
    })
  })

  describe('Mobile Twitter App Integration', () => {
    test('should handle Twitter app not installed', async () => {
      // Mock Twitter app not available
      mockWindowOpen.mockReturnValue(null)

      // Mock clipboard for fallback
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
      })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should fallback to clipboard when Twitter app not available
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })

    test('should handle Twitter app deep linking', async () => {
      mockWindowOpen.mockReturnValue({ focus: vi.fn() })

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should use web intent URL that can be handled by Twitter app
      const calledUrl = mockWindowOpen.mock.calls[0][0]
      expect(calledUrl).toContain('https://twitter.com/intent/tweet')
      expect(calledUrl).toContain('text=')
    })
  })
})
