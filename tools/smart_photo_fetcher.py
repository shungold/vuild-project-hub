"""
VUILD Furniture - Smart Photo Fetcher v3
Reads channel history, scores photos by reactions/pins/keywords, downloads best ones.

スコアリングルール: CLAUDE.md セクション5.1「写真の振り分けルール」を参照

Usage:
  py smart_photo_fetcher.py --token xoxp-TOKEN --channel C05F108MS3W --out town-unit/nagoya --limit 5
  py smart_photo_fetcher.py --token xoxp-TOKEN --pid 395 --out town-unit/nagoya --limit 5
  py smart_photo_fetcher.py --token xoxp-TOKEN --all
"""

import requests, os, sys, argparse
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
# DL先: VUILDlibrary/furniture-photos/ （Git管理下・GitHub Pages公開）
BASE = Path(__file__).parent.parent / "furniture-photos"
PHOTO_EXT = {".jpg", ".jpeg", ".png"}


def api(token, method, params=None):
    r = requests.get(f"https://slack.com/api/{method}",
                     headers={"Authorization": f"Bearer {token}"}, params=params or {})
    return r.json()


def find_channel(token, pid):
    """Find channel by project number e.g. '395' -> C05F108MS3W"""
    pid = str(pid).lstrip("#")
    d = api(token, "conversations.list", {
        "types": "public_channel,private_channel", "limit": 1000, "exclude_archived": "true"
    })
    for ch in d.get("channels", []):
        name = ch.get("name", "")
        if name.startswith(pid + "_") or name.startswith(pid + "-"):
            return ch["id"], ch["name"]
    # fuzzy
    for ch in d.get("channels", []):
        if pid in ch.get("name", ""):
            return ch["id"], ch["name"]
    return None, None


def scan_channel_for_photos(token, channel_id, max_msgs=1000):
    """Read channel history, collect photos with context scores"""
    photos = []  # list of {file_info, msg_score, msg_text}
    cursor = None
    fetched = 0

    while fetched < max_msgs:
        params = {"channel": channel_id, "limit": 200}
        if cursor:
            params["cursor"] = cursor
        d = api(token, "conversations.history", params)
        if not d.get("ok"):
            print(f"  API error: {d.get('error')}")
            break
        msgs = d.get("messages", [])
        if not msgs:
            break

        for msg in msgs:
            files = msg.get("files", [])
            if not files:
                continue

            text = msg.get("text", "").lower()
            msg_reactions = msg.get("reactions", [])
            msg_rx_count = sum(r.get("count", 0) for r in msg_reactions)

            # Message-level scoring
            msg_score = 0
            # KUROBE bonus (photographer who takes completion photos)
            if msg.get("user") == "U9UBC4K6K":
                msg_score += 15
            # Reactions on the message
            msg_score += min(msg_rx_count * 3, 20)
            # Pinned
            if msg.get("pinned_to"):
                msg_score += 25
            # Good keywords in message text
            for w in ["完成", "納品", "設置完了", "全景", "仕上", "いい感じ", "最高", "かっこいい", "きれい"]:
                if w in text:
                    msg_score += 8
            # Bad keywords
            for w in ["検討", "修正", "確認", "質問", "エラー", "ミス"]:
                if w in text:
                    msg_score -= 5

            for f in files:
                mime = f.get("mimetype", "")
                if not mime.startswith("image/"):
                    continue
                name = f.get("name", "").lower()
                ext = os.path.splitext(name)[1]
                if ext not in PHOTO_EXT:
                    continue

                # File-level scoring
                file_score = 0
                size = f.get("size", 0)
                if size > 2_000_000:
                    file_score += 20
                elif size > 1_000_000:
                    file_score += 15
                elif size > 500_000:
                    file_score += 10
                elif size < 50_000:
                    file_score -= 20

                # File reactions
                file_rx = f.get("reactions", [])
                file_score += min(sum(r.get("count", 0) for r in file_rx) * 5, 25)

                # Penalize screenshots
                if "スクリーンショット" in name or "screenshot" in name:
                    file_score -= 20
                if name == "image.png":
                    file_score -= 15
                if name.endswith(".png"):
                    file_score -= 3

                # Prefer JPG (real camera photos)
                if name.endswith((".jpg", ".jpeg")):
                    file_score += 5

                # Aspect ratio scoring — landscape photos look better in card layout
                ow = f.get("original_w", 0)
                oh = f.get("original_h", 0)
                if ow and oh:
                    ratio = ow / oh
                    if ratio >= 1.3:        # landscape (4:3+)
                        file_score += 10
                    elif ratio >= 1.0:      # slightly landscape / square
                        file_score += 3
                    elif oh > ow * 1.5:     # extreme portrait
                        file_score -= 10
                    else:                   # mild portrait
                        file_score -= 3

                total = msg_score + file_score
                photos.append({
                    **f,
                    "_total_score": total,
                    "_msg_score": msg_score,
                    "_file_score": file_score,
                    "_msg_text": msg.get("text", "")[:80],
                    "_msg_rx": msg_rx_count,
                })

        fetched += len(msgs)
        cursor = d.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break

    return photos


