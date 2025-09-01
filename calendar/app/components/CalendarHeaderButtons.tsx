'use client'

import { useMemo, useCallback } from 'react'
import TwitterShareButton from './TwitterShareButton'

/**
 * CalendarHeaderButtons component props interface
 * スマホ表示でカレンダー上部に表示されるボタン群
 */
export interface CalendarHeaderButtonsProps {
  /** Generated share text for Twitter */
  shareText: string
  /** Calendar URL for sharing */
  calendarUrl: string
  /** Loading state for events */
  isEventsLoading: boolean
  /** Error state for events */
  eventsError: string | null
  /** Whether the system is in fallback mode */
  isFallbackMode: boolean
  /** Share button click callback */
  onShareClick: () => void
  /** Twitter share error callback */
  onTwitterShareError: (error: Error) => void
  /** Native share callback */
  onNativeShare: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * CalendarHeaderButtons component
 *
 * スマホ表示でカレンダーの上部右上に表示されるボタン群
 * アイコンのみの表示で、枠なしのデザイン
 */
export default function CalendarHeaderButtons({
  shareText,
  calendarUrl,
  isEventsLoading,
  eventsError,
  isFallbackMode,
  onShareClick,
  onTwitterShareError,
  onNativeShare,
  className = '',
}: CalendarHeaderButtonsProps) {
  // Memoize share data to prevent unnecessary re-creation
  const shareData = useMemo(
    () => ({
      title: '広島IT勉強会カレンダー',
      text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
      url: calendarUrl,
    }),
    [calendarUrl]
  )

  /**
   * Memoized Twitter button props for mobile display
   */
  const twitterButtonProps = useMemo(
    () => ({
      shareText,
      calendarUrl,
      isLoading: isEventsLoading,
      hasError: !!eventsError && !isFallbackMode,
      disabled: !shareText && !isEventsLoading,
      onShareClick,
      onError: onTwitterShareError,
      displayMode: 'icon-only' as const,
      responsive: false,
      className:
        'p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200',
    }),
    [
      shareText,
      calendarUrl,
      isEventsLoading,
      eventsError,
      isFallbackMode,
      onShareClick,
      onTwitterShareError,
    ]
  )

  /**
   * Handle native share button click
   */
  const handleNativeShareClick = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        onNativeShare()
      } catch (err) {
        // Sharing was cancelled or failed - no action needed
        if (process.env.NODE_ENV === 'development') {
          console.log('Error sharing:', err)
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url)
        alert('URLをクリップボードにコピーしました')
        onNativeShare()
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
      }
    }
  }, [shareData, onNativeShare])

  return (
    <div
      className={`flex items-center space-x-2 ${className}`}
      role="toolbar"
      aria-label="カレンダー操作ボタン"
    >
      {/* Twitter Share Button - icon only */}
      <TwitterShareButton {...twitterButtonProps} />

      {/* Native Share Button - icon only */}
      <button
        onClick={handleNativeShareClick}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
        aria-label="ネイティブ共有機能を使用してページを共有"
        title="シェア"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
      </button>
    </div>
  )
}
