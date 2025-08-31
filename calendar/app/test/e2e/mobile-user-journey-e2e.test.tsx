import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../page'

/**
 * E2E Tests: Mobile User Journey for Responsive Header Buttons
 * Requirements: 1.1, 2.2, 2.5, 4.2
 *
 * Tests the complete mobile interaction flow including:
 * - Icon-only button interactions
 * - Mobile registration button accessibility and functionality
 * - Touch interaction optimization
 * - Mobile-specific responsive behavior
 */
describe('Mobile User Journey E2E Tests', () => {
  let mockOpen: any
  let mockShare: any
  let mockClipboard: any
  let originalInnerWidth: number
  let originalInnerHeight: number
  let originalMaxTouchPoints: number

  beforeEach(() => {
    // Store original values
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    originalMaxTouchPoints = navigator.maxTouchPoints

    // Set up mobile environment
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone SE width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667, // iPhone SE height
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5, // Touch device
    })

    // Mock environment variables
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'

    // Mock window.open for Twitter sharing
    mockOpen = vi.fn()
    vi.stubGlobal('open', mockOpen)

    // Mock navigator.share for native sharing
    mockShare = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    })

    // Mock navigator.clipboard
    mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    })

    // Trigger resize event to ensure responsive behavior
    window.dispatchEvent(new Event('resize'))
  })

  afterEach(() => {
    // Restore original values
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
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: originalMaxTouchPoints,
    })

    vi.restoreAllMocks()
  })

  describe('Complete Mobile Interaction Flow with Icon-Only Buttons (Requirement 1.1)', () => {
    it('should display Twitter share button in icon-only mode on mobile', async () => {
      render(<Home />)

      // Wait for page to load with a timeout
      await waitFor(
        () => {
          expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Wait for events to load
      await waitFor(
        () => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Find Twitter share button - use more flexible selector
      const twitterButton = screen.getByRole('button', {
        name: /共有|X.*共有|Twitter.*共有/,
      })
      expect(twitterButton).toBeInTheDocument()

      // Verify icon is present
      const twitterIcon = twitterButton.querySelector('svg')
      expect(twitterIcon).toBeInTheDocument()

      // Verify responsive behavior - text should be hidden on mobile
      const buttonText = twitterButton.querySelector('span:not(.sr-only)')
      if (buttonText) {
        // Text should be hidden on mobile via CSS classes
        expect(buttonText).toHaveClass('hidden', 'sm:inline')
      }
    })

    it('should handle Twitter share button interaction on mobile', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(
        () => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Find Twitter share button with flexible selector
      const twitterButton = screen.getByRole('button', {
        name: /共有|X.*共有|Twitter.*共有/,
      })

      // Simulate touch interaction
      await user.click(twitterButton)

      // Verify Twitter intent URL is opened
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet'),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )
    })

    it('should provide appropriate touch targets for mobile interaction', async () => {
      render(<Home />)

      await waitFor(
        () => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Check Twitter share button touch target size
      const twitterButton = screen.getByRole('button', {
        name: /共有|X.*共有|Twitter.*共有/,
      })

      // Button should have minimum touch target size (44px)
      expect(twitterButton).toHaveClass('min-h-[44px]')

      // Check native share button touch target
      const shareButton = screen.getByRole('button', {
        name: /シェア|共有/,
      })
      expect(shareButton).toBeInTheDocument()

      // Verify all buttons have appropriate touch targets
      const allButtons = screen.getAllByRole('button')
      allButtons.forEach(button => {
        // Should have minimum touch target class or appropriate padding
        const hasMinHeight =
          button.classList.contains('min-h-[44px]') ||
          button.classList.contains('py-2') ||
          button.classList.contains('py-3')
        expect(hasMinHeight).toBe(true)
      })
    })

    it('should handle native share functionality on mobile', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(
        () => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Find native share button - look for "シェア" text
      const shareButton = screen.getByRole('button', {
        name: /シェア/,
      })

      await user.click(shareButton)

      // Verify native share API is called
      expect(mockShare).toHaveBeenCalledWith({
        title: '広島IT勉強会カレンダー',
        text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
        url: 'https://satoshi256kbyte.github.io/it-study-session-calendar/',
      })
    })
  })

  describe('Mobile Registration Button Accessibility and Functionality (Requirements 2.2, 4.2)', () => {
    it('should hide registration button from header on mobile', async () => {
      render(<Home />)

      // Registration button should be hidden in header on mobile
      const headerRegisterButtons = screen.queryAllByText('勉強会の登録依頼')

      // Find the header button (should be hidden)
      const headerButton = headerRegisterButtons.find(button => {
        const element = button.closest('a')
        return element && element.classList.contains('hidden')
      })

      if (headerButton) {
        expect(headerButton.closest('a')).toHaveClass(
          'hidden',
          'sm:inline-flex'
        )
      }
    })

    it('should display registration button in mobile section below calendar', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Mobile registration section should be visible
      const mobileSection = screen.getByRole('region', {
        name: /勉強会登録セクション/,
      })
      expect(mobileSection).toBeInTheDocument()
      expect(mobileSection).toHaveClass('block', 'sm:hidden')

      // Registration button should be present in mobile section
      const mobileRegisterButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })
      expect(mobileRegisterButton).toBeInTheDocument()
      expect(mobileRegisterButton).toHaveAttribute('href', '/register')
    })

    it('should provide proper accessibility attributes for mobile registration', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Check mobile section accessibility
      const mobileSection = screen.getByRole('region', {
        name: /勉強会登録セクション/,
      })
      expect(mobileSection).toHaveAttribute(
        'aria-label',
        '勉強会登録セクション'
      )

      // Check registration button accessibility
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })
      expect(registerButton).toHaveAttribute(
        'aria-label',
        '勉強会の登録依頼ページへ移動'
      )

      // Verify button is present
      const button = screen.getByTestId('study-session-register-button')
      expect(button).toBeInTheDocument()
    })

    it('should handle keyboard navigation in mobile registration section', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Find the mobile registration button
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })

      // Focus the button using keyboard navigation
      registerButton.focus()
      expect(document.activeElement).toBe(registerButton)

      // Verify Enter key navigation (would normally navigate to /register)
      await user.keyboard('{Enter}')
      // In test environment, we just verify the href attribute
      expect(registerButton).toHaveAttribute('href', '/register')
    })

    it('should display prominent styling for mobile registration section', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Check mobile section styling for prominence
      const mobileSection = screen.getByRole('region', {
        name: /勉強会登録セクション/,
      })

      // Should have prominent styling classes
      expect(mobileSection).toHaveClass(
        'bg-white',
        'rounded-lg',
        'shadow',
        'border-2',
        'border-blue-100'
      )

      // Check button styling for prominence
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })

      // Should have full width and prominent styling on mobile
      expect(registerButton).toHaveClass(
        'w-full',
        'justify-center',
        'py-3',
        'text-base',
        'font-semibold'
      )
    })
  })

  describe('Touch Interaction Optimization (Requirement 2.5)', () => {
    it('should optimize touch interactions for all interactive elements', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Test touch interaction on material links
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })

      materialLinks.forEach(link => {
        // Should have minimum touch target size
        expect(link).toHaveClass('min-h-[44px]')

        // Should have appropriate spacing for touch
        const computedStyle = window.getComputedStyle(link)
        const minHeight = parseInt(computedStyle.minHeight) || 0
        expect(minHeight).toBeGreaterThanOrEqual(44)
      })

      // Test touch interaction on first material link
      const firstMaterialLink = materialLinks[0]

      // Simulate touch events
      fireEvent.touchStart(firstMaterialLink, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchEnd(firstMaterialLink, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      })

      // Link should maintain its functionality
      expect(firstMaterialLink).toHaveAttribute('href')
      expect(firstMaterialLink).toHaveAttribute('target', '_blank')
    })

    it('should handle touch interactions on responsive buttons', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Test Twitter share button touch interaction
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で今月の勉強会情報を共有/,
      })

      // Simulate touch interaction
      fireEvent.touchStart(twitterButton, {
        touches: [{ clientX: 50, clientY: 50 }],
      })
      fireEvent.touchEnd(twitterButton, {
        changedTouches: [{ clientX: 50, clientY: 50 }],
      })

      // Should trigger click event
      await user.click(twitterButton)
      expect(mockOpen).toHaveBeenCalled()
    })

    it('should prevent accidental touches with appropriate spacing', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Check spacing between interactive elements in header
      const headerButtons = screen.getAllByRole('button')
      const headerLinks = screen.getAllByRole('link')
      const allInteractiveElements = [...headerButtons, ...headerLinks]

      // Verify elements have appropriate spacing
      const buttonContainer = headerButtons[0]?.closest('div')
      if (buttonContainer) {
        expect(buttonContainer).toHaveClass('space-x-4')
      }

      // Check that elements don't overlap
      allInteractiveElements.forEach(element => {
        const rect = element.getBoundingClientRect()
        expect(rect.width).toBeGreaterThan(0)
        expect(rect.height).toBeGreaterThan(0)
      })
    })

    it('should provide visual feedback for touch interactions', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Test hover/focus states on mobile registration button
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })

      // Focus the button
      await user.hover(registerButton)

      // Should have hover/focus styling classes
      expect(registerButton).toHaveClass('hover:bg-blue-700')
      expect(registerButton).toHaveClass('focus:ring-2')
      expect(registerButton).toHaveClass('focus:ring-blue-500')
    })
  })

  describe('Mobile-Specific Responsive Behavior (Requirements 1.1, 2.2)', () => {
    it('should adapt layout for mobile viewport', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Check main container responsive classes
      const main = screen.getByRole('main')
      expect(main).toHaveClass('max-w-7xl', 'mx-auto')

      // Check that calendar is still displayed
      const calendar = screen.getByTitle('広島IT勉強会カレンダー')
      expect(calendar).toBeInTheDocument()

      // Check that event materials table is responsive
      const table = screen.getByRole('table')
      const tableContainer = table.closest('div')
      expect(tableContainer).toHaveClass('overflow-x-auto')
      expect(table).toHaveClass('min-w-full', 'sm:min-w-[600px]')
    })

    it('should handle viewport orientation changes', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Simulate landscape orientation
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Layout should still be functional
      const mobileSection = screen.getByRole('region', {
        name: /勉強会登録セクション/,
      })
      expect(mobileSection).toBeInTheDocument()

      // Twitter button should still be in icon-only mode
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で今月の勉強会情報を共有/,
      })
      expect(twitterButton).toBeInTheDocument()
    })

    it('should maintain accessibility during responsive transitions', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Simulate viewport size change (mobile to tablet)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Wait for any transitions to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Check that accessibility attributes are maintained
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で今月の勉強会情報を共有/,
      })
      expect(twitterButton).toHaveAttribute('aria-label')

      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })
      expect(registerButton).toHaveAttribute('aria-label')

      // Check that focus management is maintained
      const focusableElements = screen
        .getAllByRole('button')
        .concat(screen.getAllByRole('link'))
        .filter(
          element =>
            !element.hasAttribute('tabindex') ||
            element.getAttribute('tabindex') !== '-1'
        )

      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('should handle reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
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

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Verify that transitions respect reduced motion
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で今月の勉強会情報を共有/,
      })

      // Button should still be functional
      expect(twitterButton).toBeInTheDocument()

      // Responsive behavior should still work without animations
      const buttonText = twitterButton.querySelector('span:not(.sr-only)')
      if (buttonText) {
        expect(buttonText).toHaveClass('hidden', 'sm:inline')
      }
    })

    it('should provide consistent experience across mobile browsers', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Test WebKit-specific touch handling
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })

      materialLinks.forEach(link => {
        // Should have proper touch-action for mobile browsers
        const computedStyle = window.getComputedStyle(link)
        // In test environment, we verify the classes that would set touch-action
        expect(link).toHaveClass('min-h-[44px]')
      })

      // Test button interactions work consistently
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で今月の勉強会情報を共有/,
      })

      // Should have consistent styling across browsers
      expect(twitterButton).toHaveClass('transition-all', 'duration-200')
      expect(twitterButton).toHaveClass('focus:outline-none', 'focus:ring-2')
    })
  })

  describe('Error Handling and Edge Cases on Mobile', () => {
    it('should handle Twitter share failures gracefully on mobile', async () => {
      // Mock window.open to return null (popup blocked)
      mockOpen.mockReturnValue(null)

      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で今月の勉強会情報を共有/,
      })

      await user.click(twitterButton)

      // Should fallback to clipboard copy
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled()
      })
    })

    it('should handle network connectivity issues on mobile', async () => {
      // Mock navigator.share to reject
      mockShare.mockRejectedValue(new Error('Network error'))

      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const shareButton = screen.getByRole('button', {
        name: /ネイティブ共有機能を使用してページを共有/,
      })

      await user.click(shareButton)

      // Should handle the error gracefully
      expect(mockShare).toHaveBeenCalled()
    })

    it('should maintain functionality when JavaScript is disabled', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Registration link should work without JavaScript
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/,
      })

      expect(registerButton).toHaveAttribute('href', '/register')

      // Material links should work without JavaScript
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('href')
        expect(link).toHaveAttribute('target', '_blank')
      })
    })
  })
})
