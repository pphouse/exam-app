-- profiles テーブル作成（管理者ロール管理用）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロフィールは読み取り可能
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 管理者は全てのプロフィールを読み取り可能
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 自分のプロフィールは更新可能（ただしroleは変更不可）
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 新規ユーザー登録時に自動でprofileを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーが既存の場合は削除してから作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 管理者用：全ユーザーの統計を取得するビュー
CREATE OR REPLACE VIEW admin_user_stats AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  COUNT(DISTINCT es.id) as total_exams,
  COUNT(DISTINCT CASE WHEN es.mode = 'exam' THEN es.id END) as exam_count,
  COUNT(DISTINCT CASE WHEN es.mode = 'practice' THEN es.id END) as practice_count,
  ROUND(AVG(CASE WHEN es.mode = 'exam' AND es.score IS NOT NULL THEN es.score END)::numeric, 1) as avg_exam_score,
  COUNT(DISTINCT CASE WHEN es.mode = 'exam' AND es.score >= 70 THEN es.id END) as passed_count,
  MAX(es.finished_at) as last_activity
FROM profiles p
LEFT JOIN exam_sessions es ON p.id = es.user_id AND es.finished_at IS NOT NULL
GROUP BY p.id, p.email, p.full_name, p.role, p.created_at;

-- 管理者のみビューにアクセス可能
CREATE POLICY "Admins can read user stats" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 問題別の統計ビュー
CREATE OR REPLACE VIEW admin_question_stats AS
SELECT
  q.id,
  q.question_id,
  q.chapter,
  q.difficulty,
  q.question_text,
  COUNT(a.id) as total_attempts,
  COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_count,
  ROUND(
    (COUNT(CASE WHEN a.is_correct THEN 1 END)::numeric / NULLIF(COUNT(a.id), 0) * 100),
    1
  ) as accuracy_rate
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id
GROUP BY q.id, q.question_id, q.chapter, q.difficulty, q.question_text;

-- 既存ユーザーのprofilesレコードを作成（既存ユーザーがいる場合）
INSERT INTO profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 最初の管理者を設定するには以下を実行（メールアドレスを変更してください）
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
