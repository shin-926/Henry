// ==UserScript==
// @name         Henry Core
// @namespace    https://henry-app.jp/
// @version      2.39.1
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
// @connect      sheets.googleapis.com
// @connect      www.googleapis.com
// @connect      securetoken.googleapis.com
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
 * Henry Core API 目次 (v2.38.0)
 * ============================================
 *
 * ■ Config (config.*)
 *   orgUuid                                      - 組織UUID（マオカ病院）
 *   hospital.name                                - 病院名
 *   hospital.postalCode                          - 郵便番号
 *   hospital.address                             - 住所
 *   hospital.phone                               - 電話番号
 *   hospital.fax                                 - FAX番号
 *
 * ■ Global Function
 *   waitForHenryCore(timeout?)                   - HenryCore読み込み待機（window.waitForHenryCore）
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
 *   createFormLabel({ text, required? })                - フォームラベル（必須バッジ対応）
 *   createDivider({ spacing? })                         - 区切り線（'normal' | 'large'）
 *   createTag({ text })                                 - タグ/バッジ（ピル型）
 *   createBadge({ text, variant? })                     - ステータスバッジ（'default' | 'active'）
 *   createIconText({ icon, text })                      - アイコン付きテキスト（Material Icons）
 *   createTooltip({ target, text, position? })          - ツールチップ → { show, hide, destroy }
 *   createFormField({ label, input, required?, inline? }) - フォームフィールド（ラベル+入力）
 *   createListGroup({ items, groupBy, renderItem, ... }) - グループ化リスト → { wrapper, refresh }
 *   createTable({ columns, data, renderCell?, onRowClick? }) - テーブル → { table, refresh }
 *   createCard({ title, description?, checkbox?, content, selected? }) - カード → { card, setSelected, checkbox? }
 *   createAccordion({ items, allowMultiple? }) - アコーディオン → { wrapper, toggle, expand, collapse, updateBadge }
 *   showModal({ title, content, actions?, width?, closeOnOverlayClick?, showCloseButton?, onBeforeClose?, closeOnEsc?, variant?, headerColor?, footerLeft?, className? })
 *   showConfirm({ title, message, confirmLabel?, cancelLabel? }) - 確認ダイアログ → Promise<boolean>
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
 * ■ DraftStorage (modules.DraftStorage.*)
 *   load(type, patientUuid, options?)            - 下書き読み込み（localStorageマイグレーション付き）
 *   save(type, patientUuid, formData, patientName?) - 下書き保存
 *   delete(type, patientUuid)                    - 下書き削除
 *   preload(type)                                - プリロード（フォーム表示高速化用）
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

  // グローバル関数: 他のスクリプトがHenryCoreの読み込みを待つために使用
  // @require で同期実行されるため、動的ロードされる各スクリプトより先に登録される
  pageWindow.waitForHenryCore = async function(timeout = 10000) {
    const start = Date.now();
    while (!pageWindow.HenryCore?.query) {
      if (Date.now() - start > timeout) {
        throw new Error('waitForHenryCore: HenryCore not found after ' + timeout + 'ms');
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return pageWindow.HenryCore;
  };

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

  // 複数の同時呼び出しがリフレッシュAPIを重複して叩かないようPromiseをキャッシュ
  let _refreshPromise = null;

  const Auth = {
    // NOTE: Henry本体のFirebase Auth実装に依存（IndexedDB 'firebaseLocalStorageDb' の構造）
    // NOTE: db.close() は意図的に省略。スコープ外でGC回収されるため、
    //       全パスに finalize を通す複雑さに見合わない。変更前から同様。
    getToken: () => new Promise((resolve) => {
      // リフレッシュ処理中なら、その結果に相乗りする
      if (_refreshPromise) return _refreshPromise.then(resolve);

      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onerror = () => resolve(null);
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);

        const tx = db.transaction('firebaseLocalStorage', 'readonly');
        const reqAll = tx.objectStore('firebaseLocalStorage').getAll();
        reqAll.onsuccess = async () => {
          const now = Date.now();
          const records = reqAll.result;

          // 高速パス: 有効期限内のトークンがあればそのまま返す
          const valid = records
            .map(r => r.value?.stsTokenManager)
            .filter(t => t && t.accessToken && t.expirationTime > now)
            .sort((a, b) => b.expirationTime - a.expirationTime)[0];
          if (valid?.accessToken) return resolve(valid.accessToken);

          // 非同期の間に他の呼び出しがリフレッシュを開始していないか再チェック
          if (_refreshPromise) return _refreshPromise.then(resolve);

          // トークン期限切れ → リフレッシュ試行
          const record = records.find(r => r.value?.stsTokenManager?.refreshToken);
          if (!record) return resolve(null);

          const { refreshToken } = record.value.stsTokenManager;
          const apiKey = record.value.apiKey;
          if (!refreshToken || !apiKey) return resolve(null);

          _refreshPromise = (async () => {
            try {
              const resp = await fetch(
                `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
                }
              );
              if (!resp.ok) {
                console.error('[Henry Core] Token refresh failed:', resp.status);
                return null;
              }
              const data = await resp.json();

              // IndexedDB を readwrite で開いてトークンを更新
              await new Promise((resolveWrite) => {
                const writeReq = indexedDB.open('firebaseLocalStorageDb');
                writeReq.onerror = () => resolveWrite();
                writeReq.onsuccess = (ev) => {
                  try {
                    const writeDb = ev.target.result;
                    const writeTx = writeDb.transaction('firebaseLocalStorage', 'readwrite');
                    const store = writeTx.objectStore('firebaseLocalStorage');
                    const getReq = store.get(record.key);
                    getReq.onsuccess = () => {
                      const entry = getReq.result;
                      if (entry?.value?.stsTokenManager) {
                        entry.value.stsTokenManager.accessToken = data.id_token;
                        entry.value.stsTokenManager.refreshToken = data.refresh_token;
                        entry.value.stsTokenManager.expirationTime = Date.now() + parseInt(data.expires_in) * 1000;
                        store.put(entry);
                      }
                      resolveWrite();
                    };
                    getReq.onerror = () => resolveWrite();
                  } catch {
                    resolveWrite();
                  }
                };
              });

              console.log('[Henry Core] Token refreshed successfully');
              return data.id_token;
            } catch (err) {
              console.error('[Henry Core] Token refresh error:', err);
              return null;
            } finally {
              _refreshPromise = null;
            }
          })();

          resolve(await _refreshPromise);
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
        /* variant: 'form' 用スタイル */
        .henry-modal-form {
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          min-width: auto;
        }
        .henry-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-radius: 12px 12px 0 0;
          flex-shrink: 0;
        }
        .henry-modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
        .henry-modal-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .henry-modal-close:hover {
          background: rgba(255,255,255,0.35);
        }
        .henry-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .henry-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid var(--henry-border);
          flex-shrink: 0;
          gap: 8px;
        }
        .henry-modal-footer-left {
          font-size: 12px;
          color: var(--henry-text-med);
          flex-shrink: 1;
          min-width: 0;
        }
        .henry-modal-footer-right {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
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
          width: 100%;
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
        .henry-form-label-wrapper {
          display: flex;
          flex-direction: row;
          gap: 4px 8px;
        }
        .henry-form-label {
          font-family: "Noto Sans JP", sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--henry-text-med);
        }
        .henry-form-label-required {
          font-family: "Noto Sans JP", sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(0, 0, 0, 0.57);
        }
        .henry-divider {
          border: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.13);
          margin: 16px 0;
        }
        .henry-divider-lg {
          margin: 32px 0 24px;
        }
        .henry-tag {
          display: inline-block;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(0, 0, 0, 0.24);
          background-color: rgba(0, 0, 0, 0.03);
          padding: 4px 8px;
          border-radius: 10px;
        }
        .henry-badge {
          display: inline-block;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          background-color: rgba(0, 0, 0, 0.05);
          color: rgba(0, 0, 0, 0.32);
        }
        .henry-badge-active {
          color: rgb(0, 92, 86);
        }
        .henry-icon-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.57);
        }
        .henry-icon-text .material-icons {
          font-size: 18px;
        }
        .henry-tooltip {
          position: absolute;
          background-color: rgba(0, 0, 0, 0.73);
          color: #fff;
          padding: 4px 8px;
          border-radius: 2px;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 12px;
          z-index: 1400;
          pointer-events: none;
          white-space: nowrap;
        }
        .henry-form-field {
          margin-bottom: 12px;
        }
        .henry-form-field-inline {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .henry-form-field-inline .henry-form-label-wrapper {
          display: inline-block;
          flex-shrink: 0;
          margin-bottom: 0;
          width: 70px;
        }
        .henry-form-field-label {
          display: block;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.57);
          margin-bottom: 4px;
        }
        .henry-list-group {
          font-family: "Noto Sans JP", sans-serif;
        }
        .henry-list-group-header {
          padding: 8px 20px;
          background: #f5f5f5;
          font-size: 13px;
          color: #333;
          font-weight: 500;
        }
        .henry-list-group-item {
          padding: 12px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.15s;
        }
        .henry-list-group-item:hover {
          background: #f8f9fa;
        }
        .henry-list-group-empty {
          padding: 20px;
          text-align: center;
          color: #666;
        }
        .henry-table {
          width: 100%;
          border-collapse: collapse;
          font-family: "Noto Sans JP", sans-serif;
          font-size: 13px;
        }
        .henry-table thead {
          position: sticky;
          top: 0;
          background: #f5f5f5;
        }
        .henry-table th {
          padding: 8px;
          text-align: left;
          border-bottom: 2px solid #ccc;
          white-space: nowrap;
          font-weight: 600;
        }
        .henry-table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        .henry-table tbody tr {
          transition: background 0.15s;
        }
        .henry-table tbody tr:hover {
          background: #f8f9fa;
        }
        .henry-table-clickable tbody tr {
          cursor: pointer;
        }
        .henry-card {
          border: 1px solid var(--henry-border);
          border-radius: 8px;
          background: var(--henry-bg-base);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .henry-card-selected {
          border-color: var(--henry-primary);
          box-shadow: 0 0 0 1px var(--henry-primary);
        }
        .henry-card-header {
          padding: 12px 16px;
          background: var(--henry-bg-sub);
          border-bottom: 1px solid var(--henry-border);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .henry-card-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--henry-text-high);
        }
        .henry-card-description {
          font-weight: 400;
          color: var(--henry-text-med);
        }
        .henry-card-content {
          padding: 12px 16px;
          flex: 1;
          overflow-y: auto;
          transition: opacity 0.2s;
        }
        .henry-card-content-disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .henry-accordion {
          font-family: "Noto Sans JP", sans-serif;
        }
        .henry-accordion-item {
          border: 1px solid var(--henry-border);
          border-radius: 6px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        .henry-accordion-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #e5e7eb;
          cursor: pointer;
          user-select: none;
        }
        .henry-accordion-header:hover {
          background: #d1d5db;
        }
        .henry-accordion-arrow {
          font-size: 12px;
          color: #4b5563;
          transition: transform 0.2s;
        }
        .henry-accordion-arrow-expanded {
          transform: rotate(90deg);
        }
        .henry-accordion-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--henry-text-high);
          flex: 1;
        }
        .henry-accordion-badge {
          font-size: 12px;
          color: var(--henry-text-med);
          font-weight: 500;
        }
        .henry-accordion-badge-active {
          color: #2563eb;
        }
        .henry-accordion-content {
          display: none;
          background: var(--henry-bg-base);
          border-top: 1px solid var(--henry-border);
        }
        .henry-accordion-content-expanded {
          display: block;
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

    /**
     * フォームラベルを作成
     * @param {Object} options - オプション
     * @param {string} options.text - ラベルテキスト
     * @param {boolean} [options.required=false] - 必須マークを表示するか
     * @returns {HTMLElement}
     */
    createFormLabel: ({ text, required = false } = {}) => {
      UI.init();
      const wrapper = document.createElement('div');
      wrapper.className = 'henry-form-label-wrapper';

      const label = document.createElement('label');
      label.className = 'henry-form-label';
      label.textContent = text;
      wrapper.appendChild(label);

      if (required) {
        const badge = document.createElement('span');
        badge.className = 'henry-form-label-required';
        badge.textContent = '必須';
        wrapper.appendChild(badge);
      }

      return wrapper;
    },

    /**
     * 区切り線を作成
     * @param {Object} [options={}] - オプション
     * @param {string} [options.spacing='normal'] - 余白サイズ（'normal' | 'large'）
     * @returns {HTMLHRElement}
     */
    createDivider: ({ spacing = 'normal' } = {}) => {
      UI.init();
      const hr = document.createElement('hr');
      hr.className = 'henry-divider' + (spacing === 'large' ? ' henry-divider-lg' : '');
      return hr;
    },

    /**
     * タグ/バッジを作成
     * @param {Object} options - オプション
     * @param {string} options.text - タグのテキスト
     * @returns {HTMLSpanElement}
     */
    createTag: ({ text } = {}) => {
      UI.init();
      const tag = document.createElement('span');
      tag.className = 'henry-tag';
      tag.textContent = text;
      return tag;
    },

    /**
     * ステータスバッジを作成
     * @param {Object} options - オプション
     * @param {string} options.text - バッジのテキスト
     * @param {string} [options.variant='default'] - バリアント（'default' | 'active'）
     * @returns {HTMLSpanElement}
     */
    createBadge: ({ text, variant = 'default' } = {}) => {
      UI.init();
      const badge = document.createElement('span');
      badge.className = 'henry-badge' + (variant === 'active' ? ' henry-badge-active' : '');
      badge.textContent = text;
      return badge;
    },

    /**
     * アイコン付きテキストを作成
     * @param {Object} options - オプション
     * @param {string} options.icon - Material Iconsのアイコン名（例: 'schedule', 'person'）
     * @param {string} options.text - テキスト
     * @returns {HTMLSpanElement}
     */
    createIconText: ({ icon, text } = {}) => {
      UI.init();
      const wrapper = document.createElement('span');
      wrapper.className = 'henry-icon-text';

      const iconEl = document.createElement('span');
      iconEl.className = 'material-icons';
      iconEl.textContent = icon;

      const textEl = document.createElement('span');
      textEl.textContent = text;

      wrapper.appendChild(iconEl);
      wrapper.appendChild(textEl);
      return wrapper;
    },

    /**
     * ツールチップを表示
     * @param {Object} options - オプション
     * @param {HTMLElement} options.target - ツールチップを表示する対象要素
     * @param {string} options.text - ツールチップのテキスト
     * @param {string} [options.position='right'] - 表示位置（'top' | 'right' | 'bottom' | 'left'）
     * @returns {{ show: () => void, hide: () => void, destroy: () => void }}
     */
    createTooltip: ({ target, text, position = 'right' } = {}) => {
      UI.init();
      const tooltip = document.createElement('div');
      tooltip.className = 'henry-tooltip';
      tooltip.textContent = text;
      tooltip.style.visibility = 'hidden';
      document.body.appendChild(tooltip);

      const show = () => {
        const rect = target.getBoundingClientRect();
        const gap = 8;

        switch (position) {
          case 'top':
            tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - gap + 'px';
            break;
          case 'bottom':
            tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = rect.bottom + gap + 'px';
            break;
          case 'left':
            tooltip.style.left = rect.left - tooltip.offsetWidth - gap + 'px';
            tooltip.style.top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2 + 'px';
            break;
          case 'right':
          default:
            tooltip.style.left = rect.right + gap + 'px';
            tooltip.style.top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2 + 'px';
        }
        tooltip.style.visibility = 'visible';
      };

      const hide = () => {
        tooltip.style.visibility = 'hidden';
      };

      const destroy = () => {
        tooltip.remove();
      };

      target.addEventListener('mouseenter', show);
      target.addEventListener('mouseleave', hide);

      return { show, hide, destroy };
    },

    /**
     * フォームフィールド（ラベル+入力）を作成
     * @param {Object} options - オプション
     * @param {string} options.label - ラベルテキスト
     * @param {HTMLElement} options.input - 入力要素（createInput, createSelect等で作成したもの）
     * @param {boolean} [options.required=false] - 必須マークを表示するか
     * @param {boolean} [options.inline=false] - 横並びレイアウト（ラベルと入力を一行に配置）
     * @returns {HTMLDivElement}
     */
    createFormField: ({ label, input, required = false, inline = false } = {}) => {
      UI.init();
      const field = document.createElement('div');
      field.className = 'henry-form-field';
      if (inline) {
        field.classList.add('henry-form-field-inline');
      }

      const labelWrapper = UI.createFormLabel({ text: label, required });
      field.appendChild(labelWrapper);

      // inputがwrapperを持つ場合（createSelect, createCheckbox等）
      if (input.wrapper) {
        field.appendChild(input.wrapper);
      } else {
        field.appendChild(input);
      }

      return field;
    },

    /**
     * グループ化リストを作成
     * @param {Object} options - オプション
     * @param {Array} options.items - アイテム配列
     * @param {Function} options.groupBy - グループキーを返す関数 (item) => string
     * @param {Function} [options.renderHeader] - ヘッダーをレンダリング (key, items) => string | HTMLElement
     * @param {Function} options.renderItem - アイテムをレンダリング (item) => string | HTMLElement
     * @param {Function} [options.onItemClick] - クリック時コールバック (item) => void
     * @param {string} [options.emptyMessage='該当するデータがありません'] - 空の場合のメッセージ
     * @returns {{ wrapper: HTMLElement, refresh: (newItems) => void }}
     */
    createListGroup: ({ items = [], groupBy, renderHeader, renderItem, onItemClick, emptyMessage = '該当するデータがありません' } = {}) => {
      UI.init();
      const wrapper = document.createElement('div');
      wrapper.className = 'henry-list-group';

      const render = (data) => {
        wrapper.innerHTML = '';

        if (!data || data.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'henry-list-group-empty';
          empty.textContent = emptyMessage;
          wrapper.appendChild(empty);
          return;
        }

        // グループ化
        const groups = new Map();
        for (const item of data) {
          const key = groupBy(item);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(item);
        }

        // レンダリング
        for (const [key, groupItems] of groups) {
          // ヘッダー
          const header = document.createElement('div');
          header.className = 'henry-list-group-header';
          const headerContent = renderHeader ? renderHeader(key, groupItems) : `▼ ${key}`;
          if (typeof headerContent === 'string') {
            header.textContent = headerContent;
          } else {
            header.appendChild(headerContent);
          }
          wrapper.appendChild(header);

          // アイテム
          for (const item of groupItems) {
            const row = document.createElement('div');
            row.className = 'henry-list-group-item';

            const itemContent = renderItem(item);
            if (typeof itemContent === 'string') {
              row.innerHTML = itemContent;
            } else {
              row.appendChild(itemContent);
            }

            if (onItemClick) {
              row.addEventListener('click', () => onItemClick(item));
            }

            wrapper.appendChild(row);
          }
        }
      };

      render(items);

      return {
        wrapper,
        refresh: (newItems) => render(newItems)
      };
    },

    /**
     * テーブルを作成
     * @param {Object} options - オプション
     * @param {Array<{key: string, label: string, width?: string}>} options.columns - 列定義
     * @param {Array} options.data - データ配列
     * @param {Function} [options.renderCell] - セルをレンダリング (item, column) => string | HTMLElement
     * @param {Function} [options.onRowClick] - 行クリック時コールバック (item) => void
     * @returns {{ table: HTMLTableElement, refresh: (newData) => void }}
     */
    createTable: ({ columns = [], data = [], renderCell, onRowClick } = {}) => {
      UI.init();
      const table = document.createElement('table');
      table.className = 'henry-table' + (onRowClick ? ' henry-table-clickable' : '');

      // thead
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const col of columns) {
        const th = document.createElement('th');
        th.textContent = col.label;
        if (col.width) th.style.width = col.width;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // tbody
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);

      const render = (items) => {
        tbody.innerHTML = '';
        for (const item of items) {
          const tr = document.createElement('tr');
          for (const col of columns) {
            const td = document.createElement('td');
            const content = renderCell ? renderCell(item, col) : item[col.key];
            if (typeof content === 'string') {
              td.innerHTML = content;
            } else if (content instanceof HTMLElement) {
              td.appendChild(content);
            } else {
              td.textContent = content ?? '';
            }
            tr.appendChild(td);
          }
          if (onRowClick) {
            tr.addEventListener('click', () => onRowClick(item));
          }
          tbody.appendChild(tr);
        }
      };

      render(data);

      return {
        table,
        refresh: (newData) => render(newData)
      };
    },

    /**
     * カードを作成
     * @param {Object} options - オプション
     * @param {string} options.title - タイトル
     * @param {string} [options.description] - 説明テキスト
     * @param {Object} [options.checkbox] - チェックボックス設定
     * @param {boolean} [options.checkbox.checked=false] - 初期チェック状態
     * @param {Function} [options.checkbox.onChange] - 変更時コールバック (checked) => void
     * @param {HTMLElement} options.content - カード内のコンテンツ
     * @param {boolean} [options.selected=false] - 選択状態（枠線の強調）
     * @returns {{ card: HTMLElement, setSelected: (selected: boolean) => void, checkbox?: HTMLInputElement }}
     */
    createCard: ({ title, description, checkbox, content, selected = false } = {}) => {
      UI.init();
      const card = document.createElement('div');
      card.className = 'henry-card' + (selected ? ' henry-card-selected' : '');

      // ヘッダー
      const header = document.createElement('div');
      header.className = 'henry-card-header';

      let checkboxEl = null;
      if (checkbox) {
        checkboxEl = document.createElement('input');
        checkboxEl.type = 'checkbox';
        checkboxEl.className = 'henry-checkbox';
        checkboxEl.checked = checkbox.checked ?? false;
        header.appendChild(checkboxEl);
      }

      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'henry-card-title';
      titleWrapper.textContent = title;
      if (description) {
        const desc = document.createElement('span');
        desc.className = 'henry-card-description';
        desc.textContent = '　' + description;
        titleWrapper.appendChild(desc);
      }
      header.appendChild(titleWrapper);

      // コンテンツ
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'henry-card-content';
      contentWrapper.appendChild(content);

      card.appendChild(header);
      card.appendChild(contentWrapper);

      // 選択状態の切り替え
      const setSelected = (isSelected) => {
        if (isSelected) {
          card.classList.add('henry-card-selected');
          contentWrapper.classList.remove('henry-card-content-disabled');
        } else {
          card.classList.remove('henry-card-selected');
          contentWrapper.classList.add('henry-card-content-disabled');
        }
      };

      // チェックボックス変更時
      if (checkboxEl && checkbox) {
        checkboxEl.addEventListener('change', () => {
          setSelected(checkboxEl.checked);
          if (checkbox.onChange) checkbox.onChange(checkboxEl.checked);
        });
        // 初期状態を反映
        setSelected(checkboxEl.checked);
      }

      const result = { card, setSelected };
      if (checkboxEl) result.checkbox = checkboxEl;
      return result;
    },

    /**
     * アコーディオンを作成
     * @param {Object} options - オプション
     * @param {Array<{id: string, title: string, content: HTMLElement, expanded?: boolean, badge?: string}>} options.items - アイテム
     * @param {boolean} [options.allowMultiple=true] - 複数同時展開を許可
     * @returns {{ wrapper: HTMLElement, toggle: (id) => void, expand: (id) => void, collapse: (id) => void, updateBadge: (id, badge) => void }}
     */
    createAccordion: ({ items = [], allowMultiple = true } = {}) => {
      UI.init();
      const wrapper = document.createElement('div');
      wrapper.className = 'henry-accordion';

      const itemElements = new Map();

      for (const item of items) {
        const itemEl = document.createElement('div');
        itemEl.className = 'henry-accordion-item';
        itemEl.dataset.id = item.id;

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'henry-accordion-header';

        const arrow = document.createElement('span');
        arrow.className = 'henry-accordion-arrow' + (item.expanded ? ' henry-accordion-arrow-expanded' : '');
        arrow.textContent = '▶';
        header.appendChild(arrow);

        const title = document.createElement('span');
        title.className = 'henry-accordion-title';
        title.textContent = item.title;
        header.appendChild(title);

        const badge = document.createElement('span');
        badge.className = 'henry-accordion-badge';
        badge.textContent = item.badge || '';
        header.appendChild(badge);

        // コンテンツ
        const content = document.createElement('div');
        content.className = 'henry-accordion-content' + (item.expanded ? ' henry-accordion-content-expanded' : '');
        content.appendChild(item.content);

        // クリックで展開/折りたたみ
        header.addEventListener('click', () => {
          toggle(item.id);
        });

        itemEl.appendChild(header);
        itemEl.appendChild(content);
        wrapper.appendChild(itemEl);

        itemElements.set(item.id, { itemEl, header, arrow, content, badge });
      }

      const toggle = (id) => {
        const el = itemElements.get(id);
        if (!el) return;
        const isExpanded = el.content.classList.contains('henry-accordion-content-expanded');
        if (isExpanded) {
          collapse(id);
        } else {
          expand(id);
        }
      };

      const expand = (id) => {
        const el = itemElements.get(id);
        if (!el) return;

        // allowMultiple=false の場合、他を閉じる
        if (!allowMultiple) {
          for (const [otherId, otherEl] of itemElements) {
            if (otherId !== id) {
              otherEl.content.classList.remove('henry-accordion-content-expanded');
              otherEl.arrow.classList.remove('henry-accordion-arrow-expanded');
            }
          }
        }

        el.content.classList.add('henry-accordion-content-expanded');
        el.arrow.classList.add('henry-accordion-arrow-expanded');
      };

      const collapse = (id) => {
        const el = itemElements.get(id);
        if (!el) return;
        el.content.classList.remove('henry-accordion-content-expanded');
        el.arrow.classList.remove('henry-accordion-arrow-expanded');
      };

      const updateBadge = (id, badgeText, isActive = false) => {
        const el = itemElements.get(id);
        if (!el) return;
        el.badge.textContent = badgeText;
        if (isActive) {
          el.badge.classList.add('henry-accordion-badge-active');
        } else {
          el.badge.classList.remove('henry-accordion-badge-active');
        }
      };

      return { wrapper, toggle, expand, collapse, updateBadge };
    },

    showModal: ({
      title, content, actions = [], width, closeOnOverlayClick = true,
      // 新規オプション
      showCloseButton = false, onBeforeClose = null, closeOnEsc = false,
      variant = 'dialog', headerColor = null, footerLeft = null, className = null,
    }) => {
      UI.init();

      if (!document.body) {
        if (!UI._waitingForBody) {
          UI._waitingForBody = true;
          window.addEventListener('DOMContentLoaded', () => {
            UI._waitingForBody = false;
            UI.showModal({
              title, content, actions, width, closeOnOverlayClick,
              showCloseButton, onBeforeClose, closeOnEsc,
              variant, headerColor, footerLeft, className,
            });
          });
        }
        return { close: () => {}, body: null, setFooterLeft: () => {} };
      }

      const overlay = document.createElement('div');
      overlay.className = 'henry-modal-overlay';

      const close = () => {
        if (escHandler) document.removeEventListener('keydown', escHandler);
        if (overlay.parentNode) document.body.removeChild(overlay);
      };

      const tryClose = async () => {
        if (onBeforeClose) {
          const result = await onBeforeClose();
          if (result === false) return;
        }
        close();
      };

      // ESCキー処理
      let escHandler = null;
      if (closeOnEsc) {
        escHandler = (e) => {
          if (e.key === 'Escape') tryClose();
        };
        document.addEventListener('keydown', escHandler);
      }

      // --- variant: 'form' ---
      if (variant === 'form') {
        const modal = document.createElement('div');
        modal.className = 'henry-modal-content henry-modal-form' + (className ? ' ' + className : '');
        if (width) modal.style.width = width;

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'henry-modal-header';
        if (headerColor) header.style.background = headerColor;
        const h2 = document.createElement('h2');
        h2.textContent = title;
        header.appendChild(h2);
        if (showCloseButton) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'henry-modal-close';
          closeBtn.innerHTML = '&times;';
          closeBtn.addEventListener('click', () => tryClose());
          header.appendChild(closeBtn);
        }
        modal.appendChild(header);

        // ボディ
        const body = document.createElement('div');
        body.className = 'henry-modal-body';
        if (typeof content === 'string') {
          body.innerHTML = content;
        } else if (content) {
          body.appendChild(content);
        }
        modal.appendChild(body);

        // フッター
        const footer = document.createElement('div');
        footer.className = 'henry-modal-footer';
        const footerLeftEl = document.createElement('div');
        footerLeftEl.className = 'henry-modal-footer-left';
        if (typeof footerLeft === 'string') {
          footerLeftEl.textContent = footerLeft;
        } else if (footerLeft) {
          footerLeftEl.appendChild(footerLeft);
        }
        footer.appendChild(footerLeftEl);

        const footerRightEl = document.createElement('div');
        footerRightEl.className = 'henry-modal-footer-right';
        actions.forEach(action => {
          const btn = UI.createButton({
            label: action.label,
            variant: action.variant || 'primary',
            onClick: async (e) => {
              if (action.onClick) await action.onClick(e, btn);
              if (action.autoClose !== false) close();
            }
          });
          if (action.id) btn.id = action.id;
          if (action.className) btn.classList.add(action.className);
          footerRightEl.appendChild(btn);
        });
        footer.appendChild(footerRightEl);
        modal.appendChild(footer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        if (closeOnOverlayClick) {
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) tryClose();
          });
        }

        const setFooterLeft = (content) => {
          footerLeftEl.textContent = '';
          if (typeof content === 'string') {
            footerLeftEl.textContent = content;
          } else if (content) {
            footerLeftEl.appendChild(content);
          }
        };

        return { close, element: overlay, body, setFooterLeft };
      }

      // --- variant: 'dialog' (既存動作) ---
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

      if (actions.length === 0) {
        actions.push({ label: '閉じる', variant: 'secondary' });
      }

      actions.forEach(action => {
        const btn = UI.createButton({
          label: action.label,
          variant: action.variant || 'primary',
          onClick: (e) => {
            if (action.onClick) action.onClick(e, btn);
            if (action.autoClose !== false) close();
          }
        });
        footer.appendChild(btn);
      });

      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      if (closeOnOverlayClick) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) tryClose();
        });
      }

      return { close, element: overlay, body, setFooterLeft: () => {} };
    },

    /**
     * 確認ダイアログを表示
     * @param {Object} options - オプション
     * @param {string} options.title - タイトル
     * @param {string} options.message - メッセージ
     * @param {string} [options.confirmLabel='OK'] - 確認ボタンのラベル
     * @param {string} [options.cancelLabel='キャンセル'] - キャンセルボタンのラベル
     * @returns {Promise<boolean>} - 確認されたらtrue、キャンセルされたらfalse
     */
    showConfirm: ({ title, message, confirmLabel = 'OK', cancelLabel = 'キャンセル' }) => {
      return new Promise(resolve => {
        const content = document.createElement('div');
        content.textContent = message;

        UI.showModal({
          title,
          content,
          closeOnOverlayClick: false,
          actions: [
            {
              label: cancelLabel,
              variant: 'secondary',
              onClick: () => resolve(false)
            },
            {
              label: confirmLabel,
              variant: 'primary',
              onClick: () => resolve(true)
            }
          ]
        });
      });
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
  // 8. DraftStorage Module (下書きSpreadsheet管理)
  // ==========================================
  const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4';
  const DRIVE_API_BASE_V3 = 'https://www.googleapis.com/drive/v3';
  const DRAFT_SPREADSHEET_NAME = 'Henry_下書きデータ';
  const DRAFT_SHEET_NAME = '下書き';

  const DraftStorage = {
    _spreadsheetId: null,
    _caches: {},  // { [type]: { [patientUuid]: { rowIndex, jsonData, savedAt, patientName } } }

    // OAuth付きHTTPリクエスト（401時リトライ）
    async _request(method, url, options = {}) {
      const accessToken = await GoogleAuth.getValidAccessToken();

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method,
          url,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers
          },
          data: options.body,
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              try {
                resolve(JSON.parse(response.responseText));
              } catch {
                resolve(response.responseText);
              }
            } else if (response.status === 401) {
              // トークン失効 → リフレッシュして1回リトライ
              GoogleAuth.refreshAccessToken()
                .then(() => this._request(method, url, options))
                .then(resolve)
                .catch(reject);
            } else {
              console.error(`[Henry Core] DraftStorage API Error ${response.status}:`, response.responseText);
              reject(new Error(`DraftStorage API Error: ${response.status}`));
            }
          },
          onerror: (err) => {
            console.error('[Henry Core] DraftStorage Network error:', err);
            reject(new Error('DraftStorage 通信エラー'));
          }
        });
      });
    },

    // スプレッドシート検索（Drive API）
    async _findSpreadsheet() {
      if (this._spreadsheetId) return this._spreadsheetId;

      const query = `name='${DRAFT_SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and 'root' in parents and trashed=false`;
      const url = `${DRIVE_API_BASE_V3}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
      const result = await this._request('GET', url);
      if (result.files?.length > 0) {
        this._spreadsheetId = result.files[0].id;
        return this._spreadsheetId;
      }
      return null;
    },

    // スプレッドシート新規作成（ヘッダー行付き）
    async _createSpreadsheet() {
      const url = `${SHEETS_API_BASE}/spreadsheets`;
      const result = await this._request('POST', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: DRAFT_SPREADSHEET_NAME },
          sheets: [{
            properties: { title: DRAFT_SHEET_NAME },
            data: [{
              startRow: 0,
              startColumn: 0,
              rowData: [{
                values: [
                  { userEnteredValue: { stringValue: '患者UUID' } },
                  { userEnteredValue: { stringValue: '下書き種別' } },
                  { userEnteredValue: { stringValue: 'JSONデータ' } },
                  { userEnteredValue: { stringValue: '保存日時' } },
                  { userEnteredValue: { stringValue: '患者名' } }
                ]
              }]
            }]
          }]
        })
      });
      this._spreadsheetId = result.spreadsheetId;
      console.log('[Henry Core] DraftStorage: スプレッドシートを作成:', this._spreadsheetId);
      return this._spreadsheetId;
    },

    // 取得 or 作成
    async _getOrCreateSpreadsheet() {
      let id = await this._findSpreadsheet();
      if (!id) id = await this._createSpreadsheet();
      return id;
    },

    // 全データ読み込み → キャッシュ（種別フィルタ）
    async _loadAll(type) {
      if (this._caches[type]) return this._caches[type];

      const spreadsheetId = await this._findSpreadsheet();
      if (!spreadsheetId) {
        this._caches[type] = {};
        return this._caches[type];
      }

      const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(DRAFT_SHEET_NAME)}!A:E`;
      const result = await this._request('GET', url);
      const rows = result.values || [];
      this._caches[type] = {};

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] && row[1] === type) {
          this._caches[type][row[0]] = {
            rowIndex: i + 1,
            jsonData: row[2] || '',
            savedAt: row[3] || '',
            patientName: row[4] || ''
          };
        }
      }

      return this._caches[type];
    },

    /**
     * 下書き読み込み（localStorageマイグレーション付き）
     * @param {string} type - 種別（'referral', 'ikensho'等）
     * @param {string} patientUuid - 患者UUID
     * @param {Object} [options] - オプション
     * @param {string} [options.localStoragePrefix] - マイグレーション用のlocalStorageキー接頭辞
     * @param {function} [options.validate] - バリデーション関数 (parsed) => boolean
     * @returns {Promise<{data: Object, savedAt: string}|null>}
     */
    async load(type, patientUuid, options = {}) {
      try {
        const cache = await this._loadAll(type);

        // Spreadsheet にあればそれを返す
        const cached = cache[patientUuid];
        if (cached) {
          try {
            const parsed = JSON.parse(cached.jsonData);
            if (options.validate && !options.validate(parsed)) {
              console.log('[Henry Core] DraftStorage: バリデーション不合格、スキップ');
              return null;
            }
            return { data: parsed, savedAt: cached.savedAt };
          } catch (e) {
            console.error('[Henry Core] DraftStorage: JSONパースエラー:', e.message);
            return null;
          }
        }

        // localStorage からのマイグレーション
        if (options.localStoragePrefix) {
          const lsKey = `${options.localStoragePrefix}${patientUuid}`;
          const stored = localStorage.getItem(lsKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (!options.validate || options.validate(parsed)) {
                console.log('[Henry Core] DraftStorage: localStorage → Spreadsheet マイグレーション:', patientUuid);
                await this.save(type, patientUuid, parsed, '');
                localStorage.removeItem(lsKey);
                return { data: parsed, savedAt: parsed.savedAt || '' };
              }
            } catch (e) {
              console.error('[Henry Core] DraftStorage: localStorage マイグレーションエラー:', e.message);
            }
            // 不正データはlocalStorageから削除
            localStorage.removeItem(lsKey);
          }
        }

        return null;
      } catch (e) {
        console.error('[Henry Core] DraftStorage: 読み込みエラー:', e);
        return null;
      }
    },

    /**
     * 下書き保存（既存行更新 or 新規行追加）
     * @param {string} type - 種別
     * @param {string} patientUuid - 患者UUID
     * @param {Object} formData - 保存するデータ（JSON化される）
     * @param {string} [patientName=''] - 患者名（スプレッドシートE列）
     * @returns {Promise<boolean>}
     */
    async save(type, patientUuid, formData, patientName = '') {
      try {
        const spreadsheetId = await this._getOrCreateSpreadsheet();
        const now = new Date().toISOString();
        const jsonStr = JSON.stringify(formData);

        const cache = await this._loadAll(type);
        const existing = cache[patientUuid];
        const rowValues = [[patientUuid, type, jsonStr, now, patientName]];

        let newRowIndex;
        if (existing) {
          const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(DRAFT_SHEET_NAME)}!A${existing.rowIndex}:E${existing.rowIndex}?valueInputOption=RAW`;
          await this._request('PUT', url, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: rowValues })
          });
          newRowIndex = existing.rowIndex;
        } else {
          const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(DRAFT_SHEET_NAME)}!A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
          const appendResult = await this._request('POST', url, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: rowValues })
          });
          const range = appendResult?.updates?.updatedRange || '';
          const match = range.match(/!A(\d+):/);
          newRowIndex = match ? parseInt(match[1], 10) : Object.keys(cache).length + 2;
        }

        this._caches[type][patientUuid] = { rowIndex: newRowIndex, jsonData: jsonStr, savedAt: now, patientName };
        console.log('[Henry Core] DraftStorage: 保存完了:', type, patientUuid);
        return true;
      } catch (e) {
        console.error('[Henry Core] DraftStorage: 保存エラー:', e);
        return false;
      }
    },

    /**
     * 下書き削除
     * @param {string} type - 種別
     * @param {string} patientUuid - 患者UUID
     */
    async delete(type, patientUuid) {
      try {
        const spreadsheetId = await this._findSpreadsheet();
        if (!spreadsheetId) return;

        const cache = await this._loadAll(type);
        const existing = cache[patientUuid];
        if (!existing) return;

        // 行をクリア（削除ではなく空にする）
        const url = `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(DRAFT_SHEET_NAME)}!A${existing.rowIndex}:E${existing.rowIndex}:clear`;
        await this._request('POST', url, {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        delete this._caches[type][patientUuid];
        console.log('[Henry Core] DraftStorage: 削除完了:', type, patientUuid);
      } catch (e) {
        console.error('[Henry Core] DraftStorage: 削除エラー:', e);
      }
    },

    /**
     * プリロード（フォーム表示高速化用）
     * @param {string} type - 種別
     */
    async preload(type) {
      try {
        await this._loadAll(type);
      } catch (e) {
        // プリロードは失敗しても無視
      }
    }
  };

  // ==========================================
  // 9. Plugin Registry
  // ==========================================
  const pluginRegistry = [];

  // ==========================================
  // 10. Public API
  // ==========================================
  pageWindow.HenryCore = {
    // 施設設定（ハードコード値の一元管理）
    config: {
      orgUuid: CONFIG.ORG_UUID,
      hospital: {
        name: 'マオカ病院',
        postalCode: '〒760-0052',
        address: '香川県高松市瓦町１丁目12-45',
        phone: '087-862-8888',
        fax: '087-863-0880'
      }
    },

    // モジュール（GoogleAuth等）
    modules: {
      GoogleAuth: GoogleAuth,
      DraftStorage: DraftStorage
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
  // 11. 初期化
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
