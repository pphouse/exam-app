const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Excelファイルのパス（修正済みファイルを使用）
const excelPath = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_修正済.xlsx';

// Excelファイルを読み込み
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// ヘッダー行を取得（1行目）
const headers = rawData[0];
console.log('ヘッダー:', headers);

// 実際のデータ行を処理（2行目以降で、問題IDが「Q」で始まるもののみ）
const data = rawData.slice(1).filter(row => {
  return row[0] && String(row[0]).startsWith('Q');
});

console.log(`有効な問題数: ${data.length}問`);

// SQLエスケープ関数
function escapeSQL(str) {
  if (str === null || str === undefined || str === '') return 'NULL';
  // 改行はそのまま保持（PostgreSQLは改行を直接扱える）
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// SQL生成
let sql = `-- 問題データインポート\n-- 生成日時: ${new Date().toISOString()}\n-- 問題数: ${data.length}問\n\n`;

sql += `-- 既存データを削除（必要に応じてコメントアウトを外す）\n`;
sql += `-- DELETE FROM question_stats;\n`;
sql += `-- DELETE FROM answers;\n`;
sql += `-- DELETE FROM exam_sessions;\n`;
sql += `-- DELETE FROM questions;\n\n`;

sql += `INSERT INTO questions (question_id, chapter, keyword, difficulty, bloom_level, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, incorrect_explanation, source)\nVALUES\n`;

const values = data.map((row, index) => {
  const questionId = row[0];  // 問題ID
  const chapter = row[1];     // 章
  const keyword = row[2];     // 対応キーワード
  const difficulty = row[3];  // 難易度
  const bloomLevel = row[4];  // 認知レベル
  const questionText = row[5]; // 問題文
  const choiceA = row[6];     // 選択肢A
  const choiceB = row[7];     // 選択肢B
  const choiceC = row[8];     // 選択肢C
  const choiceD = row[9];     // 選択肢D
  const correctAnswer = row[10]; // 正解
  const explanation = row[11];  // 解説
  const incorrectExplanation = row[12]; // 不正解肢の解説
  const source = row[13];       // 出典

  return `(${escapeSQL(questionId)}, ${escapeSQL(chapter)}, ${escapeSQL(keyword)}, ${escapeSQL(difficulty)}, ${escapeSQL(bloomLevel)}, ${escapeSQL(questionText)}, ${escapeSQL(choiceA)}, ${escapeSQL(choiceB)}, ${escapeSQL(choiceC)}, ${escapeSQL(choiceD)}, ${escapeSQL(correctAnswer)}, ${escapeSQL(explanation)}, ${escapeSQL(incorrectExplanation)}, ${escapeSQL(source)})`;
});

sql += values.join(',\n');
sql += ';\n';

// SQLファイルに出力
const outputPath = path.join(__dirname, '../import-questions.sql');
fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`\nSQLファイルを生成しました: ${outputPath}`);

// データの確認
console.log('\n最初の問題のプレビュー:');
console.log({
  問題ID: data[0][0],
  章: data[0][1],
  キーワード: data[0][2],
  難易度: data[0][3],
  問題文: data[0][5]?.substring(0, 50) + '...',
});
