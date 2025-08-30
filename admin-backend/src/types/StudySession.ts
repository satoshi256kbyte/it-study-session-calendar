import { Material } from './EventMaterial'

export interface StudySession {
  id: string
  title: string
  url: string
  datetime: string
  endDatetime?: string
  contact?: string
  status: 'pending' | 'approved' | 'rejected'
  connpassUrl?: string
  materials?: Material[]
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
