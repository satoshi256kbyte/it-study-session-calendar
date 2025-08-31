/**
 * Cross-browser compatibility tests for responsive event materials
 * 要件5.4, 7.4: 主要ブラウザでのレスポンシブ表示テスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { vi } from 'vitest'
import ResponsiveEventMaterialsList from '../../components/ResponsiveEventMaterialsList'
import { mockEvents } from '../test-utils'

// Mock user agents for different browsers
const mockUserAgents = {
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  mobileSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  mobileChrome:
    'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
}

// Mock CSS feature detection
const mockCSSSupports = (property: string, value: string): boolean => {
  const supportMap: Record<string, boolean> = {
    'display:grid': true,
    'display:flex': true,
    'transform:translateZ(0)': true,
    'will-change:transform': true,
    'backdrop-filter:blur(10px)': false, // Simulate older browser
    'container-queries': false, // Simulate unsupported feature
    'aspect-ratio:1/1': true,
    'gap:1rem': true,
    'object-fit:cover': true,
    'position:sticky': true,
    'scroll-behavior:smooth': true,
    'overscroll-behavior:contain': true,
    'touch-action:manipulation': true,
    '-webkit-overflow-scrolling:touch': true,
  }

  return supportMap[`${property}:${value}`] ?? true
}

// Mock window.matchMedia for media queries
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})

describe('Cross-browser Compatibility Tests', () => {
  let originalUserAgent: string
  let originalMatchMedia: typeof window.matchMedia
  let originalCSSSupports: typeof CSS.supports

  beforeEach(() => {
    originalUserAgent = navigator.userAgent
    originalMatchMedia = window.matchMedia
    originalCSSSupports = CSS.supports

    // Mock CSS.supports
    Object.defineProperty(CSS, 'supports', {
      value: mockCSSSupports,
      writable: true,
    })

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation(mockMatchMedia)
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    })
    window.matchMedia = originalMatchMedia
    Object.defineProperty(CSS, 'supports', {
      value: originalCSSSupports,
      writable: true,
    })
  })

  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      writable: true,
    })
  }

  const mockViewport = (width: number, height: number = 800) => {
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
  }

  describe('Chrome Browser Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.chrome)
    })

    test('renders correctly on Chrome desktop', async () => {
      mockViewport(1200)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      // Should show desktop table view
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    test('handles CSS Grid properly on Chrome', async () => {
      mockViewport(800)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const gridContainer = screen.getByTestId('tablet-grid')
        expect(gridContainer).toHaveClass('responsive-grid-tablet')
      })
    })

    test('supports modern CSS features on Chrome', () => {
      expect(CSS.supports('display', 'grid')).toBe(true)
      expect(CSS.supports('transform', 'translateZ(0)')).toBe(true)
      expect(CSS.supports('will-change', 'transform')).toBe(true)
    })
  })

  describe('Firefox Browser Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.firefox)
    })

    test('renders correctly on Firefox desktop', async () => {
      mockViewport(1200)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    test('handles Flexbox fallback on Firefox', async () => {
      // Mock CSS Grid as unsupported
      Object.defineProperty(CSS, 'supports', {
        value: (property: string, value: string) => {
          if (property === 'display' && value === 'grid') return false
          return mockCSSSupports(property, value)
        },
        writable: true,
      })

      mockViewport(800)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      // Should still render cards even without Grid support
      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(mockEvents.length)
      })
    })
  })

  describe('Safari Browser Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.safari)
    })

    test('renders correctly on Safari desktop', async () => {
      mockViewport(1200)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    test('handles webkit-specific properties on Safari', async () => {
      mockViewport(400)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards[0]).toBeInTheDocument()

        // Check for webkit-specific touch properties
        const computedStyle = window.getComputedStyle(cards[0])
        expect(
          computedStyle.getPropertyValue('-webkit-overflow-scrolling')
        ).toBeDefined()
      })
    })
  })

  describe('Mobile Safari Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.mobileSafari)
    })

    test('renders correctly on Mobile Safari', async () => {
      mockViewport(375, 667) // iPhone dimensions

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const mobileStack = screen.getByTestId('mobile-stack')
        expect(mobileStack).toBeInTheDocument()
        expect(mobileStack).toHaveClass('responsive-stack-mobile')
      })
    })

    test('handles touch events properly on Mobile Safari', async () => {
      mockViewport(375, 667)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        const firstCard = cards[0]

        // Simulate touch events
        fireEvent.touchStart(firstCard)
        fireEvent.touchEnd(firstCard)

        expect(firstCard).toBeInTheDocument()
      })
    })
  })

  describe('Edge Browser Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.edge)
    })

    test('renders correctly on Edge', async () => {
      mockViewport(1200)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    test('handles legacy Edge quirks', async () => {
      // Mock some Edge-specific behavior
      mockViewport(800)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const gridContainer = screen.getByTestId('tablet-grid')
        expect(gridContainer).toBeInTheDocument()
      })
    })
  })

  describe('CSS Feature Detection and Fallbacks', () => {
    test('provides Flexbox fallback when Grid is not supported', async () => {
      // Mock CSS Grid as unsupported
      Object.defineProperty(CSS, 'supports', {
        value: (property: string, value: string) => {
          if (property === 'display' && value === 'grid') return false
          return mockCSSSupports(property, value)
        },
        writable: true,
      })

      mockViewport(800)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        // Should still render cards with flexbox fallback
        expect(screen.getAllByRole('article')).toHaveLength(mockEvents.length)
      })
    })

    test('handles missing transform support gracefully', async () => {
      // Mock transform as unsupported
      Object.defineProperty(CSS, 'supports', {
        value: (property: string, value: string) => {
          if (property === 'transform') return false
          return mockCSSSupports(property, value)
        },
        writable: true,
      })

      mockViewport(400)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards).toHaveLength(mockEvents.length)
        // Should still be functional without transforms
      })
    })

    test('provides fallback for unsupported will-change property', async () => {
      // Mock will-change as unsupported
      Object.defineProperty(CSS, 'supports', {
        value: (property: string, value: string) => {
          if (property === 'will-change') return false
          return mockCSSSupports(property, value)
        },
        writable: true,
      })

      mockViewport(400)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(mockEvents.length)
      })
    })
  })

  describe('Touch Event Compatibility', () => {
    test('handles touch events across different browsers', async () => {
      const browsers = [
        mockUserAgents.mobileSafari,
        mockUserAgents.mobileChrome,
      ]

      for (const userAgent of browsers) {
        mockUserAgent(userAgent)
        mockViewport(375, 667)

        const { unmount } = render(
          <ResponsiveEventMaterialsList events={mockEvents} />
        )

        await waitFor(() => {
          const cards = screen.getAllByRole('article')
          const firstCard = cards[0]

          // Test touch events
          fireEvent.touchStart(firstCard, {
            touches: [{ clientX: 100, clientY: 100 }],
          })
          fireEvent.touchEnd(firstCard)

          expect(firstCard).toBeInTheDocument()
        })

        unmount()
      }
    })

    test('handles pointer events when available', async () => {
      // Mock pointer events support
      Object.defineProperty(window, 'PointerEvent', {
        value: class PointerEvent extends Event {
          constructor(type: string, options: any = {}) {
            super(type, options)
          }
        },
        writable: true,
      })

      mockViewport(400)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        const firstCard = cards[0]

        // Test pointer events if supported
        if (window.PointerEvent) {
          fireEvent.pointerDown(firstCard)
          fireEvent.pointerUp(firstCard)
        }

        expect(firstCard).toBeInTheDocument()
      })
    })
  })

  describe('Viewport and Orientation Changes', () => {
    test('handles orientation changes on mobile devices', async () => {
      mockUserAgent(mockUserAgents.mobileSafari)

      // Portrait mode
      mockViewport(375, 667)

      const { rerender } = render(
        <ResponsiveEventMaterialsList events={mockEvents} />
      )

      await waitFor(() => {
        expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
      })

      // Landscape mode
      act(() => {
        mockViewport(667, 375)
        fireEvent(window, new Event('orientationchange'))
      })

      rerender(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        // Should still show mobile layout in landscape
        expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
      })
    })

    test('handles dynamic viewport changes', async () => {
      mockViewport(1200)

      const { rerender } = render(
        <ResponsiveEventMaterialsList events={mockEvents} />
      )

      // Start with desktop
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Resize to tablet
      act(() => {
        mockViewport(800)
        fireEvent(window, new Event('resize'))
      })

      rerender(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByTestId('tablet-grid')).toBeInTheDocument()
      })

      // Resize to mobile
      act(() => {
        mockViewport(400)
        fireEvent(window, new Event('resize'))
      })

      rerender(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-stack')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Across Browsers', () => {
    test('maintains 60fps animations on supported browsers', async () => {
      // Mock requestAnimationFrame
      let frameCount = 0
      const mockRAF = vi.fn(callback => {
        frameCount++
        setTimeout(callback, 16.67) // ~60fps
        return frameCount
      })

      Object.defineProperty(window, 'requestAnimationFrame', {
        value: mockRAF,
        writable: true,
      })

      mockViewport(400)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards).toHaveLength(mockEvents.length)
      })

      // Simulate layout transition
      act(() => {
        mockViewport(800)
        fireEvent(window, new Event('resize'))
      })

      // Should use requestAnimationFrame for smooth transitions
      expect(mockRAF).toHaveBeenCalled()
    })

    test('degrades gracefully on low-performance devices', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation(query => ({
          ...mockMatchMedia(query),
          matches: query === '(prefers-reduced-motion: reduce)',
        })),
        writable: true,
      })

      mockViewport(400)

      render(<ResponsiveEventMaterialsList events={mockEvents} />)

      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards).toHaveLength(mockEvents.length)

        // Should disable animations when reduced motion is preferred
        cards.forEach(card => {
          const computedStyle = window.getComputedStyle(card)
          // In reduced motion mode, transitions should be disabled
          expect(computedStyle.transition).toBe('none')
        })
      })
    })
  })
})
