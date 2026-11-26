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
  var TAB_TITLES = { home: 'Home', orders: 'Orders', cart: 'Cart', profile: 'Profile', agreement: 'E-Agreement' };

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
    cart: readJson(CART_KEY) || [],
    agreementBlocks: null
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
      'position:fixed;bottom:76px;right:20px;z-index:999;padding:11px 16px;border-radius:10px;font-size:0.86rem;font-weight:700;color:#fff;box-shadow:0 8px 24px rgba(10,25,47,0.22);background:' +
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

  function updateUserHeader() {
    var lbl = document.getElementById('cd-user-label');
    if (lbl) lbl.textContent = state.client.name || 'Profile';
  }

  function updateCounts() {
    var oc = document.getElementById('side-orders-count');
    var boc = document.getElementById('bottom-orders-count');
    var bcc = document.getElementById('bottom-cart-count');
    if (oc) oc.textContent = String(state.orders.length);
    if (boc) {
      boc.textContent = String(state.orders.length);
      boc.hidden = !state.orders.length;
    }
    if (bcc) {
      bcc.textContent = String(state.cart.length);
      bcc.hidden = !state.cart.length;
    }
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
      updateUserHeader();
      updateCounts();
    });
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
      '<div><h2>Order Status</h2><span class="cd-panel-sub">' + state.orders.length + ' total orders</span></div>' +
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
        '<button type="button" class="cd-btn primary" data-go-home="marketplace">Explore Marketplace</button>' +
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
      '<button type="button" class="cd-btn secondary" data-go-home="marketplace">Add More Services</button>' +
      '</div>';

    if (!state.cart.length) {
      html +=
        '<div class="cd-empty">' +
        '<span>Your cart is currently empty. Add work modules or partner samples from Home to book a free site visit.</span>' +
        '<button type="button" class="cd-btn primary" data-go-home="services">Explore Services</button>' +
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
        '<div class="ca-loc-wrap">' +
        '<span class="ca-loc-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span>' +
        '<input id="cd-order-loc" type="text" required autocomplete="off" maxlength="220" value="' + esc(state.client.location_name || '') + '" placeholder="Search city, area, road">' +
        '<button type="button" class="ca-loc-clear" id="cd-order-loc-clear" hidden aria-label="Clear address">&times;</button>' +
        '<div class="ca-loc-suggestions" id="cd-order-loc-sug" hidden role="listbox"></div>' +
        '</div>' +
        '<button type="button" class="ca-loc-btn" id="cd-order-gps"><span>Use my current location</span></button>' +
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
      '<div class="cd-field">' +
      '<label for="cp-loc">Saved Location / Site Address</label>' +
      '<div class="ca-loc-wrap">' +
      '<span class="ca-loc-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span>' +
      '<input id="cp-loc" type="text" required autocomplete="off" minlength="2" maxlength="220" value="' + esc(c.location_name || '') + '" placeholder="Search city, area, road">' +
      '<button type="button" class="ca-loc-clear" id="cp-loc-clear" hidden aria-label="Clear address">&times;</button>' +
      '<div class="ca-loc-suggestions" id="cp-loc-sug" hidden role="listbox"></div>' +
      '</div>' +
      '<button type="button" class="ca-loc-btn" id="cp-gps"><span>Use my current location</span></button>' +
      '</div>' +
      '<p class="cd-msg" id="cp-msg" role="alert"></p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
      '<button type="submit" class="cd-btn primary" id="cp-save">Save Changes</button>' +
      '<button type="button" class="cd-logout-btn" id="cp-logout">Log Out</button>' +
      '</div>' +
      '</form>' +
      '</section>'
    );
  }

  function renderAgreement() {
    var bodyHtml = '';
    if (Array.isArray(state.agreementBlocks) && state.agreementBlocks.length) {
      bodyHtml = state.agreementBlocks.map(function (b) {
        var txt = (b && b.text) || '';
        if (!txt) return '';
        if (b.type === 'title' || b.type === 'heading') return '<h3>' + esc(txt) + '</h3>';
        return '<p>' + esc(txt) + '</p>';
      }).join('');
    } else {
      bodyHtml =
        '<h3>1. Platform Role</h3>' +
        '<p>Interagood connects clients with verified Service Partners, Architects, and Material Suppliers.</p>' +
        '<h3>2. Zero Brokerage</h3>' +
        '<p>Enjoy direct supplier access and zero brokerage fee on all material purchases and service bookings.</p>' +
        '<h3>3. Clear Quote &amp; Milestones</h3>' +
        '<p>Verified partners conduct a free site visit and share transparent estimates before starting work.</p>' +
        '<h3>4. Support</h3>' +
        '<p>For any project support or dispute assistance, write to support@interagood.in.</p>';
    }
    return (
      '<section class="cd-panel">' +
      '<div class="cd-panel-head"><div><h2>Client Service &amp; Platform E-Agreement</h2><span class="cd-panel-sub">Interagood Terms &amp; Conditions</span></div></div>' +
      '<div class="cd-agreement-body" id="cd-agreement-body">' + bodyHtml + '</div>' +
      '</section>'
    );
  }

  function loadAgreementIfNeeded() {
    if (state.agreementBlocks !== null) return;
    fetch(API + '/content/client/terms')
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d && Array.isArray(d.blocks) && d.blocks.length) {
          state.agreementBlocks = d.blocks;
          if (state.tab === 'agreement') render();
        } else {
          state.agreementBlocks = [];
        }
      })
      .catch(function () {
        state.agreementBlocks = [];
      });
  }

  function formatSearchAddress(item) {
    var a = (item && item.address) || {};
    var road = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ');
    var area = a.neighbourhood || a.suburb || a.residential || a.quarter || a.hamlet || a.village || '';
    var city = a.city || a.town || a.city_district || a.state_district || a.county || '';
    var stateN = a.state || '';
    var pin = a.postcode || '';
    var seen = {};
    var parts = [road, area, city, stateN, pin].filter(function (p) {
      if (!p || seen[p]) return false;
      seen[p] = 1;
      return true;
    });
    var full = parts.length ? parts.join(', ') : (item.display_name || '');
    var main = [road || area || item.name, city].filter(Boolean).filter(function (v, idx, arr) {
      return arr.indexOf(v) === idx;
    }).join(', ') || full;
    return { main: main, sub: full, full: full };
  }

  function attachAddressSearch(inputId, clearId, sugId, gpsBtnId) {
    var input = document.getElementById(inputId);
    var clearBtn = document.getElementById(clearId);
    var sugEl = document.getElementById(sugId);
    var gpsBtn = document.getElementById(gpsBtnId);
    if (!input) return { getCoords: function () { return Promise.resolve(null); } };

    var selected = null;
    var timer = null;
    var seq = 0;

    function syncClear() {
      if (clearBtn) clearBtn.hidden = !input.value.trim();
    }
    syncClear();

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        selected = null;
        syncClear();
        if (sugEl) sugEl.hidden = true;
        input.focus();
      });
    }

    if (sugEl) {
      input.addEventListener('input', function () {
        var q = input.value.trim();
        syncClear();
        if (!selected || selected.address !== q) selected = null;
        clearTimeout(timer);
        if (q.length < 3) { sugEl.hidden = true; return; }
        var mySeq = ++seq;
        sugEl.innerHTML = '<div class="ca-sug-status">Searching locations...</div>';
        sugEl.hidden = false;
        timer = setTimeout(function () {
          fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&accept-language=en&limit=6&q=' + encodeURIComponent(q))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (mySeq !== seq) return;
              if (!Array.isArray(data) || !data.length) {
                sugEl.innerHTML = '<div class="ca-sug-status">No matching address found.</div>';
                sugEl.hidden = false;
                return;
              }
              sugEl.innerHTML = data.map(function (item) {
                var fmt = formatSearchAddress(item);
                return (
                  '<button type="button" class="ca-sug-item" data-display="' + esc(fmt.full) + '" data-lat="' + esc(item.lat) + '" data-lng="' + esc(item.lon) + '">' +
                  '<span class="ca-sug-main">' + esc(fmt.main) + '</span>' +
                  '<span class="ca-sug-sub">' + esc(fmt.sub) + '</span>' +
                  '</button>'
                );
              }).join('');
              sugEl.hidden = false;
              Array.prototype.forEach.call(sugEl.querySelectorAll('.ca-sug-item'), function (btn) {
                btn.addEventListener('click', function () {
                  var addr = btn.getAttribute('data-display') || '';
                  var lat = parseFloat(btn.getAttribute('data-lat'));
                  var lng = parseFloat(btn.getAttribute('data-lng'));
                  input.value = addr;
                  selected = {
                    address: addr,
                    lat: isNaN(lat) ? undefined : lat,
                    lng: isNaN(lng) ? undefined : lng,
                    source: 'search',
                    ts: Date.now()
                  };
                  saveJson(LOC_KEY, selected);
                  syncClear();
                  sugEl.hidden = true;
                });
              });
            })
            .catch(function () { if (mySeq === seq) sugEl.hidden = true; });
        }, 280);
      });

      document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !sugEl.contains(e.target) && (!clearBtn || !clearBtn.contains(e.target))) {
          sugEl.hidden = true;
        }
      });
    }

    if (gpsBtn) {
      gpsBtn.addEventListener('click', function () {
        gpsBtn.disabled = true;
        var span = gpsBtn.querySelector('span');
        if (span) span.textContent = 'Detecting current location...';
        document.dispatchEvent(new CustomEvent('ig:location-request'));
      });
      document.addEventListener('ig:location', function (e) {
        if (!document.body.contains(input)) return;
        gpsBtn.disabled = false;
        var span = gpsBtn.querySelector('span');
        if (span) span.textContent = 'Use my current location';
        if (e && e.detail && e.detail.address) {
          input.value = e.detail.address;
          selected = { address: e.detail.address, lat: e.detail.lat, lng: e.detail.lng, source: 'gps', ts: Date.now() };
          syncClear();
          if (sugEl) sugEl.hidden = true;
        }
      }, { once: true });
      document.addEventListener('ig:location-error', function () {
        if (!document.body.contains(input)) return;
        gpsBtn.disabled = false;
        var span = gpsBtn.querySelector('span');
        if (span) span.textContent = 'Use my current location';
      }, { once: true });
    }

    return {
      getCoords: function (addrText) {
        var saved = readJson(LOC_KEY) || {};
        if (selected && selected.address === addrText && typeof selected.lat === 'number' && typeof selected.lng === 'number') {
          return Promise.resolve({ lat: selected.lat, lng: selected.lng });
        }
        if (saved.address === addrText && typeof saved.lat === 'number' && typeof saved.lng === 'number') {
          return Promise.resolve({ lat: saved.lat, lng: saved.lng });
        }
        return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&accept-language=en&q=' + encodeURIComponent(addrText))
          .then(function (r) { return r.json(); })
          .then(function (list) {
            if (Array.isArray(list) && list.length) {
              var lat = parseFloat(list[0].lat);
              var lng = parseFloat(list[0].lon);
              if (!isNaN(lat) && !isNaN(lng)) return { lat: lat, lng: lng };
            }
            return null;
          })
          .catch(function () { return null; });
      }
    };
  }

  function bindTabHandlers() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-go-home]'), function (btn) {
      btn.addEventListener('click', function () {
        var secId = btn.getAttribute('data-go-home') || '';
        setTab('home', secId);
      });
    });

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
      var orderMsg = document.getElementById('cd-order-msg');
      var orderBtn = document.getElementById('cd-order-submit');
      var orderSearch = attachAddressSearch('cd-order-loc', 'cd-order-loc-clear', 'cd-order-loc-sug', 'cd-order-gps');

      orderForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var locVal = orderLocEl ? orderLocEl.value.trim() : '';
        if (locVal.length < 2) {
          orderMsg.className = 'cd-msg err';
          orderMsg.textContent = 'Please search or enter your site address.';
          return;
        }
        orderBtn.disabled = true;
        orderBtn.textContent = 'Placing order...';
        orderMsg.textContent = '';

        orderSearch.getCoords(locVal).then(function (coords) {
          var payload = {
            location_name: locVal,
            items: state.cart.map(function (i) {
              return { category: i.catName, module: i.label, mode: i.mode };
            })
          };
          if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            payload.latitude = coords.lat;
            payload.longitude = coords.lng;
          }
          return apiFetch('/cart-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
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
      var cpMsg = document.getElementById('cp-msg');
      var cpSave = document.getElementById('cp-save');
      var cpLogout = document.getElementById('cp-logout');
      var profSearch = attachAddressSearch('cp-loc', 'cp-loc-clear', 'cp-loc-sug', 'cp-gps');

      if (cpLogout) cpLogout.addEventListener('click', logout);

      profForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nVal = cpName ? cpName.value.trim() : '';
        var lVal = cpLoc ? cpLoc.value.trim() : '';
        if (nVal.length < 2 || lVal.length < 2) {
          cpMsg.className = 'cd-msg err';
          cpMsg.textContent = 'Please enter both your name and location.';
          return;
        }
        cpSave.disabled = true;
        cpSave.textContent = 'Saving...';
        cpMsg.textContent = '';

        profSearch.getCoords(lVal).then(function (coords) {
          var body = { name: nVal, location_name: lVal };
          if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            body.latitude = coords.lat;
            body.longitude = coords.lng;
          }
          return apiFetch('/client/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
        })
          .then(function (d) {
            if (d && d.client) {
              state.client = d.client;
              saveJson(CLIENT_KEY, Object.assign({}, clientSess, d.client));
            }
            updateUserHeader();
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

  function setDrawerOpen(isOpen) {
    var sb = document.getElementById('cd-sidebar');
    var bd = document.getElementById('cd-side-backdrop');
    var mt = document.getElementById('cd-menu-toggle');
    if (sb) {
      sb.classList.toggle('open', isOpen);
      sb.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
    if (bd) bd.classList.toggle('open', isOpen);
    if (mt) mt.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function closeSidebarDrawer() {
    setDrawerOpen(false);
  }

  function setTab(nextTab, scrollSectionId) {
    state.tab = nextTab;
    closeSidebarDrawer();
    if (nextTab === 'agreement') loadAgreementIfNeeded();
    render();
    if (nextTab === 'home' && scrollSectionId) {
      setTimeout(function () {
        var el = document.getElementById(scrollSectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cd-tab]'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-cd-tab') === state.tab);
    });
    var titleEl = document.getElementById('cd-page-title');
    var crumbEl = document.getElementById('cd-crumb');
    var label = TAB_TITLES[state.tab] || 'Home';
    if (titleEl) titleEl.textContent = label;
    if (crumbEl) crumbEl.textContent = 'Control Panel / ' + label;

    var homeView = document.getElementById('cd-home-view');
    var tabView = document.getElementById('cd-tab-view');
    if (!homeView || !tabView) return;

    if (state.tab === 'home') {
      homeView.hidden = false;
      tabView.hidden = true;
      return;
    }

    homeView.hidden = true;
    tabView.hidden = false;

    if (state.loading) {
      tabView.innerHTML = '<div class="cd-skel"></div><div class="cd-skel"></div>';
      return;
    }

    if (state.tab === 'orders') tabView.innerHTML = renderOrders();
    else if (state.tab === 'cart') tabView.innerHTML = renderCart();
    else if (state.tab === 'profile') tabView.innerHTML = renderProfile();
    else if (state.tab === 'agreement') tabView.innerHTML = renderAgreement();

    bindTabHandlers();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cd-tab]'), function (btn) {
    btn.addEventListener('click', function () {
      setTab(btn.getAttribute('data-cd-tab') || 'home');
    });
  });

  var menuToggle = document.getElementById('cd-menu-toggle');
  var sideClose = document.getElementById('cd-side-close');
  var sideBackdrop = document.getElementById('cd-side-backdrop');
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      var sb = document.getElementById('cd-sidebar');
      setDrawerOpen(!(sb && sb.classList.contains('open')));
    });
  }
  if (sideClose) sideClose.addEventListener('click', closeSidebarDrawer);
  if (sideBackdrop) sideBackdrop.addEventListener('click', closeSidebarDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebarDrawer();
  });

  var sideLogout = document.getElementById('side-logout');
  if (sideLogout) sideLogout.addEventListener('click', logout);

  document.addEventListener('ig:cart-changed', function () {
    state.cart = readJson(CART_KEY) || [];
    updateCounts();
    if (state.tab === 'cart') render();
  });

  document.addEventListener('ig:order-placed', function () {
    state.cart = [];
    updateCounts();
    fetchDashboardData().then(function () {
      if (state.tab === 'orders' || state.tab === 'cart') render();
    });
  });

  document.addEventListener('ig:switch-tab', function (e) {
    if (e && e.detail && e.detail.tab) {
      fetchDashboardData().then(function () {
        setTab(e.detail.tab);
      });
    }
  });

  updateUserHeader();
  updateCounts();
  render();
  fetchDashboardData().then(function () {
    if (state.tab !== 'home') render();
  });
})();
