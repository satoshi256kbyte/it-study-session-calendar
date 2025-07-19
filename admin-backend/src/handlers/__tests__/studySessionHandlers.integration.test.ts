import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import {
  StudySession,
  CreateStudySessionRequest,
} from '../../types/StudySession'

// Mock functions - must be declared before jest.mock calls
const mockCreateStudySession = jest.fn()
const mockPublishStudySessionNotification = jest.fn()

// Mock AWS services
jest.mock('../../services/DynamoDBService', () => ({
  DynamoDBService: jest.fn().mockImplementation(() => ({
    createStudySession: mockCreateStudySession,
  })),
}))

jest.mock('../../services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    publishStudySessionNotification: mockPublishStudySessionNotification,
  })),
}))

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Import after mocks are set up
import { createStudySession } from '../studySessionHandlers'

describe('Study Session Handlers Integration Tests', () => {
  let mockContext: Context

  const mockStudySession: StudySession = {
    id: 'test-session-id',
    title: 'Test Study Session',
    url: 'https://example.com/test-session',
    datetime: '2024-12-25T10:00:00Z',
    endDatetime: '2024-12-25T12:00:00Z',
    contact: 'test@example.com',
    status: 'pending',
    createdAt: '2024-12-20T10:00:00Z',
    updatedAt: '2024-12-20T10:00:00Z',
  }

  const createMockEvent = (
    body: CreateStudySessionRequest
  ): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/study-sessions',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      path: '/study-sessions',
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
      resourcePath: '/study-sessions',
    },
    resource: '/study-sessions',
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

  describe('createStudySession Integration', () => {
    it('should successfully create study session and send SNS notification', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Test Study Session',
        url: 'https://example.com/test-session',
        datetime: '2024-12-25T10:00:00Z',
        endDatetime: '2024-12-25T12:00:00Z',
        contact: 'test@example.com',
      }

      mockCreateStudySession.mockResolvedValue(mockStudySession)
      mockPublishStudySessionNotification.mockResolvedValue(undefined)

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - DynamoDB registration
      expect(mockCreateStudySession).toHaveBeenCalledWith(request)
      expect(mockCreateStudySession).toHaveBeenCalledTimes(1)

      // Assert - Response
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockStudySession)

      // Assert - SNS notification (async, so we need to wait)
      await new Promise(resolve => setImmediate(resolve))
      expect(mockPublishStudySessionNotification).toHaveBeenCalledWith(
        mockStudySession
      )
      expect(mockPublishStudySessionNotification).toHaveBeenCalledTimes(1)
    })

    it('should create study session successfully even when SNS notification fails', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Test Study Session',
        url: 'https://example.com/test-session',
        datetime: '2024-12-25T10:00:00Z',
      }

      mockCreateStudySession.mockResolvedValue(mockStudySession)
      mockPublishStudySessionNotification.mockRejectedValue(
        new Error('SNS service unavailable')
      )

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - DynamoDB registration should succeed
      expect(mockCreateStudySession).toHaveBeenCalledWith(request)
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockStudySession)

      // Assert - SNS notification was attempted but failed
      await new Promise(resolve => setImmediate(resolve))
      expect(mockPublishStudySessionNotification).toHaveBeenCalledWith(
        mockStudySession
      )
    })

    it('should handle DynamoDB failure and not attempt SNS notification', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Test Study Session',
        url: 'https://example.com/test-session',
        datetime: '2024-12-25T10:00:00Z',
      }

      mockCreateStudySession.mockRejectedValue(
        new Error('DynamoDB service unavailable')
      )

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - Should return error response
      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({ error: '内部サーバーエラー' })

      // Assert - SNS notification should not be attempted
      await new Promise(resolve => setImmediate(resolve))
      expect(mockPublishStudySessionNotification).not.toHaveBeenCalled()
    })

    it('should validate required fields and return 400 for missing data', async () => {
      // Arrange - Missing required fields
      const invalidRequest = {
        title: 'Test Study Session',
        // Missing url and datetime
      }

      const event = createMockEvent(invalidRequest as CreateStudySessionRequest)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: '必須項目が不足しています',
      })

      // Assert - No service calls should be made
      expect(mockCreateStudySession).not.toHaveBeenCalled()
      expect(mockPublishStudySessionNotification).not.toHaveBeenCalled()
    })

    it('should handle OPTIONS request correctly', async () => {
      // Arrange
      const optionsEvent: APIGatewayProxyEvent = {
        ...createMockEvent({ title: '', url: '', datetime: '' }),
        httpMethod: 'OPTIONS',
      }

      // Act
      const result = (await createStudySession(
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
      expect(mockCreateStudySession).not.toHaveBeenCalled()
      expect(mockPublishStudySessionNotification).not.toHaveBeenCalled()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle malformed JSON in request body', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        ...createMockEvent({ title: '', url: '', datetime: '' }),
        body: '{ invalid json',
      }

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({ error: '内部サーバーエラー' })
    })

    it('should handle null request body', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        ...createMockEvent({ title: '', url: '', datetime: '' }),
        body: null,
      }

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: '必須項目が不足しています',
      })
    })

    it('should handle empty request body', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        ...createMockEvent({ title: '', url: '', datetime: '' }),
        body: '',
      }

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: '必須項目が不足しています',
      })
    })
  })

  describe('SNS Notification Error Scenarios', () => {
    it('should handle SNS topic not found error', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Test Study Session',
        url: 'https://example.com/test-session',
        datetime: '2024-12-25T10:00:00Z',
      }

      mockCreateStudySession.mockResolvedValue(mockStudySession)
      mockPublishStudySessionNotification.mockRejectedValue(
        new Error('NotFound: Topic does not exist')
      )

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - Study session creation should still succeed
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockStudySession)

      // Wait for async notification to complete
      await new Promise(resolve => setImmediate(resolve))
      expect(mockPublishStudySessionNotification).toHaveBeenCalledWith(
        mockStudySession
      )
    })

    it('should handle SNS permission denied error', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Test Study Session',
        url: 'https://example.com/test-session',
        datetime: '2024-12-25T10:00:00Z',
      }

      mockCreateStudySession.mockResolvedValue(mockStudySession)
      mockPublishStudySessionNotification.mockRejectedValue(
        new Error(
          'AccessDenied: User is not authorized to perform: SNS:Publish'
        )
      )

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - Study session creation should still succeed
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockStudySession)

      // Wait for async notification to complete
      await new Promise(resolve => setImmediate(resolve))
      expect(mockPublishStudySessionNotification).toHaveBeenCalledWith(
        mockStudySession
      )
    })

    it('should handle SNS service temporarily unavailable', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Test Study Session',
        url: 'https://example.com/test-session',
        datetime: '2024-12-25T10:00:00Z',
      }

      mockCreateStudySession.mockResolvedValue(mockStudySession)
      mockPublishStudySessionNotification.mockRejectedValue(
        new Error('ServiceUnavailable: Service is temporarily unavailable')
      )

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert - Study session creation should still succeed
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockStudySession)

      // Wait for async notification to complete
      await new Promise(resolve => setImmediate(resolve))
      expect(mockPublishStudySessionNotification).toHaveBeenCalledWith(
        mockStudySession
      )
    })
  })

  describe('Data Consistency Tests', () => {
    it('should pass correct study session data to notification service', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Advanced TypeScript Workshop',
        url: 'https://example.com/typescript-workshop',
        datetime: '2024-12-25T14:00:00Z',
        endDatetime: '2024-12-25T17:00:00Z',
        contact: 'organizer@example.com',
      }

      const expectedSession: StudySession = {
        id: 'generated-id-123',
        title: 'Advanced TypeScript Workshop',
        url: 'https://example.com/typescript-workshop',
        datetime: '2024-12-25T14:00:00Z',
        endDatetime: '2024-12-25T17:00:00Z',
        contact: 'organizer@example.com',
        status: 'pending',
        createdAt: '2024-12-20T14:00:00Z',
        updatedAt: '2024-12-20T14:00:00Z',
      }

      mockCreateStudySession.mockResolvedValue(expectedSession)
      mockPublishStudySessionNotification.mockResolvedValue(undefined)

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(expectedSession)

      // Wait for async notification to complete
      await new Promise(resolve => setImmediate(resolve))

      // Verify the exact data passed to notification service
      expect(mockPublishStudySessionNotification).toHaveBeenCalledWith(
        expectedSession
      )

      // Verify the notification service received all the required fields
      const notificationCall =
        mockPublishStudySessionNotification.mock.calls[0][0]
      expect(notificationCall.id).toBe(expectedSession.id)
      expect(notificationCall.title).toBe(expectedSession.title)
      expect(notificationCall.url).toBe(expectedSession.url)
      expect(notificationCall.datetime).toBe(expectedSession.datetime)
      expect(notificationCall.endDatetime).toBe(expectedSession.endDatetime)
      expect(notificationCall.contact).toBe(expectedSession.contact)
      expect(notificationCall.status).toBe(expectedSession.status)
      expect(notificationCall.createdAt).toBe(expectedSession.createdAt)
    })

    it('should handle study session without optional fields', async () => {
      // Arrange
      const request: CreateStudySessionRequest = {
        title: 'Basic JavaScript Meetup',
        url: 'https://example.com/js-meetup',
        datetime: '2024-12-30T19:00:00Z',
        // No endDatetime or contact
      }

      const expectedSession: StudySession = {
        id: 'generated-id-456',
        title: 'Basic JavaScript Meetup',
        url: 'https://example.com/js-meetup',
        datetime: '2024-12-30T19:00:00Z',
        status: 'pending',
        createdAt: '2024-12-20T19:00:00Z',
        updatedAt: '2024-12-20T19:00:00Z',
      }

      mockCreateStudySession.mockResolvedValue(expectedSession)
      mockPublishStudySessionNotification.mockResolvedValue(undefined)

      const event = createMockEvent(request)

      // Act
      const result = (await createStudySession(
        event,
        mockContext,
        jest.fn()
      )) as APIGatewayProxyResult

      // Assert
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(expectedSession)

      // Wait for async notification to complete
      await new Promise(resolve => setImmediate(resolve))

      // Verify notification service received the session without optional fields
      const notificationCall =
        mockPublishStudySessionNotification.mock.calls[0][0]
      expect(notificationCall.endDatetime).toBeUndefined()
      expect(notificationCall.contact).toBeUndefined()
    })
  })
})
