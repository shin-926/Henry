# Henry EMR スクリプト開発ガイドライン (v3.21)

## 序章. AI協働開発のルール (AI Collaboration Protocol)

本ガイドラインに基づくスクリプト開発をAIアシスタントと協働で行う際のルール。

**対象**: AIアシスタント（Claude, Gemini等）

### 指示の確認

AIは指示を受けたら、作業に入る前に以下を行う：

1. **理解内容の説明** — 指示をどのように解釈したかを説明する
2. **不明点の質問** — 曖昧な点や複数の解釈が可能な点があれば質問する
3. **合意後に着手** — 認識が一致したことを確認してから作業を開始する

### コード出力の制約 (Code Generation Protocol) 【重要】

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

### 目的

- 認識のズレによる手戻りを防ぐ
- 暗黙の前提を明示化する
- 共通の理解のもとで効率的に進める
- 不要な長文コードによるトークン浪費と可読性低下を防ぐ
- 「実装」の前に「設計・原因特定」を確実に行う

---

## 0. 適用範囲 (Target URL)

Henry電子カルテのURLは `https://henry-app.jp/◯◯` で構成される。

Userscriptのヘッダーには以下を指定すること。

```javascript
// @match https://henry-app.jp/*
```

### バージョン管理

全てのスクリプトはセマンティックバージョニング（x.y.z）に従うこと。

Henry Core の仕様変更に対応した場合は、必ずバージョンを上げる（例: パッチバージョン z の加算）。

---

## 1. コア・ポリシー (UX & Safety)

### 非侵入型UXの徹底

ユーザー操作なしでの自動スクロールやフォーカス奪取は厳禁。

### スマート・ナビゲーションの制限

「ぼかしオーバーレイ」等の視覚効果を伴うナビゲーションは、ユーザーのクリック操作を起点とする場合のみ許可する。

### 停止の原則とログの切り分け

| 視点 | ルール |
|------|--------|
| ユーザー視点 | UIを出さない、操作を継続させない（沈黙して停止） |
| 開発者視点 | `console.error` で原因を特定可能にする。ただし、トークン等の秘匿情報は絶対にログ出力しない |

**補足：停止の統一ルール**

- APIレスポンスがエラー / 想定外の形式 / null の場合も即停止（再試行しない）
- 「静かに終了」= Promise は `resolve(null)` で正常終了させ、呼び出し元で null チェックを行う

### ログ出力の原則

- エラーログには必ず `[SCRIPT_NAME]` プレフィックスを付ける
- 同一エラーは1回だけ出力する（ループ内での連打禁止）

### PII（個人情報）の永続化禁止 【重要】

`localStorage`, `IndexedDB`, `GM_setValue` 等のブラウザストレージに、患者の氏名・連絡先・カルテ内容などの個人情報を平文で保存することを厳禁とする。

一時的なキャッシュが必要な場合は、メモリ上の変数（TTLCacheなど）のみを使用すること。

### クリーンアップ

SPA遷移時（`henry:navigation` / `popstate`）には、全ての MutationObserver、タイマー、非同期処理（AbortController）を完全に破棄する。

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

## 2. セレクタ戦略 (Robust Selector)

### 不変属性の優先

`.sc-xxxx` などのランダムなクラス名や XPath は使用禁止。

**推奨**: `data-testid`、`role`、`aria-*` 属性、または不変のテキストコンテンツを基準にする。

### ポータル要素の考慮

モーダル等は `document.body` 直下に現れるため、コンテナ外へのフォールバックを許容する設計にする。

---

## 3. Henry API 運用ルール (GraphQL)

DOM解析を避け、`window.HenryCore` を通じたデータ操作を行う。

### 前提条件

API呼び出しには「Henry Core」スクリプトが必要。このスクリプトが `window.HenryCore` を提供する。

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
```

### 基本的な呼び出し

```javascript
const result = await HenryCore.call('GetPatient', {
  input: { uuid: patientUuid }
});

