import { useState, useEffect } from 'react'
import { getQuestionStats } from '../../services/admin'
import type { QuestionStats } from '../../types'

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<QuestionStats[]>([])
  const [loading, setLoading] = useState(true)
  const [filterChapter, setFilterChapter] = useState<string>('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('')
  const [sortBy, setSortBy] = useState<'accuracy' | 'attempts'>('accuracy')

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await getQuestionStats()
        setQuestions(data)
      } catch (error) {
        console.error('Failed to fetch questions:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [])

  // Get unique chapters and difficulties
  const chapters = [...new Set(questions.map(q => q.chapter))].sort()
  const difficulties = [...new Set(questions.map(q => q.difficulty))]

  // Filter and sort
  const filteredQuestions = questions
    .filter(q => !filterChapter || q.chapter === filterChapter)
    .filter(q => !filterDifficulty || q.difficulty === filterDifficulty)
    .sort((a, b) => {
      if (sortBy === 'accuracy') {
        return (a.accuracy_rate ?? 100) - (b.accuracy_rate ?? 100)
      }
      return (b.total_attempts || 0) - (a.total_attempts || 0)
    })

  // Calculate averages
  const questionsWithAttempts = filteredQuestions.filter(q => q.total_attempts > 0)
  const avgAccuracy = questionsWithAttempts.length > 0
    ? Math.round(questionsWithAttempts.reduce((sum, q) => sum + (q.accuracy_rate || 0), 0) / questionsWithAttempts.length)
    : 0
  const lowAccuracyCount = filteredQuestions.filter(q => q.accuracy_rate !== null && q.accuracy_rate < 50).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">問題統計</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{filteredQuestions.length}</div>
          <div className="text-sm text-gray-500">問題数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{questionsWithAttempts.length}</div>
          <div className="text-sm text-gray-500">回答された問題</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{avgAccuracy}%</div>
          <div className="text-sm text-gray-500">平均正解率</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{lowAccuracyCount}</div>
          <div className="text-sm text-gray-500">正解率50%未満</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="">全ての章</option>
          {chapters.map(chapter => (
            <option key={chapter} value={chapter}>{chapter}</option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="">全ての難易度</option>
          {difficulties.map(diff => (
            <option key={diff} value={diff}>{diff}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'accuracy' | 'attempts')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="accuracy">正解率が低い順</option>
          <option value="attempts">回答数が多い順</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.map((question) => {
          const accuracyColor = question.accuracy_rate === null
            ? 'text-gray-400'
            : question.accuracy_rate < 50
            ? 'text-red-600'
            : question.accuracy_rate < 70
            ? 'text-yellow-600'
            : 'text-green-600'

          return (
            <div
              key={question.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {question.question_id}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {question.chapter}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {question.question_text}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-xl font-bold ${accuracyColor}`}>
                    {question.accuracy_rate !== null ? `${question.accuracy_rate}%` : '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {question.correct_count}/{question.total_attempts} 正解
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          問題がありません
        </div>
      )}
    </div>
  )
}
