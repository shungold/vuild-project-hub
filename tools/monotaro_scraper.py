"""
MonotaRO商品情報スクレイパー
Usage: python monotaro_scraper.py <URL or 品番>
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
from bs4 import BeautifulSoup
import json
import sys
import re
import time

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

def extract_product_code(url):
    """URLから品番を抽出"""
    # /p/XXXX/YYYY/ パターン
    m = re.search(r'/p/(\d+)/(\d+)/', url)
    if m:
        return f"{m.group(1)}{m.group(2)}"
    # /g/XXXXXXXX/ パターン
    m = re.search(r'/g/(\d+)/', url)
    if m:
        return m.group(1)
    return None

def scrape_monotaro(url):
    """MonotaRO商品ページから情報を取得"""
    try:
        session = requests.Session()
        session.headers.update(HEADERS)

        # まずトップページにアクセスしてCookieを取得
        session.get('https://www.monotaro.com/', timeout=15)
        time.sleep(1)

        # 商品ページにアクセス
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or 'utf-8'

        soup = BeautifulSoup(resp.text, 'lxml')

        result = {
            'url': url,
            'product_name': '',
            'product_code': '',
            'maker': '',
            'price': 0,
            'specs': '',
            'image_url': '',
            'success': False
        }

        # 商品名
        title = soup.find('meta', property='og:title')
        if title:
            result['product_name'] = title.get('content', '').split('|')[0].strip()

        # OG画像
        og_img = soup.find('meta', property='og:image')
        if og_img:
            result['image_url'] = og_img.get('content', '')

        # 商品名（h1）
        h1 = soup.find('h1', class_='product-name') or soup.find('h1')
        if h1 and not result['product_name']:
            result['product_name'] = h1.get_text(strip=True)

        # 価格 - PriceArea内の販売価格(税込)を優先
        price_area = soup.find(class_='PriceArea')
        if price_area:
            # 販売価格(税込)のパターンを探す
            price_blocks = price_area.find_all(class_='ReferencePrice')
            for block in price_blocks:
                title = block.find(class_='ReferencePrice__Title')
                if title and '税込' in title.get_text():
                    price_text = block.get_text()
                    price_nums = re.findall(r'[￥¥]\s*([\d,]+)', price_text)
                    if price_nums:
                        result['price'] = int(price_nums[0].replace(',', ''))
                        break
            # 見つからなければRegularPriceを使う
            if not result['price']:
                regular = price_area.find(class_='RegularPrice')
                if regular:
                    price_text = regular.get_text()
                    price_nums = re.findall(r'[￥¥]\s*([\d,]+)', price_text)
                    if price_nums:
                        result['price'] = int(price_nums[0].replace(',', ''))

        # JSON-LD（構造化データ）から取得
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                ld = json.loads(script.string)
                if isinstance(ld, dict):
                    if ld.get('@type') == 'Product' or 'Product' in str(ld.get('@type', '')):
                        result['product_name'] = ld.get('name', result['product_name'])
                        result['product_code'] = ld.get('sku', result['product_code'])
                        result['maker'] = ld.get('brand', {}).get('name', '') if isinstance(ld.get('brand'), dict) else str(ld.get('brand', ''))
                        if 'image' in ld:
                            img = ld['image']
                            if isinstance(img, list):
                                result['image_url'] = img[0] if img else ''
                            else:
                                result['image_url'] = str(img)
                        offers = ld.get('offers', {})
                        if isinstance(offers, dict) and 'price' in offers:
                            result['price'] = int(float(offers['price']))
                        elif isinstance(offers, list) and offers:
                            result['price'] = int(float(offers[0].get('price', 0)))
                    elif isinstance(ld, list):
                        for item in ld:
                            if isinstance(item, dict) and item.get('@type') == 'Product':
                                result['product_name'] = item.get('name', result['product_name'])
                                result['product_code'] = item.get('sku', result['product_code'])
            except (json.JSONDecodeError, ValueError):
                continue

        # 品番がまだ空なら URL から推測
        if not result['product_code']:
            code = extract_product_code(url)
            if code:
                result['product_code'] = code

        # スペック情報
        spec_table = soup.find('table', class_=re.compile(r'spec')) or soup.find('div', class_=re.compile(r'spec'))
        if spec_table:
            specs = []
            for row in spec_table.find_all('tr'):
                cells = row.find_all(['th', 'td'])
                if len(cells) >= 2:
                    specs.append(f"{cells[0].get_text(strip=True)}: {cells[1].get_text(strip=True)}")
            result['specs'] = ' / '.join(specs[:5])

        # 説明文
        if not result['specs']:
            desc = soup.find('meta', {'name': 'description'})
            if desc:
                result['specs'] = desc.get('content', '')[:200]

        result['success'] = bool(result['product_name'])
        return result

    except requests.Timeout:
        return {'url': url, 'success': False, 'error': 'タイムアウト'}
    except Exception as e:
        return {'url': url, 'success': False, 'error': str(e)}


def scrape_generic(url):
    """汎用ECサイトスクレイパー"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')

        result = {
            'url': url,
            'product_name': '',
            'product_code': '',
            'maker': '',
            'price': 0,
            'specs': '',
            'image_url': '',
            'success': False
        }

        # OG tags
        for prop, key in [('og:title', 'product_name'), ('og:image', 'image_url')]:
            tag = soup.find('meta', property=prop)
            if tag:
                result[key] = tag.get('content', '')

        # JSON-LD
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                ld = json.loads(script.string)
                if isinstance(ld, dict) and ld.get('@type') == 'Product':
                    result['product_name'] = ld.get('name', result['product_name'])
                    result['product_code'] = ld.get('sku', '')
                    result['maker'] = ld.get('brand', {}).get('name', '') if isinstance(ld.get('brand'), dict) else ''
                    offers = ld.get('offers', {})
                    if isinstance(offers, dict):
                        result['price'] = int(float(offers.get('price', 0)))
                    if 'image' in ld:
                        result['image_url'] = ld['image'] if isinstance(ld['image'], str) else ld['image'][0]
            except (json.JSONDecodeError, ValueError):
                continue

        # Description
        desc = soup.find('meta', {'name': 'description'})
        if desc:
            result['specs'] = desc.get('content', '')[:200]

        result['success'] = bool(result['product_name'])
        return result

    except Exception as e:
        return {'url': url, 'success': False, 'error': str(e)}


def scrape(url):
    """URLに応じてスクレイパーを選択"""
    if 'monotaro.com' in url:
        return scrape_monotaro(url)
    else:
        return scrape_generic(url)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python monotaro_scraper.py <URL>")
        sys.exit(1)

    url = sys.argv[1]

    # 品番だけ渡された場合はURLを構築
    if re.match(r'^\d{4}/\d{4}$', url):
        parts = url.split('/')
        url = f'https://www.monotaro.com/p/{parts[0]}/{parts[1]}/'

    result = scrape(url)
    print(json.dumps(result, ensure_ascii=False, indent=2))
