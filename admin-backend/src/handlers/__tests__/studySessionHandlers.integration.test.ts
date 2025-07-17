import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from 'aws-lambda'
import { StudySession } from '../../types/StudySession'

// Mock AWS SDK
const mockSNSSend = jest.fn()
const mockDynamoDBSend = jest.fn()

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: mockSNSSend,
  })),
  PublishCommand: jest.fn().mockImplementation(params => params),
}))

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: mockDynamoDBSend,
  })),
}))

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({
      send: mockDynamoDBSend,
    })),
  },
  PutCommand: jest.fn().mockImplementation(params => params),
  ScanCommand: jest.fn().mockImplementation(params => params),
  UpdateCommand: jest.fn().mockImplementation(params => params),
  DeleteCommand: jest.fn().mockImplementation(params => params),
}))

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}

jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}))

// Helper function to assert result is defined and return typed result
function assertResult(
  result: APIGatewayProxyResult | void
): APIGatewayProxyResult {
  expect(result).toBeDefined()
  if (!result) throw new Error('Result is undefined')
  return result
}

describe('StudySession Handler Integration Tests', () => {
  let mockEvent: APIGatewayProxyEvent
  let mockContext: Context

  const mockStudySessionData = {
    title: 'Integration Test Study Session',
    url: 'https://example.com/integration-test',
    datetime: '2024-01-15T19:00:00.000Z',
    endDatetime: '2024-01-15T21:00:00.000Z',
    contact: 'integration@example.com',
  }

  const mockCreatedSession: StudySession = {
    id: 'integration-test-id',
    ...mockStudySessionData,
    status: 'pending',
    createdAt: '2024-01-10T10:30:00.000Z',
    updatedAt: '2024-01-10T10:30:00.000Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Clear module cache to ensure fresh imports
    jest.resetModules()

    // Reset environment variables
    delete process.env.SNS_TOPIC_ARN
    delete process.env.NOTIFICATION_ENABLED
    delete process.env.ADMIN_URL
    delete process.env.STUDY_SESSIONS_TABLE_NAME

    mockEvent = {
      httpMethod: 'POST',
      body: JSON.stringify(mockStudySessionData),
      headers: {},
      multiValueHeaders: {},
      isBase64Encoded: false,
      path: '/study-sessions',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    }

    mockContext = {} as Context

    // Mock successful DynamoDB response
    mockDynamoDBSend.mockResolvedValue({
      Attributes: mockCreatedSession,
    })
  })

  describe('E2E Flow: Study Session Registration to Notification', () => {
    it('should complete full E2E flow successfully when notification is enabled', async () => {
      // Setup environment for successful notification
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      process.env.STUDY_SESSIONS_TABLE_NAME = 'test-study-sessions'

      // Mock successful SNS response
      mockSNSSend.mockResolvedValue({
        MessageId: 'test-message-id-123',
      })

      // Import handler after setting environment variables
      const { createStudySession } = require('../studySessionHandlers')
      const result = await createStudySession(mockEvent, mockContext, {} as any)

      // Verify study session creation was successful
      const typedResult = assertResult(result)
      expect(typedResult.statusCode).toBe(201)

      const responseBody = JSON.parse(typedResult.body)
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        title: mockStudySessionData.title,
        url: mockStudySessionData.url,
        datetime: mockStudySessionData.datetime,
        status: 'pending',
      })

      // Verify DynamoDB was called
      expect(mockDynamoDBSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-study-sessions',
          Item: expect.objectContaining({
            title: mockStudySessionData.title,
            url: mockStudySessionData.url,
            datetime: mockStudySessionData.datetime,
            status: 'pending',
            id: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        })
      )

      // Wait for async notification call
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify SNS notification was sent
      expect(mockSNSSend).toHaveBeenCalledWith(
        expect.objectContaining({
          TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
          Subject: '【広島IT勉強会カレンダー】新しい勉強会が登録されました',
          Message: expect.stringContaining('Integration Test Study Session'),
        })
      )

      // Verify success logs
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting notification send process',
        expect.objectContaining({
          sessionId: expect.any(String),
          sessionTitle: mockStudySessionData.title,
          topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        })
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification sent successfully',
        expect.objectContaining({
          sessionId: expect.any(String),
          sessionTitle: mockStudySessionData.title,
          messageId: 'test-message-id-123',
        })
      )
    })

    it('should complete registration successfully when SNS send fails', async () => {
      // Setup environment for notification attempts
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      process.env.STUDY_SESSIONS_TABLE_NAME = 'test-study-sessions'

      // Mock SNS failure
      const snsError = new Error('SNS service unavailable')
      snsError.name = 'ServiceException'
      ;(snsError as any).code = 'ServiceUnavailable'
      mockSNSSend.mockRejectedValue(snsError)

      // Import handler after setting environment variables
      const { createStudySession } = require('../studySessionHandlers')
      const result = await createStudySession(mockEvent, mockContext, {} as any)

      // Verify study session creation was still successful
      const typedResult = assertResult(result)
      expect(typedResult.statusCode).toBe(201)

      const responseBody = JSON.parse(typedResult.body)
      expect(responseBody).toMatchObject({
        title: mockStudySessionData.title,
        url: mockStudySessionData.url,
        status: 'pending',
      })

      // Verify DynamoDB was called successfully
      expect(mockDynamoDBSend).toHaveBeenCalled()

      // Wait for async notification call
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify SNS was attempted
      expect(mockSNSSend).toHaveBeenCalled()

      // Verify error was logged but didn't affect the response
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send notification',
        expect.objectContaining({
          sessionId: expect.any(String),
          error: 'SNS service unavailable',
          errorType: 'ServiceException',
          errorCode: 'ServiceUnavailable',
        })
      )

      // Verify no error was logged for the main handler
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        'Error creating study session:',
        expect.anything()
      )
    })

    it('should complete registration successfully when SNS times out', async () => {
      // Setup environment for notification attempts
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      process.env.STUDY_SESSIONS_TABLE_NAME = 'test-study-sessions'

      // Mock SNS timeout (takes longer than 5 seconds)
      mockSNSSend.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 6000))
      )

      // Import handler after setting environment variables
      const { createStudySession } = require('../studySessionHandlers')
      const result = await createStudySession(mockEvent, mockContext, {} as any)

      // Verify study session creation was successful
      const typedResult = assertResult(result)
      expect(typedResult.statusCode).toBe(201)

      // Verify DynamoDB was called
      expect(mockDynamoDBSend).toHaveBeenCalled()

      // Wait for timeout to occur
      await new Promise(resolve => setTimeout(resolve, 5200))

      // Verify timeout error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send notification',
        expect.objectContaining({
          sessionId: expect.any(String),
          error: 'SNS publish timeout after 5 seconds',
          errorType: 'TimeoutError',
        })
      )
    }, 10000)
  })
})
