#!/bin/bash

# バックエンド差分確認スクリプト（リポジトリ直下）
# 使用方法: ./scripts/diff-backend.sh [profile]
# 例: ./scripts/diff-backend.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🔍 バックエンドの差分確認を開始します..."
echo "📋 プロファイル: $PROFILE"

# CDKディレクトリに移動して差分確認スクリプトを実行
cd cdk
./scripts/diff.sh "$PROFILE"

echo "✅ バックエンドの差分確認が完了しました！"
