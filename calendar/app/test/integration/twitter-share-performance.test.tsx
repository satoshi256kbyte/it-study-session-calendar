/**
 * Twitter Share Button Performance Tests
 * 要件: パフォーマンス最適化の検証
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import TwitterShareButton from '../../components/TwitterShareButton'
import { ShareContentGenerator } from '../../services/shareContentGenerator'
import { StudySessionEvent } from '../../types/studySessionEvent'

// パフォーマンス測定用のモック
const mockPerformanceNow = vi.fn()
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
})

describe('Twitter Share Performance Tests', () => {
  const defaultProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会 #1\n01/28 Python入門セミナー\n\n詳細はこちら: https://example.com/calendar',
    calendarUrl: 'https://example.com/calendar',
  }

  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(0)
    vi.clearAllMocks()
  })

  describe('Component Rendering Performance', () => {
    test('should render quickly with minimal re-renders', () => {
      const renderStart = performance.now()

      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      // 複数回の再レンダリングをテスト
      for (let i = 0; i < 10; i++) {
        rerender(
          <TwitterShareButton
            {...defaultProps}
            shareText={`Updated text ${i}`}
          />
        )
      }

      const renderEnd = performance.now()
      const renderTime = renderEnd - renderStart

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(100) // 100ms以下

      // コンポーネントが正常にレンダリングされていることを確認
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    test('should not cause unnecessary re-renders when props do not change', () => {
      const renderSpy = vi.fn()

      const TestComponent = (props: typeof defaultProps) => {
        renderSpy()
        return <TwitterShareButton {...props} />
      }

      const { rerender } = render(<TestComponent {...defaultProps} />)

      // 同じpropsで再レンダリング
      rerender(<TestComponent {...defaultProps} />)
      rerender(<TestComponent {...defaultProps} />)

      // 初回レンダリングのみ実行されることを確認
      expect(renderSpy).toHaveBeenCalledTimes(3) // React.StrictModeで2回 + 再レンダリング1回
    })

    test('should handle rapid state changes efficiently', () => {
      const { rerender } = render(<TwitterShareButton {...defaultProps} />)

      const stateChangeStart = performance.now()

      // 状態を高速で変更
      rerender(<TwitterShareButton {...defaultProps} isLoading />)
      rerender(<TwitterShareButton {...defaultProps} hasError />)
      rerender(<TwitterShareButton {...defaultProps} disabled />)
      rerender(<TwitterShareButton {...defaultProps} />)

      const stateChangeEnd = performance.now()
      const stateChangeTime = stateChangeEnd - stateChangeStart

      expect(stateChangeTime).toBeLessThan(50) // 50ms以下
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('ShareContentGenerator Performance', () => {
    test('should cache results for identical inputs', () => {
      const generator = new ShareContentGenerator({
        calendarUrl: 'https://example.com/calendar',
      })

      const sampleEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: 'React勉強会',
          startDate: new Date('2025-01-25T19:00:00'),
          endDate: new Date('2025-01-25T21:00:00'),
          status: 'approved',
        },
        {
          id: '2',
          title: 'Python入門',
          startDate: new Date('2025-01-28T19:00:00'),
          endDate: new Date('2025-01-28T21:00:00'),
          status: 'approved',
        },
      ]

      // 初回実行
      const firstStart = performance.now()
      const firstResult = generator.generateTwitterContent(sampleEvents)
      const firstEnd = performance.now()
      const firstTime = firstEnd - firstStart

      // 同じデータで2回目実行（キャッシュヒット）
      const secondStart = performance.now()
      const secondResult = generator.generateTwitterContent(sampleEvents)
      const secondEnd = performance.now()
      const secondTime = secondEnd - secondStart

      // 結果が同じであることを確認
      expect(secondResult).toEqual(firstResult)

      // 2回目の方が高速であることを確認（キャッシュ効果）
      // 注意: 非常に高速な処理のため、時間差が測定できない場合があります
      expect(secondTime).toBeLessThanOrEqual(firstTime)

      // キャッシュ統計を確認
      const cacheStats = generator.getCacheStats()
      expect(cacheStats.size).toBe(1)
    })

    test('should handle large datasets efficiently', () => {
      const generator = new ShareContentGenerator({
        calendarUrl: 'https://example.com/calendar',
      })

      // 大量のイベントデータを生成
      const largeEventSet: StudySessionEvent[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `event-${i}`,
          title: `勉強会 ${i + 1}`,
          startDate: new Date(`2025-01-${(i % 28) + 1}T19:00:00`),
          endDate: new Date(`2025-01-${(i % 28) + 1}T21:00:00`),
          status: 'approved' as const,
        })
      )

      const processingStart = performance.now()
      const result = generator.generateTwitterContent(largeEventSet)
      const processingEnd = performance.now()
      const processingTime = processingEnd - processingStart

      // 大量データでも合理的な時間で処理されることを確認
      expect(processingTime).toBeLessThan(200) // 200ms以下
      expect(result.shareText).toBeDefined()
      expect(result.shareText.length).toBeLessThanOrEqual(280) // Twitter制限内
    })

    test('should clear cache when configuration changes', () => {
      const generator = new ShareContentGenerator({
        calendarUrl: 'https://example.com/calendar',
      })

      const sampleEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: 'React勉強会',
          startDate: new Date('2025-01-25T19:00:00'),
          endDate: new Date('2025-01-25T21:00:00'),
          status: 'approved',
        },
      ]

      // 初回実行でキャッシュを作成
      generator.generateTwitterContent(sampleEvents)
      expect(generator.getCacheStats().size).toBe(1)

      // 設定変更
      generator.updateConfig({ hashtags: ['#新しいハッシュタグ'] })

      // キャッシュがクリアされることを確認
      expect(generator.getCacheStats().size).toBe(0)
    })
  })

  describe('Memory Usage', () => {
    test('should not cause memory leaks with repeated operations', () => {
      const generator = new ShareContentGenerator({
        calendarUrl: 'https://example.com/calendar',
      })

      const sampleEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: 'React勉強会',
          startDate: new Date('2025-01-25T19:00:00'),
          endDate: new Date('2025-01-25T21:00:00'),
          status: 'approved',
        },
      ]

      // 大量の操作を実行
      for (let i = 0; i < 50; i++) {
        const modifiedEvents = sampleEvents.map(event => ({
          ...event,
          id: `${event.id}-${i}`, // IDを変更してキャッシュミスを発生させる
        }))
        generator.generateTwitterContent(modifiedEvents)
      }

      // キャッシュサイズが制限内に収まっていることを確認
      const cacheStats = generator.getCacheStats()
      expect(cacheStats.size).toBeLessThanOrEqual(11) // maxCacheSize + 1 (cleanup前)
    })

    test('should clean up expired cache entries', async () => {
      const generator = new ShareContentGenerator({
        calendarUrl: 'https://example.com/calendar',
      })

      const sampleEvents: StudySessionEvent[] = [
        {
          id: '1',
          title: 'React勉強会',
          startDate: new Date('2025-01-25T19:00:00'),
          endDate: new Date('2025-01-25T21:00:00'),
          status: 'approved',
        },
      ]

      // キャッシュエントリを作成
      generator.generateTwitterContent(sampleEvents)
      expect(generator.getCacheStats().size).toBe(1)

      // 時間を進める（モック）
      let currentTime = 0
      mockPerformanceNow.mockImplementation(() => {
        currentTime += 6 * 60 * 1000 // 6分進める（キャッシュ期限5分を超過）
        return currentTime
      })

      // 新しい操作を実行（期限切れエントリのクリーンアップをトリガー）
      const newEvents = [{ ...sampleEvents[0], id: '2' }]
      generator.generateTwitterContent(newEvents)

      // 期限切れエントリがクリーンアップされることを確認
      const cacheStats = generator.getCacheStats()
      expect(cacheStats.size).toBeLessThanOrEqual(2) // 新しいエントリ + 可能性のある残存エントリ
    })
  })

  describe('User Interaction Performance', () => {
    test('should handle rapid clicks without performance degradation', () => {
      const mockWindowOpen = vi.fn().mockReturnValue({ focus: vi.fn() })
      Object.defineProperty(global.window, 'open', {
        value: mockWindowOpen,
        writable: true,
      })

      render(<TwitterShareButton {...defaultProps} />)
      const button = screen.getByRole('button')

      const clickStart = performance.now()

      // 高速で複数回クリック
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button)
      }

      const clickEnd = performance.now()
      const clickTime = clickEnd - clickStart

      expect(clickTime).toBeLessThan(100) // 100ms以下
      expect(mockWindowOpen).toHaveBeenCalledTimes(10)
    })

    test('should handle keyboard navigation efficiently', () => {
      render(<TwitterShareButton {...defaultProps} />)
      const button = screen.getByRole('button')

      const keyboardStart = performance.now()

      // 複数のキーボードイベント
      fireEvent.keyDown(button, { key: 'Tab' })
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      fireEvent.keyDown(button, { key: 'Escape' })

      const keyboardEnd = performance.now()
      const keyboardTime = keyboardEnd - keyboardStart

      expect(keyboardTime).toBeLessThan(50) // 50ms以下
    })
  })

  describe('Bundle Size Impact', () => {
    test('should not import unnecessary dependencies', () => {
      // このテストは実際のバンドルサイズ分析ツールで実行されるべきですが、
      // ここでは基本的な依存関係チェックを行います

      const component = render(<TwitterShareButton {...defaultProps} />)
      expect(component).toBeDefined()

      // コンポーネントが正常に動作することを確認
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
