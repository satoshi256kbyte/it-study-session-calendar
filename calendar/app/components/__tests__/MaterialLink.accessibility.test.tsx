/**
 * MaterialLink アクセシビリティテスト
 *
 * 資料リンクは箇条書き内のシンプルなテキストリンクとして表示される。
 * リンクとしての基本的なアクセシビリティ（ロール・遷移属性・説明）を検証する。
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
  test('リンクとしてレンダリングされ、資料タイトルが表示される', () => {
    render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

    const link = screen.getByRole('link', { name: mockMaterial.title })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', mockMaterial.url)
  })

  test('新しいタブで安全に開くための属性が設定されている', () => {
    render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('リンクに説明的な title 属性が設定されている', () => {
    render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'title',
      `${eventTitle}のスライド「${mockMaterial.title}」を開く`
    )
  })

  test('リンクがキーボードでアクセス可能である', () => {
    render(<MaterialLink material={mockMaterial} eventTitle={eventTitle} />)

    const link = screen.getByRole('link')
    expect(link).not.toHaveAttribute('tabIndex', '-1')
  })

  test('サムネイルがない資料でも正しく表示される', () => {
    render(
      <MaterialLink
        material={mockMaterialWithoutThumbnail}
        eventTitle={eventTitle}
      />
    )

    const link = screen.getByRole('link', {
      name: mockMaterialWithoutThumbnail.title,
    })
    expect(link).toBeInTheDocument()
    // 装飾アイコンやサムネイル画像は表示しない
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
