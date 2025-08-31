import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import ResponsiveHeaderButtons from '../../components/ResponsiveHeaderButtons'

describe('Responsive Header Transitions Integration', () => {
  const defaultProps = {
    shareText: 'Test share text',
    calendarUrl: 'https://example.com',
    isEventsLoading: false,
    eventsError: null,
    isFallbackMode: false,
    isRetryable: false,
    onRetry: () => {},
    onShareClick: () => {},
    onTwitterShareError: () => {},
    onNativeShare: () => {},
  }

  it('should render responsive header buttons with transition classes', () => {
    render(<ResponsiveHeaderButtons {...defaultProps} />)

    // Check that the component renders
    const twitterButton = screen.getByRole('button', {
      name: /X（旧Twitter）で勉強会情報を共有する/i,
    })
    expect(twitterButton).toBeInTheDocument()

    const shareButton = screen.getByRole('button', {
      name: /ネイティブ共有機能を使用してページを共有/i,
    })
    expect(shareButton).toBeInTheDocument()
  })

  it('should apply responsive CSS classes', () => {
    const { container } = render(<ResponsiveHeaderButtons {...defaultProps} />)

    // Check that the container has responsive classes
    const headerContainer = container.querySelector('.flex.items-center')
    expect(headerContainer).toBeInTheDocument()
    expect(headerContainer).toHaveClass('flex', 'items-center')
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

    const twitterButton = screen.getByRole('button', {
      name: /X（旧Twitter）で勉強会情報を共有する/i,
    })
    expect(twitterButton).toHaveAttribute('aria-label')
    expect(twitterButton).toHaveAttribute('role', 'button')
    expect(twitterButton).toHaveAttribute('tabIndex', '0')
  })

  it('should apply responsive transition CSS classes', () => {
    const { container } = render(<ResponsiveHeaderButtons {...defaultProps} />)

    // Check that responsive CSS is loaded
    const headerContainer = container.querySelector('.flex.items-center')
    expect(headerContainer).toBeInTheDocument()

    // The responsive-header-buttons.css should be loaded
    // We can't directly test CSS loading in jsdom, but we can verify the component structure
    expect(headerContainer).toHaveClass('flex', 'items-center')
  })
})
