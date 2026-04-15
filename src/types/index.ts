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

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface UserStats {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
  created_at: string
  total_exams: number
  exam_count: number
  practice_count: number
  avg_exam_score: number | null
  passed_count: number
  last_activity: string | null
}

export interface QuestionStats {
  id: string
  question_id: string
  chapter: string
  difficulty: string
  question_text: string
  total_attempts: number
  correct_count: number
  accuracy_rate: number | null
}

export type FeedbackType = 'too_easy' | 'too_hard' | 'wrong_answer' | 'unclear' | 'suggestion'

export interface QuestionFeedback {
  id: string
  question_id: string
  user_id: string
  feedback_type: FeedbackType
  comment: string | null
  created_at: string
}
