import { useState, useEffect } from 'react'
import { getAllFeedback } from '../../services/feedback'
import type { QuestionFeedback, FeedbackType } from '../../types'

const feedbackTypeLabels: Record<FeedbackType, string> = {
  just_right: 'ちょうどいい',
  wrong_answer: '正解が間違っている',
  unclear: '問題文が不明瞭',
  too_easy: '簡単すぎる',
  too_hard: '難しすぎる',
  suggestion: 'その他の提案',
}

const feedbackTypeColors: Record<FeedbackType, string> = {
  just_right: 'bg-green-100 text-green-700',
  wrong_answer: 'bg-red-100 text-red-700',
  unclear: 'bg-yellow-100 text-yellow-700',
  too_easy: 'bg-blue-100 text-blue-700',
  too_hard: 'bg-purple-100 text-purple-700',
  suggestion: 'bg-gray-100 text-gray-700',
}

type FeedbackWithQuestion = QuestionFeedback & {
  question: { question_id: string; question_text: string }
  profile: { email: string; full_name: string | null } | null
}

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackWithQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FeedbackType | ''>('')

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const data = await getAllFeedback()
        setFeedback(data as FeedbackWithQuestion[])
      } catch (error) {
        console.error('Failed to fetch feedback:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFeedback()
  }, [])

  const filteredFeedback = filterType
    ? feedback.filter(f => f.feedback_type === filterType)
    : feedback

  // Count by type
  const typeCounts = feedback.reduce((acc, f) => {
    acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1
    return acc
  }, {} as Record<FeedbackType, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">フィードバック</h1>
        <div className="text-sm text-gray-500">{feedback.length} 件</div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {(Object.keys(feedbackTypeLabels) as FeedbackType[]).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? '' : type)}
            className={`p-3 rounded-lg border text-center transition-colors ${
              filterType === type
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-lg font-bold text-gray-900">{typeCounts[type] || 0}</div>
            <div className="text-xs text-gray-500">{feedbackTypeLabels[type]}</div>
          </button>
        ))}
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {filteredFeedback.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${feedbackTypeColors[item.feedback_type]}`}>
                  {feedbackTypeLabels[item.feedback_type]}
                </span>
                <span className="text-xs text-gray-500">
                  {item.profile?.full_name || item.profile?.email || '不明'}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(item.created_at).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="mb-2">
              <span className="text-xs text-gray-500 mr-2">{item.question?.question_id}</span>
              <span className="text-sm text-gray-700 line-clamp-2">
                {item.question?.question_text}
              </span>
            </div>

            {item.comment && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                {item.comment}
              </div>
            )}
          </div>
        ))}

        {filteredFeedback.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            フィードバックがありません
          </div>
        )}
      </div>
    </div>
  )
}
