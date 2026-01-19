// ==UserScript==
// @name         照射オーダー自動印刷
// @namespace    https://henry-app.jp/
// @version      5.4.0
// @description  「外来 照射オーダー」の完了時、APIから直接データを取得して印刷ダイアログを表示
// @author       Henry UI Lab
// @match        https://henry-app.jp/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_info
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_image_order_smart_printer.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_image_order_smart_printer.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'ImageOrderSmartPrint';
    const VERSION = GM_info.script.version;

    // ==========================================
    // 共有設定(localStorage ベース)
    // ==========================================
    const STORAGE_PREFIX = 'henry_ui_lab_';

    const SharedSettings = {
        get(key, defaultValue) {
            try {
                const raw = localStorage.getItem(STORAGE_PREFIX + key);
                if (raw === null) return defaultValue;
                return JSON.parse(raw);
            } catch {
                return defaultValue;
            }
        }
    };

    // ==========================================
    // 起動時設定チェック
    // ==========================================
    const isEnabled = SharedSettings.get('auto_print_radiation', true);
    if (!isEnabled) {
        console.log(`[${SCRIPT_NAME}] 設定により無効化`);
        return;
    }

    // ==========================================
    // HenryCore連携
    // ==========================================
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const HenryCore = pageWindow.HenryCore;

    if (!HenryCore) {
        console.error(`[${SCRIPT_NAME}] HenryCoreが見つかりません`);
        return;
    }

    const { utils } = HenryCore;

    // ==========================================
    // 元の fetch を保存（フック前、DataFetcherで使用）
    // ==========================================
    const originalFetch = pageWindow.fetch.bind(pageWindow);

    // ==========================================
    // 多重起動ガード
    // ==========================================
    const GLOBAL_KEY = '__henry_autoPrint_radiationOrder__';
    if (pageWindow[GLOBAL_KEY]?.started) return;
    pageWindow[GLOBAL_KEY] = { started: true };

    // ==========================================
    // 設定 & 定数
    // ==========================================
    const CONFIG = Object.freeze({
        cooldownMs: 3000,
        maxFailureScore: 5,
        printDelayMs: 500,
    });

    const THEME = Object.freeze({
        bg: 'rgba(255, 255, 255, 0.97)',
        text: '#333',
        border: '#ddd',
        shadow: '0 4px 16px rgba(0,0,0,0.12)',
        font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    // ==========================================
    // 状態管理
    // ==========================================
    const state = {
        lastTriggerTime: 0,
        failureCount: 0,
        failureScore: 0,
        isDisabled: false,
    };

    // ==========================================
    // ロガー
    // ==========================================
    const Logger = {
        _queue: [],
        _dashboard: null,

        log(msg, type = 'info') {
            const time = new Date().toLocaleTimeString('ja-JP');
            const formatted = `[${time}] ${msg}`;
            console.log(`[${SCRIPT_NAME}] ${msg}`);

            if (this._dashboard?.logContainer) {
                this._appendEntry(formatted, type);
            } else {
                this._queue.push({ formatted, type });
            }
        },

        _appendEntry(text, type) {
            const entry = document.createElement('div');
            entry.textContent = text;
            entry.style.cssText = `
                padding: 2px 0;
                border-bottom: 1px solid #f0f0f0;
                color: ${type === 'error' ? '#dc2626' :
                         type === 'success' ? '#16a34a' :
                         type === 'warn' ? '#d97706' : '#374151'};
            `;
            this._dashboard.logContainer.appendChild(entry);
            this._dashboard.logContainer.scrollTop = this._dashboard.logContainer.scrollHeight;
        },

        flushQueue() {
            if (!this._dashboard?.logContainer) return;
            for (const { formatted, type } of this._queue) {
                this._appendEntry(formatted, type);
            }
            this._queue = [];
        },

        setDashboard(dashboard) {
            this._dashboard = dashboard;
            this.flushQueue();
        },
    };

    // ==========================================
    // 失敗管理
    // ==========================================
    const FailureManager = {
        register(reason) {
            if (state.isDisabled) return;

            state.failureScore += 1;
            state.failureCount += 1;

            Logger.log(
                `失敗 #${state.failureCount} (スコア: ${state.failureScore}/${CONFIG.maxFailureScore}): ${reason}`,
                'warn'
            );

            if (state.failureScore >= CONFIG.maxFailureScore) {
                state.isDisabled = true;
                Logger.log('失敗スコア上限に達したため自動停止しました', 'error');
                Dashboard.updateStatus();
            }
        },

        recordSuccess() {
            state.failureScore = Math.max(0, state.failureScore - 1);
        },
    };

    // ==========================================
    // デバッグダッシュボード
    // ==========================================
    const Dashboard = {
        el: null,
        logContainer: null,
        statusEl: null,

        init() {
            if (this.el) return;
            this._create();
            Logger.setDashboard(this);
            Logger.log(`v${VERSION} 起動 (直接印刷モード)`, 'info');
        },

        _create() {
            const panel = document.createElement('div');
            panel.id = 'henry-auto-print-dashboard';
            panel.innerHTML = `
                <style>
                    #henry-auto-print-dashboard {
                        position: fixed;
                        bottom: 10px;
                        right: 10px;
                        width: 360px;
                        height: 280px;
                        background: ${THEME.bg};
                        border: 1px solid ${THEME.border};
                        border-radius: 10px;
                        box-shadow: ${THEME.shadow};
                        z-index: 999999;
                        display: flex;
                        flex-direction: column;
                        font-family: ${THEME.font};
                        font-size: 12px;
                        color: ${THEME.text};
                        overflow: hidden;
                    }
                    #henry-auto-print-dashboard .header {
                        padding: 10px 12px;
                        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                        border-bottom: 1px solid ${THEME.border};
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        cursor: move;
                        user-select: none;
                    }
                    #henry-auto-print-dashboard .header-title {
                        flex: 1;
                        font-weight: 600;
                        color: #1f2937;
                    }
                    #henry-auto-print-dashboard .status-badge {
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: 500;
                    }
                    #henry-auto-print-dashboard .status-active {
                        background: #dcfce7;
                        color: #166534;
                    }
                    #henry-auto-print-dashboard .status-disabled {
                        background: #fee2e2;
                        color: #991b1b;
                    }
                    #henry-auto-print-dashboard .header-btn {
                        padding: 4px 8px;
                        border: 1px solid #d1d5db;
                        border-radius: 4px;
                        background: white;
                        font-size: 10px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    #henry-auto-print-dashboard .header-btn:hover {
                        background: #f3f4f6;
                        border-color: #9ca3af;
                    }
                    #henry-auto-print-dashboard .log-container {
                        flex: 1;
                        padding: 8px 12px;
                        overflow-y: auto;
                        font-size: 11px;
                        line-height: 1.5;
                    }
                </style>
                <div class="header">
                    <span class="header-title">🖨️ Auto Print Log</span>
                    <span class="status-badge status-active">稼働中</span>
                    <button class="header-btn" data-action="clear">Clear</button>
                    <button class="header-btn" data-action="hide">×</button>
                </div>
                <div class="log-container"></div>
            `;

            document.body.appendChild(panel);
            this.el = panel;
            this.logContainer = panel.querySelector('.log-container');
            this.statusEl = panel.querySelector('.status-badge');

            const header = panel.querySelector('.header');
            header.querySelector('[data-action="clear"]').onclick = () => {
                this.logContainer.innerHTML = '';
            };
            header.querySelector('[data-action="hide"]').onclick = () => {
                panel.style.display = 'none';
                GM_setValue('dashboardVisible', false);
            };

            this._setupDrag(panel, header);

            const visible = GM_getValue('dashboardVisible', true);
            panel.style.display = visible ? 'flex' : 'none';
        },

        _setupDrag(panel, handle) {
            let isDragging = false;
            let startX = 0, startY = 0;
            let offsetX = 0, offsetY = 0;

            handle.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
                panel.style.transition = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
                panel.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
                panel.style.transition = '';
            });
        },

        updateStatus() {
            if (!this.statusEl) return;
            if (state.isDisabled) {
                this.statusEl.textContent = '停止中';
                this.statusEl.className = 'status-badge status-disabled';
            } else {
                this.statusEl.textContent = '稼働中';
                this.statusEl.className = 'status-badge status-active';
            }
        },

        destroy() {
            if (this.el) {
                this.el.remove();
                this.el = null;
                this.logContainer = null;
                this.statusEl = null;
            }
        },
    };

    // ==========================================
    // 認証ヘッダーキャプチャ
    // ==========================================
    const AuthCapture = {
        authorization: null,
        organizationUuid: null,

        /**
         * リクエストから認証ヘッダーをキャプチャ
         */
        capture(args) {
            try {
                const options = args[1];
                if (!options?.headers) return;

                // Headers オブジェクトまたはプレーンオブジェクト
                const headers = options.headers;
                if (headers instanceof Headers) {
                    const auth = headers.get('authorization');
                    const org = headers.get('x-auth-organization-uuid');
                    if (auth) this.authorization = auth;
                    if (org) this.organizationUuid = org;
                } else if (typeof headers === 'object') {
                    // キー名は大文字小文字を区別しない
                    for (const [key, value] of Object.entries(headers)) {
                        if (key.toLowerCase() === 'authorization') this.authorization = value;
                        if (key.toLowerCase() === 'x-auth-organization-uuid') this.organizationUuid = value;
                    }
                }
            } catch (e) {
                // キャプチャエラーは無視
            }
        },

        /**
         * キャプチャ済みの認証ヘッダーを取得
         */
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
    // データ取得（graphql 直接呼び出し）
    // ==========================================
    const DataFetcher = {
        /**
         * GetPatient で患者情報（フリガナ・性別含む）を取得
         * graphql エンドポイントを使用
         */
        async getPatient(patientUuid) {
            if (!patientUuid) return null;

            if (!AuthCapture.hasAuth()) {
                Logger.log('認証情報がキャプチャされていません', 'error');
                return null;
            }

            // インライン方式（変数型が公開されていないため）
            const query = `
                query GetPatient {
                    getPatient(input: { uuid: "${patientUuid}" }) {
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
                const response = await originalFetch('https://henry-app.jp/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...AuthCapture.getHeaders()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        operationName: 'GetPatient',
                        query: query
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const json = await response.json();
                return json.data?.getPatient || null;
            } catch (e) {
                Logger.log(`患者情報取得エラー: ${e.message}`, 'error');
                return null;
            }
        },

        /**
         * EncounterEditorQuery で診療科を取得
         * graphql-v2 エンドポイントを使用
         */
        async getDepartmentName(encounterId) {
            if (!encounterId) return '';

            if (!AuthCapture.hasAuth()) {
                return '';
            }

            try {
                const response = await originalFetch('https://henry-app.jp/graphql-v2', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...AuthCapture.getHeaders()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        operationName: 'EncounterEditorQuery',
                        variables: { id: encounterId },
                        extensions: {
                            persistedQuery: {
                                version: 1,
                                sha256Hash: 'd0b915a8f1fc7508ebd07f1c47a1d804419b4f31668c66363c452c3e14dfe407'
                            }
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const json = await response.json();
                const encounter = json.data?.encounter;

                return encounter?.basedOn?.[0]?.doctor?.departmentName || '';
            } catch (e) {
                Logger.log(`診療科取得エラー: ${e.message}`, 'error');
                return '';
            }
        }
    };

    // ==========================================
    // ユーティリティ
    // ==========================================
    const formatDate = (date) => {
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
            'LATERALITY_NONE': '任意',
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
    // HTML生成（Henry本体と同じ構造）
    // ==========================================
    const HtmlGenerator = {
        generate(order, patient, departmentName) {
            const now = new Date();
            const issueDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const patientId = `${patient.serialNumberPrefix || ''}${patient.serialNumber || ''}`;
            const fullNamePhonetic = patient.fullNamePhonetic || '';
            const sex = formatSex(patient.detail?.sexType);
            const birthDate = formatBirthDate(patient.detail?.birthDate);

            const modality = formatModality(order.detail?.imagingModality);
            const orderDate = formatDate(order.date);
            const doctorName = order.doctor?.name || '';
            const note = order.detail?.note || '';

            // シリーズデータ取得
            const series = this._extractSeries(order.detail?.condition);

            // CSS（Henry本体と同じスタイル）
            const css = `
/* CSS Reset */
html, body, div, span, h1, h2, p, table, caption, tbody, thead, tr, th, td, section {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    font: inherit;
    vertical-align: baseline;
}
table {
    border-collapse: collapse;
    border-spacing: 0;
}
body {
    font-family: "Noto Sans JP", "Hiragino Sans", "ヒラギノ角ゴシック", sans-serif;
    font-weight: normal;
    font-size: 14px;
    line-height: 24px;
    color: #000;
}
* {
    box-sizing: border-box;
    print-color-adjust: exact;
}

/* Page container */
.page-container {
    position: relative;
}
.inner {
    padding: 44pt 48pt;
}

/* Header */
.header-row {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    align-items: flex-start;
}
.title {
    font-size: 20pt;
    font-weight: 700;
    line-height: 28pt;
    color: rgba(0, 0, 0, 0.82);
}
.issue-date {
    font-size: 12pt;
    font-weight: 700;
    line-height: 20pt;
    color: rgba(0, 0, 0, 0.82);
}

/* Patient section */
.patient-row {
    display: grid;
    grid-template-columns: 1fr auto;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 8px;
}
.patient-label {
    font-size: 9pt;
    font-weight: 600;
    line-height: 15pt;
    color: rgba(0, 0, 0, 0.82);
    padding: 4px 0;
}
.patient-name {
    font-size: 12pt;
    font-weight: 700;
    line-height: 20pt;
    color: rgba(0, 0, 0, 0.82);
}
.patient-detail {
    font-size: 9pt;
    font-weight: 400;
    line-height: 15pt;
    color: rgba(0, 0, 0, 0.82);
}

/* Signature table */
.signature-table {
    border: 1px solid #000;
}
.signature-table th {
    font-size: 10.5pt;
    font-weight: 400;
    padding: 5px 0 0;
    text-align: center;
    vertical-align: baseline;
    width: 72pt;
}
.signature-table td {
    border: 1px solid #000;
    width: 72pt;
    height: 71pt;
    text-align: center;
    vertical-align: middle;
    font-size: 10.5pt;
}

/* Order info table */
.order-table {
    width: 100%;
    border: 0.5px solid #000;
    margin-top: 21pt;
}
.order-table th {
    font-size: 10.5pt;
    font-weight: 700;
    padding: 3pt 6pt;
    border: 0.5px solid #000;
    width: 68pt;
    text-align: left;
}
.order-table td {
    font-size: 10.5pt;
    font-weight: 400;
    padding: 3pt 6pt;
    border: 0.5px solid #000;
}

/* Series table */
.series-table {
    width: 100%;
    border: 0.5px solid #000;
    margin-top: 17pt;
}
.series-table thead th {
    font-size: 10.5pt;
    font-weight: 700;
    padding: 3pt 6pt;
    border: 0.5px solid #000;
    text-align: center;
}
.series-table thead td {
    font-size: 10.5pt;
    font-weight: 400;
    padding: 3pt 6pt;
    border: 0.5px solid #000;
    text-align: center;
}
.series-table tbody td {
    font-size: 10.5pt;
    font-weight: 400;
    padding: 3pt 6pt;
    border: 0.5px solid #000;
    text-align: center;
}

/* Print styles */
@media print {
    @page {
        size: A4;
        margin: 10mm;
    }
    body {
        width: 100%;
    }
    .page-container {
        page-break-after: always;
    }
}
            `;

            return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>照射録</title>
    <style>${css}</style>
</head>
<body>
    <div class="page-container">
        <div class="inner">
            <section>
                <!-- ヘッダー: タイトルと発行日時 -->
                <div class="header-row">
                    <h1 class="title">照射録</h1>
                    <h2 class="issue-date">発行日時 ${issueDateTime}</h2>
                </div>

                <!-- 患者情報と署名欄 -->
                <div class="patient-row">
                    <div>
                        <p class="patient-label">患者</p>
                        <h2 class="patient-name">${patient.fullName || ''}</h2>
                        <p class="patient-detail">${patientId} ${fullNamePhonetic} ${sex}</p>
                        <p class="patient-detail">生年月日 ${birthDate}</p>
                        <p class="patient-detail">外来: ${departmentName}</p>
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
                <!-- オーダー情報 -->
                <table class="order-table">
                    <tbody>
                        <tr><th>指示医師</th><td>${doctorName}</td></tr>
                        <tr><th>照射日時</th><td><span>${orderDate}</span></td></tr>
                        <tr><th>モダリティ</th><td>${modality}</td></tr>
                        <tr><th>備考</th><td><span>${note}</span></td></tr>
                    </tbody>
                </table>
            </section>

            <section>
                <!-- 指示内容 -->
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
                            <td style="width: 32%;">補足</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${this._generateSeriesRows(series)}
                    </tbody>
                </table>
            </section>
        </div>
    </div>
</body>
</html>
            `.trim();
        },

        _extractSeries(condition) {
            if (!condition) return [];

            // Plain Radiography Digital
            if (condition.plainRadiographyDigital?.series) {
                return condition.plainRadiographyDigital.series.map(s => ({
                    bodySite: s.bodySite?.name || '',
                    laterality: formatLaterality(s.laterality),
                    bodyPositions: formatBodyPosition(s.bodyPositions),
                    configuration: s.configuration || '',
                    filmCount: s.filmCount?.value || '',
                    note: s.note || '',
                }));
            }

            // Plain Radiography Analog
            if (condition.plainRadiographyAnalog?.series) {
                return condition.plainRadiographyAnalog.series.map(s => ({
                    bodySite: s.bodySite?.name || '',
                    laterality: formatLaterality(s.laterality),
                    bodyPositions: formatBodyPosition(s.bodyPositions),
                    configuration: s.configuration || '',
                    filmCount: s.filmCount?.value || '',
                    note: s.note || '',
                }));
            }

            // CT
            if (condition.ct?.series) {
                return condition.ct.series.map(s => ({
                    bodySite: s.bodySite?.name || '',
                    laterality: formatLaterality(s.laterality),
                    bodyPositions: '',
                    configuration: '',
                    filmCount: '',
                    note: s.note || '',
                }));
            }

            // MRI
            if (condition.mriAbove_1_5AndBelow_3Tesla?.series) {
                return condition.mriAbove_1_5AndBelow_3Tesla.series.map(s => ({
                    bodySite: s.bodySite?.name || '',
                    laterality: formatLaterality(s.laterality),
                    bodyPositions: '',
                    configuration: '',
                    filmCount: '',
                    note: s.note || '',
                }));
            }

            // MD
            if (condition.md?.bodySites) {
                return condition.md.bodySites.map(s => ({
                    bodySite: s.bodySite?.name || '',
                    laterality: formatLaterality(s.laterality),
                    bodyPositions: '',
                    configuration: '',
                    filmCount: '',
                    note: condition.md.note || '',
                }));
            }

            return [];
        },

        _generateSeriesRows(series) {
            const maxRows = 6;
            let rows = '';

            for (let i = 0; i < maxRows; i++) {
                const s = series[i] || {};
                rows += `
                        <tr>
                            <td style="width: 4%;">${i + 1}</td>
                            <td style="width: 8%;">${s.bodySite || ''}</td>
                            <td style="width: 8%;">${s.laterality || ''}</td>
                            <td style="width: 16%;">${s.bodyPositions || ''}</td>
                            <td style="width: 30%;">${s.configuration || ''}</td>
                            <td style="width: 10%;">${s.filmCount || ''}</td>
                            <td style="width: 32%;">${s.note || ''}</td>
                        </tr>`;
            }

            return rows;
        },
    };

    // ==========================================
    // 印刷実行（iframe方式）
    // ==========================================
    const Printer = {
        /**
         * 印刷を実行
         * @param {Object} orderData - CreateImagingOrder レスポンスデータ
         */
        async print(orderData) {
            Logger.log(`印刷開始: orderUuid=${orderData.uuid?.substring(0, 8)}...`);

            // 患者UUID と encounterID を取得
            const patientUuid = orderData.patientUuid;
            const encounterId = orderData.encounterId?.value;

            // 患者情報と診療科を並列で取得
            const [patient, departmentName] = await Promise.all([
                DataFetcher.getPatient(patientUuid),
                DataFetcher.getDepartmentName(encounterId)
            ]);

            if (!patient) {
                Logger.log('患者情報の取得に失敗しました', 'error');
                FailureManager.register('データ取得失敗');
                return;
            }

            Logger.log('データ取得完了');

            // HTML生成（orderData を直接使用）
            const html = HtmlGenerator.generate(orderData, patient, departmentName);

            // iframe方式で印刷（URLが正しく表示される）
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 0; height: 0;';
            document.body.appendChild(iframe);

            iframe.contentDocument.open();
            iframe.contentDocument.write(html);
            iframe.contentDocument.close();

            // iframeの読み込み完了を待ってから印刷
            iframe.onload = () => {
                try {
                    iframe.contentWindow.print();
                    FailureManager.recordSuccess();
                    Logger.log('✓ 印刷ダイアログを表示しました', 'success');
                } catch (e) {
                    Logger.log(`印刷エラー: ${e.message}`, 'error');
                    FailureManager.register('印刷失敗');
                } finally {
                    // 印刷後にiframeを削除（少し遅延させる）
                    setTimeout(() => {
                        iframe.remove();
                    }, 1000);
                }
            };
        },
    };

    // ==========================================
    // Fetch フック
    // ==========================================
    const FetchHook = {
        installed: false,

        install() {
            if (this.installed) return;
            this.installed = true;
            const self = this;

            pageWindow.fetch = async function(...args) {
                // GraphQL リクエストをチェック
                const url = args[0]?.url || args[0];
                if (typeof url === 'string' && url.includes('/graphql')) {
                    // 認証ヘッダーをキャプチャ
                    AuthCapture.capture(args);
                }

                const response = await originalFetch(...args);

                if (typeof url === 'string' && url.includes('/graphql')) {
                    self._handleGraphQLResponse(response.clone(), args);
                }

                return response;
            };

            Logger.log('Fetchフックをインストールしました');
        },

        uninstall() {
            if (this.installed) {
                pageWindow.fetch = originalFetch;
                this.installed = false;
                Logger.log('Fetchフックをアンインストールしました');
            }
        },

        async _handleGraphQLResponse(response, args) {
            try {
                const body = args[1]?.body;
                if (!body) return;

                const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                const opName = parsed.operationName;

                // CreateImagingOrder または UpsertImagingOrder を検出
                if (opName === 'CreateImagingOrder' || opName === 'UpsertImagingOrder') {
                    const json = await response.json();
                    const orderData = json.data?.createImagingOrder || json.data?.upsertImagingOrder;

                    if (orderData?.uuid && orderData?.isOutpatient) {
                        // 未来日付かどうかを判定（予約システム連携の対象）
                        const dateObj = parsed.variables?.input?.date;
                        if (dateObj && this._isFutureDate(dateObj)) {
                            Logger.log('未来日付の照射オーダー - 予約システム連携を待機', 'info');
                            GM_setValue('skipAutoPrint', true);
                            GM_setValue('deferredOrderData', orderData);

                            // 60秒後にまだ待機中なら印刷を実行（reserve_integrationが動作しなかった場合のフォールバック）
                            setTimeout(() => {
                                if (GM_getValue('skipAutoPrint', false)) {
                                    Logger.log('予約システム連携タイムアウト - 印刷を実行', 'warn');
                                    GM_setValue('skipAutoPrint', false);
                                }
                            }, 60000);
                            return;
                        }

                        this._onOrderCreated(orderData);
                    }
                }
            } catch (e) {
                // パースエラーは無視
            }
        },

        _isFutureDate(dateObj) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const target = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
            return target > today;
        },

        _onOrderCreated(orderData) {
            Dashboard.init();

            if (state.isDisabled) return;

            const now = Date.now();
            if (now - state.lastTriggerTime < CONFIG.cooldownMs) {
                Logger.log('クールダウン中のためスキップ', 'warn');
                return;
            }

            state.lastTriggerTime = now;
            Logger.log('照射オーダー作成を検出');

            // 予約システム連携中は印刷を遅延
            if (GM_getValue('skipAutoPrint', false)) {
                Logger.log('予約システム連携中のため印刷を遅延', 'info');
                GM_setValue('deferredOrderData', orderData);
                return;
            }

            // 少し待ってから印刷（UIの更新を待つ）
            setTimeout(() => {
                Printer.print(orderData);
            }, CONFIG.printDelayMs);
        },
    };

    // ==========================================
    // 初期化
    // ==========================================
    const cleaner = utils.createCleaner();

    const init = () => {
        // 前回の残骸をクリア（ブラウザを閉じた場合などに残る可能性がある）
        GM_setValue('skipAutoPrint', false);
        GM_setValue('deferredOrderData', null);

        Dashboard.init();
        Dashboard.updateStatus();

        FetchHook.install();
        cleaner.add(() => FetchHook.uninstall());

        // 予約システム連携完了後の遅延印刷を監視
        const listenerId = GM_addValueChangeListener('skipAutoPrint', (name, oldValue, newValue, remote) => {
            // falseになった時（予約完了時）に遅延していた印刷を実行
            if (newValue === false && oldValue === true) {
                const deferredData = GM_getValue('deferredOrderData', null);
                if (deferredData) {
                    Logger.log('予約完了後の遅延印刷を実行');
                    GM_setValue('deferredOrderData', null);
                    setTimeout(() => {
                        Printer.print(deferredData);
                    }, CONFIG.printDelayMs);
                }
            }
        });
        cleaner.add(() => GM_removeValueChangeListener(listenerId));

        cleaner.add(() => Dashboard.destroy());
    };

    utils.subscribeNavigation(cleaner, init);
})();
