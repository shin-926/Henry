// ==UserScript==
// @name         Henry リハビリオーダー
// @namespace    https://henry-app.jp/
// @version      1.3.2
// @description  リハビリオーダー作成 + リハビリ指示記事作成（入院/外来両対応）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_rehab_order.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_rehab_order.user.js
// ==/UserScript==

/*
 * 【リハビリオーダー + 指示書作成（入院/外来両対応）】
 *
 * ■ 使用場面
 * - リハビリオーダーを作成し、続けて指示書記事も作成
 * - ツールボックスの「リハビリオーダー」ボタンから呼び出し
 *
 * ■ 機能
 * - 運動器リハビリテーションに特化
 * - 患者の病名一覧から診断名を選択
 * - PT/OTの訓練内容を選択
 * - オーダー作成後、「リハビリ指示（外来）」記事を続けて作成可能
 * - 入院患者の場合は入院カルテに記事を作成
 *
 * ■ 依存関係
 * - henry_core.user.js: HenryCore API
 * - henry_toolbox.user.js: プラグイン登録
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'RehabOrder';

  // ページのwindowを取得（サンドボックス対応）
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ===========================================
  // 定数
  // ===========================================

  // 運動器リハビリテーションのUUID
  const UNDOUKI_REHAB_UUID = 'c86098b6-af99-49f3-b229-b3119eef5372';

  // リハビリ指示（外来）のclinicalDocumentCustomTypeUuid（固定値）
  const CLINICAL_DOCUMENT_TYPE_UUID = 'e7a542b5-ec35-444b-92cb-a767dda12854';

  // ===========================================
  // GraphQL クエリ/ミューテーション
  // ===========================================

  // リハビリ算定区分一覧取得
  const QUERY_REHAB_CALC_TYPES = `
    query ListAllRehabilitationCalculationTypes($input: ListAllRehabilitationCalculationTypesRequestInput!) {
      listAllRehabilitationCalculationTypes(input: $input) {
        rehabilitationCalculationTypes {
          uuid
          name
          period { value }
          isShikkanbetsuRehabilitation
          therapyStartDateTypes {
            uuid
            name
            rehabilitationCalculationTypeId
          }
        }
      }
    }
  `;

  // 患者病名一覧取得
  const QUERY_PATIENT_DISEASES = `
    query ListPatientReceiptDiseases($input: ListPatientReceiptDiseasesRequestInput!) {
      listPatientReceiptDiseases(input: $input) {
        patientReceiptDiseases {
          uuid
          masterDisease { code name }
          isMain
          isSuspected
          outcome
          startDate { year month day }
          endDate { year month day }
        }
      }
    }
  `;

  // リハビリ計画一覧取得
  const QUERY_REHAB_PLANS = `
    query ListRehabilitationPlans {
      listRehabilitationPlans {
        rehabilitationPlans {
          uuid
          category
          name
        }
      }
    }
  `;

  // リハビリオーダー作成（インライン方式で動的に構築）
  // 注: HenryのGraphQLサーバーは入力型を公開していないため、値を直接埋め込む

  // ===========================================
  // 記事作成用関数
  // ===========================================

  // Draft.jsのブロックキー生成（5文字のランダム英数字）
  function generateBlockKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 5; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  // テキストをDraft.js形式に変換
  function textToDraftJs(text) {
    const lines = text.split('\n');
    const blocks = lines.map((line) => ({
      key: generateBlockKey(),
      type: 'unstyled',
      text: line,
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {}
    }));

    return JSON.stringify({ blocks, entityMap: {} });
  }

  // 記事作成mutation（インライン方式）
  function buildCreateClinicalDocumentMutation(patientUuid, editorData, performTimeSeconds, clinicalDocumentCustomTypeUuid, hospitalizationUuid) {
    const escapedEditorData = editorData.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `
      mutation CreateClinicalDocument {
        createClinicalDocument(input: {
          uuid: "",
          patientUuid: "${patientUuid}",
          editorData: "${escapedEditorData}",
          type: {
            type: CUSTOM,
            clinicalDocumentCustomTypeUuid: { value: "${clinicalDocumentCustomTypeUuid}" }
          },
          performTime: { seconds: ${performTimeSeconds}, nanos: 0 },
          hospitalizationUuid: ${hospitalizationUuid ? `{ value: "${hospitalizationUuid}" }` : 'null'}
        }) {
          uuid
          performTime { seconds }
          creator { name }
        }
      }
    `;
  }

  // 指示書内容を生成
  function formatInstructionContent(formData, diseases, calcTypes, rehabPlans) {
    // 選択された病名を取得
    const selectedDisease = diseases.find(d => d.uuid === formData.diseaseUuid);
    const diseaseName = selectedDisease?.masterDisease?.name || '不明';
    const diseaseStartDate = selectedDisease?.startDate
      ? formatDateString(selectedDisease.startDate)
      : '';

    // 選択された算定区分を取得
    const selectedCalcType = calcTypes.find(t => t.uuid === formData.calcTypeUuid);
    const calcTypeName = selectedCalcType?.name || '不明';

    // 起算日
    const therapyStartDate = formatDateString(formData.therapyStartDate);

    // PT/OT訓練項目を取得
    const ptItems = [];
    const otItems = [];
    formData.planUuids.forEach(uuid => {
      const plan = rehabPlans.find(p => p.uuid === uuid);
      if (plan) {
        if (plan.category === 'PT') {
          ptItems.push(plan.name);
        } else if (plan.category === 'OT') {
          otItems.push(plan.name);
        }
      }
    });

    // 記事内容を組み立て
    const lines = [
      '＜外来リハビリ指示書＞',
      '',
      '【診断名】',
      `　${diseaseName}${diseaseStartDate ? `（発症：${diseaseStartDate}）` : ''}`,
      '',
      '【リハビリ算定区分】',
      `　${calcTypeName}`,
      '',
      '【リハビリ起算日】',
      `　${therapyStartDate}`,
      ''
    ];

    // 合併症（入力があれば）
    if (formData.complications) {
      lines.push('【合併症】');
      lines.push(`　${formData.complications}`);
      lines.push('');
    }

    // 禁忌・注意事項（入力があれば）
    if (formData.contraindications) {
      lines.push('【禁忌・注意事項】');
      lines.push(`　${formData.contraindications}`);
      lines.push('');
    }

    // 治療方針（入力があれば）
    if (formData.objectiveNote) {
      lines.push('【治療方針・期待するゴール】');
      lines.push(`　${formData.objectiveNote}`);
      lines.push('');
    }

    // 備考（入力があれば）
    if (formData.note) {
      lines.push('【備考】');
      lines.push(`　${formData.note}`);
      lines.push('');
    }

    // 指示内容
    lines.push('');
    lines.push('【指示内容】');

    // PT訓練項目
    if (ptItems.length > 0) {
      lines.push('🔶理学療法🔶');
      ptItems.forEach(item => {
        lines.push(`　・${item}`);
      });
      lines.push('');
    }

    // OT訓練項目
    if (otItems.length > 0) {
      lines.push('🔶作業療法🔶');
      otItems.forEach(item => {
        lines.push(`　・${item}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  // 記事を作成
  async function createRehabInstruction(core, patientUuid, content, hospitalizationUuid = null) {
    const editorData = textToDraftJs(content);
    const performTime = Math.floor(Date.now() / 1000);

    const mutation = buildCreateClinicalDocumentMutation(
      patientUuid,
      editorData,
      performTime,
      CLINICAL_DOCUMENT_TYPE_UUID,
      hospitalizationUuid
    );

    const result = await core.query(mutation);

    if (!result?.data?.createClinicalDocument?.uuid) {
      throw new Error('記事作成に失敗しました');
    }

    return result.data.createClinicalDocument.uuid;
  }

  // ===========================================
  // 状態管理
  // ===========================================
  let cachedRehabCalcTypes = null;
  let cachedRehabPlans = null;

  // ===========================================
  // ユーティリティ関数
  // ===========================================

  function formatDate(date) {
    const d = date instanceof Date ? date : new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate()
    };
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatDateString(dateObj) {
    if (!dateObj) return '';
    return `${dateObj.year}/${String(dateObj.month).padStart(2, '0')}/${String(dateObj.day).padStart(2, '0')}`;
  }

  // ===========================================
  // API関数
  // ===========================================

  async function fetchRehabCalcTypes(core) {
    if (cachedRehabCalcTypes) return cachedRehabCalcTypes;

    const today = formatDate(new Date());
    const result = await core.query(QUERY_REHAB_CALC_TYPES, {
      input: { searchDate: today }
    });

    cachedRehabCalcTypes = result.data?.listAllRehabilitationCalculationTypes?.rehabilitationCalculationTypes || [];
    return cachedRehabCalcTypes;
  }

  async function fetchPatientDiseases(core, patientUuid) {
    const result = await core.query(QUERY_PATIENT_DISEASES, {
      input: {
        patientUuids: [patientUuid],
        patientCareType: 'PATIENT_CARE_TYPE_ANY',
        onlyMain: false
      }
    });

    return result.data?.listPatientReceiptDiseases?.patientReceiptDiseases || [];
  }

  async function fetchRehabPlans(core) {
    if (cachedRehabPlans) return cachedRehabPlans;

    const result = await core.query(QUERY_REHAB_PLANS, {});
    cachedRehabPlans = result.data?.listRehabilitationPlans?.rehabilitationPlans || [];
    return cachedRehabPlans;
  }

  // 現在入院中の入院情報を取得
  async function fetchCurrentHospitalization(core, patientUuid) {
    const query = `
      query {
        listPatientHospitalizations(input: {
          patientUuid: "${patientUuid}",
          pageSize: 10,
          pageToken: ""
        }) {
          hospitalizations {
            uuid
            state
          }
        }
      }
    `;
    const result = await core.query(query);
    const hospitalizations = result?.data?.listPatientHospitalizations?.hospitalizations || [];
    return hospitalizations.find(h => h.state === 'ADMITTED' || h.state === 'HOSPITALIZED' || h.state === 'WILL_DISCHARGE') || null;
  }

  async function createRehabOrder(core, orderData) {
    // インライン方式: 値を直接埋め込む（型が公開されていないため）
    const {
      patientUuid,
      doctorUuid,
      startDate,
      endDate,
      detail
    } = orderData;

    // { value: "uuid" } 形式から値を抽出
    const diseaseUuid = detail.patientReceiptDiseaseUuid?.value || detail.patientReceiptDiseaseUuid;
    const calcTypeUuid = detail.rehabilitationCalculationTypeUuid?.value || detail.rehabilitationCalculationTypeUuid;
    const startDateTypeUuid = detail.rehabilitationTherapyStartDateTypeUuid?.value || detail.rehabilitationTherapyStartDateTypeUuid;

    const planUuidsStr = detail.rehabilitationPlanUuids.map(u => `"${u}"`).join(', ');

    // 文字列のエスケープ（改行やクォートを処理）
    const escapeStr = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

    const mutation = `
      mutation CreateRehabilitationOrder {
        createRehabilitationOrder(input: {
          uuid: "",
          patientUuid: "${patientUuid}",
          doctorUuid: "${doctorUuid}",
          startDate: { year: ${startDate.year}, month: ${startDate.month}, day: ${startDate.day} },
          endDate: { year: ${endDate.year}, month: ${endDate.month}, day: ${endDate.day} },
          detail: {
            uuid: "",
            patientReceiptDiseaseUuid: { value: "${diseaseUuid}" },
            therapyStartDate: { year: ${detail.therapyStartDate.year}, month: ${detail.therapyStartDate.month}, day: ${detail.therapyStartDate.day} },
            planEvaluationDate: null,
            complications: "${escapeStr(detail.complications)}",
            contraindications: "${escapeStr(detail.contraindications)}",
            objectiveNote: "${escapeStr(detail.objectiveNote)}",
            place: "${escapeStr(detail.place)}",
            note: "${escapeStr(detail.note)}",
            noteForPt: "",
            noteForOt: "",
            noteForSt: "",
            rehabilitationPlanUuids: [${planUuidsStr}],
            rehabilitationCalculationTypeUuid: { value: "${calcTypeUuid}" },
            rehabilitationTherapyStartDateTypeUuid: { value: "${startDateTypeUuid}" },
            exclusionLimitDescription: "",
            exclusionLimitType: REHABILITATION_EXCLUSION_LIMIT_TYPE_NOT_APPLICABLE,
            rehabilitationKasanStartDate: null,
            rehabilitationKasanStartDateTypeUuid: null,
            acuteDiseasePatientReceiptDiseaseUuid: null,
            acutePhaseRehabilitationTargetConditions: []
          }
        }) {
          uuid
        }
      }
    `;

    const result = await core.query(mutation);
    return result.data?.createRehabilitationOrder;
  }

  // ===========================================
  // UI関数
  // ===========================================

  function createSelectElement(options, defaultValue = '') {
    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    `;

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === defaultValue) option.selected = true;
      select.appendChild(option);
    });

    return select;
  }

  function createDateInput(defaultValue = '') {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = defaultValue;
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    `;
    return input;
  }

  function createTextInput(placeholder = '') {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    `;
    return input;
  }

  function createCheckboxGroup(items, category) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    `;

    items.forEach(item => {
      const label = document.createElement('label');
      label.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        font-size: 13px;
        padding: 4px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background: #f9fafb;
      `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.uuid;
      checkbox.dataset.category = category;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(item.name));
      container.appendChild(label);
    });

    return container;
  }

  function createFormRow(labelText, element) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 16px;';

    const label = document.createElement('label');
    label.style.cssText = `
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 4px;
    `;
    label.textContent = labelText;

    row.appendChild(label);
    row.appendChild(element);
    return row;
  }

  // ===========================================
  // 確認ダイアログ
  // ===========================================

  function showInstructionConfirmDialog(core, patientUuid, formData, diseases, calcTypes, rehabPlans, currentHospitalization) {
    // 指示書の内容をプレビュー生成
    const instructionContent = formatInstructionContent(formData, diseases, calcTypes, rehabPlans);

    const content = document.createElement('div');
    content.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    // メッセージ
    const message = document.createElement('p');
    message.textContent = 'リハビリオーダーを作成しました。続けてリハビリ指示書（記事）も作成しますか？';
    message.style.cssText = 'margin: 0; color: #374151;';
    content.appendChild(message);

    // プレビュー
    const previewLabel = document.createElement('div');
    previewLabel.textContent = '作成される指示書：';
    previewLabel.style.cssText = 'font-weight: 500; color: #6b7280; font-size: 13px;';
    content.appendChild(previewLabel);

    const preview = document.createElement('pre');
    preview.textContent = instructionContent;
    preview.style.cssText = `
      margin: 0;
      padding: 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 12px;
      white-space: pre-wrap;
      max-height: 200px;
      overflow-y: auto;
    `;
    content.appendChild(preview);

    let confirmModal;
    confirmModal = core.ui.showModal({
      title: 'リハビリ指示書を作成',
      width: '500px',
      content: content,
      actions: [
        {
          label: 'スキップ',
          variant: 'secondary',
          onClick: () => {
            core.ui.showToast('オーダーを作成しました', 'success');
          }
        },
        {
          label: '指示書も作成',
          variant: 'primary',
          onClick: async () => {
            const spinner = core.ui.showSpinner('指示書を作成中...');
            try {
              const hospitalizationUuid = currentHospitalization?.uuid || null;
              await createRehabInstruction(core, patientUuid, instructionContent, hospitalizationUuid);
              spinner.close();
              const karteType = hospitalizationUuid ? '入院' : '外来';
              core.ui.showToast(`オーダーと指示書を作成しました（${karteType}カルテ）`, 'success');
              confirmModal.close();
            } catch (e) {
              spinner.close();
              console.error(`[${SCRIPT_NAME}]`, e);
              core.ui.showToast('指示書作成に失敗しました: ' + e.message, 'error');
            }
          }
        }
      ]
    });
  }

  // ===========================================
  // メイン処理
  // ===========================================

  async function showRehabOrderModal(core) {
    const patientUuid = core.getPatientUuid();
    if (!patientUuid) {
      core.ui.showToast('患者カルテを開いてください', 'error');
      return;
    }

    // スピナー表示
    const spinner = core.ui.showSpinner('データを取得中...');

    try {
      // データ取得（並列）
      const [rehabCalcTypes, diseases, rehabPlans, currentHospitalization] = await Promise.all([
        fetchRehabCalcTypes(core),
        fetchPatientDiseases(core, patientUuid),
        fetchRehabPlans(core),
        fetchCurrentHospitalization(core, patientUuid)
      ]);

      spinner.close();

      // 継続中かつ疑いでない病名のみフィルタ
      const activeDiseases = diseases.filter(d => d.outcome === 'CONTINUED' && !d.isSuspected);
      if (activeDiseases.length === 0) {
        core.ui.showToast('登録済みの病名がありません', 'error');
        return;
      }

      // デフォルトの運動器リハビリテーションを取得
      const defaultCalcType = rehabCalcTypes.find(t => t.uuid === UNDOUKI_REHAB_UUID) || rehabCalcTypes[0];
      if (!defaultCalcType) {
        core.ui.showToast('リハビリ算定区分が見つかりません', 'error');
        return;
      }

      // PT/OT分離
      const ptPlans = rehabPlans.filter(p => p.category === 'PT');
      const otPlans = rehabPlans.filter(p => p.category === 'OT');

      // フォーム構築
      const content = document.createElement('div');
      content.style.cssText = 'padding: 16px; max-height: 70vh; overflow-y: auto;';

      // 診断名
      const diseaseOptions = activeDiseases.map(d => ({
        value: d.uuid,
        label: `${d.masterDisease.name}${d.isMain ? ' [主]' : ''}`
      }));
      const diseaseSelect = createSelectElement(diseaseOptions);
      content.appendChild(createFormRow('診断名 *', diseaseSelect));

      // 算定区分（選択式、デフォルト：運動器リハ）
      const calcTypeOptions = rehabCalcTypes.map(t => ({
        value: t.uuid,
        label: t.name
      }));
      const calcTypeSelect = createSelectElement(calcTypeOptions, defaultCalcType.uuid);
      content.appendChild(createFormRow('リハビリ算定区分 *', calcTypeSelect));

      // 起算日種別
      const startDateTypeSelect = createSelectElement([]);
      content.appendChild(createFormRow('起算日種別 *', startDateTypeSelect));

      // 起算日
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startDateInput = createDateInput(todayStr);
      content.appendChild(createFormRow('起算日 *', startDateInput));

      // 期間
      const periodContainer = document.createElement('div');
      periodContainer.style.cssText = 'display: flex; gap: 8px; align-items: center;';
      const periodStartInput = createDateInput(todayStr);
      const periodEndInput = createDateInput();
      periodContainer.appendChild(periodStartInput);
      periodContainer.appendChild(document.createTextNode('〜'));
      periodContainer.appendChild(periodEndInput);
      content.appendChild(createFormRow('期間 *', periodContainer));

      // 算定区分変更時の更新関数
      const updateCalcTypeRelatedFields = () => {
        const selectedCalcType = rehabCalcTypes.find(t => t.uuid === calcTypeSelect.value);
        if (!selectedCalcType) return;

        // 起算日種別を更新
        startDateTypeSelect.innerHTML = '';
        selectedCalcType.therapyStartDateTypes.forEach(t => {
          const option = document.createElement('option');
          option.value = t.uuid;
          option.textContent = t.name;
          startDateTypeSelect.appendChild(option);
        });

        // 期間終了日を更新
        const periodDays = selectedCalcType.period?.value || 150;
        const newEndDate = addDays(new Date(periodStartInput.value), periodDays);
        periodEndInput.value = newEndDate.toISOString().split('T')[0];
      };

      // 算定区分変更イベント
      calcTypeSelect.addEventListener('change', updateCalcTypeRelatedFields);

      // 期間開始日変更時も終了日を更新
      periodStartInput.addEventListener('change', updateCalcTypeRelatedFields);

      // 起算日自動入力関数
      const updateTherapyStartDate = () => {
        // 起算日種別の選択テキストを取得
        const selectedOption = startDateTypeSelect.options[startDateTypeSelect.selectedIndex];
        if (!selectedOption) return;

        // 「発症日」の場合のみ自動入力
        if (selectedOption.textContent === '発症日') {
          const selectedDisease = activeDiseases.find(d => d.uuid === diseaseSelect.value);
          if (selectedDisease?.startDate) {
            const { year, month, day } = selectedDisease.startDate;
            // YYYY-MM-DD形式に変換
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            startDateInput.value = dateStr;
          }
        }
      };

      // 病名選択変更時に起算日を更新
      diseaseSelect.addEventListener('change', updateTherapyStartDate);

      // 起算日種別変更時に起算日を更新
      startDateTypeSelect.addEventListener('change', updateTherapyStartDate);

      // 初期値を設定
      updateCalcTypeRelatedFields();
      updateTherapyStartDate();

      // 訓練内容（PT）
      const ptCheckboxes = createCheckboxGroup(ptPlans, 'PT');
      content.appendChild(createFormRow('訓練内容（PT）', ptCheckboxes));

      // 訓練内容（OT）
      const otCheckboxes = createCheckboxGroup(otPlans, 'OT');
      content.appendChild(createFormRow('訓練内容（OT）', otCheckboxes));

      // セパレータ
      const separator = document.createElement('hr');
      separator.style.cssText = 'border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;';
      content.appendChild(separator);

      // オプション項目
      const complicationsInput = createTextInput('合併症があれば入力');
      content.appendChild(createFormRow('合併症', complicationsInput));

      const contraindicationsInput = createTextInput('禁忌・注意事項があれば入力');
      content.appendChild(createFormRow('禁忌・注意事項', contraindicationsInput));

      const objectiveInput = createTextInput('治療方針・期待するゴール');
      content.appendChild(createFormRow('治療方針', objectiveInput));

      const placeInput = createTextInput('実施場所');
      content.appendChild(createFormRow('実施場所', placeInput));

      const noteInput = createTextInput('備考');
      content.appendChild(createFormRow('備考', noteInput));

      // モーダル表示
      let modal;
      modal = core.ui.showModal({
        title: 'リハビリオーダー',
        width: '600px',
        content: content,
        actions: [
          { label: 'キャンセル', variant: 'secondary' },
          {
            label: '作成',
            variant: 'primary',
            onClick: async () => {
              // 選択された訓練内容を取得
              const selectedPlans = [];
              content.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                selectedPlans.push(cb.value);
              });

              // 日付をパース
              const parseDate = (str) => {
                const [y, m, d] = str.split('-').map(Number);
                return { year: y, month: m, day: d };
              };

              const input = {
                uuid: '',
                patientUuid: patientUuid,
                doctorUuid: await core.getMyUuid(),
                startDate: parseDate(periodStartInput.value),
                endDate: parseDate(periodEndInput.value),
                detail: {
                  uuid: '',
                  patientReceiptDiseaseUuid: { value: diseaseSelect.value },
                  therapyStartDate: parseDate(startDateInput.value),
                  planEvaluationDate: null,
                  complications: complicationsInput.value,
                  contraindications: contraindicationsInput.value,
                  objectiveNote: objectiveInput.value,
                  place: placeInput.value,
                  note: noteInput.value,
                  noteForPt: '',
                  noteForOt: '',
                  noteForSt: '',
                  rehabilitationPlanUuids: selectedPlans,
                  rehabilitationCalculationTypeUuid: { value: calcTypeSelect.value },
                  rehabilitationTherapyStartDateTypeUuid: { value: startDateTypeSelect.value },
                  exclusionLimitDescription: '',
                  exclusionLimitType: 'REHABILITATION_EXCLUSION_LIMIT_TYPE_NOT_APPLICABLE',
                  rehabilitationKasanStartDate: null,
                  rehabilitationKasanStartDateTypeUuid: null,
                  acuteDiseasePatientReceiptDiseaseUuid: null,
                  acutePhaseRehabilitationTargetConditions: []
                }
              };

              const createSpinner = core.ui.showSpinner('オーダー作成中...');
              try {
                const result = await createRehabOrder(core, input);
                createSpinner.close();

                if (result?.uuid) {
                  // オーダー作成成功 → 指示書作成の確認ダイアログを表示
                  modal.close();

                  // 指示書作成用のデータを準備
                  const formData = {
                    diseaseUuid: diseaseSelect.value,
                    calcTypeUuid: calcTypeSelect.value,
                    therapyStartDate: parseDate(startDateInput.value),
                    planUuids: selectedPlans,
                    complications: complicationsInput.value,
                    contraindications: contraindicationsInput.value,
                    objectiveNote: objectiveInput.value,
                    note: noteInput.value
                  };

                  // 確認ダイアログを表示
                  showInstructionConfirmDialog(core, patientUuid, formData, activeDiseases, rehabCalcTypes, rehabPlans, currentHospitalization);
                } else {
                  core.ui.showToast('オーダー作成に失敗しました', 'error');
                }
              } catch (e) {
                createSpinner.close();
                console.error(`[${SCRIPT_NAME}]`, e);
                core.ui.showToast('オーダー作成に失敗しました: ' + e.message, 'error');
              }
            }
          }
        ]
      });

    } catch (e) {
      spinner.close();
      console.error(`[${SCRIPT_NAME}]`, e);
      core.ui.showToast('データ取得に失敗しました', 'error');
    }
  }

  // ===========================================
  // 初期化
  // ===========================================

  async function init() {
    // HenryCore待機（サンドボックス対応）
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 10000) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return;
      }
    }

    const core = pageWindow.HenryCore;

    // プラグイン登録
    await core.registerPlugin({
      id: 'rehab-order',
      name: 'リハビリオーダー',
      icon: '🏃',
      description: 'リハビリオーダー・指示書作成（入院/外来対応）',
      version: VERSION,
      onClick: () => showRehabOrderModal(core)
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
