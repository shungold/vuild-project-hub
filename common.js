/**
 * common.js — VUILD Project Hub 共通モジュール
 * portal / project detail / furniture detail の全ページで読み込む
 */

/* ============================================================
   1. DataLoader — JSON データの取得とキャッシュ
   ============================================================ */
const DataLoader = {
  cache: {},
  basePath: '', // portal: ''  /  detail pages: '../../'

  /**
   * collection ('projects' | 'furniture' | 'materials' | 'knowledge') を読み込む
   * キャッシュ済みならキャッシュを返す。localStorage 編集があればマージする。
   */
  async load(collection) {
    if (this.cache[collection]) return this.cache[collection];

    const url = this.basePath + 'data/' + collection + '.json';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      const json = await res.json();
      this.cache[collection] = json;
      return json;
    } catch (err) {
      console.error('[DataLoader]', err);
      return {};
    }
  },

  /** キャッシュを破棄して再読み込み */
  invalidate(collection) {
    delete this.cache[collection];
  }
};

/* ============================================================
   2. EditManager — localStorage によるインライン編集の永続化
   ============================================================ */
const EditManager = {
  STORAGE_PREFIX: 'vuild_edits_',

  /** 指定アイテムの編集データを取得 (なければ null) */
  getEdits(collection, id) {
    const raw = localStorage.getItem(this.STORAGE_PREFIX + collection);
    if (!raw) return null;
    try {
      const map = JSON.parse(raw);
      return map[id] || null;
    } catch { return null; }
  },

  /** フィールド単位で編集を保存 */
  saveEdit(collection, id, field, value) {
    const key = this.STORAGE_PREFIX + collection;
    let map = {};
    try { map = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
    if (!map[id]) map[id] = {};
    map[id][field] = value;
    localStorage.setItem(key, JSON.stringify(map));
    DataLoader.invalidate(collection);
    this.updateBadge();
  },

  /** 全コレクションの未同期編集件数を返す */
  getPendingCount() {
    let count = 0;
    const collections = ['projects', 'furniture', 'materials', 'knowledge'];
    for (const col of collections) {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + col);
      if (!raw) continue;
      try { count += Object.keys(JSON.parse(raw)).length; } catch {}
    }
    return count;
  },

  /** ヘッダーの同期バッジを更新 */
  updateBadge() {
    const badge = document.getElementById('sync-badge');
    if (!badge) return;
    const n = this.getPendingCount();
    if (n > 0) {
      badge.textContent = `未同期の編集 ${n}件`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  },

  /** すべての編集を JSON でエクスポート (Claude 同期用) */
  exportAll() {
    const result = {};
    const collections = ['projects', 'furniture', 'materials', 'knowledge'];
    for (const col of collections) {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + col);
      if (!raw) continue;
      try { result[col] = JSON.parse(raw); } catch {}
    }
    return result;
  },

  /** 同期完了後に全編集をクリア */
  clearSynced() {
    const collections = ['projects', 'furniture', 'materials', 'knowledge'];
    for (const col of collections) {
      localStorage.removeItem(this.STORAGE_PREFIX + col);
    }
    DataLoader.cache = {};
    this.updateBadge();
  },

  /** ベースデータに localStorage の編集をマージ */
  mergeEdits(collection, items) {
    return items.map(item => {
      const edits = this.getEdits(collection, item.id);
      return edits ? { ...item, ...edits, _edited: true } : item;
    });
  }
};

/* ============================================================
   3. UI Helpers
   ============================================================ */

/* ---------- Tab 切り替え ---------- */
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const views = document.querySelectorAll('.view');
  if (!tabs.length) return;

  function activate(tabId) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    views.forEach(v => v.classList.toggle('active', v.id === 'view-' + tabId));
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      activate(id);
      history.replaceState(null, '', '#' + id);
    });
  });

  // URL ハッシュから初期タブを決定
  const hash = location.hash.replace('#', '');
  const valid = [...tabs].map(t => t.dataset.tab);
  activate(valid.includes(hash) ? hash : valid[0]);
}

/* ---------- カード描画 ---------- */

/** プロジェクトカード */
function renderProjectCard(p) {
  const status = getStatusLabel(p.status);
  const thumb = p.photos && p.photos[0]
    ? `<img src="${p.photos[0]}" alt="${esc(p.name)}" loading="lazy">`
    : '<div class="thumb-placeholder">No Photo</div>';
  const edited = p._edited ? ' <span class="edit-dot" title="未同期">●</span>' : '';
  return `
    <a href="projects/${p.id}/index.html" class="card project-card">
      <div class="card-thumb">${thumb}</div>
      <div class="card-body">
        <span class="badge badge-${p.status}">${status}</span>${edited}
        <h3>${esc(p.name)}</h3>
        <p class="card-meta">${esc(p.category || '')} ${p.area ? '/ ' + p.area : ''}</p>
      </div>
    </a>`;
}

