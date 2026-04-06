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
  - C09455EDRJN → pan_kitchen (#1125_pan_門真新棟6f7grセルフビルドキッチン開発)
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

#### 案件名のルール

- 案件名（projects.json の `name`）は **Slackチャンネル名そのまま** を使う（勝手に翻訳・意訳しない）
- `conversations.info` APIでチャンネル名を自動取得 → そのまま `name` に設定
- 取得に必要なスコープ: `channels:read`, `groups:read`
- API取得できない場合 → **ユーザーに聞く**（推測で命名しない）
- 関連案件（WS、年次違い）は `#{番号}_チャンネル名 サブ名` （例: `#1125_pan 電材プロダクトWS`）

#### スキャン対象範囲

**チャンネル本文 + 全スレッド返信** を必ず両方スキャンする。
- `conversations.history` でチャンネル本文を取得
- `reply_count > 0` のメッセージに対して `conversations.replies` でスレッド返信を取得
- スレッド内にECリンク・金物候補・ナレッジが含まれることが多い（本文だけでは見逃す）
- **写真もスレッド返信に多数含まれる**（実績: 尾道で本文440枚 + スレッド356枚 = 合計796枚、黒部竣工写真の半数近くがスレッド内）
- 写真選定Phase Aのテキストシグナル収集もスレッド返信を対象に含めること

#### ナレッジ自動分類（スタンプなし）

スタンプ（📝⚠️💡🚩）がなくても、メッセージ内容からAIが自動分類する:

| scope | 判定キーワード（2つ以上一致で候補） |
|-------|----------------------------------|
| production | ShopBot, 切削, CAM, 加工, ビス, ボンド, 組立, 接合, サンダー, キシラデ, ウレタン, 研磨, 塗装, 搬入, 搬出, 梱包, 割れ, 欠け, 合板, ラワン, MDF, スギ, 無垢, 取り数, 面取り, 下地, 仕上げ, 養生, 人工, 工数, 再製作 |
| design | 見積, 請求, 予算, クライアント, 打ち合わせ, MTG, スケジュール, 納期, 現場, 設置, 仕様変更, 搬入経路 |

- 30文字未満のメッセージはスキップ
- bot/join/leaveメッセージはスキップ
- production / design の判定はキーワードスコアの高い方
- furniture紐づけ: メッセージ内のfurniture名キーワードでマッチング
- source: "ai_auto" として記録（スタンプ由来と区別）

#### 金物候補の自動検出

**ECリンクがある場合:**
- monotaro, amazon.co.jp, sugatsune, atomlt, rakuten.co.jp, askul, komeri, misumi 等のURLを検出
- スクレイピングで商品情報を取得 → candidates に登録

**ECリンクがない場合（テキスト名ベース）:**
- メッセージ内の金物名キーワード（cabineo, Lアングル, カグスベール, コンセント, ビス, ボルト, ダボ等）を検出
- 品番・URLなしで候補登録 → WEBに「⚠ 商品リンクを追加してください」プレースホルダー
- 次回スキャンでURLが追加されたら自動置換

**furniture紐づけ:**
- 金物が言及されたメッセージの文脈からfurniture_idを推定
- 親スレッドのテーマも参照（例: テーブルスレッド内のコンセント → cafe-table）
- 紐づけ不明の場合は案件レベルで登録

#### 情報の振り分けルール

| 情報 | 行き先 | 判定基準 |
|------|--------|----------|
| furniture情報 | furnitureページ | VUILDが製作・移動できる・再利用可能（キッチンも置き式ならfurniture） |
| 建築工事情報 | 案件ページ | 壁/床/天井固定・工務店/設備屋が施工 |
| ナレッジ(production) | furnitureページ Knowledge | 加工・組立・塗装・搬送の知見（他案件で再利用可能な知見） |
| ナレッジ(design) | 案件ページ Knowledge | クライアント要件・予算・施工計画（この案件固有の話） |
| コスト(furniture単価) | furnitureコスト欄 | 1台あたり・材料費・取り数 |
| コスト(請求/外注/全体) | 案件コストタブ | 見積書・請求書・工務店手間・運送費 |

**コスト表示の優先ルール:**

| 表示先 | 第1優先 | 第2優先 | 表示形式 |
|--------|--------|--------|---------|
| furnitureカード | `production_cost`（実績） | `cost_breakdown` の見積ベース値 | 金額 + ソース表示 |
| furniture詳細ページ | `production_cost` + `cost_breakdown` | documents[]内の見積PDFから抽出 | 内訳付き |
| 案件カード | `cost_overview.total`（実績） | 見積合計 | 金額 |

**ソース表記:**
- `auto`（Slackメッセージから自動抽出） → 「自動取得」と表示
- `estimate`（見積PDFから抽出） → 「見積ベース」と表示
- `manual`（手動入力・WEB編集） → 編集者名を表示（例: 「金子 手入力」）
- 実績値がない場合 → 「⚠ 見積ベース（実績未入力）」と表示

**スキャン時のコスト自動抽出:**
- Slackメッセージ内の金額パターン（○万円、¥○○、○○円）を検出
- furniture名キーワードとの共起でfurniture別に分類
- `cost_source: "auto"` + `cost_extracted_from: "slack_msg"` で記録
- 既存の手動入力値がある場合は上書きしない（手動優先）
| 金物 | 親アイテムに従う | キッチンの金物→キッチン、配管の金物→案件 |
| 見積書・請求書・検収書(PDF/リンク) | 案件 or furnitureの documents[] | 下記の振り分けロジック参照 |

**見積・参考資料の振り分けロジック:**

PDF/スプレッドシート/図面をSlackから検出した場合、以下の優先順序で振り分ける:

| 判定基準 | 振り分け先 | 例 |
|---------|----------|-----|
| ファイル名 or 前後テキストに**furniture名**が含まれる | そのfurnitureの documents[] | 「カフェテーブルお見積り」→ cafe-table |
| ファイル名 or 前後テキストに**部品名/パーツ名**が含まれる | 該当furnitureの documents[] | 「ソファ脚部加工見積」→ bench-a |
| ファイル名に**図面/三面図/モデル**を含む | そのfurnitureの documents[] | 「テーブル三面図.pdf」→ cafe-table |
| ファイル名に**案件全体**を示す語を含む | 案件の documents[] | 「FFE什器製作 お見積書」「全体見積」 |
| 請求書・検収書（案件全体の支払い） | 案件の documents[] | 「御請求書 2末」 |
| 搬送/搬入計画 | 案件の documents[] | 「トラックシミュレーション」 |
| **判定不能** | 案件の documents[] にデフォルト配置 | — |

同一PDFが案件とfurniture両方に関連する場合 → **両方に登録**（例: 「A・Bベンチお見積り」→ bench-a + bench-b + 案件）

**cost_breakdownの値の型:**
- 数値（例: `150000`）と文字列（例: `"約9万円"`）の両方を許容する
- Slackから自動抽出した場合、金額が曖昧なことが多いため文字列で格納（例: `"約9万円"`, `"45〜50万円"`）
- 手動入力・見積PDFパースで確定値が得られた場合は数値で格納
- UI側は `typeof v === 'number'` で判定し、数値ならformatPrice、文字列ならそのまま表示

#### WEB表示のフォールバックルール

| 要素 | 第1優先 | 第2優先 | 第3優先 |
|------|--------|--------|--------|
| furnitureカードのサムネイル | `hero_photos[0]` | `gallery_photos[0]` | プレースホルダー文字 |
| furnitureカードのコスト | `production_cost` | `cost_breakdown`から見積値抽出 | 「コスト未取得」 |
| furnitureヒーロー画像 | アクソメSVG | ViewCapture（3Dパース） | 空欄 |
| 案件カードのコスト | `cost_overview.total` | — | 「コスト未取得」 |

#### テンプレート変更時のデプロイルール

detail-template.htmlを変更したら、全ページに反映する:
```
# furniture
cp furniture/detail-template.html furniture/*/index.html
# projects
cp projects/detail-template.html projects/*/index.html
# materials
cp materials/detail-template.html materials/*/index.html
```
変更後は必ず全ページにデプロイしてからcommit & push。

#### 写真の振り分けルール

| 写真の被写体 | 行き先 | 枚数上限 |
|-------------|--------|----------|
| 空間全体（複数furnitureが写る引き画） | 案件ページ hero/gallery | hero 1 + gallery 5-6 = **max 7枚** |
| 特定furnitureが主役（引き画） | そのfurnitureページ gallery | **max 7枚** |
| ディテール寄り（金物・接合部・仕上げ・天板アップ等） | そのfurnitureページ gallery **のみ** | galleryに含む（furnitureでは重要） |
| 建築工事が主役 | 案件ページ gallery or 載せない | — |
| 施工中・加工中・WS | 原則載せない（ナレッジのimagesで参照） | — |
| 搬出・梱包 | 載せない | — |

**案件ページの写真選定ルール（追加）:**
- 案件ページには **空間を見渡せる引き画のみ** を採用する
- ディテール寄り画像（天板アップ、金物クローズアップ、素材テクスチャ等）は **案件ページNG** → furnitureページに回す
- ギャラリーの並び順は **空間・エリア別** に整理する（例: 7F→6F→共用部→WS）
- 複数エリアがある案件では、各エリアから最低1枚ずつ選ぶ

写真の優先度: 黒部さん竣工写真 > 完成状態 > 使用シーン（人が使っている）
**横長写真を優先**（メイン表示がaspect-ratio 16:10のため、縦長写真は什器が見切れる）
年次タブがある案件: years[].gallery_photos に年ごとの写真セットを持つ

**furnitureのhero_photos:**
- 第1優先: Rhinoモデルのアクソメ画像（`photos/placeholders/axo-{id}.svg`）
- 第2優先: Slackから取得したViewCapture画像（3Dパース・レンダー風のもの。CAMパスや2D図面は不可）
- 第3優先: **空欄**（アクソメもViewCaptureもない場合は無理に写真を入れない）
- ※ 竣工写真をheroに使わない — heroはあくまで3Dモデル由来の画像

**アクソメ / 3Dモデル画像の収集ルール:**

スキャン時にチャンネルから以下を自動検出:

| 対象 | 検出方法 | 用途 |
|------|---------|------|
| アクソメSVG | 既存の `photos/placeholders/axo-{id}.svg` を確認 | hero_photos 第1優先 |
| ViewCapture画像 | ファイル名に `ViewCapture` を含むPNG | hero候補（3Dパース風のもののみ。CAM/2D図は除外） |
| 3dmモデル | `.3dm` 拡張子のファイル | WEBに掲載してDLリンク提供 |

ViewCaptureのhero適格判定（Phase Bの画像認識で判定）:
- ✅ 3Dパース・レンダー風（立体的にプロダクトが見える）
- ❌ CAMパス表示（加工データの2D表示）
- ❌ 2D図面・寸法図（正面図・平面図）
- ❌ 取り数・板取り図

**写真の圧縮ルール（WEB掲載時に必ず適用）:**

SlackからDLした写真はそのままでは高解像度（3000-6000px, 3-6MB/枚）でWEB表示が重い。
DL後に必ず以下の圧縮を適用する:

| 設定 | 値 |
|------|-----|
| 最大辺 | **1600px**（長辺が1600pxを超える場合リサイズ、アスペクト比維持） |
| 品質 | **80**（JPEG quality 80） |
| フォーマット | JPEGに統一（PNGの写真→JPGに変換。ViewCapture等のPNGはPNGのまま） |
| 既に小さい場合 | max(w,h) ≤ 1600 かつ 500KB未満 → スキップ |

実績: 尾道26枚で 101MB → 4MB（95%削減）

圧縮スクリプト: `tools/compress_photos.py`
タイミング: Step 2のPhase C完了後、写真DL直後に自動実行

**3Dモデルの収集・掲載ルール:**

| 処理 | 内容 |
|------|------|
| 検出 | チャンネル本文 + スレッド返信から `.3dm` `.obj` `.stl` ファイルを収集 |
| 選定 | furniture名キーワードで紐づけ → **最新版のみ**採用（同名ファイルは日付が新しい方） |
| 除外 | スタディ・検討用モデル（ファイル名に「スタディ」「tmp」「検討」）は除外 |
| 保存 | `storage/furniture/{id}/models/` にDL + `models/furniture/` にもコピー（Git管理） |
| WEB | furniture.json の `model_url` にパスを登録 → WEB上でDLリンクを表示 |
| 案件モデル | 搬送シミュレーション等 → `storage/projects/{id}/models/` に保存、案件ページで参照 |

**写真不足時の代替ルール（galleryに適用）:**

竣工写真が少ないfurniture（例: パーティション等、被写体として撮られにくいもの）の場合、
以下の順序で代替写真を採用する:

1. 竣工写真（通常ルール）
2. **完成形に近い施工中写真**（設置完了直後、仕上げ済みの状態）— 施工中でも完成形が見えるものは採用可
3. **縦長写真**（横長が足りない場合、縦長も採用する）
4. 3Dモデルのキャプチャ画像（ViewCapture等）

※ 明らかに加工途中・工場内・養生中の写真は代替でも不可

**写真ピン（photo_pins）:**

写真上に金物・furnitureの位置をピンで示す機能。hero以外のgallery写真にも配置可能（photo_indexで区別）。
ピンをクリックすると、リンク先の詳細ページに遷移する。

| フィールド | 内容 |
|-----------|------|
| photo_index | 対象写真のインデックス（0 = hero、1〜 = gallery） |
| x, y | ピン位置（%座標、左上起点） |
| type | "furniture" or "material" |
| id | furniture_id or material_id |
| label | 表示ラベル |

**ページ種別ごとのピン振り分けルール:**

| ページ | 立てるピンの種類 | 例 |
|--------|----------------|-----|
| 案件写真 | **furniture** → furnitureページへリンク | 「カフェテーブル」「ベンチA」 |
| 案件写真 | **建築金物・素材** → 金物ページへリンク | 壁紙、コンセントプレート等 |
| furniture写真 | **什器系金物** → 金物ページへリンク | cabineo8、Lアングル、カグスベール等 |
| furniture写真 | furnitureピンは立てない（自分自身のページだから） | — |

※ 案件が建築工事を含まない場合（例: 尾道）、案件写真のピンはfurnitureのみ（建築金物なし）

**スキャン時のピン自動生成フロー:**

写真選定の Phase C 完了後（写真が確定した後）に実行:

1. **選定済み写真を全て画像認識で分析** — 写っている金物・furnitureを特定
2. **ピン位置（x, y %座標）を推定** — 被写体の視覚的な中心位置を推定
3. **ピン候補リストを生成**:

| 精度レベル | 条件 | ピン位置精度 |
|-----------|------|------------|
| 高（±5%以内） | 金物が写真上で視覚的にはっきり見える（コンセント、脚金物等） | 被写体の中心座標 |
| 中（推定） | 金物が隠れている（内部接合金物: cabineo、Lアングル等） | 接合部付近の推定座標 + ラベルに「内部」と注記 |
| 高 | furniture全体（案件写真のfurnitureピン） | 被写体が大きいので中心を特定 |

4. **ユーザーに候補リストを提示** — 写真名 + ピン内容 + 座標をテーブルで表示
5. **ユーザー確認後** → photo_pins[] に登録

- hero写真だけでなく **gallery写真にもピンを生成** する（photo_indexで区別）
- Web上では PinEditor（common.js）で編集・追加・削除が可能（localStorageに保存 → エクスポート）

#### 写真選定の3フェーズ判定

Step 1の構造分析で把握したfurniture構成を使い、写真を構造に紐づけて選定する。

**Phase A: テキストシグナルで一次分類**

各写真について以下のシグナルを収集し、どのfurniture/案件に属するか判定する:

| シグナル | 判定方法 | 精度 |
|---------|---------|------|
| メッセージテキスト | furniture名キーワードが直接含まれる | 最高 |
| スレッド親メッセージ | 写真がスレッド返信内 → 親テキストにfurniture名 | 高 |
| 時系列クラスタ | 同一人物が数分以内に連投 → 同一撮影セッション → 同じ被写体 | 高 |
| 前後メッセージ | 写真の前後5件のメッセージにfurniture名言及 | 中 |
| 投稿者パターン | 黒部さんがまとめて投稿 → 竣工写真一式（空間全体の確率高） | 中 |
| タイムスタンプ | 設置日・納品日付近 → 完成写真 / 年度判定（年次タブ用） | 中 |
| ファイル名連番 | カメラ連番（_H0A8395〜_H0A8410等）→ 同じ番号帯＝同一セッション | 低〜中 |

一次分類の結果:
- furniture特定できた → そのfurnitureに仮分類
- 「全体」っぽい（黒部バッチ投稿 + furniture名言及なし） → 案件に仮分類
- 判定不能 → Phase Bへ

**バッチ投稿の個別判定ルール:**
- 1投稿に3枚以上の写真がある場合 → バッチ投稿と判定
- バッチ投稿でテキストシグナルがない（コメントなし）場合:
  → 全写真を自動的にPhase B（画像認識）送りにする
  → **1枚ずつ個別に被写体判定する**（バッチ全体を同一分類にしない）
- 理由: 黒部さんの竣工写真は1投稿で複数エリアをまとめて投稿するパターンが多く、
  1投稿内で異なるfurnitureが混在する（実績: ONOMICHI2シリーズ8枚中にpartition3枚+cafe-table5枚が混在）

**Phase B: 画像認識で二次分類**

Phase Aで仮分類した上位候補（各グループ上位10枚程度）+ 判定不能写真 + バッチ投稿写真をDLし、
Claude が画像を Read で確認して被写体を判定する:

- Step 1で把握したfurnitureの特徴（形状・素材・色・サイズ）と照合
  - 例: 木製の箱型で3段積み → タウンユニット
  - 例: 波形の座面 → ナミナミベンチ
  - 例: 人工芝が貼ってある立方体 → 芝キューブ
  - 例: 空間全体が見渡せる引き画 → 案件ページ
  - 例: 加工中・工場内 → 載せない
- 仮分類の確認 + 判定不能写真の最終分類
- 全写真にPhase Bを適用すると重いため、Phase Aで絞り込んだ候補のみに使用

**Phase C: グルーピング＋スコアリング＋ユーザー確認**

1. furniture別 + 案件用にグルーピング
2. 各グループ内でスコアリング（横長+10 / 黒部+15 / リアクション / サイズ等）
3. 枚数上限適用（max 7枚/グループ）
4. 年次案件: タイムスタンプで年度に振り分け → years[].gallery_photos
5. ユーザーに写真リスト提示（グループ別・スコア順） → 確認後DL＋パス登録

#### 年次案件ルール

**年次タブ判定基準:**

| 条件 | 判定 |
|------|------|
| 同一チャンネルに異なる年度のイベント/施工が含まれる | **別案件** + 関連案件として紐づけ |
| 年度ごとにfurniture構成が異なる | **別案件**（各案件に独自のfurniture_ids） |
| 同じfurnitureを複数年使い回し（レンタル等） | 各案件のfurniture_idsに同じIDを登録 |

**年次タブは使わない。** 年度違いは常に別案件として登録し、`related_projects` で紐づける。
例: 楽天Optimism 2023 と 楽天Optimism 2024 は別案件。各案件ページの「関連案件」セクションで相互リンク。

#### WSイベントの管理ルール

案件の成果物としてWSが含まれる場合（セルフビルド、塗装体験、組立WS等）、
`ws_events[]` として構造化して管理する。

**データ構造（projects.json に追加）:**
```json
"ws_events": [
  {
    "id": "WS001",
    "name": "7Fキッチン天板塗装WS",
    "date": "2025-06-15",
    "furniture_id": "pan-kitchen-7f",
    "participants": "パナソニック社員 約15名",
    "description": "7階造作キッチンの天板をパナソニック社員がウレタン塗装",
    "tasks": ["天板研磨", "下塗り", "ウレタン塗装"],
    "photos": ["photos/projects/pan_kitchen/ws-7f-paint-01.jpg"],
    "lessons": "初心者は塗りムラが出やすい → サンプル板で練習してから本番"
  }
]
```

**検出方法（Step 1 構造分析時）:**
- メッセージ内の「WS」「ワークショップ」「セルフビルド」「塗装体験」「組立体験」等
- 特定の日付 + 参加者の言及
- furnitureとの紐づけ（どのfurnitureに対するWSか）

**振り分けルール:**

| 要素 | 行き先 |
|------|--------|
| WSイベント情報 | 案件ページの「WS」タブ |
| WS中の写真（完成に向かう作業） | 案件ページ WSタブ内に表示 ← **「施工中は載せない」ルールの例外** |
| WS中の写真（準備・片付け） | 載せない |
| WSで完成したfurnitureの写真 | furnitureページのgalleryにも掲載可 |
| WSのナレッジ（段取り・教訓） | 案件ドキュメントの「WS運営」セクション → scope: "design" |
| WSのナレッジ（加工・塗装のコツ） | furnitureの製作ドキュメント → scope: "production" |

**WS写真の優先度:** 完成に近い状態 > 参加者が作業中 > 準備中
**WS写真の枚数:** 各WSイベントごとに max 5枚

**案件ページUIの「WS」タブ:**
- WSイベントをカード形式で表示
- 各カード: 名前 + 日付 + 対象furniture + 参加者 + 概要 + 写真ギャラリー + 教訓
- furnitureへのリンクバッジ付き

#### 完了判定 → ドキュメント生成ルール

**完了判定基準:**

| 対象 | 完了条件 |
|------|---------|
| 案件 | projects.json の status: "completed" |
| furniture | 紐づく全案件が completed（activeな案件が1つもない） |

**完了時の必須処理:**

案件またはfurnitureが完了状態の場合、スキャン時に以下を必ず実行:

1. knowledge.json からそのIDに紐づくナレッジを全て収集
2. 製作ドキュメント（furniture）/ 案件ドキュメント（project）を自動生成
3. ドキュメントの各セクションについて情報充足度を判定
4. WEBページに掲載

**情報不足時のWEB表示:**

ドキュメントの各セクションについて、情報が不十分な場合はWEB上にプレースホルダーを表示する:

| セクション | 不十分の判定 | WEB表示 |
|-----------|-------------|---------|
| 素材 | 合板種類・厚みが不明 | 「⚠ 素材情報を追加してください（合板種類・厚み等）」 |
| 加工 | CNC設定・注意点なし | 「⚠ 加工情報を追加してください（CNC設定・取り数等）」 |
| 組立 | 接合方法・金物記載なし | 「⚠ 組立情報を追加してください（接合方法・金物等）」 |
| 下地・塗装 | 塗装工程記載なし | 「⚠ 塗装情報を追加してください（工程・塗料等）」 |
| 搬送 | 梱包・車種記載なし | 「⚠ 搬送情報を追加してください（梱包方法・車種等）」 |
| トラブル・教訓 | 記載なし | 「⚠ トラブル・教訓を追加してください」 |
| 体制（案件） | クライアント・窓口不明 | 「⚠ 体制情報を追加してください（クライアント・窓口等）」 |
| 現場条件（案件） | 搬入経路・制約なし | 「⚠ 現場条件を追加してください（搬入経路・制約等）」 |
| 設計判断（案件） | 仕様変更経緯なし | 「⚠ 設計判断を追加してください（変更経緯・理由等）」 |
| コスト（案件） | 請求構造なし | 「⚠ コスト情報を追加してください（請求構造・内訳等）」 |
| 施工計画（案件） | 工程記載なし | 「⚠ 施工計画を追加してください（工程表・段取り等）」 |

プレースホルダーはユーザーがSlackやWEB編集UIから情報を追加した後、次回スキャン時に自動で置き換わる。

#### 関連案件の整理ルール

1チャンネル内に複数の案件が共存するケースを統一的に扱う。

**関連案件が発生するパターン:**

| パターン | 例 | 整理方法 |
|---------|-----|---------|
| WS/イベント | pan門真 + 電材プロダクトWS | 別案件 + related_projects |
| 年度違い | 楽天2023 + 楽天2024 | 別案件 + related_projects |
| フェーズ違い | 1期工事 + 2期工事 | 別案件 + related_projects |

**全て同じ仕組みで処理する — 年次タブは使わない。**

**検出方法:**
- メッセージ内の「WS」「ワークショップ」「2023」「2024」「1期」「2期」等
- 異なるfurnitureセットが異なる文脈・時期で言及されている
- ユーザーのStep 1確認時に分割方針を決定

**整理方法:**

| 要素 | 扱い |
|------|------|
| 各案件 | **別のproject ID**で登録（独自のfurniture_ids, photos, cost, knowledge） |
| furniture | 各案件のfurniture_idsに紐づけ |
| 共有furniture（レンタル等） | 両方のfurniture_idsに同じIDを登録 |
| 写真/ナレッジ/コスト | 該当案件に振り分け |
| 共通写真 | 両方に登録可 |

**projects.jsonの関連案件フィールド:**
```json
{
  "id": "pan_kitchen",
  "related_projects": [
    {"id": "pan_denzai_ws", "label": "電材プロダクトWS", "relation": "ws"},
    {"id": "rakuten_2024", "label": "楽天Optimism 2024", "relation": "year"}
  ],
  "parent_project": null
}
```
- `relation`: "ws" | "year" | "phase" | "related"
- 子案件には `"parent_project": "pan_kitchen"` を持たせる（任意）

**WEB UIの「関連案件」セクション:**
- 案件詳細ページの下部に「関連案件」カードを表示
- カードにはサムネイル + 案件名 + relation種別バッジ + リンク
- relation種別に応じたバッジ: WS / 2024 / 2期 等

#### エリア × furniture マッピングルール

**Step 1の構造分析で必ずエリアマップを作成する。**

複数エリア（フロア・ゾーン等）がある案件では、どのfurnitureがどのエリアに配置されるかを
明示的に整理し、ユーザーに確認する。このマッピングは以降の全工程で使う。

**Step 1で作成するエリアマップの例:**
```
エリア: 7F（7階キッチンエリア）
  └ 7F造作キッチン（ステンレス壁面キッチン）
  └ MKU typeA / B / C（可動式木製ユニット）
  └ 電材スツール

エリア: 6F（6階ラウンジエリア）
  └ 6F造作キッチン（テクスチャパネルカウンター）
  └ 芝キューブ 2連 / 3連 / 4連
```

**ユーザーへの確認テンプレート:**
```
各エリアに配置されるfurnitureの対応を確認させてください：
- 7F: [furniture A, B, C...]
- 6F: [furniture D, E, F...]
合ってますか？
```

**エリアマップの用途:**
1. **写真分類**: 写真がどのエリアで撮られたかを判定 → そのエリアのfurnitureに振り分け
2. **写真選定**: furnitureページには **そのfurnitureが主役として写っている写真のみ** を採用
3. **案件ギャラリー**: 各エリアからバランスよく選ぶ
4. **ピン配置**: エリア全景写真に、そのエリアのfurnitureピンを配置

**写真選定時のエリアマップ活用ルール:**
- furnitureページの写真は「そのfurnitureが画面の主役（面積50%以上 or 中央に位置）」のみ
- 手前に別のfurnitureが大きく映っていて、対象が背景になっている → NG
- 什器が一切映っていない写真（工事現場・空間のみ） → furniture/案件ともにNG
- エリア全景で複数furnitureが映る写真 → **案件ページのみ**に使う（furnitureページには使わない）

#### 複合furniture構成の整理ルール

1つのチャンネルに、階層・タイプ・連数などで複数バリエーションがある場合:

**階層/フロアで分ける場合:**
- 同じカテゴリでも設置階や用途が異なる → 別furniture
- 例: 6階造作キッチン / 7階造作キッチン

**タイプで分ける場合:**
- 形状・サイズ・構成が異なるバリエーション → 別furniture
- 例: モバイルキッチンユニット type A / type B / type C

**連数/ブロック数で分ける場合:**
- 同じ単体ブロックの組み合わせ数が異なる → 別furniture
- 例: 芝キューブ 2連 / 3連 / 4連

**IDの命名規則:**
- 階層: `{project}-kitchen-6f` / `{project}-kitchen-7f`
- タイプ: `{project}-mobile-kitchen-a` / `-b` / `-c`
- 連数: `{project}-shiba-2ren` / `-3ren` / `-4ren`

#### 既存furniture同一判定ルール

チャンネル内で furnitureアイテムを検出した時:
1. furniture.json の全アイテムの name / name_en / series / tags を検索
2. 部分一致で候補を出す
3. 候補あり → 「既存の {id} と同一ですか？」とユーザーに確認
4. 同一 → その案件の furniture_ids に追加（case studyとして紐づけ）
5. 別物 → 新規furnitureとして登録

### 5.2 初回スキャン（「初回スキャン {チャンネルID}」）

**Step 1: 構造分析 → ユーザー確認**
- [ ] `conversations.info` APIでチャンネル名を取得 → そのまま案件名に使う（推測禁止）
- [ ] チャンネル全メッセージ + 全スレッド返信を読む
- [ ] 構造分析レポートを作成してユーザーに提示:
  - 案件名（= チャンネル名）・クライアント・所在地
  - パターン判定: 年次（単年/複数年）/ furniture数 / 建築工事混在の有無
  - **エリア × furnitureマッピング**: どのエリア（フロア/ゾーン）にどのfurnitureが配置されるか（5.1参照）
  - 年次判定（複数年の場合）: 各年度のfurniture構成・判定理由
  - furniture一覧: 名前・数量・単価 + **★既存 or 新規** の判定（年度別に表示）
  - 建築工事一覧（案件ページ行き）
  - 写真投稿者と枚数（黒部さんの竣工写真スレッド特定）
  - チーム体制（チャンネル参加者の投稿内容・役割言及から抽出。**他案件のチームをコピーしない**）
- [ ] **ユーザーの確認・補足・修正を受けてから次に進む**

**Step 2: データ生成（確定後）**
- [ ] 各furnitureについてfurniture単位で情報マッピング:
  - 既存furniture → case study追加 + この案件での使用ナレッジ/写真を追加
  - 新規furniture → スペック/ナレッジ/金物/コスト/写真を収集して新規作成
- [ ] 写真の仕分け・DL（5.1「写真選定の3フェーズ判定」に従う）:
  - Phase A: テキストシグナルで一次分類（メッセージ文脈・スレッド・時系列クラスタ・前後メッセージ）
  - Phase B: 判定不能＋上位候補をDL → Claude画像認識でfurniture照合
  - Phase C: グルーピング → スコアリング（横長/黒部/リアクション） → 枚数上限 → ユーザー確認
  - 確認後: DL → 圧縮(max 1600px, quality 80) → パス登録
- [ ] 案件レベル情報: projects.json更新（体制/コスト/タグ）
- [ ] ドキュメント生成: 製作ドキュメント(draft) + 案件ドキュメント(draft)
- [ ] 完了判定: 案件のstatus確認
  - completed → 製作ドキュメント + 案件ドキュメントを必ず生成（5.1「完了判定ルール」に従う）
  - 各セクションの充足度チェック → 不足セクションにプレースホルダー設置
  - active → ドキュメント生成はスキップ（ナレッジ蓄積のみ）
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
- [ ] 完了案件のドキュメント更新チェック:
  - 新規ナレッジが追加された完了案件 → ドキュメント再生成
  - プレースホルダーが埋まったか判定 → 埋まったら置換
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
