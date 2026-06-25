// questions-v3.json から SupabaseマイグレーションSQLを生成
// 1) スキーマ変更(5択化・multi対応) 2) question_idでUPSERT
const fs = require('fs');
const DIR = '/Users/naoto/一般社団法人/問題作成/exam-app/scripts';
const MIGDIR = '/Users/naoto/一般社団法人/問題作成/exam-app/supabase/migrations';
const qs = JSON.parse(fs.readFileSync(`${DIR}/questions-v3.json`, 'utf8')).filter(q=>!q._conv_error && !q.gen_error);

const esc = s => String(s ?? '').replace(/'/g, "''");
const ts = '20260623000000';

const schema = `-- 5択 + 2つ選べ 対応スキーマ変更
ALTER TABLE questions ADD COLUMN IF NOT EXISTS choice_e TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) NOT NULL DEFAULT 'single';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS why_wrong JSONB;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_answer_check;
ALTER TABLE questions ALTER COLUMN correct_answer TYPE VARCHAR(10);
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('single','multi'));
-- 回答テーブルも複数選択(例 'A,C')を許容
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_user_answer_check;
ALTER TABLE answers ALTER COLUMN user_answer TYPE VARCHAR(10);
`;
fs.writeFileSync(`${MIGDIR}/${ts}_five_choice_schema.sql`, schema);

const rows = qs.map(q => {
  const correct = [...q.correct_answers].sort().join(',');
  const qtype = q.question_type === 'multi' ? 'multi' : 'single';
  const why = JSON.stringify(q.why_wrong || {});
  return `('${esc(q.qid)}', '${esc(q.chapter)}', ${q.keyword?`'${esc(q.keyword)}'`:'NULL'}, '標準', `
    + `'${esc(q.question_text)}', '${esc(q.choices.A)}', '${esc(q.choices.B)}', '${esc(q.choices.C)}', '${esc(q.choices.D)}', '${esc(q.choices.E)}', `
    + `'${esc(correct)}', '${qtype}', '${esc(q.explanation)}', '${esc(why)}'::jsonb)`;
}).join(',\n');

const data = `-- questions-v3 を question_id でUPSERT (UUID維持=回答履歴のFKを壊さない)
INSERT INTO questions (question_id, chapter, keyword, difficulty, question_text,
  choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, question_type, explanation, why_wrong)
VALUES
${rows}
ON CONFLICT (question_id) DO UPDATE SET
  chapter = EXCLUDED.chapter,
  keyword = EXCLUDED.keyword,
  question_text = EXCLUDED.question_text,
  choice_a = EXCLUDED.choice_a,
  choice_b = EXCLUDED.choice_b,
  choice_c = EXCLUDED.choice_c,
  choice_d = EXCLUDED.choice_d,
  choice_e = EXCLUDED.choice_e,
  correct_answer = EXCLUDED.correct_answer,
  question_type = EXCLUDED.question_type,
  explanation = EXCLUDED.explanation,
  why_wrong = EXCLUDED.why_wrong,
  updated_at = NOW();
`;
fs.writeFileSync(`${MIGDIR}/${ts}1_import_v3.sql`, data);

console.log('生成完了:');
console.log('  '+ts+'_five_choice_schema.sql ('+schema.length+'B)');
console.log('  '+ts+'1_import_v3.sql ('+qs.length+'問, '+Math.round(data.length/1024)+'KB)');
const m=qs.filter(q=>q.question_type==='multi').length;
console.log('  内訳: single '+(qs.length-m)+' / multi '+m);
