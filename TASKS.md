# Henry スクリプト開発 TODO

## 🚨 優先度高：CLAUDE.md ガイドライン違反の修正

### henry_rad_order_printer.user.js

#### ✅ 完了
- [x] **NEVER違反 #1**: ランダムなクラス名 `.sc-3201a50-2` の削除
  - 修正完了：`findPrintDialogButton()` をダイアログ内の全ボタン検索に変更

#### ⏸️ 保留中
- [ ] **NEVER違反 #2**: 自動スクロールの削除または緩和
  - 箇所1: `clickElement()` 内の `scrollIntoView()` (353行目)
  - 箇所2: `searchWithScroll()` メソッド (690-718行目)
  - 検討事項: ユーザーが「作成」クリック後の自動処理なので、許容範囲か要確認

- [ ] **YOU MUST違反 #3**: SPA遷移時のクリーンアップが不完全
  - 現状: `state.pendingKeywords = []` のみクリア
  - 必要: MutationObserver、setTimeout タイマーの破棄
  - 推奨: `HenryCore.utils.createCleaner()` + `subscribeNavigation()` パターンの採用

- [ ] **YOU MUST違反 #4**: エラーログのプレフィックス統一
  - 箇所: 239行目の `console.error` に `[HenryAutoPrint]` プレフィックスがない

- [ ] **仕様変更**: ボタンテキストの更新
  - `CONFIG.submitButtonText: '完了'` → `'作成'` に変更
  - 理由: Henry UI が「完了」ボタンから「作成」ボタンに変更された

---

## 🔬 調査課題：API ベースのアプローチ

### 背景
現在の実装は DOM 解析ベースで、自動スクロールが必要。より堅牢な実装として、GraphQL API 経由でオーダーを取得する方法を検討中。

### 課題
- [ ] **Henry の Persisted Queries ハッシュマップの探索**
  - 目的: Henry フロントエンドが使用する全 GraphQL API のハッシュを事前に取得
  - 試したこと:
    - 開発者ツールで `henryRadiation.js`, `constants-cusbo0...js` を確認したが未発見
    - WebFetch で `https://assets.henry-app.jp/_next/static/...` を試したが 404
  - 次のステップ:
    - [ ] Network タブで実際の GraphQL リクエストを観察し、使用されている operationName を特定
    - [ ] `HenryCore.dumpHashes()` で現在学習済みのハッシュを確認
    - [ ] GraphQL イントロスペクションクエリで利用可能な API を調査

- [ ] **放射線オーダー取得 API の特定**
  - 候補: `GetRadiationOrder`, `ListRadiationOrders` など
  - 必要な情報: operationName, 必要な variables, 返却フィールド
  - 参照: `HENRY-GRPPHQL-API-REFERENCE.md`（未確認）

- [ ] **実装アプローチの選択**
  - Option A: DOM ベース（現在の実装を修正）
    - メリット: シンプル、既存コードの流用
    - デメリット: 自動スクロール、UI 変更に脆弱
  - Option B: API ベース（HenryCore.call() 経由）
    - メリット: 堅牢、UI 非依存
    - デメリット: API の学習が必要、複雑

---

## 📝 メモ

### HenryCore の仕組み
- Persisted Queries 方式を採用
- `HenryCore.call(operationName, variables)` でハッシュを使って GraphQL API を呼び出す
- Fetch Hook でフロントエンドのリクエストからハッシュを学習し、IndexedDB に保存
- HenryCore 自身は GraphQL スキーマを知らない（学習型プロキシ）

### 設計トレードオフ
- **メリット**: スクリプトがクエリを書かなくて良い、HenryCore が軽量
- **デメリット**: 柔軟性がない、Henry が使っていない API は初回学習が必要

---

## 📅 作成日
2026-01-04
