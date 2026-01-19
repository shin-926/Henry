// ==UserScript==
// @name         カルテ履歴取得
// @namespace    https://github.com/shin-926/Henry
// @version      0.2.0
// @description  過去3ヶ月分のカルテ記事をコンソールに出力（実験用）
// @match        https://henry-app.jp/*
// @grant        unsafeWindow
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_karte_history.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_karte_history.user.js
// ==/UserScript==

/*
 * 【カルテ履歴取得（実験用）】
 *
 * ■ 使用場面
 * - 過去のカルテ記事の内容をまとめて取得したい場合
 * - デバッグ・開発用途
 *
 * ■ 機能
 * - 過去3ヶ月分のカルテ記事を取得
 * - コンソールに出力（UIなし）
 *
 * ■ 注意
 * - 実験用スクリプトのため、本番利用は想定していない
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'HenryKarteHistory';
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
    log.info(`期間: ${startDate} 〜 ${endDate}`);

    try {
      const result = await HenryCore.query(QUERY_ENCOUNTERS, {
        patientId: patientUuid,
        startDate,
        endDate,
        pageSize: PAGE_SIZE,
        pageToken: null
      }, { endpoint: '/graphql-v2' });

      const encounters = result.data?.encountersInPatient?.encounters ?? [];
      const nextPageToken = result.data?.encountersInPatient?.nextPageToken;

      log.info(`取得件数: ${encounters.length}件`, nextPageToken ? `(次ページあり: ${nextPageToken})` : '');

      // 生データをログ出力（構造調査用）
      console.group(`[${SCRIPT_NAME}] 生データ`);
      console.log('encounters:', encounters);
      console.groupEnd();

      // 整形して出力
      console.group(`[${SCRIPT_NAME}] カルテ履歴`);
      encounters.forEach((enc, i) => {
        const session = enc.basedOn?.[0];
        const date = session?.scheduleTime
          ? new Date(session.scheduleTime).toLocaleDateString('ja-JP')
          : '日付不明';
        const doctor = session?.doctor?.name || '医師不明';

        console.group(`${i + 1}. ${date} - ${doctor}`);

        // records全体を出力（型確認用）
        console.log('records:', enc.records);

        // ProgressNoteを抽出して表示
        const progressNote = enc.records?.find(r => r.__typename === 'ProgressNote');
        if (progressNote?.editorData) {
          console.log('診療録:', parseEditorData(progressNote.editorData));
        } else {
          console.log('診療録: なし');
        }

        // 処方を表示
        const prescriptions = enc.records?.filter(r => r.__typename === 'PrescriptionOrder') ?? [];
        prescriptions.forEach((rx, rxIdx) => {
          console.group(`処方 ${rxIdx + 1}`);
          rx.rps?.forEach((rp, rpIdx) => {
            const medicines = rp.instructions
              ?.map(inst => {
                const med = inst.instruction?.medicationDosageInstruction;
                if (!med) return null;
                return med.localMedicine?.name || '不明';
              })
              .filter(Boolean)
              .join(', ') || '薬剤不明';
            console.log(`Rp${rpIdx + 1}: ${medicines} / ${rp.dosageText || '用法不明'}`);
          });
          console.groupEnd();
        });

        // その他の型を表示（検体検査含む - フィールド構造不明のため詳細は未取得）
        const otherTypes = enc.records
          ?.filter(r => !['ProgressNote', 'PrescriptionOrder'].includes(r.__typename))
          .map(r => r.__typename) ?? [];
        if (otherTypes.length > 0) {
          console.log('その他のレコード型:', [...new Set(otherTypes)]);
        }

        console.groupEnd();
      });
      console.groupEnd();

      log.info('取得完了');

    } catch (e) {
      log.error('取得エラー:', e.message);
      alert('エラー: ' + e.message);
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
      id: 'karte-history',
      name: 'カルテ履歴',
      icon: '📜',
      description: '過去3ヶ月分のカルテをコンソールに出力',
      version: '0.2.0',
      order: 50,
      onClick: fetchKarteHistory
    });

    log.info('プラグイン登録完了');
  })();

})();
