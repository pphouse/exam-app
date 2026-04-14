-- 問題テーブル
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id VARCHAR(20) UNIQUE NOT NULL,
  chapter VARCHAR(50) NOT NULL,
  keyword VARCHAR(255),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('易', '標準', '難')),
  bloom_level VARCHAR(50),
  question_text TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  incorrect_explanation TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 試験セッションテーブル
CREATE TABLE exam_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('exam', 'practice')),
  chapter VARCHAR(50),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  total_questions INTEGER NOT NULL,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 回答テーブル
CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer CHAR(1) NOT NULL CHECK (user_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 問題統計テーブル
CREATE TABLE question_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID UNIQUE NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_questions_chapter ON questions(chapter);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_mode ON exam_sessions(mode);
CREATE INDEX idx_answers_session_id ON answers(session_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_question_stats_question_id ON question_stats(question_id);

-- RLS (Row Level Security) ポリシー

-- questions: 誰でも読み取り可能
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are viewable by everyone" ON questions FOR SELECT USING (true);

-- exam_sessions: 自分のセッションのみ操作可能
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON exam_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON exam_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON exam_sessions FOR UPDATE USING (auth.uid() = user_id);

-- answers: 自分のセッションの回答のみ操作可能
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own answers" ON answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM exam_sessions WHERE exam_sessions.id = answers.session_id AND exam_sessions.user_id = auth.uid()));
CREATE POLICY "Users can insert own answers" ON answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM exam_sessions WHERE exam_sessions.id = answers.session_id AND exam_sessions.user_id = auth.uid()));

-- question_stats: 誰でも読み取り可能、認証ユーザーのみ更新可能
ALTER TABLE question_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Question stats are viewable by everyone" ON question_stats FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert stats" ON question_stats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update stats" ON question_stats FOR UPDATE USING (auth.role() = 'authenticated');

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_stats_updated_at BEFORE UPDATE ON question_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
