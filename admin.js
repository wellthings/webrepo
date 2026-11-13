(function () {
  var API = (window.SITE && window.SITE.apiBase) || '';
  var TOKEN_KEY = 'ig_admin_token';
  var LOGIN_PAGE = 'partner-program.html#login';
  var MODE_LABEL = { new: 'New', repair: 'Repairing', full_interior: 'Full interior' };
  var ORDER_STATUSES = ['new', 'contacted', 'closed'];
  var $ = function (id) { return document.getElementById(id); };

  var token = sessionStorage.getItem(TOKEN_KEY) || '';
  if (!token) { location.replace(LOGIN_PAGE); return; }

  var msg = $('ad-msg'), ordersEl = $('panel-orders'), usersWrap = $('panel-users'), usersEl = $('ad-users-list'), cartsEl = $('panel-carts');
  var tabOrders = $('tab-orders'), tabUsers = $('tab-users'), tabCarts = $('tab-carts');
  var fltOnline = $('flt-online-only'), fltRole = $('flt-role');
  var loaded = { orders: false, users: false, carts: false };
  var onlinePros = [];

  function say(text, bad) { msg.textContent = text || ''; msg.style.color = bad ? '#c0392b' : ''; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function line(label, value) {
    var box = el('div');
    box.appendChild(el('p', 'ad-label', label));
    var v = el('p', 'ad-value');
    if (value instanceof Node) v.appendChild(value); else v.textContent = value;
    box.appendChild(v);
    return box;
  }
  function when(value) {
    var d = new Date(value);
    return isNaN(d) ? '' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function phoneLink(phone) {
    if (!phone) return el('span', '', '-');
    var a = el('a', '', '+91 ' + phone);
    a.href = 'tel:+91' + phone;
    return a;
  }

  function setTab(name) {
    var tabs = { orders: tabOrders, users: tabUsers, carts: tabCarts };
    Object.keys(tabs).forEach(function (k) {
      var on = k === name;
      tabs[k].classList.toggle('active', on);
      tabs[k].setAttribute('aria-selected', String(on));
    });
    ordersEl.hidden = name !== 'orders';
    usersWrap.hidden = name !== 'users';
    cartsEl.hidden = name !== 'carts';
    if (!loaded[name]) load(name);
  }

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ Authorization: 'Bearer ' + token }, options.headers || {});
    return fetch(API + path, options).then(function (r) {
      if (r.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        location.replace(LOGIN_PAGE);
        throw new Error('Session expired');
      }
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
        return d;
      });
    });
  }

  function itemRow(item) {
    var row = el('li', 'ad-row');
    row.appendChild(el('b', '', item.category || item.work_type || '-'));
    row.appendChild(el('span', 'ad-chip', item.module || item.work_unit || '-'));
    var mode = item.mode || item.requirement_type;
    row.appendChild(el('span', 'ad-chip', MODE_LABEL[mode] || mode || '-'));
    return row;
  }

  function itemList(items) {
    var list = el('ul', 'ad-rows');
    if (!items || !items.length) {
      list.appendChild(el('li', 'ad-row', 'No items'));
      return list;
    }
    items.forEach(function (i) { list.appendChild(itemRow(i)); });
    return list;
  }

  function statusPicker(order) {
    var wrap = el('span', 'ad-right');
    wrap.appendChild(el('span', 'ad-tag st-' + order.status, order.status));
    var select = el('select', 'ad-select');
    select.setAttribute('aria-label', 'Order status');
    ORDER_STATUSES.forEach(function (s) {
      var o = el('option', '', s.charAt(0).toUpperCase() + s.slice(1));
      o.value = s;
      if (s === order.status) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', function () {
      var next = select.value;
      select.disabled = true;
      say('');
      api('/admin/orders/' + order.id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      })
        .then(function () {
          order.status = next;
          var tag = wrap.querySelector('.ad-tag');
          tag.className = 'ad-tag st-' + next;
          tag.textContent = next;
          say('Order #' + order.order_no + ' marked as ' + next + '.');
        })
        .catch(function (e) { say(e.message, true); select.value = order.status; })
        .then(function () { select.disabled = false; });
    });
    wrap.appendChild(select);
    return wrap;
  }

  function orderCard(order) {
    var card = el('article', 'ad-card');
    var top = el('div', 'ad-top');
    var head = el('div');
    head.appendChild(el('span', 'ad-no', 'Order #' + (order.order_no ?? '-')));
    head.appendChild(el('span', 'ad-when', ' ' + when(order.created_at)));
    top.appendChild(head);
    top.appendChild(statusPicker(order));
    card.appendChild(top);

    var client = order.clients || {};
    var where = order.location_name || [order.latitude, order.longitude].filter(Boolean).join(', ') || '-';
    var grid = el('div', 'ad-grid');
    grid.appendChild(line('Client', client.name || '-'));
    grid.appendChild(line('Mobile', phoneLink(client.phone)));
    grid.appendChild(line('Location', where));
    grid.appendChild(line('Online Pool', onlinePros.length + ' online pro(s) available'));
    card.appendChild(grid);

    card.appendChild(el('p', 'ad-sub', 'Requested work'));
    card.appendChild(itemList(order.order_items));

    var assignments = order.order_assignments || [];
    card.appendChild(el('p', 'ad-sub', 'Assignments (Online Users Only)'));
    var rows = el('ul', 'ad-rows');
    var listToRender = assignments.length ? assignments : [{ id: null, work_type: 'General Work', status: 'unassigned', partner_id: null }];
    listToRender.forEach(function (a) {
      var row = el('li', 'ad-row');
      row.appendChild(el('b', '', a.work_type));
      row.appendChild(el('span', 'ad-chip', a.status));
      var sel = el('select', 'ad-select');
      var def = el('option', '', onlinePros.length ? 'Assign online partner / pro...' : 'No online pros available');
      def.value = '';
      sel.appendChild(def);
      onlinePros.forEach(function (u) {
        var opt = el('option', '', (u.business_name || u.username) + ' (' + u.role + (u.category_name ? ' · ' + u.category_name : '') + ')');
        opt.value = u.id;
        if (a.partner_id === u.id) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () {
        var pid = sel.value;
        if (!pid) return;
        sel.disabled = true;
        api('/admin/orders/' + order.id + '/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignment_id: a.id || undefined, partner_id: pid, work_type: a.work_type })
        }).then(function (d) {
          say('Assigned to ' + d.assigned_to + '.');
          a.status = 'assigned';
          a.partner_id = pid;
        }).catch(function (e) { say(e.message, true); }).then(function () { sel.disabled = false; });
      });
      row.appendChild(sel);
      rows.appendChild(row);
    });
    card.appendChild(rows);
    return card;
  }

  function userCard(u) {
    var card = el('article', 'ad-card');
    var top = el('div', 'ad-top');
    var head = el('div');
    head.appendChild(el('span', 'ad-no', (u.business_name || u.full_name || u.username || 'User') + ' '));
    head.appendChild(el('span', 'ad-chip', u.role.toUpperCase()));
    if (u.ig_id) head.appendChild(el('span', 'ad-chip', u.ig_id));
    top.appendChild(head);

    var right = el('div', 'ad-right');
    right.appendChild(el('span', 'ad-tag ' + (u.is_online ? 'st-online' : 'st-offline'), u.is_online ? 'Online' : 'Offline'));
    top.appendChild(right);
    card.appendChild(top);

    var grid = el('div', 'ad-grid');
    grid.appendChild(line('Aadhaar Full Name', u.full_name || '-'));
    grid.appendChild(line('Username & Mobile', (u.username || '-') + ' · +91 ' + (u.phone || '-')));
    grid.appendChild(line('Category / Skill', (u.category_name || '-') + ' · ' + (u.skill_level || 'intermediate')));
    grid.appendChild(line('City / Address', [u.city, u.state].filter(Boolean).join(', ') || u.address || '-'));
    card.appendChild(grid);

    if (u.role === 'partner') {
      var privSamples = u.private_samples || [];
      card.appendChild(el('p', 'ad-sub', 'Partner Private Skill Evaluation Samples (' + privSamples.length + ')'));
      if (!privSamples.length) {
        card.appendChild(el('p', 'ad-when', 'No private samples uploaded yet by this partner.'));
      } else {
        var sgrid = el('div', 'ad-samples-grid');
        privSamples.forEach(function (s) {
          var box = el('div', 'ad-sample-item');
          var im = el('img');
          im.src = s.image_url || 'assets/logo-square.png';
          im.alt = s.title || 'Private sample';
          im.onerror = function () { im.onerror = null; im.src = 'assets/logo-square.png'; };
          box.appendChild(im);
          box.appendChild(el('div', '', s.title || 'Work Sample'));
          sgrid.appendChild(box);
        });
        card.appendChild(sgrid);
      }
    }
    return card;
  }

  function cartCard(cart) {
    var card = el('article', 'ad-card');
    var top = el('div', 'ad-top');
    var head = el('div');
    head.appendChild(el('span', 'ad-no', 'Cart'));
    head.appendChild(el('span', 'ad-when', ' updated ' + when(cart.updated_at)));
    top.appendChild(head);
    top.appendChild(el('span', 'ad-chip', (cart.items || []).length + ' item(s)'));
    card.appendChild(top);

    var client = cart.clients || {};
    var grid = el('div', 'ad-grid');
    grid.appendChild(line('Client', client.name || '-'));
    grid.appendChild(line('Mobile', phoneLink(client.phone)));
    grid.appendChild(line('Location', client.location_name || '-'));
    card.appendChild(grid);

    card.appendChild(el('p', 'ad-sub', 'In cart now'));
    card.appendChild(itemList(cart.items));
    return card;
  }

  function render(target, rows, build, emptyText) {
    target.textContent = '';
    if (!rows.length) {
      target.appendChild(el('p', 'ad-empty', emptyText));
      return;
    }
    rows.forEach(function (r) { target.appendChild(build(r)); });
  }

  function fetchOnlinePool() {
    return api('/admin/users?online=true').then(function (d) {
      onlinePros = d.data || [];
    }).catch(function () { onlinePros = []; });
  }

  function load(name) {
    say('Loading...');
    if (name === 'users') {
      var onlineParam = fltOnline && fltOnline.checked ? 'true' : 'false';
      var roleParam = fltRole ? fltRole.value : 'all';
      return api('/admin/users?online=' + onlineParam + '&role=' + encodeURIComponent(roleParam))
        .then(function (d) {
          loaded.users = true;
          var rows = d.data || [];
          render(usersEl, rows, userCard, 'No matching professionals found for this availability filter.');
          say(rows.length + ' registered professional(s) shown.');
        }).catch(function (e) { say(e.message, true); });
    }

    if (name === 'orders') {
      return fetchOnlinePool().then(function () {
        return api('/admin/orders');
      }).then(function (d) {
        loaded.orders = true;
        var rows = d.data || [];
        render(ordersEl, rows, orderCard, 'No orders yet.');
        say(rows.length + ' order(s) · ' + onlinePros.length + ' online pro(s) ready.');
      }).catch(function (e) { say(e.message, true); });
    }

    return api('/admin/carts')
      .then(function (d) {
        loaded.carts = true;
        var rows = d.data || [];
        render(cartsEl, rows, cartCard, 'No client has items in the cart right now.');
        say(rows.length + ' live cart(s).');
      })
      .catch(function (e) { say(e.message, true); });
  }

  $('ad-refresh').addEventListener('click', function () {
    var active = tabOrders.classList.contains('active') ? 'orders' : tabUsers.classList.contains('active') ? 'users' : 'carts';
    load(active);
  });
  tabOrders.addEventListener('click', function () { setTab('orders'); });
  tabUsers.addEventListener('click', function () { setTab('users'); });
  tabCarts.addEventListener('click', function () { setTab('carts'); });
  if (fltOnline) fltOnline.addEventListener('change', function () { load('users'); });
  if (fltRole) fltRole.addEventListener('change', function () { load('users'); });
  $('ad-logout').addEventListener('click', function () {
    sessionStorage.removeItem(TOKEN_KEY);
    location.replace(LOGIN_PAGE);
  });

  api('/admin/me')
    .then(function (d) { $('ad-name').textContent = (d.admin && d.admin.username) || 'Admin'; })
    .catch(function () { return null; })
    .then(function () { setTab('orders'); });
})();
