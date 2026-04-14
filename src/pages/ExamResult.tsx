import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getSessionAnswers } from '../services/exam'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 text-center py-12">
        <p className="text-gray-600">結果が見つかりませんでした</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
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
    <div className="px-4 pb-8">
      {/* Result Summary */}
      <div
        className={`rounded-xl shadow-lg p-8 mb-8 ${
          passed
            ? 'bg-gradient-to-br from-green-500 to-green-600'
            : 'bg-gradient-to-br from-red-500 to-red-600'
        }`}
      >
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-2">
            {passed ? '合格' : '不合格'}
          </h1>
          <div className="text-6xl font-bold mb-4">{score}%</div>
          <p className="text-lg opacity-90">
            {totalQuestions}問中 {correctCount}問正解
          </p>
          <p className="text-sm opacity-75 mt-2">合格基準：70%以上</p>
        </div>
      </div>

      {/* Chapter breakdown */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">章別正解率</h2>
        <div className="space-y-4">
          {Array.from(chapterStats.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([chapter, stats]) => {
              const rate = Math.round((stats.correct / stats.total) * 100)
              return (
                <div key={chapter}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{chapter}</span>
                    <span className="text-gray-900 font-medium">
                      {stats.correct}/{stats.total} ({rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        rate >= 70 ? 'bg-green-500' : 'bg-red-500'
                      }`}
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
        className="w-full bg-white rounded-xl shadow-md p-4 mb-6 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="font-semibold text-gray-900">解答の詳細を確認</span>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform ${
            showDetails ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
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
                className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
                  answer.is_correct ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-2 py-1 text-sm rounded ${
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

                    return (
                      <div
                        key={option}
                        className={`p-3 rounded-lg ${
                          isCorrect
                            ? 'bg-green-100 border border-green-300'
                            : isUserAnswer
                            ? 'bg-red-100 border border-red-300'
                            : 'bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold mr-2">{option}.</span>
                        <span>{choiceText}</span>
                        {isCorrect && (
                          <span className="ml-2 text-green-600 text-sm">
                            ← 正解
                          </span>
                        )}
                        {isUserAnswer && !isCorrect && (
                          <span className="ml-2 text-red-600 text-sm">
                            ← あなたの回答
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">解説</h4>
                  <p className="text-blue-800 text-sm whitespace-pre-wrap">
                    {question.explanation}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          to="/exam"
          className="flex-1 text-center bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          もう一度受験する
        </Link>
        <Link
          to="/"
          className="flex-1 text-center bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}
