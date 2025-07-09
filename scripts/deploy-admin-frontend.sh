#!/bin/bash

# 管理画面フロントエンドデプロイスクリプト
# Usage: ./scripts/deploy-admin-frontend.sh [dev|prod]

set -e

ENVIRONMENT=${1:-prod}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 管理画面フロントエンドをデプロイします..."
echo "📋 環境: $ENVIRONMENT"

# 環境に応じたS3バケット名とCloudFront Distribution IDを設定
if [ "$ENVIRONMENT" = "prod" ]; then
    S3_BUCKET="hiroshima-it-calendar-prod-s3-admin-frontend"
    CLOUDFRONT_ID="E3DWME5UQIX3ST"
elif [ "$ENVIRONMENT" = "dev" ]; then
    S3_BUCKET="hiroshima-it-calendar-dev-s3-admin-frontend"
    # dev環境のCloudFront IDは後で設定
    CLOUDFRONT_ID=""
else
    echo "❌ 無効な環境です。dev または prod を指定してください。"
    exit 1
fi

echo "📋 S3バケット: $S3_BUCKET"
echo "📋 CloudFront ID: $CLOUDFRONT_ID"
echo ""

# admin-frontendディレクトリに移動
cd "$PROJECT_ROOT/admin-frontend"

# ビルド実行
echo "🔨 ビルドを実行中..."
npm run build

# S3にアップロード
echo "📤 S3にアップロード中..."
aws s3 sync out/ "s3://$S3_BUCKET/" --profile private --region ap-northeast-1 --delete

# CloudFrontキャッシュ無効化（prod環境のみ）
if [ "$ENVIRONMENT" = "prod" ] && [ -n "$CLOUDFRONT_ID" ]; then
    echo "🔄 CloudFrontキャッシュを無効化中..."
    aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*" --profile private
    echo "✅ キャッシュ無効化が開始されました"
fi

echo ""
echo "✅ デプロイが完了しました！"

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🌐 管理画面URL: https://d3rwbsqvezm9ll.cloudfront.net"
else
    echo "🌐 管理画面URL: (dev環境のCloudFront URLを設定してください)"
fi

echo ""
echo "📝 注意: CloudFrontのキャッシュ無効化には数分かかる場合があります。"
