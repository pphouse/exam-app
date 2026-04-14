const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_修正済.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

let fixes = {};
let issueCount = 0;

// すべての問題をチェック
data.slice(1).forEach((row, idx) => {
  if (!row[0] || !String(row[0]).startsWith('Q')) return;

  const qid = row[0];
  const answer = row[10];
  const explanation = (row[11] || '');
  const choices = {
    A: row[6] || '',
    B: row[7] || '',
    C: row[8] || '',
    D: row[9] || ''
  };

  // 解説の最初の200文字と各選択肢を比較
  const explLower = explanation.toLowerCase().substring(0, 250);

  let bestMatch = null;
  let bestScore = 0;
  let currentScore = 0;

  for (const [letter, choice] of Object.entries(choices)) {
    if (!choice) continue;
    const choiceLower = choice.toLowerCase();
    const words = choiceLower.split(/[、。（）「」\s・:：\n]+/).filter(w => w.length >= 3);
    let score = 0;

    for (const word of words) {
      if (explLower.includes(word)) {
        score += word.length;
      }
    }

    if (letter === answer) {
      currentScore = score;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = letter;
    }
  }

  // 現在の正解よりも明らかに高いスコアの選択肢がある場合
  if (bestMatch && bestMatch !== answer && bestScore > currentScore * 1.3 && bestScore > 10) {
    issueCount++;
    fixes[qid] = bestMatch;
    console.log(`${qid}: ${answer} → ${bestMatch} (スコア: ${currentScore} → ${bestScore})`);
  }
});

console.log(`\n検出された問題: ${issueCount}件`);
console.log('\n修正を適用中...');

// 修正を適用
let fixedCount = 0;
data.forEach((row, i) => {
  if (row[0] && fixes[row[0]]) {
    data[i][10] = fixes[row[0]];
    fixedCount++;
  }
});

// 保存
const newSheet = XLSX.utils.aoa_to_sheet(data);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newSheet, workbook.SheetNames[0]);
XLSX.writeFile(newWorkbook, '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_修正済.xlsx');

console.log(`修正完了: ${fixedCount}件`);

// 最終分布を確認
const finalData = XLSX.utils.sheet_to_json(newSheet, { header: 1 });
const answers = finalData.slice(1).filter(r => r[0] && String(r[0]).startsWith('Q')).map(r => r[10]);
const count = { A: 0, B: 0, C: 0, D: 0 };
answers.forEach(a => count[a] = (count[a] || 0) + 1);
console.log('\n最終分布:');
console.log(`A: ${count.A} (${(count.A/3).toFixed(1)}%)`);
console.log(`B: ${count.B} (${(count.B/3).toFixed(1)}%)`);
console.log(`C: ${count.C} (${(count.C/3).toFixed(1)}%)`);
console.log(`D: ${count.D} (${(count.D/3).toFixed(1)}%)`);
