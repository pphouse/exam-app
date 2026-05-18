UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: AIによる看護判断の最終決定（正解）
B: ケアプラン文書の下書き作成は、看護師が内容を確認・調整することを前提に活用可能。
C: 申し送り要約作成は、業務効率化の観点で有効な活用例。
D: 状態観察記録の下書き作成は、看護師が確認・修正することを前提に活用可能。' WHERE question_id = 'Q2-021';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 救急車の要請判断は重大な結果を伴う可能性があり、AIの自動判断には委ねられない。
B: 診断と処方は医師の医療行為であり、チャットボットが行うことはできない。
C: 検査結果の解釈と治療方針の指示は医師の判断に基づくべき。
D: 診療時間、予約方法、持ち物などの一般的な問い合わせへの自動応答（正解）' WHERE question_id = 'Q2-035';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 患者情報のAI入力には、個人情報保護の観点から適切な同意と管理が必要。
B: AIの出力には誤りが含まれる可能性があり、特に医薬品情報では確認が必須。
C: 未確認のAI出力をそのまま患者に交付することは、誤情報提供のリスクがあり不適切。
D: 薬剤師がAIの出力を確認し、薬剤名、用量、服用方法の正確性を検証する（正解）' WHERE question_id = 'Q2-036';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 実在の患者情報の使用は個人情報保護違反であり、教育でも許容されない。
B: AIが生成した症例の医学的妥当性を教員が検証し、不正確な内容が含まれていないか確認する（正解）
C: AIシミュレーションは補助教材であり、実際の臨床実習は代替できない。
D: シミュレーション教材の目的は学習であり、成績評価は別の方法で行うべき。' WHERE question_id = 'Q2-037';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: レセプト提出は医療機関の責任で行うものであり、AIが自動提出することは不適切。
B: AIが病名と処置の整合性をチェックした結果を参考に、人間が最終確認を行う（正解）
C: 診療報酬の判断は審査機関が行うものであり、AIが勝手に減額することはできない。
D: AIの点検には誤検出・見逃しの可能性があり、人間による確認の省略は不適切。' WHERE question_id = 'Q2-044';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 経営の統一管理はプラットフォームの目的ではなく、AIの役割でもない。
B: プラットフォームに集約された医療情報を、適切なアクセス管理のもとでAI活用に利用できる可能性がある（正解）
C: 患者情報への自由なアクセスは、個人情報保護の観点から認められない。
D: プラットフォーム構築はAI利用を促進する可能性があり、禁止とは逆方向。' WHERE question_id = 'Q2-046';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 死亡診断書は法的効力を持つ重要文書であり、医師が直接作成・署名する必要がある。
B: 麻薬処方箋は厳格な規制のもとで医師が発行するものであり、AIによる自動発行は認められない。
C: 医師免許は国（厚生労働大臣）が発行するものであり、AIとは無関係。
D: 退院サマリーの下書き作成（正解）' WHERE question_id = 'Q2-054';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: AIがリアルタイムで病変候補を検出し、医師の見落とし防止を支援する（正解）
B: 検査結果の通知は医師が患者に説明すべきものであり、AIが直接通知することは不適切。
C: 検査の必要性判断は医師が行うものであり、AIが最終決定することは不適切。
D: 内視鏡の操作は医師が行う医療行為であり、AIが自動操作することは現時点では一般的でない。' WHERE question_id = 'Q2-058';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: リスク評価の伝達は医療者が適切に説明すべきであり、AIが直接伝えることは不適切。
B: AIが低リスクと判定しても、状態は変化するため見守りを減らすことは危険。
C: 患者拘束は人権に関わる重大な判断であり、AIによる自動決定は絶対に不適切。
D: AIのリスク評価を参考にしつつ、看護師の観察と判断を組み合わせて予防策を講じる（正解）' WHERE question_id = 'Q2-059';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 処方内容の決定は医師の医療行為であり、AIが自動決定することはできない。
B: 保険資格確認はオンライン資格確認システムで行われるものであり、生成AIの機能ではない。
C: 電子処方箋データを活用した服薬指導文書の作成支援（正解）
D: 薬の受け取りは本人確認を伴う行為であり、AIが代行することはできない。' WHERE question_id = 'Q2-060';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 本人同意がある場合は、原則として第三者提供が可能。
B: 救急患者の家族への連絡など、生命・身体の保護に必要な場合は例外として認められている。
C: 感染症法に基づく届出など、法令に基づく提供は例外として認められている。
D: 医療機関の利益のために必要と判断した場合（正解）' WHERE question_id = 'Q3-003';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: すべての情報を公開するのではなく、匿名加工した上で研究利用を可能にする制度。
B: 国による経営管理は本法の目的ではない。
C: 医療情報を匿名加工して研究開発に利活用できる仕組みを整備すること（正解）
D: 資格試験は本法の目的外。医療情報の利活用促進が目的。' WHERE question_id = 'Q3-007';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 日本の医療機関が取り扱う情報には、海外サービス利用時も日本の個人情報保護法が適用される。
B: 海外の法制度や規制を確認し、個人情報保護法に基づく適切な措置を講じる必要がある（正解）
C: 海外サービスのセキュリティが必ずしも高いとは限らず、法的リスクも考慮が必要。
D: 同意があっても、移転先の国の基準や契約条件など、追加の措置が必要な場合がある。' WHERE question_id = 'Q3-012';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 権限のある者だけが必要な情報にアクセスできるようにし、不正アクセスを防ぐこと（正解）
B: 全職員が全情報にアクセスできる状態はセキュリティ上問題があり、アクセス制御の目的に反する。
C: 患者の情報アクセスは適切な認証と範囲設定が必要であり、自由なアクセスは不適切。
D: 処理速度向上はパフォーマンス最適化の目的であり、アクセス制御の目的ではない。' WHERE question_id = 'Q3-013';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 料金は運用上の考慮事項だが、個人情報保護リスクより優先度は低い。
B: ロゴデザインはセキュリティとは無関係。
C: 入力データがAIの学習に使用されるか、データがどこに保存されるか（正解）
D: 回答速度は利便性の問題であり、セキュリティリスク評価とは異なる。' WHERE question_id = 'Q3-019';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 氏名等も個人情報であり利用目的の明示は必要。また、病歴は診察前に問診で把握することが一般的。
B: 本人から直接聞き取ることが原則であり、家族からの聞き取りは本人確認の観点から問題がある。
C: 医療機関で診療を行うには病歴等の要配慮個人情報の取得が不可欠。
D: 問診票で病歴を聞き取る前に、利用目的を明示し本人の同意を得る（正解）' WHERE question_id = 'Q3-021';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 匿名加工情報より加工の程度が軽く、データの有用性を保ちやすい（正解）
B: 仮名加工情報も個人情報保護法の規制対象であり、完全に外れるわけではない。
C: 仮名加工情報は第三者への提供が原則禁止されており、自由に提供できるわけではない。
D: 仮名加工情報に加工された場合、本人からの開示請求への対応義務は適用除外となる。' WHERE question_id = 'Q3-024';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 外部クラウドが常に安全とは限らず、契約内容や事業者の体制によって異なる。
B: 外部クラウド利用の場合は、データの外部送信に伴う第三者提供の可能性や委託先管理の観点から追加の検討が必要（正解）
C: 院内と外部では、データの管理主体やリスクが異なるため、対応も異なる。
D: 院内システムが必ずしもリスクが高いわけではなく、適切な管理がされていれば外部より安全な場合もある。' WHERE question_id = 'Q3-026';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 医療機関の経営はベンダーの役割ではない。
B: 患者への医療サービス提供は医療機関の役割であり、ベンダーの役割ではない。
C: サービスのセキュリティ対策、運用管理体制、障害対応などの安全管理措置（正解）
D: ITベンダーに医師免許は不要。医療行為を行うわけではない。' WHERE question_id = 'Q3-035';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 感染拡大を防ぐためネットワークから隔離し、バックアップからの復旧を試みる（正解）
B: 身代金を支払ってもデータが復旧する保証はなく、支払いは犯罪を助長するため推奨されません。
C: 感染端末をそのまま使い続けると、感染が拡大し被害が拡大する危険があります。
D: サイバー攻撃は関係機関への報告義務がある場合があり、隠蔽は不適切です。' WHERE question_id = 'Q3-057';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: AIの診断結果を参考にしつつ、最終的な診断は医師が責任を持って行う必要がある（正解）
B: AIの精度に関わらず、診断の最終判断と患者への説明は医師が行う必要があります。
C: 医療目的でAIを使用する場合も医師法の枠組みの中で運用される必要があります。
D: 診断・治療には医師の関与が必要であり、AIが医師を不要にするものではありません。' WHERE question_id = 'Q4-007';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: AI医療機器の性能向上に伴う変更手続きを迅速化すること（正解）
B: 輸入制限を目的とした制度ではありません。
C: IDATENはAI医療機器の開発を促進するための制度であり、禁止を目的としていません。
D: 承認制度は維持されており、すべての承認を不要にするものではありません。' WHERE question_id = 'Q4-009';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: AIの判断根拠や限界について、利用者が理解できる形で説明すること（正解）
B: 開発コストの公開は透明性確保の主眼ではありません。
C: 従業員名の公開は透明性確保の要件には含まれていません。
D: アルゴリズムの全公開は必須ではなく、知的財産保護との両立が認められています。' WHERE question_id = 'Q4-010';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 不正競争防止法は営業秘密の保護等を目的としており、臨床研究の規制法ではありません。
B: 製造物責任法は製品の欠陥による被害の責任を定めるものであり、臨床研究の実施要件ではありません。
C: 消費者契約法は消費者と事業者間の契約に関する法律であり、臨床研究とは直接関係しません。
D: 臨床研究法（正解）' WHERE question_id = 'Q4-012';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 医療AIは高リスクAIに分類される可能性が高く、厳格な要件が課される（正解）
B: EU AI法は医療分野を含む幅広い分野に適用されます。
C: 医療AIは健康や安全に影響を与える可能性があるため、低リスクではなく高リスクに分類される可能性が高いです。
D: EU市場でサービスを提供する場合、開発地域に関わらずEU AI法が適用されます。' WHERE question_id = 'Q4-020';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 市場シェアの最大化は経営目標であり、ガイドラインが求める責任の本質ではありません。
B: 競合より先にリリースすることよりも、安全性・信頼性の確保が優先されます。
C: AIの安全性・信頼性を確保し、適切な情報提供を行うこと（正解）
D: 開発期間の短縮は効率性の観点では重要ですが、安全性を犠牲にすべきではありません。' WHERE question_id = 'Q4-023';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 著作権の確認は法的には重要ですが、品質評価の主眼ではありません。
B: コストの把握は審査の主目的ではありません。
C: 学習データの量だけで承認が早まるわけではなく、質が重要です。
D: 学習データの偏りや品質がAIの判断精度や公平性に直接影響するため（正解）' WHERE question_id = 'Q4-024';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 開発企業の株価（正解）
B: リスクマネジメントの適切性は医療機器審査において必須の評価項目です。
C: AIの性能評価は審査の重要な項目です。
D: 学習データの品質と代表性はAIの信頼性に直結する重要な評価項目です。' WHERE question_id = 'Q4-029';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 国産・海外製を問わず、要件を満たせば対象となり得ます。
B: 画期的な医療機器として要件を満たせば対象となり得る（正解）
C: 要件を満たせばAI医療機器も対象となり得ます。
D: 全てのAI医療機器が自動的に対象になるわけではなく、要件を満たす必要があります。' WHERE question_id = 'Q4-030';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: AIが診断を行っても、医師の関与なく診療を行うことは医師法に違反します。
B: AIを使用しても対面診療の要件が自動的に免除されるわけではありません。
C: 遠隔診療でのAI使用は禁止されておらず、適切に活用することは可能です。
D: 遠隔診療においてもAIは補助ツールであり、診断・治療の判断は医師が行う必要がある（正解）' WHERE question_id = 'Q4-031';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 社内の技術テストは臨床研究には該当しません。
B: 薬事承認申請のための治験はGCP省令が適用されます。
C: 既存の匿名化データのみを用いた研究は、指針の適用対象外となる場合があります。
D: 新たに被験者を募集してAIの診断精度を検証する臨床研究（正解）' WHERE question_id = 'Q4-034';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: AIに関する意思決定や行動について、関係者に対して適切に説明できる状態を維持すること（正解）
B: 開発者の経歴公開は説明責任の定義には含まれません。
C: 料金内訳の開示は説明責任の主要な要素ではありません。
D: 技術的な仕組みの全公開は必須ではなく、知的財産保護とのバランスが認められています。' WHERE question_id = 'Q4-035';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 開発コストは経営上の考慮事項であり、臨床的妥当性とは異なる概念です。
B: UIの使いやすさは実用性に影響しますが、臨床的妥当性の本質ではありません。
C: AIの判断が実際の臨床現場で医療の質向上に寄与すること（正解）
D: 処理速度は重要な要素ですが、臨床的妥当性の最重要観点ではありません。' WHERE question_id = 'Q4-037';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 相談には所定の手数料が必要であり、全額補助されるわけではありません。
B: 相談により承認が自動的に得られるわけではなく、正式な審査が必要です。
C: 競合他社の申請内容は機密情報であり、相談で知ることはできません。
D: 開発段階で審査の考え方を確認でき、効率的な開発・申請が可能になる（正解）' WHERE question_id = 'Q4-043';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 学習データとは独立したデータでAIの性能を客観的に評価するため（正解）
B: 外部検証は学習後の評価に使用するものであり、学習速度の向上とは関係しません。
C: 外部検証データセットの使用はコスト削減が目的ではありません。
D: 外部検証の主目的は自社AIの性能評価であり、競合比較ではありません。' WHERE question_id = 'Q4-045';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 承認済み医療機器に限らず、幅広い保健医療分野のAIが対象です。
B: 診断・治療支援から健康管理、創薬支援まで幅広い医療・ヘルスケア分野のAI（正解）
C: 国内外を問わず、保健医療分野で使用されるAI全般が対象です。
D: 事務処理AIに限定されるものではありません。' WHERE question_id = 'Q4-051';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 企業の収益性は承認審査の評価項目ではありません。
B: 開発期間は承認審査で評価される項目ではありません。
C: 技術的新規性も考慮されますが、臨床的意義の評価はより広い視点を含みます。
D: AIの導入により患者や医療現場にどのようなメリットがもたらされるかを評価する（正解）' WHERE question_id = 'Q4-053';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 新規開発の促進は別の制度の目的です。
B: 価格適正化はGVPの範囲外です。
C: 売上向上はGVPの目的ではありません。
D: 製造販売した医療機器の安全性を市販後も継続的に確保すること（正解）' WHERE question_id = 'Q4-055';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 消費電力はバイアスとは無関係です。
B: プログラムエラー（バグ）とバイアスは異なる概念です。
C: 処理速度の問題はバイアスとは関係ありません。
D: 学習データや設計に起因し、特定の集団に対して不公平な判断をする傾向（正解）' WHERE question_id = 'Q5-001';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 画面のちらつきは技術的な表示の問題であり、ハルシネーションではありません。
B: 美しい画像の生成はハルシネーションとは関係ありません。
C: 高速処理はハルシネーションとは関係ありません。
D: AIが事実に基づかない誤った情報をあたかも正しいかのように生成すること（正解）' WHERE question_id = 'Q5-003';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 説明可能性は処理速度とは直接関係しません。
B: プログラムサイズとは関係がありません。
C: 開発コスト削減が説明可能性の主目的ではありません。
D: 医師や患者がAIの判断根拠を理解し、信頼性を評価できるようにするため（正解）' WHERE question_id = 'Q5-004';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 学習データから個人が特定される可能性や、入力データの漏えいリスク（正解）
B: 電力消費量はプライバシーとは関係ありません。
C: 処理速度の低下はプライバシーリスクではありません。
D: UIの複雑さはプライバシーリスクではありません。' WHERE question_id = 'Q5-007';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 診療時間の短縮は自律性に関する主要な懸念ではありません。
B: AIの判断が患者の意思決定に過度に影響し、患者自身が選択する余地が狭まる可能性（正解）
C: 治療費の増加は自律性への直接的な懸念ではありません。
D: 医師数の減少は自律性とは別の問題です。' WHERE question_id = 'Q5-009';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 善行は四原則の一つで、患者の最善の利益を追求することです。
B: 効率性（Efficiency）（正解）
C: 公正は四原則の一つで、医療資源の公平な分配などを指します。
D: 自律尊重は四原則の一つで、患者の自己決定権を尊重することです。' WHERE question_id = 'Q5-012';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 市場シェア拡大はリスクアセスメントの目的ではありません。
B: AIに関連するリスクを特定・評価し、適切な対策を講じること（正解）
C: 開発期間短縮はリスクアセスメントとは関係ありません。
D: コスト最小化はリスクアセスメントの主目的ではありません。' WHERE question_id = 'Q5-015';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 価格やコストは患者の医療判断に直接関係しません。
B: AIの判断には限界があり、最終判断は医師が行うこと（正解）
C: 開発企業の会社概要は、患者が意思決定するために必須の情報ではありません。
D: 学習データの詳細な統計情報は専門的すぎて患者の理解には適していません。' WHERE question_id = 'Q5-016';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 差分プライバシーは学習速度向上を目的としていません。
B: 学習データから個人を特定することを数学的に困難にすること（正解）
C: 消費電力とは関係ありません。
D: プライバシー保護が目的であり、精度向上ではありません（むしろトレードオフの関係）。' WHERE question_id = 'Q5-020';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 処理速度はリスク・便益評価の主要因ではありません。
B: AI導入による患者への便益が、想定されるリスクを上回ること（正解）
C: 企業の知名度は臨床的なリスク・便益評価とは関係ありません。
D: コスト最小化よりも、リスクと便益のバランスが優先されます。' WHERE question_id = 'Q5-024';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 情報量の少なさはハルシネーションの問題ではありません。
B: 文章の長さはハルシネーションの本質的な問題ではありません。
C: 生成時間は別の問題であり、ハルシネーションとは異なります。
D: 誤った医療情報が患者の健康被害につながる可能性があるため（正解）' WHERE question_id = 'Q5-026';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 説明を拒否することは患者の権利を尊重していません。
B: AIの判断が絶対というのは不正確であり、疑問を持つことは当然の権利です。
C: AIの出力に基づき、分かりやすい言葉で判断根拠を説明する努力をする（正解）
D: 医師としての説明責任を果たさず、不適切な対応です。' WHERE question_id = 'Q5-027';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: ハードウェアの物理的劣化はドリフトの主原因ではありません。
B: UIの古さは性能劣化とは関係ありません。
C: 医療環境や患者集団の変化により、学習データと実際のデータに乖離が生じること（正解）
D: 電源の不安定さはドリフトとは異なる問題です。' WHERE question_id = 'Q5-030';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: AIに意思がなくても、関与した人間や組織に責任が生じます。
B: 医師だけでなく、AI開発者・提供者の責任も検討されます。
C: 医師の注意義務と、AI開発者・提供者の製品責任が複合的に検討される（正解）
D: 患者の同意を得ていても、医療提供者の責任は免除されません。' WHERE question_id = 'Q5-032';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 開発チームの特定は別の問題です。
B: アカウント乗っ取りはメンバーシップ推論攻撃ではありません。
C: 特定の個人のデータがAIの学習に使われたかどうかを推測すること（正解）
D: パスワード推測は別のセキュリティ攻撃であり、メンバーシップ推論攻撃ではありません。' WHERE question_id = 'Q5-033';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: AIの提案を強制することは自律性の侵害です。
B: 患者に情報を提供しないことは自律性を無視しています。
C: AIの提案を含む複数の選択肢を示し、患者自身が決定できるよう支援する（正解）
D: 患者の選択を制限することは自律性に反します。' WHERE question_id = 'Q5-034';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: リスクの隠蔽はリスクコミュニケーションの目的に反します。
B: 誇張して導入を阻止することは適切なコミュニケーションではありません。
C: AIのリスクについて関係者と情報を共有し、相互理解を促進すること（正解）
D: リスクの無視は危険であり、リスクコミュニケーションの目的ではありません。' WHERE question_id = 'Q5-037';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 隠蔽は問題を深刻化させ、不適切な対応です。
B: マスコミ対応より患者安全が優先されます。
C: 責任追及より患者安全と原因究明が先です。
D: 関係者への報告と患者安全の確保を最優先に行う（正解）' WHERE question_id = 'Q5-042';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: Few-shotは処理速度向上とは直接関係しません。
B: 例を示すことで、AIが期待される出力形式やスタイルを理解しやすくなる（正解）
C: 消費電力削減の効果はありません。
D: 学習データの更新とは異なる概念です。' WHERE question_id = 'Q6-002';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 適切に使用すれば業務効率化に有用であり、一切使用禁止とする必要はありません。
B: 生成AIの出力を専門的知識に基づいて確認・修正してから使用する（正解）
C: 確認なしにそのまま使用することはリスクがあります。
D: 患者情報を外部AIに入力することはプライバシー上問題があります。' WHERE question_id = 'Q6-003';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 学習データの更新とは異なる概念です。
B: メモリ削減とは関係ありません。
C: CoTは回答速度向上を目的としたものではなく、むしろ推論過程を出力する分、回答は長くなる傾向があります。
D: AIに段階的に推論させることで、複雑な問題に対する回答精度が向上する（正解）' WHERE question_id = 'Q6-006';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 保険証番号などの個人識別情報の入力は避けるべきです。
B: 確認なしにそのまま渡すことは不適切です。
C: 一般的な紹介状の文例を参考に生成させ、医師が患者情報を加えて完成させる（正解）
D: カルテ情報をそのまま入力することはプライバシーリスクがあります。' WHERE question_id = 'Q6-007';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 適切に使用すれば文献要約に有用です。
B: 生成AIには知識のカットオフ日があり、最新論文を参照しているとは限りません。
C: 生成AIの要約が元文献の内容を正確に反映しているか、原典で確認する必要がある（正解）
D: 引用は正確性が重要であり、生成AIに任せるべきではありません。' WHERE question_id = 'Q6-008';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 自動的な最新情報検索機能とは異なります。
B: ロールプロンプティングは処理速度向上を目的としていません。
C: 「あなたは医療専門家です」等と役割を設定することで、専門的な視点からの回答を促せるため（正解）
D: 消費電力とは関係ありません。' WHERE question_id = 'Q6-009';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 適切に使用し検証すれば有用であり、使用中止は過剰反応です。
B: 確認なしにそのまま患者に説明することは危険です。
C: 複数AIで一致しても正しいとは限らず、公式情報源での確認が必要です。
D: 添付文書や医薬品情報データベースで出力内容の正確性を確認する（正解）' WHERE question_id = 'Q6-010';
UPDATE questions SET correct_answer = 'C', incorrect_explanation = 'A: 生成AIは医学用語を一定程度理解できます。
B: 生成AIは多言語翻訳が可能です。
C: 生成AIには知識のカットオフ日があり、最新の文献を網羅的に検索できない可能性がある（正解）
D: 生成AIは表形式のデータも出力可能です。' WHERE question_id = 'Q6-017';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 生成AIの学習データに含まれる最新の情報の日付であり、それ以降の情報は含まれていない（正解）
B: メンテナンス終了日でもありません。
C: 1日の質問上限とは異なる概念です。
D: 利用契約の終了日ではありません。' WHERE question_id = 'Q6-018';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: 一般的な受診案内のテンプレートを生成させ、内容を確認してから使用する（正解）
B: 個人情報の入力はプライバシーリスクがあります。
C: 確認なしの配布は内容の正確性を保証できません。
D: 予約管理は業務システムの範疇であり、生成AIの適切な用途ではありません。' WHERE question_id = 'Q6-027';
UPDATE questions SET correct_answer = 'A', incorrect_explanation = 'A: この論文の目的、方法、結果、結論を200文字程度で要約してください（正解）
B: 論文の正否判断は複雑な専門的評価が必要であり、AIに任せるべきではありません。
C: AIは「暗記」という行為はできず、不適切な指示です。
D: 「教えてください」は漠然としており、期待する形式の要約が得られにくいです。' WHERE question_id = 'Q6-028';
UPDATE questions SET correct_answer = 'B', incorrect_explanation = 'A: 市場動向や株価は業務利用とは関係ありません。
B: 生成AIの限界とリスク、入力禁止情報、出力の検証方法（正解）
C: 企業の歴史は実務利用に直結しません。
D: 技術的詳細は利用者教育として必須ではありません。' WHERE question_id = 'Q6-029';
UPDATE questions SET correct_answer = 'D', incorrect_explanation = 'A: 例を示さないのはZero-shotであり、Few-shotとは異なります。
B: 例は多すぎると逆効果になる場合があります。
C: 1個の例（One-shot）より複数の例（Few-shot）の方が効果的な場合が多いです。
D: 2〜5個程度の質の高い例を示すことが効果的であり、多すぎると逆効果になる場合もある（正解）' WHERE question_id = 'Q6-034';
