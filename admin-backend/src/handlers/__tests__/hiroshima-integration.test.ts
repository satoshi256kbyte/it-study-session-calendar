import {
  HiroshimaEventDiscoveryService,
  HiroshimaDiscoveryResult,
} from '../../services/HiroshimaEventDiscoveryService'
import { ConnpassApiService } from '../../services/ConnpassApiService'
import { DynamoDBService } from '../../services/DynamoDBService'
import { NotificationService } from '../../services/NotificationService'
import { StudySession } from '../../types/StudySession'
import { ConnpassEventData } from '../../types/EventMaterial'

/**
 * 広島イベント自動登録機能の統合テスト
 * 要件5.1, 5.2, 4.1, 4.2に対応
 */
describe('Hiroshima Event Discovery Integration Tests', () => {
  let hiroshimaEventDiscoveryService: HiroshimaEventDiscoveryService
  let connpassApiService: ConnpassApiService
  let dynamoDBService: DynamoDBService
  let notificationService: NotificationService

  beforeEach(() => {
    // 環境変数をモック
    process.env.SNS_TOPIC_ARN =
      'arn:aws:sns:ap-northeast-1:123456789012:test-topic'
    process.env.AWS_REGION = 'ap-northeast-1'

    // サービスインスタンスを作成
    connpassApiService = new ConnpassApiService('test-api-key')
    dynamoDBService = new DynamoDBService()
    notificationService = new NotificationService()
    hiroshimaEventDiscoveryService = new HiroshimaEventDiscoveryService(
      connpassApiService,
      dynamoDBService,
      notificationService
    )

    // サービスメソッドをモック
    jest.spyOn(connpassApiService, 'searchEventsByKeyword')
    jest.spyOn(dynamoDBService, 'checkEventExists')
    jest.spyOn(dynamoDBService, 'createStudySessionFromConnpass')
    jest.spyOn(notificationService, 'publishStudySessionNotification')
  })

  afterEach(() => {
    jest.restoreAllMocks()
    // 環境変数をクリア
    delete process.env.SNS_TOPIC_ARN
    delete process.env.AWS_REGION
  })

  describe('Service Integration Tests', () => {
    /**
     * 要件5.1, 5.2: バッチ処理統合テスト（既存処理との並行実行）
     */
    it('should integrate all services for successful event discovery and registration', async () => {
      // テストデータの準備
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 123456,
          title: '広島JavaScript勉強会',
          event_url: 'https://connpass.com/event/123456/',
          started_at: '2023-02-01T19:00:00+09:00',
          ended_at: '2023-02-01T21:00:00+09:00',
          description: '広島でJavaScriptを学ぼう',
        },
        {
          event_id: 789012,
          title: '広島Python勉強会',
          event_url: 'https://connpass.com/event/789012/',
          started_at: '2023-02-15T19:00:00+09:00',
          ended_at: '2023-02-15T21:00:00+09:00',
          description: '広島でPythonを学ぼう',
        },
      ]

      const registeredSessions: StudySession[] = [
        {
          id: 'hiroshima-js-1',
          title: '広島JavaScript勉強会',
          url: 'https://connpass.com/event/123456/',
          datetime: '2023-02-01T10:00:00.000Z',
          endDatetime: '2023-02-01T12:00:00.000Z',
          status: 'pending',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'hiroshima-python-1',
          title: '広島Python勉強会',
          url: 'https://connpass.com/event/789012/',
          datetime: '2023-02-15T10:00:00.000Z',
          endDatetime: '2023-02-15T12:00:00.000Z',
          status: 'pending',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ]

      // モックの設定
      ;(
        connpassApiService.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(registeredSessions[0])
        .mockResolvedValueOnce(registeredSessions[1])
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue(undefined)

      // 統合テスト実行
      const result: HiroshimaDiscoveryResult =
        await hiroshimaEventDiscoveryService.discoverAndRegisterEvents()

      // 結果の検証
      expect(result.totalFound).toBe(2)
      expect(result.newRegistrations).toBe(2)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.registeredEvents).toHaveLength(2)

      // サービス間の連携を確認
      expect(connpassApiService.searchEventsByKeyword).toHaveBeenCalledWith(
        '広島',
        100
      )
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(2)
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledWith(
        'https://connpass.com/event/123456/'
      )
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledWith(
        'https://connpass.com/event/789012/'
      )
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(2)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(2)
    })

    /**
     * 要件4.1, 4.2: 通知システム統合テスト（NotificationServiceとの連携）
     */
    it('should handle notification system integration correctly', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 555555,
          title: '広島通知テストイベント',
          event_url: 'https://connpass.com/event/555555/',
          started_at: '2023-03-01T19:00:00+09:00',
          ended_at: '2023-03-01T21:00:00+09:00',
          description: '通知テスト用イベント',
        },
      ]

      const registeredSession: StudySession = {
        id: 'hiroshima-notification-1',
        title: '広島通知テストイベント',
        url: 'https://connpass.com/event/555555/',
        datetime: '2023-03-01T10:00:00.000Z',
        endDatetime: '2023-03-01T12:00:00.000Z',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }

      // モックの設定
      ;(
        connpassApiService.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(
        dynamoDBService.createStudySessionFromConnpass as jest.Mock
      ).mockResolvedValue(registeredSession)
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue(undefined)

      // 統合テスト実行
      const result: HiroshimaDiscoveryResult =
        await hiroshimaEventDiscoveryService.discoverAndRegisterEvents()

      // 通知システムとの統合を確認
      expect(result.newRegistrations).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledWith(registeredSession)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1)
    })

    /**
     * エラー時の処理継続テスト
     */
    it('should continue processing when individual steps fail', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 111111,
          title: '広島成功イベント',
          event_url: 'https://connpass.com/event/111111/',
          started_at: '2023-04-01T19:00:00+09:00',
          ended_at: '2023-04-01T21:00:00+09:00',
          description: '成功するイベント',
        },
        {
          event_id: 222222,
          title: '広島失敗イベント',
          event_url: 'https://connpass.com/event/222222/',
          started_at: '2023-04-05T19:00:00+09:00',
          ended_at: '2023-04-05T21:00:00+09:00',
          description: '失敗するイベント',
        },
        {
          event_id: 333333,
          title: '広島通知失敗イベント',
          event_url: 'https://connpass.com/event/333333/',
          started_at: '2023-04-10T19:00:00+09:00',
          ended_at: '2023-04-10T21:00:00+09:00',
          description: '通知が失敗するイベント',
        },
      ]

      const successSession: StudySession = {
        id: 'hiroshima-success-1',
        title: '広島成功イベント',
        url: 'https://connpass.com/event/111111/',
        datetime: '2023-04-01T10:00:00.000Z',
        endDatetime: '2023-04-01T12:00:00.000Z',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }

      const notificationFailSession: StudySession = {
        id: 'hiroshima-notification-fail-1',
        title: '広島通知失敗イベント',
        url: 'https://connpass.com/event/333333/',
        datetime: '2023-04-10T10:00:00.000Z',
        endDatetime: '2023-04-10T12:00:00.000Z',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }

      // モックの設定（混合成功・失敗シナリオ）
      ;(
        connpassApiService.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 3,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock)
        .mockResolvedValueOnce(false) // 成功イベント：重複なし
        .mockResolvedValueOnce(false) // 失敗イベント：重複なし
        .mockResolvedValueOnce(false) // 通知失敗イベント：重複なし
      ;(dynamoDBService.createStudySessionFromConnpass as jest.Mock)
        .mockResolvedValueOnce(successSession) // 成功
        .mockRejectedValueOnce(new Error('Registration failed')) // 失敗
        .mockResolvedValueOnce(notificationFailSession) // 成功（通知は失敗）
      ;(notificationService.publishStudySessionNotification as jest.Mock)
        .mockResolvedValueOnce(undefined) // 成功
        .mockRejectedValueOnce(new Error('Notification failed')) // 通知失敗

      // 統合テスト実行
      const result: HiroshimaDiscoveryResult =
        await hiroshimaEventDiscoveryService.discoverAndRegisterEvents()

      // 部分的成功の結果を確認
      expect(result.totalFound).toBe(3)
      expect(result.newRegistrations).toBe(2) // 成功イベント + 通知失敗イベント（登録は成功）
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(2) // 登録失敗 + 通知失敗
      expect(result.registeredEvents).toHaveLength(2)

      // エラーメッセージの確認
      expect(
        result.errors.some((error: string) =>
          error.includes('Registration failed')
        )
      ).toBe(true)
      expect(
        result.errors.some((error: string) =>
          error.includes('Notification failed')
        )
      ).toBe(true)

      // サービス呼び出しの確認
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(3)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(2) // 登録成功した2つのみ
    })

    /**
     * 統合レスポンス生成テスト
     */
    it('should generate comprehensive integrated response structure', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 999999,
          title: '広島統合レスポンステストイベント',
          event_url: 'https://connpass.com/event/999999/',
          started_at: '2023-05-01T19:00:00+09:00',
          ended_at: '2023-05-01T21:00:00+09:00',
          description: '統合レスポンステスト用イベント',
        },
      ]

      const registeredSession: StudySession = {
        id: 'hiroshima-response-1',
        title: '広島統合レスポンステストイベント',
        url: 'https://connpass.com/event/999999/',
        datetime: '2023-05-01T10:00:00.000Z',
        endDatetime: '2023-05-01T12:00:00.000Z',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }

      // モックの設定
      ;(
        connpassApiService.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 1,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock).mockResolvedValue(false)
      ;(
        dynamoDBService.createStudySessionFromConnpass as jest.Mock
      ).mockResolvedValue(registeredSession)
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue(undefined)

      // 統合テスト実行
      const result: HiroshimaDiscoveryResult =
        await hiroshimaEventDiscoveryService.discoverAndRegisterEvents()

      // 統合レスポンス構造の確認
      expect(result).toHaveProperty('totalFound')
      expect(result).toHaveProperty('newRegistrations')
      expect(result).toHaveProperty('duplicatesSkipped')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('registeredEvents')

      // 具体的な値の確認
      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(1)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.registeredEvents).toHaveLength(1)
      expect(result.registeredEvents[0]).toEqual(registeredSession)

      // 型の確認
      expect(typeof result.totalFound).toBe('number')
      expect(typeof result.newRegistrations).toBe('number')
      expect(typeof result.duplicatesSkipped).toBe('number')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(Array.isArray(result.registeredEvents)).toBe(true)
    })

    /**
     * 重複イベントスキップの統合テスト
     */
    it('should handle duplicate events correctly in integration', async () => {
      const hiroshimaEvents: ConnpassEventData[] = [
        {
          event_id: 777777,
          title: '広島新規イベント',
          event_url: 'https://connpass.com/event/777777/',
          started_at: '2023-06-01T19:00:00+09:00',
          ended_at: '2023-06-01T21:00:00+09:00',
          description: '新規イベント',
        },
        {
          event_id: 888888,
          title: '広島重複イベント',
          event_url: 'https://connpass.com/event/888888/',
          started_at: '2023-06-05T19:00:00+09:00',
          ended_at: '2023-06-05T21:00:00+09:00',
          description: '重複イベント',
        },
      ]

      const newSession: StudySession = {
        id: 'hiroshima-new-1',
        title: '広島新規イベント',
        url: 'https://connpass.com/event/777777/',
        datetime: '2023-06-01T10:00:00.000Z',
        endDatetime: '2023-06-01T12:00:00.000Z',
        status: 'pending',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }

      // モックの設定
      ;(
        connpassApiService.searchEventsByKeyword as jest.Mock
      ).mockResolvedValue({
        events: hiroshimaEvents,
        totalCount: 2,
      })
      ;(dynamoDBService.checkEventExists as jest.Mock)
        .mockResolvedValueOnce(false) // 新規イベント：重複なし
        .mockResolvedValueOnce(true) // 重複イベント：重複あり
      ;(
        dynamoDBService.createStudySessionFromConnpass as jest.Mock
      ).mockResolvedValue(newSession)
      ;(
        notificationService.publishStudySessionNotification as jest.Mock
      ).mockResolvedValue(undefined)

      // 統合テスト実行
      const result: HiroshimaDiscoveryResult =
        await hiroshimaEventDiscoveryService.discoverAndRegisterEvents()

      // 重複処理の結果を確認
      expect(result.totalFound).toBe(2)
      expect(result.newRegistrations).toBe(1) // 新規イベントのみ
      expect(result.duplicatesSkipped).toBe(1) // 重複イベントはスキップ
      expect(result.errors).toHaveLength(0)
      expect(result.registeredEvents).toHaveLength(1)

      // 重複チェックが正しく実行されたことを確認
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledTimes(2)
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledWith(
        'https://connpass.com/event/777777/'
      )
      expect(dynamoDBService.checkEventExists).toHaveBeenCalledWith(
        'https://connpass.com/event/888888/'
      )

      // 新規イベントのみ登録・通知されたことを確認
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(1)
      expect(
        dynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledWith(hiroshimaEvents[0])
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1)
      expect(
        notificationService.publishStudySessionNotification
      ).toHaveBeenCalledWith(newSession)
    })
  })
})
