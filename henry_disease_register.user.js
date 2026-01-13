// ==UserScript==
// @name         Henry Disease Register
// @namespace    https://henry-app.jp/
// @version      2.1.0
// @description  高速病名検索・登録
// @author       Claude
// @match        https://henry-app.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=henry-app.jp
// @grant        none
// @require      https://raw.githubusercontent.com/shin-926/Henry/main/henry_disease_data.js
// @updateURL    https://raw.githubusercontent.com/shin-926/Henry/main/henry_disease_register.user.js
// @downloadURL  https://raw.githubusercontent.com/shin-926/Henry/main/henry_disease_register.user.js
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_NAME = 'DiseaseRegister';
  const STORAGE_KEY_DISEASE = 'henry_disease_freq';
  const STORAGE_KEY_MODIFIER = 'henry_modifier_freq';

  // ============================================
  // 病名データ（病名マスター 27648件）
  // ============================================
  const DISEASES = window.HENRY_DISEASES;

  // ============================================
  // 修飾語データ（2387件）
  // ============================================
  const MODIFIERS = window.HENRY_MODIFIERS;

  // ============================================
  // 転帰オプション
  // ============================================
  const OUTCOMES = [
    { value: '', label: '（なし）' },
    { value: 'CURED', label: '治癒' },
    { value: 'DECEASED', label: '死亡' },
    { value: 'CANCELLED', label: '中止' },
    { value: 'MOVED', label: '転医' }
  ];

  // ============================================
  // 自然言語入力用の修飾語インデックス（事前構築済み）
  // ============================================
  // 接頭語: 「・」で始まらない修飾語（長い順にソート済み）
  // 接尾語: 「・」で始まる修飾語 + 「の」で始まる修飾語（長い順にソート済み）
  // データ構造: [code, name, searchName]
  const PREFIX_MODIFIERS = window.HENRY_PREFIX_MODIFIERS;
  const SUFFIX_MODIFIERS = window.HENRY_SUFFIX_MODIFIERS;

  // ============================================
  // ユーティリティ
  // ============================================

  // 頻度データの読み込み
  function loadFrequency(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  }

  // 頻度データの保存
  function saveFrequency(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // 頻度をインクリメント
  function incrementFrequency(key, code) {
    const freq = loadFrequency(key);
    freq[code] = (freq[code] || 0) + 1;
    saveFrequency(key, freq);
  }

  // 頻度でソート（高い順）
  function sortByFrequency(items, key, codeIndex = 0) {
    const freq = loadFrequency(key);
    return [...items].sort((a, b) => {
      const freqA = freq[a[codeIndex]] || 0;
      const freqB = freq[b[codeIndex]] || 0;
      return freqB - freqA;
    });
  }

  // デバウンス関数
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // 正規化: 半角→全角、カタカナ統一など
  function normalizeText(text) {
    return text
      // 半角英数→全角英数
      .replace(/[A-Za-z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0))
      // 半角カタカナ→全角カタカナ
      .replace(/[\uFF66-\uFF9F]/g, s => {
        const kanaMap = 'ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン゛゜';
        const idx = s.charCodeAt(0) - 0xFF66;
        return kanaMap[idx] || s;
      });
  }

  // 検索用インデックス（起動時に小文字化済み文字列を追加）
  // データ構造: DISEASES=[code, icd10, name, kana], MODIFIERS=[code, name, kana]
  let diseaseNameIndex = null;
  let diseaseKanaIndex = null;
  let modifierNameIndex = null;
  let modifierKanaIndex = null;

  function buildSearchIndex() {
    diseaseNameIndex = DISEASES.map(d => d[2].toLowerCase());
    diseaseKanaIndex = DISEASES.map(d => (d[3] || '').toLowerCase());
    modifierNameIndex = MODIFIERS.map(m => m[1].toLowerCase());
    modifierKanaIndex = MODIFIERS.map(m => (m[2] || '').toLowerCase());
  }

  // 病名検索（インデックス使用、名前＋ひらがな両方で検索）
  function searchDiseases(query) {
    if (!query) return DISEASES.slice(0, 50);
    const q = query.toLowerCase();
    const results = [];
    for (let i = 0; i < diseaseNameIndex.length && results.length < 50; i++) {
      if (diseaseNameIndex[i].includes(q) || diseaseKanaIndex[i].includes(q)) {
        results.push(DISEASES[i]);
      }
    }
    return results;
  }

  // 修飾語検索（インデックス使用、名前＋ひらがな両方で検索）
  function searchModifiers(query) {
    if (!query) return MODIFIERS.slice(0, 50);
    const q = query.toLowerCase();
    const results = [];
    for (let i = 0; i < modifierNameIndex.length && results.length < 50; i++) {
      if (modifierNameIndex[i].includes(q) || modifierKanaIndex[i].includes(q)) {
        results.push(MODIFIERS[i]);
      }
    }
    return results;
  }

  // ============================================
  // 自然言語パーサー
  // ============================================

  // AND検索: スペース区切りで複数キーワードを含む病名を検索
  function searchByAndKeywords(input) {
    // スペース（全角・半角）で分割
    const keywords = input.split(/[\s　]+/).filter(k => k.length > 0);
    if (keywords.length < 2) return null; // 1キーワードなら通常検索へ

    const normalizedKeywords = keywords.map(k => normalizeText(k).toLowerCase());
    const candidates = [];

    for (let i = 0; i < diseaseNameIndex.length; i++) {
      const name = normalizeText(diseaseNameIndex[i]).toLowerCase();
      const kana = normalizeText(diseaseKanaIndex[i]).toLowerCase();

      // すべてのキーワードが含まれているかチェック
      const allMatch = normalizedKeywords.every(kw =>
        name.includes(kw) || kana.includes(kw)
      );

      if (allMatch) {
        const icd10 = DISEASES[i][1];
        const icd10Bonus = getIcd10Bonus(icd10);
        // スコア: キーワードカバー率 + ICD10ボーナス
        const totalKeywordLen = normalizedKeywords.reduce((sum, kw) => sum + kw.length, 0);
        const coverage = totalKeywordLen / name.length;
        const score = Math.min(coverage, 1.0) + icd10Bonus;

        candidates.push({
          disease: { code: DISEASES[i][0], icd10: icd10, name: DISEASES[i][2] },
          prefixes: [],
          suffixes: [],
          score: score,
          displayName: DISEASES[i][2]
        });
      }
    }

    // スコア順にソートして上位5件
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  }

  // 自然言語入力をパースして候補を生成
  function parseNaturalInput(input) {
    if (!input || input.trim().length === 0) return [];
    if (!PREFIX_MODIFIERS || !SUFFIX_MODIFIERS) return [];

    // スペースが含まれている場合はAND検索モード
    if (/[\s　]/.test(input.trim())) {
      const andResults = searchByAndKeywords(input);
      if (andResults && andResults.length > 0) {
        return andResults;
      }
    }

    // 入力を正規化（半角→全角など）
    const normalized = normalizeText(input.trim());

    // 再帰的に接頭語を抽出する関数
    function extractPrefixes(str, prefixes, depth) {
      if (depth > 5) return [{ remaining: str, prefixes }]; // 無限ループ防止

      const results = [];

      // この位置でマッチする接頭語候補を全て取得
      for (const mod of PREFIX_MODIFIERS) {
        if (str.startsWith(mod[2])) {
          const newPrefixes = [...prefixes, { code: mod[0], name: mod[1], len: mod[2].length }];
          const newRemaining = str.slice(mod[2].length);
          // さらに接頭語を探す
          results.push(...extractPrefixes(newRemaining, newPrefixes, depth + 1));
        }
      }

      // 接頭語なしのパターンも追加
      results.push({ remaining: str, prefixes });

      return results;
    }

    // 全ての接頭語パターンを取得
    const prefixPatterns = extractPrefixes(normalized, [], 0);

    // 各パターンで病名を検索し、結果を収集
    const allResults = [];

    for (const pattern of prefixPatterns) {
      let remaining = pattern.remaining;
      const foundPrefixes = pattern.prefixes.map(p => ({ code: p.code, name: p.name }));

      // 接尾語を抽出（最長一致）
      const foundSuffixes = [];
      for (const mod of SUFFIX_MODIFIERS) {
        if (remaining.endsWith(mod[2])) {
          foundSuffixes.push({ code: mod[0], name: mod[1] });
          remaining = remaining.slice(0, -mod[2].length);
          break;
        }
      }

      // 残りの部分で病名を検索
      const diseases = findDiseaseByLongestMatch(remaining);

      // 病名が見つかれば結果に追加
      if (diseases.length > 0) {
        for (const disease of diseases) {
          allResults.push({
            disease: disease,
            prefixes: foundPrefixes,
            suffixes: foundSuffixes,
            score: disease.score || 0,
            modifierCount: foundPrefixes.length + foundSuffixes.length,
            diseaseNameLen: disease.name.length
          });
        }
      }
    }

    // ソート優先順位:
    // 1. スコア（高い順）
    // 2. 修飾語数（少ない順 = シンプルな解釈を優先）
    // 3. 病名の長さ（長い順 = より具体的な病名を優先）
    allResults.sort((a, b) => {
      // スコアが大きく違う場合はスコア優先
      if (Math.abs(b.score - a.score) > 0.1) return b.score - a.score;
      // スコアが近い場合は修飾語数が少ない方を優先
      if (a.modifierCount !== b.modifierCount) return a.modifierCount - b.modifierCount;
      // 修飾語数も同じなら病名が長い方を優先
      return b.diseaseNameLen - a.diseaseNameLen;
    });

    // 重複を除去して上位5件を返す
    const seen = new Set();
    const candidates = [];
    for (const r of allResults) {
      const key = r.disease.code + '|' + r.prefixes.map(p => p.code).join(',') + '|' + r.suffixes.map(s => s.code).join(',');
      if (!seen.has(key) && candidates.length < 5) {
        seen.add(key);
        candidates.push({
          disease: r.disease,
          prefixes: r.prefixes,
          suffixes: r.suffixes,
          displayName: buildDisplayName(r.disease.name, r.prefixes, r.suffixes)
        });
      }
    }

    return candidates;
  }

  // 編集距離（Levenshtein距離）計算
  // 早期打ち切り付き（閾値を超えたら計算中止）
  function levenshteinDistance(s1, s2, maxDist = Infinity) {
    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    // 長さの差が閾値を超えていたら早期リターン
    if (Math.abs(s1.length - s2.length) > maxDist) return maxDist + 1;

    // 短い方をs1にする（メモリ効率）
    if (s1.length > s2.length) [s1, s2] = [s2, s1];

    const len1 = s1.length;
    const len2 = s2.length;

    // 1行分だけ保持（メモリ効率）
    let prevRow = Array.from({ length: len1 + 1 }, (_, i) => i);
    let currRow = new Array(len1 + 1);

    for (let j = 1; j <= len2; j++) {
      currRow[0] = j;
      let minInRow = j;

      for (let i = 1; i <= len1; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        currRow[i] = Math.min(
          prevRow[i] + 1,      // 削除
          currRow[i - 1] + 1,  // 挿入
          prevRow[i - 1] + cost // 置換
        );
        minInRow = Math.min(minInRow, currRow[i]);
      }

      // この行の最小値が閾値を超えていたら打ち切り
      if (minInRow > maxDist) return maxDist + 1;

      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[len1];
  }

  // 病名検索スコア計算
  // 共通部分の割合と長さの近さでスコアリング
  function calculateDiseaseScore(query, diseaseName) {
    // 完全一致は最高スコア（ICD10ボーナスを加算しても逆転しない値）
    if (query === diseaseName) {
      return 10.0;
    }

    // 共通の先頭部分の長さを計算
    let commonPrefix = 0;
    const minLen = Math.min(query.length, diseaseName.length);
    while (commonPrefix < minLen && query[commonPrefix] === diseaseName[commonPrefix]) {
      commonPrefix++;
    }

    // マッチしない場合は0
    if (commonPrefix === 0) return 0;

    // 共通部分の割合（病名長に対するカバー率）
    const coverage = commonPrefix / diseaseName.length;

    // 長さの近さ（1に近いほど良い）
    const lengthRatio = Math.min(query.length, diseaseName.length) /
                        Math.max(query.length, diseaseName.length);

    // スコア = カバー率60% + 長さの近さ40%
    return coverage * 0.6 + lengthRatio * 0.4;
  }

  // ファジースコア計算（編集距離ベース）
  function calculateFuzzyScore(query, diseaseName) {
    const maxLen = Math.max(query.length, diseaseName.length);
    if (maxLen === 0) return 0;

    // 編集距離の閾値（文字列長の30%まで許容）
    const maxDist = Math.ceil(maxLen * 0.3);
    const dist = levenshteinDistance(query, diseaseName, maxDist);

    // 閾値を超えたらスコア0
    if (dist > maxDist) return 0;

    // 類似度 = 1 - (距離 / 最大長)
    return 1 - (dist / maxLen);
  }

  // ICD10コードによる優先度ボーナス
  // S=損傷（最優先）、M=筋骨格系（次点）
  function getIcd10Bonus(icd10) {
    if (!icd10) return 0;
    const firstChar = icd10.charAt(0).toUpperCase();
    if (firstChar === 'S') return 0.3;  // 損傷・外傷
    if (firstChar === 'M') return 0.2;  // 筋骨格系
    return 0;
  }

  // 病名検索（スコアリング方式 + ファジー検索）
  function findDiseaseByLongestMatch(query) {
    if (!query || query.length === 0) return [];

    // クエリを正規化して小文字化
    const q = normalizeText(query).toLowerCase();
    const candidates = [];

    // フェーズ1: 先頭一致検索（高速）
    for (let i = 0; i < diseaseNameIndex.length; i++) {
      const name = normalizeText(diseaseNameIndex[i]).toLowerCase();
      const kana = normalizeText(diseaseKanaIndex[i]).toLowerCase();

      // 名前でスコア計算
      const nameScore = calculateDiseaseScore(q, name);
      const kanaScore = calculateDiseaseScore(q, kana);
      const baseScore = Math.max(nameScore, kanaScore);

      // ICD10ボーナスを加算
      const icd10 = DISEASES[i][1];
      const icd10Bonus = getIcd10Bonus(icd10);
      const score = baseScore + icd10Bonus;

      if (baseScore >= 0.3 || (name.startsWith(q.slice(0, 3)) && q.length >= 3)) {
        candidates.push({
          code: DISEASES[i][0],
          icd10: icd10,
          name: DISEASES[i][2],
          normalizedName: name,
          score: score,
          matchType: 'prefix'
        });
      }
    }

    // フェーズ2: ファジー検索（先頭一致で十分な結果がない場合）
    // 先頭3文字が一致する病名のみを対象（最適化）
    if (candidates.length < 3 && q.length >= 3) {
      const prefix3 = q.slice(0, 3);

      for (let i = 0; i < diseaseNameIndex.length; i++) {
        const name = normalizeText(diseaseNameIndex[i]).toLowerCase();

        // 先頭3文字一致 + まだ候補にない
        if (name.slice(0, 3) === prefix3 && !candidates.some(c => c.code === DISEASES[i][0])) {
          const fuzzyScore = calculateFuzzyScore(q, name);

          if (fuzzyScore > 0.7) {  // 70%以上の類似度
            const icd10 = DISEASES[i][1];
            const icd10Bonus = getIcd10Bonus(icd10);

            candidates.push({
              code: DISEASES[i][0],
              icd10: icd10,
              name: DISEASES[i][2],
              normalizedName: name,
              score: fuzzyScore * 0.9 + icd10Bonus,  // ファジーは少し減点
              matchType: 'fuzzy'
            });
          }
        }
      }
    }

    // スコアでソート（高い順）
    candidates.sort((a, b) => b.score - a.score);

    // 重複除去して上位5件（スコアも返す）
    const seen = new Set();
    const results = [];
    for (const c of candidates) {
      if (!seen.has(c.code) && results.length < 5) {
        seen.add(c.code);
        results.push({ code: c.code, icd10: c.icd10, name: c.name, score: c.score });
      }
    }

    return results;
  }

  // 表示用の病名を組み立て
  function buildDisplayName(diseaseName, prefixes, suffixes) {
    const prefixStr = prefixes.map(p => p.name).join('');
    const suffixStr = suffixes.map(s => s.name).join('');
    return prefixStr + diseaseName + suffixStr;
  }

  // 今日の日付
  function getToday() {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  // ============================================
  // スタイル
  // ============================================
  const STYLES = `
    .dr-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .dr-modal {
      background: white;
      border-radius: 8px;
      width: 600px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .dr-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      font-weight: bold;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dr-close {
      cursor: pointer;
      font-size: 20px;
      color: #666;
    }
    .dr-close:hover {
      color: #333;
    }
    .dr-body {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }
    .dr-section {
      margin-bottom: 16px;
    }
    .dr-section-title {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 13px;
      color: #333;
    }
    .dr-search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .dr-search-input:focus {
      outline: none;
      border-color: #4a90d9;
    }
    .dr-list {
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      margin-top: 4px;
    }
    .dr-list-item {
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .dr-list-item:last-child {
      border-bottom: none;
    }
    .dr-list-item:hover {
      background: #f5f5f5;
    }
    .dr-list-item.selected {
      background: #e3f2fd;
    }
    .dr-selected-disease {
      padding: 10px 12px;
      background: #e8f5e9;
      border-radius: 4px;
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dr-selected-disease-name {
      font-weight: bold;
    }
    .dr-clear-btn {
      color: #d32f2f;
      cursor: pointer;
      font-size: 12px;
    }
    .dr-modifier-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      min-height: 32px;
      padding: 8px;
      background: #fafafa;
      border-radius: 4px;
    }
    .dr-modifier-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #e3f2fd;
      border-radius: 4px;
      font-size: 12px;
    }
    .dr-modifier-tag-remove {
      cursor: pointer;
      color: #666;
      font-weight: bold;
    }
    .dr-modifier-tag-remove:hover {
      color: #d32f2f;
    }
    .dr-preview {
      padding: 12px;
      background: #fff3e0;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 14px;
    }
    .dr-preview-label {
      font-size: 11px;
      color: #666;
      margin-bottom: 4px;
    }
    .dr-preview-name {
      font-weight: bold;
      font-size: 15px;
    }
    .dr-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .dr-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dr-option label {
      font-size: 13px;
    }
    .dr-date-inputs {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .dr-date-input {
      width: 60px;
      padding: 4px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
      text-align: center;
    }
    .dr-select {
      padding: 4px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
    }
    .dr-footer {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .dr-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }
    .dr-btn-primary {
      background: #4a90d9;
      color: white;
    }
    .dr-btn-primary:hover {
      background: #3a7bc8;
    }
    .dr-btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .dr-btn-secondary {
      background: #e0e0e0;
      color: #333;
    }
    .dr-btn-secondary:hover {
      background: #d0d0d0;
    }
    .dr-empty {
      padding: 16px;
      text-align: center;
      color: #888;
      font-size: 13px;
    }
    .dr-natural-input {
      padding: 10px 12px;
      border: 2px solid #4a90d9;
      border-radius: 6px;
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
    }
    .dr-natural-input:focus {
      outline: none;
      border-color: #2e6bb0;
    }
    .dr-natural-hint {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
    .dr-candidates {
      margin-top: 8px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }
    .dr-candidate-item {
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
    }
    .dr-candidate-item:last-child {
      border-bottom: none;
    }
    .dr-candidate-item:hover {
      background: #e3f2fd;
    }
    .dr-candidate-name {
      font-weight: bold;
      font-size: 14px;
    }
    .dr-candidate-detail {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    .dr-candidate-tags {
      display: flex;
      gap: 4px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .dr-candidate-tag {
      font-size: 10px;
      padding: 2px 6px;
      background: #e8f5e9;
      border-radius: 3px;
      color: #2e7d32;
    }
    .dr-candidate-tag.suffix {
      background: #fff3e0;
      color: #e65100;
    }
    .dr-divider {
      display: flex;
      align-items: center;
      margin: 16px 0;
      color: #888;
      font-size: 12px;
    }
    .dr-divider::before,
    .dr-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e0e0e0;
    }
    .dr-divider::before {
      margin-right: 8px;
    }
    .dr-divider::after {
      margin-left: 8px;
    }
  `;

  // ============================================
  // メインUI
  // ============================================
  class DiseaseRegisterModal {
    constructor(patientUuid) {
      this.patientUuid = patientUuid;
      this.selectedDisease = null;
      this.selectedModifiers = [];
      this.overlay = null;

      this.render();
    }

    render() {
      // スタイル追加
      if (!document.getElementById('dr-styles')) {
        const style = document.createElement('style');
        style.id = 'dr-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
      }

      // オーバーレイ作成
      this.overlay = document.createElement('div');
      this.overlay.className = 'dr-modal-overlay';
      this.overlay.innerHTML = this.getModalHTML();
      document.body.appendChild(this.overlay);

      // イベント設定
      this.setupEvents();

      // 初期表示
      this.updateDiseaseList('');
      this.updateModifierList('');
    }

    getModalHTML() {
      const today = getToday();
      return `
        <div class="dr-modal">
          <div class="dr-header">
            <span>病名登録</span>
            <span class="dr-close">&times;</span>
          </div>
          <div class="dr-body">
            <!-- 自然言語入力 -->
            <div class="dr-section">
              <div class="dr-section-title">自然言語入力</div>
              <input type="text" class="dr-natural-input" id="dr-natural-input" placeholder="例: 右橈骨遠位端骨折術後">
              <div class="dr-natural-hint">修飾語（左/右/急性/術後など）を含めて入力すると自動分解します</div>
              <div class="dr-candidates" id="dr-candidates" style="display:none;"></div>
            </div>

            <div class="dr-divider">または従来の検索</div>

            <!-- 病名検索 -->
            <div class="dr-section">
              <div class="dr-section-title">病名検索</div>
              <input type="text" class="dr-search-input" id="dr-disease-search" placeholder="病名を入力...">
              <div class="dr-list" id="dr-disease-list"></div>
              <div class="dr-selected-disease" id="dr-selected-disease" style="display:none;">
                <span class="dr-selected-disease-name" id="dr-selected-disease-name"></span>
                <span class="dr-clear-btn" id="dr-clear-disease">クリア</span>
              </div>
            </div>

            <!-- 修飾語選択 -->
            <div class="dr-section">
              <div class="dr-section-title">修飾語（選択順に適用）</div>
              <input type="text" class="dr-search-input" id="dr-modifier-search" placeholder="修飾語を検索...">
              <div class="dr-list" id="dr-modifier-list"></div>
              <div class="dr-modifier-tags" id="dr-modifier-tags">
                <span style="color:#888;font-size:12px;">選択した修飾語がここに表示されます</span>
              </div>
            </div>

            <!-- プレビュー -->
            <div class="dr-section">
              <div class="dr-preview" id="dr-preview" style="display:none;">
                <div class="dr-preview-label">登録される病名</div>
                <div class="dr-preview-name" id="dr-preview-name"></div>
              </div>
            </div>

            <!-- オプション -->
            <div class="dr-section">
              <div class="dr-section-title">オプション</div>
              <div class="dr-options">
                <div class="dr-option">
                  <input type="checkbox" id="dr-is-main">
                  <label for="dr-is-main">主病名</label>
                </div>
                <div class="dr-option">
                  <input type="checkbox" id="dr-is-suspected">
                  <label for="dr-is-suspected">疑い</label>
                </div>
                <div class="dr-option">
                  <label>開始日:</label>
                  <div class="dr-date-inputs">
                    <input type="text" class="dr-date-input" id="dr-start-year" value="${today.year}" maxlength="4">
                    <span>/</span>
                    <input type="text" class="dr-date-input" id="dr-start-month" value="${today.month}" maxlength="2">
                    <span>/</span>
                    <input type="text" class="dr-date-input" id="dr-start-day" value="${today.day}" maxlength="2">
                  </div>
                </div>
                <div class="dr-option">
                  <label>転帰:</label>
                  <select class="dr-select" id="dr-outcome">
                    ${OUTCOMES.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="dr-footer">
            <button class="dr-btn dr-btn-secondary" id="dr-cancel">キャンセル</button>
            <button class="dr-btn dr-btn-primary" id="dr-register" disabled>登録</button>
          </div>
        </div>
      `;
    }

    setupEvents() {
      // 閉じるボタン
      this.overlay.querySelector('.dr-close').onclick = () => this.close();
      this.overlay.querySelector('#dr-cancel').onclick = () => this.close();

      // オーバーレイクリックで閉じる
      this.overlay.onclick = (e) => {
        if (e.target === this.overlay) this.close();
      };

      // 自然言語入力
      const naturalInput = this.overlay.querySelector('#dr-natural-input');
      naturalInput.oninput = debounce(() => this.updateCandidates(naturalInput.value), 200);

      // 病名検索
      const diseaseSearch = this.overlay.querySelector('#dr-disease-search');
      diseaseSearch.oninput = debounce(() => this.updateDiseaseList(diseaseSearch.value), 150);

      // 病名クリア
      this.overlay.querySelector('#dr-clear-disease').onclick = () => {
        this.selectedDisease = null;
        this.overlay.querySelector('#dr-selected-disease').style.display = 'none';
        this.overlay.querySelector('#dr-disease-search').value = '';
        this.updateDiseaseList('');
        this.updatePreview();
        this.updateRegisterButton();
      };

      // 修飾語検索
      const modifierSearch = this.overlay.querySelector('#dr-modifier-search');
      modifierSearch.oninput = debounce(() => this.updateModifierList(modifierSearch.value), 150);

      // 登録ボタン
      this.overlay.querySelector('#dr-register').onclick = () => this.register();
    }

    updateDiseaseList(query) {
      const list = this.overlay.querySelector('#dr-disease-list');
      let items = searchDiseases(query);

      if (!query) {
        items = sortByFrequency(items, STORAGE_KEY_DISEASE, 0);
      }

      if (items.length === 0) {
        list.innerHTML = '<div class="dr-empty">該当する病名がありません</div>';
        return;
      }

      list.innerHTML = items.map(d => `
        <div class="dr-list-item" data-code="${d[0]}" data-name="${d[2]}">
          ${d[2]} <span style="color:#888;font-size:11px;">(${d[1]})</span>
        </div>
      `).join('');

      // クリックイベント
      list.querySelectorAll('.dr-list-item').forEach(item => {
        item.onclick = () => {
          this.selectedDisease = {
            code: item.dataset.code,
            name: item.dataset.name
          };
          this.overlay.querySelector('#dr-selected-disease').style.display = 'flex';
          this.overlay.querySelector('#dr-selected-disease-name').textContent = this.selectedDisease.name;
          this.updatePreview();
          this.updateRegisterButton();
        };
      });
    }

    updateModifierList(query) {
      const list = this.overlay.querySelector('#dr-modifier-list');
      let items = searchModifiers(query);

      if (!query) {
        items = sortByFrequency(items, STORAGE_KEY_MODIFIER, 0);
      }

      // 既に選択済みのものを除外
      const selectedCodes = this.selectedModifiers.map(m => m.code);
      items = items.filter(m => !selectedCodes.includes(m[0]));

      if (items.length === 0) {
        list.innerHTML = '<div class="dr-empty">該当する修飾語がありません</div>';
        return;
      }

      list.innerHTML = items.map(m => `
        <div class="dr-list-item" data-code="${m[0]}" data-name="${m[1]}">
          ${m[1]}
        </div>
      `).join('');

      // クリックイベント
      list.querySelectorAll('.dr-list-item').forEach(item => {
        item.onclick = () => {
          this.selectedModifiers.push({
            code: item.dataset.code,
            name: item.dataset.name
          });
          this.updateModifierTags();
          this.updateModifierList(this.overlay.querySelector('#dr-modifier-search').value);
          this.updatePreview();
        };
      });
    }

    updateModifierTags() {
      const container = this.overlay.querySelector('#dr-modifier-tags');

      if (this.selectedModifiers.length === 0) {
        container.innerHTML = '<span style="color:#888;font-size:12px;">選択した修飾語がここに表示されます</span>';
        return;
      }

      container.innerHTML = this.selectedModifiers.map((m, i) => `
        <span class="dr-modifier-tag">
          <span>${m.name}</span>
          <span class="dr-modifier-tag-remove" data-index="${i}">&times;</span>
        </span>
      `).join('');

      // 削除イベント
      container.querySelectorAll('.dr-modifier-tag-remove').forEach(btn => {
        btn.onclick = () => {
          const index = parseInt(btn.dataset.index);
          this.selectedModifiers.splice(index, 1);
          this.updateModifierTags();
          this.updateModifierList(this.overlay.querySelector('#dr-modifier-search').value);
          this.updatePreview();
        };
      });
    }

    // 自然言語入力の候補を更新
    updateCandidates(input) {
      const container = this.overlay.querySelector('#dr-candidates');

      if (!input || input.trim().length === 0) {
        container.style.display = 'none';
        return;
      }

      const candidates = parseNaturalInput(input);

      if (candidates.length === 0) {
        container.style.display = 'block';
        container.innerHTML = '<div class="dr-empty">候補が見つかりません</div>';
        return;
      }

      container.style.display = 'block';
      container.innerHTML = candidates.map((c, i) => {
        const prefixTags = c.prefixes.map(p => `<span class="dr-candidate-tag">${p.name}</span>`).join('');
        const suffixTags = c.suffixes.map(s => `<span class="dr-candidate-tag suffix">${s.name}</span>`).join('');
        const allTags = prefixTags + suffixTags;

        return `
          <div class="dr-candidate-item" data-index="${i}">
            <div class="dr-candidate-name">${c.displayName}</div>
            <div class="dr-candidate-detail">${c.disease.name} (${c.disease.icd10 || '-'})</div>
            ${allTags ? `<div class="dr-candidate-tags">${allTags}</div>` : ''}
          </div>
        `;
      }).join('');

      // クリックイベント
      container.querySelectorAll('.dr-candidate-item').forEach(item => {
        item.onclick = () => {
          const index = parseInt(item.dataset.index);
          this.selectCandidate(candidates[index]);
        };
      });
    }

    // 候補を選択して既存の状態に反映
    selectCandidate(candidate) {
      // 病名を設定
      this.selectedDisease = {
        code: candidate.disease.code,
        name: candidate.disease.name
      };
      this.overlay.querySelector('#dr-selected-disease').style.display = 'flex';
      this.overlay.querySelector('#dr-selected-disease-name').textContent = this.selectedDisease.name;

      // 修飾語を設定（接頭語 + 接尾語）
      this.selectedModifiers = [...candidate.prefixes, ...candidate.suffixes];
      this.updateModifierTags();
      this.updateModifierList(this.overlay.querySelector('#dr-modifier-search').value);

      // 自然言語入力をクリア
      this.overlay.querySelector('#dr-natural-input').value = '';
      this.overlay.querySelector('#dr-candidates').style.display = 'none';

      // プレビューと登録ボタンを更新
      this.updatePreview();
      this.updateRegisterButton();
    }

    updatePreview() {
      const preview = this.overlay.querySelector('#dr-preview');
      const previewName = this.overlay.querySelector('#dr-preview-name');

      if (!this.selectedDisease) {
        preview.style.display = 'none';
        return;
      }

      // 接頭語・接尾語を分類（8xxxは接尾語の可能性が高い）
      const prefixes = [];
      const suffixes = [];

      this.selectedModifiers.forEach(m => {
        if (m.name.startsWith('の') || m.name.startsWith('・') || m.code.startsWith('8')) {
          suffixes.push(m.name);
        } else {
          prefixes.push(m.name);
        }
      });

      const name = prefixes.join('') + this.selectedDisease.name + suffixes.join('');

      preview.style.display = 'block';
      previewName.textContent = name;
    }

    updateRegisterButton() {
      const btn = this.overlay.querySelector('#dr-register');
      btn.disabled = !this.selectedDisease;
    }

    async register() {
      if (!this.selectedDisease) return;

      const startYear = parseInt(this.overlay.querySelector('#dr-start-year').value);
      const startMonth = parseInt(this.overlay.querySelector('#dr-start-month').value);
      const startDay = parseInt(this.overlay.querySelector('#dr-start-day').value);
      const isMain = this.overlay.querySelector('#dr-is-main').checked;
      const isSuspected = this.overlay.querySelector('#dr-is-suspected').checked;
      const outcomeValue = this.overlay.querySelector('#dr-outcome').value;

      // 修飾語コードを配列形式に
      const modifierCodes = this.selectedModifiers.map(m => `"${m.code}"`).join(', ');

      // endDateの構築
      const endDateStr = outcomeValue && outcomeValue !== 'CONTINUED'
        ? `{ year: ${startYear}, month: ${startMonth}, day: ${startDay} }`
        : 'null';

      // outcomeは必須、未選択の場合は CONTINUED
      const outcome = outcomeValue || 'CONTINUED';

      // インライン形式でmutationを構築（変数型を使わない）
      const MUTATION = `
        mutation {
          updateMultiPatientReceiptDiseases(input: {
            records: [{
              recordOperation: RECORD_OPERATION_CREATE,
              patientReceiptDisease: {
                patientUuid: "${this.patientUuid}",
                uuid: "",
                masterDiseaseCode: "${this.selectedDisease.code}",
                isMain: ${isMain},
                isSuspected: ${isSuspected},
                excludeReceipt: false,
                masterModifierCodes: [${modifierCodes}],
                startDate: { year: ${startYear}, month: ${startMonth}, day: ${startDay} },
                outcome: ${outcome},
                endDate: ${endDateStr},
                customDiseaseName: null,
                intractableDiseaseType: NOT_APPLICABLE,
                patientCareType: PATIENT_CARE_TYPE_ANY
              }
            }]
          }) {
            patientReceiptDiseases {
              uuid
            }
          }
        }
      `;

      const btn = this.overlay.querySelector('#dr-register');
      btn.disabled = true;
      btn.textContent = '登録中...';

      try {
        const result = await HenryCore.query(MUTATION);

        if (result.data?.updateMultiPatientReceiptDiseases) {
          // 頻度を更新
          incrementFrequency(STORAGE_KEY_DISEASE, this.selectedDisease.code);
          this.selectedModifiers.forEach(m => {
            incrementFrequency(STORAGE_KEY_MODIFIER, m.code);
          });

          console.log(`[${SCRIPT_NAME}] 病名登録完了`);
          this.close();

          // 画面更新（Apollo Client refetch）
          if (window.__APOLLO_CLIENT__) {
            window.__APOLLO_CLIENT__.refetchQueries({ include: 'active' });
          }
        } else {
          throw new Error('登録に失敗しました');
        }
      } catch (e) {
        console.error(`[${SCRIPT_NAME}]`, e);
        alert('登録に失敗しました: ' + e.message);
        btn.disabled = false;
        btn.textContent = '登録';
      }
    }

    close() {
      this.overlay.remove();
    }
  }

  // ============================================
  // 初期化
  // ============================================
  async function init() {
    let waited = 0;
    while (!window.HenryCore) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      if (waited > 10000) {
        console.error(`[${SCRIPT_NAME}] HenryCore が見つかりません`);
        return;
      }
    }

    // 検索用インデックスを構築
    buildSearchIndex();

    await HenryCore.registerPlugin({
      id: 'disease-register',
      name: '病名登録',
      icon: '🏥',
      description: '高速病名検索・登録',
      version: '2.1.0',
      order: 150,
      onClick: () => {
        const patientUuid = HenryCore.getPatientUuid();
        if (!patientUuid) {
          HenryCore.ui.showModal({
            title: 'エラー',
            content: '患者ページで実行してください。',
            width: 300
          });
          return;
        }
        new DiseaseRegisterModal(patientUuid);
      }
    });

    console.log(`[${SCRIPT_NAME}] 初期化完了`);
  }

  init();
})();
