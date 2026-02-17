# Henry EMR 開発ガイドライン (Core Rules v4.59)

<!-- 📝 UPDATED: v4.52 - サブエージェント活用ルール追加 -->

> このドキュメントはAIアシスタントとの協働開発における必須ルール集です。HenryCore APIの詳細は `henry_core.user.js` 冒頭のAPI目次と実装を参照。

---

## 1. Henry固有のルール (Henry-Specific Rules)

### ガイドラインの更新

**YOU MUST**: CLAUDE.mdを変更したら、その都度コミットすること（変更履歴はgit logで管理）。

### プロンプト階層 (Instruction Hierarchy)

指示の重要度は3段階で定義されている：

#### NEVER（絶対禁止）

セキュリティ・安全性の境界。例外なし。

- PII（個人情報）を `localStorage`, `IndexedDB`, `GM_setValue` に平文保存してはならない
- トークン等の秘匿情報を `console.log` に出力してはならない
- `.sc-xxxx` などのランダムなクラス名や XPath をセレクタに使用してはならない
- ユーザー操作なしでの自動スクロールやフォーカス奪取をしてはならない

#### YOU MUST（必須要件）

基本的に遵守すべき要件。例外は稀。

- エラー時は必ず `console.error('[SCRIPT_NAME]', ...)` で原因を出力すること
- SPA遷移時には全ての MutationObserver、タイマー、AbortController を破棄すること
- APIレスポンスがエラー/想定外/null の場合は即停止すること（再試行しない）
- バージョン管理はセマンティックバージョニング（x.y.z）に従うこと
- `@match https://henry-app.jp/*` を使用すること

#### IMPORTANT（重要な考慮事項）

推奨事項。状況に応じた判断は許容。

- パフォーマンスのため、一度だけ待つなら `waitForElement` を推奨
- DOM依存を避け、`HenryCore` API経由でデータ取得を推奨
- 純粋関数として切り出すことでテスト容易性を向上
- `data-testid`、`role`、`aria-*` 属性の使用を推奨

---

## 2. Henry開発の必須ルール (Core Development Rules)

### 非侵入型UXの徹底

**IMPORTANT**: 「ぼかしオーバーレイ」等の視覚効果を伴うナビゲーションは、ユーザーのクリック操作を起点とする場合のみ許可。

### 停止の原則とログの切り分け

| 視点 | ルール |
|------|--------|
| ユーザー視点 | UIを出さない、操作を継続させない（沈黙して停止） |
| 開発者視点 | `console.error` で原因を特定可能にする |

**補足：停止の統一ルール**

- APIレスポンスがエラー / 想定外の形式 / null の場合も即停止（再試行しない）
- 「静かに終了」= Promise は `resolve(null)` で正常終了させ、呼び出し元で null チェックを行う
- エラーログには必ず `[SCRIPT_NAME]` プレフィックスを付ける
- 同一エラーは1回だけ出力する（ループ内での連打禁止）

### PII（個人情報）の永続化禁止

**NEVER**: `localStorage`, `IndexedDB`, `GM_setValue` 等のブラウザストレージに、患者の氏名・連絡先・カルテ内容などの個人情報を平文で保存すること。

**IMPORTANT**: 一時的なキャッシュが必要な場合は、メモリ上の変数（TTLCacheなど）のみを使用すること。

### クリーンアップ

**YOU MUST**: SPA遷移時（`henry:navigation` / `popstate`）には、全ての MutationObserver、タイマー、非同期処理を完全に破棄すること。

**使用するAPI**:
- `utils.createCleaner()` - 破棄対象の一括管理
- `utils.subscribeNavigation()` - 画面遷移時の自動クリーンアップ

実装例は `henry_core.user.js` を参照。

---

## 3. 基本的なコードパターン (Essential Patterns)

### セレクタ戦略

**YOU MUST**: `data-testid`、`role`、`aria-*` 属性、または不変のテキストコンテンツを基準にすること。

