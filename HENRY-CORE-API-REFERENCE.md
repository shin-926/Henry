# Henry API リファレンス (v2.7.4)

> **対象**: Henry Core v2.7.0 以降を使用するスクリプト開発者向けの詳細仕様書

このドキュメントは、Henry Core が提供するAPIの詳細な仕様を記載しています。基本的な開発ルールは `CLAUDE.md` を参照してください。

---

## 1. 基本的な呼び出し (Core API)

### HenryCore.call()

GraphQL APIを実行する中核メソッド。自動でハッシュ解決とエンドポイント振り分けを行う。

**シグネチャ**:
```typescript
call<T = any>(operationName: string, variables: Record<string, any>): Promise<{ data: T }>
```

**パラメータ**:
| 名前 | 型 | 説明 |
|------|-----|------|
| `operationName` | string | GraphQLクエリ/ミューテーション名（例: `'GetPatient'`） |
| `variables` | object | GraphQL変数（例: `{ input: { uuid: '...' } }`） |

**戻り値**: `Promise<{ data: T }>` - GraphQLレスポンスオブジェクト

**例外**: 以下の場合に `Error` をスロー
- ハッシュが未収集（初回アクセス時）
- トークン切れ（401エラー）
- ネットワークエラー
- GraphQLエラー

**使用例**:
```javascript
try {
  const result = await HenryCore.call('GetPatient', {
    input: { uuid: patientUuid }
  });

  const patient = result.data?.getPatient;
  if (!patient) {
    console.error('[SCRIPT_NAME] 患者情報が取得できませんでした');
    return null;
  }

  console.log(patient.name); // 患者名
} catch (e) {
  console.error('[SCRIPT_NAME]', e.message);
  return null;
}
```

**内部処理**:
1. `operationName` から IndexedDB のハッシュを検索
2. ハッシュが見つからない場合は例外をスロー
3. ハッシュのエンドポイント（`/graphql` または `/graphql-v2`）を使用
4. `Authorization` と `x-auth-organization-uuid` ヘッダーを自動付与
5. `fetch` でリクエスト実行

**注意事項**:
- スクリプト側でヘッダーを指定する必要はない
- レスポンスの `data` プロパティが `null` の場合も正常終了する（呼び出し側で null チェック必須）

---

## 2. 動的コンテキスト取得 (Context API)

### HenryCore.getPatientUuid()

現在表示中の患者UUIDを取得する。DOM解析ではなく、fetch intercept で取得した情報を返す。

**シグネチャ**:
```typescript
getPatientUuid(): string | null
```

**戻り値**: `string | null` - 患者UUID、または未選択時は `null`

**使用例**:
```javascript
const patientUuid = HenryCore.getPatientUuid();
if (!patientUuid) {
  console.error('[SCRIPT_NAME] 患者が選択されていません');
  return;
}

const result = await HenryCore.call('GetPatient', {
  input: { uuid: patientUuid }
});
```

**注意事項**:
- 患者画面を一度も開いていない場合は `null`
- 患者選択を解除した場合も `null`
- React の状態管理に依存しないため、タイミング問題が発生しにくい

---

### HenryCore.getMyUuid()

ログイン中のユーザー（医師）のUUIDを取得する。初回呼び出し時にAPIを実行し、2回目以降はキャッシュを返す。

**シグネチャ**:
```typescript
getMyUuid(): Promise<string | null>
```

**戻り値**: `Promise<string | null>` - ユーザーUUID、または取得失敗時は `null`

**使用例**:
```javascript
const myUuid = await HenryCore.getMyUuid();
if (!myUuid) {
  console.error('[SCRIPT_NAME] ユーザー情報の取得に失敗しました');
  return;
}

console.log('ログイン中のユーザー:', myUuid);
```

**内部処理**:
1. 初回呼び出し時: `GetMe` クエリを実行してUUIDを取得
2. 取得したUUIDをメモリキャッシュに保存
3. 2回目以降: キャッシュから即座に返す

**注意事項**:
- 非同期関数なので `await` が必要
- トークン切れの場合は `null` を返す（例外はスローしない）

---

### HenryCore.getToken()

Firebase Auth トークンを取得する。

**シグネチャ**:
```typescript
getToken(): Promise<string | null>
```

**戻り値**: `Promise<string | null>` - Firebaseトークン、または取得失敗時は `null`

