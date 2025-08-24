/**
 * TwitterShareButtonコンポーネントのテスト
 * 要件2.1, 2.2, 2.3のテスト検証
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
