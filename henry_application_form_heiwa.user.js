// ==UserScript==
// @name         高松平和病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.3.1
// @description  高松平和病院への診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_heiwa.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_heiwa.user.js
// ==/UserScript==

/*
 * 【高松平和病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - 高松平和病院への診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 高松平和病院固有の入力項目
 *    - 診療科（内科/整形外科/乳腺外科/検査）
 *    - 希望医師名
 *    - 第1〜3希望日
 *    - 内視鏡検査（上部/大腸）
 *    - 放射線検査（CT/MRI）
 *    - 超音波検査
 *    - コロナウイルス対策
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: 高松平和病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'HeiwaReferralForm';
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
    TEMPLATE_ID: '1fYGffOVDrurJyLPWZh9nokDexZh7Rg4tgzEJ1VeGmo8',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 高松平和病院固定
  const HOSPITAL_NAME = '高松平和病院';

  // 外来担当表URL
  const SCHEDULE_URL = 'https://t-heiwa.com/doctor/';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_heiwa_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 診療科リスト（PDFの選択肢に従う）
  // ※henry_hospitalsのデータとは異なる（紹介用フォーム専用）
  // ※「検査」はpurpose_typeで別管理
  const DEPARTMENTS = ['内科', '整形外科', '乳腺外科'];

  // 超音波検査の種類
  const ULTRASOUND_TYPES = ['腹部', '心', '下肢動脈', '頚動脈', '甲状腺'];

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
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  /**
   * 高松平和病院の診療科別医師を取得
   * @param {string} departmentName - 診療科名
   * @returns {string[]} 医師名の配列
   */
  function getHeiwaDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName || departmentName === '検査') return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName) || [];
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

  /**
   * 生年月日の和暦フォーマット
   * 例: 昭和60年5月10日
   */
  function toBirthDateWareki(year, month, day) {
    if (!year) return '';
    return toWareki(year, month, day);
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
   * 希望日のフォーマット: "○月○日（曜日）"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日（${weekdays[d.getDay()]}）`;
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
        birth_date_wareki: birthYear ? toBirthDateWareki(birthYear, birthMonth, birthDay) : '',
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
          const mods = d.masterModifiers || [];
          const prefixes = mods.filter(m => m.position === 'PREFIX').map(m => m.name.replace(/^・/, '')).join('');
          const suffixes = mods.filter(m => m.position === 'SUFFIX').map(m => m.name.replace(/^・/, '')).join('');
          const baseName = d.customDiseaseName?.value || d.masterDisease?.name || '';
          return {
            uuid: d.uuid,
            name: prefixes + baseName + suffixes,
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
  // フォーム表示
  // ==========================================

  async function showHeiwaForm() {
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

        // 高松平和病院固有
        purpose_type: 'consultation', // 'consultation'（診察）または 'test'（検査）
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_date_2: '',
        hope_date_3: '',

        // 内視鏡検査
        upper_endoscopy: false,
        upper_endoscopy_method: 'nasal',
        upper_endoscopy_sedation: 'no',
        upper_endoscopy_anticoagulant: 'no',
        upper_endoscopy_anticoagulant_name: '',
        lower_endoscopy: false,

        // 放射線検査
        radiology_exam: false,
        radiology_type: 'ct',
        radiology_site: '',
        radiology_contrast: 'no',
        radiology_cr: '',
        radiology_exam_date: '',
        radiology_diabetes_med: 'no',
        radiology_diabetes_med_name: '',
        radiology_media: 'cd',
        radiology_result_delivery: 'patient',

        // 超音波検査
        ultrasound_types: [],
        ultrasound_result_delivery: 'patient',

        // コロナ対策
        covid_travel: 'no',
        covid_contact: 'no',
        covid_symptoms: 'no',

        // その他
        other_notes: ''
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_name_kana = patientInfo.patient_name_kana;
      formData.birth_date_wareki = patientInfo.birth_date_wareki;
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
    const existingModal = document.getElementById('heiwa-form-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'heiwa-form-modal';
    modal.innerHTML = `
      <style>
        #heiwa-form-modal {
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
        .hrf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .hrf-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .hrf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .hrf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .hrf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .hrf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .hrf-section {
          margin-bottom: 24px;
        }
        .hrf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: ${THEME.primary};
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid ${THEME.primaryLight};
        }
        .hrf-section-title.collapsible {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hrf-section-title.collapsible::before {
          content: '▼';
          font-size: 12px;
          transition: transform 0.2s;
        }
        .hrf-section-title.collapsible.collapsed::before {
          transform: rotate(-90deg);
        }
        .hrf-section-content {
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .hrf-section-content.collapsed {
          max-height: 0;
          padding: 0;
        }
        .hrf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .hrf-field {
          flex: 1;
        }
        .hrf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .hrf-field input, .hrf-field textarea, .hrf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .hrf-field input:focus, .hrf-field textarea:focus, .hrf-field select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
        }
        .hrf-field select {
          background: #fff;
          cursor: pointer;
        }
        .hrf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .hrf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .hrf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .hrf-combobox {
          position: relative;
        }
        .hrf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .hrf-combobox-input:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
        }
        .hrf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .hrf-combobox-toggle {
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
        .hrf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .hrf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .hrf-combobox-dropdown {
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
        .hrf-combobox-dropdown.open {
          display: block;
        }
        .hrf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .hrf-combobox-option:hover {
          background: ${THEME.accent};
        }
        .hrf-combobox-option.selected {
          background: ${THEME.primaryLight};
          color: ${THEME.primaryDark};
        }
        .hrf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .hrf-checkbox-group {
          margin-top: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .hrf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .hrf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .hrf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .hrf-checkbox-item.main-disease {
          background: ${THEME.accent};
          border: 1px solid ${THEME.primaryLight};
        }
        .hrf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .hrf-radio-group.vertical {
          flex-direction: column;
          gap: 8px;
        }
        .hrf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .hrf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .hrf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .hrf-inline-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .hrf-inline-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .hrf-inline-checkbox label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin: 0;
        }
        .hrf-conditional-field {
          margin-top: 8px;
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          display: none;
        }
        .hrf-conditional-field.visible {
          display: block;
        }
        .hrf-subsection {
          margin-top: 12px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 3px solid ${THEME.primaryLight};
        }
        .hrf-subsection-title {
          font-size: 14px;
          font-weight: 600;
          color: #555;
          margin-bottom: 12px;
        }
        .hrf-multi-checkbox {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }
        .hrf-multi-checkbox .hrf-checkbox-item {
          flex: 0 0 auto;
          margin-bottom: 0;
        }
        .hrf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .hrf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .hrf-footer-right {
          display: flex;
          gap: 12px;
        }
        .hrf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hrf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .hrf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .hrf-btn-primary {
          background: ${THEME.primary};
          color: white;
        }
        .hrf-btn-primary:hover {
          background: ${THEME.primaryDark};
        }
        .hrf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .hrf-btn-link {
          background: ${THEME.accent};
          color: ${THEME.primary};
          border: 1px solid ${THEME.primaryLight};
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .hrf-btn-link:hover {
          background: ${THEME.primaryLight};
        }
        .hrf-note {
          background: #fff3e0;
          border: 1px solid #ffb74d;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 12px;
          font-size: 13px;
          color: #e65100;
        }
      </style>
      <div class="hrf-container">
        <div class="hrf-header">
          <h2>高松平和病院 診療申込書</h2>
          <button class="hrf-close" title="閉じる">&times;</button>
        </div>
        <div class="hrf-body">
          <!-- 診察・検査 -->
          <div class="hrf-section">
            <div class="hrf-section-title">診察・検査</div>
            <div class="hrf-note">
              <strong>緩和ケア紹介について：</strong>緩和ケアへの紹介をご希望の場合は、代表番号（087-833-8113）へご連絡ください。
            </div>
            <div class="hrf-row">
              <div class="hrf-field">
                <label>診察・検査</label>
                <div class="hrf-radio-group">
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-purpose-type" id="hrf-purpose-consultation" value="consultation"
                      ${formData.purpose_type !== 'test' ? 'checked' : ''}>
                    <label for="hrf-purpose-consultation">診察</label>
                  </div>
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-purpose-type" id="hrf-purpose-test" value="test"
                      ${formData.purpose_type === 'test' ? 'checked' : ''}>
                    <label for="hrf-purpose-test">検査</label>
                  </div>
                </div>
              </div>
            </div>
            <div id="hrf-consultation-fields" style="${formData.purpose_type === 'test' ? 'display: none;' : ''}">
              <div class="hrf-row">
                <div class="hrf-field">
                  <label>診療科</label>
                  <select id="hrf-dest-department">
                    <option value="">選択してください</option>
                    ${DEPARTMENTS.map(dept => `
                      <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                        ${escapeHtml(dept)}
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="hrf-field" id="hrf-doctor-field">
                  <label>希望医師名</label>
                  <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <div class="hrf-combobox" data-field="doctor" style="flex: 1;">
                      <input type="text" class="hrf-combobox-input" id="hrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力">
                      <button type="button" class="hrf-combobox-toggle" title="リストから選択">▼</button>
                      <div class="hrf-combobox-dropdown" id="hrf-doctor-dropdown"></div>
                    </div>
                    <button type="button" class="hrf-btn hrf-btn-link" id="hrf-open-schedule" title="外来担当表を見る">外来表</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 希望日 -->
          <div class="hrf-section">
            <div class="hrf-section-title">受診希望日</div>
            <div class="hrf-row">
              <div class="hrf-field">
                <label>第1希望日</label>
                <input type="date" id="hrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="hrf-field">
                <label>第2希望日</label>
                <input type="date" id="hrf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
              </div>
              <div class="hrf-field">
                <label>第3希望日</label>
                <input type="date" id="hrf-hope-date-3" value="${escapeHtml(formData.hope_date_3)}">
              </div>
            </div>
          </div>

          <!-- 主訴または傷病名 -->
          <div class="hrf-section">
            <div class="hrf-section-title">主訴または傷病名</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="hrf-diseases-list" class="hrf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="hrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="hrf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="hrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="hrf-field">
              <label>自由記述</label>
              <textarea id="hrf-diagnosis-text" placeholder="主訴や追加の傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

          <!-- 検査項目（検査選択時のみ表示） -->
          <div id="hrf-test-sections" style="${formData.purpose_type !== 'test' ? 'display: none;' : ''}">
          <!-- 内視鏡検査 -->
          <div class="hrf-section">
            <div class="hrf-section-title collapsible" data-target="hrf-endoscopy-content">内視鏡検査</div>
            <div class="hrf-section-content" id="hrf-endoscopy-content">
              <!-- 上部内視鏡検査 -->
              <div class="hrf-subsection">
                <div class="hrf-inline-checkbox">
                  <input type="checkbox" id="hrf-upper-endoscopy" ${formData.upper_endoscopy ? 'checked' : ''}>
                  <label for="hrf-upper-endoscopy">上部内視鏡検査</label>
                </div>
                <div class="hrf-conditional-field ${formData.upper_endoscopy ? 'visible' : ''}" id="hrf-upper-endoscopy-detail">
                  <div class="hrf-row">
                    <div class="hrf-field">
                      <label>実施方法</label>
                      <div class="hrf-radio-group">
                        <div class="hrf-radio-item">
                          <input type="radio" name="hrf-upper-method" id="hrf-upper-nasal" value="nasal"
                            ${formData.upper_endoscopy_method !== 'oral' ? 'checked' : ''}>
                          <label for="hrf-upper-nasal">経鼻</label>
                        </div>
                        <div class="hrf-radio-item">
                          <input type="radio" name="hrf-upper-method" id="hrf-upper-oral" value="oral"
                            ${formData.upper_endoscopy_method === 'oral' ? 'checked' : ''}>
                          <label for="hrf-upper-oral">経口</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="hrf-conditional-field ${formData.upper_endoscopy_method === 'oral' ? 'visible' : ''}" id="hrf-sedation-field">
                    <div class="hrf-field">
                      <label>鎮静剤使用</label>
                      <div class="hrf-radio-group">
                        <div class="hrf-radio-item">
                          <input type="radio" name="hrf-sedation" id="hrf-sedation-no" value="no"
                            ${formData.upper_endoscopy_sedation !== 'yes' ? 'checked' : ''}>
                          <label for="hrf-sedation-no">なし</label>
                        </div>
                        <div class="hrf-radio-item">
                          <input type="radio" name="hrf-sedation" id="hrf-sedation-yes" value="yes"
                            ${formData.upper_endoscopy_sedation === 'yes' ? 'checked' : ''}>
                          <label for="hrf-sedation-yes">あり</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="hrf-row" style="margin-top: 12px;">
                    <div class="hrf-field">
                      <label>抗血栓剤投薬</label>
                      <div class="hrf-radio-group">
                        <div class="hrf-radio-item">
                          <input type="radio" name="hrf-anticoagulant" id="hrf-anticoagulant-no" value="no"
                            ${formData.upper_endoscopy_anticoagulant !== 'yes' ? 'checked' : ''}>
                          <label for="hrf-anticoagulant-no">なし</label>
                        </div>
                        <div class="hrf-radio-item">
                          <input type="radio" name="hrf-anticoagulant" id="hrf-anticoagulant-yes" value="yes"
                            ${formData.upper_endoscopy_anticoagulant === 'yes' ? 'checked' : ''}>
                          <label for="hrf-anticoagulant-yes">あり</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="hrf-conditional-field ${formData.upper_endoscopy_anticoagulant === 'yes' ? 'visible' : ''}" id="hrf-anticoagulant-name-field">
                    <div class="hrf-field">
                      <label>薬剤名</label>
                      <input type="text" id="hrf-anticoagulant-name" value="${escapeHtml(formData.upper_endoscopy_anticoagulant_name)}" placeholder="例: ワーファリン">
                    </div>
                  </div>
                </div>
              </div>

              <!-- 大腸内視鏡検査 -->
              <div class="hrf-subsection" style="margin-top: 16px;">
                <div class="hrf-inline-checkbox">
                  <input type="checkbox" id="hrf-lower-endoscopy" ${formData.lower_endoscopy ? 'checked' : ''}>
                  <label for="hrf-lower-endoscopy">大腸内視鏡検査</label>
                </div>
                <div class="hrf-note" style="margin-top: 8px; margin-bottom: 0;">
                  ※大腸内視鏡検査は内科診察後に予約となります
                </div>
              </div>
            </div>
          </div>

          <!-- 放射線検査 -->
          <div class="hrf-section">
            <div class="hrf-section-title collapsible" data-target="hrf-radiology-content">放射線検査</div>
            <div class="hrf-section-content" id="hrf-radiology-content">
              <div class="hrf-inline-checkbox">
                <input type="checkbox" id="hrf-radiology-exam" ${formData.radiology_exam ? 'checked' : ''}>
                <label for="hrf-radiology-exam">放射線検査を希望</label>
              </div>
              <div class="hrf-conditional-field ${formData.radiology_exam ? 'visible' : ''}" id="hrf-radiology-detail">
                <div class="hrf-row">
                  <div class="hrf-field">
                    <label>検査種類</label>
                    <div class="hrf-radio-group">
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-radiology-type" id="hrf-radiology-ct" value="ct"
                          ${formData.radiology_type !== 'mri' ? 'checked' : ''}>
                        <label for="hrf-radiology-ct">CT</label>
                      </div>
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-radiology-type" id="hrf-radiology-mri" value="mri"
                          ${formData.radiology_type === 'mri' ? 'checked' : ''}>
                        <label for="hrf-radiology-mri">MRI（1.5テスラ）</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="hrf-row">
                  <div class="hrf-field">
                    <label>部位</label>
                    <input type="text" id="hrf-radiology-site" value="${escapeHtml(formData.radiology_site)}" placeholder="例: 胸部、腹部、頭部">
                  </div>
                </div>
                <div class="hrf-row">
                  <div class="hrf-field">
                    <label>造影剤</label>
                    <div class="hrf-radio-group">
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-contrast" id="hrf-contrast-no" value="no"
                          ${formData.radiology_contrast !== 'yes' ? 'checked' : ''}>
                        <label for="hrf-contrast-no">なし</label>
                      </div>
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-contrast" id="hrf-contrast-yes" value="yes"
                          ${formData.radiology_contrast === 'yes' ? 'checked' : ''}>
                        <label for="hrf-contrast-yes">あり</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="hrf-conditional-field ${formData.radiology_contrast === 'yes' ? 'visible' : ''}" id="hrf-contrast-detail">
                  <div class="hrf-row">
                    <div class="hrf-field" style="flex: 0.5;">
                      <label>Cr（クレアチニン値）</label>
                      <input type="text" id="hrf-radiology-cr" value="${escapeHtml(formData.radiology_cr)}" placeholder="例: 0.8">
                    </div>
                    <div class="hrf-field" style="flex: 0.5;">
                      <label>検査日</label>
                      <input type="date" id="hrf-radiology-exam-date" value="${escapeHtml(formData.radiology_exam_date)}">
                    </div>
                  </div>
                </div>
                <div class="hrf-row" style="margin-top: 12px;">
                  <div class="hrf-field">
                    <label>糖尿病薬服用</label>
                    <div class="hrf-radio-group">
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-diabetes-med" id="hrf-diabetes-med-no" value="no"
                          ${formData.radiology_diabetes_med !== 'yes' ? 'checked' : ''}>
                        <label for="hrf-diabetes-med-no">なし</label>
                      </div>
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-diabetes-med" id="hrf-diabetes-med-yes" value="yes"
                          ${formData.radiology_diabetes_med === 'yes' ? 'checked' : ''}>
                        <label for="hrf-diabetes-med-yes">あり</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="hrf-conditional-field ${formData.radiology_diabetes_med === 'yes' ? 'visible' : ''}" id="hrf-diabetes-med-name-field">
                  <div class="hrf-field">
                    <label>薬剤名</label>
                    <input type="text" id="hrf-diabetes-med-name" value="${escapeHtml(formData.radiology_diabetes_med_name)}" placeholder="例: メトホルミン">
                  </div>
                </div>
                <div class="hrf-row" style="margin-top: 12px;">
                  <div class="hrf-field">
                    <label>結果の媒体</label>
                    <div class="hrf-radio-group">
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-media" id="hrf-media-cd" value="cd"
                          ${formData.radiology_media !== 'film' ? 'checked' : ''}>
                        <label for="hrf-media-cd">CD-R</label>
                      </div>
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-media" id="hrf-media-film" value="film"
                          ${formData.radiology_media === 'film' ? 'checked' : ''}>
                        <label for="hrf-media-film">フィルム</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="hrf-row" style="margin-top: 12px;">
                  <div class="hrf-field">
                    <label>放射線所見の伝達</label>
                    <div class="hrf-radio-group">
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-radiology-delivery" id="hrf-radiology-patient" value="patient"
                          ${formData.radiology_result_delivery !== 'mail' ? 'checked' : ''}>
                        <label for="hrf-radiology-patient">患者様持ち帰り</label>
                      </div>
                      <div class="hrf-radio-item">
                        <input type="radio" name="hrf-radiology-delivery" id="hrf-radiology-mail" value="mail"
                          ${formData.radiology_result_delivery === 'mail' ? 'checked' : ''}>
                        <label for="hrf-radiology-mail">郵送</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 超音波検査 -->
          <div class="hrf-section">
            <div class="hrf-section-title collapsible" data-target="hrf-ultrasound-content">超音波検査</div>
            <div class="hrf-section-content" id="hrf-ultrasound-content">
              <div class="hrf-field">
                <label>検査種類（複数選択可）</label>
                <div class="hrf-multi-checkbox">
                  ${ULTRASOUND_TYPES.map(type => `
                    <div class="hrf-checkbox-item">
                      <input type="checkbox" id="hrf-us-${type}" value="${type}"
                        ${formData.ultrasound_types?.includes(type) ? 'checked' : ''}>
                      <label for="hrf-us-${type}">${type}エコー</label>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="hrf-row" style="margin-top: 12px;">
                <div class="hrf-field">
                  <label>所見の伝達</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-us-delivery" id="hrf-us-patient" value="patient"
                        ${formData.ultrasound_result_delivery !== 'mail' ? 'checked' : ''}>
                      <label for="hrf-us-patient">患者様持ち帰り</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-us-delivery" id="hrf-us-mail" value="mail"
                        ${formData.ultrasound_result_delivery === 'mail' ? 'checked' : ''}>
                      <label for="hrf-us-mail">郵送</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div><!-- /hrf-test-sections -->

          <!-- コロナウイルス対策 -->
          <div class="hrf-section">
            <div class="hrf-section-title collapsible" data-target="hrf-covid-content">コロナウイルス対策</div>
            <div class="hrf-section-content" id="hrf-covid-content">
              <div class="hrf-row">
                <div class="hrf-field">
                  <label>2週間以内の海外渡航歴、県外訪問歴</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-covid-travel" id="hrf-covid-travel-no" value="no"
                        ${formData.covid_travel !== 'yes' ? 'checked' : ''}>
                      <label for="hrf-covid-travel-no">なし</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-covid-travel" id="hrf-covid-travel-yes" value="yes"
                        ${formData.covid_travel === 'yes' ? 'checked' : ''}>
                      <label for="hrf-covid-travel-yes">あり</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="hrf-row">
                <div class="hrf-field">
                  <label>2週間以内の感染者との接触歴</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-covid-contact" id="hrf-covid-contact-no" value="no"
                        ${formData.covid_contact !== 'yes' ? 'checked' : ''}>
                      <label for="hrf-covid-contact-no">なし</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-covid-contact" id="hrf-covid-contact-yes" value="yes"
                        ${formData.covid_contact === 'yes' ? 'checked' : ''}>
                      <label for="hrf-covid-contact-yes">あり</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="hrf-row">
                <div class="hrf-field">
                  <label>発熱、咳、息切れなどの症状</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-covid-symptoms" id="hrf-covid-symptoms-no" value="no"
                        ${formData.covid_symptoms !== 'yes' ? 'checked' : ''}>
                      <label for="hrf-covid-symptoms-no">なし</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-covid-symptoms" id="hrf-covid-symptoms-yes" value="yes"
                        ${formData.covid_symptoms === 'yes' ? 'checked' : ''}>
                      <label for="hrf-covid-symptoms-yes">あり</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- その他 -->
          <div class="hrf-section">
            <div class="hrf-section-title">その他</div>
            <div class="hrf-field">
              <textarea id="hrf-other-notes" placeholder="その他の連絡事項があれば入力">${escapeHtml(formData.other_notes)}</textarea>
            </div>
          </div>
        </div>
        <div class="hrf-footer">
          <div class="hrf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="hrf-footer-right">
            <button class="hrf-btn hrf-btn-secondary" id="hrf-save-draft">下書き保存</button>
            <button class="hrf-btn hrf-btn-primary" id="hrf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    setupEventListeners(modal, formData);
  }

  function setupEventListeners(modal, formData) {
    // 閉じるボタン
    modal.querySelector('.hrf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 折りたたみセクション
    modal.querySelectorAll('.hrf-section-title.collapsible').forEach(title => {
      title.addEventListener('click', () => {
        const targetId = title.dataset.target;
        const content = modal.querySelector(`#${targetId}`);
        title.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      });
    });

    // 外来担当表リンク
    modal.querySelector('#hrf-open-schedule').addEventListener('click', () => {
      window.open(SCHEDULE_URL, '_blank');
    });

    // 診察・検査ラジオボタン
    const consultationFields = modal.querySelector('#hrf-consultation-fields');
    const testSections = modal.querySelector('#hrf-test-sections');
    modal.querySelectorAll('input[name="hrf-purpose-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'test') {
          consultationFields.style.display = 'none';
          testSections.style.display = '';
        } else {
          consultationFields.style.display = '';
          testSections.style.display = 'none';
        }
      });
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#hrf-dest-department');
    const doctorInput = modal.querySelector('#hrf-dest-doctor');
    const doctorDropdown = modal.querySelector('#hrf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.hrf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.hrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="hrf-combobox-empty">選択肢がありません（手入力可）</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="hrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getHeiwaDoctors(deptName);
      // 「担当医」を常に追加
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    // 診療科変更時
    deptSelect.addEventListener('change', () => {
      const deptValue = deptSelect.value;
      // 乳腺外科は医師リストがないため「担当医」をデフォルト設定
      if (deptValue === '乳腺外科') {
        doctorInput.value = '担当医';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.hrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.hrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.hrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 上部内視鏡検査チェックボックス
    const upperEndoscopy = modal.querySelector('#hrf-upper-endoscopy');
    const upperDetail = modal.querySelector('#hrf-upper-endoscopy-detail');
    upperEndoscopy.addEventListener('change', () => {
      upperDetail.classList.toggle('visible', upperEndoscopy.checked);
    });

    // 上部内視鏡実施方法
    modal.querySelectorAll('input[name="hrf-upper-method"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const sedationField = modal.querySelector('#hrf-sedation-field');
        sedationField.classList.toggle('visible', radio.value === 'oral');
      });
    });

    // 抗血栓剤
    modal.querySelectorAll('input[name="hrf-anticoagulant"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const nameField = modal.querySelector('#hrf-anticoagulant-name-field');
        nameField.classList.toggle('visible', radio.value === 'yes');
      });
    });

    // 放射線検査チェックボックス
    const radiologyExam = modal.querySelector('#hrf-radiology-exam');
    const radiologyDetail = modal.querySelector('#hrf-radiology-detail');
    radiologyExam.addEventListener('change', () => {
      radiologyDetail.classList.toggle('visible', radiologyExam.checked);
    });

    // 造影剤
    modal.querySelectorAll('input[name="hrf-contrast"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const contrastDetail = modal.querySelector('#hrf-contrast-detail');
        contrastDetail.classList.toggle('visible', radio.value === 'yes');
      });
    });

    // 糖尿病薬
    modal.querySelectorAll('input[name="hrf-diabetes-med"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const nameField = modal.querySelector('#hrf-diabetes-med-name-field');
        nameField.classList.toggle('visible', radio.value === 'yes');
      });
    });

    // 下書き保存
    modal.querySelector('#hrf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#hrf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#hrf-generate');
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

    // 診察・検査タイプ
    data.purpose_type = modal.querySelector('input[name="hrf-purpose-type"]:checked')?.value || 'consultation';

    // 診療科・医師（検査の場合は空）
    if (data.purpose_type === 'test') {
      data.destination_department = '';
      data.destination_doctor = '';
    } else {
      data.destination_department = modal.querySelector('#hrf-dest-department')?.value || '';
      data.destination_doctor = modal.querySelector('#hrf-dest-doctor')?.value || '';
      // 診察の場合は検査項目をリセット
      data.upper_endoscopy = false;
      data.lower_endoscopy = false;
      data.radiology_exam = false;
      data.ultrasound_types = [];
    }

    // 希望日
    data.hope_date_1 = modal.querySelector('#hrf-hope-date-1')?.value || '';
    data.hope_date_2 = modal.querySelector('#hrf-hope-date-2')?.value || '';
    data.hope_date_3 = modal.querySelector('#hrf-hope-date-3')?.value || '';

    // 病名
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#hrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#hrf-diagnosis-text')?.value || '';

    // 内視鏡検査
    data.upper_endoscopy = modal.querySelector('#hrf-upper-endoscopy')?.checked || false;
    data.upper_endoscopy_method = modal.querySelector('input[name="hrf-upper-method"]:checked')?.value || 'nasal';
    data.upper_endoscopy_sedation = modal.querySelector('input[name="hrf-sedation"]:checked')?.value || 'no';
    data.upper_endoscopy_anticoagulant = modal.querySelector('input[name="hrf-anticoagulant"]:checked')?.value || 'no';
    data.upper_endoscopy_anticoagulant_name = modal.querySelector('#hrf-anticoagulant-name')?.value || '';
    data.lower_endoscopy = modal.querySelector('#hrf-lower-endoscopy')?.checked || false;

    // 放射線検査
    data.radiology_exam = modal.querySelector('#hrf-radiology-exam')?.checked || false;
    data.radiology_type = modal.querySelector('input[name="hrf-radiology-type"]:checked')?.value || 'ct';
    data.radiology_site = modal.querySelector('#hrf-radiology-site')?.value || '';
    data.radiology_contrast = modal.querySelector('input[name="hrf-contrast"]:checked')?.value || 'no';
    data.radiology_cr = modal.querySelector('#hrf-radiology-cr')?.value || '';
    data.radiology_exam_date = modal.querySelector('#hrf-radiology-exam-date')?.value || '';
    data.radiology_diabetes_med = modal.querySelector('input[name="hrf-diabetes-med"]:checked')?.value || 'no';
    data.radiology_diabetes_med_name = modal.querySelector('#hrf-diabetes-med-name')?.value || '';
    data.radiology_media = modal.querySelector('input[name="hrf-media"]:checked')?.value || 'cd';
    data.radiology_result_delivery = modal.querySelector('input[name="hrf-radiology-delivery"]:checked')?.value || 'patient';

    // 超音波検査
    data.ultrasound_types = [];
    ULTRASOUND_TYPES.forEach(type => {
      const cb = modal.querySelector(`#hrf-us-${type}`);
      if (cb?.checked) {
        data.ultrasound_types.push(type);
      }
    });
    data.ultrasound_result_delivery = modal.querySelector('input[name="hrf-us-delivery"]:checked')?.value || 'patient';

    // コロナ対策
    data.covid_travel = modal.querySelector('input[name="hrf-covid-travel"]:checked')?.value || 'no';
    data.covid_contact = modal.querySelector('input[name="hrf-covid-contact"]:checked')?.value || 'no';
    data.covid_symptoms = modal.querySelector('input[name="hrf-covid-symptoms"]:checked')?.value || 'no';

    // その他
    data.other_notes = modal.querySelector('#hrf-other-notes')?.value || '';

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
      const fileName = `診療申込書_高松平和病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'heiwa-referral-form'
      };
      const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

      // 各プレースホルダーの値を生成

      // 傷病名テキスト
      const diagnosisParts = [];
      if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
        const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
        const diseaseText = selectedDiseases.map(d => d.name + (d.isSuspected ? '（疑い）' : '')).join('、');
        if (diseaseText) {
          diagnosisParts.push(diseaseText);
        }
      }
      if (formData.diagnosis_text) {
        diagnosisParts.push(formData.diagnosis_text);
      }
      const diagnosisText = diagnosisParts.join('\n');

      // 診察・検査目的テキスト
      let purposeText = '';
      if (formData.purpose_type === 'test') {
        // 大腸内視鏡検査は内科診察が必要
        if (formData.lower_endoscopy) {
          purposeText = '検査、内科（大腸内視鏡）';
        } else {
          purposeText = '検査';
        }
      } else {
        const dept = formData.destination_department;
        const doctorName = formData.destination_doctor || '';
        if (dept) {
          purposeText = doctorName ? `${dept}（${doctorName}医師）` : dept;
        }
      }

      // 内視鏡検査テキスト（統合形式）
      let endoscopyText = 'なし';
      const endoscopyParts = [];

      // 上部内視鏡検査
      if (formData.upper_endoscopy) {
        const upperLines = [];
        // 1行目: 検査名と方法
        const method = formData.upper_endoscopy_method === 'oral' ? '経口' : '経鼻';
        let methodDetail = method;
        if (formData.upper_endoscopy_method === 'oral') {
          methodDetail += `、鎮静剤${formData.upper_endoscopy_sedation === 'yes' ? 'あり' : 'なし'}`;
        }
        upperLines.push(`上部内視鏡検査（${methodDetail}）`);

        // 2行目: 抗血栓剤
        if (formData.upper_endoscopy_anticoagulant === 'yes') {
          upperLines.push(`抗血栓剤：あり（${formData.upper_endoscopy_anticoagulant_name || '薬剤名未記入'}）`);
        } else {
          upperLines.push('抗血栓剤：なし');
        }

        endoscopyParts.push(upperLines.join('\n'));
      }

      // 大腸内視鏡検査
      if (formData.lower_endoscopy) {
        endoscopyParts.push('大腸内視鏡検査');
      }

      if (endoscopyParts.length > 0) {
        endoscopyText = endoscopyParts.join('\n');
      }

      // 放射線検査テキスト（統合形式）
      let radiologyText = 'なし';
      if (formData.radiology_exam) {
        const radiologyLines = [];

        // 1行目: 検査種類と部位
        const examType = formData.radiology_type === 'mri' ? 'MRI（1.5テスラ）' : 'CT';
        const site = formData.radiology_site || '部位未記入';
        radiologyLines.push(`${examType}　部位（${site}）`);

        // 2行目: 造影剤
        if (formData.radiology_contrast === 'yes') {
          const cr = formData.radiology_cr || '未記入';
          const examDate = formData.radiology_exam_date ? formatHopeDate(formData.radiology_exam_date) : '未記入';
          radiologyLines.push(`造影剤：あり（Cr ${cr} mg/dl、検査日 ${examDate}）`);
        } else {
          radiologyLines.push('造影剤：なし');
        }

        // 3行目: 糖尿病薬服用
        if (formData.radiology_diabetes_med === 'yes') {
          const medName = formData.radiology_diabetes_med_name || '薬剤名未記入';
          radiologyLines.push(`糖尿病薬服用：あり（${medName}）`);
        } else {
          radiologyLines.push('糖尿病薬服用：なし');
        }

        // 4行目: 結果と所見
        const media = formData.radiology_media === 'film' ? 'フィルム' : 'CD-R';
        const delivery = formData.radiology_result_delivery === 'mail' ? '郵送' : '患者様持ち帰り';
        radiologyLines.push(`結果：${media}　所見：${delivery}`);

        radiologyText = radiologyLines.join('\n');
      }

      // 超音波検査テキスト（統合形式）
      let ultrasoundText = 'なし';
      if (formData.ultrasound_types.length > 0) {
        const ultrasoundLines = [];

        // 1行目: 検査種類（カンマ区切り）
        const types = formData.ultrasound_types.map(t => `${t}エコー`).join('、');
        ultrasoundLines.push(types);

        // 2行目: 所見の伝達
        const delivery = formData.ultrasound_result_delivery === 'mail' ? '郵送' : '患者様持ち帰り';
        ultrasoundLines.push(`所見：${delivery}`);

        ultrasoundText = ultrasoundLines.join('\n');
      }

      // コロナ対策テキスト
      const covidTravelText = formData.covid_travel === 'yes' ? 'あり' : 'なし';
      const covidContactText = formData.covid_contact === 'yes' ? 'あり' : 'なし';
      const covidSymptomsText = formData.covid_symptoms === 'yes' ? 'あり' : 'なし';

      // プレースホルダー置換リクエスト作成
      const requests = [
        // 患者情報
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{ふりがな}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{郵便番号}}', formData.postal_code),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),

        // 紹介元
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),

        // 診察目的（チェックボックス形式）
        DocsAPI.createReplaceTextRequest('{{診察・検査目的}}', purposeText),
        DocsAPI.createReplaceTextRequest('{{主訴または傷病名}}', diagnosisText),

        // 希望日
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', formatHopeDate(formData.hope_date_1)),
        DocsAPI.createReplaceTextRequest('{{第2希望日}}', formatHopeDate(formData.hope_date_2)),
        DocsAPI.createReplaceTextRequest('{{第3希望日}}', formatHopeDate(formData.hope_date_3)),

        // 内視鏡検査
        DocsAPI.createReplaceTextRequest('{{内視鏡検査}}', endoscopyText),

        // 放射線検査
        DocsAPI.createReplaceTextRequest('{{放射線検査}}', radiologyText),

        // 超音波検査
        DocsAPI.createReplaceTextRequest('{{超音波検査}}', ultrasoundText),

        // コロナ対策
        DocsAPI.createReplaceTextRequest('{{訪問歴の有無}}', covidTravelText),
        DocsAPI.createReplaceTextRequest('{{接触歴の有無}}', covidContactText),
        DocsAPI.createReplaceTextRequest('{{症状の有無}}', covidSymptomsText),

        // その他
        DocsAPI.createReplaceTextRequest('{{その他}}', formData.other_notes)
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
      id: 'heiwa-referral-form',
      name: '診療申込書（高松平和病院）',
      icon: '🏥',
      description: '高松平和病院への診療申込書を作成',
      version: VERSION,
      order: 213,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showHeiwaForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
