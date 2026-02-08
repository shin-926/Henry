// ==UserScript==
// @name         Henry フォーム共通モジュール
// @namespace    https://henry-app.jp/
// @version      1.2.0
// @description  申込書・診断書フォームスクリプトの共通機能を提供
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_form_commons.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_form_commons.user.js
// ==/UserScript==

/*
 * 【フォーム共通モジュール】
 *
 * ■ 概要
 * 申込書・診断書系スクリプト（11ファイル）で共通するコードを集約したモジュール。
 * 各スクリプトは HenryFormCommons を参照して重複コードを排除する。
 *
 * ■ 公開API
 * - DriveAPI: Google Drive API ラッパー
 * - DocsAPI: Google Docs API ラッパー
 * - QUERIES: GraphQL クエリ定義
 * - UNIT_CODES: 単位コードマッピング
 * - utils: ユーティリティ関数群
 * - data: データ取得関数群
 * - generateBaseCSS(prefix): CSS生成（非推奨: generateFormCSS + showFormModal を使用）
 * - generateFormCSS(prefix): フォームフィールドCSS生成（モーダル骨格を除く）
 * - showFormModal(config): フォームモーダル構築（isDirty追跡・confirmClose・共通フッター）
 * - generateDoc(config): Google Docs出力の共通フロー
 * - initPlugin(config): プラグイン初期化ヘルパー
 *
 * ■ 依存関係
 * - henry_core.user.js: HenryCore API
 * - manifest.json で order=9 に設定（フォームスクリプトより先に読み込み）
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'FormCommons';

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 定数
  // ==========================================

  const API_CONFIG = {
    DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
    DOCS_API_BASE: 'https://docs.googleapis.com/v1'
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
    async request(method, url, options = {}, scriptName = SCRIPT_NAME) {
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
                .then(() => DriveAPI.request(method, url, options, scriptName))
                .then(resolve)
                .catch(reject);
            } else {
              console.error(`[${scriptName}] DriveAPI Error ${response.status}:`, response.responseText);
              reject(new Error(`API Error: ${response.status}`));
            }
          },
          onerror: (err) => {
            console.error(`[${scriptName}] DriveAPI Network error:`, err);
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
    async getDocument(documentId, scriptName = SCRIPT_NAME) {
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

    async batchUpdate(documentId, requests, scriptName = SCRIPT_NAME) {
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
              console.error(`[${scriptName}] DocsAPI batchUpdate Error:`, response.responseText);
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
  // ユーティリティ関数
  // ==========================================

  const utils = {
    katakanaToHiragana(str) {
      if (!str) return '';
      return str.replace(/[ァ-ヶ]/g, char =>
        String.fromCharCode(char.charCodeAt(0) - 0x60)
      );
    },

    toWareki(year, month, day) {
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
    },

    calculateAge(birthYear, birthMonth, birthDay) {
      const today = new Date();
      let age = today.getFullYear() - birthYear;
      const m = today.getMonth() + 1;
      const d = today.getDate();

      if (m < birthMonth || (m === birthMonth && d < birthDay)) {
        age--;
      }
      return age.toString();
    },

    getTodayWareki() {
      const today = new Date();
      return utils.toWareki(today.getFullYear(), today.getMonth() + 1, today.getDate());
    },

    formatSex(sexType) {
      if (sexType === 'SEX_TYPE_MALE') return '男';
      if (sexType === 'SEX_TYPE_FEMALE') return '女';
      return '';
    },

    formatPhoneNumber(phone) {
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
    },

    escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    toHalfWidth(str) {
      if (!str) return '';
      return str
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/　/g, ' ')
        .replace(/％/g, '%')
        .replace(/．/g, '.')
        .replace(/，/g, ',');
    }
  };

  // ==========================================
  // データ取得関数
  // ==========================================

  const data = {
    async fetchPatientInfo(scriptName = SCRIPT_NAME) {
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
          serial_number: p.serialNumber || '',
          patient_name: (p.fullName || '').replace(/\u3000/g, ' '),
          patient_name_kana: utils.katakanaToHiragana(p.fullNamePhonetic || ''),
          birth_date_wareki: birthYear ? utils.toWareki(birthYear, birthMonth, birthDay) : '',
          age: birthYear ? utils.calculateAge(birthYear, birthMonth, birthDay) : '',
          sex: utils.formatSex(p.detail?.sexType),
          postal_code: p.detail?.postalCode || '',
          address: p.detail?.addressLine_1 || '',
          phone: p.detail?.phoneNumber || ''
        };
      } catch (e) {
        console.error(`[${scriptName}] 患者情報取得エラー:`, e.message);
        return null;
      }
    },

    async fetchPhysicianName(scriptName = SCRIPT_NAME) {
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
        console.error(`[${scriptName}] 医師名取得エラー:`, e.message);
        return '';
      }
    },

    async fetchDiseases(patientUuid, scriptName = SCRIPT_NAME) {
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
        console.error(`[${scriptName}] 病名取得エラー:`, e.message);
        return [];
      }
    },

    async fetchLatestPrescriptions(patientUuid, scriptName = SCRIPT_NAME) {
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
        console.error(`[${scriptName}] 処方取得エラー:`, e.message);
        return [];
      }
    },

    formatSelectedPrescriptions(prescriptions, selectedIds) {
      if (!prescriptions || prescriptions.length === 0 || !selectedIds || selectedIds.length === 0) return '';

      const selected = prescriptions.filter(rx => selectedIds.includes(rx.recordId));
      if (selected.length === 0) return '';

      const lines = [];
      for (const rx of selected) {
        const rxLines = data.formatSinglePrescription(rx);
        if (rxLines) {
          lines.push(utils.toHalfWidth(rxLines));
        }
      }
      return lines.join('\n');
    },

    formatSinglePrescription(rx) {
      if (!rx || !rx.medicines || rx.medicines.length === 0) return '';

      const lines = [];
      for (const m of rx.medicines) {
        let line = m.name.replace(/「[^」]*」/g, '').trim();
        if (m.quantity) line += ` ${m.quantity}${m.unit}`;
        if (m.usage) line += ` ${m.usage}`;
        if (m.asNeeded) line += ' 頓用';
        lines.push(line);
      }
      return lines.join('\n');
    }
  };

  // ==========================================
  // CSS生成（プレフィックスをパラメータ化）
  // ==========================================

  function generateBaseCSS(prefix) {
    return `
      #${prefix}-form-modal {
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
      .${prefix}-container {
        background: #fff;
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .${prefix}-header {
        padding: 20px 24px;
        background: #3F51B5;
        color: white;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .${prefix}-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
      .${prefix}-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 20px;
      }
      .${prefix}-close:hover {
        background: rgba(255,255,255,0.3);
      }
      .${prefix}-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }
      .${prefix}-section {
        margin-bottom: 24px;
      }
      .${prefix}-section-title {
        font-size: 16px;
        font-weight: 600;
        color: #3F51B5;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #C5CAE9;
      }
      .${prefix}-row {
        display: flex;
        gap: 16px;
        margin-bottom: 12px;
      }
      .${prefix}-field {
        flex: 1;
      }
      .${prefix}-field label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #666;
        margin-bottom: 4px;
      }
      .${prefix}-field input, .${prefix}-field textarea, .${prefix}-field select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .${prefix}-field input:focus, .${prefix}-field textarea:focus, .${prefix}-field select:focus {
        outline: none;
        border-color: #3F51B5;
        box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
      }
      .${prefix}-field select {
        background: #fff;
        cursor: pointer;
      }
      .${prefix}-field select:disabled {
        background: #f5f5f5;
        color: #999;
        cursor: not-allowed;
      }
      .${prefix}-field textarea {
        resize: vertical;
        min-height: 60px;
      }
      .${prefix}-field.readonly input {
        background: #f5f5f5;
        color: #666;
      }
      .${prefix}-combobox {
        position: relative;
      }
      .${prefix}-combobox-input {
        width: 100%;
        padding: 10px 36px 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .${prefix}-combobox-input:focus {
        outline: none;
        border-color: #3F51B5;
        box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
      }
      .${prefix}-combobox-input:disabled {
        background: #f5f5f5;
        color: #999;
      }
      .${prefix}-combobox-toggle {
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
      .${prefix}-combobox-toggle:hover {
        background: #e8e8e8;
      }
      .${prefix}-combobox-toggle:disabled {
        cursor: not-allowed;
        color: #bbb;
      }
      .${prefix}-combobox-dropdown {
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
      .${prefix}-combobox-dropdown.open {
        display: block;
      }
      .${prefix}-combobox-option {
        padding: 10px 12px;
        cursor: pointer;
        font-size: 14px;
      }
      .${prefix}-combobox-option:hover {
        background: #E8EAF6;
      }
      .${prefix}-combobox-option.selected {
        background: #C5CAE9;
        color: #303F9F;
      }
      .${prefix}-combobox-empty {
        padding: 10px 12px;
        color: #999;
        font-size: 14px;
      }
      .${prefix}-checkbox-group {
        margin-top: 8px;
      }
      .${prefix}-checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 6px;
        margin-bottom: 6px;
      }
      .${prefix}-checkbox-item input[type="checkbox"] {
        width: 18px;
        height: 18px;
      }
      .${prefix}-checkbox-item label {
        margin: 0;
        flex: 1;
        font-size: 14px;
        color: #333;
      }
      .${prefix}-checkbox-item.main-disease {
        background: #E8EAF6;
        border: 1px solid #9FA8DA;
      }
      .${prefix}-use-toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #fff3e0;
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .${prefix}-use-toggle input[type="checkbox"] {
        width: 20px;
        height: 20px;
      }
      .${prefix}-use-toggle label {
        font-weight: 500;
        color: #e65100;
      }
      .${prefix}-radio-group {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }
      .${prefix}-radio-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .${prefix}-radio-item input[type="radio"] {
        width: 18px;
        height: 18px;
      }
      .${prefix}-radio-item label {
        font-size: 14px;
        color: #333;
        margin: 0;
      }
      .${prefix}-date-row {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .${prefix}-date-row input[type="date"] {
        flex: 0 1 200px;
        min-width: 150px;
      }
      .${prefix}-period-group {
        display: flex;
        gap: 12px;
        flex-shrink: 0;
      }
      .${prefix}-period-group label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        cursor: pointer;
        white-space: nowrap;
      }
      .${prefix}-footer {
        padding: 16px 24px;
        background: #f5f5f5;
        border-radius: 0 0 12px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .${prefix}-footer-left {
        font-size: 12px;
        color: #888;
      }
      .${prefix}-footer-right {
        display: flex;
        gap: 12px;
      }
      .${prefix}-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .${prefix}-btn-secondary {
        background: #e0e0e0;
        color: #333;
      }
      .${prefix}-btn-secondary:hover {
        background: #d0d0d0;
      }
      .${prefix}-btn-primary {
        background: #3F51B5;
        color: white;
      }
      .${prefix}-btn-primary:hover {
        background: #3949AB;
      }
      .${prefix}-btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .${prefix}-btn-link {
        background: #E8EAF6;
        color: #303F9F;
        border: 1px solid #9FA8DA;
        padding: 8px 12px;
        white-space: nowrap;
        font-size: 13px;
      }
      .${prefix}-btn-link:hover {
        background: #C5CAE9;
      }
    `;
  }

  // ==========================================
  // フォームフィールドCSS（モーダル骨格を除く）
  // ==========================================

  /**
   * フォームフィールド専用CSS（section, field, combobox, checkbox, radio, btn等）
   * showFormModal() と組み合わせて使用する。モーダル骨格CSSは showModal({ variant: 'form' }) が提供する。
   * @param {string} prefix - CSSクラスのプレフィックス
   * @returns {string} CSS文字列
   */
  function generateFormCSS(prefix) {
    return `
      .${prefix}-section {
        margin-bottom: 24px;
      }
      .${prefix}-section-title {
        font-size: 16px;
        font-weight: 600;
        color: #3F51B5;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #C5CAE9;
      }
      .${prefix}-row {
        display: flex;
        gap: 16px;
        margin-bottom: 12px;
      }
      .${prefix}-field {
        flex: 1;
      }
      .${prefix}-field label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #666;
        margin-bottom: 4px;
      }
      .${prefix}-field input, .${prefix}-field textarea, .${prefix}-field select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .${prefix}-field input:focus, .${prefix}-field textarea:focus, .${prefix}-field select:focus {
        outline: none;
        border-color: #3F51B5;
        box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
      }
      .${prefix}-field select {
        background: #fff;
        cursor: pointer;
      }
      .${prefix}-field select:disabled {
        background: #f5f5f5;
        color: #999;
        cursor: not-allowed;
      }
      .${prefix}-field textarea {
        resize: vertical;
        min-height: 60px;
      }
      .${prefix}-field.readonly input {
        background: #f5f5f5;
        color: #666;
      }
      .${prefix}-combobox {
        position: relative;
      }
      .${prefix}-combobox-input {
        width: 100%;
        padding: 10px 36px 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .${prefix}-combobox-input:focus {
        outline: none;
        border-color: #3F51B5;
        box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.2);
      }
      .${prefix}-combobox-input:disabled {
        background: #f5f5f5;
        color: #999;
      }
      .${prefix}-combobox-toggle {
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
      .${prefix}-combobox-toggle:hover {
        background: #e8e8e8;
      }
      .${prefix}-combobox-toggle:disabled {
        cursor: not-allowed;
        color: #bbb;
      }
      .${prefix}-combobox-dropdown {
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
      .${prefix}-combobox-dropdown.open {
        display: block;
      }
      .${prefix}-combobox-option {
        padding: 10px 12px;
        cursor: pointer;
        font-size: 14px;
      }
      .${prefix}-combobox-option:hover {
        background: #E8EAF6;
      }
      .${prefix}-combobox-option.selected {
        background: #C5CAE9;
        color: #303F9F;
      }
      .${prefix}-combobox-empty {
        padding: 10px 12px;
        color: #999;
        font-size: 14px;
      }
      .${prefix}-checkbox-group {
        margin-top: 8px;
      }
      .${prefix}-checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 6px;
        margin-bottom: 6px;
      }
      .${prefix}-checkbox-item input[type="checkbox"] {
        width: 18px;
        height: 18px;
      }
      .${prefix}-checkbox-item label {
        margin: 0;
        flex: 1;
        font-size: 14px;
        color: #333;
      }
      .${prefix}-checkbox-item.main-disease {
        background: #E8EAF6;
        border: 1px solid #9FA8DA;
      }
      .${prefix}-use-toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #fff3e0;
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .${prefix}-use-toggle input[type="checkbox"] {
        width: 20px;
        height: 20px;
      }
      .${prefix}-use-toggle label {
        font-weight: 500;
        color: #e65100;
      }
      .${prefix}-radio-group {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }
      .${prefix}-radio-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .${prefix}-radio-item input[type="radio"] {
        width: 18px;
        height: 18px;
      }
      .${prefix}-radio-item label {
        font-size: 14px;
        color: #333;
        margin: 0;
      }
      .${prefix}-date-row {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .${prefix}-date-row input[type="date"] {
        flex: 0 1 200px;
        min-width: 150px;
      }
      .${prefix}-period-group {
        display: flex;
        gap: 12px;
        flex-shrink: 0;
      }
      .${prefix}-period-group label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        cursor: pointer;
        white-space: nowrap;
      }
      .${prefix}-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .${prefix}-btn-secondary {
        background: #e0e0e0;
        color: #333;
      }
      .${prefix}-btn-secondary:hover {
        background: #d0d0d0;
      }
      .${prefix}-btn-primary {
        background: #3F51B5;
        color: white;
      }
      .${prefix}-btn-primary:hover {
        background: #3949AB;
      }
      .${prefix}-btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .${prefix}-btn-link {
        background: #E8EAF6;
        color: #303F9F;
        border: 1px solid #9FA8DA;
        padding: 8px 12px;
        white-space: nowrap;
        font-size: 13px;
      }
      .${prefix}-btn-link:hover {
        background: #C5CAE9;
      }
    `;
  }

  // ==========================================
  // フォームモーダル共通構築
  // ==========================================

  /**
   * フォームモーダルを構築・表示する共通関数
   * HenryCore.ui.showModal({ variant: 'form' }) をラップし、isDirty追跡・confirmClose・共通フッターを提供する。
   *
   * @param {Object} config
   * @param {string} config.id - モーダルID（重複排除用）
   * @param {string} config.title - モーダルタイトル
   * @param {string} config.prefix - CSSプレフィックス
   * @param {string|HTMLElement} config.bodyHTML - フォーム本体のHTML文字列またはDOM要素
   * @param {string} [config.headerColor='#3F51B5'] - ヘッダー背景色
   * @param {string} [config.extraCSS=''] - スクリプト固有の追加CSS
   * @param {string} [config.width] - モーダルの幅
   *
   * @param {string} config.draftType - DraftStorage タイプ
   * @param {number} config.draftSchemaVersion - DraftStorage スキーマバージョン
   * @param {string} config.patientUuid - 患者UUID
   * @param {string} config.patientName - 患者名（DraftStorage保存用）
   * @param {string|null} [config.lastSavedAt] - 前回保存日時
   *
   * @param {Array} [config.extraActions=[]] - 標準ボタンの前に追加するアクション配列
   * @param {boolean} [config.deleteDraftOnGenerate=true] - Google Docs出力成功後に下書きを削除するか
   *
   * @param {function} config.collectFormData - (bodyEl) => Object フォームデータを収集
   * @param {function} config.onClear - (bodyEl) => void クリア処理
   * @param {function} config.onGenerate - async (data) => void Google Docs出力
   * @param {function} [config.onSetup] - (bodyEl, helpers) => void スクリプト固有の初期化
   *
   * @returns {{ close, element, body, isDirty: () => boolean, setDirty: (v) => void, setFooterLeft }}
   */
  function showFormModal(config) {
    const {
      id, title, prefix, bodyHTML,
      headerColor = '#3F51B5', extraCSS = '', width = '90%',
      draftType, draftSchemaVersion, patientUuid, patientName,
      lastSavedAt = null,
      extraActions = [], deleteDraftOnGenerate = true,
      collectFormData, onClear, onGenerate, onSetup,
    } = config;

    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) {
      console.error(`[${SCRIPT_NAME}] HenryCore not found`);
      return null;
    }

    // 既存モーダル（同ID）を削除
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    // CSS付きのコンテンツを構築
    const contentEl = document.createElement('div');
    if (typeof bodyHTML === 'string') {
      const cssStr = prefix ? generateFormCSS(prefix) : '';
      contentEl.innerHTML = `<style>${cssStr}${extraCSS}</style>${bodyHTML}`;
    } else if (bodyHTML instanceof HTMLElement) {
      if (prefix || extraCSS) {
        const style = document.createElement('style');
        style.textContent = (prefix ? generateFormCSS(prefix) : '') + extraCSS;
        contentEl.appendChild(style);
      }
      contentEl.appendChild(bodyHTML);
    }

    // isDirty 追跡
    let isDirty = false;

    // confirmClose: onBeforeClose に接続
    const confirmClose = async () => {
      if (!isDirty) return; // undefined = 閉じてOK
      const save = await HenryCore.ui.showConfirm({
        title: '未保存の変更',
        message: '変更内容を下書き保存しますか？',
        confirmLabel: '保存して閉じる',
        cancelLabel: '保存せず閉じる'
      });
      if (save) {
        const data = collectFormData(modal.body);
        const ds = HenryCore.modules?.DraftStorage;
        if (ds) {
          const payload = { schemaVersion: draftSchemaVersion, data };
          await ds.save(draftType, patientUuid, payload, patientName || '');
        }
      }
      // undefined を返す = 閉じてOK
    };

    // フッターボタン
    const actions = [
      {
        label: 'クリア',
        variant: 'secondary',
        autoClose: false,
        onClick: async () => {
          const confirmed = await HenryCore.ui.showConfirm({
            title: '入力内容のクリア',
            message: '手入力した内容をすべてクリアしますか？\n（患者情報などの自動入力項目はクリアされません）',
            confirmLabel: 'クリア',
            cancelLabel: 'キャンセル'
          });
          if (!confirmed) return;
          if (onClear) onClear(modal.body);
          isDirty = false;
        },
        className: 'form-btn-clear',
      },
      {
        label: '下書き保存',
        variant: 'secondary',
        autoClose: false,
        onClick: async () => {
          const data = collectFormData(modal.body);
          const ds = HenryCore.modules?.DraftStorage;
          if (ds) {
            const payload = { schemaVersion: draftSchemaVersion, data };
            const saved = await ds.save(draftType, patientUuid, payload, patientName || '');
            if (saved) {
              isDirty = false;
              modal.setFooterLeft(`下書き: ${new Date().toLocaleString('ja-JP')}`);
              HenryCore.ui.showToast('下書きを保存しました', 'success');
            }
          }
        },
      },
      {
        label: 'Google Docsに出力',
        variant: 'primary',
        autoClose: false,
        id: `${prefix}-generate`,
        onClick: async (e, btn) => {
          btn.disabled = true;
          btn.textContent = '生成中...';
          try {
            const data = collectFormData(modal.body);
            await onGenerate(data);
            if (deleteDraftOnGenerate !== false) {
              const ds = HenryCore.modules?.DraftStorage;
              if (ds) await ds.delete(draftType, patientUuid);
            }
            modal.close();
          } catch (err) {
            console.error(`[${SCRIPT_NAME}] 出力エラー:`, err);
            alert(`エラーが発生しました: ${err.message}`);
            btn.disabled = false;
            btn.textContent = 'Google Docsに出力';
          }
        },
      },
    ];

    // extraActions を標準ボタンの前に追加（onClick に bodyEl を渡す）
    let modalRef = null;
    const wrappedExtraActions = extraActions.map(action => ({
      ...action,
      onClick: (e, btn) => action.onClick(e, btn, modalRef?.body),
    }));
    const allActions = [...wrappedExtraActions, ...actions];

    // showModal({ variant: 'form' }) を呼ぶ
    const modal = HenryCore.ui.showModal({
      title,
      content: contentEl,
      actions: allActions,
      width,
      variant: 'form',
      showCloseButton: true,
      closeOnEsc: true,
      closeOnOverlayClick: true,
      onBeforeClose: confirmClose,
      headerColor,
      footerLeft: lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : '',
      className: id,
    });

    modalRef = modal;

    // モーダルにIDを設定（重複排除用）
    const modalContent = modal.element.querySelector('.henry-modal-content');
    if (modalContent) modalContent.id = id;

    // isDirty 追跡をbodyのinput/changeイベントで自動設定
    if (modal.body) {
      modal.body.addEventListener('input', () => { isDirty = true; });
      modal.body.addEventListener('change', () => { isDirty = true; });
    }

    // クリアボタンのスタイル（赤文字）
    const clearBtn = modal.element.querySelector('.form-btn-clear');
    if (clearBtn) clearBtn.style.color = '#d32f2f';

    // スクリプト固有の初期化
    if (onSetup && modal.body) {
      onSetup(modal.body, {
        isDirty: () => isDirty,
        setDirty: (v) => { isDirty = v; },
      });
    }

    return {
      close: modal.close,
      element: modal.element,
      body: modal.body,
      isDirty: () => isDirty,
      setDirty: (v) => { isDirty = v; },
      setFooterLeft: modal.setFooterLeft,
    };
  }

  // ==========================================
  // Google Docs出力の共通スキャフォールド
  // ==========================================

  /**
   * Google Docsテンプレートをコピーしてプレースホルダーを置換する共通フロー
   * @param {Object} config
   * @param {string} config.scriptName - スクリプト名（ログ用）
   * @param {string} config.templateId - Google DocsテンプレートのID
   * @param {string} config.fileName - 出力ファイル名
   * @param {string} config.source - henrySource（メタデータ用）
   * @param {string} config.patientUuid - 患者UUID
   * @param {Object} config.replacements - { '{{placeholder}}': 'value' }
   */
  async function generateDoc(config) {
    const { scriptName, templateId, fileName, source, patientUuid, replacements } = config;
    const HenryCore = pageWindow.HenryCore;
    const spinner = HenryCore?.ui?.showSpinner?.('Google Docsを生成中...');

    try {
      // アクセストークン確認
      await getGoogleAuth().getValidAccessToken();

      // 出力フォルダ取得/作成
      const folder = await DriveAPI.getOrCreateFolder('Henry一時ファイル');

      // テンプレートをコピー（メタデータ付き）
      const properties = {
        henryPatientUuid: patientUuid || '',
        henryFileUuid: '',
        henryFolderUuid: folder.id,
        henrySource: source
      };
      const newDoc = await DriveAPI.copyFile(templateId, fileName, folder.id, properties);

      // プレースホルダー置換リクエスト作成
      const requests = Object.entries(replacements).map(([key, value]) =>
        DocsAPI.createReplaceTextRequest(key, value)
      );

      // 置換実行
      await DocsAPI.batchUpdate(newDoc.id, requests, scriptName);

      spinner?.close();

      // 新しいドキュメントを開く
      const docUrl = `https://docs.google.com/document/d/${newDoc.id}/edit`;
      GM_openInTab(docUrl, { active: true });

      console.log(`[${scriptName}] Google Docs生成完了: ${docUrl}`);

      return newDoc;
    } catch (e) {
      spinner?.close();
      throw e;
    }
  }

  // ==========================================
  // プラグイン初期化ヘルパー
  // ==========================================

  /**
   * HenryCore待機 + registerPlugin のボイラープレートを1行に
   * @param {Object} config
   * @param {string} config.scriptName - スクリプト名
   * @param {string} config.version - バージョン
   * @param {Object} config.pluginConfig - registerPlugin に渡す設定
   * @param {Function} [config.onReady] - 初期化完了後のコールバック
   */
  async function initPlugin(config) {
    const { scriptName, version, pluginConfig, onReady } = config;

    // HenryCore待機
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 10000) {
        console.error(`[${scriptName}] HenryCore が見つかりません`);
        return;
      }
    }

    // プラグイン登録
    await pageWindow.HenryCore.registerPlugin(pluginConfig);

    if (onReady) onReady();

    console.log(`[${scriptName}] Ready (v${version})`);
  }

  // ==========================================
  // 公開API
  // ==========================================

  pageWindow.HenryFormCommons = {
    DriveAPI,
    DocsAPI,
    QUERIES,
    UNIT_CODES,
    utils,
    data,
    generateBaseCSS,   // 非推奨: generateFormCSS + showFormModal を使用すること
    generateFormCSS,
    showFormModal,
    generateDoc,
    initPlugin,
    getGoogleAuth
  };

  console.log('[FormCommons] Ready (v' + GM_info.script.version + ')');
})();
