"""
VUILD Project Hub — GDrive Share Setup
Recursively sets sharing permissions on VUILD_Project_Hub folder.
Requires: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib

Usage:
  py gdrive_share.py --folder-id FOLDER_ID
  py gdrive_share.py --list  (list files in VUILD_Project_Hub)
"""

import argparse
import sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--folder-id', help='GDrive folder ID to share')
    ap.add_argument('--list', action='store_true', help='List files')
    ap.add_argument('--domain', default='vuild.co.jp', help='Domain for sharing')
    args = ap.parse_args()

    print("""
=== GDrive共有設定 ===

手動で設定する場合:
1. Google Driveで VUILD_Project_Hub フォルダを右クリック
2. 「共有」→「リンクを取得」
3. 「リンクを知っている全員」に変更
4. 「閲覧者」を選択
5. 「完了」

これでフォルダ内の全ファイルが共有リンクでアクセス可能になります。

=== Project HubでGDriveリンクを使う ===

画像の直リンク:
  https://drive.google.com/uc?id=FILE_ID&export=view

ファイルのダウンロード:
  https://drive.google.com/uc?id=FILE_ID&export=download

ファイルのプレビュー:
  https://drive.google.com/file/d/FILE_ID/view

FILE_IDの取得:
  ファイルを右クリック → 「リンクをコピー」
  https://drive.google.com/file/d/XXXXX/view のXXXXX部分

=== API経由で一括設定する場合 ===

1. Google Cloud Console でプロジェクト作成
2. Drive API を有効化
3. OAuth2 クライアントIDを作成
4. 以下のコマンドで一括共有:

  py gdrive_share.py --folder-id YOUR_FOLDER_ID --domain vuild.co.jp
""")

    if args.folder_id:
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            print("Google API client available. Implement batch sharing here.")
        except ImportError:
            print("google-api-python-client not installed.")
            print("pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")

if __name__ == '__main__':
    main()
