import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { StudySession, CreateStudySessionRequest } from '../types/StudySession'

export class DynamoDBService {
  private dynamodb: DynamoDBDocumentClient
  private tableName: string

  constructor() {
    const client = new DynamoDBClient({})
    this.dynamodb = DynamoDBDocumentClient.from(client)
    this.tableName = process.env.STUDY_SESSIONS_TABLE_NAME || 'StudySessions'
  }

  async createStudySession(request: CreateStudySessionRequest): Promise<StudySession> {
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
      updatedAt: now
    }

    await this.dynamodb.send(new PutCommand({
      TableName: this.tableName,
      Item: session
    }))

    return session
  }

  async getStudySessions(page: number = 1, limit: number = 10): Promise<{
    sessions: StudySession[]
    totalCount: number
  }> {
    // 実際の実装では、DynamoDBのクエリやスキャンを使用
    // ここではサンプル実装
    const result = await this.dynamodb.send(new ScanCommand({
      TableName: this.tableName
    }))

    const sessions = (result.Items as StudySession[]) || []
    const totalCount = sessions.length
    
    // ページネーション
    const startIndex = (page - 1) * limit
    const paginatedSessions = sessions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(startIndex, startIndex + limit)

    return {
      sessions: paginatedSessions,
      totalCount
    }
  }

  async updateStudySessionStatus(id: string, status: 'approved' | 'rejected'): Promise<StudySession> {
    const now = new Date().toISOString()
    
    const result = await this.dynamodb.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': now
      },
      ReturnValues: 'ALL_NEW'
    }))

    return result.Attributes as StudySession
  }

  async deleteStudySession(id: string): Promise<void> {
    await this.dynamodb.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { id }
    }))
  }

  async getStudySession(id: string): Promise<StudySession | null> {
    const result = await this.dynamodb.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id
      }
    }))

    const items = result.Items as StudySession[]
    return items && items.length > 0 ? items[0] : null
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}
