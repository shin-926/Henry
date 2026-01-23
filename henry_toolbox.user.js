// ==UserScript==
// @name         ツールボックス
// @namespace    https://haru-chan.example
// @version      5.2.7
// @description  プラグイン方式。シンプルUI、Noto Sans JP、ドラッグ＆ドロップ並び替え対応。
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @match        https://*.henry-app.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_toolbox.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_toolbox.user.js
// ==/UserScript==

/*
 * 【ツールボックス - プラグインUI】
 *
 * ■ 役割
 * - 画面右下に表示されるツールボックスUI
 * - 各スクリプトの機能ボタンを集約して表示
 *
 * ■ プラグイン登録
 * - 各スクリプトはHenryCore.registerPlugin()でボタンを登録
 * - ツールボックスが自動的にボタンを表示
 *
 * ■ 機能
 * - ドラッグ＆ドロップでボタンの並び替え
 * - 並び順はlocalStorageに保存
 * - 折りたたみ可能
 *
 * ■ 依存関係
 * - henry_core.user.js: registerPlugin API を使用
 *
 * ■ SPA遷移対応
 * - subscribeNavigation: 不要
 * - 理由: MutationObserverでボタンの存在を継続監視
 *   - SPA遷移でnavが再レンダリングされてもボタンを再挿入
 *   - debounce付きでパフォーマンス確保
 */

