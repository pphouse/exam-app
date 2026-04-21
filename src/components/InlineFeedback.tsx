import { useState } from 'react'
import { submitFeedback } from '../services/feedback'
import type { FeedbackType } from '../types'

interface InlineFeedbackProps {
  questionId: string
}

const feedbackOptions: { type: FeedbackType; label: string }[] = [
  { type: 'just_right', label: 'ちょうどいい' },
  { type: 'too_easy', label: '簡単すぎる' },
  { type: 'too_hard', label: '難しすぎる' },
  { type: 'wrong_answer', label: '正解が間違っている' },
  { type: 'unclear', label: '問題文が不明瞭' },
  { type: 'suggestion', label: 'その他の提案' },
]

export default function InlineFeedback({ questionId }: InlineFeedbackProps) {
  const [showSuggestionInput, setShowSuggestionInput] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = async (type: FeedbackType) => {
    if (type === 'suggestion') {
      setShowSuggestionInput(true)
      return
    }

    // その他のフィードバックは即座に送信
    setSubmitting(true)
    const success = await submitFeedback(questionId, type)
    setSubmitting(false)

    if (success) {
      setSubmitted(true)
    }
  }

  const handleSubmitSuggestion = async () => {
    if (!comment.trim()) return

    setSubmitting(true)
    const success = await submitFeedback(questionId, 'suggestion', comment)
    setSubmitting(false)

    if (success) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 py-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        フィードバックありがとうございます
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">この問題について:</span>
      </div>

      {!showSuggestionInput ? (
        <div className="flex flex-wrap gap-2">
          {feedbackOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              disabled={submitting}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ご提案の内容"
            className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-gray-400"
            rows={2}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmitSuggestion}
              disabled={submitting || !comment.trim()}
              className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              {submitting ? '送信中...' : '送信'}
            </button>
            <button
              onClick={() => {
                setShowSuggestionInput(false)
                setComment('')
              }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
