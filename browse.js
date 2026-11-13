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
    if (d.length < 10) return '+91 98XXX-XX210';
    var l = d.slice(-10);
    return '+91 ' + l.slice(0, 2) + 'XXX-XX' + l.slice(-3);
  }
  var partnerSrc = function (c, m) { return C.base + 'partner/' + c.id + '/' + m[0] + '.jpg'; };
  var supplierSrc = function (c, m) { return C.base + 'supplier/' + c.id + '/' + m[0] + '.jpg'; };

  // Starter showcase items merged with live DB listings so marketplace is immediately verifiable & interactive
  var STARTER_PRODUCTS = [
    {
      id: 'sample-prod-1',
      title: 'Heavy Brass Mortise Door Lock Set',
      category: 'Hardware (Locks, Hinges)',
      rate_per_unit: 1450,
      unit: 'pieces',
      quantity: 10,
      description: 'Solid satin-brass mortise handle lock set with 3 computerized keys, heavy deadbolt, and corrosion-resistant internal spring. Pack of 10 sets available.',
      image_url: C.base + 'supplier/hardware/door-handles.jpg',
      creator: { business_name: 'Awadh Hardware Depot', username: 'awadhhardware', masked_phone: '+91 98XXX-XX412', verified: true }
    },
    {
      id: 'sample-prod-2',
      title: 'Soft-Close Hydraulic Auto Hinges (Pair)',
      category: 'Hardware (Locks, Hinges)',
      rate_per_unit: 280,
      unit: 'pieces',
      quantity: 20,
      description: 'SS-304 stainless steel 110-degree hydraulic soft-close hinges suitable for modular kitchen cabinets and wardrobe shutters.',
      image_url: C.base + 'supplier/hardware/hinges.jpg',
      creator: { business_name: 'Lucknow Fittings Co.', username: 'lucknowfittings', masked_phone: '+91 97XXX-XX309', verified: true }
    },
    {
      id: 'sample-prod-3',
      title: 'Royal Washable Interior Emulsion (20L)',
      category: 'Paint & Chemicals',
      rate_per_unit: 4850,
      unit: 'liters',
      quantity: 20,
      description: 'Low-VOC luxury matte emulsion with anti-fungal shield and rich smooth finish. Ideal for living rooms and bedrooms.',
      image_url: C.base + 'supplier/paint-supply/paint-buckets.jpg',
      creator: { business_name: 'Spectrum Paints & Coatings', username: 'spectrumpaint', masked_phone: '+91 94XXX-XX881', verified: true }
    },
    {
      id: 'sample-prod-4',
      title: 'BWP Marine Plywood 18mm IS:710',
      category: 'Plywood & Timber',
      rate_per_unit: 112,
      unit: 'sqft',
      quantity: 32,
      description: 'Calibrated boiling-water-proof 18mm marine plywood bonded with phenol formaldehyde resin for modular kitchens.',
      image_url: C.base + 'supplier/plywood/plywood-sheets.jpg',
      creator: { business_name: 'Gomti Timber & Ply', username: 'gomtitimber', masked_phone: '+91 99XXX-XX105', verified: true }
    }
  ];

  var STARTER_ARCHITECTS = [
    {
      id: 'sample-arch-1',
      title: 'Modular L-Shape Acrylic Kitchen Design',
      category: 'Carpentry',
      sub_category: 'Kitchen',
      rate_per_unit: 1450,
      unit: 'sqft',
      quantity: 120,
      with_material: true,
      description: 'Complete L-shape kitchen woodwork with 18mm BWP marine ply, glossy acrylic shutters, soft-close channels, and granite countertop installation.',
      image_url: C.base + 'partner/carpentry/modular-kitchen.jpg',
      creator: {
        business_name: 'KalaKriti Design Studio',
        username: 'kalakriti_arch',
        profile_photo_url: '',
        banner_url: 'assets/interior-hero.webp',
        masked_phone: '+91 96XXX-XX718',
        verified: true
      }
    },
    {
      id: 'sample-arch-2',
      title: 'Floor-to-Ceiling Sliding Wardrobe with Mirror',
      category: 'Carpentry',
      sub_category: 'Wardrobe',
      rate_per_unit: 1320,
      unit: 'sqft',
      quantity: 85,
      with_material: true,
      description: 'Full-height sliding wardrobe built with HDHMR board, matte suede laminate, profile handles, and integrated internal dresser unit.',
      image_url: C.base + 'partner/carpentry/wardrobe.jpg',
      creator: {
        business_name: 'Akaar Spatial Architects',
        username: 'akaar_spatial',
        profile_photo_url: '',
        banner_url: 'assets/interior-hero.webp',
        masked_phone: '+91 91XXX-XX540',
        verified: true
      }
    },
    {
      id: 'sample-arch-3',
      title: 'Minimal Gypsum False Ceiling & Cove LED',
      category: 'Ceiling & POP',
      sub_category: 'False Ceiling',
      rate_per_unit: 115,
      unit: 'sqft',
      quantity: 260,
      with_material: true,
      description: 'Moisture-resistant gypsum board false ceiling with GI perimeter channels, recessed spotlight cutouts, and warm 3000K LED strip profile.',
      image_url: C.base + 'partner/ceiling/false-ceiling.jpg',
      creator: {
        business_name: 'VastuForm Interiors',
        username: 'vastuform',
        profile_photo_url: '',
        banner_url: 'assets/interior-hero.webp',
        masked_phone: '+91 98XXX-XX229',
        verified: true
      }
    }
  ];

  // ---------- Marketplace Tabs (Supplier Products, Architect Designs, Work Modules) ----------
  var prodGrid = document.getElementById('amz-products-grid');
  var archGrid = document.getElementById('arch-posts-grid');
  var mktTabs = Array.prototype.slice.call(document.querySelectorAll('[data-mkt-tab]'));
  var mktPanels = {
    products: document.getElementById('mkt-panel-products'),
    architects: document.getElementById('mkt-panel-architects'),
    catalog: document.getElementById('mkt-panel-catalog')
  };

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
      var u = action === 'call' ? 'tel:+' + digits : 'https://wa.me/' + digits + '?text=' + encodeURIComponent('Hello ' + ((creator && creator.business_name) || 'Interagood') + ', I saw your listing on Interagood.');
      if (w) w.location.href = u; else window.location.href = u;
    }
  }

  // Entire Amazon-style Supplier Product Card is clickable (zero buttons inside the card)
  function renderSupplierProducts(list) {
    if (!prodGrid) return;
    prodGrid.innerHTML = '';
    list.forEach(function (p) {
      var creator = p.creator || {};
      var card = el('button', 'amz-card');
      card.type = 'button';
      var photo = el('div', 'amz-photo');
      photo.appendChild(img(p.image_url, p.title));
      card.appendChild(photo);

      var info = el('div', 'amz-info');
      info.appendChild(el('span', 'amz-cat', p.category || 'Material'));
      info.appendChild(el('h3', 'amz-title', p.title));
      var price = el('div', 'amz-price');
      price.innerHTML = '₹' + Number(p.rate_per_unit || 0).toLocaleString('en-IN') + ' <small>/ ' + esc(p.unit || 'unit') + (p.quantity ? ' · ' + esc(p.quantity) + ' qty' : '') + '</small>';
      info.appendChild(price);
      info.appendChild(el('div', 'amz-seller', (creator.business_name || 'Verified Supplier') + (creator.username ? ' (@' + creator.username + ')' : '')));
      card.appendChild(info);

      card.addEventListener('click', function () { openProductDetailModal(p); });
      prodGrid.appendChild(card);
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
      '<div style="font-size:0.78rem;color:#64748b;">@' + esc(creator.username || 'supplier') + ' · Contact: ' + esc(masked) + '</div></div>' +
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

  // Architect Designs Grid with mandatory green "with material" label and "Get Calculate" button
  function renderArchitectPosts(list) {
    if (!archGrid) return;
    archGrid.innerHTML = '';
    list.forEach(function (post) {
      var card = el('article', 'arch-card');
      var im = el('div', 'arch-img');
      im.appendChild(img(post.image_url, post.title));
      card.appendChild(im);

      var body = el('div', 'arch-body');
      var top = el('div', 'arch-top-meta');
      top.appendChild(el('span', 'arch-cat-label', (post.category || 'Interior') + (post.sub_category ? ' → ' + post.sub_category : '')));
      top.appendChild(el('span', 'with-material-tag', 'with material'));
      body.appendChild(top);
      body.appendChild(el('h3', 'arch-title', post.title));
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
      '<span class="with-material-tag">with material</span>' +
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
      '<option value="rft">Running Feet (Rft)</option>' +
      '<option value="feet">Feet</option>' +
      '<option value="inches">Inches</option>' +
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

  function loadMarketplace() {
    if (!prodGrid && !archGrid) return;
    fetch(API + '/public/marketplace').then(function (r) { return r.json(); }).then(function (d) {
      var prods = (d && d.supplier_products && d.supplier_products.length) ? d.supplier_products.concat(STARTER_PRODUCTS) : STARTER_PRODUCTS;
      var archs = (d && d.architect_posts && d.architect_posts.length) ? d.architect_posts.concat(STARTER_ARCHITECTS) : STARTER_ARCHITECTS;
      renderSupplierProducts(prods);
      renderArchitectPosts(archs);
    }).catch(function () {
      renderSupplierProducts(STARTER_PRODUCTS);
      renderArchitectPosts(STARTER_ARCHITECTS);
    });
  }

  // ---------- partner module card ----------
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
  var state = { role: 'partner', cat: '', q: '' };

  function draw() {
    strip.textContent = '';
    var shown = 0;
    if (state.role === 'partner') {
      title.textContent = 'Popular interior work';
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
    draw();
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

  function renderServiceGrid() {
    var sg = document.getElementById('service-grid');
    if (!sg || !C.partner) return;
    sg.innerHTML = '';
    C.partner.slice(0, 6).forEach(function (c) {
      var card = el('div', 'service-card');
      card.style.cursor = 'pointer';
      card.appendChild(el('div', 'svc-icon', c.icon || '🏠'));
      card.appendChild(el('h3', '', c.name));
      card.appendChild(el('p', '', c.modules.slice(0, 3).map(function (m) { return m[1]; }).join(', ')));
      card.addEventListener('click', function () {
        var modTab = document.querySelector('[data-mkt-tab="catalog"]');
        if (modTab) modTab.click();
        state.role = 'partner'; state.cat = c.id;
        draw();
        var mkt = document.getElementById('marketplace');
        if (mkt) mkt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      sg.appendChild(card);
    });
  }

  renderServiceGrid();
  draw();
  loadMarketplace();
})();
