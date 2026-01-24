# Henry EMR 開発ガイドライン (Core Rules v4.26)

<!-- 📝 UPDATED: v4.26 - 開発環境ローカルサーバー運用ルール追加 -->

> このドキュメントはAIアシスタントとの協働開発における必須ルール集です。HenryCore APIの詳細は `henry_core.user.js` 冒頭のAPI目次と実装を参照。

---

## 1. AI協働開発のルール (AI Collaboration Protocol)

### コミュニケーション方針

#### 曖昧な依頼を受けたときの振る舞い

推測で作業を進める前に、以下の観点で不明確な点があれば質問する：

1. **目的・背景**: なぜこれが必要か？何を解決したいのか？
2. **スコープ**: どこまでやるか？既存コードへの影響範囲は？
3. **制約条件**: 使ってはいけない技術、変更してはいけない部分
4. **出力形式**: コードだけ？説明付き？ファイル分割の粒度は？
5. **優先順位**: 速度重視？保守性重視？完璧さより動くもの優先？

#### 質問の仕方

- 一度に聞くのは**最大2〜3個**に絞る
- Yes/Noや選択肢で答えられる形式を優先する
- 「AとBどちらがいいですか？」「○○という理解で合っていますか？」
- 自分の推測や仮定を示した上で確認を求める

#### 質問すべきタイミング

- 複数の実装アプローチがあり、どれが好みか不明なとき
- 既存のコード規約やパターンと異なる方法を取りそうなとき
- 作業範囲が大きく、方向性を間違えると手戻りが大きいとき
- 要件に矛盾や不整合がありそうなとき

#### 質問しなくてよいとき

- 明らかに些細な実装詳細（変数名の細かい違いなど）
- 過去の会話やこのドキュメントから判断できること
- 標準的なベストプラクティスで対応できること

#### 作業前の確認テンプレート

大きめのタスクを始める前に、以下を簡潔に提示して確認を取る：

```
【理解した内容】
- 目的: ○○
- やること: ○○
- やらないこと: ○○
- 使う技術/パターン: ○○

これで進めてよいですか？
```

#### フィードバックの求め方

作業完了後、必要に応じて：
- 「期待と違う点があれば教えてください」
- 「この方針で他の部分も進めてよいですか？」

作業中は、要所で「何をしようとしているか」「なぜそうするのか」を簡潔に説明すること。

#### クラッシュ報告時の対応

**YOU MUST**: ユーザーから「クラッシュした」と報告を受けた場合は、まず (1) どこまで作業が完了しているか確認し、(2) 残りの作業を明確にしてから再開すること。

### ガイドラインの更新

**YOU MUST**: ユーザーから新しいルールの追加指示があった場合、必ず **カスタムルール** セクションに追記すること。

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

### コード出力の制約 (Code Generation Protocol)

**原則**: ユーザーからの明示的な指示（例：「コードを書いて」「実装して」）があるまで、コピー＆ペーストしてそのまま使える「完全な実装コード」を出力してはならない。

**YOU MUST**: コードを修正する前に、まず修正内容をユーザーに確認すること。確認なしに直接編集しない。

**禁止事項**: 議論の途中で、ユーザーが求めていないのに「修正した全体のコードはこちらです」と長いコードブロックを提示すること。

**例外（許可されるコード）**: ロジックや処理の流れを説明するための短いコード片（数行程度のスニペット）や疑似コードは、理解を助けるために積極的に提示してよい。

**判断基準**:

- ✅ OK: 「例えば、このように `filter` を使うイメージです」といった説明用の抜粋
- ❌ NG: 「修正が完了しました。以下のスクリプト全体を貼り付けてください」といった完成品の提示（指示があるまで待機）

### コード出力の順序 (Code Output Order)

**原則**: コードブロックを出力する際は、説明文を**先に**、コードを**最後に**配置する。コードブロックの後に説明文を書かない。

**理由**: コードブロックの後に説明文があると、ユーザーがコピペする際に余計なテキストが混入し、シンタックスエラーの原因となる。

