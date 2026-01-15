# 開発メモ・調査ノート

> このファイルは調査結果や実装メモを記録する場所です。
> ルール・ガイドラインは `CLAUDE.md` を参照。

---

## chrome-devtools-mcp 起動手順

Claude Codeがブラウザを直接操作・監視できるようにするための設定。

### 1. デバッグ用Chromeを起動

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/chrome-debug-profile
```

**注意**:
- 通常のChromeプロファイルとは別の専用プロファイル（`~/chrome-debug-profile`）を使用
- このプロファイルにはTampermonkeyと全てのHenryスクリプトがインストール済み
- 既に通常のChromeが起動している場合でも問題なく起動できる

### 2. Claude Codeを再起動

MCPサーバーが接続されるのを確認（起動時に `chrome-devtools` が表示される）

### 3. 利用可能な主要機能

| 機能 | ツール名 | 用途 |
|------|---------|------|
| ページ一覧 | `list_pages` | 開いているタブを確認 |
| DOM確認 | `take_snapshot` | アクセシビリティツリーでDOM構造を取得 |
| クリック | `click` | ボタンやリンクをクリック |
| 入力 | `fill` | テキストフィールドに入力 |
| ネットワーク | `list_network_requests` | GraphQL等のリクエストをキャプチャ |
| リクエスト詳細 | `get_network_request` | リクエスト/レスポンスボディを取得 |
| コンソール | `list_console_messages` | console.log出力を確認 |
| ナビゲーション | `navigate_page` | URLへ移動 |
| スクリーンショット | `take_screenshot` | 画面キャプチャ |

### 4. 活用シーン

- **GraphQL API調査**: 画面操作しながら `list_network_requests` でAPIをキャプチャ
- **スクリプト動作確認**: `list_console_messages` でログ出力を直接確認
- **UI操作テスト**: `click`, `fill` でユーザー操作をシミュレート
- **DOM調査**: `take_snapshot` でセレクタ候補を確認

---

## Apollo Client による画面更新

HenryはReact + Apollo Clientを使用。データ変更後に画面を更新するには `refetchQueries` を使用する。

### 仕組み

```
Mutation（データ変更）
    ↓
refetchQueries({ include: ['クエリ名'] })
    ↓
サーバーにクエリを再リクエスト
    ↓
Apollo キャッシュ更新
    ↓
React が自動的にUI再描画
```

### 使い方

```javascript
// グローバルに公開されている Apollo Client インスタンス
if (unsafeWindow.__APOLLO_CLIENT__) {
  unsafeWindow.__APOLLO_CLIENT__.refetchQueries({ include: ['ListSessions'] });
}
```

### 主要なクエリ名

| クエリ名 | 用途 |
|---------|------|
| `ListSessions` | 受付一覧（外来予約リスト） |
| `ListPatientFiles` | 患者ファイル一覧 |

**注意**: クエリ名はHenryが実際に使っているものを chrome-devtools-mcp で調査して確認すること。

---

## TASK-002: オーダーセット選択UI

**目的**: 既存のセット選択UIが遅く操作性が悪いため、独自の高速UIを作成する

### 判明済みの情報

**1. 空のオーダーセットを作成する関数**
```javascript
async function createEmptySet(title, folderId = "90518b91-bf8c-482f-9268-5146b03318fa") {
  const result = await fetch('https://henry-app.jp/graphql-v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${await HenryCore.getToken()}`,
      'x-auth-organization-uuid': 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825'
    },
    body: JSON.stringify({
      operationName: 'SaveEncounterTemplate',
      variables: {
        input: {
          id: crypto.randomUUID(),
          title: title,
          description: "",
          startDate: null,
          endDate: null,
          folderId: folderId,
          isDraft: false
        }
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: "686c44230dbad179cefe87737e2b32c66457d2c5ce0fb3c43f70b2d68020143b"
        }
      }
    })
  }).then(r => r.json());
  return result;
}
```

**2. セット展開API（ExpandEncounterTemplate）**
- エンドポイント: `https://henry-app.jp/graphql-v2`
- APQハッシュ: `9399993dc569309020791a2c70c5171f9e87cc7e5ec0d433f4130c5a3de02685`
- 必要なパラメータ:
  - `encounterId`: 展開先の診察UUID
  - `encounterTemplateId`: 展開するオーダーセットのUUID
  - `progressNoteTemplateInsertPositionInput`: `{ progressNoteId, blockIndex }`
  - `extendedInsuranceCombinationHrn`: null（既定の保険）
  - `asNewOrder`: false

