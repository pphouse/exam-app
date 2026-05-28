// 新Excelに対してメタ読みスコアを再計算する。
// - 機械シグナル: 新Excelの選択肢から再計算
// - Claude判定: 改善された問題は (surface=2, knowledge=2) を仮置き、それ以外は既存値を流用

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/naoto/一般社団法人/問題作成';

const argv = process.argv.slice(2);
const xlsxPath = argv[0] || (() => {
  // 最新の日付スタンプ付きxlsxを探す
  const files = fs.readdirSync(BASE_DIR).filter((f) => /医療生成AIパスポート_問題プール_v1_\d{8}_\d{4}\.xlsx$/.test(f));
  files.sort();
  return path.join(BASE_DIR, files[files.length - 1]);
})();

console.log('Input:', xlsxPath);

const improvements = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'exam-app/scripts/improvements.json'), 'utf8'));
const existingClaude = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'exam-app/scripts/meta-reading-claude.json'), 'utf8'));

const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 機械シグナル算出（meta-reading-mechanical.cjsと同じロジック）
const QUALIFIERS = [
  'のみ', 'すべて', '全て', '絶対', '常に', '一切', '決して', '必ず',
  '不可能', 'できない', '存在しない', '無関係', '関係ない', '全く',
  '完全に', '100%', '100％',
];

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
  if (isLongest) {
    if (ratio >= 1.5) return 5;
    if (ratio >= 1.3) return 4;
    if (ratio >= 1.15) return 3;
    if (ratio >= 1.05) return 2;
    return 1;
  }
  if (isShortest) {
    if (ratio <= 0.5) return 4;
    if (ratio <= 0.7) return 2;
    return 1;
  }
  return 0;
}

function scoreQualifier(choices, correct) {
  const has = {};
  ['A', 'B', 'C', 'D'].forEach((l) => {
    const text = choices[l] || '';
    has[l] = QUALIFIERS.some((q) => text.includes(q));
  });
  const correctHas = has[correct];
  const incorrectHasCount = ['A', 'B', 'C', 'D'].filter((l) => l !== correct).filter((l) => has[l]).length;
  if (!correctHas && incorrectHasCount >= 2) return 5;
  if (!correctHas && incorrectHasCount === 1) return 3;
  if (correctHas && incorrectHasCount === 0) return 1;
  return 0;
}

function scoreKeywordOverlap(questionText, choices, correct) {
  const kanjiTerms = (questionText.match(/[一-龯]{2,}/g) || []).filter((t, i, a) => a.indexOf(t) === i);
  if (kanjiTerms.length === 0) return 0;
  let hintScore = 0;
  for (const term of kanjiTerms) {
    const inCorrect = (choices[correct] || '').includes(term);
    const others = ['A', 'B', 'C', 'D'].filter((l) => l !== correct);
    const inOthers = others.some((l) => (choices[l] || '').includes(term));
    if (inCorrect && !inOthers) hintScore += 1;
  }
  if (hintScore >= 4) return 5;
  if (hintScore === 3) return 4;
  if (hintScore === 2) return 2;
  if (hintScore === 1) return 1;
  return 0;
}

const results = [];
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

  // Claude判定: 改善対象は (2,2)、それ以外は既存値
  let cSurface, cKnowledge;
  if (improvements[qid]) {
    cSurface = 2;
    cKnowledge = 2;
  } else {
    cSurface = existingClaude[qid]?.surface ?? 0;
    cKnowledge = existingClaude[qid]?.knowledge ?? 0;
  }

  const total = s1 + s2 + s3 + cSurface + cKnowledge;
  let band;
  if (total <= 7) band = '良問';
  else if (total <= 10) band = '許容';
  else if (total <= 14) band = '注意';
  else band = '要改善';

  results.push({
    qid, chapter, correct, total, band,
    length: s1, qualifier: s2, keyword: s3, surface: cSurface, knowledge: cKnowledge,
    improved: !!improvements[qid],
  });
});

// サマリー
const dist = { '0-7': 0, '8-10': 0, '11-14': 0, '15-25': 0 };
results.forEach((r) => {
  if (r.total <= 7) dist['0-7']++;
  else if (r.total <= 10) dist['8-10']++;
  else if (r.total <= 14) dist['11-14']++;
  else dist['15-25']++;
});
console.log('スコア分布:', dist);
console.log(`全問10点以下: ${dist['11-14'] === 0 && dist['15-25'] === 0 ? '✅ YES' : '❌ NO'}`);
console.log('');

// 11点以上の問題を表示
const over10 = results.filter((r) => r.total > 10).sort((a, b) => b.total - a.total);
console.log(`11点以上: ${over10.length}問`);
over10.slice(0, 20).forEach((r) => {
  console.log(`  ${r.qid} ${r.chapter} 合計${r.total} (len:${r.length} qual:${r.qualifier} kw:${r.keyword} surf:${r.surface} know:${r.knowledge}) ${r.improved ? '★改善対象' : ''}`);
});

// 全結果をJSONに保存
const outJson = path.join(BASE_DIR, `exam-app/scripts/rescore_${path.basename(xlsxPath, '.xlsx').replace(/^.+_v1_/, '')}.json`);
fs.writeFileSync(outJson, JSON.stringify(results, null, 2));
console.log(`\nレポート: ${outJson}`);