**判断基準**:

- ✅ OK: 説明 → 変更点 → コードブロック（終了）
- ❌ NG: コードブロック → 変更点 → 説明

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

**YOU MUST**: `query()` は失敗時に例外を投げる。try-catchで処理し、静かに終了すること。

```javascript
try {
  const result = await HenryCore.query(QUERY, { input: { uuid } });
  if (!result.data?.getPatient) return null;
} catch (e) {
  console.error('[SCRIPT_NAME]', e.message);
  return null;
}
```

#### API詳細

`henry_core.user.js` 冒頭のAPI目次と各関数の実装を参照。

### SPA遷移対応（必須）

**YOU MUST**: Henry本体（henry-app.jp）で動作するスクリプトは、`subscribeNavigation` パターンを使用すること。

**理由**: HenryはSPAのため、ページ遷移してもリロードされない。クリーンアップしないとメモリリークや予期しない動作の原因となる。

詳細とコード例は `NOTES.md` の「SPA遷移対応パターン」を参照。

### Tampermonkey スクリプト作成

#### サンドボックス対策

**YOU MUST**: `@grant GM_*` を使用する場合、`@grant unsafeWindow` も追加し、`unsafeWindow` 経由で HenryCore にアクセスすること。

```javascript
const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
const core = pageWindow.HenryCore;
```

#### メタデータ設定

**YOU MUST**: 新規スクリプト作成時は以下を設定すること：
- `@updateURL` と `@downloadURL` にGitHub raw URL（`https://raw.githubusercontent.com/shin-926/Henry/main/<filename>.user.js`）
- `@version` をセマンティックバージョニング形式（x.y.z）

**YOU MUST**: コミット時は `@version` を更新（バグ修正: パッチ、機能追加: マイナー、破壊的変更: メジャー）

#### バージョン定数

**YOU MUST**: スクリプト内でバージョンを参照する場合は `GM_info.script.version` を使用すること。

```javascript
const VERSION = GM_info.script.version;
const SCRIPT_NAME = 'MyScript';

// ... スクリプト処理 ...

console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
```

**理由**: `@version` メタデータとコード内のバージョン文字列を二重管理すると不整合が起きやすい。`GM_info.script.version` を使うことで、メタデータの `@version` のみを更新すれば自動的にログ出力等にも反映される。

**補足**: `@grant none` でも `GM_info` は利用可能（Tampermonkey標準機能）。

---

## 4. デバッグとワークフロー (Debug & Workflow)

### デバッグ手順（原因究明ファースト）

1. **現状把握**: ログの確認、無言停止の確認
2. **要因切り分け**: DOM変化、非同期タイミング、データ不整合
3. **仮説検証**: 根拠のある修正のみを行う

**YOU MUST**: エラー発生時は、推測で別の可能性を提案する前に、まず実際のエラー内容を調査すること。APIエラーならレスポンスボディを確認し、具体的なエラーメッセージに基づいて修正する。

### 推奨ワークフロー

**Explore → Plan → Code → Commit**

1. **Explore**: 関連ファイルを読み、既存の実装パターンを理解
2. **Plan**: 詳細な実装計画を立て、ユーザーに確認
3. **Code**: 計画に基づいて実装
4. **Commit**: テスト・確認後にコミット

**IMPORTANT**: 探索・計画をスキップして直接コードを書くと品質が低下する。

### 問題解決のアプローチ (Problem-Solving Approach)

複雑な問題に取り組む際は、以下のプロセスを明示的に踏むこと：

1. **問題の分解**: 大きな問題を小さな部分問題に分ける
2. **仮定の明示**: 前提条件や制約を言語化する
3. **複数案の検討**: 1つの解法に飛びつかず、少なくとも2つのアプローチを比較する
4. **段階的な検証**: 各ステップの結果を確認してから次へ進む

**IMPORTANT**: 「とりあえず動くコードを書く」前に、上記のプロセスを経ること。特に以下の場合は必須：
- バグの原因が不明なとき
- 複数の実装方法があるとき
- 要件が複雑または曖昧なとき

