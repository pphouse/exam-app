import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdmin } from '../services/admin'

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin()
      setIsAdminUser(admin)
      setCheckingAdmin(false)
      if (!admin) {
        navigate('/')
      }
    }
    checkAdmin()
  }, [navigate])

  const navItems = [
    { path: '/admin', label: 'ダッシュボード', exact: true },
    { path: '/admin/users', label: 'ユーザー' },
    { path: '/admin/questions', label: '問題統計' },
  ]

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!isAdminUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-gray-900 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between h-14">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/admin" className="font-bold">
                管理者パネル
              </Link>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.path, item.exact)
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* User */}
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-gray-400 hover:text-white"
              >
                通常画面へ
              </Link>
              <span className="text-sm text-gray-400">
                {user?.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-400 hover:text-white"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  )
}
