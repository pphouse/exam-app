// 第1-2章の問題を「全て選べ」形式に変換（5択中2-3個が正解）
// questions-5choice.json が完成してから実行
// 出力: questions-multi.json

const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = 'gpt-oss-120b';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

const all5choice = JSON.parse(fs.readFileSync(`${DIR}/questions-5choice.json`, 'utf8'));
// 第1-2章を全て選べ対象に
const questions = all5choice.filter(q => ['第1章','第2章'].includes(q.chapter) && !q.add_e_error);
console.log(`全て選べ変換対象: ${questions.length}問（${[...new Set(questions.map(q=>q.chapter))].join('、')}）`);

let existing = {};
try {
  const prev = JSON.parse(fs.readFileSync(`${DIR}/questions-multi.json`, 'utf8'));
  prev.forEach(q => { if (q.correct_answers) existing[q.qid] = q; });
  console.log(`既存: ${Object.keys(existing).length}問`);
} catch(e) {}

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題作成専門家です。
与えられた5択問題（A〜E）を「正しいものを全て選べ」形式に変換してください。

【目標】
- 正解を2〜3個にする
- 残り2〜3個は「部分的に正しいが完全には正しくない」グレーゾーンにする
- テキストを読んだ人が正解を特定でき、読んでいない人は迷う

【具体的に】
- 既存の5択をそのまま使っても良いし、選択肢の文言を調整しても良い
- 正解が2個なら「A と C が正解」のように明確に設定
- 問題文を「次のうち正しいものを全て選べ」に変更

【出力形式（JSONのみ）】
{
  "qid": "元のQID",
  "question_text": "次のうち〜として正しいものを全て選べ。",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
  "correct_answers": ["A", "C"],
  "explanation": "A・Cが正解の理由（1〜2文）",
  "why_wrong": {"B": "〜という点で完全には正しくない", "D": "...", "E": "..."}
}`;

function buildPrompt(q) {
  return `以下の5択問題を「全て選べ」形式に変換してください。

QID: ${q.qid} / ${q.chapter} / ${q.keyword||''}
問題文: ${q.question_text}
A. ${q.choices.A}
B. ${q.choices.B}
C. ${q.choices.C}
D. ${q.choices.D}
E. ${q.choices.E}
現在の正解: ${q.correct}`;
}

async function convert(q) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, temperature: 0.7, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: buildPrompt(q) }] }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON');
  const parsed = JSON.parse(m[0]);
  return { ...q, ...parsed, question_type: 'multi' };
}

async function convertRetry(q, tries=5) {
  for (let i=0; i<tries; i++) {
    try { return await convert(q); }
    catch(e) {
      const wait = e.message==='RATELIMIT' ? 15000*(i+1) : 3000*(i+1);
      if (i===tries-1) return { ...q, convert_error: e.message };
      await new Promise(r=>setTimeout(r,wait));
    }
  }
}

(async () => {
  if (!CEREBRAS_KEY) { console.error('NO KEY'); process.exit(1); }
  const todo = questions.filter(q => !existing[q.qid]);
  console.log(`変換対象: ${todo.length}問`);
  const results = { ...existing };
  for (let i=0; i<todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await convertRetry(q);
    results[r.qid] = r;
    console.log(r.convert_error ? ' ERROR' : ` OK (正解: ${r.correct_answers?.join(',')||'?'})`);
    const sorted = questions.map(orig => results[orig.qid] || orig);
    fs.writeFileSync(`${DIR}/questions-multi.json`, JSON.stringify(sorted, null, 2));
    if (i < todo.length-1) await new Promise(r=>setTimeout(r, 4000));
  }
  const ok = Object.values(results).filter(r=>!r.convert_error).length;
  console.log(`\n完了: ${ok}/${questions.length}問`);
})();
