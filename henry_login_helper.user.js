// ==UserScript==
// @name         ログインヘルパー
// @namespace    http://tampermonkey.net/
// @version      6.9.3
// @description  Henry電子カルテのログイン入力補助（React完全対応 + フィルタリング機能）
// @author       Henry UI Lab
// @match        https://henry-app.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_login_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_login_helper.user.js
// ==/UserScript==

/*
 * 【重要】HenryCoreへの非依存性について
 * このスクリプトはHenry電子カルテの「ログイン前」画面で動作することを主目的としています。
 * そのため、以下の理由によりHenryCoreへの依存を意図的に避けて自己完結型で実装されています。
 *
 * 1. スクリプトの実行順序の不確実性:
 *    HenryCoreを含む他のTampermonkeyスクリプトとの実行順序は保証されません。
 *    Login HelperがHenryCoreより先に実行される可能性があり、その場合HenryCoreの機能は利用できません。
 * 2. HenryCoreの非同期初期化:
 *    HenryCoreは、実行開始からグローバルオブジェクト(window.HenryCore)が完全に利用可能になるまでに、
 *    非同期処理（DBアクセス等）を伴う初期化時間が必要です。Login Helperが動作する時点で
 *    HenryCoreが準備完了している保証はありません。
 * 3. 即応性の要求:
 *    Login Helperは、ログインフォームが表示され次第、即座に入力補助機能を提供する必要があります。
 *    HenryCoreの準備を待つためのタイムラグは、ユーザー体験を損なう可能性があります。
 * 4. ログイン状態への依存:
 *    HenryCoreの多くの機能（特にAPIコールや認証トークン取得など）は、ユーザーがログイン済みである
 *    ことを前提としています。ログイン前では、これらの機能は期待通りに動作しません。
 *
 * これらの理由から、Login HelperはHenryCoreに依存せず、独立して動作する設計が最も堅牢かつ適切です。
 *
 * ■ MutationObserver
 * - document.body全体を監視（ログインフォーム検出のため）
 * - SPA遷移時にfullCleanup()でdisconnect済み
 * - ログイン後は再開しない設計（ログインフォームが不要なため）
 */

