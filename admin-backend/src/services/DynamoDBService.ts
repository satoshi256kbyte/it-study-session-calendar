import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'
import { StudySession, CreateStudySessionRequest } from '../types/StudySession'
import { logger } from '../utils/logger'

export class DynamoDBService {
  private dynamodb: DynamoDBDocumentClient
  private tableName: string

  constructor() {
    const client = new DynamoDBClient({})
    this.dynamodb = DynamoDBDocumentClient.from(client)
    this.tableName = process.env.STUDY_SESSIONS_TABLE_NAME || 'StudySessions'
    logger.debug(`DynamoDBService initialized with table: ${this.tableName}`)
  }

  async createStudySession(
    request: CreateStudySessionRequest
  ): Promise<StudySession> {
    logger.debug('Creating study session:', request)

    const id = this.generateId()
    const now = new Date().toISOString()

    const session: StudySession = {
      id,
      title: request.title,
      url: request.url,
      datetime: request.datetime,
      endDatetime: request.endDatetime,
      contact: request.contact,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    logger.debug('Generated study session object:', session)

    await this.dynamodb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: session,
      })
    )

    logger.debug('Study session created successfully with ID:', id)
    return session
  }

  async getStudySessions(): Promise<StudySession[]> {
    logger.debug('Fetching all study sessions from DynamoDB')

    // 全データを取得
    const result = await this.dynamodb.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    )

    logger.debug('DynamoDB Scan result:', {
      Count: result.Count,
      ScannedCount: result.ScannedCount,
      ItemsLength: result.Items?.length || 0,
    })

    const allSessions = (result.Items as StudySession[]) || []
    logger.debug(`Retrieved ${allSessions.length} sessions from DynamoDB`)

    // 作成日時の降順でソート（新しいものが先）
    const sortedSessions = allSessions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    logger.debug(`Sorted ${sortedSessions.length} sessions by createdAt (desc)`)

    // デバッグ用：各セッションの基本情報をログ出力
    if (logger.getLogLevel() >= 3) {
      // DEBUG level
      sortedSessions.forEach((session, index) => {
        logger.debug(
          `Session ${index + 1}: ID=${session.id}, Title="${session.title}", Status=${session.status}, CreatedAt=${session.createdAt}`
        )
      })
    }

    return sortedSessions
  }

  async updateStudySessionStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<StudySession> {
    logger.debug(`Updating study session status: ID=${id}, Status=${status}`)

    // まず対象のアイテムを取得してcreatedAtを取得
    const session = await this.getStudySession(id)
    if (!session) {
      const error = `Study session with id ${id} not found`
      logger.error(error)
      throw new Error(error)
    }

    logger.debug(`Found session to update:`, session)

    const now = new Date().toISOString()

    const result = await this.dynamodb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          id: session.id,
          createdAt: session.createdAt,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    )

    const updatedSession = result.Attributes as StudySession
    logger.debug('Study session status updated successfully:', updatedSession)

    return updatedSession
  }

  async deleteStudySession(id: string): Promise<void> {
    logger.debug(`Deleting study session: ID=${id}`)

    // まず対象のアイテムを取得してcreatedAtを取得
    const session = await this.getStudySession(id)
    if (!session) {
      const error = `Study session with id ${id} not found`
      logger.error(error)
      throw new Error(error)
    }

    logger.debug(`Found session to delete:`, session)

    // 複合キー（id + createdAt）で削除
    await this.dynamodb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          id: session.id,
          createdAt: session.createdAt,
        },
      })
    )

    logger.debug(`Study session deleted successfully: ID=${id}`)
  }

  async getStudySession(id: string): Promise<StudySession | null> {
    logger.debug(`Fetching single study session: ID=${id}`)

    const result = await this.dynamodb.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': id,
        },
      })
    )

    logger.debug('Single session scan result:', {
      Count: result.Count,
      ScannedCount: result.ScannedCount,
      ItemsLength: result.Items?.length || 0,
    })

    const items = result.Items as StudySession[]
    const session = items && items.length > 0 ? items[0] : null

    if (session) {
      logger.debug(`Found session:`, session)
    } else {
      logger.debug(`No session found with ID: ${id}`)
    }

    return session
  }

  private generateId(): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    logger.debug(`Generated new ID: ${id}`)
    return id
  }
}
