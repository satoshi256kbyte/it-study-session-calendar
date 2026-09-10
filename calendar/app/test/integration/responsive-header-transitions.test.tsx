import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import ResponsiveHeaderButtons from '../../components/ResponsiveHeaderButtons'

describe('Responsive Header Transitions Integration', () => {
  const defaultProps = {
    isEventsLoading: false,
    eventsError: null,
    isFallbackMode: false,
    isRetryable: false,
    onRetry: () => {},
  }

  it('should render responsive header buttons with transition classes', () => {
    render(<ResponsiveHeaderButtons {...defaultProps} />)

    // Check that the component renders
    const registerButton = screen.getByRole('link', {
      name: /勉強会の登録依頼ページへ移動/i,
    })
    expect(registerButton).toBeInTheDocument()
  })

  it('should apply responsive CSS classes', () => {
    const { container } = render(<ResponsiveHeaderButtons {...defaultProps} />)

    // Check that the container has responsive classes
    const headerContainer = container.querySelector('[data-breakpoint]')
    expect(headerContainer).toBeInTheDocument()
    expect(headerContainer).toHaveClass('items-center', 'space-x-4')
  })

  it('should handle error states with transitions', () => {
    const propsWithError = {
      ...defaultProps,
      eventsError: 'Test error',
      isRetryable: true,
    }

    render(<ResponsiveHeaderButtons {...propsWithError} />)

    const retryButton = screen.getByRole('button', {
      name: /勉強会データの取得を再試行/i,
    })
    expect(retryButton).toBeInTheDocument()
    expect(retryButton).toHaveClass('transition-colors', 'duration-200')
  })

  it('should maintain accessibility during responsive changes', () => {
    render(<ResponsiveHeaderButtons {...defaultProps} />)

    const registerButton = screen.getByRole('link', {
      name: /勉強会の登録依頼ページへ移動/i,
    })
    expect(registerButton).toHaveAttribute('aria-label')
  })

  it('should apply responsive transition CSS classes', () => {
    const { container } = render(<ResponsiveHeaderButtons {...defaultProps} />)

    // Check that responsive CSS is loaded
    const headerContainer = container.querySelector('[data-breakpoint]')
    expect(headerContainer).toBeInTheDocument()

    // The responsive-header-buttons.css should be loaded
    // We can't directly test CSS loading in jsdom, but we can verify the component structure
    expect(headerContainer).toHaveClass('items-center', 'space-x-4')
  })
})
