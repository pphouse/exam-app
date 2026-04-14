import { supabase } from '../lib/supabase'
import type { ExamSession, Answer } from '../types'

export async function createExamSession(
  userId: string,
  mode: 'exam' | 'practice',
  totalQuestions: number,
  chapter: string | null = null
): Promise<ExamSession> {
  const { data, error } = await supabase
    .from('exam_sessions')
    .insert({
      user_id: userId,
      mode,
      chapter,
      started_at: new Date().toISOString(),
      total_questions: totalQuestions,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  userAnswer: string,
  correctAnswer: string
): Promise<Answer> {
  const isCorrect = userAnswer === correctAnswer

  const { data, error } = await supabase
    .from('answers')
    .insert({
      session_id: sessionId,
      question_id: questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // Update question stats
  await updateQuestionStats(questionId, isCorrect)

  return data
}

async function updateQuestionStats(questionId: string, isCorrect: boolean) {
  // First, try to get existing stats
  const { data: existing } = await supabase
    .from('question_stats')
    .select('*')
    .eq('question_id', questionId)
    .single()

  if (existing) {
    // Update existing stats
    const newTotal = existing.total_attempts + 1
    const newCorrect = existing.correct_count + (isCorrect ? 1 : 0)
    const newRate = (newCorrect / newTotal) * 100

    await supabase
      .from('question_stats')
      .update({
        total_attempts: newTotal,
        correct_count: newCorrect,
        accuracy_rate: newRate,
      })
      .eq('question_id', questionId)
  } else {
    // Insert new stats
    await supabase
      .from('question_stats')
      .insert({
        question_id: questionId,
        total_attempts: 1,
        correct_count: isCorrect ? 1 : 0,
        accuracy_rate: isCorrect ? 100 : 0,
      })
  }
}

export async function finishExamSession(
  sessionId: string,
  score: number
): Promise<void> {
  const { error } = await supabase
    .from('exam_sessions')
    .update({
      finished_at: new Date().toISOString(),
      score,
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function getSessionAnswers(sessionId: string): Promise<Answer[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getUserExamHistory(userId: string): Promise<ExamSession[]> {
  const { data, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'exam')
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data || []
}
