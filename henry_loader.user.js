// ==UserScript==
// @name         Henry Loader
// @namespace    https://henry-app.jp/
// @version      1.1.0
// @description  Henryスクリプトの動的ローダー（リリース版）
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

  // ==========================================
  // 設定
  // ==========================================
  const CONFIG = {
    BRANCH: 'main',
    BASE_URL: 'https://raw.githubusercontent.com/shin-926/Henry',
    MANIFEST_FILE: 'manifest.json',
    DEBUG: false
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
      console.log('[HenryLoader]', ...args);
    }
  }

  function error(...args) {
    console.error('[HenryLoader]', ...args);
  }

  function getUrl(file) {
    // キャッシュバスター付きURL
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

  // @requireを解析してURLリストを返す
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

  // 読み込み済みの@require URLを記録
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

    // @requireを解析して先に読み込む
    const requires = parseRequires(code);
    for (const reqUrl of requires) {
      if (!loadedRequires.has(reqUrl)) {
        log('@require 読み込み:', reqUrl);
        try {
          const reqCode = await fetchText(reqUrl);
          // @requireはグローバルスコープで実行（windowに変数を設定するため）
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
    log('ローダー起動 (branch:', CONFIG.BRANCH, ')');
    log('現在のホスト:', location.host);

    try {
      // マニフェスト取得
      const manifest = await loadManifest();
      log('マニフェストバージョン:', manifest.version);
      log('スクリプト数:', manifest.scripts.length);

      // 現在のホストにマッチするスクリプトをフィルタ
      const targetScripts = manifest.scripts
        .filter(s => matchesHost(s.match))
        .sort((a, b) => a.order - b.order);

      log('読み込み対象:', targetScripts.map(s => s.name).join(', '));

      // 順番に読み込み
      for (const script of targetScripts) {
        await loadScript(script);
      }

      log('全スクリプト読み込み完了');

    } catch (e) {
      error('ローダーエラー:', e.message);
    }
  }

  // 起動
  main();

})();
