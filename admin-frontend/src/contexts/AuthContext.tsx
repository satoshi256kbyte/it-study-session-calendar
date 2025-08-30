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
      setError(null)

      // URLにcodeパラメータがある場合（OAuth認証後のリダイレクト）
      const urlParams = new URLSearchParams(window.location.search)
      const authCode = urlParams.get('code')
      const authError = urlParams.get('error')

      if (authError) {
        console.error('Auth error from Cognito:', authError)
        setError(`認証エラー: ${authError}`)
        setLoading(false)
        return
      }

      if (authCode) {
        // URLからcodeパラメータを削除（Amplifyが自動的に処理するため）
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)

        // 少し待ってからセッションをチェック（Amplifyの処理完了を待つ）
        setTimeout(async () => {
          try {
            await checkUserSession()
          } catch (error) {
            console.error('Session check after OAuth failed:', error)
            setError('認証処理に失敗しました。再度ログインしてください。')
            setLoading(false)
          }
        }, 1000)
        return
      }

      // 通常の認証状態チェック
      await checkUserSession()
    } catch (error) {
      setUser(null)
      setError(null) // 認証エラーは正常な状態
      setLoading(false)
    }
  }

  const checkUserSession = async () => {
    // まずセッションを確認
    const session = await fetchAuthSession()

    if (session.tokens && session.tokens.accessToken) {
      // セッションが有効な場合のみユーザー情報を取得
      const currentUser = await getCurrentUser()

      setUser({
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId,
        attributes: {
          email: currentUser.signInDetails?.loginId,
          email_verified: true,
        },
      })
      setLoading(false)
    } else {
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
