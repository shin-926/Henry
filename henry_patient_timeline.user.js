// ==UserScript==
// @name         Henry Patient Timeline
// @namespace    https://github.com/shin-926/Henry
// @version      2.44.4
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
 * - 4カラムレイアウト（日付リスト | 記録 | データ | 処方・注射）
 * - 日付選択で該当日の記録・データを表示
 * - 記録カラム: 医師記録、看護記録、リハビリ（時系列：古→新）
 * - データカラム: バイタル、食事摂取量（時系列：古→新）
 * - 処方・注射カラム: 現在の処方、本日の注射
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
    vital: { id: 'vital', name: 'バイタル', color: '#E91E63', bgColor: '#fce4ec' },
    meal: { id: 'meal', name: '食事摂取', color: '#795548', bgColor: '#efebe9' }
  };

  // カテゴリのグループ分け
  const RECORD_CATEGORIES = ['doctor', 'nursing', 'rehab']; // 時系列（古→新）で表示
  const ORDER_CATEGORIES = ['vital', 'injection', 'prescription']; // 固定順序で表示

  // CUSTOMタイプのUUID
  // ※マオカ病院専用スクリプトのためハードコード（他病院展開予定なし）
  const NURSING_RECORD_CUSTOM_TYPE_UUID = 'e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f';
  const PATIENT_PROFILE_CUSTOM_TYPE_UUID = 'f639619a-6fdb-452a-a803-8d42cd50830d';

  // 組織UUID
  // ※マオカ病院専用スクリプトのためハードコード（他病院展開予定なし）
  const ORG_UUID = 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825';

  // 入院病名キャッシュ（patientUuid → 主病名文字列）
  const diseaseCache = new Map();

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
    '//henry-app.jp/clinicalResource/injectionOrder',
    // 食事摂取量（マオカ病院固有のカスタム定量データ）
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/fb5d9b7b-8857-40b6-a82b-2547a6ae9e56',
    // 酸素投与量・その他カスタム定量データ
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/e54f72b3-ee52-45e9-9dfb-fda4615f9722',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/38c01268-1ffb-4a2f-a227-85f0fafe4780',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/2b5d1d50-d162-46b5-a3b9-34608ea8e805',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/d4c6e8b3-81ee-431f-adbe-dc113294a356',
    // 栄養オーダー（食種）
    '//henry-app.jp/clinicalResource/nutritionOrder'
  ];

  // バイタルデータキャッシュ（グラフ表示用）
  let cachedVitalsByDate = new Map();

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
            creatorUuid
            creator { name }
            type { type }
          }
          nextPageToken
        }
      }
    `
  };

  // GraphQL Mutations（インライン方式 - HenryのGraphQLサーバーは入力型を公開していないため）
  function buildCreateClinicalDocumentMutation(patientUuid, editorData, performTimeSeconds, hospitalizationUuid) {
    // editorDataはJSON文字列なので、GraphQL用にエスケープ
    const escapedEditorData = editorData.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `
      mutation {
        createClinicalDocument(input: {
          uuid: "",
          patientUuid: "${patientUuid}",
          editorData: "${escapedEditorData}",
          type: {
            type: HOSPITALIZATION_CONSULTATION,
            clinicalDocumentCustomTypeUuid: null
          },
          performTime: { seconds: ${performTimeSeconds}, nanos: 0 },
          hospitalizationUuid: { value: "${hospitalizationUuid}" }
        }) {
          uuid
          performTime { seconds }
          creator { name }
        }
      }
    `;
  }

  function buildUpdateClinicalDocumentMutation(docUuid, patientUuid, editorData, performTimeSeconds, hospitalizationUuid) {
    const escapedEditorData = editorData.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `
      mutation {
        updateClinicalDocument(input: {
          clinicalDocument: {
            uuid: "${docUuid}",
            patientUuid: "${patientUuid}",
            editorData: "${escapedEditorData}",
            type: {
              type: HOSPITALIZATION_CONSULTATION,
              clinicalDocumentCustomTypeUuid: null
            },
            performTime: { seconds: ${performTimeSeconds}, nanos: 0 },
            hospitalizationUuid: { value: "${hospitalizationUuid}" }
          },
          updateMask: { paths: ["editor_data", "perform_time"] }
        }) {
          uuid
          performTime { seconds }
          lastAuthor { name }
        }
      }
    `;
  }

  // テキストをDraft.js形式に変換
  function textToEditorData(text) {
    const lines = text.split('\n');
    const blocks = lines.map((line, index) => ({
      key: Math.random().toString(36).substring(2, 7),
      type: 'unstyled',
      text: line,
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {}
    }));
    return JSON.stringify({ blocks, entityMap: {} }, null, 2);
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

  // 年齢を計算
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

  // 入院病名を一括取得してキャッシュに格納
  async function prefetchHospitalizationDiseases(patientUuids) {
    if (!patientUuids || patientUuids.length === 0) return;

    const QUERY = `query ListPatientReceiptDiseases($input: ListPatientReceiptDiseasesRequestInput!) {
      listPatientReceiptDiseases(input: $input) {
        patientReceiptDiseases { patientUuid isMain masterDisease { name } masterModifiers { name position } }
      }
    }`;
    try {
      const result = await window.HenryCore.query(QUERY, {
        input: { patientUuids, patientCareType: 'PATIENT_CARE_TYPE_INPATIENT' }
      });
      const diseases = result?.data?.listPatientReceiptDiseases?.patientReceiptDiseases || [];

      // 患者ごとに主病名をキャッシュ
      for (const disease of diseases) {
        if (disease.isMain && disease.patientUuid) {
          const baseName = disease.masterDisease?.name || '';
          const modifiers = disease.masterModifiers || [];
          const prefixes = modifiers.filter(m => m.position === 'PREFIX').map(m => m.name).join('');
          const suffixes = modifiers.filter(m => m.position === 'SUFFIX').map(m => m.name).join('');
          const fullName = prefixes + baseName + suffixes;
          if (fullName) {
            diseaseCache.set(disease.patientUuid, fullName);
          }
        }
      }
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院病名プリフェッチエラー:`, e);
    }
  }

  // キャッシュから入院病名を取得
  function getCachedDisease(patientUuid) {
    return diseaseCache.get(patientUuid) || null;
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
              author: doc.creator?.name || '不明',
              creatorUuid: doc.creatorUuid || null,
              editorData: doc.editorData  // 編集時に必要
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

      // 酸素投与データを抽出（日付ごとにグループ化）
      const oxygenData = extractOxygenData(data?.clinicalQuantitativeDataModuleCollections || []);

      // バイタルサイン - 日付ごとに集約してテーブル形式で表示
      const rawVitalSigns = (data?.vitalSigns || [])
        .map(vs => {
          const date = vs.recordTime?.seconds ? new Date(vs.recordTime.seconds * 1000) : null;
          const key = date ? dateKey(date) : null;
          return {
            date,
            rawData: vs,
            author: vs.createUser?.name || '不明',
            oxygen: key ? oxygenData.get(key) : null // 同日の酸素データを付与
          };
        })
        .filter(vs => vs.date);

      // 日付ごとにグループ化
      const vitalsByDate = new Map();
      for (const vs of rawVitalSigns) {
        const key = dateKey(vs.date);
        if (!vitalsByDate.has(key)) {
          vitalsByDate.set(key, []);
        }
        vitalsByDate.get(key).push(vs);
      }

      // キャッシュに保存（グラフ表示用）- 現在は使用していないがテーブル表示用に維持
      cachedVitalsByDate = vitalsByDate;

      // 日付ごとに1つのタイムラインアイテムを作成
      const vitalSigns = Array.from(vitalsByDate.entries()).map(([key, vitals]) => ({
        id: `vital-${key}`,
        category: 'vital',
        date: vitals[0].date, // 代表日付（ソート用）
        title: 'バイタルサイン',
        text: formatVitalSignsTable(vitals),
        author: '', // テーブル内で複数の記録者がいる可能性があるため空欄
        vitals: vitals // 元データ保持（将来の拡張用）
      }));

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

      // 栄養オーダー（食種情報）
      const nutritionOrdersRaw = data?.nutritionOrders || [];

      // 食事摂取量データ（カスタム定量データモジュール）+ 食種情報
      // 入院開始日から今日までの範囲で栄養オーダーを表示（経管食など摂取量がない場合も対応）
      const mealIntakeItems = extractMealIntakeData(
        data?.clinicalQuantitativeDataModuleCollections || [],
        nutritionOrdersRaw,
        startDate,
        today
      );

      return {
        timelineItems: [...vitalSigns, ...prescriptionItems, ...injectionItems, ...mealIntakeItems],
        activePrescriptions: prescriptionOrdersRaw.filter(rx => rx.orderStatus === 'ORDER_STATUS_ACTIVE'),
        activeInjections: injectionOrdersRaw.filter(inj =>
          !['ORDER_STATUS_COMPLETED', 'ORDER_STATUS_CANCELLED'].includes(inj.orderStatus)
        )
      };

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] カレンダーデータ取得エラー:`, e);
      return [];
    }
  }

  // 酸素投与データを抽出
  // clinicalQuantitativeDataModuleCollections から酸素投与量・投与方法を抽出
  // 日付ごとにグループ化して返す
  function extractOxygenData(moduleCollections) {
    const byDate = new Map();

    for (const collection of moduleCollections) {
      const modules = collection?.clinicalQuantitativeDataModules || [];
      for (const mod of modules) {
        const dateRange = mod.recordDateRange;
        if (!dateRange?.start) continue;

        const { year, month, day } = dateRange.start;
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (!byDate.has(key)) {
          byDate.set(key, { flow: null, method: null });
        }

        const entries = mod.entries || [];
        for (const entry of entries) {
          const name = entry.name || '';
          if (name.includes('酸素投与量')) {
            byDate.get(key).flow = entry.value;
          } else if (name.includes('酸素投与方法')) {
            byDate.get(key).method = entry.value;
          }
        }
      }
    }

    return byDate; // Map<dateKey, { flow, method }>
  }

  // 食事摂取量データを抽出・整形
  // clinicalQuantitativeDataModuleCollections から食事データを抽出
  // nutritionOrders から食種情報を取得
  // 日付ごとにグループ化し、タイムラインアイテムに変換
  // hospStartDate, hospEndDate: 入院期間（栄養オーダーのみの日付を追加するため）
  function extractMealIntakeData(moduleCollections, nutritionOrders = [], hospStartDate = null, hospEndDate = null) {
    // 食事関連の項目名パターン（APIレスポンスでは「朝食(主)」形式）
    const mealPatterns = ['朝食(主)', '朝食(副)', '昼食(主)', '昼食(副)', '夕食(主)', '夕食(副)'];

    // 日付ごとにグループ化
    const byDate = new Map();

    // 1. 食事摂取量データから日付を抽出（現状通り）
    for (const collection of moduleCollections) {
      const modules = collection?.clinicalQuantitativeDataModules || [];
      for (const mod of modules) {
        // recordDateRangeから日付を取得
        const dateRange = mod.recordDateRange;
        if (!dateRange?.start) continue;

        const { year, month, day } = dateRange.start;
        const date = new Date(year, month - 1, day);
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (!byDate.has(key)) {
          byDate.set(key, {
            date: date,
            entries: []
          });
        }

        // entriesから食事データを抽出
        const entries = mod.entries || [];
        for (const entry of entries) {
          const name = entry.name || '';
          if (mealPatterns.some(pattern => name.includes(pattern))) {
            byDate.get(key).entries.push({
              name: name,
              value: entry.value
            });
          }
        }
      }
    }

    // 2. 入院期間内で栄養オーダーが有効な日付をbyDateに追加（食種のみ表示対応）
    if (hospStartDate && hospEndDate && nutritionOrders.length > 0) {
      for (const order of nutritionOrders) {
        if (order.isDraft === true) continue;

        const orderStart = order.startDate;
        const orderEnd = order.endDate;
        if (!orderStart) continue;

        // 栄養オーダーの開始日・終了日をDateに変換
        const orderStartDate = new Date(orderStart.year, orderStart.month - 1, orderStart.day);
        const orderEndDate = orderEnd
          ? new Date(orderEnd.year, orderEnd.month - 1, orderEnd.day)
          : new Date(9999, 11, 31); // 終了日未設定は無期限

        // 入院期間と栄養オーダー期間の重複部分を計算
        const rangeStart = orderStartDate > hospStartDate ? orderStartDate : hospStartDate;
        const rangeEnd = orderEndDate < hospEndDate ? orderEndDate : hospEndDate;

        // 重複部分の各日をbyDateに追加
        const current = new Date(rangeStart);
        while (current <= rangeEnd) {
          const year = current.getFullYear();
          const month = current.getMonth() + 1;
          const day = current.getDate();
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          if (!byDate.has(key)) {
            byDate.set(key, {
              date: new Date(current),
              entries: []
            });
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // 各日付のデータをタイムラインアイテムに変換
    const result = [];
    for (const [key, dayData] of byDate) {
      // その日の栄養オーダー情報を取得
      const nutritionInfo = getNutritionInfoForDate(dayData.date, nutritionOrders);
      const dietType = nutritionInfo?.name;
      const supplies = nutritionInfo?.supplies || [];

      // 食事摂取量がなく、食種もない場合はスキップ
      if (dayData.entries.length === 0 && !dietType) continue;

      const mealText = formatMealIntake(dayData.entries);
      const suppliesText = formatNutritionSupplies(supplies, dietType);

      // テキスト生成
      // - 食事摂取量がある場合: 【食種】 朝10/10 昼8/8 夕10/10
      // - 経管食等で摂取量がない場合: 【経管食】毎食: YH Fast 1個, 白湯 200ml
      let text;
      if (dietType && mealText) {
        // 通常食で摂取量がある場合
        text = `【${dietType}】 ${mealText}`;
      } else if (dietType && suppliesText) {
        // 経管食等で摂取量がない場合、suppliesを表示
        text = `【${dietType}】${suppliesText}`;
      } else if (dietType) {
        // 食種のみ
        text = `【${dietType}】`;
      } else {
        // 摂取量のみ
        text = mealText;
      }

      if (text) {
        result.push({
          id: `meal-${key}`,
          category: 'meal',
          date: dayData.date,
          title: '食事摂取',
          text: text,
          author: ''
        });
      }
    }

    return result;
  }

  // 指定日に有効な栄養オーダー情報を取得
  // 戻り値: { name: 食種名, supplies: 経管食等の詳細配列 } or null
  function getNutritionInfoForDate(date, nutritionOrders) {
    for (const order of nutritionOrders) {
      // 下書きはスキップ（isDraftフィールドを優先）
      if (order.isDraft === true) continue;

      const start = order.startDate;
      const end = order.endDate;
      if (!start) continue;

      const startDate = new Date(start.year, start.month - 1, start.day);
      const endDate = end ? new Date(end.year, end.month - 1, end.day) : new Date(9999, 11, 31);

      // 日付が範囲内かチェック
      if (date >= startDate && date <= endDate) {
        return {
          name: order.detail?.dietaryRegimen?.name || null,
          supplies: order.detail?.supplies || []
        };
      }
    }
    return null;
  }

  // 食事摂取量を簡潔形式にフォーマット
  // 例: 「朝10/10 昼4/4 夕10/10」
  function formatMealIntake(entries) {
    const meals = {
      breakfast: { main: null, side: null },
      lunch: { main: null, side: null },
      dinner: { main: null, side: null }
    };

    for (const entry of entries) {
      const name = entry.name || '';
      // 値は文字列で「2」などと記録されている（割単位）
      const value = entry.value != null ? parseInt(entry.value, 10) : null;

      if (name.includes('朝食(主)')) meals.breakfast.main = value;
      else if (name.includes('朝食(副)')) meals.breakfast.side = value;
      else if (name.includes('昼食(主)')) meals.lunch.main = value;
      else if (name.includes('昼食(副)')) meals.lunch.side = value;
      else if (name.includes('夕食(主)')) meals.dinner.main = value;
      else if (name.includes('夕食(副)')) meals.dinner.side = value;
    }

    const parts = [];
    if (meals.breakfast.main != null || meals.breakfast.side != null) {
      const main = meals.breakfast.main ?? '-';
      const side = meals.breakfast.side ?? '-';
      parts.push(`朝${main}/${side}`);
    }
    if (meals.lunch.main != null || meals.lunch.side != null) {
      const main = meals.lunch.main ?? '-';
      const side = meals.lunch.side ?? '-';
      parts.push(`昼${main}/${side}`);
    }
    if (meals.dinner.main != null || meals.dinner.side != null) {
      const main = meals.dinner.main ?? '-';
      const side = meals.dinner.side ?? '-';
      parts.push(`夕${main}/${side}`);
    }

    return parts.join(' ');
  }

  // 経管食などのsuppliesを整形
  // 例: 「毎食: YH Fast（S)（300kcal） 1個, 白湯 200ml」
  // dietType: 食種名（インデント計算用）
  function formatNutritionSupplies(supplies, dietType = '') {
    if (!supplies || supplies.length === 0) return '';

    // タイミングごとにグループ化
    const byTiming = new Map();
    const timingOrder = ['MEAL_TIMING_EVERY', 'MEAL_TIMING_BREAKFAST', 'MEAL_TIMING_LUNCH', 'MEAL_TIMING_DINNER'];
    const timingLabels = {
      'MEAL_TIMING_EVERY': '毎食',
      'MEAL_TIMING_BREAKFAST': '　朝',  // 全角スペース追加で2文字幅に
      'MEAL_TIMING_LUNCH': '　昼',
      'MEAL_TIMING_DINNER': '　夕'
    };
    const unitLabels = {
      'FOOD_QUANTITY_UNIT_NUMBER_OF_ITEM': '個',
      'FOOD_QUANTITY_UNIT_MILLILITER': 'ml',
      'FOOD_QUANTITY_UNIT_GRAM': 'g',
      'FOOD_QUANTITY_UNIT_KILOCALORIE': 'kcal'
    };

    for (const supply of supplies) {
      const timing = supply.timing || 'MEAL_TIMING_EVERY';
      if (!byTiming.has(timing)) {
        byTiming.set(timing, []);
      }
      const foodName = supply.food?.name || '不明';
      const quantity = supply.quantity?.value ?? '';
      const unit = unitLabels[supply.food?.quantityUnit] || '';
      byTiming.get(timing).push(`${foodName} ${quantity}${unit}`);
    }

    // タイミング順に結合
    const parts = [];
    for (const timing of timingOrder) {
      if (byTiming.has(timing)) {
        const label = timingLabels[timing] || '';
        const items = byTiming.get(timing).join(', ');
        parts.push(`${label}: ${items}`);
      }
    }

    // 2行目以降は【食種名】の幅に合わせてインデント
    // ※表示側でmonospaceフォントを使用、全角・半角を区別して計算
    if (!dietType) {
      return parts.join('\n');
    }
    // 【】は全角2文字分
    let fullWidthCount = 2;
    let halfWidthCount = 0;
    for (const char of dietType) {
      if (char.charCodeAt(0) <= 0x7F) {
        halfWidthCount++;  // ASCII（半角）
      } else {
        fullWidthCount++;  // 全角
      }
    }
    const indent = '　'.repeat(fullWidthCount) + ' '.repeat(halfWidthCount);
    return parts.map((part, i) => i === 0 ? part : indent + part).join('\n');
  }

  // バイタルサインをテキストに整形（単体用 - 後方互換性のため残す）
  function formatVitalSign(vs) {
    const parts = [];
    if (vs.temperature?.value) {
      const temp = vs.temperature.value / 10;
      if (temp >= 37) {
        parts.push(`<span class="temp-high">T: ${temp}℃</span>`);
      } else if (temp < 36) {
        parts.push(`<span class="temp-low">T: ${temp}℃</span>`);
      } else {
        parts.push(`T: ${temp}℃`);
      }
    }
    if (vs.bloodPressureUpperBound?.value && vs.bloodPressureLowerBound?.value) {
      parts.push(`BP: ${vs.bloodPressureUpperBound.value / 10}/${vs.bloodPressureLowerBound.value / 10}mmHg`);
    }
    if (vs.pulseRate?.value) parts.push(`P: ${vs.pulseRate.value / 10}bpm`);
    if (vs.spo2?.value) parts.push(`SpO2: ${vs.spo2.value / 10}%`);
    if (vs.respiration?.value) parts.push(`呼吸: ${vs.respiration.value / 10}回/分`);
    if (vs.bloodSugar?.value) parts.push(`血糖: ${vs.bloodSugar.value / 10}mg/dL`);
    return parts.join('\n') || 'データなし';
  }

  // 複数のバイタルサインをテーブル形式でHTML化
  function formatVitalSignsTable(vitalSigns) {
    if (!vitalSigns || vitalSigns.length === 0) return 'データなし';

    // 時刻順（古→新）にソート
    const sorted = [...vitalSigns].sort((a, b) => (a.date || 0) - (b.date || 0));

    // テーブル構築（O2カラムは削除、tfootで表示）
    let html = '<table class="vital-table"><thead><tr>';
    html += '<th></th><th>T</th><th>BP</th><th>P</th><th>SpO2</th>';
    html += '</tr></thead><tbody>';

    for (const vs of sorted) {
      const time = vs.date
        ? `${vs.date.getHours()}:${String(vs.date.getMinutes()).padStart(2, '0')}`
        : '-';

      // 体温（ハイライト処理含む）
      let tempCell = '-';
      if (vs.rawData?.temperature?.value) {
        const temp = vs.rawData.temperature.value / 10;
        if (temp >= 37) {
          tempCell = `<span class="temp-high">${temp}</span>`;
        } else if (temp < 36) {
          tempCell = `<span class="temp-low">${temp}</span>`;
        } else {
          tempCell = String(temp);
        }
      }

      // 血圧
      let bpCell = '-';
      if (vs.rawData?.bloodPressureUpperBound?.value && vs.rawData?.bloodPressureLowerBound?.value) {
        const upper = vs.rawData.bloodPressureUpperBound.value / 10;
        const lower = vs.rawData.bloodPressureLowerBound.value / 10;
        bpCell = `${upper}/${lower}`;
      }

      // 脈拍
      const pulseCell = vs.rawData?.pulseRate?.value
        ? String(vs.rawData.pulseRate.value / 10)
        : '-';

      // SpO2
      const spo2Cell = vs.rawData?.spo2?.value
        ? String(vs.rawData.spo2.value / 10)
        : '-';

      html += `<tr><td>${time}</td><td>${tempCell}</td><td>${bpCell}</td><td>${pulseCell}</td><td>${spo2Cell}</td></tr>`;
    }

    html += '</tbody>';

    // 酸素投与はtfootに表示（日付単位のデータなので同一日は同じ値）
    const oxygen = sorted[0]?.oxygen;
    if (oxygen?.flow) {
      const o2Text = oxygen.method
        ? `O2: ${oxygen.flow}L ${oxygen.method}`
        : `O2: ${oxygen.flow}L`;
      html += `<tfoot><tr><td colspan="5" style="text-align:right;padding:4px 0;"><span style="background:#e3f2fd;font-weight:bold;padding:2px 8px;border-radius:4px;">${o2Text}</span></td></tr></tfoot>`;
    }

    html += '</table>';
    return html;
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

  // SVGでバイタル折れ線グラフを描画（showTimelineModalから分離）
  // 純粋関数：外部状態に依存せず、引数のみで動作
  function renderVitalSVG(data, minTime, maxTime, dateKeys, days = 7) {
    const width = 700;
    const chartHeight = 140;
    const gap = 50;
    const margin = { top: 35, right: 50, bottom: 25, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const totalHeight = margin.top + (chartHeight + gap) * 3 - gap + margin.bottom;

    const normalRanges = {
      temp: { min: 36.0, max: 37.0 },
      bpUpper: { min: 90, max: 140 },
      bpLower: { min: 60, max: 90 },
      pulse: { min: 60, max: 100 }
    };

    const temps = data.map(d => d.T).filter(v => v !== null);
    const bpUppers = data.map(d => d.BPupper).filter(v => v !== null);
    const bpLowers = data.map(d => d.BPlower).filter(v => v !== null);
    const pulses = data.map(d => d.P).filter(v => v !== null);

    const tempMin = 35, tempMax = 40;

    const bpValues = [...bpUppers, ...bpLowers];
    const bpMin = bpValues.length > 0 ? Math.floor(Math.min(...bpValues) / 10) * 10 - 10 : 40;
    const bpMax = bpValues.length > 0 ? Math.ceil(Math.max(...bpValues) / 10) * 10 + 10 : 180;

    const pulseMin = pulses.length > 0 ? Math.floor(Math.min(...pulses) / 10) * 10 - 10 : 40;
    const pulseMax = pulses.length > 0 ? Math.ceil(Math.max(...pulses) / 10) * 10 + 10 : 120;

    const timeRange = maxTime - minTime;
    const xScale = (timestamp) => margin.left + ((timestamp - minTime) / timeRange) * chartWidth;

    const createYScale = (min, max, top) => {
      return (v) => top + chartHeight - ((v - min) / (max - min)) * chartHeight;
    };

    const tempTop = margin.top;
    const bpTop = margin.top + chartHeight + gap;
    const pulseTop = margin.top + (chartHeight + gap) * 2;

    const yScaleTemp = createYScale(tempMin, tempMax, tempTop);
    const yScaleBP = createYScale(bpMin, bpMax, bpTop);
    const yScalePulse = createYScale(pulseMin, pulseMax, pulseTop);

    const generatePath = (points, getValue, yScale) => {
      const validPoints = points.filter(p => getValue(p) !== null);
      if (validPoints.length === 0) return '';
      return validPoints.map((p, idx) => {
        const x = xScale(p.timestamp);
        const y = yScale(getValue(p));
        return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ');
    };

    const generateDots = (points, getValue, yScale, color) => {
      return points.map(p => {
        const v = getValue(p);
        if (v === null) return '';
        const x = xScale(p.timestamp);
        const y = yScale(v);
        return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
      }).join('');
    };

    const dayBoundaries = dateKeys.map(key => {
      const [year, month, day] = key.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0).getTime();
      return { key, timestamp: dayStart, month, day };
    });

    const generateDayLinesAndLabels = (top, height) => {
      return dayBoundaries.map((d, i) => {
        const x = xScale(d.timestamp);
        if (x < margin.left || x > margin.left + chartWidth) return '';
        const nextX = (i < dayBoundaries.length - 1)
          ? xScale(dayBoundaries[i + 1].timestamp)
          : margin.left + chartWidth;
        const labelX = (x + nextX) / 2;
        return `
          <line x1="${x}" y1="${top}" x2="${x}" y2="${top + height}" stroke="#ddd" stroke-width="1" />
          <text x="${labelX}" y="${top + height + 12}" text-anchor="middle" font-size="10" fill="#666">${d.month}/${d.day}</text>
        `;
      }).join('');
    };

    const generateYTicks = (min, max, step, top, color) => {
      const ticks = [];
      for (let v = min; v <= max; v += step) {
        ticks.push(v);
      }
      const yScale = createYScale(min, max, top);
      return ticks.map(v => {
        return `
          <text x="${margin.left - 5}" y="${yScale(v) + 3}" text-anchor="end" font-size="9" fill="${color}">${v}</text>
          <text x="${margin.left + chartWidth + 5}" y="${yScale(v) + 3}" text-anchor="start" font-size="9" fill="${color}">${v}</text>
          <line x1="${margin.left}" y1="${yScale(v)}" x2="${margin.left + chartWidth}" y2="${yScale(v)}" stroke="#eee" stroke-dasharray="2,2" />
        `;
      }).join('');
    };

    const generateNormalBand = (rangeMin, rangeMax, scaleMin, scaleMax, top, color) => {
      const clampedMin = Math.max(rangeMin, scaleMin);
      const clampedMax = Math.min(rangeMax, scaleMax);
      if (clampedMin >= clampedMax) return '';
      const yScale = createYScale(scaleMin, scaleMax, top);
      const y1 = yScale(clampedMax);
      const y2 = yScale(clampedMin);
      const height = y2 - y1;
      return `<rect x="${margin.left}" y="${y1}" width="${chartWidth}" height="${height}" fill="${color}" />`;
    };

    const titles = `
      <text x="${margin.left}" y="${tempTop - 5}" font-size="11" font-weight="bold" fill="#333">体温 (°C)</text>
      <text x="${margin.left}" y="${bpTop - 5}" font-size="11" font-weight="bold" fill="#333">血圧 (mmHg)</text>
      <text x="${margin.left}" y="${pulseTop - 5}" font-size="11" font-weight="bold" fill="#333">脈拍 (/min)</text>
    `;

    const tempPath = generatePath(data, d => d.T, yScaleTemp);
    const bpUpperPath = generatePath(data, d => d.BPupper, yScaleBP);
    const bpLowerPath = generatePath(data, d => d.BPlower, yScaleBP);
    const pulsePath = generatePath(data, d => d.P, yScalePulse);

    const showDots = days !== 30;
    const tempDots = showDots ? generateDots(data, d => d.T, yScaleTemp, '#FF5722') : '';
    const bpUpperDots = showDots ? generateDots(data, d => d.BPupper, yScaleBP, '#4CAF50') : '';
    const bpLowerDots = showDots ? generateDots(data, d => d.BPlower, yScaleBP, '#9C27B0') : '';
    const pulseDots = showDots ? generateDots(data, d => d.P, yScalePulse, '#2196F3') : '';

    const tempNormalBand = generateNormalBand(normalRanges.temp.min, normalRanges.temp.max, tempMin, tempMax, tempTop, 'rgba(255, 87, 34, 0.15)');
    const bpUpperNormalBand = generateNormalBand(normalRanges.bpUpper.min, normalRanges.bpUpper.max, bpMin, bpMax, bpTop, 'rgba(76, 175, 80, 0.15)');
    const bpLowerNormalBand = generateNormalBand(normalRanges.bpLower.min, normalRanges.bpLower.max, bpMin, bpMax, bpTop, 'rgba(156, 39, 176, 0.15)');
    const pulseNormalBand = generateNormalBand(normalRanges.pulse.min, normalRanges.pulse.max, pulseMin, pulseMax, pulseTop, 'rgba(33, 150, 243, 0.15)');

    return `
      <svg width="${width}" height="${totalHeight}" style="display:block;margin:0 auto;">
        <!-- 体温グラフ -->
        <rect x="${margin.left}" y="${tempTop}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" />
        ${tempNormalBand}
        ${generateYTicks(tempMin, tempMax, 1, tempTop, '#666')}
        ${generateDayLinesAndLabels(tempTop, chartHeight)}
        <path d="${tempPath}" fill="none" stroke="#FF5722" stroke-width="2" />
        ${tempDots}
        <rect x="${margin.left}" y="${tempTop}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#ccc" />

        <!-- 血圧グラフ -->
        <rect x="${margin.left}" y="${bpTop}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" />
        ${bpUpperNormalBand}
        ${bpLowerNormalBand}
        ${generateYTicks(bpMin, bpMax, 20, bpTop, '#666')}
        ${generateDayLinesAndLabels(bpTop, chartHeight)}
        <path d="${bpUpperPath}" fill="none" stroke="#4CAF50" stroke-width="2" />
        <path d="${bpLowerPath}" fill="none" stroke="#9C27B0" stroke-width="1.5" />
        ${bpUpperDots}
        ${bpLowerDots}
        <rect x="${margin.left}" y="${bpTop}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#ccc" />

        <!-- 脈拍グラフ -->
        <rect x="${margin.left}" y="${pulseTop}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" />
        ${pulseNormalBand}
        ${generateYTicks(pulseMin, pulseMax, 20, pulseTop, '#666')}
        ${generateDayLinesAndLabels(pulseTop, chartHeight)}
        <path d="${pulsePath}" fill="none" stroke="#2196F3" stroke-width="2" />
        ${pulseDots}
        <rect x="${margin.left}" y="${pulseTop}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#ccc" />

        <!-- タイトル -->
        ${titles}
      </svg>
    `;
  }

  // モーダル用CSS（showTimelineModalから分離）
  const MODAL_CSS = `
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
      flex: 1;
    }
    #patient-timeline-modal #header-search-container {
      margin-left: auto;
      margin-right: 24px;
    }
    #patient-timeline-modal #header-search-container .search-input {
      width: 400px;
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
      min-width: 400px;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    #patient-timeline-modal .search-input:focus {
      outline: none;
      border-color: #2196F3;
    }
    #patient-timeline-modal .column-filters {
      display: flex;
      gap: 4px;
      flex: 1;
      justify-content: flex-end;
      margin: 0 8px;
    }
    #patient-timeline-modal .category-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      border: 1px solid;
      transition: all 0.2s;
      white-space: nowrap;
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
    #patient-timeline-modal .vital-column,
    #patient-timeline-modal .prescription-order-column {
      flex: 3;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #patient-timeline-modal .fixed-info-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f5f5f5;
      box-shadow: -2px 0 8px rgba(0,0,0,0.08);
      border-radius: 8px 0 0 8px;
    }
    #patient-timeline-modal .fixed-info-column .column-content {
      padding-top: 12px;
    }
    #patient-timeline-modal .record-column,
    #patient-timeline-modal .vital-column,
    #patient-timeline-modal .prescription-order-column {
      border-right: 1px solid #e0e0e0;
    }
    #patient-timeline-modal .column-header {
      padding: 12px 16px;
      font-weight: 600;
      font-size: 14px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #patient-timeline-modal .add-record-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    #patient-timeline-modal .add-record-btn:hover {
      background: #388E3C;
    }
    #patient-timeline-modal .edit-record-btn {
      background: transparent;
      border: none;
      padding: 2px 6px;
      font-size: 14px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    #patient-timeline-modal .edit-record-btn:hover {
      opacity: 1;
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
      margin-left: 8px;
      flex: 1;
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
    #patient-timeline-modal .record-card[data-record-id^="meal-"] .record-card-text {
      font-family: monospace;
    }
    #patient-timeline-modal .temp-high {
      background: #ffebee;
      color: #c62828;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    #patient-timeline-modal .temp-low {
      background: #e3f2fd;
      color: #1565c0;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    #patient-timeline-modal .vital-table {
      font-family: monospace;
      font-size: 13px;
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }
    #patient-timeline-modal .vital-table th,
    #patient-timeline-modal .vital-table td {
      padding: 4px 8px;
      text-align: center;
    }
    #patient-timeline-modal .vital-table th:first-child,
    #patient-timeline-modal .vital-table td:first-child {
      text-align: left;
      width: 50px;
    }
    #patient-timeline-modal .vital-table th:nth-child(2),
    #patient-timeline-modal .vital-table td:nth-child(2) {
      width: 55px;
    }
    #patient-timeline-modal .vital-table th:nth-child(3),
    #patient-timeline-modal .vital-table td:nth-child(3) {
      width: 70px;
    }
    #patient-timeline-modal .vital-table th:nth-child(4),
    #patient-timeline-modal .vital-table td:nth-child(4) {
      width: 45px;
    }
    #patient-timeline-modal .vital-table th:nth-child(5),
    #patient-timeline-modal .vital-table td:nth-child(5) {
      width: 50px;
    }
    #patient-timeline-modal .vital-table th {
      font-weight: 600;
      color: #666;
      border-bottom: 1px solid #ddd;
    }
    #patient-timeline-modal .vital-table td {
      border-bottom: 1px solid #f0f0f0;
    }
    #patient-timeline-modal .vital-table tr:last-child td {
      border-bottom: none;
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
    #patient-timeline-modal .fixed-info-wrapper {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border-bottom: 1px solid #e0e0e0;
    }
    #patient-timeline-modal .fixed-info-wrapper.collapsed .fixed-info-area {
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
    #patient-timeline-modal .info-card-content .med-usage,
    #patient-timeline-modal .column-content .med-usage {
      font-size: 12px;
      color: #e65100;
      background: #fff3e0;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      display: inline-block;
    }
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
    #patient-timeline-modal .med-link {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    #patient-timeline-modal .med-link:hover {
      text-decoration: underline;
      color: #1976D2;
    }
    #patient-timeline-modal .prescription-section,
    #patient-timeline-modal .injection-section {
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 4px solid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      font-size: 13px;
    }
    #patient-timeline-modal .section-title {
      font-weight: 600;
      font-size: 13px;
      color: #333;
      margin-bottom: 8px;
    }
    #patient-timeline-modal .empty-message {
      color: #999;
      font-size: 13px;
      padding: 8px 0;
    }
    #patient-timeline-modal .patient-list-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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
    #patient-timeline-modal .patient-chip.scheduled {
      border-style: dashed;
    }
    #patient-timeline-modal .patient-chip .scheduled-date {
      font-size: 11px;
      color: #666;
      margin-left: 2px;
    }
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
  `;

  // タイムラインモーダル表示
  function showTimelineModal() {
    // 既存モーダルを削除
    document.getElementById('patient-timeline-modal')?.remove();

    // SPA遷移対応: クリーンアップ用
    const cleaner = window.HenryCore.utils.createCleaner();

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
    let vitalGraphState = null; // { close, overlayEl, dateKey, days } グラフモーダルの状態
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
    // 現在のユーザーUUID（編集権限判定用）
    let myUuid = null;
    // プリフェッチ用キャッシュ
    let patientDataCache = new Map(); // key: patientUuid, value: { hospitalizations, currentHospitalization, allData }

    const modal = document.createElement('div');
    modal.id = 'patient-timeline-modal';
    modal.innerHTML = `
      <style>${MODAL_CSS}</style>
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
            <div id="header-search-container" style="display: none;"></div>
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
              <div class="fixed-info-area" id="fixed-info-area">
                <div class="info-card" style="width: 50%;">
                  <div class="info-card-header">プロフィール</div>
                  <div class="info-card-content" id="profile-content"><span class="empty">-</span></div>
                </div>
                <div class="info-card" style="width: 50%;">
                  <div class="info-card-header">サマリー</div>
                  <div class="info-card-content" id="summary-content"><span class="empty">-</span></div>
                </div>
              </div>
              <div class="fixed-info-resizer" id="fixed-info-resizer"></div>
            </div>
            <div class="timeline-layout" style="flex: 1; overflow: hidden;">
              <div class="date-list" id="date-list"></div>
              <div class="content-columns">
                <div class="record-column">
                  <div class="column-header">
                    <span>記録</span>
                    <div class="column-filters" id="record-filters"></div>
                    <button id="add-record-btn" class="add-record-btn">＋記録を追加</button>
                  </div>
                  <div class="column-content" id="record-content"></div>
                </div>
                <div class="vital-column">
                  <div class="column-header">
                    <span>データ</span>
                    <div class="column-filters" id="data-filters"></div>
                  </div>
                  <div class="column-content" id="vital-content"></div>
                </div>
                <div class="prescription-order-column">
                  <div class="column-header">
                    <span>処方・注射</span>
                    <div class="column-filters" id="order-filters"></div>
                  </div>
                  <div class="column-content" id="prescription-order-content"></div>
                </div>
                <div class="fixed-info-column">
                  <div class="column-content" id="fixed-info-content">
                    <!-- 内容は未定のため空 -->
                  </div>
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
    const vitalContent = modal.querySelector('#vital-content');
    const prescriptionOrderContent = modal.querySelector('#prescription-order-content');
    const fixedInfoContent = modal.querySelector('#fixed-info-content');
    const hospInfo = modal.querySelector('#hosp-info');
    const doctorLegend = modal.querySelector('#doctor-legend');
    const profileContent = modal.querySelector('#profile-content');
    const fixedInfoWrapper = modal.querySelector('#fixed-info-wrapper');
    const fixedInfoArea = modal.querySelector('#fixed-info-area');
    const fixedInfoResizer = modal.querySelector('#fixed-info-resizer');
    const addRecordBtn = modal.querySelector('#add-record-btn');

    // 記録追加モーダル表示
    function showAddRecordModal(existingRecord = null) {
      if (!selectedPatient || !currentHospitalization) {
        window.HenryCore.ui.showToast('患者が選択されていません', 'error');
        return;
      }

      const isEdit = !!existingRecord;
      const title = isEdit ? '医師記録を編集' : '医師記録を追加';
      const buttonLabel = isEdit ? '更新' : '保存';
      const initialContent = isEdit ? parseEditorData(existingRecord.editorData) : '';

      // 現在時刻（分を5分単位に丸める）
      const now = new Date();
      const minutes = Math.round(now.getMinutes() / 5) * 5;
      now.setMinutes(minutes);
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 編集モードの場合は元の時刻と日付を使用、新規作成は現在日時
      let timeStr = currentTimeStr;
      let dateStr = new Date().toISOString().split('T')[0];  // デフォルトは常に本日
      if (isEdit && existingRecord.performTime) {
        const originalDate = new Date(existingRecord.performTime);
        timeStr = `${originalDate.getHours().toString().padStart(2, '0')}:${originalDate.getMinutes().toString().padStart(2, '0')}`;
        dateStr = originalDate.toISOString().split('T')[0];  // 元の記録日付
      }

      // DOM要素を作成（HenryCore.ui.showModalはcontentが文字列だとtextContentとして設定するため）
      const contentDiv = document.createElement('div');
      contentDiv.style.padding = '16px';

      // 実施日時
      const timeSection = document.createElement('div');
      timeSection.style.marginBottom = '12px';

      const timeLabel = document.createElement('label');
      timeLabel.style.cssText = 'display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;';
      timeLabel.textContent = '実施日時';
      timeSection.appendChild(timeLabel);

      const timeInputWrapper = document.createElement('div');
      timeInputWrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';

      // 日付入力
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.id = 'record-date-input';
      dateInput.value = dateStr;
      dateInput.style.cssText = 'padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;';
      timeInputWrapper.appendChild(dateInput);

      // 時刻入力
      const timeInput = document.createElement('input');
      timeInput.type = 'time';
      timeInput.id = 'record-time-input';
      timeInput.value = timeStr;
      timeInput.style.cssText = 'padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;';
      timeInputWrapper.appendChild(timeInput);

      // 編集モードの場合のみ「現在時刻に変更」チェックボックスを表示
      if (isEdit) {
        const checkboxWrapper = document.createElement('label');
        checkboxWrapper.style.cssText = 'display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px; color: #666;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'use-current-time-checkbox';
        checkbox.style.cursor = 'pointer';
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            timeInput.value = currentTimeStr;
          } else {
            timeInput.value = timeStr;  // 元の時刻に戻す
          }
        });
        checkboxWrapper.appendChild(checkbox);

        const checkboxLabel = document.createTextNode('現在時刻に変更');
        checkboxWrapper.appendChild(checkboxLabel);

        timeInputWrapper.appendChild(checkboxWrapper);
      }

      timeSection.appendChild(timeInputWrapper);

      contentDiv.appendChild(timeSection);

      // 記録内容
      const contentSection = document.createElement('div');

      const contentLabel = document.createElement('label');
      contentLabel.style.cssText = 'display: block; margin-bottom: 4px; font-weight: 500; font-size: 13px;';
      contentLabel.textContent = '記録内容';
      contentSection.appendChild(contentLabel);

      const textarea = document.createElement('textarea');
      textarea.id = 'record-content-input';
      textarea.placeholder = '記録内容を入力...';
      textarea.value = initialContent;
      textarea.style.cssText = 'width: 100%; height: 250px; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; line-height: 1.6; resize: vertical; box-sizing: border-box;';
      contentSection.appendChild(textarea);

      contentDiv.appendChild(contentSection);

      let recordModal;
      recordModal = window.HenryCore.ui.showModal({
        title: title,
        width: '600px',
        content: contentDiv,
        actions: [
          { label: 'キャンセル', variant: 'secondary', onClick: () => recordModal.close() },
          { label: buttonLabel, variant: 'primary', onClick: () => saveRecord(recordModal, isEdit ? existingRecord : null) }
        ]
      });

      // テキストエリアにフォーカス
      setTimeout(() => {
        textarea.focus();
      }, 100);
    }

    // 記録保存
    async function saveRecord(recordModal, existingRecord = null) {
      const contentInput = document.getElementById('record-content-input');
      const timeInput = document.getElementById('record-time-input');
      const dateInput = document.getElementById('record-date-input');
      const content = contentInput?.value?.trim();

      if (!content) {
        window.HenryCore.ui.showToast('記録内容を入力してください', 'error');
        return;
      }

      // 実施日時を計算（入力された日付 + 入力時刻）
      const [hours, minutes] = (timeInput?.value || '12:00').split(':').map(Number);
      // dateInputはYYYY-MM-DD形式
      const dateValue = dateInput?.value || selectedDateKey || new Date().toISOString().split('T')[0];
      const [year, month, day] = dateValue.split('-').map(Number);
      const performDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const performTimeSeconds = Math.floor(performDate.getTime() / 1000);

      const editorData = textToEditorData(content);
      const spinner = window.HenryCore.ui.showSpinner('保存中...');

      try {
        const isEdit = !!existingRecord;

        if (isEdit) {
          // 更新（インライン方式）
          const mutation = buildUpdateClinicalDocumentMutation(
            existingRecord.uuid,
            selectedPatient.uuid,
            editorData,
            performTimeSeconds,
            currentHospitalization.uuid
          );
          await window.HenryCore.query(mutation);
        } else {
          // 新規作成（インライン方式）
          const mutation = buildCreateClinicalDocumentMutation(
            selectedPatient.uuid,
            editorData,
            performTimeSeconds,
            currentHospitalization.uuid
          );
          await window.HenryCore.query(mutation);
        }

        recordModal.close();
        window.HenryCore.ui.showToast(isEdit ? '記録を更新しました' : '記録を保存しました', 'success');

        // タイムラインを再読み込み
        await refreshTimelineData();
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 記録保存エラー:`, e);
        window.HenryCore.ui.showToast('保存に失敗しました: ' + e.message, 'error');
      } finally {
        spinner.close();
      }
    }

    // タイムラインデータを再読み込み
    async function refreshTimelineData() {
      if (!selectedPatient) return;

      // キャッシュをクリア
      patientDataCache.delete(selectedPatient.uuid);

      // 現在の選択日を保持
      const currentSelectedDateKey = selectedDateKey;

      // データを再取得して表示を更新
      await loadTimelineData(selectedPatient.uuid);

      // 選択日を復元
      if (currentSelectedDateKey) {
        selectedDateKey = currentSelectedDateKey;
        renderTimeline();
      }
    }

    // 記録追加ボタンのイベント
    addRecordBtn.addEventListener('click', () => {
      if (currentView !== 'timeline') return;
      showAddRecordModal();
    });

    // 編集ボタンのクリックイベント（イベントデリゲーション）
    recordContent.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-record-btn');
      if (!editBtn) return;

      const recordId = editBtn.dataset.recordId;
      if (!recordId) return;

      // allItemsから対象の記録を取得
      const record = allItems.find(item => item.id === recordId && item.category === 'doctor');
      if (!record) {
        console.error(`[${SCRIPT_NAME}] 記録が見つかりません: ${recordId}`);
        return;
      }

      // 編集モーダルを表示
      showAddRecordModal({
        uuid: record.id,
        editorData: record.editorData,
        performTime: record.date  // 元の実施日時を渡す
      });
    });

    // リサイズ機能のセットアップ（ダブルクリックで折りたたみ）
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

      // ダブルクリックで折りたたみトグル
      const toggleCollapse = () => {
        fixedInfoWrapper.classList.toggle('collapsed');
        fixedInfoCollapsed = fixedInfoWrapper.classList.contains('collapsed');
      };
      fixedInfoResizer.addEventListener('dblclick', toggleCollapse);
      fixedInfoArea.addEventListener('dblclick', toggleCollapse);

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

    // モーダルを閉じる（クリーンアップ付き）
    function closeModal() {
      cleaner.cleanup();
      modal.remove();
    }

    // 閉じる
    closeBtn.onclick = closeModal;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // キーボードショートカット
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      // タイムラインビューでのみ矢印キーを処理
      if (currentView !== 'timeline') return;

      // 入力フィールドにフォーカス中は無視
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowUp': // 前の日付（新しい方）
          e.preventDefault();
          navigateDate(-1);
          break;
        case 'ArrowDown': // 次の日付（古い方）
          e.preventDefault();
          navigateDate(1);
          break;
        case 'ArrowLeft': // 前の患者
          e.preventDefault();
          navigateToPreviousPatient();
          break;
        case 'ArrowRight': // 次の患者
          e.preventDefault();
          navigateToNextPatient();
          break;
      }
    };
    document.addEventListener('keydown', handleKeydown);
    cleaner.add(() => document.removeEventListener('keydown', handleKeydown));

    // SPA遷移時にモーダルを閉じる
    window.addEventListener('henry:navigation', closeModal);
    cleaner.add(() => window.removeEventListener('henry:navigation', closeModal));

    // 日付ナビゲーション（direction: -1=上/新しい方、1=下/古い方）
    function navigateDate(direction) {
      const dateItems = dateListEl.querySelectorAll('.date-item');
      const dateKeys = Array.from(dateItems).map(el => el.dataset.dateKey);
      const currentIndex = dateKeys.indexOf(selectedDateKey);

      if (currentIndex === -1) return;

      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < dateKeys.length) {
        selectedDateKey = dateKeys[newIndex];
        renderTimeline();

        // グラフモーダルが開いていれば更新（選択中の日数を維持）
        if (vitalGraphState) {
          showVitalGraph(selectedDateKey, vitalGraphState.days);
        }
      }
    }

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
          sexType: patient.patient.detail?.sexType,
          birthDate: patient.patient.detail?.birthDate,
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
          sexType: patient.patient.detail?.sexType,
          birthDate: patient.patient.detail?.birthDate,
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

      // ヘッダーの検索ボックスを非表示にし、controls-areaに患者検索ボックスを復元
      const headerSearchContainer = modal.querySelector('#header-search-container');
      headerSearchContainer.style.display = 'none';
      headerSearchContainer.innerHTML = '';
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
    async function switchToTimeline(patient) {
      currentView = 'timeline';
      selectedPatient = patient;

      backBtn.style.display = 'block';
      updateNavButtons();
      // 年齢・性別を表示（患者IDは非表示）
      const age = patient.birthDate ? calculateAge(patient.birthDate) : null;
      const sexLabel = patient.sexType === 'SEX_TYPE_MALE' ? '男性' : patient.sexType === 'SEX_TYPE_FEMALE' ? '女性' : '';
      const info = [age ? `${age}歳` : null, sexLabel].filter(Boolean).join('・');
      const titleBase = info ? `${patient.fullName}（${info}）` : patient.fullName;
      modalTitle.textContent = titleBase;
      hospInfo.textContent = '読み込み中...';

      // 入院病名をキャッシュから取得してタイトルに追加
      const cachedDisease = getCachedDisease(patient.uuid);
      if (cachedDisease) {
        modalTitle.textContent = `${titleBase} - ${cachedDisease}`;
      }

      // 患者選択画面の検索ボックスをクリアし、ヘッダーに検索ボックスを表示
      controlsArea.innerHTML = '';
      const headerSearchContainer = modal.querySelector('#header-search-container');
      headerSearchContainer.style.display = 'block';
      headerSearchContainer.innerHTML = `
        <input type="text" class="search-input" placeholder="キーワード検索..." id="timeline-search-input">
      `;
      setupTimelineSearchEvent();

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

      // リサイズ機能をセットアップ（ダブルクリックで折りたたみ）
      setupResizer();

      // ローディング表示
      dateListEl.innerHTML = '<div class="no-records">読み込み中...</div>';
      recordContent.innerHTML = '<div class="no-records">読み込み中...</div>';
      vitalContent.innerHTML = '<div class="no-records">読み込み中...</div>';
      prescriptionOrderContent.innerHTML = '<div class="no-records">読み込み中...</div>';

      // バイタルグラフモーダルが開いていればローディング表示に切り替え
      if (vitalGraphState && vitalGraphState.overlayEl && vitalGraphState.overlayEl.parentNode) {
        const titleEl = vitalGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>バイタル推移</span>
            <span style="font-size: 14px; color: #666;">${patient.fullName}</span>
          `;
          // bodyElはtitleElの次の兄弟要素（showVitalGraphと同じ取得方法）
          const bodyEl = titleEl.nextElementSibling;
          if (bodyEl) {
            bodyEl.innerHTML = `
              <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
                ${[7, 14, 30].map(d => `
                  <button disabled style="padding: 6px 16px; border: none; border-radius: 4px;
                    background: #e0e0e0; color: #999; font-size: 13px;">${d}日</button>
                `).join('')}
              </div>
              <div style="display: flex; justify-content: center; align-items: center; min-height: 580px; color: #666;">
                グラフを生成中...
              </div>
            `;
          }
        }
      }

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

              // 入院予定患者の場合は日付を表示
              let displayName = escapeHtml(p.fullName || '名前不明');
              let tooltip = `${days}日目 / ${escapeHtml(doctorName)}`;
              let chipStyle = `background: ${color.bg}; border-color: ${color.border};`;

              if (item.isScheduled && item.scheduledDate) {
                displayName += `<span class="scheduled-date">（${item.scheduledDate.month}/${item.scheduledDate.day}入院予定）</span>`;
                tooltip = `${item.scheduledDate.month}/${item.scheduledDate.day}入院予定 / ${escapeHtml(doctorName)}`;
                chipStyle += ' opacity: 0.85;';
              }

              sectionsHtml += `
                <div class="patient-chip${item.isScheduled ? ' scheduled' : ''}" data-uuid="${p.uuid}" title="${tooltip}" style="${chipStyle}">
                  ${displayName}
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
              sexType: patient.patient.detail?.sexType,
              birthDate: patient.patient.detail?.birthDate,
              wardName: patient.statusHospitalizationLocation?.ward?.name,
              roomName: patient.statusHospitalizationLocation?.room?.name,
              hospitalizationDayCount: patient.hospitalizationDayCount
            });
          }
        };
      });
    }

    // カテゴリフィルタを描画（各カラムヘッダーに配置）
    function renderCategoryFilters() {
      // カテゴリのグループ分け
      const filterGroups = {
        'record-filters': ['doctor', 'nursing', 'rehab'],
        'data-filters': ['vital', 'meal'],
        'order-filters': ['prescription', 'injection']
      };

      // 各グループにフィルターを描画
      Object.entries(filterGroups).forEach(([containerId, categoryIds]) => {
        const container = modal.querySelector(`#${containerId}`);
        if (!container) return;

        container.innerHTML = categoryIds.map(catId => {
          const cat = CATEGORIES[catId];
          if (!cat) return '';
          return `
            <div class="category-chip ${selectedCategories.has(cat.id) ? 'active' : 'inactive'}"
                 data-category="${cat.id}"
                 style="background: ${cat.bgColor}; border-color: ${cat.color}; color: ${cat.color};">
              ${cat.name}
            </div>
          `;
        }).join('');

        // イベント設定
        container.querySelectorAll('.category-chip').forEach(chip => {
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
        vitalContent.innerHTML = '';
        prescriptionOrderContent.innerHTML = '';
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

      // 記録とデータ（バイタル+食事摂取）に分類
      const records = selectedItems.filter(item => RECORD_CATEGORIES.includes(item.category));
      const dataItems = selectedItems.filter(item => item.category === 'vital' || item.category === 'meal');

      // 記録は時系列（新→古）でソート
      records.sort((a, b) => (b.date || 0) - (a.date || 0));

      // データは時系列（新→古）でソート
      dataItems.sort((a, b) => (b.date || 0) - (a.date || 0));

      // 記録カラム描画
      recordContent.innerHTML = records.length > 0
        ? records.map(item => renderRecordCard(item)).join('')
        : '<div class="no-records">この日の記録はありません</div>';

      // データカラム描画（バイタル+食事摂取）
      vitalContent.innerHTML = dataItems.length > 0
        ? dataItems.map(item => renderRecordCard(item)).join('')
        : '<div class="no-records">この日のデータはありません</div>';

      // バイタルカードにクリックイベント追加（グラフ表示）
      vitalContent.querySelectorAll('.record-card[data-record-id^="vital-"]').forEach(card => {
        card.style.cursor = 'pointer';
        card.title = 'クリックで過去1週間の推移グラフを表示';
        card.onclick = () => {
          // data-record-id="vital-YYYY-MM-DD" から日付を抽出
          const recordId = card.dataset.recordId;
          const dateStr = recordId.replace('vital-', '');
          showVitalGraph(dateStr);
        };
      });

      // 処方・注射カラム描画
      renderPrescriptionOrderColumn(selectedDateKey);
    }

    // 記録カードを描画
    function renderRecordCard(item) {
      const cat = CATEGORIES[item.category];
      // mealカテゴリは時刻を非表示（食事データには時刻情報がないため）
      // vitalカテゴリは時刻を非表示（テーブル内の各行に時刻があるため冗長）
      const time = (item.category === 'meal' || item.category === 'vital') ? '' :
        (item.date ? `${item.date.getHours()}:${String(item.date.getMinutes()).padStart(2, '0')}` : '-');

      // バイタルカードは体温ハイライト用HTMLを含むためエスケープしない
      const textHtml = item.category === 'vital'
        ? item.text.replace(/\n/g, '<br>')
        : highlightText(item.text, searchText).replace(/\n/g, '<br>');

      // 医師記録かつ自分が作成したものに編集ボタンを表示
      const canEdit = item.category === 'doctor' && item.creatorUuid && myUuid && item.creatorUuid === myUuid;
      const editButton = canEdit
        ? `<button class="edit-record-btn" data-record-id="${item.id}" title="編集">✏️</button>`
        : '';

      return `
        <div class="record-card" style="background: ${cat.bgColor}; border-left-color: ${cat.color};" data-record-id="${item.id || ''}">
          <div class="record-card-header">
            <span class="record-card-time">${time}</span>
            <span class="record-card-author">${escapeHtml(item.author.replace(/\u3000/g, ' '))}</span>
            ${editButton}
            <span class="record-card-category" style="background: ${cat.color}; color: white;">${cat.name}</span>
          </div>
          <div class="record-card-text">${textHtml}</div>
        </div>
      `;
    }

    // バイタル経時変化グラフを表示
    function showVitalGraph(endDateStr, days = 7) {
      // endDateStrは YYYY-MM-DD 形式
      const endDate = new Date(endDateStr + 'T23:59:59');
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      // 過去N日分の日付キーを生成
      const dateKeys = [];
      const dateKeySet = new Set();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const key = dateKey(d);
        dateKeys.push(key);
        dateKeySet.add(key);
      }

      // allItemsからバイタルデータを収集（プリフェッチによるキャッシュ上書き問題を回避）
      const allVitals = [];
      for (const item of allItems) {
        if (item.category !== 'vital' || !item.vitals) continue;
        // 日付範囲内のアイテムのみ
        const itemKey = dateKey(item.date);
        if (!dateKeySet.has(itemKey)) continue;

        for (const vs of item.vitals) {
          const raw = vs.rawData;
          allVitals.push({
            timestamp: vs.date.getTime(),
            date: vs.date,
            T: raw?.temperature?.value ? raw.temperature.value / 10 : null,
            BPupper: raw?.bloodPressureUpperBound?.value ? raw.bloodPressureUpperBound.value / 10 : null,
            BPlower: raw?.bloodPressureLowerBound?.value ? raw.bloodPressureLowerBound.value / 10 : null,
            P: raw?.pulseRate?.value ? raw.pulseRate.value / 10 : null
          });
        }
      }

      // 時系列でソート
      allVitals.sort((a, b) => a.timestamp - b.timestamp);

      // データがあるか確認
      const hasData = allVitals.some(d => d.T !== null || d.BPupper !== null || d.P !== null);
      if (!hasData) {
        // モーダルが既に開いている場合はデータなしでも閉じない（トーストのみ）
        if (vitalGraphState) {
          window.HenryCore.ui.showToast('この期間のバイタルデータがありません', 'info');
          return;
        }
        window.HenryCore.ui.showToast('この期間のバイタルデータがありません', 'info');
        return;
      }

      // 期間表示用の日付フォーマット
      const startLabel = `${parseInt(dateKeys[0].split('-')[1])}/${parseInt(dateKeys[0].split('-')[2])}`;
      const endLabel = `${parseInt(dateKeys[dateKeys.length - 1].split('-')[1])}/${parseInt(dateKeys[dateKeys.length - 1].split('-')[2])}`;

      // SVG生成
      const svgHtml = renderVitalSVG(allVitals, startDate.getTime(), endDate.getTime(), dateKeys, days);

      // ボタングループHTML
      const buttonGroupHtml = `
        <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
          ${[7, 14, 30].map(d => `
            <button
              class="vital-days-btn"
              data-days="${d}"
              style="
                padding: 6px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                ${d === days
                  ? 'background: #1976d2; color: white;'
                  : 'background: #e0e0e0; color: #333;'}
              "
            >${d}日</button>
          `).join('')}
        </div>
      `;

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (vitalGraphState && vitalGraphState.overlayEl && vitalGraphState.overlayEl.parentNode) {
        vitalGraphState.dateKey = endDateStr;
        vitalGraphState.days = days;
        // タイトル更新（患者名を右寄せで表示）
        const titleEl = vitalGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>バイタル推移（${startLabel} - ${endLabel}）</span>
            <span style="font-size: 14px; color: #666;">${selectedPatient?.fullName || ''}</span>
          `;
        }
        // コンテンツ更新（ボタングループ + SVG）
        const bodyEl = titleEl?.nextElementSibling;
        if (bodyEl) {
          bodyEl.innerHTML = buttonGroupHtml + svgHtml;
          // ボタンにイベントを再設定
          bodyEl.querySelectorAll('.vital-days-btn').forEach(btn => {
            btn.onclick = () => {
              const newDays = parseInt(btn.dataset.days, 10);
              showVitalGraph(endDateStr, newDays);
            };
          });
        }
        return;
      }

      // 新規モーダル作成
      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = buttonGroupHtml + svgHtml;

      // ボタンにクリックイベントを設定
      svgContainer.querySelectorAll('.vital-days-btn').forEach(btn => {
        btn.onclick = () => {
          const newDays = parseInt(btn.dataset.days, 10);
          showVitalGraph(endDateStr, newDays);
        };
      });

      const { close } = window.HenryCore.ui.showModal({
        title: `バイタル推移（${startLabel} - ${endLabel}）`,
        content: svgContainer,
        width: '750px'
      });

      // モーダルのoverlay要素を取得（最後に追加されたhenry-modal-overlay）
      const overlayEl = document.querySelector('.henry-modal-overlay:last-of-type');

      // タイトルに患者名を追加（右寄せ）
      if (overlayEl && selectedPatient) {
        const titleEl = overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>バイタル推移（${startLabel} - ${endLabel}）</span>
            <span style="font-size: 14px; color: #666;">${selectedPatient.fullName}</span>
          `;
        }
      }

      vitalGraphState = {
        close,
        overlayEl,
        dateKey: endDateStr,
        days
      };

      // モーダルが閉じられたら状態をリセット（MutationObserverで監視）
      if (overlayEl) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const removed of mutation.removedNodes) {
              if (removed === overlayEl) {
                vitalGraphState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // 固定情報エリアを描画（プロフィールのみ）
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
    }

    // 処方・注射カラムを描画
    function renderPrescriptionOrderColumn(targetDateKey) {
      // selectedDateKeyはYYYY-MM-DD形式
      const targetDate = targetDateKey ? new Date(targetDateKey + 'T00:00:00') : new Date();
      targetDate.setHours(0, 0, 0, 0);

      // 表示用の日付文字列
      const dateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;

      let html = '';

      // === 選択日の処方 ===
      if (selectedCategories.has('prescription')) {
        const targetPrescriptions = activePrescriptions.filter(rx => {
          if (!rx.startDate) return false;
          const startDate = new Date(rx.startDate.year, rx.startDate.month - 1, rx.startDate.day);
          const maxDuration = Math.max(...(rx.rps || []).map(rp => rp.boundsDurationDays?.value || 1));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + maxDuration - 1);
          return targetDate >= startDate && targetDate <= endDate;
        });

        const prescriptionCat = CATEGORIES.prescription;
        html += `<div class="prescription-section" style="background: ${prescriptionCat.bgColor}; border-left-color: ${prescriptionCat.color};"><div class="section-title">◆ ${dateLabel} の処方</div>`;

        if (targetPrescriptions.length > 0) {
        // 固定カテゴリの定義
        const FIXED_CATEGORIES = {
          wakeup: { label: '起床時', order: 1 },
          morning: { label: '朝', order: 2 },
          noon: { label: '昼', order: 3 },
          evening: { label: '夕', order: 4 },
          bedtime: { label: '就寝前', order: 5 }
        };

        function getTimingInfo(timingText, displayOrder) {
          if (timingText.includes('起床')) return { key: 'wakeup', ...FIXED_CATEGORIES.wakeup };
          if (timingText.includes('朝食')) return { key: 'morning', ...FIXED_CATEGORIES.morning };
          if (timingText.includes('昼食')) return { key: 'noon', ...FIXED_CATEGORIES.noon };
          if (timingText.includes('夕食')) return { key: 'evening', ...FIXED_CATEGORIES.evening };
          if (timingText.includes('就寝')) return { key: 'bedtime', ...FIXED_CATEGORIES.bedtime };
          return { key: timingText, label: timingText, order: 100 + displayOrder };
        }

        const timingGroups = new Map();

        targetPrescriptions.forEach(rx => {
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
                const key = usageText;
                if (!timingGroups.has(key)) {
                  timingGroups.set(key, { label: usageText, order: 1000, medicines: [] });
                }
                timingGroups.get(key).medicines.push(...medicines);
              } else {
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

        timingGroups.forEach((value) => {
          value.medicines = [...new Set(value.medicines)];
        });

        const sortedGroups = Array.from(timingGroups.values())
          .filter(g => g.medicines.length > 0)
          .sort((a, b) => a.order - b.order);

        html += sortedGroups.map(group => `
          <div class="usage-group">
            <div class="usage-label">[${escapeHtml(group.label)}]</div>
            <div class="usage-medicines">
              ${group.medicines.map(m => `<a href="https://www.google.com/search?q=${encodeURIComponent(m)}" target="_blank" class="med-name med-link">${escapeHtml(m)}</a>`).join('<br>')}
            </div>
          </div>
        `).join('');
        } else {
          html += '<div class="empty-message">有効な処方なし</div>';
        }

        html += '</div>';
      }

      // === 選択日の注射 ===
      if (selectedCategories.has('injection')) {
        const targetInjections = activeInjections.filter(inj => {
          if (!inj.startDate) return false;
          const startDate = new Date(inj.startDate.year, inj.startDate.month - 1, inj.startDate.day);
          const maxDuration = Math.max(...(inj.rps || []).map(rp => rp.boundsDurationDays?.value || 1));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + maxDuration - 1);
          return targetDate >= startDate && targetDate <= endDate;
        });

        const injectionCat = CATEGORIES.injection;
        html += `<div class="injection-section" style="background: ${injectionCat.bgColor}; border-left-color: ${injectionCat.color};"><div class="section-title">◆ ${dateLabel} の注射</div>`;

        if (targetInjections.length > 0) {
        html += targetInjections.flatMap(inj => {
          const startDate = new Date(inj.startDate.year, inj.startDate.month - 1, inj.startDate.day);

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
                <div class="med-usage">${technique ? escapeHtml(technique) + ' ' : ''}${endDateStr}</div>
                <div class="med-name">${medicines.map(m => `<a href="https://www.google.com/search?q=${encodeURIComponent(m)}" target="_blank" class="med-link">${escapeHtml(m)}</a>`).join('<br>')}</div>
              </div>
            `;
          });
        }).filter(Boolean).join('');
        } else {
          html += '<div class="empty-message">注射なし</div>';
        }

        html += '</div>';
      }

      prescriptionOrderContent.innerHTML = html;
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
            vitalContent.innerHTML = '';
            prescriptionOrderContent.innerHTML = '';
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
          vitalContent.innerHTML = '';
          prescriptionOrderContent.innerHTML = '';
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

        // カテゴリフィルター描画
        renderCategoryFilters();

        applyFilters();
        renderTimeline();

        // バイタルグラフモーダルが開いていれば更新（患者切り替え時の連動）
        if (vitalGraphState) {
          showVitalGraph(selectedDateKey, vitalGraphState.days);
        }

        // 前後の患者をプリフェッチ（非同期・待たない）
        prefetchAdjacentPatients();
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] データ読み込みエラー:`, e);
        dateListEl.innerHTML = '';
        recordContent.innerHTML = `<div class="no-records">データの読み込みに失敗しました: ${escapeHtml(e.message)}</div>`;
        vitalContent.innerHTML = '';
        prescriptionOrderContent.innerHTML = '';
      }
    }

    // 患者一覧読み込み
    async function loadPatientList() {
      try {
        // 現在のユーザーUUIDを取得（編集権限判定用）
        myUuid = await window.HenryCore.getMyUuid();

        allPatients = await fetchAllHospitalizedPatients();
        isLoading = false;
        console.log(`[${SCRIPT_NAME}] 入院患者一覧取得: ${allPatients.length}名`);

        // 担当医カラーマップを構築
        doctorColorMap = buildDoctorColorMap(allPatients);
        console.log(`[${SCRIPT_NAME}] 担当医: ${doctorColorMap.size}名`);

        renderPatientList();
        renderDoctorLegend();

        // 入院病名をバックグラウンドでプリフェッチ（UIをブロックしない）
        const patientUuids = allPatients.map(p => p.patient?.uuid).filter(Boolean);
        prefetchHospitalizationDiseases(patientUuids).then(() => {
          console.log(`[${SCRIPT_NAME}] 入院病名プリフェッチ完了: ${diseaseCache.size}件`);
        });
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
