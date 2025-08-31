import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MobileRegisterSection from '../../components/MobileRegisterSection'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

describe('MobileRegisterSection Integration', () => {
  it('integrates properly with StudySessionRegisterButton', () => {
    render(<MobileRegisterSection />)

    // Check if the registration button link is rendered correctly
    const registerLink = screen.getByRole('link', { name: /勉強会の登録依頼/ })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('maintains responsive behavior in integration context', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })

    // Verify mobile-only responsive classes are applied
    expect(section).toHaveClass('block', 'sm:hidden')
  })

  it('provides complete user journey context', () => {
    render(<MobileRegisterSection />)

    // Check for complete user journey elements
    const button = screen.getByTestId('study-session-register-button')
    expect(button).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /勉強会の登録依頼/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText('登録には管理者の承認が必要です')
    ).toBeInTheDocument()
  })

  it('has proper visual hierarchy for mobile users', () => {
    render(<MobileRegisterSection />)

    // Check visual hierarchy elements
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveClass('text-lg', 'font-semibold')

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    expect(section).toHaveClass(
      'bg-white',
      'rounded-lg',
      'shadow',
      'border-2',
      'border-blue-100'
    )
  })

  it('maintains accessibility standards in integration', () => {
    render(<MobileRegisterSection />)

    // Check accessibility features
    const section = screen.getByRole('region', { name: '勉強会登録セクション' })
    expect(section).toHaveAttribute('aria-label', '勉強会登録セクション')

    const registerLink = screen.getByRole('link', { name: /勉強会の登録依頼/ })
    expect(registerLink).toHaveAttribute(
      'aria-label',
      '勉強会の登録依頼ページへ移動'
    )
  })

  it('positions correctly for mobile layout', () => {
    render(<MobileRegisterSection />)

    const section = screen.getByRole('region', { name: '勉強会登録セクション' })

    // Check positioning classes for mobile layout
    expect(section).toHaveClass('mt-6', 'px-4')
  })
})
