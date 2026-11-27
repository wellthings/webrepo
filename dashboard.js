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
  var sessDue = session.next_due_at || (session.profile && session.profile.next_due_at);
  var sessExpired = !!(sessDue && !isNaN(new Date(sessDue).getTime()) && new Date(sessDue).getTime() <= Date.now());
  if (session.payment_status !== 'paid' || sessExpired) {
    if (sessExpired) {
      session.payment_status = 'expired';
      try { sessionStorage.setItem('ig_session', JSON.stringify(session)); } catch (e) {}
    }
    location.replace('partner-program.html#onboarding-pay');
    return;
  }

  var role = session.role || 'partner';
  var isPartner = role === 'partner';
  var isLocalTest = String(session.uuid).indexOf('test_') === 0;
  var SAMPLE_LIMITS = isPartner
    ? { total: 4, image: 4, video: 0 }
    : { total: 3, image: 3, video: 0 };
  var PRODUCT_HEADING = { architect: 'Your Product Listings', supplier: 'Your Products for Sale', partner: 'Your Product Listings' };
  var SAMPLE_HEADING = { architect: 'Your Sample Work', supplier: 'Your Product Samples', partner: 'Your Work Samples' };
  var state = {
    user: session.profile || {},
    products: [],
    samples: [],
    orders: [],
    orderFilter: 'pending',
    quota: {
      samples: { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: SAMPLE_LIMITS.total, maxImages: SAMPLE_LIMITS.image, maxVideos: SAMPLE_LIMITS.video },
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

  function inferMime(file) {
    var t = (file && file.type ? String(file.type).toLowerCase() : '');
    if (t === 'image/jpg') return 'image/jpeg';
    if (t && t !== 'application/octet-stream') return t;
    var n = (file && file.name ? file.name.toLowerCase() : '');
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.webp')) return 'image/webp';
    if (n.endsWith('.mp4')) return 'video/mp4';
    if (n.endsWith('.mov')) return 'video/quicktime';
    if (n.endsWith('.webm')) return 'video/webm';
    return 'image/jpeg';
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(new Error('Could not read file')); };
        fr.readAsDataURL(file);
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1000, w = img.width, h = img.height;
        if (w > max || h > max) {
          var s = Math.min(max / w, max / h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve(cv.toDataURL('image/jpeg', 0.82)); }
        catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  function uploadFile(kind, file) {
    if (isLocalTest) {
      // Persist a (downscaled) data URL so the picked image survives reloads in test mode.
      return fileToDataUrl(file);
    }
    var cType = inferMime(file);
    return fetch(API + '/users/' + session.uuid + '/upload?kind=' + encodeURIComponent(kind), {
      method: 'POST',
      headers: {
        'Content-Type': cType,
        Authorization: 'Bearer ' + session.accessToken
      },
      body: file
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Upload failed');
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

  function updateOrderTabBadge() {
    var badge = $('tab-order-badge');
    if (!badge) return;
    var pendingCount = state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    badge.textContent = String(pendingCount);
    badge.hidden = pendingCount <= 0;
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
      showToast('Payment engine unavailable. Please reload.', true);
      return;
    }
    showToast('Redirecting to PayU Checkout...', false);
    window.InteragoodPayU.initiatePayment({
      purpose: 'subscription',
      accessToken: session.accessToken,
      amount: amt,
      productInfo: 'Interagood ' + role.charAt(0).toUpperCase() + role.slice(1) + ' Active Cycle',
      firstName: u.full_name || session.username || 'Member',
      email: u.email || 'billing@interagood.in',
      phone: u.phone || session.phone || '',
      onFailure: function (failRes) {
        showToast((failRes && failRes.message) || 'Could not start PayU payment.', true);
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
        maxTotal: SAMPLE_LIMITS.total,
        maxImages: SAMPLE_LIMITS.image,
        maxVideos: SAMPLE_LIMITS.video
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
    var gotDedicatedSamples = false;
    return Promise.all([
      api('/users/' + session.uuid).then(function (d) {
        if (d && d.data && !Array.isArray(d.data)) {
          state.user = d.data;
          if (!gotDedicatedSamples && Array.isArray(d.data.samples)) state.samples = d.data.samples;
          var active = d.data.payment_active !== undefined ? !!d.data.payment_active : d.data.payment_status === 'paid';
          state.isOnline = active && d.data.is_online !== false;
          session.next_due_at = d.data.next_due_at || null;
          if (!active) {
            session.payment_status = d.data.payment_status || 'unpaid';
            session.payment_active = false;
            session.is_online = false;
            sessionStorage.setItem('ig_session', JSON.stringify(session));
            location.replace('partner-program.html#onboarding-pay');
          }
        }
      }).catch(function (err) {
        showToast((err && err.message) || 'Could not sync profile.', true);
      }),
      api('/users/' + session.uuid + '/samples').then(function (d) {
        if (d && Array.isArray(d.data)) {
          gotDedicatedSamples = true;
          state.samples = d.data;
        }
        if (d && d.quota && d.quota.samples) {
          state.quota = d.quota;
        }
      }).catch(function () {}),
      api('/users/' + session.uuid + '/listings').then(function (d) {
        state.products = (d && Array.isArray(d.data)) ? d.data : [];
        if (d && d.quota && d.quota.samples) {
          state.quota = d.quota;
        }
      }).catch(function (err) {
        showToast((err && err.message) || 'Could not load products.', true);
      }),
      api('/users/' + session.uuid + '/orders').then(function (d) {
        state.orders = (d && Array.isArray(d.data)) ? d.data : [];
      }).catch(function () {})
    ]).then(function () {
      if (!state.quota.products) recomputeLocalQuotas();
      updateTopBar();
      updateOrderTabBadge();
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
    if (role === 'supplier') {
      renderListProductSheet([], [], [], '');
      return;
    }
    function fetchJson(path) {
      return fetch(API + path).then(function (r) { return r.json().catch(function () { return {}; }); });
    }
    if (isPartner) {
      var u = state.user || {};
      var catId = u.category_id || (session.profile && session.profile.category_id) || '';
      var catName = u.category_name || (session.profile && session.profile.category_name) || '';
      var repairsPath = '/categories/partner/repairs' + (catId ? ('?category_id=' + encodeURIComponent(catId)) : '');
      Promise.all([
        fetchJson('/categories/partner').catch(function () { return { data: [] }; }),
        fetchJson(repairsPath).catch(function () { return { data: [] }; })
      ]).then(function (res) {
        var cats = (res[0] && Array.isArray(res[0].data)) ? res[0].data : [];
        var repairs = (res[1] && Array.isArray(res[1].data)) ? res[1].data : [];
        var matchedCat = null;
        if (cats.length) {
          if (catId) matchedCat = cats.find(function (c) { return String(c.id) === String(catId); }) || null;
          if (!matchedCat && catName) {
            var low = String(catName).toLowerCase();
            matchedCat = cats.find(function (c) { return String(c.name || '').toLowerCase() === low; }) ||
              cats.find(function (c) { return String(c.name || '').toLowerCase().indexOf(low.split('(')[0].trim()) !== -1; }) ||
              cats.find(function (c) { return low.indexOf(String(c.name || '').toLowerCase().split('(')[0].trim()) !== -1; }) || null;
          }
        }
        var servicesList = [];
        if (matchedCat) {
          catName = matchedCat.name || catName;
          var byCatRepairs = repairs.filter(function (r) { return String(r.category_id) === String(matchedCat.id); });
          if (byCatRepairs.length) {
            servicesList = byCatRepairs.map(function (r) { return r.repairing_service; }).filter(Boolean);
          } else if (Array.isArray(matchedCat.repairing_services) && matchedCat.repairing_services.length) {
            servicesList = matchedCat.repairing_services.slice();
          }
        } else if (repairs.length && catId) {
          servicesList = repairs.map(function (r) { return r.repairing_service; }).filter(Boolean);
        }
        if (!servicesList.length && window.CATALOG && window.CATALOG.partner) {
          var fallbackCat = window.CATALOG.partner.find(function (c) {
            return (catId && String(c.dbId) === String(catId)) ||
              (catName && String(c.name).toLowerCase() === String(catName).toLowerCase());
          }) || (catName ? window.CATALOG.partner.find(function (c) {
            var hay = String(catName).toLowerCase();
            return Array.isArray(c.keywords) && c.keywords.some(function (k) { return hay.indexOf(k) !== -1; });
          }) : null);
          if (fallbackCat) {
            if (!catName) catName = fallbackCat.name;
            servicesList = (fallbackCat.repairing_services || []).slice();
          }
        }
        if (!servicesList.length && repairs.length) {
          servicesList = repairs.map(function (r) { return r.repairing_service; }).filter(Boolean);
        }
        renderListProductSheet(cats, [], servicesList, catName);
      });
      return;
    }
    var catEndpoint = '/categories/partner';
    // Master data is public; fetch directly so it works even in test (test_) sessions.
    Promise.all([
      fetchJson(catEndpoint).catch(function () { return { data: [] }; }),
      fetchJson('/measurement-units').catch(function () { return { data: [] }; })
    ]).then(function (res) {
      var cats = (res[0] && Array.isArray(res[0].data)) ? res[0].data : [];
      if (!cats.length && window.CATALOG && window.CATALOG.partner) {
        cats = window.CATALOG.partner.map(function (c) { return { name: c.name }; });
      }
      var units = (res[1] && Array.isArray(res[1].data) && res[1].data.length)
        ? res[1].data
        : MEASUREMENTS.map(function (m) { return { code: m.id, name: m.label }; });
      renderListProductSheet(cats, units, [], '');
    });
  }

  function renderListProductSheet(cats, units, servicesList, partnerCatName) {
    var pq = state.quota.products || { totalUsed: 0, maxTotal: PRODUCT_LIMIT_TOTAL };
    var isArchitect = role === 'architect';
    var isSupplier = role === 'supplier';
    var partnerRole = role === 'partner';

    var heading = isSupplier
      ? 'List Your Product'
      : partnerRole
        ? 'List Product'
        : 'List Your Product for Client';
    var hint = isSupplier
      ? 'Add product name, photo, price, and description.'
      : partnerRole
        ? 'Add an example image, product name, select service from your category, price, and description (4 products/day).'
        : 'Attract Clients & Get Orders: Add an eye-catching product photo with your price—real site photos aren’t required, just list what sells best.';

    var html;
    if (isSupplier) {
      html =
        '<p style="margin:0 0 12px;font-size:0.82rem;color:#475569;line-height:1.45;">' + esc(hint) + '</p>' +
        '<form id="app-prod-form" novalidate>' +
        '<div class="f-group"><label for="lp-title">Product Name</label><input id="lp-title" type="text" required placeholder="Enter product name here"></div>' +
        '<div class="f-group"><label>Product Image</label>' +
        '<label class="pick-box" for="lp-img"><span id="lp-img-label">Tap to choose 1 image (JPG, PNG, WebP)</span><input id="lp-img" type="file" accept="image/jpeg,image/png,image/webp" hidden><img id="lp-preview" alt="" hidden></label></div>' +
        '<div class="f-group"><label for="lp-expected">Price (₹0.00)</label><input id="lp-expected" type="text" inputmode="decimal" autocomplete="off" placeholder="₹0.00" required></div>' +
        '<div class="f-group"><label for="lp-desc">Description</label><textarea id="lp-desc" placeholder="Please describe your product here"></textarea></div>' +
        '<p class="hint" id="lp-msg" style="margin:0 0 8px;"></p>' +
        '<button type="submit" class="app-cta-btn primary" style="width:100%;" id="lp-submit">Post Product (' + pq.totalUsed + '/' + pq.maxTotal + ' used today)</button>' +
        '</form>';
    } else if (partnerRole) {
      var svcList = Array.isArray(servicesList) ? servicesList : [];
      var svcOpts = '<option value="">Select service from list</option>' + svcList.map(function (srv) {
        return '<option value="' + esc(srv) + '">' + esc(srv) + '</option>';
      }).join('');
      var svcLabel = 'Service List' + (partnerCatName ? ' (' + esc(partnerCatName) + ')' : '');
      html =
        '<p style="margin:0 0 12px;font-size:0.82rem;color:#475569;line-height:1.45;">' + esc(hint) + '</p>' +
        '<form id="app-prod-form" novalidate>' +
        '<div class="f-group"><label>Upload Example Image (Required)</label>' +
        '<label class="pick-box" for="lp-img"><span id="lp-img-label">Tap to upload 1 example image (JPG, PNG, WebP)</span><input id="lp-img" type="file" accept="image/jpeg,image/png,image/webp" hidden><img id="lp-preview" alt="" hidden></label></div>' +
        '<div class="f-group"><label for="lp-title">Product Name</label><input id="lp-title" type="text" required maxlength="160" placeholder="Enter product or service name"></div>' +
        '<div class="f-group"><label for="lp-service">' + svcLabel + '</label><select id="lp-service" required>' + svcOpts + '</select></div>' +
        '<div class="f-group"><label for="lp-expected">Price (₹0.00)</label><input id="lp-expected" type="text" inputmode="decimal" autocomplete="off" placeholder="₹0.00" required></div>' +
        '<div class="f-group"><label for="lp-desc">Description</label><textarea id="lp-desc" placeholder="Please describe your product/service here"></textarea></div>' +
        '<p class="hint" id="lp-msg" style="margin:0 0 8px;"></p>' +
        '<button type="submit" class="app-cta-btn primary" style="width:100%;" id="lp-submit">Post Product (' + pq.totalUsed + '/' + pq.maxTotal + ' used today)</button>' +
        '</form>';
    } else {
      var catOpts = '<option value="">Select category (required)</option>' + cats.map(function (c) {
        return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>';
      }).join('');
      var unitOpts = units.map(function (m) {
        return '<option value="' + esc(m.code) + '">' + esc(m.name) + '</option>';
      }).join('');
      var matHtml = isArchitect
        ? '<div class="mat-toggle locked"><label for="lp-with-mat">Pay as you go</label><input id="lp-with-mat" type="checkbox" checked disabled style="width:20px;height:20px;accent-color:#15803d;"></div>'
        : '';

      html =
        '<p style="margin:0 0 12px;font-size:0.82rem;color:#475569;line-height:1.45;">' + esc(hint) + '</p>' +
        '<form id="app-prod-form">' +
        '<div class="f-group"><label for="lp-category">Product Category</label><select id="lp-category" required>' + catOpts + '</select></div>' +
        '<div class="f-group"><label for="lp-unit">Measurement Type</label><select id="lp-unit">' + unitOpts + '</select></div>' +
        '<div class="f-group"><label for="lp-title">Product Name</label><input id="lp-title" type="text" required placeholder="Enter product name here"></div>' +
        '<div class="f-group"><label for="lp-rate" id="lp-rate-label">Per Measurement Rate</label><input id="lp-rate" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" required></div>' +
        '<div class="f-group"><label for="lp-expected">Expected Amount (₹0.00)</label><input id="lp-expected" type="text" inputmode="decimal" autocomplete="off" placeholder="₹0.00" required></div>' +
        '<div class="f-group"><label>Product Example Photo</label>' +
        '<label class="pick-box" for="lp-img"><span id="lp-img-label">Tap to choose 1 image (JPG, PNG, WebP)</span><input id="lp-img" type="file" accept="image/jpeg,image/png,image/webp" hidden><img id="lp-preview" alt="" hidden></label></div>' +
        '<div class="f-group"><label for="lp-desc">Description</label><textarea id="lp-desc" placeholder="Please describe your product here"></textarea></div>' +
        matHtml +
        '<p class="hint" id="lp-msg" style="margin:0 0 8px;"></p>' +
        '<button type="submit" class="app-cta-btn primary" style="width:100%;" id="lp-submit">Post Product (' + pq.totalUsed + '/' + pq.maxTotal + ' used today)</button>' +
        '</form>';
    }

    openSheet(heading, html);

    var unitEl = $('lp-unit'), rateLabel = $('lp-rate-label'), rateEl = $('lp-rate'), expEl = $('lp-expected');
    function syncUnitLabel() {
      if (!unitEl) return;
      var found = units.find(function (m) { return m.code === unitEl.value; }) || units[0];
      if (rateLabel) rateLabel.textContent = 'Per Measurement Rate' + (found ? ' (' + found.code + ')' : '');
    }
    if (unitEl) {
      unitEl.addEventListener('change', syncUnitLabel);
      syncUnitLabel();
    }

    function bindNumeric(id) {
      var el = $(id);
      if (!el) return;
      var clean = function () {
        var v = String(el.value).replace(/[^0-9.]/g, '');
        var dot = v.indexOf('.');
        if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
        if (v !== el.value) el.value = v;
      };
      el.addEventListener('input', clean);
      el.addEventListener('blur', clean);
    }
    bindNumeric('lp-rate');
    bindNumeric('lp-expected');

    if (rateEl) {
      rateEl.addEventListener('input', function () {
        if (!expEl.getAttribute('data-touched')) expEl.value = rateEl.value;
      });
    }
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
      if ((isSupplier || partnerRole) && !file) {
        msg.textContent = partnerRole ? 'Please upload an example image.' : 'Please choose a product image.';
        msg.style.color = '#dc2626';
        return;
      }
      var titleVal = $('lp-title') ? $('lp-title').value.trim() : '';
      if (!titleVal) {
        msg.textContent = 'Please enter product name.';
        msg.style.color = '#dc2626';
        return;
      }
      var selectedService = $('lp-service') ? $('lp-service').value : null;
      if (partnerRole && !selectedService) {
        msg.textContent = 'Please select a service from your category list.';
        msg.style.color = '#dc2626';
        return;
      }
      var priceVal = Number(expEl.value) || (rateEl ? Number(rateEl.value) : 0) || 0;
      if ((partnerRole || isSupplier) && priceVal <= 0) {
        msg.textContent = 'Please enter a valid price.';
        msg.style.color = '#dc2626';
        return;
      }
      var category = isSupplier
        ? ((state.user && state.user.category_name) || 'Supplier Product')
        : partnerRole
          ? (partnerCatName || (state.user && state.user.category_name) || 'Partner Service')
          : ($('lp-category') ? $('lp-category').value : '');
      if (!category) {
        msg.textContent = 'Please select a product category.';
        msg.style.color = '#dc2626';
        return;
      }
      btn.disabled = true; btn.textContent = 'Posting product...'; msg.textContent = '';

      var prodKind = isArchitect ? 'architect_post' : isSupplier ? 'supplier_product' : 'product';
      var up = file ? uploadFile(prodKind, file) : Promise.resolve('https://interagood.in/assets/logo-square.png');
      up.then(function (imgUrl) {
        var payload = {
          title: titleVal,
          category: category,
          sub_category: selectedService || null,
          description: $('lp-desc').value.trim(),
          unit: unitEl ? unitEl.value : 'pcs',
          rate_per_unit: rateEl ? (Number(rateEl.value) || 0) : priceVal,
          quantity: 1,
          expected_amount: priceVal,
          with_material: false,
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
        }).then(function (res) {
          if (res && res.data) state.products.unshift(res.data);
          if (res && res.quota && res.quota.samples) state.quota = res.quota;
          return fetchAllData();
        });
      }).then(function () {
        closeSheet();
        render();
        showToast('Product posted to Product Table!', false);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Post Product (' + pq.totalUsed + '/' + pq.maxTotal + ' used today)';
        msg.textContent = err.message; msg.style.color = '#dc2626';
      });
    });
  }

  function openUploadSampleSheet() {
    var sq = state.quota.samples || { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: SAMPLE_LIMITS.total, maxImages: SAMPLE_LIMITS.image, maxVideos: SAMPLE_LIMITS.video };
    if (sq.totalUsed >= sq.maxTotal) {
      showToast('Daily sample limit reached: max ' + sq.maxTotal + ' samples today.', true);
      return;
    }
    var noVideo = sq.maxVideos === 0;
    var limitText = noVideo
      ? 'Daily Sample Limit: <strong>' + sq.totalUsed + '/' + sq.maxTotal + '</strong> used · Images <strong>' + sq.imagesUsed + '/' + sq.maxImages + '</strong>'
      : 'Daily Sample Limit: <strong>' + sq.totalUsed + '/' + sq.maxTotal + '</strong> used · Images <strong>' + sq.imagesUsed + '/' + sq.maxImages + '</strong> · Videos <strong>' + sq.videosUsed + '/' + sq.maxVideos + '</strong>';
    var mediaLabel = noVideo ? 'Pick Sample Image' : 'Pick Sample Image or Video';
    var mediaHint = noVideo ? 'Tap to pick Image (JPG/PNG/WebP)' : 'Tap to pick Image (JPG/PNG/WebP) or Video (MP4/MOV)';
    var mediaAccept = noVideo ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

    var html =
      '<p style="margin:0 0 12px;font-size:0.82rem;color:#475569;">' + limitText + '</p>' +
      '<form id="app-sample-form">' +
      '<div class="f-group"><label>' + mediaLabel + '</label>' +
      '<label class="pick-box" for="us-media"><span id="us-media-label">' + mediaHint + '</span><input id="us-media" type="file" accept="' + mediaAccept + '" required hidden><img id="us-img-prev" alt="" hidden><video id="us-vid-prev" controls hidden></video></label></div>' +
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
      if (noVideo && isVid) { msg.textContent = 'Images only (no video) for this role.'; msg.style.color = '#dc2626'; return; }
      if (!isVid && sq.imagesUsed >= sq.maxImages) { msg.textContent = 'Daily image sample limit (' + sq.imagesUsed + '/' + sq.maxImages + ') reached.'; msg.style.color = '#dc2626'; return; }
      if (isVid && sq.videosUsed >= sq.maxVideos) { msg.textContent = 'Daily video sample limit (' + sq.videosUsed + '/' + sq.maxVideos + ') reached.'; msg.style.color = '#dc2626'; return; }

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
        }).then(function (res) {
          if (res && res.data) state.samples.unshift(res.data);
          if (res && res.quota && res.quota.samples) state.quota = res.quota;
          return fetchAllData();
        });
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
    var isPaymentDue = (session.payment_status !== 'paid') ||
      (u.payment_status && u.payment_status !== 'paid') ||
      (u.next_due_at && !isNaN(new Date(u.next_due_at)) && new Date(u.next_due_at).getTime() <= Date.now());

    var sq = state.quota.samples || { totalUsed: 0, imagesUsed: 0, videosUsed: 0, maxTotal: SAMPLE_LIMITS.total, maxImages: SAMPLE_LIMITS.image, maxVideos: SAMPLE_LIMITS.video };
    var pq = state.quota.products || { totalUsed: 0, maxTotal: 4 };
    var sRem = Math.max(0, sq.maxTotal - sq.totalUsed);
    var pRem = Math.max(0, pq.maxTotal - pq.totalUsed);
    var sPct = Math.min(100, Math.round((sq.totalUsed / sq.maxTotal) * 100));
    var pPct = Math.min(100, Math.round((pq.totalUsed / pq.maxTotal) * 100));
    var productHeading = PRODUCT_HEADING[role] || 'Your Products';
    var sampleHeading = SAMPLE_HEADING[role] || 'Your Samples';

    // Billing card button depends strictly on payment status, NOT manual Online/Offline toggle
    var activeBillHtml = isPaymentDue
      ? '<button type="button" class="bill-action-btn is-pay-live" id="bill-state-btn">Pay &amp; Live</button>'
      : '<button type="button" class="bill-action-btn is-active" id="bill-state-btn">● Active</button>';

    var billHeading = isPaymentDue
      ? 'Payment Required'
      : ('Profile Active' + (state.isOnline ? '' : ' · Paused (Offline)'));

    var html =
      // Billing Card
      '<section class="bill-card" aria-label="Billing Card">' +
      '<div class="bill-info">' +
      '<div class="bill-title-row"><span>Profile Billing</span><span>·</span><span>₹' + (PLAN_FEES[role] || 109) + '/month</span></div>' +
      '<div class="bill-status-main">' + esc(billHeading) + '</div>' +
      '<div class="bill-next-date">Next billing date: ' + esc(nextStr) + '</div>' +
      '</div>' +
      activeBillHtml +
      '</section>' +

      // Product & Sample Daily Countdown
      '<section class="limit-grid" aria-label="Daily Upload Limits">' +
      '<div class="limit-card">' +
      '<div class="limit-top"><span class="limit-title">Sample Countdown (Daily Limit ' + sq.maxTotal + ')</span><span class="limit-count">' + sRem + ' left</span></div>' +
      '<div class="quota-bar"><div class="quota-fill ' + (sq.totalUsed >= sq.maxTotal ? 'full' : '') + '" style="width:' + sPct + '%"></div></div>' +
      '<div class="limit-sub">' + sq.totalUsed + '/' + sq.maxTotal + ' used · Images ' + sq.imagesUsed + '/' + sq.maxImages + (sq.maxVideos > 0 ? ' · Videos ' + sq.videosUsed + '/' + sq.maxVideos : ' (Images only)') + '</div>' +
      '</div>' +
      '<div class="limit-card">' +
      '<div class="limit-top"><span class="limit-title">Product Daily Limit (4 Only)</span><span class="limit-count">' + pRem + ' left</span></div>' +
      '<div class="quota-bar"><div class="quota-fill ' + (pq.totalUsed >= 4 ? 'full' : '') + '" style="width:' + pPct + '%"></div></div>' +
      '<div class="limit-sub">' + pq.totalUsed + '/4 products listed today</div>' +
      '</div>' +
      '</section>' +

      // Action Buttons (List Product + Upload Samples)
      '<div class="cta-pair">' +
      '<button type="button" class="app-cta-btn primary" id="btn-list-product">+ List Product</button>' +
      '<button type="button" class="app-cta-btn secondary" id="btn-upload-sample">+ Upload Samples</button>' +
      '</div>';

    // Listed Products Feed
    html += '<section class="app-section"><div class="app-sec-head"><h2>' + esc(productHeading) + '</h2><span class="app-sec-meta">' + state.products.length + ' listed</span></div>';
    if (!state.products.length) {
      html += '<div class="app-empty">No products listed yet. Tap <strong>+ List Product</strong> above to post your first item.</div>';
    } else {
      html += '<div class="app-items-grid">';
      state.products.forEach(function (p) {
        var amt = Number(p.expected_amount || p.total_amount || p.rate_per_unit || 0);
        var rate = Number(p.rate_per_unit || 0);
        var desc = p.description ? String(p.description) : '';
        var isSupOrPartner = role === 'supplier' || role === 'partner';
        var displayPrice = isSupOrPartner ? (amt || rate) : rate;
        html += '<article class="app-item-card">' +
          '<div class="app-item-media"><img src="' + esc(p.image_url || 'assets/logo-square.png') + '" alt="' + esc(p.title) + '" onerror="this.src=\'assets/logo-square.png\'"></div>' +
          '<div class="app-item-body">' +
          '<div class="app-item-head"><h3 class="app-item-title">' + esc(p.title) + '</h3>' + (isSupOrPartner ? '' : '<span class="app-item-measure">' + esc(p.unit || 'sqfit') + '</span>') + '</div>' +
          (role === 'partner' && p.sub_category ? '<div class="app-item-expected" style="color:#0b1f3a;">' + esc(p.sub_category) + '</div>' : '') +
          '<div class="app-item-pricebox">₹' + displayPrice.toLocaleString('en-IN') + '</div>' +
          (!isSupOrPartner && amt > 0 && amt !== rate ? '<div class="app-item-expected">Expected ₹' + amt.toLocaleString('en-IN') + '</div>' : '') +
          (desc ? '<div class="app-item-desc clamp">' + esc(desc) + '</div>' + (desc.length > 70 ? '<button type="button" class="app-item-more" data-more>more</button>' : '') : '') +
          '<div class="app-item-foot"><button type="button" class="item-del-btn" data-del-prod="' + esc(p.id) + '">Delete</button></div>' +
          '</div></article>';
      });
      html += '</div>';
    }
    html += '</section>';

    // Uploaded Samples Feed
    html += '<section class="app-section"><div class="app-sec-head"><h2>' + esc(sampleHeading) + '</h2><span class="app-sec-meta">' + state.samples.length + ' uploaded</span></div>';
    if (!state.samples.length) {
      html += '<div class="app-empty">No samples uploaded yet. Tap <strong>+ Upload Samples</strong> above to add work photos.</div>';
    } else {
      html += '<div class="app-items-grid">';
      state.samples.forEach(function (s) {
        var media = s.media_type === 'video'
          ? '<video src="' + esc(s.media_url) + '" controls preload="metadata"></video>'
          : '<img src="' + esc(s.media_url || 'assets/logo-square.png') + '" alt="' + esc(s.title) + '" onerror="this.src=\'assets/logo-square.png\'">';
        var cap = s.caption ? String(s.caption) : '';
        html += '<article class="app-item-card">' +
          '<div class="app-item-media">' + media + '</div>' +
          '<div class="app-item-body">' +
          '<div class="app-item-head"><h3 class="app-item-title">' + esc(s.title) + '</h3></div>' +
          (cap ? '<div class="app-item-desc clamp">' + esc(cap) + '</div>' + (cap.length > 70 ? '<button type="button" class="app-item-more" data-more>more</button>' : '') : '') +
          '<div class="app-item-foot"><button type="button" class="item-del-btn" data-del-sample="' + esc(s.id) + '">Delete</button></div>' +
          '</div></article>';
      });
      html += '</div>';
    }
    html += '</section>';

    $('app-content').innerHTML = html;

    $('bill-state-btn').addEventListener('click', function () {
      if (isPaymentDue) triggerPayAndLive();
      else showToast(state.isOnline ? 'Subscription Active & Online!' : 'Subscription Active (Availability paused Offline by you).', false);
    });
    if ($('btn-list-product')) $('btn-list-product').addEventListener('click', openListProductSheet);
    $('btn-upload-sample').addEventListener('click', openUploadSampleSheet);

    Array.prototype.forEach.call(document.querySelectorAll('[data-more]'), function (btn) {
      btn.addEventListener('click', function () {
        var desc = btn.previousElementSibling;
        if (!desc) return;
        var clamped = desc.classList.toggle('clamp');
        btn.textContent = clamped ? 'more' : 'less';
      });
    });

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
    updateOrderTabBadge();
    var pendingCount = state.orders.filter(function (o) { return o.status === 'pending'; }).length;
    var progCount = state.orders.filter(function (o) { return o.status === 'in_progress'; }).length;
    var compCount = state.orders.filter(function (o) { return o.status === 'completed'; }).length;
    var list = state.orders.filter(function (o) { return o.status === state.orderFilter; });
    var MODE_TXT = { new: 'New', repair: 'Repairing', full_interior: 'Full interior' };
    var STATUS_BADGE = { pending: 'Awaiting Acceptance', in_progress: 'Accepted', completed: 'Completed' };

    var html = '<section class="app-section">' +
      '<div class="app-sec-head"><h2>Assigned Orders</h2><span class="app-sec-meta">' + state.orders.length + ' total</span></div>' +
      '<div class="order-segs" role="tablist">' +
      '<button type="button" class="order-seg-btn ' + (state.orderFilter === 'pending' ? 'active' : '') + '" data-ord-flt="pending">Pending (' + pendingCount + ')</button>' +
      '<button type="button" class="order-seg-btn ' + (state.orderFilter === 'in_progress' ? 'active' : '') + '" data-ord-flt="in_progress">Accepted (' + progCount + ')</button>' +
      '<button type="button" class="order-seg-btn ' + (state.orderFilter === 'completed' ? 'active' : '') + '" data-ord-flt="completed">Complete (' + compCount + ')</button>' +
      '</div>';

    if (!list.length) {
      var emptyLabel = state.orderFilter === 'in_progress' ? 'accepted' : state.orderFilter.replace('_', ' ');
      html += '<div class="app-empty">No ' + esc(emptyLabel) + ' orders right now. Keep your <strong>Online</strong> toggle active to receive Admin assignments.</div>';
    } else {
      list.forEach(function (o) {
        var units = Array.isArray(o.units) ? o.units : [];
        var hasCoords = o.latitude != null && o.longitude != null && !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude));
        var mapHtml = hasCoords
          ? ' <a href="https://www.google.com/maps?q=' + encodeURIComponent(Number(o.latitude) + ',' + Number(o.longitude)) + '" target="_blank" rel="noopener noreferrer">(Open Map)</a>'
          : '';
        var phoneHtml = o.client_phone
          ? '<div class="order-read-line"><span>Client Phone</span><a href="tel:+91' + esc(String(o.client_phone).replace(/[^0-9+]/g, '')) + '">+91 ' + esc(o.client_phone) + '</a></div>'
          : '';
        var unitsHtml = units.length
          ? '<div class="order-unit-list">' + units.map(function (u) {
              var m = MODE_TXT[u.requirement_type] || u.requirement_type || 'New';
              return '<span class="order-unit-chip">' + esc(u.work_unit || u.work_type || 'Unit') + ' · ' + esc(u.work_type || '') + ' (' + esc(m) + ')</span>';
            }).join('') + '</div>'
          : '';

        html += '<div class="order-row">' +
          '<div class="order-row-top">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
          '<strong>' + (o.order_no ? 'Order #' + esc(o.order_no) : esc(o.work_type || 'Project')) + '</strong>' +
          (o.is_combo ? '<span class="order-combo-badge">COMBO BUNDLE</span>' : '') +
          '</div>' +
          '<span class="order-status-pill ' + esc(o.status) + '">' + esc(STATUS_BADGE[o.status] || o.status) + '</span>' +
          '</div>' +
          '<div class="order-read-box">' +
          '<div class="order-read-line"><span>Client</span><strong>' + esc(o.client_name || 'Interagood Client') + '</strong></div>' +
          '<div class="order-read-line"><span>Site Address</span><strong>' + esc(o.location_name || 'Client Site') + '</strong>' + mapHtml + '</div>' +
          phoneHtml +
          '<div class="order-read-line"><span>Work</span><strong>' + esc(o.work_type || 'Interior Work') + '</strong></div>' +
          unitsHtml +
          '</div>' +
          '<div class="order-actions">' +
          (o.status === 'pending'
            ? '<button type="button" class="order-act-btn order-accept-btn" data-ord-id="' + esc(o.id) + '" data-ord-next="in_progress">Accept Order</button>'
            : '') +
          (o.status === 'in_progress'
            ? '<button type="button" class="order-act-btn primary" data-ord-id="' + esc(o.id) + '" data-ord-next="completed">Mark Complete</button>'
            : '') +
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
        var origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = next === 'in_progress' ? 'Accepting...' : 'Updating...';
        api('/users/' + session.uuid + '/orders/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next })
        }).then(function () {
          state.orders.forEach(function (o) {
            if (o.id === id) {
              o.status = next;
              if (next === 'in_progress' || next === 'completed') o.accepted = true;
            }
          });
          if (next === 'in_progress') state.orderFilter = 'in_progress';
          updateOrderTabBadge();
          renderOrders();
          showToast(next === 'in_progress' ? 'Order accepted! Client can now see your business details.' : 'Order marked completed!', false);
          return fetchAllData().then(function () {
            if (state.activeTab === 'orders') renderOrders();
          });
        }).catch(function (err) {
          btn.disabled = false;
          btn.textContent = origText;
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
    var skillMap = { new: 'New', intermediate: 'Intermediate', experienced: 'Experienced' };
    var skillText = skillMap[String(u.skill_level || '').toLowerCase()] || 'Intermediate';
    var teamText = u.has_team
      ? ('Team' + (u.team_members_count ? ' · ' + u.team_members_count + ' members' : ''))
      : 'Solo';
    var expText = (u.experience_years === 0 || u.experience_years) ? (u.experience_years + (Number(u.experience_years) === 1 ? ' year' : ' years')) : '-';
    var coursesText = u.education || u.courses_completed || '-';
    var designText = u.design_software || '-';

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
      '<h3 class="bc-name"><span>' + esc(bName) + '</span></h3>' +
      '<p class="bc-user"><span>@' + esc(uName) + '</span>' +
      '<svg class="bc-tick" viewBox="0 0 24 24" aria-label="Verified Blue Tick"><path fill="#1d9bf0" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/><path d="M8.5 12.5l2.3 2.3 4.9-5.1" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></p>' +
      '</div>' +
      '</div></div>' +
      '<dl class="bc-details">' +
      (role === 'architect'
        ? '<div><dt>IG ID</dt><dd>' + esc(igId) + '</dd></div>' +
          '<div><dt>Role</dt><dd>' + esc(roleText) + ' <span class="bc-verified">✓ verified</span></dd></div>' +
          '<div><dt>Level</dt><dd>' + esc(skillText) + '</dd></div>' +
          '<div><dt>Experience</dt><dd>' + esc(expText) + '</dd></div>' +
          '<div><dt>Courses</dt><dd>' + esc(coursesText) + '</dd></div>' +
          '<div><dt>Design</dt><dd>' + esc(designText) + '</dd></div>' +
          '<div><dt>Address</dt><dd>' + esc(addr) + '</dd></div>'
        : '<div><dt>Address</dt><dd>' + esc(addr) + '</dd></div>' +
          (role === 'partner' ? '<div><dt>Skill Level</dt><dd>' + esc(skillText) + '</dd></div>' + '<div><dt>Team</dt><dd>' + esc(teamText) + '</dd></div>' : '') +
          '<div><dt>Role</dt><dd>' + esc(roleText) + ' <span class="bc-verified">✓ verified</span></dd></div>' +
          '<div><dt>Category</dt><dd>' + esc(u.category_name || roleText) + '</dd></div>' +
          '<div><dt>IG ID</dt><dd>' + esc(igId) + '</dd></div>') +
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
