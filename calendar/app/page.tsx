'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import ResponsiveHeaderButtons from './components/ResponsiveHeaderButtons'
import MobileRegisterSection from './components/MobileRegisterSection'
import MonthCalendar from './components/MonthCalendar'
import { useStudySessionEventsWithDefaults } from './hooks/useStudySessionEvents'
import { initializePerformanceMonitoring } from './utils/performance'

// Import responsive header button styles
import './styles/responsive-header-buttons.css'

// Lazy load EventMaterialsList for better initial page load performance
const EventMaterialsList = lazy(() => import('./components/EventMaterialsList'))

export default function Home() {
  const [pageUrl, setPageUrl] = useState<string>('')

  useEffect(() => {
    // パフォーマンス監視を初期化
    initializePerformanceMonitoring()

    // ページURLを設定（シェア機能用）
    const currentPageUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://satoshi256kbyte.github.io/it-study-session-calendar/'
    setPageUrl(currentPageUrl)
  }, [])

  // 勉強会データとシェアテキストを取得するフック
  const {
    events,
    shareText,
    shareContentResult,
    isLoading: isEventsLoading,
    error: eventsError,
    isRetryable,
    retry,
    isFallbackMode,
  } = useStudySessionEventsWithDefaults(pageUrl)

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
            <div className="hidden sm:block">
              <ResponsiveHeaderButtons
                isEventsLoading={isEventsLoading}
                eventsError={eventsError}
                isFallbackMode={isFallbackMode}
                isRetryable={isRetryable}
                onRetry={retry}
                className="header-buttons-container"
              />
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 sm:pt-6 pt-2">
              <p className="text-sm text-gray-600 mb-4">
                connpassの検索で「広島」でHITしたイベントを掲載しています。
              </p>
              <MonthCalendar
                events={events}
                isLoading={isEventsLoading}
                error={eventsError}
                isRetryable={isRetryable}
                onRetry={retry}
              />
            </div>
          </div>

          {/* Mobile Register Section - positioned below calendar on mobile */}
          <MobileRegisterSection />

          {/* 勉強会情報の表示（デバッグ用・開発時のみ） */}
          {process.env.NODE_ENV === 'development' && shareContentResult && (
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                勉強会情報（開発用）
              </h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>取得イベント数: {events.length}</p>
                <p>
                  シェア対象イベント数: {shareContentResult.includedEventsCount}
                </p>
                <p>
                  文字数制限による切り詰め:{' '}
                  {shareContentResult.wasTruncated ? 'あり' : 'なし'}
                </p>
                <p>
                  フォールバックモード: {isFallbackMode ? 'はい' : 'いいえ'}
                </p>
                {shareText && (
                  <div className="mt-2">
                    <p className="font-medium">生成されたシェアテキスト:</p>
                    <pre className="mt-1 text-xs bg-white p-2 rounded border whitespace-pre-wrap">
                      {shareText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* イベント資料一覧セクション */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    <b>イベント資料一覧</b>
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    過去6ヶ月分のconnpassイベントの発表資料
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <Suspense
                fallback={
                  <div className="w-full py-8">
                    <div className="text-center">
                      <div
                        className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
                        aria-label="イベント資料一覧を読み込み中"
                        role="status"
                      ></div>
                      <p className="mt-2 text-gray-600">
                        資料一覧を読み込み中...
                      </p>
                    </div>
                  </div>
                }
              >
                <EventMaterialsList />
              </Suspense>
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
