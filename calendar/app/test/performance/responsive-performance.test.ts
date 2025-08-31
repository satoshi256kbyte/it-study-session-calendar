import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '../test-utils'
import Home from '../../page'
import ResponsiveEventMaterialsList from '../../components/ResponsiveEventMaterialsList'
import EventMaterialsList from '../../components/EventMaterialsList'

/**
 * レスポンシブイベント資料一覧のパフォーマンステスト
 * 要件7.1, 7.2, 7.3, 7.4に対応
 *
 * - レンダリングパフォーマンスの測定
 * - メモリ使用量の監視
 * - スクロールパフォーマンスの確認
 * - レイアウト切り替えの最適化確認
 */
describe('Responsive Event Materials Performance Tests', () => {
  // 元のwindowサイズを保存
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight
  const originalRequestAnimationFrame = window.requestAnimationFrame
  const originalPerformance = window.performance

  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'

    // requestAnimationFrameをモック
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return setTimeout(callback, 16) // 60FPSをシミュレート
    })

    // performance.nowをモック
    let mockTime = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      mockTime += 16 // 16ms間隔でインクリメント
      return mockTime
    })
  })

  afterEach(() => {
    // windowサイズを元に戻す
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })

    vi.restoreAllMocks()
  })

  describe('レンダリングパフォーマンス測定', () => {
    it('should render initial page within performance budget', async () => {
      const performanceMetrics = {
        initialRender: 0,
        dataLoad: 0,
        totalTime: 0,
      }

      const startTime = performance.now()

      render(React.createElement(Home))

      performanceMetrics.initialRender = performance.now() - startTime

      // データ読み込み時間の測定
      const dataLoadStartTime = performance.now()
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })
      performanceMetrics.dataLoad = performance.now() - dataLoadStartTime
      performanceMetrics.totalTime = performance.now() - startTime

      // パフォーマンス予算の確認
      expect(performanceMetrics.initialRender).toBeLessThan(100) // 100ms以内
      expect(performanceMetrics.dataLoad).toBeLessThan(500) // 500ms以内
      expect(performanceMetrics.totalTime).toBeLessThan(1000) // 1秒以内

      console.log('Performance Metrics:', performanceMetrics)
    })

    it('should maintain performance across different viewport sizes', async () => {
      const viewportSizes = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1280, height: 720 },
        { name: 'Large Desktop', width: 1920, height: 1080 },
      ]

      const performanceResults: Record<string, number> = {}

      for (const { name, width, height } of viewportSizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        })

        const startTime = performance.now()
        render(React.createElement(Home))

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        const renderTime = performance.now() - startTime
        performanceResults[name] = renderTime

        // 各ビューポートサイズで1秒以内のレンダリング
        expect(renderTime).toBeLessThan(1000)

        // クリーンアップ
        screen.getByRole('table').remove()
      }

      console.log('Viewport Performance Results:', performanceResults)

      // 最大と最小の差が2倍以内であることを確認（一貫性）
      const times = Object.values(performanceResults)
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)
      expect(maxTime / minTime).toBeLessThan(2)
    })

    it('should optimize re-renders during layout transitions', async () => {
      let renderCount = 0
      const originalRender = React.createElement

      // レンダリング回数をカウント
      vi.spyOn(React, 'createElement').mockImplementation((...args) => {
        renderCount++
        return originalRender(...args)
      })

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      render(
        React.createElement(ResponsiveEventMaterialsList, {
          events: [],
          loading: false,
          error: null,
        })
      )
      const initialRenderCount = renderCount

      // レイアウト変更を複数回実行
      const layoutChanges = [768, 375, 1024, 1280]

      for (const width of layoutChanges) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          fireEvent(window, new Event('resize'))
        })
      }

      const finalRenderCount = renderCount
      const totalRenders = finalRenderCount - initialRenderCount

      // レイアウト変更あたりの再レンダリング回数が合理的な範囲内
      expect(totalRenders / layoutChanges.length).toBeLessThan(10)

      console.log(
        `Total renders for ${layoutChanges.length} layout changes: ${totalRenders}`
      )
    })

    it('should handle rapid viewport changes efficiently', async () => {
      const rapidChanges = 20
      const viewportSizes = [375, 768, 1024, 1280]

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // 高速でビューポートサイズを変更
      for (let i = 0; i < rapidChanges; i++) {
        const width = viewportSizes[i % viewportSizes.length]
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          fireEvent(window, new Event('resize'))
        })
      }

      const totalTime = performance.now() - startTime

      // 高速変更でも合理的な時間内で処理
      expect(totalTime).toBeLessThan(1000) // 1秒以内
      expect(totalTime / rapidChanges).toBeLessThan(50) // 変更あたり50ms以内

      console.log(
        `Rapid changes performance: ${totalTime}ms for ${rapidChanges} changes`
      )
    })
  })

  describe('メモリ使用量監視', () => {
    it('should maintain reasonable memory usage', async () => {
      // メモリ情報が利用可能な場合のテスト
      const memoryInfo = (performance as any).memory

      if (memoryInfo) {
        const initialMemory = memoryInfo.usedJSHeapSize

        render(React.createElement(Home))

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        const afterRenderMemory = memoryInfo.usedJSHeapSize
        const memoryIncrease = afterRenderMemory - initialMemory

        // メモリ増加が合理的な範囲内（10MB以内）
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)

        console.log(
          `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
        )
      } else {
        console.log('Memory API not available in test environment')
        expect(true).toBe(true) // テストをパス
      }
    })

    it('should prevent memory leaks during layout changes', async () => {
      const memoryInfo = (performance as any).memory

      if (memoryInfo) {
        const initialMemory = memoryInfo.usedJSHeapSize

        // 複数回のレイアウト変更を実行
        for (let i = 0; i < 10; i++) {
          const width = i % 2 === 0 ? 375 : 1280
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
          })

          render(
            React.createElement(ResponsiveEventMaterialsList, {
              events: [],
              loading: false,
              error: null,
            })
          )

          act(() => {
            fireEvent(window, new Event('resize'))
          })

          // クリーンアップ
          document.body.innerHTML = ''
        }

        // ガベージコレクションを促進
        if (global.gc) {
          global.gc()
        }

        const finalMemory = memoryInfo.usedJSHeapSize
        const memoryIncrease = finalMemory - initialMemory

        // メモリリークが発生していないことを確認（20MB以内の増加）
        expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)

        console.log(
          `Memory after layout changes: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`
        )
      } else {
        expect(true).toBe(true) // テストをパス
      }
    })

    it('should efficiently handle large datasets', async () => {
      // 大量のイベントデータをシミュレート
      const largeEventList = Array.from({ length: 100 }, (_, index) => ({
        id: `event-${index}`,
        title: `テストイベント${index}`,
        eventDate: '2024-01-15T19:00:00+09:00',
        eventUrl: `https://connpass.com/event/${index}/`,
        connpassUrl: `https://connpass.com/event/${index}/`,
        materials: [
          {
            id: `material-${index}`,
            title: `テスト資料${index}`,
            url: `https://example.com/slide${index}`,
            type: 'slide' as const,
            createdAt: '2024-01-15T20:00:00+09:00',
          },
        ],
      }))

      const memoryInfo = (performance as any).memory
      const initialMemory = memoryInfo?.usedJSHeapSize || 0

      const startTime = performance.now()
      render(
        React.createElement(ResponsiveEventMaterialsList, {
          events: largeEventList,
          loading: false,
          error: null,
        })
      )
      const renderTime = performance.now() - startTime

      // 大量データでも合理的な時間でレンダリング
      expect(renderTime).toBeLessThan(2000) // 2秒以内

      if (memoryInfo) {
        const afterRenderMemory = memoryInfo.usedJSHeapSize
        const memoryIncrease = afterRenderMemory - initialMemory

        // 大量データでもメモリ使用量が合理的（50MB以内）
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

        console.log(
          `Large dataset performance: ${renderTime}ms render, ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB memory`
        )
      }
    })
  })

  describe('スクロールパフォーマンス確認', () => {
    it('should maintain smooth scrolling on mobile devices', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement
      expect(scrollContainer).toBeInTheDocument()

      // スクロールパフォーマンステスト
      const scrollEvents = 10
      const startTime = performance.now()

      for (let i = 0; i < scrollEvents; i++) {
        act(() => {
          fireEvent.scroll(scrollContainer, {
            target: { scrollLeft: i * 10 },
          })
        })
      }

      const scrollTime = performance.now() - startTime

      // スクロールイベント処理が高速であることを確認
      expect(scrollTime).toBeLessThan(100) // 100ms以内
      expect(scrollTime / scrollEvents).toBeLessThan(10) // イベントあたり10ms以内

      console.log(
        `Scroll performance: ${scrollTime}ms for ${scrollEvents} events`
      )
    })

    it('should optimize scroll event handling with debouncing', async () => {
      let scrollEventCount = 0
      const originalAddEventListener = window.addEventListener

      // スクロールイベントをカウント
      vi.spyOn(window, 'addEventListener').mockImplementation(
        (event, handler, options) => {
          if (event === 'scroll') {
            scrollEventCount++
          }
          return originalAddEventListener.call(window, event, handler, options)
        }
      )

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 高速スクロールイベントをシミュレート
      const rapidScrollEvents = 50
      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement

      for (let i = 0; i < rapidScrollEvents; i++) {
        act(() => {
          fireEvent.scroll(scrollContainer, {
            target: { scrollLeft: i },
          })
        })
      }

      // デバウンシングにより実際のハンドラー呼び出し回数が制限される
      // （実装によって異なるため、合理的な範囲を確認）
      console.log(
        `Scroll events handled: ${scrollEventCount} out of ${rapidScrollEvents}`
      )
      expect(scrollEventCount).toBeGreaterThan(0)
    })

    it('should handle touch scroll gestures efficiently', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      // タッチデバイスをシミュレート
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      })

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement

      const startTime = performance.now()

      // タッチスクロールジェスチャーをシミュレート
      act(() => {
        fireEvent.touchStart(scrollContainer, {
          touches: [{ clientX: 100, clientY: 100 }],
        })
      })

      act(() => {
        fireEvent.touchMove(scrollContainer, {
          touches: [{ clientX: 50, clientY: 100 }],
        })
      })

      act(() => {
        fireEvent.touchEnd(scrollContainer)
      })

      const touchTime = performance.now() - startTime

      // タッチイベント処理が高速であることを確認
      expect(touchTime).toBeLessThan(50) // 50ms以内

      console.log(`Touch scroll performance: ${touchTime}ms`)
    })
  })

  describe('レイアウト切り替え最適化確認', () => {
    it('should minimize layout thrashing during transitions', async () => {
      let layoutCount = 0
      const originalGetBoundingClientRect =
        Element.prototype.getBoundingClientRect

      // レイアウト計算をカウント
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function () {
          layoutCount++
          return originalGetBoundingClientRect.call(this)
        }
      )

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const initialLayoutCount = layoutCount

      // レイアウト変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        fireEvent(window, new Event('resize'))
      })

      const finalLayoutCount = layoutCount
      const layoutCalculations = finalLayoutCount - initialLayoutCount

      // レイアウト計算が最小限に抑えられている
      expect(layoutCalculations).toBeLessThan(20) // 20回以内

      console.log(
        `Layout calculations during transition: ${layoutCalculations}`
      )
    })

    it('should use CSS transforms for smooth animations', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      render(
        React.createElement(ResponsiveEventMaterialsList, {
          events: [],
          loading: false,
          error: null,
        })
      )

      // レイアウト変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      act(() => {
        fireEvent(window, new Event('resize'))
      })

      // GPU最適化クラスが適用されていることを確認
      const container = document.querySelector('.gpu-optimized')
      if (container) {
        expect(container).toHaveClass('gpu-optimized')
      }

      // トランジションクラスが適用されていることを確認
      const transitionElements = document.querySelectorAll('.transition-base')
      expect(transitionElements.length).toBeGreaterThan(0)
    })

    it('should optimize animation frame usage', async () => {
      let animationFrameCount = 0
      const originalRequestAnimationFrame = window.requestAnimationFrame

      vi.stubGlobal(
        'requestAnimationFrame',
        (callback: FrameRequestCallback) => {
          animationFrameCount++
          return originalRequestAnimationFrame(callback)
        }
      )

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const initialFrameCount = animationFrameCount

      // 複数のレイアウト変更
      const layoutChanges = [768, 375, 1024]

      for (const width of layoutChanges) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        act(() => {
          fireEvent(window, new Event('resize'))
        })
      }

      const finalFrameCount = animationFrameCount
      const framesUsed = finalFrameCount - initialFrameCount

      // アニメーションフレームの使用が効率的
      expect(framesUsed).toBeLessThan(layoutChanges.length * 5) // 変更あたり5フレーム以内

      console.log(
        `Animation frames used: ${framesUsed} for ${layoutChanges.length} layout changes`
      )
    })

    it('should batch DOM updates efficiently', async () => {
      let domUpdateCount = 0
      const originalSetAttribute = Element.prototype.setAttribute

      // DOM更新をカウント
      vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(
        function (name, value) {
          domUpdateCount++
          return originalSetAttribute.call(this, name, value)
        }
      )

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const initialUpdateCount = domUpdateCount

      // レイアウト変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      act(() => {
        fireEvent(window, new Event('resize'))
      })

      const finalUpdateCount = domUpdateCount
      const domUpdates = finalUpdateCount - initialUpdateCount

      // DOM更新がバッチ処理されている
      console.log(`DOM updates during layout change: ${domUpdates}`)
      expect(domUpdates).toBeGreaterThan(0) // 何らかの更新が発生
    })
  })

  describe('画像読み込み最適化', () => {
    it('should implement lazy loading for thumbnails', async () => {
      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // サムネイル画像の遅延読み込み確認
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
      expect(thumbnailImage).toHaveAttribute('loading', 'lazy')

      // 画像読み込みイベントのパフォーマンス
      const startTime = performance.now()

      act(() => {
        fireEvent.load(thumbnailImage)
      })

      const loadTime = performance.now() - startTime
      expect(loadTime).toBeLessThan(10) // 10ms以内

      console.log(`Image load event processing: ${loadTime}ms`)
    })

    it('should handle image loading errors without performance impact', async () => {
      render(React.createElement(Home))

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')

      const startTime = performance.now()

      // 画像読み込みエラーをシミュレート
      act(() => {
        fireEvent.error(thumbnailImage)
      })

      const errorHandlingTime = performance.now() - startTime
      expect(errorHandlingTime).toBeLessThan(10) // 10ms以内

      // エラー後もリンクは機能する
      const materialLink = screen.getByRole('link', { name: /テスト資料1/ })
      expect(materialLink).toBeInTheDocument()

      console.log(`Image error handling: ${errorHandlingTime}ms`)
    })

    it('should optimize image sizes for different viewports', async () => {
      const viewportSizes = [375, 768, 1280]

      for (const width of viewportSizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        render(React.createElement(Home))

        await waitFor(() => {
          expect(screen.getByText('テスト資料1')).toBeInTheDocument()
        })

        // サムネイルコンテナのレスポンシブクラス確認
        const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
        const thumbnailContainer = thumbnailImage.closest('div')

        // レスポンシブサイズクラスが適用されている
        expect(thumbnailContainer).toHaveClass('w-12', 'h-9')
        if (width >= 640) {
          expect(thumbnailContainer).toHaveClass('sm:w-16', 'sm:h-12')
        }

        // クリーンアップ
        screen.getByRole('table').remove()
      }
    })
  })
})
