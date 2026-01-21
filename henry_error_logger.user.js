// ==UserScript==
// @name         Henry Error Logger
// @namespace    https://henry-app.jp/
// @version      1.0.1
// @description  HenryCoreのエラーログを表示・コピー・クリア | powered by Claude & Gemini
// @author       sk
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_error_logger.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_error_logger.user.js
// ==/UserScript==

/*
 * 【エラーログ表示】
 *
 * ■ 使用場面
 * - HenryCoreや各スクリプトで発生したエラーを確認したい場合
 * - 問題発生時のデバッグ・報告用途
 *
 * ■ 機能
 * - HenryCoreが記録したエラーログを一覧表示
 * - クリップボードにコピー
 * - ログのクリア
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'ErrorLogger';

  // エラーログを整形
  function formatLogs(logs) {
    if (logs.length === 0) return 'エラーログはありません';

    return logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString('ja-JP');
      const context = Object.keys(log.context).length > 0
        ? `\n  Context: ${JSON.stringify(log.context)}`
        : '';
      return `[${time}] [${log.script}] ${log.message}${context}`;
    }).join('\n\n');
  }

  // モーダルでログを表示
  function showLogModal() {
    const logs = HenryCore.getErrorLog();

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>件数:</strong> ${logs.length} 件
      </div>
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; background: #f9f9f9;">
        <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 12px; font-family: 'Consolas', 'Monaco', monospace;">${formatLogs(logs)}</pre>
      </div>
    `;

    HenryCore.ui.showModal({
      title: 'エラーログ',
      content,
      width: 600,
      actions: [
        {
          label: 'コピー',
          autoClose: false,
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(formatLogs(logs));
              alert('クリップボードにコピーしました');
            } catch (e) {
              console.error(`[${SCRIPT_NAME}]`, e);
              alert('コピーに失敗しました');
            }
          }
        },
        {
          label: 'クリア',
          autoClose: false,
          onClick: () => {
            if (confirm('エラーログをクリアしますか？')) {
              HenryCore.clearErrorLog();
              content.querySelector('pre').textContent = 'エラーログはありません';
              content.querySelector('strong').nextSibling.textContent = ' 0 件';
            }
          }
        }
      ]
    });
  }

  // 初期化
  async function init() {
    // HenryCore待機
    let waited = 0;
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 10000) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return;
      }
    }

    // プラグイン登録
    await HenryCore.registerPlugin({
      id: 'error-logger',
      name: 'エラーログ',
      icon: '🔴',
      description: 'エラーログを表示・コピー・クリア',
      version: '1.0.0',
      order: 900,
      onClick: showLogModal
    });

    console.log(`[${SCRIPT_NAME}] 初期化完了`);
  }

  init();
})();
