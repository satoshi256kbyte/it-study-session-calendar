module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.performance.test.ts'],
  testTimeout: 120000, // 2 minutes timeout for performance tests
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.performance.test.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage-performance',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Run performance tests sequentially
}
