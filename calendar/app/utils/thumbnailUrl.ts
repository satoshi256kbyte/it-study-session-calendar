/**
 * サムネイルURL検証ユーティリティ
 *
 * サムネイルURLの表示可否判定のみを単一責任で提供する。
 */

/**
 * 表示可能なサムネイルURLか判定する。
 *
 * 以下はいずれも false を返す（Requirement 6.2, 7.4, 7.5）:
 * - undefined
 * - 空文字
 * - 空白のみの文字列
 * - http/https 以外のスキーム
 * - 解析不能な（無効な）URL
 *
 * http/https の絶対URLのみ true を返す（Requirement 6.1）。
 *
 * @param url 判定対象のURL文字列（未定義可）
 * @returns 表示可能なサムネイルURLであれば true
 */
export function isDisplayableThumbnailUrl(url?: string): boolean {
  if (typeof url !== 'string') {
    return false
  }

  const trimmed = url.trim()
  if (trimmed === '') {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    // 解析不能な URL（相対URL・不正な文字列など）
    return false
  }

  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}
