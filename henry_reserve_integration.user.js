// ==UserScript==
// @name         予約システム連携
// @namespace    https://github.com/shin-926/Henry
// @version      4.7.28
// @description  Henryカルテと予約システム間の双方向連携（再診予約・照射オーダー自動予約・自動印刷・患者プレビュー）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      henry-app.jp
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_reserve_integration.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_reserve_integration.user.js
// ==/UserScript==

/*
 * 【予約システム連携スクリプト】
 *
 * ■ 使用場面
 * - Henry電子カルテと外部予約システム（reserve.ne.jp）の間でデータ連携が必要な場合
 * - 照射オーダー（CT/MRI等）を登録し、自動で印刷したい場合
 * - 未来日付の照射オーダーで、予約も同時に取りたい場合
 * - 予約システムで患者を選択する際に、Henryのカルテ情報をプレビューしたい場合
 *
 * ■ 主な機能
 * 1. 照射オーダー自動印刷
 *    - 外来の照射オーダー作成時に自動で印刷ダイアログを表示
 *    - 当日の場合: 即座に印刷
 *    - 未来日付の場合: 予約システム連携後に印刷
 *
 * 2. Henry→予約システム（照射オーダーモード）
 *    - 未来日付の照射オーダー保存時に自動で予約システムを開く
 *    - 予約完了後、その日付で外来予約を自動作成
 *    - 予約完了後に印刷を実行
 *
 * 3. Henry→予約システム（再診予約モード）
 *    - Henryのツールボックスから予約システムを開く
 *    - 患者ID・日付を自動入力
 *
 * 4. 予約システム→Henry（患者プレビュー）
 *    - 予約システムのツールチップに「カルテ」ボタンを追加
 *    - ホバーで過去のカルテ内容をプレビュー表示
 *
 * ■ 関連スクリプト
 * - henry_core.user.js: API呼び出し、ユーティリティ
 *
 * ■ SPA遷移対応
 * - subscribeNavigation: 不要
 * - 理由: 全ページで常に動作するスクリプト
 *   - fetchインターセプト（照射オーダー検出）は全ページで必要
 *   - プラグイン登録は一度だけでOK（Toolbox側で管理）
 *   - トークン同期リスナーも全ページで必要
 *
 * ■ ファイル構成について
 * - 意図的に単一ファイルとしている（分割しない）
 * - 理由:
 *   - @require依存関係の管理が複雑になる
 *   - ローダーでの読み込み順序を考慮する必要がある
 *   - 複数ファイルのバージョン管理オーバーヘッド
 *   - 現状でもセクションコメントで十分に整理されている
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'HenryReserveIntegration';
  const CONFIG = {
    // API
    HENRY_GRAPHQL: 'https://henry-app.jp/graphql',
    HENRY_GRAPHQL_V2: 'https://henry-app.jp/graphql-v2',
    HENRY_PATIENT_URL: 'https://henry-app.jp/patients/',
    // タイムアウト
    HENRY_CORE_TIMEOUT: 5000,
    TOKEN_REQUEST_TIMEOUT: 3000,
    OBSERVER_TIMEOUT: 10000,
    CONTEXT_EXPIRY: 5 * 60 * 1000,
    POST_MESSAGE_TIMEOUT: 1000,
    WINDOW_CHECK_INTERVAL: 500,
    TRANSITION_DURATION: 200,
    // UI
    POLLING_INTERVAL: 100,
    HOVER_DELAY: 150,
    CLOSE_DELAY: 300,
    NOTIFICATION_DURATION: 3000,
    PREVIEW_COUNT: 3,
    PLUGIN_ORDER: 30,
    DEFAULT_TIME: '09:00',
    // z-index (Henry ログインモーダル=1600 より下に配置)
    Z_INDEX_OVERLAY: 1500,
    Z_INDEX_POPUP: 1500,
    // 印刷
    PRINT_DELAY_MS: 500,
    PRINT_COOLDOWN_MS: 3000,
    PRINT_MAX_SERIES_ROWS: 6,
    // DOM操作
    DOM_TRAVERSE_MAX_DEPTH: 5
  };

  // 照射オーダー処理中フラグ（二重インターセプト防止）
  let isProcessingImagingOrder = false;

  // 処理済みリクエストを保存（再インターセプト防止）
  // キー: patientUuid + "_" + date (例: "abc-123_2026-02-06")
  const processedRequests = new Set();

  // スタイル定数
  const STYLES = {
    overlay: `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: ${CONFIG.Z_INDEX_OVERLAY};
      display: none;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.15s ease-out;
    `,
    messageBox: `
      background: white;
      border-radius: 12px;
      padding: 32px 48px;
      text-align: center;
      font-family: sans-serif;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `,
    title: 'font-size: 18px; font-weight: bold; color: #1565C0; margin-bottom: 16px;',
    message: 'font-size: 14px; color: #666; margin-bottom: 24px;',
    cancelBtn: `
      padding: 10px 32px;
      font-size: 14px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      color: #333;
    `,
    notification: (type) => `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      z-index: ${CONFIG.Z_INDEX_OVERLAY};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      background-color: ${type === 'success' ? '#00cc92' : type === 'error' ? '#e53935' : '#2196f3'};
    `,
    previewWindow: `
      position: fixed;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 12px;
      z-index: ${CONFIG.Z_INDEX_POPUP};
      overflow-y: auto;
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 13px;
      display: none;
      box-sizing: border-box;
    `,
    karteInfo: `
      background-color: #f0f8ff;
      padding: 10px;
      margin-top: 10px;
      border-top: 2px solid #4682B4;
      font-size: 12px;
    `,
    // Reserve側バナー共通
    bannerBase: `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 12px 20px;
      font-size: 14px;
      font-family: sans-serif;
      z-index: 999;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `,
    // ログイン通知バナー
    noticeBanner: `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background-color: #FFF3CD;
      color: #856404;
      padding: 10px 20px;
      font-size: 14px;
      font-family: sans-serif;
      z-index: 999;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `,
    // カルテボタン
    karteBtn: 'padding: 5px 14px; margin-left: 12px;'
  };

  // GraphQL クエリ定義（フルクエリ方式）
  const QUERIES = {
    GetPatient: `
      query GetPatient($input: GetPatientRequestInput!) {
        getPatient(input: $input) {
          serialNumber
          fullName
          fullNamePhonetic
        }
      }
    `,
    ListPurposeOfVisits: `
      query ListPurposeOfVisits($input: ListPurposeOfVisitRequestInput!) {
        listPurposeOfVisits(input: $input) {
          purposeOfVisits {
            uuid
            title
            order { value }
          }
        }
      }
    `,
    CreateSession: `
      mutation CreateSession($input: SessionInput!) {
        createSession(input: $input) {
          uuid
          encounterId { value }
        }
      }
    `,
    ListPatientsV2: `
      query ListPatientsV2($input: ListPatientsV2RequestInput!) {
        listPatientsV2(input: $input) {
          entries {
            patient {
              uuid
              serialNumber
            }
          }
        }
      }
    `,
    EncountersInPatient: `
      query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
        encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
          encounters {
            basedOn {
              ... on Session {
                scheduleTime
                doctor {
                  name
                }
              }
            }
            records(includeDraft: false) {
              __typename
              ... on ProgressNote {
                editorData
              }
            }
          }
        }
      }
    `,
    GetEncounterDepartment: `
      query GetEncounterDepartment($id: ID!) {
        encounter(id: $id) {
          basedOn {
            ... on Session {
              doctor {
                departmentName
              }
            }
          }
        }
      }
    `,
    ListPatientHospitalizations: `
      query ListPatientHospitalizations($input: ListPatientHospitalizationsRequestInput!) {
        listPatientHospitalizations(input: $input) {
          hospitalizations {
            uuid
            state
            startDate { year month day }
            endDate { year month day }
          }
        }
      }
    `,
    ListSessions: `
      query ListSessions($input: ListSessionsRequestInput!) {
        listSessions(input: $input) {
          sessions {
            uuid
            scheduleTime { seconds }
            doctorUuid
            encounterId { value }
            patient {
              uuid
            }
          }
        }
      }
    `
  };

  const log = {
    info: (msg) => console.log(`[${SCRIPT_NAME}] ${msg}`),
    warn: (msg) => console.warn(`[${SCRIPT_NAME}] ${msg}`),
    error: (msg) => console.error(`[${SCRIPT_NAME}] ${msg}`)
  };

  const host = location.hostname;
  const isHenry = host === 'henry-app.jp';
  const isReserve = host === 'manage-maokahp.reserve.ne.jp';

  // ==========================================
  // 共通関数
  // ==========================================

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 日付オブジェクトを比較用の数値に変換（YYYYMMDD形式）
  function dateToNumber(dateObj) {
    return dateObj.year * 10000 + dateObj.month * 100 + dateObj.day;
  }

  // 患者が指定日時点で入院中/入院予定かどうかを判定
  async function isHospitalizedOnDate(HenryCore, patientUuid, orderDateObj) {
    try {
      const result = await HenryCore.query(QUERIES.ListPatientHospitalizations, {
        input: { patientUuid, pageSize: 50, pageToken: '' }
      });
      const hospitalizations = result.data?.listPatientHospitalizations?.hospitalizations || [];
      const orderDate = dateToNumber(orderDateObj);

      return hospitalizations.some(h => {
        if (h.state === 'ADMITTED') {
          // 入院中 → 常にtrue
          return true;
        }
        if (h.state === 'WILL_ADMIT' && h.startDate) {
          // 入院予定 → 照射オーダー日が入院予定日以降ならtrue
          const admitDate = dateToNumber(h.startDate);
          return orderDate >= admitDate;
        }
        return false;
      });
    } catch (e) {
      log.error('入院状態取得エラー: ' + e.message);
      return false; // エラー時は外来扱い（安全側に倒す）
    }
  }

  // ==========================================
  // 印刷関連ユーティリティ（Henry側で使用）
  // ==========================================

  const formatPrintDate = (date) => {
    if (!date) return '';
    const { year, month, day } = date;
    const d = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}（${weekdays[d.getDay()]}）`;
  };

  const formatBirthDate = (date) => {
    if (!date) return '';
    const { year, month, day } = date;
    const now = new Date();
    const birth = new Date(year, month - 1, day);
    let age = now.getFullYear() - birth.getFullYear();
    if (now < new Date(now.getFullYear(), month - 1, day)) age--;

    // 和暦計算
    let eraName = '';
    let eraYear = 0;
    if (year >= 2019) {
      eraName = 'R';
      eraYear = year - 2018;
    } else if (year >= 1989) {
      eraName = 'H';
      eraYear = year - 1988;
    } else if (year >= 1926) {
      eraName = 'S';
      eraYear = year - 1925;
    }

    return `${year}(${eraName}${eraYear})/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')} ${age}歳`;
  };

  const formatSex = (sexType) => {
    switch (sexType) {
      case 'SEX_TYPE_MALE': return '男性';
      case 'SEX_TYPE_FEMALE': return '女性';
      default: return '';
    }
  };

  const formatModality = (modality) => {
    const map = {
      'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL': '単純撮影デジタル',
      'IMAGING_MODALITY_PLAIN_RADIOGRAPHY_ANALOG': '単純撮影アナログ',
      'IMAGING_MODALITY_CT': 'CT',
      'IMAGING_MODALITY_MRI_ABOVE_1_5_AND_BELOW_3_TESLA': 'MRI（1.5テスラ以上3テスラ未満）',
      'IMAGING_MODALITY_MD': '骨塩定量検査（MD法）',
    };
    return map[modality] || modality || '';
  };

  const formatLaterality = (laterality) => {
    const map = {
      'LATERALITY_LEFT': '左',
      'LATERALITY_RIGHT': '右',
      'LATERALITY_BOTH': '両',
      'UNILATERAL_LEFT': '左',
      'UNILATERAL_RIGHT': '右',
      'BILATERAL': '両',
      // LATERALITY_NONE, UNILATERAL_UNSPECIFIED は空欄
    };
    return map[laterality] || '';
  };

  const formatBodyPosition = (positions) => {
    if (!positions || positions.length === 0) return '';
    const map = {
      'BODY_POSITION_ANY': '任意',
      'BODY_POSITION_FRONT': '正面',
      'BODY_POSITION_SIDE': '側面',
      'BODY_POSITION_OBLIQUE': '斜位',
    };
    return positions.map(p => map[p] || p).join('・');
  };

  // ==========================================
  // 認証ヘッダーキャプチャ（印刷用API呼び出しに使用）
  // ==========================================

  const AuthCapture = {
    authorization: null,
    organizationUuid: null,

    capture(args) {
      try {
        const options = args[1];
        if (!options?.headers) return;

        const headers = options.headers;
        if (headers instanceof Headers) {
          const auth = headers.get('authorization');
          const org = headers.get('x-auth-organization-uuid');
          if (auth) this.authorization = auth;
          if (org) this.organizationUuid = org;
        } else if (typeof headers === 'object') {
          for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === 'authorization') this.authorization = value;
            if (key.toLowerCase() === 'x-auth-organization-uuid') this.organizationUuid = value;
          }
        }
      } catch (e) {
        // キャプチャエラーは無視
      }
    },

    getHeaders() {
      const headers = {};
      if (this.authorization) headers['authorization'] = this.authorization;
      if (this.organizationUuid) headers['x-auth-organization-uuid'] = this.organizationUuid;
      return headers;
    },

    hasAuth() {
      return !!this.authorization;
    }
  };

  // ==========================================
  // 印刷用データ取得
  // ==========================================

  const PrintDataFetcher = {
    originalFetch: null,

    setOriginalFetch(fetchFn, context) {
      // fetchはネイティブメソッドなので、正しいコンテキスト（window）にバインドが必要
      this.originalFetch = fetchFn.bind(context);
    },

    async getPatient(patientUuid) {
      if (!patientUuid || !this.originalFetch) return null;

      if (!AuthCapture.hasAuth()) {
        log.error('認証情報がキャプチャされていません');
        return null;
      }

      // NOTE: GraphQL変数方式を使用（直接埋め込みはインジェクションリスクあり）
      const query = `
        query GetPatient($input: GetPatientRequestInput!) {
          getPatient(input: $input) {
            uuid
            serialNumber
            serialNumberPrefix
            fullName
            fullNamePhonetic
            detail {
              sexType
              birthDate {
                year
                month
                day
              }
            }
          }
        }
      `;

      try {
        const response = await this.originalFetch(CONFIG.HENRY_GRAPHQL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...AuthCapture.getHeaders()
          },
          credentials: 'include',
          body: JSON.stringify({
            operationName: 'GetPatient',
            query: query,
            variables: { input: { uuid: patientUuid } }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        return json.data?.getPatient || null;
      } catch (e) {
        log.error(`患者情報取得エラー: ${e.message}`);
        return null;
      }
    },

    async getDepartmentName(encounterId) {
      if (!encounterId) return '';

      try {
        const HenryCore = unsafeWindow.HenryCore;
        if (!HenryCore) {
          log.warn('HenryCoreが見つかりません');
          return '';
        }

        const result = await HenryCore.query(QUERIES.GetEncounterDepartment, { id: encounterId });
        return result.data?.encounter?.basedOn?.[0]?.doctor?.departmentName || '';
      } catch (e) {
        log.error(`診療科取得エラー: ${e.message}`);
        return '';
      }
    }
  };

  // ==========================================
  // 印刷用HTML生成
  // ==========================================

  const HtmlGenerator = {
    generate(order, patient, departmentName, isHospitalized = false) {
      const now = new Date();
      const issueDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const patientId = `${patient.serialNumberPrefix || ''}${patient.serialNumber || ''}`;
      const fullNamePhonetic = escapeHtml(patient.fullNamePhonetic || '');
      const sex = formatSex(patient.detail?.sexType);
      const birthDate = formatBirthDate(patient.detail?.birthDate);

      const modality = formatModality(order.detail?.imagingModality);
      const orderDate = formatPrintDate(order.date);
      const doctorName = escapeHtml(order.doctor?.name || '');
      const note = escapeHtml(order.detail?.note || '');

      const series = this._extractSeries(order.detail?.condition);

      // オリジナルのHenry印刷スタイルをそのまま使用
      const css = `
/* CSS Reset (Henry原版) */
html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, menu, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, main, menu, nav, output, ruby, section, summary, time, mark, audio, video {
  margin: 0;
  padding: 0;
  border: 0;
  font: inherit;
  vertical-align: baseline;
}
article, aside, details, figcaption, figure, footer, header, hgroup, main, menu, nav, section { display: block; }
[hidden] { display: none; }
body { line-height: 1; }
menu, ol, ul { list-style: none; }
blockquote, q { quotes: none; }
blockquote::before, blockquote::after, q::before, q::after { content: none; }
table { border-collapse: collapse; border-spacing: 0; }
body {
  font-family: "Noto Sans JP";
  font-weight: normal;
  font-size: 14px;
  line-height: 24px;
  color: rgb(0, 0, 0);
}
* { box-sizing: border-box; print-color-adjust: exact; }
a { text-decoration: none; }

