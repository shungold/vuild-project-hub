# VUILD Project Hub — アーキテクチャドキュメント v3

> 最終更新: 2026-04-06
> ルール定義: 全て `CLAUDE.md` に集約。このファイルはシステム構造の説明のみ。

---

## 1. 概要

VUILD Project Hubは、VUILDの案件・furniture・金物を横断管理する静的Webサイト。
GitHub Pages（`shungold.github.io/vuild-project-hub/`）でホスティング。

**設計コンセプト**: emarf.co / tecture.jp / vuild.co.jp を参考にしたデータドリブン構成。
JSONにデータを外部化し、テンプレートHTMLで描画する。

---

## 2. ファイル構成

```
VUILDlibrary/                          ← Git管理（GitHub Pages公開）
├── CLAUDE.md                          ← マスタールール（唯一の参照先）
├── ARCHITECTURE.md                    ← このファイル（システム構造の説明）
├── index.html / style.css / common.js ← ポータル
├── data/
│   ├── projects.json                  ← 案件データ
│   ├── furniture.json                 ← furnitureデータ
│   ├── materials.json                 ← 金物データ（採用 + 候補）
│   ├── knowledge.json                 ← ナレッジ + ドキュメント
│   └── scan_state.json                ← スキャン位置管理
├── docs/
│   ├── PROJECT_HUB_V3_PLAN.md         ← 実装TODO（ルールは書かない）
│   └── SESSION7_RESUME.md             ← 再開ガイド
├── photos/
│   ├── projects/{id}/                 ← 案件の竣工写真
│   ├── furniture/{id}/                ← furnitureの製品写真
│   ├── knowledge/                     ← ナレッジ添付画像
│   └── placeholders/                  ← アクソメSVG等
├── furniture-photos/                  ← smart_photo_fetcherのDL先（整理後photos/へ移行）
├── models/furniture/                  ← Git管理の3Dモデル
├── projects/{id}/index.html           ← 案件詳細ページ
├── furniture/{id}/index.html          ← furniture詳細ページ
├── materials/{id}/index.html          ← 金物詳細ページ
├── tools/
│   ├── smart_photo_fetcher.py         ← 写真自動選定スクリプト
│   ├── slack_file_downloader.py       ← Slackファイル一括DL
│   └── monotaro_scraper.py            ← MonotaRO商品情報取得
└── storage/                           ← Git管理外の大容量ファイル（GDrive）
    ├── furniture/{id}/{docs,models,photos}
    ├── projects/{id}/{docs,models,photos}
    └── materials/{models,photos}
```

---

## 3. ページ構成

### 3.1 ポータル（index.html）

| タブ | 内容 | コスト表示 |
|------|------|-----------|
| 案件 | プロジェクトカード一覧 | `cost_overview.total`（見積ベース） |
| VUILD furniture | シリーズ/カテゴリ別カード | `production_cost`（実績ベース） |
| 素材・金物 | 採用金物 + 検討中候補 | 単価表示 |

### 3.2 案件詳細ページ

ヒーロー写真+ピンUI / タブ: Furniture, Materials, 図面, 見積, 実績, Knowledge, 案件ドキュメント

### 3.3 furniture詳細ページ

ヒーロー写真+ピンUI / タブ: 図面, 見積, 実績, 金物・パーツ, Knowledge, 製作ドキュメント / Case Studies

### 3.4 金物詳細ページ

商品画像、スペック、価格、使用furniture、購入リンク、3Dモデル。

---

## 4. データ設計

→ スキーマ詳細は `CLAUDE.md` セクション3 を参照

### 主要フィールド概要

- **projects.json**: id, name, pid, hero_photos[], gallery_photos[], furniture_ids[], material_ids[], cost_overview, related_projects[]（年度違いは別案件+related_projectsで紐づけ。years[]は使わない）
- **furniture.json**: id, name, series, hero_photos[], gallery_photos[], specs, hardware_ids[], production_cost, cost_breakdown, documents[], tags[]
- **materials.json**: materials[]（採用）+ candidates[]（検討中）
- **knowledge.json**: scope("design"/"production")で表示先決定 + production_documents[] + project_documents[]

---

## 5. 情報収集方式

→ スキャンルール・振り分けルール・写真選定ルールは全て `CLAUDE.md` セクション5 を参照

### 概要のみ

| 方式 | トリガー | 概要 |
|------|---------|------|
| 差分スキャン | 「Slackスキャンして」 | 登録済みチャンネルの新着のみ |
| 初回スキャン | 「初回スキャン {チャンネルID}」 | 構造分析 → 質問 → データ生成 |
| アイテム検索 | 「{名前}をスキャンして」 | Slack横断検索 → 照合 → 差分提案 |
| 写真取得 | smart_photo_fetcher.py | スコアリングで自動選定 |
| コスト取得 | AUTOESTIMATOR / Slack PDF / 手動 | 3階層（請求/原価/外注） |
| ナレッジ取得 | Slackスタンプ / AI自動判別 | scope判別でページ振り分け |

---

## 6. 共通モジュール（common.js）

| モジュール | 機能 |
|-----------|------|
| DataLoader | JSONデータの読み込み・キャッシュ |
| GDriveManager | GDriveへのアップロード登録 |
| ModelManager | 3Dモデルの表示・アップロードUI |
| WebEditor | Web上での編集操作を記録（localStorage → エクスポート） |
| PinEditor | 写真上のピン配置・編集・保存 |

---

## 7. テンプレート運用

```
projects/detail-template.html  → projects/*/index.html にコピー
furniture/detail-template.html → furniture/*/index.html にコピー
materials/detail-template.html → materials/*/index.html にコピー
```

テンプレート変更時: テンプレートを編集 → 全フォルダにデプロイ → push

---

## 8. 技術スタック

| 項目 | 技術 |
|------|------|
| ホスティング | GitHub Pages（静的サイト） |
| フロント | Vanilla JS + CSS（フレームワークなし） |
| データ | JSON（外部化） |
| フォント | Inter + Noto Sans JP（Google Fonts） |
| API連携 | Slack API（xoxpトークン）, MonotaROスクレイパー |
| PDF解析 | pdfplumber（Python） |
| バージョン管理 | Git（shungold/vuild-project-hub） |
