'use client'

import { useState, useEffect } from 'react'

interface StudySession {
  id: string
  title: string
  url: string
  datetime: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export default function AdminHome() {
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
      const response = await fetch(`/api/prod/admin/study-sessions?page=${currentPage}`)
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
      const response = await fetch(`/api/prod/admin/study-sessions/${id}/${action}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // 成功時はリストを再取得
        fetchSessions()
      } else {
        alert('操作に失敗しました')
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('エラーが発生しました')
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
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
      case 'pending': return '未承認'
      case 'approved': return '承認済み'
      case 'rejected': return '却下'
      default: return '不明'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              広島IT勉強会カレンダー 管理画面
            </h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">勉強会一覧</h2>
              <p className="mt-1 text-sm text-gray-600">
                登録された勉強会の承認・管理を行います
              </p>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="text-gray-500">読み込み中...</div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        勉強会情報
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        開催日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        登録日
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {session.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              <a 
                                href={session.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-500"
                              >
                                {session.url}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.datetime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(session.status)}>
                            {getStatusText(session.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {session.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleAction(session.id, 'approve')}
                                  className="text-green-600 hover:text-green-900 px-2 py-1 text-xs bg-green-50 rounded"
                                >
                                  承認
                                </button>
                                <button
                                  onClick={() => handleAction(session.id, 'reject')}
                                  className="text-red-600 hover:text-red-900 px-2 py-1 text-xs bg-red-50 rounded"
                                >
                                  却下
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleAction(session.id, 'delete')}
                              className="text-gray-600 hover:text-gray-900 px-2 py-1 text-xs bg-gray-50 rounded"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        前へ
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