**IMPORTANT**: モーダル等は `document.body` 直下に現れるため、コンテナ外へのフォールバックを許容する設計にすること。

### HenryCore 使用ガイドライン

**前提条件**: HenryCore スクリプトが先に読み込まれていること。

**YOU MUST**: HenryCore APIを使用する前に、`henry_core.user.js` 冒頭のAPI目次と実装を確認すること（プロパティ名、関数の有無など）

#### 使用すべき場面

| 場面 | 使用するAPI | 理由 |
|------|------------|------|
| GraphQL呼び出し | `query()` | エンドポイント自動判別、エラー自動ログ |
| 患者UUID取得 | `getPatientUuid()` | DOM解析より確実、タイミング問題を回避 |
| SPA遷移時のクリーンアップ | `utils.createCleaner()` | メモリリーク・二重実行防止 |
| プラグイン登録 | `registerPlugin()` | Toolbox自動連携 |
| Google API連携 | `modules.GoogleAuth` | トークン管理の一元化 |

#### 禁止事項

**NEVER**:
- 直接 `fetch()` でGraphQL APIを呼ぶ → `query()` を使う
- URLやDOMから患者UUIDを解析する → `getPatientUuid()` を使う
- `HenryToolbox.register()` を直接呼ぶ → `registerPlugin()` を使う
- トークン等の秘匿情報をログ出力する
- ハッシュ方式（APQ）でGraphQL APIを呼ぶ → フルクエリ方式を使う

#### エラーハンドリング

**YOU MUST**: `query()` は失敗時に例外を投げる。try-catchで処理し、静かに終了すること。コード例は `NOTES.md` の「HenryCore使用パターン」を参照。

#### OAuth認証

**YOU MUST**: OAuth認証が必要な場合は、`alert()` で理由を伝えてから設定ダイアログや認証画面を開くこと。詳細は `NOTES.md` の「OAuth認証フロー」を参照。

#### fetchインターセプト

**IMPORTANT**: fetchインターセプトの実装パターンは `NOTES.md` の「fetchインターセプト実装パターン」を参照すること

#### API詳細

`henry_core.user.js` 冒頭のAPI目次と各関数の実装を参照。

### GraphQL API 開発ルール

**YOU MUST**: GraphQL APIを使用する際は、コードを書く前にチェックリストを確認すること。

詳細な開発手順、チェックリスト、エラー対処法は `NOTES.md` の「GraphQL API 開発ガイド」を参照。

**IMPORTANT**: GraphQL mutationで変数型（`$input: SomeInput!`）がエラーになる場合は、インライン方式を使うこと。詳細は `NOTES.md` の「GraphQL インライン方式」を参照。

### SPA遷移対応（必須）

**YOU MUST**: Henry本体（henry-app.jp）で動作するスクリプトは、`subscribeNavigation` パターンを使用すること。

**理由**: HenryはSPAのため、ページ遷移してもリロードされない。クリーンアップしないとメモリリークや予期しない動作の原因となる。

詳細とコード例は `NOTES.md` の「SPA遷移対応パターン」を参照。

### Apollo Client による画面更新

**IMPORTANT**: データ変更後にHenryのUIを更新したい場合は、`__APOLLO_CLIENT__.refetchQueries()` を使用する。詳細とクエリ名一覧は `NOTES.md` の「Apollo Client による画面更新」を参照。

### UI実装

**YOU MUST**: 新規スクリプト作成時は `HenryCore.ui.*` の共通UI関数を使用すること。

**YOU MUST**: z-indexは階層ルールに従うこと（モーダル=1500、常駐UI=1400）。

**YOU MUST**: HTML/CSS再現時は推測せず、スクリーンショット・HTML構造・computedStyleを取得してから実装すること。

詳細（関数一覧、z-index表、再現手順）は `NOTES.md` の「UI実装ガイド」を参照。

### パフォーマンス

**IMPORTANT**: MutationObserverの監視範囲はなるべく狭くすること（body全体監視は避ける）。

**IMPORTANT**: 処理フローの最適化を常に検討すること（並列化、プリフェッチ、キャッシュ活用）。

