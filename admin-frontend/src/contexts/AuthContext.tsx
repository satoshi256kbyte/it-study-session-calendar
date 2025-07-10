'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth'

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

// Cognito設定（環境変数または設定ファイルから取得）
const COGNITO_CONFIG = {
  userPoolDomain: process.env.NEXT_PUBLIC_USER_POOL_DOMAIN || 'hiroshima-it-calendar-prod-admin.auth.ap-northeast-1.amazoncognito.com',
  userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '3gfmarg4m7c4r513pmipdc6tbc',
  redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'https://it-study-session.satoshi256kbyte.net/'
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    try {
      setError(null)
      console.log('Checking auth state...')
      
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
        console.log('Auth code found:', authCode)
        console.log('Processing OAuth callback manually...')
        
        try {
          // 手動でトークン交換を実行
          await handleManualTokenExchange(authCode)
          
          // URLからcodeパラメータを削除
          const newUrl = window.location.pathname
          window.history.replaceState({}, document.title, newUrl)
          
        } catch (error) {
          console.error('Manual token exchange failed:', error)
          setError('認証処理に失敗しました。再度ログインしてください。')
          setLoading(false)
          
          // URLからcodeパラメータを削除
          const newUrl = window.location.pathname
          window.history.replaceState({}, document.title, newUrl)
          return
        }
      }
      
      // 通常の認証状態チェック
      await checkUserSession()
    } catch (error) {
      console.log('Auth check error (this is normal for unauthenticated users):', error)
      setUser(null)
      setError(null) // 認証エラーは正常な状態
      setLoading(false)
    }
  }

  const handleManualTokenExchange = async (authCode: string) => {
    console.log('Starting manual token exchange...')
    
    try {
      // Cognitoのトークンエンドポイントにリクエスト
      const tokenEndpoint = `https://${COGNITO_CONFIG.userPoolDomain}/oauth2/token`
      const redirectUri = window.location.origin + '/'
      
      const tokenRequest = {
        grant_type: 'authorization_code',
        client_id: COGNITO_CONFIG.userPoolClientId,
        code: authCode,
        redirect_uri: redirectUri
      }
      
      console.log('Token request:', tokenRequest)
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Token exchange failed:', response.status, errorText)
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
      }
      
      const tokens = await response.json()
      console.log('Token exchange successful:', tokens)
      
      // トークンをAmplifyのストレージに保存
      await storeTokensInAmplify(tokens)
      
      // ユーザー情報を取得
      await checkUserSession()
      
    } catch (error) {
      console.error('Manual token exchange error:', error)
      throw error
    }
  }

  const storeTokensInAmplify = async (tokens: any) => {
    console.log('Storing tokens in Amplify...')
    
    try {
      // Amplifyのローカルストレージにトークンを保存
      const tokenKey = `CognitoIdentityServiceProvider.${COGNITO_CONFIG.userPoolClientId}`
      const userKey = `${tokenKey}.LastAuthUser`
      
      // ユーザー名を取得（JWTトークンから）
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]))
      const username = idTokenPayload['cognito:username'] || idTokenPayload.sub
      
      console.log('Username from token:', username)
      
      // ローカルストレージにトークンを保存
      localStorage.setItem(userKey, username)
      localStorage.setItem(`${tokenKey}.${username}.idToken`, tokens.id_token)
      localStorage.setItem(`${tokenKey}.${username}.accessToken`, tokens.access_token)
      localStorage.setItem(`${tokenKey}.${username}.refreshToken`, tokens.refresh_token)
      localStorage.setItem(`${tokenKey}.${username}.tokenScopesString`, 'email openid profile')
      
      // 有効期限を設定
      const expiresAt = Date.now() + (tokens.expires_in * 1000)
      localStorage.setItem(`${tokenKey}.${username}.clockDrift`, '0')
      
      console.log('Tokens stored successfully')
      
    } catch (error) {
      console.error('Error storing tokens:', error)
      throw error
    }
  }

  const checkUserSession = async () => {
    try {
      console.log('Checking existing session...')
      
      // まずセッションを確認
      const session = await fetchAuthSession()
      console.log('Session:', session)
      
      if (session.tokens && session.tokens.accessToken) {
        // セッションが有効な場合のみユーザー情報を取得
        try {
          const currentUser = await getCurrentUser()
          console.log('Current user:', currentUser)
          
          setUser({
            username: currentUser.username,
            email: currentUser.signInDetails?.loginId,
            attributes: {
              email: currentUser.signInDetails?.loginId,
              email_verified: true
            }
          })
          setLoading(false)
        } catch (userError) {
          console.log('Error getting user info:', userError)
          throw userError
        }
      } else {
        console.log('No valid session found')
        throw new Error('No valid session')
      }
    } catch (error) {
      console.log('Session check failed:', error)
      throw error
    }
  }

  const signInWithHostedUI = () => {
    console.log('Starting sign in with Hosted UI...')
    
    const redirectUri = encodeURIComponent(window.location.origin + '/')
    
    const authUrl = `https://${COGNITO_CONFIG.userPoolDomain}/oauth2/authorize?` +
      `client_id=${COGNITO_CONFIG.userPoolClientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${redirectUri}`
    
    console.log('Auth URL:', authUrl)
    console.log('Using Client ID:', COGNITO_CONFIG.userPoolClientId)
    
    window.location.href = authUrl
  }

  const handleSignOut = async () => {
    try {
      setError(null)
      
      // ローカルストレージからトークンを削除
      const tokenKey = `CognitoIdentityServiceProvider.${COGNITO_CONFIG.userPoolClientId}`
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
      const logoutUri = encodeURIComponent(window.location.origin + '/')
      
      const logoutUrl = `https://${COGNITO_CONFIG.userPoolDomain}/logout?` +
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
    error
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
