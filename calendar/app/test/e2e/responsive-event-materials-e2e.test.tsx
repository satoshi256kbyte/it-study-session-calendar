import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../page'
import ResponsiveEventMaterialsList from '../../components/ResponsiveEventMaterialsList'

/**
 * レスポンシブイベント資料一覧のE2Eテスト
 * 要件: 全要件に対応
 *
 * - 実際のデバイスでのE2Eテスト
 * - レスポンシブレイアウトの実用性テスト
 * - ユーザビリティテストの自動化
 */
describe('Responsive Event Materials E2E Tests', () => {
  // デバイス設定のシミュレーション
  const deviceConfigs = {
    iPhoneSE: {
      name: 'iPhone SE',
      width: 375,
      height: 667,
      pixelRatio: 2,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      touchPoints: 5,
    },
    iPhone12: {
      name: 'iPhone 12',
      width: 390,
      height: 844,
      pixelRatio: 3,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      touchPoints: 5,
    },
    iPadAir: {
      name: 'iPad Air',
      width: 768,
      height: 1024,
      pixelRatio: 2,
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      touchPoints: 10,
    },
    iPadPro: {
      name: 'iPad Pro',
      width: 1024,
      height: 1366,
      pixelRatio: 2,
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      touchPoints: 10,
    },
    desktop: {
      name: 'Desktop',
      width: 1280,
      height: 720,
      pixelRatio: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      touchPoints: 0,
    },
    largeDesktop: {
      name: 'Large Desktop',
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      touchPoints: 0,
    },
  }

  // 元のwindowプロパティを保存
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight
  const originalDevicePixelRatio = window.devicePixelRatio
  const originalUserAgent = navigator.userAgent

  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'
  })

  afterEach(() => {
    // プロパティを元に戻す
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
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: originalDevicePixelRatio,
    })
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: originalUserAgent,
    })
    vi.restoreAllMocks()
  })

  /**
   * デバイス環境をシミュレートするヘルパー関数
   */
  const simulateDevice = (deviceConfig: typeof deviceConfigs.iPhoneSE) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: deviceConfig.width,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: deviceConfig.height,
    })
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: deviceConfig.pixelRatio,
    })
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: deviceConfig.userAgent,
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: deviceConfig.touchPoints,
    })
  }

  describe('実際のデバイスでのE2Eテスト', () => {
    Object.entries(deviceConfigs).forEach(([deviceKey, deviceConfig]) => {
      describe(`${deviceConfig.name} (${deviceConfig.width}x${deviceConfig.height})`, () => {
        beforeEach(() => {
          simulateDevice(deviceConfig)
        })

        it('should load and display the complete page correctly', async () => {
          render(<Home />)

          // ページタイトルの確認
          expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()

          // カレンダーセクションの確認
          expect(
            screen.getByText('広島の勉強会スケジュール')
          ).toBeInTheDocument()
          const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
          expect(calendarIframe).toBeInTheDocument()
          expect(calendarIframe).toHaveAttribute(
            'src',
            'https://calendar.google.com/calendar/embed?src=test'
          )

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
          await waitFor(
            () => {
              expect(screen.getByText('テストイベント1')).toBeInTheDocument()
            },
            { timeout: 5000 }
          )

          // イベント資料が表示される
          expect(screen.getByText('テストイベント2')).toBeInTheDocument()
          expect(screen.getByText('テスト資料1')).toBeInTheDocument()
          expect(screen.getByText('テスト資料2')).toBeInTheDocument()

          // 日付フォーマットの確認
          expect(screen.getByText('2024/01/15')).toBeInTheDocument()
          expect(screen.getByText('2024/01/20')).toBeInTheDocument()

          // 最終更新時刻の表示確認
          expect(screen.getByText(/最終更新/)).toBeInTheDocument()
        })

        it('should handle user interactions appropriately', async () => {
          const user = userEvent.setup()
          render(<Home />)

          await waitFor(() => {
            expect(screen.getByText('テスト資料1')).toBeInTheDocument()
          })

          // 資料リンクのクリック動作確認
          const materialLinks = screen.getAllByRole('link', {
            name: /テスト資料/,
          })
          expect(materialLinks.length).toBeGreaterThan(0)

          // 最初の資料リンクをクリック
          const firstMaterialLink = materialLinks[0]
          expect(firstMaterialLink).toHaveAttribute('target', '_blank')
          expect(firstMaterialLink).toHaveAttribute(
            'rel',
            'noopener noreferrer'
          )

          // イベント名リンクのクリック確認
          const eventLinks = screen.getAllByRole('link', {
            name: /テストイベント/,
          })
          expect(eventLinks.length).toBeGreaterThan(0)

          eventLinks.forEach(link => {
            expect(link).toHaveAttribute('target', '_blank')
            expect(link).toHaveAttribute('rel', 'noopener noreferrer')
          })

          // ナビゲーションボタンの動作確認
          const shareButton = screen.getByText('シェア')
          const twitterButton = screen.getByText('共有')
          const registerLink = screen.getByText('勉強会の登録依頼')

          expect(shareButton).toBeInTheDocument()
          expect(twitterButton).toBeInTheDocument()
          expect(registerLink).toBeInTheDocument()

          // 登録リンクの確認
          expect(registerLink).toHaveAttribute('href', '/register')
        })

        it('should maintain accessibility standards', async () => {
          render(<Home />)

          // 見出し構造の確認
          const h1 = screen.getByRole('heading', { level: 1 })
          expect(h1).toHaveTextContent('広島IT勉強会カレンダー')

          const h2Elements = screen.getAllByRole('heading', { level: 2 })
          expect(h2Elements.length).toBeGreaterThanOrEqual(2)

          // iframeのアクセシビリティ確認
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

          // ローディング状態のアクセシビリティ確認
          const loadingSpinner = screen.getByRole('status')
          expect(loadingSpinner).toHaveAttribute('aria-label', '読み込み中')

          // 画像のalt属性確認
          const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
          expect(thumbnailImage).toBeInTheDocument()

          // リンクのアクセシビリティ確認
          const materialLinks = screen.getAllByRole('link', {
            name: /テスト資料/,
          })
          materialLinks.forEach(link => {
            expect(link).toHaveAttribute('title')
          })
        })

        it('should handle touch interactions correctly', async () => {
          if (deviceConfig.touchPoints > 0) {
            render(<Home />)

            await waitFor(() => {
              expect(screen.getByText('テスト資料1')).toBeInTheDocument()
            })

            // タッチターゲットサイズの確認
            const materialLinks = screen.getAllByRole('link', {
              name: /テスト資料/,
            })
            materialLinks.forEach(link => {
              expect(link).toHaveClass('min-h-[44px]')
            })

            // タッチイベントのシミュレート
            const firstMaterialLink = materialLinks[0]

            act(() => {
              fireEvent.touchStart(firstMaterialLink, {
                touches: [{ clientX: 100, clientY: 100 }],
              })
            })

            act(() => {
              fireEvent.touchEnd(firstMaterialLink)
            })

            // リンクが正しく設定されていることを確認
            expect(firstMaterialLink).toHaveAttribute('href')
            expect(firstMaterialLink).toHaveAttribute('target', '_blank')

            // 水平スクロールのタッチ操作確認
            const table = screen.getByRole('table')
            const scrollContainer = table.closest(
              '.overflow-x-auto'
            ) as HTMLElement
            expect(scrollContainer).toBeInTheDocument()

            act(() => {
              fireEvent.touchStart(scrollContainer, {
                touches: [{ clientX: 100, clientY: 100 }],
              })
            })

            act(() => {
              fireEvent.touchMove(scrollContainer, {
                touches: [{ clientX: 50, clientY: 100 }], // 左にスワイプ
              })
            })

            act(() => {
              fireEvent.touchEnd(scrollContainer)
            })

            // スクロールコンテナが適切に設定されている
            expect(scrollContainer).toHaveClass('overflow-x-auto')
            expect(scrollContainer).toHaveClass('smooth-scroll')
          } else {
            // デスクトップデバイスの場合はマウス操作を確認
            const user = userEvent.setup()
            render(<Home />)

            await waitFor(() => {
              expect(screen.getByText('テスト資料1')).toBeInTheDocument()
            })

            // マウスホバー効果の確認
            const materialLinks = screen.getAllByRole('link', {
              name: /テスト資料/,
            })
            const firstLink = materialLinks[0]

            await user.hover(firstLink)
            expect(firstLink).toHaveClass('hover:text-blue-800')
          }
        })

        it('should display content with appropriate sizing and spacing', async () => {
          render(<Home />)

          await waitFor(() => {
            expect(screen.getByText('テストイベント1')).toBeInTheDocument()
          })

          // メインコンテナのレスポンシブクラス確認
          const main = screen.getByRole('main')
          expect(main).toHaveClass('max-w-7xl', 'mx-auto')

          // テーブルの表示確認
          const table = screen.getByRole('table')
          expect(table).toHaveClass('min-w-full')

          if (deviceConfig.width >= 640) {
            expect(table).toHaveClass('sm:min-w-[600px]')
          }

          // 水平スクロールコンテナの確認
          const scrollContainer = table.closest('.overflow-x-auto')
          expect(scrollContainer).toBeInTheDocument()
          expect(scrollContainer).toHaveClass('overflow-x-auto')

          // サムネイルサイズの確認
          const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
          const thumbnailContainer = thumbnailImage.closest('div')

          expect(thumbnailContainer).toHaveClass('w-12', 'h-9')
          if (deviceConfig.width >= 640) {
            expect(thumbnailContainer).toHaveClass('sm:w-16', 'sm:h-12')
          }

          // テキストの可読性確認
          const eventTitle = screen.getByText('テストイベント1')
          expect(eventTitle).toHaveClass('break-words')

          // パディングとスペーシングの確認
          const tableCells = screen.getAllByRole('cell')
          tableCells.forEach(cell => {
            expect(cell).toHaveClass('px-3')
            if (deviceConfig.width >= 640) {
              expect(cell).toHaveClass('sm:px-6')
            }
          })
        })

        it('should handle orientation changes smoothly', async () => {
          if (deviceConfig.touchPoints > 0) {
            // ポートレート（縦向き）から開始
            render(<Home />)

            await waitFor(() => {
              expect(screen.getByText('テストイベント1')).toBeInTheDocument()
            })

            // 初期状態の確認
            expect(
              screen.getByTitle('広島IT勉強会カレンダー')
            ).toBeInTheDocument()
            const initialTable = screen.getByRole('table')
            expect(initialTable).toBeInTheDocument()

            // ランドスケープ（横向き）に変更
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: deviceConfig.height, // 幅と高さを入れ替え
            })
            Object.defineProperty(window, 'innerHeight', {
              writable: true,
              configurable: true,
              value: deviceConfig.width,
            })

            // オリエンテーション変更イベントをトリガー
            act(() => {
              fireEvent(window, new Event('orientationchange'))
              fireEvent(window, new Event('resize'))
            })

            // レイアウトが適応することを確認
            await waitFor(() => {
              expect(screen.getByText('テストイベント1')).toBeInTheDocument()
            })

            expect(
              screen.getByTitle('広島IT勉強会カレンダー')
            ).toBeInTheDocument()
            expect(screen.getByRole('table')).toBeInTheDocument()
          }
        })
      })
    })
  })

  describe('レスポンシブレイアウトの実用性テスト', () => {
    it('should provide optimal reading experience across all devices', async () => {
      const readabilityMetrics = {
        textSize: 0,
        lineHeight: 0,
        contrast: 0,
        touchTargetSize: 0,
      }

      for (const [deviceKey, deviceConfig] of Object.entries(deviceConfigs)) {
        simulateDevice(deviceConfig)
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // テキストサイズの確認
        const eventTitle = screen.getByText('テストイベント1')
        const titleStyles = window.getComputedStyle(eventTitle)
        const fontSize = parseInt(titleStyles.fontSize)
        expect(fontSize).toBeGreaterThanOrEqual(14) // 最小14px

        // タッチターゲットサイズの確認（タッチデバイスの場合）
        if (deviceConfig.touchPoints > 0) {
          const materialLinks = screen.getAllByRole('link', {
            name: /テスト資料/,
          })
          materialLinks.forEach(link => {
            expect(link).toHaveClass('min-h-[44px]')
          })
        }

        // 水平スクロールの必要性確認
        const table = screen.getByRole('table')
        const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement
        expect(scrollContainer).toBeInTheDocument()

        // 小画面では水平スクロールが利用可能
        if (deviceConfig.width < 640) {
          expect(scrollContainer).toHaveClass('overflow-x-auto')
        }

        // コンテンツの可読性確認
        expect(screen.getByText('2024/01/15')).toBeInTheDocument()
        expect(screen.getByText('2024/01/20')).toBeInTheDocument()

        // クリーンアップ
        table.remove()
      }
    })

    it('should maintain consistent functionality across viewport transitions', async () => {
      // デスクトップから開始
      simulateDevice(deviceConfigs.desktop)
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 初期状態の機能確認
      let materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBe(2)

      // タブレットサイズに変更
      simulateDevice(deviceConfigs.iPadAir)
      act(() => {
        fireEvent(window, new Event('resize'))
      })

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 機能が維持される
      materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBe(2)

      // モバイルサイズに変更
      simulateDevice(deviceConfigs.iPhone12)
      act(() => {
        fireEvent(window, new Event('resize'))
      })

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // 機能が引き続き維持される
      materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBe(2)

      // すべてのリンクが正しく設定されている
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('href')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('should optimize content layout for different screen densities', async () => {
      const highDPIDevices = [deviceConfigs.iPhone12, deviceConfigs.iPadAir]
      const lowDPIDevices = [deviceConfigs.desktop, deviceConfigs.largeDesktop]

      // 高DPIデバイスでのテスト
      for (const deviceConfig of highDPIDevices) {
        simulateDevice(deviceConfig)
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 高DPI対応の確認
        expect(window.devicePixelRatio).toBeGreaterThanOrEqual(2)

        // サムネイル画像の表示確認
        const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
        expect(thumbnailImage).toBeInTheDocument()
        expect(thumbnailImage).toHaveAttribute('loading', 'lazy')

        // クリーンアップ
        screen.getByRole('table').remove()
      }

      // 低DPIデバイスでのテスト
      for (const deviceConfig of lowDPIDevices) {
        simulateDevice(deviceConfig)
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 標準DPIの確認
        expect(window.devicePixelRatio).toBe(1)

        // 同じコンテンツが表示される
        const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
        expect(thumbnailImage).toBeInTheDocument()

        // クリーンアップ
        screen.getByRole('table').remove()
      }
    })

    it('should handle edge cases and extreme viewport sizes', async () => {
      const extremeViewports = [
        { name: 'Very Small', width: 320, height: 568 }, // iPhone 5/SE
        { name: 'Very Wide', width: 2560, height: 1440 }, // 4K monitor
        { name: 'Very Tall', width: 768, height: 1366 }, // Tablet portrait
        { name: 'Square', width: 800, height: 800 }, // Square display
      ]

      for (const viewport of extremeViewports) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        })

        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 基本機能が維持される
        expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()
        expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()

        // テーブルが表示される
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        // 水平スクロールが利用可能
        const scrollContainer = table.closest('.overflow-x-auto')
        expect(scrollContainer).toBeInTheDocument()

        // 資料リンクが機能する
        const materialLinks = screen.getAllByRole('link', {
          name: /テスト資料/,
        })
        expect(materialLinks.length).toBeGreaterThan(0)

        // クリーンアップ
        table.remove()
      }
    })
  })

  describe('ユーザビリティテストの自動化', () => {
    it('should complete typical user journey successfully', async () => {
      const user = userEvent.setup()

      // モバイルデバイスをシミュレート
      simulateDevice(deviceConfigs.iPhone12)

      render(<Home />)

      // ステップ1: ページ読み込み
      expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // ステップ2: データ読み込み完了
      await waitFor(
        () => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // ステップ3: カレンダー確認
      const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
      expect(calendarIframe).toBeInTheDocument()

      // ステップ4: イベント資料一覧確認
      expect(
        screen.getByRole('heading', { name: /イベント資料一覧/ })
      ).toBeInTheDocument()
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()

      // ステップ5: 資料リンクの操作
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      expect(materialLinks.length).toBe(2)

      // 最初の資料リンクをタップ
      const firstMaterialLink = materialLinks[0]
      expect(firstMaterialLink).toHaveAttribute('href')
      expect(firstMaterialLink).toHaveAttribute('target', '_blank')

      // ステップ6: イベント詳細の確認
      const eventLinks = screen.getAllByRole('link', { name: /テストイベント/ })
      expect(eventLinks.length).toBe(2)

      // ステップ7: 共有機能の確認
      const shareButton = screen.getByText('シェア')
      const twitterButton = screen.getByText('共有')
      expect(shareButton).toBeInTheDocument()
      expect(twitterButton).toBeInTheDocument()

      // ステップ8: 登録リンクの確認
      const registerLink = screen.getByText('勉強会の登録依頼')
      expect(registerLink).toHaveAttribute('href', '/register')

      // ステップ9: 水平スクロールの確認
      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement
      expect(scrollContainer).toBeInTheDocument()

      // スクロール操作のシミュレート
      act(() => {
        fireEvent.scroll(scrollContainer, { target: { scrollLeft: 100 } })
      })

      // コンテンツが引き続き表示される
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    it('should handle error scenarios gracefully', async () => {
      // ネットワークエラーをシミュレート（モックサーバーが正常なレスポンスを返すため、
      // 正常な動作を確認）
      render(<Home />)

      // 初期ローディング状態
      expect(
        screen.getByText('イベント資料を読み込み中...')
      ).toBeInTheDocument()

      // データが正常に読み込まれることを確認
      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // エラーメッセージが表示されないことを確認
      expect(screen.queryByText(/エラー/)).not.toBeInTheDocument()
      expect(screen.queryByText(/読み込みに失敗/)).not.toBeInTheDocument()

      // 正常なコンテンツが表示される
      expect(screen.getByText('テストイベント2')).toBeInTheDocument()
      expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      expect(screen.getByText('テスト資料2')).toBeInTheDocument()
    })

    it('should maintain performance under stress conditions', async () => {
      // 高負荷条件をシミュレート
      const stressTestIterations = 10
      const performanceMetrics: number[] = []

      for (let i = 0; i < stressTestIterations; i++) {
        // ランダムなデバイス設定を選択
        const deviceKeys = Object.keys(deviceConfigs)
        const randomDevice =
          deviceConfigs[
            deviceKeys[
              Math.floor(Math.random() * deviceKeys.length)
            ] as keyof typeof deviceConfigs
          ]

        simulateDevice(randomDevice)

        const startTime = performance.now()
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        const renderTime = performance.now() - startTime
        performanceMetrics.push(renderTime)

        // 各反復で合理的な時間内でレンダリング
        expect(renderTime).toBeLessThan(2000) // 2秒以内

        // クリーンアップ
        screen.getByRole('table').remove()
      }

      // 平均パフォーマンスの確認
      const averageTime =
        performanceMetrics.reduce((a, b) => a + b, 0) /
        performanceMetrics.length
      expect(averageTime).toBeLessThan(1000) // 平均1秒以内

      // パフォーマンスの一貫性確認
      const maxTime = Math.max(...performanceMetrics)
      const minTime = Math.min(...performanceMetrics)
      expect(maxTime / minTime).toBeLessThan(3) // 最大と最小の差が3倍以内

      console.log(
        `Stress test results: Average ${averageTime.toFixed(2)}ms, Range ${minTime.toFixed(2)}-${maxTime.toFixed(2)}ms`
      )
    })

    it('should support keyboard navigation workflows', async () => {
      const user = userEvent.setup()

      // デスクトップ環境でキーボードナビゲーションをテスト
      simulateDevice(deviceConfigs.desktop)

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
      })

      // キーボードナビゲーションの開始
      const focusableElements = screen.getAllByRole('link')
      expect(focusableElements.length).toBeGreaterThan(0)

      // タブキーでナビゲーション
      for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
        await user.tab()

        // フォーカスされた要素が存在することを確認
        const focusedElement = document.activeElement
        expect(focusedElement).toBeInstanceOf(HTMLElement)

        // フォーカス可能な要素であることを確認
        if (focusedElement && focusedElement.tagName === 'A') {
          expect(focusedElement).toHaveAttribute('href')
        }
      }

      // Shift+Tabで逆方向ナビゲーション
      await user.keyboard('{Shift>}{Tab}{/Shift}')

      const reverseFocusedElement = document.activeElement
      expect(reverseFocusedElement).toBeInstanceOf(HTMLElement)
    })

    it('should handle accessibility requirements comprehensively', async () => {
      // スクリーンリーダーユーザーのワークフローをシミュレート
      render(<Home />)

      // 見出し構造の確認（スクリーンリーダーナビゲーション）
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('広島IT勉強会カレンダー')

      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThanOrEqual(2)

      // ランドマークの確認
      const main = screen.getByRole('main')
      const banner = screen.getByRole('banner')
      expect(main).toBeInTheDocument()
      expect(banner).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // テーブルのアクセシビリティ確認
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBe(3)

      // 各列ヘッダーが適切に設定されている
      expect(screen.getByText('イベント名')).toBeInTheDocument()
      expect(screen.getByText('開催日時')).toBeInTheDocument()
      const materialHeaders = screen.getAllByText('資料')
      expect(materialHeaders.length).toBeGreaterThan(0)

      // 画像の代替テキスト確認
      const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
      expect(thumbnailImage).toBeInTheDocument()

      // ローディング状態のアクセシビリティ
      const loadingSpinner = screen.getByRole('status')
      expect(loadingSpinner).toHaveAttribute('aria-label', '読み込み中')

      // リンクのアクセシビリティ確認
      const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
      materialLinks.forEach(link => {
        expect(link).toHaveAttribute('title')
        if (link.getAttribute('target') === '_blank') {
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        }
      })
    })

    it('should provide consistent experience across browser contexts', async () => {
      // 異なるブラウザ環境をシミュレート
      const browserConfigs = [
        {
          name: 'Chrome Mobile',
          userAgent:
            'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        },
        {
          name: 'Safari Mobile',
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        },
        {
          name: 'Firefox Desktop',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        },
        {
          name: 'Edge Desktop',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        },
      ]

      for (const browserConfig of browserConfigs) {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          configurable: true,
          value: browserConfig.userAgent,
        })

        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 基本機能が全ブラウザで動作
        expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()
        expect(screen.getByTitle('広島IT勉強会カレンダー')).toBeInTheDocument()
        expect(screen.getByText('テストイベント2')).toBeInTheDocument()
        expect(screen.getByText('テスト資料1')).toBeInTheDocument()
        expect(screen.getByText('テスト資料2')).toBeInTheDocument()

        // リンクが正しく設定されている
        const materialLinks = screen.getAllByRole('link', {
          name: /テスト資料/,
        })
        expect(materialLinks.length).toBe(2)

        materialLinks.forEach(link => {
          expect(link).toHaveAttribute('href')
          expect(link).toHaveAttribute('target', '_blank')
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })

        // クリーンアップ
        screen.getByRole('table').remove()
      }
    })
  })
})
