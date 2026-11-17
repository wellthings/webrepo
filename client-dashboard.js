(function () {
  'use strict';
  var SITE = window.SITE || {};
  var API = SITE.apiBase || '';
  var CLIENT_KEY = 'ig_client';
  var CART_KEY = 'ig_cart';
  var LOC_KEY = 'ig_loc';

  var MODE_LABEL = { new: 'New', repair: 'Repairing', full_interior: 'Full interior' };
  var ORDER_STATUS = { new: 'Order under process', contacted: 'Partner assigned', closed: 'Completed' };
  var ASSIGN_STATUS = { unassigned: 'Finding partner', assigned: 'Partner assigned', completed: 'Completed', cancelled: 'Cancelled' };
  var TAB_TITLES = { home: 'Overview', orders: 'My Orders', cart: 'Saved Cart', profile: 'My Profile' };

  function readJson(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
  }
  function saveJson(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d)
      ? ''
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }

  var clientSess = readJson(CLIENT_KEY);
  if (!clientSess || !clientSess.token) {
    location.replace('index.html#client-signup');
    return;
  }

  var state = {
    tab: 'home',
    orderFilter: 'all',
    loading: true,
    client: {
      id: clientSess.id || '',
      name: clientSess.name || 'Client',
      phone: clientSess.phone || '',
      location_name: clientSess.location_name || '',
      created_at: clientSess.created_at || ''
    },
    orders: [],
    cart: readJson(CART_KEY) || []
  };

  function apiFetch(path, options) {
    options = options || {};
    options.headers = Object.assign({ Authorization: 'Bearer ' + clientSess.token }, options.headers || {});
    return fetch(API + path, options).then(function (r) {
      if (r.status === 401) {
        try { localStorage.removeItem(CLIENT_KEY); } catch (e) {}
        location.replace('index.html#client-signup');
        throw new Error('Session expired');
      }
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
        return d;
      });
    });
  }

  function showToast(msg, isErr) {
    var old = document.getElementById('cd-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'cd-toast';
    el.setAttribute('role', 'status');
    el.style.cssText =
      'position:fixed;bottom:74px;right:20px;z-index:999;padding:11px 16px;border-radius:10px;font-size:0.86rem;font-weight:700;color:#fff;box-shadow:0 8px 24px rgba(10,25,47,0.22);background:' +
      (isErr ? '#dc2626' : '#0a192f') +
      ';';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 3400);
  }

  function logout() {
    try { localStorage.removeItem(CLIENT_KEY); } catch (e) {}
    location.replace('index.html');
  }

  function normalizeCartItem(it) {
    return {
      cat: it.cat || String(it.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      catName: it.catName || it.category || 'Interior Work',
      module: it.module || it.label || 'Service',
      label: it.label || it.module || 'Service',
      mode: it.mode || 'new',
      img: it.img || ''
    };
  }

  function syncServerCart(list) {
    saveJson(CART_KEY, list);
    return apiFetch('/client/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: list.map(function (i) {
          return { category: i.catName, module: i.label, mode: i.mode };
        })
      })
    }).catch(function () {});
  }

  function fetchDashboardData() {
    return Promise.all([
      apiFetch('/client/me').then(function (d) {
        if (d && d.client) {
          state.client = d.client;
          saveJson(CLIENT_KEY, Object.assign({}, clientSess, d.client));
        }
        if (d && Array.isArray(d.cart_items) && d.cart_items.length && !state.cart.length) {
          state.cart = d.cart_items.map(normalizeCartItem);
          saveJson(CART_KEY, state.cart);
        } else if (state.cart.length) {
          syncServerCart(state.cart);
        }
      }).catch(function () {}),
      apiFetch('/client/orders').then(function (d) {
        state.orders = (d && Array.isArray(d.data)) ? d.data : [];
      }).catch(function () {})
    ]).then(function () {
      state.loading = false;
      updateCounts();
    });
  }

  function updateCounts() {
    var oc = document.getElementById('side-orders-count');
    var cc = document.getElementById('side-cart-count');
    if (oc) oc.textContent = String(state.orders.length);
    if (cc) cc.textContent = String(state.cart.length);
  }

  function renderOrderCardHtml(o) {
    var st = o.status || 'new';
    var items = Array.isArray(o.items) ? o.items : [];
    var assignMap = {};
    (o.order_assignments || []).forEach(function (a) {
      assignMap[a.work_type] = a.status;
    });

    var rowsHtml = items.map(function (it) {
      var workType = it.category || '-';
      var unit = it.module || '-';
      var mode = MODE_LABEL[it.mode] || it.mode || 'New';
      var aSt = assignMap[workType] ? (ASSIGN_STATUS[assignMap[workType]] || assignMap[workType]) : (ORDER_STATUS[st] || 'Order under process');
      return (
        '<tr>' +
        '<td>' + esc(workType) + '</td>' +
        '<td>' + esc(unit) + '</td>' +
        '<td>' + esc(mode) + '</td>' +
        '<td>' + esc(aSt) + '</td>' +
        '</tr>'
      );
    }).join('');

    return (
      '<article class="cd-order-row">' +
      '<div class="cd-order-top">' +
      '<div>' +
      '<div class="cd-order-id">' + (o.order_no ? 'Order #' + esc(o.order_no) : 'Service Request') + '</div>' +
      '<div class="cd-order-meta">' +
      esc(fmtDateTime(o.created_at) || 'Just now') +
      (o.location_name ? ' · ' + esc(o.location_name) : '') +
      '</div>' +
      '</div>' +
      '<span class="cd-status-txt st-' + esc(st) + '">' + esc(ORDER_STATUS[st] || 'Order under process') + '</span>' +
      '</div>' +
      (items.length
        ? '<table class="cd-items-table"><thead><tr><th>Category</th><th>Work Unit</th><th>Type</th><th>Partner Status</th></tr></thead><tbody>' +
          rowsHtml +
          '</tbody></table>'
        : '') +
      '</article>'
    );
  }

  function renderHome() {
    var c = state.client;
    var activeCount = state.orders.filter(function (o) { return o.status !== 'closed'; }).length;
    var recentOrders = state.orders.slice(0, 3);

    var html =
      '<section class="cd-welcome">' +
      '<div>' +
      '<h1>Welcome, ' + esc(c.name || 'Client') + '</h1>' +
      '<div class="cd-meta-line">' +
      (c.phone ? '<span>+91 ' + esc(c.phone) + '</span><span aria-hidden="true">·</span>' : '') +
      '<span>' + esc(c.location_name || 'Location not set') + '</span>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
      '<a class="cd-btn primary" href="index.html#marketplace">Explore Marketplace</a>' +
      '<button type="button" class="cd-btn secondary" id="ov-edit-profile">Edit Address</button>' +
      '</div>' +
      '</section>' +

      '<section class="cd-kpi-grid" aria-label="Account Summary">' +
      '<div class="cd-kpi"><span class="cd-kpi-label">Total Orders</span><strong class="cd-kpi-val">' + state.orders.length + '</strong><span class="cd-kpi-note">Submitted requests</span></div>' +
      '<div class="cd-kpi"><span class="cd-kpi-label">Active Requests</span><strong class="cd-kpi-val">' + activeCount + '</strong><span class="cd-kpi-note">Under process or assigned</span></div>' +
      '<div class="cd-kpi"><span class="cd-kpi-label">Saved Cart</span><strong class="cd-kpi-val">' + state.cart.length + '</strong><span class="cd-kpi-note">Ready for site visit booking</span></div>' +
      '</section>';

    // Recent Orders
    html +=
      '<section class="cd-panel">' +
      '<div class="cd-panel-head">' +
      '<div><h2>Recent Orders</h2><span class="cd-panel-sub">Latest service requests &amp; partner assignment updates</span></div>' +
      (state.orders.length ? '<button type="button" class="cd-btn secondary" id="ov-all-orders">View All Orders</button>' : '') +
      '</div>';
    if (!recentOrders.length) {
      html +=
        '<div class="cd-empty">' +
        '<span>You have not placed any site visit or work order yet.</span>' +
        '<a class="cd-btn primary" href="index.html#services">Browse Services</a>' +
        '</div>';
    } else {
      html += '<div class="cd-list">' + recentOrders.map(renderOrderCardHtml).join('') + '</div>';
    }
    html += '</section>';

    // Saved Cart Quick Preview
    html +=
      '<section class="cd-panel">' +
      '<div class="cd-panel-head">' +
      '<div><h2>Your Saved Cart</h2><span class="cd-panel-sub">' + state.cart.length + (state.cart.length === 1 ? ' item selected' : ' items selected') + '</span></div>' +
      (state.cart.length ? '<button type="button" class="cd-btn navy" id="ov-open-cart">Review &amp; Place Order</button>' : '<a class="cd-btn secondary" href="index.html#marketplace">Add Services</a>') +
      '</div>';
    if (!state.cart.length) {
      html += '<p style="margin:0;color:#64748b;font-size:0.88rem;">Your cart is empty. Add carpenter, electrician, plumbing, or interior work modules from the home page.</p>';
    } else {
      html += '<div class="cd-list">' + state.cart.slice(0, 3).map(function (it) {
        return '<div class="cd-cart-row"><div class="cd-cart-info"><strong>' + esc(it.label) + '</strong><span>' + esc(it.catName) + ' · ' + esc(MODE_LABEL[it.mode] || it.mode) + '</span></div></div>';
      }).join('') + '</div>';
    }
    html += '</section>';

    return html;
  }

  function renderOrders() {
    var counts = {
      all: state.orders.length,
      new: state.orders.filter(function (o) { return o.status === 'new'; }).length,
      contacted: state.orders.filter(function (o) { return o.status === 'contacted'; }).length,
      closed: state.orders.filter(function (o) { return o.status === 'closed'; }).length
    };
    var filtered = state.orderFilter === 'all'
      ? state.orders
      : state.orders.filter(function (o) { return o.status === state.orderFilter; });

    var html =
      '<section class="cd-panel">' +
      '<div class="cd-panel-head">' +
      '<div><h2>My Orders</h2><span class="cd-panel-sub">' + state.orders.length + ' total orders</span></div>' +
      '<div class="cd-segs" role="tablist" aria-label="Filter orders">' +
      '<button type="button" class="cd-seg-btn ' + (state.orderFilter === 'all' ? 'active' : '') + '" data-ord-flt="all">All (' + counts.all + ')</button>' +
      '<button type="button" class="cd-seg-btn ' + (state.orderFilter === 'new' ? 'active' : '') + '" data-ord-flt="new">Under Process (' + counts.new + ')</button>' +
      '<button type="button" class="cd-seg-btn ' + (state.orderFilter === 'contacted' ? 'active' : '') + '" data-ord-flt="contacted">Assigned (' + counts.contacted + ')</button>' +
      '<button type="button" class="cd-seg-btn ' + (state.orderFilter === 'closed' ? 'active' : '') + '" data-ord-flt="closed">Completed (' + counts.closed + ')</button>' +
      '</div>' +
      '</div>';

    if (!filtered.length) {
      html +=
        '<div class="cd-empty">' +
        '<span>No orders match this status yet.</span>' +
        '<a class="cd-btn primary" href="index.html#marketplace">Book Free Site Visit</a>' +
        '</div>';
    } else {
      html += '<div class="cd-list">' + filtered.map(renderOrderCardHtml).join('') + '</div>';
    }
    html += '</section>';
    return html;
  }

  function renderCart() {
    var html =
      '<section class="cd-panel">' +
      '<div class="cd-panel-head">' +
      '<div><h2>Saved Cart &amp; Site Visit Booking</h2><span class="cd-panel-sub">' + state.cart.length + ' items ready</span></div>' +
      '<a class="cd-btn secondary" href="index.html#marketplace">Add More Services</a>' +
      '</div>';

    if (!state.cart.length) {
      html +=
        '<div class="cd-empty">' +
        '<span>Your cart is currently empty. Add work modules or partner samples from the homepage to book a free site visit.</span>' +
        '<a class="cd-btn primary" href="index.html#services">Explore Services</a>' +
        '</div>';
    } else {
      html += '<div class="cd-list">' + state.cart.map(function (it, idx) {
        return (
          '<div class="cd-cart-row">' +
          '<div class="cd-cart-info">' +
          '<strong>' + esc(it.label) + '</strong>' +
          '<span>' + esc(it.catName) + ' · ' + esc(MODE_LABEL[it.mode] || it.mode) + '</span>' +
          '</div>' +
          '<button type="button" class="cd-rm-btn" data-cart-rm="' + idx + '">Remove</button>' +
          '</div>'
        );
      }).join('') + '</div>';

      html +=
        '<form class="cd-form" id="cd-place-order-form" style="margin-top:6px;">' +
        '<div class="cd-field">' +
        '<label for="cd-order-loc">Site Address for Visit</label>' +
        '<input id="cd-order-loc" type="text" required maxlength="200" value="' + esc(state.client.location_name || '') + '" placeholder="House/Flat, Area, City">' +
        '<button type="button" class="cd-link-btn" id="cd-order-gps">Use my current location</button>' +
        '</div>' +
        '<p class="cd-msg" id="cd-order-msg" role="alert"></p>' +
        '<button type="submit" class="cd-btn primary" id="cd-order-submit">Confirm &amp; Place Order</button>' +
        '</form>';
    }
    html += '</section>';
    return html;
  }

  function renderProfile() {
    var c = state.client;
    return (
      '<section class="cd-panel">' +
      '<div class="cd-panel-head">' +
      '<div><h2>My Profile</h2><span class="cd-panel-sub">' + (c.created_at ? 'Member since ' + esc(fmtDate(c.created_at)) : 'Client Account') + '</span></div>' +
      '</div>' +
      '<form class="cd-form" id="cd-profile-form">' +
      '<div class="cd-field"><label for="cp-name">Full Name</label><input id="cp-name" type="text" required minlength="2" maxlength="80" value="' + esc(c.name || '') + '"></div>' +
      '<div class="cd-field"><label for="cp-phone">Registered Mobile Number</label><input id="cp-phone" type="text" readonly value="' + esc(c.phone ? '+91 ' + c.phone : '') + '"></div>' +
      '<div class="cd-field"><label for="cp-loc">Saved Location / Address</label><input id="cp-loc" type="text" required minlength="2" maxlength="200" value="' + esc(c.location_name || '') + '">' +
      '<button type="button" class="cd-link-btn" id="cp-gps">Detect current location</button></div>' +
      '<p class="cd-msg" id="cp-msg" role="alert"></p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
      '<button type="submit" class="cd-btn primary" id="cp-save">Save Changes</button>' +
      '<button type="button" class="cd-logout-btn" id="cp-logout">Log Out</button>' +
      '</div>' +
      '</form>' +
      '</section>'
    );
  }

  function bindHandlers() {
    var ovOrders = document.getElementById('ov-all-orders');
    if (ovOrders) ovOrders.addEventListener('click', function () { setTab('orders'); });
    var ovCart = document.getElementById('ov-open-cart');
    if (ovCart) ovCart.addEventListener('click', function () { setTab('cart'); });
    var ovProf = document.getElementById('ov-edit-profile');
    if (ovProf) ovProf.addEventListener('click', function () { setTab('profile'); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-ord-flt]'), function (btn) {
      btn.addEventListener('click', function () {
        state.orderFilter = btn.getAttribute('data-ord-flt') || 'all';
        render();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-rm]'), function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-cart-rm'));
        if (!isNaN(idx)) {
          state.cart.splice(idx, 1);
          syncServerCart(state.cart);
          updateCounts();
          render();
          showToast('Item removed from cart', false);
        }
      });
    });

    var orderForm = document.getElementById('cd-place-order-form');
    if (orderForm) {
      var orderLocEl = document.getElementById('cd-order-loc');
      var orderGpsBtn = document.getElementById('cd-order-gps');
      var orderMsg = document.getElementById('cd-order-msg');
      var orderBtn = document.getElementById('cd-order-submit');

      if (orderGpsBtn && orderLocEl) {
        orderGpsBtn.addEventListener('click', function () {
          orderGpsBtn.disabled = true;
          orderGpsBtn.textContent = 'Detecting location...';
          document.dispatchEvent(new CustomEvent('ig:location-request'));
        });
        document.addEventListener('ig:location', function (e) {
          if (orderGpsBtn) { orderGpsBtn.disabled = false; orderGpsBtn.textContent = 'Use my current location'; }
          if (e && e.detail && e.detail.address && document.getElementById('cd-order-loc')) {
            document.getElementById('cd-order-loc').value = e.detail.address;
          }
        }, { once: true });
      }

      orderForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var locVal = orderLocEl ? orderLocEl.value.trim() : '';
        if (locVal.length < 2) {
          orderMsg.className = 'cd-msg err';
          orderMsg.textContent = 'Please enter your site address.';
          return;
        }
        var savedLoc = readJson(LOC_KEY) || {};
        var payload = {
          location_name: locVal,
          items: state.cart.map(function (i) {
            return { category: i.catName, module: i.label, mode: i.mode };
          })
        };
        if (savedLoc.address === locVal && typeof savedLoc.lat === 'number' && typeof savedLoc.lng === 'number') {
          payload.latitude = savedLoc.lat;
          payload.longitude = savedLoc.lng;
        }
        orderBtn.disabled = true;
        orderBtn.textContent = 'Placing order...';
        orderMsg.textContent = '';

        apiFetch('/cart-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            state.cart = [];
            saveJson(CART_KEY, []);
            state.client.location_name = locVal;
            saveJson(CLIENT_KEY, Object.assign({}, clientSess, state.client));
            showToast('Order #' + (res.order_no || '') + ' placed! Partner will contact you soon.', false);
            return fetchDashboardData().then(function () {
              setTab('orders');
            });
          })
          .catch(function (err) {
            orderBtn.disabled = false;
            orderBtn.textContent = 'Confirm & Place Order';
            orderMsg.className = 'cd-msg err';
            orderMsg.textContent = (err && err.message) || 'Could not place order.';
          });
      });
    }

    var profForm = document.getElementById('cd-profile-form');
    if (profForm) {
      var cpName = document.getElementById('cp-name');
      var cpLoc = document.getElementById('cp-loc');
      var cpGps = document.getElementById('cp-gps');
      var cpMsg = document.getElementById('cp-msg');
      var cpSave = document.getElementById('cp-save');
      var cpLogout = document.getElementById('cp-logout');

      if (cpLogout) cpLogout.addEventListener('click', logout);
      if (cpGps && cpLoc) {
        cpGps.addEventListener('click', function () {
          cpGps.disabled = true;
          cpGps.textContent = 'Detecting location...';
          document.dispatchEvent(new CustomEvent('ig:location-request'));
        });
        document.addEventListener('ig:location', function (e) {
          if (cpGps) { cpGps.disabled = false; cpGps.textContent = 'Detect current location'; }
          if (e && e.detail && e.detail.address && document.getElementById('cp-loc')) {
            document.getElementById('cp-loc').value = e.detail.address;
          }
        }, { once: true });
      }

      profForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nVal = cpName ? cpName.value.trim() : '';
        var lVal = cpLoc ? cpLoc.value.trim() : '';
        if (nVal.length < 2 || lVal.length < 2) {
          cpMsg.className = 'cd-msg err';
          cpMsg.textContent = 'Please enter both your name and location.';
          return;
        }
        var savedLoc = readJson(LOC_KEY) || {};
        var body = { name: nVal, location_name: lVal };
        if (savedLoc.address === lVal && typeof savedLoc.lat === 'number' && typeof savedLoc.lng === 'number') {
          body.latitude = savedLoc.lat;
          body.longitude = savedLoc.lng;
        }
        cpSave.disabled = true;
        cpSave.textContent = 'Saving...';
        cpMsg.textContent = '';

        apiFetch('/client/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
          .then(function (d) {
            if (d && d.client) {
              state.client = d.client;
              saveJson(CLIENT_KEY, Object.assign({}, clientSess, d.client));
            }
            cpSave.disabled = false;
            cpSave.textContent = 'Save Changes';
            cpMsg.className = 'cd-msg ok';
            cpMsg.textContent = 'Profile updated.';
            showToast('Profile saved', false);
          })
          .catch(function (err) {
            cpSave.disabled = false;
            cpSave.textContent = 'Save Changes';
            cpMsg.className = 'cd-msg err';
            cpMsg.textContent = (err && err.message) || 'Could not update profile.';
          });
      });
    }
  }

  function setTab(nextTab) {
    state.tab = nextTab;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cd-tab]'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-cd-tab') === state.tab);
    });
    var titleEl = document.getElementById('cd-page-title');
    var crumbEl = document.getElementById('cd-crumb');
    var label = TAB_TITLES[state.tab] || 'Overview';
    if (titleEl) titleEl.textContent = label;
    if (crumbEl) crumbEl.textContent = 'Client Dashboard / ' + label;

    var main = document.getElementById('cd-main');
    if (!main) return;
    if (state.loading) {
      main.innerHTML = '<div class="cd-skel"></div><div class="cd-skel"></div>';
      return;
    }

    if (state.tab === 'home') main.innerHTML = renderHome();
    else if (state.tab === 'orders') main.innerHTML = renderOrders();
    else if (state.tab === 'cart') main.innerHTML = renderCart();
    else if (state.tab === 'profile') main.innerHTML = renderProfile();

    bindHandlers();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cd-tab]'), function (btn) {
    btn.addEventListener('click', function () {
      setTab(btn.getAttribute('data-cd-tab') || 'home');
    });
  });

  var sideLogout = document.getElementById('side-logout');
  if (sideLogout) sideLogout.addEventListener('click', logout);

  render();
  fetchDashboardData().then(render);
})();