**理由**: 中間推論を明示することで論理の飛躍を防ぎ、手戻りを減らす。

**YOU MUST**: 問題を解決するときは「とりあえず動けばいい」という一時しのぎではなく、原因を理解して根本的に対処すること：
- 「なぜこうなっているのか」を先に調べる
- 表面的な症状を消すのではなく、本質的な原因に対処する
- ワークアラウンドは最終手段。まず正攻法を探す

---

## 5. 参照ドキュメント (Reference)

### HenryCore API

`henry_core.user.js` 冒頭のAPI目次と各関数の実装を参照。

**YOU MUST**: APIを変更・追加した場合は、`henry_core.user.js` 冒頭のAPI目次を更新すること。

### GraphQL API

chrome-devtools-mcpでリアルタイム調査。静的リファレンスは廃止。

### 調査メモ・実装詳細

`NOTES.md` - 調査結果、API仕様メモ、実装詳細など。保留タスクの詳細情報もここに記載。

### chrome-devtools-mcp（ブラウザ連携）

`NOTES.md` の「chrome-devtools-mcp 起動手順」セクションを参照。

**機能**: Claude Codeがブラウザを直接操作・監視できる
- DOM確認、ボタンクリック、フォーム入力
- ネットワークリクエストのキャプチャ（GraphQL API調査）
- コンソール出力の確認（スクリプト動作確認）

**YOU MUST**: ユーザーから「chrome-devtoolsの起動方法」を聞かれたら、`NOTES.md` の手順を参照して回答すること。

### バージョン管理

**YOU MUST**: 全てのスクリプトはセマンティックバージョニング（x.y.z）に従うこと。

**YOU MUST**: Henry Core の仕様変更に対応した場合は、必ずバージョンを上げること（例: パッチバージョン z の加算）。

### 動的スクリプトローダー (Henry Loader)

GitHubから各スクリプトを動的に読み込む仕組み。Tampermonkeyに**ローダー1つだけ**をインストールすれば全スクリプトが使える。

| ファイル | 用途 | 参照ブランチ |
|---------|------|-------------|
| henry_loader.user.js | 本番用 | main |
| henry_loader_dev.user.js | 開発用（デバッグログ有効） | develop |
| manifest.json | スクリプト定義（読み込み順序・対象ホスト） | - |

**メリット**:
- 毎回GitHubから最新版を取得（Tampermonkey更新問題を回避）
- 新規ユーザーはローダー1つで全スクリプト利用可能
- 既存の個別インストール方式と並行運用可能

**動作フロー**:
```
ページ読み込み → Loader起動 → manifest.json取得 → ホストにマッチするスクリプトをorder順に読み込み
```

**スクリプト設定機能**:
- Toolboxの「スクリプト設定」からスクリプトのON/OFFを切り替え可能
- 設定は`GM_setValue('loader-disabled-scripts', [...])` に保存
- 変更は次回ページ読み込み時に反映
- `henry_core`と`henry_toolbox`は必須のため無効化不可

**ベータ版スクリプト**:
- manifest.jsonの`label`に「ベータ版」を含むスクリプトは設定パネル下部に表示
- 配布用ローダー（henry_loader.user.js）では`DEFAULT_DISABLED`でデフォルト無効
- 開発用ローダー（henry_loader_dev.user.js）ではすべて有効
- 新規ベータ版追加時: manifest.jsonのlabelに「（ベータ版）」追加 + 配布用ローダーのDEFAULT_DISABLEDに追加

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
| **カルテ** | henry_karte_history.user.js | 過去カルテ記事出力（実験） |
| | henry_note_reader.user.js | カルテ内容リーダー |
| | henry_hospitalization_data.user.js | 入院データ表示（実験） |
| **業務効率化** | henry_auto_approver.user.js | 承認待ちオーダー一括承認 |
| | henry_login_helper.user.js | ログイン入力補助 |
| | henry_set_search_helper.user.js | セット展開クイック検索 |
| | henry_reception_filter.user.js | 外来受付フィルタ（未完了のみ） |
| | henry_memo.user.js | メモ帳（タブ管理・保存） |
| **Google連携** | henry_google_auth_settings.user.js | Google OAuth認証の設定・管理 |
| | henry_google_drive_bridge.user.js | Google Drive API直接連携 |
| | henry_ikensho_form.user.js | 主治医意見書作成フォーム |
| **開発用** | henry_test_helper.user.js | テストデータ自動入力 |

