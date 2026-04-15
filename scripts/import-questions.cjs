const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wlrveiooyywhihsipjoi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // サービスロールキーが必要

// コマンドライン引数からExcelファイルのパスを取得
const excelPath = process.argv[2];
if (!excelPath) {
  console.error('使用方法: node scripts/import-questions.cjs <Excelファイルパス>');
  console.error('例: node scripts/import-questions.cjs /path/to/questions.xlsx');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('環境変数 SUPABASE_SERVICE_KEY を設定してください');
  console.error('Supabase ダッシュボード → Settings → API → service_role key');
  process.exit(1);
}

// Supabaseクライアント（サービスロールでRLSをバイパス）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Excelファイルを読み込み
console.log(`\nExcelファイルを読み込み中: ${excelPath}`);
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

// インポート実行
async function importQuestions() {
  const importedAt = new Date().toISOString();
  const results = { inserted: 0, updated: 0, errors: [] };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
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

    // 既存の問題を検索
    const { data: existing } = await supabase
      .from('questions')
      .select('id, version')
      .eq('question_id', questionId)
      .single();

    const questionData = {
      question_id: questionId,
      chapter: chapter || null,
      keyword: keyword || null,
      difficulty: difficulty || null,
      bloom_level: bloomLevel || null,
      question_text: questionText || '',
      choice_a: choiceA || '',
      choice_b: choiceB || '',
      choice_c: choiceC || '',
      choice_d: choiceD || '',
      correct_answer: correctAnswer || '',
      explanation: explanation || '',
      incorrect_explanation: incorrectExplanation || null,
      source: source || null,
      is_active: true,
      imported_at: importedAt,
    };

    if (existing) {
      // 既存の問題を更新（バージョンをインクリメント）
      const { error } = await supabase
        .from('questions')
        .update({
          ...questionData,
          version: (existing.version || 1) + 1,
        })
        .eq('id', existing.id);

      if (error) {
        results.errors.push({ questionId, error: error.message });
      } else {
        results.updated++;
      }
    } else {
      // 新規問題を挿入
      const { error } = await supabase
        .from('questions')
        .insert({
          ...questionData,
          version: 1,
        });

      if (error) {
        results.errors.push({ questionId, error: error.message });
      } else {
        results.inserted++;
      }
    }

    // 進捗表示
    if ((i + 1) % 50 === 0 || i === data.length - 1) {
      console.log(`進捗: ${i + 1}/${data.length} (挿入: ${results.inserted}, 更新: ${results.updated})`);
    }
  }

  return results;
}

// メイン実行
importQuestions()
  .then(results => {
    console.log('\n========== インポート完了 ==========');
    console.log(`新規挿入: ${results.inserted}問`);
    console.log(`更新: ${results.updated}問`);
    if (results.errors.length > 0) {
      console.log(`エラー: ${results.errors.length}件`);
      results.errors.forEach(e => console.log(`  - ${e.questionId}: ${e.error}`));
    }
    console.log('====================================\n');
  })
  .catch(error => {
    console.error('インポートエラー:', error);
    process.exit(1);
  });