詳細は `NOTES.md` の「パフォーマンス最適化」を参照。

#### サーバー負荷の軽減

**IMPORTANT**: スクリプト設計時は、Henryサーバーへの負荷を最小限に抑えること。

| ルール | 詳細 |
|--------|------|
| 不要なAPI呼び出しの排除 | 同一データの重複取得を避け、結果をメモリキャッシュ（TTLCacheなど）して再利用する。GraphQLのフィールドは必要最小限に絞る |
| ポーリング・定期実行の制御 | `setInterval` による定期的なAPI呼び出しは原則禁止。必要な場合は十分なインターバル（30秒以上）を設け、ページ非表示時（`document.hidden`）は停止する |
| イベント駆動のAPI呼び出しにデバウンス | MutationObserver・スクロール・入力イベントからのAPI呼び出しにはデバウンスを適用し、短時間の連打を防ぐ |
| 並列リクエストの上限 | 一度に発行する並列APIリクエストは最大3〜5本に制限。大量データの一括取得は逐次処理またはバッチ化する |
| エラー時の再試行禁止 | APIエラー時は再試行せず即停止（既存ルール「停止の原則」と同様） |

### Google連携

#### Google Docs文書作成

**YOU MUST**: Google Docsで文書を作成するスクリプトは、出力先フォルダとメタデータのルールに従うこと：
- 詳細は `NOTES.md` の「Google Docs 文書作成ルール」を参照
- 新規スクリプト作成時は、実装前にユーザーに確認すること

### Tampermonkey スクリプト作成

#### サンドボックス対策

**YOU MUST**: `@grant GM_*` を使用する場合、`@grant unsafeWindow` も追加し、`unsafeWindow` 経由で HenryCore にアクセスすること。コード例は `NOTES.md` の「HenryCore使用パターン」を参照。

#### メタデータ設定

**YOU MUST**: 新規スクリプト作成時は以下を設定すること：
- `@updateURL` と `@downloadURL` にGitHub raw URL（`https://raw.githubusercontent.com/shin-926/Henry/main/<filename>.user.js`）
- `@version` をセマンティックバージョニング形式（x.y.z）

**YOU MUST**: コミット時は `@version` を更新（バグ修正: パッチ、機能追加: マイナー、破壊的変更: メジャー）

#### バージョン定数

**YOU MUST**: スクリプト内でバージョンを参照する場合は `GM_info.script.version` を使用すること。コード例と理由は `NOTES.md` の「HenryCore使用パターン」を参照。

---

## 4. デバッグとワークフロー (Debug & Workflow)

### デバッグ手順（原因究明ファースト）

1. **現状把握**: ログの確認、無言停止の確認
2. **要因切り分け**: DOM変化、非同期タイミング、データ不整合
3. **仮説検証**: 根拠のある修正のみを行う

**YOU MUST**: エラー発生時は、推測で別の可能性を提案する前に、まず実際のエラー内容を調査すること。APIエラーならレスポンスボディを確認し、具体的なエラーメッセージに基づいて修正する。

**IMPORTANT**: コード固有の課題やTODOは、該当コード内にTODOコメントとして残すこと（例: `// TODO: 動作確認後にこのログを削除`）

### テスト・動作確認

#### 自律的テスト・動作確認フロー

**YOU MUST**: コード修正後は以下のフローを自律的に実行すること：

1. **コンソール確認**（chrome-devtools-mcp）
   - `list_console_messages` でエラー確認
   - 必要に応じて `list_network_requests` でAPI呼び出し確認

2. **完了報告**
   - 修正内容をユーザーに報告
   - 動作確認が必要な場合はユーザーに確認を促す

**例外**:
- ドキュメントのみの変更
- chrome-devtools-mcp が起動していない場合は起動を促す

**NEVER**: 実患者データでテストを実行すること。必ずテスト患者を使用する。

**IMPORTANT**: 入院患者でのテストが必要な場合は、ユーザーに依頼して手動で確認してもらう。

