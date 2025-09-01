import { HiroshimaEventDiscoveryService } from '../HiroshimaEventDiscoveryService'
import { ConnpassApiService } from '../ConnpassApiService'
import { DynamoDBService } from '../DynamoDBService'
import { NotificationService } from '../NotificationService'

describe('HiroshimaEventDiscoveryService Integration', () => {
  let service: HiroshimaEventDiscoveryService

  beforeEach(() => {
    // 実際のサービスインスタンスを作成（テスト環境用）
    const connpassApiService = new ConnpassApiService('test-api-key')
    const dynamoDBService = new DynamoDBService()
    const notificationService = new NotificationService()

    service = new HiroshimaEventDiscoveryService(
      connpassApiService,
      dynamoDBService,
      notificationService
    )
  })

  it('should create service instance successfully', () => {
    expect(service).toBeInstanceOf(HiroshimaEventDiscoveryService)
  })

  it('should have discoverAndRegisterEvents method', () => {
    expect(typeof service.discoverAndRegisterEvents).toBe('function')
  })

  // 注意: 実際のAPI呼び出しやDynamoDB操作を含むテストは、
  // 適切なテスト環境とモックが設定されている場合のみ実行してください
  it.skip('should handle API errors gracefully', async () => {
    // このテストは実際のAPI呼び出しを行うため、スキップしています
    // 実際のテスト環境では、適切なモックやテストデータを使用してください
    const result = await service.discoverAndRegisterEvents()

    expect(result).toHaveProperty('totalFound')
    expect(result).toHaveProperty('newRegistrations')
    expect(result).toHaveProperty('duplicatesSkipped')
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('registeredEvents')
  })
})
