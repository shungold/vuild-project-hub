"""
Slack写真ダウンロードスクリプト
VUILD Project Hub用 - 尾道/富山立山/楽天の竣工写真をダウンロード
"""
import json
import os
import sys
import urllib.request

# Configuration
SLACK_TOKEN_PATH = r"C:\Users\ktrai\vuild-agents\context\.slack_token"
BASE_DIR = r"C:\Users\ktrai\Desktop\vuild-project-hub\photos\projects"

with open(SLACK_TOKEN_PATH) as f:
    SLACK_TOKEN = f.read().strip()

def slack_api(method, params):
    """Call Slack API and return JSON response."""
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"https://slack.com/api/{method}?{query}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {SLACK_TOKEN}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def get_thread_files(channel_id, ts):
    """Get all files from a thread (parent + replies)."""
    data = slack_api("conversations.replies", {"channel": channel_id, "ts": ts, "limit": "200"})
    if not data.get("ok"):
        print(f"  ERROR: {data.get('error')}")
        return []
    files = []
    for msg in data.get("messages", []):
        for f in msg.get("files", []):
            url = f.get("url_private_download") or f.get("url_private")
            if url:
                files.append({"name": f.get("name", "unknown"), "url": url})
    return files

def download_file(url, dest_path):
    """Download a Slack file with auth."""
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {SLACK_TOKEN}"})
    try:
        with urllib.request.urlopen(req) as resp:
            with open(dest_path, "wb") as out:
                out.write(resp.read())
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False

def download_thread_photos(channel_id, ts, dest_dir, prefix, label=""):
    """Download all image files from a thread."""
    print(f"\n--- {label} (ts={ts}) ---")
    files = get_thread_files(channel_id, ts)
    if not files:
        print("  No files found")
        return 0, []

    os.makedirs(dest_dir, exist_ok=True)
    downloaded = 0
    failed = []
    counter = 1

    for f in files:
        name = f["name"]
        ext = os.path.splitext(name)[1].lower()
        # Skip non-image files
        if ext not in (".jpg", ".jpeg", ".png", ".heic", ".webp"):
            print(f"  SKIP (not image): {name}")
            continue

        dest_name = f"{prefix}-{counter:02d}{ext}"
        dest_path = os.path.join(dest_dir, dest_name)

        print(f"  Downloading {name} -> {dest_name} ...", end=" ")
        if download_file(f["url"], dest_path):
            size_kb = os.path.getsize(dest_path) / 1024
            print(f"OK ({size_kb:.0f} KB)")
            downloaded += 1
        else:
            failed.append(name)
        counter += 1

    return downloaded, failed

def main():
    total_downloaded = 0
    total_failed = []

    # ============================================================
    # 1. 尾道 (C07K02J6SUE) - 黒部さんの竣工写真
    # ============================================================
    print("=" * 60)
    print("1. 尾道クラブ 竣工写真")
    print("=" * 60)

    onomichi_dir = os.path.join(BASE_DIR, "onomichi_club")

    # Parent thread + all replies in one call
    d, f = download_thread_photos(
        "C07K02J6SUE", "1740281481.560659",
        onomichi_dir, "onomichi-completion",
        "黒部さん竣工写真 (2025-02-23)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # ============================================================
    # 2. 富山立山 (C06KR848J0M) - 竣工写真
    # ============================================================
    print("\n" + "=" * 60)
    print("2. 富山立山 竣工写真")
    print("=" * 60)

    tateyama_dir = os.path.join(BASE_DIR, "toyama_tateyama")

    # セット1
    d, f = download_thread_photos(
        "C06KR848J0M", "1773670440.795079",
        tateyama_dir, "tateyama-set1",
        "竣工写真セット1 (2026-03-16)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # セット2
    d, f = download_thread_photos(
        "C06KR848J0M", "1773671374.970819",
        tateyama_dir, "tateyama-set2",
        "竣工写真セット2 (2026-03-16)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # セット3
    d, f = download_thread_photos(
        "C06KR848J0M", "1773671489.683179",
        tateyama_dir, "tateyama-set3",
        "竣工写真セット3 (2026-03-16)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # 納品完了写真 (3/1)
    d, f = download_thread_photos(
        "C06KR848J0M", "1772360268.343029",
        tateyama_dir, "tateyama-delivery",
        "納品完了写真 (2026-03-01)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # キッチン完了写真
    d, f = download_thread_photos(
        "C06KR848J0M", "1772272519.798859",
        tateyama_dir, "tateyama-kitchen",
        "キッチン完了写真 (2026-02-28)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # ============================================================
    # 3. 楽天 (C05AYV4KG3E) - 完成写真
    # ============================================================
    print("\n" + "=" * 60)
    print("3. 楽天Optimism 完成写真")
    print("=" * 60)

    rakuten_dir = os.path.join(BASE_DIR, "rakuten_optimism")

    # 沼田 2024 completion photos (3 messages around 2024-07-30)
    d, f = download_thread_photos(
        "C05AYV4KG3E", "1722342324.287669",
        rakuten_dir, "rakuten-2024a",
        "沼田 2024完成写真セット1 (2024-07-30)"
    )
    total_downloaded += d
    total_failed.extend(f)

    d, f = download_thread_photos(
        "C05AYV4KG3E", "1722342310.937839",
        rakuten_dir, "rakuten-2024b",
        "沼田 2024完成写真セット2 (2024-07-30)"
    )
    total_downloaded += d
    total_failed.extend(f)

    d, f = download_thread_photos(
        "C05AYV4KG3E", "1722342329.977739",
        rakuten_dir, "rakuten-2024c",
        "沼田 2024完成写真セット3 (2024-07-30)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # 2023 event photos from 沼田 (Aug 8)
    d, f = download_thread_photos(
        "C05AYV4KG3E", "1691461591.863799",
        rakuten_dir, "rakuten-2023a",
        "沼田 2023イベント写真 (2023-08-08)"
    )
    total_downloaded += d
    total_failed.extend(f)

    # Additional 2023 photos from 沼田
    for ts, label, pfx in [
        ("1691461616.934029", "沼田 2023写真追加1", "rakuten-2023b"),
        ("1691461672.021819", "沼田 2023写真追加2", "rakuten-2023c"),
        ("1691461693.999339", "沼田 2023写真追加3", "rakuten-2023d"),
        ("1691461812.015299", "沼田 2023写真追加4", "rakuten-2023e"),
        ("1691569441.992109", "沼田 ドローン写真", "rakuten-2023-drone"),
    ]:
        d, f = download_thread_photos(
            "C05AYV4KG3E", ts, rakuten_dir, pfx, label
        )
        total_downloaded += d
        total_failed.extend(f)

    # ============================================================
    # Summary
    # ============================================================
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total downloaded: {total_downloaded}")
    if total_failed:
        print(f"Failed ({len(total_failed)}):")
        for name in total_failed:
            print(f"  - {name}")
    else:
        print("No failures!")

    # Count files per directory
    for dirname in ["onomichi_club", "toyama_tateyama", "rakuten_optimism"]:
        dirpath = os.path.join(BASE_DIR, dirname)
        if os.path.isdir(dirpath):
            count = len([f for f in os.listdir(dirpath) if not f.startswith(".")])
            print(f"  {dirname}/: {count} files")

if __name__ == "__main__":
    main()
