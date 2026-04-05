# VUILD Project Hub — 開発ルール

## ファイル構成

```
fixture-drawing-previewer/
├── index.html                              ← ポータル（案件リスト + 全金物）
├── manual.html                             ← 操作マニュアル
├── candidates.json                         ← (旧) 使わない
├── CLAUDE.md                               ← このファイル
└── projects/
    ├── hitonomori_wallshelf/index.html      ← #1141 人の森
    ├── baum_mobile/index.html              ← #3040 BAUM
    ├── tokyo_rooftop/index.html            ← #1127 東京建物
    └── pan_kitchen/index.html              ← #1125 pan
```

## 重要ルール

### 1. データの分離
- **各プロジェクトページには、そのプロジェクトのデータだけを入れる**
- チャンネルとプロジェクトの対応:
  - C0AFAFBC8AH → hitonomori_wallshelf (#1141)
  - C09V70VFF96 → baum_mobile (#3040)
  - C09D1N2CEM8 → tokyo_rooftop (#1127)
  - C09455EDRJN → pan_kitchen (#1125)
- 他のプロジェクトのデータを混ぜない

### 2. ポータルとの同期
- **プロジェクトページのデータを変更したら、必ずポータル(index.html)のstatsも更新する**
- 更新すべきフィールド:
  - `stats.hardware` = hardwareCatalog の要素数
  - `stats.knowledge` = knowledgeData の要素数
  - `stats.bom` = bomData の合計金額（計算済みなら）
  - `updated` = 更新日

### 3. データスキーマ

#### hardwareCatalog (✅本採用された金物)
```javascript
{
  id: "HW_XXX",           // ユニークID
  name: "品名",
  product_code: "",        // 品番
  maker: "",               // メーカー
  price: 0,                // 単価
  product_url: "",         // 商品ページURL
  thumbnail_url: "",       // サムネイル画像URL
  category: "",            // カテゴリ
  specs: "",               // スペック・備考
  rhino_block: "",         // Rhinoブロック名
  source: "slack|auto|manual|ai_search",
  verified: true|false,
  created_at: "ISO8601",
  created_by: "名前",
  updated_at: null|"ISO8601",
  updated_by: null|"名前",
  history: [{date, by, action}]
}
```

#### candidatesData (🔍検討中の候補)
```javascript
{
  id: "CAND_XXX",
  name: "品名",
  product_url: "",
  product_code: "",
  maker: "",
  price: null,
  thumbnail_url: "",
  category: "",
  specs: "",
  source: "slack",
  slack_channel: "#チャンネル名",
  posted_by: "名前",
  posted_at: "YYYY-MM-DD",
  context: "Slackの文脈",
  status: "pending|adopted|dismissed"
}
```

#### knowledgeData (ナレッジ)
```javascript
{
  id: "K001",
  type: "progress|trouble|howto|spec",
  scope: "design|production",  // ← 表示先を決定するフィールド
  title: "タイトル",
  content: "内容",
  project_id: "案件ID",
  furniture_id: "furnitureID",
  posted_by: "名前",
  channel: "#チャンネル名",
  channel_id: "CXXXXXXXXXX",
  message_ts: "",
  date: "YYYY-MM-DD",
  slack_url: ""
}
```

#### ナレッジ scope 振り分けルール

| scope | 表示先 | 内容の例 |
|-------|--------|---------|
| `design` | 案件ページのみ | クライアント要件、敷地条件、設計判断、予算・コスト交渉、搬入・施工計画、運用方法、全体スケジュール |
| `production` | furnitureページのみ | 加工方法、素材選定、CNC設定、組立手順、塗装仕上げ、トラブルシュート、金物取付、品質管理 |

**判断基準**: 「この知見は他の案件でこのfurnitureを使うときに再利用できるか？」→ Yes なら `production`、No（この案件固有の話）なら `design`

### 4. Slackスタンプのマッピング
- ✅ (white_check_mark) → hardwareCatalog に登録
- 🔍 (mag) → candidatesData に status:"pending"
- ❌ (x) → candidatesData に status:"dismissed" または削除
- 💰 (moneybag) → BOMの発注チェックON
- :memo: → knowledge type:"progress"
- :warning: → knowledge type:"trouble"
- :bulb: → knowledge type:"howto"
- :triangular_flag_on_post: → knowledge type:"spec"

### 5. 変更手順チェックリスト

プロジェクトページを編集する時:
- [ ] 正しいプロジェクトフォルダのファイルを編集しているか確認
- [ ] データが正しいチャンネル/プロジェクトに対応しているか確認
- [ ] 変更後、ポータル(index.html)のstatsを更新
- [ ] git add → commit → push

### 5.1 スキャンフレームワーク（全モード共通の振り分けルール）

> **重要**: ユーザーからのフィードバックでこのフレームワークに変更が必要な場合、
> **必ずフレームワーク全体を表示し、変更箇所をユーザーに確認してから保存すること。**
> 勝手にルールを変えない。

#### 情報の振り分けルール

| 情報 | 行き先 | 判定基準 |
|------|--------|----------|
| furniture情報 | furnitureページ | VUILDが製作・移動できる・再利用可能（キッチンも置き式ならfurniture） |
| 建築工事情報 | 案件ページ | 壁/床/天井固定・工務店/設備屋が施工 |
| ナレッジ(production) | furnitureページ Knowledge | 加工・組立・塗装・搬送の知見（他案件で再利用可能な知見） |
| ナレッジ(design) | 案件ページ Knowledge | クライアント要件・予算・施工計画（この案件固有の話） |
| コスト(furniture単価) | furnitureコスト欄 | 1台あたり・材料費・取り数 |
| コスト(請求/外注/全体) | 案件コストタブ | 見積書・請求書・工務店手間・運送費 |
| 金物 | 親アイテムに従う | キッチンの金物→キッチン、配管の金物→案件 |
| 見積書・請求書・検収書(PDF/リンク) | 案件 or furnitureの documents[] | Slackのファイル添付・URL・スプレッドシート |

#### 写真の振り分けルール

| 写真の被写体 | 行き先 | 枚数上限 |
|-------------|--------|----------|
| 空間全体（複数furnitureが写る） | 案件ページ hero/gallery | hero 1 + gallery 5-6 = **max 7枚** |
| 特定furnitureが主役 | そのfurnitureページ hero/gallery | hero 1 + gallery 5-6 = **max 7枚** |
| 建築工事が主役 | 案件ページ gallery or 載せない | — |
| 施工中・加工中・WS | 載せない（ナレッジのimagesで参照） | — |
| 搬出・梱包 | 載せない | — |

写真の優先度: 黒部さん竣工写真 > 完成状態 > 使用シーン（人が使っている）
**横長写真を優先**（メイン表示がaspect-ratio 16:10のため、縦長写真は什器が見切れる）
年次タブがある案件: years[].gallery_photos に年ごとの写真セットを持つ

#### 年次案件ルール

**年次タブ判定基準:**

| 条件 | 判定 |
|------|------|
| 同一チャンネルに異なる年度のイベント/施工が含まれる | 年次タブあり |
| 年度ごとにfurniture構成が異なる | 年次タブあり |
| 同じfurnitureを複数年使い回し（レンタル等） | 年次タブなし（案件ごとに別管理） |

**years[] で年ごとに持つデータ:**

| データ | years[]に持つ | 案件トップに持つ |
|--------|-------------|---------------|
| furniture_ids | ○（年ごとに異なる） | 全年の合算も保持 |
| gallery_photos | ○（年ごとに異なる） | hero_photoは代表1枚 |
| cost_overview | ○（年ごとに異なる） | 合算totalを保持 |
| venue / event_date | ○ | — |
| team | — | ○（全年共通） |

**ナレッジの年フィルタ:**
ナレッジは年フィールドを持たず、dateの年で自動振り分け（2023-xx-xx → 2023タブ）

**UIの年次タブ切り替え対象:**
1. furniture一覧パネル ← years[].furniture_ids
2. gallery写真 ← years[].gallery_photos
3. 見積パネルのコスト ← years[].cost_overview
4. ナレッジパネル ← entriesのdateで年フィルタ
5. spec cardの会場・会期 ← years[].venue / event_date

#### 既存furniture同一判定ルール

チャンネル内で furnitureアイテムを検出した時:
1. furniture.json の全アイテムの name / name_en / series / tags を検索
2. 部分一致で候補を出す
3. 候補あり → 「既存の {id} と同一ですか？」とユーザーに確認
4. 同一 → その案件の furniture_ids に追加（case studyとして紐づけ）
5. 別物 → 新規furnitureとして登録

### 5.2 初回スキャン（「初回スキャン {チャンネルID}」）

**Step 1: 構造分析 → ユーザー確認**
- [ ] チャンネル全メッセージを読む
- [ ] 構造分析レポートを作成してユーザーに提示:
  - 案件名・クライアント・所在地
  - パターン判定: 年次（単年/複数年）/ furniture数 / 建築工事混在の有無
  - 年次判定（複数年の場合）: 各年度のfurniture構成・判定理由
  - furniture一覧: 名前・数量・単価 + **★既存 or 新規** の判定（年度別に表示）
  - 建築工事一覧（案件ページ行き）
  - 写真投稿者と枚数（黒部さんの竣工写真スレッド特定）
  - チーム体制
- [ ] **ユーザーの確認・補足・修正を受けてから次に進む**

**Step 2: データ生成（確定後）**
- [ ] 各furnitureについてfurniture単位で情報マッピング:
  - 既存furniture → case study追加 + この案件での使用ナレッジ/写真を追加
  - 新規furniture → スペック/ナレッジ/金物/コスト/写真を収集して新規作成
- [ ] 写真の仕分け・DL:
  - 黒部さん竣工写真スレッドの全画像を目視確認
  - 被写体判定（空間全体→案件 / 特定furniture→そのfurniture）
  - 枚数ルール適用 → DL → 圧縮(max 1600px, quality 80) → パス登録
- [ ] 案件レベル情報: projects.json更新（体制/コスト/タグ）
- [ ] ドキュメント生成: 製作ドキュメント(draft) + 案件ドキュメント(draft)
- [ ] 金物・候補の処理（スタンプルール + 重複チェック + 既存データ保護）

**Step 3: ページ生成 → デプロイ**
- [ ] 新規furniture/案件フォルダ作成 + detail-templateコピー
- [ ] scan_state.jsonにチャンネル登録
- [ ] ポータル(index.html)のstats更新
- [ ] git commit & push

**Step 4: 確認依頼**
- [ ] WEB URLを提示して確認依頼

### 5.3 アイテム検索スキャン（「{アイテム名}をスキャンして」）

- [ ] slack_search_public でアイテム名を横断検索
- [ ] ヒットチャンネルを スキャン済み / 未登録 に区別して表示
- [ ] 未登録チャンネルがあれば → 初回スキャン(5.2)に移行するか確認
- [ ] 登録済みチャンネルから情報照合 → furniture.jsonとの差分検出
- [ ] 差分を一覧表示してユーザーに確認 → OKでWEB反映

### 5.4 差分スキャン（「Slackスキャンして」）

- [ ] scan_state.json のactiveチャンネルのみ対象
- [ ] last_scanned_ts以降の新着メッセージを読む
- [ ] 5.1の振り分けルールで分類
- [ ] 🔩スレッド返信内のECリンクもチェック
- [ ] スタンプ分類（✅→採用、🔍→候補、❌→却下、💰→発注済み）
- [ ] 商品情報自動取得（tools/monotaro_scraper.py / WebFetch）
- [ ] **既存データ保護**: 登録済みアイテムのURL/価格/品番を上書きしない
- [ ] **重複チェック**: product_urlでドメイン+パス照合、重複追加しない
- [ ] 差分をユーザーに提示 → 確認後反映
- [ ] scan_state.json更新 → git push

### 6. Slack関連の設定

金物スレッドの特定:
- 🔩 (nut_and_bolt) が含まれるメッセージ = 金物選定スレッドの親
- そのスレッドの返信 = 金物候補

スキャン対象チャンネル（data/scan_state.json で管理）:
- C0AFAFBC8AH (#1141_人の森_ライブラリースペース) → hitonomori_wallshelf
- C09V70VFF96 (#3040_baum移動式什器) → baum_mobile
- C09D1N2CEM8 (#1127_東京建物_屋上庭園pj) → tokyo_rooftop
- C09455EDRJN (#1125_pan_門真新棟6f7grセルフビルドキッチン開発) → pan_kitchen
- C05AYV4KG3E (#393_楽天optimism) → rakuten_optimism
- C07K02J6SUE (#3035_尾道-千光寺山荘リニューアル) → onomichi_club
- C06KR848J0M (#3009_富山県立山のリノベ案件) → toyama_tateyama
- C086FBQ1EN4 (#3039_yokohamanarureweek2025) → yokohama_natureweek
- C06DWBFG927 (#3006_野毛町公園pj) → nogecho_park
- C07CPMPFB7X (#3028_ur赤羽台ws) → ur_akabane

金物スレッドの message_ts:
- C0AFAFBC8AH: 1775103698.252669
- C09V70VFF96: 1775107906.358789
- C09D1N2CEM8: 1775107921.787019
- C09455EDRJN: 1775107926.902659

### 6.1 スキャンロジック v2（3モード）

| モード | トリガー | 動作 |
|--------|---------|------|
| **差分スキャン** | 「Slackスキャンして」 | scan_state.json の登録済みチャンネルの新着のみ読む |
| **初回スキャン** | 「初回スキャン {チャンネルID}」 | 新チャンネル全量読み→構造分析→質問→データ生成 |
| **アイテム検索** | 「{アイテム名}をスキャンして」 | Slack横断検索→チャンネル特定→照合→差分提案 |

差分スキャンの仕組み:
- `data/scan_state.json` で前回スキャン位置を管理
- Slack APIの `oldest` パラメータで前回以降の新着のみ取得
- `status: "completed"` かつ30日以上スキャンなし → 自動スキップ
- 完了案件も明示指定すれば読める

### 6.2 ドキュメント生成

knowledge.json v3.0 のドキュメント機能:
- **production_documents**: furnitureごとの製作手順書（素材/加工/組立/下地・塗装/搬送/トラブル・教訓）
- **project_documents**: 案件ごとの振り返り資料（体制/現場条件/設計判断/コスト/施工計画/WS/外注/教訓）
- ステータス: draft → published（担当者レビュー後）
- UIはアコーディオン表示（furniture/projects の各detail-templateに実装済み）

### 7. GitHub
- リポジトリ: shungold/vuild-project-hub
- 公開URL: https://shungold.github.io/vuild-project-hub/
- ブランチ: main
- pushしたら1-2分で反映
