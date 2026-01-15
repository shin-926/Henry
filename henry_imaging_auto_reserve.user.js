// ==UserScript==
// @name         Henry 照射オーダー自動予約
// @namespace    https://github.com/shin-926/Henry
// @version      4.5.2
// @description  照射オーダー完了時に未来日付の場合、予約システムで予約を取ってから外来予約を自動作成し、その診療録に照射オーダーを紐づける
// @match        https://henry-app.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_auto_reserve.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_auto_reserve.user.js
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'ImagingAutoReserve';
  const log = (...args) => console.log(`[${SCRIPT_NAME}]`, ...args);
  const logError = (...args) => console.error(`[${SCRIPT_NAME}]`, ...args);

  // ページウィンドウ参照（GM_*使用時はunsafeWindow経由でHenryCoreにアクセス）
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // GraphQL クエリ定義（フルクエリ方式）
  const QUERIES = {
    ListPurposeOfVisits: `
      query ListPurposeOfVisits($input: ListPurposeOfVisitRequestInput!) {
        listPurposeOfVisits(input: $input) {
          purposeOfVisits {
            uuid
            title
            order { value }
          }
        }
      }
    `,
    CreateSession: `
      mutation CreateSession($input: SessionInput!) {
        createSession(input: $input) {
          uuid
          encounterId { value }
        }
      }
    `,
    GetPatient: `
      query GetPatient($input: GetPatientRequestInput!) {
        getPatient(input: $input) {
          serialNumber
          fullName
        }
      }
    `
  };

  // HenryCore待機
  const waitForCore = () => new Promise((resolve) => {
    if (pageWindow.HenryCore) return resolve(pageWindow.HenryCore);
    const check = setInterval(() => {
      if (pageWindow.HenryCore) {
        clearInterval(check);
        resolve(pageWindow.HenryCore);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(check);
      resolve(null);
    }, 10000);
  });

  // GraphQL APIを呼び出す（フルクエリ方式）
  const graphqlFetch = async (core, operationName, variables) => {
    const token = await core.getToken();
    const orgUuid = localStorage.getItem('henryOrganizationUuid');

    if (!token || !orgUuid) {
      throw new Error('認証情報が取得できません');
    }

    const response = await fetch('https://henry-app.jp/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-organization-uuid': orgUuid
      },
      body: JSON.stringify({
        operationName,
        query: QUERIES[operationName],
        variables
      })
    });

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || 'GraphQL Error');
    }

    return json;
  };

  // 日付オブジェクトが未来かどうか判定
  const isFutureDate = (dateObj) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
    return target > today;
  };

  // 日付と時間をUnixタイムスタンプ（秒）に変換
  const dateTimeToTimestamp = (dateObj, timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day, hours, minutes, 0);
    return Math.floor(date.getTime() / 1000);
  };

  // UUID生成（Henry UIと同じ形式でencounterIdを事前生成）
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // フォールバック
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 患者情報を取得
  const getPatientInfo = async (core, patientUuid) => {
    const result = await graphqlFetch(core, 'GetPatient', {
      input: { uuid: patientUuid }
    });

    const patient = result.data?.getPatient;
    if (!patient) {
      throw new Error('患者情報が見つかりません');
    }

    return {
      id: patient.serialNumber,
      name: patient.fullName
    };
  };

  // 診療科一覧を取得し、デフォルト（最初）を返す
  const getDefaultPurposeOfVisit = async (core, dateObj) => {
    const result = await graphqlFetch(core, 'ListPurposeOfVisits', {
      input: { searchDate: dateObj }
    });

    const purposeOfVisits = result.data?.listPurposeOfVisits?.purposeOfVisits || [];
    if (purposeOfVisits.length === 0) {
      throw new Error('診療科が見つかりません');
    }

    // TODO: ユーザーの部署名とマッチングする機能を追加予定
    // 現在は最初の診療科（orderが1のもの）を使用
    const defaultPov = purposeOfVisits.find(p => p.order?.value === 1) || purposeOfVisits[0];
    log('診療科:', defaultPov.title, defaultPov.uuid);
    return defaultPov;
  };

  // 外来予約を作成し、EncounterIDを取得
  const createOutpatientReservationAndGetEncounterId = async (core, patientUuid, doctorUuid, purposeOfVisitUuid, dateObj, timeStr) => {
    const scheduleTime = dateTimeToTimestamp(dateObj, timeStr);
    // Henry UIと同様にencounterIdを事前生成
    const newEncounterId = generateUUID();

    log('外来予約を作成中...', { date: `${dateObj.year}/${dateObj.month}/${dateObj.day}`, time: timeStr, purposeOfVisitUuid, encounterId: newEncounterId });

    const result = await graphqlFetch(core, 'CreateSession', {
      input: {
        uuid: '',
        patientUuid: { value: patientUuid },
        doctorUuid: doctorUuid,
        purposeOfVisitUuid: purposeOfVisitUuid,
        state: 'BEFORE_CONSULTATION',
        note: '',
        countedInConsultationDays: true,
        scheduleTime: { seconds: scheduleTime, nanos: 0 },
        encounterId: { value: newEncounterId }
      }
    });

    const session = result.data?.createSession;
    if (!session?.uuid) {
      throw new Error('外来予約の作成に失敗しました');
    }

    const encounterId = session.encounterId?.value;
    if (!encounterId) {
      throw new Error('診療録IDが取得できませんでした');
    }

    log('外来予約を作成しました:', session.uuid);
    log('EncounterIDを取得しました:', encounterId);
    return encounterId;
  };

  // 予約システムを開いて予約時間を取得
  const openReserveAndGetTime = (patientInfo, dateObj) => {
    return new Promise((resolve, reject) => {
      // 照射オーダーコンテキストを保存
      const context = {
        patientId: patientInfo.id,
        patientName: patientInfo.name,
        date: `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`,
        timestamp: Date.now()
      };
      GM_setValue('imagingOrderContext', context);
      log('照射オーダーコンテキストを保存:', context);

      // 通常の再診予約と同じく pendingPatient も設定（患者バナー表示・自動入力用）
      GM_setValue('pendingPatient', { id: patientInfo.id, name: patientInfo.name });
      log('患者情報を保存:', patientInfo);

      // タイムアウト設定（5分）
      let windowCheckInterval = null;
      const timeout = setTimeout(() => {
        if (windowCheckInterval) clearInterval(windowCheckInterval);
        GM_removeValueChangeListener(listenerId);
        GM_setValue('imagingOrderContext', null);
        GM_setValue('pendingPatient', null);
        reject(new Error('予約システムからの応答がタイムアウトしました'));
      }, 5 * 60 * 1000);

      // 予約結果を待機
      const listenerId = GM_addValueChangeListener('reservationResult', (name, oldValue, newValue, remote) => {
        if (!remote || !newValue) return;

        log('予約結果を受信:', newValue);
        clearTimeout(timeout);
        if (windowCheckInterval) clearInterval(windowCheckInterval);
        GM_removeValueChangeListener(listenerId);
        GM_setValue('imagingOrderContext', null);
        GM_setValue('reservationResult', null);

        if (newValue.cancelled) {
          reject(new Error('予約がキャンセルされました'));
        } else if (newValue.time && newValue.date) {
          resolve({ date: newValue.date, time: newValue.time });
        } else if (newValue.time) {
          // 日付がない場合は元の日付を使用（後方互換性）
          resolve({ date: null, time: newValue.time });
        } else {
          reject(new Error('予約時間が取得できませんでした'));
        }
      });

      // 予約システムを開く（指定日付のカレンダーページを直接開く）
      const targetDate = new Date(dateObj.year, dateObj.month - 1, dateObj.day, 9, 0, 0);
      const limit = Math.floor(targetDate.getTime() / 1000);
      const reserveUrl = `https://manage-maokahp.reserve.ne.jp/manage/calendar.php?from_date=${context.date}&limit=${limit}`;

      const width = window.screen.availWidth;
      const height = window.screen.availHeight;
      const reserveWindow = window.open(
        reserveUrl,
        'reserveWindow',
        `width=${width},height=${height},left=0,top=0`
      );

      log('予約システムを開きました');

      // ウィンドウが閉じられたかを監視（予約せずに閉じた場合を検知）
      windowCheckInterval = setInterval(() => {
        if (reserveWindow && reserveWindow.closed) {
          clearInterval(windowCheckInterval);
          clearTimeout(timeout);
          GM_removeValueChangeListener(listenerId);

          // まだ結果が返ってきていなければキャンセル扱い
          const currentResult = GM_getValue('reservationResult', null);
          if (!currentResult || currentResult.timestamp < context.timestamp) {
            log('予約システムが閉じられました（予約なし）');
            GM_setValue('imagingOrderContext', null);
            GM_setValue('pendingPatient', null);
            reject(new Error('予約システムが閉じられました'));
          }
        }
      }, 500);
    });
  };

  // 通知を表示
  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      z-index: 100000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      background-color: ${type === 'success' ? '#00cc92' : type === 'error' ? '#e53935' : '#2196f3'};
    `;
    notification.textContent = message;

    if (!document.getElementById('imaging-auto-reserve-styles')) {
      const style = document.createElement('style');
      style.id = 'imaging-auto-reserve-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  // メイン処理
  const main = async () => {
    const core = await waitForCore();
    if (!core) {
      logError('HenryCore が見つかりません');
      return;
    }

    log('初期化完了 - フルクエリ方式 v4.5.2 (予約システム連携)');

    // 初期化時に古いコンテキストをクリア
    GM_setValue('imagingOrderContext', null);
    GM_setValue('reservationResult', null);

    // fetchをインターセプト
    const originalFetch = pageWindow.fetch;
    pageWindow.fetch = async function(...args) {
      const [url, options] = args;

      // GraphQLリクエストのみ対象
      if (typeof url === 'string' && url.includes('/graphql') && options?.body) {
        try {
          const body = JSON.parse(options.body);

          // CreateImagingOrderリクエストを検出
          if (body.operationName === 'CreateImagingOrder') {
            const dateObj = body.variables?.input?.date;

            if (dateObj && isFutureDate(dateObj)) {
              log('未来日付の照射オーダーを検出:', `${dateObj.year}/${dateObj.month}/${dateObj.day}`);

              try {
                // 患者・医師情報を取得
                const patientUuid = core.getPatientUuid();
                const doctorUuid = await core.getMyUuid();

                if (!patientUuid || !doctorUuid) {
                  throw new Error('患者情報または医師情報を取得できません');
                }

                // 患者情報を取得（予約システムに渡すため）
                const patientInfo = await getPatientInfo(core, patientUuid);

                // 確認ダイアログ
                const confirmMessage = `未来日付（${dateObj.year}/${dateObj.month}/${dateObj.day}）の照射オーダーです。\n\n予約システムで予約を取りますか？\n\n患者: ${patientInfo.id} ${patientInfo.name}`;
                if (!confirm(confirmMessage)) {
                  // キャンセル時は元のリクエストをそのまま送信（今日の診療録に紐づく）
                  log('ユーザーが予約システム連携をキャンセル');
                  return originalFetch.apply(this, args);
                }

                // 予約システムを開いて予約日時を取得
                showNotification('予約システムで予約を取ってください', 'info');
                const reservationResult = await openReserveAndGetTime(patientInfo, dateObj);
                log('予約日時:', reservationResult);

                // 予約システムで選択された日付を使用（異なる日付が選ばれた場合に対応）
                let actualDateObj = dateObj;
                if (reservationResult.date) {
                  const [year, month, day] = reservationResult.date.split('-').map(Number);
                  actualDateObj = { year, month, day };
                  if (reservationResult.date !== `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`) {
                    log('予約日が変更されました:', reservationResult.date);
                  }
                }

                // 診療科を取得（予約システムで選択された日付で）
                const purposeOfVisit = await getDefaultPurposeOfVisit(core, actualDateObj);

                // 外来予約を作成し、EncounterIDを取得
                const newEncounterId = await createOutpatientReservationAndGetEncounterId(
                  core, patientUuid, doctorUuid, purposeOfVisit.uuid, actualDateObj, reservationResult.time
                );

                // リクエストボディのencounterIdを差し替え
                body.variables.input.encounterId = { value: newEncounterId };

                // 予約システムで日付が変更された場合、照射オーダーの日付も更新
                if (reservationResult.date && (actualDateObj.year !== dateObj.year || actualDateObj.month !== dateObj.month || actualDateObj.day !== dateObj.day)) {
                  body.variables.input.date = actualDateObj;
                  log('照射オーダーの日付も更新:', actualDateObj);
                }

                // 修正したボディでリクエスト
                const newOptions = {
                  ...options,
                  body: JSON.stringify(body)
                };

                log('EncounterIDを差し替えてリクエスト送信:', newEncounterId);
                showNotification(`${actualDateObj.year}/${actualDateObj.month}/${actualDateObj.day} ${reservationResult.time} の外来予約を作成し、照射オーダーを紐づけました`, 'success');

                return originalFetch.call(this, url, newOptions);

              } catch (error) {
                logError('自動予約エラー:', error.message);

                const proceed = confirm(`外来予約の自動作成に失敗しました:\n${error.message}\n\n現在の診療録に照射オーダーを保存しますか？`);

                if (!proceed) {
                  // キャンセル時はリクエストを中断（空のレスポンスを返す）
                  return new Response(JSON.stringify({ data: null, errors: [{ message: 'ユーザーによりキャンセルされました' }] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
                // 続行時は元のリクエストをそのまま送信
              }
            }
          }
        } catch (e) {
          // JSONパース失敗等は無視して元のリクエストを実行
        }
      }

      return originalFetch.apply(this, args);
    };

    log('fetchインターセプト設定完了');
  };

  main();
})();
