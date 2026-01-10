// ==UserScript==
// @name         画像オーダー入力支援
// @namespace    https://henry-app.jp/
// @version      1.6.0
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
    NOTE_INPUT_SELECTOR: 'input[name*=".note"]',
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
    "頭部〜体幹": {
      "頭部": {
        bodySite: "頭部",
        defaultCondition: "80kvp,25mas,120cm",
        directions: ["正面", "側面"]
      },
      "胸部": {
        bodySite: "胸部",
        defaultCondition: "110kvp,10mas,200cm",
        directions: ["正面", "ポータブル正面"],
        conditionByDirection: { "ポータブル正面": "85kvp,18mas,110cm" }
      },
      "肋骨": {
        bodySite: "肋骨",
        defaultCondition: "76kvp,63mas,120cm",
        directions: ["正面", "両斜位"]
      },
      "胸骨": {
        bodySite: "胸骨",
        defaultCondition: "76kvp,63mas,120cm",
        directions: ["正面", "側面"]
      },
      "胸腹部": {
        bodySite: "胸腹部",
        defaultCondition: "80kvp,32mas,120cm",
        directions: ["正面", "ポータブル正面"],
        conditionByDirection: { "ポータブル正面": "100kvp,70mas,110cm" }
      },
      "腹部": {
        bodySite: "腹部",
        defaultCondition: "80kvp,32mas,120cm",
        directions: ["正面", "ポータブル正面"],
        conditionByDirection: { "ポータブル正面": "85kvp,20mas,110cm" }
      },
      "骨盤": {
        bodySite: "骨盤",
        defaultCondition: "80kvp,63mas,120cm",
        directions: ["正面", "側面", "斜位（右寛骨）", "斜位（左寛骨）", "inlet", "outlet"]
      }
    },
    "脊椎": {
      "頚椎": {
        bodySite: "頚椎",
        defaultCondition: "70kvp,20mas,120cm",
        directions: ["正面", "側面", "両斜位", "前後屈", "開口位正面"]
      },
      "胸椎": {
        bodySite: "胸椎",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面"]
      },
      "胸腰椎移行部": {
        bodySite: "胸腰椎移行部",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面"]
      },
      "腰椎": {
        bodySite: "腰椎",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面", "両斜位", "前後屈"]
      },
      "仙骨": {
        bodySite: "仙骨",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面"]
      },
      "仙尾骨": {
        bodySite: "仙骨/尾骨",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面"]
      },
      "尾骨": {
        bodySite: "尾骨",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面"]
      },
      "全脊椎": {
        bodySite: "脊椎",
        defaultCondition: "80kvp,80mas,120cm",
        directions: ["正面", "側面"]
      }
    },
    "上肢": {
      "鎖骨": {
        bodySite: "鎖骨",
        defaultCondition: "70kvp,10mas,120cm",
        directions: ["正面", "尾頭方向"]
      },
      "肩関節": {
        bodySite: "肩関節",
        defaultCondition: "70kvp,10mas,120cm",
        directions: ["正面", "スカプラY", "肩関節正面", "肩関節軸位", "肩関節（上腕内外旋）"]
      },
      "肩鎖関節": {
        bodySite: "肩鎖関節",
        defaultCondition: "70kvp,10mas,120cm",
        directions: ["正面"]
      },
      "胸鎖関節": {
        bodySite: "鎖骨",
        defaultCondition: "70kvp,10mas,120cm",
        directions: ["正面"]
      },
      "肩甲骨": {
        bodySite: "肩甲骨",
        defaultCondition: "70kvp,10mas,120cm",
        directions: ["正面", "スカプラY"]
      },
      "上腕骨": {
        bodySite: "上腕",
        defaultCondition: "60kvp,10mas,120cm",
        directions: ["正面", "側面", "片斜位"]
      },
      "肘関節": {
        bodySite: "肘関節",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "45°屈曲位正面", "両斜位"]
      },
      "前腕": {
        bodySite: "前腕",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "手関節": {
        bodySite: "手関節",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "舟状骨": {
        bodySite: "舟状骨",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "斜位", "尺屈"]
      },
      "手部": {
        bodySite: "手部",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "手根管": {
        bodySite: "手根管",
        defaultCondition: "60kvp,12.5mas,110cm",
        directions: []
      },
      "手指": {
        bodySite: "手指",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "両斜位", "（関節を指定）"]
      },
      "母指": {
        bodySite: "手指",
        defaultCondition: "56kvp,10mas,110cm",
        directions: ["正面", "側面", "CMj正面", "CMj側面"]
      }
    },
    "下肢": {
      "股関節": {
        bodySite: "股関節",
        defaultCondition: "80kvp,63mas,120cm",
        directions: ["正面", "ラウエン（外旋）"]
      },
      "大腿骨": {
        bodySite: "大腿骨",
        defaultCondition: "70kvp,16mas,120cm",
        directions: ["正面", "側面"]
      },
      "膝": {
        bodySite: "膝関節",
        defaultCondition: "61kvp,10mas,120cm",
        directions: ["正面", "側面", "両斜位", "スカイライン", "ローゼンバーグ"]
      },
      "下腿": {
        bodySite: "下腿骨",
        defaultCondition: "58kvp,10mas,130cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "足関節": {
        bodySite: "足関節",
        defaultCondition: "56kvp,10mas,130cm",
        directions: ["正面", "側面", "両斜位"]
      },
      "足": {
        bodySite: "足",
        defaultCondition: "56kvp,10mas,130cm",
        directions: ["正面", "両斜位"]
      },
      "踵骨": {
        bodySite: "踵骨",
        defaultCondition: "56kvp,10mas,130cm",
        directions: ["正面", "側面", "アントンセン"]
      },
      "足趾": {
        bodySite: "足指",
        defaultCondition: "56kvp,10mas,130cm",
        directions: ["正面", "側面", "両斜位"]
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

    logger.info('スクリプト初期化 (v1.6.0)');

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
  // ページ監視セットアップ
  // ==========================================
  function setupPage(cleaner) {
    const observer = new MutationObserver(() => {
      const modalitySelect = document.querySelector(CONFIG.MODALITY_SELECTOR);
      if (!modalitySelect) return;

      // モダリティ選択のイベント登録（一度だけ）
      if (!modalitySelect.dataset.hasModalityListener) {
        modalitySelect.dataset.hasModalityListener = 'true';
        modalitySelect.addEventListener('change', async () => {
          const modalityValue = modalitySelect.value;
          currentModality = MODALITY_MAP[modalityValue] || '';
          logger.info(`モダリティ変更: ${currentModality}`);
          // 全UIに通知
          modalityChangeCallbacks.forEach(cb => cb(currentModality));
          // 単純撮影(XP)・骨塩定量(MD)のとき体位を「任意」に設定
          if (currentModality === 'XP' || currentModality === 'MD') {
            await setBodyPositionToArbitrary();
          }
        });
        // 初期値を設定
        currentModality = MODALITY_MAP[modalitySelect.value] || '';
        logger.info(`初期モダリティ: ${currentModality}`);
        // 初期状態でXP/MDの場合も体位を設定
        if (currentModality === 'XP' || currentModality === 'MD') {
          setBodyPositionToArbitrary();
        }
      }

      // 「補足」ラベルを持つフォームグループ内のinputを検出
      const noteInputs = findNoteInputs();
      noteInputs.forEach((noteInput, index) => {
        if (!noteInput.dataset.hasHelperUI) {
          logger.info(`補足欄 ${index + 1} を検出 (name=${noteInput.name})`);
          setTimeout(() => injectHelperUI(noteInput, index), 50);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    cleaner.add(() => observer.disconnect());
    cleaner.add(() => {
      removeAllUI();
      modalityChangeCallbacks = [];
      currentModality = '';
    });

    // 初回チェック
    const modalitySelect = document.querySelector(CONFIG.MODALITY_SELECTOR);
    if (modalitySelect) {
      if (!modalitySelect.dataset.hasModalityListener) {
        modalitySelect.dataset.hasModalityListener = 'true';
        modalitySelect.addEventListener('change', async () => {
          const modalityValue = modalitySelect.value;
          currentModality = MODALITY_MAP[modalityValue] || '';
          logger.info(`モダリティ変更: ${currentModality}`);
          modalityChangeCallbacks.forEach(cb => cb(currentModality));
          // 単純撮影(XP)・骨塩定量(MD)のとき体位を「任意」に設定
          if (currentModality === 'XP' || currentModality === 'MD') {
            await setBodyPositionToArbitrary();
          }
        });
        currentModality = MODALITY_MAP[modalitySelect.value] || '';
        logger.info(`初期モダリティ: ${currentModality}`);
        // 初期状態でXP/MDの場合も体位を設定
        if (currentModality === 'XP' || currentModality === 'MD') {
          setBodyPositionToArbitrary();
        }
      }

      const noteInputs = findNoteInputs();
      noteInputs.forEach((noteInput, index) => {
        if (!noteInput.dataset.hasHelperUI) {
          logger.info(`初回: 補足欄 ${index + 1} を検出 (name=${noteInput.name})`);
          setTimeout(() => injectHelperUI(noteInput, index), 50);
        }
      });
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
  // ChipInput（体位）に値を設定（React Fiber方式）
  // ==========================================
  async function setChipInputValue(chipInput, value) {
    if (!chipInput || !value) return false;

    try {
      const fiberKey = Object.keys(chipInput).find(k => k.startsWith('__reactFiber$'));
      if (!fiberKey) {
        logger.warn('ChipInput: React Fiberが見つかりません');
        return false;
      }

      let target = chipInput[fiberKey]?.return;
      for (let i = 0; i < 10 && target; i++) {
        if (target.memoizedProps?.onChange && target.memoizedProps?.searchHandler) {
          break;
        }
        target = target.return;
      }

      if (!target?.memoizedProps?.onChange || !target?.memoizedProps?.searchHandler) {
        logger.warn('ChipInput: onChange/searchHandlerが見つかりません');
        return false;
      }

      const { searchHandler, onChange } = target.memoizedProps;

      const results = await searchHandler(value);
      const option = results?.find(r => r.label === value);

      if (option) {
        onChange([option]);  // ChipInputは配列で渡す
        logger.info(`ChipInput: "${value}" を設定成功`);
        return true;
      } else {
        logger.warn(`ChipInput: "${value}" が選択肢にありません`);
        return false;
      }
    } catch (e) {
      logger.warn('ChipInput: エラー', e.message);
      return false;
    }
  }

  // ==========================================
  // 体位を「任意」に設定（単純撮影・骨塩定量のとき）
  // ==========================================
  async function setBodyPositionToArbitrary() {
    const chipInput = document.querySelector('[data-testid="BodyPositionForm__ChipInput"]');
    if (chipInput) {
      await setChipInputValue(chipInput, '任意');
    }
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
      directions: [],
      minorData: null  // 小分類の詳細データ（bodySite, defaultCondition等）
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

    // --- 行1: 大分類・小分類ドロップダウン ---
    const row1 = document.createElement('div');
    row1.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    const majorSelect = createSelect('大分類');
    const minorSelect = createSelect('小分類');
    minorSelect.disabled = true;

    row1.appendChild(majorSelect);
    row1.appendChild(minorSelect);

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

    container.appendChild(row1);
    container.appendChild(row2);

    // --- ロジック関数 ---
    const updateNoteInput = () => {
      if (!state.minor) {
        setNativeValue(noteInput, '');
        return;
      }

      let value = state.minor;
      if (state.directions.length > 0) {
        value += '　' + state.directions.join('・');
      }
      setNativeValue(noteInput, value);

      // XPの場合のみ枚数と撮影条件を更新
      if (state.modality === 'XP' && state.minorData) {
        // 枚数を更新（方向が選択されている場合のみ）
        if (filmCountInput && state.directions.length > 0) {
          const count = calculateFilmCount(state.directions);
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

      directions.forEach(dir => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = dir;
        btn.dataset.direction = dir;
        btn.style.cssText = `
          padding: 4px 10px;
          font-size: 13px;
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
            btn.dataset.selected = 'false';
            btn.style.background = 'var(--henry-bg-base, #fff)';
            btn.style.borderColor = 'var(--henry-border, #ccc)';
            btn.style.color = 'var(--henry-text-high, #333)';
            state.directions = state.directions.filter(d => d !== dir);
          } else {
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

    const populateMajorSelect = (data) => {
      majorSelect.innerHTML = '<option value="">大分類</option>';
      Object.keys(data).forEach(major => {
        const opt = document.createElement('option');
        opt.value = major;
        opt.textContent = major;
        majorSelect.appendChild(opt);
      });
      majorSelect.disabled = false;
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
    };

    const resetUI = () => {
      state.major = '';
      state.minor = '';
      state.directions = [];
      state.minorData = null;
      majorSelect.innerHTML = '<option value="">大分類</option>';
      majorSelect.disabled = true;
      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      row2.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
    };

    const handleModalityChange = (modality) => {
      state.modality = modality;
      resetUI();

      if (!modality || modality === 'MD') {
        container.style.display = 'none';
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
      state.directions = [];
      state.minorData = null;

      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      row2.style.display = 'none';
      directionButtonsContainer.innerHTML = '';

      // 枚数と撮影条件を空欄にする
      if (filmCountInput) setNativeValue(filmCountInput, '');
      if (configurationInput) setNativeValue(configurationInput, '');

      if (!major) {
        updateNoteInput();
        return;
      }

      const data = getDataForModality(state.modality);
      if (data && data[major]) {
        populateMinorSelect(data[major]);
      }
      updateNoteInput();
    });

    minorSelect.addEventListener('change', async () => {
      const minor = minorSelect.value;
      state.minor = minor;
      state.directions = [];
      state.minorData = null;

      // 枚数と撮影条件を空欄にする
      if (filmCountInput) setNativeValue(filmCountInput, '');
      if (configurationInput) setNativeValue(configurationInput, '');

      if (!minor) {
        row2.style.display = 'none';
        directionButtonsContainer.innerHTML = '';
        updateNoteInput();
        return;
      }

      const data = getDataForModality(state.modality);
      if (data && data[state.major] && data[state.major][minor]) {
        state.minorData = data[state.major][minor];
        renderDirectionButtons(state.minorData.directions || []);

        // 部位を自動入力
        await updateBodySite();

        // XPの場合、デフォルトの撮影条件を入力
        if (state.modality === 'XP' && configurationInput && state.minorData.defaultCondition) {
          setNativeValue(configurationInput, state.minorData.defaultCondition);
          logger.info(`UI ${index + 1}: 撮影条件（初期）を ${state.minorData.defaultCondition} に設定`);
        }
      }
      updateNoteInput();
    });

    // --- DOM挿入（補足フォームグループの上） ---
    // 「補足」ラベルを含むフォームグループを探す
    let formGroup = noteInput.closest('div[class*="sc-d2f77e68"]');
    if (!formGroup) {
      // フォールバック: 親を遡って適切な挿入位置を探す
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
      if (initialModality && initialModality !== 'MD') {
        handleModalityChange(initialModality);
      }
    }
  }

  // ==========================================
  // ユーティリティ: セレクト作成
  // ==========================================
  function createSelect(placeholder) {
    const select = document.createElement('select');
    select.style.cssText = `
      height: 32px;
      min-width: 120px;
      border: 1px solid var(--henry-border, #ccc);
      border-radius: var(--henry-radius, 4px);
      background-color: var(--henry-bg-base, #fff);
      color: var(--henry-text-high, #333);
      font-family: "Noto Sans JP", sans-serif;
      font-size: 13px;
      padding: 0 8px;
      cursor: pointer;
      outline: none;
    `;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.appendChild(opt);
    return select;
  }

  init();
})();
