// ==UserScript==
// @name         自動承認アシスタント
// @namespace    http://tampermonkey.net/
// @version      3.3.1
// @description  承認待ちオーダーを自動で一括承認する
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_auto_approver.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_auto_approver.user.js
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'Henry自動承認';
  const PAGE_SIZE = 10;
  const BASE_DELAY = 150;
  const MAX_DELAY = 5000;

  // 自分の医師UUID（HenryCore.getMyUuid() でキャッシュされる）
  let myDoctorUuid = null;

  // オーダータイプごとのAPI設定
  const ORDER_TYPE_CONFIG = {
    'ORDER_TYPE_PRESCRIPTION': {
      operationName: 'CreatePrescriptionOrderOrderStatusAction',
      label: '処方',
      needsRevokeDescription: true
    },
    'ORDER_TYPE_IMAGING': {
      operationName: 'CreateImagingOrderOrderStatusAction',
      label: '画像検査',
      needsRevokeDescription: true
    },
    'ORDER_TYPE_ACCOUNTING': {
      operationName: 'CreateAccountingOrderOrderStatusAction',
      label: '会計',
      needsRevokeDescription: true
    },
    'ORDER_TYPE_BIOPSY_INSPECTION': {
      operationName: 'CreateBiopsyInspectionOrderOrderStatusAction',
      label: '生検検査',
      needsRevokeDescription: true
    },
    'ORDER_TYPE_SPECIMEN_INSPECTION': {
      operationName: 'CreateSpecimenInspectionOrderOrderStatusAction',
      label: '検体検査',
      needsRevokeDescription: true
    },
    'ORDER_TYPE_REHABILITATION': {
      operationName: 'CreateRehabilitationOrderOrderStatusAction',
      label: 'リハビリ',
      needsRevokeDescription: false
    },
    'ORDER_TYPE_NUTRITION': {
      operationName: 'CreateNutritionOrderOrderStatusAction',
      label: '栄養',
      needsRevokeDescription: false
    },
    'ORDER_TYPE_INJECTION': {
      operationName: 'CreateInjectionOrderOrderStatusAction',
      label: '注射',
      needsRevokeDescription: true
    }
  };

  // ========== ユーティリティ ==========

  // 医師一覧を取得
  async function getDoctorList() {
    const result = await HenryCore.call('ListUsers', {
      input: { role: 'DOCTOR', onlyNarcoticPractitioner: false }
    });
    return result.data?.listUsers?.users || [];
  }

  // オーダーからステータスを取得
  function getOrderStatus(order) {
    const detail = order.order;
    if (detail?.prescriptionOrderV2) return detail.prescriptionOrderV2.orderStatus;
    if (detail?.imagingOrder) return detail.imagingOrder.orderStatus;
    if (detail?.accountingOrder) return detail.accountingOrder.orderStatus;
    if (detail?.biopsyInspectionOrder) return detail.biopsyInspectionOrder.orderStatus;
    if (detail?.specimenInspectionOrder) return detail.specimenInspectionOrder.orderStatus;
    if (detail?.rehabilitationOrder) return detail.rehabilitationOrder.orderStatus;
    if (detail?.nutritionOrder) return detail.nutritionOrder.orderStatus;
    if (detail?.injectionOrderV2) return detail.injectionOrderV2.orderStatus;
    return null;
  }

  // ステータスから必要なアクションを判定
  function getRequiredAction(orderStatus) {
    if (orderStatus === 'ORDER_STATUS_ON_HOLD') return 'ACCEPT';
    if (orderStatus === 'ORDER_STATUS_DRAFT') return 'APPROVE';
    return null;
  }

  // オーダータイプからAPI名を推測
  function guessOperationName(orderType) {
    const typePart = orderType
      .replace('ORDER_TYPE_', '')
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    return 'Create' + typePart + 'OrderOrderStatusAction';
  }

  // ========== API呼び出し ==========

  // 1ページ分の承認待ちオーダーを取得
  async function fetchPage(doctorUuid, pageToken = '') {
    const result = await HenryCore.call('ListNotifiableOrders', {
      input: {
        filterOrderTypes: [],
        accountingOrderExtendedShinryoShikibetsus: [],
        filterDoctorUuid: { value: doctorUuid },
        filterRequiredOrderStatusActions: [],
        filterRoomUuids: [],
        filterWardUuids: [],
        pageSize: PAGE_SIZE,
        pageToken: pageToken,
        patientCareType: 'PATIENT_CARE_TYPE_ANY'
      }
    });
    return result.data?.listNotifiableOrders || {};
  }

  // 全件数をカウント
  async function countAllOrders(doctorUuid) {
    const startTime = Date.now();
    let totalOrders = 0;
    let totalPatients = 0;
    let pageCount = 0;
    let pageToken = '';

    while (true) {
      const result = await fetchPage(doctorUuid, pageToken);
      const patientOrders = result.patientOrders || [];
      pageCount++;

      for (const po of patientOrders) {
        totalPatients++;
        totalOrders += po.orders?.length || 0;
      }

      pageToken = result.nextPageToken || '';
      if (!pageToken) break;
    }

    const elapsed = Date.now() - startTime;
    return { totalOrders, totalPatients, pageCount, elapsed };
  }

  // オーダー承認
  async function approveOrder(orderType, uuid, orderStatus) {
    const config = ORDER_TYPE_CONFIG[orderType];
    const operationName = config?.operationName || guessOperationName(orderType);
    const action = getRequiredAction(orderStatus);

    if (!action) {
      return { success: false, error: `不明なステータス: ${orderStatus}` };
    }

    const input = { uuid, orderStatusAction: action };
    if (config?.needsRevokeDescription !== false) {
      input.revokeDescription = '';
    }

    const result = await HenryCore.call(operationName, { input });

    if (result.errors) {
      return { success: false, error: result.errors[0]?.message };
    }
    return { success: true };
  }

  // ========== 自動承認処理 ==========

  async function autoApproveAll(doctorUuid, abortSignal, onProgress) {
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;
    let pageToken = '';
    let delay = BASE_DELAY;

    while (true) {
      if (abortSignal.aborted) {
        return { processed, successCount, errorCount, aborted: true };
      }

      const result = await fetchPage(doctorUuid, pageToken);
      const patientOrders = result.patientOrders || [];

      for (const po of patientOrders) {
        for (const order of po.orders) {
          if (abortSignal.aborted) {
            return { processed, successCount, errorCount, aborted: true };
          }

          const status = getOrderStatus(order);
          const action = getRequiredAction(status);
          if (!action) continue;

          try {
            const approveResult = await approveOrder(order.orderType, order.uuid, status);

            if (approveResult.success) {
              successCount++;
              delay = BASE_DELAY;
            } else {
              errorCount++;
              console.error(`[${SCRIPT_NAME}] 承認エラー: ${approveResult.error}`, {
                uuid: order.uuid,
                orderType: order.orderType
              });
            }
          } catch (e) {
            errorCount++;
            console.error(`[${SCRIPT_NAME}] 例外: ${e.message}`, {
              uuid: order.uuid,
              orderType: order.orderType
            });

            // バックオフ
            if (e.message.includes('429') || e.message.includes('503')) {
              delay = Math.min(delay * 2, MAX_DELAY);
            }
          }

          processed++;
          onProgress({ processed, successCount, errorCount });

          await HenryCore.utils.sleep(delay);
        }
      }

      pageToken = result.nextPageToken || '';
      if (!pageToken) break;
    }

    return { processed, successCount, errorCount, aborted: false };
  }

  // ========== UI ==========

  // 医師選択モーダル
  async function showDoctorSelectModal(onSelect) {
    const doctors = await getDoctorList();

    const content = document.createElement('div');
    content.style.cssText = 'max-height: 300px; overflow-y: auto;';

    doctors.forEach((doctor, index) => {
      const isMe = doctor.uuid === myDoctorUuid;
      const row = document.createElement('label');
      row.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.1s;
      `;
      row.addEventListener('mouseenter', () => row.style.background = '#F3F4F6');
      row.addEventListener('mouseleave', () => row.style.background = 'transparent');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'doctor-select';
      radio.value = doctor.uuid;
      radio.checked = isMe;
      radio.style.marginRight = '10px';

      const label = document.createElement('span');
      label.textContent = doctor.name + (isMe ? '（自分）' : '');
      label.style.color = isMe ? '#059669' : '#374151';
      if (isMe) label.style.fontWeight = 'bold';

      row.appendChild(radio);
      row.appendChild(label);
      content.appendChild(row);
    });

    let selectedUuid = myDoctorUuid;

    content.addEventListener('change', (e) => {
      if (e.target.name === 'doctor-select') {
        selectedUuid = e.target.value;
      }
    });

    HenryCore.ui.showModal({
      title: '👨‍⚕️ 医師を選択',
      content: content,
      actions: [
        { label: 'キャンセル', variant: 'secondary' },
        {
          label: '次へ',
          variant: 'primary',
          onClick: () => {
            const doctor = doctors.find(d => d.uuid === selectedUuid);
            onSelect(doctor);
          }
        }
      ]
    });
  }

  function showConfirmModal(doctor, totalOrders, elapsed, onStart) {
    const isMe = doctor.uuid === myDoctorUuid;

    const content = document.createElement('div');
    content.innerHTML = `
      <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 13px;">
        医師: <strong style="color: #374151;">${doctor.name}</strong>${isMe ? '（自分）' : ''}
      </p>
      <p style="margin: 0 0 12px 0; color: #374151;">
        承認待ちオーダー: <strong>${totalOrders.toLocaleString()}件</strong>
      </p>
      <p style="margin: 0; color: #6B7280; font-size: 13px;">
        （カウント時間: ${(elapsed / 1000).toFixed(1)}秒）
      </p>
    `;

    const actions = [{ label: '閉じる', variant: 'secondary' }];

    // 自分の場合のみ「開始」ボタンを表示
    if (isMe && totalOrders > 0) {
      actions.push({ label: '開始', variant: 'primary', onClick: onStart });
    }

    HenryCore.ui.showModal({
      title: '📋 承認待ちオーダー',
      content: content,
      actions: actions
    });
  }

  function showProgressModal(totalOrders, abortController) {
    const content = document.createElement('div');
    content.innerHTML = `
      <p id="henry-progress-text" style="margin: 0 0 8px 0; color: #374151;">
        処理済: 0 / ${totalOrders.toLocaleString()} 件
      </p>
      <p id="henry-error-text" style="margin: 0; color: #6B7280; font-size: 13px;">
        エラー: 0 件
      </p>
    `;

    const modal = HenryCore.ui.showModal({
      title: '🔄 自動承認中...',
      content: content,
      actions: [
        {
          label: '⏹ 中止',
          variant: 'secondary',
          onClick: () => abortController.abort()
        }
      ]
    });

    return {
      modal,
      update: ({ processed, successCount, errorCount }) => {
        const progressText = document.getElementById('henry-progress-text');
        const errorText = document.getElementById('henry-error-text');
        if (progressText) {
          progressText.textContent = `処理済: ${processed.toLocaleString()} / ${totalOrders.toLocaleString()} 件`;
        }
        if (errorText) {
          errorText.textContent = `エラー: ${errorCount} 件`;
          errorText.style.color = errorCount > 0 ? '#EF4444' : '#6B7280';
        }
      }
    };
  }

  function showResultModal(result) {
    const { processed, successCount, errorCount, aborted } = result;
    const title = aborted ? '⏹ 中止しました' : '✅ 完了';

    const content = document.createElement('div');
    content.innerHTML = `
      <p style="margin: 0 0 8px 0; color: #374151;">
        成功: <strong style="color: #10B981;">${successCount.toLocaleString()}件</strong>
      </p>
      <p style="margin: 0; color: ${errorCount > 0 ? '#EF4444' : '#6B7280'};">
        エラー: <strong>${errorCount}件</strong>
        ${errorCount > 0 ? '<span style="font-size: 12px;">（詳細はコンソールを確認）</span>' : ''}
      </p>
    `;

    HenryCore.ui.showModal({
      title: title,
      content: content,
      actions: [{ label: '閉じる', variant: 'primary' }]
    });
  }

  // ========== メイン処理 ==========

  // 実行中のタスクを管理するための変数
  let activeCleaner = null;

  async function main() {
    // 既存の処理があればクリーンアップ
    if (activeCleaner) activeCleaner.exec();
    activeCleaner = HenryCore.utils.createCleaner();

    // 自分の医師UUIDを取得（HenryCore がキャッシュ）
    if (!myDoctorUuid) {
      myDoctorUuid = await HenryCore.getMyUuid();
    }

    if (!myDoctorUuid) {
      HenryCore.ui.showModal({
        title: '❌ エラー',
        content: '医師情報を取得できませんでした。ページを再読み込みしてください。',
        actions: [{ label: '閉じる', variant: 'primary' }]
      });
      return;
    }

    // 医師選択モーダルを表示
    showDoctorSelectModal(async (doctor) => {
      if (!doctor) return;

      // カウント中モーダル
      const countingModal = HenryCore.ui.showModal({
        title: '🔄 カウント中...',
        content: `${doctor.name} の承認待ちオーダーを集計しています...`,
        actions: []
      });

      activeCleaner.add(() => countingModal.close());

      try {
        // 全件カウント
        const { totalOrders, elapsed } = await countAllOrders(doctor.uuid);
        countingModal.close();

        // 確認モーダル
        showConfirmModal(doctor, totalOrders, elapsed, async () => {
          // 処理開始（自分の場合のみここに来る）
          const abortController = new AbortController();

          activeCleaner.add(() => abortController.abort());

          HenryCore.utils.subscribeNavigation(activeCleaner, () => {
            console.log(`[${SCRIPT_NAME}] 画面遷移のため処理を中断しました`);
          });

          const { modal, update } = showProgressModal(totalOrders, abortController);
          activeCleaner.add(() => modal.close());

          try {
            const result = await autoApproveAll(doctor.uuid, abortController.signal, update);

            modal.close();
            if (!result.aborted) {
              showResultModal(result);
            }
          } catch (e) {
            if (e.name !== 'AbortError') {
              console.error(`[${SCRIPT_NAME}] 予期せぬエラー:`, e);
            }
          }
        });
      } catch (e) {
        countingModal.close();
        console.error(`[${SCRIPT_NAME}] エラー:`, e);
      }
    });
  }

  // ========== 初期化・登録処理 ==========

  async function init() {
    // HenryCoreの待機
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
    }

    // プラグイン登録（HenryCore v2.6.0）
    const registered = await HenryCore.registerPlugin({
      label: '⚡ 一括承認',
      event: 'henry:auto-approve-all',
      order: 20
    });

    if (!registered) {
      console.error(`[${SCRIPT_NAME}] プラグイン登録に失敗しました`);
      return;
    }

    // イベントリスナー
    window.addEventListener('henry:auto-approve-all', main);

    console.log(`[${SCRIPT_NAME}] v3.3.0 起動しました`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
