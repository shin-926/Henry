// ==UserScript==
// @name         Henry 主治医意見書作成支援 v2 (PDF版)
// @namespace    https://henry-app.jp/
// @version      2.1.0
// @description  主治医意見書のPDF生成・下書き保存機能
// @match        https://henry-app.jp/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js
// @require      file:///Users/shinichiro/Documents/Henry/NotoSansJP-Base64.js?v=4
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(async function() {
  'use strict';

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  let log = null;

  // ==========================================
  // ユーティリティ
  // ==========================================

  async function waitForHenryCore(timeout = 5000) {
    let waited = 0;
    while (!pageWindow.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > timeout) {
        console.error('[OpinionDocument] HenryCore が見つかりません');
        return false;
      }
    }
    return true;
  }

  function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ==========================================
  // 患者情報取得
  // ==========================================

  async function fetchPatientInfo(patientUuid) {
    try {
      const result = await pageWindow.HenryCore.call('GetPatient', {
        input: { uuid: patientUuid }
      });
      const patient = result.data?.getPatient;
      if (!patient) return null;

      let age = null;
      const birthDate = patient.detail?.birthDate;
      if (birthDate) {
        const today = new Date();
        const birth = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
        age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
      }

      const sexType = patient.detail?.sexType;
      let sex = null;
      if (sexType === 'SEX_TYPE_MALE') sex = 1;
      else if (sexType === 'SEX_TYPE_FEMALE') sex = 2;

      return {
        name: patient.fullName || '',
        age: age,
        sex: sex,
        birthDate: birthDate ? `昭和○年○月○日` : ''
      };
    } catch (e) {
      log?.error('患者情報取得失敗', e.message);
      return null;
    }
  }

  // ==========================================
  // localStorage管理
  // ==========================================

  const STORAGE_KEY_PREFIX = 'henry_opinion_draft_';
  const MAX_DRAFT_AGE_DAYS = 30;

  function saveDraft(patientUuid, formData) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${patientUuid}`;
      const draft = {
        data: formData,
        savedAt: new Date().toISOString(),
        patientName: formData.patient_name
      };
      localStorage.setItem(key, JSON.stringify(draft));
      log?.info('下書き保存完了:', key);
      return true;
    } catch (e) {
      log?.error('下書き保存失敗:', e.message);
      return false;
    }
  }

  function loadDraft(patientUuid) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${patientUuid}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft = JSON.parse(stored);
      log?.info('下書き読み込み成功:', key);
      return draft.data;
    } catch (e) {
      log?.error('下書き読み込み失敗:', e.message);
      return null;
    }
  }

  function getAllDrafts() {
    const drafts = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft = JSON.parse(stored);
            const patientUuid = key.replace(STORAGE_KEY_PREFIX, '');
            drafts.push({
              patientUuid,
              patientName: draft.patientName,
              savedAt: draft.savedAt,
              data: draft.data
            });
          }
        }
      }
    } catch (e) {
      log?.error('下書きリスト取得失敗:', e.message);
    }
    return drafts.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }

  function deleteDraft(patientUuid) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${patientUuid}`;
      localStorage.removeItem(key);
      log?.info('下書き削除完了:', key);
      return true;
    } catch (e) {
      log?.error('下書き削除失敗:', e.message);
      return false;
    }
  }

  function cleanupOldDrafts() {
    try {
      const now = new Date();
      let deletedCount = 0;

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft = JSON.parse(stored);
            const savedDate = new Date(draft.savedAt);
            const ageInDays = (now - savedDate) / (1000 * 60 * 60 * 24);

            if (ageInDays > MAX_DRAFT_AGE_DAYS) {
              localStorage.removeItem(key);
              deletedCount++;
            }
          }
        }
      }

      if (deletedCount > 0) {
        log?.info(`古い下書きを${deletedCount}件削除しました`);
      }
    } catch (e) {
      log?.error('下書きクリーンアップ失敗:', e.message);
    }
  }

  // ==========================================
  // PDF生成：ヘルパー関数
  // ==========================================

  function setupFont(doc) {
    try {
      // @require ファイルは Tampermonkey の window に読み込まれる
      const fontBase64 = window.NOTO_SANS_JP_BASE64;
      if (!fontBase64) {
        console.warn('[OpinionDocument] Noto Sans JPフォントが読み込まれていません。デフォルトフォントを使用します。');
        doc.setFont('helvetica');
        return;
      }

      doc.addFileToVFS('NotoSansJP-Subset.ttf', fontBase64);
      doc.addFont('NotoSansJP-Subset.ttf', 'NotoSansJP', 'normal', 'Identity-H');
      doc.setFont('NotoSansJP');

      console.log('[OpinionDocument] Noto Sans JPフォント読み込み成功');
    } catch (e) {
      console.error('[OpinionDocument] フォント設定エラー:', e);
      doc.setFont('helvetica');
    }
  }

  function drawCheckbox(doc, x, y, checked = false) {
    doc.setFontSize(10);
    doc.text(checked ? '☑' : '□', x, y);
  }

  function drawLine(doc, x1, y1, x2, y2) {
    doc.setLineWidth(0.3);
    doc.line(x1, y1, x2, y2);
  }

  function drawRect(doc, x, y, w, h) {
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
  }

  // ==========================================
  // PDF生成：ページ1
  // ==========================================

  function drawPage1Title(doc, data) {
    doc.setFontSize(14);
    doc.text('主治医意見書', 15, 15);

    doc.setFontSize(10);
    const recordDate = data.recordDate || '令和　年　月　日';
    doc.text(`記入日 ${recordDate}`, 150, 15);
  }

  function drawPage1ApplicantInfo(doc, data) {
    const startY = 20;

    drawRect(doc, 15, startY, 180, 30);
    drawLine(doc, 15, startY + 10, 195, startY + 10);
    drawLine(doc, 15, startY + 20, 195, startY + 20);
    drawLine(doc, 40, startY, 40, startY + 30);
    drawLine(doc, 120, startY, 120, startY + 10);
    drawLine(doc, 160, startY + 10, 160, startY + 20);
    drawLine(doc, 120, startY + 20, 120, startY + 30);

    doc.setFontSize(10);
    doc.text('申請者', 18, startY + 17);

    doc.setFontSize(9);
    doc.text(`（ふりがな）${data.patientNameKana || ''}`, 45, startY + 7);
    doc.text(`〒${data.postalCode || ''}`, 125, startY + 7);
    doc.text(data.patientName || '', 45, startY + 17);
    doc.text(data.sex === 1 ? '男' : data.sex === 2 ? '女' : '', 150, startY + 17);
    doc.text(data.address || '', 165, startY + 17);
    doc.text(`${data.birthDate || ''}生（${data.age || ''}歳）`, 45, startY + 27);
    doc.text(`連絡先 ${data.contactPhone || ''}`, 125, startY + 27);
  }

  function drawPage1DoctorInfo(doc, data) {
    const startY = 52;

    doc.setFontSize(8);
    doc.text('上記の申請者に関する意見は以下のとおりです。', 15, startY);
    doc.text('主治医として、本意見書が介護サービス計画作成等に利用されることに', 15, startY + 4);

    drawCheckbox(doc, 120, startY + 4, data.consentAgree);
    doc.text('同意する', 125, startY + 4);
    drawCheckbox(doc, 145, startY + 4, data.consentDisagree);
    doc.text('同意しない', 150, startY + 4);

    const tableY = startY + 8;
    drawRect(doc, 15, tableY, 180, 20);
    drawLine(doc, 15, tableY + 7, 195, tableY + 7);
    drawLine(doc, 15, tableY + 14, 195, tableY + 14);
    drawLine(doc, 50, tableY, 50, tableY + 20);
    drawLine(doc, 120, tableY + 7, 120, tableY + 14);
    drawLine(doc, 150, tableY + 7, 150, tableY + 20);

    doc.setFontSize(9);
    doc.text('主治医氏名', 17, tableY + 5);
    doc.text(data.doctorName || '', 55, tableY + 5);
    doc.text('医療機関名', 17, tableY + 11);
    doc.text(data.facilityName || '', 55, tableY + 11);
    doc.text('電話', 125, tableY + 11);
    doc.text(data.facilityPhone || '', 155, tableY + 11);
    doc.text('医療機関住所', 17, tableY + 18);
    doc.text(data.facilityAddress || '', 55, tableY + 18);
    doc.text('FAX', 125, tableY + 18);
    doc.text(data.facilityFax || '', 155, tableY + 18);
  }

  function drawPage1ExamInfo(doc, data) {
    const startY = 82;

    drawRect(doc, 15, startY, 180, 20);
    drawLine(doc, 15, startY + 7, 195, startY + 7);
    drawLine(doc, 15, startY + 14, 195, startY + 14);
    drawLine(doc, 50, startY, 50, startY + 20);
    drawLine(doc, 120, startY, 120, startY + 7);
    drawLine(doc, 120, startY + 7, 120, startY + 14);

    doc.setFontSize(9);
    doc.text('(1) 最終診察日', 17, startY + 5);
    doc.text(data.lastExamDate || '令和　年　月　日', 55, startY + 5);

    doc.text('(2) 意見書作成回数', 17, startY + 11);
    drawCheckbox(doc, 55, startY + 11, data.opinionCount === 'first');
    doc.text('初回', 60, startY + 11);
    drawCheckbox(doc, 75, startY + 11, data.opinionCount === 'second');
    doc.text('2回目以降', 80, startY + 11);

    doc.text('(3) 他科受診の有無', 17, startY + 18);
    drawCheckbox(doc, 55, startY + 18, data.otherDepartmentYes);
    doc.text('あり', 60, startY + 18);
    drawCheckbox(doc, 70, startY + 18, data.otherDepartmentNo);
    doc.text('なし', 75, startY + 18);
  }

  function drawPage1Section1(doc, data) {
    const startY = 104;

    doc.setFontSize(10);
    doc.text('１．傷病に関する意見', 15, startY);

    const diagY = startY + 5;
    drawRect(doc, 15, diagY, 180, 30);

    doc.setFontSize(8);
    doc.text('（１）診断名及び発症年月日', 17, diagY + 4);

    drawLine(doc, 15, diagY + 6, 195, diagY + 6);
    drawLine(doc, 15, diagY + 14, 195, diagY + 14);
    drawLine(doc, 15, diagY + 22, 195, diagY + 22);
    drawLine(doc, 25, diagY + 6, 25, diagY + 30);
    drawLine(doc, 140, diagY + 6, 140, diagY + 30);

    doc.setFontSize(9);
    doc.text('１．', 17, diagY + 11);
    doc.text(data.diagnosis1Name || '', 28, diagY + 11);
    doc.text('発症年月日', 143, diagY + 11);
    doc.text(data.diagnosis1OnsetDate || '平成　年　月　日頃', 160, diagY + 11);

    doc.text('２．', 17, diagY + 19);
    doc.text(data.diagnosis2Name || '', 28, diagY + 19);
    doc.text('発症年月日', 143, diagY + 19);
    doc.text(data.diagnosis2OnsetDate || '', 160, diagY + 19);

    doc.text('３．', 17, diagY + 27);
    doc.text(data.diagnosis3Name || '', 28, diagY + 27);
    doc.text('発症年月日', 143, diagY + 27);
    doc.text(data.diagnosis3OnsetDate || '', 160, diagY + 27);

    const stabilityY = diagY + 32;
    drawRect(doc, 15, stabilityY, 180, 7);
    doc.setFontSize(9);
    doc.text('（２）症状としての安定性', 17, stabilityY + 5);
    drawCheckbox(doc, 70, stabilityY + 5, data.stabilityStable);
    doc.text('安定', 75, stabilityY + 5);
    drawCheckbox(doc, 90, stabilityY + 5, data.stabilityUnstable);
    doc.text('不安定', 95, stabilityY + 5);

    const progressY = stabilityY + 9;
    drawRect(doc, 15, progressY, 180, 50);
    doc.setFontSize(8);
    doc.text('（３）経過及び治療内容', 17, progressY + 4);

    if (data.progressAndTreatment) {
      doc.setFontSize(9);
      const progressLines = doc.splitTextToSize(data.progressAndTreatment, 170);
      doc.text(progressLines, 17, progressY + 10);
    }
  }

  function drawPage1Section2(doc, data) {
    const startY = 204;

    doc.setFontSize(10);
    doc.text('2. 特別な医療', 15, startY);

    const boxY = startY + 3;
    drawRect(doc, 15, boxY, 180, 18);
    drawLine(doc, 15, boxY + 6, 195, boxY + 6);
    drawLine(doc, 15, boxY + 12, 195, boxY + 12);
    drawLine(doc, 35, boxY, 35, boxY + 18);

    doc.setFontSize(8);
    doc.text('処置内容', 17, boxY + 4);
  }

  function drawPage1Section3(doc, data) {
    const startY = 226;

    doc.setFontSize(10);
    doc.text('3. 心身の状態に関する意見', 15, startY);

    const adlY = startY + 4;
    drawRect(doc, 15, adlY, 180, 14);

    doc.setFontSize(9);
    doc.text('(1) 日常生活の自立度', 17, adlY + 4);
    drawLine(doc, 15, adlY + 5, 195, adlY + 5);
  }

  // ==========================================
  // PDF生成：ページ2
  // ==========================================

  function drawPage2Section5(doc, data) {
    const startY = 15;

    doc.setFontSize(10);
    doc.text('５．特記すべき事項', 15, startY);

    const textY = startY + 10;
    drawRect(doc, 15, textY, 180, 120);

    if (data.specialNotes) {
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(data.specialNotes, 170);
      doc.text(noteLines, 17, textY + 5);
    }
  }

  // ==========================================
  // PDF生成：メイン関数
  // ==========================================

  function generateOpinionPDF(data) {
    // jsPDFライブラリの取得（unsafeWindow経由）
    const jsPDF = pageWindow.jspdf?.jsPDF || window.jspdf?.jsPDF;

    if (!jsPDF) {
      throw new Error('jsPDFライブラリが読み込まれていません');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    setupFont(doc);

    // ページ1
    drawPage1Title(doc, data);
    drawPage1ApplicantInfo(doc, data);
    drawPage1DoctorInfo(doc, data);
    drawPage1ExamInfo(doc, data);
    drawPage1Section1(doc, data);
    drawPage1Section2(doc, data);
    drawPage1Section3(doc, data);

    // ページ2
    doc.addPage();
    drawPage2Section5(doc, data);

    return doc;
  }

  async function downloadOpinionPDF(formData) {
    const patientUuid = pageWindow.HenryCore.getPatientUuid();
    if (!patientUuid) {
      alert('患者画面を開いてから実行してください');
      return;
    }

    const patientInfo = await fetchPatientInfo(patientUuid);
    if (!patientInfo) {
      alert('患者情報の取得に失敗しました');
      return;
    }

    const pdfData = {
      recordDate: getTodayString(),
      patientName: patientInfo.name,
      patientAge: patientInfo.age,
      sex: patientInfo.sex,
      birthDate: patientInfo.birthDate,
      diagnosis1Name: formData.diagnosis_name_1 || '',
      diagnosis1OnsetDate: formData.diagnosis_1_onset_date || '',
      progressAndTreatment: formData.progress_and_treatment_details || '',
      specialNotes: formData.other_special_notes || '',
      patientNameKana: '',
      postalCode: '',
      address: '',
      contactPhone: '',
      consentAgree: false,
      doctorName: '',
      facilityName: '',
      facilityAddress: '',
      facilityPhone: '',
      facilityFax: ''
    };

    const doc = generateOpinionPDF(pdfData);
    const fileName = `主治医意見書_${patientInfo.name}_${getTodayString().replace(/-/g, '')}.pdf`;
    doc.save(fileName);

    alert('PDFをダウンロードしました');
  }

  // ==========================================
  // フォーム生成（テスト用）
  // ==========================================

  async function createOpinionForm() {
    const patientUuid = pageWindow.HenryCore.getPatientUuid();
    if (!patientUuid) {
      log?.error('患者が選択されていません');
      alert('患者画面を開いてから実行してください');
      return;
    }

    const patientInfo = await fetchPatientInfo(patientUuid);
    if (!patientInfo) {
      alert('患者情報の取得に失敗しました');
      return;
    }

    // 下書きを読み込む
    const savedDraft = loadDraft(patientUuid);

    const data = savedDraft || {
      patient_uuid: patientUuid,
      date_of_opinion_letter_creation: getTodayString(),
      patient_name: patientInfo.name,
      patient_age: patientInfo.age,
      sex: patientInfo.sex,
      diagnosis_name_1: '',
      diagnosis_code_1: '',
      diagnosis_1_onset_date: '',
      progress_and_treatment_details: '',
      other_special_notes: ''
    };

    const formContainer = document.createElement('div');
    formContainer.style.cssText = 'max-height: 60vh; overflow-y: auto; padding: 16px;';

    const labelStyle = 'display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px; color: #333;';
    const inputStyle = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;';
    const rowStyle = 'margin-bottom: 16px;';

    // 下書き情報を表示
    let draftInfoHTML = '';
    if (savedDraft) {
      draftInfoHTML = `
        <div style="background: #e8f4fd; border-left: 4px solid #2196F3; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
          <div style="font-weight: 500; color: #1976D2; margin-bottom: 4px;">💾 保存済みの下書きを読み込みました</div>
          <div style="font-size: 12px; color: #666;">このまま編集を続けるか、新規作成してください</div>
        </div>
      `;
    }

    formContainer.innerHTML = `
      ${draftInfoHTML}
      <div style="${rowStyle}">
        <label style="${labelStyle}">作成日</label>
        <input type="date" id="opinion-date" value="${data.date_of_opinion_letter_creation}" style="${inputStyle}" readonly />
      </div>

      <div style="${rowStyle}">
        <label style="${labelStyle}">患者名</label>
        <input type="text" id="opinion-patient-name" value="${data.patient_name}" style="${inputStyle}" readonly />
      </div>

      <div style="${rowStyle}">
        <label style="${labelStyle}">年齢</label>
        <input type="number" id="opinion-age" value="${data.patient_age || ''}" style="${inputStyle}" placeholder="例: 75" />
      </div>

      <div style="${rowStyle}">
        <label style="${labelStyle}">性別</label>
        <select id="opinion-sex" style="${inputStyle}">
          <option value="">未選択</option>
          <option value="1" ${data.sex === 1 ? 'selected' : ''}>男性</option>
          <option value="2" ${data.sex === 2 ? 'selected' : ''}>女性</option>
        </select>
      </div>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

      <div style="${rowStyle}">
        <label style="${labelStyle}">診断名1</label>
        <input type="text" id="opinion-diagnosis-name-1" value="${data.diagnosis_name_1}" style="${inputStyle}" placeholder="例: 変形性膝関節症" />
      </div>

      <div style="${rowStyle}">
        <label style="${labelStyle}">診断コード1 (ICD10)</label>
        <input type="text" id="opinion-diagnosis-code-1" value="${data.diagnosis_code_1}" style="${inputStyle}" placeholder="例: M17.9" />
      </div>

      <div style="${rowStyle}">
        <label style="${labelStyle}">発症年月日1</label>
        <input type="date" id="opinion-diagnosis-onset-1" value="${data.diagnosis_1_onset_date}" style="${inputStyle}" />
      </div>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

      <div style="${rowStyle}">
        <label style="${labelStyle}">経過及び治療内容</label>
        <textarea id="opinion-progress" style="${inputStyle}height: 100px; resize: vertical;">${data.progress_and_treatment_details}</textarea>
      </div>

      <div style="${rowStyle}">
        <label style="${labelStyle}">その他特記事項</label>
        <textarea id="opinion-notes" style="${inputStyle}height: 100px; resize: vertical;">${data.other_special_notes}</textarea>
      </div>
    `;

    const modal = pageWindow.HenryCore.ui.showModal({
      title: '📋 主治医意見書',
      content: formContainer,
      actions: [
        {
          label: 'キャンセル',
          variant: 'secondary',
          onClick: () => modal.close()
        },
        {
          label: '💾 一時保存',
          onClick: () => {
            try {
              const formData = collectFormData(data.patient_uuid, data.patient_name, data.date_of_opinion_letter_creation);
              if (saveDraft(data.patient_uuid, formData)) {
                alert('下書きを保存しました（30日間保存されます）');
              } else {
                alert('保存に失敗しました');
              }
            } catch (e) {
              log?.error('一時保存失敗', e.message);
              alert(`保存に失敗しました: ${e.message}`);
            }
          }
        },
        {
          label: '📄 PDF作成',
          onClick: async () => {
            try {
              const formData = collectFormData(data.patient_uuid, data.patient_name, data.date_of_opinion_letter_creation);
              await downloadOpinionPDF(formData);
              modal.close();
            } catch (e) {
              log?.error('PDF作成失敗', e.message);
              alert(`PDF作成に失敗しました: ${e.message}`);
            }
          }
        }
      ]
    });
  }

  function collectFormData(patientUuid, patientName, creationDate) {
    const getVal = (id) => document.getElementById(id)?.value || '';
    const getNum = (id) => {
      const val = document.getElementById(id)?.value;
      return val ? parseInt(val, 10) : null;
    };

    return {
      patient_uuid: patientUuid,
      date_of_opinion_letter_creation: creationDate,
      patient_name: patientName,
      patient_age: getNum('opinion-age'),
      sex: getNum('opinion-sex'),
      diagnosis_name_1: getVal('opinion-diagnosis-name-1'),
      diagnosis_code_1: getVal('opinion-diagnosis-code-1'),
      diagnosis_1_onset_date: getVal('opinion-diagnosis-onset-1'),
      progress_and_treatment_details: getVal('opinion-progress'),
      other_special_notes: getVal('opinion-notes')
    };
  }

  // ==========================================
  // 初期化
  // ==========================================

  async function init() {
    const ready = await waitForHenryCore();
    if (!ready) return;

    log = pageWindow.HenryCore.utils.createLogger('OpinionDocument');

    // 起動時に古い下書きをクリーンアップ（30日以上前のものを削除）
    cleanupOldDrafts();

    const registered = await pageWindow.HenryCore.registerPlugin({
      label: '📋 主治医意見書',
      event: 'henry:opinion-document-pdf',
      order: 30
    });

    if (!registered) {
      log.error('プラグイン登録失敗');
      return;
    }

    window.addEventListener('henry:opinion-document-pdf', () => {
      createOpinionForm();
    });

    log.info('Ready (v2.1.0 - with localStorage)');
  }

  init();
})();
