// 難易度実測: Haiku 4.5 に各問題を「教材なし」「教材あり」の2条件で解かせる。
//  - 教材なし正解率が高い → 一般常識で解ける = 簡単すぎ
//  - 教材なし低い & 教材あり高い → 教材依存の良問
//  - 両方低い → 教材を読んでも解きにくい（難しすぎ or 問題が不明瞭）

const fs = require('fs');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';
const TRIALS = 5;
const CONCURRENCY = 6;
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

const questions = JSON.parse(fs.readFileSync(`${DIR}/easy47.json`, 'utf8'));
const textbook = fs.readFileSync(`${DIR}/textbook.txt`, 'utf8');

const SYSTEM_NOTEXT = `あなたは医学部の学生です。基礎医学や一般的な医療の知識はありますが、「医療生成AIパスポート」という資格試験の専門教材や、生成AI・医療情報に関する専門ガイドラインは読んでいません。
これは資格試験の練習用の四択問題です。一般常識・基礎的な医学知識・論理的な消去法だけを使って、必ずいずれかの選択肢を選んでください。
分からなくても推測で必ず1つ選び、最後に「答え: X」（XはA/B/C/Dのいずれか）の形式で答えてください。`;

const SYSTEM_WITHTEXT = `あなたは「医療×生成AI リテラシー研修テキスト」を読んだ学習者です。以下の研修テキストの内容に基づいて、四択問題に答えてください。
必ずいずれかの選択肢を選び、最後に「答え: X」（XはA/B/C/Dのいずれか）の形式で答えてください。

=== 研修テキスト ===
${textbook}
=== テキストここまで ===`;

function buildPrompt(q) {
  return `問題: ${q.question_text}

A. ${q.choices.A}
B. ${q.choices.B}
C. ${q.choices.C}
D. ${q.choices.D}`;
}

async function askOnce(q, withText) {
  const systemBlocks = withText
    ? [{ type: 'text', text: SYSTEM_WITHTEXT, cache_control: { type: 'ephemeral' } }]
    : [{ type: 'text', text: SYSTEM_NOTEXT }];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 64,
      temperature: 1.0,
      system: systemBlocks,
      messages: [{ role: 'user', content: buildPrompt(q) }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t.slice(0, 150)}`);
  }
  const data = await res.json();
  const text = (data.content?.[0]?.text || '').trim();
  // 「答え: X」を優先、なければ最後に出現する A-D
  let m = text.match(/答え[:：]\s*([ABCD])/);
  if (!m) {
    const all = text.toUpperCase().match(/[ABCD]/g);
    if (all) return all[all.length - 1];
    return '?';
  }
  return m[1];
}

async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = await tasks[i]();
      } catch (e) {
        results[i] = '!';
        if (idx < 5) console.error(String(e));
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function measure(withText) {
  const tasks = [];
  const meta = [];
  for (const q of questions) {
    for (let t = 0; t < TRIALS; t++) {
      tasks.push(() => askOnce(q, withText));
      meta.push({ qid: q.qid, correct: q.correct });
    }
  }
  const answers = await runPool(tasks, CONCURRENCY);
  const perQ = {};
  questions.forEach((q) => (perQ[q.qid] = { correctCount: 0, answers: [] }));
  answers.forEach((a, i) => {
    perQ[meta[i].qid].answers.push(a);
    if (a === meta[i].correct) perQ[meta[i].qid].correctCount++;
  });
  return perQ;
}

(async () => {
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY 未設定');
    process.exit(1);
  }
  console.log(`教材なし条件を測定中... (${questions.length}×${TRIALS})`);
  const noText = await measure(false);
  console.log(`教材あり条件を測定中... (${questions.length}×${TRIALS})`);
  const withText = await measure(true);

  const results = questions.map((q) => {
    const n = noText[q.qid];
    const w = withText[q.qid];
    return {
      qid: q.qid,
      chapter: q.chapter,
      correct: q.correct,
      acc_notext: Math.round((n.correctCount / TRIALS) * 100),
      acc_withtext: Math.round((w.correctCount / TRIALS) * 100),
      ans_notext: n.answers.join(''),
      ans_withtext: w.answers.join(''),
    };
  });

  // 教材なし正解率が高い順（簡単すぎ順）
  results.sort((a, b) => b.acc_notext - a.acc_notext);

  fs.writeFileSync(`${DIR}/haiku-difficulty-result.json`, JSON.stringify(results, null, 2));

  console.log('\n=== 結果（教材なし正解率の高い順 = 簡単すぎ順）===');
  console.log('QID       章     教材なし 教材あり  判定');
  results.forEach((r) => {
    let verdict;
    if (r.acc_notext >= 80) verdict = '⚠ 簡単すぎ（常識で解ける）';
    else if (r.acc_notext <= 40 && r.acc_withtext >= 60) verdict = '◎ 良問（教材依存）';
    else if (r.acc_withtext <= 40) verdict = '△ 教材ありでも低い（要確認）';
    else verdict = '○ 中間';
    console.log(
      `${r.qid.padEnd(8)} ${r.chapter} ${String(r.acc_notext).padStart(4)}%   ${String(r.acc_withtext).padStart(4)}%   ${verdict}`
    );
  });

  const easy = results.filter((r) => r.acc_notext >= 80);
  console.log(`\n教材なしで80%以上（簡単すぎ）: ${easy.length}問`);
  console.log(easy.map((r) => r.qid).join(', '));
})();
