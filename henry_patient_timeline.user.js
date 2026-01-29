// ==UserScript==
// @name         Henry Patient Timeline
// @namespace    https://github.com/shin-926/Henry
// @version      1.4.0
// @description  入院患者の各種記録・オーダーをガントチャート風タイムラインで表示
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_patient_timeline.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_patient_timeline.user.js
// ==/UserScript==

/*
 * 【入院患者タイムライン】
 *
 * ■ 使用場面
 * - 入院患者の記録・オーダーを時系列で俯瞰したい場合
 * - 特定の日に何があったか確認したい場合
 *
 * ■ 機能
 * - ガントチャート風タイムライン表示（縦軸:日付、横軸:カテゴリ）
 * - 医師記録、看護記録、リハビリ記録を点(●)で表示
 * - カテゴリフィルタ、日付フィルタ、キーワード検索
 * - 詳細パネル表示
 *
 * ■ データソース
 * - 医師記録: GraphQL API (ListClinicalDocuments - HOSPITALIZATION_CONSULTATION)
 * - 看護記録: GraphQL API (ListClinicalDocuments - CUSTOM type)
 * - リハビリ記録: GraphQL API (ListRehabilitationDocuments)
 * - 入院情報: GraphQL API (ListPatientHospitalizations)
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'PatientTimeline';
  const VERSION = GM_info.script.version;

  // カテゴリ定義
  const CATEGORIES = {
    doctor: { id: 'doctor', name: '医師記録', color: '#4CAF50', bgColor: '#e8f5e9' },
    nursing: { id: 'nursing', name: '看護記録', color: '#FF5722', bgColor: '#fbe9e7' },
    rehab: { id: 'rehab', name: 'リハビリ', color: '#9C27B0', bgColor: '#f3e5f5' },
    prescription: { id: 'prescription', name: '処方', color: '#3F51B5', bgColor: '#e8eaf6' },
    injection: { id: 'injection', name: '注射', color: '#009688', bgColor: '#e0f2f1' },
    vital: { id: 'vital', name: 'バイタル', color: '#E91E63', bgColor: '#fce4ec' }
  };

  // CUSTOMタイプのUUID
  const NURSING_RECORD_CUSTOM_TYPE_UUID = 'e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f';

  // 組織UUID（マオカ病院）
  const ORG_UUID = 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825';

  // カレンダービューリソース（GetClinicalCalendarView用）
  const CALENDAR_RESOURCES = [
    '//henry-app.jp/clinicalResource/vitalSign',
    '//henry-app.jp/clinicalResource/prescriptionOrder',
    '//henry-app.jp/clinicalResource/injectionOrder'
  ];

  // GraphQL Queries
  const QUERIES = {
    LIST_CLINICAL_DOCUMENTS: `
      query ListClinicalDocuments($input: ListClinicalDocumentsRequestInput!) {
        listClinicalDocuments(input: $input) {
          documents {
            uuid
            editorData
            performTime { seconds }
            updateTime { seconds }
            creator { name }
            type { type }
          }
          nextPageToken
        }
      }
    `
  };

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

  // 日付フォーマット（短縮形）
  function formatShortDate(date) {
    if (!date) return '-';
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()} (${dayOfWeek})`;
  }

  // 日時フォーマット
  function formatDateTime(date) {
    if (!date) return '-';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // 日付を正規化（時分秒を0に）
  function normalizeDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // 日付キー生成（YYYY-MM-DD形式）
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // HTMLエスケープ
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 正規表現エスケープ
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // テキストにハイライトを適用
  function highlightText(text, searchText) {
    if (!searchText || !searchText.trim()) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(searchText)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark style="background: #ffeb3b; padding: 0 2px;">$1</mark>');
  }

  // 入院情報取得クエリ
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

  // 入院情報取得
  async function fetchHospitalizations(patientUuid) {
    try {
      const result = await window.HenryCore.query(buildHospitalizationQuery(patientUuid));
      return result?.data?.listPatientHospitalizations?.hospitalizations || [];
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院情報取得エラー:`, e);
      return [];
    }
  }

  // 医師記録取得
  async function fetchDoctorRecords(patientUuid) {
    const allDocuments = [];
    let pageToken = '';

    try {
      do {
        const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
          input: {
            patientUuid,
            pageToken,
            pageSize: 100,
            clinicalDocumentTypes: [{ type: 'HOSPITALIZATION_CONSULTATION' }]
          }
        });

        const data = result?.data?.listClinicalDocuments;
        const documents = data?.documents || [];

        for (const doc of documents) {
          const text = parseEditorData(doc.editorData);
          if (text) {
            allDocuments.push({
              id: doc.uuid,
              category: 'doctor',
              date: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
              title: '入院診察',
              text,
              author: doc.creator?.name || '不明'
            });
          }
        }

        pageToken = data?.nextPageToken || '';
      } while (pageToken);

      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 医師記録取得エラー:`, e);
      return [];
    }
  }

  // 看護記録取得
  async function fetchNursingRecords(patientUuid) {
    const allDocuments = [];
    let pageToken = '';

    try {
      do {
        const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
          input: {
            patientUuid,
            pageToken,
            pageSize: 100,
            clinicalDocumentTypes: [{
              type: 'CUSTOM',
              clinicalDocumentCustomTypeUuid: { value: NURSING_RECORD_CUSTOM_TYPE_UUID }
            }]
          }
        });

        const data = result?.data?.listClinicalDocuments;
        const documents = data?.documents || [];

        for (const doc of documents) {
          const text = parseEditorData(doc.editorData);
          if (text) {
            allDocuments.push({
              id: doc.uuid,
              category: 'nursing',
              date: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
              title: '看護記録',
              text,
              author: doc.creator?.name || '不明'
            });
          }
        }

        pageToken = data?.nextPageToken || '';
      } while (pageToken);

      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 看護記録取得エラー:`, e);
      return [];
    }
  }

  // リハビリ記録取得
  async function fetchRehabRecords(patientUuid, startDate) {
    const allDocuments = [];

    try {
      // 入院開始日から今日までの各日を取得
      const today = new Date();
      const start = new Date(startDate);

      // 日付ごとにAPIを呼ぶのではなく、日付なしで取得を試みる
      // ListRehabilitationDocumentsは日付パラメータを必要とするが、
      // 広い範囲を取得するため今日の日付で呼び出す
      const query = `
        query ListRehabilitationDocuments {
          listRehabilitationDocuments(input: {
            patientUuid: "${patientUuid}",
            date: {
              year: ${today.getFullYear()},
              month: ${today.getMonth() + 1},
              day: ${today.getDate()}
            },
            pageSize: 500,
            pageToken: ""
          }) {
            documents {
              uuid
              editorData
              performTime { seconds }
              createUser { name }
            }
          }
        }
      `;
      const result = await window.HenryCore.query(query);
      const documents = result?.data?.listRehabilitationDocuments?.documents || [];

      for (const doc of documents) {
        const text = parseEditorData(doc.editorData);
        if (text) {
          allDocuments.push({
            id: doc.uuid,
            category: 'rehab',
            date: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
            title: 'リハビリ記録',
            text,
            author: doc.createUser?.name || '不明'
          });
        }
      }

      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] リハビリ記録取得エラー:`, e);
      return [];
    }
  }

  // Persisted Query を使用してAPIを呼び出す
  async function callPersistedQuery(operationName, variables, sha256Hash) {
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

  // 入院中の全患者を取得
  async function fetchAllHospitalizedPatients() {
    try {
      const today = new Date();
      const result = await callPersistedQuery(
        'ListDailyWardHospitalizations',
        {
          input: {
            wardIds: [],
            searchDate: {
              year: today.getFullYear(),
              month: today.getMonth() + 1,
              day: today.getDate()
            },
            roomIds: [],
            searchText: ''
          }
        },
        'e1692624de62dd647f1e30bbeb9d468a67b777510710c474fb99f9a5b52ee02f'
      );

      // デバッグ: レスポンス構造を確認
      console.log(`[${SCRIPT_NAME}] API Response:`, result);

      // GraphQL errors をチェック
      if (result?.errors) {
        console.error(`[${SCRIPT_NAME}] GraphQL errors:`, result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      return result?.data?.listDailyWardHospitalizations?.dailyWardHospitalizations || [];
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院患者一覧取得エラー:`, e?.message || e);
      return [];
    }
  }

  // カレンダービューデータを取得（GetClinicalCalendarView API）
  // 入院開始日から今日までのデータを取得
  async function fetchCalendarData(patientUuid, hospitalizationStartDate) {
    try {
      const today = new Date();
      const startDate = new Date(hospitalizationStartDate);
      // 入院開始日から今日までの日数を計算
      const diffDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
      const beforeDateSize = Math.min(diffDays + 1, 60); // 最大60日

      const result = await callPersistedQuery(
        'GetClinicalCalendarView',
        {
          input: {
            patientUuid: patientUuid,
            baseDate: {
              year: today.getFullYear(),
              month: today.getMonth() + 1,
              day: today.getDate()
            },
            beforeDateSize: beforeDateSize,
            afterDateSize: 0,
            clinicalResourceHrns: CALENDAR_RESOURCES,
            createUserUuids: [],
            accountingOrderShinryoShikibetsus: []
          }
        },
        '74f284465206f367c4c544c20b020204478fa075a1fd3cb1bf3fd266ced026e1'
      );

      const data = result?.data?.getClinicalCalendarView;

      // バイタルサイン
      const vitalSigns = (data?.vitalSigns || []).map(vs => ({
        id: vs.uuid,
        category: 'vital',
        date: vs.recordTime?.seconds ? new Date(vs.recordTime.seconds * 1000) : null,
        title: 'バイタルサイン',
        text: formatVitalSign(vs),
        author: vs.createUser?.name || '不明'
      })).filter(vs => vs.date);

      // 処方オーダー
      const prescriptionOrders = (data?.prescriptionOrders || []).flatMap(rx => {
        const orderTime = rx.createTime?.seconds ? new Date(rx.createTime.seconds * 1000) : null;
        const doctor = rx.doctor?.name || '不明';
        const status = formatOrderStatus(rx.orderStatus);

        // 各Rpを個別のアイテムとして展開
        return (rx.rps || []).map((rp, idx) => {
          const medicines = (rp.instructions || []).map(inst => {
            const med = inst.instruction?.medicationDosageInstruction;
            return med?.localMedicine?.name || med?.medicine?.name || '不明';
          }).filter(Boolean);

          return {
            id: `${rx.uuid}-rp${idx}`,
            category: 'prescription',
            date: orderTime,
            title: `処方 Rp${idx + 1}`,
            text: medicines.join('\n') || '詳細不明',
            author: doctor,
            status: status
          };
        });
      }).filter(rx => rx.date);

      // 注射オーダー
      const injectionOrders = (data?.injectionOrders || []).map(inj => {
        const orderTime = inj.createTime?.seconds ? new Date(inj.createTime.seconds * 1000) : null;
        return {
          id: inj.uuid,
          category: 'injection',
          date: orderTime,
          title: '注射',
          text: formatInjectionOrder(inj),
          author: inj.doctor?.name || '不明',
          status: formatOrderStatus(inj.orderStatus)
        };
      }).filter(inj => inj.date);

      return [...vitalSigns, ...prescriptionOrders, ...injectionOrders];

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] カレンダーデータ取得エラー:`, e);
      return [];
    }
  }

  // バイタルサインをテキストに整形
  function formatVitalSign(vs) {
    const parts = [];
    if (vs.temperature?.value) parts.push(`T: ${vs.temperature.value / 10}℃`);
    if (vs.bloodPressureUpperBound?.value && vs.bloodPressureLowerBound?.value) {
      parts.push(`BP: ${vs.bloodPressureUpperBound.value / 10}/${vs.bloodPressureLowerBound.value / 10}mmHg`);
    }
    if (vs.pulseRate?.value) parts.push(`P: ${vs.pulseRate.value / 10}bpm`);
    if (vs.spo2?.value) parts.push(`SpO2: ${vs.spo2.value / 10}%`);
    if (vs.respiration?.value) parts.push(`呼吸: ${vs.respiration.value / 10}回/分`);
    if (vs.bloodSugar?.value) parts.push(`血糖: ${vs.bloodSugar.value / 10}mg/dL`);
    return parts.join('\n') || 'データなし';
  }

  // 注射オーダーをテキストに整形
  function formatInjectionOrder(inj) {
    // 注射の詳細構造は複雑なため、基本情報のみ
    const status = formatOrderStatus(inj.orderStatus);
    return `ステータス: ${status}`;
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
    return statusMap[status] || status || '-';
  }

  // 全データ取得
  async function fetchAllData(patientUuid, hospitalizationStartDate) {
    const [doctorRecords, nursingRecords, rehabRecords, calendarItems] = await Promise.all([
      fetchDoctorRecords(patientUuid),
      fetchNursingRecords(patientUuid),
      fetchRehabRecords(patientUuid, hospitalizationStartDate),
      fetchCalendarData(patientUuid, hospitalizationStartDate)
    ]);

    const allItems = [...doctorRecords, ...nursingRecords, ...rehabRecords, ...calendarItems];

    // 日付でソート（新しい順）
    allItems.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date - a.date;
    });

    return allItems;
  }

  // 入院期間内でフィルタリング
  function filterByHospitalizationPeriod(items, startDate, endDate) {
    const start = normalizeDate(startDate);
    const end = endDate ? normalizeDate(endDate) : normalizeDate(new Date());
    end.setHours(23, 59, 59, 999);

    return items.filter(item => {
      if (!item.date) return false;
      return item.date >= start && item.date <= end;
    });
  }

  // 日付ごとにグループ化
  function groupByDate(items) {
    const grouped = new Map();

    for (const item of items) {
      if (!item.date) continue;
      const key = dateKey(item.date);
      if (!grouped.has(key)) {
        grouped.set(key, { date: normalizeDate(item.date), items: [] });
      }
      grouped.get(key).items.push(item);
    }

    // 日付の新しい順にソート
    return Array.from(grouped.values()).sort((a, b) => b.date - a.date);
  }

  // 日付リスト生成（入院期間全日）
  function generateDateList(startDate, endDate) {
    const dates = [];
    const start = normalizeDate(startDate);
    const end = endDate ? normalizeDate(endDate) : normalizeDate(new Date());

    const current = new Date(end);
    while (current >= start) {
      dates.push(new Date(current));
      current.setDate(current.getDate() - 1);
    }

    return dates;
  }

  // タイムラインモーダル表示
  function showTimelineModal() {
    // 既存モーダルを削除
    document.getElementById('patient-timeline-modal')?.remove();

    // 状態管理
    let currentView = 'patient-select'; // 'patient-select' or 'timeline'
    let allPatients = [];
    let patientSearchText = '';
    let selectedPatient = null;
    let allItems = [];
    let filteredItems = [];
    let hospitalizations = [];
    let currentHospitalization = null;
    let selectedCategories = new Set(Object.keys(CATEGORIES));
    let searchText = '';
    let selectedDateKey = null;
    let isLoading = true;

    const modal = document.createElement('div');
    modal.id = 'patient-timeline-modal';
    modal.innerHTML = `
      <style>
        #patient-timeline-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1500;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #patient-timeline-modal .modal-content {
          background: white;
          border-radius: 8px;
          width: 95vw;
          max-width: 1200px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #patient-timeline-modal .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        #patient-timeline-modal .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        #patient-timeline-modal .header-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        #patient-timeline-modal .back-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 4px 8px;
          margin-right: 8px;
          border-radius: 4px;
        }
        #patient-timeline-modal .back-btn:hover {
          background: #f0f0f0;
          color: #333;
        }
        #patient-timeline-modal .hosp-info {
          font-size: 13px;
          color: #666;
        }
        #patient-timeline-modal .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }
        #patient-timeline-modal .close-btn:hover {
          color: #333;
        }
        #patient-timeline-modal .controls {
          padding: 12px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        #patient-timeline-modal .search-input {
          flex: 1;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        #patient-timeline-modal .search-input:focus {
          outline: none;
          border-color: #2196F3;
        }
        #patient-timeline-modal .category-filters {
          display: flex;
          gap: 8px;
        }
        #patient-timeline-modal .category-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          border: 1px solid;
          transition: all 0.2s;
        }
        #patient-timeline-modal .category-chip.active {
          opacity: 1;
        }
        #patient-timeline-modal .category-chip.inactive {
          opacity: 0.4;
          background: #f5f5f5 !important;
          border-color: #ccc !important;
          color: #999 !important;
        }
        #patient-timeline-modal .main-area {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        #patient-timeline-modal .timeline-container {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }
        #patient-timeline-modal .timeline-grid {
          display: grid;
          /* grid-template-columns は renderTimeline() で動的に設定 */
          min-width: 100%;
        }
        #patient-timeline-modal .grid-header {
          display: contents;
        }
        #patient-timeline-modal .grid-header-cell {
          position: sticky;
          top: 0;
          background: #f5f5f5;
          padding: 12px 8px;
          font-weight: 600;
          font-size: 13px;
          text-align: center;
          border-bottom: 2px solid #ddd;
          z-index: 10;
        }
        #patient-timeline-modal .grid-row {
          display: contents;
        }
        #patient-timeline-modal .grid-row:hover .date-cell,
        #patient-timeline-modal .grid-row:hover .data-cell {
          background: #f8f9fa;
        }
        #patient-timeline-modal .date-cell {
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          border-bottom: 1px solid #eee;
          background: white;
          position: sticky;
          left: 0;
          z-index: 5;
        }
        #patient-timeline-modal .date-cell.weekend {
          color: #e53935;
        }
        #patient-timeline-modal .data-cell {
          padding: 8px;
          border-bottom: 1px solid #eee;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: center;
          align-items: center;
          min-height: 36px;
        }
        #patient-timeline-modal .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s;
          position: relative;
        }
        #patient-timeline-modal .dot:hover {
          transform: scale(1.3);
        }
        #patient-timeline-modal .dot.selected {
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.4);
        }
        #patient-timeline-modal .dot-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 100;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s;
        }
        #patient-timeline-modal .dot:hover .dot-tooltip {
          opacity: 1;
        }
        #patient-timeline-modal .detail-panel {
          width: 400px;
          border-left: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          background: #fafafa;
        }
        #patient-timeline-modal .detail-panel.hidden {
          display: none;
        }
        #patient-timeline-modal .detail-header {
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
        }
        #patient-timeline-modal .detail-title {
          font-weight: 600;
          font-size: 14px;
        }
        #patient-timeline-modal .detail-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 0;
        }
        #patient-timeline-modal .detail-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        #patient-timeline-modal .detail-meta {
          margin-bottom: 12px;
          font-size: 13px;
          color: #666;
        }
        #patient-timeline-modal .detail-meta-row {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
        }
        #patient-timeline-modal .detail-label {
          font-weight: 500;
          color: #333;
        }
        #patient-timeline-modal .detail-text {
          background: white;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        #patient-timeline-modal .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 14px;
          color: #666;
        }
        #patient-timeline-modal .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          font-size: 14px;
        }
        #patient-timeline-modal .category-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        #patient-timeline-modal .date-cell {
          cursor: pointer;
        }
        #patient-timeline-modal .date-cell:hover {
          background: #e3f2fd !important;
        }
        /* 患者選択画面のスタイル */
        #patient-timeline-modal .patient-list-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        #patient-timeline-modal .ward-section {
          margin-bottom: 24px;
        }
        #patient-timeline-modal .ward-header {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        #patient-timeline-modal .room-section {
          margin-left: 16px;
          margin-bottom: 12px;
        }
        #patient-timeline-modal .room-header {
          font-size: 13px;
          font-weight: 500;
          color: #666;
          padding: 4px 8px;
          margin-bottom: 4px;
        }
        #patient-timeline-modal .patient-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          margin-left: 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s;
        }
        #patient-timeline-modal .patient-item:hover {
          background: #e3f2fd;
        }
        #patient-timeline-modal .patient-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        #patient-timeline-modal .patient-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        #patient-timeline-modal .patient-serial {
          font-size: 12px;
          color: #666;
        }
        #patient-timeline-modal .patient-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        #patient-timeline-modal .patient-days {
          font-size: 12px;
          color: #666;
          background: #f0f0f0;
          padding: 2px 8px;
          border-radius: 10px;
        }
        #patient-timeline-modal .patient-arrow {
          font-size: 16px;
          color: #999;
        }
      </style>
      <div class="modal-content">
        <div class="modal-header">
          <div class="header-info">
            <button class="back-btn" id="back-btn" title="患者選択に戻る" style="display: none;">←</button>
            <h2 id="modal-title">入院タイムライン</h2>
            <span class="hosp-info" id="hosp-info"></span>
          </div>
          <button class="close-btn" title="閉じる">&times;</button>
        </div>
        <div class="controls" id="controls-area">
          <input type="text" class="search-input" placeholder="患者検索（名前・患者番号）..." id="patient-search-input">
        </div>
        <div class="main-area">
          <div class="patient-list-container" id="patient-list-container">
            <div class="loading">入院患者を読み込んでいます...</div>
          </div>
          <div class="timeline-container" id="timeline-container" style="display: none;">
            <div class="loading">データを読み込んでいます...</div>
          </div>
          <div class="detail-panel hidden" id="detail-panel">
            <div class="detail-header">
              <span class="detail-title">詳細</span>
              <button class="detail-close">&times;</button>
            </div>
            <div class="detail-content" id="detail-content"></div>
          </div>
        </div>
      </div>
    `;

    // DOM要素取得
    const closeBtn = modal.querySelector('.close-btn');
    const backBtn = modal.querySelector('#back-btn');
    const modalTitle = modal.querySelector('#modal-title');
    const patientSearchInput = modal.querySelector('#patient-search-input');
    const controlsArea = modal.querySelector('#controls-area');
    const patientListContainer = modal.querySelector('#patient-list-container');
    const timelineContainer = modal.querySelector('#timeline-container');
    const detailPanel = modal.querySelector('#detail-panel');
    const detailContent = modal.querySelector('#detail-content');
    const detailClose = modal.querySelector('.detail-close');
    const hospInfo = modal.querySelector('#hosp-info');

    // 閉じる
    closeBtn.onclick = () => modal.remove();
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // ESCキーで閉じる
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // 戻るボタン
    backBtn.onclick = () => {
      switchToPatientSelect();
    };

    // 詳細パネル閉じる
    detailClose.onclick = () => {
      detailPanel.classList.add('hidden');
      selectedDateKey = null;
      renderTimeline();
    };

    // 患者選択画面に切り替え
    function switchToPatientSelect() {
      currentView = 'patient-select';
      selectedPatient = null;
      allItems = [];
      filteredItems = [];
      currentHospitalization = null;
      selectedDateKey = null;

      backBtn.style.display = 'none';
      modalTitle.textContent = '入院タイムライン';
      hospInfo.textContent = '';

      // 検索コントロールを患者検索に切り替え
      controlsArea.innerHTML = `
        <input type="text" class="search-input" placeholder="患者検索（名前・患者番号）..." id="patient-search-input" value="${escapeHtml(patientSearchText)}">
      `;
      setupPatientSearchEvent();

      patientListContainer.style.display = 'block';
      timelineContainer.style.display = 'none';
      detailPanel.classList.add('hidden');

      renderPatientList();
    }

    // タイムライン画面に切り替え
    function switchToTimeline(patient) {
      currentView = 'timeline';
      selectedPatient = patient;

      backBtn.style.display = 'block';
      modalTitle.textContent = `${patient.fullName}（${patient.serialNumber}）`;
      hospInfo.textContent = '読み込み中...';

      // 検索コントロールをタイムライン用に切り替え
      controlsArea.innerHTML = `
        <input type="text" class="search-input" placeholder="キーワード検索..." id="timeline-search-input">
        <div class="category-filters" id="category-filters"></div>
      `;
      setupTimelineSearchEvent();
      renderCategoryFilters();

      patientListContainer.style.display = 'none';
      timelineContainer.style.display = 'block';
      timelineContainer.innerHTML = '<div class="loading">データを読み込んでいます...</div>';

      loadTimelineData(patient.uuid);
    }

    // 患者検索イベント設定
    function setupPatientSearchEvent() {
      const input = modal.querySelector('#patient-search-input');
      if (!input) return;

      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          patientSearchText = input.value;
          renderPatientList();
        }, 200);
      });
      input.focus();
    }

    // タイムライン検索イベント設定
    function setupTimelineSearchEvent() {
      const input = modal.querySelector('#timeline-search-input');
      if (!input) return;

      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          searchText = input.value;
          applyFilters();
          renderTimeline();
          updateDetailPanel();
        }, 300);
      });
    }

    // 患者リスト描画
    function renderPatientList() {
      if (isLoading) {
        patientListContainer.innerHTML = '<div class="loading">入院患者を読み込んでいます...</div>';
        return;
      }

      if (allPatients.length === 0) {
        patientListContainer.innerHTML = '<div class="no-data">入院中の患者がいません</div>';
        return;
      }

      // 検索フィルタ
      let filteredPatients = allPatients;
      if (patientSearchText.trim()) {
        const search = patientSearchText.toLowerCase();
        filteredPatients = allPatients.filter(p =>
          p.patient.fullName?.toLowerCase().includes(search) ||
          p.patient.fullNamePhonetic?.toLowerCase().includes(search) ||
          p.patient.serialNumber?.includes(search)
        );
      }

      if (filteredPatients.length === 0) {
        patientListContainer.innerHTML = '<div class="no-data">該当する患者がいません</div>';
        return;
      }

      // 病棟・部屋ごとにグループ化
      const wardMap = new Map();
      for (const item of filteredPatients) {
        const wardName = item.statusHospitalizationLocation?.ward?.name || '病棟不明';
        const roomName = item.statusHospitalizationLocation?.room?.name || '部屋不明';

        if (!wardMap.has(wardName)) {
          wardMap.set(wardName, new Map());
        }
        const roomMap = wardMap.get(wardName);
        if (!roomMap.has(roomName)) {
          roomMap.set(roomName, []);
        }
        roomMap.get(roomName).push(item);
      }

      // HTML生成
      let html = '';
      for (const [wardName, roomMap] of wardMap) {
        html += `<div class="ward-section">
          <div class="ward-header">${escapeHtml(wardName)}</div>`;

        for (const [roomName, patients] of roomMap) {
          html += `<div class="room-section">
            <div class="room-header">${escapeHtml(roomName)}</div>`;

          for (const item of patients) {
            const p = item.patient;
            const days = item.hospitalizationDayCount || 0;
            html += `
              <div class="patient-item" data-uuid="${p.uuid}">
                <div class="patient-info">
                  <div class="patient-name">${escapeHtml(p.fullName || '名前不明')}</div>
                  <div class="patient-serial">${escapeHtml(p.serialNumber || '-')}</div>
                </div>
                <div class="patient-meta">
                  <span class="patient-days">${days}日目</span>
                  <span class="patient-arrow">▶</span>
                </div>
              </div>
            `;
          }

          html += '</div>';
        }

        html += '</div>';
      }

      patientListContainer.innerHTML = html;

      // クリックイベント
      patientListContainer.querySelectorAll('.patient-item').forEach(el => {
        el.onclick = () => {
          const uuid = el.dataset.uuid;
          const patient = allPatients.find(p => p.patient.uuid === uuid);
          if (patient) {
            switchToTimeline({
              uuid: patient.patient.uuid,
              fullName: patient.patient.fullName,
              serialNumber: patient.patient.serialNumber,
              wardName: patient.statusHospitalizationLocation?.ward?.name,
              roomName: patient.statusHospitalizationLocation?.room?.name,
              hospitalizationDayCount: patient.hospitalizationDayCount
            });
          }
        };
      });
    }

    // カテゴリフィルタを描画
    function renderCategoryFilters() {
      const categoryFilters = modal.querySelector('#category-filters');
      if (!categoryFilters) return;

      categoryFilters.innerHTML = Object.values(CATEGORIES).map(cat => `
        <div class="category-chip ${selectedCategories.has(cat.id) ? 'active' : 'inactive'}"
             data-category="${cat.id}"
             style="background: ${cat.bgColor}; border-color: ${cat.color}; color: ${cat.color};">
          ${cat.name}
        </div>
      `).join('');

      // イベント設定
      categoryFilters.querySelectorAll('.category-chip').forEach(chip => {
        chip.onclick = () => {
          const catId = chip.dataset.category;
          if (selectedCategories.has(catId)) {
            selectedCategories.delete(catId);
          } else {
            selectedCategories.add(catId);
          }
          renderCategoryFilters();
          applyFilters();
          renderTimeline();
          updateDetailPanel();
        };
      });
    }

    // フィルタ適用
    function applyFilters() {
      filteredItems = allItems.filter(item => {
        // カテゴリフィルタ
        if (!selectedCategories.has(item.category)) return false;

        // キーワード検索
        if (searchText.trim()) {
          const lowerSearch = searchText.toLowerCase();
          const matchText = item.text.toLowerCase().includes(lowerSearch);
          const matchAuthor = item.author.toLowerCase().includes(lowerSearch);
          if (!matchText && !matchAuthor) return false;
        }

        return true;
      });
    }

    // タイムライン描画
    function renderTimeline() {
      if (!currentHospitalization) {
        timelineContainer.innerHTML = '<div class="no-data">入院情報の取得に失敗しました</div>';
        return;
      }

      // 入院開始日から今日までの日付リスト
      const startDate = new Date(
        currentHospitalization.startDate.year,
        currentHospitalization.startDate.month - 1,
        currentHospitalization.startDate.day
      );
      const endDate = currentHospitalization.endDate
        ? new Date(
            currentHospitalization.endDate.year,
            currentHospitalization.endDate.month - 1,
            currentHospitalization.endDate.day
          )
        : new Date();

      const dateList = generateDateList(startDate, endDate);

      // 日付ごとにアイテムをマッピング
      const itemsByDate = new Map();
      for (const item of filteredItems) {
        if (!item.date) continue;
        const key = dateKey(item.date);
        if (!itemsByDate.has(key)) {
          itemsByDate.set(key, []);
        }
        itemsByDate.get(key).push(item);
      }

      // 表示するカテゴリのみ取得
      const visibleCategories = Object.keys(CATEGORIES).filter(catId => selectedCategories.has(catId));

      // ヘッダー生成（選択されたカテゴリのみ）
      const headerCells = ['日付', ...visibleCategories.map(catId => CATEGORIES[catId].name)]
        .map(name => `<div class="grid-header-cell">${name}</div>`)
        .join('');

      // 行生成（1日1点方式、選択されたカテゴリのみ）
      const rows = dateList.map(date => {
        const key = dateKey(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const items = itemsByDate.get(key) || [];

        // カテゴリごとにアイテムを分類
        const itemsByCategory = {};
        for (const catId of visibleCategories) {
          itemsByCategory[catId] = items.filter(i => i.category === catId);
        }

        return `
          <div class="grid-row" data-date-key="${key}">
            <div class="date-cell ${isWeekend ? 'weekend' : ''}" data-date-key="${key}">${formatShortDate(date)}</div>
            ${visibleCategories.map(catId => {
              const catItems = itemsByCategory[catId];
              const cat = CATEGORIES[catId];
              const count = catItems.length;
              // 1件以上あれば1つの点を表示
              return `
                <div class="data-cell" data-date-key="${key}">
                  ${count > 0 ? `
                    <div class="dot ${selectedDateKey === key ? 'selected' : ''}"
                         data-date-key="${key}"
                         style="background: ${cat.color};">
                      <div class="dot-tooltip">${count}件</div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).join('');

      timelineContainer.innerHTML = `
        <div class="timeline-grid" style="grid-template-columns: 100px repeat(${visibleCategories.length}, 1fr);">
          <div class="grid-header">${headerCells}</div>
          ${rows}
        </div>
      `;

      // ドット・日付セルクリックイベント
      timelineContainer.querySelectorAll('.dot, .date-cell').forEach(el => {
        el.onclick = () => {
          const key = el.dataset.dateKey;
          if (key) {
            const dayItems = itemsByDate.get(key) || [];
            if (dayItems.length > 0) {
              showDetailPanel(key, dayItems);
            }
          }
        };
      });
    }

    // 詳細パネル表示（日付単位）
    function showDetailPanel(key, items) {
      selectedDateKey = key;

      // 日付を解析して表示用フォーマット
      const [year, month, day] = key.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dateStr = formatShortDate(date);

      // カテゴリごとにグループ化
      const itemsByCategory = {};
      for (const catId of Object.keys(CATEGORIES)) {
        itemsByCategory[catId] = items.filter(i => i.category === catId);
      }

      // 各カテゴリのセクションを生成
      const sections = Object.keys(CATEGORIES).map(catId => {
        const catItems = itemsByCategory[catId];
        if (catItems.length === 0) return '';

        const cat = CATEGORIES[catId];
        // 時刻でソート（古い順）
        catItems.sort((a, b) => (a.date || 0) - (b.date || 0));

        return `
          <div class="detail-section" style="margin-bottom: 20px;">
            <div class="detail-section-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${cat.color};">
              <span class="category-badge" style="background: ${cat.bgColor}; color: ${cat.color};">${cat.name}</span>
              <span style="font-size: 12px; color: #666;">（${catItems.length}件）</span>
            </div>
            ${catItems.map((item, idx) => {
              const time = item.date ? `${item.date.getHours()}:${String(item.date.getMinutes()).padStart(2, '0')}` : '-';
              const isLast = idx === catItems.length - 1;
              return `
                <div class="detail-item" style="margin-left: 8px; padding-left: 16px; border-left: 2px solid ${isLast ? 'transparent' : '#e0e0e0'}; margin-bottom: ${isLast ? '0' : '12px'}; position: relative;">
                  <div style="position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: ${cat.color};"></div>
                  <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${time}</span>
                    <span style="margin-left: 8px;">${escapeHtml(item.author)}</span>
                  </div>
                  <div class="detail-text" style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${highlightText(item.text, searchText).replace(/\n/g, '<br>')}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }).filter(s => s).join('');

      detailContent.innerHTML = `
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
          ${dateStr} の記録
        </div>
        ${sections || '<div style="color: #999; text-align: center; padding: 20px;">この日の記録はありません</div>'}
      `;

      detailPanel.classList.remove('hidden');
      renderTimeline();
    }

    // 詳細パネル更新（フィルタ変更時）
    function updateDetailPanel() {
      if (!selectedDateKey) return;

      // 現在のフィルタ済みアイテムからその日のものを抽出
      const dayItems = filteredItems.filter(item => {
        if (!item.date) return false;
        return dateKey(item.date) === selectedDateKey;
      });

      if (dayItems.length > 0) {
        showDetailPanel(selectedDateKey, dayItems);
      } else {
        // その日に表示するアイテムがなくなった場合は詳細パネルを閉じる
        detailPanel.classList.add('hidden');
        selectedDateKey = null;
      }
    }

    // タイムラインデータ読み込み
    async function loadTimelineData(patientUuid) {
      try {
        // 入院情報取得
        hospitalizations = await fetchHospitalizations(patientUuid);
        currentHospitalization = hospitalizations.find(h => h.state === 'ADMITTED');

        if (!currentHospitalization) {
          hospInfo.textContent = '入院中ではありません';
          timelineContainer.innerHTML = '<div class="no-data">この患者は現在入院していません</div>';
          return;
        }

        // 入院情報表示
        const startDateStr = `${currentHospitalization.startDate.year}/${currentHospitalization.startDate.month}/${currentHospitalization.startDate.day}`;
        const dayCount = currentHospitalization.hospitalizationDayCount?.value || 0;
        const ward = currentHospitalization.lastHospitalizationLocation?.ward?.name || '-';
        hospInfo.textContent = `${ward} | ${startDateStr}〜 (${dayCount}日目)`;

        // 入院開始日
        const startDate = new Date(
          currentHospitalization.startDate.year,
          currentHospitalization.startDate.month - 1,
          currentHospitalization.startDate.day
        );

        // 全データ取得
        allItems = await fetchAllData(patientUuid, startDate);

        // 入院期間でフィルタリング
        const endDate = currentHospitalization.endDate
          ? new Date(
              currentHospitalization.endDate.year,
              currentHospitalization.endDate.month - 1,
              currentHospitalization.endDate.day
            )
          : null;
        allItems = filterByHospitalizationPeriod(allItems, startDate, endDate);

        console.log(`[${SCRIPT_NAME}] データ読み込み完了: ${allItems.length}件`);

        applyFilters();
        renderTimeline();
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] データ読み込みエラー:`, e);
        timelineContainer.innerHTML = `<div class="no-data">データの読み込みに失敗しました: ${e.message}</div>`;
      }
    }

    // 患者一覧読み込み
    async function loadPatientList() {
      try {
        allPatients = await fetchAllHospitalizedPatients();
        isLoading = false;
        console.log(`[${SCRIPT_NAME}] 入院患者一覧取得: ${allPatients.length}名`);
        renderPatientList();
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 患者一覧取得エラー:`, e);
        isLoading = false;
        patientListContainer.innerHTML = `<div class="no-data">患者一覧の読み込みに失敗しました: ${e.message}</div>`;
      }
    }

    document.body.appendChild(modal);
    setupPatientSearchEvent();
    loadPatientList();
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

  // メイン処理
  async function main() {
    await waitForHenryCore();
    showTimelineModal();
  }

  // プラグイン登録
  async function init() {
    try {
      const core = await waitForHenryCore();

      core.registerPlugin({
        id: 'patient-timeline',
        name: '入院タイムライン',
        version: VERSION,
        description: '入院患者の記録をタイムライン表示',
        onClick: main
      });

      console.log(`[${SCRIPT_NAME}] v${VERSION} 初期化完了`);
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 初期化失敗:`, e);
    }
  }

  // グローバル公開（デバッグ用）
  window.PatientTimeline = {
    show: main,
    version: VERSION
  };

  init();
})();
