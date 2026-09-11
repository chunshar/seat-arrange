# Design.md — 座席表作成アプリ 実装設計

Spec.md の要件を満たすための技術設計をまとめる。

## 1. 技術構成
- ビルドツール・フレームワークは使用しない。Vanilla **HTML / CSS / JavaScript** のみで実装する。
- `index.html` をダブルクリックしてブラウザで開くだけで動作させるため、ES Modules (`type="module"`) は使用せず、通常の `<script>` として1本の JS ファイルを読み込む。
- データ永続化は `window.localStorage` を使用する。

## 2. ファイル構成
```
seat-arrange/
├── Spec.md
├── Design.md
├── Tasks.md
├── README.md
├── index.html      … 画面構造（会場エリア、ツールバー、モーダル）
├── css/
│   └── style.css   … 全スタイル（レイアウト・レスポンシブ対応）
├── js/
│   └── app.js       … 状態管理・描画・イベント処理すべて
└── test/
    └── logic.test.mjs … コアロジック（状態操作関数）の単体テスト（Node.js実行）
```

## 3. データモデル
アプリの状態は下記の単一オブジェクト（`state`）で管理する。

```js
State = {
  tables: Table[]  // 0〜6件
}

Table = {
  id: string,        // 一意なID
  name: string,       // テーブル名
  x: number,          // 会場内でのx座標(px)
  y: number,          // 会場内でのy座標(px)
  seats: Seat[]       // 0〜8件
}

Seat = {
  id: string,               // 一意なID
  member: Member | null     // 未割り当ての場合 null
}

Member = {
  name: string,   // 必須
  xId: string     // 任意（空文字許容）
}
```

- `id` の発行には `crypto.randomUUID()` を使用する（非対応環境向けに簡易フォールバックを用意）。
- 状態は毎回の変更操作の後、`localStorage.setItem('seatArrangeState', JSON.stringify(state))` で永続化する。
- 初期化時、`localStorage.getItem('seatArrangeState')` が存在すればパースして復元し、存在しなければ空の `tables: []` から開始する。

## 4. 画面構成（index.html）

```
┌───────────────────────────────────────────┐
│ ヘッダー: タイトル / テーブル数(n/6) / 会場リセット │
├───────────────────────────────────────────┤
│ ツールバー: [＋ テーブルを追加]                  │
├───────────────────────────────────────────┤
│ 会場エリア (#venue)                          │
│   ┌─────────┐        ┌─────────┐        │
│   │ テーブルA │        │ テーブルB │  ...    │
│   │  (椅子×n) │        │  (椅子×n) │        │
│   └─────────┘        └─────────┘        │
└───────────────────────────────────────────┘

[モーダル] テーブル追加/編集モーダル: テーブル名, 初期椅子数
[モーダル] メンバー登録モーダル: 名前, X ID, 保存/解除/キャンセル
```

- `#venue` は `position: relative` の矩形領域。テーブルはその子要素として `position: absolute` で配置する。
- テーブル要素 (`.table`) はドラッグハンドル（テーブル名部分）をつかんでマウスドラッグ／タッチドラッグで移動できる。移動範囲は `#venue` の矩形内にクランプする。
- 各テーブルの椅子は、テーブル中心から等間隔の角度で円周上に配置する（`angle = (360 / seatCount) * index`、`left/top` を `sin/cos` から算出し `transform: translate(-50%, -50%)`）。
- 空席は「＋」アイコン、着席済みは名前（と設定されていれば X ID）を表示する。
- テーブルには以下の操作 UI を持つ：
  - 名前編集（インライン入力 or 編集ボタン→モーダル）
  - 椅子 +/- ボタン（0〜8 の範囲でボタンを disable 制御）
  - テーブル削除ボタン

## 5. 主要モジュール／関数（js/app.js）

### 5.1 状態管理
- `loadState()` / `saveState()`: localStorage との同期
- `createId()`: ID生成
- `addTable({name, seatCount})`: テーブル追加（`tables.length >= 6` の場合は何もしない）
- `removeTable(tableId)`: テーブル削除
- `renameTable(tableId, name)`
- `moveTable(tableId, x, y)`
- `addSeat(tableId)`: 椅子追加（`seats.length >= 8` の場合は何もしない）
- `removeSeat(tableId, seatId)`: 椅子削除（割り当てメンバーも削除）
- `assignMember(tableId, seatId, {name, xId})`: バリデーション（name必須）後に登録
- `unassignMember(tableId, seatId)`: 割り当て解除
- `resetVenue()`: 全データ削除

これらの関数は「純粋なロジック部分」（状態オブジェクトを受け取り、新しい状態や副作用を返す）と「DOM描画・保存」を分離し、`test/logic.test.mjs` から直接 import してテストできるようにする（`export` を app.js の末尾にまとめる、もしくは `js/state.js` として分離）。
→ 実装をシンプルにするため、状態操作関数群を `js/state.js` に分離し、`app.js` は DOM描画とイベントハンドリングに専念する。

### 5.2 描画
- `renderTables()`: `state.tables` を元に `#venue` 配下のテーブルDOMを再構築する。
- `renderTableCounter()`: ヘッダーの「テーブル: n/6」を更新する。
- 状態が変化するたびに `saveState()` → `render()` を呼ぶシンプルな単方向データフローとする（仮想DOM等は使用せず、毎回 `#venue` の中身を作り直す軽量な実装で十分な規模）。

### 5.3 イベント処理
- テーブル追加ボタン → テーブル追加モーダルを開く → 保存で `addTable()` 実行 → 再描画
- テーブルのドラッグ → `mousedown/mousemove/mouseup`（および `touchstart/touchmove/touchend`）で座標を更新し、ドラッグ終了時に `moveTable()` を呼び保存
- 椅子クリック（空席）→ メンバー登録モーダルを開く
- 椅子クリック（着席済み）→ メンバー編集モーダルを開く（名前・X ID編集済み状態、解除ボタンあり）
- 椅子 +/- ボタン → `addSeat()` / `removeSeat()`
- テーブル削除ボタン → 確認ダイアログ（`confirm()`）後に `removeTable()`
- 会場リセットボタン → 確認ダイアログ後に `resetVenue()`

## 6. バリデーション方針
- テーブル数・椅子数の上限/下限はロジック層で必ずガードし（UIを介さない不正な操作でも状態が壊れないようにする）、UI側でもボタンの `disabled` 制御で事前に防ぐ（二重の防御）。
- メンバー名が空文字（トリム後）の場合は `assignMember` を実行せず、モーダル上にエラーメッセージを表示する。

## 7. レスポンシブ対応
- `#venue` は横幅 100% ・アスペクト比を保った最小高さを確保し、狭い画面では横スクロール可能にする。
- ヘッダー・ツールバーは `flex-wrap` で折り返す。
- モーダルは画面幅に応じて最大幅を制限し、中央表示する。

## 8. テスト方針
- `js/state.js` の各関数（addTable / removeTable / addSeat / removeSeat / assignMember / unassignMember / resetVenue と上限バリデーション）に対し、Node.js の `assert` を用いた単体テストを `test/logic.test.mjs` に用意し、`node test/logic.test.mjs` で実行できるようにする。
- ブラウザ上の実際の描画・ドラッグ操作は手動確認を行う。
