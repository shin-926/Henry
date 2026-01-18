// ==UserScript==
// @name         予約システム連携
// @namespace    https://github.com/shin-926/Henry
// @version      3.7.0
// @description  Henryカルテと予約システム間の双方向連携（再診予約・照射オーダー自動予約・患者プレビュー）
// @match        https://henry-app.jp/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      henry-app.jp
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_reserve_integration.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_reserve_integration.user.js
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'HenryReserveIntegration';
  const CONFIG = {
    // API
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825',
    HENRY_GRAPHQL: 'https://henry-app.jp/graphql',
    HENRY_GRAPHQL_V2: 'https://henry-app.jp/graphql-v2',
    HENRY_PATIENT_URL: 'https://henry-app.jp/patients/',
    // タイムアウト
    HENRY_CORE_TIMEOUT: 5000,
    TOKEN_REQUEST_TIMEOUT: 3000,
    OBSERVER_TIMEOUT: 10000,
    CONTEXT_EXPIRY: 5 * 60 * 1000,
    // UI
    POLLING_INTERVAL: 100,
    HOVER_DELAY: 150,
    CLOSE_DELAY: 300,
    NOTIFICATION_DURATION: 3000,
    PREVIEW_COUNT: 3
  };

  // 予約システムウィンドウの参照（古いウィンドウを閉じるため）
  let reserveWindowRef = null;

  // GraphQL クエリ定義（フルクエリ方式）
  const QUERIES = {
    GetPatient: `
      query GetPatient($input: GetPatientRequestInput!) {
        getPatient(input: $input) {
          serialNumber
          fullName
          fullNamePhonetic
        }
      }
    `,
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
    ListPatientsV2: `
      query ListPatientsV2($input: ListPatientsV2RequestInput!) {
        listPatientsV2(input: $input) {
          entries {
            patient {
              uuid
              serialNumber
            }
          }
        }
      }
    `,
    EncountersInPatient: `
      query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
        encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
          encounters {
            basedOn {
              ... on Session {
                scheduleTime
                doctor {
                  name
                }
              }
            }
            records(includeDraft: false) {
              __typename
              ... on ProgressNote {
                editorData
              }
            }
          }
        }
      }
    `
  };

  const log = {
    info: (msg) => console.log(`[${SCRIPT_NAME}] ${msg}`),
    warn: (msg) => console.warn(`[${SCRIPT_NAME}] ${msg}`),
    error: (msg) => console.error(`[${SCRIPT_NAME}] ${msg}`)
  };

  const host = location.hostname;
  const isHenry = host === 'henry-app.jp';
  const isReserve = host === 'manage-maokahp.reserve.ne.jp';

  // ==========================================
  // 共通関数
  // ==========================================

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function callHenryAPI(token, operationName, variables, endpoint) {
    const query = QUERIES[operationName];
    if (!query) {
      return Promise.reject(new Error(`Unknown operation: ${operationName}`));
    }

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': CONFIG.ORG_UUID
        },
        data: JSON.stringify({
          operationName,
          variables,
          query
        }),
        onload: (res) => {
          if (res.status !== 200) {
            reject(new Error(`API Error: ${res.status}`));
            return;
          }
          try {
            resolve(JSON.parse(res.responseText));
          } catch (e) {
            reject(new Error('レスポンスのパースに失敗'));
          }
        },
        onerror: () => reject(new Error('通信エラー'))
      });
    });
  }

  // ==========================================
  // Henry側の処理
  // ==========================================
  if (isHenry) {
    log.info('Henry モード起動');

    // --------------------------------------------
    // HenryCore待機
    // --------------------------------------------
    const HENRY_CORE_URL = 'https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js';

    async function waitForHenryCore(timeout = CONFIG.HENRY_CORE_TIMEOUT) {
      let waited = 0;
      while (!unsafeWindow.HenryCore) {
        await new Promise(r => setTimeout(r, CONFIG.POLLING_INTERVAL));
        waited += CONFIG.POLLING_INTERVAL;
        if (waited > timeout) {
          return null;
        }
      }
      return unsafeWindow.HenryCore;
    }

    function showHenryCoreRequiredMessage() {
      alert(
        '【Henry Coreが必要です】\n\n' +
        'このスクリプトを使用するには「Henry Core」が必要です。\n\n' +
        '【インストール手順】\n' +
        '1. 以下のURLをコピーしてブラウザで開く\n' +
        '2. Tampermonkeyのインストール画面で「インストール」をクリック\n' +
        '3. このページを再読み込み\n\n' +
        '【URL】\n' +
        HENRY_CORE_URL
      );
    }

    // --------------------------------------------
    // トークンをGM_storageに同期（Reserve側で使用）
    // --------------------------------------------
    async function syncTokenToGMStorage() {
      try {
        const HenryCore = await waitForHenryCore();
        if (!HenryCore) {
          log.warn('HenryCoreが見つかりません');
          return;
        }

        const token = await HenryCore.getToken();
        if (token) {
          GM_setValue('henry-token', token);
          log.info('トークンをGM_storageに同期完了');
        }
      } catch (e) {
        log.warn('トークン同期失敗: ' + e.message);
      }
    }

    // 初回同期 + ナビゲーション時に再同期
    syncTokenToGMStorage();
    window.addEventListener('henry:navigation', syncTokenToGMStorage);

    // --------------------------------------------
    // トークンリクエスト監視（Reserve側からの要求に応答）
    // --------------------------------------------
    GM_addValueChangeListener('token-request', async (name, oldValue, newValue, remote) => {
      if (!remote) return; // 自分の変更は無視

      log.info('トークンリクエスト受信');
      const HenryCore = await waitForHenryCore();
      if (!HenryCore) {
        log.warn('HenryCoreが見つかりません');
        return;
      }

      const token = await HenryCore.getToken();
      if (token) {
        GM_setValue('henry-token', token);
        log.info('トークンを更新しました');
      } else {
        log.warn('トークンを取得できませんでした');
      }
    });

    // --------------------------------------------
    // 外来タブ切り替え（URLパラメータから）
    // --------------------------------------------
    if (location.search.includes('tab=outpatient')) {
      log.info('外来タブへ切り替え');
      waitAndClickOutpatient();
    }

    async function waitAndClickOutpatient() {
      let waited = 0;

      while (waited < CONFIG.HENRY_CORE_TIMEOUT) {
        const btn = document.querySelector('#outpatientCf4 button');
        if (btn) {
          btn.click();
          log.info('外来ボタンをクリック');
          const cleanUrl = location.href.replace(/[?&]tab=outpatient/, '');
          history.replaceState(null, '', cleanUrl);
          return;
        }
        await new Promise(r => setTimeout(r, CONFIG.POLLING_INTERVAL));
        waited += CONFIG.POLLING_INTERVAL;
      }
      log.warn('外来ボタンが見つかりませんでした');
    }

    // --------------------------------------------
    // 患者情報取得（HenryCore使用）
    // --------------------------------------------
    async function getPatientFromAPI() {
      const uuid = location.pathname.match(/patients\/([a-f0-9-]{36})/)?.[1];
      if (!uuid) {
        throw new Error('患者ページを開いてください');
      }

      const HenryCore = await waitForHenryCore();
      if (!HenryCore) {
        showHenryCoreRequiredMessage();
        throw new Error('HenryCoreが必要です');
      }

      const result = await HenryCore.query(QUERIES.GetPatient, {
        input: { uuid }
      });

      const patient = result.data?.getPatient;
      if (!patient) {
        throw new Error('患者情報を取得できませんでした');
      }

      return {
        id: patient.serialNumber,
        name: patient.fullName,
        namePhonetic: patient.fullNamePhonetic
      };
    }

    // --------------------------------------------
    // 再診予約を開く処理
    // --------------------------------------------
    async function openReserve() {
      log.info('再診予約を開く');

      // 既存の照射オーダーコンテキストをクリア（照射オーダーモードで閉じた場合のクリーンアップ）
      GM_setValue('imagingOrderContext', null);

      try {
        const patientData = await getPatientFromAPI();

        const patientId = patientData.id;
        if (!patientId) {
          alert('患者ID（患者番号）が取得できませんでした');
          return;
        }

        GM_setValue('pendingPatient', { id: patientId, name: patientData.name || '' });

        // 古い予約システムウィンドウが開いていれば閉じる
        if (reserveWindowRef && !reserveWindowRef.closed) {
          log.info('古い予約システムウィンドウを閉じます');
          reserveWindowRef.close();
        }

        const width = window.screen.availWidth;
        const height = window.screen.availHeight;
        reserveWindowRef = window.open(
          'https://manage-maokahp.reserve.ne.jp/',
          'reserveWindow',
          `width=${width},height=${height},left=0,top=0`
        );

      } catch (e) {
        log.error(e.message);

        if (e.message.includes('ハッシュ')) {
          alert('GetPatient APIのハッシュがありません。\nHenryで患者詳細画面を一度開いてください。');
        } else if (e.message.includes('トークン')) {
          alert('認証エラー: ページをリロードしてください');
        } else {
          alert(e.message);
        }
      }
    }

    // --------------------------------------------
    // プラグイン登録（HenryCore.registerPlugin使用）
    // --------------------------------------------
    (async function registerPlugin() {
      try {
        const HenryCore = await waitForHenryCore();
        if (!HenryCore) {
          showHenryCoreRequiredMessage();
          return;
        }

        await HenryCore.registerPlugin({
          id: 'reserve-integration',
          name: '再診予約',
          description: '予約システムを開いて患者情報を自動入力',
          version: '1.3.0',
          order: 30,
          onClick: openReserve
        });

        log.info('プラグイン登録完了');
      } catch (e) {
        log.error('プラグイン登録失敗: ' + e.message);
      }
    })();

    // --------------------------------------------
    // 照射オーダー自動予約機能
    // --------------------------------------------

    // 日付オブジェクトが未来かどうか判定
    function isFutureDate(dateObj) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
      return target > today;
    }

    // 日付と時間をUnixタイムスタンプ（秒）に変換
    function dateTimeToTimestamp(dateObj, timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day, hours, minutes, 0);
      return Math.floor(date.getTime() / 1000);
    }

    // UUID生成
    function generateUUID() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // 診療科を取得
    async function getDefaultPurposeOfVisit(HenryCore, dateObj) {
      const result = await HenryCore.query(QUERIES.ListPurposeOfVisits, {
        input: { searchDate: dateObj }
      });

      const purposeOfVisits = result.data?.listPurposeOfVisits?.purposeOfVisits || [];
      if (purposeOfVisits.length === 0) {
        throw new Error('診療科が見つかりません');
      }

      const defaultPov = purposeOfVisits.find(p => p.order?.value === 1) || purposeOfVisits[0];
      log.info('診療科: ' + defaultPov.title);
      return defaultPov;
    }

    // 外来予約を作成
    async function createOutpatientReservation(HenryCore, patientUuid, doctorUuid, purposeOfVisitUuid, dateObj, timeStr) {
      const scheduleTime = dateTimeToTimestamp(dateObj, timeStr);
      const newEncounterId = generateUUID();

      log.info('外来予約を作成中: ' + dateObj.year + '/' + dateObj.month + '/' + dateObj.day + ' ' + timeStr);

      const result = await HenryCore.query(QUERIES.CreateSession, {
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

      log.info('外来予約を作成しました: ' + session.uuid);
      return encounterId;
    }

    // 予約システムを開いて予約時間を取得
    function openReserveForImagingOrder(patientInfo, dateObj, modality = '') {
      return new Promise((resolve, reject) => {
        const context = {
          patientId: patientInfo.id,
          patientName: patientInfo.name,
          date: `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`,
          modality: modality,  // CT, MRI等
          timestamp: Date.now()
        };
        GM_setValue('imagingOrderContext', context);
        GM_setValue('pendingPatient', { id: patientInfo.id, name: patientInfo.name });
        log.info('照射オーダーコンテキストを保存: ' + JSON.stringify(context));

        // タイムアウト設定（5分）
        const timeout = setTimeout(() => {
          GM_removeValueChangeListener(listenerId);
          GM_setValue('imagingOrderContext', null);
          GM_setValue('pendingPatient', null);
          reject(new Error('予約システムからの応答がタイムアウトしました'));
        }, CONFIG.CONTEXT_EXPIRY);

        // 予約結果を待機
        const listenerId = GM_addValueChangeListener('reservationResult', (name, oldValue, newValue, remote) => {
          if (!newValue) return;

          log.info('予約結果を受信: ' + JSON.stringify(newValue));
          clearTimeout(timeout);
          GM_removeValueChangeListener(listenerId);
          GM_setValue('imagingOrderContext', null);
          GM_setValue('reservationResult', null);

          if (newValue.cancelled) {
            reject(new Error('予約がキャンセルされました'));
          } else if (newValue.time && newValue.date) {
            resolve({ date: newValue.date, time: newValue.time });
          } else if (newValue.time) {
            resolve({ date: null, time: newValue.time });
          } else {
            reject(new Error('予約時間が取得できませんでした'));
          }
        });

        // 予約システムを開く
        const targetDate = new Date(dateObj.year, dateObj.month - 1, dateObj.day, 9, 0, 0);
        const limit = Math.floor(targetDate.getTime() / 1000);
        const reserveUrl = `https://manage-maokahp.reserve.ne.jp/manage/calendar.php?from_date=${context.date}&limit=${limit}`;

        // 古い予約システムウィンドウが開いていれば閉じる
        if (reserveWindowRef && !reserveWindowRef.closed) {
          log.info('古い予約システムウィンドウを閉じます');
          reserveWindowRef.close();
        }

        log.info('予約システムを開きます: ' + reserveUrl);
        const width = window.screen.availWidth;
        const height = window.screen.availHeight;
        reserveWindowRef = window.open(reserveUrl, 'reserveWindow', `width=${width},height=${height},left=0,top=0`);
      });
    }

    // 通知表示
    function showImagingNotification(message, type = 'info') {
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

      if (!document.getElementById('imaging-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'imaging-notification-styles';
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
        setTimeout(() => notification.remove(), CONFIG.CLOSE_DELAY);
      }, CONFIG.NOTIFICATION_DURATION);
    }

    // 照射オーダーfetchインターセプト
    (async function setupImagingOrderIntercept() {
      const HenryCore = await waitForHenryCore();
      if (!HenryCore) return;

      // 初期化時に古いコンテキストをクリア
      GM_setValue('imagingOrderContext', null);
      GM_setValue('reservationResult', null);

      const originalFetch = unsafeWindow.fetch;
      unsafeWindow.fetch = async function(...args) {
        const [url, options] = args;

        if (typeof url === 'string' && url.includes('/graphql') && options?.body) {
          try {
            const body = JSON.parse(options.body);

            if (body.operationName === 'CreateImagingOrder') {
              const dateObj = body.variables?.input?.date;

              if (dateObj && isFutureDate(dateObj)) {
                log.info('未来日付の照射オーダーを検出: ' + dateObj.year + '/' + dateObj.month + '/' + dateObj.day);

                // 自動印刷を即座に遅延させる（smart_printerとの競合を防ぐ）
                GM_setValue('skipAutoPrint', true);
                log.info('自動印刷を遅延モードに設定（早期）');

                try {
                  const patientUuid = HenryCore.getPatientUuid();
                  const doctorUuid = await HenryCore.getMyUuid();

                  if (!patientUuid || !doctorUuid) {
                    throw new Error('患者情報または医師情報を取得できません');
                  }

                  // 患者情報を取得
                  const patientResult = await HenryCore.query(QUERIES.GetPatient, {
                    input: { uuid: patientUuid }
                  });
                  const patient = patientResult.data?.getPatient;
                  if (!patient) {
                    throw new Error('患者情報が見つかりません');
                  }
                  const patientInfo = { id: patient.serialNumber, name: patient.fullName };

                  // モダリティを取得（「モダリティ」テキストの近くにあるselect要素を探す）
                  let modality = '';
                  const modalDialog = document.querySelector('[role="dialog"]');
                  if (modalDialog) {
                    // 「モダリティ」というテキストノードを探し、その親要素内のselectを取得
                    const walker = document.createTreeWalker(modalDialog, NodeFilter.SHOW_TEXT);
                    let node;
                    while ((node = walker.nextNode())) {
                      if (node.textContent.trim() === 'モダリティ') {
                        // 親を辿ってselectを探す
                        let parent = node.parentElement;
                        for (let i = 0; i < 5 && parent; i++) {
                          const select = parent.querySelector('select');
                          if (select && select.selectedIndex >= 0) {
                            modality = select.options[select.selectedIndex]?.text || '';
                            break;
                          }
                          parent = parent.parentElement;
                        }
                        break;
                      }
                    }
                    if (modality) {
                      log.info('モダリティを取得: ' + modality);
                    }
                  }

                  // 確認ダイアログ
                  const confirmMessage = `未来日付（${dateObj.year}/${dateObj.month}/${dateObj.day}）の照射オーダーです。\n\n予約システムで予約を取りますか？\n\n患者: ${patientInfo.id} ${patientInfo.name}`;
                  if (!confirm(confirmMessage)) {
                    log.info('ユーザーが予約システム連携をキャンセル');
                    GM_setValue('skipAutoPrint', false);  // キャンセル時はフラグを戻す
                    return originalFetch.apply(this, args);
                  }

                  // 予約システムを開いて予約日時を取得
                  showImagingNotification('予約システムで予約を取ってください', 'info');
                  const reservationResult = await openReserveForImagingOrder(patientInfo, dateObj, modality);
                  log.info('予約日時: ' + JSON.stringify(reservationResult));

                  // 予約日付を使用
                  let actualDateObj = dateObj;
                  if (reservationResult.date) {
                    const [year, month, day] = reservationResult.date.split('-').map(Number);
                    actualDateObj = { year, month, day };
                  }

                  // 診療科を取得
                  const purposeOfVisit = await getDefaultPurposeOfVisit(HenryCore, actualDateObj);

                  // 外来予約を作成
                  const newEncounterId = await createOutpatientReservation(
                    HenryCore, patientUuid, doctorUuid, purposeOfVisit.uuid, actualDateObj, reservationResult.time
                  );

                  // リクエストボディのencounterIdを差し替え
                  body.variables.input.encounterId = { value: newEncounterId };

                  // 日付も更新
                  if (reservationResult.date) {
                    body.variables.input.date = actualDateObj;
                  }

                  const newOptions = { ...options, body: JSON.stringify(body) };
                  log.info('EncounterIDを差し替えてリクエスト送信: ' + newEncounterId);

                  // リクエストを送信し、完了後に画面を更新
                  const response = await originalFetch.call(this, url, newOptions);

                  showImagingNotification(`${actualDateObj.year}/${actualDateObj.month}/${actualDateObj.day} ${reservationResult.time} の外来予約を作成しました`, 'success');

                  // 受付一覧を更新（リクエスト完了後）
                  if (unsafeWindow.__APOLLO_CLIENT__) {
                    try {
                      unsafeWindow.__APOLLO_CLIENT__.refetchQueries({ include: ['ListSessions'] });
                      log.info('受付一覧を更新しました');
                    } catch (e) {
                      log.warn('受付一覧の更新に失敗: ' + e.message);
                    }
                  }

                  // 自動印刷の遅延フラグをクリア（smart_printerが印刷を実行する）
                  GM_setValue('skipAutoPrint', false);
                  log.info('自動印刷を再開');

                  return response;

                } catch (error) {
                  // エラー時もフラグをクリア
                  GM_setValue('skipAutoPrint', false);
                  log.error('自動予約エラー: ' + error.message);

                  const proceed = confirm(`外来予約の自動作成に失敗しました:\n${error.message}\n\n現在の診療録に照射オーダーを保存しますか？`);

                  if (!proceed) {
                    return new Response(JSON.stringify({ data: null, errors: [{ message: 'ユーザーによりキャンセルされました' }] }), {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' }
                    });
                  }
                }
              }
            }
          } catch (e) {
            // JSONパース失敗等は無視
          }
        }

        return originalFetch.apply(this, args);
      };

      log.info('照射オーダーfetchインターセプト設定完了');
    })();
  }

  // ==========================================
  // 予約システム側の処理
  // ==========================================
  if (isReserve) {
    log.info('予約システムモード起動');

    // --------------------------------------------
    // 不要なポップアップを削除（動的に追加される場合も対応）
    // --------------------------------------------
    function removePopup() {
      // TechTouchのポップアップを探す（Shadow DOMのhost要素）
      const container = document.querySelector('#techtouch-player-snippet');
      if (container) {
        container.remove();
        log.info('TechTouchポップアップを削除しました');
        return true;
      }
      return false;
    }

    // 初回チェック
    removePopup();

    // 動的に追加される場合に備えてMutationObserverで監視
    const popupObserver = new MutationObserver(() => {
      if (removePopup()) {
        popupObserver.disconnect();
      }
    });
    popupObserver.observe(document.documentElement, { childList: true, subtree: false });

    // 10秒後に監視を停止（無駄なリソース消費を防ぐ）
    setTimeout(() => popupObserver.disconnect(), CONFIG.OBSERVER_TIMEOUT);

    // --------------------------------------------
    // カルテ情報キャッシュ（タブを閉じるまで保持）
    // --------------------------------------------
    const karteCache = new Map();

    // --------------------------------------------
    // トークンリクエスト（Henry側に依頼して最新トークンを取得）
    // --------------------------------------------
    function requestToken(timeout = CONFIG.TOKEN_REQUEST_TIMEOUT) {
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          log.warn('トークンリクエストタイムアウト');
          resolve(null);
        }, timeout);

        const listenerId = GM_addValueChangeListener('henry-token', (name, oldValue, newValue, remote) => {
          if (remote && newValue) {
            clearTimeout(timeoutId);
            GM_removeValueChangeListener(listenerId);
            log.info('新しいトークンを受信しました');
            resolve(newValue);
          }
        });

        // リクエスト送信
        GM_setValue('token-request', Date.now());
      });
    }

    // --------------------------------------------
    // API呼び出し（401エラー時に自動リトライ）
    // --------------------------------------------
    async function callHenryAPIWithRetry(operationName, variables) {
      const token = GM_getValue('henry-token', null);
      if (!token) {
        throw new Error('トークンがありません');
      }

      // エンドポイントはオペレーションに応じて決定
      const endpoint = operationName === 'EncountersInPatient'
        ? CONFIG.HENRY_GRAPHQL_V2
        : CONFIG.HENRY_GRAPHQL;

      try {
        return await callHenryAPI(token, operationName, variables, endpoint);
      } catch (e) {
        // 401エラーの場合、新しいトークンを取得して再試行
        if (e.message.includes('401')) {
          log.info('401エラー - 新しいトークンをリクエスト');
          const newToken = await requestToken();
          if (newToken) {
            try {
              return await callHenryAPI(newToken, operationName, variables, endpoint);
            } catch (retryError) {
              if (retryError.message.includes('401')) {
                throw new Error('認証エラー: Henryページを更新してから再度お試しください');
              }
              throw retryError;
            }
          }
          // トークン取得できなかった場合
          throw new Error('認証エラー: Henryページを更新してから再度お試しください');
        }
        throw e;
      }
    }

    // --------------------------------------------
    // セットアップ状態チェック（トークンのみ）
    // --------------------------------------------
    function checkSetupStatus() {
      const token = GM_getValue('henry-token', null);

      if (!token) {
        return {
          ok: false,
          message: '【Henryにログインしてください】\n\n' +
            'この機能を使用するにはHenryへのログインが必要です。\n\n' +
            '【手順】\n' +
            '1. Henry（https://henry-app.jp）を開く\n' +
            '2. ログインする\n' +
            '3. この画面に戻って再度お試しください'
        };
      }

      return { ok: true };
    }

    // --------------------------------------------
    // Henry→Reserve連携：バナー表示・自動入力
    // --------------------------------------------
    // ログインページでは処理しない（ログイン後のページで処理する）
    const isLoginPage = location.pathname.includes('login');
    if (isLoginPage) {
      log.info('ログインページのためHenry連携スキップ');
    }

    // トークン未取得時の通知（ログインページ以外で、初回のみ）
    if (!isLoginPage && !GM_getValue('henry-token', null)) {
      // 画面上部にバナーで通知
      const noticeBanner = document.createElement('div');
      noticeBanner.id = 'henry-login-notice';
      noticeBanner.innerHTML = `
        <span style="margin-right: 8px;">⚠️</span>
        <span>Henry連携を使用するには<a href="https://henry-app.jp" target="_blank" style="color:#1a73e8; text-decoration:underline;">Henry</a>にログインしてください</span>
        <button id="henry-notice-close" style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
      `;
      Object.assign(noticeBanner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        backgroundColor: '#FFF3CD',
        color: '#856404',
        padding: '10px 20px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: '999',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      });
      document.body.appendChild(noticeBanner);
      document.getElementById('henry-notice-close').addEventListener('click', () => {
        noticeBanner.remove();
      });
      log.info('ログイン通知バナーを表示');
    }

    // 同一スクリプト内のGM_*ストレージから取得
    const pendingPatient = !isLoginPage ? GM_getValue('pendingPatient', null) : null;
    let imagingOrderContext = !isLoginPage ? GM_getValue('imagingOrderContext', null) : null;

    // 照射オーダーコンテキストが古い場合は無効化
    if (imagingOrderContext && imagingOrderContext.timestamp) {
      const elapsed = Date.now() - imagingOrderContext.timestamp;
      if (elapsed > CONFIG.CONTEXT_EXPIRY) {
        log.info('照射オーダーコンテキストが古いため無効化:', Math.floor(elapsed / 1000) + '秒経過');
        GM_setValue('imagingOrderContext', null);
        imagingOrderContext = null;
      }
    }

    // 照射オーダーモードが有効かどうか（排他制御）
    const isImagingOrderMode = imagingOrderContext && imagingOrderContext.patientId;

    // 予約登録ボタンリスナー追加済みの要素を追跡（関数より前に宣言が必要）
    let trackedReserveButton = null;

    // --------------------------------------------
    // 照射オーダーモード（Henry照射オーダーからの予約）
    // --------------------------------------------
    if (isImagingOrderMode) {
      log.info('照射オーダーモード起動:', imagingOrderContext);

      // 統合バナー表示（照射オーダーモード）
      showModeBanner('imaging', imagingOrderContext.patientId, imagingOrderContext.patientName, imagingOrderContext);

      // ウィンドウを閉じた時にキャンセル結果を送信（Henry側で即座に検知できる）
      // ※予約成功時はcontextがnullになっているので、その場合は送信しない
      window.addEventListener('beforeunload', () => {
        const currentContext = GM_getValue('imagingOrderContext', null);
        if (currentContext) {
          GM_setValue('reservationResult', { cancelled: true, timestamp: Date.now() });
          GM_setValue('imagingOrderContext', null);
          log.info('ウィンドウ閉じ - キャンセル結果を送信');
        }
      });

      // カレンダーの日付を変更
      navigateToDate(imagingOrderContext.date);

      // 予約登録ボタン監視（日時取得用）+ 患者ID自動入力 + モダリティ自動選択
      const imagingDialogObserver = new MutationObserver(() => {
        tryFillDialog(imagingOrderContext.patientId);
        tryFillDateForImaging(imagingOrderContext);
        trySelectModality(imagingOrderContext.modality);
        setupReservationButtonListener(imagingOrderContext);
      });
      imagingDialogObserver.observe(document.body, { childList: true, subtree: false });
      tryFillDialog(imagingOrderContext.patientId);
      tryFillDateForImaging(imagingOrderContext);
      trySelectModality(imagingOrderContext.modality);
      setupReservationButtonListener(imagingOrderContext);
    }

    // カレンダーの日付を変更する
    function navigateToDate(dateStr) {
      // dateStr format: "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);

      // 予約システムのURLパラメータ形式: ?from_date=YYYY-MM-DD&limit=<unix_timestamp>
      const currentUrl = new URL(location.href);
      const currentFromDate = currentUrl.searchParams.get('from_date');

      if (currentFromDate !== dateStr) {
        // まだ目的の日付でない場合はリダイレクト
        const targetDate = new Date(year, month - 1, day, 9, 0, 0);
        const limit = Math.floor(targetDate.getTime() / 1000);

        currentUrl.searchParams.set('from_date', dateStr);
        currentUrl.searchParams.set('limit', limit.toString());
        log.info('カレンダー日付を変更:', dateStr);
        location.href = currentUrl.toString();
        return;
      }

      log.info('既に目的の日付:', dateStr);
    }

    // 統合バナー表示（照射オーダーモード / 再診予約モード）
    function showModeBanner(mode, patientId, patientName, context = null) {
      if (document.getElementById('henry-mode-banner')) return;

      const isImagingMode = mode === 'imaging';
      const banner = document.createElement('div');
      banner.id = 'henry-mode-banner';

      if (isImagingMode && context) {
        banner.innerHTML = `
          <span><strong>照射オーダー予約</strong></span>
          <span style="margin: 0 12px; color: rgba(255,255,255,0.5);">|</span>
          <span>患者: <strong>${patientId}</strong> ${patientName || ''}</span>
          <span style="margin: 0 12px; color: rgba(255,255,255,0.5);">|</span>
          <span>予約日: <strong>${context.date}</strong></span>
        `;
        Object.assign(banner.style, {
          backgroundColor: '#1565C0',
          color: 'white'
        });
      } else {
        banner.innerHTML = `
          <span><strong>再診予約</strong></span>
          <span style="margin: 0 12px; color: rgba(0,0,0,0.3);">|</span>
          <span>患者: <strong>${patientId}</strong> ${patientName || ''}</span>
        `;
        Object.assign(banner.style, {
          backgroundColor: '#00897B',
          color: 'white'
        });
      }

      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        padding: '12px 20px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: '999',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      });

      document.body.appendChild(banner);
      document.body.style.paddingTop = banner.offsetHeight + 'px';

      // ダイアログをバナーより上に表示するCSS
      if (!document.getElementById('henry-dialog-zindex-fix')) {
        const style = document.createElement('style');
        style.id = 'henry-dialog-zindex-fix';
        style.textContent = '.ui-dialog { z-index: 10000 !important; }';
        document.head.appendChild(style);
      }
    }

    // 照射オーダーモード用：日付のみ自動入力（患者IDは pendingPatient で処理）
    function tryFillDateForImaging(context) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // 日付入力
      const dateInput = document.getElementById('reserve_date');
      if (dateInput && dateInput.value !== context.date) {
        dateInput.value = context.date;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        log.info('日付を自動入力:', context.date);
      }
    }

    function setupReservationButtonListener(context) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // 「予約登録」ボタンをテキストで探す（変更に強いセレクタ）
      const allButtons = Array.from(document.querySelectorAll('button'));
      const reserveBtn = allButtons.find(btn => btn.textContent?.trim() === '予約登録');
      if (!reserveBtn) return;

      // 同じボタンには重複してリスナーを追加しない
      if (trackedReserveButton === reserveBtn) return;

      trackedReserveButton = reserveBtn;
      log.info('予約登録ボタンを検出（新規またはボタン変更）');

      // 患者ID検証用のフラグ
      let patientIdVerified = false;
      let capturedDate = context.date;
      let capturedTime = '09:00';

      // キャプチャフェーズで患者ID・診療種別を検証（不正の場合は予約を阻止）
      reserveBtn.addEventListener('click', (event) => {
        // 患者IDの一致確認
        const patientIdInput = document.getElementById('multi_record_no[0]');
        const inputPatientId = patientIdInput?.value?.trim();

        if (inputPatientId !== context.patientId) {
          event.preventDefault();
          event.stopImmediatePropagation();
          patientIdVerified = false;
          alert(`患者IDが一致しません。\n\n期待: ${context.patientId}\n入力: ${inputPatientId || '(空)'}\n\n照射オーダーの患者と同じ患者で予約してください。`);
          log.error('患者ID不一致 - 予約を阻止:', { expected: context.patientId, actual: inputPatientId });
          return;
        }

        // 診療種別（CT/MRI）の確認
        // 「診療を選択」ラベルを含む親要素からselect要素を探す（IDに依存しない）
        const dialogEl = document.querySelector('#dialog_reserve_input');
        let purposeValue = '';
        if (dialogEl) {
          const listItems = dialogEl.querySelectorAll('li');
          for (const li of listItems) {
            if (li.textContent?.includes('診療を選択')) {
              const select = li.querySelector('select');
              if (select) {
                purposeValue = select.options[select.selectedIndex]?.text || '';
                break;
              }
            }
          }
        }

        // 「診療を選択」がCT/MRIでない場合は警告
        if (!purposeValue.includes('CT') && !purposeValue.includes('MRI')) {
          event.preventDefault();
          event.stopImmediatePropagation();
          patientIdVerified = false;
          alert(`照射オーダーの予約は「CT/MRI」で登録してください。\n\n現在の選択: ${purposeValue || '(未選択)'}\n\n「診療を選択」を「CT/MRI」に変更してから予約登録してください。`);
          log.error('診療種別がCT/MRIではない - 予約を阻止:', { purposeValue });
          return;
        }

        // クリック時に日付と時間を取得（name属性で検索 - 変更に強いセレクタ）
        const dateInput = document.querySelector('input[name="res_date"]');
        const timeInput = document.querySelector('input[name="res_time"]');
        capturedDate = dateInput?.value || context.date;
        capturedTime = timeInput?.value || '09:00';
        patientIdVerified = true;

        log.info('予約登録ボタンがクリックされました。患者ID確認OK、診療種別:', purposeValue || '(未取得)', '日付:', capturedDate, '時間:', capturedTime);
      }, { capture: true });

      // バブリングフェーズでダイアログ閉じを監視
      reserveBtn.addEventListener('click', () => {
        if (!patientIdVerified) return;

        // ダイアログが閉じるのを監視（MutationObserverでstyle変更を検知）
        const dialogElement = document.querySelector('#dialog_reserve_input');
        const uiDialog = dialogElement?.closest('.ui-dialog');
        if (!uiDialog) {
          log.warn('ダイアログ要素が見つかりません');
          return;
        }

        const dialogCloseObserver = new MutationObserver(() => {
          if (uiDialog.style.display === 'none') {
            dialogCloseObserver.disconnect();
            log.info('予約登録完了を検出。予約日時を送信:', capturedDate, capturedTime);

            // 予約結果をHenryに送信（日付と時間）
            GM_setValue('reservationResult', { date: capturedDate, time: capturedTime, timestamp: Date.now() });
            GM_setValue('imagingOrderContext', null);
            GM_setValue('pendingPatient', null);

            // バナーを削除
            const modeBanner = document.getElementById('henry-mode-banner');
            if (modeBanner) modeBanner.remove();
            document.body.style.paddingTop = '0';

            // 確認メッセージを表示してウィンドウを閉じる
            alert(`予約を登録しました。\n\n日付: ${capturedDate}\n時間: ${capturedTime}\n\nウィンドウを閉じます。`);
            window.close();
          }
        });
        dialogCloseObserver.observe(uiDialog, { attributes: true, attributeFilter: ['style'] });

        // タイムアウト
        setTimeout(() => dialogCloseObserver.disconnect(), CONFIG.OBSERVER_TIMEOUT);
      });
    }

    // 患者情報がある場合（通常の再診予約のみ - 照射オーダーモードは上で処理済み）
    if (pendingPatient && pendingPatient.id && !isImagingOrderMode) {
      GM_setValue('pendingPatient', null);
      log.info('再診予約モード - カルテID:', pendingPatient.id, '患者名:', pendingPatient.name);

      // 統合バナー表示（再診予約モード）
      showModeBanner('revisit', pendingPatient.id, pendingPatient.name);

      // ダイアログ自動入力の監視
      const dialogObserver = new MutationObserver(() => {
        tryFillDialog(pendingPatient.id);
      });
      dialogObserver.observe(document.body, { childList: true, subtree: false });
      tryFillDialog(pendingPatient.id);

    } else if (!isImagingOrderMode) {
      log.info('pendingPatientなし - Henry連携スキップ');
    }

    function tryFillDialog(patientId) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      const input = document.getElementById('multi_record_no[0]');
      if (!input) return;

      if (input.value.trim() !== '') return;

      input.value = patientId;
      input.focus();
      try { input.setSelectionRange(patientId.length, patientId.length); } catch (e) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      log.info('ID自動入力完了');

      const searchBtn = document.querySelector('#div_multi_record_no_input_0 > input.input_board_search_customer');
      if (searchBtn) {
        searchBtn.click();
        log.info('検索ボタン自動クリック');
      }
    }

    // モダリティ（CT/MRI）を自動選択（照射オーダーモード用）
    let trackedModalitySelect = null;
    function trySelectModality(modality) {
      if (!modality) return;

      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // CTまたはMRIを含むか判定
      const isCT = modality.includes('CT');
      const isMRI = modality.includes('MRI');
      if (!isCT && !isMRI) return;

      // 「診療を選択」がCT/MRIになっているか確認
      const allSelects = dialog.querySelectorAll('select');
      for (const select of allSelects) {
        const options = Array.from(select.options);
        const optionTexts = options.map(opt => opt.text);

        // CTとMRIのみを持つセレクトを探す（CT/MRI詳細選択）
        if (optionTexts.length === 2 && optionTexts.includes('CT') && optionTexts.includes('MRI')) {
          // 同じセレクトには重複して設定しない
          if (trackedModalitySelect === select) return;

          // テキストからoptionを探してそのvalueを使用
          const targetText = isMRI ? 'MRI' : 'CT';
          const targetOption = options.find(opt => opt.text === targetText);
          if (targetOption) {
            select.value = targetOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            trackedModalitySelect = select;
            log.info('モダリティを自動選択:', targetText, '(value=' + targetOption.value + ')');
          }
          return;
        }
      }
    }

    // --------------------------------------------
    // Reserve→Henry連携：ツールチップにカルテボタン追加・ホバーでカルテ表示
    // --------------------------------------------

    // ツールチップ（クリックで表示）に「カルテを開く」ボタンを追加
    function addKarteButtonToTooltip(tooltip) {
      // 既にボタンがあれば何もしない
      if (tooltip.querySelector('#henry-open-karte-btn')) return;

      const historyBtn = tooltip.querySelector('.button_func_history');
      if (!historyBtn) return;

      const karteBtn = document.createElement('input');
      karteBtn.type = 'button';
      karteBtn.className = 'button';
      karteBtn.id = 'henry-open-karte-btn';
      karteBtn.value = 'カルテ';
      karteBtn.style.cssText = 'padding: 5px 14px; margin-left: 12px;';

      karteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // セットアップ状態チェック
        const setup = checkSetupStatus();
        if (!setup.ok) {
          alert(setup.message);
          return;
        }

        // 患者番号を取得
        const numSpan = tooltip.querySelector('#reserve_tooltip_cus_record_no');
        const patientNumber = numSpan?.textContent.trim();
        if (!patientNumber) {
          alert('患者番号が取得できません');
          return;
        }

        // UUIDを取得してHenryを開く
        karteBtn.disabled = true;
        karteBtn.value = '読込中...';
        try {
          const uuid = await getPatientUuid(patientNumber);
          if (!uuid) {
            alert(`患者番号 ${patientNumber} が見つかりません`);
            return;
          }
          const url = CONFIG.HENRY_PATIENT_URL + uuid + '?tab=outpatient';
          window.open(url, '_blank');
        } catch (err) {
          log.error(err.message);
          alert('エラー: ' + err.message);
        } finally {
          karteBtn.disabled = false;
          karteBtn.value = 'カルテ';
        }
      });

      historyBtn.after(karteBtn);
      log.info('カルテボタンを追加');
    }

    // ツールチップの表示を監視
    const tooltipObserver = new MutationObserver(() => {
      const tooltip = document.getElementById('div_reserve_copy');
      if (tooltip && tooltip.style.display !== 'none' && tooltip.offsetParent !== null) {
        addKarteButtonToTooltip(tooltip);
      }
    });
    tooltipObserver.observe(document.body, { childList: true, subtree: false });

    // 初回チェック
    const initialTooltip = document.getElementById('div_reserve_copy');
    if (initialTooltip) {
      addKarteButtonToTooltip(initialTooltip);
    }

    // --------------------------------------------
    // ホバーでカルテ情報をプレビュー表示
    // --------------------------------------------
    let currentPatientNumber = null;
    let currentPatientUuid = null;
    let hoverTimeout = null;

    // 独立したプレビューウィンドウを作成
    let previewWindow = null;
    let closeTimeout = null;

    // プレビューウィンドウ用のスタイルを追加
    const previewStyle = document.createElement('style');
    previewStyle.textContent = `
      #henry-preview-window .datetime {
        display: block;
        margin-top: 4px;
      }
    `;
    document.head.appendChild(previewStyle);

    // プレビューウィンドウの高さを画面内に収める（位置は固定、max-heightで制限）
    function adjustPreviewPosition() {
      if (!previewWindow || previewWindow.style.display === 'none') return;

      const pwRect = previewWindow.getBoundingClientRect();
      const availableHeight = window.innerHeight - pwRect.top - 10;

      // 下端がはみ出す場合はmax-heightを制限
      if (pwRect.bottom > window.innerHeight - 10) {
        previewWindow.style.maxHeight = availableHeight + 'px';
      }
    }

    function createPreviewWindow() {
      const div = document.createElement('div');
      div.id = 'henry-preview-window';
      div.style.cssText = `
        position: fixed;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 12px;
        z-index: 100001;
        overflow-y: auto;
        font-family: 'Noto Sans JP', sans-serif;
        font-size: 13px;
        display: none;
        box-sizing: border-box;
      `;

      div.addEventListener('mouseenter', () => {
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      });

      div.addEventListener('mouseleave', () => {
        closeTimeout = setTimeout(() => {
          hidePreview();
        }, CONFIG.CLOSE_DELAY);
      });

      document.body.appendChild(div);
      return div;
    }

    function showPreview(originalTooltip) {
      if (!previewWindow) {
        previewWindow = createPreviewWindow();
      }

      // 元のツールチップの内容をコピー（生年月日・TELの前で改行）
      previewWindow.innerHTML = originalTooltip.innerHTML
        .replace(/生年月日/g, '<br>生年月日')
        .replace(/TEL/g, '<br>TEL');

      // 位置とサイズを元のツールチップに合わせる
      const rect = originalTooltip.getBoundingClientRect();
      previewWindow.style.left = rect.left + 'px';
      previewWindow.style.top = rect.top + 'px';
      previewWindow.style.width = rect.width + 'px';
      previewWindow.style.maxHeight = '';  // リセット（前回の制限をクリア）
      previewWindow.style.display = 'block';

      // 元のツールチップを非表示
      originalTooltip.style.display = 'none';

      // 画面外にはみ出さないように調整
      adjustPreviewPosition();

      return previewWindow;
    }

    function hidePreview() {
      if (previewWindow) {
        previewWindow.style.display = 'none';
      }
      currentPatientNumber = null;
      currentPatientUuid = null;
    }

    // カルテ情報をプレビューウィンドウに追加
    function appendKarteToPreview(content) {
      if (!previewWindow) return;

      // 既存のカルテ情報があれば削除
      const existing = previewWindow.querySelector('#henry-karte-info');
      if (existing) existing.remove();

      // カルテ情報を追加
      const karteDiv = document.createElement('div');
      karteDiv.id = 'henry-karte-info';
      karteDiv.style.cssText = `
        background-color: #f0f8ff;
        padding: 10px;
        margin-top: 10px;
        border-top: 2px solid #4682B4;
        font-size: 12px;
      `;
      karteDiv.innerHTML = content;
      previewWindow.appendChild(karteDiv);

      // コンテンツ追加後に位置を再調整
      adjustPreviewPosition();
    }

    function parseEditorData(editorDataStr) {
      try {
        const data = JSON.parse(editorDataStr);
        return data.blocks.map(b => b.text).filter(t => t).join('\n');
      } catch (e) {
        return '(診療録を解析できませんでした)';
      }
    }

    async function fetchAndShowEncounter(patientUuid) {
      // キャッシュを確認
      if (karteCache.has(patientUuid)) {
        log.info('カルテ情報をキャッシュから取得');
        appendKarteToPreview(karteCache.get(patientUuid));
        return;
      }

      appendKarteToPreview('<div style="color:#666;">読み込み中...</div>');

      try {
        const result = await callHenryAPIWithRetry('EncountersInPatient', {
          patientId: patientUuid,
          startDate: null,
          endDate: null,
          pageSize: CONFIG.PREVIEW_COUNT,
          pageToken: null
        });

        const encounters = result.data?.encountersInPatient?.encounters ?? [];
        if (encounters.length === 0) {
          const noDataHtml = '<div style="color:#666;">外来記録がありません</div>';
          karteCache.set(patientUuid, noDataHtml);
          appendKarteToPreview(noDataHtml);
          return;
        }

        const htmlParts = encounters.map((encounter, index) => {
          const session = encounter.basedOn?.[0];
          const progressNote = encounter.records?.find(r => r.__typename === 'ProgressNote');

          const visitDate = session?.scheduleTime ? new Date(session.scheduleTime).toLocaleDateString('ja-JP') : '不明';
          const doctorName = session?.doctor?.name || '不明';
          const noteText = progressNote?.editorData ? parseEditorData(progressNote.editorData) : '(診療録なし)';
          const borderStyle = index < encounters.length - 1 ? 'border-bottom: 1px solid #ccc; margin-bottom: 12px; padding-bottom: 12px;' : '';

          return `
            <div style="${borderStyle}">
              <div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid #ddd;">
                <span style="font-weight:bold; color:#333;">${visitDate}</span>
                <span style="color:#666; margin-left:8px;">${doctorName}</span>
              </div>
              <div style="white-space:pre-wrap; color:#333; line-height:1.4;">${escapeHtml(noteText)}</div>
            </div>
          `;
        });

        const karteHtml = htmlParts.join('');
        karteCache.set(patientUuid, karteHtml);
        appendKarteToPreview(karteHtml);

      } catch (e) {
        log.error(e.message);
        // エラーはキャッシュしない（再試行できるように）
        appendKarteToPreview(`<div style="color:#c00;">エラー: ${escapeHtml(e.message)}</div>`);
      }
    }

    async function getPatientUuid(patientNumber) {
      try {
        const result = await callHenryAPIWithRetry('ListPatientsV2', {
          input: {
            generalFilter: { query: patientNumber, patientCareType: 'PATIENT_CARE_TYPE_ANY' },
            hospitalizationFilter: { doctorUuid: null, roomUuids: [], wardUuids: [], states: [], onlyLatest: true },
            sorts: [],
            pageSize: 10,  // 複数件取得して完全一致を探す
            pageToken: ''
          }
        });

        const entries = result.data?.listPatientsV2?.entries ?? [];

        // 患者番号が完全一致するエントリを探す（患者取り違え防止）
        const exactMatch = entries.find(e => e.patient?.serialNumber === patientNumber);
        if (!exactMatch) {
          log.warn(`患者番号 ${patientNumber} の完全一致が見つかりません`);
          return null;
        }

        return exactMatch.patient.uuid;

      } catch (e) {
        log.error('患者UUID取得エラー: ' + e.message);
        return null;
      }
    }

    // ホバーイベント：予約枠にホバーしたらプレビューウィンドウを表示
    document.addEventListener('mouseover', async (e) => {
      // 予約枠にホバー
      const reserveTarget = e.target.closest('.div_reserve');
      if (!reserveTarget) return;

      // 閉じるタイマーをキャンセル
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }

      // 少し待ってツールチップが表示されるのを待つ
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(async () => {
        const tooltip = document.getElementById('div_reserve_copy');
        if (!tooltip) {
          log.warn('ツールチップが見つかりません');
          return;
        }

        // 患者番号を取得
        const numSpan = tooltip.querySelector('#reserve_tooltip_cus_record_no');
        if (!numSpan) {
          log.warn('患者番号要素が見つかりません');
          return;
        }

        const patientNumber = numSpan.textContent.trim();
        if (!patientNumber) return;
        if (patientNumber === currentPatientNumber && previewWindow?.style.display !== 'none') return;

        currentPatientNumber = patientNumber;
        log.info('患者番号検出: ' + patientNumber);

        // プレビューウィンドウを表示（ツールチップの内容をコピー）
        showPreview(tooltip);

        // セットアップ状態チェック
        const setup = checkSetupStatus();
        if (!setup.ok) {
          appendKarteToPreview('<div style="color:#c00;">Henryにログインしてください</div>');
          return;
        }

        const uuid = await getPatientUuid(patientNumber);
        if (!uuid) {
          appendKarteToPreview('<div style="color:#c00;">患者が見つかりません</div>');
          return;
        }
        currentPatientUuid = uuid;
        await fetchAndShowEncounter(uuid);
      }, CONFIG.HOVER_DELAY);
    });

    // 予約枠からマウスが離れたら閉じるタイマーを開始
    document.addEventListener('mouseout', (e) => {
      const reserveTarget = e.target.closest('.div_reserve');
      if (!reserveTarget) return;

      // プレビューウィンドウに移動中でなければ閉じるタイマーを開始
      closeTimeout = setTimeout(() => {
        if (previewWindow && !previewWindow.matches(':hover')) {
          hidePreview();
        }
      }, CONFIG.CLOSE_DELAY);
    });

  }
})();
