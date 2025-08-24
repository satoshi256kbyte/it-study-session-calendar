/**
 * パフォーマンス最適化されたローディングスピナーコンポーネント
 * 要件: 全要件の最適化
 */

import { memo } from 'react'

export interface LoadingSpinnerProps {
  /** スピナーのサイズ */
  size?: 'sm' | 'md' | 'lg'
  /** 表示テキスト */
  text?: string
  /** 中央寄せするかどうか */
  centered?: boolean
  /** 追加のCSSクラス */
  className?: string
  /** アクセシビリティ用のラベル */
  ariaLabel?: string
}

const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  text,
  centered = false,
  className = '',
  ariaLabel = '読み込み中',
}: LoadingSpinnerProps) {
  // サイズに応じたクラスを決定
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const containerClasses = centered
    ? 'flex items-center justify-center'
    : 'flex items-center'

  return (
    <div
      className={`${containerClasses} ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      <svg
        className={`animate-spin ${sizeClasses[size]} text-blue-600 gpu-accelerated`}
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
      {text && (
        <span className={`ml-2 text-gray-600 ${textSizeClasses[size]}`}>
          {text}
        </span>
      )}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  )
})

export default LoadingSpinner
