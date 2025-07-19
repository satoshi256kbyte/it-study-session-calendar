'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { Amplify } from 'aws-amplify'
import awsconfig from '../src/aws-exports'
import { AuthProvider } from '../src/contexts/AuthContext'
import { useEffect } from 'react'

const inter = Inter({ subsets: ['latin'] })

// Amplifyの設定
Amplify.configure(awsconfig)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // ページタイトルを設定
    document.title = '[管理画面]広島IT勉強会カレンダー'

    // メタ情報を設定
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        '[管理画面]広島IT勉強会カレンダー'
      )
    } else {
      const newMeta = document.createElement('meta')
      newMeta.name = 'description'
      newMeta.content = '[管理画面]広島IT勉強会カレンダー'
      document.head.appendChild(newMeta)
    }

    // ファビコンを設定
    const existingFavicon = document.querySelector(
      "link[rel*='icon']"
    ) as HTMLLinkElement
    if (existingFavicon) {
      existingFavicon.href = '/favicon.svg'
      existingFavicon.type = 'image/svg+xml'
    } else {
      const newFavicon = document.createElement('link')
      newFavicon.rel = 'icon'
      newFavicon.type = 'image/svg+xml'
      newFavicon.href = '/favicon.svg'
      document.head.appendChild(newFavicon)
    }
  }, [])

  return (
    <html lang="ja">
      <head>
        <title>[管理画面]広島IT勉強会カレンダー</title>
        <meta name="description" content="[管理画面]広島IT勉強会カレンダー" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
