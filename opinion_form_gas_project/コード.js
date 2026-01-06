/**
 * 主治医意見書 Google Apps Script
 * テンプレートからドキュメントを生成し、プレースホルダーを置換する
 *
 * デプロイ手順:
 * 1. https://script.google.com/ で新規プロジェクトを作成
 * 2. このコードを貼り付け
 * 3. デプロイ > 新しいデプロイ > ウェブアプリ
 * 4. 実行ユーザー: 自分、アクセス: 全員
 * 5. デプロイURLをユーザースクリプトに設定
 */

// 設定
const CONFIG = {
  TEMPLATE_ID: '1z1kJZ9wVUDotM1kPmvA5-S2mlq4CmfShnB9CzbfWtwU',
  OUTPUT_FOLDER_ID: '' // 空の場合はマイドライブ直下
};

// プレースホルダーマッピング（ハードコード）
const PLACEHOLDER_MAPPINGS = [
  // 基本情報
  { placeholder: '{{記入日}}', jsonKey: 'basic_info.date_of_writing', inputType: '自動入力' },
  { placeholder: '{{患者名かな}}', jsonKey: 'basic_info.patient_name_kana', inputType: '自動入力' },
  { placeholder: '{{患者名}}', jsonKey: 'basic_info.patient_name', inputType: '自動入力' },
  { placeholder: '{{生年月日}}', jsonKey: 'basic_info.birth_date', inputType: '自動入力' },
  { placeholder: '{{年齢}}', jsonKey: 'basic_info.age', inputType: '自動入力' },
  { placeholder: '{{性別}}', jsonKey: 'basic_info.sex', inputType: '自動入力' },
  { placeholder: '{{郵便番号}}', jsonKey: 'basic_info.postal_code', inputType: '自動入力' },
  { placeholder: '{{住所}}', jsonKey: 'basic_info.address', inputType: '自動入力' },
  { placeholder: '{{連絡先電話番号}}', jsonKey: 'basic_info.phone', inputType: '自動入力' },
  { placeholder: '{{医師氏名}}', jsonKey: 'basic_info.physician_name', inputType: '自動入力' },
  { placeholder: '{{医療機関名}}', jsonKey: 'basic_info.institution_name', inputType: '自動入力' },
  { placeholder: '{{医療機関郵便番号}}', jsonKey: 'basic_info.institution_postal_code', inputType: '自動入力' },
  { placeholder: '{{医療機関所在地}}', jsonKey: 'basic_info.institution_address', inputType: '自動入力' },
  { placeholder: '{{医療機関電話番号}}', jsonKey: 'basic_info.institution_phone', inputType: '自動入力' },
  { placeholder: '{{医療機関FAX番号}}', jsonKey: 'basic_info.institution_fax', inputType: '自動入力' },
  { placeholder: '{{同意の有無}}', jsonKey: 'basic_info.consent', inputType: 'ラジオボタン' },
  { placeholder: '{{最終診察日}}', jsonKey: 'basic_info.last_examination_date', inputType: 'カレンダー' },
  { placeholder: '{{意見書作成回数}}', jsonKey: 'basic_info.opinion_count', inputType: 'ラジオボタン' },
  { placeholder: '{{他科受診有無}}', jsonKey: 'basic_info.other_department_visit', inputType: 'ラジオボタン' },

  // 診断
  { placeholder: '{{他科名}}', jsonKey: 'diagnosis.other_departments', inputType: 'チェックボックス' },
  { placeholder: '{{その他の他科名}}', jsonKey: 'diagnosis.other_department_names', inputType: '記述' },
  { placeholder: '{{診断名1}}', jsonKey: 'diagnosis.diagnosis_1_name', inputType: '記述' },
  { placeholder: '{{発症年月日1}}', jsonKey: 'diagnosis.diagnosis_1_onset', inputType: '記述' },
  { placeholder: '{{診断名2}}', jsonKey: 'diagnosis.diagnosis_2_name', inputType: '記述' },
  { placeholder: '{{発症年月日2}}', jsonKey: 'diagnosis.diagnosis_2_onset', inputType: '記述' },
  { placeholder: '{{診断名3}}', jsonKey: 'diagnosis.diagnosis_3_name', inputType: '記述' },
  { placeholder: '{{発症年月日3}}', jsonKey: 'diagnosis.diagnosis_3_onset', inputType: '記述' },
  { placeholder: '{{症状安定性}}', jsonKey: 'diagnosis.symptom_stability', inputType: 'ラジオボタン' },
  { placeholder: '{{症状不安定時の具体的状況}}', jsonKey: 'diagnosis.symptom_unstable_details', inputType: '記述' },
  { placeholder: '{{経過及び治療内容}}', jsonKey: 'diagnosis.course_and_treatment', inputType: '記述' },

  // 特別な医療
  { placeholder: '{{処置内容}}', jsonKey: 'special_medical_care.treatments', inputType: 'チェックボックス' },
  { placeholder: '{{特別な対応}}', jsonKey: 'special_medical_care.special_responses', inputType: 'チェックボックス' },
  { placeholder: '{{失禁への対応}}', jsonKey: 'special_medical_care.incontinence_care', inputType: 'チェックボックス' },

  // 心身の状態
  { placeholder: '{{寝たきり度}}', jsonKey: 'mental_physical_state.bedridden_level', inputType: 'ラジオボタン' },
  { placeholder: '{{認知症高齢者の日常生活自立度}}', jsonKey: 'mental_physical_state.dementia_level', inputType: 'ラジオボタン' },
  { placeholder: '{{短期記憶}}', jsonKey: 'mental_physical_state.short_term_memory', inputType: 'ラジオボタン' },
  { placeholder: '{{認知能力}}', jsonKey: 'mental_physical_state.cognitive_ability', inputType: 'ラジオボタン' },
  { placeholder: '{{伝達能力}}', jsonKey: 'mental_physical_state.communication_ability', inputType: 'ラジオボタン' },
  { placeholder: '{{周辺症状有無}}', jsonKey: 'mental_physical_state.peripheral_symptoms', inputType: 'ラジオボタン' },
  { placeholder: '{{周辺症状詳細}}', jsonKey: 'mental_physical_state.peripheral_symptoms_details', inputType: 'チェックボックス' },
  { placeholder: '{{その他の周辺症状}}', jsonKey: 'mental_physical_state.other_peripheral_symptoms', inputType: '記述' },
  { placeholder: '{{精神神経症状有無}}', jsonKey: 'mental_physical_state.psychiatric_symptoms', inputType: 'ラジオボタン' },
  { placeholder: '{{精神神経症状名}}', jsonKey: 'mental_physical_state.psychiatric_symptom_name', inputType: '記述' },
  { placeholder: '{{専門医受診有無}}', jsonKey: 'mental_physical_state.specialist_visit', inputType: 'ラジオボタン' },
  { placeholder: '{{専門医受診科名}}', jsonKey: 'mental_physical_state.specialist_department', inputType: '記述' },
  { placeholder: '{{利き腕}}', jsonKey: 'mental_physical_state.dominant_hand', inputType: 'ラジオボタン' },
  { placeholder: '{{身長}}', jsonKey: 'mental_physical_state.height', inputType: '記述' },
  { placeholder: '{{体重}}', jsonKey: 'mental_physical_state.weight', inputType: '記述' },
  { placeholder: '{{体重の変化}}', jsonKey: 'mental_physical_state.weight_change', inputType: 'ラジオボタン' },
  { placeholder: '{{四肢欠損}}', jsonKey: 'mental_physical_state.limb_loss', inputType: 'チェックボックス' },
  { placeholder: '{{四肢欠損部位}}', jsonKey: 'mental_physical_state.limb_loss_location', inputType: '記述' },
  { placeholder: '{{麻痺}}', jsonKey: 'mental_physical_state.paralysis', inputType: 'チェックボックス' },
  { placeholder: '{{麻痺右上肢}}', jsonKey: 'mental_physical_state.paralysis_right_upper_limb', inputType: 'チェックボックス' },
  { placeholder: '{{麻痺右上肢程度}}', jsonKey: 'mental_physical_state.paralysis_right_upper_limb_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{麻痺左上肢}}', jsonKey: 'mental_physical_state.paralysis_left_upper_limb', inputType: 'チェックボックス' },
  { placeholder: '{{麻痺左上肢程度}}', jsonKey: 'mental_physical_state.paralysis_left_lower_limb_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{麻痺右下肢}}', jsonKey: 'mental_physical_state.paralysis_right_lower_limb', inputType: 'チェックボックス' },
  { placeholder: '{{麻痺右下肢程度}}', jsonKey: 'mental_physical_state.paralysis_right_lower_limb_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{麻痺左下肢}}', jsonKey: 'mental_physical_state.paralysis_left_lower_limb', inputType: 'チェックボックス' },
  { placeholder: '{{麻痺左下肢程度}}', jsonKey: 'mental_physical_state.paralysis_left_lower_limb_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{麻痺その他}}', jsonKey: 'mental_physical_state.paralysis_other', inputType: 'チェックボックス' },
  { placeholder: '{{麻痺その他部位}}', jsonKey: 'mental_physical_state.paralysis_other_location', inputType: '記述' },
  { placeholder: '{{麻痺その他程度}}', jsonKey: 'mental_physical_state.paralysis_other_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{筋力低下}}', jsonKey: 'mental_physical_state.muscle_weakness', inputType: 'チェックボックス' },
  { placeholder: '{{筋力低下部位}}', jsonKey: 'mental_physical_state.muscle_weakness_location', inputType: '記述' },
  { placeholder: '{{筋力低下程度}}', jsonKey: 'mental_physical_state.muscle_weakness_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{関節拘縮}}', jsonKey: 'mental_physical_state.joint_contracture', inputType: 'チェックボックス' },
  { placeholder: '{{関節拘縮部位}}', jsonKey: 'mental_physical_state.joint_contracture_location', inputType: '記述' },
  { placeholder: '{{関節拘縮程度}}', jsonKey: 'mental_physical_state.joint_contracture_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{関節痛み}}', jsonKey: 'mental_physical_state.joint_pain', inputType: 'チェックボックス' },
  { placeholder: '{{関節痛み部位}}', jsonKey: 'mental_physical_state.joint_pain_location', inputType: '記述' },
  { placeholder: '{{関節痛み程度}}', jsonKey: 'mental_physical_state.joint_pain_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{失調不随意運動}}', jsonKey: 'mental_physical_state.ataxia_involuntary_movement', inputType: 'チェックボックス' },
  { placeholder: '{{失調不随意運動上肢}}', jsonKey: 'mental_physical_state.ataxia_upper_limbs', inputType: 'チェックボックス' },
  { placeholder: '{{失調不随意運動下肢}}', jsonKey: 'mental_physical_state.ataxia_lower_limbs', inputType: 'チェックボックス' },
  { placeholder: '{{体幹}}', jsonKey: 'mental_physical_state.trunk', inputType: 'チェックボックス' },
  { placeholder: '{{褥瘡}}', jsonKey: 'mental_physical_state.pressure_ulcer', inputType: 'チェックボックス' },
  { placeholder: '{{褥瘡部位}}', jsonKey: 'mental_physical_state.pressure_ulcer_location', inputType: '記述' },
  { placeholder: '{{褥瘡程度}}', jsonKey: 'mental_physical_state.pressure_ulcer_severity', inputType: 'ラジオボタン' },
  { placeholder: '{{その他皮膚疾患}}', jsonKey: 'mental_physical_state.other_skin_disease', inputType: 'チェックボックス' },
  { placeholder: '{{その他皮膚疾患部位}}', jsonKey: 'mental_physical_state.other_skin_disease_location', inputType: '記述' },
  { placeholder: '{{その他皮膚疾患程度}}', jsonKey: 'mental_physical_state.other_skin_disease_severity', inputType: 'ラジオボタン' },

  // 生活機能
  { placeholder: '{{屋外歩行}}', jsonKey: 'life_function.outdoor_walking', inputType: 'ラジオボタン' },
  { placeholder: '{{車いすの使用}}', jsonKey: 'life_function.wheelchair_use', inputType: 'ラジオボタン' },
  { placeholder: '{{歩行補助具・装具の使用}}', jsonKey: 'life_function.walking_aids', inputType: 'チェックボックス' },
  { placeholder: '{{食事行為}}', jsonKey: 'life_function.eating_behavior', inputType: 'ラジオボタン' },
  { placeholder: '{{現在の栄養状態}}', jsonKey: 'life_function.current_nutrition_status', inputType: 'ラジオボタン' },
  { placeholder: '{{栄養・食生活上の留意点}}', jsonKey: 'life_function.nutrition_diet_notes', inputType: '記述' },
  { placeholder: '{{発生可能性状態}}', jsonKey: 'life_function.possible_conditions', inputType: 'チェックボックス' },
  { placeholder: '{{その他の状態名}}', jsonKey: 'life_function.other_condition_name', inputType: '記述' },
  { placeholder: '{{対処方針内容}}', jsonKey: 'life_function.response_policy', inputType: '記述' },
  { placeholder: '{{生活機能改善見通し}}', jsonKey: 'life_function.life_function_improvement_outlook', inputType: 'ラジオボタン' },
  { placeholder: '{{医学的管理の必要性}}', jsonKey: 'life_function.medical_management_necessity', inputType: 'チェックボックス' },
  { placeholder: '{{その他の医学的管理}}', jsonKey: 'life_function.other_medical_management', inputType: '記述' },
  { placeholder: '{{サービス提供血圧}}', jsonKey: 'life_function.service_blood_pressure', inputType: 'ラジオボタン' },
  { placeholder: '{{サービス提供血圧留意事項}}', jsonKey: 'life_function.service_blood_pressure_notes', inputType: '記述' },
  { placeholder: '{{サービス提供摂食}}', jsonKey: 'life_function.service_eating', inputType: 'ラジオボタン' },
  { placeholder: '{{サービス提供摂食留意事項}}', jsonKey: 'life_function.service_eating_notes', inputType: '記述' },
  { placeholder: '{{サービス提供嚥下}}', jsonKey: 'life_function.service_swallowing', inputType: 'ラジオボタン' },
  { placeholder: '{{サービス提供嚥下留意事項}}', jsonKey: 'life_function.service_swallowing_notes', inputType: '記述' },
  { placeholder: '{{サービス提供移動}}', jsonKey: 'life_function.service_mobility', inputType: 'ラジオボタン' },
  { placeholder: '{{サービス提供移動留意事項}}', jsonKey: 'life_function.service_mobility_notes', inputType: '記述' },
  { placeholder: '{{サービス提供運動}}', jsonKey: 'life_function.service_exercise', inputType: 'ラジオボタン' },
  { placeholder: '{{サービス提供運動留意事項}}', jsonKey: 'life_function.service_exercise_notes', inputType: '記述' },
  { placeholder: '{{サービス提供その他の留意事項}}', jsonKey: 'life_function.service_other_notes', inputType: '記述' },
  { placeholder: '{{感染症有無}}', jsonKey: 'life_function.infection', inputType: 'ラジオボタン' },
  { placeholder: '{{感染症名}}', jsonKey: 'life_function.infection_name', inputType: '記述' },

  // 特記事項
  { placeholder: '{{その他特記事項}}', jsonKey: 'special_notes.other_notes', inputType: '記述' }
];

