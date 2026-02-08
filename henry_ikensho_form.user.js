// ==UserScript==
// @name         主治医意見書作成フォーム
// @namespace    https://henry-app.jp/
// @version      2.7.3
// @description  主治医意見書の入力フォームとGoogle Docs出力（GAS不要版・API直接呼び出し）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_info
// @grant        unsafeWindow
// @connect      googleapis.com
// @connect      www.googleapis.com
// @connect      docs.googleapis.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_ikensho_form.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_ikensho_form.user.js
// ==/UserScript==

/*
 * 【主治医意見書作成フォーム】
 *
 * ■ 使用場面
 * - 介護保険の主治医意見書を作成する場合
 * - Henryから患者情報を取得してフォームに自動入力したい場合
 *
 * ■ 主な機能
 * 1. 入力フォーム
 *    - 患者情報（氏名、生年月日、住所等）の自動取得
 *    - 各項目の入力・選択UI
 *    - 下書きの自動保存・復元
 *
 * 2. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *    - PDFとしてダウンロード可能
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - Google Docs API: 文書の作成・編集
 *
 * ■ 初回設定
 * - Google OAuthの設定が必要
 * - HenryCoreの設定ダイアログからClient ID/Secretを設定
 *
 * ■ SPA遷移対応
 * - subscribeNavigation: 不要
 * - 理由: プラグイン登録のみで、ページ固有の状態を持たない
 *   - フォームUIはToolboxから呼び出し時に動的に生成
 *   - 閉じればDOM要素ごと削除されるためリソースリーク無し
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'OpinionForm';
  const VERSION = GM_info.script.version;

  // ページのwindowを取得（サンドボックス対応）
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  // Google API設定
  const API_CONFIG = {
    DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
    DOCS_API_BASE: 'https://docs.googleapis.com/v1'
  };

  // テンプレート設定
  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1z1kJZ9wVUDotM1kPmvA5-S2mlq4CmfShnB9CzbfWtwU',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 医療機関情報（HenryCore.config.hospitalから取得）
  const INSTITUTION_INFO = (() => {
    const h = pageWindow.HenryCore?.config?.hospital || {};
    return {
      name: h.name || '',
      postal_code: h.postalCode || '',
      address: h.address || '',
      phone: h.phone || '',
      fax: h.fax || ''
    };
  })();

  // GraphQL クエリ定義（フルクエリ方式）
  const QUERIES = {
    GetPatient: `
      query GetPatient($input: GetPatientRequestInput!) {
        getPatient(input: $input) {
          serialNumber
          fullName
          fullNamePhonetic
          detail {
            birthDate { year month day }
            sexType
            postalCode
            addressLine_1
            phoneNumber
          }
        }
      }
    `,
    ListUsers: `
      query ListUsers($input: ListUsersRequestInput!) {
        listUsers(input: $input) {
          users {
            uuid
            name
          }
        }
      }
    `
  };

  // localStorage → Spreadsheet マイグレーション用（マイグレーション完了後に削除可能）
  const STORAGE_KEY_PREFIX = 'henry_opinion_draft_';
  const DRAFT_SCHEMA_VERSION = 1;  // 下書きの構造バージョン（構造変更時にインクリメント）

  let log = null;

  // =============================================================================
  // GoogleAuth取得ヘルパー（HenryCore.modules.GoogleAuth経由）
  // =============================================================================

  function getGoogleAuth() {
    return pageWindow.HenryCore?.modules?.GoogleAuth;
  }

  // =============================================================================
  // Google Drive API モジュール
  // =============================================================================

  const DriveAPI = {
    // APIリクエスト共通処理
    async request(method, url, options = {}) {
      const accessToken = await getGoogleAuth().getValidAccessToken();

      return new Promise((resolve, reject) => {
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers
        };

        GM_xmlhttpRequest({
          method,
          url,
          headers,
          data: options.body,
          responseType: options.responseType || 'text',
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              if (options.responseType === 'arraybuffer') {
                resolve(response.response);
              } else {
                try {
                  resolve(JSON.parse(response.responseText));
                } catch {
                  resolve(response.responseText);
                }
              }
            } else if (response.status === 401) {
              getGoogleAuth().refreshAccessToken()
                .then(() => this.request(method, url, options))
                .then(resolve)
                .catch(reject);
            } else {
              console.error(`[${SCRIPT_NAME}] DriveAPI Error ${response.status}:`, response.responseText);
              reject(new Error(`API Error: ${response.status}`));
            }
          },
          onerror: (err) => {
            console.error(`[${SCRIPT_NAME}] DriveAPI Network error:`, err);
            reject(new Error('API通信エラー'));
          }
        });
      });
    },

    // ファイルをコピー（親フォルダ・メタデータ指定可能）
    async copyFile(fileId, newName, parentFolderId = null, properties = null) {
      const url = `${API_CONFIG.DRIVE_API_BASE}/files/${fileId}/copy`;
      const body = { name: newName };
      if (parentFolderId) {
        body.parents = [parentFolderId];
      }
      if (properties) {
        body.properties = properties;
      }
      return await this.request('POST', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    },

    // ファイルメタデータ取得
    async getFileMetadata(fileId, fields = 'id,name,webViewLink') {
      const url = `${API_CONFIG.DRIVE_API_BASE}/files/${fileId}?fields=${fields}`;
      return await this.request('GET', url);
    },

    // マイドライブでフォルダを検索
    async findFolder(folderName) {
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;
      const url = `${API_CONFIG.DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
      console.log('[OpinionForm] findFolder query:', query);
      console.log('[OpinionForm] findFolder url:', url);
      const result = await this.request('GET', url);
      console.log('[OpinionForm] findFolder result:', result);
      return result.files?.[0] || null;
    },

    // マイドライブにフォルダを作成
    async createFolder(folderName) {
      console.log('[OpinionForm] createFolder:', folderName);
      const url = `${API_CONFIG.DRIVE_API_BASE}/files`;
      const result = await this.request('POST', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root']
        })
      });
      console.log('[OpinionForm] createFolder result:', result);
      return result;
    },

    // フォルダを検索し、なければ作成
    async getOrCreateFolder(folderName) {
      try {
        let folder = await this.findFolder(folderName);
        if (!folder) {
          log?.info(`フォルダ「${folderName}」を作成中...`);
          folder = await this.createFolder(folderName);
          log?.info(`フォルダ「${folderName}」を作成しました`);
        }
        return folder;
      } catch (e) {
        console.error('[OpinionForm] getOrCreateFolder error:', e);
        throw new Error(`フォルダの取得/作成に失敗しました: ${e.message}`);
      }
    }
  };

  // =============================================================================
  // 下書き管理（Google Spreadsheet）
  // =============================================================================

  const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4';
  const DRAFT_SPREADSHEET_NAME = 'Henry_下書きデータ';
  const DRAFT_TYPE_IKENSHO = 'ikensho';

  const DraftStorage = {
    _spreadsheetId: null,
    _cache: null, // { [patientUuid]: { rowIndex, jsonData, savedAt, patientName } }

    // スプレッドシートを検索（Drive API）
    async _findSpreadsheet() {
      if (this._spreadsheetId) return this._spreadsheetId;

      const query = `name='${DRAFT_SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and 'root' in parents and trashed=false`;
      const url = `${API_CONFIG.DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
      const result = await DriveAPI.request('GET', url);
      if (result.files?.length > 0) {
        this._spreadsheetId = result.files[0].id;
        return this._spreadsheetId;
      }
      return null;
    },

    // スプレッドシートを新規作成（ヘッダー行付き）
    async _createSpreadsheet() {
      const url = `${SHEETS_API_BASE}/spreadsheets`;
      const result = await DriveAPI.request('POST', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: DRAFT_SPREADSHEET_NAME },
          sheets: [{
            properties: { title: '下書き' },
            data: [{
              startRow: 0,
              startColumn: 0,
              rowData: [{
                values: [
                  { userEnteredValue: { stringValue: '患者UUID' } },
                  { userEnteredValue: { stringValue: '下書き種別' } },
                  { userEnteredValue: { stringValue: 'JSONデータ' } },
                  { userEnteredValue: { stringValue: '保存日時' } },
                  { userEnteredValue: { stringValue: '患者名' } }
                ]
              }]
            }]
          }]
        })
      });
      this._spreadsheetId = result.spreadsheetId;
      log?.info('下書きスプレッドシートを作成:', this._spreadsheetId);
      return this._spreadsheetId;
    },

    // 取得 or 作成
    async _getOrCreateSpreadsheet() {
      let id = await this._findSpreadsheet();
      if (!id) {
        id = await this._createSpreadsheet();
      }
      return id;
    },

    // 全データを読み込んでキャッシュ（種別フィルタ付き）
    async _loadAll() {
      if (this._cache) return this._cache;

      const spreadsheetId = await this._findSpreadsheet();
      if (!spreadsheetId) {
        this._cache = {};
        return this._cache;
      }

      const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('下書き')}!A:E`;
      const result = await DriveAPI.request('GET', url);
      const rows = result.values || [];
      this._cache = {};

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] && row[1] === DRAFT_TYPE_IKENSHO) {
          this._cache[row[0]] = {
            rowIndex: i + 1,
            jsonData: row[2] || '',
            savedAt: row[3] || '',
            patientName: row[4] || ''
          };
        }
      }

      return this._cache;
    },

    // 下書き保存（既存行更新 or 新規行追加）
    async save(patientUuid, formData) {
      const spreadsheetId = await this._getOrCreateSpreadsheet();
      const now = new Date().toISOString();
      const jsonStr = JSON.stringify({ schemaVersion: DRAFT_SCHEMA_VERSION, data: formData });
      const patientName = formData.basic_info?.patient_name || '';

      await this._loadAll();

      const existing = this._cache[patientUuid];
      const rowValues = [[patientUuid, DRAFT_TYPE_IKENSHO, jsonStr, now, patientName]];

      let newRowIndex;
      if (existing) {
        const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('下書き')}!A${existing.rowIndex}:E${existing.rowIndex}?valueInputOption=RAW`;
        await DriveAPI.request('PUT', url, {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: rowValues })
        });
        newRowIndex = existing.rowIndex;
      } else {
        const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('下書き')}!A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
        const appendResult = await DriveAPI.request('POST', url, {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: rowValues })
        });
        const range = appendResult?.updates?.updatedRange || '';
        const match = range.match(/!A(\d+):/);
        newRowIndex = match ? parseInt(match[1], 10) : Object.keys(this._cache).length + 2;
      }

      this._cache[patientUuid] = { rowIndex: newRowIndex, jsonData: jsonStr, savedAt: now, patientName };
      log?.info('下書き保存完了（Spreadsheet）:', patientUuid);
      return true;
    },

    // 下書き読み込み（Spreadsheet → localStorage マイグレーション付き）
    async load(patientUuid) {
      try {
        await this._loadAll();

        // Spreadsheet にあればそれを返す
        const cached = this._cache[patientUuid];
        if (cached) {
          try {
            const parsed = JSON.parse(cached.jsonData);
            if (!parsed.schemaVersion || parsed.schemaVersion !== DRAFT_SCHEMA_VERSION) {
              log?.info('互換性のない下書きをスキップ（バージョン不一致）');
              return null;
            }
            if (!parsed.data?.basic_info) {
              log?.info('不正な構造の下書きをスキップ');
              return null;
            }
            return { data: parsed.data, savedAt: cached.savedAt };
          } catch (e) {
            log?.error('下書きJSONパースエラー:', e.message);
            return null;
          }
        }

        // localStorage からのマイグレーション
        const lsKey = `${STORAGE_KEY_PREFIX}${patientUuid}`;
        const stored = localStorage.getItem(lsKey);
        if (stored) {
          try {
            const draft = JSON.parse(stored);
            if (draft.schemaVersion === DRAFT_SCHEMA_VERSION && draft.data?.basic_info) {
              log?.info('localStorage → Spreadsheet マイグレーション:', patientUuid);
              await this.save(patientUuid, draft.data);
              localStorage.removeItem(lsKey);
              return { data: draft.data, savedAt: draft.savedAt };
            }
          } catch (e) {
            log?.error('localStorage マイグレーションエラー:', e.message);
          }
          // 不正データはlocalStorageから削除
          localStorage.removeItem(lsKey);
        }

        return null;
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 下書き読み込みエラー:`, e);
        return null;
      }
    },

    // 下書き削除
    async delete(patientUuid) {
      try {
        const spreadsheetId = await this._findSpreadsheet();
        if (!spreadsheetId) return;

        await this._loadAll();
        const existing = this._cache[patientUuid];
        if (!existing) return;

        // 行をクリア（削除ではなく空にする）
        const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('下書き')}!A${existing.rowIndex}:E${existing.rowIndex}:clear`;
        await DriveAPI.request('POST', url, {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        delete this._cache[patientUuid];
        log?.info('下書き削除完了:', patientUuid);
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 下書き削除エラー:`, e);
      }
    }
  };

  // =============================================================================
  // Google Docs API モジュール
  // =============================================================================

  const DocsAPI = {
    // ドキュメントを取得
    async getDocument(documentId) {
      const accessToken = await getGoogleAuth().getValidAccessToken();
      const url = `${API_CONFIG.DOCS_API_BASE}/documents/${documentId}`;

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          onload: (response) => {
            if (response.status === 200) {
              resolve(JSON.parse(response.responseText));
            } else {
              reject(new Error(`Docs API Error: ${response.status}`));
            }
          },
          onerror: () => reject(new Error('Docs API通信エラー'))
        });
      });
    },

    // ドキュメントを更新（batchUpdate）
    async batchUpdate(documentId, requests) {
      const accessToken = await getGoogleAuth().getValidAccessToken();
      const url = `${API_CONFIG.DOCS_API_BASE}/documents/${documentId}:batchUpdate`;

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: JSON.stringify({ requests }),
          onload: (response) => {
            if (response.status === 200) {
              resolve(JSON.parse(response.responseText));
            } else {
              console.error(`[${SCRIPT_NAME}] DocsAPI batchUpdate Error:`, response.responseText);
              reject(new Error(`Docs API Error: ${response.status}`));
            }
          },
          onerror: () => reject(new Error('Docs API通信エラー'))
        });
      });
    },

    // テキスト置換リクエストを生成
    createReplaceTextRequest(searchText, replaceText) {
      return {
        replaceAllText: {
          containsText: {
            text: searchText,
            matchCase: true
          },
          replaceText: replaceText || ''
        }
      };
    }
  };

  // =============================================================================
  // ユーティリティ関数
  // =============================================================================

  /**
   * HenryCoreの待機
   */
  async function waitForHenryCore(timeout = 5000) {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return false;
      }
    }
    return true;
  }

  /**
   *カタカナ→ひらがな変換
   */
  function katakanaToHiragana(str) {
    if (!str) return '';
    return str.replace(/[ァ-ヶ]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
  }

  /**
   * 和暦変換
   */
  function toWareki(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let eraName, eraYear;

    if (year >= 2019 && (year > 2019 || month >= 5)) {
      // 令和: 2019年5月1日〜
      eraName = '令和';
      eraYear = year - 2018;
    } else if (year >= 1989) {
      // 平成: 1989年1月8日〜2019年4月30日
      eraName = '平成';
      eraYear = year - 1988;
    } else if (year >= 1926) {
      // 昭和: 1926年12月25日〜1989年1月7日
      eraName = '昭和';
      eraYear = year - 1925;
    } else if (year >= 1912) {
      // 大正: 1912年7月30日〜1926年12月24日
      eraName = '大正';
      eraYear = year - 1911;
    } else {
      // 明治: 1868年1月25日〜1912年7月29日
      eraName = '明治';
      eraYear = year - 1867;
    }

    return `${eraName}${eraYear}年${month}月${day}日`;
  }

  /**
   * 年齢計算
   */
  function calculateAge(birthDateStr, refDateStr) {
    const birthDate = new Date(birthDateStr);
    const refDate = refDateStr ? new Date(refDateStr) : new Date();

    let age = refDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = refDate.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
      age--;
    }

    return age.toString();
  }

  /**
   * 今日の日付（YYYYMMDD）
   */
  function getTodayString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  /**
   * YYYYMMDD → YYYY-MM-DD
   */
  function formatDate(yyyymmdd) {
    if (!yyyymmdd || yyyymmdd.length !== 8) return '';
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }

  // =============================================================================
  // Google Docs生成（API直接呼び出し）
  // =============================================================================

  // プレースホルダーマッピング（GASから移植）
  const PLACEHOLDER_MAPPINGS = [
    // 基本情報
    { placeholder: '{{記入日}}', jsonKey: 'basic_info.date_of_writing', inputType: '自動入力' },
    { placeholder: '{{患者名かな}}', jsonKey: 'basic_info.patient_name_kana', inputType: '自動入力' },
    { placeholder: '{{患者名}}', jsonKey: 'basic_info.patient_name', inputType: '自動入力' },
    { placeholder: '{{生年月日}}', jsonKey: 'basic_info.birth_date', inputType: '自動入力' },
    { placeholder: '{{年齢}}', jsonKey: 'basic_info.age', inputType: '自動入力' },
    { placeholder: '{{性別}}', jsonKey: 'basic_info.sex', inputType: '自動入力' },
    { placeholder: '{{郵便番号}}', jsonKey: 'basic_info.postal_code', inputType: '自動入力' },
    { placeholder: '{{住所}}', jsonKey: 'basic_info.address', inputType: '自動入力' },
    { placeholder: '{{連絡先電話番号}}', jsonKey: 'basic_info.phone', inputType: '自動入力' },
    { placeholder: '{{医療機関名}}', jsonKey: 'basic_info.institution_name', inputType: '自動入力' },
    { placeholder: '{{医療機関郵便番号}}', jsonKey: 'basic_info.institution_postal_code', inputType: '自動入力' },
    { placeholder: '{{医療機関所在地}}', jsonKey: 'basic_info.institution_address', inputType: '自動入力' },
    { placeholder: '{{医療機関電話番号}}', jsonKey: 'basic_info.institution_phone', inputType: '自動入力' },
    { placeholder: '{{医療機関FAX番号}}', jsonKey: 'basic_info.institution_fax', inputType: '自動入力' },
    { placeholder: '{{同意の有無}}', jsonKey: 'basic_info.consent', inputType: 'ラジオボタン' },
    { placeholder: '{{最終診察日}}', jsonKey: 'basic_info.last_examination_date', inputType: 'カレンダー' },
    { placeholder: '{{意見書作成回数}}', jsonKey: 'basic_info.opinion_count', inputType: 'ラジオボタン' },
    { placeholder: '{{他科受診有無}}', jsonKey: 'basic_info.other_department_visit', inputType: 'ラジオボタン' },
    // 診断
    { placeholder: '{{他科名1}}', jsonKey: 'diagnosis.other_departments', inputType: 'custom' },
    { placeholder: '{{他科名2}}', jsonKey: 'diagnosis.other_departments', inputType: 'custom' },
    { placeholder: '{{その他の他科名}}', jsonKey: 'diagnosis.other_department_names', inputType: '記述' },
    { placeholder: '{{診断名1}}', jsonKey: 'diagnosis.diagnosis_1_name', inputType: '記述' },
    { placeholder: '{{発症年月日1}}', jsonKey: 'diagnosis.diagnosis_1_onset', inputType: '記述' },
    { placeholder: '{{診断名2}}', jsonKey: 'diagnosis.diagnosis_2_name', inputType: '記述' },
    { placeholder: '{{発症年月日2}}', jsonKey: 'diagnosis.diagnosis_2_onset', inputType: '記述' },
    { placeholder: '{{診断名3}}', jsonKey: 'diagnosis.diagnosis_3_name', inputType: '記述' },
    { placeholder: '{{発症年月日3}}', jsonKey: 'diagnosis.diagnosis_3_onset', inputType: '記述' },
    { placeholder: '{{症状安定性}}', jsonKey: 'diagnosis.symptom_stability', inputType: 'ラジオボタン' },
    { placeholder: '{{症状不安定時の具体的状況}}', jsonKey: 'diagnosis.symptom_unstable_details', inputType: '記述' },
    { placeholder: '{{経過及び治療内容}}', jsonKey: 'diagnosis.course_and_treatment', inputType: '記述' },
    // 特別な医療
    { placeholder: '{{処置内容}}', jsonKey: 'special_medical_care.treatments', inputType: 'チェックボックス' },
    { placeholder: '{{特別な対応}}', jsonKey: 'special_medical_care.special_responses', inputType: 'チェックボックス' },
    { placeholder: '{{失禁への対応}}', jsonKey: 'special_medical_care.incontinence_care', inputType: 'チェックボックス' },
    // 心身の状態
    { placeholder: '{{寝たきり度}}', jsonKey: 'mental_physical_state.bedridden_level', inputType: 'ラジオボタン' },
    { placeholder: '{{認知症高齢者の日常生活自立度}}', jsonKey: 'mental_physical_state.dementia_level', inputType: 'ラジオボタン' },
    { placeholder: '{{短期記憶}}', jsonKey: 'mental_physical_state.short_term_memory', inputType: 'ラジオボタン' },
    { placeholder: '{{認知能力}}', jsonKey: 'mental_physical_state.cognitive_ability', inputType: 'ラジオボタン' },
    { placeholder: '{{伝達能力}}', jsonKey: 'mental_physical_state.communication_ability', inputType: 'ラジオボタン' },
    { placeholder: '{{周辺症状有無}}', jsonKey: 'mental_physical_state.peripheral_symptoms', inputType: 'ラジオボタン' },
    { placeholder: '{{周辺症状詳細1}}', jsonKey: 'mental_physical_state.peripheral_symptoms_details', inputType: 'custom' },
    { placeholder: '{{周辺症状詳細2}}', jsonKey: 'mental_physical_state.peripheral_symptoms_details', inputType: 'custom' },
    { placeholder: '{{その他の周辺症状}}', jsonKey: 'mental_physical_state.other_peripheral_symptoms', inputType: '記述' },
    { placeholder: '{{精神神経症状有無}}', jsonKey: 'mental_physical_state.psychiatric_symptoms', inputType: 'ラジオボタン' },
    { placeholder: '{{精神神経症状名}}', jsonKey: 'mental_physical_state.psychiatric_symptom_name', inputType: '記述' },
    { placeholder: '{{専門医受診有無}}', jsonKey: 'mental_physical_state.specialist_visit', inputType: 'ラジオボタン' },
    { placeholder: '{{専門医受診科名}}', jsonKey: 'mental_physical_state.specialist_department', inputType: '記述' },
    { placeholder: '{{利き腕}}', jsonKey: 'mental_physical_state.dominant_hand', inputType: 'ラジオボタン' },
    { placeholder: '{{身長}}', jsonKey: 'mental_physical_state.height', inputType: '記述' },
    { placeholder: '{{体重}}', jsonKey: 'mental_physical_state.weight', inputType: '記述' },
    { placeholder: '{{体重の変化}}', jsonKey: 'mental_physical_state.weight_change', inputType: 'ラジオボタン' },
    { placeholder: '{{四肢欠損}}', jsonKey: 'mental_physical_state.limb_loss', inputType: 'チェックボックス' },
    { placeholder: '{{四肢欠損部位}}', jsonKey: 'mental_physical_state.limb_loss_location', inputType: '記述' },
    { placeholder: '{{麻痺}}', jsonKey: 'mental_physical_state.paralysis', inputType: 'チェックボックス' },
    { placeholder: '{{麻痺右上肢}}', jsonKey: 'mental_physical_state.paralysis_right_upper_limb', inputType: 'チェックボックス' },
    { placeholder: '{{麻痺右上肢程度}}', jsonKey: 'mental_physical_state.paralysis_right_upper_limb_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{麻痺左上肢}}', jsonKey: 'mental_physical_state.paralysis_left_upper_limb', inputType: 'チェックボックス' },
    { placeholder: '{{麻痺左上肢程度}}', jsonKey: 'mental_physical_state.paralysis_left_lower_limb_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{麻痺右下肢}}', jsonKey: 'mental_physical_state.paralysis_right_lower_limb', inputType: 'チェックボックス' },
    { placeholder: '{{麻痺右下肢程度}}', jsonKey: 'mental_physical_state.paralysis_right_lower_limb_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{麻痺左下肢}}', jsonKey: 'mental_physical_state.paralysis_left_lower_limb', inputType: 'チェックボックス' },
    { placeholder: '{{麻痺左下肢程度}}', jsonKey: 'mental_physical_state.paralysis_left_lower_limb_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{麻痺その他}}', jsonKey: 'mental_physical_state.paralysis_other', inputType: 'チェックボックス' },
    { placeholder: '{{麻痺その他部位}}', jsonKey: 'mental_physical_state.paralysis_other_location', inputType: '記述' },
    { placeholder: '{{麻痺その他程度}}', jsonKey: 'mental_physical_state.paralysis_other_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{筋力低下}}', jsonKey: 'mental_physical_state.muscle_weakness', inputType: 'チェックボックス' },
    { placeholder: '{{筋力低下部位}}', jsonKey: 'mental_physical_state.muscle_weakness_location', inputType: '記述' },
    { placeholder: '{{筋力低下程度}}', jsonKey: 'mental_physical_state.muscle_weakness_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{関節拘縮}}', jsonKey: 'mental_physical_state.joint_contracture', inputType: 'チェックボックス' },
    { placeholder: '{{関節拘縮部位}}', jsonKey: 'mental_physical_state.joint_contracture_location', inputType: '記述' },
    { placeholder: '{{関節拘縮程度}}', jsonKey: 'mental_physical_state.joint_contracture_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{関節痛み}}', jsonKey: 'mental_physical_state.joint_pain', inputType: 'チェックボックス' },
    { placeholder: '{{関節痛み部位}}', jsonKey: 'mental_physical_state.joint_pain_location', inputType: '記述' },
    { placeholder: '{{関節痛み程度}}', jsonKey: 'mental_physical_state.joint_pain_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{失調不随意運動}}', jsonKey: 'mental_physical_state.ataxia_involuntary_movement', inputType: 'チェックボックス' },
    { placeholder: '{{失調不随意運動上肢}}', jsonKey: 'mental_physical_state.ataxia_upper_limbs', inputType: 'チェックボックス' },
    { placeholder: '{{失調不随意運動下肢}}', jsonKey: 'mental_physical_state.ataxia_lower_limbs', inputType: 'チェックボックス' },
    { placeholder: '{{体幹}}', jsonKey: 'mental_physical_state.trunk', inputType: 'チェックボックス' },
    { placeholder: '{{褥瘡}}', jsonKey: 'mental_physical_state.pressure_ulcer', inputType: 'チェックボックス' },
    { placeholder: '{{褥瘡部位}}', jsonKey: 'mental_physical_state.pressure_ulcer_location', inputType: '記述' },
    { placeholder: '{{褥瘡程度}}', jsonKey: 'mental_physical_state.pressure_ulcer_severity', inputType: 'ラジオボタン' },
    { placeholder: '{{その他皮膚疾患}}', jsonKey: 'mental_physical_state.other_skin_disease', inputType: 'チェックボックス' },
    { placeholder: '{{その他皮膚疾患部位}}', jsonKey: 'mental_physical_state.other_skin_disease_location', inputType: '記述' },
    { placeholder: '{{その他皮膚疾患程度}}', jsonKey: 'mental_physical_state.other_skin_disease_severity', inputType: 'ラジオボタン' },
    // 生活機能
    { placeholder: '{{屋外歩行}}', jsonKey: 'life_function.outdoor_walking', inputType: 'ラジオボタン' },
    { placeholder: '{{車いすの使用}}', jsonKey: 'life_function.wheelchair_use', inputType: 'ラジオボタン' },
    { placeholder: '{{歩行補助具・装具の使用}}', jsonKey: 'life_function.walking_aids', inputType: 'チェックボックス' },
    { placeholder: '{{食事行為}}', jsonKey: 'life_function.eating_behavior', inputType: 'ラジオボタン' },
    { placeholder: '{{現在の栄養状態}}', jsonKey: 'life_function.current_nutrition_status', inputType: 'ラジオボタン' },
    { placeholder: '{{栄養・食生活上の留意点}}', jsonKey: 'life_function.nutrition_diet_notes', inputType: '記述' },
    { placeholder: '{{発生可能性状態1}}', jsonKey: 'life_function.possible_conditions', inputType: 'custom_possible_conditions_1' },
    { placeholder: '{{発生可能性状態2}}', jsonKey: 'life_function.possible_conditions', inputType: 'custom_possible_conditions_2' },
    { placeholder: '{{その他の発生可能性状態}}', jsonKey: 'life_function.possible_conditions', inputType: 'custom_possible_conditions_other' },
    { placeholder: '{{その他の状態名}}', jsonKey: 'life_function.other_condition_name', inputType: '記述' },
    { placeholder: '{{対処方針内容}}', jsonKey: 'life_function.response_policy', inputType: '記述' },
    { placeholder: '{{生活機能改善見通し}}', jsonKey: 'life_function.life_function_improvement_outlook', inputType: 'ラジオボタン' },
    { placeholder: '{{医学的管理の必要性1}}', jsonKey: 'life_function.medical_management_necessity', inputType: 'custom_medical_management_1' },
    { placeholder: '{{医学的管理の必要性2}}', jsonKey: 'life_function.medical_management_necessity', inputType: 'custom_medical_management_2' },
    { placeholder: '{{医学的管理の必要性3}}', jsonKey: 'life_function.medical_management_necessity', inputType: 'custom_medical_management_3' },
    { placeholder: '{{その他の医学管理の必要性}}', jsonKey: 'life_function.medical_management_necessity', inputType: 'custom_other_medical_flag' },
    { placeholder: '{{その他の医学的管理}}', jsonKey: 'life_function.other_medical_management', inputType: '記述' },
    { placeholder: '{{サービス提供血圧}}', jsonKey: 'life_function.service_blood_pressure', inputType: 'ラジオボタン' },
    { placeholder: '{{サービス提供血圧留意事項}}', jsonKey: 'life_function.service_blood_pressure_notes', inputType: '記述' },
    { placeholder: '{{サービス提供摂食}}', jsonKey: 'life_function.service_eating', inputType: 'ラジオボタン' },
    { placeholder: '{{サービス提供摂食留意事項}}', jsonKey: 'life_function.service_eating_notes', inputType: '記述' },
    { placeholder: '{{サービス提供嚥下}}', jsonKey: 'life_function.service_swallowing', inputType: 'ラジオボタン' },
    { placeholder: '{{サービス提供嚥下留意事項}}', jsonKey: 'life_function.service_swallowing_notes', inputType: '記述' },
    { placeholder: '{{サービス提供移動}}', jsonKey: 'life_function.service_mobility', inputType: 'ラジオボタン' },
    { placeholder: '{{サービス提供移動留意事項}}', jsonKey: 'life_function.service_mobility_notes', inputType: '記述' },
    { placeholder: '{{サービス提供運動}}', jsonKey: 'life_function.service_exercise', inputType: 'ラジオボタン' },
    { placeholder: '{{サービス提供運動留意事項}}', jsonKey: 'life_function.service_exercise_notes', inputType: '記述' },
    { placeholder: '{{サービス提供その他の留意事項}}', jsonKey: 'life_function.service_other_notes', inputType: '記述' },
    { placeholder: '{{感染症有無1}}', jsonKey: 'life_function.infection', inputType: 'custom_infection_status' },
    { placeholder: '{{感染症有無2}}', jsonKey: 'life_function.infection', inputType: 'custom_infection_status' },
    { placeholder: '{{感染症名}}', jsonKey: 'life_function.infection_name', inputType: '記述' },
    // 特記事項
    { placeholder: '{{その他特記事項}}', jsonKey: 'special_notes.other_notes', inputType: '記述' }
  ];

  /**
   *ネストされたオブジェクトから値を取得
   */
  function getValueByPath(obj, path) {
    if (!path) return '';
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return '';
      current = current[key];
    }
    return current !== null && current !== undefined ? current : '';
  }

  /**
   *値を表示用テキストに変換（GASから移植）
   */
  function convertToDisplayText(value, inputType, mapping) {
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    switch (inputType) {
      case 'ラジオボタン':
        return convertRadioValue(value, mapping);
      case 'チェックボックス':
        return convertCheckboxValue(value, mapping);
      case 'custom_infection_status':
        return convertInfectionStatus(value, mapping);
      case 'custom_other_medical_flag':
        // 医学的管理の必要性の「その他」フラグ（インデックス10）
        return (value && value.charAt(10) === '1') ? '■' : '□';
      case 'custom_medical_management_1':
        // 医学的管理の必要性1（インデックス0-3: 訪問診療〜訪問歯科診療）
        return convertMedicalManagement(value, 0, 4);
      case 'custom_medical_management_2':
        // 医学的管理の必要性2（インデックス4-7: 訪問薬剤管理指導〜訪問歯科衛生指導）
        return convertMedicalManagement(value, 4, 4);
      case 'custom_medical_management_3':
        // 医学的管理の必要性3（インデックス8-9: 訪問栄養食事指導〜通所リハビリテーション）
        return convertMedicalManagement(value, 8, 2);
      case 'custom_possible_conditions_1':
        // 発生可能性状態1（インデックス0-7: 尿失禁〜徘徊）
        return convertPossibleConditions(value, 0, 8, mapping);
      case 'custom_possible_conditions_2':
        // 発生可能性状態2（インデックス8-12: 低栄養〜がん等による疼痛）
        return convertPossibleConditions(value, 8, 5, mapping);
      case 'custom_possible_conditions_other':
        // 発生可能性状態その他（インデックス13）
        return (value && value.charAt(13) === '1') ? '■その他' : '□その他';
      case 'カレンダー':
        return formatDateValueForDoc(value);
      case '自動入力':
        return convertAutoInputValue(value, mapping);
      case '記述':
      default:
        return String(value);
    }
  }

  /**
   * 自動入力値の変換
   */
  function convertAutoInputValue(value, mapping) {
    const placeholder = mapping.placeholder;

    if (placeholder === '{{性別}}') {
      return { '1': '男', '2': '女' }[value] || value;
    }

    if (placeholder === '{{生年月日}}' || placeholder === '{{記入日}}') {
      return formatDateValueForDoc(value);
    }

    return String(value);
  }

  /**
   * ラジオボタンの値を表示テキストに変換（GASから移植）
   */
  function convertRadioValue(value, mapping) {
    const placeholder = mapping.placeholder;

    const radioMappings = {
      '{{同意の有無}}': { '1': '■同意する\t□同意しない', '2': '□同意する\t■同意しない' },
      '{{意見書作成回数}}': { '1': '■初回\t□2回目以上', '2': '□初回\t■2回目以上' },
      '{{他科受診有無}}': { '1': '■有\t□無', '2': '□有\t■無' },
      '{{症状安定性}}': { '1': '■安定\t□不安定\t□不明', '2': '□安定\t■不安定\t□不明', '3': '□安定\t□不安定\t■不明' },
      '{{寝たきり度}}': {
        '1': '■自立\t□J1\t□J2\t□A1\t□A2\t□B1\t□B2\t□C1\t□C2',
        '2': '□自立\t■J1\t□J2\t□A1\t□A2\t□B1\t□B2\t□C1\t□C2',
        '3': '□自立\t□J1\t■J2\t□A1\t□A2\t□B1\t□B2\t□C1\t□C2',
        '4': '□自立\t□J1\t□J2\t■A1\t□A2\t□B1\t□B2\t□C1\t□C2',
        '5': '□自立\t□J1\t□J2\t□A1\t■A2\t□B1\t□B2\t□C1\t□C2',
        '6': '□自立\t□J1\t□J2\t□A1\t□A2\t■B1\t□B2\t□C1\t□C2',
        '7': '□自立\t□J1\t□J2\t□A1\t□A2\t□B1\t■B2\t□C1\t□C2',
        '8': '□自立\t□J1\t□J2\t□A1\t□A2\t□B1\t□B2\t■C1\t□C2',
        '9': '□自立\t□J1\t□J2\t□A1\t□A2\t□B1\t□B2\t□C1\t■C2'
      },
      '{{認知症高齢者の日常生活自立度}}': {
        '1': '■自立\t□Ⅰ\t□Ⅱa\t□Ⅱb\t□Ⅲa\t□Ⅲb\t□Ⅳ\t□M',
        '2': '□自立\t■Ⅰ\t□Ⅱa\t□Ⅱb\t□Ⅲa\t□Ⅲb\t□Ⅳ\t□M',
        '3': '□自立\t□Ⅰ\t■Ⅱa\t□Ⅱb\t□Ⅲa\t□Ⅲb\t□Ⅳ\t□M',
        '4': '□自立\t□Ⅰ\t□Ⅱa\t■Ⅱb\t□Ⅲa\t□Ⅲb\t□Ⅳ\t□M',
        '5': '□自立\t□Ⅰ\t□Ⅱa\t□Ⅱb\t■Ⅲa\t□Ⅲb\t□Ⅳ\t□M',
        '6': '□自立\t□Ⅰ\t□Ⅱa\t□Ⅱb\t□Ⅲa\t■Ⅲb\t□Ⅳ\t□M',
        '7': '□自立\t□Ⅰ\t□Ⅱa\t□Ⅱb\t□Ⅲa\t□Ⅲb\t■Ⅳ\t□M',
        '8': '□自立\t□Ⅰ\t□Ⅱa\t□Ⅱb\t□Ⅲa\t□Ⅲb\t□Ⅳ\t■M'
      },
      '{{短期記憶}}': { '1': '■問題なし\t□問題あり', '2': '□問題なし\t■問題あり' },
      '{{認知能力}}': {
        '1': '■自立\t□いくらか困難\t□見守りが必要\t□判断できない',
        '2': '□自立\t■いくらか困難\t□見守りが必要\t□判断できない',
        '3': '□自立\t□いくらか困難\t■見守りが必要\t□判断できない',
        '4': '□自立\t□いくらか困難\t□見守りが必要\t■判断できない'
      },
      '{{伝達能力}}': {
        '1': '■伝えられる\t□いくらか困難\t□具体的要求に限られる\t□伝えられない',
        '2': '□伝えられる\t■いくらか困難\t□具体的要求に限られる\t□伝えられない',
        '3': '□伝えられる\t□いくらか困難\t■具体的要求に限られる\t□伝えられない',
        '4': '□伝えられる\t□いくらか困難\t□具体的要求に限られる\t■伝えられない'
      },
      '{{周辺症状有無}}': { '1': '■有\t□無', '2': '□有\t■無' },
      '{{精神神経症状有無}}': { '1': '□無\t■有', '2': '■無\t□有' },
      '{{専門医受診有無}}': { '1': '■有\t□無', '2': '□有\t■無' },
      '{{利き腕}}': { '1': '右', '2': '左' },
      '{{体重の変化}}': { '1': '■増加\t□維持\t□減少', '2': '□増加\t■維持\t□減少', '3': '□増加\t□維持\t■減少' },
      '{{屋外歩行}}': {
        '1': '■自立\t□介助があればしている\t□していない',
        '2': '□自立\t■介助があればしている\t□していない',
        '3': '□自立\t□介助があればしている\t■していない'
      },
      '{{車いすの使用}}': {
        '1': '■用いていない\t□主に自分で操作\t□主に他人が操作',
        '2': '□用いていない\t■主に自分で操作\t□主に他人が操作',
        '3': '□用いていない\t□主に自分で操作\t■主に他人が操作'
      },
      '{{食事行為}}': {
        '1': '■自立ないし何とか自分で食べられる\t□全面介助',
        '2': '□自立ないし何とか自分で食べられる\t■全面介助'
      },
      '{{現在の栄養状態}}': { '1': '■良好\t□不良', '2': '□良好\t■不良' },
      '{{生活機能改善見通し}}': {
        '1': '■期待できる\t□期待できない\t□不明',
        '2': '□期待できる\t■期待できない\t□不明',
        '3': '□期待できる\t□期待できない\t■不明'
      },
      '{{サービス提供血圧}}': { '1': '■特になし\t□あり', '2': '□特になし\t■あり' },
      '{{サービス提供摂食}}': { '1': '■特になし\t□あり', '2': '□特になし\t■あり' },
      '{{サービス提供嚥下}}': { '1': '■特になし\t□あり', '2': '□特になし\t■あり' },
      '{{サービス提供移動}}': { '1': '■特になし\t□あり', '2': '□特になし\t■あり' },
      '{{サービス提供運動}}': { '1': '■特になし\t□あり', '2': '□特になし\t■あり' }
    };

    // 程度（軽/中/重）の共通マッピング
    if (placeholder.includes('程度')) {
      return { '1': '■軽 □中 □重', '2': '□軽 ■中 □重', '3': '□軽 □中 ■重' }[value] || value;
    }

    if (radioMappings[placeholder] && radioMappings[placeholder][value]) {
      return radioMappings[placeholder][value];
    }

    return value;
  }

  /**
   * 感染症有無の値を表示テキストに変換（特別処理）
   */
  function convertInfectionStatus(value, mapping) {
    const placeholder = mapping.placeholder;

    if (placeholder === '{{感染症有無1}}') {
      if (value === '1') return '■有\t□無'; // Yes
      if (value === '2') return '□有\t■無'; // No
      return '□有\t□無'; // For "Unknown" or empty, both are unchecked
    }

    if (placeholder === '{{感染症有無2}}') {
      if (value === '3') return '■不明'; // Unknown
      return '□不明'; // For "Yes", "No", or empty
    }

    return ''; // Should not happen
  }

  /**
   * チェックボックスの値を表示テキストに変換（GASから移植）
   */
  function convertCheckboxValue(value, mapping) {
    const placeholder = mapping.placeholder;

    const checkboxTemplates = {
      '{{処置内容}}': "□点滴管理\t□中心静脈栄養\t□透析\t□ストーマの処置\t□酸素療法\n\t\t□レスピレーター\t□気管切開の処置\t□疼痛の看護\t□経管栄養",
      '{{特別な対応}}': "□モニター測定（血圧、心拍、酸素飽和度等）\t□褥瘡の処置",
      '{{失禁への対応}}': "□カテーテル（コンドームカテーテル、留置カテーテル等）",
      '{{発生可能性状態1}}': "□尿失禁\t□転倒・骨折\t□移動能力の低下\t□褥瘡\t□心肺機能の低下\t□閉じこもり\t□意欲低下\t□徘徊",
      '{{発生可能性状態2}}': "□低栄養\t□摂食・嚥下機能低下\t□脱水\t□易感染性\t□がん等による疼痛",
      '{{歩行補助具・装具の使用}}': "□杖\t□歩行器・歩行車\t□装具",
      '{{失調不随意運動上肢}}': "□右\t□左",
      '{{失調不随意運動下肢}}': "□右\t□左",
      '{{体幹}}': "□右\t□左"
    };

    const template = checkboxTemplates[placeholder];

    if (!template) {
      const singleCheckboxLabels = {
        '{{四肢欠損}}': '四肢欠損',
        '{{麻痺}}': '麻痺',
        '{{筋力低下}}': '筋力の低下',
        '{{関節拘縮}}': '関節の拘縮',
        '{{関節痛み}}': '関節の痛み',
        '{{失調不随意運動}}': '失調・不随意運動',
        '{{褥瘡}}': '褥瘡',
        '{{その他皮膚疾患}}': 'その他の皮膚疾患'
      };
      const label = singleCheckboxLabels[placeholder] || '';
      const mark = value === '1' ? '■' : '□';
      return mark + label;
    } else {
      const parts = template.split('□');
      const optionsCount = parts.length - 1;
      if (optionsCount <= 0) {
        return template;
      }

      const bitString = String(value).padStart(optionsCount, '0');
      let newString = parts[0];

      for (let i = 0; i < optionsCount; i++) {
        const mark = bitString[i] === '1' ? '■' : '□';
        newString += mark + parts[i + 1];
      }

      return newString;
    }
  }

  /**
   * 発生可能性状態のビットフラグを部分的に変換
   * @param {string} value - ビットフラグ文字列
   * @param {number} startIndex - 開始インデックス
   * @param {number} count - 処理する項目数
   * @param {Object} mapping - プレースホルダーマッピング
   */
  function convertPossibleConditions(value, startIndex, count, mapping) {
    const templates = {
      0: "□尿失禁\t□転倒・骨折\t□移動能力の低下\t□褥瘡\t□心肺機能の低下\t□閉じこもり\t□意欲低下\t□徘徊",
      8: "□低栄養\t□摂食・嚥下機能低下\t□脱水\t□易感染性\t□がん等による疼痛"
    };

    const template = templates[startIndex];
    if (!template) return '';

    const parts = template.split('□');
    const bitString = String(value || '').padStart(14, '0');
    let newString = parts[0];

    for (let i = 0; i < count; i++) {
      const mark = bitString[startIndex + i] === '1' ? '■' : '□';
      newString += mark + parts[i + 1];
    }

    return newString;
  }

  /**
   * 医学的管理の必要性のビットフラグを部分的に変換
   * @param {string} value - ビットフラグ文字列
   * @param {number} startIndex - 開始インデックス
   * @param {number} count - 処理する項目数
   */
  function convertMedicalManagement(value, startIndex, count) {
    const templates = {
      0: "□訪問診療\t□訪問看護\t□看護職員の訪問による相談・支援\t□訪問歯科診療",
      4: "□訪問薬剤管理指導\t□訪問リハビリテーション\t□短期入所療養介護\t□訪問歯科衛生指導",
      8: "□訪問栄養食事指導\t□通所リハビリテーション"
    };

    const template = templates[startIndex];
    if (!template) return '';

    const parts = template.split('□');
    const bitString = String(value || '').padStart(11, '0');
    let newString = parts[0];

    for (let i = 0; i < count; i++) {
      const mark = bitString[startIndex + i] === '1' ? '■' : '□';
      newString += mark + parts[i + 1];
    }

    return newString;
  }

  /**
   * 日付値をフォーマット（和暦）
   */
  function formatDateValueForDoc(value) {
    if (!value) return '';

    if (/^\d{8}$/.test(value)) {
      const year = value.slice(0, 4);
      const month = value.slice(4, 6);
      const day = value.slice(6, 8);
      return toWareki(`${year}-${month}-${day}`);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return toWareki(value);
    }

    return value;
  }

  /**
   * Google Docs APIを使用してドキュメントを生成
   * @param {Object} formData - フォームデータ
   * @param {string} fileName - ファイル名
   * @returns {Promise<Object>} 結果
   */
  async function createGoogleDoc(formData, fileName) {
    // スピナー表示
    const HenryCore = pageWindow.HenryCore;
    const spinner = HenryCore?.ui?.showSpinner?.('Google Docsを生成中...');

    try {
    // 認証チェック（デバッグログ付き）
    const googleAuth = getGoogleAuth();
    console.log('[OpinionForm] getGoogleAuth():', googleAuth);
    console.log('[OpinionForm] HenryCore:', pageWindow.HenryCore);
    console.log('[OpinionForm] modules:', pageWindow.HenryCore?.modules);
    console.log('[OpinionForm] GoogleAuth:', pageWindow.HenryCore?.modules?.GoogleAuth);
    console.log('[OpinionForm] isConfigured:', googleAuth?.isConfigured?.());
    console.log('[OpinionForm] isAuthenticated:', googleAuth?.isAuthenticated?.());

    // OAuth設定チェック
    if (!googleAuth?.isConfigured()) {
      alert('OAuth設定が必要です。設定ダイアログを開きます。');
      googleAuth?.showConfigDialog();
      return null;
    }

    if (!googleAuth?.isAuthenticated()) {
      // 自動で認証を開始
      if (googleAuth?.startAuth) {
        googleAuth.startAuth();
        throw new Error('Google認証が必要です。認証画面を開きました。認証完了後、再度お試しください。');
      } else {
        throw new Error('Google認証モジュールが見つかりません。ページを再読み込みしてください。');
      }
    }

    // 1. 保存先フォルダを取得（なければ作成）
    log?.info('保存先フォルダを確認中...');
    const folder = await DriveAPI.getOrCreateFolder(TEMPLATE_CONFIG.OUTPUT_FOLDER_NAME);
    log?.info('保存先フォルダ:', folder.name, folder.id);

    // 2. テンプレートをコピー（保存先フォルダ・メタデータを指定）
    log?.info('テンプレートをコピー中...');
    const properties = {
      henryPatientUuid: formData.basic_info?.patient_uuid || '',
      henryFileUuid: '',  // 新規作成なので空
      henryFolderUuid: folder.id,
      henrySource: 'ikensho-form'
    };
    const copiedFile = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);
    const documentId = copiedFile.id;
    log?.info('コピー完了:', documentId);

    // 3. 置換リクエストを作成
    const requests = [];
    const departmentMaster = ['内科', '精神科', '外科', '整形外科', '脳神経外科', '皮膚科', '泌尿器科', '婦人科', '眼科', '耳鼻咽喉科', 'リハビリテーション科', '歯科'];
    const peripheralSymptomsMaster = ['幻視･幻聴', '妄想', '昼夜逆転', '暴言', '暴行', '介護への抵抗', '徘徊', '火の不始末', '不潔行為', '異食行動', '性的問題行動'];

    for (const mapping of PLACEHOLDER_MAPPINGS) {
      let value = getValueByPath(formData, mapping.jsonKey);
      let displayText = '';

      if (mapping.placeholder === '{{他科名1}}') {
        // 「その他」を含む13ビットでパディング
        const bitString = String(value).padStart(13, '0');
        const part1 = departmentMaster.slice(0, 7);
        displayText = part1.map((dept, i) => (bitString[i] === '1' ? '■' : '□') + dept).join('\t');
      } else if (mapping.placeholder === '{{他科名2}}') {
        // 「その他」を含む13ビットでパディング
        const bitString = String(value).padStart(13, '0');
        const part2 = departmentMaster.slice(7); // departmentMasterは12個のまま
        let part2Text = part2.map((dept, i) => (bitString[i + 7] === '1' ? '■' : '□') + dept).join('\t');
        
        // 13番目のビット(インデックス12)を見て「その他」のチェックを判断
        if (bitString[12] === '1') {
          part2Text += '\t■その他';
        } else {
          part2Text += '\t□その他';
        }
        displayText = part2Text;
      } else if (mapping.placeholder === '{{周辺症状詳細1}}') {
        const bitString = String(value).padStart(12, '0');
        const part1 = peripheralSymptomsMaster.slice(0, 7);
        displayText = part1.map((symptom, i) => (bitString[i] === '1' ? '■' : '□') + symptom).join('\t');
      } else if (mapping.placeholder === '{{周辺症状詳細2}}') {
        const bitString = String(value).padStart(12, '0');
        const part2 = peripheralSymptomsMaster.slice(7);
        let part2Text = part2.map((symptom, i) => (bitString[i + 7] === '1' ? '■' : '□') + symptom).join('\t');

        if (bitString[11] === '1') {
          part2Text += '\t■その他';
        } else {
          part2Text += '\t□その他';
        }
        displayText = part2Text;
      } else {
        displayText = convertToDisplayText(value, mapping.inputType, mapping);
      }
      
      requests.push(DocsAPI.createReplaceTextRequest(mapping.placeholder, displayText));
    }

    // 4. バッチ更新を実行
    log?.info('プレースホルダーを置換中...', requests.length, '件');
    await DocsAPI.batchUpdate(documentId, requests);
    log?.info('置換完了');

    // 5. ファイル情報を取得
    const fileInfo = await DriveAPI.getFileMetadata(documentId, 'id,name,webViewLink');

    spinner?.close();
    return {
      success: true,
      documentId: fileInfo.id,
      documentUrl: fileInfo.webViewLink,
      fileName: fileInfo.name
    };
    } catch (e) {
      spinner?.close();
      throw e;
    }
  }

  /**
   * ファイル名を生成
   * 形式: YYYYMMDD_患者ID_患者名_主治医意見書
   * @param {Object} formData - フォームデータ
   * @returns {string} ファイル名
   */
  function generateFileName(formData) {
    const dateStr = formData.basic_info?.date_of_writing || getTodayString();
    const patientId = formData.basic_info?.patient_id || '00000';
    const patientName = formData.basic_info?.patient_name || '不明';
    return `${dateStr}_${patientId}_${patientName}_主治医意見書`;
  }

  // =============================================================================
  // 患者情報取得
  // =============================================================================

  /**
   * 患者情報を取得して自動入力データを作成
   */
  async function fetchPatientInfo(pageWindow) {
    try {
      const patientUuid = pageWindow.HenryCore.getPatientUuid();
      if (!patientUuid) {
        log?.error('患者UUIDが取得できません');
        return null;
      }

      const result = await pageWindow.HenryCore.query(QUERIES.GetPatient, {
        input: { uuid: patientUuid }
      });

      const patient = result.data?.getPatient;
      if (!patient) {
        log?.error('患者情報が取得できません');
        return null;
      }

      const today = getTodayString();
      const todayFormatted = formatDate(today);

      // birthDateをYYYY-MM-DD形式に変換
      const bd = patient.detail?.birthDate;
      const birthDateStr = bd ? `${bd.year}-${String(bd.month).padStart(2,'0')}-${String(bd.day).padStart(2,'0')}` : '';

      return {
        patient_uuid: patientUuid,
        patient_id: patient.serialNumber || '',
        date_of_writing: today,
        date_of_writing_wareki: toWareki(todayFormatted),
        patient_name_kana: katakanaToHiragana(patient.fullNamePhonetic) || '',
        patient_name: patient.fullName || '',
        birth_date: birthDateStr?.replace(/-/g, '') || '',
        birth_date_wareki: toWareki(birthDateStr),
        age: calculateAge(birthDateStr, todayFormatted),
        sex: patient.detail?.sexType === 'SEX_TYPE_MALE' ? '1' : patient.detail?.sexType === 'SEX_TYPE_FEMALE' ? '2' : '0',
        postal_code: patient.detail?.postalCode || '',
        address: patient.detail?.addressLine_1 || '',
        phone: patient.detail?.phoneNumber || ''
      };
    } catch (e) {
      log?.error('患者情報取得エラー:', e.message);
      return null;
    }
  }

  /**
   * 医師情報を取得
   */
  async function fetchPhysicianInfo(pageWindow) {
    try {
      const myUuid = await pageWindow.HenryCore.getMyUuid();
      if (!myUuid) {
        log?.error('医師UUIDが取得できません');
        return '';
      }

      // ListUsers APIで医師一覧を取得
      const result = await pageWindow.HenryCore.query(QUERIES.ListUsers, {
        input: { role: 'DOCTOR', onlyNarcoticPractitioner: false }
      });

      const users = result.data?.listUsers?.users || [];
      const me = users.find(u => u.uuid === myUuid);

      if (!me) {
        log?.error('医師一覧に該当ユーザーが見つかりませんでした');
        return '';
      }

      return (me.name || '').replace(/\u3000/g, ' ');
    } catch (e) {
      log?.error('医師情報取得エラー:', e.message);
      return '';
    }
  }

  // =============================================================================
  // メッセージ表示
  // =============================================================================

  /**
   * フォーム内にメッセージを表示
   * @param {string} message - 表示するメッセージ
   * @param {'error'|'success'|'info'} type - メッセージタイプ
   */
  function showFormMessage(message, type = 'info') {
    const area = document.getElementById('form-message-area');
    if (!area) return;

    const colors = {
      error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };
    const c = colors[type] || colors.info;

    area.style.display = 'block';
    area.style.backgroundColor = c.bg;
    area.style.border = `1px solid ${c.border}`;
    area.style.color = c.text;
    area.style.whiteSpace = 'pre-wrap';
    area.textContent = message;

    // エラー時はスクロールして表示
    if (type === 'error') {
      area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 成功メッセージは3秒後に非表示
    if (type === 'success') {
      setTimeout(() => {
        area.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * メッセージを非表示
   */
  function hideFormMessage() {
    const area = document.getElementById('form-message-area');
    if (area) {
      area.style.display = 'none';
    }
  }

  /**
   * テストデータをフォームに入力（開発用）
   * 記述フィールドは固定値、選択フィールドはランダム
   * @param {HTMLElement} container - フォームコンテナ要素
   */
  function fillTestData(container) {
    // 固定の記述データ（section.fieldName形式）
    const fixedTextData = {
      'basic_info.last_examination_date': new Date().toISOString().split('T')[0],
      'diagnosis.diagnosis_1_name': '脳梗塞後遺症',
      'diagnosis.diagnosis_1_onset': '令和4年3月15日',
      'diagnosis.diagnosis_2_name': '高血圧症',
      'diagnosis.diagnosis_2_onset': '令和2年5月頃',
      'diagnosis.course_and_treatment': '令和4年3月に脳梗塞を発症し、急性期病院にて加療。その後リハビリテーション病院を経て自宅退院。現在は外来にて経過観察中。降圧剤、抗血小板薬を継続処方中。',
      'diagnosis.symptom_unstable_details': '血圧変動が大きい',
      'diagnosis.other_department_names': '循環器内科',
      'mental_physical_state.height': '165',
      'mental_physical_state.weight': '58',
      'mental_physical_state.psychiatric_symptom_name': 'うつ状態',
      'mental_physical_state.specialist_department': '精神科',
      'mental_physical_state.limb_loss_location': '左下肢',
      'mental_physical_state.paralysis_other_location': '顔面',
      'mental_physical_state.muscle_weakness_location': '左上下肢',
      'mental_physical_state.joint_contracture_location': '左肩関節',
      'mental_physical_state.joint_pain_location': '左膝関節',
      'mental_physical_state.pressure_ulcer_location': '仙骨部',
      'mental_physical_state.other_skin_disease_location': '両下腿',
      'mental_physical_state.other_peripheral_symptoms': '介護拒否',
      'life_function.nutrition_diet_notes': '塩分制限あり',
      'life_function.other_condition_name': '脱水',
      'life_function.response_policy': '水分摂取を促す',
      'life_function.other_medical_management': '訪問入浴',
      'life_function.service_blood_pressure_notes': '収縮期180以上で中止',
      'life_function.service_eating_notes': '嚥下状態を確認',
      'life_function.service_swallowing_notes': 'とろみ付与',
      'life_function.service_mobility_notes': '歩行時はふらつきあり、見守り必要',
      'life_function.service_exercise_notes': '過負荷に注意',
      'life_function.service_other_notes': '特になし',
      'life_function.infection_name': 'MRSA',
      'special_notes.other_notes': '左片麻痺があるが、日常生活は概ね自立。歩行時の転倒リスクに注意が必要。'
    };

    // 記述フィールドに固定値を入力
    Object.entries(fixedTextData).forEach(([key, value]) => {
      const [section, fieldName] = key.split('.');
      // テキスト入力
      const textInput = container.querySelector(`input[type="text"][data-section="${section}"][data-field-name="${fieldName}"], textarea[data-section="${section}"][data-field-name="${fieldName}"]`);
      if (textInput) {
        textInput.value = value;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      // 日付入力
      const dateInput = container.querySelector(`input[type="date"][data-section="${section}"][data-field-name="${fieldName}"]`);
      if (dateInput) {
        dateInput.value = value;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // ラジオボタンをランダムに選択
    const radioGroups = new Map();
    container.querySelectorAll('input[type="radio"][data-section][data-field-name]').forEach(radio => {
      const key = `${radio.dataset.section}.${radio.dataset.fieldName}`;
      if (!radioGroups.has(key)) {
        radioGroups.set(key, []);
      }
      radioGroups.get(key).push(radio);
    });
    radioGroups.forEach(radios => {
      const randomRadio = radios[Math.floor(Math.random() * radios.length)];
      randomRadio.checked = true;
      randomRadio.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // チェックボックスをランダムに選択
    container.querySelectorAll('input[type="checkbox"][data-section][data-field-name]').forEach(cb => {
      cb.checked = Math.random() > 0.7; // 30%の確率でチェック
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });

    showFormMessage('テストデータを入力しました（選択項目はランダム）', 'success');
  }

  // =============================================================================
  // バリデーション
  // =============================================================================

  /**
   * フォームデータのバリデーション
   * @param {Object} data - collectFormData() で収集されたデータ
   * @returns {Array<string>} エラーメッセージの配列（空配列 = エラーなし）
   */
  function validateFormData(data) {
    const errors = [];

    // 必須項目チェック（条件なし）
    const requiredFields = {
      // 基本情報
      'basic_info.consent': '同意の有無',
      'basic_info.last_examination_date': '最終診察日',
      'basic_info.opinion_count': '意見書作成回数',
      'basic_info.other_department_visit': '他科受診有無',

      // 診断
      'diagnosis.diagnosis_1_name': '診断名1',
      'diagnosis.diagnosis_1_onset': '発症年月日1',
      'diagnosis.course_and_treatment': '経過及び治療内容',

      // 心身の状態
      'mental_physical_state.bedridden_level': '寝たきり度',
      'mental_physical_state.dementia_level': '認知症高齢者の日常生活自立度',
      'mental_physical_state.short_term_memory': '短期記憶',
      'mental_physical_state.cognitive_ability': '認知能力',
      'mental_physical_state.communication_ability': '伝達能力',
      'mental_physical_state.peripheral_symptoms': '周辺症状有無',
      'mental_physical_state.psychiatric_symptoms': '精神神経症状有無',
      'mental_physical_state.specialist_visit': '専門医受診有無',
      'mental_physical_state.dominant_hand': '利き腕',
      'mental_physical_state.height': '身長',
      'mental_physical_state.weight': '体重',
      'mental_physical_state.weight_change': '体重の変化',

      // 生活機能
      'life_function.outdoor_walking': '屋外歩行',
      'life_function.wheelchair_use': '車いすの使用',
      'life_function.eating_behavior': '食事行為',
      'life_function.current_nutrition_status': '現在の栄養状態',
      'life_function.life_function_improvement_outlook': '生活機能改善見通し'
    };

    Object.entries(requiredFields).forEach(([path, label]) => {
      const value = getNestedValue(data, path);
      if (!value || value === '') {
        errors.push(`• ${label}：入力してください`);
      }
    });

    // 行数制限チェック（1行57文字で計算）
    const countLogicalLines = (text, charsPerLine) => {
      if (!text) return 0;
      const lines = text.split('\n');
      let totalLines = 0;
      for (const line of lines) {
        totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
      return totalLines;
    };

    const course = data.diagnosis?.course_and_treatment || '';
    const courseLines = countLogicalLines(course, 57);
    if (courseLines > 5) {
      errors.push(`• 経過及び治療内容：5行以内で入力してください（現在${courseLines}行）`);
    }

    const notes = data.special_notes?.other_notes || '';
    const notesLines = countLogicalLines(notes, 57);
    if (notesLines > 8) {
      errors.push(`• 特記すべき事項：8行以内で入力してください（現在${notesLines}行）`);
    }

    // 条件付き必須項目チェック（基本的なもののみ）
    const symptomStability = data.diagnosis?.symptom_stability;
    if (symptomStability === '2') {  // 不安定
      const details = data.diagnosis?.symptom_unstable_details || '';
      if (!details) {
        errors.push('• 症状不安定時の具体的状況：症状安定性が「不安定」の場合は入力が必要です');
      }
    }

    // 麻痺チェック
    const paralysis = data.mental_physical_state?.paralysis || '0';
    if (paralysis === '1') {  // 麻痺あり
      const hasAnyParalysisData =
        data.mental_physical_state?.paralysis_right_upper_limb === '1' ||
        data.mental_physical_state?.paralysis_left_upper_limb === '1' ||
        data.mental_physical_state?.paralysis_right_lower_limb === '1' ||
        data.mental_physical_state?.paralysis_left_lower_limb === '1' ||
        (data.mental_physical_state?.paralysis_other || '').trim();

      if (!hasAnyParalysisData) {
        errors.push('• 麻痺：麻痺がある場合は部位と程度を入力してください');
      }
    }

    // 感染症チェック
    const infection = data.life_function?.infection;
    if (infection === '1') {  // 有
      const infectionName = data.life_function?.infection_name || '';
      if (!infectionName) {
        errors.push('• 感染症名：感染症有無が「有」の場合は感染症名の入力が必要です');
      }
    }

    return errors;
  }

  /**
   *ネストされたオブジェクトから値を取得
   * @param {Object} obj - 対象オブジェクト
   * @param {string} path - パス（例: 'basic_info.consent'）
   * @returns {any} 値
   */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // =============================================================================
  // フォーム生成（次のステップで実装）
  // =============================================================================

  /**
   * フォームを表示
   */
  async function showOpinionForm(pageWindow) {
    const { close: hideSpinner } = pageWindow.HenryCore.ui.showSpinner('主治医意見書を準備中...');
    try {
      // 下書きキャッシュのプリロードを開始（Sheets APIが最も遅いため先行実行）
      const preloadPromise = DraftStorage._loadAll();

      // 患者情報・医師情報を逐次取得
      const patientInfo = await fetchPatientInfo(pageWindow);
      if (!patientInfo) {
        hideSpinner();
        alert('患者情報を取得できませんでした');
        return;
      }
      const physicianName = await fetchPhysicianInfo(pageWindow);

      // プリロード完了を待ってから下書き検索（キャッシュ済みなので即座に完了）
      await preloadPromise;
      const savedDraft = await DraftStorage.load(patientInfo.patient_uuid);

      // データの準備
      const formData = savedDraft?.data || createInitialFormData(patientInfo, physicianName);
      const lastSavedAt = savedDraft?.savedAt || null;

      // 基本情報は常に最新の患者情報で上書き（下書きがあっても患者情報は最新を使用）
      formData.basic_info.patient_uuid = patientInfo.patient_uuid;
      formData.basic_info.patient_id = patientInfo.patient_id;
      formData.basic_info.date_of_writing = patientInfo.date_of_writing;
      formData.basic_info.date_of_writing_wareki = patientInfo.date_of_writing_wareki;
      formData.basic_info.patient_name_kana = patientInfo.patient_name_kana;
      formData.basic_info.patient_name = patientInfo.patient_name;
      formData.basic_info.birth_date = patientInfo.birth_date;
      formData.basic_info.birth_date_wareki = patientInfo.birth_date_wareki;
      formData.basic_info.age = patientInfo.age;
      formData.basic_info.sex = patientInfo.sex;
      formData.basic_info.postal_code = patientInfo.postal_code;
      formData.basic_info.address = patientInfo.address;
      formData.basic_info.phone = patientInfo.phone;
      formData.basic_info.physician_name = physicianName;

      // フォームHTML生成
      const formHTML = createFormHTML(formData, lastSavedAt);

      // モーダル表示
      hideSpinner();
      showFormModal(pageWindow, formHTML, formData);

    } catch (e) {
      hideSpinner();
      log?.error('フォーム表示エラー:', e.message);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  /**
   * 初期フォームデータを作成
   */
  function createInitialFormData(patientInfo, physicianName) {
    return {
      basic_info: {
        patient_uuid: patientInfo.patient_uuid,
        patient_id: patientInfo.patient_id,
        date_of_writing: patientInfo.date_of_writing,
        date_of_writing_wareki: patientInfo.date_of_writing_wareki,
        patient_name_kana: patientInfo.patient_name_kana,
        patient_name: patientInfo.patient_name,
        birth_date: patientInfo.birth_date,
        birth_date_wareki: patientInfo.birth_date_wareki,
        age: patientInfo.age,
        sex: patientInfo.sex,
        postal_code: patientInfo.postal_code,
        address: patientInfo.address,
        phone: patientInfo.phone,
        physician_name: physicianName,
        institution_name: INSTITUTION_INFO.name,
        institution_postal_code: INSTITUTION_INFO.postal_code,
        institution_address: INSTITUTION_INFO.address,
        institution_phone: INSTITUTION_INFO.phone,
        institution_fax: INSTITUTION_INFO.fax,
        consent: '',
        last_examination_date: '',
        opinion_count: '',
        other_department_visit: ''
      },
      diagnosis: {
        other_departments: '',
        other_department_names: '',
        diagnosis_1_name: '',
        diagnosis_1_onset: '',
        diagnosis_2_name: '',
        diagnosis_2_onset: '',
        diagnosis_3_name: '',
        diagnosis_3_onset: '',
        symptom_stability: '',
        symptom_unstable_details: '',
        course_and_treatment: ''
      },
      special_medical_care: {
        treatments: '',
        special_responses: '',
        incontinence_care: ''
      },
      mental_physical_state: {
        bedridden_level: '',
        dementia_level: '',
        short_term_memory: '',
        cognitive_ability: '',
        communication_ability: '',
        peripheral_symptoms: '',
        peripheral_symptoms_details: '',
        other_peripheral_symptoms: '',
        psychiatric_symptoms: '',
        psychiatric_symptom_name: '',
        specialist_visit: '',
        specialist_department: '',
        dominant_hand: '',
        height: '',
        weight: '',
        weight_change: '',
        limb_loss: '',
        limb_loss_location: '',
        paralysis: '',
        paralysis_right_upper_limb: '',
        paralysis_right_upper_limb_severity: '',
        paralysis_left_upper_limb: '',
        paralysis_left_upper_limb_severity: '',
        paralysis_right_lower_limb: '',
        paralysis_right_lower_limb_severity: '',
        paralysis_left_lower_limb: '',
        paralysis_left_lower_limb_severity: '',
        paralysis_other: '',
        paralysis_other_location: '',
        paralysis_other_severity: '',
        muscle_weakness: '',
        muscle_weakness_location: '',
        muscle_weakness_severity: '',
        joint_contracture: '',
        joint_contracture_location: '',
        joint_contracture_severity: '',
        joint_pain: '',
        joint_pain_location: '',
        joint_pain_severity: '',
        ataxia_involuntary_movement: '',
        ataxia_upper_limbs: '',
        ataxia_lower_limbs: '',
        trunk: '',
        pressure_ulcer: '',
        pressure_ulcer_location: '',
        pressure_ulcer_severity: '',
        other_skin_disease: '',
        other_skin_disease_location: '',
        other_skin_disease_severity: ''
      },
      life_function: {
        outdoor_walking: '',
        wheelchair_use: '',
        walking_aids: '',
        eating_behavior: '',
        current_nutrition_status: '',
        nutrition_diet_notes: '',
        possible_conditions: '',
        other_condition_name: '',
        response_policy: '',
        life_function_improvement_outlook: '',
        medical_management_necessity: '',
        other_medical_management: '',
        service_blood_pressure: '',
        service_blood_pressure_notes: '',
        service_eating: '',
        service_eating_notes: '',
        service_swallowing: '',
        service_swallowing_notes: '',
        service_mobility: '',
        service_mobility_notes: '',
        service_exercise: '',
        service_exercise_notes: '',
        service_other_notes: '',
        infection: '',
        infection_name: ''
      },
      special_notes: {
        other_notes: ''
      }
    };
  }

  /**
   * フォームHTML生成
   * @param {object} formData - フォームデータ
   * @param {string|null} lastSavedAt - 最終保存日時（ISO形式）
   */
  function createFormHTML(formData, lastSavedAt = null) {
    const container = document.createElement('div');
    container.style.cssText = 'max-height: 70vh; overflow-y: auto; padding: 20px;';

    // 最終更新日表示
    if (lastSavedAt) {
      const lastUpdatedArea = document.createElement('div');
      lastUpdatedArea.style.cssText = 'padding: 10px 14px; margin-bottom: 16px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; font-size: 13px; color: #0369a1;';
      const savedDate = new Date(lastSavedAt);
      const formattedDate = savedDate.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      lastUpdatedArea.textContent = `📝 下書き最終更新: ${formattedDate}`;
      container.appendChild(lastUpdatedArea);
    }

    // メッセージ表示領域
    const messageArea = document.createElement('div');
    messageArea.id = 'form-message-area';
    messageArea.style.cssText = 'display: none; padding: 12px 16px; margin-bottom: 16px; border-radius: 6px; font-size: 14px;';
    container.appendChild(messageArea);

    // セクション1: 基本情報
    container.appendChild(createSection1(formData));

    // セクション2: 傷病に関する意見
    container.appendChild(createSection2(formData));

    // セクション3: 特別な医療
    container.appendChild(createSection3(formData));

    // セクション4: 心身の状態
    container.appendChild(createSection4(formData));

    // セクション5: 生活機能とサービス
    container.appendChild(createSection5(formData));

    // セクション6: 特記事項
    container.appendChild(createSection6(formData));

    return container;
  }

  /**
   *セクション1: 基本情報
   */
  function createSection1(formData) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';

    const title = document.createElement('h3');
    title.textContent = '0. 基本情報';
    title.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; color: #1e40af;';
    section.appendChild(title);

    const data = formData.basic_info;

    // 同意の有無（必須）
    section.appendChild(createRadioField(
      '本意見書が介護サービス計画作成等に利用されることに同意しますか？',
      'consent',
      'basic_info',
      [
        { label: '同意する', value: '1' },
        { label: '同意しない', value: '2' }
      ],
      data.consent,
      true
    ));

    // 最終診察日（カレンダー）
    section.appendChild(createDateField('最終診察日', 'last_examination_date', 'basic_info', data.last_examination_date, true));

    // 意見書作成回数
    section.appendChild(createRadioField(
      '意見書作成回数',
      'opinion_count',
      'basic_info',
      [
        { label: '初回', value: '1' },
        { label: '2回目以上', value: '2' }
      ],
      data.opinion_count,
      true
    ));

    // 他科受診の有無
    section.appendChild(createRadioField(
      '他科受診の有無',
      'other_department_visit',
      'basic_info',
      [
        { label: '有', value: '1' },
        { label: '無', value: '2' }
      ],
      data.other_department_visit,
      true
    ));

    // 受診科（チェックボックス、13桁のビットフラグ）+ その他の科名入力（6文字）
    const departmentField = createCheckboxFieldWithOtherInput(
      '受診した場合はその受診科',
      'other_departments',
      'diagnosis',
      ['内科', '精神科', '外科', '整形外科', '脳神経外科', '皮膚科', '泌尿器科', '眼科', '耳鼻咽喉科', '歯科', 'リハビリ科', '放射線科', 'その他'],
      formData.diagnosis.other_departments,
      'other_department_names',
      formData.diagnosis.other_department_names,
      false,
      6
    );
    section.appendChild(departmentField);

    return section;
  }

  /**
   *セクション2: 傷病に関する意見
   */
  function createSection2(formData) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';

    const title = document.createElement('h3');
    title.textContent = '1. 傷病に関する意見';
    title.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; color: #1e40af;';
    section.appendChild(title);

    const data = formData.diagnosis;

    // 診断名1（必須、30文字）
    section.appendChild(createTextField('診断名1', 'diagnosis_1_name', 'diagnosis', data.diagnosis_1_name, true, '', 30));

    // 発症年月日1（必須、15文字）
    section.appendChild(createTextField('発症年月日1', 'diagnosis_1_onset', 'diagnosis', data.diagnosis_1_onset, true, '', 15));

    // 診断名2（任意、30文字）
    section.appendChild(createTextField('診断名2', 'diagnosis_2_name', 'diagnosis', data.diagnosis_2_name, false, '', 30));

    // 発症年月日2（任意、15文字）
    section.appendChild(createTextField('発症年月日2', 'diagnosis_2_onset', 'diagnosis', data.diagnosis_2_onset, false, '', 15));

    // 診断名3（任意、30文字）
    section.appendChild(createTextField('診断名3', 'diagnosis_3_name', 'diagnosis', data.diagnosis_3_name, false, '', 30));

    // 発症年月日3（任意、15文字）
    section.appendChild(createTextField('発症年月日3', 'diagnosis_3_onset', 'diagnosis', data.diagnosis_3_onset, false, '', 15));

    // 症状としての安定性（必須）
    const stabilityField = createRadioField(
      '症状としての安定性',
      'symptom_stability',
      'diagnosis',
      [
        { label: '安定', value: '1' },
        { label: '不安定', value: '2' },
        { label: '不明', value: '3' }
      ],
      data.symptom_stability,
      true
    );
    section.appendChild(stabilityField);

    // 症状不安定時の具体的状況（条件付き必須：症状安定性=不安定の場合、1行57文字）
    const unstableDetailsField = createTextField('症状不安定時の具体的状況', 'symptom_unstable_details', 'diagnosis', data.symptom_unstable_details, false, '', 57);
    unstableDetailsField.style.marginLeft = '24px';
    section.appendChild(unstableDetailsField);
    setupConditionalField(stabilityField, unstableDetailsField, '2');

    // 経過及び治療内容（1行57文字×5行）
    section.appendChild(createTextareaField('生活機能低下の直接の原因となっている傷病または特定疾病の経過及び投薬内容を含む治療内容', 'course_and_treatment', 'diagnosis', data.course_and_treatment, true, 57, 5));

    return section;
  }

  /**
   *セクション3: 特別な医療
   */
  function createSection3(formData) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';

    const title = document.createElement('h3');
    title.textContent = '2. 特別な医療（14日以内に受けた医療）';
    title.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; color: #1e40af;';
    section.appendChild(title);

    const data = formData.special_medical_care;

    // 処置内容（チェックボックス、9桁のビットフラグ）
    section.appendChild(createCheckboxField(
      '処置内容',
      'treatments',
      'special_medical_care',
      ['点滴の管理', '中心静脈栄養', '透析', 'ストーマの処置', '酸素療法', 'レスピレーター', '気管切開の処置', '疼痛の看護', '経管栄養'],
      data.treatments
    ));

    // 特別な対応（チェックボックス、2桁のビットフラグ）
    section.appendChild(createCheckboxField(
      '特別な対応',
      'special_responses',
      'special_medical_care',
      ['モニター測定（血圧、心拍、酸素飽和度等）', '褥瘡の処置'],
      data.special_responses
    ));

    // 失禁への対処（チェックボックス、1桁のビットフラグ）
    const incontinenceField = createCheckboxField(
      '失禁への対処',
      'incontinence_care',
      'special_medical_care',
      ['カテーテル（コンドームカテーテル、留置カテーテル 等）'],
      data.incontinence_care,
      false
    );
    // 長いテキストのため全幅を使う
    const incontinenceLabel = incontinenceField.querySelector('label');
    if (incontinenceLabel) {
      incontinenceLabel.style.gridColumn = '1 / -1';
    }
    section.appendChild(incontinenceField);

    return section;
  }

  /**
   *セクション4: 心身の状態
   */
  function createSection4(formData) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';

    const title = document.createElement('h3');
    title.textContent = '3. 心身の状態に関する意見';
    title.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; color: #1e40af;';
    section.appendChild(title);

    const data = formData.mental_physical_state;

    // (1) 日常生活の自立度について
    section.appendChild(createSubsectionTitle('(1) 日常生活の自立度について'));

    // 障害高齢者の日常生活自立度（寝たきり度）（必須）
    const bedriddenLevelHelp = `
      <table style="border-collapse: collapse; font-size: 11px; white-space: nowrap;">
        <tr style="background: #334155;">
          <th style="border: 1px solid #475569; padding: 4px 8px;">ランク</th>
          <th style="border: 1px solid #475569; padding: 4px 8px;">判定基準</th>
          <th style="border: 1px solid #475569; padding: 4px 8px;">1</th>
          <th style="border: 1px solid #475569; padding: 4px 8px;">2</th>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">J<br><span style="font-size: 10px; font-weight: normal;">生活自立</span></td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">何らかの障害等を有するが、日常生活は<br>ほぼ自立しており独力で外出する</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">交通機関等を利用して外出する</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">隣近所へなら外出する</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">A<br><span style="font-size: 10px; font-weight: normal;">準寝たきり</span></td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">屋内での生活はおおむね自立しているが、<br>介助なしには外出しない</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">介助により外出し、日中はほとんど<br>ベッドから離れて生活する</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">外出の頻度が少なく、日中も<br>寝たり起きたりの生活をしている</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">B<br><span style="font-size: 10px; font-weight: normal;">寝たきり</span></td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">屋内での生活は何らかの介助を要し、日中も<br>ベッド上での生活が主体であるが、座位を保つ</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">車いすに移乗し、食事、排泄は<br>ベッドから離れて行う</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">介助により車いすに移乗する</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">C<br><span style="font-size: 10px; font-weight: normal;">寝たきり</span></td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">1日中ベッド上で過ごし、排泄、食事、<br>着替において介助を要する</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">自力で寝返りをうつ</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">自力では寝返りもうてない</td>
        </tr>
      </table>
    `;
    section.appendChild(createRadioField(
      '障害高齢者の日常生活自立度（寝たきり度）',
      'bedridden_level',
      'mental_physical_state',
      [
        { label: '自立', value: '1' },
        { label: 'J1', value: '2' },
        { label: 'J2', value: '3' },
        { label: 'A1', value: '4' },
        { label: 'A2', value: '5' },
        { label: 'B1', value: '6' },
        { label: 'B2', value: '7' },
        { label: 'C1', value: '8' },
        { label: 'C2', value: '9' }
      ],
      data.bedridden_level,
      true,
      bedriddenLevelHelp
    ));

    // 認知症高齢者の日常生活自立度（必須）
    const dementiaLevelHelp = `
      <table style="border-collapse: collapse; font-size: 11px; white-space: nowrap;">
        <tr style="background: #334155;">
          <th style="border: 1px solid #475569; padding: 4px 8px;">ランク</th>
          <th style="border: 1px solid #475569; padding: 4px 8px;">判定基準</th>
          <th style="border: 1px solid #475569; padding: 4px 8px;">見られる症状・行動の例</th>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">Ⅰ</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">何らかの認知症を有するが、日常生活は<br>家庭内及び社会的にほぼ自立している</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">－</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">Ⅱa</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">家庭外で、日常生活に支障を来たすような症状・行動や<br>意思疎通の困難さが多少見られても、誰かが注意していれば自立できる</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">たびたび道に迷う、買物や事務、<br>金銭管理などにミスが目立つ等</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">Ⅱb</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">家庭内でも上記Ⅱの状態が見られる</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">服薬管理ができない、電話の応対や<br>訪問者との対応など一人で留守番ができない等</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">Ⅲa</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">日中を中心として、日常生活に支障を来たすような<br>症状・行動や意思疎通の困難さが見られ、介護を必要とする</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">着替え、食事、排便、排尿が上手にできない、<br>時間がかかる、徘徊、失禁、火の不始末等</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">Ⅲb</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">夜間を中心として、上記Ⅲの状態が見られる</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">ランクⅢaに同じ</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">Ⅳ</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">日常生活に支障を来たすような症状・行動や<br>意思疎通の困難さが頻繁に見られ、常に介護を必要とする</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">ランクⅢに同じ</td>
        </tr>
        <tr>
          <td style="border: 1px solid #475569; padding: 6px 10px; font-weight: bold;">M</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">著しい精神症状や問題行動あるいは重篤な<br>身体疾患が見られ、専門医療を必要とする</td>
          <td style="border: 1px solid #475569; padding: 6px 10px;">せん妄、妄想、興奮、自傷・他害等の<br>精神症状や精神症状に起因する問題行動</td>
        </tr>
      </table>
    `;
    section.appendChild(createRadioField(
      '認知症高齢者の日常生活自立度',
      'dementia_level',
      'mental_physical_state',
      [
        { label: '自立', value: '1' },
        { label: 'Ⅰ', value: '2' },
        { label: 'Ⅱa', value: '3' },
        { label: 'Ⅱb', value: '4' },
        { label: 'Ⅲa', value: '5' },
        { label: 'Ⅲb', value: '6' },
        { label: 'Ⅳ', value: '7' },
        { label: 'M', value: '8' }
      ],
      data.dementia_level,
      true,
      dementiaLevelHelp
    ));

    // (2) 認知症の中核症状（認知症以外の疾患で同様の症状を認める場合を含む）
    section.appendChild(createSubsectionTitle('(2) 認知症の中核症状（認知症以外の疾患で同様の症状を認める場合を含む）'));

    // 短期記憶（必須）
    section.appendChild(createRadioField(
      '短期記憶',
      'short_term_memory',
      'mental_physical_state',
      [
        { label: '問題なし', value: '1' },
        { label: '問題あり', value: '2' }
      ],
      data.short_term_memory,
      true
    ));

    // 日常の意思決定を行うための認知能力
    section.appendChild(createRadioField(
      '日常の意思決定を行うための認知能力',
      'cognitive_ability',
      'mental_physical_state',
      [
        { label: '自立', value: '1' },
        { label: 'いくらか困難', value: '2' },
        { label: '見守りが必要', value: '3' },
        { label: '判断できない', value: '4' }
      ],
      data.cognitive_ability,
      true
    ));

    // 自分の意思の伝達能力
    section.appendChild(createRadioField(
      '自分の意思の伝達能力',
      'communication_ability',
      'mental_physical_state',
      [
        { label: '伝えられる', value: '1' },
        { label: 'いくらか困難', value: '2' },
        { label: '具体的要求に限られる', value: '3' },
        { label: '伝えられない', value: '4' }
      ],
      data.communication_ability,
      true
    ));

    // (3) 認知症の行動・心理症状（BPSD）
    section.appendChild(createSubsectionTitle('(3) 認知症の行動・心理症状（BPSD）'));

    // 認知症の行動・心理症状（BPSD）の有無（必須）
    section.appendChild(createRadioField(
      '症状の有無',
      'peripheral_symptoms',
      'mental_physical_state',
      [
        { label: '有', value: '1' },
        { label: '無', value: '2' }
      ],
      data.peripheral_symptoms,
      true
    ));

    // 該当する項目をすべてチェック（チェックボックス、12桁）+ その他の症状入力（13文字）
    const bpsdField = createCheckboxFieldWithOtherInput(
      '該当する項目をすべてチェック',
      'peripheral_symptoms_details',
      'mental_physical_state',
      ['幻視･幻聴', '妄想', '昼夜逆転', '暴言', '暴行', '介護への抵抗', '徘徊', '火の不始末', '不潔行為', '異食行動', '性的問題行動', 'その他'],
      data.peripheral_symptoms_details,
      'other_peripheral_symptoms',
      data.other_peripheral_symptoms,
      false,
      13
    );
    section.appendChild(bpsdField);

    // (4) その他の精神・神経症状
    section.appendChild(createSubsectionTitle('(4) その他の精神・神経症状'));

    // 症状の有無（必須）
    const psychiatricSymptomsField = createRadioField(
      '症状の有無',
      'psychiatric_symptoms',
      'mental_physical_state',
      [
        { label: '有', value: '1' },
        { label: '無', value: '2' }
      ],
      data.psychiatric_symptoms,
      true
    );
    section.appendChild(psychiatricSymptomsField);

    // 症状名（任意、16文字）
    const psychiatricSymptomNameField = createTextField('症状名', 'psychiatric_symptom_name', 'mental_physical_state', data.psychiatric_symptom_name, false, '', 16);
    psychiatricSymptomNameField.style.marginLeft = '24px';
    section.appendChild(psychiatricSymptomNameField);
    setupConditionalField(psychiatricSymptomsField, psychiatricSymptomNameField, '1');

    // 専門医受診の有無（必須）
    const specialistVisitField = createRadioField(
      '専門医受診の有無',
      'specialist_visit',
      'mental_physical_state',
      [
        { label: '有', value: '1' },
        { label: '無', value: '2' }
      ],
      data.specialist_visit,
      true
    );
    section.appendChild(specialistVisitField);

    // 受診科名（任意、9文字）
    const specialistDepartmentField = createTextField('受診科名', 'specialist_department', 'mental_physical_state', data.specialist_department, false, '', 9);
    specialistDepartmentField.style.marginLeft = '24px';
    section.appendChild(specialistDepartmentField);
    setupConditionalField(specialistVisitField, specialistDepartmentField, '1');

    // (5) 身体の状態
    section.appendChild(createSubsectionTitle('(5) 身体の状態'));

    // 利き腕（必須）
    section.appendChild(createRadioField(
      '利き腕',
      'dominant_hand',
      'mental_physical_state',
      [
        { label: '右', value: '1' },
        { label: '左', value: '2' }
      ],
      data.dominant_hand,
      true
    ));

    // 身長（必須）
    section.appendChild(createTextField('身長', 'height', 'mental_physical_state', data.height, true, ''));

    // 体重（必須）
    section.appendChild(createTextField('体重', 'weight', 'mental_physical_state', data.weight, true, ''));

    // 過去6ヶ月の体重の変化（必須）
    section.appendChild(createRadioField(
      '過去6ヶ月の体重の変化',
      'weight_change',
      'mental_physical_state',
      [
        { label: '増加', value: '1' },
        { label: '維持', value: '2' },
        { label: '減少', value: '3' }
      ],
      data.weight_change,
      true
    ));

    // 四肢欠損
    const limbLossField = createRadioField(
      '四肢欠損',
      'limb_loss',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.limb_loss,
      false
    );
    section.appendChild(limbLossField);

    // 四肢欠損部位（条件付き必須、19文字）
    const limbLossLocationField = createTextField('部位', 'limb_loss_location', 'mental_physical_state', data.limb_loss_location, false, '', 19);
    limbLossLocationField.style.marginLeft = '24px';
    section.appendChild(limbLossLocationField);
    setupConditionalField(limbLossField, limbLossLocationField, '1');

    // 麻痺
    const paralysisField = createRadioField(
      '麻痺',
      'paralysis',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.paralysis,
      false
    );
    section.appendChild(paralysisField);

    // 麻痺の詳細（右上肢）
    const paralysisRightUpperLimbField = createRadioField(
      '右上肢',
      'paralysis_right_upper_limb',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.paralysis_right_upper_limb,
      false
    );
    paralysisRightUpperLimbField.style.marginLeft = '24px';
    section.appendChild(paralysisRightUpperLimbField);

    const paralysisRightUpperLimbSeverityField = createRadioField(
      '程度',
      'paralysis_right_upper_limb_severity',
      'mental_physical_state',
      [
        { label: '軽', value: '1' },
        { label: '中', value: '2' },
        { label: '重', value: '3' }
      ],
      data.paralysis_right_upper_limb_severity,
      false
    );
    paralysisRightUpperLimbSeverityField.style.marginLeft = '48px';
    section.appendChild(paralysisRightUpperLimbSeverityField);

    // 麻痺の詳細（左上肢）
    const paralysisLeftUpperLimbField = createRadioField(
      '左上肢',
      'paralysis_left_upper_limb',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.paralysis_left_upper_limb,
      false
    );
    paralysisLeftUpperLimbField.style.marginLeft = '24px';
    section.appendChild(paralysisLeftUpperLimbField);

    const paralysisLeftUpperLimbSeverityField = createRadioField(
      '程度',
      'paralysis_left_upper_limb_severity',
      'mental_physical_state',
      [
        { label: '軽', value: '1' },
        { label: '中', value: '2' },
        { label: '重', value: '3' }
      ],
      data.paralysis_left_upper_limb_severity,
      false
    );
    paralysisLeftUpperLimbSeverityField.style.marginLeft = '48px';
    section.appendChild(paralysisLeftUpperLimbSeverityField);

    // 麻痺の詳細（右下肢）
    const paralysisRightLowerLimbField = createRadioField(
      '右下肢',
      'paralysis_right_lower_limb',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.paralysis_right_lower_limb,
      false
    );
    paralysisRightLowerLimbField.style.marginLeft = '24px';
    section.appendChild(paralysisRightLowerLimbField);

    const paralysisRightLowerLimbSeverityField = createRadioField(
      '程度',
      'paralysis_right_lower_limb_severity',
      'mental_physical_state',
      [
        { label: '軽', value: '1' },
        { label: '中', value: '2' },
        { label: '重', value: '3' }
      ],
      data.paralysis_right_lower_limb_severity,
      false
    );
    paralysisRightLowerLimbSeverityField.style.marginLeft = '48px';
    section.appendChild(paralysisRightLowerLimbSeverityField);

    // 麻痺の詳細（左下肢）
    const paralysisLeftLowerLimbField = createRadioField(
      '左下肢',
      'paralysis_left_lower_limb',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.paralysis_left_lower_limb,
      false
    );
    paralysisLeftLowerLimbField.style.marginLeft = '24px';
    section.appendChild(paralysisLeftLowerLimbField);

    const paralysisLeftLowerLimbSeverityField = createRadioField(
      '程度',
      'paralysis_left_lower_limb_severity',
      'mental_physical_state',
      [
        { label: '軽', value: '1' },
        { label: '中', value: '2' },
        { label: '重', value: '3' }
      ],
      data.paralysis_left_lower_limb_severity,
      false
    );
    paralysisLeftLowerLimbSeverityField.style.marginLeft = '48px';
    section.appendChild(paralysisLeftLowerLimbSeverityField);

    // 麻痺の詳細（その他）
    const paralysisOtherField = createRadioField(
      'その他',
      'paralysis_other',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.paralysis_other,
      false
    );
    paralysisOtherField.style.marginLeft = '24px';
    section.appendChild(paralysisOtherField);

    const paralysisOtherLocationField = createTextField('麻痺 - その他部位', 'paralysis_other_location', 'mental_physical_state', data.paralysis_other_location, false, '', 16);
    paralysisOtherLocationField.style.marginLeft = '48px';
    section.appendChild(paralysisOtherLocationField);

    const paralysisOtherSeverityField = createRadioField(
      '程度',
      'paralysis_other_severity',
      'mental_physical_state',
      [
        { label: '軽', value: '1' },
        { label: '中', value: '2' },
        { label: '重', value: '3' }
      ],
      data.paralysis_other_severity,
      false
    );
    paralysisOtherSeverityField.style.marginLeft = '48px';
    section.appendChild(paralysisOtherSeverityField);

    // 麻痺の連動ロジック
    const paralysisRadios = paralysisField.querySelectorAll('input[type="radio"]');
    const paralysisRightUpperLimbRadios = paralysisRightUpperLimbField.querySelectorAll('input[type="radio"]');
    const paralysisLeftUpperLimbRadios = paralysisLeftUpperLimbField.querySelectorAll('input[type="radio"]');
    const paralysisRightLowerLimbRadios = paralysisRightLowerLimbField.querySelectorAll('input[type="radio"]');
    const paralysisLeftLowerLimbRadios = paralysisLeftLowerLimbField.querySelectorAll('input[type="radio"]');
    const paralysisOtherRadios = paralysisOtherField.querySelectorAll('input[type="radio"]');

    // 各部位のフィールドを配列で管理
    const paralysisChildFields = [
      paralysisRightUpperLimbField,
      paralysisRightUpperLimbSeverityField,
      paralysisLeftUpperLimbField,
      paralysisLeftUpperLimbSeverityField,
      paralysisRightLowerLimbField,
      paralysisRightLowerLimbSeverityField,
      paralysisLeftLowerLimbField,
      paralysisLeftLowerLimbSeverityField,
      paralysisOtherField,
      paralysisOtherLocationField,
      paralysisOtherSeverityField
    ];

    // フィールドを無効化/有効化する関数
    const disableField = (field) => {
      const inputs = field.querySelectorAll('input');
      inputs.forEach(input => {
        input.disabled = true;
        input.style.cursor = 'not-allowed';
      });
      field.style.opacity = '0.5';
    };

    const enableField = (field) => {
      const inputs = field.querySelectorAll('input');
      inputs.forEach(input => {
        input.disabled = false;
        input.style.cursor = '';
      });
      field.style.opacity = '';
    };

    // 麻痺全体の状態更新
    const updateParalysisState = () => {
      const hasParalysis = Array.from(paralysisRadios).find(r => r.checked)?.value === '1';

      if (!hasParalysis) {
        // 麻痺が「なし」の場合、すべての子を無効化
        paralysisChildFields.forEach(disableField);
      } else {
        // 麻痺が「あり」の場合、各部位を有効化し、個別の連動を更新
        enableField(paralysisRightUpperLimbField);
        enableField(paralysisLeftUpperLimbField);
        enableField(paralysisRightLowerLimbField);
        enableField(paralysisLeftLowerLimbField);
        enableField(paralysisOtherField);
        updateRightUpperLimbSeverityState();
        updateLeftUpperLimbSeverityState();
        updateRightLowerLimbSeverityState();
        updateLeftLowerLimbSeverityState();
        updateOtherLocationAndSeverityState();
      }
    };

    // 右上肢の程度の状態更新
    const updateRightUpperLimbSeverityState = () => {
      const hasParalysis = Array.from(paralysisRadios).find(r => r.checked)?.value === '1';
      const hasRightUpperLimb = Array.from(paralysisRightUpperLimbRadios).find(r => r.checked)?.value === '1';

      if (hasParalysis && hasRightUpperLimb) {
        enableField(paralysisRightUpperLimbSeverityField);
      } else {
        disableField(paralysisRightUpperLimbSeverityField);
      }
    };

    // 左上肢の程度の状態更新
    const updateLeftUpperLimbSeverityState = () => {
      const hasParalysis = Array.from(paralysisRadios).find(r => r.checked)?.value === '1';
      const hasLeftUpperLimb = Array.from(paralysisLeftUpperLimbRadios).find(r => r.checked)?.value === '1';

      if (hasParalysis && hasLeftUpperLimb) {
        enableField(paralysisLeftUpperLimbSeverityField);
      } else {
        disableField(paralysisLeftUpperLimbSeverityField);
      }
    };

    // 右下肢の程度の状態更新
    const updateRightLowerLimbSeverityState = () => {
      const hasParalysis = Array.from(paralysisRadios).find(r => r.checked)?.value === '1';
      const hasRightLowerLimb = Array.from(paralysisRightLowerLimbRadios).find(r => r.checked)?.value === '1';

      if (hasParalysis && hasRightLowerLimb) {
        enableField(paralysisRightLowerLimbSeverityField);
      } else {
        disableField(paralysisRightLowerLimbSeverityField);
      }
    };

    // 左下肢の程度の状態更新
    const updateLeftLowerLimbSeverityState = () => {
      const hasParalysis = Array.from(paralysisRadios).find(r => r.checked)?.value === '1';
      const hasLeftLowerLimb = Array.from(paralysisLeftLowerLimbRadios).find(r => r.checked)?.value === '1';

      if (hasParalysis && hasLeftLowerLimb) {
        enableField(paralysisLeftLowerLimbSeverityField);
      } else {
        disableField(paralysisLeftLowerLimbSeverityField);
      }
    };

    // その他の部位と程度の状態更新
    const updateOtherLocationAndSeverityState = () => {
      const hasParalysis = Array.from(paralysisRadios).find(r => r.checked)?.value === '1';
      const hasOther = Array.from(paralysisOtherRadios).find(r => r.checked)?.value === '1';

      if (hasParalysis && hasOther) {
        enableField(paralysisOtherLocationField);
        enableField(paralysisOtherSeverityField);
      } else {
        disableField(paralysisOtherLocationField);
        disableField(paralysisOtherSeverityField);
      }
    };

    // イベントリスナーを追加
    paralysisRadios.forEach(radio => {
      radio.addEventListener('change', updateParalysisState);
    });
    paralysisRightUpperLimbRadios.forEach(radio => {
      radio.addEventListener('change', updateRightUpperLimbSeverityState);
    });
    paralysisLeftUpperLimbRadios.forEach(radio => {
      radio.addEventListener('change', updateLeftUpperLimbSeverityState);
    });
    paralysisRightLowerLimbRadios.forEach(radio => {
      radio.addEventListener('change', updateRightLowerLimbSeverityState);
    });
    paralysisLeftLowerLimbRadios.forEach(radio => {
      radio.addEventListener('change', updateLeftLowerLimbSeverityState);
    });
    paralysisOtherRadios.forEach(radio => {
      radio.addEventListener('change', updateOtherLocationAndSeverityState);
    });

    // 初期状態を設定
    updateParalysisState();

    // 筋力低下
    createBodyConditionFields('筋力低下', 'muscle_weakness', 'mental_physical_state', data).forEach(field => {
      section.appendChild(field);
    });

    // 関節拘縮
    createBodyConditionFields('関節拘縮', 'joint_contracture', 'mental_physical_state', data).forEach(field => {
      section.appendChild(field);
    });

    // 関節痛み
    createBodyConditionFields('関節痛み', 'joint_pain', 'mental_physical_state', data).forEach(field => {
      section.appendChild(field);
    });

    // 失調不随意運動
    const ataxiaField = createRadioField(
      '失調不随意運動',
      'ataxia_involuntary_movement',
      'mental_physical_state',
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data.ataxia_involuntary_movement,
      false
    );
    section.appendChild(ataxiaField);

    const ataxiaUpperLimbsField = createCheckboxField(
      '上肢',
      'ataxia_upper_limbs',
      'mental_physical_state',
      ['右', '左'],
      data.ataxia_upper_limbs
    );
    ataxiaUpperLimbsField.style.marginLeft = '24px';
    section.appendChild(ataxiaUpperLimbsField);

    const ataxiaLowerLimbsField = createCheckboxField(
      '下肢',
      'ataxia_lower_limbs',
      'mental_physical_state',
      ['右', '左'],
      data.ataxia_lower_limbs
    );
    ataxiaLowerLimbsField.style.marginLeft = '24px';
    section.appendChild(ataxiaLowerLimbsField);

    const ataxiaTrunkField = createCheckboxField(
      '体幹',
      'trunk',
      'mental_physical_state',
      ['右', '左'],
      data.trunk
    );
    ataxiaTrunkField.style.marginLeft = '24px';
    section.appendChild(ataxiaTrunkField);

    // 失調不随意運動の連動ロジック
    const ataxiaRadios = ataxiaField.querySelectorAll('input[type="radio"]');

    const updateAtaxiaDetailsState = () => {
      const hasAtaxia = Array.from(ataxiaRadios).find(r => r.checked)?.value === '1';

      if (hasAtaxia) {
        enableField(ataxiaUpperLimbsField);
        enableField(ataxiaLowerLimbsField);
        enableField(ataxiaTrunkField);
      } else {
        disableField(ataxiaUpperLimbsField);
        disableField(ataxiaLowerLimbsField);
        disableField(ataxiaTrunkField);
      }
    };

    ataxiaRadios.forEach(radio => {
      radio.addEventListener('change', updateAtaxiaDetailsState);
    });

    updateAtaxiaDetailsState(); // 初期状態を設定

    // 褥瘡
    createBodyConditionFields('褥瘡', 'pressure_ulcer', 'mental_physical_state', data).forEach(field => {
      section.appendChild(field);
    });

    // その他皮膚疾患
    createBodyConditionFields('その他皮膚疾患', 'other_skin_disease', 'mental_physical_state', data).forEach(field => {
      section.appendChild(field);
    });

    return section;
  }

  /**
   *セクション5: 生活機能とサービス
   */
  function createSection5(formData) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';

    const title = document.createElement('h3');
    title.textContent = '4. 生活機能とサービスに関する意見';
    title.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; color: #1e40af;';
    section.appendChild(title);

    const data = formData.life_function;

    // (1) 移動
    section.appendChild(createSubsectionTitle('(1) 移動'));

    // 屋外歩行（必須）
    section.appendChild(createRadioField(
      '屋外歩行',
      'outdoor_walking',
      'life_function',
      [
        { label: '自立', value: '1' },
        { label: '介助があればしている', value: '2' },
        { label: 'していない', value: '3' }
      ],
      data.outdoor_walking,
      true
    ));

    // 車いすの使用（必須）
    section.appendChild(createRadioField(
      '車いすの使用',
      'wheelchair_use',
      'life_function',
      [
        { label: '用いていない', value: '1' },
        { label: '主に自分で操作', value: '2' },
        { label: '主に他人が操作', value: '3' }
      ],
      data.wheelchair_use,
      true
    ));

    // 歩行補助具・装具の使用（チェックボックス、3桁）
    section.appendChild(createCheckboxField(
      '歩行補助具・装具の使用（複数選択可）',
      'walking_aids',
      'life_function',
      ['杖', '歩行器・歩行車', '装具'],
      data.walking_aids
    ));

    // (2) 栄養・食生活
    section.appendChild(createSubsectionTitle('(2) 栄養・食生活'));

    // 食事行為（必須）
    section.appendChild(createRadioField(
      '食事行為',
      'eating_behavior',
      'life_function',
      [
        { label: '自立ないし何とか自分で食べられる', value: '1' },
        { label: '全面介助', value: '2' }
      ],
      data.eating_behavior,
      true
    ));

    // 現在の栄養状態（必須）
    section.appendChild(createRadioField(
      '現在の栄養状態',
      'current_nutrition_status',
      'life_function',
      [
        { label: '良好', value: '1' },
        { label: '不良', value: '2' }
      ],
      data.current_nutrition_status,
      true
    ));

    // 栄養・食生活上の留意点（任意、40文字）
    section.appendChild(createTextField('栄養・食生活上の留意点', 'nutrition_diet_notes', 'life_function', data.nutrition_diet_notes, false, '', 40));

    // (3) 現在あるかまたは今後発生の可能性の高い状態
    section.appendChild(createSubsectionTitle('(3) 現在あるかまたは今後発生の可能性の高い状態'));

    // 発生可能性状態（13項目+その他、プレースホルダー出力時に1と2に分割）+ その他（9文字）
    section.appendChild(createCheckboxFieldWithOtherInput(
      '',
      'possible_conditions',
      'life_function',
      ['尿失禁', '転倒・骨折', '移動能力の低下', '褥瘡', '心肺機能の低下', '閉じこもり', '意欲低下', '徘徊', '低栄養', '摂食・嚥下機能低下', '脱水', '易感染性', 'がん等による疼痛', 'その他'],
      data.possible_conditions,
      'other_condition_name',
      data.other_condition_name,
      false,
      9
    ));

    // 対処方針内容（任意）
    section.appendChild(createTextField('対処方針内容', 'response_policy', 'life_function', data.response_policy, false, '', 14));

    // (4) サービス利用による生活機能の維持・改善の見通し
    section.appendChild(createSubsectionTitle('(4) サービス利用による生活機能の維持・改善の見通し', true));

    // 生活機能改善見通し（必須）
    section.appendChild(createRadioField(
      '',
      'life_function_improvement_outlook',
      'life_function',
      [
        { label: '期待できる', value: '1' },
        { label: '期待できない', value: '2' },
        { label: '不明', value: '3' }
      ],
      data.life_function_improvement_outlook,
      false
    ));

    // (5) 医学的管理の必要性
    section.appendChild(createSubsectionTitle('(5) 医学的管理の必要性'));

    // 医学的管理の必要性（チェックボックス、11桁、その他24文字）
    const medicalManagementField = createCheckboxFieldWithOtherInput(
      '',
      'medical_management_necessity',
      'life_function',
      ['訪問診療', '訪問看護', '看護職員の訪問による相談・支援', '訪問歯科診療', '訪問薬剤管理指導', '訪問リハビリテーション', '短期入所療養介護', '訪問歯科衛生指導', '訪問栄養食事指導', '通所リハビリテーション', 'その他の医療系サービス'],
      data.medical_management_necessity,
      'other_medical_management',
      data.other_medical_management,
      false,
      24
    );
    // その他の記述欄を広げる＋カウンターを次の行に
    const otherInput = medicalManagementField.querySelector('input[data-field-name="other_medical_management"]');
    if (otherInput) {
      otherInput.style.minWidth = '350px';
      const optionLabel = otherInput.parentElement;
      if (optionLabel) {
        optionLabel.style.flexWrap = 'wrap';
      }
    }
    section.appendChild(medicalManagementField);

    // (6) サービス提供時における医学的観点からの留意事項
    section.appendChild(createSubsectionTitle('(6) サービス提供時における医学的観点からの留意事項'));

    // サービス提供時の血圧
    const serviceBloodPressureField = createInlineRadioField(
      '血圧',
      'service_blood_pressure',
      'life_function',
      [
        { label: '特になし', value: '1' },
        { label: 'あり', value: '2' }
      ],
      data.service_blood_pressure
    );
    section.appendChild(serviceBloodPressureField);

    const serviceBloodPressureNotesField = createTextField('留意事項', 'service_blood_pressure_notes', 'life_function', data.service_blood_pressure_notes, false, '', 14);
    serviceBloodPressureNotesField.style.marginLeft = '24px';
    section.appendChild(serviceBloodPressureNotesField);
    setupConditionalField(serviceBloodPressureField, serviceBloodPressureNotesField, '2');

    // サービス提供時の摂食
    const serviceEatingField = createInlineRadioField(
      '摂食',
      'service_eating',
      'life_function',
      [
        { label: '特になし', value: '1' },
        { label: 'あり', value: '2' }
      ],
      data.service_eating
    );
    section.appendChild(serviceEatingField);

    const serviceEatingNotesField = createTextField('留意事項', 'service_eating_notes', 'life_function', data.service_eating_notes, false, '', 14);
    serviceEatingNotesField.style.marginLeft = '24px';
    section.appendChild(serviceEatingNotesField);
    setupConditionalField(serviceEatingField, serviceEatingNotesField, '2');

    // サービス提供時の嚥下
    const serviceSwallowingField = createInlineRadioField(
      '嚥下',
      'service_swallowing',
      'life_function',
      [
        { label: '特になし', value: '1' },
        { label: 'あり', value: '2' }
      ],
      data.service_swallowing
    );
    section.appendChild(serviceSwallowingField);

    const serviceSwallowingNotesField = createTextField('留意事項', 'service_swallowing_notes', 'life_function', data.service_swallowing_notes, false, '', 14);
    serviceSwallowingNotesField.style.marginLeft = '24px';
    section.appendChild(serviceSwallowingNotesField);
    setupConditionalField(serviceSwallowingField, serviceSwallowingNotesField, '2');

    // サービス提供時の移動
    const serviceMobilityField = createInlineRadioField(
      '移動',
      'service_mobility',
      'life_function',
      [
        { label: '特になし', value: '1' },
        { label: 'あり', value: '2' }
      ],
      data.service_mobility
    );
    section.appendChild(serviceMobilityField);

    const serviceMobilityNotesField = createTextField('留意事項', 'service_mobility_notes', 'life_function', data.service_mobility_notes, false, '', 14);
    serviceMobilityNotesField.style.marginLeft = '24px';
    section.appendChild(serviceMobilityNotesField);
    setupConditionalField(serviceMobilityField, serviceMobilityNotesField, '2');

    // サービス提供時の運動
    const serviceExerciseField = createInlineRadioField(
      '運動',
      'service_exercise',
      'life_function',
      [
        { label: '特になし', value: '1' },
        { label: 'あり', value: '2' }
      ],
      data.service_exercise
    );
    section.appendChild(serviceExerciseField);

    const serviceExerciseNotesField = createTextField('留意事項', 'service_exercise_notes', 'life_function', data.service_exercise_notes, false, '', 14);
    serviceExerciseNotesField.style.marginLeft = '24px';
    section.appendChild(serviceExerciseNotesField);
    setupConditionalField(serviceExerciseField, serviceExerciseNotesField, '2');

    // その他の留意事項
    section.appendChild(createTextField('その他の留意事項', 'service_other_notes', 'life_function', data.service_other_notes, false, '', 17));

  // (7) 感染症
  section.appendChild(createSubsectionTitle('(7) 感染症'));

  // 感染症有無（必須）
  const infectionField = createRadioField(
    '感染症有無',
    'infection',
    'life_function',
    [
      { label: '有', value: '1' },
      { label: '無', value: '2' },
      { label: '不明', value: '3' }
    ],
    data.infection,
    true
  );
  section.appendChild(infectionField);

  // 感染症名（条件付き必須、38文字）
  const infectionNameField = createTextField('感染症名', 'infection_name', 'life_function', data.infection_name, false, '', 38);
  infectionNameField.style.marginLeft = '24px';
  section.appendChild(infectionNameField);
  setupConditionalField(infectionField, infectionNameField, '1');

  return section;
}

  /**
   *セクション6: 特記事項
   */
  function createSection6(formData) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';

    const title = document.createElement('h3');
    title.textContent = '5. 特記すべき事項';
    title.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; color: #1e40af;';
    section.appendChild(title);

    const data = formData.special_notes;

    // 特記すべき事項（任意、1行57文字×8行）
    section.appendChild(createTextareaField('特記すべき事項', 'other_notes', 'special_notes', data.other_notes, false, 57, 8));

    return section;
  }

  /**
   *サブセクションタイトル
   */
  function createSubsectionTitle(text, required = false) {
    const title = document.createElement('h4');
    title.innerHTML = `${text}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    title.style.cssText = 'margin: 20px 0 12px 0; font-size: 15px; font-weight: 600; color: #475569; padding-left: 8px; border-left: 3px solid #3b82f6;';
    return title;
  }

  /**
   *インラインラジオボタンフィールド（ラベルとラジオボタンが横並び）
   */
  function createInlineRadioField(label, name, section, options, currentValue) {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px; display: flex; align-items: center; gap: 16px;';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; min-width: 40px;';
    field.appendChild(labelEl);

    options.forEach(option => {
      const optionLabel = document.createElement('label');
      optionLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer;';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `radio_${name}`;
      radio.value = option.value;
      radio.checked = currentValue === option.value;
      radio.dataset.fieldName = name;
      radio.dataset.section = section;

      const optionText = document.createElement('span');
      optionText.textContent = option.label;
      optionText.style.cssText = 'font-size: 14px; color: #475569;';

      optionLabel.appendChild(radio);
      optionLabel.appendChild(optionText);
      field.appendChild(optionLabel);
    });

    return field;
  }

  /**
   *条件付きフィールドの連動設定（汎用ヘルパー）
   * ラジオボタンの選択に応じてテキストフィールドを有効化/無効化する
   */
  function setupConditionalField(radioField, textField, enableValue) {
    const radios = radioField.querySelectorAll('input[type="radio"]');
    const input = textField.querySelector('input[type="text"]');

    const updateState = () => {
      const isEnabled = Array.from(radios).find(r => r.checked)?.value === enableValue;
      input.disabled = !isEnabled;
      if (input.disabled) {
        input.style.backgroundColor = '#f1f5f9';
        input.style.color = '#94a3b8';
      } else {
        input.style.backgroundColor = '';
        input.style.color = '';
      }
    };

    radios.forEach(radio => {
      radio.addEventListener('change', updateState);
    });

    updateState(); // 初期状態を設定
  }

  /**
   * 身体状態フィールドセット生成（汎用ヘルパー）
   * 「あり/なし」→「部位」→「程度」の3段階フィールドを生成
   */
  function createBodyConditionFields(label, namePrefix, section, data) {
    const fields = [];

    // 親フィールド（あり/なし）
    const mainField = createRadioField(
      label,
      namePrefix,
      section,
      [
        { label: 'なし', value: '0' },
        { label: 'あり', value: '1' }
      ],
      data[namePrefix],
      false
    );
    fields.push(mainField);

    // 部位フィールド（19文字）
    const locationField = createTextField('部位', `${namePrefix}_location`, section, data[`${namePrefix}_location`], false, '', 19);
    locationField.style.marginLeft = '24px';
    fields.push(locationField);

    // 程度フィールド
    const severityField = createRadioField(
      '程度',
      `${namePrefix}_severity`,
      section,
      [
        { label: '軽', value: '1' },
        { label: '中', value: '2' },
        { label: '重', value: '3' }
      ],
      data[`${namePrefix}_severity`],
      false
    );
    severityField.style.marginLeft = '24px';
    fields.push(severityField);

    // 連動ロジック設定
    const radios = mainField.querySelectorAll('input[type="radio"]');
    const updateDetailsState = () => {
      const hasCondition = Array.from(radios).find(r => r.checked)?.value === '1';
      [locationField, severityField].forEach(field => {
        const inputs = field.querySelectorAll('input');
        inputs.forEach(input => {
          input.disabled = !hasCondition;
          input.style.cursor = hasCondition ? '' : 'not-allowed';
        });
        field.style.opacity = hasCondition ? '' : '0.5';
      });
    };

    radios.forEach(radio => {
      radio.addEventListener('change', updateDetailsState);
    });

    updateDetailsState(); // 初期状態を設定

    return fields;
  }

  /**
   * ラジオボタンフィールド
   */
  function createRadioField(label, name, section, options, currentValue, required = false, helpContent = null) {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;';

    const labelText = document.createElement('span');
    labelText.innerHTML = `${label}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    labelEl.appendChild(labelText);

    // ヘルプアイコン（?）とツールチップ
    if (helpContent) {
      const helpWrapper = document.createElement('span');
      helpWrapper.style.cssText = 'position: relative; display: inline-flex;';

      const helpIcon = document.createElement('span');
      helpIcon.textContent = '?';
      helpIcon.style.cssText = `
        display: inline-flex; align-items: center; justify-content: center;
        width: 16px; height: 16px; border-radius: 50%;
        background: #94a3b8; color: white; font-size: 11px; font-weight: bold;
        cursor: help; user-select: none;
      `;

      const tooltip = document.createElement('div');
      tooltip.innerHTML = helpContent;
      tooltip.style.cssText = `
        position: fixed;
        background: #1e293b; color: white; padding: 12px 16px;
        border-radius: 8px; font-size: 11px; font-weight: normal;
        z-index: 1400;
        opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        line-height: 1.5;
      `;

      helpWrapper.appendChild(helpIcon);
      helpWrapper.appendChild(tooltip);
      labelEl.appendChild(helpWrapper);

      helpWrapper.addEventListener('mouseenter', () => {
        // モーダルコンテンツ領域を探す
        const modalContent = helpWrapper.closest('[style*="overflow-y"]') || helpWrapper.closest('[style*="max-height"]');
        const iconRect = helpIcon.getBoundingClientRect();

        if (modalContent) {
          const contentRect = modalContent.getBoundingClientRect();
          tooltip.style.left = `${contentRect.left}px`;
          tooltip.style.maxWidth = `${contentRect.width}px`;
        } else {
          // フォールバック: アイコンの左端から、右端は画面端-24pxまで
          tooltip.style.left = '24px';
          tooltip.style.maxWidth = `${window.innerWidth - 48}px`;
        }
        tooltip.style.top = `${iconRect.bottom + 8}px`;
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
      });
      helpWrapper.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
      });
    }

    field.appendChild(labelEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';

    options.forEach(option => {
      const optionLabel = document.createElement('label');
      optionLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 0 0 auto;';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `radio_${name}`;
      radio.value = option.value;
      radio.checked = currentValue === option.value;
      radio.dataset.fieldName = name;
      radio.dataset.section = section;

      const optionText = document.createElement('span');
      optionText.textContent = option.label;
      optionText.style.cssText = 'font-size: 14px; color: #475569;';

      optionLabel.appendChild(radio);
      optionLabel.appendChild(optionText);
      optionsContainer.appendChild(optionLabel);
    });

    field.appendChild(optionsContainer);
    return field;
  }

  /**
   * 日付フィールド（カレンダー）
   */
  function createDateField(label, name, section, currentValue, required = false) {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('div');
    labelEl.innerHTML = `${label}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 8px;';
    field.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'date';
    input.value = currentValue ? formatDate(currentValue) : '';
    input.dataset.fieldName = name;
    input.dataset.section = section;
    input.style.cssText = 'padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; width: 100%;';

    const warekiDisplay = document.createElement('div');
    warekiDisplay.style.cssText = 'margin-top: 4px; font-size: 13px; color: #64748b;';
    warekiDisplay.textContent = input.value ? `（${toWareki(input.value)}）` : '';

    input.addEventListener('change', (e) => {
      warekiDisplay.textContent = e.target.value ? `（${toWareki(e.target.value)}）` : '';
    });

    field.appendChild(input);
    field.appendChild(warekiDisplay);
    return field;
  }

  /**
   * テキストフィールド（単一行）
   */
  function createTextField(label, name, section, currentValue, required = false, placeholder = '', maxChars = 0) {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('div');
    labelEl.innerHTML = `${label}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 8px;';
    field.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue || '';
    input.placeholder = placeholder;
    input.dataset.fieldName = name;
    input.dataset.section = section;
    input.style.cssText = 'padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; width: 100%;';

    if (maxChars > 0) {
      input.maxLength = maxChars;
    }

    field.appendChild(input);

    if (maxChars > 0) {
      const charCounter = document.createElement('div');
      charCounter.style.cssText = 'margin-top: 4px; font-size: 13px; color: #64748b; text-align: right;';

      const updateCounter = () => {
        const currentLength = input.value.length;
        charCounter.textContent = `${currentLength} / ${maxChars}文字`;
        if (currentLength > maxChars) {
          charCounter.style.color = '#ef4444';
        } else {
          charCounter.style.color = '#64748b';
        }
      };

      input.addEventListener('input', updateCounter);
      updateCounter();
      field.appendChild(charCounter);
    }

    return field;
  }

  /**
   * テキストエリア（複数行）
   * @param {number} charsPerLine - 1行あたりの文字数（0で無制限）
   * @param {number} maxLines - 最大行数（0で無制限）
   */
  function createTextareaField(label, name, section, currentValue, required = false, charsPerLine = 0, maxLines = 0) {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('div');
    labelEl.innerHTML = `${label}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 8px;';
    field.appendChild(labelEl);

    const textarea = document.createElement('textarea');
    textarea.value = currentValue || '';
    textarea.dataset.fieldName = name;
    textarea.dataset.section = section;
    textarea.style.cssText = 'padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; width: 100%; resize: vertical; font-family: inherit;';
    if (maxLines > 0) {
      textarea.rows = maxLines;
    }

    const charCounter = document.createElement('div');
    charCounter.style.cssText = 'margin-top: 4px; font-size: 13px; color: #64748b; text-align: right;';

    // 論理行数を計算（手動改行 + 自動折り返し）
    const countLogicalLines = (text) => {
      if (!text || charsPerLine <= 0) return 0;
      const lines = text.split('\n');
      let totalLines = 0;
      for (const line of lines) {
        // 各行が何論理行になるか（空行も1行としてカウント）
        totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
      return totalLines;
    };

    let lastValidValue = textarea.value;

    const updateCounter = () => {
      if (charsPerLine > 0 && maxLines > 0) {
        const lineCount = countLogicalLines(textarea.value);
        charCounter.textContent = `${lineCount} / ${maxLines}行（1行${charsPerLine}文字）`;
        if (lineCount > maxLines) {
          charCounter.style.color = '#ef4444';
        } else {
          charCounter.style.color = '#64748b';
        }
      } else {
        charCounter.textContent = `${textarea.value.length}文字`;
      }
    };

    textarea.addEventListener('input', () => {
      if (charsPerLine > 0 && maxLines > 0) {
        const lineCount = countLogicalLines(textarea.value);
        if (lineCount > maxLines) {
          // 超過時は直前の値に戻す
          textarea.value = lastValidValue;
        } else {
          lastValidValue = textarea.value;
        }
      }
      updateCounter();
    });
    updateCounter();

    field.appendChild(textarea);
    field.appendChild(charCounter);
    return field;
  }

  /**
   *チェックボックスフィールド（ビットフラグ）
   */
  function createCheckboxField(label, name, section, options, currentValue, required = false) {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('div');
    labelEl.innerHTML = `${label}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 8px;';
    field.appendChild(labelEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px 24px;';

    // ビットフラグを配列に変換（左から順）
    const bitArray = (currentValue || '').split('');

    options.forEach((option, index) => {
      const optionLabel = document.createElement('label');
      optionLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 0 0 auto;';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = bitArray[index] === '1';
      checkbox.dataset.fieldName = name;
      checkbox.dataset.section = section;
      checkbox.dataset.bitIndex = index;

      const optionText = document.createElement('span');
      optionText.textContent = option;
      optionText.style.cssText = 'font-size: 14px; color: #475569;';

      optionLabel.appendChild(checkbox);
      optionLabel.appendChild(optionText);
      optionsContainer.appendChild(optionLabel);
    });

    field.appendChild(optionsContainer);
    return field;
  }

  /**
   *チェックボックスフィールド + 「その他」入力（ビットフラグ）
   * 最後のオプション（「その他」）の右側にテキスト入力を追加し、
   * 「その他」が選択されていない場合はグレーアウトする
   */
  function createCheckboxFieldWithOtherInput(label, name, section, options, currentValue, otherFieldName, otherFieldValue, required = false, otherMaxChars = 0, otherPlaceholder = '') {
    const field = document.createElement('div');
    field.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('div');
    labelEl.innerHTML = `${label}${required ? ' <span style="color: #ef4444;">*</span>' : ''}`;
    labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: #1e293b; margin-bottom: 8px;';
    field.appendChild(labelEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px 24px;';

    // ビットフラグを配列に変換（左から順）
    const bitArray = (currentValue || '').split('');

    let otherCheckbox = null;
    let otherInput = null;

    options.forEach((option, index) => {
      const optionLabel = document.createElement('label');
      optionLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 0 0 auto;';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = bitArray[index] === '1';
      checkbox.dataset.fieldName = name;
      checkbox.dataset.section = section;
      checkbox.dataset.bitIndex = index;

      const optionText = document.createElement('span');
      optionText.textContent = option;
      optionText.style.cssText = 'font-size: 14px; color: #475569;';

      optionLabel.appendChild(checkbox);
      optionLabel.appendChild(optionText);

      // 最後のオプション（「その他」）の場合、インラインでテキスト入力を追加
      if (index === options.length - 1) {
        // 「その他」の行を全幅にして、Flexboxで横並び
        optionLabel.style.cssText = 'display: flex; align-items: center; gap: 8px; grid-column: 1 / -1; cursor: pointer;';

        otherCheckbox = checkbox;

        otherInput = document.createElement('input');
        otherInput.type = 'text';
        otherInput.value = otherFieldValue || '';
        otherInput.placeholder = otherPlaceholder;
        otherInput.dataset.fieldName = otherFieldName;
        otherInput.dataset.section = section;
        otherInput.style.cssText = 'padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; flex: 1;';
        otherInput.disabled = !otherCheckbox.checked;
        if (otherInput.disabled) {
          otherInput.style.backgroundColor = '#f1f5f9';
          otherInput.style.color = '#94a3b8';
        }
        if (otherMaxChars > 0) {
          otherInput.maxLength = otherMaxChars;
        }

        optionLabel.appendChild(otherInput);

        // 文字数カウンター（otherMaxChars > 0 の場合）
        if (otherMaxChars > 0) {
          const charCounter = document.createElement('span');
          charCounter.style.cssText = 'font-size: 12px; color: #64748b; white-space: nowrap;';
          const updateCounter = () => {
            const currentLength = otherInput.value.length;
            charCounter.textContent = `${currentLength}/${otherMaxChars}文字`;
            charCounter.style.color = currentLength > otherMaxChars ? '#ef4444' : '#64748b';
          };
          otherInput.addEventListener('input', updateCounter);
          updateCounter();
          optionLabel.appendChild(charCounter);
        }

        // チェックボックスの状態に応じてテキスト入力を有効/無効化
        otherCheckbox.addEventListener('change', () => {
          otherInput.disabled = !otherCheckbox.checked;
          if (otherInput.disabled) {
            otherInput.style.backgroundColor = '#f1f5f9';
            otherInput.style.color = '#94a3b8';
          } else {
            otherInput.style.backgroundColor = '';
            otherInput.style.color = '';
            otherInput.focus();
          }
        });
      }

      optionsContainer.appendChild(optionLabel);
    });

    field.appendChild(optionsContainer);
    return field;
  }

  /**
   * フォームデータをクリア
   */
  function clearFormData(container) {
    // テキスト入力をクリア
    container.querySelectorAll('input[type="text"], textarea').forEach(input => {
      input.value = '';
    });

    // 日付入力をクリア
    container.querySelectorAll('input[type="date"]').forEach(input => {
      input.value = '';
    });

    // ラジオボタンをクリア
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.checked = false;
    });

    // チェックボックスをクリア
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  }

  /**
   * フォームからデータを収集
   */
  function collectFormData(container) {
    const formData = {
      basic_info: {},
      diagnosis: {},
      special_medical_care: {},
      mental_physical_state: {},
      life_function: {},
      special_notes: {}
    };

    // ラジオボタン
    container.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
      const section = radio.dataset.section;
      const fieldName = radio.dataset.fieldName;
      if (section && fieldName) {
        formData[section][fieldName] = radio.value;
      }
    });

    // 日付
    container.querySelectorAll('input[type="date"]').forEach(input => {
      const section = input.dataset.section;
      const fieldName = input.dataset.fieldName;
      if (section && fieldName && input.value) {
        formData[section][fieldName] = input.value.replace(/-/g, '');
      }
    });

    // テキスト入力
    container.querySelectorAll('input[type="text"], textarea').forEach(input => {
      const section = input.dataset.section;
      const fieldName = input.dataset.fieldName;
      if (section && fieldName) {
        formData[section][fieldName] = input.value;
      }
    });

    // チェックボックス（ビットフラグ）
    const checkboxGroups = {};
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      const section = checkbox.dataset.section;
      const fieldName = checkbox.dataset.fieldName;
      const bitIndex = parseInt(checkbox.dataset.bitIndex);

      if (section && fieldName && !isNaN(bitIndex)) {
        const key = `${section}.${fieldName}`;
        if (!checkboxGroups[key]) {
          checkboxGroups[key] = {};
        }
        checkboxGroups[key][bitIndex] = checkbox.checked ? '1' : '0';
      }
    });

    // ビットフラグを文字列に変換
    Object.keys(checkboxGroups).forEach(key => {
      const [section, fieldName] = key.split('.');
      const bits = checkboxGroups[key];
      const maxIndex = Math.max(...Object.keys(bits).map(k => parseInt(k)));
      let bitString = '';
      for (let i = 0; i <= maxIndex; i++) {
        bitString += bits[i] || '0';
      }
      formData[section][fieldName] = bitString;
    });

    return formData;
  }

  /**
   * フォームモーダル表示
   */
  function showFormModal(pageWindow, formHTML, formData) {
    // 変更追跡フラグ
    let isDirty = false;

    // フォーム変更を監視
    formHTML.addEventListener('input', () => { isDirty = true; });
    formHTML.addEventListener('change', () => { isDirty = true; });

    const modal = pageWindow.HenryCore.ui.showModal({
      title: `主治医意見書 - ${formData.basic_info.patient_name}`,
      content: formHTML,
      width: '700px',
      closeOnOverlayClick: false,
      actions: [
        {
          label: 'テストデータ',
          variant: 'secondary',
          autoClose: false,
          onClick: () => fillTestData(formHTML)
        },
        {
          label: 'クリア',
          variant: 'secondary',
          autoClose: false,
          onClick: () => {
            if (!confirm('入力内容をクリアしますか？')) return;

            // フォームをクリア
            clearFormData(formHTML);

            isDirty = false;
            showFormMessage('入力内容をクリアしました', 'success');
          }
        },
        {
          label: 'キャンセル',
          variant: 'secondary',
          autoClose: false,
          onClick: () => {
            if (!isDirty || confirm('入力内容が破棄されます。本当に閉じますか？')) {
              modal.close();
            }
          }
        },
        {
          label: '一時保存',
          autoClose: false,
          onClick: async (e, button) => {
            const originalText = button?.textContent;
            try {
              const collected = collectFormData(formHTML);
              // 自動入力項目をマージ（収集値を優先）
              collected.basic_info = { ...formData.basic_info, ...collected.basic_info };

              // 保存中UI
              if (button) {
                button.disabled = true;
                button.textContent = '保存中...';
              }

              await DraftStorage.save(formData.basic_info.patient_uuid, collected);
              isDirty = false;
              // ボタンテキストを一時的に変更（目立たない通知）
              if (button) {
                button.disabled = false;
                button.textContent = '✓ 保存しました';
                setTimeout(() => { button.textContent = originalText; }, 1500);
              }
            } catch (e) {
              log?.error('一時保存失敗', e.message);
              showFormMessage(`保存に失敗しました: ${e.message}`, 'error');
              if (button) {
                button.disabled = false;
                button.textContent = originalText;
              }
            }
          }
        },
        {
          label: 'Googleドキュメント作成',
          autoClose: false,
          onClick: async (e, button) => {
            const originalText = button.textContent;
            try {
              const collected = collectFormData(formHTML);
              // 自動入力項目をマージ（収集値を優先）
              collected.basic_info = { ...formData.basic_info, ...collected.basic_info };

              // バリデーション
              const errors = validateFormData(collected);
              if (errors.length > 0) {
                const errorMessage = '以下の項目に入力エラーがあります：\n\n' + errors.join('\n');
                showFormMessage(errorMessage, 'error');
                log?.warn('バリデーションエラー:', errors);
                return;
              }
              hideFormMessage(); // エラーがなければメッセージをクリア

              // ファイル名生成
              const fileName = generateFileName(collected);

              // 処理中表示
              button.disabled = true;
              button.textContent = '作成中...';

              // 一時保存（Googleドキュメントを閉じても編集内容が残るように）
              await DraftStorage.save(formData.basic_info.patient_uuid, collected);
              isDirty = false;

              try {
                // Google Docs生成
                const result = await createGoogleDoc(collected, fileName);

                // 成功時：ドキュメントを新しいタブで開く
                if (result.documentUrl) {
                  window.open(result.documentUrl, '_blank');

                  // 下書きを削除（任意）
                  // await DraftStorage.delete(formData.basic_info.patient_uuid);

                  modal.close();
                }
              } catch (apiError) {
                const errMsg = apiError?.message || String(apiError) || '不明なエラー';
                showFormMessage(`ドキュメント作成エラー：\n${errMsg}`, 'error');
                log?.error('Google Docs API エラー:', errMsg);
                console.error('[OpinionForm] Full error:', apiError);
              } finally {
                // ボタンを元に戻す
                button.textContent = originalText;
                button.disabled = false;
              }
            } catch (e) {
              log?.error('ドキュメント作成失敗', e.message);
              showFormMessage(`エラーが発生しました: ${e.message}`, 'error');
            }
          }
        }
      ]
    });
  }

  // =============================================================================
  // 初期化
  // =============================================================================

  async function init() {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    if (!(await waitForHenryCore())) return;

    log = pageWindow.HenryCore.utils.createLogger(SCRIPT_NAME);
    log.info(`Ready (v${VERSION})`);

    // HenryCore プラグイン登録（v2.7.0以降は自動的にToolboxに表示される）
    await pageWindow.HenryCore.registerPlugin({
      id: 'opinion-form',
      name: '主治医意見書',
      version: VERSION,
      description: '主治医意見書の入力フォームとGoogle Docs出力',
      icon: '📋',
      order: 100,
      group: '文書作成',
      groupIcon: '📝',
      onClick: () => showOpinionForm(pageWindow)
    });

    // Toolbox v5.0.x との後方互換性（v5.1.0以降では不要）
    pageWindow.addEventListener('henrycore:plugin:opinion-form', () => {
      log.info('Event triggered (fallback for Toolbox v5.0.x)');
      showOpinionForm(pageWindow);
    });
  }

  // スクリプト起動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();