**IMPORTANT**: 新機能追加やバグ修正時、テストファイルの作成・更新が有効と判断した場合は、作成前にユーザーに確認すること。

#### 曖昧なテスト指示への対応

**YOU MUST**: 「動作確認して」「テストして」等の曖昧な指示を受けた場合は、具体的に何を確認すべきか質問すること：
- 正常系: どの操作が成功すればOKか
- 異常系: どのエラーケースを確認すべきか
- 境界値: 空データ、大量データ等の確認が必要か

#### 自律作業中の報告・相談ルール

**YOU MUST**: 自律的に調査・デバッグ・テストを行う際は、以下のタイミングで報告・相談すること：

1. **方向転換時**（必須）
   - 最初の仮説と異なる原因を疑い始めたら、進む前に報告
   - 「○○が原因だと思ったが、△△かもしれない。この方向で調べてよいか？」
   - 確認なしに「やっぱりこっちかも」と進まない

2. **2回失敗時**（必須）
   - 同じ問題に2回トライして解決しなければ立ち止まる
   - 試したこと・結果を報告し、次の方針を相談
   - 必要に応じて「/clearして新しいプロンプトで再開」を提案

3. **長時間作業時**（推奨）
   - 5分以上かかる作業では途中で進捗報告

---

## 5. 参照ドキュメント (Reference)

### HenryCore API

`henry_core.user.js` 冒頭のAPI目次と各関数の実装を参照。

**YOU MUST**: APIを変更・追加した場合は、`henry_core.user.js` 冒頭のAPI目次を更新すること。

### GraphQL API

chrome-devtools-mcpでリアルタイム調査。静的リファレンスは廃止。

### 調査メモ・実装詳細

`NOTES.md` - 調査結果、API仕様メモ、実装詳細など。

### chrome-devtools-mcp（ブラウザ連携）

`NOTES.md` の「chrome-devtools-mcp 起動手順」セクションを参照。

**機能**: Claude Codeがブラウザを直接操作・監視できる
- DOM確認、ボタンクリック、フォーム入力
- ネットワークリクエストのキャプチャ（GraphQL API調査）
- コンソール出力の確認（スクリプト動作確認）

**YOU MUST**: ユーザーから「chrome-devtoolsの起動方法」を聞かれたら、`NOTES.md` の手順を参照して回答すること。

**YOU MUST**: DevTools MCPのツール（`list_network_requests`, `list_console_messages`, `take_snapshot` 等）を使用する前に、必ず `list_pages` で対象ページが `[selected]` になっているか確認すること。複数タブが開いている場合、意図しないページが選択されていることが多い。

### バージョン管理

**YOU MUST**: 全てのスクリプトはセマンティックバージョニング（x.y.z）に従うこと。

**YOU MUST**: Henry Core の仕様変更に対応した場合は、必ずバージョンを上げること（例: パッチバージョン z の加算）。

### 動的スクリプトローダー (Henry Loader)

GitHubから各スクリプトを動的に読み込む仕組み。詳細は `NOTES.md` の「Henry Loader」セクションを参照。

| ファイル | 用途 | 読み込み元 |
|---------|------|-----------|
| henry_loader.user.js | 本番用 | GitHub main |
| henry_loader_dev.user.js | 開発用 | localhost:8080 |

**ポイント**:
- 1ファイルで Henry/予約/Google Docs すべてに対応
- GM_*ストレージを全ドメインで共有（クロスタブOAuth通信が可能）
- Google Docs側のコード変更は GitHub push 後に反映

#### スクリプト読み込み方式

| スクリプト | 読み込み方式 | 変更反映方法 |
|-----------|-------------|-------------|
| henry_core.user.js | `@require`（静的） | **GitHubプッシュ必須** |
| henry_google_drive_bridge.user.js | `@require`（静的） | **GitHubプッシュ必須** |
| その他のスクリプト | `eval()`（動的） | ローカル編集後リロード |

