// ==UserScript==
// @name         高松赤十字病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.3.1
// @description  高松赤十字病院への診療情報提供書兼FAX診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_sekijuji.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_sekijuji.user.js
// ==/UserScript==

/*
 * 【高松赤十字病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - 高松赤十字病院への診療情報提供書兼FAX診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 高松赤十字病院固有の入力項目
 *    - 受診希望科（34診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日、第2希望日（令和形式・曜日付き）
 *    - 当院受診歴（有/無/不明 + ID入力）
 *    - 現在の状況（外来通院中/入院中/介護施設入所中）
 *    - 治療経過、既往歴・アレルギー、現在の処方、備考
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_hospitals.user.js: 高松赤十字病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'SekijujiReferralForm';
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
    TEMPLATE_ID: '1z4lABWynRs4E-uibUGmhrlHTiWVb3eVEm_IVUyEDeKQ',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 高松赤十字病院固定
  const HOSPITAL_NAME = '高松赤十字病院';

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_sekijuji_draft_';
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
    `,
    // 処方一覧取得クエリ（graphql-v2 フルクエリ）
    EncountersInPatient: `
      query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
        encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
          encounters {
            id
            firstPublishTime
            records(includeDraft: false) {
              id
              __typename
              ... on PrescriptionOrder {
                startDate
                orderStatus
                medicationCategory
                rps {
                  uuid
                  dosageText
                  boundsDurationDays { value }
                  asNeeded
                  expectedRepeatCount { value }
                  instructions {
                    instruction {
                      medicationDosageInstruction {
                        localMedicine { name }
                        mhlwMedicine { name unitCode }
                        quantity {
                          doseQuantityPerDay { value }
                        }
                      }
                    }
                  }
                  medicationTiming {
                    medicationTiming {
                      canonicalPrescriptionUsage { text }
                    }
                  }
                }
              }
            }
          }
          nextPageToken
        }
      }
    `
  };

  // 単位コードのマッピング
  const UNIT_CODES = {
    1: 'mL', 2: 'g', 3: 'mg', 4: 'μg', 5: 'mEq',
    6: '管', 7: '本', 8: '瓶', 9: '袋', 10: '包',
    11: 'シート', 12: 'ブリスター', 13: 'パック', 14: 'キット', 15: 'カプセル',
    16: '錠', 17: '丸', 18: '枚', 19: '個', 20: '滴',
    21: 'mL', 22: 'mg', 23: 'μg'
  };

  // ==========================================
  // GoogleAuth取得ヘルパー
  // ==========================================

  function getGoogleAuth() {
    return pageWindow.HenryCore?.modules?.GoogleAuth;
  }

  // ==========================================
  // 処方履歴取得
  // ==========================================

  // 処方一覧を取得
  async function fetchLatestPrescriptions(patientUuid) {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return [];

    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDate = threeMonthsAgo.toISOString().split('T')[0];

      const result = await HenryCore.query(QUERIES.EncountersInPatient, {
        patientId: patientUuid,
        startDate: startDate,
        endDate: null,
        pageSize: 30,
        pageToken: null
      }, { endpoint: '/graphql-v2' });

      const encounters = result?.data?.encountersInPatient?.encounters || [];
      const prescriptions = [];

      for (const enc of encounters) {
        const records = enc.records || [];
        for (const rec of records) {
          if (rec.__typename === 'PrescriptionOrder' && rec.orderStatus !== 'ORDER_STATUS_CANCELLED') {
            const medicines = [];
            for (const rp of (rec.rps || [])) {
              const usage = rp.medicationTiming?.medicationTiming?.canonicalPrescriptionUsage?.text || '';
              const days = rp.boundsDurationDays?.value;
              const asNeeded = rp.asNeeded;

              for (const inst of (rp.instructions || [])) {
                const med = inst.instruction?.medicationDosageInstruction;
                if (!med) continue;

                const name = med.localMedicine?.name || med.mhlwMedicine?.name || '';
                const unitCode = med.mhlwMedicine?.unitCode;
                const unit = UNIT_CODES[unitCode] || '';
                const qtyPerDay = med.quantity?.doseQuantityPerDay?.value;
                const qty = qtyPerDay ? (parseInt(qtyPerDay) / 100000) : '';

                medicines.push({
                  name,
                  quantity: qty,
                  unit,
                  usage,
                  days,
                  asNeeded
                });
              }
            }

            if (medicines.length > 0) {
              prescriptions.push({
                recordId: rec.id,
                encounterId: enc.id,
                date: enc.firstPublishTime,
                startDate: rec.startDate,
                medicines,
                category: rec.medicationCategory || null
              });
            }
          }
        }
      }

      // 日付でソート（新しい順）
      prescriptions.sort((a, b) => new Date(b.startDate || b.date) - new Date(a.startDate || a.date));

      // 最新5件に絞る
      return prescriptions.slice(0, 5);
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 処方取得エラー:`, e.message);
      return [];
    }
  }

  // カテゴリを日本語に変換
  function categoryToLabel(category) {
    if (category === 'MEDICATION_CATEGORY_OUT_OF_HOSPITAL') return '院外';
    if (category === 'MEDICATION_CATEGORY_IN_HOSPITAL') return '院内';
    return '';
  }

  // 日付フォーマット（短縮形式）
  function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const y = String(d.getFullYear()).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const w = weekdays[d.getDay()];
    return `${y}/${m}/${day}(${w})`;
  }

  // 処方を文字列にフォーマット（単一処方）
  function formatSinglePrescription(rx) {
    if (!rx || !rx.medicines || rx.medicines.length === 0) return '';

    const lines = [];
    for (const m of rx.medicines) {
      // メーカー名（「〜」）を削除
      let line = m.name.replace(/「[^」]*」/g, '').trim();
      if (m.quantity) line += ` ${m.quantity}${m.unit}`;
      if (m.usage) line += ` ${m.usage}`;
      if (m.asNeeded) line += ' 頓用';
      lines.push(line);
    }
    return lines.join('\n');
  }

  // 選択された処方を文字列にフォーマット（Google Docs出力用）
  function formatSelectedPrescriptions(prescriptions, selectedIds) {
    if (!prescriptions || prescriptions.length === 0 || !selectedIds || selectedIds.length === 0) return '';

    const selected = prescriptions.filter(rx => selectedIds.includes(rx.recordId));
    if (selected.length === 0) return '';

    return selected.map(rx => formatSinglePrescription(rx)).join('\n');
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
   * 希望日のフォーマット: "令和○年○月○日（曜日）"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const wareki = toWareki(year, month, day);
    return `${wareki}（${weekdays[d.getDay()]}）`;
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
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getSekijujiDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getSekijujiDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showSekijujiForm() {
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
      const [patientInfo, physicianName, diseases, prescriptions] = await Promise.all([
        fetchPatientInfo(),
        fetchPhysicianName(),
        fetchDiseases(patientUuid),
        fetchLatestPrescriptions(patientUuid)
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
        mobile_phone: '',

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 高松赤十字病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_date_2: '',
        visit_history: 'unknown',
        visit_history_id: '',
        current_status: 'none',
        facility_name: '',

        // 詳細記入欄
        treatment_history: '',
        past_history_allergy: '',
        remarks: '',

        // 処方
        prescriptions: [],
        use_prescriptions: true,
        selected_prescriptions: [],
        prescription_text: ''
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
      formData.prescriptions = prescriptions;

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
    const existingModal = document.getElementById('sekijuji-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getSekijujiDepartments();

    const modal = document.createElement('div');
    modal.id = 'sekijuji-form-modal';
    modal.innerHTML = `
      <style>
        #sekijuji-form-modal {
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
        .srf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .srf-header {
          padding: 20px 24px;
          background: #3F51B5;
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .srf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .srf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .srf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .srf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .srf-section {
          margin-bottom: 24px;
        }
        .srf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #3F51B5;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #C5CAE9;
        }
        .srf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .srf-field {
          flex: 1;
        }
        .srf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .srf-field input, .srf-field textarea, .srf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .srf-field input:focus, .srf-field textarea:focus, .srf-field select:focus {
          outline: none;
          border-color: #3F51B5;
          box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
        }
        .srf-field select {
          background: #fff;
          cursor: pointer;
        }
        .srf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .srf-field textarea {
          resize: vertical;
          min-height: 60px;
        }
        .srf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .srf-combobox {
          position: relative;
        }
        .srf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .srf-combobox-input:focus {
          outline: none;
          border-color: #3F51B5;
          box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
        }
        .srf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .srf-combobox-toggle {
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
        .srf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .srf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .srf-combobox-dropdown {
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
        .srf-combobox-dropdown.open {
          display: block;
        }
        .srf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .srf-combobox-option:hover {
          background: #E8EAF6;
        }
        .srf-combobox-option.selected {
          background: #C5CAE9;
          color: #303F9F;
        }
        .srf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .srf-checkbox-group {
          margin-top: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .srf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .srf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .srf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .srf-checkbox-item.main-disease {
          background: #E8EAF6;
          border: 1px solid #C5CAE9;
        }
        .srf-radio-group {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .srf-radio-group.vertical {
          flex-direction: column;
          gap: 8px;
        }
        .srf-radio-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .srf-radio-item input[type="radio"] {
          width: 18px;
          height: 18px;
        }
        .srf-radio-item label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
        .srf-conditional-field {
          margin-top: 8px;
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          display: none;
        }
        .srf-conditional-field.visible {
          display: block;
        }
        .srf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .srf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .srf-footer-right {
          display: flex;
          gap: 12px;
        }
        .srf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .srf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .srf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .srf-btn-primary {
          background: #3F51B5;
          color: white;
        }
        .srf-btn-primary:hover {
          background: #303F9F;
        }
        .srf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .srf-btn-link {
          background: #E8EAF6;
          color: #3F51B5;
          border: 1px solid #9FA8DA;
          padding: 8px 12px;
          white-space: nowrap;
          font-size: 13px;
        }
        .srf-btn-link:hover {
          background: #C5CAE9;
        }
        /* 処方履歴選択 */
        .srf-use-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .srf-use-toggle input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .srf-use-toggle label {
          font-size: 14px;
          color: #333;
          cursor: pointer;
        }
        .srf-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .srf-checkbox-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .srf-checkbox-item:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }
        .srf-checkbox-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .srf-prescription-content {
          flex: 1;
          min-width: 0;
        }
        .srf-prescription-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .srf-prescription-date {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }
        .srf-prescription-category {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        .srf-prescription-meds {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
        }
      </style>
      <div class="srf-container">
        <div class="srf-header">
          <h2>高松赤十字病院 診療申込書</h2>
          <button class="srf-close" title="閉じる">&times;</button>
        </div>
        <div class="srf-body">
          <!-- 高松赤十字病院 受診希望 -->
          <div class="srf-section">
            <div class="srf-section-title">高松赤十字病院 受診希望</div>
            <div class="srf-row">
              <div class="srf-field">
                <label>旧姓（任意）</label>
                <input type="text" id="srf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
              </div>
            </div>
            <div class="srf-row">
              <div class="srf-field">
                <label>受診希望科</label>
                <select id="srf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="srf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="srf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="srf-combobox-input" id="srf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="srf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="srf-combobox-dropdown" id="srf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="srf-btn srf-btn-link" id="srf-open-schedule" title="外来担当医師表を見る">外来表</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="srf-section">
            <div class="srf-section-title">受診希望日</div>
            <div class="srf-row">
              <div class="srf-field">
                <label>第1希望日</label>
                <input type="date" id="srf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="srf-field">
                <label>第2希望日</label>
                <input type="date" id="srf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="srf-section">
            <div class="srf-section-title">高松赤十字病院 受診歴</div>
            <div class="srf-radio-group">
              <div class="srf-radio-item">
                <input type="radio" name="srf-visit-history" id="srf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="srf-visit-yes">有</label>
              </div>
              <div class="srf-radio-item">
                <input type="radio" name="srf-visit-history" id="srf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="srf-visit-no">無</label>
              </div>
              <div class="srf-radio-item">
                <input type="radio" name="srf-visit-history" id="srf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="srf-visit-unknown">不明</label>
              </div>
            </div>
            <div class="srf-conditional-field ${formData.visit_history === 'yes' ? 'visible' : ''}" id="srf-visit-id-field">
              <div class="srf-field">
                <label>患者ID（わかれば）</label>
                <input type="text" id="srf-visit-history-id" value="${escapeHtml(formData.visit_history_id)}" placeholder="例: 123-456-789">
              </div>
            </div>
          </div>

          <!-- 現在の状況 -->
          <div class="srf-section">
            <div class="srf-section-title">現在貴院に</div>
            <div class="srf-radio-group vertical">
              <div class="srf-radio-item">
                <input type="radio" name="srf-current-status" id="srf-status-none" value="none" ${formData.current_status === 'none' ? 'checked' : ''}>
                <label for="srf-status-none">該当なし</label>
              </div>
              <div class="srf-radio-item">
                <input type="radio" name="srf-current-status" id="srf-status-outpatient" value="outpatient" ${formData.current_status === 'outpatient' ? 'checked' : ''}>
                <label for="srf-status-outpatient">外来通院中</label>
              </div>
              <div class="srf-radio-item">
                <input type="radio" name="srf-current-status" id="srf-status-inpatient-dpc" value="inpatient-dpc" ${formData.current_status === 'inpatient-dpc' ? 'checked' : ''}>
                <label for="srf-status-inpatient-dpc">入院中（DPC対象）</label>
              </div>
              <div class="srf-radio-item">
                <input type="radio" name="srf-current-status" id="srf-status-inpatient-non-dpc" value="inpatient-non-dpc" ${formData.current_status === 'inpatient-non-dpc' ? 'checked' : ''}>
                <label for="srf-status-inpatient-non-dpc">入院中（DPC対象外）</label>
              </div>
              <div class="srf-radio-item">
                <input type="radio" name="srf-current-status" id="srf-status-facility" value="facility" ${formData.current_status === 'facility' ? 'checked' : ''}>
                <label for="srf-status-facility">介護施設入所中</label>
              </div>
            </div>
            <div class="srf-conditional-field ${formData.current_status === 'facility' ? 'visible' : ''}" id="srf-facility-field">
              <div class="srf-field">
                <label>施設名</label>
                <input type="text" id="srf-facility-name" value="${escapeHtml(formData.facility_name)}" placeholder="施設名を入力">
              </div>
            </div>
          </div>

          <!-- 紹介目的・傷病名 -->
          <div class="srf-section">
            <div class="srf-section-title">紹介目的（傷病名）</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="srf-diseases-list" class="srf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="srf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="srf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="srf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="srf-field">
              <label>自由記述</label>
              <textarea id="srf-diagnosis-text" placeholder="紹介目的や追加の傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

          <!-- 治療経過 -->
          <div class="srf-section">
            <div class="srf-section-title">治療経過</div>
            <div class="srf-field">
              <textarea id="srf-treatment-history" rows="4" placeholder="これまでの治療経過を入力">${escapeHtml(formData.treatment_history)}</textarea>
            </div>
          </div>

          <!-- 既往歴・アレルギー -->
          <div class="srf-section">
            <div class="srf-section-title">既往歴・アレルギー</div>
            <div class="srf-field">
              <textarea id="srf-past-history-allergy" rows="3" placeholder="既往歴、アレルギー情報を入力">${escapeHtml(formData.past_history_allergy)}</textarea>
            </div>
          </div>

          <!-- 現在の処方 -->
          <div class="srf-section">
            <div class="srf-section-title">現在の処方</div>
            ${formData.prescriptions.length > 0 ? `
              <div class="srf-use-toggle">
                <input type="checkbox" id="srf-use-prescriptions" ${formData.use_prescriptions ? 'checked' : ''}>
                <label for="srf-use-prescriptions">処方履歴から選択する</label>
              </div>
              <div id="srf-prescriptions-list" class="srf-checkbox-group" ${formData.use_prescriptions ? '' : 'style="display:none;"'}>
                ${formData.prescriptions.map(rx => {
                  const dateStr = formatDateShort(rx.startDate || rx.date);
                  const category = categoryToLabel(rx.category);
                  const categoryStyle = rx.category === 'MEDICATION_CATEGORY_OUT_OF_HOSPITAL'
                    ? 'background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9;'
                    : rx.category === 'MEDICATION_CATEGORY_IN_HOSPITAL'
                      ? 'background: #fff3e0; color: #e65100; border: 1px solid #ffcc80;'
                      : 'background: #f5f5f5; color: #666;';
                  const medsPreview = rx.medicines.map(m => {
                    let text = m.name.replace(/「[^」]*」/g, '').trim();
                    if (m.quantity) text += ' ' + m.quantity + m.unit;
                    if (m.days) text += ' ' + m.days + '日分';
                    else if (m.asNeeded) text += ' 頓用';
                    return text;
                  }).join('、');
                  const isSelected = formData.selected_prescriptions?.includes(rx.recordId);
                  return '<div class="srf-checkbox-item srf-prescription-item">' +
                    '<input type="checkbox" id="srf-prescription-' + rx.recordId + '" value="' + rx.recordId + '" ' + (isSelected ? 'checked' : '') + '>' +
                    '<div class="srf-prescription-content">' +
                      '<div class="srf-prescription-header">' +
                        '<span class="srf-prescription-date">' + dateStr + '</span>' +
                        (category ? '<span class="srf-prescription-category" style="' + categoryStyle + '">' + category + '</span>' : '') +
                      '</div>' +
                      '<div class="srf-prescription-meds">' + escapeHtml(medsPreview) + '</div>' +
                    '</div>' +
                  '</div>';
                }).join('')}
              </div>
              <div id="srf-prescription-manual" style="${formData.use_prescriptions ? 'display:none;' : ''}">
                <div class="srf-field">
                  <label>処方内容（手入力）</label>
                  <textarea id="srf-prescription-text" rows="3" placeholder="処方内容を入力">${escapeHtml(formData.prescription_text)}</textarea>
                </div>
              </div>
            ` : `
              <div class="srf-field">
                <label>処方内容</label>
                <textarea id="srf-prescription-text" rows="3" placeholder="処方内容を入力">${escapeHtml(formData.prescription_text)}</textarea>
              </div>
            `}
          </div>

          <!-- 備考 -->
          <div class="srf-section">
            <div class="srf-section-title">備考</div>
            <div class="srf-field">
              <textarea id="srf-remarks" rows="2" placeholder="その他連絡事項があれば入力">${escapeHtml(formData.remarks)}</textarea>
            </div>
          </div>
        </div>
        <div class="srf-footer">
          <div class="srf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="srf-footer-right">
            <button class="srf-btn srf-btn-secondary" id="srf-save-draft">下書き保存</button>
            <button class="srf-btn srf-btn-primary" id="srf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.srf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 外来担当医師表ボタン
    modal.querySelector('#srf-open-schedule').addEventListener('click', () => {
      window.open('https://www.takamatsu.jrc.or.jp/outpatient/doctor/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#srf-dest-department');
    const doctorInput = modal.querySelector('#srf-dest-doctor');
    const doctorDropdown = modal.querySelector('#srf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.srf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.srf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="srf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="srf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getSekijujiDoctors(deptName);
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
      doctorCombobox.querySelector('.srf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.srf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.srf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.srf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 受診歴ラジオボタン変更時
    const visitHistoryRadios = modal.querySelectorAll('input[name="srf-visit-history"]');
    const visitIdField = modal.querySelector('#srf-visit-id-field');
    visitHistoryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          visitIdField.classList.add('visible');
        } else {
          visitIdField.classList.remove('visible');
        }
      });
    });

    // 現在の状況ラジオボタン変更時
    const currentStatusRadios = modal.querySelectorAll('input[name="srf-current-status"]');
    const facilityField = modal.querySelector('#srf-facility-field');
    currentStatusRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'facility') {
          facilityField.classList.add('visible');
        } else {
          facilityField.classList.remove('visible');
        }
      });
    });

    // 下書き保存
    modal.querySelector('#srf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        const HenryCore = pageWindow.HenryCore;
        HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
      }
    });

    // 処方選択トグル
    const usePrescriptionsToggle = modal.querySelector('#srf-use-prescriptions');
    if (usePrescriptionsToggle) {
      usePrescriptionsToggle.addEventListener('change', () => {
        const prescriptionsList = modal.querySelector('#srf-prescriptions-list');
        const prescriptionManual = modal.querySelector('#srf-prescription-manual');
        if (usePrescriptionsToggle.checked) {
          if (prescriptionsList) prescriptionsList.style.display = '';
          if (prescriptionManual) prescriptionManual.style.display = 'none';
        } else {
          if (prescriptionsList) prescriptionsList.style.display = 'none';
          if (prescriptionManual) prescriptionManual.style.display = '';
        }
      });
    }

    // Google Docs出力
    modal.querySelector('#srf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#srf-generate');
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
    data.maiden_name = modal.querySelector('#srf-maiden-name')?.value || '';
    data.mobile_phone = modal.querySelector('#srf-mobile-phone')?.value || '';

    // 高松赤十字病院固有
    data.destination_department = modal.querySelector('#srf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#srf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_1 = modal.querySelector('#srf-hope-date-1')?.value || '';
    data.hope_date_2 = modal.querySelector('#srf-hope-date-2')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="srf-visit-history"]:checked')?.value || 'unknown';
    data.visit_history_id = modal.querySelector('#srf-visit-history-id')?.value || '';

    // 現在の状況
    data.current_status = modal.querySelector('input[name="srf-current-status"]:checked')?.value || 'none';
    data.facility_name = modal.querySelector('#srf-facility-name')?.value || '';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#srf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#srf-diagnosis-text')?.value || '';

    // 詳細記入欄
    data.treatment_history = modal.querySelector('#srf-treatment-history')?.value || '';
    data.past_history_allergy = modal.querySelector('#srf-past-history-allergy')?.value || '';
    data.remarks = modal.querySelector('#srf-remarks')?.value || '';

    // 処方
    data.use_prescriptions = modal.querySelector('#srf-use-prescriptions')?.checked ?? false;
    data.selected_prescriptions = [];
    if (data.prescriptions && data.prescriptions.length > 0) {
      data.prescriptions.forEach(rx => {
        const cb = modal.querySelector(`#srf-prescription-${rx.recordId}`);
        if (cb?.checked) {
          data.selected_prescriptions.push(rx.recordId);
        }
      });
    }
    data.prescription_text = modal.querySelector('#srf-prescription-text')?.value || '';

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
      const fileName = `診療申込書_高松赤十字病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
      const properties = {
        henryPatientUuid: formData.patient_uuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: 'sekijuji-referral-form'
      };
      const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

      // 傷病名テキスト作成（病名選択 + 自由記述）
      const diagnosisParts = [];

      // 選択された病名
      if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
        const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
        const diseaseText = selectedDiseases.map(d => d.name).join('，');
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

      // 現在の状況テキスト作成
      let currentStatusText = '';
      switch (formData.current_status) {
        case 'outpatient':
          currentStatusText = '外来通院中';
          break;
        case 'inpatient-dpc':
          currentStatusText = '入院中（DPC対象）';
          break;
        case 'inpatient-non-dpc':
          currentStatusText = '入院中（DPC対象外）';
          break;
        case 'facility':
          currentStatusText = formData.facility_name
            ? `介護施設入所中（${formData.facility_name}）`
            : '介護施設入所中';
          break;
        default:
          currentStatusText = '';
      }

      // 希望日フォーマット
      const hopeDate1Text = formatHopeDate(formData.hope_date_1);
      const hopeDate2Text = formatHopeDate(formData.hope_date_2);

      // 処方テキスト作成
      let prescriptionText = '';
      if (formData.use_prescriptions && formData.prescriptions?.length > 0 && formData.selected_prescriptions?.length > 0) {
        prescriptionText = formatSelectedPrescriptions(formData.prescriptions, formData.selected_prescriptions);
      } else {
        prescriptionText = formData.prescription_text || '';
      }

      // プレースホルダー置換リクエスト作成
      const requests = [
        DocsAPI.createReplaceTextRequest('{{作成日}}', formData.creation_date_wareki),
        DocsAPI.createReplaceTextRequest('{{ふりがな}}', formData.patient_name_kana),
        DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
        DocsAPI.createReplaceTextRequest('{{性別}}', formData.sex),
        DocsAPI.createReplaceTextRequest('{{生年月日}}', formData.birth_date_wareki),
        DocsAPI.createReplaceTextRequest('{{旧姓}}', formData.maiden_name),
        DocsAPI.createReplaceTextRequest('{{郵便番号}}', formData.postal_code),
        DocsAPI.createReplaceTextRequest('{{住所}}', formData.address),
        DocsAPI.createReplaceTextRequest('{{電話番号}}', formData.phone),
        DocsAPI.createReplaceTextRequest('{{携帯電話}}', formData.mobile_phone),
        DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
        DocsAPI.createReplaceTextRequest('{{受診希望科}}', formData.destination_department),
        DocsAPI.createReplaceTextRequest('{{希望医師名}}', formData.destination_doctor),
        DocsAPI.createReplaceTextRequest('{{第1希望日}}', hopeDate1Text),
        DocsAPI.createReplaceTextRequest('{{第2希望日}}', hopeDate2Text),
        DocsAPI.createReplaceTextRequest('{{受診歴}}', visitHistoryText),
        DocsAPI.createReplaceTextRequest('{{当院受診状況}}', currentStatusText),
        DocsAPI.createReplaceTextRequest('{{傷病名}}', diagnosisText),
        DocsAPI.createReplaceTextRequest('{{治療経過}}', formData.treatment_history),
        DocsAPI.createReplaceTextRequest('{{既往歴・アレルギー}}', formData.past_history_allergy),
        DocsAPI.createReplaceTextRequest('{{現在の処方}}', prescriptionText),
        DocsAPI.createReplaceTextRequest('{{備考}}', formData.remarks)
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
      id: 'sekijuji-referral-form',
      name: '診療申込書（高松赤十字病院）',
      icon: '🏥',
      description: '高松赤十字病院への診療申込書を作成',
      version: VERSION,
      order: 211,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showSekijujiForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
