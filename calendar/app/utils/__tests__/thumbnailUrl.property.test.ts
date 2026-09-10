import fc from 'fast-check'
import { isDisplayableThumbnailUrl } from '../thumbnailUrl'

/**
 * Feature: 07-original-calendar-ui, Property 6: サムネイル表示可否は URL の有効性と同値
 *
 * 任意の文字列または未定義値について、`isDisplayableThumbnailUrl` は、値が undefined・
 * 空文字・空白のみ・http/https 以外または解析不能な無効 URL のいずれかであるとき false を
 * 返し、http/https の絶対 URL であるときのみ true を返す。
 *
 * Validates: Requirements 6.1, 6.2, 7.4, 7.5
 */
describe('isDisplayableThumbnailUrl プロパティテスト', () => {
  /**
   * 期待値を独立に算出する参照実装。
   * テスト対象と同じロジックを別経路で表現し、同値であることを検証する。
   */
  const expectDisplayable = (url?: string): boolean => {
    if (typeof url !== 'string') {
      return false
    }
    const trimmed = url.trim()
    if (trimmed === '') {
      return false
    }
    try {
      const parsed = new URL(trimmed)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  it('Property 6: 表示可否は http/https 絶対 URL であることと同値である', () => {
    // 空文字・空白のみ・非 http(s)・不正 URL・正当な https を織り交ぜた入力空間
    const emptyOrBlankArb = fc.constantFrom(
      '',
      ' ',
      '   ',
      '\t',
      '\n',
      ' \t\n '
    )

    const invalidUrlArb = fc.constantFrom(
      'not a url',
      'example.com/image.png',
      '/relative/path.png',
      '://missing-scheme',
      'http://',
      'https://',
      'javascript:alert(1)'
    )

    const nonHttpUrlArb = fc.constantFrom(
      'ftp://example.com/file.png',
      'file:///etc/passwd',
      'data:image/png;base64,iVBORw0KGgo=',
      'mailto:someone@example.com',
      'ws://example.com/socket'
    )

    const validHttpUrlArb = fc
      .webUrl({ withQueryParameters: true, withFragments: true })
      .filter(u => u.startsWith('http://') || u.startsWith('https://'))

    // 任意文字列も混ぜて入力空間を広く保つ
    const arbitraryStringArb = fc.string()

    const urlArb = fc.oneof(
      fc.constant(undefined),
      emptyOrBlankArb,
      invalidUrlArb,
      nonHttpUrlArb,
      validHttpUrlArb,
      arbitraryStringArb
    )

    fc.assert(
      fc.property(urlArb, url => {
        expect(isDisplayableThumbnailUrl(url)).toBe(expectDisplayable(url))
      }),
      { numRuns: 100 }
    )
  })
})
