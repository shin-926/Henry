function doPost(e) {
  // ==========================================
  // 設定 (環境に合わせて変更してください)
  // ==========================================
  const SECRET_KEY = "maoka-henry-gas-2024";
  const FOLDER_ID = "1NAoLtEfppzC2BnXtk8Dk5O5nehgVzcYl"; // 保存先フォルダID

  try {
    // 1. POSTデータの検証
    if (!e || !e.postData) {
      return outputJSON({status: "error", message: "No post data"});
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return outputJSON({status: "error", message: "Invalid JSON"});
    }
    
    // 共通認証チェック
    if (data.secretKey !== SECRET_KEY) {
      return outputJSON({status: "error", message: "Unauthorized: Invalid Key"});
    }

    // ==========================================
    // アクション分岐
    // ==========================================
    if (data.action === 'export') {
      // Henryへ戻す (Google -> Henry)
      return handleExport(data);
    } else if (data.action === 'updateContext') {
      // コンテキスト更新（fileUuidなど）
      return handleUpdateContext(data);
    } else {
      // Henryから取り込む (Henry -> Google)
      // デフォルト動作
      return handleImport(data, FOLDER_ID);
    }

  } catch (err) {
    return outputJSON({status: "error", message: err.toString()});
  }
}

// ======================================================================
// 処理1: インポート (Henry -> Google Drive)
// ======================================================================
function handleImport(data, folderId) {
  const fileUrl = data.fileUrl;
  const authToken = data.token;
  const cookie = data.cookie;
  const customFilename = data.fileName;
  
  // メタデータ類
  const patientId = data.patientId;
  const fileUuid = data.fileUuid;
  const folderUuid = data.folderUuid;

  if (!fileUrl) {
    return outputJSON({status: "error", message: "No URL provided"});
  }

  // 1. ファイルのダウンロード (Henryから取得)
  const options = { headers: {} };
  if (authToken) options.headers['Authorization'] = authToken;
  if (cookie) options.headers['Cookie'] = cookie;
  
  const response = UrlFetchApp.fetch(fileUrl, { ...options, muteHttpExceptions: true });
  
  if (response.getResponseCode() !== 200) {
      return outputJSON({status: "error", message: "Download Failed: HTTP " + response.getResponseCode()});
  }

  const blob = response.getBlob();
  const mimeType = blob.getContentType();

  // 認証エラーなどでHTMLが返ってきている場合のガード
  if (mimeType.includes("text/html") || mimeType.includes("application/json")) {
      return outputJSON({status: "error", message: "Auth Failed: Content is not a file."});
  }

  // 2. ファイル名の決定
  let filename = customFilename || blob.getName();
  if (!filename || filename.includes("download") || filename.includes("patient_file") || filename.match(/^[0-9a-f-]{36}\./i)) {
      filename = customFilename || "Henry_Doc_" + Utilities.formatDate(new Date(), "JST", "yyyyMMdd_HHmm");
  }

  // 3. 保存・変換用のメタデータ作成
  let metadata = {
    name: filename,
    parents: [folderId],
    properties: {
      source: "Henry",
      patientId: patientId || "",
      fileUuid: fileUuid || "",
      folderUuid: folderUuid || "",
      uploadedAt: new Date().toISOString()
    }
  };

  // 4. ファイル形式の判定 (変換するかどうか)
  let isDocs = false;
  let isSheets = false;
  const lowerName = filename.toLowerCase();

  // Word -> Google Docs
  if (mimeType.includes("word") || lowerName.endsWith(".docx")) {
    metadata.mimeType = MimeType.GOOGLE_DOCS;
    metadata.name = filename.replace(/\.docx$/i, "");
    isDocs = true;
  } 
  // Excel -> Google Sheets
  else if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || lowerName.endsWith(".xlsx")) {
    metadata.mimeType = MimeType.GOOGLE_SHEETS;
    metadata.name = filename.replace(/\.xlsx$/i, "");
    isSheets = true;
  } 
  // その他 (PDF等) -> そのまま保存
  else if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    metadata.name = filename;
  }

  // 5. Googleドライブに保存
  const file = Drive.Files.create(metadata, blob, {fields: "id,webViewLink"});
  
  // 6. 開くURLの決定
  let finalUrl = file.webViewLink;
  if (!finalUrl) {
    if (isDocs) finalUrl = `https://docs.google.com/document/d/${file.id}/edit`;
    else if (isSheets) finalUrl = `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
    else finalUrl = `https://drive.google.com/file/d/${file.id}/view`;
  }

  // Word/Excelの場合のみURLを返し、それ以外は null を返す
  const responseOpenUrl = (isDocs || isSheets) ? finalUrl : null;

  return outputJSON({
    status: "success",
    name: metadata.name,
    openUrl: responseOpenUrl
  });
}

// ======================================================================
// 処理2: エクスポート (Google Drive -> Henry)
// ======================================================================
function handleExport(data) {
  const docId = data.docId;
  const format = data.format; // 'docx' or 'xlsx'

  if (!docId) {
    return outputJSON({status: "error", message: "No docId provided"});
  }

  // 1. メタデータの取得 (Drive API v3)
  let driveFile;
  try {
    driveFile = Drive.Files.get(docId, { fields: "name,properties" });
  } catch (e) {
    return outputJSON({status: "error", message: "File not found or permission denied"});
  }

  const props = driveFile.properties || {};
  const patientId = props.patientId || "";
  const fileUuid = props.fileUuid || "";
  const folderUuid = props.folderUuid || "";
  
  // 2. エクスポートURLの構築とBlob取得
  let exportUrl = "";
  if (format === 'xlsx') {
    exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;
  } else {
    exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;
  }

  const token = ScriptApp.getOAuthToken();
  const blob = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': 'Bearer ' + token }
  }).getBlob();

  // 3. Base64エンコード
  const base64 = Utilities.base64Encode(blob.getBytes());

  return outputJSON({
    status: "success",
    fileName: driveFile.name,
    base64: base64,
    mimeType: blob.getContentType(),
    patientId: patientId,
    fileUuid: fileUuid,
    folderUuid: folderUuid
  });
}

// ======================================================================
// 処理3: コンテキスト更新 (fileUuidなどを更新)
// ======================================================================
function handleUpdateContext(data) {
  const docId = data.docId;
  const updates = data.updates || {};

  if (!docId) {
    return outputJSON({status: "error", message: "No docId provided"});
  }

  try {
    // 現在のプロパティを取得
    const driveFile = Drive.Files.get(docId, { fields: "properties" });
    const currentProps = driveFile.properties || {};

    // 更新するプロパティをマージ
    const newProps = { ...currentProps, ...updates };

    // プロパティを更新
    Drive.Files.update({ properties: newProps }, docId);

    return outputJSON({
      status: "success",
      message: "Context updated",
      properties: newProps
    });
  } catch (e) {
    return outputJSON({status: "error", message: e.toString()});
  }
}

// ======================================================================
// ユーティリティ
// ======================================================================
function outputJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
