import { render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '../src/contexts/AuthContext'
import AdminHome from '../app/page'

// Mock the AuthContext
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('管理画面機能の詳細テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.location.search
    window.location.search = ''
  })

  const mockAuthenticatedState = {
    user: { username: 'admin', email: 'admin@example.com' },
    loading: false,
    signOut: jest.fn(),
    signInWithHostedUI: jest.fn(),
    isAuthenticated: true,
    error: null,
  }

  describe('承認待ち件数表示の詳細テスト', () => {
    it('承認待ち件数バッジのスタイルが正しく適用される', async () => {
      const sessionsWithPending = [
        {
          id: '1',
          title: 'テスト勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: sessionsWithPending }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        const badge = screen.getByText('承認待ち 1 件')

        // バッジのスタイルクラスを確認
        expect(badge).toHaveClass(
          'inline-flex',
          'items-center',
          'px-3',
          'py-1',
          'rounded-full',
          'text-sm',
          'font-medium',
          'bg-yellow-100',
          'text-yellow-800',
          'border',
          'border-yellow-200'
        )

        // アイコンが含まれていることを確認
        const icon = badge.querySelector('svg')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('w-4', 'h-4', 'mr-1')
      })
    })

    it('複数の承認待ち件数が正しく計算される', async () => {
      const multiplePendingSessions = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        title: `承認待ち勉強会${i + 1}`,
        url: `https://example.com/${i + 1}`,
        datetime: '2024-01-15T19:00:00.000Z',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }))

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: multiplePendingSessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        expect(screen.getByText('承認待ち 5 件')).toBeInTheDocument()
      })
    })

    it('承認待ち以外のステータスは件数に含まれない', async () => {
      const mixedStatusSessions = [
        {
          id: '1',
          title: '承認待ち勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: '承認済み勉強会',
          url: 'https://example.com/2',
          datetime: '2024-01-16T19:00:00.000Z',
          status: 'approved' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: '却下された勉強会',
          url: 'https://example.com/3',
          datetime: '2024-01-17T19:00:00.000Z',
          status: 'rejected' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mixedStatusSessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 承認待ちは1件のみ
        expect(screen.getByText('承認待ち 1 件')).toBeInTheDocument()
      })
    })
  })

  describe('視覚的強調表示の詳細テスト', () => {
    it('承認待ち項目のホバー効果が正しく設定される', async () => {
      const pendingSession = [
        {
          id: '1',
          title: '承認待ち勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: pendingSession }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        const sessionItem = screen.getByText('承認待ち勉強会').closest('li')

        // 承認待ち項目の背景色とボーダーを確認
        expect(sessionItem).toHaveClass(
          'bg-yellow-50',
          'border-l-4',
          'border-yellow-400',
          'hover:bg-yellow-100'
        )
      })
    })

    it('承認待ち以外の項目は通常のスタイルが適用される', async () => {
      const approvedSession = [
        {
          id: '1',
          title: '承認済み勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'approved' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: approvedSession }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        const sessionItem = screen.getByText('承認済み勉強会').closest('li')

        // 通常項目のスタイルを確認
        expect(sessionItem).toHaveClass('hover:bg-gray-50')
        expect(sessionItem).not.toHaveClass('bg-yellow-50')
        expect(sessionItem).not.toHaveClass('border-yellow-400')
      })
    })

    it('ステータスバッジの色が正しく表示される', async () => {
      const allStatusSessions = [
        {
          id: '1',
          title: '承認待ち勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: '承認済み勉強会',
          url: 'https://example.com/2',
          datetime: '2024-01-16T19:00:00.000Z',
          status: 'approved' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: '却下された勉強会',
          url: 'https://example.com/3',
          datetime: '2024-01-17T19:00:00.000Z',
          status: 'rejected' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: allStatusSessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 各勉強会のタイトルが表示されていることを確認
        expect(screen.getByText('承認待ち勉強会')).toBeInTheDocument()
        expect(screen.getByText('承認済み勉強会')).toBeInTheDocument()
        expect(screen.getByText('却下された勉強会')).toBeInTheDocument()

        // ステータスバッジの色を確認（より具体的なセレクターを使用）
        const statusBadges = document.querySelectorAll(
          '.px-2.py-1.text-xs.font-medium.rounded-full'
        )

        // 承認待ちバッジ（黄色）
        const pendingBadge = Array.from(statusBadges).find(
          badge => badge.textContent?.trim() === '承認待ち'
        )
        expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')

        // 承認済みバッジ（緑色）
        const approvedBadge = Array.from(statusBadges).find(
          badge => badge.textContent?.trim() === '承認済み'
        )
        expect(approvedBadge).toHaveClass('bg-green-100', 'text-green-800')

        // 却下バッジ（赤色）
        const rejectedBadge = Array.from(statusBadges).find(
          badge => badge.textContent?.trim() === '却下'
        )
        expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-800')
      })
    })
  })

  describe('NEWバッジ表示の詳細テスト', () => {
    it('24時間境界値のテスト（23時間59分）', async () => {
      const almostOneDayOld = new Date(
        Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000
      )
      const session = [
        {
          id: '1',
          title: '境界値テスト勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: almostOneDayOld.toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: session }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 23時間59分前の勉強会にはNEWバッジが表示される
        expect(screen.getByText('NEW')).toBeInTheDocument()
      })
    })

    it('24時間境界値のテスト（24時間1分）', async () => {
      const overOneDayOld = new Date(
        Date.now() - 24 * 60 * 60 * 1000 - 60 * 1000
      )
      const session = [
        {
          id: '1',
          title: '境界値テスト勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: overOneDayOld.toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: session }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 24時間1分前の勉強会にはNEWバッジが表示されない
        expect(screen.queryByText('NEW')).not.toBeInTheDocument()
      })
    })

    it('NEWバッジが複数の新しい勉強会に表示される', async () => {
      const newSessions = [
        {
          id: '1',
          title: '新しい勉強会1',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1時間前
        },
        {
          id: '2',
          title: '新しい勉強会2',
          url: 'https://example.com/2',
          datetime: '2024-01-16T19:00:00.000Z',
          status: 'approved' as const,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12時間前
        },
        {
          id: '3',
          title: '古い勉強会',
          url: 'https://example.com/3',
          datetime: '2024-01-17T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48時間前
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: newSessions }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 2つのNEWバッジが表示される（新しい勉強会1と2）
        const newBadges = screen.getAllByText('NEW')
        expect(newBadges.length).toBeGreaterThanOrEqual(2)

        // 新しい勉強会1と2が表示されていることを確認
        expect(screen.getByText('新しい勉強会1')).toBeInTheDocument()
        expect(screen.getByText('新しい勉強会2')).toBeInTheDocument()
        expect(screen.getByText('古い勉強会')).toBeInTheDocument()
      })
    })

    it('NEWバッジのアイコンが正しく表示される', async () => {
      const newSession = [
        {
          id: '1',
          title: '新しい勉強会',
          url: 'https://example.com/1',
          datetime: '2024-01-15T19:00:00.000Z',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        },
      ]

      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: newSession }),
      })

      render(<AdminHome />)

      await waitFor(() => {
        const newBadge = screen.getByText('NEW')
        const svgIcon = newBadge.querySelector('svg')

        // SVGアイコンの属性を確認
        expect(svgIcon).toBeInTheDocument()
        expect(svgIcon).toHaveAttribute('fill', 'currentColor')
        expect(svgIcon).toHaveAttribute('viewBox', '0 0 20 20')

        // パスが正しく設定されていることを確認
        const path = svgIcon?.querySelector('path')
        expect(path).toBeInTheDocument()
        expect(path).toHaveAttribute('fill-rule', 'evenodd')
        expect(path).toHaveAttribute('clip-rule', 'evenodd')
      })
    })
  })

  describe('エラーハンドリングテスト', () => {
    it('API呼び出し失敗時の処理', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network Error')
      )

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation()

      render(<AdminHome />)

      await waitFor(() => {
        // エラー時は承認待ち件数が表示されない
        expect(screen.queryByText(/承認待ち.*件/)).not.toBeInTheDocument()

        // エラーメッセージが表示される
        expect(alertSpy).toHaveBeenCalledWith(
          '勉強会データの取得に失敗しました'
        )
      })

      consoleSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('不正なレスポンス形式の処理', async () => {
      mockUseAuth.mockReturnValue(mockAuthenticatedState)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalidData: 'test' }), // sessionsプロパティがない
      })

      render(<AdminHome />)

      await waitFor(() => {
        // 不正なデータの場合、空配列として扱われる
        expect(screen.queryByText(/承認待ち.*件/)).not.toBeInTheDocument()
        expect(
          screen.getByText('登録された勉強会はありません')
        ).toBeInTheDocument()
      })
    })
  })
})
