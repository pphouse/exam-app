// 機械的シグナル（軸①文字数差 / 軸②限定語 / 軸③キーワード重複）を算出。
// 各軸0-5点。

const XLSX = require('xlsx');
const fs = require('fs');

const SHUF_PATH = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
const OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/meta-reading-mechanical.json';

const wb = XLSX.readFile(SHUF_PATH);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

// 限定語（誤答誘導されやすいワード）
const QUALIFIERS = [
  'のみ', 'すべて', '全て', '絶対', '常に', '一切', '決して', '必ず',
  '不可能', 'できない', '存在しない', '無関係', '関係ない', '全く',
  '完全に', '100%', '100％',
];

// 軸① 文字数差スコア (0-5)
// 正解選択肢が最長で +X% の場合に高スコア
function scoreLength(choices, correct) {
  const lens = ['A', 'B', 'C', 'D'].map((l) => (choices[l] || '').length);
  const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correct);
  const correctLen = lens[correctIdx];
  const others = lens.filter((_, i) => i !== correctIdx);
  const avgOthers = others.reduce((a, b) => a + b, 0) / others.length;
  if (avgOthers === 0) return 0;
  const ratio = correctLen / avgOthers;
  const isLongest = correctLen === Math.max(...lens);
  const isShortest = correctLen === Math.min(...lens);
  // 正解が最長: +50%以上→5, +30%以上→4, +15%以上→3, +5%以上→2, それ以下→1
  if (isLongest) {
    if (ratio >= 1.5) return 5;
    if (ratio >= 1.3) return 4;
    if (ratio >= 1.15) return 3;
    if (ratio >= 1.05) return 2;
    return 1;
  }
  // 正解が最短も逆メタ読み (簡潔さで正解と分かる)
  if (isShortest) {
    if (ratio <= 0.5) return 4;
    if (ratio <= 0.7) return 2;
    return 1;
  }
  return 0;
}

// 軸② 限定語スコア (0-5)
// 不正解選択肢にだけ限定語がある→誤答誘導が強い→高スコア
function scoreQualifier(choices, correct) {
  const has = {};
  ['A', 'B', 'C', 'D'].forEach((l) => {
    const text = choices[l] || '';
    has[l] = QUALIFIERS.some((q) => text.includes(q));
  });
  const correctHas = has[correct];
  const incorrectHasCount = ['A', 'B', 'C', 'D']
    .filter((l) => l !== correct)
    .filter((l) => has[l]).length;
  // 不正解だけが限定語を持つ→誤答誘導
  if (!correctHas && incorrectHasCount >= 2) return 5;
  if (!correctHas && incorrectHasCount === 1) return 3;
  if (correctHas && incorrectHasCount === 0) return 1;
  return 0;
}

// 軸③ キーワード重複 (0-5)
// 問題文に含まれる漢字熟語（2文字以上）が正解選択肢にだけ含まれる場合
function scoreKeywordOverlap(questionText, choices, correct) {
  const kanjiTerms = (questionText.match(/[一-龯]{2,}/g) || []).filter((t, i, a) => a.indexOf(t) === i);
  if (kanjiTerms.length === 0) return 0;
  let hintScore = 0;
  let counted = 0;
  for (const term of kanjiTerms) {
    const inCorrect = (choices[correct] || '').includes(term);
    const others = ['A', 'B', 'C', 'D'].filter((l) => l !== correct);
    const inOthers = others.some((l) => (choices[l] || '').includes(term));
    if (inCorrect && !inOthers) {
      hintScore += 1;
      counted++;
    }
  }
  // 正解だけに含まれる固有語が多いほど高スコア
  if (hintScore >= 4) return 5;
  if (hintScore === 3) return 4;
  if (hintScore === 2) return 2;
  if (hintScore === 1) return 1;
  return 0;
}

const out = [];
data.forEach((row, i) => {
  if (i === 0) return;
  if (!row[0] || !String(row[0]).startsWith('Q')) return;
  const qid = row[0];
  const chapter = row[1];
  const qtext = row[5];
  const choices = { A: row[6], B: row[7], C: row[8], D: row[9] };
  const correct = row[10];

  const s1 = scoreLength(choices, correct);
  const s2 = scoreQualifier(choices, correct);
  const s3 = scoreKeywordOverlap(qtext, choices, correct);

  // 長さ詳細
  const lens = ['A', 'B', 'C', 'D'].map((l) => choices[l].length);
  const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correct);

  out.push({
    qid,
    chapter,
    correct,
    question_text: qtext,
    choices,
    lengths: { A: lens[0], B: lens[1], C: lens[2], D: lens[3] },
    correct_length: lens[correctIdx],
    avg_incorrect_length: Math.round(
      lens.filter((_, j) => j !== correctIdx).reduce((a, b) => a + b, 0) / 3
    ),
    score_length: s1,
    score_qualifier: s2,
    score_keyword: s3,
    mechanical_total: s1 + s2 + s3,
  });
});

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

// サマリー
console.log(`Total: ${out.length} questions`);
const dist = { 0: 0, '1-3': 0, '4-6': 0, '7-9': 0, '10-15': 0 };
out.forEach((x) => {
  const t = x.mechanical_total;
  if (t === 0) dist[0]++;
  else if (t <= 3) dist['1-3']++;
  else if (t <= 6) dist['4-6']++;
  else if (t <= 9) dist['7-9']++;
  else dist['10-15']++;
});
console.log('Mechanical score distribution:', dist);
console.log('Top 10 high mechanical scores:');
out
  .sort((a, b) => b.mechanical_total - a.mechanical_total)
  .slice(0, 10)
  .forEach((x) =>
    console.log(
      `  ${x.qid}: total=${x.mechanical_total} (len:${x.score_length} qual:${x.score_qualifier} kw:${x.score_keyword})`
    )
  );
console.log(`\nWrote: ${OUT}`);
