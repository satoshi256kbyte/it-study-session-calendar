'use client'

import { memo } from 'react'
import { OptimizedThumbnail } from './OptimizedImage'
import { isDisplayableThumbnailUrl } from '../utils/thumbnailUrl'

/**
 * サムネイル表示領域の寸法（一辺 64px 以下）。
 * OptimizedThumbnail の variant="table" 既定（幅64 / 高さ48）に合わせる。
 * Requirement 6.4: 一辺 64px 以下で表示する。
 */
const THUMBNAIL_WIDTH = 64
const THUMBNAIL_HEIGHT = 48

/**
 * サムネイルが表示できないイベント（タイトル未指定）で用いる汎用 alt。
 * Requirement 8.4: タイトルが空の場合の代替テキスト。
 */
const GENERIC_THUMBNAIL_ALT = 'イベントのサムネイル'

/**
 * EventThumbnail の Props
 */
export interface EventThumbnailProps {
  /** 派生済みサムネイルURL（未設定/空/空白/無効なら未表示） */
  thumbnailUrl?: string
  /** alt に使うイベントタイトル（識別テキスト） */
  eventTitle: string
  /** 追加クラス */
  className?: string
}

/**
 * イベント一覧行のサムネイル表示。
 *
 * 単一責任として「サムネイルの有無・エラー処理」のみを扱う。
 *
 * - `isDisplayableThumbnailUrl(thumbnailUrl)` が真のときのみ画像を表示する
 *   （Requirement 6.1, 7.4, 7.5）。
 * - 表示時は一辺 64px 以下（OptimizedThumbnail の variant="table"）
 *   （Requirement 6.4）。
 * - 読み込み失敗時はデフォルト代替画像を使わず、レイアウトを保つ空の
 *   プレースホルダ領域とする。OptimizedImage の onError によるプレースホルダ
 *   挙動を利用する（Requirement 6.3）。
 * - alt はイベントタイトルを優先し、空なら汎用ラベルにフォールバックする
 *   （Requirement 8.4）。
 * - サムネイルなし表示は装飾扱いとし、代替テキストを持たない（aria-hidden 相当）
 *   （Requirement 8.5）。
 */
function EventThumbnail({
  thumbnailUrl,
  eventTitle,
  className = '',
}: EventThumbnailProps) {
  // サムネイルなし: レイアウトを保つ装飾用の空プレースホルダ（Requirement 6.2, 8.5）
  if (!isDisplayableThumbnailUrl(thumbnailUrl)) {
    return (
      <div
        className={`event-thumbnail-placeholder bg-gray-100 rounded ${className}`}
        style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
        aria-hidden="true"
      />
    )
  }

  // alt はタイトル優先、空なら汎用ラベル（Requirement 8.4）
  const trimmedTitle = eventTitle.trim()
  const altText = trimmedTitle !== '' ? trimmedTitle : GENERIC_THUMBNAIL_ALT

  return (
    <OptimizedThumbnail
      variant="table"
      src={thumbnailUrl as string}
      alt={altText}
      width={THUMBNAIL_WIDTH}
      height={THUMBNAIL_HEIGHT}
      responsive={false}
      className={`event-thumbnail rounded ${className}`}
    />
  )
}

export default memo(EventThumbnail)
