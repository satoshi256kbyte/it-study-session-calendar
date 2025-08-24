/**
 * 勉強会データ取得APIクライアントの基本テスト
 * 要件1.4, 4.3に対応
 */

import { describe, it, expect } from 'vitest'
import {
  StudySessionApiClient,
  StudySessionApiError,
  handleStudySessionApiError,
} from '../studySessionApiClient'

describe('StudySessionApiClient - Basic Tests', () => {
  describe('StudySessionApiError', () => {
    it('エラーメッセージとステータスコードを正しく設定する', () => {
      const error = new StudySessionApiError('Test error', 404)
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('StudySessionApiError')
    })

    it('レスポンスオブジェクトを保持する', () => {
      const mockResponse = { status: 500 } as Response
      const error = new StudySessionApiError('Test error', 500, mockResponse)
      expect(error.response).toBe(mockResponse)
    })
  })

  describe('handleStudySessionApiError', () => {
    it('StudySessionApiErrorを正しく処理する', () => {
      const apiError = new StudySessionApiError('API Error', 500)
      const result = handleStudySessionApiError(apiError)

      expect(result.message).toBe('API Error')
      expect(result.isRetryable).toBe(true) // 500エラーはリトライ可能
    })

    it('4xxエラーはリトライ不可能として処理する', () => {
      const apiError = new StudySessionApiError('Client Error', 400)
      const result = handleStudySessionApiError(apiError)

      expect(result.message).toBe('Client Error')
      expect(result.isRetryable).toBe(false) // 400エラーはリトライ不可能
    })

    it('408エラーはリトライ可能として処理する', () => {
      const apiError = new StudySessionApiError('Request Timeout', 408)
      const result = handleStudySessionApiError(apiError)

      expect(result.message).toBe('Request Timeout')
      expect(result.isRetryable).toBe(true) // 408エラーはリトライ可能
    })

    it('429エラーはリトライ可能として処理する', () => {
      const apiError = new StudySessionApiError('Too Many Requests', 429)
      const result = handleStudySessionApiError(apiError)

      expect(result.message).toBe('Too Many Requests')
      expect(result.isRetryable).toBe(true) // 429エラーはリトライ可能
    })

    it('一般的なErrorを正しく処理する', () => {
      const error = new Error('Network error')
      const result = handleStudySessionApiError(error)

      expect(result.message).toBe('Network error')
      expect(result.isRetryable).toBe(true) // 一般的なエラーはリトライ可能
    })

    it('不明なエラーを正しく処理する', () => {
      const result = handleStudySessionApiError('Unknown error')

      expect(result.message).toBe('Unknown error occurred')
      expect(result.isRetryable).toBe(true)
    })
  })

  describe('StudySessionApiClient - Configuration', () => {
    it('設定を正しく初期化する', () => {
      const client = new StudySessionApiClient({
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      })

      expect(client).toBeInstanceOf(StudySessionApiClient)
    })

    it('デフォルトタイムアウトを設定する', () => {
      const client = new StudySessionApiClient({
        baseUrl: 'https://api.example.com',
      })

      expect(client).toBeInstanceOf(StudySessionApiClient)
    })
  })
})
