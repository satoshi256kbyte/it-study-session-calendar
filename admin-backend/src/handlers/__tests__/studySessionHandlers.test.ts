import { APIGatewayProxyEvent, Context } from 'aws-lambda'

// Mock the services before importing the handler
const mockCreateStudySession = jest.fn()
const mockSendNotification = jest.fn()

jest.mock('../../services/DynamoDBService', () => ({
  DynamoDBService: jest.fn().mockImplementation(() => ({
    createStudySession: mockCreateStudySession,
  })),
}))

jest.mock('../../services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendNewStudySessionNotification: mockSendNotification,
  })),
}))

jest.mock('../../services/GoogleCalendarService', () => ({
  GoogleCalendarService: jest.fn().mockImplementation(() => ({})),
}))

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

// Import after mocking
import { createStudySession } from '../studySessionHandlers'

describe('createStudySession Handler', () => {
  let mockEvent: APIGatewayProxyEvent
  let mockContext: Context

  beforeEach(() => {
    jest.clearAllMocks()

    mockEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        title: 'Test Study Session',
        url: 'https://example.com/event',
        datetime: '2024-01-15T19:00:00.000Z',
        endDatetime: '2024-01-15T21:00:00.000Z',
        contact: 'test@example.com',
      }),
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
  })

  it('should create study session and send notification successfully', async () => {
    const mockSession = {
      id: 'test-id',
      title: 'Test Study Session',
      url: 'https://example.com/event',
      datetime: '2024-01-15T19:00:00.000Z',
      endDatetime: '2024-01-15T21:00:00.000Z',
      contact: 'test@example.com',
      status: 'pending' as const,
      createdAt: '2024-01-10T10:30:00.000Z',
      updatedAt: '2024-01-10T10:30:00.000Z',
    }

    // Mock DynamoDB service
    mockCreateStudySession.mockResolvedValue(mockSession)

    // Mock notification service
    mockSendNotification.mockResolvedValue(undefined)

    const result = await createStudySession(mockEvent, mockContext, {} as any)

    // Verify study session was created
    expect(mockCreateStudySession).toHaveBeenCalledWith({
      title: 'Test Study Session',
      url: 'https://example.com/event',
      datetime: '2024-01-15T19:00:00.000Z',
      endDatetime: '2024-01-15T21:00:00.000Z',
      contact: 'test@example.com',
    })

    // Verify response
    expect(result).toBeDefined()
    if (result) {
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockSession)
    }

    // Wait a bit for async notification call
    await new Promise(resolve => setTimeout(resolve, 10))

    // Verify notification was sent
    expect(mockSendNotification).toHaveBeenCalledWith(mockSession)
  })

  it('should create study session successfully even if notification fails', async () => {
    const mockSession = {
      id: 'test-id',
      title: 'Test Study Session',
      url: 'https://example.com/event',
      datetime: '2024-01-15T19:00:00.000Z',
      status: 'pending' as const,
      createdAt: '2024-01-10T10:30:00.000Z',
      updatedAt: '2024-01-10T10:30:00.000Z',
    }

    // Mock DynamoDB service
    mockCreateStudySession.mockResolvedValue(mockSession)

    // Mock notification service to throw error
    mockSendNotification.mockRejectedValue(new Error('Notification failed'))

    const result = await createStudySession(mockEvent, mockContext, {} as any)

    // Verify study session was still created successfully
    expect(result).toBeDefined()
    if (result) {
      expect(result.statusCode).toBe(201)
      expect(JSON.parse(result.body)).toEqual(mockSession)
    }

    // Wait a bit for async notification call
    await new Promise(resolve => setTimeout(resolve, 10))

    // Verify notification was attempted
    expect(mockSendNotification).toHaveBeenCalledWith(mockSession)
  })

  it('should handle validation errors', async () => {
    mockEvent.body = JSON.stringify({
      title: '', // Invalid: empty title
      url: 'https://example.com/event',
      datetime: '2024-01-15T19:00:00.000Z',
    })

    const result = await createStudySession(mockEvent, mockContext, {} as any)

    expect(result).toBeDefined()
    if (result) {
      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: '必須項目が不足しています',
      })
    }

    // Verify no database call was made
    expect(mockCreateStudySession).not.toHaveBeenCalled()
  })

  it('should handle OPTIONS requests', async () => {
    mockEvent.httpMethod = 'OPTIONS'

    const result = await createStudySession(mockEvent, mockContext, {} as any)

    expect(result).toBeDefined()
    if (result) {
      expect(result.statusCode).toBe(200)
      expect(result.body).toBe('')
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*')
    }
  })
})
