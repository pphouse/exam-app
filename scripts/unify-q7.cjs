// 第7章10問の「Aは誤り（〜）、Bは誤り（〜）」形式を
// 「A: 〜（誤り）」形式に変換する。

const XLSX = require('xlsx');
const fs = require('fs');

const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const SQL_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/unify-q7.sql';

const wb = XLSX.readFile(SHUF_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

let updated = 0;
const sqlStatements = [];

data.forEach((row, i) => {
  if (i === 0) return;
  if (!row[0] || !String(row[0]).startsWith('Q7')) return;
  const qid = row[0];
  const choices = { A: row[6], B: row[7], C: row[8], D: row[9] };
  const correct = row[10];
  const oldExp = row[12] || '';

  // 「Aは…」を区切りとしてセグメント化（lookahead）
  const labels = {};
  const segments = oldExp.split(/(?=[A-D]は)/g);
  segments.forEach((seg) => {
    const sm = seg.match(/^([A-D])は(.+?)[、。．]?\s*$/);
    if (!sm) return;
    let content = sm[2].trim();
    // 「誤り（XXX）」「正しい（XXX）」のように、括弧内に本質説明がある場合は中身を採用
    const inner = content.match(/^[^（(]{0,8}[（(](.+)[）)]$/);
    if (inner) content = inner[1].trim();
    labels[sm[1]] = content;
  });

  // 4ラベル統一フォーマット
  const lines = ['A', 'B', 'C', 'D'].map((l) => {
    if (l === correct) {
      return `${l}: ${choices[l]}（正解）`;
    }
    return `${l}: ${labels[l] || choices[l]}（誤り）`;
  });
  const newExp = lines.join('\n');

  row[12] = newExp;
  updated++;
  sqlStatements.push(
    `UPDATE questions SET incorrect_explanation = ${sqlEscape(newExp)} WHERE question_id = ${sqlEscape(qid)};`
  );
});

const newSheet = XLSX.utils.aoa_to_sheet(data);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newSheet, wb.SheetNames[0]);
XLSX.writeFile(newWb, SHUF_PATH);

fs.writeFileSync(SQL_OUT, sqlStatements.join('\n') + '\n');

console.log(`Q7 変換: ${updated}問`);
console.log(`SQL: ${SQL_OUT}`);
