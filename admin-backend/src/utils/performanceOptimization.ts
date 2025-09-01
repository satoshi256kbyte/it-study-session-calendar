import { logger } from './logger'

/**
 * パフォーマンス測定とメモリ監視のユーティリティ
 */
export class PerformanceMonitor {
  private startTime: number
  private startMemory: NodeJS.MemoryUsage
  private checkpoints: Array<{
    name: string
    time: number
    memory: NodeJS.MemoryUsage
  }> = []

  constructor(private processName: string) {
    this.startTime = Date.now()
    this.startMemory = process.memoryUsage()
    logger.info(`Performance monitoring started for: ${processName}`)
  }

  /**
   * チェックポイントを記録
   */
  checkpoint(name: string): void {
    const currentTime = Date.now()
    const currentMemory = process.memoryUsage()

    this.checkpoints.push({
      name,
      time: currentTime,
      memory: currentMemory,
    })

    const elapsedTime = currentTime - this.startTime
    const memoryIncrease = currentMemory.heapUsed - this.startMemory.heapUsed

    logger.info(
      `Checkpoint [${name}]: ${elapsedTime}ms elapsed, ${Math.round((memoryIncrease / 1024 / 1024) * 100) / 100}MB memory increase`
    )
  }

  /**
   * 最終結果を記録
   */
  finish(): PerformanceResult {
    const endTime = Date.now()
    const endMemory = process.memoryUsage()

    const totalTime = endTime - this.startTime
    const totalMemoryIncrease = endMemory.heapUsed - this.startMemory.heapUsed
    const peakMemoryUsage = Math.max(
      this.startMemory.heapUsed,
      ...this.checkpoints.map(cp => cp.memory.heapUsed),
      endMemory.heapUsed
    )

    const result: PerformanceResult = {
      processName: this.processName,
      totalExecutionTime: totalTime,
      totalMemoryIncrease,
      peakMemoryUsage,
      checkpoints: this.checkpoints.map((cp, index) => ({
        name: cp.name,
        elapsedTime: cp.time - this.startTime,
        memoryUsage: cp.memory.heapUsed,
        memoryIncrease: cp.memory.heapUsed - this.startMemory.heapUsed,
        intervalTime:
          index === 0
            ? cp.time - this.startTime
            : cp.time - this.checkpoints[index - 1].time,
      })),
    }

    logger.info(`Performance monitoring completed for: ${this.processName}`)
    logger.info(`Total execution time: ${totalTime}ms`)
    logger.info(
      `Total memory increase: ${Math.round((totalMemoryIncrease / 1024 / 1024) * 100) / 100}MB`
    )
    logger.info(
      `Peak memory usage: ${Math.round((peakMemoryUsage / 1024 / 1024) * 100) / 100}MB`
    )

    return result
  }
}

export interface PerformanceResult {
  processName: string
  totalExecutionTime: number
  totalMemoryIncrease: number
  peakMemoryUsage: number
  checkpoints: Array<{
    name: string
    elapsedTime: number
    memoryUsage: number
    memoryIncrease: number
    intervalTime: number
  }>
}

/**
 * APIレート制限を管理するクラス
 */
export class RateLimiter {
  private lastCallTime: number = 0
  private callCount: number = 0

  constructor(
    private intervalMs: number,
    private maxCallsPerInterval: number = 1,
    private name: string = 'RateLimiter'
  ) {}

  /**
   * レート制限に従って待機
   */
  async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime

    if (timeSinceLastCall < this.intervalMs) {
      const waitTime = this.intervalMs - timeSinceLastCall
      logger.debug(`${this.name}: Rate limit wait ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastCallTime = Date.now()
    this.callCount++

    logger.debug(
      `${this.name}: API call #${this.callCount} at ${new Date(this.lastCallTime).toISOString()}`
    )
  }

  /**
   * 統計情報を取得
   */
  getStats(): { callCount: number; averageInterval: number } {
    const averageInterval =
      this.callCount > 1
        ? (Date.now() - this.lastCallTime) / (this.callCount - 1)
        : 0

    return {
      callCount: this.callCount,
      averageInterval,
    }
  }
}

