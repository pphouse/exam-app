// 最終Excel状態（シャッフル済.xlsx）から全310問の
// correct_answer / explanation / incorrect_explanation を一括更新するSQLを生成。
// バッチでDBに適用しやすいよう、トランザクションで包む。

const XLSX = require('xlsx');
const fs = require('fs');

const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const SQL_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/sync-db-final.sql';

const wb = XLSX.readFile(SHUF_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const statements = ['BEGIN;'];
let count = 0;
data.forEach((row, i) => {
  if (i === 0) return;
  if (!row[0] || !String(row[0]).startsWith('Q')) return;
  const qid = row[0];
  const correct = row[10];
  const explanation = row[11];
  const incorrect = row[12];
  statements.push(
    `UPDATE questions SET correct_answer = ${sqlEscape(correct)}, explanation = ${sqlEscape(explanation)}, incorrect_explanation = ${sqlEscape(incorrect)} WHERE question_id = ${sqlEscape(qid)};`
  );
  count++;
});
statements.push('COMMIT;');

fs.writeFileSync(SQL_OUT, statements.join('\n') + '\n');
console.log(`書き出し: ${count}問 → ${SQL_OUT}`);
