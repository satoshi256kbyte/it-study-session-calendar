import { NotificationService } from '../services/NotificationService'
import { StudySession } from '../types/StudySession'

// Mock AWS SDK
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PublishCommand: jest.fn(),
}))

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Security Integration Tests', () => {
  let notificationService: NotificationService
  let mockSend: jest.Mock
  let mockPublishCommand: jest.Mock

  const mockStudySession: StudySession = {
    id: 'test-session-123',
    title: 'Security Test Session',
    url: 'https://example.com/event',
    datetime: '2024-01-15T19:00:00.000Z',
    endDatetime: '2024-01-15T21:00:00.000Z',
    contact: 'admin@sensitive-company.com',
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

  describe('End-to-End Security Verification', () => {
    it('should implement complete security requirements for notification system', async () => {
      // Setup secure configuration
      process.env.NOTIFICATION_ENABLED = 'true'
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:ap-northeast-1:123456789012:admin-notification'
      process.env.ADMIN_URL = 'https://it-study-session.satoshi256kbyte.net'

      mockSend.mockResolvedValue({ MessageId: 'secure-message-id-123' })
      notificationService = new NotificationService()

      // Execute notification
      await notificationService.sendNewStudySessionNotification(
        mockStudySession
      )

      // Verify security requirements
      const publishCall = mockPublishCommand.mock.calls[0][0]
      const messageBody = publishCall.Message

      // 1. Personal Information Protection (Requirement 6.1)
      expect(messageBody).not.toContain('admin@sensitive-company.com')
      expect(messageBody).not.toContain('連絡先')
      expect(messageBody).not.toContain('contact')

      // 2. Admin URL Authentication (Requirement 6.2)
      expect(messageBody).toContain(
        '管理画面: https://it-study-session.satoshi256kbyte.net'
      )
      expect(messageBody).not.toContain('test-session-123') // No direct session access
      expect(messageBody).not.toContain('?id=')
      expect(messageBody).not.toContain('&token=')

      // 3. Secure Message Transmission (Requirement 6.3)
      expect(publishCall.TopicArn).toBe(
        'arn:aws:sns:ap-northeast-1:123456789012:admin-notification'
      )
      expect(typeof messageBody).toBe('string')
      expect(() => JSON.parse(messageBody)).toThrow() // Not JSON with sensitive data

      // 4. Configuration Security
      expect(messageBody).not.toContain('arn:aws:sns')
      expect(messageBody).not.toContain('123456789012')
      expect(messageBody).not.toContain('NOTIFICATION_ENABLED')
      expect(messageBody).not.toContain('process.env')

      // 5. Content Security
      expect(messageBody).toContain('Security Test Session') // Public info
      expect(messageBody).toContain('https://example.com/event') // Public info
      expect(messageBody).toContain('新しい勉強会が登録されました') // Expected content
    })
  })
})
