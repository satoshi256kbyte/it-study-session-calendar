/**
 * パフォーマンス監視ユーティリティ
 * 要件: 全要件の最適化
 */

/**
 * パフォーマンス指標の型定義
 */
export interface PerformanceMetrics {
  /** First Contentful Paint */
  fcp?: number
  /** Largest Contentful Paint */
  lcp?: number
  /** First Input Delay */
  fid?: number
  /** Cumulative Layout Shift */
  cls?: number
  /** Time to Interactive */
  tti?: number
  /** Total Blocking Time */
  tbt?: number
}

/**
 * カスタムパフォーマンス指標
 */
export interface CustomMetrics {
  /** Twitter共有ボタンの応答時間 */
  twitterShareResponseTime?: number
  /** 勉強会データ取得時間 */
  studySessionDataFetchTime?: number
  /** シェアテキスト生成時間 */
  shareTextGenerationTime?: number
  /** カレンダー読み込み時間 */
  calendarLoadTime?: number
}

/**
 * パフォーマンス測定クラス
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()

  private constructor() {
    this.initializeObservers()
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * パフォーマンスオブザーバーを初期化
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          startTime: number
        }
        this.metrics.set('lcp', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', lcpObserver)

      // First Input Delay
      const fidObserver = new PerformanceObserver(list => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          const fidEntry = entry as PerformanceEntry & {
            processingStart: number
            startTime: number
          }
          const fid = fidEntry.processingStart - fidEntry.startTime
          this.metrics.set('fid', fid)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', fidObserver)

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver(list => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach(entry => {
          const layoutShiftEntry = entry as PerformanceEntry & {
            value: number
            hadRecentInput: boolean
          }
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value
          }
        })
        this.metrics.set('cls', clsValue)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', clsObserver)
    } catch (error) {
      console.warn('パフォーマンスオブザーバーの初期化に失敗しました:', error)
    }
  }

  /**
   * カスタム測定を開始
   */
  public startMeasure(name: string): void {
    try {
      if (
        typeof window !== 'undefined' &&
        'performance' in window &&
        typeof window.performance?.mark === 'function'
      ) {
        window.performance.mark(`${name}-start`)
      } else if (
        typeof performance !== 'undefined' &&
        typeof performance?.mark === 'function'
      ) {
        performance.mark(`${name}-start`)
      }
    } catch (error) {
      // Silently fail in test environments or when performance API is not available
    }
  }

  /**
   * カスタム測定を終了
   */
  public endMeasure(name: string): number {
    try {
      let perf: Performance | undefined

      if (
        typeof window !== 'undefined' &&
        'performance' in window &&
        typeof window.performance?.mark === 'function'
      ) {
        perf = window.performance
      } else if (
        typeof performance !== 'undefined' &&
        typeof performance?.mark === 'function'
      ) {
        perf = performance
      }

      if (!perf) {
        return 0
      }

      perf.mark(`${name}-end`)
      perf.measure(name, `${name}-start`, `${name}-end`)

      const measure = perf.getEntriesByName(name, 'measure')[0]
      const duration = measure?.duration || 0

      this.metrics.set(name, duration)

      // クリーンアップ
      if (perf.clearMarks) {
        perf.clearMarks(`${name}-start`)
        perf.clearMarks(`${name}-end`)
      }
      if (perf.clearMeasures) {
        perf.clearMeasures(name)
      }

      return duration
    } catch (error) {
      // Silently fail in test environments or when performance API is not available
      return 0
    }
  }

  /**
   * 指定された指標を取得
   */
  public getMetric(name: string): number | undefined {
    return this.metrics.get(name)
  }

  /**
   * すべての指標を取得
   */
  public getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics.entries())
  }

  /**
   * Web Vitals指標を取得
   */
  public getWebVitals(): PerformanceMetrics {
    return {
      fcp: this.getFirstContentfulPaint(),
      lcp: this.metrics.get('lcp'),
      fid: this.metrics.get('fid'),
      cls: this.metrics.get('cls'),
      tti: this.getTimeToInteractive(),
    }
  }

  /**
   * First Contentful Paintを取得
   */
  private getFirstContentfulPaint(): number | undefined {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return undefined
    }

    try {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
      return fcpEntry?.startTime
    } catch (error) {
      return undefined
    }
  }

  /**
   * Time to Interactiveを推定
   */
  private getTimeToInteractive(): number | undefined {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return undefined
    }

    try {
      const navigationEntry = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      return navigationEntry?.domInteractive
    } catch (error) {
      return undefined
    }
  }

  /**
   * パフォーマンス指標をコンソールに出力（開発時のみ）
   */
  public logMetrics(): void {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const webVitals = this.getWebVitals()
    const customMetrics = this.getAllMetrics()

    console.group('🚀 パフォーマンス指標')

    console.group('📊 Web Vitals')
    if (webVitals.fcp) console.log(`FCP: ${webVitals.fcp.toFixed(2)}ms`)
    if (webVitals.lcp) console.log(`LCP: ${webVitals.lcp.toFixed(2)}ms`)
    if (webVitals.fid) console.log(`FID: ${webVitals.fid.toFixed(2)}ms`)
    if (webVitals.cls) console.log(`CLS: ${webVitals.cls.toFixed(4)}`)
    if (webVitals.tti) console.log(`TTI: ${webVitals.tti.toFixed(2)}ms`)
    console.groupEnd()

    console.group('⚡ カスタム指標')
    Object.entries(customMetrics).forEach(([name, value]) => {
      if (!['lcp', 'fid', 'cls'].includes(name)) {
        console.log(`${name}: ${value.toFixed(2)}ms`)
      }
    })
    console.groupEnd()

    console.groupEnd()
  }

  /**
   * パフォーマンス指標をリセット
   */
  public reset(): void {
    this.metrics.clear()
  }

  /**
   * オブザーバーを停止してリソースをクリーンアップ
   */
  public cleanup(): void {
    this.observers.forEach(observer => {
      observer.disconnect()
    })
    this.observers.clear()
    this.metrics.clear()
  }
}

/**
 * パフォーマンス測定用のデコレーター関数
 */
export function measurePerformance(name: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!

    descriptor.value = async function (this: any, ...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      monitor.startMeasure(name)

      try {
        const result = await originalMethod.apply(this, args)
        return result
      } finally {
        monitor.endMeasure(name)
      }
    } as T

    return descriptor
  }
}

/**
 * パフォーマンス測定用のヘルパー関数
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance()
  monitor.startMeasure(name)

  try {
    const result = await fn()
    return result
  } finally {
    monitor.endMeasure(name)
  }
}

/**
 * 同期関数のパフォーマンス測定用ヘルパー関数
 */
export function measureSync<T>(name: string, fn: () => T): T {
  const monitor = PerformanceMonitor.getInstance()
  monitor.startMeasure(name)

  try {
    const result = fn()
    return result
  } finally {
    monitor.endMeasure(name)
  }
}

/**
 * グローバルパフォーマンスモニターインスタンス
 */
export const performanceMonitor = PerformanceMonitor.getInstance()

/**
 * パフォーマンス監視を開始（アプリケーション起動時に呼び出し）
 */
export function initializePerformanceMonitoring(): void {
  if (typeof window === 'undefined') {
    return
  }

  // ページロード完了後にメトリクスをログ出力
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.logMetrics()
    }, 1000)
  })

  // ページ離脱時にクリーンアップ
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup()
  })
}
