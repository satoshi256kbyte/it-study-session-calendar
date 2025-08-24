import { ConnpassApiService } from '../ConnpassApiService'
import {
  Material,
  ConnpassPresentationsResponse,
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
          title: 'Test Presentation 1',
          url: 'https://speakerdeck.com/test/presentation1',
          thumbnail_url: 'https://example.com/thumb1.jpg',
        },
        {
          title: 'Test Presentation 2',
          url: 'https://github.com/test/repo',
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
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        type: 'slide',
      })
      expect(materials[1]).toMatchObject({
        title: 'Test Presentation 2',
        url: 'https://github.com/test/repo',
        type: 'document',
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
          presentations: [{ title: 'Test', url }],
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
})
