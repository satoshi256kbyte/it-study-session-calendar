import { logger } from './logger'
import { ConnpassEventData } from '../types/EventMaterial'
import { CreateStudySessionRequest } from '../types/StudySession'

/**
 * connpassイベントデータからStudySession作成リクエストへの変換ユーティリティ
 * 要件1.2, 3.1, 3.5に対応
 */

/**
 * ISO 8601日時文字列の検証
 * 要件3.5に対応
 */
export function validateISODateTime(dateTimeString: string): boolean {
  try {
    const date = new Date(dateTimeString)

    // 有効な日付かチェック
    if (isNaN(date.getTime())) {
      return false
    }

    // ISO 8601形式かチェック（基本的な形式のみ）
    const isoRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/
    return isoRegex.test(dateTimeString)
  } catch (error) {
    logger.debug(`Invalid date format: ${dateTimeString}`, error)
    return false
  }
}

/**
 * 日時文字列をISO 8601形式に変換
 * 要件3.5に対応
 */
export function convertToISODateTime(dateTimeString: string): string {
  try {
    const date = new Date(dateTimeString)

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateTimeString}`)
    }

    return date.toISOString()
  } catch (error) {
    logger.error(
      `Failed to convert date to ISO format: ${dateTimeString}`,
      error
    )
    throw new Error(`Date conversion failed: ${dateTimeString}`)
  }
}

/**
 * connpass URLの検証
 * connpass.comドメインのイベントURLかチェック
 */
export function validateConnpassUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)

    // HTTPSプロトコルのみ許可（セキュリティ上の理由）
    if (urlObj.protocol !== 'https:') {
      return false
    }

    // connpass.comドメインかチェック
    if (
      urlObj.hostname !== 'connpass.com' &&
      !urlObj.hostname.endsWith('.connpass.com')
    ) {
      return false
    }

    // イベントURLの形式かチェック (/event/{id}/)
    const eventIdMatch = url.match(/\/event\/\d+\/?/)
    return eventIdMatch !== null
  } catch (error) {
    logger.debug(`Invalid connpass URL: ${url}`, error)
    return false
  }
}

/**
 * ConnpassEventDataからCreateStudySessionRequestへの変換
 * 要件1.2, 3.1に対応
 */
export function convertConnpassEventToStudySessionRequest(
  eventData: ConnpassEventData
): CreateStudySessionRequest {
  logger.debug(
    `Converting connpass event to StudySession request: ${eventData.title}`
  )

  try {
    // 必須フィールドの検証
    if (!eventData.title || !eventData.event_url || !eventData.started_at) {
      throw new Error('Missing required fields in connpass event data')
    }

    // connpass URLの検証
    if (!validateConnpassUrl(eventData.event_url)) {
      throw new Error(`Invalid connpass URL: ${eventData.event_url}`)
    }

    // 開始日時の検証と変換
    let datetime: string
    if (validateISODateTime(eventData.started_at)) {
      datetime = eventData.started_at
    } else {
      datetime = convertToISODateTime(eventData.started_at)
    }

    // 終了日時の検証と変換（オプショナル）
    let endDatetime: string | undefined
    if (eventData.ended_at) {
      if (validateISODateTime(eventData.ended_at)) {
        endDatetime = eventData.ended_at
      } else {
        endDatetime = convertToISODateTime(eventData.ended_at)
      }
    }

    const request: CreateStudySessionRequest = {
      title: eventData.title,
      url: eventData.event_url,
      datetime: datetime,
      endDatetime: endDatetime,
      // contactは設定しない（connpass APIには含まれない）
    }

    logger.debug(`Successfully converted connpass event: ${eventData.title}`)
    return request
  } catch (error) {
    logger.error(`Failed to convert connpass event: ${eventData.title}`, error)
    throw error
  }
}

/**
 * 複数のConnpassEventDataを一括変換
 * エラーが発生したイベントはスキップして処理を継続
 * 要件1.2, 3.1に対応
 */
export function convertMultipleConnpassEvents(events: ConnpassEventData[]): {
  successful: CreateStudySessionRequest[]
  failed: { event: ConnpassEventData; error: string }[]
} {
  logger.debug(`Converting ${events.length} connpass events`)

  const successful: CreateStudySessionRequest[] = []
  const failed: { event: ConnpassEventData; error: string }[] = []

  for (const event of events) {
    try {
      const converted = convertConnpassEventToStudySessionRequest(event)
      successful.push(converted)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      logger.warn(`Failed to convert event ${event.title}: ${errorMessage}`)
      failed.push({ event, error: errorMessage })
    }
  }

  logger.debug(
    `Conversion completed: ${successful.length} successful, ${failed.length} failed`
  )

  return { successful, failed }
}

/**
 * 日時の妥当性チェック（未来の日付かどうか）
 * 過去のイベントを除外する場合に使用
 */
export function isFutureEvent(dateTimeString: string): boolean {
  try {
    const eventDate = new Date(dateTimeString)
    const now = new Date()

    return eventDate > now
  } catch (error) {
    logger.debug(
      `Failed to check if event is in future: ${dateTimeString}`,
      error
    )
    return false
  }
}

/**
 * 日時の妥当性チェック（指定期間内かどうか）
 * 検索結果のフィルタリングに使用
 */
export function isWithinDateRange(
  dateTimeString: string,
  startDate: Date,
  endDate: Date
): boolean {
  try {
    const eventDate = new Date(dateTimeString)

    return eventDate >= startDate && eventDate <= endDate
  } catch (error) {
    logger.debug(`Failed to check date range: ${dateTimeString}`, error)
    return false
  }
}
