'use client'

import { useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  useOptimizedIntersectionObserver,
  generateResponsiveImageProps,
} from '../utils/performance'
import { useImageOptimization } from '../hooks/useImageOptimization'

/**
 * 最適化された画像コンポーネントのProps
 */
export interface OptimizedImageProps {
  /** 画像のベースURL */
  src: string
  /** 代替テキスト */
  alt: string
  /** 画像のサイズ設定 */
  sizes?: {
    mobile: number
    tablet: number
    desktop: number
  }
  /** CSSクラス名 */
  className?: string
  /** インラインスタイル */
  style?: React.CSSProperties
  /** 画像読み込み完了時のコールバック */
  onLoad?: () => void
  /** 画像読み込みエラー時のコールバック */
  onError?: () => void
  /** 遅延読み込みを有効にするか */
  lazy?: boolean
  /** プレースホルダー画像のURL */
  placeholder?: string
  /** 画像の優先度（LCP対応） */
  priority?: boolean
  /** レスポンシブ画像を使用するか */
  responsive?: boolean
}

/**
 * 最適化された画像コンポーネント
 * 要件7.3: レスポンシブ画像の実装、遅延読み込み、画像サイズの動的調整
 */
function OptimizedImage({
  src,
  alt,
  sizes = { mobile: 320, tablet: 640, desktop: 1024 },
  className = '',
  style = {},
  onLoad,
  onError,
  lazy = true,
  placeholder,
  priority = false,
  responsive = true,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const imgRef = useRef<HTMLImageElement>(null)

  // 画像最適化フックを使用
  const { optimizeImageUrl, settings } = useImageOptimization()

  /**
   * 画像読み込み完了ハンドラー
   * 要件7.1: useCallbackでイベントハンドラーの最適化
   */
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  /**
   * 画像読み込みエラーハンドラー
   * 要件7.1: useCallbackでイベントハンドラーの最適化
   */
  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  /**
   * Intersection Observer コールバック
   * 要件7.3: 遅延読み込み（lazy loading）の実装
   */
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting) {
        setIsInView(true)
      }
    },
    []
  )

  /**
   * Intersection Observer の設定
   */
  const { observe, unobserve } = useOptimizedIntersectionObserver(
    handleIntersection,
    {
      rootMargin: '50px',
      threshold: 0.1,
    }
  )

  /**
   * 要素の監視開始
   */
  useEffect(() => {
    const currentRef = imgRef.current
    if (currentRef && lazy && !priority) {
      observe(currentRef)
      return () => unobserve(currentRef)
    }
  }, [observe, unobserve, lazy, priority])

  /**
   * レスポンシブ画像のプロパティを生成
   * 要件7.3: レスポンシブ画像の実装（srcsetの活用）
   */
  const imageProps = responsive
    ? generateResponsiveImageProps(src, alt, sizes)
    : {
        src: optimizeImageUrl(src),
        alt,
        loading: (lazy && !priority ? 'lazy' : 'eager') as 'lazy' | 'eager',
        decoding: 'async' as const,
      }

  /**
   * 画像のスタイルを生成
   * 要件7.4: GPU加速の活用
   */
  const imageStyle: React.CSSProperties = {
    ...style,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    willChange: isLoaded ? 'auto' : 'opacity',
    transform: 'translateZ(0)', // GPU加速
  }

  /**
   * プレースホルダーのスタイル
   */
  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
    zIndex: 1,
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ position: 'relative' }}
    >
      {/* プレースホルダー */}
      {!isLoaded && !hasError && (
        <div style={placeholderStyle}>
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover blur-sm"
              aria-hidden="true"
            />
          ) : (
            <div className="image-placeholder w-full h-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {hasError && (
        <div style={placeholderStyle} className="bg-gray-100 text-gray-400">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="sr-only">画像の読み込みに失敗しました</span>
        </div>
      )}

      {/* メイン画像 */}
      {isInView && (
        <img
          ref={imgRef}
          {...imageProps}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            optimized-image responsive-image gpu-optimized-image
            ${isLoaded ? 'loaded static' : ''}
            ${hasError ? 'error' : ''}
            w-full h-full object-cover
          `}
          alt={alt}
          // 優先度の高い画像はfetchpriorityを設定
          {...(priority && { fetchPriority: 'high' as const })}
        />
      )}
    </div>
  )
}

/**
 * メモ化された最適化画像コンポーネント
 * 要件7.1: React.memoを使用したコンポーネントの最適化
 */
export default memo(OptimizedImage)

/**
 * サムネイル専用の最適化画像コンポーネント
 * 要件4.4: モバイルに適したサムネイルサイズの調整
 */
export const OptimizedThumbnail = memo<
  OptimizedImageProps & {
    variant?: 'card' | 'table'
  }
>(({ variant = 'table', ...props }) => {
  const thumbnailSizes =
    variant === 'card'
      ? { mobile: 64, tablet: 80, desktop: 72 } // カード用サイズ
      : { mobile: 48, tablet: 64, desktop: 64 } // テーブル用サイズ

  return (
    <OptimizedImage
      {...props}
      sizes={thumbnailSizes}
      className={`
        ${props.className || ''}
        thumbnail-image
        ${variant === 'card' ? 'thumbnail-card' : 'thumbnail-table'}
      `}
    />
  )
})

OptimizedThumbnail.displayName = 'OptimizedThumbnail'
