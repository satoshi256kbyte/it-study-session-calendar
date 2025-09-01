'use client'

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from 'react'
import ResponsiveHeaderButtons from './components/ResponsiveHeaderButtons'
import CalendarHeaderButtons from './components/CalendarHeaderButtons'
import MobileRegisterSection from './components/MobileRegisterSection'
import LoadingSpinner from './components/LoadingSpinner'
import { useStudySessionEventsWithDefaults } from './hooks/useStudySessionEvents'
import { initializePerformanceMonitoring } from './utils/performance'

// Import responsive header button styles
import './styles/responsive-header-buttons.css'

// Lazy load EventMaterialsList for better initial page load performance
const EventMaterialsList = lazy(() => import('./components/EventMaterialsList'))

export default function Home() {
  const [calendarUrl, setCalendarUrl] = useState<string>('')
  const [pageUrl, setPageUrl] = useState<string>('')

  useEffect(() => {
    // パフォーマンス監視を初期化
    initializePerformanceMonitoring()

    // 環境変数からGoogleカレンダーのURLを取得
    // 開発時はデフォルトのサンプルURLを使用
    const url =
      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL ||
      'https://calendar.google.com/calendar/embed?src=ja.japanese%23holiday%40group.v.calendar.google.com&ctz=Asia%2FTokyo'
    setCalendarUrl(url)

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

  // Memoize share data to prevent unnecessary re-creation
  const shareData = useMemo(
    () => ({
      title: '広島IT勉強会カレンダー',
      text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
      url:
        pageUrl ||
        'https://satoshi256kbyte.github.io/it-study-session-calendar/',
    }),
    [pageUrl]
  )

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // Sharing was cancelled or failed - no action needed
        if (process.env.NODE_ENV === 'development') {
          console.log('Error sharing:', err)
        }
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url)
      alert('URLをクリップボードにコピーしました')
    }
  }, [shareData])

  // Twitter共有のクリック分析用コールバック（メモ化）
  const handleTwitterShareClick = useCallback(() => {
    // 分析やログ記録が必要な場合はここに実装
    console.log('Twitter共有ボタンがクリックされました', {
      eventsCount: events.length,
      shareTextLength: shareText.length,
      isFallbackMode,
      timestamp: new Date().toISOString(),
    })
  }, [events.length, shareText.length, isFallbackMode])

  // Twitter共有エラー時のコールバック（メモ化）
  const handleTwitterShareError = useCallback((error: Error) => {
    console.error('Twitter共有でエラーが発生しました:', error)
    // エラー分析やログ記録が必要な場合はここに実装
  }, [])

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
                shareText={shareText}
                calendarUrl={pageUrl}
                isEventsLoading={isEventsLoading}
                eventsError={eventsError}
                isFallbackMode={isFallbackMode}
                isRetryable={isRetryable}
                onRetry={retry}
                onShareClick={handleTwitterShareClick}
                onTwitterShareError={handleTwitterShareError}
                onNativeShare={handleShare}
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
            {/* カレンダー上部のボタン（スマホ表示のみ） */}
            <div className="sm:hidden flex justify-end p-4 pb-0">
              <CalendarHeaderButtons
                shareText={shareText}
                calendarUrl={pageUrl}
                isEventsLoading={isEventsLoading}
                eventsError={eventsError}
                isFallbackMode={isFallbackMode}
                onShareClick={handleTwitterShareClick}
                onTwitterShareError={handleTwitterShareError}
                onNativeShare={handleShare}
              />
            </div>

            <div className="p-6 sm:pt-6 pt-2">
              {calendarUrl ? (
                <div className="calendar-container calendar-optimized">
                  <iframe
                    src={calendarUrl}
                    title="広島IT勉強会カレンダー"
                    style={{ border: 0 }}
                    loading="lazy"
                    aria-label="広島のIT勉強会イベントカレンダー"
                    referrerPolicy="no-referrer-when-downgrade"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <LoadingSpinner
                    size="lg"
                    text="カレンダーを読み込み中..."
                    centered
                    ariaLabel="Googleカレンダーを読み込み中"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Register Section - positioned below calendar on mobile */}
          <MobileRegisterSection />

          {/* エラー状態とフォールバック表示 */}
          {eventsError && (
            <div className="mt-8 bg-white rounded-lg shadow border-l-4 border-yellow-400">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {isFallbackMode
                        ? '勉強会データの取得に問題があります'
                        : 'システムエラー'}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        {isFallbackMode
                          ? '最新の勉強会情報を取得できませんでしたが、X共有機能は基本的な内容で利用できます。'
                          : eventsError}
                      </p>
                      {isRetryable && (
                        <p className="mt-2">データの取得を再試行できます。</p>
                      )}
                    </div>
                    {isRetryable && (
                      <div className="mt-4">
                        <button
                          onClick={retry}
                          disabled={isEventsLoading}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEventsLoading ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
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
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              再試行中...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              再試行
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 今後のイベントがない場合のメッセージ */}
          {!eventsError && !isEventsLoading && events.length === 0 && (
            <div className="mt-8 bg-white rounded-lg shadow">
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v-1a4 4 0 014-4h4a4 4 0 014 4v1a4 4 0 11-8 0z"
                    />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  今月の勉強会はありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  現在、今月開催予定の勉強会はありません。新しい勉強会の登録をお待ちしています。
                </p>
                <div className="mt-6">
                  <a
                    href="/register"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    勉強会の登録依頼
                  </a>
                </div>
              </div>
            </div>
          )}

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
                  <div className="h-32">
                    <LoadingSpinner
                      size="md"
                      text="資料一覧を読み込み中..."
                      centered
                      ariaLabel="イベント資料一覧を読み込み中"
                    />
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
