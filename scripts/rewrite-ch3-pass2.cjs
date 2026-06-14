// 第3章 第2パス：既にリライト済みだがHaikuが100%正解している問題を更に難化
// 戦略：既存リライトを見て「なぜHaikuが解けたか」を分析し、より紛らわしい選択肢に
const fs = require('fs');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

const questions = JSON.parse(fs.readFileSync(`${DIR}/ch3-retry.json`, 'utf8'));
const textbook = fs.readFileSync(`${DIR}/textbook.txt`, 'utf8');

function extractChapterSection(chapterName) {
  const lines = textbook.split('\n');
  const chNum = chapterName.match(/第(\d+)章/)?.[1];
  if (!chNum) return '';
  const startPat = new RegExp(`^第${chNum}章`);
  const endPat = new RegExp(`^第${parseInt(chNum)+1}章`);
  let inside = false; const section = [];
  for (const line of lines) {
    if (!inside && startPat.test(line)) inside = true;
    if (inside) { if (endPat.test(line)) break; section.push(line); }
  }
  const text = section.join('\n');
  return text.length > 4000 ? text.slice(0, 4000) : text;
}

let existing = {};
try {
  const prev = JSON.parse(fs.readFileSync(`${DIR}/ch3-rewritten-pass2.json`, 'utf8'));
  prev.forEach(r => { if (!r.rewrite_error) existing[r.qid] = r; });
  console.log(`既存: ${Object.keys(existing).length}問`);
} catch(e) {}

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題作成専門家です。

以下の問題は既に一度書き直されましたが、Haiku（教材なしの医学生AI）が正解してしまっています。
この問題を、以下の方針でさらに難しく書き直してください。

【分析と再設計】
1. 既存の選択肢のどれかが「他より明らかに正しそう」になっていないか確認する
2. 全4選択肢を「どれも一理ある・どれも正しそう」な状態に再設計する

【第3章（個人情報・セキュリティ）特有の難化技法】
- 「要配慮個人情報」「仮名加工情報」「匿名加工情報」の違い（似ているが法律上異なる）
- オプトイン/オプトアウトの適用場面の違い
- 第三者提供の例外（委託・共同利用・法令に基づく場合）の使い分け
- 生成AIへのデータ入力時の「識別可能性」の判断
- 越境移転の要件（十分性認定国 vs それ以外）
- セキュリティ対策の「何が必要か」vs「何が推奨か」の区別

【紛らわしい選択肢の作り方】
- 「ほぼ正しいが適用範囲が違う」（例：「医療機関全般」vs「特定の規模以上」）
- 「手順は正しいが順序が違う」
- 「条件付きで正しい」（「〜の場合は適用」vs「常に適用」）
- 「目的は同じだが手段が違う」（どちらも有効だが一方が「最も適切」）

【守ること】
- chapter・keywordは変えない
- 正解は必ず1つ（テキストに最も合致）
- 日本語は自然に

【出力形式（JSONのみ）】
{
  "qid": "元のQID",
  "chapter": "元の章",
  "keyword": "元のキーワード",
  "question_text": "問題文",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct": "正解ラベル",
  "explanation": "正解の理由（1〜2文）",
  "why_wrong": {"X": "完全な誤りではないが〜という点で最も適切ではない", ...},
  "gray_note": "なぜ前回より難しくなったか（1文）"
}`;

function buildPrompt(q) {
  const section = extractChapterSection(q.chapter);
  return `既にリライト済みですが、Haikuに100%正解されました。さらに難しく書き直してください。

=== 現在の問題（リライト済み）===
QID: ${q.qid}
章: ${q.chapter}
キーワード: ${q.keyword || ''}
問題文: ${q.question_text}
A. ${q.choices.A}
B. ${q.choices.B}
C. ${q.choices.C}
D. ${q.choices.D}
正解: ${q.correct}
gray_note: ${q.gray_note || '（なし）'}

=== 参考：研修テキストの該当章 ===
${section}`;
}

async function rewriteOne(q) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, temperature: 0.8, system: SYSTEM, messages: [{ role: 'user', content: buildPrompt(q) }] }),
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
  console.log(`第2パス対象: ${todo.length}問`);
  const results = { ...existing };
  for (let i=0; i<todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await rewriteRetry(q);
    results[r.qid] = r;
    console.log(r.rewrite_error ? ' ERROR' : ' OK');
    const sorted = questions.map(orig => results[orig.qid] || orig);
    fs.writeFileSync(`${DIR}/ch3-rewritten-pass2.json`, JSON.stringify(sorted, null, 2));
    if (i < todo.length-1) await new Promise(r=>setTimeout(r, 7000));
  }
  const ok = Object.values(results).filter(r=>!r.rewrite_error).length;
  const ng = Object.values(results).filter(r=>r.rewrite_error).length;
  console.log(`\n完了: ${ok}問成功, ${ng}問エラー`);
})();
