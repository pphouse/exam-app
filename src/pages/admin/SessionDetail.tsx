import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSessionDetail } from '../../services/admin'

type SessionDetailData = Awaited<ReturnType<typeof getSessionDetail>>

export default function AdminSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [data, setData] = useState<SessionDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) return
      try {
        const result = await getSessionDetail(sessionId)
        setData(result)
      } catch (error) {
        console.error('Failed to fetch session detail:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data?.session) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">セッションが見つかりませんでした</p>
        <Link to="/admin/users" className="text-gray-900 hover:underline">
          ユーザー一覧に戻る
        </Link>
      </div>
    )
  }

  const { session, profile, answers, allQuestions } = data
  const answerMap = new Map(answers.map((a) => [a.question_id, a]))
  const questions = allQuestions.length > 0 ? allQuestions : answers.map((a) => ({
    id: a.question_id,
    question_id: a.question?.question_id || '',
    chapter: a.question?.chapter || '',
    question_text: a.question?.question_text || '',
    correct_answer: a.question?.correct_answer || '',
  }))

  const correctCount = answers.filter((a) => a.is_correct).length
  const isExam = session.mode === 'exam'

  return (
    <div>
      <Link
        to={profile ? `/admin/users/${profile.id}` : '/admin/users'}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← ユーザー詳細に戻る
      </Link>

      {/* Session Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isExam ? '模擬試験' : '練習'} セッション
              {!session.finished_at && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                  進行中
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              {profile?.full_name || profile?.email || '不明'}
            </p>
          </div>
          {isExam && session.score !== null && (
            <div className={`text-2xl font-bold ${session.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
              {session.score}%
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-gray-500">開始</div>
            <div className="text-gray-900">
              {new Date(session.started_at).toLocaleString('ja-JP')}
            </div>
          </div>
          <div>
            <div className="text-gray-500">終了</div>
            <div className="text-gray-900">
              {session.finished_at
                ? new Date(session.finished_at).toLocaleString('ja-JP')
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">回答数</div>
            <div className="text-gray-900">
              {answers.length} / {questions.length || session.total_questions}
            </div>
          </div>
          <div>
            <div className="text-gray-500">正解数</div>
            <div className="text-gray-900">
              {correctCount} ({answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0}%)
            </div>
          </div>
        </div>
      </div>

      {/* Answers List */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-4">問題ごとの回答</h2>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const answer = answerMap.get(q.id)
            const isAnswered = !!answer
            const isCorrect = answer?.is_correct ?? false

            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  !isAnswered
                    ? 'bg-gray-50 border-gray-200'
                    : isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">
                      #{i + 1}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded">
                      {q.question_id}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded">
                      {q.chapter}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        !isAnswered
                          ? 'bg-gray-200 text-gray-600'
                          : isCorrect
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {!isAnswered ? '未回答' : isCorrect ? '正解' : '不正解'}
                    </span>
                  </div>
                  {answer?.time_taken_seconds !== null && answer?.time_taken_seconds !== undefined && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {answer.time_taken_seconds}秒
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">
                  {q.question_text}
                </p>

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">回答:</span>{' '}
                    <span className={`font-medium ${
                      !isAnswered
                        ? 'text-gray-400'
                        : isCorrect
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {answer?.user_answer || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">正解:</span>{' '}
                    <span className="font-medium text-gray-900">{q.correct_answer}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
