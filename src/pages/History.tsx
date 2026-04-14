import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUserExamHistory } from '../services/exam'
import type { ExamSession } from '../types'

export default function History() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return

      try {
        const data = await getUserExamHistory(user.id)
        setSessions(data)
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">受験履歴</h1>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600 mb-4">まだ受験履歴がありません</p>
          <Link
            to="/exam"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            模擬試験を受ける
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const passed = (session.score || 0) >= 70
            const date = new Date(session.finished_at!)

            return (
              <Link
                key={session.id}
                to={`/exam/result/${session.id}`}
                className="block bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-sm font-medium rounded ${
                          passed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {passed ? '合格' : '不合格'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {session.total_questions}問
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {date.toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-3xl font-bold ${
                        passed ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {session.score}%
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
