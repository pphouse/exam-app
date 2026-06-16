// questions-final.json を本物のHaiku(claude -p サブスク認証)で採点
// ANTHROPIC_API_KEY は env -u で外して起動するため、サブスク認証が使われる
// 出力: solve-final-haiku.json

const fs = require('fs');
const { execFile } = require('child_process');
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const MODEL = process.env.SOLVE_MODEL || 'claude-haiku-4-5-20251001';
const TRIALS = 2;
const CONCURRENCY = 4;
const MODEL_TAG = MODEL.includes('haiku') ? 'haiku' : MODEL.includes('sonnet') ? 'sonnet' : MODEL.includes('opus') ? 'opus' : 'model';
const OUT = `${DIR}/solve-final-${MODEL_TAG}.json`;
const LETTERS = ['A','B','C','D','E'];

const questions = JSON.parse(fs.readFileSync(`${DIR}/questions-final.json`, 'utf8'))
  .filter(q => !q.gen_error);
const nMulti = questions.filter(q=>q.question_type==='multi').length;
console.log(`対象: ${questions.length}問 (全て選べ: ${nMulti}, 5択単一: ${questions.length-nMulti}) | ${MODEL}`);

const SYS_SINGLE = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って五択問題に答えてください。出力は A B C D E のいずれか1文字だけ。それ以外は一切出力しないこと。`;
const SYS_MULTI = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って問題に答えてください。正しいと思う選択肢を全て選び、アルファベットをカンマ区切りで出力（例: A,C）。それ以外は一切出力しないこと。`;

function buildPrompt(q) {
  const opts = LETTERS.map(L => `${L}. ${q.choices[L]}`).join('\n');
  const sys = q.question_type === 'multi' ? SYS_MULTI : SYS_SINGLE;
  const ask = q.question_type === 'multi'
    ? '正しいものを全て選んでください（例: A,C）:'
    : '答え(1文字):';
  return `${sys}\n\n問題: ${q.question_text}\n${opts}\n\n${ask}`;
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
  const expected = [...q.correct_answers].sort().join(',');
  return answer === expected;
}

// claude -p をサブスク認証(ANTHROPIC_API_KEY無し)で呼ぶ
function callHaiku(prompt) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    execFile('claude', ['-p', '--model', MODEL], { env, timeout: 120000, maxBuffer: 1<<20 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        const out = (stdout||'').trim();
        if (/credit balance is too low/i.test(out)) return reject(new Error('CREDIT'));
        resolve(out);
      }
    ).stdin.end(prompt);
  });
}

async function askOnce(q) {
  const isMulti = q.question_type === 'multi';
  const out = await callHaiku(buildPrompt(q));
  return parseAnswer(out, isMulti);
}

async function askRetry(q, tries=4) {
  for (let i=0; i<tries; i++) {
    try { return await askOnce(q); }
    catch(e) {
      if (e.message === 'CREDIT') { console.error('\n[FATAL] サブスク認証でもCREDIT不足'); process.exit(1); }
      if (i===tries-1) return '!';
      await new Promise(r=>setTimeout(r, 1500*(i+1)));
    }
  }
}

async function runPool(tasks, conc) {
  const out=new Array(tasks.length); let idx=0;
  async function w(){ while(idx<tasks.length){ const i=idx++; out[i]=await tasks[i](); } }
  await Promise.all(Array.from({length:conc},w)); return out;
}

(async()=>{
  // resume
  let prev = {};
  try { JSON.parse(fs.readFileSync(OUT,'utf8')).forEach(r=>prev[r.qid]=r); } catch(e){}
  const todo = questions.filter(q=>!prev[q.qid]);
  console.log(`採点対象: ${todo.length}問 (既存 ${Object.keys(prev).length})`);

  const tasks=[]; const meta=[];
  for (const q of todo) for (let t=0;t<TRIALS;t++){ tasks.push(()=>askRetry(q)); meta.push(q); }

  // 進捗保存しながら
  const per={};
  todo.forEach(q=>per[q.qid]={c:0,a:[]});
  let completed=0;
  const out=new Array(tasks.length); let idx=0;
  async function worker(){
    while(idx<tasks.length){
      const i=idx++; const q=meta[i];
      const a=await tasks[i]();
      out[i]=a; per[q.qid].a.push(a); if(isCorrect(a,q))per[q.qid].c++;
      completed++;
      if(completed%20===0) process.stdout.write(`  ${completed}/${tasks.length}\r`);
      // 全試行終わった問題を逐次保存
    }
  }
  await Promise.all(Array.from({length:CONCURRENCY},worker));

  const results = questions.map(q=>{
    if(prev[q.qid]) return prev[q.qid];
    const p=per[q.qid];
    return { qid:q.qid, chapter:q.chapter, type:q.question_type,
      correct:q.correct_answers.join(','), correctCount:p.c, trials:TRIALS,
      accuracy:Math.round(p.c/TRIALS*100), answers:p.a.join('|') };
  });
  fs.writeFileSync(OUT, JSON.stringify(results,null,2));

  const tot=results.reduce((s,r)=>s+r.correctCount,0);
  const tr=results.length*TRIALS;
  console.log(`\n\n[${MODEL}] OVERALL=${Math.round(tot/tr*100)}% (${tot}/${tr})`);
  const single=results.filter(r=>r.type==='single'), multi=results.filter(r=>r.type==='multi');
  if(single.length)console.log(` 5択単一(${single.length}問): ${Math.round(single.reduce((s,r)=>s+r.correctCount,0)/(single.length*TRIALS)*100)}%`);
  if(multi.length)console.log(` 全て選べ(${multi.length}問): ${Math.round(multi.reduce((s,r)=>s+r.correctCount,0)/(multi.length*TRIALS)*100)}%`);
  const byChap={};
  results.forEach(r=>{(byChap[r.chapter]=byChap[r.chapter]||{c:0,t:0}).c+=r.correctCount;byChap[r.chapter].t+=TRIALS;});
  Object.entries(byChap).sort().forEach(([c,d])=>console.log(` ${c}: ${Math.round(d.c/d.t*100)}%`));
})();
