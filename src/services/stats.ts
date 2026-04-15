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
  const data = await getQuestionsWithStats()

  const totalQuestions = data.length
  // 回答済み問題数（1回でも回答された問題）
  const answeredQuestions = data.filter(q => q.stats && q.stats.total_attempts > 0).length
  // 正解率50%以上を「正解済み」とみなす（または最後の回答が正解など、要件次第）
  // ここでは「1回でも正解した問題」を正解済みとする
  const correctQuestions = data.filter(q => q.stats && q.stats.correct_count > 0).length
  const incorrectQuestions = answeredQuestions - correctQuestions

  // Group by chapter
  const chapterMap = new Map<string, { total: number; correct: number; incorrect: number }>()
  data.forEach(q => {
    const current = chapterMap.get(q.chapter) || { total: 0, correct: 0, incorrect: 0 }
    current.total++
    if (q.stats && q.stats.total_attempts > 0) {
      if (q.stats.correct_count > 0) {
        current.correct++
      } else {
        current.incorrect++
      }
    }
    chapterMap.set(q.chapter, current)
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

  // Group by difficulty
  const difficultyMap = new Map<string, { total: number; correct: number; incorrect: number }>()
  data.forEach(q => {
    const current = difficultyMap.get(q.difficulty) || { total: 0, correct: 0, incorrect: 0 }
    current.total++
    if (q.stats && q.stats.total_attempts > 0) {
      if (q.stats.correct_count > 0) {
        current.correct++
      } else {
        current.incorrect++
      }
    }
    difficultyMap.set(q.difficulty, current)
  })

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
    answeredQuestions,
    correctQuestions,
    incorrectQuestions,
    byChapter,
    byDifficulty,
  }
}