**3. 現在の診察ID取得方法**
```javascript
const cache = window.__APOLLO_CLIENT__?.cache?.data?.data;
const rootQuery = cache?.ROOT_QUERY;
// "encounter({"id":"..."})" のキーから抽出
const encounterKey = Object.keys(rootQuery || {}).find(k => k.startsWith('encounter({"id":'));
const encounterId = encounterKey?.match(/"id":"([a-f0-9-]{36})"/)?.[1];
```

**4. プログレスノートID取得方法**
```javascript
const cache = window.__APOLLO_CLIENT__?.cache?.data?.data;
const progressNotes = Object.entries(cache)
  .filter(([k, v]) => k.startsWith('ProgressNote:') || v?.__typename === 'ProgressNote')
  .map(([k, v]) => ({ key: k, id: v.id }));
```

### 未調査
- オーダーセット一覧取得API（`encounterTemplates`）のハッシュ
- フォルダ一覧取得API（`encounterTemplateFolders`）のハッシュ
- UIの設計（モーダル or サイドパネル、検索機能など）

---

## TASK-003: 病名サジェスト機能

**目的**: カルテ内容を読み取り、登録すべき病名をClaudeで推論・提案する

### 完了済み
- カルテ内容読み取りスクリプト (`henry_note_reader.user.js` v1.0.1)
- Claude API (claude-haiku-4-5) 動作確認
- 病名登録API (`UpdateMultiPatientReceiptDiseases`) 動作確認
- 整形外科病名リスト (ICD-10 Mコード 1989件) → `整形外科病名リスト.csv`
- 病名マスター・修飾語マスターをUTF-8に変換
- 修飾語リスト作成済み → `修飾語リスト.csv` (2387件)
- 病名登録スクリプト作成 → `henry_disease_register.user.js` v1.0.0

### 未実装
- 頻用病名リストを作成する（ユーザー作業）
- Claude APIで病名を推論するロジック
- 病名サジェストUI
- 確認後に病名登録APIを呼び出す

---

## TASK-001: ORDER_STATUS_REVOKED 調査

**問題**: CONFIRM_REVOCATION アクションで処理しているが、承認できずに残るケースがある

**調査方法**: devtoolで手動承認時に飛ぶAPIを確認

**確認ポイント**:
- operationName
- orderStatusAction
- 追加パラメータ

---

## TASK-004/005/006: GraphQL API 未収集リスト（2026-01-12時点）

以下の画面を操作するとAPIを収集できる可能性がある。

### 高優先度

**TASK-004: 患者保険・資格画面**（患者詳細 → 保険タブ）
- ListPatientHealthInsurances, ListPatientLongTermCareInsurances, ListPatientPublicSubsidies
- ListPatientCeilingAmountApplications, ListPatientHealthcareFeeExemptionCertificates
- ListPatientTokuteiSippeiRyouyouJuryoushous, DefaultExtendedInsuranceCombination

**TASK-005: 注射オーダー**（オーダー → 注射）
- CreateInjectionOrder, GetInjectionOrder, InjectionOrder
- SearchInjectionTechniques, CreateInjectionOrderOrderStatusAction

**TASK-006: 外来会計画面**（受付 → 会計）
- OutpatientAccountingCost, OutpatientAccountingEncounters
- OutpatientAccountingPatientBurdenValidationReports, OutpatientAccountingUnSyncedEncounterCounts
- OutpatientProblemReport, ListOutpatientAccountingForNavigation
- ListOutpatientAccountingWithBilling, EncounterByOutpatientAccounting

### 中優先度

**オーダー承認操作**
- CreatePrescriptionOrderOrderStatusAction（処方承認）
- CreateRehabilitationOrderOrderStatusAction（リハビリ承認）

**処方履歴**（処方オーダー → 履歴タブ）
- ListPrescriptionOrderHistories

**患者ファイル操作**（アップロード・編集）
- CreatePatientFile, UpdatePatientFile

**患者登録**（新規患者登録画面）
- CreatePatient

### 低優先度

