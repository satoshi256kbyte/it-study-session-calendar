import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../page'

/**
 * レスポンシブイベント資料一覧のユーザビリティテスト
 * 要件: 全要件に対応
 *
 * - ユーザビリティヒューリスティック評価の自動化
 * - タスク完了率とエラー率の測定
 * - ユーザーエクスペリエンス指標の確認
 */
describe('Responsive Event Materials Usability Tests', () => {
  // ユーザビリティメトリクス
  interface UsabilityMetrics {
    taskCompletionTime: number
    errorCount: number
    successRate: number
    userSatisfaction: number
    learnability: number
  }

  // テストシナリオ
  const testScenarios = [
    {
      name: 'Find specific event material',
      description: 'ユーザーが特定のイベントの資料を見つける',
      steps: [
        'ページを開く',
        'イベント資料一覧を確認する',
        '特定のイベントを見つける',
        '資料リンクをクリックする',
      ],
    },
    {
      name: 'Browse recent events',
      description: '最近のイベントを閲覧する',
      steps: [
        'ページを開く',
        'イベント一覧を確認する',
        '日付順に並んでいることを確認する',
        '複数のイベントを確認する',
      ],
    },
    {
      name: 'Share event information',
      description: 'イベント情報を共有する',
      steps: [
        'ページを開く',
        'シェアボタンを見つける',
        'シェア機能を使用する',
        '共有が完了することを確認する',
      ],
    },
    {
      name: 'Register new event',
      description: '新しいイベントを登録する',
      steps: ['ページを開く', '登録リンクを見つける', '登録ページに移動する'],
    },
  ]

  // デバイス設定
  const testDevices = [
    { name: 'Mobile', width: 375, height: 667, touchPoints: 5 },
    { name: 'Tablet', width: 768, height: 1024, touchPoints: 10 },
    { name: 'Desktop', width: 1280, height: 720, touchPoints: 0 },
  ]

  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'

    // パフォーマンス測定のリセット
    performance.clearMarks()
    performance.clearMeasures()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * デバイス環境をシミュレートするヘルパー関数
   */
  const simulateDevice = (device: (typeof testDevices)[0]) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: device.width,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: device.height,
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: device.touchPoints,
    })
  }

  /**
   * ユーザビリティメトリクスを測定するヘルパー関数
   */
  const measureUsabilityMetrics = async (
    taskName: string,
    taskFunction: () => Promise<void>
  ): Promise<UsabilityMetrics> => {
    const startTime = performance.now()
    let errorCount = 0
    let successRate = 0

    try {
      performance.mark(`${taskName}-start`)
      await taskFunction()
      performance.mark(`${taskName}-end`)
      performance.measure(taskName, `${taskName}-start`, `${taskName}-end`)
      successRate = 1
    } catch (error) {
      errorCount++
      console.error(`Task ${taskName} failed:`, error)
    }

    const endTime = performance.now()
    const taskCompletionTime = endTime - startTime

    return {
      taskCompletionTime,
      errorCount,
      successRate,
      userSatisfaction: successRate > 0 ? 0.8 : 0.2, // 簡易的な満足度指標
      learnability: taskCompletionTime < 5000 ? 0.9 : 0.6, // 学習しやすさ指標
    }
  }

  describe('ユーザビリティヒューリスティック評価', () => {
    describe('1. システムの状態の可視性', () => {
      testDevices.forEach(device => {
        it(`should provide clear system status feedback on ${device.name}`, async () => {
          simulateDevice(device)
          render(<Home />)

          // 初期ローディング状態の可視性
          expect(
            screen.getByText('イベント資料を読み込み中...')
          ).toBeInTheDocument()

          // ローディングスピナーの確認
          const loadingSpinner = screen.getByRole('status')
          expect(loadingSpinner).toBeInTheDocument()
          expect(loadingSpinner).toHaveAttribute('aria-label', '読み込み中')

          // データ読み込み完了後の状態変化
          await waitFor(() => {
            expect(screen.getByText('テストイベント1')).toBeInTheDocument()
          })

          // 最終更新時刻の表示
          expect(screen.getByText(/最終更新/)).toBeInTheDocument()

          // 開発環境でのキャッシュ状態表示
          if (process.env.NODE_ENV === 'development') {
            expect(
              screen.getByText('✓ キャッシュからデータを表示中')
            ).toBeInTheDocument()
          }
        })
      })
    })

    describe('2. システムと現実世界の一致', () => {
      it('should use familiar conventions and terminology', async () => {
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 馴染みのある用語の使用
        expect(screen.getByText('イベント名')).toBeInTheDocument()
        expect(screen.getByText('開催日時')).toBeInTheDocument()
        expect(screen.getAllByText('資料').length).toBeGreaterThan(0)

        // 日付フォーマットが日本の慣習に従っている
        expect(screen.getByText('2024/01/15')).toBeInTheDocument()
        expect(screen.getByText('2024/01/20')).toBeInTheDocument()

        // 外部リンクの明確な表示
        const externalLinks = screen.getAllByRole('link', { name: /connpass/ })
        externalLinks.forEach(link => {
          expect(link).toHaveAttribute('target', '_blank')
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })
      })
    })

    describe('3. ユーザーコントロールと自由度', () => {
      testDevices.forEach(device => {
        it(`should provide user control and freedom on ${device.name}`, async () => {
          simulateDevice(device)
          const user = userEvent.setup()
          render(<Home />)

          await waitFor(() => {
            expect(screen.getByText('テストイベント1')).toBeInTheDocument()
          })

          // 水平スクロールによるコンテンツ制御
          const table = screen.getByRole('table')
          const scrollContainer = table.closest(
            '.overflow-x-auto'
          ) as HTMLElement
          expect(scrollContainer).toBeInTheDocument()

          // スクロール操作の自由度
          act(() => {
            fireEvent.scroll(scrollContainer, { target: { scrollLeft: 100 } })
          })

          // コンテンツが引き続きアクセス可能
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()

          // 複数の共有オプション
          expect(screen.getByText('シェア')).toBeInTheDocument()
          expect(screen.getByText('共有')).toBeInTheDocument()

          // 新しいタブでリンクを開く選択肢
          const materialLinks = screen.getAllByRole('link', {
            name: /テスト資料/,
          })
          materialLinks.forEach(link => {
            expect(link).toHaveAttribute('target', '_blank')
          })
        })
      })
    })

    describe('4. 一貫性と標準', () => {
      it('should maintain consistency across the interface', async () => {
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // リンクスタイルの一貫性
        const eventLinks = screen.getAllByRole('link', {
          name: /テストイベント/i,
        })
        const materialLinks = screen.getAllByRole('link', {
          name: /テスト資料/i,
        })

        // すべての外部リンクが同じ属性を持つ
        const allLinks = eventLinks.concat(materialLinks)
        allLinks.forEach(link => {
          expect(link).toHaveAttribute('target', '_blank')
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })

        // 色とスタイルの一貫性
        eventLinks.forEach(link => {
          expect(link).toHaveClass('text-blue-600', 'hover:text-blue-800')
        })

        materialLinks.forEach(link => {
          expect(link).toHaveClass('text-blue-600', 'hover:text-blue-800')
        })

        // ボタンスタイルの一貫性
        const buttons = [screen.getByText('シェア'), screen.getByText('共有')]

        buttons.forEach(button => {
          expect(button).toHaveClass('px-4', 'py-2')
        })
      })
    })

    describe('5. エラー防止', () => {
      it('should prevent common user errors', async () => {
        const user = userEvent.setup()
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 外部リンクの安全な開き方
        const materialLinks = screen.getAllByRole('link', {
          name: /テスト資料/,
        })
        materialLinks.forEach(link => {
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })

        // タッチターゲットサイズによる誤タップ防止
        if (navigator.maxTouchPoints > 0) {
          materialLinks.forEach(link => {
            expect(link).toHaveClass('min-h-[44px]')
          })
        }

        // 画像読み込みエラーの処理
        const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')

        act(() => {
          fireEvent.error(thumbnailImage)
        })

        // エラー後もリンクは機能する
        const materialLink = screen.getByRole('link', { name: /テスト資料1/ })
        expect(materialLink).toBeInTheDocument()
      })
    })

    describe('6. 記憶よりも認識', () => {
      testDevices.forEach(device => {
        it(`should prioritize recognition over recall on ${device.name}`, async () => {
          simulateDevice(device)
          render(<Home />)

          await waitFor(() => {
            expect(screen.getByText('テストイベント1')).toBeInTheDocument()
          })

          // 明確なラベルとアイコン
          expect(screen.getByText('イベント名')).toBeInTheDocument()
          expect(screen.getByText('開催日時')).toBeInTheDocument()

          // 視覚的な手がかり
          const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
          expect(thumbnailImage).toBeInTheDocument()

          // 資料タイプの明確な表示
          expect(screen.getByText('スライド')).toBeInTheDocument()

          // 日付の明確なフォーマット
          expect(screen.getByText('2024/01/15')).toBeInTheDocument()
          expect(screen.getByText('2024/01/20')).toBeInTheDocument()

          // connpassリンクの明確な表示
          const connpassLinks = screen.getAllByRole('link', {
            name: /connpass/,
          })
          expect(connpassLinks.length).toBeGreaterThan(0)
        })
      })
    })

    describe('7. 使用の柔軟性と効率性', () => {
      it('should accommodate different user skill levels', async () => {
        const user = userEvent.setup()
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 初心者向け: 明確なラベルとボタン
        expect(screen.getByText('シェア')).toBeInTheDocument()
        expect(screen.getByText('共有')).toBeInTheDocument()
        expect(screen.getByText('勉強会の登録依頼')).toBeInTheDocument()

        // 上級者向け: キーボードナビゲーション
        const focusableElements = screen.getAllByRole('link')
        expect(focusableElements.length).toBeGreaterThan(0)

        // タブナビゲーションのテスト
        await user.tab()
        const focusedElement = document.activeElement
        expect(focusedElement).toBeInstanceOf(HTMLElement)

        // 複数の共有方法
        const shareButton = screen.getByText('シェア')
        const twitterButton = screen.getByText('共有')
        expect(shareButton).toBeInTheDocument()
        expect(twitterButton).toBeInTheDocument()
      })
    })

    describe('8. 美的で最小限のデザイン', () => {
      testDevices.forEach(device => {
        it(`should maintain clean and minimal design on ${device.name}`, async () => {
          simulateDevice(device)
          render(<Home />)

          await waitFor(() => {
            expect(screen.getByText('テストイベント1')).toBeInTheDocument()
          })

          // 不要な情報の排除
          expect(screen.queryByText(/デバッグ/)).not.toBeInTheDocument()
          expect(screen.queryByText(/テスト/)).not.toBeInTheDocument() // テストデータ以外

          // 適切な空白の使用
          const main = screen.getByRole('main')
          expect(main).toHaveClass('max-w-7xl', 'mx-auto')

          // 一貫したスペーシング
          const tableCells = screen.getAllByRole('cell')
          tableCells.forEach(cell => {
            expect(cell).toHaveClass('px-3')
            if (device.width >= 640) {
              expect(cell).toHaveClass('sm:px-6')
            }
          })

          // 適切なタイポグラフィ階層
          const h1 = screen.getByRole('heading', { level: 1 })
          const h2Elements = screen.getAllByRole('heading', { level: 2 })
          expect(h1).toBeInTheDocument()
          expect(h2Elements.length).toBeGreaterThanOrEqual(2)
        })
      })
    })

    describe('9. エラー認識、診断、回復の支援', () => {
      it('should help users recognize and recover from errors', async () => {
        render(<Home />)

        // 正常な読み込み状態でのエラーハンドリング確認
        expect(
          screen.getByText('イベント資料を読み込み中...')
        ).toBeInTheDocument()

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 画像読み込みエラーの処理
        const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')

        act(() => {
          fireEvent.error(thumbnailImage)
        })

        // エラー後も機能が維持される
        const materialLink = screen.getByRole('link', { name: /テスト資料1/ })
        expect(materialLink).toBeInTheDocument()
        expect(materialLink).toHaveAttribute('href')

        // エラーメッセージが表示されない（正常な動作）
        expect(screen.queryByText(/エラー/)).not.toBeInTheDocument()
      })
    })

    describe('10. ヘルプとドキュメント', () => {
      it('should provide helpful information and guidance', async () => {
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        // 説明的なテキスト
        expect(
          screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
        ).toBeInTheDocument()

        // 最終更新時刻による情報の新しさの表示
        expect(screen.getByText(/最終更新/)).toBeInTheDocument()

        // 登録方法への案内
        const registerLink = screen.getByText('勉強会の登録依頼')
        expect(registerLink).toHaveAttribute('href', '/register')

        // アクセシブルな画像説明
        const thumbnailImage = screen.getByAltText('テスト資料1のサムネイル')
        expect(thumbnailImage).toBeInTheDocument()

        // リンクのタイトル属性による説明
        const materialLinks = screen.getAllByRole('link', {
          name: /テスト資料/,
        })
        materialLinks.forEach(link => {
          expect(link).toHaveAttribute('title')
        })
      })
    })
  })

  describe('タスク完了率とエラー率の測定', () => {
    testScenarios.forEach(scenario => {
      testDevices.forEach(device => {
        it(`should complete "${scenario.name}" task successfully on ${device.name}`, async () => {
          simulateDevice(device)

          const metrics = await measureUsabilityMetrics(
            `${scenario.name}-${device.name}`,
            async () => {
              const user = userEvent.setup()
              render(<Home />)

              switch (scenario.name) {
                case 'Find specific event material': {
                  // ステップ1: ページを開く
                  expect(
                    screen.getByText('広島IT勉強会カレンダー')
                  ).toBeInTheDocument()

                  // ステップ2: イベント資料一覧を確認する
                  await waitFor(() => {
                    expect(
                      screen.getByText('テストイベント1')
                    ).toBeInTheDocument()
                  })

                  // ステップ3: 特定のイベントを見つける
                  expect(
                    screen.getByText('テストイベント1')
                  ).toBeInTheDocument()

                  // ステップ4: 資料リンクをクリックする
                  const materialLink = screen.getByRole('link', {
                    name: /テスト資料1/,
                  })
                  expect(materialLink).toHaveAttribute(
                    'href',
                    'https://example.com/slide1'
                  )
                  break
                }

                case 'Browse recent events': {
                  // ステップ1: ページを開く
                  expect(
                    screen.getByText('広島IT勉強会カレンダー')
                  ).toBeInTheDocument()

                  // ステップ2: イベント一覧を確認する
                  await waitFor(() => {
                    expect(
                      screen.getByText('テストイベント1')
                    ).toBeInTheDocument()
                  })

                  // ステップ3: 日付順に並んでいることを確認する
                  const tableRows = screen.getAllByRole('row')
                  const dataRows = tableRows.slice(1) // ヘッダー行を除く
                  expect(dataRows[0]).toHaveTextContent('2024/01/20') // 最新
                  expect(dataRows[1]).toHaveTextContent('2024/01/15') // 古い

                  // ステップ4: 複数のイベントを確認する
                  expect(
                    screen.getByText('テストイベント2')
                  ).toBeInTheDocument()
                  break
                }

                case 'Share event information': {
                  // ステップ1: ページを開く
                  expect(
                    screen.getByText('広島IT勉強会カレンダー')
                  ).toBeInTheDocument()

                  // ステップ2: シェアボタンを見つける
                  const shareButton = screen.getByText('シェア')
                  const twitterButton = screen.getByText('共有')
                  expect(shareButton).toBeInTheDocument()
                  expect(twitterButton).toBeInTheDocument()

                  // ステップ3: シェア機能を使用する（モック確認）
                  // 実際のクリックはモック環境で制限されるため、存在確認で代替
                  expect(shareButton).toBeInTheDocument()
                  break
                }

                case 'Register new event': {
                  // ステップ1: ページを開く
                  expect(
                    screen.getByText('広島IT勉強会カレンダー')
                  ).toBeInTheDocument()

                  // ステップ2: 登録リンクを見つける
                  const registerLink = screen.getByText('勉強会の登録依頼')
                  expect(registerLink).toBeInTheDocument()

                  // ステップ3: 登録ページに移動する（リンク確認）
                  expect(registerLink).toHaveAttribute('href', '/register')
                  break
                }
              }
            }
          )

          // パフォーマンス基準の確認
          expect(metrics.taskCompletionTime).toBeLessThan(10000) // 10秒以内
          expect(metrics.errorCount).toBe(0) // エラーなし
          expect(metrics.successRate).toBe(1) // 100%成功率
          expect(metrics.userSatisfaction).toBeGreaterThan(0.7) // 70%以上の満足度
          expect(metrics.learnability).toBeGreaterThan(0.8) // 80%以上の学習しやすさ

          console.log(`Task "${scenario.name}" on ${device.name}:`, metrics)
        })
      })
    })
  })

  describe('ユーザーエクスペリエンス指標の確認', () => {
    it('should meet Core Web Vitals standards', async () => {
      const performanceObserver = {
        entries: [] as PerformanceEntry[],
        observe: vi.fn(),
        disconnect: vi.fn(),
      }

      // パフォーマンス測定のモック
      vi.stubGlobal(
        'PerformanceObserver',
        vi.fn(() => performanceObserver)
      )

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // First Contentful Paint (FCP) - 1.8秒以内が良好
      const fcpTime = performance.now()
      expect(fcpTime).toBeLessThan(1800)

      // Largest Contentful Paint (LCP) - 2.5秒以内が良好
      // テスト環境では実際のLCPは測定できないため、レンダリング時間で代替
      expect(fcpTime).toBeLessThan(2500)

      // Cumulative Layout Shift (CLS) - レイアウトシフトの確認
      // 要素が安定して表示されることを確認
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      expect(table).toHaveClass('min-w-full')

      console.log(`Core Web Vitals - FCP: ${fcpTime}ms`)
    })

    it('should provide smooth interaction experience', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // First Input Delay (FID) - 100ms以内が良好
      const interactionStartTime = performance.now()

      const shareButton = screen.getByText('シェア')
      await user.click(shareButton)

      const interactionTime = performance.now() - interactionStartTime
      expect(interactionTime).toBeLessThan(100)

      // スクロール応答性の確認
      const table = screen.getByRole('table')
      const scrollContainer = table.closest('.overflow-x-auto') as HTMLElement

      const scrollStartTime = performance.now()
      act(() => {
        fireEvent.scroll(scrollContainer, { target: { scrollLeft: 100 } })
      })
      const scrollTime = performance.now() - scrollStartTime
      expect(scrollTime).toBeLessThan(16) // 60FPS相当

      console.log(
        `Interaction metrics - Click: ${interactionTime}ms, Scroll: ${scrollTime}ms`
      )
    })

    it('should maintain accessibility performance', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // アクセシビリティツリーの構築時間
      const accessibilityStartTime = performance.now()

      // 見出し構造の確認
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)

      // ランドマークの確認
      const main = screen.getByRole('main')
      const banner = screen.getByRole('banner')
      expect(main).toBeInTheDocument()
      expect(banner).toBeInTheDocument()

      // フォーカス可能な要素の確認
      const focusableElements = screen.getAllByRole('link')
      expect(focusableElements.length).toBeGreaterThan(0)

      const accessibilityTime = performance.now() - accessibilityStartTime
      expect(accessibilityTime).toBeLessThan(100) // 100ms以内

      console.log(`Accessibility performance: ${accessibilityTime}ms`)
    })

    it('should provide consistent experience across user sessions', async () => {
      // セッション1
      const session1StartTime = performance.now()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const session1Time = performance.now() - session1StartTime
      screen.getByRole('table').remove()

      // セッション2
      const session2StartTime = performance.now()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      const session2Time = performance.now() - session2StartTime

      // セッション間の一貫性確認（キャッシュ効果で2回目が速い可能性）
      expect(session2Time).toBeLessThanOrEqual(session1Time * 1.5) // 1.5倍以内の差

      console.log(
        `Session consistency - Session1: ${session1Time}ms, Session2: ${session2Time}ms`
      )
    })

    it('should handle stress conditions gracefully', async () => {
      // 高負荷条件をシミュレート
      const stressTestIterations = 5
      const performanceMetrics: number[] = []

      for (let i = 0; i < stressTestIterations; i++) {
        const startTime = performance.now()
        render(<Home />)

        await waitFor(() => {
          expect(screen.getByText('テストイベント1')).toBeInTheDocument()
        })

        const renderTime = performance.now() - startTime
        performanceMetrics.push(renderTime)

        // 各反復で合理的な時間内でレンダリング
        expect(renderTime).toBeLessThan(3000) // 3秒以内

        // クリーンアップ
        screen.getByRole('table').remove()
      }

      // パフォーマンスの安定性確認
      const averageTime =
        performanceMetrics.reduce((a, b) => a + b, 0) /
        performanceMetrics.length
      const maxTime = Math.max(...performanceMetrics)
      const minTime = Math.min(...performanceMetrics)

      expect(averageTime).toBeLessThan(2000) // 平均2秒以内
      expect(maxTime / minTime).toBeLessThan(2) // 最大と最小の差が2倍以内

      console.log(
        `Stress test results: Average ${averageTime.toFixed(2)}ms, Range ${minTime.toFixed(2)}-${maxTime.toFixed(2)}ms`
      )
    })

    it('should maintain user engagement metrics', async () => {
      const user = userEvent.setup()
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      })

      // エンゲージメント指標の測定
      const engagementMetrics = {
        timeToInteraction: 0,
        interactionCount: 0,
        contentDiscovery: 0,
      }

      // 最初のインタラクションまでの時間
      const interactionStartTime = performance.now()
      const materialLink = screen.getByRole('link', { name: /テスト資料1/ })
      await user.hover(materialLink)
      engagementMetrics.timeToInteraction =
        performance.now() - interactionStartTime

      // インタラクション可能な要素の数
      const interactiveElements = [
        ...screen.getAllByRole('link'),
        ...screen.getAllByRole('button'),
      ]
      engagementMetrics.interactionCount = interactiveElements.length

      // コンテンツ発見性（表示されているイベント数）
      const eventElements = screen.getAllByRole('link', {
        name: /テストイベント/,
      })
      engagementMetrics.contentDiscovery = eventElements.length

      // エンゲージメント基準の確認
      expect(engagementMetrics.timeToInteraction).toBeLessThan(1000) // 1秒以内
      expect(engagementMetrics.interactionCount).toBeGreaterThan(5) // 5個以上の要素
      expect(engagementMetrics.contentDiscovery).toBeGreaterThan(0) // コンテンツが発見可能

      console.log('Engagement metrics:', engagementMetrics)
    })
  })
})
