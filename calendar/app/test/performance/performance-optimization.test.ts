/**
 * パフォーマンス最適化のテスト
 * 要件: 全要件の最適化
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  PerformanceMonitor,
  measureAsync,
  measureSync,
} from '../../utils/performance'

// Performance APIのモック
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntriesByType: vi.fn(),
  now: vi.fn(() => Date.now()),
}

// PerformanceObserverのモック
const mockPerformanceObserver = vi.fn().mockImplementation(callback => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))

// グローバルオブジェクトのモック
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
})

Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
})

describe('パフォーマンス最適化', () => {
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    vi.clearAllMocks()
    performanceMonitor = PerformanceMonitor.getInstance()
    performanceMonitor.reset()
  })

  afterEach(() => {
    performanceMonitor.cleanup()
  })

  describe('PerformanceMonitor', () => {
    it('シングルトンパターンが正しく動作する', () => {
      const instance1 = PerformanceMonitor.getInstance()
      const instance2 = PerformanceMonitor.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('測定を正しく開始・終了できる', () => {
      const measureName = 'test-measure'

      // 測定開始
      performanceMonitor.startMeasure(measureName)
      expect(mockPerformance.mark).toHaveBeenCalledWith(`${measureName}-start`)

      // 測定終了
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 100 }])
      const duration = performanceMonitor.endMeasure(measureName)

      expect(mockPerformance.mark).toHaveBeenCalledWith(`${measureName}-end`)
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        measureName,
        `${measureName}-start`,
        `${measureName}-end`
      )
      expect(duration).toBe(100)
    })

    it('指標を正しく保存・取得できる', () => {
      const measureName = 'test-measure'
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 150 }])

      performanceMonitor.startMeasure(measureName)
      performanceMonitor.endMeasure(measureName)

      expect(performanceMonitor.getMetric(measureName)).toBe(150)
    })

    it('すべての指標を取得できる', () => {
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 200 }])

      performanceMonitor.startMeasure('measure1')
      performanceMonitor.endMeasure('measure1')

      performanceMonitor.startMeasure('measure2')
      performanceMonitor.endMeasure('measure2')

      const allMetrics = performanceMonitor.getAllMetrics()
      expect(allMetrics).toHaveProperty('measure1', 200)
      expect(allMetrics).toHaveProperty('measure2', 200)
    })
  })

  describe('measureAsync', () => {
    it('非同期関数の実行時間を測定できる', async () => {
      const testFunction = vi.fn().mockResolvedValue('test-result')
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 300 }])

      const result = await measureAsync('async-test', testFunction)

      expect(result).toBe('test-result')
      expect(testFunction).toHaveBeenCalledOnce()
      expect(mockPerformance.mark).toHaveBeenCalledWith('async-test-start')
      expect(mockPerformance.mark).toHaveBeenCalledWith('async-test-end')
    })

    it('非同期関数でエラーが発生しても測定を終了する', async () => {
      const testError = new Error('Test error')
      const testFunction = vi.fn().mockRejectedValue(testError)

      await expect(
        measureAsync('async-error-test', testFunction)
      ).rejects.toThrow(testError)

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        'async-error-test-start'
      )
      expect(mockPerformance.mark).toHaveBeenCalledWith('async-error-test-end')
    })
  })

  describe('measureSync', () => {
    it('同期関数の実行時間を測定できる', () => {
      const testFunction = vi.fn().mockReturnValue('sync-result')
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 50 }])

      const result = measureSync('sync-test', testFunction)

      expect(result).toBe('sync-result')
      expect(testFunction).toHaveBeenCalledOnce()
      expect(mockPerformance.mark).toHaveBeenCalledWith('sync-test-start')
      expect(mockPerformance.mark).toHaveBeenCalledWith('sync-test-end')
    })

    it('同期関数でエラーが発生しても測定を終了する', () => {
      const testError = new Error('Sync test error')
      const testFunction = vi.fn().mockImplementation(() => {
        throw testError
      })

      expect(() => measureSync('sync-error-test', testFunction)).toThrow(
        testError
      )

      expect(mockPerformance.mark).toHaveBeenCalledWith('sync-error-test-start')
      expect(mockPerformance.mark).toHaveBeenCalledWith('sync-error-test-end')
    })
  })

  describe('Web Vitals', () => {
    it('Web Vitals指標を取得できる', () => {
      // FCP指標をモック
      mockPerformance.getEntriesByName.mockImplementation(name => {
        if (name === 'first-contentful-paint') {
          return [{ startTime: 1200 }]
        }
        return []
      })

      // Navigation Timing APIをモック
      mockPerformance.getEntriesByType.mockImplementation(type => {
        if (type === 'navigation') {
          return [{ domInteractive: 2000 }]
        }
        return []
      })

      const webVitals = performanceMonitor.getWebVitals()

      expect(webVitals.fcp).toBe(1200)
      expect(webVitals.tti).toBe(2000)
    })
  })

  describe('メモリ管理', () => {
    it('リセット機能が正しく動作する', () => {
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 100 }])

      performanceMonitor.startMeasure('test')
      performanceMonitor.endMeasure('test')

      expect(performanceMonitor.getMetric('test')).toBe(100)

      performanceMonitor.reset()

      expect(performanceMonitor.getMetric('test')).toBeUndefined()
    })

    it('クリーンアップ機能が正しく動作する', () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      }
      mockPerformanceObserver.mockReturnValue(mockObserver)

      // 新しいインスタンスを作成してオブザーバーを初期化
      const newMonitor = new (PerformanceMonitor as any)()

      newMonitor.cleanup()

      // オブザーバーが切断されることを確認
      expect(mockObserver.disconnect).toHaveBeenCalled()
    })
  })

  describe('エラーハンドリング', () => {
    it('Performance APIが利用できない場合でもエラーにならない', () => {
      // Performance APIを無効化
      Object.defineProperty(global, 'performance', {
        value: undefined,
        writable: true,
      })

      expect(() => {
        performanceMonitor.startMeasure('test')
        performanceMonitor.endMeasure('test')
      }).not.toThrow()

      // Performance APIを復元
      Object.defineProperty(global, 'performance', {
        value: mockPerformance,
        writable: true,
      })
    })

    it('PerformanceObserverが利用できない場合でもエラーにならない', () => {
      Object.defineProperty(global, 'PerformanceObserver', {
        value: undefined,
        writable: true,
      })

      expect(() => {
        new (PerformanceMonitor as any)()
      }).not.toThrow()

      // PerformanceObserverを復元
      Object.defineProperty(global, 'PerformanceObserver', {
        value: mockPerformanceObserver,
        writable: true,
      })
    })
  })
})

describe('パフォーマンス最適化の統合テスト', () => {
  it('実際のユースケースでパフォーマンス測定が動作する', async () => {
    const monitor = PerformanceMonitor.getInstance()
    mockPerformance.getEntriesByName.mockReturnValue([{ duration: 250 }])

    // Twitter共有のシミュレーション
    const twitterShareSimulation = async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'share-completed'
    }

    const result = await measureAsync(
      'twitterShareResponse',
      twitterShareSimulation
    )

    expect(result).toBe('share-completed')
    expect(monitor.getMetric('twitterShareResponse')).toBe(250)
  })

  it('シェアテキスト生成のパフォーマンス測定が動作する', () => {
    const monitor = PerformanceMonitor.getInstance()
    mockPerformance.getEntriesByName.mockReturnValue([{ duration: 15 }])

    const shareTextGeneration = () => {
      // シェアテキスト生成のシミュレーション
      return '📅 今月の広島IT勉強会\n\n01/25 React勉強会\n\n詳細はこちら: https://example.com'
    }

    const result = measureSync('shareTextGeneration', shareTextGeneration)

    expect(result).toContain('React勉強会')
    expect(monitor.getMetric('shareTextGeneration')).toBe(15)
  })
})
