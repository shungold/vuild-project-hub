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

#### 差分スキャン（「Slackスキャンして」）:
- [ ] data/scan_state.json を読み、active チャンネルのみ対象にする
- [ ] 各チャンネルの🔩スレッドを読む（last_scanned_ts 以降の新着のみ）
- [ ] スレッド返信内のECリンクも必ずチェックする（チャンネル本文だけでなく）
- [ ] スタンプに基づいてデータを分類（✅→採用、🔍→候補、❌→却下、💰→発注済み）
- [ ] チャンネル本文からナレッジを自動判別（progress/trouble/howto/spec）
- [ ] 商品情報を自動取得（Pythonスクレイパー tools/monotaro_scraper.py を使用）:
  - MonotaRO: スクレイパーで商品名・品番・メーカー・価格(税込)・画像URLを取得
  - その他ECサイト: WebFetchでOGP/JSON-LDから商品情報を取得
  - Slack添付画像: ファイル名は検知可能だがURL取得不可（手動DL必要）
- [ ] **既存データの保護（重要）**:
  - 既にhardwareCatalogに登録済みのアイテムは、WEB上で手動修正された可能性がある
  - スキャン時に既存アイテムのproduct_url、price、product_code、thumbnail_url、specsを上書きしない
  - 新規アイテム（Slackに新しく投稿されたもの）のみ追加する
  - 既存アイテムのステータス変更（スタンプ変更）のみ反映する
  - URLや価格を更新したい場合はユーザーに確認してから行う
- [ ] **重複チェック（重要）**:
  - 候補追加前に、そのURLが既にhardwareCatalog or candidatesDataに存在しないか確認する
  - product_urlの一部（ドメイン+パス）で照合する（クエリパラメータは無視）
  - 既に採用済み(hardwareCatalog)のURLは候補に追加しない
  - 既に候補(candidatesData)にあるURLは重複追加しない
  - 既に却下(status:"dismissed")されたURLも再追加しない
- [ ] 各プロジェクトページに正しいデータを振り分け（CLAUDE.mdのチャンネル対応表に従う）
- [ ] ポータル(index.html)のstatsを更新
- [ ] scan_state.json の last_scanned_ts / last_scanned_at を更新
- [ ] git push

#### 初回スキャン（「初回スキャン {チャンネルID}」）:
- [ ] Step 1: チャンネル全量読み → 構造分析（案件種別、furniture/建築工事の識別、年度分割検出）
- [ ] Step 2: 質問フェーズ（「furniture N アイテム検出しました。この構成でOK？」）
- [ ] Step 3: ユーザー確認後にデータ生成
  - projects.json / furniture.json / materials.json / knowledge.json 更新
  - 製作ドキュメント・案件ドキュメントをdraftで生成
  - 写真特定（黒部さん優先）→ DLリスト提示
  - scan_state.json にチャンネル登録
  - HTMLページ生成（detail-templateコピー）→ commit & push
- [ ] Step 4: WEB URLを提示して確認依頼

#### アイテム検索（「{アイテム名}をスキャンして」）:
- [ ] Slack横断検索（slack_search_public）でアイテム名を検索
- [ ] スキャン済み / 未登録チャンネルを区別して表示
- [ ] 各チャンネルからアイテム関連情報を抽出（仕様・数量・素材・金物・ナレッジ）
- [ ] 現在のfurniture.jsonと比較、不足データを検出
- [ ] 差分を一覧表示してユーザーに確認 → OKでWEB反映

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