**henry_coreが`@require`である理由**:
1. **実行順序の保証**: `@run-at document-start`で他のスクリプトより先に実行される必要がある
2. **Google DocsのCSP対策**: Content Security Policyにより`eval()`が使えないため、事前読み込みが必須

**YOU MUST**: `henry_core.user.js` または `henry_google_drive_bridge.user.js` を変更した場合は、GitHubにプッシュしないと反映されない（ローカル編集だけでは不可）

#### 開発環境

**IMPORTANT**: 開発中はローカルサーバーからスクリプトを取得している（GitHubからではない）
- Henry Loaderがローカルサーバー（`http://localhost:8080`）から最新版を取得する設定になっている
- ローカルファイルを修正すれば、ページリロードでTampermonkey上にも即座に反映される
- developブランチへのプッシュはバックアップ目的（スクリプト更新とは無関係）
- mainブランチへのプッシュは本番リリース時のみ
- **「GitHubにプッシュしていないから更新されていない」という誤解をしないこと**

**YOU MUST**: 「ローカルサーバーを起動して」と言われたら、`NOTES.md` の「ローカル開発サーバー」セクションを参照して対応すること。

#### Loader修正時

**YOU MUST**: Loader（henry_loader.user.js / henry_loader_dev.user.js）を修正した時は、ファイルの内容を `pbcopy` でクリップボードにコピーすること（ユーザーがTampermonkeyに貼り付けられるように）。他のスクリプトはLoader経由で自動更新されるためコピー不要。

#### ベータ版スクリプト

**YOU MUST**: 新規スクリプト作成時は、まずベータ版としてリリースすること：
- manifest.jsonで `beta: true` を設定
- 開発環境で十分なテスト後、ユーザー確認を経て正式版（beta削除）に昇格

**YOU MUST**: ベータ版スクリプト（ラベルに「ベータ版」を含むもの）は本番環境では配信しないこと：
- manifest.jsonで `beta: true` に設定する（`enabled: false` ではない）
- 開発版ローダーではロードされ、本番ローダーではスキップされる

### ツール連携

#### Gemini MCP

**IMPORTANT**: 「正解」が存在しない主観的な判断が必要な場合は、Gemini MCPに相談すること：
- コードの品質評価、設計の良し悪し、リファクタリングの方針など
- 複数のアプローチがあり、どれが適切か意見が欲しいとき
- 実装のレビューやフィードバックが欲しいとき
- セッションJSONLを渡すことで、文脈を理解した上でのアドバイスが得られる

**YOU MUST**: Gemini MCP（`ask-gemini`）を使用する際は、常に `model: "gemini-3-pro-preview"` を指定すること。

**IMPORTANT**: Gemini MCPにレビューを依頼するときは、セッションのJSONLファイルを渡すこと：
- セッション履歴は `~/.claude/projects/-Users-shinichiro-Documents-Henry/<session-id>.jsonl` に保存されている
- 最新のセッションファイルは `ls -lt ~/.claude/projects/-Users-shinichiro-Documents-Henry/*.jsonl | head -1` で確認
- Geminiへの依頼例：
  ```
  @/Users/shinichiro/.claude/projects/-Users-shinichiro-Documents-Henry/<session-id>.jsonl
  @/Users/shinichiro/Documents/Henry/<対象ファイル>
  このセッションで行った修正をレビューしてください
  ```
- **理由**: JSONLファイルを渡すことで、Geminiがセッションの文脈を理解した上でレビューできる

### スクリプト一覧

