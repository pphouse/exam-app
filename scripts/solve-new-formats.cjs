// 5択 + 全て選べ問題をHaikuで採点
// 5択: A〜Eの1文字 / 全て選べ: "A,C" のようなカンマ区切り
const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = process.env.MODEL || 'gpt-oss-120b';
const TRIALS = 2;
const CONCURRENCY = 6;
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

// 5択（全310問）を読み込む
const all5 = JSON.parse(fs.readFileSync(`${DIR}/questions-5choice.json`, 'utf8'));
// 全て選べ（第1-2章 + 第4-7章）を読み込む
let multiMap = {};
try {
  const multi12 = JSON.parse(fs.readFileSync(`${DIR}/questions-multi.json`, 'utf8'));
  multi12.filter(q=>!q.convert_error && q.correct_answers).forEach(q=>(multiMap[q.qid]=q));
} catch(e) {}
try {
  const multi47 = JSON.parse(fs.readFileSync(`${DIR}/questions-multi-ch4-7.json`, 'utf8'));
  multi47.filter(q=>!q.convert_error && q.correct_answers).forEach(q=>(multiMap[q.qid]=q));
} catch(e) {}

// 全て選べ問題はmultiMapのものを優先
const questions = all5.map(q => multiMap[q.qid] || q).filter(q=>!q.add_e_error);
const multiCount = questions.filter(q=>q.question_type==='multi').length;
const singleCount = questions.length - multiCount;
console.log(`対象: ${questions.length}問 (5択単一: ${singleCount}, 全て選べ: ${multiCount}) | ${MODEL}`);

const SYSTEM_SINGLE = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って五択問題に答えてください。出力は A B C D E のいずれか1文字だけ。それ以外の文字は一切出力しないこと。`;

const SYSTEM_MULTI = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って問題に答えてください。正しいと思う選択肢を全て選び、アルファベットをカンマ区切りで出力してください（例: A,C または A,B,D）。それ以外の文字は一切出力しないこと。`;

function buildPrompt(q) {
  const opts = `A. ${q.choices.A}\nB. ${q.choices.B}\nC. ${q.choices.C}\nD. ${q.choices.D}\nE. ${q.choices.E}`;
  if (q.question_type === 'multi') {
    return `問題: ${q.question_text}\n${opts}\n\n正しいものを全て選んでください（例: A,C）:`;
  }
  return `問題: ${q.question_text}\n${opts}\n\n答え(1文字):`;
}

function parseAnswer(text, isMulti) {
  const upper = text.toUpperCase();
  if (isMulti) {
    const letters = upper.match(/[ABCDE]/g);
    if (!letters) return '?';
    return [...new Set(letters)].sort().join(',');
  }
  const m = upper.match(/[ABCDE]/);
  return m ? m[0] : '?';
}

function isCorrect(answer, q) {
  if (q.question_type === 'multi') {
    const expected = [...q.correct_answers].sort().join(',');
    return answer === expected;
  }
  return answer === q.correct;
}

async function askOnce(q) {
  const isMulti = q.question_type === 'multi';
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: 512, temperature: 0.3,
      messages: [
        { role: 'system', content: isMulti ? SYSTEM_MULTI : SYSTEM_SINGLE },
        { role: 'user', content: buildPrompt(q) },
      ],
    }),
  });
  if (res.status === 429 || res.status >= 500) throw new Error('retry');
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  return parseAnswer(data.choices?.[0]?.message?.content || '', isMulti);
}

async function askRetry(q, tries=5) {
  for (let i=0; i<tries; i++) {
    try { return await askOnce(q); }
    catch(e) { if (i===tries-1) return '!'; await new Promise(r=>setTimeout(r, 800*(i+1))); }
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
  questions.forEach(q=>(per[q.qid]={chapter:q.chapter,type:q.question_type||'single',c:0,a:[]}));
  ans.forEach((a,i)=>{ const q=meta[i]; per[q.qid].a.push(a); if(isCorrect(a,q)) per[q.qid].c++; });
  const results=questions.map(q=>({
    qid:q.qid, chapter:q.chapter, type:q.question_type||'single',
    correct:q.correct_answers||q.correct,
    correctCount:per[q.qid].c, trials:TRIALS,
    accuracy:Math.round((per[q.qid].c/TRIALS)*100),
    answers:per[q.qid].a.join('|'),
  }));

  const modelTag = MODEL.includes('haiku')?'haiku':MODEL.includes('sonnet')?'sonnet':'opus';
  fs.writeFileSync(`${DIR}/solve-newformat-${modelTag}.json`, JSON.stringify(results, null, 2));

  const total=results.reduce((s,r)=>s+r.correctCount,0);
  console.log(`\n[${MODEL}] OVERALL=${Math.round(total/(results.length*TRIALS)*100)}% (${total}/${results.length*TRIALS})`);

  // 形式別
  const single=results.filter(r=>r.type==='single');
  const multi=results.filter(r=>r.type==='multi');
  if (single.length) {
    const sc=single.reduce((s,r)=>s+r.correctCount,0);
    console.log(` 5択単一(${single.length}問): ${Math.round(sc/(single.length*TRIALS)*100)}%`);
  }
  if (multi.length) {
    const mc=multi.reduce((s,r)=>s+r.correctCount,0);
    console.log(` 全て選べ(${multi.length}問): ${Math.round(mc/(multi.length*TRIALS)*100)}%`);
  }

  // 章別
  const byChap={};
  results.forEach(r=>{ if(!byChap[r.chapter]) byChap[r.chapter]={c:0,t:0}; byChap[r.chapter].c+=r.correctCount; byChap[r.chapter].t+=TRIALS; });
  Object.entries(byChap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([ch,d])=>
    console.log(` ${ch}: ${Math.round(d.c/d.t*100)}%`)
  );
})();
