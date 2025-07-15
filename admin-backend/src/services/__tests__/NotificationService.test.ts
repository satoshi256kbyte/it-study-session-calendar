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

describe('NotificationService', () => {
  let notificationService: NotificationService
  let mockSend: jest.Mock
  let mockPublishCommand: jest.Mock

  const mockStudySession: StudySession = {
    id: 'test-id',
    title: 'Test Study Session',
    url: 'https://example.com',
    datetime: '2024-01-15T19:00:00.000Z',
    endDatetime: '2024-01-15T21:00:00.000Z',
    contact: 'test@example.com',
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

  describe('isNotificationEnabled', () => {
    it('should return false when NOTIFICATION_ENABLED is not set', () => {
      notificationService = new NotificationService()
      expect(notificationService.isNotificationEnabled()).toBe(false)
    })

    it('should return false when SNS_TOPIC_ARN is not set', () => {
      process.env.NOTIFICATION_ENABLED = 'true'
      notificationService = new NotificationService()
      expect(notificationService.isNotificationEnabled()).toBe(false)
    })

    it('should return true when both NOTIFICATION_ENABLED and SNS_TOPIC_ARN are set', () => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      notificationService = new NotificationService()
      expect(notificationService.isNotificationEnabled()).toBe(true)
    })
  })

  describe('sendNewStudySessionNotification', () => {
    it('should skip notification when disabled', async () => {
      const { logger } = require('../../utils/logger')
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.warn).toHaveBeenCalledWith(
        'Notification skipped: SNS notification is disabled',
        {
          sessionId: 'test-id',
          notificationEnabled: false,
          topicArn: undefined,
        }
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should skip notification when SNS_TOPIC_ARN is not configured', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.warn).toHaveBeenCalledWith(
        'Notification skipped: SNS topic ARN not configured',
        {
          sessionId: 'test-id',
          notificationEnabled: true,
          topicArn: undefined,
          adminUrl: 'https://it-study-session.satoshi256kbyte.net',
        }
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should send notification successfully when properly configured', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'

      const mockResult = { MessageId: 'test-message-id-123' }
      mockSend.mockResolvedValue(mockResult)
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.info).toHaveBeenCalledWith(
        'Starting notification send process',
        {
          sessionId: 'test-id',
          sessionTitle: 'Test Study Session',
          topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
          timestamp: expect.any(String),
        }
      )

      expect(mockPublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        Subject: '【広島IT勉強会カレンダー】新しい勉強会が登録されました',
        Message: expect.stringContaining('新しい勉強会が登録されました。'),
      })
      expect(mockSend).toHaveBeenCalled()

      expect(logger.info).toHaveBeenCalledWith(
        'Notification sent successfully',
        {
          sessionId: 'test-id',
          sessionTitle: 'Test Study Session',
          topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
          messageId: 'test-message-id-123',
          duration: expect.stringMatching(/^\d+ms$/),
          timestamp: expect.any(String),
        }
      )
    })

    it('should handle SNS send errors gracefully', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'

      const error = new Error('SNS send failed')
      error.name = 'ServiceException'
      ;(error as any).code = 'InvalidParameter'
      mockSend.mockRejectedValue(error)
      notificationService = new NotificationService()

      // Should not throw
      await expect(
        notificationService.sendNewStudySessionNotification(mockStudySession)
      ).resolves.toBeUndefined()

      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        sessionId: 'test-id',
        sessionTitle: 'Test Study Session',
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        error: 'SNS send failed',
        errorType: 'ServiceException',
        errorCode: 'InvalidParameter',
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      })
    })

    it('should handle timeout errors', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'

      // Mock a slow SNS send that will timeout
      mockSend.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 6000))
      )
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        sessionId: 'test-id',
        sessionTitle: 'Test Study Session',
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        error: 'SNS publish timeout after 5 seconds',
        errorType: 'TimeoutError',
        errorCode: undefined,
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
        stackTrace: expect.any(String),
      })
    }, 10000)

    it('should handle string errors', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'

      mockSend.mockRejectedValue('String error message')
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        sessionId: 'test-id',
        sessionTitle: 'Test Study Session',
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        error: 'String error message',
        errorType: 'StringError',
        errorCode: undefined,
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
        stackTrace: undefined,
      })
    })

    it('should handle object errors', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'

      const objectError = {
        message: 'Custom object error',
        code: 'CUSTOM_ERROR',
        statusCode: 500,
      }
      mockSend.mockRejectedValue(objectError)
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        sessionId: 'test-id',
        sessionTitle: 'Test Study Session',
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        error: 'Custom object error',
        errorType: 'Object',
        errorCode: 'CUSTOM_ERROR',
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
        stackTrace: undefined,
      })
    })

    it('should handle unknown error types', async () => {
      const { logger } = require('../../utils/logger')
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'

      mockSend.mockRejectedValue(null)
      notificationService = new NotificationService()

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        sessionId: 'test-id',
        sessionTitle: 'Test Study Session',
        topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        error: 'Unknown error occurred',
        errorType: 'UnknownError',
        errorCode: undefined,
        duration: expect.stringMatching(/^\d+ms$/),
        timestamp: expect.any(String),
        stackTrace: undefined,
      })
    })
  })

  describe('Message Formatting', () => {
    beforeEach(() => {
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:us-east-1:123456789012:test-topic'
      process.env.ADMIN_URL = 'https://test-admin.example.com'
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })
      notificationService = new NotificationService()
    })

    it('should format message subject correctly', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      expect(mockPublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        Subject: '【広島IT勉強会カレンダー】新しい勉強会が登録されました',
        Message: expect.any(String),
      })
    })

    it('should format message body with all required information', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      expect(messageBody).toContain('新しい勉強会が登録されました。')
      expect(messageBody).toContain('【勉強会情報】')
      expect(messageBody).toContain('タイトル: Test Study Session')
      expect(messageBody).toContain('開催日時: 2024年01月16日 04:00') // JST conversion
      expect(messageBody).toContain('URL: https://example.com')
      expect(messageBody).toContain('登録日時: 2024年01月10日 19:30') // JST conversion
      expect(messageBody).toContain('管理画面: https://test-admin.example.com')
      expect(messageBody).toContain('※このメッセージは自動送信されています。')
    })

    it('should format message body with end datetime when provided', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      expect(messageBody).toContain(
        '2024年01月16日 04:00 - 2024年01月16日 06:00'
      )
    })

    it('should format message body without end datetime when not provided', async () => {
      const sessionWithoutEndTime = {
        ...mockStudySession,
        endDatetime: undefined,
      }

      await notificationService.sendNewStudySessionNotification(
        sessionWithoutEndTime
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      expect(messageBody).toContain('開催日時: 2024年01月16日 04:00')
      expect(messageBody).not.toContain(' - ')
    })

    it('should handle datetime formatting errors gracefully', async () => {
      const { logger } = require('../../utils/logger')
      const sessionWithInvalidDate = {
        ...mockStudySession,
        datetime: 'invalid-date',
        createdAt: 'invalid-created-date',
      }

      await notificationService.sendNewStudySessionNotification(
        sessionWithInvalidDate
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // Should fall back to original string when formatting fails
      expect(messageBody).toContain('開催日時: invalid-date')
      expect(messageBody).toContain('登録日時: invalid-created-date')

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to format datetime, using original string',
        {
          isoString: 'invalid-date',
          error: expect.any(String),
        }
      )
    })

    it('should use default admin URL when not configured', async () => {
      delete process.env.ADMIN_URL
      notificationService = new NotificationService()
      mockSend.mockResolvedValue({ MessageId: 'test-message-id' })

      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      expect(messageBody).toContain(
        '管理画面: https://it-study-session.satoshi256kbyte.net'
      )
    })

    it('should create proper NotificationMessage structure', async () => {
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      // Verify that the message contains the expected structure
      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // The message should be a formatted text, not JSON
      expect(() => JSON.parse(messageBody)).toThrow()
      expect(typeof messageBody).toBe('string')
    })
  })
})
