// ==UserScript==
// @name         Henry Prescription History
// @namespace    https://henry-app.jp/
// @version      2.0.6
// @description  患者の処方歴を可動式ウィンドウで表示（院内/院外区別）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_prescription_history.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_prescription_history.user.js
// ==/UserScript==

/*
 * 【処方歴ウィンドウ】
 *
 * ■ 使用場面
 * - 患者の過去の処方履歴を確認したい場合
 * - ツールボックスの「処方歴」ボタンから呼び出し
 *
 * ■ 表示内容
 * - 処方オーダー一覧（過去1年分、追加読み込み可能）
 * - 院内/院外の区別
 * - 薬品名、用法、日数
 *
 * ■ 特徴
 * - ドラッグで移動可能
 * - 位置を記憶
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'PrescriptionHistory';
  const WINDOW_ID = 'prescription-history-window';
  const POSITION_KEY = 'rx-history-window-pos';

  // EncounterEditorQuery の sha256Hash（院内/院外情報取得用）
  const ENCOUNTER_EDITOR_HASH = 'c5ee288aa4f525b49a8bac7420000d3e2f2e4f0ae58ca026b03988443a327bf7';

  // 組織UUID
  let organizationUuid = null;

  // 処方一覧取得クエリ（graphql-v2 フルクエリ）
  const ENCOUNTERS_QUERY = `
    query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
      encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
        encounters {
          id
          firstPublishTime
          records(includeDraft: false) {
            id
            __typename
            ... on PrescriptionOrder {
              startDate
              orderStatus
              rps {
                uuid
                dosageText
                boundsDurationDays { value }
                asNeeded
                expectedRepeatCount { value }
                instructions {
                  instruction {
                    medicationDosageInstruction {
                      localMedicine { name }
                      mhlwMedicine { name unitCode }
                      quantity {
                        doseQuantityPerDay { value }
                      }
                    }
                  }
                }
                medicationTiming {
                  medicationTiming {
                    canonicalPrescriptionUsage { text }
                  }
                }
              }
            }
          }
        }
        nextPageToken
      }
    }
  `;

  // 単位コードのマッピング
  const UNIT_CODES = {
    1: 'mL', 2: 'g', 3: 'mg', 4: 'μg', 5: 'mEq',
    6: '管', 7: '本', 8: '瓶', 9: '袋', 10: '包',
    11: 'シート', 12: 'ブリスター', 13: 'パック', 14: 'キット', 15: 'カプセル',
    16: '錠', 17: '丸', 18: '枚', 19: '個', 20: '滴',
    21: 'mL', 22: 'mg', 23: 'μg'
  };

  // 日付フォーマット
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const y = String(d.getFullYear()).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const w = weekdays[d.getDay()];
    return `${y}/${m}/${day}(${w})`;
  }

  // 処方オーダーから表示用データを抽出
  function extractPrescriptionData(record, encounterId, encounterDate) {
    const rps = record.rps || [];
    const medicines = [];

    for (const rp of rps) {
      const instructions = rp.instructions || [];
      for (const inst of instructions) {
        const med = inst.instruction?.medicationDosageInstruction;
        if (!med) continue;

        const name = med.localMedicine?.name || med.mhlwMedicine?.name || '不明';
        const unitCode = med.mhlwMedicine?.unitCode;
        const unit = UNIT_CODES[unitCode] || '';
        const qtyPerDay = med.quantity?.doseQuantityPerDay?.value;
        const qty = qtyPerDay ? (parseInt(qtyPerDay) / 100000) : '';

        medicines.push({
          name,
          quantity: qty,
          unit
        });
      }

      // 用法・日数
      const usage = rp.medicationTiming?.medicationTiming?.canonicalPrescriptionUsage?.text || '';
      const dosageText = rp.dosageText || '';
      const days = rp.boundsDurationDays?.value;
      const asNeeded = rp.asNeeded;
      const repeatCount = rp.expectedRepeatCount?.value;

      if (medicines.length > 0) {
        medicines[medicines.length - 1].usage = usage;
        medicines[medicines.length - 1].dosageText = dosageText;
        medicines[medicines.length - 1].days = days;
        medicines[medicines.length - 1].asNeeded = asNeeded;
        medicines[medicines.length - 1].repeatCount = repeatCount;
      }
    }

    return {
      recordId: record.id,
      encounterId,
      date: encounterDate,
      startDate: record.startDate,
      status: record.orderStatus,
      medicines,
      category: null
    };
  }

  // 組織UUIDを取得
  async function getOrganizationUuid() {
    if (organizationUuid) return organizationUuid;

    const core = window.HenryCore;
    if (core?.getOrganizationUuid) {
      organizationUuid = await core.getOrganizationUuid();
      return organizationUuid;
    }

    try {
      const stored = localStorage.getItem('henry-organization-uuid');
      if (stored) {
        organizationUuid = stored;
        return organizationUuid;
      }
    } catch (e) {}

    organizationUuid = 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825';
    return organizationUuid;
  }

  // 処方一覧を取得
  async function fetchPrescriptions(patientUuid, pageToken = null) {
    const core = window.HenryCore;
    if (!core) throw new Error('HenryCore not found');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split('T')[0];

    const result = await core.query(ENCOUNTERS_QUERY, {
      patientId: patientUuid,
      startDate: startDate,
      endDate: null,
      pageSize: 30,
      pageToken: pageToken
    }, { endpoint: '/graphql-v2' });

    const encounters = result?.data?.encountersInPatient?.encounters || [];
    const prescriptions = [];

    for (const enc of encounters) {
      const records = enc.records || [];
      for (const rec of records) {
        if (rec.__typename === 'PrescriptionOrder') {
          const data = extractPrescriptionData(rec, enc.id, enc.firstPublishTime);
          if (data.medicines.length > 0) {
            prescriptions.push(data);
          }
        }
      }
    }

    return {
      prescriptions,
      nextPageToken: result?.data?.encountersInPatient?.nextPageToken || null
    };
  }

  // 院内/院外情報を取得（persisted query）
  async function fetchMedicationCategory(encounterId) {
    const core = window.HenryCore;
    if (!core) return null;

    try {
      const token = await core.getToken();
      if (!token) return null;

      const orgUuid = await getOrganizationUuid();

      const response = await fetch('https://henry-app.jp/graphql-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': orgUuid
        },
        credentials: 'include',
        body: JSON.stringify({
          operationName: 'EncounterEditorQuery',
          variables: { id: encounterId },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: ENCOUNTER_EDITOR_HASH
            }
          }
        })
      });

      const result = await response.json();
      const records = result?.data?.encounter?.records || [];
      const categories = {};

      for (const rec of records) {
        if (rec.__typename === 'PrescriptionOrder' && rec.prescriptionMedicationCategory) {
          categories[rec.id] = rec.prescriptionMedicationCategory;
        }
      }

      return categories;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] カテゴリ取得エラー:`, e);
      return null;
    }
  }

  // カテゴリを日本語に変換
  function categoryToLabel(category) {
    if (category === 'MEDICATION_CATEGORY_OUT_OF_HOSPITAL') return '院外';
    if (category === 'MEDICATION_CATEGORY_IN_HOSPITAL') return '院内';
    return '-';
  }

  // カテゴリに応じたスタイル
  function getCategoryStyle(category) {
    if (category === 'MEDICATION_CATEGORY_OUT_OF_HOSPITAL') {
      return 'background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9;';
    }
    if (category === 'MEDICATION_CATEGORY_IN_HOSPITAL') {
      return 'background: #fff3e0; color: #e65100; border: 1px solid #ffcc80;';
    }
    return 'background: #f5f5f5; color: #666; border: 1px solid #ddd;';
  }

  // 位置を保存
  function savePosition(x, y) {
    GM_setValue(POSITION_KEY, JSON.stringify({ x, y }));
  }

  // 位置を読み込み
  function loadPosition() {
    try {
      const saved = GM_getValue(POSITION_KEY, null);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  }

  // スタイルを挿入
  function injectStyles() {
    if (document.getElementById('rx-history-styles')) return;

    const style = document.createElement('style');
    style.id = 'rx-history-styles';
    style.textContent = `
      #${WINDOW_ID} {
        position: fixed;
        z-index: 1500;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        width: 650px;
        height: 500px;
        min-width: 400px;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      }

      #${WINDOW_ID} .rx-resize-right {
        position: absolute;
        top: 0;
        right: 0;
        width: 6px;
        height: 100%;
        cursor: ew-resize;
      }

      #${WINDOW_ID} .rx-resize-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 6px;
        cursor: ns-resize;
      }

      #${WINDOW_ID} .rx-resize-corner {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        cursor: nwse-resize;
      }

      #${WINDOW_ID} .rx-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
        color: white;
        border-radius: 8px 8px 0 0;
        cursor: move;
        user-select: none;
      }

      #${WINDOW_ID} .rx-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #${WINDOW_ID} .rx-close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      #${WINDOW_ID} .rx-close-btn:hover {
        background: rgba(255,255,255,0.3);
      }

      #${WINDOW_ID} .rx-body {
        flex: 1;
        overflow-y: auto;
        padding: 0 16px 16px 16px;
      }

      #${WINDOW_ID} .rx-summary {
        margin-bottom: 12px;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 4px;
        font-size: 14px;
        color: #666;
      }

      #${WINDOW_ID} .rx-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      #${WINDOW_ID} .rx-table thead {
        position: sticky;
        top: 0;
        background: #f5f5f5;
        z-index: 1;
      }

      #${WINDOW_ID} .rx-table th {
        padding: 10px 8px;
        text-align: left;
        border-bottom: 2px solid #ccc;
        white-space: nowrap;
      }

      #${WINDOW_ID} .rx-table th:first-child { width: 90px; }
      #${WINDOW_ID} .rx-table th:nth-child(2) { width: 50px; text-align: center; }

      #${WINDOW_ID} .rx-table td {
        padding: 10px 8px;
        border-bottom: 1px solid #eee;
        vertical-align: top;
      }

      #${WINDOW_ID} .rx-category {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
      }

      #${WINDOW_ID} .rx-med-name {
        font-weight: 500;
        margin-bottom: 4px;
      }

      #${WINDOW_ID} .rx-med-qty {
        color: #1976d2;
      }

      #${WINDOW_ID} .rx-med-unit {
        color: #666;
      }

      #${WINDOW_ID} .rx-usage {
        color: #666;
        font-size: 12px;
        margin-left: 8px;
      }

      #${WINDOW_ID} .rx-dosage {
        color: #888;
        font-size: 11px;
        margin-left: 4px;
      }

      #${WINDOW_ID} .rx-days {
        color: #43a047;
        font-size: 12px;
        margin-left: 8px;
      }

      #${WINDOW_ID} .rx-prn {
        color: #f57c00;
        font-size: 12px;
        margin-left: 8px;
      }

      #${WINDOW_ID} .rx-load-more {
        margin-top: 12px;
        padding: 10px 16px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-size: 14px;
        transition: background 0.2s;
      }

      #${WINDOW_ID} .rx-load-more:hover {
        background: #1565c0;
      }

      #${WINDOW_ID} .rx-load-more:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      #${WINDOW_ID} .rx-loading {
        text-align: center;
        padding: 40px;
        color: #666;
      }

      #${WINDOW_ID} .rx-empty {
        text-align: center;
        padding: 40px;
        color: #888;
      }

      #${WINDOW_ID} .rx-error {
        text-align: center;
        padding: 20px;
        color: #d32f2f;
        background: #ffebee;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  // ウィンドウを作成
  function createWindow() {
    let win = document.getElementById(WINDOW_ID);
    if (win) {
      win.remove();
    }

    win = document.createElement('div');
    win.id = WINDOW_ID;

    // 保存された位置、またはデフォルト位置
    const savedPos = loadPosition();
    const defaultX = Math.max(50, (window.innerWidth - 650) / 2);
    const defaultY = Math.max(50, (window.innerHeight - 500) / 2);
    const x = savedPos?.x ?? defaultX;
    const y = savedPos?.y ?? defaultY;

    win.style.left = `${x}px`;
    win.style.top = `${y}px`;

    win.innerHTML = `
      <div class="rx-header">
        <h3>処方歴</h3>
        <button class="rx-close-btn" title="閉じる">×</button>
      </div>
      <div class="rx-body">
        <div class="rx-loading">処方歴を取得中...</div>
      </div>
      <div class="rx-resize-right"></div>
      <div class="rx-resize-bottom"></div>
      <div class="rx-resize-corner"></div>
    `;

    document.body.appendChild(win);

    // 閉じるボタン
    win.querySelector('.rx-close-btn').addEventListener('click', () => {
      win.remove();
    });

    // ドラッグ機能
    setupDrag(win);

    // リサイズ機能
    setupResize(win);

    return win;
  }

  // ドラッグ機能をセットアップ
  function setupDrag(win) {
    const header = win.querySelector('.rx-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.rx-close-btn')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = win.offsetLeft;
      startTop = win.offsetTop;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      e.preventDefault();
    });

    function onMouseMove(e) {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      // 画面内に収める
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - win.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));

      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;
    }

    function onMouseUp() {
      if (isDragging) {
        isDragging = false;
        // 位置を保存
        savePosition(win.offsetLeft, win.offsetTop);
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  // リサイズ機能をセットアップ
  function setupResize(win) {
    const resizeRight = win.querySelector('.rx-resize-right');
    const resizeBottom = win.querySelector('.rx-resize-bottom');
    const resizeCorner = win.querySelector('.rx-resize-corner');

    let isResizing = false;
    let resizeType = null;
    let startX, startY, startWidth, startHeight;

    function startResize(e, type) {
      isResizing = true;
      resizeType = type;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = win.offsetWidth;
      startHeight = win.offsetHeight;

      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);
      e.preventDefault();
    }

    resizeRight.addEventListener('mousedown', (e) => startResize(e, 'right'));
    resizeBottom.addEventListener('mousedown', (e) => startResize(e, 'bottom'));
    resizeCorner.addEventListener('mousedown', (e) => startResize(e, 'corner'));

    function onResizeMove(e) {
      if (!isResizing) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (resizeType === 'right' || resizeType === 'corner') {
        // 右端は画面右端まで
        const maxWidth = window.innerWidth - win.offsetLeft - 10;
        const newWidth = Math.max(400, Math.min(startWidth + dx, maxWidth));
        win.style.width = `${newWidth}px`;
      }

      if (resizeType === 'bottom' || resizeType === 'corner') {
        // 下端は画面下端まで
        const maxHeight = window.innerHeight - win.offsetTop - 10;
        const newHeight = Math.max(200, Math.min(startHeight + dy, maxHeight));
        win.style.height = `${newHeight}px`;
      }
    }

    function onResizeUp() {
      isResizing = false;
      resizeType = null;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeUp);
    }
  }

  // テーブルをレンダリング
  function renderTable(prescriptions, hasMore) {
    if (prescriptions.length === 0) {
      return '<div class="rx-empty">処方履歴がありません</div>';
    }

    let html = `
      <table class="rx-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>区分</th>
            <th>薬品名・用法</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const rx of prescriptions) {
      const categoryLabel = categoryToLabel(rx.category);
      const categoryStyle = getCategoryStyle(rx.category);

      let medsHtml = '';
      for (const m of rx.medicines) {
        medsHtml += `<div class="rx-med-name">`;
        medsHtml += m.name;
        if (m.quantity) {
          medsHtml += ` <span class="rx-med-qty">${m.quantity}</span>`;
          if (m.unit) medsHtml += `<span class="rx-med-unit">${m.unit}</span>`;
        }
        medsHtml += `</div>`;

        // 用法・日数を同じ行にまとめる
        const usageParts = [];
        if (m.usage) usageParts.push(m.usage);
        if (m.dosageText) usageParts.push(`<span class="rx-dosage">${m.dosageText}</span>`);
        if (m.days) {
          usageParts.push(`<span class="rx-days">${m.days}日分</span>`);
        } else if (m.asNeeded && m.repeatCount) {
          usageParts.push(`<span class="rx-prn">頓用 ${m.repeatCount}回</span>`);
        }
        if (usageParts.length > 0) {
          medsHtml += `<div class="rx-usage">${usageParts.join(' ')}</div>`;
        }
      }

      html += `
        <tr>
          <td style="white-space: nowrap;">${formatDate(rx.startDate || rx.date)}</td>
          <td style="text-align: center;">
            <span class="rx-category" style="${categoryStyle}">${categoryLabel}</span>
          </td>
          <td>${medsHtml}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';

    return html;
  }

  // メイン処理
  async function showPrescriptionHistory() {
    const core = window.HenryCore;
    if (!core) {
      console.error(`[${SCRIPT_NAME}] HenryCore not found`);
      return;
    }

    const patientUuid = core.getPatientUuid();
    if (!patientUuid) {
      alert('患者ページで実行してください。');
      return;
    }

    injectStyles();

    const win = createWindow();
    const body = win.querySelector('.rx-body');

    try {
      // 処方一覧を取得
      let { prescriptions, nextPageToken } = await fetchPrescriptions(patientUuid);

      // 院内/院外情報を取得
      const encounterIds = [...new Set(prescriptions.map(p => p.encounterId))];
      for (const encId of encounterIds) {
        const categories = await fetchMedicationCategory(encId);
        if (categories) {
          for (const rx of prescriptions) {
            if (rx.encounterId === encId && categories[rx.recordId]) {
              rx.category = categories[rx.recordId];
            }
          }
        }
      }

      // テーブルを表示
      body.innerHTML = renderTable(prescriptions, !!nextPageToken);

      // さらに読み込むボタン
      if (nextPageToken) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'rx-load-more';
        loadMoreBtn.textContent = 'さらに読み込む';
        body.appendChild(loadMoreBtn);

        loadMoreBtn.addEventListener('click', async () => {
          loadMoreBtn.disabled = true;
          loadMoreBtn.textContent = '読み込み中...';

          try {
            const result = await fetchPrescriptions(patientUuid, nextPageToken);

            // カテゴリ情報を追加取得
            const newEncounterIds = [...new Set(result.prescriptions.map(p => p.encounterId))];
            for (const encId of newEncounterIds) {
              const categories = await fetchMedicationCategory(encId);
              if (categories) {
                for (const rx of result.prescriptions) {
                  if (rx.encounterId === encId && categories[rx.recordId]) {
                    rx.category = categories[rx.recordId];
                  }
                }
              }
            }

            prescriptions.push(...result.prescriptions);
            nextPageToken = result.nextPageToken;

            // 再描画
            body.innerHTML = renderTable(prescriptions, !!nextPageToken);

            if (nextPageToken) {
              const newBtn = document.createElement('button');
              newBtn.className = 'rx-load-more';
              newBtn.textContent = 'さらに読み込む';
              body.appendChild(newBtn);

              // 再帰的にハンドラを設定（簡易実装）
              newBtn.addEventListener('click', loadMoreBtn.onclick);
            }
          } catch (e) {
            console.error(`[${SCRIPT_NAME}]`, e);
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'エラー - 再試行';
          }
        });
      }

    } catch (e) {
      console.error(`[${SCRIPT_NAME}]`, e);
      body.innerHTML = `<div class="rx-error">処方歴の取得に失敗しました: ${e.message}</div>`;
    }
  }

  // 初期化
  async function init() {
    // HenryCore待機
    let waited = 0;
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 10000) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return;
      }
    }

    // プラグイン登録
    await window.HenryCore.registerPlugin({
      id: 'prescription-history',
      name: '処方歴',
      icon: '💊',
      description: '患者の処方履歴を表示（院内/院外区別）',
      version: VERSION,
      order: 150,
      onClick: showPrescriptionHistory
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
