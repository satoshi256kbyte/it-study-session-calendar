import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '広島IT勉強会カレンダー 管理画面',
  description: '広島IT勉強会カレンダーの管理画面',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
