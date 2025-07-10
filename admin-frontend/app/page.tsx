'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../src/contexts/AuthContext'
import LoginForm from '../src/components/LoginForm'

interface StudySession {
  id: string
  title: string
  url: string
  datetime: string
  endDatetime?: string
  contact?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

function AdminDashboard() {
  const { user, signOut } = useAuth()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchSessions()
  }, [currentPage])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      // 管理者向けAPIから勉強会一覧を取得
      const response = await fetch(`/api/admin/study-sessions?page=${currentPage}`)
      const data = await response.json()
      
      setSessions(data.sessions || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      alert('勉強会データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      const response = await fetch(`/api/admin/study-sessions/${id}/${action}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // 成功時はリストを再取得
        fetchSessions()
      } else {
        throw new Error('操作に失敗しました')
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('操作に失敗しました')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const formatDateTime = (datetime: string, endDatetime?: string) => {
    try {
      const startDate = new Date(datetime)
      const startFormatted = startDate.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      })
      
      if (endDatetime) {
        const endDate = new Date(endDatetime)
        const endFormatted = endDate.toLocaleString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Tokyo'
        })
        return `${startFormatted} - ${endFormatted}`
      }
      
      return startFormatted
    } catch (error) {
      return datetime
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '承認待ち'
      case 'approved':
        return '承認済み'
      case 'rejected':
        return '却下'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              広島IT勉強会カレンダー - 管理画面
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                ログイン中: {user?.attributes?.email || user?.username}
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                勉強会一覧
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                登録された勉強会の承認・却下・削除を行えます
              </p>
            </div>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">登録された勉強会はありません</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <li key={session.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900 truncate">
                            {session.title}
                          </h4>
                          <span className={getStatusBadge(session.status)}>
                            {getStatusText(session.status)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">開催日時:</span> {formatDateTime(session.datetime, session.endDatetime)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">URL:</span>{' '}
                            <a
                              href={session.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {session.url}
                            </a>
                          </p>
                          {session.contact && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">連絡先:</span> {session.contact}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            登録日時: {new Date(session.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        {session.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(session.id, 'approve')}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleAction(session.id, 'reject')}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              却下
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('この勉強会を削除しますか？')) {
                              handleAction(session.id, 'delete')
                            }
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      ページ <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        前へ
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        次へ
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AdminHome() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <AdminDashboard />
}