**使用例**:
```javascript
const token = await HenryCore.getToken();
if (!token) {
  console.error('[SCRIPT_NAME] トークンが取得できませんでした');
  return;
}

// クロスドメイン連携時に GM_setValue で保存
GM_setValue('henry_auth_token', { token, savedAt: Date.now() });
```

---

### HenryCore.tokenStatus()

トークンの有効性と有効期限を確認する。

**シグネチャ**:
```typescript
tokenStatus(): Promise<{
  valid: boolean;
  expiration: Date;
  remainingMinutes: number;
} | null>
```

**戻り値**: トークンステータスオブジェクト、または取得失敗時は `null`

**使用例**:
```javascript
const status = await HenryCore.tokenStatus();
if (!status || !status.valid) {
  console.error('[SCRIPT_NAME] トークンが無効です');
  return;
}

console.log(`トークン有効期限: ${status.expiration}`);
console.log(`残り時間: ${status.remainingMinutes}分`);
```

---

## 3. プラグイン登録 (Plugin Registration)

### HenryCore.registerPlugin()

HenryToolbox にプラグイン（ボタン）を登録する。内部で Toolbox の出現待機を自動的に行う。

**シグネチャ**:
```typescript
registerPlugin(options: {
  label: string;
  event: string;
  order?: number;
}): Promise<boolean>
```

**パラメータ**:
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| `label` | string | ✅ | - | ボタンに表示するテキスト（絵文字可） |
| `event` | string | ✅ | - | クリック時に発火するカスタムイベント名 |
| `order` | number | - | 100 | 表示順序（小さいほど上） |

**戻り値**: `Promise<boolean>` - 登録成功時 `true`、失敗時 `false`

**使用例**:
```javascript
const registered = await HenryCore.registerPlugin({
  label: '📤 患者情報エクスポート',
  event: 'henry:patient-export',
  order: 20
});

if (!registered) {
  console.error('[SCRIPT_NAME] プラグイン登録に失敗しました');
  return;
}

// イベントハンドラの登録
window.addEventListener('henry:patient-export', async () => {
  const patientUuid = HenryCore.getPatientUuid();
  if (!patientUuid) return;

  // エクスポート処理...
});
```

**内部処理**:
1. `window.HenryToolbox` の出現を待機（タイムアウト: 10秒）
2. `HenryToolbox.register()` が存在することを確認
3. プラグインを登録

**注意事項**:
- `event` 名は `henry:` プレフィックスを推奨（例: `henry:export`, `henry:batch-approve`）
- `order` の標準値は 100、Henry Core 標準プラグインは 10-50 を使用
- HenryToolbox が見つからない場合は `false` を返す（例外はスローしない）

---

## 4. ユーティリティ (Utilities)

### HenryCore.utils.createCleaner()

破棄対象（タイマー、Observer等）を一括管理するためのクリーナーを作成する。

**シグネチャ**:
```typescript
createCleaner(): Cleaner

interface Cleaner {
  add(fn: () => void): void;
  exec(): void;
}
```

**使用例**:
```javascript
const cleaner = HenryCore.utils.createCleaner();

// タイマーの登録
const timerId = setTimeout(() => { ... }, 1000);
cleaner.add(() => clearTimeout(timerId));

// Observer の登録
const observer = new MutationObserver(callback);
observer.observe(target, config);
cleaner.add(() => observer.disconnect());

// SPA遷移時に一括破棄
window.addEventListener('henry:navigation', () => {
  cleaner.exec();
});
```

---

### HenryCore.utils.subscribeNavigation()

SPA遷移時に自動でクリーンアップ → 再初期化を行うヘルパー。

**シグネチャ**:
```typescript
subscribeNavigation(cleaner: Cleaner, initFn: () => void): void
```

**パラメータ**:
| 名前 | 型 | 説明 |
|------|-----|------|
| `cleaner` | Cleaner | `createCleaner()` で作成したクリーナー |
| `initFn` | function | 初期化関数（画面遷移のたびに実行される） |

**使用例**:
```javascript
const cleaner = HenryCore.utils.createCleaner();

HenryCore.utils.subscribeNavigation(cleaner, () => {
  // 画面遷移のたびに実行される初期化処理
  const button = document.createElement('button');
  button.textContent = 'エクスポート';
  document.body.appendChild(button);

  cleaner.add(() => button.remove());
});
```

**内部処理**:
1. `initFn` を即座に実行
2. `henry:navigation` イベントを監視
3. イベント発火時: `cleaner.exec()` → `initFn()` を実行

---

### HenryCore.utils.waitForElement()

