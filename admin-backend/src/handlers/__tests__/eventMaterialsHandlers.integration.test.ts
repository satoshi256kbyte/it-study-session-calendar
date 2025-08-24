import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { EventWithMaterials, EventRecord } from '../../types/EventMaterial'

// Mock functions - must be declared before jest.mock calls
const mockQueryEventsByDateRange = jest.fn()
const mockGetEventsWithMaterials = jest.fn()

// Mock AWS services
jest.mock('../../services/DynamoDBService', () => ({
  DynamoDBService: jest.fn().mockImplementation(() => ({
    queryEventsByDateRange: mockQueryEventsByDateRange,
    getEventsWithMaterials: mockGetEventsWithMaterials,
  })),
}))

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    getLogLevel: jest.fn().mockReturnValue(3), // DEBUG level for integration tests
  },
}))

// Import after mocks are set up
import { getEventMaterials } from '../eventMaterialsHandlers'

describe('Event Materials Handlers Integration Tests', () => {
  let mockContext: Context

  const mockEventRecords: EventRecord[] = [
    {
      eventId: 'event-1',
      title: 'TypeScript勉強会 - 基礎から応用まで',
      eventDate: '2024-01-15T10:00:00Z',
      eventUrl: 'https://example.com/event-1',
      connpassUrl: 'https://connpass.com/event/123/',
      status: 'approved',
      materials: [
        {
          id: 'material-1',
          title: 'TypeScript基礎講座',
          url: 'https://speakerdeck.com/user/typescript-basics',
          type: 'slide',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'material-2',
          title: 'TypeScript実践テクニック',
          url: 'https://docs.google.com/presentation/d/typescript-advanced',
          type: 'slide',
          thumbnailUrl:
            'https://example.com/thumbnails/typescript-advanced.png',
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      eventId: 'event-2',
      title: 'React Hooks完全ガイド',
      eventDate: '2024-02-20T14:00:00Z',
      eventUrl: 'https://example.com/event-2',
      connpassUrl: 'https://connpass.com/event/456/',
      status: 'approved',
      materials: [
        {
          id: 'material-3',
          title: 'React Hooks入門',
          url: 'https://speakerdeck.com/user/react-hooks-intro',
          type: 'slide',
          createdAt: '2024-02-20T14:00:00Z',
        },
        {
          id: 'material-4',
          title: 'カスタムHooksの作り方',
          url: 'https://github.com/user/custom-hooks-examples',
          type: 'document',
          createdAt: '2024-02-20T14:30:00Z',
        },
      ],
      createdAt: '2024-02-15T10:00:00Z',
      updatedAt: '2024-02-20T14:00:00Z',
    },
    {
      eventId: 'event-3',
      title: 'Vue.js勉強会',
      eventDate: '2024-03-10T13:00:00Z',
      eventUrl: 'https://example.com/event-3',
      connpassUrl: 'https://connpass.com/event/789/',
      status: 'approved',
      materials: [], // 資料なし - フィルタリングされるべき
      createdAt: '2024-03-05T10:00:00Z',
      updatedAt: '2024-03-10T13:00:00Z',
    },
    {
      eventId: 'event-4',
      title: 'Angular勉強会',
      eventDate: '2024-04-15T15:00:00Z',
      eventUrl: 'https://example.com/event-4',
      connpassUrl: '', // connpass URLなし - フィルタリングされるべき
      status: 'approved',
      materials: [
        {
          id: 'material-5',
          title: 'Angular基礎',
          url: 'https://example.com/angular-basics',
          type: 'slide',
          createdAt: '2024-04-15T15:00:00Z',
        },
      ],
      createdAt: '2024-04-10T10:00:00Z',
      updatedAt: '2024-04-15T15:00:00Z',
    },
  ]

  const expectedFilteredEvents: EventWithMaterials[] = [
    {
      id: 'event-1',
      title: 'TypeScript勉強会 - 基礎から応用まで',
      eventDate: '2024-01-15T10:00:00Z',
      eventUrl: 'https://example.com/event-1',
      connpassUrl: 'https://connpass.com/event/123/',
      materials: [
        {
          id: 'material-1',
          title: 'TypeScript基礎講座',
          url: 'https://speakerdeck.com/user/typescript-basics',
          type: 'slide',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'material-2',
          title: 'TypeScript実践テクニック',
          url: 'https://docs.google.com/presentation/d/typescript-advanced',
          type: 'slide',
          thumbnailUrl:
            'https://example.com/thumbnails/typescript-advanced.png',
          createdAt: '2024-01-15T10:30:00Z',
        },
      ],
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'event-2',
      title: 'React Hooks完全ガイド',
      eventDate: '2024-02-20T14:00:00Z',
      eventUrl: 'https://example.com/event-2',
      connpassUrl: 'https://connpass.com/event/456/',
      materials: [
        {
          id: 'material-3',
          title: 'React Hooks入門',
          url: 'https://speakerdeck.com/user/react-hooks-intro',
          type: 'slide',
          createdAt: '2024-02-20T14:00:00Z',
        },
        {
          id: 'material-4',
          title: 'カスタムHooksの作り方',
          url: 'https://github.com/user/custom-hooks-examples',
          type: 'document',
          createdAt: '2024-02-20T14:30:00Z',
        },
      ],
      createdAt: '2024-02-15T10:00:00Z',
      updatedAt: '2024-02-20T14:00:00Z',
    },
  ]

  const createMockEvent = (
    queryStringParameters?: Record<string, string> | null
  ): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/api/events/materials',
    pathParameters: null,
    queryStringParameters: queryStringParameters || null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      path: '/api/events/materials',
      stage: 'test',
      requestId: 'test-request-id',
      requestTime: '2024-12-20T10:00:00Z',
      requestTimeEpoch: 1703073600000,
      identity: {
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        sourceIp: '127.0.0.1',
        principalOrgId: null,
        accessKey: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: 'test-agent',
        user: null,
        apiKey: null,
        apiKeyId: null,
        clientCert: null,
      },
      authorizer: null,
      resourceId: 'test-resource',
      resourcePath: '/api/events/materials',
    },
    resource: '/api/events/materials',
  })

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn:
        'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/12/20/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    }
  })

  describe('getEventMaterials Integration', () => {
    it('should successfully filter and return connpass events with materials', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue(expectedFilteredEvents)
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - DynamoDB service call
      expect(mockGetEventsWithMaterials).toHaveBeenCalledWith(6)
      expect(mockGetEventsWithMaterials).toHaveBeenCalledTimes(1)

      // Assert - Response
      expect(result.statusCode).toBe(200)
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': '*',
        'Access-Control-Max-Age': '3600',
      })

      const response = JSON.parse(result.body)
      expect(response.count).toBe(2)
      expect(response.total).toBe(2)
      expect(response.events).toEqual(expectedFilteredEvents)

      // Assert - Only events with connpass URL and materials are returned
      response.events.forEach((event: EventWithMaterials) => {
        expect(event.connpassUrl).toBeTruthy()
        expect(event.materials.length).toBeGreaterThan(0)
      })
    })

    it('should handle custom date range filtering', async () => {
      // Arrange
      const customEvents = expectedFilteredEvents.slice(0, 1) // Only first event
      mockGetEventsWithMaterials.mockResolvedValue(customEvents)
      const event = createMockEvent({ months: '3' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(mockGetEventsWithMaterials).toHaveBeenCalledWith(3)
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.count).toBe(1)
      expect(response.total).toBe(1)
      expect(response.events).toEqual(customEvents)
    })

    it('should handle pagination correctly with large dataset', async () => {
      // Arrange - Create a larger dataset
      const largeDataset = Array.from({ length: 15 }, (_, i) => ({
        ...expectedFilteredEvents[0],
        id: `event-${i + 1}`,
        title: `勉強会 ${i + 1}`,
        eventDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-15T10:00:00Z`,
      }))

      mockGetEventsWithMaterials.mockResolvedValue(largeDataset)
      const event = createMockEvent({ start: '6', count: '5' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.count).toBe(5) // requested count
      expect(response.total).toBe(15) // total available
      expect(response.events).toHaveLength(5)

      // Verify correct pagination - should start from 6th item (index 5)
      expect(response.events[0].id).toBe('event-6')
      expect(response.events[4].id).toBe('event-10')
    })

    it('should return empty result when no events match criteria', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue([])
      const event = createMockEvent({ months: '1' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.count).toBe(0)
      expect(response.total).toBe(0)
      expect(response.events).toEqual([])
    })

    it('should handle DynamoDB connection errors gracefully', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockRejectedValue(
        new Error('Unable to connect to DynamoDB')
      )
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'サーバー内部エラーが発生しました。しばらく待ってから再試行してください',
      })
    })

    it('should handle DynamoDB timeout errors', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockRejectedValue(new Error('Request timeout'))
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'サーバー内部エラーが発生しました。しばらく待ってから再試行してください',
      })
    })

    it('should handle DynamoDB access denied errors', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockRejectedValue(
        new Error(
          'AccessDenied: User is not authorized to perform: dynamodb:Query'
        )
      )
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'サーバー内部エラーが発生しました。しばらく待ってから再試行してください',
      })
    })
  })

  describe('Data Consistency and Filtering Tests', () => {
    it('should ensure all returned events have connpass URLs and materials', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue(expectedFilteredEvents)
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      response.events.forEach((event: EventWithMaterials) => {
        // 要件1.2: connpassイベントのみ対象
        expect(event.connpassUrl).toBeTruthy()
        expect(event.connpassUrl).toMatch(/connpass\.com/)

        // 要件1.2: 資料があるもののみ対象
        expect(Array.isArray(event.materials)).toBe(true)
        expect(event.materials.length).toBeGreaterThan(0)

        // 各資料の構造検証
        event.materials.forEach(material => {
          expect(typeof material.id).toBe('string')
          expect(typeof material.title).toBe('string')
          expect(typeof material.url).toBe('string')
          expect(['slide', 'document', 'video', 'other']).toContain(
            material.type
          )
          expect(typeof material.createdAt).toBe('string')
        })
      })
    })

    it('should maintain correct event ordering (newest first)', async () => {
      // Arrange - Events in chronological order
      const orderedEvents = [
        {
          ...expectedFilteredEvents[1], // 2024-02-20 (newer)
          eventDate: '2024-02-20T14:00:00Z',
        },
        {
          ...expectedFilteredEvents[0], // 2024-01-15 (older)
          eventDate: '2024-01-15T10:00:00Z',
        },
      ]

      mockGetEventsWithMaterials.mockResolvedValue(orderedEvents)
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.events).toHaveLength(2)

      // 要件1.2: 開催日の降順（最新が最初）
      const firstEventDate = new Date(response.events[0].eventDate)
      const secondEventDate = new Date(response.events[1].eventDate)
      expect(firstEventDate.getTime()).toBeGreaterThan(
        secondEventDate.getTime()
      )
    })

    it('should handle events with various material types correctly', async () => {
      // Arrange - Event with different material types
      const eventWithVariousMaterials: EventWithMaterials = {
        id: 'event-mixed',
        title: '総合技術勉強会',
        eventDate: '2024-03-15T10:00:00Z',
        eventUrl: 'https://example.com/event-mixed',
        connpassUrl: 'https://connpass.com/event/999/',
        materials: [
          {
            id: 'material-slide',
            title: 'プレゼンテーション資料',
            url: 'https://speakerdeck.com/user/presentation',
            type: 'slide',
            thumbnailUrl: 'https://example.com/thumb1.png',
            createdAt: '2024-03-15T10:00:00Z',
          },
          {
            id: 'material-doc',
            title: 'ドキュメント',
            url: 'https://docs.google.com/document/d/doc',
            type: 'document',
            createdAt: '2024-03-15T10:30:00Z',
          },
          {
            id: 'material-video',
            title: '録画動画',
            url: 'https://youtube.com/watch?v=video',
            type: 'video',
            createdAt: '2024-03-15T11:00:00Z',
          },
          {
            id: 'material-other',
            title: 'その他の資料',
            url: 'https://github.com/user/repo',
            type: 'other',
            createdAt: '2024-03-15T11:30:00Z',
          },
        ],
        createdAt: '2024-03-10T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z',
      }

      mockGetEventsWithMaterials.mockResolvedValue([eventWithVariousMaterials])
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.events).toHaveLength(1)
      expect(response.events[0].materials).toHaveLength(4)

      // Verify all material types are preserved
      const materialTypes = response.events[0].materials.map((m: any) => m.type)
      expect(materialTypes).toContain('slide')
      expect(materialTypes).toContain('document')
      expect(materialTypes).toContain('video')
      expect(materialTypes).toContain('other')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large number of materials per event', async () => {
      // Arrange - Event with many materials
      const manyMaterials = Array.from({ length: 50 }, (_, i) => ({
        id: `material-${i + 1}`,
        title: `資料 ${i + 1}`,
        url: `https://example.com/material-${i + 1}`,
        type: 'slide' as const,
        createdAt: '2024-01-15T10:00:00Z',
      }))

      const eventWithManyMaterials: EventWithMaterials = {
        ...expectedFilteredEvents[0],
        materials: manyMaterials,
      }

      mockGetEventsWithMaterials.mockResolvedValue([eventWithManyMaterials])
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.events).toHaveLength(1)
      expect(response.events[0].materials).toHaveLength(50)
    })

    it('should handle events with minimal required data', async () => {
      // Arrange - Event with only required fields
      const minimalEvent: EventWithMaterials = {
        id: 'minimal-event',
        title: 'ミニマル勉強会',
        eventDate: '2024-01-15T10:00:00Z',
        eventUrl: 'https://example.com/minimal',
        connpassUrl: 'https://connpass.com/event/minimal/',
        materials: [
          {
            id: 'minimal-material',
            title: 'ミニマル資料',
            url: 'https://example.com/minimal-material',
            type: 'slide',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
      }

      mockGetEventsWithMaterials.mockResolvedValue([minimalEvent])
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response = JSON.parse(result.body)
      expect(response.events).toHaveLength(1)
      expect(response.events[0]).toEqual(minimalEvent)
    })
  })
})
