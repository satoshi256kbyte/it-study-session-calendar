import { renderHook, act } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  useResponsiveLayout,
  getResponsiveClassName,
  matchLayoutType,
} from '../useResponsiveLayout'

// グローバルwindowオブジェクトをモック
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1200,
})

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: vi.fn(),
})

// タイマーのモック
vi.useFakeTimers()

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    // デフォルトの画面幅を設定
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('初期化', () => {
    test('デスクトップサイズで初期化される', () => {
      const { result } = renderHook(() => useResponsiveLayout())

      expect(result.current.layoutType).toBe('desktop')
      expect(result.current.screenWidth).toBe(1200)
      expect(result.current.isTransitioning).toBe(false)
    })

    test('カスタム初期レイアウトタイプで初期化される', () => {
      const { result } = renderHook(() =>
        useResponsiveLayout({ initialLayoutType: 'mobile' })
      )

      expect(result.current.layoutType).toBe('mobile')
    })
  })

  describe('レイアウトタイプの判定', () => {
    test('デスクトップサイズ（1024px以上）でdesktopレイアウト', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      const { result } = renderHook(() => useResponsiveLayout())

      expect(result.current.layoutType).toBe('desktop')
      expect(result.current.screenWidth).toBe(1200)
    })

    test('タブレットサイズ（768px-1023px）でtabletレイアウト', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })

      const { result } = renderHook(() => useResponsiveLayout())

      expect(result.current.layoutType).toBe('tablet')
      expect(result.current.screenWidth).toBe(800)
    })

    test('モバイルサイズ（768px未満）でmobileレイアウト', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      })

      const { result } = renderHook(() => useResponsiveLayout())

      expect(result.current.layoutType).toBe('mobile')
      expect(result.current.screenWidth).toBe(400)
    })
  })

  describe('カスタムブレークポイント', () => {
    test('カスタムブレークポイントが正しく適用される', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      })

      const { result } = renderHook(() =>
        useResponsiveLayout({
          desktopMinWidth: 1200,
          tabletMinWidth: 600,
        })
      )

      expect(result.current.layoutType).toBe('tablet')
    })
  })

  describe('イベントリスナー', () => {
    test('resizeイベントリスナーが登録される', () => {
      renderHook(() => useResponsiveLayout())

      expect(window.addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )
    })

    test('orientationchangeイベントリスナーが登録される', () => {
      renderHook(() => useResponsiveLayout())

      expect(window.addEventListener).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function)
      )
    })

    test('アンマウント時にイベントリスナーが削除される', () => {
      const { unmount } = renderHook(() => useResponsiveLayout())

      unmount()

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function)
      )
    })
  })

  describe('トランジション状態', () => {
    test('レイアウト変更時にトランジション状態になる', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      const { result, rerender } = renderHook(() => useResponsiveLayout())

      // 初期状態はデスクトップ
      expect(result.current.layoutType).toBe('desktop')
      expect(result.current.isTransitioning).toBe(false)

      // 画面サイズを変更
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 400,
        })

        // リサイズイベントをシミュレート
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      rerender()

      // トランジション状態になることを確認
      expect(result.current.layoutType).toBe('mobile')
      expect(result.current.isTransitioning).toBe(true)
      expect(result.current.previousLayoutType).toBe('desktop')

      // トランジション完了後
      act(() => {
        vi.advanceTimersByTime(300) // デフォルトのトランジション時間
      })

      expect(result.current.isTransitioning).toBe(false)
    })
  })

  describe('デバウンス機能', () => {
    test('デバウンス遅延が適用される', () => {
      const { result } = renderHook(() =>
        useResponsiveLayout({ debounceDelay: 200 })
      )

      // 複数回のリサイズイベントを短時間で発生
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 400,
        })

        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
        window.dispatchEvent(resizeEvent)
        window.dispatchEvent(resizeEvent)
      })

      // デバウンス時間前では変更されない
      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(result.current.layoutType).toBe('desktop') // まだ変更されていない

      // デバウンス時間後に変更される
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.layoutType).toBe('mobile')
    })
  })
})

describe('getResponsiveClassName', () => {
  test('基本的なクラス名が生成される', () => {
    const className = getResponsiveClassName('desktop')
    expect(className).toBe('responsive-layout layout-desktop')
  })

  test('トランジション中のクラス名が生成される', () => {
    const className = getResponsiveClassName('mobile', true)
    expect(className).toBe(
      'responsive-layout layout-mobile layout-transitioning'
    )
  })

  test('各レイアウトタイプのクラス名が正しく生成される', () => {
    expect(getResponsiveClassName('desktop')).toContain('layout-desktop')
    expect(getResponsiveClassName('tablet')).toContain('layout-tablet')
    expect(getResponsiveClassName('mobile')).toContain('layout-mobile')
  })
})

describe('matchLayoutType', () => {
  test('単一のレイアウトタイプとマッチする', () => {
    expect(matchLayoutType('desktop', 'desktop')).toBe(true)
    expect(matchLayoutType('desktop', 'mobile')).toBe(false)
  })

  test('複数のレイアウトタイプとマッチする', () => {
    expect(matchLayoutType('tablet', ['tablet', 'mobile'])).toBe(true)
    expect(matchLayoutType('desktop', ['tablet', 'mobile'])).toBe(false)
  })

  test('空の配列では常にfalse', () => {
    expect(matchLayoutType('desktop', [])).toBe(false)
  })
})

describe('SSR対応', () => {
  test('window未定義時でもエラーが発生しない', () => {
    // windowを一時的に未定義にする
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    expect(() => {
      renderHook(() => useResponsiveLayout())
    }).not.toThrow()

    // windowを復元
    global.window = originalWindow
  })
})

describe('パフォーマンス', () => {
  test('同じレイアウトタイプの場合は状態更新されない', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    const { result } = renderHook(() => useResponsiveLayout())
    const initialState = result.current

    // 同じサイズ範囲内でリサイズ
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1300,
      })

      const resizeEvent = new Event('resize')
      window.dispatchEvent(resizeEvent)
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // レイアウトタイプは変更されない
    expect(result.current.layoutType).toBe(initialState.layoutType)
    expect(result.current.isTransitioning).toBe(false)
  })
})
