import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

interface ImportResult {
  inserted: number
  updated: number
  errors: Array<{ questionId: string; error: string }>
}

interface ParsedQuestion {
  question_id: string
  chapter: string | null
  keyword: string | null
  difficulty: string | null
  bloom_level: string | null
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_answer: string
  explanation: string
  incorrect_explanation: string | null
  source: string | null
}

export default function QuestionImport() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedQuestion[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    // Parse Excel file
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]

      // Filter valid rows (starting with 'Q')
      const questions: ParsedQuestion[] = rawData
        .slice(1)
        .filter(row => row[0] && String(row[0]).startsWith('Q'))
        .map(row => ({
          question_id: row[0] || '',
          chapter: row[1] || null,
          keyword: row[2] || null,
          difficulty: row[3] || null,
          bloom_level: row[4] || null,
          question_text: row[5] || '',
          choice_a: row[6] || '',
          choice_b: row[7] || '',
          choice_c: row[8] || '',
          choice_d: row[9] || '',
          correct_answer: row[10] || '',
          explanation: row[11] || '',
          incorrect_explanation: row[12] || null,
          source: row[13] || null,
        }))

      setPreview(questions)
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setImporting(true)
    const importedAt = new Date().toISOString()
    const results: ImportResult = { inserted: 0, updated: 0, errors: [] }

    for (const question of preview) {
      // Check if question exists
      const { data: existing } = await supabase
        .from('questions')
        .select('id, version')
        .eq('question_id', question.question_id)
        .single()

      const questionData = {
        ...question,
        is_active: true,
        imported_at: importedAt,
      }

      if (existing) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update({
            ...questionData,
            version: (existing.version || 1) + 1,
          })
          .eq('id', existing.id)

        if (error) {
          results.errors.push({ questionId: question.question_id, error: error.message })
        } else {
          results.updated++
        }
      } else {
        // Insert new question
        const { error } = await supabase
          .from('questions')
          .insert({
            ...questionData,
            version: 1,
          })

        if (error) {
          results.errors.push({ questionId: question.question_id, error: error.message })
        } else {
          results.inserted++
        }
      }
    }

    setResult(results)
    setImporting(false)
  }

  const handleDownloadTemplate = () => {
    const headers = [
      '問題ID', '章', 'キーワード', '難易度', '認知レベル',
      '問題文', '選択肢A', '選択肢B', '選択肢C', '選択肢D',
      '正解', '解説', '不正解肢の解説', '出典'
    ]
    const example = [
      'Q1-001', '第1章 AIと医療', 'AIエージェント', '標準', '理解',
      'AIエージェントについて正しいものを選べ。',
      '自律的にタスクを実行するAI', '単純なチャットボット',
      '画像認識のみを行うAI', 'データベース検索ツール',
      'A', 'AIエージェントは自律的にタスクを実行できるAIシステムです。',
      'B,C,Dは部分的な機能のみを持つシステムです。', ''
    ]

    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'question_template.xlsx')
  }

  const handleExportCurrent = async () => {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .order('question_id')

    if (error || !questions) {
      alert('エクスポートに失敗しました')
      return
    }

    const headers = [
      '問題ID', '章', 'キーワード', '難易度', '認知レベル',
      '問題文', '選択肢A', '選択肢B', '選択肢C', '選択肢D',
      '正解', '解説', '不正解肢の解説', '出典'
    ]

    const rows = questions.map(q => [
      q.question_id, q.chapter, q.keyword, q.difficulty, q.bloom_level,
      q.question_text, q.choice_a, q.choice_b, q.choice_c, q.choice_d,
      q.correct_answer, q.explanation, q.incorrect_explanation, q.source
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, `questions_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">問題インポート</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            テンプレート
          </button>
          <button
            onClick={handleExportCurrent}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            現在の問題をエクスポート
          </button>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-gray-500">
            {file ? (
              <div>
                <span className="font-medium text-gray-900">{file.name}</span>
                <span className="text-sm ml-2">({preview.length} 問)</span>
              </div>
            ) : (
              <div>
                <p className="font-medium">Excelファイルをドロップまたはクリック</p>
                <p className="text-sm mt-1">.xlsx, .xls</p>
              </div>
            )}
          </div>
        </div>

        {preview.length > 0 && (
          <div className="mt-4">
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {importing ? 'インポート中...' : `${preview.length} 問をインポート`}
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-medium text-gray-900 mb-4">インポート結果</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
              <div className="text-sm text-green-700">新規追加</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
              <div className="text-sm text-blue-700">更新</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
              <div className="text-sm text-red-700">エラー</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">エラー詳細</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>{e.questionId}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-medium text-gray-900 mb-4">
            プレビュー（最初の5問）
          </h2>
          <div className="space-y-4">
            {preview.slice(0, 5).map((q) => (
              <div key={q.question_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded">{q.question_id}</span>
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded">{q.chapter}</span>
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded">{q.difficulty}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{q.question_text}</p>
                <div className="mt-2 text-xs text-gray-500">
                  正解: {q.correct_answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
