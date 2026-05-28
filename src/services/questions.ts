import { supabase } from '../lib/supabase'
import type { Question } from '../types'

// Fisher-Yates shuffle (sort(()=>Math.random()-0.5) はバイアスが生じるため使用しない)
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 模擬試験用: 章別の比例配分で60問を抽出
// 各章の問題数 (45/60/60/55/45/35/10) から、60問になるよう比例配分
const EXAM_DISTRIBUTION: Record<string, number> = {
  '第1章': 9,
  '第2章': 12,
  '第3章': 12,
  '第4章': 10,
  '第5章': 9,
  '第6章': 7,
  '第7章': 1,
}

export async function getExamQuestions(): Promise<Question[]> {
  const { data: allQuestions, error } = await supabase.from('questions').select('*')
  if (error) throw error
  if (!allQuestions) return []

  const byChapter: Record<string, Question[]> = {}
  for (const q of allQuestions) {
    if (!byChapter[q.chapter]) byChapter[q.chapter] = []
    byChapter[q.chapter].push(q)
  }

  const selected: Question[] = []
  for (const [chapter, count] of Object.entries(EXAM_DISTRIBUTION)) {
    const pool = byChapter[chapter] || []
    selected.push(...shuffle(pool).slice(0, count))
  }
  // 出題順もシャッフル
  return shuffle(selected)
}

export async function getRandomQuestions(count: number): Promise<Question[]> {
  const { data: allQuestions, error } = await supabase.from('questions').select('*')
  if (error) throw error
  if (!allQuestions || allQuestions.length === 0) return []
  return shuffle(allQuestions).slice(0, Math.min(count, allQuestions.length))
}

export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('id', ids)

  if (error) throw error
  if (!data) return []

  // Preserve the original order of ids
  const map = new Map(data.map(q => [q.id, q]))
  return ids.map(id => map.get(id)).filter((q): q is Question => !!q)
}

export async function getQuestionsByChapter(chapter: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('chapter', chapter)

  if (error) throw error
  return data || []
}

export async function getRandomQuestionByChapter(chapter: string | null): Promise<Question | null> {
  let query = supabase.from('questions').select('*')

  if (chapter) {
    query = query.eq('chapter', chapter)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return null

  // Return random question
  const randomIndex = Math.floor(Math.random() * data.length)
  return data[randomIndex]
}

export async function getAllChapters(): Promise<string[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('chapter')

  if (error) throw error

  const chapters = [...new Set(data?.map(q => q.chapter) || [])]
  return chapters.sort()
}

export async function getUnansweredQuestionByChapter(
  userId: string,
  chapter: string | null
): Promise<Question | null> {
  // Get user's sessions
  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('user_id', userId)

  const sessionIds = sessions?.map(s => s.id) || []

  // Get questions user has answered correctly
  let answeredCorrectlyIds: string[] = []
  if (sessionIds.length > 0) {
    const { data: correctAnswers } = await supabase
      .from('answers')
      .select('question_id')
      .in('session_id', sessionIds)
      .eq('is_correct', true)

    answeredCorrectlyIds = [...new Set(correctAnswers?.map(a => a.question_id) || [])]
  }

  // Get all questions for the chapter
  let query = supabase.from('questions').select('*')
  if (chapter) {
    query = query.eq('chapter', chapter)
  }

  const { data: questions, error } = await query

  if (error) throw error
  if (!questions || questions.length === 0) return null

  // Filter out correctly answered questions
  const unanswered = questions.filter(q => !answeredCorrectlyIds.includes(q.id))

  if (unanswered.length === 0) return null

  // Return random unanswered question
  const randomIndex = Math.floor(Math.random() * unanswered.length)
  return unanswered[randomIndex]
}

export async function getUnansweredCountByChapter(
  userId: string
): Promise<Record<string, { total: number; unanswered: number }>> {
  // Get user's sessions
  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('user_id', userId)

  const sessionIds = sessions?.map(s => s.id) || []

  // Get questions user has answered correctly
  let answeredCorrectlyIds: string[] = []
  if (sessionIds.length > 0) {
    const { data: correctAnswers } = await supabase
      .from('answers')
      .select('question_id')
      .in('session_id', sessionIds)
      .eq('is_correct', true)

    answeredCorrectlyIds = [...new Set(correctAnswers?.map(a => a.question_id) || [])]
  }

  // Get all questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, chapter')

  if (error) throw error

  // Count by chapter
  const result: Record<string, { total: number; unanswered: number }> = {}
  questions?.forEach(q => {
    if (!result[q.chapter]) {
      result[q.chapter] = { total: 0, unanswered: 0 }
    }
    result[q.chapter].total++
    if (!answeredCorrectlyIds.includes(q.id)) {
      result[q.chapter].unanswered++
    }
  })

  return result
}
