// ==UserScript==
// @name         りつりん病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.0.0
// @description  りつりん病院への診療FAX予約申込書を作成
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_info
// @grant        unsafeWindow
// @connect      googleapis.com
// @connect      www.googleapis.com
// @connect      docs.googleapis.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_ritsurin_referral_form.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_ritsurin_referral_form.user.js
// ==/UserScript==

/*
 * 【りつりん病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - りつりん病院への診療FAX予約申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. りつりん病院固有の入力項目
 *    - 受診希望科（りつりん病院の診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日、第2希望日（カレンダー + 午前/午後）
 *    - その他希望日（テキスト）
 *    - 受診歴（有/無/不明）
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: りつりん病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'RitsurinReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const API_CONFIG = {
    DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
    DOCS_API_BASE: 'https://docs.googleapis.com/v1'
  };

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1JLvOvoNcuY8gStHFnnwm-iIi9u_cH0jr9pljyNJNptg',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // りつりん病院固定
  const HOSPITAL_NAME = 'りつりん病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_ritsurin_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  let log = null;

  // ==========================================
  // GraphQL クエリ
  // ==========================================

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
    `,
    ListPatientReceiptDiseases: `
      query ListPatientReceiptDiseases($input: ListPatientReceiptDiseasesRequestInput!) {
        listPatientReceiptDiseases(input: $input) {
          patientReceiptDiseases {
            uuid
            startDate { year month day }
            endDate { year month day }
            outcome
            isMain
            isSuspected
            masterDisease { name code }
            masterModifiers { name code position }
            customDiseaseName { value }
          }
        }
      }
    `
  };

  // ==========================================
  // GoogleAuth取得ヘルパー
  // ==========================================

  function getGoogleAuth() {
    return pageWindow.HenryCore?.modules?.GoogleAuth;
  }

  // ==========================================
  // Google Drive API モジュール
  // ==========================================

  const DriveAPI = {
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

    async findFolder(folderName) {
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;
      const url = `${API_CONFIG.DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
      const result = await this.request('GET', url);
      return result.files?.[0] || null;
    },

    async createFolder(folderName) {
      const url = `${API_CONFIG.DRIVE_API_BASE}/files`;
      return await this.request('POST', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['root']
        })
      });
    },

    async getOrCreateFolder(folderName) {
      let folder = await this.findFolder(folderName);
      if (!folder) {
        folder = await this.createFolder(folderName);
      }
      return folder;
    }
  };

  // ==========================================
  // Google Docs API モジュール
  // ==========================================

  const DocsAPI = {
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

  // ==========================================
  // ユーティリティ関数
  // ==========================================

  function katakanaToHiragana(str) {
    if (!str) return '';
    return str.replace(/[ァ-ヶ]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
  }

  function toWareki(year, month, day) {
    if (!year) return '';

    let eraName, eraYear;
    const y = parseInt(year);
    const m = parseInt(month) || 1;

    if (y >= 2019 && (y > 2019 || m >= 5)) {
      eraName = '令和';
      eraYear = y - 2018;
    } else if (y >= 1989) {
      eraName = '平成';
      eraYear = y - 1988;
    } else if (y >= 1926) {
      eraName = '昭和';
      eraYear = y - 1925;
    } else if (y >= 1912) {
      eraName = '大正';
      eraYear = y - 1911;
    } else {
      eraName = '明治';
      eraYear = y - 1867;
    }

    return `${eraName}${eraYear}年${month}月${day}日`;
  }

  function calculateAge(birthYear, birthMonth, birthDay) {
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const m = today.getMonth() + 1;
    const d = today.getDate();

    if (m < birthMonth || (m === birthMonth && d < birthDay)) {
      age--;
    }
    return age.toString();
  }

  function getTodayWareki() {
    const today = new Date();
    return toWareki(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  function formatSex(sexType) {
    if (sexType === 'SEX_TYPE_MALE') return '男';
    if (sexType === 'SEX_TYPE_FEMALE') return '女';
    return '';
  }

  function formatPhoneNumber(phone) {
    if (!phone) return '';

    // 全角数字を半角に変換
    let normalized = phone.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    // 全角ハイフン等を半角に変換
    normalized = normalized.replace(/[ー−‐―]/g, '-');
    // 数字のみ抽出
    const digitsOnly = normalized.replace(/[^0-9]/g, '');

    // 携帯電話（11桁、090/080/070/060で始まる）
    if (digitsOnly.length === 11 && /^0[6789]0/.test(digitsOnly)) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
    }

    // 市外局番省略（7桁）→ XXX-XXXX
    if (digitsOnly.length === 7) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }

    // 市外局番省略（8桁）→ XXXX-XXXX
    if (digitsOnly.length === 8) {
      return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
    }

    // それ以外は全角→半角変換のみ
    return normalized;
  }

  /**
   * 希望日のフォーマット: "○月○日 曜曜日（午前/午後）"
   */
  function formatHopeDate(dateStr, period) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const periodText = period === 'am' ? '午前' : period === 'pm' ? '午後' : '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}曜日${periodText ? `（${periodText}）` : ''}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // localStorage管理
  // ==========================================

  function saveDraft(patientUuid, formData) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${patientUuid}`;
      const draft = {
        schemaVersion: DRAFT_SCHEMA_VERSION,
        data: formData,
        savedAt: new Date().toISOString(),
        patientName: formData.patient_name
      };
      localStorage.setItem(key, JSON.stringify(draft));
      return true;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 下書き保存失敗:`, e.message);
      return false;
    }
  }

  function loadDraft(patientUuid) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${patientUuid}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft = JSON.parse(stored);
      if (!draft.schemaVersion || draft.schemaVersion !== DRAFT_SCHEMA_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      return { data: draft.data, savedAt: draft.savedAt };
    } catch (e) {
      return null;
    }
  }

  function deleteDraft(patientUuid) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${patientUuid}`;
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  }

  // ==========================================
  // データ取得関数
  // ==========================================

  async function fetchPatientInfo() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return null;

    const patientUuid = HenryCore.getPatientUuid();
    if (!patientUuid) return null;

    try {
      const result = await HenryCore.query(QUERIES.GetPatient, {
        input: { uuid: patientUuid }
      });

      const p = result.data?.getPatient;
      if (!p) return null;

      const birthDate = p.detail?.birthDate;
      const birthYear = birthDate?.year;
      const birthMonth = birthDate?.month;
      const birthDay = birthDate?.day;

      return {
        patient_uuid: patientUuid,
        patient_name: (p.fullName || '').replace(/\u3000/g, ' '),
        patient_name_kana: katakanaToHiragana(p.fullNamePhonetic || ''),
        birth_date_wareki: birthYear ? toWareki(birthYear, birthMonth, birthDay) : '',
        age: birthYear ? calculateAge(birthYear, birthMonth, birthDay) : '',
        sex: formatSex(p.detail?.sexType),
        postal_code: p.detail?.postalCode || '',
        address: p.detail?.addressLine_1 || '',
        phone: p.detail?.phoneNumber || ''
      };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 患者情報取得エラー:`, e.message);
      return null;
    }
  }

  async function fetchPhysicianName() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return '';

    try {
      const myUuid = await HenryCore.getMyUuid();
      if (!myUuid) return '';

      const result = await HenryCore.query(QUERIES.ListUsers, {
        input: { role: 'DOCTOR', onlyNarcoticPractitioner: false }
      });

      const users = result.data?.listUsers?.users || [];
      const me = users.find(u => u.uuid === myUuid);
      return (me?.name || '').replace(/\u3000/g, ' ');
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 医師名取得エラー:`, e.message);
      return '';
    }
  }

  async function fetchDiseases(patientUuid) {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return [];

    try {
      const result = await HenryCore.query(QUERIES.ListPatientReceiptDiseases, {
        input: {
          patientUuids: [patientUuid],
          patientCareType: 'PATIENT_CARE_TYPE_ANY',
          onlyMain: false
        }
      });

      const diseases = result.data?.listPatientReceiptDiseases?.patientReceiptDiseases || [];

      // 終了していない病名のみ、主病名優先でソート
      return diseases
        .filter(d => !d.endDate && d.outcome !== 'OUTCOME_CURED' && d.outcome !== 'OUTCOME_DIED')
        .sort((a, b) => {
          if (a.isMain && !b.isMain) return -1;
          if (!a.isMain && b.isMain) return 1;
          return 0;
        })
        .map(d => {
          const modifiers = (d.masterModifiers || [])
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(m => m.name.replace(/^・/, ''))
            .join('');
          const baseName = d.customDiseaseName?.value || d.masterDisease?.name || '';
          return {
            uuid: d.uuid,
            name: modifiers + baseName,
            isMain: d.isMain,
            isSuspected: d.isSuspected
          };
        });
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 病名取得エラー:`, e.message);
      return [];
    }
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getRitsurinDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getRitsurinDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showRitsurinForm() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) {
      alert('HenryCoreが見つかりません');
      return;
    }

    const patientUuid = HenryCore.getPatientUuid();
    if (!patientUuid) {
      alert('患者ページで実行してください');
      return;
    }

    // Google認証チェック
    const googleAuth = getGoogleAuth();
    if (!googleAuth) {
      alert('Google認証が設定されていません。\nHenry Toolboxの設定からGoogle認証を行ってください。');
      return;
    }

    // スピナー表示
    const spinner = HenryCore.ui?.showSpinner?.('データを取得中...');

    try {
      // データ取得（並列実行）
      const [patientInfo, physicianName, diseases] = await Promise.all([
        fetchPatientInfo(),
        fetchPhysicianName(),
        fetchDiseases(patientUuid)
      ]);

      spinner?.close();

      if (!patientInfo) {
        alert('患者情報を取得できませんでした');
        return;
      }

      // 下書き読み込み
      const savedDraft = loadDraft(patientUuid);

      // フォームデータ作成
      const formData = savedDraft?.data || {
        // 自動入力項目
        patient_uuid: patientUuid,
        patient_name: patientInfo.patient_name,
        patient_name_kana: patientInfo.patient_name_kana,
        birth_date_wareki: patientInfo.birth_date_wareki,
        age: patientInfo.age,
        sex: patientInfo.sex,
        postal_code: patientInfo.postal_code,
        address: patientInfo.address,
        phone: formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        creation_date_wareki: getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // りつりん病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_date_1_period: '',
        hope_date_2: '',
        hope_date_2_period: '',
        hope_date_other: '',
        visit_history: 'unknown'
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_name_kana = patientInfo.patient_name_kana;
      formData.birth_date_wareki = patientInfo.birth_date_wareki;
      formData.age = patientInfo.age;
      formData.sex = patientInfo.sex;
      formData.postal_code = patientInfo.postal_code;
      formData.address = patientInfo.address;
      formData.phone = formatPhoneNumber(patientInfo.phone);
      formData.physician_name = physicianName;
      formData.creation_date_wareki = getTodayWareki();
      formData.diseases = diseases;

      // モーダル表示
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function showFormModal(formData, lastSavedAt) {
    // 既存モーダルを削除
    const existingModal = document.getElementById('ritsurin-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getRitsurinDepartments();

    const modal = document.createElement('div');
    modal.id = 'ritsurin-form-modal';
    modal.innerHTML = `
      <style>
        #ritsurin-form-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1500;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .rrf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .rrf-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, #43a047 0%, #388e3c 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rrf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .rrf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .rrf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .rrf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .rrf-section {
          margin-bottom: 24px;
        }
        .rrf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #43a047;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #c8e6c9;
        }
        .rrf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .rrf-field {
          flex: 1;
        }
        .rrf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .rrf-field input, .rrf-field textarea, .rrf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .rrf-field input:focus, .rrf-field textarea:focus, .rrf-field select:focus {
          outline: none;
          border-color: #43a047;
          box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
        }
        .rrf-field select {
          background: #fff;
          cursor: pointer;
        }
        .rrf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .rrf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .rrf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .rrf-combobox {
          position: relative;
        }
        .rrf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .rrf-combobox-input:focus {
          outline: none;
          border-color: #43a047;
          box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
        }
        .rrf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .rrf-combobox-toggle {
          position: absolute;
          right: 1px;
          top: 1px;
          bottom: 1px;
          width: 32px;
          background: #f5f5f5;
          border: none;
          border-left: 1px solid #ddd;
          border-radius: 0 5px 5px 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 12px;
        }
        .rrf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .rrf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .rrf-combobox-dropdown {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background: #fff;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 6px 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
        }
        .rrf-combobox-dropdown.open {
          display: block;
        }
        .rrf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .rrf-combobox-option:hover {
          background: #e8f5e9;
        }
        .rrf-combobox-option.selected {
          background: #c8e6c9;
          color: #2e7d32;
        }
        .rrf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .rrf-checkbox-group {
          margin-top: 8px;
        }
        .rrf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .rrf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .rrf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .rrf-checkbox-item.main-disease {
          background: #e8f5e9;
          border: 1px solid #a5d6a7;
        }
        .rrf-use-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff3e0;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .rrf-use-toggle input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }
        .rrf-use-toggle label {
          font-weight: 500;
          color: #e65100;
        }
        .rrf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }
        .rrf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rrf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .rrf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .rrf-date-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .rrf-date-row input[type="date"] {
          flex: 0 1 200px;
          min-width: 150px;
        }
        .rrf-period-group {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }
        .rrf-period-group label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
        }
        .rrf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rrf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .rrf-footer-right {
          display: flex;
          gap: 12px;
        }
        .rrf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rrf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .rrf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .rrf-btn-primary {
          background: #43a047;
          color: white;
        }
        .rrf-btn-primary:hover {
          background: #388e3c;
        }
        .rrf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .rrf-btn-link {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #a5d6a7;
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .rrf-btn-link:hover {
          background: #c8e6c9;
        }
      </style>
      <div class="rrf-container">
        <div class="rrf-header">
          <h2>りつりん病院 診療申込書</h2>
          <button class="rrf-close" title="閉じる">&times;</button>
        </div>
        <div class="rrf-body">
          <!-- 患者情報（自動入力） -->
          <div class="rrf-section">
            <div class="rrf-section-title">患者情報（自動入力）</div>
            <div class="rrf-row">
              <div class="rrf-field readonly">
                <label>ふりがな</label>
                <input type="text" value="${escapeHtml(formData.patient_name_kana)}" readonly>
              </div>
              <div class="rrf-field readonly">
                <label>患者氏名</label>
                <input type="text" value="${escapeHtml(formData.patient_name)}" readonly>
              </div>
              <div class="rrf-field readonly" style="flex: 0.3;">
                <label>性別</label>
                <input type="text" value="${escapeHtml(formData.sex)}" readonly>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field readonly">
                <label>生年月日</label>
                <input type="text" value="${escapeHtml(formData.birth_date_wareki)}" readonly>
              </div>
              <div class="rrf-field readonly" style="flex: 0.3;">
                <label>年齢</label>
                <input type="text" value="${formData.age}歳" readonly>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field readonly" style="flex: 0.3;">
                <label>郵便番号</label>
                <input type="text" value="${escapeHtml(formData.postal_code)}" readonly>
              </div>
              <div class="rrf-field readonly">
                <label>住所</label>
                <input type="text" value="${escapeHtml(formData.address)}" readonly>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field readonly">
                <label>電話番号</label>
                <input type="text" value="${escapeHtml(formData.phone)}" readonly>
              </div>
            </div>
          </div>

          <!-- 紹介元情報（自動入力） -->
          <div class="rrf-section">
            <div class="rrf-section-title">紹介元情報（自動入力）</div>
            <div class="rrf-row">
              <div class="rrf-field readonly">
                <label>医師名</label>
                <input type="text" value="${escapeHtml(formData.physician_name)}" readonly>
              </div>
              <div class="rrf-field readonly" style="flex: 0.5;">
                <label>作成日</label>
                <input type="text" value="${escapeHtml(formData.creation_date_wareki)}" readonly>
              </div>
            </div>
          </div>

          <!-- りつりん病院 受診希望 -->
          <div class="rrf-section">
            <div class="rrf-section-title">りつりん病院 受診希望</div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>受診希望科</label>
                <select id="rrf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="rrf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="rrf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="rrf-combobox-input" id="rrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="rrf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="rrf-combobox-dropdown" id="rrf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="rrf-btn rrf-btn-link" id="rrf-open-schedule" title="外来診療担当表を見る">📅 外来表</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="rrf-section">
            <div class="rrf-section-title">受診希望日</div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>第1希望日</label>
                <div class="rrf-date-row">
                  <input type="date" id="rrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
                  <div class="rrf-period-group">
                    <label>
                      <input type="radio" name="rrf-hope-date-1-period" value="am" ${formData.hope_date_1_period === 'am' ? 'checked' : ''}>
                      午前
                    </label>
                    <label>
                      <input type="radio" name="rrf-hope-date-1-period" value="pm" ${formData.hope_date_1_period === 'pm' ? 'checked' : ''}>
                      午後
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>第2希望日</label>
                <div class="rrf-date-row">
                  <input type="date" id="rrf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
                  <div class="rrf-period-group">
                    <label>
                      <input type="radio" name="rrf-hope-date-2-period" value="am" ${formData.hope_date_2_period === 'am' ? 'checked' : ''}>
                      午前
                    </label>
                    <label>
                      <input type="radio" name="rrf-hope-date-2-period" value="pm" ${formData.hope_date_2_period === 'pm' ? 'checked' : ''}>
                      午後
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>その他希望日</label>
                <textarea id="rrf-hope-date-other" rows="2" placeholder="その他の希望日があれば入力">${escapeHtml(formData.hope_date_other)}</textarea>
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="rrf-section">
            <div class="rrf-section-title">りつりん病院 受診歴</div>
            <div class="rrf-radio-group">
              <div class="rrf-radio-item">
                <input type="radio" name="rrf-visit-history" id="rrf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="rrf-visit-yes">有</label>
              </div>
              <div class="rrf-radio-item">
                <input type="radio" name="rrf-visit-history" id="rrf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="rrf-visit-no">無</label>
              </div>
              <div class="rrf-radio-item">
                <input type="radio" name="rrf-visit-history" id="rrf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="rrf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 診療依頼目的・病名 -->
          <div class="rrf-section">
            <div class="rrf-section-title">診療依頼目的・病名</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="rrf-diseases-list" class="rrf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="rrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="rrf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="rrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="rrf-field">
              <label>自由記述（診療依頼目的など）</label>
              <textarea id="rrf-diagnosis-text" placeholder="診療依頼目的や追加の病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>
        </div>
        <div class="rrf-footer">
          <div class="rrf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="rrf-footer-right">
            <button class="rrf-btn rrf-btn-secondary" id="rrf-save-draft">下書き保存</button>
            <button class="rrf-btn rrf-btn-primary" id="rrf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.rrf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 外来診療担当表ボタン
    modal.querySelector('#rrf-open-schedule').addEventListener('click', () => {
      window.open('https://ritsurin.jcho.go.jp/patient/outpatient/%E5%A4%96%E6%9D%A5%E8%A8%BA%E7%99%82%E6%8B%85%E5%BD%93%E8%A1%A8-7/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#rrf-dest-department');
    const doctorInput = modal.querySelector('#rrf-dest-doctor');
    const doctorDropdown = modal.querySelector('#rrf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.rrf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.rrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="rrf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="rrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getRitsurinDoctors(deptName);
      // 「担当医」を常に追加
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    // 診療科変更時
    deptSelect.addEventListener('change', () => {
      const hasValue = !!deptSelect.value;
      doctorInput.disabled = !hasValue;
      doctorCombobox.querySelector('.rrf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.rrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.rrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.rrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 下書き保存
    modal.querySelector('#rrf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#rrf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#rrf-generate');
      btn.disabled = true;
      btn.textContent = '生成中...';

      try {
        const data = collectFormData(modal, formData);
        await generateGoogleDoc(data);
        deleteDraft(formData.patient_uuid);
        modal.remove();
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 出力エラー:`, e);
        alert(`エラーが発生しました: ${e.message}`);
        btn.disabled = false;
        btn.textContent = 'Google Docsに出力';
      }
    });
  }

  function collectFormData(modal, originalData) {
    const data = { ...originalData };

    // りつりん病院固有
    data.destination_department = modal.querySelector('#rrf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#rrf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_1 = modal.querySelector('#rrf-hope-date-1')?.value || '';
    data.hope_date_1_period = modal.querySelector('input[name="rrf-hope-date-1-period"]:checked')?.value || '';
    data.hope_date_2 = modal.querySelector('#rrf-hope-date-2')?.value || '';
    data.hope_date_2_period = modal.querySelector('input[name="rrf-hope-date-2-period"]:checked')?.value || '';
    data.hope_date_other = modal.querySelector('#rrf-hope-date-other')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="rrf-visit-history"]:checked')?.value || 'unknown';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#rrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#rrf-diagnosis-text')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // スピナー表示
    const HenryCore = pageWindow.HenryCore;
    const spinner = HenryCore?.ui?.showSpinner?.('Google Docsを生成中...');

    try {
      // アクセストークン確認
      const googleAuth = getGoogleAuth();
      await googleAuth.getValidAccessToken();

      // 出力フォルダ取得/作成
      const folder = await DriveAPI.getOrCreateFolder(TEMPLATE_CONFIG.OUTPUT_FOLDER_NAME);

      // テンプレートをコピー（メタデータ付き）
      const fileName = `診療申込書_りつりん病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'ritsurin-referral-form'
      };
      const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

      // 診断名テキスト作成（病名選択 + 自由記述）
      const diagnosisParts = [];

      // 選択された病名
      if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
        const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
        const diseaseText = selectedDiseases.map(d => d.name + (d.isSuspected ? '（疑い）' : '')).join('，');
        if (diseaseText) {
          diagnosisParts.push(diseaseText);
        }
      }

      // 自由記述
      if (formData.diagnosis_text) {
        diagnosisParts.push(formData.diagnosis_text);
      }

      const diagnosisText = diagnosisParts.join('\n');

      // 受診歴テキスト作成
      let visitHistoryText = '';
      if (formData.visit_history === 'yes') {
        visitHistoryText = '有';
      } else if (formData.visit_history === 'no') {
        visitHistoryText = '無';
      } else {
        visitHistoryText = '不明';
      }

      // 希望日フォーマット
      const hopeDate1Text = formatHopeDate(formData.hope_date_1, formData.hope_date_1_period);
      const hopeDate2Text = formatHopeDate(formData.hope_date_2, formData.hope_date_2_period);

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{ふりがな}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{年齢}}', formData.age),
        DocsAPI.createReplaceTextRequest('{{郵便番号}}', formData.postal_code),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', formData.destination_department),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', hopeDate1Text),
        DocsAPI.createReplaceTextRequest('{{第2希望日}}', hopeDate2Text),
        DocsAPI.createReplaceTextRequest('{{その他希望日}}', formData.hope_date_other),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{診療依頼目的・病名}}', diagnosisText)
      ];

      // 置換実行
      await DocsAPI.batchUpdate(newDoc.id, requests);

      spinner?.close();

      // 新しいドキュメントを開く
      const docUrl = `https://docs.google.com/document/d/${newDoc.id}/edit`;
      GM_openInTab(docUrl, { active: true });

      console.log(`[${SCRIPT_NAME}] Google Docs生成完了: ${docUrl}`);

    } catch (e) {
      spinner?.close();
      throw e;
    }
  }

  // ==========================================
  // 初期化
  // ==========================================

  async function init() {
    // HenryCore待機
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 10000) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return;
      }
    }

    log = pageWindow.HenryCore.utils?.createLogger?.(SCRIPT_NAME);

    // プラグイン登録
    await pageWindow.HenryCore.registerPlugin({
      id: 'ritsurin-referral-form',
      name: 'りつりん病院 診療申込',
      icon: '🏥',
      description: 'りつりん病院への診療申込書を作成',
      version: VERSION,
      order: 210,
      group: '文書作成',
      groupIcon: '📝',
      onClick: showRitsurinForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
