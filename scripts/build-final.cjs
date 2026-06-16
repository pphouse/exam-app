// 全310問を統一スキーマに統合し、全問の解説(explanation)と
// 全不正解選択肢の説明(why_wrong)をLLMで生成し直す。
// 出力: questions-final.json
//
// 統一スキーマ:
// { qid, chapter, keyword, question_type, question_text,
//   choices{A..E}, correct_answers[], explanation, why_wrong{非正解の全文字} }

const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = 'gpt-oss-120b';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const OUT = `${DIR}/questions-final.json`;
const LETTERS = ['A','B','C','D','E'];

// --- 1. ベース統合（multi優先、無ければ5択単一） ---
const all5 = JSON.parse(fs.readFileSync(`${DIR}/questions-5choice.json`, 'utf8'));
const multiMap = {};
for (const f of ['questions-multi.json','questions-multi-ch4-7.json']) {
  try {
    JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8'))
      .filter(q => !q.convert_error && Array.isArray(q.correct_answers) && q.correct_answers.length >= 2)
      .forEach(q => multiMap[q.qid] = q);
  } catch(e) {}
}

const base = all5.filter(q => !q.add_e_error).map(orig => {
  const m = multiMap[orig.qid];
  if (m) {
    return {
      qid: m.qid, chapter: m.chapter, keyword: m.keyword || orig.keyword || '',
      question_type: 'multi',
      question_text: m.question_text,
      choices: m.choices,
      correct_answers: [...m.correct_answers].sort(),
    };
  }
  return {
    qid: orig.qid, chapter: orig.chapter, keyword: orig.keyword || '',
    question_type: 'single',
    question_text: orig.question_text,
    choices: orig.choices,
    correct_answers: [orig.correct],
  };
});

const nMulti = base.filter(q=>q.question_type==='multi').length;
console.log(`統合: ${base.length}問 (全て選べ: ${nMulti}, 5択単一: ${base.length-nMulti})`);

// --- 2. 既存の生成済みをロード（resume） ---
let done = {};
try {
  JSON.parse(fs.readFileSync(OUT, 'utf8')).forEach(q => {
    if (q.explanation && q.why_wrong) done[q.qid] = q;
  });
  console.log(`既存生成済み: ${Object.keys(done).length}問`);
} catch(e) {}

// --- 3. LLMで解説生成 ---
const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の解説執筆者です。
与えられた問題・選択肢・正解に対して、受験者向けの解説を作成します。

【作成するもの】
1. explanation: なぜ正解（複数の場合は全て）が正しいのかを2〜3文で簡潔・正確に説明
2. why_wrong: 正解以外の各選択肢について、なぜ不正解（または最適でない）のかを1〜2文で説明

【ルール】
- 正解の選択肢には触れず、不正解の選択肢のみ why_wrong に含める
- 医学・法規・AI技術として正確に。曖昧な表現を避ける
- 受験者が納得できる根拠を示す

【出力（JSONのみ、他の文字は一切出力しない）】
{
  "explanation": "正解の根拠（2〜3文）",
  "why_wrong": { "X": "選択肢Xが不正解の理由", ... }
}
why_wrong のキーは正解以外の選択肢の文字のみを含めること。`;

function buildPrompt(q) {
  const opts = LETTERS.map(L => `${L}. ${q.choices[L]}`).join('\n');
  const typeLabel = q.question_type === 'multi' ? '正しいものを全て選ぶ問題' : '最も適切なものを1つ選ぶ問題';
  return `章: ${q.chapter} / キーワード: ${q.keyword}
形式: ${typeLabel}
問題: ${q.question_text}
${opts}
正解: ${q.correct_answers.join(', ')}

正解以外（${LETTERS.filter(L=>!q.correct_answers.includes(L)).join(', ')}）それぞれについて why_wrong を作成してください。`;
}

async function gen(q) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, temperature: 0.4,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: buildPrompt(q) }] }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON');
  const parsed = JSON.parse(m[0]);
  if (!parsed.explanation || !parsed.why_wrong) throw new Error('Missing fields');
  // 不正解選択肢が全て揃っているか検証
  const wrongLetters = LETTERS.filter(L => !q.correct_answers.includes(L));
  for (const L of wrongLetters) {
    if (!parsed.why_wrong[L]) throw new Error('why_wrong incomplete: ' + L);
  }
  // 正解選択肢のキーは除去
  const why = {};
  wrongLetters.forEach(L => why[L] = parsed.why_wrong[L]);
  return { ...q, explanation: parsed.explanation.trim(), why_wrong: why };
}

async function genRetry(q, tries=5) {
  for (let i=0; i<tries; i++) {
    try { return await gen(q); }
    catch(e) {
      const wait = e.message==='RATELIMIT' ? 15000*(i+1) : 2500*(i+1);
      if (i===tries-1) return { ...q, gen_error: e.message };
      await new Promise(r=>setTimeout(r,wait));
    }
  }
}

(async () => {
  const todo = base.filter(q => !done[q.qid]);
  console.log(`生成対象: ${todo.length}問`);
  const results = { ...done };
  let okN = Object.keys(done).length;
  for (let i=0; i<todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await genRetry(q);
    results[r.qid] = r;
    if (!r.gen_error) okN++;
    console.log(r.gen_error ? ` ERROR (${r.gen_error})` : ' OK');
    const sorted = base.map(b => results[b.qid] || b);
    fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2));
    if (i < todo.length-1) await new Promise(r=>setTimeout(r, 2500));
  }
  console.log(`\n完了: ${okN}/${base.length}問`);
})();
