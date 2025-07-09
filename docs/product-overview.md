# IT勉強会カレンダー

## 概要

- IT関連の勉強会やイベントをカレンダー表示するウェブアプリケーションです。
- カレンダー部分はGoogleカレンダーを使用します。
- 勉強会のスケジュールはフォームから登録します。
- 登録された勉強会のスケジュールは、別途用意した管理画面で承認されたらGoogleカレンダーに登録されます。

## 設計

### エンドユーザー向け

- フロントエンド: Next.js、Typescript、Tailwind CSS
- WebアプリケーションはGitHub Pagesにデプロイします。
- 別途用意したGoogleカレンダーをNext.jsのページに埋め込んで表示します。
- ページ構成は以下の通りです。
  - ホーム: カレンダーを表示
  - 勉強会登録: 勉強会のスケジュールを登録するためのフォーム
    - 入力項目
      - 勉強会のタイトル
      - 勉強会のページのリンク(主にconnpassのURL)
      - 勉強会の開催日時
    - フォームから勉強会を登録すると、管理者向け側で用意している勉強会登録APIにPOSTリクエストが送信されます。

### 管理者向け

- フロントエンド: Next.js、Typescript、Tailwind CSS、Amazon S3、Amazon CloudFront
- バックエンド: Amazon API Gateway、AWS Lambda、DynamoDB、Typescript
- IaC：AWS CDK、TypeScript
- ページ構成は以下の通りです。
  - 勉強会一覧（ページ遷移あり）
    - 勉強会の一覧を表示
    - 勉強会のタイトル、開催日時、ページリンクを表示
    - 勉強会の登録状況（未承認、承認済み）を表示
    - 勉強会ごとに承認/却下/削除のアクションを実行
  - 勉強会の承認
    - Googleカレンダーのイベント登録  
    - Google Calendar APIを使用
    - GoogleカレンダーのカレンダーIDとAPIキーはAWS Lambdaの環境変数として設定

## リポジトリ構成

- モノレポ構成とします

- `calendar/`: エンドユーザー向け画面（GitHub Pagesにホスト）
- `admin-frontend/`: 管理者画面のフロントエンド(Amazon S3+ CloudFrontにホスト)
- `admin backend/`: 管理者画面のバックエンド(AWS Lambda + API Gateway)
- `cdk/`: AWS CDKを使用したインフラ構成、管理者画面のフロントエンドとバックエンドのデプロイを行う

