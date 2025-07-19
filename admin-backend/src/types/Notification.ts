/**
 * SNS通知メッセージの型定義
 * 勉強会登録時の管理者通知に使用される
 */

/**
 * SNS通知メッセージのタイプ
 */
export type NotificationMessageType = 'STUDY_SESSION_REGISTERED'

/**
 * 勉強会登録通知メッセージの構造
 * 要件4.1, 4.2, 4.4に対応
 */
export interface StudySessionNotificationMessage {
  /** メッセージタイプ識別子 */
  messageType: NotificationMessageType

  /** 通知送信時のタイムスタンプ (ISO 8601形式) */
  timestamp: string

  /** 勉強会の詳細情報 */
  studySession: StudySessionNotificationData

  /** 人間が読みやすい要約文 (要件4.2) */
  summary: string
}

/**
 * 通知メッセージに含まれる勉強会データ
 * 既存のStudySession型との整合性を保ちつつ、通知に必要な情報のみを含む
 */
export interface StudySessionNotificationData {
  /** 勉強会ID */
  id: string

  /** 勉強会タイトル (要件4.1) */
  title: string

  /** 開始日時 (要件4.1) */
  datetime: string

  /** 終了日時（オプション） */
  endDatetime?: string

  /** 勉強会URL */
  url: string

  /** 主催者連絡先（オプション、要件4.1の主催者情報） */
  contact?: string

  /** 登録が発生したタイムスタンプ (要件4.3) */
  registeredAt: string

  /** 勉強会のステータス（追加メタデータ、要件4.4） */
  status?: 'pending' | 'approved' | 'rejected'
}

/**
 * 通知メッセージ作成時のオプション
 */
export interface NotificationMessageOptions {
  /** カスタム要約文（指定しない場合は自動生成） */
  customSummary?: string

  /** 追加のメタデータを含めるかどうか */
  includeMetadata?: boolean
}

/**
 * 通知サービスのエラー型
 */
export interface NotificationError extends Error {
  /** エラーコード */
  code: string

  /** 勉強会ID（エラー発生時の追跡用） */
  sessionId?: string

  /** 元のエラー */
  originalError?: Error
}

/**
 * StudySessionからStudySessionNotificationDataへの変換用ユーティリティ型
 * 型安全性を確保し、既存のStudySession型との整合性を保つ
 */
export type StudySessionToNotificationData = Pick<
  import('./StudySession').StudySession,
  'id' | 'title' | 'datetime' | 'endDatetime' | 'url' | 'contact' | 'status'
> & {
  registeredAt: string
}
