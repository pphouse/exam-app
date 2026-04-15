import { useState } from 'react'
import { submitFeedback } from '../services/feedback'
import type { FeedbackType } from '../types'

interface InlineFeedbackProps {
  questionId: string
}

const feedbackOptions: { type: FeedbackType; label: string; icon: string }[] = [
  { type: 'wrong_answer', label: '正解が違う', icon: '❌' },
  { type: 'unclear', label: '不明瞭', icon: '❓' },
  { type: 'too_easy', label: '簡単', icon: '😊' },
  { type: 'too_hard', label: '難しい', icon: '😰' },
  { type: 'suggestion', label: '提案', icon: '💡' },
]

export default function InlineFeedback({ questionId }: InlineFeedbackProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (type: FeedbackType) => {
    if (selectedType === type) {
      setSelectedType(null)
    } else {
      setSelectedType(type)
    }
  }

  const handleSubmit = async () => {
    if (!selectedType) return

    setSubmitting(true)
    const success = await submitFeedback(questionId, selectedType, comment)
    setSubmitting(false)

    if (success) {
      setSubmitted(true)
    }
  }

  const needsComment = selectedType === 'wrong_answer' || selectedType === 'suggestion'

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

      <div className="flex flex-wrap gap-2">
        {feedbackOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => handleSelect(option.type)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
              selectedType === option.type
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="mt-3 space-y-2">
          {needsComment && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={selectedType === 'wrong_answer' ? '正しい答えを教えてください' : 'ご提案の内容'}
              className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-gray-400"
              rows={2}
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || (needsComment && !comment.trim())}
              className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              {submitting ? '送信中...' : '送信'}
            </button>
            <button
              onClick={() => {
                setSelectedType(null)
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
