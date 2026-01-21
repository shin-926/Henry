// ==UserScript==
// @name         Henry Disease List
// @namespace    https://henry-app.jp/
// @version      1.0.3
// @description  患者の病名一覧を表示 | powered by Claude & Gemini
// @author       sk
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_disease_list.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_disease_list.user.js
// ==/UserScript==

/*
 * 【患者病名一覧】
 *
 * ■ 使用場面
 * - 現在開いている患者の登録済み病名を一覧で確認したい場合
 * - ツールボックスの「病名」ボタンから呼び出し
 *
 * ■ 表示内容
 * - 病名（ICD-10コード付き）
 * - 主病名/副病名の区分
 * - 登録日
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'DiseaseList';

  const QUERY = `
    query ListPatientReceiptDiseases($input: ListPatientReceiptDiseasesRequestInput!) {
      listPatientReceiptDiseases(input: $input) {
        patientReceiptDiseases {
          masterDisease {
            name
          }
        }
      }
    }
  `;

  async function fetchDiseases(patientUuid) {
    try {
      const result = await HenryCore.query(QUERY, {
        input: {
          patientUuids: [patientUuid],
          patientCareType: 'PATIENT_CARE_TYPE_ANY',
          onlyMain: false
        }
      });
      return result.data?.listPatientReceiptDiseases?.patientReceiptDiseases || [];
    } catch (e) {
      console.error(`[${SCRIPT_NAME}]`, e.message);
      return null;
    }
  }

  function showModal(diseases) {
    const content = document.createElement('div');

    if (diseases.length === 0) {
      content.innerHTML = '<p style="color: #888; text-align: center;">登録されている病名がありません</p>';
    } else {
      content.innerHTML = `
        <div style="margin-bottom: 8px; color: #666;">${diseases.length} 件</div>
        <ul style="margin: 0; padding-left: 20px; max-height: 400px; overflow-y: auto;">
          ${diseases.map(d => `<li style="padding: 4px 0;">${d.masterDisease?.name || '（名称なし）'}</li>`).join('')}
        </ul>
      `;
    }

    HenryCore.ui.showModal({
      title: '病名一覧',
      content,
      width: 400
    });
  }

  async function main() {
    const patientUuid = HenryCore.getPatientUuid();
    if (!patientUuid) {
      alert('患者が選択されていません');
      return;
    }

    const diseases = await fetchDiseases(patientUuid);
    if (diseases === null) {
      alert('病名の取得に失敗しました');
      return;
    }

    showModal(diseases);
  }

  function init() {
    if (typeof HenryCore === 'undefined') {
      console.error(`[${SCRIPT_NAME}] HenryCore not found`);
      return;
    }

    HenryCore.registerPlugin({
      id: 'disease-list',
      name: '病名一覧',
      icon: '📋',
      onClick: main
    });

    console.log(`[${SCRIPT_NAME}] initialized`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
