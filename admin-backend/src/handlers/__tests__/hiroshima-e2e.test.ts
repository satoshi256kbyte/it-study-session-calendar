import { ScheduledEvent, Context } from 'aws-lambda'
import {
  batchUpdateMaterials,
  manualBatchUpdate,
} from '../batchMaterialsHandler'

// Mock all AWS services at module level
jest.mock('../../services/DynamoDBService')
jest.mock('../../services/SecretsManagerService')
jest.mock('../../services/NotificationService')
jest.mock('../../services/ConnpassApiService')

import { DynamoDBService } from '../../services/DynamoDBService'
import { SecretsManagerService } from '../../services/SecretsManagerService'
import { NotificationService } from '../../services/NotificationService'
import { ConnpassApiService } from '../../services/ConnpassApiService'
import { EventRecord } from '../../types/EventMaterial'
import { StudySession } from '../../types/StudySession'
import { ConnpassEventData } from '../../types/EventMaterial'

/**
 * 広島イベント自動登録機能のE2Eテスト（簡略版）
 * 完全なバッチ実行フローをテスト
 * 要件: 全要件の統合テスト
 */
describe('Hiroshima Event Auto-Registration E2E Tests (Simplified)', () => {
  const mockEvent: ScheduledEvent = {
    id: 'e2e-test-event',
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
    awsRequestId: 'e2e-test-request',
    logGroupName: '/aws/lambda/batchUpdateMaterials',
    logStreamName: 'e2e-test-stream',
    getRemainingTimeInMillis: () => 300000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }

  beforeEach(() => {
    // 環境変数を設定
    process.env.CONNPASS_API_SECRET_NAME = 'test-secret-name'
    process.env.SNS_TOPIC_ARN = 'test-topic-arn'
    process.env.DYNAMODB_TABLE_NAME = 'test-table'
    process.env.AWS_REGION = 'us-east-1'

    // モックをクリア
    jest.clearAllMocks()
  })

  afterEach(() => {
    // 環境変数をクリア
    delete process.env.CONNPASS_API_SECRET_NAME
    delete process.env.SNS_TOPIC_ARN
    delete process.env.DYNAMODB_TABLE_NAME
    delete process.env.AWS_REGION
  })

  describe('Complete Batch Execution Flow E2E', () => {
    it('should execute complete batch flow with materials update and Hiroshima discovery', async () => {
      // テストデータ準備
      const existingEvents: EventRecord[] = [
        {
          eventId: 'existing-event-1',
          title: '既存React勉強会',
          eventDate: '2023-01-15T10:00:00Z',
          eventUrl: 'https://example.com/event/existing1',
          connpassUrl: 'https://connpass.com/event/111111/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 999001,
          title: '広島IT勉強会 - React入門',
          event_url: 'https://connpass.com/event/999001/',
          started_at: '2023-02-15T19:00:00+09:00',
          ended_at: '2023-02-15T21:00:00+09:00',
          description: '広島でReactを学ぼう',
        },
      ]

      const newStudySession: StudySession = {
        id: 'hiroshima-event-1',
        title: '広島IT勉強会 - React入門',
        url: 'https://connpass.com/event/999001/',
        datetime: '2023-02-15T19:00:00+09:00',
        endDatetime: '2023-02-15T21:00:00+09:00',
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      }

      // モック設定
      const mockSecretsManagerService =
        SecretsManagerService as jest.MockedClass<typeof SecretsManagerService>
      const mockDynamoDBService = DynamoDBService as jest.MockedClass<
        typeof DynamoDBService
      >
      const mockNotificationService = NotificationService as jest.MockedClass<
        typeof NotificationService
      >
      const mockConnpassApiService = ConnpassApiService as jest.MockedClass<
        typeof ConnpassApiService
      >

      mockSecretsManagerService.prototype.getConnpassApiKey.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.prototype.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        existingEvents
      )
      ;(
        mockConnpassApiService.extractEventIdFromUrl as jest.Mock
      ).mockReturnValue('111111')
      mockConnpassApiService.prototype.getPresentations.mockResolvedValue([
        {
          id: 'material-1',
          title: 'React資料',
          url: 'https://speakerdeck.com/user/react',
          type: 'slide',
          createdAt: '2023-01-15T10:00:00Z',
        },
      ])
      mockDynamoDBService.prototype.upsertEventRecord.mockResolvedValue(
        existingEvents[0]
      )

      // 広島イベント発見のモック
      mockConnpassApiService.prototype.searchEventsByKeyword.mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      mockDynamoDBService.prototype.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.prototype.createStudySessionFromConnpass.mockResolvedValue(
        newStudySession
      )
      mockNotificationService.prototype.publishStudySessionNotification.mockResolvedValue(
        undefined
      )

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)

      // 既存の資料更新処理の検証
      expect(responseBody.processedCount).toBe(1)
      expect(responseBody.successCount).toBe(1)
      expect(responseBody.errorCount).toBe(0)

      // 広島イベント発見処理の検証
      expect(responseBody.hiroshimaDiscovery).toBeDefined()
      expect(responseBody.hiroshimaDiscovery.totalFound).toBe(1)
      expect(responseBody.hiroshimaDiscovery.newRegistrations).toBe(1)
      expect(responseBody.hiroshimaDiscovery.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery.registeredEvents).toHaveLength(1)

      // サービス呼び出しの検証
      expect(
        mockSecretsManagerService.prototype.getConnpassApiKey
      ).toHaveBeenCalledTimes(1)
      expect(mockConnpassApiService.prototype.testApiKey).toHaveBeenCalledTimes(
        1
      )
      expect(
        mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl
      ).toHaveBeenCalledTimes(1)
      expect(
        mockConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledWith('広島', 100)
      expect(
        mockDynamoDBService.prototype.checkEventExists
      ).toHaveBeenCalledTimes(1)
      expect(
        mockDynamoDBService.prototype.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(1)
      expect(
        mockNotificationService.prototype.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1)
    })

    it('should handle complete flow when no existing events and no Hiroshima events found', async () => {
      // モック設定 - 既存イベントなし、広島イベントなし
      const mockSecretsManagerService =
        SecretsManagerService as jest.MockedClass<typeof SecretsManagerService>
      const mockDynamoDBService = DynamoDBService as jest.MockedClass<
        typeof DynamoDBService
      >
      const mockConnpassApiService = ConnpassApiService as jest.MockedClass<
        typeof ConnpassApiService
      >

      mockSecretsManagerService.prototype.getConnpassApiKey.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.prototype.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        []
      )
      mockConnpassApiService.prototype.searchEventsByKeyword.mockResolvedValue({
        events: [],
        totalCount: 0,
      })

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)

      expect(responseBody.processedCount).toBe(0)
      expect(responseBody.successCount).toBe(0)
      expect(responseBody.errorCount).toBe(0)
      expect(responseBody.hiroshimaDiscovery.totalFound).toBe(0)
      expect(responseBody.hiroshimaDiscovery.newRegistrations).toBe(0)
      expect(responseBody.hiroshimaDiscovery.duplicatesSkipped).toBe(0)

      // 必要最小限の呼び出しのみ実行されることを確認
      expect(
        mockConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
    })
  })

  describe('Hiroshima Event Discovery and Registration Complete Flow E2E', () => {
    it('should discover, register, and notify for multiple Hiroshima events', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 888001,
          title: '広島DevOps勉強会',
          event_url: 'https://connpass.com/event/888001/',
          started_at: '2023-03-10T18:30:00+09:00',
          ended_at: '2023-03-10T20:30:00+09:00',
          description: '広島でDevOpsを学ぼう',
        },
        {
          event_id: 888002,
          title: '広島AI・機械学習勉強会',
          event_url: 'https://connpass.com/event/888002/',
          started_at: '2023-03-15T19:00:00+09:00',
          ended_at: '2023-03-15T21:00:00+09:00',
          description: '広島でAIを学習',
        },
      ]

      const registeredEvents: StudySession[] = hiroshimaEvents.map(
        (event, index) => ({
          id: `hiroshima-${event.event_id}`,
          title: event.title,
          url: event.event_url,
          datetime: event.started_at,
          endDatetime: event.ended_at,
          status: 'pending' as const,
          createdAt: `2023-01-01T12:0${index}:00Z`,
          updatedAt: `2023-01-01T12:0${index}:00Z`,
        })
      )

      // モック設定
      const mockSecretsManagerService =
        SecretsManagerService as jest.MockedClass<typeof SecretsManagerService>
      const mockDynamoDBService = DynamoDBService as jest.MockedClass<
        typeof DynamoDBService
      >
      const mockNotificationService = NotificationService as jest.MockedClass<
        typeof NotificationService
      >
      const mockConnpassApiService = ConnpassApiService as jest.MockedClass<
        typeof ConnpassApiService
      >

      mockSecretsManagerService.prototype.getConnpassApiKey.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.prototype.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        []
      )
      mockConnpassApiService.prototype.searchEventsByKeyword.mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      mockDynamoDBService.prototype.checkEventExists.mockResolvedValue(false) // 全て新規
      mockDynamoDBService.prototype.createStudySessionFromConnpass
        .mockResolvedValueOnce(registeredEvents[0])
        .mockResolvedValueOnce(registeredEvents[1])
      mockNotificationService.prototype.publishStudySessionNotification.mockResolvedValue(
        undefined
      )

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)

      expect(responseBody.hiroshimaDiscovery.totalFound).toBe(2)
      expect(responseBody.hiroshimaDiscovery.newRegistrations).toBe(2)
      expect(responseBody.hiroshimaDiscovery.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery.registeredEvents).toHaveLength(2)

      // 各イベントが正しく処理されたことを確認
      expect(
        mockDynamoDBService.prototype.checkEventExists
      ).toHaveBeenCalledTimes(2)
      expect(
        mockDynamoDBService.prototype.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(2)
      expect(
        mockNotificationService.prototype.publishStudySessionNotification
      ).toHaveBeenCalledTimes(2)
    })
  })

  describe('Duplicate Event Skip E2E', () => {
    it('should skip all duplicate events and register none', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 666001,
          title: '広島重複イベント1',
          event_url: 'https://connpass.com/event/666001/',
          started_at: '2023-05-10T19:00:00+09:00',
          ended_at: '2023-05-10T21:00:00+09:00',
          description: '重複イベント1',
        },
        {
          event_id: 666002,
          title: '広島重複イベント2',
          event_url: 'https://connpass.com/event/666002/',
          started_at: '2023-05-15T19:00:00+09:00',
          ended_at: '2023-05-15T21:00:00+09:00',
          description: '重複イベント2',
        },
      ]

      // モック設定 - 全て重複
      const mockSecretsManagerService =
        SecretsManagerService as jest.MockedClass<typeof SecretsManagerService>
      const mockDynamoDBService = DynamoDBService as jest.MockedClass<
        typeof DynamoDBService
      >
      const mockNotificationService = NotificationService as jest.MockedClass<
        typeof NotificationService
      >
      const mockConnpassApiService = ConnpassApiService as jest.MockedClass<
        typeof ConnpassApiService
      >

      mockSecretsManagerService.prototype.getConnpassApiKey.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.prototype.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        []
      )
      mockConnpassApiService.prototype.searchEventsByKeyword.mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      mockDynamoDBService.prototype.checkEventExists.mockResolvedValue(true) // 全て重複

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)

      expect(responseBody.hiroshimaDiscovery.totalFound).toBe(2)
      expect(responseBody.hiroshimaDiscovery.newRegistrations).toBe(0)
      expect(responseBody.hiroshimaDiscovery.duplicatesSkipped).toBe(2)
      expect(responseBody.hiroshimaDiscovery.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery.registeredEvents).toHaveLength(0)

      // 重複チェックのみ実行され、登録・通知は実行されないことを確認
      expect(
        mockDynamoDBService.prototype.checkEventExists
      ).toHaveBeenCalledTimes(2)
      expect(
        mockDynamoDBService.prototype.createStudySessionFromConnpass
      ).not.toHaveBeenCalled()
      expect(
        mockNotificationService.prototype.publishStudySessionNotification
      ).not.toHaveBeenCalled()
    })
  })

  describe('Error Recovery E2E', () => {
    it('should recover from connpass API errors and continue processing', async () => {
      // モック設定 - connpass API検索でエラー
      const mockSecretsManagerService =
        SecretsManagerService as jest.MockedClass<typeof SecretsManagerService>
      const mockDynamoDBService = DynamoDBService as jest.MockedClass<
        typeof DynamoDBService
      >
      const mockConnpassApiService = ConnpassApiService as jest.MockedClass<
        typeof ConnpassApiService
      >

      mockSecretsManagerService.prototype.getConnpassApiKey.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.prototype.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        []
      )
      mockConnpassApiService.prototype.searchEventsByKeyword.mockRejectedValue(
        new Error('connpass API connection failed')
      )

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - エラーが発生しても処理は継続し、正常終了する
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)

      expect(responseBody.hiroshimaDiscovery.totalFound).toBe(0)
      expect(responseBody.hiroshimaDiscovery.newRegistrations).toBe(0)
      expect(responseBody.hiroshimaDiscovery.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery.errors).toHaveLength(1)
      expect(responseBody.hiroshimaDiscovery.errors[0]).toContain(
        'connpass API connection failed'
      )

      // API検索は試行されるが、その後の処理は実行されない
      expect(
        mockConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
      expect(
        mockDynamoDBService.prototype.checkEventExists
      ).not.toHaveBeenCalled()
    })

    // Note: Critical error testing is covered in unit tests
    // E2E tests focus on the happy path and recoverable error scenarios
  })

  describe('Manual Batch Execution E2E', () => {
    it('should execute manual batch with Hiroshima discovery included', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 222001,
          title: '広島手動実行テストイベント',
          event_url: 'https://connpass.com/event/222001/',
          started_at: '2023-09-10T19:00:00+09:00',
          ended_at: '2023-09-10T21:00:00+09:00',
          description: '手動実行テスト用イベント',
        },
      ]

      const registeredEvent: StudySession = {
        id: 'hiroshima-222001',
        title: '広島手動実行テストイベント',
        url: 'https://connpass.com/event/222001/',
        datetime: '2023-09-10T19:00:00+09:00',
        endDatetime: '2023-09-10T21:00:00+09:00',
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      }

      // モック設定
      const mockSecretsManagerService =
        SecretsManagerService as jest.MockedClass<typeof SecretsManagerService>
      const mockDynamoDBService = DynamoDBService as jest.MockedClass<
        typeof DynamoDBService
      >
      const mockNotificationService = NotificationService as jest.MockedClass<
        typeof NotificationService
      >
      const mockConnpassApiService = ConnpassApiService as jest.MockedClass<
        typeof ConnpassApiService
      >

      mockSecretsManagerService.prototype.getConnpassApiKey.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.prototype.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.prototype.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        []
      )
      mockConnpassApiService.prototype.searchEventsByKeyword.mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      mockDynamoDBService.prototype.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.prototype.createStudySessionFromConnpass.mockResolvedValue(
        registeredEvent
      )
      mockNotificationService.prototype.publishStudySessionNotification.mockResolvedValue(
        undefined
      )

      // 手動実行E2E
      const result = await manualBatchUpdate()

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody = JSON.parse(result.body)

      expect(responseBody.hiroshimaDiscovery.totalFound).toBe(1)
      expect(responseBody.hiroshimaDiscovery.newRegistrations).toBe(1)
      expect(responseBody.hiroshimaDiscovery.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery.registeredEvents).toHaveLength(1)

      // 手動実行でも同じ処理が実行されることを確認
      expect(
        mockConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledWith('広島', 100)
      expect(
        mockDynamoDBService.prototype.createStudySessionFromConnpass
      ).toHaveBeenCalledWith(hiroshimaEvents[0])
      expect(
        mockNotificationService.prototype.publishStudySessionNotification
      ).toHaveBeenCalledWith(registeredEvent)
    })
  })
})
