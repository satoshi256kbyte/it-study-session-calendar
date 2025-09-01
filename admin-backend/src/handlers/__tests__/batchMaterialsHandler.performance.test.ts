import { batchUpdateMaterials } from '../batchMaterialsHandler'
import { ConnpassApiService } from '../../services/ConnpassApiService'
import { DynamoDBService } from '../../services/DynamoDBService'
import { NotificationService } from '../../services/NotificationService'
import { HiroshimaEventDiscoveryService } from '../../services/HiroshimaEventDiscoveryService'
import { SecretsManagerService } from '../../services/SecretsManagerService'
import { StudySession } from '../../types/StudySession'
import { Material } from '../../types/EventMaterial'

// モックの作成
jest.mock('../../services/ConnpassApiService')
jest.mock('../../services/DynamoDBService')
jest.mock('../../services/NotificationService')
jest.mock('../../services/HiroshimaEventDiscoveryService')
jest.mock('../../services/SecretsManagerService')
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
const MockedHiroshimaEventDiscoveryService =
  HiroshimaEventDiscoveryService as jest.MockedClass<
    typeof HiroshimaEventDiscoveryService
  >
const MockedSecretsManagerService = SecretsManagerService as jest.MockedClass<
  typeof SecretsManagerService
>

describe('batchUpdateMaterials - Performance Tests', () => {
  let mockConnpassApiService: jest.Mocked<ConnpassApiService>
  let mockDynamoDBService: jest.Mocked<DynamoDBService>
  let mockNotificationService: jest.Mocked<NotificationService>
  let mockHiroshimaService: jest.Mocked<HiroshimaEventDiscoveryService>
  let mockSecretsManagerService: jest.Mocked<SecretsManagerService>

  beforeEach(() => {
    // モックインスタンスの作成
    mockConnpassApiService = new MockedConnpassApiService(
      'test-api-key'
    ) as jest.Mocked<ConnpassApiService>
    mockDynamoDBService =
      new MockedDynamoDBService() as jest.Mocked<DynamoDBService>
    mockNotificationService =
      new MockedNotificationService() as jest.Mocked<NotificationService>
    mockSecretsManagerService =
      new MockedSecretsManagerService() as jest.Mocked<SecretsManagerService>
    mockHiroshimaService = new MockedHiroshimaEventDiscoveryService(
      mockConnpassApiService,
      mockDynamoDBService,
      mockNotificationService
    ) as jest.Mocked<HiroshimaEventDiscoveryService>

    // コンストラクタのモック設定
    MockedConnpassApiService.mockImplementation(() => mockConnpassApiService)
    MockedDynamoDBService.mockImplementation(() => mockDynamoDBService)
    MockedNotificationService.mockImplementation(() => mockNotificationService)
    MockedSecretsManagerService.mockImplementation(
      () => mockSecretsManagerService
    )
    MockedHiroshimaEventDiscoveryService.mockImplementation(
      () => mockHiroshimaService
    )

    // SecretsManagerServiceのモック設定
    mockSecretsManagerService.getConnpassApiKey.mockResolvedValue(
      'test-api-key'
    )

    // ConnpassApiServiceのモック設定
    mockConnpassApiService.testApiKey.mockResolvedValue(true)
    ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock) = jest
      .fn()
      .mockReturnValue('123')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Integrated Performance Tests', () => {
    it('should complete batch processing within acceptable time limits', async () => {
      // 大量のStudySessionデータを準備
      const mockStudySessions: StudySession[] = Array.from(
        { length: 50 },
        (_, index) => ({
          id: `session-${index + 1}`,
          title: `勉強会 #${index + 1}`,
          url: `https://connpass.com/event/${index + 1}/`,
          datetime: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
          status: 'approved',
          createdAt: '2024-02-01T10:00:00Z',
          updatedAt: '2024-02-01T10:00:00Z',
        })
      )

      // 資料データを準備
      const mockMaterials: Material[] = Array.from(
        { length: 3 },
        (_, index) => ({
          title: `資料 ${index + 1}`,
          url: `https://example.com/material-${index + 1}`,
          type: 'slide',
        })
      )

      // 広島イベント発見結果を準備
      const mockHiroshimaResult = {
        totalFound: 5,
        newRegistrations: 2,
        duplicatesSkipped: 3,
        errors: [],
        registeredEvents: Array.from({ length: 2 }, (_, index) => ({
          id: `hiroshima-${index + 1}`,
          title: `広島IT勉強会 #${index + 1}`,
          url: `https://hiroshima-it.connpass.com/event/${index + 1}/`,
          datetime: '2024-02-15T19:00:00+09:00',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      }

      // モックの設定
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        mockStudySessions.map(session => ({
          eventId: session.id,
          title: session.title,
          eventUrl: session.url,
          connpassUrl: session.url,
          datetime: session.datetime,
          materials: [],
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }))
      )
      mockConnpassApiService.getPresentations.mockResolvedValue(mockMaterials)
      mockDynamoDBService.upsertEventRecord.mockResolvedValue()
      mockHiroshimaService.discoverAndRegisterEvents.mockResolvedValue(
        mockHiroshimaResult
      )

      // メモリ使用量の測定開始
      const initialMemory = process.memoryUsage()
      const startTime = Date.now()

      // テスト実行
      const mockEvent = {
        id: 'test-event',
        'detail-type': 'Scheduled Event',
        source: 'aws.events',
        account: '123456789012',
        time: new Date().toISOString(),
        region: 'us-east-1',
        detail: {},
        version: '0',
        resources: [],
      }
      const mockContext = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'test-function',
        functionVersion: '1',
        invokedFunctionArn:
          'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        memoryLimitInMB: '128',
        awsRequestId: 'test-request-id',
        logGroupName: '/aws/lambda/test-function',
        logStreamName: 'test-stream',
        getRemainingTimeInMillis: () => 30000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
      }
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      const endTime = Date.now()
      const finalMemory = process.memoryUsage()

      // 結果の検証
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.processedCount).toBe(50)
      expect(body.successCount).toBe(50)
      expect(body.errorCount).toBe(0)
      expect(body.hiroshimaDiscovery).toEqual(mockHiroshimaResult)

      // パフォーマンス指標の検証
      const executionTime = endTime - startTime
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Lambda実行時間制限を考慮（15分 = 900秒、テストでは60秒以内）
      expect(executionTime).toBeLessThan(60000)

      // メモリ使用量の増加が適切な範囲内であることを確認（100MB以内）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)

      // API呼び出し回数の確認
      expect(
        mockDynamoDBService.getApprovedEventsWithConnpassUrl
      ).toHaveBeenCalledTimes(1)
      expect(mockConnpassApiService.getPresentations).toHaveBeenCalledTimes(50)
      expect(mockDynamoDBService.upsertEventRecord).toHaveBeenCalledTimes(50)
      expect(
        mockHiroshimaService.discoverAndRegisterEvents
      ).toHaveBeenCalledTimes(1)

      console.log(`Batch processing performance metrics:`)
      console.log(`- Total execution time: ${executionTime}ms`)
      console.log(
        `- Memory increase: ${Math.round((memoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
      console.log(
        `- Average time per session: ${Math.round((executionTime / 50) * 100) / 100}ms`
      )
      console.log(`- Sessions processed: ${body.processedCount}`)
      console.log(
        `- Hiroshima events found: ${body.hiroshimaDiscovery.totalFound}`
      )
    })

    it('should handle API rate limits efficiently across both processes', async () => {
      // 少数のStudySessionで資料更新のレート制限をテスト
      const mockStudySessions: StudySession[] = Array.from(
        { length: 10 },
        (_, index) => ({
          id: `session-${index + 1}`,
          title: `勉強会 #${index + 1}`,
          url: `https://connpass.com/event/${index + 1}/`,
          datetime: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
          status: 'approved',
          createdAt: '2024-02-01T10:00:00Z',
          updatedAt: '2024-02-01T10:00:00Z',
        })
      )

      const mockMaterials: EventMaterial[] = [
        {
          title: '資料1',
          url: 'https://example.com/material-1',
          type: 'slide',
        },
      ]

      const mockHiroshimaResult = {
        totalFound: 1,
        newRegistrations: 1,
        duplicatesSkipped: 0,
        errors: [],
        registeredEvents: [
          {
            id: 'hiroshima-1',
            title: '広島IT勉強会',
            url: 'https://hiroshima-it.connpass.com/event/1/',
            datetime: '2024-02-15T19:00:00+09:00',
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }

      // レート制限を考慮した遅延をシミュレート
      mockConnpassApiService.getEventMaterials.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms遅延
        return mockMaterials
      })

      mockDynamoDBService.getStudySessionsWithConnpassUrl.mockResolvedValue(
        mockStudySessions
      )
      mockDynamoDBService.updateStudySessionMaterials.mockResolvedValue()
      mockHiroshimaService.discoverAndRegisterEvents.mockResolvedValue(
        mockHiroshimaResult
      )

      const startTime = Date.now()
      const result = await batchMaterialsHandler({})
      const endTime = Date.now()

      // 結果の検証
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.processedCount).toBe(10)
      expect(body.successCount).toBe(10)

      // 実行時間の検証（レート制限を考慮して適切な時間で完了）
      const executionTime = endTime - startTime
      expect(executionTime).toBeGreaterThan(2000) // 最低2秒（10回 × 200ms）
      expect(executionTime).toBeLessThan(10000) // 10秒以内

      // 各プロセスが独立してレート制限を管理していることを確認
      expect(mockConnpassApiService.getEventMaterials).toHaveBeenCalledTimes(10)
      expect(
        mockHiroshimaService.discoverAndRegisterEvents
      ).toHaveBeenCalledTimes(1)

      console.log(`Rate limit compliance test:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(
        `- Average API call interval: ${Math.round(executionTime / 10)}ms`
      )
    })

    it('should handle mixed error scenarios without significant performance impact', async () => {
      // エラーが混在するシナリオ
      const mockStudySessions: StudySession[] = Array.from(
        { length: 20 },
        (_, index) => ({
          id: `session-${index + 1}`,
          title: `勉強会 #${index + 1}`,
          url: `https://connpass.com/event/${index + 1}/`,
          datetime: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
          status: 'approved',
          createdAt: '2024-02-01T10:00:00Z',
          updatedAt: '2024-02-01T10:00:00Z',
        })
      )

      const mockMaterials: EventMaterial[] = [
        {
          title: '資料1',
          url: 'https://example.com/material-1',
          type: 'slide',
        },
      ]

      // 広島イベント発見でエラーが発生するケース
      const mockHiroshimaResult = {
        totalFound: 3,
        newRegistrations: 1,
        duplicatesSkipped: 1,
        errors: ['connpass API error: Rate limit exceeded'],
        registeredEvents: [
          {
            id: 'hiroshima-1',
            title: '広島IT勉強会',
            url: 'https://hiroshima-it.connpass.com/event/1/',
            datetime: '2024-02-15T19:00:00+09:00',
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }

      mockDynamoDBService.getStudySessionsWithConnpassUrl.mockResolvedValue(
        mockStudySessions
      )

      // 資料取得で一部エラーをシミュレート
      mockConnpassApiService.getEventMaterials.mockImplementation(async url => {
        const sessionId = parseInt(url.match(/event\/(\d+)\//)?.[1] || '0')
        if (sessionId % 5 === 0) {
          throw new Error('API error')
        }
        return mockMaterials
      })

      mockDynamoDBService.updateStudySessionMaterials.mockResolvedValue()
      mockHiroshimaService.discoverAndRegisterEvents.mockResolvedValue(
        mockHiroshimaResult
      )

      const startTime = Date.now()
      const result = await batchMaterialsHandler({})
      const endTime = Date.now()

      // 結果の検証
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.processedCount).toBe(20)
      expect(body.successCount).toBe(16) // 4件エラー（5, 10, 15, 20）
      expect(body.errorCount).toBe(4)
      expect(body.hiroshimaDiscovery).toEqual(mockHiroshimaResult)

      // エラーがあってもパフォーマンスに大きな影響がないことを確認
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(15000) // 15秒以内

      console.log(`Mixed error scenario performance:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(
        `- Success rate: ${Math.round((body.successCount / body.processedCount) * 100)}%`
      )
      console.log(
        `- Hiroshima discovery errors: ${mockHiroshimaResult.errors.length}`
      )
    })

    it('should maintain performance when Hiroshima discovery fails', async () => {
      // 通常の資料更新処理は正常、広島イベント発見のみ失敗
      const mockStudySessions: StudySession[] = Array.from(
        { length: 15 },
        (_, index) => ({
          id: `session-${index + 1}`,
          title: `勉強会 #${index + 1}`,
          url: `https://connpass.com/event/${index + 1}/`,
          datetime: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
          status: 'approved',
          createdAt: '2024-02-01T10:00:00Z',
          updatedAt: '2024-02-01T10:00:00Z',
        })
      )

      const mockMaterials: EventMaterial[] = [
        {
          title: '資料1',
          url: 'https://example.com/material-1',
          type: 'slide',
        },
      ]

      mockDynamoDBService.getStudySessionsWithConnpassUrl.mockResolvedValue(
        mockStudySessions
      )
      mockConnpassApiService.getEventMaterials.mockResolvedValue(mockMaterials)
      mockDynamoDBService.updateStudySessionMaterials.mockResolvedValue()

      // 広島イベント発見で例外が発生
      mockHiroshimaService.discoverAndRegisterEvents.mockRejectedValue(
        new Error('Hiroshima discovery failed')
      )

      const startTime = Date.now()
      const result = await batchMaterialsHandler({})
      const endTime = Date.now()

      // 結果の検証（広島イベント発見の失敗は全体の処理に影響しない）
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.processedCount).toBe(15)
      expect(body.successCount).toBe(15)
      expect(body.errorCount).toBe(0)
      expect(body.hiroshimaDiscovery).toBeUndefined() // エラー時は含まれない

      // パフォーマンスに影響がないことを確認
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(10000) // 10秒以内

      // 資料更新処理は正常に実行されたことを確認
      expect(mockConnpassApiService.getEventMaterials).toHaveBeenCalledTimes(15)
      expect(
        mockDynamoDBService.updateStudySessionMaterials
      ).toHaveBeenCalledTimes(15)

      console.log(`Performance with Hiroshima discovery failure:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(`- Material updates completed: ${body.successCount}`)
    })
  })

  describe('Memory Management Tests', () => {
    it('should efficiently manage memory during large batch processing', async () => {
      // 大量データでのメモリ管理テスト
      const mockStudySessions: StudySession[] = Array.from(
        { length: 100 },
        (_, index) => ({
          id: `session-${index + 1}`,
          title: `勉強会 #${index + 1}`,
          url: `https://connpass.com/event/${index + 1}/`,
          datetime: `2024-02-${String((index % 28) + 1).padStart(2, '0')}T19:00:00+09:00`,
          status: 'approved',
          createdAt: '2024-02-01T10:00:00Z',
          updatedAt: '2024-02-01T10:00:00Z',
        })
      )

      // 大きな資料データをシミュレート
      const mockMaterials: EventMaterial[] = Array.from(
        { length: 10 },
        (_, index) => ({
          title: `資料 ${index + 1}`,
          url: `https://example.com/material-${index + 1}`,
          type: 'slide',
        })
      )

      const mockHiroshimaResult = {
        totalFound: 10,
        newRegistrations: 5,
        duplicatesSkipped: 5,
        errors: [],
        registeredEvents: Array.from({ length: 5 }, (_, index) => ({
          id: `hiroshima-${index + 1}`,
          title: `広島IT勉強会 #${index + 1}`,
          url: `https://hiroshima-it.connpass.com/event/${index + 1}/`,
          datetime: '2024-02-15T19:00:00+09:00',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      }

      mockDynamoDBService.getStudySessionsWithConnpassUrl.mockResolvedValue(
        mockStudySessions
      )
      mockConnpassApiService.getEventMaterials.mockResolvedValue(mockMaterials)
      mockDynamoDBService.updateStudySessionMaterials.mockResolvedValue()
      mockHiroshimaService.discoverAndRegisterEvents.mockResolvedValue(
        mockHiroshimaResult
      )

      // メモリ使用量の詳細測定
      const initialMemory = process.memoryUsage()
      let peakMemoryIncrease = 0

      // メモリ使用量を定期的に測定
      const memoryMonitor = setInterval(() => {
        const currentMemory = process.memoryUsage()
        const currentIncrease = currentMemory.heapUsed - initialMemory.heapUsed
        peakMemoryIncrease = Math.max(peakMemoryIncrease, currentIncrease)
      }, 100)

      const startTime = Date.now()
      const result = await batchMaterialsHandler({})
      const endTime = Date.now()

      clearInterval(memoryMonitor)

      const finalMemory = process.memoryUsage()
      const finalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // 結果の検証
      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.processedCount).toBe(100)
      expect(body.successCount).toBe(100)

      // メモリ使用量の検証
      expect(peakMemoryIncrease).toBeLessThan(200 * 1024 * 1024) // ピーク200MB以内
      expect(finalMemoryIncrease).toBeLessThan(150 * 1024 * 1024) // 最終150MB以内

      // 実行時間の検証
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(120000) // 2分以内

      console.log(`Memory management test results:`)
      console.log(`- Execution time: ${executionTime}ms`)
      console.log(
        `- Peak memory increase: ${Math.round((peakMemoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
      console.log(
        `- Final memory increase: ${Math.round((finalMemoryIncrease / 1024 / 1024) * 100) / 100}MB`
      )
      console.log(`- Sessions processed: ${body.processedCount}`)
      console.log(
        `- Hiroshima events registered: ${body.hiroshimaDiscovery.newRegistrations}`
      )
    })
  })
})