/** 家具カード */
function renderFurnitureCard(f) {
  const thumb = f.photos && f.photos[0]
    ? `<img src="${f.photos[0]}" alt="${esc(f.name)}" loading="lazy">`
    : '<div class="thumb-placeholder">No Photo</div>';
  const price = formatPrice(f.price);
  const edited = f._edited ? ' <span class="edit-dot" title="未同期">●</span>' : '';
  return `
    <a href="furniture/${f.id}/index.html" class="card furniture-card">
      <div class="card-thumb">${thumb}</div>
      <div class="card-body">
        <h3>${esc(f.name)}${edited}</h3>
        <p class="card-meta">${esc(f.category || '')} / ${price}</p>
      </div>
    </a>`;
}

/** 金物・資材カード */
function renderMaterialCard(m) {
  const typeLabel = m.type === 'architectural' ? '建築系' : '什器系';
  const edited = m._edited ? ' <span class="edit-dot" title="未同期">●</span>' : '';
  return `
    <div class="card material-card">
      <div class="card-body">
        <span class="badge badge-mat-${m.type}">${typeLabel}</span>${edited}
        <h3>${esc(m.name)}</h3>
        <p class="card-meta">${esc(m.maker || '')} ${m.model ? '/ ' + esc(m.model) : ''}</p>
        <p class="card-price">${formatPrice(m.price)}</p>
        ${m.url ? `<a href="${m.url}" target="_blank" rel="noopener" class="ext-link">商品ページ ↗</a>` : ''}
      </div>
    </div>`;
}

/** ナレッジタイムラインエントリ */
function renderKnowledgeEntry(entry) {
  const info = getKnowledgeTypeInfo(entry.type);
  return `
    <div class="knowledge-entry ${info.className}">
      <div class="knowledge-icon">${info.icon}</div>
      <div class="knowledge-body">
        <span class="knowledge-type">${info.label}</span>
        <time>${formatDate(entry.date)}</time>
        <h4>${esc(entry.title)}</h4>
        <p>${esc(entry.body || '')}</p>
        ${entry.project ? `<span class="knowledge-project">${esc(entry.project)}</span>` : ''}
      </div>
    </div>`;
}

/* ---------- フィルターチップ ---------- */
function renderFilterChips(items, key, activeFilter, onClickFn) {
  // key から一意の値を抽出
  const values = [...new Set(items.map(i => i[key]).filter(Boolean))];
  const all = ['すべて', ...values];
  return `<div class="filter-chips">${all.map(v => {
    const isActive = v === activeFilter || (v === 'すべて' && !activeFilter);
    return `<button class="chip${isActive ? ' active' : ''}"
              onclick="${onClickFn}('${esc(v)}')">${esc(v)}</button>`;
  }).join('')}</div>`;
}

/* ---------- 写真スライダー ---------- */
function initPhotoSlider(containerId, photos) {
  const container = document.getElementById(containerId);
  if (!container || !photos || !photos.length) return;

  const track = document.createElement('div');
  track.className = 'slider-track';

  photos.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'slider-slide';
    slide.innerHTML = `<img src="${src}" alt="Photo ${i + 1}" loading="lazy">`;
    track.appendChild(slide);
  });

  const dots = document.createElement('div');
  dots.className = 'slider-dots';
  photos.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => {
      track.children[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
    dots.appendChild(dot);
  });

  container.innerHTML = '';
  container.appendChild(track);
  container.appendChild(dots);

  // スクロール時にドットを更新
  track.addEventListener('scroll', () => {
    const scrollLeft = track.scrollLeft;
    const slideW = track.children[0].offsetWidth;
    const idx = Math.round(scrollLeft / slideW);
    dots.querySelectorAll('.slider-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
  }, { passive: true });
}

/* ---------- フォーマットヘルパー ---------- */

function formatPrice(price) {
  if (price == null || price === '') return '-';
  return '¥' + Number(price).toLocaleString('ja-JP');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  // すでに YYYY-MM-DD ならそのまま返す
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getStatusLabel(status) {
  const map = {
    active: '設計中',
    completed: '完了',
    planning: '計画中'
  };
  return map[status] || status || '-';
}

function getKnowledgeTypeInfo(type) {
  const map = {
    progress: { label: '経過メモ', icon: '\u{1F4DD}', className: 'type-progress' },
    trouble:  { label: 'トラブル', icon: '\u26A0\uFE0F', className: 'type-trouble' },
    howto:    { label: 'ハウツー', icon: '\u{1F4A1}', className: 'type-howto' },
    spec:     { label: '仕様決定', icon: '\u{1F6A9}', className: 'type-spec' }
  };
  return map[type] || { label: type, icon: '\u{1F4CB}', className: 'type-other' };
}

/** 資材タイプの日本語ラベル */
function getMaterialTypeLabel(type) {
  if (type === 'architectural') return '建築系';
  if (type === 'furniture_hardware') return '什器系';
  return type || '-';
}

/* ---------- HTML エスケープ ---------- */
function esc(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/* ============================================================
   4. Back Button — detail ページ用
   ============================================================ */
function renderBackButton() {
  const container = document.getElementById('back-button');
  if (!container) return;
  container.innerHTML = `
    <a href="${DataLoader.basePath}index.html" class="back-link">← ポータルに戻る</a>`;
}

/* ============================================================
   初期化: ページ読み込み時にバッジを更新
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  EditManager.updateBadge();
});
