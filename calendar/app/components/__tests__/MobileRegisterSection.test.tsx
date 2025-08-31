import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MobileRegisterSection from '../MobileRegisterSection'

// Mock the StudySessionRegisterButton component
vi.mock('../StudySessionRegisterButton', () => ({
  default: ({ displayMode, responsive, className }: any) => (
    <div
      data-testid="study-session-register-button"
      data-display-mode={displayMode}
      data-responsive={responsive}
      className={className}
      tabIndex={0}
      role="button"
      aria-label="勉強会の登録依頼ページへ移動"
    >
      勉強会の登録依頼
    </div>
  ),
}))

describe('MobileRegisterSection', () => {
  it('renders the mobile register section with proper structure', () => {
    render(<MobileRegisterSection />)

    // Check if the section is rendered
    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    expect(section).toBeInTheDocument()

    // Check if the button is present
    const button = screen.getByTestId('study-session-register-button')
    expect(button).toBeInTheDocument()
  })

  it('has mobile-only responsive classes (hidden on desktop/tablet)', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })

    // Check if it has the mobile-only classes
    expect(section).toHaveClass('block', 'sm:hidden')
  })

  it('renders StudySessionRegisterButton with correct props', () => {
    render(<MobileRegisterSection />)

    const button = screen.getByTestId('study-session-register-button')

    // Check if the button has correct props
    expect(button).toHaveAttribute('data-display-mode', 'mobile-section')
    expect(button).toHaveAttribute('data-responsive', 'true')
    expect(button).toHaveClass('w-full')
  })

  it('has simple styling for clean appearance', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })

    // Check for basic styling classes
    expect(section).toHaveClass('block', 'sm:hidden', 'mt-6', 'px-4')
  })

  it('has proper spacing and layout classes', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })

    // Check for proper spacing
    expect(section).toHaveClass('mt-6', 'px-4')
  })

  it('accepts custom className prop', () => {
    const customClass = 'custom-test-class'
    render(<MobileRegisterSection className={customClass} />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    expect(section).toHaveClass(customClass)
  })

  it('has proper accessibility attributes', () => {
    render(<MobileRegisterSection />)

    // Check for proper ARIA label
    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    expect(section).toHaveAttribute('aria-label', '勉強会登録セクション')

    // Check for button accessibility
    const button = screen.getByTestId('study-session-register-button')
    expect(button).toHaveAttribute('aria-label', '勉強会の登録依頼ページへ移動')
  })

  it('has simple centered layout', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    const centerDiv = section.querySelector('.text-center')
    expect(centerDiv).toBeInTheDocument()
  })

  it('displays button in proper layout', () => {
    render(<MobileRegisterSection />)

    // Check if button is properly contained
    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    const button = screen.getByTestId('study-session-register-button')

    // Verify the button is contained within the section
    expect(section).toContainElement(button)
  })

  it('uses text-center for centered layout', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    const innerDiv = section.querySelector('.text-center')

    expect(innerDiv).toBeInTheDocument()
    expect(innerDiv).toHaveClass('text-center')
  })

  describe('Responsive Visibility Logic', () => {
    it('is hidden on desktop screens (sm breakpoint and above)', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have sm:hidden class to hide on desktop/tablet
      expect(section).toHaveClass('sm:hidden')
    })

    it('is visible on mobile screens (below sm breakpoint)', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have block class to show on mobile
      expect(section).toHaveClass('block')
    })

    it('uses correct responsive display classes', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have both block (mobile) and sm:hidden (desktop) classes
      expect(section).toHaveClass('block', 'sm:hidden')
    })
  })

  describe('Positioning and Styling', () => {
    it('has proper positioning below calendar with mt-6', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have top margin to position below calendar
      expect(section).toHaveClass('mt-6')
    })

    it('has proper horizontal padding for mobile layout', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have horizontal padding for mobile
      expect(section).toHaveClass('px-4')
    })

    it('has simple clean styling', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have basic styling classes
      expect(section).toHaveClass('block', 'sm:hidden', 'mt-6', 'px-4')
    })

    it('has proper internal layout', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      const innerDiv = section.querySelector('.text-center')

      expect(innerDiv).toBeInTheDocument()
      expect(innerDiv).toHaveClass('text-center')
    })
  })

  describe('Accessibility and Keyboard Navigation', () => {
    it('has proper semantic HTML structure', () => {
      render(<MobileRegisterSection />)

      // Should be a section element with proper role
      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      expect(section.tagName).toBe('SECTION')
    })

    it('has simple semantic structure', () => {
      render(<MobileRegisterSection />)

      // Should be a section element with proper role
      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      expect(section.tagName).toBe('SECTION')
    })

    it('has descriptive aria-label for screen readers', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      expect(section).toHaveAttribute('aria-label', '勉強会登録セクション')
    })

    it('focuses on button functionality', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('role', 'button')
    })

    it('maintains keyboard accessibility for embedded button', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')

      // Button should be keyboard accessible
      expect(button).toHaveAttribute('tabIndex', '0')
      expect(button).toHaveAttribute('role', 'button')
      expect(button).toHaveAttribute(
        'aria-label',
        '勉強会の登録依頼ページへ移動'
      )
    })

    it('maintains button accessibility', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')

      // Check button accessibility
      expect(button).toHaveAttribute('tabIndex', '0')
      expect(button).toHaveAttribute(
        'aria-label',
        '勉強会の登録依頼ページへ移動'
      )
    })

    it('has proper focus management', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')

      // Button should be focusable
      button.focus()
      expect(document.activeElement).toBe(button)
    })
  })

  describe('Integration with StudySessionRegisterButton', () => {
    it('passes correct displayMode prop to StudySessionRegisterButton', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')
      expect(button).toHaveAttribute('data-display-mode', 'mobile-section')
    })

    it('passes correct responsive prop to StudySessionRegisterButton', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')
      expect(button).toHaveAttribute('data-responsive', 'true')
    })

    it('passes additional styling to StudySessionRegisterButton', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')
      expect(button).toHaveClass('w-full')
    })

    it('maintains StudySessionRegisterButton functionality in mobile context', () => {
      render(<MobileRegisterSection />)

      const button = screen.getByTestId('study-session-register-button')

      // Button should maintain its core functionality
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('勉強会の登録依頼')
      expect(button).toHaveAttribute('role', 'button')
    })

    it('positions StudySessionRegisterButton correctly within layout', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      const button = screen.getByTestId('study-session-register-button')

      // Button should be contained within the section
      expect(section).toContainElement(button)
    })
  })

  describe('Visual Design and User Experience', () => {
    it('has simple clean design with just the button', () => {
      render(<MobileRegisterSection />)

      // Check that button is present and properly styled
      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      const button = screen.getByTestId('study-session-register-button')

      expect(section).toContainElement(button)
      expect(button).toHaveClass('w-full')
    })

    it('has centered layout for the button', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      const centerDiv = section.querySelector('.text-center')

      expect(centerDiv).toBeInTheDocument()
      expect(centerDiv).toHaveClass('text-center')
    })

    it('maintains mobile-first responsive design', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      expect(section).toHaveClass('block', 'sm:hidden')
    })
  })
})