const patient = result.data?.getPatient;
if (!patient) return null; // 静かに終了
```

### ヘッダー責務

`Authorization` および `x-auth-organization-uuid` は `HenryCore.call` が内部で注入する。スクリプト側でヘッダーを意識する必要はない。

### エラーハンドリング

`HenryCore.call()` は失敗時に例外を投げる。

```javascript
try {
  const result = await HenryCore.call('GetPatient', { input: { uuid } });
  if (!result.data?.getPatient) return null;
  // 正常処理
} catch (e) {
  console.error('[SCRIPT_NAME]', e.message);
  return null;
}
```

### 二重送信防止（インフライトロック）

同一リソースへの重複リクエストを防ぐには `withLock` を使用する。

```javascript
const inflight = new Map();

async function fetchPatientOnce(uuid) {
  return HenryCore.utils.withLock(inflight, uuid, () =>
    HenryCore.call('GetPatient', { input: { uuid } })
      .then(r => r.data?.getPatient ?? null)
  );
}
```

---

## 4. HenryCore 型定義 (Type Reference)

AIによるコード生成の精度を高めるため、以下の定義を参照すること。

```typescript
/**
 * HenryCore Interface Definition (v2.6.0+)
 */
interface HenryCore {
  /**
   * GraphQL API 呼び出し (自動ハッシュ解決・エンドポイント振分)
   * @throws {Error} ハッシュ未収集、トークン切れ、通信エラー時
   */
  call<T = any>(operationName: string, variables: Record<string, any>): Promise<{ data: T }>;

  /**
   * 自分のユーザーUUIDを取得 (遅延取得 + キャッシュ)
   * 初回呼び出し時にAPIを実行、2回目以降はキャッシュを返す
   */
  getMyUuid(): Promise<string | null>;

  /**
   * HenryToolbox にプラグインを登録 (推奨メソッド)
   * 内部で Toolbox と register メソッドの出現を待機する
   */
  registerPlugin(options: { 
    label: string; 
    event: string; 
    order?: number; 
  }): Promise<boolean>;

  /** 現在表示中の患者UUID (fetch intercept) */
  getPatientUuid(): string | null;

  /** Firebase Auth トークン取得 */
  getToken(): Promise<string | null>;

  /** 収集済みハッシュ一覧取得 */
  getHashes(): Promise<Record<string, { hash: string, endpoint: string }>>;

  /** トークン状態確認 */
  tokenStatus(): Promise<{ valid: boolean, expiration: Date, remainingMinutes: number } | null>;

  /** ユーティリティ群 */
  utils: {
    createCleaner(): Cleaner;
    createLogger(name: string): Logger;
    waitForElement(selector: string, timeout?: number): Promise<HTMLElement | null>;
    waitForGlobal(key: string, timeout?: number): Promise<any>;
    /** Toolboxの準備完了を待機 (registerPluginの使用を推奨) */
    waitForToolbox(timeout?: number): Promise<any>;
    sleep(ms: number): Promise<void>;
    withLock<T>(map: Map<string, Promise<T>>, key: string, generator: () => Promise<T>): Promise<T>;
    subscribeNavigation(cleaner: Cleaner, initFn: () => void): void;
  };

  /** UI コンポーネント */
  ui: {
    createButton(props: { 
      label: string; 
      variant?: 'primary' | 'secondary'; 
      icon?: string; 
      onClick?: () => void; 
    }): HTMLElement;
    
    showModal(props: { 
      title: string; 
      content: string | HTMLElement; 
      actions?: Array<{ label: string; variant?: string; onClick?: () => void }>; 
    }): { close: () => void };
  };
}
```

---

## 5. ユーティリティ & デバッグ

### ログ出力：createLogger

```javascript
const log = HenryCore.utils.createLogger('MyScript');

