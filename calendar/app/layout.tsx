import type { Metadata, Viewport } from 'next'
import './globals.css'
import './styles/image-optimization.css'
import './styles/browser-compatibility.css'
import './styles/responsive-header-buttons-minimal.css'
import './styles/transitions.css'
import BrowserCompatibilityProvider from './components/BrowserCompatibilityProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3B82F6',
}

const basePath =
  process.env.NODE_ENV === 'production' ? '/it-study-session-calendar' : ''
const baseUrl = 'https://satoshi256kbyte.github.io/it-study-session-calendar'

export const metadata: Metadata = {
  title: '広島IT勉強会カレンダー',
  description:
    '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。',
  keywords: [
    '広島',
    'IT',
    '勉強会',
    'エンジニア',
    'セミナー',
    'イベント',
    'connpass',
    'Doorkeeper',
  ],
  authors: [{ name: '広島IT勉強会カレンダー' }],
  creator: '広島IT勉強会カレンダー',
  publisher: '広島IT勉強会カレンダー',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: `${basePath}/favicon.svg`,
    apple: `${basePath}/favicon.svg`,
  },
  manifest: `${basePath}/manifest.json`,
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: baseUrl,
    siteName: '広島IT勉強会カレンダー',
    title: '広島IT勉強会カレンダー',
    description:
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。',
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: '広島IT勉強会カレンダー',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hiroshima_it_cal',
    creator: '@hiroshima_it_cal',
    title: '広島IT勉強会カレンダー',
    description:
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。',
    images: [`${baseUrl}/og-image.png`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '広島IT勉強会カレンダー',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
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
      <body>
        <BrowserCompatibilityProvider>{children}</BrowserCompatibilityProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </body>
    </html>
  )
}
