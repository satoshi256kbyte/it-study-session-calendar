# 広島IT勉強会カレンダー

広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーションです。

## 特徴

- 広島のIT勉強会・イベント情報を一元管理
- GoogleカレンダーをWebページに埋め込んで表示
- GitHubのIssueを使った勉強会スケジュール登録システム
- GitHub Actionsによる自動カレンダー更新
- GitHub Pagesでのホスティング
- SNS共有に最適化されたメタ情報

## 対象となる勉強会

- 広島市内で開催されるIT関連の勉強会
- 広島のエンジニアコミュニティが主催するオンライン勉強会
- プログラミング、インフラ、デザイン、マネジメントなどIT全般

## 技術スタック

- **フロントエンド**: Next.js, TypeScript, Tailwind CSS
- **デプロイ**: GitHub Pages
- **カレンダー**: Google Calendar
- **自動化**: GitHub Actions

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env.local`にコピーして、必要な値を設定してください。

```bash
cp .env.example .env.local
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 勉強会の登録方法

詳しい登録方法については、[Wiki ページ](https://github.com/satoshi256kbyte/it-study-session-calendar/wiki)をご確認ください。

## デプロイ

### GitHub Pagesへのデプロイ

1. GitHubリポジトリの設定で、GitHub Pagesを有効にします
2. GitHub Secretsに以下の環境変数を設定します：
   - `GOOGLE_CALENDAR_URL`: GoogleカレンダーのembedURL
   - `GOOGLE_CALENDAR_API_KEY`: Google Calendar APIキー
   - `GOOGLE_CALENDAR_ID`: カレンダーID

3. `main`ブランチにプッシュすると自動的にデプロイされます

## 必要な設定

### Googleカレンダーの設定

1. Googleカレンダーで新しいカレンダーを作成
2. カレンダーの共有設定で「一般公開して誰でも利用できるようにする」を有効にする
3. カレンダーのembed URLを取得して環境変数に設定

### Google Calendar API の設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Calendar APIを有効にする
3. サービスアカウントを作成してJSONキーをダウンロード
4. カレンダーにサービスアカウントの編集権限を付与

## ライセンス

MIT License
