import { ConnpassApiError } from '../../services/ConnpassApiService'
import { DynamoDBError } from '../../services/DynamoDBService'

describe('Error Handling Classes', () => {
  it('should create ConnpassApiError with correct properties', () => {
    const error = new ConnpassApiError(
      'Test connpass error',
      'TEST_ERROR',
      400,
      false
    )

    expect(error.name).toBe('ConnpassApiError')
    expect(error.message).toBe('Test connpass error')
    expect(error.errorCode).toBe('TEST_ERROR')
    expect(error.httpStatus).toBe(400)
    expect(error.retryable).toBe(false)
    expect(error instanceof Error).toBe(true)
  })

  it('should create DynamoDBError with correct properties', () => {
    const originalError = new Error('Original error')
    const error = new DynamoDBError(
      'Test DynamoDB error',
      'TEST_DB_ERROR',
      'testOperation',
      originalError
    )

    expect(error.name).toBe('DynamoDBError')
    expect(error.message).toBe('Test DynamoDB error')
    expect(error.errorCode).toBe('TEST_DB_ERROR')
    expect(error.operation).toBe('testOperation')
    expect(error.originalError).toBe(originalError)
    expect(error instanceof Error).toBe(true)
  })
})
