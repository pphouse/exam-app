-- 5択 + 2つ選べ 対応スキーマ変更
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
