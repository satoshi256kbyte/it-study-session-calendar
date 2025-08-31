'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Responsive transition state interface
 * Requirements: 1.5, 3.5, 4.1, 5.2
 */
export interface ResponsiveTransitionState {
  /** Current breakpoint */
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop'
  /** Previous breakpoint */
  previousBreakpoint?: 'mobile' | 'tablet' | 'desktop'
  /** Whether a transition is in progress */
  isTransitioning: boolean
  /** Whether reduced motion is preferred */
  prefersReducedMotion: boolean
  /** Transition duration in milliseconds */
  transitionDuration: number
}

/**
 * Responsive transition options
 */
export interface ResponsiveTransitionOptions {
  /** Mobile breakpoint (default: 640px) */
  mobileBreakpoint?: number
  /** Tablet breakpoint (default: 768px) */
  tabletBreakpoint?: number
  /** Desktop breakpoint (default: 1024px) */
  desktopBreakpoint?: number
  /** Transition duration in milliseconds (default: 300ms) */
  transitionDuration?: number
  /** Debounce delay for resize events (default: 150ms) */
  debounceDelay?: number
  /** Enable smooth transitions (default: true) */
  enableTransitions?: boolean
}

/**
 * Get current breakpoint based on window width
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */
function getCurrentBreakpoint(
  width: number,
  mobileBreakpoint: number = 640,
  tabletBreakpoint: number = 768,
  desktopBreakpoint: number = 1024
): 'mobile' | 'tablet' | 'desktop' {
  if (width < mobileBreakpoint) {
    return 'mobile'
  } else if (width < desktopBreakpoint) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

/**
 * Check if user prefers reduced motion
 * Requirements: 4.1, 5.2
 */
function checkPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Debounce function for resize events
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * Custom hook for responsive breakpoint handling with smooth transitions
 * Requirements: 1.5, 3.5, 4.1, 5.2
 */
export function useResponsiveTransitions(
  options: ResponsiveTransitionOptions = {}
): ResponsiveTransitionState & {
  /** Apply transition classes to an element */
  applyTransitionClasses: (element: HTMLElement, entering: boolean) => void
  /** Remove transition classes from an element */
  removeTransitionClasses: (element: HTMLElement) => void
  /** Get CSS classes for current state */
  getTransitionClasses: () => string
} {
  const {
    mobileBreakpoint = 640,
    tabletBreakpoint = 768,
    desktopBreakpoint = 1024,
    transitionDuration = 300,
    debounceDelay = 150,
    enableTransitions = true,
  } = options

  const [state, setState] = useState<ResponsiveTransitionState>(() => ({
    currentBreakpoint:
      typeof window !== 'undefined'
        ? getCurrentBreakpoint(
            window.innerWidth,
            mobileBreakpoint,
            tabletBreakpoint,
            desktopBreakpoint
          )
        : 'desktop',
    isTransitioning: false,
    prefersReducedMotion:
      typeof window !== 'undefined' ? checkPrefersReducedMotion() : false,
    transitionDuration,
  }))

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Handle breakpoint change with smooth transitions
   * Requirements: 1.5, 3.5
   */
  const handleBreakpointChange = useCallback(() => {
    if (typeof window === 'undefined') return

    const currentWidth = window.innerWidth
    const newBreakpoint = getCurrentBreakpoint(
      currentWidth,
      mobileBreakpoint,
      tabletBreakpoint,
      desktopBreakpoint
    )

    setState(prevState => {
      // Only update if breakpoint actually changed
      if (newBreakpoint === prevState.currentBreakpoint) {
        return prevState
      }

      // Clear existing transition timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }

      const newState: ResponsiveTransitionState = {
        currentBreakpoint: newBreakpoint,
        previousBreakpoint: prevState.currentBreakpoint,
        isTransitioning: enableTransitions && !prevState.prefersReducedMotion,
        prefersReducedMotion: prevState.prefersReducedMotion,
        transitionDuration,
      }

      // Set timeout to end transition
      if (newState.isTransitioning) {
        transitionTimeoutRef.current = setTimeout(() => {
          setState(currentState => ({
            ...currentState,
            isTransitioning: false,
            previousBreakpoint: undefined,
          }))
        }, transitionDuration)
      }

      return newState
    })
  }, [
    mobileBreakpoint,
    tabletBreakpoint,
    desktopBreakpoint,
    transitionDuration,
    enableTransitions,
  ])

  /**
   * Debounced resize handler
   * Requirements: 3.5, 5.2
   */
  const debouncedHandleResize = useCallback(() => {
    const debouncedFn = debounce(handleBreakpointChange, debounceDelay)
    return debouncedFn()
  }, [handleBreakpointChange, debounceDelay])

  /**
   * Handle reduced motion preference changes
   * Requirements: 4.1
   */
  const handleReducedMotionChange = useCallback((e: MediaQueryListEvent) => {
    setState(prevState => ({
      ...prevState,
      prefersReducedMotion: e.matches,
      isTransitioning: e.matches ? false : prevState.isTransitioning,
    }))
  }, [])

  /**
   * Apply transition classes to an element
   * Requirements: 1.5, 3.5, 5.2
   */
  const applyTransitionClasses = useCallback(
    (element: HTMLElement, entering: boolean) => {
      if (!enableTransitions || state.prefersReducedMotion) return

      // Remove existing transition classes
      element.classList.remove(
        'responsive-transition-enter',
        'responsive-transition-enter-active',
        'responsive-transition-exit',
        'responsive-transition-exit-active'
      )

      if (entering) {
        element.classList.add('responsive-transition-enter')
        // Force reflow
        element.offsetHeight
        element.classList.add('responsive-transition-enter-active')
      } else {
        element.classList.add('responsive-transition-exit')
        // Force reflow
        element.offsetHeight
        element.classList.add('responsive-transition-exit-active')
      }
    },
    [enableTransitions, state.prefersReducedMotion]
  )

  /**
   * Remove transition classes from an element
   * Requirements: 5.2
   */
  const removeTransitionClasses = useCallback((element: HTMLElement) => {
    element.classList.remove(
      'responsive-transition-enter',
      'responsive-transition-enter-active',
      'responsive-transition-exit',
      'responsive-transition-exit-active'
    )
  }, [])

  /**
   * Get CSS classes for current transition state
   * Requirements: 1.5, 3.5, 5.2
   */
  const getTransitionClasses = useCallback(() => {
    const classes = ['responsive-breakpoint-handler']

    classes.push(`breakpoint-${state.currentBreakpoint}`)

    if (state.previousBreakpoint) {
      classes.push(`from-${state.previousBreakpoint}`)
    }

    if (state.isTransitioning) {
      classes.push('transitioning')
    }

    if (state.prefersReducedMotion) {
      classes.push('reduced-motion')
    }

    return classes.join(' ')
  }, [state])

  // Set up event listeners
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initial setup
    handleBreakpointChange()

    // Resize event listener with passive option for better performance
    window.addEventListener('resize', debouncedHandleResize, { passive: true })

    // Orientation change event listener (mobile devices)
    const handleOrientationChange = () => {
      // Delay to allow browser to update dimensions
      setTimeout(handleBreakpointChange, 100)
    }
    window.addEventListener('orientationchange', handleOrientationChange)

    // Reduced motion preference listener
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

    // Update initial reduced motion state
    setState(prevState => ({
      ...prevState,
      prefersReducedMotion: reducedMotionQuery.matches,
    }))

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      reducedMotionQuery.removeEventListener(
        'change',
        handleReducedMotionChange
      )

      // Store current ref values to avoid stale closure warning
      const currentTransitionTimeout = transitionTimeoutRef.current
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentResizeTimeout = resizeTimeoutRef.current

      if (currentTransitionTimeout) {
        clearTimeout(currentTransitionTimeout)
      }
      if (currentResizeTimeout) {
        clearTimeout(currentResizeTimeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedHandleResize, handleBreakpointChange, handleReducedMotionChange])

  return {
    ...state,
    applyTransitionClasses,
    removeTransitionClasses,
    getTransitionClasses,
  }
}

/**
 * CSS class generator for responsive transitions
 * Requirements: 1.5, 3.5, 5.2
 */
export function generateResponsiveTransitionClasses(
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop',
  previousBreakpoint?: 'mobile' | 'tablet' | 'desktop',
  isTransitioning: boolean = false,
  prefersReducedMotion: boolean = false
): string {
  const classes = ['responsive-element']

  classes.push(`responsive-${currentBreakpoint}`)

  if (previousBreakpoint && isTransitioning) {
    classes.push(`transitioning-from-${previousBreakpoint}`)
    classes.push('responsive-transitioning')
  }

  if (prefersReducedMotion) {
    classes.push('no-transitions')
  }

  return classes.join(' ')
}

/**
 * Utility function to prevent layout shifts during transitions
 * Requirements: 3.5, 5.2
 */
export function preventLayoutShift(element: HTMLElement): () => void {
  const originalStyles = {
    minHeight: element.style.minHeight,
    minWidth: element.style.minWidth,
    contain: element.style.contain,
  }

  // Apply layout containment and minimum dimensions
  const rect = element.getBoundingClientRect()
  element.style.minHeight = `${rect.height}px`
  element.style.minWidth = `${rect.width}px`
  element.style.contain = 'layout style'

  // Return cleanup function
  return () => {
    element.style.minHeight = originalStyles.minHeight
    element.style.minWidth = originalStyles.minWidth
    element.style.contain = originalStyles.contain
  }
}

/**
 * Utility function to optimize transitions for performance
 * Requirements: 5.2
 */
export function optimizeTransitionPerformance(
  element: HTMLElement
): () => void {
  const originalStyles = {
    willChange: element.style.willChange,
    transform: element.style.transform,
    backfaceVisibility: element.style.backfaceVisibility,
  }

  // Apply performance optimizations
  element.style.willChange = 'transform, opacity'
  element.style.transform = element.style.transform || 'translateZ(0)'
  element.style.backfaceVisibility = 'hidden'

  // Return cleanup function
  return () => {
    element.style.willChange = originalStyles.willChange
    element.style.transform = originalStyles.transform
    element.style.backfaceVisibility = originalStyles.backfaceVisibility
  }
}

/**
 * Higher-order component factory for responsive transition management
 * Requirements: 1.5, 3.5, 5.2
 * Note: Returns a configuration object instead of JSX to avoid compilation issues
 */
export function createResponsiveTransitionConfig(
  options: ResponsiveTransitionOptions = {}
): ResponsiveTransitionOptions {
  return {
    mobileBreakpoint: 640,
    tabletBreakpoint: 768,
    desktopBreakpoint: 1024,
    transitionDuration: 300,
    debounceDelay: 150,
    enableTransitions: true,
    ...options,
  }
}
