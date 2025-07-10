# 広島IT勉強会カレンダー - 管理画面

勉強会の承認・却下・削除を行う管理者向けのWebアプリケーションです。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. AWS設定ファイルの作成

```bash
# AWS Amplify設定ファイルをコピー
cp src/aws-exports.ts.sample src/aws-exports.ts
```

`src/aws-exports.ts`を編集して、以下の値を設定してください：

- `YOUR_USER_POOL_ID`: Cognito User Pool ID
- `YOUR_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `YOUR_COGNITO_DOMAIN`: Cognito Domain
- `https://your-domain.example.com/`: 実際のドメイン

### 3. 環境変数の設定

```bash
# 環境変数ファイルをコピー
cp .env.example .env.local
```

`.env.local`を編集して、以下の値を設定してください：

- `NEXT_PUBLIC_USER_POOL_ID`: Cognito User Pool ID
- `NEXT_PUBLIC_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `NEXT_PUBLIC_USER_POOL_DOMAIN`: Cognito Domain
- `NEXT_PUBLIC_REDIRECT_URI`: リダイレクトURI

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3001 でアプリケーションが起動します。

### ビルド

```bash
npm run build
```

### 本番デプロイ

```bash
# S3にデプロイ
aws s3 sync out/ s3://your-bucket-name/ --delete

# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## 認証

- Amazon Cognito Hosted UIを使用
- 管理者アカウントでのみアクセス可能
- OAuth 2.0 Authorization Code Flowを実装

## 技術スタック

- **フレームワーク**: Next.js 14
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: AWS Amplify + Amazon Cognito
- **デプロイ**: Amazon S3 + CloudFront

## ファイル構成

```
src/
├── contexts/
│   └── AuthContext.tsx          # 認証コンテキスト
├── components/
│   └── LoginForm.tsx           # ログインフォーム
├── aws-exports.ts              # AWS設定（Git管理対象外）
└── aws-exports.ts.sample       # AWS設定サンプル
```

## 注意事項

- `src/aws-exports.ts`は機密情報を含むため、Git管理対象外です
- 本番環境では必ず環境変数を使用してください
- Cognito設定は事前にAWS CDKでデプロイしておく必要があります
