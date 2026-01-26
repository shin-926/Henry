// ==UserScript==
// @name         Henry Loader
// @namespace    https://henry-app.jp/
// @version      1.7.0
// @description  Henryスクリプトの動的ローダー（リリース版）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @match        https://*.henry-app.jp/*
// @match        https://docs.google.com/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @require      https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js
// @require      https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_drive_bridge.user.js
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
// @connect      raw.githubusercontent.com
// @connect      googleapis.com
// @connect      accounts.google.com
// @connect      oauth2.googleapis.com
// @connect      www.googleapis.com
// @connect      docs.googleapis.com
// @connect      storage.googleapis.com
// @connect      henry-app.jp
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_loader.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_loader.user.js
// ==/UserScript==

(function() {
  'use strict';

  // TODO: 配布用と開発用でコードが重複しているが、規模が小さいため現状は許容
  // 将来規模が大きくなった場合、ビルドツール(esbuild等)で1ソースから2ファイル生成する構成を検討

  // ==========================================
  // Google Docs判定（@requireで既に読み込み済み）
  // ==========================================
  if (location.host === 'docs.google.com') {
    console.log('[HenryLoader] Google Docsモード（@require経由で読み込み済み）');
    return;
  }

  // ==========================================
  // 設定
  // ==========================================
  const CONFIG = {
    BRANCH: 'main',
    BASE_URL: 'https://raw.githubusercontent.com/shin-926/Henry',
    MANIFEST_FILE: 'manifest.json',
    DEBUG: false,

    // 配布版でデフォルト無効にするスクリプト
    DEFAULT_DISABLED: [
      'henry_order_history',
      'henry_karte_history',
      'henry_note_reader',
      'henry_hospitalization_data',
      'henry_test_helper'
    ]
  };

  // @requireで既に読み込み済みのスクリプト（二重読み込み防止）
  const PRELOADED_SCRIPTS = new Set(['henry_core', 'henry_google_drive_bridge']);

  // ==========================================
  // スクリプト有効/無効設定
  // ==========================================
  const DISABLED_SCRIPTS_KEY = 'loader-disabled-scripts';
  const INITIALIZED_KEY = 'loader-initialized';

  function getDisabledScripts() {
    // 初回起動時はデフォルト無効リストを設定
    if (!GM_getValue(INITIALIZED_KEY, false)) {
      GM_setValue(DISABLED_SCRIPTS_KEY, CONFIG.DEFAULT_DISABLED);
      GM_setValue(INITIALIZED_KEY, true);
    }
    return new Set(GM_getValue(DISABLED_SCRIPTS_KEY, []));
  }

  function setDisabledScripts(disabledSet) {
    GM_setValue(DISABLED_SCRIPTS_KEY, Array.from(disabledSet));
  }

  // ==========================================
  // GM_*関数をグローバルに公開
  // ==========================================
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

  // ==========================================
  // ユーティリティ
  // ==========================================
  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[HenryLoader]', ...args);
    }
  }

  function error(...args) {
    console.error('[HenryLoader]', ...args);
  }

  function getUrl(file) {
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

  // ==========================================
  // スクリプトローダー
  // ==========================================
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

  async function loadScript(scriptInfo) {
    // @requireで既に読み込み済みならスキップ
    if (PRELOADED_SCRIPTS.has(scriptInfo.name)) {
      log('スキップ（@require済み）:', scriptInfo.name);
      return true;
    }

    const url = getUrl(scriptInfo.file);
    log('スクリプト読み込み:', scriptInfo.name);

    const code = await fetchText(url);

    const requires = parseRequires(code);
    for (const reqUrl of requires) {
      if (!loadedRequires.has(reqUrl)) {
        log('@require 読み込み:', reqUrl);
        try {
          const reqCode = await fetchText(reqUrl);
          const reqFn = new Function(reqCode);
          reqFn();
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
      const fn = new Function(wrappedCode);
      fn();
      log('読み込み完了:', scriptInfo.name);
      return true;
    } catch (e) {
      error(`スクリプトエラー (${scriptInfo.name}):`, e.message);
      return false;
    }
  }

  async function main() {
    const startTime = performance.now();
    log('ローダー起動 (branch:', CONFIG.BRANCH, ')');
    log('現在のホスト:', location.host);

    try {
      const manifest = await loadManifest();
      log('マニフェストバージョン:', manifest.version);
      log('スクリプト数:', manifest.scripts.length);

      // ユーザーの無効設定を取得
      const disabledScripts = getDisabledScripts();
      log('無効スクリプト:', Array.from(disabledScripts));

      // 現在のホストにマッチするスクリプトをフィルタ
      const matchingScripts = manifest.scripts
        .filter(s => matchesHost(s.match) && s.enabled !== false && s.beta !== true)
        .sort((a, b) => a.order - b.order);

      // Toolbox用にmanifest情報を公開（ベータ版は設定パネルに非表示）
      const visibleScripts = matchingScripts.filter(s => !(s.label || '').includes('ベータ版'));
      const loadedScripts = new Set();
      pageWindow.HenryLoaderConfig = {
        scripts: visibleScripts,
        disabledScripts: disabledScripts,
        loadedScripts: loadedScripts,
        setDisabledScripts: (names) => {
          setDisabledScripts(new Set(names));
          pageWindow.HenryLoaderConfig.disabledScripts = new Set(names);
        }
      };

      // 無効スクリプトとベータ版を除外（配布版ではベータ版は読み込まない）
      const targetScripts = matchingScripts.filter(s =>
        !disabledScripts.has(s.name) && !(s.label || '').includes('ベータ版')
      );

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
