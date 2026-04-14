import { supabase } from '../lib/supabase'
import type { Profile, UserStats, QuestionStats, ExamSession, Answer } from '../types'

// 現在のユーザーのプロフィールを取得
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to get profile:', error)
    return null
  }

  return data
}

// 管理者かどうかを確認
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}

// 全ユーザーの統計を取得（管理者のみ）
export async function getAllUserStats(): Promise<UserStats[]> {
  const { data, error } = await supabase
    .from('admin_user_stats')
    .select('*')
    .order('last_activity', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Failed to get user stats:', error)
    return []
  }

  return data || []
}

// 特定ユーザーの詳細統計を取得
export async function getUserDetailStats(userId: string): Promise<{
  profile: Profile | null
  examSessions: ExamSession[]
  chapterStats: Array<{ chapter: string; total: number; correct: number; accuracy: number }>
  recentAnswers: Array<Answer & { question: { question_text: string; chapter: string } }>
}> {
  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // 試験セッション取得
  const { data: examSessions } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // 章別統計を計算
  const { data: answers } = await supabase
    .from('answers')
    .select(`
      *,
      question:questions(chapter, question_text)
    `)
    .eq('session_id', examSessions?.map(s => s.id) || [])

  // 章別に集計
  const chapterMap = new Map<string, { total: number; correct: number }>()
  answers?.forEach((answer: any) => {
    const chapter = answer.question?.chapter
    if (!chapter) return
    const stats = chapterMap.get(chapter) || { total: 0, correct: 0 }
    stats.total++
    if (answer.is_correct) stats.correct++
    chapterMap.set(chapter, stats)
  })

  const chapterStats = Array.from(chapterMap.entries()).map(([chapter, stats]) => ({
    chapter,
    total: stats.total,
    correct: stats.correct,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  })).sort((a, b) => a.chapter.localeCompare(b.chapter))

  return {
    profile,
    examSessions: examSessions || [],
    chapterStats,
    recentAnswers: (answers || []).slice(0, 50) as any
  }
}

// 問題別統計を取得（管理者のみ）
export async function getQuestionStats(): Promise<QuestionStats[]> {
  const { data, error } = await supabase
    .from('admin_question_stats')
    .select('*')
    .order('accuracy_rate', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Failed to get question stats:', error)
    return []
  }

  return data || []
}

// 全体統計サマリーを取得
export async function getAdminOverviewStats(): Promise<{
  totalUsers: number
  activeUsers: number
  totalExams: number
  avgScore: number
  passRate: number
  totalQuestions: number
}> {
  // ユーザー数
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // アクティブユーザー（過去30日に活動）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: activeSessions } = await supabase
    .from('exam_sessions')
    .select('user_id')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const activeUsers = new Set(activeSessions?.map(s => s.user_id)).size

  // 試験統計
  const { data: examStats } = await supabase
    .from('exam_sessions')
    .select('score')
    .eq('mode', 'exam')
    .not('score', 'is', null)

  const totalExams = examStats?.length || 0
  const avgScore = totalExams > 0
    ? Math.round(examStats!.reduce((sum, e) => sum + (e.score || 0), 0) / totalExams)
    : 0
  const passRate = totalExams > 0
    ? Math.round((examStats!.filter(e => (e.score || 0) >= 70).length / totalExams) * 100)
    : 0

  // 問題数
  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  return {
    totalUsers: totalUsers || 0,
    activeUsers,
    totalExams,
    avgScore,
    passRate,
    totalQuestions: totalQuestions || 0
  }
}
