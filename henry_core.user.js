// ==UserScript==
// @name         Henry Core
// @namespace    https://henry-app.jp/
// @version      2.23.0
// @description  Henry スクリプト実行基盤 (GoogleAuth統合 / Google Docs対応)
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @match        https://docs.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      accounts.google.com
// @connect      oauth2.googleapis.com
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js
// @run-at       document-start
// ==/UserScript==

/*
 * 【Henry Core - スクリプト実行基盤】
 *
 * ■ 役割
 * - 他のHenryスクリプトが共通で使用するAPI・ユーティリティを提供
 * - GraphQL API呼び出し、患者情報取得、SPA遷移対応など
 * - Google認証（OAuth）機能の統合
 *
 * ■ 他スクリプトからの使用方法
 * - window.HenryCore（またはunsafeWindow.HenryCore）経由でアクセス
 * - HenryCoreの読み込み完了を待ってから使用すること
 *
 * ■ 依存関係
 * - このスクリプトは他に依存しない（最初に読み込まれる）
 * - 他のスクリプトはこのスクリプトに依存する（henry_login_helper等一部を除く）
 */

/**
 * ============================================
 * Henry Core API 目次 (v2.16.0)
 * ============================================
 *
 * ■ Core API
 *   query(queryString, variables?, options?)     - GraphQL API呼び出し（エンドポイント自動学習）
 *   getPatientUuid()                             - 現在表示中の患者UUID
 *   getMyUuid()                                  - ログインユーザーUUID（非同期）
 *   getMyDepartment()                            - ログインユーザー診療科（非同期）
 *   getToken()                                   - Firebase Auth トークン（非同期）
 *   tokenStatus()                                - トークン有効性確認（非同期）
 *
 * ■ Plugin Registration
 *   registerPlugin({ id, name, icon?, description?, version?, order?, onClick, group?, groupIcon? })
 *   plugins                                      - 登録済みプラグイン配列（読み取り専用）
 *
 * ■ Utilities (utils.*)
 *   createCleaner()                              - クリーンアップ管理 { add(fn), exec() }
 *   subscribeNavigation(cleaner, initFn)         - SPA遷移時の自動クリーンアップ
 *   waitForElement(selector, timeout?)           - 要素出現待機
 *   waitForGlobal(key, timeout?)                 - グローバル変数待機
 *   waitForToolbox(timeout?)                     - HenryToolbox待機（register関数の準備完了まで）
 *   withLock(map, key, generator)                - 重複実行防止
 *   sleep(ms)                                    - 指定時間待機
 *   createLogger(name)                           - ロガー作成 { info, warn, error }
 *
 * ■ UI Components (ui.*)
 *   tokens                                          - デザイントークン（色、フォント、スペーシング等）
 *   createButton({ label, variant?, icon?, onClick? })
 *   createInput({ placeholder?, type?, value? })    - テキスト入力フィールド
 *   createTextarea({ placeholder?, value?, rows? }) - 複数行テキスト入力
 *   createSelect({ options?, value?, onChange? })   - セレクトボックス → { wrapper, select }
 *   createCheckbox({ label?, checked?, onChange? }) - チェックボックス → { wrapper, checkbox }
 *   createRadioGroup({ options, name?, value?, onChange? }) - ラジオグループ → { wrapper, radios, getValue }
 *   showModal({ title, content, actions?, width?, closeOnOverlayClick? })
 *   showToast(message, type?, duration?)            - トースト通知
 *   showSpinner(message?)                           - ローディング表示 → { close }
 *
 * ■ Google Auth (modules.GoogleAuth.*)
 *   isConfigured()                               - 設定済みか
 *   isAuthenticated()                            - 認証済みか
 *   getValidAccessToken()                        - 有効なアクセストークン取得（非同期）
 *   startAuth()                                  - 認証フロー開始
 *   clearTokens()                                - トークン削除
 *   saveCredentials(clientId, clientSecret)      - 認証情報保存
 *   clearCredentials()                           - 認証情報削除
 *   showConfigDialog()                           - 設定ダイアログ表示
 *
 * 詳細は各関数の実装を参照
 * ============================================
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;

  // ページのwindowを取得（サンドボックス対応）
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // 二重起動防止
  if (pageWindow.HenryCore) return;

  // ドメイン判定
  const isHenry = location.host === 'henry-app.jp';
  const isGoogleDocs = location.host === 'docs.google.com';

  // GM_storageからGoogle認証情報を読み込み
  const storedCredentials = GM_getValue('google_oauth_credentials', null);

  const CONFIG = {
    // 単一施設運用を前提としたハードコード（複数施設対応は想定しない）
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825', // マオカ病院
    BASE_URL: 'https://henry-app.jp',

    // GoogleAuth設定（GM_storageから読み込み、未設定なら空）
    GOOGLE_CLIENT_ID: storedCredentials?.clientId || '',
    GOOGLE_CLIENT_SECRET: storedCredentials?.clientSecret || '',

    // GoogleAuth固定設定
    GOOGLE_SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets',
    GOOGLE_REDIRECT_URI: 'https://henry-app.jp/',
    GOOGLE_AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
    GOOGLE_TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
    GOOGLE_TOKENS_KEY: 'google_drive_tokens',
    GOOGLE_CREDENTIALS_KEY: 'google_oauth_credentials'
  };

  console.log(`[Henry Core] Initializing v${VERSION}...`);

  // ==========================================
  // 1. Auth Manager (認証トークン)
  // ==========================================
  const safeDecodeJWT = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = "=".repeat((4 - base64url.length % 4) % 4);
      const binary = atob(base64url + pad);

      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (e) {
      return null;
    }
  };

  const Auth = {
    // NOTE: Henry本体のFirebase Auth実装に依存（IndexedDB 'firebaseLocalStorageDb' の構造）
    getToken: () => new Promise((resolve) => {
      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onerror = () => resolve(null);
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);

        const tx = db.transaction('firebaseLocalStorage', 'readonly');
        const reqAll = tx.objectStore('firebaseLocalStorage').getAll();
        reqAll.onsuccess = () => {
          const now = Date.now();
          const valid = reqAll.result
            .map(r => r.value?.stsTokenManager)
            .filter(t => t && t.accessToken && t.expirationTime > now)
            .sort((a, b) => b.expirationTime - a.expirationTime)[0];
          resolve(valid?.accessToken || null);
        };
        reqAll.onerror = () => resolve(null);
      };
    }),

    tokenStatus: async () => {
      const token = await Auth.getToken();
      if (!token) {
        console.log('[Henry Core] 有効なトークンなし');
        return null;
      }

      const payload = safeDecodeJWT(token);
      if (!payload || !payload.exp) {
        console.warn('[Henry Core] トークン解析失敗 (Invalid Format)');
        return null;
      }

      const exp = new Date(payload.exp * 1000);
      const now = new Date();
      const remaining = Math.floor((exp - now) / 1000 / 60);

      return { valid: true, expiration: exp, remainingMinutes: remaining };
    },

    getMyNameFromToken: () => new Promise((resolve) => {
      Auth.getToken().then(token => {
        if (!token) return resolve(null);
        const payload = safeDecodeJWT(token);
        resolve(payload?.name || null);
      });
    })
  };

  // ==========================================
  // 2. Context Manager (動的コンテキスト)
  // ==========================================
  const Context = {
    _myUuid: null,
    _myName: null,
    _myDepartment: null,

    // URLからのみ取得（キャッシュ廃止：患者取り違え防止）
    // NOTE: Henry本体のURL構造に依存（/patients/:uuid 形式）
    getPatientUuid: () => {
      const match = pageWindow.location.pathname.match(/\/patients\/([a-f0-9-]{36})/i);
      return match ? match[1] : null;
    },

    // 自分のUUIDと名前を取得（内部用、両方キャッシュ）
    _resolveMe: async () => {
      if (Context._myUuid && Context._myName) {
        return { uuid: Context._myUuid, name: Context._myName };
      }

      const firebaseName = await Auth.getMyNameFromToken();
      if (!firebaseName) {
        console.error('[Henry Core] Firebase から名前を取得できませんでした');
        return null;
      }

      try {
        const result = await queryInternal(`
          query ListUsers($input: ListUsersRequestInput!) {
            listUsers(input: $input) {
              users { uuid name }
            }
          }
        `, { input: { role: 'DOCTOR', onlyNarcoticPractitioner: false } });

        const users = result.data?.listUsers?.users || [];
        const normalize = (s) => s.replace(/\s+/g, '');
        const normalizedMyName = normalize(firebaseName);

        // 完全一致を試行
        let me = users.find(u => normalize(u.name) === normalizedMyName);

        // 部分一致を試行（Firebase名に病院名プレフィックスが付いている場合）
        if (!me) {
          me = users.find(u => normalizedMyName.endsWith(normalize(u.name)));
        }

        if (!me) {
          console.error('[Henry Core] 医師一覧に該当ユーザーが見つかりませんでした (Name mismatch)');
          console.error('[Henry Core] Firebaseの名前:', firebaseName, '→ 正規化:', normalizedMyName);
          console.error('[Henry Core] 医師一覧:', users.map(u => `${u.name} → ${normalize(u.name)}`));
          return null;
        }

        Context._myUuid = me.uuid;
        Context._myName = me.name;
        console.log(`[Henry Core] Me resolved: ${me.name} (${me.uuid})`);
        return { uuid: me.uuid, name: me.name };
      } catch (e) {
        console.error('[Henry Core] _resolveMe エラー:', e.message);
        return null;
      }
    },

    getMyUuid: async () => {
      const me = await Context._resolveMe();
      return me?.uuid || null;
    },

    getMyName: async () => {
      const me = await Context._resolveMe();
      return me?.name || null;
    },

    getMyDepartment: async () => {
      if (Context._myDepartment !== null) {
        return Context._myDepartment;
      }

      const myUuid = await Context.getMyUuid();
      if (!myUuid) return '';

      try {
        const result = await queryInternal(`
          query ListOrganizationMemberships {
            listOrganizationMemberships(input: { pageSize: 200, pageToken: "" }) {
              organizationMemberships {
                userUuid
                departmentName { value }
              }
            }
          }
        `, {}, { endpoint: '/graphql' });

        const memberships = result.data?.listOrganizationMemberships?.organizationMemberships || [];
        const me = memberships.find(m => m.userUuid === myUuid);
        Context._myDepartment = me?.departmentName?.value || '';
        console.log(`[Henry Core] Department resolved: ${Context._myDepartment}`);
        return Context._myDepartment;
      } catch (e) {
        console.error('[Henry Core] getMyDepartment エラー:', e.message);
        return '';
      }
    }
  };

  // ==========================================
  // 3. Original Fetch (query()で使用)
  // ==========================================
  const originalFetch = window.fetch;

  // ==========================================
  // 3.1 Internal Functions (内部関数)
  // ==========================================
  // NOTE: HenryCoreオブジェクト定義前に使用するため、先に定義

  // エラーログ機能（コンソール出力のみ）
  const logErrorInternal = ({ script = 'unknown', message, context = {} }) => {
    console.error(`[${script}]`, message, Object.keys(context).length > 0 ? context : '');
  };

  // GraphQL API呼び出し（内部関数）
  // フルクエリ方式でGraphQL APIを呼び出す（エンドポイント自動学習機能付き）
  // options.endpoint: 指定すると学習をスキップしてそのエンドポイントを使用
  // TODO: 将来的にデバッグモードフラグを設け、学習ログ(Learned/Cache cleared)を抑制可能にする
  const queryInternal = async (queryString, variables = {}, options = {}) => {
    const token = await Auth.getToken();
    if (!token) {
      throw new Error('有効なトークンがありません。再ログインしてください。');
    }

    const ENDPOINT_CACHE_KEY = 'henry_endpoint_cache';

    // operationNameを抽出
    const match = queryString.match(/(?:query|mutation)\s+(\w+)/);
    const operationName = match?.[1] || 'unknown';

    // エンドポイントが明示的に指定されている場合はそれを使う
    if (options.endpoint) {
      return await tryQuery(options.endpoint);
    }

    // キャッシュを確認
    let cache = JSON.parse(localStorage.getItem(ENDPOINT_CACHE_KEY) || '{}');
    const cachedEndpoint = cache[operationName];

    // 試すエンドポイントの順序（キャッシュがあっても他のエンドポイントをフォールバックとして追加）
    const allEndpoints = ['/graphql', '/graphql-v2'];
    const endpoints = cachedEndpoint
      ? [cachedEndpoint, ...allEndpoints.filter(e => e !== cachedEndpoint)]
      : allEndpoints;

    let lastError;
    for (const endpoint of endpoints) {
      try {
        const result = await tryQuery(endpoint);
        // 成功したらキャッシュに保存（キャッシュと異なる場合も更新）
        if (operationName !== 'unknown' && cache[operationName] !== endpoint) {
          cache[operationName] = endpoint;
          localStorage.setItem(ENDPOINT_CACHE_KEY, JSON.stringify(cache));
          console.log(`[Henry Core] Learned: ${operationName} → ${endpoint}`);
        }
        return result;
      } catch (e) {
        lastError = e;
        // 400/404エラー、またはGraphQL検証エラーの場合はキャッシュを削除して次のエンドポイントを試す
        // 検証エラー: "Unknown type", "is undefined" などはエンドポイント不一致を示す
        const isRetryable = e.message.includes('400') || e.message.includes('404') ||
                            e.message.includes('Unknown type') || e.message.includes('is undefined');
        if (isRetryable) {
          if (cachedEndpoint === endpoint) {
            delete cache[operationName];
            localStorage.setItem(ENDPOINT_CACHE_KEY, JSON.stringify(cache));
            console.log(`[Henry Core] Cache cleared: ${operationName} (was ${endpoint})`);
          }
          continue;
        }
        // それ以外のエラーは即座にthrow
        logErrorInternal({
          script: 'HenryCore',
          message: e.message,
          context: { operationName, endpoint }
        });
        throw e;
      }
    }
    // 全エンドポイント失敗時
    logErrorInternal({
      script: 'HenryCore',
      message: lastError?.message || 'All endpoints failed',
      context: { operationName, triedEndpoints: endpoints }
    });
    throw lastError;

    // 内部関数：指定エンドポイントでクエリを実行
    async function tryQuery(endpoint) {
      const url = CONFIG.BASE_URL + endpoint;
      const res = await originalFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': CONFIG.ORG_UUID
        },
        body: JSON.stringify({
          operationName,
          query: queryString,
          variables
        })
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const json = await res.json();

      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message || 'GraphQL Error');
      }

      return json;
    }
  };

  // ==========================================
  // 4. Navigation Hook (SPA対応)
  // ==========================================
  if (!window.__henry_nav_hook__) {
    window.__henry_nav_hook__ = true;
    const wrapHistory = (type) => {
      const orig = history[type];
      return function(...args) {
        const res = orig.apply(this, args);
        window.dispatchEvent(new Event('henry:navigation'));
        return res;
      };
    };
    history.pushState = wrapHistory('pushState');
    history.replaceState = wrapHistory('replaceState');
  }

  // ==========================================
  // 5. UI Manager (HenryUI)
  // ==========================================
  const UI = {
    _initialized: false,
    _waitingForBody: false,

    // Design Tokens (Henry本体準拠)
    tokens: {
      // Colors - Primary
      colorPrimary: '#00CC92',
      colorPrimaryHover: '#00b583',
      colorPrimaryLight: 'rgba(0, 204, 146, 0.1)',

      // Colors - Semantic
      colorSuccess: '#00CC92',
      colorError: '#E05231',
      colorErrorHover: '#c9472b',
      colorWarning: '#f59e0b',

      // Colors - Text
      colorText: 'rgba(0, 0, 0, 0.82)',
      colorTextSecondary: 'rgba(0, 0, 0, 0.73)',
      colorTextMuted: 'rgba(0, 0, 0, 0.57)',
      colorTextDisabled: 'rgba(0, 0, 0, 0.38)',
      colorTextInverse: '#ffffff',

      // Colors - Surface
      colorSurface: '#ffffff',
      colorSurfaceAlt: '#F5F7FA',
      colorSurfaceHover: 'rgba(0, 0, 0, 0.04)',
      colorSurfaceCancel: 'rgba(0, 0, 0, 0.06)',

      // Colors - Border
      colorBorder: 'rgba(0, 0, 0, 0.13)',
      colorBorderFocus: '#00CC92',

      // Colors - Overlay
      colorOverlay: 'rgba(0, 0, 0, 0.4)',

      // Typography
      fontFamily: '"Noto Sans JP", system-ui, -apple-system, sans-serif',
      fontSizeSmall: '12px',
      fontSizeBase: '14px',
      fontSizeLarge: '16px',
      fontSizeXLarge: '24px',
      fontWeightNormal: '400',
      fontWeightMedium: '600',

      // Spacing
      spacingXs: '4px',
      spacingSm: '8px',
      spacingMd: '12px',
      spacingLg: '16px',
      spacingXl: '24px',

      // Border Radius
      radiusSmall: '4px',
      radiusMedium: '8px',
      radiusLarge: '12px',
      radiusPill: '18px',
      radiusDialog: '4px',

      // Shadows
      shadowSmall: '0 1px 2px rgba(0, 0, 0, 0.05)',
      shadowMedium: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      shadowLarge: '0 10px 25px rgba(0, 0, 0, 0.15)',
      shadowDialog: 'rgba(0,0,0,0.13) 0px 7px 8px 0px, rgba(0,0,0,0.03) 0px 5px 22px 0px, rgba(0,0,0,0.06) 0px 12px 17px 0px, rgba(0,0,0,0.13) 0px 0px 1px 0px',

      // Z-Index (Henry: ログインモーダル=1600の下)
      zIndexDropdown: 1000,
      zIndexSticky: 1100,
      zIndexFixed: 1200,
      zIndexModalBackdrop: 1400,
      zIndexModal: 1500,

      // Transitions
      transitionFast: '0.15s ease',
      transitionBase: '0.2s ease',
    },

    // TODO: CSS変数名とトークン名の命名規則を統一することを検討
    // 現状: --henry-text-high vs colorText のような不一致がある
    // 統一する場合は既存スクリプトへの影響を考慮し、破壊的変更として計画的に行う

    // トークンからCSS変数へのマッピング（Single Source of Truth）
    _cssVarMapping: {
      colorPrimary: '--henry-primary',
      colorPrimaryHover: '--henry-primary-hover',
      colorText: '--henry-text-high',
      colorTextSecondary: '--henry-text-secondary',
      colorTextMuted: '--henry-text-med',
      colorTextDisabled: '--henry-text-disabled',
      colorSurface: '--henry-bg-base',
      colorSurfaceAlt: '--henry-bg-sub',
      colorSurfaceHover: '--henry-bg-hover',
      colorBorder: '--henry-border',
      colorBorderFocus: '--henry-border-focus',
      colorPrimaryLight: '--henry-primary-light',
      colorOverlay: '--henry-overlay',
      shadowMedium: '--henry-shadow-card',
      shadowDialog: '--henry-shadow-dialog',
      radiusSmall: '--henry-radius',
      radiusDialog: '--henry-radius-dialog',
      fontSizeXLarge: '--henry-font-size-xlarge',
      fontWeightMedium: '--henry-font-weight-medium',
    },

    init: () => {
      if (UI._initialized) return;
      UI._initialized = true;

      if (document.getElementById('henry-core-styles')) return;

      // トークンからCSS変数を動的生成
      const cssVars = Object.entries(UI._cssVarMapping)
        .map(([tokenKey, cssVar]) => `${cssVar}: ${UI.tokens[tokenKey]};`)
        .join('\n          ');

      const style = document.createElement('style');
      style.id = 'henry-core-styles';
      style.textContent = `
        :root {
          ${cssVars}
        }
        .henry-btn {
          font-family: "Noto Sans JP", sans-serif;
          border: none;
          border-radius: var(--henry-radius);
          padding: 0 16px;
          height: 36px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: background-color 0.2s;
        }
        .henry-btn-primary {
          background-color: var(--henry-primary);
          color: #FFFFFF;
        }
        .henry-btn-primary:hover {
          background-color: var(--henry-primary-hover);
        }
        .henry-btn-secondary {
          background-color: transparent;
          color: var(--henry-text-med);
          border: 1px solid var(--henry-border);
        }
        .henry-btn-secondary:hover {
          background-color: var(--henry-bg-hover);
        }
        .henry-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--henry-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
        }
        .henry-modal-content {
          background: var(--henry-bg-base);
          border-radius: var(--henry-radius-dialog);
          padding: 24px;
          box-shadow: var(--henry-shadow-dialog);
          min-width: 400px;
          max-width: 90vw;
        }
        .henry-modal-title {
          font-size: var(--henry-font-size-xlarge);
          font-weight: var(--henry-font-weight-medium);
          color: var(--henry-text-high);
          margin-bottom: 16px;
        }
        .henry-input,
        .henry-textarea {
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          color: var(--henry-text-high);
          padding: 8px 12px;
          border: 1px solid var(--henry-border);
          border-radius: var(--henry-radius);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
          box-sizing: border-box;
          background: var(--henry-bg-base);
        }
        .henry-input:focus,
        .henry-textarea:focus {
          border-color: var(--henry-border-focus);
          box-shadow: 0 0 0 2px var(--henry-primary-light);
        }
        .henry-textarea {
          resize: vertical;
          line-height: 1.5;
        }
        .henry-select-wrapper {
          display: inline-block;
          position: relative;
          background: rgba(0, 0, 0, 0.03);
          border-radius: var(--henry-radius);
        }
        .henry-select {
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          color: var(--henry-text-high);
          padding: 6px 36px 6px 12px;
          border: none;
          background: transparent;
          appearance: none;
          cursor: pointer;
          outline: none;
        }
        .henry-select-wrapper::after {
          content: 'arrow_drop_down';
          font-family: 'Material Icons';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--henry-text-med);
        }
        .henry-checkbox-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          color: var(--henry-text-high);
        }
        .henry-checkbox {
          width: 13px;
          height: 13px;
          cursor: pointer;
        }
        .henry-radio-group {
          display: flex;
          gap: 16px;
        }
        .henry-radio-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          color: var(--henry-text-high);
        }
        .henry-radio {
          width: 13px;
          height: 13px;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);

      if (!document.querySelector('link[href*="Noto+Sans+JP"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap';
        document.head.appendChild(link);
      }

      if (!document.querySelector('link[href*="Material+Icons"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
        document.head.appendChild(link);
      }
    },

    createButton: ({ label, variant = 'primary', icon, onClick }) => {
      const btn = document.createElement('button');
      btn.className = `henry-btn henry-btn-${variant}`;

      if (icon) {
        const i = document.createElement('i');
        i.className = 'material-icons';
        i.style.fontSize = '18px';
        i.textContent = icon;
        btn.appendChild(i);
      }

      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);

      if (onClick) btn.addEventListener('click', onClick);

      return btn;
    },

    /**
     * 入力フィールドを作成
     * @param {Object} [options={}] - オプション（省略可、引数なしで呼び出し可能）
     * @param {string} [options.placeholder=''] - プレースホルダー
     * @param {string} [options.type='text'] - input type
     * @param {string} [options.value=''] - 初期値
     */
    createInput: ({ placeholder = '', type = 'text', value = '' } = {}) => {
      UI.init();
      const input = document.createElement('input');
      input.type = type;
      input.placeholder = placeholder;
      input.value = value;
      input.className = 'henry-input';
      return input;
    },

    /**
     * テキストエリアを作成
     * @param {Object} [options={}] - オプション（省略可、引数なしで呼び出し可能）
     * @param {string} [options.placeholder=''] - プレースホルダー
     * @param {string} [options.value=''] - 初期値
     * @param {number} [options.rows=4] - 行数
     */
    createTextarea: ({ placeholder = '', value = '', rows = 4 } = {}) => {
      UI.init();
      const textarea = document.createElement('textarea');
      textarea.placeholder = placeholder;
      textarea.value = value;
      textarea.rows = rows;
      textarea.className = 'henry-textarea';
      return textarea;
    },

    /**
     * セレクトボックスを作成
     * @param {Object} [options={}] - オプション
     * @param {Array<{value: string, label: string}>} [options.options=[]] - 選択肢
     * @param {string} [options.value=''] - 初期値
     * @param {Function} [options.onChange] - 変更時コールバック
     * @returns {{wrapper: HTMLElement, select: HTMLSelectElement}}
     */
    createSelect: ({ options = [], value = '', onChange } = {}) => {
      UI.init();
      const wrapper = document.createElement('div');
      wrapper.className = 'henry-select-wrapper';

      const select = document.createElement('select');
      select.className = 'henry-select';

      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      });

      if (value) select.value = value;
      if (onChange) select.addEventListener('change', onChange);

      wrapper.appendChild(select);
      return { wrapper, select };
    },

    /**
     * チェックボックスを作成
     * @param {Object} [options={}] - オプション
     * @param {string} [options.label=''] - ラベルテキスト
     * @param {boolean} [options.checked=false] - 初期チェック状態
     * @param {Function} [options.onChange] - 変更時コールバック
     * @returns {{wrapper: HTMLElement, checkbox: HTMLInputElement}}
     */
    createCheckbox: ({ label = '', checked = false, onChange } = {}) => {
      UI.init();
      const wrapper = document.createElement('label');
      wrapper.className = 'henry-checkbox-wrapper';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'henry-checkbox';
      checkbox.checked = checked;
      if (onChange) checkbox.addEventListener('change', onChange);

      const span = document.createElement('span');
      span.textContent = label;

      wrapper.appendChild(checkbox);
      wrapper.appendChild(span);
      return { wrapper, checkbox };
    },

    /**
     * ラジオボタングループを作成
     * @param {Object} options - オプション
     * @param {Array<{value: string, label: string}>} options.options - 選択肢
     * @param {string} [options.name] - グループ名（省略時は自動生成）
     * @param {string} [options.value=''] - 初期選択値
     * @param {Function} [options.onChange] - 変更時コールバック
     * @returns {{wrapper: HTMLElement, radios: HTMLInputElement[], getValue: () => string}}
     */
    createRadioGroup: ({ options = [], name, value = '', onChange } = {}) => {
      UI.init();
      const groupName = name || `henry-radio-${Date.now()}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'henry-radio-group';

      const radios = [];

      options.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'henry-radio-wrapper';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.className = 'henry-radio';
        radio.name = groupName;
        radio.value = opt.value;
        if (opt.value === value) radio.checked = true;
        if (onChange) radio.addEventListener('change', onChange);

        const span = document.createElement('span');
        span.textContent = opt.label;

        label.appendChild(radio);
        label.appendChild(span);
        wrapper.appendChild(label);
        radios.push(radio);
      });

      const getValue = () => radios.find(r => r.checked)?.value || '';

      return { wrapper, radios, getValue };
    },

    showModal: ({ title, content, actions = [], width, closeOnOverlayClick = true }) => {
      UI.init();

      if (!document.body) {
        if (!UI._waitingForBody) {
          UI._waitingForBody = true;
          window.addEventListener('DOMContentLoaded', () => {
            UI._waitingForBody = false;
            UI.showModal({ title, content, actions, width, closeOnOverlayClick });
          });
        }
        return { close: () => {} };
      }

      const overlay = document.createElement('div');
      overlay.className = 'henry-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'henry-modal-content';
      if (width) {
        modal.style.width = width;
      }

      const h2 = document.createElement('div');
      h2.className = 'henry-modal-title';
      h2.textContent = title;
      modal.appendChild(h2);

      const body = document.createElement('div');
      body.style.marginBottom = '24px';
      body.style.color = 'var(--henry-text-med)';
      if (typeof content === 'string') {
        body.textContent = content;
      } else {
        body.appendChild(content);
      }
      modal.appendChild(body);

      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      footer.style.gap = '8px';

      const close = () => {
        if (overlay.parentNode) document.body.removeChild(overlay);
      };

      if (actions.length === 0) {
        actions.push({ label: '閉じる', variant: 'secondary' });
      }

      actions.forEach(action => {
        const btn = UI.createButton({
          label: action.label,
          variant: action.variant || 'primary',
          onClick: (e) => {
            if (action.onClick) action.onClick(e, btn);
            // autoClose: false の場合は自動で閉じない
            if (action.autoClose !== false) close();
          }
        });
        footer.appendChild(btn);
      });

      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // closeOnOverlayClick: false の場合はオーバーレイクリックで閉じない
      if (closeOnOverlayClick) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });
      }

      return { close };
    },

    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     * @param {'success'|'error'|'warning'|'info'} type - タイプ
     * @param {number} duration - 表示時間(ms)
     */
    showToast: (message, type = 'info', duration = 3000) => {
      const colors = {
        success: UI.tokens.colorSuccess,
        error: UI.tokens.colorError,
        warning: UI.tokens.colorWarning,
        info: UI.tokens.colorPrimary,
      };

      const toast = document.createElement('div');
      toast.textContent = message;

      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: colors[type] || colors.info,
        color: UI.tokens.colorTextInverse,
        padding: `${UI.tokens.spacingMd} ${UI.tokens.spacingLg}`,
        borderRadius: UI.tokens.radiusPill,
        fontFamily: UI.tokens.fontFamily,
        fontSize: UI.tokens.fontSizeBase,
        fontWeight: UI.tokens.fontWeightMedium,
        boxShadow: UI.tokens.shadowLarge,
        zIndex: UI.tokens.zIndexModal,
        opacity: '0',
        transform: 'translateY(20px)',
        transition: UI.tokens.transitionBase,
      });

      document.body.appendChild(toast);

      // Animate in
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      // Animate out
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 200);
      }, duration);
    },

    /**
     * 処理中インジケーターを表示
     * @param {string} message - メッセージ
     * @returns {{ close: Function }} - 閉じる関数を含むオブジェクト
     */
    showSpinner: (message = '処理中...') => {
      // スピナーアニメーションを追加
      if (!document.getElementById('henry-spinner-keyframes')) {
        const style = document.createElement('style');
        style.id = 'henry-spinner-keyframes';
        style.textContent = '@keyframes henry-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: UI.tokens.colorOverlay,
        zIndex: UI.tokens.zIndexModal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });

      const container = document.createElement('div');
      Object.assign(container.style, {
        background: UI.tokens.colorSurface,
        padding: UI.tokens.spacingXl,
        borderRadius: UI.tokens.radiusMedium,
        boxShadow: UI.tokens.shadowMedium,
        textAlign: 'center',
      });

      const spinner = document.createElement('div');
      Object.assign(spinner.style, {
        width: '40px',
        height: '40px',
        border: `3px solid ${UI.tokens.colorBorder}`,
        borderTop: `3px solid ${UI.tokens.colorPrimary}`,
        borderRadius: '50%',
        margin: '0 auto 16px',
        animation: 'henry-spin 1s linear infinite',
      });

      const text = document.createElement('div');
      text.textContent = message;
      Object.assign(text.style, {
        fontFamily: UI.tokens.fontFamily,
        fontSize: UI.tokens.fontSizeBase,
        color: UI.tokens.colorText,
      });

      container.appendChild(spinner);
      container.appendChild(text);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      return {
        close: () => overlay.remove(),
      };
    }
  };

  // ==========================================
  // 6. Utilities
  // ==========================================
  const Utils = {
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),

    waitForGlobal: (key, timeout = 10000) => {
      return new Promise((resolve) => {
        if (pageWindow[key]) return resolve(pageWindow[key]);

        const intervalTime = 100;
        let waited = 0;

        const timer = setInterval(() => {
          if (pageWindow[key]) {
            clearInterval(timer);
            resolve(pageWindow[key]);
          } else {
            waited += intervalTime;
            if (waited >= timeout) {
              clearInterval(timer);
              resolve(null);
            }
          }
        }, intervalTime);
      });
    },

    waitForToolbox: async (timeout = 5000) => {
      const toolbox = await Utils.waitForGlobal('HenryToolbox', timeout);
      if (!toolbox) return null;

      const start = Date.now();
      while (typeof toolbox.register !== 'function') {
        if (Date.now() - start > timeout) {
          console.error('[Henry Core] HenryToolbox.register が見つかりません');
          return null;
        }
        await new Promise(r => setTimeout(r, 50));
      }

      return toolbox;
    },

    waitForElement: (selector, timeout = 5000) => {
      return new Promise(resolve => {
        const found = document.querySelector(selector);
        if (found) return resolve(found);

        const root = document.body || document.documentElement;

        const observer = new MutationObserver(() => {
          const el = document.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });

        observer.observe(root, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },

    createLogger: (scriptName) => ({
      info: (msg) => console.log(`[${scriptName}] ${msg}`),
      warn: (msg) => console.warn(`[${scriptName}] ${msg}`),
      error: (msg, err) => console.error(`[${scriptName}] ${msg}`, err?.message ?? '')
    }),

    createCleaner: () => {
      const tasks = [];
      return {
        add: (fn) => tasks.push(fn),
        exec: () => {
          while (tasks.length) {
            try { tasks.pop()(); } catch (_) {}
          }
        }
      };
    },

    subscribeNavigation: (cleaner, initFn) => {
      const handler = () => {
        cleaner.exec();
        initFn();
      };
      window.addEventListener('henry:navigation', handler);
      window.addEventListener('popstate', handler);
      initFn();
    },

    withLock: async (lockMap, key, promiseGenerator) => {
      if (lockMap.has(key)) return lockMap.get(key);

      const promise = promiseGenerator().finally(() => lockMap.delete(key));
      lockMap.set(key, promise);
      return promise;
    }
  };

  // ==========================================
  // 7. GoogleAuth Module (Google OAuth認証)
  // ==========================================
  const GoogleAuth = {
    // 設定チェック
    isConfigured() {
      return CONFIG.GOOGLE_CLIENT_ID && CONFIG.GOOGLE_CLIENT_SECRET;
    },

    // トークン取得
    getTokens() {
      return GM_getValue(CONFIG.GOOGLE_TOKENS_KEY, null);
    },

    // トークン保存
    saveTokens(tokens) {
      const data = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || this.getTokens()?.refresh_token,
        expires_at: Date.now() + (tokens.expires_in * 1000) - 60000
      };
      GM_setValue(CONFIG.GOOGLE_TOKENS_KEY, data);
      console.log('[Henry Core] GoogleAuth: トークン保存完了');
      return data;
    },

    // トークン削除
    clearTokens() {
      GM_deleteValue(CONFIG.GOOGLE_TOKENS_KEY);
      console.log('[Henry Core] GoogleAuth: トークン削除完了');
    },

    // 認証済みかどうか
    isAuthenticated() {
      const tokens = this.getTokens();
      return tokens && tokens.refresh_token;
    },

    // アクセストークンが有効かどうか
    isAccessTokenValid() {
      const tokens = this.getTokens();
      return tokens && tokens.access_token && Date.now() < tokens.expires_at;
    },

    // 有効なアクセストークンを取得（必要に応じてリフレッシュ）
    async getValidAccessToken() {
      if (!this.isAuthenticated()) {
        throw new Error('未認証です。Google認証を行ってください。');
      }

      if (this.isAccessTokenValid()) {
        return this.getTokens().access_token;
      }

      console.log('[Henry Core] GoogleAuth: アクセストークンをリフレッシュ中...');
      return await this.refreshAccessToken();
    },

    // アクセストークンをリフレッシュ
    async refreshAccessToken() {
      const tokens = this.getTokens();
      if (!tokens?.refresh_token) {
        throw new Error('リフレッシュトークンがありません');
      }

      if (!this.isConfigured()) {
        throw new Error('Google認証の設定が未完了です。CLIENT_IDとCLIENT_SECRETを設定してください。');
      }

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.GOOGLE_TOKEN_ENDPOINT,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: new URLSearchParams({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            client_secret: CONFIG.GOOGLE_CLIENT_SECRET,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token'
          }).toString(),
          onload: (response) => {
            if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              const saved = this.saveTokens(data);
              console.log('[Henry Core] GoogleAuth: トークンリフレッシュ成功');
              resolve(saved.access_token);
            } else {
              console.error('[Henry Core] GoogleAuth: リフレッシュ失敗:', response.responseText);
              if (response.status === 400 || response.status === 401) {
                this.clearTokens();
              }
              reject(new Error('トークンリフレッシュに失敗しました'));
            }
          },
          onerror: (err) => {
            console.error('[Henry Core] GoogleAuth: リフレッシュエラー:', err);
            reject(new Error('トークンリフレッシュ通信エラー'));
          }
        });
      });
    },

    // 認証URLを生成
    getAuthUrl() {
      const params = new URLSearchParams({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        redirect_uri: CONFIG.GOOGLE_REDIRECT_URI,
        scope: CONFIG.GOOGLE_SCOPES,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent'
      });
      return `${CONFIG.GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
    },

    // 認証コードをトークンに交換
    async exchangeCodeForTokens(code) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.GOOGLE_TOKEN_ENDPOINT,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: new URLSearchParams({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            client_secret: CONFIG.GOOGLE_CLIENT_SECRET,
            code: code,
            redirect_uri: CONFIG.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
          }).toString(),
          onload: (response) => {
            if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              const saved = this.saveTokens(data);
              console.log('[Henry Core] GoogleAuth: 認証コード交換成功');
              resolve(saved);
            } else {
              console.error('[Henry Core] GoogleAuth: コード交換失敗:', response.responseText);
              reject(new Error('認証に失敗しました'));
            }
          },
          onerror: (err) => {
            console.error('[Henry Core] GoogleAuth: コード交換エラー:', err);
            reject(new Error('認証通信エラー'));
          }
        });
      });
    },

    // 認証開始
    startAuth() {
      if (!this.isConfigured()) {
        this.showConfigDialog();
        return;
      }
      const authUrl = this.getAuthUrl();
      console.log('[Henry Core] GoogleAuth: 認証開始:', authUrl);
      GM_openInTab(authUrl, { active: true });
    },

    // 認証情報を保存
    saveCredentials(clientId, clientSecret) {
      GM_setValue(CONFIG.GOOGLE_CREDENTIALS_KEY, {
        clientId: clientId,
        clientSecret: clientSecret
      });
      // CONFIGも更新（現在のセッション用）
      CONFIG.GOOGLE_CLIENT_ID = clientId;
      CONFIG.GOOGLE_CLIENT_SECRET = clientSecret;
      console.log('[Henry Core] GoogleAuth: 認証情報を保存しました');
    },

    // 認証情報を削除
    clearCredentials() {
      GM_deleteValue(CONFIG.GOOGLE_CREDENTIALS_KEY);
      CONFIG.GOOGLE_CLIENT_ID = '';
      CONFIG.GOOGLE_CLIENT_SECRET = '';
      console.log('[Henry Core] GoogleAuth: 認証情報を削除しました');
    },

    // 設定ダイアログを表示
    showConfigDialog() {
      const currentId = CONFIG.GOOGLE_CLIENT_ID || '';
      const currentSecret = CONFIG.GOOGLE_CLIENT_SECRET || '';

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1500;display:flex;align-items:center;justify-content:center;';

      const dialog = document.createElement('div');
      dialog.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:540px;max-width:90vw;font-family:-apple-system,sans-serif;';

      dialog.innerHTML = `
        <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;">Google OAuth 設定</h3>
        <p style="margin:0 0 16px 0;font-size:13px;color:#666;">
          OAuthクライアントの情報を入力してください。<br>
          この設定はブラウザに保存され、スクリプト更新後も保持されます。
        </p>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Client ID</label>
          <input type="text" id="hc-google-client-id" value="${currentId}"
            style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;">Client Secret</label>
          <input type="password" id="hc-google-client-secret" value="${currentSecret}"
            style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="hc-config-cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;">キャンセル</button>
          <button id="hc-config-save" style="padding:8px 16px;border:none;border-radius:6px;background:#1a73e8;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">保存</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const idInput = dialog.querySelector('#hc-google-client-id');
      const secretInput = dialog.querySelector('#hc-google-client-secret');
      const cancelBtn = dialog.querySelector('#hc-config-cancel');
      const saveBtn = dialog.querySelector('#hc-config-save');

      cancelBtn.onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      saveBtn.onclick = () => {
        const newId = idInput.value.trim();
        const newSecret = secretInput.value.trim();
        if (!newId || !newSecret) {
          alert('Client ID と Client Secret を入力してください。');
          return;
        }
        this.saveCredentials(newId, newSecret);
        overlay.remove();
        alert('設定を保存しました。Google認証を開始します。');
        this.startAuth();
      };

      idInput.focus();
    }
  };

  // ==========================================
  // 8. Plugin Registry
  // ==========================================
  const pluginRegistry = [];

  // ==========================================
  // 9. Public API
  // ==========================================
  pageWindow.HenryCore = {
    // モジュール（GoogleAuth等）
    modules: {
      GoogleAuth: GoogleAuth
    },

    plugins: pluginRegistry,

    // GraphQL API呼び出し（内部関数queryInternalを公開）
    query: queryInternal,

    getMyUuid: Context.getMyUuid,
    getMyName: Context.getMyName,
    getMyDepartment: Context.getMyDepartment,

    registerPlugin: async (options) => {
      // プラグインをレジストリに追加
      const plugin = {
        id: options.id,
        name: options.name,
        icon: options.icon || '',
        description: options.description || '',
        version: options.version || '1.0.0',
        order: options.order || 100,
        onClick: options.onClick,
        group: options.group || null,
        groupIcon: options.groupIcon || null
      };

      // 重複チェック
      const exists = pluginRegistry.find(p => p.id === plugin.id);
      if (exists) {
        console.warn(`[Henry Core] Plugin "${plugin.id}" is already registered`);
        return false;
      }

      pluginRegistry.push(plugin);
      console.log(`[Henry Core] Plugin registered: ${plugin.name} (${plugin.id})`);

      // イベント発火（Toolbox が受け取る）
      pageWindow.dispatchEvent(new CustomEvent('henrycore:plugin-registered', {
        detail: plugin
      }));

      // 後方互換性: Toolbox がある場合は直接登録も行う
      const toolbox = await Utils.waitForToolbox(1000);
      if (toolbox && typeof toolbox.register === 'function') {
        toolbox.register({
          event: `henrycore:plugin:${plugin.id}`,
          label: plugin.name,
          order: plugin.order,
          onClick: plugin.onClick,  // Toolbox v5.1.0 対応
          group: plugin.group,      // Toolbox v5.6.0 グループ化対応
          groupIcon: plugin.groupIcon
        });
      }

      return true;
    },

    getPatientUuid: Context.getPatientUuid,
    getToken: Auth.getToken,
    tokenStatus: Auth.tokenStatus,

    utils: Utils,
    ui: UI
  };

  // ==========================================
  // 10. 初期化
  // ==========================================

  // 認証コールバック処理（Henryドメインのみ）
  function checkForAuthCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      console.log('[Henry Core] GoogleAuth: 認証コードを検出');

      // URLからcodeパラメータを削除
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // トークン交換
      GoogleAuth.exchangeCodeForTokens(code)
        .then(() => {
          showToast('Google認証が完了しました');
        })
        .catch((err) => {
          showToast('認証に失敗しました: ' + err.message, true);
        });
    }
  }

  // トースト通知（簡易版）
  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${isError ? '#dc3545' : '#28a745'};
      color: white;
      border-radius: 8px;
      z-index: 1500;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ドメイン別初期化
  if (isHenry) {
    // Henryドメイン：フル機能
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        UI.init();
        checkForAuthCode();
      });
    } else {
      UI.init();
      checkForAuthCode();
    }

    // クロスタブ通信: Google Docs側からのOAuthトークンリクエストを監視
    GM_addValueChangeListener('drive_direct_oauth_request', (name, oldVal, newVal, remote) => {
      if (!remote || !newVal?.requestId) return;

      const tokens = GoogleAuth.getTokens();
      const credentials = {
        clientId: CONFIG.GOOGLE_CLIENT_ID,
        clientSecret: CONFIG.GOOGLE_CLIENT_SECRET
      };

      // トークンと認証情報を返信
      GM_setValue('drive_direct_oauth_response', {
        requestId: newVal.requestId,
        tokens: tokens,
        credentials: GoogleAuth.isConfigured() ? credentials : null
      });

      console.log('[Henry Core] クロスタブ: OAuthトークンリクエストに応答');
    });

    console.log(`[Henry Core] Ready v${VERSION} (Henry mode)`);

  } else if (isGoogleDocs) {
    // Google Docsドメイン：GoogleAuthのみ
    console.log(`[Henry Core] Ready v${VERSION} (Google Docs mode - GoogleAuth only)`);
  }
})();
