export interface Todo {
  id: number
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  updatedAt: string
}

export type NotificationData = {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: string
}
