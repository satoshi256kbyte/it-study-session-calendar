/**
 * StudySessionEvent 型定義とユーティリティ関数のテスト
 * 要件1.3, 1.4の検証
 */

import { describe, it, expect } from 'vitest'
import {
  formatEventDateForShare,
  filterUpcomingEventsThisMonth,
  convertApiResponseToStudySessionEvent,
  isValidStudySessionEvent,
  isValidStudySessionApiResponse,
  StudySessionEvent,
  StudySessionApiResponse,
} from '../studySessionEvent'

describe('StudySessionEvent utilities', () => {
  describe('formatEventDateForShare', () => {
    it('日付をMM/DD形式でフォーマットする（要件1.3）', () => {
      // 1月5日
      const date1 = new Date('2024-01-05T10:00:00')
      expect(formatEventDateForShare(date1)).toBe('01/05')

      // 12月25日
      const date2 = new Date('2024-12-25T15:30:00')
      expect(formatEventDateForShare(date2)).toBe('12/25')

      // 9月1日（一桁の月と日）
      const date3 = new Date('2024-09-01T09:00:00')
      expect(formatEventDateForShare(date3)).toBe('09/01')

      // 10月31日
      const date4 = new Date('2024-10-31T23:59:59')
      expect(formatEventDateForShare(date4)).toBe('10/31')
    })

    it('異なる年でも正しくフォーマットする', () => {
      const date1 = new Date('2023-03-15T10:00:00')
      const date2 = new Date('2025-07-08T14:00:00')

      expect(formatEventDateForShare(date1)).toBe('03/15')
      expect(formatEventDateForShare(date2)).toBe('07/08')
    })
  })

  describe('convertApiResponseToStudySessionEvent', () => {
    it('APIレスポンスをStudySessionEventに正しく変換する（要件1.4）', () => {
      const apiResponse: StudySessionApiResponse = {
        id: 'test-123',
        title: 'React勉強会',
        url: 'https://connpass.com/event/123/',
        datetime: '2024-01-25T19:00:00+09:00',
        endDatetime: '2024-01-25T21:00:00+09:00',
        status: 'approved',
        createdAt: '2024-01-01T10:00:00+09:00',
        updatedAt: '2024-01-02T10:00:00+09:00',
        contact: 'test@example.com',
      }

      const result = convertApiResponseToStudySessionEvent(apiResponse)

      expect(result.id).toBe('test-123')
      expect(result.title).toBe('React勉強会')
      expect(result.startDate).toEqual(new Date('2024-01-25T19:00:00+09:00'))
      expect(result.endDate).toEqual(new Date('2024-01-25T21:00:00+09:00'))
      expect(result.status).toBe('approved')
      expect(result.pageUrl).toBe('https://connpass.com/event/123/')
      expect(result.createdAt).toBe('2024-01-01T10:00:00+09:00')
      expect(result.updatedAt).toBe('2024-01-02T10:00:00+09:00')
    })

    it('endDatetimeがない場合はstartDateと同じ値を使用する', () => {
      const apiResponse: StudySessionApiResponse = {
        id: 'test-456',
        title: 'Python入門',
        url: 'https://connpass.com/event/456/',
        datetime: '2024-02-15T18:00:00+09:00',
        status: 'approved',
        createdAt: '2024-02-01T10:00:00+09:00',
        updatedAt: '2024-02-01T10:00:00+09:00',
      }

      const result = convertApiResponseToStudySessionEvent(apiResponse)

      expect(result.startDate).toEqual(new Date('2024-02-15T18:00:00+09:00'))
      expect(result.endDate).toEqual(new Date('2024-02-15T18:00:00+09:00'))
    })
  })

  describe('型ガード関数', () => {
    describe('isValidStudySessionEvent', () => {
      it('有効なStudySessionEventを正しく判定する', () => {
        const validEvent: StudySessionEvent = {
          id: 'test-123',
          title: 'テストイベント',
          startDate: new Date('2024-01-25T19:00:00'),
          endDate: new Date('2024-01-25T21:00:00'),
          status: 'approved',
          pageUrl: 'https://example.com',
          createdAt: '2024-01-01T10:00:00',
          updatedAt: '2024-01-02T10:00:00',
        }

        expect(isValidStudySessionEvent(validEvent)).toBe(true)
      })

      it('無効なオブジェクトを正しく判定する', () => {
        const invalidEvent = {
          id: 'test-123',
          title: 'テストイベント',
          startDate: '2024-01-25T19:00:00', // Dateオブジェクトではない
          endDate: new Date('2024-01-25T21:00:00'),
          status: 'approved',
        }

        expect(isValidStudySessionEvent(invalidEvent)).toBe(false)
      })
    })

    describe('isValidStudySessionApiResponse', () => {
      it('有効なAPIレスポンスを正しく判定する', () => {
        const validResponse: StudySessionApiResponse = {
          id: 'test-123',
          title: 'テストイベント',
          url: 'https://example.com',
          datetime: '2024-01-25T19:00:00+09:00',
          status: 'approved',
          createdAt: '2024-01-01T10:00:00+09:00',
          updatedAt: '2024-01-02T10:00:00+09:00',
        }

        expect(isValidStudySessionApiResponse(validResponse)).toBe(true)
      })

      it('無効なAPIレスポンスを正しく判定する', () => {
        const invalidResponse = {
          id: 'test-123',
          title: 'テストイベント',
          // url が欠けている
          datetime: '2024-01-25T19:00:00+09:00',
          status: 'approved',
          createdAt: '2024-01-01T10:00:00+09:00',
          updatedAt: '2024-01-02T10:00:00+09:00',
        }

        expect(isValidStudySessionApiResponse(invalidResponse)).toBe(false)
      })
    })
  })
})
