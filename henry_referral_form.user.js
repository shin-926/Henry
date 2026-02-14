// ==UserScript==
// @name         診療情報提供書フォーム
// @namespace    https://henry-app.jp/
// @version      1.10.0
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
 * - henry_form_commons.user.js: 共通モジュール
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

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1Fj9vz8kQpwo2WCJ4Vo5KFlZoSlhVY_j9PoPouiTUyFs',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 下書き設定
  const DRAFT_TYPE = 'referral';
  const DRAFT_LS_PREFIX = 'henry_referral_draft_';  // マイグレーション用
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 紹介状固有ユーティリティ
  // ==========================================

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

  // 診療科名取得（紹介状固有）
  async function fetchDepartmentName() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return '';
    return await HenryCore.getMyDepartment() || '';
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
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
    const googleAuth = FC().getGoogleAuth();
    if (!googleAuth) {
      alert('Google認証が設定されていません。\nHenry Toolboxの設定からGoogle認証を行ってください。');
      return;
    }

    const spinner = HenryCore.ui?.showSpinner?.('診療情報提供書を準備中...');
    try {
      const { data, utils } = FC();

      // データ取得（並列実行）
      const [patientInfo, physicianName, departmentName, diseases, prescriptions] = await Promise.all([
        data.fetchPatientInfo(SCRIPT_NAME),
        data.fetchPhysicianName(SCRIPT_NAME),
        fetchDepartmentName(),
        data.fetchDiseases(patientUuid, SCRIPT_NAME),
        data.fetchLatestPrescriptions(patientUuid, SCRIPT_NAME)
      ]);

      if (!patientInfo) {
        alert('患者情報を取得できませんでした');
        spinner?.close();
        return;
      }

      // 下書き読み込み（Spreadsheet / localStorageマイグレーション）
      const ds = pageWindow.HenryCore?.modules?.DraftStorage;
      const savedDraft = ds ? await ds.load(DRAFT_TYPE, patientUuid, {
        localStoragePrefix: DRAFT_LS_PREFIX,
        validate: (p) => p.schemaVersion === DRAFT_SCHEMA_VERSION && p.data
      }) : null;

      // フォームデータ作成
      const formData = savedDraft?.data?.data || {
        // 自動入力項目
        patient_uuid: patientUuid,
        patient_name: patientInfo.patient_name,
        patient_birth_date_wareki: patientInfo.birth_date_wareki,
        patient_age: patientInfo.age,
        patient_sex: patientInfo.sex,
        patient_address: patientInfo.address,
        patient_phone: utils.formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        department_name: departmentName,
        creation_date_wareki: utils.getTodayWareki(),

        // 選択式自動取得
        diseases: diseases,
        prescriptions: prescriptions,
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
      formData.patient_phone = utils.formatPhoneNumber(patientInfo.phone);
      formData.physician_name = physicianName;
      formData.department_name = departmentName;
      formData.creation_date_wareki = utils.getTodayWareki();
      formData.diseases = diseases;
      formData.prescriptions = prescriptions;

      // モーダル表示
      spinner?.close();
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function buildFormBody(formData) {
    const prefix = 'rf';
    const escapeHtml = FC().utils.escapeHtml;

    return `
      <!-- 紹介先 -->
      <div class="${prefix}-section">
        <div class="${prefix}-section-title">紹介先</div>
        <div class="${prefix}-row">
          <div class="${prefix}-field">
            <label>病院名</label>
            <div class="${prefix}-combobox" data-field="hospital">
              <input type="text" class="${prefix}-combobox-input" id="${prefix}-dest-hospital" value="${escapeHtml(formData.destination_hospital)}" placeholder="病院名を入力">
              <button type="button" class="${prefix}-combobox-toggle" title="リストから選択">▼</button>
              <div class="${prefix}-combobox-dropdown" id="${prefix}-hospital-dropdown"></div>
            </div>
          </div>
          <div class="${prefix}-field">
            <label>診療科</label>
            <div class="${prefix}-combobox" data-field="department">
              <input type="text" class="${prefix}-combobox-input" id="${prefix}-dest-department" value="${escapeHtml(formData.destination_department)}" placeholder="診療科を入力" ${!formData.destination_hospital ? 'disabled' : ''}>
              <button type="button" class="${prefix}-combobox-toggle" ${!formData.destination_hospital ? 'disabled' : ''} title="リストから選択">▼</button>
              <div class="${prefix}-combobox-dropdown" id="${prefix}-department-dropdown"></div>
            </div>
          </div>
          <div class="${prefix}-field">
            <label>医師名</label>
            <div class="${prefix}-combobox" data-field="doctor">
              <input type="text" class="${prefix}-combobox-input" id="${prefix}-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
              <button type="button" class="${prefix}-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
              <div class="${prefix}-combobox-dropdown" id="${prefix}-doctor-dropdown"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 診断名 -->
      <div class="${prefix}-section">
        <div class="${prefix}-section-title">診断名</div>
        ${formData.diseases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
            <div id="${prefix}-diseases-list" class="${prefix}-checkbox-group">
              ${formData.diseases.map(d => `
                <div class="${prefix}-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                  <input type="checkbox" id="${prefix}-disease-${d.uuid}" value="${d.uuid}"
                    ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                  <label for="${prefix}-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="${prefix}-field">
          <label>自由記述</label>
          <textarea id="${prefix}-diagnosis-text" placeholder="診断名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
        </div>
      </div>

      <!-- 処方 -->
      <div class="${prefix}-section">
        <div class="${prefix}-section-title">現在の処方</div>
        ${formData.prescriptions.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">処方履歴から選択</label>
            <div id="${prefix}-prescriptions-list" class="${prefix}-checkbox-group">
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
                  <div class="${prefix}-checkbox-item ${prefix}-prescription-item">
                    <input type="checkbox" id="${prefix}-prescription-${rx.recordId}" value="${rx.recordId}" ${isSelected ? 'checked' : ''}>
                    <div class="${prefix}-prescription-content">
                      <div class="${prefix}-prescription-header">
                        <span class="${prefix}-prescription-date">${dateStr}</span>
                        ${category ? `<span class="${prefix}-prescription-category" style="${categoryStyle}">${category}</span>` : ''}
                      </div>
                      <div class="${prefix}-prescription-meds">${escapeHtml(medsPreview)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        <div class="${prefix}-field">
          <label>自由記述</label>
          <textarea id="${prefix}-prescription-text" placeholder="処方内容を入力">${escapeHtml(formData.prescription_text)}</textarea>
        </div>
      </div>

      <!-- 紹介目的・経過 -->
      <div class="${prefix}-section">
        <div class="${prefix}-section-title">紹介目的および病状経過</div>
        <div class="${prefix}-field">
          <textarea id="${prefix}-purpose" rows="5" placeholder="紹介目的、現病歴、経過などを入力">${escapeHtml(formData.purpose_and_history)}</textarea>
        </div>
      </div>

      <!-- 既往歴・家族歴 -->
      <div class="${prefix}-section">
        <div class="${prefix}-section-title">既往歴および家族歴</div>
        ${formData.diseases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
            <div id="${prefix}-family-diseases-list" class="${prefix}-checkbox-group">
              ${formData.diseases.map(d => `
                <div class="${prefix}-checkbox-item">
                  <input type="checkbox" id="${prefix}-family-disease-${d.uuid}" value="${d.uuid}"
                    ${formData.selected_family_diseases?.includes(d.uuid) ? 'checked' : ''}>
                  <label for="${prefix}-family-disease-${d.uuid}">${escapeHtml(d.name)}${d.isSuspected ? ' (疑い)' : ''}</label>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="${prefix}-field">
          <label>自由記述</label>
          <textarea id="${prefix}-family-history" rows="3" placeholder="既往歴、家族歴を入力">${escapeHtml(formData.family_history_text)}</textarea>
        </div>
      </div>

      <!-- 備考 -->
      <div class="${prefix}-section">
        <div class="${prefix}-section-title">備考</div>
        <div class="${prefix}-field">
          <textarea id="${prefix}-remarks" rows="3" placeholder="その他の情報">${escapeHtml(formData.remarks)}</textarea>
        </div>
      </div>
    `;
  }

  function clearFormFields(bodyEl) {
    const prefix = 'rf';

    // 紹介先
    const hospInput = bodyEl.querySelector(`#${prefix}-dest-hospital`);
    const depInput = bodyEl.querySelector(`#${prefix}-dest-department`);
    const docInput = bodyEl.querySelector(`#${prefix}-dest-doctor`);
    if (hospInput) hospInput.value = '';
    if (depInput) { depInput.value = ''; depInput.disabled = true; }
    if (docInput) { docInput.value = ''; docInput.disabled = true; }

    // コンボボックスのトグルボタンもdisabledに
    bodyEl.querySelector(`.${prefix}-combobox[data-field="department"] .${prefix}-combobox-toggle`)?.setAttribute('disabled', '');
    bodyEl.querySelector(`.${prefix}-combobox[data-field="doctor"] .${prefix}-combobox-toggle`)?.setAttribute('disabled', '');

    // テキストエリア
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // チェックボックス（病名・処方・既往歴の選択をリセット）
    bodyEl.querySelectorAll(`.${prefix}-checkbox-group input[type="checkbox"]`).forEach(cb => {
      cb.checked = false;
    });
  }

  function setupFormEvents(bodyEl) {
    const prefix = 'rf';
    const escapeHtml = FC().utils.escapeHtml;

    // 紹介先コンボボックスの連携
    const hospitalInput = bodyEl.querySelector(`#${prefix}-dest-hospital`);
    const hospitalDropdown = bodyEl.querySelector(`#${prefix}-hospital-dropdown`);
    const hospitalCombobox = bodyEl.querySelector(`.${prefix}-combobox[data-field="hospital"]`);
    const deptInput = bodyEl.querySelector(`#${prefix}-dest-department`);
    const deptDropdown = bodyEl.querySelector(`#${prefix}-department-dropdown`);
    const deptCombobox = bodyEl.querySelector(`.${prefix}-combobox[data-field="department"]`);
    const doctorInput = bodyEl.querySelector(`#${prefix}-dest-doctor`);
    const doctorDropdown = bodyEl.querySelector(`#${prefix}-doctor-dropdown`);
    const doctorCombobox = bodyEl.querySelector(`.${prefix}-combobox[data-field="doctor"]`);

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      bodyEl.querySelectorAll(`.${prefix}-combobox-dropdown`).forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = `<div class="${prefix}-combobox-empty">選択肢がありません</div>`;
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="${prefix}-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
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
    hospitalCombobox.querySelector(`.${prefix}-combobox-toggle`).addEventListener('click', (e) => {
      e.stopPropagation();
      if (hospitalDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openHospitalDropdown();
      }
    });

    // 病院選択肢クリック
    hospitalDropdown.addEventListener('click', (e) => {
      const option = e.target.closest(`.${prefix}-combobox-option`);
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
      deptCombobox.querySelector(`.${prefix}-combobox-toggle`).disabled = !hasHospital;
      if (!hasHospital) {
        deptInput.value = '';
        updateDoctorState();
      }
    }

    // 診療科▼ボタン
    deptCombobox.querySelector(`.${prefix}-combobox-toggle`).addEventListener('click', (e) => {
      e.stopPropagation();
      if (deptDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDepartmentDropdown();
      }
    });

    // 診療科選択肢クリック
    deptDropdown.addEventListener('click', (e) => {
      const option = e.target.closest(`.${prefix}-combobox-option`);
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
      doctorCombobox.querySelector(`.${prefix}-combobox-toggle`).disabled = !hasDept;
      if (!hasDept) {
        doctorInput.value = '';
      }
    }

    // 医師▼ボタン
    doctorCombobox.querySelector(`.${prefix}-combobox-toggle`).addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest(`.${prefix}-combobox-option`);
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // body内クリックでドロップダウンを閉じる
    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest(`.${prefix}-combobox`)) {
        closeAllDropdowns();
      }
    });

  }

  function showFormModal(formData, lastSavedAt) {
    const prefix = 'rf';

    const EXTRA_CSS = `
      .${prefix}-section-title {
        color: #1976d2;
        border-bottom-color: #e3f2fd;
      }
      .${prefix}-field input:focus, .${prefix}-field textarea:focus, .${prefix}-field select:focus {
        border-color: #1976d2;
        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
      }
      .${prefix}-combobox-input:focus {
        border-color: #1976d2;
        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
      }
      .${prefix}-combobox-option:hover {
        background: #f0f7ff;
      }
      .${prefix}-combobox-option.selected {
        background: #e3f2fd;
        color: #1565c0;
      }
      .${prefix}-checkbox-item.main-disease {
        background: #e3f2fd;
        border: 1px solid #90caf9;
      }
      .${prefix}-btn-primary {
        background: #1976d2;
      }
      .${prefix}-btn-primary:hover {
        background: #1565c0;
      }
      .${prefix}-field textarea {
        min-height: 80px;
      }
      .${prefix}-prescription-preview {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        max-height: 150px;
        overflow-y: auto;
      }
      .${prefix}-prescription-item {
        align-items: flex-start !important;
      }
      .${prefix}-prescription-item input[type="checkbox"] {
        margin-top: 4px;
      }
      .${prefix}-prescription-content {
        flex: 1;
        min-width: 0;
      }
      .${prefix}-prescription-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .${prefix}-prescription-date {
        font-weight: 600;
        color: #333;
        font-size: 13px;
      }
      .${prefix}-prescription-category {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
      }
      .${prefix}-prescription-meds {
        font-size: 12px;
        color: #666;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    `;

    FC().showFormModal({
      id: 'rf-form-modal',
      title: `診療情報提供書 - ${formData.patient_name}`,
      prefix,
      bodyHTML: buildFormBody(formData),
      extraCSS: EXTRA_CSS,
      width: '90%',
      headerColor: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
      draftType: DRAFT_TYPE,
      draftSchemaVersion: DRAFT_SCHEMA_VERSION,
      patientUuid: formData.patient_uuid,
      patientName: formData.patient_name,
      lastSavedAt,
      collectFormData: (bodyEl) => collectFormData(bodyEl, formData),
      onClear: (bodyEl) => clearFormFields(bodyEl),
      onGenerate: async (data) => { await generateGoogleDoc(data); },
      onSetup: (bodyEl) => { setupFormEvents(bodyEl); },
    });
  }

  function collectFormData(bodyEl, originalData) {
    const prefix = 'rf';
    const data = { ...originalData };

    // 紹介先（コンボボックスから取得）
    data.destination_hospital = bodyEl.querySelector(`#${prefix}-dest-hospital`)?.value || '';
    data.destination_department = bodyEl.querySelector(`#${prefix}-dest-department`)?.value || '';
    data.destination_doctor = bodyEl.querySelector(`#${prefix}-dest-doctor`)?.value || '';

    data.purpose_and_history = bodyEl.querySelector(`#${prefix}-purpose`)?.value || '';
    data.family_history_text = bodyEl.querySelector(`#${prefix}-family-history`)?.value || '';
    data.remarks = bodyEl.querySelector(`#${prefix}-remarks`)?.value || '';

    // 既往歴（選択と自由記述の両方を取得）
    data.selected_family_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#${prefix}-family-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_family_diseases.push(d.uuid);
        }
      });
    }

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#${prefix}-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector(`#${prefix}-diagnosis-text`)?.value || '';

    // 処方（選択と自由記述の両方を取得）
    data.selected_prescriptions = [];
    if (data.prescriptions.length > 0) {
      data.prescriptions.forEach(rx => {
        const cb = bodyEl.querySelector(`#${prefix}-prescription-${rx.recordId}`);
        if (cb?.checked) {
          data.selected_prescriptions.push(rx.recordId);
        }
      });
    }
    data.prescription_text = bodyEl.querySelector(`#${prefix}-prescription-text`)?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // 診断名テキスト作成（選択 + 自由記述を結合）
    const diagnosisParts = [];
    if (formData.selected_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
      const diseaseText = selectedDiseases.map(d => d.name).join('，');
      if (diseaseText) diagnosisParts.push(diseaseText);
    }
    if (formData.diagnosis_text) {
      diagnosisParts.push(formData.diagnosis_text);
    }
    const diagnosisText = diagnosisParts.join('\n');

    // 処方テキスト作成（選択 + 自由記述を結合）
    const prescriptionParts = [];
    if (formData.selected_prescriptions?.length > 0) {
      const selectedText = FC().data.formatSelectedPrescriptions(formData.prescriptions, formData.selected_prescriptions);
      if (selectedText) prescriptionParts.push(selectedText);
    }
    if (formData.prescription_text) {
      prescriptionParts.push(formData.prescription_text);
    }
    const prescriptionText = prescriptionParts.join('\n');

    // 既往歴テキスト作成（選択 + 自由記述を結合）
    const familyHistoryParts = [];
    if (formData.selected_family_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_family_diseases.includes(d.uuid));
      const diseaseText = selectedDiseases.map(d => d.name).join('，');
      if (diseaseText) familyHistoryParts.push(diseaseText);
    }
    if (formData.family_history_text) {
      familyHistoryParts.push(formData.family_history_text);
    }
    const familyHistoryText = familyHistoryParts.join('\n');

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `診療情報提供書_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日_和暦}}': formData.creation_date_wareki,
        '{{患者氏名}}': formData.patient_name,
        '{{患者生年月日_和暦}}': formData.patient_birth_date_wareki,
        '{{患者年齢}}': formData.patient_age,
        '{{患者性別}}': formData.patient_sex,
        '{{患者住所}}': formData.patient_address,
        '{{患者電話番号}}': formData.patient_phone,
        '{{作成者氏名}}': formData.physician_name,
        '{{診療科}}': formData.department_name,
        '{{紹介先病院}}': formData.destination_hospital,
        '{{紹介先診療科}}': formData.destination_department,
        '{{紹介先医師名}}': formData.destination_doctor,
        '{{診断名}}': diagnosisText,
        '{{紹介目的および病状経過}}': formData.purpose_and_history,
        '{{既往歴および家族歴}}': familyHistoryText,
        '{{全処方薬}}': prescriptionText,
        '{{備考}}': formData.remarks
      }
    });
  }

  // ==========================================
  // 初期化
  // ==========================================

  FC().initPlugin({
    scriptName: SCRIPT_NAME,
    version: VERSION,
    pluginConfig: {
      id: 'referral-form',
      name: '診療情報提供書',
      icon: '📄',
      description: '診療情報提供書を作成',
      version: VERSION,
      order: 200,
      group: '文書作成',
      groupIcon: '📝',
      onClick: showReferralForm
    }
  });
})();
