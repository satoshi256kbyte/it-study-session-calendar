/**
 * MaterialLink カードバリアントテスト
 * 要件4.3, 4.4の検証
 */

import { render, screen } from '@testing-library/react'
import MaterialLink from '../MaterialLink'
import { Material } from '../../types/eventMaterial'

const mockMaterial: Material = {
  id: '1',
  title: 'Reactの新機能について',
  url: 'https://example.com/react-features',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  type: 'slide',
  createdAt: '2024-01-15T10:00:00Z',
}

const mockMaterialWithoutThumbnail: Material = {
  id: '2',
  title: 'Vue.js入門',
  url: 'https://example.com/vue-intro',
  type: 'document',
  createdAt: '2024-01-15T11:00:00Z',
}

const eventTitle = 'React勉強会 #42'

describe('MaterialLink Card Variant', () => {
  describe('要件4.3: カード内での資料リンクの最適化を実装', () => {
    test('カードバリアントで適切なスタイルが適用される', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const container = screen.getByRole('group')
      expect(container.className).toContain('border-l-2')
      expect(container.className).toContain('border-transparent')

      const link = screen.getByRole('link')
      expect(link.className).toContain('font-medium')
      expect(link.className).toContain('min-h-[48px]')
    })

    test('カードバリアントで資料タイプが適切に表示される', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const typeDisplay = screen.getByText('スライド')
      expect(typeDisplay.parentElement?.className).toContain('font-medium')

      // カードバリアントでは資料タイプがバッジ形式で表示される
      const badge = screen.getByText('スライド')
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('rounded-full')
    })

    test('カードバリアントで資料タイトルが強調表示される', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const titleElement = screen.getByText(mockMaterial.title)
      expect(titleElement.className).toContain('font-semibold')
      expect(titleElement.className).toContain('leading-6')
      expect(titleElement.className).toContain('text-gray-900')
    })
  })

  describe('要件4.4: モバイルに適したサムネイルサイズの調整を実装', () => {
    test('カードバリアントでサムネイルサイズが最適化される', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const thumbnailContainer = screen.getByRole('img')
      expect(thumbnailContainer.className).toContain('w-16')
      expect(thumbnailContainer.className).toContain('h-12')
      expect(thumbnailContainer.className).toContain('sm:w-20')
      expect(thumbnailContainer.className).toContain('sm:h-16')
      expect(thumbnailContainer.className).toContain('shadow-sm')
    })

    test('サムネイルがない場合でもカードバリアントが正常に動作する', () => {
      render(
        <MaterialLink
          material={mockMaterialWithoutThumbnail}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link.className).toContain('font-medium')

      const titleElement = screen.getByText(mockMaterialWithoutThumbnail.title)
      expect(titleElement.className).toContain('font-semibold')
    })

    test('デフォルトバリアントとカードバリアントで異なるスタイルが適用される', () => {
      const { rerender } = render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="default"
        />
      )

      const defaultLink = screen.getByRole('link')
      const defaultClasses = defaultLink.className

      rerender(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const cardLink = screen.getByRole('link')
      const cardClasses = cardLink.className

      // カードバリアントの方がより大きなパディングとフォントウェイトを持つ
      expect(cardClasses).toContain('font-medium')
      expect(cardClasses).toContain('min-h-[48px]')
      expect(defaultClasses).toContain('min-h-[44px]')
    })
  })

  describe('タッチ操作の最適化', () => {
    test('カードバリアントで適切なタッチターゲットサイズが設定される', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveStyle({ minHeight: '48px' })
      expect(link.className).toContain('touch-manipulation')
    })

    test('カードバリアントでアイコンサイズが調整される', () => {
      render(
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      )

      // 外部リンクアイコンがカード用に大きくなっていることを確認
      const link = screen.getByRole('link')
      const svgElements = link.querySelectorAll('svg')

      // 外部リンクアイコン（最後のSVG）がカード用サイズになっている
      const externalLinkIcon = svgElements[svgElements.length - 1]
      // カードバリアントでは h-4 w-4 のクラスが適用される
      expect(externalLinkIcon.getAttribute('class')).toMatch(/h-4|w-4/)
    })
  })
})
