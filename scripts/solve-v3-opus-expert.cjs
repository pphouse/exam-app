// 現行 questions-v3.json を「全力の専門家Opus(推論あり)」で解かせ、作問ミス候補を洗い出す。
// 難易度測定用の"無知な医学生"プロンプトとは逆で、知識をフルに使わせる。
// それでも誤答する問題 = 正解キー誤り/曖昧/複数正解 などの疑いが濃い。
// 出力: solve-v3-opus-expert.json  (推論テキストも保存)

const fs = require('fs');
const { execFile } = require('child_process');
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const MODEL = process.env.SOLVE_MODEL || 'opus';
const CONCURRENCY = Number(process.env.CONCURRENCY || 5);
const QFILE = process.env.QFILE || 'questions-v3.json';
const OUT = `${DIR}/solve-v3-opus-expert.json`;
const LETTERS = ['A','B','C','D','E'];

const questions = JSON.parse(fs.readFileSync(`${DIR}/${QFILE}`, 'utf8'))
  .filter(q => !q.gen_error && !q._fix_error);
const nMulti = questions.filter(q=>q.question_type==='multi').length;
console.log(`対象: ${questions.length}問 (2つ選べ: ${nMulti}, 5択単一: ${questions.length-nMulti}) | model=${MODEL}`);

const SYS = `あなたは医療生成AI・医療情報学・日本の医療AIガイドライン(厚労省/PMDA/各学会指針)に精通した専門家であり、この認定試験の作問監修者でもあります。知識を最大限に使い、各選択肢を吟味して厳密に解答してください。
出力フォーマット(厳守):
1行目以降に簡潔な根拠(各選択肢の正誤を一言ずつ)。
最終行に必ず「ANSWER: X」(単一)または「ANSWER: A,C」(2つ選べ。ちょうど2つ)の形式で解答だけを書くこと。`;

function buildPrompt(q) {
  const opts = LETTERS.map(L => `${L}. ${q.choices[L]}`).join('\n');
  const ask = q.question_type === 'multi'
    ? '正しいものをちょうど2つ選び、根拠の後に「ANSWER: A,C」形式で。'
    : '最も適切なものを1つ選び、根拠の後に「ANSWER: X」形式で。';
  return `${SYS}\n\n問題: ${q.question_text}\n${opts}\n\n${ask}`;
}

function parseAnswer(text, isMulti) {
  // 最終行の ANSWER: を優先
  const m = (text||'').match(/ANSWER:\s*([A-E](?:\s*,\s*[A-E])*)/i);
  let letters;
  if (m) {
    letters = m[1].toUpperCase().match(/[A-E]/g) || [];
  } else {
    // フォールバック: 末尾付近の文字を拾う
    const tail = (text||'').toUpperCase().slice(-40);
    letters = tail.match(/[A-E]/g) || [];
  }
  if (isMulti) return [...new Set(letters)].sort().join(',');
  return letters.length ? letters[letters.length-1] : '?';
}

function callModel(prompt) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY; // サブスク認証
    execFile('claude', ['-p', '--model', MODEL], { env, timeout: 180000, maxBuffer: 1<<22 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        const out = (stdout||'').trim();
        if (/credit balance is too low/i.test(out)) return reject(new Error('CREDIT'));
        resolve(out);
      });
    require('child_process').execFileSync && null;
    // promptをstdinへ
  }).catch(e=>{throw e;});
}

// stdin版: execFileのstdinにpromptを渡す
function callModelStdin(prompt) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const child = execFile('claude', ['-p', '--model', MODEL], { env, timeout: 180000, maxBuffer: 1<<22 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        const out = (stdout||'').trim();
        if (/credit balance is too low/i.test(out)) return reject(new Error('CREDIT'));
        resolve(out);
      });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function run() {
  const results = new Array(questions.length);
  let idx = 0, done = 0;
  async function worker() {
    while (idx < questions.length) {
      const i = idx++;
      const q = questions[i];
      const isMulti = q.question_type === 'multi';
      const expected = [...q.correct_answers].sort().join(',');
      try {
        const out = await callModelStdin(buildPrompt(q));
        const ans = parseAnswer(out, isMulti);
        results[i] = { qid:q.qid, chapter:q.chapter, type:q.question_type,
          correct:expected, opus:ans, ok: ans===expected, reasoning: out };
      } catch (e) {
        results[i] = { qid:q.qid, chapter:q.chapter, type:q.question_type,
          correct:expected, opus:'ERR', ok:false, reasoning:'ERROR: '+e.message };
      }
      done++;
      if (done%20===0 || done===questions.length) console.log(`  ${done}/${questions.length}`);
    }
  }
  await Promise.all(Array.from({length:CONCURRENCY}, worker));
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  const wrong = results.filter(r=>!r.ok);
  const acc = (results.filter(r=>r.ok).length/results.length*100).toFixed(1);
  console.log(`\n完了。Opus(専門家)正解率 ${acc}% | 誤答 ${wrong.length}問`);
  console.log('誤答qid:', wrong.map(r=>r.qid).join(', '));
  console.log(`保存: ${OUT}`);
}
run();
