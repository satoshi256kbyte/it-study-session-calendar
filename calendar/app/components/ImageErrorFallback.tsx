'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'

/**
 * Image error fallback props
 */
interface ImageErrorFallbackProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  fallbackSrc?: string
  fallbackText?: string
  onError?: (error: Event) => void
}

/**
 * Image component with error handling and fallback
 * 要件7.1: 画像読み込みエラー時の適切な処理を実装
 */
export default function ImageErrorFallback({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackSrc,
  fallbackText,
  onError,
}: ImageErrorFallbackProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSrc, setCurrentSrc] = useState(src)

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      console.warn(`Image failed to load: ${currentSrc}`)

      // Call custom error handler if provided
      if (onError) {
        onError(event.nativeEvent)
      }

      // Try fallback image if available and not already tried
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        console.log(`Trying fallback image: ${fallbackSrc}`)
        setCurrentSrc(fallbackSrc)
        return
      }

      // No fallback available or fallback also failed
      setHasError(true)
      setIsLoading(false)
    },
    [currentSrc, fallbackSrc, onError]
  )

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setIsLoading(true)
    setCurrentSrc(src) // Reset to original source
  }, [src])

  // Show loading state
  if (isLoading && !hasError) {
    return (
      <div
        className={`image-loading-placeholder bg-gray-100 animate-pulse flex items-center justify-center ${className}`}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="sr-only">画像を読み込み中...</span>
      </div>
    )
  }

  // Show error fallback
  if (hasError) {
    return (
      <div
        className={`image-error-fallback bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center p-4 ${className}`}
      >
        <svg
          className="w-8 h-8 text-gray-400 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>

        {fallbackText ? (
          <p className="text-sm text-gray-500 text-center mb-2">
            {fallbackText}
          </p>
        ) : (
          <p className="text-sm text-gray-500 text-center mb-2">
            画像を読み込めませんでした
          </p>
        )}

        <button
          onClick={handleRetry}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
          aria-label="画像の再読み込みを試行"
        >
          再試行
        </button>

        <span className="sr-only">{alt}</span>
      </div>
    )
  }

  // Show image
  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
    />
  )
}

/**
 * Hook for handling multiple image errors
 */
export function useImageErrorHandling() {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = useCallback((src: string, error: Event) => {
    console.warn(`Image failed to load: ${src}`, error)
    setFailedImages(prev => new Set(prev).add(src))
  }, [])

  const retryImage = useCallback((src: string) => {
    setFailedImages(prev => {
      const newSet = new Set(prev)
      newSet.delete(src)
      return newSet
    })
  }, [])

  const hasImageFailed = useCallback(
    (src: string) => {
      return failedImages.has(src)
    },
    [failedImages]
  )

  return {
    handleImageError,
    retryImage,
    hasImageFailed,
    failedImagesCount: failedImages.size,
  }
}
