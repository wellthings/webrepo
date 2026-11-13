(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var $ = function (id) { return document.getElementById(id); };

  var MEASUREMENTS = [
    { id: 'sqfit', label: 'Square Feet (sq.ft)', perText: 'per sq.ft' },
    { id: 'fit', label: 'Feet (ft)', perText: 'per ft' },
    { id: 'runningfit', label: 'Running Feet (rft)', perText: 'per running ft' },
    { id: 'inch', label: 'Inch (in)', perText: 'per inch' },
    { id: 'pcs', label: 'Piece / Unit (pcs)', perText: 'per piece' },
    { id: 'meter', label: 'Meter (m)', perText: 'per meter' },
    { id: 'kg', label: 'Kilogram (kg)', perText: 'per kg' },
    { id: 'liter', label: 'Liter (L)', perText: 'per liter' },
    { id: 'bundle', label: 'Bundle / Set', perText: 'per bundle' },
    { id: 'contract', label: 'Full Contract (Lump Sum)', perText: 'per contract' }
  ];

  var ROLE_PRODUCT_GUIDES = {
    partner: {
      heading: 'List Your Service Work Product',
      hint: 'Partner can list specific small task works in your category (e.g., Lock fitting, Hinges change, Handle lock install, Switchboard repair).',
      placeholder: 'e.g., Door Handle & Lock Fitting, Hydraulic Hinges Change'
    },
    architect: {
      heading: 'List Full Contract Design / Work',
      hint: 'Architect can list full contract packages (e.g., Modular Kitchen Contract, Complete Plumbing Contract, Full Interior Painting).',
      placeholder: 'e.g., Full Modular Kitchen Contract, Complete Home Painting'
    },
    supplier: {
      heading: 'List Store Material Product',
      hint: 'Supplier can sell category items & fittings (e.g., Brass Door Lock, Soft-Close Hinges, Screw Fittings Pack, Plywood Sheet).',
      placeholder: 'e.g., Brass Mortise Lock Set, Hydraulic Hinges Pair, Screw Box'
    }
  };

  var PLAN_FEES = { partner: 109, supplier: 219, architect: 310 };
  var SAMPLE_LIMIT_TOTAL = 6;
  var SAMPLE_LIMIT_IMG = 3;
  var SAMPLE_LIMIT_VID = 3;
  var PRODUCT_LIMIT_TOTAL = 4;

  // ---- Auth & Onboarding Payment Guard ----
  var session = null;
  try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (e) { session = null; }
  if (!session || !session.accessToken || !session.uuid) {
    location.replace('partner-program.html#login');
    return;
  }
  if (session.payment_status !== 'paid') {
    location.replace('partner-program.html#onboarding-pay');
    return;
  }

  var role = session.role || 'partner';
  var isLocalTest = String(session.uuid).indexOf('test_') === 0;
  var state = {
    user: session.profile || {},
    products: [],
    samples: [],
    orders: [],
    orderFilter: 'pending',
    quota: {
      samples: { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: SAMPLE_LIMIT_TOTAL, maxImages: SAMPLE_LIMIT_IMG, maxVideos: SAMPLE_LIMIT_VID },
      products: { totalUsed: 0, maxTotal: PRODUCT_LIMIT_TOTAL }
    },
    isOnline: session.is_online !== false,
    activeTab: 'home'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showToast(msg, isError) {
    var old = $('ig-app-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'ig-app-toast';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;bottom:78px;left:50%;transform:translateX(-50%);z-index:9999;padding:11px 18px;border-radius:10px;font-size:0.86rem;font-weight:700;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.22);max-width:90%;background:' + (isError ? '#dc2626' : '#0b1f3a') + ';';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 3600);
  }

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

  function localKey(name) { return 'ig_app_' + name + '_' + session.uuid; }
  function loadLocal(name) { try { return JSON.parse(localStorage.getItem(localKey(name))) || []; } catch (e) { return []; } }
  function saveLocal(name, arr) { try { localStorage.setItem(localKey(name), JSON.stringify(arr)); } catch (e) {} }

  function updateTopBar() {
    var u = state.user || {};
    var addrParts = [u.address, u.city, u.state, u.pincode].filter(Boolean);
    $('top-address').textContent = addrParts.length ? addrParts.join(', ') : 'Address pending';
    $('top-role-label').textContent = (role.charAt(0).toUpperCase() + role.slice(1)) + (u.category_name ? ' · ' + u.category_name : '');

    var sw = $('top-online-switch');
    sw.setAttribute('aria-checked', state.isOnline ? 'true' : 'false');
    var lbl = $('top-online-label');
    lbl.textContent = state.isOnline ? 'Online' : 'Offline';
    lbl.className = 'app-online-txt ' + (state.isOnline ? 'on' : 'off');
  }

  function setOnlineState(next) {
    var prev = state.isOnline;
    state.isOnline = next;
    session.is_online = next;
    try { sessionStorage.setItem('ig_session', JSON.stringify(session)); } catch (e) {}
    updateTopBar();
    render();
    if (isLocalTest) return Promise.resolve();
    return api('/users/' + session.uuid + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: next })
    }).catch(function (err) {
      state.isOnline = prev;
      session.is_online = prev;
      updateTopBar();
      render();
      showToast(err.message || 'Could not update online status', true);
    });
  }

  $('top-online-switch').addEventListener('click', function () {
    setOnlineState(!state.isOnline);
  });

  function triggerPayAndLive() {
    var u = state.user || {};
    var amt = PLAN_FEES[role] || 109;
    if (!window.InteragoodPayU) {
      setOnlineState(true);
      return;
    }
    window.InteragoodPayU.initiatePayment({
      amount: amt,
      productInfo: 'Interagood ' + role.charAt(0).toUpperCase() + role.slice(1) + ' Active Cycle',
      firstName: u.full_name || session.username || 'Member',
      email: u.email || 'billing@interagood.in',
      phone: u.phone || session.phone || '9999999999',
      onSuccess: function (res) {
        var req = isLocalTest
          ? Promise.resolve({ payment_status: 'paid', next_due_at: new Date(Date.now() + 30 * 86400000).toISOString() })
          : api('/payments/payu/sandbox-activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ txnid: res.txnid })
            });
        req.then(function (d) {
          state.user.payment_status = d.payment_status || 'paid';
          state.user.next_due_at = d.next_due_at || state.user.next_due_at;
          session.payment_status = 'paid';
          sessionStorage.setItem('ig_session', JSON.stringify(session));
          setOnlineState(true);
          showToast('Profile Active & Live!', false);
        }).catch(function () {
          setOnlineState(true);
        });
      }
    });
  }

  function recomputeLocalQuotas() {
    var todayStr = new Date().toISOString().slice(0, 10);
    var sToday = state.samples.filter(function (s) { return !s.created_at || String(s.created_at).slice(0, 10) === todayStr; });
    var pToday = state.products.filter(function (p) { return !p.created_at || String(p.created_at).slice(0, 10) === todayStr; });
    state.quota = {
      samples: {
        totalUsed: sToday.length,
        imagesUsed: sToday.filter(function (x) { return x.media_type !== 'video'; }).length,
        videosUsed: sToday.filter(function (x) { return x.media_type === 'video'; }).length,
        maxTotal: SAMPLE_LIMIT_TOTAL,
        maxImages: SAMPLE_LIMIT_IMG,
        maxVideos: SAMPLE_LIMIT_VID
      },
      products: {
        totalUsed: pToday.length,
        maxTotal: PRODUCT_LIMIT_TOTAL
      }
    };
  }

  function fetchAllData() {
    if (isLocalTest) {
      state.products = loadLocal('products');
      state.samples = loadLocal('samples');
      state.orders = loadLocal('orders');
      recomputeLocalQuotas();
      updateTopBar();
      return Promise.resolve();
    }
    return Promise.all([
      api('/users/' + session.uuid).then(function (d) {
        if (d && d.data && !Array.isArray(d.data)) {
          state.user = d.data;
          state.samples = d.data.samples || [];
          state.isOnline = d.data.is_online !== false;
          if (d.data.payment_status && d.data.payment_status !== 'paid') {
            session.payment_status = d.data.payment_status;
            sessionStorage.setItem('ig_session', JSON.stringify(session));
            location.replace('partner-program.html#onboarding-pay');
          }
        }
      }).catch(function () {}),
      api('/users/' + session.uuid + '/listings').then(function (d) {
        state.products = d.data || [];
        if (d.quota && d.quota.samples) {
          state.quota = d.quota;
        }
      }).catch(function () {}),
      api('/users/' + session.uuid + '/orders').then(function (d) {
        state.orders = d.data || [];
      }).catch(function () {})
    ]).then(function () {
      if (!state.quota.products) recomputeLocalQuotas();
      updateTopBar();
    });
  }

  // ---- Bottom Sheet Helpers ----
  function openSheet(title, html) {
    $('sheet-title').textContent = title;
    $('sheet-body').innerHTML = html;
    $('app-sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $('app-sheet').hidden = true;
    $('sheet-body').innerHTML = '';
    document.body.style.overflow = '';
  }
  $('sheet-close').addEventListener('click', closeSheet);
  $('app-sheet').addEventListener('click', function (e) { if (e.target === $('app-sheet')) closeSheet(); });

  function openListProductSheet() {
    var pq = state.quota.products || { totalUsed: 0, maxTotal: PRODUCT_LIMIT_TOTAL };
    if (pq.totalUsed >= pq.maxTotal) {
      showToast('Daily limit reached: max 4 products per day.', true);
      return;
    }
    var g = ROLE_PRODUCT_GUIDES[role] || ROLE_PRODUCT_GUIDES.partner;
    var unitOpts = MEASUREMENTS.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.label) + '</option>';
    }).join('');
    var u = state.user || {};
    var defaultCat = u.category_name || (role === 'architect' ? 'Full Interior Contract' : role === 'supplier' ? 'Hardware & Materials' : 'Site Work');

    var html =
      '<p style="margin:0 0 12px;font-size:0.82rem;color:#475569;line-height:1.45;">' + esc(g.hint) + '</p>' +
      '<form id="app-prod-form">' +
      '<div class="f-group"><label for="lp-title">Product / Work Name</label><input id="lp-title" type="text" required placeholder="' + esc(g.placeholder) + '"></div>' +
      '<div class="f-group"><label>1. Pick Product Image</label>' +
      '<label class="pick-box" for="lp-img"><span id="lp-img-label">Tap to choose 1 image (JPG, PNG, WebP)</span><input id="lp-img" type="file" accept="image/jpeg,image/png,image/webp" hidden><img id="lp-preview" alt="" hidden></label></div>' +
      '<div class="f-pair">' +
      '<div class="f-group"><label for="lp-unit">Measurement Type</label><select id="lp-unit">' + unitOpts + '</select></div>' +
      '<div class="f-group"><label for="lp-rate" id="lp-rate-label">Price (per sq.ft)</label><input id="lp-rate" type="number" min="1" step="0.01" placeholder="0.00" required></div>' +
      '</div>' +
      '<div class="f-group"><label for="lp-expected">Expected Amount (₹0.00)</label><input id="lp-expected" type="number" min="0" step="0.01" placeholder="₹0.00" required></div>' +
      '<div class="f-group"><label for="lp-desc">Product Description (Free Write)</label><textarea id="lp-desc" placeholder="Describe specs, fittings, finish, or work scope..."></textarea></div>' +
      '<div class="mat-toggle"><label for="lp-with-mat">with material</label><input id="lp-with-mat" type="checkbox" checked style="width:20px;height:20px;accent-color:#15803d;"></div>' +
      '<p class="hint" id="lp-msg" style="margin:0 0 8px;"></p>' +
      '<button type="submit" class="app-cta-btn primary" style="width:100%;" id="lp-submit">Post Product (' + pq.totalUsed + '/' + pq.maxTotal + ' used today)</button>' +
      '</form>';

    openSheet(g.heading, html);

    var unitEl = $('lp-unit'), rateLabel = $('lp-rate-label'), rateEl = $('lp-rate'), expEl = $('lp-expected');
    function syncUnitLabel() {
      var found = MEASUREMENTS.find(function (m) { return m.id === unitEl.value; }) || MEASUREMENTS[0];
      rateLabel.textContent = 'Price (' + found.perText + ')';
    }
    unitEl.addEventListener('change', syncUnitLabel);
    syncUnitLabel();

    rateEl.addEventListener('input', function () {
      if (!expEl.getAttribute('data-touched')) expEl.value = rateEl.value;
    });
    expEl.addEventListener('input', function () { expEl.setAttribute('data-touched', '1'); });

    $('lp-img').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      $('lp-img-label').textContent = f.name;
      $('lp-preview').src = URL.createObjectURL(f);
      $('lp-preview').hidden = false;
    });

    $('app-prod-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('lp-submit'), msg = $('lp-msg');
      var file = $('lp-img').files[0];
      btn.disabled = true; btn.textContent = 'Posting product...'; msg.textContent = '';

      var up = file ? uploadFile('supplier_product', file) : Promise.resolve('https://interagood.in/assets/logo-square.png');
      up.then(function (imgUrl) {
        var payload = {
          title: $('lp-title').value.trim(),
          category: defaultCat,
          description: $('lp-desc').value.trim(),
          unit: unitEl.value,
          rate_per_unit: Number(rateEl.value) || 0,
          quantity: 1,
          expected_amount: Number(expEl.value) || Number(rateEl.value) || 0,
          with_material: !!$('lp-with-mat').checked,
          image_url: imgUrl,
          media_type: 'image',
          is_private: false
        };
        if (isLocalTest) {
          var item = Object.assign({ id: 'prod_' + Date.now(), created_at: new Date().toISOString() }, payload);
          state.products.unshift(item);
          saveLocal('products', state.products);
          recomputeLocalQuotas();
          return;
        }
        return api('/users/' + session.uuid + '/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(fetchAllData);
      }).then(function () {
        closeSheet();
        render();
        showToast('Product posted to Product Table!', false);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Post Product';
        msg.textContent = err.message; msg.style.color = '#dc2626';
      });
    });
  }

  function openUploadSampleSheet() {
    var sq = state.quota.samples || { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: 6, maxImages: 3, maxVideos: 3 };
    if (sq.totalUsed >= sq.maxTotal) {
      showToast('Daily sample limit reached: max 6 samples (3 images + 3 videos) today.', true);
      return;
    }

    var html =
      '<p style="margin:0 0 12px;font-size:0.82rem;color:#475569;">Daily Sample Limit: <strong>' + sq.totalUsed + '/6</strong> used · Images <strong>' + sq.imagesUsed + '/3</strong> · Videos <strong>' + sq.videosUsed + '/3</strong></p>' +
      '<form id="app-sample-form">' +
      '<div class="f-group"><label>Pick Sample Image or Video</label>' +
      '<label class="pick-box" for="us-media"><span id="us-media-label">Tap to pick Image (JPG/PNG/WebP) or Video (MP4/MOV)</span><input id="us-media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" required hidden><img id="us-img-prev" alt="" hidden><video id="us-vid-prev" controls hidden></video></label></div>' +
      '<div class="f-group"><label for="us-name">Sample Name (Free Write)</label><input id="us-name" type="text" required maxlength="120" placeholder="Write your sample work name..."></div>' +
      '<div class="f-group"><label for="us-desc">Short Description</label><textarea id="us-desc" maxlength="300" placeholder="Short description of this sample..."></textarea></div>' +
      '<p class="hint" id="us-msg" style="margin:0 0 8px;"></p>' +
      '<button type="submit" class="app-cta-btn secondary" style="width:100%;background:#0b1f3a;color:#fff;" id="us-submit">Upload Sample</button>' +
      '</form>';

    openSheet('Upload Sample', html);

    $('us-media').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      $('us-media-label').textContent = f.name;
      var isVid = /^video\//.test(f.type);
      $('us-img-prev').hidden = isVid;
      $('us-vid-prev').hidden = !isVid;
      if (isVid) $('us-vid-prev').src = URL.createObjectURL(f);
      else $('us-img-prev').src = URL.createObjectURL(f);
    });

    $('app-sample-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var file = $('us-media').files[0];
      var msg = $('us-msg'), btn = $('us-submit');
      if (!file) { msg.textContent = 'Please pick an image or video.'; msg.style.color = '#dc2626'; return; }
      var isVid = /^video\//.test(file.type);
      if (!isVid && sq.imagesUsed >= 3) { msg.textContent = 'Daily image sample limit (3/3) reached.'; msg.style.color = '#dc2626'; return; }
      if (isVid && sq.videosUsed >= 3) { msg.textContent = 'Daily video sample limit (3/3) reached.'; msg.style.color = '#dc2626'; return; }

      btn.disabled = true; btn.textContent = 'Uploading...'; msg.textContent = '';
      var uploadKind = role === 'partner' ? 'partner_sample' : 'sample';

      uploadFile(uploadKind, file).then(function (mediaUrl) {
        var u = state.user || {};
        var payload = {
          media_type: isVid ? 'video' : 'image',
          title: $('us-name').value.trim(),
          caption: $('us-desc').value.trim(),
          media_url: mediaUrl,
          price: 1,
          price_unit: 'pcs',
          is_private: role === 'partner',
          uuid: session.uuid,
          role: role,
          phone: session.phone || u.phone || '',
          username: session.username || u.username || '',
          business_name: u.business_name || ''
        };
        if (isLocalTest) {
          var item = Object.assign({ id: 'smp_' + Date.now(), created_at: new Date().toISOString() }, payload);
          state.samples.unshift(item);
          saveLocal('samples', state.samples);
          recomputeLocalQuotas();
          return;
        }
        return api('/users/' + session.uuid + '/samples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(fetchAllData);
      }).then(function () {
        closeSheet();
        render();
        showToast('Sample saved to Sample Table!', false);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Upload Sample';
        msg.textContent = err.message; msg.style.color = '#dc2626';
      });
    });
  }

  // ---- Tab Views ----
  function renderHome() {
    var u = state.user || {};
    var nextDue = u.next_due_at || u.payment_due_date || new Date(Date.now() + 30 * 86400000).toISOString();
    var dt = new Date(nextDue);
    var nextStr = !isNaN(dt) ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : String(nextDue);

    var sq = state.quota.samples || { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: 6, maxImages: 3, maxVideos: 3 };
    var pq = state.quota.products || { totalUsed: 0, maxTotal: 4 };
    var sRem = Math.max(0, sq.maxTotal - sq.totalUsed);
    var pRem = Math.max(0, pq.maxTotal - pq.totalUsed);
    var sPct = Math.min(100, Math.round((sq.totalUsed / sq.maxTotal) * 100));
    var pPct = Math.min(100, Math.round((pq.totalUsed / pq.maxTotal) * 100));

    var activeBillHtml = state.isOnline
      ? '<button type="button" class="bill-action-btn is-active" id="bill-state-btn">● Active</button>'
      : '<button type="button" class="bill-action-btn is-pay-live" id="bill-state-btn">Pay &amp; Live</button>';

    var html =
      // Billing Card
      '<section class="bill-card" aria-label="Billing Card">' +
      '<div class="bill-info">' +
      '<div class="bill-title-row"><span>Profile Billing</span><span>·</span><span>₹' + (PLAN_FEES[role] || 109) + '/month</span></div>' +
      '<div class="bill-status-main">' + (state.isOnline ? 'Profile Active' : 'Currently Offline') + '</div>' +
      '<div class="bill-next-date">Next billing date: ' + esc(nextStr) + '</div>' +
      '</div>' +
      activeBillHtml +
      '</section>' +

      // Product & Sample Daily Countdown
      '<section class="limit-grid" aria-label="Daily Upload Limits">' +
      '<div class="limit-card">' +
      '<div class="limit-top"><span class="limit-title">Sample Countdown (Daily Limit 6)</span><span class="limit-count">' + sRem + ' left</span></div>' +
      '<div class="quota-bar"><div class="quota-fill ' + (sq.totalUsed >= 6 ? 'full' : '') + '" style="width:' + sPct + '%"></div></div>' +
      '<div class="limit-sub">' + sq.totalUsed + '/6 used · Images ' + sq.imagesUsed + '/3 · Videos ' + sq.videosUsed + '/3</div>' +
      '</div>' +
      '<div class="limit-card">' +
      '<div class="limit-top"><span class="limit-title">Product Daily Limit (4 Only)</span><span class="limit-count">' + pRem + ' left</span></div>' +
      '<div class="quota-bar"><div class="quota-fill ' + (pq.totalUsed >= 4 ? 'full' : '') + '" style="width:' + pPct + '%"></div></div>' +
      '<div class="limit-sub">' + pq.totalUsed + '/4 products listed today</div>' +
      '</div>' +
      '</section>' +

      // Two Action Buttons: List Product & Upload Samples
      '<div class="cta-pair">' +
      '<button type="button" class="app-cta-btn primary" id="btn-list-product">+ List Product</button>' +
      '<button type="button" class="app-cta-btn secondary" id="btn-upload-sample">+ Upload Samples</button>' +
      '</div>';

    // Listed Products Feed
    html += '<section class="app-section"><div class="app-sec-head"><h2>Your Products</h2><span class="app-sec-meta">' + state.products.length + ' listed</span></div>';
    if (!state.products.length) {
      html += '<div class="app-empty">No products listed yet. Tap <strong>+ List Product</strong> above to post your first item.</div>';
    } else {
      html += '<div class="app-items-grid">';
      state.products.forEach(function (p) {
        var amt = Number(p.expected_amount || p.total_amount || p.rate_per_unit || 0);
        html += '<article class="app-item-card">' +
          '<div class="app-item-media"><img src="' + esc(p.image_url || 'assets/logo-square.png') + '" alt="' + esc(p.title) + '" onerror="this.src=\'assets/logo-square.png\'"></div>' +
          '<div class="app-item-body">' +
          (p.with_material !== false ? '<span class="with-mat-tag">with material</span>' : '') +
          '<h3 class="app-item-title">' + esc(p.title) + '</h3>' +
          (p.description ? '<div class="app-item-desc">' + esc(p.description) + '</div>' : '') +
          '<div class="app-item-price">₹' + Number(p.rate_per_unit || 0).toLocaleString('en-IN') + ' / ' + esc(p.unit || 'sqfit') +
          (amt > 0 ? ' · Expected ₹' + amt.toLocaleString('en-IN') : '') + '</div>' +
          '<button type="button" class="item-del-btn" data-del-prod="' + esc(p.id) + '">Delete</button>' +
          '</div></article>';
      });
      html += '</div>';
    }
    html += '</section>';

    // Uploaded Samples Feed
    html += '<section class="app-section"><div class="app-sec-head"><h2>Your Samples</h2><span class="app-sec-meta">' + state.samples.length + ' uploaded</span></div>';
    if (!state.samples.length) {
      html += '<div class="app-empty">No samples uploaded yet. Tap <strong>+ Upload Samples</strong> above to add work photos or videos.</div>';
    } else {
      html += '<div class="app-items-grid">';
      state.samples.forEach(function (s) {
        var media = s.media_type === 'video'
          ? '<video src="' + esc(s.media_url) + '" controls preload="metadata"></video>'
          : '<img src="' + esc(s.media_url || 'assets/logo-square.png') + '" alt="' + esc(s.title) + '" onerror="this.src=\'assets/logo-square.png\'">';
        html += '<article class="app-item-card">' +
          '<div class="app-item-media">' + media + '</div>' +
          '<div class="app-item-body">' +
          '<h3 class="app-item-title">' + esc(s.title) + '</h3>' +
          (s.caption ? '<div class="app-item-desc">' + esc(s.caption) + '</div>' : '') +
          '<button type="button" class="item-del-btn" data-del-sample="' + esc(s.id) + '">Delete</button>' +
          '</div></article>';
      });
      html += '</div>';
    }
    html += '</section>';

    $('app-content').innerHTML = html;

    $('bill-state-btn').addEventListener('click', function () {
      if (!state.isOnline) triggerPayAndLive();
      else showToast('Your profile is Active and Online!', false);
    });
    $('btn-list-product').addEventListener('click', openListProductSheet);
    $('btn-upload-sample').addEventListener('click', openUploadSampleSheet);

    Array.prototype.forEach.call(document.querySelectorAll('[data-del-prod]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del-prod');
        btn.disabled = true;
        if (isLocalTest) {
          state.products = state.products.filter(function (x) { return x.id !== id; });
          saveLocal('products', state.products);
          recomputeLocalQuotas();
          render();
          return;
        }
        api('/users/' + session.uuid + '/listings/' + id, { method: 'DELETE' }).then(fetchAllData).then(render).catch(function (err) {
          showToast(err.message, true); btn.disabled = false;
        });
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-del-sample]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del-sample');
        btn.disabled = true;
        if (isLocalTest) {
          state.samples = state.samples.filter(function (x) { return x.id !== id; });
          saveLocal('samples', state.samples);
          recomputeLocalQuotas();
          render();
          return;
        }
        api('/users/' + session.uuid + '/samples/' + id, { method: 'DELETE' }).then(fetchAllData).then(render).catch(function (err) {
          showToast(err.message, true); btn.disabled = false;
        });
      });
    });
  }

  function renderOrders() {
    var pendingCount = state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    var progCount = state.orders.filter(function (o) { return o.status === 'in_progress'; }).length;
    var compCount = state.orders.filter(function (o) { return o.status === 'completed'; }).length;
    var list = state.orders.filter(function (o) { return o.status === state.orderFilter; });

    var html = '<section class="app-section">' +
      '<div class="app-sec-head"><h2>Assigned Orders</h2><span class="app-sec-meta">' + state.orders.length + ' total</span></div>' +
      '<div class="order-segs" role="tablist">' +
      '<button type="button" class="order-seg-btn ' + (state.orderFilter === 'pending' ? 'active' : '') + '" data-ord-flt="pending">Pending (' + pendingCount + ')</button>' +
      '<button type="button" class="order-seg-btn ' + (state.orderFilter === 'in_progress' ? 'active' : '') + '" data-ord-flt="in_progress">Progress (' + progCount + ')</button>' +
      '<button type="button" class="order-seg-btn ' + (state.orderFilter === 'completed' ? 'active' : '') + '" data-ord-flt="completed">Complete (' + compCount + ')</button>' +
      '</div>';

    if (!list.length) {
      html += '<div class="app-empty">No ' + esc(state.orderFilter.replace('_', ' ')) + ' orders right now. Keep your <strong>Online</strong> toggle active to receive Admin assignments.</div>';
    } else {
      list.forEach(function (o) {
        html += '<div class="order-row">' +
          '<div class="order-row-top"><strong>' + (o.order_no ? 'Order #' + esc(o.order_no) : esc(o.work_type || 'Project')) + '</strong><span class="app-sec-meta">' + esc(o.status.replace('_', ' ').toUpperCase()) + '</span></div>' +
          '<div class="app-item-desc">Work: ' + esc(o.work_type) + ' · Location: ' + esc(o.location_name || 'Client Site') + '</div>' +
          '<div class="order-actions">' +
          (o.status === 'pending' ? '<button type="button" class="order-act-btn" data-ord-id="' + esc(o.id) + '" data-ord-next="in_progress">Start Progress</button>' : '') +
          (o.status !== 'completed' ? '<button type="button" class="order-act-btn primary" data-ord-id="' + esc(o.id) + '" data-ord-next="completed">Mark Complete</button>' : '') +
          '</div></div>';
      });
    }
    html += '</section>';
    $('app-content').innerHTML = html;

    Array.prototype.forEach.call(document.querySelectorAll('[data-ord-flt]'), function (btn) {
      btn.addEventListener('click', function () {
        state.orderFilter = btn.getAttribute('data-ord-flt');
        renderOrders();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-ord-next]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ord-id'), next = btn.getAttribute('data-ord-next');
        btn.disabled = true;
        api('/users/' + session.uuid + '/orders/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next })
        }).then(function () {
          state.orders.forEach(function (o) { if (o.id === id) o.status = next; });
          renderOrders();
          showToast('Order updated!', false);
        }).catch(function (err) {
          btn.disabled = false;
          showToast(err.message, true);
        });
      });
    });
  }

  function renderProfile() {
    var u = state.user || {};
    var addr = [u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ') || '-';
    var html = '<section class="app-section">' +
      '<div class="app-sec-head"><h2>My Profile</h2><span class="app-sec-meta">' + esc(role.toUpperCase()) + '</span></div>' +
      '<div class="prof-list">' +
      '<div class="prof-row"><span>Full Name (Aadhaar)</span><strong>' + esc(u.full_name || '-') + '</strong></div>' +
      '<div class="prof-row"><span>Business Name</span><strong>' + esc(u.business_name || '-') + '</strong></div>' +
      '<div class="prof-row"><span>Username</span><strong>@' + esc(u.username || session.username || '-') + '</strong></div>' +
      '<div class="prof-row"><span>Mobile Number</span><strong>' + esc(u.phone || session.phone || '-') + '</strong></div>' +
      '<div class="prof-row"><span>Category</span><strong>' + esc(u.category_name || role) + '</strong></div>' +
      (u.skill_level ? '<div class="prof-row"><span>Skill Level</span><strong>' + esc(u.skill_level) + '</strong></div>' : '') +
      (u.experience_years != null ? '<div class="prof-row"><span>Experience</span><strong>' + esc(u.experience_years) + ' yrs</strong></div>' : '') +
      (u.education ? '<div class="prof-row"><span>Courses Completed</span><strong>' + esc(u.education) + '</strong></div>' : '') +
      (u.design_software ? '<div class="prof-row"><span>Design Software</span><strong>' + esc(u.design_software) + '</strong></div>' : '') +
      '<div class="prof-row"><span>Registered Address</span><strong>' + esc(addr) + '</strong></div>' +
      '</div>' +
      '<button type="button" class="logout-full" id="prof-logout">Log Out</button>' +
      '</section>';

    $('app-content').innerHTML = html;
    $('prof-logout').addEventListener('click', function () {
      sessionStorage.removeItem('ig_session');
      location.replace('index.html');
    });
  }

  function renderCard() {
    var u = state.user || {};
    var bName = u.business_name || u.full_name || session.username || 'Interagood Partner';
    var uName = u.username || session.username || 'member';
    var addr = [u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ') || 'Lucknow, India';
    var roleText = role.charAt(0).toUpperCase() + role.slice(1);
    var igId = u.ig_id || ('IG-' + String(session.uuid).slice(-6).toUpperCase());

    var avatarHtml = u.profile_photo_url
      ? '<img src="' + esc(u.profile_photo_url) + '" alt="' + esc(bName) + '">'
      : '<span>' + esc(bName.charAt(0).toUpperCase()) + '</span>';

    var bannerImg = u.banner_url
      ? '<img src="' + esc(u.banner_url) + '" alt="" onerror="this.hidden=true">'
      : '';

    var html = '<section class="app-section">' +
      '<div class="app-sec-head"><h2>Your Business Card</h2><span class="app-sec-meta">' + esc(igId) + '</span></div>' +
      '<article class="biz-card">' +
      '<div class="bc-banner">' + bannerImg +
      '<div class="bc-id">' +
      '<div class="bc-avatar">' + avatarHtml + '</div>' +
      '<div class="bc-who">' +
      '<h3 class="bc-name"><span>' + esc(bName) + '</span>' +
      '<svg class="bc-tick" viewBox="0 0 24 24" aria-label="Verified Blue Tick"><circle cx="12" cy="12" r="11" fill="#1d9bf0"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</h3>' +
      '<p class="bc-user">@' + esc(uName) + ' · Verified</p>' +
      '</div>' +
      '</div></div>' +
      '<dl class="bc-details">' +
      '<div><dt>Address</dt><dd>' + esc(addr) + '</dd></div>' +
      '<div><dt>Role</dt><dd>' + esc(roleText) + ' <span class="bc-verified">✓ verified</span></dd></div>' +
      '<div><dt>Category</dt><dd>' + esc(u.category_name || roleText) + '</dd></div>' +
      '<div><dt>IG ID</dt><dd>' + esc(igId) + '</dd></div>' +
      '</dl></article>' +
      '</section>';

    $('app-content').innerHTML = html;
  }

  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('.app-tab-btn'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === state.activeTab);
    });
    if (state.activeTab === 'home') renderHome();
    else if (state.activeTab === 'orders') renderOrders();
    else if (state.activeTab === 'profile') renderProfile();
    else if (state.activeTab === 'card') renderCard();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.app-tab-btn'), function (b) {
    b.addEventListener('click', function () {
      state.activeTab = b.getAttribute('data-tab');
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ---- Init ----
  updateTopBar();
  fetchAllData().then(render);
})();
