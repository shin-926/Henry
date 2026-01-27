// ==UserScript==
// @name         テストヘルパー
// @namespace    https://henry-app.jp/
// @version      1.0.3
// @description  照射オーダー等のテストデータを自動入力
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @run-at       document-idle
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_test_helper.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_test_helper.user.js
// ==/UserScript==

/*
 * 【テストヘルパー】
 *
 * ■ 使用場面
 * - 照射オーダー等の機能をテストする際に、テストデータを素早く入力したい場合
 * - 開発・デバッグ用途
 *
 * ■ 機能
 * - 照射オーダーのテストデータを自動入力
 * - ツールボックスの「テスト」ボタンから呼び出し
 *
 * ■ 注意
 * - 開発・テスト用スクリプト
 * - 本番環境では無効化推奨
 */

(function () {
    'use strict';

    const VERSION = GM_info.script.version;
    const SCRIPT_NAME = 'TestHelper';

    // ==========================================
    // HenryCore連携
    // ==========================================
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const HenryCore = pageWindow.HenryCore;

    if (!HenryCore) {
        console.error(`[${SCRIPT_NAME}] HenryCoreが見つかりません`);
        return;
    }

    const { utils, registerPlugin } = HenryCore;

    // ==========================================
    // 多重起動ガード
    // ==========================================
    const GLOBAL_KEY = '__henry_testHelper__';
    if (pageWindow[GLOBAL_KEY]?.started) return;
    pageWindow[GLOBAL_KEY] = { started: true };

    // ==========================================
    // テストデータ定義
    // ==========================================
    const TEST_PATTERNS = {
        // 照射オーダー: 肩関節正面
        imaging_shoulder: {
            name: '照射: 肩関節正面',
            modality: '単純撮影デジタル',
            majorCategory: '上肢',
            minorCategory: '肩関節',
            laterality: '右',
            direction: '正面'
        }
    };

    // ==========================================
    // フォーム操作ユーティリティ
    // ==========================================

    /**
     * select要素の値を設定（Reactのステート更新をトリガー）
     */
    function setSelectValue(select, value) {
        // オプションからvalueを探す
        const option = Array.from(select.options).find(opt =>
            opt.text === value || opt.value === value
        );

        if (option) {
            select.value = option.value;
            // Reactのステート更新をトリガー
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        return false;
    }

    /**
     * ボタンをテキストで探してクリック
     */
    function clickButtonByText(container, text) {
        const buttons = container.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.trim() === text) {
                btn.click();
                return true;
            }
        }
        return false;
    }

    /**
     * 照射オーダーダイアログを取得
     */
    function getImagingOrderDialog() {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) {
            const heading = dialog.querySelector('h2');
            if (heading && heading.textContent.includes('照射オーダー')) {
                return dialog;
            }
        }
        return null;
    }

    /**
     * select要素をオプションの先頭テキストで探す
     * UI表示用（name属性なし）を優先して返す
     */
    function findSelectByFirstOption(dialog, firstOptionText) {
        const selects = dialog.querySelectorAll('select');
        let withName = null;
        let withoutName = null;

        for (const sel of selects) {
            if (sel.options[0]?.text === firstOptionText) {
                if (!sel.name) {
                    withoutName = sel;  // UI表示用を優先
                } else if (!withName) {
                    withName = sel;
                }
            }
        }

        // UI表示用（name属性なし）を優先、なければname属性ありを返す
        return withoutName || withName;
    }

    /**
     * select要素をname属性で探す
     */
    function findSelectByName(dialog, namePattern) {
        const selects = dialog.querySelectorAll('select');
        for (const sel of selects) {
            if (sel.name && sel.name.includes(namePattern)) {
                return sel;
            }
        }
        return null;
    }

    // ==========================================
    // 照射オーダー自動入力
    // ==========================================
    async function fillImagingOrder(pattern) {
        const dialog = getImagingOrderDialog();
        if (!dialog) {
            alert('照射オーダーダイアログが見つかりません。\nダイアログを開いてから実行してください。');
            return;
        }

        console.log(`[${SCRIPT_NAME}] 照射オーダー入力開始:`, pattern.name);

        try {
            // 1. モダリティ選択 (name="detail.imagingModality")
            const modalitySelect = findSelectByName(dialog, 'imagingModality');
            if (modalitySelect) {
                setSelectValue(modalitySelect, pattern.modality);
                await sleep(300);
            } else {
                console.warn(`[${SCRIPT_NAME}] モダリティselect要素が見つかりません`);
            }

            // 2. 大分類選択 (先頭オプションが"大分類")
            const majorSelect = findSelectByFirstOption(dialog, '大分類');
            if (majorSelect) {
                setSelectValue(majorSelect, pattern.majorCategory);
                await sleep(300);
            } else {
                console.warn(`[${SCRIPT_NAME}] 大分類select要素が見つかりません`);
            }

            // 3. 小分類選択 (先頭オプションが"小分類")
            const minorSelect = findSelectByFirstOption(dialog, '小分類');
            if (minorSelect) {
                setSelectValue(minorSelect, pattern.minorCategory);
                await sleep(300);
            } else {
                console.warn(`[${SCRIPT_NAME}] 小分類select要素が見つかりません`);
            }

            // 4. 側性選択（先頭オプションが"側性"のselect、UI用を優先）
            if (pattern.laterality) {
                const lateralitySelect = findSelectByFirstOption(dialog, '側性');
                if (lateralitySelect) {
                    setSelectValue(lateralitySelect, pattern.laterality);
                    await sleep(300);
                } else {
                    console.warn(`[${SCRIPT_NAME}] 側性select要素が見つかりません`);
                }
            }

            // 5. 方向選択（ボタンクリック）
            if (pattern.direction) {
                const clicked = clickButtonByText(dialog, pattern.direction);
                if (!clicked) {
                    console.warn(`[${SCRIPT_NAME}] 方向ボタン「${pattern.direction}」が見つかりません`);
                }
            }

            console.log(`[${SCRIPT_NAME}] 照射オーダー入力完了`);

        } catch (e) {
            console.error(`[${SCRIPT_NAME}] 入力エラー:`, e);
            alert('テストデータの入力中にエラーが発生しました。\nコンソールを確認してください。');
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // Toolbox統合
    // ==========================================
    async function init() {
        await registerPlugin({
            id: 'test-helper',
            name: 'テストヘルパー',
            icon: '🧪',
            description: 'テストデータを自動入力',
            version: '1.0.0',
            order: 900,
            group: '開発',
            onClick: () => fillImagingOrder(TEST_PATTERNS.imaging_shoulder)
        });

        console.log(`[${SCRIPT_NAME}] Ready (v${VERSION})`);
    }

    // 初期化
    init();
})();
