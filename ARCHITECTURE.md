# VUILD Project Hub — アーキテクチャドキュメント

> 最終更新: 2026-04-04

## 1. 概要

VUILD Project Hubは、VUILDの案件・furniture・金物を横断管理する静的Webサイト。
GitHub Pages（`shungold.github.io/vuild-project-hub/`）でホスティング。

**設計コンセプト**: emarf.co / tecture.jp / vuild.co.jp を参考にしたデータドリブン構成。
JSONにデータを外部化し、テンプレートHTMLで描画する。

---

## 2. ページ構成

```
index.html                    ← ポータル（3タブ: 案件 / furniture / 素材・金物）
├── projects/{id}/index.html  ← 案件詳細ページ（6案件）
├── furniture/{id}/index.html ← furniture詳細ページ（16プロダクト）
└── materials/{id}/index.html ← 金物詳細ページ（9金物 + 8候補）
```

### 2.1 ポータル（index.html）

| タブ | 内容 | コスト表示 |
|------|------|-----------|
| 案件 | プロジェクトカード一覧。クリック→案件詳細 | `cost_overview.total`（見積ベース） |
| VUILD furniture | シリーズ/カテゴリ別カード。クリック→furniture詳細 | `production_cost`（実績ベース） |
| 素材・金物 | 採用金物 + 検討中候補。スタンプルール表 + Slackスキャンボタン | 単価表示 |

### 2.2 案件詳細ページ

| エリア | 内容 |
|--------|------|
| ヒーロー | 写真 + ピンUI（クリック→サイドパネルにfurniture/金物詳細） |
| タブ: VUILD Furniture | 紐づくfurnitureカード |
| タブ: Materials | 建築資材（type: architectural） |
| タブ: 図面 | 図面ギャラリー + 追加/削除UI |
| タブ: 見積 | 予算サマリ + 見積/請求書（ステータスバッジ付） + 参考資料追加UI |
| タブ: 実績 | furniture原価集約 + プロジェクトコスト + コスト項目追加UI |
| タブ: Knowledge | scope:"design"のナレッジ（案件固有の設計判断・クライアント要件など） |
| サイドバー | Data（案件番号/カテゴリ/所在地等）, Credit（チーム）, 3Dモデル, タグ |

### 2.3 furniture詳細ページ

| エリア | 内容 |
|--------|------|
| ヒーロー | アクソメSVG or 写真 + ピンUI（金物をピン表示） |
| タブ: 図面 | 図面ギャラリー + 追加/削除UI |
| タブ: 見積 | AUTOESTIMATOR JSON D&D + 見積/請求書リスト + 参考資料追加UI |
| タブ: 実績 | 金物コスト積み上げ + その他コスト(cost_breakdown + 手動) + 原価合計 |
| タブ: 金物・パーツ | カテゴリ別カード + 検討中候補（採用/不採用ボタン） |
| タブ: Knowledge | scope:"production"のナレッジ（加工・素材・組立の知見） |
| Case Studies | 導入案件リスト（箇条書き、ページ最下部） |
| サイドバー | Spec, 3Dモデル, タグ |

### 2.4 金物詳細ページ

商品画像、スペック、価格、使用furniture、購入リンク、3Dモデル。

---

## 3. データ設計

### 3.1 JSONファイル構成

```
data/
├── projects.json    ← 案件データ（6件）
├── furniture.json   ← furnitureデータ（16件）
├── materials.json   ← 金物データ（採用9件 + 候補8件）
└── knowledge.json   ← ナレッジ（10件）
```

### 3.2 主要フィールド

#### projects.json
```
id, name, pid, client, status, category, location,
hero_photos[], gallery_photos[], photo_pins[],
team[], furniture_ids[], material_ids[],
cost_overview: { total, design_fee, fabrication_fee, budget_note },
slack_channel_id, slack_channel_name, tags[]
```

#### furniture.json
```
id, name, name_en, series, category,
dimensions, weight_kg, model_url,
hero_photos[], gallery_photos[], photo_pins[],
specs: { material, finish, note },
hardware_ids[],
production_cost, cost_breakdown: { 項目: 金額 },
documents[]: { label, type, url, note, status },
tags[]
```

#### materials.json
- **materials[]**: 採用済み金物（status: adopted）
  ```
  id, name, product_code, maker, price,
  product_url, thumbnail_url, category, specs,
  project_ids[], furniture_ids[]
  ```
- **candidates[]**: 検討中候補（status: pending/adopted/dismissed）
  ```
  上記 + posted_by, posted_at, project_id, furniture_id
  ```

#### knowledge.json
```
id, project_id, furniture_id,
scope: "design" | "production",   ← 表示先を決定
type: "progress" | "trouble" | "howto" | "spec",
title, content, posted_by, date,
slack_url, images[]
```

### 3.3 ナレッジ scope ルール

| scope | 表示先 | 判断基準 |
|-------|--------|---------|
| design | 案件ページのみ | クライアント要件、敷地条件、搬入計画、運用方法 — **この案件固有の話** |
| production | furnitureページのみ | 加工方法、素材選定、塗装、組立 — **他案件でも再利用できる知見** |

### 3.4 コスト構造

| | 見積タブ | 実績タブ | ポータル表示 |
|--|---------|---------|-------------|
| 案件 | 予算サマリ + 見積/請求書 | furniture原価集約 + PJコスト | `cost_overview.total` |
| furniture | AUTOESTIMATOR + 見積/請求書 | 金物積み上げ + その他コスト | `production_cost` |

ドキュメントのステータス: 検討中 → 請求済み → 支払済み

---

## 4. 共通モジュール（common.js）