指定したセレクタの要素が出現するまで待機する。

**シグネチャ**:
```typescript
waitForElement(selector: string, timeout?: number): Promise<HTMLElement | null>
```

**パラメータ**:
| 名前 | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `selector` | string | - | CSSセレクタ |
| `timeout` | number | 5000 | タイムアウト時間（ms） |

**戻り値**: `Promise<HTMLElement | null>` - 要素、またはタイムアウト時 `null`

**使用例**:
```javascript
const nameEl = await HenryCore.utils.waitForElement('[data-testid="patient-name"]', 3000);
if (!nameEl) {
  console.error('[SCRIPT_NAME] 患者名要素が見つかりませんでした');
  return;
}

console.log('患者名:', nameEl.textContent);
```

---

### HenryCore.utils.waitForGlobal()

グローバル変数が定義されるまで待機する。

**シグネチャ**:
```typescript
waitForGlobal(key: string, timeout?: number): Promise<any>
```

**パラメータ**:
| 名前 | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `key` | string | - | グローバル変数名（例: `'HenryToolbox'`） |
| `timeout` | number | 5000 | タイムアウト時間（ms） |

**戻り値**: `Promise<any>` - グローバル変数の値、またはタイムアウト時 `undefined`

**使用例**:
```javascript
const Toolbox = await HenryCore.utils.waitForGlobal('HenryToolbox', 10000);
if (!Toolbox) {
  console.error('[SCRIPT_NAME] HenryToolbox が見つかりませんでした');
  return;
}
```

**注意事項**:
- `registerPlugin()` を使用する場合、このメソッドを直接呼ぶ必要はない

---

### HenryCore.utils.sleep()

指定時間だけ処理を停止する。

**シグネチャ**:
```typescript
sleep(ms: number): Promise<void>
```

**使用例**:
```javascript
console.log('処理開始');
await HenryCore.utils.sleep(1000);
console.log('1秒後');
```

---

### HenryCore.utils.withLock()

同一キーに対する重複実行を防止する（インフライトロック）。

**シグネチャ**:
```typescript
withLock<T>(
  map: Map<string, Promise<T>>,
  key: string,
  generator: () => Promise<T>
): Promise<T>
```

**パラメータ**:
| 名前 | 型 | 説明 |
|------|-----|------|
| `map` | Map | インフライト管理用のMap（スクリプト側で用意） |
| `key` | string | ロックキー（例: 患者UUID） |
| `generator` | function | 実行する非同期関数 |

**戻り値**: `Promise<T>` - `generator` の戻り値

**使用例**:
```javascript
const inflight = new Map();

async function fetchPatientOnce(uuid) {
  return HenryCore.utils.withLock(inflight, uuid, async () => {
    const result = await HenryCore.call('GetPatient', { input: { uuid } });
    return result.data?.getPatient ?? null;
  });
}

// 同じUUIDで複数回呼んでも、API呼び出しは1回だけ
const p1 = fetchPatientOnce('uuid-123');
const p2 = fetchPatientOnce('uuid-123');
const p3 = fetchPatientOnce('uuid-123');

console.log(await p1 === await p2); // true（同じインスタンス）
```

**内部処理**:
1. `map.get(key)` で既存のPromiseを確認
2. 存在する場合: そのPromiseを返す（重複実行しない）
3. 存在しない場合: `generator()` を実行し、Promiseを `map.set(key, promise)` に保存
4. 完了後: `map.delete(key)` でクリーンアップ

---

### HenryCore.utils.createLogger()

スクリプト名プレフィックス付きのロガーを作成する。

**シグネチャ**:
```typescript
createLogger(name: string): Logger

interface Logger {
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

**使用例**:
```javascript
const log = HenryCore.utils.createLogger('MyScript');

log.info('処理開始');
log.warn('注意: データが古い可能性があります');
log.error('エラーが発生しました', error);
```

**出力例**:
```
[MyScript] 処理開始
[MyScript] ⚠️ 注意: データが古い可能性があります
[MyScript] ❌ エラーが発生しました Error: ...
```

---

## 5. UI コンポーネント (UI Components)

### HenryCore.ui.createButton()

Henry UI スタイルのボタンを作成する。

**シグネチャ**:
```typescript
createButton(props: {
  label: string;
  variant?: 'primary' | 'secondary';
  icon?: string;
  onClick?: () => void;
}): HTMLElement
```

**パラメータ**:
| 名前 | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `label` | string | - | ボタンのラベルテキスト |
| `variant` | string | 'primary' | `'primary'` または `'secondary'` |
| `icon` | string | - | Material Icons のアイコン名（例: `'save'`, `'download'`） |
| `onClick` | function | - | クリック時のハンドラ |

**戻り値**: `HTMLElement` - ボタン要素

**使用例**:
```javascript
const saveBtn = HenryCore.ui.createButton({
  label: '保存',
  variant: 'primary',
  icon: 'save',
  onClick: async () => {
    console.log('保存処理...');
  }
});

