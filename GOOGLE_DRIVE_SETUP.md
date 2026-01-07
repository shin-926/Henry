# Google Drive直接連携 セットアップガイド

このガイドでは、`henry_google_drive_direct.user.js` を使用するための Google Cloud Project の設定手順を説明します。

## 前提条件

- Google Workspace アカウント（組織内配布の場合）
- Google Cloud Console へのアクセス権限

---

## Step 1: Google Cloud Project 作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部のプロジェクト選択ドロップダウンをクリック
3. 「新しいプロジェクト」をクリック
4. プロジェクト名を入力（例: `Henry Google Bridge`）
5. 「作成」をクリック

---

## Step 2: Google Drive API 有効化

1. 左メニューから「APIとサービス」→「ライブラリ」を選択
2. 検索バーに「Google Drive API」と入力
3. 「Google Drive API」をクリック
4. 「有効にする」をクリック

---

## Step 3: OAuth同意画面の設定

1. 左メニューから「APIとサービス」→「OAuth同意画面」を選択
2. **User Type**: 「内部」を選択（組織内のみ配布のため、審査不要）
3. 「作成」をクリック

### アプリ情報の入力

| 項目 | 入力値 |
|------|--------|
| アプリ名 | `Henry Google Bridge`（任意） |
| ユーザーサポートメール | 自分のメールアドレス |
| デベロッパーの連絡先メール | 自分のメールアドレス |

4. 「保存して次へ」をクリック

### スコープの設定

1. 「スコープを追加または削除」をクリック
2. 検索バーに `drive.file` と入力
3. `https://www.googleapis.com/auth/drive.file` にチェック
4. 「更新」をクリック
5. 「保存して次へ」をクリック

### 確認

1. 設定内容を確認
2. 「ダッシュボードに戻る」をクリック

---

## Step 4: OAuth クライアントID 作成

1. 左メニューから「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuthクライアントID」をクリック

### クライアントID設定

| 項目 | 入力値 |
|------|--------|
| アプリケーションの種類 | ウェブアプリケーション |
| 名前 | `Henry Bridge Client`（任意） |

### 承認済みのリダイレクト URI

「URIを追加」をクリックして以下を追加：

```
https://henry-app.jp/
```

3. 「作成」をクリック

### クライアントIDとシークレットの取得

作成完了ダイアログに表示される以下の値をコピー：

- **クライアントID**: `xxxxxxxxxxxx.apps.googleusercontent.com`
- **クライアントシークレット**: `GOCSPX-xxxxxxxxxx`

> ⚠️ これらの値は安全に保管してください

---

## Step 5: スクリプトへの設定

`henry_google_drive_direct.user.js` を開き、冒頭の `CONFIG` セクションを編集：

```javascript
const CONFIG = {
  // OAuth設定（GCPコンソールで取得した値を設定）
  CLIENT_ID: 'xxxxxxxxxxxx.apps.googleusercontent.com',  // ← ここに設定
  CLIENT_SECRET: 'GOCSPX-xxxxxxxxxx',                    // ← ここに設定

  // 以下は変更不要
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  ...
};
```

---

## Step 6: 動作確認

### 1. スクリプトのインストール

1. Tampermonkeyで `henry_google_drive_direct.user.js` をインストール
2. 既存の `henry_google_bridge.user.js`（GAS版）は無効化

### 2. Google認証

1. Henry にログイン
2. 画面右下の HenryToolbox を開く
3. 「🔐 Google認証」をクリック
4. Google アカウントでログイン
5. 「許可」をクリック
6. 認証完了後、Henry に戻る

### 3. ファイルを開く

1. 患者のファイル一覧を開く
2. `.docx` または `.xlsx` ファイルをダブルクリック
3. Google Docs/Sheets で開くことを確認

### 4. Henryへ保存

1. Google Docs/Sheets でファイルを編集
2. 「Henryへ保存」ボタンをクリック
3. 「上書き保存」または「新規保存」を選択
4. Henry に保存されることを確認

---

## トラブルシューティング

### 「OAuth設定が未完了です」と表示される

→ スクリプトの `CLIENT_ID` と `CLIENT_SECRET` が設定されているか確認

### 「redirect_uri_mismatch」エラー

→ GCPコンソールの「承認済みのリダイレクト URI」に `https://henry-app.jp/` が設定されているか確認

### 「access_denied」エラー

→ OAuth同意画面で「内部」を選択しているか確認（外部の場合はテストユーザーへの追加が必要）

### 「Google認証が必要です」と表示される

→ HenryToolbox から「🔐 Google認証」をクリックして認証を実行

### 「Henryトークンを取得できません」

→ Henry のタブが開いているか確認。開いている場合はページを再読み込み

---

## スコープについて

このスクリプトでは `drive.file` スコープを使用しています：

| スコープ | 説明 |
|----------|------|
| `drive.file` | このアプリで作成または開いたファイルのみアクセス可能 |

ユーザーの Google Drive 全体にはアクセスしません。

---

## セキュリティ考慮事項

1. **CLIENT_SECRET の取り扱い**
   - クライアントシークレットはスクリプト内に埋め込まれますが、ウェブアプリケーションタイプの OAuth クライアントでは公開情報とみなされます
   - 組織内配布の場合、スクリプトの共有先を限定してください

2. **トークンの保存**
   - アクセストークンとリフレッシュトークンは Tampermonkey の `GM_setValue` に保存されます
   - ブラウザの拡張機能ストレージに暗号化なしで保存されるため、共有PCでの使用は推奨しません

3. **認証の解除**
   - HenryToolbox の「✅ Google認証済み」をクリックすると認証を解除できます
   - Google アカウント側からもアクセスを取り消せます: [Google アカウント設定](https://myaccount.google.com/permissions)
