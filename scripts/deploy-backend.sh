#!/bin/bash

# バックエンドデプロイスクリプト（リポジトリ直下）
# 使用方法: ./scripts/deploy-backend.sh [profile]
# 例: ./scripts/deploy-backend.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🚀 バックエンドのデプロイを開始します..."
echo "📋 プロファイル: $PROFILE"

# CDKディレクトリに移動してデプロイスクリプトを実行
cd cdk
./scripts/deploy.sh "$PROFILE"

echo "✅ バックエンドのデプロイが完了しました！"
