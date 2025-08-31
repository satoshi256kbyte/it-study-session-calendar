'use client'

import { useCallback, useMemo, memo, useRef, useEffect } from 'react'
import { performanceMonitor } from '../utils/performance'
import { useResponsiveTransitions } from '../utils/responsive-transitions'

/**
 * TwitterShareButtonコンポーネントのProps
 * 要件1.1, 1.2, 1.3, 1.4, 4.3, 5.2に対応
 */
export interface TwitterShareButtonProps {
  /** 生成されたシェアテキスト */
  shareText: string
  /** カレンダーURL（フォールバック用） */
  calendarUrl: string
  /** 追加のCSSクラス */
  className?: string
  /** ボタンが無効かどうか */
  disabled?: boolean
  /** ローディング状態かどうか */
  isLoading?: boolean
  /** エラー状態かどうか */
  hasError?: boolean
  /** クリック時のコールバック（分析用など） */
  onShareClick?: () => void
  /** エラー時のコールバック */
  onError?: (error: Error) => void
  /** コンパクト表示（タブレット用） */
  compact?: boolean
  /** モバイル表示 */
  mobile?: boolean
  /** 表示モード - full: アイコン+テキスト, icon-only: アイコンのみ */
  displayMode?: 'full' | 'icon-only'
  /** レスポンシブ対応を有効にするか（CSS-basedレスポンシブ） */
  responsive?: boolean
}

/**
 * TwitterShareButtonコンポーネント
 * 生成されたシェアテキストを使用してTwitter Web Intentを開く
 * 要件1.1, 1.2, 1.3, 1.4, 4.3, 5.2に対応
 */
