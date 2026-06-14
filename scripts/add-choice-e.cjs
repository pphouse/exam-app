// 全194問に選択肢Eを追加して5択にする
// 出力: questions-5choice.json

const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = 'gpt-oss-120b';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

// 改善済み問題を統合（改善済みがあればそれを優先、なければ元の問題を使用）
const all310 = JSON.parse(fs.readFileSync(`${DIR}/all310.json`, 'utf8'));
const r147 = JSON.parse(fs.readFileSync(`${DIR}/rewritten147.json`, 'utf8'));
const v3 = JSON.parse(fs.readFileSync(`${DIR}/rewritten47v3.json`, 'utf8'));
const ch3p2 = JSON.parse(fs.readFileSync(`${DIR}/ch3-rewritten-pass2.json`, 'utf8'));
const ch3map = Object.fromEntries(ch3p2.filter(q=>!q.rewrite_error).map(q=>[q.qid,q]));
const r147map = Object.fromEntries(r147.map(q=>[q.qid,q]));
const v3map = Object.fromEntries(v3.map(q=>[q.qid,q]));
// all310の各問について: ch3p2 > r147 > v3 > 元問題 の優先順
const questions = all310.map(orig => {
  const qid = orig.qid;
  return ch3map[qid] || r147map[qid] || v3map[qid] || orig;
});
console.log(`全310問: 改善済み=${Object.keys(ch3map).length+Object.keys(r147map).length+Object.keys(v3map).length}、元問題使用=${all310.filter(q=>!ch3map[q.qid]&&!r147map[q.qid]&&!v3map[q.qid]).length}`);

let existing = {};
try {
  const prev = JSON.parse(fs.readFileSync(`${DIR}/questions-5choice.json`, 'utf8'));
  prev.forEach(q => { if (q.choices.E) existing[q.qid] = q; });
  console.log(`既存: ${Object.keys(existing).length}問`);
} catch(e) {}

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題作成専門家です。
与えられた4択問題に、5択目の選択肢Eを1つ追加してください。

【Eの条件】
- 完全な誤りではなく「一理あるが最も適切ではない」グレーゾーンの選択肢
- 既存のA〜Dと類似した文体・長さ
- 既存の誤り選択肢と重複しない新しい切り口
- Haikuレベルのモデルが「これかも」と迷うような内容

【出力形式（JSONのみ）】
{"choice_e": "〜という観点から、〜が最も重要である", "why_wrong_e": "〜という点で最も適切ではない"}`;

function buildPrompt(q) {
  return `以下の問題にEを追加してください。

QID: ${q.qid} / ${q.chapter} / ${q.keyword||''}
問題文: ${q.question_text}
A. ${q.choices.A}
B. ${q.choices.B}
C. ${q.choices.C}
D. ${q.choices.D}
正解: ${q.correct}`;
}

async function addE(q) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: 600, temperature: 0.7,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: buildPrompt(q) }],
    }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON: ' + text.slice(0, 60));
  const parsed = JSON.parse(m[0]);
  return { ...q, choices: { ...q.choices, E: parsed.choice_e }, why_wrong_e: parsed.why_wrong_e };
}

async function addERetry(q, tries=5) {
  for (let i=0; i<tries; i++) {
    try { return await addE(q); }
    catch(e) {
      const wait = e.message==='RATELIMIT' ? 15000*(i+1) : 3000*(i+1);
      if (i===tries-1) return { ...q, add_e_error: e.message };
      await new Promise(r=>setTimeout(r,wait));
    }
  }
}

(async () => {
  if (!CEREBRAS_KEY) { console.error('NO KEY'); process.exit(1); }
  const todo = questions.filter(q => !existing[q.qid]);
  console.log(`5択化対象: ${todo.length}問`);
  const results = { ...existing };
  for (let i=0; i<todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await addERetry(q);
    results[r.qid] = r;
    console.log(r.add_e_error ? ' ERROR' : ' OK');
    const sorted = questions.map(orig => results[orig.qid] || orig);
    fs.writeFileSync(`${DIR}/questions-5choice.json`, JSON.stringify(sorted, null, 2));
    if (i < todo.length-1) await new Promise(r=>setTimeout(r, 3000));
  }
  const ok = Object.values(results).filter(r=>!r.add_e_error).length;
  console.log(`\n完了: ${ok}/${questions.length}問`);
})();
