// ==UserScript==
// @name         Henry Hospitalization Data Viewer
// @namespace    https://github.com/shin-926/Henry
// @version      0.14.0
// @description  入院患者の日々データを取得・表示（バイタル・処方・注射・検査・栄養・ADL・看護日誌対応）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_hospitalization_data.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_hospitalization_data.user.js
// ==/UserScript==

/*
 * 【入院データビューア】
 *
 * ■ 使用場面
 * - 入院患者の日々のデータを取得・表示したい場合
 * - 医師・看護師・リハビリスタッフの記録を一覧表示したい場合
 *
 * ■ 機能
 * - 入院情報（病棟・病室・入院日・入院日数）
 * - 入院履歴
 * - 医師の記録（ClinicalDocument）
 * - 看護記録（NursingJournal）
 * - 患者プロフィール
 * - リハビリ日々記録（RehabilitationDocument）
 * - リハビリオーダー
 * - バイタルサイン（体温・血圧・脈拍・SpO2）
 *
 * ■ データソース
 * - 入院情報: GraphQL API (ListPatientHospitalizations)
 * - 医師記録: Persisted Query API (ListClinicalDocuments - HOSPITALIZATION_CONSULTATION)
 * - 看護記録: Persisted Query API (ListClinicalDocuments - CUSTOM type)
 * - 患者プロフィール: Persisted Query API (ListClinicalDocuments - CUSTOM type)
 * - リハビリ日々記録: Persisted Query API (ListRehabilitationDocuments)
 * - リハビリオーダー: Persisted Query API (ListOrders - ORDER_TYPE_REHABILITATION)
 * - バイタルサイン: Persisted Query API (GetClinicalCalendarView - vitalSign resource)
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'HospitalizationData';
  const VERSION = '0.14.0';

  // 組織UUID（マオカ病院）
  const ORG_UUID = 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825';

  // Persisted Query Hashes
  const HASHES = {
    LIST_CLINICAL_DOCUMENTS: '1c4cab71733c192c3143f4c25e6040eb6df6d87fc6cda513f6566a75da7d7df0',
    LIST_ORDERS: '8fb50e5d48a0c44a0891e376ddf03dc069b792ea991f62bde9d1e9da63fcb4b3',
    LIST_REHABILITATION_DOCUMENTS: 'b7a50dc3c27506e9c0fcdb13cb1b504487b8979fdd2ab5a54eaa83a95f907d3e',
    GET_CLINICAL_CALENDAR_VIEW: '74f284465206f367c4c544c20b020204478fa075a1fd3cb1bf3fd266ced026e1'
  };

  // Persisted Query を使用してAPIを呼び出す
  async function callPersistedQuery(operationName, variables, sha256Hash) {
    // HenryCoreからトークンを取得
    const token = await window.HenryCore?.getToken();
    if (!token) {
      throw new Error('認証トークンがありません');
    }

    const response = await fetch('https://henry-app.jp/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-organization-uuid': ORG_UUID
      },
      body: JSON.stringify({
        operationName,
        variables,
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // 医師記録を取得（Persisted Query）
  // Note: HOSPITALIZATION_CONSULTATION のみ有効（HOSPITALIZATION_PROGRESSは無効なenum）
  async function fetchClinicalDocuments(patientUuid, documentTypes = ['HOSPITALIZATION_CONSULTATION']) {
    try {
      const result = await callPersistedQuery(
        'ListClinicalDocuments',
        {
          input: {
            patientUuid,
            pageToken: '',
            pageSize: 50,
            clinicalDocumentTypes: documentTypes.map(type => ({ type }))
          }
        },
        HASHES.LIST_CLINICAL_DOCUMENTS
      );

      const documents = result?.data?.listClinicalDocuments?.documents || [];

      return documents.map(doc => ({
        uuid: doc.uuid,
        text: parseEditorData(doc.editorData),
        performTime: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
        author: doc.creator?.name || '不明',
        type: formatDocType(doc.type?.type || '不明')
      })).filter(d => d.text);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 医師記録取得エラー:`, e);
      return [];
    }
  }

  // CUSTOMタイプのUUID
  const NURSING_RECORD_CUSTOM_TYPE_UUID = 'e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f';  // 看護記録
  const PATIENT_PROFILE_CUSTOM_TYPE_UUID = 'f639619a-6fdb-452a-a803-8d42cd50830d'; // 患者プロフィール

  // 看護記録（SOAP形式）を取得（Persisted Query）
  // 看護記録はCUSTOMタイプとして保存されている

  async function fetchNursingRecords(patientUuid) {
    try {
      const result = await callPersistedQuery(
        'ListClinicalDocuments',
        {
          input: {
            patientUuid,
            pageToken: '',
            pageSize: 50,
            clinicalDocumentTypes: [{
              type: 'CUSTOM',
              clinicalDocumentCustomTypeUuid: { value: NURSING_RECORD_CUSTOM_TYPE_UUID }
            }]
          }
        },
        HASHES.LIST_CLINICAL_DOCUMENTS
      );

      const documents = result?.data?.listClinicalDocuments?.documents || [];

      return documents.map(doc => ({
        uuid: doc.uuid,
        text: parseEditorData(doc.editorData),
        eventTime: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
        author: doc.creator?.name || '不明'
      })).filter(d => d.text);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 看護記録取得エラー:`, e);
      return [];
    }
  }

  // 患者プロフィールを取得（Persisted Query）
  // 患者プロフィールもCUSTOMタイプとして保存されている
  async function fetchPatientProfile(patientUuid) {
    try {
      const result = await callPersistedQuery(
        'ListClinicalDocuments',
        {
          input: {
            patientUuid,
            pageToken: '',
            pageSize: 10,
            clinicalDocumentTypes: [{
              type: 'CUSTOM',
              clinicalDocumentCustomTypeUuid: { value: PATIENT_PROFILE_CUSTOM_TYPE_UUID }
            }]
          }
        },
        HASHES.LIST_CLINICAL_DOCUMENTS
      );

      const documents = result?.data?.listClinicalDocuments?.documents || [];

      return documents.map(doc => ({
        uuid: doc.uuid,
        text: parseEditorData(doc.editorData),
        updateTime: doc.updateTime?.seconds ? new Date(doc.updateTime.seconds * 1000) : null,
        author: doc.creator?.name || '不明'
      })).filter(d => d.text);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 患者プロフィール取得エラー:`, e);
      return [];
    }
  }

  // リハビリ日々記録を取得（Persisted Query）
  // これはリハビリスタッフが記録する日々の記録（オーダーではない）
  async function fetchRehabilitationDocuments(patientUuid) {
    try {
      // 今日の日付を取得（APIは日付パラメータを必要とする）
      const today = new Date();
      const result = await callPersistedQuery(
        'ListRehabilitationDocuments',
        {
          input: {
            patientUuid,
            date: {
              year: today.getFullYear(),
              month: today.getMonth() + 1,
              day: today.getDate()
            },
            pageSize: 100,
            pageToken: ''
          }
        },
        HASHES.LIST_REHABILITATION_DOCUMENTS
      );

      const documents = result?.data?.listRehabilitationDocuments?.documents || [];

      return documents.map(doc => ({
        uuid: doc.uuid,
        text: parseEditorData(doc.editorData),
        performTime: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
        author: doc.createUser?.name || '不明',
        orderUuid: doc.rehabilitationOrderUuid?.value || null
      })).filter(d => d.text);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] リハビリ日々記録取得エラー:`, e);
      return [];
    }
  }

  // リハビリオーダーを取得（Persisted Query）
  async function fetchRehabilitationOrders(patientUuid) {
    try {
      const result = await callPersistedQuery(
        'ListOrders',
        {
          input: {
            patientUuid,
            filterOrderStatus: ['ORDER_STATUS_ACTIVE', 'ORDER_STATUS_DRAFT', 'ORDER_STATUS_ON_HOLD', 'ORDER_STATUS_PREPARING'],
            patientCareType: 'PATIENT_CARE_TYPE_ANY',
            filterOrderTypes: ['ORDER_TYPE_REHABILITATION']
          }
        },
        HASHES.LIST_ORDERS
      );

      const orders = result?.data?.listOrders?.orders || [];

      return orders.map(order => {
        const rehabOrder = order.order?.rehabilitationOrder;
        if (!rehabOrder) return null;

        const detail = rehabOrder.detail;
        const calcType = detail?.rehabilitationCalculationType;
        const plans = detail?.rehabilitationPlans || [];

        // リハビリプランをカテゴリ別に整理
        const plansByCategory = {};
        plans.forEach(plan => {
          if (!plansByCategory[plan.category]) {
            plansByCategory[plan.category] = [];
          }
          plansByCategory[plan.category].push(plan.name);
        });

        const planSummary = Object.entries(plansByCategory)
          .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
          .join('\n');

        return {
          uuid: rehabOrder.uuid,
          status: formatOrderStatus(rehabOrder.orderStatus),
          startDate: rehabOrder.startDate ? `${rehabOrder.startDate.year}/${rehabOrder.startDate.month}/${rehabOrder.startDate.day}` : '-',
          endDate: rehabOrder.endDate ? `${rehabOrder.endDate.year}/${rehabOrder.endDate.month}/${rehabOrder.endDate.day}` : '-',
          therapyStartDate: detail?.therapyStartDate ? `${detail.therapyStartDate.year}/${detail.therapyStartDate.month}/${detail.therapyStartDate.day}` : '-',
          calculationType: calcType?.name || '-',
          period: calcType?.period?.value ? `${calcType.period.value}日` : '-',
          disease: detail?.patientReceiptDisease?.masterDisease?.name || '-',
          doctor: rehabOrder.doctor?.name || '-',
          plans: planSummary,
          note: detail?.note || ''
        };
      }).filter(Boolean);

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] リハビリオーダー取得エラー:`, e);
      return [];
    }
  }

  // カレンダービューデータを取得（GetClinicalCalendarView API）
  // 過去1週間分の全データを一括取得
  const CALENDAR_RESOURCES = [
    '//henry-app.jp/clinicalResource/vitalSign',
    '//henry-app.jp/clinicalResource/prescriptionOrder',
    '//henry-app.jp/clinicalResource/injectionOrder',
    '//henry-app.jp/clinicalResource/inspectionReport',
    '//henry-app.jp/clinicalResource/nutritionOrder',
    '//henry-app.jp/clinicalResource/adlAssessment',
    '//henry-app.jp/clinicalResource/nursingJournal'
  ];

  async function fetchCalendarData(patientUuid) {
    try {
      const today = new Date();
      const result = await callPersistedQuery(
        'GetClinicalCalendarView',
        {
          input: {
            patientUuid,
            baseDate: {
              year: today.getFullYear(),
              month: today.getMonth() + 1,
              day: today.getDate()
            },
            beforeDateSize: 7,  // 過去7日分
            afterDateSize: 0,
            clinicalResourceHrns: CALENDAR_RESOURCES,
            createUserUuids: [],
            accountingOrderShinryoShikibetsus: []
          }
        },
        HASHES.GET_CLINICAL_CALENDAR_VIEW
      );

      const data = result?.data?.getClinicalCalendarView;
      console.log(`[${SCRIPT_NAME}] GetClinicalCalendarView 生データ:`, data);

      // バイタルサイン
      const vitalSigns = (data?.vitalSigns || []).map(vs => ({
        uuid: vs.uuid,
        recordTime: vs.recordTime?.seconds ? new Date(vs.recordTime.seconds * 1000) : null,
        temperature: vs.temperature?.value ? vs.temperature.value / 10 : null,
        bloodPressureUpper: vs.bloodPressureUpperBound?.value ? vs.bloodPressureUpperBound.value / 10 : null,
        bloodPressureLower: vs.bloodPressureLowerBound?.value ? vs.bloodPressureLowerBound.value / 10 : null,
        pulseRate: vs.pulseRate?.value ? vs.pulseRate.value / 10 : null,
        spo2: vs.spo2?.value ? vs.spo2.value / 10 : null,
        respiration: vs.respiration?.value ? vs.respiration.value / 10 : null,
        bloodSugar: vs.bloodSugar?.value ? vs.bloodSugar.value / 10 : null,
        author: vs.createUser?.name || '不明'
      })).filter(vs => vs.recordTime);

      // 処方オーダー
      const prescriptionOrders = (data?.prescriptionOrders || []).map(rx => ({
        uuid: rx.uuid,
        orderTime: rx.orderTime?.seconds ? new Date(rx.orderTime.seconds * 1000) : null,
        status: formatOrderStatus(rx.orderStatus),
        doctor: rx.doctor?.name || '不明',
        rps: rx.rps || []
      }));

      // 注射オーダー
      const injectionOrders = (data?.injectionOrders || []).map(inj => ({
        uuid: inj.uuid,
        orderTime: inj.orderTime?.seconds ? new Date(inj.orderTime.seconds * 1000) : null,
        status: formatOrderStatus(inj.orderStatus),
        doctor: inj.doctor?.name || '不明',
        details: inj.detail || inj
      }));

      // 検査レポート
      const inspectionReports = (data?.inspectionReports || []).map(rep => ({
        uuid: rep.uuid,
        reportTime: rep.reportTime?.seconds ? new Date(rep.reportTime.seconds * 1000) : null,
        title: rep.title || '検査レポート',
        content: rep.content || rep.editorData ? parseEditorData(rep.editorData) : '',
        author: rep.createUser?.name || '不明'
      }));

      // 栄養オーダー
      const nutritionOrders = (data?.nutritionOrders || []).map(nut => ({
        uuid: nut.uuid,
        orderTime: nut.orderTime?.seconds ? new Date(nut.orderTime.seconds * 1000) : null,
        status: formatOrderStatus(nut.orderStatus),
        mealType: nut.mealType || nut.detail?.mealType || '-',
        doctor: nut.doctor?.name || '不明',
        details: nut.detail || nut
      }));

      // ADL評価
      const adlAssessments = (data?.adlAssessments || []).map(adl => ({
        uuid: adl.uuid,
        assessmentTime: adl.assessmentTime?.seconds ? new Date(adl.assessmentTime.seconds * 1000) : null,
        score: adl.totalScore?.value || adl.score || '-',
        author: adl.createUser?.name || '不明',
        details: adl
      }));

      // 看護日誌
      const nursingJournals = (data?.nursingJournals || []).map(nj => ({
        uuid: nj.uuid,
        recordTime: nj.recordTime?.seconds ? new Date(nj.recordTime.seconds * 1000) : null,
        text: nj.editorData ? parseEditorData(nj.editorData) : '',
        author: nj.createUser?.name || '不明'
      })).filter(nj => nj.text);

      return {
        vitalSigns,
        prescriptionOrders,
        injectionOrders,
        inspectionReports,
        nutritionOrders,
        adlAssessments,
        nursingJournals
      };

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] カレンダーデータ取得エラー:`, e);
      return {
        vitalSigns: [],
        prescriptionOrders: [],
        injectionOrders: [],
        inspectionReports: [],
        nutritionOrders: [],
        adlAssessments: [],
        nursingJournals: []
      };
    }
  }

  // オーダーステータスを日本語に変換
  function formatOrderStatus(status) {
    const statusMap = {
      'ORDER_STATUS_ACTIVE': '有効',
      'ORDER_STATUS_DRAFT': '下書き',
      'ORDER_STATUS_ON_HOLD': '保留',
      'ORDER_STATUS_PREPARING': '準備中',
      'ORDER_STATUS_COMPLETED': '完了',
      'ORDER_STATUS_CANCELLED': 'キャンセル'
    };
    return statusMap[status] || status;
  }

  // editorDataをテキストに変換
  function parseEditorData(editorDataStr) {
    try {
      const data = JSON.parse(editorDataStr);
      return data.blocks
        .map(b => b.text)
        .filter(t => t && t.trim())
        .join('\n');
    } catch (e) {
      return '';
    }
  }

  // 文書タイプを日本語に変換
  function formatDocType(type) {
    const typeMap = {
      'HOSPITALIZATION_CONSULTATION': '入院診察',
      'HOSPITALIZATION_PROGRESS': '入院経過',
      'OUTPATIENT_CONSULTATION': '外来診察',
      'CUSTOM': 'カスタム'
    };
    return typeMap[type] || type;
  }

  // 日時フォーマット
  function formatDateTime(date) {
    if (!date) return '-';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // HenryCore待機
  function waitForHenryCore(maxWait = 10000) {
    return new Promise((resolve, reject) => {
      if (window.HenryCore?.query) return resolve(window.HenryCore);
      const start = Date.now();
      const check = setInterval(() => {
        if (window.HenryCore?.query) {
          clearInterval(check);
          resolve(window.HenryCore);
        } else if (Date.now() - start > maxWait) {
          clearInterval(check);
          reject(new Error('HenryCore not found'));
        }
      }, 100);
    });
  }

  // 入院情報取得クエリ（インライン方式）
  // ListPatientHospitalizationsInput型がスキーマに公開されていないため、
  // 値を直接埋め込むインライン方式を使用
  function buildHospitalizationQuery(patientUuid) {
    return `
      query ListPatientHospitalizations {
        listPatientHospitalizations(input: {
          patientUuid: "${patientUuid}",
          pageSize: 10,
          pageToken: ""
        }) {
          hospitalizations {
            uuid
            state
            startDate { year month day }
            endDate { year month day }
            hospitalizationDayCount { value }
            lastHospitalizationLocation {
              ward { name }
              room { name }
            }
          }
        }
      }
    `;
  }

  // メイン処理
  async function fetchHospitalizationData() {
    try {
      const core = await waitForHenryCore();
      const patientUuid = core.getPatientUuid();

      if (!patientUuid) {
        console.error(`[${SCRIPT_NAME}] 患者画面で実行してください`);
        alert('患者画面で実行してください');
        return null;
      }

      console.log(`[${SCRIPT_NAME}] 患者UUID: ${patientUuid}`);

      // 入院情報取得（インライン方式）
      const hospResult = await core.query(buildHospitalizationQuery(patientUuid));

      const hospitalizations = hospResult?.data?.listPatientHospitalizations?.hospitalizations || [];
      const currentHosp = hospitalizations.find(h => h.state === 'ADMITTED');

      if (!currentHosp) {
        console.log(`[${SCRIPT_NAME}] 入院中ではありません`);
        alert('この患者は入院中ではありません');
        return null;
      }

      // 入院開始日をフォーマット
      const startDate = currentHosp.startDate;
      const startDateStr = startDate
        ? `${startDate.year}/${startDate.month}/${startDate.day}`
        : '-';

      // 臨床記録を取得（Persisted Query API）
      const clinicalDocuments = await fetchClinicalDocuments(patientUuid);
      const nursingRecords = await fetchNursingRecords(patientUuid);
      const patientProfiles = await fetchPatientProfile(patientUuid);
      const rehabilitationDocuments = await fetchRehabilitationDocuments(patientUuid);
      const rehabilitationOrders = await fetchRehabilitationOrders(patientUuid);

      // カレンダービューから過去1週間のデータを一括取得
      const calendarData = await fetchCalendarData(patientUuid);

      // 結果を整形
      const result = {
        hospitalization: {
          ward: currentHosp.lastHospitalizationLocation?.ward?.name || '-',
          room: currentHosp.lastHospitalizationLocation?.room?.name || '-',
          dayCount: currentHosp.hospitalizationDayCount?.value || 0,
          startDate: startDateStr,
          uuid: currentHosp.uuid
        },
        allHospitalizations: hospitalizations,
        clinicalDocuments,
        nursingRecords,  // SOAP形式の看護記録（CUSTOMドキュメント）
        patientProfiles,
        rehabilitationDocuments,
        rehabilitationOrders,
        // カレンダービューデータ（過去1週間）
        vitalSigns: calendarData.vitalSigns,
        prescriptionOrders: calendarData.prescriptionOrders,
        injectionOrders: calendarData.injectionOrders,
        inspectionReports: calendarData.inspectionReports,
        nutritionOrders: calendarData.nutritionOrders,
        adlAssessments: calendarData.adlAssessments,
        nursingJournals: calendarData.nursingJournals
      };

      console.log(`[${SCRIPT_NAME}] 入院情報:`, result);
      console.log(`[${SCRIPT_NAME}] 医師記録: ${clinicalDocuments.length}件, 看護記録(SOAP): ${nursingRecords.length}件, プロフィール: ${patientProfiles.length}件`);
      console.log(`[${SCRIPT_NAME}] リハビリ記録: ${rehabilitationDocuments.length}件, リハビリオーダー: ${rehabilitationOrders.length}件`);
      console.log(`[${SCRIPT_NAME}] バイタル: ${calendarData.vitalSigns.length}件, 処方: ${calendarData.prescriptionOrders.length}件, 注射: ${calendarData.injectionOrders.length}件`);
      console.log(`[${SCRIPT_NAME}] 検査: ${calendarData.inspectionReports.length}件, 栄養: ${calendarData.nutritionOrders.length}件, ADL: ${calendarData.adlAssessments.length}件, 看護日誌: ${calendarData.nursingJournals.length}件`);

      // サマリー表示
      showSummary(result);

      return result;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] エラー:`, e);
      alert(`データ取得エラー: ${e.message}`);
      return null;
    }
  }

  // サマリーモーダル表示
  function showSummary(data) {
    // 既存モーダルを削除
    document.getElementById('hosp-data-modal')?.remove();

    // 入院履歴テーブル生成
    const historyRows = data.allHospitalizations.map(h => {
      const start = h.startDate ? `${h.startDate.year}/${h.startDate.month}/${h.startDate.day}` : '-';
      const end = h.endDate ? `${h.endDate.year}/${h.endDate.month}/${h.endDate.day}` : '-';
      const stateLabel = h.state === 'ADMITTED' ? '入院中' : h.state === 'DISCHARGED' ? '退院済' : h.state;
      const ward = h.lastHospitalizationLocation?.ward?.name || '-';
      const room = h.lastHospitalizationLocation?.room?.name || '-';
      return `
        <tr>
          <td>${stateLabel}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${ward}</td>
          <td>${room}</td>
          <td>${h.hospitalizationDayCount?.value || '-'}</td>
        </tr>
      `;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'hosp-data-modal';
    modal.innerHTML = `
      <style>
        #hosp-data-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #hosp-data-modal .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          padding: 20px;
          font-family: sans-serif;
        }
        #hosp-data-modal h2 { margin-top: 0; }
        #hosp-data-modal h3 {
          margin: 16px 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
        }
        #hosp-data-modal .close-btn {
          float: right;
          background: #666;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        #hosp-data-modal table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        #hosp-data-modal th, #hosp-data-modal td {
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        #hosp-data-modal th { background: #f5f5f5; }
        #hosp-data-modal .info-box {
          background: #e3f2fd;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        #hosp-data-modal .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        #hosp-data-modal .info-label {
          font-weight: bold;
          width: 100px;
        }
        #hosp-data-modal .records-list {
          max-height: 300px;
          overflow-y: auto;
        }
        #hosp-data-modal .record-item {
          background: #f9f9f9;
          padding: 10px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 3px solid #4CAF50;
        }
        #hosp-data-modal .record-header {
          display: flex;
          gap: 12px;
          margin-bottom: 6px;
          font-size: 12px;
          color: #666;
        }
        #hosp-data-modal .record-type {
          background: #e8f5e9;
          padding: 2px 6px;
          border-radius: 3px;
          color: #2e7d32;
          font-weight: 500;
        }
        #hosp-data-modal .record-text {
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        #hosp-data-modal .more-records {
          color: #666;
          font-size: 12px;
          text-align: center;
        }
      </style>
      <div class="modal-content">
        <button class="close-btn" onclick="this.closest('#hosp-data-modal').remove()">閉じる</button>
        <h2>入院情報</h2>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">病棟:</span>
            <span>${data.hospitalization.ward}</span>
          </div>
          <div class="info-row">
            <span class="info-label">病室:</span>
            <span>${data.hospitalization.room}号室</span>
          </div>
          <div class="info-row">
            <span class="info-label">入院日:</span>
            <span>${data.hospitalization.startDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">入院日数:</span>
            <span>${data.hospitalization.dayCount}日目</span>
          </div>
        </div>

        <h3>入院履歴 (${data.allHospitalizations.length}件)</h3>
        ${data.allHospitalizations.length ? `
          <table>
            <tr>
              <th>状態</th>
              <th>入院日</th>
              <th>退院日</th>
              <th>病棟</th>
              <th>病室</th>
              <th>日数</th>
            </tr>
            ${historyRows}
          </table>
        ` : '<p>データなし</p>'}

        <h3>医師記録 (${data.clinicalDocuments?.length || 0}件)</h3>
        ${data.clinicalDocuments?.length ? `
          <div class="records-list">
            ${data.clinicalDocuments.slice(0, 5).map(doc => `
              <div class="record-item">
                <div class="record-header">
                  <span class="record-type">${doc.type}</span>
                  <span class="record-time">${formatDateTime(doc.performTime)}</span>
                  <span class="record-author">${doc.author}</span>
                </div>
                <div class="record-text">${doc.text.replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
            ${data.clinicalDocuments.length > 5 ? `<p class="more-records">他 ${data.clinicalDocuments.length - 5}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>看護記録SOAP (${data.nursingRecords?.length || 0}件)</h3>
        ${data.nursingRecords?.length ? `
          <div class="records-list">
            ${data.nursingRecords.slice(0, 5).map(journal => `
              <div class="record-item">
                <div class="record-header">
                  <span class="record-time">${formatDateTime(journal.eventTime)}</span>
                  <span class="record-author">${journal.author}</span>
                </div>
                <div class="record-text">${journal.text.replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
            ${data.nursingRecords.length > 5 ? `<p class="more-records">他 ${data.nursingRecords.length - 5}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>患者プロフィール (${data.patientProfiles?.length || 0}件)</h3>
        ${data.patientProfiles?.length ? `
          <div class="records-list">
            ${data.patientProfiles.map(profile => `
              <div class="record-item" style="border-left-color: #2196F3;">
                <div class="record-header">
                  <span class="record-type" style="background: #e3f2fd; color: #1565c0;">プロフィール</span>
                  <span class="record-time">${formatDateTime(profile.updateTime)}</span>
                  <span class="record-author">${profile.author}</span>
                </div>
                <div class="record-text">${profile.text.replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
          </div>
        ` : '<p>データなし</p>'}

        <h3>リハビリ日々記録 (${data.rehabilitationDocuments?.length || 0}件)</h3>
        ${data.rehabilitationDocuments?.length ? `
          <div class="records-list">
            ${data.rehabilitationDocuments.slice(0, 10).map(doc => `
              <div class="record-item" style="border-left-color: #9C27B0;">
                <div class="record-header">
                  <span class="record-type" style="background: #f3e5f5; color: #7b1fa2;">リハビリ記録</span>
                  <span class="record-time">${formatDateTime(doc.performTime)}</span>
                  <span class="record-author">${doc.author}</span>
                </div>
                <div class="record-text">${doc.text.replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
            ${data.rehabilitationDocuments.length > 10 ? `<p class="more-records">他 ${data.rehabilitationDocuments.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>リハビリオーダー (${data.rehabilitationOrders?.length || 0}件)</h3>
        ${data.rehabilitationOrders?.length ? `
          <div class="records-list">
            ${data.rehabilitationOrders.map(order => `
              <div class="record-item" style="border-left-color: #FF9800;">
                <div class="record-header">
                  <span class="record-type" style="background: #fff3e0; color: #e65100;">${order.status}</span>
                  <span class="record-time">${order.startDate} 〜 ${order.endDate}</span>
                  <span class="record-author">${order.doctor}</span>
                </div>
                <div class="record-text">
                  <strong>種別:</strong> ${order.calculationType} (${order.period})<br>
                  <strong>対象疾患:</strong> ${order.disease}<br>
                  <strong>療法開始日:</strong> ${order.therapyStartDate}<br>
                  <strong>プラン:</strong><br>${order.plans.replace(/\n/g, '<br>')}
                  ${order.note ? `<br><strong>備考:</strong> ${order.note}` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p>データなし</p>'}

        <h3>バイタルサイン (${data.vitalSigns?.length || 0}件)</h3>
        ${data.vitalSigns?.length ? `
          <div class="records-list">
            ${data.vitalSigns.slice(0, 10).map(vs => `
              <div class="record-item" style="border-left-color: #E91E63;">
                <div class="record-header">
                  <span class="record-type" style="background: #fce4ec; color: #c2185b;">バイタル</span>
                  <span class="record-time">${formatDateTime(vs.recordTime)}</span>
                  <span class="record-author">${vs.author}</span>
                </div>
                <div class="record-text">
                  ${vs.temperature ? `<strong>T:</strong> ${vs.temperature}℃　` : ''}
                  ${vs.bloodPressureUpper && vs.bloodPressureLower ? `<strong>BP:</strong> ${vs.bloodPressureUpper}/${vs.bloodPressureLower}mmHg　` : ''}
                  ${vs.pulseRate ? `<strong>P:</strong> ${vs.pulseRate}bpm　` : ''}
                  ${vs.spo2 ? `<strong>SpO2:</strong> ${vs.spo2}%` : ''}
                  ${vs.respiration ? `<br><strong>呼吸:</strong> ${vs.respiration}回/分` : ''}
                  ${vs.bloodSugar ? `<br><strong>血糖:</strong> ${vs.bloodSugar}mg/dL` : ''}
                </div>
              </div>
            `).join('')}
            ${data.vitalSigns.length > 10 ? `<p class="more-records">他 ${data.vitalSigns.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>処方オーダー (${data.prescriptionOrders?.length || 0}件)</h3>
        ${data.prescriptionOrders?.length ? `
          <div class="records-list">
            ${data.prescriptionOrders.slice(0, 10).map(rx => `
              <div class="record-item" style="border-left-color: #3F51B5;">
                <div class="record-header">
                  <span class="record-type" style="background: #e8eaf6; color: #303f9f;">処方</span>
                  <span class="record-time">${formatDateTime(rx.orderTime)}</span>
                  <span class="record-author">${rx.doctor}</span>
                </div>
                <div class="record-text">
                  <strong>ステータス:</strong> ${rx.status}<br>
                  ${rx.rps?.length ? rx.rps.map((rp, i) =>
                    `<strong>Rp${i+1}:</strong> ${rp.instructions?.map(inst =>
                      inst.instruction?.medicationDosageInstruction?.localMedicine?.name ||
                      inst.instruction?.medicationDosageInstruction?.medicine?.name || '不明'
                    ).join(', ') || '詳細不明'}`
                  ).join('<br>') : '処方詳細: コンソールで確認'}
                </div>
              </div>
            `).join('')}
            ${data.prescriptionOrders.length > 10 ? `<p class="more-records">他 ${data.prescriptionOrders.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>注射オーダー (${data.injectionOrders?.length || 0}件)</h3>
        ${data.injectionOrders?.length ? `
          <div class="records-list">
            ${data.injectionOrders.slice(0, 10).map(inj => `
              <div class="record-item" style="border-left-color: #009688;">
                <div class="record-header">
                  <span class="record-type" style="background: #e0f2f1; color: #00796b;">注射</span>
                  <span class="record-time">${formatDateTime(inj.orderTime)}</span>
                  <span class="record-author">${inj.doctor}</span>
                </div>
                <div class="record-text">
                  <strong>ステータス:</strong> ${inj.status}<br>
                  注射詳細: コンソールで確認
                </div>
              </div>
            `).join('')}
            ${data.injectionOrders.length > 10 ? `<p class="more-records">他 ${data.injectionOrders.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>検査レポート (${data.inspectionReports?.length || 0}件)</h3>
        ${data.inspectionReports?.length ? `
          <div class="records-list">
            ${data.inspectionReports.slice(0, 10).map(rep => `
              <div class="record-item" style="border-left-color: #795548;">
                <div class="record-header">
                  <span class="record-type" style="background: #efebe9; color: #5d4037;">検査</span>
                  <span class="record-time">${formatDateTime(rep.reportTime)}</span>
                  <span class="record-author">${rep.author}</span>
                </div>
                <div class="record-text">
                  ${rep.title ? `<strong>${rep.title}</strong><br>` : ''}
                  ${rep.content ? rep.content.replace(/\n/g, '<br>') : '詳細: コンソールで確認'}
                </div>
              </div>
            `).join('')}
            ${data.inspectionReports.length > 10 ? `<p class="more-records">他 ${data.inspectionReports.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>栄養オーダー (${data.nutritionOrders?.length || 0}件)</h3>
        ${data.nutritionOrders?.length ? `
          <div class="records-list">
            ${data.nutritionOrders.slice(0, 10).map(nut => `
              <div class="record-item" style="border-left-color: #8BC34A;">
                <div class="record-header">
                  <span class="record-type" style="background: #f1f8e9; color: #689f38;">栄養</span>
                  <span class="record-time">${formatDateTime(nut.orderTime)}</span>
                  <span class="record-author">${nut.doctor}</span>
                </div>
                <div class="record-text">
                  <strong>ステータス:</strong> ${nut.status}<br>
                  <strong>食事種別:</strong> ${nut.mealType}<br>
                  詳細: コンソールで確認
                </div>
              </div>
            `).join('')}
            ${data.nutritionOrders.length > 10 ? `<p class="more-records">他 ${data.nutritionOrders.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>ADL評価 (${data.adlAssessments?.length || 0}件)</h3>
        ${data.adlAssessments?.length ? `
          <div class="records-list">
            ${data.adlAssessments.slice(0, 10).map(adl => `
              <div class="record-item" style="border-left-color: #607D8B;">
                <div class="record-header">
                  <span class="record-type" style="background: #eceff1; color: #455a64;">ADL</span>
                  <span class="record-time">${formatDateTime(adl.assessmentTime)}</span>
                  <span class="record-author">${adl.author}</span>
                </div>
                <div class="record-text">
                  <strong>スコア:</strong> ${adl.score}<br>
                  詳細: コンソールで確認
                </div>
              </div>
            `).join('')}
            ${data.adlAssessments.length > 10 ? `<p class="more-records">他 ${data.adlAssessments.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <h3>看護日誌 (${data.nursingJournals?.length || 0}件)</h3>
        ${data.nursingJournals?.length ? `
          <div class="records-list">
            ${data.nursingJournals.slice(0, 10).map(nj => `
              <div class="record-item" style="border-left-color: #FF5722;">
                <div class="record-header">
                  <span class="record-type" style="background: #fbe9e7; color: #e64a19;">日誌</span>
                  <span class="record-time">${formatDateTime(nj.recordTime)}</span>
                  <span class="record-author">${nj.author}</span>
                </div>
                <div class="record-text">${nj.text.replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
            ${data.nursingJournals.length > 10 ? `<p class="more-records">他 ${data.nursingJournals.length - 10}件...</p>` : ''}
          </div>
        ` : '<p>データなし</p>'}

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          ※ コンソールに詳細データが出力されています（F12で確認）<br>
          ※ 過去1週間のデータを表示しています
        </p>
      </div>
    `;

    // クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  // プラグイン登録
  async function init() {
    try {
      const core = await waitForHenryCore();

      core.registerPlugin({
        id: 'hospitalization-data',
        name: '入院データ取得',
        version: VERSION,
        description: '入院患者の入院情報・履歴を表示',
        onClick: fetchHospitalizationData
      });

      console.log(`[${SCRIPT_NAME}] v${VERSION} 初期化完了`);
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 初期化失敗:`, e);
    }
  }

  // グローバル公開（デバッグ用）
  window.HospitalizationData = {
    fetch: fetchHospitalizationData,
    version: VERSION
  };

  init();
})();
