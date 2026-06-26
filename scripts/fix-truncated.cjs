// fix-bias の短縮処理で途中で切れた選択肢4件を、元の意図どおり完全な文に復元する。
// いずれも誤答ダミー（正解は別）なので正解・解説は変えない。本文のみ修正。
const fs = require('fs');
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const FILE = `${DIR}/questions-v3.json`;
const q = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const by = Object.fromEntries(q.map(x => [x.qid, x]));

const fixes = {
  'Q2-046': { A: 'プラットフォームの医療情報をAIが学習することで、診断精度の向上が自動的に保証される' },
  'Q1-033': { D: '自施設の診療科に特化したドメイン固有データのみを優先的に選定して用いる' },
  'Q2-031': { D: '患者の検査結果や入院期間の統計を可視化し、医療の質を管理者に報告する通知' },
  'Q3-033': { D: '患者の同意取得を行えば、提供先の法制度や体制の確認は二次的な対応で差し支えない' },
};

for (const [qid, ch] of Object.entries(fixes)) {
  const v = by[qid];
  if (!v) throw new Error('not found ' + qid);
  for (const [L, text] of Object.entries(ch)) {
    // 復元対象は正解選択肢でないことを保証（ダミーのみ修正）
    if (v.correct_answers.includes(L)) throw new Error(`${qid} ${L} は正解。中止`);
    v.choices[L] = text;
  }
  v._trunc_fixed = true;
}

fs.writeFileSync(FILE, JSON.stringify(q, null, 2));
console.log('途中切れ4件を復元:');
for (const [qid, ch] of Object.entries(fixes)) {
  for (const L of Object.keys(ch)) {
    const t = by[qid].choices[L];
    console.log(`  ${qid} ${L} [${t.length}字]: ${t}`);
  }
}
