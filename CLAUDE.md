# Henry EMR 開発ガイドライン (Core Rules v4.2)

<!-- 📝 UPDATED: タイトルを簡潔に。v4.0から「Core Rules」として分離 -->
<!-- 📝 UPDATED: v4.2 - HenryCore v2.7.4 showModalオプション追加 -->

> **🆕 NEW**: このドキュメントはAIアシスタントとの協働開発における必須ルール集です。簡潔性を重視し、詳細な技術仕様は `HENRY-API-REFERENCE.md` を参照してください。

---

## 1. AI協働開発のルール (AI Collaboration Protocol)

<!-- ✅ KEPT: この章全体は元のまま維持 -->

### 指示の確認

AIは指示を受けたら、作業に入る前に以下を行う：

1. **理解内容の説明** — 指示をどのように解釈したかを説明する
2. **不明点の質問** — 曖昧な点や複数の解釈が可能な点があれば質問する
3. **合意後に着手** — 認識が一致したことを確認してから作業を開始する

**目的**: 認識のズレによる手戻りを防ぎ、共通の理解のもとで効率的に進める

### ガイドラインの更新

**YOU MUST**: ユーザーから新しいルールの追加指示があった場合、必ず **セクション6「カスタムルール」** に追記すること。

<!-- 🆕 NEW: プロンプト階層の追加（URLのベストプラクティスから） -->
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

<!-- ✅ KEPT: 以下のセクションは元のまま維持 -->
### コード出力の制約 (Code Generation Protocol)

**原則**: ユーザーからの明示的な指示（例：「コードを書いて」「実装して」）があるまで、コピー＆ペーストしてそのまま使える「完全な実装コード」を出力してはならない。

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

<!-- 📝 UPDATED: セクション1から再構成。重要なルールのみ抽出 -->

### 非侵入型UXの徹底

**YOU MUST**: ユーザー操作なしでの自動スクロールやフォーカス奪取は厳禁。

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

**YOU MUST**: SPA遷移時（`henry:navigation` / `popstate`）には、全ての MutationObserver、タイマー、非同期処理（AbortController）を完全に破棄すること。

#### 標準パターン：createCleaner

破棄対象の漏れを防ぐため、`HenryCore.utils.createCleaner()` を使用する。

```javascript
const cleaner = HenryCore.utils.createCleaner();

// 登録例
const timerId = setTimeout(fn, 1000);
cleaner.add(() => clearTimeout(timerId));

const observer = new MutationObserver(callback);
observer.observe(target, config);
cleaner.add(() => observer.disconnect());

// SPA遷移時に一括実行
cleaner.exec();
```

#### 自動クリーンアップ：subscribeNavigation

画面遷移のたびにクリーンアップ → 再初期化を自動で行う場合：

```javascript
const cleaner = HenryCore.utils.createCleaner();

HenryCore.utils.subscribeNavigation(cleaner, () => {
  // ここに初期化処理を書く
  // 画面遷移時は自動で cleaner.exec() → この関数が再実行される
});
```

---

## 3. 基本的なコードパターン (Essential Patterns)

<!-- 📝 UPDATED: セクション2,3,7を統合・簡略化 -->

### セレクタ戦略

**NEVER**: `.sc-xxxx` などのランダムなクラス名や XPath を使用すること。

**YOU MUST**: `data-testid`、`role`、`aria-*` 属性、または不変のテキストコンテンツを基準にすること。

**IMPORTANT**: モーダル等は `document.body` 直下に現れるため、コンテナ外へのフォールバックを許容する設計にすること。

### HenryCore API 概要

<!-- 📝 UPDATED: セクション3,4,5,6を大幅に簡略化。詳細はリファレンスへ移動 -->

**YOU MUST**: DOM解析を避け、`window.HenryCore` を通じたデータ操作を行うこと。

**前提条件**: API呼び出しには「Henry Core」スクリプトが必要。

#### 基本的な呼び出し

