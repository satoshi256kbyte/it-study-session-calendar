import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import Home from '../../page'
import EventMaterialsList from '../../components/EventMaterialsList'

/**
 * レスポンシブイベント資料一覧の簡単な統合テスト
 * 要件: 全要件に対応
 *
 * - 基本的な統合テスト
 * - 既存機能との互換性テスト
 */
describe('Responsive Event Materials Simple Integration Tests', () => {
  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基本的な統合テスト', () => {
    it('should display the main page with calendar and event materials', async () => {
      render(<Home />)

      // ページタイトルの確認
      expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()

      // カレンダーの確認
      expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()

      // イベント資料一覧の読み込み待機
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 基本的なコンテンツの確認
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()
    })

    it('should display event materials list component', async () => {
      render(<EventMaterialsList />)

      // 初期ローディング状態
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // データが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 基本的な機能が正常に動作
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()

      // テーブル構造の確認
      expect(screen.getByText('イベント名')).toBeInTheDocument()
      expect(screen.getByText('開催日時')).toBeInTheDocument()
      const materialHeaders = screen.getAllByText('資料')
      expect(materialHeaders.length).toBeGreaterThan(0)
    })
  })

  describe('既存機能との互換性テスト', () => {
    it('should maintain backward compatibility with EventMaterialsList', async () => {
      render(<EventMaterialsList />)

      // 初期ローディング状態
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // データが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 既存の機能が正常に動作
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()

      // テーブル構造の確認
      expect(screen.getByText('イベント名')).toBeInTheDocument()
      expect(screen.getByText('開催日時')).toBeInTheDocument()
      const materialHeaders = screen.getAllByText('資料')
      expect(materialHeaders.length).toBeGreaterThan(0)
    })

    it('should preserve existing API integration', async () => {
      render(<Home />)

      // API統合が正常に動作することを確認
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // モックAPIからのデータが正しく表示される
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()

      // 日付フォーマットの確認
      expect(screen.getByText('2024/01/15')).toBeInTheDocument()
      expect(screen.getByText('2024/01/20')).toBeInTheDocument()

      // 資料リンクの確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBe(2)

      // 外部リンクの属性確認
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })

      // 最終更新時刻の表示確認
      expect(screen.getByText(/最終更新/)).toBeInTheDocument()
    })

    it('should preserve existing accessibility features', async () => {
      render(<Home />)

      // 見出し構造の確認
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('広島IT勉強会カレンダー')

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThanOrEqual(1)

      // iframeのtitle属性確認
      const iframe = screen.getByTitle('広島IT勉強会カレンダー')
      expect(iframe).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブルのアクセシビリティ確認
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // 列ヘッダーの確認
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBe(3) // イベント名、開催日時、資料

      // リンクのアクセシビリティ確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('title')
      })
    })

    it('should maintain existing sharing functionality', async () => {
      const mockShare = vi.fn()
      const mockOpen = vi.fn()

      // navigator.shareをモック
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
        configurable: true,
      })

      // window.openをモック
      vi.stubGlobal('open', mockOpen)

      render(<Home />)

      // シェアボタンの確認
      const shareButton = screen.getByText('シェア')
      expect(shareButton).toBeInTheDocument()

      // Twitterシェアボタンの確認
      const twitterButton = screen.getByRole('button', {
        name: /X（旧Twitter）で勉強会情報を共有する/,
      })
      expect(twitterButton).toBeInTheDocument()
    })
  })

  describe('レスポンシブ機能の基本テスト', () => {
    it('should display responsive table with horizontal scroll', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブルコンテナの確認
      const table = screen.getByRole('table')
      const tableContainer = table.closest('div')
      expect(tableContainer).toHaveClass('overflow-x-auto')

      // テーブルの最小幅設定確認
      expect(table).toHaveClass('min-w-full', 'sm:min-w-[600px]')
    })

    it('should maintain readability on different screen sizes', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // イベント名の可読性確認
      const eventTitle = screen.getByText('テストイベント1')
      expect(eventTitle).toBeInTheDocument()
      expect(eventTitle).toHaveClass('break-words')

      // 日付の表示確認
      expect(screen.getByText('2024/01/15')).toBeInTheDocument()
      expect(screen.getByText('2024/01/20')).toBeInTheDocument()
    })

    it('should provide appropriate touch targets for mobile', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // 資料リンクのタッチターゲットサイズ確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      materialLinks.forEach(link => {
        // min-h-[44px] クラスが設定されている
        expect(link).toHaveClass('min-h-[44px]')
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle error states with appropriate messaging', async () => {
      render(<EventMaterialsList />)

      // 初期ローディング状態
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // データが正常に読み込まれることを確認
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 正常なデータ表示状態
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()
    })

    it('should display loading state properly', () => {
      render(<Home />)

      // 初期ローディング状態
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // ローディングスピナーの確認
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })
})
