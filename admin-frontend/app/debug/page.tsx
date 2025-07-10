'use client'

import { useState } from 'react'

export default function DebugPage() {
  const [authUrl, setAuthUrl] = useState('')

  const generateAuthUrl = () => {
    const COGNITO_CONFIG = {
      userPoolDomain: 'hiroshima-it-calendar-prod-admin.auth.ap-northeast-1.amazoncognito.com',
      userPoolClientId: '3gfmarg4m7c4r513pmipdc6tbc', // 新しいClient ID
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/')
    
    const url = `https://${COGNITO_CONFIG.userPoolDomain}/oauth2/authorize?` +
      `client_id=${COGNITO_CONFIG.userPoolClientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${redirectUri}`
    
    setAuthUrl(url)
    console.log('Generated Auth URL:', url)
  }

  const testRedirect = () => {
    if (authUrl) {
      window.location.href = authUrl
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Cognito認証デバッグ（新しいClient ID）</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">設定情報</h2>
          <div className="space-y-2 text-sm">
            <p><strong>User Pool Domain:</strong> hiroshima-it-calendar-prod-admin.auth.ap-northeast-1.amazoncognito.com</p>
            <p><strong>Client ID:</strong> 3gfmarg4m7c4r513pmipdc6tbc <span className="text-green-600 font-bold">(NEW)</span></p>
            <p><strong>Current Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
            <p><strong>Redirect URI:</strong> {typeof window !== 'undefined' ? encodeURIComponent(window.location.origin + '/') : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">認証URL生成</h2>
          <button
            onClick={generateAuthUrl}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            認証URL生成
          </button>
          
          {authUrl && (
            <div className="mt-4">
              <p className="font-semibold mb-2">生成された認証URL:</p>
              <div className="bg-gray-100 p-3 rounded text-xs break-all">
                {authUrl}
              </div>
              
              <div className="mt-4 space-x-4">
                <button
                  onClick={testRedirect}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  この URLでリダイレクトテスト
                </button>
                
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 inline-block"
                >
                  新しいタブで開く
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">手動認証URL（新しいClient ID）</h2>
          <p className="text-sm text-gray-600 mb-4">
            新しいClient IDで構築したURLでテストしてください：
          </p>
          <div className="bg-gray-100 p-3 rounded text-xs break-all mb-4">
            https://hiroshima-it-calendar-prod-admin.auth.ap-northeast-1.amazoncognito.com/oauth2/authorize?client_id=3gfmarg4m7c4r513pmipdc6tbc&response_type=code&scope=email+openid+profile&redirect_uri=https%3A//it-study-session.satoshi256kbyte.net/
          </div>
          <a
            href="https://hiroshima-it-calendar-prod-admin.auth.ap-northeast-1.amazoncognito.com/oauth2/authorize?client_id=3gfmarg4m7c4r513pmipdc6tbc&response_type=code&scope=email+openid+profile&redirect_uri=https%3A//it-study-session.satoshi256kbyte.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 inline-block"
          >
            新しいClient IDでテスト
          </a>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg shadow mt-6">
          <h2 className="text-lg font-semibold mb-4 text-yellow-800">変更点</h2>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 古いClient ID: 6st4t1p9pt23f12b5v57quvg5p</li>
            <li>• 新しいClient ID: 3gfmarg4m7c4r513pmipdc6tbc</li>
            <li>• OAuth設定を正しく有効化済み</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