(function () {
  'use strict';

  const VERSION = GM_info.script.version;

  // ============================================
  // 1. スタイル定義 (CSS)
  // ============================================
  GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');

    #henry-toolbox-panel {
      position: fixed;
      width: 240px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 1400;
      display: none;
      border: 1px solid #e5e7eb;
      font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      opacity: 0;
      transform: translateX(-10px);
      transition: opacity 0.2s, transform 0.2s;
      padding: 6px 0;
    }
    #henry-toolbox-panel.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .ht-empty {
      padding: 16px;
      color: #9CA3AF;
      font-size: 13px;
      text-align: center;
    }
    .ht-row {
      display: flex;
      align-items: center;
      padding: 0 6px;
    }

    .ht-item-btn {
      flex: 1;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: #374151;
      border-radius: 6px;
      transition: background 0.1s;
      font-weight: 500;
      display: flex;
      align-items: center;
      user-select: none;
    }
    .ht-item-btn:hover {
      background: #f3f4f6;
    }
    .ht-item-btn:active {
      background: #e5e7eb;
    }

    .ht-row.dragging {
      opacity: 0.4;
      background: #f9fafb;
    }
    .ht-row.drag-over {
      border-top: 2px solid #10B981;
    }

    /* Henry風カスタムツールチップ */
    #ht-tooltip {
      position: absolute;
      background-color: rgba(0, 0, 0, 0.73);
      color: #fff;
      padding: 4px 8px;
      border-radius: 2px;
      font-size: 12px;
      line-height: 16px;
      z-index: 1400;
      pointer-events: none;
      visibility: hidden;
      white-space: nowrap;
    }
    #ht-tooltip.visible {
      visibility: visible;
    }

    /* スクリプト設定パネル */
    #ht-settings-panel {
      position: fixed;
      width: 320px;
      max-height: 70vh;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 1500;
      display: none;
      border: 1px solid #e5e7eb;
      font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
    }
    #ht-settings-panel.visible {
      display: block;
    }
    .ht-settings-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 500;
      font-size: 14px;
      color: #374151;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ht-settings-close {
      cursor: pointer;
      color: #9CA3AF;
      font-size: 18px;
      line-height: 1;
    }
    .ht-settings-close:hover {
      color: #374151;
    }
    .ht-settings-body {
      padding: 8px 0;
      max-height: calc(70vh - 100px);
      overflow-y: auto;
    }
    .ht-settings-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
    }
    .ht-settings-item:hover {
      background: #f9fafb;
    }
    .ht-settings-item-name {
      font-size: 13px;
      color: #374151;
    }
    .ht-settings-item-name.disabled {
      color: #9CA3AF;
    }
    .ht-settings-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      background: #e5e7eb;
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .ht-settings-toggle.active {
      background: #10B981;
    }
    .ht-settings-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .ht-settings-toggle.active::after {
      transform: translateX(18px);
    }
    .ht-settings-footer {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      text-align: center;
    }
    .ht-settings-reload {
      color: #3B82F6;
      cursor: pointer;
    }
    .ht-settings-reload:hover {
      text-decoration: underline;
    }
    .ht-settings-reload.disabled {
      color: #D1D5DB;
      cursor: default;
    }
    .ht-settings-reload.disabled:hover {
      text-decoration: none;
    }
    .ht-settings-divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 6px 0;
    }
    .ht-settings-btn {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: #374151;
      border-radius: 6px;
      transition: background 0.1s;
      margin: 0 6px;
    }
    .ht-settings-btn:hover {
      background: #f3f4f6;
    }
    .ht-settings-btn svg {
      margin-right: 8px;
    }
  `);

  // ============================================
  // 2. グローバルレジストリ
  // ============================================

  const SVG_NS = 'http://www.w3.org/2000/svg';
  unsafeWindow.HenryToolbox = unsafeWindow.HenryToolbox || { items: [] };
  const toolbox = unsafeWindow.HenryToolbox;

  let userOrder = GM_getValue('toolbox-user-order', {});

  // ============================================
  // 3. ロジック
  // ============================================

  function sortItems() {
    toolbox.items.sort((a, b) => {
      const orderA = userOrder[a.event] ?? a.order ?? 99;
      const orderB = userOrder[b.event] ?? b.order ?? 99;
      return orderA - orderB;
    });
  }

  toolbox.register = function(item) {
    const exists = this.items.some(i => i.event === item.event);
    if (exists) return;

    // onClick を保持
    const itemWithCallback = {
      event: item.event,
      label: item.label,
      order: item.order ?? 99,
      onClick: item.onClick  // HenryCore plugin の場合に使用
    };

    this.items.push(itemWithCallback);
    sortItems();
    if (typeof this.rebuild === 'function') this.rebuild();
  };

  // ============================================
  // 4. メニュー構築
  // ============================================

  let panel = null;
  let dragSrcEl = null;
  let tooltip = null;

  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.id = 'ht-tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function showTooltip(text, targetEl) {
    if (!tooltip) createTooltip();
    tooltip.textContent = text;
    const rect = targetEl.getBoundingClientRect();
    tooltip.style.left = (rect.right + 8) + 'px';
    tooltip.style.top = rect.top + 'px';
    tooltip.classList.add('visible');
  }

  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('visible');
  }

  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'henry-toolbox-panel';
    document.body.appendChild(panel);
    return panel;
  }

  function buildMenu() {
    if (!panel) createPanel();
    panel.innerHTML = '';
    sortItems();

    if (toolbox.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ht-empty';
      empty.textContent = 'ツール未登録';
      panel.appendChild(empty);
      // 設定ボタンは表示するので return しない
    }

    toolbox.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'ht-row';

      row.draggable = true;
      row.dataset.index = index;

      row.addEventListener('dragstart', handleDragStart);
      row.addEventListener('dragenter', handleDragEnter);
      row.addEventListener('dragover', handleDragOver);
      row.addEventListener('dragleave', handleDragLeave);
      row.addEventListener('drop', handleDrop);
      row.addEventListener('dragend', handleDragEnd);

      const btn = document.createElement('div');
      btn.className = 'ht-item-btn';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      btn.appendChild(labelSpan);

      btn.addEventListener('click', (e) => {
        // HenryCore plugin の場合は onClick を直接実行
        if (item.event.startsWith('henrycore:plugin:') && item.onClick) {
          item.onClick();
        } else {
          // 通常の event dispatch
          window.dispatchEvent(new CustomEvent(item.event, {
              detail: { triggerElement: btn }
          }));
        }
        closePanel();
      });

      row.appendChild(btn);
      panel.appendChild(row);
    });

    // 区切り線 + スクリプト設定ボタン
    if (toolbox.items.length > 0) {
      const divider = document.createElement('hr');
      divider.className = 'ht-settings-divider';
      panel.appendChild(divider);
    }

    const settingsBtn = document.createElement('div');
    settingsBtn.className = 'ht-settings-btn';
    settingsBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      <span>スクリプト設定</span>
    `;
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsPanel();
    });
    panel.appendChild(settingsBtn);
  }

  // ============================================
  // 4.5. スクリプト設定パネル
  // ============================================

  let settingsPanel = null;
  let settingsChanged = false;

  function createSettingsPanel() {
    settingsPanel = document.createElement('div');
    settingsPanel.id = 'ht-settings-panel';
    document.body.appendChild(settingsPanel);
    return settingsPanel;
  }

  function buildSettingsPanel() {
    if (!settingsPanel) createSettingsPanel();

    const loaderConfig = unsafeWindow.HenryLoaderConfig;
    if (!loaderConfig) {
      settingsPanel.innerHTML = `
        <div class="ht-settings-header">
          <span>スクリプト設定</span>
          <span class="ht-settings-close">&times;</span>
        </div>
        <div class="ht-settings-body">
          <div style="padding: 16px; color: #9CA3AF; text-align: center;">
            Loader未検出<br><small>Henry Loader経由で起動してください</small>
          </div>
        </div>
      `;
      settingsPanel.querySelector('.ht-settings-close').addEventListener('click', closeSettingsPanel);
      return;
    }

    const scripts = loaderConfig.scripts || [];
    const disabled = loaderConfig.disabledScripts || new Set();

    let html = `
      <div class="ht-settings-header">
        <span>スクリプト設定</span>
        <span class="ht-settings-close">&times;</span>
      </div>
      <div class="ht-settings-body">
    `;

    scripts.forEach(script => {
      // henry_core と henry_toolbox は無効化不可（依存関係のため）
      const isCore = script.name === 'henry_core' || script.name === 'henry_toolbox';
      const isEnabled = !disabled.has(script.name);
      const nameClass = isEnabled ? '' : 'disabled';
      const toggleClass = isEnabled ? 'active' : '';

      html += `
        <div class="ht-settings-item" data-script="${script.name}">
          <span class="ht-settings-item-name ${nameClass}">${script.label || script.name}</span>
          ${isCore
            ? '<span style="font-size: 11px; color: #9CA3AF;">必須</span>'
            : `<div class="ht-settings-toggle ${toggleClass}" data-script="${script.name}"></div>`
          }
        </div>
      `;
    });

    html += `
      </div>
      <div class="ht-settings-footer">
        <span class="ht-settings-reload disabled">リロードして反映</span>
      </div>
    `;

    settingsPanel.innerHTML = html;

    // イベント設定
    settingsPanel.querySelector('.ht-settings-close').addEventListener('click', closeSettingsPanel);
    settingsPanel.querySelector('.ht-settings-reload').addEventListener('click', (e) => {
      if (e.target.classList.contains('disabled')) return;
      location.reload();
    });

    settingsPanel.querySelectorAll('.ht-settings-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const scriptName = e.target.dataset.script;
        const isActive = e.target.classList.contains('active');

        // トグル切り替え
        e.target.classList.toggle('active');
        const nameEl = e.target.closest('.ht-settings-item').querySelector('.ht-settings-item-name');
        nameEl.classList.toggle('disabled');

        // 設定を保存
        const currentDisabled = new Set(loaderConfig.disabledScripts);
        if (isActive) {
          currentDisabled.add(scriptName);
        } else {
          currentDisabled.delete(scriptName);
        }
        loaderConfig.setDisabledScripts(Array.from(currentDisabled));

        // リロードボタンを有効化
        settingsChanged = true;
        const reloadBtn = settingsPanel.querySelector('.ht-settings-reload');
        if (reloadBtn) reloadBtn.classList.remove('disabled');
      });
    });
  }

  function openSettingsPanel() {
    if (!settingsPanel) createSettingsPanel();
    settingsChanged = false;
    buildSettingsPanel();

    // パネル位置（画面中央）
    settingsPanel.style.top = '50%';
    settingsPanel.style.left = '50%';
    settingsPanel.style.transform = 'translate(-50%, -50%)';
    settingsPanel.classList.add('visible');

    closePanel();  // メインパネルを閉じる
  }

  function closeSettingsPanel() {
    if (settingsPanel) {
      settingsPanel.classList.remove('visible');
    }
  }

  // 設定パネル外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (settingsPanel && settingsPanel.classList.contains('visible')) {
      if (!settingsPanel.contains(e.target)) {
        closeSettingsPanel();
      }
    }
  });

  // ============================================
  // 5. ドラッグ＆ドロップ処理
  // ============================================

  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    if (this !== dragSrcEl) {
        this.classList.add('drag-over');
    }
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
        const oldIndex = parseInt(dragSrcEl.dataset.index);
        const newIndex = parseInt(this.dataset.index);
        moveItem(oldIndex, newIndex);
    }
    return false;
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    const rows = panel.querySelectorAll('.ht-row');
    rows.forEach(row => row.classList.remove('drag-over'));
  }

  // ============================================
  // 6. 状態管理・ヘルパー
  // ============================================

  function moveItem(fromIndex, toIndex) {
    const item = toolbox.items.splice(fromIndex, 1)[0];
    toolbox.items.splice(toIndex, 0, item);
    saveCurrentOrder();
    buildMenu();
  }

  function saveCurrentOrder() {
    userOrder = {};
    toolbox.items.forEach((item, index) => {
      userOrder[item.event] = index;
    });
    GM_setValue('toolbox-user-order', userOrder);
  }

  function closePanel() {
    if (panel) {
      panel.classList.remove('visible');
      setTimeout(() => {
          if(!panel.classList.contains('visible')) panel.style.display = 'none';
      }, 200);
    }
  }

  toolbox.rebuild = buildMenu;

  // ============================================
  // 7. メインアイコン設置
  // ============================================

  function addToolboxIcon(ul, sampleBtn) {
    if (ul.querySelector('button[data-tm-toolbox]')) return;

    const li = document.createElement('li');
    li.style.marginTop = '16px';

    const btn = sampleBtn.cloneNode(true);
    btn.setAttribute('data-tm-toolbox', '1');
    btn.setAttribute('aria-label', 'ツールボックス');
    btn.removeAttribute('title');

    btn.querySelectorAll('i, svg').forEach(el => el.remove());

    const iconSvg = document.createElementNS(SVG_NS, 'svg');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('width', '22');
    iconSvg.setAttribute('height', '22');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'rgba(0,0,0,0.57)');
    iconSvg.setAttribute('stroke-width', '1.8');
    iconSvg.setAttribute('stroke-linecap', 'round');
    iconSvg.setAttribute('stroke-linejoin', 'round');

    // 【変更点】アイコンを元の「道具箱」に戻しました
    iconSvg.innerHTML = `
        <path d="M20 7h-3V4c0-1.1-.9-2-2-2h-6c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"/>
        <path d="M9 4h6v3H9z"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
    `;

    btn.appendChild(iconSvg);

    // カスタムツールチップ
    btn.addEventListener('mouseenter', () => showTooltip('ツールボックス', btn));
    btn.addEventListener('mouseleave', hideTooltip);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!panel) createPanel();

      const isVisible = panel.style.display === 'block';

      if (!isVisible) {
        buildMenu();
        const rect = btn.getBoundingClientRect();
        const GAP = 12;
        panel.style.left = (rect.right + GAP) + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.display = 'block';
        requestAnimationFrame(() => {
            panel.classList.add('visible');
        });
      } else {
        closePanel();
      }
    });

    li.appendChild(btn);
    ul.appendChild(li);

    document.addEventListener('click', (e) => {
      if (!e.isTrusted) return;
      if (panel && panel.style.display === 'block' && !panel.contains(e.target) && !btn.contains(e.target)) {
        closePanel();
      }
    });
  }

  function init() {
    const nav = document.querySelector('nav');
    if (!nav) return false;
    // 「患者管理」ボタンを含むulを探す（メインメニューのul）
    const patientBtn = Array.from(nav.querySelectorAll('button')).find(b =>
      b.getAttribute('aria-label')?.includes('患者')
    );
    const ul = patientBtn?.closest('ul');
    if (!ul) return false;
    const sampleBtn = ul.querySelector('button');
    if (!sampleBtn) return false;

    addToolboxIcon(ul, sampleBtn);
    return true;
  }

  // SPA遷移でnavが再レンダリングされても対応するため、継続監視（debounce付き）
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // ボタンが存在しない場合のみ再初期化
      if (!document.querySelector('button[data-tm-toolbox]')) {
        init();
      }
    }, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  init();  // 初回実行

  console.log(`[Toolbox] Ready v${VERSION}`);
})();
