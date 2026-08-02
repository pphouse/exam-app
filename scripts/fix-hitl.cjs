// Opusが迷った human-in-the-loop 系3問(Q2-005/006/045)を一意解化する。
// 原因: 正解肢とOpus選択肢の両方が「確認・修正を経る」適切な行為で甲乙つけがたい。
// 対応: ダミー側(Opusが選んだ肢)から"確認"要素を外し、明確に不適切な行為に変更。
// 正解letterは変更しない(C/A/A)。本文とwhy_wrongのみ更新。
const fs = require('fs');
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const FILE = `${DIR}/questions-v3.json`;
const q = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const by = Object.fromEntries(q.map(x => [x.qid, x]));

const patches = {
  // 正解C。ダミーA(説明文書を確認して補足修正=正しい)→確認せず配布する不適切行為へ
  'Q2-005': {
    correctLetter: 'C',
    choices: {
      A: 'AIが生成した患者向け説明文書を、内容を確認せずそのまま患者に手渡す',
    },
    why_wrong: {
      A: 'AI生成文書は誤りを含みうるため、看護師が内容を確認・修正せずそのまま患者に渡すのは不適切である。',
    },
  },
  // 正解A。ダミーC(統合分析+最終確認を経て提案=正しい)→確認を経ず患者へ直接提供する不適切行為へ
  'Q2-006': {
    correctLetter: 'A',
    choices: {
      C: 'AIが患者の服薬履歴や検査値データを分析し、薬剤師の確認を経ずに個別の服薬指導を患者へ直接提供する',
    },
    why_wrong: {
      C: '服薬指導は薬剤師の責任下で行うべきであり、薬剤師の確認を経ずにAIが患者へ直接指導するのは適切でない。',
    },
  },
  // 正解A。ダミーC(草案に非言語反応を追記=正しい)→草案を確認せず追記だけして記録化する不適切行為へ
  'Q2-045': {
    correctLetter: 'A',
    choices: {
      C: 'AIが作成した記録草案を療法士が確認しないまま、患者の訴えの追記だけ行って正式な記録とする',
    },
    why_wrong: {
      C: 'AI草案の本文を確認・修正しないまま記録とするのは正確性が担保されず、追記を行っても不適切である。',
    },
  },
};

for (const [qid, p] of Object.entries(patches)) {
  const v = by[qid];
  if (!v) throw new Error('not found ' + qid);
  // 変更対象が正解letterでないことを保証(ダミーのみ変更)
  for (const L of Object.keys(p.choices)) {
    if (v.correct_answers.includes(L)) throw new Error(`${qid} ${L} は正解。中止`);
    v.choices[L] = p.choices[L];
  }
  Object.assign(v.why_wrong, p.why_wrong);
  v._hitl_fixed = true;
}

fs.writeFileSync(FILE, JSON.stringify(q, null, 2));
console.log('human-in-the-loop 3問を一意解化:');
for (const [qid, p] of Object.entries(patches)) {
  for (const L of Object.keys(p.choices)) {
    console.log(`  ${qid} ${L}: ${by[qid].choices[L]}`);
  }
}
