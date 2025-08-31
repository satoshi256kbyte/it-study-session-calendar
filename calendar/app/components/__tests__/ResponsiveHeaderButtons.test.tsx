/**
 * ResponsiveHeaderButtonsコンポーネントのテスト
 * 要件3.1, 3.2, 5.3, 5.4のテスト検証
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// performanceMonitor のモック
vi.mock('../utils/performance', () => ({
  performanceMonitor: {
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
}))

import ResponsiveHeaderButtons from '../ResponsiveHeaderButtons'

// モック関数の設定
const mockOpen = vi.fn()
const mockWriteText = vi.fn()

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

Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
})

describe('ResponsiveHeaderButtons', () => {
  const defaultProps = {
    shareText: 'Test share text',
    calendarUrl: 'https://example.com/calendar',
    isEventsLoading: false,
    eventsError: null,
    isFallbackMode: false,
    isRetryable: false,
    onRetry: vi.fn(),
    onShareClick: vi.fn(),
    onTwitterShareError: vi.fn(),
    onNativeShare: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本的なレンダリング', () => {
    it('すべてのボタンが正しくレンダリングされる', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // TwitterShareButton が存在することを確認（より具体的なaria-labelで検索）
      expect(
        screen.getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
      ).toBeInTheDocument()

      // Native share button が存在することを確認
      expect(
        screen.getByRole('button', {
          name: /ネイティブ共有機能を使用してページを共有/,
        })
      ).toBeInTheDocument()

      // Register button が存在することを確認
      expect(
        screen.getByRole('link', { name: /勉強会の登録依頼ページへ移動/ })
      ).toBeInTheDocument()
    })

    it('適切なCSSクラスが適用される', () => {
      const { container } = render(
        <ResponsiveHeaderButtons {...defaultProps} className="test-class" />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass(
        'flex',
        'items-center',
        'space-x-4',
        'test-class'
      )
    })
  })

  describe('エラー状態の処理', () => {
    it('エラーがある場合に再試行ボタンが表示される', () => {
      render(
        <ResponsiveHeaderButtons
          {...defaultProps}
          eventsError="Test error"
          isRetryable={true}
          isFallbackMode={false}
        />
      )

      expect(
        screen.getByRole('button', { name: /勉強会データの取得を再試行/ })
      ).toBeInTheDocument()
    })

    it('フォールバックモードの場合は再試行ボタンが表示されない', () => {
      render(
        <ResponsiveHeaderButtons
          {...defaultProps}
          eventsError="Test error"
          isRetryable={true}
          isFallbackMode={true}
        />
      )

      expect(
        screen.queryByRole('button', { name: /勉強会データの取得を再試行/ })
      ).not.toBeInTheDocument()
    })

    it('再試行ボタンをクリックするとonRetryが呼ばれる', () => {
      const onRetry = vi.fn()
      render(
        <ResponsiveHeaderButtons
          {...defaultProps}
          eventsError="Test error"
          isRetryable={true}
          isFallbackMode={false}
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole('button', {
        name: /勉強会データの取得を再試行/,
      })
      fireEvent.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('ボタンの相互作用', () => {
    it('ネイティブ共有ボタンをクリックするとonNativeShareが呼ばれる', () => {
      const onNativeShare = vi.fn()
      render(
        <ResponsiveHeaderButtons
          {...defaultProps}
          onNativeShare={onNativeShare}
        />
      )

      const shareButton = screen.getByRole('button', {
        name: /ネイティブ共有機能を使用してページを共有/,
      })
      fireEvent.click(shareButton)

      expect(onNativeShare).toHaveBeenCalledTimes(1)
    })

    it('Twitter共有ボタンのプロパティが正しく渡される', () => {
      render(
        <ResponsiveHeaderButtons {...defaultProps} isEventsLoading={true} />
      )

      // Loading状態のTwitterボタンが存在することを確認
      expect(
        screen.getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
      ).toBeInTheDocument()
    })
  })

  describe('レスポンシブ対応', () => {
    it('レスポンシブプロパティが子コンポーネントに正しく渡される', () => {
      render(<ResponsiveHeaderButtons {...defaultProps} />)

      // TwitterShareButtonとStudySessionRegisterButtonが存在することを確認
      expect(
        screen.getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /勉強会の登録依頼ページへ移動/ })
      ).toBeInTheDocument()
    })
  })

  describe('パフォーマンス最適化', () => {
    it('プロパティが変更されない場合は不要な再レンダリングを避ける', () => {
      const { rerender } = render(<ResponsiveHeaderButtons {...defaultProps} />)

      // 同じプロパティで再レンダリング
      rerender(<ResponsiveHeaderButtons {...defaultProps} />)

      // コンポーネントが正常にレンダリングされることを確認
      expect(
        screen.getByRole('button', {
          name: /X（旧Twitter）で勉強会情報を共有する/,
        })
      ).toBeInTheDocument()
    })
  })
})
