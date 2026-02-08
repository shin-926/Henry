// ==UserScript==
// @name         高松平和病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.6.1
// @description  高松平和病院への診療申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_heiwa.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_heiwa.user.js
// ==/UserScript==

/*
 * 【高松平和病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - 高松平和病院への診療申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 高松平和病院固有の入力項目
 *    - 診療科（内科/整形外科/乳腺外科/検査）
 *    - 希望医師名
 *    - 第1〜3希望日
 *    - 内視鏡検査（上部/大腸）
 *    - 放射線検査（CT/MRI）
 *    - 超音波検査
 *    - コロナウイルス対策
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: 高松平和病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'HeiwaReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1fYGffOVDrurJyLPWZh9nokDexZh7Rg4tgzEJ1VeGmo8',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 高松平和病院固定
  const HOSPITAL_NAME = '高松平和病院';

  // 外来担当表URL
  const SCHEDULE_URL = 'https://t-heiwa.com/doctor/';

  // DraftStorage設定
  const DRAFT_TYPE = 'heiwa';
  const DRAFT_LS_PREFIX = 'henry_heiwa_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 診療科リスト（PDFの選択肢に従う）
  // ※henry_hospitalsのデータとは異なる（紹介用フォーム専用）
  // ※「検査」はpurpose_typeで別管理
  const DEPARTMENTS = ['内科', '整形外科', '乳腺外科'];

  // 超音波検査の種類
  const ULTRASOUND_TYPES = ['腹部', '心', '下肢動脈', '頚動脈', '甲状腺'];

  // テーマカラー（ネイビーブルー系）
  const THEME = {
    primary: '#3F51B5',
    primaryDark: '#303F9F',
    primaryLight: '#E8EAF6',
    accent: '#C5CAE9'
  };

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 高松平和病院固有ユーティリティ
  // ==========================================

  /**
   * 希望日のフォーマット: "○月○日（曜日）"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日（${weekdays[d.getDay()]}）`;
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  /**
   * 高松平和病院の診療科別医師を取得
   * @param {string} departmentName - 診療科名
   * @returns {string[]} 医師名の配列
   */
  function getHeiwaDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName || departmentName === '検査') return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName) || [];
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showHeiwaForm() {
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
        birth_date_wareki: patientInfo.birth_date_wareki,
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

        // 高松平和病院固有
        purpose_type: 'consultation', // 'consultation'（診察）または 'test'（検査）
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_date_2: '',
        hope_date_3: '',

        // 内視鏡検査
        upper_endoscopy: false,
        upper_endoscopy_method: 'nasal',
        upper_endoscopy_sedation: 'no',
        upper_endoscopy_anticoagulant: 'no',
        upper_endoscopy_anticoagulant_name: '',
        lower_endoscopy: false,

        // 放射線検査
        radiology_exam: false,
        radiology_type: 'ct',
        radiology_site: '',
        radiology_contrast: 'no',
        radiology_cr: '',
        radiology_exam_date: '',
        radiology_diabetes_med: 'no',
        radiology_diabetes_med_name: '',
        radiology_media: 'cd',
        radiology_result_delivery: 'patient',

        // 超音波検査
        ultrasound_types: [],
        ultrasound_result_delivery: 'patient',

        // コロナ対策
        covid_travel: 'no',
        covid_contact: 'no',
        covid_symptoms: 'no',

        // その他
        other_notes: ''
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
    const escapeHtml = FC().utils.escapeHtml;

    return `
      <!-- 診察・検査 -->
      <div class="hrf-section">
        <div class="hrf-section-title">診察・検査</div>
        <div class="hrf-note">
          <strong>緩和ケア紹介について：</strong>緩和ケアへの紹介をご希望の場合は、代表番号（087-833-8113）へご連絡ください。
        </div>
        <div class="hrf-row">
          <div class="hrf-field">
            <label>診察・検査</label>
            <div class="hrf-radio-group">
              <div class="hrf-radio-item">
                <input type="radio" name="hrf-purpose-type" id="hrf-purpose-consultation" value="consultation"
                  ${formData.purpose_type !== 'test' ? 'checked' : ''}>
                <label for="hrf-purpose-consultation">診察</label>
              </div>
              <div class="hrf-radio-item">
                <input type="radio" name="hrf-purpose-type" id="hrf-purpose-test" value="test"
                  ${formData.purpose_type === 'test' ? 'checked' : ''}>
                <label for="hrf-purpose-test">検査</label>
              </div>
            </div>
          </div>
        </div>
        <div id="hrf-consultation-fields" style="${formData.purpose_type === 'test' ? 'display: none;' : ''}">
          <div class="hrf-row">
            <div class="hrf-field">
              <label>診療科</label>
              <select id="hrf-dest-department">
                <option value="">選択してください</option>
                ${DEPARTMENTS.map(dept => `
                  <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                    ${escapeHtml(dept)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="hrf-field" id="hrf-doctor-field">
              <label>希望医師名</label>
              <div style="display: flex; gap: 8px; align-items: flex-start;">
                <div class="hrf-combobox" data-field="doctor" style="flex: 1;">
                  <input type="text" class="hrf-combobox-input" id="hrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力">
                  <button type="button" class="hrf-combobox-toggle" title="リストから選択">▼</button>
                  <div class="hrf-combobox-dropdown" id="hrf-doctor-dropdown"></div>
                </div>
                <button type="button" class="hrf-btn hrf-btn-link" id="hrf-open-schedule" title="外来担当表を見る">外来表</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 希望日 -->
      <div class="hrf-section">
        <div class="hrf-section-title">受診希望日</div>
        <div class="hrf-row">
          <div class="hrf-field">
            <label>第1希望日</label>
            <input type="date" id="hrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
          </div>
          <div class="hrf-field">
            <label>第2希望日</label>
            <input type="date" id="hrf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
          </div>
          <div class="hrf-field">
            <label>第3希望日</label>
            <input type="date" id="hrf-hope-date-3" value="${escapeHtml(formData.hope_date_3)}">
          </div>
        </div>
      </div>

      <!-- 主訴または傷病名 -->
      <div class="hrf-section">
        <div class="hrf-section-title">主訴または傷病名</div>
        ${formData.diseases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
            <div id="hrf-diseases-list" class="hrf-checkbox-group">
              ${formData.diseases.map(d => `
                <div class="hrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                  <input type="checkbox" id="hrf-disease-${d.uuid}" value="${d.uuid}"
                    ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                  <label for="hrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="hrf-field">
          <label>自由記述</label>
          <textarea id="hrf-diagnosis-text" placeholder="主訴や追加の傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
        </div>
      </div>

      <!-- 検査項目（検査選択時のみ表示） -->
      <div id="hrf-test-sections" style="${formData.purpose_type !== 'test' ? 'display: none;' : ''}">
      <!-- 内視鏡検査 -->
      <div class="hrf-section">
        <div class="hrf-section-title collapsible" data-target="hrf-endoscopy-content">内視鏡検査</div>
        <div class="hrf-section-content" id="hrf-endoscopy-content">
          <!-- 上部内視鏡検査 -->
          <div class="hrf-subsection">
            <div class="hrf-inline-checkbox">
              <input type="checkbox" id="hrf-upper-endoscopy" ${formData.upper_endoscopy ? 'checked' : ''}>
              <label for="hrf-upper-endoscopy">上部内視鏡検査</label>
            </div>
            <div class="hrf-conditional-field ${formData.upper_endoscopy ? 'visible' : ''}" id="hrf-upper-endoscopy-detail">
              <div class="hrf-row">
                <div class="hrf-field">
                  <label>実施方法</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-upper-method" id="hrf-upper-nasal" value="nasal"
                        ${formData.upper_endoscopy_method !== 'oral' ? 'checked' : ''}>
                      <label for="hrf-upper-nasal">経鼻</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-upper-method" id="hrf-upper-oral" value="oral"
                        ${formData.upper_endoscopy_method === 'oral' ? 'checked' : ''}>
                      <label for="hrf-upper-oral">経口</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="hrf-conditional-field ${formData.upper_endoscopy_method === 'oral' ? 'visible' : ''}" id="hrf-sedation-field">
                <div class="hrf-field">
                  <label>鎮静剤使用</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-sedation" id="hrf-sedation-no" value="no"
                        ${formData.upper_endoscopy_sedation !== 'yes' ? 'checked' : ''}>
                      <label for="hrf-sedation-no">なし</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-sedation" id="hrf-sedation-yes" value="yes"
                        ${formData.upper_endoscopy_sedation === 'yes' ? 'checked' : ''}>
                      <label for="hrf-sedation-yes">あり</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="hrf-row" style="margin-top: 12px;">
                <div class="hrf-field">
                  <label>抗血栓剤投薬</label>
                  <div class="hrf-radio-group">
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-anticoagulant" id="hrf-anticoagulant-no" value="no"
                        ${formData.upper_endoscopy_anticoagulant !== 'yes' ? 'checked' : ''}>
                      <label for="hrf-anticoagulant-no">なし</label>
                    </div>
                    <div class="hrf-radio-item">
                      <input type="radio" name="hrf-anticoagulant" id="hrf-anticoagulant-yes" value="yes"
                        ${formData.upper_endoscopy_anticoagulant === 'yes' ? 'checked' : ''}>
                      <label for="hrf-anticoagulant-yes">あり</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="hrf-conditional-field ${formData.upper_endoscopy_anticoagulant === 'yes' ? 'visible' : ''}" id="hrf-anticoagulant-name-field">
                <div class="hrf-field">
                  <label>薬剤名</label>
                  <input type="text" id="hrf-anticoagulant-name" value="${escapeHtml(formData.upper_endoscopy_anticoagulant_name)}" placeholder="例: ワーファリン">
                </div>
              </div>
            </div>
          </div>

          <!-- 大腸内視鏡検査 -->
          <div class="hrf-subsection" style="margin-top: 16px;">
            <div class="hrf-inline-checkbox">
              <input type="checkbox" id="hrf-lower-endoscopy" ${formData.lower_endoscopy ? 'checked' : ''}>
              <label for="hrf-lower-endoscopy">大腸内視鏡検査</label>
            </div>
            <div class="hrf-note" style="margin-top: 8px; margin-bottom: 0;">
              ※大腸内視鏡検査は内科診察後に予約となります
            </div>
          </div>
        </div>
      </div>

      <!-- 放射線検査 -->
      <div class="hrf-section">
        <div class="hrf-section-title collapsible" data-target="hrf-radiology-content">放射線検査</div>
        <div class="hrf-section-content" id="hrf-radiology-content">
          <div class="hrf-inline-checkbox">
            <input type="checkbox" id="hrf-radiology-exam" ${formData.radiology_exam ? 'checked' : ''}>
            <label for="hrf-radiology-exam">放射線検査を希望</label>
          </div>
          <div class="hrf-conditional-field ${formData.radiology_exam ? 'visible' : ''}" id="hrf-radiology-detail">
            <div class="hrf-row">
              <div class="hrf-field">
                <label>検査種類</label>
                <div class="hrf-radio-group">
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-radiology-type" id="hrf-radiology-ct" value="ct"
                      ${formData.radiology_type !== 'mri' ? 'checked' : ''}>
                    <label for="hrf-radiology-ct">CT</label>
                  </div>
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-radiology-type" id="hrf-radiology-mri" value="mri"
                      ${formData.radiology_type === 'mri' ? 'checked' : ''}>
                    <label for="hrf-radiology-mri">MRI（1.5テスラ）</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="hrf-row">
              <div class="hrf-field">
                <label>部位</label>
                <input type="text" id="hrf-radiology-site" value="${escapeHtml(formData.radiology_site)}" placeholder="例: 胸部、腹部、頭部">
              </div>
            </div>
            <div class="hrf-row">
              <div class="hrf-field">
                <label>造影剤</label>
                <div class="hrf-radio-group">
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-contrast" id="hrf-contrast-no" value="no"
                      ${formData.radiology_contrast !== 'yes' ? 'checked' : ''}>
                    <label for="hrf-contrast-no">なし</label>
                  </div>
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-contrast" id="hrf-contrast-yes" value="yes"
                      ${formData.radiology_contrast === 'yes' ? 'checked' : ''}>
                    <label for="hrf-contrast-yes">あり</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="hrf-conditional-field ${formData.radiology_contrast === 'yes' ? 'visible' : ''}" id="hrf-contrast-detail">
              <div class="hrf-row">
                <div class="hrf-field" style="flex: 0.5;">
                  <label>Cr（クレアチニン値）</label>
                  <input type="text" id="hrf-radiology-cr" value="${escapeHtml(formData.radiology_cr)}" placeholder="例: 0.8">
                </div>
                <div class="hrf-field" style="flex: 0.5;">
                  <label>検査日</label>
                  <input type="date" id="hrf-radiology-exam-date" value="${escapeHtml(formData.radiology_exam_date)}">
                </div>
              </div>
            </div>
            <div class="hrf-row" style="margin-top: 12px;">
              <div class="hrf-field">
                <label>糖尿病薬服用</label>
                <div class="hrf-radio-group">
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-diabetes-med" id="hrf-diabetes-med-no" value="no"
                      ${formData.radiology_diabetes_med !== 'yes' ? 'checked' : ''}>
                    <label for="hrf-diabetes-med-no">なし</label>
                  </div>
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-diabetes-med" id="hrf-diabetes-med-yes" value="yes"
                      ${formData.radiology_diabetes_med === 'yes' ? 'checked' : ''}>
                    <label for="hrf-diabetes-med-yes">あり</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="hrf-conditional-field ${formData.radiology_diabetes_med === 'yes' ? 'visible' : ''}" id="hrf-diabetes-med-name-field">
              <div class="hrf-field">
                <label>薬剤名</label>
                <input type="text" id="hrf-diabetes-med-name" value="${escapeHtml(formData.radiology_diabetes_med_name)}" placeholder="例: メトホルミン">
              </div>
            </div>
            <div class="hrf-row" style="margin-top: 12px;">
              <div class="hrf-field">
                <label>結果の媒体</label>
                <div class="hrf-radio-group">
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-media" id="hrf-media-cd" value="cd"
                      ${formData.radiology_media !== 'film' ? 'checked' : ''}>
                    <label for="hrf-media-cd">CD-R</label>
                  </div>
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-media" id="hrf-media-film" value="film"
                      ${formData.radiology_media === 'film' ? 'checked' : ''}>
                    <label for="hrf-media-film">フィルム</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="hrf-row" style="margin-top: 12px;">
              <div class="hrf-field">
                <label>放射線所見の伝達</label>
                <div class="hrf-radio-group">
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-radiology-delivery" id="hrf-radiology-patient" value="patient"
                      ${formData.radiology_result_delivery !== 'mail' ? 'checked' : ''}>
                    <label for="hrf-radiology-patient">患者様持ち帰り</label>
                  </div>
                  <div class="hrf-radio-item">
                    <input type="radio" name="hrf-radiology-delivery" id="hrf-radiology-mail" value="mail"
                      ${formData.radiology_result_delivery === 'mail' ? 'checked' : ''}>
                    <label for="hrf-radiology-mail">郵送</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 超音波検査 -->
      <div class="hrf-section">
        <div class="hrf-section-title collapsible" data-target="hrf-ultrasound-content">超音波検査</div>
        <div class="hrf-section-content" id="hrf-ultrasound-content">
          <div class="hrf-field">
            <label>検査種類（複数選択可）</label>
            <div class="hrf-multi-checkbox">
              ${ULTRASOUND_TYPES.map(type => `
                <div class="hrf-checkbox-item">
                  <input type="checkbox" id="hrf-us-${type}" value="${type}"
                    ${formData.ultrasound_types?.includes(type) ? 'checked' : ''}>
                  <label for="hrf-us-${type}">${type}エコー</label>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="hrf-row" style="margin-top: 12px;">
            <div class="hrf-field">
              <label>所見の伝達</label>
              <div class="hrf-radio-group">
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-us-delivery" id="hrf-us-patient" value="patient"
                    ${formData.ultrasound_result_delivery !== 'mail' ? 'checked' : ''}>
                  <label for="hrf-us-patient">患者様持ち帰り</label>
                </div>
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-us-delivery" id="hrf-us-mail" value="mail"
                    ${formData.ultrasound_result_delivery === 'mail' ? 'checked' : ''}>
                  <label for="hrf-us-mail">郵送</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div><!-- /hrf-test-sections -->

      <!-- コロナウイルス対策 -->
      <div class="hrf-section">
        <div class="hrf-section-title collapsible" data-target="hrf-covid-content">コロナウイルス対策</div>
        <div class="hrf-section-content" id="hrf-covid-content">
          <div class="hrf-row">
            <div class="hrf-field">
              <label>2週間以内の海外渡航歴、県外訪問歴</label>
              <div class="hrf-radio-group">
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-covid-travel" id="hrf-covid-travel-no" value="no"
                    ${formData.covid_travel !== 'yes' ? 'checked' : ''}>
                  <label for="hrf-covid-travel-no">なし</label>
                </div>
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-covid-travel" id="hrf-covid-travel-yes" value="yes"
                    ${formData.covid_travel === 'yes' ? 'checked' : ''}>
                  <label for="hrf-covid-travel-yes">あり</label>
                </div>
              </div>
            </div>
          </div>
          <div class="hrf-row">
            <div class="hrf-field">
              <label>2週間以内の感染者との接触歴</label>
              <div class="hrf-radio-group">
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-covid-contact" id="hrf-covid-contact-no" value="no"
                    ${formData.covid_contact !== 'yes' ? 'checked' : ''}>
                  <label for="hrf-covid-contact-no">なし</label>
                </div>
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-covid-contact" id="hrf-covid-contact-yes" value="yes"
                    ${formData.covid_contact === 'yes' ? 'checked' : ''}>
                  <label for="hrf-covid-contact-yes">あり</label>
                </div>
              </div>
            </div>
          </div>
          <div class="hrf-row">
            <div class="hrf-field">
              <label>発熱、咳、息切れなどの症状</label>
              <div class="hrf-radio-group">
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-covid-symptoms" id="hrf-covid-symptoms-no" value="no"
                    ${formData.covid_symptoms !== 'yes' ? 'checked' : ''}>
                  <label for="hrf-covid-symptoms-no">なし</label>
                </div>
                <div class="hrf-radio-item">
                  <input type="radio" name="hrf-covid-symptoms" id="hrf-covid-symptoms-yes" value="yes"
                    ${formData.covid_symptoms === 'yes' ? 'checked' : ''}>
                  <label for="hrf-covid-symptoms-yes">あり</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- その他 -->
      <div class="hrf-section">
        <div class="hrf-section-title">その他</div>
        <div class="hrf-field">
          <textarea id="hrf-other-notes" placeholder="その他の連絡事項があれば入力">${escapeHtml(formData.other_notes)}</textarea>
        </div>
      </div>
    `;
  }

  function clearFormFields(bodyEl) {
    // select・コンボボックスをリセット
    bodyEl.querySelector('#hrf-dest-department').value = '';
    bodyEl.querySelector('#hrf-dest-doctor').value = '';
    bodyEl.querySelector('#hrf-dest-doctor').disabled = true;
    bodyEl.querySelector('.hrf-combobox-toggle').disabled = true;

    // 日付入力をリセット
    ['#hrf-hope-date-1', '#hrf-hope-date-2', '#hrf-hope-date-3', '#hrf-radiology-exam-date'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // テキスト入力をリセット
    ['#hrf-anticoagulant-name', '#hrf-radiology-site', '#hrf-radiology-cr', '#hrf-diabetes-med-name'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // テキストエリアをリセット
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // チェックボックスをリセット
    bodyEl.querySelectorAll('.hrf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    ['#hrf-upper-endoscopy', '#hrf-lower-endoscopy', '#hrf-radiology-exam'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.checked = false;
    });
  }

  function setupFormEvents(bodyEl) {
    const escapeHtml = FC().utils.escapeHtml;

    // 折りたたみセクション
    bodyEl.querySelectorAll('.hrf-section-title.collapsible').forEach(title => {
      title.addEventListener('click', () => {
        const targetId = title.dataset.target;
        const content = bodyEl.querySelector(`#${targetId}`);
        title.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      });
    });

    // 外来担当表リンク
    bodyEl.querySelector('#hrf-open-schedule')?.addEventListener('click', () => {
      window.open(SCHEDULE_URL, '_blank');
    });

    // 診察・検査ラジオボタン
    const consultationFields = bodyEl.querySelector('#hrf-consultation-fields');
    const testSections = bodyEl.querySelector('#hrf-test-sections');
    bodyEl.querySelectorAll('input[name="hrf-purpose-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'test') {
          consultationFields.style.display = 'none';
          testSections.style.display = '';
        } else {
          consultationFields.style.display = '';
          testSections.style.display = 'none';
        }
      });
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = bodyEl.querySelector('#hrf-dest-department');
    const doctorInput = bodyEl.querySelector('#hrf-dest-doctor');
    const doctorDropdown = bodyEl.querySelector('#hrf-doctor-dropdown');
    const doctorCombobox = bodyEl.querySelector('.hrf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      bodyEl.querySelectorAll('.hrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="hrf-combobox-empty">選択肢がありません（手入力可）</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="hrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getHeiwaDoctors(deptName);
      // 「担当医」を常に追加
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(doctorDropdown, doctors, doctorInput.value);
      doctorDropdown.classList.add('open');
    }

    // 診療科変更時
    deptSelect.addEventListener('change', () => {
      const deptValue = deptSelect.value;
      // 乳腺外科は医師リストがないため「担当医」をデフォルト設定
      if (deptValue === '乳腺外科') {
        doctorInput.value = '担当医';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.hrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.hrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // bodyEl内クリックでドロップダウンを閉じる
    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest('.hrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 上部内視鏡検査チェックボックス
    const upperEndoscopy = bodyEl.querySelector('#hrf-upper-endoscopy');
    const upperDetail = bodyEl.querySelector('#hrf-upper-endoscopy-detail');
    upperEndoscopy.addEventListener('change', () => {
      upperDetail.classList.toggle('visible', upperEndoscopy.checked);
    });

    // 上部内視鏡実施方法
    bodyEl.querySelectorAll('input[name="hrf-upper-method"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const sedationField = bodyEl.querySelector('#hrf-sedation-field');
        sedationField.classList.toggle('visible', radio.value === 'oral');
      });
    });

    // 抗血栓剤
    bodyEl.querySelectorAll('input[name="hrf-anticoagulant"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const nameField = bodyEl.querySelector('#hrf-anticoagulant-name-field');
        nameField.classList.toggle('visible', radio.value === 'yes');
      });
    });

    // 放射線検査チェックボックス
    const radiologyExam = bodyEl.querySelector('#hrf-radiology-exam');
    const radiologyDetail = bodyEl.querySelector('#hrf-radiology-detail');
    radiologyExam.addEventListener('change', () => {
      radiologyDetail.classList.toggle('visible', radiologyExam.checked);
    });

    // 造影剤
    bodyEl.querySelectorAll('input[name="hrf-contrast"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const contrastDetail = bodyEl.querySelector('#hrf-contrast-detail');
        contrastDetail.classList.toggle('visible', radio.value === 'yes');
      });
    });

    // 糖尿病薬
    bodyEl.querySelectorAll('input[name="hrf-diabetes-med"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const nameField = bodyEl.querySelector('#hrf-diabetes-med-name-field');
        nameField.classList.toggle('visible', radio.value === 'yes');
      });
    });
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      .hrf-section-title.collapsible {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .hrf-section-title.collapsible::before {
        content: '\\25BC';
        font-size: 12px;
        transition: transform 0.2s;
      }
      .hrf-section-title.collapsible.collapsed::before {
        transform: rotate(-90deg);
      }
      .hrf-section-content {
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      .hrf-section-content.collapsed {
        max-height: 0;
        padding: 0;
      }
      .hrf-checkbox-group {
        max-height: 200px;
        overflow-y: auto;
      }
      .hrf-radio-group.vertical {
        flex-direction: column;
        gap: 8px;
      }
      .hrf-inline-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #f8f9fa;
        border-radius: 6px;
        margin-bottom: 12px;
      }
      .hrf-inline-checkbox input[type="checkbox"] {
        width: 18px;
        height: 18px;
      }
      .hrf-inline-checkbox label {
        font-size: 14px;
        font-weight: 500;
        color: #333;
        margin: 0;
      }
      .hrf-conditional-field {
        margin-top: 8px;
        padding: 12px;
        background: #fafafa;
        border-radius: 6px;
        display: none;
      }
      .hrf-conditional-field.visible {
        display: block;
      }
      .hrf-subsection {
        margin-top: 12px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 3px solid ${THEME.primaryLight};
      }
      .hrf-subsection-title {
        font-size: 14px;
        font-weight: 600;
        color: #555;
        margin-bottom: 12px;
      }
      .hrf-multi-checkbox {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 8px;
      }
      .hrf-multi-checkbox .hrf-checkbox-item {
        flex: 0 0 auto;
        margin-bottom: 0;
      }
      .hrf-note {
        background: #fff3e0;
        border: 1px solid #ffb74d;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 12px;
        font-size: 13px;
        color: #e65100;
      }
    `;

    FC().showFormModal({
      id: 'hrf-form-modal',
      title: '高松平和病院 診療申込書',
      prefix: 'hrf',
      bodyHTML: buildFormBody(formData),
      extraCSS: EXTRA_CSS,
      width: '90%',
      headerColor: 'linear-gradient(135deg, #3F51B5, #303F9F)',
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

    // 診察・検査タイプ
    data.purpose_type = bodyEl.querySelector('input[name="hrf-purpose-type"]:checked')?.value || 'consultation';

    // 診療科・医師（検査の場合は空）
    if (data.purpose_type === 'test') {
      data.destination_department = '';
      data.destination_doctor = '';
    } else {
      data.destination_department = bodyEl.querySelector('#hrf-dest-department')?.value || '';
      data.destination_doctor = bodyEl.querySelector('#hrf-dest-doctor')?.value || '';
    }

    // 希望日
    data.hope_date_1 = bodyEl.querySelector('#hrf-hope-date-1')?.value || '';
    data.hope_date_2 = bodyEl.querySelector('#hrf-hope-date-2')?.value || '';
    data.hope_date_3 = bodyEl.querySelector('#hrf-hope-date-3')?.value || '';

    // 病名
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#hrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector('#hrf-diagnosis-text')?.value || '';

    // 検査フィールド（検査タイプの場合のみ収集）
    if (data.purpose_type === 'test') {
      // 内視鏡検査
      data.upper_endoscopy = bodyEl.querySelector('#hrf-upper-endoscopy')?.checked || false;
      data.upper_endoscopy_method = bodyEl.querySelector('input[name="hrf-upper-method"]:checked')?.value || 'nasal';
      data.upper_endoscopy_sedation = bodyEl.querySelector('input[name="hrf-sedation"]:checked')?.value || 'no';
      data.upper_endoscopy_anticoagulant = bodyEl.querySelector('input[name="hrf-anticoagulant"]:checked')?.value || 'no';
      data.upper_endoscopy_anticoagulant_name = bodyEl.querySelector('#hrf-anticoagulant-name')?.value || '';
      data.lower_endoscopy = bodyEl.querySelector('#hrf-lower-endoscopy')?.checked || false;

      // 放射線検査
      data.radiology_exam = bodyEl.querySelector('#hrf-radiology-exam')?.checked || false;
      data.radiology_type = bodyEl.querySelector('input[name="hrf-radiology-type"]:checked')?.value || 'ct';
      data.radiology_site = bodyEl.querySelector('#hrf-radiology-site')?.value || '';
      data.radiology_contrast = bodyEl.querySelector('input[name="hrf-contrast"]:checked')?.value || 'no';
      data.radiology_cr = bodyEl.querySelector('#hrf-radiology-cr')?.value || '';
      data.radiology_exam_date = bodyEl.querySelector('#hrf-radiology-exam-date')?.value || '';
      data.radiology_diabetes_med = bodyEl.querySelector('input[name="hrf-diabetes-med"]:checked')?.value || 'no';
      data.radiology_diabetes_med_name = bodyEl.querySelector('#hrf-diabetes-med-name')?.value || '';
      data.radiology_media = bodyEl.querySelector('input[name="hrf-media"]:checked')?.value || 'cd';
      data.radiology_result_delivery = bodyEl.querySelector('input[name="hrf-radiology-delivery"]:checked')?.value || 'patient';

      // 超音波検査
      data.ultrasound_types = [];
      ULTRASOUND_TYPES.forEach(type => {
        const cb = bodyEl.querySelector(`#hrf-us-${type}`);
        if (cb?.checked) {
          data.ultrasound_types.push(type);
        }
      });
      data.ultrasound_result_delivery = bodyEl.querySelector('input[name="hrf-us-delivery"]:checked')?.value || 'patient';
    } else {
      // 診察の場合は検査項目をリセット
      data.upper_endoscopy = false;
      data.upper_endoscopy_method = 'nasal';
      data.upper_endoscopy_sedation = 'no';
      data.upper_endoscopy_anticoagulant = 'no';
      data.upper_endoscopy_anticoagulant_name = '';
      data.lower_endoscopy = false;
      data.radiology_exam = false;
      data.radiology_type = 'ct';
      data.radiology_site = '';
      data.radiology_contrast = 'no';
      data.radiology_cr = '';
      data.radiology_exam_date = '';
      data.radiology_diabetes_med = 'no';
      data.radiology_diabetes_med_name = '';
      data.radiology_media = 'cd';
      data.radiology_result_delivery = 'patient';
      data.ultrasound_types = [];
      data.ultrasound_result_delivery = 'patient';
    }

    // コロナ対策
    data.covid_travel = bodyEl.querySelector('input[name="hrf-covid-travel"]:checked')?.value || 'no';
    data.covid_contact = bodyEl.querySelector('input[name="hrf-covid-contact"]:checked')?.value || 'no';
    data.covid_symptoms = bodyEl.querySelector('input[name="hrf-covid-symptoms"]:checked')?.value || 'no';

    // その他
    data.other_notes = bodyEl.querySelector('#hrf-other-notes')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // 傷病名テキスト
    const diagnosisParts = [];
    if (formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
      const diseaseText = selectedDiseases.map(d => d.name).join('、');
      if (diseaseText) {
        diagnosisParts.push(diseaseText);
      }
    }
    if (formData.diagnosis_text) {
      diagnosisParts.push(formData.diagnosis_text);
    }
    const diagnosisText = diagnosisParts.join('\n');

    // 診察・検査目的テキスト
    let purposeText = '';
    if (formData.purpose_type === 'test') {
      // 大腸内視鏡検査は内科診察が必要
      if (formData.lower_endoscopy) {
        purposeText = '検査、内科（大腸内視鏡）';
      } else {
        purposeText = '検査';
      }
    } else {
      const dept = formData.destination_department;
      const doctorName = formData.destination_doctor || '';
      if (dept) {
        purposeText = doctorName ? `${dept}（${doctorName}医師）` : dept;
      }
    }

    // 内視鏡検査テキスト（統合形式）
    let endoscopyText = 'なし';
    const endoscopyParts = [];

    // 上部内視鏡検査
    if (formData.upper_endoscopy) {
      const upperLines = [];
      // 1行目: 検査名と方法
      const method = formData.upper_endoscopy_method === 'oral' ? '経口' : '経鼻';
      let methodDetail = method;
      if (formData.upper_endoscopy_method === 'oral') {
        methodDetail += `、鎮静剤${formData.upper_endoscopy_sedation === 'yes' ? 'あり' : 'なし'}`;
      }
      upperLines.push(`上部内視鏡検査（${methodDetail}）`);

      // 2行目: 抗血栓剤
      if (formData.upper_endoscopy_anticoagulant === 'yes') {
        upperLines.push(`抗血栓剤：あり（${formData.upper_endoscopy_anticoagulant_name || '薬剤名未記入'}）`);
      } else {
        upperLines.push('抗血栓剤：なし');
      }

      endoscopyParts.push(upperLines.join('\n'));
    }

    // 大腸内視鏡検査
    if (formData.lower_endoscopy) {
      endoscopyParts.push('大腸内視鏡検査');
    }

    if (endoscopyParts.length > 0) {
      endoscopyText = endoscopyParts.join('\n');
    }

    // 放射線検査テキスト（統合形式）
    let radiologyText = 'なし';
    if (formData.radiology_exam) {
      const radiologyLines = [];

      // 1行目: 検査種類と部位
      const examType = formData.radiology_type === 'mri' ? 'MRI（1.5テスラ）' : 'CT';
      const site = formData.radiology_site || '部位未記入';
      radiologyLines.push(`${examType}　部位（${site}）`);

      // 2行目: 造影剤
      if (formData.radiology_contrast === 'yes') {
        const cr = formData.radiology_cr || '未記入';
        const examDate = formData.radiology_exam_date ? formatHopeDate(formData.radiology_exam_date) : '未記入';
        radiologyLines.push(`造影剤：あり（Cr ${cr} mg/dl、検査日 ${examDate}）`);
      } else {
        radiologyLines.push('造影剤：なし');
      }

      // 3行目: 糖尿病薬服用
      if (formData.radiology_diabetes_med === 'yes') {
        const medName = formData.radiology_diabetes_med_name || '薬剤名未記入';
        radiologyLines.push(`糖尿病薬服用：あり（${medName}）`);
      } else {
        radiologyLines.push('糖尿病薬服用：なし');
      }

      // 4行目: 結果と所見
      const media = formData.radiology_media === 'film' ? 'フィルム' : 'CD-R';
      const delivery = formData.radiology_result_delivery === 'mail' ? '郵送' : '患者様持ち帰り';
      radiologyLines.push(`結果：${media}　所見：${delivery}`);

      radiologyText = radiologyLines.join('\n');
    }

    // 超音波検査テキスト（統合形式）
    let ultrasoundText = 'なし';
    if (formData.ultrasound_types.length > 0) {
      const ultrasoundLines = [];

      // 1行目: 検査種類（カンマ区切り）
      const types = formData.ultrasound_types.map(t => `${t}エコー`).join('、');
      ultrasoundLines.push(types);

      // 2行目: 所見の伝達
      const delivery = formData.ultrasound_result_delivery === 'mail' ? '郵送' : '患者様持ち帰り';
      ultrasoundLines.push(`所見：${delivery}`);

      ultrasoundText = ultrasoundLines.join('\n');
    }

    // コロナ対策テキスト
    const covidTravelText = formData.covid_travel === 'yes' ? 'あり' : 'なし';
    const covidContactText = formData.covid_contact === 'yes' ? 'あり' : 'なし';
    const covidSymptomsText = formData.covid_symptoms === 'yes' ? 'あり' : 'なし';

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `診療申込書_高松平和病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'heiwa-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        // 患者情報
        '{{作成日}}': formData.creation_date_wareki,
        '{{ふりがな}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{郵便番号}}': formData.postal_code,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,

        // 紹介元
        '{{医師名}}': formData.physician_name,

        // 診察目的
        '{{診察・検査目的}}': purposeText,
        '{{主訴または傷病名}}': diagnosisText,

        // 希望日
        '{{第1希望日}}': formatHopeDate(formData.hope_date_1),
        '{{第2希望日}}': formatHopeDate(formData.hope_date_2),
        '{{第3希望日}}': formatHopeDate(formData.hope_date_3),

        // 内視鏡検査
        '{{内視鏡検査}}': endoscopyText,

        // 放射線検査
        '{{放射線検査}}': radiologyText,

        // 超音波検査
        '{{超音波検査}}': ultrasoundText,

        // コロナ対策
        '{{訪問歴の有無}}': covidTravelText,
        '{{接触歴の有無}}': covidContactText,
        '{{症状の有無}}': covidSymptomsText,

        // その他
        '{{その他}}': formData.other_notes
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
      id: 'heiwa-referral-form',
      name: '診療申込書（高松平和病院）',
      icon: '🏥',
      description: '高松平和病院への診療申込書を作成',
      version: VERSION,
      order: 213,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showHeiwaForm
    }
  });
})();
