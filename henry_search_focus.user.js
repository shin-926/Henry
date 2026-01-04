// ==UserScript==
// @name         Henry: /で検索パネル→検索ボックスにフォーカス＋☆入力
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  「/」で検索パネルを開き、検索ボックスにフォーカス＋☆を入力する（Reactの状態も更新）
// @match        https://henry-app.jp/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://gist.githubusercontent.com/shin-926/6c1bef55bb24a6f5ef321ddbef2a65a0/raw/henry_focus_search_box.user.js
// @updateURL    https://gist.githubusercontent.com/shin-926/6c1bef55bb24a6f5ef321ddbef2a65a0/raw/henry_focus_search_box.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'henry_search_focus';

    /******************************
     * HenryCore 待機
     ******************************/
    async function waitForHenryCore(timeout = 5000) {
        let waited = 0;
        while (!window.HenryCore) {
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
            if (waited > timeout) {
                console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
                return false;
            }
        }
        return true;
    }

    /******************************
     * ユーティリティ
     ******************************/

    // すでにどこかで文字入力中かどうか
    function isTyping() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        return tag === "input" || tag === "textarea" || el.isContentEditable;
    }

    // 検索ボックスを探す（Henryの検索）
    function getSearchInput() {
        return document.querySelector('input[placeholder="検索"]');
    }

    // 「セット」ボタンを探す
    function getSetButton() {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.trim() === 'セット') || null;
    }

    // ボタンのクリック（本物クリックっぽく）
    function forceClick(el) {
        ["mousedown", "mouseup", "click"].forEach(type => {
            el.dispatchEvent(
                new MouseEvent(type, { bubbles: true, cancelable: true })
            );
        });
    }

    // React 対応で input の value をセットする
    function setInputValueReactSafe(input, value) {
        const prototype = Object.getPrototypeOf(input);
        const desc = Object.getOwnPropertyDescriptor(prototype, 'value');
        const setter = desc && desc.set;

        if (setter) {
            setter.call(input, value);  // 内部プロパティ経由でセット
        } else {
            // 念のためフォールバック
            input.value = value;
        }

        // React に変更を通知
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 検索ボックスにフォーカス＋☆入力
    function focusAndStar(input) {
        if (!input) return;
        input.focus();

        // ここで React-safe なやり方で value を変更
        setInputValueReactSafe(input, "☆");

        // キャレットを末尾へ
        if (typeof input.setSelectionRange === "function") {
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    }

    /******************************
     * メイン処理
     ******************************/
    async function init() {
        // HenryCore の待機
        const coreReady = await waitForHenryCore();
        if (!coreReady) return;

        const HenryCore = window.HenryCore;
        const cleaner = HenryCore.utils.createCleaner();

        // キーイベントハンドラ
        const handleKeydown = async (e) => {
            // 入力中は邪魔しない
            if (isTyping()) return;
            // IME変換中はスルー
            if (e.isComposing) return;
            // 修飾キー付きは無視
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            // 「/」が押されたとき
            if (e.key === "/") {
                e.preventDefault();

                // すでに検索ボックスがあるか？
                let searchInput = getSearchInput();

                if (searchInput) {
                    // そのままフォーカス＋☆
                    focusAndStar(searchInput);
                    return;
                }

                // 検索ボックスがない → まず「セット」ボタンを押す
                const setBtn = getSetButton();
                if (!setBtn) {
                    console.error(`[${SCRIPT_NAME}] セットボタンが見つかりません`);
                    return;
                }

                forceClick(setBtn);

                // 検索ボックスが描画されるのを待ってフォーカス＋☆
                const box = await HenryCore.utils.waitForElement('input[placeholder="検索"]', 800);
                if (box) {
                    focusAndStar(box);
                } else {
                    console.error(`[${SCRIPT_NAME}] 検索ボックスが見つかりません（タイムアウト）`);
                }
            }
        };

        // イベントリスナー登録
        document.addEventListener("keydown", handleKeydown, true);
        cleaner.add(() => document.removeEventListener("keydown", handleKeydown, true));

        // SPA遷移時の自動クリーンアップ＆再初期化
        HenryCore.utils.subscribeNavigation(cleaner, init);
    }

    // 初回実行
    init();
})();
