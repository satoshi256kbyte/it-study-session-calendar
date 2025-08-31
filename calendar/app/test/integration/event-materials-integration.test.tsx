import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import EventMaterialsList from '../../components/EventMaterialsList'

/**
 * 統合テスト: EventMaterialsList コンポーネント
 * 要件1.1, 5.1, 5.2, 5.3に対応
 *
 * - API統合テスト
 * - 基本的な表示機能テスト
 * - 非同期データ読み込みテスト
 */
describe('EventMaterialsList Integration', () => {
  it('should successfully fetch and display event materials', async () => {
    render(<EventMaterialsList />)

    // 初期ローディング状態
    expect(screen.getByText('イベント資料を読み込み中...')).toBeInTheDocument()

    // データが読み込まれるまで待機（グローバルモックデータを使用）
    await waitFor(() => {
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    // イベント資料の表示確認
    expect(screen.getByText('テスト資料1')).toBeInTheDocument()
    expect(screen.getByText('テストイベント2')).toBeInTheDocument()
    expect(screen.getByText('テスト資料2')).toBeInTheDocument()
    expect(
      screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
    ).toBeInTheDocument()
  })

  it('should display component structure correctly', async () => {
    render(<EventMaterialsList />)

    // 初期ローディング状態
    expect(screen.getByText('イベント資料を読み込み中...')).toBeInTheDocument()

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    // データ読み込み後の構造確認
    expect(
      screen.getByRole('heading', { name: /イベント資料一覧/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
    ).toBeInTheDocument()

    // テーブル構造の確認
    expect(screen.getByText('イベント名')).toBeInTheDocument()
    expect(screen.getByText('開催日時')).toBeInTheDocument()

    // テーブルヘッダーの「資料」を確認
    const tableHeaders = screen.getAllByRole('columnheader')
    const materialHeader = tableHeaders.find(
      header => header.textContent === '資料'
    )
    expect(materialHeader).toBeInTheDocument()
  })

  it('should display event materials with proper formatting', async () => {
    render(<EventMaterialsList />)

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    // 日付フォーマットの確認
    expect(screen.getByText('2024/01/15')).toBeInTheDocument()
    expect(screen.getByText('2024/01/20')).toBeInTheDocument()

    // 資料リンクの確認
    const materialLinks = screen.getAllByRole('link', { name: /テスト資料/ })
    expect(materialLinks.length).toBeGreaterThan(0)

    // 外部リンクの属性確認
    materialLinks.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('should display last updated timestamp when data is loaded', async () => {
    render(<EventMaterialsList />)

    await waitFor(() => {
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    // 最終更新時刻の表示確認
    expect(screen.getByText(/最終更新/)).toBeInTheDocument()
  })

  it('should handle async loading without blocking', async () => {
    render(<EventMaterialsList />)

    // 初期状態でローディングが表示される
    expect(screen.getByText('イベント資料を読み込み中...')).toBeInTheDocument()

    // データが非同期で読み込まれる
    await waitFor(() => {
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    // データ読み込み後にヘッダーが表示される
    expect(
      screen.getByRole('heading', { name: /イベント資料一覧/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
    ).toBeInTheDocument()
  })
})
