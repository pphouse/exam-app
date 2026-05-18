UPDATE questions SET incorrect_explanation = 'A: 既存コードの理解・修正も可能（誤り）
B: ファイルの読み書き、コマンド実行、コード生成・修正を自律的に行える（正解）
C: ローカルファイル操作はオフラインでも可能（誤り）
D: 多言語に対応（誤り）' WHERE question_id = 'Q7-001';
UPDATE questions SET incorrect_explanation = 'A: 暗号化とは無関係（誤り）
B: AIエージェントが外部ツールやデータソースと標準化された方法で連携するためのプロトコル（正解）
C: パラメータ共有ではなくツール連携が目的（誤り）
D: 通信速度ではなく連携方法の標準化が目的（誤り）' WHERE question_id = 'Q7-002';
UPDATE questions SET incorrect_explanation = 'A: 医師の判断を省略することは医療安全上問題（誤り）
B: 医師の最終判断を前提とし、AIは補助ツールとして位置づける（正解）
C: 完全自動化は現時点で適切でない（誤り）
D: 判断根拠の透明性は重要（誤り）' WHERE question_id = 'Q7-003';
UPDATE questions SET incorrect_explanation = 'A: 同一能力ではなく専門性の違いが重要（誤り）
B: 各エージェントが専門性を持ち、タスクの分担と並列処理が可能になる（正解）
C: 協調には通信が必要（誤り）
D: データ量削減が主目的ではない（誤り）' WHERE question_id = 'Q7-004';
UPDATE questions SET incorrect_explanation = 'A: 意図しないファイルの削除や上書きのリスク（誤り）
B: 機密情報を含むファイルへの不正アクセス（誤り）
C: AIの推論精度が低下するリスク（正解）
D: いずれもファイルシステム・コマンド実行権限に関連する正当なセキュリティ懸念（誤り）' WHERE question_id = 'Q7-005';
UPDATE questions SET incorrect_explanation = 'A: 曖昧な指示は誤解を招く（誤り）
B: タスクを明確なステップに分解し、具体的な期待出力を示す（正解）
C: 必要な詳細は省略すべきでない（誤り）
D: 段階的アプローチの方が確実（誤り）' WHERE question_id = 'Q7-006';
UPDATE questions SET incorrect_explanation = 'A: AIが事前に定義された関数やAPIを呼び出して外部システムと連携する機能（正解）
B: 物理的操作ではなくソフトウェア連携（誤り）
C: モデルトレーニングとは異なる（誤り）
D: 入力デバイス制御ではない（誤り）' WHERE question_id = 'Q7-007';
UPDATE questions SET incorrect_explanation = 'A: 処理速度とは無関係（誤り）
B: 医療従事者と患者がAIの判断根拠を理解し、適切な意思決定を行うため（正解）
C: ファイルサイズとは無関係（誤り）
D: 個人情報保護の技術要件とは直接関係ない（誤り）' WHERE question_id = 'Q7-008';
UPDATE questions SET incorrect_explanation = 'A: 高リスクタスクには不適切（誤り）
B: タスクのリスクレベルに応じて、人間の監督・承認プロセスを設計する（正解）
C: ユーザーの要件も重要（誤り）
D: 効率性を著しく損なう（誤り）' WHERE question_id = 'Q7-009';
UPDATE questions SET incorrect_explanation = 'A: コスト面の課題だが最重要ではない（誤り）
B: プライバシー保護とデータの適切な取り扱い（正解）
C: UI設計の問題（誤り）
D: 技術的最適化で対応可能（誤り）' WHERE question_id = 'Q7-010';
