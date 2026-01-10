// ==UserScript==
// @name         画像オーダー入力支援
// @namespace    https://henry-app.jp/
// @version      1.0.0
// @description  画像照射オーダーモーダルに部位・方向選択UIを追加
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
    CONTAINER_ID: 'henry-imaging-helper-container'
  };

  // モダリティ値のマッピング
  const MODALITY_MAP = {
    'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL': 'XP',
    'IMAGING_MODALITY_CT': 'CT',
    'IMAGING_MODALITY_MRI_ABOVE_1_5_AND_BELOW_3_TESLA': 'MRI',
    'IMAGING_MODALITY_MD': 'MD'
  };

  // XP用データ
  const XP_DATA = {
    "頭部〜体幹": {
      "頭部": ["正面", "側面"],
      "胸部": ["正面", "ポータブル正面"],
      "肋骨": ["正面", "両斜位"],
      "胸骨": ["正面", "側面"],
      "胸腹部": ["正面", "ポータブル正面"],
      "腹部": ["正面", "ポータブル正面"]
    },
    "脊椎": {
      "頚椎": ["正面", "側面", "両斜位", "前後屈", "開口位正面"],
      "胸椎": ["正面", "側面"],
      "胸腰椎移行部": ["正面", "側面"],
      "腰椎": ["正面", "側面", "両斜位", "前後屈"],
      "骨盤": ["正面", "側面", "斜位（右寛骨）", "斜位（左寛骨）", "inlet", "outlet"],
      "仙骨": ["正面", "側面"],
      "仙尾骨": ["正面", "側面"],
      "尾骨": ["正面", "側面"],
      "全脊椎": ["正面", "側面"]
    },
    "上肢": {
      "鎖骨": ["正面", "尾頭方向"],
      "肩": ["正面", "スカプラY", "肩関節正面", "肩関節軸位", "肩関節（上腕内外旋）"],
      "肩鎖関節": ["正面"],
      "胸鎖関節": ["正面"],
      "肩甲骨": ["正面", "スカプラY"],
      "上腕骨": ["正面", "側面", "片斜位"],
      "肘関節": ["正面", "側面", "45°屈曲位正面", "両斜位"],
      "前腕": ["正面", "側面", "両斜位"],
      "手関節": ["正面", "側面", "両斜位"],
      "舟状骨": ["正面", "側面", "斜位", "尺屈"],
      "手部": ["正面", "側面", "両斜位"],
      "手根管": [],
      "手指": ["正面", "側面", "両斜位", "（関節を指定）"],
      "母指": ["正面", "側面", "CMj正面", "CMj側面"]
    },
    "下肢": {
      "股関節": ["正面", "ラウエン（外旋）"],
      "大腿骨": ["正面", "側面"],
      "膝": ["正面", "側面", "両斜位", "スカイライン", "ローゼンバーグ"],
      "下腿": ["正面", "側面", "両斜位"],
      "足関節": ["正面", "側面", "両斜位"],
      "足": ["正面", "両斜位"],
      "踵骨": ["正面", "側面", "アントンセン"],
      "足趾": ["正面", "側面", "両斜位"]
    }
  };

  // CT用データ
  const CT_DATA = {
    "入院・入所時": {
      "入院・入所時": []
    },
    "頭〜顔": {
      "頭蓋・脳": [],
      "鼻骨": [],
      "頬骨": [],
      "顎関節": []
    },
    "体幹": {
      "胸部": [],
      "肋骨・胸部": [],
      "胸腹部": [],
      "胸部〜骨盤": [],
      "骨盤・股関節": []
    },
    "脊椎": {
      "頚椎": [],
      "胸腰椎": [],
      "腰椎": [],
      "仙尾骨": []
    },
    "上肢": {
      "鎖骨": [],
      "肩関節": [],
      "肩甲骨": [],
      "上腕": [],
      "肘関節": [],
      "前腕": [],
      "手関節": [],
      "手部": []
    },
    "下肢": {
      "股関節": [],
      "大腿": [],
      "膝関節": [],
      "下腿": [],
      "足関節": [],
      "踵骨": [],
      "足部": []
    }
  };

  // MRI用データ
  const MRI_DATA = {
    "頭部": {
      "脳": []
    },
    "体幹": {
      "MRCP": [],
      "骨盤・股関節": []
    },
    "脊椎": {
      "頚椎": [],
      "胸椎": [],
      "胸腰椎移行部": [],
      "腰椎": [],
      "腰椎・仙骨": []
    },
    "上肢": {
      "肩関節": [],
      "手関節": []
    },
    "下肢": {
      "股関節": [],
      "膝関節": [],
      "足関節": []
    }
  };

  let logger = null;
  let currentObserver = null;

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

    logger.info('スクリプト初期化 (v1.0.0)');

    utils.subscribeNavigation(cleaner, () => {
      logger.info('ページ遷移検出 -> 再セットアップ');
      setupPage(cleaner);
    });

    setupPage(cleaner);
  }

  // ==========================================
  // ページ監視セットアップ
  // ==========================================
  function setupPage(cleaner) {
    const observer = new MutationObserver(() => {
      const modalitySelect = document.querySelector(CONFIG.MODALITY_SELECTOR);
      const noteInput = document.querySelector(CONFIG.NOTE_INPUT_SELECTOR);

      if (modalitySelect && noteInput && !noteInput.dataset.hasHelperUI) {
        logger.info('画像オーダーモーダルを検出、UIを注入');
        setTimeout(() => injectHelperUI(modalitySelect, noteInput), 50);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    cleaner.add(() => observer.disconnect());
    cleaner.add(removeExistingUI);

    // 初回チェック
    const modalitySelect = document.querySelector(CONFIG.MODALITY_SELECTOR);
    const noteInput = document.querySelector(CONFIG.NOTE_INPUT_SELECTOR);
    if (modalitySelect && noteInput && !noteInput.dataset.hasHelperUI) {
      logger.info('初回: 画像オーダーモーダルを検出、UIを注入');
      setTimeout(() => injectHelperUI(modalitySelect, noteInput), 50);
    }
  }

  // ==========================================
  // UI削除
  // ==========================================
  function removeExistingUI() {
    const container = document.getElementById(CONFIG.CONTAINER_ID);
    if (container) container.remove();
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
  // ヘルパーUI注入
  // ==========================================
  function injectHelperUI(modalitySelect, noteInput) {
    if (noteInput.dataset.hasHelperUI) return;
    noteInput.dataset.hasHelperUI = 'true';

    removeExistingUI();
    logger.info('ヘルパーUIを注入します');

    let state = {
      modality: '',
      major: '',
      minor: '',
      directions: []
    };

    // --- コンテナ ---
    const container = document.createElement('div');
    container.id = CONFIG.CONTAINER_ID;
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
    const getDataForModality = (modality) => {
      switch (modality) {
        case 'XP': return XP_DATA;
        case 'CT': return CT_DATA;
        case 'MRI': return MRI_DATA;
        default: return null;
      }
    };

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
      state = { modality: '', major: '', minor: '', directions: [] };
      majorSelect.innerHTML = '<option value="">大分類</option>';
      majorSelect.disabled = true;
      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      row2.style.display = 'none';
      directionButtonsContainer.innerHTML = '';
      container.style.display = 'none';
    };

    // --- イベントハンドラ ---
    modalitySelect.addEventListener('change', () => {
      const modalityValue = modalitySelect.value;
      const modality = MODALITY_MAP[modalityValue];

      resetUI();

      if (!modality || modality === 'MD') {
        return;
      }

      state.modality = modality;
      const data = getDataForModality(modality);

      if (data) {
        container.style.display = 'flex';
        populateMajorSelect(data);
      }
    });

    majorSelect.addEventListener('change', () => {
      const major = majorSelect.value;
      state.major = major;
      state.minor = '';
      state.directions = [];

      minorSelect.innerHTML = '<option value="">小分類</option>';
      minorSelect.disabled = true;
      row2.style.display = 'none';
      directionButtonsContainer.innerHTML = '';

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

    minorSelect.addEventListener('change', () => {
      const minor = minorSelect.value;
      state.minor = minor;
      state.directions = [];

      if (!minor) {
        row2.style.display = 'none';
        directionButtonsContainer.innerHTML = '';
        updateNoteInput();
        return;
      }

      const data = getDataForModality(state.modality);
      if (data && data[state.major] && data[state.major][minor]) {
        const directions = data[state.major][minor];
        renderDirectionButtons(directions);
      }
      updateNoteInput();
    });

    // --- DOM挿入（補足入力欄の上） ---
    const noteWrapper = noteInput.closest('div[class*="sc-"]');
    if (noteWrapper && noteWrapper.parentElement) {
      noteWrapper.parentElement.insertBefore(container, noteWrapper);
    } else {
      noteInput.parentElement.insertBefore(container, noteInput);
    }

    // 初期状態でモダリティが選択済みの場合
    const currentModality = MODALITY_MAP[modalitySelect.value];
    if (currentModality && currentModality !== 'MD') {
      state.modality = currentModality;
      const data = getDataForModality(currentModality);
      if (data) {
        container.style.display = 'flex';
        populateMajorSelect(data);
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
