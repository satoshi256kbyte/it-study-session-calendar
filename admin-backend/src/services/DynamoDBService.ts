import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { StudySession, CreateStudySessionRequest } from '../types/StudySession'
import {
  EventRecord,
  EventWithMaterials,
  Material,
} from '../types/EventMaterial'
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

  /**
   * connpassイベントで資料があるもののみを日付範囲で取得
   * 要件1.2, 6.1, 6.2に対応
   */
  async queryEventsByDateRange(
    status: 'approved' | 'pending' | 'rejected',
    startDate: string,
    endDate: string
  ): Promise<EventWithMaterials[]> {
    logger.debug(
      `Querying events by date range: status=${status}, startDate=${startDate}, endDate=${endDate}`
    )

    try {
      // StatusIndexを使用してクエリ
      const result = await this.dynamodb.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          FilterExpression:
            '#datetime BETWEEN :startDate AND :endDate AND attribute_exists(connpassUrl) AND attribute_exists(materials)',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#datetime': 'datetime',
          },
          ExpressionAttributeValues: {
            ':status': status,
            ':startDate': startDate,
            ':endDate': endDate,
          },
          ScanIndexForward: false, // 降順（最新が最初）
        })
      )

      logger.debug('Events query result:', {
        Count: result.Count,
        ScannedCount: result.ScannedCount,
        ItemsLength: result.Items?.length || 0,
      })

      const sessions = (result.Items as StudySession[]) || []

      // connpassイベントで資料があるもののみをフィルタリング
      const filteredSessions = sessions.filter(
        session =>
          session.connpassUrl &&
          session.materials &&
          session.materials.length > 0
      )

      logger.debug(
        `Filtered ${filteredSessions.length} sessions with connpass URL and materials from ${sessions.length} total sessions`
      )

      // EventWithMaterials形式に変換
      const eventsWithMaterials: EventWithMaterials[] = filteredSessions.map(
        session => ({
          id: session.id,
          title: session.title,
          eventDate: session.datetime,
          eventUrl: session.url,
          materials: session.materials || [],
          connpassUrl: session.connpassUrl!, // フィルター済みなので非null
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })
      )

      logger.debug(
        `Converted ${eventsWithMaterials.length} sessions to EventWithMaterials format`
      )

      return eventsWithMaterials
    } catch (error) {
      logger.error('Error querying events by date range:', error)
      throw error
    }
  }

  /**
   * connpassイベントで資料があるもののみを取得（過去N ヶ月分）
   * 要件1.2に対応
   */
  async getEventsWithMaterials(
    months: number = 6
  ): Promise<EventWithMaterials[]> {
    logger.debug(`Getting events with materials for past ${months} months`)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const startDateISO = startDate.toISOString()
    const endDateISO = endDate.toISOString()

    logger.debug(`Date range: ${startDateISO} to ${endDateISO}`)

    return await this.queryEventsByDateRange(
      'approved',
      startDateISO,
      endDateISO
    )
  }

  /**
   * イベントレコードを作成または更新（StudySessionとして保存）
   * 要件6.1, 6.2に対応
   */
  async upsertEventRecord(eventRecord: EventRecord): Promise<EventRecord> {
    logger.debug('Upserting event record:', {
      eventId: eventRecord.eventId,
      title: eventRecord.title,
    })

    try {
      // EventRecordをStudySession形式に変換
      const studySession: StudySession = {
        id: eventRecord.eventId,
        title: eventRecord.title,
        url: eventRecord.eventUrl,
        datetime: eventRecord.eventDate,
        endDatetime: eventRecord.endDatetime,
        contact: eventRecord.contact,
        status: eventRecord.status,
        connpassUrl: eventRecord.connpassUrl,
        materials: eventRecord.materials,
        createdAt: eventRecord.createdAt,
        updatedAt: eventRecord.updatedAt,
      }

      await this.dynamodb.send(
        new PutCommand({
          TableName: this.tableName,
          Item: studySession,
        })
      )

      logger.debug('Event record upserted successfully:', eventRecord.eventId)
      return eventRecord
    } catch (error) {
      logger.error('Error upserting event record:', error)
      throw error
    }
  }

  /**
   * connpass URLを持つ承認済みイベントを取得（バッチ処理用）
   * 要件6.1に対応
   */
  async getApprovedEventsWithConnpassUrl(): Promise<EventRecord[]> {
    logger.debug(
      'Getting approved events with connpass URL for batch processing'
    )

    try {
      const result = await this.dynamodb.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression:
            '#status = :status AND attribute_exists(connpassUrl)',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': 'approved',
          },
        })
      )

      logger.debug('Connpass events scan result:', {
        Count: result.Count,
        ScannedCount: result.ScannedCount,
        ItemsLength: result.Items?.length || 0,
      })

      const sessions = (result.Items as StudySession[]) || []

      // StudySessionをEventRecord形式に変換（connpassUrlが存在するもののみ）
      const events: EventRecord[] = sessions
        .filter(session => session.connpassUrl) // connpassUrlが存在するもののみ
        .map(session => ({
          eventId: session.id,
          title: session.title,
          eventDate: session.datetime,
          endDatetime: session.endDatetime,
          eventUrl: session.url,
          contact: session.contact,
          status: session.status,
          connpassUrl: session.connpassUrl!, // フィルター済みなので非null
          materials: session.materials || [],
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }))

      logger.debug(
        `Retrieved ${events.length} approved events with connpass URL`
      )

      return events
    } catch (error) {
      logger.error('Error getting approved events with connpass URL:', error)
      throw error
    }
  }
}