/**
 * POSTリクエストを処理
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const formData = params.formData;
    const fileName = params.fileName || '主治医意見書';

    const result = generateDocument(formData, fileName);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GETリクエスト（テスト用）
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: '主治医意見書API is running'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ドキュメント生成メイン処理
 */
function generateDocument(formData, fileName) {
  // 1. テンプレートをコピー
  const template = DriveApp.getFileById(CONFIG.TEMPLATE_ID);
  const folder = CONFIG.OUTPUT_FOLDER_ID
    ? DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID)
    : DriveApp.getRootFolder();

  const newFile = template.makeCopy(fileName, folder);
  const newDoc = DocumentApp.openById(newFile.getId());
  const body = newDoc.getBody();

  // 2. プレースホルダーを置換
  PLACEHOLDER_MAPPINGS.forEach(mapping => {
    const value = getValueByPath(formData, mapping.jsonKey);
    const displayText = convertToDisplayText(value, mapping.inputType, mapping);
    body.replaceText(escapeRegExp(mapping.placeholder), displayText);
  });

  // 3. 保存して閉じる
  newDoc.saveAndClose();

  return {
    success: true,
    documentId: newFile.getId(),
    documentUrl: newFile.getUrl(),
    fileName: fileName
  };
}

/**
 * ネストされたオブジェクトから値を取得
 */
