// ==UserScript==
// @name         予約システム：Henryへ連携
// @namespace    henry-scripts
// @version      1.7.0
// @description  予約システムから Henry の患者ページを開く + 外来記録プレビュー (キャッシュ＆動的ハッシュ対応)
// @match        https://henry-app.jp/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      henry-app.jp
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'ReserveToHenry';
  const CONFIG = {
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825',
    HENRY_GRAPHQL: 'https://henry-app.jp/graphql',
    HENRY_GRAPHQL_V2: 'https://henry-app.jp/graphql-v2',
    HENRY_PATIENT_URL: 'https://henry-app.jp/patients/',
    // フォールバック用の初期ハッシュ（もし自動取得できていない場合に使用）
    DEFAULT_LIST_PATIENTS_HASH: '0163f0b5782e052cc317a193b1deac2c4d93d4017579774d90cc194fd7f42a08',
    HOVER_DELAY: 0,   // ホバー表示までの遅延(ms)
    CLOSE_DELAY: 300,   // クローズまでの遅延(ms)
    PREVIEW_COUNT: 3    // 表示する外来記録の件数
  };

  const log = {
    info: (msg) => console.log(`[${SCRIPT_NAME}] ${msg}`),
    warn: (msg) => console.warn(`[${SCRIPT_NAME}] ${msg}`),
    error: (msg) => console.error(`[${SCRIPT_NAME}] ${msg}`)
  };

  const isHenry = location.hostname === 'henry-app.jp';
  const isReserve = location.hostname === 'manage-maokahp.reserve.ne.jp';

  // ==========================================
  // Henry 側：トークン収集 + ハッシュ収集 + 外来タブ切り替え
  // ==========================================
  if (isHenry) {
    log.info('Henry モード - トークン・ハッシュ収集開始');
    let lastSavedToken = null;
    const originalFetch = unsafeWindow.fetch;

    unsafeWindow.fetch = function(url, options) {
      if (typeof url === 'string' && (url.includes('/graphql-v2') || url.includes('/graphql'))) {
        const authHeader = options?.headers?.Authorization || options?.headers?.authorization;

        // 1. トークンの保存
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);
          if (token !== lastSavedToken) {
            lastSavedToken = token;
            GM_setValue('henry-token', token);
            log.info('トークン保存完了');
          }
        }

        // 2. ハッシュの保存 (EncountersInPatient と ListPatientsV2)
        if (options?.body) {
          try {
            const body = JSON.parse(options.body);
            const hash = body.extensions?.persistedQuery?.sha256Hash;

            if (hash) {
              if (body.operationName === 'EncountersInPatient') {
                const currentHash = GM_getValue('henry-encounters-hash', null);
                if (currentHash !== hash) {
                  GM_setValue('henry-encounters-hash', hash);
                  log.info('EncountersInPatient ハッシュ更新完了');
                }
              } else if (body.operationName === 'ListPatientsV2') {
                const currentHash = GM_getValue('henry-list-patients-hash', null);
                if (currentHash !== hash) {
                  GM_setValue('henry-list-patients-hash', hash);
                  log.info('ListPatientsV2 ハッシュ更新完了');
                }
              }
            }
          } catch (_) {}
        }
      }
      return originalFetch.apply(this, arguments);
    };

    if (location.search.includes('tab=outpatient')) {
      log.info('外来タブへ切り替え');
      waitAndClickOutpatient();
    }
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

  // ==========================================
  // 予約システム側：ホバー + クリック
  // ==========================================
  if (isReserve) {
    log.info('予約システムモード - スクリプト起動');

    // UUIDキャッシュの管理
    // 保存形式: { "12345": "uuid-xxxx", "67890": "uuid-yyyy" }
    function getUuidFromCache(patientNumber) {
        const cache = GM_getValue('henry-patient-cache', {});
        return cache[patientNumber] || null;
    }

    function saveUuidToCache(patientNumber, uuid) {
        const cache = GM_getValue('henry-patient-cache', {});
        cache[patientNumber] = uuid;
        GM_setValue('henry-patient-cache', cache);
    }

    let previewWindow = null;
    let currentTarget = null;
    let hoverTimeout = null;
    let closeTimeout = null;
    let isOverPreview = false;
    let isOverTarget = false;

    // プレビューウィンドウ作成
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

    // 外来記録を取得して表示
    async function fetchAndShowEncounter(target, patientUuid) {
      showPreview(target, '<div style="color:#666;">読み込み中...</div>');

      const token = GM_getValue('henry-token', null);
      const hash = GM_getValue('henry-encounters-hash', null);

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
        }, CONFIG.HENRY_GRAPHQL_V2);

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

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 患者 UUID を取得 (キャッシュ対応)
    async function getPatientUuid(patientNumber) {
      // 1. キャッシュを確認
      const cachedUuid = getUuidFromCache(patientNumber);
      if (cachedUuid) {
        log.info(`キャッシュヒット: ${patientNumber} -> ${cachedUuid}`);
        return cachedUuid;
      }

      // 2. APIで取得
      const token = GM_getValue('henry-token', null);
      if (!token) return null;

      // 動的ハッシュを優先、なければデフォルトを使用
      const hash = GM_getValue('henry-list-patients-hash', CONFIG.DEFAULT_LIST_PATIENTS_HASH);

      try {
        const result = await callHenryAPI(token, hash, 'ListPatientsV2', {
          input: {
            generalFilter: { query: patientNumber, patientCareType: 'PATIENT_CARE_TYPE_ANY' },
            hospitalizationFilter: { doctorUuid: null, roomUuids: [], wardUuids: [], states: [], onlyLatest: true },
            sorts: [],
            pageSize: 1,
            pageToken: ''
          }
        }, CONFIG.HENRY_GRAPHQL);

        const entries = result.data?.listPatientsV2?.entries ?? [];
        const uuid = entries[0]?.patient?.uuid || null;

        if (uuid) {
            // 3. 結果をキャッシュに保存
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

      e.preventDefault();
      e.stopPropagation();

      const patientNumber = target.textContent.trim();
      if (!patientNumber) return;

      const uuid = await getPatientUuid(patientNumber); // ここもキャッシュが効く
      if (!uuid) {
          alert(`患者番号 ${patientNumber} が見つかりません`);
          return;
      }

      const url = CONFIG.HENRY_PATIENT_URL + uuid + '?tab=outpatient';
      GM_openInTab(url, { active: true });
    }, true);
  }

  // ==========================================
  // API呼び出し共通関数
  // ==========================================
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
})();
