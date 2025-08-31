# 設計書

## 概要

イベント資料一覧のレスポンシブデザイン改善機能は、現在のテーブル形式表示をモバイルデバイスに最適化し、画面サイズに応じて自動的にレイアウトを切り替える機能です。デスクトップでは従来のテーブル形式を維持し、タブレット・スマートフォンでは読みやすいカード形式の縦表示に切り替わります。この改善により、すべてのデバイスで快適にイベント資料にアクセスできるようになります。

## アーキテクチャ

### レスポンシブ設計の基本方針

```
デスクトップ (≥1024px)    タブレット (768px-1023px)    スマートフォン (<768px)
┌─────────────────┐      ┌─────────────────┐         ┌─────────────────┐
│   テーブル形式    │      │  2列カード形式   │         │  1列カード形式   │
│ ┌─┬─┬─────┐ │      │ ┌───┐ ┌───┐ │         │ ┌─────────────┐ │
│ │名│日│資料  │ │      │ │Card│ │Card│ │         │ │    Card     │ │
│ ├─┼─┼─────┤ │      │ └───┘ └───┘ │         │ └─────────────┘ │
│ │ │ │      │ │      │ ┌───┐ ┌───┐ │         │ ┌─────────────┐ │
│ └─┴─┴─────┘ │      │ │Card│ │Card│ │         │ │    Card     │ │
└─────────────────┘      │ └───┘ └───┘ │         │ └─────────────┘ │
                         └─────────────────┘         └─────────────────┘
```

### CSS メディアクエリ戦略

```css
/* デスクトップ優先のアプローチ */
.event-materials-container {
  /* デフォルト: デスクトップ用テーブル表示 */
}

@media (max-width: 1023px) {
  /* タブレット: 2列カードレイアウト */
}

@media (max-width: 767px) {
  /* スマートフォン: 1列カードレイアウト */
}
```

## コンポーネント設計

### 既存コンポーネントの拡張

#### EventMaterialsTable コンポーネント（拡張）

**責任**: レスポンシブレイアウトの制御とカード表示の実装 **場所**:
`calendar/app/components/EventMaterialsTable.tsx`

**新機能**:

- レスポンシブレイアウト検出
- カード形式とテーブル形式の切り替え
- タッチ操作最適化

#### 新規コンポーネント: EventMaterialCard

**責任**: 個別イベントのカード表示 **場所**: `calendar/app/components/EventMaterialCard.tsx`
**Props**: `event: EventWithMaterials`, `layout: 'mobile' | 'tablet'`

**構造**:

```typescript
interface EventMaterialCardProps {
  event: EventWithMaterials
  layout: 'mobile' | 'tablet'
  className?: string
}
```

#### 新規コンポーネント: ResponsiveEventMaterialsList

**責任**: レスポンシブレイアウトの管理と表示形式の決定 **場所**:
`calendar/app/components/ResponsiveEventMaterialsList.tsx`

### レスポンシブレイアウト検出

#### useResponsiveLayout カスタムフック

**責任**: 画面サイズの検出とレイアウトタイプの決定 **場所**:
`calendar/app/hooks/useResponsiveLayout.ts`

```typescript
interface ResponsiveLayoutHook {
  layoutType: 'desktop' | 'tablet' | 'mobile'
  screenWidth: number
  isTransitioning: boolean
}

const useResponsiveLayout = (): ResponsiveLayoutHook => {
  // 画面サイズの監視
  // レイアウト切り替えの検出
  // トランジション状態の管理
}
```

## データフロー

### レスポンシブ表示のフロー

```
1. ページ読み込み
   ↓
2. useResponsiveLayout でレイアウトタイプを検出
   ↓
3. ResponsiveEventMaterialsList でレイアウトを決定
   ↓
4. 条件分岐でコンポーネントを選択
   - Desktop: EventMaterialsTable (既存)
   - Tablet/Mobile: EventMaterialCard の配列
   ↓
5. 画面サイズ変更時は自動的に再レンダリング
```

### 状態管理

```typescript
interface ResponsiveState {
  layoutType: 'desktop' | 'tablet' | 'mobile'
  isTransitioning: boolean
  previousLayoutType?: 'desktop' | 'tablet' | 'mobile'
}
```

## UI/UX 設計

### カード形式のデザイン

