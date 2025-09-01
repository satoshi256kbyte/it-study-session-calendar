import { DynamoDBService, DynamoDBError } from '../DynamoDBService'
import { ConnpassEventData } from '../../types/EventMaterial'
import { StudySession } from '../../types/StudySession'

// DynamoDBDocumentClientのモック
const mockSend = jest.fn()
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend,
    })),
  },
  ScanCommand: jest.fn(params => ({ params })),
  PutCommand: jest.fn(params => ({ params })),
}))

// AWS SDK v3のモック
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}))

// loggerのモック
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    getLogLevel: jest.fn(() => 3),
  },
}))

describe('DynamoDBService - Duplicate Check Functionality', () => {
  let service: DynamoDBService
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      STUDY_SESSIONS_TABLE_NAME: 'test-table',
    }
    service = new DynamoDBService()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('checkEventExists', () => {
    it('should return true when event with URL exists', async () => {
      // Arrange
      const eventUrl = 'https://connpass.com/event/12345/'
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            id: 'existing-id',
            title: 'Existing Event',
            url: eventUrl,
          },
        ],
        Count: 1,
        ScannedCount: 1,
      })

      // Act
      const result = await service.checkEventExists(eventUrl)

      // Assert
      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledWith({
        params: {
          TableName: 'test-table',
          FilterExpression: '#url = :eventUrl',
          ExpressionAttributeNames: {
            '#url': 'url',
          },
          ExpressionAttributeValues: {
            ':eventUrl': eventUrl,
          },
        },
      })
    })

    it('should return false when event with URL does not exist', async () => {
      // Arrange
      const eventUrl = 'https://connpass.com/event/99999/'
      mockSend.mockResolvedValueOnce({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      })

      // Act
      const result = await service.checkEventExists(eventUrl)

      // Assert
      expect(result).toBe(false)
    })

    it('should throw error when DynamoDB operation fails', async () => {
      // Arrange
      const eventUrl = 'https://connpass.com/event/12345/'
      const dbError = new Error('DynamoDB error')
      mockSend.mockRejectedValueOnce(dbError)

      // Act & Assert
      await expect(service.checkEventExists(eventUrl)).rejects.toThrow(
        'Failed to check event existence: DynamoDB error'
      )
    })

    it('should handle undefined Items in response', async () => {
      // Arrange
      const eventUrl = 'https://connpass.com/event/12345/'
      mockSend.mockResolvedValueOnce({
        Count: 0,
        ScannedCount: 0,
      })

      // Act
      const result = await service.checkEventExists(eventUrl)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('createStudySessionFromConnpass', () => {
    it('should create StudySession from ConnpassEventData with all fields', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Test Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
        ended_at: '2024-01-15T12:00:00+09:00',
        description: 'Test description',
      }

      mockSend.mockResolvedValueOnce({})

      // Mock Date.now() for consistent ID generation
      const mockNow = '2024-01-01T00:00:00.000Z'
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockNow)

      // Act
      const result =
        await service.createStudySessionFromConnpass(connpassEventData)

      // Assert
      expect(result).toEqual({
        id: expect.any(String),
        title: 'Test Event',
        url: 'https://connpass.com/event/12345/',
        datetime: '2024-01-15T10:00:00+09:00',
        endDatetime: '2024-01-15T12:00:00+09:00',
        contact: undefined,
        status: 'pending',
        createdAt: mockNow,
        updatedAt: mockNow,
      })

      // Verify ID is generated correctly (timestamp + random string)
      expect(result.id).toMatch(/^\d+[a-z0-9]+$/)

      expect(mockSend).toHaveBeenCalledWith({
        params: {
          TableName: 'test-table',
          Item: expect.objectContaining({
            title: 'Test Event',
            url: 'https://connpass.com/event/12345/',
            status: 'pending',
          }),
        },
      })
    })

    it('should create StudySession from ConnpassEventData with minimal fields', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Minimal Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      mockSend.mockResolvedValueOnce({})

      const mockNow = '2024-01-01T00:00:00.000Z'
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockNow)

      // Act
      const result =
        await service.createStudySessionFromConnpass(connpassEventData)

      // Assert
      expect(result).toEqual({
        id: expect.any(String),
        title: 'Minimal Event',
        url: 'https://connpass.com/event/12345/',
        datetime: '2024-01-15T10:00:00+09:00',
        endDatetime: undefined,
        contact: undefined,
        status: 'pending',
        createdAt: mockNow,
        updatedAt: mockNow,
      })

      // Verify ID is generated correctly (timestamp + random string)
      expect(result.id).toMatch(/^\d+[a-z0-9]+$/)
    })

    it('should throw error when DynamoDB put operation fails', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Test Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      const dbError = new Error('DynamoDB put error')
      mockSend.mockRejectedValueOnce(dbError)

      // Act & Assert
      await expect(
        service.createStudySessionFromConnpass(connpassEventData)
      ).rejects.toThrow(
        'Failed to create study session from connpass data: DynamoDB put error'
      )
    })

    it('should set status to pending for admin approval', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Test Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      mockSend.mockResolvedValueOnce({})

      // Act
      const result =
        await service.createStudySessionFromConnpass(connpassEventData)

      // Assert
      expect(result.status).toBe('pending')
    })

    it('should set createdAt and updatedAt to current timestamp', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Test Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      mockSend.mockResolvedValueOnce({})

      const mockNow = '2024-01-01T00:00:00.000Z'
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockNow)

      // Act
      const result =
        await service.createStudySessionFromConnpass(connpassEventData)

      // Assert
      expect(result.createdAt).toBe(mockNow)
      expect(result.updatedAt).toBe(mockNow)
    })

    it('should generate unique IDs for different events', async () => {
      // Arrange
      const connpassEventData1: ConnpassEventData = {
        event_id: 12345,
        title: 'Test Event 1',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      const connpassEventData2: ConnpassEventData = {
        event_id: 67890,
        title: 'Test Event 2',
        event_url: 'https://connpass.com/event/67890/',
        started_at: '2024-01-16T10:00:00+09:00',
      }

      mockSend.mockResolvedValue({})

      // Act
      const result1 =
        await service.createStudySessionFromConnpass(connpassEventData1)
      const result2 =
        await service.createStudySessionFromConnpass(connpassEventData2)

      // Assert
      expect(result1.id).not.toBe(result2.id)
      expect(result1.id).toMatch(/^\d+[a-z0-9]+$/)
      expect(result2.id).toMatch(/^\d+[a-z0-9]+$/)
    })

    it('should throw DynamoDBError with correct properties on failure', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Test Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      const originalError = new Error('DynamoDB put error')
      mockSend.mockRejectedValueOnce(originalError)

      // Act & Assert
      try {
        await service.createStudySessionFromConnpass(connpassEventData)
        fail('Expected DynamoDBError to be thrown')
      } catch (error) {
        expect((error as DynamoDBError).name).toBe('DynamoDBError')
        expect((error as DynamoDBError).errorCode).toBe('CREATE_SESSION_FAILED')
        expect((error as DynamoDBError).operation).toBe(
          'createStudySessionFromConnpass'
        )
        expect((error as DynamoDBError).originalError).toBe(originalError)
        expect((error as DynamoDBError).message).toContain(
          'Failed to create study session from connpass data'
        )
      }
    })

    it('should throw DynamoDBError with correct properties on checkEventExists failure', async () => {
      // Arrange
      const eventUrl = 'https://connpass.com/event/12345/'
      const originalError = new Error('DynamoDB scan error')
      mockSend.mockRejectedValueOnce(originalError)

      // Act & Assert
      try {
        await service.checkEventExists(eventUrl)
        fail('Expected DynamoDBError to be thrown')
      } catch (error) {
        expect((error as DynamoDBError).name).toBe('DynamoDBError')
        expect((error as DynamoDBError).errorCode).toBe(
          'DUPLICATE_CHECK_FAILED'
        )
        expect((error as DynamoDBError).operation).toBe('checkEventExists')
        expect((error as DynamoDBError).originalError).toBe(originalError)
        expect((error as DynamoDBError).message).toContain(
          'Failed to check event existence'
        )
      }
    })

    it('should handle edge case URLs correctly', async () => {
      const edgeCaseUrls = [
        'https://connpass.com/event/1/',
        'https://connpass.com/event/999999999/',
        'https://subdomain.connpass.com/event/12345/',
        'https://connpass.com/event/12345', // Without trailing slash
      ]

      for (const url of edgeCaseUrls) {
        mockSend.mockResolvedValueOnce({
          Items: [],
          Count: 0,
          ScannedCount: 0,
        })

        const result = await service.checkEventExists(url)
        expect(result).toBe(false)

        expect(mockSend).toHaveBeenCalledWith({
          params: {
            TableName: 'test-table',
            FilterExpression: '#url = :eventUrl',
            ExpressionAttributeNames: {
              '#url': 'url',
            },
            ExpressionAttributeValues: {
              ':eventUrl': url,
            },
          },
        })
      }
    })

    it('should handle multiple items with same URL (edge case)', async () => {
      // Arrange - This shouldn't happen in practice but test the edge case
      const eventUrl = 'https://connpass.com/event/12345/'
      mockSend.mockResolvedValueOnce({
        Items: [
          { id: 'id1', title: 'Event 1', url: eventUrl },
          { id: 'id2', title: 'Event 2', url: eventUrl }, // Duplicate (shouldn't happen)
        ],
        Count: 2,
        ScannedCount: 2,
      })

      // Act
      const result = await service.checkEventExists(eventUrl)

      // Assert - Should still return true if any items exist
      expect(result).toBe(true)
    })

    it('should preserve all connpass event data fields during conversion', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Complete Event Data',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
        ended_at: '2024-01-15T12:00:00+09:00',
        description: 'This is a test event with all fields',
      }

      mockSend.mockResolvedValueOnce({})

      // Act
      const result =
        await service.createStudySessionFromConnpass(connpassEventData)

      // Assert - Verify all relevant fields are preserved
      expect(result.title).toBe(connpassEventData.title)
      expect(result.url).toBe(connpassEventData.event_url)
      expect(result.datetime).toBe(connpassEventData.started_at)
      expect(result.endDatetime).toBe(connpassEventData.ended_at)
      expect(result.contact).toBeUndefined() // Should not be set from connpass data
      expect(result.status).toBe('pending')
    })
  })
})
