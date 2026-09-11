# Tasks.md — 実装計画

Spec.md / Design.md に基づく実装タスク一覧。上から順に実施する。

## 1. ドキュメント
- [x] Spec.md（要件定義）の作成
- [x] Design.md（設計）の作成
- [x] Tasks.md（実装計画）の作成

## 2. プロジェクト雛形
- [x] ディレクトリ構成の作成（`css/`, `js/`, `test/`）
- [x] `index.html` の骨格作成（ヘッダー、ツールバー、`#venue`、モーダル用DOM）
- [x] `css/style.css` の骨格作成（レイアウト・レスポンシブ）

## 3. 状態管理ロジック（js/state.js）
- [x] 状態の初期化・localStorage読み書き（`loadState` / `saveState`）
- [x] ID発行ユーティリティ
- [x] `addTable` / `removeTable` / `renameTable` / `moveTable`（上限0〜6のガード含む）
- [x] `addSeat` / `removeSeat`（上限0〜8のガード含む）
- [x] `assignMember` / `unassignMember`（名前必須バリデーション含む）
- [x] `resetVenue`

## 4. 描画・UI（js/app.js）
- [x] 初期表示（localStorageから復元 or 空状態）
- [x] テーブル追加モーダル（名前・初期椅子数指定）と追加ボタンの活性/非活性制御
- [x] テーブルの描画（名前・椅子+/-ボタン・削除ボタン）
- [x] 椅子の円形レイアウト描画（空席／着席済みの表示切り替え）
- [x] テーブルのドラッグ＆ドロップ移動（マウス・タッチ対応、会場内にクランプ）
- [x] メンバー登録・編集モーダル（名前・X ID、保存／解除／キャンセル、バリデーションエラー表示）
- [x] ヘッダーのテーブル数カウンタ表示
- [x] 会場リセット機能（確認ダイアログ付き）

## 5. テスト・仕上げ
- [x] `test/logic.test.js` の作成（state.js の主要関数を網羅）
- [x] `node test/logic.test.js` で全テスト成功を確認
- [x] ブラウザで手動動作確認（テーブル追加/削除、椅子追加/削除、メンバー登録/編集/解除、ドラッグ移動、リロード後のデータ復元、レスポンシブ表示）
- [x] README.md にアプリの概要・使い方・起動方法を記載
- [ ] git commit / push
