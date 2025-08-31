'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * トランジション状態の定義
 * 要件5.2: レイアウト切り替え時のトランジション状態管理
 */
export type TransitionState = 'entering' | 'entered' | 'exiting' | 'exited'

/**
 * トランジションフックのオプション
 */
export interface UseTransitionOptions {
  /** トランジション継続時間（ms） */
  duration?: number
  /** 入場アニメーション継続時間（ms） */
  enterDuration?: number
  /** 退場アニメーション継続時間（ms） */
  exitDuration?: number
  /** トランジション開始時の遅延（ms） */
  delay?: number
  /** アニメーション完了時のコールバック */
  onEntered?: () => void
  /** 退場アニメーション完了時のコールバック */
  onExited?: () => void
  /** トランジション状態変更時のコールバック */
  onStateChange?: (state: TransitionState) => void
}

/**
 * トランジションフックの戻り値
 */
export interface UseTransitionReturn {
  /** 現在のトランジション状態 */
  state: TransitionState
  /** トランジション中かどうか */
  isTransitioning: boolean
  /** 入場アニメーションを開始 */
  enter: () => void
  /** 退場アニメーションを開始 */
  exit: () => void
  /** トランジションをリセット */
  reset: () => void
  /** 現在の状態に応じたCSSクラス名 */
  className: string
}

/**
 * トランジション管理カスタムフック
 * 要件5.2: スムーズなトランジション効果の実装
 */
export function useTransition(
  show: boolean,
  options: UseTransitionOptions = {}
): UseTransitionReturn {
  const {
    duration = 300,
    enterDuration = duration,
    exitDuration = duration * 0.75,
    delay = 0,
    onEntered,
    onExited,
    onStateChange,
  } = options

  const [state, setState] = useState<TransitionState>(
    show ? 'entered' : 'exited'
  )
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // タイマーをクリアするヘルパー関数
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current)
      delayTimeoutRef.current = null
    }
  }, [])

  // 状態変更ハンドラー
  const changeState = useCallback(
    (newState: TransitionState) => {
      setState(newState)
      onStateChange?.(newState)
    },
    [onStateChange]
  )

  // 入場アニメーション開始
  const enter = useCallback(() => {
    clearTimeouts()

    if (delay > 0) {
      delayTimeoutRef.current = setTimeout(() => {
        changeState('entering')

        timeoutRef.current = setTimeout(() => {
          changeState('entered')
          onEntered?.()
        }, enterDuration)
      }, delay)
    } else {
      changeState('entering')

      timeoutRef.current = setTimeout(() => {
        changeState('entered')
        onEntered?.()
      }, enterDuration)
    }
  }, [delay, enterDuration, onEntered, changeState, clearTimeouts])

  // 退場アニメーション開始
  const exit = useCallback(() => {
    clearTimeouts()
    changeState('exiting')

    timeoutRef.current = setTimeout(() => {
      changeState('exited')
      onExited?.()
    }, exitDuration)
  }, [exitDuration, onExited, changeState, clearTimeouts])

  // トランジションリセット
  const reset = useCallback(() => {
    clearTimeouts()
    changeState('exited')
  }, [changeState, clearTimeouts])

  // showプロパティの変更に応じてトランジションを開始
  useEffect(() => {
    if (show && (state === 'exited' || state === 'exiting')) {
      enter()
    } else if (!show && (state === 'entered' || state === 'entering')) {
      exit()
    }
  }, [show, state, enter, exit])

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearTimeouts()
    }
  }, [clearTimeouts])

  // 現在の状態に応じたCSSクラス名を生成
  const className = `transition-${state}`

  return {
    state,
    isTransitioning: state === 'entering' || state === 'exiting',
    enter,
    exit,
    reset,
    className,
  }
}

/**
 * レイアウトトランジション専用フック
 * 要件5.2: レイアウト切り替え時のトランジションアニメーション
 */