(function() {
    'use strict';

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 設定: スタイル定義 ---
    const STYLES = `
        /* 入力欄設定 */
        .henry-input-wrapper-hook {
            position: relative !important;
        }
        .henry-config-trigger {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            font-size: 16px;
            color: #999;
            background: transparent;
            border: none;
            padding: 4px;
            z-index: 100;
            line-height: 1;
            transition: color 0.2s;
        }
        .henry-config-trigger:hover {
            color: #00DCA0;
        }
        .henry-config-trigger:focus {
            outline: 2px solid #00DCA0;
            outline-offset: 2px;
        }

        /* ドロップダウンリスト */
        .henry-custom-dropdown {
            position: absolute;
            max-height: 250px;
            overflow-y: auto;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 99999;
            display: none;
            font-family: "Noto Sans JP", sans-serif;
        }
        .henry-dropdown-item {
            padding: 10px 12px;
            cursor: pointer;
            font-size: 14px;
            color: #333;
            border-bottom: 1px solid #f5f5f5;
            transition: background-color 0.15s;
        }
        .henry-dropdown-item:last-child {
            border-bottom: none;
        }
        .henry-dropdown-item:hover,
        .henry-dropdown-item.selected {
            background-color: #f0fdf9;
            color: #00DCA0;
        }
        .henry-dropdown-item.empty {
            color: #999;
            cursor: default;
        }
        .henry-dropdown-item.empty:hover {
            background-color: white;
            color: #999;
        }
        /* フィルタリング結果のハイライト */
        .henry-dropdown-item .highlight {
            background-color: #fff59d;
            font-weight: 600;
            color: #00DCA0;
        }

        /* モーダル */
        .henry-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 100000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.2s;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .henry-modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: "Noto Sans JP", sans-serif;
            animation: slideIn 0.2s;
        }
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .henry-modal-textarea {
            width: 100%;
            height: 150px;
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 8px;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
        }
        .henry-modal-textarea:focus {
            outline: none;
            border-color: #00DCA0;
        }
        .henry-modal-error {
            color: #dc2626;
            font-size: 12px;
            margin-top: 5px;
            display: none;
        }
        .henry-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .henry-btn {
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        .henry-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .henry-btn-cancel {
            background: #f0f0f0;
            border: 1px solid #ccc;
        }
        .henry-btn-cancel:hover:not(:disabled) {
            background: #e0e0e0;
        }
        .henry-btn-primary {
            background: #00DCA0;
            color: white;
            border: none;
            font-weight: bold;
        }
        .henry-btn-primary:hover:not(:disabled) {
            background: #00c28e;
        }

        /* トースト通知 */
        .henry-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00DCA0;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 999999;
            animation: slideInRight 0.3s, fadeOut 0.3s 1.7s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        @keyframes fadeOut {
            to { opacity: 0; }
        }
        .henry-toast.error {
            background: #dc2626;
        }
    `;

    GM_addStyle(STYLES);

    // --- データ管理 ---
    // 📧 メールアドレスリストを GM_setValue に保存
    // NOTE: 保存するのは公開情報のメールアドレスのみ（例: 職員用の公開メールアドレス）
    //       患者の連絡先や非公開の個人情報は含めないこと
    const STORAGE_KEY = 'henry_email_list_v6';
    const DROPDOWN_ID = 'henry-overlay-dropdown';

    // デフォルト値
    const DEFAULT_EMAILS = [
        "henry@example.com"
    ];

    // クリーンアップ関数の管理
    let cleanupFunctions = [];

    // メールアドレスバリデーション
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function getEmailList() {
        try {
            return GM_getValue(STORAGE_KEY, DEFAULT_EMAILS);
        } catch (error) {
            console.error('[Henry Helper] データ読み込みエラー:', error);
            return DEFAULT_EMAILS;
        }
    }

    function saveEmailList(list) {
        try {
            const cleanList = list
                .map(e => e.trim())
                .filter(e => e !== "");

            // バリデーション
            const invalidEmails = cleanList.filter(e => !validateEmail(e));
            if (invalidEmails.length > 0) {
                return {
                    success: false,
                    error: `無効なメールアドレスが含まれています:\n${invalidEmails.join('\n')}`
                };
            }

            if (cleanList.length === 0) {
                return {
                    success: false,
                    error: '少なくとも1つのメールアドレスを入力してください。'
                };
            }

            GM_setValue(STORAGE_KEY, cleanList);
            return { success: true };
        } catch (error) {
            console.error('[Henry Helper] データ保存エラー:', error);
            return {
                success: false,
                error: 'データの保存に失敗しました。'
            };
        }
    }

    // --- トースト通知 ---
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = 'henry-toast' + (isError ? ' error' : '');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    // --- 【重要】React Input Helper ---
    function setReactValue(input, value) {
        try {
            // ネイティブのsetterを取得
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                pageWindow.HTMLInputElement.prototype,
                "value"
            ).set;

            // 値をセット
            nativeInputValueSetter.call(input, value);

            // React 16/17/18対応: _valueTrackerを更新
            const tracker = input._valueTracker;
            if (tracker) {
                tracker.setValue(input.value);
            }

            // イベントをディスパッチ
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // フォーカスを維持
            input.focus();
        } catch (error) {
            console.error('[Henry Helper] 値設定エラー:', error);
            // フォールバック: 通常の方法
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // --- 【新機能】フィルタリング機能 ---
    function filterEmails(emails, query) {
        if (!query || query.trim() === '') {
            return emails;
        }

        const lowerQuery = query.toLowerCase();
        return emails.filter(email =>
            email.toLowerCase().includes(lowerQuery)
        );
    }

    // マッチ部分をハイライト表示するHTML生成
    function highlightMatch(email, query) {
        if (!query || query.trim() === '') {
            return email;
        }

        const lowerEmail = email.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerEmail.indexOf(lowerQuery);

        if (index === -1) {
            return email;
        }

        const before = email.substring(0, index);
        const match = email.substring(index, index + query.length);
        const after = email.substring(index + query.length);

        return `${before}<span class="highlight">${match}</span>${after}`;
    }

    // --- UI生成: ドロップダウン ---
    function getOrCreateDropdown() {
        let dropdown = document.getElementById(DROPDOWN_ID);
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = DROPDOWN_ID;
            dropdown.className = 'henry-custom-dropdown';
            dropdown.setAttribute('role', 'listbox');
            document.body.appendChild(dropdown);
        }
        return dropdown;
    }

    let currentSelectedIndex = -1;

    function selectDropdownItem(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
        currentSelectedIndex = index;
    }

    function showDropdown(inputElement) {
        const dropdown = getOrCreateDropdown();
        const allEmails = getEmailList();
        const currentValue = inputElement.value;

        // フィルタリング実行
        const filteredEmails = filterEmails(allEmails, currentValue);

        dropdown.innerHTML = '';
        currentSelectedIndex = -1;

        if (filteredEmails.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'henry-dropdown-item empty';

            if (allEmails.length === 0) {
                emptyMsg.textContent = '(設定からアドレスを登録してください)';
            } else {
                emptyMsg.textContent = '(該当するアドレスがありません)';
            }

            emptyMsg.setAttribute('role', 'option');
            emptyMsg.setAttribute('aria-disabled', 'true');
            dropdown.appendChild(emptyMsg);
        } else {
            filteredEmails.forEach((email, index) => {
                const item = document.createElement('div');
                item.className = 'henry-dropdown-item';

                // ハイライト表示
                item.innerHTML = highlightMatch(email, currentValue);

                item.setAttribute('role', 'option');
                item.setAttribute('data-index', index);
                item.setAttribute('data-email', email); // 元のメールアドレスを保持

                item.onmousedown = (e) => {
                    e.preventDefault();
                    // data-emailから元のアドレスを取得
                    const originalEmail = e.currentTarget.getAttribute('data-email');
                    setReactValue(inputElement, originalEmail);
                    dropdown.style.display = 'none';
                };

                item.onmouseenter = () => {
                    const allItems = dropdown.querySelectorAll('.henry-dropdown-item:not(.empty)');
                    selectDropdownItem(allItems, index);
                };

                dropdown.appendChild(item);
            });
        }

        // 位置合わせ
        const rect = inputElement.getBoundingClientRect();
        dropdown.style.width = rect.width + 'px';
        dropdown.style.left = (rect.left + window.scrollX) + 'px';
        dropdown.style.top = (rect.bottom + window.scrollY + 2) + 'px';

        dropdown.style.display = 'block';
    }

    function hideDropdown() {
        const dropdown = document.getElementById(DROPDOWN_ID);
        if (dropdown) {
            dropdown.style.display = 'none';
            currentSelectedIndex = -1;
        }
    }

    // --- UI生成: 設定モーダル ---
    function createConfigModal() {
        if (document.getElementById('henry-config-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'henry-config-modal';
        overlay.className = 'henry-modal-overlay';

        const content = document.createElement('div');
        content.className = 'henry-modal-content';

        content.innerHTML = `
            <h3 style="margin:0 0 10px 0; color:#333;">メールアドレスリスト編集</h3>
            <p style="font-size:12px; color:#666; margin: 5px 0;">1行に1つのメールアドレスを入力してください。</p>
        `;

        const textarea = document.createElement('textarea');
        textarea.className = 'henry-modal-textarea';
        textarea.value = getEmailList().join('\n');
        textarea.placeholder = 'example1@hospital.jp\nexample2@clinic.jp';
        textarea.setAttribute('aria-label', 'メールアドレスリスト');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'henry-modal-error';
        errorDiv.setAttribute('role', 'alert');

        const actions = document.createElement('div');
        actions.className = 'henry-modal-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.className = 'henry-btn henry-btn-cancel';
        cancelBtn.onclick = () => overlay.remove();

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存して閉じる';
        saveBtn.className = 'henry-btn henry-btn-primary';
        saveBtn.onclick = () => {
            const lines = textarea.value.split('\n');
            const result = saveEmailList(lines);

            if (result.success) {
                overlay.remove();
                showToast('保存しました');
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                saveBtn.disabled = true;
                setTimeout(() => {
                    saveBtn.disabled = false;
                }, 2000);
            }
        };

        // Enterキーで保存（Ctrl+Enter）
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                saveBtn.click();
            }
            if (e.key === 'Escape') {
                overlay.remove();
            }
        });

        // 入力時にエラーメッセージをクリア
        textarea.addEventListener('input', () => {
            errorDiv.style.display = 'none';
        });

        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        content.appendChild(textarea);
        content.appendChild(errorDiv);
        content.appendChild(actions);
        overlay.appendChild(content);

        document.body.appendChild(overlay);
        textarea.focus();
    }

    // --- クリーンアップ ---
    function cleanup() {
        cleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (error) {
                console.error('[Henry Helper] クリーンアップエラー:', error);
            }
        });
        cleanupFunctions = [];
    }

    // --- メイン処理 ---
    function attachToInput() {
        try {
            if (document.getElementById('henry-config-trigger')) return;

            const emailInput = document.querySelector('input[type="email"]');
            if (!emailInput) return;

            const inputWrapper = emailInput.parentElement;
            if (!inputWrapper) {
                console.warn('[Henry Helper] 親要素が見つかりません');
                return;
            }

            cleanup(); // 以前のリスナーをクリーンアップ

            // 設定ボタン
            inputWrapper.classList.add('henry-input-wrapper-hook');
            const configBtn = document.createElement('button');
            configBtn.id = 'henry-config-trigger';
            configBtn.className = 'henry-config-trigger';
            configBtn.innerHTML = '⚙';
            configBtn.title = 'リスト編集';
            configBtn.type = 'button';
            configBtn.setAttribute('aria-label', 'メールアドレスリストを編集');

            configBtn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };
            configBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                createConfigModal();
                hideDropdown();
            };
            inputWrapper.appendChild(configBtn);

            // イベントハンドラー
            const onActivate = () => showDropdown(emailInput);
            const onBlur = () => setTimeout(hideDropdown, 200);

            // キーボード操作
            const onKeyDown = (e) => {
                const dropdown = document.getElementById(DROPDOWN_ID);
                if (!dropdown || dropdown.style.display === 'none') return;

                const items = Array.from(dropdown.querySelectorAll('.henry-dropdown-item:not(.empty)'));
                if (items.length === 0) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = currentSelectedIndex < items.length - 1 ? currentSelectedIndex + 1 : 0;
                    selectDropdownItem(items, nextIndex);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = currentSelectedIndex > 0 ? currentSelectedIndex - 1 : items.length - 1;
                    selectDropdownItem(items, prevIndex);
                } else if (e.key === 'Enter' && currentSelectedIndex >= 0) {
                    e.preventDefault();
                    // 選択中の項目のmousedownイベントを発火
                    items[currentSelectedIndex].onmousedown({
                        preventDefault: () => {},
                        currentTarget: items[currentSelectedIndex]
                    });
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    hideDropdown();
                    emailInput.blur();
                }
            };

            // イベントリスナー登録
            emailInput.addEventListener('focus', onActivate);
            emailInput.addEventListener('click', onActivate);
            emailInput.addEventListener('input', onActivate); // inputイベントでフィルタリングが動作
            emailInput.addEventListener('blur', onBlur);
            emailInput.addEventListener('keydown', onKeyDown);

            // クリーンアップ関数を登録
            cleanupFunctions.push(() => {
                emailInput.removeEventListener('focus', onActivate);
                emailInput.removeEventListener('click', onActivate);
                emailInput.removeEventListener('input', onActivate);
                emailInput.removeEventListener('blur', onBlur);
                emailInput.removeEventListener('keydown', onKeyDown);
            });

            // グローバルイベント
            const onResize = hideDropdown;
            const onScroll = hideDropdown;

            window.addEventListener('resize', onResize);
            window.addEventListener('scroll', onScroll);

            cleanupFunctions.push(() => {
                window.removeEventListener('resize', onResize);
                window.removeEventListener('scroll', onScroll);
            });

            console.log('[Henry Helper] 初期化完了 v6.9');

        } catch (error) {
            console.error('[Henry Helper] 初期化エラー:', error);
            showToast('初期化に失敗しました', true);
        }
    }

    // --- 監視ロジック ---
    let observer = null;

    function initObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(() => {
            if (document.querySelector('input[type="email"]') && !document.getElementById('henry-config-trigger')) {
                attachToInput();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // SPA遷移時のクリーンアップ
    function fullCleanup() {
        cleanup();
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        hideDropdown();
    }

    // SPA遷移を監視
    window.addEventListener('henry:navigation', fullCleanup);
    window.addEventListener('popstate', fullCleanup);

    // 初回実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            attachToInput();
            initObserver();
        });
    } else {
        attachToInput();
        initObserver();
    }

    console.log('[Henry Helper] スクリプト読み込み完了 v6.9 (with filtering + SPA cleanup)');

})();