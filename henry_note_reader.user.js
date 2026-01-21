// ==UserScript==
// @name         Henry カルテ内容リーダー
// @namespace    https://github.com/shin-926/Henry
// @version      1.0.2
// @description  現在開いているカルテの内容を表示する | powered by Claude & Gemini
// @author       sk
// @match        https://henry-app.jp/*
// @grant        unsafeWindow
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_note_reader.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_note_reader.user.js
// ==/UserScript==

/*
 * 【カルテ内容リーダー】
 *
 * ■ 使用場面
 * - 現在開いているカルテの内容をテキストで取得したい場合
 * - デバッグやデータ確認用途
 *
 * ■ 機能
 * - 表示中のカルテ記事を取得
 * - テキスト形式で表示
 */

(async function() {
  'use strict';

  const SCRIPT_NAME = 'NoteReader';
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // HenryCore を待機
  async function waitForHenryCore(timeout = 10000) {
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return false;
      }
    }
    return true;
  }

  // 現在の診察に紐づくカルテ内容を取得
  function getCurrentNoteText() {
    const cache = pageWindow.__APOLLO_CLIENT__?.cache?.data?.data;
    if (!cache) return null;

    // 現在の診察IDを取得
    const rootQuery = cache.ROOT_QUERY;
    const encounterKey = Object.keys(rootQuery || {}).find(k => k.startsWith('encounter({"id":'));
    const encounterId = encounterKey?.match(/"id":"([a-f0-9-]{36})"/)?.[1];

    if (!encounterId) return null;

    // その診察に紐づくプログレスノートを取得
    const progressNotes = Object.entries(cache)
      .filter(([_, v]) => v?.__typename === 'ProgressNote' && v.encounterId === encounterId && !v.isDeleted)
      .map(([_, v]) => v);

    if (progressNotes.length === 0) return null;

    // テキスト抽出
    const texts = progressNotes.map(note => {
      try {
        const data = JSON.parse(note.editorData);
        return data.blocks.map(b => b.text).filter(t => t.trim()).join('\n');
      } catch (e) {
        return '';
      }
    });

    return texts.filter(t => t).join('\n\n---\n\n');
  }

  // メイン処理
  if (!await waitForHenryCore()) return;

  const HenryCore = pageWindow.HenryCore;

  await HenryCore.registerPlugin({
    id: 'note-reader',
    name: 'カルテ内容表示',
    icon: '📋',
    description: '現在のカルテ内容を表示します',
    version: '1.0.0',
    onClick: () => {
      const noteText = getCurrentNoteText();

      if (!noteText) {
        HenryCore.ui.showModal({
          title: 'カルテ内容',
          content: 'カルテが見つかりません。カルテ画面を開いてください。',
          actions: [{ label: '閉じる' }]
        });
        return;
      }

      // 表示用に改行を <br> に変換
      const displayText = noteText.replace(/\n/g, '<br>');

      HenryCore.ui.showModal({
        title: 'カルテ内容',
        content: displayText,
        actions: [
          {
            label: 'コピー',
            onClick: () => {
              navigator.clipboard.writeText(noteText);  // コピーは元のテキスト
            },
            autoClose: false
          },
          { label: '閉じる' }
        ]
      });
    }
  });

  console.log(`[${SCRIPT_NAME}] 初期化完了`);
})();
