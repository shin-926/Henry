// ==UserScript==
// @name         Henry 照射オーダー自動予約
// @namespace    https://henry-app.jp/
// @version      3.0.0
// @description  照射オーダー完了時に未来日付の場合、外来予約を自動作成し、その診療録に照射オーダーを紐づける
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

  // APQ ハッシュ定数
  const APQ_HASHES = {
    ListPurposeOfVisits: '77f4f4540079f300ff2c2ec757e1a301f7b153fe39b06a95350dc54d09ef88bd',
    CreateSession: '522a869a101be6fe1d999aa8fac8395ec6b55414c4717dcfc9a31e24acbb4f08'
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

  // APQ方式でGraphQL APIを呼び出す
  const apqFetch = async (core, operationName, variables) => {
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
        variables,
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: APQ_HASHES[operationName]
          }
        }
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
    const result = await apqFetch(core, 'ListPurposeOfVisits', {
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

    const result = await apqFetch(core, 'CreateSession', {
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

  // メイン処理
  const main = async () => {
    const core = await waitForCore();
    if (!core) {
      logError('HenryCore が見つかりません');
      return;
    }

    log('初期化完了 - APQ方式 v3.0.0');

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
              log('未来日付の照射オーダーを検出:', `${dateObj.year}/${dateObj.month}/${dateObj.day}`);

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

                // リクエストボディのencounterIdを差し替え
                body.variables.input.encounterId = { value: newEncounterId };

                // 修正したボディでリクエスト
                const newOptions = {
                  ...options,
                  body: JSON.stringify(body)
                };

                log('EncounterIDを差し替えてリクエスト送信:', newEncounterId);
                showNotification(`${dateObj.year}/${dateObj.month}/${dateObj.day} の外来予約を作成し、照射オーダーを紐づけました`, 'success');

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