#### モバイル用カード (< 768px)

```
┌─────────────────────────────────┐
│ 📅 2025/01/15                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ React勉強会 #42                 │
│ 🔗 connpass                    │
│                                 │
│ 📄 資料:                       │
│ • 📊 Reactの新機能について      │
│ • 📹 実演動画                   │
│ • 📝 サンプルコード             │
└─────────────────────────────────┘
```

#### タブレット用カード (768px - 1023px)

```
┌─────────────────┐ ┌─────────────────┐
│ 📅 2025/01/15   │ │ 📅 2025/01/10   │
│ ─────────────── │ │ ─────────────── │
│ React勉強会 #42 │ │ Vue.js勉強会    │
│ 🔗 connpass     │ │ 🔗 connpass     │
│                 │ │                 │
│ 📄 資料:        │ │ 📄 資料:        │
│ • 📊 React新機能│ │ • 📊 Vue3入門   │
│ • 📹 実演動画   │ │ • 📝 コード例   │
└─────────────────┘ └─────────────────┘
```

### アクセシビリティ設計

#### ARIA ラベルとロール

```typescript
// カードコンポーネントのARIA設定
<article
  role="article"
  aria-labelledby={`event-title-${event.id}`}
  aria-describedby={`event-materials-${event.id}`}
  className="event-card"
>
  <h3 id={`event-title-${event.id}`} className="event-title">
    {event.title}
  </h3>
  <div id={`event-materials-${event.id}`} className="event-materials">
    {/* 資料リスト */}
  </div>
</article>
```

#### キーボードナビゲーション

```typescript
// タブ順序の管理
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      // 次のカードにフォーカス
      break
    case 'ArrowUp':
      // 前のカードにフォーカス
      break
    case 'Enter':
    case ' ':
      // カード内の最初のリンクを開く
      break
  }
}
```

## CSS 実装戦略

### Tailwind CSS クラス設計

#### レスポンシブユーティリティクラス

```css
/* カスタムレスポンシブクラス */
@layer components {
  .event-materials-responsive {
    @apply block lg:hidden; /* モバイル・タブレット用 */
  }

  .event-materials-desktop {
    @apply hidden lg:block; /* デスクトップ用 */
  }

  .event-card-mobile {
    @apply w-full p-4 bg-white rounded-lg shadow-sm border;
  }

  .event-card-tablet {
    @apply w-full md:w-[calc(50%-0.5rem)] p-4 bg-white rounded-lg shadow-sm border;
  }
}
```

#### トランジション効果

```css
@layer components {
  .layout-transition {
    @apply transition-all duration-300 ease-in-out;
  }

  .card-enter {
    @apply opacity-0 transform scale-95;
  }

  .card-enter-active {
    @apply opacity-100 transform scale-100 transition-all duration-200;
  }
}
```

### パフォーマンス最適化

#### CSS-in-JS の回避

```typescript
// 静的CSSクラスを使用してランタイムパフォーマンスを向上
const getCardClassName = (layoutType: LayoutType) => {
  const baseClasses = 'event-card layout-transition'

  switch (layoutType) {
    case 'mobile':
      return `${baseClasses} event-card-mobile`
    case 'tablet':
      return `${baseClasses} event-card-tablet`
    default:
      return baseClasses
  }
}
```

#### 仮想化の検討

```typescript
// 大量のイベントがある場合の仮想化
import { FixedSizeList as List } from 'react-window'

const VirtualizedEventList = ({ events, layoutType }) => {
  const itemHeight = layoutType === 'mobile' ? 200 : 150

  return (
    <List
      height={600}
      itemCount={events.length}
      itemSize={itemHeight}
      itemData={events}
    >
      {({ index, style, data }) => (
        <div style={style}>
          <EventMaterialCard event={data[index]} layout={layoutType} />
        </div>
      )}
    </List>
  )
}
```

## 実装詳細

### EventMaterialCard コンポーネント

