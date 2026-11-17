(function () {
  var SITE = window.SITE || {};
  var API = SITE.apiBase;
  var C = window.CATALOG;
  if (!C) return;
  var LOC = 'ig_loc';

  var SUP_DB = {
    plywood: [1], laminates: [1], hardware: [4], 'electrical-supply': [5], 'lighting-supply': [5],
    'plumbing-supply': [2, 4], 'bath-fittings': [2], cement: [8], 'tiles-supply': [2, 7], 'paint-supply': [3],
    'glass-supply': [6], aluminium: [6, 4], steel: [4, 8], foam: [], gypsum: [8, 3], appliances: [],
    'wallpaper-supply': [3], 'blinds-supply': []
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function img(src, alt) {
    var i = el('img'); i.alt = alt || ''; i.loading = 'lazy'; i.decoding = 'async'; i.draggable = false; i.src = src || 'assets/logo-square.png';
    i.onerror = function () { i.onerror = null; i.src = 'assets/logo-square.png'; };
    return i;
  }
  function loc() { try { return JSON.parse(localStorage.getItem(LOC)); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function maskPhone(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    if (d.length < 10) return 'Privacy protected';
    var l = d.slice(-10);
    return '+91 ' + l.slice(0, 2) + 'XXX-XX' + l.slice(-3);
  }
  var partnerSrc = function (c, m) {
    return m[3] ? (C.base + 'partner/' + m[3] + '.jpg') : (C.base + 'partner/' + c.id + '/' + m[0] + '.jpg');
  };
  var supplierSrc = function (c, m) { return C.base + 'supplier/' + c.id + '/' + m[0] + '.jpg'; };

  // ---------- Live Marketplace Tabs: Work Modules (Partner & Architect samples) + Products (Architect posts) ----------
  var archGrid = document.getElementById('arch-posts-grid');
  var archEmpty = document.getElementById('arch-posts-empty');
  var workSamplesGrid = document.getElementById('work-samples-grid');
  var workSamplesEmpty = document.getElementById('work-samples-empty');
  var wsClearBtn = document.getElementById('ws-clear-filter');
  var wsSub = document.getElementById('ws-sub');

  var supShowcaseGrid = document.getElementById('supplier-showcase-grid');
  var supShowcaseEmpty = document.getElementById('supplier-showcase-empty');
  var supFilterBtns = Array.prototype.slice.call(document.querySelectorAll('[data-sup-filter]'));

  var mktTabs = Array.prototype.slice.call(document.querySelectorAll('[data-mkt-tab]'));
  var mktPanels = {
    catalog: document.getElementById('mkt-panel-catalog'),
    products: document.getElementById('mkt-panel-products')
  };

  var liveData = {
    work_samples: [],
    architect_posts: [],
    supplier_products: [],
    supplier_samples: []
  };
  var supFilter = 'all';
  var state = { role: 'partner', cat: '', q: '' };

  mktTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-mkt-tab');
      mktTabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      Object.keys(mktPanels).forEach(function (k) {
        if (mktPanels[k]) mktPanels[k].hidden = k !== target;
      });
    });
  });

  // Reusable Marketplace Detail Modal
  var mktModalBackdrop = el('div', 'mkt-modal-backdrop');
  mktModalBackdrop.hidden = true;
  mktModalBackdrop.setAttribute('role', 'dialog');
  mktModalBackdrop.setAttribute('aria-modal', 'true');
  document.body.appendChild(mktModalBackdrop);

  function closeMktModal() {
    mktModalBackdrop.hidden = true;
    mktModalBackdrop.innerHTML = '';
    document.body.style.overflow = '';
  }
  mktModalBackdrop.addEventListener('click', function (e) { if (e.target === mktModalBackdrop) closeMktModal(); });

  function handleProfileContact(creator, action) {
    var w = action === 'chat' ? window.open('', '_blank') : null;
    if (w) w.opener = null;
    if (creator && creator.id && String(creator.id).length > 12) {
      fetch(API + '/public/profiles/' + creator.id + '/contact?action=' + action)
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message); return d.url; }); })
        .then(function (url) { if (w) w.location.href = url; else window.location.href = url; })
        .catch(function () { if (w) w.close(); });
    } else {
      var fallback = (window.SITE && window.SITE.phoneEncoded) ? atob(window.SITE.phoneEncoded) : '+919794134534';
      var digits = fallback.replace(/\D/g, '');
      var u = action === 'call' ? 'tel:+' + digits : 'https://wa.me/' + digits + '?text=' + encodeURIComponent('Hello ' + ((creator && creator.business_name) || 'Interagood') + ', I saw your work on Interagood.');
      if (w) w.location.href = u; else window.location.href = u;
    }
  }

  var CAT_ICONS = {
    hammer: '🔨', zap: '⚡', droplet: '🚿', 'paint-brush': '🎨', layers: '🏠',
    grid: '🏛️', 'layout-grid': '🪵', maximize: '🪟', square: '🪞', flame: '🛠️',
    home: '🛋️', palette: '🖼️', wind: '❄️', wall: '🧱', tree: '🌲', tool: '🔩'
  };
  var partnerCats = (C.partner || []).slice();

  function findCatById(catId) {
    if (!catId) return null;
    for (var i = 0; i < partnerCats.length; i++) {
      if (partnerCats[i].id === catId || String(partnerCats[i].dbId) === String(catId)) return partnerCats[i];
    }
    return null;
  }

  function catLabelForId(catId) {
    var c = findCatById(catId);
    return c ? c.name : '';
  }

  function resolveCatIcon(raw, name) {
    var label = String(name || '').toLowerCase();
    if (label.includes('wallpaper') || label.includes('panel')) return '🖼️';
    if (label.includes('wooden floor')) return '🪵';
    if (label.includes('tile') || label.includes('marble') || label.includes('granite')) return '🏛️';
    if (label.includes('paint') || label.includes('polish')) return '🎨';
    if (label.includes('ac ') || label.includes('appliance')) return '❄️';
    var key = String(raw || '').trim().toLowerCase();
    if (CAT_ICONS[key]) return CAT_ICONS[key];
    return /[^\x00-\x7F]/.test(String(raw || '')) ? raw : '🔧';
  }

  function sampleMatchesFilter(s) {
    if (state.cat) {
      var cat = findCatById(state.cat);
      var catName = (cat ? cat.name : '').toLowerCase();
      var hay = [
        s.category_name,
        s.creator && s.creator.category_name,
        s.title,
        s.caption
      ].filter(Boolean).join(' ').toLowerCase();
      var matched = hay.indexOf(String(state.cat).toLowerCase()) !== -1;
      if (!matched && catName) {
        var primary = catName.split('(')[0].split('&')[0].trim();
        if (primary && hay.indexOf(primary) !== -1) matched = true;
      }
      if (!matched && cat && Array.isArray(cat.keywords)) {
        for (var k = 0; k < cat.keywords.length; k++) {
          if (hay.indexOf(cat.keywords[k]) !== -1) { matched = true; break; }
        }
      }
      if (!matched) return false;
    }
    if (state.q) {
      var qHay = [s.title, s.caption, s.category_name, s.creator && s.creator.business_name].filter(Boolean).join(' ').toLowerCase();
      if (qHay.indexOf(state.q) === -1) return false;
    }
    return true;
  }

  // ---------- Modeled Work Samples (Real Partner & Architect samples) ----------
  function renderWorkSamples() {
    if (!workSamplesGrid) return;
    workSamplesGrid.innerHTML = '';
    if (wsClearBtn) wsClearBtn.hidden = !state.cat;
    if (wsSub) {
      var activeCatName = catLabelForId(state.cat);
      wsSub.textContent = activeCatName
        ? 'Showing ' + activeCatName + ' work samples & booking modules.'
        : 'Real uploaded Partner & Architect work modeled for booking — choose New, Repairing or Full interior and add to your cart.';
    }

    var filtered = liveData.work_samples.filter(sampleMatchesFilter);
    if (!filtered.length) {
      if (workSamplesEmpty) {
        workSamplesEmpty.hidden = false;
        workSamplesEmpty.textContent = liveData.work_samples.length
          ? 'No partner or architect work samples matched this category yet — pick a standard work module below.'
          : 'No partner or architect work samples uploaded yet — pick any work module below to book a free site visit.';
      }
      return;
    }
    if (workSamplesEmpty) workSamplesEmpty.hidden = true;

    filtered.forEach(function (s) {
      var creator = s.creator || {};
      var roleName = s.role === 'architect' ? 'Architect Sample' : 'Partner Sample';
      var catTitle = s.category_name || creator.category_name || (s.role === 'architect' ? 'Architecture' : 'Interior Work');
      var imgUrl = s.thumbnail_url || s.media_url || 'assets/logo-square.png';

      var card = el('article', 'mod-card');
      var pic = el('div', 'mod-img');
      pic.style.cursor = 'pointer';
      pic.appendChild(img(imgUrl, s.title));
      pic.appendChild(el('span', 'mod-cat', catTitle));
      pic.appendChild(el('span', 'ws-role-pill ' + (s.role === 'architect' ? 'architect' : 'partner'), roleName));

      var mode = 'new', btns = [];
      var row = el('div', 'mode-row');
      var fullBtn = el('button', 'mode', 'Full interior');
      fullBtn.type = 'button';
      fullBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        mode = 'full_interior';
        btns.forEach(function (o) { o.classList.toggle('on', o === fullBtn); });
      });
      btns.push(fullBtn);
      row.appendChild(fullBtn);

      [['repair', 'Repairing'], ['new', 'New']].forEach(function (x) {
        var b = el('button', 'mode' + (x[0] === mode ? ' on' : ''), x[1]);
        b.type = 'button'; b.setAttribute('data-mode', x[0]);
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          mode = x[0];
          btns.forEach(function (o) { o.classList.toggle('on', o === b); });
        });
        btns.push(b); row.appendChild(b);
      });
      pic.appendChild(row);
      pic.addEventListener('click', function () { openSampleDetailModal(s, mode); });
      card.appendChild(pic);

      var body = el('div', 'mod-body');
      var heading = el('h3', '', s.title || 'Work Sample');
      heading.addEventListener('click', function () { openSampleDetailModal(s, mode); });
      body.appendChild(heading);

      var whoText = (creator.business_name || (s.role === 'architect' ? 'Verified Architect' : 'Verified Partner')) + (creator.city ? ' · ' + creator.city : '');
      body.appendChild(el('div', 'ws-creator', whoText));
      if (Number(s.price) > 0) {
        body.appendChild(el('div', 'ws-price', '₹' + Number(s.price).toLocaleString('en-IN') + ' / ' + (s.price_unit || 'unit')));
      }

      var acts = el('div', 'ws-actions');
      var add = el('button', 'add-btn', 'Add to Cart');
      add.type = 'button';
      add.addEventListener('click', function () {
        if (!window.IGCart) return;
        window.IGCart.add({
          cat: catTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          catName: catTitle,
          module: s.title || 'Work Sample',
          mode: mode,
          img: imgUrl
        });
        add.textContent = 'Added'; add.classList.add('added');
        setTimeout(function () { add.textContent = 'Add to Cart'; add.classList.remove('added'); }, 1200);
      });
      var det = el('button', 'ws-detail-btn', 'View');
      det.type = 'button';
      det.addEventListener('click', function () { openSampleDetailModal(s, mode); });
      acts.appendChild(add);
      acts.appendChild(det);
      body.appendChild(acts);
      card.appendChild(body);
      workSamplesGrid.appendChild(card);
    });
  }

  function openSampleDetailModal(s, selectedMode) {
    var creator = s.creator || {};
    var masked = creator.masked_phone || maskPhone(creator.phone);
    var isSupplier = s.role === 'supplier';
    var isArch = s.role === 'architect';
    var roleBadge = isSupplier ? 'Supplier Sample' : isArch ? 'Architect Sample' : 'Partner Sample';
    var catTitle = s.category_name || creator.category_name || roleBadge;
    var photoUrl = s.media_url || s.thumbnail_url || 'assets/logo-square.png';

    var modal = el('div', 'mkt-modal');
    var closeBtn = el('button', 'mkt-close', '×');
    closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close sample detail');
    closeBtn.addEventListener('click', closeMktModal);
    modal.appendChild(closeBtn);

    if (s.media_type === 'video' && s.media_url) {
      var vid = el('video', 'mkt-hero-photo');
      vid.src = s.media_url;
      vid.controls = true;
      vid.playsInline = true;
      modal.appendChild(vid);
    } else {
      var hero = el('img', 'mkt-hero-photo');
      hero.src = photoUrl;
      hero.alt = s.title || roleBadge;
      hero.onerror = function () { hero.onerror = null; hero.src = 'assets/logo-square.png'; };
      modal.appendChild(hero);
    }

    var body = el('div', 'mkt-modal-body');
    var priceHtml = Number(s.price) > 0
      ? '<div style="font-size:1.3rem;font-weight:800;color:#0b1f3a;font-variant-numeric:tabular-nums;">₹' + Number(s.price).toLocaleString('en-IN') + ' <span style="font-size:0.84rem;font-weight:600;color:#64748b;">/ ' + esc(s.price_unit || 'unit') + '</span></div>'
      : '';

    body.innerHTML =
      '<div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
      '<span style="font-size:0.76rem;font-weight:700;text-transform:uppercase;color:#64748b;">' + esc(catTitle) + '</span>' +
      '<span class="sup-kind-badge sample">' + esc(roleBadge) + '</span>' +
      '</div>' +
      '<h3 style="margin:6px 0 6px;font-size:1.25rem;color:#0b1f3a;">' + esc(s.title || 'Work Sample') + '</h3>' +
      priceHtml +
      '</div>' +
      (s.caption ? '<p style="margin:0;color:#334155;font-size:0.92rem;line-height:1.6;">' + esc(s.caption) + '</p>' : '') +
      '<div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
      '<div style="min-width:0;"><strong style="color:#0b1f3a;font-size:0.94rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(creator.business_name || 'Verified Professional') + '</strong>' +
      '<div style="font-size:0.78rem;color:#64748b;">' + (creator.username ? '@' + esc(creator.username) + ' · ' : '') + (creator.city ? esc(creator.city) + ' · ' : '') + esc(masked) + '</div></div>' +
      '<span style="color:#15803d;font-size:0.78rem;font-weight:800;white-space:nowrap;">✓ Verified</span></div>' +
      (!isSupplier ? '<button type="button" class="add-btn" id="ws-modal-cart">Add Work to Site Visit Cart</button>' : '');
    modal.appendChild(body);

    var bar = el('div', 'mkt-bottom-bar');
    var callBtn = el('button', 'mkt-action-btn call', 'Call (' + masked + ')');
    callBtn.type = 'button';
    callBtn.addEventListener('click', function () { handleProfileContact(creator, 'call'); });
    var chatBtn = el('button', 'mkt-action-btn chat', 'Chat (' + masked + ')');
    chatBtn.type = 'button';
    chatBtn.addEventListener('click', function () { handleProfileContact(creator, 'chat'); });
    bar.appendChild(callBtn); bar.appendChild(chatBtn);
    modal.appendChild(bar);

    mktModalBackdrop.innerHTML = '';
    mktModalBackdrop.appendChild(modal);
    mktModalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    var cartBtn = modal.querySelector('#ws-modal-cart');
    if (cartBtn) {
      cartBtn.addEventListener('click', function () {
        if (!window.IGCart) return;
        window.IGCart.add({
          cat: catTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          catName: catTitle,
          module: s.title || 'Work Sample',
          mode: selectedMode || 'new',
          img: s.thumbnail_url || s.media_url || 'assets/logo-square.png'
        });
        cartBtn.textContent = 'Added to Cart ✓';
        cartBtn.classList.add('added');
      });
    }
  }

  // ---------- Architect Products (Real data under Products button in Live Marketplace) ----------
  function renderArchitectProducts(list) {
    if (!archGrid) return;
    archGrid.innerHTML = '';
    if (!list.length) {
      if (archEmpty) archEmpty.hidden = false;
      return;
    }
    if (archEmpty) archEmpty.hidden = true;

    list.forEach(function (post) {
      var creator = post.creator || {};
      var card = el('article', 'arch-card');
      var im = el('div', 'arch-img');
      im.appendChild(img(post.image_url, post.title));
      card.appendChild(im);

      var body = el('div', 'arch-body');
      var top = el('div', 'arch-top-meta');
      top.appendChild(el('span', 'arch-cat-label', (post.category || 'Interior') + (post.sub_category ? ' → ' + post.sub_category : '')));
      top.appendChild(el('span', 'with-material-tag', post.with_material ? 'with material' : 'Architect Product'));
      body.appendChild(top);
      body.appendChild(el('h3', 'arch-title', post.title));
      body.appendChild(el('div', 'ws-creator', (creator.business_name || 'Verified Architect') + (creator.city ? ' · ' + creator.city : '')));
      body.appendChild(el('div', 'arch-rate', '₹' + Number(post.rate_per_unit || 0).toLocaleString('en-IN') + ' / ' + (post.unit || 'sqft')));

      var calcBtn = el('button', 'get-calc-btn', 'Get Calculate');
      calcBtn.type = 'button';
      body.appendChild(calcBtn);
      card.appendChild(body);

      card.addEventListener('click', function () { openArchitectPopup(post); });
      archGrid.appendChild(card);
    });
  }

  function openArchitectPopup(post) {
    var creator = post.creator || {};
    var masked = creator.masked_phone || maskPhone(creator.phone);
    var modal = el('div', 'mkt-modal');
    var closeBtn = el('button', 'mkt-close', '×');
    closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close calculator');
    closeBtn.addEventListener('click', closeMktModal);
    modal.appendChild(closeBtn);

    var body = el('div', 'mkt-modal-body');
    var bName = creator.business_name || 'Verified Architect Studio';
    var uName = creator.username ? '@' + creator.username : '@architect';
    var avHtml = creator.profile_photo_url
      ? '<img src="' + esc(creator.profile_photo_url) + '" alt="' + esc(bName) + '">'
      : esc(bName.charAt(0).toUpperCase());

    body.innerHTML =
      '<div class="arch-biz-card">' +
      '<div class="arch-biz-banner"><img src="' + esc(creator.banner_url || post.image_url || 'assets/interior-hero.webp') + '" alt="" onerror="this.style.display=\'none\'"></div>' +
      '<div class="arch-biz-row">' +
      '<div class="arch-biz-av">' + avHtml + '</div>' +
      '<div style="padding-top:24px;min-width:0;">' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
      '<strong style="color:#0b1f3a;font-size:1.02rem;">' + esc(bName) + '</strong>' +
      '<span class="arch-verified-badge">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1d9bf0" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/><path d="M8.5 12.5l2.3 2.3 4.9-5.1" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      'Architect Verified</span></div>' +
      '<div style="font-size:0.8rem;color:#64748b;">' + esc(uName) + ' · ' + esc(masked) + '</div>' +
      '</div></div></div>' +
      '<div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<span class="arch-cat-label">' + esc(post.category || 'Interior') + (post.sub_category ? ' → ' + esc(post.sub_category) : '') + '</span>' +
      '<span class="with-material-tag">' + (post.with_material ? 'with material' : 'Architect Product') + '</span>' +
      '</div>' +
      '<h3 style="margin:6px 0 4px;color:#0b1f3a;">' + esc(post.title) + '</h3>' +
      '<p style="margin:0;color:#475569;font-size:0.88rem;line-height:1.55;">' + esc(post.description || '') + '</p>' +
      '</div>' +
      '<div class="popup-calc">' +
      '<strong style="color:#0b1f3a;font-size:0.94rem;">Interactive Budget Calculator</strong>' +
      '<div class="popup-calc-row">' +
      '<div><label style="font-size:0.76rem;margin-bottom:4px;">Measurement Unit</label>' +
      '<select id="pop-unit">' +
      '<option value="sqft">Square Feet (Sqft)</option>' +
      '<option value="sqfit">Square Feet (Sqfit)</option>' +
      '<option value="rft">Running Feet (Rft)</option>' +
      '<option value="feet">Feet</option>' +
      '<option value="inches">Inches</option>' +
      '<option value="pcs">Pieces</option>' +
      '</select></div>' +
      '<div><label style="font-size:0.76rem;margin-bottom:4px;">Area / Quantity</label>' +
      '<input id="pop-qty" type="number" min="1" step="1" value="' + esc(post.quantity || 100) + '"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px dashed #cbd5e1;">' +
      '<span style="font-size:0.84rem;color:#475569;">Rate: ₹' + Number(post.rate_per_unit || 0).toLocaleString('en-IN') + ' / ' + esc(post.unit || 'sqft') + ' + 18% GST</span>' +
      '<strong id="pop-total" style="font-size:1.25rem;color:#0b1f3a;font-variant-numeric:tabular-nums;">₹0</strong>' +
      '</div></div>';

    modal.appendChild(body);

    var bar = el('div', 'mkt-bottom-bar');
    var callBtn = el('button', 'mkt-action-btn call', 'Call Architect');
    callBtn.type = 'button';
    callBtn.addEventListener('click', function () { handleProfileContact(creator, 'call'); });
    var msgBtn = el('button', 'mkt-action-btn chat', 'Message Architect');
    msgBtn.type = 'button';
    msgBtn.addEventListener('click', function () { handleProfileContact(creator, 'chat'); });
    bar.appendChild(callBtn); bar.appendChild(msgBtn);
    modal.appendChild(bar);

    mktModalBackdrop.innerHTML = '';
    mktModalBackdrop.appendChild(modal);
    mktModalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    var unitSel = modal.querySelector('#pop-unit');
    if (unitSel && post.unit) unitSel.value = post.unit;
    var qtyInput = modal.querySelector('#pop-qty');
    var totEl = modal.querySelector('#pop-total');
    function updateCalc() {
      var q = Math.max(0, Number(qtyInput.value) || 0);
      var base = (Number(post.rate_per_unit) || 0) * q;
      var total = Math.round(base * 1.18);
      totEl.textContent = '₹' + total.toLocaleString('en-IN');
    }
    qtyInput.addEventListener('input', updateCalc);
    unitSel.addEventListener('change', updateCalc);
    updateCalc();
  }

  // ---------- Supplier Showcase Section (Real Supplier Products & Samples — replaces Explore our work) ----------
  function renderSupplierShowcase() {
    if (!supShowcaseGrid) return;
    supShowcaseGrid.innerHTML = '';
    var prods = liveData.supplier_products || [];
    var smps = liveData.supplier_samples || [];

    var cAll = document.getElementById('sup-count-all');
    var cProd = document.getElementById('sup-count-prod');
    var cSmp = document.getElementById('sup-count-smp');
    if (cAll) cAll.textContent = '(' + (prods.length + smps.length) + ')';
    if (cProd) cProd.textContent = '(' + prods.length + ')';
    if (cSmp) cSmp.textContent = '(' + smps.length + ')';

    var combined = [];
    if (supFilter === 'all' || supFilter === 'product') {
      prods.forEach(function (p) { combined.push({ kind: 'product', item: p, created_at: p.created_at || '' }); });
    }
    if (supFilter === 'all' || supFilter === 'sample') {
      smps.forEach(function (s) { combined.push({ kind: 'sample', item: s, created_at: s.created_at || '' }); });
    }
    combined.sort(function (a, b) {
      return String(b.created_at).localeCompare(String(a.created_at));
    });

    if (!combined.length) {
      if (supShowcaseEmpty) {
        supShowcaseEmpty.hidden = false;
        supShowcaseEmpty.textContent = supFilter === 'product'
          ? 'No supplier products posted yet.'
          : supFilter === 'sample'
            ? 'No supplier samples uploaded yet.'
            : 'No supplier products or samples posted yet.';
      }
      return;
    }
    if (supShowcaseEmpty) supShowcaseEmpty.hidden = true;

    combined.forEach(function (entry) {
      if (entry.kind === 'product') {
        var p = entry.item;
        var creator = p.creator || {};
        var card = el('button', 'amz-card');
        card.type = 'button';
        var photo = el('div', 'amz-photo');
        photo.appendChild(img(p.image_url, p.title));
        card.appendChild(photo);

        var info = el('div', 'amz-info');
        info.appendChild(el('span', 'sup-kind-badge product', 'Product'));
        info.appendChild(el('span', 'amz-cat', p.category || 'Material'));
        info.appendChild(el('h3', 'amz-title', p.title));
        var price = el('div', 'amz-price');
        price.innerHTML = '₹' + Number(p.rate_per_unit || 0).toLocaleString('en-IN') + ' <small>/ ' + esc(p.unit || 'unit') + (p.quantity ? ' · ' + esc(p.quantity) + ' qty' : '') + '</small>';
        info.appendChild(price);
        info.appendChild(el('div', 'amz-seller', (creator.business_name || 'Verified Supplier') + (creator.city ? ' · ' + creator.city : '')));
        card.appendChild(info);

        card.addEventListener('click', function () { openProductDetailModal(p); });
        supShowcaseGrid.appendChild(card);
      } else {
        var s = entry.item;
        var sCreator = s.creator || {};
        var sCard = el('button', 'amz-card');
        sCard.type = 'button';
        var sPhoto = el('div', 'amz-photo');
        sPhoto.appendChild(img(s.thumbnail_url || s.media_url, s.title));
        sCard.appendChild(sPhoto);

        var sInfo = el('div', 'amz-info');
        sInfo.appendChild(el('span', 'sup-kind-badge sample', 'Sample'));
        sInfo.appendChild(el('span', 'amz-cat', s.category_name || sCreator.category_name || 'Material Sample'));
        sInfo.appendChild(el('h3', 'amz-title', s.title || 'Supplier Sample'));
        if (Number(s.price) > 0) {
          var sPrice = el('div', 'amz-price');
          sPrice.innerHTML = '₹' + Number(s.price).toLocaleString('en-IN') + ' <small>/ ' + esc(s.price_unit || 'unit') + '</small>';
          sInfo.appendChild(sPrice);
        }
        sInfo.appendChild(el('div', 'amz-seller', (sCreator.business_name || 'Verified Supplier') + (sCreator.city ? ' · ' + sCreator.city : '')));
        sCard.appendChild(sInfo);

        sCard.addEventListener('click', function () { openSampleDetailModal(s, 'new'); });
        supShowcaseGrid.appendChild(sCard);
      }
    });
  }

  function openProductDetailModal(p) {
    var creator = p.creator || {};
    var masked = creator.masked_phone || maskPhone(creator.phone);
    var modal = el('div', 'mkt-modal');
    var closeBtn = el('button', 'mkt-close', '×');
    closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close product detail');
    closeBtn.addEventListener('click', closeMktModal);
    modal.appendChild(closeBtn);

    var hero = el('img', 'mkt-hero-photo');
    hero.src = p.image_url || 'assets/logo-square.png';
    hero.alt = p.title;
    hero.onerror = function () { hero.onerror = null; hero.src = 'assets/logo-square.png'; };
    modal.appendChild(hero);

    var body = el('div', 'mkt-modal-body');
    body.innerHTML =
      '<div>' +
      '<div style="font-size:0.76rem;font-weight:700;text-transform:uppercase;color:#64748b;">' + esc(p.category || 'Supplier Product') + '</div>' +
      '<h3 style="margin:4px 0 6px;font-size:1.3rem;color:#0b1f3a;">' + esc(p.title) + '</h3>' +
      '<div style="font-size:1.4rem;font-weight:800;color:#0b1f3a;font-variant-numeric:tabular-nums;">₹' + Number(p.rate_per_unit || 0).toLocaleString('en-IN') +
      ' <span style="font-size:0.86rem;font-weight:600;color:#64748b;">per ' + esc(p.unit || 'unit') + '</span></div>' +
      '<div style="margin-top:4px;font-size:0.84rem;color:#475569;">Pack / Available Quantity: <strong>' + esc(p.quantity || 1) + ' ' + esc(p.unit || 'pieces') + '</strong></div>' +
      '</div>' +
      '<p style="margin:0;color:#334155;font-size:0.92rem;line-height:1.6;">' + esc(p.description || 'Quality interior material listed by verified supplier.') + '</p>' +
      '<div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div><strong style="color:#0b1f3a;font-size:0.94rem;">' + esc(creator.business_name || 'Verified Supplier') + '</strong>' +
      '<div style="font-size:0.78rem;color:#64748b;">' + (creator.username ? '@' + esc(creator.username) + ' · ' : '') + esc(masked) + '</div></div>' +
      '<span style="color:#15803d;font-size:0.78rem;font-weight:800;">✓ Verified</span></div>' +
      '<button type="button" class="add-btn" id="mkt-prod-payu">Order Sample / Book via PayU</button>';
    modal.appendChild(body);

    var bar = el('div', 'mkt-bottom-bar');
    var callBtn = el('button', 'mkt-action-btn call', 'Call (' + masked + ')');
    callBtn.type = 'button';
    callBtn.addEventListener('click', function () { handleProfileContact(creator, 'call'); });
    var chatBtn = el('button', 'mkt-action-btn chat', 'Chat (' + masked + ')');
    chatBtn.type = 'button';
    chatBtn.addEventListener('click', function () { handleProfileContact(creator, 'chat'); });
    bar.appendChild(callBtn); bar.appendChild(chatBtn);
    modal.appendChild(bar);

    mktModalBackdrop.innerHTML = '';
    mktModalBackdrop.appendChild(modal);
    mktModalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    var payuBtn = modal.querySelector('#mkt-prod-payu');
    if (payuBtn) {
      payuBtn.addEventListener('click', function () {
        if (window.InteragoodPayU) {
          window.InteragoodPayU.initiatePayment({
            amount: Number(p.rate_per_unit || 500),
            productInfo: p.title,
            firstName: 'Client',
            email: 'client@interagood.in',
            phone: '9999999999',
            onSuccess: function () { closeMktModal(); }
          });
        }
      });
    }
  }

  supFilterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      supFilter = btn.getAttribute('data-sup-filter') || 'all';
      supFilterBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      renderSupplierShowcase();
    });
  });

  if (wsClearBtn) {
    wsClearBtn.addEventListener('click', function () {
      state.cat = '';
      renderWorkSamples();
      draw();
    });
  }

  function loadPartnerCategories() {
    if (!API) return;
    fetch(API + '/categories/partner')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var rows = Array.isArray(d && d.data) ? d.data : [];
        if (!rows.length) return;
        var existingById = {};
        var existingByName = {};
        (C.partner || []).forEach(function (c) {
          if (c.dbId) existingById[String(c.dbId)] = c;
          existingByName[String(c.name || '').toLowerCase()] = c;
        });
        partnerCats = rows.map(function (row) {
          var base = existingById[String(row.id)] || existingByName[String(row.name || '').toLowerCase()] || {};
          return {
            id: base.id || ('cat-' + row.id),
            dbId: row.id,
            name: row.name,
            hindi_name: row.hindi_name || base.hindi_name || '',
            icon_name: row.icon || row.icon_name || base.icon_name || '',
            icon: resolveCatIcon(row.icon || row.icon_name || base.icon_name, row.name) || base.icon || '🔧',
            keywords: base.keywords || [String(row.name || '').toLowerCase().split('(')[0].trim()],
            modules: base.modules || []
          };
        });
        renderServiceGrid();
      })
      .catch(function () {});
  }

  function loadMarketplace() {
    if (!workSamplesGrid && !archGrid && !supShowcaseGrid) return;
    fetch(API + '/public/marketplace')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        liveData.work_samples = Array.isArray(d && d.work_samples) ? d.work_samples : [];
        liveData.architect_posts = Array.isArray(d && d.architect_posts) ? d.architect_posts : [];
        liveData.supplier_products = Array.isArray(d && d.supplier_products) ? d.supplier_products : [];
        liveData.supplier_samples = Array.isArray(d && d.supplier_samples) ? d.supplier_samples : [];
        renderWorkSamples();
        renderArchitectProducts(liveData.architect_posts);
        renderSupplierShowcase();
      })
      .catch(function () {
        renderWorkSamples();
        renderArchitectProducts([]);
        renderSupplierShowcase();
      });
  }

  // ---------- partner module card (standard category work modules) ----------
  function moduleCard(c, m, withModes) {
    var card = el('article', 'mod-card');
    var pic = el('div', 'mod-img');
    pic.appendChild(img(partnerSrc(c, m), m[1]));
    pic.appendChild(el('span', 'mod-cat', c.name));
    var mode = 'new', btns = [];
    if (withModes) {
      var row = el('div', 'mode-row');
      var full = el('a', 'mode', 'Full interior');
      full.href = 'inspection.html?cat=' + encodeURIComponent(c.id);
      row.appendChild(full);
      [['repair', 'Repairing'], ['new', 'New']].forEach(function (x) {
        var b = el('button', 'mode' + (x[0] === mode ? ' on' : ''), x[1]);
        b.type = 'button'; b.setAttribute('data-mode', x[0]);
        b.addEventListener('click', function () {
          mode = x[0];
          btns.forEach(function (o) { o.classList.toggle('on', o === b); });
        });
        btns.push(b); row.appendChild(b);
      });
      pic.appendChild(row);
    }
    card.appendChild(pic);
    var body = el('div', 'mod-body');
    body.appendChild(el('h3', '', m[1]));
    var add = el('button', 'add-btn', 'Add'); add.type = 'button';
    add.addEventListener('click', function () {
      if (!window.IGCart) return;
      window.IGCart.add({ cat: c.id, catName: c.name, module: m[0], label: m[1], mode: withModes ? mode : 'full_interior', img: partnerSrc(c, m) });
      add.textContent = 'Added'; add.classList.add('added');
      setTimeout(function () { add.textContent = 'Add'; add.classList.remove('added'); }, 1200);
    });
    body.appendChild(add);
    card.appendChild(body);
    return card;
  }

  // ---------- inspection page ----------
  var root = document.getElementById('insp-root');
  if (root) {
    var only = new URLSearchParams(location.search).get('cat');
    var q = document.getElementById('insp-search');
    function drawInsp() {
      var text = q ? q.value.trim().toLowerCase() : '';
      root.textContent = '';
      var shown = 0;
      C.partner.forEach(function (c) {
        if (only && c.id !== only) return;
        var mods = c.modules.filter(function (m) { return !text || (m[1] + ' ' + c.name).toLowerCase().indexOf(text) !== -1; });
        if (!mods.length) return;
        var g = el('section', 'insp-group'); g.appendChild(el('h2', '', c.icon + ' ' + c.name));
        var grid = el('div', 'insp-grid');
        mods.forEach(function (m) { grid.appendChild(moduleCard(c, m, false)); shown++; });
        g.appendChild(grid); root.appendChild(g);
      });
      if (!shown) root.appendChild(el('p', 'browse-empty', 'No matching services. Try a different search.'));
      var all = document.getElementById('insp-all');
      if (all) all.hidden = !only;
    }
    if (q) q.addEventListener('input', drawInsp);
    drawInsp();
    return;
  }

  // ---------- home page strip ----------
  var strip = document.getElementById('browse-strip');
  if (!strip) { loadMarketplace(); return; }
  var title = document.getElementById('browse-title'), sub = document.getElementById('browse-sub'), empty = document.getElementById('browse-empty');

  function draw() {
    strip.textContent = '';
    var shown = 0;
    if (state.role === 'partner') {
      title.textContent = state.cat ? (catLabelForId(state.cat) || 'Interior') + ' Work Modules' : 'Book by Work Module';
      sub.textContent = 'Choose New or Repairing and add to your cart.';
      C.partner.forEach(function (c) {
        if (state.cat && c.id !== state.cat) return;
        c.modules.forEach(function (m) {
          if (state.q && (m[1] + ' ' + c.name).toLowerCase().indexOf(state.q) === -1) return;
          strip.appendChild(moduleCard(c, m, true)); shown++;
        });
      });
    } else {
      title.textContent = 'Material shops';
      sub.textContent = 'Tap a material to see shops in your zone.';
      C.supplier.forEach(function (c) {
        if (state.cat && c.id !== state.cat) return;
        c.items.forEach(function (m) {
          if (state.q && (m[1] + ' ' + c.name).toLowerCase().indexOf(state.q) === -1) return;
          var b = el('button', 'sup-card'); b.type = 'button';
          var pic = el('div', 'mod-img'); pic.appendChild(img(supplierSrc(c, m), m[1])); b.appendChild(pic);
          var lab = el('span', 'sup-label', m[1]); lab.appendChild(el('small', '', c.name)); b.appendChild(lab);
          b.addEventListener('click', function () { openSupplierSheet(c, m); });
          strip.appendChild(b); shown++;
        });
      });
    }
    empty.hidden = shown > 0;
    strip.scrollLeft = 0;
  }

  document.addEventListener('ig:filter', function (e) {
    state.role = e.detail.role; state.cat = e.detail.cat; state.q = e.detail.q;
    renderWorkSamples();
    draw();
  });

  document.addEventListener('ig:select-category', function (e) {
    var det = e.detail || {};
    var match = null;
    for (var i = 0; i < partnerCats.length; i++) {
      var pc = partnerCats[i];
      if ((det.dbId && String(pc.dbId) === String(det.dbId)) ||
          (det.name && String(pc.name || '').toLowerCase() === String(det.name).toLowerCase())) {
        match = pc;
        break;
      }
    }
    if (match) selectPartnerCategory(match);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-swipe]'), function (b) {
    b.addEventListener('click', function () { strip.scrollBy({ left: (b.getAttribute('data-swipe') === 'next' ? 1 : -1) * strip.clientWidth * 0.8, behavior: 'smooth' }); });
  });

  // ---------- supplier popup ----------
  var wrap = el('div', 'sheet-wrap'); wrap.hidden = true;
  var sheet = el('div', 'sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
  var closeBtn = el('button', 'sheet-close', '\u00d7'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close');
  var hero = el('div', 'sheet-hero'), heroTitle = el('h3'), sbody = el('div', 'sheet-body');
  sheet.appendChild(closeBtn); sheet.appendChild(hero); sheet.appendChild(sbody);
  wrap.appendChild(sheet); document.body.appendChild(wrap);
  function closeSheet() { wrap.hidden = true; document.body.style.overflow = ''; }
  closeBtn.addEventListener('click', closeSheet);
  wrap.addEventListener('click', function (e) { if (e.target === wrap) closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!wrap.hidden) closeSheet();
      if (!mktModalBackdrop.hidden) closeMktModal();
    }
  });

  var current = null;
  function openSupplierSheet(c, m) {
    current = { c: c, m: m };
    hero.textContent = ''; hero.appendChild(img(supplierSrc(c, m), m[1])); heroTitle.textContent = m[1]; hero.appendChild(heroTitle);
    wrap.hidden = false; document.body.style.overflow = 'hidden'; sheet.scrollTop = 0;
    loadShops();
  }

  function note(text, withBtn) {
    sbody.textContent = '';
    var n = el('p', 'sheet-note', text);
    if (withBtn) {
      var b = el('button', 'btn', 'Set my location'); b.type = 'button';
      b.addEventListener('click', function () { document.dispatchEvent(new CustomEvent('ig:location-request')); });
      n.appendChild(document.createElement('br')); n.appendChild(b);
    }
    sbody.appendChild(n);
  }

  function loadShops() {
    if (!current) return;
    var l = loc();
    if (!l || typeof l.lat !== 'number') { note('Please set your address for best results, and see material shops under our zone.', true); return; }
    note('Finding shops near you...', false);
    var ids = SUP_DB[current.c.id] || [];
    var url = API + '/public/suppliers?lat=' + l.lat + '&lng=' + l.lng + (ids.length ? '&category_ids=' + ids.join(',') : '');
    var token = current;
    fetch(url).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message || 'Could not load shops.'); return d.data || []; }); })
      .then(function (list) {
        if (token !== current) return;
        sbody.textContent = '';
        if (!list.length) { note('No registered shops in your zone yet. We are adding more every day.', false); return; }
        list.forEach(function (s) { sbody.appendChild(shopCard(s)); });
      })
      .catch(function (err) { if (token === current) note(err.message, false); });
  }
  document.addEventListener('ig:location', function () { if (!wrap.hidden) loadShops(); });

  function contact(id, action) {
    var w = action === 'call' ? null : window.open('', '_blank');
    if (w) w.opener = null;
    fetch(API + '/public/suppliers/' + id + '/contact?action=' + action)
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message || 'Not available'); return d.url; }); })
      .then(function (u) { if (w) w.location.href = u; else window.location.href = u; })
      .catch(function () { if (w) w.close(); });
  }

  function shopCard(s) {
    var card = el('article', 'shop-card');
    var ban = el('div', 'shop-banner'); if (s.banner_url) ban.appendChild(img(s.banner_url, '')); card.appendChild(ban);
    var idr = el('div', 'shop-id');
    var av = el('div', 'shop-avatar'); if (s.profile_photo_url) av.appendChild(img(s.profile_photo_url, '')); else av.textContent = (s.business_name || '?').charAt(0).toUpperCase();
    idr.appendChild(av);
    var who = el('div', 'shop-who'); who.appendChild(el('strong', '', s.business_name || '')); who.appendChild(el('span', '', s.username ? '@' + s.username : ''));
    idr.appendChild(who);
    if (s.distance_km != null) idr.appendChild(el('span', 'shop-dist', s.distance_km + ' km'));
    card.appendChild(idr);
    var acts = el('div', 'shop-actions');
    var samples = el('div', 'shop-samples'); samples.hidden = true;
    [['call', 'Call'], ['chat', 'Chat'], ['navigate', 'Navigate'], ['samples', 'Samples']].forEach(function (a) {
      var b = el('button', a[0] === 'call' ? 'call' : '', a[1]); b.type = 'button';
      b.addEventListener('click', function () {
        if (a[0] === 'samples') return toggleSamples(s.id, samples);
        contact(s.id, a[0]);
      });
      acts.appendChild(b);
    });
    card.appendChild(acts); card.appendChild(samples);
    return card;
  }

  function toggleSamples(id, box) {
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.textContent = ''; box.appendChild(el('p', '', 'Loading...'));
    fetch(API + '/public/suppliers/' + id + '/samples').then(function (r) { return r.json(); }).then(function (d) {
      box.textContent = '';
      var list = (d.data || []).filter(function (x) { return x.media_type === 'image' || x.thumbnail_url; });
      if (!list.length) { box.appendChild(el('p', '', 'No samples added yet.')); return; }
      list.forEach(function (x) { box.appendChild(img(x.thumbnail_url || x.media_url, x.title || 'Sample')); });
    }).catch(function () { box.textContent = ''; box.appendChild(el('p', '', 'Could not load samples.')); });
  }

  function selectPartnerCategory(c) {
    var modTab = document.querySelector('[data-mkt-tab="catalog"]');
    if (modTab) modTab.click();
    state.role = 'partner';
    state.cat = c.id;
    renderWorkSamples();
    draw();
    var mkt = document.getElementById('marketplace');
    if (mkt) mkt.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderServiceGrid() {
    var sg = document.getElementById('service-grid');
    if (!sg || !partnerCats.length) return;
    sg.innerHTML = '';
    partnerCats.forEach(function (c) {
      var card = el('div', 'service-card');
      card.style.cursor = 'pointer';
      card.appendChild(el('div', 'svc-icon', c.icon || '🏠'));
      card.appendChild(el('h3', '', c.name));
      card.appendChild(el('p', '', (c.modules || []).slice(0, 3).map(function (m) { return m[1]; }).join(', ')));
      card.addEventListener('click', function () {
        selectPartnerCategory(c);
      });
      sg.appendChild(card);
    });
  }

  renderServiceGrid();
  draw();
  loadPartnerCategories();
  loadMarketplace();
})();
