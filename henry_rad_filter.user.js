// ==UserScript==
// @name         照射オーダーセット検索支援
// @namespace    https://henry-app.jp/
// @version      5.12
// @description  入院照射オーダーのセット挿入モーダルにモダリティ・部位フィルタを追加 (HenryCore v2.3+ 対応 / Refactored)
// @author       Henry UI Lab
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_filter.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_filter.user.js
// ==/UserScript==

(function() {
  'use strict';

  const CONFIG = {
    SCRIPT_NAME: 'RadiationSearchSupport',
    SEARCH_INPUT_SELECTOR: 'input[placeholder="セットを検索"]',
    PAGE_TITLE_KEYWORD: '照射オーダー',
    CONTAINER_ID: 'henry-radiation-filter-container',
    DROPDOWN_ID: 'henry-radiation-dropdown'
  };

  const MODALITIES = [
    { label: "モダリティ", value: "" },
    { label: "XP", value: "XP" },
    { label: "CT", value: "CT" },
    { label: "MRI", value: "MRI" },
    { label: "DEXA", value: "DEXA" },
    { label: "ポータブル", value: "ポータブル" }
  ];

  const BODY_PARTS = {
    "頭〜体幹": ["頭部", "胸部", "肋骨", "胸骨", "胸腹部", "腹部", "骨盤"],
    "脊椎": ["頚椎", "胸椎", "胸腰椎移行部", "腰椎", "仙骨", "尾骨", "全脊椎"],
    "上肢": ["鎖骨", "肩関節", "肩鎖関節", "胸鎖関節", "肩甲骨", "上腕骨", "肘関節", "前腕", "手関節", "手根管", "手部", "舟状骨", "指"],
    "下肢": ["股関節", "大腿骨", "膝", "下腿", "足関節", "足部", "踵骨", "趾"]
  };

  const PORTABLE_PARTS = ["胸部", "腹部", "胸腹部"];

  let logger = null;
  let outsideClickHandler = null;

  // ==========================================
  // メイン処理
  // ==========================================
  async function init() {
    // 1. HenryCore 待機
    let waited = 0;
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 5000) {
        console.error('[' + CONFIG.SCRIPT_NAME + '] HenryCore が見つかりません');
        return;
      }
    }

    const { utils } = window.HenryCore;
    logger = utils.createLogger(CONFIG.SCRIPT_NAME);

    // ★ ポイント1: cleaner は init() で1回だけ作成して使い回す
    const cleaner = utils.createCleaner();

    logger.info('スクリプト初期化 (v5.12)');

    // ★ ポイント2: subscribeNavigation も init() で1回だけ登録
    // ページ遷移時、HenryCoreが自動で cleaner.exec() を呼び（前回分の掃除）、
    // その後このコールバックを実行する
    utils.subscribeNavigation(cleaner, () => {
      logger.info('ページ遷移検出 -> 再セットアップ');
      setupPage(cleaner);
    });

    // 初回実行
    setupPage(cleaner);
  }

  // ==========================================
  // ページごとの監視セットアップ
  // ==========================================
  function setupPage(cleaner) {
    // MutationObserverで検索ボックスを監視
    const observer = new MutationObserver(() => {
      const searchInput = document.querySelector(CONFIG.SEARCH_INPUT_SELECTOR);

      if (searchInput && !searchInput.dataset.hasFilterUI) {
        // 照射オーダー画面かチェック
        if (!isRadiationOrderPage()) return;

        logger.info('照射オーダー画面で検索ボックスを検出、UIを注入');
        setTimeout(() => injectFilterUI(searchInput), 50);
      } else if (!searchInput) {
        removeExistingUI();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // ★ ポイント3: このページ専用のリソース解放処理を cleaner に登録
    // 次回のページ遷移時にこれらが実行される
    cleaner.add(() => observer.disconnect());
    cleaner.add(() => {
      if (outsideClickHandler) {
        document.removeEventListener('click', outsideClickHandler);
        outsideClickHandler = null;
      }
    });
    cleaner.add(removeExistingUI);

    // 初回チェック（既に要素がある場合用）
    const searchInput = document.querySelector(CONFIG.SEARCH_INPUT_SELECTOR);
    if (searchInput && !searchInput.dataset.hasFilterUI && isRadiationOrderPage()) {
      logger.info('初回: 照射オーダー画面で検索ボックスを検出、UIを注入');
      setTimeout(() => injectFilterUI(searchInput), 50);
    }
  }

  // ==========================================
  // 照射オーダー画面判定
  // ==========================================
  function isRadiationOrderPage() {
    const headers = Array.from(document.querySelectorAll('h1, h2, h3'));
    return headers.some(h => h.textContent.includes(CONFIG.PAGE_TITLE_KEYWORD));
  }

  // ==========================================
  // UI削除
  // ==========================================
  function removeExistingUI() {
    const container = document.getElementById(CONFIG.CONTAINER_ID);
    if (container) {
      container.remove();
    }
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler);
      outsideClickHandler = null;
    }
  }

  // ==========================================
  // React対応のinput値セット
  // ==========================================
  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ==========================================
  // フィルタUI注入
  // ==========================================
  function injectFilterUI(searchInput) {
    if (searchInput.dataset.hasFilterUI) return;
    searchInput.dataset.hasFilterUI = 'true';

    removeExistingUI();
    if (logger) logger.info('フィルタUIを注入します');

    let state = { modality: '', major: '', minor: '' };

    // --- コンテナ ---
    const container = document.createElement('div');
    container.id = CONFIG.CONTAINER_ID;
    container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      position: relative;
      align-items: center;
    `;

    // --- モダリティ選択 (ネイティブSelect) ---
    const modalitySelect = document.createElement('select');
    modalitySelect.style.cssText = `
      height: 36px;
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      background-color: var(--henry-bg-sub, #f5f5f5);
      color: var(--henry-text-high, #333);
      font-family: "Noto Sans JP", sans-serif;
      font-size: 14px;
      cursor: pointer;
      padding: 0 8px;
      width: 140px;
      outline: none;
    `;
    MODALITIES.forEach(opt => {
      const option = document.createElement('option');
      option.text = opt.label;
      option.value = opt.value;
      modalitySelect.appendChild(option);
    });

    // --- 部位選択ボタン (素のDOM操作 + Henryデザイン変数) ---
    const bodyPartButton = document.createElement('button');
    bodyPartButton.textContent = '部位を選択';
    bodyPartButton.type = 'button';
    bodyPartButton.disabled = true; // 初期状態

    bodyPartButton.style.cssText = `
      height: 36px;
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      background-color: var(--henry-bg-base, #fff);
      color: var(--henry-text-high, #333);
      font-family: "Noto Sans JP", sans-serif;
      font-size: 14px;
      cursor: pointer;
      padding: 0 12px;
      min-width: 160px;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      opacity: 0.6;
    `;

    // --- ドロップダウンパネル ---
    const dropdown = document.createElement('div');
    dropdown.id = CONFIG.DROPDOWN_ID;
    dropdown.style.cssText = `
      display: none;
      position: absolute;
      top: 100%;
      left: 148px; /* Select(140) + Gap(8) */
      margin-top: 4px;
      background: var(--henry-bg-base, #fff);
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      box-shadow: var(--henry-shadow-card, 0 4px 12px rgba(0,0,0,0.25));
      z-index: 1000;
      flex-direction: row;
      white-space: nowrap;
    `;

    const majorPanel = document.createElement('div');
    majorPanel.style.minWidth = '140px';
    majorPanel.style.borderRight = '1px solid var(--henry-border, #eee)';

    const minorPanel = document.createElement('div');
    minorPanel.style.minWidth = '140px';
    minorPanel.style.display = 'none';
    minorPanel.style.backgroundColor = 'var(--henry-bg-sub, #f9f9f9)';

    dropdown.appendChild(majorPanel);
    dropdown.appendChild(minorPanel);

    // --- ロジック関数 ---
    const updateSearch = () => {
      const parts = [state.modality, state.major, state.minor].filter(Boolean);
      setNativeValue(searchInput, parts.join(' '));
    };

    const updateButtonText = () => {
      let label = '部位を選択';
      let color = 'var(--henry-text-high, #333)';
      let fontWeight = 'normal';

      if (state.minor) {
        label = `${state.major} > ${state.minor}`;
        fontWeight = 'bold';
        color = 'var(--henry-primary, rgb(0, 204, 146))';
      } else if (state.major) {
        label = state.major;
        fontWeight = 'bold';
        color = 'var(--henry-primary, rgb(0, 204, 146))';
      }

      bodyPartButton.textContent = label;
      bodyPartButton.style.color = color;
      bodyPartButton.style.fontWeight = fontWeight;
    };

    const showDropdown = () => {
      dropdown.style.display = 'flex';
    };

    const hideDropdown = () => {
      dropdown.style.display = 'none';
      minorPanel.style.display = 'none';
    };

    const toggleDropdown = () => {
      dropdown.style.display === 'flex' ? hideDropdown() : showDropdown();
    };

    const renderList = (cont, items, onClick, onHover) => {
      cont.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('div');
        row.textContent = item;
        row.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          color: var(--henry-text-high, #333);
        `;
        row.addEventListener('mouseenter', () => {
          row.style.backgroundColor = 'var(--henry-bg-hover, rgba(0,0,0,0.04))';
          if (onHover) onHover(item);
        });
        row.addEventListener('mouseleave', () => {
          row.style.backgroundColor = '';
        });
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          onClick(item);
        });
        cont.appendChild(row);
      });
    };

    // --- イベントハンドラ ---
    modalitySelect.addEventListener('change', () => {
      state.modality = modalitySelect.value;
      state.major = '';
      state.minor = '';
      hideDropdown();

      if (!state.modality) {
        bodyPartButton.disabled = true;
        bodyPartButton.style.opacity = '0.6';
      } else if (state.modality === 'DEXA') {
        bodyPartButton.disabled = true;
        bodyPartButton.style.opacity = '0.6';
        state.major = '前腕';
      } else {
        bodyPartButton.disabled = false;
        bodyPartButton.style.opacity = '1.0';

        if (state.modality === 'ポータブル') {
          renderList(majorPanel, PORTABLE_PARTS, (item) => {
            state.major = item;
            updateButtonText();
            updateSearch();
            hideDropdown();
          });
        } else {
          renderList(majorPanel, Object.keys(BODY_PARTS),
            () => {},
            (hoverItem) => {
              state.major = hoverItem;
              minorPanel.style.display = 'block';
              renderList(minorPanel, BODY_PARTS[hoverItem], (subItem) => {
                state.minor = subItem;
                updateButtonText();
                updateSearch();
                hideDropdown();
              });
            }
          );
        }
      }
      updateButtonText();
      updateSearch();
    });

    bodyPartButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    // 外部クリックで閉じる
    outsideClickHandler = (e) => {
      if (!bodyPartButton.contains(e.target) && !dropdown.contains(e.target)) {
        hideDropdown();
      }
    };
    document.addEventListener('click', outsideClickHandler);

    // --- DOM挿入 ---
    container.appendChild(modalitySelect);
    container.appendChild(bodyPartButton);
    container.appendChild(dropdown);

    const searchBoxWrapper = searchInput.parentElement;
    if (searchBoxWrapper && searchBoxWrapper.parentElement) {
      searchBoxWrapper.parentElement.insertBefore(container, searchBoxWrapper);
      searchBoxWrapper.style.visibility = 'hidden';
      searchBoxWrapper.style.height = '0';
      searchBoxWrapper.style.overflow = 'hidden';
    }
  }

  init();
})();
