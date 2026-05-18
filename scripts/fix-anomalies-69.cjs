// 69問の異常（シャッフル時に正解ラベルがズレたケース）を修正:
//  - 真の正解 = missing_incorrect[0]（解説に「不正解として」書かれていない唯一のラベル）
//  - correct_answer を真の正解に更新
//  - incorrect_explanation を A-D 4ラベル統一形式に再構成（正解ラベルは選択肢の文＋「（正解）」）
//
// この修正は「正解ラベルそのものを変更」する。過去の answers.is_correct は記録済みなので
// 履歴は変わらず、今後の受験から新しい正解が適用される。

const XLSX = require('xlsx');
const fs = require('fs');

const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const ANOMALY_PATH = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/anomalies-69.json';
const SQL_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/fix-anomalies-69.sql';
const REPORT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/fix-anomalies-69-report.json';

const anomalies = JSON.parse(fs.readFileSync(ANOMALY_PATH, 'utf8'));
const wb = XLSX.readFile(SHUF_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const rowMap = {};
data.forEach((r, i) => {
  if (i === 0) return;
  if (r[0]) rowMap[r[0]] = { row: r, idx: i };
});

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const sqlStatements = [];
const report = [];

anomalies.forEach((q) => {
  const trueCorrect = q.missing_incorrect[0];
  const entry = rowMap[q.qid];
  if (!entry) return;
  const row = entry.row;

  const labels = { ...q.parsed_labels };
  labels[trueCorrect] = q.choices[trueCorrect]; // 正解ラベルには選択肢の文をそのまま入れる

  const newExp = ['A', 'B', 'C', 'D']
    .map((l) => {
      const content = (labels[l] || q.choices[l]).replace(/\s+$/, '');
      const tag = l === trueCorrect ? '（正解）' : '';
      return `${l}: ${content}${tag}`;
    })
    .join('\n');

  const oldCorrect = row[10];
  row[10] = trueCorrect; // correct_answer
  row[12] = newExp; // incorrect_explanation

  sqlStatements.push(
    `UPDATE questions SET correct_answer = ${sqlEscape(trueCorrect)}, incorrect_explanation = ${sqlEscape(newExp)} WHERE question_id = ${sqlEscape(q.qid)};`
  );
  report.push({
    qid: q.qid,
    old_correct: oldCorrect,
    new_correct: trueCorrect,
    question_text: q.question_text,
    new_correct_choice: q.choices[trueCorrect],
  });
});

const newSheet = XLSX.utils.aoa_to_sheet(data);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newSheet, wb.SheetNames[0]);
XLSX.writeFile(newWb, SHUF_PATH);

fs.writeFileSync(SQL_OUT, sqlStatements.join('\n') + '\n');
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(`修正完了: ${report.length}問`);
console.log(`SQL: ${SQL_OUT}`);
console.log(`レポート: ${REPORT}`);
