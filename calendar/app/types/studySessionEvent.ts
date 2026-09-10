/**
 * Twitter共有機能用の勉強会イベント型定義
 * DynamoDBからの勉強会データ構造を定義
 * 要件1.4に対応
 */

/**
 * 勉強会イベントの承認ステータス
 */
export type StudySessionStatus = 'approved' | 'pending' | 'rejected'

/**
 * 勉強会イベント情報
 * 管理者向けAPIから取得される承認済み勉強会データの構造
 * 要件1.4に対応
 */
export interface StudySessionEvent {
  /** イベントID */
  id: string

  /** イベントタイトル */
  title: string

  /** イベント開始日時 (ISO 8601形式) */
  startDate: Date

  /** イベント終了日時 (ISO 8601形式) */
  endDate: Date

  /** 承認ステータス */
  status: StudySessionStatus

  /** イベントページURL（connpass URLなど） */
  pageUrl?: string

  /** 作成日時 (ISO 8601形式) */
  createdAt?: string

  /** 更新日時 (ISO 8601形式) */
  updatedAt?: string

  /** 単一のサムネイルURL（無ければ undefined）（要件7.1, 7.3に対応） */
  thumbnailUrl?: string
}

/**
 * バックエンド Material の部分型（サムネイル参照に必要な範囲のみ）
 * 各 Material は thumbnailUrl を任意で持つ
 */
export interface StudySessionMaterialApiResponse {
  /** サムネイルURL（オプション） */
  thumbnailUrl?: string

  // 他フィールド（id/title/url/type など）は本機能では不要のため任意扱い
  [key: string]: unknown
}

/**
 * 管理者向けAPIからの勉強会データレスポンス型
 * DynamoDBのStudySessionデータ構造に対応
 */
export interface StudySessionApiResponse {
  /** イベントID */
  id: string

  /** イベントタイトル */
  title: string

  /** イベントページURL */
  url: string

  /** イベント開始日時 (ISO 8601文字列) */
  datetime: string

  /** イベント終了日時 (ISO 8601文字列、オプション) */
  endDatetime?: string

  /** 承認ステータス */
  status: StudySessionStatus

  /** 作成日時 (ISO 8601文字列) */
  createdAt: string

  /** 更新日時 (ISO 8601文字列) */
  updatedAt: string

  /** 連絡先（オプション） */
  contact?: string

  /** 資料配列（存在する場合のみ）。サムネイル派生に使用（要件7.2, 7.3に対応） */
  materials?: StudySessionMaterialApiResponse[]
}

/**
 * 勉強会一覧APIのレスポンス型
 */
export interface StudySessionListResponse {
  /** 返却されたイベント数 */
  count: number

  /** 利用可能な総イベント数 */
  total: number

  /** 勉強会イベント一覧 */
  events: StudySessionApiResponse[]
}

/**
 * 型ガード: StudySessionApiResponseの検証
 */
export function isValidStudySessionApiResponse(
  data: any
): data is StudySessionApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.url === 'string' &&
    typeof data.datetime === 'string' &&
    ['approved', 'pending', 'rejected'].includes(data.status) &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    (data.endDatetime === undefined || typeof data.endDatetime === 'string') &&
    (data.contact === undefined || typeof data.contact === 'string') &&
    // materials は無いか、配列であること（要素の厳密検証はしない）
    (data.materials === undefined || Array.isArray(data.materials))
  )
}

/**
 * 型ガード: StudySessionEventの検証
 */
export function isValidStudySessionEvent(
  event: any
): event is StudySessionEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    event.startDate instanceof Date &&
    event.endDate instanceof Date &&
    ['approved', 'pending', 'rejected'].includes(event.status) &&
    (event.pageUrl === undefined || typeof event.pageUrl === 'string') &&
    (event.createdAt === undefined || typeof event.createdAt === 'string') &&
    (event.updatedAt === undefined || typeof event.updatedAt === 'string')
  )
}

/**
 * APIレスポンスをStudySessionEventに変換するユーティリティ関数
 * 要件1.4に対応
 */
export function convertApiResponseToStudySessionEvent(
  apiResponse: StudySessionApiResponse
): StudySessionEvent {
  // materials の中で thumbnailUrl が非空文字列である最初の要素の値を単一URLとして派生
  const thumbnailUrl = apiResponse.materials?.find(
    m => typeof m?.thumbnailUrl === 'string' && m.thumbnailUrl.trim() !== ''
  )?.thumbnailUrl

  return {
    id: apiResponse.id,
    title: apiResponse.title,
    startDate: new Date(apiResponse.datetime),
    endDate: apiResponse.endDatetime
      ? new Date(apiResponse.endDatetime)
      : new Date(apiResponse.datetime),
    status: apiResponse.status,
    pageUrl: apiResponse.url,
    createdAt: apiResponse.createdAt,
    updatedAt: apiResponse.updatedAt,
    thumbnailUrl, // 空/空白/無しは undefined 相当（表示側で最終判定）
  }
}

/**
 * 当月かつ現在日以降のイベントをフィルタリングするユーティリティ関数
 * 要件1.1に対応
 */
export function filterUpcomingEventsThisMonth(
  events: StudySessionEvent[]
): StudySessionEvent[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDate = now.getDate()

  return events.filter(event => {
    const eventDate = event.startDate
    const eventYear = eventDate.getFullYear()
    const eventMonth = eventDate.getMonth()
    const eventDateNum = eventDate.getDate()

    // 当月かつ現在日以降のイベントのみ
    return (
      eventYear === currentYear &&
      eventMonth === currentMonth &&
      eventDateNum >= currentDate &&
      event.status === 'approved'
    )
  })
}

/**
 * イベント日付をMM/DD形式でフォーマットするユーティリティ関数
 * 要件1.3に対応
 */
export function formatEventDateForShare(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}
