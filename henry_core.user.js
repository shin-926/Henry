// ==UserScript==
// @name         Henry Core
// @namespace    https://henry-app.jp/
// @version      2.9.7
// @description  Henry スクリプト実行基盤 (GoogleAuth統合 / Google Docs対応)
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

(function() {
  'use strict';

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
    DB_NAME: 'HenryAPIHashes',
    DB_VERSION: 2,
    STORE_NAME: 'hashes',
    BASE_URL: 'https://henry-app.jp',

    // GoogleAuth設定（GM_storageから読み込み、未設定なら空）
    GOOGLE_CLIENT_ID: storedCredentials?.clientId || '',
    GOOGLE_CLIENT_SECRET: storedCredentials?.clientSecret || '',

    // GoogleAuth固定設定
    GOOGLE_SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
    GOOGLE_REDIRECT_URI: 'https://henry-app.jp/',
    GOOGLE_AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
    GOOGLE_TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
    GOOGLE_TOKENS_KEY: 'google_drive_tokens',
    GOOGLE_CREDENTIALS_KEY: 'google_oauth_credentials'
  };

  console.log('[Henry Core] Initializing v2.9.7...');

  // ==========================================
  // 1. IndexedDB Manager (ハッシュ + エンドポイント管理)
  // TODO: フルクエリ方式 (query()) への移行完了後、このセクションは削除予定
  // ==========================================
  const DB = {
    open: () => new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
          db.deleteObjectStore(CONFIG.STORE_NAME);
          console.log('[Henry Core] 旧形式のハッシュDBをクリアしました');
        }
        db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'operationName' });
      };
    }),

    put: async (opName, hash, endpoint) => {
      const db = await DB.open();
      return new Promise((resolve) => {
        const tx = db.transaction(CONFIG.STORE_NAME, 'readwrite');
        tx.objectStore(CONFIG.STORE_NAME).put({
          operationName: opName,
          hash,
          endpoint,
          updatedAt: Date.now()
        });
        tx.oncomplete = () => resolve();
      });
    },

    get: async (opName) => {
      const db = await DB.open();
      return new Promise((resolve) => {
        const req = db.transaction(CONFIG.STORE_NAME, 'readonly')
          .objectStore(CONFIG.STORE_NAME).get(opName);
        req.onsuccess = () => {
          const result = req.result;
          if (result) {
            resolve({ hash: result.hash, endpoint: result.endpoint });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    },

    getAll: async () => {
      const db = await DB.open();
      return new Promise((resolve) => {
        const req = db.transaction(CONFIG.STORE_NAME, 'readonly')
          .objectStore(CONFIG.STORE_NAME).getAll();
        req.onsuccess = () => {
          const map = {};
          req.result.forEach(r => {
            map[r.operationName] = { hash: r.hash, endpoint: r.endpoint };
          });
          resolve(map);
        };
      });
    },

    clear: async () => {
      const db = await DB.open();
      return new Promise((resolve) => {
        const tx = db.transaction(CONFIG.STORE_NAME, 'readwrite');
        tx.objectStore(CONFIG.STORE_NAME).clear();
        tx.oncomplete = () => {
          console.log('[Henry Core] ハッシュDBをクリアしました');
          resolve();
        };
      });
    }
  };

  // ==========================================
  // 2. Hash Cache (メモリキャッシュ)
  // TODO: フルクエリ方式 (query()) への移行完了後、このセクションは削除予定
  // ==========================================
  const hashCache = new Map();

  // 起動時にIndexedDBから全ハッシュを読み込む
  DB.getAll().then(all => {
    Object.entries(all).forEach(([opName, data]) => {
      hashCache.set(opName, { hash: data.hash, endpoint: data.endpoint });
    });
    console.log(`[Henry Core] Loaded ${hashCache.size} hashes into memory`);
  }).catch(e => {
    console.warn('[Henry Core] Failed to load hashes into memory', e);
  });

  // ==========================================
  // 3. Auth Manager (認証トークン)
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
  // 4. Context Manager (動的コンテキスト)
  // ==========================================
  const Context = {
    _patientUuid: null,
    _myUuid: null,

    setPatientUuid: (uuid) => {
      if (uuid && uuid !== Context._patientUuid) {
        Context._patientUuid = uuid;
      }
    },

    getPatientUuid: () => {
      // キャッシュがあればそれを返す
      if (Context._patientUuid) return Context._patientUuid;

      // URLから患者UUIDを抽出（フォールバック）
      // 例: /patients/{uuid}/charts, /patients/{uuid}/encounters
      const match = pageWindow.location.pathname.match(/\/patients\/([a-f0-9-]{36})/i);
      if (match) {
        Context._patientUuid = match[1];
        return Context._patientUuid;
      }

      return null;
    },

    getMyUuid: async () => {
      if (Context._myUuid) return Context._myUuid;

      const myName = await Auth.getMyNameFromToken();
      if (!myName) {
        console.error('[Henry Core] Firebase から名前を取得できませんでした');
        return null;
      }

      try {
        const result = await pageWindow.HenryCore.query(`
          query ListUsers($input: ListUsersRequestInput!) {
            listUsers(input: $input) {
              users { uuid name }
            }
          }
        `, { input: { role: 'DOCTOR', onlyNarcoticPractitioner: false } });

        const users = result.data?.listUsers?.users || [];
        const normalize = (s) => s.replace(/\s+/g, '');
        const me = users.find(u => normalize(u.name) === normalize(myName));

        if (!me) {
          console.error('[Henry Core] 医師一覧に該当ユーザーが見つかりませんでした (Name mismatch)');
          return null;
        }

        Context._myUuid = me.uuid;
        console.log(`[Henry Core] MyUuid resolved: ${me.uuid}`);
        return me.uuid;
      } catch (e) {
        console.error('[Henry Core] getMyUuid エラー:', e.message);
        return null;
      }
    }
  };

  // ==========================================
  // 5. Fetch Hook (デュアルエンドポイント対応)
  // TODO: ハッシュ収集機能はフルクエリ方式 (query()) への移行完了後に削除予定
  //       ただし patientUuid のキャッチは残す
  // ==========================================
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    let urlStr = '';
    if (typeof url === 'string') {
      urlStr = url;
    } else if (url instanceof Request) {
      urlStr = url.url;
    }

    if (urlStr && options?.body) {
      let endpoint = null;
      if (urlStr.includes('/graphql-v2')) {
        endpoint = '/graphql-v2';
      } else if (urlStr.includes('/graphql')) {
        endpoint = '/graphql';
      }

      if (endpoint) {
        try {
          const rawBody = JSON.parse(options.body);
          const requests = Array.isArray(rawBody) ? rawBody : [rawBody];

          requests.forEach(body => {
            // [v2.6.9 修正] 患者UUIDを先にキャッチ（return前に必ず実行）
            const patientUuid = body.variables?.input?.patientUuid;
            if (patientUuid) {
              Context.setPatientUuid(patientUuid);
            }

            if (body.operationName && body.extensions?.persistedQuery?.sha256Hash) {
              const hash = body.extensions.persistedQuery.sha256Hash;
              const opName = body.operationName;

              // メモリキャッシュを確認（IndexedDBアクセス不要）
              const cached = hashCache.get(opName);
              if (cached && cached.hash === hash && cached.endpoint === endpoint) {
                return;  // 変更なし → スキップ（patientUuidは既にセット済み）
              }

              // 新規 or 更新 → IndexedDBに保存
              DB.put(opName, hash, endpoint)
                .then(() => {
                  hashCache.set(opName, { hash, endpoint });
                  console.log(`[Henry Core] Saved: ${opName} → ${endpoint}`);
                })
                .catch(e => console.warn('[Henry Core] Hash save failed', e));
            }
          });

        } catch (_) {}
      }
    }
    return originalFetch.apply(this, arguments);
  };

  // ==========================================
  // 6. Navigation Hook (SPA対応)
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
  // 7. UI Manager (HenryUI)
  // ==========================================
  const UI = {
    _initialized: false,
    _waitingForBody: false,

    init: () => {
      if (UI._initialized) return;
      UI._initialized = true;

      if (document.getElementById('henry-core-styles')) return;

      const style = document.createElement('style');
      style.id = 'henry-core-styles';
      style.textContent = `
        :root {
          --henry-primary: rgb(0, 204, 146);
          --henry-primary-hover: rgb(0, 180, 130);
          --henry-text-high: rgba(0, 0, 0, 0.84);
          --henry-text-med: rgba(0, 0, 0, 0.57);
          --henry-text-disabled: rgba(0, 0, 0, 0.38);
          --henry-bg-base: #FFFFFF;
          --henry-bg-sub: #F5F7FA;
          --henry-bg-hover: rgba(0, 0, 0, 0.04);
          --henry-border: rgba(0, 0, 0, 0.13);
          --henry-shadow-card: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
          --henry-radius: 4px;
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
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .henry-modal-content {
          background: var(--henry-bg-base);
          border-radius: 8px;
          padding: 24px;
          box-shadow: var(--henry-shadow-card);
          min-width: 400px;
          max-width: 90vw;
        }
        .henry-modal-title {
          font-size: 20px;
          font-weight: bold;
          color: var(--henry-text-high);
          margin-bottom: 16px;
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
    }
  };

  // ==========================================
  // 8. Utilities
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
  // 9. GoogleAuth Module (Google OAuth認証)
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
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';

      const dialog = document.createElement('div');
      dialog.style.cssText = 'background:#fff;border-radius:12px;padding:24px;width:540px;max-width:90vw;font-family:-apple-system,sans-serif;';

      dialog.innerHTML = `
        <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;">Google OAuth 設定</h3>
        <p style="margin:0 0 16px 0;font-size:13px;color:#666;">
          GCPコンソールで作成したOAuthクライアントの情報を入力してください。<br>
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
  // 10. Plugin Registry
  // ==========================================
  const pluginRegistry = [];

  // ==========================================
  // 11. Public API
  // ==========================================
  pageWindow.HenryCore = {
    // モジュール（GoogleAuth等）
    modules: {
      GoogleAuth: GoogleAuth
    },

    plugins: pluginRegistry,

    // @deprecated: query() メソッドを使用してください。call() は後方互換性のために残されています。
    call: async (operationName, variables) => {
      // メモリキャッシュを優先、なければIndexedDB
      let entry = hashCache.get(operationName);
      if (!entry) {
        entry = await DB.get(operationName);
      }

      if (!entry) {
        UI.showModal({
          title: '準備が必要です',
          content: `機能「${operationName}」を使用するための情報が不足しています。\n\n【解決策】\nHenryの画面で一度、該当する操作（ファイル一覧の表示、詳細画面を開くなど）を行ってから再試行してください。`,
          actions: [{ label: 'OK', onClick: () => {} }]
        });
        throw new Error(`${operationName} のハッシュが見つかりません`);
      }

      const token = await Auth.getToken();
      if (!token) {
        throw new Error('有効なトークンがありません。再ログインしてください。');
      }

      const url = CONFIG.BASE_URL + entry.endpoint;

      const res = await originalFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': CONFIG.ORG_UUID
        },
        body: JSON.stringify({
          operationName,
          variables,
          extensions: { persistedQuery: { version: 1, sha256Hash: entry.hash } }
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
    },

    // フルクエリ方式（APQ不要、ハッシュ事前収集不要）
    query: async (queryString, variables = {}) => {
      const token = await Auth.getToken();
      if (!token) {
        throw new Error('有効なトークンがありません。再ログインしてください。');
      }

      const url = CONFIG.BASE_URL + '/graphql';

      const res = await originalFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': CONFIG.ORG_UUID
        },
        body: JSON.stringify({
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
    },

    getMyUuid: Context.getMyUuid,

    registerPlugin: async (options) => {
      // プラグインをレジストリに追加
      const plugin = {
        id: options.id,
        name: options.name,
        icon: options.icon || '',
        description: options.description || '',
        version: options.version || '1.0.0',
        order: options.order || 100,
        onClick: options.onClick
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
          onClick: plugin.onClick  // Toolbox v5.1.0 対応
        });
      }

      return true;
    },

    getPatientUuid: Context.getPatientUuid,
    getToken: Auth.getToken,
    getHashes: DB.getAll,
    tokenStatus: Auth.tokenStatus,

    dumpHashes: async () => {
      const hashes = await DB.getAll();
      const rows = Object.entries(hashes).map(([op, data]) => ({
        operationName: op,
        endpoint: data.endpoint,
        hash: data.hash.slice(0, 16) + '...'
      }));
      console.table(rows);
      return hashes;
    },

    clearHashes: async () => {
      await DB.clear();
      hashCache.clear();
      console.log('[Henry Core] 全ハッシュをクリアしました。Henryを操作して再収集してください。');
    },

    utils: Utils,
    ui: UI
  };

  // ==========================================
  // 12. 初期化
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
      z-index: 999999;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Google認証プラグイン登録
  async function registerGoogleAuthPlugin() {
    // Toolboxの準備を待つ
    await Utils.waitForToolbox(5000);

    pageWindow.HenryCore.registerPlugin({
      id: 'google-auth',
      name: 'Google認証',
      icon: '🔐',
      description: 'Google Drive/Docs APIの認証管理',
      version: '1.0.0',
      order: 10,
      onClick: () => {
        // 未設定の場合 → 設定ダイアログ
        if (!GoogleAuth.isConfigured()) {
          GoogleAuth.showConfigDialog();
          return;
        }

        // 認証済みの場合 → オプション表示
        if (GoogleAuth.isAuthenticated()) {
          const choice = prompt(
            'Google認証 オプション:\n\n' +
            '1: 認証を解除（トークン削除）\n' +
            '2: OAuth設定を変更（Client ID/Secret）\n' +
            '3: キャンセル\n\n' +
            '番号を入力してください:'
          );
          if (choice === '1') {
            GoogleAuth.clearTokens();
            showToast('Google認証を解除しました');
          } else if (choice === '2') {
            GoogleAuth.showConfigDialog();
          }
        } else {
          // 未認証の場合 → 認証開始
          GoogleAuth.startAuth();
        }
      }
    });
  }

  // ドメイン別初期化
  if (isHenry) {
    // Henryドメイン：フル機能
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        UI.init();
        checkForAuthCode();
        registerGoogleAuthPlugin();
      });
    } else {
      UI.init();
      checkForAuthCode();
      registerGoogleAuthPlugin();
    }
    console.log('[Henry Core] Ready v2.9.7 (Henry mode)');

  } else if (isGoogleDocs) {
    // Google Docsドメイン：GoogleAuthのみ
    console.log('[Henry Core] Ready v2.9.7 (Google Docs mode - GoogleAuth only)');
  }
})();
