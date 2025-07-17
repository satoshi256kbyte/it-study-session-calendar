#!/bin/bash

# フロントエンド環境変数設定スクリプト
# 使用方法: ./scripts/setup-frontend-env.sh [profile]
# 例: ./scripts/setup-frontend-env.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🔧 フロントエンド環境変数を設定します..."
echo "📋 プロファイル: $PROFILE"

# AWSプロファイルを設定
export AWS_PROFILE=$PROFILE

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

# CloudFormationからアウトプットを取得
echo "🔍 デプロイされたリソース情報を取得中..."

# AWS リージョンを取得
AWS_REGION=$(aws configure get region --profile $PROFILE || echo "ap-northeast-1")

# Cognito User Pool IDを取得
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
    --output text 2>/dev/null || echo "")

# Cognito User Pool Client IDを取得
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
    --output text 2>/dev/null || echo "")

# 管理画面URLを取得
ADMIN_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='AdminFrontendUrl'].OutputValue" \
    --output text 2>/dev/null || echo "")

# User Pool Domainを構築
USER_POOL_DOMAIN="${SERVICE_NAME}-${ENVIRONMENT}.auth.${AWS_REGION}.amazoncognito.com"

# リダイレクトURLを設定
if [ -n "$ADMIN_URL" ] && [ "$ADMIN_URL" != "None" ] && [ "$ADMIN_URL" != "" ]; then
    REDIRECT_URI="$ADMIN_URL"
else
    REDIRECT_URI="https://your-domain.example.com/"
fi

echo "✅ リソース情報を取得しました:"
echo "   AWS Region: $AWS_REGION"
echo "   User Pool ID: ${USER_POOL_ID:-'未取得'}"
echo "   User Pool Client ID: ${USER_POOL_CLIENT_ID:-'未取得'}"
echo "   User Pool Domain: $USER_POOL_DOMAIN"
echo "   管理画面URL: ${ADMIN_URL:-'未設定'}"
echo "   Redirect URI: $REDIRECT_URI"

# admin-frontendディレクトリに移動
cd ../admin-frontend

# .env.localファイルを作成
echo "📝 .env.local ファイルを作成中..."

cat > .env.local << EOF
# 自動生成された環境変数ファイル
# 生成日時: $(date)
# プロファイル: $PROFILE
# スタック名: $STACK_NAME

# AWS Cognito設定
NEXT_PUBLIC_AWS_REGION=$AWS_REGION
NEXT_PUBLIC_USER_POOL_ID=${USER_POOL_ID:-your-user-pool-id}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID:-your-user-pool-client-id}
NEXT_PUBLIC_USER_POOL_DOMAIN=$USER_POOL_DOMAIN
NEXT_PUBLIC_REDIRECT_URI=$REDIRECT_URI

# リダイレクトURL
NEXT_PUBLIC_REDIRECT_SIGN_IN=$REDIRECT_URI
NEXT_PUBLIC_REDIRECT_SIGN_OUT=$REDIRECT_URI
EOF

echo "✅ .env.local ファイルを作成しました！"
echo "📁 場所: admin-frontend/.env.local"
echo ""
echo "🔧 設定された環境変数:"
echo "   NEXT_PUBLIC_AWS_REGION=$AWS_REGION"
echo "   NEXT_PUBLIC_USER_POOL_ID=${USER_POOL_ID:-your-user-pool-id}"
echo "   NEXT_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID:-your-user-pool-client-id}"
echo "   NEXT_PUBLIC_USER_POOL_DOMAIN=$USER_POOL_DOMAIN"
echo "   NEXT_PUBLIC_REDIRECT_URI=$REDIRECT_URI"
echo ""
echo "🚀 フロントエンドの開発を開始できます！"
