import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { StudySession } from '../types/StudySession'
import { logger } from '../utils/logger'

export interface NotificationMessage {
  title: string
  datetime: string
  endDatetime?: string
  url: string
  registeredAt: string
  adminUrl: string
}

export interface SNSMessagePayload {
  Subject: string
  Message: string
}

export class NotificationService {
  private snsClient: SNSClient
  private topicArn: string | undefined
  private adminUrl: string
  private notificationEnabled: boolean

  constructor() {
    this.snsClient = new SNSClient({})
    this.topicArn = process.env.SNS_TOPIC_ARN
    this.adminUrl =
      process.env.ADMIN_URL || 'https://it-study-session.satoshi256kbyte.net'
    this.notificationEnabled = process.env.NOTIFICATION_ENABLED === 'true'
  }

  /**
   * 新しい勉強会登録の通知を送信する
   */
  async sendNewStudySessionNotification(session: StudySession): Promise<void> {
    const startTime = Date.now()

    // 設定チェックとスキップ処理
    if (!this.notificationEnabled) {
      logger.warn('Notification skipped: SNS notification is disabled', {
        sessionId: session.id,
        notificationEnabled: this.notificationEnabled,
        topicArn: this.topicArn,
      })
      return
    }

    if (!this.topicArn) {
      logger.warn('Notification skipped: SNS topic ARN not configured', {
        sessionId: session.id,
        notificationEnabled: this.notificationEnabled,
        topicArn: this.topicArn,
        adminUrl: this.adminUrl,
      })
      return
    }

    logger.info('Starting notification send process', {
      sessionId: session.id,
      sessionTitle: session.title,
      topicArn: this.topicArn,
      timestamp: new Date().toISOString(),
    })

    try {
      const snsPayload = this.createSNSMessagePayload(session)

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: snsPayload.Subject,
        Message: snsPayload.Message,
      })

      // 5秒のタイムアウトを設定
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error('SNS publish timeout after 5 seconds')
          timeoutError.name = 'TimeoutError'
          reject(timeoutError)
        }, 5000)
      })

      const result = await Promise.race([
        this.snsClient.send(command),
        timeoutPromise,
      ])

      const duration = Date.now() - startTime
      logger.info('Notification sent successfully', {
        sessionId: session.id,
        sessionTitle: session.title,
        topicArn: this.topicArn,
        messageId: result?.MessageId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const errorDetails = this.extractErrorDetails(error)

      logger.error('Failed to send notification', {
        sessionId: session.id,
        sessionTitle: session.title,
        topicArn: this.topicArn,
        error: errorDetails.message,
        errorType: errorDetails.type,
        errorCode: errorDetails.code,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        stackTrace: errorDetails.stack,
      })

      // エラーが発生してもthrowしない（勉強会登録処理に影響させない）
    }
  }

  /**
   * 通知機能が有効かどうかを確認する
   */
  isNotificationEnabled(): boolean {
    return this.notificationEnabled && !!this.topicArn
  }

  /**
   * StudySessionからSNSメッセージペイロードを作成する
   */
  private createSNSMessagePayload(session: StudySession): SNSMessagePayload {
    const notificationMessage = this.createNotificationMessage(session)

    return {
      Subject: this.formatMessageSubject(),
      Message: this.formatMessageBody(notificationMessage),
    }
  }

  /**
   * StudySessionからNotificationMessageを作成する
   */
  private createNotificationMessage(
    session: StudySession
  ): NotificationMessage {
    return {
      title: session.title,
      datetime: session.datetime,
      endDatetime: session.endDatetime,
      url: session.url,
      registeredAt: session.createdAt,
      adminUrl: this.adminUrl,
    }
  }

  /**
   * 通知メッセージの件名をフォーマットする
   */
  private formatMessageSubject(): string {
    return '【広島IT勉強会カレンダー】新しい勉強会が登録されました'
  }

  /**
   * 通知メッセージの本文をフォーマットする
   */
  private formatMessageBody(message: NotificationMessage): string {
    const formattedDateTime = this.formatDateTime(message.datetime)
    const formattedEndDateTime = message.endDatetime
      ? this.formatDateTime(message.endDatetime)
      : null
    const formattedRegisteredAt = this.formatDateTime(message.registeredAt)

    let body = `新しい勉強会が登録されました。

【勉強会情報】
タイトル: ${message.title}
開催日時: ${formattedDateTime}`

    if (formattedEndDateTime) {
      body += ` - ${formattedEndDateTime}`
    }

    body += `
URL: ${message.url}
登録日時: ${formattedRegisteredAt}

管理画面で詳細を確認し、承認・却下の判断を行ってください。
管理画面: ${message.adminUrl}

※このメッセージは自動送信されています。`

    return body
  }

  /**
   * ISO日時文字列を読みやすい形式にフォーマットする
   */
  private formatDateTime(isoString: string): string {
    try {
      const date = new Date(isoString)

      // 無効な日付をチェック
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }

      // 日本時間に変換
      const japanDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
      )

      const year = japanDate.getFullYear()
      const month = japanDate.getMonth() + 1
      const day = japanDate.getDate()
      const hours = japanDate.getHours()
      const minutes = japanDate.getMinutes()

      // フォーマット後の値が有効かチェック
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hours) ||
        isNaN(minutes)
      ) {
        throw new Error('Invalid formatted date components')
      }

      const monthStr = String(month).padStart(2, '0')
      const dayStr = String(day).padStart(2, '0')
      const hoursStr = String(hours).padStart(2, '0')
      const minutesStr = String(minutes).padStart(2, '0')

      return `${year}年${monthStr}月${dayStr}日 ${hoursStr}:${minutesStr}`
    } catch (error) {
      logger.warn('Failed to format datetime, using original string', {
        isoString,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return isoString
    }
  }

  /**
   * エラーオブジェクトから詳細情報を抽出する
   */
  private extractErrorDetails(error: unknown): {
    message: string
    type: string
    code?: string
    stack?: string
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        type: error.name || 'Error',
        code: (error as any).code || undefined,
        stack: error.stack,
      }
    }

    if (typeof error === 'string') {
      return {
        message: error,
        type: 'StringError',
      }
    }

    if (error && typeof error === 'object') {
      const errorObj = error as any
      return {
        message:
          errorObj.message || errorObj.toString() || 'Unknown error object',
        type: errorObj.name || errorObj.constructor?.name || 'ObjectError',
        code: errorObj.code || errorObj.statusCode || undefined,
        stack: errorObj.stack,
      }
    }

    return {
      message: 'Unknown error occurred',
      type: 'UnknownError',
    }
  }
}
