// ==UserScript==
// @name         予約システム：カレンダーUIカスタム
// @namespace    http://tampermonkey.net/
// @version      2.48.3
// @description  カレンダー縦表示、週ジャンプなど | powered by Claude & Gemini
// @author       sk
// @match        https://manage-maokahp.reserve.ne.jp/manage/calendar.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/reserve_calendar_ui.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/reserve_calendar_ui.user.js
// ==/UserScript==

/*
 * 【予約システム：カレンダーUIカスタム】
 *
 * ■ 使用場面
 * - 予約システム（reserve.ne.jp）のカレンダー画面を使いやすくしたい場合
 *
 * ■ 主な機能
 * 1. カレンダー縦表示
 *    - 複数月を縦に並べて表示
 *    - 一覧性の向上
 *
 * 2. 週ジャンプ
 *    - 「前週」「次週」ボタンで素早く移動
 *
 * 3. その他UI改善
 *    - ヘッダー固定
 *    - 表示の最適化
 *
 * ■ 対象ページ
 * - reserve.ne.jp のカレンダー画面（calendar.php）のみで動作
 * - Henryとは独立して動作（HenryCore不要）
 *
 * ■ MutationObserver
 * - カレンダー要素のみを監視（subtree:false）
 * - 非SPAサイトのためdisconnect不要
 */

