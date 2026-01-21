// ==UserScript==
// @name         Henry Loader (Dev)
// @namespace    https://henry-app.jp/
// @version      1.1.0
// @description  Henryスクリプトの動的ローダー（開発版）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @match        https://*.henry-app.jp/*
// @match        https://docs.google.com/*
// @match        https://manage-maokahp.reserve.ne.jp/*
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/develop/henry_loader_dev.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/develop/henry_loader_dev.user.js
// ==/UserScript==

(function() {
  'use strict';

  // ==========================================
  // 設定
  // ==========================================
  const CONFIG = {
    // ローカルモード: trueでローカルサーバーから読み込み（即時反映）
    LOCAL_MODE: true,
    LOCAL_URL: 'http://localhost:8080',

    // GitHubモード（LOCAL_MODE: falseの場合）
    BRANCH: 'develop',
    BASE_URL: 'https://raw.githubusercontent.com/shin-926/Henry',

    MANIFEST_FILE: 'manifest.json',
    DEBUG: true  // 開発版はデバッグログ有効
  };

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
      console.log('[HenryLoader:Dev]', ...args);
    }
  }

  function error(...args) {
    console.error('[HenryLoader:Dev]', ...args);
  }

  function getUrl(file) {
    if (CONFIG.LOCAL_MODE) {
      // ローカルモード: キャッシュバスター付き
      return `${CONFIG.LOCAL_URL}/${file}?t=${Date.now()}`;
    }
    // GitHubモード: キャッシュバスター付きURL
    return `${CONFIG.BASE_URL}/${CONFIG.BRANCH}/${file}?t=${Date.now()}`;
  }

  // 現在のホストがmatchパターンに一致するか
  function matchesHost(patterns) {
    const host = location.host;
    return patterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        // ワイルドカード: *.henry-app.jp
        const domain = pattern.slice(2);
        return host === domain || host.endsWith('.' + domain);
      }
      return host === pattern || host.endsWith('.' + pattern);
    });
  }

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

  // GM_*関数をローカル変数として注入するラッパー
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
    const url = getUrl(scriptInfo.file);
    log('スクリプト読み込み:', scriptInfo.name);

    const code = await fetchText(url);

    // UserScriptのメタデータブロックを除去
    // (ローダーが既にgrant等を処理しているため)
    const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');

    // GM_*関数のラッパーを先頭に追加
    const wrappedCode = GM_WRAPPER + cleanCode;

    try {
      // グローバルスコープで実行
      const fn = new Function(wrappedCode);
      fn();
      log('読み込み完了:', scriptInfo.name);
    } catch (e) {
      error(`スクリプトエラー (${scriptInfo.name}):`, e.message);
    }
  }

  async function main() {
    const startTime = performance.now();
    if (CONFIG.LOCAL_MODE) {
      log('ローダー起動 [ローカルモード]', CONFIG.LOCAL_URL);
    } else {
      log('ローダー起動 [GitHubモード]', CONFIG.BRANCH);
    }
    log('現在のホスト:', location.host);

    try {
      // マニフェスト取得
      const manifest = await loadManifest();
      log('マニフェストバージョン:', manifest.version);
      log('スクリプト数:', manifest.scripts.length);

      // 現在のホストにマッチするスクリプトをフィルタ（enabled: falseは除外）
      const targetScripts = manifest.scripts
        .filter(s => matchesHost(s.match) && s.enabled !== false)
        .sort((a, b) => a.order - b.order);

      log('読み込み対象:', targetScripts.map(s => s.name).join(', '));

      // 順番に読み込み
      for (const script of targetScripts) {
        await loadScript(script);
      }

      const elapsed = (performance.now() - startTime).toFixed(0);
      log(`全スクリプト読み込み完了 (${elapsed}ms)`);

    } catch (e) {
      error('ローダーエラー:', e.message);
    }
  }

  // 起動
  main();

})();
