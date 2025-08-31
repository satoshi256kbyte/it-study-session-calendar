/**
 * StudySessionRegisterButtonコンポーネントのテスト
 * 要件2.1, 2.2, 4.2, 5.1のテスト検証
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StudySessionRegisterButton from '../StudySessionRegisterButton'

// Next.js Linkのモック
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

describe('StudySessionRegisterButton', () => {
  describe('基本レンダリング', () => {
    it('デフォルトプロパティで正しくレンダリングされる', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link', {
        name: /勉強会の登録依頼ページへ移動/i,
      })
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent('勉強会の登録依頼')
      expect(link).toHaveAttribute('href', '/register')
    })

    it('アイコンが表示される', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      const icon = link.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-4', 'h-4', 'mr-2')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('適切なARIA属性が設定される', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('aria-label', '勉強会の登録依頼ページへ移動')
    })
  })

  describe('displayMode プロパティ', () => {
    it('header モードで正しいクラスが適用される', () => {
      render(<StudySessionRegisterButton displayMode="header" />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'inline-flex',
        'items-center',
        'px-4',
        'py-2',
        'border',
        'border-transparent',
        'text-sm',
        'font-medium',
        'rounded-md',
        'text-white',
        'bg-blue-600',
        'hover:bg-blue-700',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500',
        'button-optimized'
      )
    })

    it('mobile-section モードで正しいクラスが適用される', () => {
      render(<StudySessionRegisterButton displayMode="mobile-section" />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'w-full',
        'justify-center',
        'py-3',
        'text-base',
        'font-semibold'
      )
    })
  })

  describe('responsive プロパティ', () => {
    it('responsive=true かつ displayMode=header で適切なレスポンシブクラスが適用される', () => {
      render(
        <StudySessionRegisterButton displayMode="header" responsive={true} />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveClass('hidden', 'sm:inline-flex')
    })

    it('responsive=true かつ displayMode=mobile-section で適切なレスポンシブクラスが適用される', () => {
      render(
        <StudySessionRegisterButton
          displayMode="mobile-section"
          responsive={true}
        />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveClass('block', 'sm:hidden')
    })

    it('responsive=false では追加のレスポンシブクラスが適用されない', () => {
      render(
        <StudySessionRegisterButton displayMode="header" responsive={false} />
      )

      const link = screen.getByRole('link')
      expect(link).not.toHaveClass('hidden', 'sm:inline-flex')
    })
  })

  describe('className プロパティ', () => {
    it('カスタムクラス名が適用される', () => {
      render(<StudySessionRegisterButton className="custom-class" />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('custom-class')
    })

    it('カスタムクラス名が既存のクラスと併用される', () => {
      render(<StudySessionRegisterButton className="custom-class" />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('custom-class')
      expect(link).toHaveClass('inline-flex', 'items-center') // 既存のクラスも保持
    })
  })

  describe('アクセシビリティ', () => {
    it('キーボードナビゲーションが可能', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/register')
      // Linkコンポーネントは自動的にキーボードアクセス可能
    })

    it('スクリーンリーダー用の適切なラベルが設定される', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('aria-label', '勉強会の登録依頼ページへ移動')
    })

    it('アイコンが装飾的要素として適切にマークされる', () => {
      render(<StudySessionRegisterButton />)

      const icon = screen.getByRole('link').querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('スタイリング', () => {
    it('基本的なボタンスタイルが適用される', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'bg-blue-600',
        'text-white',
        'rounded-md',
        'font-medium'
      )
    })

    it('ホバーとフォーカス状態のスタイルが適用される', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'hover:bg-blue-700',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500'
      )
    })

    it('パフォーマンス最適化クラスが適用される', () => {
      render(<StudySessionRegisterButton />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('button-optimized')
    })
  })

  describe('レスポンシブ動作の組み合わせテスト', () => {
    it('header + responsive の組み合わせが正しく動作する', () => {
      render(
        <StudySessionRegisterButton
          displayMode="header"
          responsive={true}
          className="test-class"
        />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'hidden', // モバイルで非表示
        'sm:inline-flex', // デスクトップで表示
        'test-class' // カスタムクラス
      )
      expect(link).not.toHaveClass('w-full', 'justify-center') // mobile-section用のクラスは適用されない
    })

    it('mobile-section + responsive の組み合わせが正しく動作する', () => {
      render(
        <StudySessionRegisterButton
          displayMode="mobile-section"
          responsive={true}
          className="test-class"
        />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveClass(
        'block', // モバイルで表示
        'sm:hidden', // デスクトップで非表示
        'w-full', // mobile-section用のスタイル
        'justify-center',
        'py-3',
        'text-base',
        'font-semibold',
        'test-class' // カスタムクラス
      )
    })
  })

  describe('エッジケース', () => {
    it('空のclassNameが渡されても正常に動作する', () => {
      render(<StudySessionRegisterButton className="" />)

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent('勉強会の登録依頼')
    })

    it('undefinedのclassNameが渡されても正常に動作する', () => {
      render(<StudySessionRegisterButton className={undefined} />)

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent('勉強会の登録依頼')
    })

    it('すべてのプロパティが同時に指定されても正常に動作する', () => {
      render(
        <StudySessionRegisterButton
          displayMode="mobile-section"
          responsive={true}
          className="custom-class"
        />
      )

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent('勉強会の登録依頼')
      expect(link).toHaveAttribute('href', '/register')
      expect(link).toHaveAttribute('aria-label', '勉強会の登録依頼ページへ移動')
    })
  })
})
