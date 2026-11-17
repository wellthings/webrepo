/* ===== Interagood homepage: category banner + image gallery ===== */

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
};

function resolveBannerIcon(raw) {
  if (!raw) return '◆';
  const key = String(raw).trim().toLowerCase();
  if (BANNER_ICONS[key]) return BANNER_ICONS[key];
  // If already an emoji / non-ASCII symbol, keep as-is; otherwise fallback cleanly
  return /[^\x00-\x7F]/.test(raw) ? raw : '◆';
}

function escapeBannerText(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- RTL category banner ---------- */
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

/* ---------- Image gallery from site_images bucket ---------- */
async function loadGallery() {
  const wrap = document.getElementById('gallery-wrap');
  const portraits = document.getElementById('gallery-portraits');
  const mainImg = document.getElementById('gallery-main-img');
  const imgBox = document.getElementById('gallery-img-box');
  const nameEl = document.getElementById('gallery-name');
  if (!wrap || !portraits || !mainImg) return;

  let images = [];
  try {
    const res = await fetch(`${API}/site-images`);
    const data = await res.json();
    images = (data.data || []).map((img, i) => ({
      id: i,
      name: img.displayName || img.name || 'Interior',
      url: img.url,
    }));
  } catch (e) {
    images = [];
  }

  if (!images.length) {
    wrap.innerHTML = '<div class="gallery-empty">No images available in site_images bucket.</div>';
    return;
  }

  let current = 0;
  let paused = false;
  let raf;

  function render() {
    const active = images[current];
    mainImg.src = active.url;
    mainImg.alt = active.name;
    nameEl.textContent = active.name;

    portraits.innerHTML = images.map((img, i) => `
      <div class="gallery-portrait ${i === current ? 'active' : ''}" data-index="${i}">
        <img src="${img.url}" alt="${img.name}">
        <span class="portrait-name">${img.name}</span>
      </div>
    `).join('');
  }

  render();

  portraits.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-portrait');
    if (!item) return;
    current = parseInt(item.dataset.index, 10);
    render();
    openExpand(images[current]);
  });

  const expand = document.getElementById('gallery-expand');
  const expandImg = document.getElementById('gallery-expand-img');
  const expandClose = document.getElementById('gallery-expand-close');

  function openExpand(img) {
    if (!expand || !expandImg) return;
    expandImg.src = img.url;
    expandImg.alt = img.name;
    expand.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeExpand() {
    if (!expand) return;
    expand.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (expandClose) expandClose.addEventListener('click', closeExpand);
  if (expand) expand.addEventListener('click', (e) => { if (e.target === expand) closeExpand(); });

  function next() {
    if (paused) return;
    current = (current + 1) % images.length;
    render();
    raf = requestAnimationFrame(() => {
      const now = Date.now();
      if (!paused && now - lastTick > 2200) {
        lastTick = now;
        next();
      } else if (!paused) {
        raf = requestAnimationFrame(loop);
      }
    });
  }

  let lastTick = Date.now();
  function loop() {
    if (!paused) {
      const now = Date.now();
      if (now - lastTick > 2200) {
        lastTick = now;
        next();
      }
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { paused = false; lastTick = Date.now(); });

  window.addEventListener('scroll', () => {
    if (paused) {
      paused = false;
      lastTick = Date.now();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategoryBanner();
  loadGallery();
});
