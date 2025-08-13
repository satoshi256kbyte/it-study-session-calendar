// カレンダーからイベントを抽出するユーティリティ

export interface CalendarEvent {
  date: string
  title: string
  time?: string
}

export class CalendarExtractor {
  /**
   * iframeからカレンダーイベントを抽出する
   */
  static async extractFromIframe(
    iframe: HTMLIFrameElement
  ): Promise<CalendarEvent[]> {
    try {
      const iframeDocument =
        iframe.contentDocument || iframe.contentWindow?.document

      if (!iframeDocument) {
        throw new Error(
          'Cannot access iframe content due to cross-origin restrictions'
        )
      }

      return this.parseCalendarHTML(iframeDocument)
    } catch (error) {
      console.warn('Direct iframe access failed:', error)
      return []
    }
  }

  /**
   * HTMLドキュメントからカレンダーイベントを解析する
   */
  private static parseCalendarHTML(document: Document): CalendarEvent[] {
    const events: CalendarEvent[] = []

    // Googleカレンダーの埋め込みHTMLの一般的なセレクタを試行
    const selectors = [
      '[data-eventid]',
      '.event',
      '[role="gridcell"] .event',
      '.calendar-event',
      '[data-date] .event-title',
      '.goog-date-picker-date',
    ]

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)

      elements.forEach(element => {
        const event = this.extractEventFromElement(element)
        if (event) {
          events.push(event)
        }
      })

      if (events.length > 0) break
    }

    return this.sortAndDeduplicateEvents(events)
  }

  /**
   * DOM要素からイベント情報を抽出する
   */
  private static extractEventFromElement(
    element: Element
  ): CalendarEvent | null {
    try {
      // タイトルを取得
      const titleSelectors = [
        '.event-title',
        '.title',
        '.summary',
        '[data-title]',
      ]
      let title = ''

      for (const selector of titleSelectors) {
        const titleElement =
          element.querySelector(selector) ||
          (element.matches(selector) ? element : null)
        if (titleElement && titleElement.textContent) {
          title = titleElement.textContent.trim()
          break
        }
      }

      if (!title && element.textContent) {
        title = element.textContent.trim()
      }

      if (!title) return null

      // 日付を取得
      const dateSelectors = [
        '[data-date]',
        '.date',
        '.event-date',
        '[datetime]',
        '.goog-date-picker-date',
      ]

      let date = ''

      for (const selector of dateSelectors) {
        const dateElement =
          element.querySelector(selector) || element.closest(selector)

        if (dateElement) {
          const dateAttr =
            dateElement.getAttribute('data-date') ||
            dateElement.getAttribute('datetime') ||
            dateElement.textContent

          if (dateAttr) {
            date = this.parseDate(dateAttr)
            if (date) break
          }
        }
      }

      // 時間を取得（オプション）
      const timeSelectors = ['.time', '.event-time', '[data-time]']
      let time = ''

      for (const selector of timeSelectors) {
        const timeElement = element.querySelector(selector)
        if (timeElement && timeElement.textContent) {
          time = timeElement.textContent.trim()
          break
        }
      }

      return { date: date || '', title, time }
    } catch (error) {
      console.warn('Error extracting event from element:', error)
      return null
    }
  }

  /**
   * 日付文字列を月/日形式に変換する
   */
  private static parseDate(dateStr: string): string {
    try {
      // 様々な日付形式に対応
      const patterns = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})\/(\d{1,2})/, // MM/DD
        /(\d{1,2})-(\d{1,2})/, // MM-DD
      ]

      for (const pattern of patterns) {
        const match = dateStr.match(pattern)
        if (match) {
          if (match.length === 4) {
            // YYYY-MM-DD形式
            const month = parseInt(match[2])
            const day = parseInt(match[3])
            return `${month}/${day}`
          } else if (match.length === 3) {
            // MM/DD形式
            const month = parseInt(match[1])
            const day = parseInt(match[2])
            return `${month}/${day}`
          }
        }
      }

      // 日付として解析を試行
      const parsedDate = new Date(dateStr)
      if (!isNaN(parsedDate.getTime())) {
        const month = parsedDate.getMonth() + 1
        const day = parsedDate.getDate()
        return `${month}/${day}`
      }

      return ''
    } catch (error) {
      console.warn('Error parsing date:', dateStr, error)
      return ''
    }
  }

  /**
   * イベントをソートして重複を除去する
   */
  private static sortAndDeduplicateEvents(
    events: CalendarEvent[]
  ): CalendarEvent[] {
    // 重複を除去
    const uniqueEvents = events.filter(
      (event, index, self) =>
        index ===
        self.findIndex(e => e.date === event.date && e.title === event.title)
    )

    // 日付順にソート
    return uniqueEvents.sort((a, b) => {
      if (!a.date || !b.date) return 0

      const [aMonth, aDay] = a.date.split('/').map(Number)
      const [bMonth, bDay] = b.date.split('/').map(Number)

      if (aMonth !== bMonth) return aMonth - bMonth
      return aDay - bDay
    })
  }

  /**
   * イベント配列をマークダウン形式に変換する
   */
  static eventsToMarkdown(events: CalendarEvent[]): string {
    if (events.length === 0) {
      return 'カレンダーからイベントを抽出できませんでした。'
    }

    return events
      .filter(event => event.date && event.title)
      .map(event => {
        const timeStr = event.time ? ` (${event.time})` : ''
        return `${event.date} ${event.title}${timeStr}`
      })
      .join('\n')
  }

  /**
   * フォールバック用のサンプルデータを生成する
   */
  static generateSampleMarkdown(): string {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1

    const sampleEvents = [
      `${currentMonth}/23 オープンセミナー2025@広島 − 君はどこで動かすか？`,
      `${currentMonth}/27 「生成AI × リアル事例で業務改革」DXセミナー`,
      `${currentMonth}/27 すごい広島 with Python[101]`,
      `${currentMonth}/30 PyLadies Caravan in 広島 2nd`,
    ]

    return sampleEvents.join('\n')
  }
}
