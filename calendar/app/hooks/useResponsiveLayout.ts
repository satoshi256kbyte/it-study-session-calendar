'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * レスポンシブレイアウトのタイプ定義
 * 要件1.1, 2.1, 3.1に対応
 */
export type LayoutType = 'desktop' | 'tablet' | 'mobile'

/**
 * レスポンシブレイアウトの状態定義
 * 要件5.1, 5.2に対応
 */
export interface ResponsiveState {
  layoutType: LayoutType
  isTransitioning: boolean
  previousLayoutType?: LayoutType
}

/**
 * useResponsiveLayoutフックの戻り値型
 * 要件5.1, 5.2, 5.3に対応
 */
export interface ResponsiveLayoutHook {
  /** 現在のレイアウトタイプ */
  layoutType: LayoutType
  /** 現在の画面幅 */
  screenWidth: number
  /** レイアウト切り替え中かどうか */
  isTransitioning: boolean
  /** 前回のレイアウトタイプ */
  previousLayoutType?: LayoutType
}

/**
 * useResponsiveLayoutフックのオプション
 */
export interface UseResponsiveLayoutOptions {
  /** デスクトップの最小幅（px） */
  desktopMinWidth?: number
  /** タブレットの最小幅（px） */
  tabletMinWidth?: number
  /** デバウンス遅延時間（ms） */
  debounceDelay?: number
  /** トランジション時間（ms） */
  transitionDuration?: number
  /** 初期レイアウトタイプ（SSR対応） */
  initialLayoutType?: LayoutType
}

/**
 * デバウンス関数
 * リサイズイベントの頻繁な発火を制御
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * 画面幅からレイアウトタイプを決定する関数
 * 要件1.1, 2.1, 3.1に対応
 */
function getLayoutTypeFromWidth(
  width: number,
  desktopMinWidth: number = 1024,
  tabletMinWidth: number = 768
): LayoutType {
  if (width >= desktopMinWidth) {
    return 'desktop'
  } else if (width >= tabletMinWidth) {
    return 'tablet'
  } else {
    return 'mobile'
  }
}

/**
 * レスポンシブレイアウト検出カスタムフック
 * 画面サイズの監視とレイアウトタイプの決定機能を提供
 * 要件5.1, 5.2, 5.3に対応
 */
export function useResponsiveLayout(
  options: UseResponsiveLayoutOptions = {}
): ResponsiveLayoutHook {
  const {
    desktopMinWidth = 1024,
    tabletMinWidth = 768,
    debounceDelay = 150,
    transitionDuration = 300,
    initialLayoutType = 'desktop',
  } = options

  // 状態管理
  const [layoutState, setLayoutState] = useState<ResponsiveState>({
    layoutType: initialLayoutType,
    isTransitioning: false,
  })

  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : desktopMinWidth
  )

  // トランジションタイマーのref
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 前回のレイアウトタイプを追跡するref
  const previousLayoutRef = useRef<LayoutType>(initialLayoutType)

  /**
   * レイアウト更新処理
   * 要件5.1, 5.2に対応
   * 要件7.1: useCallbackでイベントハンドラーの最適化
   */
  const updateLayout = useCallback(() => {
    if (typeof window === 'undefined') return

    const currentWidth = window.innerWidth
    const newLayoutType = getLayoutTypeFromWidth(
      currentWidth,
      desktopMinWidth,
      tabletMinWidth
    )

    setScreenWidth(currentWidth)

    // レイアウトタイプが変更された場合のみ処理
    if (newLayoutType !== layoutState.layoutType) {
      // 既存のトランジションタイマーをクリア
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }

      // 前回のレイアウトタイプを保存
      previousLayoutRef.current = layoutState.layoutType

      // トランジション開始
      setLayoutState({
        layoutType: newLayoutType,
        isTransitioning: true,
        previousLayoutType: layoutState.layoutType,
      })

      // トランジション完了後にフラグをリセット
      transitionTimeoutRef.current = setTimeout(() => {
        setLayoutState(prev => ({
          ...prev,
          isTransitioning: false,
        }))
      }, transitionDuration)
    }
  }, [
    layoutState.layoutType,
    desktopMinWidth,
    tabletMinWidth,
    transitionDuration,
  ])

  /**
   * デバウンス付きレイアウト更新関数
   * 要件5.3に対応
   * 要件7.1: useCallbackでイベントハンドラーの最適化
   */
  const debouncedUpdateLayout = useCallback(() => {
    const debouncedFn = debounce(updateLayout, debounceDelay)
    return debouncedFn()
  }, [updateLayout, debounceDelay])

  // 初期化とリサイズイベントリスナーの設定
  useEffect(() => {
    // 初期レイアウトの設定
    updateLayout()

    // リサイズイベントリスナーを追加
    window.addEventListener('resize', debouncedUpdateLayout)

    // オリエンテーション変更イベントリスナーを追加（モバイル対応）
    // 要件5.3に対応
    const handleOrientationChange = () => {
      // オリエンテーション変更後に少し遅延してレイアウトを更新
      // これにより、ブラウザの画面サイズ調整が完了してから処理される
      setTimeout(updateLayout, 100)
    }

    window.addEventListener('orientationchange', handleOrientationChange)

    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', debouncedUpdateLayout)
      window.removeEventListener('orientationchange', handleOrientationChange)

      // トランジションタイマーをクリア
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [updateLayout, debouncedUpdateLayout])

  return {
    layoutType: layoutState.layoutType,
    screenWidth,
    isTransitioning: layoutState.isTransitioning,
    previousLayoutType: layoutState.previousLayoutType,
  }
}

