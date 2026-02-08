// ==UserScript==
// @name         香川県済生会病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.4.0
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
 * - henry_form_commons.user.js: 共通モジュール
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

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1HCjHBCbv43jtcjidd2oj9KvBcyggbv04U7msVfYIWrs',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 香川県済生会病院固定
  const HOSPITAL_NAME = '香川県済生会病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'saiseikai';
  const DRAFT_LS_PREFIX = 'henry_saiseikai_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 済生会病院固有ユーティリティ
  // ==========================================

  /**
   * 生年月日の和暦フォーマット（元号略記 + 生まれ付き）
   * 例: 昭60年5月10日生
   * 標準の wareki（例: "昭和60年5月10日"）を変換する
   */
  function toBirthDateWareki(wareki) {
    if (!wareki) return '';
    const eraMap = { '令和': '令', '平成': '平', '昭和': '昭', '大正': '大', '明治': '明' };
    let result = wareki;
    for (const [full, abbr] of Object.entries(eraMap)) {
      if (result.startsWith(full)) {
        result = abbr + result.slice(full.length);
        break;
      }
    }
    return result + '生';
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
    const wareki = FC().utils.toWareki(year, month, day);
    const ampmText = ampm === 'pm' ? 'PM' : 'AM';
    return `${wareki}（${weekdays[d.getDay()]}）${ampmText}`;
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

      // 下書き読み込み（DraftStorage / localStorageマイグレーション対応）
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
        birth_date_wareki: toBirthDateWareki(patientInfo.birth_date_wareki),
        sex: patientInfo.sex,
        postal_code: patientInfo.postal_code,
        address: patientInfo.address,
        phone: utils.formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        creation_date_wareki: utils.getTodayWareki(),

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
      formData.birth_date_wareki = toBirthDateWareki(patientInfo.birth_date_wareki);
      formData.sex = patientInfo.sex;
      formData.postal_code = patientInfo.postal_code;
      formData.address = patientInfo.address;
      formData.phone = utils.formatPhoneNumber(patientInfo.phone);
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
    const departments = getSaiseikaiDepartments();
    const escapeHtml = FC().utils.escapeHtml;

    return `
      <!-- 香川県済生会病院 受診希望 -->
      <div class="ssf-section">
        <div class="ssf-section-title">香川県済生会病院 受診希望</div>
        <div class="ssf-notice" style="background: #fff3e0; border: 1px solid #ffb74d; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #e65100;">
          <strong>整形外科について：</strong>地域連携室では予約をお取りすることができません。担当医の診療時間内（8:30〜11:00）に直接お越しください。
        </div>
        <div class="ssf-row">
          <div class="ssf-field">
            <label>旧姓（任意）</label>
            <input type="text" id="ssf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
          </div>
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
    `;
  }

  function clearFormFields(bodyEl) {
    // テキスト入力をリセット
    bodyEl.querySelector('#ssf-maiden-name').value = '';
    bodyEl.querySelector('#ssf-visit-history-id').value = '';

    // select・コンボボックスをリセット
    bodyEl.querySelector('#ssf-dest-department').value = '';
    bodyEl.querySelector('#ssf-dest-doctor').value = '';
    bodyEl.querySelector('#ssf-dest-doctor').disabled = true;
    bodyEl.querySelector('.ssf-combobox-toggle').disabled = true;

    // 日付入力をリセット
    bodyEl.querySelector('#ssf-hope-date-1').value = '';
    bodyEl.querySelector('#ssf-hope-date-2').value = '';

    // ラジオボタンをリセット
    const unknownRadio = bodyEl.querySelector('#ssf-visit-unknown');
    if (unknownRadio) unknownRadio.checked = true;
    bodyEl.querySelector('#ssf-visit-id-field')?.classList.remove('visible');

    // テキストエリアをリセット
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // チェックボックスをリセット
    bodyEl.querySelectorAll('.ssf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  }

  function setupFormEvents(bodyEl) {
    const escapeHtml = FC().utils.escapeHtml;

    // 外来診察予定表ボタン
    bodyEl.querySelector('#ssf-open-schedule')?.addEventListener('click', () => {
      window.open('https://www.saiseikai-kagawa.jp/about/plan.html', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = bodyEl.querySelector('#ssf-dest-department');
    const doctorInput = bodyEl.querySelector('#ssf-dest-doctor');
    const doctorDropdown = bodyEl.querySelector('#ssf-doctor-dropdown');
    const doctorCombobox = bodyEl.querySelector('.ssf-combobox[data-field="doctor"]');

    function closeAllDropdowns() {
      bodyEl.querySelectorAll('.ssf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="ssf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="ssf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getSaiseikaiDoctors(deptName);
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    deptSelect.addEventListener('change', () => {
      const hasValue = !!deptSelect.value;
      doctorInput.disabled = !hasValue;
      doctorCombobox.querySelector('.ssf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    doctorCombobox.querySelector('.ssf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.ssf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest('.ssf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 受診歴ラジオボタン変更時
    const visitHistoryRadios = bodyEl.querySelectorAll('input[name="ssf-visit-history"]');
    const visitIdField = bodyEl.querySelector('#ssf-visit-id-field');
    visitHistoryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          visitIdField.classList.add('visible');
        } else {
          visitIdField.classList.remove('visible');
        }
      });
    });
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      .ssf-conditional-field {
        margin-top: 8px;
        padding: 12px;
        background: #fafafa;
        border-radius: 6px;
        display: none;
      }
      .ssf-conditional-field.visible { display: block; }
      .ssf-hope-date-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }
      .ssf-hope-date-row .ssf-field { flex: 2; }
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
      .ssf-checkbox-group {
        max-height: 200px;
        overflow-y: auto;
      }
    `;

    FC().showFormModal({
      id: 'ssf-form-modal',
      title: '香川県済生会病院 診療申込書',
      prefix: 'ssf',
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

    // 患者追加情報
    data.maiden_name = bodyEl.querySelector('#ssf-maiden-name')?.value || '';

    // 香川県済生会病院固有
    data.destination_department = bodyEl.querySelector('#ssf-dest-department')?.value || '';
    data.destination_doctor = bodyEl.querySelector('#ssf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_1 = bodyEl.querySelector('#ssf-hope-date-1')?.value || '';
    data.hope_date_1_ampm = bodyEl.querySelector('input[name="ssf-hope-date-1-ampm"]:checked')?.value || 'am';
    data.hope_date_2 = bodyEl.querySelector('#ssf-hope-date-2')?.value || '';
    data.hope_date_2_ampm = bodyEl.querySelector('input[name="ssf-hope-date-2-ampm"]:checked')?.value || 'am';

    // 受診歴
    data.visit_history = bodyEl.querySelector('input[name="ssf-visit-history"]:checked')?.value || 'unknown';
    data.visit_history_id = bodyEl.querySelector('#ssf-visit-history-id')?.value || '';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#ssf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector('#ssf-diagnosis-text')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
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

    // 希望日フォーマット（AM/PM付き）
    const hopeDate1Text = formatHopeDate(formData.hope_date_1, formData.hope_date_1_ampm);
    const hopeDate2Text = formatHopeDate(formData.hope_date_2, formData.hope_date_2_ampm);

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `診療申込書_香川県済生会病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'saiseikai-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{フリガナ}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{旧姓}}': formData.maiden_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{郵便番号}}': formData.postal_code,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{受診歴}}': visitHistoryText,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{第1希望日}}': hopeDate1Text,
        '{{第2希望日}}': hopeDate2Text,
        '{{医師名}}': formData.physician_name,
        '{{紹介目的・傷病名}}': diagnosisText
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
      id: 'saiseikai-referral-form',
      name: '診療申込書（済生会病院）',
      icon: '🏥',
      description: '香川県済生会病院への診療申込書を作成',
      version: VERSION,
      order: 212,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showSaiseikaiForm
    }
  });
})();
