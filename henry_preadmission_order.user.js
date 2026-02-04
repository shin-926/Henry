// ==UserScript==
// @name         Henry 入院前オーダー
// @namespace    https://github.com/shin-926/Henry
// @version      0.4.0
// @description  入院予定患者に対して入院前オーダー（CT検査等）を一括作成
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_preadmission_order.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_preadmission_order.user.js
// ==/UserScript==

/*
 * 【入院前オーダー作成】
 *
 * ■ 使用場面
 * - 入院予定患者に対して、入院前にCT検査等のオーダーを作成したい場合
 *
 * ■ 機能
 * - Toolboxから起動
 * - 入院予定患者（7日以内）一覧から選択
 * - CTテンプレートを選択してオーダー作成
 *
 * ■ 対応オーダー
 * - CT検査（入院時CT）
 * - 生体検査（ECG + 血管伸展性）
 * - 血液検査（入院時採血セット）
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'PreadmissionOrder';
  const VERSION = GM_info.script.version;

  // ===========================================
  // オーダーテンプレート定義
  // ===========================================

  // CTテンプレート
  const CT_TEMPLATES = {
    'admission-ct': {
      name: '入院時CT（頭部〜骨盤）',
      description: '頭部・胸腹部骨盤腔の造影CT',
      bodySite: '胸部',
      note: '頭部、胸腹部、脊椎'
    }
  };

  // 生体検査テンプレート
  const BIOPSY_TEMPLATES = {
    'ecg-abi': {
      name: 'ECG + 血管伸展性',
      description: '心電図12誘導 + ABI/PWV',
      biopsyInspectionUuid: 'ae76defa-d9d2-4ff6-bf5e-88cf33b707bf',
      note: '動脈硬化検査付きECG',
      diagnoses: [
        {
          code: '160068410',
          name: 'ＥＣＧ１２',
          unitCode: 0,
          isStepValueRequiredForCalculation: false,
          minStepValue: 0,
          maxStepValue: 99999999,
          stepValue: 0,
          isSpecimenComment: false,
          isSpecimenInspection: false,
          applicableConsultationTypeCodes: ['60'],
          isDiminishing: { value: true },
          point: { value: 13000 },
          pointType: { value: 3 }
        },
        {
          code: '160071750',
          name: '血管伸展性',
          unitCode: 0,
          isStepValueRequiredForCalculation: false,
          minStepValue: 0,
          maxStepValue: 99999999,
          stepValue: 0,
          isSpecimenComment: false,
          isSpecimenInspection: false,
          applicableConsultationTypeCodes: ['60'],
          isDiminishing: { value: true },
          point: { value: 10000 },
          pointType: { value: 3 }
        }
      ]
    }
  };

  // 血液検査テンプレート（検体検査）
  const SPECIMEN_TEMPLATES = {
    'admission-blood': {
      name: '入院時採血セット',
      description: '入院時の標準血液検査（27項目）',
      specimenInspectionUuid: '63e3df8d-99d3-4aae-8fcb-41e4f26d41b3',  // 四国中検
      outsideInspectionLaboratoryUuid: '6fb3486c-09c3-4b03-8408-9535773c926d',
      note: '入院時検査',
      inspections: [
        { code: '0115', name: '総蛋白' },
        { code: '0117', name: 'アルブミン' },
        { code: '0127', name: 'ALT(GPT)' },
        { code: '0126', name: 'AST(GOT)' },
        { code: '9217', name: 'ALP(IFCC)' },
        { code: '9218', name: 'LD(IFCC)' },
        { code: '0181', name: '尿酸' },
        { code: '0182', name: '尿素窒素' },
        { code: '0183', name: 'CRE' },
        { code: '0225', name: 'HDL−C' },
        { code: '0233', name: 'LDL−C' },
        { code: '0228', name: '中性脂肪' },
        { code: '0434', name: 'CRP' },
        { code: '0601', name: '末梢血液一般' },
        { code: '0132', name: 'γ−GT' },
        { code: '0134', name: 'CK' },
        { code: '0261', name: 'グルコース' },
        { code: '0201', name: 'Na' },
        { code: '0203', name: 'カリウム' },
        { code: '0254', name: 'prBNP' },
        { code: '0401', name: 'HBs抗原 定性' },
        { code: '0419', name: 'HCV−II' },
        { code: '0470', name: '(梅毒)RPR定性' },
        { code: '0473', name: '(梅毒)TP抗体性' },
        { code: '0204', name: 'Ca' },
        { code: '0205', name: 'P' }
      ]
    }
  };

  // 全テンプレート（UI表示用）
  const ALL_TEMPLATES = {
    ct: { label: 'CT検査', templates: CT_TEMPLATES },
    biopsy: { label: '生体検査', templates: BIOPSY_TEMPLATES },
    specimen: { label: '血液検査', templates: SPECIMEN_TEMPLATES }
  };

  // ===========================================
  // GraphQL クエリ
  // ===========================================

  // 部位一覧取得
  const LIST_BODY_SITES_QUERY = `
    query ListLocalBodySites {
      listLocalBodySites(input: { query: "" }) {
        bodySites {
          uuid
          name
          lateralityRequirement
        }
      }
    }
  `;

  // 入院予定患者取得（ListPatientsV2 + hospitalizationFilter.states: ['SCHEDULED']）
  const LIST_SCHEDULED_PATIENTS_QUERY = `
    query ListPatientsV2($input: ListPatientsV2RequestInput!) {
      listPatientsV2(input: $input) {
        entries {
          patient {
            uuid
            serialNumber
            fullName
            fullNamePhonetic
            detail {
              sexType
              birthDate { year month day }
            }
          }
          hospitalization {
            uuid
            state
            startDate { year month day }
            hospitalizationDoctor {
              doctor { uuid name }
            }
            statusHospitalizationLocation {
              ward { name }
              room { name }
            }
          }
        }
        nextPageToken
      }
    }
  `;

  // ===========================================
  // API関数
  // ===========================================

  /**
   * 入院予定患者（SCHEDULED状態）を取得
   * @param {number} daysAhead - 何日先まで取得するか（デフォルト: 7日）
   * @returns {Promise<Array>} 入院予定患者リスト
   */
  async function fetchScheduledHospitalizations(daysAhead = 7) {
    const core = window.HenryCore;
    if (!core) {
      console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
      return [];
    }

    const allScheduled = [];

    try {
      const variables = {
        input: {
          generalFilter: {
            query: '',
            patientCareType: 'PATIENT_CARE_TYPE_ANY'
          },
          hospitalizationFilter: {
            doctorUuid: null,
            roomUuids: [],
            wardUuids: [],
            states: [],
            onlyLatest: true
          },
          sorts: [],
          pageSize: 100,
          pageToken: ''
        }
      };

      const result = await core.query(LIST_SCHEDULED_PATIENTS_QUERY, variables, { endpoint: '/graphql' });

      if (result?.errors) {
        console.error(`[${SCRIPT_NAME}] GraphQL errors:`, result.errors);
        return [];
      }

      const entries = result?.data?.listPatientsV2?.entries || [];
      console.log(`[${SCRIPT_NAME}] 取得した患者数: ${entries.length}`);

      // 入院情報を持つ患者のstate値をログ出力（デバッグ用）
      const hospEntries = entries.filter(e => e.hospitalization);
      console.log(`[${SCRIPT_NAME}] 入院情報あり: ${hospEntries.length}件`);
      if (hospEntries.length > 0) {
        const states = [...new Set(hospEntries.map(e => e.hospitalization.state))];
        console.log(`[${SCRIPT_NAME}] state値一覧:`, states);
      }

      // 7日以内の入院予定患者のみフィルタ
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + daysAhead);

      for (const entry of entries) {
        const hosp = entry.hospitalization;
        const patient = entry.patient;
        // 入院予定患者は WILL_ADMIT
        if (!hosp || hosp.state !== 'WILL_ADMIT') continue;

        const startDate = hosp.startDate;
        if (!startDate) continue;

        const hospDate = new Date(startDate.year, startDate.month - 1, startDate.day);
        if (hospDate < today || hospDate > maxDate) continue;

        const wardName = hosp.statusHospitalizationLocation?.ward?.name || '';
        const roomName = hosp.statusHospitalizationLocation?.room?.name || '';

        allScheduled.push({
          uuid: hosp.uuid,
          state: hosp.state,
          startDate: hosp.startDate,
          patient: {
            uuid: patient.uuid,
            serialNumber: patient.serialNumber,
            fullName: patient.fullName,
            fullNamePhonetic: patient.fullNamePhonetic,
            detail: patient.detail
          },
          hospitalizationDoctor: hosp.hospitalizationDoctor,
          wardName,
          roomName
        });
      }

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院予定取得エラー:`, e?.message || e);
      return [];
    }

    // 入院予定日でソート（近い順）
    allScheduled.sort((a, b) => {
      const dateA = new Date(a.startDate.year, a.startDate.month - 1, a.startDate.day);
      const dateB = new Date(b.startDate.year, b.startDate.month - 1, b.startDate.day);
      return dateA - dateB;
    });

    console.log(`[${SCRIPT_NAME}] 入院予定患者: ${allScheduled.length}名`);
    return allScheduled;
  }

  // ===========================================
  // 状態管理
  // ===========================================
  let bodySitesCache = null;

  // ===========================================
  // API補助関数
  // ===========================================

  /**
   * 部位一覧を取得（キャッシュ付き）
   */
  async function fetchBodySites() {
    if (bodySitesCache) return bodySitesCache;

    const core = window.HenryCore;
    try {
      const result = await core.query(LIST_BODY_SITES_QUERY);
      bodySitesCache = result.data?.listLocalBodySites?.bodySites || [];
      console.log(`[${SCRIPT_NAME}] 部位一覧取得: ${bodySitesCache.length}件`);
      return bodySitesCache;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 部位一覧取得失敗:`, e?.message || e);
      return [];
    }
  }

  /**
   * 部位名からUUIDを検索
   */
  function findBodySiteUuid(bodySiteName, bodySites) {
    const site = bodySites.find(s => s.name === bodySiteName);
    return site?.uuid || null;
  }

  /**
   * UUID生成
   */
  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * GraphQL文字列エスケープ
   */
  function escapeGraphQLString(str) {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * CTオーダーを作成
   */
  async function createImagingOrder(orderData) {
    const core = window.HenryCore;
    if (!core) {
      throw new Error('HenryCore が見つかりません');
    }

    const { patientUuid, doctorUuid, templateKey, orderDate } = orderData;

    // テンプレート取得
    const template = CT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`テンプレート「${templateKey}」が見つかりません`);
    }

    // 部位UUID取得
    const bodySites = await fetchBodySites();
    const bodySiteUuid = findBodySiteUuid(template.bodySite, bodySites);
    if (!bodySiteUuid) {
      throw new Error(`部位「${template.bodySite}」が見つかりません`);
    }

    const seriesUuid = generateUuid();
    const noteText = escapeGraphQLString(template.note || template.name);

    // インライン方式でmutationを構築
    const mutation = `
      mutation CreateImagingOrder {
        createImagingOrder(input: {
          uuid: ""
          patientUuid: "${patientUuid}"
          doctorUuid: "${doctorUuid}"
          date: { year: ${orderDate.year}, month: ${orderDate.month}, day: ${orderDate.day} }
          detail: {
            uuid: ""
            imagingModality: IMAGING_MODALITY_CT
            note: ""
            condition: {
              ct: {
                series: [{
                  uuid: "${seriesUuid}"
                  bodySiteUuid: "${bodySiteUuid}"
                  filmCount: null
                  configuration: ""
                  note: "${noteText}"
                  laterality: LATERALITY_NONE
                  medicines: []
                  isAccountingIgnored: false
                }]
              }
            }
          }
          sessionUuid: null
          revokeDescription: ""
          encounterId: null
          extendedInsuranceCombinationId: null
          saveAsDraft: false
        }) {
          uuid
          orderStatus
        }
      }
    `;

    console.log(`[${SCRIPT_NAME}] CreateImagingOrder 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createImagingOrder?.uuid) {
      console.log(`[${SCRIPT_NAME}] オーダー作成成功: ${result.data.createImagingOrder.uuid}`);
      return result.data.createImagingOrder;
    } else {
      console.error(`[${SCRIPT_NAME}] オーダー作成失敗:`, result);
      throw new Error('オーダー作成に失敗しました');
    }
  }

  /**
   * 生体検査オーダーを作成
   */
  async function createBiopsyInspectionOrder(orderData) {
    const core = window.HenryCore;
    if (!core) {
      throw new Error('HenryCore が見つかりません');
    }

    const { patientUuid, doctorUuid, templateKey, orderDate } = orderData;

    // テンプレート取得
    const template = BIOPSY_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`テンプレート「${templateKey}」が見つかりません`);
    }

    // consultationDiagnosesを構築
    const consultationDiagnoses = template.diagnoses.map(diag => ({
      uuid: generateUuid(),
      orderType: 'EXAMINATION',
      paramValue: null,
      isCalculatable: true,
      masterDiagnosis: diag,
      comments: [],
      bodyPartComments: [],
      specimenDiagnosis: null,
      isFeeForService: false
    }));

    const noteText = escapeGraphQLString(template.note || template.name);

    // インライン方式でmutationを構築
    const consultationDiagnosesJson = JSON.stringify(consultationDiagnoses)
      .replace(/"/g, '\\"');

    const mutation = `
      mutation CreateBiopsyInspectionOrder {
        createBiopsyInspectionOrder(input: {
          uuid: ""
          patientUuid: "${patientUuid}"
          doctorUuid: "${doctorUuid}"
          inspectionDate: { year: ${orderDate.year}, month: ${orderDate.month}, day: ${orderDate.day} }
          biopsyInspectionOrderBiopsyInspections: [{
            uuid: ""
            biopsyInspectionUuid: "${template.biopsyInspectionUuid}"
            consultationDiagnoses: ${JSON.stringify(consultationDiagnoses)}
            consultationEquipments: []
            consultationMedicines: []
            consultationOutsideInspections: []
            urgency: false
            note: ""
          }]
          note: "${noteText}"
          revokeDescription: ""
          encounterId: null
          saveAsDraft: false
          extendedInsuranceCombinationId: null
          isDeleted: false
        }) {
          uuid
          orderStatus
        }
      }
    `;

    console.log(`[${SCRIPT_NAME}] CreateBiopsyInspectionOrder 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createBiopsyInspectionOrder?.uuid) {
      console.log(`[${SCRIPT_NAME}] 生体検査オーダー作成成功: ${result.data.createBiopsyInspectionOrder.uuid}`);
      return result.data.createBiopsyInspectionOrder;
    } else {
      console.error(`[${SCRIPT_NAME}] 生体検査オーダー作成失敗:`, result);
      throw new Error('生体検査オーダー作成に失敗しました');
    }
  }

  /**
   * 血液検査オーダーを作成
   */
  async function createSpecimenInspectionOrder(orderData) {
    const core = window.HenryCore;
    if (!core) {
      throw new Error('HenryCore が見つかりません');
    }

    const { patientUuid, doctorUuid, templateKey, orderDate } = orderData;

    // テンプレート取得
    const template = SPECIMEN_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`テンプレート「${templateKey}」が見つかりません`);
    }

    const labUuid = template.outsideInspectionLaboratoryUuid;

    // consultationOutsideInspections を構築
    const consultationOutsideInspections = template.inspections.map(insp => ({
      uuid: generateUuid(),
      comments: [],
      isCalculatable: true,
      isFeeForService: false,
      masterOutsideInspection: {
        outsideInspectionId: `${labUuid}_${insp.code}`,
        outsideInspectionLaboratoryUuid: labUuid,
        inspectionCode: insp.code,
        parentInspectionCode: null,
        name: insp.name,
        nameKana: '',
        amountNeeded: null,
        minAmountNeeded: null,
        preservationMethod: null,
        standardValuePrecision: null,
        standardValueUnit: null,
        minMaleStandardValue: null,
        maxMaleStandardValue: null,
        minFemaleStandardValue: null,
        maxFemaleStandardValue: null,
        rangeMaleStandardValue: null,
        rangeFemaleStandardValue: null,
        isUrineCollection: false,
        startDate: { year: 2020, month: 1, day: 1 },
        endDate: null,
        searchCategory: null
      },
      nonHealthcareSystemOutsideInspection: null,
      outsideInspectionLaboratory: { uuid: labUuid },
      specimenDiagnosis: null
    }));

    const noteText = escapeGraphQLString(template.note || template.name);

    // インライン方式でmutationを構築
    const mutation = `
      mutation CreateSpecimenInspectionOrder {
        createSpecimenInspectionOrder(input: {
          uuid: ""
          patientUuid: "${patientUuid}"
          doctorUuid: "${doctorUuid}"
          inspectionDate: { year: ${orderDate.year}, month: ${orderDate.month}, day: ${orderDate.day} }
          specimenInspectionOrderSpecimenInspections: [{
            uuid: ""
            specimenInspectionUuid: "${template.specimenInspectionUuid}"
            consultationDiagnoses: []
            consultationEquipments: []
            consultationMedicines: []
            consultationOutsideInspections: ${JSON.stringify(consultationOutsideInspections)}
            urgency: false
            note: ""
          }]
          note: "${noteText}"
          revokeDescription: ""
          encounterId: null
          saveAsDraft: false
          extendedInsuranceCombinationId: null
          sendInspectionRequest: false
        }) {
          uuid
          orderStatus
        }
      }
    `;

    console.log(`[${SCRIPT_NAME}] CreateSpecimenInspectionOrder 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createSpecimenInspectionOrder?.uuid) {
      console.log(`[${SCRIPT_NAME}] 血液検査オーダー作成成功: ${result.data.createSpecimenInspectionOrder.uuid}`);
      return result.data.createSpecimenInspectionOrder;
    } else {
      console.error(`[${SCRIPT_NAME}] 血液検査オーダー作成失敗:`, result);
      throw new Error('血液検査オーダー作成に失敗しました');
    }
  }

  // ===========================================
  // ユーティリティ関数
  // ===========================================

  function formatDate(dateObj) {
    if (!dateObj) return '';
    const { year, month, day } = dateObj;
    return `${month}/${day}（${getDayOfWeek(year, month, day)}）`;
  }

  function getDayOfWeek(year, month, day) {
    const date = new Date(year, month - 1, day);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  function calculateAge(birthDate) {
    if (!birthDate?.year) return null;
    const today = new Date();
    const birth = new Date(birthDate.year, (birthDate.month || 1) - 1, birthDate.day || 1);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // ===========================================
  // UI関数
  // ===========================================

  /**
   * 患者選択モーダルを表示
   */
  async function showPatientSelectModal() {
    const core = window.HenryCore;
    const spinner = core.ui.showSpinner('入院予定患者を取得中...');

    try {
      const patients = await fetchScheduledHospitalizations(7);
      spinner.close();

      if (patients.length === 0) {
        core.ui.showToast('7日以内の入院予定患者がいません', 'info');
        return;
      }

      // モーダル作成
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1500;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
      `;

      // ヘッダー
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      header.innerHTML = `
        <h3 style="margin: 0; font-size: 18px; color: #333;">入院前オーダー</h3>
        <button id="close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
      `;

      // 説明
      const description = document.createElement('div');
      description.style.cssText = 'padding: 12px 20px; color: #666; font-size: 13px; border-bottom: 1px solid #e0e0e0;';
      description.textContent = '入院予定患者（7日以内）';

      // 検索ボックス
      const searchBox = document.createElement('div');
      searchBox.style.cssText = 'padding: 12px 20px; border-bottom: 1px solid #e0e0e0;';
      searchBox.innerHTML = `
        <input type="text" id="patient-search" placeholder="患者名で検索..." style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        ">
      `;

      // 患者リスト
      const listContainer = document.createElement('div');
      listContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      `;

      function renderPatientList(filterText = '') {
        const filtered = patients.filter(p => {
          const name = p.patient?.fullName || '';
          const kana = p.patient?.fullNamePhonetic || '';
          return name.includes(filterText) || kana.includes(filterText);
        });

        listContainer.innerHTML = '';

        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">該当する患者がいません</div>';
          return;
        }

        // 入院予定日でグループ化
        const byDate = new Map();
        for (const p of filtered) {
          const dateStr = formatDate(p.startDate);
          if (!byDate.has(dateStr)) {
            byDate.set(dateStr, []);
          }
          byDate.get(dateStr).push(p);
        }

        for (const [dateStr, datePatients] of byDate) {
          // 日付ヘッダー
          const dateHeader = document.createElement('div');
          dateHeader.style.cssText = `
            padding: 8px 20px;
            background: #f5f5f5;
            font-size: 13px;
            color: #333;
            font-weight: 500;
          `;
          dateHeader.textContent = `▼ ${dateStr}`;
          listContainer.appendChild(dateHeader);

          for (const p of datePatients) {
            // 患者行
            const row = document.createElement('div');
            row.style.cssText = `
              padding: 12px 20px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 12px;
              border-bottom: 1px solid #f0f0f0;
              transition: background 0.15s;
            `;
            row.addEventListener('mouseover', () => row.style.background = '#f8f9fa');
            row.addEventListener('mouseout', () => row.style.background = 'transparent');

            const serialNumber = p.patient?.serialNumber || '';
            const doctorName = p.hospitalizationDoctor?.doctor?.name || '−';

            row.innerHTML = `
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: 500; color: #333;">${p.patient?.fullName || '不明'}</div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">（${serialNumber}）担当: ${doctorName}</div>
              </div>
              <div style="color: #1976d2; font-size: 13px;">選択</div>
            `;

            row.addEventListener('click', () => {
              overlay.remove();
              showOrderSettingsModal(p);
            });

            listContainer.appendChild(row);
          }
        }
      }

      renderPatientList();

      modal.appendChild(header);
      modal.appendChild(description);
      modal.appendChild(searchBox);
      modal.appendChild(listContainer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // イベント
      const closeBtn = header.querySelector('#close-btn');
      closeBtn.addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      const searchInput = searchBox.querySelector('#patient-search');
      searchInput.addEventListener('input', (e) => {
        renderPatientList(e.target.value);
      });
      searchInput.focus();

    } catch (e) {
      spinner.close();
      console.error(`[${SCRIPT_NAME}] エラー:`, e);
      core.ui.showToast('患者一覧の取得に失敗しました', 'error');
    }
  }

  /**
   * オーダー設定モーダルを表示
   */
  function showOrderSettingsModal(patientData) {
    const core = window.HenryCore;

    const patientName = patientData.patient?.fullName || '不明';
    const admissionDate = formatDate(patientData.startDate);
    const doctorName = patientData.hospitalizationDoctor?.doctor?.name || '−';

    // モーダルコンテンツ
    const content = document.createElement('div');
    content.style.cssText = 'padding: 16px;';

    // 患者情報
    const patientInfo = document.createElement('div');
    patientInfo.style.cssText = 'margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 6px;';
    patientInfo.innerHTML = `
      <div style="font-size: 16px; font-weight: 500; color: #333; margin-bottom: 8px;">${patientName}</div>
      <div style="font-size: 13px; color: #666;">入院予定日: ${admissionDate}</div>
      <div style="font-size: 13px; color: #666;">担当医: ${doctorName}</div>
    `;
    content.appendChild(patientInfo);

    // オーダー種別選択
    const orderTypeLabel = document.createElement('label');
    orderTypeLabel.style.cssText = 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;';
    orderTypeLabel.textContent = 'オーダー種別';
    content.appendChild(orderTypeLabel);

    const orderTypeSelect = document.createElement('select');
    orderTypeSelect.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 12px;
    `;
    for (const [typeKey, typeData] of Object.entries(ALL_TEMPLATES)) {
      const option = document.createElement('option');
      option.value = typeKey;
      option.textContent = typeData.label;
      orderTypeSelect.appendChild(option);
    }
    content.appendChild(orderTypeSelect);

    // テンプレート選択
    const templateLabel = document.createElement('label');
    templateLabel.style.cssText = 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;';
    templateLabel.textContent = 'テンプレート';
    content.appendChild(templateLabel);

    const templateSelect = document.createElement('select');
    templateSelect.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 16px;
    `;

    // テンプレート選択肢を更新する関数
    function updateTemplateOptions() {
      const selectedType = orderTypeSelect.value;
      const templates = ALL_TEMPLATES[selectedType]?.templates || {};
      templateSelect.innerHTML = '';
      for (const [key, template] of Object.entries(templates)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = template.name;
        templateSelect.appendChild(option);
      }
    }

    updateTemplateOptions();
    orderTypeSelect.addEventListener('change', updateTemplateOptions);
    content.appendChild(templateSelect);

    // オーダー日選択
    const orderDateLabel = document.createElement('label');
    orderDateLabel.style.cssText = 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 8px;';
    orderDateLabel.textContent = 'オーダー日';
    content.appendChild(orderDateLabel);

    const orderDateContainer = document.createElement('div');
    orderDateContainer.style.cssText = 'margin-bottom: 16px;';

    // 入院日オプション
    const admissionDateOption = createRadioOption('order-date', 'admission', `入院日（${admissionDate}）`, true);
    orderDateContainer.appendChild(admissionDateOption);

    // 入院前日オプション
    const prevDate = new Date(patientData.startDate.year, patientData.startDate.month - 1, patientData.startDate.day);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = `${prevDate.getMonth() + 1}/${prevDate.getDate()}（${getDayOfWeek(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate())}）`;
    const prevDayOption = createRadioOption('order-date', 'prev-day', `入院前日（${prevDateStr}）`, false);
    orderDateContainer.appendChild(prevDayOption);

    // 指定日オプション
    const customDateOption = document.createElement('div');
    customDateOption.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 8px;';
    customDateOption.innerHTML = `
      <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 14px; color: #333;">
        <input type="radio" name="order-date" value="custom">
        指定日:
      </label>
      <input type="date" id="custom-date" style="padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;" disabled>
    `;
    const customRadio = customDateOption.querySelector('input[type="radio"]');
    const customDateInput = customDateOption.querySelector('#custom-date');

    // ラジオボタンの変更イベント
    orderDateContainer.addEventListener('change', (e) => {
      if (e.target.name === 'order-date') {
        customDateInput.disabled = e.target.value !== 'custom';
      }
    });
    customRadio.addEventListener('change', () => {
      customDateInput.disabled = false;
      customDateInput.focus();
    });

    orderDateContainer.appendChild(customDateOption);
    content.appendChild(orderDateContainer);

    // モーダル表示
    let modal;
    modal = core.ui.showModal({
      title: 'CTオーダー作成',
      width: '450px',
      content: content,
      actions: [
        { label: 'キャンセル', variant: 'secondary' },
        {
          label: '作成',
          variant: 'primary',
          onClick: async () => {
            // 選択されたオーダー日を取得
            const selectedDate = document.querySelector('input[name="order-date"]:checked')?.value;
            let orderDate;

            if (selectedDate === 'admission') {
              orderDate = patientData.startDate;
            } else if (selectedDate === 'prev-day') {
              orderDate = {
                year: prevDate.getFullYear(),
                month: prevDate.getMonth() + 1,
                day: prevDate.getDate()
              };
            } else if (selectedDate === 'custom' && customDateInput.value) {
              const [y, m, d] = customDateInput.value.split('-').map(Number);
              orderDate = { year: y, month: m, day: d };
            } else {
              core.ui.showToast('オーダー日を選択してください', 'error');
              return;
            }

            const selectedOrderType = orderTypeSelect.value;
            const selectedTemplate = templateSelect.value;

            modal.close();
            showConfirmModal(patientData, selectedOrderType, selectedTemplate, orderDate);
          }
        }
      ]
    });
  }

  /**
   * 確認モーダルを表示
   */
  function showConfirmModal(patientData, orderType, templateKey, orderDate) {
    const core = window.HenryCore;

    const typeData = ALL_TEMPLATES[orderType];
    const template = typeData?.templates[templateKey];
    const patientName = patientData.patient?.fullName || '不明';
    const orderDateStr = `${orderDate.year}/${orderDate.month}/${orderDate.day}`;

    const content = document.createElement('div');
    content.innerHTML = `
      <p style="margin: 0 0 16px 0; color: #333;">以下の内容でオーダーを作成します。</p>
      <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 14px; color: #333;">
        <div><strong>患者:</strong> ${patientName}</div>
        <div style="margin-top: 4px;"><strong>種別:</strong> ${typeData?.label || orderType}</div>
        <div style="margin-top: 4px;"><strong>テンプレート:</strong> ${template?.name || templateKey}</div>
        <div style="margin-top: 4px;"><strong>オーダー日:</strong> ${orderDateStr}</div>
      </div>
    `;

    let modal;
    modal = core.ui.showModal({
      title: '確認',
      width: '400px',
      content: content,
      actions: [
        { label: 'キャンセル', variant: 'secondary' },
        {
          label: '作成',
          variant: 'primary',
          onClick: async () => {
            const spinner = core.ui.showSpinner('オーダーを作成中...');

            try {
              const orderData = {
                patientUuid: patientData.patient?.uuid,
                hospitalizationUuid: patientData.uuid,
                templateKey: templateKey,
                orderDate: orderDate,
                doctorUuid: patientData.hospitalizationDoctor?.doctor?.uuid
              };

              // オーダー種別に応じて適切な関数を呼び出し
              if (orderType === 'ct') {
                await createImagingOrder(orderData);
              } else if (orderType === 'biopsy') {
                await createBiopsyInspectionOrder(orderData);
              } else if (orderType === 'specimen') {
                await createSpecimenInspectionOrder(orderData);
              } else {
                throw new Error(`不明なオーダー種別: ${orderType}`);
              }

              spinner.close();
              modal.close();
              core.ui.showToast('オーダーを作成しました', 'success');
            } catch (e) {
              spinner.close();
              console.error(`[${SCRIPT_NAME}] オーダー作成エラー:`, e);
              core.ui.showToast(e.message || 'オーダー作成に失敗しました', 'error');
            }
          }
        }
      ]
    });
  }

  /**
   * ラジオボタンオプションを作成
   */
  function createRadioOption(name, value, label, checked = false) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 8px;';
    container.innerHTML = `
      <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 14px; color: #333;">
        <input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
        ${label}
      </label>
    `;
    return container;
  }

  // ===========================================
  // 初期化
  // ===========================================

  function init() {
    const core = window.HenryCore;
    if (!core) {
      console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
      return;
    }

    core.registerPlugin({
      id: 'preadmission-order',
      name: '入院前オーダー',
      description: '入院予定患者にCT検査等のオーダーを作成',
      icon: '📋',
      category: 'karte',
      enabled: true,
      onClick: showPatientSelectModal
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  if (window.HenryCore) {
    init();
  } else {
    window.addEventListener('HenryCoreReady', init, { once: true });
  }

})();
