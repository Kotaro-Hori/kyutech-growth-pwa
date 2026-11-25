# KYUTECH GROWTH v1.4 — 将来のチーム展開に備えた内部整備版

Ver.1.3を基準に、UIを変更せず内部のデータ識別情報と移行資料を追加した**ローカル試作版**です。

## 変更点

- 端末内保存キー `kyutech-growth-prototype-v1` を維持（同じURL/ブラウザなら旧データを引き継ぐ）
- `state.dataSchemaVersion = 2` を追加
- `state.workspace` に `organizationId`, `teamId`, `teamName` を追加
- 選手・記録・目標・トレーニング種目・測定項目・ユーザーなど、配列の各要素に `teamId` を付与
- JSONバックアップへ `dataSchemaVersion` と `workspace` を追加（既存のバックアップ形式識別子と `version:1` は互換性のため維持）
- 現在と異なる `teamId` が明示されたバックアップの誤復元を防止
- PWAキャッシュ名・HTMLアセットのクエリをv1.4へ更新

**注意**: `teamId` を持つだけではチーム間のデータ保護にはなりません。現在のログインはデモで、パスワードはコードに記述されています。クラウド同期・正式な認証・マルチテナント対応・商用運用機能はありません。

## Windowsで確認

Anaconda Promptで解凍したフォルダへ移動し、`python -m http.server 8000` を実行します。ブラウザで `http://localhost:8000` を開きます。Ver.1.3と同じURL・ブラウザで開く場合、保存済みの試作データを引き継ぎます。更新前に必ずJSONバックアップしてください。

## ファイル

- `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`: 実行ファイル
- `ARCHITECTURE.md`: 商品化を見越した構造上の注意事項
- `DATA_MIGRATION.md`: 保存形式の変更内容と今後の移行ポイント
- `README.md`: この説明

チーム内試験に使う場合も **架空のデータだけ** を入力してください。
