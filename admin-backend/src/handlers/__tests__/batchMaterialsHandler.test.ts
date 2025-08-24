import { ScheduledEvent, Context } from 'aws-lambda'
import {
  batchUpdateMaterials,
  manualBatchUpdate,
  getBatchStatistics,
} from '../batchMaterialsHandler'
import { DynamoDBService } from '../../services/DynamoDBService'
import { ConnpassApiService } from '../../services/ConnpassApiService'
import { SecretsManagerService } from '../../services/SecretsManagerService'
import { EventRecord, Material } from '../../types/EventMaterial'

// サービスのモック
jest.mock('../../services/DynamoDBService')
jest.mock('../../services/ConnpassApiService')
jest.mock('../../services/SecretsManagerService')

const MockDynamoDBService = DynamoDBService as jest.MockedClass<
  typeof DynamoDBService
>
const MockConnpassApiService = ConnpassApiService as jest.MockedClass<
  typeof ConnpassApiService
>
const MockSecretsManagerService = SecretsManagerService as jest.MockedClass<
  typeof SecretsManagerService
>

describe('batchMaterialsHandler', () => {
  let mockDynamoDBService: jest.Mocked<DynamoDBService>
  let mockConnpassApiService: jest.Mocked<ConnpassApiService>
  let mockSecretsManagerService: jest.Mocked<SecretsManagerService>

  const mockEvent: ScheduledEvent = {
    id: 'test-event-id',
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
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/batchUpdateMaterials',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 300000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }

  const mockEventRecord: EventRecord = {
    eventId: 'test-event-1',
    title: 'Test Event',
    eventDate: '2023-01-01T10:00:00Z',
    eventUrl: 'https://example.com/event/1',
    connpassUrl: 'https://connpass.com/event/123456/',
    status: 'approved',
    materials: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  }

  const mockMaterials: Material[] = [
    {
      id: 'material-1',
      title: 'Test Presentation',
      url: 'https://speakerdeck.com/test/presentation',
      type: 'slide',
      createdAt: '2023-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // DynamoDBService のモック
    mockDynamoDBService = {
      getApprovedEventsWithConnpassUrl: jest.fn(),
      upsertEventRecord: jest.fn(),
    } as any

    // ConnpassApiService のモック
    mockConnpassApiService = {
      testApiKey: jest.fn(),
      getPresentations: jest.fn(),
    } as any

    // SecretsManagerService のモック
    mockSecretsManagerService = {
      getConnpassApiKeyWithFallback: jest.fn(),
    } as any

    // コンストラクタのモック
    MockDynamoDBService.mockImplementation(() => mockDynamoDBService)
    MockConnpassApiService.mockImplementation(() => mockConnpassApiService)
    MockSecretsManagerService.mockImplementation(
      () => mockSecretsManagerService
    )

    // ConnpassApiService の静的メソッドのモック
    jest.spyOn(ConnpassApiService, 'extractEventIdFromUrl')
  })

  describe('batchUpdateMaterials', () => {
    beforeEach(() => {
      mockSecretsManagerService.getConnpassApiKeyWithFallback.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.testApiKey.mockResolvedValue(true)
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock).mockReturnValue(
        '123456'
      )
      mockConnpassApiService.getPresentations.mockResolvedValue(mockMaterials)
      mockDynamoDBService.upsertEventRecord.mockResolvedValue(mockEventRecord)
    })

    it('should successfully process events and update materials', async () => {
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue([
        mockEventRecord,
      ])

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Batch update completed',
        processedCount: 1,
        successCount: 1,
        errorCount: 0,
      })

      expect(
        mockSecretsManagerService.getConnpassApiKeyWithFallback
      ).toHaveBeenCalledTimes(1)
      expect(mockConnpassApiService.testApiKey).toHaveBeenCalledTimes(1)
      expect(
        mockDynamoDBService.getApprovedEventsWithConnpassUrl
      ).toHaveBeenCalledTimes(1)
      expect(ConnpassApiService.extractEventIdFromUrl).toHaveBeenCalledWith(
        mockEventRecord.connpassUrl
      )
      expect(mockConnpassApiService.getPresentations).toHaveBeenCalledWith(
        '123456'
      )
      expect(mockDynamoDBService.upsertEventRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockEventRecord,
          materials: mockMaterials,
          updatedAt: expect.any(String),
        })
      )
    })

    it('should handle no events to process', async () => {
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue([])

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'No events to process',
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
      })

      expect(mockConnpassApiService.getPresentations).not.toHaveBeenCalled()
      expect(mockDynamoDBService.upsertEventRecord).not.toHaveBeenCalled()
    })

    it('should handle invalid API key', async () => {
      mockConnpassApiService.testApiKey.mockResolvedValue(false)

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Batch update failed: connpass API key is invalid',
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
      })
    })

    it('should handle invalid connpass URL', async () => {
      const eventWithInvalidUrl = {
        ...mockEventRecord,
        connpassUrl: 'https://invalid-url.com',
      }
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue([
        eventWithInvalidUrl,
      ])
      ;(ConnpassApiService.extractEventIdFromUrl as jest.Mock).mockReturnValue(
        null
      )

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(500) // All events failed
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Batch update completed',
        processedCount: 1,
        successCount: 0,
        errorCount: 1,
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid connpass URL format'),
        ]),
      })

      expect(mockConnpassApiService.getPresentations).not.toHaveBeenCalled()
      expect(mockDynamoDBService.upsertEventRecord).not.toHaveBeenCalled()
    })

    it('should handle connpass API errors and continue processing', async () => {
      const events = [
        mockEventRecord,
        { ...mockEventRecord, eventId: 'test-event-2' },
      ]
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        events
      )

      // 最初のイベントでエラー、2番目は成功
      mockConnpassApiService.getPresentations
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(mockMaterials)

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(200) // Partial success
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Batch update completed',
        processedCount: 2,
        successCount: 1,
        errorCount: 1,
        errors: expect.arrayContaining([
          expect.stringContaining(
            'Failed to update materials for event test-event-1'
          ),
        ]),
      })

      expect(mockConnpassApiService.getPresentations).toHaveBeenCalledTimes(2)
      expect(mockDynamoDBService.upsertEventRecord).toHaveBeenCalledTimes(1)
    })

    it('should handle DynamoDB errors and continue processing', async () => {
      const events = [
        mockEventRecord,
        { ...mockEventRecord, eventId: 'test-event-2' },
      ]
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        events
      )

      // 最初のイベントでDynamoDB更新エラー、2番目は成功
      mockDynamoDBService.upsertEventRecord
        .mockRejectedValueOnce(new Error('DynamoDB error'))
        .mockResolvedValueOnce(mockEventRecord)

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(200) // Partial success
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Batch update completed',
        processedCount: 2,
        successCount: 1,
        errorCount: 1,
        errors: expect.arrayContaining([
          expect.stringContaining(
            'Failed to update materials for event test-event-1'
          ),
        ]),
      })
    })

    it('should handle secrets manager errors', async () => {
      mockSecretsManagerService.getConnpassApiKeyWithFallback.mockRejectedValue(
        new Error('Secrets Manager error')
      )

      const result = await batchUpdateMaterials(mockEvent, mockContext)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Batch update failed: Secrets Manager error',
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
      })
    })
  })

  describe('manualBatchUpdate', () => {
    it('should execute batch update with mock event and context', async () => {
      mockSecretsManagerService.getConnpassApiKeyWithFallback.mockResolvedValue(
        'test-api-key'
      )
      mockConnpassApiService.testApiKey.mockResolvedValue(true)
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue([])

      const result = await manualBatchUpdate()

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'No events to process',
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
      })
    })
  })

  describe('getBatchStatistics', () => {
    it('should return correct statistics', async () => {
      const eventsWithMaterials = [
        {
          ...mockEventRecord,
          materials: mockMaterials,
          updatedAt: '2023-01-02T00:00:00Z',
        },
      ]
      const eventsWithoutMaterials = [
        {
          ...mockEventRecord,
          eventId: 'event-2',
          materials: [],
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ]
      const allEvents = [...eventsWithMaterials, ...eventsWithoutMaterials]

      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue(
        allEvents
      )

      const statistics = await getBatchStatistics()

      expect(statistics).toEqual({
        totalEvents: 2,
        eventsWithMaterials: 1,
        eventsWithoutMaterials: 1,
        lastUpdateTime: '2023-01-02T00:00:00Z',
      })
    })

    it('should handle no events', async () => {
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockResolvedValue([])

      const statistics = await getBatchStatistics()

      expect(statistics).toEqual({
        totalEvents: 0,
        eventsWithMaterials: 0,
        eventsWithoutMaterials: 0,
        lastUpdateTime: undefined,
      })
    })

    it('should handle DynamoDB errors', async () => {
      mockDynamoDBService.getApprovedEventsWithConnpassUrl.mockRejectedValue(
        new Error('DynamoDB error')
      )

      await expect(getBatchStatistics()).rejects.toThrow('DynamoDB error')
    })
  })
})
