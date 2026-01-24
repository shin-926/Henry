// ==UserScript==
// @name         画像オーダー入力支援
// @namespace    https://henry-app.jp/
// @version      1.28.5
// @description  画像照射オーダーモーダルに部位・方向選択UIを追加（複数内容対応）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_order_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_order_helper.user.js
// ==/UserScript==

/*
 * 【画像オーダー入力支援スクリプト】
 *
 * ■ 使用場面
 * - 照射オーダー（CT/MRI等）の入力モーダルで、部位や方向を素早く入力したい場合
 * - 「頭部」「胸部」「腹部」などの部位ボタンをワンクリックで入力したい場合
 *
 * ■ 主な機能
 * 1. 部位選択UI
 *    - モダリティ（CT/MRI/単純X線等）に応じた部位ボタンを表示
 *    - クリックで「部位」フィールドに自動入力
 *
 * 2. 方向選択UI
 *    - 「正面」「側面」「両方向」などの方向ボタン
 *    - 部位選択後に表示
 *
 * 3. 複数内容対応
 *    - 複数の照射内容がある場合も対応
 *    - 各内容に対して個別にUIを表示
 *
 * ■ 動作条件
 * - 照射オーダーモーダル（role="dialog"）が開いている時のみ動作
 * - モダリティのselectが選択されている必要あり
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;

  const CONFIG = {
    SCRIPT_NAME: 'ImagingOrderHelper',
    MODALITY_SELECTOR: 'select[aria-label="モダリティ"]',
    CONTAINER_CLASS: 'henry-imaging-helper-container'
  };

  // タイミング定数
  const TIMING = {
    DEBOUNCE_DELAY: 100,          // デバウンス遅延(ms)
    HENRY_CORE_WAIT: 100,         // HenryCore待機間隔(ms)
    HENRY_CORE_TIMEOUT: 5000,     // HenryCore待機タイムアウト(ms)
    DOM_READY_WAIT: 300,          // DOM準備待機(ms)
    BODY_POSITION_DELAY: 500,     // 体位設定遅延(ms)
    HELPER_UI_DELAY: 50,          // ヘルパーUI注入遅延(ms)
    OBSERVER_TIMEOUT: 5000        // Observer切断タイムアウト(ms)
  };

  // DOM探索定数
  const DOM_SEARCH = {
    MAX_ANCESTOR_DEPTH: 10,       // 親要素を辿る最大深さ
    MAX_FIBER_DEPTH: 20,          // React Fiber探索最大深さ
    NOTE_INPUT_PARENT_DEPTH: 3,   // 補足inputを探す際の親要素探索深さ
    BODY_SITE_PARENT_DEPTH: 4     // BodySiteFormの親要素を辿る深さ（非表示用）
  };

  // モダリティ値のマッピング
  const MODALITY_MAP = {
    'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL': 'XP',
    'IMAGING_MODALITY_CT': 'CT',
    'IMAGING_MODALITY_MRI_ABOVE_1_5_AND_BELOW_3_TESLA': 'MRI',
    'IMAGING_MODALITY_MD': 'MD'
  };

  // XP用データ（部位・撮影条件・方向を含む）
  const XP_DATA = {
    "頭〜躯幹": {
      "頭部": {
        bodySite: "頭部",
        defaultCondition: "80kVp, 25mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "胸部": {
        bodySite: "胸部",
        defaultCondition: "110kVp, 10mAs, 200cm",
        directions: ["正面", "ポータブル正面"],
        exclusiveDirections: true,
        conditionByDirection: { "ポータブル正面": "85kVp, 18mAs, 110cm" }
      },
      "肋骨": {
        bodySite: "肋骨",
        defaultCondition: "76kVp, 63mAs, 120cm",
        directions: ["正面", "両斜位"]
      },
      "胸骨": {
        bodySite: "胸骨",
        defaultCondition: "76kVp, 63mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "胸腹部": {
        bodySite: "胸腹部",
        defaultCondition: "80kVp, 32mAs, 120cm",
        directions: ["正面", "ポータブル正面"],
        exclusiveDirections: true,
        conditionByDirection: { "ポータブル正面": "100kVp, 70mAs, 110cm" }
      },
      "腹部": {
        bodySite: "腹部",
        defaultCondition: "80kVp, 32mAs, 120cm",
        directions: ["正面", "ポータブル正面"],
        exclusiveDirections: true,
        conditionByDirection: { "ポータブル正面": "85kVp, 20mAs, 110cm" }
      },
      "骨盤": {
        bodySite: "骨盤",
        defaultCondition: "80kVp, 63mAs, 120cm",
        directions: ["正面", "側面", "斜位（右寛骨）", "斜位（左寛骨）", "inlet", "outlet"]
      }
    },
    "脊椎": {
      "頚椎": {
        bodySite: "頚椎",
        defaultCondition: "70kVp, 20mAs, 120cm",
        directions: ["正面", "側面", "両斜位", "前後屈", "開口位正面"]
      },
      "胸椎": {
        bodySite: "胸椎",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "胸腰椎移行部": {
        bodySite: "胸腰椎移行部",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "腰椎": {
        bodySite: "腰椎",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面", "両斜位", "前後屈"]
      },
      "仙骨": {
        bodySite: "仙骨",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "仙尾骨": {
        bodySite: "仙骨/尾骨",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "尾骨": {
        bodySite: "尾骨",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "全脊椎": {
        bodySite: "脊椎",
        defaultCondition: "80kVp, 80mAs, 120cm",
        directions: ["正面", "側面"]
      }
    },
    "上肢": {
      "鎖骨": {
        bodySite: "鎖骨",
        defaultCondition: "70kVp, 10mAs, 120cm",
        directions: ["正面", "尾頭方向"]
      },
      "肩関節": {
        bodySite: "肩関節",
        defaultCondition: "70kVp, 10mAs, 120cm",
        directions: ["正面", "スカプラY", "肩関節正面", "肩関節軸位", "肩関節（上腕内外旋）"]
      },
      "肩鎖関節": {
        bodySite: "肩鎖関節",
        defaultCondition: "70kVp, 10mAs, 120cm",
        directions: ["正面"]
      },
      "胸鎖関節": {
        bodySite: "鎖骨",
        defaultCondition: "70kVp, 10mAs, 120cm",
        directions: ["正面"]
      },
      "肩甲骨": {
        bodySite: "肩甲骨",
        defaultCondition: "70kVp, 10mAs, 120cm",
        directions: ["正面", "スカプラY"]
      },
      "上腕骨": {
        bodySite: "上腕",
        defaultCondition: "60kVp, 10mAs, 120cm",
        directions: ["正面", "側面", "片斜位"]
      },
      "肘関節": {
        bodySite: "肘関節",
        defaultCondition: "56kVp, 10mAs, 110cm",
        directions: ["正面", "側面", "45°屈曲位正面", "両斜位"]
      },
      "前腕": {
        bodySite: "前腕",
        defaultCondition: "56kVp, 10mAs, 110cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "手関節": {
        bodySite: "手関節",
        defaultCondition: "56kVp, 10mAs, 110cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "舟状骨": {
        bodySite: "舟状骨",
        defaultCondition: "56kVp, 10mAs, 110cm",
        directions: ["正面", "側面", "斜位", "尺屈"]
      },
      "手部": {
        bodySite: "手部",
        defaultCondition: "56kVp, 10mAs, 110cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "手根管": {
        bodySite: "手根管",
        defaultCondition: "60kVp, 12.5mAs, 110cm",
        directions: []
      },
      "手指": {
        bodySite: "手指",
        defaultCondition: "56kVp, 10mAs, 110cm",
        directions: ["正面", "側面", "両斜位"],
        subItems: {
          "母指": {
            directions: ["正面", "側面", "CM関節正面", "CM関節側面"],
            showJointSelector: false
          },
          "示指": { directions: ["正面", "側面", "両斜位"] },
          "中指": { directions: ["正面", "側面", "両斜位"] },
          "環指": { directions: ["正面", "側面", "両斜位"] },
          "小指": { directions: ["正面", "側面", "両斜位"] }
        },
        joints: ["指定なし", "DIP関節", "PIP関節"]
      }
    },
    "下肢": {
      "股関節": {
        bodySite: "股関節",
        defaultCondition: "80kVp, 63mAs, 120cm",
        directions: ["正面", "ラウエン（外旋）"]
      },
      "大腿骨": {
        bodySite: "大腿骨",
        defaultCondition: "70kVp, 16mAs, 120cm",
        directions: ["正面", "側面"]
      },
      "膝": {
        bodySite: "膝関節",
        defaultCondition: "61kVp, 10mAs, 120cm",
        directions: ["正面", "側面", "両斜位", "スカイライン", "ローゼンバーグ"]
      },
      "下腿": {
        bodySite: "下腿骨",
        defaultCondition: "58kVp, 10mAs, 130cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "足関節": {
        bodySite: "足関節",
        defaultCondition: "56kVp, 10mAs, 130cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "足": {
        bodySite: "足",
        defaultCondition: "56kVp, 10mAs, 130cm",
        directions: ["正面", "両斜位"]
      },
      "踵骨": {
        bodySite: "踵骨",
        defaultCondition: "56kVp, 10mAs, 130cm",
        directions: ["正面", "側面", "アントンセン"]
      },
      "足趾": {
        bodySite: "足指",
        defaultCondition: "56kVp, 10mAs, 130cm",
        directions: ["正面", "側面", "両斜位"],
        subItems: {
          "第1趾": { directions: ["正面", "側面", "両斜位"] },
          "第2趾": { directions: ["正面", "側面", "両斜位"] },
          "第3趾": { directions: ["正面", "側面", "両斜位"] },
          "第4趾": { directions: ["正面", "側面", "両斜位"] },
          "第5趾": { directions: ["正面", "側面", "両斜位"] }
        }
      }
    }
  };

  // CT用データ（部位を含む、撮影条件なし）
  const CT_DATA = {
    "入院・入所時": {
      "頭部、胸腹部、脊椎": { bodySite: "胸部", directions: [] }
    },
    "頭〜顔": {
      "頭蓋・脳": { bodySite: "頭部", directions: [] },
      "鼻骨": { bodySite: "鼻骨", directions: [] },
      "頬骨": { bodySite: "頬骨", directions: [] },
      "顎関節": { bodySite: "顎関節", directions: [] }
    },
    "体幹": {
      "胸部": { bodySite: "胸部", directions: [] },
      "肋骨・胸部": { bodySite: "肋骨", directions: [] },
      "胸腹部": { bodySite: "胸腹部", directions: [] },
      "胸部〜骨盤": { bodySite: "胸腹部骨盤腔", directions: [] },
      "骨盤・股関節": { bodySite: "骨盤・股関節", directions: [] }
    },
    "脊椎": {
      "頚椎": { bodySite: "頚椎", directions: [] },
      "胸腰椎": { bodySite: "胸椎", directions: [] },
      "腰椎": { bodySite: "腰椎", directions: [] },
      "仙尾骨": { bodySite: "仙骨/尾骨", directions: [] }
    },
    "上肢": {
      "鎖骨": { bodySite: "鎖骨", directions: [] },
      "肩関節": { bodySite: "肩関節", directions: [] },
      "肩甲骨": { bodySite: "肩甲骨", directions: [] },
      "上腕": { bodySite: "上腕", directions: [] },
      "肘関節": { bodySite: "肘", directions: [] },
      "前腕": { bodySite: "前腕", directions: [] },
      "手関節": { bodySite: "手関節", directions: [] },
      "手部": { bodySite: "手", directions: [] }
    },
    "下肢": {
      "股関節": { bodySite: "股関節", directions: [] },
      "大腿": { bodySite: "大腿骨", directions: [] },
      "膝関節": { bodySite: "膝関節", directions: [] },
      "下腿": { bodySite: "下腿骨", directions: [] },
      "足関節": { bodySite: "足関節", directions: [] },
      "踵骨": { bodySite: "踵骨", directions: [] },
      "足部": { bodySite: "足", directions: [] }
    }
  };

  // MRI用データ（部位を含む、撮影条件なし）
  const MRI_DATA = {
    "頭部": {
      "脳": { bodySite: "頭部", directions: [] }
    },
    "体幹": {
      "MRCP": { bodySite: "腹部", directions: [] },
      "骨盤・股関節": { bodySite: "骨盤・股関節", directions: [] }
    },
    "脊椎": {
      "頚椎": { bodySite: "頚椎", directions: [] },
      "胸椎": { bodySite: "胸椎", directions: [] },
      "胸腰椎移行部": { bodySite: "胸腰椎移行部", directions: [] },
      "腰椎": { bodySite: "腰椎", directions: [] },
      "腰椎・仙骨": { bodySite: "腰椎・仙骨部", directions: [] }
    },
    "上肢": {
      "肩関節": { bodySite: "肩関節", directions: [] },
      "手関節": { bodySite: "手関節", directions: [] }
    },
    "下肢": {
      "股関節": { bodySite: "股関節", directions: [] },
      "膝関節": { bodySite: "膝関節", directions: [] },
      "足関節": { bodySite: "足関節", directions: [] }
    }
  };

  let logger = null;
  // モダリティ変更時に全UIを更新するためのコールバックリスト
  let modalityChangeCallbacks = [];
  // 現在のモダリティを保持
  let currentModality = '';
  // ヘルパーUIモード（true: ヘルパーUI, false: 標準UI）
  let helperMode = true;

  // ==========================================
  // ユーティリティ: debounce
  // ==========================================
  function debounce(fn, delay) {
    let timerId = null;
    return (...args) => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => fn(...args), delay);
    };
  }

  // ==========================================
  // ユーティリティ: 親要素を辿ってセレクタに一致する要素を検索
  // ==========================================
  function findInAncestors(element, selector, maxDepth = DOM_SEARCH.MAX_ANCESTOR_DEPTH) {
    let parent = element;
    for (let i = 0; i < maxDepth && parent; i++) {
      const found = parent.querySelector(selector);
      if (found) return found;
      parent = parent.parentElement;
    }
    return null;
  }

  // ==========================================
  // スタイル定数
  // ==========================================
  const STYLES = {
    toggleButton: `
      padding: 4px 16px;
      font-size: 13px;
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      background: var(--henry-bg-base, #fff);
      color: var(--henry-text-high, #333);
      cursor: pointer;
      transition: all 0.15s;
    `,
    modeToggleButton: `
      margin-left: 12px;
      padding: 4px 12px;
      font-size: 12px;
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      background: var(--henry-bg-base, #fff);
      color: var(--henry-text-medium, #666);
      cursor: pointer;
    `,
    select: `
      height: 36px;
      min-width: 100px;
      flex: 1;
      max-width: 160px;
      border-radius: var(--henry-radius, 4px);
      background-color: var(--henry-bg-base, #fff);
      color: var(--henry-text-high, #333);
      font-family: "Noto Sans JP", sans-serif;
      font-size: 14px;
      padding: 0 10px;
      cursor: pointer;
      outline: none;
    `,
    label: `
      font-size: 13px;
      color: var(--henry-text-medium, #666);
    `,
    container: `
      display: none;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--henry-bg-sub, #f5f5f5);
      border-radius: var(--henry-radius, 4px);
      border: 1px solid var(--henry-border, #e0e0e0);
    `,
    row: 'display: flex; gap: 8px; align-items: center;',
    rowHidden: 'display: none; align-items: center; gap: 8px;',
    buttonGroup: 'display: flex; gap: 6px;',
    flexWrap: 'display: flex; flex-wrap: wrap; gap: 6px;'
  };

  // ==========================================
  // ユーティリティ: トグルボタンの選択状態を設定
  // ==========================================
  function setButtonSelected(btn, selected) {
    btn.dataset.selected = String(selected);
    if (selected) {
      btn.style.background = 'var(--henry-primary, rgb(0, 204, 146))';
      btn.style.borderColor = 'var(--henry-primary, rgb(0, 204, 146))';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'var(--henry-bg-base, #fff)';
      btn.style.borderColor = 'var(--henry-border, #ccc)';
      btn.style.color = 'var(--henry-text-high, #333)';
    }
  }

  // コンテナ内の全ボタンの選択を解除
  function clearButtonSelection(container) {
    container.querySelectorAll('button').forEach(b => setButtonSelected(b, false));
  }

  // ==========================================
  // メイン処理
  // ==========================================
  async function init() {
    let waited = 0;
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, TIMING.HENRY_CORE_WAIT));
      waited += TIMING.HENRY_CORE_WAIT;
      if (waited > TIMING.HENRY_CORE_TIMEOUT) {
        console.error('[' + CONFIG.SCRIPT_NAME + '] HenryCore が見つかりません');
        return;
      }
    }

    const { utils } = window.HenryCore;
    logger = utils.createLogger(CONFIG.SCRIPT_NAME);
    const cleaner = utils.createCleaner();

    logger.info(`Ready (v${VERSION})`);

    utils.subscribeNavigation(cleaner, () => {
      logger.info('ページ遷移検出 -> 再セットアップ');
      modalityChangeCallbacks = [];
      currentModality = '';
      setupPage(cleaner);
    });

    setupPage(cleaner);
  }

  // ==========================================
  // 「補足」ラベルを持つフォームグループ内のinputを検出
  // ==========================================
  function findNoteInputs(dialog) {
    const noteInputs = [];
    if (!dialog) return noteInputs;
    // 「補足」というテキストを持つlabelを探す（dialog内のみ）
    const labels = dialog.querySelectorAll('label');
    labels.forEach(label => {
      if (label.textContent.trim() === '補足') {
        // labelの親を辿ってフォームグループ全体を探す
        // 構造: div.sc-d2f77e68-0 > div.sc-d2f77e68-1 > label
        //                        > div.sc-e5e4d707-0 > input
        let parent = label.parentElement;
        // 親要素を辿ってinputを探す
        for (let i = 0; i < DOM_SEARCH.NOTE_INPUT_PARENT_DEPTH && parent; i++) {
          const input = parent.querySelector('input');
          if (input && !noteInputs.includes(input)) {
            noteInputs.push(input);
            break;
          }
          parent = parent.parentElement;
        }
      }
    });
    return noteInputs;
  }

  // ==========================================
  // 照射オーダーモーダルを探す（複数dialog対応）
  // ==========================================
  function findImagingOrderDialog() {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      const h2 = dialog.querySelector('h2');
      const text = h2?.textContent || '';
      if (text === '外来 照射オーダー' || text === '入院 照射オーダー') {
        return dialog;
      }
    }
    return null;
  }

  // ==========================================
  // モーダル内容の処理（モダリティ登録・補足欄検出）
  // ==========================================
  function processModalContent() {
    const dialog = findImagingOrderDialog();
    if (!dialog) return;

    const modalitySelect = dialog.querySelector(CONFIG.MODALITY_SELECTOR);
    if (!modalitySelect) return;

    // モダリティ選択のイベント登録（一度だけ）
    if (!modalitySelect.dataset.hasModalityListener) {
      modalitySelect.dataset.hasModalityListener = 'true';
      // inputイベントでも早期に属性を設定（ちらつき防止）
      modalitySelect.addEventListener('input', () => {
        const modalityValue = modalitySelect.value;
        dialog.dataset.modality = MODALITY_MAP[modalityValue] || '';
      });

      // MutationObserverでMD用フィールドが追加されたら即座に非表示
      let mdFieldObserver = null;
      const startMDFieldObserver = () => {
        if (mdFieldObserver) return; // 既に監視中
        mdFieldObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.querySelector?.('input[name*="filmCount"]')) {
                  toggleMDFields(dialog, true);
                  stopMDFieldObserver(); // 目的達成したら停止
                  return;
                }
              }
            }
          }
        });
        mdFieldObserver.observe(dialog, { childList: true, subtree: true });
      };
      const stopMDFieldObserver = () => {
        if (mdFieldObserver) {
          mdFieldObserver.disconnect();
          mdFieldObserver = null;
        }
      };

      modalitySelect.addEventListener('change', async () => {
        const modalityValue = modalitySelect.value;
        currentModality = MODALITY_MAP[modalityValue] || '';
        logger.info(`モダリティ変更: ${currentModality}`);
        // CSSで即座に非表示にするためdata-modality属性を設定
        dialog.dataset.modality = currentModality;
        modalityChangeCallbacks.forEach(cb => cb(currentModality));
        hideAutoFilledFields(dialog);
        // NOTE: startMDFieldObserverはawaitの前に呼ぶ（ReactがDOMを追加する前に監視を開始するため）
        if (currentModality === 'MD') {
          startMDFieldObserver();
        } else {
          stopMDFieldObserver();
        }
        if (currentModality === 'XP' || currentModality === 'MD') {
          await setBodyPositionToArbitrary(dialog);
        }
        if (currentModality === 'MD') {
          await setBodySiteToForearm(dialog);
          toggleMDFields(dialog, true);
        } else {
          toggleMDFields(dialog, false);
        }
      });

      // 初期値を設定
      currentModality = MODALITY_MAP[modalitySelect.value] || '';
      logger.info(`初期モダリティ: ${currentModality}`);
      // CSSで即座に非表示にするためdata-modality属性を設定
      dialog.dataset.modality = currentModality;
      hideAutoFilledFields(dialog);
      if (currentModality === 'XP' || currentModality === 'MD') {
        setBodyPositionToArbitrary(dialog);
      }
      if (currentModality === 'MD') {
        startMDFieldObserver(); // MD選択時に監視開始
        setBodySiteToForearm(dialog);
        toggleMDFields(dialog, true);
      }
    }

    // XP/MDの場合、体位を「任意」に設定（内容追加時のリセット対策、遅延実行）
    if (currentModality === 'XP' || currentModality === 'MD') {
      setTimeout(() => setBodyPositionToArbitrary(dialog), TIMING.BODY_POSITION_DELAY);
    }

    // トグルボタンを追加（まだなければ）
    injectToggleButton(dialog);

    // 「補足」ラベルを持つフォームグループ内のinputを検出（dialog内のみ）
    const noteInputs = findNoteInputs(dialog);
    noteInputs.forEach((noteInput, index) => {
      if (!noteInput.dataset.hasHelperUI) {
        logger.info(`補足欄 ${index + 1} を検出 (name=${noteInput.name})`);
        setTimeout(() => injectHelperUI(noteInput, index, dialog), TIMING.HELPER_UI_DELAY);
      }
    });
  }

  // ==========================================
  // トグルボタン注入
  // ==========================================
  function injectToggleButton(dialog) {
    if (!dialog) return;
    const toggleBtnId = 'henry-imaging-helper-toggle';
    if (dialog.querySelector('#' + toggleBtnId)) return;

    // 「内容」ヘッダー（h4）を探す（dialog内のみ）
    const h4Elements = dialog.querySelectorAll('h4');
    let contentHeader = null;
    for (const h4 of h4Elements) {
      if (h4.textContent?.includes('内容')) {
        contentHeader = h4;
        break;
      }
    }
    if (!contentHeader) return;

    // ボタンを作成
    const toggleBtn = document.createElement('button');
    toggleBtn.id = toggleBtnId;
    toggleBtn.type = 'button';
    toggleBtn.textContent = helperMode ? '標準UIに切替' : 'ヘルパーUIに切替';
    toggleBtn.style.cssText = STYLES.modeToggleButton;

    toggleBtn.addEventListener('click', () => {
      toggleHelperMode();
      toggleBtn.textContent = helperMode ? '標準UIに切替' : 'ヘルパーUIに切替';
    });

    // ヘッダーの横に挿入
    contentHeader.parentElement.appendChild(toggleBtn);
    logger.info('トグルボタンを追加しました');
  }

  // ==========================================
  // ヘルパーUI/標準UI切替
  // ==========================================
  function toggleHelperMode() {
    helperMode = !helperMode;
    logger.info(`UIモード切替: ${helperMode ? 'ヘルパーUI' : '標準UI'}`);

    // ヘルパーUIコンテナの表示/非表示
    const containers = document.querySelectorAll('.' + CONFIG.CONTAINER_CLASS);
    containers.forEach(c => {
      c.style.display = helperMode ? 'flex' : 'none';
    });

    // CSSスタイルの有効/無効切替
    const styleEl = document.getElementById('henry-imaging-helper-hide-fields');
    if (styleEl) {
      styleEl.disabled = !helperMode;
    }

    // 標準フォーム（親4）の表示/非表示（JS側で設定したstyleをリセット）
    const bodySiteEl = document.querySelector('[data-testid="BodySiteForm__FilterableSelectBox"]');
    if (bodySiteEl) {
      let parent = bodySiteEl;
      for (let i = 0; i < 4; i++) {
        parent = parent.parentElement;
        if (!parent) break;
      }
      if (parent) {
        parent.style.display = helperMode ? 'none' : '';
      }
    }

    // MDの場合、枚数・サイズの表示/非表示を切り替え
    if (currentModality === 'MD') {
      const dialog = findImagingOrderDialog();
      toggleMDFields(dialog, helperMode);
    }
  }

  // ==========================================
  // ページ監視セットアップ（2段階監視）
  // ==========================================
  function setupPage(cleaner) {
    let modalObserver = null;
    let currentDialog = null;  // 現在監視中のダイアログを保持

    // 監視開始処理を共通化
    const startObserving = (dialog) => {
      // 二重起動防止: 既存の監視があれば切断
      if (modalObserver) {
        modalObserver.disconnect();
      }

      logger.info('Stage 2 Observer開始（照射オーダーモーダル検出）');
      const debouncedProcess = debounce(() => processModalContent(), TIMING.DEBOUNCE_DELAY);
      modalObserver = new MutationObserver(debouncedProcess);
      modalObserver.observe(dialog, { childList: true, subtree: true });
      currentDialog = dialog;
      processModalContent();  // 初回は即時実行
    };

    // Stage 1: body監視（照射オーダーモーダルの存在チェック）
    const bodyObserver = new MutationObserver(() => {
      // すでに監視中のダイアログがDOMに存在しているなら、何もしない（高速リターン）
      if (currentDialog && currentDialog.isConnected) {
        return;
      }

      // ここより下は「ダイアログが閉じた」または「新規に開かれた」場合のみ実行
      const dialog = findImagingOrderDialog();

      if (!dialog) {
        // モーダルが閉じたらStage 2を停止
        if (modalObserver) {
          modalObserver.disconnect();
          modalObserver = null;
          currentDialog = null;
          logger.info('Stage 2 Observer停止（モーダル閉）');
        }
        return;
      }

      // ダイアログが見つかった（新規に開かれた）
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
    cleaner.add(() => {
      removeAllUI();
      modalityChangeCallbacks = [];
      currentModality = '';
    });

    // 初回チェック（ページロード時に既にモーダルが開いている場合に対応）
    const initialDialog = findImagingOrderDialog();
    if (initialDialog) {
      startObserving(initialDialog);
    }
  }

  // ==========================================
  // 全UI削除
  // ==========================================
  function removeAllUI() {
    const containers = document.querySelectorAll('.' + CONFIG.CONTAINER_CLASS);
    containers.forEach(c => c.remove());
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
  // モダリティに応じたデータ取得
  // ==========================================
  function getDataForModality(modality) {
    switch (modality) {
      case 'XP': return XP_DATA;
      case 'CT': return CT_DATA;
      case 'MRI': return MRI_DATA;
      default: return null;
    }
  }

  // ==========================================
  // 方向から枚数を計算（両〇〇、前後屈は2枚）
  // ==========================================
  function calculateFilmCount(directions) {
    let count = 0;
    directions.forEach(dir => {
      if (dir.startsWith('両') || dir === '前後屈') {
        count += 2;
      } else {
        count += 1;
      }
    });
    return count;
  }

  // ==========================================
  // フォーム要素検出（findInAncestorsを使用）
  // ==========================================
  const findFilmCountInput = (noteInput) =>
    findInAncestors(noteInput, 'input[name*="filmCount"]');

  const findBodySiteSelectBox = (noteInput) =>
    findInAncestors(noteInput, '[data-testid="BodySiteForm__FilterableSelectBox"]');

  const findLateralitySelect = (noteInput) =>
    findInAncestors(noteInput, 'select[name*="laterality"]');

  const findConfigurationInput = (noteInput) =>
    findInAncestors(noteInput, 'input[name*="configuration"]');

  // 側性のマッピング（ヘルパーUI → 元フォーム）
  const LATERALITY_MAP = {
    '右': 'UNILATERAL_RIGHT',
    '左': 'UNILATERAL_LEFT',
    '両': 'BILATERAL'
  };

  // ==========================================
  // FilterableSelectBoxに値を入力（React Fiber方式）
  // NOTE: __reactFiber$ を直接操作するため、Henry側のReactバージョンアップや
  //       コンポーネント構造変更で動作しなくなる可能性あり（技術的負債）
  //       HenryのFilterableSelectBoxに公式APIがないため、現状この方式が必要
  // ==========================================
  async function setFilterableSelectBoxValue(selectBox, value) {
    if (!selectBox || !value) return false;

    try {
      // React Fiberキーを動的に取得
      const fiberKey = Object.keys(selectBox).find(k => k.startsWith('__reactFiber$'));
      if (!fiberKey) {
        logger.warn('FilterableSelectBox: React Fiberが見つかりません');
        return false;
      }

      // 親を辿ってonChangeとsearchHandlerを持つコンポーネントを探す
      let target = selectBox[fiberKey]?.return;
      for (let i = 0; i < DOM_SEARCH.MAX_ANCESTOR_DEPTH && target; i++) {
        if (target.memoizedProps?.onChange && target.memoizedProps?.searchHandler) {
          break;
        }
        target = target.return;
      }

      if (!target?.memoizedProps?.onChange || !target?.memoizedProps?.searchHandler) {
        logger.warn('FilterableSelectBox: onChange/searchHandlerが見つかりません');
        return false;
      }

      const { searchHandler, onChange } = target.memoizedProps;

      // 値を検索
      const results = await searchHandler(value);
      const option = results?.find(r => r.label === value);

      if (option) {
        onChange(option);
        logger.info(`FilterableSelectBox: "${value}" を設定成功`);
        return true;
      } else {
        logger.warn(`FilterableSelectBox: "${value}" が選択肢にありません`);
        return false;
      }
    } catch (e) {
      logger.warn('FilterableSelectBox: エラー', e.message);
      return false;  // 静かに失敗
    }
  }

  // ==========================================
  // 体位を設定（React Fiber方式 - 親コンポーネント経由）
  // NOTE: 同上。__reactFiber$ への依存は技術的負債
  // ==========================================
  async function setBodyPosition(chipInput, positionCode) {
    if (!chipInput || !positionCode) return false;

    try {
      const fiberKey = Object.keys(chipInput).find(k => k.startsWith('__reactFiber$'));
      if (!fiberKey) {
        logger.warn('体位設定: React Fiberが見つかりません');
        return false;
      }

      // 親を辿ってbodyPositionsとonChangeを持つコンポーネントを探す
      let fiber = chipInput[fiberKey];
      let target = fiber?.return;
      let formComponent = null;

      for (let i = 0; i < DOM_SEARCH.MAX_FIBER_DEPTH && target; i++) {
        const props = target.memoizedProps;
        if (props?.bodyPositions !== undefined && props?.onChange) {
          formComponent = target;
          break;
        }
        target = target.return;
      }

      if (!formComponent?.memoizedProps?.onChange) {
        logger.warn('体位設定: 親コンポーネントが見つかりません');
        return false;
      }

      // alternateがあれば最新の状態を使う（React Concurrent Mode対策）
      const currentFiber = formComponent.alternate || formComponent;
      const onChange = currentFiber.memoizedProps?.onChange || formComponent.memoizedProps.onChange;

      // onChangeを呼ぶ
      onChange([positionCode]);

      // 強制的にinputイベントを発火してReactに通知
      chipInput.dispatchEvent(new Event('input', { bubbles: true }));
      chipInput.dispatchEvent(new Event('change', { bubbles: true }));

      logger.info(`体位設定: "${positionCode}" を設定成功`);
      return true;
    } catch (e) {
      logger.warn('体位設定: エラー', e.message);
      return false;
    }
  }

  // ==========================================
  // 体位を「任意」に設定（単純撮影・骨塩定量のとき）
  // 全ての内容の体位フィールドに対して設定
  // ==========================================
  async function setBodyPositionToArbitrary(dialog) {
    if (!dialog) dialog = findImagingOrderDialog();
    if (!dialog) return;
    logger.info('体位設定: 開始');

    // DOMの準備を待つ
    await new Promise(r => setTimeout(r, TIMING.DOM_READY_WAIT));

    // 全ての体位フィールドを取得（dialog内のみ）
    const allChipInputs = dialog.querySelectorAll('[data-testid="BodyPositionForm__ChipInput"]');
    logger.info(`体位設定: ${allChipInputs.length}個のChipInputを検出`);

    if (allChipInputs.length === 0) {
      logger.warn('体位設定: ChipInputが見つかりません');
      return;
    }

    // 各体位フィールドに対して設定
    for (let i = 0; i < allChipInputs.length; i++) {
      const chipInput = allChipInputs[i];
      const result = await setBodyPosition(chipInput, 'BODY_POSITION_ANY');
      logger.info(`体位設定: 内容${i + 1} 結果 =`, result);
    }
  }

  // ==========================================
  // 部位を「前腕」に設定（骨塩定量検査のとき）
  // ==========================================
  async function setBodySiteToForearm(dialog) {
    if (!dialog) dialog = findImagingOrderDialog();
    if (!dialog) return;
    logger.info('部位設定(MD): 開始');

    // DOMの準備を待つ
    await new Promise(r => setTimeout(r, TIMING.DOM_READY_WAIT));

    const bodySiteSelectBox = dialog.querySelector('[data-testid="BodySiteForm__FilterableSelectBox"]');
    logger.info('部位設定(MD): SelectBox =', !!bodySiteSelectBox);

    if (!bodySiteSelectBox) {
      logger.warn('部位設定(MD): SelectBoxが見つかりません');
      return;
    }

    const result = await setFilterableSelectBoxValue(bodySiteSelectBox, '前腕');
    logger.info('部位設定(MD): 結果 =', result);
  }

  // ==========================================
  // 骨塩定量用：枚数・サイズフィールドを非表示/表示
  // ==========================================

  // NOTE: 親要素にdata-testid等の安定したセレクタがないため、
  //       depth（階層）を数えて親を辿る方式を採用。
  //       Henry側に安定したセレクタが追加されればclosest()に変更可能。
  function toggleMDFields(dialog, hide) {
    if (!dialog) dialog = findImagingOrderDialog();
    if (!dialog) return;

    const labels = dialog.querySelectorAll('label');
    labels.forEach(label => {
      const text = label.textContent.trim();
      if (text === '枚数' || text === 'サイズ') {
        // 親要素を辿ってフォームグループを探す（depth 4: 非表示対象）
        let depth4 = label.parentElement;
        for (let i = 0; i < 3 && depth4; i++) {
          depth4 = depth4.parentElement;
        }
        // depth 5: margin-topを持つ親
        const depth5 = depth4?.parentElement;

        if (depth4) {
          depth4.style.setProperty('display', hide ? 'none' : '', 'important');
        }
        if (depth5) {
          depth5.style.setProperty('margin-top', hide ? '0' : '', 'important');
        }
      }
    });
  }

  // ==========================================
  // 自動入力フィールド（部位・体位・枚数・撮影条件）を非表示にする
  // 空白スペース対策: 親4（margin-top: 16px）もJSで非表示にする
  // ==========================================
  function hideAutoFilledFields(dialog) {
    if (!dialog) dialog = findImagingOrderDialog();
    if (!dialog) return;

    const styleId = 'henry-imaging-helper-hide-fields';

    // CSS追加（まだなければ）
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* 親4（margin-top: 16pxのコンテナ）を非表示にする */
        /* 構造: 親4 > 親3 > 親2 > 親1 > BodySiteForm */
        div:has(> div > div > div > [data-testid="BodySiteForm__FilterableSelectBox"]) {
          display: none !important;
        }
        /* 撮影条件フォームを非表示 */
        div:has(> div > div > input[name*="configuration"]) {
          display: none !important;
        }
        /* 骨塩定量(MD)の場合、枚数・サイズを即座に非表示（ちらつき防止） */
        /* NOTE: サイズのSELECTにはname属性がないため、+ div（兄弟セレクタ）で選択。 */
        /*       Henry側に安定したセレクタが追加されれば個別指定に変更可能。 */
        [data-modality="MD"] div:has(> div > div > input[name*="filmCount"]),
        [data-modality="MD"] div:has(> div > div > input[name*="filmCount"]) + div {
          display: none !important;
          margin-top: 0 !important;
        }
      `;
      document.head.appendChild(style);
      logger.info('フィールド非表示CSS: 適用完了');
    }

    // JS側でも親要素を非表示にする（CSSが効かない場合のフォールバック）
    const hideBodySiteParent = () => {
      const bodySiteEl = dialog.querySelector('[data-testid="BodySiteForm__FilterableSelectBox"]');
      if (!bodySiteEl) return false;

      let parent = bodySiteEl;
      for (let i = 0; i < DOM_SEARCH.BODY_SITE_PARENT_DEPTH; i++) {
        parent = parent.parentElement;
        if (!parent) return false;
      }

      if (parent.style.display !== 'none') {
        parent.style.display = 'none';
        logger.info('フィールド非表示JS: 親4を非表示にしました');
      }
      return true;
    };

    // 即座に実行を試みる
    if (hideBodySiteParent()) return;

    // まだなければMutationObserverで監視（dialog内のみ）
    const observer = new MutationObserver(() => {
      if (hideBodySiteParent()) {
        observer.disconnect();
      }
    });
    observer.observe(dialog, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), TIMING.OBSERVER_TIMEOUT);
  }

  // ==========================================
  // UI構築ヘルパー関数
  // ==========================================

  /**
   * 骨塩定量用の測定部位行を作成
   * @param {Function} onSelect - 選択時のコールバック (forearm: string) => void
   * @returns {{ row: HTMLElement, buttonsContainer: HTMLElement }}
   */
  function createMDRow(onSelect) {
    const row = document.createElement('div');
    row.style.cssText = STYLES.rowHidden;

    const label = document.createElement('span');
    label.textContent = '測定部位:';
    label.style.cssText = STYLES.label;
    row.appendChild(label);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = STYLES.buttonGroup;

    ['右前腕', '左前腕'].forEach(forearm => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = forearm;
      btn.dataset.forearm = forearm;
      btn.style.cssText = STYLES.toggleButton;

      btn.addEventListener('click', () => {
        clearButtonSelection(buttonsContainer);
        setButtonSelected(btn, true);
        onSelect(forearm);
      });

      buttonsContainer.appendChild(btn);
    });

    row.appendChild(buttonsContainer);
    return { row, buttonsContainer };
  }

  /**
   * 大分類・小分類・側性・サブアイテムのセレクト行を作成
   * @returns {{ row: HTMLElement, majorSelect: HTMLSelectElement, minorSelect: HTMLSelectElement, lateralitySelect: HTMLSelectElement, subItemSelect: HTMLSelectElement }}
   */
  function createSelectionRow() {
    const row = document.createElement('div');
    row.style.cssText = STYLES.row + 'flex-wrap: wrap;';

    const majorSelect = createSelect('大分類');
    const minorSelect = createSelect('小分類', true);

    const lateralitySelect = createSelect('側性', true);
    lateralitySelect.innerHTML = `
      <option value="">側性</option>
      <option value="右">右</option>
      <option value="左">左</option>
      <option value="両">両</option>
    `;
    lateralitySelect.style.display = 'none';

    const subItemSelect = createSelect('指/趾', true);
    subItemSelect.style.display = 'none';

    row.appendChild(majorSelect);
    row.appendChild(minorSelect);
    row.appendChild(lateralitySelect);
    row.appendChild(subItemSelect);

    return { row, majorSelect, minorSelect, lateralitySelect, subItemSelect };
  }

  /**
   * 方向ボタン行を作成
   * @returns {{ row: HTMLElement, buttonsContainer: HTMLElement }}
   */
  function createDirectionRow() {
    const row = document.createElement('div');
    row.style.cssText = `
      display: none;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px solid var(--henry-border, #e0e0e0);
    `;

    const label = document.createElement('span');
    label.textContent = '方向:';
    label.style.cssText = STYLES.label + 'margin-right: 4px;';
    row.appendChild(label);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = STYLES.flexWrap;
    row.appendChild(buttonsContainer);

    return { row, buttonsContainer };
  }

  /**
   * 関節選択ラジオボタン行を作成
   * @returns {{ row: HTMLElement, radiosContainer: HTMLElement }}
   */
  function createJointRow() {
    const row = document.createElement('div');
    row.style.cssText = `
      display: none;
      align-items: center;
      gap: 12px;
      padding-top: 8px;
    `;

    const label = document.createElement('span');
    label.textContent = '関節:';
    label.style.cssText = STYLES.label;
    row.appendChild(label);

    const radiosContainer = document.createElement('div');
    radiosContainer.style.cssText = 'display: flex; gap: 12px;';
    row.appendChild(radiosContainer);

    return { row, radiosContainer };
  }

  // ==========================================
  // ヘルパーUI注入（各補足欄ごと）
  // ==========================================
  function injectHelperUI(noteInput, index, dialog) {
    if (noteInput.dataset.hasHelperUI) return;
    if (!dialog) dialog = findImagingOrderDialog();
    noteInput.dataset.hasHelperUI = 'true';

    logger.info(`ヘルパーUI ${index + 1} を注入します`);

    // 各入力欄を探す
    const filmCountInput = findFilmCountInput(noteInput);
    const bodySiteSelectBox = findBodySiteSelectBox(noteInput);
    const configurationInput = findConfigurationInput(noteInput);

    if (filmCountInput) logger.info(`UI ${index + 1}: 枚数欄を検出`);
    if (bodySiteSelectBox) logger.info(`UI ${index + 1}: 部位欄を検出`);
    if (configurationInput) logger.info(`UI ${index + 1}: 撮影条件欄を検出`);

    let state = {
      modality: currentModality,
      major: '',
      minor: '',
      laterality: '',    // 側性（右/左/両）
      subItem: '',       // 指/趾の選択
      joint: '指定なし', // 関節の選択
      directions: [],
      minorData: null,   // 小分類の詳細データ（bodySite, defaultCondition等）
      mdForearm: ''      // 骨塩定量用：右前腕/左前腕
    };

    // --- コンテナ ---
    const container = document.createElement('div');
    container.className = CONFIG.CONTAINER_CLASS;
    container.dataset.index = index;
    container.style.cssText = STYLES.container;

    // --- UI構築（ヘルパー関数を使用） ---
    const { row: rowMD, buttonsContainer: mdButtonsContainer } = createMDRow((forearm) => {
      state.mdForearm = forearm;
      setNativeValue(noteInput, forearm);

      // 側性を設定（「右前腕」→「右」、「左前腕」→「左」）
      const laterality = forearm.startsWith('右') ? '右' : '左';
      const currentLateralitySelect = findLateralitySelect(noteInput);
      const mappedValue = LATERALITY_MAP[laterality];
      if (currentLateralitySelect && mappedValue) {
        currentLateralitySelect.value = mappedValue;
        currentLateralitySelect.dispatchEvent(new Event('change', { bubbles: true }));
        logger.info(`UI ${index + 1}: 元フォーム側性(MD)を ${mappedValue} に設定`);
      }

      // 枚数を1に設定
      if (filmCountInput) {
        setNativeValue(filmCountInput, '1');
        logger.info(`UI ${index + 1}: 枚数(MD)を 1 に設定`);
      }
    });

    const { row: row1, majorSelect, minorSelect, lateralitySelect, subItemSelect } = createSelectionRow();
    const { row: row2, buttonsContainer: directionButtonsContainer } = createDirectionRow();
    const { row: row3, radiosContainer: jointRadiosContainer } = createJointRow();

    container.appendChild(rowMD);
    container.appendChild(row1);
    container.appendChild(row2);
    container.appendChild(row3);

    // --- ロジック関数 ---
    const updateNoteInput = () => {
      if (!state.minor) {
        setNativeValue(noteInput, '');
        return;
      }

      // 出力名を決定（subItemがあればそれを使う）
      let displayName = state.subItem || state.minor;

      // 側性がある場合は先頭に追加
      if (state.laterality) {
        displayName = state.laterality + displayName;
      }

      // 関節指定がある場合は括弧付きで追加
      if (state.joint && state.joint !== '指定なし') {
        displayName += `（${state.joint}）`;
      }

      let value = displayName;
      if (state.directions.length > 0) {
        value += '　' + state.directions.join('・');
      }
      setNativeValue(noteInput, value);

      // XPの場合のみ枚数と撮影条件を更新
      if (state.modality === 'XP' && state.minorData) {
        // 枚数を更新（方向が選択されている場合のみ）
        if (filmCountInput && state.directions.length > 0) {
          let count = calculateFilmCount(state.directions);
          // 「両」の場合は2倍
          if (state.laterality === '両') {
            count *= 2;
          }
          setNativeValue(filmCountInput, String(count));
          logger.info(`UI ${index + 1}: 枚数を ${count} に設定`);
        }

        // 撮影条件を更新（ポータブルなど方向に応じて切り替え）
        if (configurationInput && state.directions.length > 0) {
          let condition = state.minorData.defaultCondition;
          // conditionByDirectionがある場合、選択された方向に応じて切り替え
          if (state.minorData.conditionByDirection) {
            for (const dir of state.directions) {
              if (state.minorData.conditionByDirection[dir]) {
                condition = state.minorData.conditionByDirection[dir];
                break;  // 最初に見つかったものを使用
              }
            }
          }
          setNativeValue(configurationInput, condition);
          logger.info(`UI ${index + 1}: 撮影条件を ${condition} に設定`);
        }
      }
    };

    // 部位を自動入力
    const updateBodySite = async () => {
      if (!bodySiteSelectBox || !state.minorData?.bodySite) return;
      await setFilterableSelectBoxValue(bodySiteSelectBox, state.minorData.bodySite);
      logger.info(`UI ${index + 1}: 部位を ${state.minorData.bodySite} に設定`);
    };

    const renderDirectionButtons = (directions) => {
      directionButtonsContainer.innerHTML = '';
      state.directions = [];

      if (!directions || directions.length === 0) {
        row2.style.display = 'none';
        return;
      }

      row2.style.display = 'flex';
      const isExclusive = state.minorData?.exclusiveDirections === true;

      directions.forEach(dir => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = dir;
        btn.dataset.direction = dir;
        btn.style.cssText = STYLES.toggleButton;

        btn.addEventListener('click', () => {
          const isSelected = btn.dataset.selected === 'true';
          if (isSelected) {
            setButtonSelected(btn, false);
            state.directions = state.directions.filter(d => d !== dir);
          } else {
            if (isExclusive) {
              clearButtonSelection(directionButtonsContainer);
              state.directions = [];
            }
            setButtonSelected(btn, true);
            state.directions.push(dir);
          }
          updateNoteInput();
        });

        directionButtonsContainer.appendChild(btn);
      });
    };

    // サブアイテム（指/趾）ドロップダウンを更新
    const populateSubItemSelect = (subItems, placeholder) => {
      subItemSelect.innerHTML = `<option value="">${placeholder}</option>`;
      if (!subItems || Object.keys(subItems).length === 0) {
        subItemSelect.style.display = 'none';
        subItemSelect.disabled = true;
        updateAllSelectBorders();
        return;
      }
      Object.keys(subItems).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        subItemSelect.appendChild(opt);
      });
      subItemSelect.style.display = 'block';
      subItemSelect.disabled = false;
      updateAllSelectBorders();
    };

    // 関節ラジオボタンを描画
    const renderJointRadios = (joints, showJointSelector) => {
      jointRadiosContainer.innerHTML = '';
      state.joint = '指定なし';

      // 表示しない条件：jointsがない、または showJointSelector === false
      if (!joints || joints.length === 0 || showJointSelector === false) {
        row3.style.display = 'none';
        return;
      }

      row3.style.display = 'flex';

      joints.forEach((joint, idx) => {
        const label = document.createElement('label');
        label.style.cssText = `
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 13px;
          color: var(--henry-text-high, #333);
        `;

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `joint-${index}`;
        radio.value = joint;
        radio.checked = idx === 0; // 最初（指定なし）がデフォルト

        radio.addEventListener('change', () => {
          state.joint = joint;
          updateNoteInput();
        });

        label.appendChild(radio);
        label.appendChild(document.createTextNode(joint));
        jointRadiosContainer.appendChild(label);
      });
    };

    const populateMajorSelect = (data) => {
      majorSelect.innerHTML = '<option value="">大分類</option>';
      Object.keys(data).forEach(major => {
        const opt = document.createElement('option');
        opt.value = major;
        opt.textContent = major;
        majorSelect.appendChild(opt);
      });
      majorSelect.disabled = false;
      updateAllSelectBorders();
    };

    const populateMinorSelect = (items) => {
      minorSelect.innerHTML = '<option value="">小分類</option>';
      Object.keys(items).forEach(minor => {
        const opt = document.createElement('option');
        opt.value = minor;
        opt.textContent = minor;
        minorSelect.appendChild(opt);
      });
      minorSelect.disabled = false;
      updateAllSelectBorders();
    };

    // 方向・関節行をリセット（共通処理）
    const resetDirectionAndJointRows = () => {
      row2.style.display = 'none';
      row3.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
      jointRadiosContainer.innerHTML = '';
    };

    // 下位セレクト（minor以下）をリセット
    const resetChildSelects = () => {
      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      lateralitySelect.selectedIndex = 0;
      lateralitySelect.style.display = 'none';
      lateralitySelect.disabled = true;
      subItemSelect.innerHTML = '<option value="">指/趾</option>';
      subItemSelect.style.display = 'none';
      subItemSelect.disabled = true;
    };

    const resetUI = () => {
      state.major = '';
      state.minor = '';
      state.laterality = '';
      state.subItem = '';
      state.joint = '指定なし';
      state.directions = [];
      state.minorData = null;
      state.mdForearm = '';
      majorSelect.innerHTML = '<option value="">大分類</option>';
      majorSelect.disabled = true;
      resetChildSelects();
      rowMD.style.display = 'none';
      row1.style.display = 'flex';
      resetDirectionAndJointRows();
      clearButtonSelection(mdButtonsContainer);
      updateAllSelectBorders();
    };

    // すべてのセレクトボックスの枠色を更新
    const updateAllSelectBorders = () => {
      updateSelectBorder(majorSelect);
      updateSelectBorder(minorSelect);
      updateSelectBorder(lateralitySelect);
      updateSelectBorder(subItemSelect);
    };

    const handleModalityChange = (modality) => {
      state.modality = modality;
      resetUI();

      if (!modality) {
        container.style.display = 'none';
        return;
      }

      // 標準UIモードの場合はヘルパーUIを表示しない
      if (!helperMode) {
        container.style.display = 'none';
        return;
      }

      // 骨塩定量の場合は専用UIを表示
      if (modality === 'MD') {
        container.style.display = 'flex';
        rowMD.style.display = 'flex';
        row1.style.display = 'none';
        return;
      }

      const data = getDataForModality(modality);
      if (data) {
        container.style.display = 'flex';
        populateMajorSelect(data);
      }
    };

    // モダリティ変更コールバックを登録
    modalityChangeCallbacks.push(handleModalityChange);

    // --- イベントハンドラ ---
    majorSelect.addEventListener('change', () => {
      const major = majorSelect.value;
      state.major = major;
      state.minor = '';
      state.laterality = '';
      state.subItem = '';
      state.joint = '指定なし';
      state.directions = [];
      state.minorData = null;

      resetChildSelects();
      resetDirectionAndJointRows();

      // 枚数と撮影条件を空欄にする
      if (filmCountInput) setNativeValue(filmCountInput, '');
      if (configurationInput) setNativeValue(configurationInput, '');

      if (!major) {
        updateNoteInput();
        updateAllSelectBorders();
        return;
      }

      // 上肢・下肢の場合は側性ドロップダウンを表示
      if (major === '上肢' || major === '下肢') {
        lateralitySelect.style.display = 'block';
        lateralitySelect.disabled = false;
      }

      const data = getDataForModality(state.modality);
      if (data && data[major]) {
        populateMinorSelect(data[major]);
      }
      updateNoteInput();
      updateAllSelectBorders();
    });

    lateralitySelect.addEventListener('change', () => {
      state.laterality = lateralitySelect.value;
      // 元フォームの側性にも値を設定（動的に出現するので都度検出）
      if (state.laterality) {
        const currentLateralitySelect = findLateralitySelect(noteInput);
        const mappedValue = LATERALITY_MAP[state.laterality];
        if (currentLateralitySelect && mappedValue) {
          currentLateralitySelect.value = mappedValue;
          currentLateralitySelect.dispatchEvent(new Event('change', { bubbles: true }));
          logger.info(`UI ${index + 1}: 元フォーム側性を ${mappedValue} に設定`);
        }
      }
      // 枚数を再計算
      if (filmCountInput && state.directions.length > 0) {
        let count = calculateFilmCount(state.directions);
        if (state.laterality === '両') {
          count *= 2;
        }
        setNativeValue(filmCountInput, String(count));
      }
      updateNoteInput();
      updateAllSelectBorders();
    });

    minorSelect.addEventListener('change', async () => {
      const minor = minorSelect.value;
      state.minor = minor;
      state.subItem = '';
      state.joint = '指定なし';
      state.directions = [];
      state.minorData = null;

      // 枚数と撮影条件を空欄にする
      if (filmCountInput) setNativeValue(filmCountInput, '');
      if (configurationInput) setNativeValue(configurationInput, '');

      // サブアイテム・関節・方向をリセット
      subItemSelect.style.display = 'none';
      subItemSelect.disabled = true;
      resetDirectionAndJointRows();

      if (!minor) {
        updateNoteInput();
        updateAllSelectBorders();
        return;
      }

      const data = getDataForModality(state.modality);
      if (data && data[state.major] && data[state.major][minor]) {
        state.minorData = data[state.major][minor];

        // subItemsがある場合（手指・足趾）
        if (state.minorData.subItems) {
          const placeholder = minor === '手指' ? '指を選択' : '趾を選択';
          populateSubItemSelect(state.minorData.subItems, placeholder);
          // 方向ボタンは非表示のまま（subItem選択後に表示）
        } else {
          // subItemsがない場合は従来通り
          renderDirectionButtons(state.minorData.directions || []);
        }

        // 部位を自動入力
        await updateBodySite();

        // XPの場合、デフォルトの撮影条件を入力
        if (state.modality === 'XP' && configurationInput && state.minorData.defaultCondition) {
          setNativeValue(configurationInput, state.minorData.defaultCondition);
          logger.info(`UI ${index + 1}: 撮影条件（初期）を ${state.minorData.defaultCondition} に設定`);
        }
      }
      updateNoteInput();
      updateAllSelectBorders();
    });

    // サブアイテム（指/趾）選択時
    subItemSelect.addEventListener('change', () => {
      const subItem = subItemSelect.value;
      state.subItem = subItem;
      state.joint = '指定なし';
      state.directions = [];

      // 枚数を空欄にする
      if (filmCountInput) setNativeValue(filmCountInput, '');

      resetDirectionAndJointRows();

      if (!subItem || !state.minorData?.subItems) {
        updateNoteInput();
        updateAllSelectBorders();
        return;
      }

      const subItemData = state.minorData.subItems[subItem];
      if (subItemData) {
        // 方向ボタンを描画
        renderDirectionButtons(subItemData.directions || state.minorData.directions || []);

        // 関節ラジオボタンを描画（showJointSelector !== false の場合）
        if (state.minorData.joints && subItemData.showJointSelector !== false) {
          renderJointRadios(state.minorData.joints, subItemData.showJointSelector);
        }
      }
      updateNoteInput();
      updateAllSelectBorders();
    });

    // --- DOM挿入（補足フォームグループの上） ---
    // 「補足」ラベルを含むフォームグループを探す
    let formGroup = noteInput.closest('div[class*="sc-d2f77e68"]');
    if (!formGroup) {
      formGroup = noteInput.parentElement?.parentElement;
    }
    if (formGroup && formGroup.parentElement) {
      formGroup.parentElement.insertBefore(container, formGroup);
      logger.info(`UI ${index + 1} をDOM挿入完了`);
    } else {
      logger.warn(`UI ${index + 1} の挿入位置が見つかりません`);
    }

    // 初期状態でモダリティが選択済みの場合（モーダルを開いた時点で選択されている）
    const modalitySelect = dialog?.querySelector(CONFIG.MODALITY_SELECTOR);
    if (modalitySelect) {
      const initialModality = MODALITY_MAP[modalitySelect.value] || '';
      logger.info(`UI ${index + 1} 初期モダリティ: ${initialModality}`);
      if (initialModality) {
        handleModalityChange(initialModality);
      }
      // XP/MDなら体位を「任意」に設定
      if (initialModality === 'XP' || initialModality === 'MD') {
        setBodyPositionToArbitrary();
      }
    }
  }

  // ==========================================
  // ユーティリティ: セレクト作成
  // ==========================================
  const EMPTY_BORDER_COLOR = '#f5a623';  // 未入力時のオレンジ
  const NORMAL_BORDER_COLOR = 'var(--henry-border, #ccc)';  // 通常時

  function createSelect(placeholder, initiallyDisabled = false) {
    const select = document.createElement('select');
    const initialBorder = initiallyDisabled ? NORMAL_BORDER_COLOR : EMPTY_BORDER_COLOR;
    select.style.cssText = STYLES.select + `border: 1px solid ${initialBorder};`;
    select.disabled = initiallyDisabled;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.appendChild(opt);

    // 値が変更されたら枠の色を更新
    select.addEventListener('change', () => {
      updateSelectBorder(select);
    });

    return select;
  }

  // セレクトボックスの枠色を更新
  function updateSelectBorder(select) {
    // disabled の場合は通常色
    if (select.disabled) {
      select.style.borderColor = NORMAL_BORDER_COLOR;
    } else if (select.value) {
      select.style.borderColor = NORMAL_BORDER_COLOR;
    } else {
      select.style.borderColor = EMPTY_BORDER_COLOR;
    }
  }

  init();
})();