---

## 6. カスタムルール (Custom Rules)

> **📝 このセクションは追記専用**: プロジェクト固有のルールや、開発中に追加したいルールをここに記載します。

### 追加ルール

- **IMPORTANT**: コード固有の課題やTODOは、該当コード内にTODOコメントとして残すこと（例: `// TODO: 動作確認後にこのログを削除`）

- **IMPORTANT**: 作業完了後、一段上の視点（メタな視点）から影響範囲を確認し、必要な追加作業があればユーザーに提案すること。コード・ドキュメント・設計方針・運用フロー・命名規則など、あらゆる側面で整合性を考える。

- **YOU MUST**: APIを使用する前に、必ず仕様を確認すること：
  - GraphQL API → chrome-devtools-mcpでリアルタイム調査（ネットワークリクエストをキャプチャ）
  - HenryCore API → `henry_core.user.js` 冒頭のAPI目次と実装を確認（プロパティ名、関数の有無など）
  - **推測でコードを書かない。スピードより確認の正確さを優先する**

- **YOU MUST**: GraphQL API開発時は以下の手順を厳守すること（拙速より巧遅）：
  1. **エラーログを確認** - 何が起きているか把握する
  2. **実際のpayloadを確認** - Henry本体のリクエスト/レスポンス形式を調べる
  3. **コンソールで試す** - コードに入れる前にブラウザコンソールで動作検証
  4. **確認してから反映** - 動くことを確かめてからファイル更新
  - 焦って推測でコードを書くと手戻りが増える。一歩ずつ確実に進める

- **YOU MUST**: OAuth認証が必要な場合は、`alert()` で理由を伝えてから設定ダイアログや認証画面を開くこと
  - 詳細は `NOTES.md` の「OAuth認証フロー」を参照

- **YOU MUST**: Gemini MCP（`ask-gemini`）を使用する際は、常に `model: "gemini-3-pro-preview"` を指定すること。

- **YOU MUST**: Loader（henry_loader.user.js / henry_loader_dev.user.js）を修正した時は、ファイルの内容を `pbcopy` でクリップボードにコピーすること（ユーザーがTampermonkeyに貼り付けられるように）。他のスクリプトはLoader経由で自動更新されるためコピー不要。

- **IMPORTANT**: GraphQL mutationで変数型（`$input: SomeInput!`）がエラーになる場合は、インライン方式を使うこと
  - 詳細は `NOTES.md` の「GraphQL インライン方式」を参照

- **IMPORTANT**: MutationObserverの監視範囲はなるべく狭くすること：
  - `document.body` 全体を監視するのではなく、対象のコンテナ（モーダル、特定のセクション等）のみを監視する
  - 2段階監視パターン: Stage 1で対象コンテナの出現を検知 → Stage 2でコンテナ内のみを監視
  - コールバック内のDOM検索も `document.querySelector` ではなく `container.querySelector` を使う
  - 高頻度で発火する場合は `debounce` を適用する
  - **理由**: 監視範囲が広いと、無関係なDOM変更でもコールバックが実行され、パフォーマンスが低下する

- **IMPORTANT**: Gemini MCPにレビューを依頼するときは、セッションのJSONLファイルを渡すこと：
  - セッション履歴は `~/.claude/projects/-Users-shinichiro-Documents-Henry/<session-id>.jsonl` に保存されている
  - 最新のセッションファイルは `ls -lt ~/.claude/projects/-Users-shinichiro-Documents-Henry/*.jsonl | head -1` で確認
  - Geminiへの依頼例：
    ```
    @/Users/shinichiro/.claude/projects/-Users-shinichiro-Documents-Henry/<session-id>.jsonl
    @/Users/shinichiro/Documents/Henry/<対象ファイル>
    このセッションで行った修正をレビューしてください
    ```
  - **理由**: JSONLファイルを渡すことで、Geminiがセッションの文脈を理解した上でレビューできる

