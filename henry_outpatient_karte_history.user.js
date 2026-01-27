// ==UserScript==
// @name         外来カルテ履歴
// @namespace    https://github.com/shin-926/Henry
// @version      0.3.0
// @description  過去3ヶ月分の外来カルテをモーダル表示
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_outpatient_karte_history.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_outpatient_karte_history.user.js
// ==/UserScript==

/*
 * 【外来カルテ履歴】
 *
 * ■ 使用場面
 * - 過去の外来カルテの内容をまとめて確認したい場合
 *
 * ■ 機能
 * - 過去3ヶ月分の外来カルテを取得
 * - モーダルで整形表示
 * - クリップボードにコピー可能
 */

(function() {
  'use strict';

  const VERSION = GM_info.script.version;
  const SCRIPT_NAME = 'HenryOutpatientKarteHistory';
  const PAGE_SIZE = 50;

  const QUERY_ENCOUNTERS = `
    query EncountersInPatient($patientId: ID!, $startDate: IsoDate, $endDate: IsoDate, $pageSize: Int!, $pageToken: String) {
      encountersInPatient(patientId: $patientId, startDate: $startDate, endDate: $endDate, pageSize: $pageSize, pageToken: $pageToken) {
        encounters {
          id
          basedOn {
            ... on Session {
              scheduleTime
              doctor {
                name
              }
            }
          }
          records(includeDraft: false) {
            __typename
            ... on ProgressNote {
              editorData
            }
            ... on PrescriptionOrder {
              rps {
                dosageText
                instructions {
                  instruction {
                    medicationDosageInstruction {
                      localMedicine { name }
                    }
                  }
                }
              }
            }
          }
        }
        nextPageToken
      }
    }
  `;

  const log = {
    info: (msg, ...args) => console.log(`[${SCRIPT_NAME}]`, msg, ...args),
    error: (msg, ...args) => console.error(`[${SCRIPT_NAME}]`, msg, ...args)
  };

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  async function waitForHenryCore(timeout = 5000) {
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) return null;
    }
    return pageWindow.HenryCore;
  }

  function getDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const format = (d) => d.toISOString().split('T')[0];
    return {
      startDate: format(startDate),
      endDate: format(endDate)
    };
  }

  function parseEditorData(editorDataStr) {
    try {
      const data = JSON.parse(editorDataStr);
      return data.blocks.map(b => b.text).filter(t => t).join('\n');
    } catch (e) {
      return '(解析エラー)';
    }
  }

  function formatEncounter(enc) {
    const session = enc.basedOn?.[0];
    const date = session?.scheduleTime
      ? new Date(session.scheduleTime).toLocaleDateString('ja-JP')
      : '日付不明';
    const doctor = session?.doctor?.name || '医師不明';

    const lines = [`■ ${date} - ${doctor}`];

    // 診療録
    const progressNote = enc.records?.find(r => r.__typename === 'ProgressNote');
    if (progressNote?.editorData) {
      lines.push(`診療録: ${parseEditorData(progressNote.editorData)}`);
    }

    // 処方
    const prescriptions = enc.records?.filter(r => r.__typename === 'PrescriptionOrder') ?? [];
    prescriptions.forEach((rx) => {
      rx.rps?.forEach((rp, rpIdx) => {
        const medicines = rp.instructions
          ?.map(inst => {
            const med = inst.instruction?.medicationDosageInstruction;
            if (!med) return null;
            return med.localMedicine?.name || '不明';
          })
          .filter(Boolean)
          .join(', ') || '薬剤不明';
        lines.push(`処方 Rp${rpIdx + 1}: ${medicines} / ${rp.dosageText || '用法不明'}`);
      });
    });

    return { date, doctor, lines };
  }

  function buildModalContent(encounters, textForCopy) {
    const container = document.createElement('div');
    container.style.cssText = 'max-height: 60vh; overflow-y: auto;';

    if (encounters.length === 0) {
      container.textContent = 'カルテ記録が見つかりませんでした。';
      return { container, textForCopy: '' };
    }

    encounters.forEach((enc, i) => {
      const { date, doctor, lines } = formatEncounter(enc);

      const section = document.createElement('div');
      section.style.cssText = 'margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e0e0e0;';

      const header = document.createElement('div');
      header.style.cssText = 'font-weight: bold; color: #1976d2; margin-bottom: 8px;';
      header.textContent = `■ ${date} - ${doctor}`;
      section.appendChild(header);

      lines.slice(1).forEach(line => {
        const p = document.createElement('div');
        p.style.cssText = 'margin: 4px 0; white-space: pre-wrap; line-height: 1.5;';
        p.textContent = line;
        section.appendChild(p);
      });

      container.appendChild(section);
      textForCopy.push(lines.join('\n'));
    });

    return { container, textForCopy: textForCopy.join('\n\n') };
  }

  async function fetchKarteHistory() {
    const HenryCore = await waitForHenryCore();
    if (!HenryCore) {
      log.error('HenryCoreが見つかりません');
      alert('HenryCoreが必要です');
      return;
    }

    const patientUuid = HenryCore.getPatientUuid();
    if (!patientUuid) {
      log.error('患者ページを開いてください');
      alert('患者ページを開いてください');
      return;
    }

    log.info('取得開始 - 患者UUID:', patientUuid);

    const { startDate, endDate } = getDateRange();
    const spinner = HenryCore.ui.showSpinner('カルテ履歴を取得中...');

    try {
      const result = await HenryCore.query(QUERY_ENCOUNTERS, {
        patientId: patientUuid,
        startDate,
        endDate,
        pageSize: PAGE_SIZE,
        pageToken: null
      }, { endpoint: '/graphql-v2' });

      spinner.close();

      const encounters = result.data?.encountersInPatient?.encounters ?? [];
      log.info(`取得件数: ${encounters.length}件`);

      const textForCopy = [];
      const { container, textForCopy: copyText } = buildModalContent(encounters, textForCopy);

      HenryCore.ui.showModal({
        title: `外来カルテ履歴（過去3ヶ月・${encounters.length}件）`,
        content: container,
        width: '600px',
        actions: [
          {
            label: 'コピー',
            variant: 'secondary',
            autoClose: false,
            onClick: () => {
              navigator.clipboard.writeText(copyText).then(() => {
                HenryCore.ui.showToast('クリップボードにコピーしました', 'success');
              });
            }
          },
          {
            label: '閉じる',
            variant: 'primary'
          }
        ]
      });

    } catch (e) {
      spinner.close();
      log.error('取得エラー:', e.message);
      HenryCore.ui.showToast('取得エラー: ' + e.message, 'error');
    }
  }

  // プラグイン登録
  (async function registerPlugin() {
    const HenryCore = await waitForHenryCore();
    if (!HenryCore) {
      log.error('HenryCoreが見つかりません - プラグイン登録スキップ');
      return;
    }

    await HenryCore.registerPlugin({
      id: 'outpatient-karte-history',
      name: '外来カルテ履歴',
      icon: '📜',
      description: '過去3ヶ月分の外来カルテをモーダル表示',
      version: VERSION,
      order: 50,
      onClick: fetchKarteHistory
    });

    log.info(`Ready (v${VERSION})`);
  })();

})();
