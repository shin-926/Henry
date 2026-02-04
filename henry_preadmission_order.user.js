// ==UserScript==
// @name         Henry 入院前オーダー
// @namespace    https://github.com/shin-926/Henry
// @version      0.13.0
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
 * - 6種類のオーダーを一覧表示、チェックボックスで複数選択して一括作成
 *
 * ■ 対応オーダー
 * - CT検査（入院時CT）
 * - 生体検査（ECG + 血管伸展性）
 * - 血液検査（入院時採血セット）
 * - リハビリ（運動器リハビリテーション）
 * - 入院時指示（食事・安静度・モニター等）
 * - 指示簿（入院）（発熱時・不眠時等の臨時指示）
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

  // リハビリテンプレート
  const REHAB_TEMPLATES = {
    'admission-rehab': {
      name: '入院リハビリ（運動器）',
      description: '運動器リハビリテーション',
      rehabilitationCalculationTypeUuid: 'c86098b6-af99-49f3-b229-b3119eef5372'
    }
  };

  // 入院時指示テンプレート
  const INSTRUCTION_TEMPLATES = {
    'admission-instruction': {
      name: '入院時指示',
      description: '入院時の食事・安静度・モニター等の指示',
      clinicalDocumentCustomTypeUuid: 'b9d02078-751e-4ec8-a17a-f31892997e88'
    }
  };

  // 指示簿テンプレート
  const STANDING_ORDER_TEMPLATES = {
    'standing-order': {
      name: '指示簿（入院）',
      description: '入院時の臨時指示（発熱時、不眠時等）',
      clinicalDocumentCustomTypeUuid: 'c4e74c15-b9d3-4b35-974d-6fe4307d8f43'
    }
  };

  // デフォルトの指示簿内容
  const DEFAULT_STANDING_ORDER = `【呼吸状態悪化時】
・92%以下で酸素2Lマスク開始し、SpO2 92％以上をkeep
・酸素投与量　Min off　Max 10L/min

【発熱時、疼痛時】
・カロナール(500) 0.5錠もしくは 1錠内服
・カロナール坐剤(400) 0.5個もしくは1個挿肛
・ロキソプロフェン 1錠内服

【不眠時】
・ブロチゾラム1錠内服

【血圧上昇時(収縮期180mmHg以上）】
・アムロジピン2.5㎎ 1錠内服

【便秘時】
・グリセリン浣腸 1個使用
・ピコスルファート 10-20滴使用

【低血糖時】
・50Tz 40mL 静注
・ブドウ糖20g 内服`;

  // 入院時指示の選択肢
  const INSTRUCTION_OPTIONS = {
    meal: {
      label: '食事',
      options: ['常食', '糖尿病食', '心臓食', '腎臓食', 'その他']
    },
    monitor: {
      label: 'モニター',
      options: ['要', '不要']
    },
    urine: {
      label: '尿測',
      options: ['要', '不要']
    },
    bathing: {
      label: '保清',
      options: ['入浴', '清拭']
    },
    activity: {
      label: '安静度',
      options: ['フリー', 'ベッド上安静', 'ポータブルトイレのみ可']
    },
    mobility: {
      label: '補助具',
      options: ['なし', '杖', '歩行器', '車いす']
    }
  };

  // 全テンプレート（UI表示用）
  const ALL_TEMPLATES = {
    imaging: { label: '画像検査', templates: CT_TEMPLATES },
    biopsy: { label: '生体検査', templates: BIOPSY_TEMPLATES },
    specimen: { label: '血液検査', templates: SPECIMEN_TEMPLATES },
    rehab: { label: 'リハビリ', templates: REHAB_TEMPLATES },
    instruction: { label: '入院時指示', templates: INSTRUCTION_TEMPLATES },
    standingOrder: { label: '指示簿', templates: STANDING_ORDER_TEMPLATES }
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

  // リハビリ算定区分一覧取得
  const LIST_REHAB_CALC_TYPES_QUERY = `
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
  const LIST_PATIENT_DISEASES_QUERY = `
    query ListPatientReceiptDiseases($input: ListPatientReceiptDiseasesRequestInput!) {
      listPatientReceiptDiseases(input: $input) {
        patientReceiptDiseases {
          uuid
          masterDisease { code name }
          masterModifiers { name code position }
          customDiseaseName { value }
          isMain
          isSuspected
          outcome
          startDate { year month day }
          endDate { year month day }
        }
      }
    }
  `;

  // リハビリ計画一覧取得（PT/OT訓練項目）
  const LIST_REHAB_PLANS_QUERY = `
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
  let rehabCalcTypesCache = null;
  let rehabPlansCache = null;

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

    const { patientUuid, doctorUuid, templateKey, orderDate, ctNote } = orderData;

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
    // ctNoteが渡されていればそれを使用、なければテンプレートのnoteを使用
    const noteText = escapeGraphQLString(ctNote ?? template.note ?? template.name);

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

  /**
   * リハビリ算定区分一覧を取得（キャッシュ付き）
   */
  async function fetchRehabCalcTypes() {
    if (rehabCalcTypesCache) return rehabCalcTypesCache;

    const core = window.HenryCore;
    const today = new Date();
    const searchDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    };

    try {
      const result = await core.query(LIST_REHAB_CALC_TYPES_QUERY, {
        input: { searchDate }
      });
      rehabCalcTypesCache = result.data?.listAllRehabilitationCalculationTypes?.rehabilitationCalculationTypes || [];
      console.log(`[${SCRIPT_NAME}] リハビリ算定区分取得: ${rehabCalcTypesCache.length}件`);
      return rehabCalcTypesCache;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] リハビリ算定区分取得失敗:`, e?.message || e);
      return [];
    }
  }

  /**
   * 患者の病名一覧を取得
   */
  async function fetchPatientDiseases(patientUuid) {
    const core = window.HenryCore;
    try {
      const result = await core.query(LIST_PATIENT_DISEASES_QUERY, {
        input: {
          patientUuids: [patientUuid],
          patientCareType: 'PATIENT_CARE_TYPE_ANY',
          onlyMain: false
        }
      });
      const diseases = result.data?.listPatientReceiptDiseases?.patientReceiptDiseases || [];
      // 継続中かつ疑いでない病名のみフィルタ
      return diseases.filter(d => d.outcome === 'CONTINUED' && !d.isSuspected);
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 病名取得失敗:`, e?.message || e);
      return [];
    }
  }

  /**
   * リハビリ計画一覧を取得（キャッシュ付き）
   */
  async function fetchRehabPlans() {
    if (rehabPlansCache) return rehabPlansCache;

    const core = window.HenryCore;
    try {
      const result = await core.query(LIST_REHAB_PLANS_QUERY, {});
      rehabPlansCache = result.data?.listRehabilitationPlans?.rehabilitationPlans || [];
      console.log(`[${SCRIPT_NAME}] リハビリ計画取得: ${rehabPlansCache.length}件`);
      return rehabPlansCache;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] リハビリ計画取得失敗:`, e?.message || e);
      return [];
    }
  }

  /**
   * リハビリオーダーを作成
   */
  async function createRehabilitationOrder(orderData) {
    const core = window.HenryCore;
    if (!core) {
      throw new Error('HenryCore が見つかりません');
    }

    const {
      patientUuid,
      doctorUuid,
      startDate,
      endDate,
      diseaseUuid,
      therapyStartDate,
      calcTypeUuid,
      startDateTypeUuid,
      planUuids
    } = orderData;

    const planUuidsStr = planUuids.map(u => `"${u}"`).join(', ');

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
            therapyStartDate: { year: ${therapyStartDate.year}, month: ${therapyStartDate.month}, day: ${therapyStartDate.day} },
            planEvaluationDate: null,
            complications: "",
            contraindications: "",
            objectiveNote: "",
            place: "",
            note: "",
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

    console.log(`[${SCRIPT_NAME}] CreateRehabilitationOrder 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createRehabilitationOrder?.uuid) {
      console.log(`[${SCRIPT_NAME}] リハビリオーダー作成成功: ${result.data.createRehabilitationOrder.uuid}`);
      return result.data.createRehabilitationOrder;
    } else {
      console.error(`[${SCRIPT_NAME}] リハビリオーダー作成失敗:`, result);
      throw new Error('リハビリオーダー作成に失敗しました');
    }
  }

  // ===========================================
  // 入院時指示 関連関数
  // ===========================================

  /**
   * Draft.js用のブロックキーを生成
   */
  function generateBlockKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 5; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * 入院時指示の内容をDraft.js形式に変換
   */
  function instructionToDraftJs(formData) {
    const blocks = [];

    // タイトル
    blocks.push({
      key: generateBlockKey(),
      type: 'header-one',
      text: '＜入院時指示＞',
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {}
    });

    // 各項目を追加
    const items = [
      { key: 'meal', label: '食事', value: formData.meal, detail: formData.mealDetail },
      { key: 'activity', label: '安静度', value: formData.activity },
      { key: 'monitor', label: 'モニター', value: formData.monitor },
      { key: 'urine', label: '尿測', value: formData.urine },
      { key: 'bathing', label: '保清', value: formData.bathing },
      { key: 'mobility', label: '補助具', value: formData.mobility }
    ];

    for (const item of items) {
      // 見出し
      blocks.push({
        key: generateBlockKey(),
        type: 'header-two',
        text: `【${item.label}】`,
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {}
      });

      // 値（チェックボックス形式）
      let displayValue = item.value;
      if (item.detail) {
        displayValue = `${item.value}（${item.detail}）`;
      }

      blocks.push({
        key: generateBlockKey(),
        type: 'unordered-list-item',
        text: displayValue,
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {
          checkboxListItem: {
            checked: 'checked'
          }
        }
      });
    }

    // 自由記述（あれば）
    if (formData.freeText) {
      blocks.push({
        key: generateBlockKey(),
        type: 'header-two',
        text: '【その他】',
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {}
      });

      // 改行で分割して各行を追加
      const lines = formData.freeText.split('\n');
      for (const line of lines) {
        blocks.push({
          key: generateBlockKey(),
          type: 'unstyled',
          text: line,
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [],
          data: {}
        });
      }
    }

    return JSON.stringify({ blocks, entityMap: {} });
  }

  /**
   * 入院時指示の記事を作成
   */
  async function createAdmissionInstruction(orderData) {
    const core = window.HenryCore;
    if (!core) {
      throw new Error('HenryCore が見つかりません');
    }

    const { patientUuid, hospitalizationUuid, instructionData, performTime } = orderData;
    const template = INSTRUCTION_TEMPLATES['admission-instruction'];

    // Draft.js形式に変換
    const editorData = instructionToDraftJs(instructionData);
    const escapedEditorData = editorData.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

    // インライン方式でmutationを構築
    const mutation = `
      mutation CreateClinicalDocument {
        createClinicalDocument(input: {
          uuid: "",
          patientUuid: "${patientUuid}",
          editorData: "${escapedEditorData}",
          type: {
            type: CUSTOM,
            clinicalDocumentCustomTypeUuid: { value: "${template.clinicalDocumentCustomTypeUuid}" }
          },
          performTime: { seconds: ${performTime}, nanos: 0 },
          hospitalizationUuid: { value: "${hospitalizationUuid}" }
        }) {
          uuid
          performTime { seconds }
        }
      }
    `;

    console.log(`[${SCRIPT_NAME}] CreateClinicalDocument 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createClinicalDocument?.uuid) {
      console.log(`[${SCRIPT_NAME}] 入院時指示作成成功: ${result.data.createClinicalDocument.uuid}`);
      return result.data.createClinicalDocument;
    } else {
      console.error(`[${SCRIPT_NAME}] 入院時指示作成失敗:`, result);
      throw new Error('入院時指示作成に失敗しました');
    }
  }

  // ===========================================
  // 指示簿（入院） 関連関数
  // ===========================================

  /**
   * 指示簿の内容をDraft.js形式に変換
   * - 見出し（【〇〇時】）は太字（BOLD）
   * - 内容行はスタイルなし
   */
  function standingOrderToDraftJs(text) {
    const lines = text.split('\n');
    const blocks = lines.map(line => {
      // 【〇〇】で始まる行は見出し（BOLD）
      const isBoldLine = line.startsWith('【') && line.includes('】');

      let inlineStyleRanges = [];
      if (isBoldLine) {
        // 【...】部分のみを太字にする
        const endIndex = line.indexOf('】') + 1;
        inlineStyleRanges = [{
          offset: 0,
          length: endIndex,
          style: 'BOLD'
        }];
      }

      return {
        key: generateBlockKey(),
        type: 'unstyled',
        text: line,
        depth: 0,
        inlineStyleRanges: inlineStyleRanges,
        entityRanges: [],
        data: {}
      };
    });

    return JSON.stringify({ blocks, entityMap: {} });
  }

  /**
   * 指示簿（入院）の記事を作成
   */
  async function createStandingOrder(orderData) {
    const core = window.HenryCore;
    if (!core) {
      throw new Error('HenryCore が見つかりません');
    }

    const { patientUuid, hospitalizationUuid, standingOrderText, performTime } = orderData;
    const template = STANDING_ORDER_TEMPLATES['standing-order'];

    // Draft.js形式に変換
    const editorData = standingOrderToDraftJs(standingOrderText);
    const escapedEditorData = editorData.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

    // インライン方式でmutationを構築
    const mutation = `
      mutation CreateClinicalDocument {
        createClinicalDocument(input: {
          uuid: "",
          patientUuid: "${patientUuid}",
          editorData: "${escapedEditorData}",
          type: {
            type: CUSTOM,
            clinicalDocumentCustomTypeUuid: { value: "${template.clinicalDocumentCustomTypeUuid}" }
          },
          performTime: { seconds: ${performTime}, nanos: 0 },
          hospitalizationUuid: { value: "${hospitalizationUuid}" }
        }) {
          uuid
          performTime { seconds }
        }
      }
    `;

    console.log(`[${SCRIPT_NAME}] CreateClinicalDocument (指示簿) 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createClinicalDocument?.uuid) {
      console.log(`[${SCRIPT_NAME}] 指示簿作成成功: ${result.data.createClinicalDocument.uuid}`);
      return result.data.createClinicalDocument;
    } else {
      console.error(`[${SCRIPT_NAME}] 指示簿作成失敗:`, result);
      throw new Error('指示簿作成に失敗しました');
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

  /**
   * 病名データから修飾語を含めた完全な病名を構築
   * @param {Object} disease - 病名データ（masterDisease, masterModifiers, customDiseaseName を含む）
   * @returns {string} 完全な病名
   */
  function buildFullDiseaseName(disease) {
    // 未コード化病名（code: 0000999）の場合は customDiseaseName を優先
    let baseName;
    if (disease.masterDisease?.code === '0000999' && disease.customDiseaseName?.value) {
      baseName = disease.customDiseaseName.value;
    } else {
      baseName = disease.masterDisease?.name || '（名称なし）';
    }

    // 修飾語を適用
    const modifiers = disease.masterModifiers || [];
    if (modifiers.length === 0) return baseName;

    const prefixes = modifiers.filter(m => m.position === 'PREFIX').map(m => m.name).join('');
    const suffixes = modifiers.filter(m => m.position === 'SUFFIX').map(m => m.name).join('');
    return prefixes + baseName + suffixes;
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
   * オーダー設定モーダルを表示（一覧表示 & 一括作成UI）
   */
  async function showOrderSettingsModal(patientData) {
    const core = window.HenryCore;

    const patientName = patientData.patient?.fullName || '不明';
    const admissionDate = formatDate(patientData.startDate);
    const admissionDateStr = `${patientData.startDate.year}/${patientData.startDate.month}/${patientData.startDate.day}`;
    const doctorName = patientData.hospitalizationDoctor?.doctor?.name || '−';

    // リハビリ用データ
    let rehabCalcTypes = [];
    let patientDiseases = [];
    let rehabPlans = [];
    let rehabDataLoaded = false;

    // モーダルコンテンツ
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; flex-direction: column; height: calc(90vh - 120px); overflow: hidden;';

    // 患者情報 + オーダー日（ヘッダー部分）
    const headerSection = document.createElement('div');
    headerSection.style.cssText = 'padding: 16px 20px; background: #f5f5f5; border-radius: 6px; margin-bottom: 16px; flex-shrink: 0;';
    headerSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="font-size: 14px; font-weight: 600; color: #333;">
          ${patientName}　<span style="font-weight: normal; color: #666;">入院予定日: ${admissionDate}　担当医: ${doctorName}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 13px; font-weight: 500; color: #374151;">オーダー日:</span>
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 14px;">
            <input type="radio" name="order-date" value="admission" checked>
            入院日（${admissionDateStr}）
          </label>
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 14px;">
            <input type="radio" name="order-date" value="custom">
            指定日:
          </label>
          <input type="date" id="custom-date" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;" disabled>
        </div>
      </div>
    `;
    content.appendChild(headerSection);

    // オーダー日のラジオボタンイベント
    const customDateInput = headerSection.querySelector('#custom-date');
    headerSection.addEventListener('change', (e) => {
      if (e.target.name === 'order-date') {
        customDateInput.disabled = e.target.value !== 'custom';
        if (e.target.value === 'custom') {
          customDateInput.focus();
        }
      }
    });

    // カードグリッドコンテナ（スクロール可能）
    const cardGrid = document.createElement('div');
    cardGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      flex: 1;
      overflow-y: auto;
      padding: 4px;
    `;

    // オーダー種別定義
    const orderTypes = [
      {
        key: 'imaging',
        label: '画像検査',
        description: 'CT: 頭部〜骨盤',
        buildDetail: () => buildImagingDetail()
      },
      {
        key: 'biopsy',
        label: '生体検査',
        description: 'ECG + 血管伸展性',
        buildDetail: () => buildBiopsyDetail()
      },
      {
        key: 'specimen',
        label: '血液検査',
        description: '入院時採血セット（27項目）',
        buildDetail: () => buildSpecimenDetail()
      },
      {
        key: 'rehab',
        label: 'リハビリ',
        description: '運動器リハビリテーションなど',
        buildDetail: () => buildRehabDetail()
      },
      {
        key: 'instruction',
        label: '入院時指示',
        description: '食事・安静度・モニター等',
        buildDetail: () => buildInstructionDetail()
      },
      {
        key: 'standingOrder',
        label: '指示簿',
        description: '発熱時・不眠時等の臨時指示',
        buildDetail: () => buildStandingOrderDetail()
      }
    ];

    // 各オーダーカードを生成
    for (const type of orderTypes) {
      const card = createOrderCard(type);
      cardGrid.appendChild(card);
    }

    content.appendChild(cardGrid);

    // デフォルトでチェックされているので、リハビリのデータを初期ロード
    const rehabCard = cardGrid.querySelector('[data-order-type="rehab"]');
    if (rehabCard) {
      const rehabDetail = rehabCard.querySelector('.order-detail');
      if (rehabDetail && !rehabDataLoaded) {
        loadRehabData(rehabDetail);
      }
    }

    // 初期状態で作成ボタンを有効化
    setTimeout(() => updateCreateButton(), 0);

    // --- カード生成関数 ---
    function createOrderCard(type) {
      const card = document.createElement('div');
      card.dataset.orderType = type.key;
      card.style.cssText = `
        border: 1px solid #3b82f6;
        border-radius: 8px;
        background: #fff;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 0 0 1px #3b82f6;
      `;

      // ヘッダー（チェックボックス + タイトル）
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 12px 16px;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      header.innerHTML = `
        <input type="checkbox" class="order-checkbox" data-type="${type.key}" style="width: 18px; height: 18px; cursor: pointer;" checked>
        <div style="font-weight: 600; font-size: 13px; color: #1f2937;">
          ${type.label}　<span style="font-weight: normal; color: #6b7280;">${type.description}</span>
        </div>
      `;

      const checkbox = header.querySelector('.order-checkbox');

      // 詳細設定エリア（デフォルトで有効）
      const detail = document.createElement('div');
      detail.className = 'order-detail';
      detail.style.cssText = `
        padding: 12px 16px;
        flex: 1;
        overflow-y: auto;
        opacity: 1;
        pointer-events: auto;
        transition: opacity 0.2s;
      `;
      detail.appendChild(type.buildDetail());

      // チェックボックス変更時に詳細エリアの有効/無効を切り替え
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          detail.style.opacity = '1';
          detail.style.pointerEvents = 'auto';
          card.style.borderColor = '#3b82f6';
          card.style.boxShadow = '0 0 0 1px #3b82f6';
          // リハビリの場合はデータをロード
          if (type.key === 'rehab' && !rehabDataLoaded) {
            loadRehabData(detail);
          }
        } else {
          detail.style.opacity = '0.5';
          detail.style.pointerEvents = 'none';
          card.style.borderColor = '#e5e7eb';
          card.style.boxShadow = 'none';
        }
        updateCreateButton();
      });

      card.appendChild(header);
      card.appendChild(detail);
      return card;
    }

    // --- 画像検査の詳細 ---
    function buildImagingDetail() {
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="margin-bottom: 8px;">
          <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">補足</label>
          <input type="text" id="imaging-note" value="頭部、胸腹部、脊椎"
            style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; box-sizing: border-box;">
        </div>
      `;
      return container;
    }

    // --- 生体検査の詳細 ---
    function buildBiopsyDetail() {
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-size: 13px; color: #374151;">
          <div>・心電図12誘導</div>
          <div>・ABI/PWV（血管伸展性）</div>
        </div>
      `;
      return container;
    }

    // --- 血液検査の詳細 ---
    function buildSpecimenDetail() {
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-size: 12px; color: #6b7280;">
          総蛋白, アルブミン, ALT, AST, ALP, LD, 尿酸, BUN, CRE, HDL-C, LDL-C, TG, CRP, 血算, γ-GT, CK, Glu, Na, K, prBNP, HBs抗原, HCV, RPR, TP抗体, Ca, P
        </div>
      `;
      return container;
    }

    // --- リハビリの詳細 ---
    function buildRehabDetail() {
      const container = document.createElement('div');
      container.id = 'rehab-detail-container';
      container.innerHTML = `
        <div id="rehab-loading" style="text-align: center; padding: 12px; color: #666; font-size: 13px;">
          チェックを入れるとデータを取得します
        </div>
        <div id="rehab-content" style="display: none;"></div>
      `;
      return container;
    }

    // リハビリデータ取得
    async function loadRehabData(detailContainer) {
      const loadingEl = detailContainer.querySelector('#rehab-loading');
      const contentEl = detailContainer.querySelector('#rehab-content');

      loadingEl.textContent = 'データを取得中...';
      loadingEl.style.display = 'block';
      contentEl.style.display = 'none';

      try {
        [rehabCalcTypes, patientDiseases, rehabPlans] = await Promise.all([
          fetchRehabCalcTypes(),
          fetchPatientDiseases(patientData.patient?.uuid),
          fetchRehabPlans()
        ]);
        rehabDataLoaded = true;

        if (patientDiseases.length === 0) {
          contentEl.innerHTML = '<div style="color: #dc2626; font-size: 13px;">登録済みの病名がありません</div>';
          loadingEl.style.display = 'none';
          contentEl.style.display = 'block';
          return;
        }

        contentEl.innerHTML = '';

        // 算定区分選択
        const calcTypeRow = document.createElement('div');
        calcTypeRow.style.cssText = 'margin-bottom: 8px;';
        calcTypeRow.innerHTML = `<label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">算定区分</label>`;
        const calcTypeSelect = document.createElement('select');
        calcTypeSelect.id = 'rehab-calc-type';
        calcTypeSelect.style.cssText = 'width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;';
        // 疾患別リハのみをフィルタ
        rehabCalcTypes
          .filter(t => t.isShikkanbetsuRehabilitation)
          .forEach(t => {
            const option = document.createElement('option');
            option.value = t.uuid;
            option.textContent = t.name;
            // 算定期間をdata属性に保存（期限計算用）
            option.dataset.period = t.period?.value || '';
            // 運動器リハビリテーションをデフォルト選択
            if (t.uuid === REHAB_TEMPLATES['admission-rehab'].rehabilitationCalculationTypeUuid) {
              option.selected = true;
            }
            calcTypeSelect.appendChild(option);
          });
        calcTypeRow.appendChild(calcTypeSelect);
        contentEl.appendChild(calcTypeRow);

        // 診断名選択
        const diseaseRow = document.createElement('div');
        diseaseRow.style.cssText = 'margin-bottom: 8px;';
        diseaseRow.innerHTML = `<label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">診断名</label>`;
        const diseaseSelect = document.createElement('select');
        diseaseSelect.id = 'rehab-disease';
        diseaseSelect.style.cssText = 'width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;';
        patientDiseases.forEach(d => {
          const option = document.createElement('option');
          option.value = d.uuid;
          option.textContent = `${buildFullDiseaseName(d)}${d.isMain ? ' [主]' : ''}`;
          option.dataset.startDate = d.startDate ? `${d.startDate.year}-${String(d.startDate.month).padStart(2, '0')}-${String(d.startDate.day).padStart(2, '0')}` : '';
          diseaseSelect.appendChild(option);
        });
        diseaseRow.appendChild(diseaseSelect);
        contentEl.appendChild(diseaseRow);

        // 起算日種別
        const startDateTypeRow = document.createElement('div');
        startDateTypeRow.style.cssText = 'margin-bottom: 8px;';
        startDateTypeRow.innerHTML = `<label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">起算日種別</label>`;
        const startDateTypeSelect = document.createElement('select');
        startDateTypeSelect.id = 'rehab-start-date-type';
        startDateTypeSelect.style.cssText = 'width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;';
        startDateTypeRow.appendChild(startDateTypeSelect);
        contentEl.appendChild(startDateTypeRow);

        // 起算日
        const therapyDateRow = document.createElement('div');
        therapyDateRow.style.cssText = 'margin-bottom: 8px;';
        therapyDateRow.innerHTML = `<label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">起算日</label>`;
        const therapyDateInput = document.createElement('input');
        therapyDateInput.type = 'date';
        therapyDateInput.id = 'rehab-therapy-date';
        therapyDateInput.style.cssText = 'width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;';
        therapyDateRow.appendChild(therapyDateInput);
        contentEl.appendChild(therapyDateRow);

        // 算定期限表示
        const periodRow = document.createElement('div');
        periodRow.style.cssText = 'margin-bottom: 8px;';
        periodRow.innerHTML = `
          <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">算定期限</label>
          <div id="rehab-period-display" style="padding: 6px 8px; background: #f3f4f6; border-radius: 4px; font-size: 13px; color: #374151;">-</div>
        `;
        contentEl.appendChild(periodRow);

        // 訓練内容（PT/OT）
        const ptPlans = rehabPlans.filter(p => p.category === 'PT');
        const otPlans = rehabPlans.filter(p => p.category === 'OT');

        // デフォルトでチェックを入れる訓練内容
        const defaultCheckedTrainings = [
          '評価', '体力向上訓練', '関節可動域訓練', '筋力強化訓練',
          '協調性訓練', '基本動作訓練', '歩行訓練'
        ];

        // 訓練内容（PT）
        if (ptPlans.length > 0) {
          const ptRow = document.createElement('div');
          ptRow.style.cssText = 'margin-bottom: 6px;';
          ptRow.innerHTML = `<label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">訓練内容（PT）</label>`;
          const ptContainer = document.createElement('div');
          ptContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
          ptPlans.forEach(plan => {
            const isDefaultChecked = defaultCheckedTrainings.includes(plan.name);
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 3px; cursor: pointer; font-size: 11px; padding: 2px 6px; border: 1px solid #e5e7eb; border-radius: 3px; background: #f9fafb;';
            label.innerHTML = `<input type="checkbox" class="rehab-plan" value="${plan.uuid}"${isDefaultChecked ? ' checked' : ''}> ${plan.name}`;
            ptContainer.appendChild(label);
          });
          ptRow.appendChild(ptContainer);
          contentEl.appendChild(ptRow);
        }

        // 訓練内容（OT）
        if (otPlans.length > 0) {
          const otRow = document.createElement('div');
          otRow.style.cssText = 'margin-bottom: 6px;';
          otRow.innerHTML = `<label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">訓練内容（OT）</label>`;
          const otContainer = document.createElement('div');
          otContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
          otPlans.forEach(plan => {
            const isDefaultChecked = defaultCheckedTrainings.includes(plan.name);
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 3px; cursor: pointer; font-size: 11px; padding: 2px 6px; border: 1px solid #e5e7eb; border-radius: 3px; background: #f9fafb;';
            label.innerHTML = `<input type="checkbox" class="rehab-plan" value="${plan.uuid}"${isDefaultChecked ? ' checked' : ''}> ${plan.name}`;
            otContainer.appendChild(label);
          });
          otRow.appendChild(otContainer);
          contentEl.appendChild(otRow);
        }

        // 起算日種別を更新する関数
        function updateStartDateTypes(calcType) {
          startDateTypeSelect.innerHTML = '';
          if (calcType?.therapyStartDateTypes) {
            calcType.therapyStartDateTypes.forEach(t => {
              const option = document.createElement('option');
              option.value = t.uuid;
              option.textContent = t.name;
              startDateTypeSelect.appendChild(option);
            });
          }
          updateTherapyDate();
        }

        // 算定区分変更時に起算日種別を更新
        calcTypeSelect.addEventListener('change', () => {
          const selectedCalcType = rehabCalcTypes.find(t => t.uuid === calcTypeSelect.value);
          updateStartDateTypes(selectedCalcType);
        });

        // 初期表示時の起算日種別を設定
        const initialCalcType = rehabCalcTypes.find(t => t.uuid === calcTypeSelect.value);
        updateStartDateTypes(initialCalcType);

        // 発症日自動設定
        function updateTherapyDate() {
          const selectedOption = startDateTypeSelect.options[startDateTypeSelect.selectedIndex];
          if (selectedOption && selectedOption.textContent === '発症日') {
            const diseaseOption = diseaseSelect.options[diseaseSelect.selectedIndex];
            if (diseaseOption && diseaseOption.dataset.startDate) {
              therapyDateInput.value = diseaseOption.dataset.startDate;
            }
          }
        }
        diseaseSelect.addEventListener('change', updateTherapyDate);
        startDateTypeSelect.addEventListener('change', updateTherapyDate);

        // 算定期限を更新する関数
        function updatePeriodDisplay() {
          const periodDisplay = document.getElementById('rehab-period-display');
          if (!periodDisplay) return;

          const selectedOption = calcTypeSelect.options[calcTypeSelect.selectedIndex];
          const periodValue = selectedOption?.dataset.period;

          // 開始日（入院日）
          const startDateObj = patientData.startDate;
          const startStr = `${startDateObj.year}/${startDateObj.month}/${startDateObj.day}`;

          // periodがない算定区分は「期限なし」
          if (!periodValue) {
            periodDisplay.textContent = `${startStr} 〜（期限なし）`;
            return;
          }

          // 起算日が入力されていない場合
          if (!therapyDateInput.value) {
            periodDisplay.textContent = `${startStr} 〜 -`;
            return;
          }

          // 算定期限を計算（起算日 + 算定期間）
          const [y, m, d] = therapyDateInput.value.split('-').map(Number);
          const therapyDate = new Date(y, m - 1, d);
          const endDate = new Date(therapyDate);
          endDate.setDate(endDate.getDate() + parseInt(periodValue, 10));

          const endStr = `${endDate.getFullYear()}/${endDate.getMonth() + 1}/${endDate.getDate()}`;
          periodDisplay.textContent = `${startStr} 〜 ${endStr}（${periodValue}日間）`;
        }

        // 起算日・算定区分変更時に算定期限を更新
        therapyDateInput.addEventListener('change', updatePeriodDisplay);
        calcTypeSelect.addEventListener('change', updatePeriodDisplay);

        // 初期表示
        updatePeriodDisplay();

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';

      } catch (e) {
        console.error(`[${SCRIPT_NAME}] リハビリデータ取得エラー:`, e);
        contentEl.innerHTML = '<div style="color: #dc2626; font-size: 13px;">データ取得に失敗しました</div>';
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
      }
    }

    // --- 入院時指示の詳細 ---
    function buildInstructionDetail() {
      const container = document.createElement('div');
      container.style.cssText = 'font-size: 12px; display: flex; flex-direction: column; height: 100%;';

      // 食事
      let html = `
        <div style="margin-bottom: 6px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">食事</label>
          <div style="display: flex; gap: 4px; align-items: center;">
            <select id="instruction-meal" style="flex: 1; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
              ${INSTRUCTION_OPTIONS.meal.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
            <input type="text" id="instruction-meal-detail" placeholder="カロリー、塩分制限などの詳細" style="flex: 1; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
          </div>
        </div>
      `;

      // 安静度
      html += `
        <div style="margin-bottom: 6px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">安静度</label>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${INSTRUCTION_OPTIONS.activity.options.map((opt, i) =>
              `<label style="display: flex; align-items: center; gap: 3px; cursor: pointer;"><input type="radio" name="instruction-activity" value="${opt}" ${i === 0 ? 'checked' : ''}> ${opt}</label>`
            ).join('')}
          </div>
        </div>
      `;

      // モニター・尿測（横並び）
      html += `
        <div style="display: flex; gap: 12px; margin-bottom: 6px;">
          <div style="flex: 1;">
            <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">モニター</label>
            <div style="display: flex; gap: 6px;">
              ${INSTRUCTION_OPTIONS.monitor.options.map((opt, i) =>
                `<label style="display: flex; align-items: center; gap: 3px; cursor: pointer;"><input type="radio" name="instruction-monitor" value="${opt}" ${i === 1 ? 'checked' : ''}> ${opt}</label>`
              ).join('')}
            </div>
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">尿測</label>
            <div style="display: flex; gap: 6px;">
              ${INSTRUCTION_OPTIONS.urine.options.map((opt, i) =>
                `<label style="display: flex; align-items: center; gap: 3px; cursor: pointer;"><input type="radio" name="instruction-urine" value="${opt}" ${i === 1 ? 'checked' : ''}> ${opt}</label>`
              ).join('')}
            </div>
          </div>
        </div>
      `;

      // 保清・補助具（横並び）
      html += `
        <div style="display: flex; gap: 12px; margin-bottom: 6px;">
          <div style="flex: 1;">
            <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">保清</label>
            <div style="display: flex; gap: 6px;">
              ${INSTRUCTION_OPTIONS.bathing.options.map((opt, i) =>
                `<label style="display: flex; align-items: center; gap: 3px; cursor: pointer;"><input type="radio" name="instruction-bathing" value="${opt}" ${i === 0 ? 'checked' : ''}> ${opt}</label>`
              ).join('')}
            </div>
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">補助具</label>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${INSTRUCTION_OPTIONS.mobility.options.map((opt, i) =>
                `<label style="display: flex; align-items: center; gap: 3px; cursor: pointer;"><input type="radio" name="instruction-mobility" value="${opt}" ${i === 0 ? 'checked' : ''}> ${opt}</label>`
              ).join('')}
            </div>
          </div>
        </div>
      `;

      // 自由記述
      html += `
        <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 2px;">その他</label>
          <textarea id="instruction-freetext" placeholder="追加指示..." style="flex: 1; min-height: 40px; width: 100%; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
      `;

      container.innerHTML = html;
      return container;
    }

    // --- 指示簿の詳細 ---
    function buildStandingOrderDetail() {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; flex-direction: column; height: 100%;';
      container.innerHTML = `
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">※【〇〇時】は太字で表示</div>
        <textarea id="standing-order-text" style="flex: 1; min-height: 100px; width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; font-family: monospace; resize: vertical; box-sizing: border-box; line-height: 1.4;">${DEFAULT_STANDING_ORDER}</textarea>
      `;
      return container;
    }

    // 作成ボタンの有効/無効を更新
    function updateCreateButton() {
      const checkedCount = content.querySelectorAll('.order-checkbox:checked').length;
      if (createBtn) {
        createBtn.disabled = checkedCount === 0;
        createBtn.textContent = checkedCount > 0 ? `選択したオーダーを作成（${checkedCount}件）` : '選択したオーダーを作成';
      }
    }

    // --- モーダル表示 ---
    let modal;
    let createBtn;
    modal = core.ui.showModal({
      title: '入院前オーダー作成',
      width: '90vw',
      maxWidth: '1200px',
      content: content,
      actions: [
        { label: 'キャンセル', variant: 'secondary' },
        {
          label: '選択したオーダーを作成',
          variant: 'primary',
          onClick: async () => {
            // 選択されたオーダーを収集
            const selectedTypes = Array.from(content.querySelectorAll('.order-checkbox:checked')).map(cb => cb.dataset.type);

            if (selectedTypes.length === 0) {
              core.ui.showToast('オーダーを選択してください', 'error');
              return;
            }

            // オーダー日を取得
            const selectedDateRadio = content.querySelector('input[name="order-date"]:checked')?.value;
            let orderDate;
            if (selectedDateRadio === 'admission') {
              orderDate = patientData.startDate;
            } else if (selectedDateRadio === 'custom' && customDateInput.value) {
              const [y, m, d] = customDateInput.value.split('-').map(Number);
              orderDate = { year: y, month: m, day: d };
            } else {
              core.ui.showToast('オーダー日を選択してください', 'error');
              return;
            }

            // 各オーダーのデータを収集
            const ordersData = [];

            for (const type of selectedTypes) {
              const data = { type, orderDate };

              if (type === 'imaging') {
                data.ctNote = content.querySelector('#imaging-note')?.value || '';
              } else if (type === 'rehab') {
                const diseaseSelect = content.querySelector('#rehab-disease');
                const startDateTypeSelect = content.querySelector('#rehab-start-date-type');
                const therapyDateInput = content.querySelector('#rehab-therapy-date');

                if (!diseaseSelect?.value) {
                  core.ui.showToast('リハビリ: 診断名を選択してください', 'error');
                  return;
                }
                if (!therapyDateInput?.value) {
                  core.ui.showToast('リハビリ: 起算日を入力してください', 'error');
                  return;
                }

                const selectedPlanUuids = Array.from(content.querySelectorAll('.rehab-plan:checked')).map(cb => cb.value);
                const [y, m, d] = therapyDateInput.value.split('-').map(Number);

                const calcTypeSelect = content.querySelector('#rehab-calc-type');
                const selectedCalcOption = calcTypeSelect?.options[calcTypeSelect.selectedIndex];
                const periodValue = selectedCalcOption?.dataset.period;
                data.rehabData = {
                  diseaseUuid: diseaseSelect.value,
                  startDateTypeUuid: startDateTypeSelect.value,
                  therapyStartDate: { year: y, month: m, day: d },
                  planUuids: selectedPlanUuids,
                  calcTypeUuid: calcTypeSelect?.value || REHAB_TEMPLATES['admission-rehab'].rehabilitationCalculationTypeUuid,
                  period: periodValue ? parseInt(periodValue, 10) : null
                };
              } else if (type === 'instruction') {
                data.instructionData = {
                  meal: content.querySelector('#instruction-meal')?.value || '常食',
                  mealDetail: content.querySelector('#instruction-meal-detail')?.value || '',
                  monitor: content.querySelector('input[name="instruction-monitor"]:checked')?.value || '不要',
                  urine: content.querySelector('input[name="instruction-urine"]:checked')?.value || '不要',
                  bathing: content.querySelector('input[name="instruction-bathing"]:checked')?.value || '入浴',
                  activity: content.querySelector('input[name="instruction-activity"]:checked')?.value || 'フリー',
                  mobility: content.querySelector('input[name="instruction-mobility"]:checked')?.value || 'なし',
                  freeText: content.querySelector('#instruction-freetext')?.value || ''
                };
              } else if (type === 'standingOrder') {
                const textArea = content.querySelector('#standing-order-text');
                if (!textArea?.value?.trim()) {
                  core.ui.showToast('指示簿: 内容を入力してください', 'error');
                  return;
                }
                data.standingOrderText = textArea.value;
              }

              ordersData.push(data);
            }

            modal.close();
            showBatchConfirmModal(patientData, ordersData);
          }
        }
      ]
    });

    // 作成ボタンの参照を取得
    setTimeout(() => {
      const buttons = document.querySelectorAll('[role="dialog"] button');
      buttons.forEach(btn => {
        if (btn.textContent.includes('選択したオーダーを作成')) {
          createBtn = btn;
          createBtn.disabled = true;
        }
      });
    }, 0);
  }

  /**
   * 一括作成確認モーダルを表示
   */
  function showBatchConfirmModal(patientData, ordersData) {
    const core = window.HenryCore;

    const patientName = patientData.patient?.fullName || '不明';
    const orderDate = ordersData[0].orderDate;
    const orderDateStr = `${orderDate.year}/${orderDate.month}/${orderDate.day}`;

    // 作成するオーダーの一覧を表示
    let orderListHtml = ordersData.map(data => {
      const label = ALL_TEMPLATES[data.type]?.label || data.type;
      return `<div style="padding: 4px 0; border-bottom: 1px solid #f0f0f0;">・${label}</div>`;
    }).join('');

    const content = document.createElement('div');
    content.innerHTML = `
      <p style="margin: 0 0 16px 0; color: #333;">以下のオーダーを作成します。</p>
      <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 14px; color: #333;">
        <div><strong>患者:</strong> ${patientName}</div>
        <div style="margin-top: 4px;"><strong>オーダー日:</strong> ${orderDateStr}</div>
        <div style="margin-top: 8px;"><strong>作成するオーダー（${ordersData.length}件）:</strong></div>
        <div style="margin-top: 4px; padding-left: 8px;">${orderListHtml}</div>
      </div>
    `;

    let modal;
    modal = core.ui.showModal({
      title: '確認',
      width: '450px',
      content: content,
      actions: [
        { label: 'キャンセル', variant: 'secondary' },
        {
          label: '作成',
          variant: 'primary',
          onClick: async () => {
            const spinner = core.ui.showSpinner('オーダーを作成中...');

            const results = [];
            for (const data of ordersData) {
              try {
                await createSingleOrder(patientData, data);
                results.push({ type: data.type, success: true });
              } catch (e) {
                console.error(`[${SCRIPT_NAME}] ${data.type} 作成エラー:`, e);
                results.push({ type: data.type, success: false, error: e.message });
              }
            }

            spinner.close();
            modal.close();

            // 結果表示
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            if (failCount === 0) {
              core.ui.showToast(`${successCount}件のオーダーを作成しました`, 'success');
            } else {
              const failedTypes = results.filter(r => !r.success).map(r => ALL_TEMPLATES[r.type]?.label || r.type).join(', ');
              core.ui.showToast(`${successCount}件成功、${failCount}件失敗（${failedTypes}）`, 'warning');
            }
          }
        }
      ]
    });
  }

  /**
   * 単一オーダーを作成
   */
  async function createSingleOrder(patientData, orderData) {
    const { type, orderDate, ctNote, rehabData, instructionData, standingOrderText } = orderData;

    if (type === 'imaging') {
      await createImagingOrder({
        patientUuid: patientData.patient?.uuid,
        doctorUuid: patientData.hospitalizationDoctor?.doctor?.uuid,
        templateKey: 'admission-ct',
        orderDate: orderDate,
        ctNote: ctNote
      });
    } else if (type === 'biopsy') {
      await createBiopsyInspectionOrder({
        patientUuid: patientData.patient?.uuid,
        doctorUuid: patientData.hospitalizationDoctor?.doctor?.uuid,
        templateKey: 'ecg-abi',
        orderDate: orderDate
      });
    } else if (type === 'specimen') {
      await createSpecimenInspectionOrder({
        patientUuid: patientData.patient?.uuid,
        doctorUuid: patientData.hospitalizationDoctor?.doctor?.uuid,
        templateKey: 'admission-blood',
        orderDate: orderDate
      });
    } else if (type === 'rehab') {
      const startDate = orderDate;
      // 終了日は起算日 + 算定期間で計算（periodがない場合は365日）
      const therapyDate = rehabData.therapyStartDate;
      const period = rehabData.period || 365;
      const endDateObj = new Date(therapyDate.year, therapyDate.month - 1, therapyDate.day);
      endDateObj.setDate(endDateObj.getDate() + period);
      const endDate = {
        year: endDateObj.getFullYear(),
        month: endDateObj.getMonth() + 1,
        day: endDateObj.getDate()
      };

      await createRehabilitationOrder({
        patientUuid: patientData.patient?.uuid,
        doctorUuid: patientData.hospitalizationDoctor?.doctor?.uuid,
        startDate: startDate,
        endDate: endDate,
        diseaseUuid: rehabData.diseaseUuid,
        therapyStartDate: rehabData.therapyStartDate,
        calcTypeUuid: rehabData.calcTypeUuid,
        startDateTypeUuid: rehabData.startDateTypeUuid,
        planUuids: rehabData.planUuids
      });
    } else if (type === 'instruction') {
      const performTimeDate = new Date(orderDate.year, orderDate.month - 1, orderDate.day, 0, 0, 0);
      const performTime = Math.floor(performTimeDate.getTime() / 1000);

      await createAdmissionInstruction({
        patientUuid: patientData.patient?.uuid,
        hospitalizationUuid: patientData.uuid,
        instructionData: instructionData,
        performTime: performTime
      });
    } else if (type === 'standingOrder') {
      const performTimeDate = new Date(orderDate.year, orderDate.month - 1, orderDate.day, 0, 0, 0);
      const performTime = Math.floor(performTimeDate.getTime() / 1000);

      await createStandingOrder({
        patientUuid: patientData.patient?.uuid,
        hospitalizationUuid: patientData.uuid,
        standingOrderText: standingOrderText,
        performTime: performTime
      });
    } else {
      throw new Error(`不明なオーダー種別: ${type}`);
    }
  }

  /**
   * フォーム行を作成
   */
  function createFormRow(labelText) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom: 12px;';

    const label = document.createElement('label');
    label.style.cssText = 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;';
    label.textContent = labelText;

    row.appendChild(label);
    return row;
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
