import { ConnpassApiService, ConnpassApiError } from './ConnpassApiService'
import { DynamoDBService, DynamoDBError } from './DynamoDBService'
import { NotificationService } from './NotificationService'
import { StudySession } from '../types/StudySession'
import { ConnpassEventData } from '../types/EventMaterial'
import { logger } from '../utils/logger'
import {
  PerformanceMonitor,
  MemoryMonitor,
  BatchProcessor,
  evaluatePerformance,
  PERFORMANCE_THRESHOLDS,
} from '../utils/performanceOptimization'

/**
 * 広島イベント発見結果の型定義
 * 要件6.4に対応
 */
export interface HiroshimaDiscoveryResult {
  /** 発見した総イベント数 */
  totalFound: number

  /** 新規登録したイベント数 */
  newRegistrations: number

  /** 重複でスキップしたイベント数 */
  duplicatesSkipped: number

  /** エラーメッセージの配列 */
  errors: string[]

  /** 新規登録されたイベント一覧 */
  registeredEvents: StudySession[]
}

/**
 * 広島イベント自動発見・登録サービス
 * 要件1.1, 2.1, 3.1, 6.1, 6.2に対応
 */
export class HiroshimaEventDiscoveryService {
  private static readonly SEARCH_KEYWORD = '広島'
  private static readonly MAX_SEARCH_RESULTS = 100

  constructor(
    private connpassApiService: ConnpassApiService,
    private dynamoDBService: DynamoDBService,
    private notificationService: NotificationService
  ) {
    logger.debug('HiroshimaEventDiscoveryService initialized')
  }

