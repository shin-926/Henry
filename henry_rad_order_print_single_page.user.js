// ==UserScript==
// @name         照射オーダー印刷を1枚にまとめる
// @namespace    http://tampermonkey.net/
// @version      11.0.4
// @description  照射オーダーの印刷が2枚になるのを防ぐ（mac環境で必要だと思われる）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        none
// @icon         https://henry-app.jp/apple-touch-icon.png
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_order_print_single_page.user.js
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_rad_order_print_single_page.user.js
// ==/UserScript==

/*
 * 【照射オーダー印刷1枚化】
 *
 * ■ 使用場面
 * - 照射オーダーの印刷時に2枚に分かれてしまう問題を解決したい場合
 * - 主にMac環境で発生する問題への対処
 *
 * ■ 機能
 * - 印刷プレビューのCSSを調整
 * - ページ分割を防止して1枚に収める
 *
 * ■ 注意
 * - 環境によっては不要な場合あり
 * - smart_printerとは別機能（こちらはHenry標準の印刷を修正）
 *
 * ■ MutationObserver
 * - document.body全体を監視（印刷プレビューiframe検出のため）
 * - デバウンス付き（500ms）でパフォーマンス確保
 * - 全ページで印刷プレビューを監視する必要があるためdisconnectしない
 */

(function() {
    'use strict';

    // ログ表示のON/OFF（運用が安定したらfalseにするとコンソールが綺麗になります）
    const DEBUG_MODE = true;

    function log(msg) {
        if (DEBUG_MODE) console.log(`[Henry Fix] ${msg}`);
    }

    // スタイル適用処理の本体
    function applyStyles(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc || !iframeDoc.body) return;

            // すでに処理済みならスキップ（重複実行防止）
            if (iframeDoc.getElementById('henry-print-fix')) return;

            const bodyText = iframeDoc.body.textContent;

            // 判定ロジック（ここはv10と同じ）
            const isImagingOrder = bodyText.includes('照射録') ||
                                 bodyText.includes('照射オーダー') ||
                                 (bodyText.includes('指示内容') && bodyText.includes('部位'));

            if (!isImagingOrder) {
                // log('照射オーダーではないためスキップ');
                return;
            }

            log('✓ 照射オーダーを検出。スタイル適用を開始します。');

            // 1. 既存スタイルの置換
            const styleElements = iframeDoc.querySelectorAll('style');
            styleElements.forEach(style => {
                if (style.textContent.includes('page-break-after:always')) {
                    style.textContent = style.textContent.replace(
                        /page-break-after\s*:\s*always/g,
                        'page-break-after:avoid'
                    );
                }
            });

            // 2. 強制スタイルの注入
            const newStyle = iframeDoc.createElement('style');
            newStyle.id = 'henry-print-fix'; // 処理済みフラグとしても機能
            newStyle.textContent = `
                @media print {
                    * {
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `;
            iframeDoc.head.appendChild(newStyle);
            log('スタイル注入完了');

        } catch (e) {
            console.error('[Henry Fix] エラー:', e);
        }
    }

    // iframeが見つかったら、読み込みを待ってから処理する
    function handleIframe(iframe) {
        // すでに読み込み完了している場合
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            applyStyles(iframe);
        } else {
            // まだ読み込み中の場合、loadイベントを待つ（ここがv10からの改良点）
            iframe.addEventListener('load', () => applyStyles(iframe), { once: true });
        }
    }

    function scanIframes() {
        const iframes = document.querySelectorAll('iframe[title="DocumentsPreviewer"]');
        iframes.forEach(handleIframe);
    }

    // 変更監視（デバウンス処理付き）
    let timeoutId = null;
    const observer = new MutationObserver(() => {
        // 変更があるたびに前のタイマーをキャンセルして新しくセットし直す
        if (timeoutId) clearTimeout(timeoutId);

        // 500ms間、変更がなければ実行（これがデバウンス）
        timeoutId = setTimeout(scanIframes, 500);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初回実行
    setTimeout(scanIframes, 1000);

    log('v11: 起動しました（スマートロード版）');
})();