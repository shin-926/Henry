# 開発メモ・調査ノート

> このファイルは調査結果や実装メモを記録する場所です。
> ルール・ガイドラインは `CLAUDE.md` を参照。

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
