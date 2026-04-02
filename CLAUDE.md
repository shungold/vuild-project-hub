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
  title: "タイトル",
  content: "内容",
  posted_by: "名前",
  channel: "#チャンネル名",
  channel_id: "CXXXXXXXXXX",
  message_ts: "",
  date: "YYYY-MM-DD",
  slack_url: ""
}
```

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

Slackスキャン時（「Slackスキャンして」で全て実行）:
- [ ] 各チャンネルの🔩スレッドを読む
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
- [ ] 各プロジェクトページに正しいデータを振り分け（CLAUDE.mdのチャンネル対応表に従う）
- [ ] ポータル(index.html)のstatsを更新
- [ ] git push

### 6. Slack関連の設定

金物スレッドの特定:
- 🔩 (nut_and_bolt) が含まれるメッセージ = 金物選定スレッドの親
- そのスレッドの返信 = 金物候補

スキャン対象チャンネル:
- C0AFAFBC8AH (#1141_人の森_ライブラリースペース)
- C09V70VFF96 (#3040_baum移動式什器)
- C09D1N2CEM8 (#1127_東京建物_屋上庭園pj)
- C09455EDRJN (#1125_pan_門真新棟6f7grセルフビルドキッチン開発)

金物スレッドの message_ts:
- C0AFAFBC8AH: 1775103698.252669
- C09V70VFF96: 1775107906.358789
- C09D1N2CEM8: 1775107921.787019
- C09455EDRJN: 1775107926.902659

### 7. GitHub
- リポジトリ: shungold/vuild-project-hub
- 公開URL: https://shungold.github.io/vuild-project-hub/
- ブランチ: main
- pushしたら1-2分で反映
