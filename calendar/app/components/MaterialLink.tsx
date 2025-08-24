'use client'

import { useState, memo, useCallback } from 'react'
import {
  MaterialLinkProps,
  getMaterialTypeDisplayName,
} from '../types/eventMaterial'

/**
 * 資料リンクコンポーネント
 * 要件3.1, 3.2, 3.3, 3.4, 6.2に対応
 *
 * - 資料リンクの表示機能
 * - サムネイル表示（利用可能な場合のみ）
 * - 新しいタブで開く機能
 * - 過度な視覚効果を避けたシンプルな実装
 * - 不要な再レンダリングの防止
 */
function MaterialLink({ material, eventTitle }: MaterialLinkProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  /**
   * サムネイル画像の読み込みエラーハンドリング
   * 要件6.2: useCallbackで関数を最適化
   */
  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoading(false)
  }, [])

  /**
   * サムネイル画像の読み込み完了ハンドリング
   * 要件6.2: useCallbackで関数を最適化
   */
  const handleImageLoad = useCallback(() => {
    setImageLoading(false)
  }, [])

  /**
   * 資料タイプに応じたアイコンを取得
   */
  const getTypeIcon = () => {
    switch (material.type) {
      case 'slide':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v10z"
            />
          </svg>
        )
      case 'document':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )
      case 'video':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )
      default:
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        )
    }
  }

  return (
    <div className="flex items-start space-x-2 sm:space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
      {/* サムネイル表示（利用可能な場合のみ - 要件3.2） */}
      {material.thumbnailUrl && !imageError && (
        <div className="flex-shrink-0">
          {/* 要件4.1: 小画面でのサムネイルサイズ最適化 */}
          <div className="relative w-12 h-9 sm:w-16 sm:h-12 bg-gray-100 rounded overflow-hidden">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 w-full h-full"></div>
              </div>
            )}
            <img
              src={material.thumbnailUrl}
              alt={`${material.title}のサムネイル`}
              className="w-full h-full object-cover optimize-image"
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}

      {/* 資料情報 */}
      <div className="flex-1 min-w-0">
        {/* 要件3.1: 各資料をクリック可能なリンクとして表示 */}
        {/* 要件3.3: 新しいタブ/ウィンドウで資料を開く */}
        {/* 要件4.3: タッチターゲットの適切なサイズ設定 */}
        <a
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-start space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors py-1 min-h-[44px] sm:min-h-0"
          title={`${eventTitle}の${getMaterialTypeDisplayName(material.type)}「${material.title}」を開く`}
        >
          {/* 資料タイプアイコン */}
          <span className="flex-shrink-0 mt-0.5 text-gray-400 group-hover:text-blue-600 transition-colors">
            {getTypeIcon()}
          </span>

          {/* 資料タイトル */}
          <span className="font-medium group-hover:underline break-words leading-5">
            {material.title}
          </span>

          {/* 外部リンクアイコン */}
          <span className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </span>
        </a>

        {/* 資料タイプ表示 */}
        <div className="mt-1 text-xs text-gray-500">
          {getMaterialTypeDisplayName(material.type)}
        </div>
      </div>
    </div>
  )
}

// メモ化してパフォーマンスを最適化（要件6.2: 不要な再レンダリングの防止）
export default memo(MaterialLink)
