// ==UserScript==
// @name         Henry Order History
// @namespace    https://henry-app.jp/
// @version      1.0.0
// @description  指定期間内の患者オーダー履歴を表示
// @author       Claude
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_order_history.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_order_history.user.js
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'OrderHistory';
  const QUERY = `
    query ListSectionedOrdersInPatient($input: ListSectionedOrdersInPatientInput!) {
      listSectionedOrdersInPatient(input: $input) {
        sections {
          sectionDate {
            year
            month
            day
          }
          orders {
            uuid
            orderType
            order {
              uuid
              imagingOrder {
                orderStatus
                doctor { name }
              }
              prescriptionOrderV2 {
                orderStatus
                doctor { name }
              }
              injectionOrderV2 {
                orderStatus
                doctor { name }
              }
              specimenInspectionOrderV2 {
                orderStatus
                doctor { name }
              }
              rehabilitationOrder {
                orderStatus
                doctor { name }
              }
              accountingOrder {
                orderStatus
                doctor { name }
              }
              nutritionOrder {
                orderStatus
                doctor { name }
              }
            }
          }
        }
        nextPageToken
      }
    }
  `;

  // オーダー種別の日本語マッピング
  const ORDER_TYPE_LABELS = {
    'ORDER_TYPE_IMAGING': '画像',
    'ORDER_TYPE_PRESCRIPTION': '処方',
    'ORDER_TYPE_INJECTION': '注射',
    'ORDER_TYPE_SPECIMEN_INSPECTION': '検体検査',
    'ORDER_TYPE_REHABILITATION': 'リハビリ',
    'ORDER_TYPE_ACCOUNTING': '会計',
    'ORDER_TYPE_NUTRITION': '栄養',
    'ORDER_TYPE_BIOPSY_INSPECTION': '生検',
    'ORDER_TYPE_NURSING': '看護',
    'ORDER_TYPE_TREATMENT': '処置'
  };

  // オーダーからステータスと医師名を取得
  function extractOrderDetails(order) {
    const details = order.order;
    if (!details) return { status: '-', doctor: '-' };

    const orderData = details.imagingOrder ||
                      details.prescriptionOrderV2 ||
                      details.injectionOrderV2 ||
                      details.specimenInspectionOrderV2 ||
                      details.rehabilitationOrder ||
                      details.accountingOrder ||
                      details.nutritionOrder;

    if (!orderData) return { status: '-', doctor: '-' };

    return {
      status: orderData.orderStatus || '-',
      doctor: orderData.doctor?.name || '-'
    };
  }

  // 指定月数以内のオーダーを取得
  async function fetchOrdersWithinMonths(patientUuid, months) {
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const allOrders = [];
    let pageToken = "";
    let pageCount = 0;
    const maxPages = 50; // 安全のため上限設定

    while (pageCount < maxPages) {
      pageCount++;

      const result = await HenryCore.query(QUERY, {
        input: {
          patientUuid,
          searchDate: {
            year: today.getFullYear(),
            month: today.getMonth() + 1,
            day: today.getDate()
          },
          filterOrderStatus: [
            "ORDER_STATUS_ACTIVE",
            "ORDER_STATUS_DRAFT",
            "ORDER_STATUS_ON_HOLD",
            "ORDER_STATUS_PREPARING"
          ],
          filterOrderTypes: [],
          patientCareType: "PATIENT_CARE_TYPE_ANY",
          pageSize: 20,
          pageToken
        }
      });

      const data = result.data?.listSectionedOrdersInPatient;
      if (!data) break;

      let shouldStop = false;

      for (const section of data.sections) {
        const { year, month, day } = section.sectionDate;
        const sectionDate = new Date(year, month - 1, day);

        if (sectionDate < cutoffDate) {
          shouldStop = true;
          break;
        }

        for (const order of section.orders) {
          allOrders.push({
            uuid: order.uuid,
            date: `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
            orderType: order.orderType,
            ...extractOrderDetails(order)
          });
        }
      }

      if (shouldStop || !data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    return allOrders;
  }

  // 結果表示モーダルを作成
  function showResultsModal(orders, months) {
    // フィルタ用のオーダー種別一覧を取得
    const orderTypes = [...new Set(orders.map(o => o.orderType))].sort();

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>期間:</strong> 過去 ${months} ヶ月 | <strong>総件数:</strong> <span id="order-count">${orders.length}</span> 件
      </div>
      <div style="margin-bottom: 12px;">
        <label style="font-weight: bold; margin-right: 8px;">フィルタ:</label>
        <select id="order-type-filter" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc;">
          <option value="">すべて</option>
          ${orderTypes.map(t => `<option value="${t}">${ORDER_TYPE_LABELS[t] || t}</option>`).join('')}
        </select>
      </div>
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="position: sticky; top: 0; background: #f5f5f5;">
            <tr>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">日付</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">種別</th>
            </tr>
          </thead>
          <tbody id="order-table-body">
          </tbody>
        </table>
      </div>
    `;

    // テーブル描画関数
    function renderTable(filter = '') {
      const tbody = content.querySelector('#order-table-body');
      const countSpan = content.querySelector('#order-count');

      const filtered = filter
        ? orders.filter(o => o.orderType === filter)
        : orders;

      countSpan.textContent = filtered.length;

      tbody.innerHTML = filtered.map(order => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px;">${order.date}</td>
          <td style="padding: 8px;">${ORDER_TYPE_LABELS[order.orderType] || order.orderType}</td>
        </tr>
      `).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="padding: 16px; text-align: center; color: #888;">該当するオーダーがありません</td></tr>';
      }
    }

    // 初期描画
    renderTable();

    // フィルタ変更時
    content.querySelector('#order-type-filter').addEventListener('change', (e) => {
      renderTable(e.target.value);
    });

    HenryCore.ui.showModal({
      title: 'オーダー履歴',
      content,
      width: 500
    });
  }

  // 入力モーダルを表示
  function showInputModal() {
    const patientUuid = HenryCore.getPatientUuid();
    if (!patientUuid) {
      console.error(`[${SCRIPT_NAME}] 患者ページで実行してください`);
      HenryCore.ui.showModal({
        title: 'エラー',
        content: '患者ページで実行してください。',
        width: 300
      });
      return;
    }

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: bold;">期間（ヶ月）:</label>
        <input type="number" id="months-input" value="3" min="1" max="120"
               style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">
      </div>
      <div id="loading-message" style="display: none; color: #666; text-align: center; padding: 8px;">
        取得中...
      </div>
    `;

    const modal = HenryCore.ui.showModal({
      title: 'オーダー履歴検索',
      content,
      width: 320,
      action: {
        label: '検索',
        autoClose: false,
        onClick: async () => {
          const input = content.querySelector('#months-input');
          const loading = content.querySelector('#loading-message');
          const months = parseInt(input.value, 10);

          if (!months || months < 1) {
            input.style.borderColor = 'red';
            return;
          }

          input.disabled = true;
          loading.style.display = 'block';

          try {
            const orders = await fetchOrdersWithinMonths(patientUuid, months);
            modal.close();
            showResultsModal(orders, months);
          } catch (e) {
            console.error(`[${SCRIPT_NAME}]`, e);
            loading.textContent = 'エラーが発生しました';
            loading.style.color = 'red';
            input.disabled = false;
          }
        }
      }
    });

    // Enterキーで検索
    content.querySelector('#months-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        content.closest('[data-modal]')?.querySelector('button[data-action]')?.click();
      }
    });
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
    await HenryCore.registerPlugin({
      id: 'order-history',
      name: 'オーダー履歴',
      icon: '📋',
      description: '指定期間内のオーダー履歴を表示',
      version: '1.0.0',
      order: 200,
      onClick: showInputModal
    });

    console.log(`[${SCRIPT_NAME}] 初期化完了`);
  }

  init();
})();
