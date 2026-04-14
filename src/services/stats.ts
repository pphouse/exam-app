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
  averageAccuracy: number
  byChapter: Array<{
    chapter: string
    count: number
    avgAccuracy: number
  }>
  byDifficulty: Array<{
    difficulty: string
    count: number
    avgAccuracy: number
  }>
}> {
  const data = await getQuestionsWithStats()

  const totalQuestions = data.length
  const questionsWithStats = data.filter(q => q.stats)
  const totalAttempts = questionsWithStats.reduce((sum, q) => sum + (q.stats?.total_attempts || 0), 0)
  const averageAccuracy = questionsWithStats.length > 0
    ? questionsWithStats.reduce((sum, q) => sum + (q.stats?.accuracy_rate || 0), 0) / questionsWithStats.length
    : 0

  // Group by chapter
  const chapterMap = new Map<string, { count: number; totalAccuracy: number; withStats: number }>()
  data.forEach(q => {
    const current = chapterMap.get(q.chapter) || { count: 0, totalAccuracy: 0, withStats: 0 }
    current.count++
    if (q.stats) {
      current.totalAccuracy += q.stats.accuracy_rate
      current.withStats++
    }
    chapterMap.set(q.chapter, current)
  })

  const byChapter = Array.from(chapterMap.entries())
    .map(([chapter, data]) => ({
      chapter,
      count: data.count,
      avgAccuracy: data.withStats > 0 ? data.totalAccuracy / data.withStats : 0,
    }))
    .sort((a, b) => a.chapter.localeCompare(b.chapter))

  // Group by difficulty
  const difficultyMap = new Map<string, { count: number; totalAccuracy: number; withStats: number }>()
  data.forEach(q => {
    const current = difficultyMap.get(q.difficulty) || { count: 0, totalAccuracy: 0, withStats: 0 }
    current.count++
    if (q.stats) {
      current.totalAccuracy += q.stats.accuracy_rate
      current.withStats++
    }
    difficultyMap.set(q.difficulty, current)
  })

  const byDifficulty = Array.from(difficultyMap.entries())
    .map(([difficulty, data]) => ({
      difficulty,
      count: data.count,
      avgAccuracy: data.withStats > 0 ? data.totalAccuracy / data.withStats : 0,
    }))

  return {
    totalQuestions,
    totalAttempts,
    averageAccuracy,
    byChapter,
    byDifficulty,
  }
}
