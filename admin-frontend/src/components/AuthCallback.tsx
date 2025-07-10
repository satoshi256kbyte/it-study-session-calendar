'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          console.error('Auth error:', error)
          setStatus('error')
          setTimeout(() => {
            router.push('/?error=auth_failed')
          }, 2000)
          return
        }

        if (code) {
          // 認証コードがある場合は成功
          setStatus('success')
          setTimeout(() => {
            router.push('/')
          }, 1000)
        } else {
          // コードもエラーもない場合はホームにリダイレクト
          router.push('/')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setTimeout(() => {
          router.push('/?error=auth_failed')
        }, 2000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">認証処理中...</p>
            <p className="mt-2 text-sm text-gray-500">しばらくお待ちください</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-gray-600">認証が完了しました</p>
            <p className="mt-2 text-sm text-gray-500">管理画面に移動しています...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-gray-600">認証に失敗しました</p>
            <p className="mt-2 text-sm text-gray-500">ログイン画面に戻ります...</p>
          </>
        )}
      </div>
    </div>
  )
}
