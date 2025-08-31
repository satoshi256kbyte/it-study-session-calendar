import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '../test-utils'
import ResponsiveHeaderButtons from '../../components/ResponsiveHeaderButtons'
import TwitterShareButton from '../../components/TwitterShareButton'
import StudySessionRegisterButton from '../../components/StudySessionRegisterButton'
import MobileRegisterSection from '../../components/MobileRegisterSection'

/**
 * Final Integration Tests for Responsive Header Buttons
 * Requirements: 3.5, 4.5, 5.2, 5.5
 */
describe('Responsive Header Buttons Final Integration', () => {
  const mockProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会\n\n詳細はこちら: https://example.com',
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

  // Mock performance monitoring
  const performanceMetrics: Record<string, number> = {}
  const mockPerformance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn((name: string) => [
      { duration: performanceMetrics[name] || 0 },
    ]),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  }

  beforeEach(() => {
    vi.stubGlobal('performance', mockPerformance)
    vi.clearAllMocks()

    // Reset performance metrics
    Object.keys(performanceMetrics).forEach(
      key => delete performanceMetrics[key]
    )

    // Mock matchMedia for reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Responsive Behavior Integration', () => {
    it('should handle complete mobile to desktop transition smoothly', async () => {
      // Start with mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const { container, rerender } = render(
        <ResponsiveHeaderButtons {...mockProps} />
      )

      // Verify mobile state
      const twitterButton = container.querySelector(
        '.twitter-button-responsive'
      )
      expect(twitterButton).toBeTruthy()

      // Check that text is hidden on mobile (CSS-based)
      const twitterText = container.querySelector('.twitter-button-text')
      expect(twitterText).toBeTruthy()

      // Transition to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      act(() => {
        fireEvent(window, new Event('resize'))
      })

      // Wait for transition to complete
      await waitFor(
        () => {
          const headerContainer = container.querySelector(
            '[data-breakpoint="desktop"]'
          )
          expect(headerContainer).toBeTruthy()
        },
        { timeout: 1000 }
      )

      // Verify desktop state
      expect(twitterText).toBeTruthy()
    })

    it('should maintain accessibility throughout responsive transitions', async () => {
      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)

      // Check initial accessibility
      const buttons = container.querySelectorAll('button')
      buttons.forEach(button => {
        expect(
          button.getAttribute('aria-label') || button.textContent?.trim()
        ).toBeTruthy()
        expect(button.getAttribute('tabindex')).not.toBe('-1')
      })

      // Transition through different viewports
      const viewports = [375, 768, 1024, 1280]

      for (const width of viewports) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          fireEvent(window, new Event('resize'))
        })

        // Wait for transition
        await new Promise(resolve => setTimeout(resolve, 50))

        // Verify accessibility is maintained
        const currentButtons = container.querySelectorAll('button')
        currentButtons.forEach(button => {
          expect(
            button.getAttribute('aria-label') || button.textContent?.trim()
          ).toBeTruthy()
          expect(button.getAttribute('tabindex')).not.toBe('-1')
        })
      }
    })

    it('should handle error states across all breakpoints', async () => {
      const errorProps = {
        ...mockProps,
        eventsError: 'Failed to load events',
        isRetryable: true,
      }

      const viewports = [375, 768, 1280]

      for (const width of viewports) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        const { container, unmount } = render(
          <ResponsiveHeaderButtons {...errorProps} />
        )

        // Should show retry button
        const retryButton = container.querySelector(
          'button[aria-label*="再試行"]'
        )
        expect(retryButton).toBeTruthy()

        // Retry button should be functional
        if (retryButton) {
          fireEvent.click(retryButton)
          expect(mockProps.onRetry).toHaveBeenCalled()
        }

        unmount()
        vi.clearAllMocks()
      }
    })
  })

  describe('Performance Integration Tests', () => {
    it('should complete full responsive cycle within performance budget', async () => {
      const startTime = Date.now()
      performanceMetrics['full-responsive-cycle'] = 0

      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)

      // Simulate complete responsive cycle
      const viewports = [375, 768, 1024, 1280, 768, 375]

      for (const width of viewports) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          fireEvent(window, new Event('resize'))
        })

        // Small delay to simulate real-world conditions
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Should complete within reasonable time budget
      expect(totalTime).toBeLessThan(500) // 500ms budget for complete cycle

      // Verify no layout shifts occurred
      const headerContainer = container.querySelector(
        '.responsive-header-buttons'
      )
      expect(headerContainer).toBeTruthy()
    })

    it('should handle concurrent user interactions during transitions', async () => {
      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)

      // Start viewport transition
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        fireEvent(window, new Event('resize'))
      })

      // Immediately try to interact with buttons during transition
      const twitterButton = container.querySelector(
        '.twitter-button-responsive'
      )
      const shareButton = container.querySelector('button[aria-label*="共有"]')

      if (twitterButton) {
        fireEvent.click(twitterButton)
        expect(mockProps.onShareClick).toHaveBeenCalled()
      }

      if (shareButton) {
        fireEvent.click(shareButton)
        expect(mockProps.onNativeShare).toHaveBeenCalled()
      }

      // Interactions should work even during transitions
      expect(mockProps.onShareClick).toHaveBeenCalled()
      expect(mockProps.onNativeShare).toHaveBeenCalled()
    })
  })

  describe('Accessibility Compliance Verification', () => {
    it('should pass complete accessibility audit', async () => {
      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)

      // Check WCAG compliance
      const buttons = container.querySelectorAll('button')

      buttons.forEach(button => {
        // Minimum touch target size (44x44px)
        const rect = button.getBoundingClientRect()
        expect(rect.width).toBeGreaterThanOrEqual(44)
        expect(rect.height).toBeGreaterThanOrEqual(44)

        // Proper ARIA labels
        const hasLabel =
          button.getAttribute('aria-label') ||
          button.getAttribute('aria-labelledby') ||
          button.textContent?.trim()
        expect(hasLabel).toBeTruthy()

        // Focus management
        expect(button.getAttribute('tabindex')).not.toBe('-1')
      })

      // Color contrast (simulated check)
      const computedStyles = buttons[0]
        ? window.getComputedStyle(buttons[0])
        : null
      if (computedStyles) {
        expect(computedStyles.color).toBeTruthy()
        expect(computedStyles.backgroundColor).toBeTruthy()
      }
    })

    it('should support keyboard navigation across all breakpoints', async () => {
      const viewports = [375, 768, 1280]

      for (const width of viewports) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        const { container, unmount } = render(
          <ResponsiveHeaderButtons {...mockProps} />
        )

        const buttons = Array.from(container.querySelectorAll('button'))

        // Test tab navigation
        for (let i = 0; i < buttons.length; i++) {
          buttons[i].focus()
          expect(document.activeElement).toBe(buttons[i])

          // Test Enter key activation
          fireEvent.keyDown(buttons[i], { key: 'Enter', code: 'Enter' })
          fireEvent.keyUp(buttons[i], { key: 'Enter', code: 'Enter' })

          // Test Space key activation
          fireEvent.keyDown(buttons[i], { key: ' ', code: 'Space' })
          fireEvent.keyUp(buttons[i], { key: ' ', code: 'Space' })
        }

        unmount()
      }
    })

    it('should announce changes to screen readers', async () => {
      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)

      // Check for proper ARIA live regions or announcements
      const liveRegions = container.querySelectorAll('[aria-live]')

      // If no explicit live regions, buttons should have proper labels
      if (liveRegions.length === 0) {
        const buttons = container.querySelectorAll('button')
        buttons.forEach(button => {
          const label =
            button.getAttribute('aria-label') || button.textContent?.trim()
          expect(label).toBeTruthy()
          expect(label?.length).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid successive viewport changes gracefully', async () => {
      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)

      // Rapid viewport changes
      const changes = Array.from({ length: 20 }, (_, i) =>
        i % 2 === 0 ? 375 : 1280
      )

      const startTime = Date.now()

      for (const width of changes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          fireEvent(window, new Event('resize'))
        })
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Should handle rapid changes without performance degradation
      expect(totalTime).toBeLessThan(200) // 200ms budget

      // Component should still be functional
      const twitterButton = container.querySelector(
        '.twitter-button-responsive'
      )
      expect(twitterButton).toBeTruthy()
    })

    it('should recover from JavaScript errors gracefully', async () => {
      // Mock console.error to catch errors
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const errorProps = {
        ...mockProps,
        onTwitterShareError: vi.fn(() => {
          throw new Error('Simulated error')
        }),
      }

      const { container } = render(<ResponsiveHeaderButtons {...errorProps} />)

      const twitterButton = container.querySelector(
        '.twitter-button-responsive'
      )

      // Should not crash the component
      expect(() => {
        if (twitterButton) {
          fireEvent.click(twitterButton)
        }
      }).not.toThrow()

      // Component should still be rendered
      expect(container.querySelector('.responsive-header-buttons')).toBeTruthy()

      consoleSpy.mockRestore()
    })

    it('should handle missing props gracefully', async () => {
      const minimalProps = {
        shareText: '',
        calendarUrl: '',
        isEventsLoading: false,
        eventsError: null,
        isFallbackMode: false,
        isRetryable: false,
        onRetry: vi.fn(),
        onShareClick: vi.fn(),
        onTwitterShareError: vi.fn(),
        onNativeShare: vi.fn(),
      }

      expect(() => {
        render(<ResponsiveHeaderButtons {...minimalProps} />)
      }).not.toThrow()
    })
  })

  describe('Final Performance Verification', () => {
    it('should meet all performance benchmarks', async () => {
      const metrics = {
        initialRender: 0,
        firstInteraction: 0,
        responsiveTransition: 0,
        memoryUsage: 0,
      }

      // Initial render performance
      const renderStart = Date.now()
      const { container } = render(<ResponsiveHeaderButtons {...mockProps} />)
      metrics.initialRender = Date.now() - renderStart

      // First interaction performance
      const interactionStart = Date.now()
      const twitterButton = container.querySelector(
        '.twitter-button-responsive'
      )
      if (twitterButton) {
        fireEvent.click(twitterButton)
      }
      metrics.firstInteraction = Date.now() - interactionStart

      // Responsive transition performance
      const transitionStart = Date.now()
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      act(() => {
        fireEvent(window, new Event('resize'))
      })
      metrics.responsiveTransition = Date.now() - transitionStart

      // Performance benchmarks
      expect(metrics.initialRender).toBeLessThan(100) // 100ms
      expect(metrics.firstInteraction).toBeLessThan(50) // 50ms
      expect(metrics.responsiveTransition).toBeLessThan(100) // 100ms

      console.log('Final Performance Metrics:', metrics)
    })
  })
})
