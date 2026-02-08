// ==UserScript==
// @name         KKR高松病院 FAX診療/検査申込書
// @namespace    https://henry-app.jp/
// @version      1.3.0
// @description  KKR高松病院へのFAX診療/検査申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_kkr.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_kkr.user.js
// ==/UserScript==

/*
 * 【KKR高松病院 FAX診療/検査申込書フォーム】
 *
 * ■ 使用場面
 * - KKR高松病院へのFAX診療/検査申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. KKR高松病院固有の入力項目
 *    - 受診希望科
 *    - 希望医師名
 *    - 医師への連絡（済・未）
 *    - 第1希望日、第2希望日（日付+曜日）
 *    - その他希望日（いつでもよい等）
 *    - 当院受診歴（有/無/不明）
 *    - 紹介状チェック、コメント、精査・精査加療
 *    - 新型コロナ問診
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: KKR高松病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'KKRReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1pLzJFQ2-HBBAk1GhNQyLTf5btw5ac8k0q_tM2X3pm8Q',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // KKR高松病院固定
  const HOSPITAL_NAME = 'KKR高松病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'kkr';
  const DRAFT_LS_PREFIX = 'henry_kkr_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // KKR高松病院固有ユーティリティ
  // ==========================================

  /**
   * 希望日のフォーマット: "○月○日（曜）"
   */
  function formatHopeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getKKRDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getKKRDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showKKRForm() {
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
        phone: utils.formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        creation_date_wareki: utils.getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // KKR高松病院固有
        destination_department: '',
        destination_doctor: '',
        doctor_contact: 'no', // 医師への連絡（済・未）
        hope_date_1: '',
        hope_date_2: '',
        hope_date_other: '',
        visit_history: 'unknown',

        // 紹介状・コメント
        comment: '',
        referral_type: '', // 別紙紹介状 or 前日FAX
        consultation_type: '', // 精査・精査加療

        // 新型コロナ問診
        covid_contact: 'no',
        covid_contact_date: '',
        covid_fever: 'no',
        covid_fever_temp: '',
        covid_symptoms: 'no',
        covid_history: 'no',
        covid_history_date: '',
        covid_history_outcome: ''
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

      // モーダル表示
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function showFormModal(formData, lastSavedAt) {
    // 既存モーダルを削除
    const existingModal = document.getElementById('krf-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getKKRDepartments();
    const { utils } = FC();
    const escapeHtml = utils.escapeHtml;

    const modal = document.createElement('div');
    modal.id = 'krf-form-modal';
    modal.innerHTML = `
      <style>
        ${FC().generateBaseCSS('krf')}
        /* KKR固有: 新型コロナ問診セクション */
        .krf-covid-section {
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: 8px;
          padding: 16px;
        }
        .krf-covid-section .krf-section-title {
          color: #f57c00;
          border-bottom-color: #ffe082;
        }
        .krf-covid-row {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #fffde7;
          border-radius: 6px;
        }
        .krf-covid-row label.title {
          min-width: 140px;
          font-weight: 500;
          color: #333;
        }
        .krf-covid-row input[type="text"],
        .krf-covid-row input[type="date"] {
          width: 150px;
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .krf-inline-check {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        .krf-inline-check input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        .krf-inline-check label {
          font-size: 14px;
          color: #333;
          margin: 0;
        }
      </style>
      <div class="krf-container">
        <div class="krf-header">
          <h2>KKR高松病院 FAX診療/検査申込書</h2>
          <button class="krf-close" title="閉じる">&times;</button>
        </div>
        <div class="krf-body">
          <!-- KKR高松病院 受診希望 -->
          <div class="krf-section">
            <div class="krf-section-title">KKR高松病院 受診希望</div>
            <div class="krf-row">
              <div class="krf-field">
                <label>受診希望科</label>
                <select id="krf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="krf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="krf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="krf-combobox-input" id="krf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="krf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="krf-combobox-dropdown" id="krf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="krf-btn krf-btn-link" id="krf-open-schedule" title="外来診療担当医表を見る">外来表</button>
                </div>
              </div>
            </div>
            <div class="krf-row">
              <div class="krf-field">
                <label>医師への連絡</label>
                <div class="krf-radio-group">
                  <div class="krf-radio-item">
                    <input type="radio" name="krf-doctor-contact" id="krf-doctor-contact-yes" value="yes" ${formData.doctor_contact === 'yes' ? 'checked' : ''}>
                    <label for="krf-doctor-contact-yes">済</label>
                  </div>
                  <div class="krf-radio-item">
                    <input type="radio" name="krf-doctor-contact" id="krf-doctor-contact-no" value="no" ${formData.doctor_contact === 'no' ? 'checked' : ''}>
                    <label for="krf-doctor-contact-no">未</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="krf-section">
            <div class="krf-section-title">受診希望日</div>
            <div class="krf-row">
              <div class="krf-field">
                <label>第1希望日</label>
                <input type="date" id="krf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
              </div>
              <div class="krf-field">
                <label>第2希望日</label>
                <input type="date" id="krf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
              </div>
            </div>
            <div class="krf-row">
              <div class="krf-field">
                <label>その他希望日</label>
                <textarea id="krf-hope-date-other" rows="2" placeholder="いつでもよい、など">${escapeHtml(formData.hope_date_other)}</textarea>
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="krf-section">
            <div class="krf-section-title">KKR高松病院 受診歴</div>
            <div class="krf-radio-group">
              <div class="krf-radio-item">
                <input type="radio" name="krf-visit-history" id="krf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="krf-visit-yes">有</label>
              </div>
              <div class="krf-radio-item">
                <input type="radio" name="krf-visit-history" id="krf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="krf-visit-no">無</label>
              </div>
              <div class="krf-radio-item">
                <input type="radio" name="krf-visit-history" id="krf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="krf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 傷病名及び紹介目的 -->
          <div class="krf-section">
            <div class="krf-section-title">傷病名及び紹介目的</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="krf-diseases-list" class="krf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="krf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="krf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="krf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="krf-field">
              <label>自由記述（傷病名及び紹介目的）</label>
              <textarea id="krf-diagnosis-text" placeholder="傷病名や紹介目的を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
            <div class="krf-row" style="margin-top: 12px;">
              <div class="krf-field">
                <label>コメント</label>
                <textarea id="krf-comment" rows="2" placeholder="コメントがあれば入力">${escapeHtml(formData.comment)}</textarea>
              </div>
            </div>
            <div class="krf-row">
              <div class="krf-field">
                <label>精査・精査加療</label>
                <div class="krf-radio-group">
                  <div class="krf-radio-item">
                    <input type="radio" name="krf-consultation-type" id="krf-consult-seisa" value="精査" ${formData.consultation_type === '精査' ? 'checked' : ''}>
                    <label for="krf-consult-seisa">精査</label>
                  </div>
                  <div class="krf-radio-item">
                    <input type="radio" name="krf-consultation-type" id="krf-consult-karyou" value="精査加療" ${formData.consultation_type === '精査加療' ? 'checked' : ''}>
                    <label for="krf-consult-karyou">精査加療</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="krf-row">
              <div class="krf-field">
                <label>紹介状について</label>
                <div class="krf-radio-group">
                  <div class="krf-radio-item">
                    <input type="radio" name="krf-referral-type" id="krf-referral-letter" value="別紙紹介状を確認ください。" ${formData.referral_type === '別紙紹介状を確認ください。' ? 'checked' : ''}>
                    <label for="krf-referral-letter">別紙紹介状を確認ください。</label>
                  </div>
                  <div class="krf-radio-item">
                    <input type="radio" name="krf-referral-type" id="krf-referral-fax" value="受診日前日までFAXします。" ${formData.referral_type === '受診日前日までFAXします。' ? 'checked' : ''}>
                    <label for="krf-referral-fax">受診日前日までFAXします。</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 新型コロナ問診 -->
          <div class="krf-section krf-covid-section">
            <div class="krf-section-title">新型コロナウイルス感染症に関する問診</div>
            <div class="krf-covid-row">
              <label class="title">コロナ患者との接触歴</label>
              <div class="krf-radio-group">
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-contact" id="krf-covid-contact-yes" value="yes" ${formData.covid_contact === 'yes' ? 'checked' : ''}>
                  <label for="krf-covid-contact-yes">あり</label>
                </div>
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-contact" id="krf-covid-contact-no" value="no" ${formData.covid_contact === 'no' ? 'checked' : ''}>
                  <label for="krf-covid-contact-no">なし</label>
                </div>
              </div>
              <input type="date" id="krf-covid-contact-date" value="${escapeHtml(formData.covid_contact_date)}" placeholder="接触日" ${formData.covid_contact !== 'yes' ? 'disabled' : ''}>
            </div>
            <div class="krf-covid-row">
              <label class="title">発熱</label>
              <div class="krf-radio-group">
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-fever" id="krf-covid-fever-yes" value="yes" ${formData.covid_fever === 'yes' ? 'checked' : ''}>
                  <label for="krf-covid-fever-yes">あり</label>
                </div>
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-fever" id="krf-covid-fever-no" value="no" ${formData.covid_fever === 'no' ? 'checked' : ''}>
                  <label for="krf-covid-fever-no">なし</label>
                </div>
              </div>
              <input type="text" id="krf-covid-fever-temp" value="${escapeHtml(formData.covid_fever_temp)}" placeholder="体温（℃）" ${formData.covid_fever !== 'yes' ? 'disabled' : ''}>
            </div>
            <div class="krf-covid-row">
              <label class="title">咳・咽頭痛・鼻水</label>
              <div class="krf-radio-group">
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-symptoms" id="krf-covid-symptoms-yes" value="yes" ${formData.covid_symptoms === 'yes' ? 'checked' : ''}>
                  <label for="krf-covid-symptoms-yes">あり</label>
                </div>
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-symptoms" id="krf-covid-symptoms-no" value="no" ${formData.covid_symptoms === 'no' ? 'checked' : ''}>
                  <label for="krf-covid-symptoms-no">なし</label>
                </div>
              </div>
            </div>
            <div class="krf-covid-row">
              <label class="title">コロナ罹患歴</label>
              <div class="krf-radio-group">
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-history" id="krf-covid-history-yes" value="yes" ${formData.covid_history === 'yes' ? 'checked' : ''}>
                  <label for="krf-covid-history-yes">あり</label>
                </div>
                <div class="krf-radio-item">
                  <input type="radio" name="krf-covid-history" id="krf-covid-history-no" value="no" ${formData.covid_history === 'no' ? 'checked' : ''}>
                  <label for="krf-covid-history-no">なし</label>
                </div>
              </div>
              <span style="font-size: 13px; color: #666;">時期:</span>
              <input type="date" id="krf-covid-history-date" value="${escapeHtml(formData.covid_history_date)}" ${formData.covid_history !== 'yes' ? 'disabled' : ''}>
              <span style="font-size: 13px; color: #666;">転帰:</span>
              <input type="text" id="krf-covid-history-outcome" value="${escapeHtml(formData.covid_history_outcome)}" placeholder="治癒など" style="width: 100px;" ${formData.covid_history !== 'yes' ? 'disabled' : ''}>
            </div>
          </div>
        </div>
        <div class="krf-footer">
          <div class="krf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="krf-footer-right">
            <button class="krf-btn krf-btn-secondary" id="krf-clear" style="color:#d32f2f;">クリア</button>
            <button class="krf-btn krf-btn-secondary" id="krf-save-draft">下書き保存</button>
            <button class="krf-btn krf-btn-primary" id="krf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントリスナー
    // 変更追跡フラグ
    let isDirty = false;
    const formBody = modal.querySelector('.krf-body');
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

    modal.querySelector('.krf-close').addEventListener('click', () => confirmClose());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) confirmClose();
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#krf-dest-department');
    const doctorInput = modal.querySelector('#krf-dest-doctor');
    const doctorDropdown = modal.querySelector('#krf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.krf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.krf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="krf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="krf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getKKRDoctors(deptName);
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
      doctorCombobox.querySelector('.krf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.krf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.krf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.krf-combobox')) {
        closeAllDropdowns();
      }
    });

    // コロナ問診の連動
    modal.querySelectorAll('input[name="krf-covid-contact"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const dateInput = modal.querySelector('#krf-covid-contact-date');
        dateInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (dateInput.disabled) dateInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="krf-covid-fever"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const tempInput = modal.querySelector('#krf-covid-fever-temp');
        tempInput.disabled = radio.value !== 'yes' || !radio.checked;
        if (tempInput.disabled) tempInput.value = '';
      });
    });

    modal.querySelectorAll('input[name="krf-covid-history"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isYes = radio.value === 'yes' && radio.checked;
        const dateInput = modal.querySelector('#krf-covid-history-date');
        const outcomeInput = modal.querySelector('#krf-covid-history-outcome');
        dateInput.disabled = !isYes;
        outcomeInput.disabled = !isYes;
        if (!isYes) {
          dateInput.value = '';
          outcomeInput.value = '';
        }
      });
    });

    // 外来診療担当医表ボタン
    modal.querySelector('#krf-open-schedule').addEventListener('click', () => {
      window.open('https://takamatsu.kkr.or.jp/general/doctor/index.html', '_blank');
    });

    // 下書き保存
    // クリアボタン
    modal.querySelector('#krf-clear').addEventListener('click', async () => {
      const confirmed = await pageWindow.HenryCore?.ui?.showConfirm?.({
        title: '入力内容のクリア',
        message: '手入力した内容をすべてクリアしますか？\n（患者情報などの自動入力項目はクリアされません）',
        confirmLabel: 'クリア',
        cancelLabel: 'キャンセル'
      });
      if (!confirmed) return;

      // テキスト入力をリセット
      ['#krf-dest-doctor', '#krf-hope-date-other', '#krf-comment',
       '#krf-covid-contact-date', '#krf-covid-fever-temp',
       '#krf-covid-history-date', '#krf-covid-history-outcome'].forEach(sel => {
        const el = modal.querySelector(sel);
        if (el) el.value = '';
      });

      // selectをリセット
      modal.querySelector('#krf-dest-department').value = '';
      modal.querySelector('#krf-dest-doctor').disabled = true;
      modal.querySelector('.krf-combobox-toggle').disabled = true;

      // 日付入力をリセット
      ['#krf-hope-date-1', '#krf-hope-date-2'].forEach(sel => {
        const el = modal.querySelector(sel);
        if (el) el.value = '';
      });

      // テキストエリアをリセット
      modal.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

      // チェックボックスをリセット
      modal.querySelectorAll('.krf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });

      isDirty = false;
    });

    modal.querySelector('#krf-save-draft').addEventListener('click', async () => {
      const data = collectFormData(modal, formData);
      const ds = pageWindow.HenryCore?.modules?.DraftStorage;
      if (ds) {
        const payload = { schemaVersion: DRAFT_SCHEMA_VERSION, data };
        const saved = await ds.save(DRAFT_TYPE, formData.patient_uuid, payload, data.patient_name || '');
        if (saved) {
          isDirty = false;
          modal.querySelector('.krf-footer-left').textContent = `下書き: ${new Date().toLocaleString('ja-JP')}`;
          pageWindow.HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
        }
      }
    });

    // Google Docs出力
    modal.querySelector('#krf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#krf-generate');
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

    // KKR高松病院固有
    data.destination_department = modal.querySelector('#krf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#krf-dest-doctor')?.value || '';
    data.doctor_contact = modal.querySelector('input[name="krf-doctor-contact"]:checked')?.value || 'no';

    // 希望日
    data.hope_date_1 = modal.querySelector('#krf-hope-date-1')?.value || '';
    data.hope_date_2 = modal.querySelector('#krf-hope-date-2')?.value || '';
    data.hope_date_other = modal.querySelector('#krf-hope-date-other')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="krf-visit-history"]:checked')?.value || 'unknown';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#krf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#krf-diagnosis-text')?.value || '';

    // コメント・紹介状・精査加療
    data.comment = modal.querySelector('#krf-comment')?.value || '';
    data.referral_type = modal.querySelector('input[name="krf-referral-type"]:checked')?.value || '';
    data.consultation_type = modal.querySelector('input[name="krf-consultation-type"]:checked')?.value || '';

    // コロナ問診
    data.covid_contact = modal.querySelector('input[name="krf-covid-contact"]:checked')?.value || 'no';
    data.covid_contact_date = modal.querySelector('#krf-covid-contact-date')?.value || '';
    data.covid_fever = modal.querySelector('input[name="krf-covid-fever"]:checked')?.value || 'no';
    data.covid_fever_temp = modal.querySelector('#krf-covid-fever-temp')?.value || '';
    data.covid_symptoms = modal.querySelector('input[name="krf-covid-symptoms"]:checked')?.value || 'no';
    data.covid_history = modal.querySelector('input[name="krf-covid-history"]:checked')?.value || 'no';
    data.covid_history_date = modal.querySelector('#krf-covid-history-date')?.value || '';
    data.covid_history_outcome = modal.querySelector('#krf-covid-history-outcome')?.value || '';

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // 傷病名/目的テキスト作成（病名選択 + 自由記述）
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

    // 医師への連絡テキスト
    const doctorContactText = formData.doctor_contact === 'yes' ? '済' : '未';

    // 希望日フォーマット
    const hopeDate1Text = formatHopeDate(formData.hope_date_1);
    const hopeDate2Text = formatHopeDate(formData.hope_date_2);

    // 紹介状テキスト
    const referralLetterText = formData.referral_type || '';

    // コロナ問診テキスト作成
    let covidContactText = formData.covid_contact === 'yes' ? 'あり' : 'なし';
    if (formData.covid_contact === 'yes' && formData.covid_contact_date) {
      const d = new Date(formData.covid_contact_date);
      covidContactText = `${d.getMonth() + 1}月${d.getDate()}日頃`;
    }

    let covidFeverText = formData.covid_fever === 'yes' ? 'あり' : 'なし';
    if (formData.covid_fever === 'yes' && formData.covid_fever_temp) {
      covidFeverText = `現在の体温；${formData.covid_fever_temp}℃`;
    }

    const covidSymptomsText = formData.covid_symptoms === 'yes' ? 'あり' : 'なし';

    let covidHistoryText = 'なし';
    if (formData.covid_history === 'yes') {
      const parts = [];
      if (formData.covid_history_date) {
        const d = new Date(formData.covid_history_date);
        parts.push(`時期：${d.getMonth() + 1}月${d.getDate()}日頃`);
      }
      if (formData.covid_history_outcome) {
        parts.push(`転帰：${formData.covid_history_outcome}`);
      }
      covidHistoryText = parts.length > 0 ? `（${parts.join('　')}）` : 'あり';
    }

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `FAX診療検査申込書_KKR高松病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'kkr-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{医師名}}': formData.physician_name,
        '{{フリガナ}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{年齢}}': formData.age,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{医師連絡}}': doctorContactText,
        '{{第1希望日}}': hopeDate1Text,
        '{{第2希望日}}': hopeDate2Text,
        '{{その他希望日}}': formData.hope_date_other,
        '{{受診歴}}': visitHistoryText,
        '{{傷病名/目的}}': diagnosisText,
        '{{コメント}}': formData.comment,
        '{{紹介状}}': referralLetterText,
        '{{精査・精査加療}}': formData.consultation_type,
        '{{接触歴}}': covidContactText,
        '{{発熱}}': covidFeverText,
        '{{咳・咽頭痛・鼻水}}': covidSymptomsText,
        '{{コロナ罹患歴}}': covidHistoryText
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
      id: 'kkr-referral-form',
      name: '診療申込書（KKR高松病院）',
      icon: '🏥',
      description: 'KKR高松病院へのFAX診療/検査申込書を作成',
      version: VERSION,
      order: 215,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showKKRForm
    }
  });
})();
