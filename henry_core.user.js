// ==UserScript==
// @name         Henry Core
// @namespace    https://henry-app.jp/
// @version      2.8.1
// @description  Henry スクリプト実行基盤 (v3.20準拠 / 単一施設運用 / プラグインレジストリ対応 / query()メソッド追加)
// @match        https://henry-app.jp/*
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // 二重起動防止
  if (window.HenryCore) return;

  const CONFIG = {
    // 単一施設運用を前提としたハードコード（複数施設対応は想定しない）
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825', // マオカ病院
    DB_NAME: 'HenryAPIHashes',
    DB_VERSION: 2,
    STORE_NAME: 'hashes',
    BASE_URL: 'https://henry-app.jp'
  };

  console.log('[Henry Core] Initializing v2.8.1...');

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

    getPatientUuid: () => Context._patientUuid,

    getMyUuid: async () => {
      if (Context._myUuid) return Context._myUuid;

      const myName = await Auth.getMyNameFromToken();
      if (!myName) {
        console.error('[Henry Core] Firebase から名前を取得できませんでした');
        return null;
      }

      try {
        const result = await window.HenryCore.query(`
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
        if (window[key]) return resolve(window[key]);

        const intervalTime = 100;
        let waited = 0;

        const timer = setInterval(() => {
          if (window[key]) {
            clearInterval(timer);
            resolve(window[key]);
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
  // 9. Plugin Registry
  // ==========================================
  const pluginRegistry = [];

  // ==========================================
  // 10. Public API
  // ==========================================
  window.HenryCore = {
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
      window.dispatchEvent(new CustomEvent('henrycore:plugin-registered', {
        detail: plugin
      }));

      // 後方互換性: Toolbox がある場合は直接登録も行う
      const toolbox = await Utils.waitForToolbox(1000);
      if (toolbox && typeof toolbox.register === 'function') {
        toolbox.register({
          event: `henrycore:plugin:${plugin.id}`,
          label: `${plugin.icon} ${plugin.name}`.trim(),
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
  } else {
    UI.init();
  }

  console.log('[Henry Core] Ready v2.8.0');
})();
