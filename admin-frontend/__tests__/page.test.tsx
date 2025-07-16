import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useAuth } from '../src/contexts/AuthContext'
import AdminHome from '../app/page'

// Mock the AuthContext
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('AdminHome', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.location.search
    window.location.search = ''
  })

  const mockAuthenticatedState = {
    user: { username: 'testuser', email: 'test@example.com' },
    loading: false,
    signOut: jest.fn(),
    signInWithHostedUI: jest.fn(),
    isAuthenticated: true,
    error: null,
  }

  const mockUnauthenticatedState = {
    user: null,
    loading: false,
    signOut: jest.fn(),
    signInWithHostedUI: jest.fn(),
    isAuthenticated: false,
    error: null,
  }

  const mockStudySessions = [
    {
      id: '1',
      title: '承認待ち勉強会1',
      url: 'https://example.com/1',
      datetime: '2024-01-15T19:00:00.000Z',
      endDatetime: '2024-01-15T21:00:00.000Z',
      contact: 'test1@example.com',
      status: 'pending' as const,
      createdAt: new Date().toISOString(), // 新しい勉強会（24時間以内）
    },
    {
      id: '2',
      title: '承認待ち勉強会2',
      url: 'https://example.com/2',
      datetime: '2024-01-16T19:00:00.000Z',
      status: 'pending' as const,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25時間前（24時間超過）
    },
    {
      id: '3',
      title: '承認済み勉強会',
      url: 'https://example.com/3',
      datetime: '2024-01-17T19:00:00.000Z',
      status: 'approved' as const,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2日前
    },
    {
      id: '4',
      title: '却下された勉強会',
      url: 'https://example.com/4',
      datetime: '2024-01-18T19:00:00.000Z',
      status: 'rejected' as const,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日前
    },
  ]

  describe('承認待ち件数表示のテスト', () => {
    it('承認待ち件数が正しく表示される', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 承認待ち件数バッジが表示されることを確認
        expect(screen.getByText('承認待ち 2 件')).toBeInTheDocument()
      })
    })

    it('承認待ち件数が0の場合はバッジが表示されない', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      const sessionsWithoutPending = mockStudySessions.filter(
        session => session.status !== 'pending'
      )
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: sessionsWithoutPending }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 承認待ち件数バッジが表示されないことを確認
        expect(screen.queryByText(/承認待ち.*件/)).not.toBeInTheDocument()
      })
    })

    it('データ取得エラー時でも承認待ち件数が0として扱われる', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      // console.errorをモック
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      // window.alertをモック
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation()

      render(<AdminHome />)

      await waitFor(() => {
        // エラー時は承認待ち件数バッジが表示されないことを確認
        expect(screen.queryByText(/承認待ち.*件/)).not.toBeInTheDocument()
      })

      consoleSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })

  describe('視覚的強調表示のテスト', () => {
    it('承認待ちの勉強会が黄色背景で強調表示される', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 承認待ちの勉強会項目を取得
        const pendingSession1 = screen
          .getByText('承認待ち勉強会1')
          .closest('li')
        const pendingSession2 = screen
          .getByText('承認待ち勉強会2')
          .closest('li')
        const approvedSession = screen.getByText('承認済み勉強会').closest('li')

        // 承認待ちの項目が黄色背景クラスを持つことを確認
        expect(pendingSession1).toHaveClass(
          'bg-yellow-50',
          'border-l-4',
          'border-yellow-400'
        )
        expect(pendingSession2).toHaveClass(
          'bg-yellow-50',
          'border-l-4',
          'border-yellow-400'
        )

        // 承認済みの項目は黄色背景クラスを持たないことを確認
        expect(approvedSession).not.toHaveClass('bg-yellow-50')
        expect(approvedSession).not.toHaveClass('border-yellow-400')
      })
    })

    it('承認待ち以外の勉強会は通常の背景で表示される', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        const approvedSession = screen.getByText('承認済み勉強会').closest('li')
        const rejectedSession = screen
          .getByText('却下された勉強会')
          .closest('li')

        // 承認済み・却下された項目は通常の背景クラスを持つことを確認
        expect(approvedSession).toHaveClass('hover:bg-gray-50')
        expect(rejectedSession).toHaveClass('hover:bg-gray-50')

        // 黄色背景クラスを持たないことを確認
        expect(approvedSession).not.toHaveClass('bg-yellow-50')
        expect(rejectedSession).not.toHaveClass('bg-yellow-50')
      })
    })
  })

  describe('NEWバッジ表示のテスト', () => {
    it('24時間以内に作成された勉強会にNEWバッジが表示される', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 24時間以内の勉強会（承認待ち勉強会1）にNEWバッジがあることを確認
        const newSession = screen.getByText('承認待ち勉強会1').closest('li')
        expect(newSession).toBeInTheDocument()

        // NEWバッジのテキストを確認
        const newBadges = screen.getAllByText('NEW')
        expect(newBadges).toHaveLength(1)

        // NEWバッジが正しいクラスを持つことを確認
        const newBadge = newBadges[0]
        expect(newBadge).toHaveClass('bg-blue-100', 'text-blue-800')
      })
    })

    it('24時間を超えて作成された勉強会にはNEWバッジが表示されない', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 25時間前の勉強会（承認待ち勉強会2）の要素を取得
        const oldSession = screen.getByText('承認待ち勉強会2').closest('li')
        expect(oldSession).toBeInTheDocument()

        // この要素内にNEWバッジがないことを確認
        const newBadgeInOldSession = oldSession?.querySelector(
          '[class*="bg-blue-100"]'
        )
        expect(newBadgeInOldSession).toBeNull()
      })
    })

    it('NEWバッジが適切なアイコンとスタイルで表示される', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        const newBadge = screen.getByText('NEW')

        // NEWバッジのスタイルクラスを確認
        expect(newBadge).toHaveClass(
          'inline-flex',
          'items-center',
          'px-2',
          'py-1',
          'rounded-full',
          'text-xs',
          'font-medium',
          'bg-blue-100',
          'text-blue-800',
          'border',
          'border-blue-200'
        )

        // SVGアイコンが含まれていることを確認
        const svgIcon = newBadge.querySelector('svg')
        expect(svgIcon).toBeInTheDocument()
        expect(svgIcon).toHaveClass('w-3', 'h-3', 'mr-1')
      })
    })
  })

  describe('統合テスト', () => {
    it('承認待ち件数、視覚的強調表示、NEWバッジが同時に正しく動作する', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockStudySessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 承認待ち件数バッジの確認
        expect(screen.getByText('承認待ち 2 件')).toBeInTheDocument()

        // 承認待ち勉強会1の確認（新しい + 承認待ち）
        const pendingNewSession = screen
          .getByText('承認待ち勉強会1')
          .closest('li')
        expect(pendingNewSession).toHaveClass(
          'bg-yellow-50',
          'border-yellow-400'
        ) // 視覚的強調
        expect(screen.getByText('NEW')).toBeInTheDocument() // NEWバッジ

        // 承認待ち勉強会2の確認（古い + 承認待ち）
        const pendingOldSession = screen
          .getByText('承認待ち勉強会2')
          .closest('li')
        expect(pendingOldSession).toHaveClass(
          'bg-yellow-50',
          'border-yellow-400'
        ) // 視覚的強調
        // NEWバッジは1つだけ（承認待ち勉強会1のみ）
        expect(screen.getAllByText('NEW')).toHaveLength(1)

        // 承認済み勉強会の確認（通常表示）
        const approvedSession = screen.getByText('承認済み勉強会').closest('li')
        expect(approvedSession).not.toHaveClass('bg-yellow-50')
      })
    })

    it('データが空の場合の表示確認', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: [] }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 承認待ち件数バッジが表示されないことを確認
        expect(screen.queryByText(/承認待ち.*件/)).not.toBeInTheDocument()

        // 空状態のメッセージが表示されることを確認
        expect(
          screen.getByText('登録された勉強会はありません')
        ).toBeInTheDocument()

        // NEWバッジが表示されないことを確認
        expect(screen.queryByText('NEW')).not.toBeInTheDocument()
      })
    })
  })

  describe('認証状態のテスト', () => {
    it('未認証時はログインフォームが表示される', () => {
      mockUseAuth.mockReturnValue(mockUnauthenticatedState)

      render(<AdminHome />)

      expect(screen.getByText('管理画面にログイン')).toBeInTheDocument()
      expect(screen.getByText('ログイン')).toBeInTheDocument()
      expect(screen.queryByText('承認待ち')).not.toBeInTheDocument()
    })

    it('認証中はローディング画面が表示される', () => {
      mockUseAuth.mockReturnValue({
        ...mockUnauthenticatedState,
        loading: true,
      })

      render(<AdminHome />)

      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument()
      expect(screen.queryByText('承認待ち')).not.toBeInTheDocument()
    })
  })
})
