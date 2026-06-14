// 複数モデルで解かせて正解率の勾配を確認
// 使い方: MODEL=claude-sonnet-4-6 node solve-multi-model.cjs
// 対象: rewritten147 + easy47v3 の合計（改善済み問題）
const fs = require('fs');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';
const TRIALS = 2;
const CONCURRENCY = process.env.MODEL?.includes('opus') ? 3 : 6;
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

// 改善済み問題を統合（ch3第2パス > rewritten147 > easy47v3 の優先順）
const r147 = JSON.parse(fs.readFileSync(`${DIR}/rewritten147.json`, 'utf8'));
const v3 = JSON.parse(fs.readFileSync(`${DIR}/rewritten47v3.json`, 'utf8'));

let ch3pass2 = [];
try {
  ch3pass2 = JSON.parse(fs.readFileSync(`${DIR}/ch3-rewritten-pass2.json`, 'utf8'));
} catch(e) { console.log('ch3 pass2 未完了 → rewritten147を使用'); }

const ch3pass2Map = Object.fromEntries(ch3pass2.filter(q=>!q.rewrite_error).map(q=>[q.qid,q]));
const r147map = Object.fromEntries(r147.map(q=>[q.qid,q]));
const v3map = Object.fromEntries(v3.map(q=>[q.qid,q]));

// 全改善済みIDを集める
const allIds = new Set([...Object.keys(ch3pass2Map), ...Object.keys(r147map), ...Object.keys(v3map)]);
const questions = [...allIds].map(qid => ch3pass2Map[qid] || r147map[qid] || v3map[qid]);

console.log(`対象: ${questions.length}問 | モデル: ${MODEL} | ${TRIALS}試行`);

const SYSTEM = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って四択問題に答えてください。出力は A B C D のいずれか1文字だけ。それ以外の文字は一切出力しないこと。`;
function prompt(q) { return `問題: ${q.question_text}\nA. ${q.choices.A}\nB. ${q.choices.B}\nC. ${q.choices.C}\nD. ${q.choices.D}\n\n答え(1文字):`; }

async function askOnce(q) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8, ...(MODEL.includes('opus') ? {} : { temperature: 0.3 }), system: SYSTEM, messages: [{ role: 'user', content: prompt(q) }] }),
  });
  if (res.status === 429 || res.status >= 500) throw new Error('retry');
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  const t = (data.content?.[0]?.text || '').toUpperCase().match(/[ABCD]/);
  return t ? t[0] : '?';
}
async function askRetry(q, tries=5) {
  for (let i=0; i<tries; i++) {
    try { return await askOnce(q); }
    catch(e) { if (i===tries-1) return '!'; await new Promise(r=>setTimeout(r, 1000*(i+1))); }
  }
}
async function runPool(tasks, conc) {
  const out=new Array(tasks.length); let idx=0;
  async function w() { while(idx<tasks.length) { const i=idx++; out[i]=await tasks[i](); } }
  await Promise.all(Array.from({length:conc},w)); return out;
}

(async()=>{
  const tasks=[]; const meta=[];
  for (const q of questions) for (let t=0; t<TRIALS; t++) { tasks.push(()=>askRetry(q)); meta.push(q); }
  const ans = await runPool(tasks, CONCURRENCY);
  const per={};
  questions.forEach(q=>(per[q.qid]={chapter:q.chapter,correct:q.correct,c:0,a:[]}));
  ans.forEach((a,i)=>{ per[meta[i].qid].a.push(a); if(a===meta[i].correct) per[meta[i].qid].c++; });
  const results=questions.map(q=>({
    qid:q.qid, chapter:q.chapter, correct:q.correct,
    correctCount:per[q.qid].c, trials:TRIALS,
    accuracy:Math.round((per[q.qid].c/TRIALS)*100),
  }));

  const modelTag = MODEL.includes('haiku') ? 'haiku' : MODEL.includes('sonnet') ? 'sonnet' : 'opus';
  fs.writeFileSync(`${DIR}/multimodel-${modelTag}.json`, JSON.stringify(results, null, 2));

  const total=results.reduce((s,r)=>s+r.correctCount,0);
  console.log(`\n[${MODEL}] OVERALL=${Math.round(total/(results.length*TRIALS)*100)}% (${total}/${results.length*TRIALS})`);
  const byChap={};
  results.forEach(r=>{ if(!byChap[r.chapter]) byChap[r.chapter]={c:0,t:0}; byChap[r.chapter].c+=r.correctCount; byChap[r.chapter].t+=TRIALS; });
  Object.entries(byChap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([ch,d])=>
    console.log(` ${ch}: ${Math.round(d.c/d.t*100)}%`)
  );
})();
