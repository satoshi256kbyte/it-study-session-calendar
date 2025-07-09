# 広島IT勉強会カレンダー MVP セットアップガイド

## 完成したMVPの構成

### 1. フロントエンド
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **静的サイト生成** (GitHub Pages対応)
- **SNS共有最適化** (Open Graph, Twitter Card対応)

### 2. 主な機能

#### ✅ 実装済み
- 広島IT勉強会に特化したブランディング
- Googleカレンダーの埋め込み表示
- レスポンシブデザイン
- SNS共有ボタン（Twitter、汎用シェア）
- GitHub Issue テンプレート（広島特化）
- GitHub Actions ワークフロー（基本構造）
- GitHub Pages 自動デプロイ
- SEO最適化（構造化データ、メタタグ）
- OGイメージとファビコン

#### 🎨 SNS共有機能
- **Open Graph**: Facebook、LinkedIn等での共有時に最適化
- **Twitter Card**: Twitter共有時の表示を最適化
- **構造化データ**: Google検索結果での表示を改善
- **共有ボタン**: ワンクリックでTwitter共有、汎用シェア機能

### 3. 広島特化の要素

- **タイトル**: 「広島IT勉強会カレンダー」
- **対象地域**: 広島市内の勉強会、広島のコミュニティ主催のオンライン勉強会
- **Issue テンプレート**: 広島の勉強会であることの確認項目を追加
- **開催場所**: 広島市内の会場情報を重視

### 🔧 要設定

- Google Calendar API の設定
- GitHub Secrets の設定
- カレンダーURL の設定

## 🎯 Issue Forms による登録システム

### GitHub Issue Forms

構造化された入力フォームを使用して、勉強会の登録を簡単に行えます：

**フォーム項目:**
- **勉強会タイトル** (必須): テキスト入力
- **勉強会ページのリンク** (必須): URL入力
- **開催日時** (必須): 日時入力
- **確認事項** (必須): チェックボックス

### 📝 入力例

```yaml
勉強会タイトル: 広島JavaScript勉強会 #42
勉強会ページのリンク: https://connpass.com/event/123456/
開催日時: 2024年7月15日 19:00-21:00
```

### 🔄 Issue Forms の出力形式

GitHub Issue Formsは以下の形式で出力されます：

```
### 勉強会タイトル

広島JavaScript勉強会 #42

### 勉強会ページのリンク

https://connpass.com/event/123456/

### 開催日時

2024年7月15日 19:00-21:00
```

### 📅 日時フォーマット対応

以下の日時フォーマットに対応しています：

- `2024年7月15日 19:00-21:00`
- `2024/7/15 19:00-21:00`
- `2024年7月15日 19:00` (終了時間省略時は2時間後に設定)

### 🔄 自動カレンダー登録

Issue承認時に以下の情報でカレンダーイベントが作成されます：

- **イベントタイトル**: 勉強会タイトル
- **開始・終了時間**: 開催日時から自動解析
- **説明**: 勉強会ページのリンク
- **タイムゾーン**: Asia/Tokyo

## セットアップ手順

### 1. 開発環境での確認

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

http://localhost:3000 でアプリケーションを確認できます。

### 2. Googleカレンダーの準備

1. **新しいカレンダーを作成**
   - Google Calendar にアクセス
   - 「他のカレンダー」→「新しいカレンダーを作成」
   - 名前: 「IT勉強会カレンダー」

2. **カレンダーを公開**
   - カレンダー設定 → 「アクセス権限」
   - 「一般公開して誰でも利用できるようにする」をチェック

3. **埋め込みURLを取得**
   - カレンダー設定 → 「カレンダーの統合」
   - 「埋め込みコード」のsrc属性のURLをコピー

### 3. Google Calendar API の設定

1. **Google Cloud Console でプロジェクト作成**
   - https://console.cloud.google.com/
   - 新しいプロジェクトを作成

2. **Calendar API を有効化**
   - 「APIとサービス」→「ライブラリ」
   - 「Google Calendar API」を検索して有効化

3. **サービスアカウント作成**
   - 「APIとサービス」→「認証情報」
   - 「認証情報を作成」→「サービスアカウント」
   - JSONキーをダウンロード

4. **カレンダーに権限付与**
   - Google Calendar でカレンダー設定を開く
   - 「特定のユーザーと共有」にサービスアカウントのメールアドレスを追加
   - 権限: 「予定の変更権限」

### 4. GitHub の設定

1. **GitHub Pages を有効化**
   - リポジトリ設定 → Pages
   - Source: GitHub Actions

2. **GitHub Secrets を設定**
   ```
   GOOGLE_CALENDAR_URL: カレンダーの埋め込みURL
   GOOGLE_CALENDAR_API_KEY: サービスアカウントのJSONキー全体
   GOOGLE_CALENDAR_ID: カレンダーID（例: xxx@group.calendar.google.com）
   ```

### 5. 動作確認

1. **デプロイ確認**
   - main ブランチにプッシュ
   - GitHub Actions でデプロイが成功することを確認
   - GitHub Pages URL でサイトが表示されることを確認

2. **Issue登録テスト**
   - Issue テンプレートを使って勉強会を登録
   - Issue を「Close as completed」で閉じる
   - GitHub Actions が実行されることを確認

## カスタマイズポイント

### デザインの変更
- `app/globals.css`: スタイルの調整
- `app/page.tsx`: レイアウトやコンテンツの変更
- `tailwind.config.js`: Tailwind設定

### 機能の拡張
- `scripts/add-to-calendar.js`: Issue解析ロジックの改善
- `.github/workflows/add-to-calendar.yml`: ワークフローの詳細実装
- Issue テンプレートの項目追加

## トラブルシューティング

### よくある問題

1. **カレンダーが表示されない**
   - 環境変数 `NEXT_PUBLIC_GOOGLE_CALENDAR_URL` が正しく設定されているか確認
   - カレンダーが公開設定になっているか確認

2. **GitHub Actions が失敗する**
   - GitHub Secrets が正しく設定されているか確認
   - Google Calendar API の権限設定を確認

3. **ビルドエラー**
   - Node.js のバージョンが18以上か確認
   - `npm ci` で依存関係を再インストール

## 次のステップ

1. **Google Calendar API連携の完全実装**
   - Issue解析ロジックの詳細実装
   - エラーハンドリングの追加

2. **UI/UXの改善**
   - カレンダーの表示オプション追加
   - 勉強会一覧表示機能

3. **管理機能の追加**
   - 承認フローの改善
   - 統計情報の表示
