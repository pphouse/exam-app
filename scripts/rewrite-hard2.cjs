// easy47.json の問題を難しく書き直す（第2版）
// 核心方針: 全選択肢が「一見もっともらしい」状態にし、消去法を封じる
// - テキストの章別セクションを参考資料として渡す
// - CONC=1 + 7秒ウェイトでレート制限対策
// - 既成功エントリはスキップ（resume対応）
// 出力: rewritten47v2.json

const fs = require('fs');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

const questions = JSON.parse(fs.readFileSync(`${DIR}/easy47.json`, 'utf8'));
const textbook = fs.readFileSync(`${DIR}/textbook.txt`, 'utf8');

// テキストを章ごとに分割
function extractChapterSection(chapterName) {
  // 例: "第1章" → "第1章" から次の章見出しまで
  const lines = textbook.split('\n');
  const chNum = chapterName.match(/第(\d+)章/)?.[1];
  if (!chNum) return '';
  const startPattern = new RegExp(`^第${chNum}章`);
  const nextChNum = parseInt(chNum) + 1;
  const endPattern = new RegExp(`^第${nextChNum}章`);
  let inside = false;
  const section = [];
  for (const line of lines) {
    if (!inside && startPattern.test(line)) { inside = true; }
    if (inside) {
      if (endPattern.test(line)) break;
      section.push(line);
    }
  }
  const text = section.join('\n');
  // 長すぎる場合は最初の4000文字
  return text.length > 4000 ? text.slice(0, 4000) : text;
}

// 既存の成功済みエントリを読み込む
let existing = {};
try {
  const prev = JSON.parse(fs.readFileSync(`${DIR}/rewritten47v2.json`, 'utf8'));
  prev.forEach(r => { if (!r.rewrite_error) existing[r.qid] = r; });
  console.log(`既存の成功済み: ${Object.keys(existing).length}問`);
} catch (e) { /* 初回 */ }

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題作成専門家です。
研修テキストを読んだ学習者はかろうじて正解でき、読んでいない人は迷う問題を作ってください。

【最重要ルール：消去法を封じる】
4つの選択肢は全て「技術的に聞こえ、専門知識がない人には○か✗か判断できない」状態にすること。
「明らかに間違い」「一般常識で即座に除外できる」選択肢を含めてはいけない。
全選択肢が正しそうに見え、テキストの記述と照合した人だけが正解を見抜ける問題にする。

【具体的な方法】
1. **微妙に違う定義**: 正解に近いが特定の言葉や要件が異なる選択肢（例: 「○○が必須」↔「○○は不要」）
2. **適用範囲のズレ**: 正しい説明だが対象が違う（「RAGの説明」だが「生成AIの定義」として提示など）
3. **因果関係の逆転**: 正しい要素を含むが因果や順序が入れ替わっている
4. **規制・数値のすり替え**: 実在する法律名や数値だが、正しい組み合わせでない
5. **例外を一般化**: 「〜の場合がある」を「〜である」にする

【問いの形式も工夫する】
- 「最も正確に述べているものはどれか」
- 「最も適切でないものはどれか」（ネガティブ問題）
- 「医療現場での対応として最も適切なものはどれか」（応用問題）
- 「〜の観点から最も優先されるものはどれか」

【守ること】
- 章（chapter）とキーワード（keyword）は絶対に変えない（シラバス遵守）
- 正解ラベル（A/B/C/D）は何でもよいが必ず1つだけ明確な正解
- 選択肢は4つ（A〜D）
- 文章は自然な日本語で

【出力形式（JSONのみ）】
{
  "qid": "元のQID",
  "chapter": "元の章",
  "keyword": "元のキーワード",
  "question_text": "書き直した問題文",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct": "正解ラベル（A/B/C/D）",
  "explanation": "なぜその答えが正解か（1〜2文）",
  "why_wrong": {"A": "不正解の理由（正解以外）", ...},
  "rewrite_note": "消去法をどう封じたか（1文）"
}`;

function buildPrompt(q) {
  const section = extractChapterSection(q.chapter);
  return `以下の問題を難しく書き直してください。

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
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(q) }],
    }),
  });
  if (res.status === 429) throw new Error('RATELIMIT');
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.content?.[0]?.text || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON');
  return JSON.parse(m[0]);
}

async function rewriteRetry(q, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { return await rewriteOne(q); }
    catch (e) {
      const wait = e.message === 'RATELIMIT' ? 15000 * (i+1) : 3000 * (i+1);
      console.error(`  RETRY ${q.qid} (${i+1}/${tries}) ${e.message}`);
      if (i === tries - 1) return { ...q, rewrite_error: e.message };
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

(async () => {
  if (!API_KEY) { console.error('NO KEY'); process.exit(1); }
  const todo = questions.filter(q => !existing[q.qid]);
  console.log(`書き直し対象: ${todo.length}問（スキップ: ${Object.keys(existing).length}問）`);

  const results = { ...existing };
  for (let i = 0; i < todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await rewriteRetry(q);
    results[r.qid] = r;
    console.log(r.rewrite_error ? ' ERROR' : ' OK');
    const sorted = questions.map(orig => results[orig.qid] || orig);
    fs.writeFileSync(`${DIR}/rewritten47v2.json`, JSON.stringify(sorted, null, 2));
    if (i < todo.length - 1) await new Promise(r => setTimeout(r, 7000));
  }

  const ok = Object.values(results).filter(r => !r.rewrite_error).length;
  const ng = Object.values(results).filter(r => r.rewrite_error).length;
  console.log(`\n完了: ${ok}問成功, ${ng}問エラー`);
})();
