import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          ようこそ、{user?.user_metadata?.full_name || 'ゲスト'}さん
        </h1>
        <p className="text-gray-600 mt-1">
          医療生成AIパスポート Tier1（リテラシー級）の模擬試験・練習ができます
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 模擬試験カード */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <h2 className="text-xl font-bold text-white">模擬試験モード</h2>
            <p className="text-blue-100 mt-1">本番と同じ形式で受験</p>
          </div>
          <div className="p-6">
            <ul className="space-y-2 text-gray-600 mb-6">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                60問の四肢択一問題
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                制限時間60分
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                終了後に結果表示
              </li>
            </ul>
            <Link
              to="/exam"
              className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              試験を開始する
            </Link>
          </div>
        </div>

        {/* 練習モードカード */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
            <h2 className="text-xl font-bold text-white">練習モード</h2>
            <p className="text-green-100 mt-1">1問ずつ解答と解説を確認</p>
          </div>
          <div className="p-6">
            <ul className="space-y-2 text-gray-600 mb-6">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                1問ずつランダム出題
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                即時に正解・解説表示
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                章別での絞り込み可能
              </li>
            </ul>
            <Link
              to="/practice"
              className="block w-full text-center bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              練習を始める
            </Link>
          </div>
        </div>
      </div>

      {/* 統計リンク */}
      <div className="mt-8 bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">学習の記録</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/history"
            className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-8 h-8 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">受験履歴</div>
              <div className="text-sm text-gray-500">過去の結果を確認</div>
            </div>
          </Link>
          <Link
            to="/stats"
            className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-8 h-8 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">統計</div>
              <div className="text-sm text-gray-500">正解率を分析</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
