// ==UserScript==
// @name         Henry Patient Timeline
// @namespace    https://github.com/shin-926/Henry
// @version      2.14.0
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
 * - 3カラムレイアウト（日付リスト | 記録 | オーダー）
 * - 日付選択で該当日の記録・オーダーを表示
 * - 記録カラム: 医師記録、看護記録、リハビリ（時系列：古→新）
 * - オーダーカラム: バイタル、注射、処方（固定順序）
 * - カテゴリフィルタ、キーワード検索
 *
 * ■ データソース
 * - 医師記録: GraphQL API (ListClinicalDocuments - HOSPITALIZATION_CONSULTATION)
 * - 看護記録: GraphQL API (ListClinicalDocuments - CUSTOM type)
 * - リハビリ記録: GraphQL API (ListRehabilitationDocuments)
 * - バイタル/処方/注射: GraphQL API (GetClinicalCalendarView)
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

  // カテゴリのグループ分け
  const RECORD_CATEGORIES = ['doctor', 'nursing', 'rehab']; // 時系列（古→新）で表示
  const ORDER_CATEGORIES = ['vital', 'injection', 'prescription']; // 固定順序で表示

  // CUSTOMタイプのUUID
  const NURSING_RECORD_CUSTOM_TYPE_UUID = 'e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f';
  const PATIENT_PROFILE_CUSTOM_TYPE_UUID = 'f639619a-6fdb-452a-a803-8d42cd50830d';

  // 組織UUID（マオカ病院）
  const ORG_UUID = 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825';

  // 担当医ごとの色パレット
  const DOCTOR_COLORS = [
    { bg: '#e3f2fd', border: '#90caf9' },  // 青
    { bg: '#e8f5e9', border: '#81c784' },  // 緑
    { bg: '#fff3e0', border: '#ffb74d' },  // オレンジ
    { bg: '#f3e5f5', border: '#ba68c8' },  // 紫
    { bg: '#fce4ec', border: '#f06292' },  // ピンク
    { bg: '#e0f7fa', border: '#4dd0e1' },  // シアン
    { bg: '#fff8e1', border: '#ffd54f' },  // イエロー
    { bg: '#efebe9', border: '#a1887f' },  // ブラウン
  ];

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

  // 薬剤名を整形（メーカー名削除、全角英数→半角）
  function cleanMedicineName(name) {
    if (!name) return '';
    return name
      // メーカー名（「〇〇」）を削除
      .replace(/「[^」]+」/g, '')
      // 全角英数字を半角に変換
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      // 全角ピリオドを半角に変換
      .replace(/．/g, '.')
      // 全角カンマを半角に変換
      .replace(/，/g, ',')
      // 連続する空白を1つに
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 名前を正規化（スペースの違いを吸収）
  function normalizeDoctorName(name) {
    if (!name) return '';
    // 全角・半角スペースをすべて除去して比較用キーを作成
    return name.replace(/[\s\u3000]+/g, '');
  }

  // 担当医→色のマッピングを構築（名前で統合）
  function buildDoctorColorMap(patients) {
    // 名前（正規化済み）→ { name, uuids[] } のマップ
    const doctorsByName = new Map();

    for (const p of patients) {
      const uuid = p.hospitalizationDoctor?.doctor?.uuid;
      const name = p.hospitalizationDoctor?.doctor?.name;
      if (!uuid || !name) continue;

      const normalizedName = normalizeDoctorName(name);
      if (!doctorsByName.has(normalizedName)) {
        doctorsByName.set(normalizedName, { name, uuids: [] });
      }
      const entry = doctorsByName.get(normalizedName);
      if (!entry.uuids.includes(uuid)) {
        entry.uuids.push(uuid);
      }
    }

    // 名前でソートして一貫した色割り当てを維持
    const doctors = Array.from(doctorsByName.values());
    doctors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 各UUIDに同じ色を割り当て
    const colorMap = new Map();
    doctors.forEach((doc, i) => {
      const color = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
      for (const uuid of doc.uuids) {
        colorMap.set(uuid, {
          ...color,
          name: doc.name,
          normalizedName: normalizeDoctorName(doc.name)
        });
      }
    });

    return colorMap;
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

  // 患者プロフィール取得
  async function fetchPatientProfile(patientUuid) {
    try {
      const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
        input: {
          patientUuid,
          pageToken: '',
          pageSize: 10, // 複数件取得してフィルタリング
          clinicalDocumentTypes: [{
            type: 'CUSTOM',
            clinicalDocumentCustomTypeUuid: { value: PATIENT_PROFILE_CUSTOM_TYPE_UUID }
          }]
        }
      });

      const documents = result?.data?.listClinicalDocuments?.documents || [];
      if (documents.length === 0) return null;

      // 「患者プロフィール」を含む記事を探す（最新順で最初にマッチしたもの）
      const profileDoc = documents.find(doc => {
        const text = parseEditorData(doc.editorData);
        return text && text.includes('患者プロフィール');
      });

      if (!profileDoc) return null;

      return {
        text: parseEditorData(profileDoc.editorData),
        updateTime: profileDoc.updateTime?.seconds ? new Date(profileDoc.updateTime.seconds * 1000) : null,
        author: profileDoc.creator?.name || '不明'
      };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 患者プロフィール取得エラー:`, e);
      return null;
    }
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

  // 入院中・入院予定の全患者を取得
  // 7日後の日付で検索することで、入院予定患者（WILL_ADMIT）も含めて取得
  async function fetchAllHospitalizedPatients() {
    try {
      const today = new Date();
      // 7日後の日付で検索（入院予定患者も含めて取得するため）
      const searchDate = new Date(today);
      searchDate.setDate(searchDate.getDate() + 7);

      const result = await callPersistedQuery(
        'ListDailyWardHospitalizations',
        {
          input: {
            wardIds: [],
            searchDate: {
              year: searchDate.getFullYear(),
              month: searchDate.getMonth() + 1,
              day: searchDate.getDate()
            },
            roomIds: [],
            searchText: ''
          }
        },
        'e1692624de62dd647f1e30bbeb9d468a67b777510710c474fb99f9a5b52ee02f'
      );

      // GraphQL errors をチェック
      if (result?.errors) {
        console.error(`[${SCRIPT_NAME}] GraphQL errors:`, result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      // 3階層構造（病棟 → 部屋 → 入院患者）をフラット化
      const wards = result?.data?.listDailyWardHospitalizations?.dailyWardHospitalizations || [];
      const allPatients = [];

      for (const ward of wards) {
        const rooms = ward.roomHospitalizationDistributions || [];
        for (const room of rooms) {
          const hospitalizations = room.hospitalizations || [];
          for (const hosp of hospitalizations) {
            // 入院予定患者（WILL_ADMIT）かどうかを判定
            const isScheduled = hosp.state === 'WILL_ADMIT';
            let scheduledDate = null;

            if (isScheduled && hosp.startDate) {
              // 入院予定日を計算
              const startDate = new Date(hosp.startDate.year, hosp.startDate.month - 1, hosp.startDate.day);
              const daysUntilAdmit = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
              // 7日以内の入院予定のみ表示
              if (daysUntilAdmit < 0 || daysUntilAdmit > 7) {
                continue; // スキップ
              }
              scheduledDate = {
                month: hosp.startDate.month,
                day: hosp.startDate.day
              };
            }

            // 患者情報に病棟・部屋情報と入院予定フラグを付加
            allPatients.push({
              ...hosp,
              wardId: ward.wardId,
              roomId: room.roomId,
              isScheduled,
              scheduledDate
            });
          }
        }
      }

      return allPatients;
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

      // 処方オーダー（タイムライン用アイテム）
      const prescriptionItems = (data?.prescriptionOrders || []).flatMap(rx => {
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

      // 注射オーダー（タイムライン用アイテムと生データを両方保持）
      const injectionOrdersRaw = data?.injectionOrders || [];
      const injectionItems = injectionOrdersRaw.map(inj => {
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

      // 処方オーダーの生データ
      const prescriptionOrdersRaw = data?.prescriptionOrders || [];

      return {
        timelineItems: [...vitalSigns, ...prescriptionItems, ...injectionItems],
        activePrescriptions: prescriptionOrdersRaw.filter(rx => rx.orderStatus === 'ORDER_STATUS_ACTIVE'),
        activeInjections: injectionOrdersRaw.filter(inj => inj.orderStatus === 'ORDER_STATUS_ACTIVE')
      };

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
    const [doctorRecords, nursingRecords, rehabRecords, calendarData, profile] = await Promise.all([
      fetchDoctorRecords(patientUuid),
      fetchNursingRecords(patientUuid),
      fetchRehabRecords(patientUuid, hospitalizationStartDate),
      fetchCalendarData(patientUuid, hospitalizationStartDate),
      fetchPatientProfile(patientUuid)
    ]);

    const allItems = [...doctorRecords, ...nursingRecords, ...rehabRecords, ...calendarData.timelineItems];

    // 日付でソート（新しい順）
    allItems.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date - a.date;
    });

    return {
      timelineItems: allItems,
      activePrescriptions: calendarData.activePrescriptions,
      activeInjections: calendarData.activeInjections,
      profile
    };
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
    let doctorColorMap = new Map(); // 担当医→色のマッピング
    let selectedDoctors = new Set(); // 選択中の担当医（正規化名）。空=全員表示
    // 固定情報エリア用
    let activePrescriptions = [];
    let activeInjections = [];
    let patientProfile = null;
    // 固定情報エリアのUI状態
    let fixedInfoCollapsed = false;
    let fixedInfoHeight = '150px';
    // プリフェッチ用キャッシュ
    let patientDataCache = new Map(); // key: patientUuid, value: { hospitalizations, currentHospitalization, allData }

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
          width: 98vw;
          height: 98vh;
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
        #patient-timeline-modal .header-left {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        #patient-timeline-modal .back-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 4px 8px;
          border-radius: 4px;
        }
        #patient-timeline-modal .back-btn:hover {
          background: #f0f0f0;
          color: #333;
        }
        #patient-timeline-modal .nav-btn {
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          color: #666;
          display: none;
        }
        #patient-timeline-modal .nav-btn:hover:not(:disabled) {
          background: #f0f0f0;
          color: #333;
        }
        #patient-timeline-modal .nav-btn:disabled {
          color: #ccc;
          cursor: not-allowed;
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
        #patient-timeline-modal .patient-select-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        /* 3カラムレイアウト */
        #patient-timeline-modal .timeline-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        #patient-timeline-modal .date-list {
          width: 100px;
          border-right: 1px solid #e0e0e0;
          overflow-y: auto;
          background: #fafafa;
          flex-shrink: 0;
        }
        #patient-timeline-modal .date-item {
          padding: 10px 12px;
          font-size: 13px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
          transition: background 0.15s;
        }
        #patient-timeline-modal .date-item:hover {
          background: #e3f2fd;
        }
        #patient-timeline-modal .date-item.selected {
          background: #2196F3;
          color: white;
          font-weight: 500;
        }
        #patient-timeline-modal .date-item.weekend {
          color: #e53935;
        }
        #patient-timeline-modal .date-item.selected.weekend {
          color: white;
        }
        #patient-timeline-modal .content-columns {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        #patient-timeline-modal .record-column,
        #patient-timeline-modal .order-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        #patient-timeline-modal .record-column {
          border-right: 1px solid #e0e0e0;
        }
        #patient-timeline-modal .column-header {
          padding: 12px 16px;
          font-weight: 600;
          font-size: 14px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          flex-shrink: 0;
        }
        #patient-timeline-modal .column-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        #patient-timeline-modal .record-card {
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 6px;
          border-left: 4px solid;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        #patient-timeline-modal .record-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
        }
        #patient-timeline-modal .record-card-time {
          font-weight: 500;
          color: #333;
        }
        #patient-timeline-modal .record-card-author {
          color: #666;
        }
        #patient-timeline-modal .record-card-category {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        #patient-timeline-modal .record-card-text {
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: #333;
        }
        #patient-timeline-modal .no-records {
          text-align: center;
          padding: 40px 20px;
          color: #999;
          font-size: 13px;
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
        /* 固定情報エリア */
        #patient-timeline-modal .fixed-info-wrapper {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          border-bottom: 1px solid #e0e0e0;
        }
        #patient-timeline-modal .fixed-info-header {
          padding: 8px 16px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        #patient-timeline-modal .fixed-info-header:hover {
          background: #eeeeee;
        }
        #patient-timeline-modal .fixed-info-header-title {
          font-weight: 600;
          font-size: 13px;
          color: #333;
        }
        #patient-timeline-modal .fixed-info-header .toggle-icon {
          font-size: 10px;
          color: #666;
          transition: transform 0.2s;
        }
        #patient-timeline-modal .fixed-info-wrapper.collapsed .toggle-icon {
          transform: rotate(-90deg);
        }
        #patient-timeline-modal .fixed-info-wrapper.collapsed .fixed-info-header {
          border-bottom: none;
        }
        #patient-timeline-modal .fixed-info-wrapper.collapsed .fixed-info-area,
        #patient-timeline-modal .fixed-info-wrapper.collapsed .fixed-info-resizer {
          display: none;
        }
        #patient-timeline-modal .fixed-info-area {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          background: #fafafa;
          overflow: hidden;
        }
        #patient-timeline-modal .fixed-info-resizer {
          height: 6px;
          background: #e0e0e0;
          cursor: ns-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        #patient-timeline-modal .fixed-info-resizer:hover {
          background: #bdbdbd;
        }
        #patient-timeline-modal .fixed-info-resizer::after {
          content: '';
          width: 40px;
          height: 3px;
          background: #999;
          border-radius: 2px;
        }
        #patient-timeline-modal .info-card {
          flex: 1;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        #patient-timeline-modal .info-card-header {
          padding: 8px 12px;
          font-weight: 600;
          font-size: 13px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          flex-shrink: 0;
        }
        #patient-timeline-modal .info-card-content {
          padding: 10px 12px;
          font-size: 13px;
          overflow-y: auto;
          flex: 1;
          line-height: 1.5;
        }
        #patient-timeline-modal .info-card-content .empty {
          color: #999;
          font-style: italic;
        }
        #patient-timeline-modal .info-card-content .med-item {
          padding: 4px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        #patient-timeline-modal .info-card-content .med-item:last-child {
          border-bottom: none;
        }
        #patient-timeline-modal .info-card-content .med-name {
          font-weight: 500;
        }
        #patient-timeline-modal .info-card-content .med-usage {
          font-size: 12px;
          color: #666;
        }
        /* 用法グループ */
        #patient-timeline-modal .usage-group {
          margin-bottom: 12px;
        }
        #patient-timeline-modal .usage-group:last-child {
          margin-bottom: 0;
        }
        #patient-timeline-modal .usage-label {
          display: inline-block;
          background: #e3f2fd;
          color: #1565c0;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        #patient-timeline-modal .usage-medicines {
          padding-left: 4px;
        }
        #patient-timeline-modal .usage-medicines .med-name {
          padding: 2px 0;
        }
        /* 患者選択画面のスタイル */
        #patient-timeline-modal .patient-list-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        #patient-timeline-modal .ward-column {
          /* 各列用のコンテナ */
        }
        #patient-timeline-modal .ward-column-header {
          font-size: 16px;
          font-weight: 600;
          padding: 8px 12px;
          background: #e8f5e9;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        #patient-timeline-modal .ward-column-header.ryoyo {
          background: #fff3e0;
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
        /* 病室行: 番号 + チップを横並び */
        #patient-timeline-modal .room-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          padding: 4px 0 4px 8px;
        }
        #patient-timeline-modal .room-label {
          font-size: 13px;
          font-weight: 500;
          color: #666;
          min-width: 40px;
        }
        /* 患者チップ */
        #patient-timeline-modal .patient-chip {
          padding: 4px 12px;
          background: #e3f2fd;
          border: 1px solid #90caf9;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        #patient-timeline-modal .patient-chip:hover {
          filter: brightness(0.95);
        }
        /* 凡例（レジェンド） */
        #patient-timeline-modal .legend-container {
          padding: 10px 16px;
          background: #fafafa;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        #patient-timeline-modal .legend-title {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          margin-right: 4px;
        }
        #patient-timeline-modal .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #333;
          padding: 4px 10px;
          background: #fff;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          cursor: pointer;
          transition: all 0.2s;
        }
        #patient-timeline-modal .legend-item:hover {
          background: #f5f5f5;
        }
        #patient-timeline-modal .legend-item.active {
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.5);
        }
        #patient-timeline-modal .legend-item.inactive {
          opacity: 0.5;
        }
        #patient-timeline-modal .legend-count {
          font-size: 12px;
          color: #666;
          margin-left: 2px;
        }
        #patient-timeline-modal .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          border-width: 1px;
          border-style: solid;
        }
      </style>
      <div class="modal-content">
        <div class="modal-header">
          <div class="header-info">
            <div class="header-left">
              <button class="back-btn" id="back-btn" title="患者選択に戻る" style="display: none;">←</button>
              <button class="nav-btn" id="prev-patient-btn" title="前の患者">◀</button>
              <button class="nav-btn" id="next-patient-btn" title="次の患者">▶</button>
            </div>
            <h2 id="modal-title">入院タイムライン</h2>
            <span class="hosp-info" id="hosp-info"></span>
          </div>
          <button class="close-btn" title="閉じる">&times;</button>
        </div>
        <div class="controls" id="controls-area">
          <input type="text" class="search-input" placeholder="患者検索（名前・患者番号）..." id="patient-search-input">
        </div>
        <div class="main-area">
          <div class="patient-select-view" id="patient-select-view">
            <div class="legend-container" id="doctor-legend" style="display: none;"></div>
            <div class="patient-list-container" id="patient-list-container">
              <div class="loading">入院患者を読み込んでいます...</div>
            </div>
          </div>
          <div id="timeline-container" style="display: none; flex-direction: column; flex: 1; overflow: hidden;">
            <div class="fixed-info-wrapper" id="fixed-info-wrapper">
              <div class="fixed-info-header" id="fixed-info-header">
                <span class="fixed-info-header-title">固定情報</span>
                <span class="toggle-icon">▼</span>
              </div>
              <div class="fixed-info-area" id="fixed-info-area">
                <div class="info-card">
                  <div class="info-card-header">プロフィール</div>
                  <div class="info-card-content" id="profile-content"><span class="empty">-</span></div>
                </div>
                <div class="info-card">
                  <div class="info-card-header">現在の処方</div>
                  <div class="info-card-content" id="prescription-content"><span class="empty">-</span></div>
                </div>
                <div class="info-card">
                  <div class="info-card-header">本日の注射</div>
                  <div class="info-card-content" id="injection-content"><span class="empty">-</span></div>
                </div>
              </div>
              <div class="fixed-info-resizer" id="fixed-info-resizer"></div>
            </div>
            <div class="timeline-layout" style="flex: 1; overflow: hidden;">
              <div class="date-list" id="date-list"></div>
              <div class="content-columns">
                <div class="record-column">
                  <div class="column-header">記録</div>
                  <div class="column-content" id="record-content"></div>
                </div>
                <div class="order-column">
                  <div class="column-header">オーダー</div>
                  <div class="column-content" id="order-content"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // DOM要素取得
    const closeBtn = modal.querySelector('.close-btn');
    const backBtn = modal.querySelector('#back-btn');
    const prevBtn = modal.querySelector('#prev-patient-btn');
    const nextBtn = modal.querySelector('#next-patient-btn');
    const modalTitle = modal.querySelector('#modal-title');
    const patientSearchInput = modal.querySelector('#patient-search-input');
    const controlsArea = modal.querySelector('#controls-area');
    const patientSelectView = modal.querySelector('#patient-select-view');
    const patientListContainer = modal.querySelector('#patient-list-container');
    const timelineContainer = modal.querySelector('#timeline-container');
    const dateListEl = modal.querySelector('#date-list');
    const recordContent = modal.querySelector('#record-content');
    const orderContent = modal.querySelector('#order-content');
    const hospInfo = modal.querySelector('#hosp-info');
    const doctorLegend = modal.querySelector('#doctor-legend');
    const profileContent = modal.querySelector('#profile-content');
    const prescriptionContent = modal.querySelector('#prescription-content');
    const injectionContent = modal.querySelector('#injection-content');
    const fixedInfoWrapper = modal.querySelector('#fixed-info-wrapper');
    const fixedInfoHeader = modal.querySelector('#fixed-info-header');
    const fixedInfoArea = modal.querySelector('#fixed-info-area');
    const fixedInfoResizer = modal.querySelector('#fixed-info-resizer');

    // 折りたたみ機能のセットアップ
    function setupToggle() {
      fixedInfoHeader.onclick = () => {
        fixedInfoWrapper.classList.toggle('collapsed');
        fixedInfoCollapsed = fixedInfoWrapper.classList.contains('collapsed');
      };
    }

    // リサイズ機能のセットアップ
    function setupResizer() {
      let isResizing = false;
      let startY = 0;
      let startHeight = 0;

      fixedInfoResizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = fixedInfoArea.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(60, Math.min(400, startHeight + deltaY));
        fixedInfoArea.style.height = `${newHeight}px`;
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          fixedInfoHeight = fixedInfoArea.style.height;
        }
      });
    }

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

    // 現在の患者インデックスを取得（フィルタ適用後のリストでの位置）
    function getCurrentPatientIndex() {
      if (!selectedPatient) return -1;
      // 担当医フィルタを適用したリストを使用
      let filteredList = allPatients;
      if (selectedDoctors.size > 0) {
        filteredList = allPatients.filter(p => {
          const doctorName = p.hospitalizationDoctor?.doctor?.name;
          const normalizedName = normalizeDoctorName(doctorName);
          return selectedDoctors.has(normalizedName);
        });
      }
      return filteredList.findIndex(p => p.patient.uuid === selectedPatient.uuid);
    }

    // フィルタ適用後の患者リストを取得
    function getFilteredPatientList() {
      if (selectedDoctors.size === 0) return allPatients;
      return allPatients.filter(p => {
        const doctorName = p.hospitalizationDoctor?.doctor?.name;
        const normalizedName = normalizeDoctorName(doctorName);
        return selectedDoctors.has(normalizedName);
      });
    }

    // 前の患者に移動
    function navigateToPreviousPatient() {
      const filteredList = getFilteredPatientList();
      const idx = getCurrentPatientIndex();
      if (idx > 0) {
        const patient = filteredList[idx - 1];
        switchToTimeline({
          uuid: patient.patient.uuid,
          fullName: patient.patient.fullName,
          serialNumber: patient.patient.serialNumber,
          wardName: patient.statusHospitalizationLocation?.ward?.name,
          roomName: patient.statusHospitalizationLocation?.room?.name,
          hospitalizationDayCount: patient.hospitalizationDayCount
        });
      }
    }

    // 次の患者に移動
    function navigateToNextPatient() {
      const filteredList = getFilteredPatientList();
      const idx = getCurrentPatientIndex();
      if (idx >= 0 && idx < filteredList.length - 1) {
        const patient = filteredList[idx + 1];
        switchToTimeline({
          uuid: patient.patient.uuid,
          fullName: patient.patient.fullName,
          serialNumber: patient.patient.serialNumber,
          wardName: patient.statusHospitalizationLocation?.ward?.name,
          roomName: patient.statusHospitalizationLocation?.room?.name,
          hospitalizationDayCount: patient.hospitalizationDayCount
        });
      }
    }

    // ナビゲーションボタンの状態を更新
    function updateNavButtons() {
      const filteredList = getFilteredPatientList();
      const idx = getCurrentPatientIndex();
      const isVisible = currentView === 'timeline' && filteredList.length > 1;

      prevBtn.style.display = isVisible ? 'block' : 'none';
      nextBtn.style.display = isVisible ? 'block' : 'none';

      if (isVisible) {
        prevBtn.disabled = idx <= 0;
        nextBtn.disabled = idx < 0 || idx >= filteredList.length - 1;
      }
    }

    // ナビゲーションボタンのクリックイベント
    prevBtn.onclick = () => navigateToPreviousPatient();
    nextBtn.onclick = () => navigateToNextPatient();

    // 患者選択画面に切り替え
    function switchToPatientSelect() {
      currentView = 'patient-select';
      selectedPatient = null;
      allItems = [];
      filteredItems = [];
      currentHospitalization = null;
      selectedDateKey = null;
      // 固定情報をリセット
      activePrescriptions = [];
      activeInjections = [];
      patientProfile = null;
      // 注: selectedDoctors はリセットしない（担当医フィルタは維持）
      // キャッシュをクリア
      patientDataCache.clear();

      backBtn.style.display = 'none';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      modalTitle.textContent = '入院タイムライン';
      hospInfo.textContent = '';

      // 検索コントロールを患者検索に切り替え
      controlsArea.innerHTML = `
        <input type="text" class="search-input" placeholder="患者検索（名前・患者番号）..." id="patient-search-input" value="${escapeHtml(patientSearchText)}">
      `;
      setupPatientSearchEvent();

      patientSelectView.style.display = 'flex';
      timelineContainer.style.display = 'none';

      renderPatientList();
      renderDoctorLegend();
    }

    // タイムライン画面に切り替え
    function switchToTimeline(patient) {
      currentView = 'timeline';
      selectedPatient = patient;

      backBtn.style.display = 'block';
      updateNavButtons();
      modalTitle.textContent = `${patient.fullName}（${patient.serialNumber}）`;
      hospInfo.textContent = '読み込み中...';

      // 検索コントロールをタイムライン用に切り替え
      controlsArea.innerHTML = `
        <input type="text" class="search-input" placeholder="キーワード検索..." id="timeline-search-input">
        <div class="category-filters" id="category-filters"></div>
      `;
      setupTimelineSearchEvent();
      renderCategoryFilters();

      patientSelectView.style.display = 'none';
      timelineContainer.style.display = 'flex';
      timelineContainer.style.flexDirection = 'column';

      // 固定情報エリアの状態を復元
      fixedInfoArea.style.height = fixedInfoHeight;
      if (fixedInfoCollapsed) {
        fixedInfoWrapper.classList.add('collapsed');
      } else {
        fixedInfoWrapper.classList.remove('collapsed');
      }

      // 折りたたみ・リサイズ機能をセットアップ
      setupToggle();
      setupResizer();

      // ローディング表示
      dateListEl.innerHTML = '<div class="no-records">読み込み中...</div>';
      recordContent.innerHTML = '<div class="no-records">読み込み中...</div>';
      orderContent.innerHTML = '<div class="no-records">読み込み中...</div>';

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
        }, 300);
      });
    }

    // 担当医凡例を描画
    function renderDoctorLegend() {
      if (doctorColorMap.size === 0) {
        doctorLegend.style.display = 'none';
        return;
      }

      doctorLegend.style.display = 'flex';

      // 担当医ごとの患者数をカウント（正規化名でグループ化）
      const doctorStats = new Map(); // normalizedName -> { name, bg, border, count }
      for (const p of allPatients) {
        const uuid = p.hospitalizationDoctor?.doctor?.uuid;
        if (!uuid) continue;

        const colorData = doctorColorMap.get(uuid);
        if (!colorData) continue;

        const key = colorData.normalizedName;
        if (!doctorStats.has(key)) {
          doctorStats.set(key, {
            name: colorData.name,
            normalizedName: colorData.normalizedName,
            bg: colorData.bg,
            border: colorData.border,
            count: 0
          });
        }
        doctorStats.get(key).count++;
      }

      // 名前順でソート
      const doctors = Array.from(doctorStats.values());
      doctors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // 選択状態に応じたクラス決定
      const hasSelection = selectedDoctors.size > 0;

      doctorLegend.innerHTML = `
        <span class="legend-title">担当医:</span>
        ${doctors.map(doc => {
          const isSelected = selectedDoctors.has(doc.normalizedName);
          const stateClass = hasSelection ? (isSelected ? 'active' : 'inactive') : '';
          return `
            <div class="legend-item ${stateClass}" data-doctor="${escapeHtml(doc.normalizedName)}">
              <div class="legend-color" style="background: ${doc.bg}; border-color: ${doc.border};"></div>
              <span>${escapeHtml(doc.name || '不明')}</span>
              <span class="legend-count">(${doc.count}名)</span>
            </div>
          `;
        }).join('')}
      `;

      // クリックイベント設定
      doctorLegend.querySelectorAll('.legend-item').forEach(el => {
        el.onclick = () => {
          const normalizedName = el.dataset.doctor;
          if (selectedDoctors.has(normalizedName)) {
            selectedDoctors.delete(normalizedName);
          } else {
            selectedDoctors.add(normalizedName);
          }
          renderDoctorLegend();
          renderPatientList();
        };
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
        filteredPatients = filteredPatients.filter(p =>
          p.patient?.fullName?.toLowerCase().includes(search) ||
          p.patient?.fullNamePhonetic?.toLowerCase().includes(search) ||
          p.patient?.serialNumber?.includes(search)
        );
      }

      // 担当医フィルタ
      if (selectedDoctors.size > 0) {
        filteredPatients = filteredPatients.filter(p => {
          const doctorName = p.hospitalizationDoctor?.doctor?.name;
          const normalizedName = normalizeDoctorName(doctorName);
          return selectedDoctors.has(normalizedName);
        });
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

      // 一般病棟と療養病棟を分離
      const generalWards = [];
      const ryoyoWards = [];

      for (const [wardName, roomMap] of wardMap) {
        if (wardName === '療養病棟') {
          ryoyoWards.push({ wardName, roomMap });
        } else {
          generalWards.push({ wardName, roomMap });
        }
      }

      // 病棟セクションのHTML生成ヘルパー
      function generateWardSections(wards) {
        let sectionsHtml = '';
        for (const { wardName, roomMap } of wards) {
          sectionsHtml += `<div class="ward-section">`;

          for (const [roomName, patients] of roomMap) {
            sectionsHtml += `<div class="room-row">
              <span class="room-label">${escapeHtml(roomName)}:</span>`;

            for (const item of patients) {
              const p = item.patient;
              const days = item.hospitalizationDayCount?.value || 0;
              const doctorUuid = item.hospitalizationDoctor?.doctor?.uuid;
              const doctorName = item.hospitalizationDoctor?.doctor?.name || '担当医不明';
              const color = doctorColorMap.get(doctorUuid) || { bg: '#f5f5f5', border: '#bdbdbd' };
              sectionsHtml += `
                <div class="patient-chip" data-uuid="${p.uuid}" title="${days}日目 / ${escapeHtml(doctorName)}" style="background: ${color.bg}; border-color: ${color.border};">
                  ${escapeHtml(p.fullName || '名前不明')}
                </div>
              `;
            }

            sectionsHtml += '</div>';
          }

          sectionsHtml += '</div>';
        }
        return sectionsHtml;
      }

      // 2列レイアウトでHTML生成
      let html = `
        <div class="ward-column">
          <div class="ward-column-header">一般病棟</div>
          ${generateWardSections(generalWards)}
        </div>
        <div class="ward-column">
          <div class="ward-column-header ryoyo">療養病棟</div>
          ${generateWardSections(ryoyoWards)}
        </div>
      `;

      patientListContainer.innerHTML = html;

      // クリックイベント
      patientListContainer.querySelectorAll('.patient-chip').forEach(el => {
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
        dateListEl.innerHTML = '<div class="no-records">入院情報なし</div>';
        recordContent.innerHTML = '';
        orderContent.innerHTML = '';
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

      const dates = generateDateList(startDate, endDate);

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

      // デフォルトで最新日を選択
      if (!selectedDateKey && dates.length > 0) {
        selectedDateKey = dateKey(dates[0]);
      }

      // 日付リスト描画
      dateListEl.innerHTML = dates.map(date => {
        const key = dateKey(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isSelected = key === selectedDateKey;
        return `
          <div class="date-item ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}" data-date-key="${key}">
            ${formatShortDate(date)}
          </div>
        `;
      }).join('');

      // 日付クリックイベント
      dateListEl.querySelectorAll('.date-item').forEach(el => {
        el.onclick = () => {
          selectedDateKey = el.dataset.dateKey;
          renderTimeline();
        };
      });

      // 選択された日付のアイテムを取得
      const selectedItems = itemsByDate.get(selectedDateKey) || [];

      // 記録とオーダーに分類
      const records = selectedItems.filter(item => RECORD_CATEGORIES.includes(item.category));
      const orders = selectedItems.filter(item => ORDER_CATEGORIES.includes(item.category));

      // 記録は時系列（古→新）でソート
      records.sort((a, b) => (a.date || 0) - (b.date || 0));

      // オーダーは固定順序（バイタル→注射→処方）でソート
      orders.sort((a, b) => {
        const orderA = ORDER_CATEGORIES.indexOf(a.category);
        const orderB = ORDER_CATEGORIES.indexOf(b.category);
        if (orderA !== orderB) return orderA - orderB;
        // 同じカテゴリ内は時系列（古→新）
        return (a.date || 0) - (b.date || 0);
      });

      // 記録カラム描画
      recordContent.innerHTML = records.length > 0
        ? records.map(item => renderRecordCard(item)).join('')
        : '<div class="no-records">この日の記録はありません</div>';

      // オーダーカラム描画
      orderContent.innerHTML = orders.length > 0
        ? orders.map(item => renderRecordCard(item)).join('')
        : '<div class="no-records">この日のオーダーはありません</div>';
    }

    // 記録カードを描画
    function renderRecordCard(item) {
      const cat = CATEGORIES[item.category];
      const time = item.date ? `${item.date.getHours()}:${String(item.date.getMinutes()).padStart(2, '0')}` : '-';

      return `
        <div class="record-card" style="background: ${cat.bgColor}; border-left-color: ${cat.color};">
          <div class="record-card-header">
            <span class="record-card-time">${time}</span>
            <span class="record-card-category" style="background: ${cat.color}; color: white;">${cat.name}</span>
          </div>
          <div class="record-card-author">${escapeHtml(item.author)}</div>
          <div class="record-card-text">${highlightText(item.text, searchText).replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }

    // 固定情報エリアを描画
    function renderFixedInfo() {
      // プロフィール
      if (patientProfile && patientProfile.text) {
        let displayText = patientProfile.text;

        // 「患者プロフィール」行を削除
        displayText = displayText.split('\n')
          .filter(line => !line.includes('患者プロフィール'))
          .join('\n');

        // 【延命治療】以降を削除
        const cutoffIndex = displayText.indexOf('【延命治療】');
        if (cutoffIndex !== -1) {
          displayText = displayText.substring(0, cutoffIndex).trim();
        }

        // 【既往歴】の前に空行を挿入
        displayText = displayText.replace(/【既往歴】/g, '\n【既往歴】');

        profileContent.innerHTML = escapeHtml(displayText).replace(/\n/g, '<br>');
      } else {
        profileContent.innerHTML = '<span class="empty">プロフィールなし</span>';
      }

      // 現在の処方（今日が有効期間内のもの）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 今日が有効期間内の処方をフィルタリング
      const todayPrescriptions = activePrescriptions.filter(rx => {
        if (!rx.startDate) return false;
        const startDate = new Date(rx.startDate.year, rx.startDate.month - 1, rx.startDate.day);
        // 各rpの期間を確認（最長の期間を使用）
        const maxDuration = Math.max(...(rx.rps || []).map(rp => rp.boundsDurationDays?.value || 1));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + maxDuration - 1);
        return today >= startDate && today <= endDate;
      });

      if (todayPrescriptions.length > 0) {
        // 固定カテゴリの定義
        const FIXED_CATEGORIES = {
          wakeup: { label: '起床時', order: 1 },
          morning: { label: '朝', order: 2 },
          noon: { label: '昼', order: 3 },
          evening: { label: '夕', order: 4 },
          bedtime: { label: '就寝前', order: 5 }
        };

        // タイミングテキストからカテゴリを判定する関数
        function getTimingInfo(timingText, displayOrder) {
          if (timingText.includes('起床')) return { key: 'wakeup', ...FIXED_CATEGORIES.wakeup };
          if (timingText.includes('朝食')) return { key: 'morning', ...FIXED_CATEGORIES.morning };
          if (timingText.includes('昼食')) return { key: 'noon', ...FIXED_CATEGORIES.noon };
          if (timingText.includes('夕食')) return { key: 'evening', ...FIXED_CATEGORIES.evening };
          if (timingText.includes('就寝')) return { key: 'bedtime', ...FIXED_CATEGORIES.bedtime };
          // 固定カテゴリ以外は元のテキストをそのまま使用
          return { key: timingText, label: timingText, order: 100 + displayOrder };
        }

        // タイミング別にグループ化
        const timingGroups = new Map(); // Map<カテゴリキー, { label, order, medicines[] }>

        todayPrescriptions.forEach(rx => {
          (rx.rps || []).forEach(rp => {
            const canonicalUsage = rp.medicationTiming?.medicationTiming?.canonicalPrescriptionUsage;
            const timings = canonicalUsage?.timings || [];
            const usageText = (canonicalUsage?.text || '用法不明').replace(/，/g, ',');
            const medicines = (rp.instructions || []).map(inst => {
              const med = inst.instruction?.medicationDosageInstruction;
              const rawName = med?.localMedicine?.name || med?.medicine?.name || null;
              return rawName ? cleanMedicineName(rawName) : null;
            }).filter(Boolean);

            if (medicines.length > 0) {
              if (timings.length === 0) {
                // timingsが空の場合は用法テキストをラベルとして使用
                const key = usageText;
                if (!timingGroups.has(key)) {
                  timingGroups.set(key, { label: usageText, order: 1000, medicines: [] });
                }
                timingGroups.get(key).medicines.push(...medicines);
              } else {
                // 各タイミングに薬剤を追加
                timings.forEach(timing => {
                  const info = getTimingInfo(timing.text, timing.displayOrder || 0);
                  if (!timingGroups.has(info.key)) {
                    timingGroups.set(info.key, { label: info.label, order: info.order, medicines: [] });
                  }
                  timingGroups.get(info.key).medicines.push(...medicines);
                });
              }
            }
          });
        });

        // 重複を除去
        timingGroups.forEach((value) => {
          value.medicines = [...new Set(value.medicines)];
        });

        // order順にソートしてHTML生成
        const sortedGroups = Array.from(timingGroups.values())
          .filter(g => g.medicines.length > 0)
          .sort((a, b) => a.order - b.order);

        const prescriptionHtml = sortedGroups.map(group => `
          <div class="usage-group">
            <div class="usage-label">[${escapeHtml(group.label)}]</div>
            <div class="usage-medicines">
              ${group.medicines.map(m => `<div class="med-name">${escapeHtml(m)}</div>`).join('')}
            </div>
          </div>
        `).join('');

        prescriptionContent.innerHTML = prescriptionHtml || '<span class="empty">有効な処方なし</span>';
      } else {
        prescriptionContent.innerHTML = '<span class="empty">有効な処方なし</span>';
      }

      // 本日の注射（今日が実施期間内のもの）
      // today変数は処方セクションで既に定義済み

      // 今日が実施期間内の注射をフィルタリング
      const todayInjections = activeInjections.filter(inj => {
        if (!inj.startDate) return false;
        const startDate = new Date(inj.startDate.year, inj.startDate.month - 1, inj.startDate.day);
        // 各rpの期間を確認（最長の期間を使用）
        const maxDuration = Math.max(...(inj.rps || []).map(rp => rp.boundsDurationDays?.value || 1));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + maxDuration - 1);
        return today >= startDate && today <= endDate;
      });

      if (todayInjections.length > 0) {
        const injectionHtml = todayInjections.flatMap(inj => {
          const startDate = new Date(inj.startDate.year, inj.startDate.month - 1, inj.startDate.day);

          // 注射は処方と同じ構造: rps[].instructions[].instruction.medicationDosageInstruction
          return (inj.rps || []).map(rp => {
            const medicines = (rp.instructions || []).map(inst => {
              const med = inst.instruction?.medicationDosageInstruction;
              const rawName = med?.localMedicine?.name || med?.mhlwMedicine?.name || null;
              return rawName ? cleanMedicineName(rawName) : null;
            }).filter(Boolean);

            const technique = (rp.localInjectionTechnique?.name || '').replace(/，/g, ',');
            const duration = rp.boundsDurationDays?.value || 1;
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + duration - 1);
            const endDateStr = `${endDate.getMonth() + 1}/${endDate.getDate()}まで`;

            if (medicines.length === 0) return '';

            return `
              <div class="med-item">
                <div class="med-name">${medicines.map(m => escapeHtml(m)).join('<br>')}</div>
                <div class="med-usage">${technique ? escapeHtml(technique) + ' / ' : ''}${endDateStr}</div>
              </div>
            `;
          });
        }).filter(Boolean).join('');

        injectionContent.innerHTML = injectionHtml || '<span class="empty">本日の注射なし</span>';
      } else {
        injectionContent.innerHTML = '<span class="empty">本日の注射なし</span>';
      }
    }

    // 患者データをプリフェッチ（バックグラウンド）
    async function prefetchPatientData(patientUuid) {
      if (!patientUuid || patientDataCache.has(patientUuid)) return;

      try {
        const hospitalizations = await fetchHospitalizations(patientUuid);
        const currentHosp = hospitalizations.find(h => h.state === 'ADMITTED');
        if (!currentHosp) return;

        const startDate = new Date(
          currentHosp.startDate.year,
          currentHosp.startDate.month - 1,
          currentHosp.startDate.day
        );

        const allData = await fetchAllData(patientUuid, startDate);

        patientDataCache.set(patientUuid, {
          hospitalizations,
          currentHospitalization: currentHosp,
          allData
        });

        console.log(`[${SCRIPT_NAME}] プリフェッチ完了: ${patientUuid}`);
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] プリフェッチ失敗:`, e.message);
      }
    }

    // 前後の患者データをプリフェッチ
    function prefetchAdjacentPatients() {
      const filteredList = getFilteredPatientList();
      const idx = getCurrentPatientIndex();

      // 前の患者をプリフェッチ
      if (idx > 0) {
        const prevUuid = filteredList[idx - 1].patient.uuid;
        prefetchPatientData(prevUuid); // 非同期・待たない
      }

      // 次の患者をプリフェッチ
      if (idx < filteredList.length - 1) {
        const nextUuid = filteredList[idx + 1].patient.uuid;
        prefetchPatientData(nextUuid); // 非同期・待たない
      }
    }

    // タイムラインデータ読み込み
    async function loadTimelineData(patientUuid) {
      try {
        let allData;

        // キャッシュを確認
        const cached = patientDataCache.get(patientUuid);
        if (cached) {
          console.log(`[${SCRIPT_NAME}] キャッシュ使用: ${patientUuid}`);
          hospitalizations = cached.hospitalizations;
          currentHospitalization = cached.currentHospitalization;
          allData = cached.allData;
        } else {
          // キャッシュがなければ取得
          hospitalizations = await fetchHospitalizations(patientUuid);
          currentHospitalization = hospitalizations.find(h => h.state === 'ADMITTED');

          if (!currentHospitalization) {
            hospInfo.textContent = '入院中ではありません';
            dateListEl.innerHTML = '';
            recordContent.innerHTML = '<div class="no-records">この患者は現在入院していません</div>';
            orderContent.innerHTML = '';
            return;
          }

          // 入院開始日
          const startDate = new Date(
            currentHospitalization.startDate.year,
            currentHospitalization.startDate.month - 1,
            currentHospitalization.startDate.day
          );

          // 全データ取得（タイムライン項目 + 固定情報）
          allData = await fetchAllData(patientUuid, startDate);

          // キャッシュに保存
          patientDataCache.set(patientUuid, {
            hospitalizations,
            currentHospitalization,
            allData
          });
        }

        // 入院中でない場合（キャッシュからの場合もチェック）
        if (!currentHospitalization) {
          hospInfo.textContent = '入院中ではありません';
          dateListEl.innerHTML = '';
          recordContent.innerHTML = '<div class="no-records">この患者は現在入院していません</div>';
          orderContent.innerHTML = '';
          return;
        }

        // 入院情報表示
        const startDateStr = `${currentHospitalization.startDate.year}/${currentHospitalization.startDate.month}/${currentHospitalization.startDate.day}`;
        const dayCount = currentHospitalization.hospitalizationDayCount?.value || 0;
        const ward = currentHospitalization.lastHospitalizationLocation?.ward?.name || '-';
        hospInfo.textContent = `${ward} | ${startDateStr}〜 (${dayCount}日目)`;

        // 入院開始日（表示用に再計算）
        const startDate = new Date(
          currentHospitalization.startDate.year,
          currentHospitalization.startDate.month - 1,
          currentHospitalization.startDate.day
        );

        // タイムライン項目を抽出
        allItems = allData.timelineItems;

        // 固定情報を保存
        activePrescriptions = allData.activePrescriptions;
        activeInjections = allData.activeInjections;
        patientProfile = allData.profile;

        // 入院期間でフィルタリング
        const endDate = currentHospitalization.endDate
          ? new Date(
              currentHospitalization.endDate.year,
              currentHospitalization.endDate.month - 1,
              currentHospitalization.endDate.day
            )
          : null;
        allItems = filterByHospitalizationPeriod(allItems, startDate, endDate);

        console.log(`[${SCRIPT_NAME}] データ読み込み完了: ${allItems.length}件, 有効処方: ${activePrescriptions.length}件, 有効注射: ${activeInjections.length}件`);

        // 固定情報エリアを描画
        renderFixedInfo();

        applyFilters();
        renderTimeline();

        // 前後の患者をプリフェッチ（非同期・待たない）
        prefetchAdjacentPatients();
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] データ読み込みエラー:`, e);
        dateListEl.innerHTML = '';
        recordContent.innerHTML = `<div class="no-records">データの読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
        orderContent.innerHTML = '';
      }
    }

    // 患者一覧読み込み
    async function loadPatientList() {
      try {
        allPatients = await fetchAllHospitalizedPatients();
        isLoading = false;
        console.log(`[${SCRIPT_NAME}] 入院患者一覧取得: ${allPatients.length}名`);

        // 担当医カラーマップを構築
        doctorColorMap = buildDoctorColorMap(allPatients);
        console.log(`[${SCRIPT_NAME}] 担当医: ${doctorColorMap.size}名`);

        renderPatientList();
        renderDoctorLegend();
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
