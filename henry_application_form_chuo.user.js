// ==UserScript==
// @name         香川県立中央病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.4.0
// @description  香川県立中央病院への診療FAX予約申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_chuo.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_chuo.user.js
// ==/UserScript==

/*
 * 【香川県立中央病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - 香川県立中央病院への診療FAX予約申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 中央病院固有の入力項目
 *    - 受診希望科（中央病院の診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日、第2希望日
 *    - 旧姓
 *    - 医師への連絡（無/済）
 *    - 紹介元医療機関の状況（入院中/通院中）
 *    - CD-R等の有無
 *    - 受診歴（有/無/不明）
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: 中央病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'ChuoReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1X-yv6Y8TWZsAr_ONBRF2D0Ipx3UcZ8s1NyBZxUvWgTE',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 香川県立中央病院固定
  const HOSPITAL_NAME = '香川県立中央病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'chuo';
  const DRAFT_LS_PREFIX = 'henry_chuo_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 中央病院固有ユーティリティ
  // ==========================================

  /**
   * 希望日のフォーマット: "○年○月○日"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getChuoDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getChuoDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showChuoForm() {
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

    // スピナー表示
    const spinner = HenryCore.ui?.showSpinner?.('データを取得中...');

    try {
      const { data } = FC();

      // データ取得（並列実行）
      const [patientInfo, physicianName, diseases] = await Promise.all([
        data.fetchPatientInfo(SCRIPT_NAME),
        data.fetchPhysicianName(SCRIPT_NAME),
        data.fetchDiseases(patientUuid, SCRIPT_NAME)
      ]);

      spinner?.close();

      if (!patientInfo) {
        alert('患者情報を取得できませんでした');
        return;
      }

      const { utils } = FC();

      // 下書き読み込み
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
        patient_name_kana: patientInfo.patient_name_kana,
        birth_date_wareki: patientInfo.birth_date_wareki,
        age: patientInfo.age,
        sex: patientInfo.sex,
        postal_code: patientInfo.postal_code,
        address: patientInfo.address,
        former_name: '',
        physician_name: physicianName,
        creation_date_wareki: utils.getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 中央病院固有
        destination_department: '',
        destination_doctor: '',
        doctor_contact: 'none',
        hope_date_1: '',
        hope_date_2: '',
        visit_history: 'unknown',
        referral_status: 'outpatient',
        attachment_notes: '',
        cdr_status: 'none',
        cdr_content: ''
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
      formData.physician_name = physicianName;
      formData.creation_date_wareki = utils.getTodayWareki();
      formData.diseases = diseases;

      // モーダル表示
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function buildFormBody(formData) {
    const departments = getChuoDepartments();
    const escapeHtml = FC().utils.escapeHtml;

    return `
      <!-- 中央病院 受診希望 -->
      <div class="crf-section">
        <div class="crf-section-title">中央病院 受診希望</div>
        <div class="crf-row">
          <div class="crf-field" style="flex: 0.5;">
            <label>旧姓</label>
            <input type="text" id="crf-former-name" value="${escapeHtml(formData.former_name)}" placeholder="旧姓があれば入力">
          </div>
          <div class="crf-field">
            <label>紹介元医療機関の状況</label>
            <div class="crf-radio-group">
              <div class="crf-radio-item">
                <input type="radio" name="crf-referral-status" id="crf-referral-outpatient" value="outpatient" ${formData.referral_status === 'outpatient' ? 'checked' : ''}>
                <label for="crf-referral-outpatient">通院中</label>
              </div>
              <div class="crf-radio-item">
                <input type="radio" name="crf-referral-status" id="crf-referral-inpatient" value="inpatient" ${formData.referral_status === 'inpatient' ? 'checked' : ''}>
                <label for="crf-referral-inpatient">入院中</label>
              </div>
            </div>
          </div>
        </div>
        <div class="crf-row">
          <div class="crf-field">
            <label>希望受診科</label>
            <select id="crf-dest-department">
              <option value="">選択してください</option>
              ${departments.map(dept => `
                <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                  ${escapeHtml(dept)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="crf-field">
            <label>希望医師名</label>
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <div class="crf-combobox" data-field="doctor" style="flex: 1;">
                <input type="text" class="crf-combobox-input" id="crf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                <button type="button" class="crf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                <div class="crf-combobox-dropdown" id="crf-doctor-dropdown"></div>
              </div>
              <button type="button" class="crf-btn crf-btn-link" id="crf-open-schedule" title="外来診療予定表を見る">外来表</button>
            </div>
          </div>
        </div>
        <div class="crf-row">
          <div class="crf-field">
            <label>医師への連絡</label>
            <div class="crf-radio-group">
              <div class="crf-radio-item">
                <input type="radio" name="crf-doctor-contact" id="crf-contact-none" value="none" ${formData.doctor_contact === 'none' ? 'checked' : ''}>
                <label for="crf-contact-none">無</label>
              </div>
              <div class="crf-radio-item">
                <input type="radio" name="crf-doctor-contact" id="crf-contact-done" value="done" ${formData.doctor_contact === 'done' ? 'checked' : ''}>
                <label for="crf-contact-done">済</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 受診希望日 -->
      <div class="crf-section">
        <div class="crf-section-title">受診希望日</div>
        <div class="crf-row">
          <div class="crf-field">
            <label>第1希望日</label>
            <input type="date" id="crf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
          </div>
          <div class="crf-field">
            <label>第2希望日</label>
            <input type="date" id="crf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
          </div>
        </div>
      </div>

      <!-- 中央病院受診歴 -->
      <div class="crf-section">
        <div class="crf-section-title">中央病院 受診歴</div>
        <div class="crf-radio-group">
          <div class="crf-radio-item">
            <input type="radio" name="crf-visit-history" id="crf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
            <label for="crf-visit-yes">有</label>
          </div>
          <div class="crf-radio-item">
            <input type="radio" name="crf-visit-history" id="crf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
            <label for="crf-visit-no">無</label>
          </div>
          <div class="crf-radio-item">
            <input type="radio" name="crf-visit-history" id="crf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
            <label for="crf-visit-unknown">不明</label>
          </div>
        </div>
      </div>

      <!-- 診療依頼目的・病名 -->
      <div class="crf-section">
        <div class="crf-section-title">受診依頼目的・病名</div>
        ${formData.diseases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
            <div id="crf-diseases-list" class="crf-checkbox-group">
              ${formData.diseases.map(d => `
                <div class="crf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                  <input type="checkbox" id="crf-disease-${d.uuid}" value="${d.uuid}"
                    ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                  <label for="crf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="crf-field">
          <label>自由記述（受診依頼目的など）</label>
          <textarea id="crf-diagnosis-text" placeholder="受診依頼目的や追加の病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
        </div>
      </div>

      <!-- 紹介状添付資料・CD-R -->
      <div class="crf-section">
        <div class="crf-section-title">紹介状添付資料</div>
        <div class="crf-row">
          <div class="crf-field">
            <label>紹介状添付資料（備考）</label>
            <input type="text" id="crf-attachment-notes" value="${escapeHtml(formData.attachment_notes)}" placeholder="添付資料があれば記入">
          </div>
        </div>
        <div class="crf-row">
          <div class="crf-field">
            <label>CD-R等の有無</label>
            <div class="crf-inline-field">
              <div class="crf-radio-group" style="margin-top: 0;">
                <div class="crf-radio-item">
                  <input type="radio" name="crf-cdr-status" id="crf-cdr-yes" value="yes" ${formData.cdr_status === 'yes' ? 'checked' : ''}>
                  <label for="crf-cdr-yes">有</label>
                </div>
                <div class="crf-radio-item">
                  <input type="radio" name="crf-cdr-status" id="crf-cdr-no" value="none" ${formData.cdr_status === 'none' ? 'checked' : ''}>
                  <label for="crf-cdr-no">無</label>
                </div>
              </div>
              <input type="text" id="crf-cdr-content" value="${escapeHtml(formData.cdr_content)}" placeholder="内容（CT画像など）" ${formData.cdr_status !== 'yes' ? 'disabled' : ''} style="max-width: 300px;">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function clearFormFields(bodyEl) {
    // テキスト入力をリセット
    ['#crf-former-name', '#crf-dest-doctor', '#crf-attachment-notes', '#crf-cdr-content'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // selectをリセット
    bodyEl.querySelector('#crf-dest-department').value = '';
    bodyEl.querySelector('#crf-dest-doctor').disabled = true;
    bodyEl.querySelector('.crf-combobox-toggle').disabled = true;

    // 日付入力をリセット
    ['#crf-hope-date-1', '#crf-hope-date-2'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // テキストエリアをリセット
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // チェックボックスをリセット
    bodyEl.querySelectorAll('.crf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });

    // CD-R内容を無効化
    const cdrContent = bodyEl.querySelector('#crf-cdr-content');
    if (cdrContent) cdrContent.disabled = true;
  }

  function setupFormEvents(bodyEl) {
    const escapeHtml = FC().utils.escapeHtml;

    // 外来診療予定表ボタン
    bodyEl.querySelector('#crf-open-schedule')?.addEventListener('click', () => {
      window.open('https://www.chp-kagawa.jp/guide/gairai/shinryouyotei/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = bodyEl.querySelector('#crf-dest-department');
    const doctorInput = bodyEl.querySelector('#crf-dest-doctor');
    const doctorDropdown = bodyEl.querySelector('#crf-doctor-dropdown');
    const doctorCombobox = bodyEl.querySelector('.crf-combobox[data-field="doctor"]');

    function closeAllDropdowns() {
      bodyEl.querySelectorAll('.crf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="crf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="crf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getChuoDoctors(deptName);
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    deptSelect.addEventListener('change', () => {
      const hasValue = !!deptSelect.value;
      doctorInput.disabled = !hasValue;
      doctorCombobox.querySelector('.crf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    doctorCombobox.querySelector('.crf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.crf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest('.crf-combobox')) {
        closeAllDropdowns();
      }
    });

    // CD-R有無の連動
    const cdrYes = bodyEl.querySelector('#crf-cdr-yes');
    const cdrNo = bodyEl.querySelector('#crf-cdr-no');
    const cdrContent = bodyEl.querySelector('#crf-cdr-content');

    function updateCdrContentState() {
      cdrContent.disabled = !cdrYes.checked;
      if (!cdrYes.checked) {
        cdrContent.value = '';
      }
    }

    cdrYes.addEventListener('change', updateCdrContentState);
    cdrNo.addEventListener('change', updateCdrContentState);
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      .crf-inline-field {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .crf-inline-field input[type="text"] {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
      }
      .crf-inline-field input[type="text"]:disabled {
        background: #f5f5f5;
        color: #999;
      }
    `;

    FC().showFormModal({
      id: 'crf-form-modal',
      title: '香川県立中央病院 診療申込書',
      prefix: 'crf',
      bodyHTML: buildFormBody(formData),
      extraCSS: EXTRA_CSS,
      width: '90%',
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
    const data = { ...originalData };

    // 患者情報
    data.former_name = bodyEl.querySelector('#crf-former-name')?.value || '';

    // 紹介元状況
    data.referral_status = bodyEl.querySelector('input[name="crf-referral-status"]:checked')?.value || 'outpatient';

    // 中央病院固有
    data.destination_department = bodyEl.querySelector('#crf-dest-department')?.value || '';
    data.destination_doctor = bodyEl.querySelector('#crf-dest-doctor')?.value || '';
    data.doctor_contact = bodyEl.querySelector('input[name="crf-doctor-contact"]:checked')?.value || 'none';

    // 希望日
    data.hope_date_1 = bodyEl.querySelector('#crf-hope-date-1')?.value || '';
    data.hope_date_2 = bodyEl.querySelector('#crf-hope-date-2')?.value || '';

    // 受診歴
    data.visit_history = bodyEl.querySelector('input[name="crf-visit-history"]:checked')?.value || 'unknown';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#crf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector('#crf-diagnosis-text')?.value || '';

    // 添付資料・CD-R
    data.attachment_notes = bodyEl.querySelector('#crf-attachment-notes')?.value || '';
    data.cdr_status = bodyEl.querySelector('input[name="crf-cdr-status"]:checked')?.value || 'none';
    data.cdr_content = bodyEl.querySelector('#crf-cdr-content')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // 診断名テキスト作成（病名選択 + 自由記述）
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
      visitHistoryText = '有';
    } else if (formData.visit_history === 'no') {
      visitHistoryText = '無';
    } else {
      visitHistoryText = '不明';
    }

    // 紹介元状況テキスト
    const referralStatusText = formData.referral_status === 'inpatient' ? '入院中' : '通院中';

    // 医師への連絡テキスト
    const doctorContactText = formData.doctor_contact === 'done' ? '済' : '無';

    // CD-R有無テキスト
    let cdrText = '';
    if (formData.cdr_status === 'yes') {
      cdrText = formData.cdr_content ? `有（${formData.cdr_content}）` : '有';
    } else {
      cdrText = '無';
    }

    // 希望日フォーマット
    const hopeDate1Text = formatHopeDate(formData.hope_date_1);
    const hopeDate2Text = formatHopeDate(formData.hope_date_2);

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `診療申込書_県立中央病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'chuo-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{フリガナ}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{旧姓}}': formData.former_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{年齢}}': formData.age,
        '{{郵便番号}}': formData.postal_code,
        '{{住所}}': formData.address,
        '{{医師名}}': formData.physician_name,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{医師への連絡}}': doctorContactText,
        '{{第1希望日}}': hopeDate1Text,
        '{{第2希望日}}': hopeDate2Text,
        '{{受診歴}}': visitHistoryText,
        '{{紹介元医療機関の状況}}': referralStatusText,
        '{{受診依頼目的・病名}}': diagnosisText,
        '{{紹介状添付資料}}': formData.attachment_notes,
        '{{CD-R等の有無}}': cdrText
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
      id: 'chuo-referral-form',
      name: '診療申込書（県立中央病院）',
      icon: '🏥',
      description: '香川県立中央病院への診療申込書を作成',
      version: VERSION,
      order: 211,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showChuoForm
    }
  });
})();
