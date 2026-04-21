import { supabase } from '../lib/supabase'
import type { Question } from '../types'

export async function getRandomQuestions(count: number): Promise<Question[]> {
  // Get all question IDs first
  const { data: allQuestions, error: listError } = await supabase
    .from('questions')
    .select('id')

  if (listError) throw listError
  if (!allQuestions || allQuestions.length === 0) return []

  // Shuffle and take the first `count` items
  const shuffled = allQuestions.sort(() => Math.random() - 0.5)
  const selectedIds = shuffled.slice(0, Math.min(count, shuffled.length)).map(q => q.id)

  // Fetch full question data
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('id', selectedIds)

  if (error) throw error

  // Shuffle the result to randomize order
  return (data || []).sort(() => Math.random() - 0.5)
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
