// ==UserScript==
// @name         りつりん病院 診療申込書
// @namespace    https://henry-app.jp/
// @version      1.3.0
// @description  りつりん病院への診療FAX予約申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_ritsurin.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_ritsurin.user.js
// ==/UserScript==

/*
 * 【りつりん病院 診療申込書フォーム】
 *
 * ■ 使用場面
 * - りつりん病院への診療FAX予約申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. りつりん病院固有の入力項目
 *    - 受診希望科（りつりん病院の診療科）
 *    - 希望医師名（診療科連動）
 *    - 第1希望日、第2希望日（カレンダー + 午前/午後）
 *    - その他希望日（テキスト）
 *    - 受診歴（有/無/不明）
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: りつりん病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'RitsurinReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1JLvOvoNcuY8gStHFnnwm-iIi9u_cH0jr9pljyNJNptg',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // りつりん病院固定
  const HOSPITAL_NAME = 'りつりん病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'ritsurin';
  const DRAFT_LS_PREFIX = 'henry_ritsurin_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // りつりん病院固有ユーティリティ
  // ==========================================

  /**
   * 希望日のフォーマット: "○月○日 曜曜日（午前/午後）"
   */
  function formatHopeDate(dateStr, period) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const periodText = period === 'am' ? '午前' : period === 'pm' ? '午後' : '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}曜日${periodText ? `（${periodText}）` : ''}`;
  }

  // ==========================================
  // 病院データ連携（HenryHospitals）
  // ==========================================

  function getHospitalsAPI() {
    return pageWindow.HenryHospitals || null;
  }

  function getRitsurinDepartments() {
    const api = getHospitalsAPI();
    if (!api) return [];
    return api.getDepartments(HOSPITAL_NAME);
  }

  function getRitsurinDoctors(departmentName) {
    const api = getHospitalsAPI();
    if (!api || !departmentName) return [];
    return api.getDoctors(HOSPITAL_NAME, departmentName);
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showRitsurinForm() {
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

        // りつりん病院固有
        destination_department: '',
        destination_doctor: '',
        hope_date_1: '',
        hope_date_1_period: '',
        hope_date_2: '',
        hope_date_2_period: '',
        hope_date_other: '',
        visit_history: 'unknown'
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
    const existingModal = document.getElementById('rrf-form-modal');
    if (existingModal) existingModal.remove();

    const departments = getRitsurinDepartments();
    const { utils } = FC();
    const escapeHtml = utils.escapeHtml;

    const modal = document.createElement('div');
    modal.id = 'rrf-form-modal';
    modal.innerHTML = `
      <style>
        ${FC().generateBaseCSS('rrf')}
      </style>
      <div class="rrf-container">
        <div class="rrf-header">
          <h2>りつりん病院 診療申込書</h2>
          <button class="rrf-close" title="閉じる">&times;</button>
        </div>
        <div class="rrf-body">
          <!-- りつりん病院 受診希望 -->
          <div class="rrf-section">
            <div class="rrf-section-title">りつりん病院 受診希望</div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>受診希望科</label>
                <select id="rrf-dest-department">
                  <option value="">選択してください</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${formData.destination_department === dept ? 'selected' : ''}>
                      ${escapeHtml(dept)}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="rrf-field">
                <label>希望医師名</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                  <div class="rrf-combobox" data-field="doctor" style="flex: 1;">
                    <input type="text" class="rrf-combobox-input" id="rrf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力" ${!formData.destination_department ? 'disabled' : ''}>
                    <button type="button" class="rrf-combobox-toggle" ${!formData.destination_department ? 'disabled' : ''} title="リストから選択">▼</button>
                    <div class="rrf-combobox-dropdown" id="rrf-doctor-dropdown"></div>
                  </div>
                  <button type="button" class="rrf-btn rrf-btn-link" id="rrf-open-schedule" title="外来診療担当表を見る">外来表</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 受診希望日 -->
          <div class="rrf-section">
            <div class="rrf-section-title">受診希望日</div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>第1希望日</label>
                <div class="rrf-date-row">
                  <input type="date" id="rrf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
                  <div class="rrf-period-group">
                    <label>
                      <input type="radio" name="rrf-hope-date-1-period" value="am" ${formData.hope_date_1_period === 'am' ? 'checked' : ''}>
                      午前
                    </label>
                    <label>
                      <input type="radio" name="rrf-hope-date-1-period" value="pm" ${formData.hope_date_1_period === 'pm' ? 'checked' : ''}>
                      午後
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>第2希望日</label>
                <div class="rrf-date-row">
                  <input type="date" id="rrf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
                  <div class="rrf-period-group">
                    <label>
                      <input type="radio" name="rrf-hope-date-2-period" value="am" ${formData.hope_date_2_period === 'am' ? 'checked' : ''}>
                      午前
                    </label>
                    <label>
                      <input type="radio" name="rrf-hope-date-2-period" value="pm" ${formData.hope_date_2_period === 'pm' ? 'checked' : ''}>
                      午後
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="rrf-row">
              <div class="rrf-field">
                <label>その他希望日</label>
                <textarea id="rrf-hope-date-other" rows="2" placeholder="その他の希望日があれば入力">${escapeHtml(formData.hope_date_other)}</textarea>
              </div>
            </div>
          </div>

          <!-- 当院受診歴 -->
          <div class="rrf-section">
            <div class="rrf-section-title">りつりん病院 受診歴</div>
            <div class="rrf-radio-group">
              <div class="rrf-radio-item">
                <input type="radio" name="rrf-visit-history" id="rrf-visit-yes" value="yes" ${formData.visit_history === 'yes' ? 'checked' : ''}>
                <label for="rrf-visit-yes">有</label>
              </div>
              <div class="rrf-radio-item">
                <input type="radio" name="rrf-visit-history" id="rrf-visit-no" value="no" ${formData.visit_history === 'no' ? 'checked' : ''}>
                <label for="rrf-visit-no">無</label>
              </div>
              <div class="rrf-radio-item">
                <input type="radio" name="rrf-visit-history" id="rrf-visit-unknown" value="unknown" ${formData.visit_history === 'unknown' ? 'checked' : ''}>
                <label for="rrf-visit-unknown">不明</label>
              </div>
            </div>
          </div>

          <!-- 診療依頼目的・病名 -->
          <div class="rrf-section">
            <div class="rrf-section-title">診療依頼目的・病名</div>
            ${formData.diseases.length > 0 ? `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
                <div id="rrf-diseases-list" class="rrf-checkbox-group">
                  ${formData.diseases.map(d => `
                    <div class="rrf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                      <input type="checkbox" id="rrf-disease-${d.uuid}" value="${d.uuid}"
                        ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                      <label for="rrf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="rrf-field">
              <label>自由記述（診療依頼目的など）</label>
              <textarea id="rrf-diagnosis-text" placeholder="診療依頼目的や追加の病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
            </div>
          </div>
        </div>
        <div class="rrf-footer">
          <div class="rrf-footer-left">
            ${lastSavedAt ? `下書き: ${new Date(lastSavedAt).toLocaleString('ja-JP')}` : ''}
          </div>
          <div class="rrf-footer-right">
            <button class="rrf-btn rrf-btn-secondary" id="rrf-clear" style="color:#d32f2f;">クリア</button>
            <button class="rrf-btn rrf-btn-secondary" id="rrf-save-draft">下書き保存</button>
            <button class="rrf-btn rrf-btn-primary" id="rrf-generate">Google Docsに出力</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 変更追跡フラグ
    let isDirty = false;
    const formBody = modal.querySelector('.rrf-body');
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
    modal.querySelector('.rrf-close').addEventListener('click', () => confirmClose());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) confirmClose();
    });

    // 外来診療担当表ボタン
    modal.querySelector('#rrf-open-schedule').addEventListener('click', () => {
      window.open('https://ritsurin.jcho.go.jp/patient/outpatient/%E5%A4%96%E6%9D%A5%E8%A8%BA%E7%99%82%E6%8B%85%E5%BD%93%E8%A1%A8-7/', '_blank');
    });

    // 診療科・医師コンボボックスの連携
    const deptSelect = modal.querySelector('#rrf-dest-department');
    const doctorInput = modal.querySelector('#rrf-dest-doctor');
    const doctorDropdown = modal.querySelector('#rrf-doctor-dropdown');
    const doctorCombobox = modal.querySelector('.rrf-combobox[data-field="doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      modal.querySelectorAll('.rrf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div class="rrf-combobox-empty">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="rrf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 医師ドロップダウンを開く
    function openDoctorDropdown() {
      closeAllDropdowns();
      const deptName = deptSelect.value;
      let doctors = getRitsurinDoctors(deptName);
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
      doctorCombobox.querySelector('.rrf-combobox-toggle').disabled = !hasValue;
      if (!hasValue) {
        doctorInput.value = '';
      }
    });

    // 医師▼ボタン
    doctorCombobox.querySelector('.rrf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (doctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDoctorDropdown();
      }
    });

    // 医師選択肢クリック
    doctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.rrf-combobox-option');
      if (option) {
        doctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // モーダル内クリックでドロップダウンを閉じる
    modal.addEventListener('click', (e) => {
      if (!e.target.closest('.rrf-combobox')) {
        closeAllDropdowns();
      }
    });

    // クリアボタン
    modal.querySelector('#rrf-clear').addEventListener('click', async () => {
      const confirmed = await pageWindow.HenryCore?.ui?.showConfirm?.({
        title: '入力内容のクリア',
        message: '手入力した内容をすべてクリアしますか？\n（患者情報などの自動入力項目はクリアされません）',
        confirmLabel: 'クリア',
        cancelLabel: 'キャンセル'
      });
      if (!confirmed) return;

      // select・コンボボックスをリセット
      modal.querySelector('#rrf-dest-department').value = '';
      modal.querySelector('#rrf-dest-doctor').value = '';
      modal.querySelector('#rrf-dest-doctor').disabled = true;
      modal.querySelector('.rrf-combobox-toggle').disabled = true;

      // 日付入力をリセット
      modal.querySelector('#rrf-hope-date-1').value = '';
      modal.querySelector('#rrf-hope-date-2').value = '';

      // ラジオボタンをリセット
      modal.querySelectorAll('input[name="rrf-hope-date-1-period"]').forEach(r => { r.checked = false; });
      modal.querySelectorAll('input[name="rrf-hope-date-2-period"]').forEach(r => { r.checked = false; });
      const unknownRadio = modal.querySelector('#rrf-visit-unknown');
      if (unknownRadio) unknownRadio.checked = true;

      // テキストエリアをリセット
      modal.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

      // チェックボックスをリセット
      modal.querySelectorAll('.rrf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });

      isDirty = false;
    });

    // 下書き保存
    modal.querySelector('#rrf-save-draft').addEventListener('click', async () => {
      const data = collectFormData(modal, formData);
      const ds = pageWindow.HenryCore?.modules?.DraftStorage;
      if (ds) {
        const payload = { schemaVersion: DRAFT_SCHEMA_VERSION, data };
        const saved = await ds.save(DRAFT_TYPE, formData.patient_uuid, payload, data.patient_name || '');
        if (saved) {
          isDirty = false;
          modal.querySelector('.rrf-footer-left').textContent = `下書き: ${new Date().toLocaleString('ja-JP')}`;
          pageWindow.HenryCore?.ui?.showToast?.('下書きを保存しました', 'success');
        }
      }
    });

    // Google Docs出力
    modal.querySelector('#rrf-generate').addEventListener('click', async () => {
      const btn = modal.querySelector('#rrf-generate');
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

    // りつりん病院固有
    data.destination_department = modal.querySelector('#rrf-dest-department')?.value || '';
    data.destination_doctor = modal.querySelector('#rrf-dest-doctor')?.value || '';

    // 希望日
    data.hope_date_1 = modal.querySelector('#rrf-hope-date-1')?.value || '';
    data.hope_date_1_period = modal.querySelector('input[name="rrf-hope-date-1-period"]:checked')?.value || '';
    data.hope_date_2 = modal.querySelector('#rrf-hope-date-2')?.value || '';
    data.hope_date_2_period = modal.querySelector('input[name="rrf-hope-date-2-period"]:checked')?.value || '';
    data.hope_date_other = modal.querySelector('#rrf-hope-date-other')?.value || '';

    // 受診歴
    data.visit_history = modal.querySelector('input[name="rrf-visit-history"]:checked')?.value || 'unknown';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = modal.querySelector(`#rrf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = modal.querySelector('#rrf-diagnosis-text')?.value || '';

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

    // 希望日フォーマット
    const hopeDate1Text = formatHopeDate(formData.hope_date_1, formData.hope_date_1_period);
    const hopeDate2Text = formatHopeDate(formData.hope_date_2, formData.hope_date_2_period);

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `診療申込書_りつりん病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'ritsurin-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{ふりがな}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{年齢}}': formData.age,
        '{{郵便番号}}': formData.postal_code,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{医師名}}': formData.physician_name,
        '{{受診希望科}}': formData.destination_department,
        '{{希望医師名}}': formData.destination_doctor,
        '{{第1希望日}}': hopeDate1Text,
        '{{第2希望日}}': hopeDate2Text,
        '{{その他希望日}}': formData.hope_date_other,
        '{{受診歴}}': visitHistoryText,
        '{{診療依頼目的・病名}}': diagnosisText
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
      id: 'ritsurin-referral-form',
      name: '診療申込書（りつりん病院）',
      icon: '🏥',
      description: 'りつりん病院への診療申込書を作成',
      version: VERSION,
      order: 210,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showRitsurinForm
    }
  });
})();
