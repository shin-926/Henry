// ==UserScript==
// @name         承認アシスタント
// @namespace    http://tampermonkey.net/
// @version      3.12.1
// @description  承認待ちオーダーを自動で一括承認する | powered by Claude & Gemini
// @author       sk
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_auto_approver.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_auto_approver.user.js
// ==/UserScript==

/*
 * 【承認アシスタント】
 *
 * ■ 使用場面
 * - 承認待ちのオーダー（処方、検査等）が溜まっている場合
 * - 一括で承認処理を行いたい場合
 *
 * ■ 主な機能
 * - 承認待ちオーダーの一覧を取得
 * - 指定した医師のオーダーを自動で一括承認
 * - 進捗表示とエラーハンドリング
 *
 * ■ 注意事項
 * - 承認操作は取り消せないため、対象オーダーをよく確認してから実行すること
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'Henry自動承認';
  const PAGE_SIZE = 10;
  const BASE_DELAY = 150;
  const MAX_DELAY = 5000;

  // GraphQL クエリ定義（フルクエリ方式）
  const QUERIES = {
    ListUsers: `
      query ListUsers($input: ListUsersRequestInput!) {
        listUsers(input: $input) {
          users {
            uuid
            name
          }
        }
      }
    `,
    ListNotifiableOrders: `
      query ListNotifiableOrders($input: ListNotifiableOrdersRequestInput!) {
        listNotifiableOrders(input: $input) {
          patientOrders {
            orders {
              uuid
              orderType
              order {
                prescriptionOrderV2 { orderStatus }
                imagingOrder { orderStatus }
                accountingOrder { orderStatus }
                biopsyInspectionOrder { orderStatus }
                specimenInspectionOrder { orderStatus }
                rehabilitationOrder { orderStatus }
                nutritionOrder { orderStatus }
                injectionOrderV2 { orderStatus }
              }
            }
          }
          nextPageToken
        }
      }
    `
  };

  // 承認mutation を動的に生成
  function generateApprovalMutation(operationName) {
    const fieldName = operationName.charAt(0).toLowerCase() + operationName.slice(1);
    const inputType = `${operationName}RequestInput`;
    return `
      mutation ${operationName}($input: ${inputType}!) {
        ${fieldName}(input: $input) {
          __typename
        }
      }
    `;
  }

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

  // 全角スペースを半角に変換
  const normalizeSpace = (s) => s.replace(/\u3000/g, ' ');

  // 医師一覧を取得
  async function getDoctorList() {
    const result = await HenryCore.query(QUERIES.ListUsers, {
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
    if (orderStatus === 'ORDER_STATUS_DRAFT_REVOKED') return 'APPROVE_REVOCATION';
    if (orderStatus === 'ORDER_STATUS_REVOKED') return 'CONFIRM_REVOCATION';
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
    const result = await HenryCore.query(QUERIES.ListNotifiableOrders, {
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
  async function countAllOrders(doctorUuid, onProgress) {
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

      // 進捗コールバック
      if (onProgress) {
        onProgress(totalOrders);
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
    const typeLabel = config?.label || orderType.replace('ORDER_TYPE_', '');

    console.log(`[${SCRIPT_NAME}] 承認試行:`, {
      uuid: uuid.slice(0, 8) + '...',
      type: typeLabel,
      status: orderStatus.replace('ORDER_STATUS_', ''),
      action: action,
      mutation: operationName
    });

    if (!action) {
      const error = `不明なステータス: ${orderStatus}`;
      console.warn(`[${SCRIPT_NAME}] ⚠️ スキップ: ${error}`);
      return { success: false, error, skipped: true };
    }

    const input = { uuid, orderStatusAction: action };
    if (config?.needsRevokeDescription !== false) {
      input.revokeDescription = '';
    }

    const mutation = generateApprovalMutation(operationName);

    try {
      const result = await HenryCore.query(mutation, { input });

      if (result.errors) {
        const errorMsg = result.errors[0]?.message || 'Unknown error';
        console.error(`[${SCRIPT_NAME}] ❌ API エラー:`, {
          uuid: uuid.slice(0, 8) + '...',
          type: typeLabel,
          error: errorMsg,
          fullErrors: result.errors
        });
        return { success: false, error: errorMsg };
      }

      console.log(`[${SCRIPT_NAME}] ✅ 承認成功:`, {
        uuid: uuid.slice(0, 8) + '...',
        type: typeLabel
      });
      return { success: true };
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] ❌ 例外発生:`, {
        uuid: uuid.slice(0, 8) + '...',
        type: typeLabel,
        error: e.message,
        stack: e.stack
      });
      throw e;
    }
  }

  // ========== 自動承認処理 ==========

  async function autoApproveAll(doctorUuid, abortSignal, onProgress) {
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let delay = BASE_DELAY;
    let loopCount = 0;

    // 失敗したオーダーをスキップするためのSet
    const failedUuids = new Set();
    // 失敗の詳細を記録
    const failedDetails = [];

    console.log(`[${SCRIPT_NAME}] ========== 自動承認開始 ==========`);
    console.log(`[${SCRIPT_NAME}] 医師UUID: ${doctorUuid.slice(0, 8)}...`);

    // 承認するとリストから消えるため、毎回最初のページから取得し直す
    while (true) {
      loopCount++;

      if (abortSignal.aborted) {
        console.log(`[${SCRIPT_NAME}] ユーザーにより中断されました`);
        return { processed, successCount, errorCount, skippedCount, aborted: true };
      }

      // 常に最初のページを取得（承認済みは消えているので新しいオーダーが来る）
      console.log(`[${SCRIPT_NAME}] --- ループ ${loopCount}: ページ取得中... ---`);
      const result = await fetchPage(doctorUuid, '');
      const patientOrders = result.patientOrders || [];

      // 承認対象のオーダーを抽出（失敗済みはスキップ）
      const pendingOrders = [];
      let skippedInThisLoop = 0;

      for (const po of patientOrders) {
        for (const order of po.orders) {
          // 失敗済みのオーダーはスキップ
          if (failedUuids.has(order.uuid)) {
            skippedInThisLoop++;
            continue;
          }

          const status = getOrderStatus(order);
          const action = getRequiredAction(status);

          if (action) {
            pendingOrders.push({ order, status });
          } else if (status) {
            // アクションがないステータス（PREPARING等）はスキップ扱い
            console.log(`[${SCRIPT_NAME}] ⏭️ 対象外ステータス:`, {
              uuid: order.uuid.slice(0, 8) + '...',
              type: order.orderType.replace('ORDER_TYPE_', ''),
              status: status.replace('ORDER_STATUS_', '')
            });
            failedUuids.add(order.uuid);
            failedDetails.push({
              uuid: order.uuid,
              type: order.orderType,
              status: status,
              reason: '対象外ステータス'
            });
            skippedCount++;
          }
        }
      }

      console.log(`[${SCRIPT_NAME}] ループ ${loopCount}: 取得=${patientOrders.length}患者, 処理対象=${pendingOrders.length}件, スキップ済=${skippedInThisLoop}件`);

      // 承認対象がなくなったら終了
      if (pendingOrders.length === 0) {
        console.log(`[${SCRIPT_NAME}] 処理対象がなくなりました。終了します。`);
        break;
      }

      // 取得したオーダーを処理
      for (const { order, status } of pendingOrders) {
        if (abortSignal.aborted) {
          console.log(`[${SCRIPT_NAME}] ユーザーにより中断されました`);
          return { processed, successCount, errorCount, skippedCount, aborted: true };
        }

        try {
          const approveResult = await approveOrder(order.orderType, order.uuid, status);

          if (approveResult.success) {
            successCount++;
            delay = BASE_DELAY;
          } else {
            errorCount++;
            // 失敗したオーダーを記録してスキップ
            failedUuids.add(order.uuid);
            failedDetails.push({
              uuid: order.uuid,
              type: order.orderType,
              status: status,
              reason: approveResult.error
            });
          }
        } catch (e) {
          errorCount++;
          // 失敗したオーダーを記録してスキップ
          failedUuids.add(order.uuid);
          failedDetails.push({
            uuid: order.uuid,
            type: order.orderType,
            status: status,
            reason: e.message
          });

          // バックオフ
          if (e.message.includes('429') || e.message.includes('503')) {
            delay = Math.min(delay * 2, MAX_DELAY);
            console.warn(`[${SCRIPT_NAME}] レート制限検出。遅延を ${delay}ms に増加`);
          }
        }

        processed++;
        onProgress({ processed, successCount, errorCount });

        await HenryCore.utils.sleep(delay);
      }
    }

    // ========== 処理完了サマリー ==========
    console.log(`[${SCRIPT_NAME}] ========== 処理完了サマリー ==========`);
    console.log(`[${SCRIPT_NAME}] 総処理数: ${processed}`);
    console.log(`[${SCRIPT_NAME}] 成功: ${successCount}`);
    console.log(`[${SCRIPT_NAME}] エラー: ${errorCount}`);
    console.log(`[${SCRIPT_NAME}] スキップ: ${skippedCount}`);
    console.log(`[${SCRIPT_NAME}] ループ回数: ${loopCount}`);

    if (failedDetails.length > 0) {
      console.log(`[${SCRIPT_NAME}] ========== 失敗/スキップ詳細 ==========`);
      failedDetails.forEach((detail, i) => {
        console.log(`[${SCRIPT_NAME}] ${i + 1}. ${detail.type.replace('ORDER_TYPE_', '')} (${detail.status.replace('ORDER_STATUS_', '')}):`);
        console.log(`[${SCRIPT_NAME}]    UUID: ${detail.uuid}`);
        console.log(`[${SCRIPT_NAME}]    理由: ${detail.reason}`);
      });
    }

    // 承認完了後、画面を更新
    if (window.__APOLLO_CLIENT__) {
      try {
        window.__APOLLO_CLIENT__.refetchQueries({ include: ['ListNotifiableOrders'] });
      } catch (e) {
        console.error(`[${SCRIPT_NAME}] 画面更新失敗:`, e.message);
      }
    }

    return { processed, successCount, errorCount, skippedCount, aborted: false };
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
      label.textContent = normalizeSpace(doctor.name) + (isMe ? '（自分）' : '');
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
        医師: <strong style="color: #374151;">${normalizeSpace(doctor.name)}</strong>${isMe ? '（自分）' : ''}
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
    const hasTotal = totalOrders != null;
    const content = document.createElement('div');
    content.innerHTML = `
      <p id="henry-progress-text" style="margin: 0 0 8px 0; color: #374151;">
        処理済: 0 件${hasTotal ? ` / ${totalOrders.toLocaleString()} 件` : ''}
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
          progressText.textContent = hasTotal
            ? `処理済: ${processed.toLocaleString()} / ${totalOrders.toLocaleString()} 件`
            : `処理済: ${processed.toLocaleString()} 件`;
        }
        if (errorText) {
          errorText.textContent = `エラー: ${errorCount} 件`;
          errorText.style.color = errorCount > 0 ? '#EF4444' : '#6B7280';
        }
      }
    };
  }

  function showResultModal(result) {
    const { processed, successCount, errorCount, skippedCount = 0, aborted } = result;
    const title = aborted ? '⏹ 中止しました' : '✅ 完了';
    const hasIssues = errorCount > 0 || skippedCount > 0;

    const content = document.createElement('div');
    content.innerHTML = `
      <p style="margin: 0 0 8px 0; color: #374151;">
        成功: <strong style="color: #10B981;">${successCount.toLocaleString()}件</strong>
      </p>
      <p style="margin: 0 0 8px 0; color: ${errorCount > 0 ? '#EF4444' : '#6B7280'};">
        エラー: <strong>${errorCount}件</strong>
      </p>
      <p style="margin: 0; color: ${skippedCount > 0 ? '#F59E0B' : '#6B7280'};">
        スキップ: <strong>${skippedCount}件</strong>
      </p>
      ${hasIssues ? '<p style="margin: 8px 0 0 0; font-size: 12px; color: #6B7280;">（詳細はコンソールを確認: F12 → Console）</p>' : ''}
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

    // 承認処理を開始する共通関数
    async function startApproval(doctor, totalOrders = null) {
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
    }

    // 医師選択モーダルを表示
    showDoctorSelectModal(async (doctor) => {
      if (!doctor) return;

      const isMe = doctor.uuid === myDoctorUuid;

      // 自分以外の場合はカウントのみ
      if (!isMe) {
        const countingContent = document.createElement('div');
        countingContent.innerHTML = `
          <p style="margin: 0; display: flex; justify-content: space-between; color: #374151;">
            <span>${normalizeSpace(doctor.name)} の承認待ちオーダーを集計しています...</span>
            <span id="henry-count-progress">0 件</span>
          </p>
        `;

        const countingModal = HenryCore.ui.showModal({
          title: '🔄 カウント中...',
          content: countingContent,
          actions: []
        });

        activeCleaner.add(() => countingModal.close());

        try {
          const { totalOrders, elapsed } = await countAllOrders(doctor.uuid, (count) => {
            const el = document.getElementById('henry-count-progress');
            if (el) el.textContent = `${count.toLocaleString()} 件`;
          });
          countingModal.close();
          showConfirmModal(doctor, totalOrders, elapsed, null);
        } catch (e) {
          countingModal.close();
          console.error(`[${SCRIPT_NAME}] エラー:`, e);
        }
        return;
      }

      // 自分の場合：アクション選択モーダル
      const actionContent = document.createElement('div');
      actionContent.innerHTML = `
        <p style="margin: 0 0 12px 0; color: #374151;">
          <strong>${normalizeSpace(doctor.name)}</strong> の承認待ちオーダーを処理します。
        </p>
        <p style="margin: 0; color: #6B7280; font-size: 13px;">
          カウントすると件数を確認してから開始できます。<br>
          すぐに開始すると件数を確認せずに処理を開始します。
        </p>
      `;

      HenryCore.ui.showModal({
        title: '⚡ 承認アシスタント',
        content: actionContent,
        actions: [
          { label: 'キャンセル', variant: 'secondary' },
          {
            label: '📊 カウントする',
            variant: 'secondary',
            onClick: async () => {
              // カウント中モーダル
              const countingContent = document.createElement('div');
              countingContent.innerHTML = `
                <p style="margin: 0; display: flex; justify-content: space-between; color: #374151;">
                  <span>承認待ちオーダーを集計しています...</span>
                  <span id="henry-count-progress">0 件</span>
                </p>
              `;

              const countingModal = HenryCore.ui.showModal({
                title: '🔄 カウント中...',
                content: countingContent,
                actions: []
              });

              activeCleaner.add(() => countingModal.close());

              try {
                const { totalOrders, elapsed } = await countAllOrders(doctor.uuid, (count) => {
                  const el = document.getElementById('henry-count-progress');
                  if (el) el.textContent = `${count.toLocaleString()} 件`;
                });
                countingModal.close();

                showConfirmModal(doctor, totalOrders, elapsed, () => startApproval(doctor, totalOrders));
              } catch (e) {
                countingModal.close();
                console.error(`[${SCRIPT_NAME}] エラー:`, e);
              }
            }
          },
          {
            label: '▶️ すぐに開始',
            variant: 'primary',
            onClick: () => startApproval(doctor, null)
          }
        ]
      });
    });
  }

  // ========== 初期化・登録処理 ==========

  async function init() {
    // HenryCoreの待機
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
    }

    // プラグイン登録（HenryCore v2.7.0以降）
    await HenryCore.registerPlugin({
      id: 'auto-approver',
      name: '承認',
      icon: '⚡',
      description: '承認待ちオーダーを自動で一括承認',
      version: '3.12.0',
      order: 20,
      onClick: main
    });

    console.log(`[${SCRIPT_NAME}] v3.12.0 起動しました`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
