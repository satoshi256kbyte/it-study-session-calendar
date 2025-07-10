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
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
