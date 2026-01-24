// ==UserScript==
// @name         Google認証設定
// @namespace    https://henry-app.jp/
// @version      1.0.0
// @description  Google OAuth認証の設定・管理ツール
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        unsafeWindow
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_auth_settings.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_google_auth_settings.user.js
// ==/UserScript==

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'GoogleAuthSettings';
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // HenryCore待機
  async function waitForHenryCore(timeout = 5000) {
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) return null;
    }
    return pageWindow.HenryCore;
  }

  // GoogleAuth取得
  function getGoogleAuth() {
    return pageWindow.HenryCore?.modules?.GoogleAuth;
  }

  // 認証状態を取得
  function getAuthStatus() {
    const auth = getGoogleAuth();
    if (!auth) return { configured: false, authenticated: false };
    return {
      configured: auth.isConfigured(),
      authenticated: auth.isAuthenticated()
    };
  }

  // ステータステキスト生成
  function getStatusText() {
    const status = getAuthStatus();
    if (!status.configured) {
      return '❌ 未設定（Client ID/Secretが必要）';
    }
    if (!status.authenticated) {
      return '⚠️ 設定済み・未認証';
    }
    return '✅ 認証済み';
  }

  // メニュー表示
  function showMenu() {
    const auth = getGoogleAuth();
    if (!auth) {
      alert('GoogleAuthモジュールが見つかりません。HenryCoreが読み込まれているか確認してください。');
      return;
    }

    const status = getAuthStatus();

    // オーバーレイ
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

    // ダイアログ
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '24px',
      width: '360px',
      maxWidth: '90vw',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    // タイトル
    const title = document.createElement('h3');
    title.textContent = 'Google認証設定';
    Object.assign(title.style, {
      margin: '0 0 8px 0',
      fontSize: '18px',
      fontWeight: '600'
    });

    // ステータス表示
    const statusDiv = document.createElement('div');
    statusDiv.textContent = getStatusText();
    Object.assign(statusDiv.style, {
      margin: '0 0 20px 0',
      padding: '12px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      fontSize: '14px'
    });

    // メニューアイテム作成
    const createMenuItem = (label, description, onClick, disabled = false) => {
      const item = document.createElement('div');
      Object.assign(item.style, {
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: disabled ? '#f9f9f9' : '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? '0.5' : '1'
      });

      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      Object.assign(labelEl.style, {
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '2px'
      });

      const descEl = document.createElement('div');
      descEl.textContent = description;
      Object.assign(descEl.style, {
        fontSize: '12px',
        color: '#666'
      });

      item.appendChild(labelEl);
      item.appendChild(descEl);

      if (!disabled) {
        item.onmouseover = () => item.style.backgroundColor = '#f5f5f5';
        item.onmouseout = () => item.style.backgroundColor = '#fff';
        item.onclick = () => {
          overlay.remove();
          onClick();
        };
      }

      return item;
    };

    // メニューコンテナ
    const menuContainer = document.createElement('div');

    // OAuth設定
    menuContainer.appendChild(createMenuItem(
      '🔧 OAuth設定',
      'Client ID / Client Secret を設定',
      () => auth.showConfigDialog()
    ));

    // 認証開始（設定済みの場合のみ）
    menuContainer.appendChild(createMenuItem(
      '🔑 認証開始',
      'Googleアカウントで認証',
      () => auth.startAuth(),
      !status.configured
    ));

    // 認証情報クリア（認証済みの場合のみ）
    menuContainer.appendChild(createMenuItem(
      '🗑️ 認証トークンをクリア',
      'ログアウト（再認証が必要になります）',
      () => {
        if (confirm('認証トークンを削除しますか？\n再度Googleアカウントでの認証が必要になります。')) {
          auth.clearTokens();
          alert('認証トークンを削除しました。');
        }
      },
      !status.authenticated
    ));

    // 全設定クリア
    menuContainer.appendChild(createMenuItem(
      '⚠️ 全設定をクリア',
      'Client ID/Secret と認証トークンをすべて削除',
      () => {
        if (confirm('すべての認証設定を削除しますか？\nClient ID/Secret も削除され、再設定が必要になります。')) {
          auth.clearTokens();
          auth.clearCredentials();
          alert('すべての認証設定を削除しました。');
        }
      }
    ));

    // 閉じるボタン
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '閉じる';
    Object.assign(closeBtn.style, {
      marginTop: '12px',
      padding: '10px 20px',
      width: '100%',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    });
    closeBtn.onclick = () => overlay.remove();

    // 組み立て
    dialog.appendChild(title);
    dialog.appendChild(statusDiv);
    dialog.appendChild(menuContainer);
    dialog.appendChild(closeBtn);
    overlay.appendChild(dialog);

    // クリックで閉じる
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
  }

  // 初期化
  async function init() {
    const core = await waitForHenryCore();
    if (!core) {
      console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
      return;
    }

    // プラグイン登録
    core.registerPlugin({
      id: 'google-auth-settings',
      name: 'Google認証設定',
      description: 'OAuth認証の設定・管理',
      icon: '🔐',
      onClick: showMenu
    });

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  }

  init();
})();
