import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllUserStats } from '../../services/admin'
import type { UserStats } from '../../types'

export default function AdminUsers() {
  const [users, setUsers] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUserStats()
        setUsers(data)
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">ユーザー一覧</h1>
        <div className="text-sm text-gray-500">{users.length} 人</div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="名前またはメールで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ユーザー
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  試験回数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  平均スコア
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  合格回数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  最終活動
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  詳細
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.full_name || '(名前未設定)'}
                        {user.role === 'admin' && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-900 text-white rounded">
                            管理者
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900">
                    {user.exam_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={user.avg_exam_score !== null && user.avg_exam_score >= 70 ? 'text-green-600 font-medium' : 'text-gray-900'}>
                      {user.avg_exam_score !== null ? `${user.avg_exam_score}%` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900">
                    {user.passed_count} / {user.exam_count}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {user.last_activity
                      ? new Date(user.last_activity).toLocaleDateString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '検索結果がありません' : 'ユーザーがいません'}
          </div>
        )}
      </div>
    </div>
  )
}
