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
  totalAttempts: number
  totalCorrect: number
  averageAccuracy: number
  byChapter: Array<{
    chapter: string
    questionCount: number
    attempts: number
    correct: number
    avgAccuracy: number
  }>
  byDifficulty: Array<{
    difficulty: string
    questionCount: number
    attempts: number
    correct: number
    avgAccuracy: number
  }>
}> {
  const data = await getQuestionsWithStats()

  const totalQuestions = data.length
  const questionsWithStats = data.filter(q => q.stats)
  const totalAttempts = questionsWithStats.reduce((sum, q) => sum + (q.stats?.total_attempts || 0), 0)
  const totalCorrect = questionsWithStats.reduce((sum, q) => sum + (q.stats?.correct_count || 0), 0)
  const averageAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0

  // Group by chapter
  const chapterMap = new Map<string, { questionCount: number; attempts: number; correct: number }>()
  data.forEach(q => {
    const current = chapterMap.get(q.chapter) || { questionCount: 0, attempts: 0, correct: 0 }
    current.questionCount++
    if (q.stats) {
      current.attempts += q.stats.total_attempts || 0
      current.correct += q.stats.correct_count || 0
    }
    chapterMap.set(q.chapter, current)
  })

  const byChapter = Array.from(chapterMap.entries())
    .map(([chapter, data]) => ({
      chapter,
      questionCount: data.questionCount,
      attempts: data.attempts,
      correct: data.correct,
      avgAccuracy: data.attempts > 0 ? (data.correct / data.attempts) * 100 : 0,
    }))
    .sort((a, b) => a.chapter.localeCompare(b.chapter))

  // Group by difficulty
  const difficultyMap = new Map<string, { questionCount: number; attempts: number; correct: number }>()
  data.forEach(q => {
    const current = difficultyMap.get(q.difficulty) || { questionCount: 0, attempts: 0, correct: 0 }
    current.questionCount++
    if (q.stats) {
      current.attempts += q.stats.total_attempts || 0
      current.correct += q.stats.correct_count || 0
    }
    difficultyMap.set(q.difficulty, current)
  })

  const byDifficulty = Array.from(difficultyMap.entries())
    .map(([difficulty, data]) => ({
      difficulty,
      questionCount: data.questionCount,
      attempts: data.attempts,
      correct: data.correct,
      avgAccuracy: data.attempts > 0 ? (data.correct / data.attempts) * 100 : 0,
    }))

  return {
    totalQuestions,
    totalAttempts,
    totalCorrect,
    averageAccuracy,
    byChapter,
    byDifficulty,
  }
}
