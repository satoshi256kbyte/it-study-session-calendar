'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Register() {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    datetime: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      // 管理者向けAPIにPOSTリクエストを送信
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/study-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage('勉強会の登録が完了しました。承認をお待ちください。')
        setFormData({ title: '', url: '', datetime: '' })
      } else {
        throw new Error('登録に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="text-3xl font-bold text-gray-900 hover:text-blue-600">
                広島IT勉強会カレンダー
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                カレンダーに戻る
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                勉強会の登録
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                広島のIT関連の勉強会やイベントを登録してください
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 勉強会タイトル */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  勉強会タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="例: 広島JavaScript勉強会 #42"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              {/* 勉強会ページのリンク */}
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  勉強会ページのリンク <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  required
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="例: https://connpass.com/event/123456/"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              {/* 開催日時 */}
              <div>
                <label htmlFor="datetime" className="block text-sm font-medium text-gray-700">
                  開催日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="datetime"
                  name="datetime"
                  required
                  value={formData.datetime}
                  onChange={handleChange}
                  placeholder="例: 2024年7月15日 19:00-21:00"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                />
                <p className="mt-1 text-xs text-gray-500">
                  形式: YYYY年MM月DD日 HH:MM-HH:MM
                </p>
              </div>

              {/* 注意事項 */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      登録について
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>登録後、管理者が登録内容を確認し、問題がなければ承認を行います</li>
                        <li>承認されるとカレンダーに自動的に追加されます</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* メッセージ表示 */}
              {message && (
                <div className={`rounded-md p-4 ${message.includes('完了') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message}
                </div>
              )}

              {/* 送信ボタン */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '登録中...' : '勉強会を登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
