// ==UserScript==
// @name         画像オーダー入力支援
// @namespace    https://henry-app.jp/
// @version      1.14.2
// @description  画像照射オーダーモーダルに部位・方向選択UIを追加（複数内容対応）
// @author       Henry UI Lab
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_order_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_order_helper.user.js
// ==/UserScript==

(function() {
  'use strict';

  const CONFIG = {
    SCRIPT_NAME: 'ImagingOrderHelper',
    MODALITY_SELECTOR: 'select[aria-label="モダリティ"]',
    CONTAINER_CLASS: 'henry-imaging-helper-container'
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
  // メイン処理
  // ==========================================
  async function init() {
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
    const cleaner = utils.createCleaner();

    logger.info('スクリプト初期化 (v1.14.2)');

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
  function findNoteInputs() {
    const noteInputs = [];
    // 「補足」というテキストを持つlabelを探す
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      if (label.textContent.trim() === '補足') {
        // labelの親を辿ってフォームグループ全体を探す
        // 構造: div.sc-d2f77e68-0 > div.sc-d2f77e68-1 > label
        //                        > div.sc-e5e4d707-0 > input
        let parent = label.parentElement;
        // 2階層上まで探す
        for (let i = 0; i < 3 && parent; i++) {
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
  // 照射オーダーモーダルかどうかをチェック
  // ==========================================
  function isImagingOrderModal() {
    const h2Elements = document.querySelectorAll('h2');
    for (const h2 of h2Elements) {
      const text = h2.textContent || '';
      if (text === '外来 照射オーダー' || text === '入院 照射オーダー') {
        return true;
      }
    }
    return false;
  }

  // ==========================================
  // モーダル内容の処理（モダリティ登録・補足欄検出）
  // ==========================================
  function processModalContent() {
    if (!isImagingOrderModal()) return;

    const modalitySelect = document.querySelector(CONFIG.MODALITY_SELECTOR);
    if (!modalitySelect) return;

    // モダリティ選択のイベント登録（一度だけ）
    if (!modalitySelect.dataset.hasModalityListener) {
      modalitySelect.dataset.hasModalityListener = 'true';
      modalitySelect.addEventListener('change', async () => {
        const modalityValue = modalitySelect.value;
        currentModality = MODALITY_MAP[modalityValue] || '';
        logger.info(`モダリティ変更: ${currentModality}`);
        modalityChangeCallbacks.forEach(cb => cb(currentModality));
        hideAutoFilledFields();
        if (currentModality === 'XP' || currentModality === 'MD') {
          await setBodyPositionToArbitrary();
        }
        if (currentModality === 'MD') {
          await setBodySiteToForearm();
        }
      });

      // 初期値を設定
      currentModality = MODALITY_MAP[modalitySelect.value] || '';
      logger.info(`初期モダリティ: ${currentModality}`);
      hideAutoFilledFields();
      if (currentModality === 'XP' || currentModality === 'MD') {
        setBodyPositionToArbitrary();
      }
      if (currentModality === 'MD') {
        setBodySiteToForearm();
      }
    }

    // トグルボタンを追加（まだなければ）
    injectToggleButton();

    // 「補足」ラベルを持つフォームグループ内のinputを検出
    const noteInputs = findNoteInputs();
    noteInputs.forEach((noteInput, index) => {
      if (!noteInput.dataset.hasHelperUI) {
        logger.info(`補足欄 ${index + 1} を検出 (name=${noteInput.name})`);
        setTimeout(() => injectHelperUI(noteInput, index), 50);
      }
    });
  }

  // ==========================================
  // トグルボタン注入
  // ==========================================
  function injectToggleButton() {
    const toggleBtnId = 'henry-imaging-helper-toggle';
    if (document.getElementById(toggleBtnId)) return;

    // 「内容」ヘッダー（h4）を探す
    const h4Elements = document.querySelectorAll('h4');
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
    toggleBtn.style.cssText = `
      margin-left: 12px;
      padding: 4px 12px;
      font-size: 12px;
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      background: var(--henry-bg-base, #fff);
      color: var(--henry-text-medium, #666);
      cursor: pointer;
    `;

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
  }

  // ==========================================
  // ページ監視セットアップ
  // ==========================================
  function setupPage(cleaner) {
    const observer = new MutationObserver(() => {
      processModalContent();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    cleaner.add(() => observer.disconnect());
    cleaner.add(() => {
      removeAllUI();
      modalityChangeCallbacks = [];
      currentModality = '';
    });

    // 初回チェック
    processModalContent();
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
  // 「枚数」入力欄を検出（補足欄と同じ内容セクション内）
  // ==========================================
  function findFilmCountInput(noteInput) {
    // 補足欄から親を辿って「内容」セクション全体を探す
    let parent = noteInput;
    for (let i = 0; i < 10 && parent; i++) {
      // filmCount を含む input を探す
      const filmCountInput = parent.querySelector('input[name*="filmCount"]');
      if (filmCountInput) {
        return filmCountInput;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  // ==========================================
  // 「部位」FilterableSelectBoxを検出
  // ==========================================
  function findBodySiteSelectBox(noteInput) {
    let parent = noteInput;
    for (let i = 0; i < 10 && parent; i++) {
      const selectBox = parent.querySelector('[data-testid="BodySiteForm__FilterableSelectBox"]');
      if (selectBox) {
        return selectBox;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  // ==========================================
  // 「撮影条件」入力欄を検出
  // ==========================================
  function findConfigurationInput(noteInput) {
    let parent = noteInput;
    for (let i = 0; i < 10 && parent; i++) {
      const configInput = parent.querySelector('input[name*="configuration"]');
      if (configInput) {
        return configInput;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  // ==========================================
  // FilterableSelectBoxに値を入力（React Fiber方式）
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
      for (let i = 0; i < 10 && target; i++) {
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
      let target = chipInput[fiberKey]?.return;
      for (let i = 0; i < 15 && target; i++) {
        const props = target.memoizedProps;
        if (props?.bodyPositions !== undefined && props?.onChange) {
          break;
        }
        target = target.return;
      }

      if (!target?.memoizedProps?.onChange) {
        logger.warn('体位設定: 親コンポーネントが見つかりません');
        return false;
      }

      // 親コンポーネントのonChangeを直接呼ぶ
      target.memoizedProps.onChange([positionCode]);
      logger.info(`体位設定: "${positionCode}" を設定成功`);
      return true;
    } catch (e) {
      logger.warn('体位設定: エラー', e.message);
      return false;
    }
  }

  // ==========================================
  // 体位を「任意」に設定（単純撮影・骨塩定量のとき）
  // ==========================================
  async function setBodyPositionToArbitrary() {
    logger.info('体位設定: 開始');

    // DOMの準備を待つ
    await new Promise(r => setTimeout(r, 300));

    const chipInput = document.querySelector('[data-testid="BodyPositionForm__ChipInput"]');
    logger.info('体位設定: ChipInput =', !!chipInput);

    if (!chipInput) {
      logger.warn('体位設定: ChipInputが見つかりません');
      return;
    }

    const result = await setBodyPosition(chipInput, 'BODY_POSITION_ANY');
    logger.info('体位設定: 結果 =', result);
  }

  // ==========================================
  // 部位を「前腕」に設定（骨塩定量検査のとき）
  // ==========================================
  async function setBodySiteToForearm() {
    logger.info('部位設定(MD): 開始');

    // DOMの準備を待つ
    await new Promise(r => setTimeout(r, 300));

    const bodySiteSelectBox = document.querySelector('[data-testid="BodySiteForm__FilterableSelectBox"]');
    logger.info('部位設定(MD): SelectBox =', !!bodySiteSelectBox);

    if (!bodySiteSelectBox) {
      logger.warn('部位設定(MD): SelectBoxが見つかりません');
      return;
    }

    const result = await setFilterableSelectBoxValue(bodySiteSelectBox, '前腕');
    logger.info('部位設定(MD): 結果 =', result);
  }

  // ==========================================
  // 自動入力フィールド（部位・体位・枚数・撮影条件）を非表示にする
  // 空白スペース対策: 親4（margin-top: 16px）もJSで非表示にする
  // ==========================================
  function hideAutoFilledFields() {
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
      `;
      document.head.appendChild(style);
      logger.info('フィールド非表示CSS: 適用完了');
    }

    // JS側でも親4を非表示にする（CSSが効かない場合のフォールバック）
    const hideParent4 = () => {
      const bodySiteEl = document.querySelector('[data-testid="BodySiteForm__FilterableSelectBox"]');
      if (!bodySiteEl) return false;

      let parent = bodySiteEl;
      for (let i = 0; i < 4; i++) {
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
    if (hideParent4()) return;

    // まだなければMutationObserverで監視
    const modal = document.querySelector('dialog');
    if (!modal) return;

    const observer = new MutationObserver(() => {
      if (hideParent4()) {
        observer.disconnect();
      }
    });
    observer.observe(modal, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000);
  }

  // ==========================================
  // ヘルパーUI注入（各補足欄ごと）
  // ==========================================
  function injectHelperUI(noteInput, index) {
    if (noteInput.dataset.hasHelperUI) return;
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
    container.style.cssText = `
      display: none;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--henry-bg-sub, #f5f5f5);
      border-radius: var(--henry-radius, 4px);
      border: 1px solid var(--henry-border, #e0e0e0);
    `;

    // --- 行MD: 骨塩定量用（右前腕/左前腕） ---
    const rowMD = document.createElement('div');
    rowMD.style.cssText = `
      display: none;
      align-items: center;
      gap: 8px;
    `;

    const mdLabel = document.createElement('span');
    mdLabel.textContent = '測定部位:';
    mdLabel.style.cssText = `
      font-size: 13px;
      color: var(--henry-text-medium, #666);
    `;
    rowMD.appendChild(mdLabel);

    const mdButtonsContainer = document.createElement('div');
    mdButtonsContainer.style.cssText = 'display: flex; gap: 6px;';

    ['右前腕', '左前腕'].forEach(label => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.forearm = label;
      btn.style.cssText = `
        padding: 4px 16px;
        font-size: 13px;
        border: 1px solid var(--henry-border, #ccc);
        border-radius: var(--henry-radius, 4px);
        background: var(--henry-bg-base, #fff);
        color: var(--henry-text-high, #333);
        cursor: pointer;
        transition: all 0.15s;
      `;

      btn.addEventListener('click', () => {
        // 他のボタンの選択を解除
        mdButtonsContainer.querySelectorAll('button').forEach(b => {
          b.dataset.selected = 'false';
          b.style.background = 'var(--henry-bg-base, #fff)';
          b.style.borderColor = 'var(--henry-border, #ccc)';
          b.style.color = 'var(--henry-text-high, #333)';
        });
        // このボタンを選択
        btn.dataset.selected = 'true';
        btn.style.background = 'var(--henry-primary, rgb(0, 204, 146))';
        btn.style.borderColor = 'var(--henry-primary, rgb(0, 204, 146))';
        btn.style.color = '#fff';
        state.mdForearm = label;
        setNativeValue(noteInput, label);
      });

      mdButtonsContainer.appendChild(btn);
    });

    rowMD.appendChild(mdButtonsContainer);

    // --- 行1: 大分類・小分類・サブアイテムドロップダウン ---
    const row1 = document.createElement('div');
    row1.style.cssText = 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;';

    const majorSelect = createSelect('大分類');
    const minorSelect = createSelect('小分類', true);  // 初期状態で disabled

    const lateralitySelect = createSelect('側性', true);  // 初期状態で disabled
    lateralitySelect.innerHTML = `
      <option value="">側性</option>
      <option value="右">右</option>
      <option value="左">左</option>
      <option value="両">両</option>
    `;
    lateralitySelect.style.display = 'none';

    const subItemSelect = createSelect('指/趾', true);  // 初期状態で disabled
    subItemSelect.style.display = 'none';

    row1.appendChild(majorSelect);
    row1.appendChild(minorSelect);
    row1.appendChild(lateralitySelect);
    row1.appendChild(subItemSelect);

    // --- 行2: 方向ボタン（XPのみ表示） ---
    const row2 = document.createElement('div');
    row2.style.cssText = `
      display: none;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px solid var(--henry-border, #e0e0e0);
    `;

    const directionLabel = document.createElement('span');
    directionLabel.textContent = '方向:';
    directionLabel.style.cssText = `
      font-size: 13px;
      color: var(--henry-text-medium, #666);
      margin-right: 4px;
    `;
    row2.appendChild(directionLabel);

    const directionButtonsContainer = document.createElement('div');
    directionButtonsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
    row2.appendChild(directionButtonsContainer);

    // --- 行3: 関節選択ラジオボタン ---
    const row3 = document.createElement('div');
    row3.style.cssText = `
      display: none;
      align-items: center;
      gap: 12px;
      padding-top: 8px;
    `;

    const jointLabel = document.createElement('span');
    jointLabel.textContent = '関節:';
    jointLabel.style.cssText = `
      font-size: 13px;
      color: var(--henry-text-medium, #666);
    `;
    row3.appendChild(jointLabel);

    const jointRadiosContainer = document.createElement('div');
    jointRadiosContainer.style.cssText = 'display: flex; gap: 12px;';
    row3.appendChild(jointRadiosContainer);

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
        btn.style.cssText = `
          padding: 4px 10px;
          font-size: 14px;
          border: 1px solid var(--henry-border, #ccc);
          border-radius: var(--henry-radius, 4px);
          background: var(--henry-bg-base, #fff);
          color: var(--henry-text-high, #333);
          cursor: pointer;
          transition: all 0.15s;
        `;

        btn.addEventListener('click', () => {
          const isSelected = btn.dataset.selected === 'true';
          if (isSelected) {
            // 選択解除
            btn.dataset.selected = 'false';
            btn.style.background = 'var(--henry-bg-base, #fff)';
            btn.style.borderColor = 'var(--henry-border, #ccc)';
            btn.style.color = 'var(--henry-text-high, #333)';
            state.directions = state.directions.filter(d => d !== dir);
          } else {
            // 排他モードの場合、他のボタンの選択を解除
            if (isExclusive) {
              directionButtonsContainer.querySelectorAll('button').forEach(b => {
                b.dataset.selected = 'false';
                b.style.background = 'var(--henry-bg-base, #fff)';
                b.style.borderColor = 'var(--henry-border, #ccc)';
                b.style.color = 'var(--henry-text-high, #333)';
              });
              state.directions = [];
            }
            // このボタンを選択
            btn.dataset.selected = 'true';
            btn.style.background = 'var(--henry-primary, rgb(0, 204, 146))';
            btn.style.borderColor = 'var(--henry-primary, rgb(0, 204, 146))';
            btn.style.color = '#fff';
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
      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      lateralitySelect.selectedIndex = 0;
      lateralitySelect.style.display = 'none';
      lateralitySelect.disabled = true;
      subItemSelect.innerHTML = '<option value="">指/趾</option>';
      subItemSelect.style.display = 'none';
      subItemSelect.disabled = true;
      rowMD.style.display = 'none';
      row1.style.display = 'flex';
      row2.style.display = 'none';
      row3.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
      jointRadiosContainer.innerHTML = '';
      // MD用ボタンの選択解除
      mdButtonsContainer.querySelectorAll('button').forEach(b => {
        b.dataset.selected = 'false';
        b.style.background = 'var(--henry-bg-base, #fff)';
        b.style.borderColor = 'var(--henry-border, #ccc)';
        b.style.color = 'var(--henry-text-high, #333)';
      });
      // 枠色を更新
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

      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      lateralitySelect.selectedIndex = 0;
      lateralitySelect.style.display = 'none';
      lateralitySelect.disabled = true;
      subItemSelect.innerHTML = '<option value="">指/趾</option>';
      subItemSelect.style.display = 'none';
      subItemSelect.disabled = true;
      row2.style.display = 'none';
      row3.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
      jointRadiosContainer.innerHTML = '';

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
      row2.style.display = 'none';
      row3.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
      jointRadiosContainer.innerHTML = '';

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

      row2.style.display = 'none';
      row3.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
      jointRadiosContainer.innerHTML = '';

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
    const modalitySelect = document.querySelector(CONFIG.MODALITY_SELECTOR);
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
    select.style.cssText = `
      height: 36px;
      min-width: 100px;
      flex: 1;
      max-width: 160px;
      border: 1px solid ${initialBorder};
      border-radius: var(--henry-radius, 4px);
      background-color: var(--henry-bg-base, #fff);
      color: var(--henry-text-high, #333);
      font-family: "Noto Sans JP", sans-serif;
      font-size: 14px;
      padding: 0 10px;
      cursor: pointer;
      outline: none;
    `;
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
