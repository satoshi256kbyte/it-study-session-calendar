import {
  validateISODateTime,
  convertToISODateTime,
  validateConnpassUrl,
  convertConnpassEventToStudySessionRequest,
  convertMultipleConnpassEvents,
  isFutureEvent,
  isWithinDateRange,
} from '../connpassDataConverter'
import { ConnpassEventData } from '../../types/EventMaterial'
import { CreateStudySessionRequest } from '../../types/StudySession'
import { logger } from '../logger'

// loggerのモック
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('connpassDataConverter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateISODateTime', () => {
    it('should return true for valid ISO 8601 datetime strings', () => {
      const validDates = [
        '2024-01-15T10:00:00Z',
        '2024-01-15T10:00:00+09:00',
        '2024-01-15T10:00:00-05:00',
        '2024-01-15T10:00:00.123Z',
        '2024-01-15T10:00:00.123+09:00',
        '2024-12-31T23:59:59Z',
      ]

      validDates.forEach(date => {
        expect(validateISODateTime(date)).toBe(true)
      })
    })

    it('should return false for invalid datetime strings', () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01T10:00:00Z', // Invalid month
        '2024-01-32T10:00:00Z', // Invalid day
        '2024-01-15T25:00:00Z', // Invalid hour
        '2024-01-15T10:60:00Z', // Invalid minute
        '2024-01-15T10:00:60Z', // Invalid second
        '2024-01-15 10:00:00', // Missing T separator
        '2024/01/15T10:00:00Z', // Wrong date separator
        '',
        null as any,
        undefined as any,
      ]

      invalidDates.forEach(date => {
        expect(validateISODateTime(date)).toBe(false)
      })
    })

    it('should handle edge cases gracefully', () => {
      expect(validateISODateTime('2024-02-29T10:00:00Z')).toBe(true) // Leap year
      // Note: JavaScript Date constructor is lenient and converts 2023-02-29 to 2023-03-01
      // So this test checks that the regex validation works correctly
      expect(validateISODateTime('2023-02-29T10:00:00Z')).toBe(true) // Still valid ISO format, even if date doesn't exist
    })
  })

  describe('convertToISODateTime', () => {
    it('should convert valid date strings to ISO format', () => {
      // Test with timezone-aware input
      const result1 = convertToISODateTime('2024-01-15T10:00:00+09:00')
      expect(result1).toBe('2024-01-15T01:00:00.000Z') // Converted to UTC

      // Test with local time input (result depends on system timezone)
      const result2 = convertToISODateTime('2024-01-15 10:00:00')
      expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should throw error for invalid date strings', () => {
      const invalidDates = [
        'invalid-date',
        '2024-13-01T10:00:00Z',
        '',
        'not-a-date',
      ]

      invalidDates.forEach(date => {
        expect(() => convertToISODateTime(date)).toThrow(
          `Date conversion failed: ${date}`
        )
      })
    })

    it('should log error for conversion failures', () => {
      const invalidDate = 'invalid-date'

      expect(() => convertToISODateTime(invalidDate)).toThrow()
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to convert date to ISO format: ${invalidDate}`,
        expect.any(Error)
      )
    })
  })

  describe('validateConnpassUrl', () => {
    it('should return true for valid connpass URLs', () => {
      const validUrls = [
        'https://connpass.com/event/123456/',
        'https://connpass.com/event/123456',
        'https://hiroshima-it.connpass.com/event/789012/',
        'https://tokyo-js.connpass.com/event/999999',
      ]

      validUrls.forEach(url => {
        expect(validateConnpassUrl(url)).toBe(true)
      })
    })

    it('should return false for invalid connpass URLs', () => {
      const invalidUrls = [
        'https://example.com/event/123456/',
        'https://connpass.com/group/123/',
        'https://connpass.com/event/abc/',
        'https://connpass.com/event/',
        'https://connpass.com/',
        'invalid-url',
        '',
        'https://not-connpass.com/event/123456/',
        'http://connpass.com/event/111111/', // HTTP not allowed for security
      ]

      invalidUrls.forEach(url => {
        expect(validateConnpassUrl(url)).toBe(false)
      })
    })

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'ftp://connpass.com/event/123/', // FTP not allowed
        'http://connpass.com/event/123/', // HTTP not allowed for security
      ]

      malformedUrls.forEach(url => {
        expect(validateConnpassUrl(url)).toBe(false)
      })

      // This should actually be valid since it contains /event/123/ and uses HTTPS
      expect(
        validateConnpassUrl('https://connpass.com/event/123/extra/path')
      ).toBe(true)
    })
  })

  describe('convertConnpassEventToStudySessionRequest', () => {
    it('should convert valid connpass event data successfully', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: '広島IT勉強会 #1',
        event_url: 'https://hiroshima-it.connpass.com/event/123456/',
        started_at: '2024-01-15T19:00:00+09:00',
        ended_at: '2024-01-15T21:00:00+09:00',
        description: 'テスト用の勉強会です',
      }

      const result = convertConnpassEventToStudySessionRequest(eventData)

      expect(result).toEqual({
        title: '広島IT勉強会 #1',
        url: 'https://hiroshima-it.connpass.com/event/123456/',
        datetime: '2024-01-15T19:00:00+09:00',
        endDatetime: '2024-01-15T21:00:00+09:00',
        contact: undefined,
      })
    })

    it('should convert event data with minimal required fields', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: '最小限のイベント',
        event_url: 'https://connpass.com/event/123456/',
        started_at: '2024-01-15T19:00:00+09:00',
      }

      const result = convertConnpassEventToStudySessionRequest(eventData)

      expect(result).toEqual({
        title: '最小限のイベント',
        url: 'https://connpass.com/event/123456/',
        datetime: '2024-01-15T19:00:00+09:00',
        endDatetime: undefined,
        contact: undefined,
      })
    })

    it('should convert non-ISO datetime strings', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: 'テストイベント',
        event_url: 'https://connpass.com/event/123456/',
        started_at: '2024-01-15 19:00:00', // Non-ISO format
        ended_at: '2024-01-15 21:00:00', // Non-ISO format
      }

      const result = convertConnpassEventToStudySessionRequest(eventData)

      // The actual conversion depends on the local timezone, so we just check the format
      expect(result.datetime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
      expect(result.endDatetime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
    })

    it('should throw error for missing required fields', () => {
      const testCases = [
        {
          data: {
            event_id: 123456,
            // title missing
            event_url: 'https://connpass.com/event/123456/',
            started_at: '2024-01-15T19:00:00+09:00',
          } as ConnpassEventData,
          description: 'missing title',
        },
        {
          data: {
            event_id: 123456,
            title: 'テストイベント',
            // event_url missing
            started_at: '2024-01-15T19:00:00+09:00',
          } as ConnpassEventData,
          description: 'missing event_url',
        },
        {
          data: {
            event_id: 123456,
            title: 'テストイベント',
            event_url: 'https://connpass.com/event/123456/',
            // started_at missing
          } as ConnpassEventData,
          description: 'missing started_at',
        },
      ]

      testCases.forEach(({ data, description }) => {
        expect(() => convertConnpassEventToStudySessionRequest(data)).toThrow(
          'Missing required fields in connpass event data'
        )
      })
    })

    it('should throw error for invalid connpass URL', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: 'テストイベント',
        event_url: 'https://example.com/event/123456/', // Invalid URL
        started_at: '2024-01-15T19:00:00+09:00',
      }

      expect(() =>
        convertConnpassEventToStudySessionRequest(eventData)
      ).toThrow('Invalid connpass URL: https://example.com/event/123456/')
    })

    it('should throw error for invalid datetime format', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: 'テストイベント',
        event_url: 'https://connpass.com/event/123456/',
        started_at: 'invalid-date',
      }

      expect(() =>
        convertConnpassEventToStudySessionRequest(eventData)
      ).toThrow('Date conversion failed: invalid-date')
    })

    it('should log debug information during conversion', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: 'テストイベント',
        event_url: 'https://connpass.com/event/123456/',
        started_at: '2024-01-15T19:00:00+09:00',
      }

      convertConnpassEventToStudySessionRequest(eventData)

      expect(logger.debug).toHaveBeenCalledWith(
        'Converting connpass event to StudySession request: テストイベント'
      )
      expect(logger.debug).toHaveBeenCalledWith(
        'Successfully converted connpass event: テストイベント'
      )
    })

    it('should log error information on conversion failure', () => {
      const eventData: ConnpassEventData = {
        event_id: 123456,
        title: 'テストイベント',
        event_url: 'https://example.com/invalid/', // Invalid URL
        started_at: '2024-01-15T19:00:00+09:00',
      }

      expect(() =>
        convertConnpassEventToStudySessionRequest(eventData)
      ).toThrow()
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to convert connpass event: テストイベント',
        expect.any(Error)
      )
    })
  })

  describe('convertMultipleConnpassEvents', () => {
    it('should convert multiple valid events successfully', () => {
      const events: ConnpassEventData[] = [
        {
          event_id: 1,
          title: 'イベント1',
          event_url: 'https://connpass.com/event/1/',
          started_at: '2024-01-15T19:00:00+09:00',
        },
        {
          event_id: 2,
          title: 'イベント2',
          event_url: 'https://connpass.com/event/2/',
          started_at: '2024-01-16T19:00:00+09:00',
        },
      ]

      const result = convertMultipleConnpassEvents(events)

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
      expect(result.successful[0].title).toBe('イベント1')
      expect(result.successful[1].title).toBe('イベント2')
    })

    it('should handle mixed valid and invalid events', () => {
      const events: ConnpassEventData[] = [
        {
          event_id: 1,
          title: 'Valid Event',
          event_url: 'https://connpass.com/event/1/',
          started_at: '2024-01-15T19:00:00+09:00',
        },
        {
          event_id: 2,
          title: 'Invalid Event',
          event_url: 'https://example.com/invalid/', // Invalid URL
          started_at: '2024-01-16T19:00:00+09:00',
        },
        {
          event_id: 3,
          title: 'Another Valid Event',
          event_url: 'https://connpass.com/event/3/',
          started_at: '2024-01-17T19:00:00+09:00',
        },
      ]

      const result = convertMultipleConnpassEvents(events)

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.successful[0].title).toBe('Valid Event')
      expect(result.successful[1].title).toBe('Another Valid Event')
      expect(result.failed[0].event.title).toBe('Invalid Event')
      expect(result.failed[0].error).toContain('Invalid connpass URL')
    })

    it('should handle empty events array', () => {
      const result = convertMultipleConnpassEvents([])

      expect(result.successful).toHaveLength(0)
      expect(result.failed).toHaveLength(0)
    })

    it('should log conversion progress', () => {
      const events: ConnpassEventData[] = [
        {
          event_id: 1,
          title: 'テストイベント',
          event_url: 'https://connpass.com/event/1/',
          started_at: '2024-01-15T19:00:00+09:00',
        },
      ]

      convertMultipleConnpassEvents(events)

      expect(logger.debug).toHaveBeenCalledWith('Converting 1 connpass events')
      expect(logger.debug).toHaveBeenCalledWith(
        'Conversion completed: 1 successful, 0 failed'
      )
    })

    it('should log warnings for failed conversions', () => {
      const events: ConnpassEventData[] = [
        {
          event_id: 1,
          title: 'Invalid Event',
          event_url: 'https://example.com/invalid/',
          started_at: '2024-01-15T19:00:00+09:00',
        },
      ]

      convertMultipleConnpassEvents(events)

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to convert event Invalid Event')
      )
    })
  })

  describe('isFutureEvent', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1) // Tomorrow

      const result = isFutureEvent(futureDate.toISOString())
      expect(result).toBe(true)
    })

    it('should return false for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1) // Yesterday

      const result = isFutureEvent(pastDate.toISOString())
      expect(result).toBe(false)
    })

    it('should handle invalid date strings gracefully', () => {
      const result = isFutureEvent('invalid-date')
      expect(result).toBe(false)
      // Note: JavaScript Date constructor doesn't throw for invalid strings,
      // it just creates an invalid Date object, so no debug log is called
    })
  })

  describe('isWithinDateRange', () => {
    it('should return true for dates within range', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const testDate = '2024-01-15T10:00:00Z'

      const result = isWithinDateRange(testDate, startDate, endDate)
      expect(result).toBe(true)
    })

    it('should return false for dates outside range', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const testDate = '2024-02-15T10:00:00Z' // Outside range

      const result = isWithinDateRange(testDate, startDate, endDate)
      expect(result).toBe(false)
    })

    it('should return true for dates exactly at range boundaries', () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-31T23:59:59Z')

      expect(
        isWithinDateRange('2024-01-01T00:00:00Z', startDate, endDate)
      ).toBe(true)
      expect(
        isWithinDateRange('2024-01-31T23:59:59Z', startDate, endDate)
      ).toBe(true)
    })

    it('should handle invalid date strings gracefully', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = isWithinDateRange('invalid-date', startDate, endDate)
      expect(result).toBe(false)
      // Note: JavaScript Date constructor doesn't throw for invalid strings,
      // it just creates an invalid Date object, so no debug log is called
    })
  })
})
