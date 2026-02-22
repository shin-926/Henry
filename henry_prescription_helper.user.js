// ==UserScript==
// @name         処方終了日カレンダー
// @namespace    https://henry-app.jp/
// @version      0.1.1
// @description  処方オーダーの日分入力に終了日カレンダーを追加
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_prescription_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_prescription_helper.user.js
// ==/UserScript==

/*
 * 【処方終了日カレンダー】
 *
 * ■ 使用場面
 * - 処方オーダーで「○月○日まで」と終了日を指定して日数を計算したい場合
 *
 * ■ 主な機能
 * - 日分入力フィールド横にカレンダーアイコンを追加
 * - アイコンクリックでミニカレンダーを表示
 * - 終了日を選択すると開始日からの日数を自動計算・入力
 *
 * ■ 動作条件
 * - 処方オーダーモーダル（role="dialog"）が開いている時のみ動作
 * - 開始日が入力されている必要あり
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;

  const CONFIG = {
    SCRIPT_NAME: 'PrescriptionEndDate',
    BTN_ATTR: 'data-enddate-btn',
    CALENDAR_CLASS: 'henry-enddate-calendar',
    HENRY_CORE_WAIT: 100,
    HENRY_CORE_TIMEOUT: 5000,
    DEBOUNCE_DELAY: 150
  };

  let logger = { info: console.log, warn: console.warn, error: console.error };

  // ==========================================
  // CSS スタイル
  // ==========================================
  function injectStyles() {
    if (document.getElementById('henry-enddate-styles')) return;
    const style = document.createElement('style');
    style.id = 'henry-enddate-styles';
    style.textContent = `
      .henry-enddate-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: none;
        cursor: pointer;
        padding: 0;
        margin-left: 2px;
        border-radius: 4px;
        color: #666;
        flex-shrink: 0;
        vertical-align: middle;
        transition: color 0.15s, background 0.15s;
      }
      .henry-enddate-btn:hover {
        color: #1976d2;
        background: rgba(25, 118, 210, 0.08);
      }
      .henry-enddate-btn .material-icons {
        font-size: 18px;
      }

      .${CONFIG.CALENDAR_CLASS} {
        position: fixed;
        z-index: 1500;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
        padding: 12px;
        width: 280px;
        font-family: 'Noto Sans JP', sans-serif;
        user-select: none;
      }

      .${CONFIG.CALENDAR_CLASS}-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .${CONFIG.CALENDAR_CLASS}-header button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
        transition: background 0.15s;
      }
      .${CONFIG.CALENDAR_CLASS}-header button:hover {
        background: #f0f0f0;
      }
      .${CONFIG.CALENDAR_CLASS}-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }

      .${CONFIG.CALENDAR_CLASS}-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-size: 11px;
        color: #999;
        margin-bottom: 4px;
      }

      .${CONFIG.CALENDAR_CLASS}-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .${CONFIG.CALENDAR_CLASS}-day {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        aspect-ratio: 1;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 50%;
        font-size: 13px;
        color: #333;
        padding: 0;
        transition: background 0.1s, color 0.1s;
      }
      .${CONFIG.CALENDAR_CLASS}-day:hover:not(:disabled) {
        background: #e3f2fd;
      }
      .${CONFIG.CALENDAR_CLASS}-day:disabled {
        color: #ccc;
        cursor: default;
      }
      .${CONFIG.CALENDAR_CLASS}-day.today {
        font-weight: 700;
        color: #1976d2;
      }
      .${CONFIG.CALENDAR_CLASS}-day.selected {
        background: #1976d2;
        color: #fff;
        font-weight: 600;
      }
      .${CONFIG.CALENDAR_CLASS}-day.empty {
        visibility: hidden;
      }
      .${CONFIG.CALENDAR_CLASS}-day.sun {
        color: #e53935;
      }
      .${CONFIG.CALENDAR_CLASS}-day.sat {
        color: #1565c0;
      }
      .${CONFIG.CALENDAR_CLASS}-day:disabled.sun {
        color: rgba(229, 57, 53, 0.3);
      }
      .${CONFIG.CALENDAR_CLASS}-day:disabled.sat {
        color: rgba(21, 101, 192, 0.3);
      }

      .${CONFIG.CALENDAR_CLASS}-info {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // Material Icon要素を生成（XSS安全）
  // ==========================================
  function createIcon(name, fontSize) {
    const span = document.createElement('span');
    span.className = 'material-icons';
    span.textContent = name;
    if (fontSize) span.style.fontSize = fontSize;
    return span;
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
    element.focus();
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // ==========================================
  // 処方オーダーモーダルを探す
  // ==========================================
  function findPrescriptionDialog() {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      const h2 = dialog.querySelector('h2');
      const text = h2?.textContent || '';
      if (text.includes('処方オーダー')) {
        return dialog;
      }
    }
    return null;
  }

  // ==========================================
  // 開始日を取得（YYYY.MM.DD → Date）
  // ==========================================
  function getStartDate(dialog) {
    const input = dialog.querySelector('input[placeholder="開始日"]');
    if (!input || !input.value) return null;

    const val = input.value.trim();
    // YYYY.MM.DD 形式をパース
    const match = val.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }

  // ==========================================
  // 日数計算（終了日 - 開始日）
  // ==========================================
  function calculateDays(startDate, endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / msPerDay);
  }

  // ==========================================
  // カレンダーポップアップ
  // ==========================================
  function createCalendar(anchorEl, startDate, onSelect) {
    // 既存カレンダーを閉じる
    closeCalendar();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentYear = startDate.getFullYear();
    let currentMonth = startDate.getMonth();

    // 開始日が今月より前なら今月を表示
    if (currentYear < today.getFullYear() ||
      (currentYear === today.getFullYear() && currentMonth < today.getMonth())) {
      currentYear = today.getFullYear();
      currentMonth = today.getMonth();
    }

    const cal = document.createElement('div');
    cal.className = CONFIG.CALENDAR_CLASS;

    function render() {
      cal.textContent = '';

      // ヘッダー（◀ YYYY年MM月 ▶）
      const header = document.createElement('div');
      header.className = `${CONFIG.CALENDAR_CLASS}-header`;

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.appendChild(createIcon('chevron_left', '20px'));
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        render();
      });

      const title = document.createElement('span');
      title.className = `${CONFIG.CALENDAR_CLASS}-title`;
      title.textContent = `${currentYear}年${currentMonth + 1}月`;

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.appendChild(createIcon('chevron_right', '20px'));
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        render();
      });

      header.append(prevBtn, title, nextBtn);
      cal.appendChild(header);

      // 曜日ヘッダー
      const weekdays = document.createElement('div');
      weekdays.className = `${CONFIG.CALENDAR_CLASS}-weekdays`;
      ['日', '月', '火', '水', '木', '金', '土'].forEach((d, i) => {
        const span = document.createElement('span');
        span.textContent = d;
        if (i === 0) span.style.color = '#e53935';
        if (i === 6) span.style.color = '#1565c0';
        weekdays.appendChild(span);
      });
      cal.appendChild(weekdays);

      // 日付グリッド
      const daysGrid = document.createElement('div');
      daysGrid.className = `${CONFIG.CALENDAR_CLASS}-days`;

      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      // 空白セル
      for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('button');
        empty.type = 'button';
        empty.className = `${CONFIG.CALENDAR_CLASS}-day empty`;
        empty.disabled = true;
        daysGrid.appendChild(empty);
      }

      // 日付セル
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentYear, currentMonth, d);
        const dayOfWeek = date.getDay();
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `${CONFIG.CALENDAR_CLASS}-day`;
        btn.textContent = d;

        // 曜日の色クラス
        if (dayOfWeek === 0) btn.classList.add('sun');
        if (dayOfWeek === 6) btn.classList.add('sat');

        // 今日
        if (date.getTime() === today.getTime()) {
          btn.classList.add('today');
        }

        // 開始日以前は無効（開始日当日も無効＝最低1日分必要）
        if (date <= startDate) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelect(date);
            closeCalendar();
          });
        }

        daysGrid.appendChild(btn);
      }

      cal.appendChild(daysGrid);

      // 情報欄
      const info = document.createElement('div');
      info.className = `${CONFIG.CALENDAR_CLASS}-info`;
      const sy = startDate.getFullYear();
      const sm = startDate.getMonth() + 1;
      const sd = startDate.getDate();
      info.textContent = `開始日: ${sy}/${sm}/${sd}`;
      cal.appendChild(info);
    }

    render();

    // 位置決め
    document.body.appendChild(cal);
    positionCalendar(cal, anchorEl);

    // 外側クリックで閉じる
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscKey);
    }, 0);

    return cal;
  }

  function positionCalendar(cal, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const calRect = cal.getBoundingClientRect();

    let top = rect.bottom + 4;
    let left = rect.left;

    // 画面外にはみ出す場合の調整
    if (top + calRect.height > window.innerHeight) {
      top = rect.top - calRect.height - 4;
    }
    if (left + calRect.width > window.innerWidth) {
      left = window.innerWidth - calRect.width - 8;
    }
    if (left < 8) left = 8;

    cal.style.top = `${top}px`;
    cal.style.left = `${left}px`;
  }

  function closeCalendar() {
    const existing = document.querySelector(`.${CONFIG.CALENDAR_CLASS}`);
    if (existing) existing.remove();
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscKey);
  }

  function handleOutsideClick(e) {
    const cal = document.querySelector(`.${CONFIG.CALENDAR_CLASS}`);
    if (cal && !cal.contains(e.target) && !e.target.closest(`[${CONFIG.BTN_ATTR}]`)) {
      closeCalendar();
    }
  }

  function handleEscKey(e) {
    if (e.key === 'Escape') {
      closeCalendar();
    }
  }

  // ==========================================
  // 日分inputの横にカレンダーボタンを注入
  // ==========================================
  function injectButtons(dialog) {
    const dayInputs = dialog.querySelectorAll('input[aria-label="日分"]');
    let injected = 0;

    dayInputs.forEach(input => {
      // 親のdiv（spinner含むラッパー）を取得
      const wrapper = input.closest('div[mode]') || input.parentElement;
      if (!wrapper) return;

      // 二重注入防止
      if (wrapper.parentElement?.querySelector(`[${CONFIG.BTN_ATTR}]`)) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'henry-enddate-btn';
      btn.setAttribute(CONFIG.BTN_ATTR, 'true');
      btn.title = '終了日を指定して日数を計算';
      btn.appendChild(createIcon('event'));

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const startDate = getStartDate(dialog);
        if (!startDate) {
          logger.warn('開始日が未設定のためカレンダーを開けません');
          return;
        }

        createCalendar(btn, startDate, (endDate) => {
          // ボタンの親から現在のinputを再取得（React再レンダリング対策）
          const currentInput = btn.parentElement?.querySelector('input[aria-label="日分"]');
          if (!currentInput) {
            logger.warn('日分inputが見つかりません');
            return;
          }
          const days = calculateDays(startDate, endDate);
          if (days > 0) {
            setNativeValue(currentInput, String(days));
            logger.info(`終了日 ${endDate.getFullYear()}/${endDate.getMonth()+1}/${endDate.getDate()} → ${days}日分`);
          }
        });
      });

      // wrapper の直後に挿入
      wrapper.parentElement.insertBefore(btn, wrapper.nextSibling);
      injected++;
    });

    if (injected > 0) {
      logger.info(`カレンダーボタンを ${injected} 個注入`);
    }
  }

  // ==========================================
  // 全UI削除
  // ==========================================
  function removeAllUI() {
    closeCalendar();
    document.querySelectorAll(`[${CONFIG.BTN_ATTR}]`).forEach(el => el.remove());
  }

  // ==========================================
  // デバウンス
  // ==========================================
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ==========================================
  // ページ監視セットアップ（2段階監視）
  // ==========================================
  function setupPage(cleaner) {
    let modalObserver = null;
    let currentDialog = null;

    const processDialog = () => {
      const dialog = findPrescriptionDialog();
      if (!dialog) return;
      injectButtons(dialog);
    };

    const startObserving = (dialog) => {
      if (modalObserver) {
        modalObserver.disconnect();
      }

      logger.info('Stage 2: 処方オーダーモーダル内の監視開始');
      const debouncedProcess = debounce(() => processDialog(), CONFIG.DEBOUNCE_DELAY);
      modalObserver = new MutationObserver(debouncedProcess);
      modalObserver.observe(dialog, { childList: true, subtree: true });
      currentDialog = dialog;
      processDialog();
    };

    // Stage 1: body監視（処方オーダーモーダルの出現検知）
    const bodyObserver = new MutationObserver(() => {
      if (currentDialog && currentDialog.isConnected) return;

      const dialog = findPrescriptionDialog();
      if (!dialog) {
        if (modalObserver) {
          modalObserver.disconnect();
          modalObserver = null;
          currentDialog = null;
          logger.info('Stage 2: モーダル閉 → 監視停止');
        }
        return;
      }

      startObserving(dialog);
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
    cleaner.add(() => {
      bodyObserver.disconnect();
      if (modalObserver) {
        modalObserver.disconnect();
        modalObserver = null;
      }
      currentDialog = null;
    });
    cleaner.add(() => removeAllUI());

    // 初回チェック（既にモーダルが開いている場合）
    const initialDialog = findPrescriptionDialog();
    if (initialDialog) {
      startObserving(initialDialog);
    }
  }

  // ==========================================
  // メイン処理
  // ==========================================
  async function init() {
    let waited = 0;
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, CONFIG.HENRY_CORE_WAIT));
      waited += CONFIG.HENRY_CORE_WAIT;
      if (waited > CONFIG.HENRY_CORE_TIMEOUT) {
        console.error(`[${CONFIG.SCRIPT_NAME}] HenryCore が見つかりません`);
        return;
      }
    }

    const { utils } = window.HenryCore;
    logger = utils.createLogger(CONFIG.SCRIPT_NAME);

    logger.info(`Ready (v${VERSION})`);

    injectStyles();

    const cleaner = utils.createCleaner();
    utils.subscribeNavigation(cleaner, () => {
      logger.info('ページ遷移検出 → 再セットアップ');
      setupPage(cleaner);
    });

    setupPage(cleaner);
  }

  init();
})();
