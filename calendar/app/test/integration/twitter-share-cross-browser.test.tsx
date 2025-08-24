/**
 * Twitter Share Button Cross-Browser Compatibility Tests
 * 要件2.2, 2.3: 主要ブラウザでのTwitter Web Intent動作確認
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import TwitterShareButton from '../../components/TwitterShareButton'

// Browser user agents for testing different engines
const BROWSER_USER_AGENTS = {
  Chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Firefox:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  Safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  Edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  IE11: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
}

// Mock different browser APIs
const mockBrowserAPIs = (browserType: keyof typeof BROWSER_USER_AGENTS) => {
  const mocks: any = {}

  switch (browserType) {
    case 'Chrome':
      mocks.clipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      }
      mocks.execCommand = vi.fn().mockReturnValue(true)
      break

    case 'Firefox':
      mocks.clipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      }
      mocks.execCommand = vi.fn().mockReturnValue(true)
      break

    case 'Safari':
      mocks.clipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      }
      mocks.execCommand = vi.fn().mockReturnValue(true)
      break

    case 'Edge':
      mocks.clipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      }
      mocks.execCommand = vi.fn().mockReturnValue(true)
      break

    case 'IE11':
      // IE11 doesn't support clipboard API
      mocks.clipboard = undefined
      mocks.execCommand = vi.fn().mockReturnValue(true)
      break
  }

  return mocks
}

describe('TwitterShareButton Cross-Browser Compatibility Tests', () => {
  const defaultProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会 #1\n01/28 Python入門セミナー\n\n詳細はこちら: https://example.com/calendar',
    calendarUrl: 'https://example.com/calendar',
  }

  const mockWindowOpen = vi.fn()
  const originalUserAgent = navigator.userAgent
  const originalClipboard = navigator.clipboard
  const originalExecCommand = document.execCommand

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock window.open
    Object.defineProperty(window, 'open', {
      value: mockWindowOpen,
      writable: true,
    })

    // Mock alert and console
    global.alert = vi.fn()
    global.console.warn = vi.fn()
    global.console.error = vi.fn()
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    })
    Object.defineProperty(document, 'execCommand', {
      value: originalExecCommand,
      writable: true,
    })
  })

  describe('Chrome Browser Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: BROWSER_USER_AGENTS.Chrome,
        writable: true,
      })

      const mocks = mockBrowserAPIs('Chrome')
      Object.defineProperty(navigator, 'clipboard', {
        value: mocks.clipboard,
        writable: true,
      })
      Object.defineProperty(document, 'execCommand', {
        value: mocks.execCommand,
        writable: true,
      })
    })

    test('should open Twitter Web Intent in Chrome', async () => {
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

    test('should handle Chrome popup blocker', async () => {
      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })

    test('should handle Chrome clipboard API', async () => {
      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })
  })

  describe('Firefox Browser Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: BROWSER_USER_AGENTS.Firefox,
        writable: true,
      })

      const mocks = mockBrowserAPIs('Firefox')
      Object.defineProperty(navigator, 'clipboard', {
        value: mocks.clipboard,
        writable: true,
      })
      Object.defineProperty(document, 'execCommand', {
        value: mocks.execCommand,
        writable: true,
      })
    })

    test('should open Twitter Web Intent in Firefox', async () => {
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

    test('should handle Firefox popup restrictions', async () => {
      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })

    test('should handle Firefox clipboard permissions', async () => {
      // Mock Firefox clipboard permission denied
      const mockClipboard = {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      }
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
      })

      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should attempt clipboard write (even if it fails)
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })
  })

  describe('Safari Browser Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: BROWSER_USER_AGENTS.Safari,
        writable: true,
      })

      const mocks = mockBrowserAPIs('Safari')
      Object.defineProperty(navigator, 'clipboard', {
        value: mocks.clipboard,
        writable: true,
      })
      Object.defineProperty(document, 'execCommand', {
        value: mocks.execCommand,
        writable: true,
      })
    })

    test('should open Twitter Web Intent in Safari', async () => {
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

    test('should handle Safari popup blocker', async () => {
      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })

    test('should handle Safari clipboard restrictions', async () => {
      // Safari requires user gesture for clipboard
      const mockClipboard = {
        writeText: vi
          .fn()
          .mockRejectedValue(new Error('User gesture required')),
      }
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
      })

      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should attempt clipboard write (even if it fails)
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })
  })

  describe('Edge Browser Tests', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: BROWSER_USER_AGENTS.Edge,
        writable: true,
      })

      const mocks = mockBrowserAPIs('Edge')
      Object.defineProperty(navigator, 'clipboard', {
        value: mocks.clipboard,
        writable: true,
      })
      Object.defineProperty(document, 'execCommand', {
        value: mocks.execCommand,
        writable: true,
      })
    })

    test('should open Twitter Web Intent in Edge', async () => {
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

    test('should handle Edge popup blocker', async () => {
      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })
    })
  })

  describe('Legacy Browser Support (IE11)', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: BROWSER_USER_AGENTS.IE11,
        writable: true,
      })

      // IE11 doesn't support clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      })
      Object.defineProperty(document, 'execCommand', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
      })
    })

    test('should open Twitter Web Intent in IE11', async () => {
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

    test('should fallback to execCommand in IE11', async () => {
      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should use execCommand fallback since clipboard API is not available
      await waitFor(() => {
        expect(document.execCommand).toHaveBeenCalledWith('copy')
      })
    })
  })

  describe('URL Encoding Across Browsers', () => {
    test('should properly encode URLs in all browsers', async () => {
      const testCases = [
        { browser: 'Chrome', userAgent: BROWSER_USER_AGENTS.Chrome },
        { browser: 'Firefox', userAgent: BROWSER_USER_AGENTS.Firefox },
        { browser: 'Safari', userAgent: BROWSER_USER_AGENTS.Safari },
        { browser: 'Edge', userAgent: BROWSER_USER_AGENTS.Edge },
      ]

      for (const testCase of testCases) {
        Object.defineProperty(navigator, 'userAgent', {
          value: testCase.userAgent,
          writable: true,
        })

        mockWindowOpen.mockReturnValue({ focus: vi.fn() })

        const specialText =
          'Test with special chars: #hashtag @mention & symbols 日本語'

        const { unmount } = render(
          <TwitterShareButton
            shareText={specialText}
            calendarUrl={defaultProps.calendarUrl}
          />
        )

        const shareButton = screen.getByRole('button')
        fireEvent.click(shareButton)

        const calledUrl =
          mockWindowOpen.mock.calls[mockWindowOpen.mock.calls.length - 1][0]

        // Should properly encode special characters in all browsers
        expect(calledUrl).toContain(encodeURIComponent(specialText))
        expect(calledUrl).not.toContain('#hashtag') // Should be encoded
        expect(calledUrl).not.toContain('@mention') // Should be encoded
        expect(calledUrl).not.toContain('日本語') // Should be encoded

        mockWindowOpen.mockClear()
        unmount()
      }
    })
  })

  describe('Error Handling Across Browsers', () => {
    test('should handle window.open errors consistently', async () => {
      const testCases = [
        { browser: 'Chrome', userAgent: BROWSER_USER_AGENTS.Chrome },
        { browser: 'Firefox', userAgent: BROWSER_USER_AGENTS.Firefox },
        { browser: 'Safari', userAgent: BROWSER_USER_AGENTS.Safari },
        { browser: 'Edge', userAgent: BROWSER_USER_AGENTS.Edge },
      ]

      for (const testCase of testCases) {
        Object.defineProperty(navigator, 'userAgent', {
          value: testCase.userAgent,
          writable: true,
        })

        // Mock window.open to throw error
        mockWindowOpen.mockImplementation(() => {
          throw new Error('Popup blocked')
        })

        // Mock clipboard for fallback
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
          writable: true,
        })

        const onError = vi.fn()
        const { unmount } = render(
          <TwitterShareButton {...defaultProps} onError={onError} />
        )

        const shareButton = screen.getByRole('button')
        fireEvent.click(shareButton)

        // Should handle error and call onError callback
        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(expect.any(Error))
        })

        // Should fallback to clipboard
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )

        vi.clearAllMocks()
        unmount()
      }
    })
  })

  describe('Performance Across Browsers', () => {
    test('should perform consistently across browsers', async () => {
      const testCases = [
        { browser: 'Chrome', userAgent: BROWSER_USER_AGENTS.Chrome },
        { browser: 'Firefox', userAgent: BROWSER_USER_AGENTS.Firefox },
        { browser: 'Safari', userAgent: BROWSER_USER_AGENTS.Safari },
        { browser: 'Edge', userAgent: BROWSER_USER_AGENTS.Edge },
      ]

      for (const testCase of testCases) {
        Object.defineProperty(navigator, 'userAgent', {
          value: testCase.userAgent,
          writable: true,
        })

        mockWindowOpen.mockReturnValue({ focus: vi.fn() })

        const startTime = performance.now()

        const { unmount } = render(<TwitterShareButton {...defaultProps} />)

        const shareButton = screen.getByRole('button')
        fireEvent.click(shareButton)

        const endTime = performance.now()
        const duration = endTime - startTime

        // Should complete within reasonable time (less than 100ms)
        expect(duration).toBeLessThan(100)

        expect(mockWindowOpen).toHaveBeenCalled()

        mockWindowOpen.mockClear()
        unmount()
      }
    })
  })

  describe('Accessibility Across Browsers', () => {
    test('should maintain accessibility features in all browsers', () => {
      const testCases = [
        { browser: 'Chrome', userAgent: BROWSER_USER_AGENTS.Chrome },
        { browser: 'Firefox', userAgent: BROWSER_USER_AGENTS.Firefox },
        { browser: 'Safari', userAgent: BROWSER_USER_AGENTS.Safari },
        { browser: 'Edge', userAgent: BROWSER_USER_AGENTS.Edge },
      ]

      for (const testCase of testCases) {
        Object.defineProperty(navigator, 'userAgent', {
          value: testCase.userAgent,
          writable: true,
        })

        const { unmount } = render(<TwitterShareButton {...defaultProps} />)

        const shareButton = screen.getByRole('button')

        // Should have consistent ARIA attributes across browsers
        expect(shareButton).toHaveAttribute(
          'aria-label',
          'X（旧Twitter）で勉強会情報を共有する'
        )
        expect(shareButton).toHaveAttribute('role', 'button')
        expect(shareButton).toHaveAttribute('tabIndex', '0')
        expect(shareButton).toHaveAttribute(
          'aria-describedby',
          'twitter-share-help'
        )

        // Should have screen reader text
        expect(
          screen.getByText('今月の勉強会情報をX（旧Twitter）で共有します')
        ).toBeInTheDocument()

        unmount()
      }
    })
  })

  describe('Feature Detection', () => {
    test('should detect and handle missing APIs gracefully', async () => {
      // Test with no clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      })

      // Test with no execCommand
      Object.defineProperty(document, 'execCommand', {
        value: undefined,
        writable: true,
      })

      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should not crash even when APIs are missing
      expect(shareButton).toBeInTheDocument()
    })

    test('should handle partial API support', async () => {
      // Mock clipboard API that exists but fails
      const mockClipboard = {
        writeText: vi.fn().mockRejectedValue(new Error('Not supported')),
      }
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
      })

      mockWindowOpen.mockReturnValue(null)

      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      fireEvent.click(shareButton)

      // Should attempt clipboard write and handle gracefully when it fails
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          defaultProps.shareText
        )
      })

      // Component should not crash when clipboard fails
      expect(shareButton).toBeInTheDocument()
    })
  })
})