```javascript
// HenryCore の待機（タイムアウト付き）
async function waitForHenryCore(timeout = 5000) {
  let waited = 0;
  while (!window.HenryCore) {
    await new Promise(r => setTimeout(r, 100));
    waited += 100;
    if (waited > timeout) {
      console.error('[SCRIPT_NAME] HenryCore が見つかりません');
      return false;
    }
  }
  return true;
}

// API呼び出し（フルクエリ方式）
const result = await HenryCore.query(`
  query GetPatient($input: GetPatientRequestInput!) {
    getPatient(input: $input) {
      fullName
      detail { birthDate { year month day } }
    }
  }
`, { input: { uuid: patientUuid } });

const patient = result.data?.getPatient;
if (!patient) return null; // 静かに終了
```

#### 主要なAPI

<!-- 📝 UPDATED: 型定義を表形式の概要に簡略化 -->

| メソッド | 用途 | 詳細 |
|---------|------|------|
| `query(queryString, variables)` | GraphQL API呼び出し（推奨） | v2.8.0以降。フルクエリ方式 |
| `call(operationName, variables)` | GraphQL API呼び出し（非推奨） | ハッシュ方式。後方互換性のため残存 |
| `getPatientUuid()` | 現在表示中の患者UUID取得 | - |
| `getMyUuid()` | ログイン中のユーザーUUID取得 | 初回はAPI呼び出し、以降キャッシュ |
| `plugins` | 登録済みプラグインの配列 | v2.7.0以降。読み取り専用 |
| `registerPlugin(options)` | プラグイン登録 | v2.7.0以降。自動的にToolboxに表示 |
| `utils.createCleaner()` | クリーンアップ管理 | 上記参照 |
| `utils.waitForElement(selector, timeout)` | 要素の出現待機 | - |
| `utils.createLogger(name)` | ログ出力ユーティリティ | - |
| `utils.withLock(map, key, generator)` | 二重送信防止 | - |
| `ui.createButton(props)` | ボタン作成 | `HENRY-API-REFERENCE.md` 参照 |
| `ui.showModal(props)` | モーダル表示 | v2.7.4: `closeOnOverlayClick`, `action.autoClose` オプション追加 |

> **📝 UPDATED**: 完全な型定義（60行のTypeScriptインターフェース）は `HENRY-API-REFERENCE.md` に移動しました。

#### プラグイン登録

**YOU MUST**: HenryCore v2.7.0以降は、`HenryCore.registerPlugin()` を使用してプラグインを登録すること。自動的にHenryToolboxに表示される。

```javascript
await HenryCore.registerPlugin({
  id: 'my-plugin',           // 必須: ユニークなID
  name: 'マイプラグイン',      // 必須: 表示名
  icon: '🔧',                // オプション: アイコン
  description: '説明文',      // オプション: 説明
  version: '1.0.0',          // オプション: バージョン
  order: 100,                // オプション: 表示順序（小さいほど上）
  onClick: () => {           // 必須: クリック時の処理
    // ここに処理を書く
  }
});
```

**NEVER**: `HenryToolbox.register()` を直接呼び出さないこと。HenryCore が自動的に転送する。

### エラーハンドリング

**YOU MUST**: `HenryCore.query()` は失敗時に例外を投げるため、try-catchで処理すること。

```javascript
const QUERY = `
  query GetPatient($input: GetPatientRequestInput!) {
    getPatient(input: $input) { fullName }
  }
`;

try {
  const result = await HenryCore.query(QUERY, { input: { uuid } });
  if (!result.data?.getPatient) return null;
  // 正常処理
} catch (e) {
  console.error('[SCRIPT_NAME]', e.message);
  return null;
}
```

**NEVER**: トークン等の秘匿情報をログ出力しないこと。

### Tampermonkey サンドボックス対策

**YOU MUST**: `@grant GM_*` を使用する場合、`unsafeWindow` 経由で HenryCore にアクセスすること。

```javascript
// ==UserScript==
// @grant        GM_download
// ==/UserScript==

(async function() {
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const core = pageWindow.HenryCore;
})();
```