- **IMPORTANT**: fetchインターセプトで問題が起きたらProxy方式を検討すること：
  - 通常のfetchインターセプト（`originalFetch.apply(this, args)`）はFirestore等の厳格なライブラリと競合することがある
  - 問題が起きた場合は `Proxy` + `Reflect.apply` 方式に変更する
  - 詳細は `NOTES.md` の「fetchインターセプトとFirestore競合問題」を参照

- **YOU MUST**: 確認を求めたら（「これで進めてよいですか？」等）、必ずユーザーの返答を待ってから作業を進めること
  - 確認後に返答を待たずに実装を始めない
  - 確認が不要な場合は、確認を求めずに直接作業を進める

- **IMPORTANT**: 開発中はローカルサーバーからスクリプトを取得している（GitHubからではない）
  - Henry Loaderがローカルサーバー（`http://localhost:8080`）から最新版を取得する設定になっている
  - ローカルファイルを修正すれば、ページリロードでTampermonkey上にも即座に反映される
  - developブランチへのプッシュはバックアップ目的（スクリプト更新とは無関係）
  - mainブランチへのプッシュは本番リリース時のみ
  - **「GitHubにプッシュしていないから更新されていない」という誤解をしないこと**

- **YOU MUST**: z-indexは以下の階層ルールに従うこと（Henryログインモーダル=1600の下に配置）：
  | 階層 | z-index | 用途 |
  |------|---------|------|
  | 最上位 | 1600 | Henry本体のログインモーダル（変更不可） |
  | モーダル | 1500 | Tampermonkey製モーダル、ポップアップ、トースト |
  | 常駐UI | 1400 | Tampermonkey製アイコン、ツールチップ、インジケーター |
  - **理由**: セッションタイムアウト時のログインモーダルがスクリプトUIに隠れてしまう問題を防ぐ
  - 予約システム（manage-maokahp.reserve.ne.jp）など Henry 以外のドメインはこのルール対象外

- **YOU MUST**: 既存のHTML/CSSを「同じにして」「再現して」と言われた場合は、推測せず以下の手順を踏むこと：
  1. まずスクリーンショットで全体像を把握
  2. 完全なHTML構造を取得（`element.innerHTML`または`outerHTML`）
  3. 主要要素のcomputedStyleを一括取得
  4. 取得したデータに基づいて忠実に実装
  - **理由**: 断片的な情報で推測実装すると何度も修正が必要になる

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| v4.28 | 2026-01-24 | HTML/CSS再現時の手順ルール追加 |
| v4.27 | 2026-01-23 | z-index階層ルール追加（ログインモーダル対策） |
| v4.26 | 2026-01-23 | 開発環境ローカルサーバー運用ルール追加 |
| v4.25 | 2026-01-23 | 確認後は返答を待つルール追加 |
| v4.24 | 2026-01-22 | エラーロガー廃止（henry_error_logger削除、MCP直接確認に移行） |
| v4.23 | 2026-01-22 | GM_info.script.versionパターンルール追加（バージョン定数） |
| v4.22 | 2026-01-22 | コード例をNOTES.mdに移動（OAuth、GraphQL、SPA遷移） |
| v4.21 | 2026-01-22 | fetchインターセプトProxy方式ルール追加 |
| v4.20 | 2026-01-21 | 動的スクリプトローダー(Henry Loader)セクション追加 |
| v4.19 | 2026-01-20 | 根本原因調査優先ルール追加 |
| v4.18 | 2026-01-19 | スクリプト一覧セクション追加 |
| v4.17 | 2026-01-18 | Gemini MCPへのセッションJSONL連携ルール追加 |
| v4.16 | 2026-01-18 | MutationObserver監視範囲最適化ルール追加 |
| v4.15 | 2026-01-17 | Gemini MCPモデル指定ルール追加（gemini-3-pro-preview） |
| v4.14 | 2026-01-14 | SPA遷移対応（subscribeNavigation）ルール追加 |
| v4.13 | 2026-01-13 | GraphQL インライン方式ルール追加 |
| v4.12 | 2026-01-13 | OAuth認証時はalertで理由を伝えるルール追加 |
| v4.11 | 2026-01-12 | スピードより確認の正確さを優先するルール追加 |
| v4.10 | 2026-01-12 | API使用前のリファレンス確認ルール追加（GraphQL/HenryCore両方） |
| v4.9 | 2026-01-12 | タスクID運用ルール追加、メタ視点確認ルール追加 |
| v4.8 | 2026-01-12 | ドキュメント構造簡略化、調査メモをNOTES.mdに分離 |
| v4.7 | 2026-01-11 | 問題解決のアプローチ追加 |
| v4.4 | 2026-01-08 | コミュニケーション方針を詳細化 |
| v4.0 | 2026-01-04 | ルールとリファレンスを分離、プロンプト階層導入 |

