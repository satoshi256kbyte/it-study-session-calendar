# Implementation Plan: オリジナルカレンダーUI

## Overview

Google カレンダー iframe 埋め込みを、自前実装のオリジナルカレンダー UI へ置き換える実装計画。

実装は次の順序で進める。まず UI から分離した純粋関数ユーティリティと型／変換関数を（プロパティベーステスト付きで）先に固め、次に UI コンポーネント（例示・RTL テスト付き）、続いて
`page.tsx` への統合、最後に既存統合テストの更新を行う。データ取得は `page.tsx` の
`useStudySessionEventsWithDefaults(pageUrl)` を再利用し、二重フェッチは導入しない（Requirement
2.8）。

バックエンド（`admin-backend`）の変更は不要。`getStudySessions` は `materials[].thumbnailUrl` を含む
`{ sessions }`
をそのまま返しており、必要なのはフロントエンドの型・変換更新のみである（design「Backend
Impact」参照）。したがって本計画にバックエンドタスクは含めない。

すべてのビルド・テストは `calendar/` パッケージ内で実行する（`npm run build` /
`npm run test:run`）。

## Tasks

- [x] 1. テスト基盤の準備（fast-check 導入）
  - `calendar/package.json` の devDependencies に `fast-check` を追加し、インストールする
  - 既存の Vitest 設定（`calendar/vitest.config.ts`）で `.property.test.ts`
    が実行対象に含まれることを確認する
  - _Requirements: 2.8_

- [x] 2. サムネイルURL検証ユーティリティ
  - [x] 2.1 `isDisplayableThumbnailUrl` を実装
    - `calendar/app/utils/thumbnailUrl.ts` を新規作成
    - undefined・空文字・空白のみ・非 http(s)・解析不能な URL は `false`、http/https の絶対 URL のみ
      `true` を返す（単一責任）
    - _Requirements: 6.1, 6.2, 7.4, 7.5_

  - [x] 2.2 `isDisplayableThumbnailUrl` のプロパティテスト
    - `calendar/app/utils/__tests__/thumbnailUrl.property.test.ts` を新規作成
    - **Property 6: サムネイル表示可否は URL の有効性と同値**
    - **Validates: Requirements 6.1, 6.2, 7.4, 7.5**
    - fast-check、`numRuns: 100`、タグ
      `Feature: 07-original-calendar-ui, Property 6: ...`。空文字・空白のみ・非 http(s)・不正 URL・正当な https を織り交ぜる

- [x] 3. フロントエンド型と変換関数の更新
  - [x] 3.1 `StudySessionApiResponse` / `StudySessionEvent` の型拡張と変換・型ガード更新
    - `calendar/app/types/studySessionEvent.ts` を編集
    - `StudySessionMaterialApiResponse` を追加、`StudySessionApiResponse` に任意 `materials?`
      を追加、`StudySessionEvent` に任意 `thumbnailUrl?` を追加
    - `convertApiResponseToStudySessionEvent` を更新し、`materials` の中で `thumbnailUrl`
      が非空文字列である最初の要素の値を単一の `thumbnailUrl` として派生（無ければ undefined）
    - `isValidStudySessionApiResponse` を、`materials`
      が存在する場合は配列であることのみ緩く検証するよう更新（正当なレスポンスを弾かない）
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 3.2 `convertApiResponseToStudySessionEvent` のプロパティテスト
    - `calendar/app/types/__tests__/studySessionEvent.property.test.ts` を新規作成
    - **Property 7: 変換後サムネイルは単一の非空文字列または未定義**
    - **Validates: Requirements 7.1**
    - fast-check、`numRuns: 100`、`materials` は任意の内容・順序で生成。タグ
      `Feature: 07-original-calendar-ui, Property 7: ...`