/* ページコンテナ */
.page-container { position: relative; }
.page {
  background: rgb(255, 255, 255);
  box-shadow: rgba(0, 0, 0, 0.13) 0px 1px 5px, rgba(0, 0, 0, 0.03) 0px 3px 4px, rgba(0, 0, 0, 0.06) 0px 2px 4px, rgba(0, 0, 0, 0.06) 0px 0px 1px;
  min-height: 300pt;
}

/* グリッドレイアウト */
.grid-row {
  display: grid;
  column-gap: 0;
  grid-template-columns: repeat(2, max-content);
  align-items: flex-start;
  justify-content: space-between;
  width: auto;
  height: auto;
}

/* タイポグラフィ */
.title {
  font-family: "Noto Sans JP";
  font-size: 20pt;
  line-height: 28pt;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.82);
}
.issue-date {
  font-family: "Noto Sans JP";
  font-size: 12pt;
  line-height: 20pt;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.82);
}
.patient-label {
  font-family: "Noto Sans JP";
  font-size: 9pt;
  line-height: 15pt;
  color: rgba(0, 0, 0, 0.82);
  font-weight: 600;
  padding-top: 4px;
  padding-bottom: 4px;
}
.patient-name {
  font-family: "Noto Sans JP";
  font-size: 12pt;
  line-height: 20pt;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.82);
}
.patient-detail {
  font-family: "Noto Sans JP";
  font-size: 9pt;
  line-height: 15pt;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.82);
}

/* 署名テーブル */
.signature-table {
  border-collapse: collapse;
  border: 1pt solid black;
}
.signature-table tr {
  border-collapse: collapse;
  border: 1pt solid black;
}
.signature-table th {
  border-bottom: 1pt solid transparent;
  border-right: 1pt solid black;
  padding-top: 5pt;
  text-align: center;
}
.signature-table td {
  width: 72pt;
  border-collapse: collapse;
  border: 1pt solid black;
  text-align: center;
  vertical-align: middle;
  height: 71pt;
}

/* オーダー情報テーブル */
.order-table {
  border-collapse: collapse;
  border: 1px solid black;
  margin-top: 28px;
  width: 100%;
}
.order-table tr {
  border-collapse: collapse;
  border: 1px solid black;
}
.order-table th {
  border-collapse: collapse;
  border: 1px solid black;
  padding: 4px 8px;
  font-weight: bold;
  text-align: center;
  width: 15%;
  min-width: 90px;
}
.order-table td {
  border-collapse: collapse;
  border: 1px solid black;
  padding: 4px 8px;
  overflow-wrap: break-word;
  word-break: break-all;
  white-space: normal;
  vertical-align: middle;
}

/* 指示内容テーブル */
.series-table {
  border-collapse: collapse;
  border: 1px solid black;
  margin-top: 22px;
  width: 100%;
}
.series-table tr {
  border-collapse: collapse;
  border: 1px solid black;
}
.series-table th {
  border-collapse: collapse;
  border: 1px solid black;
  padding: 4px 8px;
  font-weight: bold;
  text-align: center;
  width: 15%;
}
.series-table td {
  border-collapse: collapse;
  border: 1px solid black;
  padding: 4px 8px;
  overflow-wrap: break-word;
  word-break: break-all;
  white-space: normal;
  vertical-align: middle;
  text-align: center;
}

/* セクション間の余白（overflow: hiddenでマージン相殺を防止） */
section { overflow: hidden; }
section + section { margin-top: 16px; }

/* 印刷時のリセット */
html, body { margin: 0; padding: 0; }

@media print {
  @page { size: A4; }
  body { width: 100%; zoom: 1; margin: 0; padding: 0; }
  .page { break-after: page; box-shadow: none; margin: 0; }
}

