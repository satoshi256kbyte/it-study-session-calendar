import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager'
import { logger } from '../utils/logger'

/**
 * AWS Secrets Manager統合サービス
 * 要件6.2に対応
 */
export class SecretsManagerService {
  private client: SecretsManagerClient

  constructor() {
    this.client = new SecretsManagerClient({})
    logger.debug('SecretsManagerService initialized')
  }

  /**
   * connpass APIキーの安全な取得
   * 要件6.2に対応
   */
  async getConnpassApiKey(): Promise<string> {
    const secretName =
      process.env.CONNPASS_API_KEY_SECRET_NAME || 'connpass-api-key'

    logger.debug(`Getting connpass API key from secret: ${secretName}`)

    try {
      const response = await this.getSecretValue(secretName)

      if (!response.SecretString) {
        throw new Error('Secret value is empty or not a string')
      }

      // シークレットがJSON形式の場合とプレーンテキストの場合を処理
      let apiKey: string
      try {
        const secretData = JSON.parse(response.SecretString)
        apiKey = secretData.apiKey || secretData.api_key || secretData.key

        if (!apiKey) {
          throw new Error('API key not found in JSON secret')
        }
      } catch (jsonError) {
        // API key not found エラーの場合は再スロー
        if (
          jsonError instanceof Error &&
          jsonError.message === 'API key not found in JSON secret'
        ) {
          throw jsonError
        }

        // JSON解析に失敗した場合、プレーンテキストとして扱う
        apiKey = response.SecretString.trim()

        if (!apiKey) {
          throw new Error('API key is empty')
        }
      }

      logger.debug('connpass API key retrieved successfully')
      return apiKey
    } catch (error) {
      logger.error(
        'Failed to get connpass API key from Secrets Manager:',
        error
      )
      throw new Error(
        `Failed to retrieve connpass API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 汎用的なシークレット値取得メソッド
   * エラーハンドリングとフォールバック処理を含む
   * 要件6.2に対応
   */
  async getSecretValue(
    secretName: string
  ): Promise<GetSecretValueCommandOutput> {
    logger.debug(`Getting secret value: ${secretName}`)

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      })

      const response = await this.client.send(command)

      logger.debug(`Secret value retrieved successfully: ${secretName}`)
      return response
    } catch (error) {
      logger.error(`Failed to get secret value for ${secretName}:`, error)

      // AWS SDK エラーの詳細な処理
      if (error instanceof Error) {
        const errorName = error.name

        switch (errorName) {
          case 'ResourceNotFoundException':
            throw new Error(`Secret not found: ${secretName}`)
          case 'InvalidParameterException':
            throw new Error(`Invalid parameter for secret: ${secretName}`)
          case 'InvalidRequestException':
            throw new Error(`Invalid request for secret: ${secretName}`)
          case 'DecryptionFailureException':
            throw new Error(`Failed to decrypt secret: ${secretName}`)
          case 'InternalServiceErrorException':
            throw new Error(
              `AWS Secrets Manager internal error for secret: ${secretName}`
            )
          default:
            throw new Error(
              `Failed to retrieve secret ${secretName}: ${error.message}`
            )
        }
      }

      throw error
    }
  }

  /**
   * シークレットの存在確認
   * バッチ処理開始前の事前チェック用
   * 要件6.2に対応
   */
  async checkSecretExists(secretName: string): Promise<boolean> {
    logger.debug(`Checking if secret exists: ${secretName}`)

    try {
      await this.getSecretValue(secretName)
      logger.debug(`Secret exists: ${secretName}`)
      return true
    } catch (error) {
      logger.warn(
        `Secret does not exist or is not accessible: ${secretName}`,
        error
      )
      return false
    }
  }

  /**
   * connpass APIキーの有効性をテスト
   * Secrets Managerから取得したキーが実際に使用可能かチェック
   * 要件6.2に対応
   */
  async validateConnpassApiKey(): Promise<boolean> {
    logger.debug('Validating connpass API key from Secrets Manager')

    try {
      const apiKey = await this.getConnpassApiKey()

      // ConnpassApiServiceを使用してキーの有効性をテスト
      const { ConnpassApiService } = await import('./ConnpassApiService')
      const connpassService = new ConnpassApiService(apiKey)

      const isValid = await connpassService.testApiKey()

      if (isValid) {
        logger.debug('connpass API key from Secrets Manager is valid')
      } else {
        logger.warn('connpass API key from Secrets Manager is invalid')
      }

      return isValid
    } catch (error) {
      logger.error('Failed to validate connpass API key:', error)
      return false
    }
  }

  /**
   * フォールバック処理付きのAPIキー取得
   * 複数のシークレット名を試行する
   * 要件6.2に対応
   */
  async getConnpassApiKeyWithFallback(): Promise<string> {
    const secretNames = [
      process.env.CONNPASS_API_KEY_SECRET_NAME || 'connpass-api-key',
      'connpass-api-key-prod',
      'connpass-api-key-dev',
      'connpass/api-key',
    ]

    logger.debug(
      `Attempting to get connpass API key with fallback from secrets: ${secretNames.join(', ')}`
    )

    let lastError: Error | null = null

    for (const secretName of secretNames) {
      try {
        logger.debug(`Trying secret: ${secretName}`)
        const response = await this.getSecretValue(secretName)

        if (response.SecretString) {
          // シークレットが見つかった場合、APIキーを抽出
          let apiKey: string
          try {
            const secretData = JSON.parse(response.SecretString)
            apiKey = secretData.apiKey || secretData.api_key || secretData.key

            if (!apiKey) {
              throw new Error('API key not found in JSON secret')
            }
          } catch (jsonError) {
            apiKey = response.SecretString.trim()
          }

          if (apiKey) {
            logger.debug(
              `connpass API key retrieved successfully from: ${secretName}`
            )
            return apiKey
          }
        }
      } catch (error) {
        logger.debug(`Failed to get API key from ${secretName}:`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
        continue
      }
    }

    // すべてのシークレット名で失敗した場合
    const errorMessage = `Failed to retrieve connpass API key from any of the fallback secrets: ${secretNames.join(', ')}`
    logger.error(errorMessage, lastError)
    throw new Error(
      `${errorMessage}. Last error: ${lastError?.message || 'Unknown error'}`
    )
  }
}