function getValueByPath(obj, path) {
  if (!path) return '';
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return '';
    current = current[key];
  }
  return current !== null && current !== undefined ? current : '';
}

/**
 * 値を表示用テキストに変換
 */
function convertToDisplayText(value, inputType, mapping) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  switch (inputType) {
    case 'ラジオボタン':
      return convertRadioValue(value, mapping);
    case 'チェックボックス':
      return convertCheckboxValue(value, mapping);
    case 'カレンダー':
      return formatDateValue(value);
    case '自動入力':
      return convertAutoInputValue(value, mapping);
    case '記述':
    default:
      return String(value);
  }
}

/**
 * 自動入力値の変換
 */
function convertAutoInputValue(value, mapping) {
  const placeholder = mapping.placeholder;

  // 性別
  if (placeholder === '{{性別}}') {
    return { '1': '男', '2': '女' }[value] || value;
  }

  // 生年月日・記入日は和暦変換
  if (placeholder === '{{生年月日}}' || placeholder === '{{記入日}}') {
    return formatDateValue(value);
  }

  return String(value);
}

/**
 * ラジオボタンの値を表示テキストに変換
 */
function convertRadioValue(value, mapping) {
  const placeholder = mapping.placeholder;

  const radioMappings = {
    '{{同意の有無}}': { '1': '■同意する □同意しない', '2': '□同意する ■同意しない' },
    '{{意見書作成回数}}': { '1': '■初回 □2回目以上', '2': '□初回 ■2回目以上' },
    '{{他科受診有無}}': { '1': '■有 □無', '2': '□有 ■無' },
    '{{症状安定性}}': { '1': '■安定 □不安定 □不明', '2': '□安定 ■不安定 □不明', '3': '□安定 □不安定 ■不明' },
    '{{寝たきり度}}': {
      '1': '■自立 □J1 □J2 □A1 □A2 □B1 □B2 □C1 □C2',
      '2': '□自立 ■J1 □J2 □A1 □A2 □B1 □B2 □C1 □C2',
      '3': '□自立 □J1 ■J2 □A1 □A2 □B1 □B2 □C1 □C2',
      '4': '□自立 □J1 □J2 ■A1 □A2 □B1 □B2 □C1 □C2',
      '5': '□自立 □J1 □J2 □A1 ■A2 □B1 □B2 □C1 □C2',
      '6': '□自立 □J1 □J2 □A1 □A2 ■B1 □B2 □C1 □C2',
      '7': '□自立 □J1 □J2 □A1 □A2 □B1 ■B2 □C1 □C2',
      '8': '□自立 □J1 □J2 □A1 □A2 □B1 □B2 ■C1 □C2',
      '9': '□自立 □J1 □J2 □A1 □A2 □B1 □B2 □C1 ■C2'
    },
    '{{認知症高齢者の日常生活自立度}}': {
      '1': '■自立 □Ⅰ □Ⅱa □Ⅱb □Ⅲa □Ⅲb □Ⅳ □M',
      '2': '□自立 ■Ⅰ □Ⅱa □Ⅱb □Ⅲa □Ⅲb □Ⅳ □M',
      '3': '□自立 □Ⅰ ■Ⅱa □Ⅱb □Ⅲa □Ⅲb □Ⅳ □M',
      '4': '□自立 □Ⅰ □Ⅱa ■Ⅱb □Ⅲa □Ⅲb □Ⅳ □M',
      '5': '□自立 □Ⅰ □Ⅱa □Ⅱb ■Ⅲa □Ⅲb □Ⅳ □M',
      '6': '□自立 □Ⅰ □Ⅱa □Ⅱb □Ⅲa ■Ⅲb □Ⅳ □M', // Corrected from '□Ⅲb □Ⅳ □M' to '□Ⅲb □Ⅳ □M' to match the pattern
      '7': '□自立 □Ⅰ □Ⅱa □Ⅱb □Ⅲa □Ⅲb ■Ⅳ □M',
      '8': '□自立 □Ⅰ □Ⅱa □Ⅱb □Ⅲa □Ⅲb □Ⅳ ■M'
    },
    '{{短期記憶}}': { '1': '■問題なし □問題あり', '2': '□問題なし ■問題あり' },
    '{{認知能力}}': {
      '1': '■自立 □いくらか困難 □見守りが必要 □判断できない',
      '2': '□自立 ■いくらか困難 □見守りが必要 □判断できない',
      '3': '□自立 □いくらか困難 ■見守りが必要 □判断できない',
      '4': '□自立 □いくらか困難 □見守りが必要 ■判断できない'
    },
    '{{伝達能力}}': {
      '1': '■伝えられる □いくらか困難 □具体的要求に限られる □伝えられない',
      '2': '□伝えられる ■いくらか困難 □具体的要求に限られる □伝えられない',
      '3': '□伝えられる □いくらか困難 ■具体的要求に限られる □伝えられない',
      '4': '□伝えられる □いくらか困難 □具体的要求に限られる ■伝えられない'
    },
    '{{周辺症状有無}}': { '1': '■有 □無', '2': '□有 ■無' },
    '{{精神神経症状有無}}': { '1': '■有 □無', '2': '□有 ■無' },
    '{{専門医受診有無}}': { '1': '■有 □無', '2': '□有 ■無' },
    '{{利き腕}}': { '1': '右', '2': '左' },
    '{{体重の変化}}': { '1': '■増加 □維持 □減少', '2': '□増加 ■維持 □減少', '3': '□増加 □維持 ■減少' },
    '{{屋外歩行}}': {
      '1': '■自立 □介助があればしている □していない',
      '2': '□自立 ■介助があればしている □していない',
      '3': '□自立 □介助があればしている ■していない'
    },
    '{{車いすの使用}}': {
      '1': '■用いていない □主に自分で操作 □主に他人が操作',
      '2': '□用いていない ■主に自分で操作 □主に他人が操作',
      '3': '□用いていない □主に自分で操作 ■主に他人が操作'
    },
    '{{食事行為}}': {
      '1': '■自立ないし何とか自分で食べられる □全面介助',
      '2': '□自立ないし何とか自分で食べられる ■全面介助'
    },
    '{{現在の栄養状態}}': { '1': '■良好 □不良', '2': '□良好 ■不良' },
    '{{生活機能改善見通し}}': {
      '1': '■期待できる □期待できない □不明',
      '2': '□期待できる ■期待できない □不明',
      '3': '□期待できる □期待できない ■不明'
    },
    '{{感染症有無}}': { '1': '■有 □無 □不明', '2': '□有 ■無 □不明', '3': '□有 □無 ■不明' },
    '{{サービス提供血圧}}': { '1': '■特になし □あり', '2': '□特になし ■あり' },
    '{{サービス提供摂食}}': { '1': '■特になし □あり', '2': '□特になし ■あり' },
    '{{サービス提供嚥下}}': { '1': '■特になし □あり', '2': '□特になし ■あり' },
    '{{サービス提供移動}}': { '1': '■特になし □あり', '2': '□特になし ■あり' },
    '{{サービス提供運動}}': { '1': '■特になし □あり', '2': '□特になし ■あり' }
  };

  // 程度（軽/中/重）の共通マッピング
  if (placeholder.includes('程度')) {
    return { '1': '■軽 □中 □重', '2': '□軽 ■中 □重', '3': '□軽 □中 ■重' }[value] || value;
  }

  if (radioMappings[placeholder] && radioMappings[placeholder][value]) {
    return radioMappings[placeholder][value];
  }

  return value;
}

