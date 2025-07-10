import { StudySession } from '../types/StudySession'
import * as jwt from 'jsonwebtoken'

// Updated: 2025-07-10 - Using jsonwebtoken library for proper JWT generation
export class GoogleCalendarService {
  private calendarId: string
  private serviceAccountEmail: string
  private privateKey: string

  constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || ''
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
    this.privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(
      /\\n/g,
      '\n'
    )
  }

  private async getAccessToken(): Promise<string> {
    try {
      console.log('Generating JWT token...')
      const now = Math.floor(Date.now() / 1000)

      const payload = {
        iss: this.serviceAccountEmail,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }

      console.log('JWT payload:', JSON.stringify(payload, null, 2))
      console.log('Service account email:', this.serviceAccountEmail)
      console.log('Private key length:', this.privateKey.length)

      // jsonwebtokenライブラリを使用してJWTを生成
      const token = jwt.sign(payload, this.privateKey, {
        algorithm: 'RS256',
      })

      console.log('JWT token generated, requesting access token...')

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
      })

      console.log('OAuth response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OAuth error response:', errorText)
        throw new Error(
          `OAuth token request failed: ${response.status} - ${errorText}`
        )
      }

      const tokenData = (await response.json()) as { access_token: string }
      console.log('Access token obtained successfully')
      return tokenData.access_token
    } catch (error) {
      console.error('Error in getAccessToken:', error)
      throw error
    }
  }

  async addEventToCalendar(session: StudySession): Promise<string> {
    try {
      console.log('Starting calendar event creation for session:', session.id)

      const dateTimeInfo = this.parseDateTimeString(
        session.datetime,
        session.endDatetime
      )
      console.log('Parsed datetime info:', dateTimeInfo)

      console.log('Getting access token...')
      const accessToken = await this.getAccessToken()
      console.log('Access token obtained successfully')

      // イベントの説明を構築
      let description = `詳細: ${session.url}`
      if (session.contact) {
        description += `\n連絡先: ${session.contact}`
      }

      const event = {
        summary: session.title,
        description: description,
        start: dateTimeInfo.start,
        end: dateTimeInfo.end,
        location: '広島',
      }

      console.log('Creating calendar event:', JSON.stringify(event, null, 2))
      console.log('Calendar ID:', this.calendarId)

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(event),
        }
      )

      console.log('Calendar API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Calendar API error response:', errorText)
        throw new Error(
          `Google Calendar API Error: ${response.status} - ${errorText}`
        )
      }

      const result = (await response.json()) as { htmlLink?: string }
      console.log('Calendar event created successfully:', result.htmlLink)
      return result.htmlLink || ''
    } catch (error) {
      console.error('Failed to add event to calendar - detailed error:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      throw new Error(
        `カレンダーへの追加に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private parseDateTimeString(
    dateTimeStr: string,
    endDateTimeStr?: string
  ): {
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
  } {
    try {
      // ISO 8601形式の場合（例: "2025-07-15T19:00:00Z"）
      const startDate = new Date(dateTimeStr)
      if (!isNaN(startDate.getTime())) {
        let endDate: Date

        if (endDateTimeStr) {
          // 終了日時が指定されている場合
          endDate = new Date(endDateTimeStr)
          if (isNaN(endDate.getTime())) {
            // 終了日時の解析に失敗した場合は2時間後をデフォルトとする
            endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
          }
        } else {
          // 終了日時が指定されていない場合は2時間後をデフォルトとする
          endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
        }

        return {
          start: {
            dateTime: startDate.toISOString(),
            timeZone: 'Asia/Tokyo',
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: 'Asia/Tokyo',
          },
        }
      }
    } catch (error) {
      // ISO形式でない場合は従来の日本語形式を試す
    }

    // 日本語形式の解析: "2024年7月15日 19:00-21:00"
    const dateMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)

    if (!dateMatch || !timeMatch) {
      throw new Error(`日時の形式が正しくありません: ${dateTimeStr}`)
    }

    const year = parseInt(dateMatch[1])
    const month = parseInt(dateMatch[2]) - 1 // JavaScriptの月は0ベース
    const day = parseInt(dateMatch[3])
    const startHour = parseInt(timeMatch[1])
    const startMinute = parseInt(timeMatch[2])
    const endHour = parseInt(timeMatch[3])
    const endMinute = parseInt(timeMatch[4])

    const startDate = new Date(year, month, day, startHour, startMinute)
    const endDate = new Date(year, month, day, endHour, endMinute)

    return {
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
    }
  }
}
