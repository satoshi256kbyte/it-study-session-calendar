#!/bin/bash

# バックエンドリソース削除スクリプト
# 使用方法: ./scripts/destroy.sh [profile]
# 例: ./scripts/destroy.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "⚠️  バックエンドリソースの削除を開始します..."
echo "📋 プロファイル: $PROFILE"

export AWS_PROFILE=$PROFILE
export AWS_DEFAULT_REGION=ap-northeast-1

# プロファイルの確認
echo "🔍 AWS認証情報を確認中..."
aws sts get-caller-identity

# 確認プロンプト
echo ""
echo "⚠️  警告: この操作により、すべてのバックエンドAWSリソースが削除されます。"
echo "この操作は元に戻すことができません。"
echo ""
read -p "本当に削除しますか？ (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ 削除をキャンセルしました。"
    exit 1
fi

# リソース削除実行
echo "🗑️  バックエンドリソースを削除中..."
cdk destroy

echo "✅ バックエンドリソースの削除が完了しました！"
