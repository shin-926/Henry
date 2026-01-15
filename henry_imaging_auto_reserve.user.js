// ==UserScript==
// @name         Henry 照射オーダー自動予約
// @namespace    https://henry-app.jp/
// @version      2.0.2
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

  // ListPurposeOfVisits クエリ
  const LIST_PURPOSE_OF_VISITS = `
    query ListPurposeOfVisits {
      listPurposeOfVisits {
        purposeOfVisits {
          uuid
          title
        }
      }
    }
  `;

  // ListUsers クエリ（部署名取得用）
  const LIST_USERS = `
    query ListUsers {
      listUsers {
        users {
          uuid
          name
          departmentName
        }
      }
    }
  `;

  // EncountersInPatient クエリ（SessionからEncounterを探す）
  const ENCOUNTERS_IN_PATIENT = `
    query EncountersInPatient($patientId: ID!, $pageSize: Int) {
      encountersInPatient(patientId: $patientId, pageSize: $pageSize) {
        encounters {
          id
          basedOn {
            uuid
          }
        }
      }
    }
  `;

  // ユーザーの部署名に対応する purposeOfVisit を取得
  const getMatchingPurposeOfVisit = async (core, doctorUuid) => {
    // ListUsersで全ユーザーを取得し、doctorUuidで絞り込み
    const usersResult = await core.query(LIST_USERS);
    const users = usersResult.data?.listUsers?.users || [];
    const user = users.find(u => u.uuid === doctorUuid);
    const departmentName = user?.departmentName;

    if (!departmentName) {
      logError('部署名を取得できませんでした');
      return null;
    }

    log('ユーザー部署:', departmentName);

    const povResult = await core.query(LIST_PURPOSE_OF_VISITS);
    const purposeOfVisits = povResult.data?.listPurposeOfVisits?.purposeOfVisits || [];

    const matched = purposeOfVisits.find(pov => pov.title === departmentName);
    if (matched) {
      log('診療科マッチ:', matched.title, matched.uuid);
      return matched;
    }

    const partialMatch = purposeOfVisits.find(pov =>
      departmentName.includes(pov.title) || pov.title.includes(departmentName)
    );

    if (partialMatch) {
      log('診療科部分マッチ:', partialMatch.title, partialMatch.uuid);
      return partialMatch;
    }

    logError('一致する診療科が見つかりませんでした');
    return null;
  };

  // 外来予約を作成し、EncounterIDを取得
  const createOutpatientReservationAndGetEncounterId = async (core, patientUuid, doctorUuid, purposeOfVisitUuid, dateObj) => {
    const scheduleTime = dateToTimestamp(dateObj);

    // CreateSession mutation（インライン方式）
    const createSessionMutation = `
      mutation {
        createSession(input: {
          uuid: ""
          patientUuid: { value: "${patientUuid}" }
          doctorUuid: "${doctorUuid}"
          purposeOfVisitUuid: "${purposeOfVisitUuid}"
          state: BEFORE_CONSULTATION
          note: ""
          countedInConsultationDays: true
          scheduleTime: { seconds: ${scheduleTime}, nanos: 0 }
        }) {
          uuid
          state
        }
      }
    `;

    log('外来予約を作成中...', { date: `${dateObj.year}/${dateObj.month}/${dateObj.day}`, purposeOfVisitUuid });

    const sessionResult = await core.query(createSessionMutation);

    if (!sessionResult.data?.createSession?.uuid) {
      throw new Error('外来予約の作成に失敗しました');
    }

    const sessionUuid = sessionResult.data.createSession.uuid;
    log('外来予約を作成しました:', sessionUuid);

    // 少し待ってからEncounterを取得（Encounterが作成されるまでの遅延対策）
    await new Promise(resolve => setTimeout(resolve, 500));

    // EncountersInPatientでSessionに紐づくEncounterを探す
    const encountersResult = await core.query(ENCOUNTERS_IN_PATIENT, {
      patientId: patientUuid,
      pageSize: 20
    });

    const encounters = encountersResult.data?.encountersInPatient?.encounters || [];
    const matchedEncounter = encounters.find(enc =>
      enc.basedOn?.some(session => session.uuid === sessionUuid)
    );

    if (!matchedEncounter) {
      throw new Error('作成した予約に対応する診療録が見つかりませんでした');
    }

    log('EncounterIDを取得しました:', matchedEncounter.id);
    return matchedEncounter.id;
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

    log('初期化完了 - fetchインターセプト方式');

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
                const purposeOfVisit = await getMatchingPurposeOfVisit(core, doctorUuid);
                if (!purposeOfVisit) {
                  throw new Error('診療科を特定できません');
                }

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
