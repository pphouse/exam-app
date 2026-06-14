// 教材なし・医学生ペルソナで問題を解かせ正解率を測る。
// 環境変数 LIMIT（先頭何問か）, TRIALS（各問の試行回数）で制御。
// 結果は solve-result.json に保存。標準出力は数値・判定のみ。

const fs = require('fs');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';
const TRIALS = parseInt(process.env.TRIALS || '1', 10);
const LIMIT = parseInt(process.env.LIMIT || '0', 10); // 0=全問
const CONCURRENCY = parseInt(process.env.CONC || '4', 10);
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

let questions = JSON.parse(fs.readFileSync(`${DIR}/all310.json`, 'utf8'));
if (LIMIT > 0) questions = questions.slice(0, LIMIT);

const SYSTEM = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、生成AIや医療情報に関する専門教材・ガイドラインは学んでいません。一般常識・基礎的な医学知識・消去法だけを使って四択問題に答えてください。出力は A B C D のいずれか1文字だけ。それ以外の文字は一切出力しないこと。`;

function prompt(q) {
  return `問題: ${q.question_text}\nA. ${q.choices.A}\nB. ${q.choices.B}\nC. ${q.choices.C}\nD. ${q.choices.D}\n\n答え(1文字):`;
}

async function askOnce(q) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8,
      temperature: 0.3,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt(q) }],
    }),
  });
  if (res.status === 429 || res.status === 529 || res.status >= 500) throw new Error('retry ' + res.status);
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  const t = (data.content?.[0]?.text || '').toUpperCase().match(/[ABCD]/);
  return t ? t[0] : '?';
}

async function askRetry(q, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { return await askOnce(q); }
    catch (e) { if (i === tries - 1) return '!'; await new Promise(r => setTimeout(r, 700 * (i + 1))); }
  }
}

async function runPool(tasks, conc) {
  const out = new Array(tasks.length); let idx = 0;
  async function w() { while (idx < tasks.length) { const i = idx++; out[i] = await tasks[i](); } }
  await Promise.all(Array.from({ length: conc }, w));
  return out;
}

(async () => {
  if (!API_KEY) { console.error('NO_KEY'); process.exit(1); }
  const tasks = []; const meta = [];
  for (const q of questions) for (let t = 0; t < TRIALS; t++) { tasks.push(() => askRetry(q)); meta.push(q); }
  const ans = await runPool(tasks, CONCURRENCY);

  const per = {};
  questions.forEach(q => (per[q.qid] = { chapter: q.chapter, correct: q.correct, c: 0, a: [] }));
  ans.forEach((a, i) => { per[meta[i].qid].a.push(a); if (a === meta[i].correct) per[meta[i].qid].c++; });

  const results = questions.map(q => ({
    qid: q.qid, chapter: q.chapter, correct: q.correct,
    correctCount: per[q.qid].c, trials: TRIALS,
    accuracy: Math.round((per[q.qid].c / TRIALS) * 100),
    answers: per[q.qid].a.join(''),
  }));
  fs.writeFileSync(`${DIR}/solve-result.json`, JSON.stringify(results, null, 2));

  const totalCorrect = results.reduce((s, r) => s + r.correctCount, 0);
  const totalTrials = results.length * TRIALS;
  const overall = Math.round((totalCorrect / totalTrials) * 100);
  console.log('OVERALL_ACCURACY=' + overall + '% (' + totalCorrect + '/' + totalTrials + ') questions=' + results.length);
})();
