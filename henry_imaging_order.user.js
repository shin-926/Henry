// ==UserScript==
// @name         外来照射オーダー
// @namespace    https://henry-app.jp/
// @version      1.7.0
// @description  独自UIとAPIで外来照射オーダーを作成（Henry UIに依存しない堅牢な実装）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_order.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_imaging_order.user.js
// ==/UserScript==

/*
 * 【外来照射オーダー作成スクリプト】
 *
 * ■ 特徴
 * - Henry本体のUIに依存せず、独自UIとGraphQL APIのみで動作
 * - DOM操作やReact Fiber操作が不要なため、Henry UIの変更に強い
 * - MutationObserverでのモーダル監視が不要
 *
 * ■ 機能
 * - 単純X線(XP)、CT、MRI、骨塩定量(MD)のオーダー作成
 * - 部位一覧をAPIから取得して選択
 * - 下書き保存でオーダー作成
 *
 * ■ 制限事項
 * - 外来診療画面でのみ動作（hrn パラメータが必要）
 * - 入院患者には未対応
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'ImagingOrder';

  // ==========================================
  // 定数・設定
  // ==========================================

  // モダリティ設定
  const MODALITY_CONFIG = {
    XP: {
      value: 'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL',
      label: '単純撮影デジタル',
      conditionKey: 'plainRadiographyDigital'
    },
    CT: {
      value: 'IMAGING_MODALITY_CT',
      label: 'CT撮影',
      conditionKey: 'ct'
    },
    MRI: {
      value: 'IMAGING_MODALITY_MRI_ABOVE_1_5_AND_BELOW_3_TESLA',
      label: 'MRI撮影',
      conditionKey: 'mriAbove_1_5AndBelow_3Tesla'
    },
    MD: {
      value: 'IMAGING_MODALITY_MD',
      label: '骨塩定量(MD法)',
      conditionKey: 'md'
    }
  };

  // 側性オプション
  // NOTE: LATERALITY_NONE以外はUNILATERAL_*形式（Henry本体のAPI仕様）
  const LATERALITY_OPTIONS = [
    { value: 'LATERALITY_NONE', label: '指定なし' },
    { value: 'UNILATERAL_LEFT', label: '左' },
    { value: 'UNILATERAL_RIGHT', label: '右' },
    { value: 'BILATERAL', label: '両側' }
  ];

  // ==========================================
  // XP用データ（部位・撮影条件・方向）
  // ==========================================
  const XP_DATA = {
    "頭〜躯幹": {
      "頭部": { bodySite: "頭部", defaultCondition: "80kVp, 25mAs, 120cm", directions: ["正面", "側面"] },
      "胸部": {
        bodySite: "胸部", defaultCondition: "110kVp, 10mAs, 200cm",
        directions: ["正面", "ポータブル正面"],
        exclusiveDirections: true,
        conditionByDirection: { "ポータブル正面": "85kVp, 18mAs, 110cm" }
      },
      "肋骨": { bodySite: "肋骨", defaultCondition: "76kVp, 63mAs, 120cm", directions: ["正面", "両斜位"] },
      "胸骨": { bodySite: "胸骨", defaultCondition: "76kVp, 63mAs, 120cm", directions: ["正面", "側面"] },
      "胸腹部": {
        bodySite: "胸腹部", defaultCondition: "80kVp, 32mAs, 120cm",
        directions: ["正面", "ポータブル正面"],
        exclusiveDirections: true,
        conditionByDirection: { "ポータブル正面": "100kVp, 70mAs, 110cm" }
      },
      "腹部": {
        bodySite: "腹部", defaultCondition: "80kVp, 32mAs, 120cm",
        directions: ["正面", "ポータブル正面"],
        exclusiveDirections: true,
        conditionByDirection: { "ポータブル正面": "85kVp, 20mAs, 110cm" }
      },
      "骨盤": { bodySite: "骨盤", defaultCondition: "80kVp, 63mAs, 120cm", directions: ["正面", "側面", "斜位（右寛骨）", "斜位（左寛骨）", "inlet", "outlet"] }
    },
    "脊椎": {
      "頚椎": { bodySite: "頚椎", defaultCondition: "70kVp, 20mAs, 120cm", directions: ["正面", "側面", "両斜位", "前後屈", "開口位正面"] },
      "胸椎": { bodySite: "胸椎", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面"] },
      "胸腰椎移行部": { bodySite: "胸腰椎移行部", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面"] },
      "腰椎": { bodySite: "腰椎", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面", "両斜位", "前後屈"] },
      "仙骨": { bodySite: "仙骨", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面"] },
      "仙尾骨": { bodySite: "仙骨/尾骨", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面"] },
      "尾骨": { bodySite: "尾骨", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面"] },
      "全脊椎": { bodySite: "脊椎", defaultCondition: "80kVp, 80mAs, 120cm", directions: ["正面", "側面"] }
    },
    "上肢": {
      "鎖骨": { bodySite: "鎖骨", defaultCondition: "70kVp, 10mAs, 120cm", directions: ["正面", "尾頭方向"] },
      "肩関節": { bodySite: "肩関節", defaultCondition: "70kVp, 10mAs, 120cm", directions: ["正面", "スカプラY", "肩関節正面", "肩関節軸位", "肩関節（上腕内外旋）"] },
      "肩鎖関節": { bodySite: "肩鎖関節", defaultCondition: "70kVp, 10mAs, 120cm", directions: ["正面"] },
      "胸鎖関節": { bodySite: "鎖骨", defaultCondition: "70kVp, 10mAs, 120cm", directions: ["正面"] },
      "肩甲骨": { bodySite: "肩甲骨", defaultCondition: "70kVp, 10mAs, 120cm", directions: ["正面", "スカプラY"] },
      "上腕骨": { bodySite: "上腕", defaultCondition: "60kVp, 10mAs, 120cm", directions: ["正面", "側面", "片斜位"] },
      "肘関節": { bodySite: "肘関節", defaultCondition: "56kVp, 10mAs, 110cm", directions: ["正面", "側面", "45°屈曲位正面", "両斜位"] },
      "前腕": { bodySite: "前腕", defaultCondition: "56kVp, 10mAs, 110cm", directions: ["正面", "側面", "両斜位"] },
      "手関節": { bodySite: "手関節", defaultCondition: "56kVp, 10mAs, 110cm", directions: ["正面", "側面", "両斜位"] },
      "舟状骨": { bodySite: "舟状骨", defaultCondition: "56kVp, 10mAs, 110cm", directions: ["正面", "側面", "斜位", "尺屈"] },
      "手部": { bodySite: "手部", defaultCondition: "56kVp, 10mAs, 110cm", directions: ["正面", "側面", "両斜位"] },
      "手根管": { bodySite: "手根管", defaultCondition: "60kVp, 12.5mAs, 110cm", directions: [] },
      "手指": { bodySite: "手指", defaultCondition: "56kVp, 10mAs, 110cm", directions: ["正面", "側面", "両斜位"] }
    },
    "下肢": {
      "股関節": { bodySite: "股関節", defaultCondition: "80kVp, 63mAs, 120cm", directions: ["正面", "ラウエン（外旋）"] },
      "大腿骨": { bodySite: "大腿骨", defaultCondition: "70kVp, 16mAs, 120cm", directions: ["正面", "側面"] },
      "膝": { bodySite: "膝関節", defaultCondition: "61kVp, 10mAs, 120cm", directions: ["正面", "側面", "両斜位", "スカイライン", "ローゼンバーグ"] },
      "下腿": { bodySite: "下腿骨", defaultCondition: "58kVp, 10mAs, 130cm", directions: ["正面", "側面", "両斜位"] },
      "足関節": { bodySite: "足関節", defaultCondition: "56kVp, 10mAs, 130cm", directions: ["正面", "側面", "両斜位"] },
      "足": { bodySite: "足", defaultCondition: "56kVp, 10mAs, 130cm", directions: ["正面", "両斜位"] },
      "踵骨": { bodySite: "踵骨", defaultCondition: "56kVp, 10mAs, 130cm", directions: ["正面", "側面", "アントンセン"] },
      "足趾": { bodySite: "足指", defaultCondition: "56kVp, 10mAs, 130cm", directions: ["正面", "側面", "両斜位"] }
    }
  };

  // CT用データ
  const CT_DATA = {
    "入院・入所時": {
      "頭部、胸腹部、脊椎": { bodySite: "胸部" }
    },
    "頭〜顔": {
      "頭蓋・脳": { bodySite: "頭部" },
      "鼻骨": { bodySite: "鼻骨" },
      "頬骨": { bodySite: "頬骨" },
      "顎関節": { bodySite: "顎関節" }
    },
    "体幹": {
      "胸部": { bodySite: "胸部" },
      "肋骨・胸部": { bodySite: "肋骨" },
      "胸腹部": { bodySite: "胸腹部" },
      "胸部〜骨盤": { bodySite: "胸腹部骨盤腔" },
      "骨盤・股関節": { bodySite: "骨盤・股関節" }
    },
    "脊椎": {
      "頚椎": { bodySite: "頚椎" },
      "胸腰椎": { bodySite: "胸椎" },
      "腰椎": { bodySite: "腰椎" },
      "仙尾骨": { bodySite: "仙骨/尾骨" }
    },
    "上肢": {
      "鎖骨": { bodySite: "鎖骨" },
      "肩関節": { bodySite: "肩関節" },
      "肩甲骨": { bodySite: "肩甲骨" },
      "上腕": { bodySite: "上腕" },
      "肘関節": { bodySite: "肘" },
      "前腕": { bodySite: "前腕" },
      "手関節": { bodySite: "手関節" },
      "手部": { bodySite: "手" }
    },
    "下肢": {
      "股関節": { bodySite: "股関節" },
      "大腿": { bodySite: "大腿骨" },
      "膝関節": { bodySite: "膝関節" },
      "下腿": { bodySite: "下腿骨" },
      "足関節": { bodySite: "足関節" },
      "踵骨": { bodySite: "踵骨" },
      "足部": { bodySite: "足" }
    }
  };

  // MRI用データ
  const MRI_DATA = {
    "頭部": {
      "脳": { bodySite: "頭部" }
    },
    "体幹": {
      "MRCP": { bodySite: "腹部" },
      "骨盤・股関節": { bodySite: "骨盤・股関節" }
    },
    "脊椎": {
      "頚椎": { bodySite: "頚椎" },
      "胸椎": { bodySite: "胸椎" },
      "胸腰椎移行部": { bodySite: "胸腰椎移行部" },
      "腰椎": { bodySite: "腰椎" },
      "腰椎・仙骨": { bodySite: "腰椎・仙骨部" }
    },
    "上肢": {
      "肩関節": { bodySite: "肩関節" },
      "手関節": { bodySite: "手関節" }
    },
    "下肢": {
      "股関節": { bodySite: "股関節" },
      "膝関節": { bodySite: "膝関節" },
      "足関節": { bodySite: "足関節" }
    }
  };

  // MD用データ（前腕固定）
  const MD_DATA = {
    "骨塩定量": {
      "前腕": { bodySite: "前腕" }
    }
  };

  // ==========================================
  // GraphQL クエリ
  // ==========================================
  const QUERIES = {
    // インライン方式: 変数定義なしで直接引数に値を渡す
    listBodySites: `
      query ListLocalBodySites {
        listLocalBodySites(input: { query: "" }) {
          bodySites {
            uuid
            name
            lateralityRequirement
          }
        }
      }
    `
    // createImagingOrder はインライン方式で動的に構築するため、ここには定義しない
  };

  // ==========================================
  // 状態管理
  // ==========================================
  let core = null;
  let bodySitesCache = null;

  // ==========================================
  // ユーティリティ関数
  // ==========================================
  const log = {
    info: (msg) => console.log(`[${SCRIPT_NAME}] ${msg}`),
    error: (msg, err) => console.error(`[${SCRIPT_NAME}] ${msg}`, err?.message || '')
  };

  // URLからencounterIdを取得
  function getEncounterId() {
    const url = new URL(location.href);
    const hrn = url.searchParams.get('hrn');
    if (!hrn) return null;

    // hrn = "//henry-app.jp/encounter/830d9891-eda3-46c4-bfd0-f293a73aca00"
    const match = hrn.match(/encounter\/([a-f0-9-]{36})/i);
    return match ? match[1] : null;
  }

  // 本日の日付を取得
  function getToday() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    };
  }

  // 日付をフォーマット
  function formatDate(date) {
    return `${date.year}.${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}`;
  }

  // 部位一覧を取得（キャッシュ付き）
  async function fetchBodySites() {
    if (bodySitesCache) return bodySitesCache;

    try {
      // インライン方式: クエリ内にinputを直接記述しているので変数は不要
      const result = await core.query(QUERIES.listBodySites);

      bodySitesCache = result.data?.listLocalBodySites?.bodySites || [];
      log.info(`部位一覧取得: ${bodySitesCache.length}件`);
      return bodySitesCache;
    } catch (e) {
      log.error('部位一覧取得失敗', e);
      return [];
    }
  }

  // UI更新（Apollo Client の refetchQueries で外来診療画面を更新）
  function refreshUI() {
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (pageWindow.__APOLLO_CLIENT__) {
      try {
        pageWindow.__APOLLO_CLIENT__.refetchQueries({ include: ['EncounterEditorQuery'] });
        log.info('EncounterEditorQuery を refetch しました');
      } catch (e) {
        log.error('refetchQueries 失敗', e);
      }
    }
  }

  // UUID生成
  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 部位名からUUIDを検索
  function findBodySiteUuid(bodySiteName, bodySites) {
    const site = bodySites.find(s => s.name === bodySiteName);
    return site?.uuid || null;
  }

  // ==========================================
  // オーダー作成（インライン方式）
  // ==========================================
  async function createOrder(orderData) {
    const patientUuid = core.getPatientUuid();
    if (!patientUuid) {
      throw new Error('患者UUIDが取得できません');
    }

    const doctorUuid = await core.getMyUuid();
    if (!doctorUuid) {
      throw new Error('医師UUIDが取得できません');
    }

    const encounterId = getEncounterId();
    if (!encounterId) {
      throw new Error('外来診療UUIDが取得できません（外来診療画面で実行してください）');
    }

    const bodySites = await fetchBodySites();
    const bodySiteUuid = findBodySiteUuid(orderData.bodySiteName, bodySites);
    if (!bodySiteUuid) {
      throw new Error(`部位「${orderData.bodySiteName}」が見つかりません`);
    }

    const modalityConfig = MODALITY_CONFIG[orderData.modality];
    if (!modalityConfig) {
      throw new Error(`不明なモダリティ: ${orderData.modality}`);
    }

    const date = orderData.date;
    const note = escapeGraphQLString(orderData.note || '');

    // XP (単純撮影デジタル) の場合
    if (orderData.modality === 'XP') {
      const directions = orderData.directions || [];
      const noteText = escapeGraphQLString(`${orderData.bodySiteName}　${directions.join('・')}`);
      const seriesUuid = generateUuid();
      const count = orderData.count || directions.length || 1;
      const shootingCondition = escapeGraphQLString(orderData.shootingCondition || '');
      const laterality = orderData.laterality || 'LATERALITY_NONE';
      const excludeBilling = orderData.excludeBilling || false;

      // インライン方式でmutationを構築
      const mutation = `
        mutation CreateImagingOrder {
          createImagingOrder(input: {
            uuid: ""
            patientUuid: "${patientUuid}"
            doctorUuid: "${doctorUuid}"
            date: { year: ${date.year}, month: ${date.month}, day: ${date.day} }
            detail: {
              uuid: ""
              imagingModality: ${modalityConfig.value}
              note: "${note}"
              condition: {
                plainRadiographyDigital: {
                  series: [{
                    uuid: "${seriesUuid}"
                    bodySiteUuid: "${bodySiteUuid}"
                    bodyPositions: [BODY_POSITION_ANY]
                    filmCount: { value: ${count} }
                    configuration: "${shootingCondition}"
                    note: "${noteText}"
                    laterality: ${laterality}
                    isAccountingIgnored: ${excludeBilling}
                  }]
                }
              }
            }
            sessionUuid: null
            revokeDescription: ""
            encounterId: { value: "${encounterId}" }
            extendedInsuranceCombinationId: null
            saveAsDraft: true
          }) {
            uuid
          }
        }
      `;

      log.info('CreateImagingOrder (XP) 実行...');
      const result = await core.query(mutation);

      if (result.data?.createImagingOrder?.uuid) {
        log.info(`オーダー作成成功: ${result.data.createImagingOrder.uuid}`);
        return result.data.createImagingOrder.uuid;
      } else {
        throw new Error('オーダー作成に失敗しました');
      }
    }

    // CT/MRI/MD の場合（インライン方式で構築）
    const seriesUuid = generateUuid();
    const shootingNote = escapeGraphQLString(orderData.shootingNote || orderData.bodySiteName);
    const laterality = orderData.laterality || 'LATERALITY_NONE';
    const excludeBilling = orderData.excludeBilling || false;

    // MDとCT/MRIでseriesの構造が異なる
    let seriesFields;
    if (orderData.modality === 'MD') {
      // MD固有のフィールド
      seriesFields = `
      uuid: "${seriesUuid}"
      bodySiteUuid: "${bodySiteUuid}"
      bodyPositions: [BODY_POSITION_ANY]
      filmSizeType: FILM_SIZE_TYPE_UNSPECIFIED
      filmFractionType: FILM_FRACTION_TYPE_UNSPECIFIED
      filmCount: { value: 1 }
      configuration: ""
      note: "${shootingNote}"
      laterality: ${laterality}
      isAccountingIgnored: ${excludeBilling}
      `;
    } else {
      // CT/MRIの共通フィールド
      seriesFields = `
      uuid: "${seriesUuid}"
      bodySiteUuid: "${bodySiteUuid}"
      filmCount: null
      configuration: ""
      note: "${shootingNote}"
      laterality: ${laterality}
      medicines: []
      isAccountingIgnored: ${excludeBilling}
      `;
    }

    const mutation = `
      mutation CreateImagingOrder {
        createImagingOrder(input: {
          uuid: ""
          patientUuid: "${patientUuid}"
          doctorUuid: "${doctorUuid}"
          date: { year: ${date.year}, month: ${date.month}, day: ${date.day} }
          detail: {
            uuid: ""
            imagingModality: ${modalityConfig.value}
            note: "${note}"
            condition: {
              ${modalityConfig.conditionKey}: {
                series: [{
                  ${seriesFields}
                }]
              }
            }
          }
          sessionUuid: null
          revokeDescription: ""
          encounterId: { value: "${encounterId}" }
          extendedInsuranceCombinationId: null
          saveAsDraft: true
        }) {
          uuid
        }
      }
    `;

    log.info(`CreateImagingOrder (${orderData.modality}) 実行...`);
    const result = await core.query(mutation);

    if (result.data?.createImagingOrder?.uuid) {
      log.info(`オーダー作成成功: ${result.data.createImagingOrder.uuid}`);
      return result.data.createImagingOrder.uuid;
    } else {
      throw new Error('オーダー作成に失敗しました');
    }
  }

  // GraphQL文字列用エスケープ
  function escapeGraphQLString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // ==========================================
  // UI構築
  // ==========================================
  function buildModalContent() {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto;';

    // 現在選択中のモダリティ
    let currentModality = 'XP';
    let currentBodyPart = null;

    // --- 照射日 ---
    const dateRow = createFormRow('照射日');
    const dateInput = core.ui.createInput({ type: 'date', value: formatDateForInput(getToday()) });
    dateInput.style.width = '160px';
    dateRow.appendChild(dateInput);
    container.appendChild(dateRow);

    // --- モダリティ ---
    const modalityRow = createFormRow('モダリティ');
    const modalitySelect = document.createElement('select');
    modalitySelect.className = 'henry-input';
    modalitySelect.style.width = '200px';
    Object.entries(MODALITY_CONFIG).forEach(([key, config]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = config.label;
      modalitySelect.appendChild(opt);
    });
    modalityRow.appendChild(modalitySelect);
    container.appendChild(modalityRow);

    // --- 備考 ---
    const noteRow = createFormRow('備考');
    const noteInput = core.ui.createTextarea({ placeholder: '備考を入力...', rows: 2 });
    noteInput.style.width = '100%';
    noteRow.appendChild(noteInput);
    container.appendChild(noteRow);

    // --- 区切り線 ---
    const divider = document.createElement('div');
    divider.style.cssText = 'border-top: 1px solid var(--henry-border); margin: 8px 0; padding-top: 8px;';
    divider.innerHTML = '<div style="font-weight: 600; color: var(--henry-text-high); margin-bottom: 8px;">撮影内容</div>';
    container.appendChild(divider);

    // --- 部位選択エリア ---
    const bodySiteSection = document.createElement('div');
    bodySiteSection.id = 'body-site-section';
    container.appendChild(bodySiteSection);

    // --- 詳細入力エリア（部位選択後に表示） ---
    const detailSection = document.createElement('div');
    detailSection.id = 'detail-section';
    detailSection.style.display = 'none';
    container.appendChild(detailSection);

    // --- 会計対象外チェック ---
    const excludeRow = document.createElement('div');
    excludeRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 8px;';
    const excludeCheck = document.createElement('input');
    excludeCheck.type = 'checkbox';
    excludeCheck.id = 'exclude-billing';
    const excludeLabel = document.createElement('label');
    excludeLabel.htmlFor = 'exclude-billing';
    excludeLabel.textContent = '会計対象外にする';
    excludeLabel.style.cssText = 'font-size: 14px; color: var(--henry-text-med);';
    excludeRow.appendChild(excludeCheck);
    excludeRow.appendChild(excludeLabel);
    container.appendChild(excludeRow);

    // モダリティ変更時の処理
    modalitySelect.addEventListener('change', () => {
      currentModality = modalitySelect.value;
      currentBodyPart = null;
      updateBodySiteSection();
      detailSection.style.display = 'none';
    });

    // 部位選択UIを更新
    function updateBodySiteSection() {
      const data = getModalityData(currentModality);
      bodySiteSection.innerHTML = '';

      Object.entries(data).forEach(([category, parts]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.cssText = 'margin-bottom: 12px;';

        const categoryLabel = document.createElement('div');
        categoryLabel.textContent = category;
        categoryLabel.style.cssText = 'font-size: 12px; color: var(--henry-text-med); margin-bottom: 4px;';
        categoryDiv.appendChild(categoryLabel);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';

        Object.entries(parts).forEach(([partName, partData]) => {
          const btn = document.createElement('button');
          btn.textContent = partName;
          btn.style.cssText = `
            padding: 6px 12px;
            font-size: 13px;
            border: 1px solid var(--henry-border);
            border-radius: 4px;
            background: var(--henry-bg-base);
            color: var(--henry-text-high);
            cursor: pointer;
            transition: all 0.15s;
          `;
          btn.addEventListener('mouseenter', () => {
            btn.style.borderColor = 'var(--henry-primary)';
            btn.style.background = 'var(--henry-primary-light)';
          });
          btn.addEventListener('mouseleave', () => {
            if (currentBodyPart !== partName) {
              btn.style.borderColor = 'var(--henry-border)';
              btn.style.background = 'var(--henry-bg-base)';
            }
          });
          btn.addEventListener('click', () => {
            currentBodyPart = partName;
            // 全カテゴリのボタンをリセット
            bodySiteSection.querySelectorAll('button').forEach(b => {
              b.style.borderColor = 'var(--henry-border)';
              b.style.background = 'var(--henry-bg-base)';
            });
            // 選択中のボタンをハイライト
            btn.style.borderColor = 'var(--henry-primary)';
            btn.style.background = 'var(--henry-primary-light)';
            // 詳細入力を表示
            showDetailSection(partName, partData);
          });

          buttonContainer.appendChild(btn);
        });

        categoryDiv.appendChild(buttonContainer);
        bodySiteSection.appendChild(categoryDiv);
      });
    }

    // 詳細入力セクションを表示
    function showDetailSection(partName, partData) {
      detailSection.innerHTML = '';
      detailSection.style.display = 'block';

      // 選択された部位を表示
      const selectedPart = document.createElement('div');
      selectedPart.style.cssText = 'font-weight: 600; color: var(--henry-primary); margin-bottom: 12px;';
      selectedPart.textContent = `選択: ${partName}`;
      detailSection.appendChild(selectedPart);

      // 方向選択（XPのみ、directions がある場合）
      if (currentModality === 'XP' && partData.directions && partData.directions.length > 0) {
        const directionRow = createFormRow('撮影方向');
        const directionContainer = document.createElement('div');
        directionContainer.id = 'direction-container';
        directionContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

        partData.directions.forEach((dir, index) => {
          const label = document.createElement('label');
          label.style.cssText = 'display: flex; align-items: center; gap: 4px; cursor: pointer;';

          const checkbox = document.createElement('input');
          checkbox.type = partData.exclusiveDirections ? 'radio' : 'checkbox';
          checkbox.name = 'shooting-direction';
          checkbox.value = dir;
          // デフォルトで最初の2つを選択（チェックボックスの場合）
          if (!partData.exclusiveDirections && index < 2) {
            checkbox.checked = true;
          }
          // ラジオボタンの場合は最初のものを選択
          if (partData.exclusiveDirections && index === 0) {
            checkbox.checked = true;
          }

          const span = document.createElement('span');
          span.textContent = dir;
          span.style.fontSize = '13px';

          label.appendChild(checkbox);
          label.appendChild(span);
          directionContainer.appendChild(label);
        });

        directionRow.appendChild(directionContainer);
        detailSection.appendChild(directionRow);
      }

      // 側性
      const lateralityRow = createFormRow('側性');
      const lateralitySelect = document.createElement('select');
      lateralitySelect.className = 'henry-input';
      lateralitySelect.id = 'laterality-select';
      lateralitySelect.style.width = '120px';
      LATERALITY_OPTIONS.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        lateralitySelect.appendChild(option);
      });
      lateralityRow.appendChild(lateralitySelect);
      detailSection.appendChild(lateralityRow);

      // 補足
      const shootingNoteRow = createFormRow('補足');
      const shootingNoteInput = core.ui.createInput({ placeholder: '補足を入力...' });
      shootingNoteInput.id = 'shooting-note-input';
      shootingNoteInput.style.width = '100%';
      shootingNoteRow.appendChild(shootingNoteInput);
      detailSection.appendChild(shootingNoteRow);
    }

    // 初期表示
    updateBodySiteSection();

    // データ収集関数を返す
    container.getData = () => {
      if (!currentBodyPart) {
        return null;
      }

      const data = getModalityData(currentModality);
      let partData = null;
      for (const category of Object.values(data)) {
        if (category[currentBodyPart]) {
          partData = category[currentBodyPart];
          break;
        }
      }

      if (!partData) {
        return null;
      }

      const orderData = {
        modality: currentModality,
        date: parseDateFromInput(dateInput.value),
        note: noteInput.value,
        bodySiteName: partData.bodySite,
        laterality: document.getElementById('laterality-select')?.value || 'LATERALITY_NONE',
        shootingNote: document.getElementById('shooting-note-input')?.value || '',
        excludeBilling: document.getElementById('exclude-billing')?.checked || false
      };

      // XP固有: 体位・枚数・撮影条件は自動設定
      if (currentModality === 'XP') {
        // 選択された方向を取得
        const directionInputs = document.querySelectorAll('#direction-container input:checked');
        orderData.directions = Array.from(directionInputs).map(input => input.value);

        // 自動設定: 体位は任意、枚数は方向数から、撮影条件はデフォルト値
        orderData.bodyPosition = 'BODY_POSITION_ANY';
        orderData.count = orderData.directions.length || 1;

        // 撮影条件: 方向別条件があればそれを使用、なければデフォルト
        if (orderData.directions.length === 1 && partData.conditionByDirection?.[orderData.directions[0]]) {
          orderData.shootingCondition = partData.conditionByDirection[orderData.directions[0]];
        } else {
          orderData.shootingCondition = partData.defaultCondition || '';
        }
      }

      // MD固有: 体位・枚数は自動設定
      if (currentModality === 'MD') {
        orderData.bodyPosition = 'BODY_POSITION_ANY';
        orderData.count = 1;
      }

      return orderData;
    };

    return container;
  }

  // フォーム行を作成
  function createFormRow(label, compact = false) {
    const row = document.createElement('div');
    row.style.cssText = compact
      ? 'display: flex; flex-direction: column; gap: 4px;'
      : 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--henry-text-med);';
    row.appendChild(labelEl);

    return row;
  }

  // 日付をinput[type=date]用にフォーマット
  function formatDateForInput(date) {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  }

  // input[type=date]から日付オブジェクトに変換
  function parseDateFromInput(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  }

  // モダリティに応じたデータを取得
  function getModalityData(modality) {
    switch (modality) {
      case 'XP': return XP_DATA;
      case 'CT': return CT_DATA;
      case 'MRI': return MRI_DATA;
      case 'MD': return MD_DATA;
      default: return {};
    }
  }

  // ==========================================
  // メインモーダル表示
  // ==========================================
  function showOrderModal() {
    const encounterId = getEncounterId();
    if (!encounterId) {
      core.ui.showToast('外来診療画面で実行してください', 'error');
      return;
    }

    const patientUuid = core.getPatientUuid();
    if (!patientUuid) {
      core.ui.showToast('患者が選択されていません', 'error');
      return;
    }

    const content = buildModalContent();

    const modal = core.ui.showModal({
      title: '外来 照射オーダー',
      content: content,
      width: '600px',
      closeOnOverlayClick: false,
      actions: [
        {
          label: 'キャンセル',
          variant: 'secondary'
        },
        {
          label: '下書き保存',
          variant: 'primary',
          autoClose: false,
          onClick: async (e, btn) => {
            const orderData = content.getData();
            if (!orderData) {
              core.ui.showToast('部位を選択してください', 'warning');
              return;
            }

            btn.disabled = true;
            btn.textContent = '保存中...';

            try {
              await createOrder(orderData);
              core.ui.showToast('オーダーを下書き保存しました', 'success');
              modal.close();
              // 下書きセクションを更新（popstate方式でSPA再ナビゲーション）
              refreshUI();
            } catch (e) {
              log.error('オーダー作成エラー', e);
              core.ui.showToast(e.message, 'error');
              btn.disabled = false;
              btn.textContent = '下書き保存';
            }
          }
        }
      ]
    });
  }

  // ==========================================
  // 初期化
  // ==========================================
  async function init() {
    // HenryCore を待機
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    let retries = 0;
    while (!pageWindow.HenryCore && retries < 50) {
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }

    if (!pageWindow.HenryCore) {
      console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
      return;
    }

    core = pageWindow.HenryCore;

    // Toolbox にプラグイン登録
    await core.registerPlugin({
      id: 'imaging-order',
      name: '照射オーダー',
      icon: 'radiology',
      description: '外来照射オーダーを作成（XP/CT/MRI/MD）',
      version: VERSION,
      order: 15,
      onClick: showOrderModal
    });

    log.info(`Ready v${VERSION}`);
  }

  // 実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
