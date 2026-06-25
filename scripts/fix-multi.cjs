// 全multi問題の適性をLLMで判定し振り分け。
// - multi適性あり: 主語を復元し正解を再設定して multi 維持
// - multi不適: 5択単一に戻す(主語復元・Eは妥当な誤答に)
// 入力: questions-final.json + all310.json(元問題)
// 出力: questions-fixed.json

const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = 'gpt-oss-120b';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const OUT = `${DIR}/questions-fixed.json`;
const LETTERS = ['A','B','C','D','E'];

const fin = JSON.parse(fs.readFileSync(`${DIR}/questions-final.json`, 'utf8'));
const origMap = {};
JSON.parse(fs.readFileSync(`${DIR}/all310.json`, 'utf8')).forEach(q => origMap[q.qid] = q);

const targets = fin.filter(q => q.question_type === 'multi');
console.log(`判定対象(multi): ${targets.length}問 / single ${fin.length - targets.length}問はそのまま`);

let done = {};
try {
  JSON.parse(fs.readFileSync(OUT, 'utf8')).forEach(q => { if (q._fixed) done[q.qid] = q; });
  console.log(`既存処理済み: ${Object.keys(done).length}問`);
} catch(e) {}

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題校正者です。
ある5択問題が「正しいものを全て選べ（複数正解）」形式に機械変換されましたが、
変換時に問題文の主語が失われたり、本来1つしか正解がない問題に不自然な2つ目の正解が足されている欠陥が多発しています。

【あなたの仕事】
元問題（単一正解）と変換後（複数正解）を見比べ、その問題が「全て選べ」形式に本当に適しているか判定し、適切な最終形を出力する。

【判定基準】
- multi適性「あり」: 選択肢のうち2つ以上が、明確な主語をもつ問いに対して "独立に・同時に" 正しい answer になり得る場合のみ。
  例: 「生成AIのリスクとして正しいものを全て選べ」→ 複数のリスクが各々正しい。
- multi適性「なし」: 選択肢A〜Eがそれぞれ別概念の説明で、問いの主語に当てはまる正解が本質的に1つだけの場合。
  例: 「教師あり学習の説明として正しいものは」→ 教師あり=1つだけ正しく、他は別手法の説明。これはsingleに戻す。

【出力ルール】
- multi適性ありの場合: question_type="multi"。問題文に主語（何について問うているか）を必ず含め、自然な「〜として正しいものを全て選べ。」にする。correct_answers は本当に正しい選択肢のみ(2個以上)。
- multi適性なしの場合: question_type="single"。元問題の主旨を尊重した自然な問題文(「最も適切なものはどれか。」等)に戻す。correct は1つ。5択は維持し、Eは「一理あるが最適でない」誤答として妥当な文言にする(正解化しない)。
- いずれも choices は5択(A〜E)を維持。explanation と why_wrong(非正解の全選択肢)を作成。

【出力(JSONのみ。他の文字を一切出力しない)】
{
  "question_type": "multi" または "single",
  "question_text": "...",
  "choices": {"A":"...","B":"...","C":"...","D":"...","E":"..."},
  "correct_answers": ["..."],
  "explanation": "...",
  "why_wrong": {"X":"...", ...}
}`;

function buildPrompt(q) {
  const o = origMap[q.qid];
  const origOpts = Object.entries(o.choices).map(([k,v])=>`${k}. ${v}`).join('\n');
  const curOpts = LETTERS.map(L=>`${L}. ${q.choices[L]}`).join('\n');
  return `QID: ${q.qid} / ${q.chapter}

【元問題(単一正解)】
${o.question_text}
${origOpts}
元の正解: ${o.correct}

【機械変換後(複数正解・要検証)】
${q.question_text}
${curOpts}
変換後の正解: ${q.correct_answers.join(', ')}

この問題を判定し、最終形を出力してください。`;
}

async function fix(q) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
    body: JSON.stringify({ model: MODEL, max_tokens: 1800, temperature: 0.3,
      messages: [{ role:'system', content: SYSTEM }, { role:'user', content: buildPrompt(q) }] }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON');
  const p = JSON.parse(m[0]);
  if (!['multi','single'].includes(p.question_type)) throw new Error('bad type');
  if (!Array.isArray(p.correct_answers) || p.correct_answers.length < 1) throw new Error('bad correct');
  if (p.question_type==='single' && p.correct_answers.length!==1) throw new Error('single needs 1');
  if (p.question_type==='multi' && p.correct_answers.length<2) throw new Error('multi needs 2+');
  for (const L of p.correct_answers) if (!LETTERS.includes(L)) throw new Error('bad letter');
  if (!p.choices || LETTERS.some(L=>!p.choices[L])) throw new Error('choices incomplete');
  if (!p.explanation || !p.why_wrong) throw new Error('missing expl');
  const wrong = LETTERS.filter(L=>!p.correct_answers.includes(L));
  for (const L of wrong) if (!p.why_wrong[L]) throw new Error('why_wrong missing '+L);
  const why = {}; wrong.forEach(L=>why[L]=p.why_wrong[L]);
  return {
    qid: q.qid, chapter: q.chapter, keyword: q.keyword||'',
    question_type: p.question_type,
    question_text: p.question_text.trim(),
    choices: p.choices,
    correct_answers: [...p.correct_answers].sort(),
    explanation: p.explanation.trim(),
    why_wrong: why,
    _fixed: true,
  };
}

async function fixRetry(q, tries=5) {
  for (let i=0;i<tries;i++){
    try { return await fix(q); }
    catch(e){ const w=e.message==='RATELIMIT'?15000*(i+1):2500*(i+1); if(i===tries-1) return {...q,_fixed:true,_fix_error:e.message}; await new Promise(r=>setTimeout(r,w)); }
  }
}

(async()=>{
  const todo = targets.filter(q=>!done[q.qid]);
  console.log(`処理対象: ${todo.length}問`);
  const results = { ...done };
  let toMulti=0, toSingle=0, err=0;
  Object.values(done).forEach(r=>{ if(r._fix_error)err++; else if(r.question_type==='multi')toMulti++; else toSingle++; });
  for (let i=0;i<todo.length;i++){
    const q=todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r=await fixRetry(q);
    results[r.qid]=r;
    if(r._fix_error){err++;console.log(' ERROR '+r._fix_error);}
    else if(r.question_type==='multi'){toMulti++;console.log(' multi維持 ('+r.correct_answers.join(',')+')');}
    else {toSingle++;console.log(' →single ('+r.correct_answers[0]+')');}
    const out=fin.map(b=> results[b.qid] || b);
    fs.writeFileSync(OUT, JSON.stringify(out,null,2));
    if(i<todo.length-1) await new Promise(r=>setTimeout(r,2500));
  }
  console.log(`\n完了: multi維持 ${toMulti} / single化 ${toSingle} / エラー ${err}`);
})();