| モジュール | 機能 |
|-----------|------|
| **DataLoader** | JSONデータの読み込み・キャッシュ |
| **EditManager** | 旧式の編集管理（廃止予定） |
| **GDriveManager** | GDriveへのアップロード登録 |
| **ModelManager** | 3Dモデルの表示・アップロードUI |
| **WebEditor** | Web上での編集操作を記録（localStorage → エクスポート） |
| **PinEditor** | 写真上のピン配置・編集・保存 |

### 4.1 WebEditor の編集操作

| 操作 | 関数 | 保存先 |
|------|------|--------|
| 画像追加 | `addImageUI()` | localStorage → GDrive |
| 画像削除 | `removeImage()` | localStorage |
| 参考資料追加 | `addDocumentUI()` | localStorage |
| コスト項目追加 | `addCostItemUI()` | localStorage |
| 候補の採用/不採用 | `setCandidateStatus()` | localStorage |
| ピン追加/削除 | `addPin()` / `removePin()` | localStorage |

全ての変更は `vuild_pending_changes` としてlocalStorageに蓄積され、
画面下部の同期バーから「エクスポート」でJSON出力できる。

### 4.2 PinEditor

- 写真クリック → リンク先（furniture/金物）選択 → ピン配置
- `vuild_pins_{type}_{id}` としてlocalStorageに保存
- ページ読み込み時に `loadPins()` でlocalStorage優先で復元

---

## 5. 情報収集方式

### 5.1 Slackスキャン

**トリガー**: 「Slackスキャンして」コマンド

**処理フロー**:
1. 各チャンネルの🔩スレッド（金物選定スレッド）を読み取り
2. スレッド返信内のECリンクもチェック
3. スタンプに基づいて分類:
   - ✅ → materials（採用）
   - 🔍 → candidates（検討中）
   - ❌ → candidates（却下）
   - 💰 → BOM発注済み
   - :memo:/:warning:/:bulb:/:triangular_flag_on_post: → knowledge
4. 商品情報を自動取得（MonotaROスクレイパー or WebFetch）
5. 各プロジェクトページに振り分け
6. ポータルのstats更新 → commit & push

**対象チャンネル**:
| チャンネル | 案件 | 金物スレッド ts |
|-----------|------|----------------|
| C0AFAFBC8AH | #1141 人の森 | 1775103698.252669 |
| C09V70VFF96 | #3040 BAUM | 1775107906.358789 |
| C09D1N2CEM8 | #1127 東京建物 | 1775107921.787019 |
| C09455EDRJN | #1125 Panasonic | 1775107926.902659 |

**ガードレール**:
- 既存データは上書きしない（手動修正を保護）
- URLで重複チェック（採用済み/却下済みは再追加しない）
- 新規アイテムのみ追加

### 5.2 写真取得

**方法**: Slack API（xoxpトークン）でファイルURL取得 → ローカルDL

**優先順位**: 黒部さん（U9UBC4K6K）の投稿を優先（竣工・完成写真の撮影担当）

**保存先**:
```
photos/
├── projects/{id}/        ← 案件の竣工写真・施工写真
├── furniture/{id}/       ← furnitureの製品写真
├── knowledge/{案件名}/   ← ナレッジ添付画像
└── placeholders/         ← アクソメSVG等
```

### 5.3 コスト取得

| 方法 | 用途 |
|------|------|
| **AUTOESTIMATOR JSON** | furniture見積タブにD&Dで読み込み。金物との自動照合 |
| **Slack PDF** | pdfplumberで見積PDFをパース → 金額抽出 |
| **金物カタログ** | materials.jsonの price × quantity で積み上げ |
| **手動入力** | WebEditor.addCostItemUI() で外注費・人工を追加 |
| **Google Sheets**（未実装） | スプレッドシートからコスト自動取得 |

### 5.4 ナレッジ取得

**自動**: Slackスキャン時にスタンプ（:memo:等）でtype判別
**手動**: Slack会話から金子さんが「メモして」で保存

scope判別:
- 「他案件で再利用可能か」→ Yes: production / No: design
- AUTOESTIMATOR連携 → furniture production
- クライアント打合せ → project design

---

## 6. ストレージ

### 6.1 ローカル（GitHub Pages）
- 写真・SVG・3Dモデル → `photos/`, `models/`
- JSONデータ → `data/`
- commit & pushで即反映（1-2分）

### 6.2 GDrive（マスターストレージ）
```
G:\マイドライブ\Claude_Projects\VUILD_Project_Hub\
├── projects/{id}/{photos,models,docs}
└── furniture/{id}/{photos,models,docs}
```
- 見積PDF、3Dモデル(.3dm)等の大容量ファイル
- 共有ドライブへの移行予定（チーム方針確定後）

### 6.3 localStorage（ブラウザ）
- Web編集の変更差分（`vuild_pending_changes`）
- ピン編集（`vuild_pins_{type}_{id}`）
- AUTOESTIMATOR BOM（`vuild_bom_{id}`）
- コスト項目（`vuild_cost_items_{type}_{id}`）

---

## 7. テンプレート運用

各ページは**テンプレートファイル**を全フォルダにコピーして運用:

```
projects/detail-template.html  → projects/*/index.html にコピー
furniture/detail-template.html → furniture/*/index.html にコピー
materials/detail-template.html → materials/*/index.html にコピー
```

**テンプレート変更時**: テンプレートを編集 → 全フォルダにデプロイ → push

ページはURLのパスからIDを取得し、JSONから該当データを読み込んで描画:
```javascript
const pathParts = location.pathname.replace(/\/index\.html$/, '').split('/').filter(Boolean);
const projectId = pathParts[pathParts.length - 1];
```

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
