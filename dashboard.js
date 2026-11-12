(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var $ = function (id) { return document.getElementById(id); };
  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20"/>',
    orders: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
    cart: '<path d="M3 4h2.5l2.2 11h10.1l2-8H6.4"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    products: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
    earnings: '<path d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 4-5.5 6.5-5.5s5.7 2 6.5 5.5M17 11a3 3 0 100-6M15.5 20c.4-2.5 2-4 4-4"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  };

  // ---- session ----
  var session = null;
  try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (e) { session = null; }
  if (!session || !session.accessToken || !session.uuid) {
    location.replace('partner-program.html#login');
    return;
  }

  var role = session.role || 'client';
  var pages = {};

  function api(path, options) {
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

  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>'; }

  // ---- common top bar: address, payment, billing, quota, online toggle ----
  function populateTopbar() {
    var bar = $('db-topbar');
    if (!bar) return;
    bar.hidden = false;
    api('/users/' + session.uuid).then(function (d) {
      var u = (d && d.data) || {};
      var p = u.profile || u || {};
      var addr = [p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ') || '-';
      $('tb-address').textContent = addr;
      $('tb-payment').textContent = p.payment_status ? (p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)) : 'Unpaid';
      $('tb-billing').textContent = p.next_due_at ? new Date(p.next_due_at).toLocaleDateString() : '-';
      if (role === 'supplier' || role === 'partner') {
        var quotaItem = $('tb-quota-item');
        if (quotaItem) quotaItem.hidden = false;
        var used = p.daily_upload_count || 0;
        $('tb-quota-used').textContent = used;
        $('tb-quota-max').textContent = role === 'supplier' ? '4' : '4';
      }
      // Online is allowed only while the monthly payment is active (paid and not past due)
      var active = p.payment_status === 'paid' && (!p.next_due_at || new Date(p.next_due_at).getTime() > Date.now());
      setOnlineToggle(active && !!p.is_online, active);
    }).catch(function () { /* ignore */ });

    // actions
    var actions = $('db-actions');
    if (actions) actions.hidden = false;
    var sampleBtn = $('db-action-sample');
    if (sampleBtn) {
      sampleBtn.hidden = !(role === 'supplier' || role === 'partner' || role === 'architect');
      sampleBtn.addEventListener('click', function () { showPage(role === 'architect' ? 'posts' : 'products'); });
    }
    var ordersBtn = $('db-action-orders');
    if (ordersBtn) ordersBtn.addEventListener('click', function () { showPage('orders'); });
  }

  function setOnlineToggle(on, canGoOnline) {
    var btn = $('tb-online');
    var lbl = $('tb-online-label');
    if (!btn) return;
    var allowed = canGoOnline !== false;
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.classList.toggle('on', on);
    btn.classList.toggle('locked', !allowed);
    if (lbl) lbl.textContent = allowed ? (on ? 'Online' : 'Offline') : 'Pay to go online';
    btn.onclick = function () {
      if (!allowed) { alert('Your payment is not active. Please pay to go online.'); return; }
      var want = btn.getAttribute('aria-checked') !== 'true';
      api('/users/' + session.uuid + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_online: want }) })
        .then(function () { setOnlineToggle(want, true); })
        .catch(function () { /* keep old state */ });
    };
  }

  // ---- nav items per role ----
  var NAV = {
    client: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'orders', label: 'My Orders', icon: 'orders' },
      { id: 'carts', label: 'My Carts', icon: 'cart' },
      { id: 'profile', label: 'Profile', icon: 'profile' },
    ],
    partner: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'orders', label: 'Assigned Orders', icon: 'orders' },
      { id: 'samples', label: 'My Samples', icon: 'products' },
      { id: 'profile', label: 'Profile', icon: 'profile' },
    ],
    supplier: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'products', label: 'My Products', icon: 'products' },
      { id: 'orders', label: 'Material Orders', icon: 'orders' },
      { id: 'profile', label: 'Profile', icon: 'profile' },
    ],
    architect: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'posts', label: 'My Posts', icon: 'products' },
      { id: 'orders', label: 'Project Orders', icon: 'orders' },
      { id: 'profile', label: 'Profile', icon: 'profile' },
    ],
    admin: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'orders', label: 'All Orders', icon: 'orders' },
      { id: 'users', label: 'Users', icon: 'users' },
      { id: 'carts', label: 'Live Carts', icon: 'cart' },
      { id: 'stats', label: 'Statistics', icon: 'stats' },
    ],
  };

  // ---- render nav ----
  function renderNav() {
    var items = NAV[role] || NAV.client;
    var nav = $('db-nav');
    nav.innerHTML = items.map(function (it) {
      return '<a data-page="' + it.id + '">' + svg(it.icon) + '<span>' + it.label + '</span></a>';
    }).join('');
    nav.addEventListener('click', function (e) {
      var link = e.target.closest('[data-page]');
      if (!link) return;
      Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { a.classList.remove('active'); });
      link.classList.add('active');
      showPage(link.getAttribute('data-page'));
    });
    // default
    nav.querySelector('[data-page="overview"]').classList.add('active');
  }

  // ---- pages ----
  pages.overview = function () {
    $('db-page-title').textContent = 'Overview';
    $('db-page-sub').textContent = 'Here is a quick summary of your activity.';
    var welcome = 'Welcome back' + (session.username ? ', ' + session.username : '') + '!';
    var html = '<div class="db-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">';
    if (role === 'client') {
      html += statCard('#fff3e0', '#e65100', 'cart', '0', 'Active Carts');
      html += statCard('#e3f2fd', '#1565c0', 'orders', '0', 'Orders Placed');
    } else if (role === 'partner') {
      html += statCard('#fff3e0', '#e65100', 'orders', '0', 'New Orders');
      html += statCard('#e8f5e9', '#2e7d32', 'earnings', '0', 'This Month');
    } else if (role === 'supplier') {
      html += statCard('#fff3e0', '#e65100', 'products', '0', 'Products');
      html += statCard('#e8f5e9', '#2e7d32', 'orders', '0', 'Orders');
    } else if (role === 'admin') {
      html += statCard('#fff3e0', '#e65100', 'users', '0', 'Total Users');
      html += statCard('#e3f2fd', '#1565c0', 'orders', '0', 'Active Orders');
      html += statCard('#e8f5e9', '#2e7d32', 'cart', '0', 'Live Carts');
    }
    html += '</div>';
    html += '<div class="db-section-title">Getting Started</div>';
    html += '<div class="db-card"><p>Welcome to your Interagood control panel. Use the menu on the left to navigate. Your profile is set up and ready to go.</p></div>';
    $('db-content').innerHTML = html;
  };

  function statCard(bg, color, icon, value, label) {
    return '<div class="db-card db-stat"><div class="db-stat-ic" style="background:' + bg + ';color:' + color + '">' + svg(icon) + '</div><div><h3>' + value + '</h3><span>' + label + '</span></div></div>';
  }

  pages.orders = function () {
    $('db-page-title').textContent = role === 'admin' ? 'All Orders' : (role === 'partner' ? 'Assigned Orders' : (role === 'supplier' ? 'Material Orders' : 'My Orders'));
    $('db-page-sub').textContent = 'Track and manage your orders.';
    $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">No orders yet. Orders will appear here once placed.</div></div>';
  };

  pages.carts = function () {
    $('db-page-title').textContent = 'My Carts';
    $('db-page-sub').textContent = 'Your saved carts and items.';
    $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">No carts yet. Browse services and add items to your cart.</div></div>';
  };

  // ---- supplier: product listing engine with dynamic calculation ----
  var UNITS = ['sqfit', 'runningfit', 'inch', 'pcs', 'bundle', 'combo', 'fit'];
  var UNIT_LABELS = { sqfit: 'Square Feet', runningfit: 'Running Feet', inch: 'Inches', pcs: 'Pieces', bundle: 'Bundle', combo: 'Combo', fit: 'Fit' };
  function calcForm() {
    return '<div class="db-card">' +
      '<h3 style="margin:0 0 14px;color:#0b1f3a">Create a listing</h3>' +
      '<div class="db-form">' +
      '<div class="db-field"><label>Product name</label><input id="p-name" type="text" placeholder="e.g. Modular Kitchen" maxlength="80"></div>' +
      '<div class="db-row">' +
      '<div class="db-field"><label>Measurement type</label><select id="p-unit">' + UNITS.map(function (u) { return '<option value="' + u + '">' + UNIT_LABELS[u] + '</option>'; }).join('') + '</select></div>' +
      '<div class="db-field"><label>Rate per unit (&#8377;)</label><input id="p-rate" type="number" min="0" step="0.01" placeholder="0"></div>' +
      '<div class="db-field"><label>Quantity</label><input id="p-qty" type="number" min="0" step="1" value="1"></div>' +
      '</div>' +
      '<div class="db-total">Total: <strong id="p-total">&#8377;0</strong> <span id="p-formula"></span></div>' +
      '<button type="button" class="btn btn-primary" id="p-post">Post</button>' +
      '</div>' +
      '</div>';
  }
  function wireCalc(root) {
    function recalc() {
      var rate = parseFloat(($('p-rate') || {}).value || '0') || 0;
      var qty = parseFloat(($('p-qty') || {}).value || '1') || 0;
      var unit = ($('p-unit') || {}).value || 'sqfit';
      var total = rate * qty;
      var el = $('p-total'); if (el) el.textContent = '\u20B9' + total.toLocaleString();
      var f = $('p-formula'); if (f) f.textContent = ' = \u20B9' + rate + ' x ' + qty + ' ' + UNIT_LABELS[unit];
    }
    ['p-rate', 'p-qty', 'p-unit'].forEach(function (id) {
      var n = $(id); if (n) n.addEventListener('input', recalc);
    });
    recalc();
  }
  function productCards(items) {
    if (!items.length) return '<div class="db-card"><div class="db-empty">No listings yet. Add your first product above.</div></div>';
    return '<div class="db-section-title">Your listings</div><div class="db-prod-grid">' + items.map(function (it) {
      return '<article class="db-prod-card" data-id="' + it.id + '">' +
        '<div class="db-prod-img"><img src="' + (it.img || '') + '" alt="" onerror="this.style.display=\'none\'"></div>' +
        '<div class="db-prod-body"><h4>' + it.name + '</h4>' +
        '<p class="db-prod-meta">' + UNIT_LABELS[it.unit] + ' &#183; \u20B9' + it.rate + ' / unit</p>' +
        '<p class="db-prod-price">\u20B9' + (it.rate * it.qty).toLocaleString() + '</p></div>' +
        '</article>';
    }).join('') + '</div>';
  }
  function getStore(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } }
  function setStore(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  pages.products = function () {
    $('db-page-title').textContent = 'My Products';
    $('db-page-sub').textContent = 'Create product listings and manage your catalog.';
    var items = getStore('ig_products');
    $('db-content').innerHTML = calcForm() + productCards(items);
    wireCalc();
    function onPost() {
      var name = ($('p-name') || {}).value || '';
      if (name.trim().length < 2) { $('p-name').focus(); return; }
      items.push({ id: Date.now(), name: name.trim(), unit: $('p-unit').value, rate: parseFloat($('p-rate').value || '0') || 0, qty: parseFloat($('p-qty').value || '1') || 1, img: '' });
      setStore('ig_products', items);
      $('db-content').innerHTML = calcForm() + productCards(items);
      wireCalc();
      $('p-post').addEventListener('click', onPost);
    }
    $('p-post').addEventListener('click', onPost);
  };

  // ---- architect: post creation with calculation engine + "with material" tag ----
  pages.posts = function () {
    $('db-page-title').textContent = 'My Posts';
    $('db-page-sub').textContent = 'Create posts with measurement and calculation.';
    var items = getStore('ig_posts');
    var html = '<div class="db-card">' +
      '<h3 style="margin:0 0 14px;color:#0b1f3a">Create a post</h3>' +
      '<div class="db-form">' +
      '<div class="db-field"><label>Category</label><select id="a-cat"><option>Kitchen</option><option>Wardrobe</option><option>Bedroom</option><option>Living Room</option><option>Office</option></select></div>' +
      '<div class="db-field"><label>Description</label><textarea id="a-desc" maxlength="300" placeholder="Describe the work..."></textarea></div>' +
      '<div class="db-row">' +
      '<div class="db-field"><label>Measurement type</label><select id="p-unit">' + UNITS.map(function (u) { return '<option value="' + u + '">' + UNIT_LABELS[u] + '</option>'; }).join('') + '</select></div>' +
      '<div class="db-field"><label>Rate per unit (&#8377;)</label><input id="p-rate" type="number" min="0" step="0.01" placeholder="0"></div>' +
      '<div class="db-field"><label>Quantity</label><input id="p-qty" type="number" min="0" step="1" value="1"></div>' +
      '</div>' +
      '<div class="db-total">Total: <strong id="p-total">&#8377;0</strong> <span id="p-formula"></span> <span class="with-material">with material</span></div>' +
      '<button type="button" class="btn btn-primary" id="p-post">Post</button>' +
      '</div></div>';
    var cards = items.length ? '<div class="db-section-title">Your posts</div><div class="db-prod-grid">' + items.map(function (it) {
      return '<article class="db-prod-card"><div class="db-prod-body"><h4>' + it.cat + '</h4><p>' + it.desc + '</p><p class="db-prod-meta">' + UNIT_LABELS[it.unit] + ' &#183; \u20B9' + it.rate + '</p><p class="db-prod-price">\u20B9' + (it.rate * it.qty).toLocaleString() + '</p><span class="with-material">with material</span></div></article>';
    }).join('') + '</div>' : '<div class="db-card"><div class="db-empty">No posts yet.</div></div>';
    $('db-content').innerHTML = html + cards;
    wireCalc();
    $('p-post').addEventListener('click', function () {
      items.push({ id: Date.now(), cat: $('a-cat').value, desc: $('a-desc').value || '', unit: $('p-unit').value, rate: parseFloat($('p-rate').value || '0') || 0, qty: parseFloat($('p-qty').value || '1') || 1 });
      setStore('ig_posts', items);
      location.reload();
    });
  };

  // ---- partner: private sample uploads (admin only) ----
  pages.samples = function () {
    $('db-page-title').textContent = 'My Samples';
    $('db-page-sub').textContent = 'Upload work samples for admin evaluation. These are never shown to clients.';
    $('db-content').innerHTML = '<div class="db-card"><p>Partners upload sample images solely for admin evaluation. They are private and never displayed to clients.</p></div>';
  };

  pages.earnings = function () {
    $('db-page-title').textContent = 'Earnings';
    $('db-page-sub').textContent = 'Your earnings and payment history.';
    $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">No earnings yet. Complete orders to start earning.</div></div>';
  };

  pages.users = function () {
    $('db-page-title').textContent = 'Users';
    $('db-page-sub').textContent = 'Manage all platform users.';
    $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">User list will appear here.</div></div>';
  };

  pages.stats = function () {
    $('db-page-title').textContent = 'Statistics';
    $('db-page-sub').textContent = 'Platform performance and analytics.';
    $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">Statistics will appear here.</div></div>';
  };

  pages.profile = function () {
    $('db-page-title').textContent = 'Profile';
    $('db-page-sub').textContent = 'Your account details.';
    var AVATAR_PH = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e9eef6"/><circle cx="60" cy="46" r="22" fill="#c3cede"/><path d="M18 120c0-24 19-38 42-38s42 14 42 38z" fill="#c3cede"/></svg>');
    var BANNER_PH = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" preserveAspectRatio="none"><rect width="600" height="200" fill="#0a192f"/></svg>');
    api('/users/' + session.uuid).then(function (d) {
      var u = (d && d.data) || {};
      var p = u.profile || u || {};
      var avatar = p.profile_photo_url || AVATAR_PH;
      var banner = p.banner_url || BANNER_PH;
      var html = '<div class="db-profile-hero">';
      html += '<div class="db-profile-banner"><img src="' + banner + '" alt="" onerror="this.src=\'' + BANNER_PH + '\'"></div>';
      html += '<div class="db-profile-avatar"><img src="' + avatar + '" alt="" onerror="this.src=\'' + AVATAR_PH + '\'"></div>';
      html += '</div>';
      html += '<div class="db-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">';
      html += '<div class="db-card"><h3 style="margin:0 0 12px;color:#0b1f3a">Account</h3>';
      html += '<p><strong>Username:</strong> ' + (u.username || '-') + '</p>';
      html += '<p><strong>Phone:</strong> +91 ' + (u.phone || '-') + '</p>';
      html += '<p><strong>Role:</strong> ' + (role.charAt(0).toUpperCase() + role.slice(1)) + '</p>';
      if (u.ig_id) html += '<p><strong>IG ID:</strong> ' + u.ig_id + '</p>';
      html += '</div>';
      html += '<div class="db-card"><h3 style="margin:0 0 12px;color:#0b1f3a">Profile</h3>';
      html += '<p><strong>Name:</strong> ' + (p.full_name || '-') + '</p>';
      if (p.business_name) html += '<p><strong>Business:</strong> ' + p.business_name + '</p>';
      if (p.address) html += '<p><strong>Address:</strong> ' + p.address + '</p>';
      if (p.city) html += '<p><strong>City:</strong> ' + p.city + (p.state ? ', ' + p.state : '') + '</p>';
      html += '</div>';
      html += '</div>';
      $('db-content').innerHTML = html;
    }).catch(function () {
      $('db-content').innerHTML = '<div class="db-card"><div class="db-empty">Could not load profile. Please refresh.</div></div>';
    });
  };

  function showPage(id) {
    var fn = pages[id];
    if (fn) fn();
  }

  // ---- logout ----
  $('db-logout-btn').addEventListener('click', function () {
    sessionStorage.removeItem('ig_session');
    location.replace('index.html');
  });

  // ---- mobile menu ----
  $('db-menu').addEventListener('click', function () {
    $('db-side').classList.toggle('open');
  });

  // ---- init ----
  $('db-username').textContent = session.username || 'User';
  $('db-role').textContent = (role.charAt(0).toUpperCase() + role.slice(1));
  renderNav();
  populateTopbar();
  showPage('overview');
})();
