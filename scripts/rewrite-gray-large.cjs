const fs = require('fs');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

const questions = JSON.parse(fs.readFileSync(`${DIR}/targets147.json`, 'utf8'));
const textbook = fs.readFileSync(`${DIR}/textbook.txt`, 'utf8');

function extractChapterSection(chapterName) {
  const lines = textbook.split('\n');
  const chNum = chapterName.match(/第(\d+)章/)?.[1];
  if (!chNum) return '';
  const startPattern = new RegExp(`^第${chNum}章`);
  const nextChNum = parseInt(chNum) + 1;
  const endPattern = new RegExp(`^第${nextChNum}章`);
  let inside = false;
  const section = [];
  for (const line of lines) {
    if (!inside && startPattern.test(line)) inside = true;
    if (inside) {
      if (endPattern.test(line)) break;
      section.push(line);
    }
  }
  const text = section.join('\n');
  return text.length > 4000 ? text.slice(0, 4000) : text;
}

let existing = {};
try {
  const prev = JSON.parse(fs.readFileSync(`${DIR}/rewritten147.json`, 'utf8'));
  prev.forEach(r => { if (!r.rewrite_error) existing[r.qid] = r; });
  console.log(`既存の成功済み: ${Object.keys(existing).length}問`);
} catch (e) {}

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題作成専門家です。

【核心ルール：グレーゾーン問題を作る】
4つの選択肢のうち、2〜3つは「完全な誤りではなく、部分的に正しいが最も適切とは言えない」グレーゾーン選択肢にすること。
「明らかな誤り」「一般常識で即座に排除できる選択肢」は作ってはいけない。

グレーゾーンの作り方：
- 「正しい概念を含むが、優先順位や文脈がずれている」
- 「条件付きで正しいが、無条件に正しいとは言えない」
- 「正しい事実だが、問いの焦点とズレている」
- 「一方向では正しいが例外がある（〜の場合がある → 〜である）」

【問いの形式】
必ず「最も適切なものを選べ」「最も正確に述べているものを選べ」「最も優先すべきものを選べ」を使う。

【守ること】
- chapter・keywordは変えない（シラバス遵守）
- 正解は必ず1つ、テキストの記述に最も合致するもの
- why_wrongには「完全に誤りではないが〜という点で最も適切ではない」と明記

【出力形式（JSONのみ）】
{
  "qid": "元のQID",
  "chapter": "元の章",
  "keyword": "元のキーワード",
  "question_text": "問題文",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct": "正解ラベル",
  "explanation": "正解の理由（1〜2文）",
  "why_wrong": {"X": "完全な誤りではないが〜", ...},
  "gray_note": "どのグレーゾーンを使ったか（1文）"
}`;

function buildPrompt(q) {
  const section = extractChapterSection(q.chapter);
  return `以下の問題をグレーゾーン版に書き直してください。

=== 元の問題 ===
QID: ${q.qid}
章: ${q.chapter}
キーワード: ${q.keyword || ''}
問題文: ${q.question_text}
A. ${q.choices.A}
B. ${q.choices.B}
C. ${q.choices.C}
D. ${q.choices.D}
正解: ${q.correct}

=== 参考：研修テキストの該当章 ===
${section}`;
}

async function rewriteOne(q) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, temperature: 0.7, system: SYSTEM, messages: [{ role: 'user', content: buildPrompt(q) }] }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.content?.[0]?.text || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON');
  return JSON.parse(m[0]);
}

async function rewriteRetry(q, tries=5) {
  for (let i=0; i<tries; i++) {
    try { return await rewriteOne(q); }
    catch(e) {
      const wait = e.message === 'RATELIMIT' ? 15000*(i+1) : 3000*(i+1);
      console.error(`  RETRY ${q.qid} (${i+1}/${tries}) ${e.message}`);
      if (i===tries-1) return { ...q, rewrite_error: e.message };
      await new Promise(r=>setTimeout(r, wait));
    }
  }
}

(async () => {
  if (!API_KEY) { console.error('NO KEY'); process.exit(1); }
  const todo = questions.filter(q => !existing[q.qid]);
  console.log(`書き直し対象: ${todo.length}問（スキップ: ${Object.keys(existing).length}問）`);

  const results = { ...existing };
  for (let i=0; i<todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await rewriteRetry(q);
    results[r.qid] = r;
    console.log(r.rewrite_error ? ' ERROR' : ' OK');
    const sorted = questions.map(orig => results[orig.qid] || orig);
    fs.writeFileSync(`${DIR}/rewritten147.json`, JSON.stringify(sorted, null, 2));
    if (i < todo.length-1) await new Promise(r=>setTimeout(r, 7000));
  }

  const ok = Object.values(results).filter(r=>!r.rewrite_error).length;
  const ng = Object.values(results).filter(r=>r.rewrite_error).length;
  console.log(`\n完了: ${ok}問成功, ${ng}問エラー`);
})();
