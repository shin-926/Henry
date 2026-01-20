// ==UserScript==
// @name         ツールボックス
// @namespace    https://haru-chan.example
// @version      5.1.5
// @description  プラグイン方式。シンプルUI、Noto Sans JP、ドラッグ＆ドロップ並び替え対応。HenryCore v2.7.0 対応。
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
 */

(function () {
  'use strict';

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
      z-index: 100000;
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
      z-index: 1500;
      pointer-events: none;
      visibility: hidden;
      white-space: nowrap;
    }
    #ht-tooltip.visible {
      visibility: visible;
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
      return;
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
  }

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
    const ul = nav.querySelector('ul');
    if (!ul) return false;
    const sampleBtn = ul.querySelector('button');
    if (!sampleBtn) return false;

    addToolboxIcon(ul, sampleBtn);
    return true;
  }

  const observer = new MutationObserver(() => {
    if (init()) {
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  if (init()) {
    observer.disconnect();
  }

  console.log('[Toolbox] UIコントローラー v5.1.5 起動');
})();
