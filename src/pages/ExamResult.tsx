import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getSessionAnswers } from '../services/exam'
import FeedbackButton from '../components/FeedbackButton'
import type { Question, Answer, ExamSession } from '../types'

interface ResultData {
  session: ExamSession
  answers: Answer[]
  questions: Map<string, Question>
}

export default function ExamResult() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const fetchResult = async () => {
      if (!sessionId) return

      try {
        // Get session
        const { data: session, error: sessionError } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) throw sessionError

        // Get answers
        const answers = await getSessionAnswers(sessionId)

        // Get questions
        const questionIds = answers.map((a) => a.question_id)
        const { data: questions, error: qError } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds)

        if (qError) throw qError

        const questionMap = new Map(questions?.map((q) => [q.id, q]))

        setData({
          session,
          answers,
          questions: questionMap,
        })
      } catch (error) {
        console.error('Failed to fetch result:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600 mb-4">結果が見つかりませんでした</p>
        <Link to="/" className="text-gray-900 hover:underline font-medium">
          ホームに戻る
        </Link>
      </div>
    )
  }

  const { session, answers, questions } = data
  const correctCount = answers.filter((a) => a.is_correct).length
  const totalQuestions = session.total_questions
  const score = session.score || 0
  const passed = score >= 70

  // Group by chapter for analysis
  const chapterStats = new Map<string, { correct: number; total: number }>()
  answers.forEach((answer) => {
    const question = questions.get(answer.question_id)
    if (!question) return

    const stats = chapterStats.get(question.chapter) || { correct: 0, total: 0 }
    stats.total++
    if (answer.is_correct) stats.correct++
    chapterStats.set(question.chapter, stats)
  })

  return (
    <div className="max-w-3xl mx-auto">
      {/* Result Summary */}
      <div className={`rounded-xl border p-6 mb-6 text-center ${
        passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className={`text-4xl font-bold mb-2 ${passed ? 'text-green-700' : 'text-red-700'}`}>
          {passed ? '合格' : '不合格'}
        </div>
        <div className="text-6xl font-bold text-gray-900 mb-3">{score}%</div>
        <p className="text-gray-700">
          {totalQuestions}問中 <span className="font-bold">{correctCount}問</span> 正解
        </p>
        <p className="text-sm text-gray-500 mt-1">合格基準：70%以上</p>
      </div>

      {/* Chapter breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">章別正解率</h2>
        <div className="space-y-4">
          {Array.from(chapterStats.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([chapter, stats]) => {
              const rate = Math.round((stats.correct / stats.total) * 100)
              const isGood = rate >= 70
              return (
                <div key={chapter}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{chapter}</span>
                    <span className={`font-medium ${isGood ? 'text-gray-900' : 'text-gray-500'}`}>
                      {stats.correct}/{stats.total} ({rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${isGood ? 'bg-gray-700' : 'bg-gray-400'}`}
                      style={{ width: `${rate}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">解答の詳細を確認</span>
        <svg
          className={`w-5 h-5 text-gray-400 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Answer details */}
      {showDetails && (
        <div className="space-y-4 mb-6">
          {answers.map((answer, index) => {
            const question = questions.get(answer.question_id)
            if (!question) return null

            return (
              <div
                key={answer.id}
                className={`bg-white rounded-xl border p-5 ${
                  answer.is_correct ? 'border-green-300' : 'border-red-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      answer.is_correct
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {answer.is_correct ? '正解' : '不正解'}
                  </span>
                  <span className="text-sm text-gray-500">
                    問題 {index + 1} - {question.chapter}
                  </span>
                </div>

                <p className="text-gray-900 mb-4 whitespace-pre-wrap">
                  {question.question_text}
                </p>

                <div className="space-y-2 mb-4">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const choiceKey = `choice_${option.toLowerCase()}` as keyof Question
                    const choiceText = question[choiceKey] as string
                    const isCorrect = option === question.correct_answer
                    const isUserAnswer = option === answer.user_answer

                    let bgClass = ''
                    let borderClass = 'border-gray-200'
                    if (isCorrect) {
                      bgClass = 'bg-green-50'
                      borderClass = 'border-green-300'
                    } else if (isUserAnswer) {
                      bgClass = 'bg-red-50'
                      borderClass = 'border-red-300'
                    }

                    return (
                      <div
                        key={option}
                        className={`p-3 rounded-lg border ${bgClass} ${borderClass}`}
                      >
                        <span className="font-medium text-gray-700 mr-2">{option}.</span>
                        <span className="text-gray-900">{choiceText}</span>
                        {isCorrect && (
                          <span className="ml-2 text-green-600 text-sm">← 正解</span>
                        )}
                        {isUserAnswer && !isCorrect && (
                          <span className="ml-2 text-red-600 text-sm">← あなたの回答</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">解説</h4>
                    <FeedbackButton questionId={question.id} />
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {question.explanation}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to="/exam"
          className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium text-center hover:bg-gray-800 transition-colors"
        >
          もう一度受験
        </Link>
        <Link
          to="/"
          className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium text-center hover:bg-gray-300 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}