document.body.appendChild(saveBtn);
```

**スタイル**:
- `primary`: 青背景、白文字
- `secondary`: 白背景、グレー枠線

---

### HenryCore.ui.showModal()

モーダルダイアログを表示する。

**シグネチャ**:
```typescript
showModal(props: {
  title: string;
  content: string | HTMLElement;
  width?: string;
  closeOnOverlayClick?: boolean;
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary';
    autoClose?: boolean;
    onClick?: (event: Event, button: HTMLElement) => void;
  }>;
}): { close: () => void }
```

**パラメータ**:
| 名前 | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `title` | string | - | モーダルのタイトル |
| `content` | string \| HTMLElement | - | 本文（HTML文字列またはDOM要素） |
| `width` | string | - | モーダルの幅（例: `'700px'`） |
| `closeOnOverlayClick` | boolean | `true` | `false`でオーバーレイクリックによる閉じを無効化 |
| `actions` | array | `[]` | ボタンの配列 |
| `actions[].autoClose` | boolean | `true` | `false`でボタンクリック後の自動closeを無効化 |

**戻り値**: `{ close: () => void }` - モーダルを閉じるための関数

**使用例**:
```javascript
const modal = HenryCore.ui.showModal({
  title: '確認',
  content: '本当に削除しますか？この操作は取り消せません。',
  actions: [
    {
      label: 'キャンセル',
      variant: 'secondary',
      onClick: () => modal.close()
    },
    {
      label: '削除',
      variant: 'primary',
      onClick: async () => {
        await deletePatient();
        modal.close();
      }
    }
  ]
});
```

**HTMLコンテンツの例**:
```javascript
const contentEl = document.createElement('div');
contentEl.innerHTML = `
  <p>以下の患者情報をエクスポートします：</p>
  <ul>
    <li>山田太郎（やまだ たろう）</li>
    <li>生年月日: 1980-01-01</li>
  </ul>
`;

const modal = HenryCore.ui.showModal({
  title: 'エクスポート確認',
  content: contentEl,
  actions: [{ label: 'OK' }]
});
```

**閉じにくいモーダルの例** (v2.7.4+):
```javascript
const modal = HenryCore.ui.showModal({
  title: '入力フォーム',
  content: formElement,
  width: '700px',
  closeOnOverlayClick: false,  // オーバーレイクリックで閉じない
  actions: [
    {
      label: 'キャンセル',
      variant: 'secondary',
      autoClose: false,  // 自動で閉じない
      onClick: () => {
        if (confirm('入力内容が破棄されます。本当に閉じますか？')) {
          modal.close();
        }
      }
    },
    {
      label: '保存',
      autoClose: false,  // 自動で閉じない（成功時のみ手動で閉じる）
      onClick: async () => {
        const success = await saveData();
        if (success) modal.close();
      }
    }
  ]
});
```

---

## 6. エラーハンドリング (Error Handling)

### 基本パターン

```javascript
try {
  const result = await HenryCore.call('GetPatient', { input: { uuid } });
  if (!result.data?.getPatient) {
    console.error('[SCRIPT_NAME] 患者情報が見つかりませんでした');
    return null; // 静かに終了
  }

  // 正常処理
} catch (e) {
  console.error('[SCRIPT_NAME]', e.message);
  return null; // 静かに終了（UIは出さない）
}
```

### エラーの種類

| エラーメッセージ | 原因 | 対処 |
|----------------|------|------|
| `ハッシュが見つかりません` | 初回アクセス時、Henryの画面操作が不足 | Henryの画面を操作してハッシュを収集 |
| `トークンが取得できませんでした` | ログアウト状態 | 再ログインを促す |
| `401 Unauthorized` | トークン期限切れ | 再ログインを促す |
| `429 Too Many Requests` | レート制限 | バックオフして再試行 |
| `GraphQL error` | クエリ構文エラー、変数不足 | クエリ定義を確認 |

---

## 7. パフォーマンス最適化 (Performance)

### ハッシュキャッシュの仕組み

Henry Core は以下の2段階キャッシュでハッシュを管理している：

1. **IndexedDB** (永続化): ブラウザを閉じても保持される
2. **メモリキャッシュ** (揮発性): ページリロード時にクリア

**フロー**:
```
初回アクセス → fetch intercept → ハッシュ収集 → IndexedDB保存 → メモリキャッシュ
2回目以降 → メモリキャッシュから取得（IndexedDBアクセスなし）
```

**利点**:
- APIリクエストのたびにIndexedDBを読まない（高速）
- ブラウザを閉じても再収集不要

---

### インフライトロック

同一リソースへの重複リクエストを防ぐ。

```javascript
const inflight = new Map();

