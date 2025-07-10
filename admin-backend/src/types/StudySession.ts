export interface StudySession {
  id: string
  title: string
  url: string
  datetime: string
  endDatetime?: string
  contact?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface CreateStudySessionRequest {
  title: string
  url: string
  datetime: string
  endDatetime?: string
  contact?: string
}

export interface StudySessionListResponse {
  sessions: StudySession[]
  totalCount: number
  totalPages: number
  currentPage: number
}
