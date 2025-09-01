// Performance test setup
// Enable garbage collection for memory tests
if (typeof global.gc === 'undefined') {
  // Mock gc function if not available
  ;(global as any).gc = () => {
    // No-op if gc is not available
  }
}

// Set longer timeout for performance tests
jest.setTimeout(120000) // 2 minutes

// Mock AWS SDK clients to avoid actual AWS calls
jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/client-secrets-manager')
jest.mock('@aws-sdk/client-sns')
jest.mock('@aws-sdk/lib-dynamodb')

// Mock console methods to reduce noise in test output
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})
