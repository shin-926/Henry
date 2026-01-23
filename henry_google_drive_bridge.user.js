// ==UserScript==
// @name         Google Drive連携
// @namespace    https://henry-app.jp/
// @version      2.4.0
// @description  HenryのファイルをGoogle Drive APIで直接変換・編集。GAS不要版。
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @match        https://docs.google.com/*
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
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_drive_bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_drive_bridge.user.js
// ==/UserScript==

/*
 * 【Google Drive連携】
 *
 * ■ 使用場面
 * - HenryのファイルをGoogle Driveに保存・編集したい場合
 * - Google Docs形式に変換したい場合
 *
 * ■ 主な機能
 * - Google Drive APIへの直接アクセス（GAS不要）
 * - ファイルのアップロード・ダウンロード
 * - Google Docs形式への変換
 *
 * ■ 依存関係
 * - henry_core.user.js: GoogleAuth API（OAuth認証）
 *
 * ■ 初回設定
 * - Google OAuthの設定が必要
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;

  // ==========================================
  // 設定
  // ==========================================
  const CONFIG = {
    // Google API設定
    DRIVE_API_BASE: 'https://www.googleapis.com/drive/v3',
    DRIVE_UPLOAD_BASE: 'https://www.googleapis.com/upload/drive/v3',
    TEMP_FOLDER_NAME: 'Henry一時ファイル',

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

  // debounce: 連続呼び出しを抑制
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ==========================================
  // GoogleAuth取得ヘルパー（HenryCore.modules.GoogleAuth経由）
  // ==========================================
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  function getGoogleAuth() {
    return pageWindow.HenryCore?.modules?.GoogleAuth;
  }

  async function waitForGoogleAuth(timeout = 5000) {
    let waited = 0;
    while (!getGoogleAuth()) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) {
        debugError('Init', 'HenryCore.modules.GoogleAuth が見つかりません');
        return null;
      }
    }
    return getGoogleAuth();
  }

  // ========================================== 
  // Google Drive APIモジュール
  // ========================================== 
  const DriveAPI = {
    // APIリクエスト共通処理
    async request(method, url, options = {}) {
      const accessToken = await getGoogleAuth().getValidAccessToken();

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
              getGoogleAuth().refreshAccessToken()
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
    async uploadWithConversion(fileName, fileBlob, sourceMimeType, targetMimeType, properties = {}, parentFolderId = null) {
      const accessToken = await getGoogleAuth().getValidAccessToken();

      const boundary = '-------' + Date.now().toString(16);

      // メタデータ
      const metadata = {
        name: fileName,
        mimeType: targetMimeType,
        properties: properties
      };

      // 親フォルダを指定
      if (parentFolderId) {
        metadata.parents = [parentFolderId];
      }

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
      const accessToken = await getGoogleAuth().getValidAccessToken();
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
    },

    // フォルダを検索
    async findFolder(name) {
      const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const url = `${CONFIG.DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
      const result = await this.request('GET', url);
      return result.files?.[0] || null;
    },

    // フォルダを作成
    async createFolder(name) {
      const url = `${CONFIG.DRIVE_API_BASE}/files`;
      return await this.request('POST', url, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
    },

    // フォルダを取得または作成
    async getOrCreateFolder(name) {
      let folder = await this.findFolder(name);
      if (!folder) {
        folder = await this.createFolder(name);
        debugLog('DriveAPI', 'フォルダ作成:', name);
      }
      return folder;
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
      `,
      ListNonEmptyPatientFileFoldersOfPatient: `
        query ListNonEmptyPatientFileFoldersOfPatient($input: ListNonEmptyPatientFileFoldersOfPatientRequestInput!) {
          listNonEmptyPatientFileFoldersOfPatient(input: $input) {
            patientFileFolders {
              uuid
              name
            }
          }
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
      zIndex: '1500',
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
      zIndex: '1400',
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

  // フォルダ選択モーダル
  function showFolderSelectModal(folders) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: '1500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });

      const modal = document.createElement('div');
      Object.assign(modal.style, {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '300px',
        maxWidth: '400px',
        maxHeight: '70vh',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        fontFamily: '"Google Sans",Roboto,sans-serif'
      });

      const title = document.createElement('h3');
      title.textContent = '保存先フォルダを選択';
      Object.assign(title.style, {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '500'
      });

      const list = document.createElement('div');
      Object.assign(list.style, {
        maxHeight: '300px',
        overflowY: 'auto'
      });

      // ルートオプション
      const rootOption = document.createElement('div');
      rootOption.textContent = '📁 ルート（フォルダなし）';
      Object.assign(rootOption.style, {
        padding: '12px 16px',
        cursor: 'pointer',
        borderRadius: '8px',
        marginBottom: '4px'
      });
      rootOption.onmouseover = () => rootOption.style.backgroundColor = '#f5f5f5';
      rootOption.onmouseout = () => rootOption.style.backgroundColor = '#fff';
      rootOption.onclick = () => {
        overlay.remove();
        resolve({ uuid: null, name: 'ルート' });
      };
      list.appendChild(rootOption);

      // フォルダ一覧
      folders.forEach(folder => {
        const item = document.createElement('div');
        item.textContent = `📂 ${folder.name}`;
        Object.assign(item.style, {
          padding: '12px 16px',
          cursor: 'pointer',
          borderRadius: '8px',
          marginBottom: '4px'
        });
        item.onmouseover = () => item.style.backgroundColor = '#f5f5f5';
        item.onmouseout = () => item.style.backgroundColor = '#fff';
        item.onclick = () => {
          overlay.remove();
          resolve(folder);
        };
        list.appendChild(item);
      });

      // キャンセルボタン
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'キャンセル';
      Object.assign(cancelBtn.style, {
        marginTop: '16px',
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        width: '100%'
      });
      cancelBtn.onclick = () => {
        overlay.remove();
        resolve(null);
      };

      modal.appendChild(title);
      modal.appendChild(list);
      modal.appendChild(cancelBtn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
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

    // Fetchインターセプト（ファイル一覧キャッシュ + テンプレートダウンロード横取り）
    // Proxyを使用してネイティブfetchの振る舞いを保持し、FirestoreのWebChannel通信への影響を回避
    function setupFetchIntercept() {
      if (pageWindow._driveDirectHooked) return;
      const originalFetch = pageWindow.fetch;
      pageWindow._driveDirectHooked = true;

      pageWindow.fetch = new Proxy(originalFetch, {
        apply: async function(target, thisArg, argumentsList) {
          const [url, options] = argumentsList;
          const response = await Reflect.apply(target, thisArg, argumentsList);

          // GraphQL以外はそのまま返す
          if (!url?.includes?.('/graphql') || !options?.body) return response;

          try {
            const bodyStr = typeof options.body === 'string' ? options.body : null;
            if (!bodyStr) return response;

            const requestJson = JSON.parse(bodyStr);
            const opName = requestJson.operationName;

            // テンプレートダウンロードのインターセプト
            if (opName === 'GeneratePatientDocumentDownloadTemporaryFile') {
              const clone = response.clone();
              const json = await clone.json();
              const data = json.data?.patientDocumentDownloadTemporaryFile;

              if (data?.redirectUrl) {
                const patientId = requestJson.variables?.patientId;
                debugLog('Henry', 'テンプレートダウンロード検知:', data.title);

                // Google Docs処理を開始（非同期、レスポンス返却をブロックしない）
                handleTemplateDownload({
                  redirectUrl: data.redirectUrl,
                  title: data.title,
                  patientId: patientId
                });

                // 改変したレスポンスを返す（データをnullにしてHenry本体の処理を無効化）
                const modifiedJson = {
                  ...json,
                  data: {
                    ...json.data,
                    patientDocumentDownloadTemporaryFile: null
                  }
                };

                return new Response(JSON.stringify(modifiedJson), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
              }
            }

            // ファイル一覧のキャッシュ
            if (opName === 'ListPatientFiles') {
              const requestFolderUuid = requestJson.variables?.input?.parentFileFolderUuid?.value ?? null;
              const pageToken = requestJson.variables?.input?.pageToken ?? '';
              const clone = response.clone();
              const json = await clone.json();
              const patientFiles = json.data?.listPatientFiles?.patientFiles;

              if (Array.isArray(patientFiles)) {
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
              }
            }
          } catch (e) {
            debugError('Henry', 'Fetch Hook Error:', e.message);
          }

          return response;
        }
      });
    }

    // テンプレートダウンロードをGoogle Docsで開く
    async function handleTemplateDownload({ redirectUrl, title, patientId }) {
      // 重複防止（同じURLが処理中なら無視）
      if (inflight.has(redirectUrl)) return;

      // 認証設定チェック
      if (!getGoogleAuth()?.isConfigured()) {
        alert('Google Docs連携にはOAuth設定が必要です。設定ダイアログを開きます。');
        getGoogleAuth()?.showConfigDialog();
        return;
      }

      // 認証チェック
      if (!getGoogleAuth()?.isAuthenticated()) {
        alert('Google認証が必要です。認証画面を開きます。');
        getGoogleAuth()?.startAuth();
        return;
      }

      inflight.set(redirectUrl, true);
      const hide = showProcessingIndicator(`書類を開いています... (${title})`);

      try {
        // ファイルタイプ判定（URLから拡張子を取得）
        const isDocx = redirectUrl.includes('.docx');
        const isXlsx = redirectUrl.includes('.xlsx');
        if (!isDocx && !isXlsx) {
          debugLog('Henry', '変換対象外のファイル形式:', title);
          hide();
          inflight.delete(redirectUrl);
          return;
        }

        const mimeInfo = isDocx ? MIME_TYPES.docx : MIME_TYPES.xlsx;

        // GCSからダウンロード（署名付きURLなのでトークン不要）
        const fileBuffer = await downloadFromGCSWithSignedUrl(redirectUrl);
        const blob = new Blob([fileBuffer]);

        // 一時フォルダを取得または作成
        const tempFolder = await DriveAPI.getOrCreateFolder(CONFIG.TEMP_FOLDER_NAME);

        // Google Driveにアップロード（変換付き）
        const driveFile = await DriveAPI.uploadWithConversion(
          title,
          blob,
          mimeInfo.source,
          mimeInfo.google,
          {
            henryPatientUuid: patientId,
            henryFileUuid: '',  // テンプレートから新規作成なのでまだない
            henryFolderUuid: '',
            henrySource: 'drive-direct-template'
          },
          tempFolder.id
        );

        // Google Docsで開く
        const docType = isDocx ? 'document' : 'spreadsheets';
        const openUrl = `https://docs.google.com/${docType}/d/${driveFile.id}/edit`;

        const tab = GM_openInTab(openUrl, { active: true, setParent: true });
        tab.onclose = () => {
          debugLog('Henry', 'Google Docsタブが閉じました。フォーカスを戻します。');
          window.focus();
        };

        showToast('ファイルを開きました');

      } catch (e) {
        debugError('Henry', 'テンプレート処理失敗:', e.message);
        showToast(`エラー: ${e.message}`, true);
      } finally {
        hide();
        inflight.delete(redirectUrl);
      }
    }

    // 署名付きURLからダウンロード（トークン不要）
    async function downloadFromGCSWithSignedUrl(signedUrl) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: signedUrl,
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

      // 認証設定チェック
      if (!getGoogleAuth()?.isConfigured()) {
        alert('OAuth設定が必要です。設定ダイアログを開きます。');
        getGoogleAuth()?.showConfigDialog();
        return;
      }

      // 認証チェック
      if (!getGoogleAuth()?.isAuthenticated()) {
        alert('Google認証が必要です。認証画面を開きます。');
        if (getGoogleAuth()) {
          getGoogleAuth().startAuth();
        } else {
          alert('Google認証モジュールが見つかりません。ページを再読み込みしてください。');
        }
        return;
      }

      if (!pageWindow.HenryCore) return;
      const patientUuid = pageWindow.HenryCore.getPatientUuid();
      if (!patientUuid) return;

      inflight.set(patientFileUuid, true);
      const hide = showProcessingIndicator(`書類を開いています... (${file.title})`);

      try {
        const henryToken = await pageWindow.HenryCore.getToken();

        // 1. GCSからダウンロード
        const fileBuffer = await downloadFromGCS(fileUrl, henryToken);
        const blob = new Blob([fileBuffer]);

        // 2. ファイルタイプ判定
        const isDocx = file.fileType === 'FILE_TYPE_DOCX';
        const mimeInfo = isDocx ? MIME_TYPES.docx : MIME_TYPES.xlsx;

        // 3. 一時フォルダを取得または作成
        const tempFolder = await DriveAPI.getOrCreateFolder(CONFIG.TEMP_FOLDER_NAME);

        // 4. Google Driveにアップロード（変換付き）
        const driveFile = await DriveAPI.uploadWithConversion(
          file.title,
          blob,
          mimeInfo.source,
          mimeInfo.google,
          {
            henryPatientUuid: patientUuid,
            henryFileUuid: patientFileUuid,
            henryFolderUuid: folderUuid || '',
            henrySource: 'drive-direct'
          },
          tempFolder.id
        );

        // 5. Google Docsで開く
        const docType = isDocx ? 'document' : 'spreadsheets';
        const openUrl = `https://docs.google.com/${docType}/d/${driveFile.id}/edit`;

        const tab = GM_openInTab(openUrl, { active: true, setParent: true });
        // タブが閉じたらHenryタブにフォーカスを戻す
        tab.onclose = () => {
          debugLog('Henry', 'Google Docsタブが閉じました。フォーカスを戻します。');
          window.focus();
        };

        showToast('ファイルを開きました');

      } catch (e) {
        debugError('Henry', '処理失敗:', e.message);
        showToast(`エラー: ${e.message}`, true);
      } finally {
        hide();
        inflight.delete(patientFileUuid);
      }
    }

    // 初期化
    async function init() {
      debugLog('Henry', '初期化開始...');

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

      const cleaner = pageWindow.HenryCore.utils.createCleaner();
      pageWindow.HenryCore.utils.subscribeNavigation(cleaner, () => {
        cachedFilesByFolder.clear();
        const handler = (e) => handleDoubleClick(e);
        document.addEventListener('dblclick', handler, true);
        cleaner.add(() => document.removeEventListener('dblclick', handler, true));
        log.info(`Ready (v${VERSION})`);
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
    function createHenryButton(props = {}) {
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
        minWidth: '120px',
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

      const hasExistingFile = !!props.henryFileUuid;
      const overwriteItem = createMenuItem('上書き保存', () => handleSaveToHenry('overwrite'));
      overwriteItem.style.borderBottom = '1px solid #eee';

      // 既存ファイルがない場合は上書き保存をグレーアウト
      if (!hasExistingFile) {
        overwriteItem.style.color = '#999';
        overwriteItem.style.cursor = 'not-allowed';
        overwriteItem.onmouseover = null;
        overwriteItem.onmouseout = null;
        overwriteItem.onclick = null;
      }

      menu.appendChild(overwriteItem);
      menu.appendChild(createMenuItem('新規保存', () => handleSaveToHenry('new')));

      btn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      };

      document.addEventListener('click', () => { menu.style.display = 'none'; });

      // 保存せずに閉じるボタン
      const discardBtn = document.createElement('div');
      discardBtn.id = 'drive-direct-discard-btn';
      discardBtn.textContent = '保存せずに閉じる';
      Object.assign(discardBtn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '36px',
        padding: '0 16px',
        marginLeft: '8px',
        backgroundColor: '#f5f5f5',
        color: '#666',
        borderRadius: '18px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        userSelect: 'none',
        fontFamily: '"Google Sans",Roboto,sans-serif',
        whiteSpace: 'nowrap',
        border: '1px solid #ddd'
      });

      discardBtn.onmouseover = () => {
        discardBtn.style.backgroundColor = '#e0e0e0';
        discardBtn.style.color = '#333';
      };
      discardBtn.onmouseout = () => {
        discardBtn.style.backgroundColor = '#f5f5f5';
        discardBtn.style.color = '#666';
      };
      discardBtn.onclick = () => handleDiscardAndClose();

      container.appendChild(btn);
      container.appendChild(menu);
      container.appendChild(discardBtn);

      if (shareBtn) {
        targetParent.insertBefore(container, shareBtn);
      } else {
        targetParent.appendChild(container);
      }

      debugLog('Docs', 'ボタン作成完了');
    }

    // 保存せずに閉じる処理
    async function handleDiscardAndClose() {
      if (!confirm('保存せずに閉じますか？\n\nGoogle Drive上のファイルは削除されます。')) {
        return;
      }

      const discardBtn = document.getElementById('drive-direct-discard-btn');
      discardBtn.style.pointerEvents = 'none';
      discardBtn.style.opacity = '0.7';
      discardBtn.textContent = '削除中...';

      try {
        const docId = window.location.pathname.split('/')[3];
        if (docId) {
          await DriveAPI.deleteFile(docId);
          debugLog('Docs', 'ファイル削除完了');
        }

        showToast('ファイルを破棄しました');
        await new Promise(r => setTimeout(r, 2000));
        window.close();

      } catch (e) {
        debugError('Docs', '削除エラー:', e.message);
        showToast(`エラー: ${e.message}`, true);
        discardBtn.style.pointerEvents = 'auto';
        discardBtn.style.opacity = '1';
        discardBtn.textContent = '保存せずに閉じる';
      }
    }

    // Henryへ保存処理
    async function handleSaveToHenry(mode = 'overwrite') {
      debugLog('Docs', '=== handleSaveToHenry 開始 ===');
      debugLog('Docs', '  モード:', mode);

      const btn = document.getElementById('drive-direct-save-btn');
      const originalText = btn.textContent;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.7';

      // スピナー用スタイル追加
      if (!document.getElementById('drive-direct-spin-style')) {
        const style = document.createElement('style');
        style.id = 'drive-direct-spin-style';
        style.textContent = `@keyframes drive-direct-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
      }

      // スピナー付きボタンに変更
      while (btn.firstChild) {
        btn.removeChild(btn.firstChild);
      }
      const spinner = document.createElement('div');
      Object.assign(spinner.style, {
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'drive-direct-spin 1s linear infinite',
        flexShrink: '0'
      });
      btn.appendChild(spinner);
      const textSpan = document.createElement('span');
      textSpan.textContent = '保存中...';
      btn.appendChild(textSpan);

      try {
        // 認証設定チェック
        if (!getGoogleAuth()?.isConfigured()) {
          alert('OAuth設定が必要です。設定ダイアログを開きます。');
          getGoogleAuth()?.showConfigDialog();
          return;
        }

        // Google Drive認証チェック
        if (!getGoogleAuth()?.isAuthenticated()) {
          // 自動で認証を開始
          const auth = getGoogleAuth();
          if (auth?.startAuth) {
            alert('Google認証が必要です。認証画面を開きます。');
            auth.startAuth();
          } else {
            alert('Google認証モジュールが見つかりません。Henryタブで認証してください。');
          }
          return;
        }

        // ドキュメントID取得
        const docId = window.location.pathname.split('/')[3];
        if (!docId) throw new Error('ドキュメントIDが取得できません');

        // メタデータ取得
        const metadata = await DriveAPI.getFileMetadata(docId, 'id,name,properties');
        const props = metadata.properties || {};

        if (!props.henryPatientUuid) {
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
        const fileName = metadata.name;

        // エクスポート
        const fileBuffer = await DriveAPI.exportFile(docId, mimeInfo.source);
        const blob = new Blob([fileBuffer], { type: mimeInfo.source });

        // 保存先フォルダを決定
        let targetFolderUuid = props.henryFolderUuid || null;

        if (mode === 'new') {
          // 新規保存の場合、フォルダ選択
          debugLog('Docs', 'フォルダ一覧取得中...');
          const foldersResult = await HenryAPI.call(henryToken, 'ListNonEmptyPatientFileFoldersOfPatient', {
            input: {
              patientUuid: props.henryPatientUuid,
              pageSize: 100,
              pageToken: ''
            }
          });
          const folders = foldersResult?.listNonEmptyPatientFileFoldersOfPatient?.patientFileFolders || [];

          const selectedFolder = await showFolderSelectModal(folders);
          if (!selectedFolder) {
            showToast('保存をキャンセルしました');
            return;
          }
          targetFolderUuid = selectedFolder.uuid;
          debugLog('Docs', '選択されたフォルダ:', selectedFolder.name);
        }

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
        const uploadUrlResult = await HenryAPI.call(henryToken, 'GetFileUploadUrl', {
          input: { pathType: 'PATIENT_FILE' }
        });
        const { uploadUrl, fileUrl } = uploadUrlResult.getFileUploadUrl;

        await HenryAPI.uploadToGCS(uploadUrl, blob, fileName);

        const createResult = await HenryAPI.call(henryToken, 'CreatePatientFile', {
          input: {
            patientUuid: props.henryPatientUuid,
            parentFileFolderUuid: targetFolderUuid ? { value: targetFolderUuid } : null,
            title: fileName,
            description: '',
            fileUrl: fileUrl
          }
        });

        const newFileUuid = createResult?.createPatientFile?.uuid;

        // メタデータ更新
        if (newFileUuid) {
          debugLog('Docs', 'メタデータ更新中...');
          await DriveAPI.updateFileProperties(docId, {
            ...props,
            henryFileUuid: newFileUuid,
            henryFolderUuid: targetFolderUuid || ''
          });
        }

        // Henryへリフレッシュ通知
        notifyHenryToRefresh(props.henryPatientUuid);

        // Google Driveのファイルを削除
        try {
          await DriveAPI.deleteFile(docId);
          debugLog('Docs', 'Google Driveファイル削除完了');
        } catch (e) {
          debugLog('Docs', 'Google Driveファイル削除スキップ:', e.message);
        }

        const actionText = mode === 'overwrite' ? '上書き保存' : '新規保存';
        showToast(`Henryへ${actionText}しました`);

        // 1秒待ってからタブを閉じる
        await new Promise(r => setTimeout(r, 1000));
        window.close();

      } catch (e) {
        debugError('Docs', 'エラー:', e.message);
        showToast(`エラー: ${e.message}`, true, 5000);
      } finally {
        while (btn.firstChild) {
          btn.removeChild(btn.firstChild);
        }
        btn.textContent = originalText;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      }
    }

    // メタデータをチェックしてボタンを作成
    async function checkAndCreateButton() {
      if (document.getElementById('drive-direct-save-container')) return;

      // OAuth認証チェック
      if (!getGoogleAuth()?.isAuthenticated()) {
        debugLog('Docs', 'OAuth未認証のためボタン非表示');
        return;
      }

      // ドキュメントID取得
      const docId = window.location.pathname.split('/')[3];
      if (!docId) return;

      try {
        // メタデータ取得
        const metadata = await DriveAPI.getFileMetadata(docId, 'id,name,properties');
        const props = metadata.properties || {};

        // henryPatientUuidがない場合はボタンを表示しない
        if (!props.henryPatientUuid) {
          debugLog('Docs', 'Henryメタデータなし、ボタン非表示');
          return;
        }

        // ボタン作成（メタデータを渡す）
        createHenryButton(props);
      } catch (e) {
        debugLog('Docs', 'メタデータ取得失敗:', e.message);
      }
    }

    // 初期化
    checkAndCreateButton();

    // 2段階監視パターン: banner要素のみを監視（パフォーマンス最適化）
    const DEBOUNCE_DELAY = 100;

    // debounce済みのボタン再作成チェック
    const debouncedCheck = debounce(() => {
      if (!document.getElementById('drive-direct-save-container')) {
        checkAndCreateButton();
      }
    }, DEBOUNCE_DELAY);

    const banner = document.querySelector('[role="banner"]');
    if (banner) {
      // Stage 2: banner内のみを監視
      const observer = new MutationObserver(debouncedCheck);
      observer.observe(banner, { childList: true, subtree: true });
    } else {
      // Stage 1: bannerが見つからない場合はbodyを監視してbannerの出現を待つ
      const bodyObserver = new MutationObserver(() => {
        const foundBanner = document.querySelector('[role="banner"]');
        if (foundBanner) {
          bodyObserver.disconnect();
          checkAndCreateButton();
          // banner内のみを監視
          const bannerObserver = new MutationObserver(debouncedCheck);
          bannerObserver.observe(foundBanner, { childList: true, subtree: true });
        }
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

})();