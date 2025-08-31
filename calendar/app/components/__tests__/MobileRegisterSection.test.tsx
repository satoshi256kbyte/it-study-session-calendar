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

    // Check if the heading is present
    expect(screen.getByText('勉強会を登録しませんか？')).toBeInTheDocument()

    // Check if the description is present
    expect(
      screen.getByText(/あなたの勉強会やイベントをカレンダーに追加して/)
    ).toBeInTheDocument()

    // Check if the disclaimer is present
    expect(
      screen.getByText('登録には管理者の承認が必要です')
    ).toBeInTheDocument()
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
    expect(button).toHaveClass('shadow-lg')
  })

  it('has prominent styling for discoverability', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })

    // Check for prominent styling classes
    expect(section).toHaveClass(
      'bg-white',
      'rounded-lg',
      'shadow',
      'border-2',
      'border-blue-100'
    )
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

    // Check for proper heading structure
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('勉強会を登録しませんか？')
  })

  it('has decorative icon with proper accessibility attributes', () => {
    render(<MobileRegisterSection />)

    // Check if the SVG icon has aria-hidden attribute
    const svg = document.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('displays content in proper visual hierarchy', () => {
    render(<MobileRegisterSection />)

    // Check if elements are in the correct order
    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    const heading = screen.getByText('勉強会を登録しませんか？')
    const description = screen.getByText(
      /あなたの勉強会やイベントをカレンダーに追加して/
    )
    const button = screen.getByTestId('study-session-register-button')
    const disclaimer = screen.getByText('登録には管理者の承認が必要です')

    // Verify the visual hierarchy through DOM structure
    expect(section).toContainElement(heading)
    expect(section).toContainElement(description)
    expect(section).toContainElement(button)
    expect(section).toContainElement(disclaimer)
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

    it('has visually prominent styling for discoverability', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })

      // Should have prominent visual styling
      expect(section).toHaveClass(
        'bg-white',
        'rounded-lg',
        'shadow',
        'border-2',
        'border-blue-100'
      )
    })

    it('has proper internal padding and layout', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      const innerDiv = section.querySelector('.p-6')

      expect(innerDiv).toBeInTheDocument()
      expect(innerDiv).toHaveClass('p-6', 'text-center')
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

    it('has proper heading hierarchy', () => {
      render(<MobileRegisterSection />)

      // Should have h3 heading
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('勉強会を登録しませんか？')
      expect(heading).toHaveClass('text-lg', 'font-semibold')
    })

    it('has descriptive aria-label for screen readers', () => {
      render(<MobileRegisterSection />)

      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      expect(section).toHaveAttribute('aria-label', '勉強会登録セクション')
    })

    it('has decorative icon with proper aria-hidden', () => {
      render(<MobileRegisterSection />)

      const svg = document.querySelector('svg[aria-hidden="true"]')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
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

    it('has proper text contrast and readability', () => {
      render(<MobileRegisterSection />)

      const heading = screen.getByText('勉強会を登録しませんか？')
      const description = screen.getByText(
        /あなたの勉強会やイベントをカレンダーに追加して/
      )
      const disclaimer = screen.getByText('登録には管理者の承認が必要です')

      // Check for proper text color classes
      expect(heading).toHaveClass('text-gray-900')
      expect(description).toHaveClass('text-gray-600')
      expect(disclaimer).toHaveClass('text-gray-500')
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
      expect(button).toHaveClass('shadow-lg')
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

      // Verify all key elements are present in the section
      const description = screen.getByText(
        /あなたの勉強会やイベントをカレンダーに追加して/
      )
      const disclaimer = screen.getByText('登録には管理者の承認が必要です')

      expect(section).toContainElement(description)
      expect(section).toContainElement(button)
      expect(section).toContainElement(disclaimer)
    })
  })

  describe('Visual Design and User Experience', () => {
    it('has proper visual hierarchy with icon, heading, description, button, disclaimer', () => {
      render(<MobileRegisterSection />)

      // Check that all elements are present in correct order
      const section = screen.getByRole('region', {
        name: '勉強会登録セクション',
      })
      const icon = section.querySelector('svg')
      const heading = screen.getByText('勉強会を登録しませんか？')
      const description = screen.getByText(
        /あなたの勉強会やイベントをカレンダーに追加して/
      )
      const button = screen.getByTestId('study-session-register-button')
      const disclaimer = screen.getByText('登録には管理者の承認が必要です')

      expect(icon).toBeInTheDocument()
      expect(section).toContainElement(heading)
      expect(section).toContainElement(description)
      expect(section).toContainElement(button)
      expect(section).toContainElement(disclaimer)
    })

    it('has proper spacing between elements', () => {
      render(<MobileRegisterSection />)

      // Check for proper spacing classes
      const iconContainer = document.querySelector('.mb-3')
      const heading = screen.getByText('勉強会を登録しませんか？')
      const disclaimer = screen.getByText('登録には管理者の承認が必要です')

      expect(iconContainer).toBeInTheDocument()
      expect(heading).toHaveClass('mb-2')
      expect(disclaimer).toHaveClass('mt-3')
    })

    it('uses appropriate text sizes for mobile readability', () => {
      render(<MobileRegisterSection />)

      const heading = screen.getByText('勉強会を登録しませんか？')
      const description = screen.getByText(
        /あなたの勉強会やイベントをカレンダーに追加して/
      )
      const disclaimer = screen.getByText('登録には管理者の承認が必要です')

      expect(heading).toHaveClass('text-lg')
      expect(description).toHaveClass('text-sm')
      expect(disclaimer).toHaveClass('text-xs')
    })
  })
})
