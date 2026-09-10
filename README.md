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
- `connpassApiKey`: connpass API v2のAPIキー
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
  v2のAPIキー（[connpass API利用申請](https://help.connpass.com/api/)で取得）

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

## connpass API設定

イベント資料の自動取得機能を使用するには、connpass APIキーが必要です：

### 1. APIキーの取得

1. [connpass API利用申請ページ](https://help.connpass.com/api/)からAPIキーを申請
2. 申請後、発行されたAPIキーをメモ

### 2. 環境変数の設定

**バックエンド（AWS Lambda）**:

- CDKデプロイ時に`cdk/parameters.json`の`connpassApiKey`に設定

## 通知設定（オプション）

新しい勉強会登録時の管理者通知を設定：

1. AWS Console → SNS → Topics
2. 作成されたトピックを選択
3. Email/SMS/Webhook通知を設定

## 既知の環境問題（ローカル開発環境）

### Node.jsのバージョン（asdf）

このリポジトリは`.tool-versions`で`nodejs 23.10.0`を指定しています。

未インストールの場合、`npx`実行時に以下のエラーになります（コミット時のpre-commitフックでも発生）。

```text
No version is set for command npx
```

対処法：

```bash
asdf install nodejs 23.10.0
```

### Docker（Colima）でのCDK Lambda Layerバンドリング失敗

`cdk deploy`実行時、`admin-backend`の依存パッケージ用Lambda
Layer（`DependenciesLayer`）はDockerコンテナ内で`npm install`するバンドリング処理を行いますが、Docker実行環境がColima（`docker info`で`Context: colima`）の場合、以下のエラーになることがあります。

```text
ValidationError: Bundling did not produce any output. Check that content is written to /asset-output.
```

**原因**: Colimaはデフォルト（`~/.colima/default/colima.yaml`の`mounts: []`）では
`$HOME`と`/tmp/colima`しかVMにマウントしません。CDKのバンドリングはmacOSの`$TMPDIR`（実体は`/private/var/folders/...`）を一時ディレクトリとして使いますが、このパスがVMにマウントされていないため、コンテナ内で書き込んだファイルがホスト側に反映されません。

**対処法**:
`~/.colima/default/colima.yaml`の`mounts`を以下のように設定し、`colima restart`を実行してください。

```yaml
mounts:
  - location: /Users/<your-username>
    writable: true
  - location: /tmp/colima
    writable: true
  - location: /private/var/folders
    writable: true
```

⚠️
YAMLで`~`を引用符なしで書くと`null`と解釈されてしまうため、ホームディレクトリは`~`ではなく絶対パスで指定すること。

### `cdk/`ディレクトリ内で`npx cdk`を実行すると本物のCLIが呼ばれない

`cdk/package.json`は`"name": "cdk"`・`"bin": {"cdk": "bin/cdk.js"}`と自己定義しているため、
`cdk/`ディレクトリの中で`npx cdk ...`を実行すると、依存パッケージの`aws-cdk`（本物のCLI）ではなく
**このプロジェクト自身の`bin/cdk.js`（CDKアプリ定義そのもの）が直接実行されてしまう**。

`bin/cdk.js`はCLIではないため`diff`/`deploy`/`--version`等の引数を一切解釈せず、Stackを構築（＝副作用としてLambda
Layerのバンドリングだけは走る）して終了するだけになる。diffやデプロイの進捗が何も表示されず、exit
codeも0を返すため気づきにくい。

**対処法**: ルートにホイストされた本物のCLIを直接指定して実行する。

```bash
cd cdk
../node_modules/.bin/cdk diff hiroshima-it-calendar-prod-stack
```

### AWSプロファイル

このリポジトリの操作には`private`プロファイル（AWS Identity
Center経由）を使用する。リポジトリ直下に`.envrc`（direnvで自動読み込み、gitignore対象）を作成し、
`export AWS_PROFILE=private`を設定しておくとコマンドごとの指定が不要になる。

```bash
echo 'export AWS_PROFILE=private' > .envrc
direnv allow
```

セッションが切れている場合は再ログインしてから実行する。

```bash
aws login --profile private
```

### `admin-backend`（Lambda）にはCI/CDが無い

`.github/workflows/`配下のワークフローは`calendar/**`（エンドユーザー画面・GitHub
Pages）のみが対象です。
`admin-backend`・CDKの変更は**GitHubにpushしただけでは本番Lambdaに反映されません**。上記のColima設定・AWSプロファイル設定を済ませたうえで、手動で以下を実行してデプロイする必要があります。

```bash
cd admin-backend && npm run build
cd ../cdk && ../node_modules/.bin/cdk deploy hiroshima-it-calendar-prod-stack --require-approval never
```

`--require-approval never`を付けないと、IAM/セキュリティ関連の変更がある場合に確認プロンプトで停止し、非対話的に実行すると変更が反映されないまま終了することがあります。

## プロジェクト構成

```bash
├── calendar/           # エンドユーザー画面
├── admin-frontend/     # 管理者画面
├── admin-backend/      # バックエンドAPI
├── cdk/               # AWS CDK（インフラ）
└── scripts/           # デプロイスクリプト
```