/**
 * メモリ使用量を監視するクラス
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage
  private peakMemory: number = 0
  private samples: Array<{ time: number; memory: NodeJS.MemoryUsage }> = []
  private monitorInterval?: NodeJS.Timeout

  constructor(private sampleIntervalMs: number = 1000) {
    this.initialMemory = process.memoryUsage()
    this.peakMemory = this.initialMemory.heapUsed
  }

  /**
   * 監視を開始
   */
  start(): void {
    this.monitorInterval = setInterval(() => {
      const currentMemory = process.memoryUsage()
      this.peakMemory = Math.max(this.peakMemory, currentMemory.heapUsed)
      this.samples.push({
        time: Date.now(),
        memory: currentMemory,
      })

      // サンプル数を制限（最新100件のみ保持）
      if (this.samples.length > 100) {
        this.samples = this.samples.slice(-100)
      }
    }, this.sampleIntervalMs)

    logger.debug('Memory monitoring started')
  }

  /**
   * 監視を停止
   */
  stop(): MemoryStats {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = undefined
    }

    const finalMemory = process.memoryUsage()
    const memoryIncrease = finalMemory.heapUsed - this.initialMemory.heapUsed
    const peakIncrease = this.peakMemory - this.initialMemory.heapUsed

    const stats: MemoryStats = {
      initialMemory: this.initialMemory.heapUsed,
      finalMemory: finalMemory.heapUsed,
      peakMemory: this.peakMemory,
      memoryIncrease,
      peakIncrease,
      sampleCount: this.samples.length,
    }

    logger.debug('Memory monitoring stopped')
    logger.debug(
      `Memory stats: Initial=${Math.round(stats.initialMemory / 1024 / 1024)}MB, ` +
        `Final=${Math.round(stats.finalMemory / 1024 / 1024)}MB, ` +
        `Peak=${Math.round(stats.peakMemory / 1024 / 1024)}MB, ` +
        `Increase=${Math.round(stats.memoryIncrease / 1024 / 1024)}MB`
    )

    return stats
  }

  /**
   * 現在のメモリ使用量を取得
   */
  getCurrentStats(): { current: number; peak: number; increase: number } {
    const current = process.memoryUsage().heapUsed
    this.peakMemory = Math.max(this.peakMemory, current)

    return {
      current,
      peak: this.peakMemory,
      increase: current - this.initialMemory.heapUsed,
    }
  }
}

export interface MemoryStats {
  initialMemory: number
  finalMemory: number
  peakMemory: number
  memoryIncrease: number
  peakIncrease: number
  sampleCount: number
}

/**
 * バッチ処理のパフォーマンス最適化ヘルパー
 */
export class BatchProcessor<T, R> {
  constructor(
    private batchSize: number = 10,
    private delayBetweenBatches: number = 0,
    private name: string = 'BatchProcessor'
  ) {}

