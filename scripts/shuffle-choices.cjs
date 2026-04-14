const XLSX = require('xlsx');

const inputPath = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_修正済.xlsx';
const workbook = XLSX.readFile(inputPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 現在の分布を確認
const questions = data.slice(1).filter(r => r[0] && String(r[0]).startsWith('Q'));
console.log('シャッフル前の分布:');
const beforeCount = { A: 0, B: 0, C: 0, D: 0 };
questions.forEach(r => beforeCount[r[10]] = (beforeCount[r[10]] || 0) + 1);
console.log(`A: ${beforeCount.A}, B: ${beforeCount.B}, C: ${beforeCount.C}, D: ${beforeCount.D}\n`);

// 目標分布: 各75問ずつ (300問 / 4 = 75)
const targetCount = { A: 75, B: 75, C: 75, D: 75 };
const currentCount = { A: 0, B: 0, C: 0, D: 0 };

// Fisher-Yates シャッフル
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 各問題をシャッフル
let shuffledCount = 0;
data.forEach((row, i) => {
  if (!row[0] || !String(row[0]).startsWith('Q')) return;

  const currentAnswer = row[10]; // 現在の正解
  const choices = {
    A: row[6],
    B: row[7],
    C: row[8],
    D: row[9]
  };

  // 選択肢を配列に
  const choiceArray = [
    { letter: 'A', text: choices.A, isCorrect: currentAnswer === 'A' },
    { letter: 'B', text: choices.B, isCorrect: currentAnswer === 'B' },
    { letter: 'C', text: choices.C, isCorrect: currentAnswer === 'C' },
    { letter: 'D', text: choices.D, isCorrect: currentAnswer === 'D' }
  ];

  // 正解の選択肢を見つける
  const correctChoice = choiceArray.find(c => c.isCorrect);
  if (!correctChoice) {
    console.log(`警告: ${row[0]} に正解が見つかりません`);
    return;
  }

  // まだ枠がある正解位置を優先的に選ぶ
  const availablePositions = ['A', 'B', 'C', 'D'].filter(
    pos => currentCount[pos] < targetCount[pos]
  );

  // 利用可能な位置からランダムに選ぶ
  let newCorrectPosition;
  if (availablePositions.length > 0) {
    newCorrectPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
  } else {
    // 全部埋まっている場合はランダム
    newCorrectPosition = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
  }

  currentCount[newCorrectPosition]++;

  // 正解以外の選択肢
  const incorrectChoices = choiceArray.filter(c => !c.isCorrect);
  const shuffledIncorrect = shuffle(incorrectChoices);

  // 新しい配置を作成
  const positions = ['A', 'B', 'C', 'D'];
  const newChoices = {};
  let incorrectIndex = 0;

  for (const pos of positions) {
    if (pos === newCorrectPosition) {
      newChoices[pos] = correctChoice.text;
    } else {
      newChoices[pos] = shuffledIncorrect[incorrectIndex].text;
      incorrectIndex++;
    }
  }

  // データを更新
  row[6] = newChoices.A;
  row[7] = newChoices.B;
  row[8] = newChoices.C;
  row[9] = newChoices.D;
  row[10] = newCorrectPosition;

  shuffledCount++;
});

console.log(`シャッフル完了: ${shuffledCount}問\n`);

// 新しい分布を確認
console.log('シャッフル後の分布:');
console.log(`A: ${currentCount.A}, B: ${currentCount.B}, C: ${currentCount.C}, D: ${currentCount.D}`);

// 保存
const newSheet = XLSX.utils.aoa_to_sheet(data);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newSheet, workbook.SheetNames[0]);

const outputPath = '/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx';
XLSX.writeFile(newWorkbook, outputPath);
console.log(`\n保存先: ${outputPath}`);
