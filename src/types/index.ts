export * from './database'

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
}

export interface ExamState {
  sessionId: string
  questions: import('./database').Question[]
  currentIndex: number
  answers: Record<string, string>
  startTime: Date
  timeLimit: number // seconds
}

export interface PracticeState {
  chapter: string | null
  currentQuestion: import('./database').Question | null
  showAnswer: boolean
  sessionId: string
}
