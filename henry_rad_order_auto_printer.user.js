// ==UserScript==
// @name         照射オーダー自動印刷
// @namespace    https://henry-app.jp/
// @version      5.0.4
// @description  「外来 照射オーダー」の完了時、APIから直接データを取得して印刷ダイアログを表示
// @author       Henry UI Lab
// @match        https://henry-app.jp/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_order_auto_printer.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_order_auto_printer.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'RadOrderAutoPrint';
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
    // データ取得（graphql-v2 直接呼び出し）
    // ==========================================
    const DataFetcher = {
        /**
         * EncounterEditorQuery で患者情報と診療科を取得
         * graphql-v2 エンドポイントを使用
         */
        async getPatientAndEncounter(encounterId) {
            if (!encounterId) return { patient: null, departmentName: '' };

            if (!AuthCapture.hasAuth()) {
                Logger.log('認証情報がキャプチャされていません', 'error');
                return { patient: null, departmentName: '' };
            }

            try {
                // graphql-v2 に直接 POST（元のfetchを使用してフックを回避）
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

                if (!encounter) {
                    Logger.log('EncounterEditorQuery: データなし', 'warn');
                    return { patient: null, departmentName: '' };
                }

                // 患者情報を変換
                const patient = encounter.patient ? {
                    fullName: encounter.patient.fullName || '',
                    serialNumber: encounter.patient.serialNumber || '',
                    serialNumberPrefix: '',
                    fullNamePhonetic: '',
                    detail: {
                        birthDate: this._parseBirthDate(encounter.patient.birthDate),
                        sexType: null // EncounterEditorQuery には性別がない
                    }
                } : null;

                // 診療科を取得（basedOn[0].doctor.departmentName）
                const departmentName = encounter.basedOn?.[0]?.doctor?.departmentName || '';

                return { patient, departmentName };
            } catch (e) {
                Logger.log(`患者情報取得エラー: ${e.message}`, 'error');
                return { patient: null, departmentName: '' };
            }
        },

        /**
         * "YYYY-MM-DD" 形式を { year, month, day } に変換
         */
        _parseBirthDate(dateStr) {
            if (!dateStr) return null;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return null;
            return {
                year: parseInt(parts[0], 10),
                month: parseInt(parts[1], 10),
                day: parseInt(parts[2], 10)
            };
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
    // HTML生成
    // ==========================================
    const HtmlGenerator = {
        generate(order, patient, encounter) {
            const now = new Date();
            const issueDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const patientId = `${patient.serialNumberPrefix || ''}${patient.serialNumber || ''}`;
            const sex = formatSex(patient.detail?.sexType);
            const birthDate = formatBirthDate(patient.detail?.birthDate);
            const department = encounter?.departmentName || '';

            const modality = formatModality(order.detail?.imagingModality);
            const orderDate = formatDate(order.date);
            const doctorName = order.doctor?.name || '';
            const note = order.detail?.note || '';

            // シリーズデータ取得
            const series = this._extractSeries(order.detail?.condition);

            return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>照射録</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body {
            font-family: "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            padding: 15px;
        }
        .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
        .header h1 { font-size: 18pt; margin: 0; }
        .header .issue-date { font-size: 10pt; }
        .patient-section { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .patient-info { flex: 1; }
        .patient-label { font-size: 9pt; color: #666; }
        .patient-name { font-size: 14pt; font-weight: bold; margin: 2px 0; }
        .patient-detail { font-size: 10pt; }
        .signature-section { display: flex; gap: 10px; }
        .signature-box { text-align: center; width: 80px; }
        .signature-label { font-size: 9pt; border: 1px solid #333; border-bottom: none; padding: 2px 5px; }
        .signature-content { border: 1px solid #333; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 10pt; }
        .order-info { margin-bottom: 15px; }
        .order-info table { width: 100%; border-collapse: collapse; }
        .order-info td { padding: 5px 8px; border: 1px solid #333; }
        .order-info td:first-child { width: 100px; background: #f5f5f5; font-weight: bold; }
        .series-header { font-weight: bold; text-align: center; margin: 10px 0 5px; }
        .series-table { width: 100%; border-collapse: collapse; }
        .series-table th, .series-table td { border: 1px solid #333; padding: 5px; text-align: center; vertical-align: middle; }
        .series-table th { background: #e8e8e8; font-weight: normal; }
        .series-table td.note { text-align: left; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>照射録</h1>
        <div class="issue-date">発行日時 ${issueDateTime}</div>
    </div>

    <div class="patient-section">
        <div class="patient-info">
            <div class="patient-label">患者</div>
            <div class="patient-name">${patient.fullName || ''}</div>
            <div class="patient-detail">${patientId} ${patient.fullNamePhonetic || ''} ${sex}</div>
            <div class="patient-detail">生年月日 ${birthDate}</div>
            <div class="patient-detail">外来: ${department}</div>
        </div>
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-label">(医師署名)</div>
                <div class="signature-content">${doctorName}</div>
            </div>
            <div class="signature-box">
                <div class="signature-label">(技師署名)</div>
                <div class="signature-content"></div>
            </div>
        </div>
    </div>

    <div class="order-info">
        <table>
            <tr><td>指示医師</td><td>${doctorName}</td></tr>
            <tr><td>照射日時</td><td>${orderDate}</td></tr>
            <tr><td>モダリティ</td><td>${modality}</td></tr>
            <tr><td>備考</td><td>${note}</td></tr>
        </table>
    </div>

    <div class="series-header">指示内容</div>
    <table class="series-table">
        <thead>
            <tr>
                <th style="width: 30px"></th>
                <th>部位</th>
                <th>側性</th>
                <th>方向</th>
                <th>撮影条件</th>
                <th>枚数</th>
                <th>補足</th>
            </tr>
        </thead>
        <tbody>
            ${this._generateSeriesRows(series)}
        </tbody>
    </table>

    <script>
        // TODO: デバッグ完了後に有効化
        // window.onload = function() {
        //     window.print();
        // };
    </script>
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
                        <td>${i + 1}</td>
                        <td>${s.bodySite || ''}</td>
                        <td>${s.laterality || ''}</td>
                        <td>${s.bodyPositions || ''}</td>
                        <td>${s.configuration || ''}</td>
                        <td>${s.filmCount || ''}</td>
                        <td class="note">${s.note || ''}</td>
                    </tr>
                `;
            }

            return rows;
        },
    };

    // ==========================================
    // 印刷実行
    // ==========================================
    const Printer = {
        /**
         * 印刷を実行
         * @param {Object} orderData - CreateImagingOrder レスポンスデータ
         */
        async print(orderData) {
            Logger.log(`印刷開始: orderUuid=${orderData.uuid?.substring(0, 8)}...`);

            // 患者情報と診療科を取得（graphql-v2）
            const encounterId = orderData.encounterId?.value;
            const { patient, departmentName } = await DataFetcher.getPatientAndEncounter(encounterId);

            if (!patient) {
                Logger.log('患者情報の取得に失敗しました', 'error');
                FailureManager.register('データ取得失敗');
                return;
            }

            Logger.log('データ取得完了');

            // encounter オブジェクトを作成（HtmlGenerator 用）
            const encounter = { departmentName };

            // HTML生成（orderData を直接使用）
            const html = HtmlGenerator.generate(orderData, patient, encounter);

            // 新しいウィンドウで印刷
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                Logger.log('ポップアップがブロックされました', 'error');
                FailureManager.register('ポップアップブロック');
                return;
            }

            printWindow.document.write(html);
            printWindow.document.close();

            FailureManager.recordSuccess();
            Logger.log('✓ 印刷ダイアログを表示しました', 'success');
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
                        this._onOrderCreated(orderData);
                    }
                }
            } catch (e) {
                // パースエラーは無視
            }
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
        Dashboard.init();
        Dashboard.updateStatus();

        FetchHook.install();
        cleaner.add(() => FetchHook.uninstall());

        cleaner.add(() => Dashboard.destroy());
    };

    utils.subscribeNavigation(cleaner, init);
})();
