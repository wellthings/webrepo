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
  'layout-grid': '🪨',
  palette: '🎨',
  tool: '🔩',
  square: '🪞',
  mountain: '⛰️',
  package: '📦',
  wind: '❄️',
};

function resolveBannerIcon(raw) {
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

async function loadCategoryBanner() {
  const track = document.getElementById('banner-track');
  if (!track) return;
  try {
    const [pRes, sRes] = await Promise.all([
      fetch(`${API}/categories/partner`),
      fetch(`${API}/categories/supplier`),
    ]);
    const pData = await pRes.json();
    const sData = await sRes.json();
    const cats = (pData.data || []).concat(sData.data || []);
    if (!cats.length) {
      track.innerHTML = '<div class="banner-item"><span class="banner-icon">🏠</span><span class="banner-name">Interior Services</span></div>';
      return;
    }
    const html = cats.map(c => {
      const icon = resolveBannerIcon(c.icon || c.icon_name);
      return `
        <div class="banner-item">
          <span class="banner-icon" aria-hidden="true">${icon}</span>
          <span class="banner-name">${escapeBannerText(c.name)}</span>
        </div>
      `;
    }).join('');
    track.innerHTML = html + html;
  } catch (e) {
    track.innerHTML = '<div class="banner-item"><span class="banner-icon">🏠</span><span>Interior Design</span></div><div class="banner-item"><span class="banner-icon">🔨</span><span>Modular Kitchen</span></div><div class="banner-item"><span class="banner-icon">🛋️</span><span>Wardrobe</span></div><div class="banner-item"><span class="banner-icon">🚿</span><span>Plumbing</span></div><div class="banner-item"><span class="banner-icon">⚡</span><span>Electrical</span></div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategoryBanner();
});