**生検オーダー**
- GetBiopsyInspectionOrder, ListBiopsyInspectionOrderHistories, ListLatestFinalizedBiopsyInspectionOrderHistories

**入院会計・レセプト**
- ListHospitalizationAccountingSummaries, ListReceiptRemarksColumns
- ListResubmittableReceipts, ListPatientReceiptTokkijiko, ListPatientSessionInvoices

**食事・栄養**
- GetFoodSupplyConfig, ListDietaryRegimens, ListFood

**看護**
- ListEndedNursingPlans, ListNursingJournals

**その他**
- UpdateClinicalDocument, ListSurgeryDocuments, ListComments
- GetOrganizationMembershipWithDetail, LockOAEditor
- ListLocalMedicines, ListSymptomDescriptions, ListAvailableMhlwDefinitions
- GetCalculationHistory, ListFf1RecordSlots, ListNonHealthcareSystemActions

---

## Google Docs連携メタデータ

患者文書を作成・編集するスクリプトでは、以下のメタデータをGoogle Driveのファイルプロパティに設定：

| プロパティ | 説明 |
|-----------|------|
| `henryPatientUuid` | 患者UUID（必須） |
| `henryFileUuid` | ファイルUUID（上書き保存用、新規は空） |
| `henryFolderUuid` | フォルダUUID（保存先、ルートなら空） |
| `henrySource` | 作成元識別子（例: `drive-direct`） |

## GraphQL インライン方式

### 背景

HenryのGraphQLサーバーは一部のmutationで入力型（例: `UpdateMultiPatientReceiptDiseasesInput`）を公開していない。そのため、変数型を使ったクエリがエラーになる。

### エラー例

```
Validation error (UnknownType) : Unknown type 'UpdateMultiPatientReceiptDiseasesInput'
```

### 解決策: インライン方式

変数型を使わず、値をクエリに直接埋め込む。

**NG: 変数型**
```javascript
const MUTATION = `
  mutation UpdateMultiPatientReceiptDiseases($input: UpdateMultiPatientReceiptDiseasesInput!) {
    updateMultiPatientReceiptDiseases(input: $input) {
      patientReceiptDiseases { uuid }
    }
  }
`;
await HenryCore.query(MUTATION, { input: data });
```

**OK: インライン方式**
```javascript
const MUTATION = `
  mutation {
    updateMultiPatientReceiptDiseases(input: {
      records: [{
        recordOperation: RECORD_OPERATION_CREATE,
        patientReceiptDisease: {
          patientUuid: "${patientUuid}",
          masterDiseaseCode: "${diseaseCode}",
          isMain: ${isMain},
          outcome: CONTINUED,
          startDate: { year: ${year}, month: ${month}, day: ${day} }
        }
      }]
    }) {
      patientReceiptDiseases { uuid }
    }
  }
`;
await HenryCore.query(MUTATION);  // 変数なし
```

### 注意点

1. **文字列はダブルクォートで囲む**: `"${value}"`
2. **数値・boolean・enumはそのまま**: `${num}`, `${bool}`, `ENUM_VALUE`
3. **nullはそのまま**: `null`
4. **配列**: `[${items.map(i => `"${i}"`).join(', ')}]`

### 適用実績

- `henry_disease_register.user.js` v1.2.1 - 病名登録mutation


---

## TASK-014: 画面更新妨害リスク修正

### 問題概要

Henry本体の画面更新（外来待ち患者リストなど）を妨害する可能性のあるTampermonkeyスクリプト実装が複数存在。Henryはおそらく内部でReactを使っており、イベントハンドリングや状態更新が妨害されると画面が更新されなくなる可能性がある。

---

### 背景知識（AI向け）

#### DOMイベントの伝播（Event Propagation）

クリック等のイベントは、3つのフェーズで伝播する：

```
1. キャプチャフェーズ（親→子）: window → document → body → div → button
2. ターゲットフェーズ: button（クリックされた本人）
3. バブリングフェーズ（子→親）: button → div → body → document → window
```

#### キャプチャ vs バブリング

```javascript
// バブリング（デフォルト）- 子の処理が先、親は後
element.addEventListener('click', handler);

// キャプチャ（第3引数 true）- 親の処理が先、子は後
element.addEventListener('click', handler, true);
```

