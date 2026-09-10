/**
 * Property 7: 変換後サムネイルは単一の非空文字列または未定義
 *
 * Feature: 07-original-calendar-ui, Property 7: 変換後サムネイルは単一の非空文字列または未定義
 *
 * convertApiResponseToStudySessionEvent が導出する thumbnailUrl は、materials の中で
 * thumbnailUrl が非空文字列である最初の要素の値（トリム前の元値）であるか、そのような
 * 要素が存在しない場合は undefined であり、いずれの場合も「単一の文字列または未定義」である。
 *
 * Validates: Requirements 7.1
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  convertApiResponseToStudySessionEvent,
  type StudySessionApiResponse,
  type StudySessionMaterialApiResponse,
} from '../studySessionEvent'

/**
 * thumbnailUrl が「非空文字列」（トリム後に空でない文字列）かを判定する。
 * 変換関数の派生ロジックと同じ定義。
 */
function isNonEmptyThumbnail(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * thumbnailUrl フィールドのジェネレータ。
 * 非空文字列・空文字・空白のみ・undefined・非文字列を織り交ぜて生成する。
 */
const thumbnailUrlArbitrary = fc.oneof(
  // 正当な非空文字列（前後空白付きの可能性も含む）
  fc.webUrl(),
  fc.string({ minLength: 1, maxLength: 20 }).map(s => `  ${s}  `),
  // 空文字・空白のみ（無効扱い）
  fc.constantFrom('', ' ', '   ', '\t', '\n'),
  // 未定義（フィールド欠落相当）
  fc.constant(undefined),
  // 非文字列（不正な型でも安全に無視されること）
  fc.integer(),
  fc.constant(null)
)

/**
 * Material のジェネレータ。thumbnailUrl は任意（欠落あり）。
 */
const materialArbitrary: fc.Arbitrary<StudySessionMaterialApiResponse> = fc
  .record(
    {
      thumbnailUrl: thumbnailUrlArbitrary,
    },
    { requiredKeys: [] }
  )
  .map(m => m as StudySessionMaterialApiResponse)

/**
 * StudySessionApiResponse のジェネレータ。materials は任意の内容・順序。
 */
const apiResponseArbitrary: fc.Arbitrary<StudySessionApiResponse> = fc.record(
  {
    id: fc.string(),
    title: fc.string(),
    url: fc.webUrl(),
    datetime: fc.constant('2025-01-01T00:00:00.000Z'),
    status: fc.constantFrom('approved', 'pending', 'rejected'),
    createdAt: fc.constant('2025-01-01T00:00:00.000Z'),
    updatedAt: fc.constant('2025-01-01T00:00:00.000Z'),
    materials: fc.option(fc.array(materialArbitrary, { maxLength: 10 }), {
      nil: undefined,
    }),
  },
  {
    requiredKeys: [
      'id',
      'title',
      'url',
      'datetime',
      'status',
      'createdAt',
      'updatedAt',
    ],
  }
) as fc.Arbitrary<StudySessionApiResponse>

describe('convertApiResponseToStudySessionEvent - Property 7', () => {
  it('導出サムネイルは最初の非空要素の元値、無ければ undefined（単一の文字列または未定義）', () => {
    fc.assert(
      fc.property(apiResponseArbitrary, apiResponse => {
        const result = convertApiResponseToStudySessionEvent(apiResponse)

        // 期待値: materials の中で thumbnailUrl が非空文字列である最初の要素の「元値」
        const expected = apiResponse.materials?.find(m =>
          isNonEmptyThumbnail(m?.thumbnailUrl)
        )?.thumbnailUrl

        // 「単一の文字列または未定義」であること
        expect(
          typeof result.thumbnailUrl === 'string' ||
            result.thumbnailUrl === undefined
        ).toBe(true)

        // 導出値が期待値と一致すること（トリム前の元値、または undefined）
        expect(result.thumbnailUrl).toBe(expected)

        // 導出値が文字列の場合は非空（トリム後も空でない）であること
        if (typeof result.thumbnailUrl === 'string') {
          expect(result.thumbnailUrl.trim()).not.toBe('')
        }
      }),
      { numRuns: 100 }
    )
  })
})
