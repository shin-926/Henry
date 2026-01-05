// ==UserScript==
// @name         Henry 主治医意見書作成支援
// @namespace    https://henry-app.jp/
// @version      1.0.0
// @description  主治医意見書の作成・一時保存・再編集機能
// @match        https://henry-app.jp/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_shujii_ikensho.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_shujii_ikensho.user.js
// ==/UserScript==

(async function() {
  'use strict';

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  let log = null;
  let cachedFiles = [];
  let currentFolderUuid = null;
  const inflight = new Map();

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

    // 年齢計算（参考スクリプトと同じロジック）
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

    // 性別変換
    const sexType = patient.detail?.sexType;
    let sex = null;
    if (sexType === 'SEX_TYPE_MALE') sex = 1;
    else if (sexType === 'SEX_TYPE_FEMALE') sex = 2;

    return {
      name: patient.fullName || '',
      age: age,
      sex: sex
    };
  } catch (e) {
    log?.error('患者情報取得失敗', e.message);
    return null;
  }
}

  // ==========================================
  // フォーム生成
  // ==========================================

  async function createOpinionForm(initialData = null) {
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

    // 初期値
    const data = initialData || {
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

    // フォームコンテナ
    const formContainer = document.createElement('div');
    formContainer.style.cssText = 'max-height: 60vh; overflow-y: auto; padding: 16px;';

    // スタイル
    const labelStyle = 'display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px; color: #333;';
    const inputStyle = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;';
    const rowStyle = 'margin-bottom: 16px;';

    // 基本情報
    formContainer.innerHTML = `
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

    // モーダル表示
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
          label: '一時保存',
          onClick: async () => {
            try {
              const formData = collectFormData(data.patient_uuid, data.patient_name, data.date_of_opinion_letter_creation);
              await saveToXlsx(formData);
              modal.close();
              alert('一時保存しました');
            } catch (e) {
              log?.error('保存失敗', e.message);
              alert(`保存に失敗しました: ${e.message}`);
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
  // xlsx生成・アップロード
  // ==========================================

  async function saveToXlsx(data) {
    const patientName = data.patient_name || '患者';
    const dateStr = data.date_of_opinion_letter_creation.replace(/-/g, '');
    const fileName = `主治医意見書_${patientName}_${dateStr}.xlsx`;

    // xlsx生成
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[JSON.stringify(data)]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Blob化
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // アップロード
    await uploadToHenry(blob, fileName, data.patient_uuid);
  }

  async function uploadToHenry(blob, fileName, patientUuid) {
    // 1. 署名付きURL取得
    const urlResult = await pageWindow.HenryCore.call('GetFileUploadUrl', {
      input: { pathType: 'PATIENT_FILE' }
    });

    const uploadUrl = urlResult.data?.getFileUploadUrl?.uploadUrl;
    const fileUrl = urlResult.data?.getFileUploadUrl?.fileUrl;

    if (!uploadUrl || !fileUrl) {
      throw new Error('アップロードURL取得失敗');
    }

    // 2. GCSアップロード
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('GCSアップロード失敗');
    }

    // 3. メタデータ登録
    await pageWindow.HenryCore.call('CreatePatientFile', {
      input: {
        patientUuid,
        parentFileFolderUuid: null,
        fileUrl,
        title: fileName,
        description: ''
      }
    });

    // 4. UI更新
    if (pageWindow.__APOLLO_CLIENT__) {
      pageWindow.__APOLLO_CLIENT__.refetchQueries({
        include: ['ListPatientFiles']
      });
    }

    log?.info('一時保存完了:', fileName);
  }

  // ==========================================
  // ダブルクリックハンドラ
  // ==========================================

  function setupFetchIntercept() {
    if (pageWindow._opinionDocumentHooked) return;
    const originalFetch = pageWindow.fetch;
    pageWindow._opinionDocumentHooked = true;

    pageWindow.fetch = async function(url, options) {
      const response = await originalFetch.apply(this, arguments);

      if (!url.includes('/graphql') || !options?.body) return response;

      try {
        const bodyStr = typeof options.body === 'string' ? options.body : null;
        if (!bodyStr) return response;

        let requestJson;
        try { requestJson = JSON.parse(bodyStr); } catch (e) { return response; }

        if (requestJson.operationName !== 'ListPatientFiles') return response;

        const requestFolderUuid = requestJson.variables?.input?.parentFileFolderUuid ?? null;
        const pageToken = requestJson.variables?.input?.pageToken ?? '';
        const clone = response.clone();
        const json = await clone.json();
        const patientFiles = json.data?.listPatientFiles?.patientFiles;

        if (!Array.isArray(patientFiles)) return response;

        if (requestFolderUuid !== currentFolderUuid || pageToken === '') {
          cachedFiles = patientFiles;
          currentFolderUuid = requestFolderUuid;
        } else {
          cachedFiles = [...cachedFiles, ...patientFiles];
        }
      } catch (e) {
        log?.error('Fetch Hook Error:', e.message);
      }

      return response;
    };
  }

  function getFileFromCache(row) {
    if (!cachedFiles.length) return null;
    const parent = row.parentElement;
    if (!parent) return null;
    const rows = Array.from(parent.querySelectorAll(':scope > li'));
    const idx = rows.indexOf(row);
    return (idx !== -1 && idx < cachedFiles.length) ? cachedFiles[idx] : null;
  }

  async function handleDoubleClick(event) {
    if (event.target.closest('input, textarea, button, a')) {
      return;
    }

    const row = event.target.closest('li[role="button"][aria-roledescription="draggable"]');
    if (!row) return;

    const fileData = getFileFromCache(row);
    if (!fileData || !fileData.file) return;

    const file = fileData.file;

    // 判定
    if (file.fileType !== 'FILE_TYPE_XLSX') return;
    if (!file.title || !file.title.startsWith('主治医意見書')) return;

    const fileUrl = file.redirectUrl;
    if (!fileUrl) return;

    const patientFileUuid = fileData.uuid;
    if (inflight.has(patientFileUuid)) return;

    try {
      await pageWindow.HenryCore.utils.withLock(inflight, patientFileUuid, async () => {
        log?.info('意見書を開いています:', file.title);

        // ダウンロード→解析
        const data = await downloadAndParseXlsx(fileUrl);

        // モーダル再表示
        await createOpinionForm(data);
      });
    } catch (e) {
      log?.error('ファイル読み込み失敗', e.message);
      alert(`ファイルの読み込みに失敗しました: ${e.message}`);
    }
  }

  async function downloadAndParseXlsx(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('ファイルダウンロード失敗');
    }

    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    if (!wb.SheetNames.length) {
      throw new Error('シートが見つかりません');
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonString = ws.A1?.v;

    if (!jsonString) {
      throw new Error('データが見つかりません');
    }

    return JSON.parse(jsonString);
  }

  // ==========================================
  // 初期化
  // ==========================================

  async function init() {
    const ready = await waitForHenryCore();
    if (!ready) return;

    log = pageWindow.HenryCore.utils.createLogger('OpinionDocument');

    // プラグイン登録
    const registered = await pageWindow.HenryCore.registerPlugin({
      label: '📋 主治医意見書',
      event: 'henry:opinion-document-create',
      order: 30
    });

    if (!registered) {
      log.error('プラグイン登録失敗');
      return;
    }

    // Fetch intercept
    setupFetchIntercept();

    // イベントハンドラ
    window.addEventListener('henry:opinion-document-create', () => {
      createOpinionForm();
    });

    // ダブルクリック監視
    const cleaner = pageWindow.HenryCore.utils.createCleaner();
    pageWindow.HenryCore.utils.subscribeNavigation(cleaner, () => {
      cachedFiles = [];
      currentFolderUuid = null;

      const handler = (e) => handleDoubleClick(e);
      document.addEventListener('dblclick', handler, true);
      cleaner.add(() => document.removeEventListener('dblclick', handler, true));

      log.info('Ready (v1.0.0)');
    });
  }

  init();
})();