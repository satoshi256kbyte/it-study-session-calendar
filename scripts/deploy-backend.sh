#!/bin/bash

# バックエンドデプロイスクリプト（リポジトリ直下）
# 使用方法: ./scripts/deploy-backend.sh [profile]
# 例: ./scripts/deploy-backend.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🚀 バックエンド全体のデプロイを開始します..."
echo "📋 プロファイル: $PROFILE"

# 1. admin-backendのデプロイ
echo ""
echo "=== 1. admin-backendのデプロイ ==="
cd admin-backend
./scripts/deploy.sh
cd ..

# 2. CDKのデプロイ
echo ""
echo "=== 2. CDK（インフラ）のデプロイ ==="
cd cdk
./scripts/deploy.sh "$PROFILE"
cd ..

echo ""
echo "✅ バックエンド全体のデプロイが完了しました！"
