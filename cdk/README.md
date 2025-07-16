# CDK インフラ構成

## セットアップ

### 1. パラメータファイルの作成

```bash
# サンプルファイルをコピー
npm run setup

# または手動でコピー
cp parameters.sample.json parameters.json
```

### 2. パラメータファイルの編集

`parameters.json` を編集して、以下の値を設定してください：

```json
{
  "serviceName": "hiroshima-it-calendar",
  "environment": "dev",
  "googleCalendarId": "your-calendar-id@group.calendar.google.com",
  "googleCalendarApiKey": "your-google-calendar-api-key"
}
```

### 3. Google Calendar API の設定

#### Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. Calendar API を有効化
4. 認証情報を作成：
   - 「認証情報を作成」> 「APIキー」を選択
   - APIキーが生成されるのでコピー
   - APIキーの制限を設定（推奨）：
     - アプリケーションの制限: なし（またはIPアドレス制限）
     - API の制限: Google Calendar API のみ

#### Googleカレンダーの設定

1. Googleカレンダーで新しいカレンダーを作成
2. カレンダーの設定を開く：
   - 左側のカレンダー一覧で対象カレンダーの「⋮」をクリック
   - 「設定と共有」を選択
3. 共有設定：
   - 「一般公開して誰でも利用できるようにする」を有効
   - 「予定の詳細を表示」を選択
4. カレンダー ID を取得：
   - 「カレンダーの統合」セクションの「カレンダー ID」をコピー

### 4. デプロイ

```bash
# AWSプロファイル設定（必要に応じて）
export AWS_PROFILE=your-profile-name

# 開発環境へのデプロイ
npm run deploy:dev

# 本番環境へのデプロイ（承認が必要）
npm run deploy
```

## 命名規則

このプロジェクトでは以下の命名規則に従います：

`{サービス名}-{環境名}-{AWSリソース種類}-{用途}-{連番}`

### 環境名

- `dev`: 開発環境
- `stg`: ステージング環境
- `prod`: 本番環境

### リソース例

- DynamoDB: `hiroshima-it-calendar-dev-table-study-sessions`
- Lambda: `hiroshima-it-calendar-dev-lambda-create-study-session`
- API Gateway: `hiroshima-it-calendar-dev-api-study-session`
- S3: `hiroshima-it-calendar-dev-s3-admin-frontend`

## コマンド一覧

```bash
# パラメータファイルのセットアップ
npm run setup

# パラメータファイルの検証
npm run validate:parameters

# CDK の差分確認
npm run diff

# CDK テンプレートの生成
npm run synth

# デプロイ
npm run deploy

# 開発環境への自動デプロイ（承認スキップ）
npm run deploy:dev

# リソースの削除
npm run destroy
```

## 出力される情報

デプロイ完了後、以下の情報が出力されます：

- **API Gateway URL**: エンドユーザー向けAPIのエンドポイント
- **管理画面URL**: CloudFront経由の管理画面URL
- **S3バケット名**: 管理画面用のS3バケット名
- **DynamoDB テーブル名**: 勉強会データを格納するテーブル名
- **CloudFront ディストリビューション ID**: キャッシュクリア用
- **Cognito User Pool ID**: 管理者認証用のUser Pool ID
- **Cognito User Pool Client ID**: 管理者認証用のClient ID
- **Cognito User Pool Domain**: 管理者認証用のドメイン
- **SNS Topic ARN**: 管理者通知用のSNSトピックARN

## 環境別設定

### 開発環境 (dev)

- リソースの削除ポリシー: `DESTROY`
- リソース名サフィックス: `-dev-`

### ステージング環境 (stg)

- リソースの削除ポリシー: `RETAIN`
- リソース名サフィックス: `-stg-`

### 本番環境 (prod)

- リソースの削除ポリシー: `RETAIN`
- リソース名サフィックス: `-prod-`

## トラブルシューティング

### よくあるエラー

1. **parameters.json が見つからない**

   ```bash
   npm run setup
   ```

2. **Google Calendar API エラー**
   - APIキーが正しく設定されているか確認
   - カレンダーが一般公開されているか確認
   - APIキーの制限設定を確認

3. **CDK デプロイエラー**

   ```bash
   # CDK のブートストラップ
   cdk bootstrap

   # 差分を確認
   npm run diff

   # プロファイル指定でブートストラップ
   export AWS_PROFILE=your-profile-name
   cdk bootstrap
   ```

4. **AWS認証エラー**

   ```bash
   # 現在のAWS認証情報を確認
   aws sts get-caller-identity

   # プロファイル指定で確認
   aws --profile your-profile-name sts get-caller-identity
   ```

### ログの確認

```bash
# Lambda 関数のログ
aws logs tail /aws/lambda/hiroshima-it-calendar-dev-lambda-create-study-session --follow

# CloudFormation スタックの確認
aws cloudformation describe-stacks --stack-name hiroshima-it-calendar-dev-stack
```

## 管理者通知機能

デプロイ後、新しい勉強会が登録された際に管理者に自動通知を送信する機能が利用できます。

### 環境変数

以下の環境変数が自動的に設定されます：

- `SNS_TOPIC_ARN`: 管理者通知用SNSトピックのARN
- `NOTIFICATION_ENABLED`: 通知機能の有効/無効フラグ（デフォルト: true）
- `ADMIN_URL`: 管理画面のURL（domainNameパラメータから自動生成）

### 通知設定

1. **SNS通知の設定**
   - AWS Console → SNS → Topics
   - 作成されたトピック（`{serviceName}-{environment}-admin-notification`）を選択
   - 「Subscriptions」タブで通知方法を設定（Email、SMS、HTTPS等）

2. **通知の無効化**
   - CDKスタックの `NOTIFICATION_ENABLED` 環境変数を `false` に変更
   - 再デプロイで設定が反映されます

### 通知内容

- 勉強会のタイトル
- 開催日時
- 登録日時
- 管理画面へのリンク

## セキュリティ

- `parameters.json` は Git 管理対象外です
- Google Calendar APIキーは適切に管理してください
- 本番環境では最小権限の原則に従ってください
- APIキーには適切な制限を設定してください
- SNS通知には個人情報を含めない設計になっています
