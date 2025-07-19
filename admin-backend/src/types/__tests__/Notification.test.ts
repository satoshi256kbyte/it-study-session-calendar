import {
  StudySessionNotificationMessage,
  StudySessionNotificationData,
  NotificationMessageType,
  NotificationMessageOptions,
  NotificationError,
  StudySessionToNotificationData,
} from '../Notification'
import { StudySession } from '../StudySession'

describe('Notification Types', () => {
  describe('StudySessionNotificationMessage', () => {
    it('should have correct structure for notification message', () => {
      const message: StudySessionNotificationMessage = {
        messageType: 'STUDY_SESSION_REGISTERED',
        timestamp: '2024-01-15T10:00:00Z',
        studySession: {
          id: 'session-123',
          title: 'TypeScript勉強会',
          datetime: '2024-01-20T14:00:00Z',
          endDatetime: '2024-01-20T16:00:00Z',
          url: 'https://example.com/session',
          contact: 'organizer@example.com',
          registeredAt: '2024-01-15T10:00:00Z',
          status: 'pending',
        },
        summary: '新しい勉強会「TypeScript勉強会」が登録されました。',
      }

      expect(message.messageType).toBe('STUDY_SESSION_REGISTERED')
      expect(message.studySession.title).toBe('TypeScript勉強会')
      expect(message.summary).toContain('TypeScript勉強会')
    })

    it('should support optional fields', () => {
      const message: StudySessionNotificationMessage = {
        messageType: 'STUDY_SESSION_REGISTERED',
        timestamp: '2024-01-15T10:00:00Z',
        studySession: {
          id: 'session-123',
          title: 'TypeScript勉強会',
          datetime: '2024-01-20T14:00:00Z',
          url: 'https://example.com/session',
          registeredAt: '2024-01-15T10:00:00Z',
          // endDatetime, contact, status are optional
        },
        summary: '新しい勉強会「TypeScript勉強会」が登録されました。',
      }

      expect(message.studySession.endDatetime).toBeUndefined()
      expect(message.studySession.contact).toBeUndefined()
      expect(message.studySession.status).toBeUndefined()
    })
  })

  describe('NotificationMessageType', () => {
    it('should only allow valid message types', () => {
      const validType: NotificationMessageType = 'STUDY_SESSION_REGISTERED'
      expect(validType).toBe('STUDY_SESSION_REGISTERED')
    })
  })

  describe('NotificationError', () => {
    it('should extend Error with additional properties', () => {
      const error: NotificationError = {
        name: 'NotificationError',
        message: 'SNS publish failed',
        code: 'SNS_PUBLISH_ERROR',
        sessionId: 'session-123',
        originalError: new Error('Network timeout'),
      }

      expect(error.code).toBe('SNS_PUBLISH_ERROR')
      expect(error.sessionId).toBe('session-123')
      expect(error.originalError?.message).toBe('Network timeout')
    })
  })

  describe('StudySessionToNotificationData type compatibility', () => {
    it('should be compatible with StudySession type', () => {
      const studySession: StudySession = {
        id: 'session-123',
        title: 'TypeScript勉強会',
        url: 'https://example.com/session',
        datetime: '2024-01-20T14:00:00Z',
        endDatetime: '2024-01-20T16:00:00Z',
        contact: 'organizer@example.com',
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      }

      // This should compile without errors, demonstrating type compatibility
      const notificationData: StudySessionToNotificationData = {
        id: studySession.id,
        title: studySession.title,
        datetime: studySession.datetime,
        endDatetime: studySession.endDatetime,
        url: studySession.url,
        contact: studySession.contact,
        status: studySession.status,
        registeredAt: studySession.createdAt, // Map createdAt to registeredAt
      }

      expect(notificationData.id).toBe(studySession.id)
      expect(notificationData.title).toBe(studySession.title)
      expect(notificationData.registeredAt).toBe(studySession.createdAt)
    })
  })

  describe('NotificationMessageOptions', () => {
    it('should support optional configuration', () => {
      const options: NotificationMessageOptions = {
        customSummary: 'カスタム要約文',
        includeMetadata: true,
      }

      expect(options.customSummary).toBe('カスタム要約文')
      expect(options.includeMetadata).toBe(true)
    })

    it('should work with empty options', () => {
      const options: NotificationMessageOptions = {}

      expect(options.customSummary).toBeUndefined()
      expect(options.includeMetadata).toBeUndefined()
    })
  })
})
