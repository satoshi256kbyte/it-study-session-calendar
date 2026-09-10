/**
 * ResponsiveHeaderButtons wrapper component unit tests
 * Task 11: Write unit tests for ResponsiveHeaderButtons wrapper
 *
 * Test coverage:
 * - Test responsive display logic and state management
 * - Verify proper prop passing to child components
 * - Test button state coordination and error handling
 * - Test responsive transition handling
 *
 * Requirements: 3.1, 3.2, 5.3, 5.4
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import ResponsiveHeaderButtons, {
  ResponsiveHeaderButtonsProps,
} from '../ResponsiveHeaderButtons'

// Mock performance monitoring to prevent errors
vi.mock('../utils/performance', () => ({
  performanceMonitor: {
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
}))

// Mock window.open
Object.defineProperty(window, 'open', {
  value: vi.fn(),
  writable: true,
})

// Mock alert for error handling
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
})

describe('ResponsiveHeaderButtons Wrapper - Task 11', () => {
  const defaultProps: ResponsiveHeaderButtonsProps = {
    isEventsLoading: false,
    eventsError: null,
    isFallbackMode: false,
    isRetryable: false,
    onRetry: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Responsive Display Logic and State Management (Requirements: 3.1, 3.2)', () => {
    it('should render with responsive container attributes', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify container has responsive data attributes
      const container = document.querySelector('[data-breakpoint]')
      expect(container).toBeInTheDocument()
      expect(container).toHaveAttribute('data-breakpoint')
      expect(container).toHaveAttribute('data-transitioning')
      expect(container).toHaveAttribute('data-reduced-motion')
    })

    it('should apply responsive CSS classes', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const container = document.querySelector('[data-breakpoint]')
      expect(container).toHaveClass('items-center', 'space-x-4')
      expect(container).toHaveClass('responsive-breakpoint-handler')
    })

    it('should handle custom className prop', () => {
      const customClass = 'custom-header-buttons'
      render(
        <ResponsiveHeaderButtons {...defaultProps} className={customClass} />
      )

      const container = document.querySelector('[data-breakpoint]')
      expect(container).toHaveClass(customClass)
    })
  })

  describe('Proper Prop Passing to Child Components (Requirements: 5.3, 5.4)', () => {
    it('should render StudySessionRegisterButton with correct attributes', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify StudySessionRegisterButton is rendered
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/i,
      })
      expect(registerButton).toBeInTheDocument()
      expect(registerButton).toHaveClass('hidden', 'sm:inline-flex')
    })

    it('should handle prop updates correctly', () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Update props
      const updatedProps = {
        ...defaultProps,
        isEventsLoading: true,
      }

      rerender(<ResponsiveHeaderButtons {...updatedProps} />)

      // Verify components are still rendered correctly
      expect(
        screen.getByRole('link', { name: /勉強会の登録依頼ページへ移動/i })
      ).toBeInTheDocument()
    })

    it('should maintain component structure during re-renders', () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Re-render with same props
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify all components are still present
      expect(
        screen.getByRole('link', { name: /勉強会の登録依頼ページへ移動/i })
      ).toBeInTheDocument()
    })
  })

  describe('Button State Coordination and Error Handling (Requirements: 3.1, 3.2)', () => {
    it('should coordinate button states correctly', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify register button is rendered and functional
      const registerButton = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/i,
      })

      expect(registerButton).toBeInTheDocument()
    })

    it('should handle error states correctly', () => {
      const propsWithError = {
        ...defaultProps,
        eventsError: 'Test error',
        isRetryable: true,
        isFallbackMode: false,
      }

      render(<ResponsiveHeaderButtons {...propsWithError} />)

      // Verify retry button is displayed
      const retryButton = screen.getByRole('button', {
        name: /勉強会データの取得を再試行/i,
      })
      expect(retryButton).toBeInTheDocument()

      // Test retry functionality
      fireEvent.click(retryButton)
      expect(defaultProps.onRetry).toHaveBeenCalledTimes(1)
    })

    it('should not show retry button in fallback mode', () => {
      const propsWithError = {
        ...defaultProps,
        eventsError: 'Test error',
        isRetryable: true,
        isFallbackMode: true,
      }

      render(<ResponsiveHeaderButtons {...propsWithError} />)

      // Verify retry button is not displayed in fallback mode
      expect(
        screen.queryByRole('button', { name: /勉強会データの取得を再試行/i })
      ).not.toBeInTheDocument()
    })

    it('should handle errors in callback functions gracefully', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const propsWithErrorCallback = {
        ...defaultProps,
        onRetry: vi.fn(() => {
          throw new Error('Retry failed')
        }),
        eventsError: 'Test error',
        isRetryable: true,
      }

      render(<ResponsiveHeaderButtons {...propsWithErrorCallback} />)

      const retryButton = screen.getByRole('button', {
        name: /勉強会データの取得を再試行/i,
      })
      fireEvent.click(retryButton)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Retry failed:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Responsive Transition Handling (Requirements: 1.5, 3.5, 5.2)', () => {
    it('should apply responsive transition CSS classes', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const container = document.querySelector('[data-breakpoint]')
      expect(container).toHaveClass('responsive-breakpoint-handler')
    })

    it('should handle component lifecycle correctly', () => {
      const { unmount } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify component renders without errors
      expect(
        screen.getByRole('link', { name: /勉強会の登録依頼ページへ移動/i })
      ).toBeInTheDocument()

      // Verify component unmounts without errors
      expect(() => unmount()).not.toThrow()
    })

    it('should apply performance optimization styles', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const container = document.querySelector('[data-breakpoint]')
      const computedStyle = window.getComputedStyle(container!)

      // Verify performance optimization styles are applied
      expect(computedStyle.willChange).toBe('transform, opacity')
      expect(computedStyle.backfaceVisibility).toBe('hidden')
    })
  })

  describe('Integration and Edge Cases', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Verify component unmounts without errors
      expect(() => unmount()).not.toThrow()
    })

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Simulate rapid prop changes
      const updatedProps1 = { ...defaultProps, isEventsLoading: false }
      const updatedProps2 = {
        ...defaultProps,
        isEventsLoading: true,
      }

      rerender(<ResponsiveHeaderButtons {...updatedProps1} />)
      rerender(<ResponsiveHeaderButtons {...updatedProps2} />)

      // Verify component handles rapid changes gracefully
      expect(
        screen.getByRole('link', { name: /勉強会の登録依頼ページへ移動/i })
      ).toBeInTheDocument()
    })

    it('should maintain accessibility during state changes', () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Update to error state
      const errorProps = {
        ...defaultProps,
        eventsError: 'Test error',
        isRetryable: true,
      }

      rerender(<ResponsiveHeaderButtons {...errorProps} />)

      // Verify accessibility is maintained
      const retryButton = screen.getByRole('button', {
        name: /勉強会データの取得を再試行/i,
      })
      expect(retryButton).toHaveAttribute('aria-label')
      expect(retryButton).toHaveAttribute('title')
    })
  })
})
