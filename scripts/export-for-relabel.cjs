// シャッフル済 Excel から、各問題の現在の選択肢と解説をJSONで出力。
// 第7章を除く300問が対象。

const XLSX = require('xlsx');
const fs = require('fs');

const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/questions-for-relabel.json';

const wb = XLSX.readFile(SHUF_PATH);
const s = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

const out = [];
s.slice(1).forEach((r) => {
  if (!r[0] || !String(r[0]).startsWith('Q')) return;
  // 第7章は新規作成なのでスキップ可（ただし整合確認のために含めても良い）
  out.push({
    qid: r[0],
    chapter: r[1],
    question_text: r[5],
    choices: { A: r[6], B: r[7], C: r[8], D: r[9] },
    correct: r[10],
    explanation: r[11],
    incorrect_explanation: r[12],
  });
});

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} questions to ${OUT}`);
