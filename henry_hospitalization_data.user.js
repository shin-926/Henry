// ==UserScript==
// @name         Henry Hospitalization Data Viewer
// @namespace    https://github.com/shin-926/Henry
// @version      0.1.2
// @description  入院患者の日々データを取得・表示（実験）
// @author       sk powered by Claude & Gemini
// @match        https://henry-app.jp/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_hospitalization_data.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_hospitalization_data.user.js
// ==/UserScript==

/*
 * 【入院データビューア（実験用）】
 *
 * ■ 使用場面
 * - 入院患者の日々のデータを取得・表示したい場合
 * - 実験・開発用途
 *
 * ■ 注意
 * - 実験用スクリプトのため、本番利用は想定していない
 * - 機能が不完全な場合あり
 */

(function() {
  'use strict';

  const SCRIPT_NAME = 'HospitalizationData';
  const VERSION = '0.1.0';

  // HenryCore待機
  function waitForHenryCore(maxWait = 10000) {
    return new Promise((resolve, reject) => {
      if (window.HenryCore?.query) return resolve(window.HenryCore);
      const start = Date.now();
      const check = setInterval(() => {
        if (window.HenryCore?.query) {
          clearInterval(check);
          resolve(window.HenryCore);
        } else if (Date.now() - start > maxWait) {
          clearInterval(check);
          reject(new Error('HenryCore not found'));
        }
      }, 100);
    });
  }

  // ClinicalCalendarView クエリ（簡略版）
  const CLINICAL_CALENDAR_QUERY = `
    query ClinicalCalendarView(
      $patientId: ID!
      $baseDate: Date!
      $beforeDateSize: Int!
      $afterDateSize: Int!
      $clinicalResourceHrns: [String!]!
    ) {
      clinicalCalendarView(
        patientId: $patientId
        baseDate: $baseDate
        beforeDateSize: $beforeDateSize
        afterDateSize: $afterDateSize
        clinicalResourceHrns: $clinicalResourceHrns
        createUserIds: []
        accountingOrderShinryoShikibetsus: []
        includeRevoked: false
      ) {
        prescriptionOrders {
          id
          startDate
          orderStatus
          rps {
            dosageText
            boundsDurationDays { value }
            instructions {
              instruction {
                medicationDosageInstruction {
                  localMedicine { name }
                  quantity { doseQuantity { value } }
                }
              }
            }
          }
        }
        injectionOrders {
          id
          startDate
          orderStatus
          rps {
            dosageText
            boundsDurationDays { value }
            localInjectionTechnique { name }
            instructions {
              instruction {
                medicationDosageInstruction {
                  localMedicine { name }
                  quantity { doseQuantity { value } }
                }
              }
            }
          }
        }
        vitalSigns {
          id
          recordedAt
          bodyTemperature { value }
          systolicBloodPressure { value }
          diastolicBloodPressure { value }
          pulse { value }
          spO2 { value }
        }
        inspectionReportResults {
          id
          reportDate
          specimenName
          inspectionName
          resultValue
          resultUnit
          abnormalFlag
        }
        nutritionOrders {
          id
          startDate
          nutritionName
        }
      }
    }
  `;

  // 入院情報取得クエリ
  const HOSPITALIZATION_QUERY = `
    query ListPatientHospitalizations($input: ListPatientHospitalizationsInput!) {
      listPatientHospitalizations(input: $input) {
        hospitalizations {
          uuid
          state
          startDate { year month day }
          endDate { year month day }
          hospitalizationDayCount { value }
          lastHospitalizationLocation {
            ward { name }
            room { name }
          }
        }
      }
    }
  `;

  // 日付フォーマット
  function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // メイン処理
  async function fetchHospitalizationData() {
    try {
      const core = await waitForHenryCore();
      const patientUuid = core.getPatientUuid();

      if (!patientUuid) {
        console.error(`[${SCRIPT_NAME}] 患者画面で実行してください`);
        alert('患者画面で実行してください');
        return null;
      }

      console.log(`[${SCRIPT_NAME}] 患者UUID: ${patientUuid}`);

      // 入院情報取得
      const hospResult = await core.query(HOSPITALIZATION_QUERY, {
        input: { patientUuid, pageSize: 10, pageToken: '' }
      });

      const hospitalizations = hospResult?.data?.listPatientHospitalizations?.hospitalizations || [];
      const currentHosp = hospitalizations.find(h => h.state === 'ADMITTED');

      if (!currentHosp) {
        console.log(`[${SCRIPT_NAME}] 入院中ではありません`);
        alert('この患者は入院中ではありません');
        return null;
      }

      console.log(`[${SCRIPT_NAME}] 入院情報:`, {
        病棟: currentHosp.lastHospitalizationLocation?.ward?.name,
        部屋: currentHosp.lastHospitalizationLocation?.room?.name,
        入院日数: currentHosp.hospitalizationDayCount?.value
      });

      // 日々データ取得（直近7日）
      const today = formatDate(new Date());
      const clinicalResult = await core.query(CLINICAL_CALENDAR_QUERY, {
        patientId: patientUuid,
        baseDate: today,
        beforeDateSize: 7,
        afterDateSize: 0,
        clinicalResourceHrns: [
          '//henry-app.jp/clinicalResource/prescriptionOrder',
          '//henry-app.jp/clinicalResource/injectionOrder',
          '//henry-app.jp/clinicalResource/vitalSign',
          '//henry-app.jp/clinicalResource/inspectionReport',
          '//henry-app.jp/clinicalResource/nutritionOrder'
        ]
      });

      const data = clinicalResult?.data?.clinicalCalendarView;
      if (!data) {
        console.error(`[${SCRIPT_NAME}] データ取得失敗`);
        return null;
      }

      // 結果を整形
      const result = {
        hospitalization: {
          ward: currentHosp.lastHospitalizationLocation?.ward?.name,
          room: currentHosp.lastHospitalizationLocation?.room?.name,
          dayCount: currentHosp.hospitalizationDayCount?.value,
          startDate: currentHosp.startDate
        },
        prescriptions: (data.prescriptionOrders || []).map(o => ({
          date: o.startDate,
          status: o.orderStatus,
          medications: o.rps?.flatMap(rp =>
            rp.instructions?.map(i => ({
              name: i.instruction?.medicationDosageInstruction?.localMedicine?.name,
              dosage: rp.dosageText,
              days: rp.boundsDurationDays?.value
            }))
          ).filter(Boolean)
        })),
        injections: (data.injectionOrders || []).map(o => ({
          date: o.startDate,
          status: o.orderStatus,
          items: o.rps?.flatMap(rp =>
            rp.instructions?.map(i => ({
              name: i.instruction?.medicationDosageInstruction?.localMedicine?.name,
              technique: rp.localInjectionTechnique?.name,
              dosage: rp.dosageText,
              days: rp.boundsDurationDays?.value
            }))
          ).filter(Boolean)
        })),
        vitals: (data.vitalSigns || []).map(v => ({
          datetime: v.recordedAt,
          temperature: v.bodyTemperature?.value,
          systolic: v.systolicBloodPressure?.value,
          diastolic: v.diastolicBloodPressure?.value,
          pulse: v.pulse?.value,
          spO2: v.spO2?.value
        })),
        labResults: (data.inspectionReportResults || []).map(r => ({
          date: r.reportDate,
          specimen: r.specimenName,
          test: r.inspectionName,
          value: r.resultValue,
          unit: r.resultUnit,
          abnormal: r.abnormalFlag
        })),
        nutrition: (data.nutritionOrders || []).map(n => ({
          date: n.startDate,
          name: n.nutritionName
        }))
      };

      console.log(`[${SCRIPT_NAME}] 取得データ:`, result);

      // サマリー表示
      showSummary(result);

      return result;
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] エラー:`, e);
      alert(`データ取得エラー: ${e.message}`);
      return null;
    }
  }

  // サマリーモーダル表示
  function showSummary(data) {
    // 既存モーダルを削除
    document.getElementById('hosp-data-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'hosp-data-modal';
    modal.innerHTML = `
      <style>
        #hosp-data-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #hosp-data-modal .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          padding: 20px;
          font-family: sans-serif;
        }
        #hosp-data-modal h2 { margin-top: 0; }
        #hosp-data-modal h3 {
          margin: 16px 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
        }
        #hosp-data-modal .close-btn {
          float: right;
          background: #666;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        #hosp-data-modal table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        #hosp-data-modal th, #hosp-data-modal td {
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        #hosp-data-modal th { background: #f5f5f5; }
        #hosp-data-modal .abnormal { color: red; font-weight: bold; }
        #hosp-data-modal .info-box {
          background: #e3f2fd;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
      </style>
      <div class="modal-content">
        <button class="close-btn" onclick="this.closest('#hosp-data-modal').remove()">閉じる</button>
        <h2>入院データサマリー</h2>

        <div class="info-box">
          <strong>入院情報:</strong>
          ${data.hospitalization.ward} ${data.hospitalization.room}号室
          （${data.hospitalization.dayCount}日目）
        </div>

        <h3>💊 処方 (${data.prescriptions.length}件)</h3>
        ${data.prescriptions.length ? `
          <table>
            <tr><th>開始日</th><th>薬剤名</th><th>用法</th><th>日数</th></tr>
            ${data.prescriptions.flatMap(p =>
              (p.medications || []).map(m => `
                <tr>
                  <td>${p.date}</td>
                  <td>${m.name || '-'}</td>
                  <td>${m.dosage || '-'}</td>
                  <td>${m.days || '-'}日</td>
                </tr>
              `)
            ).join('')}
          </table>
        ` : '<p>データなし</p>'}

        <h3>💉 注射 (${data.injections.length}件)</h3>
        ${data.injections.length ? `
          <table>
            <tr><th>開始日</th><th>薬剤名</th><th>手技</th><th>日数</th></tr>
            ${data.injections.flatMap(inj =>
              (inj.items || []).map(item => `
                <tr>
                  <td>${inj.date}</td>
                  <td>${item.name || '-'}</td>
                  <td>${item.technique || '-'}</td>
                  <td>${item.days || '-'}日</td>
                </tr>
              `)
            ).join('')}
          </table>
        ` : '<p>データなし</p>'}

        <h3>🌡️ バイタル (${data.vitals.length}件)</h3>
        ${data.vitals.length ? `
          <table>
            <tr><th>日時</th><th>体温</th><th>血圧</th><th>脈拍</th><th>SpO2</th></tr>
            ${data.vitals.slice(0, 20).map(v => `
              <tr>
                <td>${v.datetime ? new Date(v.datetime).toLocaleString('ja-JP') : '-'}</td>
                <td>${v.temperature ? v.temperature + '℃' : '-'}</td>
                <td>${v.systolic && v.diastolic ? v.systolic + '/' + v.diastolic : '-'}</td>
                <td>${v.pulse || '-'}</td>
                <td>${v.spO2 ? v.spO2 + '%' : '-'}</td>
              </tr>
            `).join('')}
          </table>
          ${data.vitals.length > 20 ? `<p>他 ${data.vitals.length - 20}件...</p>` : ''}
        ` : '<p>データなし</p>'}

        <h3>🔬 検査結果 (${data.labResults.length}件)</h3>
        ${data.labResults.length ? `
          <table>
            <tr><th>日付</th><th>検査名</th><th>結果</th><th>単位</th></tr>
            ${data.labResults.slice(0, 30).map(r => `
              <tr>
                <td>${r.date || '-'}</td>
                <td>${r.test || '-'}</td>
                <td class="${r.abnormal ? 'abnormal' : ''}">${r.value || '-'}</td>
                <td>${r.unit || '-'}</td>
              </tr>
            `).join('')}
          </table>
          ${data.labResults.length > 30 ? `<p>他 ${data.labResults.length - 30}件...</p>` : ''}
        ` : '<p>データなし</p>'}

        <h3>🍽️ 食事 (${data.nutrition.length}件)</h3>
        ${data.nutrition.length ? `
          <table>
            <tr><th>日付</th><th>食事</th></tr>
            ${data.nutrition.map(n => `
              <tr>
                <td>${n.date || '-'}</td>
                <td>${n.name || '-'}</td>
              </tr>
            `).join('')}
          </table>
        ` : '<p>データなし</p>'}

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          ※ コンソールに詳細データが出力されています（F12で確認）
        </p>
      </div>
    `;

    // クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  // プラグイン登録
  async function init() {
    try {
      const core = await waitForHenryCore();

      core.registerPlugin({
        id: 'hospitalization-data',
        name: '入院データ取得',
        version: VERSION,
        description: '入院患者の直近7日間のデータを取得・表示',
        match: /\/patients\/[^/]+/,
        actions: [
          {
            label: '入院データ取得',
            handler: fetchHospitalizationData
          }
        ]
      });

      console.log(`[${SCRIPT_NAME}] v${VERSION} 初期化完了`);
    } catch (e) {
      console.error(`[${SCRIPT_NAME}] 初期化失敗:`, e);
    }
  }

  // グローバル公開（デバッグ用）
  window.HospitalizationData = {
    fetch: fetchHospitalizationData,
    version: VERSION
  };

  init();
})();
