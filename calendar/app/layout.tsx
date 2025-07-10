import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    'https://satoshi256kbyte.github.io/it-study-session-calendar/'
  ),
  title: '広島IT勉強会カレンダー',
  description: '広島のIT関連の勉強会やイベントのカレンダーです。',
  keywords: ['広島', 'IT', '勉強会', 'エンジニア', 'セミナー', 'イベント'],
  authors: [{ name: '広島IT勉強会カレンダー' }],
  creator: '広島IT勉強会カレンダー',
  publisher: '広島IT勉強会カレンダー',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://satoshi256kbyte.github.io/it-study-session-calendar/',
    siteName: '広島IT勉強会カレンダー',
    title: '広島IT勉強会カレンダー',
    description:
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '広島IT勉強会カレンダー',
      },
    ],
  },
  twitter: {
    card: 'summary',
    site: '@hiroshima_it_cal',
    creator: '@hiroshima_it_cal',
    title: '広島IT勉強会カレンダー',
    description:
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3B82F6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '広島IT勉強会カレンダー',
    description:
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
    url: 'https://satoshi256kbyte.github.io/it-study-session-calendar/',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    author: {
      '@type': 'Organization',
      name: '広島IT勉強会カレンダー',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'IT Engineers',
      geographicArea: {
        '@type': 'City',
        name: '広島市',
        containedInPlace: {
          '@type': 'Country',
          name: '日本',
        },
      },
    },
  }

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="apple-mobile-web-app-title"
          content="広島IT勉強会カレンダー"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
