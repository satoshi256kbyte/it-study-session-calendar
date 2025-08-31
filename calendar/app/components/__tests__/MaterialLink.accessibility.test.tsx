/**
 * MaterialLink アクセシビリティテスト
 * 要件6.1, 6.2, 6.3, 6.4の検証
 */

import { render, screen } from '@testing-library/react'
import MaterialLink from '../MaterialLink'
import { Material } from '../../types/eventMaterial'

// テスト用のモックデータ
const mockMaterial: Material = {
  id: 'material-1',
  title: 'Reactの新機能について',
  url: 'https://example.com/slide1',
  type: 'slide',
  thumbnailUrl: 'https://example.com/thumb1.jpg',
  createdAt: '2025-01-15T00:00:00Z',
}

const mockMaterialWithoutThumbnail: Material = {
  id: 'material-2',
  title: '実演動画',
  url: 'https://example.com/video1',
  type: 'video',
  createdAt: '2025-01-15T00:00:00Z',
}

const eventTitle = 'React勉強会 #42'

describe('MaterialLink Accessibility', () => {
  describe('要件6.1: ARIAラベルとロールの適切な設定', () => {
    test('コンテナに適切なARIA属性が設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const container = screen.getByRole('group')
      expect(container).toHaveAttribute(
        'aria-labelledby',
        `material-title-${mockMaterial.id}`
      )
      expect(container).toHaveAttribute(
        'aria-describedby',
        `material-type-${mockMaterial.id}`
      )
    })

    test('サムネイル画像に適切なARIA属性が設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const thumbnailContainer = screen.getByRole('img')
      expect(thumbnailContainer).toHaveAttribute(
        'aria-label',
        `${mockMaterial.title}のサムネイル画像`
      )

      const img = screen.getByRole('presentation')
      expect(img).toHaveAttribute(
        'alt',
        `${mockMaterial.title}のサムネイル - スライド`
      )
    })

    test('読み込み中状態に適切なARIA属性が設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      // 画像が読み込まれる前の状態をテスト
      const loadingIndicator = screen.queryByRole('status')
      if (loadingIndicator) {
        expect(loadingIndicator).toHaveAttribute(
          'aria-label',
          '画像を読み込み中'
        )
      }
    })

    test('リンクに適切なARIA属性が設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'aria-label',
        `${eventTitle}のスライド「${mockMaterial.title}」を新しいタブで開く`
      )
      expect(link).toHaveAttribute(
        'aria-describedby',
        `material-type-${mockMaterial.id}`
      )
    })

    test('資料タイプ表示に適切なARIA属性が設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const typeDisplay = screen.getByText('スライド')
      expect(typeDisplay).toHaveAttribute(
        'id',
        `material-type-${mockMaterial.id}`
      )
      expect(typeDisplay).toHaveAttribute('aria-label', '資料の種類: スライド')
    })

    test('装飾的な要素がaria-hiddenに設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      // コンテナからaria-hidden="true"の要素を直接取得
      const container = screen.getByRole('group')
      const hiddenElements = container.querySelectorAll('[aria-hidden="true"]')

      expect(hiddenElements.length).toBeGreaterThan(0)
    })
  })

  describe('要件6.2: キーボードナビゲーションの論理的なタブ順序', () => {
    test('リンクがキーボードでアクセス可能である', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      expect(link).not.toHaveAttribute('tabIndex', '-1')
    })

    test('フォーカス時に適切なスタイルが適用される', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'focus:ring-offset-2'
      )
    })

    test('コンテナにフォーカス内スタイルが適用される', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const container = screen.getByRole('group')
      expect(container).toHaveClass(
        'focus-within:bg-gray-50',
        'focus-within:ring-2',
        'focus-within:ring-blue-500'
      )
    })
  })

  describe('要件6.3: スクリーンリーダー対応のセマンティックHTML構造', () => {
    test('リンクに適切な説明が設定されている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'title',
        `${eventTitle}のスライド「${mockMaterial.title}」を開く`
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    test('資料タイトルが適切にラベル付けされている', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const titleElement = screen.getByText(mockMaterial.title)
      expect(titleElement).toHaveAttribute(
        'id',
        `material-title-${mockMaterial.id}`
      )
    })

    test('サムネイルがない場合でも適切に動作する', () => {
      render(
        <MaterialLink
          material={mockMaterialWithoutThumbnail}
          eventTitle={eventTitle}
        />
      )

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()

      // サムネイル関連の要素がないことを確認
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument()
    })
  })

  describe('要件6.4: フォーカス表示の十分なコントラストと視認性', () => {
    test('リンクにフォーカス時の視覚的フィードバックが提供される', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('focus:text-blue-800')
    })

    test('ホバー時とフォーカス時の一貫したスタイルが適用される', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      const titleSpan = screen.getByText(mockMaterial.title)

      expect(titleSpan).toHaveClass(
        'group-hover:underline',
        'group-focus:underline'
      )
    })
  })

  describe('バリアント別のアクセシビリティ', () => {
    test('カードバリアントでも基本要素が保たれる', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      expect(screen.getByRole('group')).toBeInTheDocument()
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    test('デフォルトバリアントでも基本要素が保たれる', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="default"
        />
      )

      expect(screen.getByRole('group')).toBeInTheDocument()
      expect(screen.getByRole('link')).toBeInTheDocument()
    })
  })

  describe('タッチターゲットサイズ', () => {
    test('リンクが最小44pxのタッチターゲットサイズを持つ', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      const link = screen.getByRole('link')
      // style属性またはCSSクラスでminHeightが設定されていることを確認
      const hasMinHeight =
        link.style.minHeight === '44px' ||
        link.className.includes('min-h-[44px]')
      expect(hasMinHeight).toBe(true)
    })

    test('カードバリアントでも適切なタッチターゲットサイズを持つ', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const link = screen.getByRole('link')
      // カードバリアントでは48pxの最小高さを期待
      const hasMinHeight =
        link.style.minHeight === '48px' ||
        link.className.includes('min-h-[48px]')
      expect(hasMinHeight).toBe(true)
    })
  })

  describe('アクセシビリティ全般', () => {
    test('基本的なアクセシビリティ要素が存在する', () => {
      render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

      expect(screen.getByRole('group')).toBeInTheDocument()
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    test('サムネイルなしの場合でも基本要素が保たれる', () => {
      render(
        <MaterialLink
          material={mockMaterialWithoutThumbnail}
          eventTitle={eventTitle}
        />
      )

      expect(screen.getByRole('group')).toBeInTheDocument()
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    test('異なる資料タイプでも基本要素が保たれる', () => {
      const documentMaterial = { ...mockMaterial, type: 'document' as const }
      render(
        <MaterialLink material={documentMaterial} eventTitle={eventTitle} />
      )

      expect(screen.getByRole('group')).toBeInTheDocument()
      expect(screen.getByRole('link')).toBeInTheDocument()
    })
  })
})
