// ==UserScript==
// @name         Google Docs連携
// @namespace    https://henry-app.jp/
// @version      2.10.5
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
    GRAPHQL_ENDPOINT: '/graphql'
  };

  // GraphQL クエリ定義（APQ不要、常にフルクエリを送信）
  const QUERIES = {
    GetFileUploadUrl: `
      query GetFileUploadUrl($input: GetFileUploadUrlRequestInput!) {
        getFileUploadUrl(input: $input) {
          uploadUrl
          fileUrl
        }
      }
    `,
    CreatePatientFile: `
      mutation CreatePatientFile($input: CreatePatientFileRequestInput!) {
        createPatientFile(input: $input) {
          uuid
        }
      }
    `,
    DeletePatientFile: `
      mutation DeletePatientFile($input: DeletePatientFileRequestInput!) {
        deletePatientFile(input: $input)
      }
    `
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

  function showToast(message, isError = false, duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      borderRadius: '8px',
      backgroundColor: isError ? '#d93025' : '#1a73e8',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // エラー種別ごとのヘルプ情報
  const HELP_INFO = {
    HENRYCORE_NOT_FOUND: {
      title: 'Henry Core が見つかりません',
      steps: [
        '「Henry Core」スクリプトがインストールされているか確認してください',
        'Tampermonkey の管理画面で Henry Core が有効になっているか確認してください',
        'ページを再読み込みしてください'
      ]
    },
    TOKEN_NOT_FOUND: {
      title: '認証トークンを取得できません',
      steps: [
        'Henryにログインしているか確認してください',
        'Henryのタブが開いているか確認してください',
        'Henryのタブを再読み込みしてから、もう一度お試しください'
      ]
    }
  };

  function showHelpModal(errorType) {
    const info = HELP_INFO[errorType];
    if (!info) return;

    // 既存のモーダルがあれば削除
    const existing = document.getElementById('henry-help-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'henry-help-modal';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '100000'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    });

    const title = document.createElement('h3');
    title.textContent = '⚠️ ' + info.title;
    Object.assign(title.style, {
      margin: '0 0 16px 0',
      fontSize: '18px',
      color: '#d93025'
    });

    const subtitle = document.createElement('p');
    subtitle.textContent = '以下をお試しください:';
    Object.assign(subtitle.style, {
      margin: '0 0 12px 0',
      fontSize: '14px',
      color: '#666'
    });

    const list = document.createElement('ol');
    Object.assign(list.style, {
      margin: '0 0 16px 0',
      paddingLeft: '20px',
      fontSize: '14px',
      lineHeight: '1.8'
    });

    info.steps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      list.appendChild(li);
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '閉じる';
    Object.assign(closeBtn.style, {
      display: 'block',
      width: '100%',
      padding: '12px',
      backgroundColor: '#1a73e8',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    });
    closeBtn.onclick = () => overlay.remove();

    modal.appendChild(title);
    modal.appendChild(subtitle);
    modal.appendChild(list);

    if (info.note) {
      const note = document.createElement('p');
      note.textContent = info.note;
      Object.assign(note.style, {
        margin: '0 0 16px 0',
        fontSize: '12px',
        color: '#999'
      });
      modal.appendChild(note);
    }

    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
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
    const cachedFilesByFolder = new Map(); // フォルダUUID → ファイル配列
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

          debugLog('Henry', 'ListPatientFiles をキャッチ');
          const requestFolderUuid = requestJson.variables?.input?.parentFileFolderUuid?.value ?? null;
          const pageToken = requestJson.variables?.input?.pageToken ?? '';
          const clone = response.clone();
          const json = await clone.json();
          const patientFiles = json.data?.listPatientFiles?.patientFiles;

          if (!Array.isArray(patientFiles)) return response;

          // フォルダごとにキャッシュを管理
          // APIレスポンスにはparentFileFolderUuidが含まれないため、リクエストから付与
          const folderKey = requestFolderUuid ?? '__root__';
          const filesWithFolder = patientFiles.map(f => ({
            ...f,
            parentFileFolderUuid: requestFolderUuid // リクエストのフォルダUUIDを付与
          }));

          if (pageToken === '') {
            // 最初のページ: 新規キャッシュ
            cachedFilesByFolder.set(folderKey, filesWithFolder);
            debugLog('Henry', 'キャッシュ更新:', folderKey, filesWithFolder.length, '件');
          } else {
            // ページネーション: 追加
            const existing = cachedFilesByFolder.get(folderKey) || [];
            cachedFilesByFolder.set(folderKey, [...existing, ...filesWithFolder]);
            debugLog('Henry', 'キャッシュ追加:', folderKey, filesWithFolder.length, '件, 合計:', cachedFilesByFolder.get(folderKey).length, '件');
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

      // DOMからファイル名と日時を取得
      const spans = row.querySelectorAll('span');
      const fileName = spans[0]?.textContent?.trim();
      const dateStr = spans[1]?.textContent?.trim(); // "2025.05.31 10:00" 形式
      if (!fileName) return;

      // 全フォルダのキャッシュからファイル名で検索
      const findFileByNameAndDate = (fileName, dateStr) => {
        const candidates = [];
        for (const files of cachedFilesByFolder.values()) {
          for (const f of files) {
            if (f.file?.title === fileName) {
              candidates.push(f);
            }
          }
        }

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        // 同名ファイルが複数ある場合は日時で絞り込み
        if (dateStr) {
          const matched = candidates.find(f => {
            const ts = f.createTime?.seconds;
            if (!ts) return false;
            const date = new Date(ts * 1000);
            const formatted = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            return formatted === dateStr;
          });
          if (matched) return matched;
        }

        // 日時で一致しなければ最初の候補を返す
        return candidates[0];
      };

      const fileData = findFileByNameAndDate(fileName, dateStr);
      if (!fileData || !fileData.file) return;

      const file = fileData.file;
      const fileUrl = file.redirectUrl;
      if (!fileUrl || !fileUrl.includes('storage.googleapis.com')) return;

      if (!CONVERTIBLE_TYPES.has(file.fileType)) return;

      // .docx/.xlsxの場合はデフォルトのダウンロード動作を阻止
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const patientFileUuid = fileData.uuid;
      const folderUuid = fileData.parentFileFolderUuid || null;
      debugLog('Henry', 'ファイル情報:', { patientFileUuid, folderUuid, fileName });

      if (inflight.has(patientFileUuid)) return;

      if (!pageWindow.HenryCore) return;
      const patientUuid = pageWindow.HenryCore.getPatientUuid();
      if (!patientUuid) return;

      try {
        await pageWindow.HenryCore.utils.withLock(inflight, patientFileUuid, async () => {
          const totalStart = performance.now();
          const token = await pageWindow.HenryCore.getToken();

          const hide = showProcessingIndicator(`書類を開いています... (${file.title || '文書'})`);
          try {
            const result = await sendToGAS(
              file.redirectUrl, token, file.title || 'untitled',
              patientUuid, patientFileUuid, folderUuid
            );
            if (result.openUrl) {
              const totalTime = performance.now() - totalStart;
              console.log(`%c[HenryBridge/GAS] ファイルを開く 合計時間: ${totalTime.toFixed(0)}ms`, 'color: #FF9800; font-weight: bold; font-size: 14px;');
              log?.info('GAS変換成功:', result.name);
              GM_openInTab(result.openUrl, { active: true });
              showProcessingIndicator(`ファイルを開きました (${(totalTime/1000).toFixed(1)}秒)`, 'success');
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
      setupRefreshListener();

      let waited = 0;
      while (!pageWindow.HenryCore) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
        if (waited > CONFIG.HENRYCORE_TIMEOUT) {
          debugError('Henry', 'HenryCore が見つかりません (タイムアウト)');
          showHelpModal('HENRYCORE_NOT_FOUND');
          return;
        }
      }
      debugLog('Henry', `HenryCore検出 (${waited}ms)`);

      log = pageWindow.HenryCore.utils.createLogger('HenryBridge');
      setupFetchIntercept();

      const cleaner = pageWindow.HenryCore.utils.createCleaner();
      pageWindow.HenryCore.utils.subscribeNavigation(cleaner, () => {
        cachedFilesByFolder.clear();
        activeIndicators.forEach(el => {
          if (el.parentNode) el.remove();
        });
        activeIndicators = [];
        const handler = (e) => handleDoubleClick(e);
        document.addEventListener('dblclick', handler, true);
        cleaner.add(() => document.removeEventListener('dblclick', handler, true));
        log.info('Ready (v2.10.0)');
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
        left: '0',
        right: '0',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: '1001'
      });

      const overwriteItem = document.createElement('div');
      overwriteItem.textContent = '上書き保存';
      Object.assign(overwriteItem.style, {
        padding: '12px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'center',
        borderBottom: '1px solid #eee'
      });
      overwriteItem.onmouseover = () => overwriteItem.style.backgroundColor = '#f5f5f5';
      overwriteItem.onmouseout = () => overwriteItem.style.backgroundColor = '#fff';
      overwriteItem.onclick = () => {
        menu.style.display = 'none';
        handleSaveToHenry('overwrite');
      };

      const newItem = document.createElement('div');
      newItem.textContent = '新規保存';
      Object.assign(newItem.style, {
        padding: '12px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'center'
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

    function callHenryAPI(token, operationName, variables) {
      return new Promise((resolve, reject) => {
        const query = QUERIES[operationName];
        if (!query) {
          reject(new Error(`${operationName} のクエリが定義されていません`));
          return;
        }

        debugLog('Docs', '=== Henry API 呼び出し ===');
        debugLog('Docs', '  Operation:', operationName);

        const apiUrl = `https://henry-app.jp${CONFIG.GRAPHQL_ENDPOINT}`;

        const requestBody = {
          operationName,
          variables,
          query
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
            if (res.status === 200) {
              const body = JSON.parse(res.responseText);
              if (body.errors) {
                debugError('Docs', '  GraphQL Error:', body.errors);
                reject(new Error(body.errors[0].message));
              } else {
                resolve(body.data);
              }
            } else {
              debugError('Docs', '  HTTP Error:', res.status, res.responseText);
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

    async function uploadToHenry(token, data, mimeType, mode = 'overwrite') {
      debugLog('Docs', '=== Henryアップロード開始 ===');
      debugLog('Docs', '  モード:', mode);
      debugLog('Docs', '  fileUuid:', data.fileUuid || '(なし)');
      debugLog('Docs', '  folderUuid:', data.folderUuid || '(なし)');

      if (mode === 'overwrite' && data.fileUuid) {
        debugLog('Docs', 'Step 0: 既存ファイル削除...');
        try {
          await callHenryAPI(token, 'DeletePatientFile', {
            input: { uuid: data.fileUuid }
          });
          debugLog('Docs', '  既存ファイル削除完了');
        } catch (e) {
          debugLog('Docs', '  既存ファイル削除スキップ:', e.message);
        }
      }

      debugLog('Docs', 'Step 1: 署名付きURL取得...');
      const uploadUrlResult = await callHenryAPI(token, 'GetFileUploadUrl', {
        input: { pathType: 'PATIENT_FILE' }
      });

      const { uploadUrl, fileUrl } = uploadUrlResult.getFileUploadUrl;

      const fileName = data.fileName;

      debugLog('Docs', 'Step 2: GCSアップロード...');
      await uploadToGCS(uploadUrl, data.blobBase64, mimeType, fileName);

      debugLog('Docs', 'Step 3: メタデータ登録...');
      const createResult = await callHenryAPI(token, 'CreatePatientFile', {
        input: {
          patientUuid: data.patientId,
          parentFileFolderUuid: data.folderUuid ? { value: data.folderUuid } : null,
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
        const totalStart = performance.now();

        // オンデマンドでトークンを取得
        debugLog('Docs', 'トークンを取得中...');
        const token = await requestFreshToken();

        if (!token) {
          showHelpModal('TOKEN_NOT_FOUND');
          throw new Error('認証トークンを取得できません');
        }

        const expiryInfo = checkTokenExpiry(token);
        debugLog('Docs', 'トークン有効期限:', expiryInfo.message);
        if (expiryInfo.isExpired) {
          showHelpModal('TOKEN_NOT_FOUND');
          throw new Error('トークンが期限切れです');
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

        const { newFileUuid } = await uploadToHenry(token, fileData, mimeType, mode);

        if (newFileUuid) {
          await updateGASContext(docId, { fileUuid: newFileUuid });
        }

        notifyHenryToRefresh(fileData.patientId);

        const totalTime = performance.now() - totalStart;
        console.log(`%c[HenryBridge/GAS] 保存 合計時間: ${totalTime.toFixed(0)}ms`, 'color: #FF9800; font-weight: bold; font-size: 14px;');

        const actionText = mode === 'overwrite' ? '上書き保存' : '新規保存';
        showToast(`✅ Henryへ${actionText}しました (${(totalTime/1000).toFixed(1)}秒)`);

      } catch (e) {
        debugError('Docs', '=== エラー発生 ===');
        debugError('Docs', '  Message:', e.message);
        showToast(`❌ エラー: ${e.message}`, true, 5000);
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
