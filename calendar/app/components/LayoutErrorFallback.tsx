'use client'

import { useEffect, useState } from 'react'
import { EventWithMaterials } from '../types/eventMaterial'

/**
 * Layout error fallback props
 */
interface LayoutErrorFallbackProps {
  events: EventWithMaterials[]
  error?: Error
  onRetry?: () => void
}

/**
 * Fallback component for layout detection errors
 * 要件5.1: レイアウト検出エラー時の安全な表示を追加
 */
export default function LayoutErrorFallback({
  events,
  error,
  onRetry,
}: LayoutErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Log error for debugging
    if (error) {
      console.error('Layout error occurred:', error)
    }
  }, [error])

  return (
    <div className="layout-error-fallback bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <svg
          className="w-6 h-6 text-orange-600 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-orange-800">
          レイアウトエラーが発生しました
        </h2>
      </div>

      <p className="text-orange-700 mb-4">
        レスポンシブレイアウトの検出中にエラーが発生しました。
        基本的なレイアウトで表示を続行します。
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            レイアウトを再試行
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          ページを再読み込み
        </button>
      </div>

      {error && (
        <div className="border-t border-orange-200 pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-orange-700 hover:text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded px-2 py-1"
          >
            {showDetails ? '詳細を非表示' : '詳細を表示'}
          </button>

          {showDetails && (
            <div className="mt-3 p-3 bg-orange-100 rounded border text-sm">
              <p className="font-medium text-orange-800 mb-2">エラー詳細:</p>
              <pre className="text-orange-700 whitespace-pre-wrap overflow-auto">
                {error.message}
                {error.stack && (
                  <>
                    {'\n\nStack trace:\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Fallback event list */}
      <div className="mt-6 pt-6 border-t border-orange-200">
        <h3 className="text-lg font-medium text-orange-800 mb-4">
          イベント一覧（基本表示）
        </h3>

        {events.length === 0 ? (
          <p className="text-orange-600">表示できるイベントがありません。</p>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div
                key={event.id}
                className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm"
              >
                {/* Event date */}
                <div className="text-sm text-gray-500 mb-2">
                  📅{' '}
                  {new Date(event.eventDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </div>

                {/* Event title */}
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  <a
                    href={event.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {event.title}
                  </a>
                </h4>

                {/* Connpass link */}
                <div className="mb-3">
                  <a
                    href={event.connpassUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
                  >
                    🔗 connpass
                  </a>
                </div>

                {/* Materials */}
                {event.materials.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      📄 資料 ({event.materials.length}件)
                    </h5>
                    <ul className="space-y-1">
                      {event.materials.map(material => (
                        <li key={material.id}>
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                          >
                            {material.title || material.url}
                          </a>
                          {material.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {material.description}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook for layout error handling
 */
export function useLayoutErrorHandling() {
  const [layoutError, setLayoutError] = useState<Error | null>(null)

  const handleLayoutError = (error: Error) => {
    console.error('Layout error:', error)
    setLayoutError(error)
  }

  const retryLayout = () => {
    setLayoutError(null)
  }

  return {
    layoutError,
    handleLayoutError,
    retryLayout,
    hasLayoutError: layoutError !== null,
  }
}
