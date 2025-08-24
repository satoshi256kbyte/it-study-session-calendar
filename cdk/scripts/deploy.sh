#!/bin/bash

# CDKデプロイスクリプト
# 使用方法: ./scripts/deploy.sh [profile]
# 例: ./scripts/deploy.sh my-profile

set -e

# 引数の処理
PROFILE=${1:-default}

echo "🚀 CDKのデプロイを開始します..."
echo "📋 プロファイル: $PROFILE"

export AWS_PROFILE=$PROFILE
export AWS_DEFAULT_REGION=ap-northeast-1

# プロファイルの確認
echo "🔍 AWS認証情報を確認中..."
aws sts get-caller-identity

# admin-backend/distの存在確認
if [ ! -d "../admin-backend/dist" ]; then
    echo "❌ admin-backend/dist が見つかりません"
    echo "💡 先にadmin-backendのビルドを実行してください: cd ../admin-backend && ./scripts/deploy.sh"
    exit 1
fi

# CDKのTypeScriptビルド
echo "🔨 CDKのTypeScriptをビルド中..."
npm run build

# パラメータファイルの検証
echo "✅ パラメータファイルを検証中..."
npm run validate

# デプロイ実行（承認なし）
echo "🚀 CDKをデプロイ中..."
cdk deploy --require-approval never

echo "✅ CDKのデプロイが完了しました！"
