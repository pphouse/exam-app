import { useState, useEffect } from 'react'
import { getOverallStats } from '../services/stats'

interface OverallStats {
  totalQuestions: number
  totalAttempts: number
  totalCorrect: number
  averageAccuracy: number
  byChapter: Array<{ chapter: string; questionCount: number; attempts: number; correct: number; avgAccuracy: number }>
  byDifficulty: Array<{ difficulty: string; questionCount: number; attempts: number; correct: number; avgAccuracy: number }>
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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">統計データを読み込めませんでした</p>
      </div>
    )
  }

  const getDifficultyOrder = (d: string) => ({ '易': 1, '標準': 2, '難': 3 }[d] || 4)

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">統計</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</div>
          <div className="text-sm text-gray-500">問題数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</div>
          <div className="text-sm text-gray-500">総回答数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalCorrect}/{stats.totalAttempts}</div>
          <div className="text-sm text-gray-500">正解数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.averageAccuracy.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">正解率</div>
        </div>
      </div>

      {/* By chapter */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">章別統計</h2>
        <div className="space-y-4">
          {stats.byChapter.map((chapter) => (
            <div key={chapter.chapter}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{chapter.chapter}</span>
                <span className="text-gray-900">
                  {chapter.correct}/{chapter.attempts} ({chapter.avgAccuracy.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${chapter.avgAccuracy >= 70 ? 'bg-gray-700' : 'bg-gray-400'}`}
                  style={{ width: `${Math.min(100, chapter.avgAccuracy)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By difficulty */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">難易度別統計</h2>
        <div className="grid grid-cols-3 gap-3">
          {stats.byDifficulty
            .sort((a, b) => getDifficultyOrder(a.difficulty) - getDifficultyOrder(b.difficulty))
            .map((diff) => (
              <div key={diff.difficulty} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-700">{diff.difficulty}</div>
                <div className="text-xl font-bold text-gray-900 my-1">{diff.avgAccuracy.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{diff.correct}/{diff.attempts}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        この統計は全ユーザーの回答データに基づいています。
      </div>
    </div>
  )
}
