import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUserDetailStats } from '../../services/admin'
import type { Profile, ExamSession } from '../../types'

interface UserDetailData {
  profile: Profile | null
  examSessions: ExamSession[]
  chapterStats: Array<{ chapter: string; total: number; correct: number; accuracy: number }>
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>()
  const [data, setData] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return
      try {
        const result = await getUserDetailStats(userId)
        setData(result)
      } catch (error) {
        console.error('Failed to fetch user detail:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data?.profile) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">ユーザーが見つかりませんでした</p>
        <Link to="/admin/users" className="text-gray-900 hover:underline">
          ユーザー一覧に戻る
        </Link>
      </div>
    )
  }

  const { profile, examSessions, chapterStats } = data
  const examOnlySessions = examSessions.filter(s => s.mode === 'exam' && s.score !== null)
  const avgScore = examOnlySessions.length > 0
    ? Math.round(examOnlySessions.reduce((sum, s) => sum + (s.score || 0), 0) / examOnlySessions.length)
    : null
  const passCount = examOnlySessions.filter(s => (s.score || 0) >= 70).length

  return (
    <div>
      {/* Back link */}
      <Link to="/admin/users" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        ← ユーザー一覧に戻る
      </Link>

      {/* User Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {profile.full_name || '(名前未設定)'}
              {profile.role === 'admin' && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-900 text-white rounded">
                  管理者
                </span>
              )}
            </h1>
            <p className="text-gray-500">{profile.email}</p>
            <p className="text-sm text-gray-400 mt-1">
              登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{examOnlySessions.length}</div>
          <div className="text-sm text-gray-500">試験回数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className={`text-2xl font-bold ${avgScore !== null && avgScore >= 70 ? 'text-green-600' : 'text-gray-900'}`}>
            {avgScore !== null ? `${avgScore}%` : '-'}
          </div>
          <div className="text-sm text-gray-500">平均スコア</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {passCount} / {examOnlySessions.length}
          </div>
          <div className="text-sm text-gray-500">合格回数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {examOnlySessions.length > 0 ? Math.round((passCount / examOnlySessions.length) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-500">合格率</div>
        </div>
      </div>

      {/* Chapter Stats */}
      {chapterStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">章別正解率</h2>
          <div className="space-y-3">
            {chapterStats.map((stat) => (
              <div key={stat.chapter}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{stat.chapter}</span>
                  <span className={`font-medium ${stat.accuracy >= 70 ? 'text-gray-900' : 'text-gray-500'}`}>
                    {stat.correct}/{stat.total} ({stat.accuracy}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${stat.accuracy >= 70 ? 'bg-gray-700' : 'bg-gray-400'}`}
                    style={{ width: `${stat.accuracy}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam History */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-4">試験履歴</h2>
        {examOnlySessions.length === 0 ? (
          <p className="text-gray-500 text-sm">試験履歴がありません</p>
        ) : (
          <div className="space-y-2">
            {examOnlySessions.map((session) => {
              const passed = (session.score || 0) >= 70
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {passed ? '合格' : '不合格'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {session.finished_at
                        ? new Date(session.finished_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className={`font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {session.score}%
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
