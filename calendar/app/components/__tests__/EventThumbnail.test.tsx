import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * EventThumbnail は表示時に OptimizedThumbnail（variant="table"）へ委譲する。
 * OptimizedThumbnail 本体は next/image + IntersectionObserver に依存し
 * 遅延読み込みするため、EventThumbnail 自身の責務
 * （寸法・alt 決定・装飾扱い・エラー時の空プレースホルダ委譲）を
 * 決定的に検証できるよう、子コンポーネントを軽量スタブに差し替える。
 *
 * スタブは受け取った props をそのまま DOM に反映し、
 * onError を発火するボタンを露出することで、
 * EventThumbnail が「デフォルト代替画像を使わず onError 挙動へ委譲する」
 * ことを検証できるようにする。
 */
vi.mock('../OptimizedImage', () => {
  return {
    OptimizedThumbnail: (props: {
      src: string
      alt: string
      width: number
      height: number
      variant?: string
      responsive?: boolean
      className?: string
      onError?: () => void
    }) => (
      <img
        data-testid="optimized-thumbnail"
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        data-variant={props.variant}
        data-responsive={String(props.responsive)}
        className={props.className}
        onError={props.onError}
      />
    ),
  }
})

// モック定義後に import する（vi.mock は巻き上げられる）
import EventThumbnail from '../EventThumbnail'

const VALID_URL = 'https://example.com/thumb.jpg'

describe('EventThumbnail', () => {
  describe('サムネイル表示時（Requirement 6.1, 6.4, 8.4）', () => {
    test('一辺 64px 以下（幅64 / 高さ48）で表示される', () => {
      render(
        <EventThumbnail thumbnailUrl={VALID_URL} eventTitle="React勉強会 #42" />
      )

      const img = screen.getByTestId('optimized-thumbnail')
      expect(img).toHaveAttribute('width', '64')
      expect(img).toHaveAttribute('height', '48')
      expect(img).toHaveAttribute('data-variant', 'table')
    })

    test('src に派生済みサムネイル URL が渡される', () => {
      render(
        <EventThumbnail thumbnailUrl={VALID_URL} eventTitle="React勉強会 #42" />
      )

      expect(screen.getByTestId('optimized-thumbnail')).toHaveAttribute(
        'src',
        VALID_URL
      )
    })

    test('alt にイベントタイトルが優先して使われる', () => {
      render(
        <EventThumbnail thumbnailUrl={VALID_URL} eventTitle="React勉強会 #42" />
      )

      expect(screen.getByAltText('React勉強会 #42')).toBeInTheDocument()
    })

    test('タイトルが空白のみの場合は汎用ラベルにフォールバックする', () => {
      render(<EventThumbnail thumbnailUrl={VALID_URL} eventTitle="   " />)

      expect(screen.getByAltText('イベントのサムネイル')).toBeInTheDocument()
    })

    test('タイトルが空文字の場合も汎用ラベルにフォールバックする', () => {
      render(<EventThumbnail thumbnailUrl={VALID_URL} eventTitle="" />)

      expect(screen.getByAltText('イベントのサムネイル')).toBeInTheDocument()
    })

    test('読み込み失敗時はデフォルト代替画像へ差し替えず onError 挙動へ委譲する', () => {
      render(
        <EventThumbnail thumbnailUrl={VALID_URL} eventTitle="React勉強会 #42" />
      )

      const img = screen.getByTestId('optimized-thumbnail')

      // EventThumbnail 自身は onError で src を別画像に差し替えたりしない。
      // エラー処理は OptimizedImage の onError 挙動（空プレースホルダ）へ委譲される。
      expect(img).toHaveAttribute('src', VALID_URL)
      // 委譲先が装飾用の代替テキストを持たないことを担保するため、
      // フォールバックの alt テキストは存在しない
      expect(screen.queryByAltText('イベントのサムネイル')).toBeNull()
    })
  })

  describe('サムネイルなし時の装飾扱い（Requirement 6.2, 6.3, 8.5）', () => {
    test('URL 未指定なら OptimizedThumbnail を描画しない', () => {
      const { container } = render(<EventThumbnail eventTitle="React勉強会" />)

      expect(screen.queryByTestId('optimized-thumbnail')).toBeNull()

      // レイアウトを保つ空プレースホルダが描画される
      const placeholder = container.querySelector(
        '.event-thumbnail-placeholder'
      )
      expect(placeholder).not.toBeNull()
    })

    test('空プレースホルダはレイアウト維持のため 64x48 の寸法を持つ', () => {
      const { container } = render(<EventThumbnail eventTitle="React勉強会" />)

      const placeholder = container.querySelector<HTMLElement>(
        '.event-thumbnail-placeholder'
      )
      expect(placeholder).not.toBeNull()
      expect(placeholder?.style.width).toBe('64px')
      expect(placeholder?.style.height).toBe('48px')
    })

    test('空プレースホルダは装飾扱い（aria-hidden）で代替テキストを持たない', () => {
      const { container } = render(<EventThumbnail eventTitle="React勉強会" />)

      const placeholder = container.querySelector(
        '.event-thumbnail-placeholder'
      )
      expect(placeholder).toHaveAttribute('aria-hidden', 'true')
      // アクセシビリティツリー上に画像ロールが出ない（装飾扱い）
      expect(screen.queryByRole('img')).toBeNull()
    })

    test('空白のみ・非 http(s)・空文字の URL も表示不可として装飾扱いになる', () => {
      const cases = ['   ', '', 'ftp://example.com/x.jpg', 'not a url']

      for (const thumbnailUrl of cases) {
        const { container, unmount } = render(
          <EventThumbnail thumbnailUrl={thumbnailUrl} eventTitle="勉強会" />
        )

        expect(screen.queryByTestId('optimized-thumbnail')).toBeNull()
        expect(
          container.querySelector('.event-thumbnail-placeholder')
        ).not.toBeNull()

        unmount()
      }
    })
  })
})
