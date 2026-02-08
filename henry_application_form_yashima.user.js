// ==UserScript==
// @name         屋島総合病院 FAX診療申込書
// @namespace    https://henry-app.jp/
// @version      1.3.0
// @description  屋島総合病院へのFAX診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_yashima.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_yashima.user.js
// ==/UserScript==

/*
 * 【屋島総合病院 FAX診療申込書フォーム】
 *
 * ■ 使用場面
 * - 屋島総合病院へのFAX診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 屋島総合病院固有の入力項目
 *    - 受診希望科
 *    - 希望医師名
 *    - 希望来院日・時間
 *    - 当院受診歴（有/無/不明）
 *    - 新型コロナ問診（5項目）
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: 屋島総合病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'YashimaReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1qkfxrrKvypdUnm_J2BSHy7sPPWC902GZKm1A3PeaaOY',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 屋島総合病院固定
  const HOSPITAL_NAME = '屋島総合病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'yashima';
  const DRAFT_LS_PREFIX = 'henry_yashima_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 屋島総合病院固有ユーティリティ
  // ==========================================

  /**
   * 希望日のフォーマット: "○月○日　曜曜日"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日　${weekdays[d.getDay()]}曜日`;
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getYashimaDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getYashimaDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showYashimaForm() {
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

    const spinner = HenryCore.ui?.showSpinner?.('データを取得中...');

    try {
      const { data } = FC();

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
        phone: utils.formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        creation_date_wareki: utils.getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 屋島総合病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_time_hour: '',
        hope_time_minute: '',
        visit_history: 'unknown',

        // 新型コロナ問診
        covid_infected: 'no',
        covid_infected_date: '',
        covid_contact: 'no',
        covid_contact_detail: '',
        covid_gathering: 'no',
        covid_gathering_detail: '',
        covid_symptoms: 'no',
        covid_symptoms_detail: '',
        covid_vaccine: 'done',
        covid_vaccine_year: '',
        covid_vaccine_month: ''
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
      formData.phone = utils.formatPhoneNumber(patientInfo.phone);
      formData.physician_name = physicianName;
      formData.creation_date_wareki = utils.getTodayWareki();
      formData.diseases = diseases;

      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function showFormModal(formData, lastSavedAt) {
    const existingModal = document.getElementById('yrf-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getYashimaDepartments();
    const { utils } = FC();
    const escapeHtml = utils.escapeHtml;

    // 時間選択肢を生成
    const hourOptions = Array.from({ length: 10 }, (_, i) => 8 + i); // 8-17時
    const minuteOptions = ['00', '15', '30', '45'];

    const modal = document.createElement('div');
    modal.id = 'yrf-form-modal';
    modal.innerHTML = `
      <style>
        ${FC().generateBaseCSS('yrf')}
        .yrf-time-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .yrf-time-row select {
          width: 80px;
        }
        .yrf-covid-section {
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: 8px;
          padding: 16px;
        }
        .yrf-covid-section .yrf-section-title {
          color: #f57c00;
          border-bottom-color: #ffe082;
        }
        .yrf-covid-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          padding: 10px 12px;
          background: #fffde7;
          border-radius: 6px;
          flex-wrap: wrap;
        }
        .yrf-covid-row .question {
          flex: 1;
          min-width: 200px;
          font-size: 13px;
          color: #333;
        }
        .yrf-covid-row .question-num {
          font-weight: 600;
          color: #f57c00;
          margin-right: 4px;
        }
        .yrf-covid-row input[type="text"],
        .yrf-covid-row input[type="date"],
        .yrf-covid-row select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .yrf-covid-row input[type="text"] {
          width: 120px;
        }
        .yrf-covid-row input[type="date"] {
          width: 150px;
        }
        .yrf-covid-row select {
          width: 70px;
        }
      </style>
      <div class="yrf-container">
        <div class="yrf-header">
          <h2>屋島総合病院 FAX診療申込書</h2>
          <button class="yrf-close" title="閉じる">&times;</button>
        </div>
        <div class="yrf-body">
          <!-- 屋島総合病院 受診希望 -->
          <div class="yrf-section">
            <div class="yrf-section-title">屋島総合病院 受診希望</div>
            <div class="yrf-row">
              <div class="yrf-field">
                <label>受診希望科</label>
                <select id="yrf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="yrf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="yrf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="yrf-combobox-input" id="yrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="yrf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="yrf-combobox-dropdown" id="yrf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="yrf-btn yrf-btn-link" id="yrf-open-schedule" title="外来診療担当表を見る">外来表</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 希望来院日 -->
          <div class="yrf-section">
            <div class="yrf-section-title">希望来院日</div>
            <div class="yrf-row">
              <div class="yrf-field">
                <label>希望日</label>
                <input type="date" id="yrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="yrf-field">
                <label>希望時間</label>
                <div class="yrf-time-row">
                  <select id="yrf-hope-time-hour">
                    <option value="">時</option>
                    ${hourOptions.map(h => `
                      <option value="${h}" ${formData.hope_time_hour === String(h) ? 'selected' : ''}>${h}</option>
                    `).join('')}
                  </select>
                  <span>時</span>
                  <select id="yrf-hope-time-minute">
                    <option value="">分</option>
                    ${minuteOptions.map(m => `
                      <option value="${m}" ${formData.hope_time_minute === m ? 'selected' : ''}>${m}</option>
                    `).join('')}
                  </select>
                  <span>分</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="yrf-section">
            <div class="yrf-section-title">屋島総合病院 受診歴</div>
            <div class="yrf-radio-group">
              <div class="yrf-radio-item">
                <input type="radio" name="yrf-visit-history" id="yrf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="yrf-visit-yes">有</label>
              </div>
              <div class="yrf-radio-item">
                <input type="radio" name="yrf-visit-history" id="yrf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="yrf-visit-no">無</label>
              </div>
              <div class="yrf-radio-item">
                <input type="radio" name="yrf-visit-history" id="yrf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="yrf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 主訴又は傷病名 -->
          <div class="yrf-section">
            <div class="yrf-section-title">主訴又は傷病名</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="yrf-diseases-list" class="yrf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="yrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="yrf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="yrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="yrf-field">
              <label>自由記述</label>
              <textarea id="yrf-diagnosis-text" placeholder="主訴又は傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>

          <!-- 新型コロナ問診 -->
          <div class="yrf-section yrf-covid-section">
            <div class="yrf-section-title">新型コロナウイルス感染症への対策</div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">①</span>2ヶ月以内に、コロナに感染しましたか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-infected" id="yrf-covid-infected-no" value="no" ${formData.covid_infected === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-infected-no">いいえ</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-infected" id="yrf-covid-infected-yes" value="yes" ${formData.covid_infected === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-infected-yes">はい</label>
                </div>
              </div>
              <span style="font-size: 13px;">診断日:</span>
              <input type="date" id="yrf-covid-infected-date" value="${escapeHtml(formData.covid_infected_date)}" ${formData.covid_infected !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">②</span>2週間以内に、コロナ感染者との接触や、発生施設等との関連がありませんか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-contact" id="yrf-covid-contact-no" value="no" ${formData.covid_contact === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-contact-no">なし</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-contact" id="yrf-covid-contact-yes" value="yes" ${formData.covid_contact === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-contact-yes">あり</label>
                </div>
              </div>
              <input type="text" id="yrf-covid-contact-detail" value="${escapeHtml(formData.covid_contact_detail)}" placeholder="詳細" ${formData.covid_contact !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">③</span>2週間以内に、同居家族以外との会食、大勢が集まるイベントなどへの参加はありませんか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-gathering" id="yrf-covid-gathering-no" value="no" ${formData.covid_gathering === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-gathering-no">なし</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-gathering" id="yrf-covid-gathering-yes" value="yes" ${formData.covid_gathering === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-gathering-yes">あり</label>
                </div>
              </div>
              <input type="text" id="yrf-covid-gathering-detail" value="${escapeHtml(formData.covid_gathering_detail)}" placeholder="詳細" ${formData.covid_gathering !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">④</span>1週間以内に、37度以上の発熱、咳、のどの痛み、鼻みず、嘔吐・下痢等の症状はありませんか？</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-symptoms" id="yrf-covid-symptoms-no" value="no" ${formData.covid_symptoms === 'no' ? 'checked' : ''}>
                  <label for="yrf-covid-symptoms-no">なし</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-symptoms" id="yrf-covid-symptoms-yes" value="yes" ${formData.covid_symptoms === 'yes' ? 'checked' : ''}>
                  <label for="yrf-covid-symptoms-yes">あり</label>
                </div>
              </div>
              <input type="text" id="yrf-covid-symptoms-detail" value="${escapeHtml(formData.covid_symptoms_detail)}" placeholder="詳細" ${formData.covid_symptoms !== 'yes' ? 'disabled' : ''}>
            </div>

            <div class="yrf-covid-row">
              <div class="question"><span class="question-num">⑤</span>コロナワクチン接種状況</div>
              <div class="yrf-radio-group">
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-vaccine" id="yrf-covid-vaccine-done" value="done" ${formData.covid_vaccine === 'done' ? 'checked' : ''}>
                  <label for="yrf-covid-vaccine-done">済</label>
                </div>
                <div class="yrf-radio-item">
                  <input type="radio" name="yrf-covid-vaccine" id="yrf-covid-vaccine-not" value="not" ${formData.covid_vaccine === 'not' ? 'checked' : ''}>
                  <label for="yrf-covid-vaccine-not">未</label>
                </div>
              </div>
              <span style="font-size: 13px;">最終:</span>
              <input type="text" id="yrf-covid-vaccine-year" value="${escapeHtml(formData.covid_vaccine_year)}" placeholder="年" style="width: 60px;" ${formData.covid_vaccine !== 'done' ? 'disabled' : ''}>
              <span style="font-size: 13px;">年</span>
              <input type="text" id="yrf-covid-vaccine-month" value="${escapeHtml(formData.covid_vaccine_month)}" placeholder="月" style="width: 50px;" ${formData.covid_vaccine !== 'done' ? 'disabled' : ''}>
              <span style="font-size: 13px;">月頃</span>
            </div>
          </div>
        </div>
        <div class="yrf-footer">
          <div class="yrf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="yrf-footer-right">
            <button class="yrf-btn yrf-btn-secondary" id="yrf-clear" style="color:#d32f2f;">クリア</button>
            <button class="yrf-btn yrf-btn-secondary" id="yrf-save-draft">下書き保存</button>
            <button class="yrf-btn yrf-btn-primary" id="yrf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 変更追跡フラグ
    let isDirty = false;
    const formBody = modal.querySelector('.yrf-body');
    if (formBody) {
      formBody.addEventListener('input', () => { isDirty = true; });
      formBody.addEventListener('change', () => { isDirty = true; });
    }

    // モーダルクローズ時の保存確認
    async function confirmClose() {
      if (!isDirty) { modal.remove(); return; }
      const save = await pageWindow.HenryCore?.ui?.showConfirm?.({
        title: '未保存の変更',
        message: '変更内容を下書き保存しますか？',
        confirmLabel: '保存して閉じる',
        cancelLabel: '保存せず閉じる'
      });
      if (save) {
        const data = collectFormData(modal, formData);
        const ds = pageWindow.HenryCore?.modules?.DraftStorage;
        if (ds) {
          const payload = { schemaVersion: DRAFT_SCHEMA_VERSION, data };
          await ds.save(DRAFT_TYPE, formData.patient_uuid, payload, data.patient_name || '');
        }
      }
      modal.remove();
    }

    // イベントリスナー
    modal.querySelector('.yrf-close').addEventListener('click', () => confirmClose());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) confirmClose();
    });

    // 外来診療担当表ボタン
    modal.querySelector('#yrf-open-schedule').addEventListener('click', () => {
      window.open('https://www.yashima-hp.com/outpatient/doctor/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#yrf-dest-department');
    const doctorInput = modal.querySelector('#yrf-dest-doctor');
    const doctorDropdown = modal.querySelector('#yrf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.yrf-combobox[data-field="doctor"]');

    function closeAllDropdowns() {
      modal.querySelectorAll('.yrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="yrf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="yrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getYashimaDoctors(deptName);
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    deptSelect.addEventListener('change', () => {
      const hasValue = !!deptSelect.value;
      doctorInput.disabled = !hasValue;
      doctorCombobox.querySelector('.yrf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    doctorCombobox.querySelector('.yrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.yrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.yrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // コロナ問診の連動
    modal.querySelectorAll('input[name="yrf-covid-infected"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const dateInput = modal.querySelector('#yrf-covid-infected-date');
        dateInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (dateInput.disabled) dateInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-contact"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const detailInput = modal.querySelector('#yrf-covid-contact-detail');
        detailInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (detailInput.disabled) detailInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-gathering"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const detailInput = modal.querySelector('#yrf-covid-gathering-detail');
        detailInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (detailInput.disabled) detailInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-symptoms"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const detailInput = modal.querySelector('#yrf-covid-symptoms-detail');
        detailInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (detailInput.disabled) detailInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="yrf-covid-vaccine"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isDone = radio.value === 'done' && radio.checked;
        const yearInput = modal.querySelector('#yrf-covid-vaccine-year');
        const monthInput = modal.querySelector('#yrf-covid-vaccine-month');
        yearInput.disabled = !isDone;
        monthInput.disabled = !isDone;
        if (!isDone) {
          yearInput.value = '';
          monthInput.value = '';
        }
      });
    });

    // クリアボタン
    modal.querySelector('#yrf-clear').addEventListener('click', async () => {
      const confirmed = await pageWindow.HenryCore?.ui?.showConfirm?.({
        title: '入力内容のクリア',
        message: '手入力した内容をすべてクリアしますか？\n（患者情報などの自動入力項目はクリアされません）',
        confirmLabel: 'クリア',
        cancelLabel: 'キャンセル'
      });
      if (!confirmed) return;

      // テキスト入力をリセット
      ['#yrf-dest-doctor', '#yrf-covid-infected-date', '#yrf-covid-contact-detail',
       '#yrf-covid-gathering-detail', '#yrf-covid-symptoms-detail',
       '#yrf-covid-vaccine-year', '#yrf-covid-vaccine-month'].forEach(sel => {
        const el = modal.querySelector(sel);
        if (el) el.value = '';
      });

      // selectをリセット
      modal.querySelector('#yrf-dest-department').value = '';
      modal.querySelector('#yrf-dest-doctor').disabled = true;
      modal.querySelector('.yrf-combobox-toggle').disabled = true;

      // 時間selectをリセット
      ['#yrf-hope-time-hour', '#yrf-hope-time-minute'].forEach(sel => {
        const el = modal.querySelector(sel);
        if (el) el.value = '';
      });

      // 日付入力をリセット
      const hopeDate1 = modal.querySelector('#yrf-hope-date-1');
      if (hopeDate1) hopeDate1.value = '';

      // テキストエリアをリセット
      modal.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

      // チェックボックスをリセット
      modal.querySelectorAll('.yrf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });

      isDirty = false;
    });

    // 下書き保存
    modal.querySelector('#yrf-save-draft').addEventListener('click', async () => {
      const data = collectFormData(modal, formData);
      const ds = pageWindow.HenryCore?.modules?.DraftStorage;
      if (ds) {
        const payload = { schemaVersion: DRAFT_SCHEMA_VERSION, data };
        const saved = await ds.save(DRAFT_TYPE, formData.patient_uuid, payload, data.patient_name || '');
        if (saved) {
          isDirty = false;
          modal.querySelector('.yrf-footer-left').textContent = `下書き: ${new Date().toLocaleString('ja-JP')}`;
          pageWindow.HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
        }
      }
    });

    // Google Docs出力
    modal.querySelector('#yrf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#yrf-generate');
      btn.disabled = true;
      btn.textContent = '生成中...';

      try {
        const data = collectFormData(modal, formData);
        await generateGoogleDoc(data);
        const ds = pageWindow.HenryCore?.modules?.DraftStorage;
        if (ds) await ds.delete(DRAFT_TYPE, formData.patient_uuid);
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

    // 屋島総合病院固有
    data.destination_department = modal.querySelector('#yrf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#yrf-dest-doctor')?.value || '';

    // 希望来院日・時間
    data.hope_date_1 = modal.querySelector('#yrf-hope-date-1')?.value || '';
    data.hope_time_hour = modal.querySelector('#yrf-hope-time-hour')?.value || '';
    data.hope_time_minute = modal.querySelector('#yrf-hope-time-minute')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="yrf-visit-history"]:checked')?.value || 'unknown';

    // 病名
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#yrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#yrf-diagnosis-text')?.value || '';

    // コロナ問診
    data.covid_infected = modal.querySelector('input[name="yrf-covid-infected"]:checked')?.value || 'no';
    data.covid_infected_date = modal.querySelector('#yrf-covid-infected-date')?.value || '';
    data.covid_contact = modal.querySelector('input[name="yrf-covid-contact"]:checked')?.value || 'no';
    data.covid_contact_detail = modal.querySelector('#yrf-covid-contact-detail')?.value || '';
    data.covid_gathering = modal.querySelector('input[name="yrf-covid-gathering"]:checked')?.value || 'no';
    data.covid_gathering_detail = modal.querySelector('#yrf-covid-gathering-detail')?.value || '';
    data.covid_symptoms = modal.querySelector('input[name="yrf-covid-symptoms"]:checked')?.value || 'no';
    data.covid_symptoms_detail = modal.querySelector('#yrf-covid-symptoms-detail')?.value || '';
    data.covid_vaccine = modal.querySelector('input[name="yrf-covid-vaccine"]:checked')?.value || 'done';
    data.covid_vaccine_year = modal.querySelector('#yrf-covid-vaccine-year')?.value || '';
    data.covid_vaccine_month = modal.querySelector('#yrf-covid-vaccine-month')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // 主訴又は傷病名テキスト作成
    const diagnosisParts = [];
    if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
      const diseaseText = selectedDiseases.map(d => d.name).join('，');
      if (diseaseText) {
        diagnosisParts.push(diseaseText);
      }
    }
    if (formData.diagnosis_text) {
      diagnosisParts.push(formData.diagnosis_text);
    }
    const diagnosisText = diagnosisParts.join('\n');

    // 受診歴テキスト
    let visitHistoryText = '';
    if (formData.visit_history === 'yes') {
      visitHistoryText = '有';
    } else if (formData.visit_history === 'no') {
      visitHistoryText = '無';
    } else {
      visitHistoryText = '不明';
    }

    // 希望来院日・時間
    const hopeDateText = formatHopeDate(formData.hope_date_1);
    let hopeTimeText = '';
    if (formData.hope_time_hour && formData.hope_time_minute) {
      hopeTimeText = `${formData.hope_time_hour}時${formData.hope_time_minute}分`;
    }

    // コロナ問診テキスト
    // ①感染歴
    let covidInfectedText = formData.covid_infected === 'yes' ? 'はい' : 'いいえ';
    if (formData.covid_infected === 'yes' && formData.covid_infected_date) {
      const d = new Date(formData.covid_infected_date);
      covidInfectedText += `　診断日（${d.getMonth() + 1}月${d.getDate()}日）`;
    }

    // ②接触歴
    let covidContactText = formData.covid_contact === 'yes' ? 'あり' : 'なし';
    if (formData.covid_contact === 'yes' && formData.covid_contact_detail) {
      covidContactText += `（${formData.covid_contact_detail}）`;
    }

    // ③会食等
    let covidGatheringText = formData.covid_gathering === 'yes' ? 'あり' : 'なし';
    if (formData.covid_gathering === 'yes' && formData.covid_gathering_detail) {
      covidGatheringText += `（${formData.covid_gathering_detail}）`;
    }

    // ④風邪症状
    let covidSymptomsText = formData.covid_symptoms === 'yes' ? 'あり' : 'なし';
    if (formData.covid_symptoms === 'yes' && formData.covid_symptoms_detail) {
      covidSymptomsText += `（${formData.covid_symptoms_detail}）`;
    }

    // ⑤ワクチン接種
    let covidVaccineText = formData.covid_vaccine === 'done' ? '済' : '未';
    if (formData.covid_vaccine === 'done' && formData.covid_vaccine_year) {
      covidVaccineText += `　最終（${formData.covid_vaccine_year}年${formData.covid_vaccine_month || ''}月頃）`;
    }

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `FAX診療申込書_屋島総合病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'yashima-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{医師名}}': formData.physician_name,
        '{{ふりがな}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{年齢}}': formData.age + '歳',
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{第1希望日}}': hopeDateText,
        '{{希望来院時間}}': hopeTimeText,
        '{{受診歴}}': visitHistoryText,
        '{{主訴または傷病名}}': diagnosisText,
        '{{感染ありなし}}': covidInfectedText,
        '{{接触ありなし}}': covidContactText,
        '{{会食等ありなし}}': covidGatheringText,
        '{{風邪症状ありなし}}': covidSymptomsText,
        '{{ワクチン接種済未}}': covidVaccineText
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
      id: 'yashima-referral-form',
      name: '診療申込書（屋島総合病院）',
      icon: '🏥',
      description: '屋島総合病院へのFAX診療申込書を作成',
      version: VERSION,
      order: 220,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showYashimaForm
    }
  });
})();
