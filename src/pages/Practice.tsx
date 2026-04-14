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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">練習モード</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">章を選択</h2>

          <div className="space-y-2">
            <button
              onClick={() => startPractice(null)}
              disabled={loading}
              className="w-full p-4 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <span className="font-medium text-gray-900">全ての章</span>
              <span className="text-sm text-gray-500 ml-2">ランダム出題</span>
            </button>

            {chapters.map((chapter) => (
              <button
                key={chapter}
                onClick={() => startPractice(chapter)}
                disabled={loading}
                className="w-full p-4 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                <span className="font-medium text-gray-900">{chapter}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const question = state.currentQuestion
  if (!question) return null

  const isCorrect = selectedAnswer === question.correct_answer
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">練習モード</h1>
          <p className="text-sm text-gray-500">{state.chapter || '全ての章'}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {stats.correct}/{stats.total}
          </div>
          <div className="text-sm text-gray-500">正解率 {accuracy}%</div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {question.chapter}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {question.difficulty}
          </span>
        </div>

        <p className="text-gray-900 mb-6 whitespace-pre-wrap">{question.question_text}</p>

        <div className="space-y-2">
          {['A', 'B', 'C', 'D'].map((option) => {
            const choiceKey = `choice_${option.toLowerCase()}` as keyof Question
            const choiceText = question[choiceKey] as string
            const isThisCorrect = option === question.correct_answer
            const isSelected = option === selectedAnswer

            let borderClass = 'border-gray-200'
            let bgClass = ''
            if (state.showAnswer) {
              if (isThisCorrect) {
                borderClass = 'border-green-500'
                bgClass = 'bg-green-50'
              } else if (isSelected) {
                borderClass = 'border-red-500'
                bgClass = 'bg-red-50'
              }
            } else if (isSelected) {
              borderClass = 'border-gray-900'
              bgClass = 'bg-gray-50'
            }

            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={state.showAnswer}
                className={`w-full text-left p-3 rounded-lg border ${borderClass} ${bgClass} transition-colors disabled:cursor-default`}
              >
                <span className="font-medium text-gray-700 mr-2">{option}.</span>
                <span className="text-gray-900">{choiceText}</span>
                {state.showAnswer && isThisCorrect && (
                  <span className="ml-2 text-green-600 text-sm">← 正解</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Result & Explanation */}
      {state.showAnswer && (
        <>
          <div className={`rounded-lg p-4 mb-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '正解!' : `不正解 - 正解は ${question.correct_answer}`}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">解説</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{question.explanation}</p>
            {question.incorrect_explanation && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-1 text-sm">不正解の選択肢について</h4>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{question.incorrect_explanation}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {state.showAnswer && (
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? '読み込み中...' : '次の問題'}
          </button>
        )}
        <button
          onClick={handleEndPractice}
          className={`${state.showAnswer ? '' : 'flex-1'} bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors`}
        >
          終了
        </button>
      </div>
    </div>
  )
}
