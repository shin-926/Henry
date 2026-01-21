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

---

## MutationObserver 使用状況調査 (2026-01-16)

### 全スクリプトの使用状況

| ファイル名 | 数 | 監視対象 | オプション | 処理内容 |
|---------|---|---------|-----------|---------|
| **henry_core.user.js** | 1 | `document.body` または `documentElement` | `childList, subtree` | セレクタ要素の出現待機（waitForElement） |
| **henry_login_helper.user.js** | 1 | `document.body` | `childList, subtree` | メールアドレス入力フィールド出現検出 |
| **henry_reserve_integration.user.js** | 4 | `document.body` | `childList, subtree` ※tooltipは`attributes`追加 | ポップアップ削除、ダイアログ検出、患者ID自動入力、ツールチップ拡張 |
| **henry_set_search_helper.user.js** | 1 | `document.body` | `childList, subtree` | セットパネル開閉検出（debounce 100ms） |
| **henry_rad_order_auto_printer.user.js** | 2 | `document.body` | `childList, subtree, attributes, characterData` | 要素出現待機＋DOM安定化待機 |
| **henry_toolbox.user.js** | 1 | `document.body` | `childList, subtree` | ツールボックスUI監視・再構築 |
| **henry_imaging_order_helper.user.js** | 2 | `document.body` / `modal` | `childList, subtree` | モーダル出現検出＋内部要素変化検出 |
| **henry_google_drive_bridge.user.js** | 1 | `document.body` | `childList, subtree` | ファイルリストボタン再作成 |
| **reserve_calendar_ui.user.js** | 1 | `#div_swipe_calendar` | `childList, subtree: false` | カレンダー設定再適用（最適化済み） |
| **henry_rad_order_print_single_page.user.js** | 1 | `document.body` | `childList, subtree` | iframe出現検出（debounce 500ms） |

### MutationObserver未使用（11ファイル）

henry_auto_approver, henry_note_reader, henry_error_logger, henry_disease_list, henry_karte_history, henry_order_history, henry_hospitalization_data, henry_memo, henry_disease_register, henry_search_focus, henry_ikensho_form

### 統計

- **使用スクリプト**: 10ファイル
- **全インスタンス数**: 15個
- **大半が `document.body` + `subtree: true`**: 広範囲監視が多い

---

## MutationObserver コールバック処理コスト（重い順）

| 順位 | スクリプト | コスト | 主な理由 |
|:---:|-----------|:---:|---------|
| 1 | **henry_imaging_order_helper.user.js** | 🔴 重 | React Fiber走査（10〜15階層）、querySelectorAll('h2'), querySelectorAll('label')を毎回実行、subtree:true |
| 2 | **henry_reserve_integration.user.js** | 🔴 重 | 4つのObserver並走、SPA遷移でリーク可能性、複数querySelector |
| 3 | **henry_rad_order_auto_printer.user.js** | 🔴 重 | querySelectorAll複数、getBoundingClientRect複数、ネストしたObserver |
| 4 | henry_google_drive_bridge.user.js | 🟡 中 | JSON.parse毎回、配列操作多い（早期リターンで軽減） |
| 5 | henry_toolbox.user.js | 🟡 中 | querySelector×4、DOM作成（一度作成後はスキップ） |
| 6 | henry_set_search_helper.user.js | 🟡 中 | 大量DOM作成（debounce 100msで軽減） |
| 7 | henry_login_helper.user.js | 🟢 軽 | querySelector×1のみ |
| 8 | reserve_calendar_ui.user.js | 🟢 軽 | subtree:false化済み、早期リターン多い |
| 9 | henry_core.user.js | 🟢 軽 | イベント発火のみ |
| 10 | henry_rad_order_print_single_page.user.js | 🟢 軽 | シンプルな検出のみ |

### MutationObserverの発火条件

| オプション | 検出する変化 |
|-----------|-------------|
| `childList: true` | 子要素の追加・削除 |
| `subtree: true` | 上記を子孫全体に適用 |
| `attributes: true` | 属性の変更（class, style, data-*など） |
| `characterData: true` | テキストノードの内容変更 |

**発火するもの**: ドロップダウン開閉、モダリティ変更、内容追加、バリデーションエラー、ローディング表示

**発火しないもの**: テキスト入力（valueはプロパティ）、マウスホバー（CSS :hover）、スクロール

### 最適化アプローチ

