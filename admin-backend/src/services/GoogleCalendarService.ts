import { StudySession } from '../types/StudySession'

export class GoogleCalendarService {
  private calendarId: string
  private apiKey: string

  constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || ''
    this.apiKey = process.env.GOOGLE_CALENDAR_API_KEY || ''
  }

  async addEventToCalendar(session: StudySession): Promise<string> {
    try {
      const dateTimeInfo = this.parseDateTimeString(session.datetime)
      
      const event = {
        summary: session.title,
        description: `詳細: ${session.url}`,
        start: dateTimeInfo.start,
        end: dateTimeInfo.end,
        location: '広島'
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Google Calendar API Error: ${response.status} - ${errorText}`)
      }

      const result = await response.json() as { htmlLink?: string }
      return result.htmlLink || ''
    } catch (error) {
      console.error('Failed to add event to calendar:', error)
      throw new Error('カレンダーへの追加に失敗しました')
    }
  }

  private parseDateTimeString(dateTimeStr: string): {
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
  } {
    // 日付の解析: "2024年7月15日 19:00-21:00"
    const dateMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
    
    if (!dateMatch || !timeMatch) {
      throw new Error('日時の形式が正しくありません')
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
        timeZone: 'Asia/Tokyo'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Tokyo'
      }
    }
  }
}
