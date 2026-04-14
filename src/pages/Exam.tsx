import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getRandomQuestions } from '../services/questions'
import { createExamSession, submitAnswer, finishExamSession } from '../services/exam'
import type { Question, ExamState } from '../types'

const EXAM_QUESTIONS = 60
const TIME_LIMIT = 60 * 60 // 60 minutes in seconds

export default function Exam() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<ExamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState(TIME_LIMIT)

  // Initialize exam
  useEffect(() => {
    const initExam = async () => {
      if (!user) return

      try {
        const questions = await getRandomQuestions(EXAM_QUESTIONS)
        const session = await createExamSession(user.id, 'exam', questions.length)

        setState({
          sessionId: session.id,
          questions,
          currentIndex: 0,
          answers: {},
          startTime: new Date(),
          timeLimit: TIME_LIMIT,
        })
      } catch (error) {
        console.error('Failed to initialize exam:', error)
        alert('試験の開始に失敗しました')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    initExam()
  }, [user, navigate])

  // Timer
  useEffect(() => {
    if (!state) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime.getTime()) / 1000)
      const remaining = Math.max(0, TIME_LIMIT - elapsed)
      setRemainingTime(remaining)

      if (remaining === 0) {
        handleFinish()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [state])

  const handleAnswer = (answer: string) => {
    if (!state) return

    setState({
      ...state,
      answers: {
        ...state.answers,
        [state.questions[state.currentIndex].id]: answer,
      },
    })
  }

  const handleNext = () => {
    if (!state) return
    if (state.currentIndex < state.questions.length - 1) {
      setState({ ...state, currentIndex: state.currentIndex + 1 })
    }
  }

  const handlePrev = () => {
    if (!state) return
    if (state.currentIndex > 0) {
      setState({ ...state, currentIndex: state.currentIndex - 1 })
    }
  }

  const handleGoTo = (index: number) => {
    if (!state) return
    setState({ ...state, currentIndex: index })
  }

  const handleFinish = useCallback(async () => {
    if (!state || submitting) return

    const unanswered = state.questions.filter((q) => !state.answers[q.id]).length
    if (unanswered > 0) {
      const confirm = window.confirm(
        `まだ${unanswered}問が未回答です。終了しますか？`
      )
      if (!confirm) return
    }

    setSubmitting(true)

    try {
      // Submit all answers
      let correctCount = 0
      for (const question of state.questions) {
        const userAnswer = state.answers[question.id]
        if (userAnswer) {
          await submitAnswer(
            state.sessionId,
            question.id,
            userAnswer,
            question.correct_answer
          )
          if (userAnswer === question.correct_answer) {
            correctCount++
          }
        }
      }

      // Calculate and save score
      const score = Math.round((correctCount / state.questions.length) * 100)
      await finishExamSession(state.sessionId, score)

      navigate(`/exam/result/${state.sessionId}`)
    } catch (error) {
      console.error('Failed to submit exam:', error)
      alert('試験の提出に失敗しました')
      setSubmitting(false)
    }
  }, [state, submitting, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">試験を準備中...</p>
        </div>
      </div>
    )
  }

  if (!state) {
    return null
  }

  const currentQuestion = state.questions[state.currentIndex]
  const currentAnswer = state.answers[currentQuestion.id]
  const minutes = Math.floor(remainingTime / 60)
  const seconds = remainingTime % 60

  return (
    <div className="px-4 pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b py-3 mb-6 -mx-4 px-4 z-10">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            問題 {state.currentIndex + 1} / {state.questions.length}
          </div>
          <div
            className={`text-xl font-mono font-bold ${
              remainingTime < 300 ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
            {currentQuestion.chapter}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
            {currentQuestion.difficulty}
          </span>
        </div>

        <p className="text-lg text-gray-900 mb-6 whitespace-pre-wrap">
          {currentQuestion.question_text}
        </p>

        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((option) => {
            const choiceKey = `choice_${option.toLowerCase()}` as keyof Question
            const choiceText = currentQuestion[choiceKey] as string

            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  currentAnswer === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-semibold text-gray-700 mr-2">
                  {option}.
                </span>
                <span className="text-gray-900">{choiceText}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePrev}
          disabled={state.currentIndex === 0}
          className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          前の問題
        </button>
        <button
          onClick={handleFinish}
          disabled={submitting}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? '提出中...' : '試験を終了'}
        </button>
        <button
          onClick={handleNext}
          disabled={state.currentIndex === state.questions.length - 1}
          className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次の問題
        </button>
      </div>

      {/* Question grid */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">問題一覧</h3>
        <div className="grid grid-cols-10 gap-2">
          {state.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => handleGoTo(i)}
              className={`w-8 h-8 text-sm rounded ${
                i === state.currentIndex
                  ? 'bg-blue-600 text-white'
                  : state.answers[q.id]
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
