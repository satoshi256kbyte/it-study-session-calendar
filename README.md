# 広島IT勉強会カレンダー

広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーションです。

## 開発環境構築

### 前提条件

- Node.js 23.10.0以上
- AWS CLI設定済み
- AWSプロファイル設定（複数のAWSアカウントを使用する場合）

### セットアップ

```bash
# 0. Node.js バージョン確認（推奨: nvm使用）
node --version  # 23.10.0以上であることを確認
# nvmを使用している場合: nvm use

# 1. 依存関係のインストール
npm run install:all

# 2. CDKパラメータファイル作成
npm run setup:cdk

# 3. parameters.json を編集
cd cdk
# Google Calendar API設定を記入

# 4. AWSプロファイル設定（必要に応じて）
export AWS_PROFILE=your-profile-name
# または
aws configure --profile your-profile-name

# 5. Calendar用環境変数設定
cd ../calendar
cp .env.example .env.local
# .env.local を編集してAPI URLを設定
```

```json:cdk/parameters.json
{
  "serviceName": "hiroshima-it-calendar",
  "environment": "dev",
  "googleCalendarId": "your-calendar-id@group.calendar.google.com",
  "googleCalendarApiKey": "your-google-calendar-api-key"
}
```

```bash:calendar/.env.local
NEXT_PUBLIC_GOOGLE_CALENDAR_URL=https://calendar.google.com/calendar/embed?src=YOUR_CALENDAR_ID
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
```

### 開発サーバー起動

```bash
# エンドユーザー画面（ポート3000）
npm run dev:calendar

# 管理者画面（ポート3001）
npm run dev:admin-frontend
```

## ビルド・デプロイ

### ビルド

```bash
# AWS関連のビルド（GitHub Pagesは自動ビルド）
npm run build:all

# 個別ビルド
npm run build:calendar      # 開発時のテスト用
npm run build:admin-frontend
npm run build:admin-backend
npm run build:cdk
```

### デプロイ

```bash
# AWSプロファイル指定（必要に応じて）
export AWS_PROFILE=your-profile-name

# AWSインフラデプロイ
npm run deploy:cdk:dev     # 開発環境
npm run deploy:cdk         # 本番環境

# デプロイ後、出力されたAPI Gateway URLを calendar/.env.local に設定

# フロントエンドデプロイ
# Calendar: GitHub Pagesで自動デプロイ（mainブランチへのpush時）
# GitHub Secrets設定が必要: GOOGLE_CALENDAR_URL, API_BASE_URL
# 本番環境API URL: https://gt8vj1ria1.execute-api.ap-northeast-1.amazonaws.com/prod/

# Admin Frontend: 手動デプロイ
npm run deploy:admin-frontend     # 本番環境
npm run deploy:admin-frontend:dev # 開発環境
# または直接スクリプト実行: ./scripts/deploy-admin-frontend.sh prod
```

### その他のコマンド

```bash
# AWSプロファイル指定（必要に応じて）
export AWS_PROFILE=your-profile-name

npm run diff:cdk          # CDK差分確認
npm run destroy:cdk       # AWSリソース削除
```

## トラブルシューティング

### CDKデプロイが動作しない場合

```bash
# 1. CDKブートストラップ
cd cdk
npx cdk bootstrap

# 2. 依存関係の再インストール
npm install

# 3. ビルドとシンセサイズのテスト
npm run build
npx cdk synth

# 4. AWS認証情報の確認
aws sts get-caller-identity

# 5. プロファイル指定でのブートストラップ
export AWS_PROFILE=your-profile-name
npx cdk bootstrap
```