log.info('処理開始');
log.warn('注意');
log.error('失敗', error);  // error.message のみ出力（秘匿情報保護）
```

### 要素待機：waitForElement

```javascript
const el = await HenryCore.utils.waitForElement('[data-testid="patient-name"]', 5000);
if (!el) return null; // タイムアウト時は null
```

### デバッグ手順（原因究明ファースト）

1. **現状把握**: ログの確認、無言停止の確認
2. **要因切り分け**: DOM変化、非同期タイミング、データ不整合
3. **仮説検証**: 根拠のある修正のみを行う

---

## 6. 動的コンテキストの取得

### 患者UUID: getPatientUuid

React の状態管理に依存せず、ネットワーク層（fetch）からキャッチした情報を取得する。

```javascript
const patientUuid = HenryCore.getPatientUuid();
// 注意: 患者画面を一度も開いていない、または選択解除時は null
```

### 自身のUUID: getMyUuid

HenryCore v2.6.0 以降で使用可能。ログイン中のユーザー（医師）のUUIDを取得する。

```javascript
const myUuid = await HenryCore.getMyUuid();
if (!myUuid) {
  console.error('ユーザー情報の取得に失敗しました');
  return;
}
```

---

## 7. Tampermonkey サンドボックス対策

### unsafeWindow の使用

`@grant GM_*` を使用する場合、`unsafeWindow` 経由で HenryCore にアクセスする。

```javascript
// ==UserScript==
// @grant        GM_download
// ==/UserScript==

(async function() {
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  
  // HenryCore 待機ロジック...
  const core = pageWindow.HenryCore;
})();
```

---

## 8. パフォーマンス & アーキテクチャ

### テスト容易性の考慮 (Pure Functions)

複雑なロジックは DOM や window に依存しない純粋関数として切り出すことを推奨する。

```javascript
// ❌ NG: DOM依存が混ざっている
function calculateAge() {
  const text = document.querySelector('#birth').innerText;
  return new Date().getFullYear() - new Date(text).getFullYear();
}

// ✅ OK: データを受け取って計算するだけ（テスト可能）
function calculateAge(birthDateString) {
  return new Date().getFullYear() - new Date(birthDateString).getFullYear();
}
```

### バッチ処理パターン（連続APIリクエスト）

大量のデータを処理する場合（一括承認、一括更新など）、以下のパターンに従う。

#### 基本構造

```javascript
const BASE_DELAY = 150;  // リクエスト間隔（ms）
const MAX_DELAY = 5000;  // 最大バックオフ（ms）

async function batchProcess(items, abortSignal, onProgress) {
  let processed = 0;
  let successCount = 0;
  let errorCount = 0;
  let delay = BASE_DELAY;

  for (const item of items) {
    // 中止チェック
    if (abortSignal.aborted) {
      return { processed, successCount, errorCount, aborted: true };
    }

    try {
      await processItem(item);
      successCount++;
      delay = BASE_DELAY;  // 成功時はリセット
    } catch (e) {
      errorCount++;
      console.error(`[SCRIPT_NAME] エラー:`, e.message, { item });

      // バックオフ（429/503 時）
      if (e.message.includes('429') || e.message.includes('503')) {
        delay = Math.min(delay * 2, MAX_DELAY);
      }
    }

    processed++;
    onProgress({ processed, successCount, errorCount });

    await HenryCore.utils.sleep(delay);
  }

  return { processed, successCount, errorCount, aborted: false };
}
```

#### ページネーション付きバッチ処理

```javascript
async function batchProcessWithPagination(fetchPage, processItem, abortSignal, onProgress) {
  let pageToken = '';

  while (true) {
    if (abortSignal.aborted) break;

    const result = await fetchPage(pageToken);
    const items = result.items || [];

    for (const item of items) {
      // ... 上記と同様の処理
    }

    // 注意: レスポンスのフィールド名を確認（pageToken vs nextPageToken）
    pageToken = result.nextPageToken || '';
    if (!pageToken) break;
  }
}
```

#### チェックリスト

バッチ処理を実装する際の確認事項：

- [ ] リクエスト間隔を設けているか（最低100-150ms推奨）
- [ ] 429/503 エラー時のバックオフを実装しているか
- [ ] エラー時はスキップして続行する設計か
- [ ] AbortController による中止機能があるか
- [ ] 進捗表示（処理済み/エラー件数）を行っているか
- [ ] ページネーションのフィールド名を確認したか（`pageToken` vs `nextPageToken`）
- [ ] 大量処理の場合、推定時間を表示しているか

---

## 9. プラグイン登録 (Plugin Registration)

### 推奨パターン: registerPlugin

HenryCore v2.6.0 以降では、`HenryCore.registerPlugin()` を使用する。これにより、HenryToolbox の待機やメソッド存在確認をスクリプト側で記述する必要がなくなる。

```javascript
async function init() {
  // HenryCore の待機（これは必須）
  const ready = await waitForHenryCore();
  if (!ready) return;

  // ワンライナーで登録（Toolbox待機は内部で自動処理される）
  const registered = await HenryCore.registerPlugin({
    label: '📤 患者情報エクスポート',
    event: 'henry:patient-export',
    order: 20
  });
  
  if (!registered) return;

  // イベントハンドラ
  window.addEventListener('henry:patient-export', handleExport);
}
```

### 登録パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `label` | string | ✅ | ボタンに表示するテキスト（絵文字可） |
| `event` | string | ✅ | クリック時に発火するカスタムイベント名 (`henry:` プレフィックス推奨) |
| `order` | number | - | 表示順序（デフォルト: 100、小さいほど上） |

### 後方互換性

HenryCore v2.5.0 以前のパターン（`waitForGlobal` + 手動 register）も引き続き動作する。既存スクリプトの修正は必須ではない。

---

## 10. UI System (HenryUI)

### 基本コンポーネント

```javascript
// ボタン
const btn = HenryCore.ui.createButton({
  label: '保存',
  variant: 'primary', // 'primary' | 'secondary'
  icon: 'save',
  onClick: () => { ... }
});

