'use client'

import { memo, useState } from 'react'
import { StudySessionEvent } from '../types/studySessionEvent'
import {
  YearMonth,
  addMonths,
  formatYearMonthLabel,
  getCurrentYearMonthJst,
  selectEventsForMonth,
} from '../utils/calendarMonth'
import EventListView from './EventListView'

/**
 * MonthCalendar の Props
 */
export interface MonthCalendarProps {
  /** page.tsx が取得済みのイベント（Approved 以外も含みうる。内部で絞り込み） */
  events: StudySessionEvent[]
  /** 取得中フラグ */
  isLoading: boolean
  /** エラーメッセージ（null なら正常） */
  error: string | null
  /** 再試行可能か */
  isRetryable: boolean
  /** 再試行ハンドラ */
  onRetry: () => void
  /** 追加クラス */
  className?: string
}

/**
 * 月移動ヘッダー。前月・翌月ボタンと年月ラベルを表示する。
 *
 * すべての表示状態（error/loading/empty/list）で共通して表示し、ユーザーが
 * どの状態でも月移動できるようにする。読み込み中はボタンを `disabled` にする
 * （Requirement 4.1, 4.4, 4.6, 8.3）。
 */
function MonthNavHeader({
  displayedMonth,
  isLoading,
  onPrev,
  onNext,
}: {
  displayedMonth: YearMonth
  isLoading: boolean
  onPrev: () => void
  onNext: () => void
}) {
  const label = formatYearMonthLabel(displayedMonth)

  return (
    <div className="month-calendar-nav flex items-center justify-between mb-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={isLoading}
        aria-label="前の月へ"
        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <h2
        className="month-calendar-label text-lg font-semibold text-gray-900"
        aria-live="polite"
      >
        {label}
      </h2>

      <button
        type="button"
        onClick={onNext}
        disabled={isLoading}
        aria-label="次の月へ"
        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * エラー表示 + 再試行ボタン。
 *
 * Google カレンダー iframe へはフォールバックせず、取得失敗メッセージを表示し、
 * `isRetryable` のときのみ再試行ボタンを提示する（Requirement 1.5, 2.6, 2.7）。
 * 配色・アイコンは既存の page.tsx のエラー表示規約（yellow 系）に合わせる。
 */
function ErrorState({
  error,
  isRetryable,
  isLoading,
  onRetry,
}: {
  error: string
  isRetryable: boolean
  isLoading: boolean
  onRetry: () => void
}) {
  return (
    <div
      className="month-calendar-error bg-white rounded-lg border-l-4 border-yellow-400"
      role="alert"
    >
      <div className="p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              勉強会データの取得に失敗しました
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{error}</p>
              {isRetryable && (
                <p className="mt-2">データの取得を再試行できます。</p>
              )}
            </div>
            {isRetryable && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  再試行
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 空状態メッセージ。表示月に表示できるイベントが 0 件のときに表示する
 * （Requirement 5.5）。
 */
function EmptyState() {
  return (
    <div className="month-calendar-empty text-center py-12">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
        <svg
          className="h-6 w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        この月の勉強会はありません
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        表示できる勉強会がこの月にはありません。前後の月も確認してみてください。
      </p>
    </div>
  )
}

/**
 * 月表示カレンダー。
 *
 * 単一責任として「表示月（Displayed_Month）の状態管理・月移動・表示状態の分岐」を
 * 扱う。データ取得は行わず、`page.tsx` が取得済みの状態を props で受け取る。
 * 表示対象イベントの算出（JST 月境界フィルタ + ソート）は純粋関数
 * `selectEventsForMonth()` に委譲する（単一責任の原則）。
 *
 * 表示状態は「error → loading → empty → list」の優先順で分岐する
 * （Requirement 2.7: エラーが空状態に優先）。月移動ヘッダーは全状態で共通表示する。
 *
 * 対応要件: 1.1, 1.4, 1.5, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4,
 *           4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.5, 8.3
 */
function MonthCalendar({
  events,
  isLoading,
  error,
  isRetryable,
  onRetry,
  className = '',
}: MonthCalendarProps) {
  // JST の現在年月で初期化（Requirement 3.2）
  const [displayedMonth, setDisplayedMonth] = useState<YearMonth>(() =>
    getCurrentYearMonthJst()
  )

  // 月移動ハンドラ。読み込み中は無視する（Requirement 4.2, 4.3, 4.6）
  const goPrevMonth = () => {
    if (isLoading) return
    setDisplayedMonth(prev => addMonths(prev, -1))
  }
  const goNextMonth = () => {
    if (isLoading) return
    setDisplayedMonth(prev => addMonths(prev, 1))
  }

  // 表示状態の分岐（error → loading → empty → list の優先順）
  const renderBody = () => {
    // 1) error（空状態・list に優先。iframe へはフォールバックしない）
    if (error !== null) {
      return (
        <ErrorState
          error={error}
          isRetryable={isRetryable}
          isLoading={isLoading}
          onRetry={onRetry}
        />
      )
    }

    // 2) loading（iframe は表示しない）
    // 下部「イベント資料一覧」のローディング表示に統一（border-b-2 式スピナー）
    if (isLoading) {
      return (
        <div className="w-full py-8">
          <div className="text-center">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
              aria-label="勉強会を読み込み中"
              role="status"
            ></div>
            <p className="mt-2 text-gray-600">勉強会を読み込み中...</p>
          </div>
        </div>
      )
    }

    // 3) 表示対象イベントの算出（Approved + JST 月境界 + ソート）
    const monthEvents = selectEventsForMonth(events, displayedMonth)

    // 4) empty（0 件）
    if (monthEvents.length === 0) {
      return <EmptyState />
    }

    // 5) list
    return <EventListView events={monthEvents} />
  }

  return (
    <div className={`month-calendar ${className}`.trim()}>
      <MonthNavHeader
        displayedMonth={displayedMonth}
        isLoading={isLoading}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
      />
      {renderBody()}
    </div>
  )
}

export default memo(MonthCalendar)
