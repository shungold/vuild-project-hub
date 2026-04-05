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

    const url = this.basePath + 'data/' + collection + '.json?v=' + Date.now();
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
   5. GDrive Storage Manager
   ============================================================ */
const GDriveManager = {
  // GDriveのベースパス（ローカルマウント）
  LOCAL_BASE: 'G:/マイドライブ/Claude_Projects/VUILD_Project_Hub/',

  // GDrive Web共有リンクのベース（リンク共有設定後にIDベースで生成）
  // フォーマット: https://drive.google.com/file/d/{fileId}/view
  // 画像直リンク: https://drive.google.com/uc?id={fileId}

  /**
   * エンティティのGDriveフォルダパスを返す
   */
  getFolderPath(entityType, entityId) {
    const typeMap = { project: 'projects', furniture: 'furniture', material: 'materials' };
    return `${typeMap[entityType] || entityType}/${entityId}/`;
  },

  /**
   * アップロード予約をlocalStorageに記録
   * （実際のファイルコピーは次回Claudeセッションで実行）
   */
  registerUpload(entityType, entityId, category, fileName, fileSize) {
    const key = 'vuild_gdrive_uploads';
    let uploads = [];
    try { uploads = JSON.parse(localStorage.getItem(key)) || []; } catch {}
    uploads.push({
      entityType,
      entityId,
      category, // 'photos' | 'models' | 'docs'
      fileName,
      fileSize,
      timestamp: new Date().toISOString(),
      synced: false
    });
    localStorage.setItem(key, JSON.stringify(uploads));
  },

  /**
   * 未同期のアップロード一覧を取得
   */
  getPendingUploads() {
    try {
      return (JSON.parse(localStorage.getItem('vuild_gdrive_uploads')) || [])
        .filter(u => !u.synced);
    } catch { return []; }
  },

  /**
   * 全アップロードをクリア
   */
  clearUploads() {
    localStorage.removeItem('vuild_gdrive_uploads');
  }
};

/* ============================================================
   6. 3D Model Upload/Download Manager
   ============================================================ */
const ModelManager = {
  STORAGE_PREFIX: 'vuild_models_',

  /**
   * 3Dモデルセクションを描画
   * @param {string} containerId — 描画先のDOM ID
   * @param {string} entityType — 'project' | 'furniture' | 'material'
   * @param {string} entityId — エンティティのID
   * @param {string|null} existingModelUrl — data JSONに登録済みのモデルURL
   * @param {string} basePath — DataLoader.basePath
   */
  render(containerId, entityType, entityId, existingModelUrl, basePath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const storageKey = this.STORAGE_PREFIX + entityType + '_' + entityId;
    const savedModel = localStorage.getItem(storageKey);
    const typeLabels = { project: '建築モデル', furniture: 'プロダクトモデル', material: 'メーカー3Dモデル' };
    const label = typeLabels[entityType] || '3Dモデル';

    let html = `<div class="spec-card" style="margin-top:8px">
      <div class="spec-card-header"><h3>${label}</h3></div>
      <div class="spec-card-body" style="padding:12px">`;

    // Download button (existing model)
    if (existingModelUrl) {
      const dlUrl = existingModelUrl.startsWith('http') ? existingModelUrl : basePath + existingModelUrl;
      html += `<a href="${dlUrl}" download class="model-dl-btn" style="width:100%;justify-content:center;margin-bottom:8px">
        \u{1F4E5} ダウンロード (.3dm)
      </a>`;
    }

    // Saved model info
    if (savedModel) {
      html += `<div style="font-size:11px;color:var(--color-accent-green);margin-bottom:8px">
        \u2705 アップロード済み: ${esc(savedModel)}
        <button onclick="ModelManager.clear('${storageKey}','${containerId}','${entityType}','${entityId}',${existingModelUrl ? "'" + existingModelUrl + "'" : 'null'},'${basePath}')" style="font-size:10px;color:var(--color-tertiary);background:none;border:none;cursor:pointer;margin-left:4px;text-decoration:underline">削除</button>
      </div>`;
    }

    // Upload zone
    html += `<div class="model-upload-zone" id="model-drop-${entityId}" onclick="document.getElementById('model-file-${entityId}').click()">
      .3dm / .obj / .step をドラッグ&ドロップ またはクリック
      <input type="file" id="model-file-${entityId}" accept=".3dm,.obj,.step,.stp,.stl,.fbx" style="display:none">
    </div>`;

    html += '</div></div>';
    container.innerHTML = html;

    // Event listeners
    const dropzone = document.getElementById('model-drop-' + entityId);
    const fileInput = document.getElementById('model-file-' + entityId);
    if (dropzone && fileInput) {
      ['dragover','dragenter'].forEach(ev => {
        dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.borderColor = 'var(--color-text)'; });
      });
      ['dragleave','drop'].forEach(ev => {
        dropzone.addEventListener(ev, () => { dropzone.style.borderColor = ''; });
      });
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) this.saveFile(storageKey, file.name, containerId, entityType, entityId, existingModelUrl, basePath);
      });
      fileInput.addEventListener('change', e => {
        if (e.target.files[0]) this.saveFile(storageKey, e.target.files[0].name, containerId, entityType, entityId, existingModelUrl, basePath);
      });
    }
  },

  saveFile(storageKey, fileName, containerId, entityType, entityId, existingModelUrl, basePath) {
    localStorage.setItem(storageKey, fileName);
    this.render(containerId, entityType, entityId, existingModelUrl, basePath);
  },

  clear(storageKey, containerId, entityType, entityId, existingModelUrl, basePath) {
    localStorage.removeItem(storageKey);
    this.render(containerId, entityType, entityId, existingModelUrl, basePath);
  }
};

