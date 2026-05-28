import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getExamQuestions, getQuestionsByIds } from '../services/questions'
import {
  createExamSession,
  submitAnswer,
  finishExamSession,
  getSessionAnswers,
  pauseExamSession,
} from '../services/exam'
import { supabase } from '../lib/supabase'
import InlineFeedback from '../components/InlineFeedback'
import type { Question, ExamState } from '../types'

const TIME_LIMIT = 60 * 60

export default function Exam() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const resumeSessionId = searchParams.get('resume')
  const [state, setState] = useState<ExamState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [remainingTime, setRemainingTime] = useState(TIME_LIMIT)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({})
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [confirmedAnswers, setConfirmedAnswers] = useState<Record<string, string>>({})
  const initializedRef = useRef(false)

  useEffect(() => {
    // タブ切替で onAuthStateChange が再発火し user 参照が変わっても、
    // 既に試験を初期化済みなら作り直さない (新しい問題セットへの差し替えを防ぐ)
    if (initializedRef.current) return

    const initExam = async () => {
      if (!user) return
      initializedRef.current = true

      try {
        if (resumeSessionId) {
          // Resume existing session
          const { data: session, error } = await supabase
            .from('exam_sessions')
            .select('*')
            .eq('id', resumeSessionId)
            .eq('user_id', user.id)
            .single()

          if (error || !session) {
            alert('セッションが見つかりませんでした')
            navigate('/')
            return
          }
          if (session.finished_at) {
            alert('この試験は既に終了しています')
            navigate('/')
            return
          }

          const questionIds: string[] = session.question_ids || []
          const questions = await getQuestionsByIds(questionIds)
          const existingAnswers = await getSessionAnswers(session.id)

          const answers: Record<string, string> = {}
          const confirmed: Record<string, string> = {}
          for (const a of existingAnswers) {
            answers[a.question_id] = a.user_answer
            confirmed[a.question_id] = a.user_answer
          }

          let elapsedSec = Math.floor(
            (Date.now() - new Date(session.started_at).getTime()) / 1000
          )
          // 中断中に時間切れになっていたら、タイマーをリセットして再開
          if (elapsedSec >= TIME_LIMIT) {
            await pauseExamSession(session.id)
            elapsedSec = 0
          }
          const adjustedStart = new Date(Date.now() - elapsedSec * 1000)

          // 未回答の最初の問題に移動（全問回答済みなら最初へ）
          const firstUnansweredIndex = questions.findIndex((q) => !confirmed[q.id])
          const startIndex = firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0

          setState({
            sessionId: session.id,
            questions,
            currentIndex: startIndex,
            answers,
            startTime: adjustedStart,
            timeLimit: TIME_LIMIT,
          })
          setConfirmedAnswers(confirmed)
        } else {
          const questions = await getExamQuestions()
          const questionIds = questions.map((q) => q.id)
          const session = await createExamSession(
            user.id,
            'exam',
            questions.length,
            null,
            questionIds
          )

          setState({
            sessionId: session.id,
            questions,
            currentIndex: 0,
            answers: {},
            startTime: new Date(),
            timeLimit: TIME_LIMIT,
          })
          // リロードしても同じセッションを継続できるよう URL に session ID を埋め込む
          setSearchParams({ resume: session.id }, { replace: true })
        }
      } catch (error) {
        console.error('Failed to initialize exam:', error)
        alert('試験の開始に失敗しました')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    initExam()
  }, [user, navigate, resumeSessionId, setSearchParams])

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
    const questionId = state.questions[state.currentIndex].id
    if (confirmedAnswers[questionId]) return // 確定済みは変更不可

    setState({
      ...state,
      answers: {
        ...state.answers,
        [questionId]: answer,
      },
    })
  }

  const handleConfirmAnswer = async () => {
    if (!state || confirming) return
    const question = state.questions[state.currentIndex]
    const answer = state.answers[question.id]
    if (!answer || confirmedAnswers[question.id]) return

    setConfirming(true)
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000)
    const totalTime = (questionTimes[question.id] || 0) + timeTaken

    try {
      await submitAnswer(state.sessionId, question.id, answer, question.correct_answer, totalTime)
      setConfirmedAnswers((prev) => ({ ...prev, [question.id]: answer }))
      setQuestionTimes((prev) => ({ ...prev, [question.id]: totalTime }))
    } catch (error) {
      console.error('Failed to submit answer:', error)
    } finally {
      setConfirming(false)
    }
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

    const unconfirmed = state.questions.filter((q) => !confirmedAnswers[q.id]).length
    if (unconfirmed > 0) {
      const confirm = window.confirm(`まだ${unconfirmed}問が回答未確定です。終了しますか？`)
      if (!confirm) return
    }

    setSubmitting(true)

    try {
      let correctCount = 0
      for (const question of state.questions) {
        const userAnswer = confirmedAnswers[question.id]
        if (userAnswer && userAnswer === question.correct_answer) correctCount++
      }

      const score = Math.round((correctCount / state.questions.length) * 100)
      await finishExamSession(state.sessionId, score)

      navigate(`/exam/result/${state.sessionId}`)
    } catch (error) {
      console.error('Failed to submit exam:', error)
      alert('試験の提出に失敗しました')
      setSubmitting(false)
    }
  }, [state, submitting, navigate, confirmedAnswers])

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
  const isConfirmed = !!confirmedAnswers[currentQuestion.id]
  const isCorrect = isConfirmed && confirmedAnswers[currentQuestion.id] === currentQuestion.correct_answer
  const minutes = Math.floor(remainingTime / 60)
  const seconds = remainingTime % 60
  const confirmedCount = Object.keys(confirmedAnswers).length
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
              確定 {confirmedCount}問
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
            const isThisCorrect = option === currentQuestion.correct_answer
            const isSelected = currentAnswer === option

            let borderClass = 'border-gray-200'
            let bgClass = ''
            if (isConfirmed) {
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
                disabled={isConfirmed}
                className={`w-full text-left p-3 rounded-lg border ${borderClass} ${bgClass} transition-colors disabled:cursor-default`}
              >
                <span className="font-medium text-gray-700 mr-2">{option}.</span>
                <span className="text-gray-900">{choiceText}</span>
                {isConfirmed && isThisCorrect && (
                  <span className="ml-2 text-green-600 text-sm">← 正解</span>
                )}
              </button>
            )
          })}
        </div>

        {!isConfirmed && currentAnswer && (
          <button
            onClick={handleConfirmAnswer}
            disabled={confirming}
            className="w-full mt-4 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {confirming ? '送信中...' : '回答する'}
          </button>
        )}
      </div>

      {/* Result & Explanation */}
      {isConfirmed && (
        <>
          <div className={`rounded-lg p-4 mb-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '正解!' : `不正解 - 正解は ${currentQuestion.correct_answer}`}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">解説</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{currentQuestion.explanation}</p>
            {currentQuestion.incorrect_explanation && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-1 text-sm">選択肢別の解説</h4>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{currentQuestion.incorrect_explanation}</p>
              </div>
            )}
            <InlineFeedback questionId={currentQuestion.id} />
          </div>
        </>
      )}

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
          onClick={handleNext}
          disabled={state.currentIndex === state.questions.length - 1}
          className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>

      {/* Save & End Actions */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={async () => {
            if (!state) return
            if (!window.confirm('現在の回答状態を保存して中断します。ホームから続きを再開できます（タイマーは再開時にリセットされます）。')) return
            try {
              await pauseExamSession(state.sessionId)
            } catch (error) {
              console.error('Failed to pause session:', error)
            }
            navigate('/')
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          保存して中断
        </button>
        <button
          onClick={handleFinish}
          disabled={submitting}
          className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? '提出中...' : '試験を終了'}
        </button>
      </div>

      {/* Question grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-medium text-gray-500 mb-3">問題一覧</h3>
        <div className="grid grid-cols-10 gap-1">
          {state.questions.map((q, i) => {
            const isConfirmedQ = !!confirmedAnswers[q.id]
            const isSelectedQ = !!state.answers[q.id]
            const isCurrent = i === state.currentIndex

            return (
              <button
                key={q.id}
                onClick={() => handleGoTo(i)}
                className={`w-7 h-7 text-xs rounded ${
                  isCurrent
                    ? 'bg-gray-900 text-white'
                    : isConfirmedQ
                    ? 'bg-green-100 text-green-700'
                    : isSelectedQ
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