/**
 * チェックボックスの値を表示テキストに変換
 * 元のレイアウト（タブ文字等）を保持しつつ、□/■を置換する
 */
function convertCheckboxValue(value, mapping) {
  const placeholder = mapping.placeholder;

  // CSVの「置き換え後のテキスト」をテンプレートとして保持
  const checkboxTemplates = {
    '{{他科名}}': "□内科\t□精神科\t□外科\t□整形外科\t□脳神経外科\t□皮膚科\t□泌尿器科\n\t□婦人科\t□眼科\t□耳鼻咽喉科\t□リハビリテーション科\t□歯科",
    '{{処置内容}}': "□点滴管理\t□中心静脈栄養\t□透析\t□ストーマの処置\t□酸素療法\n\t\t□レスピレーター\t□気管切開の処置\t□透析の看護\t□経管栄養",
    '{{特別な対応}}': "□モニター測定（血圧、心拍、酸素飽和度等）\t□褥瘡の処置",
    '{{失禁への対応}}': "□カテーテル（コンドームカテーテル、留置カテーテル等）",
    '{{周辺症状詳細}}': "□幻視・幻聴\t□妄想\t□昼夜逆転\t□暴言\t□暴行\t□介護への抵抗\t□徘徊\n\t\t\t□火の不始末\t□不潔行為\t□異食行動\t□性的問題行動",
    '{{発生可能性状態}}': "□尿失禁\t□転倒・骨折\t□移動能力の低下\t□褥瘡\t□心肺機能の低下\t□閉じこもり\t□意欲低下\t□徘徊\n\t□低栄養\t□摂食・嚥下機能低下\t□脱水\t□易感染性\t□がん等による疼痛",
    '{{医学的管理の必要性}}': "□訪問診療\t□訪問看護\t□看護職員の訪問による相談・支援\t□訪問歯科診療\n\t□訪問薬剤管理指導\t□訪問リハビリテーション\t□短期入所療養介護\t□訪問歯科衛生指導\n\t□訪問栄養食事指導\t□通所リハビリテーション",
    '{{歩行補助具・装具の使用}}': "□杖\t□歩行器・歩行車\t□装具",
    '{{失調不随意運動上肢}}': "□右\t□左",
    '{{失調不随意運動下肢}}': "□右\t□左",
    '{{体幹}}': "□右\t□左"
  };

  const template = checkboxTemplates[placeholder];

  // テンプレートが定義されていない単一チェックボックス（あり/なし等）の場合
  if (!template) {
    const singleCheckboxLabels = {
      '{{四肢欠損}}': '四肢欠損',
      '{{麻痺}}': '麻痺',
      '{{筋力低下}}': '筋力の低下',
      '{{関節拘縮}}': '関節の拘縮',
      '{{関節痛み}}': '関節の痛み',
      '{{失調不随意運動}}': '失調・不随意運動',
      '{{褥瘡}}': '褥瘡',
      '{{その他皮膚疾患}}': 'その他の皮膚疾患'
    };
    const label = singleCheckboxLabels[placeholder] || '';
    const mark = value === '1' ? '■' : '□';
    return mark + label;
  }  // テンプレートを'□'で分割し、マークを再挿入して文字列を再構築する
  const parts = template.split('□');
  const optionsCount = parts.length - 1;
  if (optionsCount <= 0) {
    return template; // テンプレートに'□'がなければそのまま返す
  }

  const bitString = String(value).padStart(optionsCount, '0');
  let newString = parts[0];

  for (let i = 0; i < optionsCount; i++) {
    const mark = bitString[i] === '1' ? '■' : '□';
    newString += mark + parts[i + 1];
  }

  return newString;
}

