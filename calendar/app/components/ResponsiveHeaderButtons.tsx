'use client'

import { useMemo, useCallback, useRef, useEffect } from 'react'
import TwitterShareButton from './TwitterShareButton'
import StudySessionRegisterButton from './StudySessionRegisterButton'
import {
  useResponsiveTransitions,
  preventLayoutShift,
  optimizeTransitionPerformance,
} from '../utils/responsive-transitions'

/**
 * ResponsiveHeaderButtons component props interface
 * Requirements: 3.1, 3.2, 5.3, 5.4
 */
export interface ResponsiveHeaderButtonsProps {
  /** Generated share text for Twitter */
  shareText: string
  /** Calendar URL for sharing */
  calendarUrl: string
  /** Loading state for events */
  isEventsLoading: boolean
  /** Error state for events */
  eventsError: string | null
  /** Whether the system is in fallback mode */
  isFallbackMode: boolean
  /** Whether errors are retryable */
  isRetryable: boolean
  /** Retry callback function */
  onRetry: () => void
  /** Share button click callback */
  onShareClick: () => void
  /** Twitter share error callback */
  onTwitterShareError: (error: Error) => void
  /** Native share callback */
  onNativeShare: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * ResponsiveHeaderButtons wrapper component
 *
 * Manages responsive display logic for header buttons and coordinates
 * button states and interactions. Handles prop passing to child components
 * and responsive state management.
 *
 * Requirements addressed:
 * - 3.1: Maintain proper spacing and alignment across viewport changes
 * - 3.2: Adjust positioning appropriately when buttons are hidden/moved
 * - 5.3: Integrate with existing responsive utilities and hooks
 * - 5.4: Maintain existing functionality without breaking tests
 */
export default function ResponsiveHeaderButtons({
  shareText,
  calendarUrl,
  isEventsLoading,
  eventsError,
  isFallbackMode,
  isRetryable,
  onRetry,
  onShareClick,
  onTwitterShareError,
  onNativeShare,
  className = '',
}: ResponsiveHeaderButtonsProps) {
  // Responsive transition management
  // Requirements: 1.5, 3.5, 4.1, 5.2
  const transitionState = useResponsiveTransitions({
    mobileBreakpoint: 640,
    tabletBreakpoint: 768,
    desktopBreakpoint: 1024,
    transitionDuration: 300,
    debounceDelay: 150,
    enableTransitions: true,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupFunctionsRef = useRef<(() => void)[]>([])

  // Apply performance optimizations and layout shift prevention
  // Requirements: 3.5, 5.2
  useEffect(() => {
    if (!containerRef.current) return

    const element = containerRef.current

    // Apply performance optimizations only once
    const cleanupPerformance = optimizeTransitionPerformance(element)
    cleanupFunctionsRef.current.push(cleanupPerformance)

    // Cleanup function
    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => cleanup())
      cleanupFunctionsRef.current = []
    }
  }, []) // Remove dependency to prevent infinite loop

  // Separate effect for layout shift prevention during transitions
  useEffect(() => {
    if (!containerRef.current || !transitionState.isTransitioning) return

    const element = containerRef.current
    const cleanupLayoutShift = preventLayoutShift(element)

    return cleanupLayoutShift
  }, [transitionState.isTransitioning])

  // Apply transition classes when breakpoint changes
  // Requirements: 1.5, 3.5
  useEffect(() => {
    if (!containerRef.current || !transitionState.isTransitioning) return

    const element = containerRef.current
    transitionState.applyTransitionClasses(element, true)

    // Cleanup transition classes after transition completes
    const timeoutId = setTimeout(() => {
      if (element) {
        transitionState.removeTransitionClasses(element)
      }
    }, transitionState.transitionDuration)

    return () => {
      clearTimeout(timeoutId)
      if (element) {
        transitionState.removeTransitionClasses(element)
      }
    }
  }, [
    transitionState.currentBreakpoint,
    transitionState.transitionDuration,
    transitionState,
  ]) // Include all used transitionState properties
  /**
   * Memoized button display configuration based on responsive state
   * Requirements: 3.1, 3.2 - Responsive display logic
   */
  const buttonDisplayConfig = useMemo(
    () => ({
      twitter: {
        showText: true, // Will be handled by CSS responsive classes
        responsive: true, // Enable CSS-based responsive behavior
      },
      register: {
        showInHeader: true, // Will be handled by CSS responsive classes
        responsive: true, // Enable CSS-based responsive behavior
      },
      share: {
        visible: true, // Always visible
      },
    }),
    []
  )

  /**
   * Memoized Twitter button props to prevent unnecessary re-renders
   * Requirements: 5.3, 5.4 - Performance optimization and state management
   */
  const twitterButtonProps = useMemo(
    () => ({
      shareText,
      calendarUrl,
      isLoading: isEventsLoading,
      hasError: !!eventsError && !isFallbackMode,
      disabled: !shareText && !isEventsLoading,
      onShareClick,
      onError: onTwitterShareError,
      displayMode: 'full' as const,
      responsive: buttonDisplayConfig.twitter.responsive,
    }),
    [
      shareText,
      calendarUrl,
      isEventsLoading,
      eventsError,
      isFallbackMode,
      onShareClick,
      onTwitterShareError,
      buttonDisplayConfig.twitter.responsive,
    ]
  )

  /**
   * Memoized register button props to prevent unnecessary re-renders
   * Requirements: 5.3, 5.4 - Performance optimization and state management
   */
  const registerButtonProps = useMemo(
    () => ({
      displayMode: 'header' as const,
      responsive: buttonDisplayConfig.register.responsive,
    }),
    [buttonDisplayConfig.register.responsive]
  )

  /**
   * Handle retry button click with proper error handling
   * Requirements: 3.1, 3.2 - Coordinate button states
   */
  const handleRetryClick = useCallback(() => {
    try {
      onRetry()
    } catch (error) {
      console.error('Retry failed:', error)
      // Error is handled by the parent component
    }
  }, [onRetry])

  /**
   * Handle native share button click with proper error handling
   * Requirements: 3.1, 3.2 - Coordinate button states
   */
  const handleNativeShareClick = useCallback(() => {
    try {
      onNativeShare()
    } catch (error) {
      console.error('Native share failed:', error)
      // Error is handled by the parent component
    }
  }, [onNativeShare])

  return (
    <div
      ref={containerRef}
      className={`hidden sm:flex items-center space-x-4 ${transitionState.getTransitionClasses()} ${className}`}
      data-breakpoint={transitionState.currentBreakpoint}
      data-transitioning={transitionState.isTransitioning}
      data-reduced-motion={transitionState.prefersReducedMotion}
    >
      {/* Twitter Share Button - responsive text visibility */}
      <TwitterShareButton {...twitterButtonProps} />

      {/* Error state display and retry button */}
      {eventsError && isRetryable && !isFallbackMode && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRetryClick}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded transition-colors duration-200"
            title="勉強会データの取得を再試行"
            aria-label="勉強会データの取得を再試行"
          >
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            再試行
          </button>
        </div>
      )}

      {/* Native Share Button - always visible */}
      <button
        onClick={handleNativeShareClick}
        className="inline-flex items-center px-3 py-2 sm:px-3 sm:py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 button-optimized transition-colors duration-200"
        aria-label="ネイティブ共有機能を使用してページを共有"
      >
        <svg
          className="w-4 h-4 sm:mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
        <span className="hidden sm:inline">シェア</span>
      </button>

      {/* Study Session Register Button - responsive visibility */}
      <StudySessionRegisterButton {...registerButtonProps} />
    </div>
  )
}
