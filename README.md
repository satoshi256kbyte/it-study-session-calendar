# 広島IT勉強会カレンダー

広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーションです。

## 前提条件

- Node.js 23.10.0以上
- AWS CLI設定済み
- AWSプロファイル設定（複数のAWSアカウントを使用する場合）

## Google Calendar設定

### 1. Google Cloud Projectの作成とサービスアカウント設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. Google Calendar APIを有効化
   - 「APIとサービス」→「ライブラリ」
   - 「Google Calendar API」を検索して有効化
4. サービスアカウントを作成
   - 「IAMと管理」→「サービスアカウント」
   - 「サービスアカウントを作成」
   - 名前を入力（例：`it-session-calendar`）
   - 「キーを作成」→「JSON」を選択してダウンロード

### 2. Googleカレンダーの作成

1. [Google Calendar](https://calendar.google.com/)にアクセス
2. 左側の「他のカレンダー」の「+」をクリック
3. 「新しいカレンダーを作成」を選択
4. カレンダー名を入力（例：「広島IT勉強会カレンダー」）
5. 作成後、カレンダーIDをメモ（設定画面で確認可能）

### 3. サービスアカウントにカレンダー編集権限を付与

#### 方法1: Google Calendar APIを使用（推奨）

```bash
# プロジェクトルートで実行
node scripts/add-calendar-acl.js
```

#### 方法2: 手動設定

1. 作成したカレンダーの設定画面を開く
2. 「特定のユーザーとの共有」でサービスアカウントのメールアドレスを追加
3. 権限を「予定の変更および共有の管理権限」に設定

### 4. 自分のアカウントから編集可能にする設定

1. カレンダーの設定画面で「特定のユーザーとの共有」に自分のGoogleアカウントを追加
2. 権限を「予定の変更および共有の管理権限」に設定

## セットアップ

### 1. 依存関係のインストール

```bash
npm run install:all
```

### 2. CDKパラメータファイル作成

```bash
npm run setup:cdk
```

### 3. parameters.jsonの編集

```bash
cd cdk
# parameters.sample.jsonを参考にparameters.jsonを作成・編集
cp parameters.sample.json parameters.json
```

`parameters.json`に以下の情報を設定：

- `googleCalendarId`: 作成したカレンダーのID
- `googleCalendarApiKey`: Google Calendar API キー
- `googleServiceAccountEmail`: サービスアカウントのメールアドレス
- `googlePrivateKey`: サービスアカウントの秘密鍵（JSONファイルから取得）
- `domainName`: 使用するドメイン名
- `hostedZoneId`: Route53のホストゾーンID
- `certificateArn`: SSL証明書のARN

### 4. AWSプロファイル設定（必要に応じて）

```bash
export AWS_PROFILE=your-profile-name
# または
aws configure --profile your-profile-name
```

### 5. Calendar用環境変数設定

```bash
cd ../calendar
cp .env.example .env.local
# .env.localを編集してAPI URLを設定
```

## 開発サーバー起動

```bash
# エンドユーザー画面（ポート3000）
npm run dev:calendar

# 管理者画面（ポート3001）
npm run dev:admin-frontend
```

## AWSへのデプロイ

### 1. ビルド

```bash
npm run build:all
```

### 2. AWSインフラデプロイ

```bash
# AWSプロファイル指定（必要に応じて）
export AWS_PROFILE=your-profile-name

# 本番環境デプロイ
npm run deploy:cdk
```

### 3. フロントエンドデプロイ

#### Calendar（エンドユーザー画面）
GitHub Pagesで自動デプロイ（mainブランチへのpush時）

GitHub Secretsに以下を設定：
- `GOOGLE_CALENDAR_URL`: GoogleカレンダーのURL
- `API_BASE_URL`: デプロイ後のAPI Gateway URL

#### Admin Frontend（管理画面）
```bash
npm run deploy:admin-frontend
```

## その他のコマンド

```bash
# CDK差分確認
npm run diff:cdk

# AWSリソース削除
npm run destroy:cdk
```
