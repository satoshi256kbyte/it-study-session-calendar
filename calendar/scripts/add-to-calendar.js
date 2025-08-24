#!/usr/bin/env node

/**
 * GitHub IssueからGoogle Calendarにイベントを追加するスクリプト
 * GitHub Actionsから呼び出される
 */

const https = require('https')

// 環境変数から設定を取得
const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
const ISSUE_BODY = process.env.ISSUE_BODY
const ISSUE_TITLE = process.env.ISSUE_TITLE

/**
 * Issue form から勉強会情報を解析
 * GitHub Issue formsの出力形式を解析
 */
function parseIssueBody(body) {
  let title = ''
  let url = ''
  let dateTime = ''

  // Issue formsの出力は以下のような形式:
  // ### 勉強会タイトル
  //
  // 広島JavaScript勉強会 #42
  //
  // ### 勉強会ページのリンク
  //
  // https://connpass.com/event/123456/
  //
  // ### 開催日時
  //
  // 2024年7月15日 19:00-21:00

  const lines = body.split('\n').map(line => line.trim())
  let currentField = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // フィールドの識別（Issue formsの見出し形式）
    if (line === '### 勉強会タイトル') {
      currentField = 'title'
      continue
    } else if (line === '### 勉強会ページのリンク') {
      currentField = 'url'
      continue
    } else if (line === '### 開催日時') {
      currentField = 'datetime'
      continue
    } else if (line.startsWith('###')) {
      currentField = ''
      continue
    }

    // 空行をスキップ
    if (line === '') {
      continue
    }

    // 各フィールドの値を取得（空行の後の最初の非空行）
    if (currentField && line) {
      switch (currentField) {
        case 'title':
          if (!title) title = line
          break
        case 'url':
          if (!url) url = line
          break
        case 'datetime':
          if (!dateTime) dateTime = line
          break
      }
    }
  }

  return {
    title: title || ISSUE_TITLE.replace('[広島勉強会登録] ', ''),
    url,
    dateTime,
  }
}

/**
 * 日時文字列をISO形式に変換
 * 例: "2024年7月15日 19:00-21:00" -> start/end DateTimeオブジェクト
 */
function parseDateTimeString(dateTimeStr) {
  try {
    // 日付の解析: "2024年7月15日" または "2024/7/15"
    const dateMatch = dateTimeStr.match(
      /(\d{4})[年\/](\d{1,2})[月\/](\d{1,2})[日]?/
    )
    if (!dateMatch) {
      throw new Error('日付の形式が正しくありません')
    }

    const year = parseInt(dateMatch[1])
    const month = parseInt(dateMatch[2]) - 1 // JavaScriptの月は0ベース
    const day = parseInt(dateMatch[3])

    // 時間の解析: "19:00-21:00" または "19:00～21:00"
    const timeMatch = dateTimeStr.match(
      /(\d{1,2}):(\d{2})[-～〜](\d{1,2}):(\d{2})/
    )
    if (!timeMatch) {
      // 開始時間のみの場合（終了時間は2時間後と仮定）
      const singleTimeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})/)
      if (singleTimeMatch) {
        const startHour = parseInt(singleTimeMatch[1])
        const startMinute = parseInt(singleTimeMatch[2])
        const endHour = startHour + 2 // 2時間後
        const endMinute = startMinute

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
      throw new Error('時間の形式が正しくありません')
    }

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
  } catch (error) {
    console.error('日時解析エラー:', error.message)
    throw error
  }
}

/**
 * Google Calendar APIを使ってイベントを作成
 */
function createCalendarEvent(eventData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(eventData)

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: `/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_CALENDAR_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }

    const req = https.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`))
        }
      })
    })

    req.on('error', error => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('Parsing issue content...')
    console.log('Issue body:', ISSUE_BODY)

    const issueData = parseIssueBody(ISSUE_BODY)
    console.log('Parsed data:', issueData)

    if (!issueData.title || !issueData.dateTime) {
      throw new Error('必須項目（タイトル、開催日時）が不足しています')
    }

    const dateTimeInfo = parseDateTimeString(issueData.dateTime)

    // カレンダーイベントデータを作成
    const eventData = {
      summary: issueData.title,
      description: issueData.url ? `${issueData.url}` : '',
      ...dateTimeInfo,
    }

    console.log('Creating calendar event...')
    console.log('Event data:', JSON.stringify(eventData, null, 2))

    const result = await createCalendarEvent(eventData)
    console.log('Event created successfully:', result.htmlLink)

    // GitHub Actionsの出力として設定
    console.log(`::set-output name=event_url::${result.htmlLink}`)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

// 環境変数のチェック
if (!GOOGLE_CALENDAR_API_KEY || !GOOGLE_CALENDAR_ID || !ISSUE_BODY) {
  console.error('Required environment variables are missing')
  console.error('GOOGLE_CALENDAR_API_KEY:', !!GOOGLE_CALENDAR_API_KEY)
  console.error('GOOGLE_CALENDAR_ID:', !!GOOGLE_CALENDAR_ID)
  console.error('ISSUE_BODY:', !!ISSUE_BODY)
  process.exit(1)
}

main()
