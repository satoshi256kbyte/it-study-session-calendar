'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Register() {
  // 今日の日付を取得してYYYY-MM-DD形式にフォーマット
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const day = today.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: getTodayDate(), // 初期値を今日の日付に設定
    startTime: '',
    endTime: '',
    contact: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // 時間選択肢を15分刻みで生成
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // 開始時刻から2時間後の時刻を計算する関数
  const calculateEndTime = (startTime: string) => {
    if (!startTime) return ''

    const [hour, minute] = startTime.split(':').map(Number)
    let endHour = hour + 2
    let endMinute = minute

    // 24時を超える場合は翌日扱いとして24時間制で表示
    if (endHour >= 24) {
      endHour = endHour - 24
    }

    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      // 日付と時間を組み合わせてdatetimeを作成
      const dateObj = new Date(formData.date)
      const [startHour, startMinute] = formData.startTime.split(':').map(Number)
      const [endHour, endMinute] = formData.endTime.split(':').map(Number)

      const startDateTime = new Date(dateObj)
      startDateTime.setHours(startHour, startMinute, 0, 0)

      const endDateTime = new Date(dateObj)
      endDateTime.setHours(endHour, endMinute, 0, 0)

      // ISO形式で送信
      const requestData = {
        title: formData.title,
        url: formData.url,
        datetime: startDateTime.toISOString(),
        endDatetime: endDateTime.toISOString(),
        contact: formData.contact,
      }

      // 管理者向けAPIにPOSTリクエストを送信
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/study-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        setMessage('勉強会の登録が完了しました。承認をお待ちください。')
        setFormData({
          title: '',
          url: '',
          date: getTodayDate(), // リセット時も今日の日付を設定
          startTime: '',
          endTime: '',
          contact: '',
        })
      } else {
        throw new Error('登録に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    // 開始時刻が変更された場合、終了時刻を自動計算
    if (name === 'startTime') {
      const calculatedEndTime = calculateEndTime(value)
      setFormData({
        ...formData,
        [name]: value,
        endTime: calculatedEndTime,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-3xl font-bold text-gray-900 hover:text-blue-600"
              >
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
                IT関連の勉強会やイベントを登録してください
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 勉強会タイトル */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  勉強会タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="例: おもにクラウドの話してます #256"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              {/* 勉強会ページのリンク */}
              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700"
                >
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

              {/* 開催日 */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700"
                >
                  開催日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              {/* 開始時刻・終了時刻 */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startTime"
                    className="block text-sm font-medium text-gray-700"
                  >
                    開始時刻 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="startTime"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="">選択してください</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="endTime"
                    className="block text-sm font-medium text-gray-700"
                  >
                    終了時刻 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="endTime"
                    name="endTime"
                    required
                    value={formData.endTime}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="">選択してください</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 連絡先 */}
              <div>
                <label
                  htmlFor="contact"
                  className="block text-sm font-medium text-gray-700"
                >
                  連絡先（任意）
                </label>
                <input
                  type="text"
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="例: メールアドレス、SNSアカウントなど"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                />
                <p className="mt-1 text-xs text-gray-500">
                  勉強会の内容について不備などが見つかった場合に、管理者が問い合わせする際に利用させていただきます（任意）
                </p>
              </div>

              {/* 注意事項 */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      登録について
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          登録後、管理者が登録内容を確認し、問題がなければ承認を行います
                        </li>
                        <li>承認されるとカレンダーに自動的に追加されます</li>
                        <li>時刻は15分刻みで選択できます</li>
                        <li>
                          開始時刻を選択すると、終了時刻が自動的に2時間後に設定されます
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* メッセージ表示 */}
              {message && (
                <div
                  className={`rounded-md p-4 ${message.includes('完了') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                >
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
