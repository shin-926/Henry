// ==UserScript==
// @name         Google Drive連携
// @namespace    https://henry-app.jp/
// @version      2.6.1
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
  // HTTP通信モジュール（GM_xmlhttpRequestのPromise化）
  // ==========================================
  const HttpClient = {
    /**
     * 基本リクエスト
     * @param {object} options - リクエストオプション
     * @param {string} options.method - HTTPメソッド
     * @param {string} options.url - リクエストURL
     * @param {object} [options.headers] - リクエストヘッダー
     * @param {*} [options.data] - リクエストボディ
     * @param {string} [options.responseType] - レスポンスタイプ ('text' | 'arraybuffer')
     * @param {object} [authOptions] - 認証オプション
     * @param {function} [authOptions.tokenProvider] - アクセストークンを返す非同期関数
     * @param {function} [authOptions.tokenRefresher] - トークンをリフレッシュする非同期関数
     * @returns {Promise<*>}
     */
    async request(options, authOptions = {}) {
      const { tokenProvider, tokenRefresher } = authOptions;

      // トークンプロバイダーがあればAuthorizationヘッダーを追加
      if (tokenProvider) {
        const accessToken = await tokenProvider();
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        };
      }

      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: options.method || 'GET',
          url: options.url,
          headers: options.headers || {},
          data: options.data,
          responseType: options.responseType || 'text',
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              // 成功
              if (options.responseType === 'arraybuffer') {
                resolve(response.response);
              } else {
                try {
                  resolve(JSON.parse(response.responseText));
                } catch {
                  resolve(response.responseText);
                }
              }
            } else if (response.status === 401 && tokenRefresher) {
              // 401エラー: トークンリフレッシュ後に再試行
              debugLog('HttpClient', 'Token expired, refreshing...');
              tokenRefresher()
                .then(() => this.request(options, authOptions))
                .then(resolve)
                .catch(reject);
            } else {
              const errorDetail = response.responseText?.substring(0, 200) || '';
              debugError('HttpClient', `Error ${response.status}:`, errorDetail);
              reject(new Error(`HTTP ${response.status}: ${errorDetail}`));
            }
          },
          onerror: (err) => {
            debugError('HttpClient', 'Network error:', err);
            reject(new Error('Network error'));
          }
        });
      });
    },

    /**
     * JSON POST リクエスト
     */
    async postJson(url, data, headers = {}, authOptions = {}) {
      return this.request({
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json', ...headers },
        data: JSON.stringify(data)
      }, authOptions);
    },

    /**
     * バイナリダウンロード
     */
    async downloadBinary(url, headers = {}, authOptions = {}) {
      return this.request({
        method: 'GET',
        url,
        headers,
        responseType: 'arraybuffer'
      }, authOptions);
    },

    /**
     * FormData POST（GCSアップロード用）
     */
    async postFormData(url, formData) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url,
          data: formData,
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              resolve(response.responseText);
            } else {
              debugError('HttpClient', `FormData POST Error ${response.status}`);
              reject(new Error(`HTTP ${response.status}`));
            }
          },
          onerror: (err) => {
            debugError('HttpClient', 'FormData POST Network error:', err);
            reject(new Error('Network error'));
          }
        });
      });
    }
  };

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
    // 認証オプション（トークン自動取得・リフレッシュ）
    _getAuthOptions() {
      return {
        tokenProvider: () => getGoogleAuth().getValidAccessToken(),
        tokenRefresher: () => getGoogleAuth().refreshAccessToken()
      };
    },

    // APIリクエスト共通処理（HttpClientを利用）
    async request(method, url, options = {}) {
      return HttpClient.request({
        method,
        url,
        headers: options.headers || {},
        data: options.body,
        responseType: options.responseType
      }, this._getAuthOptions());
    },

    // Multipart Uploadでファイルをアップロード（変換付き）
    // NOTE: この関数は手動でMultipartバイナリを構築しており複雑だが、
    // HttpClientへの統合は見送り。理由: (1) 動作中のコードを触るリスク、
    // (2) 他で再利用予定なし、(3) Drive APIの仕様変更時は慎重なテストが必要
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
      const url = `${CONFIG.DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`;
      return HttpClient.downloadBinary(url, {}, this._getAuthOptions());
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

      const result = await HttpClient.postJson(
        `https://henry-app.jp${CONFIG.GRAPHQL_ENDPOINT}`,
        { operationName, variables, query },
        {
          'Authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': CONFIG.ORG_UUID
        }
      );

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data;
    },

    async uploadToGCS(uploadUrl, blob, fileName) {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      await HttpClient.postFormData(uploadUrl, formData);
    }
  };

  // ==========================================
  // UI共通
  // ==========================================

  // スピナーアニメーション用スタイルを注入
  function ensureSpinnerStyle() {
    if (document.getElementById('drive-direct-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'drive-direct-spin-style';
    style.textContent = '@keyframes drive-direct-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

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

          // リクエスト時点でテンプレートダウンロードを検知し、早期スピナー表示
          let earlySpinnerHide = null;
          if (url?.includes?.('/graphql') && options?.body) {
            try {
              const bodyStr = typeof options.body === 'string' ? options.body : null;
              if (bodyStr) {
                const requestJson = JSON.parse(bodyStr);
                if (requestJson.operationName === 'GeneratePatientDocumentDownloadTemporaryFile') {
                  if (pageWindow.HenryCore?.ui) {
                    const { close } = pageWindow.HenryCore.ui.showSpinner('書類を準備中...');
                    earlySpinnerHide = close;
                  }
                }
              }
            } catch (e) {
              // パース失敗は無視
            }
          }

          const response = await Reflect.apply(target, thisArg, argumentsList);

          // GraphQL以外はそのまま返す
          if (!url?.includes?.('/graphql') || !options?.body) {
            earlySpinnerHide?.();
            return response;
          }

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
                  patientId: patientId,
                  earlySpinnerHide
                });
                earlySpinnerHide = null; // handleTemplateDownloadに引き渡したのでクリア

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
            earlySpinnerHide?.();
          }

          // 早期スピナーが残っていれば閉じる（handleTemplateDownloadに渡されなかった場合）
          earlySpinnerHide?.();
          return response;
        }
      });
    }

    // テンプレートダウンロードをGoogle Docsで開く
    async function handleTemplateDownload({ redirectUrl, title, patientId, earlySpinnerHide = null }) {
      // 重複防止（同じURLが処理中なら無視）
      if (inflight.has(redirectUrl)) {
        earlySpinnerHide?.();
        return;
      }

      if (!checkGoogleAuthReady()) {
        earlySpinnerHide?.();
        return;
      }

      inflight.set(redirectUrl, true);

      // 早期スピナーを閉じて、タイトル付きスピナーに切り替え
      earlySpinnerHide?.();
      const { close: hide } = pageWindow.HenryCore.ui.showSpinner(`書類を開いています... (${title})`);

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

        pageWindow.HenryCore.ui.showToast('ファイルを開きました', 'success');

      } catch (e) {
        debugError('Henry', 'テンプレート処理失敗:', e.message);
        pageWindow.HenryCore.ui.showToast(`エラー: ${e.message}`, 'error');
      } finally {
        hide();
        inflight.delete(redirectUrl);
      }
    }

    // 署名付きURLからダウンロード（トークン不要）
    async function downloadFromGCSWithSignedUrl(signedUrl) {
      return HttpClient.downloadBinary(signedUrl);
    }

    // GCSからファイルをダウンロード
    async function downloadFromGCS(fileUrl, token) {
      return HttpClient.downloadBinary(fileUrl, { 'Authorization': `Bearer ${token}` });
    }

    // 認証チェック（共通）
    function checkGoogleAuthReady() {
      if (!getGoogleAuth()?.isConfigured()) {
        alert('OAuth設定が必要です。設定ダイアログを開きます。');
        getGoogleAuth()?.showConfigDialog();
        return false;
      }
      if (!getGoogleAuth()?.isAuthenticated()) {
        alert('Google認証が必要です。認証画面を開きます。');
        getGoogleAuth()?.startAuth();
        return false;
      }
      return true;
    }

    // キャッシュからファイルを検索
    function findFileByNameAndDate(fileName, dateStr) {
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
    }

    // ファイルをGoogle Docsで開く（コアロジック）
    async function openFileInGoogleDocs(fileData, patientUuid) {
      const file = fileData.file;
      const patientFileUuid = fileData.uuid;
      const folderUuid = fileData.parentFileFolderUuid || null;

      if (inflight.has(patientFileUuid)) return;
      inflight.set(patientFileUuid, true);

      const { close: hide } = pageWindow.HenryCore.ui.showSpinner(`書類を開いています... (${file.title})`);

      try {
        const henryToken = await pageWindow.HenryCore.getToken();

        // 1. GCSからダウンロード
        const fileBuffer = await downloadFromGCS(file.redirectUrl, henryToken);
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
        tab.onclose = () => {
          debugLog('Henry', 'Google Docsタブが閉じました。フォーカスを戻します。');
          window.focus();
        };

        pageWindow.HenryCore.ui.showToast('ファイルを開きました', 'success');

      } catch (e) {
        debugError('Henry', '処理失敗:', e.message);
        pageWindow.HenryCore.ui.showToast(`エラー: ${e.message}`, 'error');
      } finally {
        hide();
        inflight.delete(patientFileUuid);
      }
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

      const fileData = findFileByNameAndDate(fileName, dateStr);
      if (!fileData?.file) return;

      const file = fileData.file;
      if (!file.redirectUrl?.includes('storage.googleapis.com')) return;
      if (!CONVERTIBLE_TYPES.has(file.fileType)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!checkGoogleAuthReady()) return;
      if (!pageWindow.HenryCore) return;

      const patientUuid = pageWindow.HenryCore.getPatientUuid();
      if (!patientUuid) return;

      await openFileInGoogleDocs(fileData, patientUuid);
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

    // ==========================================
    // クロスタブ通信（Henry ↔ Google Docs）
    // ==========================================
    // NOTE: タイムアウト3秒で設計。Henryタブがビジー状態だと失敗する可能性あり。
    // アーキテクチャ上のトレードオフとして許容（認識しておくこと）。

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

    // OAuthトークンをクロスタブ通信で取得
    let cachedOAuthData = null;

    async function requestOAuthTokens(timeout = 3000) {
      // 既にキャッシュがあればそれを返す
      if (cachedOAuthData?.tokens?.refresh_token) {
        return cachedOAuthData;
      }

      return new Promise((resolve) => {
        const requestId = Date.now() + Math.random();
        let resolved = false;

        const listenerId = GM_addValueChangeListener('drive_direct_oauth_response', (name, oldVal, newVal, remote) => {
          if (resolved) return;
          if (remote && newVal?.requestId === requestId) {
            resolved = true;
            GM_removeValueChangeListener(listenerId);
            cachedOAuthData = newVal;
            debugLog('Docs', 'OAuthトークンをクロスタブで取得成功');
            resolve(newVal);
          }
        });

        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          GM_removeValueChangeListener(listenerId);
          debugLog('Docs', 'OAuthトークン取得タイムアウト');
          resolve(null);
        }, timeout);

        GM_setValue('drive_direct_oauth_request', { requestId });
        debugLog('Docs', 'OAuthトークンをリクエスト中...');
      });
    }

    // OAuthトークンでAPIリクエスト（クロスタブ取得版）
    async function getValidAccessTokenCrossTab() {
      const oauthData = await requestOAuthTokens();
      if (!oauthData?.tokens?.refresh_token || !oauthData?.credentials) {
        throw new Error('OAuthトークンを取得できません。Henryタブを開いてGoogle認証を行ってください。');
      }

      const tokens = oauthData.tokens;
      const creds = oauthData.credentials;

      // アクセストークンが有効ならそのまま返す
      if (tokens.access_token && Date.now() < tokens.expires_at) {
        return tokens.access_token;
      }

      // リフレッシュが必要
      debugLog('Docs', 'アクセストークンをリフレッシュ中...');
      const data = await HttpClient.request({
        method: 'POST',
        url: 'https://oauth2.googleapis.com/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token'
        }).toString()
      });

      // キャッシュを更新
      cachedOAuthData.tokens = {
        access_token: data.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000) - 60000
      };
      debugLog('Docs', 'アクセストークンリフレッシュ成功');
      return data.access_token;
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
        const docId = getDocumentId();
        if (docId) {
          await CrossTabDriveAPI.deleteFile(docId);
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

    // ==========================================
    // 保存処理ヘルパー関数
    // ==========================================

    // ボタンをローディング状態にする（restore関数を返す）
    function setButtonLoading(btn, loadingText = '保存中...') {
      const originalText = btn.textContent;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.7';
      ensureSpinnerStyle();

      // スピナー付きに変更
      while (btn.firstChild) btn.removeChild(btn.firstChild);
      const spinner = document.createElement('div');
      Object.assign(spinner.style, {
        width: '14px', height: '14px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'drive-direct-spin 1s linear infinite',
        flexShrink: '0'
      });
      btn.appendChild(spinner);
      const textSpan = document.createElement('span');
      textSpan.textContent = loadingText;
      btn.appendChild(textSpan);

      // restore関数を返す
      return () => {
        while (btn.firstChild) btn.removeChild(btn.firstChild);
        btn.textContent = originalText;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      };
    }

    // URLからドキュメントIDを取得
    function getDocumentId() {
      return window.location.pathname.split('/')[3] || null;
    }

    // OAuth認証チェック（クロスタブ版）
    async function checkOAuthReadyCrossTab() {
      if (getGoogleAuth()?.isAuthenticated()) return true;
      const oauthData = await requestOAuthTokens();
      return !!(oauthData?.tokens?.refresh_token);
    }

    // 患者のフォルダ一覧を取得
    async function fetchPatientFolders(henryToken, patientUuid) {
      const result = await HenryAPI.call(henryToken, 'ListNonEmptyPatientFileFoldersOfPatient', {
        input: { patientUuid, pageSize: 100, pageToken: '' }
      });
      return result?.listNonEmptyPatientFileFoldersOfPatient?.patientFileFolders || [];
    }

    // Henryにファイルをアップロード
    async function uploadPatientFile(henryToken, { blob, fileName, patientUuid, folderUuid }) {
      const uploadUrlResult = await HenryAPI.call(henryToken, 'GetFileUploadUrl', {
        input: { pathType: 'PATIENT_FILE' }
      });
      const { uploadUrl, fileUrl } = uploadUrlResult.getFileUploadUrl;

      await HenryAPI.uploadToGCS(uploadUrl, blob, fileName);

      const createResult = await HenryAPI.call(henryToken, 'CreatePatientFile', {
        input: {
          patientUuid,
          parentFileFolderUuid: folderUuid ? { value: folderUuid } : null,
          title: fileName,
          description: '',
          fileUrl
        }
      });

      return createResult?.createPatientFile?.uuid;
    }

    // ファイル削除（エラーを無視）
    async function deleteFileQuietly(asyncFn) {
      try {
        await asyncFn();
      } catch (e) {
        debugLog('Docs', '削除スキップ:', e.message);
      }
    }

    // ==========================================
    // Henryへ保存処理（メイン）
    // ==========================================
    async function handleSaveToHenry(mode = 'overwrite') {
      debugLog('Docs', `=== handleSaveToHenry (${mode}) ===`);

      const btn = document.getElementById('drive-direct-save-btn');
      const restoreBtn = setButtonLoading(btn, '保存中...');

      try {
        // ------------------------------------------
        // 1. 認証・コンテキストの検証
        // ------------------------------------------
        if (!await checkOAuthReadyCrossTab()) {
          alert('Google認証が必要です。Henryタブを開いてGoogle認証を行ってください。');
          return;
        }

        const docId = getDocumentId();
        if (!docId) throw new Error('ドキュメントIDが取得できません');

        const metadata = await CrossTabDriveAPI.getFileMetadata(docId, 'id,name,properties');
        const props = metadata.properties || {};
        if (!props.henryPatientUuid) {
          throw new Error('Henryメタデータがありません。Henryから開いたファイルですか？');
        }

        const henryToken = await requestHenryToken();
        if (!henryToken) {
          throw new Error('Henryトークンを取得できません。Henryタブを開いてください。');
        }

        // ------------------------------------------
        // 2. ファイルのエクスポート
        // ------------------------------------------
        const isSpreadsheet = window.location.href.includes('/spreadsheets/');
        const mimeInfo = isSpreadsheet ? MIME_TYPES.xlsx : MIME_TYPES.docx;
        const fileName = metadata.name;

        const fileBuffer = await CrossTabDriveAPI.exportFile(docId, mimeInfo.source);
        const blob = new Blob([fileBuffer], { type: mimeInfo.source });

        // ------------------------------------------
        // 3. 保存先フォルダの決定
        // ------------------------------------------
        let targetFolderUuid = props.henryFolderUuid || null;

        if (mode === 'new') {
          const folders = await fetchPatientFolders(henryToken, props.henryPatientUuid);
          const selectedFolder = await showFolderSelectModal(folders);
          if (!selectedFolder) {
            showToast('保存をキャンセルしました');
            return;
          }
          targetFolderUuid = selectedFolder.uuid;
        }

        // ------------------------------------------
        // 4. Henryへのアップロード
        // ------------------------------------------
        // 上書きモード: 既存ファイルを削除
        if (mode === 'overwrite' && props.henryFileUuid) {
          await deleteFileQuietly(() =>
            HenryAPI.call(henryToken, 'DeletePatientFile', { input: { uuid: props.henryFileUuid } })
          );
        }

        // 新しいファイルをアップロード
        const newFileUuid = await uploadPatientFile(henryToken, {
          blob,
          fileName,
          patientUuid: props.henryPatientUuid,
          folderUuid: targetFolderUuid
        });

        // メタデータを更新
        if (newFileUuid) {
          await CrossTabDriveAPI.updateFileProperties(docId, {
            ...props,
            henryFileUuid: newFileUuid,
            henryFolderUuid: targetFolderUuid || ''
          });
        }

        // ------------------------------------------
        // 5. 後処理
        // ------------------------------------------
        notifyHenryToRefresh(props.henryPatientUuid);
        await deleteFileQuietly(() => CrossTabDriveAPI.deleteFile(docId));

        const actionText = mode === 'overwrite' ? '上書き保存' : '新規保存';
        showToast(`Henryへ${actionText}しました`);

        await new Promise(r => setTimeout(r, 1000));
        window.close();

      } catch (e) {
        debugError('Docs', 'エラー:', e.message);
        showToast(`エラー: ${e.message}`, true, 5000);
      } finally {
        restoreBtn();
      }
    }

    // メタデータをチェックしてボタンを作成
    async function checkAndCreateButton() {
      if (document.getElementById('drive-direct-save-container')) return;

      // OAuth認証チェック
      if (!await checkOAuthReadyCrossTab()) {
        debugLog('Docs', 'OAuth未認証のためボタン非表示');
        return;
      }

      // ドキュメントID取得
      const docId = getDocumentId();
      if (!docId) return;

      try {
        // メタデータ取得（クロスタブ版のアクセストークンを使用）
        const metadata = await CrossTabDriveAPI.getFileMetadata(docId, 'id,name,properties');
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

    // ==========================================
    // クロスタブ版 Drive API（Google Docsから呼び出し用）
    // ==========================================
    const CrossTabDriveAPI = {
      async getFileMetadata(fileId, fields) {
        const accessToken = await getValidAccessTokenCrossTab();
        return HttpClient.request({
          method: 'GET',
          url: `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      },

      async exportFile(fileId, mimeType) {
        const accessToken = await getValidAccessTokenCrossTab();
        return HttpClient.downloadBinary(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`,
          { 'Authorization': `Bearer ${accessToken}` }
        );
      },

      async updateFileProperties(fileId, properties) {
        const accessToken = await getValidAccessTokenCrossTab();
        return HttpClient.request({
          method: 'PATCH',
          url: `https://www.googleapis.com/drive/v3/files/${fileId}`,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: JSON.stringify({ properties })
        });
      },

      async deleteFile(fileId) {
        const accessToken = await getValidAccessTokenCrossTab();
        return HttpClient.request({
          method: 'DELETE',
          url: `https://www.googleapis.com/drive/v3/files/${fileId}`,
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }
    };

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