/**
 * MaterialLink ビジュアルテスト
 * カードバリアントの視覚的な違いを確認
 */

import { render } from '@testing-library/react'
import MaterialLink from '../MaterialLink'
import { Material } from '../../types/eventMaterial'

const mockMaterial: Material = {
  id: '1',
  title:
    'Reactの新機能について - Hooks、Suspense、Concurrent Featuresの詳細解説',
  url: 'https://example.com/react-features',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  type: 'slide',
  createdAt: '2024-01-15T10:00:00Z',
}

const mockMaterialVideo: Material = {
  id: '2',
  title: 'Vue.js 3.0 実践入門',
  url: 'https://example.com/vue-intro',
  thumbnailUrl: 'https://example.com/vue-thumbnail.jpg',
  type: 'video',
  createdAt: '2024-01-15T11:00:00Z',
}

const mockMaterialDocument: Material = {
  id: '3',
  title: 'TypeScript設計パターン集',
  url: 'https://example.com/typescript-patterns',
  type: 'document',
  createdAt: '2024-01-15T12:00:00Z',
}

const eventTitle = 'React勉強会 #42'

describe('MaterialLink Visual Comparison', () => {
  test('デフォルトバリアントとカードバリアントの比較', () => {
    // デフォルトバリアント
    const { container: defaultContainer } = render(
      <div data-testid="default-variant">
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="default"
        />
      </div>
    )

    // カードバリアント
    const { container: cardContainer } = render(
      <div data-testid="card-variant">
        <MaterialLink
          material={mockMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      </div>
    )

    // 両方のバリアントが正常にレンダリングされることを確認
    expect(
      defaultContainer.querySelector('[data-testid="default-variant"]')
    ).toBeInTheDocument()
    expect(
      cardContainer.querySelector('[data-testid="card-variant"]')
    ).toBeInTheDocument()

    // HTMLスナップショットの比較（開発時の参考用）
    if (process.env.NODE_ENV === 'development') {
      console.log('=== Default Variant ===')
      console.log(defaultContainer.innerHTML)
      console.log('\n=== Card Variant ===')
      console.log(cardContainer.innerHTML)
    }
  })

  test('異なる資料タイプでのカードバリアント表示', () => {
    const materials = [mockMaterial, mockMaterialVideo, mockMaterialDocument]

    materials.forEach((material, index) => {
      const { container } = render(
        <div data-testid={`material-${index}`}>
          <MaterialLink
            material={material}
            eventTitle={eventTitle}
            variant="card"
          />
        </div>
      )

      expect(
        container.querySelector(`[data-testid="material-${index}"]`)
      ).toBeInTheDocument()
    })
  })

  test('カードバリアントでの長いタイトルの表示', () => {
    const longTitleMaterial: Material = {
      ...mockMaterial,
      title:
        'React 18の新機能完全ガイド: Concurrent Features、Suspense、Server Components、そしてパフォーマンス最適化のベストプラクティス',
    }

    const { container } = render(
      <div data-testid="long-title-card">
        <MaterialLink
          material={longTitleMaterial}
          eventTitle={eventTitle}
          variant="card"
        />
      </div>
    )

    expect(
      container.querySelector('[data-testid="long-title-card"]')
    ).toBeInTheDocument()
  })
})
