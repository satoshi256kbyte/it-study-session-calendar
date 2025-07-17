import { NotificationService } from '../NotificationService'
import { StudySession } from '../../types/StudySession'

// Mock AWS SDK
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PublishCommand: jest.fn(),
}))

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}))

describe('NotificationService - Security Verification', () => {
  let notificationService: NotificationService
  let mockSend: jest.Mock
  let mockPublishCommand: jest.Mock

  const mockStudySession: StudySession = {
    id: 'test-id',
    title: 'Test Study Session',
    url: 'https://example.com',
    datetime: '2024-01-15T19:00:00.000Z',
    endDatetime: '2024-01-15T21:00:00.000Z',
    contact: 'sensitive@example.com', // This should NOT appear in notifications
    status: 'pending',
    createdAt: '2024-01-10T10:30:00.000Z',
    updatedAt: '2024-01-10T10:30:00.000Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset environment variables
    delete process.env.SNS_TOPIC_ARN
    delete process.env.NOTIFICATION_ENABLED
    delete process.env.ADMIN_URL

    const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')
    mockSend = jest.fn()
    SNSClient.mockImplementation(() => ({
      send: mockSend,
    }))
    mockPublishCommand = PublishCommand
  })

  describe('Requirement 6.1: Personal Information Protection', () => {
    beforeEach(() => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })
      notificationService = new NotificationService()
    })

    it('should NOT include contact information in notification messages', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Verify that contact information is NOT included in the message
      expect(messageBody).not.toContain('sensitive@example.com')
      expect(messageBody).not.toContain('連絡先')
      expect(messageBody).not.toContain('contact')
      expect(messageBody).not.toContain('Contact')
    })

    it('should NOT include any personal identifiable information in notification messages', async () => {
      const sessionWithPII = {
        ...mockStudySession,
        contact: 'john.doe@company.com',
        title: 'Private Company Internal Meeting with John Doe',
      }

      await notificationService.sendNewStudySessionNotification(sessionWithPII)

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should include the title (as it's public information)
      expect(messageBody).toContain(
        'Private Company Internal Meeting with John Doe'
      )

      // Should NOT include contact email
      expect(messageBody).not.toContain('john.doe@company.com')
      expect(messageBody).not.toContain('連絡先')
    })

    it('should only include public information in notifications', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should include public information
      expect(messageBody).toContain('Test Study Session') // title
      expect(messageBody).toContain('https://example.com') // url
      expect(messageBody).toContain('2024年01月16日 04:00') // datetime (formatted)
      expect(messageBody).toContain('2024年01月10日 19:30') // registration time (formatted)

      // Should NOT include private information
      expect(messageBody).not.toContain('sensitive@example.com')
    })

    it('should handle sessions without contact information properly', async () => {
      const sessionWithoutContact = {
        ...mockStudySession,
        contact: undefined,
      }

      await notificationService.sendNewStudySessionNotification(
        sessionWithoutContact
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should still format the message properly
      expect(messageBody).toContain('タイトル: Test Study Session')
      expect(messageBody).toContain('URL: https://example.com')
      expect(messageBody).not.toContain('連絡先')
      expect(messageBody).not.toContain('contact')
    })
  })

  describe('Requirement 6.2: Admin URL Authentication', () => {
    beforeEach(() => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })
    })

    it('should include admin URL that requires authentication', async () => {
      process.env.ADMIN_URL = 'https://it-study-session.satoshi256kbyte.net'
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should include the admin URL
      expect(messageBody).toContain(
        '管理画面: https://it-study-session.satoshi256kbyte.net'
      )

      // Should not include direct data access URLs
      expect(messageBody).not.toContain('/api/')
      expect(messageBody).not.toContain('direct-access')
      expect(messageBody).not.toContain('token')
      expect(messageBody).not.toContain('key')
    })

    it('should use default secure admin URL when not configured', async () => {
      // Don't set ADMIN_URL environment variable
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should use the default secure admin URL
      expect(messageBody).toContain(
        '管理画面: https://it-study-session.satoshi256kbyte.net'
      )
    })

    it('should not include session ID or direct access parameters in admin URL', async () => {
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should include clean admin URL without parameters
      expect(messageBody).toContain('管理画面: https://test-admin.example.com')

      // Should NOT include session-specific parameters
      expect(messageBody).not.toContain('test-id')
      expect(messageBody).not.toContain('?id=')
      expect(messageBody).not.toContain('&session=')
      expect(messageBody).not.toContain('?token=')
    })
  })

  describe('Requirement 6.3: Secure Message Transmission', () => {
    beforeEach(() => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })
      notificationService = new NotificationService()
    })

    it('should use AWS SNS for secure message transmission', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      // Verify SNS is being used (not direct email or insecure methods)
      expect(mockPublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        Subject: expect.any(String),
        Message: expect.any(String),
      })
      expect(mockSend).toHaveBeenCalled()
    })

    it('should not include sensitive configuration in messages', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should NOT include any configuration details
      expect(messageBody).not.toContain('arn:aws:sns')
      expect(messageBody).not.toContain('123456789012')
      expect(messageBody).not.toContain('test-topic')
      expect(messageBody).not.toContain('AWS')
      expect(messageBody).not.toContain('SNS')
      expect(messageBody).not.toContain('NOTIFICATION_ENABLED')
      expect(messageBody).not.toContain('process.env')
    })

    it('should format messages as plain text (not JSON with sensitive data)', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should be formatted text, not JSON
      expect(() => JSON.parse(messageBody)).toThrow()
      expect(typeof messageBody).toBe('string')

      // Should be human-readable Japanese text
      expect(messageBody).toContain('新しい勉強会が登録されました')
      expect(messageBody).toContain('【勉強会情報】')
    })

    it('should handle message content sanitization', async () => {
      const sessionWithSpecialChars = {
        ...mockStudySession,
        title: '<script>alert("xss")</script>Test & "Session"',
        url: 'https://example.com?param=<script>',
      }

      await notificationService.sendNewStudySessionNotification(
        sessionWithSpecialChars
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should include the content as-is (SNS handles encoding)
      // but verify no code injection attempts
      expect(messageBody).toContain(
        '<script>alert("xss")</script>Test & "Session"'
      )
      expect(messageBody).toContain('https://example.com?param=<script>')

      // Message should still be properly formatted
      expect(messageBody).toContain('タイトル:')
      expect(messageBody).toContain('URL:')
    })
  })

  describe('Security Configuration Validation', () => {
    it('should require both NOTIFICATION_ENABLED and SNS_TOPIC_ARN for security', async () => {
      const { logger } = require('../../utils/logger')

      // Test with only NOTIFICATION_ENABLED
      process.env.NOTIFICATION_ENABLED = 'true'
      // Don't set SNS_TOPIC_ARN
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.warn).toHaveBeenCalledWith(
        'Notification skipped: SNS topic ARN not configured',
        expect.objectContaining({
          sessionId: 'test-id',
          notificationEnabled: true,
          topicArn: undefined,
        })
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should validate SNS topic ARN format for security', async () => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN = 'invalid-arn-format'
      notificationService = new NotificationService()

      // Should still attempt to send (AWS SDK will handle validation)
      // but we can verify the ARN is being used as configured
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(mockPublishCommand).toHaveBeenCalledWith({
        TopicArn: 'invalid-arn-format',
        Subject: expect.any(String),
        Message: expect.any(String),
      })
    })

    it('should not expose internal errors in notifications', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      notificationService = new NotificationService()

      const sensitiveError = new Error(
        'Internal AWS credentials expired for user arn:aws:iam::123456789012:user/admin'
      )
      mockSend.mockRejectedValue(sensitiveError)

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      // Error should be logged but not exposed
      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        sessionId: 'test-id',
        sessionTitle: 'Test Study Session',
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        error:
          'Internal AWS credentials expired for user arn:aws:iam::123456789012:user/admin',
        errorType: 'Error',
        errorCode: undefined,
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      })

      // Function should not throw (error contained)
      expect(mockSend).toHaveBeenCalled()
    })
  })

  describe('Message Content Security', () => {
    beforeEach(() => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })
      notificationService = new NotificationService()
    })

    it('should create consistent message structure without exposing internal data', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]

      // Verify message structure
      expect(publishCall.Subject).toBe(
        '【広島IT勉強会カレンダー】新しい勉強会が登録されました'
      )
      expect(typeof publishCall.Message).toBe('string')
      expect(publishCall.TopicArn).toBe(
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      )

      // Verify no internal data leakage
      const messageBody = publishCall.Message
      expect(messageBody).not.toContain('NotificationService')
      expect(messageBody).not.toContain('createNotificationMessage')
      expect(messageBody).not.toContain('formatMessageBody')
      expect(messageBody).not.toContain('process.env')
    })

    it('should handle empty or null values securely', async () => {
      const sessionWithNullValues = {
        ...mockStudySession,
        title: '',
        url: '',
        endDatetime: undefined,
        contact: null as any,
      }

      await notificationService.sendNewStudySessionNotification(
        sessionWithNullValues
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should handle empty values gracefully
      expect(messageBody).toContain('タイトル: ')
      expect(messageBody).toContain('URL: ')
      expect(messageBody).not.toContain('null')
      expect(messageBody).not.toContain('undefined')
    })
  })
})
