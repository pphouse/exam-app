// 新形式: 90%を5択単一、10%を「2つ選べ」(正解ちょうど2個・個数明示)に。
// 「全て選べ」(個数非公開)は廃止。
// 入力: questions-fixed.json + all310.json
// 出力: questions-v2.json

const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = 'gpt-oss-120b';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const OUT = `${DIR}/questions-v2.json`;
const LETTERS = ['A','B','C','D','E'];

const fixed = JSON.parse(fs.readFileSync(`${DIR}/questions-fixed.json`, 'utf8')).filter(q=>!q._fix_error);
const origMap = {};
JSON.parse(fs.readFileSync(`${DIR}/all310.json`, 'utf8')).forEach(q => origMap[q.qid] = q);

// --- 「2つ選べ」に採用する31問を章配点比で選抜 ---
const exactly2 = fixed.filter(q => q.question_type === 'multi' && q.correct_answers.length === 2);
const pick = { '第1章':6, '第2章':7, '第4章':7, '第5章':6, '第6章':4, '第7章':1 };
const keep2 = new Set();
Object.entries(pick).forEach(([ch, n]) => {
  exactly2.filter(q => q.chapter === ch).slice(0, n).forEach(q => keep2.add(q.qid));
});
console.log(`「2つ選べ」採用: ${keep2.size}問`);

// --- 単一に戻す対象（multiだがkeep2でない） ---
const toSingle = fixed.filter(q => q.question_type === 'multi' && !keep2.has(q.qid));
console.log(`5択単一に戻す: ${toSingle.length}問 / そのままsingle: ${fixed.filter(q=>q.question_type!=='multi').length}問`);

// 問題文を「2つ選べ」に変換
function to2Text(t) {
  let s = t.replace(/(全て|すべて)選べ/g, '2つ選べ');
  if (!/2つ選べ/.test(s)) s = s.replace(/。?\s*$/, '。次のうち適切なものを2つ選べ。');
  return s;
}

// --- LLMで単一に戻す ---
const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題校正者です。
複数正解だった問題を「最も適切なものを1つ選ぶ」5択単一問題に戻します。
元問題（単一正解）を尊重し、5つの選択肢のうち最も適切な1つだけを正解にしてください。

【出力(JSONのみ、他の文字は一切出力しない)】
{
  "question_text": "〜として最も適切なものはどれか。",
  "choices": {"A":"...","B":"...","C":"...","D":"...","E":"..."},
  "correct": "X",
  "explanation": "正解Xの根拠(2〜3文)",
  "why_wrong": {"他4文字": "不正解の理由", ...}
}`;

function buildPrompt(q) {
  const o = origMap[q.qid];
  const origOpts = o ? Object.entries(o.choices).map(([k,v])=>`${k}. ${v}`).join('\n') : '(なし)';
  const curOpts = LETTERS.map(L=>`${L}. ${q.choices[L]}`).join('\n');
  return `QID: ${q.qid} / ${q.chapter}

【元問題(単一正解・これが正答の基準)】
${o ? o.question_text : ''}
${origOpts}
元の正解: ${o ? o.correct : '?'}

【現在(複数正解・これを単一に戻す)】
${q.question_text}
${curOpts}

5択を維持し、最も適切な1つを正解にして出力してください。`;
}

async function conv(q) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, temperature: 0.3,
      messages: [{ role:'system', content: SYSTEM }, { role:'user', content: buildPrompt(q) }] }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON');
  const p = JSON.parse(m[0]);
  if (!LETTERS.includes(p.correct)) throw new Error('bad correct');
  if (!p.choices || LETTERS.some(L=>!p.choices[L])) throw new Error('choices incomplete');
  if (!p.explanation || !p.why_wrong) throw new Error('missing expl');
  const wrong = LETTERS.filter(L=>L!==p.correct);
  for (const L of wrong) if (!p.why_wrong[L]) throw new Error('why_wrong missing '+L);
  const why = {}; wrong.forEach(L=>why[L]=p.why_wrong[L]);
  return {
    qid: q.qid, chapter: q.chapter, keyword: q.keyword||'',
    question_type: 'single',
    question_text: p.question_text.trim(),
    choices: p.choices,
    correct_answers: [p.correct],
    explanation: p.explanation.trim(),
    why_wrong: why,
  };
}

async function convRetry(q, tries=5) {
  for (let i=0;i<tries;i++){
    try { return await conv(q); }
    catch(e){ const w=e.message==='RATELIMIT'?15000*(i+1):2500*(i+1); if(i===tries-1) return {...q,question_type:'single',_conv_error:e.message}; await new Promise(r=>setTimeout(r,w)); }
  }
}

(async()=>{
  // resume
  let done = {};
  try { JSON.parse(fs.readFileSync(OUT,'utf8')).forEach(q=>{ if(q._v2) done[q.qid]=q; }); } catch(e){}
  const todo = toSingle.filter(q=>!done[q.qid]);
  console.log(`変換対象: ${todo.length}問 (既存 ${Object.keys(done).length})`);

  const convMap = { ...done };
  for (let i=0;i<todo.length;i++){
    const q=todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r=await convRetry(q);
    r._v2=true; convMap[q.qid]=r;
    console.log(r._conv_error?' ERROR '+r._conv_error:' →single ('+r.correct_answers[0]+')');
    // 出力組み立て
    const out = fixed.map(q => {
      if (keep2.has(q.qid)) return { ...q, question_text: to2Text(q.question_text), _v2:true };
      if (convMap[q.qid]) return convMap[q.qid];
      if (q.question_type==='multi') return q; // 未処理のtoSingle
      return { ...q, _v2:true }; // 元からsingle
    });
    fs.writeFileSync(OUT, JSON.stringify(out,null,2));
    if(i<todo.length-1) await new Promise(r=>setTimeout(r,2500));
  }
  // 最終確認
  const out = JSON.parse(fs.readFileSync(OUT,'utf8'));
  const nSingle = out.filter(q=>q.question_type==='single').length;
  const nMulti = out.filter(q=>q.question_type==='multi').length;
  console.log(`\n完了: 5択単一 ${nSingle}問 / 2つ選べ ${nMulti}問`);
})();
