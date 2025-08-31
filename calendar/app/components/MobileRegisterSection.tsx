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
        ${className}
      `.trim()}
      aria-label="勉強会登録セクション"
    >
      <div className="text-center">
        <StudySessionRegisterButton
          displayMode="mobile-section"
          responsive={true}
          className="w-full"
        />
      </div>
    </section>
  )
}
