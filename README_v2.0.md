# KYUTECH GROWTH Ver.2.0 — Supabaseクラウド閲覧テスト

## このパッケージについて
- Ver.1.9の既存デモUIとIndexedDB試作を残したまま、クラウド閲覧専用の `cloud-test.html` を追加。
- Supabase Authのメール/パスワードでログインし、accounts / team_memberships / players / measurement_sessions / measurement_values / measurement_items / short_term_goals / long_term_goals / measurement_targets / report_cards / report_scores / report_items を読み取り。
- SupabaseのRLSで閲覧できるレコードだけを表示することを確認する目的。
- クラウドへの登録・編集・削除機能はありません。
- テスト用4アカウントだけで実施し、実在の未成年者情報は入力しないこと。

## 導入手順
1. Supabase SQL Editorで別添の `KYUTECH_GROWTH_12_cloud_login_prep.sql` をRun。既存の09/10/11通知表SQLが成功していることが前提です。
2. このZIPを展開し、今のGitHub Pagesのリポジトリにあるファイルをバックアップ。ZIP内ファイルをレポジトリのルートにアップロードしてコミット。過去のVer.1.9 ZIPの中身は丸ごと含んでいます。
3. `https://kotaro-hori.github.io/kyutech-growth-pwa/cloud-test.html` を開く。
4. Supabase DashboardのProject URL（https://xxx.supabase.co）とPublishable key（sb_publishable_...）を入力。「Secret key」「service_role key」は絶対に使わない。
5. テスト監督のメール・パスワードでログインしてデータ件数を確認。ログアウトしてスタッフ・選手・保護者を試す。
6. 監督/スタッフ：選手2名、50m走2件、通知表2件（うち下書き1件）。選手/保護者：選手1名、50m走8.5秒1件、公開通知表1件。この期待値は前のSQLをすべて実行済みの場合です。

## よくあるエラー
- 42501 permission denied: 依存SQLのRLS/GRANT不足か、12のSQL未実行。
- API key invalid: Publishable keyやProject URLの転記ミス。
- Invalid login credentials: Authenticationに作成したユーザーのメール・パスワードを確認。
- Authメール確認の設定によってはログインに制約あり。
- オフライン時はクラウドの読み込みはできません。

## 重要な制限
- 旧index.htmlのログインは依然としてデモであり、Supabase Authと連動しません。
- このテストページは実データやセキュリティ監査済みの本番アプリではありません。
- 端末内IndexedDBはクラウドと同期しません。
- 目標作成・編集権限の実ブラウザ試験、監査ログの保護、通知表の公開操作試験、認証メール設定、CORS/リダイレクト、ログアウトと共有端末時の取り扱い等は今後検証が必要です。
- 公開用キーも実行可能なAPIへの入口です。RLS/GRANTを本番用に完全検証してから実データを扱うこと。
