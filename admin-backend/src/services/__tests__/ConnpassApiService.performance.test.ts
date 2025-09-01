import { ConnpassApiService, ConnpassApiError } from '../ConnpassApiService'
import { SecretsManagerService } from '../SecretsManagerService'
import {
  RateLimiter,
  PerformanceMonitor,
} from '../../utils/performanceOptimization'

// モックの作成
jest.mock('../SecretsManagerService')
jest.mock('../../utils/logger')

// fetchのモック
global.fetch = jest.fn()

const MockedSecretsManagerService = SecretsManagerService as jest.MockedClass<
  typeof SecretsManagerService
>

describe('ConnpassApiService - Performance Tests', () => {
  let service: ConnpassApiService
  let mockSecretsManagerService: jest.Mocked<SecretsManagerService>

  beforeEach(() => {
    mockSecretsManagerService =
      new MockedSecretsManagerService() as jest.Mocked<SecretsManagerService>
    MockedSecretsManagerService.mockImplementation(
      () => mockSecretsManagerService
    )

    service = new ConnpassApiService('test-api-key')

    // fetchのモックをリセット
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rate Limit Compliance Tests', () => {
    it('should respect 5-second interval between API calls', async () => {
      // 成功レスポンスのモック
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          events: [
            {
              event_id: 1,
              title: '広島IT勉強会',
              event_url: 'https://hiroshima-it.connpass.com/event/1/',
              started_at: '2024-02-15T19:00:00+09:00',
            },
          ],
          results_returned: 1,
          results_available: 1,
        }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const startTime = Date.now()
      const callTimes: number[] = []

      // 3回連続でAPI呼び出し
      for (let i = 0; i < 3; i++) {
        const callStart = Date.now()
        await service.searchEventsByKeyword('広島')
        callTimes.push(Date.now() - callStart)
      }

      const totalTime = Date.now() - startTime

      // 最低10秒（5秒 × 2回の待機）は必要
      expect(totalTime).toBeGreaterThan(10000)

      // 各呼び出し間の間隔を確認
      expect(global.fetch).toHaveBeenCalledTimes(3)

      console.log(`Rate limit compliance test:`)
      console.log(`- Total time for 3 calls: ${totalTime}ms`)
      console.log(`- Average time per call: ${Math.round(totalTime / 3)}ms`)
      console.log(
        `- Individual call times: ${callTimes.map(t => `${t}ms`).join(', ')}`
      )
    }, 20000) // 20 second timeout

    it('should handle rate limit errors appropriately', async () => {
      // 最初の呼び出しで429エラー、2回目で成功
      const rateLimitResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' }),
      }

      const successResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          events: [],
          results_returned: 0,
          results_available: 0,
        }),
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse)

      const startTime = Date.now()

      // レート制限エラーが発生することを確認
      await expect(service.searchEventsByKeyword('広島')).rejects.toThrow(
        ConnpassApiError
      )

      const errorTime = Date.now() - startTime

      // エラー処理が迅速に完了することを確認
      expect(errorTime).toBeLessThan(1000) // 1秒以内
      expect(global.fetch).toHaveBeenCalledTimes(1)

      console.log(`Rate limit error handling: ${errorTime}ms`)
    }, 10000) // 10 second timeout

    it('should maintain consistent performance across multiple searches', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          events: Array.from({ length: 10 }, (_, index) => ({
            event_id: index + 1,
            title: `イベント ${index + 1}`,
            event_url: `https://connpass.com/event/${index + 1}/`,
            started_at: '2024-02-15T19:00:00+09:00',
          })),
          results_returned: 10,
          results_available: 10,
        }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const performanceMonitor = new PerformanceMonitor(
        'ConnpassApiService Multiple Searches'
      )
      const searchTimes: number[] = []

      // 5回の検索を実行
      for (let i = 0; i < 5; i++) {
        const searchStart = Date.now()
        const result = await service.searchEventsByKeyword(`keyword${i}`)
        const searchTime = Date.now() - searchStart

        searchTimes.push(searchTime)
        performanceMonitor.checkpoint(`Search ${i + 1}`)

        expect(result.events).toHaveLength(10)
        expect(result.totalCount).toBe(10)
      }

      const performanceResult = performanceMonitor.finish()

      // パフォーマンスの一貫性を確認
      const averageSearchTime =
        searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length
      const maxSearchTime = Math.max(...searchTimes)
      const minSearchTime = Math.min(...searchTimes)

      // 最大と最小の差が平均の50%以内であることを確認（一貫性）
      expect(maxSearchTime - minSearchTime).toBeLessThan(
        averageSearchTime * 0.5
      )

      console.log(`Multiple search performance:`)
      console.log(`- Total time: ${performanceResult.totalExecutionTime}ms`)
      console.log(`- Average search time: ${Math.round(averageSearchTime)}ms`)
      console.log(
        `- Min/Max search time: ${minSearchTime}ms / ${maxSearchTime}ms`
      )
      console.log(
        `- Memory increase: ${Math.round((performanceResult.totalMemoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
    }, 30000) // 30 second timeout
  })

  describe('Memory Usage Tests', () => {
    it('should handle large response data efficiently', async () => {
      // 大量のイベントデータを含むレスポンス
      const largeResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          events: Array.from({ length: 100 }, (_, index) => ({
            event_id: index + 1,
            title:
              `大規模イベント ${index + 1} - 非常に長いタイトルでメモリ使用量をテストするためのダミーテキスト`.repeat(
                3
              ),
            event_url: `https://connpass.com/event/${index + 1}/`,
            started_at: '2024-02-15T19:00:00+09:00',
            ended_at: '2024-02-15T21:00:00+09:00',
            description: `詳細な説明文 `.repeat(100), // 大きなdescription
            catch: `キャッチコピー `.repeat(20),
            address: `住所情報 `.repeat(10),
          })),
          results_returned: 100,
          results_available: 100,
        }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(largeResponse)

      const initialMemory = process.memoryUsage()
      const startTime = Date.now()

      const result = await service.searchEventsByKeyword('大規模')

      const endTime = Date.now()
      const finalMemory = process.memoryUsage()

      // 結果の検証
      expect(result.events).toHaveLength(100)
      expect(result.totalCount).toBe(100)

      // パフォーマンス指標の検証
      const executionTime = endTime - startTime
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // 大量データでも適切な時間で処理完了
      expect(executionTime).toBeLessThan(10000) // 10秒以内

      // メモリ使用量が適切な範囲内
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB以内

      console.log(`Large response handling:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(
        `- Memory increase: ${Math.round((memoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
      console.log(`- Events processed: ${result.events.length}`)
    })

    it('should not leak memory during repeated API calls', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          events: [
            {
              event_id: 1,
              title: 'テストイベント',
              event_url: 'https://connpass.com/event/1/',
              started_at: '2024-02-15T19:00:00+09:00',
            },
          ],
          results_returned: 1,
          results_available: 1,
        }),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const initialMemory = process.memoryUsage()

      // 10回連続でAPI呼び出し（メモリリークテスト）
      for (let i = 0; i < 10; i++) {
        await service.searchEventsByKeyword(`test${i}`)

        // ガベージコレクションを促進
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // メモリリークがないことを確認（5MB以内の増加）
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)

      console.log(`Memory leak test (10 calls):`)
      console.log(
        `- Memory increase: ${Math.round((memoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
    }, 60000) // 60 second timeout
  })

  describe('Error Handling Performance Tests', () => {
    it('should handle network errors efficiently', async () => {
      // ネットワークエラーをシミュレート
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const startTime = Date.now()

      await expect(service.searchEventsByKeyword('test')).rejects.toThrow()

      const errorTime = Date.now() - startTime

      // エラー処理が迅速に完了することを確認
      expect(errorTime).toBeLessThan(5000) // 5秒以内
      expect(global.fetch).toHaveBeenCalledTimes(1)

      console.log(`Network error handling: ${errorTime}ms`)
    })

    it('should handle malformed JSON responses efficiently', async () => {
      const malformedResponse = {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue(malformedResponse)

      const startTime = Date.now()

      await expect(service.searchEventsByKeyword('test')).rejects.toThrow()

      const errorTime = Date.now() - startTime

      // JSON解析エラーが迅速に処理されることを確認
      expect(errorTime).toBeLessThan(1000) // 1秒以内

      console.log(`JSON parsing error handling: ${errorTime}ms`)
    })
  })

  describe('Custom Rate Limiter Tests', () => {
    it('should demonstrate rate limiter functionality', async () => {
      const rateLimiter = new RateLimiter(2000, 1, 'TestRateLimiter') // 2秒間隔

      const startTime = Date.now()
      const callTimes: number[] = []

      // 3回の呼び出しでレート制限をテスト
      for (let i = 0; i < 3; i++) {
        const callStart = Date.now()
        await rateLimiter.waitForRateLimit()
        callTimes.push(Date.now() - callStart)
      }

      const totalTime = Date.now() - startTime
      const stats = rateLimiter.getStats()

      // 最低4秒（2秒 × 2回の待機）は必要
      expect(totalTime).toBeGreaterThan(4000)
      expect(stats.callCount).toBe(3)

      console.log(`Rate limiter test:`)
      console.log(`- Total time: ${totalTime}ms`)
      console.log(`- Call count: ${stats.callCount}`)
      console.log(`- Average interval: ${Math.round(stats.averageInterval)}ms`)
    })
  })
})