```typescript
interface EventMaterialCardProps {
  event: EventWithMaterials
  layout: 'mobile' | 'tablet'
  className?: string
}

const EventMaterialCard: React.FC<EventMaterialCardProps> = ({
  event,
  layout,
  className = ''
}) => {
  const cardClassName = useMemo(() => {
    const baseClasses = 'event-card bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow'
    const layoutClasses = layout === 'mobile'
      ? 'p-4 mb-4'
      : 'p-4 mb-4 md:mb-6'

    return `${baseClasses} ${layoutClasses} ${className}`
  }, [layout, className])

  return (
    <article
      className={cardClassName}
      role="article"
      aria-labelledby={`event-title-${event.id}`}
      aria-describedby={`event-materials-${event.id}`}
    >
      {/* イベント日付 */}
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <svg className="w-4 h-4 mr-1" /* カレンダーアイコン */>
        <time dateTime={event.eventDate}>
          {formatEventDate(event.eventDate)}
        </time>
      </div>

      {/* イベントタイトル */}
      <h3
        id={`event-title-${event.id}`}
        className="text-lg font-semibold text-gray-900 mb-2 leading-tight"
      >
        <a
          href={event.eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
          style={{ minHeight: '44px' }} // タッチターゲット最小サイズ
        >
          {event.title}
        </a>
      </h3>

      {/* connpass リンク */}
      <div className="mb-4">
        <a
          href={event.connpassUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
          style={{ minHeight: '44px', padding: '8px 0' }}
        >
          <svg className="w-4 h-4 mr-1" /* 外部リンクアイコン */>
          connpass
        </a>
      </div>

      {/* 資料リスト */}
      <div id={`event-materials-${event.id}`} className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          📄 資料 ({event.materials.length}件)
        </h4>
        <div className="space-y-2">
          {event.materials.map(material => (
            <MaterialLink
              key={material.id}
              material={material}
              eventTitle={event.title}
              variant="card" // カード用のバリアント
            />
          ))}
        </div>
      </div>
    </article>
  )
}
```

### ResponsiveEventMaterialsList コンポーネント

```typescript
const ResponsiveEventMaterialsList: React.FC<EventMaterialsTableProps> = ({
  events,
  loading,
  error
}) => {
  const { layoutType, isTransitioning } = useResponsiveLayout()

  // デスクトップ表示
  if (layoutType === 'desktop') {
    return (
      <div className="event-materials-desktop">
        <EventMaterialsTable
          events={events}
          loading={loading}
          error={error}
        />
      </div>
    )
  }

  // モバイル・タブレット表示
  return (
    <div className={`event-materials-responsive ${isTransitioning ? 'opacity-50' : ''}`}>
      <div className={
        layoutType === 'tablet'
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
          : 'space-y-4'
      }>
        {events.map(event => (
          <EventMaterialCard
            key={event.id}
            event={event}
            layout={layoutType}
          />
        ))}
      </div>
    </div>
  )
}
```

### useResponsiveLayout フック

```typescript
const useResponsiveLayout = (): ResponsiveLayoutHook => {
  const [layoutState, setLayoutState] = useState<ResponsiveState>({
    layoutType: 'desktop',
    isTransitioning: false,
  })

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth
      let newLayoutType: LayoutType

      if (width >= 1024) {
        newLayoutType = 'desktop'
      } else if (width >= 768) {
        newLayoutType = 'tablet'
      } else {
        newLayoutType = 'mobile'
      }

      if (newLayoutType !== layoutState.layoutType) {
        setLayoutState(prev => ({
          layoutType: newLayoutType,
          isTransitioning: true,
          previousLayoutType: prev.layoutType,
        }))

        // トランジション完了後にフラグをリセット
        setTimeout(() => {
          setLayoutState(prev => ({
            ...prev,
            isTransitioning: false,
          }))
        }, 300)
      }
    }

    // 初期化
    updateLayout()

    // リサイズイベントリスナー
    const debouncedUpdate = debounce(updateLayout, 150)
    window.addEventListener('resize', debouncedUpdate)

    return () => {
      window.removeEventListener('resize', debouncedUpdate)
    }
  }, [layoutState.layoutType])

  return {
    layoutType: layoutState.layoutType,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    isTransitioning: layoutState.isTransitioning,
  }
}
```

## テスト戦略

### レスポンシブテスト

#### ビューポートテスト

