'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CalendarExtractor } from './utils/calendarExtractor'

export default function Home() {
  const [calendarUrl, setCalendarUrl] = useState<string>('')
  const [isCopyButtonEnabled, setIsCopyButtonEnabled] = useState<boolean>(false)
  const [isExtracting, setIsExtracting] = useState<boolean>(false)
  const [copyStatus, setCopyStatus] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(15)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // 環境変数からGoogleカレンダーのURLを取得
    // 開発時はデフォルトのサンプルURLを使用
    const url =
      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL ||
      'https://calendar.google.com/calendar/embed?src=ja.japanese%23holiday%40group.v.calendar.google.com&ctz=Asia%2FTokyo'
    setCalendarUrl(url)

    // カウントダウンタイマー
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsCopyButtonEnabled(true)
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [])

  const extractCalendarEvents = async (): Promise<string> => {
    if (!iframeRef.current) {
      return CalendarExtractor.generateSampleMarkdown()
    }

    try {
      // CalendarExtractorを使用してイベントを抽出
      const events = await CalendarExtractor.extractFromIframe(
        iframeRef.current
      )

      if (events.length > 0) {
        return CalendarExtractor.eventsToMarkdown(events)
      } else {
        // 抽出に失敗した場合はサンプルデータを返す
        return CalendarExtractor.generateSampleMarkdown()
      }
    } catch (error) {
      console.error('Calendar extraction error:', error)

      // エラーの場合もサンプルデータを返す
      return CalendarExtractor.generateSampleMarkdown()
    }
  }

  const handleCopyMarkdown = async () => {
    if (!isCopyButtonEnabled) return

    setIsExtracting(true)
    setCopyStatus('カレンダーの内容を解析中...')

    try {
      const markdown = await extractCalendarEvents()

      // クリップボードにコピー
      await navigator.clipboard.writeText(markdown)
      setCopyStatus('マークダウンテキストをクリップボードにコピーしました！')

      // 3秒後にステータスメッセージをクリア
      setTimeout(() => {
        setCopyStatus('')
      }, 3000)
    } catch (error) {
      console.error('Copy error:', error)
      setCopyStatus('コピーに失敗しました。')

      // 3秒後にエラーメッセージをクリア
      setTimeout(() => {
        setCopyStatus('')
      }, 3000)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: '広島IT勉強会カレンダー',
      text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
      url: 'https://satoshi256kbyte.github.io/it-study-session-calendar/',
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url)
      alert('URLをクリップボードにコピーしました')
    }
  }

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      '広島のIT勉強会やイベントをチェック！ #広島IT #勉強会'
    )
    const url = encodeURIComponent(
      'https://satoshi256kbyte.github.io/it-study-session-calendar/'
    )
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank'
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                広島IT勉強会カレンダー
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCopyMarkdown}
                disabled={!isCopyButtonEnabled || isExtracting}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  isCopyButtonEnabled && !isExtracting
                    ? 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                    : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                }`}
                title={
                  !isCopyButtonEnabled
                    ? '15秒後に有効になります'
                    : 'カレンダーの内容をマークダウン形式でコピー'
                }
              >
                {isExtracting ? (
                  <svg
                    className="animate-spin w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {isExtracting ? '解析中...' : 'MDコピー'}
                {!isCopyButtonEnabled && countdown > 0 && (
                  <span className="ml-1 text-xs">({countdown}s)</span>
                )}
              </button>
              <button
                onClick={shareOnTwitter}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                共有
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                シェア
              </button>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                勉強会を登録
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    広島の勉強会スケジュール
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    広島のIT関連の勉強会やイベントのスケジュールを確認できます
                  </p>
                </div>
                {copyStatus && (
                  <div
                    className={`text-sm px-3 py-1 rounded-md ${
                      copyStatus.includes('成功') ||
                      copyStatus.includes('コピーしました')
                        ? 'bg-green-100 text-green-800'
                        : copyStatus.includes('エラー') ||
                            copyStatus.includes('失敗')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {copyStatus}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6">
              {calendarUrl ? (
                <div className="calendar-container">
                  <iframe
                    ref={iframeRef}
                    src={calendarUrl}
                    title="広島IT勉強会カレンダー"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-gray-500 text-lg mb-2">
                      カレンダーを読み込み中...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2025 広島IT勉強会カレンダー |{' '}
              <a
                href="https://github.com/satoshi256kbyte/it-study-session-calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