| 方式 | メリット | デメリット |
|------|---------|-----------|
| `subtree: false` | 発火回数激減 | 深い階層の変化を検出できない |
| debounce追加 | 連続発火を集約 | 遅延が発生 |
| setIntervalポーリング | 発火頻度が固定（例: 3.3回/秒） | 変化がなくても実行される |
| 処理済みフラグ | 重複処理を防止 | フラグ管理が必要 |
| 自前UI | MutationObserver不要 | 開発コスト大 |

---

## TASK-016: Henryのリアルタイム同期調査 (2026-01-17)

### 調査結果

HenryはCloud Firestoreを使用してリアルタイム同期を実現している。

### 技術スタック

| コンポーネント | 役割 |
|---------------|------|
| **Cloud Firestore** | リアルタイムデータベース |
| **Long Polling** | `firestore.googleapis.com/.../Listen/channel` で変更を監視 |
| **Apollo Client** | GraphQLキャッシュでUIのデータ管理 |
| **React** | UIレンダリング |

### 確認されたエンドポイント

```
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=project...
```

複数の接続が確立されており、Long Pollingでリアルタイム更新を受信している。

### データフロー

```
他ユーザーが患者追加/変更
        ↓
   Firestore DB更新
        ↓
  Listen/channel で通知（Long Polling）
        ↓
[firebase] updatedSessions ログ出力
        ↓
  Apollo Cache更新（？）
        ↓
     React UIレンダリング
```

### コンソールログ

```
[debug] [firebase] updatedSessions: []   // 変更があるとここに配列でデータが来る
```

### 考察

- Firestoreからの通知自体は動作している（`[firebase] updatedSessions` ログで確認）
- 「画面更新が行われない問題」がある場合、原因はFirestore→Apollo Cache→Reactの連携部分
- 具体的には：
  1. Firestoreの更新がApollo Cacheに反映されていない
  2. Apollo Cacheは更新されているがReactが再レンダリングしていない
  3. 特定の条件下でFirestoreリスナーが切断されている

### 今後の調査ポイント

- [ ] 他ユーザーが患者追加したときの `updatedSessions` の中身を確認
- [ ] Apollo Cache（`window.__APOLLO_CLIENT__.cache`）の更新状況を監視
- [ ] 問題発生時のFirestore接続状態を確認

---

## HenryCore API よくある間違い

### registerPlugin の正しい使い方

**間違い（サポートされていない形式）:**
```javascript
// ❌ actions配列は存在しない
registerPlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    actions: [
        { id: 'action1', label: 'Action 1', handler: () => ... }
    ]
});
```

**正しい形式:**
```javascript
// ✓ onClick で直接ハンドラーを指定
await registerPlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    icon: '🔧',           // 省略可
    description: '説明',   // 省略可
    version: '1.0.0',     // 省略可
    order: 100,           // 省略可（表示順序）
    onClick: () => {
        // クリック時の処理
    }
});
```

**仕様（henry_core.user.js より）:**
```
registerPlugin({ id, name, icon?, description?, version?, order?, onClick })
```

**ポイント:**
- **1プラグイン = 1アクション**の形式
- 複数アクションが必要な場合は、`onClick`内でメニューを表示するか、別プラグインとして登録
- `await`を付けて呼び出すこと（非同期関数）

---

## TASK-022: henry_imaging_order_helper リファクタリング改善

**対象**: henry_imaging_order_helper.user.js
**起票日**: 2026-01-18
**優先度**: 低（現状で十分動作、将来の保守性向上のため）

### 背景

v1.25.0でリファクタリングを実施（マジックナンバー定数化、スタイル定数化、find*Input関数の統合など）。Geminiレビューにより追加の改善点が提案された。

### 改善項目

#### a. 残りのマジックナンバーを定数化
- `findNoteInputs` の `3`（最小noteInput数）
- `hideAutoFilledFields` の `4`（自動入力行数）

```javascript
// 例
const DOM_SEARCH = {
  ...
  MIN_NOTE_INPUTS: 3,      // findNoteInputsで必要な最小数
  AUTO_FILLED_ROWS: 4      // hideAutoFilledFieldsの自動入力行数
};
```

#### b. 追加スタイルをSTYLES定数に統合
- `injectToggleButton` 内のトグルボタンスタイル
- `createSelect` 内のセレクト要素スタイル

#### c. injectHelperUI のさらなる分割
- 現在約650行の大きな関数
- 行番号指定やMD指定など、論理的なブロックごとに分割可能
- 優先度低：現状でも動作に問題なし