/**
 * デフォルト設定でuseResponsiveLayoutフックを使用するヘルパー関数
 */
export function useResponsiveLayoutWithDefaults(): ResponsiveLayoutHook {
  return useResponsiveLayout({
    desktopMinWidth: 1024,
    tabletMinWidth: 768,
    debounceDelay: 150,
    transitionDuration: 300,
  })
}

/**
 * 高速レスポンス設定でuseResponsiveLayoutフックを使用するヘルパー関数
 * より短いデバウンス時間で即座にレイアウト変更に対応
 */
export function useResponsiveLayoutFastResponse(): ResponsiveLayoutHook {
  return useResponsiveLayout({
    desktopMinWidth: 1024,
    tabletMinWidth: 768,
    debounceDelay: 50,
    transitionDuration: 200,
  })
}

/**
 * カスタムブレークポイント設定でuseResponsiveLayoutフックを使用するヘルパー関数
 */
export function useResponsiveLayoutCustomBreakpoints(
  desktopMinWidth: number,
  tabletMinWidth: number
): ResponsiveLayoutHook {
  return useResponsiveLayout({
    desktopMinWidth,
    tabletMinWidth,
    debounceDelay: 150,
    transitionDuration: 300,
  })
}

/**
 * SSR対応でuseResponsiveLayoutフックを使用するヘルパー関数
 * 初期レンダリング時のハイドレーションエラーを防ぐ
 */
export function useResponsiveLayoutSSR(
  initialLayoutType: LayoutType = 'desktop'
): ResponsiveLayoutHook {
  return useResponsiveLayout({
    desktopMinWidth: 1024,
    tabletMinWidth: 768,
    debounceDelay: 150,
    transitionDuration: 300,
    initialLayoutType,
  })
}

/**
 * レイアウトタイプに基づいてCSSクラス名を生成するヘルパー関数
 * 要件5.2に対応
 */
export function getResponsiveClassName(
  layoutType: LayoutType,
  isTransitioning: boolean = false
): string {
  const baseClasses = 'responsive-layout'
  const layoutClass = `layout-${layoutType}`
  const transitionClass = isTransitioning ? 'layout-transitioning' : ''

  return [baseClasses, layoutClass, transitionClass].filter(Boolean).join(' ')
}

/**
 * レイアウトタイプに基づいて条件分岐を行うヘルパー関数
 */
export function matchLayoutType(
  currentLayout: LayoutType,
  targetLayouts: LayoutType | LayoutType[]
): boolean {
  if (Array.isArray(targetLayouts)) {
    return targetLayouts.includes(currentLayout)
  }
  return currentLayout === targetLayouts
}

/**
 * レスポンシブレイアウトのデバッグ情報を提供するヘルパー関数
 * 開発時のデバッグに使用
 */
export function getResponsiveDebugInfo(layoutHook: ResponsiveLayoutHook): {
  layoutType: LayoutType
  screenWidth: number
  isTransitioning: boolean
  previousLayoutType?: LayoutType
  breakpoints: {
    desktop: string
    tablet: string
    mobile: string
  }
} {
  return {
    layoutType: layoutHook.layoutType,
    screenWidth: layoutHook.screenWidth,
    isTransitioning: layoutHook.isTransitioning,
    previousLayoutType: layoutHook.previousLayoutType,
    breakpoints: {
      desktop: '≥1024px',
      tablet: '768px-1023px',
      mobile: '<768px',
    },
  }
}
