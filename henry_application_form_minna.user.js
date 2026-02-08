// ==UserScript==
// @name         高松市立みんなの病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.4.1
// @description  高松市立みんなの病院へのFAX診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_minna.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_minna.user.js
// ==/UserScript==

/*
 * 【高松市立みんなの病院 FAX診療申込書フォーム】
 *
 * ■ 使用場面
 * - 高松市立みんなの病院へのFAX診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 診療科（ログインユーザーの所属科）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 高松市立みんなの病院固有の入力項目
 *    - 受診希望科（24診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日（令和形式・曜日付き）または当日/いつでもよい
 *    - 画像の有無（CT/MRI/XP/PET-CT + 撮影時期）
 *    - 医師への事前連絡（有/無）
 *    - 当院受診歴（有/無/不明）
 *    - 現在の状況（外来通院中/入院中/介護施設入所中）
 *    - 傷病名、備考
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: 高松市立みんなの病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'MinnaReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1HD7wJc_B-xavVLerbX7wtskXWhBc3k4DJ9wMSZo4H_s',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 高松市立みんなの病院固定
  const HOSPITAL_NAME = '高松市立みんなの病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'minna';
  const DRAFT_LS_PREFIX = 'henry_minna_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // みんなの病院固有ユーティリティ
  // ==========================================

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

  /**
   * 希望日時のフォーマット: "2026年1月30日（金曜日）10時30分"
   */
  function formatHopeDateTime(dateStr, timeStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    let result = `${year}年${month}月${day}日（${weekdays[d.getDay()]}）`;

    // 時間が指定されている場合
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      result += `${parseInt(hours)}時${parseInt(minutes)}分`;
    }

    return result;
  }

  // ==========================================
  // 患者情報取得（みんなの病院固有: toBirthDateWareki使用）
  // ==========================================

  async function fetchPatientInfoMinna() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return null;

    const patientUuid = HenryCore.getPatientUuid();
    if (!patientUuid) return null;

    try {
      const result = await HenryCore.query(FC().QUERIES.GetPatient, {
        input: { uuid: patientUuid }
      });

      const p = result.data?.getPatient;
      if (!p) return null;

      const birthDate = p.detail?.birthDate;
      const birthYear = birthDate?.year;
      const birthMonth = birthDate?.month;
      const birthDay = birthDate?.day;

      const { utils } = FC();

      return {
        patient_uuid: patientUuid,
        patient_name: (p.fullName || '').replace(/\u3000/g, ' '),
        patient_name_kana: utils.katakanaToHiragana(p.fullNamePhonetic || ''),
        birth_date_wareki: birthYear ? toBirthDateWareki(birthYear, birthMonth, birthDay) : '',
        sex: utils.formatSex(p.detail?.sexType),
        postal_code: p.detail?.postalCode || '',
        address: p.detail?.addressLine_1 || '',
        phone: p.detail?.phoneNumber || ''
      };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 患者情報取得エラー:`, e.message);
      return null;
    }
  }

  async function fetchMyDepartment() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return '';

    try {
      const dept = await HenryCore.getMyDepartment();
      return dept || '';
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 診療科取得エラー:`, e.message);
      return '';
    }
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getMinnaDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getMinnaDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showMinnaForm() {
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
      const [patientInfo, physicianName, myDepartment, diseases] = await Promise.all([
        fetchPatientInfoMinna(),
        data.fetchPhysicianName(SCRIPT_NAME),
        fetchMyDepartment(),
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
        sex: patientInfo.sex,
        postal_code: patientInfo.postal_code,
        address: patientInfo.address,
        phone: utils.formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        my_department: myDepartment,

        // 患者追加情報
        maiden_name: '',

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 高松市立みんなの病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_type: 'date', // date, today, anytime
        hope_date_1: '',
        hope_time_1: '',
        hope_date_2: '',
        hope_time_2: '',
        visit_history: 'unknown',
        current_status: 'none',
        current_status_detail: '', // 保険診療/事故/労災/その他 or DPC対象/DPC対象外
        facility_name: '',

        // 画像の有無
        has_image: false,
        image_ct: false,
        image_mri: false,
        image_xp: false,
        image_pet: false,
        image_date: '',

        // 事前連絡
        prior_contact: 'no'
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_name_kana = patientInfo.patient_name_kana;
      formData.birth_date_wareki = patientInfo.birth_date_wareki;
      formData.sex = patientInfo.sex;
      formData.postal_code = patientInfo.postal_code;
      formData.address = patientInfo.address;
      formData.phone = utils.formatPhoneNumber(patientInfo.phone);
      formData.physician_name = physicianName;
      formData.my_department = myDepartment;
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
    const departments = getMinnaDepartments();
    const escapeHtml = FC().utils.escapeHtml;

    return `
      <!-- 高松市立みんなの病院 受診希望 -->
      <div class="mrf-section">
        <div class="mrf-section-title">高松市立みんなの病院 受診希望</div>
        <div class="mrf-row">
          <div class="mrf-field">
            <label>旧姓（任意）</label>
            <input type="text" id="mrf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
          </div>
        </div>
        <div class="mrf-row">
          <div class="mrf-field">
            <label>受診希望科</label>
            <select id="mrf-dest-department">
              <option value="">選択してください</option>
              ${departments.map(dept => `
                <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                  ${escapeHtml(dept)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="mrf-field">
            <label>希望医師名（任意）</label>
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <div class="mrf-combobox" data-field="doctor" style="flex: 1;">
                <input type="text" class="mrf-combobox-input" id="mrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                <button type="button" class="mrf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                <div class="mrf-combobox-dropdown" id="mrf-doctor-dropdown"></div>
              </div>
              <button type="button" class="mrf-btn mrf-btn-link" id="mrf-open-schedule" title="外来担当表を見る">外来表</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 受診希望日 -->
      <div class="mrf-section">
        <div class="mrf-section-title">希望来院日</div>
        <div class="mrf-radio-group">
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-hope-date-type" id="mrf-hope-date-type-date" value="date" ${formData.hope_date_type === 'date' ? 'checked' : ''}>
            <label for="mrf-hope-date-type-date">日時を指定</label>
          </div>
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-hope-date-type" id="mrf-hope-date-type-today" value="today" ${formData.hope_date_type === 'today' ? 'checked' : ''}>
            <label for="mrf-hope-date-type-today">当日</label>
          </div>
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-hope-date-type" id="mrf-hope-date-type-anytime" value="anytime" ${formData.hope_date_type === 'anytime' ? 'checked' : ''}>
            <label for="mrf-hope-date-type-anytime">いつでもよい</label>
          </div>
        </div>
        <div class="mrf-conditional-field ${formData.hope_date_type === 'date' ? 'visible' : ''}" id="mrf-hope-date-field">
          <div class="mrf-row">
            <div class="mrf-field">
              <label>第1希望日</label>
              <input type="date" id="mrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
            </div>
            <div class="mrf-field" style="flex: 0.5;">
              <label>時間（任意）</label>
              <input type="time" id="mrf-hope-time-1" value="${escapeHtml(formData.hope_time_1 || '')}">
            </div>
          </div>
          <div class="mrf-row">
            <div class="mrf-field">
              <label>第2希望日（任意）</label>
              <input type="date" id="mrf-hope-date-2" value="${escapeHtml(formData.hope_date_2 || '')}">
            </div>
            <div class="mrf-field" style="flex: 0.5;">
              <label>時間（任意）</label>
              <input type="time" id="mrf-hope-time-2" value="${escapeHtml(formData.hope_time_2 || '')}">
            </div>
          </div>
        </div>
      </div>

      <!-- 画像の有無 -->
      <div class="mrf-section">
        <div class="mrf-section-title">画像の有無</div>
        <div class="mrf-radio-group">
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-has-image" id="mrf-has-image-yes" value="yes" ${formData.has_image ? 'checked' : ''}>
            <label for="mrf-has-image-yes">有</label>
          </div>
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-has-image" id="mrf-has-image-no" value="no" ${!formData.has_image ? 'checked' : ''}>
            <label for="mrf-has-image-no">無</label>
          </div>
        </div>
        <div class="mrf-conditional-field ${formData.has_image ? 'visible' : ''}" id="mrf-image-detail-field">
          <div class="mrf-image-checkboxes">
            <div class="mrf-image-checkbox">
              <input type="checkbox" id="mrf-image-ct" ${formData.image_ct ? 'checked' : ''}>
              <label for="mrf-image-ct">CT</label>
            </div>
            <div class="mrf-image-checkbox">
              <input type="checkbox" id="mrf-image-mri" ${formData.image_mri ? 'checked' : ''}>
              <label for="mrf-image-mri">MRI</label>
            </div>
            <div class="mrf-image-checkbox">
              <input type="checkbox" id="mrf-image-xp" ${formData.image_xp ? 'checked' : ''}>
              <label for="mrf-image-xp">XP</label>
            </div>
            <div class="mrf-image-checkbox">
              <input type="checkbox" id="mrf-image-pet" ${formData.image_pet ? 'checked' : ''}>
              <label for="mrf-image-pet">PET-CT</label>
            </div>
          </div>
          <div class="mrf-row" style="margin-top: 12px;">
            <div class="mrf-field" style="flex: 0.5;">
              <label>撮影時期</label>
              <input type="text" id="mrf-image-date" value="${escapeHtml(formData.image_date)}" placeholder="例: 令和7年1月">
            </div>
          </div>
        </div>
      </div>

      <!-- 当院受診歴 -->
      <div class="mrf-section">
        <div class="mrf-section-title">高松市立みんなの病院 受診歴</div>
        <div class="mrf-radio-group">
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-visit-history" id="mrf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
            <label for="mrf-visit-yes">有</label>
          </div>
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-visit-history" id="mrf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
            <label for="mrf-visit-no">無</label>
          </div>
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-visit-history" id="mrf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
            <label for="mrf-visit-unknown">不明</label>
          </div>
        </div>
      </div>

      <!-- 現在の状況 -->
      <div class="mrf-section">
        <div class="mrf-section-title">現在貴院に</div>
        <div class="mrf-radio-group vertical">
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-current-status" id="mrf-status-none" value="none" ${formData.current_status === 'none' ? 'checked' : ''}>
            <label for="mrf-status-none">該当なし</label>
          </div>
          <div>
            <div class="mrf-radio-item">
              <input type="radio" name="mrf-current-status" id="mrf-status-outpatient" value="outpatient" ${formData.current_status === 'outpatient' ? 'checked' : ''}>
              <label for="mrf-status-outpatient">外来通院中</label>
            </div>
            <div class="mrf-current-status-detail ${formData.current_status === 'outpatient' ? '' : 'mrf-hidden'}" id="mrf-outpatient-detail">
              <select id="mrf-outpatient-type">
                <option value="insurance" ${formData.current_status_detail === 'insurance' ? 'selected' : ''}>保険診療</option>
                <option value="accident" ${formData.current_status_detail === 'accident' ? 'selected' : ''}>事故</option>
                <option value="workers" ${formData.current_status_detail === 'workers' ? 'selected' : ''}>労災</option>
                <option value="other" ${formData.current_status_detail === 'other' ? 'selected' : ''}>その他</option>
              </select>
            </div>
          </div>
          <div>
            <div class="mrf-radio-item">
              <input type="radio" name="mrf-current-status" id="mrf-status-inpatient" value="inpatient" ${formData.current_status === 'inpatient' ? 'checked' : ''}>
              <label for="mrf-status-inpatient">入院中</label>
            </div>
            <div class="mrf-current-status-detail ${formData.current_status === 'inpatient' ? '' : 'mrf-hidden'}" id="mrf-inpatient-detail">
              <select id="mrf-inpatient-type">
                <option value="dpc" ${formData.current_status_detail === 'dpc' ? 'selected' : ''}>DPC対象</option>
                <option value="non-dpc" ${formData.current_status_detail === 'non-dpc' ? 'selected' : ''}>DPC対象外</option>
              </select>
            </div>
          </div>
          <div>
            <div class="mrf-radio-item">
              <input type="radio" name="mrf-current-status" id="mrf-status-facility" value="facility" ${formData.current_status === 'facility' ? 'checked' : ''}>
              <label for="mrf-status-facility">介護施設入所中</label>
            </div>
            <div class="mrf-conditional-field ${formData.current_status === 'facility' ? 'visible' : ''}" id="mrf-facility-field">
              <div class="mrf-field">
                <label>施設名</label>
                <input type="text" id="mrf-facility-name" value="${escapeHtml(formData.facility_name)}" placeholder="施設名を入力">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 医師への事前連絡 -->
      <div class="mrf-section">
        <div class="mrf-section-title">医師への事前連絡</div>
        <div class="mrf-radio-group">
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-prior-contact" id="mrf-prior-contact-yes" value="yes" ${formData.prior_contact === 'yes' ? 'checked' : ''}>
            <label for="mrf-prior-contact-yes">有</label>
          </div>
          <div class="mrf-radio-item">
            <input type="radio" name="mrf-prior-contact" id="mrf-prior-contact-no" value="no" ${formData.prior_contact === 'no' ? 'checked' : ''}>
            <label for="mrf-prior-contact-no">無</label>
          </div>
        </div>
      </div>

      <!-- 紹介目的・傷病名 -->
      <div class="mrf-section">
        <div class="mrf-section-title">紹介目的（傷病名）</div>
        <p style="font-size: 13px; color: #666; margin: 0 0 12px 0;">※紹介状（診療情報提供書）を添付の場合は、ご記入不要です。</p>
        ${formData.diseases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
            <div id="mrf-diseases-list" class="mrf-checkbox-group">
              ${formData.diseases.map(d => `
                <div class="mrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                  <input type="checkbox" id="mrf-disease-${d.uuid}" value="${d.uuid}"
                    ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                  <label for="mrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="mrf-field">
          <label>自由記述</label>
          <textarea id="mrf-diagnosis-text" placeholder="紹介目的や追加の傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
        </div>
      </div>
    `;
  }

  function clearFormFields(bodyEl) {
    // テキスト入力をリセット
    ['#mrf-maiden-name', '#mrf-facility-name'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // select・コンボボックスをリセット
    bodyEl.querySelector('#mrf-dest-department').value = '';
    bodyEl.querySelector('#mrf-dest-doctor').value = '';
    bodyEl.querySelector('#mrf-dest-doctor').disabled = true;
    bodyEl.querySelector('.mrf-combobox-toggle').disabled = true;

    // 日付・時間入力をリセット
    ['#mrf-hope-date-1', '#mrf-hope-time-1', '#mrf-hope-date-2', '#mrf-hope-time-2', '#mrf-image-date'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // ラジオボタンをデフォルトにリセット
    const dateRadio = bodyEl.querySelector('#mrf-hope-date-type-date');
    if (dateRadio) dateRadio.checked = true;
    bodyEl.querySelector('#mrf-hope-date-field')?.classList.add('visible');

    const noImageRadio = bodyEl.querySelector('#mrf-has-image-no');
    if (noImageRadio) noImageRadio.checked = true;
    bodyEl.querySelector('#mrf-image-detail-field')?.classList.remove('visible');

    const unknownRadio = bodyEl.querySelector('#mrf-visit-unknown');
    if (unknownRadio) unknownRadio.checked = true;

    const noneStatusRadio = bodyEl.querySelector('#mrf-status-none');
    if (noneStatusRadio) noneStatusRadio.checked = true;
    bodyEl.querySelector('#mrf-facility-field')?.classList.remove('visible');
    bodyEl.querySelector('#mrf-outpatient-detail')?.classList.add('mrf-hidden');
    bodyEl.querySelector('#mrf-inpatient-detail')?.classList.add('mrf-hidden');

    const noContactRadio = bodyEl.querySelector('#mrf-prior-contact-no');
    if (noContactRadio) noContactRadio.checked = true;

    // 画像チェックボックスをリセット
    ['#mrf-image-ct', '#mrf-image-mri', '#mrf-image-xp', '#mrf-image-pet'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.checked = false;
    });

    // テキストエリアをリセット
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // 病名チェックボックスをリセット
    bodyEl.querySelectorAll('.mrf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  }

  function setupFormEvents(bodyEl) {
    const escapeHtml = FC().utils.escapeHtml;

    // 外来担当表ボタン
    bodyEl.querySelector('#mrf-open-schedule')?.addEventListener('click', () => {
      window.open('https://www.takamatsu-municipal-hospital.jp/archives/60', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = bodyEl.querySelector('#mrf-dest-department');
    const doctorInput = bodyEl.querySelector('#mrf-dest-doctor');
    const doctorDropdown = bodyEl.querySelector('#mrf-doctor-dropdown');
    const doctorCombobox = bodyEl.querySelector('.mrf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      bodyEl.querySelectorAll('.mrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="mrf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="mrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getMinnaDoctors(deptName);
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
      doctorCombobox.querySelector('.mrf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.mrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.mrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // bodyEl内クリックでドロップダウンを閉じる
    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest('.mrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 希望日タイプ変更時
    const hopeDateTypeRadios = bodyEl.querySelectorAll('input[name="mrf-hope-date-type"]');
    const hopeDateField = bodyEl.querySelector('#mrf-hope-date-field');
    hopeDateTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'date') {
          hopeDateField.classList.add('visible');
        } else {
          hopeDateField.classList.remove('visible');
        }
      });
    });

    // 画像有無変更時
    const hasImageRadios = bodyEl.querySelectorAll('input[name="mrf-has-image"]');
    const imageDetailField = bodyEl.querySelector('#mrf-image-detail-field');
    hasImageRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          imageDetailField.classList.add('visible');
        } else {
          imageDetailField.classList.remove('visible');
        }
      });
    });

    // 現在の状況ラジオボタン変更時
    const currentStatusRadios = bodyEl.querySelectorAll('input[name="mrf-current-status"]');
    const facilityField = bodyEl.querySelector('#mrf-facility-field');
    const outpatientDetail = bodyEl.querySelector('#mrf-outpatient-detail');
    const inpatientDetail = bodyEl.querySelector('#mrf-inpatient-detail');
    currentStatusRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        // 全て非表示にしてから該当するものを表示
        facilityField.classList.remove('visible');
        outpatientDetail.classList.add('mrf-hidden');
        inpatientDetail.classList.add('mrf-hidden');

        if (radio.value === 'facility') {
          facilityField.classList.add('visible');
        } else if (radio.value === 'outpatient') {
          outpatientDetail.classList.remove('mrf-hidden');
        } else if (radio.value === 'inpatient') {
          inpatientDetail.classList.remove('mrf-hidden');
        }
      });
    });
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      .mrf-radio-group.vertical {
        flex-direction: column;
        gap: 8px;
      }
      .mrf-conditional-field {
        margin-top: 8px;
        padding: 12px;
        background: #fafafa;
        border-radius: 6px;
        display: none;
      }
      .mrf-conditional-field.visible { display: block; }
      .mrf-image-checkboxes {
        display: flex;
        gap: 16px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .mrf-image-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mrf-image-checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
      }
      .mrf-image-checkbox label {
        font-size: 14px;
        color: #333;
      }
      .mrf-current-status-detail {
        margin-top: 8px;
        padding-left: 24px;
      }
      .mrf-current-status-detail select {
        width: auto;
        min-width: 150px;
      }
      .mrf-hidden { display: none !important; }
    `;

    FC().showFormModal({
      id: 'mrf-form-modal',
      title: '高松市立みんなの病院 FAX診療申込書',
      prefix: 'mrf',
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
    data.maiden_name = bodyEl.querySelector('#mrf-maiden-name')?.value || '';

    // 高松市立みんなの病院固有
    data.destination_department = bodyEl.querySelector('#mrf-dest-department')?.value || '';
    data.destination_doctor = bodyEl.querySelector('#mrf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_type = bodyEl.querySelector('input[name="mrf-hope-date-type"]:checked')?.value || 'date';
    if (data.hope_date_type === 'date') {
      data.hope_date_1 = bodyEl.querySelector('#mrf-hope-date-1')?.value || '';
      data.hope_time_1 = bodyEl.querySelector('#mrf-hope-time-1')?.value || '';
      data.hope_date_2 = bodyEl.querySelector('#mrf-hope-date-2')?.value || '';
      data.hope_time_2 = bodyEl.querySelector('#mrf-hope-time-2')?.value || '';
    } else {
      data.hope_date_1 = '';
      data.hope_time_1 = '';
      data.hope_date_2 = '';
      data.hope_time_2 = '';
    }

    // 画像の有無
    data.has_image = bodyEl.querySelector('input[name="mrf-has-image"]:checked')?.value === 'yes';
    if (data.has_image) {
      data.image_ct = bodyEl.querySelector('#mrf-image-ct')?.checked || false;
      data.image_mri = bodyEl.querySelector('#mrf-image-mri')?.checked || false;
      data.image_xp = bodyEl.querySelector('#mrf-image-xp')?.checked || false;
      data.image_pet = bodyEl.querySelector('#mrf-image-pet')?.checked || false;
      data.image_date = bodyEl.querySelector('#mrf-image-date')?.value || '';
    } else {
      data.image_ct = false;
      data.image_mri = false;
      data.image_xp = false;
      data.image_pet = false;
      data.image_date = '';
    }

    // 事前連絡
    data.prior_contact = bodyEl.querySelector('input[name="mrf-prior-contact"]:checked')?.value || 'no';

    // 受診歴
    data.visit_history = bodyEl.querySelector('input[name="mrf-visit-history"]:checked')?.value || 'unknown';

    // 現在の状況
    data.current_status = bodyEl.querySelector('input[name="mrf-current-status"]:checked')?.value || 'none';
    if (data.current_status === 'outpatient') {
      data.current_status_detail = bodyEl.querySelector('#mrf-outpatient-type')?.value || 'insurance';
    } else if (data.current_status === 'inpatient') {
      data.current_status_detail = bodyEl.querySelector('#mrf-inpatient-type')?.value || 'dpc';
    } else {
      data.current_status_detail = '';
    }
    data.facility_name = data.current_status === 'facility'
      ? (bodyEl.querySelector('#mrf-facility-name')?.value || '')
      : '';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#mrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector('#mrf-diagnosis-text')?.value || '';

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
      visitHistoryText = '有';
    } else if (formData.visit_history === 'no') {
      visitHistoryText = '無';
    } else {
      visitHistoryText = '不明';
    }

    // 現在の状況テキスト作成
    let currentStatusText = '';
    switch (formData.current_status) {
      case 'outpatient': {
        const detailLabels = {
          insurance: '保険診療',
          accident: '事故',
          workers: '労災',
          other: 'その他'
        };
        currentStatusText = `外来通院中（${detailLabels[formData.current_status_detail] || '保険診療'}）`;
        break;
      }
      case 'inpatient': {
        const dpcLabel = formData.current_status_detail === 'non-dpc' ? 'DPC対象外' : 'DPC対象';
        currentStatusText = `入院中（${dpcLabel}）`;
        break;
      }
      case 'facility':
        currentStatusText = formData.facility_name
          ? `介護施設入所中（${formData.facility_name}）`
          : '介護施設入所中';
        break;
      default:
        currentStatusText = '';
    }

    // 希望日時フォーマット
    let hopeDateTimeText = '';
    if (formData.hope_date_type === 'date') {
      const hopeDateParts = [];
      if (formData.hope_date_1) {
        hopeDateParts.push(`①${formatHopeDateTime(formData.hope_date_1, formData.hope_time_1)}`);
      }
      if (formData.hope_date_2) {
        hopeDateParts.push(`②${formatHopeDateTime(formData.hope_date_2, formData.hope_time_2)}`);
      }
      hopeDateTimeText = hopeDateParts.join('\n');
    } else if (formData.hope_date_type === 'today') {
      hopeDateTimeText = '当日';
    } else if (formData.hope_date_type === 'anytime') {
      hopeDateTimeText = 'いつでもよい';
    }

    // 画像の有無テキスト作成
    let imageText = '';
    if (formData.has_image) {
      const imageTypes = [];
      if (formData.image_ct) imageTypes.push('CT');
      if (formData.image_mri) imageTypes.push('MRI');
      if (formData.image_xp) imageTypes.push('XP');
      if (formData.image_pet) imageTypes.push('PET-CT');

      if (imageTypes.length > 0) {
        imageText = imageTypes.join('・');
        if (formData.image_date) {
          imageText += `（${formData.image_date}撮影）`;
        }
      } else {
        imageText = '有';
      }
    } else {
      imageText = '無';
    }

    // 事前連絡テキスト
    const priorContactText = formData.prior_contact === 'yes' ? '有' : '無';

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `FAX診療申込書_みんなの病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'minna-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{患者氏名}}': formData.patient_name,
        '{{フリガナ}}': formData.patient_name_kana,
        '{{旧姓}}': formData.maiden_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{郵便番号}}': formData.postal_code,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{医師名}}': formData.physician_name,
        '{{診療科}}': formData.my_department,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{希望日時}}': hopeDateTimeText,
        '{{傷病名}}': diagnosisText,
        '{{受診歴}}': visitHistoryText,
        '{{現在貴院に}}': currentStatusText,
        '{{画像の有無}}': imageText,
        '{{事前連絡}}': priorContactText
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
      id: 'minna-referral-form',
      name: '診療申込書（みんなの病院）',
      icon: '🏥',
      description: '高松市立みんなの病院へのFAX診療申込書を作成',
      version: VERSION,
      order: 212,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showMinnaForm
    }
  });
})();
