import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Global mocks for browser APIs
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
})

Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn().mockImplementation(callback => {
    return setTimeout(callback, 16)
  }),
  writable: true,
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn().mockImplementation(id => {
    clearTimeout(id)
  }),
  writable: true,
})

// Mock API responses for testing
const server = setupServer(
  // Mock the event materials API
  http.get('/api/events/materials', () => {
    const events = [
      {
        id: 'test-event-1',
        title: 'テストイベント1',
        eventDate: '2024-01-15T19:00:00+09:00',
        eventUrl: 'https://connpass.com/event/123/',
        connpassUrl: 'https://connpass.com/event/123/',
        materials: [
          {
            id: 'material-1',
            title: 'テスト資料1',
            url: 'https://example.com/slide1',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
            type: 'slide' as const,
            createdAt: '2024-01-15T20:00:00+09:00',
          },
        ],
      },
      {
        id: 'test-event-2',
        title: 'テストイベント2',
        eventDate: '2024-01-20T14:00:00+09:00',
        eventUrl: 'https://connpass.com/event/456/',
        connpassUrl: 'https://connpass.com/event/456/',
        materials: [
          {
            id: 'material-2',
            title: 'テスト資料2',
            url: 'https://example.com/slide2',
            type: 'document' as const,
            createdAt: '2024-01-20T15:00:00+09:00',
          },
        ],
      },
    ]

    return HttpResponse.json({
      count: events.length,
      total: events.length,
      events: events,
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