| カテゴリ | ファイル名 | 説明 |
|---------|-----------|------|
| **基盤** | henry_core.user.js | 実行基盤（GoogleAuth統合、API、ユーティリティ） |
| | henry_toolbox.user.js | プラグインUI（ドラッグ＆ドロップ対応） |
| **照射オーダー** | henry_imaging_order_helper.user.js | 部位・方向選択UI追加 |
| **予約連携** | henry_reserve_integration.user.js | Henry⇔予約システム双方向連携（自動印刷含む） |
| | reserve_calendar_ui.user.js | 予約カレンダーUIカスタム |
| **病名・オーダー** | henry_disease_register.user.js | 高速病名検索・登録（病名一覧表示統合） |
| | henry_order_history.user.js | 患者オーダー履歴表示 |
| **カルテ** | henry_hospitalization_search.user.js | カルテ記録検索（入院・外来） |
| | henry_karte_input_helper.user.js | カルテ入力支援（手所見テンプレート） |
| | henry_rehab_instruction.user.js | リハビリ指示（外来）記事作成 |
| | henry_rehab_order.user.js | 外来リハビリオーダー作成 |
| **業務効率化** | henry_auto_approver.user.js | 承認待ちオーダー一括承認 |
| | henry_login_helper.user.js | ログイン入力補助 |
| | henry_set_search_helper.user.js | セット展開クイック検索 |
| | henry_reception_filter.user.js | 外来受付フィルタ（未完了のみ） |
| | henry_memo.user.js | メモ帳（タブ管理・保存） |
| **Google連携** | henry_google_auth_settings.user.js | Google OAuth認証の設定・管理 |
| | henry_google_drive_bridge.user.js | Google Drive API直接連携 |
| | henry_ikensho_form.user.js | 主治医意見書作成フォーム |
| | henry_referral_form.user.js | 診療情報提供書フォーム |
| | henry_application_form_ritsurin.user.js | りつりん病院診療申込書 |
| | henry_application_form_sekijuji.user.js | 高松赤十字病院診療申込書 |
| | henry_application_form_saiseikai.user.js | 香川県済生会病院診療申込書 |
| | henry_application_form_heiwa.user.js | 高松平和病院診療申込書 |
| | henry_application_form_minna.user.js | 高松市立みんなの病院診療申込書 |
| **開発用** | henry_test_helper.user.js | テストデータ自動入力 |

---

## 6. カスタムルール (Custom Rules)

> **📝 このセクションは追記専用**: 新しいルールを追加する際の一時的な置き場として使用。定期的に適切なセクションに整理・振り分けること。

### 追加ルール

---

## 変更履歴

`git log -- CLAUDE.md` を参照。

---

## 🔔 タスク管理 (Task Management)

タスクは **GitHub Issues** で一元管理しています。

**確認方法**:
- GitHub: https://github.com/shin-926/Henry/issues
- GitHub MCP: `mcp__github__list_issues` で取得可能

> **AI向け指示**: セッション開始時に `list_issues` でオープンなIssueを確認すること。タスク完了時は `fixes #XX` をコミットメッセージに含めてIssueを自動クローズすること。

### Issue記載ガイドライン

#### 必須項目

| 項目 | 内容 |
|------|------|
| タイトル | 何をするか一目で分かる簡潔な文（例: 「ツールボックスのドラッグ位置が保存されない」） |
| 概要 | 問題の背景、目的、期待する動作 |
| 再現手順 | バグの場合、再現ステップを番号付きで |
| 関連ファイル | 影響を受けるファイルパス、関数名 |

#### 調査メモの記録

**IMPORTANT**: 試したこと・ダメだったことを記録する。同じ失敗を繰り返さないため。

```markdown
## 調査メモ

### 試したこと

**1. ○○を試す** ❌
- やったこと: ...
- 結果: 変わらず。○○が原因ではなかった

**2. △△を確認** ✅
- やったこと: console.logで確認
- 結果: ここが原因だった

### 結論
○○を修正する必要あり
```

#### テンプレート

```markdown
## 概要
[問題の説明 / 追加したい機能]

## 再現手順（バグの場合）
1. ○○画面を開く
2. △△をクリック
3. エラーが発生

## 期待する動作
[正しい動作の説明]

## 技術メモ
- 関連ファイル: `henry_xxx.user.js:123`
- 関連API: `getPatientUuid()`

## 調査メモ
[試したこと、分かったことを随時追記]

## チェックリスト
- [ ] 原因調査
- [ ] 修正実装
- [ ] 動作確認
```
