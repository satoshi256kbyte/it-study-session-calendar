import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import ResponsiveHeaderButtons from '../ResponsiveHeaderButtons'

// Mock the responsive transitions utility
vi.mock('../utils/responsive-transitions', () => ({
  useResponsiveTransitions: vi.fn(() => ({
    currentBreakpoint: 'desktop',
    previousBreakpoint: undefined,
    isTransitioning: false,
    prefersReducedMotion: false,
    transitionDuration: 300,
    applyTransitionClasses: vi.fn(),
    removeTransitionClasses: vi.fn(),
    getTransitionClasses: vi.fn(
      () => 'responsive-breakpoint-handler breakpoint-desktop'
    ),
  })),
  preventLayoutShift: vi.fn(() => vi.fn()),
  optimizeTransitionPerformance: vi.fn(() => vi.fn()),
}))

// Mock performance monitoring
vi.mock('../utils/performance', () => ({
  performanceMonitor: {
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
}))

describe('ResponsiveHeaderButtons - Transitions', () => {
  const defaultProps = {
    shareText: 'Test share text',
    calendarUrl: 'https://example.com',
    isEventsLoading: false,
    eventsError: null,
    isFallbackMode: false,
    isRetryable: false,
    onRetry: vi.fn(),
    onShareClick: vi.fn(),
    onTwitterShareError: vi.fn(),
    onNativeShare: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Responsive Breakpoint Handling', () => {
    it('should apply correct transition classes for desktop breakpoint', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'desktop',
        previousBreakpoint: undefined,
        isTransitioning: false,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler breakpoint-desktop'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const container = screen.getByRole('group', { hidden: true })
      expect(container).toHaveClass(
        'responsive-breakpoint-handler',
        'breakpoint-desktop'
      )
      expect(container).toHaveAttribute('data-breakpoint', 'desktop')
      expect(container).toHaveAttribute('data-transitioning', 'false')
      expect(container).toHaveAttribute('data-reduced-motion', 'false')
    })

    it('should apply correct transition classes for mobile breakpoint', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () =>
            'responsive-breakpoint-handler breakpoint-mobile from-desktop transitioning'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const container = screen.getByRole('group', { hidden: true })
      expect(container).toHaveClass(
        'responsive-breakpoint-handler',
        'breakpoint-mobile',
        'from-desktop',
        'transitioning'
      )
      expect(container).toHaveAttribute('data-breakpoint', 'mobile')
      expect(container).toHaveAttribute('data-transitioning', 'true')
    })

    it('should handle reduced motion preference', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: false,
        prefersReducedMotion: true,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler breakpoint-mobile reduced-motion'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const container = screen.getByRole('group', { hidden: true })
      expect(container).toHaveClass('reduced-motion')
      expect(container).toHaveAttribute('data-reduced-motion', 'true')
    })
  })

  describe('Transition Performance Optimizations', () => {
    it('should apply performance optimizations during transitions', () => {
      const {
        useResponsiveTransitions,
        optimizeTransitionPerformance,
      } = require('../utils/responsive-transitions')
      const mockCleanup = vi.fn()
      optimizeTransitionPerformance.mockReturnValue(mockCleanup)

      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

      const { unmount } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      expect(optimizeTransitionPerformance).toHaveBeenCalled()

      unmount()
      expect(mockCleanup).toHaveBeenCalled()
    })

    it('should apply layout shift prevention during transitions', () => {
      const {
        useResponsiveTransitions,
        preventLayoutShift,
      } = require('../utils/responsive-transitions')
      const mockCleanup = vi.fn()
      preventLayoutShift.mockReturnValue(mockCleanup)

      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

      const { unmount } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      expect(preventLayoutShift).toHaveBeenCalled()

      unmount()
      expect(mockCleanup).toHaveBeenCalled()
    })
  })

  describe('Transition Class Management', () => {
    it('should apply and remove transition classes correctly', async () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      const mockApplyTransitionClasses = vi.fn()
      const mockRemoveTransitionClasses = vi.fn()

      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: mockApplyTransitionClasses,
        removeTransitionClasses: mockRemoveTransitionClasses,
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      expect(mockApplyTransitionClasses).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        true
      )

      // Wait for transition to complete
      await waitFor(
        () => {
          expect(mockRemoveTransitionClasses).toHaveBeenCalledWith(
            expect.any(HTMLElement)
          )
        },
        { timeout: 400 }
      )
    })

    it('should not apply transition classes when reduced motion is preferred', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      const mockApplyTransitionClasses = vi.fn()

      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: false,
        prefersReducedMotion: true,
        transitionDuration: 300,
        applyTransitionClasses: mockApplyTransitionClasses,
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler reduced-motion'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      expect(mockApplyTransitionClasses).not.toHaveBeenCalled()
    })
  })

  describe('Button Functionality During Transitions', () => {
    it('should maintain button functionality during transitions', async () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // Twitter share button should still be clickable
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/i,
      })
      expect(twitterButton).toBeInTheDocument()

      fireEvent.click(twitterButton)
      expect(defaultProps.onShareClick).toHaveBeenCalled()
    })

    it('should handle error state during transitions', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

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

      fireEvent.click(retryButton)
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })
  })

  describe('Accessibility During Transitions', () => {
    it('should maintain proper ARIA attributes during transitions', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/i,
      })
      expect(twitterButton).toHaveAttribute('aria-label')
      expect(twitterButton).toHaveAttribute('role', 'button')
    })

    it('should maintain keyboard navigation during transitions', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler transitioning'
        ),
      })

      render(<ResponsiveHeaderButtons {...defaultProps} />)

      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/i,
      })
      expect(twitterButton).toHaveAttribute('tabIndex', '0')

      // Test keyboard interaction
      fireEvent.keyDown(twitterButton, { key: 'Enter' })
      expect(defaultProps.onShareClick).toHaveBeenCalled()
    })
  })

  describe('CSS Custom Properties Integration', () => {
    it('should apply correct CSS custom properties for different breakpoints', () => {
      const {
        useResponsiveTransitions,
      } = require('../utils/responsive-transitions')

      // Test mobile breakpoint
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        isTransitioning: false,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler breakpoint-mobile'
        ),
      })

      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      let container = screen.getByRole('group', { hidden: true })
      expect(container).toHaveClass('breakpoint-mobile')

      // Test desktop breakpoint
      useResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'desktop',
        isTransitioning: false,
        prefersReducedMotion: false,
        transitionDuration: 300,
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
        getTransitionClasses: vi.fn(
          () => 'responsive-breakpoint-handler breakpoint-desktop'
        ),
      })

      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      container = screen.getByRole('group', { hidden: true })
      expect(container).toHaveClass('breakpoint-desktop')
    })
  })
})
