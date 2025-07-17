#!/bin/bash

# バックエンドデプロイスクリプト
# 使用方法: ./scripts/deploy.sh [profile]
# 例: ./scripts/deploy.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🚀 バックエンドのデプロイを開始します..."
echo "📋 プロファイル: $PROFILE"

# AWSプロファイルを設定
export AWS_PROFILE=$PROFILE

# プロファイルの確認
echo "🔍 AWS認証情報を確認中..."
aws sts get-caller-identity

# TypeScriptビルド
echo "🔨 TypeScriptをビルド中..."
npm run build

# パラメータファイルの検証
echo "✅ パラメータファイルを検証中..."
npm run validate

# デプロイ実行（承認なし）
echo "🚀 バックエンドをデプロイ中..."
cdk deploy --require-approval never

echo "✅ バックエンドのデプロイが完了しました！"
