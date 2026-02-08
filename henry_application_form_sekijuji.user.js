// ==UserScript==
// @name         高松赤十字病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.6.1
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
 * - henry_form_commons.user.js: 共通モジュール
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

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1z4lABWynRs4E-uibUGmhrlHTiWVb3eVEm_IVUyEDeKQ',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 高松赤十字病院固定
  const HOSPITAL_NAME = '高松赤十字病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'sekijuji';
  const DRAFT_LS_PREFIX = 'henry_sekijuji_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 高松赤十字病院固有ユーティリティ
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
   * 希望日のフォーマット: "令和○年○月○日（曜日）"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const wareki = FC().utils.toWareki(year, month, day);
    return `${wareki}（${weekdays[d.getDay()]}）`;
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
    const googleAuth = FC().getGoogleAuth();
    if (!googleAuth) {
      alert('Google認証が設定されていません。\nHenry Toolboxの設定からGoogle認証を行ってください。');
      return;
    }

    // スピナー表示
    const spinner = HenryCore.ui?.showSpinner?.('データを取得中...');

    try {
      const { data, utils } = FC();

      // データ取得（並列実行）
      // 患者情報はtoBirthDateWareki（元号略記）を使うため、共通モジュールの
      // fetchPatientInfoではなく直接取得して独自フォーマットを適用する
      const [patientResult, physicianName, diseases, prescriptions] = await Promise.all([
        HenryCore.query(FC().QUERIES.GetPatient, { input: { uuid: patientUuid } }),
        data.fetchPhysicianName(SCRIPT_NAME),
        data.fetchDiseases(patientUuid, SCRIPT_NAME),
        data.fetchLatestPrescriptions(patientUuid, SCRIPT_NAME)
      ]);

      spinner?.close();

      const p = patientResult?.data?.getPatient;
      if (!p) {
        alert('患者情報を取得できませんでした');
        return;
      }

      const birthDate = p.detail?.birthDate;
      const patientInfo = {
        patient_uuid: patientUuid,
        patient_name: (p.fullName || '').replace(/\u3000/g, ' '),
        patient_name_kana: utils.katakanaToHiragana(p.fullNamePhonetic || ''),
        birth_date_wareki: birthDate?.year ? toBirthDateWareki(birthDate.year, birthDate.month, birthDate.day) : '',
        sex: utils.formatSex(p.detail?.sexType),
        postal_code: p.detail?.postalCode || '',
        address: p.detail?.addressLine_1 || '',
        phone: p.detail?.phoneNumber || ''
      };

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
      formData.phone = utils.formatPhoneNumber(patientInfo.phone);
      formData.physician_name = physicianName;
      formData.creation_date_wareki = utils.getTodayWareki();
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

  function buildFormBody(formData) {
    const departments = getSekijujiDepartments();
    const escapeHtml = FC().utils.escapeHtml;

    return `
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
    `;
  }

  function clearFormFields(bodyEl) {
    // テキスト入力をリセット
    bodyEl.querySelector('#srf-maiden-name').value = '';
    bodyEl.querySelector('#srf-facility-name').value = '';
    bodyEl.querySelector('#srf-visit-history-id').value = '';

    // select・コンボボックスをリセット
    bodyEl.querySelector('#srf-dest-department').value = '';
    bodyEl.querySelector('#srf-dest-doctor').value = '';
    bodyEl.querySelector('#srf-dest-doctor').disabled = true;
    bodyEl.querySelector('.srf-combobox-toggle').disabled = true;

    // 日付入力をリセット
    bodyEl.querySelector('#srf-hope-date-1').value = '';
    bodyEl.querySelector('#srf-hope-date-2').value = '';

    // ラジオボタンをリセット
    const unknownRadio = bodyEl.querySelector('#srf-visit-unknown');
    if (unknownRadio) unknownRadio.checked = true;
    bodyEl.querySelector('#srf-visit-id-field')?.classList.remove('visible');
    const noneRadio = bodyEl.querySelector('#srf-status-none');
    if (noneRadio) noneRadio.checked = true;
    bodyEl.querySelector('#srf-facility-field')?.classList.remove('visible');

    // テキストエリアをリセット
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // チェックボックスをリセット
    bodyEl.querySelectorAll('.srf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  }

  function setupFormEvents(bodyEl) {
    const escapeHtml = FC().utils.escapeHtml;

    // 外来担当医師表ボタン
    bodyEl.querySelector('#srf-open-schedule')?.addEventListener('click', () => {
      window.open('https://www.takamatsu.jrc.or.jp/outpatient/doctor/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = bodyEl.querySelector('#srf-dest-department');
    const doctorInput = bodyEl.querySelector('#srf-dest-doctor');
    const doctorDropdown = bodyEl.querySelector('#srf-doctor-dropdown');
    const doctorCombobox = bodyEl.querySelector('.srf-combobox[data-field="doctor"]');

    function closeAllDropdowns() {
      bodyEl.querySelectorAll('.srf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="srf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="srf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

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

    // bodyEl内クリックでドロップダウンを閉じる
    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest('.srf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 受診歴ラジオボタン変更時
    const visitHistoryRadios = bodyEl.querySelectorAll('input[name="srf-visit-history"]');
    const visitIdField = bodyEl.querySelector('#srf-visit-id-field');
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
    const currentStatusRadios = bodyEl.querySelectorAll('input[name="srf-current-status"]');
    const facilityField = bodyEl.querySelector('#srf-facility-field');
    currentStatusRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'facility') {
          facilityField.classList.add('visible');
        } else {
          facilityField.classList.remove('visible');
        }
      });
    });

    // 処方選択トグル
    const usePrescriptionsToggle = bodyEl.querySelector('#srf-use-prescriptions');
    if (usePrescriptionsToggle) {
      usePrescriptionsToggle.addEventListener('change', () => {
        const prescriptionsList = bodyEl.querySelector('#srf-prescriptions-list');
        const prescriptionManual = bodyEl.querySelector('#srf-prescription-manual');
        if (usePrescriptionsToggle.checked) {
          if (prescriptionsList) prescriptionsList.style.display = '';
          if (prescriptionManual) prescriptionManual.style.display = 'none';
        } else {
          if (prescriptionsList) prescriptionsList.style.display = 'none';
          if (prescriptionManual) prescriptionManual.style.display = '';
        }
      });
    }
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      .srf-radio-group.vertical {
        flex-direction: column;
        gap: 8px;
      }
      .srf-conditional-field {
        margin-top: 8px;
        padding: 12px;
        background: #fafafa;
        border-radius: 6px;
        display: none;
      }
      .srf-conditional-field.visible { display: block; }
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
    `;

    FC().showFormModal({
      id: 'srf-form-modal',
      title: '高松赤十字病院 診療申込書',
      prefix: 'srf',
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
    data.maiden_name = bodyEl.querySelector('#srf-maiden-name')?.value || '';
    data.mobile_phone = bodyEl.querySelector('#srf-mobile-phone')?.value || '';

    // 高松赤十字病院固有
    data.destination_department = bodyEl.querySelector('#srf-dest-department')?.value || '';
    data.destination_doctor = bodyEl.querySelector('#srf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_1 = bodyEl.querySelector('#srf-hope-date-1')?.value || '';
    data.hope_date_2 = bodyEl.querySelector('#srf-hope-date-2')?.value || '';

    // 受診歴
    data.visit_history = bodyEl.querySelector('input[name="srf-visit-history"]:checked')?.value || 'unknown';
    data.visit_history_id = bodyEl.querySelector('#srf-visit-history-id')?.value || '';

    // 現在の状況
    data.current_status = bodyEl.querySelector('input[name="srf-current-status"]:checked')?.value || 'none';
    data.facility_name = bodyEl.querySelector('#srf-facility-name')?.value || '';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#srf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector('#srf-diagnosis-text')?.value || '';

    // 詳細記入欄
    data.treatment_history = bodyEl.querySelector('#srf-treatment-history')?.value || '';
    data.past_history_allergy = bodyEl.querySelector('#srf-past-history-allergy')?.value || '';
    data.remarks = bodyEl.querySelector('#srf-remarks')?.value || '';

    // 処方
    data.use_prescriptions = bodyEl.querySelector('#srf-use-prescriptions')?.checked ?? false;
    if (data.use_prescriptions && data.prescriptions?.length > 0) {
      data.selected_prescriptions = [];
      data.prescriptions.forEach(rx => {
        const cb = bodyEl.querySelector(`#srf-prescription-${rx.recordId}`);
        if (cb?.checked) {
          data.selected_prescriptions.push(rx.recordId);
        }
      });
      data.prescription_text = bodyEl.querySelector('#srf-prescription-text')?.value || '';
    } else {
      data.selected_prescriptions = [];
      data.prescription_text = bodyEl.querySelector('#srf-prescription-text')?.value || '';
    }

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

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `診療申込書_高松赤十字病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'sekijuji-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{ふりがな}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{旧姓}}': formData.maiden_name,
        '{{郵便番号}}': formData.postal_code,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{携帯電話}}': formData.mobile_phone,
        '{{医師名}}': formData.physician_name,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{第1希望日}}': hopeDate1Text,
        '{{第2希望日}}': hopeDate2Text,
        '{{受診歴}}': visitHistoryText,
        '{{当院受診状況}}': currentStatusText,
        '{{傷病名}}': diagnosisText,
        '{{治療経過}}': formData.treatment_history,
        '{{既往歴・アレルギー}}': formData.past_history_allergy,
        '{{現在の処方}}': prescriptionText,
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
      id: 'sekijuji-referral-form',
      name: '診療申込書（高松赤十字病院）',
      icon: '🏥',
      description: '高松赤十字病院への診療申込書を作成',
      version: VERSION,
      order: 211,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showSekijujiForm
    }
  });
})();
