import { ConnpassApiService, ConnpassApiError } from '../ConnpassApiService'
import { DynamoDBService, DynamoDBError } from '../DynamoDBService'
import { HiroshimaEventDiscoveryService } from '../HiroshimaEventDiscoveryService'
import { NotificationService } from '../NotificationService'
import { logger } from '../../utils/logger'

// Mock the logger to capture log calls
jest.mock('../../utils/logger')
const mockLogger = logger as jest.Mocked<typeof logger>

// Mock fetch for ConnpassApiService
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('Error Handling Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger.debug.mockImplementation(() => {})
    mockLogger.info.mockImplementation(() => {})
    mockLogger.warn.mockImplementation(() => {})
    mockLogger.error.mockImplementation(() => {})

    // Mock setTimeout to avoid actual delays in tests
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback()
      return {} as any
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('ConnpassApiError', () => {
    it('should create ConnpassApiError with correct properties', () => {
      const error = new ConnpassApiError(
        'Test error message',
        'TEST_ERROR',
        400,
        true
      )

      expect(error.name).toBe('ConnpassApiError')
      expect(error.message).toBe('Test error message')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.httpStatus).toBe(400)
      expect(error.retryable).toBe(true)
    })
  })

  describe('DynamoDBError', () => {
    it('should create DynamoDBError with correct properties', () => {
      const originalError = new Error('Original error')
      const error = new DynamoDBError(
        'Test DynamoDB error',
        'TEST_DB_ERROR',
        'testOperation',
        originalError
      )

      expect(error.name).toBe('DynamoDBError')
      expect(error.message).toBe('Test DynamoDB error')
      expect(error.errorCode).toBe('TEST_DB_ERROR')
      expect(error.operation).toBe('testOperation')
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('ConnpassApiService Error Handling', () => {
    let connpassApiService: ConnpassApiService

    beforeEach(() => {
      connpassApiService = new ConnpassApiService('test-api-key')
    })

    it('should handle 401 authentication error correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('', {
          status: 401,
          statusText: 'Unauthorized',
        })
      )

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toThrow(ConnpassApiError)

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toMatchObject({
        errorCode: 'AUTHENTICATION_FAILED',
        httpStatus: 401,
        retryable: false,
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('connpass API authentication failed'),
        expect.any(Object)
      )
    })

    it('should handle 429 rate limit error with retry', async () => {
      // First call returns 429
      mockFetch.mockResolvedValueOnce(
        new Response('', {
          status: 429,
          statusText: 'Too Many Requests',
        })
      )

      // Second call (retry) succeeds
      const successResponse = {
        results_returned: 1,
        results_available: 1,
        results_start: 1,
        events: [
          {
            event_id: 123,
            title: 'Test Event',
            event_url: 'https://connpass.com/event/123/',
            started_at: '2024-01-01T10:00:00+09:00',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(successResponse), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await connpassApiService.searchEventsByKeyword('test')

      expect(result.events).toHaveLength(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('connpass API rate limit exceeded'),
        expect.any(Object)
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Retrying connpass API request')
      )
    })

    it('should handle 429 rate limit error after retry failure', async () => {
      // Both calls return 429
      mockFetch.mockResolvedValue(
        new Response('', {
          status: 429,
          statusText: 'Too Many Requests',
        })
      )

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toThrow(ConnpassApiError)

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toMatchObject({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        httpStatus: 429,
        retryable: false,
      })
    })

    it('should handle other HTTP errors correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      )

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toThrow(ConnpassApiError)

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toMatchObject({
        errorCode: 'HTTP_ERROR',
        httpStatus: 500,
        retryable: false,
      })
    })

    it('should log detailed error context', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        connpassApiService.searchEventsByKeyword('test')
      ).rejects.toThrow('Network error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to search events with keyword "test" with detailed context:'
        ),
        expect.objectContaining({
          keyword: 'test',
          errorType: 'Error',
          errorMessage: 'Network error',
          stack: expect.any(String),
        })
      )
    })
  })

  describe('DynamoDBService Error Handling', () => {
    let dynamoDBService: DynamoDBService

    beforeEach(() => {
      // Mock environment variable
      process.env.STUDY_SESSIONS_TABLE_NAME = 'test-table'
      dynamoDBService = new DynamoDBService()
    })

    it('should handle checkEventExists error correctly', async () => {
      // Mock DynamoDB send method to throw error
      const mockSend = jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      ;(dynamoDBService as any).dynamodb = { send: mockSend }

      await expect(
        dynamoDBService.checkEventExists('https://connpass.com/event/123/')
      ).rejects.toThrow(DynamoDBError)

      await expect(
        dynamoDBService.checkEventExists('https://connpass.com/event/123/')
      ).rejects.toMatchObject({
        errorCode: 'DUPLICATE_CHECK_FAILED',
        operation: 'checkEventExists',
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('DynamoDB error checking event existence'),
        expect.objectContaining({
          eventUrl: 'https://connpass.com/event/123/',
          operation: 'checkEventExists',
          errorType: 'Error',
          errorMessage: 'DynamoDB error',
        })
      )
    })

    it('should handle createStudySessionFromConnpass error correctly', async () => {
      const mockSend = jest
        .fn()
        .mockRejectedValue(new Error('DynamoDB put error'))
      ;(dynamoDBService as any).dynamodb = { send: mockSend }

      const eventData = {
        event_id: 123,
        title: 'Test Event',
        event_url: 'https://connpass.com/event/123/',
        started_at: '2024-01-01T10:00:00+09:00',
      }

      await expect(
        dynamoDBService.createStudySessionFromConnpass(eventData)
      ).rejects.toThrow(DynamoDBError)

      await expect(
        dynamoDBService.createStudySessionFromConnpass(eventData)
      ).rejects.toMatchObject({
        errorCode: 'CREATE_SESSION_FAILED',
        operation: 'createStudySessionFromConnpass',
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('DynamoDB error creating study session'),
        expect.objectContaining({
          eventData: expect.objectContaining({
            eventId: 123,
            title: 'Test Event',
          }),
          operation: 'createStudySessionFromConnpass',
        })
      )
    })
  })

  describe('HiroshimaEventDiscoveryService Error Handling', () => {
    let hiroshimaService: HiroshimaEventDiscoveryService
    let mockConnpassService: jest.Mocked<ConnpassApiService>
    let mockDynamoDBService: jest.Mocked<DynamoDBService>
    let mockNotificationService: jest.Mocked<NotificationService>

    beforeEach(() => {
      mockConnpassService = {
        searchEventsByKeyword: jest.fn(),
      } as any

      mockDynamoDBService = {
        checkEventExists: jest.fn(),
        createStudySessionFromConnpass: jest.fn(),
      } as any

      mockNotificationService = {
        publishStudySessionNotification: jest.fn(),
      } as any

      hiroshimaService = new HiroshimaEventDiscoveryService(
        mockConnpassService,
        mockDynamoDBService,
        mockNotificationService
      )
    })

    it('should handle connpass API search error gracefully', async () => {
      const apiError = new ConnpassApiError(
        'API authentication failed',
        'AUTHENTICATION_FAILED',
        401,
        false
      )
      mockConnpassService.searchEventsByKeyword.mockRejectedValue(apiError)

      const result = await hiroshimaService.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(0)
      expect(result.newRegistrations).toBe(0)
      expect(result.errors).toContain(
        'connpass API authentication failed - check API key'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('connpass API error during event search'),
        expect.objectContaining({
          isConnpassApiError: true,
          errorType: 'ConnpassApiError',
        })
      )
    })

    it('should handle duplicate check error and skip event', async () => {
      mockConnpassService.searchEventsByKeyword.mockResolvedValue({
        events: [
          {
            event_id: 123,
            title: 'Test Event',
            event_url: 'https://connpass.com/event/123/',
            started_at: '2024-01-01T10:00:00+09:00',
          },
        ],
        totalCount: 1,
      })

      const dbError = new DynamoDBError(
        'Duplicate check failed',
        'DUPLICATE_CHECK_FAILED',
        'checkEventExists',
        new Error('DB error')
      )
      mockDynamoDBService.checkEventExists.mockRejectedValue(dbError)

      const result = await hiroshimaService.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(0)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Duplicate check failed for event 1')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate check failed for event 1'),
        expect.objectContaining({
          isDynamoDBError: true,
          operation: 'duplicateCheck',
        })
      )
    })

    it('should handle notification error but continue processing', async () => {
      mockConnpassService.searchEventsByKeyword.mockResolvedValue({
        events: [
          {
            event_id: 123,
            title: 'Test Event',
            event_url: 'https://connpass.com/event/123/',
            started_at: '2024-01-01T10:00:00+09:00',
          },
        ],
        totalCount: 1,
      })

      mockDynamoDBService.checkEventExists.mockResolvedValue(false)
      mockDynamoDBService.createStudySessionFromConnpass.mockResolvedValue({
        id: 'test-id',
        title: 'Test Event',
        url: 'https://connpass.com/event/123/',
        datetime: '2024-01-01T10:00:00+09:00',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      mockNotificationService.publishStudySessionNotification.mockRejectedValue(
        new Error('SNS error')
      )

      const result = await hiroshimaService.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(1) // Registration succeeded despite notification failure
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Notification failed for event 1')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Notification failed for event 1'),
        expect.objectContaining({
          operation: 'notification',
          errorType: 'Error',
          errorMessage: 'SNS error',
        })
      )
    })

    it('should handle registration error and skip event', async () => {
      mockConnpassService.searchEventsByKeyword.mockResolvedValue({
        events: [
          {
            event_id: 123,
            title: 'Test Event',
            event_url: 'https://connpass.com/event/123/',
            started_at: '2024-01-01T10:00:00+09:00',
          },
        ],
        totalCount: 1,
      })

      mockDynamoDBService.checkEventExists.mockResolvedValue(false)

      const registrationError = new DynamoDBError(
        'Registration failed',
        'CREATE_SESSION_FAILED',
        'createStudySessionFromConnpass',
        new Error('DB write error')
      )
      mockDynamoDBService.createStudySessionFromConnpass.mockRejectedValue(
        registrationError
      )

      const result = await hiroshimaService.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(1)
      expect(result.newRegistrations).toBe(0)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Registration failed for event 1')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Registration failed for event 1'),
        expect.objectContaining({
          isDynamoDBError: true,
          operation: 'registration',
        })
      )
    })

    it('should handle multiple error types in single discovery run', async () => {
      mockConnpassService.searchEventsByKeyword.mockResolvedValue({
        events: [
          {
            event_id: 1,
            title: 'Event 1',
            event_url: 'https://connpass.com/event/1/',
            started_at: '2024-01-01T10:00:00+09:00',
          },
          {
            event_id: 2,
            title: 'Event 2',
            event_url: 'https://connpass.com/event/2/',
            started_at: '2024-01-02T10:00:00+09:00',
          },
          {
            event_id: 3,
            title: 'Event 3',
            event_url: 'https://connpass.com/event/3/',
            started_at: '2024-01-03T10:00:00+09:00',
          },
        ],
        totalCount: 3,
      })

      // Event 1: Duplicate check error
      mockDynamoDBService.checkEventExists
        .mockRejectedValueOnce(
          new DynamoDBError(
            'Check failed',
            'DUPLICATE_CHECK_FAILED',
            'checkEventExists',
            new Error('DB error')
          )
        )
        .mockResolvedValueOnce(false) // Event 2: No duplicate
        .mockResolvedValueOnce(false) // Event 3: No duplicate

      // Event 2: Registration success but notification failure
      mockDynamoDBService.createStudySessionFromConnpass
        .mockResolvedValueOnce({
          id: 'test-id-2',
          title: 'Event 2',
          url: 'https://connpass.com/event/2/',
          datetime: '2024-01-02T10:00:00+09:00',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })
        .mockRejectedValueOnce(
          new DynamoDBError(
            'Registration failed',
            'CREATE_SESSION_FAILED',
            'createStudySessionFromConnpass',
            new Error('DB error')
          )
        )

      mockNotificationService.publishStudySessionNotification.mockRejectedValueOnce(
        new Error('Notification error')
      )

      const result = await hiroshimaService.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(3)
      expect(result.newRegistrations).toBe(1) // Only Event 2 succeeded (despite notification failure)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(3) // All three events had errors
      expect(result.errors[0]).toContain('Duplicate check failed for event 1')
      expect(result.errors[1]).toContain('Notification failed for event 2')
      expect(result.errors[2]).toContain('Registration failed for event 3')
    })

    it('should handle critical errors in discovery process', async () => {
      // Test unexpected error that should be re-thrown
      const criticalError = new Error('Critical system error')
      mockConnpassService.searchEventsByKeyword.mockRejectedValue(criticalError)

      const result = await hiroshimaService.discoverAndRegisterEvents()

      expect(result.totalFound).toBe(0)
      expect(result.newRegistrations).toBe(0)
      expect(result.duplicatesSkipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain(
        'Critical error in Hiroshima event discovery'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Critical error in Hiroshima event discovery'),
        criticalError
      )
    })

    it('should log detailed error context for all error types', async () => {
      const testError = new Error('Test error with stack trace')
      mockConnpassService.searchEventsByKeyword.mockRejectedValue(testError)

      await hiroshimaService.discoverAndRegisterEvents()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('connpass API error during event search'),
        expect.objectContaining({
          keyword: '広島',
          maxResults: 100,
          operation: 'searchEventsByKeyword',
          errorType: 'Error',
          errorMessage: 'Test error with stack trace',
          isConnpassApiError: false,
          stack: expect.stringContaining('Error: Test error with stack trace'),
        })
      )
    })
  })
})
