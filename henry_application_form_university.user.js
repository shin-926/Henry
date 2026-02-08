// ==UserScript==
// @name         香川大学医学部附属病院 FAX診療予約申込書
// @namespace    https://henry-app.jp/
// @version      1.5.0
// @description  香川大学医学部附属病院へのFAX診療予約申込書を作成
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_university.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_application_form_university.user.js
// ==/UserScript==

/*
 * 【香川大学医学部附属病院 FAX診療予約申込書フォーム】
 *
 * ■ 使用場面
 * - 香川大学医学部附属病院へのFAX診療予約申込書を作成する場合
 * - Henryから患者情報・病名を取得してフォームに自動入力
 *
 * ■ 主な機能
 * 1. 自動入力
 *    - 患者情報（氏名、ふりがな、生年月日、住所等）
 *    - 医師名（ログインユーザー）
 *    - 病名（選択式 or 手入力）
 *
 * 2. 香川大学病院固有の入力項目
 *    - 受診希望科（32科チェックボックス選択）
 *    - 希望医師名、連絡状況
 *    - 第1〜2希望日（日付＋時間）
 *    - 受診歴（無・不明・有 + ID入力）
 *    - 受診の緊急性、現在の状況
 *    - COVID-19状況
 *
 * 3. Google Docs出力
 *    - 入力内容をGoogle Docsテンプレートに反映
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 * - henry_form_commons.user.js: 共通モジュール
 * - henry_hospitals.user.js: 香川大学病院の診療科・医師データ
 * - Google Docs API: 文書の作成・編集
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'UniversityReferralForm';
  const VERSION = GM_info.script.version;

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // 共通モジュール参照
  const FC = () => pageWindow.HenryFormCommons;

  // ==========================================
  // 設定
  // ==========================================

  const TEMPLATE_CONFIG = {
    TEMPLATE_ID: '1yrp8y4PJEKMFxA52tjp-grpxMixsJz3b5Gbx4W79oo8',
    OUTPUT_FOLDER_NAME: 'Henry一時ファイル'
  };

  // 香川大学医学部附属病院固定
  const HOSPITAL_NAME = '香川大学医学部附属病院';

  // DraftStorage設定
  const DRAFT_TYPE = 'university';
  const DRAFT_LS_PREFIX = 'henry_university_draft_';
  const DRAFT_SCHEMA_VERSION = 1;

  // 診療科リスト（行ごとに管理、出力とUI表示で使用）
  const DEPARTMENT_ROWS = [
    ['内分泌代謝内科', '脳神経内科', '皮膚科', '形成外科・美容外科'],
    ['血液内科', '総合診療科', '精神科神経科', '歯・顎・口腔外科'],
    ['膠原病・リウマチ内科', '腫瘍内科', '小児科', '麻酔・ペインクリニック科'],
    ['呼吸器内科', '心臓血管外科', '周産期科女性診療科', '放射線治療科'],
    ['循環器内科', '消化器外科', '整形外科', '放射線診断科'],
    ['腎臓内科', '呼吸器外科', '泌尿器・副腎・腎移植外科', '眼科'],
    ['抗加齢血管内科', '乳腺内分泌外科', '脳神経外科', '臨床遺伝ゲノム診療科'],
    ['消化器内科（肝・膵胆・消化管）', '小児外科', '耳鼻咽喉科・頭頸部外科', '緩和ケア科'],
    ['膵臓・胆道センター']
  ];
  // フラット配列（UIチェックボックス用）
  const DEPARTMENTS = DEPARTMENT_ROWS.flat();

  // 診療科名マッピング（PDF表示名 → henry_hospitals診療科名）
  const DEPARTMENT_MAPPING = {
    // 一致するもの（そのまま）
    '総合診療科': ['総合診療科'],
    '血液内科': ['血液内科'],
    '腎臓内科': ['腎臓内科'],
    '膠原病・リウマチ内科': ['膠原病・リウマチ内科'],
    '循環器内科': ['循環器内科'],
    '脳神経内科': ['脳神経内科'],
    '呼吸器内科': ['呼吸器内科'],
    '腫瘍内科': ['腫瘍内科'],
    '緩和ケア科': ['緩和ケア科'],
    '皮膚科': ['皮膚科'],
    '精神科神経科': ['精神科神経科'],
    '小児科': ['小児科'],
    '放射線治療科': ['放射線治療科'],
    '放射線診断科': ['放射線診断科'],
    '歯・顎・口腔外科': ['歯・顎・口腔外科'],
    '消化器外科': ['消化器外科'],
    '呼吸器外科': ['呼吸器外科'],
    '心臓血管外科': ['心臓血管外科'],
    '小児外科': ['小児外科'],
    '整形外科': ['整形外科'],
    '臨床遺伝ゲノム診療科': ['臨床遺伝ゲノム診療科'],
    '脳神経外科': ['脳神経外科'],
    '眼科': ['眼科'],
    '耳鼻咽喉科・頭頸部外科': ['耳鼻咽喉科・頭頸部外科'],

    // マッピングが必要なもの
    '内分泌代謝内科': ['内分泌内科', '糖尿病内科'],
    '形成外科・美容外科': ['形成・美容外科'],
    '麻酔・ペインクリニック科': ['麻酔科'],
    '周産期科女性診療科': ['周産期科・女性診療科'],
    '泌尿器・副腎・腎移植外科': ['泌尿器科'],
    '乳腺内分泌外科': ['乳腺・内分泌外科'],
    '消化器内科（肝・膵胆・消化管）': ['消化器内科（肝臓）', '消化器内科（膵・胆）', '消化器内科（消化管）'],

    // henry_hospitalsに存在しないもの（空配列）
    '抗加齢血管内科': [],
    '膵臓・胆道センター': []
  };

  // テーマカラー（ネイビーブルー系）
  const THEME = {
    primary: '#3F51B5',
    primaryDark: '#303F9F',
    primaryLight: '#E8EAF6',
    accent: '#C5CAE9'
  };

  // ==========================================
  // 香川大学病院固有ユーティリティ
  // ==========================================

  /**
   * 希望日のフォーマット: "○月○日（曜日）○時頃"
   */
  function formatHopeDate(dateStr, time) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const timeText = time ? `${time}時頃` : '';
    return `${month}月${day}日（${weekdays[d.getDay()]}）${timeText}`;
  }

  async function fetchDepartmentName() {
    const HenryCore = pageWindow.HenryCore;
    if (!HenryCore) return '';
    return await HenryCore.getMyDepartment() || '';
  }

  // ==========================================
  // フォーム表示
  // ==========================================

  async function showUniversityForm() {
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
      const [patientInfo, physicianName, departmentName, diseases] = await Promise.all([
        data.fetchPatientInfo(SCRIPT_NAME),
        data.fetchPhysicianName(SCRIPT_NAME),
        fetchDepartmentName(),
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
        address: patientInfo.address,
        phone: utils.formatPhoneNumber(patientInfo.phone),
        physician_name: physicianName,
        department_name: departmentName,
        creation_date_wareki: utils.getTodayWareki(),

        // 病名
        diseases: diseases,
        selected_diseases: [],
        diagnosis_text: '',

        // 香川大学病院固有
        selected_department: '',
        destination_doctor: '',
        doctor_contacted: 'no',
        contact_person: '', // TODO: 後日担当者名をハードコード（例: '山田 花子'）
        hope_date_1: '',
        hope_date_1_time: '',
        hope_date_2: '',
        hope_date_2_time: '',
        hope_date_until: '',
        hope_date_other: '',
        mobile_phone: '',
        maiden_name: '',
        visit_history: 'no',
        visit_history_id: '',
        urgency: 'no',
        current_status: 'not_hospitalized',
        referral_purpose: '',
        test_data_status: 'no',
        test_data_xray: false,
        test_data_ct: false,
        test_data_mr: false,
        test_data_other: false,
        kmix_consent: 'no',
        covid_status: 'no_symptoms'
      };

      // 常に最新の自動取得データで更新
      formData.patient_uuid = patientUuid;
      formData.patient_name = patientInfo.patient_name;
      formData.patient_name_kana = patientInfo.patient_name_kana;
      formData.birth_date_wareki = patientInfo.birth_date_wareki;
      formData.age = patientInfo.age;
      formData.sex = patientInfo.sex;
      formData.address = patientInfo.address;

      // 電話番号の振り分け（携帯番号パターンなら携帯電話に、それ以外は固定電話に）
      const rawPhone = utils.formatPhoneNumber(patientInfo.phone);
      const phoneDigits = rawPhone.replace(/[^0-9]/g, '');
      if (/^0[6789]0/.test(phoneDigits)) {
        formData.phone = '';
        formData.mobile_phone = rawPhone;
      } else {
        formData.phone = rawPhone;
        // mobile_phoneは下書きの値を維持（なければ空）
        if (!savedDraft) formData.mobile_phone = '';
      }

      formData.physician_name = physicianName;
      formData.department_name = departmentName;
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
      <!-- 受診希望科（ラジオボタン） -->
      <div class="urf-section">
        <div class="urf-section-title">受診希望科</div>
        <div class="urf-row" style="margin-bottom: 16px;">
          <div class="urf-field">
            <label>旧姓（任意）</label>
            <input type="text" id="urf-maiden-name" value="${escapeHtml(formData.maiden_name)}" placeholder="旧姓があれば入力">
          </div>
        </div>
        <div class="urf-departments-grid">
          ${DEPARTMENTS.map((dept, idx) => `
            <div class="urf-dept-item">
              <input type="radio" name="urf-dest-dept" id="urf-dept-${idx}" value="${escapeHtml(dept)}"
                ${formData.selected_department === dept ? 'checked' : ''}>
              <label for="urf-dept-${idx}">${escapeHtml(dept)}</label>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 希望医師・連絡 -->
      <div class="urf-section">
        <div class="urf-section-title">希望医師・連絡</div>
        <div class="urf-row">
          <div class="urf-field">
            <label>希望医師名</label>
            <div class="urf-combobox" data-field="dest-doctor">
              <input type="text" class="urf-combobox-input" id="urf-dest-doctor" value="${escapeHtml(formData.destination_doctor)}" placeholder="医師名を入力">
              <button type="button" class="urf-combobox-toggle" title="リストから選択">▼</button>
              <div class="urf-combobox-dropdown" id="urf-dest-doctor-dropdown"></div>
            </div>
          </div>
          <div class="urf-field">
            <label>希望医師への連絡</label>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-contacted" id="urf-contacted-done" value="done"
                  ${formData.doctor_contacted === 'done' ? 'checked' : ''}>
                <label for="urf-contacted-done">済</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-contacted" id="urf-contacted-no" value="no"
                  ${formData.doctor_contacted !== 'done' ? 'checked' : ''}>
                <label for="urf-contacted-no">未</label>
              </div>
              <a href="https://www.med.kagawa-u.ac.jp/hosp/archives/002/202601/sinyoui_20260101.pdf" target="_blank" class="urf-external-link">外来表</a>
            </div>
          </div>
        </div>
      </div>

      <!-- 受診希望日 -->
      <div class="urf-section">
        <div class="urf-section-title">受診希望日</div>
        <div class="urf-hope-date-row">
          <div class="urf-field">
            <label>第1希望日</label>
            <input type="date" id="urf-hope-date-1" value="${escapeHtml(formData.hope_date_1)}">
          </div>
          <div class="urf-field urf-time-field">
            <label>時間</label>
            <div class="urf-time-select-wrapper">
              <select id="urf-hope-date-1-time">
                <option value="">--</option>
                ${[...Array(24)].map((_, i) => `<option value="${i}" ${formData.hope_date_1_time === String(i) ? 'selected' : ''}>${i}</option>`).join('')}
              </select>
              <span class="urf-time-suffix">時頃</span>
            </div>
          </div>
        </div>
        <div class="urf-hope-date-row" style="margin-top: 12px;">
          <div class="urf-field">
            <label>第2希望日</label>
            <input type="date" id="urf-hope-date-2" value="${escapeHtml(formData.hope_date_2)}">
          </div>
          <div class="urf-field urf-time-field">
            <label>時間</label>
            <div class="urf-time-select-wrapper">
              <select id="urf-hope-date-2-time">
                <option value="">--</option>
                ${[...Array(24)].map((_, i) => `<option value="${i}" ${formData.hope_date_2_time === String(i) ? 'selected' : ''}>${i}</option>`).join('')}
              </select>
              <span class="urf-time-suffix">時頃</span>
            </div>
          </div>
        </div>
        <div class="urf-row" style="margin-top: 12px;">
          <div class="urf-field">
            <label>いつまでの受診希望か</label>
            <input type="text" id="urf-hope-date-until" value="${escapeHtml(formData.hope_date_until)}" placeholder="例: 今月中、2週間以内">
          </div>
          <div class="urf-field">
            <label>その他希望</label>
            <input type="text" id="urf-hope-date-other" value="${escapeHtml(formData.hope_date_other)}" placeholder="曜日・期間指定、予約不可の日など">
          </div>
        </div>
      </div>

      <!-- 当院受診歴 -->
      <div class="urf-section">
        <div class="urf-section-title">香川大学医学部附属病院 受診歴</div>
        <div class="urf-radio-group">
          <div class="urf-radio-item">
            <input type="radio" name="urf-visit-history" id="urf-visit-no" value="no"
              ${formData.visit_history === 'no' ? 'checked' : ''}>
            <label for="urf-visit-no">無</label>
          </div>
          <div class="urf-radio-item">
            <input type="radio" name="urf-visit-history" id="urf-visit-unknown" value="unknown"
              ${formData.visit_history === 'unknown' ? 'checked' : ''}>
            <label for="urf-visit-unknown">不明</label>
          </div>
          <div class="urf-radio-item">
            <input type="radio" name="urf-visit-history" id="urf-visit-yes" value="yes"
              ${formData.visit_history === 'yes' ? 'checked' : ''}>
            <label for="urf-visit-yes">有</label>
          </div>
        </div>
        <div class="urf-conditional-field ${formData.visit_history === 'yes' ? 'visible' : ''}" id="urf-visit-id-field">
          <div class="urf-field">
            <label>患者ID（わかれば）</label>
            <input type="text" id="urf-visit-history-id" value="${escapeHtml(formData.visit_history_id)}" placeholder="例: 123456">
          </div>
        </div>
      </div>

      <!-- 受診の緊急性・現在の状況 -->
      <div class="urf-section">
        <div class="urf-section-title">受診の緊急性・現在の状況</div>
        <div class="urf-row">
          <div class="urf-field">
            <label>受診の緊急性</label>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-urgency" id="urf-urgency-yes" value="yes"
                  ${formData.urgency === 'yes' ? 'checked' : ''}>
                <label for="urf-urgency-yes">有</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-urgency" id="urf-urgency-no" value="no"
                  ${formData.urgency !== 'yes' ? 'checked' : ''}>
                <label for="urf-urgency-no">無</label>
              </div>
            </div>
          </div>
          <div class="urf-field">
            <label>現在の状況</label>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-status" id="urf-status-hospitalized" value="hospitalized"
                  ${formData.current_status === 'hospitalized' ? 'checked' : ''}>
                <label for="urf-status-hospitalized">入院中</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-status" id="urf-status-not" value="not_hospitalized"
                  ${formData.current_status !== 'hospitalized' ? 'checked' : ''}>
                <label for="urf-status-not">入院中でない</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 傷病名・紹介目的 -->
      <div class="urf-section">
        <div class="urf-section-title">傷病名（疑い病名）</div>
        ${formData.diseases.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 8px;">登録済み病名から選択</label>
            <div id="urf-diseases-list" class="urf-checkbox-group">
              ${formData.diseases.map(d => `
                <div class="urf-checkbox-item ${d.isMain ? 'main-disease' : ''}">
                  <input type="checkbox" id="urf-disease-${d.uuid}" value="${d.uuid}"
                    ${formData.selected_diseases?.includes(d.uuid) ? 'checked' : ''}>
                  <label for="urf-disease-${d.uuid}">${escapeHtml(d.name)}${d.isMain ? ' (主病名)' : ''}${d.isSuspected ? ' (疑い)' : ''}</label>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="urf-field">
          <label>自由記述（傷病名）</label>
          <textarea id="urf-diagnosis-text" placeholder="傷病名を入力">${escapeHtml(formData.diagnosis_text)}</textarea>
        </div>
      </div>

      <!-- 紹介目的と症状経過 -->
      <div class="urf-section">
        <div class="urf-section-title">紹介目的と症状経過</div>
        <div class="urf-field">
          <textarea id="urf-referral-purpose" placeholder="紹介目的と症状経過を入力">${escapeHtml(formData.referral_purpose)}</textarea>
        </div>
      </div>

      <!-- 検査データ等・K-MIX R同意書 -->
      <div class="urf-section">
        <div class="urf-section-title">検査データ等・K-MIX R同意書</div>
        <div class="urf-row">
          <div class="urf-field">
            <label>検査データ等の有無</label>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-test-data" id="urf-test-data-no" value="no"
                  ${formData.test_data_status !== 'yes' ? 'checked' : ''}>
                <label for="urf-test-data-no">無</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-test-data" id="urf-test-data-yes" value="yes"
                  ${formData.test_data_status === 'yes' ? 'checked' : ''}>
                <label for="urf-test-data-yes">有</label>
              </div>
            </div>
            <div class="urf-conditional-field ${formData.test_data_status === 'yes' ? 'visible' : ''}" id="urf-test-data-types-field">
              <div class="urf-checkbox-inline">
                <label><input type="checkbox" id="urf-test-xray" ${formData.test_data_xray ? 'checked' : ''}> X線</label>
                <label><input type="checkbox" id="urf-test-ct" ${formData.test_data_ct ? 'checked' : ''}> CT</label>
                <label><input type="checkbox" id="urf-test-mr" ${formData.test_data_mr ? 'checked' : ''}> MR</label>
                <label><input type="checkbox" id="urf-test-other" ${formData.test_data_other ? 'checked' : ''}> その他</label>
              </div>
            </div>
          </div>
          <div class="urf-field">
            <label>K-MIX R 利用に係る同意書の有無</label>
            <div class="urf-radio-group">
              <div class="urf-radio-item">
                <input type="radio" name="urf-kmix" id="urf-kmix-no" value="no"
                  ${formData.kmix_consent !== 'yes' ? 'checked' : ''}>
                <label for="urf-kmix-no">無</label>
              </div>
              <div class="urf-radio-item">
                <input type="radio" name="urf-kmix" id="urf-kmix-yes" value="yes"
                  ${formData.kmix_consent === 'yes' ? 'checked' : ''}>
                <label for="urf-kmix-yes">有</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COVID-19 -->
      <div class="urf-section">
        <div class="urf-section-title">COVID-19</div>
        <div class="urf-radio-group">
          <div class="urf-radio-item">
            <input type="radio" name="urf-covid" id="urf-covid-positive" value="positive"
              ${formData.covid_status === 'positive' ? 'checked' : ''}>
            <label for="urf-covid-positive">陽性者</label>
          </div>
          <div class="urf-radio-item">
            <input type="radio" name="urf-covid" id="urf-covid-suspected" value="suspected"
              ${formData.covid_status === 'suspected' ? 'checked' : ''}>
            <label for="urf-covid-suspected">疑い（症状あり）</label>
          </div>
          <div class="urf-radio-item">
            <input type="radio" name="urf-covid" id="urf-covid-none" value="no_symptoms"
              ${formData.covid_status === 'no_symptoms' || !formData.covid_status ? 'checked' : ''}>
            <label for="urf-covid-none">症状なし</label>
          </div>
        </div>
      </div>
    `;
  }

  function clearFormFields(bodyEl) {
    // テキスト入力をリセット
    ['#urf-maiden-name', '#urf-dest-doctor', '#urf-visit-history-id', '#urf-hope-date-other'].forEach(sel => {
      const el = bodyEl.querySelector(sel);
      if (el) el.value = '';
    });

    // 日付入力をリセット
    bodyEl.querySelector('#urf-hope-date-1').value = '';
    bodyEl.querySelector('#urf-hope-date-2').value = '';
    const hopeDateUntil = bodyEl.querySelector('#urf-hope-date-until');
    if (hopeDateUntil) hopeDateUntil.value = '';

    // 時間セレクトをリセット
    const time1 = bodyEl.querySelector('#urf-hope-date-1-time');
    if (time1) time1.value = '';
    const time2 = bodyEl.querySelector('#urf-hope-date-2-time');
    if (time2) time2.value = '';

    // ラジオボタンをリセット（受診希望科）
    bodyEl.querySelectorAll('input[name="urf-dest-dept"]').forEach(r => { r.checked = false; });

    // ラジオボタンをリセット（連絡）
    const contactedNo = bodyEl.querySelector('#urf-contacted-no');
    if (contactedNo) contactedNo.checked = true;

    // ラジオボタンをリセット（受診歴）
    const visitNo = bodyEl.querySelector('#urf-visit-no');
    if (visitNo) visitNo.checked = true;
    bodyEl.querySelector('#urf-visit-id-field')?.classList.remove('visible');

    // ラジオボタンをリセット（緊急性）
    const urgencyNo = bodyEl.querySelector('#urf-urgency-no');
    if (urgencyNo) urgencyNo.checked = true;

    // ラジオボタンをリセット（現在の状況）
    const statusNot = bodyEl.querySelector('#urf-status-not');
    if (statusNot) statusNot.checked = true;

    // ラジオボタンをリセット（検査データ）
    const testDataNo = bodyEl.querySelector('#urf-test-data-no');
    if (testDataNo) testDataNo.checked = true;
    bodyEl.querySelector('#urf-test-data-types-field')?.classList.remove('visible');

    // ラジオボタンをリセット（K-MIX）
    const kmixNo = bodyEl.querySelector('#urf-kmix-no');
    if (kmixNo) kmixNo.checked = true;

    // ラジオボタンをリセット（COVID-19）
    const covidNone = bodyEl.querySelector('#urf-covid-none');
    if (covidNone) covidNone.checked = true;

    // テキストエリアをリセット
    bodyEl.querySelectorAll('textarea').forEach(ta => { ta.value = ''; });

    // チェックボックスをリセット（病名選択）
    bodyEl.querySelectorAll('.urf-checkbox-group input[type="checkbox"]').forEach(cb => { cb.checked = false; });

    // チェックボックスをリセット（検査データ種別）
    bodyEl.querySelectorAll('.urf-checkbox-inline input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  }

  function setupFormEvents(bodyEl) {
    const escapeHtml = FC().utils.escapeHtml;

    // 希望医師コンボボックス
    const destDoctorInput = bodyEl.querySelector('#urf-dest-doctor');
    const destDoctorDropdown = bodyEl.querySelector('#urf-dest-doctor-dropdown');
    const destDoctorCombobox = bodyEl.querySelector('.urf-combobox[data-field="dest-doctor"]');

    // ドロップダウンを閉じる
    function closeAllDropdowns() {
      bodyEl.querySelectorAll('.urf-combobox-dropdown').forEach(d => d.classList.remove('open'));
    }

    // ドロップダウンの選択肢を生成
    function renderDropdownOptions(dropdown, options, currentValue) {
      if (options.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px 12px; color: #999; font-size: 14px;">選択肢がありません</div>';
      } else {
        dropdown.innerHTML = options.map(opt =>
          `<div class="urf-combobox-option ${opt === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
      }
    }

    // 希望医師ドロップダウンを開く
    function openDestDoctorDropdown() {
      closeAllDropdowns();
      // HenryHospitalsから香川大学病院の医師リストを取得
      const api = pageWindow.HenryHospitals;
      const selectedDept = bodyEl.querySelector('input[name="urf-dest-dept"]:checked')?.value || '';
      let doctors = [];

      if (api && selectedDept) {
        // マッピングテーブルから対応するhenry_hospitals診療科名を取得
        const mappedDepts = DEPARTMENT_MAPPING[selectedDept] || [];

        // 各診療科の医師を取得してマージ
        for (const mappedDept of mappedDepts) {
          const deptDoctors = api.getDoctors('香川大学医学部附属病院', mappedDept) || [];
          doctors = [...doctors, ...deptDoctors];
        }

        // 重複を除去
        doctors = [...new Set(doctors)];
      }

      // 「担当医」を常に追加
      if (!doctors.includes('担当医')) {
        doctors = [...doctors, '担当医'];
      }
      renderDropdownOptions(destDoctorDropdown, doctors, destDoctorInput.value);
      destDoctorDropdown.classList.add('open');
    }

    // 希望医師▼ボタン
    destDoctorCombobox.querySelector('.urf-combobox-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (destDoctorDropdown.classList.contains('open')) {
        closeAllDropdowns();
      } else {
        openDestDoctorDropdown();
      }
    });

    // 希望医師選択肢クリック
    destDoctorDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.urf-combobox-option');
      if (option) {
        destDoctorInput.value = option.dataset.value;
        closeAllDropdowns();
      }
    });

    // bodyEl内クリックでドロップダウンを閉じる
    bodyEl.addEventListener('click', (e) => {
      if (!e.target.closest('.urf-combobox')) {
        closeAllDropdowns();
      }
    });

    // 受診歴ラジオボタン変更時
    const visitHistoryRadios = bodyEl.querySelectorAll('input[name="urf-visit-history"]');
    const visitIdField = bodyEl.querySelector('#urf-visit-id-field');
    visitHistoryRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          visitIdField.classList.add('visible');
        } else {
          visitIdField.classList.remove('visible');
        }
      });
    });

    // 検査データ有無ラジオボタン変更時
    const testDataRadios = bodyEl.querySelectorAll('input[name="urf-test-data"]');
    const testDataTypesField = bodyEl.querySelector('#urf-test-data-types-field');
    testDataRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'yes') {
          testDataTypesField.classList.add('visible');
        } else {
          testDataTypesField.classList.remove('visible');
        }
      });
    });
  }

  function showFormModal(formData, lastSavedAt) {
    const EXTRA_CSS = `
      .urf-conditional-field {
        margin-top: 8px;
        padding: 12px;
        background: #fafafa;
        border-radius: 6px;
        display: none;
      }
      .urf-conditional-field.visible { display: block; }
      .urf-departments-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 8px;
      }
      @media (max-width: 900px) {
        .urf-departments-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      @media (max-width: 600px) {
        .urf-departments-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      .urf-dept-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 12px;
        border: 1px solid transparent;
        transition: all 0.2s;
      }
      .urf-dept-item:has(input:checked) {
        background: ${THEME.accent};
        border-color: ${THEME.primary};
      }
      .urf-dept-item input[type="radio"] {
        width: 16px;
        height: 16px;
        margin: 0;
      }
      .urf-dept-item input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin: 0;
      }
      .urf-dept-item label {
        margin: 0;
        font-size: 12px;
        color: #333;
        cursor: pointer;
        line-height: 1.3;
      }
      .urf-hope-date-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }
      .urf-hope-date-row .urf-field { flex: 2; }
      .urf-hope-date-row .urf-time-field { flex: 1; }
      .urf-time-select-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .urf-time-select-wrapper select {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        background: #fff;
        cursor: pointer;
      }
      .urf-time-select-wrapper select:focus {
        outline: none;
        border-color: ${THEME.primary};
        box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.2);
      }
      .urf-time-suffix {
        font-size: 14px;
        color: #333;
        white-space: nowrap;
      }
      .urf-checkbox-inline {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .urf-checkbox-inline label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: #333;
        cursor: pointer;
      }
      .urf-checkbox-inline input[type="checkbox"] {
        width: 16px;
        height: 16px;
      }
      .urf-external-link {
        font-size: 13px;
        color: ${THEME.primary};
        text-decoration: none;
        margin-left: 8px;
      }
      .urf-external-link:hover { text-decoration: underline; }
    `;

    FC().showFormModal({
      id: 'urf-form-modal',
      title: '香川大学医学部附属病院 FAX診療予約申込書',
      prefix: 'urf',
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

    // 患者追加情報
    data.mobile_phone = bodyEl.querySelector('#urf-mobile-phone')?.value || '';
    data.maiden_name = bodyEl.querySelector('#urf-maiden-name')?.value || '';

    // 受診希望科（単一選択）
    data.selected_department = bodyEl.querySelector('input[name="urf-dest-dept"]:checked')?.value || '';

    // 希望医師・連絡
    data.destination_doctor = bodyEl.querySelector('#urf-dest-doctor')?.value || '';
    data.doctor_contacted = bodyEl.querySelector('input[name="urf-contacted"]:checked')?.value || 'no';
    data.contact_person = bodyEl.querySelector('#urf-contact-person')?.value || '';

    // 希望日
    data.hope_date_1 = bodyEl.querySelector('#urf-hope-date-1')?.value || '';
    data.hope_date_1_time = bodyEl.querySelector('#urf-hope-date-1-time')?.value || '';
    data.hope_date_2 = bodyEl.querySelector('#urf-hope-date-2')?.value || '';
    data.hope_date_2_time = bodyEl.querySelector('#urf-hope-date-2-time')?.value || '';
    data.hope_date_until = bodyEl.querySelector('#urf-hope-date-until')?.value || '';
    data.hope_date_other = bodyEl.querySelector('#urf-hope-date-other')?.value || '';

    // 受診歴
    data.visit_history = bodyEl.querySelector('input[name="urf-visit-history"]:checked')?.value || 'no';
    data.visit_history_id = bodyEl.querySelector('#urf-visit-history-id')?.value || '';

    // 緊急性・状況
    data.urgency = bodyEl.querySelector('input[name="urf-urgency"]:checked')?.value || 'no';
    data.current_status = bodyEl.querySelector('input[name="urf-status"]:checked')?.value || 'not_hospitalized';

    // 病名（選択と自由記述の両方を取得）
    data.selected_diseases = [];
    if (data.diseases.length > 0) {
      data.diseases.forEach(d => {
        const cb = bodyEl.querySelector(`#urf-disease-${d.uuid}`);
        if (cb?.checked) {
          data.selected_diseases.push(d.uuid);
        }
      });
    }
    data.diagnosis_text = bodyEl.querySelector('#urf-diagnosis-text')?.value || '';

    // 紹介目的
    data.referral_purpose = bodyEl.querySelector('#urf-referral-purpose')?.value || '';

    // 検査データ等
    data.test_data_status = bodyEl.querySelector('input[name="urf-test-data"]:checked')?.value || 'no';
    data.test_data_xray = bodyEl.querySelector('#urf-test-xray')?.checked || false;
    data.test_data_ct = bodyEl.querySelector('#urf-test-ct')?.checked || false;
    data.test_data_mr = bodyEl.querySelector('#urf-test-mr')?.checked || false;
    data.test_data_other = bodyEl.querySelector('#urf-test-other')?.checked || false;

    // K-MIX R同意書
    data.kmix_consent = bodyEl.querySelector('input[name="urf-kmix"]:checked')?.value || 'no';

    // COVID-19
    data.covid_status = bodyEl.querySelector('input[name="urf-covid"]:checked')?.value || 'no_symptoms';

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
      const diseaseText = selectedDiseases.map(d => d.name).join('、');
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
    } else if (formData.visit_history === 'unknown') {
      visitHistoryText = '不明';
    } else {
      visitHistoryText = '無';
    }

    // 希望日フォーマット（時間付き）
    const hopeDate1Text = formatHopeDate(formData.hope_date_1, formData.hope_date_1_time);
    const hopeDate2Text = formatHopeDate(formData.hope_date_2, formData.hope_date_2_time);

    // 受診希望科（チェックボックス形式、タブ区切り・行ごとに改行）
    const departmentsText = DEPARTMENT_ROWS.map(row => {
      return row.map(dept => {
        const isSelected = formData.selected_department === dept;
        return `${isSelected ? '■' : '□'}${dept}`;
      }).join('\t');
    }).join('\n');

    // 連絡状況
    const contactedText = formData.doctor_contacted === 'done' ? '済' : '未';

    // 緊急性
    const urgencyText = formData.urgency === 'yes' ? '有' : '無';

    // 現在の状況
    const statusText = formData.current_status === 'hospitalized' ? '入院中' : '入院中でない';

    // 検査データ等の有無
    let testDataText = '';
    if (formData.test_data_status === 'yes') {
      const types = [];
      if (formData.test_data_xray) types.push('X線');
      if (formData.test_data_ct) types.push('CT');
      if (formData.test_data_mr) types.push('MR');
      if (formData.test_data_other) types.push('その他');
      testDataText = types.length > 0 ? `有（${types.join('・')}）` : '有';
    } else {
      testDataText = '無';
    }

    // K-MIX R同意書の有無
    const kmixText = formData.kmix_consent === 'yes' ? '有' : '無';

    // COVID-19
    let covidText = '';
    if (formData.covid_status === 'positive') {
      covidText = '陽性者';
    } else if (formData.covid_status === 'suspected') {
      covidText = '疑い（症状あり）';
    } else {
      covidText = '症状なし';
    }

    // 共通フローで出力
    await FC().generateDoc({
      scriptName: SCRIPT_NAME,
      templateId: TEMPLATE_CONFIG.TEMPLATE_ID,
      fileName: `FAX診療予約申込書_香川大学病院_${formData.patient_name}_${new Date().toISOString().slice(0, 10)}`,
      source: 'university-referral-form',
      patientUuid: formData.patient_uuid,
      replacements: {
        '{{作成日}}': formData.creation_date_wareki,
        '{{フリガナ}}': formData.patient_name_kana,
        '{{患者氏名}}': formData.patient_name,
        '{{性別}}': formData.sex,
        '{{生年月日}}': formData.birth_date_wareki,
        '{{年齢}}': formData.age,
        '{{住所}}': formData.address,
        '{{電話番号}}': formData.phone,
        '{{携帯電話}}': formData.mobile_phone,
        '{{旧姓}}': formData.maiden_name,
        '{{医師名}}': formData.physician_name,
        '{{診療科}}': formData.department_name,
        '{{受診希望科}}': departmentsText,
        '{{希望医師名}}': formData.destination_doctor,
        '{{連絡}}': contactedText,
        '{{連絡担当者}}': formData.contact_person,
        '{{第1希望日}}': hopeDate1Text,
        '{{第2希望日}}': hopeDate2Text,
        '{{いつまで希望}}': formData.hope_date_until,
        '{{その他希望日}}': formData.hope_date_other,
        '{{受診歴}}': visitHistoryText,
        '{{受診の緊急性}}': urgencyText,
        '{{現在の状況}}': statusText,
        '{{傷病名}}': diagnosisText,
        '{{紹介目的と症状経過}}': formData.referral_purpose,
        '{{検査データ等の有無}}': testDataText,
        '{{K-MIXR同意書の有無}}': kmixText,
        '{{COVID-19}}': covidText
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
      id: 'university-referral-form',
      name: '診療申込書（香川大学病院）',
      icon: '🎓',
      description: '香川大学医学部附属病院へのFAX診療予約申込書を作成',
      version: VERSION,
      order: 214,
      group: '診療申込書',
      groupIcon: '📋',
      onClick: showUniversityForm
    }
  });
})();
