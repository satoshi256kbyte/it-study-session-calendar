/**
 * イベント資料関連の型定義
 * connpassイベントで資料があるもののみを対象とした型制約を含む
 * 要件1.2, 2.1に対応
 */

/**
 * 資料の種類
 */
export type MaterialType = 'slide' | 'document' | 'video' | 'other'

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

  /** イベント作成日時 */
  createdAt?: string

  /** イベント更新日時 */
  updatedAt?: string
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

  /** 開始位置（ページネーション用） */
  start?: number

  /** 取得件数（ページネーション用） */
  count?: number
}

/**
 * DynamoDB用のイベントデータ構造
 * 要件6.1, 6.2に対応
 */
export interface EventRecord {
  /** パーティションキー: イベントID */
  eventId: string

  /** イベントタイトル */
  title: string

  /** イベント開催日時 (ISO 8601形式) */
  eventDate: string

  /** イベントページURL */
  eventUrl: string

  /** connpass URL（必須、connpassイベントのみ対象） */
  connpassUrl: string

  /** イベントステータス */
  status: 'approved' | 'pending' | 'rejected'

  /** 資料情報の配列 */
  materials: Material[]

  /** 作成日時 */
  createdAt: string

  /** 更新日時 */
  updatedAt: string
}

/**
 * connpass API v2からの資料データ
 * 要件6.1に対応
 */
export interface ConnpassPresentationData {
  /** 資料タイトル */
  title: string

  /** 資料URL */
  url: string

  /** サムネイルURL（利用可能な場合） */
  thumbnail_url?: string

  /** 資料の種類（connpass APIから推定） */
  type?: string
}

/**
 * connpass API v2のレスポンス構造
 * 要件6.1に対応
 */
export interface ConnpassPresentationsResponse {
  /** 返却された資料数 */
  results_returned: number

  /** 利用可能な総資料数 */
  results_available: number

  /** 検索開始位置 */
  results_start: number

  /** 資料一覧 */
  presentations: ConnpassPresentationData[]
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
    ['slide', 'document', 'video', 'other'].includes(material.type) &&
    typeof material.createdAt === 'string' &&
    (material.thumbnailUrl === undefined ||
      typeof material.thumbnailUrl === 'string')
  )
}
