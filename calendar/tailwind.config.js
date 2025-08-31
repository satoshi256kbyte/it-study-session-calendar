/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom responsive breakpoints - 要件5.2: レスポンシブブレークポイント
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px', // タブレット開始点
        lg: '1024px', // デスクトップ開始点
        xl: '1280px',
        '2xl': '1536px',
        // Custom breakpoints for event materials
        tablet: '768px',
        desktop: '1024px',
        // Touch device queries
        touch: { raw: '(pointer: coarse)' },
        mouse: { raw: '(pointer: fine)' },
        // Hover capability queries
        'hover-hover': { raw: '(hover: hover)' },
        'hover-none': { raw: '(hover: none)' },
      },

      // Custom spacing for responsive layouts - 要件5.2
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
        // Card-specific spacing
        'card-sm': '0.75rem',
        'card-md': '1rem',
        'card-lg': '1.25rem',
        'card-xl': '1.5rem',
      },

      // Custom colors for responsive components
      colors: {
        // Focus ring colors
        'focus-ring': {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // Card colors
        card: {
          bg: '#ffffff',
          border: '#e5e7eb',
          shadow: 'rgba(0, 0, 0, 0.1)',
        },
      },

      // Custom transitions - 要件5.2: スムーズなトランジション効果
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      transitionDuration: {
        150: '150ms',
        250: '250ms',
        350: '350ms',
      },

      // Custom animations for layout transitions
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-out': 'scaleOut 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
      },

      // Custom grid templates for responsive layouts
      gridTemplateColumns: {
        'responsive-1': '1fr',
        'responsive-2': 'repeat(2, 1fr)',
        'responsive-auto': 'repeat(auto-fit, minmax(300px, 1fr))',
      },

      // Custom shadows for cards
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover':
          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-focus': '0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.1)',
      },

      // Custom border radius for cards
      borderRadius: {
        card: '0.5rem',
        'card-lg': '0.75rem',
      },

      // Custom min/max heights for responsive cards
      minHeight: {
        'card-mobile': '200px',
        'card-tablet': '180px',
        'touch-target': '44px',
        'touch-target-large': '48px',
      },

      maxHeight: {
        'card-mobile': '400px',
        'card-tablet': '350px',
      },

      // Custom z-index values
      zIndex: {
        'layout-transition': '10',
        'focus-ring': '20',
      },
    },
  },
  plugins: [
    // Custom plugin for responsive utilities
    function ({ addUtilities, theme }) {
      const newUtilities = {
        // Layout display utilities
        '.layout-desktop': {
          display: 'none',
          '@media (min-width: 1024px)': {
            display: 'block',
          },
        },
        '.layout-tablet-mobile': {
          display: 'block',
          '@media (min-width: 1024px)': {
            display: 'none',
          },
        },
        '.layout-tablet-only': {
          display: 'none',
          '@media (min-width: 768px) and (max-width: 1023px)': {
            display: 'block',
          },
        },
        '.layout-mobile-only': {
          display: 'block',
          '@media (min-width: 768px)': {
            display: 'none',
          },
        },

        // GPU acceleration utilities
        '.gpu-accelerate': {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
        },

        // Touch optimization utilities
        '.touch-optimized': {
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        },

        // Container query utilities
        '.contain-layout': {
          contain: 'layout',
        },
        '.contain-style': {
          contain: 'style',
        },
        '.contain-paint': {
          contain: 'paint',
        },
        '.contain-strict': {
          contain: 'strict',
        },

        // Will-change utilities for performance
        '.will-change-transform-opacity': {
          willChange: 'transform, opacity',
        },
        '.will-change-auto': {
          willChange: 'auto',
        },
      }

      addUtilities(newUtilities)
    },
  ],
}
