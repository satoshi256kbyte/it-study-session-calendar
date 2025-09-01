import { ScheduledEvent, Context } from 'aws-lambda'
import {
  batchUpdateMaterials,
  manualBatchUpdate,
  BatchUpdateResult,
} from '../batchMaterialsHandler'
import { DynamoDBService } from '../../services/DynamoDBService'
import { ConnpassApiService } from '../../services/ConnpassApiService'
import { SecretsManagerService } from '../../services/SecretsManagerService'
import { NotificationService } from '../../services/NotificationService'
import { HiroshimaEventDiscoveryService } from '../../services/HiroshimaEventDiscoveryService'
import { EventRecord } from '../../types/EventMaterial'
import { StudySession } from '../../types/StudySession'
import { ConnpassEventData } from '../../types/EventMaterial'

/**
 * 広島イベント自動登録機能のE2Eテスト
 * 完全なバッチ実行フローをテスト
 * 要件: 全要件の統合テスト
 */
describe('Hiroshima Event Auto-Registration E2E Tests', () => {
  let dynamoDBService: DynamoDBService
  let connpassApiService: ConnpassApiService
  let secretsManagerService: SecretsManagerService
  let notificationService: NotificationService

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
    // 環境変数をモック化
    process.env.CONNPASS_API_SECRET_NAME = 'test-secret-name'
    process.env.SNS_TOPIC_ARN = 'test-topic-arn'
    process.env.DYNAMODB_TABLE_NAME = 'test-table'
    process.env.AWS_REGION = 'us-east-1'

    // AWS SDKをモック化
    jest.mock('@aws-sdk/client-dynamodb')
    jest.mock('@aws-sdk/client-secrets-manager')
    jest.mock('@aws-sdk/client-sns')

    // 実際のサービスインスタンスを作成
    dynamoDBService = new DynamoDBService()
    secretsManagerService = new SecretsManagerService()
    notificationService = new NotificationService()

    // 全サービスメソッドをモック化
    jest.spyOn(dynamoDBService, 'getApprovedEventsWithConnpassUrl')
    jest.spyOn(dynamoDBService, 'upsertEventRecord')
    jest.spyOn(dynamoDBService, 'checkEventExists')
    jest.spyOn(dynamoDBService, 'createStudySessionFromConnpass')
    jest.spyOn(secretsManagerService, 'getConnpassApiKey')
    jest.spyOn(ConnpassApiService.prototype, 'testApiKey')
    jest.spyOn(ConnpassApiService.prototype, 'getPresentations')
    jest.spyOn(ConnpassApiService.prototype, 'searchEventsByKeyword')
    jest.spyOn(ConnpassApiService, 'extractEventIdFromUrl')
    jest.spyOn(notificationService, 'publishStudySessionNotification')
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
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
        {
          event_id: 999002,
          title: '広島プログラミング勉強会 - Vue.js',
          event_url: 'https://connpass.com/event/999002/',
          started_at: '2023-02-20T19:00:00+09:00',
          ended_at: '2023-02-20T21:00:00+09:00',
          description: '広島でVue.jsを学習',
        },
      ]

      const newStudySessions: StudySession[] = [
        {
          id: 'hiroshima-event-1',
          title: '広島IT勉強会 - React入門',
          url: 'https://connpass.com/event/999001/',
          datetime: '2023-02-15T19:00:00+09:00',
          endDatetime: '2023-02-15T21:00:00+09:00',
          status: 'pending',
          createdAt: '2023-01-01T12:00:00Z',
          updatedAt: '2023-01-01T12:00:00Z',
        },
        {
          id: 'hiroshima-event-2',
          title: '広島プログラミング勉強会 - Vue.js',
          url: 'https://connpass.com/event/999002/',
          datetime: '2023-02-20T19:00:00+09:00',
          endDatetime: '2023-02-20T21:00:00+09:00',
          status: 'pending',
          createdAt: '2023-01-01T12:01:00Z',
          updatedAt: '2023-01-01T12:01:00Z',
        },
      ]

      // モック設定
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(existingEvents)
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock).mockReturnValue(
        '111111'
      )
      ;(
        ConnpassApiService.prototype.getPresentations as jest.Mock
      ).mockResolvedValue([
        {
          id: 'material-1',
          title: 'React資料',
          url: 'https://speakerdeck.com/user/react',
          type: 'slide',
          createdAt: '2023-01-15T10:00:00Z',
        },
      ])
      ;(dynamoDBService.upsertEventRecord as jest.Mock).mockResolvedValue({})

      // 広島イベント発見のモック
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock)
        .mockResolvedValueOnce(false) // 1つ目は新規
        .mockResolvedValueOnce(false) // 2つ目も新規
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(newStudySessions[0])
        .mockResolvedValueOnce(newStudySessions[1])
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      // 既存の資料更新処理の検証
      expect(responseBody.processedCount).toBe(1)
      expect(responseBody.successCount).toBe(1)
      expect(responseBody.errorCount).toBe(0)

      // 広島イベント発見処理の検証
      expect(responseBody.hiroshimaDiscovery).toBeDefined()
      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(2)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(2)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(2)

      // サービス呼び出しの検証
      expect(secretsManagerService.getConnpassApiKey).toHaveBeenCalledTimes(1)
      expect(ConnpassApiService.prototype.testApiKey).toHaveBeenCalledTimes(1)
      expect(
        dynamoDBService.getApprovedEventsWithConnpassUrl
      ).toHaveBeenCalledTimes(1)
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledWith('広島', 100)
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(2)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(2)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(2)

      // 通知内容の検証
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledWith(newStudySessions[0])
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledWith(newStudySessions[1])
    })

    it('should handle complete flow when no existing events and no Hiroshima events found', async () => {
      // モック設定 - 既存イベントなし、広島イベントなし
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: [],
        totalCount: 0,
      })

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.processedCount).toBe(0)
      expect(responseBody.successCount).toBe(0)
      expect(responseBody.errorCount).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)

      // 必要最小限の呼び出しのみ実行されることを確認
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
      expect(dynamoDBService.checkEventExists).not.toHaveBeenCalled()
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).not.toHaveBeenCalled()
      expect(
        notificationService.publishStudySessionNotification
      ).not.toHaveBeenCalled()
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
        {
          event_id: 888003,
          title: '広島ブロックチェーン勉強会',
          event_url: 'https://connpass.com/event/888003/',
          started_at: '2023-03-20T19:00:00+09:00',
          ended_at: '2023-03-20T21:00:00+09:00',
          description: '広島でブロックチェーンを学ぼう',
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
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 3,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false) // 全て新規
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(registeredEvents[0])
        .mockResolvedValueOnce(registeredEvents[1])
        .mockResolvedValueOnce(registeredEvents[2])
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(3)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(3)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(3)

      // 各イベントが正しく処理されたことを確認
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(3)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(3)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(3)

      // 各イベントの登録内容を確認
      hiroshimaEvents.forEach((event, index) => {
        expect(dynamoDBService.checkEventExists).toHaveBeenNthCalledWith(
          index + 1,
          event.event_url
        )
        expect(
          dynamoDBService.createStudySessionFromConnpass
        ).toHaveBeenNthCalledWith(index + 1, event)
        expect(
          notificationService.publishStudySessionNotification
        ).toHaveBeenNthCalledWith(index + 1, registeredEvents[index])
      })
    })

    it('should handle mixed scenarios with new events, duplicates, and errors', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 777001,
          title: '広島新規イベント',
          event_url: 'https://connpass.com/event/777001/',
          started_at: '2023-04-10T19:00:00+09:00',
          ended_at: '2023-04-10T21:00:00+09:00',
          description: '新規イベント',
        },
        {
          event_id: 777002,
          title: '広島重複イベント',
          event_url: 'https://connpass.com/event/777002/',
          started_at: '2023-04-15T19:00:00+09:00',
          ended_at: '2023-04-15T21:00:00+09:00',
          description: '重複イベント',
        },
        {
          event_id: 777003,
          title: '広島エラーイベント',
          event_url: 'https://connpass.com/event/777003/',
          started_at: '2023-04-20T19:00:00+09:00',
          ended_at: '2023-04-20T21:00:00+09:00',
          description: 'エラーが発生するイベント',
        },
      ]

      const newStudySession: StudySession = {
        id: 'hiroshima-777001',
        title: '広島新規イベント',
        url: 'https://connpass.com/event/777001/',
        datetime: '2023-04-10T19:00:00+09:00',
        endDatetime: '2023-04-10T21:00:00+09:00',
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      }

      // モック設定
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 3,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock)
        .mockResolvedValueOnce(false) // 1つ目: 新規
        .mockResolvedValueOnce(true) // 2つ目: 重複
        .mockResolvedValueOnce(false) // 3つ目: 新規（だが登録でエラー）
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(newStudySession) // 1つ目: 成功
        .mockRejectedValueOnce(new Error('Registration failed')) // 3つ目: 登録エラー
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(3)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(1) // 1つだけ成功
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(1) // 1つ重複
      expect(responseBody.hiroshimaDiscovery!.errors).toHaveLength(1) // 1つエラー
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(1)
      expect(responseBody.hiroshimaDiscovery!.registeredEvents[0]).toEqual(
        newStudySession
      )

      // エラーメッセージの確認
      expect(responseBody.hiroshimaDiscovery!.errors[0]).toContain(
        'Registration failed'
      )

      // 呼び出し回数の確認
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(3)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(2) // 重複を除く2回
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1) // 成功した1回のみ
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
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(true) // 全て重複

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(2)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(2)
      expect(responseBody.hiroshimaDiscovery!.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(0)

      // 重複チェックのみ実行され、登録・通知は実行されないことを確認
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(2)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).not.toHaveBeenCalled()
      expect(
        notificationService.publishStudySessionNotification
      ).not.toHaveBeenCalled()
    })

    it('should correctly identify duplicates by URL matching', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 555001,
          title: '広島イベント - 新しいタイトル',
          event_url: 'https://connpass.com/event/555001/',
          started_at: '2023-06-10T19:00:00+09:00',
          ended_at: '2023-06-10T21:00:00+09:00',
          description: '更新された説明',
        },
      ]

      // モック設定 - URLが一致するため重複と判定
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(true)

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(0)

      // 正確なURLで重複チェックが実行されることを確認
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledWith(
        'https://connpass.com/event/555001/'
      )
    })
  })

  describe('Error Recovery E2E', () => {
    it('should recover from connpass API errors and continue processing', async () => {
      // モック設定 - connpass API検索でエラー
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockRejectedValue(new Error('connpass API connection failed'))

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - エラーが発生しても処理は継続し、正常終了する
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toHaveLength(1)
      expect(responseBody.hiroshimaDiscovery!.errors[0]).toContain(
        'connpass API connection failed'
      )

      // API検索は試行されるが、その後の処理は実行されない
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
      expect(dynamoDBService.checkEventExists).not.toHaveBeenCalled()
    })

    it('should recover from DynamoDB errors and continue with other events', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 444001,
          title: '広島正常イベント',
          event_url: 'https://connpass.com/event/444001/',
          started_at: '2023-07-10T19:00:00+09:00',
          ended_at: '2023-07-10T21:00:00+09:00',
          description: '正常処理されるイベント',
        },
        {
          event_id: 444002,
          title: '広島エラーイベント',
          event_url: 'https://connpass.com/event/444002/',
          started_at: '2023-07-15T19:00:00+09:00',
          ended_at: '2023-07-15T21:00:00+09:00',
          description: 'DynamoDBエラーが発生するイベント',
        },
        {
          event_id: 444003,
          title: '広島回復イベント',
          event_url: 'https://connpass.com/event/444003/',
          started_at: '2023-07-20T19:00:00+09:00',
          ended_at: '2023-07-20T21:00:00+09:00',
          description: 'エラー後に正常処理されるイベント',
        },
      ]

      const successfulEvents: StudySession[] = [
        {
          id: 'hiroshima-444001',
          title: '広島正常イベント',
          url: 'https://connpass.com/event/444001/',
          datetime: '2023-07-10T19:00:00+09:00',
          endDatetime: '2023-07-10T21:00:00+09:00',
          status: 'pending',
          createdAt: '2023-01-01T12:00:00Z',
          updatedAt: '2023-01-01T12:00:00Z',
        },
        {
          id: 'hiroshima-444003',
          title: '広島回復イベント',
          url: 'https://connpass.com/event/444003/',
          datetime: '2023-07-20T19:00:00+09:00',
          endDatetime: '2023-07-20T21:00:00+09:00',
          status: 'pending',
          createdAt: '2023-01-01T12:02:00Z',
          updatedAt: '2023-01-01T12:02:00Z',
        },
      ]

      // モック設定
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 3,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock)
        .mockResolvedValueOnce(false) // 1つ目: 正常
        .mockRejectedValueOnce(new Error('DynamoDB connection failed')) // 2つ目: エラー
        .mockResolvedValueOnce(false) // 3つ目: 回復
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(successfulEvents[0]) // 1つ目: 成功
        .mockResolvedValueOnce(successfulEvents[1]) // 3つ目: 成功
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - エラーが発生しても他のイベントは正常処理される
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(3)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(2) // エラーを除く2つ
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toHaveLength(1)
      expect(responseBody.hiroshimaDiscovery!.errors[0]).toContain(
        'DynamoDB connection failed'
      )
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(2)

      // 正常なイベントは処理され、エラーイベントはスキップされることを確認
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(3)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(2)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(2)
    })

    it('should recover from notification errors and continue processing', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 333001,
          title: '広島通知成功イベント',
          event_url: 'https://connpass.com/event/333001/',
          started_at: '2023-08-10T19:00:00+09:00',
          ended_at: '2023-08-10T21:00:00+09:00',
          description: '通知が成功するイベント',
        },
        {
          event_id: 333002,
          title: '広島通知失敗イベント',
          event_url: 'https://connpass.com/event/333002/',
          started_at: '2023-08-15T19:00:00+09:00',
          ended_at: '2023-08-15T21:00:00+09:00',
          description: '通知が失敗するイベント',
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
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(registeredEvents[0])
        .mockResolvedValueOnce(registeredEvents[1])
      ;(notificationService.publishStudySessionNotification as jest.Mock)
        .mockResolvedValueOnce({}) // 1つ目: 成功
        .mockRejectedValueOnce(new Error('SNS notification failed')) // 2つ目: 失敗

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - 通知エラーが発生しても登録は成功として扱われる
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(2)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(2) // 両方とも登録成功
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toHaveLength(1) // 通知エラー1つ
      expect(responseBody.hiroshimaDiscovery!.errors[0]).toContain(
        'SNS notification failed'
      )
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(2) // 両方とも登録済み

      // 全ての処理が実行されることを確認
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(2)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(2)
    })

    it('should handle critical errors and return appropriate error response', async () => {
      // 環境変数をクリアしてクリティカルエラーを発生させる
      delete process.env.CONNPASS_API_SECRET_NAME

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - クリティカルエラーの場合は500エラーを返す
      expect(result.statusCode).toBe(500)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.message).toContain(
        'CONNPASS_API_SECRET_NAME environment variable is not set'
      )
      expect(responseBody.processedCount).toBe(0)
      expect(responseBody.successCount).toBe(0)
      expect(responseBody.errorCount).toBe(0)
      expect(responseBody.errors).toContain(
        'Batch update failed: CONNPASS_API_SECRET_NAME environment variable is not set'
      )

      // クリティカルエラーの場合は後続処理は実行されない
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).not.toHaveBeenCalled()
    })
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
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue([])
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(
        dynamoDBService.createStudySessionFromConnpass as jest.Mock
      ).mockResolvedValue(registeredEvent)
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // 手動実行E2E
      const result = await manualBatchUpdate()

      // 結果検証
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(1)

      // 手動実行でも同じ処理が実行されることを確認
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledWith('広島', 100)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledWith(hiroshimaEvents[0])
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledWith(registeredEvent)
    })
  })

  describe('Integration with Existing Materials Update E2E', () => {
    it('should not interfere with existing materials update process', async () => {
      const existingEvents: EventRecord[] = [
        {
          eventId: 'existing-1',
          title: '既存イベント1',
          eventDate: '2023-01-15T10:00:00Z',
          eventUrl: 'https://example.com/event/1',
          connpassUrl: 'https://connpass.com/event/111111/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          eventId: 'existing-2',
          title: '既存イベント2',
          eventDate: '2023-01-20T14:00:00Z',
          eventUrl: 'https://example.com/event/2',
          connpassUrl: 'https://connpass.com/event/222222/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 111001,
          title: '広島統合テストイベント',
          event_url: 'https://connpass.com/event/111001/',
          started_at: '2023-10-10T19:00:00+09:00',
          ended_at: '2023-10-10T21:00:00+09:00',
          description: '統合テスト用イベント',
        },
      ]

      const registeredHiroshimaEvent: StudySession = {
        id: 'hiroshima-111001',
        title: '広島統合テストイベント',
        url: 'https://connpass.com/event/111001/',
        datetime: '2023-10-10T19:00:00+09:00',
        endDatetime: '2023-10-10T21:00:00+09:00',
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      }

      // モック設定
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(existingEvents)
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock)
        .mockReturnValueOnce('111111')
        .mockReturnValueOnce('222222')
      ;(
        ConnpassApiService.prototype.getPresentations as jest.Mock
      ).mockResolvedValue([
        {
          id: 'material-1',
          title: 'テスト資料',
          url: 'https://speakerdeck.com/user/test',
          type: 'slide',
          createdAt: '2023-01-15T10:00:00Z',
        },
      ])
      ;(dynamoDBService.upsertEventRecord as jest.Mock).mockResolvedValue({})
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(
        dynamoDBService.createStudySessionFromConnpass as jest.Mock
      ).mockResolvedValue(registeredHiroshimaEvent)
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - 両方の処理が正常に実行される
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      // 既存の資料更新処理
      expect(responseBody.processedCount).toBe(2)
      expect(responseBody.successCount).toBe(2)
      expect(responseBody.errorCount).toBe(0)

      // 広島イベント発見処理
      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toEqual([])

      // 両方の処理が独立して実行されることを確認
      expect(
        dynamoDBService.getApprovedEventsWithConnpassUrl
      ).toHaveBeenCalledTimes(1)
      expect(
        ConnpassApiService.prototype.getPresentations
      ).toHaveBeenCalledTimes(2) // 既存イベント2つ分
      expect(dynamoDBService.upsertEventRecord).toHaveBeenCalledTimes(2) // 既存イベント2つ分
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1) // 広島検索1回
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(1) // 広島イベント1つ分
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1) // 広島イベント通知1回
    })

    it('should continue Hiroshima discovery even when materials update fails', async () => {
      const existingEvents: EventRecord[] = [
        {
          eventId: 'failing-event',
          title: '失敗する既存イベント',
          eventDate: '2023-01-15T10:00:00Z',
          eventUrl: 'https://example.com/event/failing',
          connpassUrl: 'https://connpass.com/event/999999/',
          status: 'approved',
          materials: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]

      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 100001,
          title: '広島継続テストイベント',
          event_url: 'https://connpass.com/event/100001/',
          started_at: '2023-11-10T19:00:00+09:00',
          ended_at: '2023-11-10T21:00:00+09:00',
          description: '継続テスト用イベント',
        },
      ]

      const registeredHiroshimaEvent: StudySession = {
        id: 'hiroshima-100001',
        title: '広島継続テストイベント',
        url: 'https://connpass.com/event/100001/',
        datetime: '2023-11-10T19:00:00+09:00',
        endDatetime: '2023-11-10T21:00:00+09:00',
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
      }

      // モック設定 - 既存イベント処理でエラー、広島処理は成功
      ;(secretsManagerService.getConnpassApiKey as jest.Mock).mockResolvedValue(
        'test-api-key'
      )
      ;(ConnpassApiService.prototype.testApiKey as jest.Mock).mockResolvedValue(
        true
      )
      ;(
        dynamoDBService.getApprovedEventsWithConnpassUrl as jest.Mock
      ).mockResolvedValue(existingEvents)
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock).mockReturnValue(
        '999999'
      )
      ;(
        ConnpassApiService.prototype.getPresentations as jest.Mock
      ).mockRejectedValue(new Error('Materials API failed'))
      ;(
        ConnpassApiService.prototype.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(
        dynamoDBService.createStudySessionFromConnpass as jest.Mock
      ).mockResolvedValue(registeredHiroshimaEvent)
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue({})

      // E2E実行
      const result = await batchUpdateMaterials(mockEvent, mockContext)

      // 結果検証 - 既存処理が失敗しても広島処理は成功する
      expect(result.statusCode).toBe(200)
      const responseBody: { message: string } & BatchUpdateResult = JSON.parse(
        result.body
      )

      // 既存の資料更新処理 - 失敗
      expect(responseBody.processedCount).toBe(1)
      expect(responseBody.successCount).toBe(0)
      expect(responseBody.errorCount).toBe(1)
      expect(responseBody.errors).toHaveLength(1)

      // 広島イベント発見処理 - 成功
      expect(responseBody.hiroshimaDiscovery!.totalFound).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.newRegistrations).toBe(1)
      expect(responseBody.hiroshimaDiscovery!.duplicatesSkipped).toBe(0)
      expect(responseBody.hiroshimaDiscovery!.errors).toEqual([])
      expect(responseBody.hiroshimaDiscovery!.registeredEvents).toHaveLength(1)

      // 広島処理は既存処理の失敗に影響されずに実行される
      expect(
        ConnpassApiService.prototype.searchEventsByKeyword
      ).toHaveBeenCalledTimes(1)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(1)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1)
    })
  })
})
