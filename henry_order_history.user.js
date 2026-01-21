// ==UserScript==
// @name         Henry Order History
// @namespace    https://henry-app.jp/
// @version      1.5.1
// @description  指定期間内の患者オーダー履歴を表示 | powered by Claude & Gemini
// @author       sk
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_order_history.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_order_history.user.js
// ==/UserScript==

/*
 * 【患者オーダー履歴】
 *
 * ■ 使用場面
 * - 現在開いている患者の過去のオーダー（処方、検査等）を確認したい場合
 * - ツールボックスの「履歴」ボタンから呼び出し
 *
 * ■ 表示内容
 * - 指定期間内のオーダー一覧
 * - オーダー種別（処方、検査、処置等）
 * - オーダー日時、内容
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'OrderHistory';

  const QUERY = `
    query ListSectionedOrdersInPatient($input: ListSectionedOrdersInPatientRequestInput!) {
      listSectionedOrdersInPatient(input: $input) {
        sections {
          sectionDate { year month day }
          orders {
            uuid
            orderType
            order {
              specimenInspectionOrder {
                specimenInspectionOrderSpecimenInspections {
                  specimenInspection { name }
                  consultationOutsideInspections {
                    masterOutsideInspection { name }
                  }
                }
              }
              biopsyInspectionOrder {
                note
                biopsyInspectionOrderBiopsyInspections {
                  biopsyInspection { name }
                  consultationDiagnoses {
                    masterDiagnosis { name }
                  }
                }
              }
              prescriptionOrderV2 {
                rps {
                  instructions {
                    instruction {
                      medicationDosageInstruction {
                        localMedicine { name }
                      }
                    }
                  }
                }
              }
              imagingOrder {
                detail {
                  imagingModality
                  note
                  condition {
                    ct { series { bodySite { name } note } }
                    plainRadiographyDigital { series { bodySite { name } note } }
                    plainRadiographyAnalog { series { bodySite { name } note } }
                    mriOther { series { bodySite { name } note } }
                    mriAbove_1_5AndBelow_3Tesla { series { bodySite { name } note } }
                    mammographyDigital { series { bodySite { name } note } }
                    mammographyAnalog { series { bodySite { name } note } }
                    dexa { series { bodySite { name } note } }
                    fluoroscopy { series { bodySite { name } note } }
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

  // 検体検査から検査名・検査項目を抽出
  function extractSpecimenInspectionDetails(specimenOrder) {
    if (!specimenOrder?.specimenInspectionOrderSpecimenInspections?.length) {
      return { inspectionName: '', inspectionItems: [] };
    }

    const names = [];
    const items = [];

    for (const si of specimenOrder.specimenInspectionOrderSpecimenInspections) {
      // 検査名（検査機関名）
      if (si.specimenInspection?.name) {
        names.push(si.specimenInspection.name);
      }
      // 検査項目
      if (si.consultationOutsideInspections?.length) {
        for (const coi of si.consultationOutsideInspections) {
          if (coi.masterOutsideInspection?.name) {
            items.push(coi.masterOutsideInspection.name);
          }
        }
      }
    }

    return {
      inspectionName: [...new Set(names)].join(', '),
      inspectionItems: items
    };
  }

  // 生体検査から検査名・検査項目・備考を抽出
  function extractBiopsyInspectionDetails(biopsyOrder) {
    if (!biopsyOrder?.biopsyInspectionOrderBiopsyInspections?.length) {
      return { inspectionName: '', inspectionItems: [], note: biopsyOrder?.note || '' };
    }

    const names = [];
    const items = [];
    for (const bi of biopsyOrder.biopsyInspectionOrderBiopsyInspections) {
      // カテゴリ名（例：生体検査、処置）
      if (bi.biopsyInspection?.name) {
        names.push(bi.biopsyInspection.name);
      }
      // 検査項目名（例：認知機能検査その他の心理検査...）
      if (bi.consultationDiagnoses?.length) {
        for (const cd of bi.consultationDiagnoses) {
          if (cd.masterDiagnosis?.name) {
            items.push(cd.masterDiagnosis.name);
          }
        }
      }
    }

    return {
      inspectionName: [...new Set(names)].join(', '),
      inspectionItems: items,
      note: biopsyOrder.note || ''
    };
  }

  // 処方から薬品名を抽出
  function extractPrescriptionDetails(prescriptionOrder) {
    if (!prescriptionOrder?.rps?.length) {
      return { inspectionName: '', inspectionItems: [] };
    }

    const medicines = [];
    for (const rp of prescriptionOrder.rps) {
      if (!rp.instructions?.length) continue;
      for (const inst of rp.instructions) {
        const med = inst.instruction?.medicationDosageInstruction;
        if (med?.localMedicine?.name) {
          medicines.push(med.localMedicine.name);
        }
      }
    }

    return {
      inspectionName: '',
      inspectionItems: medicines
    };
  }

  // 画像オーダーから部位・備考を抽出
  function extractImagingDetails(imagingOrder) {
    const detail = imagingOrder?.detail;
    if (!detail) return { inspectionName: '', inspectionItems: [], note: '' };

    // モダリティ名のマッピング
    const MODALITY_LABELS = {
      'IMAGING_MODALITY_CT': 'CT',
      'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL': '一般撮影(デジタル)',
      'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_ANALOG': '一般撮影(アナログ)',
      'IMAGING_MODALITY_MRI_OTHER': 'MRI',
      'IMAGING_MODALITY_MRI_ABOVE_1_5_AND_BELOW_3_TESLA': 'MRI(1.5T以上3T未満)',
      'IMAGING_MODALITY_MAMMOGRAPHY_DIGITAL': 'マンモグラフィ(デジタル)',
      'IMAGING_MODALITY_MAMMOGRAPHY_ANALOG': 'マンモグラフィ(アナログ)',
      'IMAGING_MODALITY_DEXA': 'DEXA',
      'IMAGING_MODALITY_FLUOROSCOPY': '透視'
    };

    const modalityName = MODALITY_LABELS[detail.imagingModality] || detail.imagingModality || '';

    // 各モダリティタイプからシリーズを取得
    const condition = detail.condition;
    const modalities = [
      'ct', 'plainRadiographyDigital', 'plainRadiographyAnalog',
      'mriOther', 'mriAbove_1_5AndBelow_3Tesla',
      'mammographyDigital', 'mammographyAnalog', 'dexa', 'fluoroscopy'
    ];

    const bodySites = [];
    for (const m of modalities) {
      const series = condition?.[m]?.series;
      if (series?.length) {
        for (const s of series) {
          if (s.bodySite?.name) {
            bodySites.push(s.bodySite.name);
          }
        }
      }
    }

    return {
      inspectionName: modalityName,
      inspectionItems: bodySites,
      note: detail.note || ''
    };
  }

  // オーダーから詳細を取得
  function extractOrderDetails(order) {
    const details = order.order;
    if (!details) return { inspectionName: '', inspectionItems: [] };

    // 検体検査
    if (details.specimenInspectionOrder) {
      return extractSpecimenInspectionDetails(details.specimenInspectionOrder);
    }

    // 生体検査
    if (details.biopsyInspectionOrder) {
      return extractBiopsyInspectionDetails(details.biopsyInspectionOrder);
    }

    // 処方
    if (details.prescriptionOrderV2) {
      return extractPrescriptionDetails(details.prescriptionOrderV2);
    }

    // 画像
    if (details.imagingOrder) {
      return extractImagingDetails(details.imagingOrder);
    }

    return { inspectionName: '', inspectionItems: [] };
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
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc; white-space: nowrap;">日付</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc; white-space: nowrap;">種別</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ccc;">詳細</th>
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

      tbody.innerHTML = filtered.map(order => {
        // 詳細の表示文字列を作成
        let detailContent = '';
        if (order.inspectionName) {
          detailContent = order.inspectionName;
          if (order.inspectionItems?.length) {
            // 項目が多い場合は省略
            const itemsToShow = order.inspectionItems.slice(0, 5);
            const remaining = order.inspectionItems.length - 5;
            detailContent += ': ' + itemsToShow.join(', ');
            if (remaining > 0) {
              detailContent += ` 他${remaining}件`;
            }
          }
          // 備考があれば追加（生体検査など）
          if (order.note) {
            const notePreview = order.note.replace(/\n/g, ' ').slice(0, 30);
            detailContent += ` [${notePreview}${order.note.length > 30 ? '...' : ''}]`;
          }
        } else if (order.inspectionItems?.length) {
          // 処方などinspectionNameが空で項目のみの場合
          const itemsToShow = order.inspectionItems.slice(0, 3);
          const remaining = order.inspectionItems.length - 3;
          detailContent = itemsToShow.join(', ');
          if (remaining > 0) {
            detailContent += ` 他${remaining}件`;
          }
        } else if (order.note) {
          // inspectionNameもinspectionItemsもないが備考がある場合
          const notePreview = order.note.replace(/\n/g, ' ').slice(0, 50);
          detailContent = notePreview + (order.note.length > 50 ? '...' : '');
        }
        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; white-space: nowrap;">${order.date}</td>
            <td style="padding: 8px; white-space: nowrap;">${ORDER_TYPE_LABELS[order.orderType] || order.orderType}</td>
            <td style="padding: 8px; font-size: 12px; color: #555;">${detailContent}</td>
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #888;">該当するオーダーがありません</td></tr>';
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
      width: 700
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
      width: '320px',
      actions: [{
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
      }]
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
      version: '1.5.0',
      order: 200,
      onClick: showInputModal
    });

    console.log(`[${SCRIPT_NAME}] 初期化完了`);
  }

  init();
})();
