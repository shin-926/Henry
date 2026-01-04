// ==UserScript==
// @name         Henry API Collector
// @namespace    https://henry-app.jp/
// @version      2.8.0
// @description  Henry の GraphQL API 仕様を自動収集（Henry Core v2.3+ 連携）
// @match        https://henry-app.jp/*
// @match        https://*.henry-app.jp/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_api_collector.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_api_collector.user.js
// ==/UserScript==

(function() {
  'use strict';

  const script = document.createElement('script');
  script.textContent = `(${main.toString()})();`;
  document.documentElement.appendChild(script);
  script.remove();

  function main() {
    const CONFIG = {
      DB_NAME: 'HenryAPICollector',
      DB_VERSION: 5,
      STORE_NAME: 'apiSpecs',
      META_STORE: 'meta',
      MAX_ARRAY_SAMPLES: 1,
      MAX_DEPTH: 8,
      MAX_RESPONSE_SIZE: 1000000,
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 100,
      DEBUG: false
    };

    // ==========================================
    // ロガー（遅延初期化）
    // ==========================================

    const loggedErrors = new Set();
    let logger = null;

    const fallbackLogger = {
      info: (...args) => CONFIG.DEBUG && console.log('[API Collector]', ...args),
      warn: (...args) => console.warn('[API Collector]', ...args),
      error: (...args) => console.error('[API Collector]', ...args)
    };

    function getLogger() {
      if (!logger && window.HenryCore?.utils?.createLogger) {
        logger = window.HenryCore.utils.createLogger('API Collector');
      }
      return logger || fallbackLogger;
    }

    function warnOnce(key, ...args) {
      if (loggedErrors.has(key)) return;
      loggedErrors.add(key);
      getLogger().warn(...args);
    }

    function errorOnce(key, ...args) {
      if (loggedErrors.has(key)) return;
      loggedErrors.add(key);
      getLogger().error(...args);
    }

    // ==========================================
    // 汎用待機（HenryCore 不要版）
    // ==========================================

    function waitFor(predicate, timeout = 10000, interval = 100) {
      return new Promise((resolve) => {
        if (predicate()) return resolve(predicate());

        let waited = 0;
        const timer = setInterval(() => {
          const result = predicate();
          if (result) {
            clearInterval(timer);
            resolve(result);
          } else {
            waited += interval;
            if (waited >= timeout) {
              clearInterval(timer);
              resolve(null);
            }
          }
        }, interval);
      });
    }

    // ==========================================
    // インメモリキャッシュ
    // ==========================================

    const knownHashes = new Map();

    // ==========================================
    // Fetch Hook
    // ==========================================

    const originalFetch = window.fetch.bind(window);
    let captureQueue = [];
    let dbReady = false;

    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input?.url;

      if (!url?.includes('/graphql') || !init?.body) {
        return originalFetch(input, init);
      }

      let operationName, sha256Hash, variables;

      try {
        const body = JSON.parse(init.body);
        operationName = body.operationName;
        sha256Hash = body.extensions?.persistedQuery?.sha256Hash;
        variables = body.variables;
      } catch {
        return originalFetch(input, init);
      }

      if (!operationName || !sha256Hash) {
        return originalFetch(input, init);
      }

      if (knownHashes.get(operationName) === sha256Hash) {
        return originalFetch(input, init);
      }

      const response = await originalFetch(input, init);
      const clonedResponse = response.clone();

      const processCapture = async () => {
        try {
          const text = await clonedResponse.text();

          if (text.length > CONFIG.MAX_RESPONSE_SIZE) {
            console.log(`[API Collector] ⏭️ サイズ超過スキップ: ${operationName} (${(text.length / 1024).toFixed(0)}KB > ${(CONFIG.MAX_RESPONSE_SIZE / 1024).toFixed(0)}KB)`);
            return;
          }

          const data = JSON.parse(text);

          const spec = {
            operationName,
            sha256Hash,
            variables: extractVariablesStructure(variables),
            schema: extractSchema(data),
            collectedAt: new Date().toISOString()
          };

          if (dbReady) {
            await saveSpec(spec);
          } else {
            captureQueue.push(spec);
          }
        } catch (e) {
          if (e.name === 'AbortError') {
            return;
          }
          warnOnce(`capture-${operationName}`, `処理失敗: ${operationName}`, e.message);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => processCapture(), { timeout: 2000 });
      } else {
        setTimeout(processCapture, 0);
      }

      return response;
    };

    console.log('[API Collector] ✅ Fetch hook installed');

    // ==========================================
    // スキーマ抽出
    // ==========================================

    function extractSchema(value, depth = 0) {
      if (depth > CONFIG.MAX_DEPTH) return { type: 'max_depth' };
      if (value === null) return { type: 'null' };
      if (value === undefined) return { type: 'undefined' };

      const type = typeof value;

      if (type === 'string') {
        return { type: 'string', sample: value.length > 50 ? value.slice(0, 50) + '...' : value };
      }
      if (type === 'number') return { type: 'number', sample: value };
      if (type === 'boolean') return { type: 'boolean', sample: value };

      if (Array.isArray(value)) {
        if (value.length === 0) return { type: 'array', items: 'empty' };
        return {
          type: 'array',
          length: value.length,
          items: [extractSchema(value[0], depth + 1)]
        };
      }

      if (type === 'object') {
        const keys = Object.keys(value);
        if (keys.length > 50) {
          return { type: 'object', properties: 'too_many_keys', keyCount: keys.length };
        }
        const schema = {};
        for (const key of keys) {
          schema[key] = extractSchema(value[key], depth + 1);
        }
        return { type: 'object', properties: schema };
      }

      return { type };
    }

    function extractVariablesStructure(variables, depth = 0) {
      if (depth > 5) return 'max_depth';
      if (!variables || typeof variables !== 'object') return null;

      function process(value, d = 0) {
        if (d > 5) return 'max_depth';
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        const type = typeof value;
        if (type === 'string') return 'string';
        if (type === 'number') return 'number';
        if (type === 'boolean') return 'boolean';
        if (Array.isArray(value)) {
          return value.length === 0 ? '[]' : [process(value[0], d + 1)];
        }
        if (type === 'object') {
          const result = {};
          for (const key of Object.keys(value)) {
            result[key] = process(value[key], d + 1);
          }
          return result;
        }
        return type;
      }

      return process(variables);
    }

    // ==========================================
    // ユーティリティ
    // ==========================================

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function withRetry(fn, attempts = CONFIG.RETRY_ATTEMPTS) {
      let lastError;
      for (let i = 0; i < attempts; i++) {
        try {
          return await fn();
        } catch (e) {
          lastError = e;
          if (i < attempts - 1) await sleep(CONFIG.RETRY_DELAY * (i + 1));
        }
      }
      throw lastError;
    }

    // ==========================================
    // IndexedDB 管理
    // ==========================================

    let dbInstance = null;

    const DB = {
      open: async () => {
        if (dbInstance) return dbInstance;

        return new Promise((resolve, reject) => {
          const req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            dbInstance = req.result;
            dbInstance.onclose = () => { dbInstance = null; dbReady = false; };
            resolve(dbInstance);
          };
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
              db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'operationName' });
            }
            if (!db.objectStoreNames.contains(CONFIG.META_STORE)) {
              db.createObjectStore(CONFIG.META_STORE, { keyPath: 'key' });
            }
          };
        });
      },

      transaction: async (storeName, mode = 'readonly') => {
        const db = await DB.open();
        return db.transaction(storeName, mode).objectStore(storeName);
      },

      get: (operationName) => withRetry(async () => {
        const store = await DB.transaction(CONFIG.STORE_NAME);
        return new Promise((resolve, reject) => {
          const req = store.get(operationName);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      }),

      put: (data) => withRetry(async () => {
        const store = await DB.transaction(CONFIG.STORE_NAME, 'readwrite');
        return new Promise((resolve, reject) => {
          const req = store.put(data);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }),

      getAll: () => withRetry(async () => {
        const store = await DB.transaction(CONFIG.STORE_NAME);
        return new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      }),

      clear: () => withRetry(async () => {
        const store = await DB.transaction(CONFIG.STORE_NAME, 'readwrite');
        return new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }),

      getMeta: async (key) => {
        try {
          const store = await DB.transaction(CONFIG.META_STORE);
          return new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result?.value || null);
            req.onerror = () => resolve(null);
          });
        } catch { return null; }
      },

      setMeta: async (key, value) => {
        const store = await DB.transaction(CONFIG.META_STORE, 'readwrite');
        return new Promise((resolve, reject) => {
          const req = store.put({ key, value });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    };

    // ==========================================
    // 保存処理
    // ==========================================

    async function saveSpec(spec) {
      const existing = await DB.get(spec.operationName);

      if (existing?.sha256Hash === spec.sha256Hash) {
        knownHashes.set(spec.operationName, spec.sha256Hash);
        return;
      }

      await DB.put(spec);
      knownHashes.set(spec.operationName, spec.sha256Hash);

      if (existing) {
        const oldHash = existing.sha256Hash.slice(0, 8);
        const newHash = spec.sha256Hash.slice(0, 8);
        console.log(`[API Collector] 🔄 更新: ${spec.operationName} (${oldHash}... → ${newHash}...)`);
      } else {
        console.log(`[API Collector] 🆕 新規: ${spec.operationName}`);
      }
    }

    // ==========================================
    // Markdown 生成
    // ==========================================

    function generateMarkdown(specs) {
      const sorted = [...specs].sort((a, b) => a.operationName.localeCompare(b.operationName));
      const lines = [
        '# Henry API Reference',
        '',
        `> 生成日時: ${new Date().toLocaleString('ja-JP')}`,
        `> 収集済み API: ${specs.length} 件`,
        '',
        '## 目次 (Table of Contents)',
        ''
      ];

      // 目次生成
      for (const spec of sorted) {
        lines.push(`- [${spec.operationName}](#${spec.operationName.toLowerCase()})`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');

      // API詳細
      for (const spec of sorted) {
        lines.push(`## ${spec.operationName}`);
        lines.push('');
        lines.push(`**Hash**: \`${spec.sha256Hash}\``);
        lines.push('');
        lines.push('### Variables');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(spec.variables, null, 2));
        lines.push('```');
        lines.push('');
        lines.push('### Response Schema');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(spec.schema, null, 2));
        lines.push('```');
        lines.push('');
        lines.push('---');
        lines.push('');
      }

      return lines.join('\n');
    }

    // ==========================================
    // ファイルダウンロード
    // ==========================================

    function downloadText(content, filename) {
      const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // ==========================================
    // モーダル用コンテンツ生成
    // ==========================================

    function createApiListContent(specs) {
      const container = document.createElement('div');

      // 件数表示
      const countDiv = document.createElement('div');
      countDiv.style.cssText = `
        font-size: 14px;
        color: var(--henry-text-med, rgba(0,0,0,0.57));
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--henry-border, rgba(0,0,0,0.13));
      `;
      countDiv.textContent = `収集件数: ${specs.length} 件`;
      container.appendChild(countDiv);

      if (specs.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = `
          color: var(--henry-text-disabled, rgba(0,0,0,0.38));
          font-size: 13px;
          text-align: center;
          padding: 20px 0;
        `;
        emptyDiv.textContent = 'まだ API が収集されていません。Henry を操作すると自動的に収集されます。';
        container.appendChild(emptyDiv);
        return container;
      }

      // API リスト
      const listDiv = document.createElement('div');
      listDiv.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        font-family: 'SF Mono', Monaco, 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.6;
      `;

      const sorted = [...specs].sort((a, b) => a.operationName.localeCompare(b.operationName));

      for (const spec of sorted) {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = `
          padding: 4px 8px;
          border-radius: 3px;
          cursor: default;
        `;
        itemDiv.textContent = spec.operationName;

        // ホバーエフェクト
        itemDiv.addEventListener('mouseenter', () => {
          itemDiv.style.backgroundColor = 'var(--henry-bg-hover, rgba(0,0,0,0.04))';
        });
        itemDiv.addEventListener('mouseleave', () => {
          itemDiv.style.backgroundColor = 'transparent';
        });

        listDiv.appendChild(itemDiv);
      }

      container.appendChild(listDiv);
      return container;
    }

    // ==========================================
    // モーダル表示とダウンロード
    // ==========================================

    async function showApiCollectorModal() {
      try {
        const specs = await DB.getAll();
        const content = createApiListContent(specs);

        const actions = [
          { label: '閉じる', variant: 'secondary' }
        ];

        // データがある場合のみダウンロードボタンを追加
        if (specs.length > 0) {
          actions.push({
            label: 'ダウンロード',
            variant: 'primary',
            onClick: async () => {
              const markdown = generateMarkdown(specs);
              const timestamp = new Date().toISOString().slice(0, 10);
              downloadText(markdown, `henry-api-reference_${timestamp}.md`);
              await DB.setMeta('lastExport', new Date().toISOString());
              console.log(`[API Collector] エクスポート完了: ${specs.length} 件`);
            }
          });
        }

        HenryCore.ui.showModal({
          title: '📋 収集済み API',
          content,
          actions
        });

      } catch (e) {
        errorOnce('modal-error', 'モーダル表示失敗:', e.message);
        // フォールバック: alert を使用
        alert('API コレクターの表示に失敗しました: ' + e.message);
      }
    }

    // ==========================================
    // UI コントローラー連携
    // ==========================================

    function registerToToolbox() {
      window.HenryToolbox = window.HenryToolbox || { items: [] };

      window.HenryToolbox.register?.({
        label: '📋 API コレクター',
        event: 'henry:api-collector',
        order: 50
      });

      window.addEventListener('henry:api-collector', showApiCollectorModal);

      getLogger().info('✅ Toolbox に登録完了');
    }

    // ==========================================
    // 公開 API
    // ==========================================

    window.HenryAPICollector = {
      list: async () => {
        const specs = await DB.getAll();
        console.log(`[API Collector] 収集済み: ${specs.length} 件`);
        specs.forEach(s => console.log(`  - ${s.operationName}`));
        return specs;
      },
      get: async (name) => {
        const spec = await DB.get(name);
        console.log(spec ? JSON.stringify(spec, null, 2) : `${name} は未収集`);
        return spec;
      },
      export: async () => generateMarkdown(await DB.getAll()),
      download: () => window.dispatchEvent(new CustomEvent('henry:api-collector')),
      clear: async () => {
        if (!confirm('全データを削除しますか？')) return;
        await DB.clear();
        knownHashes.clear();
        loggedErrors.clear();
        console.log('[API Collector] クリア完了');
      },
      status: async () => {
        const specs = await DB.getAll();
        const lastExport = await DB.getMeta('lastExport');
        console.log(`収集: ${specs.length} 件 | キャッシュ: ${knownHashes.size} | 最終出力: ${lastExport || 'なし'}`);
        return { count: specs.length, cached: knownHashes.size, lastExport };
      }
    };

    // ==========================================
    // 初期化
    // ==========================================

    (async () => {
      try {
        await DB.open();

        const specs = await DB.getAll();
        for (const spec of specs) {
          knownHashes.set(spec.operationName, spec.sha256Hash);
        }

        dbReady = true;

        for (const spec of captureQueue) {
          await saveSpec(spec);
        }
        captureQueue = [];

        console.log(`[API Collector] Ready - 収集済み: ${specs.length} 件`);

        // HenryCore.ui を待機（モーダル表示に必要）
        const henryUI = await waitFor(() => window.HenryCore?.ui?.showModal, 10000);

        if (!henryUI) {
          console.log('[API Collector] HenryCore.ui 未検出（コンソールから HenryAPICollector.download() で出力可能）');
          return;
        }

        // HenryToolbox を待機
        const toolbox = await waitFor(() => window.HenryToolbox?.register, 10000);

        if (toolbox) {
          registerToToolbox();
        } else {
          console.log('[API Collector] Toolbox 未検出（コンソールから HenryAPICollector.download() で出力可能）');
        }

      } catch (e) {
        errorOnce('init-error', '初期化失敗:', e.message);
      }
    })();
  }
})();
