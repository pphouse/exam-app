import { supabase } from '../lib/supabase'
import type { FeedbackType, QuestionFeedback } from '../types'

export async function submitFeedback(
  questionId: string,
  feedbackType: FeedbackType,
  comment?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('question_feedback')
    .insert({
      question_id: questionId,
      user_id: user.id,
      feedback_type: feedbackType,
      comment: comment || null,
    })

  if (error) {
    console.error('Failed to submit feedback:', error)
    return false
  }

  return true
}

export async function getFeedbackForQuestion(questionId: string): Promise<QuestionFeedback[]> {
  const { data, error } = await supabase
    .from('question_feedback')
    .select('*')
    .eq('question_id', questionId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get feedback:', error)
    return []
  }

  return data || []
}

export async function getAllFeedback(): Promise<(QuestionFeedback & {
  question: { question_id: string; question_text: string }
  profile: { email: string; full_name: string | null } | null
})[]> {
  const { data, error } = await supabase
    .from('question_feedback')
    .select(`
      *,
      question:questions(question_id, question_text),
      profile:profiles(email, full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get all feedback:', error)
    return []
  }

  return data || []
}