async function fetchPatient(uuid) {
  return HenryCore.utils.withLock(inflight, uuid, async () => {
    const result = await HenryCore.call('GetPatient', { input: { uuid } });
    return result.data?.getPatient ?? null;
  });
}
```

---

### バッチ処理のベストプラクティス

```javascript
const BASE_DELAY = 150;  // リクエスト間隔
const MAX_DELAY = 5000;  // 最大バックオフ

let delay = BASE_DELAY;

for (const item of items) {
  try {
    await processItem(item);
    delay = BASE_DELAY; // 成功時はリセット
  } catch (e) {
    if (e.message.includes('429')) {
      delay = Math.min(delay * 2, MAX_DELAY); // 429時はバックオフ
    }
  }

  await HenryCore.utils.sleep(delay);
}
```

---

## 8. デバッグ・トラブルシューティング (Debug & Troubleshooting)

### HenryCore.dumpHashes()

収集済みハッシュ一覧をコンソールに表形式で出力する（デバッグ用）。

**シグネチャ**:
```typescript
dumpHashes(): Promise<Record<string, { hash: string, endpoint: string }>>
```

**戻り値**: `Promise<object>` - ハッシュ一覧のオブジェクト

**使用例**:
```javascript
await HenryCore.dumpHashes();
```

**コンソール出力例**:
```
┌─────────┬───────────────────────┬───────────────┬──────────────────────┐
│ (index) │    operationName      │   endpoint    │        hash          │
├─────────┼───────────────────────┼───────────────┼──────────────────────┤
│    0    │      'GetPatient'     │  '/graphql'   │ 'a1b2c3d4e5f6g7...'  │
│    1    │   'ListPatientFiles'  │ '/graphql-v2' │ 'h8i9j0k1l2m3n4...'  │
└─────────┴───────────────────────┴───────────────┴──────────────────────┘
```

**用途**:
- どのクエリがどのエンドポイントを使用しているか確認
- ハッシュ収集状況の確認
- エンドポイント振り分けの検証

---

### HenryCore.clearHashes()

収集済みのハッシュを全てクリアする（トラブルシューティング用）。

**シグネチャ**:
```typescript
clearHashes(): Promise<void>
```

**使用例**:
```javascript
await HenryCore.clearHashes();
// コンソール: [Henry Core] 全ハッシュをクリアしました。Henryを操作して再収集してください。
```

**用途**:
- ハッシュが古くなった場合の強制再収集
- APIエラーが続く場合のリセット
- 開発中のデバッグ

**注意事項**:
- クリア後は再度Henryの画面を操作してハッシュを収集する必要がある
- 本番環境では通常使用しない（開発・デバッグ専用）

---

### HenryCore.getHashes()

収集済みハッシュ一覧を取得する（プログラムから利用する場合）。

**シグネチャ**:
```typescript
getHashes(): Promise<Record<string, { hash: string, endpoint: string }>>
```

**戻り値**: `Promise<object>` - ハッシュ一覧のオブジェクト

**使用例**:
```javascript
const hashes = await HenryCore.getHashes();
console.log(Object.keys(hashes)); // ['GetPatient', 'ListPatientFiles', ...]

if (!hashes['GetPatient']) {
  console.warn('GetPatientのハッシュが未収集です');
}
```

---

## 変更履歴

| Version | Date | Changes |
|---------|------|---------|
| v2.7.4 | 2026-01-05 | `showModal`に`closeOnOverlayClick`、`width`、`action.autoClose`オプションを追加 |
| v2.6.9 | 2026-01-04 | 初版作成。Henry Core v2.6.9 の仕様を文書化。デバッグメソッド（dumpHashes, clearHashes）を追加 |
