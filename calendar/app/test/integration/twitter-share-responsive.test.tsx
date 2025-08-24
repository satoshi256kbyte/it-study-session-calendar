/**
 * Twitter Share Button Responsive Design Integration Tests
 * 要件2.2, 2.3: モバイル対応とレスポンシブ表示テスト
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import TwitterShareButton from '../../components/TwitterShareButton'

// Viewport size mocking utility
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

  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// CSS media query matching mock
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

describe('TwitterShareButton Responsive Design Tests', () => {
  const defaultProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会 #1\n01/28 Python入門セミナー\n\n詳細はこちら: https://example.com/calendar',
    calendarUrl: 'https://example.com/calendar',
  }

  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(mockMatchMedia),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Mobile Viewport (320px - 767px)', () => {
    beforeEach(() => {
      mockViewport(375, 667) // iPhone SE size
    })

    test('should display mobile-optimized button text', () => {
      render(<TwitterShareButton {...defaultProps} />)

      // Get all text elements
      const textElements = screen.getAllByText('共有')
      const mobileText = textElements.find(el =>
        el.classList.contains('sm:hidden')
      )
      const desktopText = textElements.find(
        el =>
          el.classList.contains('hidden') && el.classList.contains('sm:inline')
      )

      expect(mobileText).toBeInTheDocument()
      expect(mobileText).toHaveClass('sm:hidden')
      expect(desktopText).toBeInTheDocument()
      expect(desktopText).toHaveClass('hidden', 'sm:inline')
    })

    test('should have touch-friendly button size on mobile', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Should have minimum touch target size (44px)
      expect(shareButton).toHaveClass('min-h-[44px]')

      // Should have appropriate padding for touch
      expect(shareButton).toHaveClass('px-3', 'py-2')
    })

    test('should display loading state appropriately on mobile', () => {
      render(<TwitterShareButton {...defaultProps} isLoading />)

      // Mobile loading text should be shorter
      const mobileLoadingText = screen.getByText('...')
      expect(mobileLoadingText).toHaveClass('sm:hidden')

      // Desktop loading text should be hidden
      const desktopLoadingText = screen.getByText('共有中...')
      expect(desktopLoadingText).toHaveClass('hidden', 'sm:inline')
    })

    test('should show tooltip on mobile hover/focus', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const tooltipContainer = screen
        .getByText('今月の勉強会をXで共有')
        .closest('div')
      expect(tooltipContainer).toHaveClass('group-hover:opacity-100')
    })
  })

  describe('Tablet Viewport (768px - 1023px)', () => {
    beforeEach(() => {
      mockViewport(768, 1024) // iPad size
    })

    test('should display desktop text on tablet', () => {
      render(<TwitterShareButton {...defaultProps} />)

      // Desktop text should be visible on tablet
      const textElements = screen.getAllByText('共有')
      const desktopText = textElements.find(
        el =>
          el.classList.contains('hidden') && el.classList.contains('sm:inline')
      )
      expect(desktopText).toBeInTheDocument()
      expect(desktopText).toHaveClass('hidden', 'sm:inline')
    })

    test('should use standard button height on tablet', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')

      // Should reset mobile min-height on larger screens
      expect(shareButton).toHaveClass('sm:min-h-0')
    })
  })

  describe('Desktop Viewport (1024px+)', () => {
    beforeEach(() => {
      mockViewport(1920, 1080) // Desktop size
    })

    test('should display full desktop text', () => {
      render(<TwitterShareButton {...defaultProps} />)

      // Get all text elements
      const textElements = screen.getAllByText('共有')
      const desktopText = textElements.find(
        el =>
          el.classList.contains('hidden') && el.classList.contains('sm:inline')
      )
      const mobileText = textElements.find(el =>
        el.classList.contains('sm:hidden')
      )

      expect(desktopText).toBeInTheDocument()
      expect(desktopText).toHaveClass('hidden', 'sm:inline')
      expect(mobileText).toBeInTheDocument()
      expect(mobileText).toHaveClass('sm:hidden')
    })

    test('should show full loading text on desktop', () => {
      render(<TwitterShareButton {...defaultProps} isLoading />)

      const desktopLoadingText = screen.getByText('共有中...')
      expect(desktopLoadingText).toHaveClass('hidden', 'sm:inline')
    })

    test('should have hover effects on desktop', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveClass(
        'hover:bg-gray-50',
        'hover:border-gray-400'
      )
    })
  })

  describe('Button States Responsive Behavior', () => {
    test('should maintain responsive design in disabled state', () => {
      render(<TwitterShareButton {...defaultProps} disabled />)

      const shareButton = screen.getByRole('button')

      // Should maintain mobile touch target size even when disabled
      expect(shareButton).toHaveClass('min-h-[44px]', 'sm:min-h-0')

      // Should have disabled styling
      expect(shareButton).toHaveClass('cursor-not-allowed', 'opacity-60')
    })

    test('should maintain responsive design in loading state', () => {
      render(<TwitterShareButton {...defaultProps} isLoading />)

      const shareButton = screen.getByRole('button')

      // Should maintain responsive classes
      expect(shareButton).toHaveClass('min-h-[44px]', 'sm:min-h-0')

      // Loading spinner should be appropriately sized
      const spinner = shareButton.querySelector('.animate-spin')
      expect(spinner).toHaveClass('h-4', 'w-4')
    })

    test('should maintain responsive design in error state', () => {
      render(<TwitterShareButton {...defaultProps} hasError />)

      const shareButton = screen.getByRole('button')

      // Should maintain responsive classes with error styling
      expect(shareButton).toHaveClass('min-h-[44px]', 'sm:min-h-0')
      expect(shareButton).toHaveClass(
        'border-red-300',
        'text-red-700',
        'bg-red-50'
      )
    })
  })

  describe('Icon and Text Layout', () => {
    test('should maintain proper icon-text spacing across screen sizes', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const icon = screen.getByRole('button').querySelector('svg')
      expect(icon).toHaveClass('w-4', 'h-4', 'mr-2', 'flex-shrink-0')
    })

    test('should handle icon in loading state responsively', () => {
      render(<TwitterShareButton {...defaultProps} isLoading />)

      const mainIcon = screen
        .getByRole('button')
        .querySelector('svg:not(.animate-spin)')
      const spinner = screen.getByRole('button').querySelector('.animate-spin')

      expect(mainIcon).toHaveClass('opacity-50')
      expect(spinner).toHaveClass('h-4', 'w-4', 'flex-shrink-0')
    })

    test('should handle icon in error state responsively', () => {
      render(<TwitterShareButton {...defaultProps} hasError />)

      const errorIcon = screen
        .getByRole('button')
        .querySelector('svg[stroke="currentColor"]')
      expect(errorIcon).toHaveClass('w-4', 'h-4', 'mr-1', 'flex-shrink-0')
    })
  })

  describe('Tooltip Responsive Behavior', () => {
    test('should position tooltip correctly on different screen sizes', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const tooltip = screen.getByText('今月の勉強会をXで共有').closest('div')

      // Should have responsive positioning classes
      expect(tooltip).toHaveClass(
        'absolute',
        'bottom-full',
        'left-1/2',
        'transform',
        '-translate-x-1/2',
        'mb-2'
      )

      // Should have z-index for proper layering
      expect(tooltip).toHaveClass('z-10')
    })

    test('should show appropriate tooltip text for different states', () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      // Normal state
      expect(screen.getByText('今月の勉強会をXで共有')).toBeInTheDocument()

      // Loading state
      rerender(<TwitterShareButton {...defaultProps} isLoading />)
      expect(screen.getByText('X共有の準備中...')).toBeInTheDocument()

      // Error state
      rerender(<TwitterShareButton {...defaultProps} hasError />)
      expect(screen.getByText('クリックして再試行')).toBeInTheDocument()
    })
  })

  describe('Focus and Interaction States', () => {
    test('should maintain focus ring visibility across screen sizes', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500'
      )
    })

    test('should handle transition effects responsively', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveClass('transition-colors', 'duration-200')
    })
  })

  describe('Accessibility on Different Screen Sizes', () => {
    test('should maintain screen reader text across all viewports', () => {
      render(<TwitterShareButton {...defaultProps} />)

      // Screen reader help text should always be present
      expect(
        screen.getByText('今月の勉強会情報をX（旧Twitter）で共有します')
      ).toBeInTheDocument()

      // Should have sr-only class on parent container
      const helpText = screen.getByText(
        '今月の勉強会情報をX（旧Twitter）で共有します'
      )
      const helpContainer = helpText.closest('div[class*="sr-only"]')
      expect(helpContainer).toBeInTheDocument()
    })

    test('should maintain proper ARIA attributes on all screen sizes', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const shareButton = screen.getByRole('button')
      expect(shareButton).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で勉強会情報を共有する'
      )
      expect(shareButton).toHaveAttribute('role', 'button')
      expect(shareButton).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Performance on Different Devices', () => {
    test('should not cause layout shifts during state changes', () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      const initialButton = screen.getByRole('button')
      const initialClasses = initialButton.className

      // State change should not cause major layout shifts
      rerender(<TwitterShareButton {...defaultProps} isLoading />)

      const loadingButton = screen.getByRole('button')

      // Core layout classes should remain consistent
      expect(loadingButton).toHaveClass('min-h-[44px]', 'sm:min-h-0')
      expect(loadingButton).toHaveClass('px-3', 'py-2')
    })

    test('should handle rapid viewport changes gracefully', () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      // Simulate rapid viewport changes
      mockViewport(320, 568) // Mobile
      rerender(<TwitterShareButton {...defaultProps} />)

      mockViewport(768, 1024) // Tablet
      rerender(<TwitterShareButton {...defaultProps} />)

      mockViewport(1920, 1080) // Desktop
      rerender(<TwitterShareButton {...defaultProps} />)

      // Should still render correctly
      const shareButton = screen.getByRole('button')
      expect(shareButton).toBeInTheDocument()
      expect(shareButton).toHaveClass('min-h-[44px]', 'sm:min-h-0')
    })
  })
})
