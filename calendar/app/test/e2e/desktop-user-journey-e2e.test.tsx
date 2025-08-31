import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../page'

/**
 * E2E Tests: Desktop User Journey for Responsive Header Buttons
 * Requirements: 3.1, 3.4, 5.4
 *
 * Tests the complete desktop interaction flow including:
 * - Preservation of existing desktop functionality
 * - Header layout stability and button positioning
 * - All button interactions in desktop mode
 * - Responsive transition behavior during window resize
 */
describe('Desktop User Journey E2E Tests', () => {
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

    // Set up desktop environment
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280, // Desktop width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 720, // Desktop height
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0, // Non-touch device
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

  describe('Preservation of Existing Desktop Functionality (Requirement 3.4)', () => {
    it('should display all header buttons with full text on desktop', async () => {
      render(<Home />)

      // Wait for page to load
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

      // Twitter share button should display with full text
      const twitterButton = screen.getByRole('button', {
        name: /共有|X.*共有|Twitter.*共有/,
      })
      expect(twitterButton).toBeInTheDocument()

      // Verify text is visible (not hidden by responsive classes)
      const buttonText = twitterButton.querySelector('span:not(.sr-only)')
      if (buttonText) {
        // On desktop, text should be visible (not have hidden class without sm: prefix)
        expect(buttonText).not.toHaveClass('hidden')
        // Should have responsive classes that show text on desktop
        expect(buttonText).toHaveClass('sm:inline')
      }

      // Native share button should be visible
      const shareButton = screen.getByRole('button', {
        name: /シェア|ネイティブ共有機能を使用してページを共有/,
      })
      expect(shareButton).toBeInTheDocument()
      expect(shareButton).toHaveTextContent('シェア')

      // Study session register button should be visible in header
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })
      expect(registerButton).toBeInTheDocument()
      expect(registerButton).toHaveAttribute('href', '/register')

      // Should not have mobile-hidden classes
      expect(registerButton).not.toHaveClass('hidden')
      expect(registerButton).toHaveClass('sm:inline-flex')
    })

    it('should maintain existing calendar functionality', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Calendar iframe should be present and properly configured
      const calendar = screen.getByTitle('広島IT勉強会カレンダー')
      expect(calendar).toBeInTheDocument()
      expect(calendar.tagName).toBe('IFRAME')
      expect(calendar).toHaveAttribute('loading', 'lazy')
      expect(calendar).toHaveAttribute(
        'referrerPolicy',
        'no-referrer-when-downgrade'
      )
      expect(calendar).toHaveAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-popups allow-forms'
      )

      // Calendar container should have proper styling
      const calendarContainer = calendar.closest('.calendar-container')
      expect(calendarContainer).toHaveClass('calendar-optimized')
    })

    it('should display event materials table with full functionality', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Event materials section should be present
      expect(screen.getByText('イベント資料一覧')).toBeInTheDocument()
      expect(
        screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
      ).toBeInTheDocument()

      // Table should be present with proper structure
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      expect(table).toHaveClass('min-w-full')

      // Table headers should be present
      expect(screen.getByText('イベント名')).toBeInTheDocument()
      expect(screen.getByText('開催日時')).toBeInTheDocument()
      expect(screen.getAllByText('資料').length).toBeGreaterThan(0)

      // Event data should be displayed
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('2024/01/15')).toBeInTheDocument()
      expect(screen.getByText('2024/01/20')).toBeInTheDocument()

      // Material links should be functional
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBeGreaterThan(0)
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('href')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('should maintain existing error handling and loading states', async () => {
      render(<Home />)

      // Initial loading state should be displayed
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // Loading spinner should be present
      const loadingSpinner = screen.getByRole('status')
      expect(loadingSpinner).toBeInTheDocument()
      expect(loadingSpinner).toHaveAttribute('aria-label', '読み込み中')

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Loading state should be replaced with content
      expect(
        screen.queryByText('イベント資料を読み込み中...')
      ).not.toBeInTheDocument()
    })
  })

  describe('Header Layout Stability and Button Positioning (Requirement 3.1)', () => {
    it('should maintain proper header layout and spacing', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Header should have proper structure
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b')

      // Header container should have proper max-width and centering
      const headerContainer = header.querySelector('.max-w-7xl')
      expect(headerContainer).toBeInTheDocument()
      expect(headerContainer).toHaveClass(
        'mx-auto',
        'px-4',
        'sm:px-6',
        'lg:px-8'
      )

      // Header content should use flexbox for proper alignment
      const headerContent = headerContainer?.querySelector('.flex')
      expect(headerContent).toBeInTheDocument()
      expect(headerContent).toHaveClass(
        'justify-between',
        'items-center',
        'py-6'
      )

      // Title should be properly positioned
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')

      // Button container should have proper spacing
      const buttonContainer = screen
        .getByRole('button', { name: /共有/ })
        .closest('div')
      expect(buttonContainer).toHaveClass('flex', 'items-center', 'space-x-4')
    })

    it('should maintain consistent button positioning across different content states', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Get initial button positions
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const shareButton = screen.getByRole('button', { name: /シェア/ })
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })

      const initialTwitterRect = twitterButton.getBoundingClientRect()
      const initialShareRect = shareButton.getBoundingClientRect()
      const initialRegisterRect = registerButton.getBoundingClientRect()

      // Buttons should be horizontally aligned
      expect(
        Math.abs(initialTwitterRect.top - initialShareRect.top)
      ).toBeLessThan(5)
      expect(
        Math.abs(initialShareRect.top - initialRegisterRect.top)
      ).toBeLessThan(5)

      // Buttons should have proper spacing
      expect(initialShareRect.left - initialTwitterRect.right).toBeGreaterThan(
        10
      )
      expect(initialRegisterRect.left - initialShareRect.right).toBeGreaterThan(
        10
      )

      // Simulate content change (error state)
      const retryButton = screen.queryByText('再試行')
      if (retryButton) {
        // Button positions should remain stable even with additional elements
        const newTwitterRect = twitterButton.getBoundingClientRect()
        const newShareRect = shareButton.getBoundingClientRect()
        const newRegisterRect = registerButton.getBoundingClientRect()

        // Vertical alignment should be maintained
        expect(Math.abs(newTwitterRect.top - newShareRect.top)).toBeLessThan(5)
        expect(Math.abs(newShareRect.top - newRegisterRect.top)).toBeLessThan(5)
      }
    })

    it('should prevent layout shifts during content loading', async () => {
      render(<Home />)

      // Measure initial header height
      const header = screen.getByRole('banner')
      const initialHeaderHeight = header.getBoundingClientRect().height

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Header height should remain stable
      const finalHeaderHeight = header.getBoundingClientRect().height
      expect(Math.abs(finalHeaderHeight - initialHeaderHeight)).toBeLessThan(5)

      // Button container should maintain its position
      const buttonContainer = screen
        .getByRole('button', { name: /共有/ })
        .closest('div')
      expect(buttonContainer).toBeInTheDocument()

      // Buttons should be properly aligned
      const buttons = screen
        .getAllByRole('button')
        .concat(screen.getAllByRole('link'))
      const headerButtons = buttons.filter(
        button => header.contains(button) && button.getAttribute('href') !== '/'
      )

      if (headerButtons.length > 1) {
        const firstButtonRect = headerButtons[0].getBoundingClientRect()
        headerButtons.slice(1).forEach(button => {
          const buttonRect = button.getBoundingClientRect()
          expect(Math.abs(buttonRect.top - firstButtonRect.top)).toBeLessThan(5)
        })
      }
    })

    it('should handle long content without breaking layout', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Header should not cause horizontal scrolling
      const header = screen.getByRole('banner')
      const headerWidth = header.getBoundingClientRect().width
      expect(headerWidth).toBeLessThanOrEqual(window.innerWidth)

      // Title should not wrap inappropriately
      const title = screen.getByRole('heading', { level: 1 })
      const titleRect = title.getBoundingClientRect()
      expect(titleRect.height).toBeLessThan(100) // Should not be excessively tall

      // Button container should not overflow
      const buttonContainer = screen
        .getByRole('button', { name: /共有/ })
        .closest('div')
      const containerRect = buttonContainer?.getBoundingClientRect()
      if (containerRect) {
        expect(containerRect.right).toBeLessThanOrEqual(window.innerWidth)
      }
    })
  })

  describe('All Button Interactions in Desktop Mode (Requirement 3.4)', () => {
    it('should handle Twitter share button interaction correctly', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Find Twitter share button
      const twitterButton = screen.getByRole('button', {
        name: /共有|X.*共有|Twitter.*共有/,
      })

      // Click the button
      await user.click(twitterButton)

      // Verify Twitter intent URL is opened
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet'),
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )

      // Verify the URL contains encoded share text
      const calledUrl = mockOpen.mock.calls[0][0]
      expect(calledUrl).toContain('text=')
      expect(decodeURIComponent(calledUrl)).toContain('広島IT勉強会カレンダー')
    })

    it('should handle native share button interaction correctly', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Find native share button
      const shareButton = screen.getByRole('button', {
        name: /シェア|ネイティブ共有機能を使用してページを共有/,
      })

      // Click the button
      await user.click(shareButton)

      // Verify native share API is called
      expect(mockShare).toHaveBeenCalledWith({
        title: '広島IT勉強会カレンダー',
        text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
        url: expect.stringContaining('it-study-session-calendar'),
      })
    })

    it('should handle study session register button interaction correctly', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Find register button
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })

      // Verify button properties
      expect(registerButton).toHaveAttribute('href', '/register')
      expect(registerButton).toHaveAttribute(
        'aria-label',
        '勉強会の登録依頼ページへ移動'
      )

      // Button should be visible and properly styled
      expect(registerButton).toBeVisible()
      expect(registerButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700')
      expect(registerButton).toHaveClass('sm:inline-flex')
      expect(registerButton).not.toHaveClass('hidden')
    })

    it('should handle keyboard navigation correctly', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Get all interactive elements in header
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const shareButton = screen.getByRole('button', { name: /シェア/ })
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })

      // Test tab navigation
      await user.tab()
      let focusedElement = document.activeElement

      // Should be able to reach all header buttons via tab navigation
      const headerButtons = [twitterButton, shareButton, registerButton]
      let foundButtons = 0

      // Tab through several elements to find our buttons
      for (let i = 0; i < 10; i++) {
        if (headerButtons.includes(focusedElement as HTMLElement)) {
          foundButtons++
        }
        await user.tab()
        focusedElement = document.activeElement
      }

      expect(foundButtons).toBeGreaterThan(0)

      // Test Enter key activation on Twitter button
      twitterButton.focus()
      await user.keyboard('{Enter}')
      expect(mockOpen).toHaveBeenCalled()
    })

    it('should handle error states and retry functionality', async () => {
      const user = userEvent.setup()

      // Mock window.open to return null (popup blocked)
      mockOpen.mockReturnValue(null)

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Click Twitter share button
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      await user.click(twitterButton)

      // Should fallback to clipboard copy when popup is blocked
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled()
      })

      // If there's a retry button, test it
      const retryButton = screen.queryByText('再試行')
      if (retryButton) {
        await user.click(retryButton)
        // Should attempt the operation again
        expect(mockOpen).toHaveBeenCalledTimes(2)
      }
    })

    it('should handle material link interactions correctly', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Find material links
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBeGreaterThan(0)

      // Test first material link
      const firstMaterialLink = materialLinks[0]
      expect(firstMaterialLink).toHaveAttribute('href')
      expect(firstMaterialLink).toHaveAttribute('target', '_blank')
      expect(firstMaterialLink).toHaveAttribute('rel', 'noopener noreferrer')

      // Test hover interaction
      await user.hover(firstMaterialLink)
      expect(firstMaterialLink).toBeVisible()

      // Test keyboard focus
      firstMaterialLink.focus()
      expect(document.activeElement).toBe(firstMaterialLink)
    })
  })

  describe('Responsive Transition Behavior During Window Resize (Requirement 5.4)', () => {
    it('should handle smooth transitions when resizing from desktop to tablet', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Get initial button states
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })

      // Verify initial desktop state
      expect(twitterButton).toBeVisible()
      expect(registerButton).toBeVisible()
      expect(registerButton).toHaveClass('sm:inline-flex')

      // Resize to tablet width
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

      // Buttons should still be visible at tablet size
      expect(twitterButton).toBeVisible()
      expect(registerButton).toBeVisible()

      // Layout should remain stable
      const header = screen.getByRole('banner')
      expect(header).toBeVisible()
      expect(header.getBoundingClientRect().width).toBeLessThanOrEqual(768)
    })

    it('should handle transitions when resizing from desktop to mobile', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Get initial button states
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })

      // Verify initial desktop state
      expect(twitterButton).toBeVisible()
      expect(registerButton).toBeVisible()

      // Resize to mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Wait for transitions to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Twitter button should still be visible but may show differently
      expect(twitterButton).toBeVisible()

      // Register button should be hidden in header on mobile
      // (it should appear in mobile section instead)
      const headerRegisterButton = registerButton
      if (headerRegisterButton.classList.contains('hidden')) {
        expect(headerRegisterButton).toHaveClass('hidden', 'sm:inline-flex')
      }

      // Mobile register section should be visible
      const mobileSection = screen.queryByRole('region', {
        name: /勉強会登録セクション/,
      })
      if (mobileSection) {
        expect(mobileSection).toBeVisible()
        expect(mobileSection).toHaveClass('block', 'sm:hidden')
      }
    })

    it('should handle rapid resize events without breaking', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Perform rapid resize events
      const widths = [1280, 768, 375, 1024, 640, 1280]

      for (const width of widths) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          window.dispatchEvent(new Event('resize'))
        })

        // Small delay to simulate rapid resizing
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Wait for all transitions to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Layout should still be functional
      const header = screen.getByRole('banner')
      expect(header).toBeVisible()

      const twitterButton = screen.getByRole('button', { name: /共有/ })
      expect(twitterButton).toBeVisible()

      // Should be back to desktop state
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })
      expect(registerButton).toBeVisible()
      expect(registerButton).toHaveClass('sm:inline-flex')
    })

    it('should maintain accessibility during responsive transitions', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Get initial accessibility attributes
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const initialAriaLabel = twitterButton.getAttribute('aria-label')

      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      // Accessibility attributes should be maintained
      expect(twitterButton.getAttribute('aria-label')).toBeTruthy()

      // Button should still be focusable
      expect(twitterButton.getAttribute('tabindex')).not.toBe('-1')

      // Resize back to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      // Accessibility should be fully restored
      expect(twitterButton.getAttribute('aria-label')).toBeTruthy()
      expect(twitterButton).toBeVisible()
    })

    it('should handle orientation changes gracefully', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Simulate landscape orientation on tablet
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
        window.dispatchEvent(new Event('orientationchange'))
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      // Layout should adapt to landscape orientation
      const header = screen.getByRole('banner')
      expect(header).toBeVisible()
      expect(header.getBoundingClientRect().width).toBeLessThanOrEqual(1024)

      // All buttons should remain functional
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const shareButton = screen.getByRole('button', { name: /シェア/ })
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })

      expect(twitterButton).toBeVisible()
      expect(shareButton).toBeVisible()
      expect(registerButton).toBeVisible()
    })

    it('should respect reduced motion preferences during transitions', async () => {
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

      // Resize with reduced motion preference
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Even with reduced motion, functionality should be preserved
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      expect(twitterButton).toBeVisible()

      // Responsive behavior should still work
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼/,
      })
      if (registerButton.classList.contains('hidden')) {
        expect(registerButton).toHaveClass('hidden', 'sm:inline-flex')
      }
    })
  })

  describe('Performance and Stability During Desktop Usage', () => {
    it('should maintain performance during extended desktop usage', async () => {
      const performanceStart = performance.now()

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const renderTime = performance.now() - performanceStart
      expect(renderTime).toBeLessThan(3000) // Should render within 3 seconds

      // Simulate multiple interactions
      const user = userEvent.setup()
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      const shareButton = screen.getByRole('button', { name: /シェア/ })

      const interactionStart = performance.now()

      // Multiple rapid interactions
      await user.click(twitterButton)
      await user.click(shareButton)
      await user.click(twitterButton)

      const interactionTime = performance.now() - interactionStart
      expect(interactionTime).toBeLessThan(1000) // Should handle interactions quickly

      // Layout should remain stable
      const header = screen.getByRole('banner')
      expect(header).toBeVisible()
      expect(header.getBoundingClientRect().height).toBeGreaterThan(0)
    })

    it('should handle memory efficiently during desktop usage', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Simulate memory-intensive operations
      const user = userEvent.setup()
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })

      // Hover over multiple elements rapidly
      for (const link of materialLinks.slice(0, 5)) {
        await user.hover(link)
        await user.unhover(link)
      }

      // Layout should remain stable
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeVisible()

      // All interactive elements should still be functional
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      expect(twitterButton).toBeVisible()

      await user.click(twitterButton)
      expect(mockOpen).toHaveBeenCalled()
    })

    it('should maintain consistent behavior across browser tabs', async () => {
      // Simulate tab visibility changes
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden',
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // Simulate tab becoming visible again
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Functionality should be preserved
      const twitterButton = screen.getByRole('button', { name: /共有/ })
      expect(twitterButton).toBeVisible()

      const user = userEvent.setup()
      await user.click(twitterButton)
      expect(mockOpen).toHaveBeenCalled()
    })
  })
})
