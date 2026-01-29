// ==UserScript==
// @name         香川大学医学部附属病院 FAX診療予約申込書
// @namespace    https://henry-app.jp/
// @version      1.1.3
// @description  香川大学医学部附属病院へのFAX診療予約申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_university.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_university.user.js
// ==/UserScript==

/*
 * 【香川大学医学部附属病院 FAX診療予約申込書フォーム】
 *
 * ■ 使用場面
 * - 香川大学医学部附属病院へのFAX診療予約申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 香川大学病院固有の入力項目
 *    - 受診希望科（32科チェックボックス選択）
 *    - 希望医師名、連絡状況
 *    - 第1〜2希望日（日付＋時間）
 *    - 受診歴（無・不明・有 + ID入力）
 *    - 受診の緊急性、現在の状況
 *    - COVID-19状況
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'UniversityReferralForm';
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
    TEMPLATE_ID: '1yrp8y4PJEKMFxA52tjp-grpxMixsJz3b5Gbx4W79oo8',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 香川大学医学部附属病院固定
  const HOSPITAL_NAME = '香川大学医学部附属病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_university_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 診療科リスト（行ごとに管理、出力とUI表示で使用）
  const DEPARTMENT_ROWS = [
    ['内分泌代謝内科', '脳神経内科', '皮膚科', '形成外科・美容外科'],
    ['血液内科', '総合診療科', '精神科神経科', '歯・顎・口腔外科'],
    ['膠原病・リウマチ内科', '腫瘍内科', '小児科', '麻酔・ペインクリニック科'],
    ['呼吸器内科', '心臓血管外科', '周産期科女性診療科', '放射線治療科'],
    ['循環器内科', '消化器外科', '整形外科', '放射線診断科'],
    ['腎臓内科', '呼吸器外科', '泌尿器・副腎・腎移植外科', '眼科'],
    ['抗加齢血管内科', '乳腺内分泌外科', '脳神経外科', '臨床遺伝ゲノム診療科'],
    ['消化器内科（肝・膵胆・消化管）', '小児外科', '耳鼻咽喉科・頭頸部外科', '緩和ケア科'],
    ['膵臓・胆道センター']
  ];
  // フラット配列（UIチェックボックス用）
  const DEPARTMENTS = DEPARTMENT_ROWS.flat();

  // 診療科名マッピング（PDF表示名 → henry_hospitals診療科名）
  const DEPARTMENT_MAPPING = {
    // 一致するもの（そのまま）
    '総合診療科': ['総合診療科'],
    '血液内科': ['血液内科'],
    '腎臓内科': ['腎臓内科'],
    '膠原病・リウマチ内科': ['膠原病・リウマチ内科'],
    '循環器内科': ['循環器内科'],
    '脳神経内科': ['脳神経内科'],
    '呼吸器内科': ['呼吸器内科'],
    '腫瘍内科': ['腫瘍内科'],
    '緩和ケア科': ['緩和ケア科'],
    '皮膚科': ['皮膚科'],
    '精神科神経科': ['精神科神経科'],
    '小児科': ['小児科'],
    '放射線治療科': ['放射線治療科'],
    '放射線診断科': ['放射線診断科'],
    '歯・顎・口腔外科': ['歯・顎・口腔外科'],
    '消化器外科': ['消化器外科'],
    '呼吸器外科': ['呼吸器外科'],
    '心臓血管外科': ['心臓血管外科'],
    '小児外科': ['小児外科'],
    '整形外科': ['整形外科'],
    '臨床遺伝ゲノム診療科': ['臨床遺伝ゲノム診療科'],
    '脳神経外科': ['脳神経外科'],
    '眼科': ['眼科'],
    '耳鼻咽喉科・頭頸部外科': ['耳鼻咽喉科・頭頸部外科'],

    // マッピングが必要なもの
    '内分泌代謝内科': ['内分泌内科', '糖尿病内科'],
    '形成外科・美容外科': ['形成・美容外科'],
    '麻酔・ペインクリニック科': ['麻酔科'],
    '周産期科女性診療科': ['周産期科・女性診療科'],
    '泌尿器・副腎・腎移植外科': ['泌尿器科'],
    '乳腺内分泌外科': ['乳腺・内分泌外科'],
    '消化器内科（肝・膵胆・消化管）': ['消化器内科（肝臓）', '消化器内科（膵・胆）', '消化器内科（消化管）'],

    // henry_hospitalsに存在しないもの（空配列）
    '抗加齢血管内科': [],
    '膵臓・胆道センター': []
  };

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
   * 希望日のフォーマット: "○月○日（曜日）○時頃"
   */
  function formatHopeDate(dateStr, time) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const timeText = time ? `${time}時頃` : '';
    return `${month}月${day}日（${weekdays[d.getDay()]}）${timeText}`;
  }

  /**
   * 年齢計算
   */
  function calculateAge(birthYear, birthMonth, birthDay) {
    if (!birthYear || !birthMonth || !birthDay) return '';

    const today = new Date();
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return `${age}歳`;
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
        birth_year: birthYear,
        birth_month: birthMonth,
        birth_day: birthDay,
        birth_date_wareki: birthYear ? toBirthDateWareki(birthYear, birthMonth, birthDay) : '',
        age: calculateAge(birthYear, birthMonth, birthDay),
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

  async function fetchDepartmentName() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return '';
    return await HenryCore.getMyDepartment() || '';
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
  // フォーム表示
  // ==========================================

  async function showUniversityForm() {
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
      const [patientInfo, physicianName, departmentName, diseases] = await Promise.all([
        fetchPatientInfo(),
        fetchPhysicianName(),
        fetchDepartmentName(),
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
        address: patientInfo.address,
        phone: formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        department_name: departmentName,
        creation_date_wareki: getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 香川大学病院固有
        selected_department: '',
        destination_doctor: '',
        doctor_contacted: 'no',
        contact_person: '', // TODO: 後日担当者名をハードコード（例: '山田 花子'）
        hope_date_1: '',
        hope_date_1_time: '',
        hope_date_2: '',
        hope_date_2_time: '',
        hope_date_until: '',
        hope_date_other: '',
        mobile_phone: '',
        maiden_name: '',
        visit_history: 'no',
        visit_history_id: '',
        urgency: 'no',
        current_status: 'not_hospitalized',
        referral_purpose: '',
        test_data_status: 'no',
        test_data_xray: false,
        test_data_ct: false,
        test_data_mr: false,
        test_data_other: false,
        kmix_consent: 'no',
        covid_status: 'no_symptoms'
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_name_kana = patientInfo.patient_name_kana;
      formData.birth_date_wareki = patientInfo.birth_date_wareki;
      formData.age = patientInfo.age;
      formData.sex = patientInfo.sex;
      formData.address = patientInfo.address;

      // 電話番号の振り分け（携帯番号パターンなら携帯電話に、それ以外は固定電話に）
      const rawPhone = formatPhoneNumber(patientInfo.phone);
      const phoneDigits = rawPhone.replace(/[^0-9]/g, '');
      if (/^0[6789]0/.test(phoneDigits)) {
        formData.phone = '';
        formData.mobile_phone = rawPhone;
      } else {
        formData.phone = rawPhone;
        // mobile_phoneは下書きの値を維持（なければ空）
        if (!savedDraft) formData.mobile_phone = '';
      }

      formData.physician_name = physicianName;
      formData.department_name = departmentName;
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
    const existingModal = document.getElementById('university-form-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'university-form-modal';
    modal.innerHTML = `
      <style>
        #university-form-modal {
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
        .urf-container {
          background: #fff;
          border-radius: 12px;
          width: 95%;
          max-width: 1100px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .urf-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .urf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .urf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .urf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .urf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .urf-section {
          margin-bottom: 24px;
        }
        .urf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: ${THEME.primary};
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid ${THEME.primaryLight};
        }
        .urf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .urf-field {
          flex: 1;
        }
        .urf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .urf-field input, .urf-field textarea, .urf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .urf-field input:focus, .urf-field textarea:focus, .urf-field select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
        }
        .urf-field select {
          background: #fff;
          cursor: pointer;
        }
        .urf-field textarea {
          resize: vertical;
          min-height: 80px;
        }
        .urf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .urf-combobox {
          position: relative;
        }
        .urf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .urf-combobox-input:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
        }
        .urf-combobox-toggle {
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
        .urf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .urf-combobox-dropdown {
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
        .urf-combobox-dropdown.open {
          display: block;
        }
        .urf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .urf-combobox-option:hover {
          background: ${THEME.accent};
        }
        .urf-combobox-option.selected {
          background: ${THEME.primaryLight};
          color: ${THEME.primaryDark};
        }
        .urf-checkbox-group {
          margin-top: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .urf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .urf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .urf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .urf-checkbox-item.main-disease {
          background: ${THEME.accent};
          border: 1px solid ${THEME.primaryLight};
        }
        .urf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .urf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .urf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .urf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .urf-conditional-field {
          margin-top: 8px;
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          display: none;
        }
        .urf-conditional-field.visible {
          display: block;
        }
        .urf-departments-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 8px;
        }
        @media (max-width: 900px) {
          .urf-departments-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 600px) {
          .urf-departments-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .urf-dept-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .urf-dept-item:has(input:checked) {
          background: ${THEME.accent};
          border-color: ${THEME.primary};
        }
        .urf-dept-item input[type="radio"] {
          width: 16px;
          height: 16px;
          margin: 0;
        }
        .urf-dept-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin: 0;
        }
        .urf-dept-item label {
          margin: 0;
          font-size: 12px;
          color: #333;
          cursor: pointer;
          line-height: 1.3;
        }
        .urf-hope-date-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }
        .urf-hope-date-row .urf-field {
          flex: 2;
        }
        .urf-hope-date-row .urf-time-field {
          flex: 1;
        }
        .urf-time-select-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .urf-time-select-wrapper select {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: #fff;
          cursor: pointer;
        }
        .urf-time-select-wrapper select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
        }
        .urf-time-suffix {
          font-size: 14px;
          color: #333;
          white-space: nowrap;
        }
        .urf-checkbox-inline {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .urf-checkbox-inline label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #333;
          cursor: pointer;
        }
        .urf-checkbox-inline input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }
        .urf-external-link {
          font-size: 13px;
          color: ${THEME.primary};
          text-decoration: none;
          margin-left: 8px;
        }
        .urf-external-link:hover {
          text-decoration: underline;
        }
        .urf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .urf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .urf-footer-right {
          display: flex;
          gap: 12px;
        }
        .urf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .urf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .urf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .urf-btn-primary {
          background: ${THEME.primary};
          color: white;
        }
        .urf-btn-primary:hover {
          background: ${THEME.primaryDark};
        }
        .urf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      </style>
      <div class="urf-container">
        <div class="urf-header">
          <h2>香川大学医学部附属病院 FAX診療予約申込書</h2>
          <button class="urf-close" title="閉じる">&times;</button>
        </div>
        <div class="urf-body">
          <!-- 患者情報（自動入力） -->
          <div class="urf-section">
            <div class="urf-section-title">患者情報（自動入力）</div>
            <div class="urf-row">
              <div class="urf-field readonly">
                <label>フリガナ</label>
                <input type="text" value="${escapeHtml(formData.patient_name_kana)}" readonly>
              </div>
              <div class="urf-field readonly">
                <label>患者氏名</label>
                <input type="text" value="${escapeHtml(formData.patient_name)}" readonly>
              </div>
              <div class="urf-field readonly" style="flex: 0.3;">
                <label>性別</label>
                <input type="text" value="${escapeHtml(formData.sex)}" readonly>
              </div>
            </div>
            <div class="urf-row">
              <div class="urf-field readonly">
                <label>生年月日</label>
                <input type="text" value="${escapeHtml(formData.birth_date_wareki)}" readonly>
              </div>
              <div class="urf-field readonly" style="flex: 0.3;">
                <label>年齢</label>
                <input type="text" value="${escapeHtml(formData.age)}" readonly>
              </div>
            </div>
            <div class="urf-row">
              <div class="urf-field readonly">
                <label>住所</label>
                <input type="text" value="${escapeHtml(formData.address)}" readonly>
              </div>
            </div>
            <div class="urf-row">
              <div class="urf-field readonly">
                <label>電話番号（自宅）</label>
                <input type="text" value="${escapeHtml(formData.phone)}" readonly>
              </div>
              <div class="urf-field readonly">
                <label>携帯電話</label>
                <input type="text" id="urf-mobile-phone" value="${escapeHtml(formData.mobile_phone)}" readonly>
              </div>
            </div>
            <div class="urf-row">
              <div class="urf-field">
                <label>旧姓（任意）</label>
                <input type="text" id="urf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
              </div>
            </div>
          </div>

          <!-- 紹介元情報（自動入力） -->
          <div class="urf-section">
            <div class="urf-section-title">紹介元情報（自動入力）</div>
            <div class="urf-row">
              <div class="urf-field readonly">
                <label>医師名</label>
                <input type="text" value="${escapeHtml(formData.physician_name)}" readonly>
              </div>
              <div class="urf-field readonly" style="flex: 0.3;">
                <label>診療科</label>
                <input type="text" value="${escapeHtml(formData.department_name)}" readonly>
              </div>
              <div class="urf-field readonly" style="flex: 0.5;">
                <label>作成日</label>
                <input type="text" value="${escapeHtml(formData.creation_date_wareki)}" readonly>
              </div>
            </div>
            <div class="urf-row">
              <div class="urf-field readonly">
                <label>連絡担当者名</label>
                <input type="text" id="urf-contact-person" value="${escapeHtml(formData.contact_person)}" readonly>
              </div>
            </div>
          </div>

          <!-- 受診希望科（ラジオボタン） -->
          <div class="urf-section">
            <div class="urf-section-title">受診希望科</div>
            <div class="urf-departments-grid">
              ${DEPARTMENTS.map((dept, idx) => `
                <div class="urf-dept-item">
                  <input type="radio" name="urf-dest-dept" id="urf-dept-${idx}" value="${escapeHtml(dept)}"
                    ${formData.selected_department === dept ? 'checked' : ''}>
                  <label for="urf-dept-${idx}">${escapeHtml(dept)}</label>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 希望医師・連絡 -->
          <div class="urf-section">
            <div class="urf-section-title">希望医師・連絡</div>
            <div class="urf-row">
              <div class="urf-field">
                <label>希望医師名</label>
                <div class="urf-combobox" data-field="dest-doctor">
                  <input type="text" class="urf-combobox-input" id="urf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力">
                  <button type="button" class="urf-combobox-toggle" title="リストから選択">▼</button>
                  <div class="urf-combobox-dropdown" id="urf-dest-doctor-dropdown"></div>
                </div>
              </div>
              <div class="urf-field">
                <label>希望医師への連絡</label>
                <div class="urf-radio-group">
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-contacted" id="urf-contacted-done" value="done"
                      ${formData.doctor_contacted === 'done' ? 'checked' : ''}>
                    <label for="urf-contacted-done">済</label>
                  </div>
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-contacted" id="urf-contacted-no" value="no"
                      ${formData.doctor_contacted !== 'done' ? 'checked' : ''}>
                    <label for="urf-contacted-no">未</label>
                  </div>
                  <a href="https://www.med.kagawa-u.ac.jp/hosp/archives/002/202601/sinyoui_20260101.pdf" target="_blank" class="urf-external-link">外来表</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="urf-section">
            <div class="urf-section-title">受診希望日</div>
            <div class="urf-hope-date-row">
              <div class="urf-field">
                <label>第1希望日</label>
                <input type="date" id="urf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="urf-field urf-time-field">
                <label>時間</label>
                <div class="urf-time-select-wrapper">
                  <select id="urf-hope-date-1-time">
                    <option value="">--</option>
                    ${[...Array(24)].map((_, i) => `<option value="${i}" ${formData.hope_date_1_time === String(i) ? 'selected' : ''}>${i}</option>`).join('')}
                  </select>
                  <span class="urf-time-suffix">時頃</span>
                </div>
              </div>
            </div>
            <div class="urf-hope-date-row" style="margin-top: 12px;">
              <div class="urf-field">
                <label>第2希望日</label>
                <input type="date" id="urf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
              </div>
              <div class="urf-field urf-time-field">
                <label>時間</label>
                <div class="urf-time-select-wrapper">
                  <select id="urf-hope-date-2-time">
                    <option value="">--</option>
                    ${[...Array(24)].map((_, i) => `<option value="${i}" ${formData.hope_date_2_time === String(i) ? 'selected' : ''}>${i}</option>`).join('')}
                  </select>
                  <span class="urf-time-suffix">時頃</span>
                </div>
              </div>
            </div>
            <div class="urf-row" style="margin-top: 12px;">
              <div class="urf-field">
                <label>いつまでの受診希望か</label>
                <input type="text" id="urf-hope-date-until" value="${escapeHtml(formData.hope_date_until)}" placeholder="例: 今月中、2週間以内">
              </div>
              <div class="urf-field">
                <label>その他希望</label>
                <input type="text" id="urf-hope-date-other" value="${escapeHtml(formData.hope_date_other)}" placeholder="曜日・期間指定、予約不可の日など">
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="urf-section">
            <div class="urf-section-title">香川大学医学部附属病院 受診歴</div>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-visit-history" id="urf-visit-no" value="no"
                  ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="urf-visit-no">無</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-visit-history" id="urf-visit-unknown" value="unknown"
                  ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="urf-visit-unknown">不明</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-visit-history" id="urf-visit-yes" value="yes"
                  ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="urf-visit-yes">有</label>
              </div>
            </div>
            <div class="urf-conditional-field ${formData.visit_history === 'yes' ? 'visible' : ''}" id="urf-visit-id-field">
              <div class="urf-field">
                <label>患者ID（わかれば）</label>
                <input type="text" id="urf-visit-history-id" value="${escapeHtml(formData.visit_history_id)}" placeholder="例: 123456">
              </div>
            </div>
          </div>

          <!-- 受診の緊急性・現在の状況 -->
          <div class="urf-section">
            <div class="urf-section-title">受診の緊急性・現在の状況</div>
            <div class="urf-row">
              <div class="urf-field">
                <label>受診の緊急性</label>
                <div class="urf-radio-group">
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-urgency" id="urf-urgency-yes" value="yes"
                      ${formData.urgency === 'yes' ? 'checked' : ''}>
                    <label for="urf-urgency-yes">有</label>
                  </div>
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-urgency" id="urf-urgency-no" value="no"
                      ${formData.urgency !== 'yes' ? 'checked' : ''}>
                    <label for="urf-urgency-no">無</label>
                  </div>
                </div>
              </div>
              <div class="urf-field">
                <label>現在の状況</label>
                <div class="urf-radio-group">
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-status" id="urf-status-hospitalized" value="hospitalized"
                      ${formData.current_status === 'hospitalized' ? 'checked' : ''}>
                    <label for="urf-status-hospitalized">入院中</label>
                  </div>
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-status" id="urf-status-not" value="not_hospitalized"
                      ${formData.current_status !== 'hospitalized' ? 'checked' : ''}>
                    <label for="urf-status-not">入院中でない</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 傷病名・紹介目的 -->
          <div class="urf-section">
            <div class="urf-section-title">傷病名（疑い病名）</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="urf-diseases-list" class="urf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="urf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="urf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="urf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="urf-field">
              <label>自由記述（傷病名）</label>
              <textarea id="urf-diagnosis-text" placeholder="傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

          <!-- 紹介目的と症状経過 -->
          <div class="urf-section">
            <div class="urf-section-title">紹介目的と症状経過</div>
            <div class="urf-field">
              <textarea id="urf-referral-purpose" placeholder="紹介目的と症状経過を入力">${escapeHtml(formData.referral_purpose)}</textarea>
            </div>
          </div>

          <!-- 検査データ等・K-MIX R同意書 -->
          <div class="urf-section">
            <div class="urf-section-title">検査データ等・K-MIX R同意書</div>
            <div class="urf-row">
              <div class="urf-field">
                <label>検査データ等の有無</label>
                <div class="urf-radio-group">
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-test-data" id="urf-test-data-no" value="no"
                      ${formData.test_data_status !== 'yes' ? 'checked' : ''}>
                    <label for="urf-test-data-no">無</label>
                  </div>
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-test-data" id="urf-test-data-yes" value="yes"
                      ${formData.test_data_status === 'yes' ? 'checked' : ''}>
                    <label for="urf-test-data-yes">有</label>
                  </div>
                </div>
                <div class="urf-conditional-field ${formData.test_data_status === 'yes' ? 'visible' : ''}" id="urf-test-data-types-field">
                  <div class="urf-checkbox-inline">
                    <label><input type="checkbox" id="urf-test-xray" ${formData.test_data_xray ? 'checked' : ''}> X線</label>
                    <label><input type="checkbox" id="urf-test-ct" ${formData.test_data_ct ? 'checked' : ''}> CT</label>
                    <label><input type="checkbox" id="urf-test-mr" ${formData.test_data_mr ? 'checked' : ''}> MR</label>
                    <label><input type="checkbox" id="urf-test-other" ${formData.test_data_other ? 'checked' : ''}> その他</label>
                  </div>
                </div>
              </div>
              <div class="urf-field">
                <label>K-MIX R 利用に係る同意書の有無</label>
                <div class="urf-radio-group">
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-kmix" id="urf-kmix-no" value="no"
                      ${formData.kmix_consent !== 'yes' ? 'checked' : ''}>
                    <label for="urf-kmix-no">無</label>
                  </div>
                  <div class="urf-radio-item">
                    <input type="radio" name="urf-kmix" id="urf-kmix-yes" value="yes"
                      ${formData.kmix_consent === 'yes' ? 'checked' : ''}>
                    <label for="urf-kmix-yes">有</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- COVID-19 -->
          <div class="urf-section">
            <div class="urf-section-title">COVID-19</div>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-covid" id="urf-covid-positive" value="positive"
                  ${formData.covid_status === 'positive' ? 'checked' : ''}>
                <label for="urf-covid-positive">陽性者</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-covid" id="urf-covid-suspected" value="suspected"
                  ${formData.covid_status === 'suspected' ? 'checked' : ''}>
                <label for="urf-covid-suspected">疑い（症状あり）</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-covid" id="urf-covid-none" value="no_symptoms"
                  ${formData.covid_status === 'no_symptoms' || !formData.covid_status ? 'checked' : ''}>
                <label for="urf-covid-none">症状なし</label>
              </div>
            </div>
          </div>
        </div>
        <div class="urf-footer">
          <div class="urf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="urf-footer-right">
            <button class="urf-btn urf-btn-secondary" id="urf-save-draft">下書き保存</button>
            <button class="urf-btn urf-btn-primary" id="urf-generate">Google Docsに出力</button>
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
    modal.querySelector('.urf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 希望医師コンボボックス
    const destDoctorInput = modal.querySelector('#urf-dest-doctor');
    const destDoctorDropdown = modal.querySelector('#urf-dest-doctor-dropdown');
    const destDoctorCombobox = modal.querySelector('.urf-combobox[data-field="dest-doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.urf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px 12px; color: #999; font-size: 14px;">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="urf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 希望医師ドロップダウンを開く
    function openDestDoctorDropdown() {
      closeAllDropdowns();
      // HenryHospitalsから香川大学病院の医師リストを取得
      const api = pageWindow.HenryHospitals;
      const selectedDept = modal.querySelector('input[name="urf-dest-dept"]:checked')?.value || '';
      let doctors = [];

      if (api && selectedDept) {
        // マッピングテーブルから対応するhenry_hospitals診療科名を取得
        const mappedDepts = DEPARTMENT_MAPPING[selectedDept] || [];

        // 各診療科の医師を取得してマージ
        for (const mappedDept of mappedDepts) {
          const deptDoctors = api.getDoctors('香川大学医学部附属病院', mappedDept) || [];
          doctors = [...doctors, ...deptDoctors];
        }

        // 重複を除去
        doctors = [...new Set(doctors)];
      }

      // 「担当医」を常に追加
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(destDoctorDropdown, doctors, destDoctorInput.value);
      destDoctorDropdown.classList.add('open');
    }

    // 希望医師▼ボタン
    destDoctorCombobox.querySelector('.urf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (destDoctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDestDoctorDropdown();
      }
    });

    // 希望医師選択肢クリック
    destDoctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.urf-combobox-option');
      if (option) {
        destDoctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.urf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 受診歴ラジオボタン変更時
    const visitHistoryRadios = modal.querySelectorAll('input[name="urf-visit-history"]');
    const visitIdField = modal.querySelector('#urf-visit-id-field');
    visitHistoryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          visitIdField.classList.add('visible');
        } else {
          visitIdField.classList.remove('visible');
        }
      });
    });

    // 検査データ有無ラジオボタン変更時
    const testDataRadios = modal.querySelectorAll('input[name="urf-test-data"]');
    const testDataTypesField = modal.querySelector('#urf-test-data-types-field');
    testDataRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          testDataTypesField.classList.add('visible');
        } else {
          testDataTypesField.classList.remove('visible');
        }
      });
    });

    // 下書き保存
    modal.querySelector('#urf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // Google Docs出力
    modal.querySelector('#urf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#urf-generate');
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
    data.mobile_phone = modal.querySelector('#urf-mobile-phone')?.value || '';
    data.maiden_name = modal.querySelector('#urf-maiden-name')?.value || '';

    // 受診希望科（単一選択）
    data.selected_department = modal.querySelector('input[name="urf-dest-dept"]:checked')?.value || '';

    // 希望医師・連絡
    data.destination_doctor = modal.querySelector('#urf-dest-doctor')?.value || '';
    data.doctor_contacted = modal.querySelector('input[name="urf-contacted"]:checked')?.value || 'no';
    data.contact_person = modal.querySelector('#urf-contact-person')?.value || '';

    // 希望日
    data.hope_date_1 = modal.querySelector('#urf-hope-date-1')?.value || '';
    data.hope_date_1_time = modal.querySelector('#urf-hope-date-1-time')?.value || '';
    data.hope_date_2 = modal.querySelector('#urf-hope-date-2')?.value || '';
    data.hope_date_2_time = modal.querySelector('#urf-hope-date-2-time')?.value || '';
    data.hope_date_until = modal.querySelector('#urf-hope-date-until')?.value || '';
    data.hope_date_other = modal.querySelector('#urf-hope-date-other')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="urf-visit-history"]:checked')?.value || 'no';
    data.visit_history_id = modal.querySelector('#urf-visit-history-id')?.value || '';

    // 緊急性・状況
    data.urgency = modal.querySelector('input[name="urf-urgency"]:checked')?.value || 'no';
    data.current_status = modal.querySelector('input[name="urf-status"]:checked')?.value || 'not_hospitalized';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#urf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#urf-diagnosis-text')?.value || '';

    // 紹介目的
    data.referral_purpose = modal.querySelector('#urf-referral-purpose')?.value || '';

    // 検査データ等
    data.test_data_status = modal.querySelector('input[name="urf-test-data"]:checked')?.value || 'no';
    data.test_data_xray = modal.querySelector('#urf-test-xray')?.checked || false;
    data.test_data_ct = modal.querySelector('#urf-test-ct')?.checked || false;
    data.test_data_mr = modal.querySelector('#urf-test-mr')?.checked || false;
    data.test_data_other = modal.querySelector('#urf-test-other')?.checked || false;

    // K-MIX R同意書
    data.kmix_consent = modal.querySelector('input[name="urf-kmix"]:checked')?.value || 'no';

    // COVID-19
    data.covid_status = modal.querySelector('input[name="urf-covid"]:checked')?.value || 'no_symptoms';

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
      const fileName = `FAX診療予約申込書_香川大学病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'university-referral-form'
      };
      const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

      // 傷病名テキスト作成（病名選択 + 自由記述）
      const diagnosisParts = [];

      // 選択された病名
      if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
        const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
        const diseaseText = selectedDiseases.map(d => d.name + (d.isSuspected ? '（疑い）' : '')).join('、');
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
      } else if (formData.visit_history === 'unknown') {
        visitHistoryText = '不明';
      } else {
        visitHistoryText = '無';
      }

      // 希望日フォーマット（時間付き）
      const hopeDate1Text = formatHopeDate(formData.hope_date_1, formData.hope_date_1_time);
      const hopeDate2Text = formatHopeDate(formData.hope_date_2, formData.hope_date_2_time);

      // 受診希望科（チェックボックス形式、タブ区切り・行ごとに改行）
      const departmentsText = DEPARTMENT_ROWS.map(row => {
        return row.map(dept => {
          const isSelected = formData.selected_department === dept;
          return `${isSelected ? '■' : '□'}${dept}`;
        }).join('\t');
      }).join('\n');

      // 連絡状況
      const contactedText = formData.doctor_contacted === 'done' ? '済' : '未';

      // 緊急性
      const urgencyText = formData.urgency === 'yes' ? '有' : '無';

      // 現在の状況
      const statusText = formData.current_status === 'hospitalized' ? '入院中' : '入院中でない';

      // 検査データ等の有無
      let testDataText = '';
      if (formData.test_data_status === 'yes') {
        const types = [];
        if (formData.test_data_xray) types.push('X線');
        if (formData.test_data_ct) types.push('CT');
        if (formData.test_data_mr) types.push('MR');
        if (formData.test_data_other) types.push('その他');
        testDataText = types.length > 0 ? `有（${types.join('・')}）` : '有';
      } else {
        testDataText = '無';
      }

      // K-MIX R同意書の有無
      const kmixText = formData.kmix_consent === 'yes' ? '有' : '無';

      // COVID-19
      let covidText = '';
      if (formData.covid_status === 'positive') {
        covidText = '陽性者';
      } else if (formData.covid_status === 'suspected') {
        covidText = '疑い（症状あり）';
      } else {
        covidText = '症状なし';
      }

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{フリガナ}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{年齢}}', formData.age),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),
        DocsAPI.createReplaceTextRequest('{{携帯電話}}', formData.mobile_phone),
        DocsAPI.createReplaceTextRequest('{{旧姓}}', formData.maiden_name),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{診療科}}', formData.department_name),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', departmentsText),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{連絡}}', contactedText),
        DocsAPI.createReplaceTextRequest('{{連絡担当者}}', formData.contact_person),
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', hopeDate1Text),
        DocsAPI.createReplaceTextRequest('{{第2希望日}}', hopeDate2Text),
        DocsAPI.createReplaceTextRequest('{{いつまで希望}}', formData.hope_date_until),
        DocsAPI.createReplaceTextRequest('{{その他希望日}}', formData.hope_date_other),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{受診の緊急性}}', urgencyText),
        DocsAPI.createReplaceTextRequest('{{現在の状況}}', statusText),
        DocsAPI.createReplaceTextRequest('{{傷病名}}', diagnosisText),
        DocsAPI.createReplaceTextRequest('{{紹介目的と症状経過}}', formData.referral_purpose),
        DocsAPI.createReplaceTextRequest('{{検査データ等の有無}}', testDataText),
        DocsAPI.createReplaceTextRequest('{{K-MIXR同意書の有無}}', kmixText),
        DocsAPI.createReplaceTextRequest('{{COVID-19}}', covidText)
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
      id: 'university-referral-form',
      name: '診療申込書（香川大学病院）',
      icon: '🎓',
      description: '香川大学医学部附属病院へのFAX診療予約申込書を作成',
      version: VERSION,
      order: 214,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showUniversityForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
