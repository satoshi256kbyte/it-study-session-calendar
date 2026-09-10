# CLAUDE.md

このファイルは、このリポジトリで作業するAIエージェント（Claude Code等）向けの注意事項です。

## ローカル環境のセットアップに関する注意

このリポジトリのビルド・テスト・デプロイでハマりやすい既知の問題は
[README.md の「既知の環境問題」](./README.md#既知の環境問題ローカル開発環境)にまとめています。

作業前に必ず確認してください。特に以下は頻出します。

- `npx`が`No version is set for command npx`で失敗する→
  `asdf install nodejs 23.10.0`（`.tool-versions`参照）
- `cdk deploy`が`ValidationError: Bundling did not produce any output`で失敗する→
  Colima（`docker info`で`Context: colima`）のマウント設定不足が原因。README参照
- `cdk/`ディレクトリ内で`npx cdk ...`を実行すると、diff/deployの結果が何も表示されずexit code
  0で終わる（＝本物のCLIではなく、`cdk/package.json`が自己定義した
  `bin/cdk.js`＝アプリ定義そのものが実行されてしまっている）→
  `../node_modules/.bin/cdk`を直接指定して実行する
- AWSは`AWS_PROFILE=private`を使う（`.envrc`で自動設定、セッション切れ時は`aws login --profile private`）
- `admin-backend`（Lambda/CDK）にはCI/CDが無いため、pushしただけでは本番に反映されない→ 手動で`cd admin-backend && npm run build`
  → `cd ../cdk && ../node_modules/.bin/cdk deploy <stack> --require-approval never`

## 作業時の基本方針

- `admin-backend`のLambdaハンドラを変更した場合、gitにコミット/pushしただけでは本番Lambdaのコードは更新されない。実際に動作を反映させたい場合はCDKデプロイが必要なことをユーザーに伝えること。
- ワークツリーに元々あった未コミットの変更（自分のタスクと無関係なもの）を
  `git add -A`のような形で巻き込んでコミットしないこと。差分は必ず確認し、自分が変更したファイルだけをステージする。
- 本番AWS環境に影響する操作（`cdk deploy`、Lambda直接更新、S3署名付きURL発行など）は、実行前に必ずユーザーに確認する。
