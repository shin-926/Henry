// ==UserScript==
// @name         Henry UI Mockup
// @namespace    https://github.com/shin-926/henry-emr-tools
// @version      0.2.0
// @description  デザイントークン＋UIコンポーネントのモックアップ（Henry本体準拠）
// @author       shin
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'UI Mockup';
  const VERSION = GM_info.script.version;

  // ============================================================
  // Design Tokens (Henry本体準拠)
  // ============================================================
  const tokens = {
    // Colors - Primary (Henry: 緑)
    colorPrimary: '#00CC92',
    colorPrimaryHover: '#00b583',
    colorPrimaryLight: 'rgba(0, 204, 146, 0.1)',

    // Colors - Semantic
    colorSuccess: '#00CC92',  // Henryでは緑がプライマリ兼成功色
    colorSuccessHover: '#00b583',
    colorSuccessLight: 'rgba(0, 204, 146, 0.1)',

    colorError: '#E05231',
    colorErrorHover: '#c9472b',
    colorErrorLight: 'rgba(224, 82, 49, 0.1)',

    colorWarning: '#f59e0b',
    colorWarningHover: '#d97706',
    colorWarningLight: 'rgba(245, 158, 11, 0.1)',

    // Colors - Text (Henry: rgba形式)
    colorText: 'rgba(0, 0, 0, 0.73)',
    colorTextMuted: 'rgba(0, 0, 0, 0.4)',
    colorTextInput: 'rgba(0, 0, 0, 0.82)',
    colorTextDisabled: 'rgba(0, 0, 0, 0.13)',
    colorTextInverse: '#ffffff',

    // Colors - Surface
    colorSurface: '#ffffff',
    colorSurfaceAlt: '#F9F9F9',
    colorSurfaceHover: 'rgba(0, 0, 0, 0.05)',
    colorSurfaceDisabled: 'rgba(0, 0, 0, 0.03)',
    colorSurfaceCancel: 'rgba(0, 0, 0, 0.06)',

    // Colors - Border
    colorBorder: 'rgba(0, 0, 0, 0.1)',
    colorBorderFocus: '#00CC92',

    // Colors - Overlay
    colorOverlay: 'rgba(0, 0, 0, 0.5)',

    // Typography (Henry: Noto Sans JP)
    fontFamily: '"Noto Sans JP", system-ui, -apple-system, sans-serif',
    fontSizeSmall: '12px',
    fontSizeBase: '14px',
    fontSizeLarge: '16px',
    fontSizeXLarge: '24px',  // Henryモーダルタイトル

    // Font Weight
    fontWeightNormal: '400',
    fontWeightMedium: '600',  // Henryの見出し・ボタン

    // Spacing
    spacingXs: '4px',
    spacingSm: '8px',
    spacingMd: '12px',
    spacingLg: '16px',
    spacingXl: '24px',

    // Border Radius (Henry: フラット + ピル型ボタン)
    radiusNone: '0px',
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '12px',
    radiusPill: '18px',  // Henryボタン
    radiusFull: '9999px',

    // Shadows (Henry本体の複雑なシャドウ)
    shadowSmall: '0 1px 2px rgba(0, 0, 0, 0.05)',
    shadowMedium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    shadowLarge: '0 10px 25px rgba(0, 0, 0, 0.15)',
    shadowModal: 'rgba(0, 0, 0, 0.13) 0px 7px 8px 0px, rgba(0, 0, 0, 0.03) 0px 5px 22px 0px, rgba(0, 0, 0, 0.06) 0px 12px 17px 0px, rgba(0, 0, 0, 0.13) 0px 0px 1px 0px',

    // Z-Index
    zIndexDropdown: 1000,
    zIndexSticky: 1100,
    zIndexFixed: 1200,
    zIndexModalBackdrop: 1400,
    zIndexModal: 1500,

    // Transitions
    transitionFast: '0.15s ease',
    transitionBase: '0.2s ease',
    transitionSlow: '0.3s ease',
  };

  // ============================================================
  // UI Components (Henry本体準拠)
  // ============================================================

  /**
   * ボタンを作成
   * @param {string} label - ボタンのテキスト
   * @param {Object} options - オプション
   * @param {'primary'|'cancel'|'error'|'text'} options.variant - スタイル
   * @param {'small'|'medium'|'large'} options.size - サイズ
   * @param {boolean} options.disabled - 無効状態
   * @param {Function} options.onClick - クリックハンドラ
   */
  function createButton(label, options = {}) {
    const { variant = 'primary', size = 'medium', disabled = false, onClick } = options;

    const btn = document.createElement('button');
    btn.textContent = label;
    btn.type = 'button';
    btn.disabled = disabled;

    // Base styles (Henryスタイル)
    Object.assign(btn.style, {
      fontFamily: tokens.fontFamily,
      fontWeight: tokens.fontWeightMedium,
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacingSm,
      transition: tokens.transitionBase,
      borderRadius: tokens.radiusPill,  // Henryはピル型
    });

    // Size variants
    const sizes = {
      small: { padding: `${tokens.spacingXs} ${tokens.spacingMd}`, fontSize: tokens.fontSizeSmall },
      medium: { padding: `0 ${tokens.spacingLg}`, fontSize: tokens.fontSizeBase, height: '36px' },
      large: { padding: `${tokens.spacingMd} ${tokens.spacingXl}`, fontSize: tokens.fontSizeLarge },
    };
    Object.assign(btn.style, sizes[size]);

    // Color variants (Henry準拠)
    const variants = {
      primary: {
        background: disabled ? tokens.colorSurfaceDisabled : tokens.colorPrimary,
        color: disabled ? tokens.colorTextDisabled : tokens.colorTextInverse,
        hoverBg: tokens.colorPrimaryHover,
      },
      cancel: {
        background: tokens.colorSurfaceCancel,
        color: tokens.colorPrimary,
        hoverBg: 'rgba(0, 0, 0, 0.1)',
      },
      error: {
        background: disabled ? tokens.colorSurfaceDisabled : tokens.colorError,
        color: disabled ? tokens.colorTextDisabled : tokens.colorTextInverse,
        hoverBg: tokens.colorErrorHover,
      },
      text: {
        background: 'transparent',
        color: tokens.colorPrimary,
        hoverBg: tokens.colorSurfaceHover,
      },
    };

    const v = variants[variant];
    btn.style.background = v.background;
    btn.style.color = v.color;

    if (!disabled) {
      btn.addEventListener('mouseenter', () => { btn.style.background = v.hoverBg; });
      btn.addEventListener('mouseleave', () => { btn.style.background = v.background; });
    }

    if (onClick) btn.addEventListener('click', onClick);

    return btn;
  }

  /**
   * 入力フィールドを作成
   * @param {Object} options - オプション
   * @param {string} options.placeholder - プレースホルダー
   * @param {string} options.type - input type
   * @param {string} options.value - 初期値
   */
  function createInput(options = {}) {
    const { placeholder = '', type = 'text', value = '' } = options;

    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;

    Object.assign(input.style, {
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSizeBase,
      color: tokens.colorTextInput,
      padding: `${tokens.spacingSm} ${tokens.spacingMd}`,
      border: `1px solid ${tokens.colorBorder}`,
      borderRadius: tokens.radiusSmall,
      outline: 'none',
      transition: tokens.transitionBase,
      width: '100%',
      boxSizing: 'border-box',
      background: tokens.colorSurface,
    });

    input.addEventListener('focus', () => {
      input.style.borderColor = tokens.colorBorderFocus;
      input.style.boxShadow = `0 0 0 2px ${tokens.colorPrimaryLight}`;
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = tokens.colorBorder;
      input.style.boxShadow = 'none';
    });

    return input;
  }

  /**
   * モーダルを作成 (Henry本体準拠)
   * @param {Object} options - オプション
   * @param {string} options.title - タイトル
   * @param {HTMLElement|string} options.content - 中身
   * @param {Function} options.onClose - 閉じた時のコールバック
   */
  function createModal(options = {}) {
    const { title = '', content = '', onClose } = options;

    // Overlay
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: tokens.colorOverlay,
      zIndex: tokens.zIndexModalBackdrop,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    // Modal container (Henry: 角丸なし)
    const modal = document.createElement('div');
    Object.assign(modal.style, {
      background: tokens.colorSurface,
      borderRadius: tokens.radiusNone,  // Henryはフラット
      boxShadow: tokens.shadowModal,
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      zIndex: tokens.zIndexModal,
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: tokens.spacingLg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    });

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    Object.assign(titleEl.style, {
      margin: '0',
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSizeXLarge,  // 24px
      fontWeight: tokens.fontWeightMedium,
      color: tokens.colorText,
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '閉じる';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      fontSize: tokens.fontSizeBase,
      fontWeight: tokens.fontWeightMedium,
      cursor: 'pointer',
      color: tokens.colorPrimary,
      padding: tokens.spacingSm,
      transition: tokens.transitionFast,
    });
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '0.7'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '1'; });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    Object.assign(body.style, {
      padding: tokens.spacingLg,
      overflowY: 'auto',
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSizeBase,
      color: tokens.colorText,
      lineHeight: '1.6',
    });

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    // Close handlers
    const close = () => {
      overlay.remove();
      if (onClose) onClose();
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    return { overlay, modal, close };
  }

  /**
   * トースト通知を表示 (Henry風)
   * @param {string} message - メッセージ
   * @param {'success'|'error'|'warning'|'info'} type - タイプ
   * @param {number} duration - 表示時間(ms)
   */
  function showToast(message, type = 'info', duration = 3000) {
    const colors = {
      success: { bg: tokens.colorPrimary, text: tokens.colorTextInverse },
      error: { bg: tokens.colorError, text: tokens.colorTextInverse },
      warning: { bg: tokens.colorWarning, text: tokens.colorTextInverse },
      info: { bg: tokens.colorPrimary, text: tokens.colorTextInverse },
    };

    const toast = document.createElement('div');
    toast.textContent = message;

    const c = colors[type];
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: c.bg,
      color: c.text,
      padding: `${tokens.spacingMd} ${tokens.spacingLg}`,
      borderRadius: tokens.radiusPill,  // ピル型
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSizeBase,
      fontWeight: tokens.fontWeightMedium,
      boxShadow: tokens.shadowLarge,
      zIndex: tokens.zIndexModal,
      opacity: '0',
      transform: 'translateY(20px)',
      transition: tokens.transitionBase,
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
  }

  /**
   * 処理中インジケーターを表示 (Henry風)
   * @param {string} message - メッセージ
   * @returns {{ close: Function }} - 閉じる関数を含むオブジェクト
   */
  function showSpinner(message = '処理中...') {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: tokens.colorOverlay,
      zIndex: tokens.zIndexModal,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    const container = document.createElement('div');
    Object.assign(container.style, {
      background: tokens.colorSurface,
      padding: tokens.spacingXl,
      borderRadius: tokens.radiusNone,  // Henryはフラット
      boxShadow: tokens.shadowModal,
      textAlign: 'center',
    });

    // Spinner (Henry緑)
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      width: '40px',
      height: '40px',
      border: `3px solid ${tokens.colorBorder}`,
      borderTop: `3px solid ${tokens.colorPrimary}`,
      borderRadius: '50%',
      margin: '0 auto 16px',
      animation: 'henry-spin 1s linear infinite',
    });

    // Add keyframes if not exists
    if (!document.getElementById('henry-ui-keyframes')) {
      const style = document.createElement('style');
      style.id = 'henry-ui-keyframes';
      style.textContent = `@keyframes henry-spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    const text = document.createElement('div');
    text.textContent = message;
    Object.assign(text.style, {
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSizeBase,
      color: tokens.colorText,
    });

    container.appendChild(spinner);
    container.appendChild(text);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    return {
      close: () => overlay.remove(),
    };
  }

  // ============================================================
  // Demo UI
  // ============================================================

  function createDemoUI() {
    // Demo panel
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: tokens.colorSurface,
      borderRadius: tokens.radiusNone,  // Henryはフラット
      boxShadow: tokens.shadowModal,
      padding: tokens.spacingXl,
      zIndex: tokens.zIndexModal,
      width: '420px',
      maxHeight: '80vh',
      overflowY: 'auto',
      fontFamily: tokens.fontFamily,
    });

    // Title
    const title = document.createElement('h1');
    title.textContent = 'UI Mockup Demo';
    Object.assign(title.style, {
      margin: `0 0 ${tokens.spacingLg}`,
      fontSize: tokens.fontSizeXLarge,
      fontWeight: tokens.fontWeightMedium,
      color: tokens.colorText,
    });
    panel.appendChild(title);

    // Section: Buttons
    const btnSection = createSection('Buttons');
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: tokens.spacingSm, flexWrap: 'wrap' });
    btnRow.appendChild(createButton('Primary', { variant: 'primary' }));
    btnRow.appendChild(createButton('Cancel', { variant: 'cancel' }));
    btnRow.appendChild(createButton('Error', { variant: 'error' }));
    btnRow.appendChild(createButton('Text', { variant: 'text' }));
    btnSection.appendChild(btnRow);

    const disabledRow = document.createElement('div');
    Object.assign(disabledRow.style, { display: 'flex', gap: tokens.spacingSm, alignItems: 'center', marginTop: tokens.spacingSm });
    disabledRow.appendChild(createButton('Disabled', { disabled: true }));
    disabledRow.appendChild(createButton('Small', { size: 'small' }));
    disabledRow.appendChild(createButton('Large', { size: 'large' }));
    btnSection.appendChild(disabledRow);
    panel.appendChild(btnSection);

    // Section: Input
    const inputSection = createSection('Input');
    inputSection.appendChild(createInput({ placeholder: 'テキストを入力...' }));
    panel.appendChild(inputSection);

    // Section: Toast
    const toastSection = createSection('Toast');
    const toastRow = document.createElement('div');
    Object.assign(toastRow.style, { display: 'flex', gap: tokens.spacingSm, flexWrap: 'wrap' });
    toastRow.appendChild(createButton('Success', { size: 'small', onClick: () => showToast('保存しました', 'success') }));
    toastRow.appendChild(createButton('Error', { variant: 'error', size: 'small', onClick: () => showToast('エラーが発生しました', 'error') }));
    toastRow.appendChild(createButton('Warning', { variant: 'cancel', size: 'small', onClick: () => showToast('注意してください', 'warning') }));
    toastSection.appendChild(toastRow);
    panel.appendChild(toastSection);

    // Section: Modal
    const modalSection = createSection('Modal');
    modalSection.appendChild(createButton('モーダルを開く', {
      onClick: () => {
        const content = document.createElement('div');
        content.innerHTML = '<p>これはモーダルの中身です。</p><p>背景クリックか閉じるボタンで閉じます。</p>';
        const { overlay } = createModal({ title: 'サンプルモーダル', content });
        document.body.appendChild(overlay);
      }
    }));
    panel.appendChild(modalSection);

    // Section: Spinner
    const spinnerSection = createSection('Spinner');
    spinnerSection.appendChild(createButton('スピナーを表示', {
      onClick: () => {
        const { close } = showSpinner('読み込み中...');
        setTimeout(close, 2000);
      }
    }));
    panel.appendChild(spinnerSection);

    // Close button
    const closeBtn = createButton('閉じる', {
      variant: 'cancel',
      onClick: () => panel.remove()
    });
    closeBtn.style.width = '100%';
    closeBtn.style.marginTop = tokens.spacingLg;
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
  }

  function createSection(title) {
    const section = document.createElement('div');
    section.style.marginBottom = tokens.spacingLg;

    const label = document.createElement('div');
    label.textContent = title;
    Object.assign(label.style, {
      fontSize: tokens.fontSizeLarge,
      fontWeight: tokens.fontWeightMedium,
      color: tokens.colorText,
      marginBottom: tokens.spacingSm,
    });

    section.appendChild(label);
    return section;
  }

  // ============================================================
  // Initialize
  // ============================================================

  // ツールボックスに登録
  if (window.HenryCore?.registerPlugin) {
    window.HenryCore.registerPlugin({
      id: 'ui-mockup',
      name: 'UI Mockup',
      group: '開発',
      description: 'デザイントークンのデモ（Henry本体準拠）',
      onClick: createDemoUI,
    });
    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
  } else {
    // HenryCoreがない場合は直接ボタンを追加
    const trigger = document.createElement('button');
    trigger.textContent = 'UI';
    Object.assign(trigger.style, {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      width: '48px',
      height: '48px',
      borderRadius: tokens.radiusPill,
      border: 'none',
      background: tokens.colorPrimary,
      color: tokens.colorTextInverse,
      fontSize: '14px',
      fontWeight: tokens.fontWeightMedium,
      cursor: 'pointer',
      boxShadow: tokens.shadowMedium,
      zIndex: tokens.zIndexFixed,
    });
    trigger.addEventListener('click', createDemoUI);
    document.body.appendChild(trigger);
    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION}) - standalone mode`);
  }

})();
