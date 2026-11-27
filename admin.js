(function () {
  var API = (window.SITE && window.SITE.apiBase) || '';
  var TOKEN_KEY = 'ig_admin_token';
  var ACTIVE_KEY = 'ig_admin_session_token';
  var EXIT_PAGE = 'index.html';
  var MODE_LABEL = { new: 'New', repair: 'Repairing', full_interior: 'Full interior' };
  var ORDER_STATUSES = ['new', 'contacted', 'closed'];
  var SECTION_META = {
    orders: { title: 'Orders', sub: 'Client details, units, Assign & Merge Combo Assign' },
    busy: { title: 'Busy Users', sub: 'Partners & Architects currently handling an active order' },
    architect: { title: 'Architects', sub: 'Registered architects filtered separately' },
    partner: { title: 'Partners', sub: 'Registered partners and private skill samples' },
    supplier: { title: 'Suppliers', sub: 'Registered material suppliers' },
    carts: { title: 'Live Carts', sub: 'Items currently in client carts before checkout' }
  };
  var $ = function (id) { return document.getElementById(id); };

  var token = '';
  try { token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(ACTIVE_KEY) || ''; } catch (e) {}
  if (!token) { location.replace(EXIT_PAGE); return; }
  try { sessionStorage.setItem(TOKEN_KEY, token); localStorage.setItem(ACTIVE_KEY, token); } catch (e) {}

  var msg = $('ad-msg');
  var ordersEl = $('panel-orders');
  var usersEl = $('panel-users');
  var cartsEl = $('panel-carts');
  var filterOrdersBox = $('ad-filters-orders');
  var filterUsersBox = $('ad-filters-users');
  var fltOrderStatus = $('flt-order-status');
  var fltOnline = $('flt-online-only');
  var secTitle = $('ad-section-title');
  var secSub = $('ad-section-sub');
  var drawerBtn = $('ad-drawer-btn');
  var drawerClose = $('ad-drawer-close');
  var backdrop = $('ad-backdrop');
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.ad-nav-item'));

  var currentSection = 'orders';
  var cachedOrders = [];
  var assignablePros = [];
  var openUnitAssign = {};
  var mergedByOrder = {};

  function say(text, bad) {
    msg.textContent = text || '';
    msg.style.color = bad ? '#c0392b' : '';
  }

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
    var clean = String(phone).replace(/[^0-9+]/g, '');
    var a = el('a', '', '+91 ' + phone);
    a.href = 'tel:+91' + clean;
    return a;
  }

  function locationNode(addrText, lat, lng) {
    var wrap = el('span');
    wrap.appendChild(document.createTextNode(addrText || '-'));
    var la = Number(lat), ln = Number(lng);
    if (lat != null && lng != null && !isNaN(la) && !isNaN(ln) && (la !== 0 || ln !== 0)) {
      wrap.appendChild(document.createTextNode(' '));
      var a = el('a', '', '(Map)');
      a.href = 'https://www.google.com/maps?q=' + encodeURIComponent(la + ',' + ln);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      wrap.appendChild(a);
    }
    return wrap;
  }

  function isMobile() {
    return window.innerWidth <= 900;
  }

  function openMobileDrawer() {
    document.body.classList.add('drawer-open');
    backdrop.hidden = false;
    drawerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMobileDrawer() {
    document.body.classList.remove('drawer-open');
    backdrop.hidden = true;
    drawerBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleDrawer() {
    if (isMobile()) {
      if (document.body.classList.contains('drawer-open')) closeMobileDrawer();
      else openMobileDrawer();
    } else {
      var collapsed = document.body.classList.toggle('drawer-collapsed');
      drawerBtn.setAttribute('aria-expanded', String(!collapsed));
    }
  }

  drawerBtn.addEventListener('click', toggleDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeMobileDrawer);
  if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) closeMobileDrawer();
  });

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ Authorization: 'Bearer ' + token }, options.headers || {});
    return fetch(API + path, options).then(function (r) {
      if (r.status === 401) {
        try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
        try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
        location.replace(EXIT_PAGE);
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
    if (order.status === 'cancelled' || order.cancelled_by_client) {
      wrap.appendChild(el('span', 'ad-tag st-cancelled', 'Cancelled by Client'));
      return wrap;
    }
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
          refreshDrawerCounts();
        })
        .catch(function (e) { say(e.message, true); select.value = order.status; })
        .then(function () { select.disabled = false; });
    });
    wrap.appendChild(select);
    return wrap;
  }

  function buildProsSelect(placeholder) {
    var sel = el('select', 'ad-select');
    var list = assignablePros.filter(function (u) {
      return (u.role === 'partner' || u.role === 'architect') && u.is_online && !u.is_busy;
    });
    var def = el('option', '', list.length
      ? (placeholder || 'Select free online Partner / Architect...')
      : 'No free online Partner or Architect available');
    def.value = '';
    sel.appendChild(def);
    list.forEach(function (u) {
      var roleTag = u.role === 'architect' ? 'Architect' : 'Partner';
      var namePart = (u.business_name || u.full_name || u.username || 'Member') + ' (@' + (u.username || '-') + ')';
      var catPart = u.category_name ? ' · ' + u.category_name : '';
      var opt = el('option', '', '[' + roleTag + '] ' + namePart + catPart);
      opt.value = u.id;
      opt.setAttribute('data-username', u.username || '');
      sel.appendChild(opt);
    });
    return sel;
  }

  function assignPillInfo(assignment) {
    var eff = String(assignment.effective_status || assignment.status || '').toLowerCase();
    var cls = 'pending';
    var stateText = 'Waiting Accept';
    if (eff === 'completed') {
      cls = 'completed';
      stateText = 'Completed';
    } else if (assignment.accepted || eff === 'accepted' || eff === 'in_progress') {
      cls = 'accepted';
      stateText = 'Accepted';
    }
    var pro = assignment.assignee || {};
    var roleText = pro.role === 'architect' ? 'Architect' : 'Partner';
    var proLabel = pro.business_name || pro.full_name || (pro.username ? '@' + pro.username : '') || 'Assigned Pro';
    var userHandle = pro.username ? ' (@' + pro.username + ')' : '';
    return {
      cls: cls,
      text: roleText + ': ' + proLabel + userHandle + ' · ' + stateText
    };
  }

  function replaceOrderCard(card, order) {
    if (!card || !card.parentNode) return;
    card.parentNode.replaceChild(orderCard(order), card);
  }

  function submitAssignment(order, payload, busyMsg) {
    say(busyMsg || 'Assigning order...');
    return api('/admin/orders/' + order.id + '/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (d) {
      delete mergedByOrder[order.id];
      say(d.message || ('Assigned to ' + (d.assigned_to || 'Partner/Architect') + '.'));
      return Promise.all([load('orders'), refreshDrawerCounts()]);
    });
  }

  function orderCard(order) {
    var card = el('article', 'ad-card ad-order-card');
    var client = order.clients || {};
    var where = order.location_name || [order.latitude, order.longitude].filter(Boolean).join(', ') || '-';
    var rawItems = Array.isArray(order.order_items) && order.order_items.length
      ? order.order_items
      : (Array.isArray(order.items) ? order.items.map(function (it, idx) {
          return {
            id: 'legacy_' + order.id + '_' + idx,
            _synthetic: true,
            work_type: it.category || it.work_type || 'General Work',
            work_unit: it.module || it.work_unit || 'Service',
            requirement_type: it.mode || it.requirement_type || 'new',
            assignment_id: null
          };
        }) : []);

    var hero = el('div', 'ad-client-hero');
    var top = el('div', 'ad-top');
    var head = el('div');
    head.appendChild(el('span', 'ad-no', 'Order #' + (order.order_no != null ? order.order_no : '-')));
    head.appendChild(el('span', 'ad-when', ' · ' + when(order.created_at)));
    top.appendChild(head);
    top.appendChild(statusPicker(order));
    hero.appendChild(top);

    var grid = el('div', 'ad-grid');
    grid.appendChild(line('Client Name', client.name || order.client_name || '-'));
    grid.appendChild(line('Mobile Number', phoneLink(client.phone || order.client_phone)));
    grid.appendChild(line('Site Address', locationNode(where, order.latitude, order.longitude)));
    grid.appendChild(line('Units & Free Pros', rawItems.length + ' unit(s) · ' + assignablePros.length + ' free Partner/Architect'));
    hero.appendChild(grid);
    card.appendChild(hero);

    var unitsWrap = el('div', 'ad-units-wrap');
    var unitsHead = el('div', 'ad-units-head');
    unitsHead.appendChild(el('p', 'ad-sub', 'Total Units (' + rawItems.length + ')'));
    unitsHead.appendChild(el('span', 'ad-when', 'Assign / Merge uses only free online Partners & Architects'));
    unitsWrap.appendChild(unitsHead);

    var assignments = Array.isArray(order.order_assignments) ? order.order_assignments : [];
    var assignById = {};
    assignments.forEach(function (a) { if (a && a.id) assignById[a.id] = a; });

    if (!mergedByOrder[order.id]) mergedByOrder[order.id] = {};
    var mergedMap = mergedByOrder[order.id];

    var unitsList = el('div', 'ad-units-list');
    var isOrderCancelled = order.status === 'cancelled' || !!order.cancelled_by_client;

    if (!rawItems.length) {
      unitsList.appendChild(el('div', 'ad-empty', 'No units found on this order.'));
    } else {
      rawItems.forEach(function (item, idx) {
        var itemKey = String(item.id || (order.id + '_' + idx));
        var a = item.assignment_id ? assignById[item.assignment_id] : null;
        if (!a) {
          a = assignments.find(function (cand) {
            return cand && cand.partner_id && cand.status !== 'cancelled' && cand.work_type === item.work_type;
          }) || null;
        }
        var isAssigned = !isOrderCancelled && !!(a && a.partner_id && a.status !== 'cancelled' && a.status !== 'unassigned');
        if ((isAssigned || isOrderCancelled) && mergedMap[itemKey]) delete mergedMap[itemKey];
        var isMerged = !isOrderCancelled && !isAssigned && !!mergedMap[itemKey];

        var uCard = el('div', 'ad-unit-card' + (isMerged ? ' is-merged' : '') + (isAssigned ? ' is-assigned' : ''));
        var uMain = el('div', 'ad-unit-main');

        var uInfo = el('div', 'ad-unit-info');
        uInfo.appendChild(el('span', 'ad-unit-title', item.work_unit || item.work_type || 'Unit'));
        uInfo.appendChild(el('span', 'ad-chip', item.work_type || '-'));
        uInfo.appendChild(el('span', 'ad-chip', MODE_LABEL[item.requirement_type] || item.requirement_type || 'New'));
        if (a && a.is_combo) uInfo.appendChild(el('span', 'ad-chip', 'COMBO'));
        uMain.appendChild(uInfo);

        var uActions = el('div', 'ad-unit-actions');
        if (isOrderCancelled) {
          uActions.appendChild(el('span', 'ad-declined-pill', 'Order Cancelled & Reversed'));
        } else if (isAssigned) {
          var pill = assignPillInfo(a);
          uActions.appendChild(el('span', 'ad-pro-pill ' + pill.cls, pill.text));
        } else if (a && a.last_declined) {
          var ld = a.last_declined;
          uActions.appendChild(el('span', 'ad-declined-pill',
            'Declined by @' + (ld.username || '-') + (ld.business_name ? ' (' + ld.business_name + ')' : '') + ' — Ready to Re-assign'));
        }

        var btnAssign = el('button', 'ad-u-btn primary', openUnitAssign[itemKey] ? 'Close' : 'Assign');
        btnAssign.type = 'button';
        btnAssign.disabled = isOrderCancelled || isAssigned || !!item._synthetic;
        if (isAssigned) btnAssign.title = 'Unit is already assigned';
        btnAssign.addEventListener('click', function () {
          openUnitAssign[itemKey] = !openUnitAssign[itemKey];
          replaceOrderCard(card, order);
        });

        var btnMerge = el('button', 'ad-u-btn merge' + (isMerged ? ' active' : ''), isMerged ? 'Merged ✓' : 'Merge');
        btnMerge.type = 'button';
        btnMerge.disabled = isOrderCancelled || isAssigned || !!item._synthetic;
        if (isAssigned) btnMerge.title = 'Already assigned unit cannot be merged';
        btnMerge.addEventListener('click', function () {
          if (mergedMap[itemKey]) delete mergedMap[itemKey];
          else mergedMap[itemKey] = item;
          openUnitAssign[itemKey] = false;
          replaceOrderCard(card, order);
        });

        uActions.appendChild(btnAssign);
        uActions.appendChild(btnMerge);
        uMain.appendChild(uActions);
        uCard.appendChild(uMain);

        if (!isOrderCancelled && !isAssigned && !item._synthetic && openUnitAssign[itemKey]) {
          var pop = el('div', 'ad-assign-pop');
          var sel = buildProsSelect('Pick free Partner / Architect for ' + (item.work_unit || item.work_type) + '...');
          var confirmBtn = el('button', 'ad-u-btn primary', 'Confirm Assign');
          confirmBtn.type = 'button';
          var cancelBtn = el('button', 'ad-u-btn', 'Cancel');
          cancelBtn.type = 'button';

          confirmBtn.addEventListener('click', function () {
            var pid = sel.value;
            var opt = sel.options[sel.selectedIndex];
            var puname = opt ? (opt.getAttribute('data-username') || '') : '';
            if (!pid) { say('Select a free online Partner or Architect first.', true); return; }
            confirmBtn.disabled = true;
            cancelBtn.disabled = true;
            sel.disabled = true;
            submitAssignment(order, {
              item_id: item.id,
              partner_id: pid,
              partner_username: puname || undefined,
              work_type: item.work_type
            }, 'Verifying username & assigning contract...')
              .then(function () {
                openUnitAssign[itemKey] = false;
              })
              .catch(function (e) {
                say(e.message, true);
                confirmBtn.disabled = false;
                cancelBtn.disabled = false;
                sel.disabled = false;
              });
          });

          cancelBtn.addEventListener('click', function () {
            openUnitAssign[itemKey] = false;
            replaceOrderCard(card, order);
          });

          pop.appendChild(sel);
          pop.appendChild(confirmBtn);
          pop.appendChild(cancelBtn);
          uCard.appendChild(pop);
        }

        unitsList.appendChild(uCard);
      });
    }
    unitsWrap.appendChild(unitsList);

    var mergedKeys = isOrderCancelled ? [] : Object.keys(mergedMap);
    if (mergedKeys.length > 0) {
      var comboBar = el('div', 'ad-combo-bar');
      var comboTop = el('div', 'ad-combo-top');
      comboTop.appendChild(el('span', 'ad-combo-title',
        'Combo Bundle: ' + mergedKeys.length + ' unit(s) merged' +
        (mergedKeys.length < 2 ? ' (pick at least 2 units to Combo Assign)' : '')
      ));
      var clearBtn = el('button', 'ad-u-btn', 'Clear Merge');
      clearBtn.type = 'button';
      clearBtn.addEventListener('click', function () {
        mergedByOrder[order.id] = {};
        replaceOrderCard(card, order);
      });
      comboTop.appendChild(clearBtn);
      comboBar.appendChild(comboTop);

      var chips = el('div', 'ad-combo-chips');
      var selectedIds = [];
      mergedKeys.forEach(function (k) {
        var it = mergedMap[k];
        if (!it) return;
        selectedIds.push(it.id);
        chips.appendChild(el('span', 'ad-chip', (it.work_unit || it.work_type) + ' · ' + (it.work_type || '')));
      });
      comboBar.appendChild(chips);

      var controls = el('div', 'ad-combo-controls');
      var comboSel = buildProsSelect('Pick free Partner / Architect for Combo (' + selectedIds.length + ' units)...');
      var comboBtn = el('button', 'ad-u-btn combo',
        selectedIds.length >= 2 ? ('Combo Assign (' + selectedIds.length + ' units)') : 'Select 2+ units to Combo Assign');
      comboBtn.type = 'button';
      comboBtn.disabled = selectedIds.length < 2;

      comboBtn.addEventListener('click', function () {
        var pid = comboSel.value;
        var opt = comboSel.options[comboSel.selectedIndex];
        var puname = opt ? (opt.getAttribute('data-username') || '') : '';
        if (!pid) { say('Select a free online Partner or Architect for this combo.', true); return; }
        comboBtn.disabled = true;
        comboSel.disabled = true;
        clearBtn.disabled = true;
        submitAssignment(order, {
          item_ids: selectedIds,
          partner_id: pid,
          partner_username: puname || undefined
        }, 'Verifying username & creating combo contract...')
          .catch(function (e) {
            say(e.message, true);
            comboBtn.disabled = false;
            comboSel.disabled = false;
            clearBtn.disabled = false;
          });
      });

      controls.appendChild(comboSel);
      controls.appendChild(comboBtn);
      comboBar.appendChild(controls);
      unitsWrap.appendChild(comboBar);
    }

    card.appendChild(unitsWrap);
    return card;
  }

  function userCard(u) {
    var card = el('article', 'ad-card');
    var top = el('div', 'ad-top');
    var head = el('div');
    head.appendChild(el('span', 'ad-no', (u.business_name || u.full_name || u.username || 'User') + ' '));
    head.appendChild(el('span', 'ad-chip', (u.role || '').toUpperCase()));
    if (u.ig_id) head.appendChild(el('span', 'ad-chip', u.ig_id));
    top.appendChild(head);

    var right = el('div', 'ad-right');
    if (u.is_busy) right.appendChild(el('span', 'ad-tag st-busy', 'Busy'));
    right.appendChild(el('span', 'ad-tag ' + (u.is_online ? 'st-online' : 'st-offline'), u.is_online ? 'Online' : 'Offline'));
    top.appendChild(right);
    card.appendChild(top);

    var grid = el('div', 'ad-grid');
    grid.appendChild(line('Aadhaar Full Name', u.full_name || '-'));
    grid.appendChild(line('Username & Mobile', '@' + (u.username || '-') + ' · +91 ' + (u.phone || '-')));
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

  function busyUserCard(u) {
    var card = el('article', 'ad-card');
    var top = el('div', 'ad-top');
    var head = el('div');
    head.appendChild(el('span', 'ad-no', (u.business_name || u.full_name || u.username || 'User') + ' '));
    head.appendChild(el('span', 'ad-chip', (u.role || '').toUpperCase()));
    if (u.ig_id) head.appendChild(el('span', 'ad-chip', u.ig_id));
    top.appendChild(head);

    var right = el('div', 'ad-right');
    right.appendChild(el('span', 'ad-tag st-busy', 'BUSY'));
    right.appendChild(el('span', 'ad-tag ' + (u.is_online ? 'st-online' : 'st-offline'), u.is_online ? 'Online' : 'Offline'));
    top.appendChild(right);
    card.appendChild(top);

    var grid = el('div', 'ad-grid');
    grid.appendChild(line('Business & Username', (u.business_name || '-') + ' (@' + (u.username || '-') + ')'));
    grid.appendChild(line('Full Name & Mobile', (u.full_name || '-') + ' · +91 ' + (u.phone || '-')));
    grid.appendChild(line('Category', u.category_name || (u.role === 'architect' ? 'Architect' : 'Partner')));
    grid.appendChild(line('City / Address', [u.city, u.state].filter(Boolean).join(', ') || u.address || '-'));
    card.appendChild(grid);

    var active = Array.isArray(u.active_orders) ? u.active_orders : [];
    card.appendChild(el('p', 'ad-sub', 'Active Assigned Order(s) (' + active.length + ')'));
    if (!active.length) {
      card.appendChild(el('p', 'ad-when', 'No active order details available.'));
    } else {
      var list = el('div', 'ad-units-list');
      active.forEach(function (ao) {
        var box = el('div', 'ad-busy-order');
        var headLine = el('div', 'ad-top');
        headLine.style.marginBottom = '4px';
        var left = el('div');
        left.appendChild(el('strong', '', 'Order #' + (ao.order_no != null ? ao.order_no : '-')));
        if (ao.is_combo) {
          left.appendChild(document.createTextNode(' '));
          left.appendChild(el('span', 'ad-chip', 'COMBO'));
        }
        headLine.appendChild(left);
        var stText = ao.accepted || ao.effective_status === 'in_progress' || ao.effective_status === 'accepted'
          ? 'Accepted · In Progress'
          : 'Waiting Accept';
        headLine.appendChild(el('span', 'ad-pro-pill ' + (ao.accepted ? 'accepted' : 'pending'), stText));
        box.appendChild(headLine);
        box.appendChild(el('div', '', 'Work: ' + (ao.work_type || '-')));
        box.appendChild(el('div', '', 'Client: ' + (ao.client_name || '-') + ' · Address: ' + (ao.location_name || '-')));
        list.appendChild(box);
      });
      card.appendChild(list);
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

  function renderFilteredOrders() {
    var st = fltOrderStatus ? fltOrderStatus.value : 'all';
    var filtered = st === 'all' ? cachedOrders : cachedOrders.filter(function (o) { return o.status === st; });
    render(ordersEl, filtered, orderCard, st === 'all' ? 'No orders yet.' : 'No ' + st + ' orders.');
    say(filtered.length + ' order(s) shown · ' + assignablePros.length + ' free Partner/Architect available.');
  }

  function setCount(id, val) {
    var node = $(id);
    if (node) node.textContent = String(val);
  }

  function refreshDrawerCounts() {
    return Promise.all([
      api('/admin/users?online=false').then(function (d) {
        var list = d.data || [];
        setCount('cnt-architect', list.filter(function (u) { return u.role === 'architect'; }).length);
        setCount('cnt-partner', list.filter(function (u) { return u.role === 'partner'; }).length);
        setCount('cnt-supplier', list.filter(function (u) { return u.role === 'supplier'; }).length);
        setCount('cnt-busy', list.filter(function (u) { return !!u.is_busy; }).length);
      }).catch(function () { return null; }),
      api('/admin/carts').then(function (d) {
        setCount('cnt-carts', (d.data || []).length);
      }).catch(function () { return null; })
    ]);
  }

  function fetchAssignablePool() {
    return api('/admin/users?assignable=true').then(function (d) {
      assignablePros = (d.data || []).filter(function (u) {
        return (u.role === 'partner' || u.role === 'architect') && u.is_online && !u.is_busy;
      });
    }).catch(function () { assignablePros = []; });
  }

  function load(section) {
    say('Loading...');
    if (section === 'busy') {
      return api('/admin/users?busy=true')
        .then(function (d) {
          var rows = d.data || [];
          setCount('cnt-busy', rows.length);
          render(usersEl, rows, busyUserCard, 'No busy Partners or Architects right now.');
          say(rows.length + ' busy user(s) handling orders.');
        }).catch(function (e) { say(e.message, true); });
    }

    if (section === 'architect' || section === 'partner' || section === 'supplier') {
      var onlineParam = fltOnline && fltOnline.checked ? 'true' : 'false';
      return api('/admin/users?online=' + onlineParam + '&role=' + encodeURIComponent(section))
        .then(function (d) {
          var rows = d.data || [];
          var label = SECTION_META[section].title;
          render(usersEl, rows, userCard, 'No ' + label.toLowerCase() + ' found for this filter.');
          if (!fltOnline || !fltOnline.checked) setCount('cnt-' + section, rows.length);
          say(rows.length + ' ' + label.toLowerCase() + ' shown.');
        }).catch(function (e) { say(e.message, true); });
    }

    if (section === 'orders') {
      return fetchAssignablePool().then(function () {
        return api('/admin/orders');
      }).then(function (d) {
        cachedOrders = d.data || [];
        setCount('cnt-orders', cachedOrders.length);
        renderFilteredOrders();
      }).catch(function (e) { say(e.message, true); });
    }

    return api('/admin/carts')
      .then(function (d) {
        var rows = d.data || [];
        setCount('cnt-carts', rows.length);
        render(cartsEl, rows, cartCard, 'No client has items in the cart right now.');
        say(rows.length + ' live cart(s).');
      })
      .catch(function (e) { say(e.message, true); });
  }

  function setSection(section) {
    currentSection = section;
    navItems.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-section') === section);
    });
    var meta = SECTION_META[section] || SECTION_META.orders;
    secTitle.textContent = meta.title;
    secSub.textContent = meta.sub;

    ordersEl.hidden = section !== 'orders';
    usersEl.hidden = !(section === 'busy' || section === 'architect' || section === 'partner' || section === 'supplier');
    cartsEl.hidden = section !== 'carts';
    filterOrdersBox.hidden = section !== 'orders';
    filterUsersBox.hidden = !(section === 'architect' || section === 'partner' || section === 'supplier');

    if (isMobile()) closeMobileDrawer();
    load(section);
  }

  navItems.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setSection(btn.getAttribute('data-section'));
    });
  });

  $('ad-refresh').addEventListener('click', function () {
    load(currentSection);
    refreshDrawerCounts();
  });

  if (fltOrderStatus) fltOrderStatus.addEventListener('change', renderFilteredOrders);
  if (fltOnline) fltOnline.addEventListener('change', function () { load(currentSection); });

  $('ad-logout').addEventListener('click', function () {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
    location.replace(EXIT_PAGE);
  });

  api('/admin/me')
    .then(function (d) { $('ad-name').textContent = (d.admin && d.admin.username) || 'Admin'; })
    .catch(function () { return null; })
    .then(function () {
      setSection('orders');
      refreshDrawerCounts();
    });
})();
