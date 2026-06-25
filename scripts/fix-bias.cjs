// 正解分布の偏り(B35%/E0%)と選択肢長の偏り(E=1.46倍)を修正。
// Phase1: 長すぎる選択肢(>52字)をA〜D並みに短縮(正誤は不変)
// Phase2: 選択肢位置を均等シャッフル(正解をA〜Eに均等分布、中身不変)
// 入力: questions-v2.json / 出力: questions-v3.json

const fs = require('fs');
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY;
if (!CEREBRAS_KEY) { console.error('環境変数 CEREBRAS_API_KEY を設定してください'); process.exit(1); }
const MODEL = 'gpt-oss-120b';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const OUT = `${DIR}/questions-v3.json`;
const SHORT_OUT = `${DIR}/.questions-v3-shortened.json`; // Phase1中間
const LETTERS = ['A','B','C','D','E'];
const THRESH = 52;

const src = JSON.parse(fs.readFileSync(`${DIR}/questions-v2.json`, 'utf8')).filter(q=>!q._conv_error);

// ===== Phase1: 長い選択肢の短縮 =====
const SYS = `あなたは試験問題の選択肢を校正する編集者です。
与えられた選択肢の文を、意味と正誤(正しい/誤り)を一切変えずに、簡潔に短縮してください。
- 解説調の冗長な言い回し・自己言及的な但し書きを削り、他の選択肢と同程度の長さ(30〜45字)に
- 主張する内容そのものは保持(正解選択肢は正しいまま、誤答は誤ったまま)
- 「〜とも言えるが」「〜に該当する」のようなメタな表現は削除
出力は短縮後の選択肢テキスト1行のみ。前置き・記号・引用符は付けない。`;

