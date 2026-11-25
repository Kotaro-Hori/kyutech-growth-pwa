# データ互換性・移行メモ

## v1.3 → v1.4

- IndexedDBデータベース名：変更なし（`kyutech-growth-prototype-v1`）
- 保存場所：変更なし（`app` オブジェクトストア内の `state`）
- 過去の `players`, `records`, `goals` などのID：変更なし
- 追加：`dataSchemaVersion: 2`, `workspace`, 一部データ配列の `teamId`
- 既存配列要素に`teamId` がなければ `workspace.teamId` を付与（**単一チームの試作データに限る**）
- JSONバックアップのルート `format:'kyutech-growth-prototype', version:1` は維持し、古いバックアップも読み込める
- `workspace.teamId` がある別チームのバックアップは誤復元を防ぐため拒否する

## 注意

- GitHub Pagesとlocalhostは別オリジンなので、端末内の記録は自動共有されない
- アプリ側のデータを消す操作・サイトデータ削除は復旧不能になる可能性。先にバックアップ
- `.js` のコメントやドキュメントに書いたチームIDはセキュリティ境界ではない
- `longGoals`, `shortGoals`, `goalTargets` は今も選手IDをキーにした旧形式。将来のクラウドDB移行でテーブル化する
- バックアップにはログイン割当・コメント・写真など機微情報を含む可能性がある。暗号化は未実装
- 同じブラウザの既存データがある場合、旧データを上書きしない。初回起動時にメタデータだけ追加する
