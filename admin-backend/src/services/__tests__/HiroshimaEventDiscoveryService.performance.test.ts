import { HiroshimaEventDiscoveryService } from '../HiroshimaEventDiscoveryService'
import { ConnpassApiService } from '../ConnpassApiService'
import { DynamoDBService } from '../DynamoDBService'
import { NotificationService } from '../NotificationService'
import {
  ConnpassEventData,
  ConnpassSearchResult,
} from '../../types/EventMaterial'
import { StudySession } from '../../types/StudySession'

// モックの作成
jest.mock('../ConnpassApiService')
jest.mock('../DynamoDBService')
jest.mock('../NotificationService')
jest.mock('../../utils/logger')

const MockedConnpassApiService = ConnpassApiService as jest.MockedClass<
  typeof ConnpassApiService
>
const MockedDynamoDBService = DynamoDBService as jest.MockedClass<
  typeof DynamoDBService
>
const MockedNotificationService = NotificationService as jest.MockedClass<
  typeof NotificationService
>

describe('HiroshimaEventDiscoveryService - Performance Tests', () => {
  let service: HiroshimaEventDiscoveryService
  let mockConnpassApiService: jest.Mocked<ConnpassApiService>
  let mockDynamoDBService: jest.Mocked<DynamoDBService>
  let mockNotificationService: jest.Mocked<NotificationService>

  beforeEach(() => {
    // モックインスタンスの作成
    mockConnpassApiService = new MockedConnpassApiService(
      'test-api-key'
    ) as jest.Mocked<ConnpassApiService>
    mockDynamoDBService =
      new MockedDynamoDBService() as jest.Mocked<DynamoDBService>
    mockNotificationService =
      new MockedNotificationService() as jest.Mocked<NotificationService>

    // サービスインスタンスの作成
    service = new HiroshimaEventDiscoveryService(
      mockConnpassApiService,
      mockDynamoDBService,
      mockNotificationService
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('API Rate Limit Compliance Tests', () => {
    it('should respect connpass API rate limits during search', async () => {
      const mockSearchResult: ConnpassSearchResult = {
        events: [],
        totalCount: 0,
      }

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )

      const startTime = Date.now()
      await service.discoverAndRegisterEvents()
      const endTime = Date.now()

      // connpass API検索は1回のみ実行されることを確認
      expect(
        mockConnpassApiService.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
      expect(mockConnpassApiService.searchEventsByKeyword).toHaveBeenCalledWith(
        '広島',
        100
      )

      // 実行時間が適切な範囲内であることを確認（5秒の待機時間は含まれない想定）
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(5000) // 5秒未満で完了すること
    })

    it('should handle rate limit errors appropriately', async () => {
      // レート制限エラーをシミュレート
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'ConnpassApiError'
      ;(rateLimitError as any).statusCode = 429

      mockConnpassApiService.searchEventsByKeyword.mockRejectedValue(
        rateLimitError
      )

      const startTime = Date.now()
      const result = await service.discoverAndRegisterEvents()
      const endTime = Date.now()

      // エラーが適切に処理されることを確認
      expect(result.totalFound).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Critical error')

      // 実行時間が適切であることを確認
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(1000) // 1秒未満で完了すること（リトライなし）
    })
  })

  describe('Memory Usage and Execution Time Tests', () => {
    it('should handle large number of events efficiently', async () => {
      // 大量のイベントデータを生成（100件）
      const mockEvents: ConnpassEventData[] = Array.from(
        { length: 100 },
        (_, index) => ({
          event_id: index + 1,
          title: `広島IT勉強会 #${index + 1}`,
          event_url: `https://hiroshima-it.connpass.com/event/${index + 1}/`,
          started_at: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
          ended_at: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T21:00:00+09:00`,
          description: `広島でのIT勉強会です #${index + 1}`,
        })
      )

      const mockSearchResult: ConnpassSearchResult = {
        events: mockEvents,
        totalCount: 100,
      }

      // 全て新規イベントとして設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)

      // 登録処理のモック設定
      mockDynamoDBService.createStudySessionFromConnpass.mockImplementation(
        async eventData => ({
          id: `test-id-${eventData.event_id}`,
          title: eventData.title,
          url: eventData.event_url,
          datetime: eventData.started_at,
          endDatetime: eventData.ended_at,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )

      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      // メモリ使用量の測定開始
      const initialMemory = process.memoryUsage()
      const startTime = Date.now()

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      const endTime = Date.now()
      const finalMemory = process.memoryUsage()

      // 結果の検証
      expect(result.totalFound).toBe(100)
      expect(result.newRegistrations).toBe(100)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.registeredEvents).toHaveLength(100)

      // パフォーマンス指標の検証
      const executionTime = endTime - startTime
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // 実行時間が適切な範囲内であることを確認（30秒以内）
      expect(executionTime).toBeLessThan(30000)

      // メモリ使用量の増加が適切な範囲内であることを確認（50MB以内）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

      // 各サービスの呼び出し回数を確認
      expect(
        mockConnpassApiService.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
      expect(mockDynamoDBService.checkEventExists).toHaveBeenCalledTimes(100)
      expect(
        mockDynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(100)
      expect(
        mockNotificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(100)

      console.log(`Performance metrics for 100 events:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(
        `- Memory increase: ${Math.round((memoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
      console.log(
        `- Average time per event: ${Math.round((executionTime / 100) * 100) / 100}ms`
      )
    })

    it('should handle mixed processing scenarios efficiently', async () => {
      // 50件のイベント（25件新規、25件重複）
      const mockEvents: ConnpassEventData[] = Array.from(
        { length: 50 },
        (_, index) => ({
          event_id: index + 1,
          title: `広島IT勉強会 #${index + 1}`,
          event_url: `https://hiroshima-it.connpass.com/event/${index + 1}/`,
          started_at: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
        })
      )

      const mockSearchResult: ConnpassSearchResult = {
        events: mockEvents,
        totalCount: 50,
      }

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )

      // 偶数IDは重複、奇数IDは新規として設定
      mockDynamoDBService.checkEventExists.mockImplementation(async url => {
        const eventId = parseInt(url.match(/event\/(\d+)\//)?.[1] || '0')
        return eventId % 2 === 0 // 偶数は重複
      })

      mockDynamoDBService.createStudySessionFromConnpass.mockImplementation(
        async eventData => ({
          id: `test-id-${eventData.event_id}`,
          title: eventData.title,
          url: eventData.event_url,
          datetime: eventData.started_at,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )

      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      const startTime = Date.now()
      const result = await service.discoverAndRegisterEvents()
      const endTime = Date.now()

      // 結果の検証
      expect(result.totalFound).toBe(50)
      expect(result.newRegistrations).toBe(25) // 奇数IDのみ登録
      expect(result.duplicatesSkipped).toBe(25) // 偶数IDはスキップ
      expect(result.errors).toHaveLength(0)
      expect(result.registeredEvents).toHaveLength(25)

      // パフォーマンス指標の検証
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(15000) // 15秒以内

      // 呼び出し回数の確認
      expect(mockDynamoDBService.checkEventExists).toHaveBeenCalledTimes(50)
      expect(
        mockDynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(25)
      expect(
        mockNotificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(25)

      console.log(`Performance metrics for mixed scenario (50 events):`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(`- New registrations: ${result.newRegistrations}`)
      console.log(`- Duplicates skipped: ${result.duplicatesSkipped}`)
    })

    it('should handle error scenarios without significant performance degradation', async () => {
      // 30件のイベント（10件成功、10件重複チェックエラー、10件登録エラー）
      const mockEvents: ConnpassEventData[] = Array.from(
        { length: 30 },
        (_, index) => ({
          event_id: index + 1,
          title: `広島IT勉強会 #${index + 1}`,
          event_url: `https://hiroshima-it.connpass.com/event/${index + 1}/`,
          started_at: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
        })
      )

      const mockSearchResult: ConnpassSearchResult = {
        events: mockEvents,
        totalCount: 30,
      }

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )

      // エラーパターンを設定
      mockDynamoDBService.checkEventExists.mockImplementation(async url => {
        const eventId = parseInt(url.match(/event\/(\d+)\//)?.[1] || '0')
        if (eventId <= 10) return false // 1-10: 新規
        if (eventId <= 20) throw new Error('Duplicate check error') // 11-20: 重複チェックエラー
        return false // 21-30: 新規だが登録でエラー
      })

      mockDynamoDBService.createStudySessionFromConnpass.mockImplementation(
        async eventData => {
          if (eventData.event_id > 20) {
            throw new Error('Registration error')
          }
          return {
            id: `test-id-${eventData.event_id}`,
            title: eventData.title,
            url: eventData.event_url,
            datetime: eventData.started_at,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
      )

      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      const startTime = Date.now()
      const result = await service.discoverAndRegisterEvents()
      const endTime = Date.now()

      // 結果の検証
      expect(result.totalFound).toBe(30)
      expect(result.newRegistrations).toBe(10) // 1-10のみ成功
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(20) // 11-30でエラー
      expect(result.registeredEvents).toHaveLength(10)

      // パフォーマンス指標の検証（エラーがあっても適切な時間で完了）
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(10000) // 10秒以内

      console.log(`Performance metrics for error scenario (30 events):`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(`- Successful registrations: ${result.newRegistrations}`)
      console.log(`- Errors handled: ${result.errors.length}`)
    })
  })

  describe('Concurrent Processing Tests', () => {
    it('should handle notification failures without blocking other processes', async () => {
      const mockEvents: ConnpassEventData[] = Array.from(
        { length: 10 },
        (_, index) => ({
          event_id: index + 1,
          title: `広島IT勉強会 #${index + 1}`,
          event_url: `https://hiroshima-it.connpass.com/event/${index + 1}/`,
          started_at: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
        })
      )

      const mockSearchResult: ConnpassSearchResult = {
        events: mockEvents,
        totalCount: 10,
      }

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)

      mockDynamoDBService.createStudySessionFromConnpass.mockImplementation(
        async eventData => ({
          id: `test-id-${eventData.event_id}`,
          title: eventData.title,
          url: eventData.event_url,
          datetime: eventData.started_at,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )

      // 通知で遅延とエラーをシミュレート
      mockNotificationService.publishStudySessionNotification.mockImplementation(
        async session => {
          const eventId = parseInt(session.id.split('-')[2])
          if (eventId % 3 === 0) {
            // 3の倍数のイベントで通知エラー
            throw new Error('Notification service error')
          }
          if (eventId % 2 === 0) {
            // 偶数のイベントで遅延をシミュレート
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      )

      const startTime = Date.now()
      const result = await service.discoverAndRegisterEvents()
      const endTime = Date.now()

      // 結果の検証（通知エラーがあっても登録は成功）
      expect(result.totalFound).toBe(10)
      expect(result.newRegistrations).toBe(10)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.registeredEvents).toHaveLength(10)

      // 通知エラーが記録されていることを確認
      const notificationErrors = result.errors.filter(error =>
        error.includes('Notification failed')
      )
      expect(notificationErrors.length).toBeGreaterThan(0)

      // パフォーマンス指標の検証
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(5000) // 5秒以内

      console.log(`Performance metrics for notification failure scenario:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(`- Notification errors: ${notificationErrors.length}`)
    })
  })

  describe('Resource Cleanup Tests', () => {
    it('should not leak memory during repeated executions', async () => {
      const mockSearchResult: ConnpassSearchResult = {
        events: [
          {
            event_id: 1,
            title: '広島IT勉強会',
            event_url: 'https://hiroshima-it.connpass.com/event/1/',
            started_at: '2024-02-15T19:00:00+09:00',
          },
        ],
        totalCount: 1,
      }

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.createStudySessionFromConnpass.mockResolvedValue({
        id: 'test-id-1',
        title: '広島IT勉強会',
        url: 'https://hiroshima-it.connpass.com/event/1/',
        datetime: '2024-02-15T19:00:00+09:00',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      const initialMemory = process.memoryUsage()

      // 10回連続実行
      for (let i = 0; i < 10; i++) {
        await service.discoverAndRegisterEvents()

        // ガベージコレクションを促進
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // メモリリークがないことを確認（10MB以内の増加）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)

      console.log(`Memory usage after 10 executions:`)
      console.log(
        `- Memory increase: ${Math.round((memoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
    })
  })
})
