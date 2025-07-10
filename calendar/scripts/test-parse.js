#!/usr/bin/env node

/**
 * Issue form解析のテスト用スクリプト
 */

// テスト用のIssue form出力（GitHub Issue formsが生成する形式）
const testIssueBody = `### 勉強会タイトル

広島JavaScript勉強会 #42

### 勉強会ページのリンク

https://connpass.com/event/123456/

### 開催日時

2024年7月15日 19:00-21:00

### 確認事項

- [X] 広島で開催される（またはオンラインで広島のコミュニティが主催する）勉強会であることを確認しました
- [X] 勉強会の情報に間違いがないことを確認しました
- [X] 勉強会ページのリンクが正しく動作することを確認しました
- [X] 開催日時が正確であることを確認しました`

const testIssueTitle = '[広島勉強会登録] 広島JavaScript勉強会 #42'

// 環境変数を設定
process.env.ISSUE_BODY = testIssueBody
process.env.ISSUE_TITLE = testIssueTitle
process.env.GOOGLE_CALENDAR_API_KEY = 'test-api-key'
process.env.GOOGLE_CALENDAR_ID = 'test-calendar-id'

// メインスクリプトを読み込んで実行
const fs = require('fs')
const path = require('path')

// add-to-calendar.jsの内容を読み込み、実際のAPI呼び出し部分をモックに置き換え
const scriptPath = path.join(__dirname, 'add-to-calendar.js')
let scriptContent = fs.readFileSync(scriptPath, 'utf8')

// createCalendarEvent関数をモックに置き換え
scriptContent = scriptContent.replace(
  /function createCalendarEvent\(eventData\) {[\s\S]*?^}/m,
  `function createCalendarEvent(eventData) {
  return Promise.resolve({
    htmlLink: 'https://calendar.google.com/calendar/event?eid=test123',
    id: 'test-event-id'
  });
}`
)

// スクリプトを実行
eval(scriptContent)
