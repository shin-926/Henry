// ==UserScript==
// @name         Henry Summary Export
// @namespace    https://github.com/shin-926/Henry
// @version      1.8.0
// @description  入院患者のサマリー用データをマークダウン形式でダウンロード
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_summary_export.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_summary_export.user.js
// ==/UserScript==

/*
 * 【サマリー用データ出力】
 *
 * ■ 使用場面
 * - AIサマリー作成用のデータをダウンロードしたい場合
 *
 * ■ 機能
 * - Toolboxから起動
 * - 入院中の患者一覧から選択
 * - マークダウン形式でダウンロード
 *
 * ■ 出力内容
 * - 患者基本情報（氏名、年齢、性別、主病名、入院日）
 * - 患者プロフィール（既往歴・ADL等）
 * - 現在の処方
 * - 注射履歴（期間スナップショット方式）
 * - 経過記録（バイタル、血糖、食事、尿量、医師記録、看護記録、リハビリ記録）
 * - 血液検査結果
 * - 褥瘡評価
 * - 日次データ推移テーブル
 * - 血液検査推移テーブル
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'SummaryExport';
  const VERSION = GM_info.script.version;

  // CUSTOMタイプのUUID
  const NURSING_RECORD_CUSTOM_TYPE_UUID = 'e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f';
  const PATIENT_PROFILE_CUSTOM_TYPE_UUID = 'f639619a-6fdb-452a-a803-8d42cd50830d';
  const PRESSURE_ULCER_CUSTOM_TYPE_UUID = '2d3b6bbf-3b3e-4a82-8f7f-e29a32352f52';

  // カレンダービューリソース
  const CALENDAR_RESOURCES = [
    '//henry-app.jp/clinicalResource/vitalSign',
    '//henry-app.jp/clinicalResource/prescriptionOrder',
    '//henry-app.jp/clinicalResource/injectionOrder',
    '//henry-app.jp/clinicalResource/nutritionOrder',
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
    '//henry-app.jp/clinicalResource/inspectionReport',
    '//henry-app.jp/clinicalResource/specimenInspectionOrder'
  ];

  // スプレッドシート設定
  const SUMMARY_SPREADSHEET_NAME = 'Henry_患者サマリー';
  let summarySpreadsheetId = null;
  let summaryCache = null;
  let summaryCacheLoading = null;

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

  // ====================
  // ユーティリティ関数
  // ====================

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  function cleanMedicineName(name) {
    if (!name) return '';
    return name
      .replace(/「[^」]+」/g, '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/．/g, '.')
      .replace(/，/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseEditorData(editorDataStr, options = {}) {
    try {
      const data = JSON.parse(editorDataStr);
      const lines = [];
      for (const block of data.blocks) {
        const text = block.text;
        if (!text || !text.trim()) continue;
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

  function parseReferenceValue(refValue) {
    if (!refValue) return null;
    const rangeMatch = refValue.match(/([0-9.]+)\s*[-～~]\s*([0-9.]+)/);
    if (rangeMatch) {
      return { low: parseFloat(rangeMatch[1]), high: parseFloat(rangeMatch[2]) };
    }
    const upperMatch = refValue.match(/([0-9.]+)\s*以下/) || refValue.match(/[≦<=]\s*([0-9.]+)/);
    if (upperMatch) {
      return { low: null, high: parseFloat(upperMatch[1]) };
    }
    const lowerMatch = refValue.match(/([0-9.]+)\s*以上/) || refValue.match(/[≧>=]\s*([0-9.]+)/);
    if (lowerMatch) {
      return { low: parseFloat(lowerMatch[1]), high: null };
    }
    return null;
  }

  function judgeAbnormality(value, refValue) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return { isAbnormal: false, type: 'NORMAL' };
    const range = parseReferenceValue(refValue);
    if (!range) return { isAbnormal: false, type: 'NORMAL' };
    if (range.low !== null && numValue < range.low) return { isAbnormal: true, type: 'LOW' };
    if (range.high !== null && numValue > range.high) return { isAbnormal: true, type: 'HIGH' };
    return { isAbnormal: false, type: 'NORMAL' };
  }

  function toIsoDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ====================
  // 入院患者一覧取得（インライン方式）
  // ====================

  async function fetchAllHospitalizedPatients() {
    try {
      const today = new Date();

      // フルクエリ + インライン形式（変数形式は型定義がスキーマに存在しないためエラー）
      // NOTE: このクエリは /graphql でのみ利用可能（/graphql-v2 では未定義）
      const query = `
        query ListDailyWardHospitalizations {
          listDailyWardHospitalizations(input: {
            wardIds: [],
            searchDate: { year: ${today.getFullYear()}, month: ${today.getMonth() + 1}, day: ${today.getDate()} },
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
                  startDate { year month day }
                  endDate { year month day }
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
                  hospitalizationDoctor {
                    doctor { name }
                  }
                  hospitalizationDayCount { value }
                  lastHospitalizationLocationUuid
                  statusHospitalizationLocation {
                    ward { name }
                    room { name }
                  }
                }
              }
            }
          }
        }
      `;

      // NOTE: このクエリは /graphql でのみ利用可能
      const result = await window.HenryCore.query(query, {}, { endpoint: '/graphql' });

      if (result?.errors) {
        console.error(`[${SCRIPT_NAME}] GraphQL errors:`, result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      const wards = result?.data?.listDailyWardHospitalizations?.dailyWardHospitalizations || [];
      const allPatients = [];

      for (const ward of wards) {
        const rooms = ward.roomHospitalizationDistributions || [];
        for (const room of rooms) {
          const hospitalizations = room.hospitalizations || [];
          for (const hosp of hospitalizations) {
            // 入院中（ADMITTED/HOSPITALIZED/WILL_DISCHARGE）のみ
            if (hosp.state !== 'ADMITTED' && hosp.state !== 'HOSPITALIZED' && hosp.state !== 'WILL_DISCHARGE') continue;
            // 病棟名・部屋名は statusHospitalizationLocation から取得
            const wardName = hosp.statusHospitalizationLocation?.ward?.name || '';
            const roomName = hosp.statusHospitalizationLocation?.room?.name || '';
            allPatients.push({
              ...hosp,
              wardName,
              roomName
            });
          }
        }
      }

      // 病棟・部屋・名前順でソート
      allPatients.sort((a, b) => {
        if (a.wardName !== b.wardName) return a.wardName.localeCompare(b.wardName);
        if (a.roomName !== b.roomName) return a.roomName.localeCompare(b.roomName);
        return (a.patient?.fullName || '').localeCompare(b.patient?.fullName || '');
      });

      return allPatients;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院患者一覧取得エラー:`, e?.message || e);
      return [];
    }
  }

  // ====================
  // データ取得関数
  // ====================

  async function fetchHospitalization(patientUuid) {
    const query = `
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
    try {
      const result = await window.HenryCore.query(query);
      const hospitalizations = result?.data?.listPatientHospitalizations?.hospitalizations || [];
      return hospitalizations.find(h => h.state === 'HOSPITALIZED' || h.state === 'ADMITTED' || h.state === 'WILL_DISCHARGE') || hospitalizations[0] || null;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院情報取得エラー:`, e);
      return null;
    }
  }

  async function fetchHospitalizationDisease(patientUuid) {
    const query = `query ListPatientReceiptDiseases($input: ListPatientReceiptDiseasesRequestInput!) {
      listPatientReceiptDiseases(input: $input) {
        patientReceiptDiseases { patientUuid isMain masterDisease { name } masterModifiers { name position } }
      }
    }`;
    try {
      const result = await window.HenryCore.query(query, {
        input: { patientUuids: [patientUuid], patientCareType: 'PATIENT_CARE_TYPE_INPATIENT' }
      });
      const diseases = result?.data?.listPatientReceiptDiseases?.patientReceiptDiseases || [];
      const mainDisease = diseases.find(d => d.isMain && d.patientUuid === patientUuid);
      if (!mainDisease) return null;
      const baseName = mainDisease.masterDisease?.name || '';
      const modifiers = mainDisease.masterModifiers || [];
      const prefixes = modifiers.filter(m => m.position === 'PREFIX').map(m => m.name).join('');
      const suffixes = modifiers.filter(m => m.position === 'SUFFIX').map(m => m.name).join('');
      return prefixes + baseName + suffixes;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院病名取得エラー:`, e);
      return null;
    }
  }

  async function fetchDoctorRecords(patientUuid) {
    const allDocuments = [];
    try {
      const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
        input: {
          patientUuid,
          pageToken: '',
          pageSize: 50,
          clinicalDocumentTypes: [{ type: 'HOSPITALIZATION_CONSULTATION' }]
        }
      });
      const documents = result?.data?.listClinicalDocuments?.documents || [];
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
      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 医師記録取得エラー:`, e);
      return [];
    }
  }

  async function fetchNursingRecords(patientUuid) {
    const allDocuments = [];
    try {
      const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
        input: {
          patientUuid,
          pageToken: '',
          pageSize: 50,
          clinicalDocumentTypes: [{
            type: 'CUSTOM',
            clinicalDocumentCustomTypeUuid: { value: NURSING_RECORD_CUSTOM_TYPE_UUID }
          }]
        }
      });
      const documents = result?.data?.listClinicalDocuments?.documents || [];
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
      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 看護記録取得エラー:`, e);
      return [];
    }
  }

  async function fetchRehabRecords(patientUuid) {
    const allDocuments = [];
    try {
      const today = new Date();
      const query = `
        query ListRehabilitationDocuments {
          listRehabilitationDocuments(input: {
            patientUuid: "${patientUuid}",
            date: {
              year: ${today.getFullYear()},
              month: ${today.getMonth() + 1},
              day: ${today.getDate()}
            },
            pageSize: 50,
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

  async function fetchPatientProfile(patientUuid) {
    try {
      const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
        input: {
          patientUuid,
          pageToken: '',
          pageSize: 10,
          clinicalDocumentTypes: [{
            type: 'CUSTOM',
            clinicalDocumentCustomTypeUuid: { value: PATIENT_PROFILE_CUSTOM_TYPE_UUID }
          }]
        }
      });
      const documents = result?.data?.listClinicalDocuments?.documents || [];
      if (documents.length === 0) return null;
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

  async function fetchPressureUlcerRecords(patientUuid) {
    const allDocuments = [];
    try {
      const result = await window.HenryCore.query(QUERIES.LIST_CLINICAL_DOCUMENTS, {
        input: {
          patientUuid,
          pageToken: '',
          pageSize: 50,
          clinicalDocumentTypes: [{
            type: 'CUSTOM',
            clinicalDocumentCustomTypeUuid: { value: PRESSURE_ULCER_CUSTOM_TYPE_UUID }
          }]
        }
      });
      const documents = result?.data?.listClinicalDocuments?.documents || [];
      for (const doc of documents) {
        const parsed = parsePressureUlcerEditorData(doc.editorData);
        if (parsed) {
          const date = doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null;
          allDocuments.push({
            uuid: doc.uuid,
            date,
            recordDate: date ? { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() } : null,
            author: doc.creator?.name || '不明',
            editorData: doc.editorData,
            ...parsed
          });
        }
      }
      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 褥瘡評価取得エラー:`, e);
      return [];
    }
  }

  function parsePressureUlcerEditorData(editorDataStr) {
    try {
      const data = JSON.parse(editorDataStr);
      const blocks = data.blocks || [];
      let site = '';
      let totalScore = '';
      const designR = { D: null, E: null, S: null, I: null, G: null, N: null, P: null };
      const designRPatterns = {
        D: /^([dD]\d+|[dD][DU]TI?|[dD]U)/i,
        E: /^([eE]\d+)/,
        S: /^([sS]\d+)/,
        I: /^([iI]\d+[CcGg]?)/,
        G: /^([gG]\d+)/,
        N: /^([nN]\d+)/,
        P: /^([pP]\d+)/
      };
      for (const block of blocks) {
        const text = (block.text || '').trim();
        const isCheckbox = block.data?.checkboxListItem;
        const isChecked = isCheckbox?.checked === 'checked';
        const totalMatch = text.match(/合計点\s*[:：]\s*[０-９\d]+点?\s*部位\s*[:：]\s*(.+)/);
        if (totalMatch) {
          const scoreMatch = text.match(/合計点\s*[:：]\s*([０-９\d]+)/);
          if (scoreMatch) {
            totalScore = scoreMatch[1].replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
          }
          site = totalMatch[1].trim();
          continue;
        }
        const siteOnlyMatch = text.match(/^部位\s*[:：]\s*(.+)/);
        if (siteOnlyMatch && !site) {
          site = siteOnlyMatch[1].trim();
          continue;
        }
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
      if (!totalScore) {
        const scoreItems = ['E', 'S', 'I', 'G', 'N', 'P'];
        let calculatedScore = 0;
        let hasAnyScore = false;
        for (const key of scoreItems) {
          const value = designR[key];
          if (value) {
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
      const hasData = site || totalScore || Object.values(designR).some(v => v !== null);
      if (!hasData) return null;
      return { site, totalScore, designR };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 褥瘡editorDataパースエラー:`, e);
      return null;
    }
  }

  async function fetchCalendarData(patientUuid, hospitalizationStartDate, maxDays = 30) {
    try {
      const today = new Date();
      const startDate = new Date(hospitalizationStartDate);
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
            prescriptionOrders {
              uuid
              createTime { seconds }
              orderStatus
              doctor { name }
              rps {
                boundsDurationDays { value }
                instructions {
                  instruction {
                    medicationDosageInstruction {
                      localMedicine { name }
                      mhlwMedicine { name }
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
                    }
                  }
                }
              }
            }
            nutritionOrders {
              uuid
              createTime { seconds }
              orderStatus
              startDate { year month day }
              endDate { year month day }
              detail {
                dietaryRegimen { name }
              }
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
      return {
        vitalSigns: data?.vitalSigns || [],
        prescriptionOrders: data?.prescriptionOrders || [],
        injectionOrders: data?.injectionOrders || [],
        nutritionOrders: data?.nutritionOrders || [],
        clinicalQuantitativeDataModuleCollections: data?.clinicalQuantitativeDataModuleCollections || [],
        outsideInspectionReportGroups: data?.outsideInspectionReportGroups || []
      };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] カレンダーデータ取得エラー:`, e);
      return null;
    }
  }

  // ====================
  // スプレッドシート連携
  // ====================

  async function findSummarySpreadsheet() {
    if (summarySpreadsheetId) return summarySpreadsheetId;
    const auth = window.HenryCore?.modules?.GoogleAuth;
    if (!auth) return null;
    const tokens = await auth.getTokens();
    if (!tokens?.access_token) return null;
    const query = encodeURIComponent(`name='${SUMMARY_SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and 'root' in parents and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      summarySpreadsheetId = data.files[0].id;
      return summarySpreadsheetId;
    }
    return null;
  }

  async function loadAllSummaries() {
    if (summaryCacheLoading) return summaryCacheLoading;
    if (summaryCache !== null) return summaryCache;

    summaryCacheLoading = (async () => {
      try {
        const spreadsheetId = await findSummarySpreadsheet();
        if (!spreadsheetId) {
          summaryCache = {};
          return summaryCache;
        }
        const auth = window.HenryCore?.modules?.GoogleAuth;
        const tokens = await auth.getTokens();
        if (!tokens?.access_token) {
          summaryCache = {};
          return summaryCache;
        }
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/サマリー!A:E`,
          { headers: { 'Authorization': `Bearer ${tokens.access_token}` } }
        );
        if (!response.ok) {
          summaryCache = {};
          return summaryCache;
        }
        const result = await response.json();
        const rows = result.values || [];
        summaryCache = {};
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[0]) {
            summaryCache[row[0]] = {
              rowIndex: i + 1,
              summary: row[1] || '',
              summaryUpdatedAt: row[2] || '',
              profile: row[3] || '',
              profileUpdatedAt: row[4] || ''
            };
          }
        }
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

  // ====================
  // データ抽出・整形関数
  // ====================

  function groupVitalsByDate(vitalSigns) {
    const byDate = new Map();
    for (const vs of vitalSigns) {
      const date = vs.recordTime?.seconds ? new Date(vs.recordTime.seconds * 1000) : null;
      if (!date) continue;
      const key = dateKey(date);
      if (!byDate.has(key)) {
        byDate.set(key, []);
      }
      byDate.get(key).push({ date, rawData: vs });
    }
    return byDate;
  }

  function extractMealIntakeData(moduleCollections, nutritionOrders, hospStartDate, hospEndDate) {
    const mealPatterns = ['朝食(主)', '朝食(副)', '昼食(主)', '昼食(副)', '夕食(主)', '夕食(副)'];
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
          byDate.set(key, { date, entries: [] });
        }
        const entries = mod.entries || [];
        for (const entry of entries) {
          const name = entry.name || '';
          if (mealPatterns.some(pattern => name.includes(pattern))) {
            byDate.get(key).entries.push({ name, value: entry.value });
          }
        }
      }
    }

    const result = [];
    for (const [key, dayData] of byDate) {
      const nutritionInfo = getNutritionInfoForDate(dayData.date, nutritionOrders);
      const dietType = nutritionInfo?.name;
      const supplies = nutritionInfo?.supplies || [];
      const mealText = formatMealIntake(dayData.entries);
      const suppliesText = formatNutritionSupplies(supplies, dietType);

      let text;
      if (dietType === '絶食') {
        text = '【絶食】';
      } else if (dietType && mealText) {
        text = `【${dietType}】${mealText}`;
      } else if (dietType && suppliesText) {
        text = `【${dietType}】${suppliesText}`;
      } else if (dietType) {
        text = `【${dietType}】`;
      } else if (mealText) {
        text = mealText;
      } else {
        continue;
      }

      result.push({
        id: `meal-${key}`,
        category: 'meal',
        date: dayData.date,
        text
      });
    }
    return result;
  }

  function getNutritionInfoForDate(date, nutritionOrders) {
    let latestPastOrder = null;
    let latestPastEndDate = null;

    for (const order of nutritionOrders) {
      if (order.isDraft) continue;
      const start = order.startDate;
      const end = order.endDate;
      if (!start) continue;

      const startDate = new Date(start.year, start.month - 1, start.day);
      const endDate = end ? new Date(end.year, end.month - 1, end.day) : null;
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(0, 0, 0, 0);

      if (startDate <= targetDate && (!endDate || endDate >= targetDate)) {
        return extractNutritionInfo(order);
      }

      if (endDate && endDate < targetDate) {
        if (!latestPastEndDate || endDate > latestPastEndDate) {
          latestPastEndDate = endDate;
          latestPastOrder = order;
        }
      }
    }

    if (latestPastOrder) {
      return extractNutritionInfo(latestPastOrder);
    }
    return null;
  }

  function extractNutritionInfo(order) {
    const dietName = order.detail?.dietaryRegimen?.name
      || order.detail?.supplies?.[0]?.food?.name
      || null;
    return {
      name: dietName,
      supplies: order.detail?.supplies || []
    };
  }

  function formatMealIntake(entries) {
    if (!entries || entries.length === 0) return '';
    const meals = { 朝: { main: null, side: null }, 昼: { main: null, side: null }, 夕: { main: null, side: null } };
    for (const entry of entries) {
      const name = entry.name || '';
      const value = entry.value;
      if (name.includes('朝食(主)')) meals.朝.main = value;
      else if (name.includes('朝食(副)')) meals.朝.side = value;
      else if (name.includes('昼食(主)')) meals.昼.main = value;
      else if (name.includes('昼食(副)')) meals.昼.side = value;
      else if (name.includes('夕食(主)')) meals.夕.main = value;
      else if (name.includes('夕食(副)')) meals.夕.side = value;
    }
    const parts = [];
    for (const [time, data] of Object.entries(meals)) {
      if (data.main !== null || data.side !== null) {
        const main = data.main ?? '-';
        const side = data.side ?? '-';
        parts.push(`${time}${main}/${side}`);
      }
    }
    return parts.join(' ');
  }

  function formatNutritionSupplies(supplies, dietType) {
    if (!supplies || supplies.length === 0) return '';
    if (dietType === '絶食') return '';
    const items = supplies.map(s => {
      const foodName = s.food?.name || '';
      const amount = s.amount?.value || '';
      const unit = s.amount?.unit || '';
      return amount ? `${foodName} ${amount}${unit}` : foodName;
    }).filter(Boolean);
    if (items.length === 0) return '';
    return `毎食: ${items.join(', ')}`;
  }

  function extractUrineData(moduleCollections) {
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
              byDate.set(key, { date: new Date(year, month - 1, day), totalUrine: value });
            }
          }
        }
      }
    }
    const result = [];
    for (const [key, data] of byDate) {
      result.push({
        id: `urine-${key}`,
        category: 'urine',
        date: data.date,
        text: `【尿量】${data.totalUrine}mL`
      });
    }
    return result;
  }

  function extractBloodSugarInsulinData(moduleCollections) {
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
            date,
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
          if (name.includes('血糖値(朝)') && value != null) dayData.bloodSugar.morning = parseInt(value, 10);
          else if (name.includes('血糖値(昼)') && value != null) dayData.bloodSugar.noon = parseInt(value, 10);
          else if (name.includes('血糖値(夕)') && value != null) dayData.bloodSugar.evening = parseInt(value, 10);
          if (name.includes('薬剤名') && value) dayData.insulinDrug = value;
          if (name.includes('単位(朝)') && value != null) dayData.insulinUnit.morning = parseFloat(value);
          else if (name.includes('単位(昼)') && value != null) dayData.insulinUnit.noon = parseFloat(value);
          else if (name.includes('単位(夕)') && value != null) dayData.insulinUnit.evening = parseFloat(value);
        }
      }
    }
    const result = [];
    for (const [key, data] of byDate) {
      const hasBloodSugar = data.bloodSugar.morning != null || data.bloodSugar.noon != null || data.bloodSugar.evening != null;
      if (!hasBloodSugar) continue;
      const bsParts = [];
      const drug = data.insulinDrug || '';
      if (data.bloodSugar.morning != null) {
        let part = `朝${data.bloodSugar.morning}`;
        if (drug && data.insulinUnit.morning != null) part += `(${drug}${data.insulinUnit.morning}U)`;
        bsParts.push(part);
      }
      if (data.bloodSugar.noon != null) {
        let part = `昼${data.bloodSugar.noon}`;
        if (drug && data.insulinUnit.noon != null) part += `(${drug}${data.insulinUnit.noon}U)`;
        bsParts.push(part);
      }
      if (data.bloodSugar.evening != null) {
        let part = `夕${data.bloodSugar.evening}`;
        if (drug && data.insulinUnit.evening != null) part += `(${drug}${data.insulinUnit.evening}U)`;
        bsParts.push(part);
      }
      result.push({
        id: `bloodSugar-${key}`,
        category: 'bloodSugar',
        date: data.date,
        text: `【血糖値】${bsParts.join('　')}`
      });
    }
    return result;
  }

  function extractInHouseBloodTests(moduleCollections) {
    const INHOUSE_BLOOD_TEST_UUID = '614e72ad-78ed-4aba-98a9-25d87efcf846';
    const result = [];
    for (const collection of moduleCollections) {
      const hrn = collection?.cqdDefHrn || '';
      if (!hrn.includes(INHOUSE_BLOOD_TEST_UUID)) continue;
      const modules = (collection?.clinicalQuantitativeDataModules || []).map(mod => {
        const dateRange = mod.recordDateRange?.start;
        const key = dateRange ? `${dateRange.year}-${String(dateRange.month).padStart(2, '0')}-${String(dateRange.day).padStart(2, '0')}` : null;
        const entries = (mod.entries || []).map(e => ({ name: e.name, value: e.value, unit: e.unit?.value || '' }));
        return { dateKey: key, entries, title: mod.title };
      }).filter(m => m.dateKey);
      result.push({ modules });
    }
    return result;
  }

  function extractBloodTestResults(outsideInspectionReportGroups, inHouseBloodTests) {
    const byDate = new Map();
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

    for (const group of outsideInspectionReportGroups) {
      const categoryName = group.name || '未分類';
      const rows = group.outsideInspectionReportRows || [];
      for (const row of rows) {
        const itemName = row.name || '不明';
        if (itemName === '末梢血液一般') continue;
        const referenceValue = row.standardValue?.value || '';
        const reports = row.outsideInspectionReports || [];
        if (referenceValue) referenceValueMap.set(itemName, referenceValue);
        for (const report of reports) {
          if (!report.date) continue;
          const { year, month, day } = report.date;
          const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!byDate.has(key)) byDate.set(key, new Map());
          const categoryMap = byDate.get(key);
          if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, []);
          const rawValue = report.value || '-';
          const valueParts = rawValue.split(/[\u200B\u200C\u200D\uFEFF]+/).filter(Boolean);
          const value = valueParts[0] || rawValue;
          categoryMap.get(categoryName).push({
            name: itemName,
            value,
            isAbnormal: report.isAbnormal || false,
            abnormalityType: report.abnormalityType || 'NORMAL',
            referenceValue
          });
        }
      }
    }

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

    for (const inHouse of inHouseBloodTests) {
      for (const mod of inHouse.modules) {
        const key = mod.dateKey;
        if (!key) continue;
        if (!byDate.has(key)) byDate.set(key, new Map());
        const categoryMap = byDate.get(key);
        for (const entry of mod.entries) {
          const mapping = INHOUSE_TO_OUTSIDE_MAP[entry.name];
          if (!mapping) continue;
          const categoryName = mapping.category;
          const itemName = mapping.name;
          if (!categoryMap.has(categoryName)) categoryMap.set(categoryName, []);
          const refValue = referenceValueMap.get(itemName) || '';
          const { isAbnormal, type } = judgeAbnormality(entry.value, refValue);
          categoryMap.get(categoryName).push({
            name: itemName,
            value: entry.value,
            isAbnormal,
            abnormalityType: type,
            referenceValue: refValue
          });
        }
      }
    }

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
    return sortedDates.map(key => ({ dateKey: key, categories: byDate.get(key) }));
  }

  function formatVitalsText(vitals) {
    if (!vitals || vitals.length === 0) return '';
    const sorted = [...vitals].sort((a, b) => (a.date || 0) - (b.date || 0));
    const lines = [];
    // テーブルヘッダー
    lines.push('| 時刻 | T | BP | P | SpO2 |');
    lines.push('|------|------|--------|-----|------|');
    for (const vs of sorted) {
      const time = vs.date ? `${vs.date.getHours()}:${String(vs.date.getMinutes()).padStart(2, '0')}` : '-';
      let temp = '-', bp = '-', pulse = '-', spo2 = '-';
      if (vs.rawData?.temperature?.value) temp = String(vs.rawData.temperature.value / 10);
      if (vs.rawData?.bloodPressureUpperBound?.value && vs.rawData?.bloodPressureLowerBound?.value) {
        bp = `${vs.rawData.bloodPressureUpperBound.value / 10}/${vs.rawData.bloodPressureLowerBound.value / 10}`;
      }
      if (vs.rawData?.pulseRate?.value) pulse = String(vs.rawData.pulseRate.value / 10);
      if (vs.rawData?.spo2?.value) spo2 = String(vs.rawData.spo2.value / 10);
      lines.push(`| ${time} | ${temp} | ${bp} | ${pulse} | ${spo2} |`);
    }
    return lines.join('\n');
  }

  // ====================
  // マークダウン生成
  // ====================

  function formatDataForAI(patientDetails, hospitalization, disease, profile, cachedSummary, allItems, activePrescriptions, activeInjections, bloodTestResults, pressureUlcerRecords) {
    if (!patientDetails || !hospitalization) return null;

    const lines = [];
    const today = new Date();
    const todayIso = toIsoDate(today);

    const hospStart = hospitalization.startDate;
    const startDateIso = `${hospStart.year}-${String(hospStart.month).padStart(2, '0')}-${String(hospStart.day).padStart(2, '0')}`;
    const dayCount = hospitalization.hospitalizationDayCount?.value || '-';

    const age = calculateAge(patientDetails.birthDate);
    const sex = patientDetails.sex || '';
    // FEMALEにはMALEが含まれるので、FEMALEを先に判定
    const gender = sex.includes('FEMALE') ? '女性' : sex.includes('MALE') ? '男性' : '不明';
    const diseaseName = disease || '未登録';

    // === フロントマター ===
    lines.push('---');
    lines.push(`patient_id: "${patientDetails.uuid}"`);
    lines.push(`export_date: "${todayIso}"`);
    lines.push(`admission_date: "${startDateIso}"`);
    lines.push(`hospital_day: ${dayCount}`);
    lines.push(`source_system: "Henry_EMR"`);
    lines.push(`doc_type: "patient_timeline_summary"`);
    lines.push('---\n');

    // === 患者基本情報 ===
    lines.push('# 入院患者データ（AIサマリー作成用）\n');

    lines.push('## 患者基本情報\n');
    lines.push(`- 年齢・性別: ${age}歳 ${gender}`);
    lines.push(`- 主病名: ${diseaseName}`);
    lines.push(`- 入院日: ${startDateIso}（${dayCount}日目）`);
    if (hospitalization.lastHospitalizationLocation) {
      const loc = hospitalization.lastHospitalizationLocation;
      lines.push(`- 病棟・病室: ${loc.ward?.name || ''} ${loc.room?.name || ''}`);
    }
    lines.push('');

    // === 患者プロフィール ===
    let profileText = '';
    if (cachedSummary && cachedSummary.profile) {
      profileText = cachedSummary.profile;
    } else if (profile && profile.text) {
      profileText = profile.text.split('\n')
        .filter(line => !line.includes('患者プロフィール'))
        .join('\n');
    }
    if (profileText) {
      lines.push('## 患者プロフィール（既往歴・ADL等）\n');
      lines.push(profileText);
      lines.push('');
    }

    // === 処方履歴 ===
    if (activePrescriptions.length > 0) {
      lines.push('## 現在の処方\n');
      for (const rx of activePrescriptions) {
        const createDate = rx.createTime?.seconds ? new Date(rx.createTime.seconds * 1000) : null;
        const dateStr = createDate ? toIsoDate(createDate) : '不明';
        for (const rp of (rx.rps || [])) {
          const medicines = (rp.instructions || []).map(inst => {
            const med = inst.instruction?.medicationDosageInstruction;
            const name = cleanMedicineName(med?.localMedicine?.name || med?.medicine?.name || '');
            const dosage = med?.text || '';
            return name ? `${name} ${dosage}`.trim() : null;
          }).filter(Boolean);
          if (medicines.length > 0) {
            lines.push(`- ${medicines.join(', ')}（${dateStr}〜）`);
          }
        }
      }
      lines.push('');
    }

    // === 注射履歴 ===
    if (activeInjections.length > 0) {
      const injectionPeriods = [];
      for (const inj of activeInjections) {
        if (['ORDER_STATUS_ON_HOLD', 'ORDER_STATUS_DRAFT'].includes(inj.orderStatus)) continue;
        for (const rp of (inj.rps || [])) {
          const technique = (rp.localInjectionTechnique?.name || '').replace(/，/g, ',') || 'その他';
          const medicines = (rp.instructions || []).map(inst => {
            const med = inst.instruction?.medicationDosageInstruction;
            const rawName = med?.localMedicine?.name || med?.mhlwMedicine?.name || null;
            return rawName ? cleanMedicineName(rawName) : null;
          }).filter(Boolean);
          if (medicines.length > 0 && inj.startDate) {
            const startDate = new Date(inj.startDate.year, inj.startDate.month - 1, inj.startDate.day);
            const duration = rp.boundsDurationDays?.value || 1;
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + duration - 1);
            const isActive = inj.orderStatus === 'ORDER_STATUS_ACTIVE';
            injectionPeriods.push({
              startDate,
              endDate: isActive ? null : endDate,
              technique,
              medicines: medicines.join(', '),
              isActive
            });
          }
        }
      }

      if (injectionPeriods.length > 0) {
        const boundaries = new Set();
        const todayNorm = new Date();
        todayNorm.setHours(0, 0, 0, 0);
        for (const period of injectionPeriods) {
          boundaries.add(period.startDate.getTime());
          if (period.endDate) {
            const nextDay = new Date(period.endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            boundaries.add(nextDay.getTime());
          }
        }
        boundaries.add(todayNorm.getTime());
        const sortedBoundaries = [...boundaries].sort((a, b) => a - b);

        lines.push('## 注射履歴\n');
        for (let i = 0; i < sortedBoundaries.length - 1; i++) {
          const periodStart = new Date(sortedBoundaries[i]);
          const periodEnd = new Date(sortedBoundaries[i + 1]);
          const activeInPeriod = injectionPeriods.filter(period => {
            const effectiveEnd = period.endDate || todayNorm;
            return period.startDate <= periodStart && effectiveEnd >= periodStart;
          });
          if (activeInPeriod.length === 0) continue;
          const startStr = toIsoDate(periodStart);
          const endDateForDisplay = new Date(periodEnd);
          endDateForDisplay.setDate(endDateForDisplay.getDate() - 1);
          const endStr = toIsoDate(endDateForDisplay);
          const isCurrentPeriod = periodEnd.getTime() > todayNorm.getTime();
          const periodLabel = isCurrentPeriod ? `### 現在投与中（${startStr}〜）` : `### ${startStr}〜${endStr}`;
          lines.push(periodLabel);
          const byTechnique = new Map();
          for (const item of activeInPeriod) {
            if (!byTechnique.has(item.technique)) byTechnique.set(item.technique, []);
            byTechnique.get(item.technique).push(item.medicines);
          }
          for (const [technique, meds] of byTechnique) {
            const uniqueMeds = [...new Set(meds)];
            lines.push(`- ${technique}: ${uniqueMeds.join(', ')}`);
          }
          lines.push('');
        }
      }
    }

    // === 経過記録 ===
    lines.push('## 経過記録\n');

    const allDates = new Set();
    const sortedItems = [...allItems]
      .filter(item => item.date && ['doctor', 'nursing', 'rehab', 'vital', 'meal', 'urine', 'bloodSugar'].includes(item.category))
      .sort((a, b) => a.date - b.date);

    for (const item of sortedItems) {
      allDates.add(dateKey(item.date));
    }

    const bloodTestByDate = new Map();
    for (const result of bloodTestResults) {
      allDates.add(result.dateKey);
      bloodTestByDate.set(result.dateKey, result);
    }

    const pressureUlcerByDate = new Map();
    if (pressureUlcerRecords && pressureUlcerRecords.length > 0) {
      for (const record of pressureUlcerRecords) {
        if (!record.recordDate) continue;
        const dk = `${record.recordDate.year}-${String(record.recordDate.month).padStart(2, '0')}-${String(record.recordDate.day).padStart(2, '0')}`;
        allDates.add(dk);
        if (!pressureUlcerByDate.has(dk)) pressureUlcerByDate.set(dk, []);
        pressureUlcerByDate.get(dk).push(record);
      }
    }

    const groupedByDate = new Map();
    for (const item of sortedItems) {
      const key = dateKey(item.date);
      if (!groupedByDate.has(key)) groupedByDate.set(key, []);
      groupedByDate.get(key).push(item);
    }

    const categoryLabels = {
      vital: 'バイタル',
      bloodSugar: '血糖値',
      meal: '食事',
      urine: '尿量',
      doctor: '医師記録',
      nursing: '看護記録',
      rehab: 'リハビリ記録'
    };
    const categoryOrder = ['vital', 'bloodSugar', 'meal', 'urine', 'doctor', 'nursing', 'rehab'];

    const sortedDates = Array.from(allDates).sort();
    let isFirstRehabDay = true; // リハビリテンプレート表示用フラグ

    for (const dk of sortedDates) {
      lines.push(`### ${dk}\n`);
      const items = groupedByDate.get(dk) || [];
      const byCategory = new Map();
      for (const item of items) {
        if (!byCategory.has(item.category)) byCategory.set(item.category, []);
        byCategory.get(item.category).push(item);
      }

      for (const cat of categoryOrder) {
        const catItems = byCategory.get(cat);
        if (!catItems || catItems.length === 0) continue;
        const label = categoryLabels[cat] || cat;
        lines.push(`**${label}**`);
        for (const item of catItems) {
          let text = item.text.trim();

          // 看護記録: ＜SOAP＞ヘッダーを削除、空のS)/O)行を整理
          if (cat === 'nursing') {
            text = text.replace(/＜SOAP＞\n?/g, '');
            // 「S)\n内容」→「S)内容」に結合
            text = text.replace(/([SO])\)\s*\n\s*(?=[^\n])/g, '$1)');
          }

          // リハビリ記録: 2日目以降は【特記事項】以降のみを残す
          if (cat === 'rehab' && !isFirstRehabDay) {
            const specialNoteMatch = text.match(/【特記事項】[\s\S]*/);
            if (specialNoteMatch) {
              text = specialNoteMatch[0];
            }
          }

          lines.push(text);
        }
        // リハビリ記録があった日をマーク
        if (cat === 'rehab') {
          isFirstRehabDay = false;
        }
        lines.push('');
      }

      // 経過記録内の血液検査は削除（テーブルに統合）

      const pressureUlcers = pressureUlcerByDate.get(dk);
      if (pressureUlcers && pressureUlcers.length > 0) {
        lines.push('**褥瘡評価**');
        for (const record of pressureUlcers) {
          const parsed = parsePressureUlcerEditorData(record.editorData);
          if (!parsed) continue;
          const site = parsed.site || '部位不明';
          const score = parsed.totalScore ? `${parsed.totalScore}点` : '-';
          const designRItems = Object.entries(parsed.designR)
            .filter(([, v]) => v !== null)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ');
          lines.push(`${site} 合計${score} ${designRItems}`);
        }
        lines.push('');
      }
    }

    // === 日次データ推移テーブル ===
    const dailyDataDates = new Set();
    const vitalByDate = new Map();
    const bloodSugarByDate = new Map();
    const mealByDate = new Map();
    const urineByDate = new Map();

    for (const item of allItems) {
      if (!item.date) continue;
      const dk = dateKey(item.date);
      dailyDataDates.add(dk);
      if (item.category === 'vital' && item.vitals) vitalByDate.set(dk, item.vitals);
      else if (item.category === 'bloodSugar') bloodSugarByDate.set(dk, item.text);
      else if (item.category === 'meal') mealByDate.set(dk, item.text);
      else if (item.category === 'urine') urineByDate.set(dk, item.text);
    }

    if (dailyDataDates.size > 0) {
      lines.push('## 日次データ推移（テーブル）\n');
      const sortedDailyDates = Array.from(dailyDataDates).sort();
      lines.push('| 日付 | T (℃) | BP (mmHg) | P (bpm) | SpO2 (%) | 血糖 (朝/昼/夕) | 尿量 (mL) | 食事 |');
      lines.push('|------|--------|-----------|---------|----------|-----------------|-----------|------|');

      for (const dk of sortedDailyDates) {
        let temp = '-', bp = '-', pulse = '-', spo2 = '-';
        const vitals = vitalByDate.get(dk) || [];
        for (const vs of vitals) {
          const raw = vs.rawData || vs;
          if (temp === '-' && raw.temperature?.value) temp = String(raw.temperature.value / 10);
          if (bp === '-' && raw.bloodPressureUpperBound?.value && raw.bloodPressureLowerBound?.value) {
            bp = `${raw.bloodPressureUpperBound.value / 10}/${raw.bloodPressureLowerBound.value / 10}`;
          }
          if (pulse === '-' && raw.pulseRate?.value) pulse = String(raw.pulseRate.value / 10);
          if (spo2 === '-' && raw.spo2?.value) spo2 = String(raw.spo2.value / 10);
        }

        let bloodSugar = '-';
        const bsText = bloodSugarByDate.get(dk) || '';
        const bsMatch = bsText.match(/朝(\d+)?.*昼(\d+)?.*夕(\d+)?/);
        if (bsMatch) {
          bloodSugar = `${bsMatch[1] || '-'}/${bsMatch[2] || '-'}/${bsMatch[3] || '-'}`;
        } else if (bsText) {
          bloodSugar = bsText.replace(/【血糖・インスリン】/g, '').replace(/\n/g, ' ').slice(0, 20);
        }

        let urine = '-';
        const urineText = urineByDate.get(dk) || '';
        const urineMatch = urineText.match(/(\d+)mL/);
        if (urineMatch) urine = urineMatch[1];

        let meal = '-';
        const mealText = mealByDate.get(dk) || '';
        if (mealText) {
          meal = mealText.replace(/\n/g, ' ').slice(0, 30);
          if (mealText.length > 30) meal += '...';
        }

        lines.push(`| ${dk} | ${temp} | ${bp} | ${pulse} | ${spo2} | ${bloodSugar} | ${urine} | ${meal} |`);
      }
      lines.push('');
    }

    // === 血液検査推移テーブル ===
    if (bloodTestResults.length > 0) {
      lines.push('## 血液検査推移\n');
      const testDates = [...bloodTestResults].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).map(r => r.dateKey);

      // カテゴリごとに項目を整理
      const categoryItems = new Map();
      for (const result of bloodTestResults) {
        for (const [categoryName, items] of result.categories) {
          if (!categoryItems.has(categoryName)) {
            categoryItems.set(categoryName, new Map());
          }
          const itemsMap = categoryItems.get(categoryName);
          for (const item of items) {
            if (!itemsMap.has(item.name)) {
              itemsMap.set(item.name, { referenceValue: item.referenceValue || '-', dates: new Map() });
            }
            if (item.referenceValue && itemsMap.get(item.name).referenceValue === '-') {
              itemsMap.get(item.name).referenceValue = item.referenceValue;
            }
            itemsMap.get(item.name).dates.set(result.dateKey, {
              value: item.value,
              isAbnormal: item.isAbnormal,
              abnormalityType: item.abnormalityType
            });
          }
        }
      }

      // カテゴリごとにテーブル出力
      for (const [categoryName, itemsMap] of categoryItems) {
        lines.push(`### ${categoryName}\n`);
        lines.push(`| 項目 | 基準値 | ${testDates.join(' | ')} |`);
        lines.push(`|------|--------|${testDates.map(() => '------').join('|')}|`);
        for (const [itemName, itemData] of itemsMap) {
          const values = testDates.map(dk => {
            const data = itemData.dates.get(dk);
            if (!data) return '-';
            // 異常値は太字で表示
            if (data.isAbnormal) {
              return `**${data.value}**`;
            }
            return data.value;
          });
          lines.push(`| ${itemName} | ${itemData.referenceValue} | ${values.join(' | ')} |`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ====================
  // 患者選択モーダル
  // ====================

  async function showPatientSelectModal() {
    const spinner = window.HenryCore.ui.showSpinner('入院患者一覧を取得中...');

    try {
      const patients = await fetchAllHospitalizedPatients();
      spinner.close();

      if (patients.length === 0) {
        window.HenryCore.ui.showToast('入院中の患者がいません', 'info');
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
        font-family: "Noto Sans JP", system-ui, -apple-system, sans-serif;
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
        <h3 style="margin: 0; font-size: 18px; color: #333;">サマリー用データ出力</h3>
        <button id="close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
      `;

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

      const isTherapyWard = (wardName) => (wardName || '').includes('療養');
      const selectedTherapyUuids = new Set();
      const generalCount = patients.filter(p => !isTherapyWard(p.wardName)).length;
      let downloadAllBtn = null;

      function updateDownloadButton() {
        if (!downloadAllBtn) return;
        const therapyCount = selectedTherapyUuids.size;
        const total = generalCount + therapyCount;
        downloadAllBtn.textContent = `一括ダウンロード（${total}名）`;
      }

      function renderPatientList(filterText = '') {
        const filtered = patients.filter(p => {
          const name = p.patient?.fullName || '';
          const kana = p.patient?.kanaName || '';
          return name.includes(filterText) || kana.includes(filterText);
        });

        listContainer.innerHTML = '';

        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">該当する患者がいません</div>';
          return;
        }

        let currentWard = '';
        for (const p of filtered) {
          // 病棟ヘッダー
          if (p.wardName !== currentWard) {
            currentWard = p.wardName;
            const wardHeader = document.createElement('div');
            wardHeader.style.cssText = `
              padding: 8px 20px;
              background: #f5f5f5;
              font-size: 12px;
              color: #666;
              font-weight: 500;
            `;
            wardHeader.textContent = currentWard || '病棟不明';
            listContainer.appendChild(wardHeader);
          }

          const isTherapy = isTherapyWard(p.wardName);

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

          if (isTherapy) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedTherapyUuids.has(p.patient?.uuid);
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;';
            checkbox.addEventListener('click', (e) => e.stopPropagation());
            checkbox.addEventListener('change', (e) => {
              if (e.target.checked) {
                selectedTherapyUuids.add(p.patient?.uuid);
              } else {
                selectedTherapyUuids.delete(p.patient?.uuid);
              }
              updateDownloadButton();
            });
            row.appendChild(checkbox);
          }

          const dayCount = p.hospitalizationDayCount?.value || '-';
          const roomName = p.roomName || '';

          const infoDiv = document.createElement('div');
          infoDiv.style.cssText = 'flex: 1;';
          infoDiv.innerHTML = `
            <div style="font-size: 15px; font-weight: 500; color: #333;">${p.patient?.fullName || '不明'}</div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">${roomName} / ${dayCount}日目</div>
          `;
          row.appendChild(infoDiv);

          if (isTherapy) {
            row.addEventListener('click', () => {
              const uuid = p.patient?.uuid;
              if (selectedTherapyUuids.has(uuid)) {
                selectedTherapyUuids.delete(uuid);
              } else {
                selectedTherapyUuids.add(uuid);
              }
              const cb = row.querySelector('input[type="checkbox"]');
              if (cb) cb.checked = selectedTherapyUuids.has(uuid);
              updateDownloadButton();
            });
          } else {
            const actionDiv = document.createElement('div');
            actionDiv.style.cssText = 'color: #1976d2; font-size: 13px;';
            actionDiv.textContent = '選択';
            row.appendChild(actionDiv);

            row.addEventListener('click', async () => {
              overlay.remove();
              await downloadSummaryDataForPatient(p);
            });
          }

          listContainer.appendChild(row);
        }
      }

      renderPatientList();

      // フッター（全員ダウンロードボタン）
      const footer = document.createElement('div');
      footer.style.cssText = `
        padding: 12px 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      `;

      downloadAllBtn = document.createElement('button');
      downloadAllBtn.style.cssText = `
        padding: 10px 20px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.15s;
      `;
      updateDownloadButton();
      downloadAllBtn.addEventListener('mouseover', () => downloadAllBtn.style.background = '#1565c0');
      downloadAllBtn.addEventListener('mouseout', () => downloadAllBtn.style.background = '#1976d2');
      downloadAllBtn.addEventListener('click', async () => {
        const targetPatients = patients.filter(p => {
          if (!isTherapyWard(p.wardName)) return true;
          return selectedTherapyUuids.has(p.patient?.uuid);
        });
        if (targetPatients.length === 0) {
          window.HenryCore.ui.showToast('ダウンロード対象の患者がいません', 'info');
          return;
        }
        overlay.remove();
        await downloadAllPatients(targetPatients);
      });

      footer.appendChild(downloadAllBtn);

      modal.appendChild(header);
      modal.appendChild(searchBox);
      modal.appendChild(listContainer);
      modal.appendChild(footer);
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
      window.HenryCore.ui.showToast('患者一覧の取得に失敗しました', 'error');
    }
  }

  // ====================
  // サマリーデータダウンロード
  // ====================

  async function downloadAllPatients(patients) {
    const total = patients.length;
    let completed = 0;
    let failed = 0;
    let cancelled = false;

    // 進捗表示用オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1500;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Noto Sans JP", system-ui, -apple-system, sans-serif;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      padding: 24px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      text-align: center;
      min-width: 300px;
    `;

    const progressText = document.createElement('div');
    progressText.style.cssText = 'font-size: 16px; color: #333; margin-bottom: 8px;';
    progressText.textContent = `データ取得中... (0/${total})`;

    const patientText = document.createElement('div');
    patientText.style.cssText = 'font-size: 14px; color: #666; margin-bottom: 16px;';
    patientText.textContent = '';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '中止';
    cancelBtn.style.cssText = `
      padding: 8px 24px;
      background: #e0e0e0;
      color: #333;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    `;
    cancelBtn.addEventListener('mouseover', () => cancelBtn.style.background = '#d0d0d0');
    cancelBtn.addEventListener('mouseout', () => cancelBtn.style.background = '#e0e0e0');
    cancelBtn.addEventListener('click', () => { cancelled = true; });

    container.appendChild(progressText);
    container.appendChild(patientText);
    container.appendChild(cancelBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    for (const p of patients) {
      if (cancelled) break;

      const name = p.patient?.fullName || '不明';
      progressText.textContent = `データ取得中... (${completed + 1}/${total})`;
      patientText.textContent = name;

      try {
        await downloadSummaryDataForPatient(p, true); // silent mode
        completed++;
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] ${name}のダウンロード失敗:`, e);
        failed++;
      }

      if (cancelled) break;
      // レート制限対策として少し待機
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    overlay.remove();

    if (cancelled) {
      window.HenryCore.ui.showToast(`中止しました（${completed}件ダウンロード済み）`, 'info');
    } else if (failed > 0) {
      window.HenryCore.ui.showToast(`${completed}件ダウンロード完了（${failed}件失敗）`, 'warning');
    } else {
      window.HenryCore.ui.showToast(`${completed}件すべてダウンロード完了`, 'success');
    }
  }

  async function downloadSummaryDataForPatient(hospData, silent = false) {
    const patientUuid = hospData?.patient?.uuid;
    const patientName = hospData?.patient?.fullName;

    if (!patientUuid) {
      if (!silent) window.HenryCore.ui.showToast('患者が選択されていません', 'error');
      return;
    }

    const spinner = silent ? null : window.HenryCore.ui.showSpinner(`${patientName || '患者'}のデータを取得中...`);

    try {
      const hospitalization = await fetchHospitalization(patientUuid);
      const disease = await fetchHospitalizationDisease(patientUuid);
      const profile = await fetchPatientProfile(patientUuid);
      const cachedSummary = (await loadAllSummaries())[patientUuid] || null;

      if (!hospitalization) {
        spinner?.close();
        if (!silent) window.HenryCore.ui.showToast('患者データの取得に失敗しました', 'error');
        return;
      }

      // 患者情報は入院患者一覧から取得したデータを使用
      const patientDetails = {
        uuid: patientUuid,
        fullName: patientName,
        kanaName: hospData?.patient?.fullNamePhonetic,
        birthDate: hospData?.patient?.detail?.birthDate,
        sex: hospData?.patient?.detail?.sexType
      };

      const hospStartDate = new Date(
        hospitalization.startDate.year,
        hospitalization.startDate.month - 1,
        hospitalization.startDate.day
      );

      const calendarData = await fetchCalendarData(patientUuid, hospStartDate);
      const doctorRecords = await fetchDoctorRecords(patientUuid);
      const nursingRecords = await fetchNursingRecords(patientUuid);
      const rehabRecords = await fetchRehabRecords(patientUuid);
      const pressureUlcerRecords = await fetchPressureUlcerRecords(patientUuid);

      if (!calendarData) {
        spinner?.close();
        if (!silent) window.HenryCore.ui.showToast('カレンダーデータの取得に失敗しました', 'error');
        return;
      }

      const vitalsByDate = groupVitalsByDate(calendarData.vitalSigns);
      const vitalItems = Array.from(vitalsByDate.entries()).map(([key, vitals]) => ({
        id: `vital-${key}`,
        category: 'vital',
        date: vitals[0].date,
        text: formatVitalsText(vitals),
        vitals
      }));

      const mealItems = extractMealIntakeData(
        calendarData.clinicalQuantitativeDataModuleCollections,
        calendarData.nutritionOrders,
        hospStartDate,
        new Date()
      );
      const urineItems = extractUrineData(calendarData.clinicalQuantitativeDataModuleCollections);
      const bloodSugarItems = extractBloodSugarInsulinData(calendarData.clinicalQuantitativeDataModuleCollections);
      const inHouseBloodTests = extractInHouseBloodTests(calendarData.clinicalQuantitativeDataModuleCollections);
      const bloodTestResults = extractBloodTestResults(calendarData.outsideInspectionReportGroups, inHouseBloodTests);

      const allItems = [
        ...vitalItems,
        ...mealItems,
        ...urineItems,
        ...bloodSugarItems,
        ...doctorRecords,
        ...nursingRecords,
        ...rehabRecords
      ];

      const activePrescriptions = (calendarData.prescriptionOrders || []).filter(rx => rx.orderStatus === 'ORDER_STATUS_ACTIVE');
      const activeInjections = (calendarData.injectionOrders || []).filter(inj => inj.orderStatus !== 'ORDER_STATUS_CANCELLED');

      const content = formatDataForAI(
        patientDetails,
        hospitalization,
        disease,
        profile,
        cachedSummary,
        allItems,
        activePrescriptions,
        activeInjections,
        bloodTestResults,
        pressureUlcerRecords
      );

      spinner?.close();

      if (!content) {
        if (!silent) window.HenryCore.ui.showToast('データがありません', 'error');
        return;
      }

      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const fileName = `${patientUuid}_${dateStr}.md`;

      const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (!silent) window.HenryCore.ui.showToast('ダウンロードしました', 'success');

    } catch (e) {
      spinner?.close();
      console.error(`[${SCRIPT_NAME}] エラー:`, e);
      if (!silent) window.HenryCore.ui.showToast('エラーが発生しました', 'error');
      throw e; // 一括ダウンロード時にエラーをカウントするため再スロー
    }
  }

  // ====================
  // 初期化
  // ====================

  function init() {
    const core = window.HenryCore;
    if (!core) {
      console.error(`[${SCRIPT_NAME}] HenryCoreが見つかりません`);
      return;
    }

    core.registerPlugin({
      id: 'summary-export',
      name: 'サマリー用データ',
      description: '入院患者のサマリー用データをマークダウン形式でダウンロード',
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
