// 不正解肢の解説（incorrect_explanation）に正解ラベルの行を追加し、
// 「A: 〜 / B: 〜 / C: 〜（正解） / D: 〜」の4ラベル統一フォーマットに変換する。
//
// 入力: シャッフル済.xlsx（ラベル変換済み）
// 出力: シャッフル済.xlsx を上書き + DB更新用 SQL
// 第7章は新規作成だが、形式統一のため対象に含める。
//
// 異常ケース（正解ラベルが既に解説に含まれている等）は変換せずレポートする。

const XLSX = require('xlsx');
const fs = require('fs');

const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const SQL_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/unify-explanations.sql';
const ANOMALY_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/anomalies-for-review.json';

const wb = XLSX.readFile(SHUF_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 既存の incorrect_explanation を {A:..., B:..., C:..., D:...} に分解
function parseLabels(text) {
  if (!text) return {};
  // 「(文頭|空白|句読点)X(:|：)」を区切りとして分割
  // まず、全部に統一マーカーを入れる
  const marked = text.replace(/(^|[\n\r\s。．\.，、,　])([A-D])[:：]/g, (_m, prefix, label) => {
    return `${prefix}${label}`;
  });
  const parts = marked.split('');
  // parts: [headTextBeforeFirstLabel, 'A', 'A の説明', 'B', 'B の説明', ...]
  const result = {};
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i];
    const content = (parts[i + 1] || '').trim();
    if (['A', 'B', 'C', 'D'].includes(label)) {
      // 行末改行・空白を整理。複数登場した場合は連結
      result[label] = result[label] ? `${result[label]} ${content}` : content;
    }
  }
  return result;
}

function buildUnified(labels, choices, correct) {
  return ['A', 'B', 'C', 'D']
    .map((l) => {
      const content = (labels[l] || '').replace(/\s+$/, '');
      const tag = l === correct ? '（正解）' : '';
      return `${l}: ${content}${tag}`;
    })
    .join('\n');
}

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

let unified = 0;
let anomalies = [];
const sqlStatements = [];

data.forEach((row, i) => {
  if (i === 0) return;
  if (!row[0] || !String(row[0]).startsWith('Q')) return;
  const qid = row[0];
  const choices = { A: row[6], B: row[7], C: row[8], D: row[9] };
  const correct = row[10];
  const oldExp12 = row[12] || '';
  const labels = parseLabels(oldExp12);

  const presentLabels = Object.keys(labels).filter((l) => labels[l]);
  const expectedIncorrectLabels = ['A', 'B', 'C', 'D'].filter((l) => l !== correct);

  // 異常判定:
  // - 正解ラベルが解説に含まれている (内容説明として)
  // - 不正解ラベルが欠けている
  const hasCorrectLabel = !!labels[correct];
  const missingIncorrect = expectedIncorrectLabels.filter((l) => !labels[l]);

  if (hasCorrectLabel || missingIncorrect.length > 0) {
    anomalies.push({
      qid,
      correct,
      choices,
      explanation: row[11],
      incorrect_explanation: oldExp12,
      parsed_labels: labels,
      has_correct_label_in_incorrect: hasCorrectLabel,
      missing_incorrect: missingIncorrect,
    });
    return; // 正常変換せず、後で個別判定
  }

  // 正常: 正解ラベルに「選択肢の文（正解）」を追加して4ラベル揃える
  labels[correct] = choices[correct];
  const newExp12 = buildUnified(labels, choices, correct);

  if (newExp12 === oldExp12) return;

  row[12] = newExp12;
  unified++;
  sqlStatements.push(
    `UPDATE questions SET incorrect_explanation = ${sqlEscape(newExp12)} WHERE question_id = ${sqlEscape(qid)};`
  );
});

const newSheet = XLSX.utils.aoa_to_sheet(data);
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, newSheet, wb.SheetNames[0]);
XLSX.writeFile(newWb, SHUF_PATH);

fs.writeFileSync(SQL_OUT, sqlStatements.join('\n') + '\n');
fs.writeFileSync(ANOMALY_OUT, JSON.stringify(anomalies, null, 2));

console.log(`統一フォーマット変換: ${unified}問`);
console.log(`要レビュー（異常）: ${anomalies.length}問 → ${ANOMALY_OUT}`);
console.log(`SQL: ${SQL_OUT}`);
