/**
 * Performance optimization utilities for responsive header buttons
 * Requirements: 3.5, 4.5, 5.2, 5.5
 */

/**
 * Debounce function with immediate execution option
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastCallTime = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (immediate && now - lastCallTime > delay) {
      func(...args)
      lastCallTime = now
      return
    }

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      lastCallTime = Date.now()
    }, delay)
  }
}

/**
 * Throttle function for high-frequency events
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastCallTime >= delay) {
      func(...args)
      lastCallTime = now
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          func(...args)
          lastCallTime = Date.now()
          timeoutId = null
        },
        delay - (now - lastCallTime)
      )
    }
  }
}

/**
 * Request animation frame with fallback
 */
export function requestAnimationFramePolyfill(
  callback: FrameRequestCallback
): number {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback)
  }
  return setTimeout(callback, 16) as unknown as number
}

/**
 * Cancel animation frame with fallback
 */
export function cancelAnimationFramePolyfill(id: number): void {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Optimize element for GPU acceleration
 */
export function enableGPUAcceleration(element: HTMLElement): () => void {
  const originalStyles = {
    transform: element.style.transform,
    backfaceVisibility: element.style.backfaceVisibility,
    perspective: element.style.perspective,
  }

  element.style.transform = element.style.transform || 'translateZ(0)'
  element.style.backfaceVisibility = 'hidden'
  element.style.perspective = '1000px'

  return () => {
    element.style.transform = originalStyles.transform
    element.style.backfaceVisibility = originalStyles.backfaceVisibility
    element.style.perspective = originalStyles.perspective
  }
}

/**
 * Apply CSS containment for performance
 */
export function applyCSSContainment(
  element: HTMLElement,
  containment:
    | 'layout'
    | 'style'
    | 'paint'
    | 'size'
    | 'layout style'
    | 'layout paint'
    | 'strict' = 'layout style'
): () => void {
  const originalContain = element.style.contain

  element.style.contain = containment

  return () => {
    element.style.contain = originalContain
  }
}

/**
 * Manage will-change property efficiently
 */
export function manageWillChange(
  element: HTMLElement,
  properties: string[] = []
): {
  enable: () => void
  disable: () => void
} {
  const originalWillChange = element.style.willChange

  return {
    enable: () => {
      element.style.willChange =
        properties.length > 0 ? properties.join(', ') : 'transform, opacity'
    },
    disable: () => {
      element.style.willChange = originalWillChange || 'auto'
    },
  }
}

/**
 * Batch DOM operations for better performance
 */
export function batchDOMOperations(operations: (() => void)[]): void {
  requestAnimationFramePolyfill(() => {
    operations.forEach(operation => operation())
  })
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  logResult: boolean = false
): T {
  const startTime = performance.now()
  const result = fn()
  const endTime = performance.now()
  const duration = endTime - startTime

  if (logResult) {
    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
  }

  return result
}

/**
 * Async performance measurement
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  logResult: boolean = false
): Promise<T> {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  const duration = endTime - startTime

  if (logResult) {
    console.log(`Async Performance: ${name} took ${duration.toFixed(2)}ms`)
  }

  return result
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get optimal transition duration based on user preferences
 */
export function getOptimalTransitionDuration(
  baseDuration: number = 300
): number {
  if (prefersReducedMotion()) {
    return 0
  }

  // Reduce duration on slower devices
  if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
    const cores = navigator.hardwareConcurrency || 4
    if (cores < 4) {
      return baseDuration * 0.7
    }
  }

  return baseDuration
}

/**
 * Optimize scroll event handling
 */
export function createOptimizedScrollHandler(
  handler: (event: Event) => void,
  options: {
    throttleDelay?: number
    passive?: boolean
  } = {}
): {
  addEventListener: (element: Element | Window) => void
  removeEventListener: (element: Element | Window) => void
  cleanup: () => void
} {
  const { throttleDelay = 16, passive = true } = options
  const throttledHandler = throttle(handler, throttleDelay)
  const elements = new Set<Element | Window>()

  return {
    addEventListener: (element: Element | Window) => {
      elements.add(element)
      element.addEventListener('scroll', throttledHandler, { passive })
    },
    removeEventListener: (element: Element | Window) => {
      elements.delete(element)
      element.removeEventListener('scroll', throttledHandler)
    },
    cleanup: () => {
      elements.forEach(element => {
        element.removeEventListener('scroll', throttledHandler)
      })
      elements.clear()
    },
  }
}

/**
 * Optimize resize event handling
 */
export function createOptimizedResizeHandler(
  handler: (event: Event) => void,
  options: {
    debounceDelay?: number
    throttleDelay?: number
    passive?: boolean
  } = {}
): {
  addEventListener: () => void
  removeEventListener: () => void
  cleanup: () => void
} {
  const { debounceDelay = 150, throttleDelay = 16, passive = true } = options

  // Use throttle for immediate feedback, debounce for final processing
  const throttledHandler = throttle(handler, throttleDelay)
  const debouncedHandler = debounce(handler, debounceDelay)

  const combinedHandler = (event: Event) => {
    throttledHandler(event)
    debouncedHandler(event)
  }

  return {
    addEventListener: () => {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', combinedHandler, { passive })
      }
    },
    removeEventListener: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', combinedHandler)
      }
    },
    cleanup: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', combinedHandler)
      }
    },
  }
}

/**
 * Memory-efficient event listener manager
 */
export class EventListenerManager {
  private listeners = new Map<Element | Window, Map<string, EventListener>>()

  add(
    element: Element | Window,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map())
    }

    const elementListeners = this.listeners.get(element)!
    const key = `${event}-${options?.passive}-${options?.capture}`

    if (elementListeners.has(key)) {
      this.remove(element, event, options)
    }

    elementListeners.set(key, handler)
    element.addEventListener(event, handler, options)
  }

  remove(
    element: Element | Window,
    event: string,
    options?: EventListenerOptions
  ): void {
    const elementListeners = this.listeners.get(element)
    if (!elementListeners) return

    const key = `${event}-${options?.passive}-${options?.capture}`
    const handler = elementListeners.get(key)

    if (handler) {
      element.removeEventListener(event, handler, options)
      elementListeners.delete(key)

      if (elementListeners.size === 0) {
        this.listeners.delete(element)
      }
    }
  }

  cleanup(): void {
    this.listeners.forEach((elementListeners, element) => {
      elementListeners.forEach((handler, key) => {
        const [event, passive, capture] = key.split('-')
        const options = {
          passive: passive === 'true',
          capture: capture === 'true',
        }
        element.removeEventListener(event, handler, options)
      })
    })
    this.listeners.clear()
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics = new Map<string, number[]>()
  private observers = new Map<string, PerformanceObserver>()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startMeasure(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`)
    }
  }

  endMeasure(name: string): number {
    if (typeof performance === 'undefined') return 0

    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)

    const entries = performance.getEntriesByName(name)
    const duration = entries[entries.length - 1]?.duration || 0

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)

    return duration
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || []
    if (values.length === 0) return 0

    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  getMetrics(): Record<
    string,
    { average: number; count: number; latest: number }
  > {
    const result: Record<
      string,
      { average: number; count: number; latest: number }
    > = {}

    this.metrics.forEach((values, name) => {
      result[name] = {
        average: this.getAverageMetric(name),
        count: values.length,
        latest: values[values.length - 1] || 0,
      }
    })

    return result
  }

  reset(): void {
    this.metrics.clear()
    if (typeof performance !== 'undefined') {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.reset()
  }
}

/**
 * Export singleton instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance()
