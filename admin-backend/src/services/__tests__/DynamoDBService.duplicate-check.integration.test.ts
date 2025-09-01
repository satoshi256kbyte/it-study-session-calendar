import { DynamoDBService } from '../DynamoDBService'
import { ConnpassEventData } from '../../types/EventMaterial'

// Integration test for duplicate check functionality
// This test uses real DynamoDB operations (mocked at the AWS SDK level)

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

describe('DynamoDBService - Duplicate Check Integration', () => {
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

  describe('Duplicate check and creation workflow', () => {
    it('should successfully create new event when no duplicate exists', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'New Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
        ended_at: '2024-01-15T12:00:00+09:00',
      }

      // Mock: No existing event found
      mockSend.mockResolvedValueOnce({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      })

      // Mock: Successful creation
      mockSend.mockResolvedValueOnce({})

      // Act
      const exists = await service.checkEventExists(connpassEventData.event_url)
      let createdSession = null

      if (!exists) {
        createdSession =
          await service.createStudySessionFromConnpass(connpassEventData)
      }

      // Assert
      expect(exists).toBe(false)
      expect(createdSession).not.toBeNull()
      expect(createdSession?.title).toBe('New Event')
      expect(createdSession?.url).toBe('https://connpass.com/event/12345/')
      expect(createdSession?.status).toBe('pending')

      // Verify DynamoDB operations
      expect(mockSend).toHaveBeenCalledTimes(2)

      // First call: check existence
      expect(mockSend).toHaveBeenNthCalledWith(1, {
        params: {
          TableName: 'test-table',
          FilterExpression: '#url = :eventUrl',
          ExpressionAttributeNames: {
            '#url': 'url',
          },
          ExpressionAttributeValues: {
            ':eventUrl': 'https://connpass.com/event/12345/',
          },
        },
      })

      // Second call: create session
      expect(mockSend).toHaveBeenNthCalledWith(2, {
        params: {
          TableName: 'test-table',
          Item: expect.objectContaining({
            title: 'New Event',
            url: 'https://connpass.com/event/12345/',
            status: 'pending',
          }),
        },
      })
    })

    it('should skip creation when duplicate exists', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Duplicate Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      // Mock: Existing event found
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            id: 'existing-id',
            title: 'Existing Event',
            url: 'https://connpass.com/event/12345/',
            status: 'approved',
          },
        ],
        Count: 1,
        ScannedCount: 1,
      })

      // Act
      const exists = await service.checkEventExists(connpassEventData.event_url)
      let createdSession = null

      if (!exists) {
        createdSession =
          await service.createStudySessionFromConnpass(connpassEventData)
      }

      // Assert
      expect(exists).toBe(true)
      expect(createdSession).toBeNull()

      // Verify only one DynamoDB operation (check existence)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should handle error during duplicate check gracefully', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Error Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      // Mock: DynamoDB error during check
      const dbError = new Error('DynamoDB connection error')
      mockSend.mockRejectedValueOnce(dbError)

      // Act & Assert
      await expect(
        service.checkEventExists(connpassEventData.event_url)
      ).rejects.toThrow(
        'Failed to check event existence: DynamoDB connection error'
      )

      // Verify only one DynamoDB operation attempted
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should handle error during creation gracefully', async () => {
      // Arrange
      const connpassEventData: ConnpassEventData = {
        event_id: 12345,
        title: 'Creation Error Event',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      // Mock: No existing event found
      mockSend.mockResolvedValueOnce({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      })

      // Mock: Creation error
      const createError = new Error('DynamoDB put error')
      mockSend.mockRejectedValueOnce(createError)

      // Act
      const exists = await service.checkEventExists(connpassEventData.event_url)

      // Assert
      expect(exists).toBe(false)

      // Creation should throw error
      await expect(
        service.createStudySessionFromConnpass(connpassEventData)
      ).rejects.toThrow(
        'Failed to create study session from connpass data: DynamoDB put error'
      )

      // Verify both DynamoDB operations attempted
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple events with different URLs correctly', async () => {
      // Arrange
      const event1: ConnpassEventData = {
        event_id: 12345,
        title: 'Event 1',
        event_url: 'https://connpass.com/event/12345/',
        started_at: '2024-01-15T10:00:00+09:00',
      }

      const event2: ConnpassEventData = {
        event_id: 67890,
        title: 'Event 2',
        event_url: 'https://connpass.com/event/67890/',
        started_at: '2024-01-16T10:00:00+09:00',
      }

      // Mock: Event 1 doesn't exist
      mockSend.mockResolvedValueOnce({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      })

      // Mock: Event 1 creation success
      mockSend.mockResolvedValueOnce({})

      // Mock: Event 2 exists
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            id: 'existing-id-2',
            title: 'Existing Event 2',
            url: 'https://connpass.com/event/67890/',
          },
        ],
        Count: 1,
        ScannedCount: 1,
      })

      // Act
      const exists1 = await service.checkEventExists(event1.event_url)
      let created1 = null
      if (!exists1) {
        created1 = await service.createStudySessionFromConnpass(event1)
      }

      const exists2 = await service.checkEventExists(event2.event_url)
      let created2 = null
      if (!exists2) {
        created2 = await service.createStudySessionFromConnpass(event2)
      }

      // Assert
      expect(exists1).toBe(false)
      expect(created1).not.toBeNull()
      expect(created1?.title).toBe('Event 1')

      expect(exists2).toBe(true)
      expect(created2).toBeNull()

      // Verify correct number of DynamoDB operations
      expect(mockSend).toHaveBeenCalledTimes(3) // check1, create1, check2
    })
  })
})
