'use client'

import { memo } from 'react'
import {
  MaterialLinkProps,
  getMaterialTypeDisplayName,
} from '../types/eventMaterial'

/**
 * 資料リンクコンポーネント（簡素化版）
 */
function MaterialLink({ material, eventTitle }: MaterialLinkProps) {
  return (
    <a
      href={material.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-words"
      title={`${eventTitle}の${getMaterialTypeDisplayName(material.type)}「${material.title}」を開く`}
    >
      {material.title}
    </a>
  )
}

// メモ化してパフォーマンスを最適化
// 要件7.1: React.memoを使用したコンポーネントの最適化
export default memo(MaterialLink)
