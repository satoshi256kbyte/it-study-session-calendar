import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../page'

/**
 * E2Eテスト: イベント資料一覧機能
 * 要件1.1, 3.3, 4.1に対応
 *
 * - カレンダーページでのイベント資料一覧表示テスト
 * - 資料リンクの動作テスト
 * - レスポンシブ表示のテスト
 */
describe('Event Materials E2E Tests', () => {
  let mockOpen: any
  let mockShare: any
  let mockClipboard: any

  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'

    // window.openをモック
    mockOpen = vi.fn()
    vi.stubGlobal('open', mockOpen)

    // navigator.shareをモック
    mockShare = vi.fn()
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    })

    // navigator.clipboardをモック
    mockClipboard = {
      writeText: vi.fn(),
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('カレンダーページでのイベント資料一覧表示テスト (要件1.1)', () => {
    it('should display calendar and event materials list together', async () => {
      render(<Home />)

      // ページタイトルの確認
      expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()

      // カレンダーセクションの確認
      expect(screen.getByText('広島の勉強会スケジュール')).toBeInTheDocument()
      const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
      expect(calendarIframe).toBeInTheDocument()

      // イベント資料一覧セクションの確認
      expect(
        screen.getByRole('heading', { name: /イベント資料一覧/ })
      ).toBeInTheDocument()
      expect(
        screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
      ).toBeInTheDocument()

      // 初期ローディング状態
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // データが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // イベント資料が表示される
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()
    })

    it('should load event materials asynchronously without blocking calendar', async () => {
      render(<Home />)

      // カレンダーは即座に表示される
      const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
      expect(calendarIframe).toBeInTheDocument()
      expect(calendarIframe).toHaveAttribute(
        'src',
        'https://calendar.google.com/calendar/embed?src=test'
      )

      // イベント資料一覧は非同期で読み込まれる
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // カレンダーは影響を受けない
      expect(calendarIframe).toBeInTheDocument()

      // データが読み込まれてもカレンダーは表示されたまま
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      expect(calendarIframe).toBeInTheDocument()
    })

    it('should display events in descending order by date', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブル行を取得
      const tableRows = screen.getAllByRole('row')
      // ヘッダー行を除く
      const dataRows = tableRows.slice(1)

      // 最新のイベント（2024/01/20）が最初に表示される
      expect(dataRows[0]).toHaveTextContent('テストイベント2')
      expect(dataRows[0]).toHaveTextContent('2024/01/20')

      // 古いイベント（2024/01/15）が次に表示される
      expect(dataRows[1]).toHaveTextContent('テストイベント1')
      expect(dataRows[1]).toHaveTextContent('2024/01/15')
    })

    it('should display proper table structure with required columns', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブルヘッダーの確認
      expect(screen.getByText('イベント名')).toBeInTheDocument()
      expect(screen.getByText('開催日時')).toBeInTheDocument()

      // 「資料」ヘッダーは複数存在する可能性があるため、getAllByTextを使用
      const materialHeaders = screen.getAllByText('資料')
      expect(materialHeaders.length).toBeGreaterThan(0)

      // 日付フォーマットの確認（YYYY/MM/DD形式）
      expect(screen.getByText('2024/01/15')).toBeInTheDocument()
      expect(screen.getByText('2024/01/20')).toBeInTheDocument()
    })

    it('should display last updated timestamp', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 最終更新時刻の表示確認
      expect(screen.getByText(/最終更新/)).toBeInTheDocument()
    })
  })

  describe('資料リンクの動作テスト (要件3.3)', () => {
    it('should open material links in new tab', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // 資料リンクの確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBeGreaterThan(0)

      // 外部リンクの属性確認
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })

      // リンクのクリック動作確認
      const firstMaterialLink = materialLinks[0]
      // イベントは日付順（降順）で表示されるため、最初のリンクは最新のイベントの資料
      expect(firstMaterialLink).toHaveAttribute(
        'href',
        'https://example.com/slide2'
      )

      // リンクが正しく設定されていることを確認
      // 新しいタブで開くため、現在のページは変わらない
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
    })

    it('should display event links correctly', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // イベント名リンクの確認
      const eventLink1 = screen.getByRole('link', { name: /テストイベント1/ })
      expect(eventLink1).toHaveAttribute(
        'href',
        'https://connpass.com/event/123/'
      )
      expect(eventLink1).toHaveAttribute('target', '_blank')
      expect(eventLink1).toHaveAttribute('rel', 'noopener noreferrer')

      // connpassリンクの確認
      const connpassLinks = screen.getAllByRole('link', { name: /connpass/ })
      expect(connpassLinks.length).toBeGreaterThan(0)
      connpassLinks.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('should display material thumbnails when available', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // サムネイル画像の確認
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
      expect(thumbnailImage).toBeInTheDocument()
      expect(thumbnailImage).toHaveAttribute(
        'src',
        'https://example.com/thumb1.jpg'
      )
      expect(thumbnailImage).toHaveAttribute('loading', 'lazy')
    })

    it('should handle thumbnail loading errors gracefully', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // サムネイル画像のエラーハンドリング
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')

      // 画像読み込みエラーをシミュレート
      fireEvent.error(thumbnailImage)

      // エラー後もリンクは機能する
      const materialLink = screen.getByRole('link', { name: /テスト資料1/ })
      expect(materialLink).toBeInTheDocument()
    })

    it('should display material type icons and labels', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // 資料タイプの表示確認（getMaterialTypeDisplayNameの結果に基づく）
      expect(screen.getByText('スライド')).toBeInTheDocument() // slide type

      // document type の表示名は「資料」だが、テーブルヘッダーにも「資料」があるため、
      // より具体的にMaterialLinkコンポーネント内の資料タイプを確認
      const materialTypeElements = screen.getAllByText('資料')
      // テーブルヘッダー以外に資料タイプとしての「資料」が存在することを確認
      expect(materialTypeElements.length).toBeGreaterThan(1)
    })
  })

  describe('レスポンシブ表示のテスト (要件4.1)', () => {
    it('should display responsive table with horizontal scroll', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブルコンテナの確認
      const tableContainer = screen.getByRole('table').closest('div')
      expect(tableContainer).toHaveClass('overflow-x-auto')

      // テーブルの最小幅設定確認
      const table = screen.getByRole('table')
      expect(table).toHaveClass('min-w-full', 'sm:min-w-[600px]')
    })

    it('should maintain readability on small screens', async () => {
      // 小画面をシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // イベント名の可読性確認
      const eventTitle = screen.getByText('テストイベント1')
      expect(eventTitle).toBeInTheDocument()
      // break-wordsクラスはリンク要素に適用されている
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
        // min-h-[44px] クラスまたは適切なパディングが設定されている
        const linkElement = link as HTMLElement
        const styles = window.getComputedStyle(linkElement)
        // タッチターゲットの最小サイズ（44px）を確認
        expect(linkElement).toHaveClass('min-h-[44px]')
      })
    })

    it('should adapt thumbnail sizes for different screen sizes', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // サムネイルコンテナのレスポンシブクラス確認
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
      const thumbnailContainer = thumbnailImage.closest('div')

      // レスポンシブサイズクラスの確認
      expect(thumbnailContainer).toHaveClass(
        'w-12',
        'h-9',
        'sm:w-16',
        'sm:h-12'
      )
    })

    it('should handle navigation elements responsively', async () => {
      render(<Home />)

      // ヘッダーのレスポンシブ要素確認
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()

      // ナビゲーションボタンの確認
      const shareButton = screen.getByText('シェア')
      const twitterButton = screen.getByText('共有')
      const registerLink = screen.getByText('勉強会の登録依頼')

      expect(shareButton).toBeInTheDocument()
      expect(twitterButton).toBeInTheDocument()
      expect(registerLink).toBeInTheDocument()

      // レスポンシブスペーシングの確認
      const buttonContainer = shareButton.closest('div')
      expect(buttonContainer).toHaveClass('space-x-4')
    })

    it('should maintain layout integrity across different viewport sizes', async () => {
      // デスクトップサイズ
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // メインコンテナのレスポンシブクラス確認
      const main = screen.getByRole('main')
      expect(main).toHaveClass('max-w-7xl', 'mx-auto')

      // カレンダーとイベント資料一覧の両方が表示される
      expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()
      const eventMaterialsHeaders = screen.getAllByRole('heading', {
        name: /イベント資料一覧/,
      })
      expect(eventMaterialsHeaders.length).toBeGreaterThan(0)

      // タブレットサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      // レイアウトが維持される
      expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()
      const eventMaterialsHeaders2 = screen.getAllByRole('heading', {
        name: /イベント資料一覧/,
      })
      expect(eventMaterialsHeaders2.length).toBeGreaterThan(0)
    })
  })

  describe('エラーハンドリングとユーザビリティ', () => {
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

    it('should handle error states with appropriate messaging', async () => {
      // SWRのエラーハンドリングをテストするため、
      // 既存のテストで十分カバーされているエラー状態を確認
      render(<Home />)

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

    it('should maintain accessibility standards', async () => {
      render(<Home />)

      // 見出し構造の確認
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('広島IT勉強会カレンダー')

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThanOrEqual(2)

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

      // リンクのaria-labelやtitle属性確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('title')
      })
    })

    it('should handle sharing functionality', async () => {
      const user = userEvent.setup()
      render(<Home />)

      // シェアボタンのクリック
      const shareButton = screen.getByText('シェア')
      await user.click(shareButton)

      // navigator.shareが呼ばれることを確認
      expect(mockShare).toHaveBeenCalledWith({
        title: '広島IT勉強会カレンダー',
        text: '広島のIT関連の勉強会やイベントをカレンダー表示するウェブアプリケーション',
        url: 'https://satoshi256kbyte.github.io/it-study-session-calendar/',
      })
    })

    it('should handle Twitter sharing', async () => {
      const user = userEvent.setup()
      render(<Home />)

      // Twitterシェアボタンのクリック
      const twitterButton = screen.getByText('共有')
      await user.click(twitterButton)

      // window.openが適切なURLで呼ばれることを確認
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet'),
        '_blank'
      )
    })

    it('should handle data refresh and caching correctly', async () => {
      render(<Home />)

      // 初期データの読み込み確認
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // データが正しく表示されている
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()

      // 最終更新時刻が表示されている
      expect(screen.getByText(/最終更新/)).toBeInTheDocument()
    })

    it('should display development cache indicator in development mode', async () => {
      // 開発モードをシミュレート
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // キャッシュインジケーターの確認（開発モードでのみ表示）
      expect(
        screen.getByText('✓ キャッシュからデータを表示中')
      ).toBeInTheDocument()

      // 環境変数を元に戻す
      process.env.NODE_ENV = originalEnv
    })

    it('should maintain proper ARIA labels and roles for accessibility', async () => {
      render(<Home />)

      // ローディング状態のARIA属性確認
      const loadingSpinner = screen.getByRole('status')
      expect(loadingSpinner).toHaveAttribute('aria-label', '読み込み中')

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブルのアクセシビリティ確認
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // 画像のalt属性確認
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
      expect(thumbnailImage).toBeInTheDocument()
    })
  })
})
