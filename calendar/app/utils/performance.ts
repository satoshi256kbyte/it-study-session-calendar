/**
 * パフォーマンス最適化ユーティリティ
 * 要件7.1, 7.2: パフォーマンス最適化の実装
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react'

/**
 * パフォーマンス監視を初期化する関数
 * 要件7.1: パフォーマンス監視の初期化
 */
export const initializePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    // Web Vitals の監視
    if (typeof window !== 'undefined' && 'performance' in window) {
      // First Contentful Paint (FCP) の監視
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === 'paint' &&
            entry.name === 'first-contentful-paint'
          ) {
            console.log(`[Performance] FCP: ${entry.startTime}ms`)
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['paint'] })
      } catch (e) {
        // PerformanceObserver がサポートされていない場合は無視
        console.log('[Performance] PerformanceObserver not supported')
      }

      // メモリ使用量の監視（Chrome のみ）
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory
        console.log(
          `[Performance] Memory - Used: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
        )
      }
    }
  }
}

/**
 * レンダリング最適化のためのメモ化ヘルパー
 * 要件7.1: React.memoを使用したコンポーネントの最適化
 */
export const createMemoizedComponent = <T extends React.ComponentType<any>>(
  Component: T,
  areEqual?: (
    prevProps: React.ComponentProps<T>,
    nextProps: React.ComponentProps<T>
  ) => boolean
): T => {
  return React.memo(Component, areEqual) as T
}

/**
 * 深い比較を行うメモ化関数
 * 要件7.1: useMemoでレイアウト計算のキャッシュを実装
 */
export const useDeepMemoize = <T>(fn: () => T, deps: any[]): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedValue = useMemo(() => fn(), deps)
  return memoizedValue
}

/**
 * パフォーマンス測定フック
 * 開発時のパフォーマンス監視用
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(Date.now())

  useEffect(() => {
    renderCountRef.current += 1
    const currentTime = Date.now()
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current
    lastRenderTimeRef.current = currentTime

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Performance] ${componentName} - Render #${renderCountRef.current}, Time since last: ${timeSinceLastRender}ms`
      )
    }
  })

  return {
    renderCount: renderCountRef.current,
    logRender: useCallback(
      (additionalInfo?: string) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Performance] ${componentName} - ${additionalInfo || 'Manual log'}`
          )
        }
      },
      [componentName]
    ),
  }
}

/**
 * 重い計算をメモ化するフック
 * 要件7.1: useMemoでレイアウト計算のキャッシュを実装
 */
export const useExpensiveCalculation = <T>(
  calculation: () => T,
  dependencies: any[]
): T => {
  return useMemo(() => {
    const startTime = performance.now()
    const result = calculation()
    const endTime = performance.now()

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Performance] Expensive calculation took ${endTime - startTime}ms`
      )
    }

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
}

/**
 * イベントハンドラーの最適化フック
 * 要件7.1: useCallbackでイベントハンドラーの最適化
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, dependencies)
}

/**
 * レンダリング最適化のためのprops比較関数
 * 要件7.1: React.memoを使用したコンポーネントの最適化
 */
export const createPropsComparator = <T extends Record<string, any>>(
  keysToCompare?: (keyof T)[]
) => {
  return (prevProps: T, nextProps: T): boolean => {
    if (keysToCompare) {
      // 指定されたキーのみを比較
      return keysToCompare.every(key =>
        Object.is(prevProps[key], nextProps[key])
      )
    }

    // 全てのキーを浅い比較
    const prevKeys = Object.keys(prevProps)
    const nextKeys = Object.keys(nextProps)

    if (prevKeys.length !== nextKeys.length) {
      return false
    }

    return prevKeys.every(key => Object.is(prevProps[key], nextProps[key]))
  }
}

/**
 * GPU加速を活用するCSS最適化ヘルパー
 * 要件7.4: GPU加速の活用（transform, opacity）
 */
export const getGPUOptimizedStyles = (
  isAnimating: boolean = false
): React.CSSProperties => ({
  willChange: isAnimating ? 'transform, opacity' : 'auto',
  transform: 'translateZ(0)', // GPU加速を強制
  backfaceVisibility: 'hidden' as const,
})

/**
 * レスポンシブ画像の最適化ヘルパー
 * 要件7.3: 画像サイズの動的調整機能
 */
export const generateResponsiveImageProps = (
  baseUrl: string,
  alt: string,
  sizes: { mobile: number; tablet: number; desktop: number }
) => {
  const srcSet = [
    `${baseUrl}?w=${sizes.mobile} ${sizes.mobile}w`,
    `${baseUrl}?w=${sizes.tablet} ${sizes.tablet}w`,
    `${baseUrl}?w=${sizes.desktop} ${sizes.desktop}w`,
  ].join(', ')

  const sizesAttr = [
    `(max-width: 767px) ${sizes.mobile}px`,
    `(max-width: 1023px) ${sizes.tablet}px`,
    `${sizes.desktop}px`,
  ].join(', ')

  return {
    src: `${baseUrl}?w=${sizes.desktop}`,
    srcSet,
    sizes: sizesAttr,
    alt,
    loading: 'lazy' as const,
    decoding: 'async' as const,
  }
}

/**
 * 仮想化のためのアイテム計算ヘルパー
 * 要件7.1: 大量のデータの効率的な処理
 */
export const calculateVirtualizedItems = (
  totalItems: number,
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  overscan: number = 5
) => {
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  )

  const startIndex = Math.max(0, visibleStart - overscan)
  const endIndex = Math.min(totalItems - 1, visibleEnd + overscan)

  return {
    startIndex,
    endIndex,
    visibleItems: endIndex - startIndex + 1,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight,
  }
}

/**
 * デバウンス最適化フック
 * 要件7.1: パフォーマンス最適化
 */
export const useOptimizedDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // 最新のコールバックを保持
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  ) as T

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * スロットリング最適化フック
 * 要件7.1: パフォーマンス最適化
 */
export const useOptimizedThrottle = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  // 最新のコールバックを保持
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      }
    },
    [delay]
  ) as T

  return throttledCallback
}

/**
 * Intersection Observer最適化フック
 * 要件7.3: 遅延読み込み（lazy loading）の実装
 */
export const useOptimizedIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const callbackRef = useRef(callback)

  // 最新のコールバックを保持
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const observe = useCallback(
    (element: Element) => {
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          entries => callbackRef.current(entries),
          {
            rootMargin: '50px',
            threshold: 0.1,
            ...options,
          }
        )
      }
      observerRef.current.observe(element)
    },
    [options]
  )

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { observe, unobserve, disconnect }
}
