// ==UserScript==
// @name         Henry Hospitalization Search
// @namespace    https://github.com/shin-926/Henry
// @version      1.8.0
// @description  カルテの医師記録（入院・外来）から特定文字列を検索
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_hospitalization_search.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_hospitalization_search.user.js
// ==/UserScript==

/*
 * 【入院記録検索】
 *
 * ■ 使用場面
 * - 入院患者の医師記録から特定の文字列を検索したい場合
 * - 例：「転倒」「発熱」などのキーワードで関連記録を探す
 *
 * ■ 機能
 * - 医師記録（入院診察）を全文検索
 * - キーワードのハイライト表示
 * - 現在の入院 / 過去の入院も含める切り替え
 *
 * ■ データソース
 * - 医師記録: GraphQL API (ListClinicalDocuments - HOSPITALIZATION_CONSULTATION)
 * - 入院情報: GraphQL API (ListPatientHospitalizations)
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'HospitalizationSearch';
  const VERSION = GM_info.script.version;

  // GraphQL クエリ定義（フルクエリ方式）

  // 入院記録クエリ（/graphql - ListClinicalDocuments）
  const LIST_CLINICAL_DOCUMENTS_QUERY = `
    query ListClinicalDocuments($input: ListClinicalDocumentsRequestInput!) {
      listClinicalDocuments(input: $input) {
        documents {
          uuid
          editorData
          performTime { seconds }
          creator { name }
          type { __typename }
        }
        nextPageToken
      }
    }
  `;

  // 外来記録クエリ（/graphql-v2 - EncountersInPatient）
  const ENCOUNTERS_IN_PATIENT_QUERY = `
    query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
      encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
        encounters {
          id
          patientId
          records(includeDraft: false) {
            id
            __typename
            ... on ProgressNote {
              editorData
              updateTime
              updateUser { name }
            }
          }
        }
        nextPageToken
      }
    }
  `;

  // 患者情報取得クエリ
  const GET_PATIENT_QUERY = `
    query GetPatient($input: GetPatientRequestInput!) {
      getPatient(input: $input) {
        serialNumber
        fullName
      }
    }
  `;

  // 入院情報取得クエリを生成
  function buildHospitalizationsQuery(patientUuid) {
    return `
      query ListPatientHospitalizations {
        listPatientHospitalizations(input: {
          patientUuid: "${patientUuid}",
          pageSize: 50,
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

  // 日時フォーマット
  function formatDateTime(date) {
    if (!date) return '-';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // 日付フォーマット（入院日用）
  function formatDate(dateObj) {
    if (!dateObj) return '-';
    return `${dateObj.year}/${dateObj.month}/${dateObj.day}`;
  }

  // 患者情報を取得
  async function fetchPatientInfo(patientUuid) {
    try {
      const result = await window.HenryCore.query(GET_PATIENT_QUERY, {
        input: { uuid: patientUuid }
      });
      return result?.data?.getPatient || null;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 患者情報取得エラー:`, e);
      return null;
    }
  }

  // 入院情報を取得
  async function fetchHospitalizations(patientUuid) {
    try {
      const result = await window.HenryCore.query(buildHospitalizationsQuery(patientUuid));
      return result?.data?.listPatientHospitalizations?.hospitalizations || [];
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院情報取得エラー:`, e);
      return [];
    }
  }

  // 入院記録を取得（ListClinicalDocuments - フルクエリ方式）
  async function fetchHospitalizationDocuments(patientUuid) {
    const allDocuments = [];
    let pageToken = '';

    try {
      do {
        console.log(`[${SCRIPT_NAME}] 入院記録取得中...`);
        const result = await window.HenryCore.query(LIST_CLINICAL_DOCUMENTS_QUERY, {
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
              uuid: doc.uuid,
              text,
              performTime: doc.performTime?.seconds ? new Date(doc.performTime.seconds * 1000) : null,
              author: doc.creator?.name || '不明',
              docType: 'HOSPITALIZATION_CONSULTATION'
            });
          }
        }

        pageToken = data?.nextPageToken || '';
      } while (pageToken);

      console.log(`[${SCRIPT_NAME}] 入院記録取得完了: ${allDocuments.length}件`);
      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 入院記録取得エラー:`, e);
      return [];
    }
  }

  // 外来記録を取得（EncountersInPatient - graphql-v2 フルクエリ方式）
  async function fetchOutpatientDocuments(patientUuid) {
    const allDocuments = [];
    let pageToken = null;

    try {
      do {
        console.log(`[${SCRIPT_NAME}] 外来記録取得中...`);
        const result = await window.HenryCore.query(ENCOUNTERS_IN_PATIENT_QUERY, {
          patientId: patientUuid,
          startDate: null,
          endDate: null,
          pageSize: 50,
          pageToken: pageToken
        }, { endpoint: '/graphql-v2' });

        const data = result?.data?.encountersInPatient;
        const encounters = data?.encounters || [];

        for (const encounter of encounters) {
          const records = encounter.records || [];
          for (const record of records) {
            // ProgressNote（外来診療録）のみ対象
            if (record.__typename === 'ProgressNote' && record.editorData) {
              const text = parseEditorData(record.editorData);
              if (text) {
                allDocuments.push({
                  uuid: record.id,
                  text,
                  performTime: record.updateTime ? new Date(record.updateTime) : null,
                  author: record.updateUser?.name || record.createUser?.name || '不明',
                  docType: 'OUTPATIENT_CONSULTATION'
                });
              }
            }
          }
        }

        pageToken = data?.nextPageToken || null;
      } while (pageToken);

      console.log(`[${SCRIPT_NAME}] 外来記録取得完了: ${allDocuments.length}件`);
      return allDocuments;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 外来記録取得エラー:`, e);
      return [];
    }
  }

  // 全記録を取得（入院・外来を並列取得）
  async function fetchAllDocuments(patientUuid) {
    const [hospDocs, outDocs] = await Promise.all([
      fetchHospitalizationDocuments(patientUuid),
      fetchOutpatientDocuments(patientUuid)
    ]);
    return { hospitalizationDocs: hospDocs, outpatientDocs: outDocs };
  }

  // 文字列を検索してハイライト用の情報を返す
  function searchInDocuments(documents, searchText) {
    const results = [];

    // 検索テキストが空の場合は全件返す
    if (!searchText.trim()) {
      results.push(...documents.map(doc => ({ ...doc })));
    } else {
      const lowerSearch = searchText.toLowerCase();
      for (const doc of documents) {
        const lowerText = doc.text.toLowerCase();
        if (lowerText.includes(lowerSearch)) {
          results.push({ ...doc });
        }
      }
    }

    // 日時の新しい順にソート
    results.sort((a, b) => {
      if (!a.performTime) return 1;
      if (!b.performTime) return -1;
      return b.performTime - a.performTime;
    });

    return results;
  }

  // 正規表現エスケープ
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // テキストにハイライトを適用
  function highlightText(text, searchText) {
    if (!searchText.trim()) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(searchText)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark style="background: #ffeb3b; padding: 0 2px;">$1</mark>');
  }

  // HTMLエスケープ
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 入院期間でフィルタリング
  function filterByHospitalizationPeriod(docs, hospitalization) {
    if (!hospitalization) return docs;

    const startDate = new Date(
      hospitalization.startDate.year,
      hospitalization.startDate.month - 1,
      hospitalization.startDate.day
    );
    startDate.setHours(0, 0, 0, 0);

    let endDate;
    if (hospitalization.endDate) {
      endDate = new Date(
        hospitalization.endDate.year,
        hospitalization.endDate.month - 1,
        hospitalization.endDate.day
      );
      endDate.setHours(23, 59, 59, 999);
    } else {
      // 入院中の場合は現在日時まで
      endDate = new Date();
    }

    return docs.filter(doc => {
      if (!doc.performTime) return false;
      return doc.performTime >= startDate && doc.performTime <= endDate;
    });
  }

  // テキストコンテンツを生成
  function generateTextContent(results, options) {
    const { searchText, patientInfo, sortOrder, includeHospitalization, includeOutpatient, selectedHospitalization, hospitalizations } = options;

    // ソート
    const sortedResults = [...results].sort((a, b) => {
      if (!a.performTime) return 1;
      if (!b.performTime) return -1;
      return sortOrder === 'asc'
        ? a.performTime - b.performTime
        : b.performTime - a.performTime;
    });

    const lines = [];

    // ヘッダー
    lines.push('カルテ記録検索結果');
    lines.push('==================');
    lines.push(`検索キーワード: ${searchText}`);
    lines.push(`患者: ${patientInfo?.serialNumber || '-'} ${patientInfo?.fullName || '-'}`);
    lines.push(`出力日: ${new Date().toLocaleDateString('ja-JP')}`);

    // 対象種別
    const targetTypes = [];
    if (includeHospitalization) targetTypes.push('入院記録');
    if (includeOutpatient) targetTypes.push('外来記録');
    lines.push(`対象: ${targetTypes.join('・')}`);

    // 期間
    if (selectedHospitalization) {
      const hosp = hospitalizations.find(h => h.uuid === selectedHospitalization);
      if (hosp) {
        const start = formatDate(hosp.startDate);
        const end = hosp.endDate ? formatDate(hosp.endDate) : '入院中';
        lines.push(`期間: ${start}〜${end}`);
      }
    } else {
      lines.push('期間: 全期間');
    }

    lines.push(`並び順: ${sortOrder === 'asc' ? '古い順' : '新しい順'}`);
    lines.push('');
    lines.push('--------------------------------------------------');
    lines.push('');

    // 各記録
    for (const doc of sortedResults) {
      const dateStr = doc.performTime ? formatDateTime(doc.performTime) : '-';
      const typeStr = doc.docType === 'HOSPITALIZATION_CONSULTATION' ? '入院' : '外来';
      lines.push(`【${dateStr}】${typeStr} - ${doc.author}`);
      lines.push(doc.text);
      lines.push('');
      lines.push('--------------------------------------------------');
      lines.push('');
    }

    lines.push(`全 ${sortedResults.length} 件`);

    return lines.join('\n');
  }

  // ファイルダウンロード
  function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 保存ダイアログを表示
  function showSaveDialog(searchText, results, hospitalizations, patientUuid, hospitalizationDocs, outpatientDocs) {
    // 既存ダイアログを削除
    document.getElementById('hosp-search-save-dialog')?.remove();

    let patientInfo = null;

    const dialog = document.createElement('div');
    dialog.id = 'hosp-search-save-dialog';
    dialog.innerHTML = `
      <style>
        #hosp-search-save-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1600;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #hosp-search-save-dialog .dialog-content {
          background: white;
          border-radius: 8px;
          width: 400px;
          max-width: 90vw;
          font-family: sans-serif;
        }
        #hosp-search-save-dialog .dialog-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 16px;
          font-weight: bold;
        }
        #hosp-search-save-dialog .dialog-body {
          padding: 20px;
        }
        #hosp-search-save-dialog .dialog-footer {
          padding: 12px 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        #hosp-search-save-dialog .form-group {
          margin-bottom: 16px;
        }
        #hosp-search-save-dialog .form-group:last-child {
          margin-bottom: 0;
        }
        #hosp-search-save-dialog .form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }
        #hosp-search-save-dialog .radio-group {
          display: flex;
          gap: 16px;
        }
        #hosp-search-save-dialog .radio-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          cursor: pointer;
        }
        #hosp-search-save-dialog .checkbox-group {
          display: flex;
          gap: 16px;
        }
        #hosp-search-save-dialog .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          cursor: pointer;
        }
        #hosp-search-save-dialog select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        #hosp-search-save-dialog select:focus {
          outline: none;
          border-color: #2196F3;
        }
        #hosp-search-save-dialog .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
        }
        #hosp-search-save-dialog .btn-cancel {
          background: #f5f5f5;
          color: #333;
        }
        #hosp-search-save-dialog .btn-cancel:hover {
          background: #e0e0e0;
        }
        #hosp-search-save-dialog .btn-save {
          background: #2196F3;
          color: white;
        }
        #hosp-search-save-dialog .btn-save:hover {
          background: #1976D2;
        }
        #hosp-search-save-dialog .btn-save:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        #hosp-search-save-dialog .note {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
      </style>
      <div class="dialog-content">
        <div class="dialog-header">検索結果を保存</div>
        <div class="dialog-body">
          <div class="form-group">
            <div class="form-label">並び順</div>
            <div class="radio-group">
              <label>
                <input type="radio" name="sort-order" value="asc" checked>
                古い順
              </label>
              <label>
                <input type="radio" name="sort-order" value="desc">
                新しい順
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-label">記録種別</div>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="save-include-hosp" checked>
                入院記録
              </label>
              <label>
                <input type="checkbox" id="save-include-out" checked>
                外来記録
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-label">入院期間</div>
            <select id="save-hosp-period">
              <option value="">全期間</option>
            </select>
            <div class="note" id="period-note"></div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" id="save-cancel-btn">キャンセル</button>
          <button class="btn btn-save" id="save-confirm-btn">保存</button>
        </div>
      </div>
    `;

    const cancelBtn = dialog.querySelector('#save-cancel-btn');
    const confirmBtn = dialog.querySelector('#save-confirm-btn');
    const periodSelect = dialog.querySelector('#save-hosp-period');
    const periodNote = dialog.querySelector('#period-note');
    const includeHospCheckbox = dialog.querySelector('#save-include-hosp');
    const includeOutCheckbox = dialog.querySelector('#save-include-out');

    // 入院期間ドロップダウンを構築
    for (const hosp of hospitalizations) {
      const option = document.createElement('option');
      option.value = hosp.uuid;
      const start = formatDate(hosp.startDate);
      const end = hosp.endDate ? formatDate(hosp.endDate) : '入院中';
      const suffix = hosp.state === 'ADMITTED' ? '（入院中）' : '';
      option.textContent = `${start}〜${end}${suffix}`;
      periodSelect.appendChild(option);
    }

    // 入院期間選択時の注意表示
    function updatePeriodNote() {
      if (periodSelect.value) {
        periodNote.textContent = '※ 入院期間を選択すると、外来記録は除外されます';
        includeOutCheckbox.disabled = true;
        includeOutCheckbox.checked = false;
      } else {
        periodNote.textContent = '';
        includeOutCheckbox.disabled = false;
      }
    }

    periodSelect.addEventListener('change', updatePeriodNote);

    // 閉じる
    cancelBtn.onclick = () => dialog.remove();
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    // 保存実行
    confirmBtn.onclick = async () => {
      // 患者情報を取得
      if (!patientInfo) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '読込中...';
        patientInfo = await fetchPatientInfo(patientUuid);
        confirmBtn.disabled = false;
        confirmBtn.textContent = '保存';
      }

      const sortOrder = dialog.querySelector('input[name="sort-order"]:checked').value;
      const includeHospitalization = includeHospCheckbox.checked;
      const includeOutpatient = includeOutCheckbox.checked;
      const selectedHospitalization = periodSelect.value;

      if (!includeHospitalization && !includeOutpatient) {
        alert('記録種別を少なくとも1つ選択してください');
        return;
      }

      // フィルタリング
      let filteredResults = [];

      if (selectedHospitalization) {
        // 入院期間指定時は入院記録のみ
        const hosp = hospitalizations.find(h => h.uuid === selectedHospitalization);
        const hospFiltered = filterByHospitalizationPeriod(hospitalizationDocs, hosp);
        filteredResults = searchInDocuments(hospFiltered, searchText);
      } else {
        // 全期間
        const targetDocs = [
          ...(includeHospitalization ? hospitalizationDocs : []),
          ...(includeOutpatient ? outpatientDocs : [])
        ];
        filteredResults = searchInDocuments(targetDocs, searchText);
      }

      // テキスト生成
      const content = generateTextContent(filteredResults, {
        searchText,
        patientInfo,
        sortOrder,
        includeHospitalization: selectedHospitalization ? true : includeHospitalization,
        includeOutpatient: selectedHospitalization ? false : includeOutpatient,
        selectedHospitalization,
        hospitalizations
      });

      // ファイル名生成
      const today = new Date();
      const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      const patientId = patientInfo?.serialNumber || 'unknown';
      const filename = `カルテ検索_ID${patientId}_${dateStr}.txt`;

      // ダウンロード
      downloadTextFile(content, filename);

      dialog.remove();
    };

    document.body.appendChild(dialog);
  }

  // 検索モーダルを表示
  function showSearchModal(patientUuid) {
    // 既存モーダルを削除
    document.getElementById('hosp-search-modal')?.remove();

    // 状態管理
    let hospitalizationDocs = [];
    let outpatientDocs = [];
    let hospitalizations = [];
    let isLoading = false;
    let isPreloading = false;

    const modal = document.createElement('div');
    modal.id = 'hosp-search-modal';
    modal.innerHTML = `
      <style>
        #hosp-search-modal {
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
        #hosp-search-modal .modal-content {
          background: white;
          border-radius: 8px;
          width: 700px;
          max-width: 90vw;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          font-family: sans-serif;
        }
        #hosp-search-modal .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #hosp-search-modal .modal-header h2 {
          margin: 0;
          font-size: 18px;
        }
        #hosp-search-modal .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }
        #hosp-search-modal .close-btn:hover {
          color: #333;
        }
        #hosp-search-modal .search-controls {
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          flex-shrink: 0;
        }
        #hosp-search-modal .results-container {
          padding: 16px 20px;
          overflow-y: auto;
          flex: 1;
        }
        #hosp-search-modal .search-box {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        #hosp-search-modal .search-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }
        #hosp-search-modal .search-input:focus {
          outline: none;
          border-color: #2196F3;
        }
        #hosp-search-modal .search-btn {
          padding: 10px 20px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        #hosp-search-modal .search-btn:hover {
          background: #1976D2;
        }
        #hosp-search-modal .search-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        #hosp-search-modal .options {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        #hosp-search-modal .options label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        #hosp-search-modal .hosp-info {
          font-size: 12px;
          color: #666;
        }
        #hosp-search-modal .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        #hosp-search-modal .results-count {
          font-size: 14px;
          color: #666;
        }
        #hosp-search-modal .save-btn {
          padding: 6px 12px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        #hosp-search-modal .save-btn:hover {
          background: #388e3c;
        }
        #hosp-search-modal .results-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        #hosp-search-modal .result-item {
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
        }
        #hosp-search-modal .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        }
        #hosp-search-modal .result-meta {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        #hosp-search-modal .doc-type-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        #hosp-search-modal .doc-type-badge.hosp {
          background: #e3f2fd;
          color: #1565c0;
        }
        #hosp-search-modal .doc-type-badge.out {
          background: #e8f5e9;
          color: #2e7d32;
        }
        #hosp-search-modal .result-text {
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        #hosp-search-modal .no-results {
          text-align: center;
          padding: 40px;
          color: #999;
        }
        #hosp-search-modal .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        #hosp-search-modal .error-msg {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 12px;
        }
      </style>
      <div class="modal-content">
        <div class="modal-header">
          <h2>カルテ記録検索</h2>
          <button class="close-btn" title="閉じる">&times;</button>
        </div>
        <div class="search-controls">
          <div class="search-box">
            <input type="text" class="search-input" placeholder="検索キーワードを入力..." autofocus>
            <button class="search-btn">検索</button>
          </div>
          <div class="options">
            <label>
              <input type="checkbox" id="include-hospitalization" checked>
              入院記録
            </label>
            <label>
              <input type="checkbox" id="include-outpatient" checked>
              外来記録
            </label>
            <span class="hosp-info" id="hosp-info"></span>
          </div>
        </div>
        <div class="results-container" id="results-container">
          <div class="no-results">検索キーワードを入力してください</div>
        </div>
      </div>
    `;

    // イベント設定
    const closeBtn = modal.querySelector('.close-btn');
    const searchInput = modal.querySelector('.search-input');
    const searchBtn = modal.querySelector('.search-btn');
    const includeHospitalizationCheckbox = modal.querySelector('#include-hospitalization');
    const includeOutpatientCheckbox = modal.querySelector('#include-outpatient');
    const hospInfo = modal.querySelector('#hosp-info');
    const resultsContainer = modal.querySelector('#results-container');

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

    // 入院情報を表示
    async function loadHospitalizations() {
      hospitalizations = await fetchHospitalizations(patientUuid);
      const current = hospitalizations.find(h => h.state === 'ADMITTED');
      if (current) {
        hospInfo.textContent = `現在入院中: ${formatDate(current.startDate)}〜 (${current.hospitalizationDayCount?.value || 0}日目)`;
      } else {
        hospInfo.textContent = '入院中ではありません';
      }
    }

    // 現在の選択状態を取得
    function getSelections() {
      return {
        hospitalization: includeHospitalizationCheckbox.checked,
        outpatient: includeOutpatientCheckbox.checked
      };
    }

    // ドキュメントタイプを日本語に変換
    function formatDocType(type) {
      const typeMap = {
        'HOSPITALIZATION_CONSULTATION': '入院',
        'OUTPATIENT_CONSULTATION': '外来'
      };
      return typeMap[type] || type;
    }

    // 検索実行
    async function doSearch() {
      const searchText = searchInput.value.trim();

      const selections = getSelections();
      if (!selections.hospitalization && !selections.outpatient) {
        resultsContainer.innerHTML = '<div class="no-results">検索対象を選択してください</div>';
        return;
      }

      if (isLoading || isPreloading) {
        resultsContainer.innerHTML = '<div class="loading">データ読み込み中...</div>';
        return;
      }
      isLoading = true;
      searchBtn.disabled = true;
      resultsContainer.innerHTML = '<div class="loading">検索中...</div>';

      try {
        // データ未取得の場合は取得
        if (hospitalizationDocs.length === 0 && outpatientDocs.length === 0) {
          const result = await fetchAllDocuments(patientUuid);
          hospitalizationDocs = result.hospitalizationDocs;
          outpatientDocs = result.outpatientDocs;
        }

        // 選択状態に応じてフィルタリング
        const targetDocs = [
          ...(selections.hospitalization ? hospitalizationDocs : []),
          ...(selections.outpatient ? outpatientDocs : [])
        ];

        // 検索
        const results = searchInDocuments(targetDocs, searchText);

        // 結果表示
        if (results.length === 0) {
          const noResultsMsg = searchText
            ? `「${escapeHtml(searchText)}」に一致する記録はありません`
            : '記録がありません';
          resultsContainer.innerHTML = `<div class="no-results">${noResultsMsg}</div>`;
        } else {
          resultsContainer.innerHTML = `
            <div class="results-header">
              <span class="results-count">${results.length}件の記録が見つかりました</span>
              <button class="save-btn" id="save-results-btn">保存</button>
            </div>
            <div class="results-list">
              ${results.map(doc => `
                <div class="result-item">
                  <div class="result-header">
                    <div class="result-meta">
                      <span class="doc-type-badge ${doc.docType === 'HOSPITALIZATION_CONSULTATION' ? 'hosp' : 'out'}">${formatDocType(doc.docType)}</span>
                      <span>${formatDateTime(doc.performTime)}</span>
                      <span>${escapeHtml(doc.author)}</span>
                    </div>
                  </div>
                  <div class="result-text">${highlightText(doc.text, searchText).replace(/\n/g, '<br>')}</div>
                </div>
              `).join('')}
            </div>
          `;

          // 保存ボタンのイベント設定
          const saveBtn = resultsContainer.querySelector('#save-results-btn');
          saveBtn.onclick = () => {
            showSaveDialog(searchText, results, hospitalizations, patientUuid, hospitalizationDocs, outpatientDocs);
          };
        }
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 検索エラー:`, e);
        resultsContainer.innerHTML = `<div class="error-msg">検索中にエラーが発生しました: ${e.message}</div>`;
      } finally {
        isLoading = false;
        searchBtn.disabled = false;
      }
    }

    // イベント
    searchBtn.onclick = doSearch;
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    // チェックボックス変更時に再検索（データは再取得しない）
    includeHospitalizationCheckbox.addEventListener('change', () => {
      if (searchInput.value.trim()) {
        doSearch();
      }
    });
    includeOutpatientCheckbox.addEventListener('change', () => {
      if (searchInput.value.trim()) {
        doSearch();
      }
    });

    document.body.appendChild(modal);

    // 初期データ読み込み
    loadHospitalizations();

    // プリフェッチ開始（入院・外来を並列取得）
    isPreloading = true;
    fetchAllDocuments(patientUuid)
      .then(result => {
        hospitalizationDocs = result.hospitalizationDocs;
        outpatientDocs = result.outpatientDocs;
        console.log(`[${SCRIPT_NAME}] プリフェッチ完了: 入院${hospitalizationDocs.length}件, 外来${outpatientDocs.length}件`);
      })
      .catch(e => {
        console.error(`[${SCRIPT_NAME}] プリフェッチエラー:`, e);
      })
      .finally(() => {
        isPreloading = false;
      });

    // 入力欄にフォーカス
    setTimeout(() => searchInput.focus(), 100);
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
    const core = await waitForHenryCore();
    const patientUuid = core.getPatientUuid();

    if (!patientUuid) {
      alert('患者画面で実行してください');
      return;
    }

    showSearchModal(patientUuid);
  }

  // プラグイン登録
  async function init() {
    try {
      const core = await waitForHenryCore();

      core.registerPlugin({
        id: 'hospitalization-search',
        name: 'カルテ記録検索',
        version: VERSION,
        description: '入院・外来の医師記録を検索',
        onClick: main
      });

      console.log(`[${SCRIPT_NAME}] v${VERSION} 初期化完了`);
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 初期化失敗:`, e);
    }
  }

  // グローバル公開（デバッグ用）
  window.HospitalizationSearch = {
    show: main,
    version: VERSION
  };

  init();
})();
