// ==UserScript==
// @name         Henry Patient Timeline
// @namespace    https://github.com/shin-926/Henry
// @version      2.113.0
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
    meal: { id: 'meal', name: '食事', color: '#795548', bgColor: '#efebe9' },
    urine: { id: 'urine', name: '排泄', color: '#607D8B', bgColor: '#eceff1' },
    bloodSugar: { id: 'bloodSugar', name: '血糖', color: '#FF9800', bgColor: '#fff3e0' }
  };

  // カテゴリのグループ分け
  const RECORD_CATEGORIES = ['doctor', 'nursing', 'rehab']; // 時系列（古→新）で表示
  const ORDER_CATEGORIES = ['vital', 'injection', 'prescription']; // 固定順序で表示

  // CUSTOMタイプのUUID
  // ※マオカ病院専用スクリプトのためハードコード（他病院展開予定なし）
  const NURSING_RECORD_CUSTOM_TYPE_UUID = 'e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f';
  const PATIENT_PROFILE_CUSTOM_TYPE_UUID = 'f639619a-6fdb-452a-a803-8d42cd50830d';
  const PRESSURE_ULCER_CUSTOM_TYPE_UUID = '2d3b6bbf-3b3e-4a82-8f7f-e29a32352f52';
  const PHARMACY_RECORD_CUSTOM_TYPE_UUID = '2de23e84-0e84-4861-8763-77c8d45f94bb';
  const INSPECTION_FINDINGS_CUSTOM_TYPE_UUID = 'f83d4392-7a68-4c6c-9eef-8947097fb29d';

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
  // ※Henry本体のClinicalCalendarViewと同じリソースを取得
  const CALENDAR_RESOURCES = [
    '//henry-app.jp/clinicalResource/vitalSign',
    '//henry-app.jp/clinicalResource/prescriptionOrder',
    '//henry-app.jp/clinicalResource/injectionOrder',
    '//henry-app.jp/clinicalResource/nutritionOrder',
    // カスタム定量データ（観察項目、食事摂取量、排泄など）
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/f20a5f9d-e40d-4049-a24b-a5e5809dc7e8',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/749ade09-5c03-4c6d-a8c4-cf4c386f8f1a',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/1588e236-8eee-4f54-9114-e11c57108f8c',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/77be0d2e-181d-42e1-940b-b27863594c6b',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/772cbf1e-a6e6-42aa-bb88-2b1d650a658a',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/fb5d9b7b-8857-40b6-a82b-2547a6ae9e56',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/e54f72b3-ee52-45e9-9dfb-fda4615f9722',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/2b5d1d50-d162-46b5-a3b9-34608ea8e805',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/38c01268-1ffb-4a2f-a227-85f0fafe4780',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/d4c6e8b3-81ee-431f-adbe-dc113294a356',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/614e72ad-78ed-4aba-98a9-25d87efcf846',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/883dbf3c-8774-447b-b519-3141fa1ab9a4',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/8142e84b-dadf-465e-b1f6-6b691bbd6588',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/7d50a032-4049-429c-8c58-1a7c8c353390',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/3249f5de-f0c3-496a-968e-7b4d014a5cba',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/a849cd3d-7840-462f-9a62-26d1dcf3bec1',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/f2297762-d0ef-4b88-ae76-61f12569e565',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/9c812b76-e0f5-4a98-af02-aef5885a851c',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/e7a84f72-cece-4d39-9d4e-efa029829423',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/ec34fca6-d32b-4519-b167-266e6e6cf006',
    '//henry-app.jp/clinicalResource/clinicalQuantitativeDataDefCustom/125c88b0-1151-4ce0-b31b-ddbe3abadef8',
    // 血液検査（外部検査結果 + 検体検査オーダー）
    '//henry-app.jp/clinicalResource/inspectionReport',
    '//henry-app.jp/clinicalResource/specimenInspectionOrder'
  ];

  // バイタルデータキャッシュ（グラフ表示用）
  let cachedVitalsByDate = new Map();

  // 血糖データキャッシュ（グラフ表示用）
  let cachedBloodSugarByDate = new Map();

  // 尿量データキャッシュ（グラフ表示用）
  let cachedUrineByDate = new Map();

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
  function parseEditorData(editorDataStr, options = {}) {
    try {
      const data = JSON.parse(editorDataStr);
      const lines = [];

      for (const block of data.blocks) {
        const text = block.text;
        if (!text || !text.trim()) continue;

        // リハビリ記録用: 未チェック項目をフィルタリング
        // ブロックのdata.checkboxListItem.checkedが'unchecked'の場合はスキップ
        if (options.filterUnchecked && block.data?.checkboxListItem?.checked === 'unchecked') {
          continue;
        }

        lines.push(text);
      }

      return lines.join('\n');
    } catch (e) {
      return '';
    }
  }

  // editorDataから画像URLを抽出
  function extractImagesFromEditorData(editorDataStr) {
    try {
      const data = JSON.parse(editorDataStr);
      const images = [];
      for (const block of data.blocks) {
        if (block.type === 'atomic' && block.data?.fileBlock) {
          const fb = block.data.fileBlock;
          if (fb.fileType === 'FILE_TYPE_IMAGE' && fb.redirectUrl) {
            images.push({
              url: fb.redirectUrl,
              mimeType: fb.mimeType,
              width: fb.imageWidth || 0,
              height: fb.imageHeight || 0
            });
          }
        }
      }
      return images;
    } catch (e) {
      return [];
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

  // 薬剤部記録テキストから薬剤名を抽出してリンク化
  function formatPharmacyText(text) {
    const lines = text.split('\n');
    const result = [];
    const linkStyle = 'color: #1976d2; text-decoration: none;';

    // 薬剤名部分をリンク化（「薬剤名　数量」から薬剤名を抽出）
    function linkifyDrug(drugText) {
      // 全角スペースで区切って最初の部分を薬剤名とみなす
      const parts = drugText.split(/[\u3000]+/);
      if (parts.length === 0) return escapeHtml(drugText);

      const drugName = parts[0].trim();
      if (!drugName) return escapeHtml(drugText);

      const rest = parts.slice(1).join('　');
      const link = `<a href="https://www.google.com/search?q=${encodeURIComponent(drugName)}" target="_blank" style="${linkStyle}">${escapeHtml(drugName)}</a>`;
      return rest ? link + '　' + escapeHtml(rest) : link;
    }

    for (const line of lines) {
      // パターン1: 「・薬剤名：」または「①・薬剤名：」で始まる行
      const drugLineMatch = line.match(/^([①-⑳]?・薬剤名[：:])\s*(.+)/);
      if (drugLineMatch) {
        const prefix = drugLineMatch[1];
        const drugsText = drugLineMatch[2];
        result.push(escapeHtml(prefix) + linkifyDrug(drugsText));
        continue;
      }

      // パターン2: インデント行（全角スペース×4以上で始まる）= 継続薬剤名
      const indentMatch = line.match(/^([\u3000]{4,})(.+)/);
      if (indentMatch) {
        const indent = indentMatch[1];
        const drugsText = indentMatch[2];
        result.push(indent + linkifyDrug(drugsText));
        continue;
      }

      // その他の行はそのまま
      result.push(escapeHtml(line));
    }

    return result.join('<br>');
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
        text: parseEditorData(profileDoc.editorData, { filterUnchecked: true }),
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
        // リハビリ記録は未チェック項目をフィルタリング
        const text = parseEditorData(doc.editorData, { filterUnchecked: true });
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

  // NOTE: Persisted Query (APQ) は廃止。
  // サーバーキャッシュが切れると PersistedQueryNotFound エラーが発生するため、
  // インライン方式のフルクエリを使用する。

  // 入院中・入院予定の全患者を取得
  // 7日後の日付で検索することで、入院予定患者（WILL_ADMIT）も含めて取得
  async function fetchAllHospitalizedPatients() {
    try {
      const today = new Date();
      // 7日後の日付で検索（入院予定患者も含めて取得するため）
      const searchDate = new Date(today);
      searchDate.setDate(searchDate.getDate() + 7);

      // フルクエリ + インライン形式（変数形式は型定義がスキーマに存在しないためエラー）
      // NOTE: このクエリは /graphql でのみ利用可能（/graphql-v2 では未定義）
      const query = `
        query ListDailyWardHospitalizations {
          listDailyWardHospitalizations(input: {
            wardIds: [],
            searchDate: { year: ${searchDate.getFullYear()}, month: ${searchDate.getMonth() + 1}, day: ${searchDate.getDate()} },
            roomIds: [],
            searchText: ""
          }) {
            dailyWardHospitalizations {
              wardId
              roomHospitalizationDistributions {
                roomId
                hospitalizations {
                  uuid
                  state
                  departmentTransferType
                  startDate { year month day }
                  endDate { year month day }
                  patient {
                    uuid
                    serialNumber
                    serialNumberPrefix
                    fullName
                    fullNamePhonetic
                    isDraft
                    isTestPatient
                    detail {
                      patientUuid
                      addressLine_1
                      addressLine_2
                      postalCode
                      email
                      phoneNumber
                      sexType
                      birthDate { year month day }
                      memo
                    }
                    tags
                    attentionSummary {
                      hasAnyInfection
                      hasAnyAllergy
                    }
                  }
                  hospitalizationDoctor {
                    doctor {
                      uuid
                      name
                      namePhonetic { value }
                    }
                  }
                  hospitalizationDayCount { value }
                  lastHospitalizationLocationUuid
                  statusHospitalizationLocation {
                    uuid
                    hospitalizationUuid
                    wardUuid { value }
                    roomUuid { value }
                    transferDate { year month day }
                    transferTime { hours minutes seconds }
                    ward {
                      uuid
                      name
                      nameKana
                      receiptWardType
                      wardCode { value }
                      isCommunityBasedCare
                      isKanwaCare
                      isKaigoIryouin
                      bedType
                      ff1WardType
                    }
                    room {
                      uuid
                      wardUuid
                      name
                      isCommunityBasedCare
                    }
                    eventType
                    hasCompleted
                    isCommunityBasedCareCalculationEnabled
                    isKanwaCareCalculationEnabled
                  }
                }
              }
            }
          }
        }
      `;

      // NOTE: このクエリは /graphql でのみ利用可能（/graphql-v2 では未定義）
      const result = await window.HenryCore.query(query, {}, { endpoint: '/graphql' });

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
  // maxDays: 取得する最大日数（デフォルト180日）
  async function fetchCalendarData(patientUuid, hospitalizationStartDate, maxDays = 180) {
    try {
      const today = new Date();
      const startDate = new Date(hospitalizationStartDate);
      // 入院開始日から今日までの日数を計算
      const diffDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
      const beforeDateSize = Math.min(diffDays + 1, maxDays);

      // インライン方式（変数型がスキーマに存在しないためフルクエリではインライン必須）
      const resourcesStr = CALENDAR_RESOURCES.map(r => `"${r}"`).join(', ');

      const query = `
        query GetClinicalCalendarView {
          getClinicalCalendarView(input: {
            patientUuid: "${patientUuid}",
            baseDate: { year: ${today.getFullYear()}, month: ${today.getMonth() + 1}, day: ${today.getDate()} },
            beforeDateSize: ${beforeDateSize},
            afterDateSize: 0,
            clinicalResourceHrns: [${resourcesStr}],
            createUserUuids: [],
            accountingOrderShinryoShikibetsus: []
          }) {
            vitalSigns {
              recordTime { seconds }
              createUser { name }
              temperature { value }
              pulseRate { value }
              bloodPressureUpperBound { value }
              bloodPressureLowerBound { value }
              spo2 { value }
              respiration { value }
            }
            clinicalQuantitativeDataModuleCollections {
              cqdDefHrn
              clinicalQuantitativeDataModules {
                title
                recordDateRange {
                  start { year month day }
                }
                entries {
                  name
                  value
                  unit { value }
                }
              }
            }
            prescriptionOrders {
              uuid
              createTime { seconds }
              orderStatus
              doctor { name }
              rps {
                boundsDurationDays { value }
                medicationTiming {
                  medicationTiming {
                    canonicalPrescriptionUsage {
                      text
                      timings { text }
                    }
                  }
                }
                instructions {
                  instruction {
                    medicationDosageInstruction {
                      localMedicine { name }
                      mhlwMedicine { name }
                      quantity {
                        doseQuantity { value }
                        doseQuantityPerDay { value }
                      }
                    }
                  }
                }
              }
            }
            injectionOrders {
              uuid
              createTime { seconds }
              orderStatus
              doctor { name }
              rps {
                boundsDurationDays { value }
                localInjectionTechnique { name }
                instructions {
                  instruction {
                    medicationDosageInstruction {
                      localMedicine { name }
                      mhlwMedicine { name }
                      quantity {
                        doseQuantity { value }
                        doseQuantityPerDay { value }
                      }
                    }
                  }
                }
              }
            }
            nutritionOrders {
              uuid
              createTime { seconds }
              orderStatus
              isDraft
              startDate { year month day }
              endDate { year month day }
              detail {
                dietaryRegimen { name }
                supplies {
                  food { name }
                }
              }
            }
            outsideInspectionReportGroups {
              name
              outsideInspectionReportRows {
                name
                standardValue { value }
                outsideInspectionReports {
                  date { year month day }
                  value
                  isAbnormal
                  abnormalityType
                }
              }
            }
          }
        }
      `;

      // NOTE: このクエリは /graphql でのみ利用可能
      const result = await window.HenryCore.query(query, {}, { endpoint: '/graphql' });
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
            oxygen: key ? (oxygenData.get(key) || []) : [] // 同日の酸素データを付与（配列形式）
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
            const name = med?.localMedicine?.name || med?.mhlwMedicine?.name || '不明';
            // 投与量を取得（Frac100000形式: 100000 = 1）
            const dosePerDay = med?.quantity?.doseQuantityPerDay?.value;
            const dose = med?.quantity?.doseQuantity?.value;
            const doseValue = dose || dosePerDay;
            if (doseValue) {
              const doseNum = parseInt(doseValue, 10) / 100000;
              return `${name} ${doseNum}`;
            }
            return name;
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

      // 尿量データ
      const urineItems = extractUrineData(data?.clinicalQuantitativeDataModuleCollections || []);

      // 血糖・インスリンデータ
      const bloodSugarItems = extractBloodSugarInsulinData(data?.clinicalQuantitativeDataModuleCollections || []);

      // 血液検査データ
      // 外部検査（四国中検）: outsideInspectionReportGroups
      // 院内検査: clinicalQuantitativeDataModuleCollections から抽出
      const outsideInspectionReportGroups = data?.outsideInspectionReportGroups || [];
      const inHouseBloodTests = extractInHouseBloodTests(data?.clinicalQuantitativeDataModuleCollections || []);

      return {
        timelineItems: [...vitalSigns, ...prescriptionItems, ...injectionItems, ...mealIntakeItems, ...urineItems, ...bloodSugarItems],
        activePrescriptions: prescriptionOrdersRaw.filter(rx => rx.orderStatus === 'ORDER_STATUS_ACTIVE'),
        activeInjections: injectionOrdersRaw.filter(inj =>
          inj.orderStatus !== 'ORDER_STATUS_CANCELLED'
        ),
        outsideInspectionReportGroups,
        inHouseBloodTests
      };

    } catch (e) {
      console.error(`[${SCRIPT_NAME}] カレンダーデータ取得エラー:`, e);
      return [];
    }
  }

  // 酸素投与データを抽出
  // clinicalQuantitativeDataModuleCollections から酸素投与量・投与方法を抽出
  // 日付ごとにグループ化し、時刻順の配列として返す（日内変化を追跡）
  function extractOxygenData(moduleCollections) {
    const byDate = new Map();

    for (const collection of moduleCollections) {
      const modules = collection?.clinicalQuantitativeDataModules || [];
      for (const mod of modules) {
        const dateRange = mod.recordDateRange;
        if (!dateRange?.start) continue;

        const { year, month, day, hour, minute } = dateRange.start;
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const time = (hour ?? 0) * 60 + (minute ?? 0);  // 分単位のソート用

        if (!byDate.has(key)) {
          byDate.set(key, []);
        }

        let flow = null, method = null;
        const entries = mod.entries || [];
        for (const entry of entries) {
          const name = entry.name || '';
          if (name.includes('酸素投与量')) {
            flow = entry.value;
          } else if (name.includes('酸素投与方法')) {
            method = entry.value;
          }
        }

        if (flow !== null) {
          byDate.get(key).push({ time, flow, method });
        }
      }
    }

    // 各日付内で時刻順にソートし、連続する同一値を除去（変化のみ残す）
    for (const [key, entries] of byDate) {
      entries.sort((a, b) => a.time - b.time);
      const deduped = entries.filter((e, i) =>
        i === 0 || e.flow !== entries[i-1].flow || e.method !== entries[i-1].method
      );
      byDate.set(key, deduped);
    }

    return byDate; // Map<dateKey, Array<{ time, flow, method }>>
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

    // 各日付のデータをタイムラインアイテムに変換
    const result = [];
    for (const [key, dayData] of byDate) {
      // その日の栄養オーダー情報を取得
      const nutritionInfo = getNutritionInfoForDate(dayData.date, nutritionOrders);
      const dietType = nutritionInfo?.name;
      const supplies = nutritionInfo?.supplies || [];

      const mealText = formatMealIntake(dayData.entries);
      const suppliesText = formatNutritionSupplies(supplies, dietType);

      // テキスト生成
      // - 絶食の場合: 【絶食】（suppliesは表示しない）
      // - 食事摂取量がある場合: 【食種】 朝10/10 昼8/8 夕10/10
      // - 経管食等で摂取量がない場合: 【経管食】毎食: YH Fast 1個, 白湯 200ml
      // - 摂取量のみ（食種情報なし）の場合: 朝10/10 昼8/8
      // - 何もない場合: スキップ
      let text;
      if (dietType === '絶食') {
        // 絶食オーダー
        text = '【絶食】';
      } else if (dietType && mealText) {
        // 通常食で摂取量がある場合
        text = `【${dietType}】${mealText}`;
      } else if (dietType && suppliesText) {
        // 経管食等で摂取量がない場合、suppliesを表示
        text = `【${dietType}】${suppliesText}`;
      } else if (dietType) {
        // 食種のみ
        text = `【${dietType}】`;
      } else if (mealText) {
        // 摂取量のみ（食種情報なし）
        text = mealText;
      } else {
        // 栄養オーダーも摂取量記録もない日はスキップ
        continue;
      }

      result.push({
        id: `meal-${key}`,
        category: 'meal',
        date: dayData.date,
        title: '食事摂取',
        text: text,
        author: ''
      });
    }

    return result;
  }

  // 尿量データを抽出
  // clinicalQuantitativeDataModuleCollections から「合計尿量」を抽出
  // 日付ごとにグループ化し、タイムラインアイテムに変換
  function extractUrineData(moduleCollections) {
    const result = [];
    const byDate = new Map();

    for (const collection of moduleCollections) {
      const modules = collection?.clinicalQuantitativeDataModules || [];
      for (const mod of modules) {
        const dateRange = mod.recordDateRange;
        if (!dateRange?.start) continue;

        const { year, month, day } = dateRange.start;
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const entries = mod.entries || [];
        for (const entry of entries) {
          if ((entry.name || '').includes('合計尿量')) {
            const value = entry.value != null ? parseInt(entry.value, 10) : null;
            if (value != null && !byDate.has(key)) {
              byDate.set(key, {
                date: new Date(year, month - 1, day),
                totalUrine: value
              });
            }
          }
        }
      }
    }

    // グラフ用キャッシュに保存
    for (const [key, data] of byDate) {
      cachedUrineByDate.set(key, data);
    }

    for (const [key, data] of byDate) {
      result.push({
        id: `urine-${key}`,
        category: 'urine',
        date: data.date,
        title: '排泄',
        text: `【尿量】${data.totalUrine}mL`,
        author: ''
      });
    }
    return result;
  }

  // 血糖・インスリンデータを抽出
  // clinicalQuantitativeDataModuleCollections から血糖値、インスリン薬剤名、単位を抽出
  // 日付ごとにグループ化し、タイムラインアイテムに変換
  function extractBloodSugarInsulinData(moduleCollections) {
    // 血糖・インスリン関連の項目名パターン
    const bloodSugarPatterns = ['血糖値(朝)', '血糖値(昼)', '血糖値(夕)'];
    const insulinDrugPattern = '薬剤名';
    const insulinUnitPatterns = ['単位(朝)', '単位(昼)', '単位(夕)'];

    // 日付ごとにデータをグループ化
    const byDate = new Map();

    for (const collection of moduleCollections) {
      const modules = collection?.clinicalQuantitativeDataModules || [];
      for (const mod of modules) {
        const dateRange = mod.recordDateRange;
        if (!dateRange?.start) continue;

        const { year, month, day } = dateRange.start;
        const date = new Date(year, month - 1, day);
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (!byDate.has(key)) {
          byDate.set(key, {
            date: date,
            bloodSugar: { morning: null, noon: null, evening: null },
            insulinDrug: null,
            insulinUnit: { morning: null, noon: null, evening: null }
          });
        }

        const dayData = byDate.get(key);
        const entries = mod.entries || [];

        for (const entry of entries) {
          const name = entry.name || '';
          const value = entry.value;

          // 血糖値
          if (name.includes('血糖値(朝)') && value != null) {
            dayData.bloodSugar.morning = parseInt(value, 10);
          } else if (name.includes('血糖値(昼)') && value != null) {
            dayData.bloodSugar.noon = parseInt(value, 10);
          } else if (name.includes('血糖値(夕)') && value != null) {
            dayData.bloodSugar.evening = parseInt(value, 10);
          }

          // インスリン薬剤名
          if (name.includes('薬剤名') && value) {
            dayData.insulinDrug = value;
          }

          // インスリン単位
          if (name.includes('単位(朝)') && value != null) {
            dayData.insulinUnit.morning = parseFloat(value);
          } else if (name.includes('単位(昼)') && value != null) {
            dayData.insulinUnit.noon = parseFloat(value);
          } else if (name.includes('単位(夕)') && value != null) {
            dayData.insulinUnit.evening = parseFloat(value);
          }
        }
      }
    }

    // グラフ用キャッシュに保存（血糖値があるデータのみ）
    for (const [key, data] of byDate) {
      const hasBloodSugar = data.bloodSugar.morning != null ||
                           data.bloodSugar.noon != null ||
                           data.bloodSugar.evening != null;
      if (hasBloodSugar) {
        cachedBloodSugarByDate.set(key, data);
      }
    }

    // タイムラインアイテムに変換
    const result = [];
    for (const [key, data] of byDate) {
      // 血糖値が1つでもあればカードを表示
      const hasBloodSugar = data.bloodSugar.morning != null ||
                           data.bloodSugar.noon != null ||
                           data.bloodSugar.evening != null;
      if (!hasBloodSugar) continue;

      // テキスト生成（1行形式: 血糖値の後ろにインスリン情報を括弧で追加）
      // 例: 【血糖値】朝100　昼200(トレシーバ6U)　夕90
      const bsParts = [];
      const drug = data.insulinDrug || '';

      if (data.bloodSugar.morning != null) {
        let part = `朝${data.bloodSugar.morning}`;
        if (drug && data.insulinUnit.morning != null) {
          part += `(${drug}${data.insulinUnit.morning}U)`;
        }
        bsParts.push(part);
      }
      if (data.bloodSugar.noon != null) {
        let part = `昼${data.bloodSugar.noon}`;
        if (drug && data.insulinUnit.noon != null) {
          part += `(${drug}${data.insulinUnit.noon}U)`;
        }
        bsParts.push(part);
      }
      if (data.bloodSugar.evening != null) {
        let part = `夕${data.bloodSugar.evening}`;
        if (drug && data.insulinUnit.evening != null) {
          part += `(${drug}${data.insulinUnit.evening}U)`;
        }
        bsParts.push(part);
      }

      const text = `【血糖値】${bsParts.join('　')}`; // 全角スペース区切り

      result.push({
        id: `bloodSugar-${key}`,
        category: 'bloodSugar',
        date: data.date,
        title: '血糖',
        text: text,
        author: ''
      });
    }

    return result;
  }

  // 栄養オーダーから食種情報を抽出
  function extractNutritionInfo(order) {
    // 食種名: dietaryRegimen.name がない場合は supplies[0].food.name を使用
    // 例: 絶食オーダーでは dietaryRegimen が null だが supplies[0].food.name に「絶食」が入っている
    const dietName = order.detail?.dietaryRegimen?.name
      || order.detail?.supplies?.[0]?.food?.name
      || null;
    return {
      name: dietName,
      supplies: order.detail?.supplies || []
    };
  }

  // 指定日に有効な栄養オーダー情報を取得
  // 範囲内のオーダーがなければ、直近の過去オーダーを返す
  // 戻り値: { name: 食種名, supplies: 経管食等の詳細配列 } or null
  function getNutritionInfoForDate(date, nutritionOrders) {
    let latestPastOrder = null;
    let latestPastEndDate = null;

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
        return extractNutritionInfo(order);
      }

      // 指定日より前に終了したオーダーを記録（最新のものを保持）
      if (endDate < date) {
        if (!latestPastEndDate || endDate > latestPastEndDate) {
          latestPastEndDate = endDate;
          latestPastOrder = order;
        }
      }
    }

    // 範囲内のオーダーがなければ、直近の過去オーダーを返す
    return latestPastOrder ? extractNutritionInfo(latestPastOrder) : null;
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

      // 体温（ハイライト処理含む）- 基準: 36-37℃
      let tempCell = '-';
      if (vs.rawData?.temperature?.value) {
        const temp = vs.rawData.temperature.value / 10;
        if (temp >= 37) {
          tempCell = `<span class="vital-high">${temp}</span>`;
        } else if (temp < 36) {
          tempCell = `<span class="vital-low">${temp}</span>`;
        } else {
          tempCell = String(temp);
        }
      }

      // 血圧（ハイライト処理含む）- 基準: 上90-140, 下60-90
      let bpCell = '-';
      if (vs.rawData?.bloodPressureUpperBound?.value && vs.rawData?.bloodPressureLowerBound?.value) {
        const upper = vs.rawData.bloodPressureUpperBound.value / 10;
        const lower = vs.rawData.bloodPressureLowerBound.value / 10;
        const upperHigh = upper > 140;
        const upperLow = upper < 90;
        const lowerHigh = lower > 90;
        const lowerLow = lower < 60;
        // 上と下を個別にハイライト
        const upperStr = upperHigh ? `<span class="vital-high">${upper}</span>`
          : upperLow ? `<span class="vital-low">${upper}</span>`
          : String(upper);
        const lowerStr = lowerHigh ? `<span class="vital-high">${lower}</span>`
          : lowerLow ? `<span class="vital-low">${lower}</span>`
          : String(lower);
        bpCell = `${upperStr}/${lowerStr}`;
      }

      // 脈拍（ハイライト処理含む）- 基準: 60-100
      let pulseCell = '-';
      if (vs.rawData?.pulseRate?.value) {
        const pulse = vs.rawData.pulseRate.value / 10;
        if (pulse > 100) {
          pulseCell = `<span class="vital-high">${pulse}</span>`;
        } else if (pulse < 60) {
          pulseCell = `<span class="vital-low">${pulse}</span>`;
        } else {
          pulseCell = String(pulse);
        }
      }

      // SpO2
      const spo2Cell = vs.rawData?.spo2?.value
        ? String(vs.rawData.spo2.value / 10)
        : '-';

      html += `<tr><td>${time}</td><td>${tempCell}</td><td>${bpCell}</td><td>${pulseCell}</td><td>${spo2Cell}</td></tr>`;
    }

    html += '</tbody>';

    // 酸素投与はtfootに表示（日内変化がある場合は「→」で連結）
    const oxygenEntries = sorted[0]?.oxygen || [];
    if (oxygenEntries.length > 0) {
      const o2Text = oxygenEntries.map(o => {
        return o.method ? `${o.flow}L（${o.method}）` : `${o.flow}L`;
      }).join('→');
      html += `<tfoot><tr><td colspan="5" style="text-align:right;padding:4px 0;"><span style="background:#e3f2fd;font-weight:bold;padding:2px 8px;border-radius:4px;">O2: ${o2Text}</span></td></tr></tfoot>`;
    }

    html += '</table>';
    return html;
  }

  // 注射オーダーをテキストに整形
  function formatInjectionOrder(inj) {
    const status = formatOrderStatus(inj.orderStatus);
    const rps = inj.rps || [];

    const lines = [];
    for (const rp of rps) {
      const medicines = (rp.instructions || []).map(inst => {
        const med = inst.instruction?.medicationDosageInstruction;
        const rawName = med?.localMedicine?.name || med?.mhlwMedicine?.name || null;
        if (!rawName) return null;
        const name = cleanMedicineName(rawName);
        // 投与量を取得（Frac100000形式: 100000 = 1）
        const dosePerDay = med?.quantity?.doseQuantityPerDay?.value;
        const dose = med?.quantity?.doseQuantity?.value;
        const doseValue = dose || dosePerDay;
        if (doseValue) {
          const doseNum = parseInt(doseValue, 10) / 100000;
          return `${name} ${doseNum}`;
        }
        return name;
      }).filter(Boolean);

      const technique = (rp.localInjectionTechnique?.name || '').replace(/，/g, ',');

      if (medicines.length > 0) {
        const medText = medicines.join(', ');
        lines.push(technique ? `${technique}: ${medText}` : medText);
      }
    }

    if (lines.length === 0) {
      return `ステータス: ${status}`;
    }

    return `${lines.join(' / ')}（${status}）`;
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

  // 院内血液検査データを抽出（clinicalQuantitativeDataModuleCollections から）
  // 返り値: { modules: [{ dateKey, entries: [{name, value}] }] }[]
  function extractInHouseBloodTests(moduleCollections) {
    // 院内末梢血液一般のUUID（マオカ病院専用）
    const INHOUSE_BLOOD_TEST_UUID = '614e72ad-78ed-4aba-98a9-25d87efcf846';

    const result = [];
    for (const collection of moduleCollections) {
      // APIレスポンスでは cqdDefHrn にHRN形式でUUIDが含まれる
      // 例: //henry-app.jp/clinicalQuantitativeDataDef/custom/614e72ad-78ed-4aba-98a9-25d87efcf846
      const hrn = collection?.cqdDefHrn || '';
      if (!hrn.includes(INHOUSE_BLOOD_TEST_UUID)) continue;

      // カテゴリ名は各モジュールの title から取得（APIレスポンスの構造が変わっている）
      const modules = (collection?.clinicalQuantitativeDataModules || []).map(mod => {
        const dateRange = mod.recordDateRange?.start;
        const dateKey = dateRange
          ? `${dateRange.year}-${String(dateRange.month).padStart(2, '0')}-${String(dateRange.day).padStart(2, '0')}`
          : null;
        const entries = (mod.entries || []).map(e => ({
          name: e.name,
          value: e.value,
          unit: e.unit?.value || ''
        }));
        return { dateKey, entries, title: mod.title };
      }).filter(m => m.dateKey);

      result.push({ modules });
    }
    return result;
  }

  // 基準値文字列をパースして下限・上限を抽出
  // 例: "10-20", "10～20" → { low: 10, high: 20 }
  // 例: "0.30以下", "≦0.30" → { low: null, high: 0.30 }
  // 例: "10以上", "≧10" → { low: 10, high: null }
  function parseReferenceValue(refValue) {
    if (!refValue) return null;

    // 範囲形式: "10-20", "10～20", "10~20"
    const rangeMatch = refValue.match(/([0-9.]+)\s*[-～~]\s*([0-9.]+)/);
    if (rangeMatch) {
      return { low: parseFloat(rangeMatch[1]), high: parseFloat(rangeMatch[2]) };
    }

    // 上限のみ: "0.30以下", "≦0.30", "<=0.30"
    const upperMatch = refValue.match(/([0-9.]+)\s*以下/) || refValue.match(/[≦<=]\s*([0-9.]+)/);
    if (upperMatch) {
      return { low: null, high: parseFloat(upperMatch[1]) };
    }

    // 下限のみ: "10以上", "≧10", ">=10"
    const lowerMatch = refValue.match(/([0-9.]+)\s*以上/) || refValue.match(/[≧>=]\s*([0-9.]+)/);
    if (lowerMatch) {
      return { low: parseFloat(lowerMatch[1]), high: null };
    }

    return null;
  }

  // 値と基準値を比較してL/H判定
  function judgeAbnormality(value, refValue) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return { isAbnormal: false, type: 'NORMAL' };
    const range = parseReferenceValue(refValue);
    if (!range) return { isAbnormal: false, type: 'NORMAL' };
    // 下限チェック（lowがnullでない場合のみ）
    if (range.low !== null && numValue < range.low) return { isAbnormal: true, type: 'LOW' };
    // 上限チェック（highがnullでない場合のみ）
    if (range.high !== null && numValue > range.high) return { isAbnormal: true, type: 'HIGH' };
    return { isAbnormal: false, type: 'NORMAL' };
  }

  // 血液検査データを抽出・整形
  // outsideInspectionReportGroups（外部検査）+ inHouseBloodTests（院内検査）から結果を抽出
  // 日付別→カテゴリ別のネスト構造で返す
  function extractBloodTestResults(outsideInspectionReportGroups, inHouseBloodTests) {
    // 日付別 → カテゴリ別 → 検査項目リスト
    const byDate = new Map();

    // 外注検査の項目名→基準値マップ（院内検査のL/H判定に使用）
    const referenceValueMap = new Map();

    // 院内検査専用項目のデフォルト基準値（外注検査に対応項目がない場合のみ使用）
    referenceValueMap.set('白血球数', '33-86');
    referenceValueMap.set('赤血球数', '380-570');
    referenceValueMap.set('Hb', '11.5-17.5');
    referenceValueMap.set('Ht', '34.8-52.4');
    referenceValueMap.set('MCV', '83-101');
    referenceValueMap.set('MCH', '28-34');
    referenceValueMap.set('MCHC', '31.6-36.6');
    referenceValueMap.set('血小板数', '15.0-35.0');
    referenceValueMap.set('リンパ球', '20-50');
    referenceValueMap.set('単球', '2-10');
    referenceValueMap.set('顆粒球', '40-74');

    // 外部検査データ（四国中検など）を処理
    for (const group of outsideInspectionReportGroups) {
      const categoryName = group.name || '未分類';
      const rows = group.outsideInspectionReportRows || [];

      for (const row of rows) {
        const itemName = row.name || '不明';
        // 「末梢血液一般」は検査項目ではなくカテゴリ名なのでスキップ
        if (itemName === '末梢血液一般') continue;
        const referenceValue = row.standardValue?.value || '';
        const reports = row.outsideInspectionReports || [];

        // 基準値を収集（院内検査のL/H判定で使用）
        if (referenceValue) {
          referenceValueMap.set(itemName, referenceValue);
        }

        for (const report of reports) {
          if (!report.date) continue;

          const { year, month, day } = report.date;
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          if (!byDate.has(dateKey)) {
            byDate.set(dateKey, new Map());
          }
          const categoryMap = byDate.get(dateKey);

          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
          }

          // 値から単位を分離（"88​10*2/MCL​" → "88", "10*2/MCL"）
          const rawValue = report.value || '-';
          // ゼロ幅スペースで分割して値と単位を取得
          const valueParts = rawValue.split(/[\u200B\u200C\u200D\uFEFF]+/).filter(Boolean);
          const value = valueParts[0] || rawValue;

          categoryMap.get(categoryName).push({
            name: itemName,
            value: value,
            isAbnormal: report.isAbnormal || false,
            abnormalityType: report.abnormalityType || 'NORMAL',
            referenceValue: referenceValue
          });
        }
      }
    }

    // 院内検査項目 → 外注検査への統合マッピング
    // { 統合先項目名, 統合先カテゴリ }
    const INHOUSE_TO_OUTSIDE_MAP = {
      'WBC': { name: '白血球数', category: '血液学的検査' },
      'RBC': { name: '赤血球数', category: '血液学的検査' },
      'HGB': { name: 'Hb', category: '血液学的検査' },
      'HCT': { name: 'Ht', category: '血液学的検査' },
      'MCV': { name: 'MCV', category: '血液学的検査' },
      'MCH': { name: 'MCH', category: '血液学的検査' },
      'MCHC': { name: 'MCHC', category: '血液学的検査' },
      'PLT': { name: '血小板数', category: '血液学的検査' },
      'LY': { name: 'リンパ球', category: '血液学的検査' },
      'MO': { name: '単球', category: '血液学的検査' },
      'GR': { name: '顆粒球', category: '血液学的検査' },
      'CRP': { name: 'CRP', category: '免疫学的検査' }
    };

    // 院内検査データを処理（外注検査のカテゴリ・項目名に統合）
    for (const inHouse of inHouseBloodTests) {
      for (const mod of inHouse.modules) {
        const dateKey = mod.dateKey;
        if (!dateKey) continue;

        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, new Map());
        }
        const categoryMap = byDate.get(dateKey);

        for (const entry of mod.entries) {
          // マッピングから統合先を取得
          const mapping = INHOUSE_TO_OUTSIDE_MAP[entry.name];
          if (!mapping) continue; // マッピングにない項目はスキップ

          const categoryName = mapping.category;
          const itemName = mapping.name;

          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
          }

          // 外注検査の基準値を参照してL/H判定
          const refValue = referenceValueMap.get(itemName) || '';
          const { isAbnormal, type } = judgeAbnormality(entry.value, refValue);

          categoryMap.get(categoryName).push({
            name: itemName,
            value: entry.value,
            isAbnormal: isAbnormal,
            abnormalityType: type,
            referenceValue: refValue
          });
        }
      }
    }

    // 日付の新しい順にソート
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(dateKey => ({
      dateKey,
      categories: byDate.get(dateKey)
    }));
  }

  // 血液検査データをピボット形式（横軸日付）に変換
  // 入力: extractBloodTestResults()の戻り値
  // 出力: { dates: string[], categories: { name, items: { name, referenceValue, values: Map<dateKey, {value, isAbnormal, abnormalityType}> }[] }[] }
  function pivotBloodTestData(bloodTestResults) {
    // 全日付を抽出（古い順）
    const allDates = bloodTestResults.map(r => r.dateKey).sort((a, b) => a.localeCompare(b));

    // カテゴリ別・項目別にデータを集約
    // categoryName → itemName → { referenceValue, values: Map<dateKey, {value, isAbnormal, abnormalityType}> }
    const categoryMap = new Map();

    for (const { dateKey, categories } of bloodTestResults) {
      for (const [categoryName, items] of categories) {
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, new Map());
        }
        const itemMap = categoryMap.get(categoryName);

        for (const item of items) {
          if (!itemMap.has(item.name)) {
            itemMap.set(item.name, {
              referenceValue: item.referenceValue || '',
              values: new Map()
            });
          }
          const itemData = itemMap.get(item.name);
          // 基準値が空で新しい値がある場合は更新
          if (!itemData.referenceValue && item.referenceValue) {
            itemData.referenceValue = item.referenceValue;
          }
          itemData.values.set(dateKey, {
            value: item.value,
            isAbnormal: item.isAbnormal,
            abnormalityType: item.abnormalityType
          });
        }
      }
    }

    // ピボット形式に変換
    const categories = [];
    for (const [categoryName, itemMap] of categoryMap) {
      const items = [];
      for (const [itemName, itemData] of itemMap) {
        items.push({
          name: itemName,
          referenceValue: itemData.referenceValue,
          values: itemData.values
        });
      }
      categories.push({ name: categoryName, items });
    }

    return { dates: allDates, categories };
  }

  // 褥瘡評価データを取得
  async function fetchPressureUlcerRecords(patientUuid) {
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
              clinicalDocumentCustomTypeUuid: { value: PRESSURE_ULCER_CUSTOM_TYPE_UUID }
            }]
          }
        });

        const data = result?.data?.listClinicalDocuments;
        const documents = data?.documents || [];

        for (const doc of documents) {
          const parsed = parsePressureUlcerEditorData(doc.editorData);
          if (parsed) {
            allDocuments.push({
              uuid: doc.uuid,
              date: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
              author: doc.creator?.name || '不明',
              ...parsed
            });
          }
        }

        pageToken = data?.nextPageToken || '';
      } while (pageToken);

      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 褥瘡評価取得エラー:`, e);
      return [];
    }
  }

  // 褥瘡評価editorDataをパース
  // Draft.js形式のJSONから部位・合計点・各DESIGN-R項目を抽出
  function parsePressureUlcerEditorData(editorDataStr) {
    try {
      const data = JSON.parse(editorDataStr);
      const blocks = data.blocks || [];

      let site = '';        // 部位
      let totalScore = '';  // 合計点
      const designR = {     // DESIGN-R各項目
        D: null,  // 深さ
        E: null,  // 滲出液
        S: null,  // 大きさ
        I: null,  // 炎症/感染
        G: null,  // 肉芽組織
        N: null,  // 壊死組織
        P: null   // ポケット
      };

      // DESIGN-R項目のパターン
      // チェックボックスがチェックされている項目から値を抽出
      const designRPatterns = {
        D: /^([dD]\d+|[dD][DU]TI?|[dD]U)/i,    // d0-d5, dDTI, dU, DU
        E: /^([eE]\d+)/,       // e0, e1, e3, e6
        S: /^([sS]\d+)/,       // s0, s3, s6, s8, s9, s12, s15
        I: /^([iI]\d+[CcGg]?)/, // i0, i1, i3C, i3, i9
        G: /^([gG]\d+)/,       // g0, g1, g3, g4, g5, g6
        N: /^([nN]\d+)/,       // n0, n3, n6
        P: /^([pP]\d+)/        // p0, p6, p9, p12, p24
      };

      for (const block of blocks) {
        const text = (block.text || '').trim();
        const isCheckbox = block.data?.checkboxListItem;
        const isChecked = isCheckbox?.checked === 'checked';

        // 合計点と部位を抽出（「合計点 : ２８点 部位：仙骨部」形式）
        const totalMatch = text.match(/合計点\s*[:：]\s*[０-９\d]+点?\s*部位\s*[:：]\s*(.+)/);
        if (totalMatch) {
          // 全角数字を半角に変換
          const scoreMatch = text.match(/合計点\s*[:：]\s*([０-９\d]+)/);
          if (scoreMatch) {
            totalScore = scoreMatch[1].replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
          }
          site = totalMatch[1].trim();
          continue;
        }

        // 別形式: 「部位：〇〇」が単独行の場合
        const siteOnlyMatch = text.match(/^部位\s*[:：]\s*(.+)/);
        if (siteOnlyMatch && !site) {
          site = siteOnlyMatch[1].trim();
          continue;
        }

        // チェックされたDESIGN-R項目を抽出
        if (isChecked) {
          for (const [key, pattern] of Object.entries(designRPatterns)) {
            const match = text.trim().match(pattern);
            if (match) {
              designR[key] = match[1];
              break;
            }
          }
        }
      }

      // 合計点が記入されていない場合は計算で求める
      // D（深さ）は合計点に含めない
      if (!totalScore) {
        const scoreItems = ['E', 'S', 'I', 'G', 'N', 'P'];
        let calculatedScore = 0;
        let hasAnyScore = false;

        for (const key of scoreItems) {
          const value = designR[key];
          if (value) {
            // コードから数字部分を抽出（例: e3 → 3, s12 → 12, i3C → 3）
            const numMatch = value.match(/\d+/);
            if (numMatch) {
              calculatedScore += parseInt(numMatch[0], 10);
              hasAnyScore = true;
            }
          }
        }

        if (hasAnyScore) {
          totalScore = String(calculatedScore);
        }
      }

      // 有効なデータがあるかチェック
      const hasData = site || totalScore || Object.values(designR).some(v => v !== null);
      if (!hasData) return null;

      return { site, totalScore, designR };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 褥瘡editorDataパースエラー:`, e);
      return null;
    }
  }

  // 褥瘡評価データをピボット形式（横軸日付）に変換
  // 部位ごとにグループ化し、日付×項目のテーブルを構築
  function pivotPressureUlcerData(records) {
    if (!records || records.length === 0) {
      return { dates: [], sites: [] };
    }

    // 日付を古い順にソート
    const sortedRecords = [...records].sort((a, b) => (a.date || 0) - (b.date || 0));

    // 全日付を抽出
    const allDates = [...new Set(sortedRecords.map(r => r.date ? dateKey(r.date) : null).filter(Boolean))];

    // 部位ごとにグループ化
    // site → { dates: Map<dateKey, { totalScore, designR }> }
    const siteMap = new Map();

    for (const record of sortedRecords) {
      if (!record.date) continue;
      const site = record.site || '部位不明';
      const dKey = dateKey(record.date);

      if (!siteMap.has(site)) {
        siteMap.set(site, new Map());
      }

      siteMap.get(site).set(dKey, {
        totalScore: record.totalScore,
        designR: record.designR
      });
    }

    // ピボット形式に変換
    const sites = [];
    for (const [siteName, dateMap] of siteMap) {
      sites.push({
        name: siteName,
        values: dateMap
      });
    }

    return { dates: allDates, sites };
  }

  // 薬剤部記録を取得
  async function fetchPharmacyRecords(patientUuid) {
    const allRecords = [];
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
              clinicalDocumentCustomTypeUuid: { value: PHARMACY_RECORD_CUSTOM_TYPE_UUID }
            }]
          }
        });

        const data = result?.data?.listClinicalDocuments;
        const documents = data?.documents || [];

        for (const doc of documents) {
          allRecords.push({
            id: doc.uuid,
            date: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
            text: parseEditorData(doc.editorData),
            author: doc.creator?.name || '不明'
          });
        }

        pageToken = data?.nextPageToken || '';
      } while (pageToken);

      // 日付順（古→新）でソート
      allRecords.sort((a, b) => (a.date || 0) - (b.date || 0));
      return allRecords;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 薬剤部記録取得エラー:`, e);
      return [];
    }
  }

  // 検査所見（読影結果等）を取得
  async function fetchInspectionFindings(patientUuid) {
    const allRecords = [];
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
              clinicalDocumentCustomTypeUuid: { value: INSPECTION_FINDINGS_CUSTOM_TYPE_UUID }
            }]
          }
        });

        const data = result?.data?.listClinicalDocuments;
        const documents = data?.documents || [];

        for (const doc of documents) {
          allRecords.push({
            id: doc.uuid,
            date: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
            editorData: doc.editorData, // 生データを保持（画像抽出用）
            text: parseEditorData(doc.editorData),
            author: doc.creator?.name || '不明'
          });
        }

        pageToken = data?.nextPageToken || '';
      } while (pageToken);

      // 日付順（古→新）でソート
      allRecords.sort((a, b) => (a.date || 0) - (b.date || 0));
      return allRecords;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 検査所見取得エラー:`, e);
      return [];
    }
  }

  // ========================================
  // サマリー管理（Google Spreadsheet）
  // ========================================

  const SUMMARY_SPREADSHEET_NAME = 'Henry_患者サマリー';
  let summarySpreadsheetId = null; // スプレッドシートIDキャッシュ
  let summaryCache = null; // 全サマリーキャッシュ { patientUuid: { patientName, summary, summaryUpdatedAt, profile, profileUpdatedAt, rowIndex } }
  let summaryCacheLoading = null; // 読み込み中のPromise（重複防止）

  // Google Sheets API ヘルパー
  async function sheetsApiRequest(endpoint, method = 'GET', body = null) {
    const auth = window.HenryCore?.modules?.GoogleAuth;
    if (!auth) {
      throw new Error('GoogleAuth モジュールが利用できません');
    }

    const accessToken = await auth.getValidAccessToken();
    if (!accessToken) {
      throw new Error('Google認証が必要です');
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sheets API エラー: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // スプレッドシートを検索（My Drive直下）
  async function findSummarySpreadsheet() {
    if (summarySpreadsheetId) return summarySpreadsheetId;

    const auth = window.HenryCore?.modules?.GoogleAuth;
    if (!auth) return null;

    const accessToken = await auth.getValidAccessToken();
    if (!accessToken) return null;

    // Drive APIでファイル検索
    const query = encodeURIComponent(`name='${SUMMARY_SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and 'root' in parents and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      summarySpreadsheetId = data.files[0].id;
      return summarySpreadsheetId;
    }

    return null;
  }

  // スプレッドシートを新規作成
  async function createSummarySpreadsheet() {
    const response = await sheetsApiRequest(
      'https://sheets.googleapis.com/v4/spreadsheets',
      'POST',
      {
        properties: { title: SUMMARY_SPREADSHEET_NAME },
        sheets: [{
          properties: { title: 'サマリー' },
          data: [{
            startRow: 0,
            startColumn: 0,
            rowData: [{
              values: [
                { userEnteredValue: { stringValue: '患者UUID' } },
                { userEnteredValue: { stringValue: '患者名' } },
                { userEnteredValue: { stringValue: 'サマリー' } },
                { userEnteredValue: { stringValue: 'サマリー更新日時' } },
                { userEnteredValue: { stringValue: 'プロフィール' } },
                { userEnteredValue: { stringValue: 'プロフィール更新日時' } }
              ]
            }]
          }]
        }]
      }
    );

    summarySpreadsheetId = response.spreadsheetId;

    // My Drive直下に移動（作成時はMy Driveに入るが念のため）
    console.log(`[${SCRIPT_NAME}] サマリースプレッドシートを作成: ${summarySpreadsheetId}`);

    return summarySpreadsheetId;
  }

  // スプレッドシートIDを取得（なければ作成）
  async function getOrCreateSummarySpreadsheet() {
    let id = await findSummarySpreadsheet();
    if (!id) {
      id = await createSummarySpreadsheet();
    }
    return id;
  }

  // 全サマリーを取得してキャッシュに格納
  async function loadAllSummaries() {
    // 既にロード中なら待つ（重複リクエスト防止）
    if (summaryCacheLoading) {
      return summaryCacheLoading;
    }

    // 既にキャッシュがあれば返す
    if (summaryCache !== null) {
      return summaryCache;
    }

    summaryCacheLoading = (async () => {
      try {
        const spreadsheetId = await findSummarySpreadsheet();
        if (!spreadsheetId) {
          summaryCache = {};
          return summaryCache;
        }

        const response = await sheetsApiRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/サマリー!A:F`
        );

        const rows = response.values || [];
        summaryCache = {};

        // ヘッダーをスキップして全データをキャッシュに格納
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[0]) {
            summaryCache[row[0]] = {
              rowIndex: i + 1, // 1-based（Sheets APIでの行番号）
              patientName: row[1] || '',
              summary: row[2] || '',
              summaryUpdatedAt: row[3] || '',
              profile: row[4] || '',
              profileUpdatedAt: row[5] || ''
            };
          }
        }

        console.log(`[${SCRIPT_NAME}] サマリーキャッシュ完了: ${Object.keys(summaryCache).length}件`);
        return summaryCache;
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] サマリー一括読み込みエラー:`, e);
        summaryCache = {};
        return summaryCache;
      } finally {
        summaryCacheLoading = null;
      }
    })();

    return summaryCacheLoading;
  }

  // 患者のサマリーを取得（キャッシュから）
  async function loadPatientSummary(patientUuid) {
    try {
      const cache = await loadAllSummaries();
      return cache[patientUuid] || null;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] サマリー読み込みエラー:`, e);
      return null;
    }
  }

  // 患者のサマリーを保存
  async function savePatientSummary(patientUuid, patientName, summary) {
    try {
      const spreadsheetId = await getOrCreateSummarySpreadsheet();
      const now = new Date().toISOString();

      // キャッシュを確保
      await loadAllSummaries();

      // 既存データを確認（キャッシュから）
      const existing = summaryCache[patientUuid];

      // 既存のプロフィールデータを維持
      const existingProfile = existing?.profile || '';
      const existingProfileUpdatedAt = existing?.profileUpdatedAt || '';

      let newRowIndex;
      if (existing) {
        // 更新（既存行を上書き）- プロフィールは維持
        await sheetsApiRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/サマリー!A${existing.rowIndex}:F${existing.rowIndex}?valueInputOption=RAW`,
          'PUT',
          {
            values: [[patientUuid, patientName, summary, now, existingProfile, existingProfileUpdatedAt]]
          }
        );
        newRowIndex = existing.rowIndex;
      } else {
        // 新規追加（末尾に追加）
        const appendResponse = await sheetsApiRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/サマリー!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          'POST',
          {
            values: [[patientUuid, patientName, summary, now, '', '']]
          }
        );
        // レスポンスから追加された行番号を取得
        // updatedRange: "サマリー!A5:F5" のような形式
        const range = appendResponse?.updates?.updatedRange || '';
        const match = range.match(/!A(\d+):/);
        newRowIndex = match ? parseInt(match[1], 10) : Object.keys(summaryCache).length + 2;
      }

      // キャッシュを更新
      summaryCache[patientUuid] = {
        rowIndex: newRowIndex,
        patientName,
        summary,
        summaryUpdatedAt: now,
        profile: existingProfile,
        profileUpdatedAt: existingProfileUpdatedAt
      };

      return true;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] サマリー保存エラー:`, e);
      throw e;
    }
  }

  // 患者のプロフィールを保存
  async function savePatientProfile(patientUuid, patientName, profile) {
    try {
      const spreadsheetId = await getOrCreateSummarySpreadsheet();
      const now = new Date().toISOString();

      // キャッシュを確保
      await loadAllSummaries();

      // 既存データを確認（キャッシュから）
      const existing = summaryCache[patientUuid];

      // 既存のサマリーデータを維持
      const existingSummary = existing?.summary || '';
      const existingSummaryUpdatedAt = existing?.summaryUpdatedAt || '';

      let newRowIndex;
      if (existing) {
        // 更新（既存行を上書き）- サマリーは維持
        await sheetsApiRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/サマリー!A${existing.rowIndex}:F${existing.rowIndex}?valueInputOption=RAW`,
          'PUT',
          {
            values: [[patientUuid, patientName, existingSummary, existingSummaryUpdatedAt, profile, now]]
          }
        );
        newRowIndex = existing.rowIndex;
      } else {
        // 新規追加（末尾に追加）
        const appendResponse = await sheetsApiRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/サマリー!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          'POST',
          {
            values: [[patientUuid, patientName, '', '', profile, now]]
          }
        );
        // レスポンスから追加された行番号を取得
        const range = appendResponse?.updates?.updatedRange || '';
        const match = range.match(/!A(\d+):/);
        newRowIndex = match ? parseInt(match[1], 10) : Object.keys(summaryCache).length + 2;
      }

      // キャッシュを更新
      summaryCache[patientUuid] = {
        rowIndex: newRowIndex,
        patientName,
        summary: existingSummary,
        summaryUpdatedAt: existingSummaryUpdatedAt,
        profile,
        profileUpdatedAt: now
      };

      return true;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] プロフィール保存エラー:`, e);
      throw e;
    }
  }

  // 全データ取得
  async function fetchAllData(patientUuid, hospitalizationStartDate) {
    const [doctorRecords, nursingRecords, rehabRecords, calendarData, profile, pressureUlcerRecords, pharmacyRecords, inspectionFindingsRecords] = await Promise.all([
      fetchDoctorRecords(patientUuid),
      fetchNursingRecords(patientUuid),
      fetchRehabRecords(patientUuid, hospitalizationStartDate),
      fetchCalendarData(patientUuid, hospitalizationStartDate),
      fetchPatientProfile(patientUuid),
      fetchPressureUlcerRecords(patientUuid),
      fetchPharmacyRecords(patientUuid),
      fetchInspectionFindings(patientUuid)
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
      outsideInspectionReportGroups: calendarData.outsideInspectionReportGroups || [],
      inHouseBloodTests: calendarData.inHouseBloodTests || [],
      pressureUlcerRecords: pressureUlcerRecords || [],
      pharmacyRecords: pharmacyRecords || [],
      inspectionFindingsRecords: inspectionFindingsRecords || [],
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

  // SVGで血糖値折れ線グラフを描画
  // 純粋関数：外部状態に依存せず、引数のみで動作
  function renderBloodSugarSVG(data, minTime, maxTime, dateKeys, days = 7) {
    const width = 700;
    const chartHeight = 200;
    const margin = { top: 35, right: 50, bottom: 25, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const totalHeight = margin.top + chartHeight + margin.bottom;

    // Y軸スケール: 50〜250 mg/dL
    const yMin = 50, yMax = 250;

    // 基準値帯: 70〜130 mg/dL
    const normalRange = { min: 70, max: 130 };

    const timeRange = maxTime - minTime;
    const xScale = (timestamp) => margin.left + ((timestamp - minTime) / timeRange) * chartWidth;

    const createYScale = (min, max, top) => {
      return (v) => top + chartHeight - ((v - min) / (max - min)) * chartHeight;
    };

    const chartTop = margin.top;
    const yScale = createYScale(yMin, yMax, chartTop);

    // 折れ線パス生成
    const generatePath = (points, getValue, yScaleFn) => {
      const validPoints = points.filter(p => getValue(p) !== null);
      if (validPoints.length === 0) return '';
      return validPoints.map((p, idx) => {
        const x = xScale(p.timestamp);
        const y = yScaleFn(getValue(p));
        return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ');
    };

    // ドット生成
    const generateDots = (points, getValue, yScaleFn, color) => {
      return points.map(p => {
        const v = getValue(p);
        if (v === null) return '';
        const x = xScale(p.timestamp);
        const y = yScaleFn(v);
        return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
      }).join('');
    };

    // 日付境界線と日付ラベル生成
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

    // Y軸目盛り生成
    const generateYTicks = (min, max, step, top, color) => {
      const ticks = [];
      for (let v = min; v <= max; v += step) {
        ticks.push(v);
      }
      const yScaleFn = createYScale(min, max, top);
      return ticks.map(v => {
        return `
          <text x="${margin.left - 5}" y="${yScaleFn(v) + 3}" text-anchor="end" font-size="9" fill="${color}">${v}</text>
          <text x="${margin.left + chartWidth + 5}" y="${yScaleFn(v) + 3}" text-anchor="start" font-size="9" fill="${color}">${v}</text>
          <line x1="${margin.left}" y1="${yScaleFn(v)}" x2="${margin.left + chartWidth}" y2="${yScaleFn(v)}" stroke="#eee" stroke-dasharray="2,2" />
        `;
      }).join('');
    };

    // 基準値帯生成
    const generateNormalBand = (rangeMin, rangeMax, scaleMin, scaleMax, top, color) => {
      const clampedMin = Math.max(rangeMin, scaleMin);
      const clampedMax = Math.min(rangeMax, scaleMax);
      if (clampedMin >= clampedMax) return '';
      const yScaleFn = createYScale(scaleMin, scaleMax, top);
      const y1 = yScaleFn(clampedMax);
      const y2 = yScaleFn(clampedMin);
      const height = y2 - y1;
      return `<rect x="${margin.left}" y="${y1}" width="${chartWidth}" height="${height}" fill="${color}" />`;
    };

    // 各時間帯の折れ線パス
    const morningPath = generatePath(data, d => d.morning, yScale);
    const noonPath = generatePath(data, d => d.noon, yScale);
    const eveningPath = generatePath(data, d => d.evening, yScale);

    // 30日表示時はドット非表示
    const showDots = days !== 30;
    const morningDots = showDots ? generateDots(data, d => d.morning, yScale, '#FF9800') : '';
    const noonDots = showDots ? generateDots(data, d => d.noon, yScale, '#4CAF50') : '';
    const eveningDots = showDots ? generateDots(data, d => d.evening, yScale, '#2196F3') : '';

    // 基準値帯（70〜130 mg/dL）
    const normalBand = generateNormalBand(normalRange.min, normalRange.max, yMin, yMax, chartTop, 'rgba(255, 152, 0, 0.15)');

    // 凡例
    const legend = `
      <g transform="translate(${margin.left + chartWidth - 150}, ${chartTop - 25})">
        <line x1="0" y1="0" x2="20" y2="0" stroke="#FF9800" stroke-width="2" />
        <text x="25" y="4" font-size="10" fill="#666">朝</text>
        <line x1="50" y1="0" x2="70" y2="0" stroke="#4CAF50" stroke-width="2" />
        <text x="75" y="4" font-size="10" fill="#666">昼</text>
        <line x1="100" y1="0" x2="120" y2="0" stroke="#2196F3" stroke-width="2" />
        <text x="125" y="4" font-size="10" fill="#666">夕</text>
      </g>
    `;

    return `
      <svg width="${width}" height="${totalHeight}" style="display:block;margin:0 auto;">
        <!-- 血糖グラフ -->
        <rect x="${margin.left}" y="${chartTop}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" />
        ${normalBand}
        ${generateYTicks(yMin, yMax, 50, chartTop, '#666')}
        ${generateDayLinesAndLabels(chartTop, chartHeight)}
        <path d="${morningPath}" fill="none" stroke="#FF9800" stroke-width="2" />
        <path d="${noonPath}" fill="none" stroke="#4CAF50" stroke-width="2" />
        <path d="${eveningPath}" fill="none" stroke="#2196F3" stroke-width="2" />
        ${morningDots}
        ${noonDots}
        ${eveningDots}
        <rect x="${margin.left}" y="${chartTop}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#ccc" />

        <!-- タイトル -->
        <text x="${margin.left}" y="${chartTop - 5}" font-size="11" font-weight="bold" fill="#333">血糖値 (mg/dL)</text>
        ${legend}
      </svg>
    `;
  }

  // SVGで尿量折れ線グラフを描画
  // 純粋関数：外部状態に依存せず、引数のみで動作
  function renderUrineSVG(data, minTime, maxTime, dateKeys, days = 7) {
    const width = 700;
    const chartHeight = 200;
    const margin = { top: 35, right: 50, bottom: 25, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const totalHeight = margin.top + chartHeight + margin.bottom;

    // Y軸スケール: 0〜3000 mL
    const yMin = 0, yMax = 3000;

    // 正常範囲帯: 1000〜2000 mL
    const normalRange = { min: 1000, max: 2000 };

    const timeRange = maxTime - minTime;
    const xScale = (timestamp) => margin.left + ((timestamp - minTime) / timeRange) * chartWidth;

    const createYScale = (min, max, top) => {
      return (v) => top + chartHeight - ((v - min) / (max - min)) * chartHeight;
    };

    const chartTop = margin.top;
    const yScale = createYScale(yMin, yMax, chartTop);

    // 折れ線パス生成
    const generatePath = (points, getValue, yScaleFn) => {
      const validPoints = points.filter(p => getValue(p) !== null);
      if (validPoints.length === 0) return '';
      return validPoints.map((p, idx) => {
        const x = xScale(p.timestamp);
        const y = yScaleFn(getValue(p));
        return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ');
    };

    // ドット生成
    const generateDots = (points, getValue, yScaleFn, color) => {
      return points.map(p => {
        const v = getValue(p);
        if (v === null) return '';
        const x = xScale(p.timestamp);
        const y = yScaleFn(v);
        return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
      }).join('');
    };

    // 日付境界線と日付ラベル生成
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

    // Y軸目盛り生成
    const generateYTicks = (min, max, step, top, color) => {
      const ticks = [];
      for (let v = min; v <= max; v += step) {
        ticks.push(v);
      }
      const yScaleFn = createYScale(min, max, top);
      return ticks.map(v => {
        return `
          <text x="${margin.left - 5}" y="${yScaleFn(v) + 3}" text-anchor="end" font-size="9" fill="${color}">${v}</text>
          <text x="${margin.left + chartWidth + 5}" y="${yScaleFn(v) + 3}" text-anchor="start" font-size="9" fill="${color}">${v}</text>
          <line x1="${margin.left}" y1="${yScaleFn(v)}" x2="${margin.left + chartWidth}" y2="${yScaleFn(v)}" stroke="#eee" stroke-dasharray="2,2" />
        `;
      }).join('');
    };

    // 正常範囲帯生成
    const generateNormalBand = (rangeMin, rangeMax, scaleMin, scaleMax, top, color) => {
      const clampedMin = Math.max(rangeMin, scaleMin);
      const clampedMax = Math.min(rangeMax, scaleMax);
      if (clampedMin >= clampedMax) return '';
      const yScaleFn = createYScale(scaleMin, scaleMax, top);
      const y1 = yScaleFn(clampedMax);
      const y2 = yScaleFn(clampedMin);
      const height = y2 - y1;
      return `<rect x="${margin.left}" y="${y1}" width="${chartWidth}" height="${height}" fill="${color}" />`;
    };

    // 尿量パス
    const urinePath = generatePath(data, d => d.totalUrine, yScale);

    // 30日表示時はドット非表示
    const showDots = days !== 30;
    const urineDots = showDots ? generateDots(data, d => d.totalUrine, yScale, '#607D8B') : '';

    // 正常範囲帯（1000〜2000 mL）
    const normalBand = generateNormalBand(normalRange.min, normalRange.max, yMin, yMax, chartTop, 'rgba(96, 125, 139, 0.15)');

    return `
      <svg width="${width}" height="${totalHeight}" style="display:block;margin:0 auto;">
        <!-- 尿量グラフ -->
        <rect x="${margin.left}" y="${chartTop}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" />
        ${normalBand}
        ${generateYTicks(yMin, yMax, 500, chartTop, '#666')}
        ${generateDayLinesAndLabels(chartTop, chartHeight)}
        <path d="${urinePath}" fill="none" stroke="#607D8B" stroke-width="2" />
        ${urineDots}
        <rect x="${margin.left}" y="${chartTop}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#ccc" />

        <!-- タイトル -->
        <text x="${margin.left}" y="${chartTop - 5}" font-size="11" font-weight="bold" fill="#333">尿量 (mL)</text>
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
      font-family: "Noto Sans JP", sans-serif;
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
      width: 90px;
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
    #patient-timeline-modal .record-column {
      flex: 4;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #patient-timeline-modal .vital-column,
    #patient-timeline-modal .prescription-order-column {
      flex: 3;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #patient-timeline-modal .fixed-info-column {
      flex: 4;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f5f5f5;
      box-shadow: -2px 0 8px rgba(0,0,0,0.08);
      border-radius: 8px 0 0 8px;
    }
    #patient-timeline-modal .fixed-info-column .column-content {
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    /* サマリーカード：初期80%、リサイズ可能 */
    #patient-timeline-modal #sidebar-summary-card {
      flex: 0 0 auto;
      height: 80%;
      min-height: 100px;
      margin-bottom: 0;
      display: flex;
      flex-direction: column;
    }
    #patient-timeline-modal #sidebar-summary-content {
      flex: 1;
      max-height: none;
      overflow-y: auto;
    }
    #patient-timeline-modal #sidebar-summary-content textarea {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      resize: none;
      font-size: 13px;
      line-height: 1.6;
      padding: 0;
      outline: none;
      font-family: inherit;
    }
    #patient-timeline-modal #sidebar-summary-content textarea:focus {
      background: rgba(33, 150, 243, 0.05);
    }
    #patient-timeline-modal #sidebar-summary-content textarea:disabled {
      opacity: 0.6;
    }
    /* ボタングリッド：残り40%を使用 */
    #patient-timeline-modal .button-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      align-content: start;
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
      font-size: 11px;
      color: #666;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s, color 0.2s;
    }
    #patient-timeline-modal .edit-record-btn:hover {
      opacity: 1;
      color: #1976D2;
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
    #patient-timeline-modal .vital-high {
      color: #c62828;
      font-weight: 700;
    }
    #patient-timeline-modal .vital-low {
      color: #1565c0;
      font-weight: 700;
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
    #patient-timeline-modal .info-card {
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    #patient-timeline-modal .info-card.clickable {
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }
    #patient-timeline-modal .info-card.clickable:hover {
      background: #fafafa;
      border-color: #bdbdbd;
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
    let bloodSugarGraphState = null; // { close, overlayEl, dateKey, days } 血糖グラフモーダルの状態
    let urineGraphState = null; // { close, overlayEl, dateKey, days } 尿量グラフモーダルの状態
    let bloodTestModalState = null; // { close, overlayEl } 血液検査モーダルの状態
    let pressureUlcerModalState = null; // { close, overlayEl } 褥瘡評価モーダルの状態
    let pharmacyModalState = null; // { close, overlayEl } 薬剤部記録モーダルの状態
    let inspectionFindingsModalState = null; // { close, overlayEl } 検査所見モーダルの状態
    let isLoading = true;
    let doctorColorMap = new Map(); // 担当医→色のマッピング
    let selectedDoctors = new Set(); // 選択中の担当医（正規化名）。空=全員表示
    // 固定情報エリア用
    let activePrescriptions = [];
    let activeInjections = [];
    let outsideInspectionReportGroups = [];
    let inHouseBloodTests = [];
    let pressureUlcerRecords = [];
    let pharmacyRecords = [];
    let inspectionFindingsRecords = [];
    let patientProfile = null;
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

    // モーダルを閉じる（クリーンアップ付き）
    function closeModal() {
      cleaner.exec();
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
        if (bloodSugarGraphState) {
          showBloodSugarGraph(selectedDateKey, bloodSugarGraphState.days);
        }
        if (urineGraphState) {
          showUrineGraph(selectedDateKey, urineGraphState.days);
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
      outsideInspectionReportGroups = [];
      inHouseBloodTests = [];
      pressureUlcerRecords = [];
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
      controlsArea.style.display = 'flex';
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

      // グラフ用キャッシュをクリア（前の患者のデータが残らないようにする）
      cachedBloodSugarByDate.clear();
      cachedUrineByDate.clear();
      cachedVitalsByDate.clear();
      // 選択日付もリセット（新患者の入院期間外を参照しないように）
      selectedDateKey = null;

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
      controlsArea.style.display = 'none';
      const headerSearchContainer = modal.querySelector('#header-search-container');
      headerSearchContainer.style.display = 'block';
      headerSearchContainer.innerHTML = `
        <input type="text" class="search-input" placeholder="キーワード検索..." id="timeline-search-input">
      `;
      setupTimelineSearchEvent();

      patientSelectView.style.display = 'none';
      timelineContainer.style.display = 'flex';
      timelineContainer.style.flexDirection = 'column';

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

      // 血糖グラフモーダルが開いていればローディング表示に切り替え
      if (bloodSugarGraphState && bloodSugarGraphState.overlayEl && bloodSugarGraphState.overlayEl.parentNode) {
        const titleEl = bloodSugarGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>血糖推移</span>
            <span style="font-size: 14px; color: #666;">${patient.fullName}</span>
          `;
          const bodyEl = titleEl.nextElementSibling;
          if (bodyEl) {
            bodyEl.innerHTML = `
              <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
                ${[7, 14, 30].map(d => `
                  <button disabled style="padding: 6px 16px; border: none; border-radius: 4px;
                    background: #e0e0e0; color: #999; font-size: 13px;">${d}日</button>
                `).join('')}
              </div>
              <div style="display: flex; justify-content: center; align-items: center; min-height: 400px; color: #666;">
                グラフを生成中...
              </div>
            `;
          }
        }
      }

      // 尿量グラフモーダルが開いていればローディング表示に切り替え
      if (urineGraphState && urineGraphState.overlayEl && urineGraphState.overlayEl.parentNode) {
        const titleEl = urineGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>尿量推移</span>
            <span style="font-size: 14px; color: #666;">${patient.fullName}</span>
          `;
          const bodyEl = titleEl.nextElementSibling;
          if (bodyEl) {
            bodyEl.innerHTML = `
              <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
                ${[7, 14, 30].map(d => `
                  <button disabled style="padding: 6px 16px; border: none; border-radius: 4px;
                    background: #e0e0e0; color: #999; font-size: 13px;">${d}日</button>
                `).join('')}
              </div>
              <div style="display: flex; justify-content: center; align-items: center; min-height: 400px; color: #666;">
                グラフを生成中...
              </div>
            `;
          }
        }
      }

      await loadTimelineData(patient.uuid);
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
        'data-filters': ['vital', 'meal', 'urine', 'bloodSugar'],
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
      // スクロール位置をリセット（患者/日付変更時に前の状態が残らないように）
      if (recordContent) recordContent.scrollTop = 0;
      if (vitalContent) vitalContent.scrollTop = 0;
      if (prescriptionOrderContent) prescriptionOrderContent.scrollTop = 0;

      if (!currentHospitalization) {
        dateListEl.innerHTML = '<div class="no-records">入院情報なし</div>';
        recordContent.innerHTML = '';
        vitalContent.innerHTML = '';
        prescriptionOrderContent.innerHTML = '';
        return;
      }

      // startDateの存在チェック
      if (!currentHospitalization.startDate) {
        dateListEl.innerHTML = '<div class="no-records">入院開始日なし</div>';
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
        const isWeekend = date.getDay() === 0;
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

      // 記録とデータ（バイタル+食事摂取+排泄）に分類
      const records = selectedItems.filter(item => RECORD_CATEGORIES.includes(item.category));
      const dataItems = selectedItems.filter(item => item.category === 'vital' || item.category === 'meal' || item.category === 'urine' || item.category === 'bloodSugar');

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

      // 血糖カードにクリックイベント追加（グラフ表示）
      vitalContent.querySelectorAll('.record-card[data-record-id^="bloodSugar-"]').forEach(card => {
        card.style.cursor = 'pointer';
        card.title = 'クリックで血糖推移グラフを表示';
        card.onclick = () => {
          // data-record-id="bloodSugar-YYYY-MM-DD" から日付を抽出
          const recordId = card.dataset.recordId;
          const dateStr = recordId.replace('bloodSugar-', '');
          showBloodSugarGraph(dateStr);
        };
      });

      // 尿量カードにクリックイベント追加（グラフ表示）
      vitalContent.querySelectorAll('.record-card[data-record-id^="urine-"]').forEach(card => {
        card.style.cursor = 'pointer';
        card.title = 'クリックで尿量推移グラフを表示';
        card.onclick = () => {
          // data-record-id="urine-YYYY-MM-DD" から日付を抽出
          const recordId = card.dataset.recordId;
          const dateStr = recordId.replace('urine-', '');
          showUrineGraph(dateStr);
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
      // urineカテゴリは時刻を非表示（尿量データには時刻情報がないため）
      // bloodSugarカテゴリは時刻を非表示（日付ベースのデータのため）
      const time = (item.category === 'meal' || item.category === 'vital' || item.category === 'urine' || item.category === 'bloodSugar') ? '' :
        (item.date ? `${item.date.getHours()}:${String(item.date.getMinutes()).padStart(2, '0')}` : '-');

      // バイタルカードは体温ハイライト用HTMLを含むためエスケープしない
      // SOAP形式を整形（＜SOAP＞ラベル削除、S)等の直後の改行削除）
      const formatSOAP = (text) => text
        .replace(/＜SOAP＞\n?/g, '')
        .replace(/([SOAP]\))\n/g, '$1');

      const textHtml = item.category === 'vital'
        ? item.text.replace(/\n/g, '<br>')
        : highlightText(formatSOAP(item.text), searchText).replace(/\n/g, '<br>');

      // 医師記録かつ自分が作成したものに編集ボタンを表示
      const canEdit = item.category === 'doctor' && item.creatorUuid && myUuid && item.creatorUuid === myUuid;
      const editButton = canEdit
        ? `<button class="edit-record-btn" data-record-id="${item.id}">編集</button>`
        : '';

      // 全カテゴリでバッジ非表示（カードの背景色・左ボーダーで区別可能）
      const categoryBadge = '';

      return `
        <div class="record-card" style="background: ${cat.bgColor}; border-left-color: ${cat.color};" data-record-id="${item.id || ''}">
          <div class="record-card-header">
            <span class="record-card-time">${time}</span>
            <span class="record-card-author">${escapeHtml(item.author.replace(/\u3000/g, ' '))}</span>
            ${editButton}
            ${categoryBadge}
          </div>
          <div class="record-card-text">${textHtml}</div>
        </div>
      `;
    }

    // 入院していない患者の場合、開いているグラフモーダルにメッセージを表示
    function updateGraphModalsForNotAdmitted() {
      const message = 'まだ入院していません';
      const messageHtml = `
        <div style="text-align: center; padding: 60px 20px; color: #666;">
          ${message}
        </div>
      `;

      // バイタルグラフ
      if (vitalGraphState?.overlayEl?.parentNode) {
        const titleEl = vitalGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          const bodyEl = titleEl.nextElementSibling;
          if (bodyEl) {
            bodyEl.innerHTML = messageHtml;
          }
        }
      }

      // 血糖グラフ
      if (bloodSugarGraphState?.overlayEl?.parentNode) {
        const titleEl = bloodSugarGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          const bodyEl = titleEl.nextElementSibling;
          if (bodyEl) {
            bodyEl.innerHTML = messageHtml;
          }
        }
      }

      // 尿量グラフ
      if (urineGraphState?.overlayEl?.parentNode) {
        const titleEl = urineGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          const bodyEl = titleEl.nextElementSibling;
          if (bodyEl) {
            bodyEl.innerHTML = messageHtml;
          }
        }
      }
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
        // モーダルが既に開いている場合はモーダル内に「データなし」を表示
        if (vitalGraphState && vitalGraphState.overlayEl && vitalGraphState.overlayEl.parentNode) {
          const titleEl = vitalGraphState.overlayEl.querySelector('.henry-modal-title');
          if (titleEl) {
            titleEl.style.display = 'flex';
            titleEl.style.justifyContent = 'space-between';
            titleEl.style.alignItems = 'center';
            titleEl.style.width = '100%';
            titleEl.innerHTML = `
              <span>バイタル推移</span>
              <span style="font-size: 14px; color: #666;">${selectedPatient?.fullName || ''}</span>
            `;
            const bodyEl = titleEl.nextElementSibling;
            if (bodyEl) {
              // ボタングループHTML（選択維持）
              const noDataButtonGroupHtml = `
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
              bodyEl.innerHTML = noDataButtonGroupHtml + `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                  この期間のバイタルデータがありません
                </div>
              `;
              // ボタンにイベントを再設定
              bodyEl.querySelectorAll('.vital-days-btn').forEach(btn => {
                btn.onclick = () => {
                  const newDays = parseInt(btn.dataset.days, 10);
                  showVitalGraph(endDateStr, newDays);
                };
              });
            }
          }
          return;
        }
        // 新規オープン時はトースト
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

    // 血糖経時変化グラフを表示
    function showBloodSugarGraph(endDateStr, days = 7) {
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

      // allItems から血糖データを収集（キャッシュ不要・バイタルと同じパターン）
      const allBloodSugar = [];
      for (const item of allItems) {
        if (item.category !== 'bloodSugar') continue;
        const itemKey = dateKey(item.date);
        if (!dateKeySet.has(itemKey)) continue;

        // 日付の正午をタイムスタンプとして使用（グラフのX軸用）
        const [year, month, day] = itemKey.split('-').map(Number);
        const timestamp = new Date(year, month - 1, day, 12, 0, 0).getTime();

        // テキストから血糖値を抽出（例: 【血糖値】朝100　昼200(トレシーバ6U)　夕90）
        const text = item.text;
        const morningMatch = text.match(/朝(\d+)/);
        const noonMatch = text.match(/昼(\d+)/);
        const eveningMatch = text.match(/夕(\d+)/);

        allBloodSugar.push({
          timestamp,
          dateKey: itemKey,
          morning: morningMatch ? parseInt(morningMatch[1], 10) : null,
          noon: noonMatch ? parseInt(noonMatch[1], 10) : null,
          evening: eveningMatch ? parseInt(eveningMatch[1], 10) : null
        });
      }

      // 時系列でソート
      allBloodSugar.sort((a, b) => a.timestamp - b.timestamp);

      // データがあるか確認
      const hasData = allBloodSugar.some(d => d.morning !== null || d.noon !== null || d.evening !== null);
      if (!hasData) {
        // モーダルが既に開いている場合はモーダル内に「データなし」を表示
        if (bloodSugarGraphState && bloodSugarGraphState.overlayEl && bloodSugarGraphState.overlayEl.parentNode) {
          const titleEl = bloodSugarGraphState.overlayEl.querySelector('.henry-modal-title');
          if (titleEl) {
            titleEl.style.display = 'flex';
            titleEl.style.justifyContent = 'space-between';
            titleEl.style.alignItems = 'center';
            titleEl.style.width = '100%';
            titleEl.innerHTML = `
              <span>血糖推移</span>
              <span style="font-size: 14px; color: #666;">${selectedPatient?.fullName || ''}</span>
            `;
            const bodyEl = titleEl.nextElementSibling;
            if (bodyEl) {
              // ボタングループHTML（選択維持）
              const noDataButtonGroupHtml = `
                <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
                  ${[7, 14, 30].map(d => `
                    <button
                      class="blood-sugar-days-btn"
                      data-days="${d}"
                      style="
                        padding: 6px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 13px;
                        ${d === days
                          ? 'background: #FF9800; color: white;'
                          : 'background: #e0e0e0; color: #333;'}
                      "
                    >${d}日</button>
                  `).join('')}
                </div>
              `;
              bodyEl.innerHTML = noDataButtonGroupHtml + `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                  この期間の血糖データがありません
                </div>
              `;
              // ボタンにイベントを再設定
              bodyEl.querySelectorAll('.blood-sugar-days-btn').forEach(btn => {
                btn.onclick = () => {
                  const newDays = parseInt(btn.dataset.days, 10);
                  showBloodSugarGraph(endDateStr, newDays);
                };
              });
            }
          }
          return;
        }
        // 新規オープン時はトースト
        window.HenryCore.ui.showToast('この期間の血糖データがありません', 'info');
        return;
      }

      // 期間表示用の日付フォーマット
      const startLabel = `${parseInt(dateKeys[0].split('-')[1])}/${parseInt(dateKeys[0].split('-')[2])}`;
      const endLabel = `${parseInt(dateKeys[dateKeys.length - 1].split('-')[1])}/${parseInt(dateKeys[dateKeys.length - 1].split('-')[2])}`;

      // SVG生成
      const svgHtml = renderBloodSugarSVG(allBloodSugar, startDate.getTime(), endDate.getTime(), dateKeys, days);

      // ボタングループHTML
      const buttonGroupHtml = `
        <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
          ${[7, 14, 30].map(d => `
            <button
              class="blood-sugar-days-btn"
              data-days="${d}"
              style="
                padding: 6px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                ${d === days
                  ? 'background: #FF9800; color: white;'
                  : 'background: #e0e0e0; color: #333;'}
              "
            >${d}日</button>
          `).join('')}
        </div>
      `;

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (bloodSugarGraphState && bloodSugarGraphState.overlayEl && bloodSugarGraphState.overlayEl.parentNode) {
        bloodSugarGraphState.dateKey = endDateStr;
        bloodSugarGraphState.days = days;
        // タイトル更新（患者名を右寄せで表示）
        const titleEl = bloodSugarGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>血糖推移（${startLabel} - ${endLabel}）</span>
            <span style="font-size: 14px; color: #666;">${selectedPatient?.fullName || ''}</span>
          `;
        }
        // コンテンツ更新（ボタングループ + SVG）
        const bodyEl = titleEl?.nextElementSibling;
        if (bodyEl) {
          bodyEl.innerHTML = buttonGroupHtml + svgHtml;
          // ボタンにイベントを再設定
          bodyEl.querySelectorAll('.blood-sugar-days-btn').forEach(btn => {
            btn.onclick = () => {
              const newDays = parseInt(btn.dataset.days, 10);
              showBloodSugarGraph(endDateStr, newDays);
            };
          });
        }
        return;
      }

      // 新規モーダル作成
      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = buttonGroupHtml + svgHtml;

      // ボタンにクリックイベントを設定
      svgContainer.querySelectorAll('.blood-sugar-days-btn').forEach(btn => {
        btn.onclick = () => {
          const newDays = parseInt(btn.dataset.days, 10);
          showBloodSugarGraph(endDateStr, newDays);
        };
      });

      const { close } = window.HenryCore.ui.showModal({
        title: `血糖推移（${startLabel} - ${endLabel}）`,
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
            <span>血糖推移（${startLabel} - ${endLabel}）</span>
            <span style="font-size: 14px; color: #666;">${selectedPatient.fullName}</span>
          `;
        }
      }

      bloodSugarGraphState = {
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
                bloodSugarGraphState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // 尿量経時変化グラフを表示
    function showUrineGraph(endDateStr, days = 7) {
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

      // allItems から尿量データを収集（キャッシュ不要・バイタルと同じパターン）
      const allUrine = [];
      for (const item of allItems) {
        if (item.category !== 'urine') continue;
        const itemKey = dateKey(item.date);
        if (!dateKeySet.has(itemKey)) continue;

        // 日付の正午をタイムスタンプとして使用（グラフのX軸用）
        const [year, month, day] = itemKey.split('-').map(Number);
        const timestamp = new Date(year, month - 1, day, 12, 0, 0).getTime();

        // テキストから尿量を抽出（例: 【尿量】1500mL）
        const match = item.text.match(/【尿量】(\d+)/);
        const totalUrine = match ? parseInt(match[1], 10) : 0;

        allUrine.push({
          timestamp,
          dateKey: itemKey,
          totalUrine
        });
      }

      // 時系列でソート
      allUrine.sort((a, b) => a.timestamp - b.timestamp);

      // データがあるか確認
      const hasData = allUrine.some(d => d.totalUrine !== null);
      if (!hasData) {
        // モーダルが既に開いている場合はモーダル内に「データなし」を表示
        if (urineGraphState && urineGraphState.overlayEl && urineGraphState.overlayEl.parentNode) {
          const titleEl = urineGraphState.overlayEl.querySelector('.henry-modal-title');
          if (titleEl) {
            titleEl.style.display = 'flex';
            titleEl.style.justifyContent = 'space-between';
            titleEl.style.alignItems = 'center';
            titleEl.style.width = '100%';
            titleEl.innerHTML = `
              <span>尿量推移</span>
              <span style="font-size: 14px; color: #666;">${selectedPatient?.fullName || ''}</span>
            `;
            const bodyEl = titleEl.nextElementSibling;
            if (bodyEl) {
              // ボタングループHTML（選択維持）
              const noDataButtonGroupHtml = `
                <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
                  ${[7, 14, 30].map(d => `
                    <button
                      class="urine-days-btn"
                      data-days="${d}"
                      style="
                        padding: 6px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 13px;
                        ${d === days
                          ? 'background: #607D8B; color: white;'
                          : 'background: #e0e0e0; color: #333;'}
                      "
                    >${d}日</button>
                  `).join('')}
                </div>
              `;
              bodyEl.innerHTML = noDataButtonGroupHtml + `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                  この期間の尿量データがありません
                </div>
              `;
              // ボタンにイベントを再設定
              bodyEl.querySelectorAll('.urine-days-btn').forEach(btn => {
                btn.onclick = () => {
                  const newDays = parseInt(btn.dataset.days, 10);
                  showUrineGraph(endDateStr, newDays);
                };
              });
            }
          }
          return;
        }
        // 新規オープン時はトースト
        window.HenryCore.ui.showToast('この期間の尿量データがありません', 'info');
        return;
      }

      // 期間表示用の日付フォーマット
      const startLabel = `${parseInt(dateKeys[0].split('-')[1])}/${parseInt(dateKeys[0].split('-')[2])}`;
      const endLabel = `${parseInt(dateKeys[dateKeys.length - 1].split('-')[1])}/${parseInt(dateKeys[dateKeys.length - 1].split('-')[2])}`;

      // SVG生成
      const svgHtml = renderUrineSVG(allUrine, startDate.getTime(), endDate.getTime(), dateKeys, days);

      // ボタングループHTML
      const buttonGroupHtml = `
        <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
          ${[7, 14, 30].map(d => `
            <button
              class="urine-days-btn"
              data-days="${d}"
              style="
                padding: 6px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                ${d === days
                  ? 'background: #607D8B; color: white;'
                  : 'background: #e0e0e0; color: #333;'}
              "
            >${d}日</button>
          `).join('')}
        </div>
      `;

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (urineGraphState && urineGraphState.overlayEl && urineGraphState.overlayEl.parentNode) {
        urineGraphState.dateKey = endDateStr;
        urineGraphState.days = days;
        // タイトル更新（患者名を右寄せで表示）
        const titleEl = urineGraphState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.justifyContent = 'space-between';
          titleEl.style.alignItems = 'center';
          titleEl.style.width = '100%';
          titleEl.innerHTML = `
            <span>尿量推移（${startLabel} - ${endLabel}）</span>
            <span style="font-size: 14px; color: #666;">${selectedPatient?.fullName || ''}</span>
          `;
        }
        // コンテンツ更新（ボタングループ + SVG）
        const bodyEl = titleEl?.nextElementSibling;
        if (bodyEl) {
          bodyEl.innerHTML = buttonGroupHtml + svgHtml;
          // ボタンにイベントを再設定
          bodyEl.querySelectorAll('.urine-days-btn').forEach(btn => {
            btn.onclick = () => {
              const newDays = parseInt(btn.dataset.days, 10);
              showUrineGraph(endDateStr, newDays);
            };
          });
        }
        return;
      }

      // 新規モーダル作成
      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = buttonGroupHtml + svgHtml;

      // ボタンにクリックイベントを設定
      svgContainer.querySelectorAll('.urine-days-btn').forEach(btn => {
        btn.onclick = () => {
          const newDays = parseInt(btn.dataset.days, 10);
          showUrineGraph(endDateStr, newDays);
        };
      });

      const { close } = window.HenryCore.ui.showModal({
        title: `尿量推移（${startLabel} - ${endLabel}）`,
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
            <span>尿量推移（${startLabel} - ${endLabel}）</span>
            <span style="font-size: 14px; color: #666;">${selectedPatient.fullName}</span>
          `;
        }
      }

      urineGraphState = {
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
                urineGraphState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // 固定情報エリアを描画（プロフィールとサマリー）
    function renderFixedInfo() {
      // 固定情報カラム（右端サイドパネル）を描画
      renderFixedInfoColumn();

      // サマリーテキストエリアを取得
      const summaryTextarea = document.getElementById('sidebar-summary-textarea');
      if (!summaryTextarea) return;

      // blurイベントで自動保存（一度だけ登録）
      if (!summaryTextarea.dataset.hasBlurHandler) {
        summaryTextarea.dataset.hasBlurHandler = 'true';
        summaryTextarea.addEventListener('blur', async () => {
          if (!selectedPatient) return;

          const summary = summaryTextarea.value.trim();
          // 保存中は無効化
          summaryTextarea.disabled = true;

          try {
            await savePatientSummary(
              selectedPatient.uuid,
              selectedPatient.fullName,
              summary
            );
            // 保存成功のフィードバック（控えめに）
            console.log(`[${SCRIPT_NAME}] サマリー自動保存完了`);
          } catch (e) {
            console.error(`[${SCRIPT_NAME}] サマリー保存エラー:`, e);
            window.HenryCore.ui.showToast(`保存エラー: ${e.message}`, 'error');
          } finally {
            summaryTextarea.disabled = false;
          }
        });
      }

      // サマリーを読み込んでテキストエリアに設定
      if (selectedPatient) {
        loadPatientSummary(selectedPatient.uuid).then(data => {
          if (data && data.summary) {
            summaryTextarea.value = data.summary;
          } else {
            summaryTextarea.value = '';
          }
        }).catch(e => {
          console.error(`[${SCRIPT_NAME}] サマリー読み込みエラー:`, e);
          summaryTextarea.value = '';
        });
      }
    }

    // GraphQL APIからのプロフィールを整形
    function formatGraphQLProfile(text) {
      let displayText = text;
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
      return displayText;
    }

    // 固定情報カラム（右端サイドパネル）を描画
    function renderFixedInfoColumn() {
      let html = '';

      // サマリーカード（インライン編集）
      html += `
        <div id="sidebar-summary-card" class="info-card">
          <div class="info-card-header">サマリー</div>
          <div class="info-card-content" id="sidebar-summary-content">
            <textarea id="sidebar-summary-textarea" placeholder="サマリーを入力..."></textarea>
          </div>
        </div>
      `;

      // ボタングリッド開始
      html += `<div class="button-grid">`;

      // プロフィールボタン（クリックで編集モーダル）
      html += `
        <button id="profile-btn" style="
          padding: 12px 16px;
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          border: 1px solid #ffcc80;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #e65100;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        ">
          プロフィール
        </button>
      `;

      // 血液検査ボタン
      html += `
        <button id="blood-test-btn" style="
          padding: 12px 16px;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border: 1px solid #90caf9;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #1565c0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        ">
          血液検査結果
        </button>
      `;

      // 褥瘡評価ボタン
      html += `
        <button id="pressure-ulcer-btn" style="
          padding: 12px 16px;
          background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
          border: 1px solid #f48fb1;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #c2185b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        ">
          褥瘡評価
        </button>
      `;

      // 薬剤部ボタン
      html += `
        <button id="pharmacy-btn" style="
          padding: 12px 16px;
          background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
          border: 1px solid #4dd0e1;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #00838f;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        ">
          薬剤部
        </button>
      `;

      // 検査所見ボタン
      html += `
        <button id="inspection-findings-btn" style="
          padding: 12px 16px;
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          border: 1px solid #81c784;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #2e7d32;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        ">
          検査所見
        </button>
      `;

      // ボタングリッド終了
      html += `</div>`;

      fixedInfoContent.innerHTML = html;

      // プロフィールボタンのイベント
      const profileBtn = fixedInfoContent.querySelector('#profile-btn');
      if (profileBtn) {
        profileBtn.addEventListener('mouseover', () => {
          profileBtn.style.background = 'linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%)';
        });
        profileBtn.addEventListener('mouseout', () => {
          profileBtn.style.background = 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)';
        });
        profileBtn.addEventListener('click', showProfileModal);
      }

      // 血液検査ボタンのイベント
      const bloodTestBtn = fixedInfoContent.querySelector('#blood-test-btn');
      if (bloodTestBtn) {
        bloodTestBtn.addEventListener('mouseover', () => {
          bloodTestBtn.style.background = 'linear-gradient(135deg, #bbdefb 0%, #90caf9 100%)';
        });
        bloodTestBtn.addEventListener('mouseout', () => {
          bloodTestBtn.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
        });
        bloodTestBtn.addEventListener('click', showBloodTestModal);
      }

      // 褥瘡評価ボタンのイベント
      const pressureUlcerBtn = fixedInfoContent.querySelector('#pressure-ulcer-btn');
      if (pressureUlcerBtn) {
        pressureUlcerBtn.addEventListener('mouseover', () => {
          pressureUlcerBtn.style.background = 'linear-gradient(135deg, #f8bbd9 0%, #f48fb1 100%)';
        });
        pressureUlcerBtn.addEventListener('mouseout', () => {
          pressureUlcerBtn.style.background = 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)';
        });
        pressureUlcerBtn.addEventListener('click', showPressureUlcerModal);
      }

      // 薬剤部ボタンのイベント
      const pharmacyBtn = fixedInfoContent.querySelector('#pharmacy-btn');
      if (pharmacyBtn) {
        pharmacyBtn.addEventListener('mouseover', () => {
          pharmacyBtn.style.background = 'linear-gradient(135deg, #b2ebf2 0%, #4dd0e1 100%)';
        });
        pharmacyBtn.addEventListener('mouseout', () => {
          pharmacyBtn.style.background = 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)';
        });
        pharmacyBtn.addEventListener('click', showPharmacyModal);
      }

      // 検査所見ボタンのイベント
      const inspectionFindingsBtn = fixedInfoContent.querySelector('#inspection-findings-btn');
      if (inspectionFindingsBtn) {
        inspectionFindingsBtn.addEventListener('mouseover', () => {
          inspectionFindingsBtn.style.background = 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)';
        });
        inspectionFindingsBtn.addEventListener('mouseout', () => {
          inspectionFindingsBtn.style.background = 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
        });
        inspectionFindingsBtn.addEventListener('click', showInspectionFindingsModal);
      }

    }

    // 血液検査結果モーダルを表示（横軸日付形式）
    function showBloodTestModal() {
      const results = extractBloodTestResults(outsideInspectionReportGroups, inHouseBloodTests);
      const modalTitle = `血液検査結果 - ${selectedPatient?.fullName || ''}`;

      if (results.length === 0) {
        // モーダルが開いていれば「データなし」表示
        if (bloodTestModalState?.overlayEl?.parentNode) {
          const titleEl = bloodTestModalState.overlayEl.querySelector('.henry-modal-title');
          if (titleEl) titleEl.textContent = modalTitle;
          const contentEl = bloodTestModalState.overlayEl.querySelector('.henry-modal-content');
          if (contentEl) contentEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">血液検査データがありません</div>';
          return;
        }
        window.HenryCore.ui.showToast('血液検査データがありません', 'info');
        return;
      }

      // ピボット形式に変換
      const pivoted = pivotBloodTestData(results);

      // カテゴリの表示順序（優先度順）
      const categoryOrder = [
        '血液学的検査',
        '生化学的検査',
        '内分泌学的検査',
        '免疫学的検査',
        '負荷試験・機能検査'
      ];

      // カテゴリをソート
      const sortedCategories = [...pivoted.categories].sort((a, b) => {
        const aIdx = categoryOrder.indexOf(a.name);
        const bIdx = categoryOrder.indexOf(b.name);
        if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

      // 日付ラベル（月/日形式）
      const dateLabels = pivoted.dates.map(d => {
        const [, month, day] = d.split('-').map(Number);
        return `${month}/${day}`;
      });

      // モーダルコンテンツを構築
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'max-height: 70vh; overflow-x: auto; padding: 8px;';

      // テーブル作成
      const table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; font-size: 13px; min-width: 100%;';

      // ヘッダー行（項目 | 基準値 | 日付1 | 日付2 | ...）
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.cssText = 'background: #f5f5f5; position: sticky; top: 0; z-index: 1;';

      // 項目列ヘッダー
      const thItem = document.createElement('th');
      thItem.style.cssText = 'text-align: left; padding: 8px; border-bottom: 2px solid #e0e0e0; min-width: 150px; position: sticky; left: 0; background: #f5f5f5;';
      thItem.textContent = '項目';
      headerRow.appendChild(thItem);

      // 基準値列ヘッダー
      const thRef = document.createElement('th');
      thRef.style.cssText = 'text-align: center; padding: 8px; border-bottom: 2px solid #e0e0e0; min-width: 80px; position: sticky; left: 150px; background: #f5f5f5; border-right: 1px solid #e0e0e0;';
      thRef.textContent = '基準値';
      headerRow.appendChild(thRef);

      // 日付列ヘッダー
      for (const label of dateLabels) {
        const th = document.createElement('th');
        th.style.cssText = 'text-align: center; padding: 8px; border-bottom: 2px solid #e0e0e0; min-width: 70px;';
        th.textContent = label;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // ボディ
      const tbody = document.createElement('tbody');

      for (const category of sortedCategories) {
        // カテゴリヘッダー行
        const categoryRow = document.createElement('tr');
        const categoryCell = document.createElement('td');
        categoryCell.colSpan = 2 + pivoted.dates.length;
        categoryCell.style.cssText = 'font-size: 13px; font-weight: 600; color: #1565c0; padding: 8px; background: #e3f2fd; border-top: 1px solid #e0e0e0;';
        categoryCell.textContent = category.name;
        categoryRow.appendChild(categoryCell);
        tbody.appendChild(categoryRow);

        // 項目行
        for (const item of category.items) {
          const row = document.createElement('tr');

          // 項目名セル
          const nameCell = document.createElement('td');
          nameCell.style.cssText = 'text-align: left; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; position: sticky; left: 0; background: #fff;';
          nameCell.textContent = item.name;
          row.appendChild(nameCell);

          // 基準値セル
          const refCell = document.createElement('td');
          refCell.style.cssText = 'text-align: center; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; color: #666; font-size: 12px; position: sticky; left: 150px; background: #fff; border-right: 1px solid #f0f0f0;';
          refCell.textContent = item.referenceValue || '-';
          row.appendChild(refCell);

          // 各日付の値セル
          for (const dateKey of pivoted.dates) {
            const valueCell = document.createElement('td');
            let cellStyle = 'text-align: center; padding: 6px 8px; border-bottom: 1px solid #f0f0f0;';

            const valueData = item.values.get(dateKey);
            if (valueData) {
              if (valueData.isAbnormal) {
                if (valueData.abnormalityType === 'HIGH') {
                  cellStyle += ' color: #c62828; font-weight: 600;';
                } else if (valueData.abnormalityType === 'LOW') {
                  cellStyle += ' color: #1565c0; font-weight: 600;';
                }
              }
              valueCell.textContent = valueData.value;
            } else {
              cellStyle += ' color: #ccc;';
              valueCell.textContent = '-';
            }
            valueCell.style.cssText = cellStyle;
            row.appendChild(valueCell);
          }

          tbody.appendChild(row);
        }
      }

      table.appendChild(tbody);
      contentDiv.appendChild(table);

      // モーダル幅を日付数に応じて調整（画面幅の80%まで）
      // 項目列150px + 基準値列80px + 日付列70px×日付数 + padding
      const requiredWidth = 280 + pivoted.dates.length * 70;
      const maxWidth = window.innerWidth * 0.8;
      const modalWidth = Math.min(maxWidth, requiredWidth);

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (bloodTestModalState?.overlayEl?.parentNode) {
        const titleEl = bloodTestModalState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) titleEl.textContent = modalTitle;
        const contentEl = bloodTestModalState.overlayEl.querySelector('.henry-modal-content');
        if (contentEl) {
          contentEl.innerHTML = '';
          contentEl.appendChild(contentDiv);
        }
        return;
      }

      // 新規モーダル作成
      const { close } = window.HenryCore.ui.showModal({
        title: modalTitle,
        content: contentDiv,
        width: `${modalWidth}px`
      });
      const overlayEl = document.querySelector('.henry-modal-overlay:last-of-type');

      bloodTestModalState = { close, overlayEl };

      // MutationObserverでモーダル削除時にリセット
      if (overlayEl) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const removed of mutation.removedNodes) {
              if (removed === overlayEl) {
                bloodTestModalState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // 褥瘡評価モーダルを表示（横軸日付形式）
    function showPressureUlcerModal() {
      const modalTitle = `褥瘡評価（DESIGN-R） - ${selectedPatient?.fullName || ''}`;

      if (!pressureUlcerRecords || pressureUlcerRecords.length === 0) {
        // モーダルが開いていれば「データなし」表示
        if (pressureUlcerModalState?.overlayEl?.parentNode) {
          const titleEl = pressureUlcerModalState.overlayEl.querySelector('.henry-modal-title');
          if (titleEl) titleEl.textContent = modalTitle;
          const contentEl = pressureUlcerModalState.overlayEl.querySelector('.henry-modal-content');
          if (contentEl) contentEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">褥瘡評価データがありません</div>';
          return;
        }
        window.HenryCore.ui.showToast('褥瘡評価データがありません', 'info');
        return;
      }

      // ピボット形式に変換
      const pivoted = pivotPressureUlcerData(pressureUlcerRecords);

      if (pivoted.sites.length === 0) {
        // モーダルが開いていれば「データなし」表示
        if (pressureUlcerModalState?.overlayEl?.parentNode) {
          const titleEl = pressureUlcerModalState.overlayEl.querySelector('.henry-modal-title');
          if (titleEl) titleEl.textContent = modalTitle;
          const contentEl = pressureUlcerModalState.overlayEl.querySelector('.henry-modal-content');
          if (contentEl) contentEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">褥瘡評価データがありません</div>';
          return;
        }
        window.HenryCore.ui.showToast('褥瘡評価データがありません', 'info');
        return;
      }

      // 日付ラベル（月/日形式）
      const dateLabels = pivoted.dates.map(d => {
        const [, month, day] = d.split('-').map(Number);
        return `${month}/${day}`;
      });

      // DESIGN-R項目の表示順序と日本語ラベル
      const DESIGN_R_ITEMS = [
        { key: 'totalScore', label: '合計点', highlight: true },
        { key: 'D', label: '深さ(D)' },
        { key: 'E', label: '滲出液(E)' },
        { key: 'S', label: '大きさ(S)' },
        { key: 'I', label: '炎症/感染(I)' },
        { key: 'G', label: '肉芽組織(G)' },
        { key: 'N', label: '壊死組織(N)' },
        { key: 'P', label: 'ポケット(P)' }
      ];

      // モーダルコンテンツを構築
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'max-height: 70vh; overflow-x: auto; padding: 8px;';

      // テーブル作成
      const table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; font-size: 13px; min-width: 100%;';

      // ヘッダー行（項目 | 日付1 | 日付2 | ...）
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.cssText = 'background: #f5f5f5; position: sticky; top: 0; z-index: 1;';

      // 項目列ヘッダー
      const thItem = document.createElement('th');
      thItem.style.cssText = 'text-align: left; padding: 8px; border-bottom: 2px solid #e0e0e0; min-width: 120px; position: sticky; left: 0; background: #f5f5f5;';
      thItem.textContent = '項目';
      headerRow.appendChild(thItem);

      // 日付列ヘッダー
      for (const label of dateLabels) {
        const th = document.createElement('th');
        th.style.cssText = 'text-align: center; padding: 8px; border-bottom: 2px solid #e0e0e0; min-width: 60px;';
        th.textContent = label;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // ボディ
      const tbody = document.createElement('tbody');

      for (const site of pivoted.sites) {
        // 部位ヘッダー行
        const siteRow = document.createElement('tr');
        const siteCell = document.createElement('td');
        siteCell.colSpan = 1 + pivoted.dates.length;
        siteCell.style.cssText = 'font-size: 13px; font-weight: 600; color: #c2185b; padding: 8px; background: #fce4ec; border-top: 1px solid #e0e0e0;';
        siteCell.textContent = site.name;
        siteRow.appendChild(siteCell);
        tbody.appendChild(siteRow);

        // 各DESIGN-R項目の行
        for (const item of DESIGN_R_ITEMS) {
          const row = document.createElement('tr');

          // 項目名セル
          const nameCell = document.createElement('td');
          nameCell.style.cssText = `text-align: left; padding: 6px 8px; border-bottom: 1px solid #f0f0f0; position: sticky; left: 0; background: #fff; padding-left: 16px;${item.highlight ? ' font-weight: 600;' : ''}`;
          nameCell.textContent = item.label;
          row.appendChild(nameCell);

          // 各日付の値セル
          for (const dKey of pivoted.dates) {
            const valueCell = document.createElement('td');
            let cellStyle = 'text-align: center; padding: 6px 8px; border-bottom: 1px solid #f0f0f0;';

            const siteData = site.values.get(dKey);
            let value = '-';
            if (siteData) {
              if (item.key === 'totalScore') {
                value = siteData.totalScore || '-';
                if (value !== '-') {
                  cellStyle += ' font-weight: 600; color: #c2185b;';
                }
              } else {
                value = siteData.designR?.[item.key] || '-';
              }
            }

            if (value === '-') {
              cellStyle += ' color: #ccc;';
            }
            valueCell.style.cssText = cellStyle;
            valueCell.textContent = value;
            row.appendChild(valueCell);
          }

          tbody.appendChild(row);
        }
      }

      table.appendChild(tbody);
      contentDiv.appendChild(table);

      // モーダル幅を日付数に応じて調整（画面幅の80%まで）
      // 項目列120px + 日付列60px×日付数 + padding
      const requiredWidth = 200 + pivoted.dates.length * 60;
      const maxWidth = window.innerWidth * 0.8;
      const modalWidth = Math.min(maxWidth, requiredWidth);

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (pressureUlcerModalState?.overlayEl?.parentNode) {
        const titleEl = pressureUlcerModalState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) titleEl.textContent = modalTitle;
        const contentEl = pressureUlcerModalState.overlayEl.querySelector('.henry-modal-content');
        if (contentEl) {
          contentEl.innerHTML = '';
          contentEl.appendChild(contentDiv);
        }
        return;
      }

      // 新規モーダル作成
      const { close } = window.HenryCore.ui.showModal({
        title: modalTitle,
        content: contentDiv,
        width: `${modalWidth}px`
      });
      const overlayEl = document.querySelector('.henry-modal-overlay:last-of-type');

      pressureUlcerModalState = { close, overlayEl };

      // MutationObserverでモーダル削除時にリセット
      if (overlayEl) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const removed of mutation.removedNodes) {
              if (removed === overlayEl) {
                pressureUlcerModalState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // 薬剤部記録モーダルを表示
    function showPharmacyModal() {
      if (!selectedPatient) {
        window.HenryCore.ui.showToast('患者が選択されていません', 'error');
        return;
      }

      const modalTitle = `💊 薬剤部記録 - ${selectedPatient.fullName}`;

      // モーダルが開いている場合はタイトル更新
      if (pharmacyModalState?.overlayEl?.parentNode) {
        const titleEl = pharmacyModalState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) titleEl.textContent = modalTitle;
      }

      // プリフェッチ済みデータを使用
      if (pharmacyRecords.length === 0) {
        // モーダルが開いていれば「データなし」表示
        if (pharmacyModalState?.overlayEl?.parentNode) {
          const contentEl = pharmacyModalState.overlayEl.querySelector('.henry-modal-content');
          if (contentEl) contentEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">薬剤部記録がありません</div>';
          return;
        }
        window.HenryCore.ui.showToast('薬剤部記録がありません', 'info');
        return;
      }

      // モーダルコンテンツを構築
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'max-height: 70vh; overflow-y: auto; padding: 8px;';

      // 各記録をカードとして表示
      for (let i = 0; i < pharmacyRecords.length; i++) {
        const record = pharmacyRecords[i];
        const recordDiv = document.createElement('div');
        recordDiv.style.cssText = `
          padding: 12px;
          background: #e0f7fa;
          border-radius: 6px;
          margin-bottom: 12px;
        `;

        // ヘッダー（日付・作成者）
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        `;
        const dateStr = record.date
          ? `${record.date.getFullYear()}/${record.date.getMonth() + 1}/${record.date.getDate()} ${record.date.getHours()}:${String(record.date.getMinutes()).padStart(2, '0')}`
          : '日付不明';
        headerDiv.innerHTML = `
          <span style="font-weight: 500; color: #00838f;">${escapeHtml(dateStr)}</span>
          <span>${escapeHtml(record.author)}</span>
        `;
        recordDiv.appendChild(headerDiv);

        // 本文
        const textDiv = document.createElement('div');
        textDiv.style.cssText = `
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        `;
        textDiv.innerHTML = formatPharmacyText(record.text);
        recordDiv.appendChild(textDiv);

        contentDiv.appendChild(recordDiv);

        // 区切り線（最後以外）
        if (i < pharmacyRecords.length - 1) {
          const hr = document.createElement('hr');
          hr.style.cssText = 'margin: 16px 0; border: none; border-top: 1px solid #e0e0e0;';
          contentDiv.appendChild(hr);
        }
      }

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (pharmacyModalState?.overlayEl?.parentNode) {
        const contentEl = pharmacyModalState.overlayEl.querySelector('.henry-modal-content');
        if (contentEl) {
          contentEl.innerHTML = '';
          contentEl.appendChild(contentDiv);
        }
        return;
      }

      // 新規モーダル作成
      const { close } = window.HenryCore.ui.showModal({
        title: modalTitle,
        content: contentDiv,
        width: '600px'
      });
      const overlayEl = document.querySelector('.henry-modal-overlay:last-of-type');

      pharmacyModalState = { close, overlayEl };

      // MutationObserverでモーダル削除時にリセット
      if (overlayEl) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const removed of mutation.removedNodes) {
              if (removed === overlayEl) {
                pharmacyModalState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // 検査所見モーダルを表示
    function showInspectionFindingsModal() {
      if (!selectedPatient) {
        window.HenryCore.ui.showToast('患者が選択されていません', 'error');
        return;
      }

      const modalTitle = `🔬 検査所見（読影結果等） - ${selectedPatient.fullName}`;

      // モーダルが開いている場合はタイトル更新
      if (inspectionFindingsModalState?.overlayEl?.parentNode) {
        const titleEl = inspectionFindingsModalState.overlayEl.querySelector('.henry-modal-title');
        if (titleEl) titleEl.textContent = modalTitle;
      }

      // プリフェッチ済みデータを使用
      if (inspectionFindingsRecords.length === 0) {
        // モーダルが開いていれば「データなし」表示
        if (inspectionFindingsModalState?.overlayEl?.parentNode) {
          const contentEl = inspectionFindingsModalState.overlayEl.querySelector('.henry-modal-content');
          if (contentEl) contentEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">検査所見がありません</div>';
          return;
        }
        window.HenryCore.ui.showToast('検査所見がありません', 'info');
        return;
      }

      // モーダルコンテンツを構築
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'max-height: 70vh; overflow-y: auto; padding: 8px;';

      // 各記録をカードとして表示
      for (let i = 0; i < inspectionFindingsRecords.length; i++) {
        const record = inspectionFindingsRecords[i];
        const recordDiv = document.createElement('div');
        recordDiv.style.cssText = `
          padding: 12px;
          background: #e8f5e9;
          border-radius: 6px;
          margin-bottom: 12px;
        `;

        // ヘッダー（日付・作成者）
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = `
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        `;
        const dateStr = record.date
          ? `${record.date.getFullYear()}/${record.date.getMonth() + 1}/${record.date.getDate()} ${record.date.getHours()}:${String(record.date.getMinutes()).padStart(2, '0')}`
          : '日付不明';
        headerDiv.innerHTML = `
          <span style="font-weight: 500; color: #2e7d32;">${escapeHtml(dateStr)}</span>
          <span>${escapeHtml(record.author)}</span>
        `;
        recordDiv.appendChild(headerDiv);

        // 本文
        const textDiv = document.createElement('div');
        textDiv.style.cssText = `
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        `;
        textDiv.textContent = record.text;
        recordDiv.appendChild(textDiv);

        // 画像があれば表示
        if (record.editorData) {
          const images = extractImagesFromEditorData(record.editorData);
          if (images.length > 0) {
            const imageContainer = document.createElement('div');
            imageContainer.style.cssText = 'margin-top: 12px;';
            for (const img of images) {
              const imgEl = document.createElement('img');
              imgEl.src = img.url;
              imgEl.style.cssText = `
                max-width: 100%;
                border-radius: 4px;
                margin-bottom: 8px;
                cursor: pointer;
              `;
              imgEl.alt = '検査画像';
              imgEl.title = 'クリックで拡大表示';
              // クリックで拡大表示
              imgEl.addEventListener('click', () => window.open(img.url, '_blank'));
              imageContainer.appendChild(imgEl);
            }
            recordDiv.appendChild(imageContainer);
          }
        }

        contentDiv.appendChild(recordDiv);

        // 区切り線（最後以外）
        if (i < inspectionFindingsRecords.length - 1) {
          const hr = document.createElement('hr');
          hr.style.cssText = 'margin: 16px 0; border: none; border-top: 1px solid #e0e0e0;';
          contentDiv.appendChild(hr);
        }
      }

      // モーダルが既に開いている場合はコンテンツのみ更新
      if (inspectionFindingsModalState?.overlayEl?.parentNode) {
        const contentEl = inspectionFindingsModalState.overlayEl.querySelector('.henry-modal-content');
        if (contentEl) {
          contentEl.innerHTML = '';
          contentEl.appendChild(contentDiv);
        }
        return;
      }

      // 新規モーダル作成
      const { close } = window.HenryCore.ui.showModal({
        title: modalTitle,
        content: contentDiv,
        width: '600px'
      });
      const overlayEl = document.querySelector('.henry-modal-overlay:last-of-type');

      inspectionFindingsModalState = { close, overlayEl };

      // MutationObserverでモーダル削除時にリセット
      if (overlayEl) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const removed of mutation.removedNodes) {
              if (removed === overlayEl) {
                inspectionFindingsModalState = null;
                observer.disconnect();
                return;
              }
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    }

    // プロフィール編集モーダル
    async function showProfileModal() {
      if (!selectedPatient) {
        window.HenryCore.ui.showToast('患者が選択されていません', 'error');
        return;
      }

      // 現在のプロフィールを読み込む（スプレッドシート優先）
      let currentProfile = '';
      try {
        const data = await loadPatientSummary(selectedPatient.uuid);
        if (data && data.profile) {
          currentProfile = data.profile;
        } else if (patientProfile && patientProfile.text) {
          // GraphQL APIからのプロフィールをデフォルト値として使用
          currentProfile = formatGraphQLProfile(patientProfile.text);
        }
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] プロフィール読み込みエラー:`, e);
      }

      // モーダルコンテンツを構築
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'padding: 16px;';

      const textarea = document.createElement('textarea');
      textarea.id = 'profile-modal-input';
      textarea.value = currentProfile;
      textarea.placeholder = '患者プロフィールを入力...';
      textarea.style.cssText = `
        width: 100%;
        height: 75vh;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-family: "Noto Sans JP", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        resize: none;
        box-sizing: border-box;
      `;

      // フォーカス時に背景色を変更（編集モードの視覚的フィードバック）
      textarea.addEventListener('focus', () => {
        textarea.style.background = 'rgba(33, 150, 243, 0.05)';
      });
      textarea.addEventListener('blur', () => {
        textarea.style.background = '';
      });

      contentDiv.appendChild(textarea);

      let profileModal;
      profileModal = window.HenryCore.ui.showModal({
        title: `プロフィール - ${selectedPatient.fullName}`,
        content: contentDiv,
        width: '750px',
        actions: [
          { label: 'キャンセル', variant: 'secondary', onClick: () => profileModal.close() },
          {
            label: '保存',
            variant: 'primary',
            onClick: async () => {
              const profile = textarea.value.trim();
              if (!profile) {
                window.HenryCore.ui.showToast('プロフィールを入力してください', 'error');
                return;
              }

              try {
                await savePatientProfile(
                  selectedPatient.uuid,
                  selectedPatient.fullName,
                  profile
                );
                textarea.blur(); // フォーカスを外して矢印キーで患者変更可能に
                window.HenryCore.ui.showToast('プロフィールを保存しました', 'success');
                profileModal.close();
              } catch (e) {
                console.error(`[${SCRIPT_NAME}] プロフィール保存エラー:`, e);
                window.HenryCore.ui.showToast(`保存エラー: ${e.message}`, 'error');
              }
            }
          }
        ]
      });

    }

    // 処方・注射カラムを描画
    function renderPrescriptionOrderColumn(targetDateKey) {
      // selectedDateKeyはYYYY-MM-DD形式
      const targetDate = targetDateKey ? new Date(targetDateKey + 'T00:00:00') : new Date();
      targetDate.setHours(0, 0, 0, 0);

      // 表示用の日付文字列
      const dateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;

      let html = '';

      // === 選択日の注射 ===
      if (selectedCategories.has('injection')) {
        const targetInjections = activeInjections.filter(inj => {
          // 注射はcreateTimeを開始日として使用（startDateフィールドがない）
          if (!inj.createTime?.seconds) return false;
          const startDate = new Date(inj.createTime.seconds * 1000);
          startDate.setHours(0, 0, 0, 0);
          const maxDuration = Math.max(...(inj.rps || []).map(rp => rp.boundsDurationDays?.value || 1));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + maxDuration - 1);
          return targetDate >= startDate && targetDate <= endDate;
        });

        const injectionCat = CATEGORIES.injection;
        html += `<div class="injection-section" style="background: ${injectionCat.bgColor}; border-left-color: ${injectionCat.color};"><div class="section-title">◆ ${dateLabel} の注射</div>`;

        if (targetInjections.length > 0) {
        html += targetInjections.flatMap(inj => {
          // createTimeから開始日を計算
          const startDate = new Date(inj.createTime.seconds * 1000);
          startDate.setHours(0, 0, 0, 0);

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

      // === 選択日の処方 ===
      if (selectedCategories.has('prescription')) {
        const targetPrescriptions = activePrescriptions.filter(rx => {
          // 処方はcreateTimeを開始日として使用（startDateフィールドがない）
          if (!rx.createTime?.seconds) return false;
          const startDate = new Date(rx.createTime.seconds * 1000);
          startDate.setHours(0, 0, 0, 0);
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
              const rawName = med?.localMedicine?.name || med?.mhlwMedicine?.name || null;
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

      prescriptionOrderContent.innerHTML = html;
    }

    // 患者データをプリフェッチ（バックグラウンド）
    async function prefetchPatientData(patientUuid) {
      if (!patientUuid || patientDataCache.has(patientUuid)) return;

      try {
        const hospitalizations = await fetchHospitalizations(patientUuid);
        const currentHosp = hospitalizations.find(h => h.state === 'ADMITTED');
        if (!currentHosp || !currentHosp.startDate) return;

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
            updateGraphModalsForNotAdmitted();
            return;
          }

          // startDateの存在チェック
          if (!currentHospitalization.startDate) {
            console.error(`[${SCRIPT_NAME}] 入院開始日が設定されていません: ${patientUuid}`);
            hospInfo.textContent = '入院情報エラー';
            dateListEl.innerHTML = '';
            recordContent.innerHTML = '<div class="no-records">入院開始日が設定されていません</div>';
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
          updateGraphModalsForNotAdmitted();
          return;
        }

        // startDateの存在チェック（キャッシュからの場合も）
        if (!currentHospitalization.startDate) {
          console.error(`[${SCRIPT_NAME}] 入院開始日が設定されていません`);
          hospInfo.textContent = '入院情報エラー';
          dateListEl.innerHTML = '';
          recordContent.innerHTML = '<div class="no-records">入院開始日が設定されていません</div>';
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
        outsideInspectionReportGroups = allData.outsideInspectionReportGroups;
        inHouseBloodTests = allData.inHouseBloodTests;
        pressureUlcerRecords = allData.pressureUlcerRecords;
        pharmacyRecords = allData.pharmacyRecords;
        inspectionFindingsRecords = allData.inspectionFindingsRecords;
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

        console.log(`[${SCRIPT_NAME}] データ読み込み完了: ${allItems.length}件, 有効処方: ${activePrescriptions.length}件, 有効注射: ${activeInjections.length}件, 血液検査: ${outsideInspectionReportGroups.length}件, 褥瘡評価: ${pressureUlcerRecords.length}件, 薬剤部: ${pharmacyRecords.length}件, 検査所見: ${inspectionFindingsRecords.length}件`);

        // 固定情報エリアを描画
        renderFixedInfo();

        // カテゴリフィルター描画
        renderCategoryFilters();

        applyFilters();
        renderTimeline();

        // グラフモーダルが開いていれば更新（患者切り替え時の連動）
        if (vitalGraphState) {
          showVitalGraph(selectedDateKey, vitalGraphState.days);
        }
        if (bloodSugarGraphState) {
          showBloodSugarGraph(selectedDateKey, bloodSugarGraphState.days);
        }
        if (urineGraphState) {
          showUrineGraph(selectedDateKey, urineGraphState.days);
        }
        // サイドパネルモーダルが開いていれば更新（患者切り替え時の連動）
        if (bloodTestModalState) {
          showBloodTestModal();
        }
        if (pressureUlcerModalState) {
          showPressureUlcerModal();
        }
        if (pharmacyModalState) {
          showPharmacyModal();
        }
        if (inspectionFindingsModalState) {
          showInspectionFindingsModal();
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

        // サマリーキャッシュをクリア（モーダル再オープン時に最新データを取得）
        summaryCache = null;

        // 患者一覧とサマリーキャッシュを並列で取得
        const [patients] = await Promise.all([
          fetchAllHospitalizedPatients(),
          loadAllSummaries() // サマリーキャッシュをプリロード
        ]);
        allPatients = patients;
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