- **Reactはバブリングフェーズでイベントを処理する**
- キャプチャフェーズでイベントを止めると、Reactに届かなくなる

#### イベント伝播の停止メソッド

| メソッド | 効果 |
|---------|------|
| `stopPropagation()` | 親/子への伝播を停止（同一要素の他リスナーは動く） |
| `stopImmediatePropagation()` | 伝播停止＋同一要素の他リスナーも全て停止 |
| `preventDefault()` | デフォルト動作（リンク遷移等）を停止 |

`stopImmediatePropagation()` が最も危険。Henry本体のリスナーも止めてしまう。

#### MutationObserverの問題

- `document.body` 全体を監視すると、Reactの仮想DOM更新にも反応してしまう
- 監視対象のDOMを変更すると、自分のコールバックが再度トリガーされる（無限ループの危険）

---

### 修正対象

#### ✅ CRITICAL（完了）- キャプチャフェーズの削除

| スクリプト | バージョン | 修正内容 |
|-----------|-----------|---------|
| henry_search_focus.user.js | 1.5.2 | keydown イベントからキャプチャフェーズ削除 |
| henry_rad_order_auto_printer.user.js | 4.0.2 | click イベントからキャプチャフェーズ削除 |
| henry_login_helper.user.js | 6.9.2 | scroll イベントからキャプチャフェーズ削除（バグ修正も兼ねる） |

**備考**: henry_login_helper.js の scroll キャプチャは、ドロップダウン内スクロールで閉じてしまうバグの原因だった

#### ⏭️ 対象外 - イベント抑制（意図的な使用）

| スクリプト | 行番号 | 状況 |
|-----------|--------|------|
| henry_google_drive_bridge.user.js | 714-716 | `stopImmediatePropagation()` は意図的な使用 |

**理由**: ファイルダブルクリック時にHenry本体の動作を止めて、Google Drive変換処理に置き換えるため。削除すると二重動作になる。

#### ➡️ TASK-015へ移動 - MutationObserver/リソースクリーンアップ

MutationObserverやsetIntervalのクリーンアップ問題は、より広範な「SPA遷移対応」として TASK-015 で対応。

---

## TASK-015: 全スクリプトのSPA遷移対応

### 問題概要

HenryはSPA（Single Page Application）のため、ページ遷移してもリロードされない。
`subscribeNavigation` を使わないスクリプトは、遷移後もリソース（Observer, タイマー, リスナー）が残り続ける。

### 対象スクリプト

#### ❌ subscribeNavigation未使用（要対応）

| スクリプト | 必要性 |
|-----------|--------|
| henry_login_helper.user.js | 不要（ログインページ専用） |
| henry_disease_list.user.js | 要確認 |
| henry_disease_register.user.js | 要確認 |
| henry_error_logger.user.js | 要確認 |
| henry_hospitalization_data.user.js | 要確認 |
| henry_ikensho_form.user.js | 要確認 |
| henry_karte_history.user.js | 要確認 |
| henry_memo.user.js | 要確認 |
| henry_note_reader.user.js | 要確認 |
| henry_order_history.user.js | 要確認 |
| henry_rad_order_print_single_page.user.js | 要確認 |
| henry_reserve_integration.user.js | **必要**（MutationObserver 4つ） |
| henry_toolbox.user.js | 要確認 |

#### ✅ subscribeNavigation使用中（対応済み）

- henry_auto_approver.user.js
- henry_google_drive_bridge.user.js
- henry_imaging_order_helper.user.js
- henry_rad_order_auto_printer.user.js
- henry_search_focus.user.js
- henry_set_search_helper.user.js

### 判断基準

`subscribeNavigation` が必要なのは、以下のリソースを使うスクリプト：

- MutationObserver
- setInterval / setTimeout
- addEventListener（document/windowレベル）
- グローバル変数に状態を保持

### 修正パターン

```javascript
// Before: クリーンアップなし
const observer = new MutationObserver(callback);
observer.observe(document.body, { childList: true, subtree: true });

// After: subscribeNavigationパターン
const cleaner = HenryCore.utils.createCleaner();

function init() {
  const observer = new MutationObserver(callback);
  observer.observe(document.body, { childList: true, subtree: true });
  cleaner.add(() => observer.disconnect());
}

HenryCore.utils.subscribeNavigation(cleaner, init);
```
