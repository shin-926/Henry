// ==UserScript==
// @name         香川県立中央病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.0.1
// @description  香川県立中央病院への診療FAX予約申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_chuo.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_chuo.user.js
// ==/UserScript==

/*
 * 【香川県立中央病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - 香川県立中央病院への診療FAX予約申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 中央病院固有の入力項目
 *    - 受診希望科（中央病院の診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日、第2希望日
 *    - 旧姓
 *    - 医師への連絡（無/済）
 *    - 紹介元医療機関の状況（入院中/通院中）
 *    - CD-R等の有無
 *    - 受診歴（有/無/不明）
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: 中央病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'ChuoReferralForm';
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
    TEMPLATE_ID: '1X-yv6Y8TWZsAr_ONBRF2D0Ipx3UcZ8s1NyBZxUvWgTE',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 香川県立中央病院固定
  const HOSPITAL_NAME = '香川県立中央病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_chuo_draft_';
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

  /**
   * 希望日のフォーマット: "○年○月○日"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
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
        address: p.detail?.addressLine_1 || ''
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

  function getChuoDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getChuoDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showChuoForm() {
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
        former_name: '',
        physician_name: physicianName,
        creation_date_wareki: getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 中央病院固有
        destination_department: '',
        destination_doctor: '',
        doctor_contact: 'none',
        hope_date_1: '',
        hope_date_2: '',
        visit_history: 'unknown',
        referral_status: 'outpatient',
        attachment_notes: '',
        cdr_status: 'none',
        cdr_content: ''
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
    const existingModal = document.getElementById('chuo-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getChuoDepartments();

    const modal = document.createElement('div');
    modal.id = 'chuo-form-modal';
    modal.innerHTML = `
      <style>
        #chuo-form-modal {
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
        .crf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .crf-header {
          padding: 20px 24px;
          background: #616161;
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .crf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .crf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .crf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .crf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .crf-section {
          margin-bottom: 24px;
        }
        .crf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #bbdefb;
        }
        .crf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .crf-field {
          flex: 1;
        }
        .crf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .crf-field input, .crf-field textarea, .crf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .crf-field input:focus, .crf-field textarea:focus, .crf-field select:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }
        .crf-field select {
          background: #fff;
          cursor: pointer;
        }
        .crf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .crf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .crf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .crf-combobox {
          position: relative;
        }
        .crf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .crf-combobox-input:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }
        .crf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .crf-combobox-toggle {
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
        .crf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .crf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .crf-combobox-dropdown {
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
        .crf-combobox-dropdown.open {
          display: block;
        }
        .crf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .crf-combobox-option:hover {
          background: #e3f2fd;
        }
        .crf-combobox-option.selected {
          background: #bbdefb;
          color: #1565c0;
        }
        .crf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .crf-checkbox-group {
          margin-top: 8px;
        }
        .crf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .crf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .crf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .crf-checkbox-item.main-disease {
          background: #e3f2fd;
          border: 1px solid #90caf9;
        }
        .crf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }
        .crf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .crf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .crf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .crf-inline-field {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .crf-inline-field input[type="text"] {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }
        .crf-inline-field input[type="text"]:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .crf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .crf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .crf-footer-right {
          display: flex;
          gap: 12px;
        }
        .crf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .crf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .crf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .crf-btn-primary {
          background: #1976d2;
          color: white;
        }
        .crf-btn-primary:hover {
          background: #1565c0;
        }
        .crf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .crf-btn-link {
          background: #e3f2fd;
          color: #1976d2;
          border: 1px solid #90caf9;
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .crf-btn-link:hover {
          background: #bbdefb;
        }
      </style>
      <div class="crf-container">
        <div class="crf-header">
          <h2>香川県立中央病院 診療申込書</h2>
          <button class="crf-close" title="閉じる">&times;</button>
        </div>
        <div class="crf-body">
          <!-- 患者情報（自動入力） -->
          <div class="crf-section">
            <div class="crf-section-title">患者情報（自動入力）</div>
            <div class="crf-row">
              <div class="crf-field readonly">
                <label>フリガナ</label>
                <input type="text" value="${escapeHtml(formData.patient_name_kana)}" readonly>
              </div>
              <div class="crf-field readonly">
                <label>患者氏名</label>
                <input type="text" value="${escapeHtml(formData.patient_name)}" readonly>
              </div>
              <div class="crf-field" style="flex: 0.5;">
                <label>旧姓</label>
                <input type="text" id="crf-former-name" value="${escapeHtml(formData.former_name)}" placeholder="旧姓があれば入力">
              </div>
            </div>
            <div class="crf-row">
              <div class="crf-field readonly" style="flex: 0.3;">
                <label>性別</label>
                <input type="text" value="${escapeHtml(formData.sex)}" readonly>
              </div>
              <div class="crf-field readonly">
                <label>生年月日</label>
                <input type="text" value="${escapeHtml(formData.birth_date_wareki)}" readonly>
              </div>
              <div class="crf-field readonly" style="flex: 0.3;">
                <label>年齢</label>
                <input type="text" value="${formData.age}歳" readonly>
              </div>
            </div>
          </div>

          <!-- 紹介元情報（自動入力） -->
          <div class="crf-section">
            <div class="crf-section-title">紹介元情報（自動入力）</div>
            <div class="crf-row">
              <div class="crf-field readonly">
                <label>医師名</label>
                <input type="text" value="${escapeHtml(formData.physician_name)}" readonly>
              </div>
              <div class="crf-field readonly" style="flex: 0.5;">
                <label>作成日</label>
                <input type="text" value="${escapeHtml(formData.creation_date_wareki)}" readonly>
              </div>
            </div>
            <div class="crf-row">
              <div class="crf-field">
                <label>紹介元医療機関の状況</label>
                <div class="crf-radio-group">
                  <div class="crf-radio-item">
                    <input type="radio" name="crf-referral-status" id="crf-referral-outpatient" value="outpatient" ${formData.referral_status === 'outpatient' ? 'checked' : ''}>
                    <label for="crf-referral-outpatient">通院中</label>
                  </div>
                  <div class="crf-radio-item">
                    <input type="radio" name="crf-referral-status" id="crf-referral-inpatient" value="inpatient" ${formData.referral_status === 'inpatient' ? 'checked' : ''}>
                    <label for="crf-referral-inpatient">入院中</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 中央病院 受診希望 -->
          <div class="crf-section">
            <div class="crf-section-title">中央病院 受診希望</div>
            <div class="crf-row">
              <div class="crf-field">
                <label>希望受診科</label>
                <select id="crf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="crf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="crf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="crf-combobox-input" id="crf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="crf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="crf-combobox-dropdown" id="crf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="crf-btn crf-btn-link" id="crf-open-schedule" title="外来診療予定表を見る">外来表</button>
                </div>
              </div>
            </div>
            <div class="crf-row">
              <div class="crf-field">
                <label>医師への連絡</label>
                <div class="crf-radio-group">
                  <div class="crf-radio-item">
                    <input type="radio" name="crf-doctor-contact" id="crf-contact-none" value="none" ${formData.doctor_contact === 'none' ? 'checked' : ''}>
                    <label for="crf-contact-none">無</label>
                  </div>
                  <div class="crf-radio-item">
                    <input type="radio" name="crf-doctor-contact" id="crf-contact-done" value="done" ${formData.doctor_contact === 'done' ? 'checked' : ''}>
                    <label for="crf-contact-done">済</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="crf-section">
            <div class="crf-section-title">受診希望日</div>
            <div class="crf-row">
              <div class="crf-field">
                <label>第1希望日</label>
                <input type="date" id="crf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="crf-field">
                <label>第2希望日</label>
                <input type="date" id="crf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
              </div>
            </div>
          </div>

          <!-- 中央病院受診歴 -->
          <div class="crf-section">
            <div class="crf-section-title">中央病院 受診歴</div>
            <div class="crf-radio-group">
              <div class="crf-radio-item">
                <input type="radio" name="crf-visit-history" id="crf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="crf-visit-yes">有</label>
              </div>
              <div class="crf-radio-item">
                <input type="radio" name="crf-visit-history" id="crf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="crf-visit-no">無</label>
              </div>
              <div class="crf-radio-item">
                <input type="radio" name="crf-visit-history" id="crf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="crf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 診療依頼目的・病名 -->
          <div class="crf-section">
            <div class="crf-section-title">受診依頼目的・病名</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="crf-diseases-list" class="crf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="crf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="crf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="crf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="crf-field">
              <label>自由記述（受診依頼目的など）</label>
              <textarea id="crf-diagnosis-text" placeholder="受診依頼目的や追加の病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

          <!-- 紹介状添付資料・CD-R -->
          <div class="crf-section">
            <div class="crf-section-title">紹介状添付資料</div>
            <div class="crf-row">
              <div class="crf-field">
                <label>紹介状添付資料（備考）</label>
                <input type="text" id="crf-attachment-notes" value="${escapeHtml(formData.attachment_notes)}" placeholder="添付資料があれば記入">
              </div>
            </div>
            <div class="crf-row">
              <div class="crf-field">
                <label>CD-R等の有無</label>
                <div class="crf-inline-field">
                  <div class="crf-radio-group" style="margin-top: 0;">
                    <div class="crf-radio-item">
                      <input type="radio" name="crf-cdr-status" id="crf-cdr-yes" value="yes" ${formData.cdr_status === 'yes' ? 'checked' : ''}>
                      <label for="crf-cdr-yes">有</label>
                    </div>
                    <div class="crf-radio-item">
                      <input type="radio" name="crf-cdr-status" id="crf-cdr-no" value="none" ${formData.cdr_status === 'none' ? 'checked' : ''}>
                      <label for="crf-cdr-no">無</label>
                    </div>
                  </div>
                  <input type="text" id="crf-cdr-content" value="${escapeHtml(formData.cdr_content)}" placeholder="内容（CT画像など）" ${formData.cdr_status !== 'yes' ? 'disabled' : ''} style="max-width: 300px;">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="crf-footer">
          <div class="crf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="crf-footer-right">
            <button class="crf-btn crf-btn-secondary" id="crf-save-draft">下書き保存</button>
            <button class="crf-btn crf-btn-primary" id="crf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.crf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#crf-dest-department');
    const doctorInput = modal.querySelector('#crf-dest-doctor');
    const doctorDropdown = modal.querySelector('#crf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.crf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.crf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="crf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="crf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getChuoDoctors(deptName);
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
      doctorCombobox.querySelector('.crf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.crf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.crf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.crf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 外来診療表ボタン
    modal.querySelector('#crf-open-schedule').addEventListener('click', () => {
      window.open('https://www.chp-kagawa.jp/guide/gairai/shinryouyotei/', '_blank');
    });

    // CD-R有無の連動
    const cdrYes = modal.querySelector('#crf-cdr-yes');
    const cdrNo = modal.querySelector('#crf-cdr-no');
    const cdrContent = modal.querySelector('#crf-cdr-content');

    function updateCdrContentState() {
      cdrContent.disabled = !cdrYes.checked;
      if (!cdrYes.checked) {
        cdrContent.value = '';
      }
    }

    cdrYes.addEventListener('change', updateCdrContentState);
    cdrNo.addEventListener('change', updateCdrContentState);

    // 下書き保存
    modal.querySelector('#crf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#crf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#crf-generate');
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

    // 患者情報
    data.former_name = modal.querySelector('#crf-former-name')?.value || '';

    // 紹介元状況
    data.referral_status = modal.querySelector('input[name="crf-referral-status"]:checked')?.value || 'outpatient';

    // 中央病院固有
    data.destination_department = modal.querySelector('#crf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#crf-dest-doctor')?.value || '';
    data.doctor_contact = modal.querySelector('input[name="crf-doctor-contact"]:checked')?.value || 'none';

    // 希望日
    data.hope_date_1 = modal.querySelector('#crf-hope-date-1')?.value || '';
    data.hope_date_2 = modal.querySelector('#crf-hope-date-2')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="crf-visit-history"]:checked')?.value || 'unknown';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#crf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#crf-diagnosis-text')?.value || '';

    // 添付資料・CD-R
    data.attachment_notes = modal.querySelector('#crf-attachment-notes')?.value || '';
    data.cdr_status = modal.querySelector('input[name="crf-cdr-status"]:checked')?.value || 'none';
    data.cdr_content = modal.querySelector('#crf-cdr-content')?.value || '';

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
      const fileName = `診療申込書_県立中央病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'chuo-referral-form'
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

      // 紹介元状況テキスト
      const referralStatusText = formData.referral_status === 'inpatient' ? '入院中' : '通院中';

      // 医師への連絡テキスト
      const doctorContactText = formData.doctor_contact === 'done' ? '済' : '無';

      // CD-R有無テキスト
      let cdrText = '';
      if (formData.cdr_status === 'yes') {
        cdrText = formData.cdr_content ? `有（${formData.cdr_content}）` : '有';
      } else {
        cdrText = '無';
      }

      // 希望日フォーマット
      const hopeDate1Text = formatHopeDate(formData.hope_date_1);
      const hopeDate2Text = formatHopeDate(formData.hope_date_2);

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{フリガナ}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{旧姓}}', formData.former_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{年齢}}', formData.age),
        DocsAPI.createReplaceTextRequest('{{郵便番号}}', formData.postal_code),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', formData.destination_department),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{医師への連絡}}', doctorContactText),
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', hopeDate1Text),
        DocsAPI.createReplaceTextRequest('{{第2希望日}}', hopeDate2Text),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{紹介元医療機関の状況}}', referralStatusText),
        DocsAPI.createReplaceTextRequest('{{受診依頼目的・病名}}', diagnosisText),
        DocsAPI.createReplaceTextRequest('{{紹介状添付資料}}', formData.attachment_notes),
        DocsAPI.createReplaceTextRequest('{{CD-R等の有無}}', cdrText)
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
      id: 'chuo-referral-form',
      name: '診療申込書（県立中央病院）',
      icon: '🏥',
      description: '香川県立中央病院への診療申込書を作成',
      version: VERSION,
      order: 211,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showChuoForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
