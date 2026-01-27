// ==UserScript==
// @name         Henry Hospitalization Search
// @namespace    https://github.com/shin-926/Henry
// @version      1.6.1
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

  // 全記録を取得（入院・外来を選択に応じて取得）
  async function fetchAllDocuments(patientUuid, includeHospitalization, includeOutpatient) {
    const results = [];

    if (includeHospitalization) {
      const hospDocs = await fetchHospitalizationDocuments(patientUuid);
      results.push(...hospDocs);
    }

    if (includeOutpatient) {
      const outDocs = await fetchOutpatientDocuments(patientUuid);
      results.push(...outDocs);
    }

    return results;
  }

  // 文字列を検索してハイライト用の情報を返す
  function searchInDocuments(documents, searchText) {
    if (!searchText.trim()) return [];

    const lowerSearch = searchText.toLowerCase();
    const results = [];

    for (const doc of documents) {
      const lowerText = doc.text.toLowerCase();
      if (lowerText.includes(lowerSearch)) {
        results.push({ ...doc });
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

  // 検索モーダルを表示
  function showSearchModal(patientUuid) {
    // 既存モーダルを削除
    document.getElementById('hosp-search-modal')?.remove();

    // 状態管理
    let allDocuments = [];
    let hospitalizations = [];
    let includeHistory = false;
    let isLoading = false;

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

    // キャッシュ管理用
    let cachedSelections = { hospitalization: false, outpatient: false };

    // 検索実行
    async function doSearch() {
      const searchText = searchInput.value.trim();
      if (!searchText) {
        resultsContainer.innerHTML = '<div class="no-results">検索キーワードを入力してください</div>';
        return;
      }

      const selections = getSelections();
      if (!selections.hospitalization && !selections.outpatient) {
        resultsContainer.innerHTML = '<div class="no-results">検索対象を選択してください</div>';
        return;
      }

      if (isLoading) return;
      isLoading = true;
      searchBtn.disabled = true;
      resultsContainer.innerHTML = '<div class="loading">検索中...</div>';

      try {
        // 選択が変わったらデータを再取得
        const selectionsChanged =
          selections.hospitalization !== cachedSelections.hospitalization ||
          selections.outpatient !== cachedSelections.outpatient;
        if (allDocuments.length === 0 || selectionsChanged) {
          allDocuments = await fetchAllDocuments(patientUuid, selections.hospitalization, selections.outpatient);
          cachedSelections = { ...selections };
        }

        // 検索
        const results = searchInDocuments(allDocuments, searchText);

        // 結果表示
        if (results.length === 0) {
          resultsContainer.innerHTML = `<div class="no-results">「${escapeHtml(searchText)}」に一致する記録はありません</div>`;
        } else {
          resultsContainer.innerHTML = `
            <div class="results-header">
              <span class="results-count">${results.length}件の記録が見つかりました</span>
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

    // チェックボックス変更時にキャッシュをクリアして再検索
    includeHospitalizationCheckbox.addEventListener('change', () => {
      allDocuments = [];
      if (searchInput.value.trim()) {
        doSearch();
      }
    });
    includeOutpatientCheckbox.addEventListener('change', () => {
      allDocuments = [];
      if (searchInput.value.trim()) {
        doSearch();
      }
    });

    document.body.appendChild(modal);

    // 初期データ読み込み
    loadHospitalizations();

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
