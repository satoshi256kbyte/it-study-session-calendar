/**
 * フロントエンド用イベント資料関連の型定義
 * connpassイベントで資料があるもののみを対象とした型制約を含む
 * 要件1.2, 2.1に対応
 */

/**
 * 資料の種類
 */
export type MaterialType = 'slide' | 'document' | 'video' | 'blog' | 'other'

/**
 * 個別の資料情報
 * 要件3.1, 3.2に対応
 */
export interface Material {
  /** 資料ID */
  id: string

  /** 資料タイトル */
  title: string

  /** 資料URL */
  url: string

  /** サムネイルURL（利用可能な場合のみ、要件3.2） */
  thumbnailUrl?: string

  /** 資料の種類 */
  type: MaterialType

  /** 資料作成日時 (ISO 8601形式) */
  createdAt: string
}

/**
 * 資料付きイベント情報
 * connpassイベントで資料があるもののみを表示対象とする（要件1.2）
 */
export interface EventWithMaterials {
  /** イベントID */
  id: string

  /** イベントタイトル（要件2.1） */
  title: string

  /** イベント開催日時 (ISO 8601形式、要件2.3) */
  eventDate: string

  /** イベントページURL（要件2.2） */
  eventUrl: string

  /** 資料一覧（空でない配列、資料があるもののみ表示対象） */
  materials: Material[]

  /** connpass URL（必須、connpassイベントのみ対象、要件1.2） */
  connpassUrl: string
}

/**
 * イベント資料一覧のAPIレスポンス型
 * 要件5.1に対応
 */
export interface EventMaterialsResponse {
  /** 返却されたイベント数 */
  count: number

  /** 利用可能な総イベント数 */
  total: number

  /** イベント一覧（connpassイベントで資料があるもののみ） */
  events: EventWithMaterials[]
}

/**
 * イベント資料取得APIのクエリパラメータ
 * 要件1.2（過去6ヶ月分）に対応
 */
export interface EventMaterialsQuery {
  /** 取得する月数（デフォルト: 6） */
  months?: number
}

/**
 * コンポーネントのProps型定義
 */

/**
 * EventMaterialsTableコンポーネントのProps
 */
export interface EventMaterialsTableProps {
  /** イベント一覧 */
  events: EventWithMaterials[]

  /** ローディング状態 */
  loading: boolean

  /** エラー状態 */
  error?: string | null
}

/**
 * MaterialLinkコンポーネントのProps
 */
export interface MaterialLinkProps {
  /** 資料情報 */
  material: Material

  /** イベントタイトル（アクセシビリティ用） */
  eventTitle: string

  /** 表示バリアント（カード用の最適化） */
  variant?: 'default' | 'card'
}

/**
 * EventMaterialsListコンポーネントの状態管理用型
 */
export interface EventMaterialsState {
  /** イベント一覧 */
  events: EventWithMaterials[]

  /** ローディング状態 */
  loading: boolean

  /** エラーメッセージ */
  error: string | null

  /** 最後の更新時刻 */
  lastUpdated: Date | null
}

/**
 * API呼び出し用のフック戻り値型
 */
export interface UseEventMaterialsReturn {
  /** イベント一覧 */
  events: EventWithMaterials[]

  /** ローディング状態 */
  loading: boolean

  /** エラーメッセージ */
  error: string | null

  /** データ再取得関数 */
  refetch: () => Promise<void>

  /** 手動リフレッシュ関数 */
  refresh: () => void
}

/**
 * 型ガード: EventWithMaterialsの検証
 * connpassイベントかつ資料があるもののみを対象とする制約をチェック
 */
export function isValidEventWithMaterials(
  event: any
): event is EventWithMaterials {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.eventDate === 'string' &&
    typeof event.eventUrl === 'string' &&
    typeof event.connpassUrl === 'string' && // connpass URLが必須
    Array.isArray(event.materials) &&
    event.materials.length > 0 && // 資料が存在することが必須
    event.materials.every((material: any) => isValidMaterial(material))
  )
}

/**
 * 型ガード: Materialの検証
 */
export function isValidMaterial(material: any): material is Material {
  return (
    typeof material === 'object' &&
    material !== null &&
    typeof material.id === 'string' &&
    typeof material.title === 'string' &&
    typeof material.url === 'string' &&
    ['slide', 'document', 'video', 'blog', 'other'].includes(material.type) &&
    typeof material.createdAt === 'string' &&
    (material.thumbnailUrl === undefined ||
      typeof material.thumbnailUrl === 'string')
  )
}

/**
 * ユーティリティ関数: 日付フォーマット
 * 要件2.3（YYYY/MM/DD形式）に対応
 */
export function formatEventDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Invalid date format:', dateString, error)
    }
    return dateString
  }
}

/**
 * ユーティリティ関数: 資料タイプの表示名取得
 */
export function getMaterialTypeDisplayName(type: MaterialType): string {
  const typeNames: Record<MaterialType, string> = {
    slide: 'スライド',
    document: '資料',
    video: '動画',
    blog: 'ブログ',
    other: 'その他',
  }
  return typeNames[type] || 'その他'
}
