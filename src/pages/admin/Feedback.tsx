import { useState, useEffect } from 'react'
import { getAllFeedback } from '../../services/feedback'
import type { FeedbackQuestion } from '../../services/feedback'
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
  question: FeedbackQuestion
  profile: { email: string; full_name: string | null } | null
}

const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const

// 正解の集合 (例: "A,C" -> ["A","C"])
function correctSet(correct: string): string[] {
  return (correct || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// 表示する選択肢 (Eが無ければ4択)
function visibleOptions(q: FeedbackQuestion): string[] {
  return OPTIONS.filter((o) => o !== 'E' || !!q.choice_e)
}

function choiceText(q: FeedbackQuestion, option: string): string {
  const key = `choice_${option.toLowerCase()}` as keyof FeedbackQuestion
  return (q[key] as string) || ''
}

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackWithQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FeedbackType | ''>('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
              <span className="text-sm text-gray-700">
                {item.question?.question_text}
              </span>
            </div>

            {item.comment && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-2">
                {item.comment}
              </div>
            )}

            {item.question && (
              <>
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transform transition-transform ${expanded.has(item.id) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {expanded.has(item.id) ? '選択肢・解説を隠す' : '選択肢・解説を表示'}
                </button>

                {expanded.has(item.id) && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                    {/* Meta */}
                    <div className="flex flex-wrap gap-2">
                      {item.question.chapter && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {item.question.chapter}
                        </span>
                      )}
                      {item.question.difficulty && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {item.question.difficulty}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {item.question.question_type === 'multi' ? '2つ選べ' : '5択（単一）'}
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                        正解: {correctSet(item.question.correct_answer).join('・')}
                      </span>
                    </div>

                    {/* Choices */}
                    <div className="space-y-1.5">
                      {visibleOptions(item.question).map((option) => {
                        const isCorrect = correctSet(item.question.correct_answer).includes(option)
                        return (
                          <div
                            key={option}
                            className={`p-2 rounded-lg border text-sm ${
                              isCorrect ? 'bg-green-50 border-green-300' : 'border-gray-200'
                            }`}
                          >
                            <span className="font-medium text-gray-700 mr-2">{option}.</span>
                            <span className="text-gray-900">{choiceText(item.question, option)}</span>
                            {isCorrect && <span className="ml-2 text-green-600 text-xs">← 正解</span>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Explanation */}
                    {item.question.explanation && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-1 text-sm">解説</h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {item.question.explanation}
                        </p>
                        {item.question.why_wrong && Object.keys(item.question.why_wrong).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-1 text-sm">選択肢別の解説</h4>
                            <ul className="space-y-1">
                              {Object.entries(item.question.why_wrong).map(([opt, why]) => (
                                <li key={opt} className="text-gray-700 text-sm">
                                  <span className="font-medium">{opt}.</span> {why}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
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
