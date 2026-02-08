// ==UserScript==
// @name         警察診断書フォーム
// @namespace    https://henry-app.jp/
// @version      1.0.4
// @description  警察提出用診断書の入力フォームとGoogle Docs出力
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_police_certificate.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_police_certificate.user.js
// ==/UserScript==

/*
 * 【警察診断書フォーム】
 *
 * ■ 使用場面
 * - 警察提出用の診断書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、生年月日、性別、住所）
 *    - 作成者（医師名）
 *    - 病名（選択式）
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

  const SCRIPT_NAME = 'PoliceCertificate';
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
    TEMPLATE_ID: '1OreF4-c5DTm_sqKwm_fKtRlA3EkG_p2XB62JxoIq6g4',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 医療機関情報
  const INSTITUTION_INFO = {
    name: 'マオカ病院',
    postal_code: '〒760-0052',
    address: '香川県高松市瓦町１丁目12-45',
    phone: '087-862-8888',
    fax: '087-863-0880'
  };

  // localStorage設定
  const STORAGE_KEY_PREFIX = 'henry_police_cert_draft_';
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

  function getTodayWareki() {
    const today = new Date();
    return toWareki(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  function getTodayISO() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function isoToWareki(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-').map(Number);
    return toWareki(year, month, day);
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
        birth_date_wareki: birthYear ? toWareki(birthYear, birthMonth, birthDay) : '',
        sex: formatSex(p.detail?.sexType),
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

  // 病名を文字列にフォーマット
  function formatDiseases(diseases) {
    if (!diseases || diseases.length === 0) return '';
    return diseases.map(d => {
      let name = d.name;
      if (d.isSuspected) name += '（疑い）';
      return name;
    }).join('，');
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showPoliceCertificateForm() {
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
      const [patientInfo, physicianName, diseases] = await Promise.all([
        fetchPatientInfo(),
        fetchPhysicianName(),
        fetchDiseases(patientUuid)
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
        patient_sex: patientInfo.sex,
        patient_address: patientInfo.address,
        physician_name: physicianName,
        creation_date_wareki: getTodayWareki(),

        // 選択式自動取得
        diseases: diseases,
        use_diseases: true,
        selected_diseases: [],

        // 手入力項目
        diagnosis_text: '',
        visit_date: getTodayISO(),
        treatment_period: '',
        remarks: ''
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_birth_date_wareki = patientInfo.birth_date_wareki;
      formData.patient_sex = patientInfo.sex;
      formData.patient_address = patientInfo.address;
      formData.physician_name = physicianName;
      formData.creation_date_wareki = getTodayWareki();
      formData.diseases = diseases;

      // モーダル表示
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function showFormModal(formData, lastSavedAt) {
    // 既存モーダルを削除
    const existingModal = document.getElementById('police-cert-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'police-cert-modal';
    modal.innerHTML = `
      <style>
        #police-cert-modal {
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
        .pc-container {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .pc-header {
          padding: 20px 24px;
          background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
          color: white;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pc-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .pc-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
        }
        .pc-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .pc-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .pc-section {
          margin-bottom: 24px;
        }
        .pc-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #d32f2f;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #ffcdd2;
        }
        .pc-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        .pc-field {
          flex: 1;
        }
        .pc-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          margin-bottom: 4px;
        }
        .pc-field input, .pc-field textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .pc-field input:focus, .pc-field textarea:focus {
          outline: none;
          border-color: #d32f2f;
          box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
        }
        .pc-field textarea {
          resize: vertical;
          min-height: 80px;
        }
        .pc-field.readonly input {
          background: #f5f5f5;
          color: #666;
        }
        .pc-checkbox-group {
          margin-top: 8px;
        }
        .pc-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .pc-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .pc-checkbox-item label {
          margin: 0;
          flex: 1;
          font-size: 14px;
          color: #333;
        }
        .pc-checkbox-item.main-disease {
          background: #ffebee;
          border: 1px solid #ef9a9a;
        }
        .pc-use-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff3e0;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .pc-use-toggle input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }
        .pc-use-toggle label {
          font-weight: 500;
          color: #e65100;
        }
        .pc-footer {
          padding: 16px 24px;
          background: #f5f5f5;
          border-radius: 0 0 12px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pc-footer-left {
          font-size: 12px;
          color: #888;
        }
        .pc-footer-right {
          display: flex;
          gap: 12px;
        }
        .pc-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pc-btn-secondary {
          background: #e0e0e0;
          color: #333;
        }
        .pc-btn-secondary:hover {
          background: #d0d0d0;
        }
        .pc-btn-primary {
          background: #d32f2f;
          color: white;
        }
        .pc-btn-primary:hover {
          background: #b71c1c;
        }
        .pc-btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      </style>
      <div class="pc-container">
        <div class="pc-header">
          <h2>警察診断書 - ${escapeHtml(formData.patient_name)}</h2>
          <button class="pc-close" title="閉じる">&times;</button>
        </div>
        <div class="pc-body">
          <!-- 診断名 -->
          <div class="pc-section">
            <div class="pc-section-title">病名</div>
            ${formData.diseases.length > 0 ? `
              <div class="pc-use-toggle">
                <input type="checkbox" id="pc-use-diseases" ${formData.use_diseases ? 'checked' : ''}>
                <label for="pc-use-diseases">登録済み病名を使用する</label>
              </div>
              <div id="pc-diseases-list" class="pc-checkbox-group" ${formData.use_diseases ? '' : 'style="display:none;"'}>
                ${formData.diseases.map(d => `
                  <div class="pc-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                    <input type="checkbox" id="pc-disease-${d.uuid}" value="${d.uuid}"
                      ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                    <label for="pc-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                  </div>
                `).join('')}
              </div>
              <div id="pc-diagnosis-manual" style="${formData.use_diseases ? 'display:none;' : ''}">
                <div class="pc-field">
                  <label>病名（手入力）</label>
                  <textarea id="pc-diagnosis-text" placeholder="病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
                </div>
              </div>
            ` : `
              <div class="pc-field">
                <label>病名</label>
                <textarea id="pc-diagnosis-text" placeholder="病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
              </div>
            `}
          </div>

          <!-- 受診日 -->
          <div class="pc-section">
            <div class="pc-section-title">受診日</div>
            <div class="pc-row">
              <div class="pc-field">
                <label>受診日</label>
                <input type="date" id="pc-visit-date" value="${formData.visit_date || getTodayISO()}">
              </div>
            </div>
          </div>

          <!-- 治療見込み -->
          <div class="pc-section">
            <div class="pc-section-title">治療見込み</div>
            <div class="pc-row">
              <div class="pc-field">
                <label>安静加療期間</label>
                <input type="text" id="pc-treatment-period" value="${escapeHtml(formData.treatment_period)}" placeholder="例: 2週間">
              </div>
            </div>
          </div>

          <!-- 特記事項 -->
          <div class="pc-section">
            <div class="pc-section-title">特記事項</div>
            <div class="pc-field">
              <textarea id="pc-remarks" rows="3" placeholder="特記事項があれば入力">${escapeHtml(formData.remarks)}</textarea>
            </div>
          </div>
        </div>
        <div class="pc-footer">
          <div class="pc-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="pc-footer-right">
            <button class="pc-btn pc-btn-secondary" id="pc-save-draft">下書き保存</button>
            <button class="pc-btn pc-btn-primary" id="pc-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    modal.querySelector('.pc-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // 病名使用トグル
    const useDiseases = modal.querySelector('#pc-use-diseases');
    if (useDiseases) {
      useDiseases.addEventListener('change', () => {
        const diseasesList = modal.querySelector('#pc-diseases-list');
        const diagnosisManual = modal.querySelector('#pc-diagnosis-manual');
        if (useDiseases.checked) {
          diseasesList.style.display = '';
          diagnosisManual.style.display = 'none';
        } else {
          diseasesList.style.display = 'none';
          diagnosisManual.style.display = '';
        }
      });
    }

    // 下書き保存
    modal.querySelector('#pc-save-draft').addEventListener('click', () => {
      const data = collectFormData(modal, formData);
      if (saveDraft(formData.patient_uuid, data)) {
        alert('下書きを保存しました');
      }
    });

    // Google Docs出力
    modal.querySelector('#pc-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#pc-generate');
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

  function collectFormData(modal, originalData) {
    const data = { ...originalData };

    data.visit_date = modal.querySelector('#pc-visit-date')?.value || getTodayISO();
    data.treatment_period = modal.querySelector('#pc-treatment-period')?.value || '';
    data.remarks = modal.querySelector('#pc-remarks')?.value || '';

    // 病名
    const useDiseases = modal.querySelector('#pc-use-diseases');
    data.use_diseases = useDiseases?.checked ?? false;

    if (data.use_diseases && data.diseases.length > 0) {
      data.selected_diseases = [];
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#pc-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    } else {
      data.diagnosis_text = modal.querySelector('#pc-diagnosis-text')?.value || '';
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
    const fileName = `警察診断書_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`;
    const properties = {
      henryPatientUuid: formData.patient_uuid || '',
      henryFileUuid: '',  // 新規作成なので空
      henryFolderUuid: folder.id,
      henrySource: 'police-certificate'
    };
    const newDoc = await DriveAPI.copyFile(TEMPLATE_CONFIG.TEMPLATE_ID, fileName, folder.id, properties);

    // 診断名テキスト作成
    let diagnosisText = '';
    if (formData.use_diseases && formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
      diagnosisText = selectedDiseases.map(d => d.name + (d.isSuspected ? '（疑い）' : '')).join('，');
    } else {
      diagnosisText = formData.diagnosis_text || '';
    }

    // 受診日を和暦に変換
    const visitDateWareki = isoToWareki(formData.visit_date);

    // プレースホルダー置換リクエスト作成
    const requests = [
      DocsAPI.createReplaceTextRequest('{{作成日_和暦}}', formData.creation_date_wareki),
      DocsAPI.createReplaceTextRequest('{{患者氏名}}', formData.patient_name),
      DocsAPI.createReplaceTextRequest('{{性別}}', formData.patient_sex),
      DocsAPI.createReplaceTextRequest('{{患者生年月日_和暦}}', formData.patient_birth_date_wareki),
      DocsAPI.createReplaceTextRequest('{{患者住所}}', formData.patient_address),
      DocsAPI.createReplaceTextRequest('{{医師名}}', formData.physician_name),
      DocsAPI.createReplaceTextRequest('{{診断名}}', diagnosisText),
      DocsAPI.createReplaceTextRequest('{{受診日}}', visitDateWareki),
      DocsAPI.createReplaceTextRequest('{{治療見込み}}', formData.treatment_period),
      DocsAPI.createReplaceTextRequest('{{特記事項}}', formData.remarks)
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
      id: 'police-certificate',
      name: '警察診断書',
      icon: '🚔',
      description: '警察提出用診断書を作成',
      version: VERSION,
      order: 210,
      group: '文書作成',
      groupIcon: '📝',
      onClick: showPoliceCertificateForm
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
