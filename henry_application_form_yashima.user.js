// ==UserScript==
// @name         屋島総合病院 FAX診療申込書
// @namespace    https://henry-app.jp/
// @version      1.1.0
// @description  屋島総合病院へのFAX診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_yashima.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_yashima.user.js
// ==/UserScript==

/*
 * 【屋島総合病院 FAX診療申込書フォーム】
 *
 * ■ 使用場面
 * - 屋島総合病院へのFAX診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 屋島総合病院固有の入力項目
 *    - 受診希望科
 *    - 希望医師名
 *    - 希望来院日・時間
 *    - 当院受診歴（有/無/不明）
 *    - 新型コロナ問診（5項目）
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: 屋島総合病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'YashimaReferralForm';
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
    TEMPLATE_ID: '1qkfxrrKvypdUnm_J2BSHy7sPPWC902GZKm1A3PeaaOY',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 屋島総合病院固定
  const HOSPITAL_NAME = '屋島総合病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_yashima_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // テーマカラー（ネイビーブルー系）
  const THEME = {
    primary: '#3F51B5',
    primaryDark: '#303F9F',
    primaryLight: '#E8EAF6',
    accent: '#C5CAE9'
  };

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

    let normalized = phone.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    normalized = normalized.replace(/[ー−‐―]/g, '-');
    const digitsOnly = normalized.replace(/[^0-9]/g, '');

    if (digitsOnly.length === 11 && /^0[6789]0/.test(digitsOnly)) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
    }

    if (digitsOnly.length === 7) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }

    if (digitsOnly.length === 8) {
      return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
    }

    return normalized;
  }

  /**
   * 希望日のフォーマット: "○月○日　曜曜日"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日　${weekdays[d.getDay()]}曜日`;
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

  function getYashimaDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getYashimaDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showYashimaForm() {
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

    const googleAuth = getGoogleAuth();
    if (!googleAuth) {
      alert('Google認証が設定されていません。\nHenry Toolboxの設定からGoogle認証を行ってください。');
      return;
    }

    const spinner = HenryCore.ui?.showSpinner?.('データを取得中...');

    try {
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

      const savedDraft = loadDraft(patientUuid);

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

        // 屋島総合病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_time_hour: '',
        hope_time_minute: '',
        visit_history: 'unknown',

        // 新型コロナ問診
        covid_infected: 'no',
        covid_infected_date: '',
        covid_contact: 'no',
        covid_contact_detail: '',
        covid_gathering: 'no',
        covid_gathering_detail: '',
        covid_symptoms: 'no',
        covid_symptoms_detail: '',
        covid_vaccine: 'done',
        covid_vaccine_year: '',
        covid_vaccine_month: ''
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

      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function showFormModal(formData, lastSavedAt) {
    const existingModal = document.getElementById('yashima-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getYashimaDepartments();

    // 時間選択肢を生成
    const hourOptions = Array.from({ length: 10 }, (_, i) => 8 + i); // 8-17時
    const minuteOptions = ['00', '15', '30', '45'];

    const modal = document.createElement('div');
    modal.id = 'yashima-form-modal';
    modal.innerHTML = `
      <style>
        #yashima-form-modal {
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
        .yrf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .yrf-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .yrf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .yrf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .yrf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .yrf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .yrf-section {
          margin-bottom: 24px;
        }
        .yrf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: ${THEME.primary};
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid ${THEME.primaryLight};
        }
        .yrf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .yrf-field {
          flex: 1;
        }
        .yrf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .yrf-field input, .yrf-field textarea, .yrf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .yrf-field input:focus, .yrf-field textarea:focus, .yrf-field select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
        }
        .yrf-field select {
          background: #fff;
          cursor: pointer;
        }
        .yrf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .yrf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .yrf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .yrf-combobox {
          position: relative;
        }
        .yrf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .yrf-combobox-input:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
        }
        .yrf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .yrf-combobox-toggle {
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
        .yrf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .yrf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .yrf-combobox-dropdown {
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
        .yrf-combobox-dropdown.open {
          display: block;
        }
        .yrf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .yrf-combobox-option:hover {
          background: ${THEME.accent};
        }
        .yrf-combobox-option.selected {
          background: ${THEME.primaryLight};
          color: ${THEME.primaryDark};
        }
        .yrf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .yrf-checkbox-group {
          margin-top: 8px;
        }
        .yrf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .yrf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .yrf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .yrf-checkbox-item.main-disease {
          background: ${THEME.accent};
          border: 1px solid ${THEME.primaryLight};
        }
        .yrf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }
        .yrf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .yrf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .yrf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .yrf-time-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .yrf-time-row select {
          width: 80px;
        }
        .yrf-covid-section {
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: 8px;
          padding: 16px;
        }
        .yrf-covid-section .yrf-section-title {
          color: #f57c00;
          border-bottom-color: #ffe082;
        }
        .yrf-covid-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          padding: 10px 12px;
          background: #fffde7;
          border-radius: 6px;
          flex-wrap: wrap;
        }
        .yrf-covid-row .question {
          flex: 1;
          min-width: 200px;
          font-size: 13px;
          color: #333;
        }
        .yrf-covid-row .question-num {
          font-weight: 600;
          color: #f57c00;
          margin-right: 4px;
        }
        .yrf-covid-row input[type="text"],
        .yrf-covid-row input[type="date"],
        .yrf-covid-row select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .yrf-covid-row input[type="text"] {
          width: 120px;
        }
        .yrf-covid-row input[type="date"] {
          width: 150px;
        }
        .yrf-covid-row select {
          width: 70px;
        }
        .yrf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .yrf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .yrf-footer-right {
          display: flex;
          gap: 12px;
        }
        .yrf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .yrf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .yrf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .yrf-btn-primary {
          background: ${THEME.primary};
          color: white;
        }
        .yrf-btn-primary:hover {
          background: ${THEME.primaryDark};
        }
        .yrf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .yrf-btn-link {
          background: ${THEME.accent};
          color: ${THEME.primaryDark};
          border: 1px solid ${THEME.primaryLight};
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .yrf-btn-link:hover {
          background: ${THEME.primaryLight};
        }
      </style>
      <div class="yrf-container">
        <div class="yrf-header">
          <h2>屋島総合病院 FAX診療申込書</h2>
          <button class="yrf-close" title="閉じる">&times;</button>
        </div>
        <div class="yrf-body">
          <!-- 屋島総合病院 受診希望 -->
          <div class="yrf-section">
            <div class="yrf-section-title">屋島総合病院 受診希望</div>
            <div class="yrf-row">
              <div class="yrf-field">
                <label>受診希望科</label>
                <select id="yrf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="yrf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="yrf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="yrf-combobox-input" id="yrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="yrf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="yrf-combobox-dropdown" id="yrf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="yrf-btn yrf-btn-link" id="yrf-open-schedule" title="外来診療担当表を見る">外来表</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 希望来院日 -->
          <div class="yrf-section">
            <div class="yrf-section-title">希望来院日</div>
            <div class="yrf-row">
              <div class="yrf-field">
                <label>希望日</label>
                <input type="date" id="yrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="yrf-field">
                <label>希望時間</label>
                <div class="yrf-time-row">
                  <select id="yrf-hope-time-hour">
                    <option value="">時</option>
                    ${hourOptions.map(h => `
                      <option value="${h}" ${formData.hope_time_hour === String(h) ? 'selected' : ''}>${h}</option>
                    `).join('')}
                  </select>
                  <span>時</span>
                  <select id="yrf-hope-time-minute">
                    <option value="">分</option>
                    ${minuteOptions.map(m => `
                      <option value="${m}" ${formData.hope_time_minute === m ? 'selected' : ''}>${m}</option>
                    `).join('')}
                  </select>
                  <span>分</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="yrf-section">
            <div class="yrf-section-title">屋島総合病院 受診歴</div>
            <div class="yrf-radio-group">
              <div class="yrf-radio-item">
                <input type="radio" name="yrf-visit-history" id="yrf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="yrf-visit-yes">有</label>
              </div>
              <div class="yrf-radio-item">
                <input type="radio" name="yrf-visit-history" id="yrf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="yrf-visit-no">無</label>
              </div>
              <div class="yrf-radio-item">
                <input type="radio" name="yrf-visit-history" id="yrf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="yrf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 主訴又は傷病名 -->
          <div class="yrf-section">
            <div class="yrf-section-title">主訴又は傷病名</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="yrf-diseases-list" class="yrf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="yrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="yrf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="yrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="yrf-field">
              <label>自由記述</label>
              <textarea id="yrf-diagnosis-text" placeholder="主訴又は傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

          <!-- 新型コロナ問診 -->
          <div class="yrf-section yrf-covid-section">
            <div class="yrf-section-title">新型コロナウイルス感染症への対策</div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">①</span>2ヶ月以内に、コロナに感染しましたか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-infected" id="yrf-covid-infected-no" value="no" ${formData.covid_infected === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-infected-no">いいえ</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-infected" id="yrf-covid-infected-yes" value="yes" ${formData.covid_infected === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-infected-yes">はい</label>
                </div>
              </div>
              <span style="font-size: 13px;">診断日:</span>
              <input type="date" id="yrf-covid-infected-date" value="${escapeHtml(formData.covid_infected_date)}" ${formData.covid_infected !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">②</span>2週間以内に、コロナ感染者との接触や、発生施設等との関連がありませんか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-contact" id="yrf-covid-contact-no" value="no" ${formData.covid_contact === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-contact-no">なし</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-contact" id="yrf-covid-contact-yes" value="yes" ${formData.covid_contact === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-contact-yes">あり</label>
                </div>
              </div>
              <input type="text" id="yrf-covid-contact-detail" value="${escapeHtml(formData.covid_contact_detail)}" placeholder="詳細" ${formData.covid_contact !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">③</span>2週間以内に、同居家族以外との会食、大勢が集まるイベントなどへの参加はありませんか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-gathering" id="yrf-covid-gathering-no" value="no" ${formData.covid_gathering === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-gathering-no">なし</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-gathering" id="yrf-covid-gathering-yes" value="yes" ${formData.covid_gathering === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-gathering-yes">あり</label>
                </div>
              </div>
              <input type="text" id="yrf-covid-gathering-detail" value="${escapeHtml(formData.covid_gathering_detail)}" placeholder="詳細" ${formData.covid_gathering !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">④</span>1週間以内に、37度以上の発熱、咳、のどの痛み、鼻みず、嘔吐・下痢等の症状はありませんか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-symptoms" id="yrf-covid-symptoms-no" value="no" ${formData.covid_symptoms === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-symptoms-no">なし</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-symptoms" id="yrf-covid-symptoms-yes" value="yes" ${formData.covid_symptoms === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-symptoms-yes">あり</label>
                </div>
              </div>
              <input type="text" id="yrf-covid-symptoms-detail" value="${escapeHtml(formData.covid_symptoms_detail)}" placeholder="詳細" ${formData.covid_symptoms !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">⑤</span>コロナワクチン接種状況</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-vaccine" id="yrf-covid-vaccine-done" value="done" ${formData.covid_vaccine === 'done' ? 'checked' : ''}>
                  <label for="yrf-covid-vaccine-done">済</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-vaccine" id="yrf-covid-vaccine-not" value="not" ${formData.covid_vaccine === 'not' ? 'checked' : ''}>
                  <label for="yrf-covid-vaccine-not">未</label>
                </div>
              </div>
              <span style="font-size: 13px;">最終:</span>
              <input type="text" id="yrf-covid-vaccine-year" value="${escapeHtml(formData.covid_vaccine_year)}" placeholder="年" style="width: 60px;" ${formData.covid_vaccine !== 'done' ? 'disabled' : ''}>
              <span style="font-size: 13px;">年</span>
              <input type="text" id="yrf-covid-vaccine-month" value="${escapeHtml(formData.covid_vaccine_month)}" placeholder="月" style="width: 50px;" ${formData.covid_vaccine !== 'done' ? 'disabled' : ''}>
              <span style="font-size: 13px;">月頃</span>
            </div>
          </div>
        </div>
        <div class="yrf-footer">
          <div class="yrf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="yrf-footer-right">
            <button class="yrf-btn yrf-btn-secondary" id="yrf-save-draft">下書き保存</button>
            <button class="yrf-btn yrf-btn-primary" id="yrf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.yrf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 外来診療担当表ボタン
    modal.querySelector('#yrf-open-schedule').addEventListener('click', () => {
      window.open('https://www.yashima-hp.com/outpatient/doctor/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#yrf-dest-department');
    const doctorInput = modal.querySelector('#yrf-dest-doctor');
    const doctorDropdown = modal.querySelector('#yrf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.yrf-combobox[data-field="doctor"]');

    function closeAllDropdowns() {
      modal.querySelectorAll('.yrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="yrf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="yrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getYashimaDoctors(deptName);
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    deptSelect.addEventListener('change', () => {
      const hasValue = !!deptSelect.value;
      doctorInput.disabled = !hasValue;
      doctorCombobox.querySelector('.yrf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    doctorCombobox.querySelector('.yrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.yrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.yrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // コロナ問診の連動
    modal.querySelectorAll('input[name="yrf-covid-infected"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const dateInput = modal.querySelector('#yrf-covid-infected-date');
        dateInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (dateInput.disabled) dateInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-contact"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const detailInput = modal.querySelector('#yrf-covid-contact-detail');
        detailInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (detailInput.disabled) detailInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-gathering"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const detailInput = modal.querySelector('#yrf-covid-gathering-detail');
        detailInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (detailInput.disabled) detailInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-symptoms"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const detailInput = modal.querySelector('#yrf-covid-symptoms-detail');
        detailInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (detailInput.disabled) detailInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-vaccine"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isDone = radio.value === 'done' && radio.checked;
        const yearInput = modal.querySelector('#yrf-covid-vaccine-year');
        const monthInput = modal.querySelector('#yrf-covid-vaccine-month');
        yearInput.disabled = !isDone;
        monthInput.disabled = !isDone;
        if (!isDone) {
          yearInput.value = '';
          monthInput.value = '';
        }
      });
    });

    // 下書き保存
    modal.querySelector('#yrf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#yrf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#yrf-generate');
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

    // 屋島総合病院固有
    data.destination_department = modal.querySelector('#yrf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#yrf-dest-doctor')?.value || '';

    // 希望来院日・時間
    data.hope_date_1 = modal.querySelector('#yrf-hope-date-1')?.value || '';
    data.hope_time_hour = modal.querySelector('#yrf-hope-time-hour')?.value || '';
    data.hope_time_minute = modal.querySelector('#yrf-hope-time-minute')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="yrf-visit-history"]:checked')?.value || 'unknown';

    // 病名
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#yrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#yrf-diagnosis-text')?.value || '';

    // コロナ問診
    data.covid_infected = modal.querySelector('input[name="yrf-covid-infected"]:checked')?.value || 'no';
    data.covid_infected_date = modal.querySelector('#yrf-covid-infected-date')?.value || '';
    data.covid_contact = modal.querySelector('input[name="yrf-covid-contact"]:checked')?.value || 'no';
    data.covid_contact_detail = modal.querySelector('#yrf-covid-contact-detail')?.value || '';
    data.covid_gathering = modal.querySelector('input[name="yrf-covid-gathering"]:checked')?.value || 'no';
    data.covid_gathering_detail = modal.querySelector('#yrf-covid-gathering-detail')?.value || '';
    data.covid_symptoms = modal.querySelector('input[name="yrf-covid-symptoms"]:checked')?.value || 'no';
    data.covid_symptoms_detail = modal.querySelector('#yrf-covid-symptoms-detail')?.value || '';
    data.covid_vaccine = modal.querySelector('input[name="yrf-covid-vaccine"]:checked')?.value || 'done';
    data.covid_vaccine_year = modal.querySelector('#yrf-covid-vaccine-year')?.value || '';
    data.covid_vaccine_month = modal.querySelector('#yrf-covid-vaccine-month')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    const HenryCore = pageWindow.HenryCore;
    const spinner = HenryCore?.ui?.showSpinner?.('Google Docsを生成中...');

    try {
      const googleAuth = getGoogleAuth();
      await googleAuth.getValidAccessToken();

      const folder = await DriveAPI.getOrCreateFolder(TEMPLATE_CONFIG.OUTPUT_FOLDER_NAME);

      const fileName = `FAX診療申込書_屋島総合病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'yashima-referral-form'
      };
      const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

      // 主訴又は傷病名テキスト作成
      const diagnosisParts = [];
      if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
        const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
        const diseaseText = selectedDiseases.map(d => d.name + (d.isSuspected ? '（疑い）' : '')).join('，');
        if (diseaseText) {
          diagnosisParts.push(diseaseText);
        }
      }
      if (formData.diagnosis_text) {
        diagnosisParts.push(formData.diagnosis_text);
      }
      const diagnosisText = diagnosisParts.join('\n');

      // 受診歴テキスト
      let visitHistoryText = '';
      if (formData.visit_history === 'yes') {
        visitHistoryText = '有';
      } else if (formData.visit_history === 'no') {
        visitHistoryText = '無';
      } else {
        visitHistoryText = '不明';
      }

      // 希望来院日・時間
      const hopeDateText = formatHopeDate(formData.hope_date_1);
      let hopeTimeText = '';
      if (formData.hope_time_hour && formData.hope_time_minute) {
        hopeTimeText = `${formData.hope_time_hour}時${formData.hope_time_minute}分`;
      }

      // コロナ問診テキスト
      // ①感染歴
      let covidInfectedText = formData.covid_infected === 'yes' ? 'はい' : 'いいえ';
      if (formData.covid_infected === 'yes' && formData.covid_infected_date) {
        const d = new Date(formData.covid_infected_date);
        covidInfectedText += `　診断日（${d.getMonth() + 1}月${d.getDate()}日）`;
      }

      // ②接触歴
      let covidContactText = formData.covid_contact === 'yes' ? 'あり' : 'なし';
      if (formData.covid_contact === 'yes' && formData.covid_contact_detail) {
        covidContactText += `（${formData.covid_contact_detail}）`;
      }

      // ③会食等
      let covidGatheringText = formData.covid_gathering === 'yes' ? 'あり' : 'なし';
      if (formData.covid_gathering === 'yes' && formData.covid_gathering_detail) {
        covidGatheringText += `（${formData.covid_gathering_detail}）`;
      }

      // ④風邪症状
      let covidSymptomsText = formData.covid_symptoms === 'yes' ? 'あり' : 'なし';
      if (formData.covid_symptoms === 'yes' && formData.covid_symptoms_detail) {
        covidSymptomsText += `（${formData.covid_symptoms_detail}）`;
      }

      // ⑤ワクチン接種
      let covidVaccineText = formData.covid_vaccine === 'done' ? '済' : '未';
      if (formData.covid_vaccine === 'done' && formData.covid_vaccine_year) {
        covidVaccineText += `　最終（${formData.covid_vaccine_year}年${formData.covid_vaccine_month || ''}月頃）`;
      }

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{ふりがな}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{年齢}}', formData.age + '歳'),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', formData.destination_department),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', hopeDateText),
        DocsAPI.createReplaceTextRequest('{{希望来院時間}}', hopeTimeText),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{主訴または傷病名}}', diagnosisText),
        DocsAPI.createReplaceTextRequest('{{感染ありなし}}', covidInfectedText),
        DocsAPI.createReplaceTextRequest('{{接触ありなし}}', covidContactText),
        DocsAPI.createReplaceTextRequest('{{会食等ありなし}}', covidGatheringText),
        DocsAPI.createReplaceTextRequest('{{風邪症状ありなし}}', covidSymptomsText),
        DocsAPI.createReplaceTextRequest('{{ワクチン接種済未}}', covidVaccineText)
      ];

      await DocsAPI.batchUpdate(newDoc.id, requests);

      spinner?.close();

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

    await pageWindow.HenryCore.registerPlugin({
      id: 'yashima-referral-form',
      name: '診療申込書（屋島総合病院）',
      icon: '🏥',
      description: '屋島総合病院へのFAX診療申込書を作成',
      version: VERSION,
      order: 220,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showYashimaForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
