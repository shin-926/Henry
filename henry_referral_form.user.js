// ==UserScript==
// @name         診療情報提供書フォーム
// @namespace    https://henry-app.jp/
// @version      1.4.7
// @description  診療情報提供書の入力フォームとGoogle Docs出力
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_referral_form.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_referral_form.user.js
// ==/UserScript==

/*
 * 【診療情報提供書フォーム】
 *
 * ■ 使用場面
 * - 他院への診療情報提供書（紹介状）を作成する場合
 * - Henryから患者情報・病名・処方を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、生年月日、住所等）
 *    - 診療科、作成者（医師名）
 *    - 病名（選択式）、処方（過去5件から複数選択可、院内/院外区別）
 *
 * 2. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'ReferralForm';
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
    TEMPLATE_ID: '1Fj9vz8kQpwo2WCJ4Vo5KFlZoSlhVY_j9PoPouiTUyFs',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_referral_draft_';
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

  // 処方を文字列にフォーマット（複数処方対応）
  function formatPrescriptions(prescriptions) {
    if (!prescriptions || prescriptions.length === 0) return '';

    // 最新の処方のみ使用（後方互換性のため）
    const latest = prescriptions[0];
    return formatSinglePrescription(latest);
  }

  // 全角英数字を半角に変換
  function toHalfWidth(str) {
    if (!str) return '';
    return str
      // 全角英数字を半角に
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      // 全角スペースを半角に
      .replace(/　/g, ' ')
      // 全角記号を半角に
      .replace(/％/g, '%')
      .replace(/．/g, '.')
      .replace(/，/g, ',');
  }

  // 選択された処方を文字列にフォーマット（Google Docs出力用）
  function formatSelectedPrescriptions(prescriptions, selectedIds) {
    if (!prescriptions || prescriptions.length === 0 || !selectedIds || selectedIds.length === 0) return '';

    const selected = prescriptions.filter(rx => selectedIds.includes(rx.recordId));
    if (selected.length === 0) return '';

    const lines = [];
    for (const rx of selected) {
      const rxLines = formatSinglePrescription(rx);
      if (rxLines) {
        lines.push(toHalfWidth(rxLines));
      }
    }
    return lines.join('\n');
  }

  // 病名を文字列にフォーマット
  function formatDiseases(diseases) {
    if (!diseases || diseases.length === 0) return '';
    return diseases.map(d => d.name).join('，');
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showReferralForm() {
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

    try {
      // データ取得（並列実行）
      const [patientInfo, physicianName, departmentName, diseases, prescriptions] = await Promise.all([
        fetchPatientInfo(),
        fetchPhysicianName(),
        fetchDepartmentName(),
        fetchDiseases(patientUuid),
        fetchLatestPrescriptions(patientUuid)
      ]);

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
        patient_birth_date_wareki: patientInfo.birth_date_wareki,
        patient_age: patientInfo.age,
        patient_sex: patientInfo.sex,
        patient_address: patientInfo.address,
        patient_phone: formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        department_name: departmentName,
        creation_date_wareki: getTodayWareki(),

        // 選択式自動取得
        diseases: diseases,
        prescriptions: prescriptions,
        use_diseases: true,
        use_prescriptions: true,
        use_family_diseases: true,
        selected_diseases: [],
        selected_family_diseases: [],
        selected_prescriptions: [],

        // 手入力項目
        destination_hospital: '',
        destination_department: '',
        destination_doctor: '',
        diagnosis_text: '',
        purpose_and_history: '',
        family_history_text: '',
        prescription_text: '',
        remarks: ''
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_birth_date_wareki = patientInfo.birth_date_wareki;
      formData.patient_age = patientInfo.age;
      formData.patient_sex = patientInfo.sex;
      formData.patient_address = patientInfo.address;
      formData.patient_phone = formatPhoneNumber(patientInfo.phone);
      formData.physician_name = physicianName;
      formData.department_name = departmentName;
      formData.creation_date_wareki = getTodayWareki();
      formData.diseases = diseases;
      formData.prescriptions = prescriptions;

      // モーダル表示
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function showFormModal(formData, lastSavedAt) {
    // 既存モーダルを削除
    const existingModal = document.getElementById('referral-form-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'referral-form-modal';
    modal.innerHTML = `
      <style>
        #referral-form-modal {
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
        .rf-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .rf-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rf-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .rf-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .rf-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .rf-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .rf-section {
          margin-bottom: 24px;
        }
        .rf-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e3f2fd;
        }
        .rf-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .rf-field {
          flex: 1;
        }
        .rf-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .rf-field input, .rf-field textarea, .rf-field select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .rf-field input:focus, .rf-field textarea:focus, .rf-field select:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }
        .rf-field select {
          background: #fff;
          cursor: pointer;
        }
        .rf-field select:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        .rf-combobox {
          position: relative;
        }
        .rf-combobox-input {
          width: 100%;
          padding: 10px 36px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .rf-combobox-input:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }
        .rf-combobox-input:disabled {
          background: #f5f5f5;
          color: #999;
        }
        .rf-combobox-toggle {
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
        .rf-combobox-toggle:hover {
          background: #e8e8e8;
        }
        .rf-combobox-toggle:disabled {
          cursor: not-allowed;
          color: #bbb;
        }
        .rf-combobox-dropdown {
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
        .rf-combobox-dropdown.open {
          display: block;
        }
        .rf-combobox-option {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .rf-combobox-option:hover {
          background: #f0f7ff;
        }
        .rf-combobox-option.selected {
          background: #e3f2fd;
          color: #1565c0;
        }
        .rf-combobox-empty {
          padding: 10px 12px;
          color: #999;
          font-size: 14px;
        }
        .rf-field textarea {
          resize: vertical;
          min-height: 80px;
        }
        .rf-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .rf-checkbox-group {
          margin-top: 8px;
        }
        .rf-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .rf-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .rf-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .rf-checkbox-item.main-disease {
          background: #e3f2fd;
          border: 1px solid #90caf9;
        }
        .rf-use-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff3e0;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .rf-use-toggle input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }
        .rf-use-toggle label {
          font-weight: 500;
          color: #e65100;
        }
        .rf-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rf-footer-left {
          font-size: 12px;
          color: #888;
        }
        .rf-footer-right {
          display: flex;
          gap: 12px;
        }
        .rf-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rf-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .rf-btn-secondary:hover {
          background: #d0d0d0;
        }
        .rf-btn-primary {
          background: #1976d2;
          color: white;
        }
        .rf-btn-primary:hover {
          background: #1565c0;
        }
        .rf-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .rf-prescription-preview {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          max-height: 150px;
          overflow-y: auto;
        }
        .rf-prescription-item {
          align-items: flex-start !important;
        }
        .rf-prescription-item input[type="checkbox"] {
          margin-top: 4px;
        }
        .rf-prescription-content {
          flex: 1;
          min-width: 0;
        }
        .rf-prescription-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .rf-prescription-date {
          font-weight: 600;
          color: #333;
          font-size: 13px;
        }
        .rf-prescription-category {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
        }
        .rf-prescription-meds {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      </style>
      <div class="rf-container">
        <div class="rf-header">
          <h2>診療情報提供書 - ${escapeHtml(formData.patient_name)}</h2>
          <button class="rf-close" title="閉じる">&times;</button>
        </div>
        <div class="rf-body">
          <!-- 紹介先 -->
          <div class="rf-section">
            <div class="rf-section-title">紹介先</div>
            <div class="rf-row">
              <div class="rf-field">
                <label>病院名</label>
                <div class="rf-combobox" data-field="hospital">
                  <input type="text" class="rf-combobox-input" id="rf-dest-hospital" value="${escapeHtml(formData.destination_hospital)}" placeholder="病院名を入力">
                  <button type="button" class="rf-combobox-toggle" title="リストから選択">▼</button>
                  <div class="rf-combobox-dropdown" id="rf-hospital-dropdown"></div>
                </div>
              </div>
              <div class="rf-field">
                <label>診療科</label>
                <div class="rf-combobox" data-field="department">
                  <input type="text" class="rf-combobox-input" id="rf-dest-department" value="${escapeHtml(formData.destination_department)}" placeholder="診療科を入力" ${!formData.destination_hospital ? 'disabled' : ''}>
                  <button type="button" class="rf-combobox-toggle" ${!formData.destination_hospital ? 'disabled' : ''} title="リストから選択">▼</button>
                  <div class="rf-combobox-dropdown" id="rf-department-dropdown"></div>
                </div>
              </div>
              <div class="rf-field">
                <label>医師名</label>
                <div class="rf-combobox" data-field="doctor">
                  <input type="text" class="rf-combobox-input" id="rf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                  <button type="button" class="rf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                  <div class="rf-combobox-dropdown" id="rf-doctor-dropdown"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 診断名 -->
          <div class="rf-section">
            <div class="rf-section-title">診断名</div>
            ${formData.diseases.length > 0 ? `
              <div class="rf-use-toggle">
                <input type="checkbox" id="rf-use-diseases" ${formData.use_diseases ? 'checked' : ''}>
                <label for="rf-use-diseases">登録済み病名を使用する</label>
              </div>
              <div id="rf-diseases-list" class="rf-checkbox-group" ${formData.use_diseases ? '' : 'style="display:none;"'}>
                ${formData.diseases.map(d => `
                  <div class="rf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                    <input type="checkbox" id="rf-disease-${d.uuid}" value="${d.uuid}"
                      ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                    <label for="rf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                  </div>
                `).join('')}
              </div>
              <div id="rf-diagnosis-manual" style="${formData.use_diseases ? 'display:none;' : ''}">
                <div class="rf-field">
                  <label>診断名（手入力）</label>
                  <textarea id="rf-diagnosis-text" placeholder="診断名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
                </div>
              </div>
            ` : `
              <div class="rf-field">
                <label>診断名</label>
                <textarea id="rf-diagnosis-text" placeholder="診断名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
              </div>
            `}
          </div>

          <!-- 処方 -->
          <div class="rf-section">
            <div class="rf-section-title">現在の処方</div>
            ${formData.prescriptions.length > 0 ? `
              <div class="rf-use-toggle">
                <input type="checkbox" id="rf-use-prescriptions" ${formData.use_prescriptions ? 'checked' : ''}>
                <label for="rf-use-prescriptions">処方履歴から選択する</label>
              </div>
              <div id="rf-prescriptions-list" class="rf-checkbox-group" ${formData.use_prescriptions ? '' : 'style="display:none;"'}>
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
                    if (m.quantity) text += ` ${m.quantity}${m.unit}`;
                    if (m.days) text += ` ${m.days}日分`;
                    else if (m.asNeeded) text += ' 頓用';
                    return text;
                  }).join('、');
                  const isSelected = formData.selected_prescriptions?.includes(rx.recordId);
                  return `
                    <div class="rf-checkbox-item rf-prescription-item">
                      <input type="checkbox" id="rf-prescription-${rx.recordId}" value="${rx.recordId}" ${isSelected ? 'checked' : ''}>
                      <div class="rf-prescription-content">
                        <div class="rf-prescription-header">
                          <span class="rf-prescription-date">${dateStr}</span>
                          ${category ? `<span class="rf-prescription-category" style="${categoryStyle}">${category}</span>` : ''}
                        </div>
                        <div class="rf-prescription-meds">${escapeHtml(medsPreview)}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
              <div id="rf-prescription-manual" style="${formData.use_prescriptions ? 'display:none;' : ''}">
                <div class="rf-field">
                  <label>処方内容（手入力）</label>
                  <textarea id="rf-prescription-text" placeholder="処方内容を入力">${escapeHtml(formData.prescription_text)}</textarea>
                </div>
              </div>
            ` : `
              <div class="rf-field">
                <label>処方内容</label>
                <textarea id="rf-prescription-text" placeholder="処方内容を入力">${escapeHtml(formData.prescription_text)}</textarea>
              </div>
            `}
          </div>

          <!-- 紹介目的・経過 -->
          <div class="rf-section">
            <div class="rf-section-title">紹介目的および病状経過</div>
            <div class="rf-field">
              <textarea id="rf-purpose" rows="5" placeholder="紹介目的、現病歴、経過などを入力">${escapeHtml(formData.purpose_and_history)}</textarea>
            </div>
          </div>

          <!-- 既往歴・家族歴 -->
          <div class="rf-section">
            <div class="rf-section-title">既往歴および家族歴</div>
            ${formData.diseases.length > 0 ? `
              <div class="rf-use-toggle">
                <input type="checkbox" id="rf-use-family-diseases" ${formData.use_family_diseases ? 'checked' : ''}>
                <label for="rf-use-family-diseases">登録病名から選択</label>
              </div>
              <div id="rf-family-diseases-list" class="rf-checkbox-list" style="${formData.use_family_diseases ? '' : 'display:none;'}">
                ${formData.diseases.map(d => `
                  <div class="rf-checkbox-item">
                    <input type="checkbox" id="rf-family-disease-${d.uuid}" value="${d.uuid}"
                      ${formData.selected_family_diseases?.includes(d.uuid) ? 'checked' : ''}>
                    <label for="rf-family-disease-${d.uuid}">${escapeHtml(d.name)}${d.isSuspected ? ' (疑い)' : ''}</label>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div id="rf-family-history-manual" style="${formData.use_family_diseases ? 'display:none;' : ''}">
              <div class="rf-field">
                <label>既往歴・家族歴（手入力）</label>
                <textarea id="rf-family-history" rows="3" placeholder="既往歴、家族歴を入力">${escapeHtml(formData.family_history_text)}</textarea>
              </div>
            </div>
          </div>

          <!-- 備考 -->
          <div class="rf-section">
            <div class="rf-section-title">備考</div>
            <div class="rf-field">
              <textarea id="rf-remarks" rows="3" placeholder="その他の情報">${escapeHtml(formData.remarks)}</textarea>
            </div>
          </div>
        </div>
        <div class="rf-footer">
          <div class="rf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="rf-footer-right">
            <button class="rf-btn rf-btn-secondary" id="rf-save-draft">下書き保存</button>
            <button class="rf-btn rf-btn-primary" id="rf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.rf-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 紹介先コンボボックスの連携
    const hospitalInput = modal.querySelector('#rf-dest-hospital');
    const hospitalDropdown = modal.querySelector('#rf-hospital-dropdown');
    const hospitalCombobox = modal.querySelector('.rf-combobox[data-field="hospital"]');
    const deptInput = modal.querySelector('#rf-dest-department');
    const deptDropdown = modal.querySelector('#rf-department-dropdown');
    const deptCombobox = modal.querySelector('.rf-combobox[data-field="department"]');
    const doctorInput = modal.querySelector('#rf-dest-doctor');
    const doctorDropdown = modal.querySelector('#rf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.rf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.rf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="rf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="rf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 病院ドロップダウンを開く
    function openHospitalDropdown() {
      closeAllDropdowns();
      const api = getHospitalsAPI();
      const hospitals = api ? api.getHospitalNames() : [];
      renderDropdownOptions(hospitalDropdown, hospitals, hospitalInput.value);
      hospitalDropdown.classList.add('open');
    }

    // 診療科ドロップダウンを開く
    function openDepartmentDropdown() {
      closeAllDropdowns();
      const api = getHospitalsAPI();
      const hospitalName = hospitalInput.value;
      const departments = (api && hospitalName) ? api.getDepartments(hospitalName) : [];
      renderDropdownOptions(deptDropdown, departments, deptInput.value);
      deptDropdown.classList.add('open');
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const api = getHospitalsAPI();
      const hospitalName = hospitalInput.value;
      const deptName = deptInput.value;
      let doctors = (api && hospitalName && deptName) ? api.getDoctors(hospitalName, deptName) : [];
      // 「担当医」を常に追加
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    // 病院▼ボタン
    hospitalCombobox.querySelector('.rf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (hospitalDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openHospitalDropdown();
      }
    });

    // 病院選択肢クリック
    hospitalDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.rf-combobox-option');
      if (option) {
        hospitalInput.value = option.dataset.value;
        closeAllDropdowns();
        updateDepartmentState();
      }
    });

    // 病院入力時
    hospitalInput.addEventListener('input', () => {
      updateDepartmentState();
    });

    // 診療科の状態を更新
    function updateDepartmentState() {
      const hasHospital = !!hospitalInput.value;
      deptInput.disabled = !hasHospital;
      deptCombobox.querySelector('.rf-combobox-toggle').disabled = !hasHospital;
      if (!hasHospital) {
        deptInput.value = '';
        updateDoctorState();
      }
    }

    // 診療科▼ボタン
    deptCombobox.querySelector('.rf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (deptDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDepartmentDropdown();
      }
    });

    // 診療科選択肢クリック
    deptDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.rf-combobox-option');
      if (option) {
        deptInput.value = option.dataset.value;
        closeAllDropdowns();
        updateDoctorState();
      }
    });

    // 診療科入力時
    deptInput.addEventListener('input', () => {
      updateDoctorState();
    });

    // 医師の状態を更新
    function updateDoctorState() {
      const hasDept = !!deptInput.value;
      doctorInput.disabled = !hasDept;
      doctorCombobox.querySelector('.rf-combobox-toggle').disabled = !hasDept;
      if (!hasDept) {
        doctorInput.value = '';
      }
    }

    // 医師▼ボタン
    doctorCombobox.querySelector('.rf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.rf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.rf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 病名使用トグル
    const useDiseases = modal.querySelector('#rf-use-diseases');
    if (useDiseases) {
      useDiseases.addEventListener('change', () => {
        const diseasesList = modal.querySelector('#rf-diseases-list');
        const diagnosisManual = modal.querySelector('#rf-diagnosis-manual');
        if (useDiseases.checked) {
          diseasesList.style.display = '';
          diagnosisManual.style.display = 'none';
        } else {
          diseasesList.style.display = 'none';
          diagnosisManual.style.display = '';
        }
      });
    }

    // 処方使用トグル
    const usePrescriptions = modal.querySelector('#rf-use-prescriptions');
    if (usePrescriptions) {
      usePrescriptions.addEventListener('change', () => {
        const prescriptionsList = modal.querySelector('#rf-prescriptions-list');
        const prescriptionManual = modal.querySelector('#rf-prescription-manual');
        if (usePrescriptions.checked) {
          prescriptionsList.style.display = '';
          prescriptionManual.style.display = 'none';
        } else {
          prescriptionsList.style.display = 'none';
          prescriptionManual.style.display = '';
        }
      });
    }

    // 既往歴病名選択トグル
    const useFamilyDiseases = modal.querySelector('#rf-use-family-diseases');
    if (useFamilyDiseases) {
      useFamilyDiseases.addEventListener('change', () => {
        const familyDiseasesList = modal.querySelector('#rf-family-diseases-list');
        const familyHistoryManual = modal.querySelector('#rf-family-history-manual');
        if (useFamilyDiseases.checked) {
          familyDiseasesList.style.display = '';
          familyHistoryManual.style.display = 'none';
        } else {
          familyDiseasesList.style.display = 'none';
          familyHistoryManual.style.display = '';
        }
      });
    }

    // 下書き保存
    modal.querySelector('#rf-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        alert('下書きを保存しました');
      }
    });

    // Google Docs出力
    modal.querySelector('#rf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#rf-generate');
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
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  // 値が病院リストに存在するかチェック
  function isHospitalInList(hospitalName) {
    if (!hospitalName) return false;
    const api = getHospitalsAPI();
    if (!api) return false;
    return api.getHospitalNames().includes(hospitalName);
  }

  // 値が診療科リストに存在するかチェック
  function isDepartmentInList(hospitalName, departmentName) {
    if (!hospitalName || !departmentName) return false;
    const api = getHospitalsAPI();
    if (!api) return false;
    return api.getDepartments(hospitalName).includes(departmentName);
  }

  // 値が医師リストに存在するかチェック
  function isDoctorInList(hospitalName, departmentName, doctorName) {
    if (!hospitalName || !departmentName || !doctorName) return false;
    // 「担当医」は常にリスト内として扱う
    if (doctorName === '担当医') return true;
    const api = getHospitalsAPI();
    if (!api) return false;
    return api.getDoctors(hospitalName, departmentName).includes(doctorName);
  }

  // 電話番号フォーマット
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

  function collectFormData(modal, originalData) {
    const data = { ...originalData };

    // 紹介先（コンボボックスから取得）
    data.destination_hospital = modal.querySelector('#rf-dest-hospital')?.value || '';
    data.destination_department = modal.querySelector('#rf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#rf-dest-doctor')?.value || '';

    data.purpose_and_history = modal.querySelector('#rf-purpose')?.value || '';
    data.family_history_text = modal.querySelector('#rf-family-history')?.value || '';
    data.remarks = modal.querySelector('#rf-remarks')?.value || '';

    // 既往歴（病名選択）
    const useFamilyDiseases = modal.querySelector('#rf-use-family-diseases');
    data.use_family_diseases = useFamilyDiseases?.checked ?? false;

    if (data.use_family_diseases && data.diseases.length > 0) {
      data.selected_family_diseases = [];
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#rf-family-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_family_diseases.push(d.uuid);
        }
      });
    }

    // 病名
    const useDiseases = modal.querySelector('#rf-use-diseases');
    data.use_diseases = useDiseases?.checked ?? false;

    if (data.use_diseases && data.diseases.length > 0) {
      data.selected_diseases = [];
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#rf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    } else {
      data.diagnosis_text = modal.querySelector('#rf-diagnosis-text')?.value || '';
    }

    // 処方
    const usePrescriptions = modal.querySelector('#rf-use-prescriptions');
    data.use_prescriptions = usePrescriptions?.checked ?? false;

    if (data.use_prescriptions && data.prescriptions.length > 0) {
      data.selected_prescriptions = [];
      data.prescriptions.forEach(rx => {
        const cb = modal.querySelector(`#rf-prescription-${rx.recordId}`);
        if (cb?.checked) {
          data.selected_prescriptions.push(rx.recordId);
        }
      });
    } else {
      data.prescription_text = modal.querySelector('#rf-prescription-text')?.value || '';
    }

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
    const fileName = `診療情報提供書_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
    const properties = {
      henryPatientUuid: formData.patient_uuid || '',
      henryFileUuid: '',  // 新規作成なので空
      henryFolderUuid: folder.id,
      henrySource: 'referral-form'
    };
    const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

    // 診断名テキスト作成
    let diagnosisText = '';
    if (formData.use_diseases && formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
      diagnosisText = selectedDiseases.map(d => d.name).join('，');
    } else {
      diagnosisText = formData.diagnosis_text || '';
    }

    // 処方テキスト作成
    let prescriptionText = '';
    if (formData.use_prescriptions && formData.prescriptions.length > 0 && formData.selected_prescriptions?.length > 0) {
      prescriptionText = formatSelectedPrescriptions(formData.prescriptions, formData.selected_prescriptions);
    } else {
      prescriptionText = formData.prescription_text || '';
    }

    // 既往歴テキスト作成
    let familyHistoryText = '';
    if (formData.use_family_diseases && formData.diseases.length > 0 && formData.selected_family_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_family_diseases.includes(d.uuid));
      familyHistoryText = selectedDiseases.map(d => d.name).join('，');
    } else {
      familyHistoryText = formData.family_history_text || '';
    }

    // プレースホルダー置換リクエスト作成
    const requests = [
      DocsAPI.createReplaceTextRequest('{{作成日_和暦}}', formData.creation_date_wareki),
      DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
      DocsAPI.createReplaceTextRequest('{{患者生年月日_和暦}}', formData.patient_birth_date_wareki),
      DocsAPI.createReplaceTextRequest('{{患者年齢}}', formData.patient_age),
      DocsAPI.createReplaceTextRequest('{{患者性別}}', formData.patient_sex),
      DocsAPI.createReplaceTextRequest('{{患者住所}}', formData.patient_address),
      DocsAPI.createReplaceTextRequest('{{患者電話番号}}', formData.patient_phone),
      DocsAPI.createReplaceTextRequest('{{作成者氏名}}', formData.physician_name),
      DocsAPI.createReplaceTextRequest('{{診療科}}', formData.department_name),
      DocsAPI.createReplaceTextRequest('{{紹介先病院}}', formData.destination_hospital),
      DocsAPI.createReplaceTextRequest('{{紹介先診療科}}', formData.destination_department),
      DocsAPI.createReplaceTextRequest('{{紹介先医師名}}', formData.destination_doctor),
      DocsAPI.createReplaceTextRequest('{{診断名}}', diagnosisText),
      DocsAPI.createReplaceTextRequest('{{紹介目的および病状経過}}', formData.purpose_and_history),
      DocsAPI.createReplaceTextRequest('{{既往歴および家族歴}}', familyHistoryText),
      DocsAPI.createReplaceTextRequest('{{全処方薬}}', prescriptionText),
      DocsAPI.createReplaceTextRequest('{{備考}}', formData.remarks)
    ];

    // 置換実行
    await DocsAPI.batchUpdate(newDoc.id, requests);

    // 新しいドキュメントを開く
    const docUrl = `https://docs.google.com/document/d/${newDoc.id}/edit`;
    spinner?.close();
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
      id: 'referral-form',
      name: '診療情報提供書',
      icon: '📄',
      description: '診療情報提供書を作成',
      version: VERSION,
      order: 200,
      group: '文書作成',
      groupIcon: '📝',
      onClick: showReferralForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
