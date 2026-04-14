import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminOverviewStats } from '../../services/admin'

interface OverviewStats {
  totalUsers: number
  activeUsers: number
  totalExams: number
  avgScore: number
  passRate: number
  totalQuestions: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminOverviewStats()
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

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          <div className="text-sm text-gray-500">総ユーザー数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
          <div className="text-sm text-gray-500">アクティブ（30日）</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.totalExams}</div>
          <div className="text-sm text-gray-500">総試験数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.avgScore}%</div>
          <div className="text-sm text-gray-500">平均スコア</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.passRate}%</div>
          <div className="text-sm text-gray-500">合格率</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</div>
          <div className="text-sm text-gray-500">問題数</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/admin/users"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-bold text-gray-900 mb-2">ユーザー管理</h2>
          <p className="text-sm text-gray-600">
            登録ユーザーの一覧を確認し、個別の統計を閲覧できます
          </p>
        </Link>
        <Link
          to="/admin/questions"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-bold text-gray-900 mb-2">問題統計</h2>
          <p className="text-sm text-gray-600">
            問題ごとの正解率を確認し、難易度調整の参考にできます
          </p>
        </Link>
      </div>
    </div>
  )
}
