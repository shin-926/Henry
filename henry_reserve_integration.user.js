// ==UserScript==
// @name         Henry ⇔ 予約システム統合連携
// @namespace    https://github.com/shin-926/Tampermonkey
// @version      1.3.0
// @description  Henryカルテと予約システム間の双方向連携（再診予約・患者プレビュー・ページ遷移）
// @match        https://henry-app.jp/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
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

  function callHenryAPI(token, hash, operationName, variables, endpoint) {
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
          extensions: { persistedQuery: { version: 1, sha256Hash: hash } }
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
    // トークン・ハッシュをGM_storageに同期（Reserve側で使用）
    // --------------------------------------------
    async function syncToGMStorage() {
      try {
        const HenryCore = await waitForHenryCore();
        if (!HenryCore) {
          log.warn('HenryCoreが見つかりません');
          return;
        }

        // トークン同期
        const token = await HenryCore.getToken();
        if (token) {
          GM_setValue('henry-token', token);
        }

        // ハッシュ同期
        const hashes = await HenryCore.getHashes();
        if (hashes.EncountersInPatient) {
          GM_setValue('henry-encounters-hash', hashes.EncountersInPatient.hash);
          GM_setValue('henry-encounters-endpoint', hashes.EncountersInPatient.endpoint);
        }
        if (hashes.ListPatientsV2) {
          GM_setValue('henry-list-patients-hash', hashes.ListPatientsV2.hash);
          GM_setValue('henry-list-patients-endpoint', hashes.ListPatientsV2.endpoint);
        }

        log.info('トークン・ハッシュをGM_storageに同期完了');
      } catch (e) {
        log.warn('GM_storage同期失敗: ' + e.message);
      }
    }

    // 初回同期 + ナビゲーション時に再同期
    syncToGMStorage();
    window.addEventListener('henry:navigation', syncToGMStorage);

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

      const result = await HenryCore.call('GetPatient', {
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

        GM_setValue('currentPatientId', patientId);
        GM_setValue('currentPatientName', patientData.name || '');
        GM_setValue('openedFromHenry', Date.now());
        log.info('保存した患者番号:', patientId, '患者名:', patientData.name);

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
    // セットアップ状態チェック
    // --------------------------------------------
    function checkSetupStatus() {
      const token = GM_getValue('henry-token', null);
      const listPatientsHash = GM_getValue('henry-list-patients-hash', null);
      const encountersHash = GM_getValue('henry-encounters-hash', null);

      if (!token) {
        return {
          ok: false,
          message: '【初回セットアップが必要です】\n\n' +
            'Henryにログインしてください。\n\n' +
            '【手順】\n' +
            '1. Henry（https://henry-app.jp）を開く\n' +
            '2. ログインする\n' +
            '3. この画面に戻って再度お試しください'
        };
      }

      if (!listPatientsHash) {
        return {
          ok: false,
          message: '【初回セットアップが必要です】\n\n' +
            'Henryで患者一覧を表示してください。\n\n' +
            '【手順】\n' +
            '1. Henry（https://henry-app.jp）を開く\n' +
            '2. 画面左上の「患者」メニューから患者一覧を表示する\n' +
            '3. この画面に戻って再度お試しください'
        };
      }

      if (!encountersHash) {
        return {
          ok: false,
          needEncountersHash: true,
          message: '【初回セットアップが必要です】\n\n' +
            'Henryで患者の外来記録を表示してください。\n\n' +
            '【手順】\n' +
            '1. Henry（https://henry-app.jp）を開く\n' +
            '2. 任意の患者ページを開き、外来記録タブを表示する\n' +
            '3. この画面に戻って再度お試しください'
        };
      }

      return { ok: true };
    }

    // --------------------------------------------
    // UUIDキャッシュ管理
    // --------------------------------------------
    function getUuidFromCache(patientNumber) {
      const cache = GM_getValue('henry-patient-cache', {});
      return cache[patientNumber] || null;
    }

    function saveUuidToCache(patientNumber, uuid) {
      const cache = GM_getValue('henry-patient-cache', {});
      cache[patientNumber] = uuid;
      GM_setValue('henry-patient-cache', cache);
    }

    // --------------------------------------------
    // Henry→Reserve連携：バナー表示・自動入力
    // --------------------------------------------
    const currentPatientId = GM_getValue('currentPatientId', '');
    const currentPatientName = GM_getValue('currentPatientName', '');
    const openedAt = GM_getValue('openedFromHenry', 0);
    const isFromHenry = (Date.now() - openedAt) < 5000;

    if (isFromHenry && currentPatientId) {
      GM_setValue('openedFromHenry', 0);
      log.info('Henryから遷移 - カルテID:', currentPatientId, '患者名:', currentPatientName);

      // 患者バナー表示
      showPatientBanner(currentPatientId, currentPatientName);

      // ダイアログ自動入力の監視
      const dialogObserver = new MutationObserver(() => {
        tryFillDialog(currentPatientId);
      });
      dialogObserver.observe(document.body, { childList: true, subtree: true });
      tryFillDialog(currentPatientId);

    } else if (!isFromHenry) {
      log.info('ブックマーク等から開かれたためHenry連携スキップ');
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
    // Reserve→Henry連携：ホバープレビュー・クリック遷移
    // --------------------------------------------
    let previewWindow = null;
    let currentTarget = null;
    let hoverTimeout = null;
    let closeTimeout = null;
    let isOverPreview = false;
    let isOverTarget = false;

    function createPreviewWindow() {
      const div = document.createElement('div');
      div.id = 'henry-preview-window';
      div.style.cssText = `
        position: fixed;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 16px;
        z-index: 100001;
        max-width: 600px;
        max-height: 800px;
        overflow-y: auto;
        font-family: 'Noto Sans JP', sans-serif;
        font-size: 13px;
        display: none;
      `;

      div.addEventListener('mouseenter', () => {
        isOverPreview = true;
        cancelClose();
      });
      div.addEventListener('mouseleave', () => {
        isOverPreview = false;
        scheduleClose();
      });
      document.body.appendChild(div);
      return div;
    }

    function scheduleClose() {
      cancelClose();
      closeTimeout = setTimeout(() => {
        if (!isOverPreview && !isOverTarget) {
          hidePreview();
        }
      }, CONFIG.CLOSE_DELAY);
    }

    function cancelClose() {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
    }

    function showPreview(target, content) {
      if (!previewWindow) {
        previewWindow = createPreviewWindow();
      }

      previewWindow.innerHTML = content;
      previewWindow.onmouseenter = () => { isOverPreview = true; cancelClose(); };
      previewWindow.onmouseleave = () => { isOverPreview = false; scheduleClose(); };

      const rect = target.getBoundingClientRect();
      previewWindow.style.left = (rect.right + 10) + 'px';
      previewWindow.style.top = rect.top + 'px';
      previewWindow.style.display = 'block';

      const pwRect = previewWindow.getBoundingClientRect();
      if (pwRect.right > window.innerWidth) {
        previewWindow.style.left = (rect.left - pwRect.width - 10) + 'px';
      }
      if (pwRect.bottom > window.innerHeight) {
        previewWindow.style.top = (window.innerHeight - pwRect.height - 10) + 'px';
      }
    }

    function hidePreview() {
      if (previewWindow) {
        previewWindow.style.display = 'none';
      }
      currentTarget = null;
      isOverPreview = false;
      isOverTarget = false;
    }

    function parseEditorData(editorDataStr) {
      try {
        const data = JSON.parse(editorDataStr);
        return data.blocks.map(b => b.text).filter(t => t).join('\n');
      } catch (e) {
        return '(診療録を解析できませんでした)';
      }
    }

    async function fetchAndShowEncounter(target, patientUuid) {
      showPreview(target, '<div style="color:#666;">読み込み中...</div>');

      const token = GM_getValue('henry-token', null);
      const hash = GM_getValue('henry-encounters-hash', null);
      const endpoint = GM_getValue('henry-encounters-endpoint', '/graphql-v2');

      if (!token) {
        showPreview(target, '<div style="color:#c00;">トークンがありません。<br>Henryにログインしてください。</div>');
        return;
      }
      if (!hash) {
        showPreview(target, '<div style="color:#c00;">ハッシュ未取得。<br>Henryで外来記録を一度開いてください。</div>');
        return;
      }

      try {
        const result = await callHenryAPI(token, hash, 'EncountersInPatient', {
          patientId: patientUuid,
          startDate: null,
          endDate: null,
          pageSize: CONFIG.PREVIEW_COUNT,
          pageToken: null
        }, 'https://henry-app.jp' + endpoint);

        const encounters = result.data?.encountersInPatient?.encounters ?? [];
        if (encounters.length === 0) {
          showPreview(target, '<div style="color:#666;">外来記録がありません</div>');
          return;
        }

        const htmlParts = encounters.map((encounter, index) => {
          const session = encounter.basedOn?.[0];
          const progressNote = encounter.records?.find(r => r.__typename === 'ProgressNote');

          const visitDate = session?.scheduleTime ? new Date(session.scheduleTime).toLocaleDateString('ja-JP') : '不明';
          const doctorName = session?.doctor?.name || '不明';
          const noteText = progressNote?.editorData ? parseEditorData(progressNote.editorData) : '(診療録なし)';
          const borderStyle = index < encounters.length - 1 ? 'border-bottom: 2px solid #ccc; margin-bottom: 16px; padding-bottom: 16px;' : '';

          return `
            <div style="${borderStyle}">
              <div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #eee;">
                <div style="font-weight:bold; color:#333;">受診日: ${visitDate}</div>
                <div style="color:#666;">担当医: ${doctorName}</div>
              </div>
              <div style="white-space:pre-wrap; color:#333; line-height:1.5;">${escapeHtml(noteText)}</div>
            </div>
          `;
        });

        showPreview(target, htmlParts.join(''));

      } catch (e) {
        log.error(e.message);
        showPreview(target, `<div style="color:#c00;">エラー: ${escapeHtml(e.message)}</div>`);
      }
    }

    async function getPatientUuid(patientNumber) {
      // キャッシュを確認
      const cachedUuid = getUuidFromCache(patientNumber);
      if (cachedUuid) {
        log.info(`キャッシュヒット: ${patientNumber} -> ${cachedUuid}`);
        return cachedUuid;
      }

      // APIで取得
      const token = GM_getValue('henry-token', null);
      if (!token) return null;

      const hash = GM_getValue('henry-list-patients-hash', null);
      const endpoint = GM_getValue('henry-list-patients-endpoint', '/graphql');

      if (!hash) {
        log.warn('ListPatientsV2 ハッシュ未取得');
        return null;
      }

      try {
        const result = await callHenryAPI(token, hash, 'ListPatientsV2', {
          input: {
            generalFilter: { query: patientNumber, patientCareType: 'PATIENT_CARE_TYPE_ANY' },
            hospitalizationFilter: { doctorUuid: null, roomUuids: [], wardUuids: [], states: [], onlyLatest: true },
            sorts: [],
            pageSize: 1,
            pageToken: ''
          }
        }, 'https://henry-app.jp' + endpoint);

        const entries = result.data?.listPatientsV2?.entries ?? [];
        const uuid = entries[0]?.patient?.uuid || null;

        if (uuid) {
          saveUuidToCache(patientNumber, uuid);
          log.info(`新規取得・キャッシュ保存: ${patientNumber} -> ${uuid}`);
        }
        return uuid;

      } catch (e) {
        log.error('患者UUID取得エラー: ' + e.message);
        return null;
      }
    }

    // ホバーイベント
    document.addEventListener('mouseover', async (e) => {
      const target = e.target.closest('span.num[id="reserve_tooltip_cus_record_no"]');
      if (!target) return;

      if (target === currentTarget) {
        isOverTarget = true;
        cancelClose();
        return;
      }

      currentTarget = target;
      isOverTarget = true;
      cancelClose();

      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(async () => {
        const patientNumber = target.textContent.trim();
        if (!patientNumber) return;

        // セットアップ状態チェック
        const setup = checkSetupStatus();
        if (!setup.ok) {
          const shortMsg = setup.needEncountersHash
            ? '外来記録プレビューを使用するには初回セットアップが必要です。<br>患者番号をクリックすると詳細が表示されます。'
            : '初回セットアップが必要です。<br>患者番号をクリックすると詳細が表示されます。';
          showPreview(target, `<div style="color:#c00;">${shortMsg}</div>`);
          return;
        }

        const uuid = await getPatientUuid(patientNumber);
        if (!uuid) {
          showPreview(target, '<div style="color:#c00;">患者が見つかりません</div>');
          return;
        }
        await fetchAndShowEncounter(target, uuid);
      }, CONFIG.HOVER_DELAY);
    });

    // マウスアウトイベント
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('span.num[id="reserve_tooltip_cus_record_no"]');
      if (!target) return;
      isOverTarget = false;
      clearTimeout(hoverTimeout);
      scheduleClose();
    });

    // クリックイベント
    document.addEventListener('click', async (e) => {
      const target = e.target.closest('span.num[id="reserve_tooltip_cus_record_no"]');
      if (!target) return;

      log.info('クリックイベント発火');

      e.preventDefault();
      e.stopPropagation();

      const patientNumber = target.textContent.trim();
      if (!patientNumber) return;

      // セットアップ状態チェック（患者ページ遷移にはencountersHashは不要）
      const token = GM_getValue('henry-token', null);
      const listPatientsHash = GM_getValue('henry-list-patients-hash', null);

      if (!token) {
        alert(
          '【初回セットアップが必要です】\n\n' +
          'Henryにログインしてください。\n\n' +
          '【手順】\n' +
          '1. Henry（https://henry-app.jp）を開く\n' +
          '2. ログインする\n' +
          '3. この画面に戻って再度お試しください'
        );
        return;
      }

      if (!listPatientsHash) {
        alert(
          '【初回セットアップが必要です】\n\n' +
          'Henryで患者一覧を表示してください。\n\n' +
          '【手順】\n' +
          '1. Henry（https://henry-app.jp）を開く\n' +
          '2. 画面左上の「患者」メニューから患者一覧を表示する\n' +
          '3. この画面に戻って再度お試しください'
        );
        return;
      }

      const uuid = await getPatientUuid(patientNumber);
      if (!uuid) {
        alert(`患者番号 ${patientNumber} が見つかりません`);
        return;
      }

      const url = CONFIG.HENRY_PATIENT_URL + uuid + '?tab=outpatient';
      log.info('Henryページを開きます: ' + url);
      window.open(url, '_blank');
    }, true);
  }
})();
