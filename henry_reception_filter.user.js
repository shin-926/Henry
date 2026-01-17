// ==UserScript==
// @name         Henry 外来受付フィルタ
// @namespace    https://github.com/shin-926/Henry
// @version      1.0.0
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
  const PATIENT_CARD_SELECTOR = 'li[data-mabl-component="patient-list-item"]';

  // フィルタ状態
  let filterEnabled = true;

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
    updateButtonState();
  }

  /**
   * ボタンの表示状態を更新
   */
  function updateButtonState() {
    const btn = document.getElementById(FILTER_BUTTON_ID);
    if (!btn) return;

    if (filterEnabled) {
      btn.textContent = '未完了のみ';
      btn.style.backgroundColor = '#1976d2';
      btn.style.color = 'white';
    } else {
      btn.textContent = '未完了のみ';
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }
  }

  /**
   * フィルタボタンを追加
   */
  function addFilterButton() {
    // 既に追加済みなら何もしない
    if (document.getElementById(FILTER_BUTTON_ID)) return;

    // 「すべて」ボタンを探す
    const allButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent.includes('すべて')
    );
    if (!allButton) return;

    // ボタンを作成
    const filterBtn = document.createElement('button');
    filterBtn.id = FILTER_BUTTON_ID;
    filterBtn.textContent = '未完了のみ';
    filterBtn.style.cssText = `
      margin-left: 8px;
      padding: 4px 12px;
      border: 1px solid #1976d2;
      border-radius: 16px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;

    filterBtn.addEventListener('click', () => {
      filterEnabled = !filterEnabled;
      applyFilter();
    });

    // 「すべて」ボタンの後に挿入
    allButton.parentElement.insertBefore(filterBtn, allButton.nextSibling);
    updateButtonState();
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
      if (hasPatientChange) {
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
  function init(cleaner) {
    // 外来受付画面でのみ動作
    if (!location.pathname.startsWith('/reception')) {
      return;
    }

    console.log(`[${SCRIPT_NAME}] 外来受付画面を検出`);

    // フィルタ状態をリセット（ページ遷移時にデフォルトでON）
    filterEnabled = true;

    // DOMの準備を待つ
    const checkReady = setInterval(() => {
      const cards = document.querySelectorAll(PATIENT_CARD_SELECTOR);
      if (cards.length > 0) {
        clearInterval(checkReady);
        addFilterButton();
        applyFilter();
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
