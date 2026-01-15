// ==UserScript==
// @name         Henry 照射オーダー自動予約
// @namespace    https://henry-app.jp/
// @version      4.0.0
// @description  照射オーダー完了時に未来日付の場合、外来予約を自動作成し、その診療録に画面遷移してから照射オーダーを保存
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_auto_reserve.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_auto_reserve.user.js
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'ImagingAutoReserve';
  const log = (...args) => console.log(`[${SCRIPT_NAME}]`, ...args);
  const logError = (...args) => console.error(`[${SCRIPT_NAME}]`, ...args);

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
    `
  };

  // HenryCore待機
  const waitForCore = () => new Promise((resolve) => {
    if (window.HenryCore) return resolve(window.HenryCore);
    const check = setInterval(() => {
      if (window.HenryCore) {
        clearInterval(check);
        resolve(window.HenryCore);
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

  // 日付をUnixタイムスタンプ（秒）に変換（9:00固定）
  const dateToTimestamp = (dateObj) => {
    const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day, 9, 0, 0);
    return Math.floor(date.getTime() / 1000);
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
  const createOutpatientReservationAndGetEncounterId = async (core, patientUuid, doctorUuid, purposeOfVisitUuid, dateObj) => {
    const scheduleTime = dateToTimestamp(dateObj);

    log('外来予約を作成中...', { date: `${dateObj.year}/${dateObj.month}/${dateObj.day}`, purposeOfVisitUuid });

    const result = await graphqlFetch(core, 'CreateSession', {
      input: {
        uuid: '',
        patientUuid: { value: patientUuid },
        doctorUuid: doctorUuid,
        purposeOfVisitUuid: purposeOfVisitUuid,
        state: 'BEFORE_CONSULTATION',
        note: '',
        countedInConsultationDays: true,
        scheduleTime: { seconds: scheduleTime, nanos: 0 }
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

  // 新しいEncounterに画面遷移
  const navigateToEncounter = (patientUuid, encounterId) => {
    const newUrl = `https://henry-app.jp/patients/${patientUuid}?hrn=//henry-app.jp/encounter/${encounterId}&tabId=outpatientCf4&contentNavKey=encounters`;
    log('画面遷移:', newUrl);
    window.location.href = newUrl;
  };

  // 画面遷移完了を待機
  const waitForNavigation = (encounterId) => new Promise((resolve) => {
    const maxWait = 10000;
    const startTime = Date.now();

    const check = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl.includes(encounterId)) {
        clearInterval(check);
        // 追加で少し待機（DOMの安定化）
        setTimeout(resolve, 500);
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(check);
        resolve(); // タイムアウトしても続行
      }
    }, 100);
  });

  // 照射オーダーをAPIで直接作成（APQ方式）
  const createImagingOrderDirect = async (core, orderData, encounterId) => {
    const token = await core.getToken();
    const orgUuid = localStorage.getItem('henryOrganizationUuid');

    if (!token || !orgUuid) {
      throw new Error('認証情報が取得できません');
    }

    // encounterIdを差し替え
    orderData.variables.input.encounterId = { value: encounterId };

    log('照射オーダーを作成中...', orderData.variables.input);

    const response = await fetch('https://henry-app.jp/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-organization-uuid': orgUuid
      },
      body: JSON.stringify(orderData)
    });

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || 'GraphQL Error');
    }

    log('照射オーダー作成成功:', json.data);
    return json;
  };

  // メイン処理
  const main = async () => {
    const core = await waitForCore();
    if (!core) {
      logError('HenryCore が見つかりません');
      return;
    }

    log('初期化完了 - 画面遷移方式 v4.0.0');

    // ページ読み込み時に保留中のオーダーがあるかチェック
    const pendingOrder = sessionStorage.getItem('imagingAutoReserve_pendingOrder');
    if (pendingOrder) {
      try {
        const { orderData, encounterId, dateStr } = JSON.parse(pendingOrder);
        sessionStorage.removeItem('imagingAutoReserve_pendingOrder');

        // URLに目的のencounterIdが含まれているか確認
        if (window.location.href.includes(encounterId)) {
          log('保留中の照射オーダーを実行:', encounterId);

          // 少し待機してからオーダー作成（画面安定化）
          await new Promise(r => setTimeout(r, 1000));

          await createImagingOrderDirect(core, orderData, encounterId);
          showNotification(`${dateStr} の外来予約に照射オーダーを保存しました`, 'success');

          // 画面をリロードしてオーダー一覧を更新
          setTimeout(() => window.location.reload(), 1500);
        } else {
          log('遷移先が一致しません。保留オーダーをクリア');
        }
      } catch (error) {
        logError('保留オーダーの実行に失敗:', error.message);
        sessionStorage.removeItem('imagingAutoReserve_pendingOrder');
      }
    }

    // fetchをインターセプト
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [url, options] = args;

      // GraphQLリクエストのみ対象
      if (typeof url === 'string' && url.includes('/graphql') && options?.body) {
        try {
          const body = JSON.parse(options.body);

          // CreateImagingOrderリクエストを検出
          if (body.operationName === 'CreateImagingOrder') {
            const dateObj = body.variables?.input?.date;

            if (dateObj && isFutureDate(dateObj)) {
              const dateStr = `${dateObj.year}/${dateObj.month}/${dateObj.day}`;
              log('未来日付の照射オーダーを検出:', dateStr);

              try {
                // 患者・医師情報を取得
                const patientUuid = core.getPatientUuid();
                const doctorUuid = await core.getMyUuid();

                if (!patientUuid || !doctorUuid) {
                  throw new Error('患者情報または医師情報を取得できません');
                }

                // 診療科を取得
                const purposeOfVisit = await getDefaultPurposeOfVisit(core, dateObj);

                // 外来予約を作成し、EncounterIDを取得
                const newEncounterId = await createOutpatientReservationAndGetEncounterId(
                  core, patientUuid, doctorUuid, purposeOfVisit.uuid, dateObj
                );

                // オーダーデータを保存（画面遷移後に使用）
                const pendingData = {
                  orderData: body,
                  encounterId: newEncounterId,
                  dateStr: dateStr
                };
                sessionStorage.setItem('imagingAutoReserve_pendingOrder', JSON.stringify(pendingData));

                log('オーダーデータを保存、画面遷移します');
                showNotification(`${dateStr} のカルテに移動しています...`, 'info');

                // 元のリクエストをブロック（ダミーレスポンスを返す）
                setTimeout(() => {
                  navigateToEncounter(patientUuid, newEncounterId);
                }, 500);

                // ブロック用のダミーレスポンス
                return new Response(JSON.stringify({
                  data: { createImagingOrder: { uuid: 'pending-navigation' } }
                }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });

              } catch (error) {
                logError('自動予約エラー:', error.message);

                const proceed = confirm(`外来予約の自動作成に失敗しました:\n${error.message}\n\n現在の診療録に照射オーダーを保存しますか？`);

                if (!proceed) {
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