/* ============================================================
   7. Web Editor — 画像管理 + ピン編集 + 候補ステータス + 同期
   ============================================================ */
const WebEditor = {
  CHANGES_KEY: 'vuild_pending_changes',

  /** 変更を記録 */
  addChange(type, data) {
    let changes = [];
    try { changes = JSON.parse(localStorage.getItem(this.CHANGES_KEY)) || []; } catch {}
    changes.push({ type, data, timestamp: new Date().toISOString() });
    localStorage.setItem(this.CHANGES_KEY, JSON.stringify(changes));
    this.updateSyncBar();
  },

  /** 未同期の変更一覧 */
  getPendingChanges() {
    try { return JSON.parse(localStorage.getItem(this.CHANGES_KEY)) || []; } catch { return []; }
  },

  /** 変更をクリア */
  clearChanges() {
    localStorage.removeItem(this.CHANGES_KEY);
    this.updateSyncBar();
  },

  /** 同期バーの表示/非表示 */
  updateSyncBar() {
    let bar = document.getElementById('sync-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sync-bar';
      bar.className = 'sync-bar';
      document.body.appendChild(bar);
    }
    const changes = this.getPendingChanges();
    const uploads = GDriveManager.getPendingUploads();
    const total = changes.length + uploads.length;
    if (total > 0) {
      bar.classList.add('is-visible');
      bar.innerHTML = `<span>${total}件の未同期変更</span>
        <div style="display:flex;gap:8px">
          <button onclick="WebEditor.exportChanges()">エクスポート</button>
          <button onclick="WebEditor.clearAll()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3)">クリア</button>
        </div>`;
    } else {
      bar.classList.remove('is-visible');
    }
  },

  /** 変更をJSONでエクスポート（Claudeに渡す用） */
  exportChanges() {
    const data = {
      changes: this.getPendingChanges(),
      uploads: GDriveManager.getPendingUploads(),
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vuild_sync_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  clearAll() {
    this.clearChanges();
    GDriveManager.clearUploads();
    this.updateSyncBar();
  },

  /** 画像追加UI — ファイル選択 → base64プレビュー + GDrive登録予約 */
  addImageUI(entityType, entityId, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = e => {
      for (const file of e.target.files) {
        // GDrive登録予約
        GDriveManager.registerUpload(entityType, entityId, 'photos', file.name, file.size);
        // base64プレビュー用にlocalStorageに一時保存
        const reader = new FileReader();
        reader.onload = ev => {
          // Resize for preview (max 800px)
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const max = 800;
            let w = img.width, h = img.height;
            if (w > max) { h = h * max / w; w = max; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const preview = canvas.toDataURL('image/jpeg', 0.7);
            WebEditor.addChange('add_image', {
              entityType, entityId, fileName: file.name, preview
            });
            if (callback) callback();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  },

  /** 画像削除を記録 */
  removeImage(entityType, entityId, imagePath) {
    this.addChange('remove_image', { entityType, entityId, imagePath });
  },

  /** 候補ステータス変更 */
  setCandidateStatus(candidateId, newStatus, candidateName) {
    this.addChange('candidate_status', { candidateId, newStatus, candidateName });
    this.updateSyncBar();
  },

  /** ピン追加を記録 */
  addPin(entityType, entityId, photoIndex, x, y, linkedType, linkedId, label) {
    this.addChange('add_pin', {
      entityType, entityId, photoIndex, x, y, linkedType, linkedId, label
    });
  },

  /** ピン削除を記録 */
  removePin(entityType, entityId, photoIndex, pinIndex) {
    this.addChange('remove_pin', { entityType, entityId, photoIndex, pinIndex });
  },

  /** 参考資料追加UI（モーダルフォーム） */
  addDocumentUI(entityType, entityId, callback) {
    const modal = document.createElement('div');
    modal.className = 'know-modal-overlay is-open';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `<div class="know-modal" style="max-width:420px">
      <button class="know-modal-close" onclick="this.closest('.know-modal-overlay').remove()">&times;</button>
      <h2 style="font-size:16px;margin-bottom:12px">参考資料を追加</h2>
      <div class="doc-form">
        <label>ラベル<input type="text" id="doc-label" placeholder="概算見積もり — ○○宛" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <label>URL<input type="url" id="doc-url" placeholder="https://..." style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <label>メモ<input type="text" id="doc-note" placeholder="金額や補足など" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <label style="flex:1">種類<select id="doc-type" style="width:100%;padding:6px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin-top:4px">
            <option value="estimate">見積書</option><option value="invoice">請求書</option><option value="memo">メモ</option><option value="drawing">図面</option><option value="model">モデル</option>
          </select></label>
          <label style="flex:1">ステータス<select id="doc-status" style="width:100%;padding:6px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin-top:4px">
            <option value="検討中">検討中</option><option value="請求済み">請求済み</option><option value="支払済み">支払済み</option>
          </select></label>
        </div>
        <button onclick="WebEditor._submitDocument('${entityType}','${entityId}')" style="width:100%;padding:8px;font-size:13px;background:var(--color-text);color:#fff;border:none;border-radius:4px;cursor:pointer">追加</button>
      </div>
    </div>`;
    modal.dataset.callback = callback ? 'yes' : '';
    document.body.appendChild(modal);
    window._docAddCallback = callback;
  },

  /** 参考資料追加の送信処理 */
  _submitDocument(entityType, entityId) {
    const label = document.getElementById('doc-label').value.trim();
    const url = document.getElementById('doc-url').value.trim();
    const note = document.getElementById('doc-note').value.trim();
    const type = document.getElementById('doc-type').value;
    const status = document.getElementById('doc-status').value;
    if (!label || !url) { alert('ラベルとURLは必須です'); return; }
    this.addChange('add_document', { entityType, entityId, label, url, note, type, status });
    document.querySelector('.know-modal-overlay')?.remove();
    if (window._docAddCallback) window._docAddCallback({ label, url, note, type, status });
  },

  /** コスト項目追加UI（モーダルフォーム） */
  addCostItemUI(entityType, entityId, callback) {
    const modal = document.createElement('div');
    modal.className = 'know-modal-overlay is-open';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `<div class="know-modal" style="max-width:380px">
      <button class="know-modal-close" onclick="this.closest('.know-modal-overlay').remove()">&times;</button>
      <h2 style="font-size:16px;margin-bottom:12px">コスト項目を追加</h2>
      <div class="doc-form">
        <label>項目名<input type="text" id="cost-item-name" placeholder="外注加工費、塗装委託など" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <label>金額（円）<input type="number" id="cost-item-amount" placeholder="100000" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <label>カテゴリ<select id="cost-item-cat" style="width:100%;padding:6px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px">
          <option value="外注費">外注費</option><option value="社内人工">社内人工</option><option value="材料費">材料費</option><option value="その他">その他</option>
        </select></label>
        <button onclick="WebEditor._submitCostItem('${entityType}','${entityId}')" style="width:100%;padding:8px;font-size:13px;background:var(--color-text);color:#fff;border:none;border-radius:4px;cursor:pointer">追加</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    window._costAddCallback = callback;
  },

  /** 見積項目の手入力UI */
  addEstimateItemUI(entityType, entityId, callback) {
    const modal = document.createElement('div');
    modal.className = 'know-modal-overlay is-open';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `<div class="know-modal" style="max-width:380px">
      <button class="know-modal-close" onclick="this.closest('.know-modal-overlay').remove()">&times;</button>
      <h2 style="font-size:16px;margin-bottom:12px">見積項目を手入力</h2>
      <div class="doc-form">
        <label>項目名<input type="text" id="est-item-name" placeholder="設計費、材料費など" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <label>金額（円）<input type="number" id="est-item-amount" placeholder="1000000" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <label>編集者名<input type="text" id="est-item-editor" placeholder="あなたの名前" style="width:100%;padding:6px 8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin:4px 0 8px"></label>
        <button onclick="WebEditor._submitEstimateItem('${entityType}','${entityId}')" style="width:100%;padding:8px;font-size:13px;background:var(--color-text);color:#fff;border:none;border-radius:4px;cursor:pointer">追加</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    window._estAddCallback = callback;
  },

  /** 見積項目の送信処理 */
  _submitEstimateItem(entityType, entityId) {
    const name = document.getElementById('est-item-name').value.trim();
    const amount = parseInt(document.getElementById('est-item-amount').value) || 0;
    const editor = document.getElementById('est-item-editor').value.trim() || '手入力';
    if (!name || !amount) { alert('項目名と金額は必須です'); return; }
    this.addChange('add_estimate_item', { entityType, entityId, name, amount, editor });
    const key = `vuild_estimate_items_${entityType}_${entityId}`;
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.push({ name, amount, editor, added_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(items));
    document.querySelector('.know-modal-overlay')?.remove();
    if (window._estAddCallback) window._estAddCallback();
  },

  /** コスト項目追加の送信処理 */
  _submitCostItem(entityType, entityId) {
    const name = document.getElementById('cost-item-name').value.trim();
    const amount = parseInt(document.getElementById('cost-item-amount').value) || 0;
    const category = document.getElementById('cost-item-cat').value;
    if (!name || !amount) { alert('項目名と金額は必須です'); return; }
    this.addChange('add_cost_item', { entityType, entityId, name, amount, category });
    // Save to localStorage for immediate display
    const key = `vuild_cost_items_${entityType}_${entityId}`;
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.push({ name, amount, category });
    localStorage.setItem(key, JSON.stringify(items));
    document.querySelector('.know-modal-overlay')?.remove();
    if (window._costAddCallback) window._costAddCallback();
  }
};

/* ============================================================
   8. Pin Editor — 写真上のピン編集
   ============================================================ */
const PinEditor = {
  isEditing: false,
  entityType: null,
  entityId: null,
  currentPhotoIndex: 0,
  pins: [],
  linkOptions: [], // [{type, id, label}]

  /** 編集モードの初期化 */
  init(entityType, entityId, pins, linkOptions) {
    this.entityType = entityType;
    this.entityId = entityId;
    this.pins = [...pins];
    this.linkOptions = linkOptions;
  },

  /** 編集モードのトグル */
  toggle() {
    this.isEditing = !this.isEditing;
    const container = document.querySelector('.pin-photo-container');
    if (container) {
      container.classList.toggle('pin-editor-mode', this.isEditing);
    }
    const btn = document.getElementById('pin-edit-toggle');
    if (btn) btn.classList.toggle('is-active', this.isEditing);

    if (this.isEditing) {
      // Add click handler on photo to add pins
      const img = document.querySelector('.pin-photo-container img');
      if (img) {
        img.style.cursor = 'crosshair';
        img._pinClickHandler = e => {
          const rect = img.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
          const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
          this.showAddPinDialog(parseFloat(x), parseFloat(y));
        };
        img.addEventListener('click', img._pinClickHandler);
      }
    } else {
      const img = document.querySelector('.pin-photo-container img');
      if (img && img._pinClickHandler) {
        img.removeEventListener('click', img._pinClickHandler);
        img.style.cursor = 'pointer';
      }
    }
  },

  /** ピン追加ダイアログ */
  showAddPinDialog(x, y) {
    const options = this.linkOptions.map(o =>
      `<option value="${o.type}:${o.id}">${o.type === 'furniture' ? '[F] ' : '[M] '}${o.label}</option>`
    ).join('');

    const dialog = document.createElement('div');
    dialog.className = 'know-modal-overlay is-open';
    dialog.onclick = e => { if (e.target === dialog) dialog.remove(); };
    dialog.innerHTML = `<div class="know-modal" style="max-width:360px;padding:20px">
      <h2 style="font-size:16px;margin-bottom:12px">ピンを追加</h2>
      <p style="font-size:12px;color:var(--color-tertiary);margin-bottom:8px">位置: (${x}%, ${y}%)</p>
      <select id="pin-link-select" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin-bottom:8px">
        <option value="">リンク先を選択...</option>
        ${options}
      </select>
      <input id="pin-label-input" type="text" placeholder="ラベル（任意）" style="width:100%;padding:8px;border:1px solid var(--color-border);border-radius:4px;font-size:13px;margin-bottom:12px">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="this.closest('.know-modal-overlay').remove()" style="padding:6px 14px;font-size:12px;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;background:var(--color-surface)">キャンセル</button>
        <button onclick="PinEditor.confirmAdd(${x},${y})" style="padding:6px 14px;font-size:12px;background:var(--color-text);color:#fff;border:none;border-radius:4px;cursor:pointer">追加</button>
      </div>
    </div>`;
    document.body.appendChild(dialog);
  },

  /** ピン追加確定 */
  confirmAdd(x, y) {
    const select = document.getElementById('pin-link-select');
    const labelInput = document.getElementById('pin-label-input');
    if (!select.value) return;
    const [linkedType, linkedId] = select.value.split(':');
    const label = labelInput.value || select.options[select.selectedIndex].text.replace(/^\[.\] /, '');

    // Save to local pins array + localStorage
    const newPin = {
      photo_index: this.currentPhotoIndex, x, y,
      type: linkedType, id: linkedId, label
    };
    this.pins.push(newPin);
    this.savePins();

    // Record for Claude sync
    WebEditor.addPin(this.entityType, this.entityId, this.currentPhotoIndex, x, y, linkedType, linkedId, label);

    // Close dialog & refresh photo to show pin
    document.querySelector('.know-modal-overlay')?.remove();
    if (typeof refreshCurrentPhoto === 'function') refreshCurrentPhoto();
  },

  /** ピン削除 */
  deletePin(photoIndex, pinIdx) {
    const pinsForPhoto = this.pins.filter(p => p.photo_index === photoIndex);
    const pin = pinsForPhoto[pinIdx];
    if (!pin) return;
    this.pins = this.pins.filter(p => p !== pin);
    this.savePins();
    WebEditor.removePin(this.entityType, this.entityId, photoIndex, pinIdx);
    if (typeof refreshCurrentPhoto === 'function') refreshCurrentPhoto();
  },

  /** localStorageにピンを保存 */
  savePins() {
    const key = `vuild_pins_${this.entityType}_${this.entityId}`;
    localStorage.setItem(key, JSON.stringify(this.pins));
  },

  /** localStorageからピンを読み込み（データのピンとマージ） */
  loadPins(dataPins) {
    const key = `vuild_pins_${this.entityType}_${this.entityId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.pins = JSON.parse(saved);
        return this.pins;
      } catch {}
    }
    this.pins = [...dataPins];
    return this.pins;
  }
};

/* ============================================================
   初期化: ページ読み込み時にバッジ + 同期バーを更新
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  EditManager.updateBadge();
  WebEditor.updateSyncBar();
});
