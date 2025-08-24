# 設計書

## 概要

X(旧Twitter)シェアボタン機能は、既存のカレンダーアプリケーションにインテリジェントなイベント共有機能を追加します。この機能は現在のGoogleカレンダーデータソースと統合し、ユーザーが今後のIT勉強会を適切にフォーマットされたコンテンツでTwitter/Xに1クリックで共有できるようにします。

## アーキテクチャ

### 高レベルアーキテクチャ

X(旧Twitter)シェア機能は、既存のイベントデータとXのWeb Intent
APIを活用するクライアントサイドアプローチに従います：

```text
カレンダーページ → イベントデータサービス → シェアコンテンツ生成器 → Twitter Web Intent
```

### 統合ポイント

- **DynamoDB**: 勉強会情報のデータソース（API経由）
- **管理者向けAPI**: 承認済み勉強会データの取得
- **現在のシェアボタン**: イベント固有のコンテンツで拡張
- **Twitter Web Intent API**: 共有用の外部サービス

## コンポーネントとインターフェース

### 1. TwitterShareButtonコンポーネント

**場所**: `calendar/app/components/TwitterShareButton.tsx`

**Propsインターフェース**:

```typescript
interface TwitterShareButtonProps {
  shareText: string
  calendarUrl: string
  className?: string
}
```

**責務**:

- 適切なスタイリングでTwitterシェアボタンをレンダリング
- クリックイベントを処理し、シェアコンテンツを生成
- フォーマットされたコンテンツでTwitter Web Intentを開く

### 2. ShareContentGeneratorサービス

**場所**: `calendar/app/services/shareContentGenerator.ts`

**インターフェース**:

```typescript
interface ShareContentGenerator {
  generateTwitterContent(events: StudySessionEvent[], calendarUrl: string): string
}
```

**責務**:

- 当月かつ未来の日付のイベントをフィルタリング
- MM/DD日付フォーマットでイベントリストをフォーマット
- 文字数制限の制約を処理
- URLと組み合わせた最終的なシェアテキストを生成

### 3. StudySessionEventタイプ定義

**場所**: `calendar/app/types/studySessionEvent.ts`

**インターフェース**:

```typescript
interface StudySessionEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  status: 'approved' | 'pending' | 'rejected'
  pageUrl?: string
}
```

### 4. 勉強会データ取得フック

**場所**: `calendar/app/hooks/useStudySessionEvents.ts`

**インターフェース**:

```typescript
interface UseStudySessionEventsReturn {
  events: StudySessionEvent[]
  shareText: string
  isLoading: boolean
  error: string | null
}

interface StudySessionEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  status: 'approved' | 'pending' | 'rejected'
}
```

## データモデル

### イベントデータフロー

1. **DynamoDBデータ**: 管理者向けAPI経由で承認済み勉強会情報を取得
2. **フィルタリングされたイベント**: 当月かつ現在日以降のイベントのみ
3. **フォーマットされたコンテンツ**: MM/DDフォーマットとタイトル
4. **シェアテキスト**: カレンダーURLと組み合わせ
5. **ページ描画時生成**: 動的ではなく、ページロード時に一度生成

### シェアコンテンツ構造

```text
📅 今月の広島IT勉強会

01/25 React勉強会 #1
01/28 Python入門セミナー
02/03 AWS勉強会

詳細はこちら: [calendar_url]

#広島IT #勉強会 #プログラミング
```

## エラーハンドリング

### エラーシナリオ

1. **今後のイベントなし**: 適切なメッセージを表示
2. **カレンダーデータ利用不可**: 汎用シェアコンテンツにフォールバック
3. **Twitter API利用不可**: クリップボードコピーフォールバック付きエラーメッセージを表示
4. **文字数制限超過**: イベントリストをインテリジェントに切り詰め

### エラー回復

- 基本的なシェア機能への優雅な劣化
- Twitter Web Intent失敗時のクリップボードコピーフォールバック
- すべてのエラー状態でのユーザーフィードバック

## テスト戦略

### 単体テスト

1. **ShareContentGeneratorテスト**:
   - イベントフィルタリングロジック
   - 日付フォーマット
   - 文字数制限処理
   - エッジケース（イベントなし、単一イベント、多数イベント）

2. **TwitterShareButtonテスト**:
   - クリック処理
   - コンテンツ生成
   - エラー状態
   - アクセシビリティ

### 統合テスト

1. **カレンダー統合**:
   - イベントデータ取得
   - リアルタイム更新
   - エラーハンドリング

2. **Twitter Web Intent**:
   - URL生成
   - パラメータエンコーディング
   - ウィンドウオープン動作

### 手動テスト

1. **ユーザーエクスペリエンス**:
   - ボタンの配置と視認性
   - シェアコンテンツの正確性
   - モバイルレスポンシブ
   - クロスブラウザ互換性

2. **コンテンツ検証**:
   - 日付フォーマットの正確性
   - イベントタイトルの正確性
   - URL機能
   - 文字数制限## 実装アプローチ

### フェーズ1: コアインフラストラクチャ

- StudySessionEventタイプ定義の作成
- ShareContentGeneratorサービスの実装
- DynamoDBからの勉強会データ取得API統合の設定

### フェーズ2: UIコンポーネント

- TwitterShareButtonコンポーネントの構築
- 既存のヘッダーレイアウトとの統合
- レスポンシブデザインの実装

### フェーズ3: 統合とテスト

- イベントデータフローの接続
- エラーハンドリングとフォールバックの追加
- 包括的なテストの実装

### 技術的考慮事項

#### DynamoDB勉強会データ取得

管理者向けAPIを通じてDynamoDBから承認済み勉強会データを取得：

1. **API統合**: 管理者向けバックエンドAPIから勉強会一覧を取得
2. **データフィルタリング**: 承認済み（approved）かつ当月以降のイベントのみ
3. **ページロード時生成**: 動的更新ではなく、初回ロード時にシェアテキストを生成

#### 文字数制限管理

Twitterの文字数制限（280文字）には、インテリジェントなコンテンツ切り詰めが必要：

- 優先度: カレンダーURL（常に含める）
- 二次的: 最新/重要なイベント
- 切り詰め: "...他X件のイベント"

#### パフォーマンス最適化

- シェアコンテンツ生成のメモ化
- フィルタリングされたイベントのキャッシュ
- コンテンツ更新のデバウンス

#### アクセシビリティ

- スクリーンリーダー用の適切なARIAラベル
- キーボードナビゲーションサポート
- ハイコントラストモード対応

#### モバイル考慮事項

- タッチフレンドリーなボタンサイズ
- モバイルTwitterアプリ統合
- レスポンシブコンテンツフォーマット

## セキュリティ考慮事項

### データプライバシー

- シェアコンテンツに機密ユーザーデータを含めない
- 公開イベント情報のみ
- 安全なパラメータ渡しのためのURLエンコーディング

### XSS防止

- 共有前にイベントタイトルをサニタイズ
- URLパラメータの検証
- 特殊文字のエスケープ

## 監視と分析

### 成功指標

- シェアボタンクリック率
- 成功したTwitterインテント完了
- 共有コンテンツとのユーザーエンゲージメント

### エラー追跡

- 失敗した共有試行
- カレンダーデータ取得エラー
- Twitter API失敗

## 将来の拡張

### 潜在的な改善

- カスタムハッシュタグ設定
- イベントカテゴリフィルタリング
- シェアコンテンツテンプレート
- ソーシャルメディアプラットフォーム拡張
- シェア分析ダッシュボード