// モーダル
const modal = HenryCore.ui.showModal({
  title: '確認',
  content: '本当に削除しますか？',
  actions: [
    { label: 'キャンセル', variant: 'secondary' },
    { label: '削除', onClick: handleDelete }
  ]
});
```

---

## 11. クロスドメイン連携 (Cross-Domain Integration)

予約システムなど別ドメインとの連携時は、`GM_setValue` / `GM_getValue` のスコープとIndexedDBの制限に注意する。

### 実装パターン

1. Henry側でトークンを `GM_setValue` に保存
2. 別ドメイン側で `GM_getValue` でトークン取得
3. `GM_xmlhttpRequest` で Henry API を実行

### イベント駆動パターン（推奨）

クロスドメイン通信でポーリングを使う前に、`GM_addValueChangeListener` を検討する。

```javascript
// @grant GM_addValueChangeListener  ← ヘッダーに追加必須

// ❌ NG: ポーリング（無駄が多い）
setInterval(() => {
  const val = GM_getValue('refresh_request');
  if (val?.timestamp > lastCheck) { /* 処理 */ }
}, 1000);

// ✅ OK: イベント駆動（変更時のみ発火、負荷ゼロ）
GM_addValueChangeListener('refresh_request', (name, oldVal, newVal, remote) => {
  if (remote && newVal) {  // remote = 別タブからの変更
    handleRefresh(newVal);
  }
});
```

| 方式 | 検知速度 | CPU負荷 |
|------|----------|---------|
| ポーリング | 最大N秒遅延 | 常時発生 |
| ValueChangeListener | 即座 | ほぼゼロ |

### オンデマンド通信パターン（双方向）

一方向の通知ではなく、必要なときにデータを要求する双方向パターン。

#### 要求側（例: Google Docs）

```javascript
// @grant GM_addValueChangeListener
// @grant GM_removeValueChangeListener

