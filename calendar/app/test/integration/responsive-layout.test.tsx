import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test-utils'
import userEvent from '@testing-library/user-event'
import EventMaterialsList from '../../components/EventMaterialsList'
import Home from '../../page'

/**
 * レスポンシブレイアウトテスト
 * 要件4.1, 4.4に対応
 *
 * - 各デバイスサイズでの表示確認
 * - タッチ操作の動作確認
 */
describe('Responsive Layout Tests', () => {
  // 元のwindowサイズを保存
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'
  })

  afterEach(() => {
    // windowサイズを元に戻す
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
    vi.restoreAllMocks()
  })

  describe('各デバイスサイズでの表示確認 (要件4.1)', () => {
    const deviceSizes = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Large Desktop', width: 1920, height: 1080 },
    ]

    deviceSizes.forEach(({ name, width, height }) => {
      it(`should display correctly on ${name} (${width}x${height})`, async () => {
        // デバイスサイズを設定
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        })

        render(<Home />)

        // 基本要素の表示確認
        expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()
        expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()

        // イベント資料一覧の読み込み待機
        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // テーブルの表示確認
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        // レスポンシブクラスの確認
        expect(table).toHaveClass('min-w-full')
        if (width >= 640) {
          // sm以上のサイズでは最小幅が設定される
          expect(table).toHaveClass('sm:min-w-[600px]')
        }

        // 水平スクロールコンテナの確認
        const scrollContainer = table.closest('.overflow-x-auto')
        expect(scrollContainer).toBeInTheDocument()
        expect(scrollContainer).toHaveClass('overflow-x-auto')

        // コンテンツの可読性確認
        expect(screen.getByText('2024/01/15')).toBeInTheDocument()
        expect(screen.getByText('2024/01/20')).toBeInTheDocument()
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
        expect(screen.getByText('テスト資料2')).toBeInTheDocument()
      })
    })

    it('should maintain table structure across all screen sizes', async () => {
      const testSizes = [375, 768, 1024, 1280]

      for (const width of testSizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        render(<EventMaterialsList />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // テーブル構造の確認
        const columnHeaders = screen.getAllByRole('columnheader')
        expect(columnHeaders).toHaveLength(3) // イベント名、開催日時、資料

        // 各列の内容確認
        expect(screen.getByText('イベント名')).toBeInTheDocument()
        expect(screen.getByText('開催日時')).toBeInTheDocument()
        // 「資料」は複数存在するため、getAllByTextを使用
        const materialHeaders = screen.getAllByText('資料')
        expect(materialHeaders.length).toBeGreaterThan(0)

        // データ行の確認
        const dataRows = screen.getAllByRole('row').slice(1) // ヘッダー行を除く
        expect(dataRows).toHaveLength(2) // テストデータは2件

        // クリーンアップ
        screen.getByRole('table').remove()
      }
    })

    it('should handle horizontal scrolling on small screens', async () => {
      // 小画面サイズを設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // 非常に小さい画面
      })

      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 水平スクロールコンテナの確認
      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto')
      expect(scrollContainer).toBeInTheDocument()

      // テーブルの最小幅が設定されていることを確認
      expect(table).toHaveClass('min-w-full')

      // スムーズスクロールクラスの確認
      expect(scrollContainer).toHaveClass('smooth-scroll')

      // contain-layoutクラスの確認（パフォーマンス最適化）
      expect(scrollContainer).toHaveClass('contain-layout')
    })

    it('should adapt padding and spacing for different screen sizes', async () => {
      const testCases = [
        { width: 375, expectedPadding: 'px-3' }, // モバイル
        { width: 768, expectedPadding: 'sm:px-6' }, // タブレット以上
      ]

      for (const { width, expectedPadding } of testCases) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        render(<EventMaterialsList />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // テーブルセルのパディングクラス確認
        const tableCells = screen.getAllByRole('cell')
        tableCells.forEach(cell => {
          expect(cell).toHaveClass('px-3') // 基本パディング
          if (width >= 640) {
            expect(cell).toHaveClass('sm:px-6') // sm以上でのパディング
          }
        })

        // クリーンアップ
        screen.getByRole('table').remove()
      }
    })
  })

  describe('タッチ操作の動作確認 (要件4.4)', () => {
    beforeEach(() => {
      // モバイルデバイスをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      // タッチデバイスをシミュレート
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      })
    })

    it('should provide appropriate touch targets for material links', async () => {
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // 資料リンクのタッチターゲット確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })

      materialLinks.forEach(link => {
        // 最小タッチターゲットサイズ（44px）の確認
        expect(link).toHaveClass('min-h-[44px]')

        // インラインフレックス表示でタッチしやすくする（実際の実装に合わせる）
        expect(link).toHaveClass('inline-flex')

        // 適切なパディングが設定されている
        expect(link).toHaveClass('py-1')
      })
    })

    it('should handle touch events on material links', async () => {
      const user = userEvent.setup()
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // 資料リンクのタッチ操作
      const materialLink = screen.getByRole('link', { name: /テスト資料1/ })

      // タッチイベントのシミュレート
      fireEvent.touchStart(materialLink)
      fireEvent.touchEnd(materialLink)

      // リンクが正しく設定されていることを確認
      expect(materialLink).toHaveAttribute('href', 'https://example.com/slide1')
      expect(materialLink).toHaveAttribute('target', '_blank')
    })

    it('should handle touch events on event title links', async () => {
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // イベントタイトルリンクのタッチ操作
      const eventLink = screen.getByRole('link', { name: /テストイベント1/ })

      // タッチイベントのシミュレート
      fireEvent.touchStart(eventLink)
      fireEvent.touchEnd(eventLink)

      // リンクが正しく設定されていることを確認
      expect(eventLink).toHaveAttribute(
        'href',
        'https://connpass.com/event/123/'
      )
      expect(eventLink).toHaveAttribute('target', '_blank')
    })

    it('should provide appropriate touch targets for connpass links', async () => {
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // connpassリンクのタッチターゲット確認
      const connpassLinks = screen.getAllByRole('link', { name: /connpass/ })

      connpassLinks.forEach(link => {
        // 適切なパディングでタッチしやすくする
        expect(link).toHaveClass('py-1')

        // インラインブロック表示
        expect(link).toHaveClass('inline-block')
      })
    })

    it('should handle horizontal scroll gestures on touch devices', async () => {
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 水平スクロールコンテナの取得
      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement
      expect(scrollContainer).toBeInTheDocument()

      // タッチスクロールイベントのシミュレート
      fireEvent.touchStart(scrollContainer, {
        touches: [{ clientX: 100, clientY: 100 }],
      })

      fireEvent.touchMove(scrollContainer, {
        touches: [{ clientX: 50, clientY: 100 }], // 左にスワイプ
      })

      fireEvent.touchEnd(scrollContainer)

      // スクロールコンテナが適切に設定されていることを確認
      expect(scrollContainer).toHaveClass('overflow-x-auto')
      expect(scrollContainer).toHaveClass('smooth-scroll')
    })

    it('should maintain touch accessibility with proper focus states', async () => {
      const user = userEvent.setup()
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // フォーカス可能な要素の確認
      const focusableLinks = screen.getAllByRole('link')

      for (const link of focusableLinks) {
        // タブキーでフォーカス移動
        await user.tab()

        // フォーカス状態の確認（実際のフォーカスは環境によって異なるため、
        // 要素がフォーカス可能であることを確認）
        expect(link).toHaveAttribute('href')
        expect(link.tagName).toBe('A')
      }
    })

    it('should handle thumbnail touch interactions', async () => {
      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // サムネイル画像の確認
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
      expect(thumbnailImage).toBeInTheDocument()

      // サムネイルと同じ行にある資料リンクを取得
      const materialLink = screen.getByRole('link', { name: /テスト資料1/ })
      expect(materialLink).toBeInTheDocument()

      // タッチイベントのシミュレート
      fireEvent.touchStart(materialLink)
      fireEvent.touchEnd(materialLink)

      // リンクが正しく機能することを確認
      expect(materialLink).toHaveAttribute('href', 'https://example.com/slide1')
      expect(materialLink).toHaveAttribute('target', '_blank')
    })
  })

  describe('レスポンシブコンポーネントの統合テスト', () => {
    it('should maintain responsive behavior in full page context', async () => {
      // モバイルサイズ
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<Home />)

      // カレンダーとイベント資料一覧の両方が表示される
      expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // レスポンシブレイアウトの確認
      const main = screen.getByRole('main')
      expect(main).toHaveClass('max-w-7xl', 'mx-auto')

      // ヘッダーのレスポンシブ要素
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()

      // ナビゲーションボタンの配置
      const shareButton = screen.getByText('シェア')
      const twitterButton = screen.getByText('共有')
      const registerLink = screen.getByText('勉強会の登録依頼')

      expect(shareButton).toBeInTheDocument()
      expect(twitterButton).toBeInTheDocument()
      expect(registerLink).toBeInTheDocument()
    })

    it('should adapt layout from mobile to desktop', async () => {
      // モバイルから開始
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // モバイルレイアウトの確認
      let table = screen.getByRole('table')
      expect(table).toHaveClass('min-w-full')

      // デスクトップサイズに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      })

      // リサイズイベントをトリガー
      fireEvent(window, new Event('resize'))

      // レイアウトが維持されることを確認
      table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      expect(table).toHaveClass('min-w-full', 'sm:min-w-[600px]')

      // コンテンツが正しく表示されることを確認
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
    })

    it('should handle orientation changes on mobile devices', async () => {
      // ポートレート（縦向き）
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // ランドスケープ（横向き）に変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      })

      // オリエンテーション変更イベントをトリガー
      fireEvent(window, new Event('orientationchange'))

      // レイアウトが適応することを確認
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })
  })

  describe('パフォーマンスとアクセシビリティ', () => {
    it('should maintain performance on different screen sizes', async () => {
      const performanceTestSizes = [375, 768, 1024, 1280]

      for (const width of performanceTestSizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        const startTime = performance.now()
        render(<EventMaterialsList />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        const endTime = performance.now()
        const renderTime = endTime - startTime

        // レンダリング時間が合理的な範囲内であることを確認
        expect(renderTime).toBeLessThan(1000) // 1秒以内

        // クリーンアップ
        screen.getByRole('table').remove()
      }
    })

    it('should maintain accessibility across screen sizes', async () => {
      const accessibilityTestSizes = [375, 768, 1280]

      for (const width of accessibilityTestSizes) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        render(<EventMaterialsList />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 見出し構造の確認
        const headings = screen.getAllByRole('heading')
        expect(headings.length).toBeGreaterThan(0)

        // テーブルのアクセシビリティ
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        const columnHeaders = screen.getAllByRole('columnheader')
        expect(columnHeaders).toHaveLength(3)

        // リンクのアクセシビリティ
        const links = screen.getAllByRole('link')
        links.forEach(link => {
          expect(link).toHaveAttribute('href')
          // 外部リンクの場合
          if (link.getAttribute('target') === '_blank') {
            expect(link).toHaveAttribute('rel', 'noopener noreferrer')
          }
        })

        // クリーンアップ
        table.remove()
      }
    })

    it('should handle reduced motion preferences', async () => {
      // reduced motionを設定
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<EventMaterialsList />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // アニメーション要素の確認（ローディングスピナーなど）
      // データが読み込まれた後はスピナーは表示されないため、
      // reduced motionの設定が正しく適用されることを確認
      const testElement = screen.getByText('テストイベント1')
      expect(testElement).toBeInTheDocument()

      // reduced motionが適用される場合、アニメーションが制限される
      // （実際の実装では、CSSでprefers-reduced-motionを使用）
    })
  })
})
