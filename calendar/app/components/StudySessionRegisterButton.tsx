'use client'

import Link from 'next/link'

export interface StudySessionRegisterButtonProps {
  className?: string
  displayMode?: 'header' | 'mobile-section'
  responsive?: boolean
}

export default function StudySessionRegisterButton({
  className = '',
  displayMode = 'header',
  responsive = false,
}: StudySessionRegisterButtonProps) {
  // Base classes for the button styling
  const baseClasses =
    'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 button-optimized'

  // Responsive classes based on display mode
  const responsiveClasses = responsive
    ? displayMode === 'header'
      ? 'hidden sm:inline-flex' // Hidden on mobile, visible on desktop in header
      : 'block sm:hidden' // Visible on mobile, hidden on desktop in mobile section
    : ''

  // Mobile section specific styling for better prominence
  const mobileSpecificClasses =
    displayMode === 'mobile-section'
      ? 'w-full justify-center py-3 text-base font-semibold'
      : ''

  // Combine all classes
  const combinedClasses = [
    baseClasses,
    responsiveClasses,
    mobileSpecificClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Link
      href="/register"
      className={combinedClasses}
      aria-label="勉強会の登録依頼ページへ移動"
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
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      勉強会の登録依頼
    </Link>
  )
}
