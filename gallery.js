/* ===== Interagood homepage: top RTL category banner ===== */

const API = (window.SITE && window.SITE.apiBase) ? window.SITE.apiBase : '';

const BANNER_ICONS = {
  hammer: '🔨',
  droplet: '🚿',
  'paint-brush': '🎨',
  zap: '⚡',
  wall: '🧱',
  flame: '🛠️',
  layers: '🏠',
  grid: '🏛️',
  home: '🛋️',
  maximize: '🪟',
  tree: '🌲',
  'layout-grid': '🪵',
  palette: '🖼️',
  tool: '🔩',
  square: '🪞',
  mountain: '⛰️',
  package: '📦',
  wind: '❄️',
};

function resolveBannerIcon(raw, name) {
  const label = String(name || '').toLowerCase();
  if (label.includes('wallpaper') || label.includes('panel')) return '🖼️';
  if (label.includes('wooden floor')) return '🪵';
  if (label.includes('tile') || label.includes('marble') || label.includes('granite')) return '🏛️';
  if (label.includes('paint') || label.includes('polish')) return '🎨';
  if (label.includes('ac ') || label.includes('appliance')) return '❄️';
  if (!raw) return '◆';
  const key = String(raw).trim().toLowerCase();
  if (BANNER_ICONS[key]) return BANNER_ICONS[key];
  return /[^\x00-\x7F]/.test(raw) ? raw : '◆';
}

function escapeBannerText(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function buildBannerItems(list) {
  const html = list.map(c => {
    const icon = resolveBannerIcon(c.icon || c.icon_name, c.name);
    const kind = c._kind || 'partner';
    if (kind === 'partner') {
      return `
        <button type="button" class="banner-item banner-btn" data-banner-dbid="${escapeBannerText(c.id)}" data-banner-name="${escapeBannerText(c.name)}">
          <span class="banner-icon" aria-hidden="true">${icon}</span>
          <span class="banner-name">${escapeBannerText(c.name)}</span>
        </button>
      `;
    }
    return `
      <a class="banner-item banner-btn" href="#supplier-showcase">
        <span class="banner-icon" aria-hidden="true">${icon}</span>
        <span class="banner-name">${escapeBannerText(c.name)}</span>
      </a>
    `;
  }).join('');
  return html + html;
}

async function loadCategoryBanner() {
  const track = document.getElementById('banner-track');
  if (!track) return;

  track.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-banner-name]');
    if (!btn) return;
    const dbId = Number(btn.getAttribute('data-banner-dbid')) || null;
    const name = btn.getAttribute('data-banner-name') || '';
    document.dispatchEvent(new CustomEvent('ig:select-category', { detail: { dbId, name } }));
  });

  try {
    const [pRes, sRes] = await Promise.all([
      fetch(`${API}/categories/partner`),
      fetch(`${API}/categories/supplier`),
    ]);
    const pData = await pRes.json();
    const sData = await sRes.json();
    const pList = (pData.data || []).map(c => ({ ...c, _kind: 'partner' }));
    const sList = (sData.data || []).map(c => ({ ...c, _kind: 'supplier' }));
    const cats = pList.concat(sList);
    if (!cats.length) throw new Error('empty');
    track.innerHTML = buildBannerItems(cats);
  } catch (e) {
    const fallbackPartner = ((window.CATALOG && window.CATALOG.partner) || []).map(c => ({
      id: c.dbId,
      name: c.name,
      icon: c.icon,
      _kind: 'partner',
    }));
    const fallbackSupplier = ((window.CATALOG && window.CATALOG.supplier) || []).map((c, idx) => ({
      id: idx + 1,
      name: c.name,
      icon: c.icon,
      _kind: 'supplier',
    }));
    const cats = fallbackPartner.concat(fallbackSupplier);
    if (cats.length) {
      track.innerHTML = buildBannerItems(cats);
    } else {
      track.innerHTML = '<div class="banner-item"><span class="banner-icon">🔨</span><span class="banner-name">Carpenter (Woodwork &amp; Furniture)</span></div><div class="banner-item"><span class="banner-icon">⚡</span><span class="banner-name">Electrician (Electrical &amp; Lighting)</span></div><div class="banner-item"><span class="banner-icon">🚿</span><span class="banner-name">Plumber (Sanitary &amp; Water Fitting)</span></div>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategoryBanner();
});