  /**
   * アイテムをバッチ処理
   */
  async processBatches(
    items: T[],
    processor: (item: T, index: number) => Promise<R>
  ): Promise<Array<{ item: T; result?: R; error?: Error; index: number }>> {
    const results: Array<{
      item: T
      result?: R
      error?: Error
      index: number
    }> = []
    const totalBatches = Math.ceil(items.length / this.batchSize)

    logger.info(
      `${this.name}: Processing ${items.length} items in ${totalBatches} batches of ${this.batchSize}`
    )

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * this.batchSize
      const endIndex = Math.min(startIndex + this.batchSize, items.length)
      const batch = items.slice(startIndex, endIndex)

      logger.debug(
        `${this.name}: Processing batch ${batchIndex + 1}/${totalBatches} (items ${startIndex + 1}-${endIndex})`
      )

      const batchStartTime = Date.now()

      // バッチ内のアイテムを並列処理
      const batchPromises = batch.map(async (item, batchItemIndex) => {
        const globalIndex = startIndex + batchItemIndex
        try {
          const result = await processor(item, globalIndex)
          return { item, result, index: globalIndex }
        } catch (error) {
          logger.warn(
            `${this.name}: Error processing item ${globalIndex}: ${error}`
          )
          return { item, error: error as Error, index: globalIndex }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      const batchTime = Date.now() - batchStartTime
      logger.debug(
        `${this.name}: Batch ${batchIndex + 1} completed in ${batchTime}ms`
      )

      // バッチ間の遅延
      if (this.delayBetweenBatches > 0 && batchIndex < totalBatches - 1) {
        logger.debug(
          `${this.name}: Waiting ${this.delayBetweenBatches}ms before next batch`
        )
        await new Promise(resolve =>
          setTimeout(resolve, this.delayBetweenBatches)
        )
      }
    }

    const successCount = results.filter(r => !r.error).length
    const errorCount = results.filter(r => r.error).length

    logger.info(
      `${this.name}: Batch processing completed. Success: ${successCount}, Errors: ${errorCount}`
    )

    return results
  }
}

/**
 * パフォーマンス警告の閾値
 */
export const PERFORMANCE_THRESHOLDS = {
  // 実行時間の警告閾値（ミリ秒）
  EXECUTION_TIME_WARNING: 30000, // 30秒
  EXECUTION_TIME_CRITICAL: 60000, // 1分

  // メモリ使用量の警告閾値（バイト）
  MEMORY_INCREASE_WARNING: 100 * 1024 * 1024, // 100MB
  MEMORY_INCREASE_CRITICAL: 200 * 1024 * 1024, // 200MB

  // API呼び出し間隔の最小値（ミリ秒）
  MIN_API_INTERVAL: 1000, // 1秒（connpass API制限）
  RECOMMENDED_API_INTERVAL: 5000, // 5秒（推奨値）
} as const

/**
 * パフォーマンス結果を評価
 */
export function evaluatePerformance(result: PerformanceResult): {
  warnings: string[]
  recommendations: string[]
  score: 'good' | 'warning' | 'critical'
} {
  const warnings: string[] = []
  const recommendations: string[] = []
  let score: 'good' | 'warning' | 'critical' = 'good'

  // 実行時間の評価
  if (
    result.totalExecutionTime > PERFORMANCE_THRESHOLDS.EXECUTION_TIME_CRITICAL
  ) {
    warnings.push(
      `Critical: Execution time ${result.totalExecutionTime}ms exceeds critical threshold`
    )
    recommendations.push(
      'Consider optimizing the process or increasing Lambda timeout'
    )
    score = 'critical'
  } else if (
    result.totalExecutionTime > PERFORMANCE_THRESHOLDS.EXECUTION_TIME_WARNING
  ) {
    warnings.push(
      `Warning: Execution time ${result.totalExecutionTime}ms exceeds warning threshold`
    )
    recommendations.push('Monitor execution time and consider optimization')
    if (score === 'good') score = 'warning'
  }

  // メモリ使用量の評価
  if (
    result.totalMemoryIncrease > PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_CRITICAL
  ) {
    warnings.push(
      `Critical: Memory increase ${Math.round(result.totalMemoryIncrease / 1024 / 1024)}MB exceeds critical threshold`
    )
    recommendations.push(
      'Consider increasing Lambda memory or optimizing memory usage'
    )
    score = 'critical'
  } else if (
    result.totalMemoryIncrease > PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_WARNING
  ) {
    warnings.push(
      `Warning: Memory increase ${Math.round(result.totalMemoryIncrease / 1024 / 1024)}MB exceeds warning threshold`
    )
    recommendations.push('Monitor memory usage and consider optimization')
    if (score === 'good') score = 'warning'
  }

  // チェックポイント間の時間間隔を評価
  for (let i = 1; i < result.checkpoints.length; i++) {
    const intervalTime = result.checkpoints[i].intervalTime
    if (intervalTime > 10000) {
      // 10秒以上
      warnings.push(
        `Warning: Long interval (${intervalTime}ms) between ${result.checkpoints[i - 1].name} and ${result.checkpoints[i].name}`
      )
      recommendations.push('Consider breaking down long-running operations')
      if (score === 'good') score = 'warning'
    }
  }

  return { warnings, recommendations, score }
}
