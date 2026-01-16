// ==UserScript==
// @name         Henry セット展開検索ヘルパー
// @namespace    https://henry-app.jp/
// @version      2.2.3
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
        position: relative;
      }
      .hss-quick-btn {
        position: relative;
        padding: 4px 12px;
        font-size: 13px;
        border: 1px solid #d0d0d0;
        border-radius: 16px;
        background: #f5f5f5;
        color: #333;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        user-select: none;
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
        user-select: none;
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
      /* ドラッグ用スタイル */
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
      /* 並び替えアニメーション */
      .hss-quick-btn.hss-animating,
      .hss-dropdown.hss-animating {
        transition: transform 0.3s ease-out;
      }
      /* 右端コントロール */
      .hss-control-btn {
        padding: 4px 8px;
        font-size: 14px;
        border: 1px solid #d0d0d0;
        border-radius: 16px;
        background: #f5f5f5;
        color: #888;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .hss-control-btn:hover {
        background: #e8e8e8;
        color: #333;
      }
      .hss-trash-zone {
        padding: 4px 10px;
        font-size: 14px;
        border: 1px dashed #d0d0d0;
        border-radius: 16px;
        background: #fafafa;
        color: #aaa;
        transition: all 0.15s ease;
      }
      .hss-trash-zone.active {
        border-color: #e53935;
        background: #ffebee;
        color: #e53935;
      }
      .hss-trash-zone.drag-over {
        border-color: #e53935;
        background: #ffcdd2;
        color: #c62828;
        transform: scale(1.1);
      }
      /* 編集ポップアップ */
      .hss-edit-popup {
        position: fixed;
        background: white;
        border: 1px solid #d0d0d0;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        min-width: 200px;
        max-width: 280px;
        z-index: 10000;
        padding: 12px;
      }
      .hss-edit-popup-section {
        margin-bottom: 12px;
      }
      .hss-edit-popup-section:last-child {
        margin-bottom: 0;
      }
      .hss-edit-popup-label {
        font-size: 11px;
        color: #666;
        margin-bottom: 4px;
        display: block;
      }
      .hss-edit-popup-input {
        width: 100%;
        padding: 6px 10px;
        font-size: 13px;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        outline: none;
        box-sizing: border-box;
      }
      .hss-edit-popup-input:focus {
        border-color: #2196f3;
      }
      .hss-edit-popup-items {
        max-height: 300px;
        overflow-y: auto;
      }
      .hss-edit-popup-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
        border-radius: 4px;
        transition: background 0.1s ease;
      }
      .hss-edit-popup-item.dragging {
        opacity: 0.4;
        background: #e3f2fd;
      }
      .hss-edit-popup-item.drag-over {
        border-top: 2px solid #2196f3;
        margin-top: -2px;
      }
      .hss-drag-handle {
        cursor: grab;
        color: #aaa;
        font-size: 14px;
        padding: 2px 4px;
        user-select: none;
        line-height: 1;
      }
      .hss-drag-handle:hover {
        color: #666;
      }
      .hss-drag-handle:active {
        cursor: grabbing;
      }
      .hss-edit-popup-item-input {
        flex: 1;
        font-size: 13px;
        color: #333;
        padding: 4px 8px;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        outline: none;
        min-width: 0;
      }
      .hss-edit-popup-item-input:hover {
        border-color: #e0e0e0;
        background: #fafafa;
      }
      .hss-edit-popup-item-input:focus {
        border-color: #2196f3;
        background: #fff;
      }
      .hss-edit-popup-item-delete {
        padding: 2px 6px;
        font-size: 11px;
        border: none;
        background: transparent;
        color: #e57373;
        cursor: pointer;
        border-radius: 4px;
      }
      .hss-edit-popup-item-delete:hover {
        background: #ffebee;
      }
      .hss-edit-popup-add {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      .hss-edit-popup-add input {
        flex: 1;
        padding: 4px 8px;
        font-size: 12px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        outline: none;
      }
      .hss-edit-popup-add input:focus {
        border-color: #2196f3;
      }
      .hss-edit-popup-add button {
        padding: 4px 10px;
        font-size: 12px;
        border: 1px solid #2196f3;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 4px;
        cursor: pointer;
      }
      .hss-edit-popup-add button:hover {
        background: #bbdefb;
      }
      .hss-edit-popup-empty {
        font-size: 12px;
        color: #999;
        text-align: center;
        padding: 8px 0;
      }
    `;
    document.head.appendChild(style);
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

  // 編集ポップアップを閉じる（入力中のテキストがあれば自動追加）
  function closeEditPopup() {
    const popup = document.querySelector('.hss-edit-popup');
    if (popup) {
      const addInput = popup.querySelector('.hss-edit-popup-add input');
      const indexAttr = popup.dataset.itemIndex;
      if (addInput && indexAttr !== undefined) {
        const val = addInput.value.trim();
        if (val) {
          const items = loadItems();
          const index = parseInt(indexAttr, 10);
          if (items[index]) {
            if (!items[index].items) items[index].items = [];
            items[index].items.push(val);
            saveItems(items);
          }
        }
      }
      popup.remove();
    }
  }

  // ボタンコンテナを作成
  function createButtonContainer() {
    let items = loadItems();
    const container = document.createElement('div');
    container.className = 'hss-button-container';
    container.id = 'hss-button-container';

    // 状態管理
    let dragMode = false;
    let draggedIndex = null;
    let dropTargetIndex = null;
    let dropPosition = null;
    let longPressTimer = null;
    let longPressStartX = 0;
    let longPressStartY = 0;
    let longPressTargetIndex = null;
    let longPressTargetText = '';
    let popupShowedDuringThisPress = false; // ポップアップ表示中はドラッグ無効
    let ghost = null;
    let trashZone = null;
    let overTrash = false;
    const LONG_PRESS_DURATION = 400;
    const DRAG_THRESHOLD = 8;

    // ゴースト要素作成
    function createGhost(text, x, y) {
      ghost = document.createElement('div');
      ghost.className = 'hss-drag-ghost';
      ghost.textContent = text;
      ghost.style.left = x + 'px';
      ghost.style.top = y + 'px';
      document.body.appendChild(ghost);
    }

    function updateGhostPosition(x, y) {
      if (ghost) {
        ghost.style.left = x + 'px';
        ghost.style.top = y + 'px';
      }
    }

    function removeGhost() {
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
    }

    // ドロップインジケーター
    let dropIndicator = null;

    function createDropIndicator() {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'hss-drop-indicator';
      dropIndicator.style.display = 'none';
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
      if (dropIndicator) dropIndicator.style.display = 'none';
      dropTargetIndex = null;
      dropPosition = null;
    }

    // ドラッグモード開始
    function enterDragMode(startIndex, text, x, y) {
      closeEditPopup();
      closeAllDropdowns();
      dragMode = true;
      draggedIndex = startIndex;
      container.classList.add('hss-drag-mode');

      const elements = container.querySelectorAll('.hss-quick-btn, .hss-dropdown');
      elements[startIndex]?.classList.add('hss-dragging');

      createGhost(text, x, y);
      if (trashZone) trashZone.classList.add('active');
    }

    function exitDragMode() {
      dragMode = false;
      draggedIndex = null;
      overTrash = false;
      container.classList.remove('hss-drag-mode');
      container.querySelectorAll('.hss-dragging').forEach(el => el.classList.remove('hss-dragging'));
      removeGhost();
      hideDropIndicator();
      if (trashZone) {
        trashZone.classList.remove('active');
        trashZone.classList.remove('drag-over');
      }
    }

    // 編集ポップアップを表示
    function showEditPopup(targetElement, index) {
      closeEditPopup();
      closeAllDropdowns();

      const item = items[index];
      const popup = document.createElement('div');
      popup.className = 'hss-edit-popup';
      popup.dataset.itemIndex = index;

      // 名前編集セクション
      const nameSection = document.createElement('div');
      nameSection.className = 'hss-edit-popup-section';
      const nameLabel = document.createElement('label');
      nameLabel.className = 'hss-edit-popup-label';
      nameLabel.textContent = '名前';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'hss-edit-popup-input';
      nameInput.value = item.text;
      nameInput.onchange = () => {
        const newText = nameInput.value.trim();
        if (newText && newText !== item.text) {
          item.text = newText;
          saveItems(items);
          refreshButtons();
        }
      };
      nameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameInput.blur();
        }
      };
      nameSection.appendChild(nameLabel);
      nameSection.appendChild(nameInput);
      popup.appendChild(nameSection);

      // 項目セクション
      const itemsSection = document.createElement('div');
      itemsSection.className = 'hss-edit-popup-section';

      const itemsList = document.createElement('div');
      itemsList.className = 'hss-edit-popup-items';

      let draggedSubIndex = null;

      function renderItems() {
        itemsList.innerHTML = '';
        const subItems = item.items || [];
        subItems.forEach((subItem, subIndex) => {
            const row = document.createElement('div');
            row.className = 'hss-edit-popup-item';
            row.draggable = true;
            row.dataset.index = subIndex;

            // ドラッグハンドル
            const handle = document.createElement('span');
            handle.className = 'hss-drag-handle';
            handle.textContent = '⋮⋮';

            // ドラッグイベント
            row.ondragstart = (e) => {
              draggedSubIndex = subIndex;
              row.classList.add('dragging');
              e.dataTransfer.effectAllowed = 'move';
            };
            row.ondragend = () => {
              row.classList.remove('dragging');
              draggedSubIndex = null;
              itemsList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            };
            row.ondragover = (e) => {
              e.preventDefault();
              if (draggedSubIndex === null || draggedSubIndex === subIndex) return;
              row.classList.add('drag-over');
            };
            row.ondragleave = () => {
              row.classList.remove('drag-over');
            };
            row.ondrop = (e) => {
              e.preventDefault();
              row.classList.remove('drag-over');
              if (draggedSubIndex === null || draggedSubIndex === subIndex) return;
              // 順序入れ替え
              const draggedItem = item.items[draggedSubIndex];
              item.items.splice(draggedSubIndex, 1);
              const newIndex = draggedSubIndex < subIndex ? subIndex - 1 : subIndex;
              item.items.splice(newIndex, 0, draggedItem);
              saveItems(items);
              renderItems();
            };

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'hss-edit-popup-item-input';
            input.value = subItem;
            input.onchange = () => {
              const newValue = input.value.trim();
              if (newValue && newValue !== subItem) {
                item.items[subIndex] = newValue;
                saveItems(items);
              } else if (!newValue) {
                input.value = subItem; // 空の場合は元に戻す
              }
            };
            input.onkeydown = (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
              }
            };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'hss-edit-popup-item-delete';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = () => {
              item.items.splice(subIndex, 1);
              saveItems(items);
              renderItems();
            };
            row.appendChild(handle);
            row.appendChild(input);
            row.appendChild(deleteBtn);
            itemsList.appendChild(row);
        });
      }
      renderItems();
      itemsSection.appendChild(itemsList);

      // 項目追加（Enterで追加して次の入力欄を作成、閉じるときも自動追加）
      const addRow = document.createElement('div');
      addRow.className = 'hss-edit-popup-add';
      const addInput = document.createElement('input');
      addInput.type = 'text';
      addInput.placeholder = '項目を追加...';
      addInput.onkeydown = (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = addInput.value.trim();
          if (val) {
            if (!item.items) item.items = [];
            item.items.push(val);
            saveItems(items);
            addInput.value = '';
            renderItems();
            // 新しい入力欄にフォーカス
            setTimeout(() => {
              const newInput = popup.querySelector('.hss-edit-popup-add input');
              if (newInput) newInput.focus();
            }, 0);
          }
        }
      };
      addRow.appendChild(addInput);
      itemsSection.appendChild(addRow);
      popup.appendChild(itemsSection);

      // ポップアップをdocument.bodyに追加（親要素のoverflowでクリップされないように）
      document.body.appendChild(popup);

      // ボタンの位置を取得
      const targetRect = targetElement.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();

      // ポップアップをボタンの直下に配置
      popup.style.top = (targetRect.bottom + 4) + 'px';

      // ボタン中央とポップアップ中央を合わせる
      let popupLeft = targetRect.left + (targetRect.width - popupRect.width) / 2;

      // 右端が画面外に出ないように調整
      const viewportWidth = window.innerWidth;
      if (popupLeft + popupRect.width > viewportWidth - 8) {
        popupLeft = viewportWidth - popupRect.width - 8;
      }

      // 左端が画面外に出ないように調整
      if (popupLeft < 8) {
        popupLeft = 8;
      }

      popup.style.left = popupLeft + 'px';

      // ポップアップ内クリックで閉じない
      popup.onclick = (e) => e.stopPropagation();
    }

    createDropIndicator();

    // マウス移動ハンドラ
    function handleMouseMove(e) {
      // 長押し待機中またはポップアップ表示後に移動したらドラッグモードへ
      // ただしポップアップ内でのマウス移動は除外
      if (longPressTargetIndex !== null && !e.target.closest('.hss-edit-popup')) {
        const dx = e.clientX - longPressStartX;
        const dy = e.clientY - longPressStartY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          closeEditPopup();
          const targetIndex = longPressTargetIndex;
          const targetText = longPressTargetText;
          longPressTargetIndex = null;
          enterDragMode(targetIndex, targetText, e.clientX, e.clientY);
        }
      }

      if (!dragMode) return;
      updateGhostPosition(e.clientX, e.clientY);

      // ゴミ箱判定
      if (trashZone) {
        const trashRect = trashZone.getBoundingClientRect();
        const isOver = e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
                       e.clientY >= trashRect.top && e.clientY <= trashRect.bottom;
        if (isOver && !overTrash) {
          overTrash = true;
          trashZone.classList.add('drag-over');
          hideDropIndicator();
        } else if (!isOver && overTrash) {
          overTrash = false;
          trashZone.classList.remove('drag-over');
        }
        if (overTrash) return;
      }

      // ドロップ位置の計算
      const elements = Array.from(container.querySelectorAll('.hss-quick-btn, .hss-dropdown'));
      const containerRect = container.getBoundingClientRect();
      hideDropIndicator();

      for (let i = 0; i < elements.length; i++) {
        if (i === draggedIndex) continue;
        const rect = elements[i].getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const inXRange = e.clientX >= rect.left - 10 && e.clientX <= rect.right + 10;
        const inYRange = e.clientY >= rect.top - 5 && e.clientY <= rect.bottom + 5;

        if (inXRange && inYRange) {
          dropTargetIndex = i;
          const indicatorHeight = rect.height;
          const indicatorTop = rect.top - containerRect.top;
          if (e.clientX < centerX) {
            dropPosition = 'left';
            showDropIndicator(rect.left - containerRect.left - 3, indicatorTop, indicatorHeight);
          } else {
            dropPosition = 'right';
            showDropIndicator(rect.right - containerRect.left + 1, indicatorTop, indicatorHeight);
          }
          break;
        }
      }
    }

    // FLIPアニメーション用：位置を記録
    function capturePositions() {
      const positions = [];
      const elements = container.querySelectorAll('.hss-quick-btn, .hss-dropdown');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        positions.push({ left: rect.left, top: rect.top });
      });
      return positions;
    }

    // FLIPアニメーション付きでボタンを再描画
    function refreshButtonsWithAnimation(oldFromIndex, oldToIndex) {
      // First: 現在の位置を記録
      const oldPositions = capturePositions();

      // データは既に更新済みなので再描画
      removeButtons();
      insertButtons();

      // Last: 新しい位置を取得してアニメーション
      const newContainer = document.getElementById('hss-button-container');
      if (!newContainer) return;

      // 新しいインデックス順での対応を計算
      // oldFromIndex -> newToIndex への移動
      // 例: [0,1,2,3,4] で 2->4 なら [0,1,3,4,2] になる
      // 旧インデックス -> 新インデックス のマッピングを作成
      const indexMap = [];
      for (let i = 0; i < oldPositions.length; i++) {
        if (i === oldFromIndex) {
          indexMap[i] = oldToIndex;
        } else if (oldFromIndex < oldToIndex) {
          // 左から右へ移動: fromとtoの間は1つ左にずれる
          if (i > oldFromIndex && i <= oldToIndex) {
            indexMap[i] = i - 1;
          } else {
            indexMap[i] = i;
          }
        } else {
          // 右から左へ移動: toとfromの間は1つ右にずれる
          if (i >= oldToIndex && i < oldFromIndex) {
            indexMap[i] = i + 1;
          } else {
            indexMap[i] = i;
          }
        }
      }

      const newElements = newContainer.querySelectorAll('.hss-quick-btn, .hss-dropdown');

      // 新しい各要素について、旧位置からアニメーション
      newElements.forEach((el, newIndex) => {
        // この新インデックスに対応する旧インデックスを探す
        const oldIndex = indexMap.indexOf(newIndex);
        if (oldIndex === -1 || !oldPositions[oldIndex]) return;

        const oldPos = oldPositions[oldIndex];
        const newRect = el.getBoundingClientRect();
        const deltaX = oldPos.left - newRect.left;
        const deltaY = oldPos.top - newRect.top;

        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

        // Invert: 既存のtransitionを無効化して古い位置に即座に配置
        el.style.transition = 'none';
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // 強制リフロー（スタイル適用を確定）
        el.offsetHeight;

        // Play: アニメーションで新しい位置へ
        el.style.transition = '';
        el.classList.add('hss-animating');
        el.style.transform = '';
        el.addEventListener('transitionend', () => {
          el.classList.remove('hss-animating');
          el.style.transition = '';
        }, { once: true });
      });
    }

    // マウスアップでドロップ処理
    function handleMouseUp() {
      // 長押しタイマーをクリア
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressTargetIndex = null;
      popupShowedDuringThisPress = false; // 次のmousedownでドラッグ可能に

      if (dragMode && draggedIndex !== null) {
        // ゴミ箱にドロップ → 削除
        if (overTrash) {
          items.splice(draggedIndex, 1);
          saveItems(items);
          exitDragMode();
          refreshButtons();
          return;
        }

        // 通常のドロップ
        if (dropTargetIndex !== null && dropPosition !== null) {
          const draggedItem = items[draggedIndex];
          let newIndex = dropPosition === 'left' ? dropTargetIndex : dropTargetIndex + 1;
          if (draggedIndex < newIndex) newIndex--;

          if (draggedIndex !== newIndex) {
            const oldFromIndex = draggedIndex;
            const oldToIndex = newIndex;
            items.splice(draggedIndex, 1);
            items.splice(newIndex, 0, draggedItem);
            saveItems(items);
            exitDragMode();
            refreshButtonsWithAnimation(oldFromIndex, oldToIndex);
            return;
          }
        }
        exitDragMode();
      }
    }

    // 長押し検出の設定
    function setupLongPress(element, index, text) {
      element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        longPressStartX = e.clientX;
        longPressStartY = e.clientY;
        longPressTargetIndex = index;
        longPressTargetText = text;

        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          popupShowedDuringThisPress = true; // このmousedown中はドラッグ無効
          // 長押し完了 → ポップアップ表示
          showEditPopup(element, index);
        }, LONG_PRESS_DURATION);
      });

      element.addEventListener('mouseup', () => {
        if (longPressTimer !== null) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
    }

    // 項目が0個ならボタン、1個以上ならドロップダウンとして描画
    items.forEach((item, index) => {
      const hasItems = item.items && item.items.length > 0;

      if (hasItems) {
        // ドロップダウン
        const dropdown = document.createElement('div');
        dropdown.className = 'hss-dropdown';

        const btn = document.createElement('button');
        btn.className = 'hss-dropdown-btn';
        btn.innerHTML = `<span>${item.text}</span><span class="hss-dropdown-arrow">▼</span>`;

        const menu = document.createElement('div');
        menu.className = 'hss-dropdown-menu';

        item.items.forEach(subItem => {
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
          // ポップアップが表示中なら何もしない（長押し後のclickを無視）
          if (document.querySelector('.hss-edit-popup')) return;
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
        setupLongPress(dropdown, index, item.text);
      } else {
        // 通常ボタン
        const btn = document.createElement('button');
        btn.className = 'hss-quick-btn';
        btn.textContent = item.text;
        btn.onclick = () => {
          if (dragMode) return;
          // ポップアップが表示中なら何もしない（長押し後のclickを無視）
          if (document.querySelector('.hss-edit-popup')) return;
          const searchInput = getSearchInput();
          if (searchInput) {
            setInputValueReactSafe(searchInput, item.text + ' ');
            searchInput.focus();
          }
        };
        container.appendChild(btn);
        setupLongPress(btn, index, item.text);
      }
    });

    // 右端コントロール: 追加ボタン
    const addBtn = document.createElement('button');
    addBtn.className = 'hss-control-btn';
    addBtn.textContent = '+';
    addBtn.title = '新規ボタンを追加';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      closeEditPopup();
      items.push({ type: 'button', text: '新規', items: [] });
      saveItems(items);
      refreshButtons();
    };
    container.appendChild(addBtn);

    // 右端コントロール: ゴミ箱
    trashZone = document.createElement('div');
    trashZone.className = 'hss-trash-zone';
    trashZone.textContent = '🗑';
    trashZone.title = 'ボタンをここにドラッグで削除';
    container.appendChild(trashZone);

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

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
    removeButtons(); // イベントハンドラも含めてクリーンアップ
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

    // ドキュメントクリックでドロップダウンと編集ポップアップを閉じる
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.hss-dropdown')) {
        closeAllDropdowns();
      }
      if (!e.target.closest('.hss-edit-popup') && !e.target.closest('.hss-quick-btn') && !e.target.closest('.hss-dropdown')) {
        const hadPopup = document.querySelector('.hss-edit-popup');
        closeEditPopup();
        if (hadPopup) {
          refreshButtons(); // ポップアップを閉じたらボタンを再描画（ドロップダウン切り替え反映）
        }
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