---

## 4. デバッグとワークフロー (Debug & Workflow)

<!-- 📝 UPDATED: セクション5から移動し、ワークフローを追加 -->

### デバッグ手順（原因究明ファースト）

1. **現状把握**: ログの確認、無言停止の確認
2. **要因切り分け**: DOM変化、非同期タイミング、データ不整合
3. **仮説検証**: 根拠のある修正のみを行う

<!-- 🆕 NEW: 推奨ワークフロー（URLのベストプラクティスから） -->
### 推奨ワークフロー

> **🆕 NEW セクション**: 品質を最も向上させる開発フロー（Anthropic公式ベストプラクティスより）

**Explore → Plan → Code → Commit**

1. **Explore**: 関連ファイルを読み、既存の実装パターンを理解
2. **Plan**: 詳細な実装計画を立て、ユーザーに確認
3. **Code**: 計画に基づいて実装
4. **Commit**: テスト・確認後にコミット

**IMPORTANT**: 探索・計画をスキップして直接コードを書くと品質が低下する。

---

## 5. 参照ドキュメント (Reference)

<!-- 🆕 NEW: リファレンスへの参照セクション -->

### 詳細な技術仕様

> **✂️ MOVED**: 以下の詳細内容は `HENRY-API-REFERENCE.md` に移動しました。

以下の内容は `HENRY-API-REFERENCE.md` を参照：

- ✂️ **HenryCore 完全な型定義** (元セクション4の60行のTypeScriptインターフェース)
- ✂️ **各種ユーティリティの詳細仕様** (元セクション5のcreateLogger, waitForElement等)
- ✂️ **バッチ処理パターン** (元セクション8の150行のコード例とチェックリスト)
- ✂️ **プラグイン登録の詳細** (元セクション9の登録パラメータ、後方互換性)
- ✂️ **UI System の詳細** (元セクション10のcreateButton/showModal全パラメータ)
- ✂️ **クロスドメイン連携** (元セクション11のGM_*高度な使い方、双方向通信)
- ✂️ **Apollo Client 連携** (元セクション12全体)
- ✂️ **DOM監視パターンの詳細比較** (元セクション13全体)

### ユーザー向けガイド

> **📝 RELATED**: AIとの効果的な協働方法については `AI-COLLABORATION-TIPS.md` を参照してください。

### バージョン管理

**YOU MUST**: 全てのスクリプトはセマンティックバージョニング（x.y.z）に従うこと。

**YOU MUST**: Henry Core の仕様変更に対応した場合は、必ずバージョンを上げること（例: パッチバージョン z の加算）。

---

## 6. カスタムルール (Custom Rules)

> **📝 このセクションは追記専用**: プロジェクト固有のルールや、開発中に追加したいルールをここに記載します。

### 追加ルール

