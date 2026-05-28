// 機械シグナル + Claude判定 を統合して CSV を出力。
// 列: qid, chapter, 正解, 問題文, 文字数差, 限定語, キーワード, 表層性, 知識依存, 合計

const fs = require('fs');

const mech = JSON.parse(fs.readFileSync('/Users/naoto/一般社団法人/問題作成/exam-app/scripts/meta-reading-mechanical.json', 'utf8'));
const claude = JSON.parse(fs.readFileSync('/Users/naoto/一般社団法人/問題作成/exam-app/scripts/meta-reading-claude.json', 'utf8'));

const CSV = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/meta-reading-scores.csv';
const JSON_OUT = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts/meta-reading-final.json';

function csvEsc(s) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const header = [
  'qid', 'chapter', 'correct', 'question_text',
  'score_length(機械)', 'score_qualifier(機械)', 'score_keyword(機械)',
  'score_surface(Claude)', 'score_knowledge(Claude)',
  '合計スコア', '判定区分', 'Claude判定理由',
  '選択肢A', '選択肢B', '選択肢C', '選択肢D',
  '正解文字数', '不正解平均文字数',
];

const rows = [header.map(csvEsc).join(',')];
const finalJson = [];

mech.forEach((m) => {
  const c = claude[m.qid] || { surface: 0, knowledge: 0, reason: '(未判定)' };
  const total = m.score_length + m.score_qualifier + m.score_keyword + c.surface + c.knowledge;
  let band;
  if (total <= 7) band = '良問';
  else if (total <= 14) band = '注意';
  else band = '要改善';

  const row = [
    m.qid, m.chapter, m.correct, m.question_text,
    m.score_length, m.score_qualifier, m.score_keyword,
    c.surface, c.knowledge,
    total, band, c.reason,
    m.choices.A, m.choices.B, m.choices.C, m.choices.D,
    m.correct_length, m.avg_incorrect_length,
  ];
  rows.push(row.map(csvEsc).join(','));
  finalJson.push({
    qid: m.qid,
    chapter: m.chapter,
    correct: m.correct,
    question_text: m.question_text,
    scores: {
      length: m.score_length,
      qualifier: m.score_qualifier,
      keyword: m.score_keyword,
      surface: c.surface,
      knowledge: c.knowledge,
      total,
    },
    band,
    claude_reason: c.reason,
    choices: m.choices,
    correct_length: m.correct_length,
    avg_incorrect_length: m.avg_incorrect_length,
  });
});

// BOMをつけてExcelで開きやすく
fs.writeFileSync(CSV, '﻿' + rows.join('\n') + '\n');
fs.writeFileSync(JSON_OUT, JSON.stringify(finalJson, null, 2));

// サマリー
const counts = { 良問: 0, 注意: 0, 要改善: 0 };
const byChapterBand = {};
finalJson.forEach((f) => {
  counts[f.band]++;
  if (!byChapterBand[f.chapter]) byChapterBand[f.chapter] = { 良問: 0, 注意: 0, 要改善: 0 };
  byChapterBand[f.chapter][f.band]++;
});

console.log(`CSV: ${CSV}`);
console.log(`JSON: ${JSON_OUT}`);
console.log(`合計問題数: ${finalJson.length}`);
console.log(`判定区分: 良問=${counts.良問}, 注意=${counts.注意}, 要改善=${counts.要改善}`);
console.log('章別:');
Object.keys(byChapterBand).sort().forEach((ch) => {
  const b = byChapterBand[ch];
  console.log(`  ${ch}: 良問=${b.良問}, 注意=${b.注意}, 要改善=${b.要改善}`);
});

// Top 20
console.log('\nスコア上位20問（メタ読みされやすい）:');
finalJson
  .sort((a, b) => b.scores.total - a.scores.total)
  .slice(0, 20)
  .forEach((f) => {
    console.log(`  ${f.qid} [${f.chapter}] 合計${f.scores.total} (機械${f.scores.length+f.scores.qualifier+f.scores.keyword} + Claude${f.scores.surface+f.scores.knowledge}): ${f.claude_reason}`);
  });
