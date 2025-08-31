/**
 * TwitterShareButtonコンポーネントのテスト
 * 要件2.1, 2.2, 2.3のテスト検証
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// performanceMonitor のモック - 最上位で定義
vi.mock('../../utils/performance', () => ({
  performanceMonitor: {
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
}))

// responsive-transitions のモック - 最上位で定義
vi.mock('../../utils/responsive-transitions', () => ({
  useResponsiveTransitions: vi.fn(() => ({
    currentBreakpoint: 'desktop',
    previousBreakpoint: undefined,
    isTransitioning: false,
    prefersReducedMotion: false,
    transitionDuration: 200,
    getTransitionClasses: () =>
      'responsive-breakpoint-handler breakpoint-desktop',
    applyTransitionClasses: vi.fn(),
    removeTransitionClasses: vi.fn(),
  })),
}))

import TwitterShareButton from '../TwitterShareButton'

// モック関数の設定
const mockOpen = vi.fn()
const mockWriteText = vi.fn()
const mockExecCommand = vi.fn()

// グローバルオブジェクトのモック
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
})

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
})

Object.defineProperty(document, 'execCommand', {
  value: mockExecCommand,
  writable: true,
})

// alert のモック
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
})

// matchMedia のモック
const mockMatchMedia = vi.fn().mockImplementation(query => ({
  matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  value: mockMatchMedia,
  writable: true,
})

// requestAnimationFrame のモック
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn().mockImplementation(callback => {
    return setTimeout(callback, 16)
  }),
  writable: true,
})

// cancelAnimationFrame のモック
Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn().mockImplementation(id => {
    clearTimeout(id)
  }),
  writable: true,
})

describe('TwitterShareButton', () => {
  const defaultProps = {
    shareText:
      '📅 今月の広島IT勉強会\n\n01/25 React勉強会\n\n詳細はこちら: https://example.com\n\n#広島IT #勉強会',
    calendarUrl: 'https://example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本レンダリング', () => {
    it('デフォルトプロパティで正しくレンダリングされる', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const button = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/i,
      })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('共有')
      expect(button).not.toBeDisabled()
    })

    it('Twitterアイコンが表示される', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const icon = screen.getByRole('button').querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-4', 'h-4', 'mr-2')
    })

    it('カスタムクラス名が適用される', () => {
      render(<TwitterShareButton {...defaultProps} className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('状態管理', () => {
    it('ローディング状態で正しく表示される', () => {
      render(<TwitterShareButton {...defaultProps} isLoading={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent('共有中...')
      expect(button).toHaveAttribute('aria-busy', 'true')

      // スピナーアイコンが表示される
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('無効状態で正しく表示される', () => {
      render(<TwitterShareButton {...defaultProps} disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).toHaveClass('cursor-not-allowed')
    })

    it('エラー状態で正しく表示される', () => {
      render(<TwitterShareButton {...defaultProps} hasError={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('再試行')
      expect(button).toHaveClass('border-red-300', 'text-red-700')
    })
  })

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で勉強会情報を共有する'
      )
      expect(button).toHaveAttribute('role', 'button')
    })

    it('無効状態で適切なARIA属性が設定される', () => {
      render(<TwitterShareButton {...defaultProps} disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).toHaveAttribute(
        'aria-describedby',
        'twitter-share-disabled-help'
      )

      // 説明テキストが存在する
      expect(
        screen.getByText('現在、X共有機能は利用できません')
      ).toBeInTheDocument()
    })

    it('ローディング状態で適切なARIA属性が設定される', () => {
      render(<TwitterShareButton {...defaultProps} isLoading={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAttribute(
        'aria-describedby',
        'twitter-share-loading-help'
      )

      // 説明テキストが存在する
      expect(
        screen.getByText('X共有の準備中です。しばらくお待ちください')
      ).toBeInTheDocument()
    })

    it('エラー状態で適切なARIA属性が設定される', () => {
      render(<TwitterShareButton {...defaultProps} hasError={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-describedby',
        'twitter-share-error-help'
      )

      // 説明テキストが存在する
      expect(
        screen.getByText(
          'X共有でエラーが発生しました。ボタンを押して再試行してください'
        )
      ).toBeInTheDocument()
    })
  })

  describe('キーボードナビゲーション', () => {
    it('Enterキーでボタンが実行される', async () => {
      const onShareClick = vi.fn()
      render(
        <TwitterShareButton {...defaultProps} onShareClick={onShareClick} />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })

      await waitFor(() => {
        expect(onShareClick).toHaveBeenCalledTimes(1)
      })
    })

    it('Spaceキーでボタンが実行される', async () => {
      const onShareClick = vi.fn()
      render(
        <TwitterShareButton {...defaultProps} onShareClick={onShareClick} />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })

      await waitFor(() => {
        expect(onShareClick).toHaveBeenCalledTimes(1)
      })
    })

    it('無効状態ではキーボード操作が無視される', () => {
      const onShareClick = vi.fn()
      render(
        <TwitterShareButton
          {...defaultProps}
          disabled={true}
          onShareClick={onShareClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })

      expect(onShareClick).not.toHaveBeenCalled()
    })

    it('その他のキーでは反応しない', () => {
      const onShareClick = vi.fn()
      render(
        <TwitterShareButton {...defaultProps} onShareClick={onShareClick} />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'a' })
      fireEvent.keyDown(button, { key: 'Escape' })

      expect(onShareClick).not.toHaveBeenCalled()
    })
  })

  describe('Twitter Web Intent', () => {
    it('クリック時にTwitter Web Intentが開かれる', async () => {
      mockOpen.mockReturnValue({} as Window)

      render(<TwitterShareButton {...defaultProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          expect.stringContaining('https://twitter.com/intent/tweet?text='),
          'twitter-share',
          'width=550,height=420,scrollbars=yes,resizable=yes'
        )
      })
    })

    it('正しいシェアテキストがエンコードされる', async () => {
      mockOpen.mockReturnValue({} as Window)

      render(<TwitterShareButton {...defaultProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const callArgs = mockOpen.mock.calls[0]
        const url = callArgs[0] as string
        expect(url).toContain(encodeURIComponent(defaultProps.shareText))
      })
    })

    it('ポップアップがブロックされた場合クリップボードにコピーされる', async () => {
      mockOpen.mockReturnValue(null) // ポップアップブロック
      mockWriteText.mockResolvedValue(undefined)

      render(<TwitterShareButton {...defaultProps} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(defaultProps.shareText)
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('Twitter Web Intent失敗時にクリップボードフォールバックが実行される', async () => {
      mockOpen.mockImplementation(() => {
        throw new Error('Twitter Intent failed')
      })
      mockWriteText.mockResolvedValue(undefined)

      const onError = vi.fn()
      render(<TwitterShareButton {...defaultProps} onError={onError} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
        expect(mockWriteText).toHaveBeenCalledWith(defaultProps.shareText)
      })
    })

    it('クリップボードAPIが利用できない場合の古いブラウザフォールバック', async () => {
      // 元の値を保存
      const originalClipboard = navigator.clipboard

      try {
        // navigator.clipboardを削除
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true,
        })

        mockExecCommand.mockReturnValue(true)
        mockOpen.mockReturnValue(null)

        render(<TwitterShareButton {...defaultProps} />)

        const button = screen.getByRole('button')
        fireEvent.click(button)

        // execCommandが呼ばれることを確認（古いブラウザフォールバック）
        await waitFor(() => {
          expect(mockExecCommand).toHaveBeenCalledWith('copy')
        })
      } finally {
        // 元の値を復元
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          writable: true,
        })
      }
    })
  })

  describe('コールバック', () => {
    it('onShareClickコールバックが実行される', async () => {
      const onShareClick = vi.fn()
      mockOpen.mockReturnValue({} as Window)

      render(
        <TwitterShareButton {...defaultProps} onShareClick={onShareClick} />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onShareClick).toHaveBeenCalledTimes(1)
      })
    })

    it('onErrorコールバックがエラー時に実行される', async () => {
      const onError = vi.fn()
      mockOpen.mockImplementation(() => {
        throw new Error('Test error')
      })
      mockWriteText.mockResolvedValue(undefined)

      render(<TwitterShareButton {...defaultProps} onError={onError} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
  })

  describe('レスポンシブ表示モード', () => {
    it('displayMode="full"で正しくレンダリングされる', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="full" />)

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('共有')

      // アイコンにmr-2クラスが適用される
      const icon = button.querySelector('svg')
      expect(icon).toHaveClass('mr-2')
    })

    it('displayMode="icon-only"で正しくレンダリングされる', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      const button = screen.getByRole('button')

      // テキストはスクリーンリーダー用のみ
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('共有')

      // アイコンにmr-0クラスが適用される
      const icon = button.querySelector('svg')
      expect(icon).toHaveClass('mr-0')

      // パディングが調整される
      expect(button).toHaveClass('px-2')
    })

    it('displayMode="icon-only"で適切なARIA属性が設定される', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で今月の勉強会情報を共有する'
      )
    })

    it('displayMode="icon-only"でツールチップがより詳細になる', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      const tooltip = screen.getByText('X（旧Twitter）で今月の勉強会情報を共有')
      expect(tooltip).toBeInTheDocument()
    })

    it('responsive=trueでレスポンシブクラスが適用される', () => {
      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      const textSpan = button.querySelector('span.hidden.sm\\:inline')
      expect(textSpan).toBeInTheDocument()

      // アイコンにレスポンシブクラスが適用される
      const icon = button.querySelector('svg')
      expect(icon).toHaveClass('mr-0', 'sm:mr-2')
    })

    it('displayMode="icon-only"とresponsive=trueの組み合わせで正しく動作する', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          displayMode="icon-only"
          responsive={true}
        />
      )

      const button = screen.getByRole('button')

      // icon-onlyモードではresponsiveに関係なくsr-onlyテキスト
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('共有')

      // アイコンはmr-0のまま
      const icon = button.querySelector('svg')
      expect(icon).toHaveClass('mr-0')
    })

    it('ローディング状態でもレスポンシブ表示が正しく動作する', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          displayMode="icon-only"
          isLoading={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('共有中...')

      // icon-onlyモードではsr-onlyテキスト
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('共有中...')
    })

    it('エラー状態でもレスポンシブ表示が正しく動作する', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          displayMode="icon-only"
          hasError={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('再試行')

      // icon-onlyモードではsr-onlyテキスト
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('再試行')
    })

    it('レスポンシブモードでスムーズなトランジションクラスが適用される', () => {
      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      const textSpan = button.querySelector('span.transition-opacity')
      expect(textSpan).toBeInTheDocument()
      expect(textSpan).toHaveClass('duration-200')
    })

    it('displayModeとresponsiveの全組み合わせで機能が維持される', async () => {
      const onShareClick = vi.fn()
      mockOpen.mockReturnValue({} as Window)

      const combinations = [
        { displayMode: 'full' as const, responsive: false },
        { displayMode: 'full' as const, responsive: true },
        { displayMode: 'icon-only' as const, responsive: false },
        { displayMode: 'icon-only' as const, responsive: true },
      ]

      for (const props of combinations) {
        vi.clearAllMocks()

        const { unmount } = render(
          <TwitterShareButton
            {...defaultProps}
            {...props}
            onShareClick={onShareClick}
          />
        )

        const button = screen.getByRole('button')
        fireEvent.click(button)

        await waitFor(() => {
          expect(onShareClick).toHaveBeenCalledTimes(1)
          expect(mockOpen).toHaveBeenCalledTimes(1)
        })

        unmount()
      }
    })
  })

  describe('レスポンシブトランジション機能', () => {
    it('responsive=trueでトランジション状態が正しく管理される', () => {
      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-responsive', 'true')
      expect(button).toHaveAttribute('data-display-mode', 'full')
      expect(button).toHaveAttribute('data-breakpoint', 'desktop')
    })

    it('responsive=falseでトランジション状態が設定されない', () => {
      render(<TwitterShareButton {...defaultProps} responsive={false} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-responsive', 'false')
      expect(button).not.toHaveAttribute('data-breakpoint')
    })

    it('レスポンシブモードでトランジションクラスが適用される', () => {
      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      // デフォルトのトランジションクラスが適用される
      expect(button).toHaveClass('responsive-breakpoint-handler')
    })

    it('レスポンシブテキストが適切に処理される', () => {
      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      // レスポンシブテキストが適切に処理される
      const textSpan = button.querySelector('span.hidden.sm\\:inline')
      expect(textSpan).toBeInTheDocument()
    })

    it('モバイルブレークポイントでトランジションが発生する', () => {
      const mockUseResponsiveTransitions = vi.mocked(
        require('../../utils/responsive-transitions').useResponsiveTransitions
      )

      // モバイルブレークポイントをシミュレート
      mockUseResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 200,
        getTransitionClasses: () =>
          'responsive-breakpoint-handler breakpoint-mobile transitioning from-desktop',
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
      })

      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-breakpoint', 'mobile')
      expect(button).toHaveClass('transitioning', 'from-desktop')
    })

    it('reduced motionが有効な場合トランジションが無効化される', () => {
      const mockUseResponsiveTransitions = vi.mocked(
        require('../../utils/responsive-transitions').useResponsiveTransitions
      )

      mockUseResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: undefined,
        isTransitioning: false,
        prefersReducedMotion: true,
        transitionDuration: 200,
        getTransitionClasses: () =>
          'responsive-breakpoint-handler breakpoint-mobile reduced-motion',
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
      })

      render(<TwitterShareButton {...defaultProps} responsive={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('reduced-motion')
    })

    it('トランジション中でもボタン機能が維持される', async () => {
      const mockUseResponsiveTransitions = vi.mocked(
        require('../../utils/responsive-transitions').useResponsiveTransitions
      )
      const onShareClick = vi.fn()
      mockOpen.mockReturnValue({} as Window)

      mockUseResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 200,
        getTransitionClasses: () =>
          'responsive-breakpoint-handler breakpoint-mobile transitioning',
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
      })

      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          onShareClick={onShareClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onShareClick).toHaveBeenCalledTimes(1)
        expect(mockOpen).toHaveBeenCalledTimes(1)
      })
    })

    it('ブレークポイント変更時にテキスト表示が適切に切り替わる', () => {
      const mockUseResponsiveTransitions = vi.mocked(
        require('../../utils/responsive-transitions').useResponsiveTransitions
      )

      // 最初はデスクトップ
      mockUseResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'desktop',
        previousBreakpoint: undefined,
        isTransitioning: false,
        prefersReducedMotion: false,
        transitionDuration: 200,
        getTransitionClasses: () =>
          'responsive-breakpoint-handler breakpoint-desktop',
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
      })

      const { rerender } = render(
        <TwitterShareButton {...defaultProps} responsive={true} />
      )

      let button = screen.getByRole('button')
      let textSpan = button.querySelector('span.hidden.sm\\:inline')
      expect(textSpan).toBeInTheDocument()

      // モバイルに変更
      mockUseResponsiveTransitions.mockReturnValue({
        currentBreakpoint: 'mobile',
        previousBreakpoint: 'desktop',
        isTransitioning: true,
        prefersReducedMotion: false,
        transitionDuration: 200,
        getTransitionClasses: () =>
          'responsive-breakpoint-handler breakpoint-mobile transitioning from-desktop',
        applyTransitionClasses: vi.fn(),
        removeTransitionClasses: vi.fn(),
      })

      rerender(<TwitterShareButton {...defaultProps} responsive={true} />)

      button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-breakpoint', 'mobile')
      expect(button).toHaveClass('transitioning')
    })
  })

  describe('アクセシビリティ - レスポンシブモード', () => {
    it('icon-onlyモードでより詳細なaria-labelが提供される', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で今月の勉強会情報を共有する'
      )
    })

    it('fullモードで標準のaria-labelが提供される', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="full" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で勉強会情報を共有する'
      )
    })

    it('icon-onlyモードでスクリーンリーダー用テキストが適切に設定される', () => {
      render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      const button = screen.getByRole('button')
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('共有')
      expect(srOnlyText).toBeInTheDocument()
    })

    it('icon-onlyモードのローディング状態でスクリーンリーダー用テキストが更新される', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          displayMode="icon-only"
          isLoading={true}
        />
      )

      const button = screen.getByRole('button')
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('共有中...')
    })

    it('icon-onlyモードのエラー状態でスクリーンリーダー用テキストが更新される', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          displayMode="icon-only"
          hasError={true}
        />
      )

      const button = screen.getByRole('button')
      const srOnlyText = button.querySelector('.sr-only')
      expect(srOnlyText).toHaveTextContent('再試行')
    })

    it('レスポンシブモードでキーボードナビゲーションが維持される', async () => {
      const onShareClick = vi.fn()
      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
          onShareClick={onShareClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })

      await waitFor(() => {
        expect(onShareClick).toHaveBeenCalledTimes(1)
      })
    })

    it('レスポンシブモードでタブ順序が維持される', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
      expect(button).not.toHaveAttribute('aria-disabled')
    })
  })

  describe('パフォーマンス最適化', () => {
    it('displayModeの変更時にメモ化されたクラスが再計算される', () => {
      const { rerender } = render(
        <TwitterShareButton {...defaultProps} displayMode="full" />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('px-3')

      rerender(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      expect(button).toHaveClass('px-2')
    })

    it('状態変更時にARIA属性が適切に更新される', () => {
      const { rerender } = render(
        <TwitterShareButton {...defaultProps} displayMode="full" />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で勉強会情報を共有する'
      )

      rerender(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      expect(button).toHaveAttribute(
        'aria-label',
        'X（旧Twitter）で今月の勉強会情報を共有する'
      )
    })

    it('ツールチップテキストが状態に応じて更新される', () => {
      const { rerender } = render(
        <TwitterShareButton {...defaultProps} displayMode="full" />
      )

      let tooltip = screen.getByText('今月の勉強会をXで共有')
      expect(tooltip).toBeInTheDocument()

      rerender(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

      tooltip = screen.getByText('X（旧Twitter）で今月の勉強会情報を共有')
      expect(tooltip).toBeInTheDocument()
    })
  })

  describe('既存機能の保持', () => {
    it('レスポンシブモードでもTwitter Web Intentが正常に動作する', async () => {
      mockOpen.mockReturnValue({} as Window)

      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          expect.stringContaining('https://twitter.com/intent/tweet?text='),
          'twitter-share',
          'width=550,height=420,scrollbars=yes,resizable=yes'
        )
      })
    })

    it('レスポンシブモードでもエラーハンドリングが正常に動作する', async () => {
      const onError = vi.fn()
      mockOpen.mockImplementation(() => {
        throw new Error('Test error')
      })
      mockWriteText.mockResolvedValue(undefined)

      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
          onError={onError}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
        expect(mockWriteText).toHaveBeenCalledWith(defaultProps.shareText)
      })
    })

    it('レスポンシブモードでもクリップボードフォールバックが動作する', async () => {
      mockOpen.mockReturnValue(null) // ポップアップブロック
      mockWriteText.mockResolvedValue(undefined)

      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(defaultProps.shareText)
      })
    })

    it('レスポンシブモードでも無効状態が正しく処理される', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
          disabled={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('レスポンシブモードでもローディング状態が正しく処理される', () => {
      render(
        <TwitterShareButton
          {...defaultProps}
          responsive={true}
          displayMode="icon-only"
          isLoading={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')

      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('レスポンシブ表示モード - 詳細テスト', () => {
    describe('icon-only mode functionality', () => {
      it('icon-onlyモードでアイコンのみが表示される', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

        const button = screen.getByRole('button')
        const icon = button.querySelector('svg')
        const srOnlyText = button.querySelector('.sr-only')

        // アイコンが表示される
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('mr-0') // icon-onlyモードではマージンなし

        // テキストはスクリーンリーダー用のみ
        expect(srOnlyText).toBeInTheDocument()
        expect(srOnlyText).toHaveTextContent('共有')

        // 通常のテキストは表示されない（sr-onlyテキストのみ）
        // sr-onlyテキストは存在するが、視覚的には隠されている
        expect(button.textContent?.trim()).toBe('共有') // sr-onlyテキストのみ
      })

      it('icon-onlyモードでパディングが調整される', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

        const button = screen.getByRole('button')
        expect(button).toHaveClass('px-2', 'py-2')
      })

      it('icon-onlyモードでローディング状態が正しく表示される', () => {
        render(
          <TwitterShareButton
            {...defaultProps}
            displayMode="icon-only"
            isLoading={true}
          />
        )

        const button = screen.getByRole('button')
        const spinner = button.querySelector('.animate-spin')
        const srOnlyText = button.querySelector('.sr-only')

        expect(spinner).toBeInTheDocument()
        expect(srOnlyText).toHaveTextContent('共有中...')
        expect(button).toBeDisabled()
      })

      it('icon-onlyモードでエラー状態が正しく表示される', () => {
        render(
          <TwitterShareButton
            {...defaultProps}
            displayMode="icon-only"
            hasError={true}
          />
        )

        const button = screen.getByRole('button')
        const retryIcon = button.querySelector('svg[stroke="currentColor"]')
        const srOnlyText = button.querySelector('.sr-only')

        expect(retryIcon).toBeInTheDocument()
        expect(srOnlyText).toHaveTextContent('再試行')
        expect(button).toHaveClass('border-red-300', 'text-red-700')
      })

      it('icon-onlyモードでクリック機能が正常に動作する', async () => {
        const onShareClick = vi.fn()
        mockOpen.mockReturnValue({} as Window)

        render(
          <TwitterShareButton
            {...defaultProps}
            displayMode="icon-only"
            onShareClick={onShareClick}
          />
        )

        const button = screen.getByRole('button')
        fireEvent.click(button)

        await waitFor(() => {
          expect(onShareClick).toHaveBeenCalledTimes(1)
          expect(mockOpen).toHaveBeenCalledWith(
            expect.stringContaining('https://twitter.com/intent/tweet?text='),
            'twitter-share',
            'width=550,height=420,scrollbars=yes,resizable=yes'
          )
        })
      })
    })

    describe('responsive mode transitions', () => {
      it('responsive=trueでテキストが適切に表示/非表示される', () => {
        render(<TwitterShareButton {...defaultProps} responsive={true} />)

        const button = screen.getByRole('button')
        const textSpan = button.querySelector('span.hidden.sm\\:inline')
        const icon = button.querySelector('svg')

        // レスポンシブテキストが存在する
        expect(textSpan).toBeInTheDocument()
        expect(textSpan).toHaveTextContent('共有')
        expect(textSpan).toHaveClass('transition-opacity', 'duration-200')

        // アイコンにレスポンシブクラスが適用される
        expect(icon).toHaveClass('mr-0', 'sm:mr-2')
      })

      it('responsive=trueとdisplayMode="full"の組み合わせで正しく動作する', () => {
        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="full"
          />
        )

        const button = screen.getByRole('button')
        const textSpan = button.querySelector('span.hidden.sm\\:inline')

        expect(textSpan).toBeInTheDocument()
        expect(textSpan).toHaveClass('transition-opacity')
        expect(button).toHaveAttribute('data-display-mode', 'full')
      })

      it('responsive=trueとdisplayMode="icon-only"の組み合わせで正しく動作する', () => {
        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
          />
        )

        const button = screen.getByRole('button')
        const srOnlyText = button.querySelector('.sr-only')
        const icon = button.querySelector('svg')

        // icon-onlyモードではresponsiveに関係なくsr-onlyテキスト
        expect(srOnlyText).toBeInTheDocument()
        expect(srOnlyText).toHaveTextContent('共有')

        // アイコンはmr-0のまま
        expect(icon).toHaveClass('mr-0')
        expect(button).toHaveAttribute('data-display-mode', 'icon-only')
      })

      it('ブレークポイント変更時にスムーズなトランジションが適用される', () => {
        const mockUseResponsiveTransitions = vi.mocked(
          require('../../utils/responsive-transitions').useResponsiveTransitions
        )

        mockUseResponsiveTransitions.mockReturnValue({
          currentBreakpoint: 'mobile',
          previousBreakpoint: 'desktop',
          isTransitioning: true,
          prefersReducedMotion: false,
          transitionDuration: 200,
          getTransitionClasses: () =>
            'responsive-breakpoint-handler breakpoint-mobile transitioning smooth-transition',
          applyTransitionClasses: vi.fn(),
          removeTransitionClasses: vi.fn(),
        })

        render(<TwitterShareButton {...defaultProps} responsive={true} />)

        const button = screen.getByRole('button')
        expect(button).toHaveClass('smooth-transition')
      })

      it('トランジション中でもアクセシビリティが維持される', () => {
        const mockUseResponsiveTransitions = vi.mocked(
          require('../../utils/responsive-transitions').useResponsiveTransitions
        )

        mockUseResponsiveTransitions.mockReturnValue({
          currentBreakpoint: 'mobile',
          previousBreakpoint: 'desktop',
          isTransitioning: true,
          prefersReducedMotion: false,
          transitionDuration: 200,
          getTransitionClasses: () =>
            'responsive-breakpoint-handler transitioning',
          applyTransitionClasses: vi.fn(),
          removeTransitionClasses: vi.fn(),
        })

        render(<TwitterShareButton {...defaultProps} responsive={true} />)

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label')
        expect(button).toHaveAttribute('role', 'button')
        expect(button).toHaveAttribute('tabIndex', '0')
      })
    })

    describe('accessibility in responsive modes', () => {
      it('icon-onlyモードで詳細なaria-labelが提供される', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute(
          'aria-label',
          'X（旧Twitter）で今月の勉強会情報を共有する'
        )
      })

      it('fullモードで標準のaria-labelが提供される', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="full" />)

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute(
          'aria-label',
          'X（旧Twitter）で勉強会情報を共有する'
        )
      })

      it('icon-onlyモードでスクリーンリーダー用説明が適切に設定される', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

        const helpText = screen.getByText(
          '今月の勉強会情報をX（旧Twitter）で共有します'
        )
        expect(helpText).toBeInTheDocument()
        expect(helpText).toHaveClass('sr-only')
      })

      it('icon-onlyモードでツールチップがより詳細になる', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="icon-only" />)

        const tooltip = screen.getByText(
          'X（旧Twitter）で今月の勉強会情報を共有'
        )
        expect(tooltip).toBeInTheDocument()
      })

      it('fullモードで標準のツールチップが表示される', () => {
        render(<TwitterShareButton {...defaultProps} displayMode="full" />)

        const tooltip = screen.getByText('今月の勉強会をXで共有')
        expect(tooltip).toBeInTheDocument()
      })

      it('レスポンシブモードでキーボードナビゲーションが維持される', async () => {
        const onShareClick = vi.fn()
        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
            onShareClick={onShareClick}
          />
        )

        const button = screen.getByRole('button')

        // Enterキーでの操作
        fireEvent.keyDown(button, { key: 'Enter' })
        await waitFor(() => {
          expect(onShareClick).toHaveBeenCalledTimes(1)
        })

        // Spaceキーでの操作
        fireEvent.keyDown(button, { key: ' ' })
        await waitFor(() => {
          expect(onShareClick).toHaveBeenCalledTimes(2)
        })
      })

      it('無効状態でもレスポンシブモードのアクセシビリティが維持される', () => {
        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
            disabled={true}
          />
        )

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-disabled', 'true')
        expect(button).toHaveAttribute('tabIndex', '-1')
        expect(button).toHaveAttribute(
          'aria-describedby',
          'twitter-share-disabled-help'
        )
      })

      it('エラー状態でもレスポンシブモードのアクセシビリティが維持される', () => {
        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
            hasError={true}
          />
        )

        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-invalid', 'true')
        expect(button).toHaveAttribute(
          'aria-describedby',
          'twitter-share-error-help'
        )
      })
    })

    describe('existing functionality preservation', () => {
      it('レスポンシブモードでもTwitter Web Intentが正常に動作する', async () => {
        mockOpen.mockReturnValue({} as Window)

        const testCases = [
          { displayMode: 'full' as const, responsive: false },
          { displayMode: 'full' as const, responsive: true },
          { displayMode: 'icon-only' as const, responsive: false },
          { displayMode: 'icon-only' as const, responsive: true },
        ]

        for (const testCase of testCases) {
          vi.clearAllMocks()

          const { unmount } = render(
            <TwitterShareButton {...defaultProps} {...testCase} />
          )

          const button = screen.getByRole('button')
          fireEvent.click(button)

          await waitFor(() => {
            expect(mockOpen).toHaveBeenCalledWith(
              expect.stringContaining('https://twitter.com/intent/tweet?text='),
              'twitter-share',
              'width=550,height=420,scrollbars=yes,resizable=yes'
            )
          })

          unmount()
        }
      })

      it('レスポンシブモードでもエラーハンドリングが正常に動作する', async () => {
        const onError = vi.fn()
        mockOpen.mockImplementation(() => {
          throw new Error('Test error')
        })
        mockWriteText.mockResolvedValue(undefined)

        const testCases = [
          { displayMode: 'full' as const, responsive: true },
          { displayMode: 'icon-only' as const, responsive: true },
        ]

        for (const testCase of testCases) {
          vi.clearAllMocks()

          const { unmount } = render(
            <TwitterShareButton
              {...defaultProps}
              {...testCase}
              onError={onError}
            />
          )

          const button = screen.getByRole('button')
          fireEvent.click(button)

          await waitFor(() => {
            expect(onError).toHaveBeenCalledWith(expect.any(Error))
            expect(mockWriteText).toHaveBeenCalledWith(defaultProps.shareText)
          })

          unmount()
        }
      })

      it('レスポンシブモードでもクリップボードフォールバックが動作する', async () => {
        mockOpen.mockReturnValue(null) // ポップアップブロック
        mockWriteText.mockResolvedValue(undefined)

        const testCases = [
          { displayMode: 'full' as const, responsive: true },
          { displayMode: 'icon-only' as const, responsive: true },
        ]

        for (const testCase of testCases) {
          vi.clearAllMocks()

          const { unmount } = render(
            <TwitterShareButton {...defaultProps} {...testCase} />
          )

          const button = screen.getByRole('button')
          fireEvent.click(button)

          await waitFor(() => {
            expect(mockWriteText).toHaveBeenCalledWith(defaultProps.shareText)
          })

          unmount()
        }
      })

      it('レスポンシブモードでも状態管理が正常に動作する', () => {
        const states = [
          { disabled: true },
          { isLoading: true },
          { hasError: true },
        ]

        states.forEach(state => {
          const { unmount } = render(
            <TwitterShareButton
              {...defaultProps}
              responsive={true}
              displayMode="icon-only"
              {...state}
            />
          )

          const button = screen.getByRole('button')

          if (state.disabled) {
            expect(button).toBeDisabled()
            expect(button).toHaveAttribute('aria-disabled', 'true')
          }

          if (state.isLoading) {
            expect(button).toBeDisabled()
            expect(button).toHaveAttribute('aria-busy', 'true')
            expect(button.querySelector('.animate-spin')).toBeInTheDocument()
          }

          if (state.hasError) {
            expect(button).toHaveClass('border-red-300', 'text-red-700')
            expect(button).toHaveAttribute('aria-invalid', 'true')
          }

          unmount()
        })
      })

      it('レスポンシブモードでもコールバックが正常に実行される', async () => {
        const onShareClick = vi.fn()
        const onError = vi.fn()
        mockOpen.mockReturnValue({} as Window)

        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
            onShareClick={onShareClick}
            onError={onError}
          />
        )

        const button = screen.getByRole('button')
        fireEvent.click(button)

        await waitFor(() => {
          expect(onShareClick).toHaveBeenCalledTimes(1)
        })

        // エラーケースのテスト
        vi.clearAllMocks()
        mockOpen.mockImplementation(() => {
          throw new Error('Test error')
        })
        mockWriteText.mockResolvedValue(undefined)

        fireEvent.click(button)

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(expect.any(Error))
        })
      })

      it('レスポンシブモードでもパフォーマンス最適化が維持される', () => {
        const { rerender } = render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="full"
          />
        )

        const button = screen.getByRole('button')
        expect(button).toHaveClass('px-3')

        // displayModeの変更でクラスが再計算される
        rerender(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
          />
        )

        expect(button).toHaveClass('px-2')
      })
    })

    describe('complex responsive scenarios', () => {
      it('複数のブレークポイント変更でも安定して動作する', () => {
        const mockUseResponsiveTransitions = vi.mocked(
          require('../../utils/responsive-transitions').useResponsiveTransitions
        )

        const breakpoints = ['desktop', 'tablet', 'mobile'] as const

        breakpoints.forEach((breakpoint, index) => {
          mockUseResponsiveTransitions.mockReturnValue({
            currentBreakpoint: breakpoint,
            previousBreakpoint: index > 0 ? breakpoints[index - 1] : undefined,
            isTransitioning: index > 0,
            prefersReducedMotion: false,
            transitionDuration: 200,
            getTransitionClasses: () =>
              `responsive-breakpoint-handler breakpoint-${breakpoint}`,
            applyTransitionClasses: vi.fn(),
            removeTransitionClasses: vi.fn(),
          })

          const { unmount } = render(
            <TwitterShareButton {...defaultProps} responsive={true} />
          )

          const button = screen.getByRole('button')
          expect(button).toHaveAttribute('data-breakpoint', breakpoint)

          unmount()
        })
      })

      it('高速なブレークポイント変更でも正常に動作する', async () => {
        const mockUseResponsiveTransitions = vi.mocked(
          require('../../utils/responsive-transitions').useResponsiveTransitions
        )
        const onShareClick = vi.fn()
        mockOpen.mockReturnValue({} as Window)

        // 高速な変更をシミュレート
        mockUseResponsiveTransitions.mockReturnValue({
          currentBreakpoint: 'mobile',
          previousBreakpoint: 'desktop',
          isTransitioning: true,
          prefersReducedMotion: false,
          transitionDuration: 50, // 短いトランジション
          getTransitionClasses: () =>
            'responsive-breakpoint-handler transitioning fast-transition',
          applyTransitionClasses: vi.fn(),
          removeTransitionClasses: vi.fn(),
        })

        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            onShareClick={onShareClick}
          />
        )

        const button = screen.getByRole('button')
        fireEvent.click(button)

        await waitFor(() => {
          expect(onShareClick).toHaveBeenCalledTimes(1)
        })
      })

      it('レスポンシブモードとエラー状態の組み合わせで正常に動作する', async () => {
        const onError = vi.fn()
        mockOpen.mockImplementation(() => {
          throw new Error('Network error')
        })
        mockWriteText.mockRejectedValue(new Error('Clipboard error'))

        render(
          <TwitterShareButton
            {...defaultProps}
            responsive={true}
            displayMode="icon-only"
            onError={onError}
          />
        )

        const button = screen.getByRole('button')
        fireEvent.click(button)

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(expect.any(Error))
        })
      })
    })
  })

  describe('エッジケースのテスト', () => {
    it('空のシェアテキストでも正常に動作する', async () => {
      mockOpen.mockReturnValue({} as Window)

      render(<TwitterShareButton {...defaultProps} shareText="" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          expect.stringContaining('https://twitter.com/intent/tweet?text='),
          'twitter-share',
          'width=550,height=420,scrollbars=yes,resizable=yes'
        )
      })
    })

    it('非常に長いシェアテキストでも正常に動作する', async () => {
      const longText = 'a'.repeat(1000)
      mockOpen.mockReturnValue({} as Window)

      render(<TwitterShareButton {...defaultProps} shareText={longText} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith(
          expect.stringContaining('https://twitter.com/intent/tweet?text='),
          'twitter-share',
          'width=550,height=420,scrollbars=yes,resizable=yes'
        )
      })
    })

    it('特殊文字を含むシェアテキストが正しくエンコードされる', async () => {
      const specialText = '特殊文字: & < > " \' # % + = ? @ [ ] { } | \\ ^ ` ~'
      mockOpen.mockReturnValue({} as Window)

      render(<TwitterShareButton {...defaultProps} shareText={specialText} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        const callArgs = mockOpen.mock.calls[0]
        const url = callArgs[0] as string
        expect(url).toContain(encodeURIComponent(specialText))
      })
    })

    it('複数回クリックしても正常に動作する', async () => {
      const onShareClick = vi.fn()
      mockOpen.mockReturnValue({} as Window)

      render(
        <TwitterShareButton {...defaultProps} onShareClick={onShareClick} />
      )

      const button = screen.getByRole('button')

      // 複数回クリック
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      await waitFor(() => {
        expect(onShareClick).toHaveBeenCalledTimes(3)
        expect(mockOpen).toHaveBeenCalledTimes(3)
      })
    })

    it('ローディング中はクリックが無視される', () => {
      const onShareClick = vi.fn()

      render(
        <TwitterShareButton
          {...defaultProps}
          isLoading={true}
          onShareClick={onShareClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onShareClick).not.toHaveBeenCalled()
      expect(mockOpen).not.toHaveBeenCalled()
    })

    it('無効状態ではクリックが無視される', () => {
      const onShareClick = vi.fn()

      render(
        <TwitterShareButton
          {...defaultProps}
          disabled={true}
          onShareClick={onShareClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onShareClick).not.toHaveBeenCalled()
      expect(mockOpen).not.toHaveBeenCalled()
    })

    it('ツールチップが正しく表示される', () => {
      render(<TwitterShareButton {...defaultProps} />)

      const tooltip = screen.getByText('今月の勉強会をXで共有')
      expect(tooltip).toBeInTheDocument()
      expect(tooltip).toHaveClass('opacity-0') // 初期状態では非表示
    })

    it('エラー状態のツールチップが正しく表示される', () => {
      render(<TwitterShareButton {...defaultProps} hasError={true} />)

      const tooltip = screen.getByText('クリックして再試行')
      expect(tooltip).toBeInTheDocument()
    })

    it('ローディング状態のツールチップが正しく表示される', () => {
      render(<TwitterShareButton {...defaultProps} isLoading={true} />)

      const tooltip = screen.getByText('X共有の準備中...')
      expect(tooltip).toBeInTheDocument()
    })
  })
})
