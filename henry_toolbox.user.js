// ==UserScript==
// @name         ツールボックス
// @namespace    https://haru-chan.example
// @version      5.10.0
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
      overflow: visible;
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
    .ht-row.drag-over-bottom {
      border-bottom: 2px solid #10B981;
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
      width: 520px;
      max-height: 80vh;
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
      padding: 12px 16px;
      max-height: calc(80vh - 100px);
      overflow-y: auto;
    }
    .ht-scroll-indicator {
      height: 32px;
      background: linear-gradient(to bottom, transparent, rgba(240,240,240,0.95));
      margin-top: -32px;
      position: relative;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .ht-scroll-indicator.visible {
      opacity: 1;
    }
    /* カテゴリセクション（カード風） */
    .ht-settings-category {
      margin-bottom: 16px;
    }
    .ht-settings-category:last-child {
      margin-bottom: 0;
    }
    .ht-settings-category-header {
      font-size: 11px;
      font-weight: 500;
      color: #6B7280;
      margin-bottom: 6px;
      padding-left: 2px;
    }
    .ht-settings-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 6px;
      border: 1px solid #e5e7eb;
    }
    .ht-settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
    }
    .ht-settings-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      border-radius: 6px;
      background: transparent;
    }
    .ht-settings-item:hover {
      background: #f0f1f3;
    }
    .ht-settings-item-name {
      font-size: 12px;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ht-settings-item-name.disabled {
      color: #9CA3AF;
    }
    .ht-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .ht-status-dot.loaded {
      background-color: #22C55E;
    }
    .ht-status-dot.not-loaded {
      background-color: #D1D5DB;
    }
    .ht-settings-toggle {
      position: relative;
      width: 36px;
      height: 20px;
      background: #e5e7eb;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .ht-settings-toggle.active {
      background: #10B981;
    }
    .ht-settings-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .ht-settings-toggle.active::after {
      transform: translateX(16px);
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
    /* サブカテゴリ区切り */
    .ht-settings-subcategory {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px 4px;
      font-size: 11px;
      color: #9CA3AF;
    }
    .ht-settings-subcategory::before,
    .ht-settings-subcategory::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }
    .ht-settings-subcategory-items {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
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

    /* グループ化サブメニュー */
    .ht-group-row {
      position: relative;
    }
    .ht-group-row > .ht-item-btn::after {
      content: '▶';
      margin-left: auto;
      font-size: 10px;
      color: #9CA3AF;
    }
    .ht-submenu {
      position: absolute;
      left: 100%;
      top: 0;
      min-width: 220px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid #e5e7eb;
      padding: 6px 0;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-8px);
      transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
      z-index: 1401;
    }
    .ht-group-row:hover > .ht-submenu {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }
    .ht-group-row.dragging > .ht-submenu {
      opacity: 0 !important;
      visibility: hidden !important;
    }

    /* サブメニュー内ドラッグ中は表示を維持 */
    .ht-submenu.submenu-dragging {
      opacity: 1 !important;
      visibility: visible !important;
      transform: translateX(0) !important;
    }
    .ht-submenu-row.dragging {
      opacity: 0.4;
      background: #f9fafb;
    }
    .ht-submenu-row.drag-over {
      border-top: 2px solid #10B981;
    }
    .ht-submenu-row.drag-over-bottom {
      border-bottom: 2px solid #10B981;
    }
    .ht-submenu .ht-row {
      padding: 0 6px;
    }
    .ht-submenu .ht-item-btn {
      padding: 8px 12px;
    }

    /* 2階層目のサブメニュー（子グループ）*/
    .ht-submenu .ht-subgroup-row {
      position: relative;
    }
    .ht-submenu .ht-subgroup-row > .ht-item-btn::after {
      content: '▶';
      margin-left: auto;
      font-size: 10px;
      color: #9CA3AF;
    }
    .ht-subsubmenu {
      position: absolute;
      left: 100%;
      top: 0;
      min-width: 180px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid #e5e7eb;
      padding: 6px 0;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-8px);
      transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
      z-index: 1402;
    }
    .ht-subgroup-row:hover > .ht-subsubmenu {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }
    .ht-subsubmenu .ht-row {
      padding: 0 6px;
    }
    .ht-subsubmenu .ht-item-btn {
      padding: 8px 12px;
    }
  `);

  // ============================================
  // 2. グローバルレジストリ
  // ============================================

  const SVG_NS = 'http://www.w3.org/2000/svg';
  unsafeWindow.HenryToolbox = unsafeWindow.HenryToolbox || { items: [] };
  const toolbox = unsafeWindow.HenryToolbox;

  let userOrder = GM_getValue('toolbox-user-order', {});
  let groupOrder = GM_getValue('toolbox-group-order', {});  // グループ用のorder
  let groupItemOrder = GM_getValue('toolbox-group-item-order', {});  // グループ内アイテムの順序

  // グループ階層定義（子グループ → 親グループ）
  const GROUP_HIERARCHY = {
    '診療申込書': '文書作成'
  };

  // 現在の表示アイテム（ドラッグ用）
  let currentDisplayItems = [];

  // サブメニュードラッグ用
  let submenuDragSrcEl = null;
  let currentSubmenuGroup = null;

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

    // onClick, group, groupIcon を保持
    const itemWithCallback = {
      event: item.event,
      label: item.label,
      order: item.order ?? 99,
      onClick: item.onClick,  // HenryCore plugin の場合に使用
      group: item.group || null,      // グループ化対応
      groupIcon: item.groupIcon || null
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

  // アイテムをグループ化する（階層対応）
  function groupItems(items) {
    const groups = {};
    const ungrouped = [];

    items.forEach((item, index) => {
      if (item.group) {
        if (!groups[item.group]) {
          groups[item.group] = {
            name: item.group,
            icon: item.groupIcon || '📁',
            items: [],
            childGroups: [],  // 子グループ用
            order: groupOrder[item.group] ?? item.order  // groupOrderを優先
          };
        }
        // グループ内でgroupIconが指定されていれば上書き
        if (item.groupIcon) {
          groups[item.group].icon = item.groupIcon;
        }
        groups[item.group].items.push({ ...item, originalIndex: index });
      } else {
        // ungroupedもuserOrderを参照
        const order = userOrder[item.event] ?? item.order ?? 99;
        ungrouped.push({ ...item, originalIndex: index, order });
      }
    });

    // 階層構造を適用: 子グループを親グループ内に移動
    Object.entries(GROUP_HIERARCHY).forEach(([childName, parentName]) => {
      if (groups[childName] && groups[parentName]) {
        // 子グループを親の childGroups に追加
        groups[parentName].childGroups.push(groups[childName]);
        // トップレベルから削除
        delete groups[childName];
      }
    });

    return { groups, ungrouped };
  }

  // 通常アイテムの行を作成
  function createItemRow(item, index) {
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
      if (item.event.startsWith('henrycore:plugin:') && item.onClick) {
        item.onClick();
      } else {
        window.dispatchEvent(new CustomEvent(item.event, {
          detail: { triggerElement: btn }
        }));
      }
      closePanel();
    });

    row.appendChild(btn);
    return row;
  }

  // グループ行を作成（サブメニュー付き、子グループ対応）
  function createGroupRow(groupData, index) {
    const row = document.createElement('div');
    row.className = 'ht-row ht-group-row';
    row.draggable = true;
    row.dataset.index = index;
    row.dataset.groupName = groupData.name;

    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('dragleave', handleDragLeave);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);

    const btn = document.createElement('div');
    btn.className = 'ht-item-btn';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = groupData.name;
    btn.appendChild(labelSpan);

    row.appendChild(btn);

    // サブメニュー作成
    const submenu = document.createElement('div');
    submenu.className = 'ht-submenu';
    submenu.dataset.groupName = groupData.name;

    // グループ内アイテムをソート
    const sortedItems = [...groupData.items].sort((a, b) => {
      const orderA = groupItemOrder[groupData.name]?.[a.event] ?? a.order ?? 99;
      const orderB = groupItemOrder[groupData.name]?.[b.event] ?? b.order ?? 99;
      return orderA - orderB;
    });

    sortedItems.forEach((item, subIndex) => {
      const subRow = document.createElement('div');
      subRow.className = 'ht-row ht-submenu-row';
      subRow.draggable = true;
      subRow.dataset.subIndex = subIndex;
      subRow.dataset.event = item.event;
      subRow.dataset.groupName = groupData.name;

      // サブメニュー用ドラッグイベント
      subRow.addEventListener('dragstart', handleSubmenuDragStart);
      subRow.addEventListener('dragenter', handleSubmenuDragEnter);
      subRow.addEventListener('dragover', handleSubmenuDragOver);
      subRow.addEventListener('dragleave', handleSubmenuDragLeave);
      subRow.addEventListener('drop', handleSubmenuDrop);
      subRow.addEventListener('dragend', handleSubmenuDragEnd);

      const subBtn = document.createElement('div');
      subBtn.className = 'ht-item-btn';

      const subLabelSpan = document.createElement('span');
      subLabelSpan.textContent = item.label;
      subBtn.appendChild(subLabelSpan);

      subBtn.addEventListener('click', (e) => {
        if (item.event.startsWith('henrycore:plugin:') && item.onClick) {
          item.onClick();
        } else {
          window.dispatchEvent(new CustomEvent(item.event, {
            detail: { triggerElement: subBtn }
          }));
        }
        closePanel();
      });

      subRow.appendChild(subBtn);
      submenu.appendChild(subRow);
    });

    // 子グループがあれば2階層目のサブメニューを追加
    if (groupData.childGroups && groupData.childGroups.length > 0) {
      groupData.childGroups.forEach(childGroup => {
        const subgroupRow = document.createElement('div');
        subgroupRow.className = 'ht-row ht-subgroup-row';

        const subgroupBtn = document.createElement('div');
        subgroupBtn.className = 'ht-item-btn';

        const subgroupLabel = document.createElement('span');
        subgroupLabel.textContent = childGroup.name;
        subgroupBtn.appendChild(subgroupLabel);

        subgroupRow.appendChild(subgroupBtn);

        // 2階層目のサブメニュー
        const subsubmenu = document.createElement('div');
        subsubmenu.className = 'ht-subsubmenu';
        subsubmenu.dataset.groupName = childGroup.name;

        // 子グループ内アイテムをソート
        const sortedChildItems = [...childGroup.items].sort((a, b) => {
          const orderA = groupItemOrder[childGroup.name]?.[a.event] ?? a.order ?? 99;
          const orderB = groupItemOrder[childGroup.name]?.[b.event] ?? b.order ?? 99;
          return orderA - orderB;
        });

        sortedChildItems.forEach((item, childIndex) => {
          const childRow = document.createElement('div');
          childRow.className = 'ht-row ht-submenu-row';
          childRow.draggable = true;
          childRow.dataset.subIndex = childIndex;
          childRow.dataset.event = item.event;
          childRow.dataset.groupName = childGroup.name;

          // サブメニュー用ドラッグイベント
          childRow.addEventListener('dragstart', handleSubmenuDragStart);
          childRow.addEventListener('dragenter', handleSubmenuDragEnter);
          childRow.addEventListener('dragover', handleSubmenuDragOver);
          childRow.addEventListener('dragleave', handleSubmenuDragLeave);
          childRow.addEventListener('drop', handleSubmenuDrop);
          childRow.addEventListener('dragend', handleSubmenuDragEnd);

          const childBtn = document.createElement('div');
          childBtn.className = 'ht-item-btn';

          const childLabelSpan = document.createElement('span');
          // ラベルから「診療申込書（」と「）」を除去して病院名のみ表示
          const displayLabel = item.label.replace(/^診療申込書（(.+)）$/, '$1');
          childLabelSpan.textContent = displayLabel;
          childBtn.appendChild(childLabelSpan);

          childBtn.addEventListener('click', (e) => {
            if (item.event.startsWith('henrycore:plugin:') && item.onClick) {
              item.onClick();
            } else {
              window.dispatchEvent(new CustomEvent(item.event, {
                detail: { triggerElement: childBtn }
              }));
            }
            closePanel();
          });

          childRow.appendChild(childBtn);
          subsubmenu.appendChild(childRow);
        });

        subgroupRow.appendChild(subsubmenu);
        submenu.appendChild(subgroupRow);
      });
    }

    row.appendChild(submenu);
    return row;
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

    // グループ化
    const { groups, ungrouped } = groupItems(toolbox.items);

    // グループとungroupedを統合してorder順にソート
    const displayItems = [];

    // グループを追加（グループ内の最小orderを使用）
    Object.values(groups).forEach(g => {
      displayItems.push({ type: 'group', data: g, order: g.order });
    });

    // ungroupedを追加
    ungrouped.forEach(item => {
      displayItems.push({ type: 'item', data: item, order: item.order ?? 99 });
    });

    // order順にソート
    displayItems.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    // ドラッグ用に保存
    currentDisplayItems = displayItems;

    // 表示
    displayItems.forEach((displayItem, index) => {
      if (displayItem.type === 'group') {
        const row = createGroupRow(displayItem.data, index);
        panel.appendChild(row);
      } else {
        const row = createItemRow(displayItem.data, index);
        panel.appendChild(row);
      }
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
      <span>設定</span>
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

  function createSettingsPanel() {
    settingsPanel = document.createElement('div');
    settingsPanel.id = 'ht-settings-panel';
    document.body.appendChild(settingsPanel);
    return settingsPanel;
  }

  // 外部スクリプト定義（Henry以外のドメインで動作するスクリプト）
  const EXTERNAL_SCRIPTS = [
    { name: 'reserve_calendar_ui', label: '予約カレンダーUI' }
  ];

  function buildSettingsPanel() {
    if (!settingsPanel) createSettingsPanel();

    const loaderConfig = unsafeWindow.HenryLoaderConfig;

    // 外部スクリプトの無効化状態を取得（Loaderがなくても動作）
    const externalDisabled = new Set(GM_getValue('loader-disabled-scripts', []));

    // 開発版かどうか（ローダー名に dev が含まれるか）
    const isDevMode = loaderConfig?.loaderName?.includes('dev') || false;

    if (!loaderConfig) {
      // Loader未検出でも外部スクリプトの設定は可能
      let html = `
        <div class="ht-settings-header">
          <span>スクリプト ON/OFF</span>
          <span class="ht-settings-close">&times;</span>
        </div>
        <div class="ht-settings-body">
          <div style="padding: 16px; color: #9CA3AF; text-align: center;">
            Loader未検出<br><small>Henry Loader経由で起動してください</small>
          </div>
          <div class="ht-settings-category">
            <div class="ht-settings-category-header">外部スクリプト</div>
            <div class="ht-settings-card">
              <div class="ht-settings-grid">
      `;

      EXTERNAL_SCRIPTS.forEach(script => {
        const isEnabled = !externalDisabled.has(script.name);
        const nameClass = isEnabled ? '' : 'disabled';
        const toggleClass = isEnabled ? 'active' : '';

        html += `
          <div class="ht-settings-item" data-script="${script.name}" data-external="true">
            <span class="ht-settings-item-name ${nameClass}">
              ${script.label || script.name}
            </span>
            <div class="ht-settings-toggle ${toggleClass}" data-script="${script.name}" data-external="true"></div>
          </div>
        `;
      });

      html += `
              </div>
            </div>
          </div>
        </div>
        <div class="ht-settings-footer">
          <small style="color: #9CA3AF;">外部スクリプトは対象サイトで反映</small>
        </div>
      `;

      settingsPanel.innerHTML = html;
      settingsPanel.querySelector('.ht-settings-close').addEventListener('click', closeSettingsPanel);

      // 外部スクリプトのトグルイベント
      settingsPanel.querySelectorAll('.ht-settings-toggle[data-external="true"]').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          const scriptName = e.target.dataset.script;
          const isActive = e.target.classList.contains('active');

          e.target.classList.toggle('active');
          const nameEl = e.target.closest('.ht-settings-item').querySelector('.ht-settings-item-name');
          nameEl.classList.toggle('disabled');

          const currentDisabled = new Set(GM_getValue('loader-disabled-scripts', []));
          if (isActive) {
            currentDisabled.add(scriptName);
          } else {
            currentDisabled.delete(scriptName);
          }
          GM_setValue('loader-disabled-scripts', Array.from(currentDisabled));
        });
      });
      return;
    }

    const scripts = loaderConfig.scripts || [];
    const categories = loaderConfig.categories || [];
    const disabled = loaderConfig.disabledScripts || new Set();
    const loaded = loaderConfig.loadedScripts || new Set();

    // 設定と実際の読み込み状態に差分があるかチェック
    const hasPendingChanges = () => {
      const currentDisabled = loaderConfig.disabledScripts || new Set();
      for (const script of scripts) {
        if (script.name === 'henry_core' || script.name === 'henry_toolbox') continue;
        if (script.hidden) continue;
        const shouldBeLoaded = !currentDisabled.has(script.name);
        const isLoaded = loaded.has(script.name);
        if (shouldBeLoaded !== isLoaded) return true;
      }
      return false;
    };

    // スクリプトをカテゴリごとにグループ化
    const scriptsByCategory = {};
    const uncategorized = [];

    scripts.forEach(script => {
      // henry_core と henry_toolbox と hidden は除外
      if (script.name === 'henry_core' || script.name === 'henry_toolbox') return;
      if (script.hidden) return;

      if (script.category) {
        if (!scriptsByCategory[script.category]) {
          scriptsByCategory[script.category] = [];
        }
        scriptsByCategory[script.category].push(script);
      } else {
        uncategorized.push(script);
      }
    });

    // カテゴリをorder順にソート
    const sortedCategories = [...categories].sort((a, b) => (a.order || 99) - (b.order || 99));

    let html = `
      <div class="ht-settings-header">
        <span>スクリプト ON/OFF</span>
        <span class="ht-settings-close">&times;</span>
      </div>
      <div class="ht-settings-body">
    `;

    // カテゴリごとにセクションを生成
    sortedCategories.forEach(category => {
      // 開発カテゴリは開発版のみ表示
      if (category.devOnly && !isDevMode) return;

      const categoryScripts = scriptsByCategory[category.id] || [];
      if (categoryScripts.length === 0) return;

      // サブカテゴリでグループ化
      const subcategoryGroups = {};
      const noSubcategory = [];

      categoryScripts.forEach(script => {
        if (script.subcategory) {
          if (!subcategoryGroups[script.subcategory]) {
            subcategoryGroups[script.subcategory] = [];
          }
          subcategoryGroups[script.subcategory].push(script);
        } else {
          noSubcategory.push(script);
        }
      });

      // サブカテゴリなしをソート（ベータ版を下に）
      noSubcategory.sort((a, b) => {
        const aIsBeta = (a.label || '').includes('ベータ版');
        const bIsBeta = (b.label || '').includes('ベータ版');
        if (aIsBeta && !bIsBeta) return 1;
        if (!aIsBeta && bIsBeta) return -1;
        return (a.order || 99) - (b.order || 99);
      });

      // サブカテゴリ内もソート
      Object.values(subcategoryGroups).forEach(group => {
        group.sort((a, b) => {
          const aIsBeta = (a.label || '').includes('ベータ版');
          const bIsBeta = (b.label || '').includes('ベータ版');
          if (aIsBeta && !bIsBeta) return 1;
          if (!aIsBeta && bIsBeta) return -1;
          return (a.order || 99) - (b.order || 99);
        });
      });

      // スクリプトアイテムのHTML生成ヘルパー
      const renderScriptItem = (script) => {
        const isEnabled = !disabled.has(script.name);
        const isLoaded = loaded.has(script.name);
        const nameClass = isEnabled ? '' : 'disabled';
        const toggleClass = isEnabled ? 'active' : '';
        const dotClass = isLoaded ? 'loaded' : 'not-loaded';
        const displayLabel = (script.label || script.name).replace('（ベータ版）', '').trim();

        return `
          <div class="ht-settings-item" data-script="${script.name}">
            <span class="ht-settings-item-name ${nameClass}">
              <span class="ht-status-dot ${dotClass}"></span>
              ${displayLabel}
            </span>
            <div class="ht-settings-toggle ${toggleClass}" data-script="${script.name}"></div>
          </div>
        `;
      };

      html += `
        <div class="ht-settings-category">
          <div class="ht-settings-category-header">${category.label}</div>
          <div class="ht-settings-card">
            <div class="ht-settings-grid">
      `;

      // サブカテゴリなしのスクリプトを先に表示
      noSubcategory.forEach(script => {
        html += renderScriptItem(script);
      });

      // サブカテゴリごとに表示
      Object.entries(subcategoryGroups).forEach(([subcategoryName, scripts]) => {
        html += `
          <div class="ht-settings-subcategory">${subcategoryName}</div>
          <div class="ht-settings-subcategory-items">
        `;
        scripts.forEach(script => {
          html += renderScriptItem(script);
        });
        html += `</div>`;
      });

      html += `
            </div>
          </div>
        </div>
      `;
    });

    // 未分類があれば表示
    if (uncategorized.length > 0) {
      html += `
        <div class="ht-settings-category">
          <div class="ht-settings-category-header">その他</div>
          <div class="ht-settings-card">
            <div class="ht-settings-grid">
      `;

      uncategorized.forEach(script => {
        const isEnabled = !disabled.has(script.name);
        const isLoaded = loaded.has(script.name);
        const nameClass = isEnabled ? '' : 'disabled';
        const toggleClass = isEnabled ? 'active' : '';
        const dotClass = isLoaded ? 'loaded' : 'not-loaded';
        const displayLabel = (script.label || script.name).replace('（ベータ版）', '').trim();

        html += `
          <div class="ht-settings-item" data-script="${script.name}">
            <span class="ht-settings-item-name ${nameClass}">
              <span class="ht-status-dot ${dotClass}"></span>
              ${displayLabel}
            </span>
            <div class="ht-settings-toggle ${toggleClass}" data-script="${script.name}"></div>
          </div>
        `;
      });

      html += `
            </div>
          </div>
        </div>
      `;
    }

    // 外部スクリプトセクション
    html += `
      <div class="ht-settings-category">
        <div class="ht-settings-category-header">外部スクリプト（他サイト）</div>
        <div class="ht-settings-card">
          <div class="ht-settings-grid">
    `;

    EXTERNAL_SCRIPTS.forEach(script => {
      const isEnabled = !externalDisabled.has(script.name);
      const nameClass = isEnabled ? '' : 'disabled';
      const toggleClass = isEnabled ? 'active' : '';

      html += `
        <div class="ht-settings-item" data-script="${script.name}" data-external="true">
          <span class="ht-settings-item-name ${nameClass}">
            ${script.label || script.name}
          </span>
          <div class="ht-settings-toggle ${toggleClass}" data-script="${script.name}" data-external="true"></div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    // 差分があれば「リロードして反映」を有効化
    const reloadClass = hasPendingChanges() ? '' : 'disabled';
    html += `
      </div>
      <div class="ht-scroll-indicator"></div>
      <div class="ht-settings-footer">
        <span class="ht-settings-reload ${reloadClass}">リロードして反映</span>
      </div>
    `;

    settingsPanel.innerHTML = html;

    // スクロールインジケーターの制御
    const body = settingsPanel.querySelector('.ht-settings-body');
    const scrollIndicator = settingsPanel.querySelector('.ht-scroll-indicator');
    const updateScrollIndicator = () => {
      const hasMoreContent = body.scrollHeight > body.clientHeight;
      const isAtBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 5;
      scrollIndicator.classList.toggle('visible', hasMoreContent && !isAtBottom);
    };
    body.addEventListener('scroll', updateScrollIndicator);
    // 初期表示時にも確認
    setTimeout(updateScrollIndicator, 0);

    // イベント設定
    settingsPanel.querySelector('.ht-settings-close').addEventListener('click', closeSettingsPanel);
    settingsPanel.querySelector('.ht-settings-reload').addEventListener('click', (e) => {
      if (e.target.classList.contains('disabled')) return;
      location.reload();
    });

    // Loaderスクリプトのトグル
    settingsPanel.querySelectorAll('.ht-settings-toggle:not([data-external])').forEach(toggle => {
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

        // 差分があればリロードボタンを有効化、なければ無効化
        const reloadBtn = settingsPanel.querySelector('.ht-settings-reload');
        if (reloadBtn) {
          if (hasPendingChanges()) {
            reloadBtn.classList.remove('disabled');
          } else {
            reloadBtn.classList.add('disabled');
          }
        }
      });
    });

    // 外部スクリプトのトグル
    settingsPanel.querySelectorAll('.ht-settings-toggle[data-external="true"]').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const scriptName = e.target.dataset.script;
        const isActive = e.target.classList.contains('active');

        e.target.classList.toggle('active');
        const nameEl = e.target.closest('.ht-settings-item').querySelector('.ht-settings-item-name');
        nameEl.classList.toggle('disabled');

        // 外部スクリプトはGM storageを直接更新
        const currentDisabled = new Set(GM_getValue('loader-disabled-scripts', []));
        if (isActive) {
          currentDisabled.add(scriptName);
        } else {
          currentDisabled.delete(scriptName);
        }
        GM_setValue('loader-disabled-scripts', Array.from(currentDisabled));
      });
    });
  }

  function openSettingsPanel() {
    if (!settingsPanel) createSettingsPanel();
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

    // グループ行の場合、サブメニューを非表示
    const submenu = this.querySelector('.ht-submenu');
    if (submenu) {
      submenu.style.display = 'none';
    }
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (this !== dragSrcEl) {
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      // 上半分か下半分かを判定してインジケーター表示
      this.classList.remove('drag-over', 'drag-over-bottom');
      if (e.clientY < midY) {
        this.classList.add('drag-over');
      } else {
        this.classList.add('drag-over-bottom');
      }
    }

    return false;
  }

  function handleDragEnter(e) {
    // handleDragOverで処理
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over', 'drag-over-bottom');
  }

  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
      const oldIndex = parseInt(dragSrcEl.dataset.index);
      let newIndex = parseInt(this.dataset.index);

      // 下半分にドロップした場合は、その要素の下に挿入
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY >= midY) {
        newIndex++;
      }

      // 移動元より後ろに移動する場合は調整
      if (oldIndex < newIndex) {
        newIndex--;
      }

      moveItem(oldIndex, newIndex);
    }
    return false;
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    const rows = panel.querySelectorAll('.ht-row');
    rows.forEach(row => row.classList.remove('drag-over', 'drag-over-bottom'));

    // グループ行の場合、サブメニューを再表示
    const submenu = this.querySelector('.ht-submenu');
    if (submenu) {
      submenu.style.display = '';
    }
  }

  // ============================================
  // 5.5. サブメニュー用ドラッグ＆ドロップ処理
  // ============================================

  function handleSubmenuDragStart(e) {
    e.stopPropagation();  // 親のドラッグを防止
    submenuDragSrcEl = this;
    currentSubmenuGroup = this.dataset.groupName;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');

    // サブメニューを表示し続ける
    const submenu = this.closest('.ht-submenu');
    if (submenu) submenu.classList.add('submenu-dragging');
  }

  function handleSubmenuDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (this !== submenuDragSrcEl && this.dataset.groupName === currentSubmenuGroup) {
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      this.classList.remove('drag-over', 'drag-over-bottom');
      if (e.clientY < midY) {
        this.classList.add('drag-over');
      } else {
        this.classList.add('drag-over-bottom');
      }
    }

    return false;
  }

  function handleSubmenuDragEnter(e) {
    e.stopPropagation();
  }

  function handleSubmenuDragLeave(e) {
    e.stopPropagation();
    this.classList.remove('drag-over', 'drag-over-bottom');
  }

  function handleSubmenuDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    e.preventDefault();

    if (submenuDragSrcEl !== this && this.dataset.groupName === currentSubmenuGroup) {
      const groupName = this.dataset.groupName;
      const submenu = this.closest('.ht-submenu');
      const rows = Array.from(submenu.querySelectorAll('.ht-submenu-row'));

      const oldIndex = rows.indexOf(submenuDragSrcEl);
      let newIndex = rows.indexOf(this);

      // 下半分にドロップした場合
      const rect = this.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY >= midY) {
        newIndex++;
      }

      if (oldIndex < newIndex) {
        newIndex--;
      }

      moveSubmenuItem(groupName, oldIndex, newIndex, rows);
    }

    return false;
  }

  function handleSubmenuDragEnd(e) {
    e.stopPropagation();
    this.classList.remove('dragging');

    // サブメニューのdraggingクラスを解除
    const submenu = this.closest('.ht-submenu');
    if (submenu) submenu.classList.remove('submenu-dragging');

    const rows = submenu?.querySelectorAll('.ht-submenu-row') || [];
    rows.forEach(row => row.classList.remove('drag-over', 'drag-over-bottom'));

    submenuDragSrcEl = null;
    currentSubmenuGroup = null;
  }

  function moveSubmenuItem(groupName, fromIndex, toIndex, rows) {
    // 順序を保存
    if (!groupItemOrder[groupName]) {
      groupItemOrder[groupName] = {};
    }

    // 現在の順序を配列として取得
    const events = rows.map(r => r.dataset.event);
    const movedEvent = events.splice(fromIndex, 1)[0];
    events.splice(toIndex, 0, movedEvent);

    // 新しい順序を保存
    events.forEach((event, index) => {
      groupItemOrder[groupName][event] = index;
    });

    GM_setValue('toolbox-group-item-order', groupItemOrder);

    // DOM操作で並び替え（buildMenuを呼ばない）
    const submenu = rows[0]?.closest('.ht-submenu');
    if (submenu) {
      const srcRow = rows[fromIndex];
      const targetRow = rows[toIndex];
      if (fromIndex < toIndex) {
        submenu.insertBefore(srcRow, targetRow.nextSibling);
      } else {
        submenu.insertBefore(srcRow, targetRow);
      }
      // data-subIndexを更新
      Array.from(submenu.querySelectorAll('.ht-submenu-row')).forEach((row, i) => {
        row.dataset.subIndex = i;
      });
    }
  }

  // ============================================
  // 6. 状態管理・ヘルパー
  // ============================================

  function moveItem(fromIndex, toIndex) {
    // displayItemsベースで移動
    const item = currentDisplayItems.splice(fromIndex, 1)[0];
    currentDisplayItems.splice(toIndex, 0, item);
    saveCurrentOrder();
    buildMenu();
  }

  function saveCurrentOrder() {
    userOrder = {};
    groupOrder = {};
    currentDisplayItems.forEach((displayItem, index) => {
      if (displayItem.type === 'group') {
        groupOrder[displayItem.data.name] = index;
      } else {
        userOrder[displayItem.data.event] = index;
      }
    });
    GM_setValue('toolbox-user-order', userOrder);
    GM_setValue('toolbox-group-order', groupOrder);
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

  // MutationObserver管理（navのみ監視で最適化）
  let debounceTimer = null;
  let observer = null;

  function setupObserver() {
    // 既存のobserverを破棄
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const nav = document.querySelector('nav');
    if (!nav) return;

    observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // ボタンが存在しない場合のみ再初期化
        if (!document.querySelector('button[data-tm-toolbox]')) {
          init();
        }
      }, 200);
    });
    observer.observe(nav, { childList: true, subtree: true });
  }

  // SPA遷移時に再設定
  window.addEventListener('henry:navigation', () => {
    init();
    setupObserver();
  });

  // ============================================
  // 8. ログイン画面対応
  // ============================================

  function isLoginScreen() {
    return document.title.includes('ログイン');
  }

  function hideToolbox() {
    const toolboxBtn = document.querySelector('button[data-tm-toolbox]');
    if (toolboxBtn) {
      toolboxBtn.closest('li').style.display = 'none';
    }
    closePanel();
    closeSettingsPanel();
  }

  function showToolbox() {
    const toolboxBtn = document.querySelector('button[data-tm-toolbox]');
    if (toolboxBtn) {
      toolboxBtn.closest('li').style.display = '';
    }
  }

  function setupTitleObserver() {
    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const titleObserver = new MutationObserver(() => {
      if (isLoginScreen()) {
        hideToolbox();
      } else {
        showToolbox();
      }
    });
    titleObserver.observe(titleEl, { childList: true });

    // 初回チェック
    if (isLoginScreen()) {
      hideToolbox();
    }
  }

  init();  // 初回実行
  setupObserver();  // 初回observer設定
  setupTitleObserver();  // ログイン画面監視

  console.log(`[Toolbox] Ready v${VERSION}`);
})();
