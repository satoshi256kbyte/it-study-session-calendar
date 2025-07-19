import {
  NotificationService,
  StudySessionNotificationMessage,
} from '../NotificationService'
import { StudySession } from '../../types/StudySession'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { logger } from '../../utils/logger'

// SNSClientをモック
const mockSend = jest.fn()
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PublishCommand: jest.fn().mockImplementation(input => ({ input })),
}))
jest.mock('../../utils/logger')

const mockLogger = logger as jest.Mocked<typeof logger>

describe('NotificationService', () => {
  let notificationService: NotificationService
  let mockStudySession: StudySession

  beforeEach(() => {
    jest.clearAllMocks()

    // テスト用のStudySessionデータ
    mockStudySession = {
      id: 'test-session-123',
      title: 'TypeScript勉強会',
      url: 'https://example.com/event',
      datetime: '2024-03-15T19:00:00.000Z',
      endDatetime: '2024-03-15T21:00:00.000Z',
      contact: 'test@example.com',
      status: 'pending',
      createdAt: '2024-03-01T10:00:00.000Z',
      updatedAt: '2024-03-01T10:00:00.000Z',
    }
  })

  describe('constructor', () => {
    it('should initialize with provided topic ARN', () => {
      const topicArn = 'arn:aws:sns:ap-northeast-1:123456789012:test-topic'
      const service = new NotificationService(topicArn)
      expect(service).toBeInstanceOf(NotificationService)
    })

    it('should use environment variable when no topic ARN provided', () => {
      process.env.SNS_TOPIC_ARN =
        'arn:aws:sns:ap-northeast-1:123456789012:env-topic'
      const service = new NotificationService()
      expect(service).toBeInstanceOf(NotificationService)
    })

    it('should warn when no topic ARN is configured', () => {
      delete process.env.SNS_TOPIC_ARN
      new NotificationService()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SNS_TOPIC_ARN not configured, notifications will be disabled'
      )
    })
  })

  describe('publishStudySessionNotification', () => {
    beforeEach(() => {
      notificationService = new NotificationService(
        'arn:aws:sns:ap-northeast-1:123456789012:test-topic'
      )
    })

    it('should successfully publish notification message', async () => {
      const mockResult = { MessageId: 'test-message-id-123' }
      mockSend.mockResolvedValue(mockResult)

      await notificationService.publishStudySessionNotification(
        mockStudySession
      )

      expect(mockSend).toHaveBeenCalledTimes(1)

      const publishCommand = mockSend.mock.calls[0][0] as PublishCommand
      expect(publishCommand.input.TopicArn).toBe(
        'arn:aws:sns:ap-northeast-1:123456789012:test-topic'
      )
      expect(publishCommand.input.Subject).toBe(
        '新しい勉強会が登録されました: TypeScript勉強会'
      )

      // メッセージの内容を検証
      const messageContent = JSON.parse(
        publishCommand.input.Message!
      ) as StudySessionNotificationMessage
      expect(messageContent.messageType).toBe('STUDY_SESSION_REGISTERED')
      expect(messageContent.studySession.id).toBe('test-session-123')
      expect(messageContent.studySession.title).toBe('TypeScript勉強会')
      expect(messageContent.summary).toContain('TypeScript勉強会')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Study session notification sent',
        {
          sessionId: 'test-session-123',
          messageId: 'test-message-id-123',
          topicArn: 'arn:aws:sns:ap-northeast-1:123456789012:test-topic',
        }
      )
    })

    it('should handle SNS publish failure gracefully', async () => {
      const mockError = new Error('SNS service unavailable')
      mockSend.mockRejectedValue(mockError)

      // エラーが投げられないことを確認
      await expect(
        notificationService.publishStudySessionNotification(mockStudySession)
      ).resolves.not.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send study session notification',
        {
          sessionId: 'test-session-123',
          error: 'SNS service unavailable',
          stack: mockError.stack,
          topicArn: 'arn:aws:sns:ap-northeast-1:123456789012:test-topic',
        }
      )
    })

    it('should skip notification when topic ARN is not configured', async () => {
      const serviceWithoutTopic = new NotificationService('')

      await serviceWithoutTopic.publishStudySessionNotification(
        mockStudySession
      )

      expect(mockSend).not.toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SNS topic ARN not configured, skipping notification',
        { sessionId: 'test-session-123' }
      )
    })

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('String error')

      await notificationService.publishStudySessionNotification(
        mockStudySession
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send study session notification',
        {
          sessionId: 'test-session-123',
          error: 'Unknown error',
          stack: undefined,
          topicArn: 'arn:aws:sns:ap-northeast-1:123456789012:test-topic',
        }
      )
    })
  })

  describe('message formatting', () => {
    beforeEach(() => {
      notificationService = new NotificationService(
        'arn:aws:sns:ap-northeast-1:123456789012:test-topic'
      )
      mockSend.mockResolvedValue({ MessageId: 'test-id' })
    })

    it('should format message with all study session details', async () => {
      await notificationService.publishStudySessionNotification(
        mockStudySession
      )

      const publishCommand = mockSend.mock.calls[0][0] as PublishCommand
      const messageContent = JSON.parse(
        publishCommand.input.Message!
      ) as StudySessionNotificationMessage

      expect(messageContent).toMatchObject({
        messageType: 'STUDY_SESSION_REGISTERED',
        studySession: {
          id: 'test-session-123',
          title: 'TypeScript勉強会',
          datetime: '2024-03-15T19:00:00.000Z',
          endDatetime: '2024-03-15T21:00:00.000Z',
          url: 'https://example.com/event',
          contact: 'test@example.com',
          registeredAt: '2024-03-01T10:00:00.000Z',
        },
      })

      expect(messageContent.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
      expect(messageContent.summary).toContain('TypeScript勉強会')
      expect(messageContent.summary).toContain('https://example.com/event')
      expect(messageContent.summary).toContain('test@example.com')
    })

    it('should format message without optional fields', async () => {
      const sessionWithoutOptionals: StudySession = {
        ...mockStudySession,
        endDatetime: undefined,
        contact: undefined,
      }

      await notificationService.publishStudySessionNotification(
        sessionWithoutOptionals
      )

      const publishCommand = mockSend.mock.calls[0][0] as PublishCommand
      const messageContent = JSON.parse(
        publishCommand.input.Message!
      ) as StudySessionNotificationMessage

      expect(messageContent.studySession.endDatetime).toBeUndefined()
      expect(messageContent.studySession.contact).toBeUndefined()
      expect(messageContent.summary).not.toContain('連絡先')
    })

    it('should create human-readable summary in Japanese', async () => {
      await notificationService.publishStudySessionNotification(
        mockStudySession
      )

      const publishCommand = mockSend.mock.calls[0][0] as PublishCommand
      const messageContent = JSON.parse(
        publishCommand.input.Message!
      ) as StudySessionNotificationMessage

      const summary = messageContent.summary
      expect(summary).toContain(
        '新しい勉強会「TypeScript勉強会」が登録されました'
      )
      expect(summary).toContain('日時:')
      expect(summary).toContain('URL: https://example.com/event')
      expect(summary).toContain('連絡先: test@example.com')
    })
  })
})
