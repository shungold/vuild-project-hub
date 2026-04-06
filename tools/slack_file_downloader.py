"""
VUILD Furniture - Slack File Downloader v3
Channel-based file search + keyword filter + auto download

Usage:
  py slack_file_downloader.py --token xoxp-TOKEN
  py slack_file_downloader.py --token xoxp-TOKEN --product shiba-cube
  py slack_file_downloader.py --token xoxp-TOKEN --list-only
"""

import requests, os, sys, argparse
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent

# Channel IDs from VUILD Slack (found via MCP search)
PRODUCTS = {
    "namunami-bench": {
        "name": "namunami bench",
        "channels": {
            "CAH8Y8YLF": "#200_fabrication",
        },
        "keywords": ["ナミナミ", "うねり", "尾道", "onomichi"],
        "folder": BASE_DIR / "namunami-bench",
    },
    "town-unit": {
        "name": "town unit",
        "channels": {
            "C01BGV80TNX": "#326_vuildplacelab",
            "C086FBQ1EN4": "#3039_yokohamanarureweek2025",
        },
        "keywords": ["タウンユニット", "townunit", "town unit"],
        "folder": BASE_DIR / "town-unit",
    },
    "shiba-cube": {
        "name": "shiba cube",
        "channels": {
            "C09455EDRJN": "#1125_pan",
        },
        "keywords": ["芝キューブ", "芝什器", "芝生", "shiba"],
        "folder": BASE_DIR / "shiba-cube",
    },
    "seesaw-bench": {
        "name": "seesaw bench",
        "channels": {
            "C086FBQ1EN4": "#3039_yokohamanarureweek2025",
        },
        "keywords": ["シーソー", "seesaw"],
        "folder": BASE_DIR / "seesaw-bench",
    },
    "pingpong-table": {
        "name": "pingpong table",
        "channels": {
            "C086FBQ1EN4": "#3039_yokohamanarureweek2025",
        },
        "keywords": ["卓球"],
        "folder": BASE_DIR / "pingpong-table",
    },
    "denzai-stool": {
        "name": "denzai stool",
        "channels": {
            "C09455EDRJN": "#1125_pan",
        },
        "keywords": ["電材", "スツール", "stool"],
        "folder": BASE_DIR / "denzai-stool",
    },
}

PHOTO_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"}
MODEL_EXT = {".3dm", ".gh", ".ghx", ".dxf", ".dwg", ".step", ".stp", ".stl"}
DOC_EXT = {".pdf", ".xlsx", ".xls", ".csv", ".pptx", ".docx"}


def categorize(name, mimetype=""):
    ext = os.path.splitext(name.lower())[1]
    if ext in PHOTO_EXT or mimetype.startswith("image/"):
        return "photos"
    if ext in MODEL_EXT:
        return "models"
    if ext in DOC_EXT:
        return "docs"
    return None


def safe_name(name, fid):
    name = name.replace("/", "_").replace("\\", "_")
    stem, ext = os.path.splitext(name)
    return f"{stem}_{fid[:6]}{ext}"


def get_channel_files(token, channel_id, max_pages=20):
    """Get all files shared in a specific channel"""
    files = []
    page = 1
    while page <= max_pages:
        r = requests.get("https://slack.com/api/files.list",
                         headers={"Authorization": f"Bearer {token}"},
                         params={"channel": channel_id, "count": 100, "page": page, "types": "all"})
        d = r.json()
        if not d.get("ok"):
            print(f"    API error: {d.get('error')}")
            break
        batch = d.get("files", [])
        if not batch:
            break
        files.extend(batch)
        total_pages = d.get("paging", {}).get("pages", 1)
        if page >= total_pages:
            break
        page += 1
    return files


def matches(fi, keywords):
    """Check if file name/title matches any keyword"""
    if not keywords:
        return True  # no filter = take all
    name = fi.get("name", "").lower()
    title = fi.get("title", "").lower()
    return any(kw.lower() in name or kw.lower() in title for kw in keywords)


def download(token, url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, stream=True)
    if r.status_code != 200:
        return False
    with open(dest, "wb") as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)
    return True


def process(token, key, cfg, list_only, no_filter):
    print(f"\n{'='*60}")
    print(f"  {cfg['name']} ({key})")
    print(f"{'='*60}")

    all_files = []
    seen_ids = set()
    for ch_id, ch_name in cfg["channels"].items():
        print(f"  Scanning {ch_name}...")
        ch_files = get_channel_files(token, ch_id)
        print(f"    {len(ch_files)} files in channel")
        for f in ch_files:
            if f["id"] not in seen_ids:
                # If no_filter, take all categorizable files; otherwise filter by keyword
                if no_filter or matches(f, cfg["keywords"]):
                    cat = categorize(f.get("name", ""), f.get("mimetype", ""))
                    if cat:
                        all_files.append(f)
                        seen_ids.add(f["id"])

    kw_label = "all files" if no_filter else f"keyword-matched"
    print(f"  {len(all_files)} {kw_label} (photos/models/docs)")

    dl_count = 0
    counts = {"photos": 0, "models": 0, "docs": 0}

    for fi in all_files:
        name = fi.get("name", "?")
        cat = categorize(name, fi.get("mimetype", ""))
        if not cat:
            continue
        size = fi.get("size", 0) // 1024
        ts = fi.get("created", 0)
        date = datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else "?"
        dest = cfg["folder"] / cat / safe_name(name, fi["id"])
        exists = dest.exists()
        mark = " [exists]" if exists else ""

        print(f"  [{cat:6s}] {name} ({size}KB, {date}){mark}")
        counts[cat] += 1

        if list_only or exists:
            continue

        url = fi.get("url_private_download") or fi.get("url_private")
        if url and download(token, url, dest):
            print(f"          -> {dest.name}")
            dl_count += 1

    mode = "(list only)" if list_only else f"({dl_count} downloaded)"
    print(f"\n  {counts['photos']} photos, {counts['models']} models, {counts['docs']} docs {mode}")
    return counts, dl_count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", required=True)
    ap.add_argument("--product", help="e.g. shiba-cube, namunami-bench, town-unit")
    ap.add_argument("--list-only", action="store_true", help="List without downloading")
    ap.add_argument("--no-filter", action="store_true", help="Skip keyword filter, get ALL files from channels")
    args = ap.parse_args()

    r = requests.get("https://slack.com/api/auth.test",
                     headers={"Authorization": f"Bearer {args.token}"})
    d = r.json()
    if not d.get("ok"):
        print("Bad token!")
        sys.exit(1)
    print(f"OK: {d['user']} @ {d['team']}")
    if args.list_only:
        print("(list-only mode)")

    targets = PRODUCTS
    if args.product:
        if args.product not in PRODUCTS:
            print(f"Unknown: {args.product}. Options: {', '.join(PRODUCTS.keys())}")
            sys.exit(1)
        targets = {args.product: PRODUCTS[args.product]}

    tp, tm, td, tdl = 0, 0, 0, 0
    for k, v in targets.items():
        c, dl = process(args.token, k, v, args.list_only, args.no_filter)
        tp += c["photos"]; tm += c["models"]; td += c["docs"]; tdl += dl

    print(f"\n{'='*60}")
    print(f"  TOTAL: {tp} photos, {tm} models, {td} docs")
    if not args.list_only:
        print(f"  Downloaded: {tdl} files")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
