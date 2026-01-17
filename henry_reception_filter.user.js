// ==UserScript==
// @name         Henry 外来受付フィルタ
// @namespace    https://github.com/shin-926/Henry
// @version      1.2.0
// @description  外来受付画面で「未完了」（会計待ち・会計済み以外）の患者のみ表示
// @author       Claude
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_reception_filter.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_reception_filter.user.js
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'ReceptionFilter';
  const FILTER_BUTTON_ID = 'henry-reception-filter-btn';
  const FILTER_LI_ID = 'henry-reception-filter-li';
  const PATIENT_CARD_SELECTOR = 'li[data-mabl-component="patient-list-item"]';

  // フィルタ状態
  let filterEnabled = true;

  // スタイル定数（Henryのフィルタボタンに合わせる）
  const STYLES = {
    selected: {
      color: 'rgba(0, 0, 0, 0.73)',
      fontWeight: '600'
    },
    unselected: {
      color: 'rgba(0, 0, 0, 0.4)',
      fontWeight: '600'
    }
  };

  /**
   * Apollo Client で患者リストを再取得
   */
  async function refreshPatientList() {
    const client = window.__APOLLO_CLIENT__;
    if (!client) {
      console.warn(`[${SCRIPT_NAME}] Apollo Client が見つかりません`);
      return false;
    }

    try {
      console.log(`[${SCRIPT_NAME}] 患者リストを再取得中...`);
      await client.refetchQueries({ include: ['listSessions'] });
      console.log(`[${SCRIPT_NAME}] 患者リストを再取得しました`);
      return true;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 再取得エラー:`, e);
      return false;
    }
  }

  /**
   * 患者リストにフィルタを適用
   */
  function applyFilter() {
    const cards = document.querySelectorAll(PATIENT_CARD_SELECTOR);
    let shown = 0, hidden = 0;

    cards.forEach(card => {
      const text = card.innerText;
      if (filterEnabled && (text.includes('会計済み') || text.includes('会計待ち'))) {
        card.style.display = 'none';
        hidden++;
      } else {
        card.style.display = '';
        shown++;
      }
    });

    console.log(`[${SCRIPT_NAME}] フィルタ適用: 表示=${shown}, 非表示=${hidden}`);
    updateButtonStyles();
  }

  /**
   * すべてのフィルタボタンのスタイルを更新
   */
  function updateButtonStyles() {
    const filterLi = document.getElementById(FILTER_LI_ID);
    const filterBtn = document.getElementById(FILTER_BUTTON_ID);
    if (!filterLi || !filterBtn) return;

    // 「未完了のみ」ボタンのスタイル更新
    if (filterEnabled) {
      filterLi.dataset.selected = 'true';
      Object.assign(filterBtn.style, STYLES.selected);
    } else {
      filterLi.dataset.selected = 'false';
      Object.assign(filterBtn.style, STYLES.unselected);
    }
  }

  /**
   * 既存のフィルタボタンにイベントリスナーを追加
   */
  function setupExistingFilterButtons() {
    // 既存のフィルタボタン（li要素）を探す
    const filterItems = document.querySelectorAll('li[id^="_"]');

    filterItems.forEach(li => {
      // 既にリスナーを追加済みならスキップ
      if (li.dataset.customListenerAdded) return;
      li.dataset.customListenerAdded = 'true';

      li.addEventListener('click', () => {
        // 他のフィルタがクリックされたら「未完了のみ」を解除
        if (filterEnabled) {
          filterEnabled = false;
          // フィルタ解除（全て表示）
          const cards = document.querySelectorAll(PATIENT_CARD_SELECTOR);
          cards.forEach(card => card.style.display = '');
          updateButtonStyles();
          console.log(`[${SCRIPT_NAME}] フィルタ解除（他のフィルタが選択されました）`);
        }
      });
    });
  }

  /**
   * フィルタボタンを追加（既存ボタンと同じデザイン）
   */
  function addFilterButton() {
    // 既に追加済みなら何もしない
    if (document.getElementById(FILTER_LI_ID)) return;

    // 「会計済み」ボタンの親li要素を探す
    const existingButtons = document.querySelectorAll('li[id^="_"]');
    const lastLi = existingButtons[existingButtons.length - 1];
    if (!lastLi) return;

    // li要素を作成（既存と同じ構造）
    const li = document.createElement('li');
    li.id = FILTER_LI_ID;
    li.dataset.selected = 'true'; // デフォルトで選択状態
    li.style.cssText = 'display: flex; align-items: center;';

    // button要素を作成
    const btn = document.createElement('button');
    btn.id = FILTER_BUTTON_ID;
    btn.style.cssText = `
      background: transparent;
      border: none;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: ${STYLES.selected.color};
    `;

    // span要素を作成（テキスト用）
    const span = document.createElement('span');
    span.textContent = '未完了のみ';
    btn.appendChild(span);

    btn.addEventListener('click', async () => {
      if (!filterEnabled) {
        filterEnabled = true;
        // 最新データを取得してからフィルタ適用
        await refreshPatientList();
        setTimeout(applyFilter, 300);
      }
    });

    li.appendChild(btn);

    // 「会計済み」の後に挿入
    lastLi.parentElement.insertBefore(li, lastLi.nextSibling);

    // 既存ボタンにリスナーを設定
    setupExistingFilterButtons();

    console.log(`[${SCRIPT_NAME}] フィルタボタンを追加しました`);
  }

  /**
   * 患者リストの変更を監視してフィルタを再適用
   */
  function observePatientList(cleaner) {
    const main = document.querySelector('main');
    if (!main) return;

    const observer = new MutationObserver((mutations) => {
      // 患者カードが追加/変更されたらフィルタを再適用
      const hasPatientChange = mutations.some(m =>
        m.addedNodes.length > 0 || m.removedNodes.length > 0
      );
      if (hasPatientChange && filterEnabled) {
        // 少し遅延してフィルタ適用（Reactのレンダリング完了を待つ）
        setTimeout(applyFilter, 100);
      }
    });

    observer.observe(main, { childList: true, subtree: true });
    cleaner.add(() => observer.disconnect());
  }

  /**
   * 初期化
   */
  async function init(cleaner) {
    // 外来受付画面でのみ動作
    if (!location.pathname.startsWith('/reception')) {
      return;
    }

    console.log(`[${SCRIPT_NAME}] 外来受付画面を検出`);

    // フィルタ状態をリセット（ページ遷移時にデフォルトでON）
    filterEnabled = true;

    // DOMの準備を待つ
    const checkReady = setInterval(async () => {
      const cards = document.querySelectorAll(PATIENT_CARD_SELECTOR);
      const existingFilters = document.querySelectorAll('li[id^="_"]');

      if (cards.length > 0 && existingFilters.length > 0) {
        clearInterval(checkReady);

        // 最新データを取得してからフィルタ適用
        await refreshPatientList();

        addFilterButton();
        // データ再取得後、少し待ってからフィルタ適用
        setTimeout(applyFilter, 300);
        observePatientList(cleaner);
      }
    }, 200);

    // タイムアウト（10秒）
    setTimeout(() => clearInterval(checkReady), 10000);
    cleaner.add(() => clearInterval(checkReady));
  }

  /**
   * HenryCore を使用した SPA 対応
   */
  function waitForHenryCore() {
    const checkCore = setInterval(() => {
      if (window.HenryCore?.utils) {
        clearInterval(checkCore);
        const cleaner = HenryCore.utils.createCleaner();
        HenryCore.utils.subscribeNavigation(cleaner, () => init(cleaner));
        console.log(`[${SCRIPT_NAME}] 初期化完了 (HenryCore使用)`);
      }
    }, 100);

    // HenryCoreが見つからない場合のフォールバック
    setTimeout(() => {
      clearInterval(checkCore);
      if (!window.HenryCore) {
        console.log(`[${SCRIPT_NAME}] HenryCore未検出、単独モードで起動`);
        init({ add: () => {} });
        // SPA遷移を監視
        window.addEventListener('popstate', () => init({ add: () => {} }));
      }
    }, 5000);
  }

  waitForHenryCore();
})();
