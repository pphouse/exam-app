// questions-v2.json を OpenRouter の小型モデルで採点
// 5択単一: A〜Eの1文字 / 2つ選べ: ちょうど2つ(個数明示)
// 出力: solve-v2-<tag>.json

const fs = require('fs');
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const LETTERS = ['A','B','C','D','E'];

// .envからキー取得
const envText = fs.readFileSync('/Users/naoto/一般社団法人/問題作成/exam-app/.env','utf8');
const KEY = (envText.match(/^OPEN_ROUTER_API_KEY=(.+)$/m) ? envText.match(/OPEN_ROUTER_API_KEY=(.+)/g).pop().split('=').slice(1).join('=') : '').replace(/["' ]/g,'').trim();
if (!KEY) { console.error('OPEN_ROUTER_API_KEY が .env にありません'); process.exit(1); }

const MODEL = process.env.SOLVE_MODEL || 'meta-llama/llama-3.1-8b-instruct';
const TAG = process.env.OUTTAG || MODEL.split('/').pop().replace(/[^a-z0-9.]+/gi,'-');
const TRIALS = 2;
const CONCURRENCY = 6;
const OUT = `${DIR}/solve-v2-${TAG}.json`;

const questions = JSON.parse(fs.readFileSync(`${DIR}/questions-v2.json`, 'utf8'))
  .filter(q => !q._conv_error && !q.gen_error);
const nMulti = questions.filter(q=>q.question_type==='multi').length;
console.log(`対象: ${questions.length}問 (5択単一: ${questions.length-nMulti}, 2つ選べ: ${nMulti}) | ${MODEL}`);

const SYS_SINGLE = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って五択問題に答えてください。出力は A B C D E のいずれか1文字だけ。それ以外は一切出力しないこと。`;
const SYS_MULTI = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って問題に答えてください。正しい選択肢を「ちょうど2つ」選び、アルファベットをカンマ区切りで出力（例: A,C）。必ず2つ。それ以外は一切出力しないこと。`;

function buildPrompt(q) {
  const opts = LETTERS.map(L => `${L}. ${q.choices[L]}`).join('\n');
  const isMulti = q.question_type === 'multi';
  const ask = isMulti ? '正しいものをちょうど2つ選んでください（例: A,C）:' : '答え(1文字):';
  return `問題: ${q.question_text}\n${opts}\n\n${ask}`;
}

function parseAnswer(text, isMulti) {
  const upper = (text||'').toUpperCase();
  if (isMulti) {
    const letters = upper.match(/[ABCDE]/g);
    if (!letters) return '?';
    return [...new Set(letters)].sort().join(',');
  }
  const m = upper.match(/[ABCDE]/);
  return m ? m[0] : '?';
}

function isCorrect(answer, q) {
  return answer === [...q.correct_answers].sort().join(',');
}

async function askOnce(q) {
  const isMulti = q.question_type === 'multi';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type':'application/json', 'Authorization':`Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, max_tokens: 20, temperature: 0.3,
      messages: [{ role:'system', content: isMulti?SYS_MULTI:SYS_SINGLE }, { role:'user', content: buildPrompt(q) }] }),
  });
  if (res.status === 429 || res.status >= 500) throw new Error('retry');
  if (!res.ok) throw new Error('API '+res.status);
  const data = await res.json();
  return parseAnswer(data.choices?.[0]?.message?.content || '', isMulti);
}

async function askRetry(q, tries=5) {
  for (let i=0;i<tries;i++){
    try { return await askOnce(q); }
    catch(e){ if(i===tries-1) return '!'; await new Promise(r=>setTimeout(r,800*(i+1))); }
  }
}

async function runPool(tasks, conc) {
  const out=new Array(tasks.length); let idx=0;
  async function w(){ while(idx<tasks.length){ const i=idx++; out[i]=await tasks[i](); } }
  await Promise.all(Array.from({length:conc},w)); return out;
}

(async()=>{
  const tasks=[]; const meta=[];
  for (const q of questions) for (let t=0;t<TRIALS;t++){ tasks.push(()=>askRetry(q)); meta.push(q); }
  const ans = await runPool(tasks, CONCURRENCY);
  const per={};
  questions.forEach(q=>per[q.qid]={chapter:q.chapter,type:q.question_type,c:0,a:[]});
  ans.forEach((a,i)=>{ const q=meta[i]; per[q.qid].a.push(a); if(isCorrect(a,q))per[q.qid].c++; });
  const results=questions.map(q=>({
    qid:q.qid, chapter:q.chapter, type:q.question_type,
    correct:q.correct_answers.join(','), correctCount:per[q.qid].c, trials:TRIALS,
    accuracy:Math.round(per[q.qid].c/TRIALS*100), answers:per[q.qid].a.join('|'),
  }));
  fs.writeFileSync(OUT, JSON.stringify(results,null,2));

  const tot=results.reduce((s,r)=>s+r.correctCount,0), tr=results.length*TRIALS;
  console.log(`\n[${MODEL}] OVERALL=${Math.round(tot/tr*100)}% (${tot}/${tr})`);
  const single=results.filter(r=>r.type==='single'), multi=results.filter(r=>r.type==='multi');
  console.log(` 5択単一(${single.length}問): ${Math.round(single.reduce((s,r)=>s+r.correctCount,0)/(single.length*TRIALS)*100)}%`);
  if(multi.length)console.log(` 2つ選べ(${multi.length}問): ${Math.round(multi.reduce((s,r)=>s+r.correctCount,0)/(multi.length*TRIALS)*100)}%`);
  const byCh={};
  results.forEach(r=>{(byCh[r.chapter]=byCh[r.chapter]||{c:0,t:0}).c+=r.correctCount;byCh[r.chapter].t+=TRIALS;});
  Object.entries(byCh).sort().forEach(([c,d])=>console.log(` ${c}: ${Math.round(d.c/d.t*100)}%`));

  const bang=results.reduce((s,r)=>s+(r.answers.split('|').filter(x=>x==='!').length),0);
  if(bang)console.log(`\n⚠ API取得失敗(!): ${bang}回`);
})();
