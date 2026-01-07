// ==UserScript==
// @name         Google Drive直接連携
// @namespace    https://henry-app.jp/
// @version      1.0.1
// @description  HenryのファイルをGoogle Drive APIで直接変換・編集。GAS不要版。
// @match        https://henry-app.jp/*
// @match        https://docs.google.com/document/d/*
// @match        https://docs.google.com/spreadsheets/d/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// @connect      googleapis.com
// @connect      accounts.google.com
// @connect      oauth2.googleapis.com
// @connect      www.googleapis.com
// @connect      storage.googleapis.com
// @connect      henry-app.jp
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_drive_direct.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_drive_direct.user.js
// ==/UserScript==

(function() {
  'use strict';

  // ==========================================
  // 設定（GCPコンソールで取得した値を設定）
  // ==========================================
  const CONFIG = {
    // OAuth設定（ユーザーが設定）
    CLIENT_ID: '',      // GCPコンソールで取得した値をここに設定
    CLIENT_SECRET: '',  // GCPコンソールで取得した値をここに設定

    // 固定設定
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    REDIRECT_URI: 'https://henry-app.jp/',
    AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
    DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
    DRIVE_UPLOAD_BASE: 'https://www.googleapis.com/upload/drive/v3',

    // Henry設定
    HENRYCORE_TIMEOUT: 5000,
    ORG_UUID: 'ce6b556b-2a8d-4fce-b8dd-89ba638fc825',
    GRAPHQL_ENDPOINT: '/graphql'
  };

  // MIMEタイプマッピング
  const MIME_TYPES = {
    docx: {
      source: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      google: 'application/vnd.google-apps.document'
    },
    xlsx: {
      source: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      google: 'application/vnd.google-apps.spreadsheet'
    }
  };

  const CONVERTIBLE_TYPES = new Set(['FILE_TYPE_DOCX', 'FILE_TYPE_XLSX']);

  const isHenry = location.host === 'henry-app.jp';
  const isGoogleDocs = location.host === 'docs.google.com';

  // ==========================================
  // ユーティリティ
  // ==========================================
  function debugLog(context, ...args) {
    console.log(`[DriveDirect:${context}]`, ...args);
  }

  function debugError(context, ...args) {
    console.error(`[DriveDirect:${context}]`, ...args);
  }

  // ==========================================
  // OAuth認証モジュール
  // ==========================================
  const OAuth = {
    STORAGE_KEY: 'google_drive_tokens',

    // トークン取得
    getTokens() {
      return GM_getValue(this.STORAGE_KEY, null);
    },

    // トークン保存
    saveTokens(tokens) {
      const data = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || this.getTokens()?.refresh_token,
        expires_at: Date.now() + (tokens.expires_in * 1000) - 60000 // 1分前に期限切れとみなす
      };
      GM_setValue(this.STORAGE_KEY, data);
      debugLog('OAuth', 'トークン保存完了');
      return data;
    },

    // トークン削除（ログアウト）
    clearTokens() {
      GM_deleteValue(this.STORAGE_KEY);
      debugLog('OAuth', 'トークン削除完了');
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

      // リフレッシュが必要
      debugLog('OAuth', 'アクセストークンをリフレッシュ中...');
      return await this.refreshAccessToken();
    },

    // アクセストークンをリフレッシュ
    async refreshAccessToken() {
      const tokens = this.getTokens();
      if (!tokens?.refresh_token) {
        throw new Error('リフレッシュトークンがありません');
      }

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.TOKEN_ENDPOINT,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: new URLSearchParams({
            client_id: CONFIG.CLIENT_ID,
            client_secret: CONFIG.CLIENT_SECRET,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token'
          }).toString(),
          onload: (response) => {
            if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              const saved = this.saveTokens(data);
              debugLog('OAuth', 'トークンリフレッシュ成功');
              resolve(saved.access_token);
            } else {
              debugError('OAuth', 'リフレッシュ失敗:', response.responseText);
              // リフレッシュトークンが無効になった場合はクリア
              if (response.status === 400 || response.status === 401) {
                this.clearTokens();
              }
              reject(new Error('トークンリフレッシュに失敗しました'));
            }
          },
          onerror: (err) => {
            debugError('OAuth', 'リフレッシュエラー:', err);
            reject(new Error('トークンリフレッシュ通信エラー'));
          }
        });
      });
    },

    // 認証URLを生成
    getAuthUrl() {
      const params = new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        redirect_uri: CONFIG.REDIRECT_URI,
        scope: CONFIG.SCOPES,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent'
      });
      return `${CONFIG.AUTH_ENDPOINT}?${params.toString()}`;
    },

    // 認証コードをトークンに交換
    async exchangeCodeForTokens(code) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: CONFIG.TOKEN_ENDPOINT,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: new URLSearchParams({
            client_id: CONFIG.CLIENT_ID,
            client_secret: CONFIG.CLIENT_SECRET,
            code: code,
            redirect_uri: CONFIG.REDIRECT_URI,
            grant_type: 'authorization_code'
          }).toString(),
          onload: (response) => {
            if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              const saved = this.saveTokens(data);
              debugLog('OAuth', '認証コード交換成功');
              resolve(saved);
            } else {
              debugError('OAuth', 'コード交換失敗:', response.responseText);
              reject(new Error('認証に失敗しました'));
            }
          },
          onerror: (err) => {
            debugError('OAuth', 'コード交換エラー:', err);
            reject(new Error('認証通信エラー'));
          }
        });
      });
    },

    // 認証開始（ポップアップ）
    startAuth() {
      const authUrl = this.getAuthUrl();
      debugLog('OAuth', '認証開始:', authUrl);
      GM_openInTab(authUrl, { active: true });
    }
  };

  // ==========================================
  // Google Drive APIモジュール
  // ==========================================
  const DriveAPI = {
    // APIリクエスト共通処理
    async request(method, url, options = {}) {
      const accessToken = await OAuth.getValidAccessToken();

      return new Promise((resolve, reject) => {
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers
        };

        GM_xmlhttpRequest({
          method,
          url,
          headers,
          data: options.body,
          responseType: options.responseType || 'text',
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              if (options.responseType === 'arraybuffer') {
                resolve(response.response);
              } else {
                try {
                  resolve(JSON.parse(response.responseText));
                } catch {
                  resolve(response.responseText);
                }
              }
            } else if (response.status === 401) {
              // トークン期限切れ、リフレッシュ後にリトライ
              OAuth.refreshAccessToken()
                .then(() => this.request(method, url, options))
                .then(resolve)
                .catch(reject);
            } else {
              debugError('DriveAPI', `Error ${response.status}:`, response.responseText);
              reject(new Error(`API Error: ${response.status}`));
            }
          },
          onerror: (err) => {
            debugError('DriveAPI', 'Network error:', err);
            reject(new Error('API通信エラー'));
          }
        });
      });
    },

    // Multipart Uploadでファイルをアップロード（変換付き）
    async uploadWithConversion(fileName, fileBlob, sourceMimeType, targetMimeType, properties = {}) {
      const accessToken = await OAuth.getValidAccessToken();

      const boundary = '-------' + Date.now().toString(16);

      // メタデータ
      const metadata = {
        name: fileName,
        mimeType: targetMimeType,
        properties: properties
      };

      // Multipartボディを構築
      const metadataPart = JSON.stringify(metadata);

      return new Promise((resolve, reject) => {
        // FileReader でBlobを読み込み
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result;
          const uint8Array = new Uint8Array(arrayBuffer);

          // Multipartリクエストを構築
          const beforeFile = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n--${boundary}\r\nContent-Type: ${sourceMimeType}\r\n\r\n`;
          const afterFile = `\r\n--${boundary}--`;

          const beforeBytes = new TextEncoder().encode(beforeFile);
          const afterBytes = new TextEncoder().encode(afterFile);

          // 全体を結合
          const body = new Uint8Array(beforeBytes.length + uint8Array.length + afterBytes.length);
          body.set(beforeBytes, 0);
          body.set(uint8Array, beforeBytes.length);
          body.set(afterBytes, beforeBytes.length + uint8Array.length);

          GM_xmlhttpRequest({
            method: 'POST',
            url: `${CONFIG.DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            data: body.buffer,
            onload: (response) => {
              if (response.status >= 200 && response.status < 300) {
                const result = JSON.parse(response.responseText);
                debugLog('DriveAPI', 'アップロード成功:', result.id);
                resolve(result);
              } else {
                debugError('DriveAPI', 'アップロード失敗:', response.status, response.responseText);
                reject(new Error(`Upload failed: ${response.status}`));
              }
            },
            onerror: (err) => {
              debugError('DriveAPI', 'アップロードエラー:', err);
              reject(new Error('アップロード通信エラー'));
            }
          });
        };
        reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
        reader.readAsArrayBuffer(fileBlob);
      });
    },

    // ファイルをエクスポート（Google形式 → Office形式）
    async exportFile(fileId, mimeType) {
      const accessToken = await OAuth.getValidAccessToken();
      const url = `${CONFIG.DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`;

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: { 'Authorization': `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
          onload: (response) => {
            if (response.status === 200) {
              resolve(response.response);
            } else {
              debugError('DriveAPI', 'エクスポート失敗:', response.status);
              reject(new Error(`Export failed: ${response.status}`));
            }
          },
          onerror: (err) => {
            debugError('DriveAPI', 'エクスポートエラー:', err);
            reject(new Error('エクスポート通信エラー'));
          }
        });
      });
    },

    // ファイルメタデータ取得
    async getFileMetadata(fileId, fields = 'id,name,properties') {
      const url = `${CONFIG.DRIVE_API_BASE}/files/${fileId}?fields=${fields}`;
      return await this.request('GET', url);
    },

    // ファイルプロパティ更新
    async updateFileProperties(fileId, properties) {
      const url = `${CONFIG.DRIVE_API_BASE}/files/${fileId}`;
      return await this.request('PATCH', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties })
      });
    },

    // ファイル削除
    async deleteFile(fileId) {
      const url = `${CONFIG.DRIVE_API_BASE}/files/${fileId}`;
      return await this.request('DELETE', url);
    }
  };

  // ==========================================
  // Henry APIモジュール
  // ==========================================
  const HenryAPI = {
    QUERIES: {
      GetFileUploadUrl: `
        query GetFileUploadUrl($input: GetFileUploadUrlRequestInput!) {
          getFileUploadUrl(input: $input) {
            uploadUrl
            fileUrl
          }
        }
      `,
      CreatePatientFile: `
        mutation CreatePatientFile($input: CreatePatientFileRequestInput!) {
          createPatientFile(input: $input) {
            uuid
          }
        }
      `,
      DeletePatientFile: `
        mutation DeletePatientFile($input: DeletePatientFileRequestInput!) {
          deletePatientFile(input: $input)
        }
      `
    },

    async call(token, operationName, variables) {
      const query = this.QUERIES[operationName];
      if (!query) {
        throw new Error(`Unknown operation: ${operationName}`);
      }

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: `https://henry-app.jp${CONFIG.GRAPHQL_ENDPOINT}`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-organization-uuid': CONFIG.ORG_UUID
          },
          data: JSON.stringify({ operationName, variables, query }),
          onload: (response) => {
            if (response.status === 200) {
              const body = JSON.parse(response.responseText);
              if (body.errors) {
                reject(new Error(body.errors[0].message));
              } else {
                resolve(body.data);
              }
            } else {
              reject(new Error(`Henry API Error: ${response.status}`));
            }
          },
          onerror: () => reject(new Error('Henry API通信エラー'))
        });
      });
    },

    async uploadToGCS(uploadUrl, blob, fileName) {
      const formData = new FormData();
      formData.append('file', blob, fileName);

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: uploadUrl,
          data: formData,
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              resolve();
            } else {
              reject(new Error(`GCS Upload Error: ${response.status}`));
            }
          },
          onerror: () => reject(new Error('GCSアップロード通信エラー'))
        });
      });
    }
  };

  // ==========================================
  // UI共通
  // ==========================================
  function showToast(message, isError = false, duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      borderRadius: '8px',
      backgroundColor: isError ? '#d93025' : '#1a73e8',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '100000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showProcessingIndicator(message) {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: 'rgba(33, 33, 33, 0.95)',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '24px',
      zIndex: '100000',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontFamily: '-apple-system, sans-serif',
      fontSize: '14px'
    });

    // スピナー
    if (!document.getElementById('drive-direct-spin-style')) {
      const style = document.createElement('style');
      style.id = 'drive-direct-spin-style';
      style.textContent = `@keyframes drive-direct-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid #ffffff',
      borderRadius: '50%',
      animation: 'drive-direct-spin 1s linear infinite'
    });

    const text = document.createElement('span');
    text.textContent = message;

    container.appendChild(spinner);
    container.appendChild(text);
    document.body.appendChild(container);

    return () => {
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 300);
    };
  }

  // ==========================================
  // 設定チェック
  // ==========================================
  function checkConfig() {
    if (!CONFIG.CLIENT_ID || !CONFIG.CLIENT_SECRET) {
      debugError('Config', 'CLIENT_ID または CLIENT_SECRET が設定されていません');
      return false;
    }
    return true;
  }

  // ==========================================
  // メイン分岐
  // ==========================================
  debugLog('Init', `起動: ${isHenry ? 'Henry' : 'Google Docs'}モード`);

  if (isHenry) {
    runHenryMode();
  } else if (isGoogleDocs) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runGoogleDocsMode);
    } else {
      runGoogleDocsMode();
    }
  }

  // ==========================================
  // [Mode A] Henry側ロジック
  // ==========================================
  function runHenryMode() {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const cachedFilesByFolder = new Map();
    let log = null;
    const inflight = new Map();

    // OAuth認証コード検出
    function checkForAuthCode() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        debugLog('OAuth', '認証コードを検出:', code.substring(0, 20) + '...');

        // URLからcodeパラメータを削除
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // トークン交換
        OAuth.exchangeCodeForTokens(code)
          .then(() => {
            showToast('Google認証が完了しました');
          })
          .catch((err) => {
            showToast('認証に失敗しました: ' + err.message, true);
          });
      }
    }

    // トークンリクエストに応答（他タブからのリクエスト用）
    function setupTokenRequestListener() {
      GM_addValueChangeListener('drive_direct_token_request', async (name, oldVal, newVal, remote) => {
        if (!remote || !newVal?.requestId) return;

        debugLog('Henry', 'トークンリクエスト受信:', newVal.requestId);

        if (!pageWindow.HenryCore) return;

        const token = await pageWindow.HenryCore.getToken();
        if (token) {
          GM_setValue('drive_direct_henry_token', {
            token,
            requestId: newVal.requestId,
            savedAt: Date.now()
          });
        }
      });
    }

    // リフレッシュリクエストに応答
    function setupRefreshListener() {
      let lastRefreshCheck = Date.now();

      GM_addValueChangeListener('drive_direct_refresh_request', (name, oldVal, newVal, remote) => {
        if (!remote || !newVal) return;
        if (newVal.timestamp <= lastRefreshCheck) return;

        lastRefreshCheck = newVal.timestamp;
        debugLog('Henry', 'リフレッシュ要求を検知');

        if (pageWindow.__APOLLO_CLIENT__) {
          try {
            pageWindow.__APOLLO_CLIENT__.refetchQueries({ include: ['ListPatientFiles'] });
          } catch (e) {
            debugError('Henry', 'refetch失敗:', e.message);
          }
        }
      });
    }

    // Fetchインターセプト（ファイル一覧キャッシュ用）
    function setupFetchIntercept() {
      if (pageWindow._driveDirectHooked) return;
      const originalFetch = pageWindow.fetch;
      pageWindow._driveDirectHooked = true;

      pageWindow.fetch = async function(url, options) {
        const response = await originalFetch.apply(this, arguments);

        if (!url.includes('/graphql') || !options?.body) return response;

        try {
          const bodyStr = typeof options.body === 'string' ? options.body : null;
          if (!bodyStr) return response;

          const requestJson = JSON.parse(bodyStr);
          if (requestJson.operationName !== 'ListPatientFiles') return response;

          const requestFolderUuid = requestJson.variables?.input?.parentFileFolderUuid?.value ?? null;
          const pageToken = requestJson.variables?.input?.pageToken ?? '';
          const clone = response.clone();
          const json = await clone.json();
          const patientFiles = json.data?.listPatientFiles?.patientFiles;

          if (!Array.isArray(patientFiles)) return response;

          const folderKey = requestFolderUuid ?? '__root__';
          const filesWithFolder = patientFiles.map(f => ({
            ...f,
            parentFileFolderUuid: requestFolderUuid
          }));

          if (pageToken === '') {
            cachedFilesByFolder.set(folderKey, filesWithFolder);
          } else {
            const existing = cachedFilesByFolder.get(folderKey) || [];
            cachedFilesByFolder.set(folderKey, [...existing, ...filesWithFolder]);
          }
        } catch (e) {
          debugError('Henry', 'Fetch Hook Error:', e.message);
        }

        return response;
      };
    }

    // GCSからファイルをダウンロード
    async function downloadFromGCS(fileUrl, token) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: fileUrl,
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'arraybuffer',
          onload: (response) => {
            if (response.status === 200) {
              resolve(response.response);
            } else {
              reject(new Error(`Download failed: ${response.status}`));
            }
          },
          onerror: () => reject(new Error('ダウンロード通信エラー'))
        });
      });
    }

    // ダブルクリックハンドラ
    async function handleDoubleClick(event) {
      if (event.target.closest('input, textarea, button, a')) return;

      const row = event.target.closest('li[role="button"][aria-roledescription="draggable"]');
      if (!row) return;

      const spans = row.querySelectorAll('span');
      const fileName = spans[0]?.textContent?.trim();
      const dateStr = spans[1]?.textContent?.trim();
      if (!fileName) return;

      // ファイル検索
      const findFileByNameAndDate = (fileName, dateStr) => {
        const candidates = [];
        for (const files of cachedFilesByFolder.values()) {
          for (const f of files) {
            if (f.file?.title === fileName) {
              candidates.push(f);
            }
          }
        }

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        if (dateStr) {
          const matched = candidates.find(f => {
            const ts = f.createTime?.seconds;
            if (!ts) return false;
            const date = new Date(ts * 1000);
            const formatted = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            return formatted === dateStr;
          });
          if (matched) return matched;
        }

        return candidates[0];
      };

      const fileData = findFileByNameAndDate(fileName, dateStr);
      if (!fileData?.file) return;

      const file = fileData.file;
      const fileUrl = file.redirectUrl;
      if (!fileUrl?.includes('storage.googleapis.com')) return;
      if (!CONVERTIBLE_TYPES.has(file.fileType)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const patientFileUuid = fileData.uuid;
      const folderUuid = fileData.parentFileFolderUuid || null;

      if (inflight.has(patientFileUuid)) return;

      // 設定チェック
      if (!checkConfig()) {
        showToast('OAuth設定が未完了です。スクリプトを設定してください。', true);
        return;
      }

      // 認証チェック
      if (!OAuth.isAuthenticated()) {
        showToast('Google認証が必要です。認証画面を開きます...', false, 2000);
        setTimeout(() => OAuth.startAuth(), 1000);
        return;
      }

      if (!pageWindow.HenryCore) return;
      const patientUuid = pageWindow.HenryCore.getPatientUuid();
      if (!patientUuid) return;

      inflight.set(patientFileUuid, true);
      const hide = showProcessingIndicator(`書類を開いています... (${file.title})`);

      try {
        const totalStart = performance.now();
        const henryToken = await pageWindow.HenryCore.getToken();

        // 1. GCSからダウンロード
        const step1Start = performance.now();
        debugLog('Henry', '[PERF] Step 1: GCSからダウンロード開始...');
        const fileBuffer = await downloadFromGCS(fileUrl, henryToken);
        const blob = new Blob([fileBuffer]);
        const step1Time = performance.now() - step1Start;
        debugLog('Henry', `[PERF] Step 1: GCSダウンロード完了 - ${step1Time.toFixed(0)}ms`);

        // 2. ファイルタイプ判定
        const isDocx = file.fileType === 'FILE_TYPE_DOCX';
        const mimeInfo = isDocx ? MIME_TYPES.docx : MIME_TYPES.xlsx;

        // 3. Google Driveにアップロード（変換付き）
        const step3Start = performance.now();
        debugLog('Henry', '[PERF] Step 3: Google Driveアップロード開始...');
        const driveFile = await DriveAPI.uploadWithConversion(
          file.title,
          blob,
          mimeInfo.source,
          mimeInfo.google,
          {
            henryPatientId: patientUuid,
            henryFileUuid: patientFileUuid,
            henryFolderUuid: folderUuid || '',
            henrySource: 'drive-direct'
          }
        );
        const step3Time = performance.now() - step3Start;
        debugLog('Henry', `[PERF] Step 3: Driveアップロード完了 - ${step3Time.toFixed(0)}ms`);

        // 4. Google Docsで開く
        const docType = isDocx ? 'document' : 'spreadsheets';
        const openUrl = `https://docs.google.com/${docType}/d/${driveFile.id}/edit`;

        const totalTime = performance.now() - totalStart;
        console.log(`%c[DriveDirect] ファイルを開く 合計時間: ${totalTime.toFixed(0)}ms (GCS: ${step1Time.toFixed(0)}ms, Drive: ${step3Time.toFixed(0)}ms)`, 'color: #4CAF50; font-weight: bold; font-size: 14px;');

        debugLog('Henry', 'ファイルを開きます:', openUrl);
        GM_openInTab(openUrl, { active: true });

        showToast(`ファイルを開きました (${(totalTime/1000).toFixed(1)}秒)`);

      } catch (e) {
        debugError('Henry', '処理失敗:', e.message);
        showToast(`エラー: ${e.message}`, true);
      } finally {
        hide();
        inflight.delete(patientFileUuid);
      }
    }

    // 認証ボタンをToolboxに追加
    async function addAuthButton() {
      if (!pageWindow.HenryCore?.registerPlugin) return;

      const isAuth = OAuth.isAuthenticated();

      await pageWindow.HenryCore.registerPlugin({
        id: 'google-drive-direct-auth',
        name: isAuth ? 'Google認証済み' : 'Google認証',
        icon: isAuth ? '✅' : '🔐',
        description: isAuth ? 'Google Drive連携が有効です' : 'Google Driveと連携するには認証が必要です',
        version: '1.0.0',
        order: 200,
        onClick: () => {
          if (isAuth) {
            if (confirm('Google認証を解除しますか？')) {
              OAuth.clearTokens();
              showToast('認証を解除しました。ページを再読み込みしてください。');
            }
          } else {
            OAuth.startAuth();
          }
        }
      });
    }

    // 初期化
    async function init() {
      debugLog('Henry', '初期化開始...');

      checkForAuthCode();
      setupTokenRequestListener();
      setupRefreshListener();

      let waited = 0;
      while (!pageWindow.HenryCore) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
        if (waited > CONFIG.HENRYCORE_TIMEOUT) {
          debugError('Henry', 'HenryCore が見つかりません');
          return;
        }
      }

      log = pageWindow.HenryCore.utils.createLogger('DriveDirect');
      setupFetchIntercept();
      await addAuthButton();

      const cleaner = pageWindow.HenryCore.utils.createCleaner();
      pageWindow.HenryCore.utils.subscribeNavigation(cleaner, () => {
        cachedFilesByFolder.clear();
        const handler = (e) => handleDoubleClick(e);
        document.addEventListener('dblclick', handler, true);
        cleaner.add(() => document.removeEventListener('dblclick', handler, true));
        log.info('Ready (v1.0.0)');
      });
    }

    init();
  }

  // ==========================================
  // [Mode B] Google Docs側ロジック
  // ==========================================
  function runGoogleDocsMode() {
    debugLog('Docs', 'Google Docsモード開始');

    // Henryトークンをリクエスト
    function requestHenryToken(timeout = 3000) {
      return new Promise((resolve) => {
        const requestId = Date.now() + Math.random();
        let resolved = false;

        const listenerId = GM_addValueChangeListener('drive_direct_henry_token', (name, oldVal, newVal, remote) => {
          if (resolved) return;
          if (remote && newVal?.requestId === requestId) {
            resolved = true;
            GM_removeValueChangeListener(listenerId);
            resolve(newVal.token);
          }
        });

        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          GM_removeValueChangeListener(listenerId);
          const cached = GM_getValue('drive_direct_henry_token');
          resolve(cached?.token || null);
        }, timeout);

        GM_setValue('drive_direct_token_request', { requestId });
      });
    }

    // Henryへリフレッシュ要求
    function notifyHenryToRefresh(patientId) {
      GM_setValue('drive_direct_refresh_request', {
        timestamp: Date.now(),
        patientId
      });
    }

    // Henryへ保存ボタン作成
    function createHenryButton() {
      if (document.getElementById('drive-direct-save-container')) return;

      const shareBtn = document.getElementById('docs-titlebar-share-client-button');
      let targetParent = shareBtn?.parentNode || document.querySelector('.docs-titlebar-buttons');
      if (!targetParent) return;

      const container = document.createElement('div');
      container.id = 'drive-direct-save-container';
      Object.assign(container.style, {
        position: 'relative',
        display: 'inline-block',
        marginRight: '8px',
        marginLeft: '8px',
        zIndex: '1000'
      });

      const btn = document.createElement('div');
      btn.id = 'drive-direct-save-btn';
      btn.textContent = 'Henryへ保存 ▼';
      Object.assign(btn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '36px',
        padding: '0 16px',
        backgroundColor: '#212121',
        color: '#fff',
        borderRadius: '18px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        userSelect: 'none',
        fontFamily: '"Google Sans",Roboto,sans-serif',
        whiteSpace: 'nowrap'
      });

      btn.onmouseover = () => btn.style.backgroundColor = '#424242';
      btn.onmouseout = () => btn.style.backgroundColor = '#212121';

      const menu = document.createElement('div');
      menu.id = 'drive-direct-save-menu';
      Object.assign(menu.style, {
        display: 'none',
        position: 'absolute',
        top: '40px',
        left: '0',
        right: '0',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: '1001'
      });

      const createMenuItem = (text, onClick) => {
        const item = document.createElement('div');
        item.textContent = text;
        Object.assign(item.style, {
          padding: '12px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          textAlign: 'center'
        });
        item.onmouseover = () => item.style.backgroundColor = '#f5f5f5';
        item.onmouseout = () => item.style.backgroundColor = '#fff';
        item.onclick = () => {
          menu.style.display = 'none';
          onClick();
        };
        return item;
      };

      const overwriteItem = createMenuItem('上書き保存', () => handleSaveToHenry('overwrite'));
      overwriteItem.style.borderBottom = '1px solid #eee';
      menu.appendChild(overwriteItem);
      menu.appendChild(createMenuItem('新規保存', () => handleSaveToHenry('new')));

      btn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      };

      document.addEventListener('click', () => { menu.style.display = 'none'; });

      container.appendChild(btn);
      container.appendChild(menu);

      if (shareBtn) {
        targetParent.insertBefore(container, shareBtn);
      } else {
        targetParent.appendChild(container);
      }

      debugLog('Docs', 'ボタン作成完了');
    }

    // Henryへ保存処理
    async function handleSaveToHenry(mode = 'overwrite') {
      debugLog('Docs', '=== handleSaveToHenry 開始 ===');
      debugLog('Docs', '  モード:', mode);

      const btn = document.getElementById('drive-direct-save-btn');
      const originalText = btn.textContent;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.7';
      btn.textContent = '処理中...';

      try {
        // 設定チェック
        if (!checkConfig()) {
          throw new Error('OAuth設定が未完了です');
        }

        // Google Drive認証チェック
        if (!OAuth.isAuthenticated()) {
          throw new Error('Google認証が必要です。Henryタブで認証してください。');
        }

        // ドキュメントID取得
        const docId = window.location.pathname.split('/')[3];
        if (!docId) throw new Error('ドキュメントIDが取得できません');

        const totalStart = performance.now();

        // メタデータ取得
        debugLog('Docs', '[PERF] メタデータ取得中...');
        const metadata = await DriveAPI.getFileMetadata(docId, 'id,name,properties');
        const props = metadata.properties || {};

        if (!props.henryPatientId) {
          throw new Error('Henryメタデータがありません。Henryから開いたファイルですか？');
        }

        // Henryトークン取得
        debugLog('Docs', 'Henryトークン取得中...');
        const henryToken = await requestHenryToken();
        if (!henryToken) {
          throw new Error('Henryトークンを取得できません。Henryタブを開いてください。');
        }

        // ファイルタイプ判定
        const isSpreadsheet = window.location.href.includes('/spreadsheets/');
        const mimeInfo = isSpreadsheet ? MIME_TYPES.xlsx : MIME_TYPES.docx;
        const extension = isSpreadsheet ? 'xlsx' : 'docx';
        const fileName = metadata.name.endsWith(`.${extension}`)
          ? metadata.name
          : `${metadata.name}.${extension}`;

        // エクスポート
        const exportStart = performance.now();
        debugLog('Docs', '[PERF] エクスポート開始...');
        const fileBuffer = await DriveAPI.exportFile(docId, mimeInfo.source);
        const blob = new Blob([fileBuffer], { type: mimeInfo.source });
        const exportTime = performance.now() - exportStart;
        debugLog('Docs', `[PERF] エクスポート完了 - ${exportTime.toFixed(0)}ms`);

        // 上書きモードの場合、既存ファイル削除
        if (mode === 'overwrite' && props.henryFileUuid) {
          debugLog('Docs', '既存ファイル削除中...');
          try {
            await HenryAPI.call(henryToken, 'DeletePatientFile', {
              input: { uuid: props.henryFileUuid }
            });
          } catch (e) {
            debugLog('Docs', '既存ファイル削除スキップ:', e.message);
          }
        }

        // Henryにアップロード
        const uploadStart = performance.now();
        debugLog('Docs', '[PERF] Henryアップロード開始...');
        const uploadUrlResult = await HenryAPI.call(henryToken, 'GetFileUploadUrl', {
          input: { pathType: 'PATIENT_FILE' }
        });
        const { uploadUrl, fileUrl } = uploadUrlResult.getFileUploadUrl;

        await HenryAPI.uploadToGCS(uploadUrl, blob, fileName);

        const createResult = await HenryAPI.call(henryToken, 'CreatePatientFile', {
          input: {
            patientUuid: props.henryPatientId,
            parentFileFolderUuid: props.henryFolderUuid ? { value: props.henryFolderUuid } : null,
            title: fileName,
            description: '',
            fileUrl: fileUrl
          }
        });
        const uploadTime = performance.now() - uploadStart;
        debugLog('Docs', `[PERF] Henryアップロード完了 - ${uploadTime.toFixed(0)}ms`);

        const newFileUuid = createResult?.createPatientFile?.uuid;

        // メタデータ更新
        if (newFileUuid) {
          debugLog('Docs', 'メタデータ更新中...');
          await DriveAPI.updateFileProperties(docId, {
            ...props,
            henryFileUuid: newFileUuid
          });
        }

        // Henryへリフレッシュ通知
        notifyHenryToRefresh(props.henryPatientId);

        const totalTime = performance.now() - totalStart;
        console.log(`%c[DriveDirect] 保存 合計時間: ${totalTime.toFixed(0)}ms (Export: ${exportTime.toFixed(0)}ms, Upload: ${uploadTime.toFixed(0)}ms)`, 'color: #2196F3; font-weight: bold; font-size: 14px;');

        const actionText = mode === 'overwrite' ? '上書き保存' : '新規保存';
        showToast(`Henryへ${actionText}しました (${(totalTime/1000).toFixed(1)}秒)`);

      } catch (e) {
        debugError('Docs', 'エラー:', e.message);
        showToast(`エラー: ${e.message}`, true, 5000);
      } finally {
        btn.textContent = originalText;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      }
    }

    // 初期化
    createHenryButton();

    const observer = new MutationObserver(() => {
      if (!document.getElementById('drive-direct-save-container')) {
        createHenryButton();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

})();
