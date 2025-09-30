'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  getCurrentUser,
  fetchAuthSession,
  signOut as amplifySignOut,
} from 'aws-amplify/auth'

interface User {
  username: string
  email?: string
  attributes?: {
    email?: string
    email_verified?: boolean
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithHostedUI: () => void
  isAuthenticated: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Cognito設定（環境変数から取得）
const COGNITO_CONFIG = {
  userPoolDomain: process.env.NEXT_PUBLIC_USER_POOL_DOMAIN,
  userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
  redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
}

// 必須環境変数のチェック
const validateEnvironmentVariables = () => {
  const missing = []

  if (!COGNITO_CONFIG.userPoolDomain) {
    missing.push('NEXT_PUBLIC_USER_POOL_DOMAIN')
  }
  if (!COGNITO_CONFIG.userPoolClientId) {
    missing.push('NEXT_PUBLIC_USER_POOL_CLIENT_ID')
  }
  if (!COGNITO_CONFIG.redirectUri) {
    missing.push('NEXT_PUBLIC_REDIRECT_URI')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      validateEnvironmentVariables()
      checkAuthState()
    } catch (error) {
      console.error('Environment validation failed:', error)
      setError(
        error instanceof Error ? error.message : '設定エラーが発生しました'
      )
      setLoading(false)
    }
  }, [])

  const checkAuthState = async () => {
    try {
      console.log('🔍 checkAuthState: 開始')
      setError(null)

      // URLにcodeパラメータがある場合（OAuth認証後のリダイレクト）
      const urlParams = new URLSearchParams(window.location.search)
      const authCode = urlParams.get('code')
      const authError = urlParams.get('error')

      console.log('🔍 URL params:', { authCode: !!authCode, authError })

      if (authError) {
        console.error('❌ Auth error from Cognito:', authError)
        setError(`認証エラー: ${authError}`)
        setLoading(false)
        return
      }

      if (authCode) {
        console.log('✅ OAuth認証コードを検出、処理開始')
        // URLからcodeパラメータを削除
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)

        // Amplify v6では手動でトークン交換が必要
        try {
          console.log('🔍 トークン交換開始')

          // 認証コードをトークンに交換するためのリクエスト
          const tokenResponse = await fetch(
            `https://${COGNITO_CONFIG.userPoolDomain}/oauth2/token`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: COGNITO_CONFIG.userPoolClientId!,
                code: authCode,
                redirect_uri: COGNITO_CONFIG.redirectUri!,
              }),
            }
          )

          if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${tokenResponse.status}`)
          }

          const tokens = await tokenResponse.json()
          console.log('✅ トークン交換成功')

          // トークンをローカルストレージに保存（Amplifyの形式で）
          const tokenKey = `CognitoIdentityServiceProvider.${COGNITO_CONFIG.userPoolClientId!}`
          const userKey = `${tokenKey}.LastAuthUser`

          // ユーザー名をJWTから取得
          const payload = JSON.parse(atob(tokens.id_token.split('.')[1]))
          const username = payload['cognito:username'] || payload.sub

          localStorage.setItem(userKey, username)
          localStorage.setItem(
            `${tokenKey}.${username}.idToken`,
            tokens.id_token
          )
          localStorage.setItem(
            `${tokenKey}.${username}.accessToken`,
            tokens.access_token
          )
          localStorage.setItem(
            `${tokenKey}.${username}.refreshToken`,
            tokens.refresh_token
          )
          localStorage.setItem(
            `${tokenKey}.${username}.tokenScopesString`,
            'email openid profile'
          )
          localStorage.setItem(`${tokenKey}.${username}.clockDrift`, '0')

          console.log('✅ トークンをローカルストレージに保存完了')

          // セッションチェック
          setTimeout(async () => {
            try {
              console.log('🔍 OAuth後のセッションチェック開始')
              await checkUserSession()
            } catch (error) {
              console.error('❌ Session check after OAuth failed:', error)
              setError('認証処理に失敗しました。再度ログインしてください。')
              setLoading(false)
            }
          }, 500)
        } catch (error) {
          console.error('❌ Token exchange failed:', error)
          setError('認証処理に失敗しました。再度ログインしてください。')
          setLoading(false)
        }
        return
      }

      // 通常の認証状態チェック
      console.log('🔍 通常の認証状態チェック開始')
      await checkUserSession()
    } catch (error) {
      console.log('🔍 認証チェック例外:', error)
      setUser(null)
      setError(null) // 認証エラーは正常な状態
      setLoading(false)
    }
  }

  const checkUserSession = async () => {
    console.log('🔍 checkUserSession: セッション確認開始')

    // まずセッションを確認
    const session = await fetchAuthSession()
    console.log('🔍 fetchAuthSession結果:', {
      hasTokens: !!session.tokens,
      hasAccessToken: !!session.tokens?.accessToken,
      hasIdToken: !!session.tokens?.idToken,
    })

    if (session.tokens && session.tokens.accessToken) {
      console.log('✅ 有効なセッションを検出、ユーザー情報取得中')
      // セッションが有効な場合のみユーザー情報を取得
      const currentUser = await getCurrentUser()
      console.log('✅ ユーザー情報取得成功:', currentUser.username)

      setUser({
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId,
        attributes: {
          email: currentUser.signInDetails?.loginId,
          email_verified: true,
        },
      })
      console.log('✅ ユーザー設定完了、ローディング終了')
      setLoading(false)
    } else {
      console.log('❌ セッションが無効またはアクセストークンなし')
      throw new Error('No valid session')
    }
  }

  const signInWithHostedUI = () => {
    // 環境変数のバリデーションは既に実行済みなので、非null演算子を使用
    const redirectUri = encodeURIComponent(COGNITO_CONFIG.redirectUri!)

    const authUrl =
      `https://${COGNITO_CONFIG.userPoolDomain}/oauth2/authorize?` +
      `client_id=${COGNITO_CONFIG.userPoolClientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${redirectUri}`

    window.location.href = authUrl
  }

  const handleSignOut = async () => {
    try {
      setError(null)

      // ローカルストレージからトークンを削除
      const tokenKey = `CognitoIdentityServiceProvider.${COGNITO_CONFIG.userPoolClientId!}`
      const userKey = `${tokenKey}.LastAuthUser`
      const username = localStorage.getItem(userKey)

      if (username) {
        localStorage.removeItem(`${tokenKey}.${username}.idToken`)
        localStorage.removeItem(`${tokenKey}.${username}.accessToken`)
        localStorage.removeItem(`${tokenKey}.${username}.refreshToken`)
        localStorage.removeItem(`${tokenKey}.${username}.tokenScopesString`)
        localStorage.removeItem(`${tokenKey}.${username}.clockDrift`)
        localStorage.removeItem(userKey)
      }

      await amplifySignOut()
      setUser(null)

      // Cognito Hosted UIからもサインアウト
      const logoutUri = encodeURIComponent(COGNITO_CONFIG.redirectUri!)

      const logoutUrl =
        `https://${COGNITO_CONFIG.userPoolDomain}/logout?` +
        `client_id=${COGNITO_CONFIG.userPoolClientId}&` +
        `logout_uri=${logoutUri}`

      window.location.href = logoutUrl
    } catch (error) {
      console.error('Error signing out:', error)
      setError('ログアウトに失敗しました')
      // エラーが発生してもローカルの状態はクリア
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signOut: handleSignOut,
    signInWithHostedUI,
    isAuthenticated: !!user,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
