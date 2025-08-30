import { SecretsManagerService } from '../SecretsManagerService'
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager'

// AWS SDK のモック
const mockSend = jest.fn()
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetSecretValueCommand: jest.fn(),
}))

// ConnpassApiService のモック
const mockTestApiKey = jest.fn()
jest.mock('../ConnpassApiService', () => ({
  ConnpassApiService: jest.fn().mockImplementation(() => ({
    testApiKey: mockTestApiKey,
  })),
}))

describe('SecretsManagerService', () => {
  let service: SecretsManagerService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SecretsManagerService()
  })

  describe('constructor', () => {
    it('should initialize SecretsManagerClient', () => {
      expect(SecretsManagerClient).toHaveBeenCalledWith({})
    })
  })

  describe('getConnpassApiKey', () => {
    const mockSecretName = 'test-connpass-api-key'

    beforeEach(() => {
      process.env.CONNPASS_API_SECRET_NAME = mockSecretName
    })

    afterEach(() => {
      delete process.env.CONNPASS_API_SECRET_NAME
    })

    it('should get API key from plain text secret', async () => {
      const mockApiKey = 'test-api-key-123'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: mockApiKey,
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKey()

      expect(result).toBe(mockApiKey)
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should get API key from JSON secret with apiKey field', async () => {
      const mockApiKey = 'test-api-key-456'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: JSON.stringify({ apiKey: mockApiKey }),
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKey()

      expect(result).toBe(mockApiKey)
    })

    it('should get API key from JSON secret with api_key field', async () => {
      const mockApiKey = 'test-api-key-789'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: JSON.stringify({ api_key: mockApiKey }),
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKey()

      expect(result).toBe(mockApiKey)
    })

    it('should get API key from JSON secret with key field', async () => {
      const mockApiKey = 'test-api-key-abc'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: JSON.stringify({ key: mockApiKey }),
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKey()

      expect(result).toBe(mockApiKey)
    })

    it('should handle empty secret string', async () => {
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: '',
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      await expect(service.getConnpassApiKey()).rejects.toThrow(
        'Failed to retrieve connpass API key: Secret value is empty or not a string'
      )
    })

    it('should handle missing secret string', async () => {
      const mockResponse: GetSecretValueCommandOutput = {
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      await expect(service.getConnpassApiKey()).rejects.toThrow(
        'Secret value is empty or not a string'
      )
    })

    it('should handle JSON secret without API key fields', async () => {
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: JSON.stringify({ otherField: 'value' }),
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      await expect(service.getConnpassApiKey()).rejects.toThrow(
        'Failed to retrieve connpass API key: API key not found in JSON secret'
      )
    })

    it('should handle ResourceNotFoundException', async () => {
      const error = new Error('Secret not found')
      error.name = 'ResourceNotFoundException'
      mockSend.mockRejectedValue(error)

      await expect(service.getConnpassApiKey()).rejects.toThrow(
        `Secret not found: ${mockSecretName}`
      )
    })

    it('should handle DecryptionFailureException', async () => {
      const error = new Error('Decryption failed')
      error.name = 'DecryptionFailureException'
      mockSend.mockRejectedValue(error)

      await expect(service.getConnpassApiKey()).rejects.toThrow(
        `Failed to decrypt secret: ${mockSecretName}`
      )
    })

    it('should handle generic errors', async () => {
      const error = new Error('Generic error')
      mockSend.mockRejectedValue(error)

      await expect(service.getConnpassApiKey()).rejects.toThrow(
        'Failed to retrieve connpass API key: Failed to retrieve secret test-connpass-api-key: Generic error'
      )
    })
  })

  describe('getSecretValue', () => {
    const mockSecretName = 'test-secret'

    it('should get secret value successfully', async () => {
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: 'secret-value',
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.getSecretValue(mockSecretName)

      expect(result).toBe(mockResponse)
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should handle various AWS errors', async () => {
      const testCases = [
        {
          errorName: 'ResourceNotFoundException',
          expectedMessage: `Secret not found: ${mockSecretName}`,
        },
        {
          errorName: 'InvalidParameterException',
          expectedMessage: `Invalid parameter for secret: ${mockSecretName}`,
        },
        {
          errorName: 'InvalidRequestException',
          expectedMessage: `Invalid request for secret: ${mockSecretName}`,
        },
        {
          errorName: 'InternalServiceErrorException',
          expectedMessage: `AWS Secrets Manager internal error for secret: ${mockSecretName}`,
        },
      ]

      for (const testCase of testCases) {
        const error = new Error('AWS Error')
        error.name = testCase.errorName
        mockSend.mockRejectedValue(error)

        await expect(service.getSecretValue(mockSecretName)).rejects.toThrow(
          testCase.expectedMessage
        )
      }
    })
  })

  describe('checkSecretExists', () => {
    const mockSecretName = 'test-secret'

    it('should return true if secret exists', async () => {
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: 'secret-value',
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.checkSecretExists(mockSecretName)

      expect(result).toBe(true)
    })

    it('should return false if secret does not exist', async () => {
      const error = new Error('Secret not found')
      error.name = 'ResourceNotFoundException'
      mockSend.mockRejectedValue(error)

      const result = await service.checkSecretExists(mockSecretName)

      expect(result).toBe(false)
    })
  })

  describe('validateConnpassApiKey', () => {
    beforeEach(() => {
      process.env.CONNPASS_API_SECRET_NAME = 'test-secret'
    })

    afterEach(() => {
      delete process.env.CONNPASS_API_SECRET_NAME
    })

    it('should return true for valid API key', async () => {
      const mockApiKey = 'valid-api-key'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: mockApiKey,
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)
      mockTestApiKey.mockResolvedValue(true)

      const result = await service.validateConnpassApiKey()

      expect(result).toBe(true)
    })

    it('should return false for invalid API key', async () => {
      const mockApiKey = 'invalid-api-key'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: mockApiKey,
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)
      mockTestApiKey.mockResolvedValue(false)

      const result = await service.validateConnpassApiKey()

      expect(result).toBe(false)
    })

    it('should return false when secret retrieval fails', async () => {
      const error = new Error('Secret not found')
      mockSend.mockRejectedValue(error)

      const result = await service.validateConnpassApiKey()

      expect(result).toBe(false)
    })
  })

  describe('getConnpassApiKeyWithFallback', () => {
    beforeEach(() => {
      process.env.CONNPASS_API_SECRET_NAME = 'primary-secret'
    })

    afterEach(() => {
      delete process.env.CONNPASS_API_SECRET_NAME
    })

    it('should get API key from primary secret', async () => {
      const mockApiKey = 'primary-api-key'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: mockApiKey,
        $metadata: {},
      }

      mockSend.mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKeyWithFallback()

      expect(result).toBe(mockApiKey)
    })

    it('should fallback to secondary secret when primary fails', async () => {
      const mockApiKey = 'fallback-api-key'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: mockApiKey,
        $metadata: {},
      }

      // 最初の呼び出しは失敗、2番目は成功
      mockSend
        .mockRejectedValueOnce(new Error('Primary secret not found'))
        .mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKeyWithFallback()

      expect(result).toBe(mockApiKey)
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('should throw error when all fallback secrets fail', async () => {
      const error = new Error('All secrets failed')
      mockSend.mockRejectedValue(error)

      await expect(service.getConnpassApiKeyWithFallback()).rejects.toThrow(
        'Failed to retrieve connpass API key from any of the fallback secrets'
      )
    })

    it('should handle JSON secret in fallback', async () => {
      const mockApiKey = 'json-fallback-api-key'
      const mockResponse: GetSecretValueCommandOutput = {
        SecretString: JSON.stringify({ apiKey: mockApiKey }),
        $metadata: {},
      }

      // 最初の呼び出しは失敗、2番目は成功
      mockSend
        .mockRejectedValueOnce(new Error('Primary secret not found'))
        .mockResolvedValue(mockResponse)

      const result = await service.getConnpassApiKeyWithFallback()

      expect(result).toBe(mockApiKey)
    })
  })
})
