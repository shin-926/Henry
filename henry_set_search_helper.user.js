// ==UserScript==
// @name         Henry セット展開検索ヘルパー
// @namespace    https://henry-app.jp/
// @version      1.4.6
// @description  セット展開画面の検索ボックス上にクイック検索ボタンを追加
// @match        https://henry-app.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_set_search_helper.user.js
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_set_search_helper.user.js
// ==/UserScript==

(function() {
  'use strict';

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const SCRIPT_NAME = 'henry_set_search_helper';
  const STORAGE_KEY = 'set_search_buttons';
  const DEFAULT_ITEMS = [
    { type: 'button', text: '処方' },
    { type: 'button', text: '処置' },
    { type: 'button', text: '固定' },
    { type: 'button', text: '注射' }
  ];

  // 設定の読み込み（後方互換: 文字列配列→オブジェクト配列に変換）
  function loadItems() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) {
      // マイグレーション: 文字列→オブジェクト
      return saved.map(item => {
        if (typeof item === 'string') {
          return { type: 'button', text: item };
        }
        return item;
      });
    }
    return DEFAULT_ITEMS;
  }

  // 設定の保存
  function saveItems(items) {
    GM_setValue(STORAGE_KEY, items);
  }

  // HenryCore待機
  async function waitForHenryCore(timeout = 5000) {
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return false;
      }
    }
    return true;
  }

  // React対応でinputのvalueをセット
  function setInputValueReactSafe(input, value) {
    const prototype = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(prototype, 'value');
    const setter = desc && desc.set;

    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // セット展開画面かどうか判定
  function isSetPanel() {
    const title = document.querySelector('h4[data-title-text="true"]');
    return title && title.textContent.trim() === 'セット';
  }

  // 検索ボックスを取得
  function getSearchInput() {
    const title = document.querySelector('h4[data-title-text="true"]');
    if (!title || title.textContent.trim() !== 'セット') return null;

    const panel = title.closest('[data-popover]');
    if (panel) {
      return panel.querySelector('input[placeholder="検索"]');
    }
    return document.querySelector('input[placeholder="検索"]');
  }

  // 検索ボックスのコンテナを取得
  function getSearchContainer() {
    const searchInput = getSearchInput();
    if (!searchInput) return null;
    return searchInput.closest('div')?.parentElement;
  }

  // スタイル注入
  function injectStyles() {
    if (document.getElementById('henry-set-search-helper-styles')) return;

    const style = document.createElement('style');
    style.id = 'henry-set-search-helper-styles';
    style.textContent = `
      .hss-button-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 12px;
        align-items: center;
      }
      .hss-quick-btn {
        padding: 4px 12px;
        font-size: 13px;
        border: 1px solid #d0d0d0;
        border-radius: 16px;
        background: #f5f5f5;
        color: #333;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .hss-quick-btn:hover {
        background: #e8e8e8;
        border-color: #bbb;
      }
      .hss-quick-btn:active {
        background: #ddd;
      }
      .hss-dropdown {
        position: relative;
      }
      .hss-dropdown-btn {
        padding: 4px 12px;
        font-size: 13px;
        border: 1px solid #d0d0d0;
        border-radius: 16px;
        background: #f5f5f5;
        color: #333;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .hss-dropdown-btn:hover {
        background: #e8e8e8;
        border-color: #bbb;
      }
      .hss-dropdown-btn.open {
        background: #e0e0e0;
        border-color: #aaa;
      }
      .hss-dropdown-arrow {
        font-size: 10px;
        transition: transform 0.15s ease;
      }
      .hss-dropdown-btn.open .hss-dropdown-arrow {
        transform: rotate(180deg);
      }
      .hss-dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background: white;
        border: 1px solid #d0d0d0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 120px;
        z-index: 1000;
        overflow: hidden;
        display: none;
      }
      .hss-dropdown-menu.open {
        display: block;
      }
      .hss-dropdown-item {
        padding: 8px 12px;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        transition: background 0.1s ease;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
      }
      .hss-dropdown-item:hover {
        background: #f0f0f0;
      }
      .hss-dropdown-item:active {
        background: #e0e0e0;
      }
      /* カルテ上のドラッグ用スタイル */
      .hss-drag-mode .hss-quick-btn.hss-dragging,
      .hss-drag-mode .hss-dropdown.hss-dragging {
        opacity: 0.3;
      }
      .hss-drag-ghost {
        position: fixed;
        pointer-events: none;
        z-index: 10001;
        padding: 4px 12px;
        font-size: 13px;
        border: 1px solid #2196f3;
        border-radius: 16px;
        background: #e3f2fd;
        color: #1976d2;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translate(-50%, -50%);
        white-space: nowrap;
      }
      .hss-drop-indicator {
        position: absolute;
        width: 2px;
        background: #2196f3;
        border-radius: 1px;
        pointer-events: none;
        z-index: 100;
      }
      .hss-settings-btn {
        padding: 4px 8px;
        font-size: 14px;
        border: none;
        background: transparent;
        color: #888;
        cursor: pointer;
        transition: color 0.15s ease;
      }
      .hss-settings-btn:hover {
        color: #333;
      }
      .hss-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .hss-modal {
        background: white;
        border-radius: 8px;
        padding: 20px;
        min-width: 420px;
        max-width: 480px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }
      .hss-modal-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #333;
      }
      .hss-button-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
        max-height: 200px;
        overflow-y: auto;
      }
      .hss-button-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 6px;
        cursor: grab;
        user-select: none;
        transition: background 0.15s, box-shadow 0.15s;
      }
      .hss-button-item:hover {
        background: #eee;
      }
      .hss-button-item.dragging {
        opacity: 0.5;
        background: #e0e0e0;
      }
      .hss-button-item.drag-over {
        box-shadow: 0 -2px 0 #2196f3;
      }
      .hss-drag-handle {
        color: #999;
        font-size: 14px;
        cursor: grab;
      }
      .hss-button-item-text {
        flex: 1;
        font-size: 14px;
        color: #333;
        padding: 2px 4px;
        border-radius: 4px;
        cursor: text;
      }
      .hss-button-item-text:hover {
        background: #e8e8e8;
      }
      .hss-button-item-input {
        flex: 1;
        font-size: 14px;
        padding: 2px 4px;
        border: 1px solid #2196f3;
        border-radius: 4px;
        outline: none;
      }
      .hss-delete-btn {
        padding: 2px 8px;
        font-size: 12px;
        border: 1px solid #e57373;
        background: transparent;
        color: #e57373;
        border-radius: 4px;
        cursor: pointer;
      }
      .hss-delete-btn:hover {
        background: #ffebee;
      }
      .hss-add-section {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        align-items: stretch;
      }
      .hss-add-section > * {
        box-sizing: border-box;
        height: 36px;
      }
      .hss-add-input {
        flex: 1;
        padding: 0 12px;
        font-size: 14px;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        outline: none;
      }
      .hss-add-input:focus {
        border-color: #2196f3;
      }
      .hss-add-btn {
        padding: 0 16px;
        font-size: 14px;
        border: 1px solid #9e9e9e;
        background: transparent;
        color: #616161;
        border-radius: 6px;
        cursor: pointer;
      }
      .hss-add-btn:hover {
        background: #f5f5f5;
      }
      .hss-add-btn.has-pending {
        border-color: #ff9800;
        background-color: #fff8e1;
        color: #e65100;
      }
      .hss-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .hss-cancel-btn {
        padding: 8px 16px;
        font-size: 14px;
        border: 1px solid #d0d0d0;
        background: white;
        color: #333;
        border-radius: 6px;
        cursor: pointer;
      }
      .hss-cancel-btn:hover {
        background: #f5f5f5;
      }
      .hss-confirm-btn {
        padding: 8px 16px;
        font-size: 14px;
        border: none;
        background: #2196f3;
        color: white;
        border-radius: 6px;
        cursor: pointer;
      }
      .hss-confirm-btn:hover {
        background: #1976d2;
      }
      .hss-empty-message {
        text-align: center;
        color: #888;
        padding: 16px;
        font-size: 14px;
      }
      .hss-item-type {
        font-size: 11px;
        color: #888;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 4px;
        margin-right: 4px;
      }
      .hss-item-type.dropdown {
        background: #e3f2fd;
        color: #1976d2;
      }
      .hss-dropdown-items {
        margin-left: 24px;
        margin-top: 8px;
        padding: 8px;
        background: #fafafa;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
      }
      .hss-dropdown-items-title {
        font-size: 12px;
        color: #666;
        margin-bottom: 6px;
      }
      .hss-dropdown-item-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }
      .hss-dropdown-item-row:last-child {
        margin-bottom: 0;
      }
      .hss-dropdown-item-row.draggable {
        cursor: grab;
      }
      .hss-dropdown-item-row.dragging {
        opacity: 0.5;
        background: #e0e0e0;
      }
      .hss-dropdown-item-row.drag-over {
        box-shadow: 0 -2px 0 #2196f3;
      }
      .hss-sub-drag-handle {
        color: #bbb;
        font-size: 12px;
        cursor: grab;
        user-select: none;
      }
      .hss-dropdown-item-input {
        flex: 1;
        padding: 4px 8px;
        font-size: 13px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        outline: none;
      }
      .hss-dropdown-item-input:focus {
        border-color: #2196f3;
      }
      .hss-small-btn {
        padding: 2px 6px;
        font-size: 11px;
        border: 1px solid #d0d0d0;
        background: white;
        border-radius: 4px;
        cursor: pointer;
      }
      .hss-small-btn:hover {
        background: #f5f5f5;
      }
      .hss-small-btn.delete {
        border-color: #e57373;
        color: #e57373;
      }
      .hss-small-btn.delete:hover {
        background: #ffebee;
      }
      .hss-add-type-select {
        padding: 0 12px;
        font-size: 14px;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        outline: none;
        background: white;
      }
    `;
    document.head.appendChild(style);
  }

  // 設定モーダルを表示
  function showSettingsModal(onSave) {
    let items = loadItems();
    let draggedIndex = null;

    const overlay = document.createElement('div');
    overlay.className = 'hss-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'hss-modal';

    // ドロップダウンの項目編集UIを作成
    function createDropdownItemsEditor(item, index) {
      const container = document.createElement('div');
      container.className = 'hss-dropdown-items';

      const title = document.createElement('div');
      title.className = 'hss-dropdown-items-title';
      title.textContent = 'メニュー項目:';
      container.appendChild(title);

      const itemsList = document.createElement('div');

      let subDraggedIndex = null;

      function renderDropdownItems() {
        itemsList.innerHTML = '';
        (item.items || []).forEach((subItem, subIndex) => {
          const row = document.createElement('div');
          row.className = 'hss-dropdown-item-row draggable';
          row.draggable = true;
          row.dataset.subIndex = subIndex;

          // ドラッグハンドル
          const handle = document.createElement('span');
          handle.className = 'hss-sub-drag-handle';
          handle.textContent = '☰';

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'hss-dropdown-item-input';
          input.value = subItem;
          input.onchange = () => {
            const newVal = input.value.trim();
            if (newVal) {
              item.items[subIndex] = newVal;
            }
          };

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'hss-small-btn delete';
          deleteBtn.textContent = '×';
          deleteBtn.onclick = () => {
            item.items.splice(subIndex, 1);
            renderDropdownItems();
          };

          // ドラッグイベント
          row.ondragstart = (e) => {
            subDraggedIndex = subIndex;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
          };

          row.ondragend = () => {
            row.classList.remove('dragging');
            subDraggedIndex = null;
            itemsList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
          };

          row.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (subDraggedIndex !== null && subDraggedIndex !== subIndex) {
              row.classList.add('drag-over');
            }
          };

          row.ondragleave = () => {
            row.classList.remove('drag-over');
          };

          row.ondrop = (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');
            if (subDraggedIndex !== null && subDraggedIndex !== subIndex) {
              const draggedItem = item.items[subDraggedIndex];
              item.items.splice(subDraggedIndex, 1);
              item.items.splice(subIndex, 0, draggedItem);
              renderDropdownItems();
            }
          };

          row.appendChild(handle);
          row.appendChild(input);
          row.appendChild(deleteBtn);
          itemsList.appendChild(row);
        });

        // 追加行
        const addRow = document.createElement('div');
        addRow.className = 'hss-dropdown-item-row';
        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.className = 'hss-dropdown-item-input hss-pending-input';
        addInput.placeholder = '項目を追加...';
        addInput.dataset.itemIndex = index; // どのドロップダウンの入力欄か識別用

        const addSubItem = () => {
          const val = addInput.value.trim();
          if (val) {
            if (!item.items) item.items = [];
            item.items.push(val);
            renderDropdownItems();
            // 再描画後、追加用入力欄にフォーカス
            const newAddInput = itemsList.querySelector('.hss-dropdown-item-row:last-child input');
            if (newAddInput) newAddInput.focus();
          }
        };

        addInput.onkeydown = (e) => {
          if (e.isComposing) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            addSubItem();
          }
        };

        addRow.appendChild(addInput);
        itemsList.appendChild(addRow);
      }

      renderDropdownItems();
      container.appendChild(itemsList);
      return container;
    }

    // ドラッグ中の自動スクロール
    let scrollInterval = null;
    function startAutoScroll(list, direction) {
      if (scrollInterval) return;
      scrollInterval = setInterval(() => {
        list.scrollTop += direction * 8;
      }, 16);
    }
    function stopAutoScroll() {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    }

    function renderList() {
      const list = modal.querySelector('.hss-button-list');
      list.innerHTML = '';

      if (items.length === 0) {
        list.innerHTML = '<div class="hss-empty-message">アイテムがありません</div>';
        return;
      }

      // リスト全体のdragoverで自動スクロール判定
      list.ondragover = (e) => {
        const rect = list.getBoundingClientRect();
        const y = e.clientY;
        const threshold = 40;

        if (y - rect.top < threshold) {
          startAutoScroll(list, -1); // 上へスクロール
        } else if (rect.bottom - y < threshold) {
          startAutoScroll(list, 1); // 下へスクロール
        } else {
          stopAutoScroll();
        }
      };

      list.ondragleave = () => stopAutoScroll();
      list.ondrop = () => stopAutoScroll();

      items.forEach((item, index) => {
        const wrapper = document.createElement('div');

        const row = document.createElement('div');
        row.className = 'hss-button-item';
        row.draggable = true;
        row.dataset.index = index;

        // ドラッグハンドル
        const handle = document.createElement('span');
        handle.className = 'hss-drag-handle';
        handle.textContent = '☰';

        // タイプバッジ
        const typeBadge = document.createElement('span');
        typeBadge.className = 'hss-item-type' + (item.type === 'dropdown' ? ' dropdown' : '');
        typeBadge.textContent = item.type === 'dropdown' ? '▼' : '●';

        // テキスト（クリックで編集）
        const textEl = document.createElement('span');
        textEl.className = 'hss-button-item-text';
        textEl.textContent = item.text;
        textEl.onclick = (e) => {
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'hss-button-item-input';
          input.value = item.text;
          textEl.replaceWith(input);
          input.focus();
          input.select();

          const finishEdit = () => {
            const newText = input.value.trim();
            if (newText) {
              item.text = newText;
            }
            renderList();
          };

          input.onblur = finishEdit;
          input.onkeydown = (ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              finishEdit();
            } else if (ev.key === 'Escape') {
              renderList();
            }
          };
        };

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'hss-delete-btn';
        deleteBtn.textContent = '削除';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          items.splice(index, 1);
          renderList();
        };

        row.appendChild(handle);
        row.appendChild(typeBadge);
        row.appendChild(textEl);
        row.appendChild(deleteBtn);

        // ドラッグイベント
        row.ondragstart = (e) => {
          draggedIndex = index;
          row.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        };

        row.ondragend = () => {
          row.classList.remove('dragging');
          draggedIndex = null;
          list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
          stopAutoScroll();
        };

        row.ondragover = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (draggedIndex !== null && draggedIndex !== index) {
            row.classList.add('drag-over');
          }
        };

        row.ondragleave = () => {
          row.classList.remove('drag-over');
        };

        row.ondrop = (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          if (draggedIndex !== null && draggedIndex !== index) {
            const draggedItem = items[draggedIndex];
            items.splice(draggedIndex, 1);
            items.splice(index, 0, draggedItem);
            renderList();
          }
        };

        wrapper.appendChild(row);

        // ドロップダウンの場合は項目編集UIを追加
        if (item.type === 'dropdown') {
          wrapper.appendChild(createDropdownItemsEditor(item, index));
        }

        list.appendChild(wrapper);
      });
    }

    modal.innerHTML = `
      <div class="hss-modal-title">クイック検索の設定</div>
      <div class="hss-button-list"></div>
      <div class="hss-add-section">
        <select class="hss-add-type-select">
          <option value="button">ボタン</option>
          <option value="dropdown">ドロップダウン</option>
        </select>
        <input type="text" class="hss-add-input" placeholder="テキストを入力">
        <button class="hss-add-btn">追加</button>
      </div>
      <div class="hss-modal-actions">
        <button class="hss-cancel-btn">キャンセル</button>
        <button class="hss-confirm-btn">この内容で設定</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    renderList();

    const typeSelect = modal.querySelector('.hss-add-type-select');
    const addInput = modal.querySelector('.hss-add-input');
    const addBtn = modal.querySelector('.hss-add-btn');
    const cancelBtn = modal.querySelector('.hss-cancel-btn');
    const confirmBtn = modal.querySelector('.hss-confirm-btn');

    const handleAdd = () => {
      const text = addInput.value.trim();
      if (!text) return;

      // 重複チェック（同じテキストのアイテムがあるか）
      if (items.some(item => item.text === text)) {
        addInput.style.borderColor = '#e53935';
        addInput.style.backgroundColor = '#ffebee';
        setTimeout(() => {
          addInput.style.borderColor = '';
          addInput.style.backgroundColor = '';
        }, 300);
        return;
      }

      const type = typeSelect.value;
      if (type === 'button') {
        items.push({ type: 'button', text });
      } else {
        items.push({ type: 'dropdown', text, items: [] });
      }
      addInput.value = '';
      renderList();
    };

    // 入力値があるときに追加ボタンの色を変えて注意を促す
    const updateAddBtnHighlight = () => {
      if (addInput.value.trim()) {
        addBtn.classList.add('has-pending');
      } else {
        addBtn.classList.remove('has-pending');
      }
    };

    addInput.addEventListener('input', updateAddBtnHighlight);

    addBtn.onclick = () => {
      handleAdd();
      updateAddBtnHighlight();
    };
    addInput.onkeydown = (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
        updateAddBtnHighlight();
      }
    };

    confirmBtn.onclick = () => {
      // 入力途中のテキストを拾ってドロップダウンに追加
      modal.querySelectorAll('.hss-pending-input').forEach(input => {
        const val = input.value.trim();
        if (val) {
          const idx = parseInt(input.dataset.itemIndex, 10);
          if (!isNaN(idx) && items[idx] && items[idx].type === 'dropdown') {
            if (!items[idx].items) items[idx].items = [];
            items[idx].items.push(val);
          }
        }
      });
      saveItems(items);
      overlay.remove();
      if (onSave) onSave();
    };

    cancelBtn.onclick = () => {
      overlay.remove();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };

    addInput.focus();
  }

  // 開いているドロップダウンを閉じる
  function closeAllDropdowns() {
    document.querySelectorAll('.hss-dropdown-btn.open').forEach(btn => {
      btn.classList.remove('open');
    });
    document.querySelectorAll('.hss-dropdown-menu.open').forEach(menu => {
      menu.classList.remove('open');
    });
  }

  // ボタンコンテナを作成
  function createButtonContainer() {
    const items = loadItems();
    const container = document.createElement('div');
    container.className = 'hss-button-container';
    container.id = 'hss-button-container';

    // ドラッグ関連の状態
    let dragMode = false;
    let draggedIndex = null;
    let dropTargetIndex = null;
    let dropPosition = null; // 'left' or 'right'
    let longPressTimer = null;
    let ghost = null;
    const LONG_PRESS_DURATION = 500;

    // ゴースト要素作成
    function createGhost(text, x, y) {
      ghost = document.createElement('div');
      ghost.className = 'hss-drag-ghost';
      ghost.textContent = text;
      ghost.style.left = x + 'px';
      ghost.style.top = y + 'px';
      document.body.appendChild(ghost);
    }

    // ゴースト位置更新
    function updateGhostPosition(x, y) {
      if (ghost) {
        ghost.style.left = x + 'px';
        ghost.style.top = y + 'px';
      }
    }

    // ゴースト削除
    function removeGhost() {
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
    }

    // ドロップインジケーター（縦線）
    let dropIndicator = null;

    function createDropIndicator() {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'hss-drop-indicator';
      dropIndicator.style.display = 'none';
      container.style.position = 'relative';
      container.appendChild(dropIndicator);
    }

    function showDropIndicator(x, top, height) {
      if (!dropIndicator) return;
      dropIndicator.style.display = 'block';
      dropIndicator.style.left = x + 'px';
      dropIndicator.style.top = top + 'px';
      dropIndicator.style.height = height + 'px';
    }

    function hideDropIndicator() {
      if (dropIndicator) {
        dropIndicator.style.display = 'none';
      }
      dropTargetIndex = null;
      dropPosition = null;
    }

    // ドラッグモード開始
    function enterDragMode(startIndex, text, x, y) {
      dragMode = true;
      draggedIndex = startIndex;
      container.classList.add('hss-drag-mode');
      closeAllDropdowns();

      // ドラッグ中の要素にクラス追加
      const elements = container.querySelectorAll('.hss-quick-btn, .hss-dropdown');
      elements[startIndex]?.classList.add('hss-dragging');

      // ゴースト作成
      createGhost(text, x, y);
    }

    // ドラッグモード終了
    function exitDragMode() {
      dragMode = false;
      draggedIndex = null;
      container.classList.remove('hss-drag-mode');
      container.querySelectorAll('.hss-dragging').forEach(el => {
        el.classList.remove('hss-dragging');
      });
      removeGhost();
      hideDropIndicator();
    }

    // ドロップインジケーター作成
    createDropIndicator();

    // マウス移動ハンドラ
    function handleMouseMove(e) {
      if (!dragMode) return;
      updateGhostPosition(e.clientX, e.clientY);

      // ドロップ位置の計算
      const elements = Array.from(container.querySelectorAll('.hss-quick-btn, .hss-dropdown'));
      const containerRect = container.getBoundingClientRect();
      hideDropIndicator();

      for (let i = 0; i < elements.length; i++) {
        if (i === draggedIndex) continue;

        const rect = elements[i].getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        // X座標とY座標の両方をチェック
        const inXRange = e.clientX >= rect.left - 10 && e.clientX <= rect.right + 10;
        const inYRange = e.clientY >= rect.top - 5 && e.clientY <= rect.bottom + 5;

        if (inXRange && inYRange) {
          dropTargetIndex = i;
          const indicatorHeight = rect.height;
          const indicatorTop = rect.top - containerRect.top;

          if (e.clientX < centerX) {
            dropPosition = 'left';
            const indicatorX = rect.left - containerRect.left - 3;
            showDropIndicator(indicatorX, indicatorTop, indicatorHeight);
          } else {
            dropPosition = 'right';
            const indicatorX = rect.right - containerRect.left + 1;
            showDropIndicator(indicatorX, indicatorTop, indicatorHeight);
          }
          break;
        }
      }
    }

    // 長押し検出の設定
    function setupLongPress(element, index, text) {
      let startX, startY;

      element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // 左クリックのみ
        startX = e.clientX;
        startY = e.clientY;
        longPressTimer = setTimeout(() => {
          enterDragMode(index, text, startX, startY);
        }, LONG_PRESS_DURATION);
      });

      element.addEventListener('mouseup', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      element.addEventListener('mouseleave', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
    }

    items.forEach((item, index) => {
      if (item.type === 'dropdown') {
        // ドロップダウン作成
        const dropdown = document.createElement('div');
        dropdown.className = 'hss-dropdown';

        const btn = document.createElement('button');
        btn.className = 'hss-dropdown-btn';
        btn.innerHTML = `<span>${item.text}</span><span class="hss-dropdown-arrow">▼</span>`;

        const menu = document.createElement('div');
        menu.className = 'hss-dropdown-menu';

        (item.items || []).forEach(subItem => {
          const menuItem = document.createElement('button');
          menuItem.className = 'hss-dropdown-item';
          menuItem.textContent = subItem;
          menuItem.onclick = (e) => {
            e.stopPropagation();
            if (dragMode) return;
            const searchInput = getSearchInput();
            if (searchInput) {
              setInputValueReactSafe(searchInput, subItem + ' ');
              searchInput.focus();
            }
            closeAllDropdowns();
          };
          menu.appendChild(menuItem);
        });

        btn.onclick = (e) => {
          e.stopPropagation();
          if (dragMode) return;
          const isOpen = btn.classList.contains('open');
          closeAllDropdowns();
          if (!isOpen) {
            btn.classList.add('open');
            menu.classList.add('open');
          }
        };

        dropdown.appendChild(btn);
        dropdown.appendChild(menu);
        container.appendChild(dropdown);

        // 長押し検出をドロップダウン全体に設定
        setupLongPress(dropdown, index, item.text);
      } else {
        // 通常ボタン
        const btn = document.createElement('button');
        btn.className = 'hss-quick-btn';
        btn.textContent = item.text;
        btn.onclick = () => {
          if (dragMode) return;
          const searchInput = getSearchInput();
          if (searchInput) {
            setInputValueReactSafe(searchInput, item.text + ' ');
            searchInput.focus();
          }
        };
        container.appendChild(btn);

        // 長押し検出
        setupLongPress(btn, index, item.text);
      }
    });

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'hss-settings-btn';
    settingsBtn.textContent = '⚙️';
    settingsBtn.title = 'ボタンの設定';
    settingsBtn.onclick = (e) => {
      e.stopPropagation();
      if (dragMode) {
        exitDragMode();
        return;
      }
      showSettingsModal(() => refreshButtons());
    };
    container.appendChild(settingsBtn);

    // マウスアップでドロップ処理
    const handleMouseUp = () => {
      if (dragMode && draggedIndex !== null) {
        if (dropTargetIndex !== null && dropPosition !== null) {
          // ドロップ位置を計算
          const currentItems = loadItems();
          const draggedItem = currentItems[draggedIndex];

          // 新しい位置を決定
          let newIndex;
          if (dropPosition === 'left') {
            newIndex = dropTargetIndex;
          } else {
            newIndex = dropTargetIndex + 1;
          }

          // ドラッグ元より後ろに移動する場合は1つ引く
          if (draggedIndex < newIndex) {
            newIndex--;
          }

          // 実際に移動
          if (draggedIndex !== newIndex) {
            currentItems.splice(draggedIndex, 1);
            currentItems.splice(newIndex, 0, draggedItem);
            saveItems(currentItems);
            exitDragMode();
            refreshButtons();
            return;
          }
        }
        exitDragMode();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    // クリーンアップ用にイベントを記録
    container._cleanupHandlers = { handleMouseUp, handleMouseMove };

    return container;
  }

  // ボタンを挿入
  function insertButtons() {
    if (document.getElementById('hss-button-container')) return;

    const searchContainer = getSearchContainer();
    if (!searchContainer) return;

    const buttonContainer = createButtonContainer();
    searchContainer.parentElement.insertBefore(buttonContainer, searchContainer);
  }

  // ボタンを再描画
  function refreshButtons() {
    const existing = document.getElementById('hss-button-container');
    if (existing) {
      existing.remove();
    }
    insertButtons();
  }

  // ボタンを削除
  function removeButtons() {
    const existing = document.getElementById('hss-button-container');
    if (existing) {
      // クリーンアップ
      if (existing._cleanupHandlers) {
        document.removeEventListener('mouseup', existing._cleanupHandlers.handleMouseUp);
        document.removeEventListener('mousemove', existing._cleanupHandlers.handleMouseMove);
      }
      existing.remove();
    }
  }

  // セットアップ処理（ナビゲーション時に毎回呼ばれる）
  function setup(cleaner) {
    injectStyles();

    let wasSetPanelOpen = false;
    let debounceTimer = null;

    function checkAndUpdate() {
      const isOpen = isSetPanel();

      if (isOpen && !wasSetPanelOpen) {
        insertButtons();
        wasSetPanelOpen = true;
      } else if (!isOpen && wasSetPanelOpen) {
        removeButtons();
        wasSetPanelOpen = false;
      }
    }

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkAndUpdate, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // ドキュメントクリックでドロップダウンを閉じる
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.hss-dropdown')) {
        closeAllDropdowns();
      }
    };
    document.addEventListener('click', handleDocumentClick);

    cleaner.add(() => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener('click', handleDocumentClick);
    });

    // 初回チェック
    checkAndUpdate();
  }

  // 初期化（1回だけ）
  async function init() {
    const coreReady = await waitForHenryCore();
    if (!coreReady) return;

    const HenryCore = pageWindow.HenryCore;
    const cleaner = HenryCore.utils.createCleaner();

    HenryCore.utils.subscribeNavigation(cleaner, () => setup(cleaner));
  }

  init();
})();
