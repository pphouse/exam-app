import type { Question } from '../types'

export const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const

// 問題が複数選択(2つ選べ)かどうか
export function isMulti(q: Question): boolean {
  return q.question_type === 'multi'
}

// 正解の選択肢集合 (例: "A,C" -> ["A","C"])
export function correctSet(q: Question): string[] {
  return (q.correct_answer || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
}

// ユーザー回答(配列 or 文字列)を正規化した文字列に ("A,C")
export function normalizeAnswer(answer: string | string[] | undefined | null): string {
  if (!answer) return ''
  const arr = Array.isArray(answer) ? answer : answer.split(',')
  return arr
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
    .join(',')
}

// 採点: 複数選択は完全一致のみ正解
export function isAnswerCorrect(q: Question, answer: string | string[] | undefined | null): boolean {
  const user = normalizeAnswer(answer)
  if (!user) return false
  return user === correctSet(q).join(',')
}

// 選択肢の本文を取得 (E未設定なら空)
export function choiceText(q: Question, option: string): string {
  const key = `choice_${option.toLowerCase()}` as keyof Question
  return (q[key] as string) || ''
}

// 表示する選択肢のリスト (Eが無い古いデータは4択)
export function visibleOptions(q: Question): string[] {
  return OPTIONS.filter((o) => o === 'A' || o === 'B' || o === 'C' || o === 'D' || !!q.choice_e)
}

// 正解表示用ラベル ("A,C" や "B")
export function correctLabel(q: Question): string {
  return correctSet(q).join('・')
}
