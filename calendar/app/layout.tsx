'use client'

import type { Viewport } from 'next'
import './globals.css'
import { useEffect } from 'react'

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
  useEffect(() => {
    // ページタイトルを設定
    document.title = '広島IT勉強会カレンダー'

    // メタ情報を設定
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        '広島のIT関連の勉強会やイベントのカレンダーです。'
      )
    } else {
      const newMeta = document.createElement('meta')
      newMeta.name = 'description'
      newMeta.content = '広島のIT関連の勉強会やイベントのカレンダーです。'
      document.head.appendChild(newMeta)
    }

    // キーワードメタタグを設定
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords) {
      metaKeywords.setAttribute(
        'content',
        '広島,IT,勉強会,エンジニア,セミナー,イベント'
      )
    } else {
      const newKeywords = document.createElement('meta')
      newKeywords.name = 'keywords'
      newKeywords.content = '広島,IT,勉強会,エンジニア,セミナー,イベント'
      document.head.appendChild(newKeywords)
    }

    // ファビコンを設定
    const basePath =
      process.env.NODE_ENV === 'production' ? '/it-study-session-calendar' : ''
    const existingFavicon = document.querySelector(
      "link[rel*='icon']"
    ) as HTMLLinkElement
    if (existingFavicon) {
      existingFavicon.href = `${basePath}/favicon.svg`
      existingFavicon.type = 'image/svg+xml'
    } else {
      const newFavicon = document.createElement('link')
      newFavicon.rel = 'icon'
      newFavicon.type = 'image/svg+xml'
      newFavicon.href = `${basePath}/favicon.svg`
      document.head.appendChild(newFavicon)
    }

    // Open Graph設定
    const setOgMeta = (property: string, content: string) => {
      const existing = document.querySelector(`meta[property="${property}"]`)
      if (existing) {
        existing.setAttribute('content', content)
      } else {
        const meta = document.createElement('meta')
        meta.setAttribute('property', property)
        meta.setAttribute('content', content)
        document.head.appendChild(meta)
      }
    }

    setOgMeta('og:type', 'website')
    setOgMeta('og:locale', 'ja_JP')
    setOgMeta(
      'og:url',
      'https://satoshi256kbyte.github.io/it-study-session-calendar/'
    )
    setOgMeta('og:site_name', '広島IT勉強会カレンダー')
    setOgMeta('og:title', '広島IT勉強会カレンダー')
    setOgMeta(
      'og:description',
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。'
    )
    setOgMeta('og:image', `${basePath}/og-image.png`)

    // Twitter Card設定
    const setTwitterMeta = (name: string, content: string) => {
      const existing = document.querySelector(`meta[name="${name}"]`)
      if (existing) {
        existing.setAttribute('content', content)
      } else {
        const meta = document.createElement('meta')
        meta.setAttribute('name', name)
        meta.setAttribute('content', content)
        document.head.appendChild(meta)
      }
    }

    setTwitterMeta('twitter:card', 'summary')
    setTwitterMeta('twitter:site', '@hiroshima_it_cal')
    setTwitterMeta('twitter:creator', '@hiroshima_it_cal')
    setTwitterMeta('twitter:title', '広島IT勉強会カレンダー')
    setTwitterMeta(
      'twitter:description',
      '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション。connpassやDoorkeeperなどの勉強会情報を一元管理し、参加しやすい環境を提供します。'
    )
    setTwitterMeta('twitter:image', `${basePath}/og-image.png`)

    // 構造化データを設定
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

    const existingScript = document.querySelector(
      'script[type="application/ld+json"]'
    )
    if (existingScript) {
      existingScript.textContent = JSON.stringify(structuredData)
    } else {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(structuredData)
      document.head.appendChild(script)
    }
  }, [])

  return (
    <html lang="ja">
      <head>
        <title>広島IT勉強会カレンダー</title>
        <meta
          name="description"
          content="広島のIT関連の勉強会やイベントのカレンダーです。"
        />
        <meta
          name="keywords"
          content="広島,IT,勉強会,エンジニア,セミナー,イベント"
        />
        <link
          rel="icon"
          href={`${process.env.NODE_ENV === 'production' ? '/it-study-session-calendar' : ''}/favicon.svg`}
          type="image/svg+xml"
        />
        <link
          rel="apple-touch-icon"
          href={`${process.env.NODE_ENV === 'production' ? '/it-study-session-calendar' : ''}/favicon.svg`}
        />
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
