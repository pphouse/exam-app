# 医療生成AIパスポート 模擬試験アプリ セットアップ手順

## 1. Supabaseデータベースの設定

Supabaseダッシュボードで以下の手順を実行してください：

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 「New query」をクリック
5. `supabase-schema.sql` の内容をすべてコピー＆ペースト
6. 「Run」をクリックして実行

## 2. Google認証の設定

### Supabase側の設定

1. Supabaseダッシュボードで「Authentication」→「Providers」に移動
2. 「Google」を見つけてクリック
3. 「Enable Sign in with Google」をONにする
4. Client IDとClient Secretを入力（次のステップで取得）
5. 「Callback URL」をコピーしておく（例: `https://wlrveiooyywhihsipjoi.supabase.co/auth/v1/callback`）

### Google Cloud Consoleでの設定

1. https://console.cloud.google.com にアクセス
2. プロジェクトを作成または選択
3. 左メニューから「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuthクライアントID」をクリック
5. アプリケーションの種類：「ウェブアプリケーション」を選択
6. 名前：任意の名前を入力
7. 「承認済みのリダイレクトURI」にSupabaseのCallback URLを追加
8. 「作成」をクリック
9. 表示されるClient IDとClient SecretをSupabaseに入力

### OAuth同意画面の設定

1. 「OAuth同意画面」に移動
2. 「外部」を選択して作成
3. アプリ名、ユーザーサポートメール、デベロッパー連絡先を入力
4. スコープは `email` と `profile` を追加
5. テストユーザーに自分のGoogleアカウントを追加（本番公開前はテストユーザーのみログイン可）

## 3. アプリの起動

```bash
cd exam-app
npm install
npm run dev
```

http://localhost:5173 にアクセス

## 4. 問題データのインポート

問題データをSupabaseにインポートするには、Supabase SQL Editorで以下のようなINSERT文を実行します：

```sql
INSERT INTO questions (question_id, chapter, keyword, difficulty, bloom_level, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, incorrect_explanation, source)
VALUES
('Q1-001', '第1章', 'キーワード', '標準', '理解', '問題文...', '選択肢A', '選択肢B', '選択肢C', '選択肢D', 'A', '解説...', NULL, NULL),
-- 他の問題...
;
```

または、CSVファイルをSupabaseのTable Editorからインポートできます：
1. Supabaseダッシュボードで「Table Editor」→「questions」を選択
2. 右上の「Insert」→「Import data from CSV」をクリック
3. CSVファイルをアップロード

## トラブルシューティング

### ログインできない場合
- Google Cloud ConsoleでOAuth同意画面が「テスト」モードの場合、テストユーザーとして追加されているか確認
- Supabaseの「Authentication」→「URL Configuration」で「Site URL」が正しいか確認（開発時は `http://localhost:5173`）

### データが表示されない場合
- Supabase SQL EditorでRLSポリシーが正しく設定されているか確認
- ブラウザのコンソールでエラーを確認
