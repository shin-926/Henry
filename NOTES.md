# 開発メモ・調査ノート

> このファイルは調査結果や実装メモを記録する場所です。
> ルール・ガイドラインは `CLAUDE.md` を参照。

---

## 目次

1. [ツール・設定](#ツール設定)
2. [E2Eテスト](#e2eテスト)
3. [実装パターン](#実装パターン)
   - [Google連携](#google連携)
   - [GraphQL](#graphql)
   - [SPA/React](#spareact)
   - [その他](#その他)
4. [MutationObserver関連](#mutationobserver関連)
5. [運用手順](#運用手順)

---

# ツール・設定

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

# E2Eテスト

## テスト実行方法

### 前提条件

1. Chrome がデバッグモードで起動していること
2. Tampermonkey + Henry スクリプトがインストールされていること
3. Henry にログイン済みであること

### コマンド

```bash
# 全テスト実行
npx playwright test

# 特定のテストファイル実行
npx playwright test tests/disease-register.spec.js
npx playwright test tests/toolbox.spec.js
npx playwright test tests/reserve-integration.spec.js
npx playwright test tests/imaging-order.spec.js
```

## テスト対応表

| スクリプト | テストファイル | 実行コマンド |
|-----------|---------------|-------------|
| henry_disease_register.user.js | tests/disease-register.spec.js | `npx playwright test tests/disease-register.spec.js` |
| henry_toolbox.user.js | tests/toolbox.spec.js | `npx playwright test tests/toolbox.spec.js` |
| henry_reserve_integration.user.js | tests/reserve-integration.spec.js | `npx playwright test tests/reserve-integration.spec.js` |
| henry_imaging_order_helper.user.js | tests/imaging-order.spec.js | `npx playwright test tests/imaging-order.spec.js` |

### テストがないスクリプト

以下のスクリプトはまだE2Eテストが作成されていません：

- henry_core.user.js（基盤）
- henry_auto_approver.user.js
- henry_login_helper.user.js
- henry_set_search_helper.user.js
- henry_reception_filter.user.js
- henry_memo.user.js
- henry_hospitalization_search.user.js
- henry_order_history.user.js
- henry_google_drive_bridge.user.js
- henry_ikensho_form.user.js
- henry_referral_form.user.js
- henry_application_form_*.user.js（各種申込書フォーム）

## テスト作成ガイドライン

1. **CDP接続パターン**: 既存ブラウザに接続して実際のTampermonkey環境をテスト
2. **テスト患者使用**: 必ずテスト患者を使用する（実患者データは使用禁止）
3. **入院患者テスト**: 入院患者でのテストが必要な場合はユーザーに依頼
4. **skip使用**: 手動操作が必要なテストは `test.skip` でマーク

---

# 実装パターン

## Google連携

### OAuth認証フロー

OAuth認証が必要な場合は、`alert()` で理由を伝えてから設定ダイアログや認証画面を開く。

```javascript
// OAuth設定が未完了の場合
if (!googleAuth?.isConfigured()) {
  alert('OAuth設定が必要です。設定ダイアログを開きます。');
  googleAuth?.showConfigDialog();
  return;
}
// 認証が未完了の場合
if (!googleAuth?.isAuthenticated()) {
  alert('Google認証が必要です。認証画面を開きます。');
  googleAuth?.startAuth();
  return;
}
```

**理由**: いきなりダイアログを表示するとユーザーが混乱するため、先に理由を伝える。

### Google Docs 文書作成ルール

Google Docsで文書を作成するスクリプト（意見書、紹介状など）を実装する際の共通ルール。

#### 出力先フォルダ

`Henry一時ファイル` フォルダに保存する。フォルダが存在しない場合は自動作成。

```javascript
const TEMPLATE_CONFIG = {
  TEMPLATE_ID: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
};
```

#### メタデータ（properties）

ファイルコピー時に以下のカスタムプロパティを付与する。

```javascript
const properties = {
  henryPatientUuid: formData.patient_uuid || '',  // 患者UUID
  henryFileUuid: '',                               // 新規作成なので空
  henryFolderUuid: folder.id,                      // 保存先フォルダID
  henrySource: 'script-name'                       // スクリプト識別子
};
const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);
```

**henrySource の例:**
- `ikensho-form` - 主治医意見書
- `referral-form` - 診療情報提供書
- `police-certificate` - 警察診断書

### Google Docs連携メタデータ

患者文書を作成・編集するスクリプトでは、以下のメタデータをGoogle Driveのファイルプロパティに設定：

| プロパティ | 説明 |
|-----------|------|
| `henryPatientUuid` | 患者UUID（必須） |
| `henryFileUuid` | ファイルUUID（上書き保存用、新規は空） |
| `henryFolderUuid` | フォルダUUID（保存先、ルートなら空） |
| `henrySource` | 作成元識別子（例: `drive-direct`） |

### Henry Loader（動的スクリプトローダー）

GitHubから各スクリプトを動的に読み込む仕組み。

#### ファイル構成

| ファイル | 用途 | 対象ドメイン |
|---------|------|-------------|
| henry_loader.user.js | 本番用 | Henry, 予約, Google Docs |
| henry_loader_dev.user.js | 開発用 | Henry, 予約, Google Docs |
| manifest.json | スクリプト定義 | - |

#### 本番用と開発用の違い

| | henry_loader.user.js | henry_loader_dev.user.js |
|---|---|---|
| @require | GitHub main | GitHub develop |
| 動的読み込み | GitHub main | localhost:8080 |
| デバッグログ | OFF | ON |

#### 動作の仕組み

**共通の特徴:**
- 1ファイルで Henry/予約/Google Docs すべてに対応（`@match`で3ドメイン指定）
- `@require`で henry_core と henry_google_drive_bridge を事前読み込み（Google Docs用、CSP対策）
- **1つのTampermonkeyスクリプトなのでGM_*ストレージを全ドメインで共有**

**動作フロー（Henry/予約 - 開発用）:**
```
ページ読み込み → Loader起動 → localhost:8080からmanifest.json取得 → スクリプトをorder順に読み込み
```

**動作フロー（Google Docs）:**
```
ページ読み込み → Loader起動 → @requireで事前読み込み済みのhenry_core/henry_google_drive_bridgeが実行 → 即return
```

#### クロスタブOAuth通信（Google Docs連携）

Google DocsでOAuthトークンを取得するための仕組み。Henry側で認証済みのトークンをGoogle Docs側に共有する。

**背景:**
- Google DocsはCSPが厳しく、Tampermonkeyの`@require`でスクリプトを読み込む必要がある
- 1つのローダーで全ドメインをカバーすることで、GM_*ストレージを共有できる

**通信フロー:**
1. Google Docs側が`GM_setValue('drive_direct_oauth_request', { requestId })`でトークンをリクエスト
2. Henry側（henry_core.user.js）が`GM_addValueChangeListener`でリクエストを検知
3. Henry側が`GM_setValue('drive_direct_oauth_response', { requestId, tokens, credentials })`で応答
4. Google Docs側がレスポンスを受け取り、OAuthトークンを使用

#### Google Docs開発時の注意

- henry_core / henry_google_drive_bridge を修正した場合、Google Docs側に反映するには GitHub へ push が必要
- Henry側はローカルサーバーから即時反映される
- Google Docs側のコード変更はGitHubにプッシュ後、Tampermonkeyでスクリプトを再保存して@requireを再取得

#### スクリプト設定機能

- Toolboxの「スクリプト設定」からスクリプトのON/OFFを切り替え可能
- 設定は`GM_setValue('loader-disabled-scripts', [...])` に保存
- 変更は次回ページ読み込み時に反映
- `henry_core`と`henry_toolbox`は必須のため無効化不可

#### ベータ版スクリプト

- manifest.jsonで `beta: true` を設定（`enabled: false` ではない）
- 配布用ローダー（henry_loader.user.js）ではロードされない
- 開発用ローダー（henry_loader_dev.user.js）ではロードされる
- 設定パネルには表示されない

#### hidden フラグ

データモジュールなど、ユーザーがON/OFFする必要のないスクリプト向け。

- manifest.jsonで `hidden: true` を設定
- スクリプト自体は通常通りロードされる
- 設定パネル（スクリプトON/OFF）には表示されない

例: `henry_hospitals.user.js`（病院データモジュール、他のスクリプトから利用される）

---

## GraphQL

### GraphQL API 調査メモ

API調査で手間取ったり、ハマったポイントを記録する。全APIを網羅的に記録する必要はなく、「次回の自分が助かる情報」だけ残す。

#### 患者情報

| クエリ/Mutation | エンドポイント | 注意点 |
|----------------|---------------|--------|
| `getPatient` | `/graphql` | `input: {uuid: patientUuid}` - encounterUuidではない |

#### 入院診療録（ClinicalDocument）

| クエリ/Mutation | エンドポイント | 注意点 |
|----------------|---------------|--------|
| `CreateClinicalDocument` | `/graphql` | 新規作成時は `uuid: ""` を指定 |
| `UpdateClinicalDocument` | `/graphql` | `updateMask.paths` で更新フィールドを指定 |

**CreateClinicalDocument 入力形式:**
```javascript
{
  uuid: "",                    // 新規作成時は空文字
  patientUuid: "患者UUID",
  editorData: "Draft.js JSON文字列",
  type: {
    type: "HOSPITALIZATION_CONSULTATION",
    clinicalDocumentCustomTypeUuid: null
  },
  performTime: { seconds: Unix秒, nanos: 0 },
  hospitalizationUuid: { value: "入院UUID" }
}
```

**UpdateClinicalDocument 入力形式:**
```javascript
{
  clinicalDocument: {
    uuid: "ドキュメントUUID",
    patientUuid: "患者UUID",
    editorData: "Draft.js JSON文字列",
    type: { type: "HOSPITALIZATION_CONSULTATION", clinicalDocumentCustomTypeUuid: null },
    performTime: { seconds: Unix秒, nanos: 0 },
    hospitalizationUuid: { value: "入院UUID" }
  },
  updateMask: { paths: ["editor_data", "perform_time"] }
}
```

**editorData形式（Draft.js RawContentState）:**
```json
{
  "blocks": [
    {
      "key": "5文字英数字",
      "type": "unstyled",
      "text": "テキスト内容",
      "depth": 0,
      "inlineStyleRanges": [],
      "entityRanges": [],
      "data": {}
    }
  ],
  "entityMap": {}
}
```

#### 病名

| クエリ/Mutation | エンドポイント | 注意点 |
|----------------|---------------|--------|
| （調査時に追記） | | |

#### オーダー

| クエリ/Mutation | エンドポイント | 注意点 |
|----------------|---------------|--------|
| （調査時に追記） | | |

#### GetClinicalCalendarView (タイムライン用)

**エンドポイント**: `/graphql` (フルクエリ方式)

**調査日**: 2026-02-02

**フィールド名の変更履歴**（v2.93.0で対応）:

| 旧フィールド名 | 新フィールド名 |
|---------------|---------------|
| bodyTemperature | temperature |
| bloodPressureSystolic | bloodPressureUpperBound |
| bloodPressureDiastolic | bloodPressureLowerBound |
| spO2 | spo2 |
| respiratoryRate | respiration |
| medicine | mhlwMedicine |

**型情報（調査で判明）**:

| 型名 | 利用可能フィールド | 備考 |
|-----|-------------------|------|
| MedicationDosageInstruction_quantity | doseQuantity (Frac100000型) | 投与量を保持 |
| Frac100000 | value | 数値を100000倍した整数で保持 |
| OutsideInspectionReportRow | name のみ | 検査値フィールドなし（API制限） |
| NutritionOrder | uuid, createTime, orderStatus, startDate, endDate | 食事内容フィールドなし（API制限） |

**注意点**:
- `quantity.doseQuantity.value`でInternal Errorが発生する場合がある（サーバー側の問題）
- OutsideInspectionReportRowから検査値を取得する別APIの調査が必要
- NutritionOrderの食事内容は別APIで取得する必要あり

### GraphQL インライン方式

GraphQL mutationで変数型（`$input: SomeInput!`）がエラーになる場合は、インライン方式を使う。

#### 背景

HenryのGraphQLサーバーは一部のmutationで入力型（例: `UpdateMultiPatientReceiptDiseasesInput`）を公開していない。そのため、変数型を使ったクエリがエラーになる。

#### エラー例

```
Validation error (UnknownType) : Unknown type 'UpdateMultiPatientReceiptDiseasesInput'
```

#### 問題のあるパターン

```javascript
// NG: 変数型（サーバーが型を公開していない場合エラー）
const MUTATION = `
  mutation UpdateMultiPatientReceiptDiseases($input: UpdateMultiPatientReceiptDiseasesInput!) {
    updateMultiPatientReceiptDiseases(input: $input) {
      patientReceiptDiseases { uuid }
    }
  }
`;
await HenryCore.query(MUTATION, { input: data });
```

#### 解決策

```javascript
// OK: インライン方式（値を直接埋め込む）
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

#### 注意点

1. **文字列はダブルクォートで囲む**: `"${value}"`
2. **数値・boolean・enumはそのまま**: `${num}`, `${bool}`, `ENUM_VALUE`
3. **nullはそのまま**: `null`
4. **配列**: `[${items.map(i => `"${i}"`).join(', ')}]`
5. **サニタイズ**: ユーザー入力を直接埋め込む場合は注意

#### 適用実績

- `henry_disease_register.user.js` v1.2.1 - 病名登録mutation

### GraphQL フルクエリ API 注意点

Persisted Query（ハッシュ方式）ではなくフルクエリ方式を使う場合の注意点。

#### EncountersInPatient (graphql-v2)

外来診察記録を取得するAPI。

```javascript
const ENCOUNTERS_IN_PATIENT_QUERY = `
  query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
    encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
      encounters {
        id
        records(includeDraft: false) {  // ← 必須引数
          id
          __typename
          ... on ProgressNote {
            editorData
            updateTime
          }
        }
      }
      nextPageToken
    }
  }
`;

// HenryCore.query で呼び出す（endpoint指定必須）
const result = await HenryCore.query(ENCOUNTERS_IN_PATIENT_QUERY, {
  patientId: patientUuid,
  startDate: null,
  endDate: null,
  pageSize: 50,
  pageToken: pageToken
}, { endpoint: '/graphql-v2' });  // ← 先頭スラッシュ必須
```

**注意点:**
- 日付型は `IsoDate`（`String` ではない）
- `records(includeDraft: false)` が**必須引数**（引数なしだとエラー）
- `endpoint: '/graphql-v2'` の先頭スラッシュ必須（HenryCoreがBASE_URLと結合するため）

#### ListClinicalDocuments (graphql)

入院記録などの臨床文書を取得するAPI。

```javascript
const LIST_CLINICAL_DOCUMENTS_QUERY = `
  query ListClinicalDocuments($input: ListClinicalDocumentsRequestInput!) {
    listClinicalDocuments(input: $input) {
      documents {
        uuid
        editorData
        performTime { seconds }
        creator { name }
        type { __typename }
      }
      nextPageToken
    }
  }
`;

// HenryCore.query で呼び出す（endpoint省略可 = /graphql）
const result = await HenryCore.query(LIST_CLINICAL_DOCUMENTS_QUERY, {
  input: {
    patientUuid,
    pageToken: "",          // ← 空文字必須（nullは不可）
    pageSize: 100,
    clinicalDocumentTypes: [{ type: 'HOSPITALIZATION_CONSULTATION' }]
  }
});
```

**注意点:**
- 入力型は `ListClinicalDocumentsRequestInput!`
- フィールド名は `clinicalDocumentTypes`（`types` ではない）
- `pageToken` は**空文字 `""`**（`null` だとエラー、`String!` 型のため）

#### 適用実績

- `henry_hospitalization_search.user.js` v1.6.0 - カルテ記録検索

#### ListDailyWardHospitalizations (graphql)

入院患者一覧を取得するAPI。病棟画面で使用されている。

```javascript
const query = `
  query ListDailyWardHospitalizations {
    listDailyWardHospitalizations(input: {
      wardIds: [],
      searchDate: { year: ${year}, month: ${month}, day: ${day} },
      roomIds: [],
      searchText: ""
    }) {
      dailyWardHospitalizations {
        wardId
        roomHospitalizationDistributions {
          roomId
          hospitalizations {
            uuid
            state
            patient { uuid fullName }
            hospitalizationDoctor { doctor { uuid name } }
          }
        }
      }
    }
  }
`;

// HenryCore.query で呼び出す（endpoint指定必須）
const result = await HenryCore.query(query, {}, { endpoint: '/graphql' });
```

**注意点:**
- **`/graphql` エンドポイント専用**（`/graphql-v2` では未定義エラー）
- **インライン方式必須** - 変数形式（`$input: ListDailyWardHospitalizationsInput!`）は型がスキーマに存在しないためエラー
- 以下のフィールドは**スキーマ変更で使用不可**（2026-02時点）:
  - `routeType` - オブジェクト型に変更済み
  - `referralType` - オブジェクト型に変更済み
  - `roomNonHealthcareSystemChargePriceOverride` - オブジェクト型に変更済み
- Henry本体はAPQ（Persisted Query）を使用しているため、フルクエリとはスキーマが異なる場合がある

#### 適用実績

- `henry_patient_timeline.user.js` - 入院患者タイムライン

#### GetClinicalCalendarView (graphql)

患者のカレンダービュー（バイタル、処方、注射、栄養、検査等）を取得するAPI。

**注意点:**
- **`/graphql` エンドポイント専用**（`/graphql-v2` では未定義エラー）
- **インライン方式必須** - 変数形式は型がスキーマに存在しないためエラー
- 以下のフィールドは**スキーマ変更で使用不可**（2026-02時点）:

| 旧フィールド | 新フィールド | 備考 |
|-------------|-------------|------|
| `bodyTemperature` | `temperature` | VitalSign型 |
| `bloodPressureSystolic` | `bloodPressureUpperBound` | VitalSign型 |
| `bloodPressureDiastolic` | `bloodPressureLowerBound` | VitalSign型 |
| `spO2` | `spo2` | VitalSign型（小文字に変更） |
| `respiratoryRate` | `respiration` | VitalSign型 |
| `Date.hour/minute` | なし | Date型にはhour/minuteがない |
| `medicine` | `mhlwMedicine` | MedicationDosageInstruction型 |
| `doseQuantity` | `quantity` | フィールド構造も変更 |
| `administrationMethod` | なし | InjectionOrderRp型から削除 |
| `nutritionOrderContents` | なし | NutritionOrder型から削除 |
| `outsideInspectionReports` | `outsideInspectionReportRows` | 構造も変更 |

#### 適用実績

- `henry_patient_timeline.user.js` - 入院患者タイムライン（fetchCalendarData関数）

---

## SPA/React

### SPA遷移対応パターン

Henry本体（henry-app.jp）で動作するスクリプトは、`subscribeNavigation` パターンを使用する。

#### 基本パターン

```javascript
const cleaner = HenryCore.utils.createCleaner();

function init() {
  // リソース作成
  const observer = new MutationObserver(callback);
  observer.observe(target, options);

  // クリーンアップ登録
  cleaner.add(() => observer.disconnect());
}

HenryCore.utils.subscribeNavigation(cleaner, init);
```

#### 動作フロー

1. `subscribeNavigation` が `henry:navigation` イベントをリッスン
2. SPA遷移発生時、`cleaner` に登録された関数を全て実行（リソース破棄）
3. `init()` を再実行（新しいページ用に再初期化）

#### 例外（subscribeNavigation不要なケース）

- ログインページ専用スクリプト（henry_login_helper.user.js）
- 非SPAサイト用スクリプト（reserve_*.user.js）
- 全ページで継続動作するスクリプト（henry_reserve_integration.user.js のfetchインターセプト）

### Apollo Client による画面更新

HenryはReact + Apollo Clientを使用。データ変更後に画面を更新するには `refetchQueries` を使用する。

#### 仕組み

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

#### 使い方

```javascript
// グローバルに公開されている Apollo Client インスタンス
if (unsafeWindow.__APOLLO_CLIENT__) {
  unsafeWindow.__APOLLO_CLIENT__.refetchQueries({ include: ['ListSessions'] });
}
```

#### 主要なクエリ名

| クエリ名 | 用途 |
|---------|------|
| `EncounterEditorQuery` | 外来診療画面（カルテ編集画面）のデータ全体 |
| `ListSessions` | 受付一覧（外来予約リスト） |
| `ListPatientFiles` | 患者ファイル一覧 |

**注意**: クエリ名はHenryが実際に使っているものを chrome-devtools-mcp で調査して確認すること。

#### 使用例: 照射オーダー作成後の画面更新

```javascript
// henry_imaging_order.user.js での使用例
function refreshUI() {
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  if (pageWindow.__APOLLO_CLIENT__) {
    try {
      pageWindow.__APOLLO_CLIENT__.refetchQueries({ include: ['EncounterEditorQuery'] });
      console.log('[ImagingOrder] EncounterEditorQuery を refetch しました');
    } catch (e) {
      console.error('[ImagingOrder] refetchQueries 失敗', e);
    }
  }
}
```

---

## その他

### fetchインターセプトとFirestore競合問題

#### 背景

`henry_google_drive_bridge.user.js` でfetchをインターセプトしていたところ、HenryのFirestoreでWebChannel接続エラーが頻発した。

```
@firebase/firestore: WebChannelConnection RPC 'Listen' stream transport errored
Could not reach Cloud Firestore backend. Connection failed 1 times.
```

#### 原因

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

#### 解決策: Proxy方式

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

#### なぜProxyで解決するか

| 項目 | 通常方式 | Proxy方式 |
|------|---------|-----------|
| `fetch.toString()` | `"function(url, options) {...}"` | `"function fetch() { [native code] }"` |
| `fetch.name` | `""` または `"anonymous"` | `"fetch"` |
| 元オブジェクトの参照 | 失われる | 保持される |
| 厳格なライブラリとの互換性 | 低い | 高い |

#### 適用判断

- **通常は従来方式でOK** - 単純なfetchインターセプトなら問題ない
- **問題が起きたらProxy方式に変更** - Firestore等との競合が発生した場合

#### 関連

- 修正コミット: `16b1813 fix: Firestore WebChannelエラーを修正`
- 対象ファイル: `henry_google_drive_bridge.user.js` v2.3.2

### HenryCore API よくある間違い

#### registerPlugin の正しい使い方

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
    group: 'カテゴリ名',   // 省略可（グループ化）
    groupIcon: '📁',      // 省略可（グループのアイコン）
    onClick: () => {
        // クリック時の処理
    }
});
```

**仕様（henry_core.user.js より）:**
```
registerPlugin({ id, name, icon?, description?, version?, order?, onClick, group?, groupIcon? })
```

**ポイント:**
- **1プラグイン = 1アクション**の形式
- 複数アクションが必要な場合は、`onClick`内でメニューを表示するか、別プラグインとして登録
- `await`を付けて呼び出すこと（非同期関数）
- `group`を指定すると、ツールボックス内でグループ化される

**グループ指定:**
- `group: '開発'` - 開発・デバッグ用ツール
- `group: '文書作成'` - Google Docs連携の文書作成ツール
- 省略時はグループなし（トップレベルに表示）
- `category` ではなく `group` を使うこと（`category`は無効）

---

# MutationObserver関連

## 最適化アプローチ

| 方式 | メリット | デメリット |
|------|---------|-----------|
| `subtree: false` | 発火回数激減 | 深い階層の変化を検出できない |
| debounce追加 | 連続発火を集約 | 遅延が発生 |
| 2段階監視パターン | 対象出現後に狭い範囲を監視 | 実装がやや複雑 |
| 処理済みフラグ | 重複処理を防止 | フラグ管理が必要 |

## 調査結論（2026-01-20）

大半のスクリプトは問題なし。以下は軽微な改善余地あり（実害なし）:
- henry_set_search_helper.user.js - debounceあるがbody全体監視
- henry_google_drive_bridge.user.js - body全体監視
- henry_toolbox.user.js - body全体監視（早期リターンで緩和）

改善が必要な場合は **2段階監視パターン** を適用（CLAUDE.md参照）。

---

# 運用手順

## 病院・医師データの更新手順

`henry_hospitals.user.js` に保存されている病院・診療科・医師データの更新方法。

### データ構造

```javascript
const HOSPITALS = {
  '病院名': {
    departments: {
      '診療科名': ['医師名1', '医師名2', ...],
      '別の診療科': ['医師名3'],
    }
  },
  // ... 他の病院
};
```

### 対象病院と公式サイト

| 病院名 | 情報源 | 取得方法 | 名前の順序 |
|--------|--------|---------|-----------|
| 高松赤十字病院 | https://www.takamatsu.jrc.or.jp/about/departments/ | 各診療科ページをWebFetch | 部長→副部長→医師の順 |
| 香川県立中央病院 | https://kagawahp.jp/department/ | 各診療科ページをWebFetch | 部長→医長→医師の順 |
| 香川県済生会病院 | https://www.kagawa.saiseikai.or.jp/department/ | 各診療科ページをWebFetch | 部長→医師の順 |
| KKR高松病院 | https://www.takamatsu.kkr-hp.jp/departments/ | 各診療科ページをWebFetch | 部長→医長→医師の順 |
| 屋島総合病院 | https://www.yashima.or.jp/hp/department/ | 各診療科ページをWebFetch | サイト記載順 |
| りつりん病院 | https://www.ritsurin.or.jp/department/ | 各診療科ページをWebFetch | サイト記載順 |
| 高松市立みんなの病院 | https://minnano-hospital.jp/department/ | 各診療科ページをWebFetch | 部長→医師の順 |
| 高松平和病院 | https://www.heiwa-hospital.jp/ | トップページまたは診療案内をWebFetch | サイト記載順 |
| 香川大学医学部附属病院 | PDF（外来担当医表など） | PDFをダウンロードして手動確認 | 教授→准教授→講師→助教の順 |

### 更新手順

#### 方法1: Claude Codeに依頼（推奨）

```
「〇〇病院の医師データを更新して」
```

Claude Codeが自動で:
1. 病院の公式サイトから医師情報を取得（WebFetch）
2. `henry_hospitals.user.js` を更新
3. バージョンを上げる

#### 方法2: 手動更新

1. 各病院の公式サイトで「診療科紹介」「医師紹介」ページを確認
2. `henry_hospitals.user.js` を編集:
   ```javascript
   '病院名': {
     departments: {
       '診療科名': ['医師1', '医師2'],
     }
   }
   ```
3. `@version` を更新
4. GitHubにプッシュ（本番反映の場合はmainブランチへ）

### 注意事項

- **医師名は姓名を連結**（スペースなし）: `'山田太郎'`
- **診療科名は公式サイトの表記に合わせる**: `'脳神経外科・血管内治療科'`
- **医師がいない診療科は空配列**: `'精神科': []`
- **複数診療科を兼務する医師は両方に記載**
- データ更新日を `@description` かファイル内コメントに記録

### 最終更新

2026年1月26日（各病院公式サイトより取得）

