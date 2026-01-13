#!/usr/bin/env node
/**
 * 病名・修飾語データ生成スクリプト
 *
 * 病名マスター.txt と 修飾語マスター.txt から henry_disease_data.js を生成
 * カタカナ読みをひらがなに変換して検索用に追加
 *
 * Usage: node scripts/generate_disease_data.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DISEASE_MASTER = path.join(ROOT_DIR, '病名マスター.txt');
const MODIFIER_MASTER = path.join(ROOT_DIR, '修飾語マスター.txt');
const OUTPUT_FILE = path.join(ROOT_DIR, 'henry_disease_data.js');

// カタカナ → ひらがな 変換
function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, match => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

// CSV行をパース（ダブルクォート対応）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

// 病名マスター読み込み
function loadDiseases() {
  console.log('病名マスターを読み込み中...');
  const content = fs.readFileSync(DISEASE_MASTER, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const diseases = [];
  for (const line of lines) {
    const fields = parseCSVLine(line);

    // フィールド: 3=コード, 6=病名, 10=カタカナ読み, 13=ICD10
    const code = fields[2];
    const name = fields[5];
    const katakanReading = fields[9];
    const icd10 = fields[12] || '';

    if (code && name) {
      const hiragana = katakanaToHiragana(katakanReading || '');
      diseases.push([code, icd10, name, hiragana]);
    }
  }

  console.log(`  ${diseases.length} 件の病名を読み込み`);
  return diseases;
}

// 修飾語マスター読み込み（接頭語・接尾語に分類）
function loadModifiers() {
  console.log('修飾語マスターを読み込み中...');
  const content = fs.readFileSync(MODIFIER_MASTER, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const all = [];
  const prefixes = [];
  const suffixes = [];

  for (const line of lines) {
    const fields = parseCSVLine(line);

    // フィールド: 3=コード, 7=名前, 10=カタカナ読み
    const code = fields[2];
    const name = fields[6];
    const katakanaReading = fields[9];

    if (code && name) {
      const hiragana = katakanaToHiragana(katakanaReading || '');
      all.push([code, name, hiragana]);

      // 接頭語/接尾語の分類
      if (name.startsWith('・')) {
        // 「・」で始まる → 接尾語（「・」なし版も追加）
        suffixes.push([code, name, name]);
        suffixes.push([code, name, name.slice(1)]);
      } else if (name.startsWith('の')) {
        // 「の」で始まる → 接尾語
        suffixes.push([code, name, name]);
      } else {
        // それ以外 → 接頭語
        prefixes.push([code, name, name]);
      }
    }
  }

  // 長い順にソート（最長一致のため）
  prefixes.sort((a, b) => b[2].length - a[2].length);
  suffixes.sort((a, b) => b[2].length - a[2].length);

  console.log(`  ${all.length} 件の修飾語を読み込み`);
  console.log(`  → 接頭語: ${prefixes.length} 件, 接尾語: ${suffixes.length} 件`);

  return { all, prefixes, suffixes };
}

// データ出力
function writeOutput(diseases, modifiers) {
  console.log('henry_disease_data.js を生成中...');

  const output = `// Henry Disease Data
// 自動生成: ${new Date().toISOString()}
// 病名マスター: ${diseases.length} 件
// 修飾語マスター: ${modifiers.all.length} 件
//   - 接頭語: ${modifiers.prefixes.length} 件
//   - 接尾語: ${modifiers.suffixes.length} 件
//
// データ構造:
//   HENRY_DISEASES: [code, icd10, name, kana]
//   HENRY_MODIFIERS: [code, name, kana]
//   HENRY_PREFIX_MODIFIERS: [code, name, searchName] (長い順)
//   HENRY_SUFFIX_MODIFIERS: [code, name, searchName] (長い順)

window.HENRY_DISEASES = ${JSON.stringify(diseases)};

window.HENRY_MODIFIERS = ${JSON.stringify(modifiers.all)};

window.HENRY_PREFIX_MODIFIERS = ${JSON.stringify(modifiers.prefixes)};

window.HENRY_SUFFIX_MODIFIERS = ${JSON.stringify(modifiers.suffixes)};
`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`  出力完了: ${(stats.size / 1024).toFixed(1)} KB`);
}

// メイン処理
function main() {
  console.log('=== 病名・修飾語データ生成 ===\n');

  // ファイル存在確認
  if (!fs.existsSync(DISEASE_MASTER)) {
    console.error(`エラー: ${DISEASE_MASTER} が見つかりません`);
    process.exit(1);
  }
  if (!fs.existsSync(MODIFIER_MASTER)) {
    console.error(`エラー: ${MODIFIER_MASTER} が見つかりません`);
    process.exit(1);
  }

  const diseases = loadDiseases();
  const modifiers = loadModifiers();

  writeOutput(diseases, modifiers);

  console.log('\n完了!');
}

main();
