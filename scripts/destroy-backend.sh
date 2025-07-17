#!/bin/bash

# バックエンドリソース削除スクリプト（リポジトリ直下）
# 使用方法: ./scripts/destroy-backend.sh [profile]
# 例: ./scripts/destroy-backend.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "⚠️  バックエンドリソースの削除を開始します..."
echo "📋 プロファイル: $PROFILE"

# CDKディレクトリに移動して削除スクリプトを実行
cd cdk
./scripts/destroy.sh "$PROFILE"

echo "✅ バックエンドリソースの削除が完了しました！"
