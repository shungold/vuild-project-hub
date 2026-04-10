# VUILD KnowledgeDB — Notion マスタDB構成リファレンス

- 日付: 2026-04-10
- Notionページ: [VUILD_KnowledgeDB_forAgent](https://www.notion.so/3325709244d280738c91f07eeeaf1789)

---

## 設計方針（Yuki確認済み）

1. **Furnitureがハブ**: PJ内の個別製作物を中心に、材料・人・製造先が紐付く
2. **Project→外注先等はFurniture経由で辿る**（直接リレーション不要）
3. **工具→Furniture直接リレーションなし**: Knowledge経由で間接的に辿る
4. **工具→機械**: Notion上でリレーション追加済み（旧machine multi_selectから移行）
5. **Knowledgeは全リレーション埋める必要なし**: 特定のナレッジに関連するリソースだけ紐付ける（例: ある加工ノウハウに使った工具だけ紐付け）

---

## リレーション構造図

```
                    Client
                      │
                      ▼
  Project ──▶ Furniture ◀── Member
                 │  │  │
          ┌──────┘  │  └──────┐
          ▼         ▼         ▼
        木材      金物       塗料
          │         │         │
          └────┬────┘─────────┘
               ▼
           Knowledge ◀── 工具
               ▲
               │
        機械 ◀──▶ 外注先・拠点
```

---

## DB一覧・スキーマ詳細

### 1. ProjectマスターDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33b57092-44d2-81b6-a71c-000b74a13eac` |
| Notion URL | https://www.notion.so/33b5709244d280cba589e353582a42c3 |
| 役割 | 案件（PJ）の基本情報。1PJ = 1レコード |
| Title列 | ProjectID（Slackのチャンネル名と一致させる運用） |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| ProjectID | title | PJ識別子 = Slackチャンネル名 |
| PJ概要 | text | 概要テキスト |
| PJ期間 | date | 開始〜終了の期間 |
| 受注額 | number | 受注額 |
| 完成写真 | file | 完成写真 |
| FurnitureマスターDB | relation | → Furniture（1:N） |

**入れるデータ**: 過去・現在のPJ一覧。Slackチャンネル名をIDとして、概要・期間・受注額を埋める。

---

### 2. FurnitureマスターDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33b57092-44d2-81aa-9f98-000bdb3604b6` |
| Notion URL | https://www.notion.so/33b5709244d280b9814ee67b86310ae0 |
| 役割 | **中心ハブ。** PJ内の個別家具/製作物。材料・人・拠点がここに紐付く |
| Title列 | (空名称) → 削除予定。家具の名前を入れる列 |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| (Title) | title | 家具の名前 ※列名が空のため要修正 |
| 概要 | text | 家具の概要 |
| 工期 | date | 製造期間 |
| 写真 | file | 写真 |
| ProjectマスターDB | relation | → Project |
| CliantマスタDB | relation | → Client |
| MemberマスタDB | relation | → Member |
| 木材マスタDB | relation | → 木材 |
| 金物マスタDB | relation | → 金物 |
| 外注先・拠点マスタDB | relation | → 外注先・拠点 |
| KnowledgeマスタDB | relation | → Knowledge |

**入れるデータ**: 各PJの製作物（テーブル、棚、壁パネル等）。どの材料を使い、誰が担当し、どこで製造したかを紐付ける。

**要修正**: Title列の空名称プロパティを削除

---

### 3. 木材マスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `081dd7d0-aadd-4325-bed7-5f8aae041e24` |
| Notion URL | https://www.notion.so/6e858f6a1849435cb8e45175b44bc7c8 |
| 役割 | 木材の材料マスタ。樹種・寸法・単価を管理 |
| Title列 | Name（例: 杉KD材 30x120x4000） |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | 材料名 |
| 材種 | select | 杉 / 檜 / CLT / LVL / 集成材 / 製材 / その他 |
| 厚さ | number | 厚さ (mm) |
| 横幅 (mm) | number | 幅 |
| 縦幅 (mm) | number | 長さ |
| 単価 | number | 単価 |
| 単位 | select | 円/m3 / 円/枚 / 円/m / 円/本 |
| 購入先 | select | 仕入先 |
| 最終更新 | date | 最終更新日 |
| 備考 | text | 備考 |
| FurnitureマスターDB | relation | → Furniture |
| KnowledgeマスタDB | relation | → Knowledge |

**入れるデータ**: 使用実績のある木材の規格・単価。購入先情報。

---

### 4. 金物マスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33e57092-44d2-8197-b819-000b17d0cbbb` |
| Notion URL | https://www.notion.so/33e5709244d280c0b834e3c8c95efc41 |
| 役割 | 金物（ビス・金具・ボルト等）の材料マスタ |
| Title列 | Name |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | 材料名 |
| 厚さ | number | (mm) |
| 横幅 (mm) | number | 幅 |
| 縦幅 (mm) | number | 長さ |
| 単価 | number | 単価 |
| 単位 | select | 円/m3 / 円/枚 / 円/m / 円/本 |
| 購入先 | select | 仕入先 |
| 購入先リンク | url | 購入先URL |
| 最終更新 | date | 最終更新日 |
| 備考 | text | 備考 |
| FurnitureマスターDB | relation | → Furniture |
| KnowledgeマスタDB | relation | → Knowledge |

**入れるデータ**: 使用実績のある金物の規格・単価・購入先リンク。

---

### 5. 塗料マスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33e57092-44d2-81a7-adde-000b61dfd6f5` |
| Notion URL | https://www.notion.so/33e5709244d2807d9c09edfc956c3ea6 |
| 役割 | 塗料マスタ |
| Title列 | Name |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | 塗料名 |
| 単価 | number | 単価 |
| 購入先 | select | 仕入先 |
| 購入先リンク | url | 購入先URL |
| 最終更新 | date | 最終更新日 |
| 備考 | text | 備考 |
| FurnitureマスターDB | relation | → Furniture |
| KnowledgeマスタDB | relation | → Knowledge |

**入れるデータ**: 使用する塗料の種類・単価・購入先。

---

### 6. 外注先・拠点マスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `cdd13515-0635-4c7d-b60d-a2e7a3c5428a` |
| Notion URL | https://www.notion.so/6b43a5cdfa664e788a394aeccbd540f8 |
| 役割 | 製造拠点・外注先の情報。キャパ・単価・保有機械を管理 |
| Title列 | Name（拠点名） |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | 拠点名 |
| 拠点種別 | select | ShopBot拠点 / Biesse拠点 / KUKA拠点 / 外注先 / 自社 |
| 保有機械 | multi_select | ShopBot / Biesse / KUKA / ハンドルーター / プレスカット |
| 所在地 | text | 住所 |
| 時間単価 (円/h) | number | 時間コスト |
| monthly_capacity | number | 月間キャパ (時間) |
| 標準納期 (営業日) | number | 標準納期 |
| 最大加工サイズ | text | 最大加工サイズ |
| 担当者 | multi_select | 担当者名 |
| 担当者連絡先 | email | メールアドレス |
| 備考 | text | 備考 |
| FurnitureマスターDB | relation | → Furniture |
| 機械マスタDB | relation | → 機械 |

**入れるデータ**: 自社拠点（秋田、海老名等）と外注先。保有機械・キャパ・単価。

---

### 7. 機械マスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `f4257a6d-a9d8-40e0-9a9a-867a3789f21d` |
| Notion URL | https://www.notion.so/72f1ca701fba406782d082c48c91e7f8 |
| 役割 | CNCマシン個体のマスタ。スペック・稼働状態・設置場所を管理 |
| Title列 | Name（例: Biesse1, KUKA-KR240, ShopBot海老名） |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | 機械名 |
| machine_type | select | Biesse / KUKA / ShopBot / ハンドルーター / その他 |
| axes | select | 3軸 / 4軸 / 5軸 / 6軸 |
| max_x | number | 最大加工X (mm) |
| max_y | number | 最大加工Y (mm) |
| max_z | number | 最大加工Z (mm) |
| hourly_cost | number | 時間コスト (円/h) |
| status | select | 稼働中 / メンテ中 / 停止 |
| 設置場所 | relation | → 外注先・拠点 |
| KnowledgeマスタDB | relation | → Knowledge |

**入れるデータ**: 自社・拠点保有の全マシン。Biesse1/2、KUKA、各拠点ShopBot等。

---

### 8. 工具マスターDB

| 項目 | 値 |
|------|-----|
| data_source_id | `285f6a8a-af30-4fef-a362-7b384796881f` |
| Notion URL | https://www.notion.so/bbe0d587d4a14310b25c2c1c68d3c06c |
| 役割 | ドリル/エンドミル/丸鋸/ボールノーズ/ルーターの工具定義。CAMのToolJSONと一致させる |
| Title列 | tool_name（例: DRILL_12, ROUTER_6_DOWN） |

| プロパティ | 型 | 説明 | 対象工具 |
|-----------|-----|------|---------|
| tool_name | title | Biesse tool_nameと一致 | 全種 |
| type | select | drill / endmill / saw / ballnose / router | 全種 |
| diameter | number | 工具径 (mm) | 全種 |
| flute_length | number | 刃長 (mm) | endmill/drill |
| total_length | number | 全長 (mm) | 全種 |
| number_of_flutes | number | 刃数 | endmill |
| cutting_direction | select | down / up / both | endmill |
| feed_rate | number | 切削送り速度 (m/min) | 全種 |
| plunge_rate | number | 切り込み速度 (m/min) | endmill/drill |
| retract_rate | number | 退避速度 (m/min) | 全種 |
| spindle_speed | number | 主軸回転数 (rpm) | 全種 |
| step_down | number | 1パス切り込み深さ (mm) | endmill |
| step_over | number | スパイラル間隔（径比率 0-1） | endmill |
| margin_height | number | 安全高さ (mm) | 全種 |
| blade_thickness | number | 刃厚=切り代 (mm) | saw |
| arbor_diameter | number | アーバー径 (mm) | saw |
| overrun | number | オーバーラン (mm) | saw |
| subroutine | text | サブルーチン名（例: GPRELAMA5AX） | saw |
| machine | multi_select | 装着マシン → 機械リレーションに移行済み | 全種 |
| mounted | checkbox | 現在装着中か | 全種 |
| status | select | active / spare / retired | 全種 |
| KnowledgeマスタDB | relation | → Knowledge | — |

**入れるデータ**: emarf_gh_robotのToolJSONに定義済みの全工具。Biesse1/2・KUKAの実機工具。

**データソース**: `D:/VUILD/Dev/Claude/emarf_gh_robot` 内のToolJSON定義ファイル

---

### 9. KnowledgeマスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33d57092-44d2-8176-9da7-000bfad116dd` |
| Notion URL | https://www.notion.so/33d5709244d2809f8bedf714362b7dc3 |
| 役割 | **ナレッジのハブ。** 加工ノウハウ・段取り・エラー対応・修正対応を蓄積 |
| Title列 | Knowledgeタイトル |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Knowledgeタイトル | title | ナレッジのタイトル |
| Knowledgeタイプ | select | 加工 / 段取り / 仕上げ / 機械エラー / 修正対応 |
| Knowledge内容 | text | 内容テキスト |
| Knouwledge加工機 | multi_select | ShopBot / Biesse / KUKA / ハンドルーター / プレスカット |
| 該当SlackChatリンク | url | 関連Slackスレッドへのリンク |
| FurnitureマスターDB | relation | → Furniture |
| MemberマスタDB | relation | → Member |
| 工具マスターDB | relation | → 工具 |
| 木材マスタDB | relation | → 木材 |
| 金物マスタDB | relation | → 金物 |
| 塗料マスタDB | relation | → 塗料 |
| 機械マスタDB | relation | → 機械 |

**入れるデータ**: 加工時のノウハウ、失敗からの学び、エラー対応手順等。**全リレーションを埋める必要はなく、そのナレッジに関連するリソースだけ紐付ける。**

**例**: 「杉30mm板のポケット加工で焦げが出た→送り速度を上げて解決」→ 工具(ROUTER_6_DOWN) + 木材(杉KD材) + 機械(Biesse1) を紐付け

---

### 10. MemberマスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33d57092-44d2-81a9-abab-000b245388f0` |
| Notion URL | https://www.notion.so/33d5709244d2808292faffd634840798 |
| 役割 | 社内メンバーマスタ |
| Title列 | Name |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | メンバー名 |
| 役職 | select | アルバイト / 業務委託 / 正社員 / リーダー |
| 所属部署 | select | 部署 |
| SlackID | text | SlackのユーザーID |
| FurnitureマスターDB | relation | → Furniture |
| KnowledgeマスタDB | relation | → Knowledge |

**入れるデータ**: 製造に関わるメンバー一覧。SlackIDで自動連携の可能性あり。

---

### 11. CliantマスタDB

| 項目 | 値 |
|------|-----|
| data_source_id | `33d57092-44d2-81e8-92be-000b00631e6b` |
| Notion URL | https://www.notion.so/33d5709244d2802e87a2f51ee333d5bf |
| 役割 | 顧客マスタ（最小構成） |
| Title列 | Name |

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| Name | title | 顧客名 |
| contact | text | 担当者名 |
| FurnitureマスターDB | relation | → Furniture |

**入れるデータ**: 顧客情報。現状は最小限のスキーマ。

---

## 整備の優先順

1. FurnitureマスターDB — 空Title列の修正
2. 工具マスターDB — ToolJSONからのデータ投入（CAMとの連携のため最優先）
3. 機械マスタDB — 実機情報の投入
4. 外注先・拠点マスタDB — 拠点情報の投入
5. 木材/金物/塗料 — 材料マスタの投入
6. Project/Furniture — 過去PJデータの投入
7. Knowledge — 運用しながら蓄積
