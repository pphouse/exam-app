import { useState, useEffect } from 'react'
import { getOverallStats } from '../services/stats'

interface OverallStats {
  totalQuestions: number
  totalAttempts: number
  averageAccuracy: number
  byChapter: Array<{
    chapter: string
    count: number
    avgAccuracy: number
  }>
  byDifficulty: Array<{
    difficulty: string
    count: number
    avgAccuracy: number
  }>
}

export default function Stats() {
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getOverallStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="px-4 text-center py-12">
        <p className="text-gray-600">統計データを読み込めませんでした</p>
      </div>
    )
  }

  const getDifficultyOrder = (difficulty: string) => {
    const order: Record<string, number> = { '易': 1, '標準': 2, '難': 3 }
    return order[difficulty] || 4
  }

  return (
    <div className="px-4 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">統計</h1>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {stats.totalQuestions}
          </div>
          <div className="text-sm text-gray-600">問題数</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {stats.totalAttempts}
          </div>
          <div className="text-sm text-gray-600">総回答数</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {stats.averageAccuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">平均正解率</div>
        </div>
      </div>

      {/* By chapter */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">章別統計</h2>
        <div className="space-y-4">
          {stats.byChapter.map((chapter) => (
            <div key={chapter.chapter}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{chapter.chapter}</span>
                <span className="text-gray-900">
                  {chapter.count}問 ・{' '}
                  <span
                    className={
                      chapter.avgAccuracy >= 70
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {chapter.avgAccuracy.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    chapter.avgAccuracy >= 70 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, chapter.avgAccuracy)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By difficulty */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">難易度別統計</h2>
        <div className="grid grid-cols-3 gap-4">
          {stats.byDifficulty
            .sort((a, b) => getDifficultyOrder(a.difficulty) - getDifficultyOrder(b.difficulty))
            .map((diff) => {
              const colorClass =
                diff.difficulty === '易'
                  ? 'bg-green-100 border-green-300'
                  : diff.difficulty === '標準'
                  ? 'bg-yellow-100 border-yellow-300'
                  : 'bg-red-100 border-red-300'

              return (
                <div
                  key={diff.difficulty}
                  className={`rounded-xl border-2 p-4 text-center ${colorClass}`}
                >
                  <div className="text-lg font-bold text-gray-800">
                    {diff.difficulty}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 my-2">
                    {diff.avgAccuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">{diff.count}問</div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Info note */}
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          この統計は全ユーザーの回答データに基づいています。
          問題の難易度調整や出題バランスの参考にご活用ください。
        </p>
      </div>
    </div>
  )
}
