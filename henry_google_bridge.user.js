// ==UserScript==
// @name         Henry ⇔ Google 連携ブリッジ
// @namespace    https://henry-app.jp/
// @version      2.8.2
// @description  HenryのファイルをGoogle形式で開き、編集後にHenryへ書き戻すための統合スクリプト。これ1つで両方のサイトで動作。
// @match        https://henry-app.jp/*
// @match        https://docs.google.com/document/d/*
// @match        https://docs.google.com/spreadsheets/d/*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// @connect      henry-app.jp
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @connect      storage.googleapis.com
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_bridge.user.js
// ==/UserScript==

(function() {
  'use strict';

  // ==========================================
  // 共通設定
  // ==========================================
  const CONFIG = {
    GAS_URL: 'https://script.google.com/a/macros/maokahp.net/s/AKfycbw677b3kgD1T3MInBdP6SvtNQo7hRZGsq1U_lKpYYZW8-0XBesQQjTQdzwXvIY4CkkO/exec',
    SECRET_KEY: 'maoka-henry-gas-8888',
    HENRYCORE_TIMEOUT: 5000,
    REQUEST_TIMEOUT: 3000,
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825',
    REQUIRED_OPERATIONS: ['GetFileUploadUrl', 'CreatePatientFile', 'DeletePatientFile']
  };

  const isHenry = location.host === 'henry-app.jp';

  // ==========================================
  // デバッグ用ヘルパー
  // ==========================================
  function debugLog(context, ...args) {
    console.log(`[HenryBridge:${context}]`, ...args);
  }

  function debugError(context, ...args) {
    console.error(`[HenryBridge:${context}]`, ...args);
  }

  function decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (e) {
      return null;
    }
  }

  function checkTokenExpiry(token) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return { valid: true, message: 'JWT形式ではないか、expなし' };
    }
    const expDate = new Date(payload.exp * 1000);
    const now = Date.now();
    const isExpired = now > payload.exp * 1000;
    const remainingMs = payload.exp * 1000 - now;
    const remainingMin = Math.floor(remainingMs / 60000);

    return {
      valid: !isExpired,
      expDate: expDate.toLocaleString(),
      isExpired,
      remainingMin,
      message: isExpired
        ? `期限切れ (${expDate.toLocaleString()})`
        : `有効 (残り${remainingMin}分, ${expDate.toLocaleString()}まで)`
    };
  }

  // ==========================================
  // メイン分岐
  // ==========================================
  debugLog('Init', `起動: ${isHenry ? 'Henry' : 'Google Docs'}モード`);

  if (isHenry) {
    runHenryMode();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runGoogleDocsMode);
    } else {
      runGoogleDocsMode();
    }
  }

  // ==========================================
  // [Mode A] Henry側ロジック
  // ==========================================
  function runHenryMode() {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    let cachedFiles = [];
    let currentFolderUuid = null;
    let log = null;
    const inflight = new Map();
    let activeIndicators = [];
    let lastRefreshCheck = Date.now();
    const CONVERTIBLE_TYPES = new Set(['FILE_TYPE_DOCX', 'FILE_TYPE_XLSX']);

    // トークンリクエストに応答
    function setupTokenRequestListener() {
      GM_addValueChangeListener('token_request', async (name, oldVal, newVal, remote) => {
        if (!remote || !newVal?.requestId) return;

        debugLog('Henry', 'トークンリクエスト受信:', newVal.requestId);

        if (!pageWindow.HenryCore) {
          debugLog('Henry', 'HenryCore未初期化、リクエスト無視');
          return;
        }

        const token = await pageWindow.HenryCore.getToken();
        if (token) {
          GM_setValue('henry_auth_token', {
            token,
            requestId: newVal.requestId,
            savedAt: Date.now()
          });
          debugLog('Henry', 'トークン応答完了');
        }
      });
      debugLog('Henry', 'トークンリクエスト監視開始');
    }

    // ハッシュリクエストに応答
    function setupHashRequestListener() {
      GM_addValueChangeListener('hash_request', async (name, oldVal, newVal, remote) => {
        if (!remote || !newVal?.requestId) return;

        debugLog('Henry', 'ハッシュリクエスト受信:', newVal.requestId);

        if (!pageWindow.HenryCore) {
          debugLog('Henry', 'HenryCore未初期化、リクエスト無視');
          return;
        }

        const allHashes = await pageWindow.HenryCore.getHashes();
        const requiredHashes = {};

        CONFIG.REQUIRED_OPERATIONS.forEach(opName => {
          if (allHashes[opName]) {
            requiredHashes[opName] = allHashes[opName];
          }
        });

        GM_setValue('henry_api_hashes', {
          hashes: requiredHashes,
          requestId: newVal.requestId,
          savedAt: Date.now()
        });
        debugLog('Henry', 'ハッシュ応答完了:', Object.keys(requiredHashes).length, '件');
      });
      debugLog('Henry', 'ハッシュリクエスト監視開始');
    }

    function recalculateIndicatorPositions() {
      const baseBottom = 24;
      const offset = 60;
      activeIndicators.forEach((el, index) => {
        el.style.bottom = `${baseBottom + (index * offset)}px`;
      });
    }

    function showProcessingIndicator(message, type = 'info') {
      const container = document.createElement('div');
      container.className = 'henry-proc-indicator';

      const bgColor = {
        info: 'rgba(33, 33, 33, 0.95)',
        error: 'rgba(211, 47, 47, 0.95)',
        success: 'rgba(46, 125, 50, 0.95)'
      }[type] || 'rgba(33, 33, 33, 0.95)';

      Object.assign(container.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        backgroundColor: bgColor, color: '#ffffff', padding: '12px 20px',
        borderRadius: '24px', zIndex: '99999', display: 'flex', alignItems: 'center',
        gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: '-apple-system, sans-serif', fontSize: '14px', fontWeight: '500',
        opacity: '0', transform: 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, bottom 0.3s ease',
        pointerEvents: type === 'error' ? 'auto' : 'none'
      });

      if (type === 'info') {
        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
          width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
          borderTop: '2px solid #ffffff', borderRadius: '50%', animation: 'henry-spin 1s linear infinite'
        });
        container.appendChild(spinner);
      } else if (type === 'error') {
        const icon = document.createElement('span');
        icon.textContent = '⚠️';
        container.appendChild(icon);
      } else if (type === 'success') {
        const icon = document.createElement('span');
        icon.textContent = '✅';
        container.appendChild(icon);
      }

      if (!document.getElementById('henry-spin-style')) {
        const style = document.createElement('style');
        style.id = 'henry-spin-style';
        style.textContent = `@keyframes henry-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
      }

      const text = document.createElement('span');
      text.textContent = message;
      container.appendChild(text);

      if (type === 'error') {
        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        Object.assign(okBtn.style, {
          marginLeft: '12px', padding: '4px 12px', border: 'none',
          borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.2)',
          color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
        });
        okBtn.onmouseover = () => okBtn.style.backgroundColor = 'rgba(255,255,255,0.3)';
        okBtn.onmouseout = () => okBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
        okBtn.onclick = () => hide();
        container.appendChild(okBtn);
      }

      document.body.appendChild(container);
      activeIndicators.push(container);
      recalculateIndicatorPositions();

      requestAnimationFrame(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      });

      const hide = () => {
        if (!container || !container.parentNode) return;
        activeIndicators = activeIndicators.filter(el => el !== container);
        recalculateIndicatorPositions();
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        setTimeout(() => { if (container.parentNode) container.remove(); }, 300);
      };

      if (type === 'success') {
        setTimeout(hide, 3000);
      }

      return hide;
    }

    function refreshPatientFiles() {
      if (!pageWindow.__APOLLO_CLIENT__) {
        debugLog('Henry', 'Apollo Client が見つかりません');
        return false;
      }

      try {
        pageWindow.__APOLLO_CLIENT__.refetchQueries({
          include: ['ListPatientFiles']
        });
        debugLog('Henry', 'ListPatientFiles をrefetchしました');
        return true;
      } catch (e) {
        debugError('Henry', 'refetch失敗:', e.message);
        return false;
      }
    }

    function setupRefreshListener() {
      GM_addValueChangeListener('henry_refresh_request', (name, oldVal, newVal, remote) => {
        if (!remote || !newVal) return;
        if (newVal.timestamp <= lastRefreshCheck) return;

        lastRefreshCheck = newVal.timestamp;
        debugLog('Henry', 'リフレッシュ要求を検知:', newVal);

        const success = refreshPatientFiles();
        if (success) {
          log?.info('Google Docsからの保存を検知、一覧を更新');
        }
      });
      debugLog('Henry', 'リフレッシュ監視開始');
    }

    function setupFetchIntercept() {
      if (pageWindow._henryFileConverterHooked) return;
      const originalFetch = pageWindow.fetch;
      pageWindow._henryFileConverterHooked = true;

      pageWindow.fetch = async function(url, options) {
        const response = await originalFetch.apply(this, arguments);

        // ListPatientFiles のレスポンスをキャッシュ（トークン/ハッシュ共有は削除）
        if (!url.includes('/graphql') || !options?.body) return response;
        try {
          const bodyStr = typeof options.body === 'string' ? options.body : null;
          if (!bodyStr) return response;
          let requestJson;
          try { requestJson = JSON.parse(bodyStr); } catch (e) { return response; }

          if (requestJson.operationName !== 'ListPatientFiles') return response;

          const requestFolderUuid = requestJson.variables?.input?.parentFileFolderUuid ?? null;
          const pageToken = requestJson.variables?.input?.pageToken ?? '';
          const clone = response.clone();
          const json = await clone.json();
          const patientFiles = json.data?.listPatientFiles?.patientFiles;

          if (!Array.isArray(patientFiles)) return response;

          if (requestFolderUuid !== currentFolderUuid || pageToken === '') {
            cachedFiles = patientFiles;
            currentFolderUuid = requestFolderUuid;
          } else {
            cachedFiles = [...cachedFiles, ...patientFiles];
          }
        } catch (e) { debugError('Henry', 'Fetch Hook Error:', e.message); }
        return response;
      };
    }

    function sendToGAS(fileUrl, token, fileName, patientId, fileUuid, folderUuid) {
      const payload = {
        secretKey: CONFIG.SECRET_KEY,
        fileUrl, token, fileName, patientId,
        fileUuid, folderUuid
      };

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.GAS_URL,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(payload),
          onload: (response) => {
            try {
              const result = JSON.parse(response.responseText);
              if (result.status === 'success') resolve(result);
              else reject(new Error(result.message || 'GAS処理失敗'));
            } catch (e) { reject(new Error('GASレスポンスのパース失敗')); }
          },
          onerror: () => reject(new Error('GAS通信エラー'))
        });
      });
    }

    async function handleDoubleClick(event) {
      if (event.target.closest('input, textarea, button, a')) {
        return;
      }

      const row = event.target.closest('li[role="button"][aria-roledescription="draggable"]');
      if (!row) return;

      const getFileFromCacheSync = (r) => {
        if (!cachedFiles.length) return null;
        const parent = r.parentElement;
        if (!parent) return null;
        const rows = Array.from(parent.querySelectorAll(':scope > li'));
        const idx = rows.indexOf(r);
        return (idx !== -1 && idx < cachedFiles.length) ? cachedFiles[idx] : null;
      };

      const fileData = getFileFromCacheSync(row);
      if (!fileData || !fileData.file) return;

      const file = fileData.file;
      const fileUrl = file.redirectUrl;
      if (!fileUrl || !fileUrl.includes('storage.googleapis.com')) return;

      if (!CONVERTIBLE_TYPES.has(file.fileType)) return;

      const patientFileUuid = fileData.uuid;
      const folderUuid = fileData.parentFileFolderUuid || currentFolderUuid;

      if (inflight.has(patientFileUuid)) return;

      if (!pageWindow.HenryCore) return;
      const patientUuid = pageWindow.HenryCore.getPatientUuid();
      if (!patientUuid) return;

      try {
        await pageWindow.HenryCore.utils.withLock(inflight, patientFileUuid, async () => {
          const token = await pageWindow.HenryCore.getToken();

          const hide = showProcessingIndicator(`書類を開いています... (${file.title || '文書'})`);
          try {
            const result = await sendToGAS(
              file.redirectUrl, token, file.title || 'untitled',
              patientUuid, patientFileUuid, folderUuid
            );
            if (result.openUrl) {
              log?.info('GAS変換成功:', result.name);
              GM_openInTab(result.openUrl, { active: true });
              showProcessingIndicator('ファイルを開きました', 'success');
            }
          } finally {
            hide();
          }
        });
      } catch (e) {
        log?.error('処理失敗', e.message);
        showProcessingIndicator(`エラー: ${e.message}`, 'error');
      }
    }

    async function init() {
      debugLog('Henry', '初期化開始...');

      // リクエスト監視を先に開始（HenryCore 待機前でも受け付けられるように準備）
      setupTokenRequestListener();
      setupHashRequestListener();
      setupRefreshListener();

      let waited = 0;
      while (!pageWindow.HenryCore) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
        if (waited > CONFIG.HENRYCORE_TIMEOUT) {
          debugError('Henry', 'HenryCore が見つかりません (タイムアウト)');
          return;
        }
      }
      debugLog('Henry', `HenryCore検出 (${waited}ms)`);

      log = pageWindow.HenryCore.utils.createLogger('HenryBridge');
      setupFetchIntercept();

      const cleaner = pageWindow.HenryCore.utils.createCleaner();
      pageWindow.HenryCore.utils.subscribeNavigation(cleaner, () => {
        cachedFiles = [];
        currentFolderUuid = null;
        activeIndicators.forEach(el => {
          if (el.parentNode) el.remove();
        });
        activeIndicators = [];
        const handler = (e) => handleDoubleClick(e);
        document.addEventListener('dblclick', handler, true);
        cleaner.add(() => document.removeEventListener('dblclick', handler, true));
        log.info('Ready (v2.8.2)');
      });
    }

    init();
  }

  // ==========================================
  // [Mode B] Google Docs側ロジック
  // ==========================================
  function runGoogleDocsMode() {
    debugLog('Docs', 'Google Docsモード開始');

    // オンデマンドでトークンを取得
    function requestFreshToken(timeout = CONFIG.REQUEST_TIMEOUT) {
      return new Promise((resolve) => {
        const requestId = Date.now() + Math.random();
        let resolved = false;

        debugLog('Docs', 'トークンリクエスト送信:', requestId);

        const listenerId = GM_addValueChangeListener('henry_auth_token', (name, oldVal, newVal, remote) => {
          if (resolved) return;
          if (remote && newVal?.requestId === requestId) {
            resolved = true;
            GM_removeValueChangeListener(listenerId);
            debugLog('Docs', 'トークン受信（新鮮）');
            resolve(newVal.token);
          }
        });

        // タイムアウト時はキャッシュを使用
        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          GM_removeValueChangeListener(listenerId);
          const cached = GM_getValue('henry_auth_token');
          debugLog('Docs', 'トークン取得タイムアウト、キャッシュ使用');
          resolve(cached?.token || null);
        }, timeout);

        GM_setValue('token_request', { requestId });
      });
    }

    // オンデマンドでハッシュを取得
    function requestFreshHashes(timeout = CONFIG.REQUEST_TIMEOUT) {
      return new Promise((resolve) => {
        const requestId = Date.now() + Math.random();
        let resolved = false;

        debugLog('Docs', 'ハッシュリクエスト送信:', requestId);

        const listenerId = GM_addValueChangeListener('henry_api_hashes', (name, oldVal, newVal, remote) => {
          if (resolved) return;
          if (remote && newVal?.requestId === requestId) {
            resolved = true;
            GM_removeValueChangeListener(listenerId);
            debugLog('Docs', 'ハッシュ受信（新鮮）:', Object.keys(newVal.hashes || {}).length, '件');
            resolve(newVal.hashes);
          }
        });

        // タイムアウト時はキャッシュを使用
        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          GM_removeValueChangeListener(listenerId);
          const cached = GM_getValue('henry_api_hashes');
          debugLog('Docs', 'ハッシュ取得タイムアウト、キャッシュ使用');
          resolve(cached?.hashes || null);
        }, timeout);

        GM_setValue('hash_request', { requestId });
      });
    }

    function createHenryButton() {
      if (document.getElementById('henry-save-container')) return;

      const shareBtn = document.getElementById('docs-titlebar-share-client-button');
      let targetParent = null;
      let referenceNode = null;

      if (shareBtn && shareBtn.parentNode) {
        targetParent = shareBtn.parentNode;
        referenceNode = shareBtn;
      } else {
        targetParent = document.querySelector('.docs-titlebar-buttons') || document.querySelector('#docs-header');
        if (targetParent) referenceNode = targetParent.firstChild;
      }

      if (!targetParent) {
        return;
      }

      const container = document.createElement('div');
      container.id = 'henry-save-container';
      Object.assign(container.style, {
        position: 'relative',
        display: 'inline-block',
        marginRight: '8px',
        marginLeft: '8px',
        zIndex: '1000'
      });

      const btn = document.createElement('div');
      btn.id = 'henry-save-btn';
      btn.textContent = 'Henryへ保存 ▼';
      Object.assign(btn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '36px',
        padding: '0 16px',
        backgroundColor: '#212121',
        color: '#fff',
        borderRadius: '18px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        userSelect: 'none',
        fontFamily: '"Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif',
        whiteSpace: 'nowrap',
        gap: '8px'
      });

      btn.onmouseover = () => btn.style.backgroundColor = '#424242';
      btn.onmouseout = () => btn.style.backgroundColor = '#212121';

      const menu = document.createElement('div');
      menu.id = 'henry-save-menu';
      Object.assign(menu.style, {
        display: 'none',
        position: 'absolute',
        top: '40px',
        right: '0',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        minWidth: '150px',
        zIndex: '1001'
      });

      const overwriteItem = document.createElement('div');
      overwriteItem.textContent = '📤 上書き保存';
      Object.assign(overwriteItem.style, {
        padding: '12px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        borderBottom: '1px solid #eee'
      });
      overwriteItem.onmouseover = () => overwriteItem.style.backgroundColor = '#f5f5f5';
      overwriteItem.onmouseout = () => overwriteItem.style.backgroundColor = '#fff';
      overwriteItem.onclick = () => {
        menu.style.display = 'none';
        handleSaveToHenry('overwrite');
      };

      const newItem = document.createElement('div');
      newItem.textContent = '📄 新規保存';
      Object.assign(newItem.style, {
        padding: '12px 16px',
        cursor: 'pointer',
        fontSize: '14px'
      });
      newItem.onmouseover = () => newItem.style.backgroundColor = '#f5f5f5';
      newItem.onmouseout = () => newItem.style.backgroundColor = '#fff';
      newItem.onclick = () => {
        menu.style.display = 'none';
        handleSaveToHenry('new');
      };

      menu.appendChild(overwriteItem);
      menu.appendChild(newItem);

      btn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      };

      document.addEventListener('click', () => {
        menu.style.display = 'none';
      });

      container.appendChild(btn);
      container.appendChild(menu);

      try {
        if (referenceNode) {
          targetParent.insertBefore(container, referenceNode);
        } else {
          targetParent.appendChild(container);
        }
        debugLog('Docs', 'ボタン挿入完了');
      } catch (e) {
        debugError('Docs', 'Button insertion failed', e.message);
      }
    }

    function callHenryAPI(token, hashes, operationName, variables) {
      return new Promise((resolve, reject) => {
        const hashEntry = hashes[operationName];
        if (!hashEntry) {
          reject(new Error(`${operationName} のハッシュがありません。Henryでファイルアップロード操作を行ってください。`));
          return;
        }

        debugLog('Docs', '=== Henry API 呼び出し ===');
        debugLog('Docs', '  Operation:', operationName);
        debugLog('Docs', '  Endpoint:', hashEntry.endpoint);

        const apiUrl = `https://henry-app.jp${hashEntry.endpoint}`;

        const requestBody = {
          operationName,
          variables,
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: hashEntry.hash
            }
          }
        };

        GM_xmlhttpRequest({
          method: 'POST',
          url: apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-organization-uuid': CONFIG.ORG_UUID
          },
          data: JSON.stringify(requestBody),
          onload: (res) => {
            debugLog('Docs', '  Status:', res.status);

            if (res.status === 200) {
              const body = JSON.parse(res.responseText);
              if (body.errors) {
                debugError('Docs', '  GraphQL Error:', body.errors);
                reject(new Error(body.errors[0].message));
              } else {
                resolve(body.data);
              }
            } else {
              debugError('Docs', '  HTTP Error:', res.status);
              reject(new Error(`Henry API Error: ${res.status}`));
            }
          },
          onerror: (err) => {
            debugError('Docs', '  Network Error:', err);
            reject(new Error('Henry API通信エラー'));
          }
        });
      });
    }

    function uploadToGCS(uploadUrl, blobBase64, mimeType, fileName) {
      return new Promise((resolve, reject) => {
        debugLog('Docs', '=== GCS アップロード ===');

        const binaryString = atob(blobBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });

        const formData = new FormData();
        formData.append('file', blob, fileName);

        GM_xmlhttpRequest({
          method: 'POST',
          url: uploadUrl,
          data: formData,
          onload: (res) => {
            if (res.status === 200 || res.status === 201 || res.status === 204) {
              debugLog('Docs', '  GCS アップロード成功');
              resolve();
            } else {
              debugError('Docs', '  GCS アップロード失敗:', res.status);
              reject(new Error(`GCS Upload Error: ${res.status}`));
            }
          },
          onerror: (err) => {
            debugError('Docs', '  GCS Network Error:', err);
            reject(new Error('GCSアップロード通信エラー'));
          }
        });
      });
    }

    async function uploadToHenry(token, hashes, data, mimeType, mode = 'overwrite') {
      debugLog('Docs', '=== Henryアップロード開始 ===');
      debugLog('Docs', '  モード:', mode);

      if (mode === 'overwrite' && data.fileUuid) {
        debugLog('Docs', 'Step 0: 既存ファイル削除...');
        try {
          await callHenryAPI(token, hashes, 'DeletePatientFile', {
            input: { uuid: data.fileUuid }
          });
          debugLog('Docs', '  既存ファイル削除完了');
        } catch (e) {
          debugLog('Docs', '  既存ファイル削除スキップ:', e.message);
        }
      }

      debugLog('Docs', 'Step 1: 署名付きURL取得...');
      const uploadUrlResult = await callHenryAPI(token, hashes, 'GetFileUploadUrl', {
        input: { pathType: 'PATIENT_FILE' }
      });

      const { uploadUrl, fileUrl } = uploadUrlResult.getFileUploadUrl;

      let fileName = data.fileName;
      const extension = mimeType.includes('spreadsheet') ? 'xlsx' : 'docx';
      if (!fileName.endsWith(`.${extension}`)) {
        fileName = `${fileName}.${extension}`;
      }

      debugLog('Docs', 'Step 2: GCSアップロード...');
      await uploadToGCS(uploadUrl, data.blobBase64, mimeType, fileName);

      debugLog('Docs', 'Step 3: メタデータ登録...');
      const createResult = await callHenryAPI(token, hashes, 'CreatePatientFile', {
        input: {
          patientUuid: data.patientId,
          parentFileFolderUuid: data.folderUuid || null,
          title: fileName,
          description: '',
          fileUrl: fileUrl
        }
      });

      const newFileUuid = createResult?.createPatientFile?.uuid || null;
      debugLog('Docs', '  完了, 新FileUuid:', newFileUuid);

      return { createResult, newFileUuid };
    }

    function updateGASContext(docId, updates) {
      return new Promise((resolve, reject) => {
        const requestBody = {
          secretKey: CONFIG.SECRET_KEY,
          action: 'updateContext',
          docId: docId,
          updates: updates
        };

        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.GAS_URL,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(requestBody),
          onload: (res) => {
            if (res.status === 200) {
              const body = JSON.parse(res.responseText);
              if (body.status === 'success') {
                resolve(body);
              } else {
                reject(new Error(body.message));
              }
            } else {
              reject(new Error(`GAS HTTP Error: ${res.status}`));
            }
          },
          onerror: () => reject(new Error('GAS通信エラー'))
        });
      });
    }

    function notifyHenryToRefresh(patientId) {
      const request = {
        timestamp: Date.now(),
        patientId: patientId
      };
      GM_setValue('henry_refresh_request', request);
      debugLog('Docs', 'Henryへリフレッシュ要求を送信');
    }

    async function handleSaveToHenry(mode = 'overwrite') {
      debugLog('Docs', '========================================');
      debugLog('Docs', '=== handleSaveToHenry 開始 ===');
      debugLog('Docs', '  モード:', mode);
      debugLog('Docs', '========================================');

      const btn = document.getElementById('henry-save-btn');
      const originalText = btn.textContent;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.7';

      // スピナー用スタイル追加
      if (!document.getElementById('henry-spin-style')) {
        const style = document.createElement('style');
        style.id = 'henry-spin-style';
        style.textContent = `@keyframes henry-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
      }

      // スピナー + テキスト（innerHTML を使わない）
      while (btn.firstChild) {
        btn.removeChild(btn.firstChild);
      }
      const spinner = document.createElement('div');
      Object.assign(spinner.style, {
        width: '14px', height: '14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'henry-spin 1s linear infinite',
        flexShrink: '0'
      });
      btn.appendChild(spinner);
      const textSpan = document.createElement('span');
      textSpan.textContent = '処理中...';
      btn.appendChild(textSpan);

      try {
        // オンデマンドでトークンとハッシュを取得
        debugLog('Docs', 'トークン・ハッシュを取得中...');
        const [token, hashes] = await Promise.all([
          requestFreshToken(),
          requestFreshHashes()
        ]);

        if (!token) {
          throw new Error('トークンを取得できません。\n\n【解決策】\nHenryのタブを開いた状態で再試行してください。');
        }

        const expiryInfo = checkTokenExpiry(token);
        debugLog('Docs', 'トークン有効期限:', expiryInfo.message);
        if (expiryInfo.isExpired) {
          throw new Error(`トークンが期限切れです (${expiryInfo.expDate})\n\nHenryを開いてリロードしてください。`);
        }

        if (!hashes || Object.keys(hashes).length === 0) {
          throw new Error('APIハッシュを取得できません。\n\n【解決策】\nHenryでファイル一覧を表示してから再試行してください。');
        }

        const docId = window.location.pathname.split('/')[3];
        if (!docId) throw new Error('ドキュメントIDが取得できません');

        const isSpreadsheet = window.location.href.includes('/spreadsheets/');
        const exportFormat = isSpreadsheet ? 'xlsx' : 'docx';
        const mimeType = isSpreadsheet
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        debugLog('Docs', '=== GASエクスポート開始 ===');
        const fileData = await fetchFileFromGAS(docId, exportFormat);

        if (!fileData.patientId) {
          throw new Error('メタデータ(患者ID)がありません。Henryから開いたファイルですか？');
        }

        const { newFileUuid } = await uploadToHenry(token, hashes, fileData, mimeType, mode);

        if (newFileUuid) {
          await updateGASContext(docId, { fileUuid: newFileUuid });
        }

        notifyHenryToRefresh(fileData.patientId);

        const actionText = mode === 'overwrite' ? '上書き保存' : '新規保存';
        alert(`✅ Henryへ${actionText}しました\nファイル名: ${fileData.fileName}.${exportFormat}`);

      } catch (e) {
        debugError('Docs', '=== エラー発生 ===');
        debugError('Docs', '  Message:', e.message);
        alert(`❌ エラー: ${e.message}`);
      } finally {
        while (btn.firstChild) {
          btn.removeChild(btn.firstChild);
        }
        btn.textContent = originalText;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      }
    }

    function fetchFileFromGAS(docId, format) {
      return new Promise((resolve, reject) => {
        const requestBody = {
          secretKey: CONFIG.SECRET_KEY,
          action: 'export',
          docId: docId,
          format: format
        };

        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.GAS_URL,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(requestBody),
          onload: (res) => {
            try {
              const json = JSON.parse(res.responseText);
              if (json.status === 'success') {
                resolve({
                  blobBase64: json.base64,
                  fileName: json.fileName,
                  patientId: json.patientId,
                  fileUuid: json.fileUuid,
                  folderUuid: json.folderUuid
                });
              } else {
                reject(new Error(json.message || 'GASエクスポート失敗'));
              }
            } catch (e) {
              reject(new Error('GASレスポンス解析失敗'));
            }
          },
          onerror: () => reject(new Error('GAS通信エラー'))
        });
      });
    }

    createHenryButton();

    const observer = new MutationObserver(() => {
      if (document.getElementById('henry-save-container')) return;
      createHenryButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

})();
