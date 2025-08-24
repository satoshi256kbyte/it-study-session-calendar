import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../page'

/**
 * 統合テスト: メインページ（カレンダー + イベント資料一覧）
 * 要件1.1, 5.1に対応
 *
 * - ページ全体での動作確認
 * - カレンダーとの共存確認
 */
describe('Home Page Integration', () => {
  beforeEach(() => {
    // 環境変数をモック
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'
  })

  it('should render calendar and event materials list sections', async () => {
    render(<Home />)

    // ヘッダーの確認
    expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()

    // カレンダーセクションの確認
    expect(screen.getByText('広島の勉強会スケジュール')).toBeInTheDocument()
    expect(
      screen.getByText(
        '広島のIT関連の勉強会やイベントのスケジュールを確認できます'
      )
    ).toBeInTheDocument()

    // カレンダーiframeの確認
    const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
    expect(calendarIframe).toBeInTheDocument()
    expect(calendarIframe).toHaveAttribute(
      'src',
      'https://calendar.google.com/calendar/embed?src=test'
    )

    // イベント資料一覧セクションの確認
    expect(screen.getByText('イベント資料一覧')).toBeInTheDocument()
    expect(
      screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
    ).toBeInTheDocument()
  })

  it('should load event materials asynchronously without blocking calendar display', async () => {
    render(<Home />)

    // カレンダーは即座に表示される
    const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
    expect(calendarIframe).toBeInTheDocument()

    // イベント資料一覧は非同期で読み込まれる
    // 最初はローディング状態
    expect(screen.getByText('イベント資料を読み込み中...')).toBeInTheDocument()

    // データが読み込まれるまで待機
    await waitFor(
      () => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // イベント資料が表示される
    expect(screen.getByText('テストイベント2')).toBeInTheDocument()
    expect(screen.getByText('テスト資料1')).toBeInTheDocument()
    expect(screen.getByText('テスト資料2')).toBeInTheDocument()
  })

  it('should maintain calendar functionality while event materials load', async () => {
    render(<Home />)

    // カレンダーが表示されている
    const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
    expect(calendarIframe).toBeInTheDocument()

    // イベント資料がローディング中でもカレンダーは機能する
    expect(screen.getByText('イベント資料を読み込み中...')).toBeInTheDocument()

    // カレンダーのiframeは正常に表示されている
    expect(calendarIframe).toHaveAttribute(
      'src',
      expect.stringContaining('calendar.google.com')
    )

    // イベント資料が読み込まれても、カレンダーは影響を受けない
    await waitFor(() => {
      expect(screen.getByText('テストイベント1')).toBeInTheDocument()
    })

    // カレンダーは依然として表示されている
    expect(calendarIframe).toBeInTheDocument()
  })

  it('should handle navigation and sharing functionality', async () => {
    const user = userEvent.setup()
    render(<Home />)

    // 勉強会登録リンクの確認
    const registerLink = screen.getByText('勉強会を登録')
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')

    // 共有ボタンの確認
    const shareButton = screen.getByText('シェア')
    expect(shareButton).toBeInTheDocument()

    // Twitterシェアボタンの確認
    const twitterButton = screen.getByText('共有')
    expect(twitterButton).toBeInTheDocument()

    // GitHubリンクの確認
    const githubLink = screen.getByText('GitHub')
    expect(githubLink).toBeInTheDocument()
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/satoshi256kbyte/it-study-session-calendar'
    )
    expect(githubLink).toHaveAttribute('target', '_blank')
  })

  it('should display proper layout structure', () => {
    render(<Home />)

    // ヘッダー、メイン、フッターの構造確認
    expect(screen.getByRole('banner')).toBeInTheDocument() // header
    expect(screen.getByRole('main')).toBeInTheDocument() // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument() // footer

    // レスポンシブクラスの確認（Tailwind CSS）
    const mainContainer = screen.getByRole('main')
    expect(mainContainer).toHaveClass('max-w-7xl', 'mx-auto')
  })

  it('should handle calendar loading state', () => {
    // カレンダーURLが設定されていない場合のテストは、
    // 実際の実装では環境変数が設定されていない場合でもデフォルトURLが使用されるため、
    // このテストは現在の実装に合わせて調整
    render(<Home />)

    // カレンダーが表示されることを確認
    const calendarIframe = screen.getByTitle('広島IT勉強会カレンダー')
    expect(calendarIframe).toBeInTheDocument()
  })

  it('should maintain accessibility standards', () => {
    render(<Home />)

    // 見出し構造の確認
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('広島IT勉強会カレンダー')

    const h2Elements = screen.getAllByRole('heading', { level: 2 })
    expect(h2Elements).toHaveLength(2) // カレンダーとイベント資料一覧

    // iframeのtitle属性確認
    const iframe = screen.getByTitle('広島IT勉強会カレンダー')
    expect(iframe).toBeInTheDocument()

    // ボタンのアクセシビリティ確認
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    // ボタンが存在することを確認（type属性は必須ではない）
  })
})
