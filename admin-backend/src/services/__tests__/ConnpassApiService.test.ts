import { ConnpassApiService, ConnpassApiError } from '../ConnpassApiService'
import {
  Material,
  ConnpassPresentationsResponse,
  ConnpassEventData,
  ConnpassSearchResult,
} from '../../types/EventMaterial'

// fetch のモック
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// setTimeout のモック
jest.useFakeTimers()

describe('ConnpassApiService', () => {
  let service: ConnpassApiService
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    service = new ConnpassApiService(mockApiKey)
    mockFetch.mockClear()
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
  })

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(service).toBeInstanceOf(ConnpassApiService)
    })
  })

  describe('getPresentations', () => {
    const mockEventId = '123456'
    const mockResponse: ConnpassPresentationsResponse = {
      results_returned: 2,
      results_available: 2,
      results_start: 1,
      presentations: [
        {
          name: 'Test Presentation 1',
          url: 'https://speakerdeck.com/test/presentation1',
          presenter: { id: 1, nickname: 'test_user1' },
          presentation_type: 'slide',
          created_at: '2024-01-01T00:00:00Z',
          user: {},
        },
        {
          name: 'Test Presentation 2',
          url: 'https://github.com/test/repo',
          presenter: { id: 2, nickname: 'test_user2' },
          presentation_type: 'document',
          created_at: '2024-01-01T00:00:00Z',
          user: {},
        },
      ],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    })

    it('should get presentations successfully', async () => {
      const materials = await service.getPresentations(mockEventId)

      expect(materials).toHaveLength(2)
      expect(materials[0]).toMatchObject({
        title: 'Test Presentation 1',
        url: 'https://speakerdeck.com/test/presentation1',
        type: 'slide',
        presenterNickname: 'test_user1',
      })
      expect(materials[1]).toMatchObject({
        title: 'Test Presentation 2',
        url: 'https://github.com/test/repo',
        type: 'document',
        presenterNickname: 'test_user2',
      })
    })

    it('should make authenticated request with correct headers', async () => {
      await service.getPresentations(mockEventId)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/presentations/'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-API-Key': mockApiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'IT-Study-Calendar-Bot/1.0',
          }),
        })
      )
    })

    it('should include event_id in query parameters', async () => {
      await service.getPresentations(mockEventId)

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain(`event_id=${mockEventId}`)
      expect(callUrl).toContain('count=100')
    })

    it('should handle API authentication error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      await expect(service.getPresentations(mockEventId)).rejects.toThrow(
        'connpass API authentication failed: Invalid API key'
      )
    })

    it('should handle API rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response)

      await expect(service.getPresentations(mockEventId)).rejects.toThrow(
        'connpass API rate limit exceeded'
      )
    })

    it('should handle other API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(service.getPresentations(mockEventId)).rejects.toThrow(
        'connpass API request failed: 500 Internal Server Error'
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(service.getPresentations(mockEventId)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('rate limiting', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results_returned: 0,
          results_available: 0,
          results_start: 1,
          presentations: [],
        }),
      } as Response)
    })

    it('should enforce rate limit between requests', async () => {
      const startTime = Date.now()

      // 最初のリクエスト
      await service.getPresentations('123')

      // 2番目のリクエスト（レート制限により遅延されるはず）
      const secondRequestPromise = service.getPresentations('456')

      // タイマーを進める
      jest.advanceTimersByTime(1000)

      await secondRequestPromise

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('extractEventIdFromUrl', () => {
    it('should extract event ID from valid connpass URL', () => {
      const url = 'https://connpass.com/event/123456/'
      const eventId = ConnpassApiService.extractEventIdFromUrl(url)
      expect(eventId).toBe('123456')
    })

    it('should extract event ID from URL without trailing slash', () => {
      const url = 'https://connpass.com/event/789012'
      const eventId = ConnpassApiService.extractEventIdFromUrl(url)
      expect(eventId).toBe('789012')
    })

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid'
      const eventId = ConnpassApiService.extractEventIdFromUrl(url)
      expect(eventId).toBeNull()
    })

    it('should return null for malformed connpass URL', () => {
      const url = 'https://connpass.com/event/abc/'
      const eventId = ConnpassApiService.extractEventIdFromUrl(url)
      expect(eventId).toBeNull()
    })
  })

  describe('material type inference', () => {
    const testCases = [
      { url: 'https://speakerdeck.com/test', expectedType: 'slide' },
      { url: 'https://www.slideshare.net/test', expectedType: 'slide' },
      {
        url: 'https://docs.google.com/presentation/test',
        expectedType: 'slide',
      },
      { url: 'https://example.com/test.pdf', expectedType: 'slide' },
      { url: 'https://example.com/test.pptx', expectedType: 'slide' },
      { url: 'https://youtube.com/watch?v=test', expectedType: 'video' },
      { url: 'https://youtu.be/test', expectedType: 'video' },
      { url: 'https://vimeo.com/test', expectedType: 'video' },
      { url: 'https://example.com/test.mp4', expectedType: 'video' },
      { url: 'https://github.com/test/repo', expectedType: 'document' },
      { url: 'https://qiita.com/test/items/test', expectedType: 'document' },
      { url: 'https://zenn.dev/test/articles/test', expectedType: 'document' },
      {
        url: 'https://docs.google.com/document/test',
        expectedType: 'document',
      },
      { url: 'https://example.com/test.md', expectedType: 'document' },
      { url: 'https://example.com/unknown', expectedType: 'other' },
    ]

    testCases.forEach(({ url, expectedType }) => {
      it(`should infer ${expectedType} type for ${url}`, async () => {
        const mockResponse: ConnpassPresentationsResponse = {
          results_returned: 1,
          results_available: 1,
          results_start: 1,
          presentations: [
            {
              name: 'Test',
              url,
              presenter: { id: 1, nickname: 'test_user' },
              presentation_type: 'slide',
              created_at: '2024-01-01T00:00:00Z',
              user: {},
            },
          ],
        }

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        } as Response)

        const materials = await service.getPresentations('123')
        expect(materials[0].type).toBe(expectedType)
      })
    })
  })

  describe('searchEventsByKeyword', () => {
    const mockSearchResponse = {
      results_returned: 2,
      results_available: 10,
      results_start: 1,
      events: [
        {
          event_id: 123456,
          title: '広島IT勉強会 #1',
          event_url: 'https://connpass.com/event/123456/',
          started_at: '2024-01-15T19:00:00+09:00',
          ended_at: '2024-01-15T21:00:00+09:00',
          description: '広島でのIT勉強会です',
        },
        {
          event_id: 789012,
          title: '広島プログラミング勉強会',
          event_url: 'https://connpass.com/event/789012/',
          started_at: '2024-01-20T14:00:00+09:00',
          description: 'プログラミングの勉強会',
        },
      ],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response)
    })

    it('should search events by keyword successfully', async () => {
      const result = await service.searchEventsByKeyword('広島')

      expect(result.events).toHaveLength(2)
      expect(result.totalCount).toBe(10)
      expect(result.events[0]).toMatchObject({
        event_id: 123456,
        title: '広島IT勉強会 #1',
        event_url: 'https://connpass.com/event/123456/',
        started_at: '2024-01-15T19:00:00+09:00',
      })
    })

    it('should make authenticated request with correct parameters', async () => {
      await service.searchEventsByKeyword('広島', 50)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-API-Key': mockApiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'IT-Study-Calendar-Bot/1.0',
          }),
        })
      )

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('keyword=広島')
      expect(callUrl).toContain('count=50')
      expect(callUrl).toContain('order=2')
    })

    it('should use default count of 100 when not specified', async () => {
      await service.searchEventsByKeyword('広島')

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('count=100')
    })

    it('should handle API authentication error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      await expect(service.searchEventsByKeyword('広島')).rejects.toThrow(
        'connpass API authentication failed: Invalid API key'
      )
    })

    it('should handle API rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response)

      await expect(service.searchEventsByKeyword('広島')).rejects.toThrow(
        'connpass API rate limit exceeded'
      )
    })

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results_returned: 0,
          results_available: 0,
          results_start: 1,
          events: [],
        }),
      } as Response)

      const result = await service.searchEventsByKeyword('nonexistent')
      expect(result.events).toHaveLength(0)
      expect(result.totalCount).toBe(0)
    })

    it('should enforce rate limit between search requests', async () => {
      // 最初のリクエスト
      await service.searchEventsByKeyword('広島')

      // 2番目のリクエスト（レート制限により遅延されるはず）
      const secondRequestPromise = service.searchEventsByKeyword('東京')

      // タイマーを進める
      jest.advanceTimersByTime(5000)

      await secondRequestPromise

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('testApiKey', () => {
    it('should return true for valid API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results_returned: 0,
          results_available: 0,
          results_start: 1,
          events: [],
        }),
      } as Response)

      const isValid = await service.testApiKey()
      expect(isValid).toBe(true)
    })

    it('should return false for invalid API key', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      const isValid = await service.testApiKey()
      expect(isValid).toBe(false)
    })

    it('should return false for network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const isValid = await service.testApiKey()
      expect(isValid).toBe(false)
    })
  })

  describe('error handling with retry logic', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('should retry once on rate limit error and succeed', async () => {
      // First call returns 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response)

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => successResponse,
      } as Response)

      const result = await service.searchEventsByKeyword('test')

      expect(result.events).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should fail after retry on persistent rate limit error', async () => {
      // Both calls return 429
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response)

      await expect(service.searchEventsByKeyword('test')).rejects.toThrow(
        'connpass API rate limit exceeded after retry'
      )

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on authentication error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      await expect(service.searchEventsByKeyword('test')).rejects.toThrow(
        'connpass API authentication failed: Invalid API key'
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should not retry on other HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(service.searchEventsByKeyword('test')).rejects.toThrow(
        'connpass API request failed: 500 Internal Server Error'
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('ConnpassApiError properties', () => {
    it('should create ConnpassApiError with correct properties for authentication failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      try {
        await service.searchEventsByKeyword('test')
        fail('Expected ConnpassApiError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConnpassApiError)
        expect((error as ConnpassApiError).errorCode).toBe(
          'AUTHENTICATION_FAILED'
        )
        expect((error as ConnpassApiError).httpStatus).toBe(401)
        expect((error as ConnpassApiError).retryable).toBe(false)
        expect((error as ConnpassApiError).message).toContain(
          'authentication failed'
        )
      }
    })

    it('should create ConnpassApiError with correct properties for rate limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response)

      try {
        await service.searchEventsByKeyword('test')
        fail('Expected ConnpassApiError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConnpassApiError)
        expect((error as ConnpassApiError).errorCode).toBe(
          'RATE_LIMIT_EXCEEDED'
        )
        expect((error as ConnpassApiError).httpStatus).toBe(429)
        expect((error as ConnpassApiError).retryable).toBe(false)
      }
    })

    it('should create ConnpassApiError with correct properties for HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      try {
        await service.searchEventsByKeyword('test')
        fail('Expected ConnpassApiError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConnpassApiError)
        expect((error as ConnpassApiError).errorCode).toBe('HTTP_ERROR')
        expect((error as ConnpassApiError).httpStatus).toBe(500)
        expect((error as ConnpassApiError).retryable).toBe(false)
      }
    })
  })

  describe('presentation type inference edge cases', () => {
    const testCases = [
      {
        presentationType: 'slide',
        url: 'https://example.com/unknown',
        expectedType: 'slide',
        description: 'should prioritize presentation_type over URL inference',
      },
      {
        presentationType: 'video',
        url: 'https://speakerdeck.com/test',
        expectedType: 'video',
        description:
          'should use presentation_type even when URL suggests different type',
      },
      {
        presentationType: 'unknown_type',
        url: 'https://github.com/test',
        expectedType: 'document',
        description:
          'should fall back to URL inference for unknown presentation_type',
      },
      {
        presentationType: undefined,
        url: 'https://example.com/test.unknown',
        expectedType: 'other',
        description: 'should default to other for unknown URL patterns',
      },
    ]

    testCases.forEach(
      ({ presentationType, url, expectedType, description }) => {
        it(description, async () => {
          const mockResponse: ConnpassPresentationsResponse = {
            results_returned: 1,
            results_available: 1,
            results_start: 1,
            presentations: [
              {
                name: 'Test',
                url,
                presenter: { id: 1, nickname: 'test_user' },
                presentation_type: presentationType || 'slide',
                created_at: '2024-01-01T00:00:00Z',
                user: {},
              },
            ],
          }

          mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
          } as Response)

          const materials = await service.getPresentations('123')
          expect(materials[0].type).toBe(expectedType)
        })
      }
    )
  })

  describe('material conversion edge cases', () => {
    it('should handle missing presentation name', async () => {
      const mockResponse: ConnpassPresentationsResponse = {
        results_returned: 1,
        results_available: 1,
        results_start: 1,
        presentations: [
          {
            name: '',
            url: 'https://example.com/test',
            presenter: { id: 1, nickname: 'test_user' },
            presentation_type: 'slide',
            created_at: '2024-01-01T00:00:00Z',
            user: {},
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const materials = await service.getPresentations('123')
      expect(materials[0].title).toBe('Untitled Presentation')
    })

    it('should handle missing presenter information', async () => {
      const mockResponse: ConnpassPresentationsResponse = {
        results_returned: 1,
        results_available: 1,
        results_start: 1,
        presentations: [
          {
            name: 'Test Presentation',
            url: 'https://example.com/test',
            presenter: { id: 1, nickname: '' },
            presentation_type: 'slide',
            created_at: '2024-01-01T00:00:00Z',
            user: {},
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const materials = await service.getPresentations('123')
      expect(materials[0].presenterNickname).toBeUndefined()
    })

    it('should handle missing created_at timestamp', async () => {
      const mockResponse: ConnpassPresentationsResponse = {
        results_returned: 1,
        results_available: 1,
        results_start: 1,
        presentations: [
          {
            name: 'Test Presentation',
            url: 'https://example.com/test',
            presenter: { id: 1, nickname: 'test_user' },
            presentation_type: 'slide',
            created_at: '',
            user: {},
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const materials = await service.getPresentations('123')
      expect(materials[0].createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      )
    })
  })
})
