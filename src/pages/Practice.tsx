import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getRandomQuestionByChapter, getAllChapters } from '../services/questions'
import { createExamSession, submitAnswer } from '../services/exam'
import type { Question, PracticeState } from '../types'

export default function Practice() {
  const { user } = useAuth()
  const [chapters, setChapters] = useState<string[]>([])
  const [state, setState] = useState<PracticeState | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    getAllChapters().then(setChapters).catch(console.error)
  }, [])

  const startPractice = async (chapter: string | null) => {
    if (!user) return
    setLoading(true)

    try {
      const question = await getRandomQuestionByChapter(chapter)
      if (!question) {
        alert('問題が見つかりませんでした')
        return
      }

      const session = await createExamSession(user.id, 'practice', 1, chapter)

      setState({
        chapter,
        currentQuestion: question,
        showAnswer: false,
        sessionId: session.id,
      })
      setSelectedAnswer(null)
    } catch (error) {
      console.error('Failed to start practice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (answer: string) => {
    if (!state?.currentQuestion || state.showAnswer) return

    setSelectedAnswer(answer)
    setState({ ...state, showAnswer: true })

    const isCorrect = answer === state.currentQuestion.correct_answer
    setStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }))

    try {
      await submitAnswer(
        state.sessionId,
        state.currentQuestion.id,
        answer,
        state.currentQuestion.correct_answer
      )
    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }

  const handleNext = async () => {
    if (!user || !state) return
    setLoading(true)

    try {
      const question = await getRandomQuestionByChapter(state.chapter)
      if (!question) {
        alert('問題が見つかりませんでした')
        return
      }

      const session = await createExamSession(user.id, 'practice', 1, state.chapter)

      setState({
        ...state,
        currentQuestion: question,
        showAnswer: false,
        sessionId: session.id,
      })
      setSelectedAnswer(null)
    } catch (error) {
      console.error('Failed to load next question:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEndPractice = () => {
    setState(null)
    setSelectedAnswer(null)
    setStats({ correct: 0, total: 0 })
  }

  // Chapter selection screen
  if (!state) {
    return (
      <div className="px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">練習モード</h1>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            章を選択してください
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => startPractice(null)}
              disabled={loading}
              className="w-full p-4 text-left rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <span className="font-semibold text-green-800">全ての章</span>
              <p className="text-sm text-green-600 mt-1">
                ランダムに全章から出題
              </p>
            </button>

            {chapters.map((chapter) => (
              <button
                key={chapter}
                onClick={() => startPractice(chapter)}
                disabled={loading}
                className="w-full p-4 text-left rounded-lg border-2 border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <span className="font-semibold text-gray-800">{chapter}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const question = state.currentQuestion
  if (!question) return null

  return (
    <div className="px-4 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">練習モード</h1>
          <p className="text-sm text-gray-600">
            {state.chapter || '全ての章'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900">
            {stats.correct} / {stats.total}
          </div>
          <div className="text-sm text-gray-500">
            {stats.total > 0
              ? `${Math.round((stats.correct / stats.total) * 100)}%`
              : '0%'}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
            {question.chapter}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
            {question.difficulty}
          </span>
        </div>

        <p className="text-lg text-gray-900 mb-6 whitespace-pre-wrap">
          {question.question_text}
        </p>

        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((option) => {
            const choiceKey = `choice_${option.toLowerCase()}` as keyof Question
            const choiceText = question[choiceKey] as string
            const isCorrect = option === question.correct_answer
            const isSelected = option === selectedAnswer

            let buttonClass = 'border-gray-200 hover:border-gray-300'
            if (state.showAnswer) {
              if (isCorrect) {
                buttonClass = 'border-green-500 bg-green-50'
              } else if (isSelected) {
                buttonClass = 'border-red-500 bg-red-50'
              }
            } else if (isSelected) {
              buttonClass = 'border-blue-500 bg-blue-50'
            }

            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={state.showAnswer}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${buttonClass}`}
              >
                <span className="font-semibold text-gray-700 mr-2">
                  {option}.
                </span>
                <span className="text-gray-900">{choiceText}</span>
                {state.showAnswer && isCorrect && (
                  <span className="ml-2 text-green-600 text-sm">← 正解</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      {state.showAnswer && (
        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">解説</h3>
          <p className="text-blue-800 whitespace-pre-wrap">
            {question.explanation}
          </p>
          {question.incorrect_explanation && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">
                不正解の選択肢について
              </h4>
              <p className="text-blue-800 whitespace-pre-wrap">
                {question.incorrect_explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        {state.showAnswer && (
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '読み込み中...' : '次の問題'}
          </button>
        )}
        <button
          onClick={handleEndPractice}
          className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          練習を終了
        </button>
      </div>
    </div>
  )
}
