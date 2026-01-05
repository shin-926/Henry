// ==UserScript==
// @name         Henry: Auto Print Radiation Order
// @namespace    https://henry-app.jp/
// @version      3.2.0
// @description  「外来 照射オーダー」の完了時、入力内容と一致するオーダーを特定して印刷ダイアログを開き、印刷ボタンを自動クリック
// @author       Henry UI Lab
// @match        https://henry-app.jp/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_order_auto_printer.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_order_auto_printer.user.js
// ==/UserScript==

(function () {
    'use strict';

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
            } catch (e) {
                return defaultValue;
            }
        }
    };

    // ==========================================
    // 起動時設定チェック
    // ==========================================
    const isEnabled = SharedSettings.get('auto_print_radiation', true);

    console.log('=== AUTO PRINT RADIATION DEBUG START ===');
    console.log('1. Storage prefix:', STORAGE_PREFIX);
    console.log('2. auto_print_radiation setting:', isEnabled);
    console.log('3. Raw localStorage value:', localStorage.getItem(STORAGE_PREFIX + 'auto_print_radiation'));

    if (!isEnabled) {
        console.log('4. ❌ Stopping script (setting is OFF)');
        console.log('=== AUTO PRINT RADIATION DEBUG END ===');
        return;
    }

    console.log('4. ✅ Script will run (setting is ON)');
    console.log('=== AUTO PRINT RADIATION DEBUG END ===');

    // ==========================================
    // 多重起動ガード
    // ==========================================
    const GLOBAL_KEY = '__henry_autoPrint_radiationOrder__';
    if (window[GLOBAL_KEY]?.started) return;
    window[GLOBAL_KEY] = { started: true };

    // ==========================================
    // 設定 & 定数
    // ==========================================
    const VERSION = '3.2.0';

    const CONFIG = Object.freeze({
        targetTitle: '外来 照射オーダー',
        printMenuText: '照射オーダーを印刷',
        printDialogTitle: '照射オーダーを印刷',
        submitButtonText: '完了',
        printButtonText: '印刷',
        recordBaseSelector: '[data-mabl-component="encounter-editor-record-base"]',
        cooldownMs: 3000,
        waitTimeoutMs: 15000,
        renderWaitMs: 1500,
        settleTimeoutMs: 350,
        settleHardExtraMs: 1500,
        maxFailureScore: 5,
        verboseKeywordLog: false,
        printDialogWaitMs: 500,  // 印刷ダイアログ表示待機時間
    });

    const FAILURE_WEIGHTS = Object.freeze({
        '例外': 2,
        '一致レコード未検出': 1,
        '印刷メニュー項目未検出': 1,
        '印刷ボタン未検出': 1,
        '印刷ダイアログボタン未検出': 1,
        'クリック失敗': 2,
        'Observer失敗': 2,
    });

    const THEME = Object.freeze({
        primary: '#0066cc',
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
        pendingKeywords: [],
        lastTriggerTime: 0,
        failureCount: 0,
        failureScore: 0,
        isDisabled: false,
        lastUrl: location.href,
    };

    // ==========================================
    // ユーティリティ
    // ==========================================
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const textOf = (el) => el?.textContent?.trim() ?? '';

    const isVisible = (el) => {
        if (!el) return false;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        if (parseFloat(style.opacity || '1') === 0) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    };

    const getZIndex = (el) => {
        const z = parseInt(getComputedStyle(el).zIndex, 10);
        return Number.isFinite(z) ? z : 0;
    };

    const safeDisconnect = (obs) => { try { obs?.disconnect(); } catch (_) {} };
    const safeClearTimeout = (id) => { try { if (id != null) clearTimeout(id); } catch (_) {} };

    // ==========================================
    // パフォーマンスモニター
    // ==========================================
    const Perf = {
        marks: new Map(),
        start(label) { this.marks.set(label, performance.now()); },
        end(label) {
            const start = this.marks.get(label);
            this.marks.delete(label);
            return start != null ? performance.now() - start : 0;
        },
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
            console.log(`[HenryAutoPrint] ${msg}`);

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

            const key = reason.split(':')[0].trim();
            const weight = FAILURE_WEIGHTS[key] ?? 1;
            state.failureScore += weight;
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

        reset() {
            state.failureScore = 0;
            state.failureCount = 0;
            state.isDisabled = false;
            Logger.log('状態をリセットしました', 'success');
        },
    };

    // ==========================================
    // 安全な非同期実行
    // ==========================================
    const safeAsync = async (label, fn) => {
        try {
            return await fn();
        } catch (e) {
            Logger.log(`エラー [${label}]: ${e?.message ?? e}`, 'error');
            FailureManager.register(`例外: ${label}`);
            return null;
        }
    };

    // ==========================================
    // DOM待機ユーティリティ
    // ==========================================
    const waitForElement = (finder, { timeoutMs = CONFIG.waitTimeoutMs, root = document.body } = {}) => {
        return new Promise((resolve) => {
            let resolved = false;
            let timer = null;
            let obs = null;

            const finish = (result) => {
                if (resolved) return;
                resolved = true;
                safeClearTimeout(timer);
                safeDisconnect(obs);
                resolve(result);
            };

            try {
                const found = finder();
                if (found) return finish(found);
            } catch (_) {}

            try {
                obs = new MutationObserver(() => {
                    if (resolved) return;
                    try {
                        const found = finder();
                        if (found) finish(found);
                    } catch (_) {}
                });
                obs.observe(root, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true,
                    attributeFilter: ['style', 'class', 'hidden', 'aria-hidden'],
                });
            } catch (_) {
                FailureManager.register('Observer失敗');
                return finish(null);
            }

            timer = setTimeout(() => finish(null), timeoutMs);
        });
    };

    const waitForSettle = (root = document.body, timeoutMs = CONFIG.settleTimeoutMs) => {
        return new Promise((resolve) => {
            let done = false;
            let softTimer = null;
            let hardTimer = null;
            let obs = null;

            let rafCompleted = false;
            let mutationDetected = false;
            let softTimedOut = false;

            const finish = (hadMutation) => {
                if (done) return;
                done = true;
                safeClearTimeout(softTimer);
                safeClearTimeout(hardTimer);
                safeDisconnect(obs);
                resolve(hadMutation);
            };

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    rafCompleted = true;
                    if (mutationDetected) return finish(true);
                    if (softTimedOut) return finish(false);
                });
            });

            try {
                obs = new MutationObserver(() => {
                    mutationDetected = true;
                    if (rafCompleted) finish(true);
                });
                obs.observe(root, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true,
                    attributeFilter: ['style', 'class'],
                });
            } catch (_) {}

            softTimer = setTimeout(() => {
                if (rafCompleted) finish(mutationDetected);
                else softTimedOut = true;
            }, timeoutMs);

            hardTimer = setTimeout(
                () => finish(mutationDetected),
                timeoutMs + CONFIG.settleHardExtraMs
            );
        });
    };

    // ==========================================
    // DOM操作ユーティリティ
    // ==========================================
    const clickElement = (el) => {
        if (!el) return false;

        try {
            try {
                el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
            } catch (_) {}

            try { el.focus?.(); } catch (_) {}

            try {
                el.click();
                return true;
            } catch (_) {}

            const opts = { bubbles: true, cancelable: true, view: window };
            let ok = false;
            for (const type of ['mousedown', 'mouseup', 'click']) {
                try {
                    el.dispatchEvent(new MouseEvent(type, opts));
                    ok = true;
                } catch (_) {}
            }
            if (!ok) FailureManager.register('クリック失敗');
            return ok;
        } catch (_) {
            FailureManager.register('クリック失敗');
            return false;
        }
    };

    const getScrollableAncestor = (el) => {
        while (el && el !== document.body) {
            const style = getComputedStyle(el);
            const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
            if (isScrollable && el.scrollHeight > el.clientHeight + 10) return el;
            el = el.parentElement;
        }
        return null;
    };

    const pickTopmost = (elements) => {
        const visible = elements.filter(isVisible);
        if (visible.length === 0) return null;
        if (visible.length === 1) return visible[0];

        const withZ = visible.map((el) => ({ el, z: getZIndex(el) }));
        const maxZ = Math.max(...withZ.map((x) => x.z));
        const topZ = withZ.filter((x) => x.z === maxZ);

        if (topZ.length === 1) return topZ[0].el;

        const allNodes = Array.from(document.querySelectorAll('*'));
        const indexMap = new Map(allNodes.map((n, i) => [n, i]));
        topZ.sort((a, b) => (indexMap.get(b.el) ?? 0) - (indexMap.get(a.el) ?? 0));
        return topZ[0].el;
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
            Logger.log(`Henry Auto Print v${VERSION} 起動`, 'info');
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

        toggle() {
            if (!this.el) this.init();
            const isHidden = this.el.style.display === 'none';
            this.el.style.display = isHidden ? 'flex' : 'none';
            GM_setValue('dashboardVisible', isHidden);
        },
    };

    // ==========================================
    // キーワード抽出
    // ==========================================
    const KeywordExtractor = {
        extract(dialog) {
            const keywords = [];

            const add = (val, source, { minLen = 1 } = {}) => {
                if (!val || typeof val !== 'string') return false;
                const v = val.trim();
                if (v.length < minLen || this._isPlaceholder(v)) return false;

                keywords.push(v);
                if (CONFIG.verboseKeywordLog) {
                    Logger.log(`  キーワード [${source}]: "${v}"`, 'info');
                }
                return true;
            };

            this._extractSite(dialog, add);

            const modSelect = dialog.querySelector('select[name*="Modality"]');
            if (modSelect?.selectedOptions?.[0]) add(textOf(modSelect.selectedOptions[0]), 'モダリティ');

            const confInput = dialog.querySelector('input[name*="configuration"]');
            if (confInput) add(confInput.value, '設定');

            dialog.querySelectorAll('select[name*="laterality"], input[name*="laterality"]').forEach((el) => {
                const val = el.tagName === 'SELECT' ? textOf(el.selectedOptions?.[0]) : el.value;
                add(val, '側性', { minLen: 1 });
            });

            dialog.querySelectorAll('input[name*="note"], textarea[name*="note"]').forEach((el) => {
                add(el.value, '補足');
            });

            const countEl = dialog.querySelector('input[name*="filmCount"]');
            if (countEl?.value?.trim()) add(countEl.value, '枚数', { minLen: 1 });

            const posEl = dialog.querySelector('[data-testid="BodyPositionForm__ChipInput"] input');
            if (posEl) add(posEl.value, '体位', { minLen: 1 });

            const unique = [...new Set(keywords)];
            Logger.log(
                `キーワード抽出: ${unique.length}件 [${unique.join(', ')}]`,
                unique.length > 0 ? 'success' : 'warn'
            );
            return unique;
        },

        _extractSite(dialog, add) {
            const selectors = [
                '[data-testid="FilterableSelectBox__DisplayedLabel"]',
                '[class*="FilterableSelect"] [class*="label"]',
            ];

            for (const sel of selectors) {
                const el = dialog.querySelector(sel);
                if (el && add(textOf(el), '部位')) return;
            }

            const labels = Array.from(dialog.querySelectorAll('label'));
            const siteLabel = labels.find((l) => textOf(l).includes('部位'));
            const target = siteLabel?.nextElementSibling?.querySelector('[role="button"], input, select');
            if (target) add(textOf(target) || target.value, '部位');
        },

        _isPlaceholder(val) {
            const placeholders = ['選択', '未定', '選択してください', '▼'];
            return placeholders.some((p) => val.includes(p));
        },
    };

    // ==========================================
    // レコード検索
    // ==========================================
    const RecordFinder = {
        getSearchRoot() {
            const rec = document.querySelector(CONFIG.recordBaseSelector);
            if (!rec) return document.body;

            const scrollRoot = getScrollableAncestor(rec);
            if (scrollRoot) return scrollRoot;

            return rec.closest('main, [role="main"]') ?? document.body;
        },

        findMatchingRecord(root, keywords) {
            const records = Array.from(root.querySelectorAll(CONFIG.recordBaseSelector));
            const matches = [];

            for (const record of records) {
                if (!isVisible(record)) continue;

                const text = textOf(record);
                if (!text.includes('照射')) continue;

                if (keywords.every((kw) => text.includes(kw))) {
                    const moreBtn = record.querySelector('button i[name="more_horiz"]')?.closest('button');
                    if (moreBtn && isVisible(moreBtn)) {
                        matches.push({ record, btn: moreBtn });
                    }
                }
            }

            if (matches.length === 0) return null;

            matches.sort((a, b) => {
                const topA = a.record.getBoundingClientRect().top;
                const topB = b.record.getBoundingClientRect().top;
                return topB - topA;
            });

            try {
                matches[0].record.style.outline = '2px solid #3b82f6';
                setTimeout(() => { matches[0].record.style.outline = ''; }, 1500);
            } catch (_) {}

            return matches[0];
        },

        async searchWithScroll(root, keywords) {
            const scrollRoot = getScrollableAncestor(root);
            const originalScrollTop = scrollRoot?.scrollTop ?? 0;

            let found = this.findMatchingRecord(root, keywords);
            if (found) return found;

            if (!scrollRoot) return null;

            Logger.log('スクロール探索中...', 'info');

            const scrollPositions = [
                scrollRoot.scrollHeight,
                scrollRoot.scrollHeight * 0.75,
                scrollRoot.scrollHeight * 0.5,
                scrollRoot.scrollHeight * 0.25,
                0,
            ];

            for (const pos of scrollPositions) {
                scrollRoot.scrollTop = pos;
                await waitForSettle(scrollRoot, CONFIG.settleTimeoutMs);

                found = this.findMatchingRecord(root, keywords);
                if (found) return found;
            }

            try { scrollRoot.scrollTop = originalScrollTop; } catch (_) {}
            return null;
        },
    };

    // ==========================================
    // メニュー操作
    // ==========================================
    const MenuHandler = {
        findPrintMenuItem() {
            const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(isVisible);
            const menuRoot = pickTopmost(menus);

            const root = menuRoot ?? document.body;
            const selector = menuRoot
                ? '[role="menuitem"], [role="button"], button, li'
                : '[role="menuitem"], [role="button"], button';

            const candidates = Array.from(root.querySelectorAll(selector))
                .filter((el) => isVisible(el) && textOf(el).includes(CONFIG.printMenuText));

            return pickTopmost(candidates);
        },

        findPrintExecuteButton() {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible);
            const targets = dialogs.filter((d) => textOf(d).includes(CONFIG.printDialogTitle));
            const top = pickTopmost(targets);
            if (!top) return null;

            return Array.from(top.querySelectorAll('button'))
                .find((b) => textOf(b) === CONFIG.printButtonText && isVisible(b));
        },

        /**
         * 印刷ダイアログ内の「印刷」ボタンを検索
         */
        findPrintDialogButton() {
            // 1. 印刷ダイアログを特定
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(isVisible);
            const printDialog = dialogs.find((d) => {
                const title = d.querySelector('h2');
                return title && textOf(title) === CONFIG.printDialogTitle;
            });

            if (!printDialog) return null;

            // 2. ダイアログ内の全てのボタンから「印刷」ボタンを検索
            const buttons = Array.from(printDialog.querySelectorAll('button'));
            return buttons.find((btn) => textOf(btn) === CONFIG.printButtonText && isVisible(btn));
        },
    };

    // ==========================================
    // メイン印刷シーケンス
    // ==========================================
    async function runPrintSequence() {
        if (state.isDisabled) return;

        Perf.start('autoPrint');

        await safeAsync('printSequence', async () => {
            Logger.log(`検索キーワード: [${state.pendingKeywords.join(', ')}]`);

            Logger.log('画面更新待機中...');
            await sleep(CONFIG.renderWaitMs);

            if (state.isDisabled) return;

            const searchRoot = RecordFinder.getSearchRoot();
            const match = await RecordFinder.searchWithScroll(searchRoot, state.pendingKeywords);

            if (!match) {
                Logger.log('条件に合うオーダーが見つかりませんでした', 'error');
                FailureManager.register('一致レコード未検出');
                return;
            }

            Logger.log('メニューボタンをクリック');
            if (!clickElement(match.btn)) {
                FailureManager.register('クリック失敗: メニューボタン');
                return;
            }

            const menuItem = await waitForElement(() => MenuHandler.findPrintMenuItem(), { timeoutMs: 5000 });
            if (!menuItem) {
                Logger.log('印刷メニュー項目が見つかりません', 'error');
                FailureManager.register('印刷メニュー項目未検出');
                return;
            }

            Logger.log('印刷メニュー項目をクリック');
            if (!clickElement(menuItem)) {
                FailureManager.register('クリック失敗: 印刷メニュー');
                return;
            }

            // 印刷ダイアログの表示を待機
            Logger.log('印刷ダイアログ表示待機中...');
            await sleep(CONFIG.printDialogWaitMs);

            // 印刷ダイアログ内の「印刷」ボタンを検索
            const dialogPrintBtn = await waitForElement(
                () => MenuHandler.findPrintDialogButton(),
                { timeoutMs: 5000 }
            );

            if (!dialogPrintBtn) {
                Logger.log('印刷ダイアログ内の印刷ボタンが見つかりません', 'error');
                FailureManager.register('印刷ダイアログボタン未検出');
                return;
            }

            // 1ページ化スクリプトがiframe内にスタイルを適用する時間を確保
            Logger.log('1ページ化処理待機中...');
            await sleep(1500); // 1.5秒待機（1ページ化スクリプトのデバウンス500ms + 余裕）

            Logger.log('印刷ダイアログ内の印刷ボタンをクリック');
            if (!clickElement(dialogPrintBtn)) {
                FailureManager.register('クリック失敗: 印刷ダイアログボタン');
                return;
            }

            FailureManager.recordSuccess();
            const duration = Perf.end('autoPrint');
            Logger.log(`✓ 印刷シーケンス完了 (${duration.toFixed(0)}ms)`, 'success');
        });
    }

    // ==========================================
    // ダイアログ判定
    // ==========================================
    const isTargetOrderDialog = (dialog) => {
        if (!dialog || dialog.getAttribute('role') !== 'dialog') return false;

        const title = dialog.querySelector('h1, h2, h3, [role="heading"]');
        if (textOf(title) !== CONFIG.targetTitle) return false;

        const submitBtn = dialog.querySelector('button[type="submit"]');
        return submitBtn && textOf(submitBtn).includes(CONFIG.submitButtonText);
    };

    // ==========================================
    // イベントハンドラ
    // ==========================================
    function handleGlobalClick(e) {
        Dashboard.init();

        if (state.isDisabled) return;

        safeAsync('handleClick', async () => {
            const btn = e.target?.closest?.('button');
            if (!btn || btn.getAttribute('type') !== 'submit') return;
            if (!textOf(btn).includes(CONFIG.submitButtonText)) return;

            const dialog = btn.closest('[role="dialog"]');
            if (!isTargetOrderDialog(dialog)) return;

            const now = Date.now();
            if (now - state.lastTriggerTime < CONFIG.cooldownMs) {
                Logger.log('クールダウン中のためスキップ', 'warn');
                return;
            }

            Logger.log('オーダー完了を検知', 'info');

            state.pendingKeywords = KeywordExtractor.extract(dialog);
            state.lastTriggerTime = now;

            setTimeout(() => runPrintSequence(), 100);
        });
    }

    // ==========================================
    // SPA遷移検知
    // ==========================================
    const setupHistoryHook = () => {
        const onChange = () => {
            if (location.href === state.lastUrl) return;
            state.lastUrl = location.href;
            Logger.log(`ページ遷移: ${location.pathname}`, 'info');
            state.pendingKeywords = [];
        };

        const originalPush = history.pushState;
        const originalReplace = history.replaceState;

        history.pushState = function (...args) {
            const result = originalPush.apply(this, args);
            onChange();
            return result;
        };

        history.replaceState = function (...args) {
            const result = originalReplace.apply(this, args);
            onChange();
            return result;
        };

        window.addEventListener('popstate', onChange);
    };

    // ==========================================
    // メニューコマンド登録
    // ==========================================
    const registerMenuCommands = () => {
        try {
            GM_registerMenuCommand('🔄 停止/再開', () => {
                state.isDisabled = !state.isDisabled;
                Dashboard.updateStatus();
                Logger.log(state.isDisabled ? '⛔ 停止しました' : '✅ 再開しました', 'warn');
            });

            GM_registerMenuCommand('🔃 状態リセット', () => {
                FailureManager.reset();
                Dashboard.updateStatus();
            });

            GM_registerMenuCommand('📊 デバッグパネル表示/非表示', () => {
                Dashboard.toggle();
            });
        } catch (_) {}
    };

    // ==========================================
    // 初期化
    // ==========================================
    const init = () => {
        document.addEventListener('click', handleGlobalClick, true);
        setupHistoryHook();
        registerMenuCommands();
        Dashboard.init();
        Dashboard.updateStatus();
    };

    init();
})();