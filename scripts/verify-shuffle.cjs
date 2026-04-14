const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/naoto/一般社団法人/問題作成/医療生成AIパスポート_問題プール_v1_シャッフル済.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 最初の5問を確認
console.log('=== シャッフル後の検証 ===\n');
let count = 0;
for (const row of data.slice(1)) {
  if (!row[0] || !String(row[0]).startsWith('Q')) continue;
  if (count >= 5) break;

  console.log('【' + row[0] + '】');
  console.log('問題: ' + (row[5] || '').substring(0, 60) + '...');
  console.log('A: ' + (row[6] || '').substring(0, 40));
  console.log('B: ' + (row[7] || '').substring(0, 40));
  console.log('C: ' + (row[8] || '').substring(0, 40));
  console.log('D: ' + (row[9] || '').substring(0, 40));
  console.log('正解: ' + row[10]);
  console.log('解説: ' + (row[11] || '').substring(0, 100) + '...');
  console.log('');
  count++;
}
