#!/bin/bash

# admin-backendデプロイスクリプト
# 使用方法: ./scripts/deploy.sh

set -e

echo "🔨 admin-backendのデプロイを開始します..."

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
npm install

# TypeScriptビルド
echo "🔨 TypeScriptをビルド中..."
npm run build

# ビルド結果の確認
if [ -d "dist" ]; then
    echo "✅ admin-backendのビルドが完了しました"
    ls -la dist/ | head -5
else
    echo "❌ ビルドに失敗しました (dist/ ディレクトリが見つかりません)"
    exit 1
fi

echo "✅ admin-backendのデプロイが完了しました！"
