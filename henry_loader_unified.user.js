// ==UserScript==
// @name         Henry Loader (Unified Dev)
// @namespace    https://henry-app.jp/
// @version      1.1.0
// @description  Henryスクリプト統合ローダー（全ドメイン対応・開発版）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @match        https://*.henry-app.jp/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @match        https://docs.google.com/*
// @require      https://raw.githubusercontent.com/shin-926/Henry/develop/henry_core.user.js
// @require      https://raw.githubusercontent.com/shin-926/Henry/develop/henry_google_drive_bridge.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @connect      localhost
// @connect      raw.githubusercontent.com
// @connect      googleapis.com
// @connect      accounts.google.com
// @connect      oauth2.googleapis.com
// @connect      www.googleapis.com
// @connect      docs.googleapis.com
// @connect      storage.googleapis.com
// @connect      henry-app.jp
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/develop/henry_loader_unified.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/develop/henry_loader_unified.user.js
// ==/UserScript==

(function() {
  'use strict';

  // ==========================================
  // 設定
  // ==========================================
  const CONFIG = {
    // ローカルモード: trueでローカルサーバーから読み込み（即時反映）
    // Google Docsでは@requireからGitHub読み込み、Henry側はローカル読み込み
    LOCAL_MODE: true,
    LOCAL_URL: 'http://localhost:8080',

    // GitHubモード（LOCAL_MODE: falseの場合）
    BRANCH: 'develop',
    BASE_URL: 'https://raw.githubusercontent.com/shin-926/Henry',
    MANIFEST_FILE: 'manifest.json',
    DEBUG: true  // 開発版はデバッグログ有効
  };

  // @requireで既に読み込み済みのスクリプト（二重読み込み防止）
  const PRELOADED_SCRIPTS = new Set(['henry_core', 'henry_google_drive_bridge']);

  // ==========================================
  // Google Docs判定
  // ==========================================
  const isGoogleDocs = location.host === 'docs.google.com';

  if (isGoogleDocs) {
    // Google Docsでは @require で既に読み込まれているので終了
    console.log('[HenryLoader:Unified] Google Docsモード（@require経由で読み込み済み）');
    return;
  }

  // ==========================================
  // 以下はHenry/予約システム用の動的ローダー
  // ==========================================

  const DISABLED_SCRIPTS_KEY = 'loader-disabled-scripts';

  function getDisabledScripts() {
    return new Set(GM_getValue(DISABLED_SCRIPTS_KEY, []));
  }

  function setDisabledScripts(disabledSet) {
    GM_setValue(DISABLED_SCRIPTS_KEY, Array.from(disabledSet));
  }

  // GM_*関数をグローバルに公開
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  pageWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;
  pageWindow.GM_setValue = GM_setValue;
  pageWindow.GM_getValue = GM_getValue;
  pageWindow.GM_deleteValue = GM_deleteValue;
  pageWindow.GM_openInTab = GM_openInTab;
  pageWindow.GM_addValueChangeListener = GM_addValueChangeListener;
  pageWindow.GM_removeValueChangeListener = GM_removeValueChangeListener;
  pageWindow.GM_addStyle = GM_addStyle;
  pageWindow.GM_info = GM_info;
  if (typeof GM_registerMenuCommand !== 'undefined') {
    pageWindow.GM_registerMenuCommand = GM_registerMenuCommand;
  }

  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[HenryLoader:Unified]', ...args);
    }
  }

  function error(...args) {
    console.error('[HenryLoader:Unified]', ...args);
  }

  function getUrl(file) {
    if (CONFIG.LOCAL_MODE) {
      return `${CONFIG.LOCAL_URL}/${file}?t=${Date.now()}`;
    }
    return `${CONFIG.BASE_URL}/${CONFIG.BRANCH}/${file}?t=${Date.now()}`;
  }

  function matchesHost(patterns) {
    const host = location.host;
    return patterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        const domain = pattern.slice(2);
        return host === domain || host.endsWith('.' + domain);
      }
      return host === pattern || host.endsWith('.' + pattern);
    });
  }

  function parseRequires(code) {
    const requires = [];
    const metaMatch = code.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
    if (metaMatch) {
      const metaBlock = metaMatch[1];
      const requireRegex = /\/\/\s*@require\s+(\S+)/g;
      let match;
      while ((match = requireRegex.exec(metaBlock)) !== null) {
        requires.push(match[1]);
      }
    }
    return requires;
  }

  const loadedRequires = new Set();

  async function fetchText(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: (response) => {
          if (response.status === 200) {
            resolve(response.responseText);
          } else {
            reject(new Error(`HTTP ${response.status}: ${url}`));
          }
        },
        onerror: (err) => {
          reject(new Error(`Network error: ${url}`));
        }
      });
    });
  }

  async function loadManifest() {
    const url = getUrl(CONFIG.MANIFEST_FILE);
    log('マニフェスト取得:', url);
    const text = await fetchText(url);
    return JSON.parse(text);
  }

  const GM_WRAPPER = `
const GM_xmlhttpRequest = window.GM_xmlhttpRequest;
const GM_setValue = window.GM_setValue;
const GM_getValue = window.GM_getValue;
const GM_deleteValue = window.GM_deleteValue;
const GM_openInTab = window.GM_openInTab;
const GM_addValueChangeListener = window.GM_addValueChangeListener;
const GM_removeValueChangeListener = window.GM_removeValueChangeListener;
const GM_addStyle = window.GM_addStyle;
const GM_info = window.GM_info;
const GM_registerMenuCommand = window.GM_registerMenuCommand;
const unsafeWindow = window;
`;

  // eval でコードを実行（CSPで 'unsafe-eval' が許可されている場合）
  function executeCode(code, name) {
    return new Promise((resolve, reject) => {
      try {
        // eval を使って実行（CSPで許可されている）
        (0, eval)(code);
        resolve(true);
      } catch (e) {
        reject(new Error(`Script execution failed: ${name} - ${e.message}`));
      }
    });
  }

  async function loadScript(scriptInfo) {
    // @requireで既に読み込み済みならスキップ
    if (PRELOADED_SCRIPTS.has(scriptInfo.name)) {
      log('スキップ（@require済み）:', scriptInfo.name);
      return true;
    }

    const url = getUrl(scriptInfo.file);
    log('スクリプト読み込み:', scriptInfo.name);

    const code = await fetchText(url);

    // @requireを解析して先に読み込む
    const requires = parseRequires(code);
    for (const reqUrl of requires) {
      if (!loadedRequires.has(reqUrl)) {
        log('@require 読み込み:', reqUrl);
        try {
          const reqCode = await fetchText(reqUrl);
          await executeCode(reqCode, reqUrl);
          loadedRequires.add(reqUrl);
          log('@require 完了:', reqUrl);
        } catch (e) {
          error(`@require エラー (${reqUrl}):`, e.message);
        }
      } else {
        log('@require スキップ（読み込み済み）:', reqUrl);
      }
    }

    const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');
    const wrappedCode = GM_WRAPPER + cleanCode;

    try {
      await executeCode(wrappedCode, scriptInfo.name);
      log('読み込み完了:', scriptInfo.name);
      return true;
    } catch (e) {
      error(`スクリプトエラー (${scriptInfo.name}):`, e.message);
      return false;
    }
  }

  async function main() {
    const startTime = performance.now();
    log('ローダー起動 [統合版]');
    log('現在のホスト:', location.host);

    try {
      const manifest = await loadManifest();
      log('マニフェストバージョン:', manifest.version);

      const disabledScripts = getDisabledScripts();

      const matchingScripts = manifest.scripts
        .filter(s => matchesHost(s.match) && s.enabled !== false)
        .sort((a, b) => a.order - b.order);

      const loadedScripts = new Set();

      // @requireで読み込み済みのものは最初から追加
      PRELOADED_SCRIPTS.forEach(name => loadedScripts.add(name));

      pageWindow.HenryLoaderConfig = {
        scripts: matchingScripts,
        disabledScripts: disabledScripts,
        loadedScripts: loadedScripts,
        setDisabledScripts: (names) => {
          setDisabledScripts(new Set(names));
          pageWindow.HenryLoaderConfig.disabledScripts = new Set(names);
        }
      };

      const targetScripts = matchingScripts.filter(s => !disabledScripts.has(s.name));

      log('読み込み対象:', targetScripts.map(s => s.name).join(', '));

      for (const script of targetScripts) {
        const success = await loadScript(script);
        if (success) {
          loadedScripts.add(script.name);
        }
      }

      const elapsed = (performance.now() - startTime).toFixed(0);
      log(`全スクリプト読み込み完了 (${elapsed}ms)`);

    } catch (e) {
      error('ローダーエラー:', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();
