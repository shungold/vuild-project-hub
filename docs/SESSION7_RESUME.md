# セッション7 再開ガイド

> セッション日: 2026-04-05
> ファイル統合: 2026-04-06（VUILDlibraryに一本化）
> 中断ポイント: 設計完了・実装開始前

## 再開コマンド

```
Project Hubの続き。VUILDlibrary/docs/PROJECT_HUB_V3_PLAN.md を読んで、Step 1から実装開始して
```

## 次にやること（Step 1〜9）

| Step | 内容 | ステータス |
|------|------|-----------|
| 1 | knowledge.json にドキュメントスキーマ追加 | 未着手 |
| 2 | 尾道4 + 富山4 のfurniture/案件データ追加 | 未着手 |
| 3 | furniture製作ドキュメントタブUI実装 | 未着手 |
| 4 | 案件ドキュメントタブUI実装 | 未着手 |
| 5 | 尾道・富山のドキュメント生成 | 未着手 |
| 6 | 楽天の年次タブ対応 | 未着手 |
| 7 | 楽天2024のfurniture追加 | 未着手 |
| 8 | scan_state.json + スキャンロジック更新 | 未着手 |
| 9 | 3モードスキャン実装 | 未着手 |

## 関連ファイル（全て VUILDlibrary/ 配下）

- ルール: `CLAUDE.md`（唯一のマスター）
- 設計書: `ARCHITECTURE.md`
- 実装TODO: `docs/PROJECT_HUB_V3_PLAN.md`
- データ: `data/{projects,furniture,materials,knowledge}.json`
- テンプレート: `projects/detail-template.html`, `furniture/detail-template.html`
- スクリプト: `tools/smart_photo_fetcher.py`