- [x] 4. 月計算・フィルタ・ソート・グルーピングの純粋関数ユーティリティ
  - [x] 4.1 `calendarMonth.ts` を実装
    - `calendar/app/utils/calendarMonth.ts` を新規作成
    - `YearMonth`
      型、`getCurrentYearMonthJst(now?: Date)`（時刻を注入可能にし、JST 射影で現在年月を算出）、`addMonths`（年ロールオーバー対応）、`getJstMonthRange`（JST 固定で月初含む／翌月初含まない半開区間を UTC の Date で構築）、`formatYearMonthLabel`
      （年＋月を可読形式で含む）を実装
    - `filterEventsInMonth`（Approved 絞り込み ＋ JST 月境界の半開区間判定。`Invalid Date` の
      `startDate`
      は静かに除外）、`sortEventsForDisplay`（開始日時昇順、同時刻はタイトル昇順で安定ソート。無効 startDate を除外）、`selectEventsForMonth`（filter＋sort 合成）、
      `groupEventsByJstDate`（JST 年月日キーでグルーピング）を実装
    - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3, 5.7_

  - [x] 4.2 `selectEventsForMonth` のプロパティテスト
    - `calendar/app/utils/__tests__/calendarMonth.property.test.ts` に追加
    - **Property 1: 月内表示対象は「承認済み」かつ「JST 月境界内」と同値**
    - **Validates: Requirements 2.3, 3.1, 3.4, 4.5**
    - `numRuns: 100`。月境界の等号・半開区間エッジ（末日 23:59:59.999 JST、翌月初 00:00:00
      JST）を確実に含める

  - [x] 4.3 `addMonths` のプロパティテスト
    - `calendar/app/utils/__tests__/calendarMonth.property.test.ts` に追加
    - **Property 2: 月移動は暦算術と一致し、前後移動は逆操作**
    - **Validates: Requirements 4.2, 4.3**
    - `numRuns: 100`

  - [x] 4.4 `getCurrentYearMonthJst` のプロパティテスト
    - `calendar/app/utils/__tests__/calendarMonth.property.test.ts` に追加
    - **Property 3: 初回表示月は与えられた時刻の JST 年月と一致**
    - **Validates: Requirements 3.2**
    - `numRuns: 100`。注入した Date に対し UTC+9 射影の年月と一致することを検証

  - [x] 4.5 `sortEventsForDisplay` のプロパティテスト
    - `calendar/app/utils/__tests__/calendarMonth.property.test.ts` に追加
    - **Property 4: 表示ソートは安定な昇順で入力の置換である**
    - **Validates: Requirements 5.1**
    - `numRuns: 100`

  - [x] 4.6 `groupEventsByJstDate` のプロパティテスト
    - `calendar/app/utils/__tests__/calendarMonth.property.test.ts` に追加
    - **Property 5: 日付グルーピングは入力の分割で、キーは JST 日付と一致し一意**
    - **Validates: Requirements 5.3**
    - `numRuns: 100`

  - [x] 4.7 `formatYearMonthLabel` のプロパティテスト
    - `calendar/app/utils/__tests__/calendarMonth.property.test.ts` に追加
    - **Property 8: 年月ラベルは対象の年と月を含む**
    - **Validates: Requirements 3.3, 4.4**
    - `numRuns: 100`

- [x] 5. チェックポイント - ユーティリティ・型層のテストを通す
  - `calendar/` で `npm run test:run` を実行し、Property
    1〜8 を含む全プロパティテストと既存テストがパスすることを確認する。問題があればユーザーに確認する。

- [x] 6. サムネイル表示コンポーネント
  - [x] 6.1 `EventThumbnail` を実装
    - `calendar/app/components/EventThumbnail.tsx` を新規作成
    - `isDisplayableThumbnailUrl(thumbnailUrl)` が真のときのみ `OptimizedThumbnail`
      （`variant="table"`、一辺 64px 以下）で表示。`onError`
      時はデフォルト代替画像を使わずレイアウトを保つ空プレースホルダにする（`ImageErrorFallback` /
      `OptimizedImage` の `onError` 挙動を利用）
    - `alt` はイベントタイトルを優先、空なら汎用ラベル。サムネイルなし時は装飾扱い（`aria-hidden`
      相当）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.4, 8.5_

  - [x] 6.2 `EventThumbnail` の例示・RTL テスト
    - `calendar/app/components/__tests__/EventThumbnail.test.tsx` を新規作成
    - 64px 以下の寸法、`onError`
      時の空プレースホルダ、alt のタイトル優先／汎用ラベルフォールバック、サムネイルなし時の装飾扱いを検証
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.4, 8.5_

- [x] 7. イベント行コンポーネント
  - [x] 7.1 `EventListItem` を実装
    - `calendar/app/components/EventListItem.tsx` を新規作成
    - 開始時刻（JST の時分）・タイトルを表示。`event.pageUrl` があればリンク（`target="_blank"` +
      `rel="noopener noreferrer"`）を提供。サムネイルは `EventThumbnail` に委譲
    - _Requirements: 5.2, 5.4_

  - [x] 7.2 `EventListItem` の例示・RTL テスト
    - `calendar/app/components/__tests__/EventListItem.test.tsx` を新規作成
    - 開始時刻（時分）・タイトルの表示、`pageUrl` 有無によるリンク表示の切り替えを検証
    - _Requirements: 5.2, 5.4_

