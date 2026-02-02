// ==UserScript==
// @name         Henry Karte Input Helper
// @namespace    https://henry-app.jp/
// @version      0.2.0
// @description  カルテ入力支援（手所見テンプレート）
// @author       sk powered by Claude
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_karte_input_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_karte_input_helper.user.js
// ==/UserScript==

/*
 * 【カルテ入力支援】
 *
 * ■ 使用場面
 * - カルテに手の所見を入力する際に、テンプレートを使って効率的に入力したい場合
 *
 * ■ 主な機能
 * 1. ショートカットキーで起動（Ctrl+Shift+K）
 * 2. 手所見のトグル選択UI
 * 3. 選択した所見を整形してクリップボードにコピー
 *
 * ■ 操作方法
 * - Ctrl+Shift+K: ポップアップを開く
 * - トグルボタンで所見を選択
 * - 「コピー」ボタンでクリップボードにコピー
 * - Escape: ポップアップを閉じる
 *
 * ■ 変更履歴
 * v0.2.0 (2026-02-02) - 2カラムレイアウトでプレビューペイン追加
 * v0.1.0 (2026-02-02) - 初版作成
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'KarteInputHelper';
  const SHORTCUT_KEY = { key: 'K', ctrl: true, shift: true };

  // ============================================
  // 手所見テンプレート定義
  // ============================================
  const HAND_TEMPLATE = {
    name: '手所見',
    locations: ['右手', '左手', '両手'],
    sections: [
      {
        name: '視診',
        collapsed: false,
        items: [
          { key: 'swelling', label: '腫脹', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'deformity', label: '変形', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'redness', label: '発赤', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'warmth', label: '熱感', type: 'toggle', values: ['−', '+'], default: '−' },
        ]
      },
      {
        name: '圧痛',
        collapsed: false,
        items: [
          { key: 'mp', label: 'MP', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'pip', label: 'PIP', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'dip', label: 'DIP', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'cm', label: 'CM', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'snuffbox', label: 'snuffbox', type: 'toggle', values: ['−', '+'], default: '−' },
        ]
      },
      {
        name: '可動域',
        collapsed: false,
        items: [
          { key: 'rom_mp', label: 'MP', type: 'toggle', values: ['正常', '制限'], default: '正常' },
          { key: 'rom_pip', label: 'PIP', type: 'toggle', values: ['正常', '制限'], default: '正常' },
          { key: 'rom_dip', label: 'DIP', type: 'toggle', values: ['正常', '制限'], default: '正常' },
          { key: 'rom_wrist', label: '手関節', type: 'toggle', values: ['正常', '制限'], default: '正常' },
        ]
      },
      {
        name: '変形',
        collapsed: true,
        items: [
          { key: 'swan_neck', label: 'スワンネック', type: 'checkbox', default: false },
          { key: 'boutonniere', label: 'ボタン穴', type: 'checkbox', default: false },
          { key: 'mallet', label: 'マレット', type: 'checkbox', default: false },
        ]
      },
      {
        name: '神経',
        collapsed: true,
        items: [
          { key: 'tinel_carpal', label: 'Tinel手根管', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'tinel_cubital', label: 'Tinel肘部管', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'tinel_guyon', label: 'Tinelギオン管', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'phalen', label: 'Phalen', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'sens_median', label: '感覚:正中', type: 'toggle', values: ['正常', '低下'], default: '正常' },
          { key: 'sens_ulnar', label: '感覚:尺骨', type: 'toggle', values: ['正常', '低下'], default: '正常' },
          { key: 'sens_radial', label: '感覚:橈骨', type: 'toggle', values: ['正常', '低下'], default: '正常' },
        ]
      },
      {
        name: 'その他',
        collapsed: true,
        items: [
          { key: 'grip', label: 'grip', type: 'toggle', values: ['full', '低下'], default: 'full' },
          { key: 'fds_fdp', label: 'FDS/FDP', type: 'toggle', values: ['正常', '異常'], default: '正常' },
          { key: 'thenar_atrophy', label: '母指球萎縮', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'hypothenar_atrophy', label: '小指球萎縮', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'snapping', label: 'snapping', type: 'toggle', values: ['−', '+'], default: '−' },
          { key: 'capillary_refill', label: 'capillary refill', type: 'toggle', values: ['正常', '延長'], default: '正常' },
          { key: 'allen', label: 'Allen', type: 'toggle', values: ['−', '+'], default: '−' },
        ]
      },
      {
        name: '画像',
        collapsed: false,
        items: [
          { key: 'xp', label: 'Xp', type: 'text', default: '', placeholder: '所見を入力' },
        ]
      },
    ]
  };

  // ============================================
  // 状態管理
  // ============================================
  let currentState = null;
  let popupElement = null;
  let cleaner = null;

  // ============================================
  // 初期状態を生成
  // ============================================
  function createInitialState(template) {
    const state = {
      location: template.locations[0],
      format: 'compact', // 'compact' or 'detailed'
      sections: {}
    };

    for (const section of template.sections) {
      state.sections[section.name] = {
        collapsed: section.collapsed,
        items: {}
      };
      for (const item of section.items) {
        state.sections[section.name].items[item.key] = item.default;
      }
    }

    return state;
  }

  // ============================================
  // 所見テキスト生成
  // ============================================
  function generateText(state, template, format) {
    if (format === 'compact') {
      return generateCompactText(state, template);
    } else {
      return generateDetailedText(state, template);
    }
  }

  function generateCompactText(state, template) {
    const lines = [];
    lines.push(`【${state.location}】`);

    // 視診セクション
    const visualItems = state.sections['視診']?.items || {};
    const visualAbnormal = Object.entries(visualItems).filter(([_, v]) => v === '+');
    if (visualAbnormal.length === 0) {
      lines.push('視診正常');
    } else {
      const labels = visualAbnormal.map(([k]) => {
        const item = template.sections.find(s => s.name === '視診')?.items.find(i => i.key === k);
        return item?.label || k;
      });
      lines.push(`視診: ${labels.join('・')}(+)`);
    }

    // 圧痛セクション
    const painItems = state.sections['圧痛']?.items || {};
    const painPositive = Object.entries(painItems).filter(([_, v]) => v === '+');
    if (painPositive.length === 0) {
      lines.push('圧痛(−)');
    } else {
      const labels = painPositive.map(([k]) => {
        const item = template.sections.find(s => s.name === '圧痛')?.items.find(i => i.key === k);
        return item?.label || k;
      });
      lines.push(`圧痛: ${labels.join('・')}(+)`);
    }

    // 可動域セクション
    const romItems = state.sections['可動域']?.items || {};
    const romRestricted = Object.entries(romItems).filter(([_, v]) => v === '制限');
    if (romRestricted.length === 0) {
      lines.push('ROM full');
    } else {
      const labels = romRestricted.map(([k]) => {
        const item = template.sections.find(s => s.name === '可動域')?.items.find(i => i.key === k);
        return item?.label || k;
      });
      lines.push(`ROM制限: ${labels.join('・')}`);
    }

    // grip
    const otherItems = state.sections['その他']?.items || {};
    lines.push(`grip ${otherItems.grip || 'full'}`);

    // 神経セクション
    const nerveItems = state.sections['神経']?.items || {};
    const nerveLine = [];

    // Tinel
    const tinelPositive = ['tinel_carpal', 'tinel_cubital', 'tinel_guyon']
      .filter(k => nerveItems[k] === '+')
      .map(k => {
        const item = template.sections.find(s => s.name === '神経')?.items.find(i => i.key === k);
        return item?.label.replace('Tinel', '') || k;
      });
    if (tinelPositive.length === 0) {
      nerveLine.push('Tinel(−)');
    } else {
      nerveLine.push(`Tinel: ${tinelPositive.join('・')}(+)`);
    }

    // Phalen
    nerveLine.push(`Phalen(${nerveItems.phalen || '−'})`);

    // 感覚
    const sensAbnormal = ['sens_median', 'sens_ulnar', 'sens_radial']
      .filter(k => nerveItems[k] === '低下')
      .map(k => {
        const item = template.sections.find(s => s.name === '神経')?.items.find(i => i.key === k);
        return item?.label.replace('感覚:', '') || k;
      });
    if (sensAbnormal.length === 0) {
      nerveLine.push('感覚正常');
    } else {
      nerveLine.push(`感覚低下: ${sensAbnormal.join('・')}`);
    }

    // 萎縮
    const atrophyPositive = ['thenar_atrophy', 'hypothenar_atrophy']
      .filter(k => otherItems[k] === '+')
      .map(k => {
        const item = template.sections.find(s => s.name === 'その他')?.items.find(i => i.key === k);
        return item?.label || k;
      });
    if (atrophyPositive.length === 0) {
      nerveLine.push('萎縮(−)');
    } else {
      nerveLine.push(`${atrophyPositive.join('・')}(+)`);
    }

    lines.push(`神経: ${nerveLine.join(', ')}`);

    // 変形セクション
    const deformItems = state.sections['変形']?.items || {};
    const deformPositive = Object.entries(deformItems)
      .filter(([_, v]) => v === true)
      .map(([k]) => {
        const item = template.sections.find(s => s.name === '変形')?.items.find(i => i.key === k);
        return item?.label || k;
      });
    if (deformPositive.length > 0) {
      lines.push(`変形: ${deformPositive.join('・')}`);
    }

    // その他の異常
    const otherAbnormal = [];
    if (otherItems.fds_fdp === '異常') otherAbnormal.push('FDS/FDP異常');
    if (otherItems.snapping === '+') otherAbnormal.push('snapping(+)');
    if (otherItems.capillary_refill === '延長') otherAbnormal.push('capillary refill延長');
    if (otherItems.allen === '+') otherAbnormal.push('Allen(+)');
    if (otherAbnormal.length > 0) {
      lines.push(otherAbnormal.join(', '));
    }

    // 画像
    const imageItems = state.sections['画像']?.items || {};
    if (imageItems.xp) {
      lines.push(`Xp: ${imageItems.xp}`);
    }

    return lines.join('\n');
  }

  function generateDetailedText(state, template) {
    const lines = [];
    lines.push(`◆ ${state.location}所見`);

    // 視診
    const visualItems = state.sections['視診']?.items || {};
    const visualParts = template.sections.find(s => s.name === '視診')?.items.map(item => {
      const val = visualItems[item.key] || item.default;
      return `${item.label}${val}`;
    }) || [];
    lines.push(visualParts.join('，'));

    // 圧痛
    const painItems = state.sections['圧痛']?.items || {};
    const painParts = template.sections.find(s => s.name === '圧痛')?.items.map(item => {
      const val = painItems[item.key] || item.default;
      return `${item.label}${val}`;
    }) || [];
    lines.push(`圧痛：${painParts.join('，')}`);

    // 可動域
    const romItems = state.sections['可動域']?.items || {};
    const romParts = template.sections.find(s => s.name === '可動域')?.items.map(item => {
      const val = romItems[item.key] || item.default;
      return `${item.label}${val === '正常' ? 'full' : '制限'}`;
    }) || [];
    lines.push(`ROM：${romParts.join('，')}`);

    // 変形
    const deformItems = state.sections['変形']?.items || {};
    const deformParts = template.sections.find(s => s.name === '変形')?.items.map(item => {
      const val = deformItems[item.key] || item.default;
      return `${item.label}${val ? '(+)' : '(−)'}`;
    }) || [];
    lines.push(`変形：${deformParts.join('，')}`);

    // 神経 - Tinel
    const nerveItems = state.sections['神経']?.items || {};
    const tinelParts = ['tinel_carpal', 'tinel_cubital', 'tinel_guyon'].map(k => {
      const item = template.sections.find(s => s.name === '神経')?.items.find(i => i.key === k);
      const val = nerveItems[k] || '−';
      return `${item?.label.replace('Tinel', '') || k}${val}`;
    });
    lines.push(`Tinel：${tinelParts.join('，')}`);

    // Phalen
    lines.push(`Phalen：${nerveItems.phalen || '−'}`);

    // 感覚
    const sensParts = ['sens_median', 'sens_ulnar', 'sens_radial'].map(k => {
      const item = template.sections.find(s => s.name === '神経')?.items.find(i => i.key === k);
      const val = nerveItems[k] || '正常';
      return `${item?.label.replace('感覚:', '') || k}${val}`;
    });
    lines.push(`感覚：${sensParts.join('，')}`);

    // その他
    const otherItems = state.sections['その他']?.items || {};
    lines.push(`grip：${otherItems.grip || 'full'}`);
    lines.push(`FDS/FDP：${otherItems.fds_fdp || '正常'}`);
    lines.push(`母指球萎縮：${otherItems.thenar_atrophy || '−'}`);
    lines.push(`小指球萎縮：${otherItems.hypothenar_atrophy || '−'}`);
    lines.push(`snapping：${otherItems.snapping || '−'}`);
    lines.push(`capillary refill：${otherItems.capillary_refill || '正常'}`);
    lines.push(`Allen：${otherItems.allen || '−'}`);

    // 画像
    const imageItems = state.sections['画像']?.items || {};
    if (imageItems.xp) {
      lines.push(`Xp：${imageItems.xp}`);
    }

    return lines.join('\n');
  }

  // ============================================
  // スタイル定義
  // ============================================
  function injectStyles() {
    if (document.getElementById('karte-input-helper-styles')) return;

    const style = document.createElement('style');
    style.id = 'karte-input-helper-styles';
    style.textContent = `
      .kih-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 1500;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 980px;
        font-family: "Noto Sans JP", sans-serif;
      }
      .kih-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
        background: #f5f5f5;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .kih-title {
        font-size: 16px;
        font-weight: bold;
        color: #333;
        margin: 0;
      }
      .kih-close-btn {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
        padding: 4px;
        line-height: 1;
      }
      .kih-close-btn:hover {
        color: #333;
      }
      .kih-body {
        padding: 16px 20px;
        flex: 1;
        display: flex;
        gap: 16px;
        min-height: 0;
      }
      .kih-input-area {
        flex: 1;
        min-width: 0;
        overflow-y: auto;
      }
      .kih-preview-area {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .kih-preview-label {
        font-size: 13px;
        font-weight: 500;
        color: #666;
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      .kih-preview-box {
        flex: 1;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 12px;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-y: auto;
        color: #333;
      }
      .kih-location-row {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        gap: 8px;
      }
      .kih-location-label {
        font-size: 14px;
        color: #666;
      }
      .kih-location-select {
        padding: 6px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        background: #fff;
      }
      .kih-section {
        margin-bottom: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
      }
      .kih-section-header {
        padding: 10px 12px;
        background: #f9f9f9;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }
      .kih-section-header:hover {
        background: #f0f0f0;
      }
      .kih-section-title {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }
      .kih-section-toggle {
        font-size: 12px;
        color: #666;
      }
      .kih-section-body {
        padding: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .kih-section-body.collapsed {
        display: none;
      }
      .kih-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .kih-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
      }
      .kih-toggle-btn:hover {
        border-color: #999;
      }
      .kih-toggle-btn.positive {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #1976d2;
      }
      .kih-toggle-btn.abnormal {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;
      }
      .kih-checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
      }
      .kih-checkbox-label:hover {
        border-color: #999;
      }
      .kih-checkbox-label.checked {
        background: #ffebee;
        border-color: #f44336;
        color: #c62828;
      }
      .kih-checkbox-label input {
        display: none;
      }
      .kih-text-input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 13px;
        min-width: 200px;
      }
      .kih-text-input:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
      }
      .kih-footer {
        padding: 12px 20px;
        border-top: 1px solid #e0e0e0;
        background: #f5f5f5;
      }
      .kih-format-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .kih-format-label {
        font-size: 13px;
        color: #666;
      }
      .kih-format-option {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      .kih-format-option input {
        cursor: pointer;
      }
      .kih-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .kih-btn {
        padding: 8px 20px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      .kih-btn-primary {
        background: #2196f3;
        color: #fff;
        border: none;
      }
      .kih-btn-primary:hover {
        background: #1976d2;
      }
      .kih-btn-secondary {
        background: #fff;
        color: #666;
        border: 1px solid #ccc;
      }
      .kih-btn-secondary:hover {
        background: #f5f5f5;
      }
      .kih-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.3);
        z-index: 1499;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // ポップアップUI生成
  // ============================================
  function createPopup(template, state, onCopy, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'kih-overlay';
    overlay.addEventListener('click', onClose);

    const popup = document.createElement('div');
    popup.className = 'kih-popup';

    // プレビュー更新関数（後で定義するpreviewBoxを参照）
    let previewBox = null;
    const updatePreview = () => {
      if (previewBox) {
        previewBox.textContent = generateText(state, template, state.format);
      }
    };

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'kih-header';
    const title = document.createElement('h3');
    title.className = 'kih-title';
    title.textContent = template.name;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'kih-close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', onClose);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // ボディ（2カラム）
    const body = document.createElement('div');
    body.className = 'kih-body';

    // 左カラム: 入力エリア
    const inputArea = document.createElement('div');
    inputArea.className = 'kih-input-area';

    // 部位選択
    const locationRow = document.createElement('div');
    locationRow.className = 'kih-location-row';
    const locationLabel = document.createElement('span');
    locationLabel.className = 'kih-location-label';
    locationLabel.textContent = '部位:';
    const locationSelect = document.createElement('select');
    locationSelect.className = 'kih-location-select';
    template.locations.forEach(loc => {
      const option = document.createElement('option');
      option.value = loc;
      option.textContent = loc;
      if (loc === state.location) option.selected = true;
      locationSelect.appendChild(option);
    });
    locationSelect.addEventListener('change', (e) => {
      state.location = e.target.value;
      updatePreview();
    });
    locationRow.appendChild(locationLabel);
    locationRow.appendChild(locationSelect);
    inputArea.appendChild(locationRow);

    // セクション
    template.sections.forEach(sectionDef => {
      const section = document.createElement('div');
      section.className = 'kih-section';

      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'kih-section-header';

      const sectionTitle = document.createElement('span');
      sectionTitle.className = 'kih-section-title';
      sectionTitle.textContent = sectionDef.name;

      const sectionToggle = document.createElement('span');
      sectionToggle.className = 'kih-section-toggle';
      sectionToggle.textContent = state.sections[sectionDef.name].collapsed ? '▶' : '▼';

      sectionHeader.appendChild(sectionTitle);
      sectionHeader.appendChild(sectionToggle);

      const sectionBody = document.createElement('div');
      sectionBody.className = 'kih-section-body';
      if (state.sections[sectionDef.name].collapsed) {
        sectionBody.classList.add('collapsed');
      }

      sectionHeader.addEventListener('click', () => {
        state.sections[sectionDef.name].collapsed = !state.sections[sectionDef.name].collapsed;
        sectionBody.classList.toggle('collapsed');
        sectionToggle.textContent = state.sections[sectionDef.name].collapsed ? '▶' : '▼';
      });

      // アイテム
      sectionDef.items.forEach(itemDef => {
        const item = document.createElement('div');
        item.className = 'kih-item';

        if (itemDef.type === 'toggle') {
          const btn = document.createElement('button');
          btn.className = 'kih-toggle-btn';
          const currentValue = state.sections[sectionDef.name].items[itemDef.key];
          btn.textContent = `${itemDef.label} [${currentValue}]`;
          updateToggleStyle(btn, itemDef, currentValue);

          btn.addEventListener('click', () => {
            const values = itemDef.values;
            const currentIdx = values.indexOf(state.sections[sectionDef.name].items[itemDef.key]);
            const nextIdx = (currentIdx + 1) % values.length;
            const newValue = values[nextIdx];
            state.sections[sectionDef.name].items[itemDef.key] = newValue;
            btn.textContent = `${itemDef.label} [${newValue}]`;
            updateToggleStyle(btn, itemDef, newValue);
            updatePreview();
          });

          item.appendChild(btn);
        } else if (itemDef.type === 'checkbox') {
          const label = document.createElement('label');
          label.className = 'kih-checkbox-label';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = state.sections[sectionDef.name].items[itemDef.key];
          if (checkbox.checked) label.classList.add('checked');

          checkbox.addEventListener('change', () => {
            state.sections[sectionDef.name].items[itemDef.key] = checkbox.checked;
            label.classList.toggle('checked', checkbox.checked);
            updatePreview();
          });

          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(itemDef.label));
          item.appendChild(label);
        } else if (itemDef.type === 'text') {
          const labelSpan = document.createElement('span');
          labelSpan.textContent = `${itemDef.label}:`;
          labelSpan.style.fontSize = '13px';
          labelSpan.style.marginRight = '4px';

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'kih-text-input';
          input.placeholder = itemDef.placeholder || '';
          input.value = state.sections[sectionDef.name].items[itemDef.key] || '';

          input.addEventListener('input', () => {
            state.sections[sectionDef.name].items[itemDef.key] = input.value;
            updatePreview();
          });

          item.appendChild(labelSpan);
          item.appendChild(input);
        }

        sectionBody.appendChild(item);
      });

      section.appendChild(sectionHeader);
      section.appendChild(sectionBody);
      inputArea.appendChild(section);
    });

    // 右カラム: プレビューエリア
    const previewArea = document.createElement('div');
    previewArea.className = 'kih-preview-area';

    const previewLabel = document.createElement('div');
    previewLabel.className = 'kih-preview-label';
    previewLabel.textContent = 'プレビュー';

    previewBox = document.createElement('div');
    previewBox.className = 'kih-preview-box';
    previewBox.textContent = generateText(state, template, state.format);

    previewArea.appendChild(previewLabel);
    previewArea.appendChild(previewBox);

    body.appendChild(inputArea);
    body.appendChild(previewArea);

    // フッター
    const footer = document.createElement('div');
    footer.className = 'kih-footer';

    // フォーマット選択
    const formatRow = document.createElement('div');
    formatRow.className = 'kih-format-row';

    const formatLabel = document.createElement('span');
    formatLabel.className = 'kih-format-label';
    formatLabel.textContent = 'フォーマット:';

    const compactOption = createFormatOption('compact', '圧縮', state.format === 'compact', () => {
      state.format = 'compact';
      detailedOption.querySelector('input').checked = false;
      updatePreview();
    });

    const detailedOption = createFormatOption('detailed', '詳細', state.format === 'detailed', () => {
      state.format = 'detailed';
      compactOption.querySelector('input').checked = false;
      updatePreview();
    });

    formatRow.appendChild(formatLabel);
    formatRow.appendChild(compactOption);
    formatRow.appendChild(detailedOption);

    // アクションボタン
    const actions = document.createElement('div');
    actions.className = 'kih-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'kih-btn kih-btn-secondary';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.addEventListener('click', onClose);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'kih-btn kih-btn-primary';
    copyBtn.textContent = 'コピー';
    copyBtn.addEventListener('click', () => onCopy(state));

    actions.appendChild(cancelBtn);
    actions.appendChild(copyBtn);

    footer.appendChild(formatRow);
    footer.appendChild(actions);

    popup.appendChild(header);
    popup.appendChild(body);
    popup.appendChild(footer);

    return { overlay, popup };
  }

  function createFormatOption(value, label, checked, onChange) {
    const option = document.createElement('label');
    option.className = 'kih-format-option';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'kih-format';
    radio.value = value;
    radio.checked = checked;
    radio.addEventListener('change', onChange);

    option.appendChild(radio);
    option.appendChild(document.createTextNode(label));
    return option;
  }

  function updateToggleStyle(btn, itemDef, value) {
    btn.classList.remove('positive', 'abnormal');

    // 異常値の判定
    const isAbnormal = (
      value === '+' ||
      value === '制限' ||
      value === '低下' ||
      value === '延長' ||
      value === '異常'
    );

    if (isAbnormal) {
      btn.classList.add('abnormal');
    } else if (value !== itemDef.default) {
      btn.classList.add('positive');
    }
  }

  // ============================================
  // ポップアップ表示/非表示
  // ============================================
  function showPopup() {
    if (popupElement) return; // 既に表示中

    injectStyles();
    currentState = createInitialState(HAND_TEMPLATE);

    const { overlay, popup } = createPopup(
      HAND_TEMPLATE,
      currentState,
      handleCopy,
      closePopup
    );

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    popupElement = { overlay, popup };

    // キーボードイベント
    document.addEventListener('keydown', handleKeyDown);
  }

  function closePopup() {
    if (!popupElement) return;

    document.removeEventListener('keydown', handleKeyDown);

    popupElement.overlay.remove();
    popupElement.popup.remove();
    popupElement = null;
    currentState = null;
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      closePopup();
    }
  }

  async function handleCopy(state) {
    const text = generateText(state, HAND_TEMPLATE, state.format);

    try {
      await navigator.clipboard.writeText(text);

      // HenryCoreのトースト表示（利用可能な場合）
      if (window.HenryCore?.ui?.showToast) {
        window.HenryCore.ui.showToast('クリップボードにコピーしました', 'success');
      } else {
        // フォールバック: シンプルなトースト
        showSimpleToast('クリップボードにコピーしました');
      }

      closePopup();
    } catch (e) {
      console.error(`[${SCRIPT_NAME}]`, e.message);
      if (window.HenryCore?.ui?.showToast) {
        window.HenryCore.ui.showToast('コピーに失敗しました', 'error');
      } else {
        showSimpleToast('コピーに失敗しました');
      }
    }
  }

  function showSimpleToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#333',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '20px',
      fontSize: '14px',
      zIndex: '9999',
      transition: 'opacity 0.3s',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ============================================
  // ショートカットキー登録
  // ============================================
  function handleGlobalKeyDown(e) {
    if (
      e.key.toUpperCase() === SHORTCUT_KEY.key &&
      e.ctrlKey === SHORTCUT_KEY.ctrl &&
      e.shiftKey === SHORTCUT_KEY.shift &&
      !e.altKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      if (popupElement) {
        closePopup();
      } else {
        showPopup();
      }
    }
  }

  // ============================================
  // 初期化
  // ============================================
  async function init() {
    // HenryCoreの読み込みを待機（任意、なくても動作する）
    if (window.HenryCore) {
      cleaner = window.HenryCore.utils.createCleaner();
      window.HenryCore.utils.subscribeNavigation(cleaner, () => {
        // SPA遷移時のクリーンアップ
        closePopup();
      });
    }

    // グローバルショートカットキー登録
    document.addEventListener('keydown', handleGlobalKeyDown);

    console.log(`[${SCRIPT_NAME}] Ready (v${VERSION}) - Press Ctrl+Shift+K to open`);
  }

  // DOMContentLoadedを待って初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