```typescript
describe('ResponsiveEventMaterialsList', () => {
  const mockEvents = [/* テストデータ */]

  test('デスクトップサイズでテーブル表示', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    render(<ResponsiveEventMaterialsList events={mockEvents} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  test('タブレットサイズで2列カード表示', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    render(<ResponsiveEventMaterialsList events={mockEvents} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(mockEvents.length)

    const container = screen.getByTestId('tablet-grid')
    expect(container).toHaveClass('md:grid-cols-2')
  })

  test('モバイルサイズで1列カード表示', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    })

    render(<ResponsiveEventMaterialsList events={mockEvents} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(mockEvents.length)

    const container = screen.getByTestId('mobile-stack')
    expect(container).toHaveClass('space-y-4')
  })
})
```

#### タッチ操作テスト

```typescript
test('モバイルでタッチターゲットサイズが適切', () => {
  render(<EventMaterialCard event={mockEvent} layout="mobile" />)

  const links = screen.getAllByRole('link')
  links.forEach(link => {
    const styles = window.getComputedStyle(link)
    const minHeight = parseInt(styles.minHeight)
    expect(minHeight).toBeGreaterThanOrEqual(44) // 44px minimum
  })
})
```

### アクセシビリティテスト

```typescript
test('カード形式でARIAラベルが適切に設定される', () => {
  render(<EventMaterialCard event={mockEvent} layout="mobile" />)

  const article = screen.getByRole('article')
  expect(article).toHaveAttribute('aria-labelledby')
  expect(article).toHaveAttribute('aria-describedby')

  const title = screen.getByRole('heading', { level: 3 })
  expect(title).toHaveAttribute('id')
})

test('キーボードナビゲーションが動作する', () => {
  render(<ResponsiveEventMaterialsList events={mockEvents} />)

  const firstCard = screen.getAllByRole('article')[0]
  firstCard.focus()

  fireEvent.keyDown(firstCard, { key: 'ArrowDown' })

  const secondCard = screen.getAllByRole('article')[1]
  expect(secondCard).toHaveFocus()
})
```

## パフォーマンス考慮事項

### レンダリング最適化

1. **メモ化の活用**
   - `useMemo` でレイアウト計算をキャッシュ
   - `React.memo` でコンポーネントの不要な再レンダリングを防止

2. **遅延読み込み**
   - 画面外のカードは遅延レンダリング
   - Intersection Observer API の活用

3. **CSS最適化**
   - 静的CSSクラスの使用
   - CSS-in-JSの最小化
   - GPU加速の活用（transform, opacity）

### メモリ使用量の最適化

```typescript
// 大量のイベントがある場合の仮想化
const VirtualizedCardList = ({ events, layoutType }) => {
  const itemSize = layoutType === 'mobile' ? 200 : 150

  return (
    <FixedSizeList
      height={600}
      itemCount={events.length}
      itemSize={itemSize}
      overscanCount={5} // 画面外の予備レンダリング数
    >
      {({ index, style }) => (
        <div style={style}>
          <EventMaterialCard
            event={events[index]}
            layout={layoutType}
          />
        </div>
      )}
    </FixedSizeList>
  )
}
```

## セキュリティ考慮事項

### XSS対策

```typescript
// イベントタイトルとURLのサニタイゼーション
const sanitizeEventData = (event: EventWithMaterials) => ({
  ...event,
  title: DOMPurify.sanitize(event.title),
  eventUrl: isValidUrl(event.eventUrl) ? event.eventUrl : '#',
  connpassUrl: isValidUrl(event.connpassUrl) ? event.connpassUrl : '#',
})
```

### CSP対応

```typescript
// インラインスタイルの回避
const cardStyles = {
  minHeight: '44px', // タッチターゲット
  padding: '8px 0'
}

// CSS変数での動的スタイリング
<div
  className="event-card"
  style={{ '--card-height': `${cardHeight}px` }}
>
```

## 実装順序

1. **基盤実装**
   - `useResponsiveLayout` フックの作成
   - レスポンシブユーティリティクラスの定義

2. **コンポーネント実装**
   - `EventMaterialCard` コンポーネントの作成
   - `ResponsiveEventMaterialsList` コンポーネントの作成

3. **統合とテスト**
   - 既存の `EventMaterialsList` との統合
   - レスポンシブテストの実装

4. **最適化とアクセシビリティ**
   - パフォーマンス最適化
   - アクセシビリティ対応

5. **ポリッシュ**
   - トランジション効果の追加
   - エラーハンドリングの改善