> 詳細な変更履歴は `git log` を参照。

---

## 🔔 保留中のタスク (Pending Tasks)

> **AI向け指示**: セッション開始時に確認し、未完了タスクをリマインドすること。タスク完了時はこのセクションを更新すること。
>
> **タスクID運用ルール**:
> - 新規タスク追加時は `TASK-XXX` 形式のIDを振る（連番）
> - タスク末尾に発生日を記載する（例: `[2026-01-15]`）
> - 詳細が必要なタスクは `NOTES.md` に同じIDで見出しを作成
> - これにより両ファイル間で `TASK-XXX` で検索して対応を取れる

### 調査・開発タスク
- [ ] TASK-001: ORDER_STATUS_REVOKED の承認API特定
- [ ] TASK-002: 独自オーダーセット選択UI
- [ ] TASK-003: 病名サジェスト機能
- [ ] TASK-011: henry_karte_history 処方表示改善（mhlwMedicine対応、medicationTiming用法取得、検体検査フィールド調査）
- [x] TASK-013: Tampermonkey更新問題 → Henry Loaderで解決（毎回GitHubから最新取得）[2026-01-21]
- [x] TASK-015: SPA遷移対応調査完了 - 以下のスクリプトはsubscribeNavigation不要と判断 [2026-01-21]
  - henry_reserve_integration: 全ページで動作（fetchインターセプト、プラグイン登録）
  - henry_ikensho_form: プラグイン登録のみ
  - henry_memo: グローバルイベント、UIは呼び出し時表示
  - henry_toolbox: MutationObserverで継続監視（debounce付き、ボタン消失時に再挿入）
- [ ] TASK-016: Henry本体の画面更新が行われない問題（他ユーザーの変更が反映されない等。原因特定が必要）
- [x] TASK-017: 主治医意見書スクリプトのOAuthスコープ削減 → 対応不要と判断（組織内限定、リスク低） [2026-01-22]
- [ ] TASK-018: 主治医意見書の下書きインポート/エクスポート機能（PC間でデータ移行可能に）
- [x] TASK-020: ログインモーダル表示時にスクリプトUIが上に出る問題 → z-index階層ルール導入で解決 [2026-01-23]
- [ ] TASK-028: Miele-LXIV（DICOMビューア）GitHub版ビルド [2026-01-22]
  - 前提: Xcodeインストール（App Storeから）
  - 手順: brew install kconfig-frontend wget cmake → miele-lxiv-easy clone → build.sh
  - 参考: https://github.com/bettar/miele-lxiv-easy
- [ ] TASK-029: henry_set_search_helper 巨大関数リファクタリング [2026-01-22]
  - createButtonContainer（400行以上）を責務分割
  - DragDropHandler: ドラッグ＆ドロップ関連ロジック
  - EditPopup: 編集ポップアップの生成と管理
  - ButtonRenderer: ボタン/ドロップダウンのDOM生成
