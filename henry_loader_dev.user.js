// ==UserScript==
// @name         Henry Loader (Dev)
// @namespace    https://henry-app.jp/
// @version      1.8.0
// @description  Henryスクリプトの動的ローダー（開発版）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @match        https://*.henry-app.jp/*
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

  // TODO: 本番用(henry_loader.user.js)と開発用(henry_loader_dev.user.js)でコードが重複している
  // 将来的にビルドツール導入を検討し、1ソースから2ファイル生成する構成も可能

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
  // スクリプト有効/無効設定
  // ==========================================
  const DISABLED_SCRIPTS_KEY = 'loader-disabled-scripts';

  function getDisabledScripts() {
    return new Set(GM_getValue(DISABLED_SCRIPTS_KEY, []));
  }

  function setDisabledScripts(disabledSet) {
    GM_setValue(DISABLED_SCRIPTS_KEY, Array.from(disabledSet));
  }

  // ==========================================
  // GM_*関数をグローバルに公開
  // ==========================================
  // NOTE: GM_WRAPPERがwindow.GM_*を参照するため、グローバル公開は必須
  // GM_WRAPPERは各スクリプト実行時に先頭に追加され、ローカル変数として注入する
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
  // TODO: 正規表現を使った実装に変更すると柔軟性が増す（現状で動作に問題なし）
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
          // @requireはグローバルスコープで実行（Blob URL方式）
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

    // UserScriptのメタデータブロックを除去
    // (ローダーが既にgrant等を処理しているため)
    const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');

    // GM_*関数のラッパーを先頭に追加
    const wrappedCode = GM_WRAPPER + cleanCode;

    try {
      // Blob URL + script タグで実行（Trusted Types対応）
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

      // ユーザーの無効設定を取得
      const disabledScripts = getDisabledScripts();
      log('無効スクリプト:', Array.from(disabledScripts));

      // 現在のホストにマッチするスクリプトをフィルタ
      const matchingScripts = manifest.scripts
        .filter(s => matchesHost(s.match) && s.enabled !== false)
        .sort((a, b) => a.order - b.order);

      // Toolbox用にmanifest情報を公開
      const loadedScripts = new Set();
      pageWindow.HenryLoaderConfig = {
        scripts: matchingScripts,
        disabledScripts: disabledScripts,
        loadedScripts: loadedScripts,
        setDisabledScripts: (names) => {
          setDisabledScripts(new Set(names));
          pageWindow.HenryLoaderConfig.disabledScripts = new Set(names);
        }
      };

      // 無効スクリプトを除外（開発用はベータ版も読み込む。配布用はベータ版を除外）
      const targetScripts = matchingScripts.filter(s => !disabledScripts.has(s.name));

      log('読み込み対象:', targetScripts.map(s => s.name).join(', '));
      if (disabledScripts.size > 0) {
        log('スキップ:', matchingScripts.filter(s => disabledScripts.has(s.name)).map(s => s.name).join(', '));
      }

      // 順番に読み込み
      // TODO: 現状は1つ失敗で全停止（依存関係を考慮した安全な設計）
      // 「失敗スキップして続行」が必要なら個別try-catchを検討
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

  // 起動（DOM準備完了を待つ）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();
