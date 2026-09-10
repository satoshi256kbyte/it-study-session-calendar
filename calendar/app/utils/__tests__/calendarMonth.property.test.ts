import fc from 'fast-check'
import {
  selectEventsForMonth,
  getJstMonthRange,
  addMonths,
  YearMonth,
} from '../calendarMonth'
import {
  StudySessionEvent,
  StudySessionStatus,
} from '../../types/studySessionEvent'

/**
 * Feature: 07-original-calendar-ui, Property 1: 月内表示対象は「承認済み」かつ
 * 「JST 月境界内」と同値
 *
 * 任意のイベント配列と任意の Displayed_Month（YearMonth）について、
 * `selectEventsForMonth` の出力にイベントが含まれることは、そのイベントが
 * `status === 'approved'` であり、かつ `startDate` が当該月の JST 月初 00:00:00
 * （含む）から翌月初（含まない、すなわち末日 23:59:59.999 JST まで）の半開区間に
 * 入ることと、必要十分（同値）である。
 *
 * Validates: Requirements 2.3, 3.1, 3.4, 4.5
 */
describe('selectEventsForMonth プロパティテスト', () => {
  const STATUSES: StudySessionStatus[] = ['approved', 'pending', 'rejected']

  /**
   * 期待される「表示対象か否か」を独立に算出する参照実装。
   * テスト対象と同じ同値条件を別経路で表現する。
   */
  const shouldBeIncluded = (
    event: StudySessionEvent,
    ym: YearMonth
  ): boolean => {
    if (event.status !== 'approved') return false
    if (
      !(event.startDate instanceof Date) ||
      Number.isNaN(event.startDate.getTime())
    ) {
      return false
    }
    const { start, endExclusive } = getJstMonthRange(ym)
    const t = event.startDate.getTime()
    return t >= start.getTime() && t < endExclusive.getTime()
  }

  /** YearMonth（0-11 の月インデックス）の生成 */
  const yearMonthArb: fc.Arbitrary<YearMonth> = fc.record({
    year: fc.integer({ min: 1970, max: 2100 }),
    month: fc.integer({ min: 0, max: 11 }),
  })

  /**
   * 対象月に対する startDate を生成する Arbitrary を作る。
   * 月境界の等号・半開区間エッジを確実に含めつつ、内部・前後の月の日時も混ぜる。
   */
  const startDateArbFor = (ym: YearMonth): fc.Arbitrary<Date> => {
    const { start, endExclusive } = getJstMonthRange(ym)
    const startMs = start.getTime()
    const endMs = endExclusive.getTime()

    // 半開区間エッジ:
    // - 月初 00:00:00 JST（含む）
    // - 月初の 1ms 前（前月末＝含まない）
    // - 末日 23:59:59.999 JST（＝翌月初の 1ms 前、含む最後の瞬間）
    // - 翌月初 00:00:00 JST（含まない）
    const boundaryArb = fc.constantFrom(
      new Date(startMs), // 月初 00:00:00 JST（含む）
      new Date(startMs - 1), // 前月末（含まない）
      new Date(endMs - 1), // 末日 23:59:59.999 JST（含む）
      new Date(endMs) // 翌月初 00:00:00 JST（含まない）
    )

    // 月内・月外を広くカバーする一様な時刻
    const inRangeArb = fc
      .integer({ min: startMs, max: endMs - 1 })
      .map(ms => new Date(ms))
    const aroundArb = fc
      .integer({
        min: startMs - 3 * 24 * 60 * 60 * 1000,
        max: endMs + 3 * 24 * 60 * 60 * 1000,
      })
      .map(ms => new Date(ms))

    return fc.oneof(boundaryArb, inRangeArb, aroundArb)
  }

  /** 対象月に紐づくイベントを生成する Arbitrary を作る */
  const eventArbFor = (ym: YearMonth): fc.Arbitrary<StudySessionEvent> =>
    fc
      .record({
        id: fc.string({ minLength: 1, maxLength: 12 }),
        title: fc.string({ maxLength: 20 }),
        startDate: startDateArbFor(ym),
        status: fc.constantFrom(...STATUSES),
      })
      .map(base => ({
        ...base,
        // endDate は本プロパティの判定に無関係。startDate と同一にしておく
        endDate: base.startDate,
      }))

  it('Property 1: 出力への包含は「承認済み ∧ JST 月境界内」と同値', () => {
    const scenarioArb = yearMonthArb.chain(ym =>
      fc
        .array(eventArbFor(ym), { minLength: 0, maxLength: 30 })
        .map(events => ({ ym, events }))
    )

    fc.assert(
      fc.property(scenarioArb, ({ ym, events }) => {
        const result = selectEventsForMonth(events, ym)
        const resultSet = new Set(result)

        // 同値性: 各入力イベントについて、包含 ⇔ 参照条件
        for (const event of events) {
          expect(resultSet.has(event)).toBe(shouldBeIncluded(event, ym))
        }

        // 出力に混入した要素はすべて入力由来かつ条件を満たす
        for (const event of result) {
          expect(events.includes(event)).toBe(true)
          expect(shouldBeIncluded(event, ym)).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })
})

import { getCurrentYearMonthJst } from '../calendarMonth'

/**
 * Feature: 07-original-calendar-ui, Property 3: 初回表示月は与えられた時刻の JST 年月と一致
 *
 * 任意の時刻（Date インスタンス）について、`getCurrentYearMonthJst(now)` は、
 * その時刻を UTC+9 に射影したときの西暦年および月（0-11）と一致する。
 *
 * Validates: Requirements 3.2
 */
describe('getCurrentYearMonthJst プロパティテスト', () => {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000

  it('Property 3: 注入した Date に対し UTC+9 射影の年月と一致する', () => {
    fc.assert(
      fc.property(
        // Date を構築可能な範囲の UNIX ミリ秒を生成する
        // （年境界・月境界のエッジも広めのレンジでカバー）
        fc.integer({
          min: Date.UTC(1970, 0, 1),
          max: Date.UTC(2100, 11, 31, 23, 59, 59, 999),
        }),
        epochMs => {
          const now = new Date(epochMs)

          // 独立オラクル: 元時刻に JST オフセットを加算し UTC ゲッタで年月を読み出す
          const jstProjected = new Date(now.getTime() + JST_OFFSET_MS)
          const expectedYear = jstProjected.getUTCFullYear()
          const expectedMonth = jstProjected.getUTCMonth()

          const result = getCurrentYearMonthJst(now)

          expect(result).toEqual({ year: expectedYear, month: expectedMonth })
          // 月インデックスは 0-11 の範囲に収まる
          expect(result.month).toBeGreaterThanOrEqual(0)
          expect(result.month).toBeLessThanOrEqual(11)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: 07-original-calendar-ui, Property 2: 月移動は暦算術と一致し、前後移動は逆操作
 *
 * 任意の YearMonth について、`addMonths(ym, +1)` の直後に `addMonths(_, -1)` を
 * 適用すると元の YearMonth に戻る（逆操作）。また `addMonths` は暦上の月加算に一致し、
 * 12 月の翌月は翌年 1 月、1 月の前月は前年 12 月となる（年のロールオーバー）。
 *
 * Validates: Requirements 4.2, 4.3
 */
describe('addMonths プロパティテスト', () => {
  /** YearMonth（0-11 の月インデックス）の生成 */
  const yearMonthArbForAddMonths: fc.Arbitrary<YearMonth> = fc.record({
    year: fc.integer({ min: 1900, max: 2200 }),
    month: fc.integer({ min: 0, max: 11 }),
  })

  it('Property 2: 前後移動は逆操作で元の YearMonth に戻る', () => {
    fc.assert(
      fc.property(yearMonthArbForAddMonths, ym => {
        const forwardThenBack = addMonths(addMonths(ym, 1), -1)
        expect(forwardThenBack).toEqual(ym)

        const backThenForward = addMonths(addMonths(ym, -1), 1)
        expect(backThenForward).toEqual(ym)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 2: 月移動は暦算術（年ロールオーバー含む）と一致する', () => {
    fc.assert(
      fc.property(
        yearMonthArbForAddMonths,
        fc.integer({ min: -60, max: 60 }),
        (ym, delta) => {
          const result = addMonths(ym, delta)

          // 独立に算出した期待値（総月数ベースの暦算術）
          const totalMonths = ym.year * 12 + ym.month + delta
          const expectedYear = Math.floor(totalMonths / 12)
          const expectedMonth = ((totalMonths % 12) + 12) % 12

          expect(result).toEqual({ year: expectedYear, month: expectedMonth })
          // 月は常に 0-11 に正規化される
          expect(result.month).toBeGreaterThanOrEqual(0)
          expect(result.month).toBeLessThanOrEqual(11)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2: 年のロールオーバー（12月の翌月 / 1月の前月）', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1900, max: 2200 }), year => {
        // 12 月 (month=11) の翌月は翌年 1 月 (month=0)
        expect(addMonths({ year, month: 11 }, 1)).toEqual({
          year: year + 1,
          month: 0,
        })
        // 1 月 (month=0) の前月は前年 12 月 (month=11)
        expect(addMonths({ year, month: 0 }, -1)).toEqual({
          year: year - 1,
          month: 11,
        })
      }),
      { numRuns: 100 }
    )
  })
})
import { sortEventsForDisplay } from '../calendarMonth'

/**
 * Feature: 07-original-calendar-ui, Property 4: 表示ソートは安定な昇順で入力の置換である
 *
 * 任意のイベント配列について、`sortEventsForDisplay` の出力は、
 * (1) 有効な startDate を持つ入力イベントと同じ多重集合（置換）であり要素数が保存され、
 * (2) 隣接する任意の 2 要素が「開始日時の昇順、開始日時が等しい場合はタイトルの昇順」を
 * 満たす。
 *
 * 注: `sortEventsForDisplay` は無効な startDate（Invalid Date）を除外するため、
 * 多重集合の比較は入力のうち有効な startDate を持つ部分集合に対して行う。
 *
 * Validates: Requirements 5.1
 */
describe('sortEventsForDisplay プロパティテスト', () => {
  const STATUSES_FOR_SORT: StudySessionStatus[] = [
    'approved',
    'pending',
    'rejected',
  ]

  /** 有効な startDate を持つか（テスト対象と同じ判定） */
  const hasValidStart = (event: StudySessionEvent): boolean =>
    event.startDate instanceof Date && !Number.isNaN(event.startDate.getTime())

  /**
   * startDate の生成。昇順・同時刻の衝突を意図的に頻発させるため、
   * 少数の候補ミリ秒に集中させる。無効な Date も混ぜてフィルタ挙動を検証する。
   */
  const startDateArb: fc.Arbitrary<Date> = fc.oneof(
    // 少数の候補値に集中させ、同一開始日時（タイトル昇順の二次キー）を誘発
    fc
      .constantFrom(
        Date.UTC(2025, 0, 1, 0, 0, 0, 0),
        Date.UTC(2025, 0, 1, 12, 0, 0, 0),
        Date.UTC(2025, 5, 15, 9, 30, 0, 0),
        Date.UTC(2025, 11, 31, 23, 59, 59, 999)
      )
      .map(ms => new Date(ms)),
    // 広いレンジの一様な時刻
    fc
      .integer({
        min: Date.UTC(2000, 0, 1),
        max: Date.UTC(2100, 11, 31, 23, 59, 59, 999),
      })
      .map(ms => new Date(ms)),
    // 無効な Date（除外されるべき）
    fc.constant(new Date(NaN))
  )

  /** タイトルも少数候補に寄せ、同一開始日時での二次キー比較を確実に踏む */
  const titleArb: fc.Arbitrary<string> = fc.oneof(
    fc.constantFrom('a', 'b', 'c', 'AA', 'ab', ''),
    fc.string({ maxLength: 8 })
  )

  const eventArb: fc.Arbitrary<StudySessionEvent> = fc
    .record({
      id: fc.string({ minLength: 1, maxLength: 12 }),
      title: titleArb,
      startDate: startDateArb,
      status: fc.constantFrom(...STATUSES_FOR_SORT),
    })
    .map(base => ({
      ...base,
      endDate: base.startDate,
    }))

  /** 多重集合比較用のキー（同値でも識別できるよう全識別フィールドを含める） */
  const multisetKey = (event: StudySessionEvent): string => {
    const t = event.startDate.getTime()
    return JSON.stringify([event.id, event.title, t, event.status])
  }

  const toSortedKeyCounts = (events: StudySessionEvent[]): string[] => {
    const counts = new Map<string, number>()
    for (const e of events) {
      const k = multisetKey(e)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()].map(([k, n]) => `${k}#${n}`).sort()
  }

  it('Property 4: 出力は有効イベントの置換であり、安定な昇順を満たす', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 0, maxLength: 40 }),
        events => {
          const result = sortEventsForDisplay(events)

          // (1) 置換（多重集合の一致）: 入力の有効イベントと出力が一致する
          const validInput = events.filter(hasValidStart)
          expect(result.length).toBe(validInput.length)
          expect(toSortedKeyCounts(result)).toEqual(
            toSortedKeyCounts(validInput)
          )

          // 出力の全要素は有効な startDate を持つ（無効は除外される）
          for (const e of result) {
            expect(hasValidStart(e)).toBe(true)
          }

          // (2) 隣接ペアが昇順（開始日時 → タイトル）を満たす
          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1]
            const curr = result[i]
            const prevMs = prev.startDate.getTime()
            const currMs = curr.startDate.getTime()

            expect(prevMs).toBeLessThanOrEqual(currMs)
            if (prevMs === currMs) {
              // 同一開始日時はタイトル昇順（辞書順）
              expect(prev.title <= curr.title).toBe(true)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
import { groupEventsByJstDate } from '../calendarMonth'

/**
 * Feature: 07-original-calendar-ui, Property 5: 日付グルーピングは入力の分割で、
 * キーは JST 日付と一致し一意
 *
 * 任意のイベント配列について、`groupEventsByJstDate` の結果は、
 * (1) 各グループの `dateKey` が一意であり、
 * (2) 各イベントは自身の JST 年月日と等しい `dateKey` のグループにのみ属し、
 * (3) 全グループのイベントの和集合が入力（のうち有効な startDate を持つ部分集合）と
 *     一致する（分割）。
 *
 * 注: `groupEventsByJstDate` は無効な startDate（Invalid Date）を持つイベントを
 * 静かに除外するため、分割（(3)）の比較は入力のうち有効な startDate を持つ部分集合に
 * 対して行う。
 *
 * Validates: Requirements 5.3
 */
describe('groupEventsByJstDate プロパティテスト', () => {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000

  const STATUSES_FOR_GROUP: StudySessionStatus[] = [
    'approved',
    'pending',
    'rejected',
  ]

  /** 有効な startDate を持つか（テスト対象と同じ判定） */
  const hasValidStart = (event: StudySessionEvent): boolean =>
    event.startDate instanceof Date && !Number.isNaN(event.startDate.getTime())

  /**
   * 独立オラクル: Date を JST 射影した年月日キー（YYYY-MM-DD）を算出する。
   * テスト対象と同じ UTC+9 射影を別経路（getUTC*）で表現する。
   */
  const expectedJstDateKey = (date: Date): string => {
    const jst = new Date(date.getTime() + JST_OFFSET_MS)
    const year = jst.getUTCFullYear()
    const month = jst.getUTCMonth() + 1
    const day = jst.getUTCDate()
    return `${String(year).padStart(4, '0')}-${String(month).padStart(
      2,
      '0'
    )}-${String(day).padStart(2, '0')}`
  }

  /**
   * startDate の生成。同一 JST 日付への集中（複数イベントの同一グループ化）と、
   * 日付境界（JST 00:00 前後、UTC との日跨ぎ）を確実に踏むよう候補を混ぜる。
   * 無効な Date も混ぜて除外挙動を検証する。
   */
  const startDateArb: fc.Arbitrary<Date> = fc.oneof(
    // 同一日・日境界に集中させる候補
    fc
      .constantFrom(
        // JST 2025-06-15 の各時刻（同一グループに集約されるべき）
        Date.UTC(2025, 5, 15, 0, 0, 0, 0),
        Date.UTC(2025, 5, 15, 9, 0, 0, 0),
        // JST 日境界: 2025-06-15 00:00 JST = 2025-06-14 15:00 UTC
        Date.UTC(2025, 5, 14, 15, 0, 0, 0),
        // JST 日境界の直前: 2025-06-14 23:59:59.999 JST
        Date.UTC(2025, 5, 14, 14, 59, 59, 999),
        // UTC 日跨ぎだが JST では同日: 2025-06-15 08:59 UTC = 2025-06-15 17:59 JST
        Date.UTC(2025, 5, 15, 8, 59, 0, 0),
        // 年境界: JST 2026-01-01 00:00 = 2025-12-31 15:00 UTC
        Date.UTC(2025, 11, 31, 15, 0, 0, 0)
      )
      .map(ms => new Date(ms)),
    // 広いレンジの一様な時刻
    fc
      .integer({
        min: Date.UTC(2000, 0, 1),
        max: Date.UTC(2100, 11, 31, 23, 59, 59, 999),
      })
      .map(ms => new Date(ms)),
    // 無効な Date（除外されるべき）
    fc.constant(new Date(NaN))
  )

  const eventArb: fc.Arbitrary<StudySessionEvent> = fc
    .record({
      id: fc.string({ minLength: 1, maxLength: 12 }),
      title: fc.string({ maxLength: 16 }),
      startDate: startDateArb,
      status: fc.constantFrom(...STATUSES_FOR_GROUP),
    })
    .map(base => ({
      ...base,
      endDate: base.startDate,
    }))

  it('Property 5: 結果は入力の分割であり、キーは JST 日付と一致し一意', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 0, maxLength: 40 }),
        events => {
          const groups = groupEventsByJstDate(events)

          // (1) dateKey は一意
          const dateKeys = groups.map(g => g.dateKey)
          expect(new Set(dateKeys).size).toBe(dateKeys.length)

          // (2) 各イベントは自身の JST 年月日と等しい dateKey のグループにのみ属する
          for (const group of groups) {
            for (const event of group.events) {
              expect(hasValidStart(event)).toBe(true)
              expect(expectedJstDateKey(event.startDate)).toBe(group.dateKey)
            }
          }

          // (3) 分割: 全グループのイベントの和集合 == 入力の有効イベント（多重集合一致）
          const flattened = groups.flatMap(g => g.events)
          const validInput = events.filter(hasValidStart)

          expect(flattened.length).toBe(validInput.length)
          // 参照同一性ベースの多重集合比較（同一オブジェクトの出現回数が一致すること）
          const countRefs = (
            arr: StudySessionEvent[]
          ): Map<StudySessionEvent, number> => {
            const m = new Map<StudySessionEvent, number>()
            for (const e of arr) m.set(e, (m.get(e) ?? 0) + 1)
            return m
          }
          const flatCounts = countRefs(flattened)
          const inputCounts = countRefs(validInput)
          expect(flatCounts.size).toBe(inputCounts.size)
          for (const [event, n] of inputCounts.entries()) {
            expect(flatCounts.get(event)).toBe(n)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
import { formatYearMonthLabel } from '../calendarMonth'

/**
 * Feature: 07-original-calendar-ui, Property 8: 年月ラベルは対象の年と月を含む
 *
 * 任意の YearMonth について、`formatYearMonthLabel` が返す文字列は、
 * その年（西暦）と月（1-12 表記）の両方を可読な形で含む。
 *
 * ここでは「可読な形で含む」を、生成された文字列が
 * (1) 西暦年の 10 進表記を部分文字列として含み、
 * (2) 月インデックス（0-11）を 1-12 表記へ変換した値の 10 進表記を部分文字列として含む、
 * と定義して検証する。
 *
 * Validates: Requirements 3.3, 4.4
 */
describe('formatYearMonthLabel プロパティテスト', () => {
  /** YearMonth（0-11 の月インデックス）の生成。年境界も広めにカバーする */
  const yearMonthArbForLabel: fc.Arbitrary<YearMonth> = fc.record({
    year: fc.integer({ min: 1, max: 9999 }),
    month: fc.integer({ min: 0, max: 11 }),
  })

  it('Property 8: ラベルは対象の年（西暦）と月（1-12）を可読な形で含む', () => {
    fc.assert(
      fc.property(yearMonthArbForLabel, ym => {
        const label = formatYearMonthLabel(ym)

        // 独立オラクル: 年はそのまま、月は 0-11 → 1-12 へ変換した表記
        const expectedYearText = String(ym.year)
        const expectedMonthText = String(ym.month + 1)

        // 文字列であること
        expect(typeof label).toBe('string')

        // (1) 年（西暦）の 10 進表記を含む
        expect(label.includes(expectedYearText)).toBe(true)

        // (2) 月（1-12 表記）の 10 進表記を含む
        expect(label.includes(expectedMonthText)).toBe(true)

        // 月は 1-12 の範囲へ正規化されている（0 や 13 を露出しない）
        const monthNumber = ym.month + 1
        expect(monthNumber).toBeGreaterThanOrEqual(1)
        expect(monthNumber).toBeLessThanOrEqual(12)
      }),
      { numRuns: 100 }
    )
  })
})