- [x] 8. リストビューコンポーネント
  - [x] 8.1 `EventListView` を実装
    - `calendar/app/components/EventListView.tsx` を新規作成
    - `groupEventsByJstDate()`
      で日付ごとにグルーピングし、各日付見出しに「年月日 ＋ 曜日」を JST で表示。各行は
      `EventListItem` に委譲。1 件以上のときのみレンダリングされる前提（空状態は `MonthCalendar`
      側の責務）
    - モバイル（幅768px未満）は単一カラム、デスクトップ（768px以上）はデスクトップ向けレイアウトになるようレスポンシブ対応
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.2_

  - [x] 8.2 `EventListView` の例示・RTL テスト
    - `calendar/app/components/__tests__/EventListView.test.tsx` を新規作成
    - 同一日付のイベントが同一見出し下にまとまること、日付昇順表示、リンク提供を検証
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. 月カレンダー本体コンポーネント
  - [x] 9.1 `MonthCalendar` を実装
    - `calendar/app/components/MonthCalendar.tsx` を新規作成
    - `MonthCalendarProps`（`events` / `isLoading` / `error` / `isRetryable` / `onRetry` /
      `className?`）を受け取る。`displayedMonth` を `getCurrentYearMonthJst()` で初期化
    - 表示状態を「error → loading → empty →
      list」の優先順で分岐（エラーが空状態に優先）。エラー時は iframe へフォールバックせず、`isRetryable`
      のとき `onRetry` の再試行ボタンを提示。list 分岐では
      `selectEventsForMonth(events, displayedMonth)` を `EventListView` に渡す
    - 前月・翌月ボタン（`aria-label` 付与）と `formatYearMonthLabel` の年月表示。`isLoading`
      中は月移動を無視し `disabled` を付与。移動時は `addMonths` で `displayedMonth` を更新
    - _Requirements: 1.1, 1.4, 1.5, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5,
      4.6, 5.5, 8.3_

  - [x] 9.2 `MonthCalendar` の状態遷移・月移動 RTL テスト
    - `calendar/app/components/__tests__/MonthCalendar.test.tsx` を新規作成
    - 表示状態の優先順位（error > loading > empty >
      list）を状態別に検証。前月・翌月クリックでラベルが更新されること、読み込み中はクリックが無視されラベルが変わらないこと、月移動操作要素のアクセシブルネームを検証
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 2.6, 2.7, 4.1, 4.4, 4.6, 5.5, 8.3_

- [x] 10. チェックポイント - コンポーネント層のテストを通す
  - `calendar/` で `npm run test:run`
    を実行し、コンポーネントの例示・RTL テストがパスすることを確認する。問題があればユーザーに確認する。

- [x] 11. `page.tsx` への統合
  - [x] 11.1 iframe ブロックを `MonthCalendar` へ置き換え
    - `calendar/app/page.tsx` を編集
    - Google カレンダー `<iframe>` ブロックと `calendarUrl` によるローディング分岐を削除し、
      `<MonthCalendar events={events} isLoading={isEventsLoading} error={eventsError} isRetryable={isRetryable} onRetry={retry} />`
      を配置
    - `NEXT_PUBLIC_GOOGLE_CALENDAR_URL` を `src` に持つ `<iframe>` を DOM から完全に除去。
      `ResponsiveHeaderButtons`・`MobileRegisterSection`・`EventMaterialsList` は維持し、
      `useStudySessionEventsWithDefaults(pageUrl)` の呼び出しも維持
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 12. 既存統合テストの更新
  - [x] 12.1 `page.integration.test.tsx` を新 DOM 構造へ更新
    - `calendar/app/test/integration/page.integration.test.tsx` を編集
    - Google カレンダー iframe 関連アサーション（`getByTitle('広島IT勉強会カレンダー')` や `src` に
      `calendar.google.com` を含む等）を削除し、 `NEXT_PUBLIC_GOOGLE_CALENDAR_URL` を `src`
      に持つ iframe が 0 個であることを検証
    - `MonthCalendar`
      が描画されること、イベント資料一覧セクションとヘッダーボタンが同時に存在することを検証。見出しレベル等の構造アサーションを新 DOM 構造に合わせて調整
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 13. 最終チェックポイント - ビルドと全テストを通す
  - `calendar/` で `npm run build` と `npm run test:run`
    を実行し、ビルド成功と全テスト（プロパティ・例示・RTL・統合）のパスを確認する。問題があればユーザーに確認する。

## Notes

- `*` 付きサブタスクは任意（テスト）で、MVP を急ぐ場合はスキップ可能。ただし各 Correctness
  Property は単一のプロパティベーステストで実装する方針
- 各タスクはトレーサビリティのため具体的な要件番号を参照する
- チェックポイントで段階的に検証する
- プロパティテストは fast-check・`numRuns: 100`・タグ
  `Feature: 07-original-calendar-ui, Property N: ...` を付与する
- JST 現在月の算出は時刻注入可能（`getCurrentYearMonthJst(now?: Date)`）にしてテストを決定的にする
- バックエンド（`admin-backend`）の変更は不要のためタスクに含めない

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2", "11.1"] },
    { "id": 8, "tasks": ["12.1"] }
  ]
}
```