/**
 * 日付値をフォーマット（和暦）
 */
function formatDateValue(value) {
  if (!value) return '';

  // YYYYMMDD形式の場合
  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    return toWareki(`${year}-${month}-${day}`);
  }

  // YYYY-MM-DD形式の場合
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return toWareki(value);
  }

  return value;
}

/**
 * 和暦変換
 */
function toWareki(dateStr) {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let eraName, eraYear;

  if (year >= 2019 && (year > 2019 || month >= 5)) {
    eraName = '令和';
    eraYear = year - 2018;
  } else if (year >= 1989) {
    eraName = '平成';
    eraYear = year - 1988;
  } else if (year >= 1926) {
    eraName = '昭和';
    eraYear = year - 1925;
  } else {
    return dateStr;
  }

  return `${eraName}${eraYear}年${month}月${day}日`;
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\]/g, '\\$&');
}

/**
 * テスト用関数
 */
function testGenerate() {
  const testData = {
    basic_info: {
      date_of_writing: '20260105',
      patient_name_kana: 'やまだ たろう',
      patient_name: '山田 太郎',
      birth_date: '19450315',
      age: '80',
      sex: '1',
      postal_code: '760-0001',
      address: '香川県高松市1-1-1',
      phone: '087-123-4567',
      physician_name: '鈴木 一郎',
      institution_name: 'マオカ病院',
      institution_postal_code: '〒760-0052',
      institution_address: '香川県高松市瓦町１丁目12-45',
      institution_phone: '087-862-8888',
      institution_fax: '087-863-0880',
      consent: '1',
      last_examination_date: '20260103',
      opinion_count: '1',
      other_department_visit: '2'
    },
    diagnosis: {
      diagnosis_1_name: '脳梗塞',
      diagnosis_1_onset: '令和4年3月15日',
      symptom_stability: '1',
      course_and_treatment: '令和4年3月に脳梗塞を発症。'
    },
    mental_physical_state: {
      bedridden_level: '4',
      dementia_level: '3',
      short_term_memory: '2',
      cognitive_ability: '2',
      communication_ability: '2',
      peripheral_symptoms: '2',
      psychiatric_symptoms: '2',
      specialist_visit: '2',
      dominant_hand: '1',
      height: '165',
      weight: '60',
      weight_change: '2'
    },
    life_function: {
      outdoor_walking: '2',
      wheelchair_use: '2',
      eating_behavior: '1',
      current_nutrition_status: '1',
      life_function_improvement_outlook: '1',
      infection: '2'
    },
    special_notes: {
      other_notes: '特になし'
    }
  };

  const result = generateDocument(testData, 'テスト_山田太郎');
  Logger.log(result);
}