(function() {
  'use strict';

    const CONFIG = {
        targetSelector: '#div_swipe_calendar',        // カレンダー要素のセレクタ
        headerSelector: '#div_header',                 // ヘッダー要素のセレクタ（カレンダーの上端位置の基準）
        numberOfMonths: 2,                             // 表示する月数（縦に並ぶ）
        magnification: 1.6,                            // 表示倍率（1.0=標準、大きいほど文字・幅が拡大）
        monthGapPx: 15,                                // 月と月の間隔（ピクセル）
        groupPaddingBottom: 10,                        // 各月グループの下部余白（ピクセル）
        arrowSideGap: '12px',                          // 矢印ボタンの左右の余白
        retryIntervalMs: 500,                          // 初期化リトライの間隔（ミリ秒）
        weeksJump: {
            enable: true,                                // 週ジャンプ機能の有効/無効
            reselectAfterJump: true,                     // ジャンプ後に入力欄を再選択するか
            reselectDelayMs: 320                         // 再選択までの待機時間（ミリ秒）
        }
    };

  const BASE_FONT_PERCENT = 115;
  const BASE_WIDTH_EM = 19;
  // 初期値（後で動的に調整される）
  let currentMagnification = CONFIG.magnification;

  const css = `
    :root {
      --calendar-magnification: ${CONFIG.magnification};
      --calendar-font-size: calc(${BASE_FONT_PERCENT}% * var(--calendar-magnification));
      --calendar-width: calc(${BASE_WIDTH_EM}em * var(--calendar-magnification));
    }

    ${CONFIG.targetSelector} {
      position: fixed !important;
      right: 0 !important;
      bottom: 0 !important;
      left: auto !important;
      width: var(--calendar-width) !important;
      background-color: #fff !important;
      z-index: 2147483640 !important;
      border-left: 1px solid #ccc !important;
      box-shadow: none !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

/* 日付セル全般の基本スタイル */
${CONFIG.targetSelector} .ui-datepicker-calendar td a {
  border: 2px solid transparent !important;
  box-sizing: border-box !important;
}

/* マウスオーバー時の色（選択中でない日付のみ） */
${CONFIG.targetSelector} .ui-datepicker-calendar td:not(.ui-datepicker-current-day) a:hover {
  background-color: #caf1ff !important;
  color: #000 !important;
  font-weight: bold !important;
  //border: 2px solid #4682B4 !important;
}

/* 選択された日付を蛍光イエローに（より具体的なセレクタ） */
${CONFIG.targetSelector} .ui-datepicker-calendar .ui-datepicker-current-day a,
${CONFIG.targetSelector} .ui-datepicker-calendar a.ui-state-active {
  background-color: #FFFF33 !important;
  color: #000 !important;
  font-weight: bold !important;
  border: 2px solid #FFA500 !important;
  border-color: #FFA500 !important;  /* これも追加 */
}



    /* カレンダー外枠（矢印の基準点にするため relative） */
    ${CONFIG.targetSelector} .ui-datepicker-inline {
      flex: 1 !important;
      overflow-y: auto !important;
      width: 100% !important;
      position: relative !important;
      padding-top: 30px !important;
      font-size: var(--calendar-font-size) !important;
      border: none !important;
    }

    /* 年月表示 20px固定 */
    ${CONFIG.targetSelector} .ui-datepicker-title,
    ${CONFIG.targetSelector} .ui-datepicker-year,
    ${CONFIG.targetSelector} .ui-datepicker-month {
      font-size: 20px !important;
      font-weight: bold !important;
      line-height: 1.5 !important;
    }

    /* 曜日見出し */
    ${CONFIG.targetSelector} th {
      padding: .2em .3em !important;
    }

    /* 月グループ間隔 */
    ${CONFIG.targetSelector} .ui-datepicker-group {
      width: 100% !important;
      float: none !important;
      padding-bottom: ${CONFIG.groupPaddingBottom}px !important;
    }
    ${CONFIG.targetSelector} .ui-datepicker-group-last {
      margin-top: ${CONFIG.monthGapPx}px !important;
      padding-top: 10px !important;
    }

    /* 矢印：スクロール領域の上に浮かせるために fixed で座標管理 */
    ${CONFIG.targetSelector} .ui-datepicker-prev,
    ${CONFIG.targetSelector} .ui-datepicker-next {
      position: fixed !important;
      z-index: 2147483647 !important;
      cursor: pointer !important;
      width: 2.2em !important;
      height: 2.2em !important;
      background: rgba(255,255,255,0.9) !important;
      border: none !important;
      border-radius: 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    /* 入力欄 */
    ${CONFIG.targetSelector} #haru-weeks-after {
      flex-shrink: 0 !important;
      background: #f0f0f0 !important;
      border-top: 2px solid #ddd !important;
      padding: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      font-size: var(--calendar-font-size) !important;
      font-weight: bold !important;
    }

    ${CONFIG.targetSelector} #haru-weeks-after input {
      font-size: inherit !important;
      width: 4em !important;
      text-align: center !important;
      border: 1px solid #aaa !important;
      border-radius: 4px !important;
    }
    ${CONFIG.targetSelector} .ui-datepicker-buttonpane { display: none !important; }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function getJQuery() { return window.jQuery || null; }
  function getTargetNode() { return document.querySelector(CONFIG.targetSelector); }

  // 倍率を設定
  function setMagnification(mag) {
    currentMagnification = mag;
    document.documentElement.style.setProperty('--calendar-magnification', mag);
  }

  // 画面に収まる倍率を計算して適用
  function adjustMagnification() {
    const root = getTargetNode();
    if (!root) return;

    const jq = getJQuery();
    const $header = jq ? jq(CONFIG.headerSelector) : [];
    if (!$header.length) return;

    // カレンダー内部のスクロール領域を取得
    const datepickerInline = root.querySelector('.ui-datepicker-inline');
    if (!datepickerInline) return;

    // スクロールが発生しているか確認
    const scrollHeight = datepickerInline.scrollHeight;
    const clientHeight = datepickerInline.clientHeight;

    const minMag = 0.8; // 最小倍率
    const maxMag = CONFIG.magnification; // 最大倍率（設定値）

    if (scrollHeight > clientHeight + 5) {
      // はみ出している場合、倍率を下げる
      const ratio = clientHeight / scrollHeight;
      const newMag = currentMagnification * ratio * 0.98;
      setMagnification(Math.max(minMag, newMag));
    } else if (scrollHeight < clientHeight - 20) {
      // 余裕がありすぎる場合、倍率を上げる
      const ratio = clientHeight / scrollHeight;
      const newMag = currentMagnification * ratio * 0.98;
      setMagnification(Math.min(maxMag, newMag));
    }
  }

  function adjustLayout() {
    const jq = getJQuery();
    const $calendar = jq ? jq(CONFIG.targetSelector) : [];
    const $header = jq ? jq(CONFIG.headerSelector) : [];

    if ($header.length && $calendar.length) {
      const rect = $header[0].getBoundingClientRect();
      const topVal = Math.max(0, rect.bottom);
      $calendar[0].style.setProperty('top', topVal + 'px', 'important');
      $calendar[0].style.setProperty('height', `calc(100vh - ${topVal}px)`, 'important');

      const calendarRect = $calendar[0].getBoundingClientRect();

      // 左矢印
      const prev = $calendar[0].querySelector('.ui-datepicker-prev');
      if (prev) {
        prev.style.setProperty('top', (topVal + 8) + 'px', 'important');
        prev.style.setProperty('left', (calendarRect.left + 12) + 'px', 'important');
      }
      // 右矢印
      const next = $calendar[0].querySelector('.ui-datepicker-next');
      if (next) {
        next.style.setProperty('top', (topVal + 8) + 'px', 'important');
        next.style.setProperty('right', '12px', 'important');
      }
    }
  }

  function applyCalendarSettings() {
    const jq = getJQuery();
    if (!jq || !jq.fn.datepicker) return false;
    const $target = jq(CONFIG.targetSelector);
    if (!$target.length) return false;

    try {
      adjustLayout();
      if ($target.datepicker('option', 'numberOfMonths') !== CONFIG.numberOfMonths) {
        $target.datepicker('option', 'numberOfMonths', CONFIG.numberOfMonths);
        $target.datepicker('refresh');
      }
      return true;
    } catch { return false; }
  }

  function ensureWeeksAfterUI() {
    const root = getTargetNode();
    if (!root || root.querySelector('#haru-weeks-after')) return;

    const bar = document.createElement('div');
    bar.id = 'haru-weeks-after';
    bar.innerHTML = `今日から <input type="number" value="0" min="0"> 週後`;
    root.appendChild(bar);

    const input = bar.querySelector('input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const weeks = parseInt(input.value, 10);
        if (!isNaN(weeks)) {
          const target = new Date();
          target.setDate(target.getDate() + (weeks * 7));
          const $target = jQuery(CONFIG.targetSelector);
          $target.datepicker('setDate', target);
          $target.datepicker('refresh');

          // 該当日付のセルを探してクリックイベントを発火
          setTimeout(() => {
            const targetDateStr = jQuery.datepicker.formatDate('mm/dd/yy', target);
            const $cell = $target.find('td[data-handler="selectDay"] a').filter(function() {
              const cellDate = new Date(
                jQuery(this).closest('td').data('year'),
                jQuery(this).closest('td').data('month'),
                jQuery(this).text()
              );
              return jQuery.datepicker.formatDate('mm/dd/yy', cellDate) === targetDateStr;
            });
            if ($cell.length) {
              $cell[0].click(); // クリックイベントを発火
            }
          }, 100);

          if (CONFIG.weeksJump.reselectAfterJump) {
            setTimeout(() => { input.focus(); input.select(); }, CONFIG.weeksJump.reselectDelayMs);
          }
        }
      }
    });
    setTimeout(() => { input.focus(); input.select(); }, 200);
  }

  function tick() {
    if (applyCalendarSettings()) {
      ensureWeeksAfterUI();

      // ツールバーを自動で隠す（初回のみ）
      if (!window.toolbarHidden) {
        const openBtn = document.querySelector('#div_toolbar_hider_open');
        const hideBtn = document.querySelector('#div_toolbar_hider_hide');
        const toolbar = document.querySelector('#div_contents_topmenu');
        if (openBtn && hideBtn && toolbar) {
          openBtn.style.display = 'block';
          hideBtn.style.display = 'none';
          toolbar.style.display = 'none';
          window.toolbarHidden = true;
        }
      }

      if (!window.layoutSync) {
        window.layoutSync = setInterval(adjustLayout, 1000);

        // 初回の倍率調整（少し遅延させて描画完了を待つ）
        setTimeout(adjustMagnification, 500);

        // ウィンドウリサイズ時に倍率を再調整
        window.addEventListener('resize', () => {
          setMagnification(CONFIG.magnification); // 一度リセット
          setTimeout(adjustMagnification, 100);
        });

        // 監視範囲の最適化：カレンダー要素のみを監視
        const observerTarget = getTargetNode();
        if (observerTarget) {
          const observer = new MutationObserver(() => {
            applyCalendarSettings();
            ensureWeeksAfterUI();
          });
          observer.observe(observerTarget, { childList: true, subtree: false });
        }
      }
    } else {
      setTimeout(tick, CONFIG.retryIntervalMs);
    }
  }

  tick();
})();
