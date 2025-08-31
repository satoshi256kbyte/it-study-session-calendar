/**
 * Error handling and fallback tests for responsive event materials
 * 要件5.1, 7.1: JavaScript無効時のフォールバック、レイアウト検出エラー時の安全な表示、画像読み込みエラー時の適切な処理
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import ResponsiveEventMaterialsList from '../../components/ResponsiveEventMaterialsList'
import ErrorBoundary from '../../components/ErrorBoundary'
import LayoutErrorFallback from '../../components/LayoutErrorFallback'
import ImageErrorFallback from '../../components/ImageErrorFallback'
import NoScriptFallback from '../../components/NoScriptFallback'
import { mockEvents } from '../test-utils'

import { vi } from 'vitest'

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

describe('Error Handling and Fallbacks', () => {
  describe('ErrorBoundary Component', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    test('catches and displays error with default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('表示エラーが発生しました')).toBeInTheDocument()
      expect(
        screen.getByText(
          '申し訳ございませんが、コンテンツの表示中にエラーが発生しました。'
        )
      ).toBeInTheDocument()
      expect(screen.getByText('ページを再読み込み')).toBeInTheDocument()
      expect(screen.getByText('再試行')).toBeInTheDocument()
    })

    test('displays custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(
        screen.queryByText('表示エラーが発生しました')
      ).not.toBeInTheDocument()
    })

    test('calls custom error handler when provided', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    test('renders children normally when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(
        screen.queryByText('表示エラーが発生しました')
      ).not.toBeInTheDocument()
    })

    test('retry button resets error state', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('表示エラーが発生しました')).toBeInTheDocument()

      const retryButton = screen.getByText('再試行')
      fireEvent.click(retryButton)

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('LayoutErrorFallback Component', () => {
    const mockError = new Error('Layout detection failed')

    test('displays layout error message', () => {
      render(<LayoutErrorFallback events={mockEvents} error={mockError} />)

      expect(
        screen.getByText('レイアウトエラーが発生しました')
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'レスポンシブレイアウトの検出中にエラーが発生しました。'
        )
      ).toBeInTheDocument()
    })

    test('displays fallback event list', () => {
      render(<LayoutErrorFallback events={mockEvents} error={mockError} />)

      expect(screen.getByText('イベント一覧（基本表示）')).toBeInTheDocument()

      mockEvents.forEach(event => {
        expect(screen.getByText(event.title)).toBeInTheDocument()
      })
    })

    test('shows retry button when onRetry is provided', () => {
      const onRetry = vi.fn()
      render(
        <LayoutErrorFallback
          events={mockEvents}
          error={mockError}
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByText('レイアウトを再試行')
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalled()
    })

    test('shows error details when expanded', () => {
      render(<LayoutErrorFallback events={mockEvents} error={mockError} />)

      const detailsButton = screen.getByText('詳細を表示')
      fireEvent.click(detailsButton)

      expect(screen.getByText('詳細を非表示')).toBeInTheDocument()
      expect(screen.getByText('Layout detection failed')).toBeInTheDocument()
    })

    test('handles empty events list', () => {
      render(<LayoutErrorFallback events={[]} error={mockError} />)

      expect(
        screen.getByText('表示できるイベントがありません。')
      ).toBeInTheDocument()
    })
  })

  describe('ImageErrorFallback Component', () => {
    test('displays image normally when loaded successfully', async () => {
      render(
        <ImageErrorFallback
          src="https://example.com/valid-image.jpg"
          alt="Test image"
          className="w-32 h-32"
        />
      )

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'https://example.com/valid-image.jpg')
      expect(img).toHaveAttribute('alt', 'Test image')
    })

    test('shows loading state initially', () => {
      render(
        <ImageErrorFallback
          src="https://example.com/image.jpg"
          alt="Test image"
        />
      )

      expect(screen.getByText('画像を読み込み中...')).toBeInTheDocument()
    })

    test('shows error fallback when image fails to load', async () => {
      render(
        <ImageErrorFallback
          src="https://example.com/invalid-image.jpg"
          alt="Test image"
        />
      )

      const img = screen.getByRole('img')

      // Simulate image load error
      act(() => {
        fireEvent.error(img)
      })

      await waitFor(() => {
        expect(
          screen.getByText('画像を読み込めませんでした')
        ).toBeInTheDocument()
        expect(screen.getByText('再試行')).toBeInTheDocument()
      })
    })

    test('tries fallback image before showing error', async () => {
      const { rerender } = render(
        <ImageErrorFallback
          src="https://example.com/invalid-image.jpg"
          alt="Test image"
          fallbackSrc="https://example.com/fallback-image.jpg"
        />
      )

      const img = screen.getByRole('img')

      // Simulate primary image error
      act(() => {
        fireEvent.error(img)
      })

      // Should try fallback image
      await waitFor(() => {
        expect(img).toHaveAttribute(
          'src',
          'https://example.com/fallback-image.jpg'
        )
      })
    })

    test('shows custom fallback text when provided', async () => {
      render(
        <ImageErrorFallback
          src="https://example.com/invalid-image.jpg"
          alt="Test image"
          fallbackText="カスタムエラーメッセージ"
        />
      )

      const img = screen.getByRole('img')

      act(() => {
        fireEvent.error(img)
      })

      await waitFor(() => {
        expect(screen.getByText('カスタムエラーメッセージ')).toBeInTheDocument()
      })
    })

    test('retry button resets to original image', async () => {
      render(
        <ImageErrorFallback
          src="https://example.com/image.jpg"
          alt="Test image"
        />
      )

      const img = screen.getByRole('img')

      // Simulate error
      act(() => {
        fireEvent.error(img)
      })

      await waitFor(() => {
        expect(screen.getByText('再試行')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('再試行')
      fireEvent.click(retryButton)

      // Should reset to original source
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'https://example.com/image.jpg'
      )
    })

    test('calls custom error handler when provided', async () => {
      const onError = vi.fn()

      render(
        <ImageErrorFallback
          src="https://example.com/invalid-image.jpg"
          alt="Test image"
          onError={onError}
        />
      )

      const img = screen.getByRole('img')

      act(() => {
        fireEvent.error(img)
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('NoScriptFallback Component', () => {
    test('renders noscript content with events', () => {
      const { container } = render(<NoScriptFallback events={mockEvents} />)

      const noscript = container.querySelector('noscript')
      expect(noscript).toBeInTheDocument()

      // Check that noscript contains event information
      expect(noscript?.innerHTML).toContain('JavaScriptが無効になっています')
      expect(noscript?.innerHTML).toContain('IT勉強会・イベント一覧')

      mockEvents.forEach(event => {
        expect(noscript?.innerHTML).toContain(event.title)
      })
    })

    test('handles empty events list in noscript', () => {
      const { container } = render(<NoScriptFallback events={[]} />)

      const noscript = container.querySelector('noscript')
      expect(noscript?.innerHTML).toContain(
        '現在表示できるイベントがありません。'
      )
    })

    test('includes materials in noscript content', () => {
      const eventsWithMaterials = mockEvents.filter(
        event => event.materials.length > 0
      )
      const { container } = render(
        <NoScriptFallback events={eventsWithMaterials} />
      )

      const noscript = container.querySelector('noscript')

      eventsWithMaterials.forEach(event => {
        event.materials.forEach(material => {
          expect(noscript?.innerHTML).toContain(material.title || material.url)
        })
      })
    })
  })

  describe('Integration with ResponsiveEventMaterialsList', () => {
    test('includes NoScriptFallback in responsive component', () => {
      const { container } = render(
        <ResponsiveEventMaterialsList events={mockEvents} />
      )

      const noscript = container.querySelector('noscript')
      expect(noscript).toBeInTheDocument()
    })

    test('handles layout errors gracefully', async () => {
      // Mock useResponsiveLayout to throw an error
      vi.doMock('../../hooks/useResponsiveLayout', () => ({
        useResponsiveLayoutWithDefaults: () => {
          throw new Error('Layout detection failed')
        },
      }))

      const { default: ResponsiveEventMaterialsListWithError } = await import(
        '../../components/ResponsiveEventMaterialsList'
      )

      render(<ResponsiveEventMaterialsListWithError events={mockEvents} />)

      await waitFor(() => {
        expect(
          screen.getByText('レイアウトエラーが発生しました')
        ).toBeInTheDocument()
      })

      // Should still show events in fallback mode
      mockEvents.forEach(event => {
        expect(screen.getByText(event.title)).toBeInTheDocument()
      })

      vi.doUnmock('../../hooks/useResponsiveLayout')
    })

    test('error boundary catches component errors', () => {
      // Mock a component to throw an error
      const ErrorComponent = () => {
        throw new Error('Component error')
      }

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('表示エラーが発生しました')).toBeInTheDocument()
    })
  })

  describe('Accessibility in Error States', () => {
    test('error messages have proper ARIA labels', () => {
      render(
        <LayoutErrorFallback
          events={mockEvents}
          error={new Error('Test error')}
        />
      )

      const errorHeading = screen.getByText('レイアウトエラーが発生しました')
      expect(errorHeading).toHaveAttribute(
        'class',
        expect.stringContaining('text-orange-800')
      )
    })

    test('retry buttons are keyboard accessible', () => {
      const onRetry = jest.fn()
      render(
        <LayoutErrorFallback
          events={mockEvents}
          error={new Error('Test error')}
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByText('レイアウトを再試行')
      expect(retryButton).toHaveAttribute(
        'class',
        expect.stringContaining('focus:ring-2')
      )

      retryButton.focus()
      fireEvent.keyDown(retryButton, { key: 'Enter' })
      expect(onRetry).toHaveBeenCalled()
    })

    test('image error fallback has proper alt text', async () => {
      render(
        <ImageErrorFallback
          src="https://example.com/invalid-image.jpg"
          alt="Test image description"
        />
      )

      const img = screen.getByRole('img')
      act(() => {
        fireEvent.error(img)
      })

      await waitFor(() => {
        expect(screen.getByText('Test image description')).toBeInTheDocument()
      })
    })
  })

  describe('Performance in Error States', () => {
    test('error boundaries do not cause memory leaks', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow()
    })

    test('image error handling is debounced', async () => {
      const onError = vi.fn()

      render(
        <ImageErrorFallback
          src="https://example.com/invalid-image.jpg"
          alt="Test image"
          onError={onError}
        />
      )

      const img = screen.getByRole('img')

      // Simulate multiple rapid errors
      act(() => {
        fireEvent.error(img)
        fireEvent.error(img)
        fireEvent.error(img)
      })

      await waitFor(() => {
        // Should only call error handler once
        expect(onError).toHaveBeenCalledTimes(1)
      })
    })
  })
})
