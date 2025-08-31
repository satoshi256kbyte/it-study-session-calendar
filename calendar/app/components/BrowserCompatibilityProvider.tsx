'use client'

import { useEffect } from 'react'
import { initializeBrowserCompatibility } from '../utils/browser-compatibility'

/**
 * Browser compatibility provider component
 * 要件5.4, 7.4: ブラウザ互換性の初期化とフォールバック処理
 */
export default function BrowserCompatibilityProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Initialize browser compatibility features
    initializeBrowserCompatibility()
  }, [])

  return <>{children}</>
}
