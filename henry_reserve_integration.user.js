// ==UserScript==
// @name         予約システム連携
// @namespace    https://github.com/shin-926/Tampermonkey
// @version      2.2.0
// @description  Henryカルテと予約システム間の双方向連携（再診予約・患者プレビュー・ページ遷移）
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
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825',
    HENRY_GRAPHQL: 'https://henry-app.jp/graphql',
    HENRY_GRAPHQL_V2: 'https://henry-app.jp/graphql-v2',
    HENRY_PATIENT_URL: 'https://henry-app.jp/patients/',
    HOVER_DELAY: 0,
    CLOSE_DELAY: 300,
    PREVIEW_COUNT: 3
  };

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

    async function waitForHenryCore(timeout = 5000) {
      let waited = 0;
      while (!unsafeWindow.HenryCore) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
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
      const maxWait = 5000;
      const interval = 100;
      let waited = 0;

      while (waited < maxWait) {
        const btn = document.querySelector('#outpatientCf4 button');
        if (btn) {
          btn.click();
          log.info('外来ボタンをクリック');
          const cleanUrl = location.href.replace(/[?&]tab=outpatient/, '');
          history.replaceState(null, '', cleanUrl);
          return;
        }
        await new Promise(r => setTimeout(r, interval));
        waited += interval;
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

      try {
        const patientData = await getPatientFromAPI();

        const patientId = patientData.id;
        if (!patientId) {
          alert('患者ID（患者番号）が取得できませんでした');
          return;
        }

        GM_setValue('pendingPatient', { id: patientId, name: patientData.name || '' });

        const width = window.screen.availWidth;
        const height = window.screen.availHeight;
        window.open(
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
          icon: '📅',
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
    popupObserver.observe(document.body, { childList: true, subtree: true });

    // 10秒後に監視を停止（無駄なリソース消費を防ぐ）
    setTimeout(() => popupObserver.disconnect(), 10000);

    // --------------------------------------------
    // カルテ情報キャッシュ（タブを閉じるまで保持）
    // --------------------------------------------
    const karteCache = new Map();

    // --------------------------------------------
    // トークンリクエスト（Henry側に依頼して最新トークンを取得）
    // --------------------------------------------
    function requestToken(timeout = 3000) {
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
        zIndex: '99998',
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

    const pendingPatient = !isLoginPage ? GM_getValue('pendingPatient', null) : null;
    const imagingOrderContext = !isLoginPage ? GM_getValue('imagingOrderContext', null) : null;

    // 照射オーダーモードが有効かどうか（排他制御）
    const isImagingOrderMode = imagingOrderContext && imagingOrderContext.patientId;

    // --------------------------------------------
    // 照射オーダーモード（Henry照射オーダーからの予約）
    // --------------------------------------------
    if (isImagingOrderMode) {
      log.info('照射オーダーモード起動:', imagingOrderContext);

      // 照射オーダー用のバナー表示
      showImagingOrderBanner(imagingOrderContext);

      // カレンダーの日付を変更
      navigateToDate(imagingOrderContext.date);

      // ダイアログ監視（患者ID自動入力 & 予約登録ボタン監視）
      const imagingDialogObserver = new MutationObserver(() => {
        tryFillDialogForImaging(imagingOrderContext);
        setupReservationButtonListener(imagingOrderContext);
      });
      imagingDialogObserver.observe(document.body, { childList: true, subtree: true });
      tryFillDialogForImaging(imagingOrderContext);
      setupReservationButtonListener(imagingOrderContext);
    }

    // カレンダーの日付を変更する
    function navigateToDate(dateStr) {
      // dateStr format: "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);

      // 方法1: URL パラメータで日付を指定してリロード
      const currentUrl = new URL(location.href);
      const currentDate = currentUrl.searchParams.get('date');

      if (currentDate !== dateStr) {
        // まだ目的の日付でない場合はリダイレクト
        currentUrl.searchParams.set('date', dateStr);
        log.info('カレンダー日付を変更:', dateStr);
        location.href = currentUrl.toString();
        return;
      }

      // 方法2: 日付入力フィールドを探して変更を試みる
      setTimeout(() => {
        // カレンダーの日付入力欄を探す
        const dateInput = document.querySelector('input[name="date"]') ||
                          document.querySelector('input.calendar-date') ||
                          document.querySelector('#calendar_date');
        if (dateInput) {
          dateInput.value = dateStr;
          dateInput.dispatchEvent(new Event('change', { bubbles: true }));
          log.info('日付入力欄を更新:', dateStr);
        }
      }, 500);
    }

    function showImagingOrderBanner(context) {
      if (document.getElementById('henry-imaging-banner')) return;

      const banner = document.createElement('div');
      banner.id = 'henry-imaging-banner';
      banner.innerHTML = `
        <span style="margin-right: 12px;">📡</span>
        <span><strong>照射オーダー予約モード</strong></span>
        <span style="margin: 0 12px;">|</span>
        <span><strong>${context.patientId}</strong> ${context.patientName || ''}</span>
        <span style="margin: 0 12px;">|</span>
        <span>予約日: <strong>${context.date}</strong></span>
        <button id="henry-imaging-cancel" style="margin-left: auto; padding: 4px 12px; background: #e53935; color: white; border: none; border-radius: 4px; cursor: pointer;">キャンセル</button>
      `;
      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        backgroundColor: '#E3F2FD',
        color: '#1565C0',
        padding: '10px 20px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      });

      document.body.appendChild(banner);

      const bannerHeight = banner.offsetHeight;
      document.body.style.paddingTop = bannerHeight + 'px';

      // キャンセルボタン
      document.getElementById('henry-imaging-cancel').addEventListener('click', () => {
        if (confirm('照射オーダーの予約をキャンセルしますか？')) {
          GM_setValue('reservationResult', { cancelled: true, timestamp: Date.now() });
          GM_setValue('imagingOrderContext', null);
          banner.remove();
          document.body.style.paddingTop = '0';
          log.info('照射オーダーモードをキャンセル');
        }
      });
    }

    function tryFillDialogForImaging(context) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // 日付入力
      const dateInput = document.getElementById('reserve_date');
      if (dateInput && dateInput.value !== context.date) {
        dateInput.value = context.date;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        log.info('日付を自動入力:', context.date);
      }

      // 患者ID入力
      const input = document.getElementById('multi_record_no[0]');
      if (!input) return;
      if (input.value.trim() !== '') return;

      input.value = context.patientId;
      input.focus();
      try { input.setSelectionRange(context.patientId.length, context.patientId.length); } catch (e) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      log.info('患者ID自動入力完了（照射オーダーモード）');

      const searchBtn = document.querySelector('#div_multi_record_no_input_0 > input.input_board_search_customer');
      if (searchBtn) {
        searchBtn.click();
        log.info('検索ボタン自動クリック');
      }
    }

    let reservationButtonListenerAdded = false;

    function setupReservationButtonListener(context) {
      if (reservationButtonListenerAdded) return;

      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // 「予約登録」ボタンを探す
      const reserveBtn = dialog.closest('.ui-dialog')?.querySelector('.ui-dialog-buttonpane button:first-child');
      if (!reserveBtn) return;

      reservationButtonListenerAdded = true;
      log.info('予約登録ボタンを検出');

      // 患者ID検証用のフラグ
      let patientIdVerified = false;
      let capturedDate = context.date;
      let capturedTime = '09:00';

      // キャプチャフェーズで患者IDを検証（不一致の場合は予約を阻止）
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

        // クリック時に日付と時間を取得
        const dateInput = document.getElementById('reserve_date');
        const timeInput = document.getElementById('reserve_time');
        capturedDate = dateInput?.value || context.date;
        capturedTime = timeInput?.value || '09:00';
        patientIdVerified = true;

        log.info('予約登録ボタンがクリックされました。患者ID確認OK、日付:', capturedDate, '時間:', capturedTime);
      }, { capture: true });

      // バブリングフェーズでダイアログ閉じを監視
      reserveBtn.addEventListener('click', () => {
        if (!patientIdVerified) return;

        // ダイアログが閉じるのを監視
        const checkDialogClosed = setInterval(() => {
          const dialogElement = document.querySelector('#dialog_reserve_input');
          if (!dialogElement || dialogElement.closest('.ui-dialog')?.style.display === 'none') {
            clearInterval(checkDialogClosed);
            log.info('予約登録完了を検出。予約日時を送信:', capturedDate, capturedTime);

            // 予約結果をHenryに送信（日付と時間）
            GM_setValue('reservationResult', { date: capturedDate, time: capturedTime, timestamp: Date.now() });
            GM_setValue('imagingOrderContext', null);

            // バナーを削除
            const banner = document.getElementById('henry-imaging-banner');
            if (banner) {
              banner.remove();
              document.body.style.paddingTop = '0';
            }
          }
        }, 100);

        // 10秒でタイムアウト
        setTimeout(() => clearInterval(checkDialogClosed), 10000);
      });
    }

    // 照射オーダーモードでない場合のみ、通常の再診予約モードを実行
    if (!isImagingOrderMode && pendingPatient && pendingPatient.id) {
      // 使用後にクリア（ログイン後の再読み込みでも重複しない）
      GM_setValue('pendingPatient', null);
      log.info('Henryから遷移 - カルテID:', pendingPatient.id, '患者名:', pendingPatient.name);

      // 患者バナー表示
      showPatientBanner(pendingPatient.id, pendingPatient.name);

      // ダイアログ自動入力の監視
      const dialogObserver = new MutationObserver(() => {
        tryFillDialog(pendingPatient.id);
      });
      dialogObserver.observe(document.body, { childList: true, subtree: true });
      tryFillDialog(pendingPatient.id);

    } else {
      log.info('pendingPatientなし - Henry連携スキップ');
    }

    function showPatientBanner(patientId, patientName) {
      if (document.getElementById('henry-patient-banner')) return;

      const banner = document.createElement('div');
      banner.id = 'henry-patient-banner';
      banner.innerHTML = `
        <span style="margin-right: 12px;">📋</span>
        <span><strong>${patientId}</strong></span>
        <span style="margin: 0 8px;">|</span>
        <span><strong>${patientName || '患者名不明'}</strong></span>
      `;
      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        backgroundColor: '#E8F5F0',
        color: '#17181B',
        padding: '10px 20px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      });

      document.body.appendChild(banner);

      const bannerHeight = banner.offsetHeight;
      document.body.style.paddingTop = bannerHeight + 'px';

      // ダイアログ位置調整
      function adjustDialogPosition() {
        const dialog = document.querySelector('#dialog_reserve_input')?.closest('.ui-dialog');
        if (!dialog) return;

        const currentTop = parseInt(dialog.style.top) || 0;
        if (currentTop < bannerHeight) {
          dialog.style.top = bannerHeight + 'px';
        }

        const dialogTop = parseInt(dialog.style.top) || bannerHeight;
        const maxHeight = window.innerHeight - dialogTop - 10;
        const currentHeight = dialog.offsetHeight;

        if (currentHeight > maxHeight) {
          dialog.style.height = maxHeight + 'px';

          const content = dialog.querySelector('.ui-dialog-content');
          if (content) {
            const titleBar = dialog.querySelector('.ui-dialog-titlebar');
            const buttonPane = dialog.querySelector('.ui-dialog-buttonpane');
            const titleHeight = titleBar ? titleBar.offsetHeight : 0;
            const buttonHeight = buttonPane ? buttonPane.offsetHeight : 0;
            const contentMaxHeight = maxHeight - titleHeight - buttonHeight - 20;

            content.style.maxHeight = contentMaxHeight + 'px';
            content.style.overflowY = 'auto';
          }
        }
      }

      const positionObserver = new MutationObserver(adjustDialogPosition);
      positionObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
      window.addEventListener('resize', adjustDialogPosition);
      adjustDialogPosition();
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
    tooltipObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

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
        }, 300);
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
      }, 150);
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
      }, 300);
    });

  }
})();
