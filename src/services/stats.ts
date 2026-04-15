import { supabase } from '../lib/supabase'
import type { QuestionStats, Question } from '../types'

export interface QuestionWithStats extends Question {
  stats: QuestionStats | null
}

export async function getQuestionsWithStats(): Promise<QuestionWithStats[]> {
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .order('question_id')

  if (qError) throw qError

  const { data: stats, error: sError } = await supabase
    .from('question_stats')
    .select('*')

  if (sError) throw sError

  const statsMap = new Map(stats?.map(s => [s.question_id, s]))

  return (questions || []).map(q => ({
    ...q,
    stats: statsMap.get(q.id) || null,
  }))
}

export async function getOverallStats(): Promise<{
  totalQuestions: number
  answeredQuestions: number
  correctQuestions: number
  incorrectQuestions: number
  byChapter: Array<{
    chapter: string
    total: number
    correct: number
    incorrect: number
    unanswered: number
  }>
  byDifficulty: Array<{
    difficulty: string
    total: number
    correct: number
    incorrect: number
    unanswered: number
  }>
}> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get all questions
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, chapter, difficulty')

  if (qError) throw qError

  // Get user's sessions
  const { data: sessions, error: sError } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('user_id', user.id)

  if (sError) throw sError

  const sessionIds = sessions?.map(s => s.id) || []

  // Get user's answers
  const { data: answers, error: aError } = sessionIds.length > 0
    ? await supabase
        .from('answers')
        .select('question_id, is_correct')
        .in('session_id', sessionIds)
    : { data: [], error: null }

  if (aError) throw aError

  // Build user's answer map: question_id -> { hasCorrect, hasIncorrect }
  const userAnswerMap = new Map<string, { hasCorrect: boolean; hasIncorrect: boolean }>()
  answers?.forEach(a => {
    const current = userAnswerMap.get(a.question_id) || { hasCorrect: false, hasIncorrect: false }
    if (a.is_correct) {
      current.hasCorrect = true
    } else {
      current.hasIncorrect = true
    }
    userAnswerMap.set(a.question_id, current)
  })

  const totalQuestions = questions?.length || 0
  let correctQuestions = 0
  let incorrectQuestions = 0

  // Group by chapter
  const chapterMap = new Map<string, { total: number; correct: number; incorrect: number }>()
  // Group by difficulty
  const difficultyMap = new Map<string, { total: number; correct: number; incorrect: number }>()

  questions?.forEach(q => {
    const userAnswer = userAnswerMap.get(q.id)
    const isCorrect = userAnswer?.hasCorrect || false
    const isIncorrect = !isCorrect && (userAnswer?.hasIncorrect || false)

    if (isCorrect) correctQuestions++
    if (isIncorrect) incorrectQuestions++

    // Chapter stats
    const chapterCurrent = chapterMap.get(q.chapter) || { total: 0, correct: 0, incorrect: 0 }
    chapterCurrent.total++
    if (isCorrect) chapterCurrent.correct++
    if (isIncorrect) chapterCurrent.incorrect++
    chapterMap.set(q.chapter, chapterCurrent)

    // Difficulty stats
    const diffCurrent = difficultyMap.get(q.difficulty) || { total: 0, correct: 0, incorrect: 0 }
    diffCurrent.total++
    if (isCorrect) diffCurrent.correct++
    if (isIncorrect) diffCurrent.incorrect++
    difficultyMap.set(q.difficulty, diffCurrent)
  })

  const byChapter = Array.from(chapterMap.entries())
    .map(([chapter, data]) => ({
      chapter,
      total: data.total,
      correct: data.correct,
      incorrect: data.incorrect,
      unanswered: data.total - data.correct - data.incorrect,
    }))
    .sort((a, b) => a.chapter.localeCompare(b.chapter))

  const byDifficulty = Array.from(difficultyMap.entries())
    .map(([difficulty, data]) => ({
      difficulty,
      total: data.total,
      correct: data.correct,
      incorrect: data.incorrect,
      unanswered: data.total - data.correct - data.incorrect,
    }))

  return {
    totalQuestions,
    answeredQuestions: correctQuestions + incorrectQuestions,
    correctQuestions,
    incorrectQuestions,
    byChapter,
    byDifficulty,
  }
}
