import { supabase } from '../lib/supabase'
import type { ExamSession, Answer } from '../types'

export async function createExamSession(
  userId: string,
  mode: 'exam' | 'practice',
  totalQuestions: number,
  chapter: string | null = null,
  questionIds: string[] | null = null
): Promise<ExamSession> {
  // 新規開始前に、回答が1件も無い「空の」未完了セッションを掃除する。
  // (試験ページを開いただけ・二重生成などで溜まる空セッションが、中断した本物の
  //  セッションより新しく見えて再開を奪うのを防ぐ。回答済みセッションは残す。)
  if (mode === 'exam') {
    await cleanupEmptyExamSessions(userId)
  }

  const { data, error } = await supabase
    .from('exam_sessions')
    .insert({
      user_id: userId,
      mode,
      chapter,
      started_at: new Date().toISOString(),
      total_questions: totalQuestions,
      question_ids: questionIds,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// 回答が1件も無い未完了の試験セッションを削除する（進捗のあるものは残す）
export async function cleanupEmptyExamSessions(userId: string): Promise<void> {
  const { data: openSessions, error } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('mode', 'exam')
    .is('finished_at', null)

  if (error || !openSessions || openSessions.length === 0) return

  const ids = openSessions.map((s) => s.id)
  const { data: answered } = await supabase
    .from('answers')
    .select('session_id')
    .in('session_id', ids)

  const withAnswers = new Set((answered || []).map((a) => a.session_id))
  const emptyIds = ids.filter((id) => !withAnswers.has(id))
  if (emptyIds.length > 0) {
    await supabase.from('exam_sessions').delete().in('id', emptyIds)
  }
}

export async function getUnfinishedExamSession(userId: string): Promise<ExamSession | null> {
  const { data, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'exam')
    .is('finished_at', null)
    .not('question_ids', 'is', null)
    .order('started_at', { ascending: false })
    .limit(25)

  if (error) throw error
  if (!data || data.length === 0) return null

  // 「保存して中断」したセッションは last_question_index が記録される。
  // 中断済みセッションを最優先で返し、それ以外（開いただけの新しい空セッション等）に
  // 再開を奪われないようにする。中断済みが無ければ最新の未完了を返す。
  const paused = data.find(
    (s) => s.last_question_index !== null && s.last_question_index !== undefined
  )
  return paused ?? data[0]
}

export async function abandonExamSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('exam_sessions')
    .update({ finished_at: new Date().toISOString(), score: 0 })
    .eq('id', sessionId)

  if (error) throw error
}

export async function pauseExamSession(
  sessionId: string,
  lastQuestionIndex?: number
): Promise<void> {
  // started_at をリセットしてタイマーを再開時にリセット。
  // lastQuestionIndex が指定されていれば、再開時にその問題から始まる。
  const update: { started_at: string; last_question_index?: number } = {
    started_at: new Date().toISOString(),
  }
  if (typeof lastQuestionIndex === 'number') {
    update.last_question_index = lastQuestionIndex
  }
  const { error } = await supabase
    .from('exam_sessions')
    .update(update)
    .eq('id', sessionId)

  if (error) throw error
}

function normalize(a: string): string {
  return (a || '').split(',').map((s) => s.trim()).filter(Boolean).sort().join(',')
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  userAnswer: string,
  correctAnswer: string,
  timeTakenSeconds?: number
): Promise<Answer> {
  const isCorrect = normalize(userAnswer) === normalize(correctAnswer)

  const { data, error } = await supabase
    .from('answers')
    .insert({
      session_id: sessionId,
      question_id: questionId,
      user_answer: userAnswer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
      time_taken_seconds: timeTakenSeconds ?? null,
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