const TwitterShareButton = memo(function TwitterShareButton({
  shareText,
  calendarUrl,
  className = '',
  disabled = false,
  isLoading = false,
  hasError = false,
  onShareClick,
  onError,
  displayMode = 'full',
  responsive = false,
}: TwitterShareButtonProps) {
  // Responsive transition management for smooth text show/hide
  // Requirements: 1.5, 3.5, 4.1, 5.2
  const transitionState = useResponsiveTransitions({
    mobileBreakpoint: 640,
    transitionDuration: 200,
    enableTransitions: responsive,
  })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  /**
   * Twitter Web Intent URLを生成する関数
   * 要件2.1に対応
   */
  const generateTwitterIntentUrl = useCallback(
    (text: string): string => {
      try {
        // テキストをURLエンコード
        const encodedText = encodeURIComponent(text)

        // Twitter Web Intent URLを生成
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`

        return twitterIntentUrl
      } catch (error) {
        console.error('Twitter Intent URL生成エラー:', error)
        // フォールバック: 基本的なURLのみ
        const fallbackText = encodeURIComponent(
          `広島IT勉強会カレンダー\n${calendarUrl}`
        )
        return `https://twitter.com/intent/tweet?text=${fallbackText}`
      }
    },
    [calendarUrl]
  )

  /**
   * クリップボードにコピーするフォールバック関数
   * 要件4.2に対応（エラーハンドリング）
   */
  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        alert('シェアテキストをクリップボードにコピーしました')
      } else {
        // 古いブラウザ向けのフォールバック
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          alert('シェアテキストをクリップボードにコピーしました')
        } catch (err) {
          console.error('クリップボードコピーに失敗しました:', err)
          alert(
            'コピーに失敗しました。手動でテキストを選択してコピーしてください。'
          )
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('クリップボードコピーエラー:', error)
      alert('コピーに失敗しました。')
    }
  }, [])

  /**
   * Twitterシェアボタンのクリックハンドラー
   * 要件2.1, 2.2に対応
   */
  const handleShareClick = useCallback(async () => {
    performanceMonitor.startMeasure('twitterShareResponse')

    try {
      // 分析用コールバックを実行
      onShareClick?.()

      // Twitter Web Intent URLを生成
      const twitterUrl = generateTwitterIntentUrl(shareText)

      // 新しいウィンドウでTwitterを開く
      const twitterWindow = window.open(
        twitterUrl,
        'twitter-share',
        'width=550,height=420,scrollbars=yes,resizable=yes'
      )

      // ウィンドウが開けなかった場合のフォールバック
      if (!twitterWindow) {
        console.warn(
          'ポップアップがブロックされました。クリップボードにコピーします。'
        )
        await copyToClipboard(shareText)
      }

      performanceMonitor.endMeasure('twitterShareResponse')
    } catch (error) {
      performanceMonitor.endMeasure('twitterShareResponse')
      console.error('Twitter共有エラー:', error)

      // エラーコールバックを実行
      onError?.(
        error instanceof Error ? error : new Error('Twitter共有に失敗しました')
      )

      // フォールバック: クリップボードにコピー
      try {
        await copyToClipboard(shareText)
      } catch (clipboardError) {
        console.error(
          'フォールバックのクリップボードコピーも失敗しました:',
          clipboardError
        )
        alert('共有に失敗しました。ページを再読み込みしてお試しください。')
      }
    }
  }, [
    shareText,
    generateTwitterIntentUrl,
    copyToClipboard,
    onShareClick,
    onError,
  ])

  /**
   * キーボードイベントハンドラー（アクセシビリティ対応）
   * 要件2.3: キーボードナビゲーション対応
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      // Enter または Space キーでボタンを実行
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (!disabled && !isLoading) {
          handleShareClick()
        }
      }
      // Escape キーでフォーカスを外す（モーダルなどがある場合の対応）
      else if (event.key === 'Escape') {
        event.currentTarget.blur()
      }
    },
    [disabled, isLoading, handleShareClick]
  )

  /**
   * Handle smooth transitions for responsive text visibility
   * Requirements: 1.5, 3.5, 5.2
   */
  useEffect(() => {
    if (!responsive || !textRef.current || transitionState.prefersReducedMotion)
      return

    const textElement = textRef.current
    const shouldShowText = transitionState.currentBreakpoint !== 'mobile'

    if (transitionState.isTransitioning) {
      // Apply smooth transition for text visibility
      if (shouldShowText) {
        textElement.style.opacity = '0'
        textElement.style.transform = 'translateX(-5px)'
        textElement.style.display = 'inline'

        // Animate in
        requestAnimationFrame(() => {
          textElement.style.transition =
            'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          textElement.style.opacity = '1'
          textElement.style.transform = 'translateX(0)'
        })
      } else {
        // Animate out
        textElement.style.transition =
          'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
        textElement.style.opacity = '0'
        textElement.style.transform = 'translateX(-3px)'

        setTimeout(() => {
          textElement.style.display = 'none'
        }, 150)
      }
    }
  }, [
    responsive,
    transitionState.currentBreakpoint,
    transitionState.isTransitioning,
    transitionState.prefersReducedMotion,
  ])

  /**
   * ボタンの状態に応じたスタイルクラスを生成（メモ化）
   * 要件1.5, 5.1, 5.2: 既存のデザインシステムに合わせたボタンスタイリング、レスポンシブ対応
   * パフォーマンス最適化: 状態が変わった時のみ再計算
   */
  const buttonClasses = useMemo((): string => {
    // 既存のデザインシステムに合わせた基本クラス（page.tsxの他のボタンと統一）
    // icon-onlyモードの場合はパディングを調整
    const paddingClasses =
      displayMode === 'icon-only' ? 'px-2 py-2' : 'px-3 py-2'
    const baseClasses = `inline-flex items-center ${paddingClasses} border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 min-h-[44px] sm:min-h-0`

    // Add responsive transition classes
    const responsiveClasses = responsive
      ? transitionState.getTransitionClasses()
      : ''

    if (disabled || isLoading) {
      return `${baseClasses} ${responsiveClasses} border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed opacity-60`
    }

    if (hasError) {
      return `${baseClasses} ${responsiveClasses} border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500 hover:border-red-400`
    }

    // 通常状態（既存のデザインシステムと完全に統一）
    return `${baseClasses} ${responsiveClasses} border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 hover:border-gray-400`
  }, [disabled, isLoading, hasError, displayMode, responsive, transitionState])

  /**
   * ボタンのアクセシビリティ属性を生成（メモ化）
   * 要件1.4, 4.3: ARIA属性とキーボードナビゲーション対応、icon-onlyモード対応
   * パフォーマンス最適化: 状態が変わった時のみ再計算
   */
  const ariaAttributes = useMemo(() => {
    // icon-onlyモードの場合はより詳細なaria-labelを提供
    const ariaLabel =
      displayMode === 'icon-only'
        ? 'X（旧Twitter）で今月の勉強会情報を共有する'
        : 'X（旧Twitter）で勉強会情報を共有する'

    const baseAttributes = {
      'aria-label': ariaLabel,
      role: 'button',
      tabIndex: disabled ? -1 : 0,
    }

    if (disabled) {
      return {
        ...baseAttributes,
        'aria-disabled': true,
        'aria-describedby': 'twitter-share-disabled-help',
      }
    }

    if (isLoading) {
      return {
        ...baseAttributes,
        'aria-busy': true,
        'aria-live': 'polite' as const,
        'aria-describedby': 'twitter-share-loading-help',
      }
    }

    if (hasError) {
      return {
        ...baseAttributes,
        'aria-describedby': 'twitter-share-error-help',
        'aria-invalid': true,
      }
    }

    return {
      ...baseAttributes,
      'aria-describedby': 'twitter-share-help',
    }
  }, [disabled, isLoading, hasError, displayMode])

  /**
   * ツールチップテキストを生成（メモ化）
   * 要件1.4: icon-onlyモードでより詳細な説明を提供
   * パフォーマンス最適化: 状態が変わった時のみ再計算
   */
  const tooltipText = useMemo(() => {
    if (isLoading) return 'X共有の準備中...'
    if (hasError) return 'クリックして再試行'

    // icon-onlyモードの場合はより詳細な説明を提供
    if (displayMode === 'icon-only') {
      return 'X（旧Twitter）で今月の勉強会情報を共有'
    }

    return '今月の勉強会をXで共有'
  }, [isLoading, hasError, displayMode])

  return (
    <div className="relative group">
      <button
        ref={buttonRef}
        onClick={handleShareClick}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className={`${buttonClasses} ${className}`}
        data-responsive={responsive}
        data-display-mode={displayMode}
        data-breakpoint={
          responsive ? transitionState.currentBreakpoint : undefined
        }
        {...ariaAttributes}
      >
        {/* Twitter/X アイコン - レスポンシブ対応 */}
        <svg
          className={`w-4 h-4 flex-shrink-0 ${isLoading ? 'opacity-50' : ''} ${
            displayMode === 'icon-only' ||
            (responsive && displayMode === 'full')
              ? 'mr-0 sm:mr-2'
              : displayMode === 'full'
                ? 'mr-2'
                : 'mr-0'
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>

        {/* ボタンテキスト - レスポンシブ対応 */}
        <span className="flex items-center">
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
              {/* レスポンシブテキスト表示 - 要件1.1, 1.2対応 */}
              {displayMode === 'full' && !responsive && <span>共有中...</span>}
              {displayMode === 'full' && responsive && (
                <span
                  ref={textRef}
                  className="hidden sm:inline transition-opacity duration-200"
                >
                  共有中...
                </span>
              )}
              {displayMode === 'icon-only' && (
                <span className="sr-only">共有中...</span>
              )}
            </>
          ) : hasError ? (
            <>
              <svg
                className="w-4 h-4 mr-1 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {/* レスポンシブテキスト表示 - 要件1.1, 1.2対応 */}
              {displayMode === 'full' && !responsive && <span>再試行</span>}
              {displayMode === 'full' && responsive && (
                <span
                  ref={textRef}
                  className="hidden sm:inline transition-opacity duration-200"
                >
                  再試行
                </span>
              )}
              {displayMode === 'icon-only' && (
                <span className="sr-only">再試行</span>
              )}
            </>
          ) : (
            <>
              {/* レスポンシブテキスト表示 - 要件1.1, 1.2, 1.5対応 */}
              {displayMode === 'full' && !responsive && <span>共有</span>}
              {displayMode === 'full' && responsive && (
                <span
                  ref={textRef}
                  className="hidden sm:inline transition-opacity duration-200"
                >
                  共有
                </span>
              )}
              {displayMode === 'icon-only' && (
                <span className="sr-only">共有</span>
              )}
            </>
          )}
        </span>
      </button>

      {/* スクリーンリーダー用の説明テキスト */}
      <div className="sr-only" aria-live="polite">
        <div id="twitter-share-help">
          今月の勉強会情報をX（旧Twitter）で共有します
        </div>
        {disabled && (
          <div id="twitter-share-disabled-help">
            現在、X共有機能は利用できません
          </div>
        )}
        {isLoading && (
          <div id="twitter-share-loading-help">
            X共有の準備中です。しばらくお待ちください
          </div>
        )}
        {hasError && (
          <div id="twitter-share-error-help">
            X共有でエラーが発生しました。ボタンを押して再試行してください
          </div>
        )}
      </div>

      {/* ツールチップ（ホバー時の説明） */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 pointer-events-none transition-opacity duration-200 whitespace-nowrap group-hover:opacity-100 z-10">
        {tooltipText}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
})

export default TwitterShareButton
