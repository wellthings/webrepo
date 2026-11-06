(function () {
  var API = (window.SITE && window.SITE.apiBase) || '';
  var TOKEN_KEY = 'ig_admin_token';
  var LOGIN_PAGE = 'partner-program.html#login';
  var MODE_LABEL = { new: 'New', repair: 'Repairing', full_interior: 'Full interior' };
  var ORDER_STATUSES = ['new', 'contacted', 'closed'];
  var $ = function (id) { return document.getElementById(id); };

  var token = sessionStorage.getItem(TOKEN_KEY) || '';
  if (!token) { location.replace(LOGIN_PAGE); return; }

  var msg = $('ad-msg'), ordersEl = $('panel-orders'), cartsEl = $('panel-carts');
  var tabOrders = $('tab-orders'), tabCarts = $('tab-carts');
  var loaded = { orders: false, carts: false };

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
    var onOrders = name === 'orders';
    tabOrders.classList.toggle('active', onOrders);
    tabCarts.classList.toggle('active', !onOrders);
    tabOrders.setAttribute('aria-selected', String(onOrders));
    tabCarts.setAttribute('aria-selected', String(!onOrders));
    ordersEl.hidden = !onOrders;
    cartsEl.hidden = onOrders;
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
      var empty = el('li', 'ad-row', 'No items');
      list.appendChild(empty);
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
        body: JSON.stringify({ status: next }),
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
    var assigned = (order.order_assignments || []).length;
    grid.appendChild(line('Categories', String(assigned)));
    card.appendChild(grid);

    card.appendChild(el('p', 'ad-sub', 'Requested work'));
    card.appendChild(itemList(order.order_items));

    var assignments = order.order_assignments || [];
    if (assignments.length) {
      card.appendChild(el('p', 'ad-sub', 'Assignments'));
      var rows = el('ul', 'ad-rows');
      assignments.forEach(function (a) {
        var row = el('li', 'ad-row');
        row.appendChild(el('b', '', a.work_type));
        row.appendChild(el('span', 'ad-chip', a.status));
        row.appendChild(el('span', 'ad-chip', a.partner_id ? 'partner: ' + String(a.partner_id).slice(0, 8) : 'unassigned'));
        rows.appendChild(row);
      });
      card.appendChild(rows);
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

  function load(name) {
    var target = name === 'orders' ? ordersEl : cartsEl;
    say('Loading...');
    var path = name === 'orders' ? '/admin/orders' : '/admin/carts';
    return api(path)
      .then(function (d) {
        loaded[name] = true;
        var rows = d.data || [];
        render(target, rows, name === 'orders' ? orderCard : cartCard,
          name === 'orders' ? 'No orders yet.' : 'No client has items in the cart right now.');
        say(rows.length + (name === 'orders' ? ' order(s)' : ' live cart(s)') + '.');
      })
      .catch(function (e) { say(e.message, true); });
  }

  $('ad-refresh').addEventListener('click', function () { load(tabOrders.classList.contains('active') ? 'orders' : 'carts'); });
  tabOrders.addEventListener('click', function () { setTab('orders'); });
  tabCarts.addEventListener('click', function () { setTab('carts'); });
  $('ad-logout').addEventListener('click', function () {
    sessionStorage.removeItem(TOKEN_KEY);
    location.replace(LOGIN_PAGE);
  });

  api('/admin/me')
    .then(function (d) { $('ad-name').textContent = (d.admin && d.admin.username) || 'Admin'; })
    .catch(function () { return null; })
    .then(function () { setTab('orders'); });
})();
