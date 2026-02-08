// ==UserScript==
// @name         警察診断書フォーム
// @namespace    https://henry-app.jp/
// @version      1.3.0
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
 * - henry_form_commons.user.js: 共通モジュール
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

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1OreF4-c5DTm_sqKwm_fKtRlA3EkG_p2XB62JxoIq6g4',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // DraftStorage設定
  const DRAFT_TYPE = 'police_cert';
  const DRAFT_LS_PREFIX = 'henry_police_cert_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 警察診断書固有ユーティリティ
  // ==========================================

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
    return FC().utils.toWareki(year, month, day);
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
    const googleAuth = FC().getGoogleAuth();
    if (!googleAuth) {
      alert('Google認証が設定されていません。\nHenry Toolboxの設定からGoogle認証を行ってください。');
      return;
    }

    const { close: hideSpinner } = HenryCore.ui.showSpinner('警察診断書を準備中...');
    try {
      const { data } = FC();

      // データ取得（並列実行）
      const [patientInfo, physicianName, diseases] = await Promise.all([
        data.fetchPatientInfo(SCRIPT_NAME),
        data.fetchPhysicianName(SCRIPT_NAME),
        data.fetchDiseases(patientUuid, SCRIPT_NAME)
      ]);

      if (!patientInfo) {
        hideSpinner();
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
        patient_birth_date_wareki: patientInfo.birth_date_wareki,
        patient_sex: patientInfo.sex,
        patient_address: patientInfo.address,
        physician_name: physicianName,
        creation_date_wareki: utils.getTodayWareki(),

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
      formData.creation_date_wareki = utils.getTodayWareki();
      formData.diseases = diseases;

      // モーダル表示
      hideSpinner();
      showFormModal(formData, savedDraft?.savedAt);

    } catch (e) {
      hideSpinner();
      console.error(`[${SCRIPT_NAME}] フォーム表示エラー:`, e);
      alert(`エラーが発生しました: ${e.message}`);
    }
  }

  function buildFormBody(formData) {
    const { utils } = FC();
    const escapeHtml = utils.escapeHtml;

    return `
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
    `;
  }

  function clearFormFields(bodyEl) {
    // テキスト入力をリセット
    ['#pc-diagnosis-text', '#pc-treatment-period', '#pc-remarks'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // チェックボックスをリセット
    bodyEl.querySelectorAll('.pc-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  }

  function setupFormEvents(bodyEl) {
    // 病名使用トグル
    const useDiseases = bodyEl.querySelector('#pc-use-diseases');
    if (useDiseases) {
      useDiseases.addEventListener('change', () => {
        const diseasesList = bodyEl.querySelector('#pc-diseases-list');
        const diagnosisManual = bodyEl.querySelector('#pc-diagnosis-manual');
        if (useDiseases.checked) {
          diseasesList.style.display = '';
          diagnosisManual.style.display = 'none';
        } else {
          diseasesList.style.display = 'none';
          diagnosisManual.style.display = '';
        }
      });
    }
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      /* 警察診断書固有: 赤テーマ */
      .pc-section-title {
        color: #d32f2f;
        border-bottom-color: #ffcdd2;
      }
      .pc-field input:focus, .pc-field textarea:focus {
        border-color: #d32f2f;
        box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
      }
      .pc-checkbox-item.main-disease {
        background: #ffebee;
        border: 1px solid #ef9a9a;
      }
    `;

    FC().showFormModal({
      id: 'pc-form-modal',
      title: `警察診断書 - ${formData.patient_name}`,
      prefix: 'pc',
      bodyHTML: buildFormBody(formData),
      extraCSS: EXTRA_CSS,
      headerColor: '#d32f2f',
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

    data.visit_date = bodyEl.querySelector('#pc-visit-date')?.value || getTodayISO();
    data.treatment_period = bodyEl.querySelector('#pc-treatment-period')?.value || '';
    data.remarks = bodyEl.querySelector('#pc-remarks')?.value || '';

    // 病名
    const useDiseases = bodyEl.querySelector('#pc-use-diseases');
    data.use_diseases = useDiseases?.checked ?? false;

    if (data.use_diseases && data.diseases.length > 0) {
      data.selected_diseases = [];
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#pc-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    } else {
      data.diagnosis_text = bodyEl.querySelector('#pc-diagnosis-text')?.value || '';
    }

    return data;
  }

  // ==========================================
  // Google Docs 出力
  // ==========================================

  async function generateGoogleDoc(formData) {
    // 診断名テキスト作成
    let diagnosisText = '';
    if (formData.use_diseases && formData.diseases.length > 0 && formData.selected_diseases?.length > 0) {
      const selectedDiseases = formData.diseases.filter(d => formData.selected_diseases.includes(d.uuid));
      diagnosisText = selectedDiseases.map(d => d.name).join('，');
    } else {
      diagnosisText = formData.diagnosis_text || '';
    }

    // 受診日を和暦に変換
    const visitDateWareki = isoToWareki(formData.visit_date);

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `警察診断書_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'police-certificate',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日_和暦}}': formData.creation_date_wareki,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.patient_sex,
        '{{患者生年月日_和暦}}': formData.patient_birth_date_wareki,
        '{{患者住所}}': formData.patient_address,
        '{{医師名}}': formData.physician_name,
        '{{診断名}}': diagnosisText,
        '{{受診日}}': visitDateWareki,
        '{{治療見込み}}': formData.treatment_period,
        '{{特記事項}}': formData.remarks
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
      id: 'police-certificate',
      name: '警察診断書',
      icon: '🚔',
      description: '警察提出用診断書を作成',
      version: VERSION,
      order: 210,
      group: '文書作成',
      groupIcon: '📝',
      onClick: showPoliceCertificateForm
    }
  });
})();
