const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1.xlsx';
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

let issues = [];
let corrections = [];

data.slice(1).forEach((row, i) => {
  if (!row[0] || !String(row[0]).startsWith('Q')) return;

  const qid = row[0];
  const question = row[5] || '';
  const choices = {
    'A': (row[6] || ''),
    'B': (row[7] || ''),
    'C': (row[8] || ''),
    'D': (row[9] || '')
  };
  const currentAnswer = row[10];
  const explanation = (row[11] || '');

  // 解説の最初の部分（正解の根拠が書いてある部分）を抽出
  const explLower = explanation.toLowerCase();

  // 各選択肢のキーワードが解説に含まれているかチェック
  let bestMatch = currentAnswer;
  let bestScore = 0;

  for (const [letter, choice] of Object.entries(choices)) {
    if (!choice) continue;

    const choiceLower = choice.toLowerCase();

    // 選択肢の主要な単語を抽出（3文字以上）
    const words = choiceLower.split(/[、。（）「」\s・:：]+/).filter(w => w.length >= 3);
    let score = 0;

    for (const word of words) {
      // 解説の最初の200文字に含まれていれば高スコア
      if (explLower.substring(0, 200).includes(word)) {
        score += word.length * 2;
      } else if (explLower.includes(word)) {
        score += word.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = letter;
    }
  }

  // 現在の正解のスコアも計算
  let currentScore = 0;
  const currentChoiceLower = (choices[currentAnswer] || '').toLowerCase();
  const currentWords = currentChoiceLower.split(/[、。（）「」\s・:：]+/).filter(w => w.length >= 3);
  for (const word of currentWords) {
    if (explLower.substring(0, 200).includes(word)) {
      currentScore += word.length * 2;
    } else if (explLower.includes(word)) {
      currentScore += word.length;
    }
  }

  // 明らかに違う場合のみ修正候補に追加
  if (bestMatch !== currentAnswer && bestScore > currentScore * 1.5 && bestScore > 15) {
    issues.push({
      qid,
      rowIndex: i + 1,
      current: currentAnswer,
      suggested: bestMatch,
      currentScore,
      bestScore,
      question: question.substring(0, 50),
      choiceCurrent: choices[currentAnswer].substring(0, 50),
      choiceSuggested: choices[bestMatch].substring(0, 50),
      explanation: explanation.substring(0, 100)
    });

    corrections.push({
      qid,
      rowIndex: i + 1,
      from: currentAnswer,
      to: bestMatch
    });
  }
});

console.log('=== 修正候補 (' + issues.length + '件) ===\n');
issues.forEach((issue, idx) => {
  console.log(`${idx + 1}. ${issue.qid}: ${issue.current} → ${issue.suggested} (スコア: ${issue.currentScore} → ${issue.bestScore})`);
  console.log(`   問題: ${issue.question}...`);
  console.log(`   現在: ${issue.choiceCurrent}...`);
  console.log(`   修正: ${issue.choiceSuggested}...`);
  console.log(`   解説: ${issue.explanation}...`);
  console.log('');
});

// 修正を適用
if (corrections.length > 0) {
  console.log('\n=== 修正を適用中... ===\n');

  corrections.forEach(c => {
    data[c.rowIndex][10] = c.to;
  });

  // 新しいワークブックを作成
  const newSheet = XLSX.utils.aoa_to_sheet(data);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, workbook.SheetNames[0]);

  // 保存
  const outputPath = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_修正済.xlsx';
  XLSX.writeFile(newWorkbook, outputPath);
  console.log(`修正済みファイルを保存しました: ${outputPath}`);
  console.log(`修正件数: ${corrections.length}件`);
}
