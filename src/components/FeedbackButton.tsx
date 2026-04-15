import { useState } from 'react'
import { submitFeedback } from '../services/feedback'
import type { FeedbackType } from '../types'

interface FeedbackButtonProps {
  questionId: string
}

const feedbackOptions: { type: FeedbackType; label: string }[] = [
  { type: 'wrong_answer', label: '正解が間違っている' },
  { type: 'unclear', label: '問題文が不明瞭' },
  { type: 'too_easy', label: '簡単すぎる' },
  { type: 'too_hard', label: '難しすぎる' },
  { type: 'suggestion', label: 'その他の提案' },
]

export default function FeedbackButton({ questionId }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!selectedType) return

    setSubmitting(true)
    const success = await submitFeedback(questionId, selectedType, comment)
    setSubmitting(false)

    if (success) {
      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setSelectedType(null)
        setComment('')
      }, 1500)
    }
  }

  if (submitted) {
    return (
      <div className="text-sm text-green-600 py-2">
        フィードバックを送信しました
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        フィードバック
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg p-4 z-10">
          <div className="text-sm font-medium text-gray-900 mb-3">問題へのフィードバック</div>

          <div className="space-y-2 mb-3">
            {feedbackOptions.map((option) => (
              <label
                key={option.type}
                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                  selectedType === option.type
                    ? 'bg-gray-100 border border-gray-300'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="feedback"
                  value={option.type}
                  checked={selectedType === option.type}
                  onChange={() => setSelectedType(option.type)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="詳細コメント（任意）"
            className="w-full text-sm border border-gray-200 rounded-lg p-2 mb-3 resize-none"
            rows={2}
          />

          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 text-sm py-2 text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedType || submitting}
              className="flex-1 text-sm py-2 bg-gray-900 text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? '送信中...' : '送信'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
