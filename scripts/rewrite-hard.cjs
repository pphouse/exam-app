// easy47.json の問題を難しく書き直す（レート制限対応版）
// - テキスト参照を削除してトークン節約
// - CONCURRENCY=1, リクエスト間に2秒ウェイト
// - 既存の成功済みエントリはスキップ（resume対応）
// 出力: rewritten47.json

const fs = require('fs');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';

const questions = JSON.parse(fs.readFileSync(`${DIR}/easy47.json`, 'utf8'));

// 既存の成功済みエントリを読み込む
let existing = {};
try {
  const prev = JSON.parse(fs.readFileSync(`${DIR}/rewritten47.json`, 'utf8'));
  prev.forEach(r => { if (!r.rewrite_error) existing[r.qid] = r; });
  console.log(`既存の成功済み: ${Object.keys(existing).length}問`);
} catch (e) { /* 初回 */ }

const SYSTEM = `あなたは「医療生成AIパスポート」資格試験の問題作成専門家です。
与えられた四択問題を、以下の方針で難しく書き直してください。

【目標】
Haikuレベルのモデルが教材なしで解いた場合の正解率を100%→60%以下に下げる。
一方で、テキストを読んだ学習者は正しく答えられる良問にする。

【書き直しの方針】
1. **専門用語を積極的に使う**
   一般常識ではわからない技術・医療・法規用語を盛り込む。
   例: トークン化、プロンプトインジェクション、RAG（検索拡張生成）、ハルシネーション、
   個人情報保護法・医療法・薬機法の具体的な要件、Transformerのアーキテクチャ、
   FHIR、HL7、HIPAA相当の国内規制、など

2. **△（グレーゾーン）選択肢を1〜2個含める**
   「一般的には正しいが例外がある」「条件によっては当てはまる」「部分的に正しいが最も適切ではない」
   という選択肢を含め、単純なOK/NGではなく「最も正確・最も適切なもの」を選ばせる

3. **正解の根拠をドメイン知識依存にする**
   「医療×生成AIリテラシー」の専門知識がないと正解を選べない問題にする。
   一般的なITリテラシーや医療常識だけでは判断できないようにする。

4. **問題文の問い方を工夫する**
   「最も正確なものを選べ」「最も適切でないものを選べ」「必ずしも正しくないものを選べ」など

【守ること】
- 章（chapter）とキーワード（keyword）は変えない（シラバスを遵守）
- 正解ラベル（A/B/C/D）は何でもよいが、必ず1つだけ明確な正解
- 選択肢は4つ（A〜D）
- 問題文・選択肢の日本語は自然に

【出力形式（JSON）】
{
  "qid": "元のQID",
  "chapter": "元の章",
  "keyword": "元のキーワード",
  "question_text": "書き直した問題文",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct": "正解ラベル（A/B/C/D）",
  "explanation": "なぜその答えが正解か（1〜2文）",
  "rewrite_note": "どう難しくしたか（1文）"
}
JSONのみ出力。他のテキスト不要。`;

function buildPrompt(q) {
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
正解: ${q.correct}`;
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
      max_tokens: 800,
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(q) }],
    }),
  });
  if (res.status === 429) {
    const t = await res.text();
    throw new Error('RATELIMIT: ' + t.slice(0, 100));
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t.slice(0, 100)}`);
  }
  const data = await res.json();
  const text = (data.content?.[0]?.text || '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON: ' + text.slice(0, 80));
  return JSON.parse(m[0]);
}

async function rewriteRetry(q, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { return await rewriteOne(q); }
    catch (e) {
      const isRate = e.message.startsWith('RATELIMIT');
      const wait = isRate ? 10000 * (i + 1) : 3000 * (i + 1);
      console.error(`  RETRY ${q.qid} (${i+1}/${tries}) wait=${wait/1000}s: ${e.message.slice(0, 60)}`);
      if (i === tries - 1) return { ...q, rewrite_error: e.message };
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

(async () => {
  if (!API_KEY) { console.error('ANTHROPIC_API_KEY 未設定'); process.exit(1); }

  const todo = questions.filter(q => !existing[q.qid]);
  console.log(`書き直し対象: ${todo.length}問（スキップ: ${Object.keys(existing).length}問）`);

  const results = { ...existing };

  for (let i = 0; i < todo.length; i++) {
    const q = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${q.qid} ...`);
    const r = await rewriteRetry(q);
    results[r.qid] = r;
    console.log(r.rewrite_error ? ' ERROR' : ' OK');

    // 進捗保存
    const sorted = questions.map(orig => results[orig.qid] || orig);
    fs.writeFileSync(`${DIR}/rewritten47.json`, JSON.stringify(sorted, null, 2));

    // リクエスト間ウェイト（レート制限対策）
    if (i < todo.length - 1) await new Promise(r => setTimeout(r, 2500));
  }

  const ok = Object.values(results).filter(r => !r.rewrite_error).length;
  const ng = Object.values(results).filter(r => r.rewrite_error).length;
  console.log(`\n完了: ${ok}問成功, ${ng}問エラー`);
})();
