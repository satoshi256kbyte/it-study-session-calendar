#!/usr/bin/env node

/**
 * パフォーマンステスト実行スクリプト
 *
 * 使用方法:
 * npm run test:performance
 * または
 * npx ts-node src/test/performance-test-runner.ts
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  testFile: string
  duration: number
  passed: boolean
  output: string
  error?: string
}

interface PerformanceReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  totalDuration: number
  results: TestResult[]
  summary: {
    averageTestDuration: number
    slowestTest: string
    fastestTest: string
    memoryUsage: NodeJS.MemoryUsage
  }
}

class PerformanceTestRunner {
  private testFiles = [
    'src/services/__tests__/HiroshimaEventDiscoveryService.performance.test.ts',
    'src/handlers/__tests__/batchMaterialsHandler.performance.test.ts',
    'src/services/__tests__/ConnpassApiService.performance.test.ts',
  ]

  async runAllTests(): Promise<PerformanceReport> {
    console.log('🚀 Starting performance test suite...')
    console.log(`📋 Running ${this.testFiles.length} test files`)
    console.log('='.repeat(60))

    const startTime = Date.now()
    const initialMemory = process.memoryUsage()
    const results: TestResult[] = []

    for (const testFile of this.testFiles) {
      console.log(`\n📝 Running: ${testFile}`)
      const result = await this.runSingleTest(testFile)
      results.push(result)

      const status = result.passed ? '✅ PASSED' : '❌ FAILED'
      console.log(`${status} - ${result.duration}ms`)

      if (!result.passed && result.error) {
        console.log(`Error: ${result.error}`)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage()
    const totalDuration = endTime - startTime

    const report = this.generateReport(results, totalDuration, finalMemory)
    this.printSummary(report)
    this.saveReport(report)

    return report
  }

  private async runSingleTest(testFile: string): Promise<TestResult> {
    const startTime = Date.now()

    try {
      // Jestを使用してテストを実行
      const output = execSync(
        `npx jest ${testFile} --verbose --detectOpenHandles --forceExit`,
        {
          encoding: 'utf8',
          timeout: 300000, // 5分タイムアウト
          cwd: process.cwd(),
        }
      )

      return {
        testFile,
        duration: Date.now() - startTime,
        passed: true,
        output,
      }
    } catch (error: any) {
      return {
        testFile,
        duration: Date.now() - startTime,
        passed: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
      }
    }
  }

  private generateReport(
    results: TestResult[],
    totalDuration: number,
    memoryUsage: NodeJS.MemoryUsage
  ): PerformanceReport {
    const passedTests = results.filter(r => r.passed).length
    const failedTests = results.length - passedTests

    const durations = results.map(r => r.duration)
    const averageTestDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length

    const slowestTest = results.reduce((prev, current) =>
      prev.duration > current.duration ? prev : current
    ).testFile

    const fastestTest = results.reduce((prev, current) =>
      prev.duration < current.duration ? prev : current
    ).testFile

    return {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration,
      results,
      summary: {
        averageTestDuration,
        slowestTest,
        fastestTest,
        memoryUsage,
      },
    }
  }

  private printSummary(report: PerformanceReport): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 PERFORMANCE TEST SUMMARY')
    console.log('='.repeat(60))

    console.log(
      `⏱️  Total Duration: ${report.totalDuration}ms (${Math.round(report.totalDuration / 1000)}s)`
    )
    console.log(
      `📈 Tests: ${report.totalTests} total, ${report.passedTests} passed, ${report.failedTests} failed`
    )
    console.log(
      `⚡ Average Test Duration: ${Math.round(report.summary.averageTestDuration)}ms`
    )
    console.log(
      `🐌 Slowest Test: ${report.summary.slowestTest.split('/').pop()}`
    )
    console.log(
      `🚀 Fastest Test: ${report.summary.fastestTest.split('/').pop()}`
    )

    const memoryMB =
      Math.round((report.summary.memoryUsage.heapUsed / 1024 / 1024) * 100) /
      100
    console.log(`💾 Memory Usage: ${memoryMB}MB`)

    if (report.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:')
      report.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(
            `  - ${result.testFile.split('/').pop()}: ${result.error}`
          )
        })
    }

    console.log('\n📋 DETAILED RESULTS:')
    report.results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      const fileName = result.testFile.split('/').pop()
      console.log(`  ${status} ${fileName} - ${result.duration}ms`)
    })

    // パフォーマンス評価
    this.evaluateOverallPerformance(report)
  }

  private evaluateOverallPerformance(report: PerformanceReport): void {
    console.log('\n🎯 PERFORMANCE EVALUATION:')

    const warnings: string[] = []
    const recommendations: string[] = []

    // 全体実行時間の評価
    if (report.totalDuration > 300000) {
      // 5分
      warnings.push('Total execution time exceeds 5 minutes')
      recommendations.push(
        'Consider optimizing slow tests or running them in parallel'
      )
    } else if (report.totalDuration > 120000) {
      // 2分
      warnings.push('Total execution time exceeds 2 minutes')
      recommendations.push('Monitor test performance and consider optimization')
    }

    // 個別テスト時間の評価
    const slowTests = report.results.filter(r => r.duration > 60000) // 1分
    if (slowTests.length > 0) {
      warnings.push(`${slowTests.length} test(s) took longer than 1 minute`)
      recommendations.push('Review and optimize slow test cases')
    }

    // メモリ使用量の評価
    const memoryMB = report.summary.memoryUsage.heapUsed / 1024 / 1024
    if (memoryMB > 500) {
      warnings.push(`High memory usage: ${Math.round(memoryMB)}MB`)
      recommendations.push('Check for memory leaks in test cases')
    }

    // 失敗率の評価
    const failureRate = report.failedTests / report.totalTests
    if (failureRate > 0.1) {
      // 10%以上
      warnings.push(`High failure rate: ${Math.round(failureRate * 100)}%`)
      recommendations.push(
        'Address failing tests to ensure reliable performance monitoring'
      )
    }

    if (warnings.length === 0) {
      console.log('  🎉 All performance metrics are within acceptable ranges!')
    } else {
      console.log('  ⚠️  Warnings:')
      warnings.forEach(warning => console.log(`    - ${warning}`))

      console.log('  💡 Recommendations:')
      recommendations.forEach(rec => console.log(`    - ${rec}`))
    }
  }

  private saveReport(report: PerformanceReport): void {
    const reportPath = join(process.cwd(), 'performance-test-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Report saved to: ${reportPath}`)

    // 簡易版のMarkdownレポートも生成
    this.generateMarkdownReport(report)
  }

  private generateMarkdownReport(report: PerformanceReport): void {
    const markdown = `# Performance Test Report

**Generated:** ${report.timestamp}

## Summary

- **Total Tests:** ${report.totalTests}
- **Passed:** ${report.passedTests}
- **Failed:** ${report.failedTests}
- **Total Duration:** ${report.totalDuration}ms (${Math.round(report.totalDuration / 1000)}s)
- **Average Test Duration:** ${Math.round(report.summary.averageTestDuration)}ms
- **Memory Usage:** ${Math.round((report.summary.memoryUsage.heapUsed / 1024 / 1024) * 100) / 100}MB

## Test Results

| Test File | Status | Duration (ms) |
|-----------|--------|---------------|
${report.results
  .map(
    r =>
      `| ${r.testFile.split('/').pop()} | ${r.passed ? '✅ PASSED' : '❌ FAILED'} | ${r.duration} |`
  )
  .join('\n')}

## Performance Analysis

- **Slowest Test:** ${report.summary.slowestTest.split('/').pop()}
- **Fastest Test:** ${report.summary.fastestTest.split('/').pop()}

${
  report.failedTests > 0
    ? `
## Failed Tests

${report.results
  .filter(r => !r.passed)
  .map(r => `- **${r.testFile.split('/').pop()}:** ${r.error}`)
  .join('\n')}
`
    : ''
}

---
*Generated by Performance Test Runner*
`

    const markdownPath = join(process.cwd(), 'performance-test-report.md')
    writeFileSync(markdownPath, markdown)
    console.log(`📄 Markdown report saved to: ${markdownPath}`)
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  const runner = new PerformanceTestRunner()

  runner
    .runAllTests()
    .then(report => {
      const exitCode = report.failedTests > 0 ? 1 : 0
      process.exit(exitCode)
    })
    .catch(error => {
      console.error('❌ Performance test runner failed:', error)
      process.exit(1)
    })
}

export { PerformanceTestRunner }
