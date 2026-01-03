// ==UserScript==
// @name         Henry：再診予約連携（プラグイン対応）
// @namespace    https://github.com/shin-926/Tampermonkey
// @version      5.0.0
// @description  HenryカルテでGetPatient APIから患者ID(serialNumber)を取得し、予約サイトを開いて簡単予約
// @match        https://henry-app.jp/*
// @match        https://manage-maokahp.reserve.ne.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-idle
// @downloadURL  https://gist.githubusercontent.com/shin-926/ef462d428796deaf0fdb1680c3b20e29/raw/henry_reserve.user.js
// @updateURL    https://gist.githubusercontent.com/shin-926/ef462d428796deaf0fdb1680c3b20e29/raw/henry_reserve.user.js
// ==/UserScript==

(function () {
  'use strict';

  const host = location.hostname;

  // ------------------------------------------------
  // Henry側の処理
  // ------------------------------------------------
  if (host.includes('henry-app.jp')) {

    // ============================================
    // ツールボックスに自己登録（プラグイン方式）
    // ============================================

    (function registerToToolbox() {
      // レジストリがなければ箱だけ作る（順序問題の解決）
      unsafeWindow.HenryToolbox = unsafeWindow.HenryToolbox || { items: [] };

      const toolbox = unsafeWindow.HenryToolbox;

      const myItem = {
        label: '再診予約',
        event: 'henry:open-reserve',
        order: 30  // 表示順（小さいほど上）
      };

      // 重複チェック
      const exists = toolbox.items.some(i => i.event === myItem.event);
      if (exists) return;

      // 登録方法を分岐
      if (typeof toolbox.register === 'function') {
        // UIコントローラーが先に動いてた
        toolbox.register(myItem);
      } else {
        // UIコントローラーがまだ → 配列に直接追加
        toolbox.items.push(myItem);
        console.log('[Reserve] ツールボックスに仮登録');
      }
    })();

    // ============================================
    // HenryCore関連
    // ============================================

    async function waitForHenryCore() {
      let waited = 0;
      while (!unsafeWindow.HenryCore) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
        if (waited > 5000) {
          throw new Error('HenryCoreが見つかりません。「Henry API ハッシュ自動管理」スクリプトが有効か確認してください。');
        }
      }
      return unsafeWindow.HenryCore;
    }

    async function getPatientFromAPI() {
      const uuid = location.pathname.match(/patients\/([a-f0-9-]{36})/)?.[1];
      if (!uuid) {
        throw new Error('患者ページを開いてください');
      }

      const HenryCore = await waitForHenryCore();

      const result = await HenryCore.call('GetPatient', {
        input: { uuid }
      });

      const patient = result.data?.getPatient;
      if (!patient) {
        throw new Error('患者情報を取得できませんでした');
      }

      return {
        id: patient.serialNumber,
        name: patient.fullName,
        namePhonetic: patient.fullNamePhonetic
      };
    }

    // ============================================
    // メイン処理（イベントリスナー）
    // ============================================

    window.addEventListener('henry:open-reserve', async () => {
      console.log('[Reserve] open-reserve event received');

      try {
        const patientData = await getPatientFromAPI();

        const patientId = patientData.id;
        if (!patientId) {
          alert('患者ID（患者番号）が取得できませんでした');
          return;
        }

        GM_setValue('currentPatientId', patientId);
        GM_setValue('currentPatientName', patientData.name || '');
        GM_setValue('openedFromHenry', Date.now());
        console.log('[Reserve] 保存した患者番号:', patientId, '患者名:', patientData.name);

        const width = window.screen.availWidth;
        const height = window.screen.availHeight;
        window.open(
          'https://manage-maokahp.reserve.ne.jp/',
          'reserveWindow',
          `width=${width},height=${height},left=0,top=0`
        );

      } catch (e) {
        console.error('[Reserve] エラー:', e);

        if (e.message.includes('ハッシュがありません')) {
          alert('GetPatient APIのハッシュがありません。\nHenryで患者詳細画面を一度開いてください。');
        } else if (e.message.includes('トークン')) {
          alert('認証エラー: ページをリロードしてください');
        } else {
          alert(e.message);
        }
      }
    });

    console.log('[Reserve] イベントリスナー登録完了');
  }

  // ------------------------------------------------
  // 予約サイト側の処理
  // ------------------------------------------------
  if (host.includes('manage-maokahp.reserve.ne.jp')) {
    const patientId = GM_getValue('currentPatientId', '');
    const patientName = GM_getValue('currentPatientName', '');
    const openedAt = GM_getValue('openedFromHenry', 0);

    const isFromHenry = (Date.now() - openedAt) < 5000;

    if (!isFromHenry) {
      console.log('[Reserve] ブックマーク等から開かれたためスキップ');
      return;
    }

    GM_setValue('openedFromHenry', 0);

    if (!patientId) {
      console.log('[Reserve] 保存されたカルテIDがありません');
      return;
    }
    console.log('[Reserve] 取得したカルテID:', patientId, '患者名:', patientName);

    function showPatientBanner() {
      if (document.getElementById('henry-patient-banner')) return;

      const banner = document.createElement('div');
      banner.id = 'henry-patient-banner';
      banner.innerHTML = `
        <span style="margin-right: 12px;">📋</span>
        <span><strong>${patientId}</strong></span>
        <span style="margin: 0 8px;">|</span>
        <span><strong>${patientName || '患者名不明'}</strong></span>
      `;
      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        backgroundColor: '#E8F5F0',
        color: '#17181B',
        padding: '10px 20px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: '99999',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      });

      document.body.appendChild(banner);

      const bannerHeight = banner.offsetHeight;
      document.body.style.paddingTop = bannerHeight + 'px';

      function adjustDialogPosition() {
        const dialog = document.querySelector('#dialog_reserve_input')?.closest('.ui-dialog');
        if (!dialog) return;

        const currentTop = parseInt(dialog.style.top) || 0;
        if (currentTop < bannerHeight) {
          dialog.style.top = bannerHeight + 'px';
        }

        const dialogTop = parseInt(dialog.style.top) || bannerHeight;
        const maxHeight = window.innerHeight - dialogTop - 10;
        const currentHeight = dialog.offsetHeight;

        if (currentHeight > maxHeight) {
          dialog.style.height = maxHeight + 'px';

          const content = dialog.querySelector('.ui-dialog-content');
          if (content) {
            const titleBar = dialog.querySelector('.ui-dialog-titlebar');
            const buttonPane = dialog.querySelector('.ui-dialog-buttonpane');
            const titleHeight = titleBar ? titleBar.offsetHeight : 0;
            const buttonHeight = buttonPane ? buttonPane.offsetHeight : 0;
            const contentMaxHeight = maxHeight - titleHeight - buttonHeight - 20;

            content.style.maxHeight = contentMaxHeight + 'px';
            content.style.overflowY = 'auto';
          }
        }
      }

      const dialogObserver = new MutationObserver(adjustDialogPosition);
      dialogObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
      window.addEventListener('resize', adjustDialogPosition);
      adjustDialogPosition();
    }

    showPatientBanner();

    function tryFillDialog() {
      const dialog = document.querySelector('#dialog_reserve_input');
      if (!dialog) return;

      const input = document.getElementById('multi_record_no[0]');
      if (!input) return;

      if (input.value.trim() !== '') return;

      input.value = patientId;
      input.focus();
      try { input.setSelectionRange(patientId.length, patientId.length); } catch (e) {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('[Reserve] ID自動入力完了');

      const searchBtn = document.querySelector('#div_multi_record_no_input_0 > input.input_board_search_customer');
      if (searchBtn) {
        searchBtn.click();
        console.log('[Reserve] 検索ボタン自動クリック');
      }
    }

    const observer = new MutationObserver(() => {
      tryFillDialog();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    tryFillDialog();
  }
})();
