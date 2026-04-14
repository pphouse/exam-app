import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          ようこそ、{user?.user_metadata?.full_name || 'ゲスト'}さん
        </h1>
        <p className="text-gray-600 mt-1">
          医療生成AIパスポート Tier1（リテラシー級）模擬試験
        </p>
      </div>

      {/* Main Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Exam Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-gray-900 p-5">
            <h2 className="text-lg font-bold text-white">模擬試験モード</h2>
            <p className="text-gray-400 text-sm mt-1">本番と同じ形式で受験</p>
          </div>
          <div className="p-5">
            <ul className="space-y-2 text-sm text-gray-600 mb-5">
              <li className="flex items-center gap-2">
                <span className="text-gray-400"><CheckIcon /></span>
                60問の四肢択一問題
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400"><CheckIcon /></span>
                制限時間60分
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400"><CheckIcon /></span>
                終了後に結果・解説表示
              </li>
            </ul>
            <Link
              to="/exam"
              className="block w-full text-center bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              試験を開始する
            </Link>
          </div>
        </div>

        {/* Practice Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-gray-700 p-5">
            <h2 className="text-lg font-bold text-white">練習モード</h2>
            <p className="text-gray-400 text-sm mt-1">1問ずつ解答と解説を確認</p>
          </div>
          <div className="p-5">
            <ul className="space-y-2 text-sm text-gray-600 mb-5">
              <li className="flex items-center gap-2">
                <span className="text-gray-400"><CheckIcon /></span>
                1問ずつランダム出題
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400"><CheckIcon /></span>
                即時に正解・解説表示
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400"><CheckIcon /></span>
                章別での絞り込み可能
              </li>
            </ul>
            <Link
              to="/practice"
              className="block w-full text-center bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              練習を始める
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">学習の記録</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/history"
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-900">受験履歴</div>
              <div className="text-xs text-gray-500">過去の結果を確認</div>
            </div>
          </Link>
          <Link
            to="/stats"
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-gray-900">統計</div>
              <div className="text-xs text-gray-500">正解率を分析</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
