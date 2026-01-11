// ==UserScript==
// @name         Henry セット展開検索ヘルパー
// @namespace    https://henry-app.jp/
// @version      1.2.4
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
  const DEFAULT_BUTTONS = ['処方', '処置', '固定', '注射'];

  // ボタン設定の読み込み
  function loadButtons() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return DEFAULT_BUTTONS;
  }

  // ボタン設定の保存
  function saveButtons(buttons) {
    GM_setValue(STORAGE_KEY, buttons);
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
        min-width: 320px;
        max-width: 400px;
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
      }
      .hss-add-input {
        flex: 1;
        padding: 8px 12px;
        font-size: 14px;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        outline: none;
      }
      .hss-add-input:focus {
        border-color: #2196f3;
      }
      .hss-add-btn {
        padding: 8px 16px;
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
    `;
    document.head.appendChild(style);
  }

  // 設定モーダルを表示
  function showSettingsModal(onSave) {
    let buttons = loadButtons();
    let draggedIndex = null;

    const overlay = document.createElement('div');
    overlay.className = 'hss-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'hss-modal';

    function renderList() {
      const list = modal.querySelector('.hss-button-list');
      list.innerHTML = '';

      if (buttons.length === 0) {
        list.innerHTML = '<div class="hss-empty-message">ボタンがありません</div>';
        return;
      }

      buttons.forEach((text, index) => {
        const item = document.createElement('div');
        item.className = 'hss-button-item';
        item.draggable = true;
        item.dataset.index = index;

        // ドラッグハンドル
        const handle = document.createElement('span');
        handle.className = 'hss-drag-handle';
        handle.textContent = '☰';

        // テキスト（クリックで編集）
        const textEl = document.createElement('span');
        textEl.className = 'hss-button-item-text';
        textEl.textContent = text;
        textEl.onclick = (e) => {
          e.stopPropagation();
          // 入力フィールドに切り替え
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'hss-button-item-input';
          input.value = text;
          textEl.replaceWith(input);
          input.focus();
          input.select();

          const finishEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== text) {
              buttons[index] = newText;
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
          buttons.splice(index, 1);
          renderList();
        };

        item.appendChild(handle);
        item.appendChild(textEl);
        item.appendChild(deleteBtn);

        // ドラッグイベント
        item.ondragstart = (e) => {
          draggedIndex = index;
          item.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        };

        item.ondragend = () => {
          item.classList.remove('dragging');
          draggedIndex = null;
          // すべてのdrag-overクラスを削除
          list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        };

        item.ondragover = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (draggedIndex !== null && draggedIndex !== index) {
            item.classList.add('drag-over');
          }
        };

        item.ondragleave = () => {
          item.classList.remove('drag-over');
        };

        item.ondrop = (e) => {
          e.preventDefault();
          item.classList.remove('drag-over');
          if (draggedIndex !== null && draggedIndex !== index) {
            // 順序を入れ替え
            const draggedItem = buttons[draggedIndex];
            buttons.splice(draggedIndex, 1);
            buttons.splice(index, 0, draggedItem);
            renderList();
          }
        };

        list.appendChild(item);
      });
    }

    modal.innerHTML = `
      <div class="hss-modal-title">クイック検索ボタンの設定</div>
      <div class="hss-button-list"></div>
      <div class="hss-add-section">
        <input type="text" class="hss-add-input" placeholder="新しいボタンのテキスト">
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

    const addInput = modal.querySelector('.hss-add-input');
    const addBtn = modal.querySelector('.hss-add-btn');
    const cancelBtn = modal.querySelector('.hss-cancel-btn');
    const confirmBtn = modal.querySelector('.hss-confirm-btn');

    const handleAdd = () => {
      const text = addInput.value.trim();
      if (!text) return;

      // 重複チェック
      if (buttons.includes(text)) {
        // 一瞬赤くしてフィードバック
        addInput.style.borderColor = '#e53935';
        addInput.style.backgroundColor = '#ffebee';
        setTimeout(() => {
          addInput.style.borderColor = '';
          addInput.style.backgroundColor = '';
        }, 300);
        return;
      }

      buttons.push(text);
      addInput.value = '';
      renderList();
    };

    addBtn.onclick = handleAdd;
    addInput.onkeydown = (e) => {
      // 日本語変換中は無視
      if (e.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    };

    // この内容で設定：保存して閉じる
    confirmBtn.onclick = () => {
      saveButtons(buttons);
      overlay.remove();
      if (onSave) onSave();
    };

    // キャンセル：保存せずに閉じる
    cancelBtn.onclick = () => {
      overlay.remove();
    };

    // オーバーレイクリック：保存せずに閉じる
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };

    addInput.focus();
  }

  // ボタンコンテナを作成
  function createButtonContainer() {
    const buttons = loadButtons();
    const container = document.createElement('div');
    container.className = 'hss-button-container';
    container.id = 'hss-button-container';

    buttons.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'hss-quick-btn';
      btn.textContent = text;
      btn.onclick = () => {
        const searchInput = getSearchInput();
        if (searchInput) {
          setInputValueReactSafe(searchInput, text + ' ');
          searchInput.focus();
        }
      };
      container.appendChild(btn);
    });

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'hss-settings-btn';
    settingsBtn.textContent = '⚙️';
    settingsBtn.title = 'ボタンの設定';
    settingsBtn.onclick = (e) => {
      e.stopPropagation();
      showSettingsModal(() => refreshButtons());
    };
    container.appendChild(settingsBtn);

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

    cleaner.add(() => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
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
