// ==UserScript==
// @name         高松市立みんなの病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.0.0
// @description  高松市立みんなの病院へのFAX診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_minna_referral_form.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_minna_referral_form.user.js
// ==/UserScript==

/*
 * 【高松市立みんなの病院 FAX診療申込書フォーム】
 *
 * ■ 使用場面
 * - 高松市立みんなの病院へのFAX診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 診療科（ログインユーザーの所属科）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 高松市立みんなの病院固有の入力項目
 *    - 受診希望科（24診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日（令和形式・曜日付き）または当日/いつでもよい
 *    - 画像の有無（CT/MRI/XP/PET-CT + 撮影時期）
 *    - 医師への事前連絡（有/無）
 *    - 当院受診歴（有/無/不明）
 *    - 現在の状況（外来通院中/入院中/介護施設入所中）
 *    - 傷病名、備考
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: 高松市立みんなの病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'MinnaReferralForm';
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
    TEMPLATE_ID: '1HD7wJc_B-xavVLerbX7wtskXWhBc3k4DJ9wMSZo4H_s',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 高松市立みんなの病院固定
  const HOSPITAL_NAME = '高松市立みんなの病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_minna_draft_';
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

  /**
   * 生年月日の和暦フォーマット（元号略記 + 生まれ付き）
   * 例: 昭60年5月10日生
   */
  function toBirthDateWareki(year, month, day) {
    if (!year) return '';

    let eraName, eraYear;
    const y = parseInt(year);
    const m = parseInt(month) || 1;

    if (y >= 2019 && (y > 2019 || m >= 5)) {
      eraName = '令';
      eraYear = y - 2018;
    } else if (y >= 1989) {
      eraName = '平';
      eraYear = y - 1988;
    } else if (y >= 1926) {
      eraName = '昭';
      eraYear = y - 1925;
    } else if (y >= 1912) {
      eraName = '大';
      eraYear = y - 1911;
    } else {
      eraName = '明';
      eraYear = y - 1867;
    }

    return `${eraName}${eraYear}年${month}月${day}日生`;
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
   * 希望日時のフォーマット: "2026年1月30日（金曜日）10時30分"
   */
  function formatHopeDateTime(dateStr, timeStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    let result = `${year}年${month}月${day}日（${weekdays[d.getDay()]}）`;

    // 時間が指定されている場合
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      result += `${parseInt(hours)}時${parseInt(minutes)}分`;
    }

    return result;
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

  async function fetchMyDepartment() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return '';

    try {
      const dept = await HenryCore.getMyDepartment();
      return dept || '';
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 診療科取得エラー:`, e.message);
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

  function getMinnaDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getMinnaDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showMinnaForm() {
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
      const [patientInfo, physicianName, myDepartment, diseases] = await Promise.all([
        fetchPatientInfo(),
        fetchPhysicianName(),
        fetchMyDepartment(),
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
        my_department: myDepartment,

        // 患者追加情報
        maiden_name: '',

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 高松市立みんなの病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_type: 'date', // date, today, anytime
        hope_date_1: '',
        hope_time_1: '',
        hope_date_2: '',
        hope_time_2: '',
        visit_history: 'unknown',
        current_status: 'none',
        current_status_detail: '', // 保険診療/事故/労災/その他 or DPC対象/DPC対象外
        facility_name: '',

        // 画像の有無
        has_image: false,
        image_ct: false,
        image_mri: false,
        image_xp: false,
        image_pet: false,
        image_date: '',

        // 事前連絡
        prior_contact: 'no'
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
      formData.my_department = myDepartment;
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
    const existingModal = document.getElementById('minna-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getMinnaDepartments();

    const modal = document.createElement('div');
    modal.id = 'minna-form-modal';
    modal.innerHTML = `
      <style>
        #minna-form-modal {
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
        .mrf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .mrf-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mrf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .mrf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .mrf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .mrf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .mrf-section {
          margin-bottom: 24px;
        }
        .mrf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #bbdefb;
        }
        .mrf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .mrf-field {
          flex: 1;
        }
        .mrf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .mrf-field input, .mrf-field textarea, .mrf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .mrf-field input:focus, .mrf-field textarea:focus, .mrf-field select:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }
        .mrf-field select {
          background: #fff;
          cursor: pointer;
        }
        .mrf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .mrf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .mrf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .mrf-combobox {
          position: relative;
        }
        .mrf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .mrf-combobox-input:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }
        .mrf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .mrf-combobox-toggle {
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
        .mrf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .mrf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .mrf-combobox-dropdown {
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
        .mrf-combobox-dropdown.open {
          display: block;
        }
        .mrf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .mrf-combobox-option:hover {
          background: #e3f2fd;
        }
        .mrf-combobox-option.selected {
          background: #bbdefb;
          color: #1565c0;
        }
        .mrf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .mrf-checkbox-group {
          margin-top: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .mrf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .mrf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .mrf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .mrf-checkbox-item.main-disease {
          background: #e3f2fd;
          border: 1px solid #bbdefb;
        }
        .mrf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .mrf-radio-group.vertical {
          flex-direction: column;
          gap: 8px;
        }
        .mrf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mrf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .mrf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .mrf-conditional-field {
          margin-top: 8px;
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          display: none;
        }
        .mrf-conditional-field.visible {
          display: block;
        }
        .mrf-image-checkboxes {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .mrf-image-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mrf-image-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }
        .mrf-image-checkbox label {
          font-size: 14px;
          color: #333;
        }
        .mrf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mrf-footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #888;
        }
        .mrf-footer-right {
          display: flex;
          gap: 12px;
        }
        .mrf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mrf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .mrf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .mrf-btn-primary {
          background: #1976d2;
          color: white;
        }
        .mrf-btn-primary:hover {
          background: #1565c0;
        }
        .mrf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .mrf-btn-link {
          background: #e3f2fd;
          color: #1976d2;
          border: 1px solid #90caf9;
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .mrf-btn-link:hover {
          background: #bbdefb;
        }
        .mrf-current-status-detail {
          margin-top: 8px;
          padding-left: 24px;
        }
        .mrf-current-status-detail select {
          width: auto;
          min-width: 150px;
        }
      </style>
      <div class="mrf-container">
        <div class="mrf-header">
          <h2>高松市立みんなの病院 FAX診療申込書</h2>
          <button class="mrf-close" title="閉じる">&times;</button>
        </div>
        <div class="mrf-body">
          <!-- 患者情報（自動入力） -->
          <div class="mrf-section">
            <div class="mrf-section-title">患者情報（自動入力）</div>
            <div class="mrf-row">
              <div class="mrf-field readonly">
                <label>フリガナ</label>
                <input type="text" value="${escapeHtml(formData.patient_name_kana)}" readonly>
              </div>
              <div class="mrf-field readonly">
                <label>患者氏名</label>
                <input type="text" value="${escapeHtml(formData.patient_name)}" readonly>
              </div>
              <div class="mrf-field readonly" style="flex: 0.3;">
                <label>性別</label>
                <input type="text" value="${escapeHtml(formData.sex)}" readonly>
              </div>
            </div>
            <div class="mrf-row">
              <div class="mrf-field readonly">
                <label>生年月日</label>
                <input type="text" value="${escapeHtml(formData.birth_date_wareki)}" readonly>
              </div>
              <div class="mrf-field">
                <label>旧姓（任意）</label>
                <input type="text" id="mrf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
              </div>
            </div>
            <div class="mrf-row">
              <div class="mrf-field readonly" style="flex: 0.3;">
                <label>郵便番号</label>
                <input type="text" value="${escapeHtml(formData.postal_code)}" readonly>
              </div>
              <div class="mrf-field readonly">
                <label>住所</label>
                <input type="text" value="${escapeHtml(formData.address)}" readonly>
              </div>
            </div>
            <div class="mrf-row">
              <div class="mrf-field readonly">
                <label>電話番号</label>
                <input type="text" value="${escapeHtml(formData.phone)}" readonly>
              </div>
            </div>
          </div>

          <!-- 紹介元情報（自動入力） -->
          <div class="mrf-section">
            <div class="mrf-section-title">紹介元情報（自動入力）</div>
            <div class="mrf-row">
              <div class="mrf-field readonly">
                <label>医師名</label>
                <input type="text" value="${escapeHtml(formData.physician_name)}" readonly>
              </div>
              <div class="mrf-field readonly">
                <label>診療科</label>
                <input type="text" value="${escapeHtml(formData.my_department)}" readonly>
              </div>
            </div>
          </div>

          <!-- 高松市立みんなの病院 受診希望 -->
          <div class="mrf-section">
            <div class="mrf-section-title">高松市立みんなの病院 受診希望</div>
            <div class="mrf-row">
              <div class="mrf-field">
                <label>受診希望科</label>
                <select id="mrf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="mrf-field">
                <label>希望医師名（任意）</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="mrf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="mrf-combobox-input" id="mrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="mrf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="mrf-combobox-dropdown" id="mrf-doctor-dropdown"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="mrf-section">
            <div class="mrf-section-title">希望来院日</div>
            <div class="mrf-radio-group">
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-hope-date-type" id="mrf-hope-date-type-date" value="date" ${formData.hope_date_type === 'date' ? 'checked' : ''}>
                <label for="mrf-hope-date-type-date">日時を指定</label>
              </div>
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-hope-date-type" id="mrf-hope-date-type-today" value="today" ${formData.hope_date_type === 'today' ? 'checked' : ''}>
                <label for="mrf-hope-date-type-today">当日</label>
              </div>
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-hope-date-type" id="mrf-hope-date-type-anytime" value="anytime" ${formData.hope_date_type === 'anytime' ? 'checked' : ''}>
                <label for="mrf-hope-date-type-anytime">いつでもよい</label>
              </div>
            </div>
            <div class="mrf-conditional-field ${formData.hope_date_type === 'date' ? 'visible' : ''}" id="mrf-hope-date-field">
              <div class="mrf-row">
                <div class="mrf-field">
                  <label>第1希望日</label>
                  <input type="date" id="mrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
                </div>
                <div class="mrf-field" style="flex: 0.5;">
                  <label>時間（任意）</label>
                  <input type="time" id="mrf-hope-time-1" value="${escapeHtml(formData.hope_time_1 || '')}">
                </div>
              </div>
              <div class="mrf-row">
                <div class="mrf-field">
                  <label>第2希望日（任意）</label>
                  <input type="date" id="mrf-hope-date-2" value="${escapeHtml(formData.hope_date_2 || '')}">
                </div>
                <div class="mrf-field" style="flex: 0.5;">
                  <label>時間（任意）</label>
                  <input type="time" id="mrf-hope-time-2" value="${escapeHtml(formData.hope_time_2 || '')}">
                </div>
              </div>
            </div>
          </div>

          <!-- 画像の有無 -->
          <div class="mrf-section">
            <div class="mrf-section-title">画像の有無</div>
            <div class="mrf-radio-group">
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-has-image" id="mrf-has-image-yes" value="yes" ${formData.has_image ? 'checked' : ''}>
                <label for="mrf-has-image-yes">有</label>
              </div>
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-has-image" id="mrf-has-image-no" value="no" ${!formData.has_image ? 'checked' : ''}>
                <label for="mrf-has-image-no">無</label>
              </div>
            </div>
            <div class="mrf-conditional-field ${formData.has_image ? 'visible' : ''}" id="mrf-image-detail-field">
              <div class="mrf-image-checkboxes">
                <div class="mrf-image-checkbox">
                  <input type="checkbox" id="mrf-image-ct" ${formData.image_ct ? 'checked' : ''}>
                  <label for="mrf-image-ct">CT</label>
                </div>
                <div class="mrf-image-checkbox">
                  <input type="checkbox" id="mrf-image-mri" ${formData.image_mri ? 'checked' : ''}>
                  <label for="mrf-image-mri">MRI</label>
                </div>
                <div class="mrf-image-checkbox">
                  <input type="checkbox" id="mrf-image-xp" ${formData.image_xp ? 'checked' : ''}>
                  <label for="mrf-image-xp">XP</label>
                </div>
                <div class="mrf-image-checkbox">
                  <input type="checkbox" id="mrf-image-pet" ${formData.image_pet ? 'checked' : ''}>
                  <label for="mrf-image-pet">PET-CT</label>
                </div>
              </div>
              <div class="mrf-row" style="margin-top: 12px;">
                <div class="mrf-field" style="flex: 0.5;">
                  <label>撮影時期</label>
                  <input type="text" id="mrf-image-date" value="${escapeHtml(formData.image_date)}" placeholder="例: 令和7年1月">
                </div>
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="mrf-section">
            <div class="mrf-section-title">高松市立みんなの病院 受診歴</div>
            <div class="mrf-radio-group">
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-visit-history" id="mrf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="mrf-visit-yes">有</label>
              </div>
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-visit-history" id="mrf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="mrf-visit-no">無</label>
              </div>
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-visit-history" id="mrf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="mrf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 現在の状況 -->
          <div class="mrf-section">
            <div class="mrf-section-title">現在貴院に</div>
            <div class="mrf-radio-group vertical">
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-current-status" id="mrf-status-none" value="none" ${formData.current_status === 'none' ? 'checked' : ''}>
                <label for="mrf-status-none">該当なし</label>
              </div>
              <div>
                <div class="mrf-radio-item">
                  <input type="radio" name="mrf-current-status" id="mrf-status-outpatient" value="outpatient" ${formData.current_status === 'outpatient' ? 'checked' : ''}>
                  <label for="mrf-status-outpatient">外来通院中</label>
                </div>
                <div class="mrf-current-status-detail ${formData.current_status === 'outpatient' ? '' : 'mrf-hidden'}" id="mrf-outpatient-detail">
                  <select id="mrf-outpatient-type">
                    <option value="insurance" ${formData.current_status_detail === 'insurance' ? 'selected' : ''}>保険診療</option>
                    <option value="accident" ${formData.current_status_detail === 'accident' ? 'selected' : ''}>事故</option>
                    <option value="workers" ${formData.current_status_detail === 'workers' ? 'selected' : ''}>労災</option>
                    <option value="other" ${formData.current_status_detail === 'other' ? 'selected' : ''}>その他</option>
                  </select>
                </div>
              </div>
              <div>
                <div class="mrf-radio-item">
                  <input type="radio" name="mrf-current-status" id="mrf-status-inpatient" value="inpatient" ${formData.current_status === 'inpatient' ? 'checked' : ''}>
                  <label for="mrf-status-inpatient">入院中</label>
                </div>
                <div class="mrf-current-status-detail ${formData.current_status === 'inpatient' ? '' : 'mrf-hidden'}" id="mrf-inpatient-detail">
                  <select id="mrf-inpatient-type">
                    <option value="dpc" ${formData.current_status_detail === 'dpc' ? 'selected' : ''}>DPC対象</option>
                    <option value="non-dpc" ${formData.current_status_detail === 'non-dpc' ? 'selected' : ''}>DPC対象外</option>
                  </select>
                </div>
              </div>
              <div>
                <div class="mrf-radio-item">
                  <input type="radio" name="mrf-current-status" id="mrf-status-facility" value="facility" ${formData.current_status === 'facility' ? 'checked' : ''}>
                  <label for="mrf-status-facility">介護施設入所中</label>
                </div>
                <div class="mrf-conditional-field ${formData.current_status === 'facility' ? 'visible' : ''}" id="mrf-facility-field">
                  <div class="mrf-field">
                    <label>施設名</label>
                    <input type="text" id="mrf-facility-name" value="${escapeHtml(formData.facility_name)}" placeholder="施設名を入力">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 医師への事前連絡 -->
          <div class="mrf-section">
            <div class="mrf-section-title">医師への事前連絡</div>
            <div class="mrf-radio-group">
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-prior-contact" id="mrf-prior-contact-yes" value="yes" ${formData.prior_contact === 'yes' ? 'checked' : ''}>
                <label for="mrf-prior-contact-yes">有</label>
              </div>
              <div class="mrf-radio-item">
                <input type="radio" name="mrf-prior-contact" id="mrf-prior-contact-no" value="no" ${formData.prior_contact === 'no' ? 'checked' : ''}>
                <label for="mrf-prior-contact-no">無</label>
              </div>
            </div>
          </div>

          <!-- 紹介目的・傷病名 -->
          <div class="mrf-section">
            <div class="mrf-section-title">紹介目的（傷病名）</div>
            <p style="font-size: 13px; color: #666; margin: 0 0 12px 0;">※紹介状（診療情報提供書）を添付の場合は、ご記入不要です。</p>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="mrf-diseases-list" class="mrf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="mrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="mrf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="mrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="mrf-field">
              <label>自由記述</label>
              <textarea id="mrf-diagnosis-text" placeholder="紹介目的や追加の傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

        </div>
        <div class="mrf-footer">
          <div class="mrf-footer-left">
            <button class="mrf-btn mrf-btn-link" id="mrf-open-outpatient" title="外来受付ページを開く">🏥 外来受付ページ</button>
            ${lastSavedAt ? `<span>下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}</span>` : ''}
          </div>
          <div class="mrf-footer-right">
            <button class="mrf-btn mrf-btn-secondary" id="mrf-save-draft">下書き保存</button>
            <button class="mrf-btn mrf-btn-primary" id="mrf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
      <style>
        .mrf-hidden { display: none !important; }
      </style>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.mrf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 外来受付ページボタン
    modal.querySelector('#mrf-open-outpatient').addEventListener('click', () => {
      window.open('https://www.takamatsu-municipal-hospital.jp/archives/74', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#mrf-dest-department');
    const doctorInput = modal.querySelector('#mrf-dest-doctor');
    const doctorDropdown = modal.querySelector('#mrf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.mrf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.mrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="mrf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="mrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getMinnaDoctors(deptName);
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
      doctorCombobox.querySelector('.mrf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.mrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.mrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.mrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 希望日タイプ変更時
    const hopeDateTypeRadios = modal.querySelectorAll('input[name="mrf-hope-date-type"]');
    const hopeDateField = modal.querySelector('#mrf-hope-date-field');
    hopeDateTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'date') {
          hopeDateField.classList.add('visible');
        } else {
          hopeDateField.classList.remove('visible');
        }
      });
    });

    // 画像有無変更時
    const hasImageRadios = modal.querySelectorAll('input[name="mrf-has-image"]');
    const imageDetailField = modal.querySelector('#mrf-image-detail-field');
    hasImageRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          imageDetailField.classList.add('visible');
        } else {
          imageDetailField.classList.remove('visible');
        }
      });
    });

    // 現在の状況ラジオボタン変更時
    const currentStatusRadios = modal.querySelectorAll('input[name="mrf-current-status"]');
    const facilityField = modal.querySelector('#mrf-facility-field');
    const outpatientDetail = modal.querySelector('#mrf-outpatient-detail');
    const inpatientDetail = modal.querySelector('#mrf-inpatient-detail');
    currentStatusRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        // 全て非表示にしてから該当するものを表示
        facilityField.classList.remove('visible');
        outpatientDetail.classList.add('mrf-hidden');
        inpatientDetail.classList.add('mrf-hidden');

        if (radio.value === 'facility') {
          facilityField.classList.add('visible');
        } else if (radio.value === 'outpatient') {
          outpatientDetail.classList.remove('mrf-hidden');
        } else if (radio.value === 'inpatient') {
          inpatientDetail.classList.remove('mrf-hidden');
        }
      });
    });

    // 下書き保存
    modal.querySelector('#mrf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#mrf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#mrf-generate');
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

    // 患者追加情報
    data.maiden_name = modal.querySelector('#mrf-maiden-name')?.value || '';

    // 高松市立みんなの病院固有
    data.destination_department = modal.querySelector('#mrf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#mrf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_type = modal.querySelector('input[name="mrf-hope-date-type"]:checked')?.value || 'date';
    data.hope_date_1 = modal.querySelector('#mrf-hope-date-1')?.value || '';
    data.hope_time_1 = modal.querySelector('#mrf-hope-time-1')?.value || '';
    data.hope_date_2 = modal.querySelector('#mrf-hope-date-2')?.value || '';
    data.hope_time_2 = modal.querySelector('#mrf-hope-time-2')?.value || '';

    // 画像の有無
    data.has_image = modal.querySelector('input[name="mrf-has-image"]:checked')?.value === 'yes';
    data.image_ct = modal.querySelector('#mrf-image-ct')?.checked || false;
    data.image_mri = modal.querySelector('#mrf-image-mri')?.checked || false;
    data.image_xp = modal.querySelector('#mrf-image-xp')?.checked || false;
    data.image_pet = modal.querySelector('#mrf-image-pet')?.checked || false;
    data.image_date = modal.querySelector('#mrf-image-date')?.value || '';

    // 事前連絡
    data.prior_contact = modal.querySelector('input[name="mrf-prior-contact"]:checked')?.value || 'no';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="mrf-visit-history"]:checked')?.value || 'unknown';

    // 現在の状況
    data.current_status = modal.querySelector('input[name="mrf-current-status"]:checked')?.value || 'none';
    if (data.current_status === 'outpatient') {
      data.current_status_detail = modal.querySelector('#mrf-outpatient-type')?.value || 'insurance';
    } else if (data.current_status === 'inpatient') {
      data.current_status_detail = modal.querySelector('#mrf-inpatient-type')?.value || 'dpc';
    } else {
      data.current_status_detail = '';
    }
    data.facility_name = modal.querySelector('#mrf-facility-name')?.value || '';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#mrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#mrf-diagnosis-text')?.value || '';

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
      const fileName = `FAX診療申込書_みんなの病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'minna-referral-form'
      };
      const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

      // 傷病名テキスト作成（病名選択 + 自由記述）
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

      // 現在の状況テキスト作成
      let currentStatusText = '';
      switch (formData.current_status) {
        case 'outpatient': {
          const detailLabels = {
            insurance: '保険診療',
            accident: '事故',
            workers: '労災',
            other: 'その他'
          };
          currentStatusText = `外来通院中（${detailLabels[formData.current_status_detail] || '保険診療'}）`;
          break;
        }
        case 'inpatient': {
          const dpcLabel = formData.current_status_detail === 'non-dpc' ? 'DPC対象外' : 'DPC対象';
          currentStatusText = `入院中（${dpcLabel}）`;
          break;
        }
        case 'facility':
          currentStatusText = formData.facility_name
            ? `介護施設入所中（${formData.facility_name}）`
            : '介護施設入所中';
          break;
        default:
          currentStatusText = '';
      }

      // 希望日時フォーマット
      let hopeDateTimeText = '';
      if (formData.hope_date_type === 'date') {
        const hopeDateParts = [];
        if (formData.hope_date_1) {
          hopeDateParts.push(`①${formatHopeDateTime(formData.hope_date_1, formData.hope_time_1)}`);
        }
        if (formData.hope_date_2) {
          hopeDateParts.push(`②${formatHopeDateTime(formData.hope_date_2, formData.hope_time_2)}`);
        }
        hopeDateTimeText = hopeDateParts.join('\n');
      } else if (formData.hope_date_type === 'today') {
        hopeDateTimeText = '当日';
      } else if (formData.hope_date_type === 'anytime') {
        hopeDateTimeText = 'いつでもよい';
      }

      // 画像の有無テキスト作成
      let imageText = '';
      if (formData.has_image) {
        const imageTypes = [];
        if (formData.image_ct) imageTypes.push('CT');
        if (formData.image_mri) imageTypes.push('MRI');
        if (formData.image_xp) imageTypes.push('XP');
        if (formData.image_pet) imageTypes.push('PET-CT');

        if (imageTypes.length > 0) {
          imageText = imageTypes.join('・');
          if (formData.image_date) {
            imageText += `（${formData.image_date}撮影）`;
          }
        } else {
          imageText = '有';
        }
      } else {
        imageText = '無';
      }

      // 事前連絡テキスト
      const priorContactText = formData.prior_contact === 'yes' ? '有' : '無';

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{フリガナ}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{旧姓}}', formData.maiden_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{郵便番号}}', formData.postal_code),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{診療科}}', formData.my_department),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', formData.destination_department),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{希望日時}}', hopeDateTimeText),
        DocsAPI.createReplaceTextRequest('{{傷病名}}', diagnosisText),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{現在貴院に}}', currentStatusText),
        DocsAPI.createReplaceTextRequest('{{画像の有無}}', imageText),
        DocsAPI.createReplaceTextRequest('{{事前連絡}}', priorContactText)
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
      id: 'minna-referral-form',
      name: 'みんなの病院 診療申込',
      icon: '🏥',
      description: '高松市立みんなの病院へのFAX診療申込書を作成',
      version: VERSION,
      order: 212,
      group: '文書作成',
      groupIcon: '📝',
      onClick: showMinnaForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