async function shorten(choiceText, qctx, targetLen) {
  const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method:'POST', headers:{'content-type':'application/json','Authorization':`Bearer ${CEREBRAS_KEY}`},
    body: JSON.stringify({ model:MODEL, max_tokens:600, temperature:0.3,
      messages:[{role:'system',content:SYS},{role:'user',content:`問題文の文脈: ${qctx}\n\n約${targetLen}字に短縮する選択肢:\n${choiceText}`}]}),
  });
  if (res.status===429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error('API '+res.status);
  const data = await res.json();
  let t = (data.choices?.[0]?.message?.content||'').trim().replace(/^[「"']|[」"']$/g,'').trim();
  if (!t) throw new Error('empty content');
  return t;
}
async function shortenRetry(text, ctx, targetLen, tries=5) {
  for (let i=0;i<tries;i++){ try{ const r=await shorten(text,ctx,targetLen); if(r&&r.length>=8) return r; throw new Error('empty'); }
    catch(e){ if(i===tries-1){ console.log('  [短縮失敗そのまま] '+e.message); return text; } await new Promise(r=>setTimeout(r, e.message==='RATELIMIT'?12000*(i+1):2000*(i+1))); } }
}

async function phase1() {
  // resume
  let work;
  try { work = JSON.parse(fs.readFileSync(SHORT_OUT,'utf8')); console.log('Phase1 resume'); return work; } catch(e){}
  work = JSON.parse(JSON.stringify(src));
  // 短縮対象: 同じ問題内で他の選択肢より「突出して長い」もののみ
  // 条件: その選択肢が、他4択の中央値の1.4倍超 かつ 絶対50字超
  const median = arr => { const s=[...arr].sort((a,b)=>a-b); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
  const jobs=[];
  work.forEach((q,qi)=>{
    LETTERS.forEach(L=>{
      const others = LETTERS.filter(x=>x!==L).map(x=>q.choices[x].length);
      const med = median(others);
      const len = q.choices[L].length;
      if (len > 50 && len > med*1.4) jobs.push({qi, L, target: Math.round(med)});
    });
  });
  console.log(`Phase1: 短縮対象 ${jobs.length}選択肢 (同問題内で突出して長いもの)`);
  for (let i=0;i<jobs.length;i++){
    const {qi,L,target}=jobs[i]; const q=work[qi];
    process.stdout.write(`[${i+1}/${jobs.length}] ${q.qid}.${L} (${q.choices[L].length}→~${target}字) ...`);
    q.choices[L]=await shortenRetry(q.choices[L], q.question_text, target);
    console.log(' '+q.choices[L].length+'字');
    fs.writeFileSync(SHORT_OUT, JSON.stringify(work,null,2));
    await new Promise(r=>setTimeout(r,1200));
  }
  console.log(`\nPhase1完了`);
  return work;
}

// ===== Phase2: 位置シャッフル(均等化) =====
// seeded RNG
let _s = 20260623;
function rnd(){ _s=(_s*1103515245+12345)&0x7fffffff; return _s/0x7fffffff; }
function shuffleArr(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function phase2(work) {
  // single: 正解位置をA〜E均等にラウンドロビン割当
  const singles = work.filter(q=>q.question_type!=='multi');
  const multis = work.filter(q=>q.question_type==='multi');
  shuffleArr(singles); // 章順の偏りを消す
  let rr=0;
  const out = {};
  for (const q of singles) {
    const correctL = q.correct_answers[0];
    const correctText = q.choices[correctL];
    const wrongTexts = shuffleArr(LETTERS.filter(L=>L!==correctL).map(L=>q.choices[L]));
    const target = LETTERS[rr%5]; rr++;
    const newChoices={}; let wi=0;
    for (const L of LETTERS) newChoices[L] = (L===target)? correctText : wrongTexts[wi++];
    // why_wrongもテキストベースで再マップ
    const wrongMap = {}; // text -> why
    LETTERS.filter(L=>L!==correctL).forEach(L=>{ wrongMap[q.choices[L]] = q.why_wrong[L]; });
    const newWhy={}; for(const L of LETTERS){ if(L!==target) newWhy[L]=wrongMap[newChoices[L]]; }
    out[q.qid] = {...q, choices:newChoices, correct_answers:[target], why_wrong:newWhy};
  }
  // multi: 2正解の位置をランダムシャッフル
  for (const q of multis) {
    const order = shuffleArr([...LETTERS]); // 旧→新位置
    // 旧Lのテキスト/正誤を新Lへ
    const newChoices={}, newCorrect=[], newWhy={};
    const map={}; // 旧L -> 新L
    LETTERS.forEach((oldL,idx)=>{ map[oldL]=order[idx]; });
    LETTERS.forEach(oldL=>{ const nL=map[oldL]; newChoices[nL]=q.choices[oldL]; if(q.correct_answers.includes(oldL)) newCorrect.push(nL); else newWhy[nL]=q.why_wrong[oldL]; });
    out[q.qid] = {...q, choices:newChoices, correct_answers:newCorrect.sort(), why_wrong:newWhy};
  }
  // 元の順序で返す
  return work.map(q=>out[q.qid]);
}

(async()=>{
  const work = await phase1();
  const fixed = phase2(work);
  // 検証
  let err=[];
  fixed.forEach(q=>{
    const wrong=LETTERS.filter(L=>!q.correct_answers.includes(L));
    for(const L of wrong) if(!q.why_wrong[L]) err.push(q.qid+':why'+L);
    if(q.question_type!=='multi'&&q.correct_answers.length!==1) err.push(q.qid+':single');
    if(q.question_type==='multi'&&q.correct_answers.length!==2) err.push(q.qid+':multi');
  });
  fs.writeFileSync(OUT, JSON.stringify(fixed,null,2));
  console.log('検証エラー:', err.length, err.slice(0,8).join(' '));

  // 新分布
  const sc={A:0,B:0,C:0,D:0,E:0};
  fixed.filter(q=>q.question_type!=='multi').forEach(q=>sc[q.correct_answers[0]]++);
  console.log('新・5択単一 正解分布:', JSON.stringify(sc));
  const lenByL={A:[],B:[],C:[],D:[],E:[]};
  fixed.forEach(q=>LETTERS.forEach(L=>lenByL[L].push(q.choices[L].length)));
  const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
  console.log('新・選択肢平均長:', LETTERS.map(L=>L+':'+avg(lenByL[L]).toFixed(0)).join(' '));
})();
