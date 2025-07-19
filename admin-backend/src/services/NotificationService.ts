import {
  SNSClient,
  PublishCommand,
  PublishCommandOutput,
} from '@aws-sdk/client-sns'
import { StudySession } from '../types/StudySession'
import { logger } from '../utils/logger'

export interface StudySessionNotificationMessage {
  messageType: 'STUDY_SESSION_REGISTERED'
  timestamp: string
  studySession: {
    id: string
    title: string
    datetime: string
    endDatetime?: string
    url: string
    contact?: string
    registeredAt: string
  }
  summary: string
}

export interface NotificationServiceInterface {
  publishStudySessionNotification(session: StudySession): Promise<void>
}

export class NotificationService implements NotificationServiceInterface {
  private snsClient: SNSClient
  private topicArn: string

  constructor(topicArn?: string) {
    this.snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    })
    this.topicArn = topicArn || process.env.SNS_TOPIC_ARN || ''

    if (!this.topicArn) {
      logger.warn(
        'SNS_TOPIC_ARN not configured, notifications will be disabled'
      )
    }
  }

  async publishStudySessionNotification(session: StudySession): Promise<void> {
    if (!this.topicArn) {
      logger.warn('SNS topic ARN not configured, skipping notification', {
        sessionId: session.id,
      })
      return
    }

    try {
      const message = this.formatNotificationMessage(session)
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        Subject: `新しい勉強会が登録されました: ${session.title}`,
      })

      const result: PublishCommandOutput = await this.snsClient.send(command)

      logger.info('Study session notification sent', {
        sessionId: session.id,
        messageId: result.MessageId,
        topicArn: this.topicArn,
      })
    } catch (error) {
      logger.error('Failed to send study session notification', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        topicArn: this.topicArn,
      })
      // エラーが発生してもthrowしない（勉強会登録処理を妨げないため）
    }
  }

  private formatNotificationMessage(
    session: StudySession
  ): StudySessionNotificationMessage {
    const now = new Date().toISOString()
    const sessionDate = new Date(session.datetime)

    const summary = this.createHumanReadableSummary(session, sessionDate)

    return {
      messageType: 'STUDY_SESSION_REGISTERED',
      timestamp: now,
      studySession: {
        id: session.id,
        title: session.title,
        datetime: session.datetime,
        endDatetime: session.endDatetime,
        url: session.url,
        contact: session.contact,
        registeredAt: session.createdAt,
      },
      summary,
    }
  }

  private createHumanReadableSummary(
    session: StudySession,
    sessionDate: Date
  ): string {
    const dateStr = sessionDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    const timeStr = sessionDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })

    let summary = `新しい勉強会「${session.title}」が登録されました。\n`
    summary += `日時: ${dateStr} ${timeStr}`

    if (session.endDatetime) {
      const endDate = new Date(session.endDatetime)
      const endTimeStr = endDate.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })
      summary += ` - ${endTimeStr}`
    }

    summary += `\nURL: ${session.url}`

    if (session.contact) {
      summary += `\n連絡先: ${session.contact}`
    }

    return summary
  }
}