  /**
   * 広島イベントの発見・登録メイン処理
   * 要件1.1, 2.1, 3.1, 6.1, 6.2に対応
   * パフォーマンス最適化対応
   */
  async discoverAndRegisterEvents(): Promise<HiroshimaDiscoveryResult> {
    const startTime = new Date().toISOString()
    logger.info(`Starting Hiroshima event discovery process at ${startTime}`)

    // パフォーマンス監視の開始
    const performanceMonitor = new PerformanceMonitor('HiroshimaEventDiscovery')
    const memoryMonitor = new MemoryMonitor(2000) // 2秒間隔でメモリ監視
    memoryMonitor.start()

    const result: HiroshimaDiscoveryResult = {
      totalFound: 0,
      newRegistrations: 0,
      duplicatesSkipped: 0,
      errors: [],
      registeredEvents: [],
    }

    try {
      // フェーズ1: connpass APIでイベント検索
      logger.info(
        `Phase 1: Searching connpass events with keyword "${HiroshimaEventDiscoveryService.SEARCH_KEYWORD}"`
      )
      performanceMonitor.checkpoint('Phase1-Start-API-Search')

      let searchResult
      try {
        searchResult = await this.connpassApiService.searchEventsByKeyword(
          HiroshimaEventDiscoveryService.SEARCH_KEYWORD,
          HiroshimaEventDiscoveryService.MAX_SEARCH_RESULTS
        )
        performanceMonitor.checkpoint('Phase1-Complete-API-Search')
      } catch (searchError) {
        // 要件1.4, 1.5: connpass APIエラーの分類と対応、詳細なエラーログ
        const searchErrorDetails = {
          keyword: HiroshimaEventDiscoveryService.SEARCH_KEYWORD,
          maxResults: HiroshimaEventDiscoveryService.MAX_SEARCH_RESULTS,
          operation: 'searchEventsByKeyword',
          errorType:
            searchError instanceof Error
              ? searchError.constructor.name
              : 'Unknown',
          errorMessage:
            searchError instanceof Error
              ? searchError.message
              : 'Unknown error',
          isConnpassApiError: searchError instanceof ConnpassApiError,
          stack: searchError instanceof Error ? searchError.stack : undefined,
        }

        if (searchError instanceof ConnpassApiError) {
          logger.error(
            `connpass API error during event search: ${searchError.errorCode}`,
            searchErrorDetails
          )

          // APIエラーの場合は処理を継続（空の結果として扱う）
          if (searchError.errorCode === 'AUTHENTICATION_FAILED') {
            result.errors.push(
              'connpass API authentication failed - check API key'
            )
          } else if (searchError.errorCode === 'RATE_LIMIT_EXCEEDED') {
            result.errors.push('connpass API rate limit exceeded after retry')
          } else {
            result.errors.push(`connpass API error: ${searchError.message}`)
          }

          logger.warn('Continuing with empty search result due to API error')
          return result
        } else {
          // その他のエラーは再スロー
          logger.error(
            'Unexpected error during connpass API search',
            searchErrorDetails
          )
          throw searchError
        }
      }

      result.totalFound = searchResult.events.length
      logger.info(
        `Found ${result.totalFound} events from connpass API (total available: ${searchResult.totalCount})`
      )

      if (result.totalFound === 0) {
        logger.info(
          'No events found with the search keyword, discovery process completed'
        )

        // パフォーマンス監視の終了
        const performanceResult = performanceMonitor.finish()
        const memoryStats = memoryMonitor.stop()
        this.logPerformanceMetrics(
          performanceResult,
          memoryStats,
          result.totalFound
        )

        return result
      }

      // フェーズ2: 各イベントの処理（重複チェック・登録・通知）
      logger.info(
        `Phase 2: Processing ${result.totalFound} events for duplicate check and registration`
      )
      performanceMonitor.checkpoint('Phase2-Start-Event-Processing')

      // バッチ処理を使用してイベントを効率的に処理
      const batchProcessor = new BatchProcessor<ConnpassEventData, void>(
        10, // バッチサイズ: 10件ずつ処理
        100, // バッチ間遅延: 100ms
        'HiroshimaEventProcessing'
      )

      const processingResults = await batchProcessor.processBatches(
        searchResult.events,
        async (event, index) => {
          const eventNumber = index + 1
          logger.debug(
            `Processing event ${eventNumber}/${result.totalFound}: ID=${event.event_id}, Title="${event.title}"`
          )

          await this.processEvent(event, eventNumber, result)
        }
      )

      // エラーの集計
      const processingErrors = processingResults.filter(r => r.error)
      processingErrors.forEach(errorResult => {
        const errorMessage = `Failed to process event ${errorResult.index + 1} (ID: ${errorResult.item.event_id}): ${errorResult.error?.message || 'Unknown error'}`
        logger.error(errorMessage, errorResult.error)
        result.errors.push(errorMessage)
      })

      performanceMonitor.checkpoint('Phase2-Complete-Event-Processing')

      // フェーズ3: 処理結果のサマリー
      const endTime = new Date().toISOString()
      logger.info(`Hiroshima event discovery completed at ${endTime}`)
      logger.info(
        `Summary: Found=${result.totalFound}, New=${result.newRegistrations}, Duplicates=${result.duplicatesSkipped}, Errors=${result.errors.length}`
      )

      // パフォーマンス監視の終了と評価
      const performanceResult = performanceMonitor.finish()
      const memoryStats = memoryMonitor.stop()
      this.logPerformanceMetrics(
        performanceResult,
        memoryStats,
        result.totalFound
      )

      // 要件6.4: 見つかった総数、新規登録数、スキップした重複数を含む要約統計をログに記録
      if (result.newRegistrations > 0) {
        logger.info(
          `Successfully registered ${result.newRegistrations} new Hiroshima events:`
        )
        result.registeredEvents.forEach((event, index) => {
          logger.info(
            `  ${index + 1}. "${event.title}" (ID: ${event.id}) - ${event.url}`
          )
        })
      }

      if (result.duplicatesSkipped > 0) {
        logger.info(`Skipped ${result.duplicatesSkipped} duplicate events`)
      }

      if (result.errors.length > 0) {
        logger.warn(
          `Encountered ${result.errors.length} errors during processing:`
        )
        result.errors.forEach((error, index) => {
          logger.warn(`  ${index + 1}. ${error}`)
        })
      }
    } catch (error) {
      const errorMessage = `Critical error in Hiroshima event discovery: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error(errorMessage, error)
      result.errors.push(errorMessage)
    } finally {
      // パフォーマンス監視のクリーンアップ（エラー時も実行）
      try {
        const performanceResult = performanceMonitor.finish()
        const memoryStats = memoryMonitor.stop()
        this.logPerformanceMetrics(
          performanceResult,
          memoryStats,
          result.totalFound
        )
      } catch (monitoringError) {
        logger.warn(
          'Failed to complete performance monitoring',
          monitoringError
        )
      }
    }

    return result
  }

  /**
   * パフォーマンス指標をログに記録
   */
  private logPerformanceMetrics(
    performanceResult: any,
    memoryStats: any,
    eventsProcessed: number
  ): void {
    logger.info('Performance Metrics:')
    logger.info(
      `- Total execution time: ${performanceResult.totalExecutionTime}ms`
    )
    logger.info(
      `- Memory usage: Initial=${Math.round(memoryStats.initialMemory / 1024 / 1024)}MB, ` +
        `Peak=${Math.round(memoryStats.peakMemory / 1024 / 1024)}MB, ` +
        `Increase=${Math.round(memoryStats.memoryIncrease / 1024 / 1024)}MB`
    )

    if (eventsProcessed > 0) {
      logger.info(
        `- Average time per event: ${Math.round(performanceResult.totalExecutionTime / eventsProcessed)}ms`
      )
    }

    // パフォーマンス評価
    const evaluation = evaluatePerformance(performanceResult)
    if (evaluation.warnings.length > 0) {
      logger.warn('Performance warnings:')
      evaluation.warnings.forEach(warning => logger.warn(`  - ${warning}`))
    }

    if (evaluation.recommendations.length > 0) {
      logger.info('Performance recommendations:')
      evaluation.recommendations.forEach(rec => logger.info(`  - ${rec}`))
    }

    logger.info(`Performance score: ${evaluation.score}`)

    // 閾値チェック
    if (
      performanceResult.totalExecutionTime >
      PERFORMANCE_THRESHOLDS.EXECUTION_TIME_WARNING
    ) {
      logger.warn(
        `Execution time (${performanceResult.totalExecutionTime}ms) exceeds warning threshold (${PERFORMANCE_THRESHOLDS.EXECUTION_TIME_WARNING}ms)`
      )
    }

    if (
      memoryStats.memoryIncrease >
      PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_WARNING
    ) {
      logger.warn(
        `Memory increase (${Math.round(memoryStats.memoryIncrease / 1024 / 1024)}MB) exceeds warning threshold (${Math.round(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_WARNING / 1024 / 1024)}MB)`
      )
    }
  }

  /**
   * 個別イベントの処理（重複チェック・登録・通知）
   * 要件2.1, 3.1, 4.1, 6.3, 6.4に対応
   */
  private async processEvent(
    eventData: ConnpassEventData,
    eventNumber: number,
    result: HiroshimaDiscoveryResult
  ): Promise<void> {
    logger.debug(
      `Processing event ${eventNumber}: "${eventData.title}" (URL: ${eventData.event_url})`
    )

    // 要件2.1, 2.2, 2.4: 重複チェック
    logger.debug(
      `Checking for duplicate event with URL: ${eventData.event_url}`
    )

    try {
      const isDuplicate = await this.dynamoDBService.checkEventExists(
        eventData.event_url
      )

      if (isDuplicate) {
        logger.info(
          `Event ${eventNumber} is duplicate, skipping: "${eventData.title}"`
        )
        result.duplicatesSkipped++
        return
      }

      logger.debug(
        `Event ${eventNumber} is not duplicate, proceeding with registration`
      )
    } catch (error) {
      // 要件2.5, 6.3, 6.4: 重複検出が失敗した時、エラーをログに記録し、問題のあるイベントをスキップ
      const errorDetails = {
        eventNumber,
        eventData: {
          eventId: eventData.event_id,
          title: eventData.title,
          eventUrl: eventData.event_url,
        },
        operation: 'duplicateCheck',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isDynamoDBError: error instanceof DynamoDBError,
        stack: error instanceof Error ? error.stack : undefined,
      }

      const errorMessage = `Duplicate check failed for event ${eventNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error(errorMessage, errorDetails)
      result.errors.push(errorMessage)
      return
    }

    // 要件3.1, 3.2, 3.3, 3.4, 3.5: 新規イベント登録
    logger.debug(`Registering new event ${eventNumber}: "${eventData.title}"`)

    try {
      const registeredEvent =
        await this.dynamoDBService.createStudySessionFromConnpass(eventData)

      logger.info(
        `Successfully registered event ${eventNumber}: "${registeredEvent.title}" (ID: ${registeredEvent.id})`
      )
      result.newRegistrations++
      result.registeredEvents.push(registeredEvent)

      // 要件4.1, 4.2: 通知送信
      logger.debug(
        `Sending notification for registered event ${eventNumber}: ID=${registeredEvent.id}`
      )

      try {
        await this.notificationService.publishStudySessionNotification(
          registeredEvent
        )
        logger.debug(`Notification sent successfully for event ${eventNumber}`)
      } catch (notificationError) {
        // 要件4.3, 6.3, 6.4: 通知送信が失敗した時、システムはエラーをログに記録するが、イベント登録は継続する
        const notificationErrorDetails = {
          eventNumber,
          registeredEventId: registeredEvent.id,
          eventTitle: registeredEvent.title,
          operation: 'notification',
          errorType:
            notificationError instanceof Error
              ? notificationError.constructor.name
              : 'Unknown',
          errorMessage:
            notificationError instanceof Error
              ? notificationError.message
              : 'Unknown error',
          stack:
            notificationError instanceof Error
              ? notificationError.stack
              : undefined,
        }

        const errorMessage = `Notification failed for event ${eventNumber} (ID: ${registeredEvent.id}): ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`
        logger.error(errorMessage, notificationErrorDetails)
        result.errors.push(errorMessage)
        // 通知エラーでも処理は継続（登録は成功として扱う）
      }
    } catch (registrationError) {
      // 要件6.3, 6.4: 詳細なエラーログとスタックトレース出力を実装
      const registrationErrorDetails = {
        eventNumber,
        eventData: {
          eventId: eventData.event_id,
          title: eventData.title,
          eventUrl: eventData.event_url,
        },
        operation: 'registration',
        errorType:
          registrationError instanceof Error
            ? registrationError.constructor.name
            : 'Unknown',
        errorMessage:
          registrationError instanceof Error
            ? registrationError.message
            : 'Unknown error',
        isDynamoDBError: registrationError instanceof DynamoDBError,
        stack:
          registrationError instanceof Error
            ? registrationError.stack
            : undefined,
      }

      const errorMessage = `Registration failed for event ${eventNumber}: ${registrationError instanceof Error ? registrationError.message : 'Unknown error'}`
      logger.error(errorMessage, registrationErrorDetails)
      result.errors.push(errorMessage)
    }
  }
}
