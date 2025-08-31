'use client'

import { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import TwitterShareButton from './TwitterShareButton'

interface ResponsiveHeaderProps {
  shareText: string
  pageUrl: string
  isEventsLoading: boolean
  eventsError: string | null
  isFallbackMode: boolean
  isRetryable: boolean
  onRetry: () => void
  onTwitterShareClick: () => void
  onTwitterShareError: (error: Error) => void
}

/**
 * レスポンシブヘッダーコンポーネント
 * 画面サイズに応じてボタンの表示を調整
 */
function ResponsiveHeader({
  shareText,
  pageUrl,
  isEventsLoading,
  eventsError,
  isFallbackMode,
  isRetryable,
  onRetry,
  onTwitterShareClick,
  onTwitterShareError,
}: ResponsiveHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])

  const handleShare = useCallback(async () => {
    const shareData = {
      title: '広島IT勉強会カレンダー',
      text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
      url:
        pageUrl ||
        'https://satoshi256kbyte.github.io/it-study-session-calendar/',
    }

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
  }, [pageUrl])

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 sm:py-6">
          {/* ロゴ・タイトル */}
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              <span className="hidden sm:inline">広島IT勉強会カレンダー</span>
              <span className="sm:hidden">広島IT勉強会</span>
            </h1>
          </div>

          {/* デスクトップ用ボタン群 */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <TwitterShareButton
              shareText={shareText}
              calendarUrl={pageUrl}
              isLoading={isEventsLoading}
              hasError={!!eventsError && !isFallbackMode}
              disabled={!shareText && !isEventsLoading}
              onShareClick={onTwitterShareClick}
              onError={onTwitterShareError}
            />

            {/* エラー状態の表示とリトライボタン */}
            {eventsError && isRetryable && !isFallbackMode && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded min-h-[44px]"
                title="勉強会データの取得を再試行"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                再試行
              </button>
            )}

            <button
              onClick={handleShare}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
              title="このページをシェア"
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
              <span className="hidden lg:inline">シェア</span>
              <span className="lg:hidden">共有</span>
            </button>

            <Link
              href="/register"
              className="inline-flex items-center px-3 lg:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
            >
              <span className="hidden lg:inline">勉強会の登録依頼</span>
              <span className="lg:hidden">登録依頼</span>
            </Link>
          </div>

          {/* タブレット用ボタン群 */}
          <div className="hidden sm:flex md:hidden items-center space-x-2">
            <TwitterShareButton
              shareText={shareText}
              calendarUrl={pageUrl}
              isLoading={isEventsLoading}
              hasError={!!eventsError && !isFallbackMode}
              disabled={!shareText && !isEventsLoading}
              onShareClick={onTwitterShareClick}
              onError={onTwitterShareError}
              compact={true}
            />

            <button
              onClick={handleShare}
              className="inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
              title="このページをシェア"
            >
              <svg
                className="w-4 h-4"
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
            </button>

            <Link
              href="/register"
              className="inline-flex items-center px-2 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
              title="勉強会の登録依頼"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </Link>
          </div>

          {/* モバイル用メニューボタン */}
          <div className="sm:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-[44px] min-w-[44px]"
              aria-expanded={isMobileMenuOpen}
              aria-label="メニューを開く"
            >
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* モバイル用ドロップダウンメニュー */}
        <div
          className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden border-t border-gray-200`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <div className="flex flex-col space-y-2">
              <TwitterShareButton
                shareText={shareText}
                calendarUrl={pageUrl}
                isLoading={isEventsLoading}
                hasError={!!eventsError && !isFallbackMode}
                disabled={!shareText && !isEventsLoading}
                onShareClick={onTwitterShareClick}
                onError={onTwitterShareError}
                mobile={true}
              />

              {/* エラー状態の表示とリトライボタン（モバイル） */}
              {eventsError && isRetryable && !isFallbackMode && (
                <button
                  onClick={onRetry}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md min-h-[44px] w-full"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  データ取得を再試行
                </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md min-h-[44px] w-full"
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
                このページをシェア
              </button>

              <Link
                href="/register"
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md min-h-[44px] w-full"
                onClick={() => setIsMobileMenuOpen(false)}
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                勉強会の登録依頼
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default memo(ResponsiveHeader)
