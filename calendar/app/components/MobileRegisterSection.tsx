'use client'

import StudySessionRegisterButton from './StudySessionRegisterButton'

export interface MobileRegisterSectionProps {
  className?: string
}

/**
 * MobileRegisterSection component
 *
 * Mobile-only section component that displays the registration button below the calendar
 * on mobile devices. Hidden on desktop and tablet devices.
 *
 * Requirements addressed:
 * - 2.2: Display registration button below calendar on mobile
 * - 2.5: Visually prominent and easily discoverable
 * - 3.2: Hidden on desktop/tablet, visible on mobile
 * - 4.2: Maintains accessibility standards
 */
export default function MobileRegisterSection({
  className = '',
}: MobileRegisterSectionProps) {
  return (
    <section
      className={`
        block sm:hidden
        mt-6 px-4
        bg-white rounded-lg shadow
        border-2 border-blue-100
        ${className}
      `.trim()}
      aria-label="勉強会登録セクション"
    >
      <div className="p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-3">
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            勉強会を登録しませんか？
          </h3>
          <p className="text-sm text-gray-600">
            あなたの勉強会やイベントをカレンダーに追加して、
            <br />
            多くの人に参加してもらいましょう
          </p>
        </div>

        <StudySessionRegisterButton
          displayMode="mobile-section"
          responsive={true}
          className="shadow-lg"
        />

        <p className="mt-3 text-xs text-gray-500">
          登録には管理者の承認が必要です
        </p>
      </div>
    </section>
  )
}