export function useLayoutTransition(
  layoutType: 'desktop' | 'tablet' | 'mobile',
  previousLayoutType?: 'desktop' | 'tablet' | 'mobile'
): UseTransitionReturn {
  const [isVisible, setIsVisible] = useState(true)

  // レイアウトタイプが変更された時にトランジションを実行
  useEffect(() => {
    if (previousLayoutType && previousLayoutType !== layoutType) {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 50) // 短い遅延でスムーズな切り替え

      return () => clearTimeout(timer)
    }
  }, [layoutType, previousLayoutType])

  return useTransition(isVisible, {
    enterDuration: 300,
    exitDuration: 200,
    onStateChange: state => {
      // レイアウト切り替え完了時の処理
      if (state === 'entered') {
        // パフォーマンス最適化: will-changeプロパティをリセット
        document.querySelectorAll('.will-change-transition').forEach(el => {
          el.classList.add('transition-complete')
        })
      }
    },
  })
}

/**
 * カードアニメーション専用フック
 * 要件5.2: カードの表示・非表示アニメーション
 */
export function useCardTransition(
  isVisible: boolean,
  index: number = 0
): UseTransitionReturn {
  return useTransition(isVisible, {
    enterDuration: 400,
    exitDuration: 250,
    delay: Math.min(index * 50, 300), // スタガードアニメーション（最大300ms遅延）
  })
}

/**
 * ホバートランジション専用フック
 * 要件7.4: パフォーマンスを考慮したホバー効果
 */
export function useHoverTransition() {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const isActive = isHovered || isFocused

  return {
    isHovered,
    isFocused,
    isActive,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
    className: isActive ? 'card-hover-transition' : '',
  }
}

/**
 * スタガードアニメーション用フック
 * 複数の要素を順次アニメーションさせる
 *
 * Note: React Hooksのルールに従い、この関数は使用せず、
 * 代わりにコンポーネント内で個別にuseTransitionを呼び出してください
 */
export function createStaggeredTransitionConfig(
  itemCount: number,
  staggerDelay: number = 50
): Array<{ enterDuration: number; exitDuration: number; delay: number }> {
  return Array.from({ length: itemCount }, (_, index) => ({
    enterDuration: 400,
    exitDuration: 250,
    delay: index * staggerDelay,
  }))
}

/**
 * レスポンシブトランジション用フック
 * 画面サイズに応じて異なるトランジション効果を適用
 */
export function useResponsiveTransition(
  isVisible: boolean,
  layoutType: 'desktop' | 'tablet' | 'mobile'
): UseTransitionReturn {
  const getDuration = () => {
    switch (layoutType) {
      case 'mobile':
        return { enter: 250, exit: 200 } // モバイルは高速
      case 'tablet':
        return { enter: 300, exit: 225 }
      case 'desktop':
        return { enter: 350, exit: 250 } // デスクトップは少し長め
      default:
        return { enter: 300, exit: 225 }
    }
  }

  const { enter, exit } = getDuration()

  return useTransition(isVisible, {
    enterDuration: enter,
    exitDuration: exit,
  })
}

/**
 * パフォーマンス最適化されたトランジションフック
 * 要件7.4: GPU加速とパフォーマンス最適化
 */
export function useOptimizedTransition(
  isVisible: boolean,
  options: UseTransitionOptions = {}
): UseTransitionReturn & { optimizedClassName: string } {
  const transition = useTransition(isVisible, options)

  // GPU加速とwill-changeプロパティを適用
  const optimizedClassName = `
    ${transition.className}
    ${transition.isTransitioning ? 'gpu-optimized-transition will-change-transition' : ''}
  `.trim()

  return {
    ...transition,
    optimizedClassName,
  }
}

/**
 * アクセシビリティ対応トランジションフック
 * prefers-reduced-motionに対応
 */
export function useAccessibleTransition(
  isVisible: boolean,
  options: UseTransitionOptions = {}
): UseTransitionReturn {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // reduced motionが有効な場合はトランジション時間を短縮
  const adjustedOptions = prefersReducedMotion
    ? {
        ...options,
        enterDuration: 0,
        exitDuration: 0,
        delay: 0,
      }
    : options

  return useTransition(isVisible, adjustedOptions)
}
