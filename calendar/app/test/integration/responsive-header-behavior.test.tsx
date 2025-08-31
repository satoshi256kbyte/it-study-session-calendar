/**
 * Responsive Header Behavior Integration Tests
 * Task 12: Write integration tests for responsive header behavior
 *
 * Requirements tested:
 * - 3.3: Header layout remains visually balanced across all screen sizes
 * - 3.5: Smooth layout changes during breakpoint transitions
 * - 4.1: Accessibility compliance during responsive changes
 * - 4.4: Proper ARIA labels and keyboard navigation across breakpoints
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup } from '../test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ResponsiveHeaderButtons from '../../components/ResponsiveHeaderButtons'
import TwitterShareButton from '../../components/TwitterShareButton'
import StudySessionRegisterButton from '../../components/StudySessionRegisterButton'
import MobileRegisterSection from '../../components/MobileRegisterSection'

// Mock performance monitoring
vi.mock('../../utils/performance', () => ({
  initializePerformanceMonitoring: vi.fn(),
  performanceMonitor: {
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
  usePerformanceMonitor: vi.fn(() => ({
    renderCount: 1,
    logRender: vi.fn(),
  })),
  useOptimizedCallback: vi.fn(callback => callback),
  useDeepMemoize: vi.fn(fn => fn()),
}))

// Mock responsive transitions utility
vi.mock('../../utils/responsive-transitions', () => ({
  useResponsiveTransitions: vi.fn(() => ({
    currentBreakpoint: 'desktop',
    isTransitioning: false,
    prefersReducedMotion: false,
    transitionDuration: 300,
    getTransitionClasses: vi.fn(() => 'transition-all duration-300'),
    applyTransitionClasses: vi.fn(),
    removeTransitionClasses: vi.fn(),
  })),
  preventLayoutShift: vi.fn(() => vi.fn()),
  optimizeTransitionPerformance: vi.fn(() => vi.fn()),
}))

describe('Responsive Header Behavior Integration Tests', () => {
  const defaultProps = {
    shareText: 'Test share text for responsive header',
    calendarUrl: 'https://example.com/calendar',
    isEventsLoading: false,
    eventsError: null,
    isFallbackMode: false,
    isRetryable: false,
    onRetry: vi.fn(),
    onShareClick: vi.fn(),
    onTwitterShareError: vi.fn(),
    onNativeShare: vi.fn(),
  }

  // Store original window properties
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock window.open for Twitter share tests
    Object.defineProperty(window, 'open', {
      value: vi.fn(() => ({ focus: vi.fn() })),
      writable: true,
    })

    // Mock alert
    Object.defineProperty(window, 'alert', {
      value: vi.fn(),
      writable: true,
    })
  })

  afterEach(() => {
    // Clean up DOM
    cleanup()

    // Restore original window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
    vi.restoreAllMocks()
  })

  /**
   * Helper function to mock viewport size and trigger resize event
   */
  const mockViewport = (width: number, height: number) => {
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

    // Mock matchMedia for responsive breakpoints
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches:
          query.includes(`max-width: ${width - 1}px`) ||
          (query.includes(`min-width: ${width}px`) &&
            width >= parseInt(query.match(/\d+/)?.[0] || '0')),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
  }

  describe('Complete Responsive Behavior Across Breakpoints (Requirement 3.3)', () => {
    const keyBreakpoints = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 720 },
    ]

    keyBreakpoints.forEach(({ name, width, height }) => {
      it(`should maintain proper header layout on ${name}`, async () => {
        mockViewport(width, height)

        render(<ResponsiveHeaderButtons {...defaultProps} />)

        // Verify all essential buttons are present
        const twitterButton = screen.getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
        const nativeShareButton = screen.getByRole('button', {
          name: /ネイティブ共有機能を使用してページを共有/,
        })
        const registerButton = screen.getByRole('link', {
          name: /勉強会の登録依頼ページへ移動/,
        })

        expect(twitterButton).toBeInTheDocument()
        expect(nativeShareButton).toBeInTheDocument()
        expect(registerButton).toBeInTheDocument()

        // Verify container has proper responsive classes
        const container = twitterButton.closest('.flex.items-center')
        expect(container).toHaveClass('flex', 'items-center', 'space-x-4')

        // On mobile, verify minimum touch target size
        if (width < 640) {
          expect(twitterButton).toHaveClass('min-h-[44px]')
        }
      })
    })

    it('should handle responsive text visibility', async () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="full"
        />
      )

      const button = screen.getByRole('button')
      const textSpan = button.querySelector('span.hidden.sm\\:inline')
      expect(textSpan).toBeInTheDocument()
    })

    it('should handle register button responsive visibility', async () => {
      render(
        <StudySessionRegisterButton responsive={true} displayMode="header" />
      )

      const button = screen.getByRole('link')
      expect(button).toHaveClass('hidden', 'sm:inline-flex')
    })

    it('should display mobile register section correctly', async () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: /勉強会登録セクション/,
      })
      expect(section).toBeInTheDocument()
      expect(section).toHaveClass('block', 'sm:hidden')

      const mobileRegisterButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })
      expect(mobileRegisterButton).toBeInTheDocument()
      expect(mobileRegisterButton).toHaveClass('w-full', 'justify-center')
    })
  })

  describe('Layout Stability During Viewport Changes (Requirement 3.5)', () => {
    it('should maintain layout stability during rapid viewport changes', async () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Start with mobile
      mockViewport(375, 667)
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      let container = screen
        .getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
        .closest('.flex.items-center')
      expect(container).toHaveClass('flex', 'items-center')

      // Change to tablet
      mockViewport(768, 1024)
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      container = screen
        .getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
        .closest('.flex.items-center')
      expect(container).toHaveClass('flex', 'items-center')

      // Change to desktop
      mockViewport(1280, 720)
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      container = screen
        .getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
        .closest('.flex.items-center')
      expect(container).toHaveClass('flex', 'items-center')

      // Verify all buttons are still functional
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      const nativeShareButton = screen.getByRole('button', {
        name: /ネイティブ共有機能を使用してページを共有/,
      })

      expect(twitterButton).toBeInTheDocument()
      expect(nativeShareButton).toBeInTheDocument()
    })

    it('should handle orientation changes smoothly', async () => {
      // Portrait mobile
      mockViewport(375, 667)
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      let twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButton).toBeInTheDocument()

      // Landscape mobile
      mockViewport(667, 375)
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      // Trigger orientation change event
      act(() => {
        window.dispatchEvent(new Event('orientationchange'))
      })

      twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButton).toBeInTheDocument()

      // Verify layout remains stable
      const container = twitterButton.closest('.flex.items-center')
      expect(container).toHaveClass('flex', 'items-center', 'space-x-4')
    })

    it('should prevent layout shifts during responsive transitions', async () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Measure initial layout
      const initialButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      const initialContainer = initialButton.closest('.flex.items-center')
      const initialClasses = initialContainer?.className

      // Change viewport size
      mockViewport(768, 1024)
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify core layout classes remain consistent
      const updatedButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      const updatedContainer = updatedButton.closest('.flex.items-center')

      expect(updatedContainer).toHaveClass('flex', 'items-center', 'space-x-4')

      // Core structural classes should remain the same
      expect(updatedContainer?.classList.contains('flex')).toBe(true)
      expect(updatedContainer?.classList.contains('items-center')).toBe(true)
    })
  })

  describe('Button Functionality in All Responsive Modes (Requirement 3.3)', () => {
    it('should maintain Twitter button functionality', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })

      fireEvent.click(twitterButton)

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet'),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )
      expect(defaultProps.onShareClick).toHaveBeenCalled()
    })

    it('should maintain native share button functionality', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const shareButton = screen.getByRole('button', {
        name: /ネイティブ共有機能を使用してページを共有/,
      })

      fireEvent.click(shareButton)

      expect(defaultProps.onNativeShare).toHaveBeenCalled()
    })

    it('should maintain register button functionality', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })

      expect(registerButton).toHaveAttribute('href', '/register')
    })

    it('should handle error states properly', async () => {
      const propsWithError = {
        ...defaultProps,
        eventsError: 'Test error',
        isRetryable: true,
      }

      render(<ResponsiveHeaderButtons {...propsWithError} />)

      const retryButton = screen.getByRole('button', {
        name: /勉強会データの取得を再試行/,
      })
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })
  })

  describe('Accessibility Compliance Across Responsive States (Requirements 4.1, 4.4)', () => {
    it('should maintain proper ARIA labels', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Twitter button ARIA attributes
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButton).toHaveAttribute('aria-label')
      expect(twitterButton).toHaveAttribute('role', 'button')
      expect(twitterButton).toHaveAttribute('tabIndex', '0')

      // Native share button ARIA attributes
      const shareButton = screen.getByRole('button', {
        name: /ネイティブ共有機能を使用してページを共有/,
      })
      expect(shareButton).toHaveAttribute('aria-label')

      // Register button ARIA attributes
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })
      expect(registerButton).toHaveAttribute('aria-label')
    })

    it('should maintain keyboard navigation', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Test that buttons are focusable
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      const shareButton = screen.getByRole('button', {
        name: /ネイティブ共有機能を使用してページを共有/,
      })
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })

      // Verify all buttons are focusable
      expect(twitterButton.tabIndex).not.toBe(-1)
      expect(shareButton.tabIndex).not.toBe(-1)
      expect(registerButton.tabIndex).not.toBe(-1)

      // Test focus
      twitterButton.focus()
      expect(document.activeElement).toBe(twitterButton)
    })

    it('should handle keyboard interactions properly', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })

      // Focus and press Enter
      twitterButton.focus()
      fireEvent.keyDown(twitterButton, { key: 'Enter', code: 'Enter' })

      expect(window.open).toHaveBeenCalled()
      expect(defaultProps.onShareClick).toHaveBeenCalled()

      // Test Space key
      vi.clearAllMocks()
      fireEvent.keyDown(twitterButton, { key: ' ', code: 'Space' })

      expect(window.open).toHaveBeenCalled()
      expect(defaultProps.onShareClick).toHaveBeenCalled()
    })

    it('should provide proper screen reader support', async () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Check for screen reader only content
      const srOnlyElements = document.querySelectorAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)

      // Verify help text is available
      const helpText = screen.getByText(
        /今月の勉強会情報をX（旧Twitter）で共有します/
      )
      expect(helpText).toBeInTheDocument()

      // Check aria-describedby relationships
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButton).toHaveAttribute('aria-describedby')
    })

    it('should maintain accessibility in mobile register section', async () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: /勉強会登録セクション/,
      })
      expect(section).toHaveAttribute('aria-label')

      const button = screen.getByTestId('study-session-register-button')
      expect(button).toBeInTheDocument()

      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })
      expect(registerButton).toHaveAttribute('aria-label')
    })
  })

  describe('Integration and Performance Tests', () => {
    it('should handle reduced motion preferences', async () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
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

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButton).toBeInTheDocument()

      // Verify component renders correctly with reduced motion
      const container = twitterButton.closest('.flex.items-center')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const propsWithError = {
        ...defaultProps,
        eventsError: 'Network error',
        isRetryable: true,
      }

      render(<ResponsiveHeaderButtons {...propsWithError} />)

      // Error state should be displayed
      const retryButton = screen.getByRole('button', {
        name: /勉強会データの取得を再試行/,
      })
      expect(retryButton).toBeInTheDocument()

      // Other buttons should still be functional
      const twitterButtons = screen.getAllByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButtons.length).toBeGreaterThan(0)
    })
  })
})
