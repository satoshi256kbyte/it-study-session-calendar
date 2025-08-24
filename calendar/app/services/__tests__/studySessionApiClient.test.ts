/**
 * 勉強会データ取得APIクライアントのテスト
 * 要件1.4, 4.3に対応
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  StudySessionApiClient,
  StudySessionApiError,
  fetchApprovedStudySessions,
  handleStudySessionApiError,
  fetchApprovedStudySessionsWithRetry,
} from '../studySessionApiClient'
import { StudySessionApiResponse } from '../../types/studySessionEvent'

// fetch のモック
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('StudySessionApiClient', () => {
  let client: StudySessionApiClient
  const mockBaseUrl = 'https://api.example.com'

  beforeEach(() => {
    client = new StudySessionApiClient({
      baseUrl: mockBaseUrl,
      timeout: 5000,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getApprovedStudySessions', () => {
    const mockApiResponse: StudySessionApiResponse[] = [
      {
        id: '1',
        title: 'React勉強会',
        url: 'https://connpass.com/event/123/',
        datetime: '2024-01-25T19:00:00+09:00',
        endDatetime: '2024-01-25T21:00:00+09:00',
        status: 'approved',
        createdAt: '2024-01-20T10:00:00+09:00',
        updatedAt: '2024-01-21T15:00:00+09:00',
        contact: 'test@example.com',
      },
      {
        id: '2',
        title: 'Python入門セミナー',
        url: 'https://connpass.com/event/456/',
        datetime: '2024-01-28T14:00:00+09:00',
        status: 'pending',
        createdAt: '2024-01-22T09:00:00+09:00',
        updatedAt: '2024-01-22T09:00:00+09:00',
      },
      {
        id: '3',
        title: 'AWS勉強会',
        url: 'https://connpass.com/event/789/',
        datetime: '2024-02-03T18:00:00+09:00',
        status: 'approved',
        createdAt: '2024-01-25T11:00:00+09:00',
        updatedAt: '2024-01-26T16:00:00+09:00',
      },
    ]

    it('承認済み勉強会データを正常に取得できる', async () => {
      // モックレスポンスの設定
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ sessions: mockApiResponse }),
      })

      const result = await client.getApprovedStudySessions()

      // APIが正しく呼び出されることを確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/admin/study-sessions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: expect.any(AbortSignal),
        }
      )

      // 承認済みのイベントのみが返されることを確認
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[0].title).toBe('React勉強会')
      expect(result[0].status).toBe('approved')
      expect(result[0].startDate).toEqual(new Date('2024-01-25T19:00:00+09:00'))
      expect(result[0].endDate).toEqual(new Date('2024-01-25T21:00:00+09:00'))
      expect(result[0].pageUrl).toBe('https://connpass.com/event/123/')

      expect(result[1].id).toBe('3')
      expect(result[1].title).toBe('AWS勉強会')
      expect(result[1].status).toBe('approved')
      expect(result[1].startDate).toEqual(new Date('2024-02-03T18:00:00+09:00'))
      expect(result[1].endDate).toEqual(new Date('2024-02-03T18:00:00+09:00')) // endDatetimeがない場合はstartDateと同じ
      expect(result[1].pageUrl).toBe('https://connpass.com/event/789/')
    })

    it('HTTPエラーレスポンスの場合はStudySessionApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: 'Server error' }),
      })

      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        StudySessionApiError
      )
      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      )
    })

    it('不正なレスポンス形式の場合はStudySessionApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ invalid: 'response' }),
      })

      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        StudySessionApiError
      )
      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        'Invalid API response format'
      )
    })

    it('ネットワークエラーの場合はStudySessionApiErrorをスローする', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        StudySessionApiError
      )
      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        'Failed to fetch study sessions: Network error'
      )
    })

    it('タイムアウトの場合はStudySessionApiErrorをスローする', async () => {
      // AbortErrorをシミュレート
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        StudySessionApiError
      )
      await expect(client.getApprovedStudySessions()).rejects.toThrow(
        'Request timeout after 5000ms'
      )
    })

    it('空の配列が返された場合も正常に処理する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ sessions: [] }),
      })

      const result = await client.getApprovedStudySessions()
      expect(result).toEqual([])
    })
  })
})

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

describe('fetchApprovedStudySessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('デフォルトクライアントを使用してデータを取得する', async () => {
    const mockApiResponse: StudySessionApiResponse[] = [
      {
        id: '1',
        title: 'Test Event',
        url: 'https://connpass.com/event/123/',
        datetime: '2024-01-25T19:00:00+09:00',
        status: 'approved',
        createdAt: '2024-01-20T10:00:00+09:00',
        updatedAt: '2024-01-21T15:00:00+09:00',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ sessions: mockApiResponse }),
    })

    const result = await fetchApprovedStudySessions()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Test Event')
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

describe('fetchApprovedStudySessionsWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('最初の試行で成功した場合はリトライしない', async () => {
    const mockApiResponse: StudySessionApiResponse[] = [
      {
        id: '1',
        title: 'Test Event',
        url: 'https://connpass.com/event/123/',
        datetime: '2024-01-25T19:00:00+09:00',
        status: 'approved',
        createdAt: '2024-01-20T10:00:00+09:00',
        updatedAt: '2024-01-21T15:00:00+09:00',
      },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sessions: mockApiResponse }),
    })

    const result = await fetchApprovedStudySessionsWithRetry(3, 1000)
    expect(result).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('リトライ可能なエラーの場合は指定回数リトライする', async () => {
    // 最初の2回は失敗、3回目は成功
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ sessions: [] }),
      })

    const promise = fetchApprovedStudySessionsWithRetry(3, 100)

    // タイマーを進める
    await vi.advanceTimersByTimeAsync(100) // 1回目のリトライ
    await vi.advanceTimersByTimeAsync(200) // 2回目のリトライ

    const result = await promise
    expect(result).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('リトライ不可能なエラーの場合は即座に失敗する', async () => {
    const apiError = new StudySessionApiError('Bad Request', 400)
    mockFetch.mockRejectedValueOnce(apiError)

    await expect(fetchApprovedStudySessionsWithRetry(3, 100)).rejects.toThrow(
      apiError
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('すべてのリトライが失敗した場合は最後のエラーをスローする', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValue(networkError)

    const promise = fetchApprovedStudySessionsWithRetry(2, 100)

    // タイマーを進める
    await vi.advanceTimersByTimeAsync(100) // 1回目のリトライ

    await expect(promise).rejects.toThrow(networkError)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
