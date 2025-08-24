import { ScheduledEvent, Context } from 'aws-lambda'
import {
  batchUpdateMaterials,
  getBatchStatistics,
} from '../batchMaterialsHandler'
import { DynamoDBService } from '../../services/DynamoDBService'
import { ConnpassApiService } from '../../services/ConnpassApiService'
import { SecretsManagerService } from '../../services/SecretsManagerService'
import { EventRecord, Material } from '../../types/EventMaterial'

/**
 * バッチ処理の統合テスト
 * 実際のサービス間の連携をテスト（モックを使用）
 * 要件6.1, 6.2, 6.3に対応
 */
describe('batchMaterialsHandler Integration Tests', () => {
  let dynamoDBService: DynamoDBService
  let connpassApiService: ConnpassApiService
  let secretsManagerService: SecretsManagerService

  const mockEvent: ScheduledEvent = {
    id: 'integration-test-event',
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    account: '123456789012',
    time: '2023-01-01T00:00:00Z',
    region: 'us-east-1',
    detail: {},
    version: '0',
    resources: ['arn:aws:events:us-east-1:123456789012:rule/test-rule'],
  }

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'batchUpdateMaterials',
    functionVersion: '$LATEST',
    invokedFunctionArn:
      'arn:aws:lambda:us-east-1:123456789012:function:batchUpdateMaterials',
    memoryLimitInMB: '128',
    awsRequestId: 'integration-test-request',
    logGroupName: '/aws/lambda/batchUpdateMaterials',
    logStreamName: 'integration-test-stream',
    getRemainingTimeInMillis: () => 300000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }

  beforeEach(() => {
    // 実際のサービスインスタンスを作成（モックではない）
    dynamoDBService = new DynamoDBService()
    secretsManagerService = new SecretsManagerService()

    // サービスメソッドをモック化
    jest.spyOn(dynamoDBService, 'getApprovedEventsWithConnpassUrl')
    jest.spyOn(dynamoDBService, 'upsertEventRecord')
    jest.spyOn(secretsManagerService, 'getConnpassApiKeyWithFallback')
    jest.spyOn(ConnpassApiService.prototype, 'testApiKey')
    jest.spyOn(ConnpassApiService.prototype, 'getPresentations')
    jest.spyOn(ConnpassApiService, 'extractEventIdFromUrl')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Full batch processing workflow', () => {
    it('should complete full workflow with multiple events', async () => {
      // テストデータの準備
      const mockEvents: EventRecord[] = [
        {
          eventId: 'event-1',
          title: 'React勉強会',
          eventDate: '2023-01-15T10:00:00Z',
          eventUrl: 'https://example.com/event/1',
          connpassUrl: 'https://connpass.com/event/111111/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          eventId: 'event-2',
          title: 'Vue.js勉強会',
          eventDate: '2023-01-20T14:00:00Z',
          eventUrl: 'https://example.com/event/2',
          connpassUrl: 'https://connpass.com/event/222222/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      const mockMaterials1: Material[] = [
        {
          id: 'material-1-1',
          title: 'React Hooks入門',
          url: 'https://speakerdeck.com/user/react-hooks',
          type: 'slide',
          createdAt: '2023-01-15T10:00:00Z',
        },
        {
          id: 'material-1-2',
          title: 'React実践ガイド',
          url: 'https://github.com/user/react-guide',
          type: 'document',
          createdAt: '2023-01-15T10:00:00Z',
        },
      ]

      const mockMaterials2: Material[] = [
        {
          id: 'material-2-1',
          title: 'Vue.js 3.0の新機能',
          url: 'https://slides.com/user/vue3-features',
          type: 'slide',
          createdAt: '2023-01-20T14:00:00Z',
        },
      ]

      // モックの設定
      ;(
        secretsManagerService.getConnpassApiKeyWithFallback as jest.Mock
      ).mockResolvedValue('test-api-key')
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(mockEvents)
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock)
        .mockReturnValueOnce('111111')
        .mockReturnValueOnce('222222')
      ;(ConnpassApiService.prototype.getPresentations as jest.Mock)
        .mockResolvedValueOnce(mockMaterials1)
        .mockResolvedValueOnce(mockMaterials2)
      ;(dynamoDBService.upsertEventRecord as jest.Mock).mockResolvedValue({})

      // バッチ処理実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果の検証
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)
      expect(responseBody).toMatchObject({
        message: 'Batch update completed',
        processedCount: 2,
        successCount: 2,
        errorCount: 0,
      })

      // サービス呼び出しの検証
      expect(
        secretsManagerService.getConnpassApiKeyWithFallback
      ).toHaveBeenCalledTimes(1)
      expect(
        dynamoDBService.getApprovedEventsWithConnpassUrl
      ).toHaveBeenCalledTimes(1)
      expect(ConnpassApiService.prototype.testApiKey).toHaveBeenCalledTimes(1)
      expect(ConnpassApiService.extractEventIdFromUrl).toHaveBeenCalledTimes(2)
      expect(
        ConnpassApiService.prototype.getPresentations
      ).toHaveBeenCalledTimes(2)
      expect(
        ConnpassApiService.prototype.getPresentations
      ).toHaveBeenCalledWith('111111')
      expect(
        ConnpassApiService.prototype.getPresentations
      ).toHaveBeenCalledWith('222222')
      expect(dynamoDBService.upsertEventRecord).toHaveBeenCalledTimes(2)

      // DynamoDB更新データの検証
      const upsertCalls = (dynamoDBService.upsertEventRecord as jest.Mock).mock
        .calls
      expect(upsertCalls[0][0]).toMatchObject({
        eventId: 'event-1',
        materials: mockMaterials1,
        updatedAt: expect.any(String),
      })
      expect(upsertCalls[1][0]).toMatchObject({
        eventId: 'event-2',
        materials: mockMaterials2,
        updatedAt: expect.any(String),
      })
    })

    it('should handle mixed success and failure scenarios', async () => {
      const mockEvents: EventRecord[] = [
        {
          eventId: 'success-event',
          title: '成功イベント',
          eventDate: '2023-01-15T10:00:00Z',
          eventUrl: 'https://example.com/event/success',
          connpassUrl: 'https://connpass.com/event/111111/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          eventId: 'invalid-url-event',
          title: '無効URLイベント',
          eventDate: '2023-01-20T14:00:00Z',
          eventUrl: 'https://example.com/event/invalid',
          connpassUrl: 'https://invalid-url.com/event/222222/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          eventId: 'api-error-event',
          title: 'APIエラーイベント',
          eventDate: '2023-01-25T16:00:00Z',
          eventUrl: 'https://example.com/event/api-error',
          connpassUrl: 'https://connpass.com/event/333333/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      const mockMaterials: Material[] = [
        {
          id: 'material-success',
          title: '成功資料',
          url: 'https://speakerdeck.com/user/success',
          type: 'slide',
          createdAt: '2023-01-15T10:00:00Z',
        },
      ]

      // モックの設定
      ;(
        secretsManagerService.getConnpassApiKeyWithFallback as jest.Mock
      ).mockResolvedValue('test-api-key')
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(mockEvents)
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock)
        .mockReturnValueOnce('111111') // 成功
        .mockReturnValueOnce(null) // 無効URL
        .mockReturnValueOnce('333333') // APIエラー
      ;(ConnpassApiService.prototype.getPresentations as jest.Mock)
        .mockResolvedValueOnce(mockMaterials) // 成功
        .mockRejectedValueOnce(new Error('connpass API error')) // APIエラー
      ;(dynamoDBService.upsertEventRecord as jest.Mock).mockResolvedValue({})

      // バッチ処理実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果の検証（部分的成功）
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)
      expect(responseBody).toMatchObject({
        message: 'Batch update completed',
        processedCount: 3,
        successCount: 1,
        errorCount: 2,
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid connpass URL format'),
          expect.stringContaining('connpass API error'),
        ]),
      })

      // 成功したイベントのみDynamoDB更新が呼ばれることを確認
      expect(dynamoDBService.upsertEventRecord).toHaveBeenCalledTimes(1)
      expect(
        ConnpassApiService.prototype.getPresentations
      ).toHaveBeenCalledTimes(2)
    })
  })

  describe('Secrets Manager integration', () => {
    it('should handle Secrets Manager fallback mechanism', async () => {
      // 最初のシークレット取得は失敗、フォールバックで成功
      ;(
        secretsManagerService.getConnpassApiKeyWithFallback as jest.Mock
      ).mockResolvedValue('fallback-api-key')
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      expect(
        secretsManagerService.getConnpassApiKeyWithFallback
      ).toHaveBeenCalledTimes(1)
    })

    it('should fail when all Secrets Manager fallbacks fail', async () => {
      ;(
        secretsManagerService.getConnpassApiKeyWithFallback as jest.Mock
      ).mockRejectedValue(new Error('All secrets failed'))

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.message).toContain('All secrets failed')
    })
  })

  describe('connpass API integration', () => {
    it('should handle rate limiting correctly', async () => {
      const mockEvents: EventRecord[] = Array.from({ length: 3 }, (_, i) => ({
        eventId: `rate-limit-event-${i + 1}`,
        title: `レート制限テストイベント${i + 1}`,
        eventDate: '2023-01-15T10:00:00Z',
        eventUrl: `https://example.com/event/${i + 1}`,
        connpassUrl: `https://connpass.com/event/${111111 + i}/`,
        status: 'approved' as const,
        materials: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }))

      const mockMaterials: Material[] = [
        {
          id: 'rate-limit-material',
          title: 'レート制限テスト資料',
          url: 'https://speakerdeck.com/user/rate-limit',
          type: 'slide',
          createdAt: '2023-01-15T10:00:00Z',
        },
      ]

      // モックの設定
      ;(
        secretsManagerService.getConnpassApiKeyWithFallback as jest.Mock
      ).mockResolvedValue('test-api-key')
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(mockEvents)
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock).mockReturnValue(
        '111111'
      )
      ;(
        ConnpassApiService.prototype.getPresentations as jest.Mock
      ).mockResolvedValue(mockMaterials)
      ;(dynamoDBService.upsertEventRecord as jest.Mock).mockResolvedValue({})

      const startTime = Date.now()
      const result = await batchUpdateMaterials(mockEvent, mockContext)
      const endTime = Date.now()

      // レート制限により処理時間が延びることを確認
      // 3つのイベント処理で最低2秒の遅延が発生するはず（1秒間隔 × 2回の待機）
      expect(endTime - startTime).toBeGreaterThan(1000)

      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)
      expect(responseBody.successCount).toBe(3)
    })
  })

  describe('getBatchStatistics integration', () => {
    it('should calculate statistics correctly with real data structure', async () => {
      const mockEvents: EventRecord[] = [
        {
          eventId: 'stats-event-1',
          title: '統計テストイベント1',
          eventDate: '2023-01-15T10:00:00Z',
          eventUrl: 'https://example.com/event/1',
          connpassUrl: 'https://connpass.com/event/111111/',
          status: 'approved',
          materials: [
            {
              id: 'material-1',
              title: 'テスト資料1',
              url: 'https://speakerdeck.com/user/test1',
              type: 'slide',
              createdAt: '2023-01-15T10:00:00Z',
            },
          ],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-15T12:00:00Z',
        },
        {
          eventId: 'stats-event-2',
          title: '統計テストイベント2',
          eventDate: '2023-01-20T14:00:00Z',
          eventUrl: 'https://example.com/event/2',
          connpassUrl: 'https://connpass.com/event/222222/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-20T16:00:00Z',
        },
      ]

      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(mockEvents)

      const statistics = await getBatchStatistics()

      expect(statistics).toEqual({
        totalEvents: 2,
        eventsWithMaterials: 1,
        eventsWithoutMaterials: 1,
        lastUpdateTime: '2023-01-20T16:00:00Z', // より新しい更新時刻
      })
    })
  })
})
