export interface Question {
  id: string
  question_id: string
  chapter: string
  keyword: string | null
  difficulty: string
  bloom_level: string | null
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_answer: string
  explanation: string | null
  incorrect_explanation: string | null
  source: string | null
  created_at: string
  updated_at: string
}

export interface ExamSession {
  id: string
  user_id: string
  mode: 'exam' | 'practice'
  chapter: string | null
  started_at: string
  finished_at: string | null
  score: number | null
  total_questions: number
  created_at: string
}

export interface Answer {
  id: string
  session_id: string
  question_id: string
  user_answer: string
  is_correct: boolean
  answered_at: string
  created_at: string
  time_taken_seconds: number | null
}

export interface QuestionStats {
  id: string
  question_id: string
  total_attempts: number
  correct_count: number
  accuracy_rate: number
  updated_at: string
}
