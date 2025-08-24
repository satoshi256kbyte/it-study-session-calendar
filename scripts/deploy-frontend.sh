#!/bin/bash

# フロントエンドデプロイスクリプト
# 使用方法: ./scripts/deploy-frontend.sh [profile]
# 例: ./scripts/deploy-frontend.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🚀 フロントエンドのデプロイを開始します..."
echo "📋 プロファイル: $PROFILE"

export AWS_PROFILE=$PROFILE
export AWS_DEFAULT_REGION=ap-northeast-1

# プロファイルの確認
echo "🔍 AWS認証情報を確認中..."
aws sts get-caller-identity

# CDKディレクトリに移動してparameters.jsonを読み込み
cd cdk

# parameters.jsonの存在確認
if [ ! -f "parameters.json" ]; then
    echo "❌ parameters.json が見つかりません。先にセットアップを実行してください。"
    echo "   cd cdk && npm run setup"
    exit 1
fi

# parameters.jsonから値を取得
SERVICE_NAME=$(node -e "console.log(JSON.parse(require('fs').readFileSync('parameters.json', 'utf8')).serviceName)")
ENVIRONMENT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('parameters.json', 'utf8')).environment)")

echo "📊 サービス名: $SERVICE_NAME"
echo "🌍 環境: $ENVIRONMENT"

# CloudFormationスタック名を構築
STACK_NAME="${SERVICE_NAME}-${ENVIRONMENT}-stack"

echo "📦 スタック名: $STACK_NAME"

# CloudFormationからS3バケット名とCloudFront Distribution IDを取得
echo "🔍 デプロイ先リソース情報を取得中..."

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='AdminFrontendBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$S3_BUCKET" ] || [ "$S3_BUCKET" = "None" ]; then
    echo "❌ S3バケット名を取得できませんでした。バックエンドが正しくデプロイされているか確認してください。"
    exit 1
fi

echo "✅ デプロイ先リソース情報:"
echo "   S3 バケット: $S3_BUCKET"
echo "   CloudFront ID: ${CLOUDFRONT_ID:-'未設定'}"

# admin-frontendディレクトリに移動
cd ../admin-frontend

# .env.localの存在確認
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local が見つかりません。"
    echo "   先に環境変数を設定してください: ./scripts/setup-frontend-env.sh"
    exit 1
fi

# フロントエンドをビルド
echo "🔨 フロントエンドをビルド中..."
npm run build

# S3にアップロード
echo "📤 S3にアップロード中..."
aws s3 sync out/ s3://$S3_BUCKET --delete

echo "✅ S3へのアップロードが完了しました！"

# CloudFrontのキャッシュクリア
if [ -n "$CLOUDFRONT_ID" ] && [ "$CLOUDFRONT_ID" != "None" ] && [ "$CLOUDFRONT_ID" != "" ]; then
    echo "🔄 CloudFrontのキャッシュをクリア中..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" \
        --query "Invalidation.Id" \
        --output text)
    
    echo "✅ キャッシュクリアを開始しました（ID: $INVALIDATION_ID）"
    echo "🕐 キャッシュクリアの完了まで数分かかる場合があります。"
else
    echo "⚠️  CloudFront Distribution IDが見つかりません。キャッシュクリアをスキップします。"
fi

echo ""
echo "🎉 フロントエンドのデプロイが完了しました！"
echo "📁 S3バケット: $S3_BUCKET"
if [ -n "$CLOUDFRONT_ID" ] && [ "$CLOUDFRONT_ID" != "None" ] && [ "$CLOUDFRONT_ID" != "" ]; then
    ADMIN_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='AdminFrontendUrl'].OutputValue" \
        --output text 2>/dev/null || echo "")
    if [ -n "$ADMIN_URL" ] && [ "$ADMIN_URL" != "None" ]; then
        echo "🌐 管理画面URL: $ADMIN_URL"
    fi
fi
