# IT勉強会カレンダー

## 概要

- IT関連の勉強会やイベントをカレンダー表示するウェブアプリケーションです。
- カレンダー部分はGoogleカレンダーを使用します。
- 勉強会のスケジュールを登録するUIは提供せず、GitHubのIssueを利用してスケジュールを登録します。

## 設計

- フロントエンド: Next.js、Typescript、Tailwind CSS
- 別途用意したGoogleカレンダーをNext.jsのページに埋め込んで表示します。
- ページ構成は以下の通りです。
  - ホーム: カレンダーを表示
- WebアプリケーションはGitHub Pagesにデプロイします。
- GitHubのIssueを利用してスケジュールを登録します。
  - 勉強会のスケジュールを登録したい人はIssueを作成し、以下のテンプレートに従って記入します。
    - タイトル: 勉強会のタイトル
    - 入力項目
      - 勉強会のページのリンク(主にconnpassのURL)
      - 勉強会の開催日時
  - リポジトリオーナーがIssueを確認し、内容に問題がなければステータスを「Close as completed」に変更します。
  -「Close as completed」になった場合、GitHub Actionsを利用して、GoogleカレンダーにAPIを使用してイベントを登録します。
  - ページに埋め込むGoogleカレンダーのURLは、環境変数で指定します。
  - Googleカレンダーのイベント登録には、Google Calendar APIを使用します。APIキーはGiHub Actionsのシークレットに設定します。
