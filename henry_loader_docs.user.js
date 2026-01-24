// ==UserScript==
// @name         Henry Loader (Google Docs)
// @namespace    https://henry-app.jp/
// @version      1.1.0
// @description  Google Docs用Henryスクリプトローダー
// @author       sk powered by Claude
// @match        https://docs.google.com/*
// @require      https://raw.githubusercontent.com/shin-926/Henry/develop/henry_core.user.js
// @require      https://raw.githubusercontent.com/shin-926/Henry/develop/henry_google_drive_bridge.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_addStyle
// @grant        GM_info
// @grant        unsafeWindow
// @connect      googleapis.com
// @connect      accounts.google.com
// @connect      oauth2.googleapis.com
// @connect      www.googleapis.com
// @connect      storage.googleapis.com
// @connect      henry-app.jp
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_loader_docs.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_loader_docs.user.js
// ==/UserScript==

// @require でスクリプトが自動的に読み込まれるため、
// このファイル自体には何も書く必要がありません。
// Tampermonkeyが @require のURLからスクリプトを取得し、
// CSPをバイパスして実行します。

console.log('[HenryLoader:Docs] Google Docs用ローダー起動');
