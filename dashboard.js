(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var $ = function (id) { return document.getElementById(id); };
  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20"/>',
    orders: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
    products: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
    upload: '<path d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>',
    earnings: '<path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5"/>'
  };

  var SUB_CATEGORIES = {
    Carpentry: ['Modular Kitchen', 'Wardrobe', 'TV Unit', 'Pooja Unit', 'Study Table', 'Door & Frames'],
    'Modular Kitchen': ['L-Shape Kitchen', 'U-Shape Kitchen', 'Parallel Kitchen', 'Island Kitchen'],
    'Ceiling & POP': ['Gypsum False Ceiling', 'POP Design', 'Cove Lighting', 'Wooden Ceiling'],
    'Paint & Polish': ['Interior Emulsion', 'Texture Paint', 'PU Wood Polish', 'Waterproofing'],
    'Tiles & Stone': ['Living Room Flooring', 'Kitchen Countertop', 'Bathroom Wall Tiles', 'Italian Marble'],
    'Full Interior': ['1 BHK Turnkey', '2 BHK Turnkey', '3 BHK Turnkey', 'Office Renovation']
  };

  var SUPPLIER_UNITS = [
    ['sqft', 'Square Feet (Sq.ft)'],
    ['pieces', 'Pieces / Pcs'],
    ['rft', 'Running Feet (Rft)'],
    ['feet', 'Feet'],
    ['inches', 'Inches'],
    ['liters', 'Liters'],
    ['bundles', 'Bundles']
  ];

  var ARCHITECT_UNITS = [
    ['sqft', 'Square Feet (Sq.ft)'],
    ['rft', 'Running Feet (Rft)'],
    ['feet', 'Feet'],
    ['inches', 'Inches'],
    ['pieces', 'Per Unit / Piece']
  ];

  var PLAN_AMOUNTS = { partner: 109, supplier: 219, architect: 310 };

  // ---- session ----
  var session = null;
  try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (e) { session = null; }
  if (!session || !session.accessToken || !session.uuid) {
    location.replace('partner-program.html#login');
    return;
  }

  var role = session.role || 'partner';
  var isLocalTest = String(session.uuid).indexOf('test_') === 0;
  var state = {
    user: null,
    listings: [],
    quota: { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: 4, maxImages: 2, maxVideos: 2 },
    isOnline: true,
    activePage: 'overview'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function showToast(msg, isError) {
    var existing = $('ig-dash-toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'ig-dash-toast';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 18px;border-radius:10px;font-size:0.88rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-width:340px;color:#fff;background:' + (isError ? '#dc2626' : '#0b1f3a') + ';';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 3800);
  }
  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.home) + '</svg>'; }

  function api(path, options) {
    if (isLocalTest) return Promise.resolve({ success: true, data: session.profile || null });
    options = options || {};
    options.headers = Object.assign({ Authorization: 'Bearer ' + session.accessToken }, options.headers || {});
    return fetch(API + path, options).then(function (r) {
      if (r.status === 401) {
        sessionStorage.removeItem('ig_session');
        location.replace('partner-program.html#login');
        throw new Error('Session expired');
      }
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
        return d;
      });
    });
  }

  // ---- Navigation ----
  var NAV = {
    partner: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'upload', label: 'Private Sample Upload', icon: 'upload' },
      { id: 'orders', label: 'Completed & Assigned Orders', icon: 'orders' },
      { id: 'earnings', label: 'Billing & Plan', icon: 'earnings' },
      { id: 'profile', label: 'Profile', icon: 'profile' }
    ],
    supplier: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'upload', label: 'Product & Sample Engine', icon: 'products' },
      { id: 'orders', label: 'Completed Orders', icon: 'orders' },
      { id: 'earnings', label: 'Billing & PayU', icon: 'earnings' },
      { id: 'profile', label: 'Profile', icon: 'profile' }
    ],
    architect: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'upload', label: 'Create Design Post', icon: 'products' },
      { id: 'orders', label: 'Completed Projects', icon: 'orders' },
      { id: 'earnings', label: 'Billing & PayU', icon: 'earnings' },
      { id: 'profile', label: 'Profile', icon: 'profile' }
    ]
  };

  function setActiveNav(id) {
    Array.prototype.forEach.call($('db-nav').querySelectorAll('a'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-page') === id);
    });
  }

  function renderNav() {
    var items = NAV[role] || NAV.partner;
    var nav = $('db-nav');
    nav.innerHTML = items.map(function (it) {
      return '<a data-page="' + it.id + '">' + svg(it.icon) + '<span>' + it.label + '</span></a>';
    }).join('');
    nav.addEventListener('click', function (e) {
      var link = e.target.closest('[data-page]');
      if (!link) return;
      var pageId = link.getAttribute('data-page');
      $('db-side').classList.remove('open');
      showPage(pageId);
    });
  }

  // ---- Top Control Bar Updates ----
  function updateTopBar() {
    var u = state.user || session.profile || {};
    var addrParts = [u.address, u.city, u.state, u.pincode].filter(Boolean);
    $('tcb-address').textContent = addrParts.length ? addrParts.join(', ') : 'Address pending — complete profile';
    $('tcb-igid').textContent = u.ig_id ? 'IG ID: ' + u.ig_id + (u.category_name ? ' · ' + u.category_name : '') : (u.category_name || (role.toUpperCase() + ' Account'));

    var isPaid = u.payment_status === 'paid';
    $('tcb-billing').textContent = isPaid ? 'Active · Monthly Cycle' : 'Trial / PayU Ready';
    var nextDue = u.next_due_at || u.payment_due_date;
    if (nextDue) {
      var dt = new Date(nextDue);
      $('tcb-next-bill').textContent = 'Next billing: ' + (!isNaN(dt) ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : nextDue);
    } else {
      var est = new Date(Date.now() + 30 * 86400000);
      $('tcb-next-bill').textContent = 'Next billing: ' + est.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (30-day cycle)';
    }

    var q = state.quota;
    if (role === 'supplier') {
      $('tcb-quota-label').textContent = 'Daily Quota (2 Img + 2 Vid)';
      $('tcb-quota-val').textContent = q.totalUsed + ' / ' + q.maxTotal + ' today (' + q.imagesUsed + '/2 Img · ' + q.videosUsed + '/2 Vid)';
      var pct = Math.min(100, Math.round((q.totalUsed / q.maxTotal) * 100));
      var fill = $('tcb-quota-fill');
      fill.style.width = pct + '%';
      fill.classList.toggle('full', q.totalUsed >= q.maxTotal);
    } else if (role === 'architect') {
      $('tcb-quota-label').textContent = 'Published Design Posts';
      $('tcb-quota-val').textContent = state.listings.length + ' active posts (with material)';
      $('tcb-quota-fill').style.width = Math.min(100, state.listings.length * 10) + '%';
    } else {
      $('tcb-quota-label').textContent = 'Private Skill Samples';
      $('tcb-quota-val').textContent = state.listings.length + ' admin evaluation sample(s)';
      $('tcb-quota-fill').style.width = Math.min(100, state.listings.length * 20) + '%';
    }

    var sw = $('tcb-online-switch');
    sw.setAttribute('aria-checked', state.isOnline ? 'true' : 'false');
    sw.classList.toggle('on', state.isOnline);
    var lbl = $('tcb-online-label');
    lbl.textContent = state.isOnline ? 'Online' : 'Offline';
    lbl.className = 'tcb-status-txt ' + (state.isOnline ? 'on' : 'off');
    $('tcb-online-hint').textContent = state.isOnline ? 'Visible in admin assignment filters' : 'Hidden from admin assignment filters';
  }

  $('tcb-online-switch').addEventListener('click', function () {
    var next = !state.isOnline;
    state.isOnline = next;
    updateTopBar();
    api('/users/' + session.uuid + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: next })
    }).catch(function (err) {
      state.isOnline = !next;
      updateTopBar();
      showToast(err.message || 'Status update failed', true);
    });
  });

  $('tcb-upload-btn').addEventListener('click', function () { showPage('upload'); });
  $('tcb-completed-btn').addEventListener('click', function () { showPage('orders'); });
  $('tcb-payu-btn').addEventListener('click', triggerPayU);

  function triggerPayU() {
    if (!window.InteragoodPayU) return;
    var u = state.user || session.profile || {};
    var amt = PLAN_AMOUNTS[role] || 199;
    window.InteragoodPayU.initiatePayment({
      amount: amt,
      productInfo: 'Interagood ' + role.charAt(0).toUpperCase() + role.slice(1) + ' Monthly Plan',
      firstName: u.full_name || session.username || 'Member',
      email: u.email || 'billing@interagood.in',
      phone: u.phone || '9999999999',
      onSuccess: function (res) {
        api('/payments/payu/sandbox-activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txnid: res.txnid })
        }).then(function (d) {
          if (state.user) {
            state.user.payment_status = d.payment_status || 'paid';
            state.user.next_due_at = d.next_due_at;
          }
          state.isOnline = true;
          updateTopBar();
          if (state.activePage === 'earnings' || state.activePage === 'overview') showPage(state.activePage);
        }).catch(function () {
          state.isOnline = true;
          updateTopBar();
        });
      }
    });
  }

  // ---- Calculator & Media Upload Helper ----
  function calcTotals(rate, qty) {
    var r = Math.max(0, Number(rate) || 0);
    var q = Math.max(0, Number(qty) || 0);
    var subtotal = Math.round(r * q * 100) / 100;
    var gst = Math.round(subtotal * 0.18 * 100) / 100;
    return { subtotal: subtotal, gst: gst, total: Math.round((subtotal + gst) * 100) / 100 };
  }

  function uploadFile(kind, file) {
    if (isLocalTest) return Promise.resolve(URL.createObjectURL(file));
    return fetch(API + '/users/' + session.uuid + '/upload?kind=' + encodeURIComponent(kind), {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
        Authorization: 'Bearer ' + session.accessToken
      },
      body: file
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || 'Upload failed');
        return d.url;
      });
    });
  }

  function loadLocalFallback() {
    try { return JSON.parse(localStorage.getItem('ig_local_listings_' + session.uuid)) || []; } catch (e) { return []; }
  }
  function saveLocalFallback(list) {
    try { localStorage.setItem('ig_local_listings_' + session.uuid, JSON.stringify(list)); } catch (e) {}
  }

  function fetchListings() {
    if (isLocalTest) {
      state.listings = loadLocalFallback();
      updateTopBar();
      return Promise.resolve();
    }
    return api('/users/' + session.uuid + '/listings').then(function (d) {
      state.listings = d.data || [];
      if (d.quota) state.quota = d.quota;
      updateTopBar();
    }).catch(function () {
      state.listings = loadLocalFallback();
      updateTopBar();
    });
  }

  // ---- Pages ----
  var pages = {};

  pages.overview = function () {
    $('db-page-title').textContent = (role.charAt(0).toUpperCase() + role.slice(1)) + ' Overview';
    $('db-page-sub').textContent = 'Manage your daily uploads, availability status, and client engagements.';

    var html = '<div class="db-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:22px;">';
    if (role === 'supplier') {
      html += statCard('#fff3e0', '#e65100', 'products', String(state.listings.length), 'Listed Products & Samples');
      html += statCard('#e8f5e9', '#1f9d55', 'upload', state.quota.totalUsed + ' / 4', 'Daily Quota Used (2 Img · 2 Vid)');
      html += statCard('#e3f2fd', '#1565c0', 'orders', state.isOnline ? 'ONLINE' : 'OFFLINE', 'Shop Availability');
    } else if (role === 'architect') {
      html += statCard('#fff3e0', '#e65100', 'products', String(state.listings.length), 'Design Posts (with material)');
      html += statCard('#e8f5e9', '#1f9d55', 'profile', 'Verified', 'Architect Business Card');
      html += statCard('#e3f2fd', '#1565c0', 'orders', state.isOnline ? 'ONLINE' : 'OFFLINE', 'Client Consultation Status');
    } else {
      html += statCard('#fff3e0', '#e65100', 'upload', String(state.listings.length), 'Private Samples for Admin Review');
      html += statCard('#e8f5e9', '#1f9d55', 'orders', state.isOnline ? 'ONLINE' : 'OFFLINE', 'Admin Assignment Pool');
      html += statCard('#e3f2fd', '#1565c0', 'earnings', '₹' + PLAN_AMOUNTS.partner + '/mo', 'Partner Cycle Plan');
    }
    html += '</div>';

    if (role === 'partner') {
      html += '<div class="private-notice"><strong>Private Sample Evaluation Mode:</strong> Partner sample uploads are strictly private and visible ONLY to Interagood Admins for skill verification &amp; project assignment.</div>';
    }

    html += '<div class="db-card" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;">' +
      '<div><h3 style="margin:0 0 4px;color:#0b1f3a;">' +
      (role === 'supplier' ? 'Add Products or Daily Work Samples' : role === 'architect' ? 'Publish New Architecture Post & Rate Calculator' : 'Upload Private Work Sample for Admin Skill Review') +
      '</h3><p style="margin:0;color:#64748b;font-size:0.88rem;">' +
      (role === 'supplier' ? 'Supports independent hardware/material products (Locks, Hinges, Paint) and daily rate calculations.' : role === 'architect' ? 'Includes category, sub-category, measurement calculator, and mandatory green "with material" tag.' : 'Showcase past interior work securely to receive matching site assignments.') +
      '</p></div>' +
      '<button type="button" class="tcb-btn primary" id="ov-go-upload">' +
      (role === 'supplier' ? '+ Post Product / Sample' : role === 'architect' ? '+ Create Architect Post' : '+ Upload Private Sample') +
      '</button></div>';

    html += renderListingsSection();
    $('db-content').innerHTML = html;
    $('ov-go-upload').addEventListener('click', function () { showPage('upload'); });
    wireListingDeletes();
  };

  function statCard(bg, color, icon, value, label) {
    return '<div class="db-card db-stat"><div class="db-stat-ic" style="background:' + bg + ';color:' + color + '">' + svg(icon) + '</div><div><h3>' + esc(value) + '</h3><span>' + esc(label) + '</span></div></div>';
  }

  pages.upload = function () {
    if (role === 'supplier') renderSupplierEngine();
    else if (role === 'architect') renderArchitectEngine();
    else renderPartnerPrivateUploader();
  };

  function renderSupplierEngine() {
    $('db-page-title').textContent = 'Supplier Product & Sample Listing Engine';
    $('db-page-sub').textContent = 'Daily cap: strictly max 4 samples per day (2 Images + 2 Videos). Independent items appear as clickable product cards.';

    var q = state.quota;
    var capReached = q.totalUsed >= 4;
    var catOpts = ['Hardware (Locks, Hinges)', 'Paint & Chemicals', 'Plywood & Timber', 'Laminates & Panels', 'Tiles & Stone', 'Electrical & Lighting', 'Plumbing & Bath', 'Glass & Mirrors']
      .map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    var unitOpts = SUPPLIER_UNITS.map(function (u) { return '<option value="' + u[0] + '">' + u[1] + '</option>'; }).join('');

    var html = '<div class="calc-panel">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">' +
      '<strong style="color:#0b1f3a;font-size:1.05rem;">Post Product or Sample</strong>' +
      '<span style="font-size:0.84rem;font-weight:700;color:' + (capReached ? '#dc2626' : '#1f9d55') + ';font-variant-numeric:tabular-nums;">' +
      'Today: ' + q.totalUsed + '/4 total · ' + q.imagesUsed + '/2 images · ' + q.videosUsed + '/2 videos</span></div>' +
      '<form id="sup-post-form">' +
      '<div class="calc-grid">' +
      '<div class="calc-field"><label for="sp-title">Sample / Product Name</label><input id="sp-title" type="text" required placeholder="e.g., Brass Door Lock Set, Marine Ply 18mm"></div>' +
      '<div class="calc-field"><label for="sp-cat">Product Category</label><select id="sp-cat">' + catOpts + '</select></div>' +
      '<div class="calc-field"><label for="sp-unit">Measurement Type</label><select id="sp-unit">' + unitOpts + '</select></div>' +
      '<div class="calc-field"><label for="sp-rate">Rate per Unit (₹ / sq.ft or piece)</label><input id="sp-rate" type="number" min="1" step="0.01" value="150" required></div>' +
      '<div class="calc-field"><label for="sp-qty">Default Quantity / Pieces</label><input id="sp-qty" type="number" min="1" step="0.5" value="1" required></div>' +
      '<div class="calc-field"><label for="sp-media">Upload Image or Video (Max 2 Img / 2 Vid daily)</label><input id="sp-media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"></div>' +
      '</div>' +
      '<div class="calc-field" style="margin-top:12px;"><label for="sp-desc">Product Description &amp; Specs</label><textarea id="sp-desc" placeholder="Brand, finish, thickness, pieces per box, delivery details..."></textarea></div>' +
      '<div class="calc-preview">' +
      '<div><div class="tcb-label">Auto-Calculated Total (incl. 18% GST)</div><div class="calc-total" id="sp-calc-total">₹177</div><div class="tcb-sub" id="sp-calc-sub">Base: ₹150 + GST (18%): ₹27</div></div>' +
      '<button type="submit" class="tcb-btn primary" id="sp-submit" ' + (capReached ? 'disabled' : '') + '>' + (capReached ? 'Daily Limit (4/4) Reached' : 'Post Listing') + '</button>' +
      '</div>' +
      '<p class="hint" id="sp-msg" style="margin-top:10px;"></p>' +
      '</form></div>' + renderListingsSection();

    $('db-content').innerHTML = html;

    function recalc() {
      var res = calcTotals($('sp-rate').value, $('sp-qty').value);
      $('sp-calc-total').textContent = '₹' + res.total.toLocaleString('en-IN');
      $('sp-calc-sub').textContent = 'Base: ₹' + res.subtotal.toLocaleString('en-IN') + ' + GST (18%): ₹' + res.gst.toLocaleString('en-IN');
    }
    $('sp-rate').addEventListener('input', recalc);
    $('sp-qty').addEventListener('input', recalc);
    recalc();

    $('sup-post-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var file = $('sp-media').files[0];
      var isVid = file && /^video\//.test(file.type);
      var mediaType = isVid ? 'video' : 'image';
      var msg = $('sp-msg'), btn = $('sp-submit');

      if (q.totalUsed >= 4) { msg.textContent = 'Daily limit of 4 uploads reached.'; msg.style.color = '#dc2626'; return; }
      if (!isVid && q.imagesUsed >= 2) { msg.textContent = 'Max 2 images per day reached. Try uploading a video (max 2) tomorrow or use video slot.'; msg.style.color = '#dc2626'; return; }
      if (isVid && q.videosUsed >= 2) { msg.textContent = 'Max 2 videos per day reached.'; msg.style.color = '#dc2626'; return; }

      btn.disabled = true; btn.textContent = 'Posting...'; msg.textContent = '';
      var upPromise = file ? uploadFile('supplier_product', file) : Promise.resolve('https://interagood.in/assets/logo-square.png');

      upPromise.then(function (imgUrl) {
        var payload = {
          title: $('sp-title').value.trim(),
          category: $('sp-cat').value,
          description: $('sp-desc').value.trim(),
          unit: $('sp-unit').value,
          rate_per_unit: Number($('sp-rate').value) || 0,
          quantity: Number($('sp-qty').value) || 1,
          image_url: imgUrl,
          media_type: mediaType,
          with_material: true,
          is_private: false
        };
        if (isLocalTest) {
          var item = Object.assign({ id: 'loc_' + Date.now(), created_at: new Date().toISOString(), total_amount: calcTotals(payload.rate_per_unit, payload.quantity).subtotal }, payload);
          var list = loadLocalFallback(); list.unshift(item); saveLocalFallback(list);
          state.listings = list;
          state.quota.totalUsed += 1;
          if (mediaType === 'video') state.quota.videosUsed += 1; else state.quota.imagesUsed += 1;
          return { success: true };
        }
        return api('/users/' + session.uuid + '/listings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        }).then(function (d) {
          if (d.quota) state.quota = d.quota;
          return fetchListings();
        });
      }).then(function () {
        updateTopBar();
        renderSupplierEngine();
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Post Listing';
        msg.textContent = err.message; msg.style.color = '#dc2626';
      });
    });
    wireListingDeletes();
  }

  function renderArchitectEngine() {
    $('db-page-title').textContent = 'Architect Design Post & Calculation Engine';
    $('db-page-sub').textContent = 'Create client-facing interior posts with dynamic measurements, verified business card popup, and mandatory "with material" label.';

    var catOpts = Object.keys(SUB_CATEGORIES).map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    var unitOpts = ARCHITECT_UNITS.map(function (u) {
      return '<option value="' + u[0] + '">' + u[1] + '</option>';
    }).join('');

    var html = '<div class="calc-panel">' +
      '<form id="arch-post-form">' +
      '<div class="calc-grid">' +
      '<div class="calc-field"><label for="ar-title">Design / Work Title</label><input id="ar-title" type="text" required placeholder="e.g., Modern Veneer TV Unit & Cove Wall"></div>' +
      '<div class="calc-field"><label for="ar-cat">Category</label><select id="ar-cat">' + catOpts + '</select></div>' +
      '<div class="calc-field"><label for="ar-sub">Optional Sub-category</label><select id="ar-sub"></select></div>' +
      '<div class="calc-field"><label for="ar-unit">Measurement Type</label><select id="ar-unit">' + unitOpts + '</select></div>' +
      '<div class="calc-field"><label for="ar-rate">Rate per Unit (₹)</label><input id="ar-rate" type="number" min="1" step="0.01" value="1250" required></div>' +
      '<div class="calc-field"><label for="ar-qty">Sample Estimate Dimension / Qty</label><input id="ar-qty" type="number" min="1" step="0.5" value="100" required></div>' +
      '</div>' +
      '<div class="calc-grid" style="margin-top:12px;">' +
      '<div class="calc-field"><label for="ar-img">Design Image Upload</label><input id="ar-img" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
      '<div class="calc-field"><label for="ar-desc">Work Scope &amp; Description</label><textarea id="ar-desc" placeholder="Describe laminate finish, plywood grade, hardware fittings, execution timeline..."></textarea></div>' +
      '</div>' +
      '<div class="calc-preview">' +
      '<div><div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;"><span class="with-mat-label">with material</span><span class="tcb-label" style="margin:0;">Mandatory Tag Active</span></div>' +
      '<div class="calc-total" id="ar-calc-total">₹1,47,500</div><div class="tcb-sub" id="ar-calc-sub">Base: ₹1,25,000 + GST (18%): ₹22,500</div></div>' +
      '<button type="submit" class="tcb-btn primary" id="ar-submit">Publish Architect Post</button>' +
      '</div>' +
      '<p class="hint" id="ar-msg" style="margin-top:10px;"></p>' +
      '</form></div>' + renderListingsSection();

    $('db-content').innerHTML = html;

    function syncSubs() {
      var list = SUB_CATEGORIES[$('ar-cat').value] || [];
      $('ar-sub').innerHTML = '<option value="">None (General)</option>' + list.map(function (s) {
        return '<option value="' + esc(s) + '">' + esc(s) + '</option>';
      }).join('');
    }
    $('ar-cat').addEventListener('change', syncSubs);
    syncSubs();

    function recalc() {
      var res = calcTotals($('ar-rate').value, $('ar-qty').value);
      $('ar-calc-total').textContent = '₹' + res.total.toLocaleString('en-IN');
      $('ar-calc-sub').textContent = 'Base: ₹' + res.subtotal.toLocaleString('en-IN') + ' + GST (18%): ₹' + res.gst.toLocaleString('en-IN');
    }
    $('ar-rate').addEventListener('input', recalc);
    $('ar-qty').addEventListener('input', recalc);
    recalc();

    $('arch-post-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('ar-submit'), msg = $('ar-msg');
      var file = $('ar-img').files[0];
      btn.disabled = true; btn.textContent = 'Publishing...'; msg.textContent = '';

      var up = file ? uploadFile('architect_post', file) : Promise.resolve('https://interagood.in/assets/interior-hero.webp');
      up.then(function (imgUrl) {
        var payload = {
          title: $('ar-title').value.trim(),
          category: $('ar-cat').value,
          sub_category: $('ar-sub').value || null,
          description: $('ar-desc').value.trim(),
          unit: $('ar-unit').value,
          rate_per_unit: Number($('ar-rate').value) || 0,
          quantity: Number($('ar-qty').value) || 1,
          with_material: true,
          image_url: imgUrl,
          media_type: 'image',
          is_private: false
        };
        if (isLocalTest) {
          var item = Object.assign({ id: 'loc_' + Date.now(), created_at: new Date().toISOString(), total_amount: calcTotals(payload.rate_per_unit, payload.quantity).subtotal }, payload);
          var list = loadLocalFallback(); list.unshift(item); saveLocalFallback(list);
          state.listings = list;
          return { success: true };
        }
        return api('/users/' + session.uuid + '/listings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        }).then(fetchListings);
      }).then(function () {
        updateTopBar();
        renderArchitectEngine();
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Publish Architect Post';
        msg.textContent = err.message; msg.style.color = '#dc2626';
      });
    });
    wireListingDeletes();
  }

  function renderPartnerPrivateUploader() {
    $('db-page-title').textContent = 'Private Sample Upload (Admin Skill Evaluation)';
    $('db-page-sub').textContent = 'Upload photos of your real site work. Admins evaluate these privately to assign incoming projects.';

    var catOpts = (window.CATALOG && window.CATALOG.partner || []).map(function (c) {
      return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>';
    }).join('');

    var html = '<div class="private-notice">' +
      '<strong>Privacy Guarantee:</strong> Partner sample uploads are stored in a private bucket and <strong>never shown to clients</strong>. Only Interagood Admins review them to verify skill level and assign projects.' +
      '</div>' +
      '<div class="calc-panel">' +
      '<form id="partner-sample-form">' +
      '<div class="calc-grid">' +
      '<div class="calc-field"><label for="pt-title">Sample Work Title</label><input id="pt-title" type="text" required placeholder="e.g., Wardrobe Laminate Finishing, POP Cove Work"></div>' +
      '<div class="calc-field"><label for="pt-cat">Work Category</label><select id="pt-cat">' + catOpts + '</select></div>' +
      '<div class="calc-field"><label for="pt-img">Work Photo (JPG, PNG, WebP)</label><input id="pt-img" type="file" accept="image/jpeg,image/png,image/webp" required></div>' +
      '</div>' +
      '<div class="calc-field" style="margin-top:12px;"><label for="pt-desc">Site Work Details</label><textarea id="pt-desc" placeholder="Brief note about tools used, finish quality, and completion time..."></textarea></div>' +
      '<div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
      '<span class="tcb-sub">Marked automatically as Private · Admin Evaluation Only</span>' +
      '<button type="submit" class="tcb-btn primary" id="pt-submit">Submit Private Sample</button>' +
      '</div>' +
      '<p class="hint" id="pt-msg" style="margin-top:10px;"></p>' +
      '</form></div>' + renderListingsSection();

    $('db-content').innerHTML = html;

    $('partner-sample-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var file = $('pt-img').files[0];
      if (!file) { $('pt-msg').textContent = 'Please select a sample photo.'; return; }
      var btn = $('pt-submit'), msg = $('pt-msg');
      btn.disabled = true; btn.textContent = 'Uploading securely...'; msg.textContent = '';

      uploadFile('partner_sample', file).then(function (url) {
        var payload = {
          title: $('pt-title').value.trim(),
          category: $('pt-cat').value,
          description: $('pt-desc').value.trim(),
          unit: 'pieces',
          rate_per_unit: 0,
          quantity: 1,
          image_url: url,
          media_type: 'image',
          is_private: true
        };
        if (isLocalTest) {
          var item = Object.assign({ id: 'loc_' + Date.now(), created_at: new Date().toISOString() }, payload);
          var list = loadLocalFallback(); list.unshift(item); saveLocalFallback(list);
          state.listings = list;
          return { success: true };
        }
        return api('/users/' + session.uuid + '/listings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        }).then(fetchListings);
      }).then(function () {
        updateTopBar();
        renderPartnerPrivateUploader();
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Submit Private Sample';
        msg.textContent = err.message; msg.style.color = '#dc2626';
      });
    });
    wireListingDeletes();
  }

  function renderListingsSection() {
    var title = role === 'partner' ? 'Your Private Evaluation Samples' : role === 'architect' ? 'Your Published Architect Posts' : 'Your Posted Products & Samples';
    var html = '<h3 style="margin:24px 0 12px;color:#0b1f3a;">' + title + '</h3>';
    if (!state.listings.length) {
      return html + '<div class="db-card"><div class="db-empty">Nothing uploaded yet. Use the form or click "Upload Sample" above.</div></div>';
    }
    html += '<div class="listing-grid">';
    state.listings.forEach(function (it) {
      var mediaHtml = it.media_type === 'video'
        ? '<video src="' + esc(it.image_url) + '" controls preload="metadata"></video>'
        : '<img src="' + esc(it.image_url || 'assets/logo-square.png') + '" alt="' + esc(it.title) + '" onerror="this.src=\'assets/logo-square.png\'">';
      html += '<article class="listing-card">' +
        '<div class="listing-media">' + mediaHtml + '</div>' +
        '<div class="listing-body">' +
        (role === 'architect' ? '<span class="with-mat-label" style="align-self:flex-start;">with material</span>' : '') +
        (role === 'partner' ? '<span style="font-size:0.72rem;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:6px;align-self:flex-start;">Private · Admin Only</span>' : '') +
        '<h4>' + esc(it.title) + '</h4>' +
        '<div class="listing-meta">' + esc(it.category) + (it.sub_category ? ' → ' + esc(it.sub_category) : '') + '</div>' +
        (it.description ? '<div class="listing-meta">' + esc(it.description) + '</div>' : '') +
        (it.rate_per_unit > 0 ? '<div class="listing-price">₹' + Number(it.rate_per_unit).toLocaleString('en-IN') + ' / ' + esc(it.unit || 'sqft') + '</div>' : '') +
        '<button type="button" class="listing-del" data-del-id="' + esc(it.id) + '">Delete</button>' +
        '</div></article>';
    });
    html += '</div>';
    return html;
  }

  function wireListingDeletes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-del-id]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del-id');
        btn.disabled = true;
        if (isLocalTest) {
          var next = loadLocalFallback().filter(function (x) { return x.id !== id; });
          saveLocalFallback(next); state.listings = next; updateTopBar(); showPage(state.activePage);
          return;
        }
        api('/users/' + session.uuid + '/listings/' + id, { method: 'DELETE' }).then(function () {
          return fetchListings();
        }).then(function () { showPage(state.activePage); }).catch(function (err) { showToast(err.message || 'Delete failed', true); btn.disabled = false; });
      });
    });
  }

  pages.orders = function () {
    $('db-page-title').textContent = 'Completed & Assigned Orders';
    $('db-page-sub').textContent = 'Orders assigned to you by Interagood Admin appear here once you toggle Online.';
    $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">' +
      'No completed orders yet. Keep your <strong>Online</strong> toggle switched on in the top control bar so Admins can assign nearby projects to you.' +
      '</div></div>';
  };

  pages.earnings = function () {
    var u = state.user || {};
    var amt = PLAN_AMOUNTS[role] || 199;
    $('db-page-title').textContent = 'Billing & PayU Payment Cycle';
    $('db-page-sub').textContent = 'Modular PayU payment gateway hooks are ready for sandbox testing and live key activation.';
    $('db-content').innerHTML = '<div class="db-card" style="max-width:540px;">' +
      '<h3 style="margin:0 0 8px;color:#0b1f3a;">' + role.charAt(0).toUpperCase() + role.slice(1) + ' Monthly Membership</h3>' +
      '<p style="color:#64748b;margin:0 0 16px;">Status: <strong>' + esc(u.payment_status === 'paid' ? 'Paid & Active' : 'Pending Activation (Sandbox Ready)') + '</strong> · Plan: <strong>₹' + amt + ' / month</strong></p>' +
      '<button type="button" class="tcb-btn green" id="earn-payu">Pay ₹' + amt + ' via PayU</button>' +
      '</div>';
    $('earn-payu').addEventListener('click', triggerPayU);
  };

  pages.profile = function () {
    $('db-page-title').textContent = 'Profile';
    $('db-page-sub').textContent = 'Registered business and Aadhaar KYC details.';
    var u = state.user || session.profile || {};
    var html = '<div class="db-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
      '<div class="db-card"><h3 style="margin:0 0 12px;color:#0b1f3a;">Account</h3>' +
      '<p><strong>Username:</strong> ' + esc(u.username || session.username || '-') + '</p>' +
      '<p><strong>Role:</strong> ' + esc(role.charAt(0).toUpperCase() + role.slice(1)) + '</p>' +
      (u.ig_id ? '<p><strong>IG ID:</strong> ' + esc(u.ig_id) + '</p>' : '') +
      (u.skill_level ? '<p><strong>Skill Level:</strong> ' + esc(u.skill_level) + '</p>' : '') +
      '</div>' +
      '<div class="db-card"><h3 style="margin:0 0 12px;color:#0b1f3a;">Business Details</h3>' +
      '<p><strong>Full Name (Aadhaar):</strong> ' + esc(u.full_name || '-') + '</p>' +
      '<p><strong>Business Name:</strong> ' + esc(u.business_name || '-') + '</p>' +
      '<p><strong>Category:</strong> ' + esc(u.category_name || '-') + '</p>' +
      (u.education ? '<p><strong>Courses Completed:</strong> ' + esc(u.education) + '</p>' : '') +
      (u.design_software ? '<p><strong>Design Software:</strong> ' + esc(u.design_software) + '</p>' : '') +
      (u.shop_years != null ? '<p><strong>Shop History:</strong> ' + esc(u.shop_years) + ' years</p>' : '') +
      '<p><strong>Address:</strong> ' + esc([u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ') || '-') + '</p>' +
      '</div></div>';
    $('db-content').innerHTML = html;
  };

  function showPage(id) {
    state.activePage = id;
    setActiveNav(id);
    if (pages[id]) pages[id]();
  }

  $('db-logout-btn').addEventListener('click', function () {
    sessionStorage.removeItem('ig_session');
    location.replace('index.html');
  });
  $('db-menu').addEventListener('click', function () {
    $('db-side').classList.toggle('open');
  });

  // ---- Init ----
  $('db-username').textContent = session.username || 'User';
  $('db-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
  renderNav();

  Promise.all([
    api('/users/' + session.uuid).then(function (d) {
      if (d && d.data && !Array.isArray(d.data)) {
        state.user = d.data;
        state.isOnline = d.data.is_online !== false;
        $('db-username').textContent = d.data.business_name || d.data.username || session.username || 'User';
      } else {
        state.user = session.profile || {};
      }
    }).catch(function () { state.user = session.profile || {}; }),
    fetchListings()
  ]).then(function () {
    updateTopBar();
    showPage('overview');
  });
})();
