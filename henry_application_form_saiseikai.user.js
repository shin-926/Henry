// ==UserScript==
// @name         香川県済生会病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.0.3
// @description  香川県済生会病院への診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_saiseikai.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_saiseikai.user.js
// ==/UserScript==

/*
 * 【香川県済生会病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - 香川県済生会病院への診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 香川県済生会病院固有の入力項目
 *    - 受診希望科（整形外科以外の12診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日、第2希望日（令和形式・曜日付き・AM/PM選択）
 *    - 受診歴（有/無/不明 + ID入力）
 *    - 紹介目的・傷病名
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: 香川県済生会病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'SaiseikaiReferralForm';
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
    TEMPLATE_ID: '1HCjHBCbv43jtcjidd2oj9KvBcyggbv04U7msVfYIWrs',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 香川県済生会病院固定
  const HOSPITAL_NAME = '香川県済生会病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_saiseikai_draft_';
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
   * 希望日のフォーマット: "令和○年○月○日（曜日）AM" または "令和○年○月○日（曜日）PM"
   */
  function formatHopeDate(dateStr, ampm) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const wareki = toWareki(year, month, day);
    const ampmText = ampm === 'pm' ? 'PM' : 'AM';
    return `${wareki}（${weekdays[d.getDay()]}）${ampmText}`;
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

  /**
   * 済生会病院の診療科を取得（整形外科は予約不可のため除外）
   */
  function getSaiseikaiDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    const allDepts = api.getDepartments(HOSPITAL_NAME);
    // 整形外科は地域連携室では予約をお取りすることができません
    return allDepts.filter(dept => dept !== '整形外科');
  }

  function getSaiseikaiDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showSaiseikaiForm() {
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

        // 患者追加情報
        maiden_name: '',

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 香川県済生会病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_date_1_ampm: 'am',
        hope_date_2: '',
        hope_date_2_ampm: 'am',
        visit_history: 'unknown',
        visit_history_id: ''
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
    const existingModal = document.getElementById('saiseikai-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getSaiseikaiDepartments();

    const modal = document.createElement('div');
    modal.id = 'saiseikai-form-modal';
    modal.innerHTML = `
      <style>
        #saiseikai-form-modal {
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
        .ssf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .ssf-header {
          padding: 20px 24px;
          background: #3F51B5;
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ssf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .ssf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .ssf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .ssf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .ssf-section {
          margin-bottom: 24px;
        }
        .ssf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #3F51B5;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #9FA8DA;
        }
        .ssf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .ssf-field {
          flex: 1;
        }
        .ssf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .ssf-field input, .ssf-field textarea, .ssf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .ssf-field input:focus, .ssf-field textarea:focus, .ssf-field select:focus {
          outline: none;
          border-color: #3F51B5;
          box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
        }
        .ssf-field select {
          background: #fff;
          cursor: pointer;
        }
        .ssf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .ssf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .ssf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .ssf-combobox {
          position: relative;
        }
        .ssf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .ssf-combobox-input:focus {
          outline: none;
          border-color: #3F51B5;
          box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
        }
        .ssf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .ssf-combobox-toggle {
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
        .ssf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .ssf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .ssf-combobox-dropdown {
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
        .ssf-combobox-dropdown.open {
          display: block;
        }
        .ssf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .ssf-combobox-option:hover {
          background: #E8EAF6;
        }
        .ssf-combobox-option.selected {
          background: #C5CAE9;
          color: #303F9F;
        }
        .ssf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .ssf-checkbox-group {
          margin-top: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .ssf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .ssf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .ssf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .ssf-checkbox-item.main-disease {
          background: #E8EAF6;
          border: 1px solid #9FA8DA;
        }
        .ssf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .ssf-radio-group.vertical {
          flex-direction: column;
          gap: 8px;
        }
        .ssf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ssf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .ssf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .ssf-conditional-field {
          margin-top: 8px;
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          display: none;
        }
        .ssf-conditional-field.visible {
          display: block;
        }
        .ssf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ssf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .ssf-footer-right {
          display: flex;
          gap: 12px;
        }
        .ssf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ssf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .ssf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .ssf-btn-primary {
          background: #3F51B5;
          color: white;
        }
        .ssf-btn-primary:hover {
          background: #303F9F;
        }
        .ssf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .ssf-btn-link {
          background: #E8EAF6;
          color: #3F51B5;
          border: 1px solid #9FA8DA;
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .ssf-btn-link:hover {
          background: #C5CAE9;
        }
        .ssf-hope-date-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }
        .ssf-hope-date-row .ssf-field {
          flex: 2;
        }
        .ssf-hope-date-row .ssf-ampm-group {
          flex: 1;
          display: flex;
          gap: 8px;
          padding-bottom: 4px;
        }
        .ssf-ampm-group .ssf-radio-item {
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 6px;
          border: 1px solid #ddd;
        }
        .ssf-ampm-group .ssf-radio-item:has(input:checked) {
          background: #E8EAF6;
          border-color: #3F51B5;
        }
      </style>
      <div class="ssf-container">
        <div class="ssf-header">
          <h2>香川県済生会病院 診療申込書</h2>
          <button class="ssf-close" title="閉じる">&times;</button>
        </div>
        <div class="ssf-body">
          <!-- 患者情報（自動入力） -->
          <div class="ssf-section">
            <div class="ssf-section-title">患者情報（自動入力）</div>
            <div class="ssf-row">
              <div class="ssf-field readonly">
                <label>フリガナ</label>
                <input type="text" value="${escapeHtml(formData.patient_name_kana)}" readonly>
              </div>
              <div class="ssf-field readonly">
                <label>患者氏名</label>
                <input type="text" value="${escapeHtml(formData.patient_name)}" readonly>
              </div>
              <div class="ssf-field readonly" style="flex: 0.3;">
                <label>性別</label>
                <input type="text" value="${escapeHtml(formData.sex)}" readonly>
              </div>
            </div>
            <div class="ssf-row">
              <div class="ssf-field readonly">
                <label>生年月日</label>
                <input type="text" value="${escapeHtml(formData.birth_date_wareki)}" readonly>
              </div>
              <div class="ssf-field">
                <label>旧姓（任意）</label>
                <input type="text" id="ssf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
              </div>
            </div>
            <div class="ssf-row">
              <div class="ssf-field readonly" style="flex: 0.3;">
                <label>郵便番号</label>
                <input type="text" value="${escapeHtml(formData.postal_code)}" readonly>
              </div>
              <div class="ssf-field readonly">
                <label>住所</label>
                <input type="text" value="${escapeHtml(formData.address)}" readonly>
              </div>
            </div>
            <div class="ssf-row">
              <div class="ssf-field readonly">
                <label>電話番号</label>
                <input type="text" value="${escapeHtml(formData.phone)}" readonly>
              </div>
            </div>
          </div>

          <!-- 紹介元情報（自動入力） -->
          <div class="ssf-section">
            <div class="ssf-section-title">紹介元情報（自動入力）</div>
            <div class="ssf-row">
              <div class="ssf-field readonly">
                <label>医師名</label>
                <input type="text" value="${escapeHtml(formData.physician_name)}" readonly>
              </div>
              <div class="ssf-field readonly" style="flex: 0.5;">
                <label>作成日</label>
                <input type="text" value="${escapeHtml(formData.creation_date_wareki)}" readonly>
              </div>
            </div>
          </div>

          <!-- 香川県済生会病院 受診希望 -->
          <div class="ssf-section">
            <div class="ssf-section-title">香川県済生会病院 受診希望</div>
            <div class="ssf-notice" style="background: #fff3e0; border: 1px solid #ffb74d; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #e65100;">
              <strong>整形外科について：</strong>地域連携室では予約をお取りすることができません。担当医の診療時間内（8:30〜11:00）に直接お越しください。
            </div>
            <div class="ssf-row">
              <div class="ssf-field">
                <label>受診希望科</label>
                <select id="ssf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="ssf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="ssf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="ssf-combobox-input" id="ssf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="ssf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="ssf-combobox-dropdown" id="ssf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="ssf-btn ssf-btn-link" id="ssf-open-schedule" title="外来診療担当表を見る">外来表</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="ssf-section">
            <div class="ssf-section-title">受診希望日</div>
            <div class="ssf-hope-date-row">
              <div class="ssf-field">
                <label>第1希望日</label>
                <input type="date" id="ssf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="ssf-ampm-group">
                <div class="ssf-radio-item">
                  <input type="radio" name="ssf-hope-date-1-ampm" id="ssf-hope-date-1-am" value="am" ${formData.hope_date_1_ampm !== 'pm' ? 'checked' : ''}>
                  <label for="ssf-hope-date-1-am">AM</label>
                </div>
                <div class="ssf-radio-item">
                  <input type="radio" name="ssf-hope-date-1-ampm" id="ssf-hope-date-1-pm" value="pm" ${formData.hope_date_1_ampm === 'pm' ? 'checked' : ''}>
                  <label for="ssf-hope-date-1-pm">PM</label>
                </div>
              </div>
            </div>
            <div class="ssf-hope-date-row" style="margin-top: 12px;">
              <div class="ssf-field">
                <label>第2希望日</label>
                <input type="date" id="ssf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
              </div>
              <div class="ssf-ampm-group">
                <div class="ssf-radio-item">
                  <input type="radio" name="ssf-hope-date-2-ampm" id="ssf-hope-date-2-am" value="am" ${formData.hope_date_2_ampm !== 'pm' ? 'checked' : ''}>
                  <label for="ssf-hope-date-2-am">AM</label>
                </div>
                <div class="ssf-radio-item">
                  <input type="radio" name="ssf-hope-date-2-ampm" id="ssf-hope-date-2-pm" value="pm" ${formData.hope_date_2_ampm === 'pm' ? 'checked' : ''}>
                  <label for="ssf-hope-date-2-pm">PM</label>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診歴 -->
          <div class="ssf-section">
            <div class="ssf-section-title">香川県済生会病院 受診歴</div>
            <div class="ssf-radio-group">
              <div class="ssf-radio-item">
                <input type="radio" name="ssf-visit-history" id="ssf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="ssf-visit-yes">有</label>
              </div>
              <div class="ssf-radio-item">
                <input type="radio" name="ssf-visit-history" id="ssf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="ssf-visit-no">無</label>
              </div>
              <div class="ssf-radio-item">
                <input type="radio" name="ssf-visit-history" id="ssf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="ssf-visit-unknown">不明</label>
              </div>
            </div>
            <div class="ssf-conditional-field ${formData.visit_history === 'yes' ? 'visible' : ''}" id="ssf-visit-id-field">
              <div class="ssf-field">
                <label>患者ID（わかれば）</label>
                <input type="text" id="ssf-visit-history-id" value="${escapeHtml(formData.visit_history_id)}" placeholder="例: 123456">
              </div>
            </div>
          </div>

          <!-- 紹介目的・傷病名 -->
          <div class="ssf-section">
            <div class="ssf-section-title">紹介目的（傷病名）</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="ssf-diseases-list" class="ssf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="ssf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="ssf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="ssf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="ssf-field">
              <label>自由記述</label>
              <textarea id="ssf-diagnosis-text" placeholder="紹介目的や追加の傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>
        </div>
        <div class="ssf-footer">
          <div class="ssf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="ssf-footer-right">
            <button class="ssf-btn ssf-btn-secondary" id="ssf-save-draft">下書き保存</button>
            <button class="ssf-btn ssf-btn-primary" id="ssf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.ssf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 外来診察予定表ボタン
    modal.querySelector('#ssf-open-schedule').addEventListener('click', () => {
      window.open('https://www.saiseikai-kagawa.jp/about/plan.html', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#ssf-dest-department');
    const doctorInput = modal.querySelector('#ssf-dest-doctor');
    const doctorDropdown = modal.querySelector('#ssf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.ssf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.ssf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="ssf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="ssf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getSaiseikaiDoctors(deptName);
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
      doctorCombobox.querySelector('.ssf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.ssf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.ssf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.ssf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 受診歴ラジオボタン変更時
    const visitHistoryRadios = modal.querySelectorAll('input[name="ssf-visit-history"]');
    const visitIdField = modal.querySelector('#ssf-visit-id-field');
    visitHistoryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          visitIdField.classList.add('visible');
        } else {
          visitIdField.classList.remove('visible');
        }
      });
    });

    // 下書き保存
    modal.querySelector('#ssf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#ssf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#ssf-generate');
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
    data.maiden_name = modal.querySelector('#ssf-maiden-name')?.value || '';

    // 香川県済生会病院固有
    data.destination_department = modal.querySelector('#ssf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#ssf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_1 = modal.querySelector('#ssf-hope-date-1')?.value || '';
    data.hope_date_1_ampm = modal.querySelector('input[name="ssf-hope-date-1-ampm"]:checked')?.value || 'am';
    data.hope_date_2 = modal.querySelector('#ssf-hope-date-2')?.value || '';
    data.hope_date_2_ampm = modal.querySelector('input[name="ssf-hope-date-2-ampm"]:checked')?.value || 'am';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="ssf-visit-history"]:checked')?.value || 'unknown';
    data.visit_history_id = modal.querySelector('#ssf-visit-history-id')?.value || '';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#ssf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#ssf-diagnosis-text')?.value || '';

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
      const fileName = `診療申込書_香川県済生会病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'saiseikai-referral-form'
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
        visitHistoryText = formData.visit_history_id
          ? `有（ID: ${formData.visit_history_id}）`
          : '有';
      } else if (formData.visit_history === 'no') {
        visitHistoryText = '無';
      } else {
        visitHistoryText = '不明';
      }

      // 希望日フォーマット（AM/PM付き）
      const hopeDate1Text = formatHopeDate(formData.hope_date_1, formData.hope_date_1_ampm);
      const hopeDate2Text = formatHopeDate(formData.hope_date_2, formData.hope_date_2_ampm);

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{フリガナ}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{旧姓}}', formData.maiden_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{郵便番号}}', formData.postal_code),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', formData.destination_department),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', hopeDate1Text),
        DocsAPI.createReplaceTextRequest('{{第2希望日}}', hopeDate2Text),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{紹介目的・傷病名}}', diagnosisText)
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
      id: 'saiseikai-referral-form',
      name: '診療申込書（済生会病院）',
      icon: '🏥',
      description: '香川県済生会病院への診療申込書を作成',
      version: VERSION,
      order: 212,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showSaiseikaiForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