- [ ] TASK-030: henry_google_drive_bridge リファクタリング [2026-01-22]
  - handleDoubleClick, handleSaveToHenry の関数分割
  - UI表示ロジック（showToast等）のHenryCore統合検討
  - GM_xmlhttpRequestラッパーの拡張
- [ ] TASK-031: henry_ikensho_form: localStorageのPII保存をGoogle DriveのappPropertiesへ移行 [2026-01-22]
- [ ] TASK-032: henry_disease_register: 登録済み病名の編集機能 [2026-01-23]
- [ ] TASK-033: henry_hospitalization_data: パーシステッドクエリをフルクエリ方式に修正 [2026-01-23]
  - LIST_CLINICAL_DOCUMENTS, LIST_REHABILITATION_DOCUMENTS, LIST_ORDERS の3クエリ
- [ ] TASK-034: henry_toolbox: MutationObserverの監視範囲最適化検討 [2026-01-23]
  - 現状: document.bodyをsubtree:trueで監視（debounceで軽減）
  - 改善案: navの親要素など、より限定的なコンテナを監視対象にする
  - 注意: Henry本体のDOM構造の安定性に依存するため、堅牢性とのトレードオフ
- [x] TASK-035: henry_google_drive_bridge: テンプレート開き方変更対応 → Fetchインターセプト方式でv2.4.0完了 [2026-01-24]
  - Henry本体が文書テンプレートの開き方を変更（フォルダ経由→直接ダウンロード）
  - 方式検討から必要（詳細はNOTES.md参照）
- [ ] TASK-036: 新規スクリプト: リハビリオーダー簡略化 [2026-01-23]
  - カルテのリハビリオーダー入力が煩雑なため、シンプルにするスクリプトを開発
  - 要件・仕様は未定（着手時に詳細ヒアリング）
- [x] TASK-027: henry_disease_register Loader経由で初期化エラー → Loaderに@require対応追加で解決 [2026-01-22]
- [x] TASK-021: MutationObserver最適化 完了 [2026-01-21]
  - ✅ henry_imaging_order_helper: OK（2段階監視 + cleaner）
  - ✅ henry_reserve_integration: OK（debounce + cleaner）
  - ✅ henry_set_search_helper: 修正済 v2.3.3（2段階監視パターン）
  - ✅ henry_toolbox: 修正済 v5.1.9（継続監視 + debounce、SPA遷移対応）
  - ✅ henry_google_drive_bridge: 修正済 v2.2.8（banner監視 + debounce）
  - ✅ henry_login_helper: OK（SPA遷移時fullCleanupでdisconnect）
  - ✅ henry_reception_filter: OK（main監視 + cleaner）
  - ✅ reserve_calendar_ui: OK（非SPA、subtree:false）
- [x] TASK-022: henry_imaging_order_helper リファクタリング完了 v1.26.0 [2026-01-21]
- [x] TASK-024: google-docs-mcp OAuth設定（完了）[2026-01-20]
- [x] TASK-026: Gemini MCP連携手順（CLAUDE.mdカスタムルールに記載済み）[2026-01-20]

### 完了
- [x] TASK-023: 予約システム連携のオーバーレイ閉じ時に一瞬見える問題（対応終了）[2026-01-20]
- [x] TASK-025: デバッグ用ChromeにTampermonkey＋Henryスクリプト設定（完了）[2026-01-20]
- [x] TASK-019: 照射オーダー予約後のHenry側処理（refetchQueries追加で完了）
- [x] TASK-014: 画面更新妨害リスク修正（キャプチャフェーズ削除完了）
- [x] TASK-009: HenryCore v2.10.4 エンドポイント自動復旧機能
- [x] TASK-007: henry_disease_register.user.js v1.2.1
- [x] TASK-010: henry_disease_list.user.js v1.0.2
- [x] TASK-012: henry_disease_register.user.js v2.2.4 検索精度改善（N-gram検索追加）
