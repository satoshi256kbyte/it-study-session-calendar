#!/usr/bin/env node

/**
 * GitHub IssueからGoogle Calendarにイベントを追加するスクリプト
 * GitHub Actionsから呼び出される
 */

const https = require('https');

// 環境変数から設定を取得
const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const ISSUE_BODY = process.env.ISSUE_BODY;
const ISSUE_TITLE = process.env.ISSUE_TITLE;

/**
 * Issue本文から勉強会情報を解析
 */
function parseIssueBody(body) {
  const lines = body.split('\n');
  let title = '';
  let url = '';
  let dateTime = '';
  let location = '';
  let description = '';

  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('### 勉強会タイトル')) {
      currentSection = 'title';
      continue;
    } else if (trimmedLine.includes('### 勉強会ページのリンク')) {
      currentSection = 'url';
      continue;
    } else if (trimmedLine.includes('### 開催日時')) {
      currentSection = 'datetime';
      continue;
    } else if (trimmedLine.includes('### 開催場所')) {
      currentSection = 'location';
      continue;
    } else if (trimmedLine.includes('### 概要')) {
      currentSection = 'description';
      continue;
    } else if (trimmedLine.startsWith('###') || trimmedLine.startsWith('##')) {
      currentSection = '';
      continue;
    }

    // コメント行や空行をスキップ
    if (trimmedLine.startsWith('<!--') || trimmedLine === '' || trimmedLine.startsWith('---')) {
      continue;
    }

    // 各セクションの内容を取得
    switch (currentSection) {
      case 'title':
        if (trimmedLine) title = trimmedLine;
        break;
      case 'url':
        if (trimmedLine) url = trimmedLine;
        break;
      case 'datetime':
        if (trimmedLine) dateTime = trimmedLine;
        break;
      case 'location':
        if (trimmedLine) location = trimmedLine;
        break;
      case 'description':
        if (trimmedLine) description += trimmedLine + '\n';
        break;
    }
  }

  return {
    title: title || ISSUE_TITLE.replace('[勉強会登録] ', ''),
    url,
    dateTime,
    location,
    description: description.trim()
  };
}

/**
 * 日時文字列をISO形式に変換
 * 例: "2024年7月15日（月） 19:00-21:00" -> start/end DateTimeオブジェクト
 */
function parseDateTimeString(dateTimeStr) {
  // 簡単な実装例（実際はより堅牢な解析が必要）
  const dateMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  
  if (!dateMatch || !timeMatch) {
    throw new Error('日時の形式が正しくありません');
  }

  const year = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1; // JavaScriptの月は0ベース
  const day = parseInt(dateMatch[3]);
  const startHour = parseInt(timeMatch[1]);
  const startMinute = parseInt(timeMatch[2]);
  const endHour = parseInt(timeMatch[3]);
  const endMinute = parseInt(timeMatch[4]);

  const startDate = new Date(year, month, day, startHour, startMinute);
  const endDate = new Date(year, month, day, endHour, endMinute);

  return {
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Asia/Tokyo'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Asia/Tokyo'
    }
  };
}

/**
 * Google Calendar APIを使ってイベントを作成
 */
function createCalendarEvent(eventData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(eventData);
    
    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: `/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_CALENDAR_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('Parsing issue content...');
    const issueData = parseIssueBody(ISSUE_BODY);
    console.log('Parsed data:', issueData);

    if (!issueData.title || !issueData.dateTime) {
      throw new Error('必須項目（タイトル、開催日時）が不足しています');
    }

    const dateTimeInfo = parseDateTimeString(issueData.dateTime);
    
    const eventData = {
      summary: issueData.title,
      description: `${issueData.description}\n\n詳細: ${issueData.url}`,
      location: issueData.location,
      ...dateTimeInfo
    };

    console.log('Creating calendar event...');
    const result = await createCalendarEvent(eventData);
    console.log('Event created successfully:', result.htmlLink);
    
    // GitHub Actionsの出力として設定
    console.log(`::set-output name=event_url::${result.htmlLink}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// 環境変数のチェック
if (!GOOGLE_CALENDAR_API_KEY || !GOOGLE_CALENDAR_ID || !ISSUE_BODY) {
  console.error('Required environment variables are missing');
  process.exit(1);
}

main();
