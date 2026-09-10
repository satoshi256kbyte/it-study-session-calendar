import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import Home from '../../page'

/**
 * 統合テスト: メインページ（オリジナルカレンダー + イベント資料一覧）
 * 要件 1.1, 1.2, 1.3, 5.1 に対応
 *
 * - ページ全体での動作確認
 * - Google カレンダー iframe が存在しないこと（オリジナルカレンダーへ置換済み）
 * - MonthCalendar とイベント資料一覧セクションの共存確認
 */
describe('Home Page Integration', () => {
  beforeEach(() => {
    // 旧実装の環境変数。設定されていても iframe が生成されないことを検証するため残す
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL =
      'https://calendar.google.com/calendar/embed?src=test'
  })

  it('should render the original month calendar and event materials list sections', async () => {
    render(<Home />)

    // ヘッダー（ページタイトル h1）の確認
    expect(screen.getByText('広島IT勉強会カレンダー')).toBeInTheDocument()

    // カレンダーカードの説明文（新 DOM）
    expect(
      screen.getByText(
        'connpassの検索で「広島」でHITしたイベントを掲載しています。'
      )
    ).toBeInTheDocument()

    // MonthCalendar が描画されている（全表示状態で共通の月移動ヘッダー）
    expect(screen.getByRole('button', { name: '前の月へ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '次の月へ' })).toBeInTheDocument()
    // 年月ラベル（month-calendar-label）の h2 が存在する
    expect(
      document.querySelector('h2.month-calendar-label')
    ).toBeInTheDocument()

    // イベント資料一覧セクションの確認
    expect(
      screen.getByRole('heading', { name: /イベント資料一覧/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText('過去6ヶ月分のconnpassイベントの発表資料')
    ).toBeInTheDocument()
  })

  it('should not embed any Google Calendar iframe', () => {
    render(<Home />)

    // 旧 Google カレンダー iframe（title / calendar.google.com src）が存在しないこと
    expect(
      screen.queryByTitle('広島IT勉強会カレンダー')
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('iframe[src*="calendar.google.com"]')
    ).toBeNull()

    // NEXT_PUBLIC_GOOGLE_CALENDAR_URL を src に持つ iframe が 0 個であること
    const calendarUrl = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_URL as string
    const iframes = Array.from(document.querySelectorAll('iframe'))
    const calendarIframes = iframes.filter(iframe => {
      const src = iframe.getAttribute('src') ?? ''
      return src.includes('calendar.google.com') || src === calendarUrl
    })
    expect(calendarIframes).toHaveLength(0)
  })

  it('should keep the calendar and event materials list coexisting in the same render', async () => {
    render(<Home />)

    // オリジナルカレンダー（月移動ヘッダー）が存在する
    expect(screen.getByRole('button', { name: '前の月へ' })).toBeInTheDocument()

    // イベント資料一覧セクションが同時に存在する
    expect(
      screen.getByRole('heading', { name: /イベント資料一覧/ })
    ).toBeInTheDocument()

    // イベント資料一覧は非同期で読み込まれ、カレンダー表示をブロックしない
    await waitFor(
      () => {
        expect(screen.getByText('テストイベント1')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    expect(screen.getByText('テストイベント2')).toBeInTheDocument()
    expect(screen.getByText('テスト資料1')).toBeInTheDocument()
    expect(screen.getByText('テスト資料2')).toBeInTheDocument()

    // 資料読み込み後もカレンダーは引き続き表示されている
    expect(screen.getByRole('button', { name: '前の月へ' })).toBeInTheDocument()
  })

  it('should handle navigation functionality', async () => {
    render(<Home />)

    // 勉強会登録リンクの確認（デスクトップ/モバイルで複数存在するため /register の
    // href を持つリンクが 1 つ以上あることを検証する）
    const registerLinks = screen
      .getAllByRole('link')
      .filter(link => link.getAttribute('href') === '/register')
    expect(registerLinks.length).toBeGreaterThan(0)

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

  it('should maintain accessibility standards', () => {
    render(<Home />)

    // 見出し構造の確認（h1 はページタイトルのみ）
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('広島IT勉強会カレンダー')

    // 新 DOM の h2: カレンダーの年月ラベルとイベント資料一覧が少なくとも存在する
    const h2Elements = screen.getAllByRole('heading', { level: 2 })
    expect(h2Elements.length).toBeGreaterThanOrEqual(2)
    expect(
      h2Elements.some(h2 => h2.classList.contains('month-calendar-label'))
    ).toBe(true)
    expect(
      h2Elements.some(h2 => /イベント資料一覧/.test(h2.textContent ?? ''))
    ).toBe(true)

    // ボタンのアクセシビリティ確認（月移動ボタンを含む）
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
