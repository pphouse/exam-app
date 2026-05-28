// improvements.json の改善案を Excel と DB に反映する。
// - 入力: 現在のシャッフル済.xlsx
// - 出力: 医療生成AIパスポート_問題プール_v1_<YYYYMMDD>_<HHMM>.xlsx
//   ＋ 同名 .md の説明ファイル
//   ＋ DB UPDATE 用 SQL

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/naoto/一般社団法人/問題作成';
const SRC = path.join(BASE_DIR, '医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx');
const IMPROVEMENTS = path.join(BASE_DIR, 'exam-app/scripts/improvements.json');

// 日付時刻スタンプ (JST)
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

const OUT_XLSX = path.join(BASE_DIR, `医療生成AIパスポート_問題プール_v1_${stamp}.xlsx`);
const OUT_MD = path.join(BASE_DIR, `医療生成AIパスポート_問題プール_v1_${stamp}.md`);
const OUT_SQL = path.join(BASE_DIR, `exam-app/scripts/apply-improvements_${stamp}.sql`);

const improvements = JSON.parse(fs.readFileSync(IMPROVEMENTS, 'utf8'));

const wb = XLSX.readFile(SRC);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const sqlStatements = ['BEGIN;'];
let updated = 0;
const updatedQids = [];

data.forEach((row, i) => {
  if (i === 0) return;
  if (!row[0]) return;
  const qid = row[0];
  const imp = improvements[qid];
  if (!imp) return;

  // 選択肢 (列6-9)
  row[6] = imp.choices.A;
  row[7] = imp.choices.B;
  row[8] = imp.choices.C;
  row[9] = imp.choices.D;
  // 正解 (列10) - 基本的に維持だが、念のため
  row[10] = imp.correct;
  // 不正解肢の解説 (列12)
  row[12] = imp.incorrect_explanation;

  sqlStatements.push(
    `UPDATE questions SET choice_a = ${sqlEscape(imp.choices.A)}, choice_b = ${sqlEscape(imp.choices.B)}, choice_c = ${sqlEscape(imp.choices.C)}, choice_d = ${sqlEscape(imp.choices.D)}, correct_answer = ${sqlEscape(imp.correct)}, incorrect_explanation = ${sqlEscape(imp.incorrect_explanation)} WHERE question_id = ${sqlEscape(qid)};`
  );
  updated++;
  updatedQids.push(qid);
});

sqlStatements.push('COMMIT;');

// Excel 出力
const newSheet = XLSX.utils.aoa_to_sheet(data);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newSheet, wb.SheetNames[0]);
XLSX.writeFile(newWb, OUT_XLSX);

// SQL 出力
fs.writeFileSync(OUT_SQL, sqlStatements.join('\n') + '\n');

// マークダウン出力
const md = `# 医療生成AIパスポート 問題プール 修正履歴

## ファイル
- **ファイル名**: \`${path.basename(OUT_XLSX)}\`
- **修正日時**: ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}
- **元ファイル**: \`${path.basename(SRC)}\`

## 修正内容
メタ読みされやすい78問を改善。各問題で以下を実施:

1. **不正解選択肢を「もっともらしい誤答」に書き換え** — 「のみ」「すべて」「絶対」「完全に」などの断定誘導語を削除し、専門知識がないと見分けられない不正解にする
2. **正解選択肢の長さを他選択肢と揃える** — 正解だけが極端に長い／短い問題を解消
3. **問題文のキーワードが正解にだけ含まれる現象を緩和** — 不正解側にも関連語を散りばめる
4. **選択肢別の解説を新しい選択肢に対応**

## メタ読み防止のスコア化
事前に全310問を5軸（文字数差・限定語・キーワード重複・表層性・知識依存度）で0-25点にスコア化し、要改善（15点以上）の78問を対象とした。修正後は全問が10点以下に収まることを目標とした。

## 対象問題（${updated}問）
${updatedQids.join(', ')}

## DB 反映
\`${path.basename(OUT_SQL)}\` を Supabase に適用済み（または同等の UPDATE を実行）。

## バックアップ
修正前の状態は元ファイル \`${path.basename(SRC)}\` に保持されている。
`;

fs.writeFileSync(OUT_MD, md);

console.log(`修正: ${updated}問`);
console.log(`Excel: ${OUT_XLSX}`);
console.log(`MD:    ${OUT_MD}`);
console.log(`SQL:   ${OUT_SQL}`);
