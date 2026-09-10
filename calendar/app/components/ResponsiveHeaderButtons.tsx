'use client'

import { useCallback, useRef, useEffect } from 'react'
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
  isEventsLoading,
  eventsError,
  isFallbackMode,
  isRetryable,
  onRetry,
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

  return (
    <div
      ref={containerRef}
      className={`hidden sm:flex items-center space-x-4 ${transitionState.getTransitionClasses()} ${className}`}
      data-breakpoint={transitionState.currentBreakpoint}
      data-transitioning={transitionState.isTransitioning}
      data-reduced-motion={transitionState.prefersReducedMotion}
    >
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

      {/* Study Session Register Button - responsive visibility */}
      <StudySessionRegisterButton displayMode="header" responsive={true} />
    </div>
  )
}
