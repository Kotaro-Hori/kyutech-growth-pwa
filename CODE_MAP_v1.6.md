# コードと画面の対応（学習用）

| ファイル | 何を担当するか |
|---|---|
| `index.html` | アプリの起動、CSSとJavaScriptの読み込み、PWAの設定 |
| `styles.css` | 配色・余白・スマホ／PCレイアウト・入力フォームの見た目。末尾にVer.1.6用スタイル |
| `app.js` | データ、ログイン画面の試作、役割別メニュー、計算、画面描画、ボタン操作、ローカル保存 |
| `manifest.webmanifest` | ホーム画面のアイコン・表示名・PWA起動設定 |
| `sw.js` | PWAのオフライン用キャッシュ。今回のキャッシュ名はVer.1.6 |

## app.jsを読む順番
1. `PLAYER_SCREENS` / `PARENT_SCREENS` / `STAFF_SCREENS` / `ADMIN_SCREENS` — 画面とメニュー名の定義
2. `render()` — ログイン後、どのメニューでどの画面関数を呼ぶか
3. `renderPlayerGoalPlanV16()` — 短期目標の穴埋めフォーム
4. `renderPlayerRecordV16()` — 日々の記録と分類タグ
5. `renderPregameV16()` — 試合前の振り返り検索
6. `renderBaseballGrowthV16()` — 打撃・投手の集計とグラフ
7. `renderStaffHomeV16()` / `renderStaffGuideV16()` / `renderStaffPracticeV16()` — スタッフ画面
8. `renderAdminHomeV16()` / `renderStaffMessagesV16()` — 監督ホームと通知表
9. `action(act)` — `data-action` 属性のボタンを押した時の動作
10. `ROOT.addEventListener('change', ...)` / `input` — プルダウンや入力の変化
11. `readState()` / `writeState()` — ブラウザ内IndexedDBへの保存・読み込み

Ver.1.6の画面関数は、旧バージョンの機能を壊さないよう、`app.js` の後半に追加しています。将来は画面・データ処理・共通部品を別ファイルに分ける余地があります。

**学習上の注意**：`demo-login-form` は画面切替のデモです。Supabaseの正式なログインやRLSの安全性を表すものではありません。
