// 解説中の選択肢ラベル「A:/B:/C:/D:」（半角・全角コロン）を
// シャッフル後の新ラベルに変換して、Excel と DB の両方を更新する。
//
// v1 元（シャッフル前）の各問題の選択肢テキストと
// シャッフル済みの選択肢テキストを照合して 旧ラベル→新ラベル のマップを構築する。
// 第7章（v1 元に存在しない）はスキップ。

const XLSX = require('xlsx');
const fs = require('fs');

const V1_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1.xlsx';
const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const SQL_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/relabel-explanations.sql';

const wb0 = XLSX.readFile(V1_PATH);
const wbS = XLSX.readFile(SHUF_PATH);
const s0 = XLSX.utils.sheet_to_json(wb0.Sheets[wb0.SheetNames[0]], { header: 1 });
const sS = XLSX.utils.sheet_to_json(wbS.Sheets[wbS.SheetNames[0]], { header: 1 });

const v1Map = {};
s0.slice(1).forEach((r) => {
  if (r[0] && String(r[0]).startsWith('Q')) v1Map[r[0]] = r;
});

// 文頭/改行/空白/句読点の直後に来る「[ABCD][：:]」を選択肢ラベルとみなして置換
// （自然文中の「Aは」「BやC」のような表現はコロンを伴わないので影響なし）
function remapExplanation(text, oldToNew) {
  if (!text) return text;
  const replaced = text.replace(
    /(^|[\n\r\s。．\.，、,　])([A-D])([:：])/g,
    (_m, prefix, label, colon) => {
      const newL = oldToNew[label] || label;
      return `${prefix}${newL}${colon}`;
    }
  );
  // 複数行の場合のみ、行頭ラベル(A,B,C,D)順に並べ替える
  if (replaced.includes('\n')) {
    return replaced
      .split('\n')
      .sort((a, b) => {
        const am = a.match(/^([A-D])[：:]/);
        const bm = b.match(/^([A-D])[：:]/);
        const av = am ? am[1] : 'Z';
        const bv = bm ? bm[1] : 'Z';
        if (av === bv) return 0;
        return av < bv ? -1 : 1;
      })
      .join('\n');
  }
  return replaced;
}

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

let updated = 0;
let skipped = 0;
let noChange = 0;
const sqlStatements = [];

sS.forEach((row, i) => {
  if (i === 0) return;
  if (!row[0] || !String(row[0]).startsWith('Q')) return;
  const qid = row[0];
  const v1 = v1Map[qid];
  if (!v1) {
    skipped++;
    return;
  }

  const v1Choices = { A: v1[6], B: v1[7], C: v1[8], D: v1[9] };
  const newChoices = { A: row[6], B: row[7], C: row[8], D: row[9] };
  const oldToNew = {};
  ['A', 'B', 'C', 'D'].forEach((l) => {
    const text = v1Choices[l];
    const newL = ['A', 'B', 'C', 'D'].find((nl) => newChoices[nl] === text);
    if (newL) oldToNew[l] = newL;
  });

  const oldExp11 = row[11];
  const oldExp12 = row[12];
  const newExp11 = remapExplanation(oldExp11, oldToNew);
  const newExp12 = remapExplanation(oldExp12, oldToNew);

  if (newExp11 === oldExp11 && newExp12 === oldExp12) {
    noChange++;
    return;
  }

  row[11] = newExp11;
  row[12] = newExp12;
  updated++;

  sqlStatements.push(
    `UPDATE questions SET explanation = ${sqlEscape(newExp11)}, incorrect_explanation = ${sqlEscape(newExp12)} WHERE question_id = ${sqlEscape(qid)};`
  );
});

const newSheet = XLSX.utils.aoa_to_sheet(sS);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newSheet, wbS.SheetNames[0]);
XLSX.writeFile(newWb, SHUF_PATH);

fs.writeFileSync(SQL_OUT, sqlStatements.join('\n') + '\n');

console.log(`更新: ${updated}問`);
console.log(`変更なし: ${noChange}問`);
console.log(`スキップ（v1なし）: ${skipped}問`);
console.log(`Excel更新: ${SHUF_PATH}`);
console.log(`SQL出力: ${SQL_OUT}`);