function requestFreshToken(timeout = 3000) {
  return new Promise((resolve) => {
    const requestId = Date.now() + Math.random();
    let resolved = false;
    
    // 応答を監視
    const listenerId = GM_addValueChangeListener('henry_auth_token', (name, oldVal, newVal, remote) => {
      if (resolved) return;
      if (remote && newVal?.requestId === requestId) {
        resolved = true;
        GM_removeValueChangeListener(listenerId);
        resolve(newVal.token);
      }
    });
    
    // タイムアウト時はキャッシュを使用（応答側タブが閉じている場合のフォールバック）
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      GM_removeValueChangeListener(listenerId);
      resolve(GM_getValue('henry_auth_token')?.token || null);
    }, timeout);
    
    // リクエスト送信
    GM_setValue('token_request', { requestId });
  });
}
```

#### 応答側（例: Henry）

```javascript
GM_addValueChangeListener('token_request', async (name, oldVal, newVal, remote) => {
  if (!remote || !newVal?.requestId) return;
  
  const token = await HenryCore.getToken();
  GM_setValue('henry_auth_token', {
    token,
    requestId: newVal.requestId,  // 要求と応答を紐付け
    savedAt: Date.now()
  });
});
```

#### ポイント

| 項目 | 説明 |
|------|------|
| `requestId` | 要求と応答を紐付ける一意の識別子 |
| `remote` フラグ | 他タブからの変更のみ処理（自タブの変更は無視） |
| タイムアウト | 応答側タブが閉じている場合のフォールバック |
| リスナー解除 | `GM_removeValueChangeListener` でメモリリーク防止 |

#### 利点

- 必要なときだけ通信（定期ポーリング不要）
- 常に新鮮なデータを取得可能
- 応答側タブが閉じていてもキャッシュで動作

---

## 12. Henry内部データの更新（Apollo Client）

HenryはApollo Clientでデータ管理を行っている。外部スクリプトから画面データを更新したい場合、キャッシュのrefetchが可能。

### Apollo Clientの確認

```javascript
// DevToolsで確認
console.log(window.__APOLLO_CLIENT__);  // 存在すれば使用可能
```

### ファイル一覧の強制更新

```javascript
window.__APOLLO_CLIENT__.refetchQueries({
  include: ['ListPatientFiles']
});
```

### 他のクエリをrefetchする場合

```javascript
// クエリ名はNetworkタブのGraphQLリクエストから確認
window.__APOLLO_CLIENT__.refetchQueries({
  include: ['GetPatient', 'ListOrders']  // 複数指定可
});
```

### 注意事項

- `__APOLLO_CLIENT__` はHenryの内部実装に依存するため、将来変更される可能性がある
- refetchはAPIリクエストを発生させるため、頻繁な呼び出しは避ける

---

## 13. DOM監視パターンの選択

要素の出現や変化を監視する方法は複数ある。適切な方式を選択すること。

### 選択基準

| 方式 | 使うべき場面 | 負荷 |
|------|-------------|------|
| MutationObserver | 特定要素の変化を即座に検知 | 高（広範囲監視時） |
| setInterval | 定期的な存在確認で十分 | 低（早期returnすれば） |
| waitForElement | 一度だけ出現を待つ | 最小 |

### setInterval のベストプラクティス

```javascript
// ✅ OK: 既に存在すれば即return（負荷最小）
function ensureButton() {
  if (document.getElementById('my-button')) return;  // ← 重要
  // ボタン作成処理...
}
setInterval(ensureButton, 2000);
```

### MutationObserver の注意点

```javascript
// ⚠️ 注意: subtree: true は負荷が高い
observer.observe(document.body, { 
  childList: true, 
  subtree: true  // ← 全ての子孫要素を監視（重い）
});
```

Google DocsのようなリッチなSPAでは、`subtree: true` で毎秒数十回発火することがある。

### 判断フロー

1. 一度だけ待てばいい → `waitForElement`
2. 即座の検知が必要 → MutationObserver（範囲を限定）
3. 数秒の遅延が許容できる → setInterval（シンプル）
4. 両方使ってる → **本当に必要か見直す**

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| v3.21 | 2026-01-02 | §11「クロスドメイン連携」拡張: オンデマンド通信パターン（双方向リクエスト/レスポンス）追加 |
| v3.20 | 2026-01-01 | §11「クロスドメイン連携」拡張: `GM_addValueChangeListener` によるイベント駆動パターン追加。§12「Henry内部データの更新（Apollo Client）」新規追加。§13「DOM監視パターンの選択」新規追加 |
| v3.19 | 2026-01-01 | HenryCore v2.6.0 対応: `registerPlugin` (ワンライナー登録), `getMyUuid` 追加。改善: 型定義、PII保護規定、テスト容易性、バージョニング指針を追加 |
| v3.18 | 2025-01-01 | §8「バッチ処理パターン」追加（連続APIリクエスト、バックオフ、中止機能） |
| v3.17 | 2025-01-01 | §10「HenryToolbox の待機パターン」追加 → **v3.19 で `registerPlugin` に統合** |
| v3.16 | 2025-01-01 | 序章に「コード出力の順序」追加 |
| v3.15 | 2024-12-31 | §12「クロスドメイン連携」追加 |
| v3.10 | 2024-12-31 | §11「UI System (HenryUI)」追加 |