/* 安全点検項目 */
.safety-section {
  margin-top: 20px;
  padding-top: 4px;
}
.safety-header {
  display: flex;
  justify-content: space-between;
}
.safety-title {
  font-family: "Noto Sans JP";
  font-size: 21px;
  font-weight: 700;
  line-height: 24px;
  color: rgb(0, 0, 0);
}
.safety-confirmer {
  font-family: "Noto Sans JP";
  font-size: 14px;
  line-height: 24px;
  color: rgb(0, 0, 0);
}
.safety-body {
  display: flex;
  gap: 12px;
}
.safety-body ul {
  flex: 1;
  list-style: disc;
  margin: 0;
  padding: 0 0 0 21px;
}
.safety-body li {
  margin-top: 8px;
}
.safety-item {
  display: flex;
  font-family: "Noto Sans JP";
  font-size: 14px;
  line-height: 24px;
  color: rgb(0, 0, 0);
}
.safety-item .label {
  flex-grow: 1;
}
.safety-item .option {
  width: 30px;
  flex-shrink: 0;
}
      `;

      return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(patient.fullName || '')} - 外来カルテ - 医社）弘徳会マオカ病院</title>
  <style>${css}</style>
</head>
<body>
  <div class="page-container">
    <div class="page">
      <section>
        <div class="grid-row">
          <h1 class="title">照射録</h1>
          <h2 class="issue-date">発行日時 ${issueDateTime}</h2>
        </div>
        <div class="grid-row">
          <div>
            <p class="patient-label">患者</p>
            <h2 class="patient-name">${escapeHtml(patient.fullName || '')}</h2>
            <p class="patient-detail">${patientId} ${fullNamePhonetic} ${sex}</p>
            <p class="patient-detail">生年月日 ${birthDate}</p>
            <p class="patient-detail">${isHospitalized ? '入院' : '外来'}: ${escapeHtml(departmentName)}</p>
          </div>
          <table class="signature-table">
            <tbody>
              <tr>
                <th>(医師署名)</th>
                <th>(技師署名)</th>
              </tr>
              <tr>
                <td>${doctorName}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <table class="order-table">
          <tbody>
            <tr><th>指示医師</th><td>${doctorName}</td></tr>
            <tr><th>照射日時</th><td><span>${orderDate}</span></td></tr>
            <tr><th>モダリティ</th><td>${escapeHtml(modality)}</td></tr>
            <tr><th>備考</th><td><span>${note}</span></td></tr>
          </tbody>
        </table>
      </section>
      <section>
        ${this._generateSeriesTable(order.detail?.condition, series)}
      </section>
      ${this._isMri(order.detail?.condition) ? this._generateSafetyChecklist() : ''}
    </div>
  </div>
</body>
</html>
      `.trim();
    },

    // 前提: 1オーダー = 1モダリティ（最初に見つかったモダリティのみ返す）
    // 複数モダリティ対応が必要になった場合は、ループを継続して結果を結合する
    _extractSeries(condition) {
      if (!condition) return [];

      // モダリティごとの設定（データ構造の差分を吸収）
      const modalityConfigs = [
        // 単純撮影（デジタル/アナログ）: 全フィールド使用
        { key: 'plainRadiographyDigital', arrayKey: 'series', includeAllFields: true },
        { key: 'plainRadiographyAnalog', arrayKey: 'series', includeAllFields: true },
        // CT/MRI: bodySite, laterality, note のみ
        { key: 'ct', arrayKey: 'series', includeAllFields: false },
        { key: 'mriAbove_1_5AndBelow_3Tesla', arrayKey: 'series', includeAllFields: false },
        // MD（骨塩定量）: series を使用、全フィールド出力
        { key: 'md', arrayKey: 'series', includeAllFields: true },
      ];

      for (const config of modalityConfigs) {
        const modalityData = condition[config.key];
        const items = modalityData?.[config.arrayKey];
        if (!items) continue;

        return items.map(s => ({
          bodySite: s.bodySite?.name || '',
          laterality: formatLaterality(s.laterality),
          bodyPositions: config.includeAllFields ? formatBodyPosition(s.bodyPositions) : '',
          configuration: config.includeAllFields ? (s.configuration || '') : '',
          filmCount: config.includeAllFields ? (s.filmCount?.value || '') : '',
          note: config.noteFromParent ? (modalityData.note || '') : (s.note || ''),
        }));
      }

      return [];
    },

    _generateSeriesTable(condition, series) {
      const hasBodyPosition = this._needsBodyPositionColumn(condition);
      const maxRows = CONFIG.PRINT_MAX_SERIES_ROWS;

      if (hasBodyPosition) {
        // 単純撮影用: 7列（方向列あり）
        let rows = '';
        for (let i = 0; i < maxRows; i++) {
          const s = series[i] || {};
          rows += `
            <tr>
              <td style="width: 4%;">${i + 1}</td>
              <td style="width: 8%;">${escapeHtml(s.bodySite || '')}</td>
              <td style="width: 8%;">${s.laterality || ''}</td>
              <td style="width: 16%;">${escapeHtml(s.bodyPositions || '')}</td>
              <td style="width: 30%;">${escapeHtml(s.configuration || '')}</td>
              <td style="width: 10%;">${s.filmCount || ''}</td>
              <td style="width: 24%;">${escapeHtml(s.note || '')}</td>
            </tr>`;
        }
        return `
        <table class="series-table">
          <thead>
            <tr><th colspan="7">指示内容</th></tr>
            <tr>
              <td style="width: 4%;"></td>
              <td style="width: 8%;">部位</td>
              <td style="width: 8%;">側性</td>
              <td style="width: 16%;">方向</td>
              <td style="width: 30%;">撮影条件</td>
              <td style="width: 10%;">枚数</td>
              <td style="width: 24%;">補足</td>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
      } else {
        // CT/MRI/MD用: 6列（方向列なし）
        let rows = '';
        for (let i = 0; i < maxRows; i++) {
          const s = series[i] || {};
          rows += `
            <tr>
              <td style="width: 4%;">${i + 1}</td>
              <td style="width: 8%;">${escapeHtml(s.bodySite || '')}</td>
              <td style="width: 8%;">${s.laterality || ''}</td>
              <td style="width: 28%;">${escapeHtml(s.configuration || '')}</td>
              <td style="width: 10%;">${s.filmCount || ''}</td>
              <td style="width: 42%;">${escapeHtml(s.note || '')}</td>
            </tr>`;
        }
        return `
        <table class="series-table">
          <thead>
            <tr><th colspan="6">指示内容</th></tr>
            <tr>
              <td style="width: 4%;"></td>
              <td style="width: 8%;">部位</td>
              <td style="width: 8%;">側性</td>
              <td style="width: 28%;">撮影条件</td>
              <td style="width: 10%;">枚数</td>
              <td style="width: 42%;">補足</td>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
      }
    },

    _isMri(condition) {
      return !!condition?.mriAbove_1_5AndBelow_3Tesla;
    },

    // 単純撮影・MD（骨塩定量）の場合は「方向」列が必要
    _needsBodyPositionColumn(condition) {
      if (!condition) return false;
      return !!(condition.plainRadiographyDigital || condition.plainRadiographyAnalog || condition.md);
    },

    _generateSafetyChecklist() {
      const leftItems = [
        '心臓ペースメーカー',
        '脳動脈クリップ',
        '外科用クリップ',
        '人工関節',
        '人工聴器（埋込）',
        'その他の体内金属',
      ];
      const rightItems = [
        '義眼',
        '人工弁',
        '妊娠（　　　週）',
        '重篤な発作の可能性',
        '薬物アレルギー',
        '貴金属を身に着けていないか',
      ];

      const renderItem = (label) => `
        <li><div class="safety-item">
          <span class="label">${escapeHtml(label)}</span>
          <span class="option">有</span>
          <span class="option">無</span>
        </div></li>`;

      const leftHtml = leftItems.map(renderItem).join('');
      const rightHtml = rightItems.map(renderItem).join('');

      return `
      <section class="safety-section">
        <header class="safety-header">
          <h2 class="safety-title">安全点検項目</h2>
          <div class="safety-confirmer">確認者名（　　　　　　　　）</div>
        </header>
        <div class="safety-body">
          <ul>${leftHtml}</ul>
          <ul>${rightHtml}</ul>
        </div>
      </section>`;
    },
  };

  // ==========================================
  // 印刷実行
  // ==========================================

  const Printer = {
    lastPrintTime: 0,

    async print(orderData, isHospitalized = false) {
      // クールダウンチェック
      const now = Date.now();
      if (now - this.lastPrintTime < CONFIG.PRINT_COOLDOWN_MS) {
        log.warn('クールダウン中のため印刷スキップ');
        return;
      }
      this.lastPrintTime = now;

      log.info(`印刷開始: orderUuid=${orderData.uuid?.substring(0, 8)}...`);

      const patientUuid = orderData.patientUuid;
      const encounterId = orderData.encounterId?.value;

      const [patient, departmentName] = await Promise.all([
        PrintDataFetcher.getPatient(patientUuid),
        PrintDataFetcher.getDepartmentName(encounterId)
      ]);

      if (!patient) {
        log.error('患者情報の取得に失敗しました');
        return;
      }

      log.info('印刷データ取得完了');

      const html = HtmlGenerator.generate(orderData, patient, departmentName, isHospitalized);

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 0; height: 0;';
      document.body.appendChild(iframe);

      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();

      iframe.onload = () => {
        try {
          iframe.contentWindow.print();
          log.info('印刷ダイアログを表示しました');
        } catch (e) {
          log.error(`印刷エラー: ${e.message}`);
        } finally {
          setTimeout(() => {
            iframe.remove();
          }, 1000);
        }
      };
    },
  };

  // ==========================================
  // ブロッキングオーバーレイ（Henry側で使用）
  // ==========================================

  // オーバーレイ関連の状態を一元管理
  const OverlayState = {
    blockingOverlay: null,  // { overlay: HTMLElement, title: HTMLElement }
    reserveWindowRef: null  // Window reference
  };

  function createBlockingOverlay() {
    if (OverlayState.blockingOverlay) return OverlayState.blockingOverlay;

    // オーバーレイ
    const overlay = document.createElement('div');
    overlay.id = 'henry-reserve-blocking-overlay';
    overlay.style.cssText = STYLES.overlay;

    // メッセージボックス
    const messageBox = document.createElement('div');
    messageBox.style.cssText = STYLES.messageBox;

    const title = document.createElement('div');
    title.id = 'henry-blocking-title';
    title.style.cssText = STYLES.title;
    title.textContent = '予約システム';

    const message = document.createElement('div');
    message.style.cssText = STYLES.message;
    message.textContent = '予約システムで操作してください。\n完了したらこの画面に戻ります。';
    message.style.whiteSpace = 'pre-line';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.style.cssText = STYLES.cancelBtn;
    cancelBtn.addEventListener('click', () => closeBlockingOverlay(true));
    cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#e0e0e0');
    cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#f5f5f5');

    messageBox.appendChild(title);
    messageBox.appendChild(message);
    messageBox.appendChild(cancelBtn);
    overlay.appendChild(messageBox);

    document.body.appendChild(overlay);

    OverlayState.blockingOverlay = { overlay, title };

    // postMessage を受信（予約システムからの閉じる要求）
    window.addEventListener('message', (e) => {
      if (e.origin !== 'https://manage-maokahp.reserve.ne.jp') return;
      if (e.data?.type === 'overlay-close') {
        log.info('postMessage受信: オーバーレイを閉じます');
        closeBlockingOverlay(false);
        // 閉じたことを予約システムに通知
        if (e.source) {
          e.source.postMessage({ type: 'overlay-closed' }, e.origin);
        }
      }
    });

    return OverlayState.blockingOverlay;
  }

  function openReserveWithOverlay(url, titleText) {
    const { overlay, title } = createBlockingOverlay();

    title.textContent = titleText || '予約システム';

    // 古いウィンドウがあれば閉じる
    if (OverlayState.reserveWindowRef && !OverlayState.reserveWindowRef.closed) {
      OverlayState.reserveWindowRef.close();
    }

    // 予約システムを別ウィンドウで開く
    const width = window.screen.availWidth;
    const height = window.screen.availHeight;
    OverlayState.reserveWindowRef = window.open(url, 'reserveWindow', `width=${width},height=${height},left=0,top=0`);

    // オーバーレイを表示
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';
    // 次フレームで opacity を変更（トランジションを有効にするため）
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // ウィンドウが閉じられたかを監視
    const checkWindowClosed = setInterval(() => {
      if (OverlayState.reserveWindowRef && OverlayState.reserveWindowRef.closed) {
        clearInterval(checkWindowClosed);
        // ウィンドウが閉じられた場合、キャンセル扱い（予約成功時はGM_valueで先に検知される）
        const context = GM_getValue('imagingOrderContext', null);
        if (context) {
          closeBlockingOverlay(true);
        } else {
          closeBlockingOverlay(false);
        }
      }
    }, CONFIG.WINDOW_CHECK_INTERVAL);

    log.info('予約システムを開きました（オーバーレイ表示）:', url);
  }

  function closeBlockingOverlay(cancelled = false) {
    if (!OverlayState.blockingOverlay) return;

    const { overlay } = OverlayState.blockingOverlay;

    // キャンセル時
    if (cancelled) {
      const context = GM_getValue('imagingOrderContext', null);
      if (context) {
        GM_setValue('reservationResult', { cancelled: true, timestamp: Date.now() });
        GM_setValue('imagingOrderContext', null);
        log.info('オーバーレイ閉じ - キャンセル結果を送信');
      }
      // ウィンドウも閉じる
      if (OverlayState.reserveWindowRef && !OverlayState.reserveWindowRef.closed) {
        OverlayState.reserveWindowRef.close();
      }
    }

    // 即座に透明化してクリックを透過（display:none より先に）
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    // トランジション完了後に display:none
    setTimeout(() => {
      overlay.style.display = 'none';
    }, CONFIG.TRANSITION_DURATION);
    log.info('ブロッキングオーバーレイを閉じました');
  }

  function callHenryAPI(token, operationName, variables, endpoint) {
    const query = QUERIES[operationName];
    if (!query) {
      return Promise.reject(new Error(`Unknown operation: ${operationName}`));
    }

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-organization-uuid': unsafeWindow.HenryCore.config.orgUuid
        },
        data: JSON.stringify({
          operationName,
          variables,
          query
        }),
        onload: (res) => {
          if (res.status !== 200) {
            reject(new Error(`API Error: ${res.status}`));
            return;
          }
          try {
            resolve(JSON.parse(res.responseText));
          } catch (e) {
            reject(new Error('レスポンスのパースに失敗'));
          }
        },
        onerror: () => reject(new Error('通信エラー'))
      });
    });
  }

  // ==========================================
  // Henry側の処理
  // ==========================================
  if (isHenry) {
    log.info('Henry モード起動');

    // --------------------------------------------
    // HenryCore待機
    // --------------------------------------------
    const HENRY_CORE_URL = 'https://raw.githubusercontent.com/shin-926/Henry/main/henry_core.user.js';


    function showHenryCoreRequiredMessage() {
      alert(
        '【Henry Coreが必要です】\n\n' +
        'このスクリプトを使用するには「Henry Core」が必要です。\n\n' +
        '【インストール手順】\n' +
        '1. 以下のURLをコピーしてブラウザで開く\n' +
        '2. Tampermonkeyのインストール画面で「インストール」をクリック\n' +
        '3. このページを再読み込み\n\n' +
        '【URL】\n' +
        HENRY_CORE_URL
      );
    }

    // --------------------------------------------
    // トークンをGM_storageに同期（Reserve側で使用）
    // --------------------------------------------
    async function syncTokenToGMStorage() {
      try {
        let HenryCore;
        try { HenryCore = await waitForHenryCore(); } catch {
          log.warn('HenryCoreが見つかりません');
          return;
        }

        const token = await HenryCore.getToken();
        if (token) {
          GM_setValue('henry-token', token);
          log.info('トークンをGM_storageに同期完了');
        }
      } catch (e) {
        log.warn('トークン同期失敗: ' + e.message);
      }
    }

    // 初回同期 + ナビゲーション時に再同期
    syncTokenToGMStorage();
    window.addEventListener('henry:navigation', syncTokenToGMStorage);

    // --------------------------------------------
    // トークンリクエスト監視（Reserve側からの要求に応答）
    // --------------------------------------------
    GM_addValueChangeListener('token-request', async (name, oldValue, newValue, remote) => {
      if (!remote) return; // 自分の変更は無視

      log.info('トークンリクエスト受信');
      let HenryCore;
      try { HenryCore = await waitForHenryCore(); } catch {
        log.warn('HenryCoreが見つかりません');
        return;
      }

      const token = await HenryCore.getToken();
      if (token) {
        GM_setValue('henry-token', token);
        log.info('トークンを更新しました');
      } else {
        log.warn('トークンを取得できませんでした');
      }
    });

    // --------------------------------------------
    // 外来タブ切り替え（URLパラメータから）
    // --------------------------------------------
    if (location.search.includes('tab=outpatient')) {
      log.info('外来タブへ切り替え');
      waitAndClickOutpatient();
    }

    async function waitAndClickOutpatient() {
      let waited = 0;

      while (waited < CONFIG.HENRY_CORE_TIMEOUT) {
        const btn = document.querySelector('#outpatientCf4 button');
        if (btn) {
          btn.click();
          log.info('外来ボタンをクリック');
          const cleanUrl = location.href.replace(/[?&]tab=outpatient/, '');
          history.replaceState(null, '', cleanUrl);
          return;
        }
        await new Promise(r => setTimeout(r, CONFIG.POLLING_INTERVAL));
        waited += CONFIG.POLLING_INTERVAL;
      }
      log.warn('外来ボタンが見つかりませんでした');
    }

    // --------------------------------------------
    // 患者情報取得（HenryCore使用）
    // --------------------------------------------
    async function getPatientFromAPI() {
      const uuid = location.pathname.match(/patients\/([a-f0-9-]{36})/)?.[1];
      if (!uuid) {
        throw new Error('患者ページを開いてください');
      }

      let HenryCore;
      try { HenryCore = await waitForHenryCore(); } catch {
        showHenryCoreRequiredMessage();
        throw new Error('HenryCoreが必要です');
      }

      const result = await HenryCore.query(QUERIES.GetPatient, {
        input: { uuid }
      });

      const patient = result.data?.getPatient;
      if (!patient) {
        throw new Error('患者情報を取得できませんでした');
      }

      return {
        id: patient.serialNumber,
        name: patient.fullName,
        namePhonetic: patient.fullNamePhonetic
      };
    }

    // --------------------------------------------
    // 再診予約を開く処理
    // --------------------------------------------
    async function openReserve() {
      log.info('再診予約を開く');

      // 既存の照射オーダーコンテキストをクリア（照射オーダーモードで閉じた場合のクリーンアップ）
      GM_setValue('imagingOrderContext', null);

      try {
        const patientData = await getPatientFromAPI();

        const patientId = patientData.id;
        if (!patientId) {
          alert('患者ID（患者番号）が取得できませんでした');
          return;
        }

        // NOTE: 患者名をGM_setValueで一時保存（クロスタブ通信用、完了後にクリア）
        // PII永続保存禁止ルールの例外: 一時的な受け渡しで即クリアされるため許容 (Issue #37)
        try {
          GM_setValue('pendingPatient', { id: patientId, name: patientData.name || '' });
        } catch (e) {
          log.warn('GM_setValueに失敗（ポート切断の可能性）:', e.message);
        }

        // URLパラメータにも患者情報を付与（GM_*ストレージ切断時のフォールバック）
        const reserveUrl = `https://manage-maokahp.reserve.ne.jp/?henryPatientId=${encodeURIComponent(patientId)}&henryPatientName=${encodeURIComponent(patientData.name || '')}`;

        // オーバーレイ付きで予約システムを開く
        openReserveWithOverlay(
          reserveUrl,
          `再診予約 - ${patientId} ${patientData.name || ''}`
        );

      } catch (e) {
        log.error(e.message);

        if (e.message.includes('ハッシュ')) {
          alert('GetPatient APIのハッシュがありません。\nHenryで患者詳細画面を一度開いてください。');
        } else if (e.message.includes('トークン')) {
          alert('認証エラー: ページをリロードしてください');
        } else {
          alert(e.message);
        }
      }
    }

    // --------------------------------------------
    // プラグイン登録（HenryCore.registerPlugin使用）
    // --------------------------------------------
    (async function registerPlugin() {
      try {
        let HenryCore;
        try { HenryCore = await waitForHenryCore(); } catch {
          showHenryCoreRequiredMessage();
          return;
        }

        await HenryCore.registerPlugin({
          id: 'reserve-integration',
          name: '再診予約',
          description: '予約システムを開いて患者情報を自動入力',
          version: VERSION,
          order: CONFIG.PLUGIN_ORDER,
          onClick: openReserve
        });

        log.info(`Ready (v${VERSION})`);
      } catch (e) {
        log.error('プラグイン登録失敗: ' + e.message);
      }
    })();

    // --------------------------------------------
    // 照射オーダー自動予約機能
    // --------------------------------------------

    // 日付オブジェクトが未来かどうか判定
    function isFutureDate(dateObj) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
      return target > today;
    }

    // 日付と時間をUnixタイムスタンプ（秒）に変換
    function dateTimeToTimestamp(dateObj, timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day, hours, minutes, 0);
      return Math.floor(date.getTime() / 1000);
    }

    // UUID生成
    function generateUUID() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // 診療科を取得
    async function getDefaultPurposeOfVisit(HenryCore, dateObj) {
      const result = await HenryCore.query(QUERIES.ListPurposeOfVisits, {
        input: { searchDate: dateObj }
      });

      const purposeOfVisits = result.data?.listPurposeOfVisits?.purposeOfVisits || [];
      if (purposeOfVisits.length === 0) {
        throw new Error('診療科が見つかりません');
      }

      const defaultPov = purposeOfVisits.find(p => p.order?.value === 1) || purposeOfVisits[0];
      log.info('診療科: ' + defaultPov.title);
      return defaultPov;
    }

    // 画像検査用の来院目的を取得
    async function getImagingPurposeOfVisit(HenryCore, dateObj) {
      const result = await HenryCore.query(QUERIES.ListPurposeOfVisits, {
        input: { searchDate: dateObj }
      });
      const purposeOfVisits = result.data?.listPurposeOfVisits?.purposeOfVisits || [];

      // 「画像検査」を探す
      const imagingPov = purposeOfVisits.find(p => p.title === '画像検査');
      if (imagingPov) {
        log.info('来院目的「画像検査」を使用: ' + imagingPov.uuid);
        return imagingPov;
      }

      // 見つからない場合はデフォルトを使用
      log.warn('来院目的「画像検査」が見つからないため、デフォルトを使用');
      const defaultPov = purposeOfVisits.find(p => p.order?.value === 1) || purposeOfVisits[0];
      return defaultPov;
    }

    // 外来予約を作成
    async function createOutpatientReservation(HenryCore, patientUuid, doctorUuid, purposeOfVisitUuid, dateObj, timeStr) {
      const scheduleTime = dateTimeToTimestamp(dateObj, timeStr);
      const newEncounterId = generateUUID();

      log.info('外来予約を作成中: ' + dateObj.year + '/' + dateObj.month + '/' + dateObj.day + ' ' + timeStr);

      const result = await HenryCore.query(QUERIES.CreateSession, {
        input: {
          uuid: '',
          patientUuid: { value: patientUuid },
          doctorUuid: doctorUuid,
          purposeOfVisitUuid: purposeOfVisitUuid,
          state: 'BEFORE_CONSULTATION',
          note: '',
          countedInConsultationDays: true,
          scheduleTime: { seconds: scheduleTime, nanos: 0 },
          encounterId: { value: newEncounterId }
        }
      });

      const session = result.data?.createSession;
      if (!session?.uuid) {
        throw new Error('外来予約の作成に失敗しました');
      }

      const encounterId = session.encounterId?.value;
      if (!encounterId) {
        throw new Error('診療録IDが取得できませんでした');
      }

      log.info('外来予約を作成しました: ' + session.uuid);
      return encounterId;
    }

    // 予約システムを開いて予約時間を取得
    function openReserveForImagingOrder(patientInfo, dateObj, modality = '') {
      return new Promise((resolve, reject) => {
        const context = {
          patientId: patientInfo.id,
          patientName: patientInfo.name,
          date: `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`,
          modality: modality,  // CT, MRI等
          timestamp: Date.now()
        };
        try {
          GM_setValue('imagingOrderContext', context);
          // NOTE: PII一時保存（クロスタブ通信用、完了/タイムアウト時にクリア）Issue #37
          GM_setValue('pendingPatient', { id: patientInfo.id, name: patientInfo.name });
        } catch (e) {
          log.warn('GM_setValueに失敗（ポート切断の可能性）:', e.message);
        }
        log.info('照射オーダーコンテキストを保存: ' + JSON.stringify(context));

        // タイムアウト設定（5分）
        const timeout = setTimeout(() => {
          GM_removeValueChangeListener(listenerId);
          GM_setValue('imagingOrderContext', null);
          GM_setValue('pendingPatient', null);
          reject(new Error('予約システムからの応答がタイムアウトしました'));
        }, CONFIG.CONTEXT_EXPIRY);

        // 予約結果を待機
        const listenerId = GM_addValueChangeListener('reservationResult', (name, oldValue, newValue, remote) => {
          if (!newValue) return;

          log.info('予約結果を受信: ' + JSON.stringify(newValue));
          clearTimeout(timeout);
          GM_removeValueChangeListener(listenerId);
          GM_setValue('imagingOrderContext', null);
          GM_setValue('reservationResult', null);

          // オーバーレイを閉じる
          closeBlockingOverlay(false);

          if (newValue.cancelled) {
            reject(new Error('予約がキャンセルされました'));
          } else if (newValue.time && newValue.date) {
            resolve({ date: newValue.date, time: newValue.time });
          } else if (newValue.time) {
            resolve({ date: null, time: newValue.time });
          } else {
            reject(new Error('予約時間が取得できませんでした'));
          }
        });

        // 予約システムを開く
        const targetDate = new Date(dateObj.year, dateObj.month - 1, dateObj.day, 9, 0, 0);
        const limit = Math.floor(targetDate.getTime() / 1000);
        const reserveUrl = `https://manage-maokahp.reserve.ne.jp/manage/calendar.php?from_date=${context.date}&limit=${limit}&henryPatientId=${encodeURIComponent(patientInfo.id)}&henryPatientName=${encodeURIComponent(patientInfo.name || '')}`;

        // オーバーレイ付きで予約システムを開く
        openReserveWithOverlay(
          reserveUrl,
          `照射オーダー予約 - ${patientInfo.id} ${patientInfo.name || ''} - ${context.date}`
        );
      });
    }

    // 通知表示
    function showImagingNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.style.cssText = STYLES.notification(type);
      notification.textContent = message;

      if (!document.getElementById('imaging-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'imaging-notification-styles';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), CONFIG.CLOSE_DELAY);
      }, CONFIG.NOTIFICATION_DURATION);
    }

    // モダリティ（CT/MRI等）をダイアログから取得
    // NOTE: henry_imaging_order_helper.user.jsと同じセレクタを使用
    function getModalityFromDialog() {
      const modalDialog = document.querySelector('[role="dialog"]');
      if (!modalDialog) return '';

      // aria-labelを使用した安定したセレクタ
      const select = modalDialog.querySelector('select[aria-label="モダリティ"]');
      if (select && select.selectedIndex >= 0) {
        return select.options[select.selectedIndex]?.text || '';
      }
      return '';
    }

    // 受付一覧・カルテ画面を更新
    function refreshSessionList() {
      if (!unsafeWindow.__APOLLO_CLIENT__) return;
      try {
        unsafeWindow.__APOLLO_CLIENT__.refetchQueries({
          include: ['ListSessions', 'EncounterEditorQuery']
        });
        log.info('受付一覧・カルテ画面を更新しました');
      } catch (e) {
        log.warn('画面更新に失敗: ' + e.message);
      }
    }

    // 既存の外来予約を検索（同じ患者・医師・日付）
    async function findExistingSession(HenryCore, patientUuid, doctorUuid, dateObj) {
      try {
        const result = await HenryCore.query(QUERIES.ListSessions, {
          input: {
            date: { year: dateObj.year, month: dateObj.month, day: dateObj.day },
            query: '',
            filterStates: [],
            filterDoctorUuids: doctorUuid ? [doctorUuid] : [],
            filterPurposeOfVisitUuids: [],
            pageSize: 1000,
            pageToken: ''
          }
        });

        const sessions = result.data?.listSessions?.sessions || [];

        // 同じ患者のセッションを抽出
        const matchingSessions = sessions.filter(s => s.patient?.uuid === patientUuid && s.encounterId?.value);

        if (matchingSessions.length === 0) {
          log.info('既存の外来予約なし');
          return null;
        }

        // 複数ある場合は最も早い時間の予約を使用
        matchingSessions.sort((a, b) => {
          const timeA = a.scheduleTime?.seconds || 0;
          const timeB = b.scheduleTime?.seconds || 0;
          return timeA - timeB;
        });

        const session = matchingSessions[0];
        log.info('既存の外来予約を発見: encounterId=' + session.encounterId.value);
        return {
          uuid: session.uuid,
          encounterId: session.encounterId.value,
          scheduleTime: session.scheduleTime?.seconds
        };
      } catch (e) {
        log.error('外来予約検索エラー: ' + e.message);
        return null;
      }
    }

    // レスポンスから照射オーダーデータを取得して印刷
    async function printOrderFromResponse(response, logMessage, isHospitalized = false) {
      try {
        const clonedResponse = response.clone();
        const json = await clonedResponse.json();
        const orderData = json.data?.createImagingOrder || json.data?.upsertImagingOrder;

        if (orderData?.uuid) {
          log.info(logMessage);
          setTimeout(() => Printer.print(orderData, isHospitalized), CONFIG.PRINT_DELAY_MS);
        }
      } catch (printError) {
        log.error('印刷データ取得エラー: ' + printError.message);
      }
    }

    // 患者情報を取得
    async function getPatientInfo(HenryCore, patientUuid) {
      const patientResult = await HenryCore.query(QUERIES.GetPatient, {
        input: { uuid: patientUuid }
      });
      const patient = patientResult.data?.getPatient;
      if (!patient) {
        throw new Error('患者情報が見つかりません');
      }
      return { id: patient.serialNumber, name: patient.fullName };
    }

    /**
     * 未来日付の照射オーダー処理（予約連携）- 統合版
     * CT/MRI/単純撮影デジタル等、全ての照射オーダーで共通の処理
     *
     * @param {Object} config - オーダー種別の設定
     * @param {string} config.orderType - 確認ダイアログに表示するオーダー種別名（例: '照射オーダー', '単純撮影オーダー'）
     * @param {string|null} config.defaultModality - モダリティ取得できない場合のデフォルト値
     * @param {string} config.printLogMessage - 印刷時のログメッセージ
     * @param {string} config.hospitalizedPrintLogMessage - 入院患者の印刷時のログメッセージ
     */
    async function handleFutureDateImagingOrder(HenryCore, body, options, url, dateObj, originalFetch, fetchContext, config) {
      const { orderType, defaultModality, printLogMessage, hospitalizedPrintLogMessage } = config;

      log.info(`未来日付の${orderType}を検出: ${dateObj.year}/${dateObj.month}/${dateObj.day}`);

      const patientUuid = body.variables?.input?.patientUuid || HenryCore.getPatientUuid();
      const doctorUuid = body.variables?.input?.doctorUuid || await HenryCore.getMyUuid();

      if (!patientUuid || !doctorUuid) {
        throw new Error('患者情報または医師情報を取得できません');
      }

      // 患者情報を取得
      const patientInfo = await getPatientInfo(HenryCore, patientUuid);

      // モダリティを取得
      const modality = getModalityFromDialog() || defaultModality;
      if (modality) {
        log.info('モダリティを取得: ' + modality);
      }

      // 入院状態をチェック（照射オーダー日時点で入院中/入院予定か）
      const isHospitalized = await isHospitalizedOnDate(HenryCore, patientUuid, dateObj);
      if (isHospitalized) {
        log.info('入院中/入院予定の患者を検出');
      }

      const displayDate = `${dateObj.year}/${dateObj.month}/${dateObj.day}`;

      // 入院患者の場合：予約システム連携スキップ（時間指定不要）
      if (isHospitalized) {
        log.info('入院中/入院予定の患者のため、予約システム連携をスキップ');

        // 通知を表示
        showImagingNotification('入院期間中のため予約システムでの予約は不要です', 'info');

        // 処理済みリクエストを保存（再インターセプト防止）
        const requestKey = patientUuid + '_' + dateObj.year + '-' + dateObj.month + '-' + dateObj.day;
        processedRequests.add(requestKey);

        // オーダーをそのまま保存
        const response = await originalFetch.call(fetchContext, url, options);

        // 印刷実行（入院患者）
        await printOrderFromResponse(response, hospitalizedPrintLogMessage, true);

        return response;
      }

      // 外来患者の場合：予約システム必須
      const confirmMessage = `未来日付（${displayDate}）の${orderType}です。\n\n予約システムで予約を取りますか？\n\n患者: ${patientInfo.id} ${patientInfo.name}`;

      if (!confirm(confirmMessage)) {
        log.info('ユーザーが予約システム連携をキャンセル - オーダー保存せず終了');
        showImagingNotification('キャンセルしました', 'info');
        return new Response(JSON.stringify({ data: null, errors: [{ message: 'キャンセルされました' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 予約システムを開いて予約日時を取得
      showImagingNotification('予約システムで予約を取ってください', 'info');
      const reservationResult = await openReserveForImagingOrder(patientInfo, dateObj, modality);
      log.info('予約日時: ' + JSON.stringify(reservationResult));

      // 予約日付を使用
      let actualDateObj = dateObj;
      if (reservationResult.date) {
        const [year, month, day] = reservationResult.date.split('-').map(Number);
        actualDateObj = { year, month, day };
      }

      // 既存の外来予約を検索（同じ患者・医師・日付）
      const existingSession = await findExistingSession(HenryCore, patientUuid, doctorUuid, actualDateObj);

      let targetEncounterId;
      let notificationMessage;

      if (existingSession) {
        // 既存予約を使用
        targetEncounterId = existingSession.encounterId;
        log.info('既存の外来予約を使用: ' + targetEncounterId);
        showImagingNotification('同じ日に既存の外来予約があります。それを使用します。', 'info');
        await new Promise(resolve => setTimeout(resolve, 1500)); // 通知を見せる時間
        notificationMessage = `${actualDateObj.year}/${actualDateObj.month}/${actualDateObj.day} ${reservationResult.time} の予約を取りました（既存予約を使用）`;
      } else {
        // 新規作成（画像検査用の来院目的を使用）
        const purposeOfVisit = await getImagingPurposeOfVisit(HenryCore, actualDateObj);
        targetEncounterId = await createOutpatientReservation(
          HenryCore, patientUuid, doctorUuid, purposeOfVisit.uuid, actualDateObj, reservationResult.time
        );
        log.info('新規外来予約を作成: ' + targetEncounterId);
        notificationMessage = `${actualDateObj.year}/${actualDateObj.month}/${actualDateObj.day} ${reservationResult.time} の外来予約を作成しました`;
        refreshSessionList();
      }

      // リクエストボディのencounterIdを差し替え
      body.variables.input.encounterId = { value: targetEncounterId };

      // 日付も更新
      if (reservationResult.date) {
        body.variables.input.date = actualDateObj;
      }

      // 処理済みリクエストを保存（再インターセプト防止）
      const finalDate = body.variables.input.date;
      const requestKey = patientUuid + '_' + finalDate.year + '-' + finalDate.month + '-' + finalDate.day;
      processedRequests.add(requestKey);

      const newOptions = { ...options, body: JSON.stringify(body) };
      log.info('EncounterIDを差し替えてリクエスト送信: ' + targetEncounterId);

      // リクエストを送信
      const response = await originalFetch.call(fetchContext, url, newOptions);

      showImagingNotification(notificationMessage, 'success');

      // 印刷実行
      await printOrderFromResponse(response, printLogMessage);

      return response;
    }

    // 当日の照射オーダー処理（印刷のみ）
    async function handleSameDayOrder(HenryCore, body, args, originalFetch, fetchContext) {
      const response = await originalFetch.apply(fetchContext, args);

      // 入院チェック
      const patientUuid = body.variables?.input?.patientUuid;
      const dateObj = body.variables?.input?.date;
      const isHospitalized = patientUuid && dateObj
        ? await isHospitalizedOnDate(HenryCore, patientUuid, dateObj)
        : false;
      if (isHospitalized) {
        log.info('入院中の患者の当日照射オーダーを検出');
      }

      // 印刷実行
      await printOrderFromResponse(response, '当日照射オーダー検出 - 印刷実行', isHospitalized);

      return response;
    }

    // 予約エラー時の処理
    function handleReservationError(error, args, originalFetch, fetchContext) {
      log.error('自動予約エラー: ' + error.message);

      // 予約がキャンセルされた場合は、処理を中止してダイアログに戻る
      if (error.message.includes('キャンセル')) {
        showImagingNotification('予約がキャンセルされました', 'info');
        return new Response(JSON.stringify({ data: null, errors: [{ message: '予約がキャンセルされました' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // その他のエラー（タイムアウト等）は確認ダイアログを表示
      const proceed = confirm(`外来予約の自動作成に失敗しました:\n${error.message}\n\n現在の診療録に照射オーダーを保存しますか？`);

      if (!proceed) {
        return new Response(JSON.stringify({ data: null, errors: [{ message: 'ユーザーによりキャンセルされました' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 「はい」を選んだ場合：予約なしで元の日付に保存（印刷もしない）
      log.info('予約なしで保存（予約エラー後）');
      return originalFetch.apply(fetchContext, args);
    }

    // 照射オーダーfetchインターセプト（予約連携 + 自動印刷統合）
    (async function setupImagingOrderIntercept() {
      let HenryCore;
      try { HenryCore = await waitForHenryCore(); } catch { return; }

      // 初期化時に古いコンテキストをクリア
      GM_setValue('imagingOrderContext', null);
      GM_setValue('reservationResult', null);

      const originalFetch = unsafeWindow.fetch;

      // 印刷用のoriginalFetchを設定（unsafeWindowをコンテキストとしてバインド）
      PrintDataFetcher.setOriginalFetch(originalFetch, unsafeWindow);

      unsafeWindow.fetch = async function(...args) {
        const [url, options] = args;

        // 認証ヘッダーをキャプチャ（印刷用API呼び出しに使用）
        if (typeof url === 'string' && url.includes('/graphql')) {
          AuthCapture.capture(args);
        }

        if (typeof url === 'string' && url.includes('/graphql') && options?.body) {
          try {
            const body = JSON.parse(options.body);

            // CreateImagingOrder または UpsertImagingOrder を検出
            if (body.operationName === 'CreateImagingOrder' || body.operationName === 'UpsertImagingOrder') {
              const dateObj = body.variables?.input?.date;

              // 未来日付の場合
              if (dateObj && isFutureDate(dateObj)) {
                // 処理済みリクエストはスキップ（patientUuid + 日付でチェック）
                const patientUuid = body.variables?.input?.patientUuid;
                const requestKey = patientUuid + '_' + dateObj.year + '-' + dateObj.month + '-' + dateObj.day;

                if (processedRequests.has(requestKey)) {
                  log.info('処理済みリクエスト - スキップ: ' + requestKey);
                  processedRequests.delete(requestKey);
                  return originalFetch.apply(this, args);
                }

                // 処理中の場合はスキップ（二重インターセプト防止）
                if (isProcessingImagingOrder) {
                  log.info('照射オーダー処理中のため、このリクエストはスキップ');
                  return originalFetch.apply(this, args);
                }

                const modality = getModalityFromDialog();

                // 処理開始
                isProcessingImagingOrder = true;

                // オーダー種別に応じた設定
                const config = modality === '単純撮影デジタル'
                  ? {
                      orderType: '単純撮影オーダー',
                      defaultModality: '単純撮影',
                      printLogMessage: '単純撮影オーダー印刷',
                      hospitalizedPrintLogMessage: '入院患者の単純撮影オーダー印刷'
                    }
                  : {
                      orderType: '照射オーダー',
                      defaultModality: null,
                      printLogMessage: '予約完了後の印刷を実行',
                      hospitalizedPrintLogMessage: '入院患者の照射オーダー印刷'
                    };

                try {
                  return await handleFutureDateImagingOrder(HenryCore, body, options, url, dateObj, originalFetch, this, config);
                } catch (error) {
                  return handleReservationError(error, args, originalFetch, this);
                } finally {
                  isProcessingImagingOrder = false;
                }
              }

              // 当日の場合：レスポンス監視して印刷
              if (!dateObj || !isFutureDate(dateObj)) {
                return await handleSameDayOrder(HenryCore, body, args, originalFetch, this);
              }
            }
          } catch (e) {
            // JSONパース失敗等は無視
          }
        }

        return originalFetch.apply(this, args);
      };

      log.info('照射オーダーfetchインターセプト設定完了（予約連携 + 自動印刷統合）');
    })();
  }

  // ==========================================
  // 予約システム側の処理
  // ==========================================
  if (isReserve) {
    log.info('予約システムモード起動');

    // --------------------------------------------
    // 不要なポップアップを削除（動的に追加される場合も対応）
    // --------------------------------------------
    function removePopup() {
      // TechTouchのポップアップを探す（Shadow DOMのhost要素）
      const container = document.querySelector('#techtouch-player-snippet');
      if (container) {
        container.remove();
        log.info('TechTouchポップアップを削除しました');
        return true;
      }
      return false;
    }

    // 初回チェック
    removePopup();

    // 動的に追加される場合に備えてMutationObserverで監視
    const popupObserver = new MutationObserver(() => {
      if (removePopup()) {
        popupObserver.disconnect();
      }
    });
    popupObserver.observe(document.documentElement, { childList: true, subtree: false });

    // 10秒後に監視を停止（無駄なリソース消費を防ぐ）
    setTimeout(() => popupObserver.disconnect(), CONFIG.OBSERVER_TIMEOUT);

    // --------------------------------------------
    // カルテ情報キャッシュ（タブを閉じるまで保持）
    // --------------------------------------------
    const karteCache = new Map();

    // --------------------------------------------
    // トークンリクエスト（Henry側に依頼して最新トークンを取得）
    // --------------------------------------------
    function requestToken(timeout = CONFIG.TOKEN_REQUEST_TIMEOUT) {
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          log.warn('トークンリクエストタイムアウト');
          resolve(null);
        }, timeout);

        const listenerId = GM_addValueChangeListener('henry-token', (name, oldValue, newValue, remote) => {
          if (remote && newValue) {
            clearTimeout(timeoutId);
            GM_removeValueChangeListener(listenerId);
            log.info('新しいトークンを受信しました');
            resolve(newValue);
          }
        });

        // リクエスト送信
        GM_setValue('token-request', Date.now());
      });
    }

    // --------------------------------------------
    // API呼び出し（401エラー時に自動リトライ）
    // --------------------------------------------
    async function callHenryAPIWithRetry(operationName, variables) {
      const token = GM_getValue('henry-token', null);
      if (!token) {
        throw new Error('トークンがありません');
      }

      // エンドポイントはオペレーションに応じて決定
      const endpoint = operationName === 'EncountersInPatient'
        ? CONFIG.HENRY_GRAPHQL_V2
        : CONFIG.HENRY_GRAPHQL;

      try {
        return await callHenryAPI(token, operationName, variables, endpoint);
      } catch (e) {
        // 401エラーの場合、新しいトークンを取得して再試行
        if (e.message.includes('401')) {
          log.info('401エラー - 新しいトークンをリクエスト');
          const newToken = await requestToken();
          if (newToken) {
            try {
              return await callHenryAPI(newToken, operationName, variables, endpoint);
            } catch (retryError) {
              if (retryError.message.includes('401')) {
                throw new Error('認証エラー: Henryページを更新してから再度お試しください');
              }
              throw retryError;
            }
          }
          // トークン取得できなかった場合
          throw new Error('認証エラー: Henryページを更新してから再度お試しください');
        }
        throw e;
      }
    }

    // --------------------------------------------
    // セットアップ状態チェック（トークンのみ）
    // --------------------------------------------
    function checkSetupStatus() {
      const token = GM_getValue('henry-token', null);

      if (!token) {
        return {
          ok: false,
          message: '【Henryにログインしてください】\n\n' +
            'この機能を使用するにはHenryへのログインが必要です。\n\n' +
            '【手順】\n' +
            '1. Henry（https://henry-app.jp）を開く\n' +
            '2. ログインする\n' +
            '3. この画面に戻って再度お試しください'
        };
      }

      return { ok: true };
    }

    // --------------------------------------------
    // Henry→Reserve連携：バナー表示・自動入力
    // --------------------------------------------
    // ログインページでは処理しない（ログイン後のページで処理する）
    const isLoginPage = location.pathname.includes('login');
    if (isLoginPage) {
      log.info('ログインページのためHenry連携スキップ');
    }

    // トークン未取得時の通知（ログインページ以外で、初回のみ）
    if (!isLoginPage && !GM_getValue('henry-token', null)) {
      // 画面上部にバナーで通知
      const noticeBanner = document.createElement('div');
      noticeBanner.id = 'henry-login-notice';
      noticeBanner.innerHTML = `
        <span style="margin-right: 8px;">⚠️</span>
        <span>Henry連携を使用するには<a href="https://henry-app.jp" target="_blank" style="color:#1a73e8; text-decoration:underline;">Henry</a>にログインしてください</span>
        <button id="henry-notice-close" style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
      `;
      noticeBanner.style.cssText = STYLES.noticeBanner;
      document.body.appendChild(noticeBanner);
      document.getElementById('henry-notice-close').addEventListener('click', () => {
        noticeBanner.remove();
      });
      log.info('ログイン通知バナーを表示');
    }

    // 同一スクリプト内のGM_*ストレージから取得
    let pendingPatient = !isLoginPage ? GM_getValue('pendingPatient', null) : null;
    let imagingOrderContext = !isLoginPage ? GM_getValue('imagingOrderContext', null) : null;

    // GM_*ストレージが空の場合、URLパラメータからフォールバック取得
    // （長時間放置によるService Workerポート切断でGM_setValueがサイレント失敗した場合の救済）
    if (!pendingPatient && !isLoginPage) {
      const params = new URLSearchParams(location.search);
      const urlPatientId = params.get('henryPatientId');
      if (urlPatientId) {
        pendingPatient = { id: urlPatientId, name: params.get('henryPatientName') || '' };
        log.info('URLパラメータから患者情報を取得（GM_*フォールバック）');
      }
    }

    // 照射オーダーコンテキストが古い場合は無効化
    if (imagingOrderContext && imagingOrderContext.timestamp) {
      const elapsed = Date.now() - imagingOrderContext.timestamp;
      if (elapsed > CONFIG.CONTEXT_EXPIRY) {
        log.info('照射オーダーコンテキストが古いため無効化:', Math.floor(elapsed / 1000) + '秒経過');
        GM_setValue('imagingOrderContext', null);
        imagingOrderContext = null;
      }
    }

    // 照射オーダーモードが有効かどうか（排他制御）
    const isImagingOrderMode = imagingOrderContext && imagingOrderContext.patientId;

    // 予約登録ボタンリスナー追加済みの要素を追跡（関数より前に宣言が必要）
    let trackedReserveButton = null;

    // --------------------------------------------
    // 照射オーダーモード（Henry照射オーダーからの予約）
    // --------------------------------------------
    if (isImagingOrderMode) {
      log.info('照射オーダーモード起動:', imagingOrderContext);

      // 統合バナー表示（照射オーダーモード）
      showModeBanner('imaging', imagingOrderContext.patientId, imagingOrderContext.patientName, imagingOrderContext);

      // ウィンドウを閉じた時にキャンセル結果を送信（Henry側で即座に検知できる）
      // ※予約成功時はcontextがnullになっているので、その場合は送信しない
      window.addEventListener('beforeunload', () => {
        const currentContext = GM_getValue('imagingOrderContext', null);
        if (currentContext) {
          GM_setValue('reservationResult', { cancelled: true, timestamp: Date.now() });
          GM_setValue('imagingOrderContext', null);
          log.info('ウィンドウ閉じ - キャンセル結果を送信');
        }
      });

      // カレンダーの日付を変更
      navigateToDate(imagingOrderContext.date);

      // 予約登録ボタン監視（日時取得用）+ 患者ID自動入力 + モダリティ自動選択
      // 2段階監視パターンで、ダイアログの追加と再表示の両方を検知
      setupDialogObserver(() => {
        tryFillDialog(imagingOrderContext.patientId);
        tryFillDateForImaging(imagingOrderContext);
        trySelectModality(imagingOrderContext.modality);
        setupReservationButtonListener(imagingOrderContext);
      });
    }

    // カレンダーの日付を変更する
    function navigateToDate(dateStr) {
      // dateStr format: "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);

      // 予約システムのURLパラメータ形式: ?from_date=YYYY-MM-DD&limit=<unix_timestamp>
      const currentUrl = new URL(location.href);
      const currentFromDate = currentUrl.searchParams.get('from_date');

      if (currentFromDate !== dateStr) {
        // まだ目的の日付でない場合はリダイレクト
        const targetDate = new Date(year, month - 1, day, 9, 0, 0);
        const limit = Math.floor(targetDate.getTime() / 1000);

        currentUrl.searchParams.set('from_date', dateStr);
        currentUrl.searchParams.set('limit', limit.toString());
        log.info('カレンダー日付を変更:', dateStr);
        location.href = currentUrl.toString();
        return;
      }

      log.info('既に目的の日付:', dateStr);
    }

    // 統合バナー表示（照射オーダーモード / 再診予約モード）
    function showModeBanner(mode, patientId, patientName, context = null) {
      if (document.getElementById('henry-mode-banner')) return;

      const isImagingMode = mode === 'imaging';
      const banner = document.createElement('div');
      banner.id = 'henry-mode-banner';

      // 共通スタイル適用
      banner.style.cssText = STYLES.bannerBase;

      if (isImagingMode && context) {
        banner.innerHTML = `
          <span><strong>照射オーダー予約</strong></span>
          <span style="margin: 0 12px; color: rgba(255,255,255,0.5);">|</span>
          <span>患者: <strong>${patientId}</strong> ${patientName || ''}</span>
          <span style="margin: 0 12px; color: rgba(255,255,255,0.5);">|</span>
          <span>予約日: <strong>${context.date}</strong></span>
        `;
        banner.style.backgroundColor = '#1565C0';
        banner.style.color = 'white';
      } else {
        banner.innerHTML = `
          <span><strong>再診予約</strong></span>
          <span style="margin: 0 12px; color: rgba(0,0,0,0.3);">|</span>
          <span>患者: <strong>${patientId}</strong> ${patientName || ''}</span>
        `;
        banner.style.backgroundColor = '#00897B';
        banner.style.color = 'white';
      }

      document.body.appendChild(banner);
      document.body.style.paddingTop = banner.offsetHeight + 'px';

      // ダイアログをバナーより上に表示するCSS
      if (!document.getElementById('henry-dialog-zindex-fix')) {
        const style = document.createElement('style');
        style.id = 'henry-dialog-zindex-fix';
        style.textContent = '.ui-dialog { z-index: 1500 !important; }';
        document.head.appendChild(style);
      }
    }

    // 照射オーダーモード用：日付のみ自動入力（患者IDは pendingPatient で処理）
    function tryFillDateForImaging(context) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // 日付入力
      const dateInput = document.getElementById('reserve_date');
      if (dateInput && dateInput.value !== context.date) {
        dateInput.value = context.date;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        log.info('日付を自動入力:', context.date);
      }
    }

    // 予約入力のバリデーション（患者ID、診療種別）
    function validateReservationInput(context, event) {
      // 患者IDの一致確認
      const patientIdInput = document.getElementById('multi_record_no[0]');
      const inputPatientId = patientIdInput?.value?.trim();

      if (inputPatientId !== context.patientId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert(`患者IDが一致しません。\n\n期待: ${context.patientId}\n入力: ${inputPatientId || '(空)'}\n\n照射オーダーの患者と同じ患者で予約してください。`);
        log.error('患者ID不一致 - 予約を阻止:', { expected: context.patientId, actual: inputPatientId });
        return { valid: false };
      }

      // 診療種別（CT/MRI）の確認
      // NOTE: 外部システム（reserve.ne.jp）のUIのため、テキストベース検索が必要
      const dialogEl = document.querySelector('#dialog_reserve_input');
      let purposeValue = '';
      if (dialogEl) {
        const listItems = dialogEl.querySelectorAll('li');
        for (const li of listItems) {
          if (li.textContent?.includes('診療を選択')) {
            const select = li.querySelector('select');
            if (select) {
              purposeValue = select.options[select.selectedIndex]?.text || '';
              break;
            }
          }
        }
      }

      // 「診療を選択」がCT/MRIでない場合は警告（CT/MRIオーダーのときのみ）
      const isCtMriOrder = context.modality?.includes('CT') || context.modality?.includes('MRI');
      if (isCtMriOrder && !purposeValue.includes('CT') && !purposeValue.includes('MRI')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert(`CT/MRIの予約は「CT/MRI」枠で登録してください。\n\n現在の選択: ${purposeValue || '(未選択)'}\n\n「診療を選択」を「CT/MRI」に変更してから予約登録してください。`);
        log.error('診療種別がCT/MRIではない - 予約を阻止:', { purposeValue, modality: context.modality });
        return { valid: false };
      }

      // 日付と時間を取得
      const dateInput = document.querySelector('input[name="res_date"]');
      const timeInput = document.querySelector('input[name="res_time"]');
      const capturedDate = dateInput?.value || context.date;
      const capturedTime = timeInput?.value || CONFIG.DEFAULT_TIME;

      log.info('予約登録ボタンがクリックされました。患者ID確認OK、診療種別:', purposeValue || '(未取得)', '日付:', capturedDate, '時間:', capturedTime);

      return { valid: true, date: capturedDate, time: capturedTime };
    }

    // 予約登録完了時の処理（ダイアログ閉じ監視後に実行）
    function handleReservationComplete(capturedDate, capturedTime) {
      log.info('予約登録完了を検出。予約日時を送信:', capturedDate, capturedTime);

      // 予約結果をHenryに送信（日付と時間）
      GM_setValue('reservationResult', { date: capturedDate, time: capturedTime, timestamp: Date.now() });
      GM_setValue('imagingOrderContext', null);
      GM_setValue('pendingPatient', null);

      // バナーを削除
      const modeBanner = document.getElementById('henry-mode-banner');
      if (modeBanner) modeBanner.remove();
      document.body.style.paddingTop = '0';

      // Henry側のオーバーレイを先に閉じて、応答を待ってからウィンドウを閉じる
      const closeWindow = () => {
        alert(`予約を登録しました。\n\n日付: ${capturedDate}\n時間: ${capturedTime}`);
        window.close();
      };

      if (window.opener) {
        // 応答を待つリスナーを設定
        const onOverlayClosed = (e) => {
          if (e.origin !== 'https://henry-app.jp') return;
          if (e.data?.type === 'overlay-closed') {
            window.removeEventListener('message', onOverlayClosed);
            setTimeout(closeWindow, CONFIG.POLLING_INTERVAL);
          }
        };
        window.addEventListener('message', onOverlayClosed);

        // タイムアウト（応答がない場合）
        setTimeout(() => {
          window.removeEventListener('message', onOverlayClosed);
          closeWindow();
        }, CONFIG.POST_MESSAGE_TIMEOUT);

        // オーバーレイを閉じる要求を送信
        window.opener.postMessage({ type: 'overlay-close' }, 'https://henry-app.jp');
      } else {
        closeWindow();
      }
    }

    function setupReservationButtonListener(context) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // 「予約登録」ボタンをテキストで探す（変更に強いセレクタ）
      const allButtons = Array.from(document.querySelectorAll('button'));
      const reserveBtn = allButtons.find(btn => btn.textContent?.trim() === '予約登録');
      if (!reserveBtn) return;

      // 同じボタンには重複してリスナーを追加しない
      if (trackedReserveButton === reserveBtn) return;

      trackedReserveButton = reserveBtn;
      log.info('予約登録ボタンを検出（新規またはボタン変更）');

      // 検証結果を保持
      let validationResult = { valid: false, date: context.date, time: CONFIG.DEFAULT_TIME };

      // キャプチャフェーズで患者ID・診療種別を検証（不正の場合は予約を阻止）
      reserveBtn.addEventListener('click', (event) => {
        validationResult = validateReservationInput(context, event);
      }, { capture: true });

      // バブリングフェーズでダイアログ閉じを監視
      reserveBtn.addEventListener('click', () => {
        if (!validationResult.valid) return;

        // ダイアログが閉じるのを監視（MutationObserverでstyle変更を検知）
        const dialogElement = document.querySelector('#dialog_reserve_input');
        const uiDialog = dialogElement?.closest('.ui-dialog');
        if (!uiDialog) {
          log.warn('ダイアログ要素が見つかりません');
          return;
        }

        const dialogCloseObserver = new MutationObserver(() => {
          if (uiDialog.style.display === 'none') {
            dialogCloseObserver.disconnect();
            handleReservationComplete(validationResult.date, validationResult.time);
          }
        });
        dialogCloseObserver.observe(uiDialog, { attributes: true, attributeFilter: ['style'] });

        // タイムアウト
        setTimeout(() => dialogCloseObserver.disconnect(), CONFIG.OBSERVER_TIMEOUT);
      });
    }

    // 患者情報がある場合（通常の再診予約のみ - 照射オーダーモードは上で処理済み）
    if (pendingPatient && pendingPatient.id && !isImagingOrderMode) {
      GM_setValue('pendingPatient', null);
      log.info('再診予約モード - カルテID:', pendingPatient.id, '患者名:', pendingPatient.name);

      // 統合バナー表示（再診予約モード）
      showModeBanner('revisit', pendingPatient.id, pendingPatient.name);

      // ダイアログ自動入力の監視（2段階監視パターン）
      setupDialogObserver(() => {
        tryFillDialog(pendingPatient.id);
      });

    } else if (!isImagingOrderMode) {
      log.info('pendingPatientなし - Henry連携スキップ');
    }

    // --------------------------------------------
    // 2段階監視パターン: ダイアログの表示を監視
    // Stage 1: body監視で .ui-dialog の追加を検知
    // Stage 2: .ui-dialog の style 監視で表示を検知
    // --------------------------------------------
    function setupDialogObserver(onDialogVisible) {
      let uiDialogObserver = null;
      let currentUiDialog = null;

      // Stage 2: .ui-dialog の style を監視
      function startStage2(uiDialog) {
        if (uiDialogObserver) {
          uiDialogObserver.disconnect();
        }
        currentUiDialog = uiDialog;

        uiDialogObserver = new MutationObserver(() => {
          const display = window.getComputedStyle(uiDialog).display;
          if (display !== 'none') {
            onDialogVisible();
          }
        });
        uiDialogObserver.observe(uiDialog, { attributes: true, attributeFilter: ['style'] });
        log.info('Stage 2 Observer開始（ダイアログ style 監視）');

        // 現在表示中なら即時実行
        if (window.getComputedStyle(uiDialog).display !== 'none') {
          onDialogVisible();
        }
      }

      // Stage 1: body の childList を監視
      const bodyObserver = new MutationObserver((mutations) => {
        // 既に監視中の .ui-dialog がDOMに存在していれば何もしない
        if (currentUiDialog && currentUiDialog.isConnected) {
          return;
        }

        // .ui-dialog が追加されたか確認
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;

            // 追加されたノードが .ui-dialog か、その中に .ui-dialog があるか
            const uiDialog = node.classList?.contains('ui-dialog')
              ? node
              : node.querySelector?.('.ui-dialog');

            if (uiDialog && uiDialog.querySelector('#dialog_reserve_input')) {
              startStage2(uiDialog);
              return;
            }
          }
        }
      });

      bodyObserver.observe(document.body, { childList: true, subtree: false });
      log.info('Stage 1 Observer開始（ダイアログ追加監視）');

      // 既にダイアログが存在する場合は Stage 2 を開始
      const existingDialog = document.querySelector('.ui-dialog');
      if (existingDialog && existingDialog.querySelector('#dialog_reserve_input')) {
        startStage2(existingDialog);
      } else {
        // ダイアログがない場合でも初回チェック
        onDialogVisible();
      }
    }

    function tryFillDialog(patientId) {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      const input = document.getElementById('multi_record_no[0]');
      if (!input) return;

      if (input.value.trim() !== '') return;

      input.value = patientId;
      input.focus();
      try { input.setSelectionRange(patientId.length, patientId.length); } catch (e) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      log.info('ID自動入力完了');

      const searchBtn = document.querySelector('#div_multi_record_no_input_0 > input.input_board_search_customer');
      if (searchBtn) {
        searchBtn.click();
        log.info('検索ボタン自動クリック');
      }
    }

    // モダリティ（CT/MRI）を自動選択（照射オーダーモード用）
    let trackedModalitySelect = null;
    function trySelectModality(modality) {
      if (!modality) return;

      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      // CTまたはMRIを含むか判定
      const isCT = modality.includes('CT');
      const isMRI = modality.includes('MRI');
      if (!isCT && !isMRI) return;

      // 「診療を選択」がCT/MRIになっているか確認
      const allSelects = dialog.querySelectorAll('select');
      for (const select of allSelects) {
        const options = Array.from(select.options);
        const optionTexts = options.map(opt => opt.text);

        // CTとMRIのみを持つセレクトを探す（CT/MRI詳細選択）
        if (optionTexts.length === 2 && optionTexts.includes('CT') && optionTexts.includes('MRI')) {
          // 同じセレクトには重複して設定しない
          if (trackedModalitySelect === select) return;

          // テキストからoptionを探してそのvalueを使用
          const targetText = isMRI ? 'MRI' : 'CT';
          const targetOption = options.find(opt => opt.text === targetText);
          if (targetOption) {
            select.value = targetOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            trackedModalitySelect = select;
            log.info('モダリティを自動選択:', targetText, '(value=' + targetOption.value + ')');
          }
          return;
        }
      }
    }

    // --------------------------------------------
    // Reserve→Henry連携：ツールチップにカルテボタン追加・ホバーでカルテ表示
    // --------------------------------------------

    // ツールチップ（クリックで表示）に「カルテを開く」ボタンを追加
    function addKarteButtonToTooltip(tooltip) {
      // 既にボタンがあれば何もしない
      if (tooltip.querySelector('#henry-open-karte-btn')) return;

      const historyBtn = tooltip.querySelector('.button_func_history');
      if (!historyBtn) return;

      const karteBtn = document.createElement('input');
      karteBtn.type = 'button';
      karteBtn.className = 'button';
      karteBtn.id = 'henry-open-karte-btn';
      karteBtn.value = 'カルテ';
      karteBtn.style.cssText = STYLES.karteBtn;

      karteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // セットアップ状態チェック
        const setup = checkSetupStatus();
        if (!setup.ok) {
          alert(setup.message);
          return;
        }

        // 患者番号を取得
        const numSpan = tooltip.querySelector('#reserve_tooltip_cus_record_no');
        const patientNumber = numSpan?.textContent.trim();
        if (!patientNumber) {
          alert('患者番号が取得できません');
          return;
        }

        // UUIDを取得してHenryを開く
        karteBtn.disabled = true;
        karteBtn.value = '読込中...';
        try {
          const uuid = await getPatientUuid(patientNumber);
          if (!uuid) {
            alert(`患者番号 ${patientNumber} が見つかりません`);
            return;
          }
          const url = CONFIG.HENRY_PATIENT_URL + uuid + '?tab=outpatient';
          window.open(url, '_blank');
        } catch (err) {
          log.error(err.message);
          alert('エラー: ' + err.message);
        } finally {
          karteBtn.disabled = false;
          karteBtn.value = 'カルテ';
        }
      });

      historyBtn.after(karteBtn);
      log.info('カルテボタンを追加');
    }

    // ツールチップの表示を監視
    const tooltipObserver = new MutationObserver(() => {
      const tooltip = document.getElementById('div_reserve_copy');
      if (tooltip && tooltip.style.display !== 'none' && tooltip.offsetParent !== null) {
        addKarteButtonToTooltip(tooltip);
      }
    });
    tooltipObserver.observe(document.body, { childList: true, subtree: false });

    // 初回チェック
    const initialTooltip = document.getElementById('div_reserve_copy');
    if (initialTooltip) {
      addKarteButtonToTooltip(initialTooltip);
    }

    // --------------------------------------------
    // ホバーでカルテ情報をプレビュー表示
    // --------------------------------------------
    let currentPatientNumber = null;
    let currentPatientUuid = null;
    let hoverTimeout = null;

    // 独立したプレビューウィンドウを作成
    let previewWindow = null;
    let closeTimeout = null;

    // プレビューウィンドウ用のスタイルを追加
    const previewStyle = document.createElement('style');
    previewStyle.textContent = `
      #henry-preview-window .datetime {
        display: block;
        margin-top: 4px;
      }
    `;
    document.head.appendChild(previewStyle);

    // プレビューウィンドウの高さを画面内に収める（位置は固定、max-heightで制限）
    function adjustPreviewPosition() {
      if (!previewWindow || previewWindow.style.display === 'none') return;

      const pwRect = previewWindow.getBoundingClientRect();
      const availableHeight = window.innerHeight - pwRect.top - 10;

      // 下端がはみ出す場合はmax-heightを制限
      if (pwRect.bottom > window.innerHeight - 10) {
        previewWindow.style.maxHeight = availableHeight + 'px';
      }
    }

    function createPreviewWindow() {
      const div = document.createElement('div');
      div.id = 'henry-preview-window';
      div.style.cssText = STYLES.previewWindow;

      div.addEventListener('mouseenter', () => {
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
      });

      div.addEventListener('mouseleave', () => {
        closeTimeout = setTimeout(() => {
          hidePreview();
        }, CONFIG.CLOSE_DELAY);
      });

      document.body.appendChild(div);
      return div;
    }

    function showPreview(originalTooltip) {
      if (!previewWindow) {
        previewWindow = createPreviewWindow();
      }

      // 元のツールチップの内容をコピー（生年月日・TELの前で改行）
      previewWindow.innerHTML = originalTooltip.innerHTML
        .replace(/生年月日/g, '<br>生年月日')
        .replace(/TEL/g, '<br>TEL');

      // 位置とサイズを元のツールチップに合わせる
      const rect = originalTooltip.getBoundingClientRect();
      previewWindow.style.left = rect.left + 'px';
      previewWindow.style.top = rect.top + 'px';
      previewWindow.style.width = rect.width + 'px';
      previewWindow.style.maxHeight = '';  // リセット（前回の制限をクリア）
      previewWindow.style.display = 'block';

      // 元のツールチップを非表示
      originalTooltip.style.display = 'none';

      // 画面外にはみ出さないように調整
      adjustPreviewPosition();

      return previewWindow;
    }

    function hidePreview() {
      if (previewWindow) {
        previewWindow.style.display = 'none';
      }
      currentPatientNumber = null;
      currentPatientUuid = null;
    }

    // カルテ情報をプレビューウィンドウに追加
    function appendKarteToPreview(content) {
      if (!previewWindow) return;

      // 既存のカルテ情報があれば削除
      const existing = previewWindow.querySelector('#henry-karte-info');
      if (existing) existing.remove();

      // カルテ情報を追加
      const karteDiv = document.createElement('div');
      karteDiv.id = 'henry-karte-info';
      karteDiv.style.cssText = STYLES.karteInfo;
      karteDiv.innerHTML = content;
      previewWindow.appendChild(karteDiv);

      // コンテンツ追加後に位置を再調整
      adjustPreviewPosition();
    }

    function parseEditorData(editorDataStr) {
      try {
        const data = JSON.parse(editorDataStr);
        return data.blocks.map(b => b.text).filter(t => t).join('\n');
      } catch (e) {
        return '(診療録を解析できませんでした)';
      }
    }

    async function fetchAndShowEncounter(patientUuid) {
      // キャッシュを確認
      if (karteCache.has(patientUuid)) {
        log.info('カルテ情報をキャッシュから取得');
        appendKarteToPreview(karteCache.get(patientUuid));
        return;
      }

      appendKarteToPreview('<div style="color:#666;">読み込み中...</div>');

      try {
        const result = await callHenryAPIWithRetry('EncountersInPatient', {
          patientId: patientUuid,
          startDate: null,
          endDate: null,
          pageSize: CONFIG.PREVIEW_COUNT,
          pageToken: null
        });

        const encounters = result.data?.encountersInPatient?.encounters ?? [];
        if (encounters.length === 0) {
          const noDataHtml = '<div style="color:#666;">外来記録がありません</div>';
          karteCache.set(patientUuid, noDataHtml);
          appendKarteToPreview(noDataHtml);
          return;
        }

        const htmlParts = encounters.map((encounter, index) => {
          const session = encounter.basedOn?.[0];
          const progressNote = encounter.records?.find(r => r.__typename === 'ProgressNote');

          const visitDate = session?.scheduleTime ? new Date(session.scheduleTime).toLocaleDateString('ja-JP') : '不明';
          const doctorName = session?.doctor?.name || '不明';
          const noteText = progressNote?.editorData ? parseEditorData(progressNote.editorData) : '(診療録なし)';
          const borderStyle = index < encounters.length - 1 ? 'border-bottom: 1px solid #ccc; margin-bottom: 12px; padding-bottom: 12px;' : '';

          return `
            <div style="${borderStyle}">
              <div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid #ddd;">
                <span style="font-weight:bold; color:#333;">${visitDate}</span>
                <span style="color:#666; margin-left:8px;">${escapeHtml(doctorName)}</span>
              </div>
              <div style="white-space:pre-wrap; color:#333; line-height:1.4;">${escapeHtml(noteText)}</div>
            </div>
          `;
        });

        const karteHtml = htmlParts.join('');
        karteCache.set(patientUuid, karteHtml);
        appendKarteToPreview(karteHtml);

      } catch (e) {
        log.error(e.message);
        // エラーはキャッシュしない（再試行できるように）
        appendKarteToPreview(`<div style="color:#c00;">エラー: ${escapeHtml(e.message)}</div>`);
      }
    }

    async function getPatientUuid(patientNumber) {
      try {
        const result = await callHenryAPIWithRetry('ListPatientsV2', {
          input: {
            generalFilter: { query: patientNumber, patientCareType: 'PATIENT_CARE_TYPE_ANY' },
            hospitalizationFilter: { doctorUuid: null, roomUuids: [], wardUuids: [], states: [], onlyLatest: true },
            sorts: [],
            pageSize: 10,  // 複数件取得して完全一致を探す
            pageToken: ''
          }
        });

        const entries = result.data?.listPatientsV2?.entries ?? [];

        // 患者番号が完全一致するエントリを探す（患者取り違え防止）
        const exactMatch = entries.find(e => e.patient?.serialNumber === patientNumber);
        if (!exactMatch) {
          log.warn(`患者番号 ${patientNumber} の完全一致が見つかりません`);
          return null;
        }

        return exactMatch.patient.uuid;

      } catch (e) {
        log.error('患者UUID取得エラー: ' + e.message);
        return null;
      }
    }

    // ホバーイベント：予約枠にホバーしたらプレビューウィンドウを表示
    document.addEventListener('mouseover', async (e) => {
      // 予約枠にホバー
      const reserveTarget = e.target.closest('.div_reserve');
      if (!reserveTarget) return;

      // 閉じるタイマーをキャンセル
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }

      // 少し待ってツールチップが表示されるのを待つ
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(async () => {
        const tooltip = document.getElementById('div_reserve_copy');
        if (!tooltip) {
          log.warn('ツールチップが見つかりません');
          return;
        }

        // 患者番号を取得
        const numSpan = tooltip.querySelector('#reserve_tooltip_cus_record_no');
        if (!numSpan) {
          log.warn('患者番号要素が見つかりません');
          return;
        }

        const patientNumber = numSpan.textContent.trim();
        if (!patientNumber) return;
        if (patientNumber === currentPatientNumber && previewWindow?.style.display !== 'none') return;

        currentPatientNumber = patientNumber;
        log.info('患者番号検出: ' + patientNumber);

        // プレビューウィンドウを表示（ツールチップの内容をコピー）
        showPreview(tooltip);

        // セットアップ状態チェック
        const setup = checkSetupStatus();
        if (!setup.ok) {
          appendKarteToPreview('<div style="color:#c00;">Henryにログインしてください</div>');
          return;
        }

        const uuid = await getPatientUuid(patientNumber);
        if (!uuid) {
          appendKarteToPreview('<div style="color:#c00;">患者が見つかりません</div>');
          return;
        }
        currentPatientUuid = uuid;
        await fetchAndShowEncounter(uuid);
      }, CONFIG.HOVER_DELAY);
    });

    // 予約枠からマウスが離れたら閉じるタイマーを開始
    document.addEventListener('mouseout', (e) => {
      const reserveTarget = e.target.closest('.div_reserve');
      if (!reserveTarget) return;

      // プレビューウィンドウに移動中でなければ閉じるタイマーを開始
      closeTimeout = setTimeout(() => {
        if (previewWindow && !previewWindow.matches(':hover')) {
          hidePreview();
        }
      }, CONFIG.CLOSE_DELAY);
    });

  }
})();
