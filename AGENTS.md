# AGENTS.md

このリポジトリで作業するAIコーディングエージェント向けの共通ガイドです。

## セットアップ時に必ず確認すること

既知の環境依存の問題を [README.md の「既知の環境問題」](./README.md#既知の環境問題ローカル開発環境)
にまとめています。作業前に必ず目を通してください。

- Node.jsは`.tool-versions`で`23.10.0`に固定（asdf）。未インストールだと`npx`関連のコマンドやpre-commitフック（lint-staged）が`No version is set for command npx`で失敗する。
- macOSでDockerをColima経由で使っている場合、デフォルト設定では`cdk deploy`のLambda
  Layerバンドリング（Dockerコンテナ内`npm install`）が
  `Bundling did not produce any output`で失敗する。Colimaのマウント設定に
  `/private/var/folders`を追加する必要がある。
- `cdk/`ディレクトリの中で`npx cdk ...`を実行すると、`cdk/package.json`が自己定義した`bin/cdk.js`（CDKアプリ定義そのもの）が実行され、本物の`aws-cdk`
  CLIが呼ばれない。diff/deployの引数が無視され、何も表示せずexit code 0で終わるため気づきにくい。
  `../node_modules/.bin/cdk`を直接指定して実行すること。
- AWS操作は`AWS_PROFILE=private`を使う（リポジトリの`.envrc`で自動設定）。セッション切れ時は`aws login --profile private`で再認証する。
- `admin-backend`（Lambda/CDK）にはCI/CDパイプラインが存在しない。GitHubへのpushだけでは本番Lambda関数のコードは更新されないため、コード変更後は手動デプロイが必要。

## 作業原則

- `admin-backend`のコードを変更したら、それが本番Lambdaに反映されるにはCDKデプロイが別途必要であることを常に意識し、ユーザーに明示する。
- リポジトリ内に元々あった無関係な未コミット変更を、自分のコミットに巻き込まない。ステージする前に必ず`git status`/`git diff`で差分を確認する。
- 本番AWS環境への変更を伴う操作（デプロイ、Lambda更新、インフラ設定変更など）は実行前にユーザーへ確認する。
