# 設計書

## 概要

イベント資料一覧機能は、カレンダーページの下部に過去6ヶ月分のconnpassイベントで資料があるもののみを表示するコンポーネントです。この機能は、管理者システムのDynamoDBから事前にバッチ処理で収集された資料データを取得し、レスポンシブなテーブル形式で表示します。connpass以外のイベントや資料がないイベントは表示対象外とします。

## アーキテクチャ

### システム構成

```
[カレンダーページ (Next.js)]
    ↓ HTTP Request
[管理者バックエンド API (Lambda + API Gateway)]
    ↓ Query
[DynamoDB (イベント・資料データ)]
    ↑ Batch Update
[connpass API v2 (外部API)]
```

### データフロー

1. **表示時**: カレンダーページ → 管理者API → DynamoDB
   → レスポンス（connpassイベントで資料があるもののみ）
2. **資料収集**: EventBridge → バッチLambda → connpass API → DynamoDB（日次実行）

## コンポーネント設計

### フロントエンド コンポーネント

#### EventMaterialsList コンポーネント

- **責任**: イベント資料一覧の表示とユーザーインタラクション
- **場所**: `calendar/app/components/EventMaterialsList.tsx`
- **Props**: なし（内部でAPIを呼び出し）

#### EventMaterialsTable コンポーネント

- **責任**: テーブル形式でのイベントデータ表示
- **場所**: `calendar/app/components/EventMaterialsTable.tsx`
- **Props**: `events: EventWithMaterials[]`, `loading: boolean`

#### MaterialLink コンポーネント

- **責任**: 個別の資料リンクとサムネイル表示（サムネイルは利用可能な場合のみ、過度な視覚効果は不要）
- **場所**: `calendar/app/components/MaterialLink.tsx`
- **Props**: `material: Material`, `eventTitle: string`

### バックエンド API

#### GET /api/events/materials エンドポイント

- **責任**: 過去6ヶ月分のconnpassイベントで資料があるもののみを返す
- **場所**: `admin-backend/src/handlers/eventMaterialsHandlers.ts`
- **レスポンス**: `EventWithMaterials[]`（connpassイベントかつ資料ありのもののみ）

## データモデル

### EventWithMaterials インターフェース

```typescript
interface EventWithMaterials {
  id: string
  title: string
  eventDate: string // ISO 8601 format
  eventUrl: string
  materials: Material[] // 空でない配列（資料があるもののみ表示対象）
  connpassUrl: string // 必須（connpassイベントのみ対象）
}

interface Material {
  id: string
  title: string
  url: string
  thumbnailUrl?: string
  type: 'slide' | 'document' | 'video' | 'other'
  createdAt: string
}
```

### DynamoDB テーブル設計

#### Events テーブル

- **パーティションキー**: `eventId` (String)
- **属性**:
  - `title` (String) - イベントタイトル
  - `eventDate` (String) - 開催日時 (ISO 8601)
  - `eventUrl` (String) - イベントページURL
  - `connpassUrl` (String) - connpass URL (必須、connpassイベントのみ対象)
  - `status` (String) - 'approved' | 'pending' | 'rejected'
  - `materials` (List) - 資料情報の配列
  - `createdAt` (String) - 作成日時
  - `updatedAt` (String) - 更新日時

#### GSI: EventsByDate

- **パーティションキー**: `status` (String)
- **ソートキー**: `eventDate` (String)
- **用途**: 承認済みイベントを日付順で取得

## API設計

### フロントエンド API呼び出し

#### イベント資料一覧取得

```typescript
// GET /api/events/materials?months=6
const response = await fetch('/api/events/materials?months=6')
const events: EventWithMaterials[] = await response.json()
```

### バックエンド API実装

#### Lambda関数: getEventMaterials

```typescript
export const getEventMaterials = async (event: APIGatewayProxyEvent) => {
  const months = parseInt(event.queryStringParameters?.months || '6')
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - months)

  // DynamoDBから承認済みのconnpassイベントで資料があるもののみを取得
  const events = await dynamoDBService.queryEventsByDateRange(
    'approved',
    cutoffDate.toISOString(),
    new Date().toISOString()
  )

  // connpassイベントかつ資料があるもののみをフィルタリング
  const filteredEvents = events.filter(
    event => event.connpassUrl && event.materials && event.materials.length > 0
  )

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filteredEvents),
  }
}
```

## エラーハンドリング

### フロントエンド エラー処理

1. **ネットワークエラー**: 再試行ボタン付きエラーメッセージ表示
2. **データなし**: 「該当期間に資料のあるconnpassイベントがありません」メッセージ表示
3. **読み込み中**: シンプルなローディング表示（過度な視覚効果は不要）

### バックエンド エラー処理

1. **DynamoDB エラー**: ログ出力 + 500エラーレスポンス
2. **パラメータエラー**: 400エラーレスポンス
3. **認証エラー**: 401エラーレスポンス

## テスト戦略

### ユニットテスト

#### フロントエンド

- **EventMaterialsList**: APIコール、状態管理、エラーハンドリング
- **EventMaterialsTable**: データ表示、ソート機能
- **MaterialLink**: リンク生成、サムネイル表示

#### バックエンド

- **getEventMaterials**: DynamoDBクエリ、日付フィルタリング
- **DynamoDBService**: CRUD操作、エラーハンドリング

### 統合テスト

1. **API統合**: フロントエンド ↔ バックエンド API
2. **データベース統合**: Lambda ↔ DynamoDB
3. **外部API統合**: バッチLambda ↔ connpass API（フロントエンドからは直接呼び出し禁止）

### E2Eテスト

1. **ページ表示**: カレンダーページでイベント資料一覧が正しく表示される
2. **レスポンシブ**: モバイル・デスクトップでの表示確認
3. **リンク動作**: 資料リンクが新しいタブで開く

## パフォーマンス考慮事項

### フロントエンド最適化

1. **遅延読み込み**: カレンダー表示後に資料一覧を非同期読み込み
2. **キャッシュ**: SWRまたはReact Queryでデータキャッシュ
3. **シンプルな表示**: 過度な視覚効果を避けたシンプルな実装

### バックエンド最適化

1. **DynamoDB最適化**: GSIを使用した効率的なクエリ
2. **レスポンスキャッシュ**: CloudFrontでのAPIレスポンスキャッシュ
3. **ページネーション**: 大量データ対応（将来的）

## セキュリティ考慮事項

### CORS設定

- 許可オリジン: GitHub Pagesドメインのみ
- 許可メソッド: GET のみ
- 許可ヘッダー: Content-Type, Authorization

### データ検証

- 入力パラメータの検証（months パラメータの範囲チェック）
- SQLインジェクション対策（DynamoDBのため基本的に不要）
- XSS対策（フロントエンドでのサニタイゼーション）

## 実装順序

1. **データモデル定義**: TypeScript型定義
2. **バックエンドAPI**: Lambda関数とDynamoDBサービス（connpassイベント+資料ありのフィルタリング）
3. **フロントエンドコンポーネント**: シンプルな表示機能（過度な視覚効果なし）
4. **スタイリング**: レスポンシブデザイン（サムネイルは利用可能な場合のみ）
5. **エラーハンドリング**: エラー状態の処理
6. **テスト**: ユニット・統合テスト
7. **バッチ処理**: connpass API呼び出しはバッチのみ
