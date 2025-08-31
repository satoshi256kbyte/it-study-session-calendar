/**
 * No-script fallback component for responsive event materials
 * 要件5.1: JavaScript無効時のフォールバック表示を実装
 */

import { EventWithMaterials } from '../types/eventMaterial'

interface NoScriptFallbackProps {
  events: EventWithMaterials[]
}

/**
 * Static HTML fallback for when JavaScript is disabled
 */
export default function NoScriptFallback({ events }: NoScriptFallbackProps) {
  return (
    <noscript>
      <div className="no-script-fallback bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <svg
            className="w-6 h-6 text-yellow-600 mr-3"
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
          <h2 className="text-lg font-semibold text-yellow-800">
            JavaScriptが無効になっています
          </h2>
        </div>

        <p className="text-yellow-700 mb-4">
          このサイトの一部機能を利用するにはJavaScriptを有効にしてください。
          以下に基本的なイベント情報を表示しています。
        </p>
      </div>

      {/* Static event list for no-script users */}
      <div className="no-script-events">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          IT勉強会・イベント一覧
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              現在表示できるイベントがありません。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map(event => (
              <div
                key={event.id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  <a
                    href={event.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {event.title}
                  </a>
                </h3>

                {/* Connpass link */}
                <div className="mb-4">
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      📄 資料 ({event.materials.length}件)
                    </h4>
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

      <style jsx>{`
        .no-script-fallback,
        .no-script-events {
          /* Ensure proper styling without JavaScript */
          max-width: 100%;
          margin: 0 auto;
          padding: 1rem;
        }

        @media (min-width: 768px) {
          .no-script-fallback,
          .no-script-events {
            max-width: 768px;
            padding: 2rem;
          }
        }

        @media (min-width: 1024px) {
          .no-script-fallback,
          .no-script-events {
            max-width: 1024px;
          }
        }

        /* Print styles for no-script fallback */
        @media print {
          .no-script-fallback {
            display: none;
          }

          .no-script-events {
            break-inside: avoid;
          }

          .no-script-events > div {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 1rem;
            border: 1px solid #000;
          }
        }
      `}</style>
    </noscript>
  )
}
