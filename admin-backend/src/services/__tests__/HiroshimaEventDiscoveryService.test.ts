import {
  HiroshimaEventDiscoveryService,
  HiroshimaDiscoveryResult,
} from '../HiroshimaEventDiscoveryService'
import { ConnpassApiService, ConnpassApiError } from '../ConnpassApiService'
import { DynamoDBService, DynamoDBError } from '../DynamoDBService'
import { NotificationService } from '../NotificationService'
import {
  ConnpassEventData,
  ConnpassSearchResult,
} from '../../types/EventMaterial'
import { StudySession } from '../../types/StudySession'
import { logger } from '../../utils/logger'

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

describe('HiroshimaEventDiscoveryService', () => {
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

  describe('discoverAndRegisterEvents', () => {
    it('should successfully discover and register new Hiroshima events', async () => {
      // テストデータの準備
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
        ended_at: '2024-02-15T21:00:00+09:00',
        description: '広島でのIT勉強会です',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      const mockRegisteredEvent: StudySession = {
        id: 'test-id-123',
        title: mockEventData.title,
        url: mockEventData.event_url,
        datetime: mockEventData.started_at,
        endDatetime: mockEventData.ended_at,
        status: 'pending',
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-01T10:00:00Z',
      }

      // モックの設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false) // 重複なし
      mockDynamoDBService.createStudySessionFromConnpass.mockResolvedValue(
        mockRegisteredEvent
      )
      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証
      expect(result).toEqual({
        totalFound: 1,
        newRegistrations: 1,
        duplicatesSkipped: 0,
        errors: [],
        registeredEvents: [mockRegisteredEvent],
      })

      // モックの呼び出し検証
      expect(mockConnpassApiService.searchEventsByKeyword).toHaveBeenCalledWith(
        '広島',
        100
      )
      expect(mockDynamoDBService.checkEventExists).toHaveBeenCalledWith(
        mockEventData.event_url
      )
      expect(
        mockDynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledWith(mockEventData)
      expect(
        mockNotificationService.publishStudySessionNotification
      ).toHaveBeenCalledWith(mockRegisteredEvent)
    })

    it('should skip duplicate events', async () => {
      // テストデータの準備
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      // モックの設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(true) // 重複あり

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証
      expect(result).toEqual({
        totalFound: 1,
        newRegistrations: 0,
        duplicatesSkipped: 1,
        errors: [],
        registeredEvents: [],
      })

      // 登録処理が呼ばれていないことを確認
      expect(
        mockDynamoDBService.createStudySessionFromConnpass
      ).not.toHaveBeenCalled()
      expect(
        mockNotificationService.publishStudySessionNotification
      ).not.toHaveBeenCalled()
    })

    it('should handle no events found', async () => {
      // モックの設定
      const mockSearchResult: ConnpassSearchResult = {
        events: [],
        totalCount: 0,
      }
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証
      expect(result).toEqual({
        totalFound: 0,
        newRegistrations: 0,
        duplicatesSkipped: 0,
        errors: [],
        registeredEvents: [],
      })

      // 後続処理が呼ばれていないことを確認
      expect(mockDynamoDBService.checkEventExists).not.toHaveBeenCalled()
    })

    it('should handle duplicate check errors', async () => {
      // テストデータの準備
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      // モックの設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockRejectedValue(
        new Error('DynamoDB error')
      )

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証
      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(0)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Duplicate check failed')
      expect(result.registeredEvents).toHaveLength(0)

      // 登録処理が呼ばれていないことを確認
      expect(
        mockDynamoDBService.createStudySessionFromConnpass
      ).not.toHaveBeenCalled()
    })

    it('should handle registration errors', async () => {
      // テストデータの準備
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      // モックの設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.createStudySessionFromConnpass.mockRejectedValue(
        new Error('Registration error')
      )

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証
      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(0)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Registration failed')
      expect(result.registeredEvents).toHaveLength(0)
    })

    it('should continue processing when notification fails', async () => {
      // テストデータの準備
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      const mockRegisteredEvent: StudySession = {
        id: 'test-id-123',
        title: mockEventData.title,
        url: mockEventData.event_url,
        datetime: mockEventData.started_at,
        status: 'pending',
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-01T10:00:00Z',
      }

      // モックの設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.createStudySessionFromConnpass.mockResolvedValue(
        mockRegisteredEvent
      )
      mockNotificationService.publishStudySessionNotification.mockRejectedValue(
        new Error('Notification error')
      )

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証：通知エラーでも登録は成功として扱われる
      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(1)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Notification failed')
      expect(result.registeredEvents).toHaveLength(1)
      expect(result.registeredEvents[0]).toEqual(mockRegisteredEvent)
    })

    it('should handle multiple events with mixed results', async () => {
      // テストデータの準備
      const mockEvents: ConnpassEventData[] = [
        {
          event_id: 1,
          title: '広島IT勉強会 #1',
          event_url: 'https://hiroshima-it.connpass.com/event/1/',
          started_at: '2024-02-15T19:00:00+09:00',
        },
        {
          event_id: 2,
          title: '広島IT勉強会 #2',
          event_url: 'https://hiroshima-it.connpass.com/event/2/',
          started_at: '2024-02-16T19:00:00+09:00',
        },
        {
          event_id: 3,
          title: '広島IT勉強会 #3',
          event_url: 'https://hiroshima-it.connpass.com/event/3/',
          started_at: '2024-02-17T19:00:00+09:00',
        },
      ]

      const mockSearchResult: ConnpassSearchResult = {
        events: mockEvents,
        totalCount: 3,
      }

      const mockRegisteredEvent: StudySession = {
        id: 'test-id-123',
        title: mockEvents[0].title,
        url: mockEvents[0].event_url,
        datetime: mockEvents[0].started_at,
        status: 'pending',
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-01T10:00:00Z',
      }

      // モックの設定
      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )

      // イベント1: 新規登録成功
      // イベント2: 重複でスキップ
      // イベント3: 重複チェックエラー
      mockDynamoDBService.checkEventExists
        .mockResolvedValueOnce(false) // イベント1: 重複なし
        .mockResolvedValueOnce(true) // イベント2: 重複あり
        .mockRejectedValueOnce(new Error('DynamoDB error')) // イベント3: エラー

      mockDynamoDBService.createStudySessionFromConnpass.mockResolvedValue(
        mockRegisteredEvent
      )
      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      // テスト実行
      const result = await service.discoverAndRegisterEvents()

      // 検証
      expect(result.totalFound).toBe(3)
      expect(result.newRegistrations).toBe(1)
      expect(result.duplicatesSkipped).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Duplicate check failed')
      expect(result.registeredEvents).toHaveLength(1)

      // 各イベントの処理が正しく呼ばれたことを確認
      expect(mockDynamoDBService.checkEventExists).toHaveBeenCalledTimes(3)
      expect(
        mockDynamoDBService.createStudySessionFromConnpass
      ).toHaveBeenCalledTimes(1)
      expect(
        mockNotificationService.publishStudySessionNotification
      ).toHaveBeenCalledTimes(1)
    })

    it('should handle ConnpassApiError with different error codes', async () => {
      // 認証エラーのテスト
      const authError = new ConnpassApiError(
        'Authentication failed',
        'AUTHENTICATION_FAILED',
        401,
        false
      )
      mockConnpassApiService.searchEventsByKeyword.mockRejectedValue(authError)

      const result = await service.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(0)
      expect(result.errors).toContain(
        'connpass API authentication failed - check API key'
      )
    })

    it('should handle ConnpassApiError with rate limit exceeded', async () => {
      // レート制限エラーのテスト
      const rateLimitError = new ConnpassApiError(
        'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        429,
        false
      )
      mockConnpassApiService.searchEventsByKeyword.mockRejectedValue(
        rateLimitError
      )

      const result = await service.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(0)
      expect(result.errors).toContain(
        'connpass API rate limit exceeded after retry'
      )
    })

    it('should handle ConnpassApiError with other error codes', async () => {
      // その他のAPIエラーのテスト
      const httpError = new ConnpassApiError(
        'Server error',
        'HTTP_ERROR',
        500,
        false
      )
      mockConnpassApiService.searchEventsByKeyword.mockRejectedValue(httpError)

      const result = await service.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(0)
      expect(result.errors).toContain('connpass API error: Server error')
    })

    it('should handle non-ConnpassApiError during search', async () => {
      // 予期しないエラーのテスト
      const unexpectedError = new Error('Unexpected error')
      mockConnpassApiService.searchEventsByKeyword.mockRejectedValue(
        unexpectedError
      )

      await expect(service.discoverAndRegisterEvents()).rejects.toThrow(
        'Unexpected error'
      )
    })

    it('should handle DynamoDBError during duplicate check', async () => {
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      const dbError = new DynamoDBError(
        'Duplicate check failed',
        'DUPLICATE_CHECK_FAILED',
        'checkEventExists',
        new Error('DB connection error')
      )

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockRejectedValue(dbError)

      const result = await service.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(0)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Duplicate check failed for event 1')
    })

    it('should handle DynamoDBError during registration', async () => {
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      const dbError = new DynamoDBError(
        'Registration failed',
        'CREATE_SESSION_FAILED',
        'createStudySessionFromConnpass',
        new Error('DB write error')
      )

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.createStudySessionFromConnpass.mockRejectedValue(
        dbError
      )

      const result = await service.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Registration failed for event 1')
    })

    it('should log detailed process information', async () => {
      const mockEventData: ConnpassEventData = {
        event_id: 12345,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/12345/',
        started_at: '2024-02-15T19:00:00+09:00',
      }

      const mockSearchResult: ConnpassSearchResult = {
        events: [mockEventData],
        totalCount: 1,
      }

      const mockRegisteredEvent: StudySession = {
        id: 'test-id-123',
        title: mockEventData.title,
        url: mockEventData.event_url,
        datetime: mockEventData.started_at,
        status: 'pending',
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: '2024-02-01T10:00:00Z',
      }

      mockConnpassApiService.searchEventsByKeyword.mockResolvedValue(
        mockSearchResult
      )
      mockDynamoDBService.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.createStudySessionFromConnpass.mockResolvedValue(
        mockRegisteredEvent
      )
      mockNotificationService.publishStudySessionNotification.mockResolvedValue()

      await service.discoverAndRegisterEvents()

      // ログ出力の検証
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting Hiroshima event discovery process')
      )
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Phase 1: Searching connpass events with keyword "広島"'
        )
      )
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 events from connpass API')
      )
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Phase 2: Processing 1 events for duplicate check and registration'
        )
      )
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Hiroshima event discovery completed')
      )
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Summary: Found=1, New=1, Duplicates=0, Errors=0'
        )
      )
    })
  })
})
