# 広島IT勉強会カレンダー

広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーションです。

## 概要

- **エンドユーザー画面**: 勉強会の登録とカレンダー表示（GitHub Pages）
- **管理者画面**: 勉強会の承認・却下・削除（AWS S3 + CloudFront）
- **バックエンド**: API Gateway + Lambda + DynamoDB
- **カレンダー**: Google Calendar API連携

## 前提条件

- Node.js 23.10.0以上
- AWS CLI設定済み
- AWSプロファイル設定

## Google Calendar設定

### 1. Google Cloud Projectの設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Google Calendar APIを有効化
3. サービスアカウントを作成してJSONキーをダウンロード

### 2. Googleカレンダーの作成

1. [Google Calendar](https://calendar.google.com/)で新しいカレンダーを作成
2. カレンダーIDをメモ

### 3. 権限設定

サービスアカウントにカレンダー編集権限を付与：

```bash
# 自動設定（推奨）
node scripts/add-calendar-acl.js

# または手動でカレンダー設定画面から追加
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm run install:all
```

### 2. CDKパラメータ設定

```bash
npm run setup:cdk
```

`cdk/parameters.json`を編集して以下を設定：

- `googleCalendarId`: カレンダーID
- `googleServiceAccountEmail`: サービスアカウントのメール
- `googlePrivateKey`: サービスアカウントの秘密鍵
- `domainName`: 使用するドメイン名
- `hostedZoneId`: Route53のホストゾーンID
- `certificateArn`: SSL証明書のARN

### 3. CDK Bootstrap（初回のみ）

```bash
export AWS_PROFILE=your-profile-name
cd cdk
cdk bootstrap
```

## デプロイ

### 1. バックエンドのデプロイ

```bash
sh scripts/deploy-backend.sh <AWS_PROFILE>
```

### 2. フロントエンド環境変数の設定

```bash
sh scripts/setup-frontend-env.sh <AWS_PROFILE>
```

### 3. 管理者画面のデプロイ

```bash
sh scripts/deploy-frontend.sh <AWS_PROFILE>
```

### 4. エンドユーザー画面のデプロイ

GitHub Pagesで自動デプロイ（mainブランチへのpush時）

GitHub Secretsに以下を設定：

- `GOOGLE_CALENDAR_URL`: GoogleカレンダーのURL
- `API_BASE_URL`: デプロイ後のAPI Gateway URL

## 管理者ユーザーの作成

デプロイ後、AWS Consoleから管理者ユーザーを作成：

1. AWS Console → Cognito → User pools
2. 作成されたUser Poolを選択
3. 「Users」タブ → 「Create user」
4. 管理者用のメールアドレスとパスワードを設定

## 開発サーバー

```bash
# エンドユーザー画面（ポート3000）
npm run dev:calendar

# 管理者画面（ポート3001）
npm run dev:admin-frontend
```

## 通知設定（オプション）

新しい勉強会登録時の管理者通知を設定：

1. AWS Console → SNS → Topics
2. 作成されたトピックを選択
3. Email/SMS/Webhook通知を設定

## プロジェクト構成

```
├── calendar/           # エンドユーザー画面
├── admin-frontend/     # 管理者画面
├── admin-backend/      # バックエンドAPI
├── cdk/               # AWS CDK（インフラ）
└── scripts/           # デプロイスクリプト
```