- **YOU MUST**: 複雑な指示や意図が曖昧な指示を受けた場合は、質問するか、指示をどのように理解したかを説明してから作業に入ること。
- **YOU MUST**: コードを修正する前に、まず修正内容をユーザーに確認すること。確認なしに直接編集しない。
- **YOU MUST**: HenryCoreのAPIを変更・追加した場合は、`CLAUDE.md`と`HENRY-CORE-API-REFERENCE.md`の該当箇所も更新すること。
- **YOU MUST**: 新しいTampermonkeyスクリプトを作成する際は、`@updateURL` と `@downloadURL` にGitHubのraw URLを設定すること。形式: `https://raw.githubusercontent.com/shin-926/Henry/main/<filename>.user.js`
- **YOU MUST**: スクリプトに修正を加えてコミットする際は、`@version` をセマンティックバージョニングに従って上げること（バグ修正: パッチ、機能追加: マイナー、破壊的変更: メジャー）
- **YOU MUST**: GraphQL APIはフルクエリ方式を使用すること。ハッシュ方式（APQ）は非推奨。クロスドメイン（GM_xmlhttpRequest）でも同様にフルクエリを送信する。
- **IMPORTANT**: GraphQL APIの構造がわからないときは `HENRY-GRAPHQL-API-REFERENCE.md` を参照すること。
- **IMPORTANT**: コードベースの探索や広範な検索を行う場合は、Taskツール（Exploreエージェント等）を使用してメインのコンテキストウィンドウを節約すること。
- **IMPORTANT**: コード固有の課題やTODOは、該当コード内にTODOコメントとして残すこと（例: `// TODO: 動作確認後にこのログを削除`）。
- **YOU MUST**: スクリプトに機能追加や修正を行う際は、その変更に必要な部分のみを編集すること。関係ない部分を変更しない。
- **YOU MUST**: エラーが発生したときは、推測で別の可能性を提案する前に、まず実際のエラー内容を調査すること。APIエラーならレスポンスボディを確認し、具体的なエラーメッセージに基づいて修正する。

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| **v4.3** | **2026-01-06** | **🆕 HenryCore v2.8.0 フルクエリ方式追加。`query()` メソッド追加、`call()` は非推奨に。ハッシュ事前収集が不要になり、初回でもAPIが即座に呼び出し可能** |
| v4.2 | 2026-01-05 | HenryCore v2.7.4 showModalオプション追加。`closeOnOverlayClick: false` でオーバーレイクリック無効化、`action.autoClose: false` でボタンクリック後の自動close無効化 |
| v4.1 | 2026-01-05 | HenryCore v2.7.0 プラグインレジストリ対応。`HenryCore.plugins` 配列追加、`registerPlugin()` の仕様変更（自動的にToolboxへ表示）、プラグイン登録の例を追加 |
| **v4.0** | **2026-01-04** | **🆕 コアルールとリファレンスを分離。プロンプト階層（NEVER/YOU MUST/IMPORTANT）導入。推奨ワークフロー追加。Anthropic公式ベストプラクティス反映。740行→330行に圧縮** |
| v3.21 | 2026-01-02 | §11「クロスドメイン連携」拡張 |
| v3.20 | 2026-01-01 | §11-13 追加 |
| v3.19 | 2026-01-01 | HenryCore v2.6.0 対応 |

---

## 📊 変更サマリー

### 🆕 新規追加 (2項目)
1. **プロンプト階層 (NEVER/YOU MUST/IMPORTANT)** - セクション1
2. **推奨ワークフロー (Explore→Plan→Code→Commit)** - セクション4

### ✂️ リファレンスに移動 (8項目)
1. HenryCore 完全な型定義（60行のTypeScriptインターフェース）
2. 各種ユーティリティの詳細仕様
3. バッチ処理パターン（150行のコード例）
4. プラグイン登録の詳細
5. UI Systemの詳細
6. クロスドメイン連携の詳細
7. Apollo Client連携（セクション12全体）
8. DOM監視パターンの詳細比較（セクション13全体）

### 📝 ユーザー向けガイドに分離 (1項目)
- 効果的なコミュニケーション（視覚的フィードバック、具体的な指示）→ `AI-COLLABORATION-TIPS.md`

### 📝 簡略化・再構成
- セクション構成を5章に再編成（元は13章）
- 740行 → 330行（-55%）
- コード例は基本パターンのみに絞り込み

---

## 🔔 保留中のタスク (Pending Tasks)

> **AI向け指示**: セッション開始時にこのセクションを確認し、未完了のタスクがあればユーザーにリマインドすること。タスク完了後はこのセクションから削除すること。

### 2026-01-07 更新
- [x] ~~**デバッグログ削除**: 配布用スクリプトのデバッグログを整理~~ → google_bridge v2.10.4, reserve_integration v1.6.2
- [x] ~~**reserve-integration確認**: フルクエリ方式に移行完了~~ → v1.7.2
- [ ] **動作確認**: フルクエリ方式に移行した他のスクリプトのテスト
  - henry_ikensho_form.user.js
  - henry_auto_approver.user.js
