#!/bin/bash

# バックエンド差分確認スクリプト
# 使用方法: ./scripts/diff.sh [profile]
# 例: ./scripts/diff.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🔍 バックエンドの差分確認を開始します..."
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

# 差分確認実行
echo "📊 バックエンドの差分を確認中..."
cdk diff

echo "✅ 差分確認が完了しました！"