#### d. リセットロジックの重複解消
- 各入力フィールドのリセット処理が複数箇所に散在
- 共通のリセット関数にまとめる

### 実装方針

- 機能追加や大きな変更のタイミングでついでに対応
- 単独でのリファクタリングは優先度低

---

## TASK-021: MutationObserver コールバック最適化調査

**調査日**: 2026-01-20
**ステータス**: 調査完了、レビュー待ち

### 調査対象

MutationObserverを使用している全スクリプトについて、以下の観点で調査:
1. 監視範囲が適切か（document.body全体 vs 特定コンテナ）
2. クリーンアップ（disconnect）が行われているか
3. debounce/早期リターンなどの最適化があるか

### 調査結果

| スクリプト | 状態 | 詳細 |
|-----------|------|------|
| henry_core.user.js | ✅ OK | waitForElement内で使用。timeout+disconnect付き |
| henry_reception_filter.user.js | ✅ OK | 特定コンテナを監視 + cleaner登録 |
| reserve_calendar_ui.user.js | ✅ OK | 特定ノード、subtree:false |
| henry_rad_order_print_single_page.user.js | ✅ OK | debounce使用、印刷ページ（短命） |
| henry_login_helper.user.js | ✅ OK | ログインページ専用（非SPA） |
| henry_set_search_helper.user.js | ⚠️ 軽微 | debounceあるがbody全体監視 |
| henry_google_drive_bridge.user.js | ⚠️ 軽微 | body全体監視、disconnectなし |
| henry_toolbox.user.js | ⚠️ 軽微 | body全体監視、早期リターンあり |

### 完了済み

- henry_imaging_order_helper.user.js - 2段階監視パターン適用済み
- henry_reserve_integration.user.js - 2段階監視パターン適用済み

### 結論

**緊急度: 低**

⚠️マークの3スクリプトについて:
- いずれも実害は確認されていない
- debounceや早期リターンで緩和されている
- 改善するなら2段階監視パターンを適用

改善の優先度は低いが、機能追加や他の修正のついでに対応することを推奨。

---

## fetchインターセプトとFirestore競合問題

### 背景

`henry_google_drive_bridge.user.js` でfetchをインターセプトしていたところ、HenryのFirestoreでWebChannel接続エラーが頻発した。

```
@firebase/firestore: WebChannelConnection RPC 'Listen' stream transport errored
Could not reach Cloud Firestore backend. Connection failed 1 times.
```

### 原因

通常のfetchインターセプト方式では、`fetch` 関数を完全に置き換えるため、ネイティブ関数の同一性が失われる。

```javascript
// 問題のあるコード
const originalFetch = pageWindow.fetch;
pageWindow.fetch = async function(url, options) {
  return originalFetch.apply(this, arguments);
};

// この後、fetch.toString() は "[native code]" を返さなくなる
// Firestoreのような厳格なライブラリはこれを検出してエラーにする
```

### 解決策: Proxy方式

`Proxy` を使うことで、元の `fetch` オブジェクトへの参照を保持しつつ、呼び出しをインターセプトできる。

```javascript
const originalFetch = pageWindow.fetch;
pageWindow.fetch = new Proxy(originalFetch, {
  apply: async function(target, thisArg, argumentsList) {
    // 必要な処理（例: GraphQLレスポンスのキャッシュ）
    const [url, options] = argumentsList;
    const response = await Reflect.apply(target, thisArg, argumentsList);
    
    if (url?.includes?.('/graphql')) {
      // GraphQL用の処理
    }
    
    return response;
  }
});
```

### なぜProxyで解決するか

| 項目 | 通常方式 | Proxy方式 |
|------|---------|-----------|
| `fetch.toString()` | `"function(url, options) {...}"` | `"function fetch() { [native code] }"` |
| `fetch.name` | `""` または `"anonymous"` | `"fetch"` |
| 元オブジェクトの参照 | 失われる | 保持される |
| 厳格なライブラリとの互換性 | 低い | 高い |

### 適用判断

- **通常は従来方式でOK** - 単純なfetchインターセプトなら問題ない
- **問題が起きたらProxy方式に変更** - Firestore等との競合が発生した場合

### 関連

- 修正コミット: `16b1813 fix: Firestore WebChannelエラーを修正`
- 対象ファイル: `henry_google_drive_bridge.user.js` v2.3.2
