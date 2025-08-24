import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import {
  EventWithMaterials,
  EventMaterialsResponse,
} from '../../types/EventMaterial'

// Mock functions - must be declared before jest.mock calls
const mockGetEventsWithMaterials = jest.fn()

// Mock AWS services
jest.mock('../../services/DynamoDBService', () => ({
  DynamoDBService: jest.fn().mockImplementation(() => ({
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
    getLogLevel: jest.fn().mockReturnValue(2), // INFO level
  },
}))

// Import after mocks are set up
import { getEventMaterials } from '../eventMaterialsHandlers'

describe('Event Materials Handlers Unit Tests', () => {
  let mockContext: Context

  const mockEventsWithMaterials: EventWithMaterials[] = [
    {
      id: 'event-1',
      title: 'TypeScript勉強会',
      eventDate: '2024-01-15T10:00:00Z',
      eventUrl: 'https://example.com/event-1',
      connpassUrl: 'https://connpass.com/event/123/',
      materials: [
        {
          id: 'material-1',
          title: 'TypeScript基礎',
          url: 'https://example.com/slides/typescript-basics',
          type: 'slide',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'material-2',
          title: 'TypeScript実践',
          url: 'https://example.com/slides/typescript-advanced',
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
      title: 'React勉強会',
      eventDate: '2024-02-20T14:00:00Z',
      eventUrl: 'https://example.com/event-2',
      connpassUrl: 'https://connpass.com/event/456/',
      materials: [
        {
          id: 'material-3',
          title: 'React Hooks入門',
          url: 'https://example.com/slides/react-hooks',
          type: 'slide',
          createdAt: '2024-02-20T14:00:00Z',
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

  describe('getEventMaterials', () => {
    it('should successfully return event materials with default parameters', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue(mockEventsWithMaterials)
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(mockGetEventsWithMaterials).toHaveBeenCalledWith(6) // default months
      expect(result.statusCode).toBe(200)

      const response: EventMaterialsResponse = JSON.parse(result.body)
      expect(response.count).toBe(2)
      expect(response.total).toBe(2)
      expect(response.events).toEqual(mockEventsWithMaterials)
    })

    it('should handle custom months parameter', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue(mockEventsWithMaterials)
      const event = createMockEvent({ months: '12' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(mockGetEventsWithMaterials).toHaveBeenCalledWith(12)
      expect(result.statusCode).toBe(200)
    })

    it('should handle pagination with start and count parameters', async () => {
      // Arrange
      const manyEvents = Array.from({ length: 10 }, (_, i) => ({
        ...mockEventsWithMaterials[0],
        id: `event-${i + 1}`,
        title: `イベント ${i + 1}`,
      }))
      mockGetEventsWithMaterials.mockResolvedValue(manyEvents)
      const event = createMockEvent({ start: '3', count: '5' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response: EventMaterialsResponse = JSON.parse(result.body)
      expect(response.count).toBe(5) // requested count
      expect(response.total).toBe(10) // total available
      expect(response.events).toHaveLength(5)
      expect(response.events[0].id).toBe('event-3') // start from 3rd item (index 2)
    })

    it('should handle empty results', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue([])
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response: EventMaterialsResponse = JSON.parse(result.body)
      expect(response.count).toBe(0)
      expect(response.total).toBe(0)
      expect(response.events).toEqual([])
    })

    it('should handle OPTIONS request correctly', async () => {
      // Arrange
      const optionsEvent: APIGatewayProxyEvent = {
        ...createMockEvent(),
        httpMethod: 'OPTIONS',
      }

      // Act
      const result = (await getEventMaterials(
        optionsEvent,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)
      expect(result.body).toBe('')
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': '*',
        'Access-Control-Max-Age': '3600',
      })

      // Assert - No service calls should be made
      expect(mockGetEventsWithMaterials).not.toHaveBeenCalled()
    })

    it('should validate months parameter range', async () => {
      // Arrange - Invalid months parameter (too high)
      const event = createMockEvent({ months: '25' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'months パラメータは1-24の範囲で指定してください。指定された値: 25',
      })
      expect(mockGetEventsWithMaterials).not.toHaveBeenCalled()
    })

    it('should validate months parameter minimum', async () => {
      // Arrange - Invalid months parameter (too low)
      const event = createMockEvent({ months: '0' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'months パラメータは1-24の範囲で指定してください。指定された値: 0',
      })
      expect(mockGetEventsWithMaterials).not.toHaveBeenCalled()
    })

    it('should validate start parameter', async () => {
      // Arrange - Invalid start parameter
      const event = createMockEvent({ start: '0' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: 'start パラメータは1以上で指定してください。指定された値: 0',
      })
      expect(mockGetEventsWithMaterials).not.toHaveBeenCalled()
    })

    it('should validate count parameter range', async () => {
      // Arrange - Invalid count parameter (too high)
      const event = createMockEvent({ count: '101' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'count パラメータは1-100の範囲で指定してください。指定された値: 101',
      })
      expect(mockGetEventsWithMaterials).not.toHaveBeenCalled()
    })

    it('should handle DynamoDB service error', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockRejectedValue(
        new Error('DynamoDB service unavailable')
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

    it('should handle pagination beyond available data', async () => {
      // Arrange - Request data beyond what's available
      mockGetEventsWithMaterials.mockResolvedValue(mockEventsWithMaterials) // 2 events
      const event = createMockEvent({ start: '5', count: '10' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)

      const response: EventMaterialsResponse = JSON.parse(result.body)
      expect(response.count).toBe(0) // no events in requested range
      expect(response.total).toBe(2) // total available
      expect(response.events).toEqual([])
    })

    it('should handle non-numeric parameter values gracefully', async () => {
      // Arrange - Non-numeric parameters should return validation errors
      const event = createMockEvent({ months: 'abc' })

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - Should return validation error for non-numeric months
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error:
          'months パラメータは1-24の範囲で指定してください。指定された値: abc',
      })
      expect(mockGetEventsWithMaterials).not.toHaveBeenCalled()
    })
  })

  describe('Response Format Validation', () => {
    it('should return properly formatted EventMaterialsResponse', async () => {
      // Arrange
      mockGetEventsWithMaterials.mockResolvedValue(mockEventsWithMaterials)
      const event = createMockEvent()

      // Act
      const result = (await getEventMaterials(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(200)
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': '*',
        'Access-Control-Max-Age': '3600',
      })

      const response: EventMaterialsResponse = JSON.parse(result.body)

      // Validate response structure
      expect(typeof response.count).toBe('number')
      expect(typeof response.total).toBe('number')
      expect(Array.isArray(response.events)).toBe(true)

      // Validate event structure
      response.events.forEach(event => {
        expect(typeof event.id).toBe('string')
        expect(typeof event.title).toBe('string')
        expect(typeof event.eventDate).toBe('string')
        expect(typeof event.eventUrl).toBe('string')
        expect(typeof event.connpassUrl).toBe('string')
        expect(Array.isArray(event.materials)).toBe(true)
        expect(event.materials.length).toBeGreaterThan(0) // connpassイベントで資料があるもののみ

        // Validate material structure
        event.materials.forEach(material => {
          expect(typeof material.id).toBe('string')
          expect(typeof material.title).toBe('string')
          expect(typeof material.url).toBe('string')
          expect(['slide', 'document', 'video', 'other']).toContain(
            material.type
          )
          expect(typeof material.createdAt).toBe('string')
          if (material.thumbnailUrl) {
            expect(typeof material.thumbnailUrl).toBe('string')
          }
        })
      })
    })
  })
})
