// ==UserScript==
// @name         メモ帳
// @namespace    https://haru-chan.example
// @version      4.0.10
// @description  ツールボックスから呼び出されるメモ帳機能。タブ管理・保存機能を搭載。
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_memo.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_memo.user.js
// ==/UserScript==

/*
 * 【メモ帳】
 *
 * ■ 使用場面
 * - 診療中にちょっとしたメモを残したい場合
 * - 患者情報や覚書を一時的に保存したい場合
 *
 * ■ 主な機能
 * - 複数タブ対応（タブを追加・削除可能）
 * - 自動保存（localStorageに保存）
 * - ツールボックスの「メモ」ボタンから呼び出し
 *
 * ■ データ保存
 * - ブラウザのlocalStorageに保存
 * - 患者個人情報は保存しないこと（推奨）
 *
 * ■ SPA遷移対応
 * - subscribeNavigation: 不要
 * - 理由: グローバルイベントリスナーのみで、ページ固有の状態を持たない
 *   - メモUIはToolboxから呼び出し時に表示
 *   - パネルは閉じても非表示になるだけで、再表示可能
 */

(function () {
  'use strict';

  const VERSION = GM_info.script.version;

  // ============================================
  // ツールボックスに自己登録（プラグイン方式）
  // ============================================

  (function registerToToolbox() {
    window.HenryToolbox = window.HenryToolbox || { items: [] };
    const toolbox = window.HenryToolbox;

    const myItem = {
      label: 'メモ帳',
      event: 'henry:toggle-memo',
      order: 10
    };

    const exists = toolbox.items.some(i => i.event === myItem.event);
    if (exists) return;

    if (typeof toolbox.register === 'function') {
      toolbox.register(myItem);
    } else {
      toolbox.items.push(myItem);
      console.log('[Memo] ツールボックスに仮登録');
    }
  })();

  // ============================================
  // 定数
  // ============================================

  const MEMO_STORAGE_KEY = 'henry_notes_tabs_v1';
  const MEMO_FONTSIZE_KEY = 'henry_notes_fontsize';
  const DEFAULT_FONT_SIZE = 12;
  const MIN_FONT_SIZE = 10;
  const MAX_FONT_SIZE = 28;

  let memoPanelRef = null;
  let currentFontSize = DEFAULT_FONT_SIZE;

  // Undo用スタック
  const undoStack = [];

  // ============================================
  // スタイル注入（集約管理）
  // ============================================

  function injectStyles() {
    if (document.getElementById('henry-memo-styles')) return;

    const style = document.createElement('style');
    style.id = 'henry-memo-styles';
    style.textContent = `
      .henry-memo-panel {
        position: fixed;
        top: 80px;
        left: 60px;
        width: 320px;
        height: 260px;
        padding: 8px;
        background: #f7f7f8;
        border: 1px solid #d0d0d0;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,.15);
        z-index: 999999;
        font-size: 12px;
        font-family: "Hiragino Sans", "Yu Gothic", sans-serif;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        outline: none;
      }

      .henry-memo-tabbar {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
        user-select: none;
        cursor: move;
      }

      .henry-memo-tabs-container {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .henry-memo-tab {
        display: flex;
        align-items: center;
        padding: 2px 4px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background: #f1f1f1;
        cursor: pointer;
        max-width: 120px;
      }

      .henry-memo-tab.active {
        background: #fff;
      }

      .henry-memo-tab-label {
        font-size: 12px;
        line-height: 20px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80px;
      }

      .henry-memo-tab-input {
        font-size: 12px;
        height: 20px;
        line-height: 20px;
        box-sizing: border-box;
        width: 70px;
        padding: 0 2px;
        border: 1px solid #4a90d9;
        border-radius: 2px;
        outline: none;
      }

      .henry-memo-tab-close {
        border: none;
        background: none;
        cursor: pointer;
        font-size: 12px;
        margin-left: 4px;
        padding: 0 2px;
        color: #666;
      }

      .henry-memo-tab-close:hover {
        color: #c00;
      }

      .henry-memo-btn {
        border: 1px solid #ccc;
        background: #f0f0f0;
        cursor: pointer;
        padding: 0 6px;
        border-radius: 4px;
        font-size: 12px;
      }

      .henry-memo-btn:hover {
        background: #e5e5e5;
      }

      .henry-memo-controls {
        display: flex;
        align-items: center;
        gap: 2px;
        margin-left: auto;
        margin-right: 8px;
      }

      .henry-memo-fontbtn {
        border: 1px solid #ccc;
        background: #f0f0f0;
        cursor: pointer;
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 12px;
      }

      .henry-memo-fontbtn:hover {
        background: #e5e5e5;
      }

      .henry-memo-close {
        font-size: 14px;
        color: #6a6a6a;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .henry-memo-close:hover {
        background: #e5e5e5;
      }

      .henry-memo-textarea {
        width: 100%;
        flex: 1;
        box-sizing: border-box;
        font-family: "Hiragino Sans", "Yu Gothic", sans-serif;
        background: white;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        resize: none;
        padding: 6px;
      }

      .henry-memo-resize-right {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: ew-resize;
      }

      .henry-memo-resize-bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 6px;
        cursor: ns-resize;
      }

      .henry-memo-resize-corner {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 12px;
        height: 12px;
        cursor: nwse-resize;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // データ管理
  // ============================================

  function loadFontSize() {
    const saved = localStorage.getItem(MEMO_FONTSIZE_KEY);
    if (saved) {
      const size = parseInt(saved, 10);
      if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
        return size;
      }
    }
    return DEFAULT_FONT_SIZE;
  }

  function saveFontSize(size) {
    localStorage.setItem(MEMO_FONTSIZE_KEY, String(size));
  }

  function memoLoadData() {
    const raw = localStorage.getItem(MEMO_STORAGE_KEY);
    if (!raw) {
      return {
        tabs: [{ id: 'tab1', title: 'メモ1', content: '' }],
        activeId: 'tab1',
      };
    }
    try {
      const data = JSON.parse(raw);
      if (!data.tabs || data.tabs.length === 0) {
        return { tabs: [{ id: 'tab1', title: 'メモ1', content: '' }], activeId: 'tab1' };
      }
      return data;
    } catch {
      return { tabs: [{ id: 'tab1', title: 'メモ1', content: '' }], activeId: 'tab1' };
    }
  }

  function memoSaveData(d) {
    localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(d));
  }

  // ============================================
  // ドラッグ処理
  // ============================================

  function makeDraggable(panel, handle) {
    let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;

    handle.addEventListener('mousedown', (e) => {
      // タブやボタンをクリックした場合はドラッグしない
      if (e.target.closest('.henry-memo-tab, .henry-memo-btn, .henry-memo-fontbtn, .henry-memo-close')) return;
      if (e.button !== 0) return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      sl = r.left;
      st = r.top;
      sx = e.clientX;
      sy = e.clientY;
      panel.style.left = `${sl}px`;
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      let nl = sl + dx;
      let nt = st + dy;

      nl = Math.max(0, Math.min(nl, window.innerWidth - 60));
      nt = Math.max(0, Math.min(nt, window.innerHeight - 40));

      panel.style.left = `${nl}px`;
      panel.style.top = `${nt}px`;
    });

    document.addEventListener('mouseup', () => (dragging = false));
  }

  function showMemoPanel() {
    if (!memoPanelRef) return;
    memoPanelRef.style.display = 'flex';
  }

  function hideMemoPanel() {
    if (!memoPanelRef) return;
    memoPanelRef.style.display = 'none';
  }

  // ============================================
  // パネル生成
  // ============================================

  function createMemoPanel() {
    if (memoPanelRef) {
      showMemoPanel();
      return memoPanelRef;
    }

    injectStyles();
    let data = memoLoadData();
    currentFontSize = loadFontSize();

    // パネル
    const panel = document.createElement('div');
    panel.className = 'henry-memo-panel';
    panel.tabIndex = 0; // フォーカス可能にする

    // タブバー
    const tabBar = document.createElement('div');
    tabBar.className = 'henry-memo-tabbar';

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'henry-memo-tabs-container';

    const addTabBtn = document.createElement('button');
    addTabBtn.className = 'henry-memo-btn';
    addTabBtn.textContent = '+';
    addTabBtn.title = '新しいタブ';

    // フォントサイズ変更
    const controls = document.createElement('div');
    controls.className = 'henry-memo-controls';

    const fontSizeDown = document.createElement('button');
    fontSizeDown.className = 'henry-memo-fontbtn';
    fontSizeDown.textContent = 'A-';
    fontSizeDown.title = 'フォントを小さく';

    const fontSizeUp = document.createElement('button');
    fontSizeUp.className = 'henry-memo-fontbtn';
    fontSizeUp.textContent = 'A+';
    fontSizeUp.title = 'フォントを大きく';

    controls.appendChild(fontSizeDown);
    controls.appendChild(fontSizeUp);

    // 閉じるボタン
    const closeBtn = document.createElement('div');
    closeBtn.className = 'henry-memo-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      hideMemoPanel();
    };

    tabBar.appendChild(tabsContainer);
    tabBar.appendChild(addTabBtn);
    tabBar.appendChild(controls);
    tabBar.appendChild(closeBtn);

    // テキストエリア
    const textarea = document.createElement('textarea');
    textarea.className = 'henry-memo-textarea';
    textarea.style.fontSize = `${currentFontSize}px`;

    // フォントサイズ変更
    function updateFontSize(delta) {
      const newSize = currentFontSize + delta;
      if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
        currentFontSize = newSize;
        textarea.style.fontSize = `${currentFontSize}px`;
        saveFontSize(currentFontSize);
      }
    }

    fontSizeDown.onclick = (e) => {
      e.stopPropagation();
      updateFontSize(-1);
    };

    fontSizeUp.onclick = (e) => {
      e.stopPropagation();
      updateFontSize(1);
    };

    // タブ描画
    let clickTimeout = null;

    function renderTabs() {
      tabsContainer.innerHTML = '';

      data.tabs.forEach((tab) => {
        const el = document.createElement('div');
        el.className = `henry-memo-tab ${tab.id === data.activeId ? 'active' : ''}`;

        const label = document.createElement('span');
        label.className = 'henry-memo-tab-label';
        label.textContent = tab.title;

        const closeTabBtn = document.createElement('button');
        closeTabBtn.className = 'henry-memo-tab-close';
        closeTabBtn.textContent = '×';
        closeTabBtn.onclick = (e) => {
          e.stopPropagation();
          if (data.tabs.length === 1) {
            // 最後の1タブは内容をクリアするだけ（undoの対象外）
            tab.content = '';
            textarea.value = '';
            memoSaveData(data);
            return;
          }
          const idx = data.tabs.indexOf(tab);

          // Undo用に保存
          undoStack.push({
            type: 'deleteTab',
            tab: { ...tab },  // コピーを保存
            index: idx,
            wasActive: data.activeId === tab.id
          });

          data.tabs.splice(idx, 1);
          if (data.activeId === tab.id) {
            const next = data.tabs[idx] || data.tabs[idx - 1];
            data.activeId = next.id;
            textarea.value = next.content;
          }
          memoSaveData(data);
          renderTabs();

          // パネルにフォーカスを移す（Ctrl+Zでundo可能に）
          panel.focus();
        };

        if (tab.id === data.activeId) {
          // アクティブタブ: ダブルクリックで編集
          label.ondblclick = (e) => {
            e.stopPropagation();
            if (clickTimeout) {
              clearTimeout(clickTimeout);
              clickTimeout = null;
            }
            startInlineEdit(el, label, tab);
          };

          el.onclick = (e) => {
            // ダブルクリック判定のため少し待つ（アクティブタブのみ）
            if (clickTimeout) return;
            clickTimeout = setTimeout(() => {
              clickTimeout = null;
              // 既にアクティブなので何もしない
            }, 200);
          };
        } else {
          // 非アクティブタブ: 即座に切り替え
          el.onclick = () => {
            const cur = data.tabs.find((t) => t.id === data.activeId);
            if (cur) cur.content = textarea.value;
            data.activeId = tab.id;
            textarea.value = tab.content;
            memoSaveData(data);
            renderTabs();
          };
        }

        el.appendChild(label);
        el.appendChild(closeTabBtn);
        tabsContainer.appendChild(el);
      });
    }

    // インライン編集開始
    function startInlineEdit(tabEl, labelEl, tab) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'henry-memo-tab-input';
      input.value = tab.title;

      // ラベルを非表示にしてinputを表示
      labelEl.style.display = 'none';
      tabEl.insertBefore(input, labelEl);
      input.focus();
      input.select();

      function finishEdit() {
        const newTitle = input.value.trim();
        if (newTitle) {
          tab.title = newTitle;
          memoSaveData(data);
        }
        input.remove();
        labelEl.style.display = '';
        labelEl.textContent = tab.title;
      }

      input.onblur = finishEdit;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          input.value = tab.title; // 元に戻す
          finishEdit();
        }
      };
      input.onclick = (e) => e.stopPropagation();
    }

    // タブ追加
    addTabBtn.onclick = () => {
      const cur = data.tabs.find((t) => t.id === data.activeId);
      if (cur) cur.content = textarea.value;
      const id = 'tab' + Date.now();
      data.tabs.push({ id, title: `メモ${data.tabs.length + 1}`, content: '' });
      data.activeId = id;
      memoSaveData(data);
      textarea.value = '';
      renderTabs();
    };

    // 入力イベント
    textarea.oninput = () => {
      const cur = data.tabs.find((t) => t.id === data.activeId);
      if (cur) {
        cur.content = textarea.value;
        memoSaveData(data);
      }
    };

    // 初期表示
    const active = data.tabs.find((t) => t.id === data.activeId);
    textarea.value = active ? active.content : '';
    renderTabs();

    // パネル組み立て
    panel.appendChild(tabBar);
    panel.appendChild(textarea);

    // リサイズハンドル
    const resizeRight = document.createElement('div');
    resizeRight.className = 'henry-memo-resize-right';

    const resizeBottom = document.createElement('div');
    resizeBottom.className = 'henry-memo-resize-bottom';

    const resizeCorner = document.createElement('div');
    resizeCorner.className = 'henry-memo-resize-corner';

    panel.appendChild(resizeRight);
    panel.appendChild(resizeBottom);
    panel.appendChild(resizeCorner);

    // リサイズ処理
    function makeResizable() {
      let resizing = null;
      let startX, startY, startW, startH;

      function onMouseDown(e, direction) {
        e.preventDefault();
        e.stopPropagation();
        resizing = direction;
        startX = e.clientX;
        startY = e.clientY;
        startW = panel.offsetWidth;
        startH = panel.offsetHeight;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }

      function onMouseMove(e) {
        if (!resizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (resizing === 'right' || resizing === 'corner') {
          const newW = Math.max(200, startW + dx);
          panel.style.width = newW + 'px';
        }
        if (resizing === 'bottom' || resizing === 'corner') {
          const newH = Math.max(150, startH + dy);
          panel.style.height = newH + 'px';
        }
      }

      function onMouseUp() {
        resizing = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      resizeRight.onmousedown = (e) => onMouseDown(e, 'right');
      resizeBottom.onmousedown = (e) => onMouseDown(e, 'bottom');
      resizeCorner.onmousedown = (e) => onMouseDown(e, 'corner');
    }

    makeResizable();

    // Undo処理 (Ctrl+Z)
    function undoDeleteTab() {
      if (undoStack.length === 0) return false;

      const action = undoStack.pop();
      if (action.type === 'deleteTab') {
        // 現在のタブの内容を保存
        const cur = data.tabs.find((t) => t.id === data.activeId);
        if (cur) cur.content = textarea.value;

        // タブを元の位置に復元
        data.tabs.splice(action.index, 0, action.tab);

        // 削除時にアクティブだったら再度アクティブにする
        if (action.wasActive) {
          data.activeId = action.tab.id;
          textarea.value = action.tab.content;
        }

        memoSaveData(data);
        renderTabs();
        return true;
      }
      return false;
    }

    panel.addEventListener('keydown', (e) => {
      // Ctrl+Z (または Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // textareaにフォーカスがある場合はテキストのundoを優先
        if (document.activeElement === textarea) {
          return; // デフォルト動作（テキストundo）
        }
        // undoStackにアイテムがあればタブ削除をundo
        if (undoStack.length > 0) {
          e.preventDefault();
          undoDeleteTab();
        }
      }
    });

    document.body.appendChild(panel);

    makeDraggable(panel, tabBar);
    memoPanelRef = panel;

    return panel;
  }

  // ============================================
  // イベント連携
  // ============================================

  window.addEventListener('henry:toggle-memo', () => {
    if (!memoPanelRef) {
      createMemoPanel();
      return;
    }
    if (memoPanelRef.style.display === 'none') {
      showMemoPanel();
    } else {
      hideMemoPanel();
    }
  });

  console.log(`[Memo] Ready (v${VERSION})`);
})();