def download(token, f, dest):
    url = f.get("url_private_download") or f.get("url_private")
    if not url:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, stream=True)
    if r.status_code != 200:
        return False
    with open(dest, "wb") as w:
        for c in r.iter_content(8192):
            w.write(c)
    return True


# All products with their channel mappings
ALL_PRODUCTS = [
    {"channel": "C05F108MS3W", "out": "town-unit/nagoya", "label": "名古屋久屋大通 #395"},
    {"channel": "C05AYV4KG3E", "out": "town-unit/rakuten", "label": "楽天タウンユニット"},
    {"channel": "C086FBQ1EN4", "out": "yokohama-nw", "label": "横浜ネイチャーウィーク #3039"},
    {"channel": "C09455EDRJN", "out": "shiba-cube/pan", "label": "PAN門真 #1125"},
    {"channel": "C01BGV80TNX", "out": "town-unit/vpl", "label": "VPL #326"},
    {"channel": "CAH8Y8YLF", "out": "namunami-bench", "label": "fabrication #200"},
]


def process_one(token, channel_id, ch_name, out_folder, limit, list_only):
    print(f"\n{'='*50}")
    print(f"  #{ch_name} -> {out_folder}")
    print(f"{'='*50}")

    photos = scan_channel_for_photos(token, channel_id)
    print(f"  {len(photos)} photos found in messages")

    if not photos:
        return

    # Sort by score
    photos.sort(key=lambda f: f["_total_score"], reverse=True)

    # Deduplicate by file ID
    seen = set()
    unique = []
    for p in photos:
        if p["id"] not in seen:
            seen.add(p["id"])
            unique.append(p)
    photos = unique

    dest_dir = BASE / out_folder
    dl_count = 0
    for i, f in enumerate(photos[:limit * 2]):
        if dl_count >= limit:
            break
        name = f.get("name", "?")
        size = f.get("size", 0) // 1024
        score = f["_total_score"]
        date = datetime.fromtimestamp(f.get("created", 0)).strftime("%Y-%m-%d")
        rx = f["_msg_rx"]
        ctx = f["_msg_text"][:40].replace("\n", " ")
        fid = f["id"]
        ext = os.path.splitext(name)[1].lower() or ".jpg"
        dest = dest_dir / f"{Path(name).stem}_{fid[:6]}{ext}"

        tag = f"score:{score} rx:{rx}"
        if f.get("_msg_score", 0) > 5:
            tag += f' "{ctx}..."'

        print(f"  [{i+1:2d}] {name} ({size}KB, {date}) {tag}")

        if list_only:
            dl_count += 1
            continue

        if dest.exists():
            print(f"       [exists]")
            dl_count += 1
        elif download(token, f, dest):
            print(f"       -> {dest.name}")
            dl_count += 1

    print(f"  Result: {dl_count} photos")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", required=True)
    ap.add_argument("--channel", help="Direct channel ID")
    ap.add_argument("--pid", help="Project number e.g. 395")
    ap.add_argument("--out", help="Output subfolder")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument("--all", action="store_true", help="Process all known products")
    args = ap.parse_args()

    auth = api(args.token, "auth.test")
    if not auth.get("ok"):
        print("Bad token!")
        sys.exit(1)
    print(f"OK: {auth['user']} @ {auth['team']}")

    if args.all:
        for p in ALL_PRODUCTS:
            ch_id = p.get("channel")
            ch_name = p.get("label", "")
            if not ch_id and p.get("pid"):
                ch_id, ch_name = find_channel(args.token, p["pid"])
                if not ch_id:
                    print(f"\n  [skip] Channel not found for #{p['pid']}")
                    continue
            process_one(args.token, ch_id, ch_name, p["out"], args.limit, args.list_only)
        return

    ch_id = args.channel
    ch_name = ""
    if not ch_id:
        if not args.pid:
            print("Specify --channel, --pid, or --all")
            sys.exit(1)
        ch_id, ch_name = find_channel(args.token, args.pid)
        if not ch_id:
            print(f"Channel not found for #{args.pid}")
            sys.exit(1)

    if not args.out:
        print("Specify --out folder name")
        sys.exit(1)

    process_one(args.token, ch_id, ch_name or ch_id, args.out, args.limit, args.list_only)


if __name__ == "__main__":
    main()
