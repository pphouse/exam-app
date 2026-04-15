import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getRandomQuestions } from '../services/questions'
import { createExamSession, submitAnswer, finishExamSession } from '../services/exam'
import type { Question, ExamState } from '../types'

const EXAM_QUESTIONS = 60
const TIME_LIMIT = 60 * 60

export default function Exam() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<ExamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState(TIME_LIMIT)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({})
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

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

  const updateQuestionTime = useCallback(() => {
    if (!state) return
    const currentQuestionId = state.questions[state.currentIndex].id
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
    setQuestionTimes((prev) => ({
      ...prev,
      [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent,
    }))
    setQuestionStartTime(Date.now())
  }, [state, questionStartTime])

  const handleNext = () => {
    if (!state) return
    if (state.currentIndex < state.questions.length - 1) {
      updateQuestionTime()
      setState({ ...state, currentIndex: state.currentIndex + 1 })
    }
  }

  const handlePrev = () => {
    if (!state) return
    if (state.currentIndex > 0) {
      updateQuestionTime()
      setState({ ...state, currentIndex: state.currentIndex - 1 })
    }
  }

  const handleGoTo = (index: number) => {
    if (!state) return
    updateQuestionTime()
    setState({ ...state, currentIndex: index })
  }

  const handleFinish = useCallback(async () => {
    if (!state || submitting) return

    const unanswered = state.questions.filter((q) => !state.answers[q.id]).length
    if (unanswered > 0) {
      const confirm = window.confirm(`まだ${unanswered}問が未回答です。終了しますか？`)
      if (!confirm) return
    }

    setSubmitting(true)

    // Save current question's time
    const currentQuestionId = state.questions[state.currentIndex].id
    const currentTimeSpent = Math.round((Date.now() - questionStartTime) / 1000)
    const finalQuestionTimes = {
      ...questionTimes,
      [currentQuestionId]: (questionTimes[currentQuestionId] || 0) + currentTimeSpent,
    }

    try {
      let correctCount = 0
      for (const question of state.questions) {
        const userAnswer = state.answers[question.id]
        if (userAnswer) {
          const timeTaken = finalQuestionTimes[question.id] || 0
          await submitAnswer(state.sessionId, question.id, userAnswer, question.correct_answer, timeTaken)
          if (userAnswer === question.correct_answer) correctCount++
        }
      }

      const score = Math.round((correctCount / state.questions.length) * 100)
      await finishExamSession(state.sessionId, score)

      navigate(`/exam/result/${state.sessionId}`)
    } catch (error) {
      console.error('Failed to submit exam:', error)
      alert('試験の提出に失敗しました')
      setSubmitting(false)
    }
  }, [state, submitting, navigate, questionStartTime, questionTimes])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">試験を準備中...</p>
        </div>
      </div>
    )
  }

  if (!state) return null

  const currentQuestion = state.questions[state.currentIndex]
  const currentAnswer = state.answers[currentQuestion.id]
  const minutes = Math.floor(remainingTime / 60)
  const seconds = remainingTime % 60
  const answeredCount = Object.keys(state.answers).length
  const isTimeLow = remainingTime < 300

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-gray-50 -mx-4 px-4 py-3 border-b border-gray-200 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900">
              {state.currentIndex + 1} / {state.questions.length}
            </span>
            <span className="text-sm text-gray-500">
              回答済み {answeredCount}問
            </span>
          </div>
          <div className={`font-mono font-bold ${isTimeLow ? 'text-red-600' : 'text-gray-900'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {currentQuestion.chapter}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {currentQuestion.difficulty}
          </span>
        </div>

        <p className="text-gray-900 mb-6 whitespace-pre-wrap">{currentQuestion.question_text}</p>

        <div className="space-y-2">
          {['A', 'B', 'C', 'D'].map((option) => {
            const choiceKey = `choice_${option.toLowerCase()}` as keyof Question
            const choiceText = currentQuestion[choiceKey] as string
            const isSelected = currentAnswer === option

            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-700 mr-2">{option}.</span>
                <span className="text-gray-900">{choiceText}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={handlePrev}
          disabled={state.currentIndex === 0}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          前へ
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
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>

      {/* Question grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-medium text-gray-500 mb-3">問題一覧</h3>
        <div className="grid grid-cols-10 gap-1">
          {state.questions.map((q, i) => {
            const isAnswered = !!state.answers[q.id]
            const isCurrent = i === state.currentIndex

            return (
              <button
                key={q.id}
                onClick={() => handleGoTo(i)}
                className={`w-7 h-7 text-xs rounded ${
                  isCurrent
                    ? 'bg-gray-900 text-white'
                    : isAnswered
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
