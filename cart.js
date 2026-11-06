(function () {
  var SITE = window.SITE || {};
  var API = SITE.apiBase;
  var KEY = 'ig_cart', CLIENT = 'ig_client', LOC = 'ig_loc';
  var MODE_LABEL = { new: 'New', repair: 'Repairing', full_interior: 'Full interior' };

  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function items() { return read(KEY) || []; }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); render(); updateBadges(); }

  function add(item) {
    var list = items().filter(function (i) { return !(i.cat === item.cat && i.module === item.module); });
    list.push(item);
    save(list);
  }

  function updateBadges() {
    var n = items().length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (b) { b.textContent = n; b.hidden = !n; });
  }

  var wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.hidden = true;
  wrap.innerHTML =
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="Your cart">' +
    '<button type="button" class="sheet-close" aria-label="Close">&times;</button>' +
    '<div class="sheet-head"><h3>Your cart</h3></div><div class="sheet-body" id="cart-body"></div></div>';
  document.body.appendChild(wrap);
  var body = wrap.querySelector('#cart-body');

  function close() { wrap.hidden = true; document.body.style.overflow = ''; if (step === 'done') { step = ''; sentItems = null; render(); } }
  wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  wrap.querySelector('.sheet-close').addEventListener('click', close);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // step: 'signup' (slide 1) -> 'order' (slide 2) -> 'done'
  var step = '';
  var sentItems = null;
  var timer = null;

  function signedIn() { var c = read(CLIENT); return !!(c && c.token); }
  function initialStep() { return signedIn() ? 'order' : 'signup'; }

  function post(path, data, token) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(API + path, { method: 'POST', headers: headers, body: JSON.stringify(data) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.message || d.error || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
        return d;
      });
    });
  }

  // one item as: Work type / Work unit / Requirement type
  function spec(type, unit, mode) {
    var d = el('div', 'spec');
    [['Work type', type], ['Work unit', unit], ['Requirement type', MODE_LABEL[mode] || mode]].forEach(function (r) {
      var p = el('p'); p.appendChild(el('span', '', r[0] + ': ')); p.appendChild(el('b', '', r[1])); d.appendChild(p);
    });
    return d;
  }

  function summary(list, withRemove) {
    var box = el('div', 'cart-summary');
    list.forEach(function (it, idx) {
      var row = el('div', 'cart-item');
      if (it.img) { var im = el('img'); im.alt = ''; im.src = it.img; im.onerror = function () { im.style.visibility = 'hidden'; }; row.appendChild(im); } else row.appendChild(el('span', 'ph'));
      row.appendChild(spec(it.catName, it.label, it.mode));
      if (withRemove) {
        var rm = el('button', '', 'Remove'); rm.type = 'button';
        rm.addEventListener('click', function () { var l = items(); l.splice(idx, 1); save(l); });
        row.appendChild(rm);
      }
      box.appendChild(row);
    });
    return box;
  }

  function render() {
    clearInterval(timer);
    body.textContent = '';
    body._slides = null;
    if (!step) step = initialStep();
    if (step === 'done') return renderDone();
    var list = items();
    if (!list.length) {
      body.appendChild(el('p', 'sheet-hint', 'Your cart is empty. Add services from the home page.'));
      return;
    }
    var slides = el('div', 'slides'), track = el('div', 'slide-track');
    var s1 = el('div', 'slide'), s2 = el('div', 'slide');
    track.appendChild(s1); track.appendChild(s2); slides.appendChild(track); body.appendChild(slides);
    buildSignup(s1, list, function () { goTo('order'); });
    buildOrder(s2, list);
    var on2 = step === 'order';
    track.classList.toggle('on-2', on2);
    (on2 ? s1 : s2).classList.add('off');
    slides._parts = { track: track, s1: s1, s2: s2 };
    body._slides = slides;
  }

  // slides sideways to the order popup (or back to signup if the session expired)
  function goTo(next) {
    var sl = body._slides;
    if (!sl) { step = next; render(); return; }
    var p = sl._parts, to = next === 'order' ? p.s2 : p.s1, from = next === 'order' ? p.s1 : p.s2;
    step = next;
    to.classList.remove('off');
    p.track.classList.toggle('on-2', next === 'order');
    setTimeout(function () { from.classList.add('off'); }, 380);
    wrap.querySelector('.sheet').scrollTop = 0;
  }

  function locationPayload() {
    var loc = read(LOC) || {}, c = read(CLIENT) || {};
    var p = { location_name: loc.address || c.location_name || 'Not shared' };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') { p.latitude = loc.lat; p.longitude = loc.lng; }
    return p;
  }

  function buildSignup(box, list, onSignedUp) {
    box.appendChild(el('h4', 'slide-title', 'Sign up to continue'));
    box.appendChild(el('p', 'sheet-hint', 'You have ' + list.length + (list.length === 1 ? ' service' : ' services') + ' in your cart. Verify your mobile number to place the order.'));
    var f = el('form', 'cart-form');
    f.noValidate = true;
    f.innerHTML =
      '<label for="cf-name">Your name</label><input id="cf-name" autocomplete="name" maxlength="80">' +
      '<label for="cf-phone">Mobile number</label>' +
      '<div class="otp-row"><input id="cf-phone" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10 digit mobile number"><button type="button" class="btn-alt send-otp">Send OTP</button></div>' +
      '<div class="otp-field" hidden><label for="cf-otp">OTP</label><input id="cf-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digit OTP"></div>' +
      '<p class="cart-msg err" role="alert"></p>' +
      '<button type="submit" class="btn" disabled>Verify &amp; sign up</button>';
    box.appendChild(f);
    var name = f.querySelector('#cf-name'), phone = f.querySelector('#cf-phone'), otp = f.querySelector('#cf-otp');
    var msg = f.querySelector('.cart-msg'), sendBtn = f.querySelector('.send-otp'), submitBtn = f.querySelector('button[type=submit]'), otpField = f.querySelector('.otp-field');

    phone.addEventListener('input', function () { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });
    otp.addEventListener('input', function () { otp.value = otp.value.replace(/\D/g, '').slice(0, 6); submitBtn.disabled = otp.value.length !== 6; });

    sendBtn.addEventListener('click', function () {
      msg.className = 'cart-msg err';
      if (!/^[6-9]\d{9}$/.test(phone.value)) { msg.textContent = 'Enter a valid 10 digit mobile number.'; return; }
      sendBtn.disabled = true; msg.textContent = '';
      post('/client/otp/send', { phone: phone.value }).then(function (d) {
        otpField.hidden = false; otp.focus();
        msg.className = 'cart-msg'; msg.textContent = 'OTP sent to +91 ' + phone.value + '.';
        var left = d.resend_after || 30;
        sendBtn.textContent = 'Resend in ' + left + 's';
        clearInterval(timer);
        timer = setInterval(function () {
          left--;
          if (left <= 0) { clearInterval(timer); sendBtn.disabled = false; sendBtn.textContent = 'Resend OTP'; } else sendBtn.textContent = 'Resend in ' + left + 's';
        }, 1000);
      }).catch(function (err) { sendBtn.disabled = false; msg.textContent = err.message; });
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'cart-msg err';
      if (name.value.trim().length < 2) { msg.textContent = 'Enter your name.'; return; }
      submitBtn.disabled = true; msg.textContent = '';
      post('/otp/verify', { phone: phone.value, otp: otp.value })
        .then(function (v) {
          var p = locationPayload();
          p.name = name.value.trim(); p.phone = phone.value; p.otpToken = v.otpToken;
          return post('/client/signup', p);
        })
        .then(function (d) {
          clearInterval(timer);
          localStorage.setItem(CLIENT, JSON.stringify({ token: d.token, name: d.client.name, phone: d.client.phone, location_name: locationPayload().location_name }));
          var who = body.querySelector('.cart-who');
          if (who) who.textContent = d.client.name + ' · +91 ' + d.client.phone;
          onSignedUp();
        })
        .catch(function (err) { submitBtn.disabled = otp.value.length !== 6; msg.textContent = err.message; });
    });
  }

  function buildOrder(box, list) {
    var c = read(CLIENT) || {};
    box.appendChild(el('h4', 'slide-title', 'Your order'));
    box.appendChild(el('p', 'cart-who', c.name ? c.name + ' · +91 ' + c.phone : ''));
    box.appendChild(summary(list, true));
    var msg = el('p', 'cart-msg err'); msg.setAttribute('role', 'alert');
    var go = el('button', 'btn', 'Proceed'); go.type = 'button';
    go.addEventListener('click', function () {
      var cur = read(CLIENT);
      var payload = locationPayload();
      payload.items = items().map(function (i) { return { category: i.catName, module: i.label, mode: i.mode }; });
      go.disabled = true; msg.textContent = '';
      post('/cart-requests', payload, cur && cur.token).then(function () {
        sentItems = items();
        rememberOrder(sentItems);
        localStorage.removeItem(KEY); updateBadges();
        step = 'done'; render();
      }).catch(function (err) {
        go.disabled = false;
        if (err.status === 401) { localStorage.removeItem(CLIENT); goTo('signup'); return; }
        msg.textContent = err.message;
      });
    });
    box.appendChild(msg);
    box.appendChild(go);
  }

  function renderDone() {
    var ok = el('div', 'order-ok');
    ok.appendChild(el('span', 'tick', '✓'));
    ok.appendChild(el('h4', '', 'Order placed'));
    ok.appendChild(el('p', '', 'Our partner will contact you shortly.'));
    body.appendChild(ok);
    if (sentItems && sentItems.length) body.appendChild(summary(sentItems, false));
    var done = el('button', 'btn', 'Done'); done.type = 'button';
    done.addEventListener('click', close);
    body.appendChild(done);
  }

  // ---- Orders sheet ----
  var ORDERS = 'ig_orders';
  var STATUS = { new: 'Order under process', contacted: 'Partner will contact you', closed: 'Completed' };
  function rememberOrder(list) {
    var all = read(ORDERS) || [];
    all.unshift({ status: 'new', created_at: new Date().toISOString(), items: list.map(function (i) { return { category: i.catName, module: i.label, mode: i.mode }; }) });
    localStorage.setItem(ORDERS, JSON.stringify(all.slice(0, 20)));
  }

  var owrap = document.createElement('div');
  owrap.className = 'sheet-wrap';
  owrap.hidden = true;
  owrap.innerHTML =
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="Your orders">' +
    '<button type="button" class="sheet-close" aria-label="Close">&times;</button>' +
    '<div class="sheet-head"><h3>Your orders</h3></div><div class="sheet-body" id="orders-body"></div></div>';
  document.body.appendChild(owrap);
  var obody = owrap.querySelector('#orders-body');
  function closeOrders() { owrap.hidden = true; document.body.style.overflow = ''; }
  owrap.addEventListener('click', function (e) { if (e.target === owrap) closeOrders(); });
  owrap.querySelector('.sheet-close').addEventListener('click', closeOrders);

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  function renderOrders(list) {
    obody.textContent = '';
    if (!list.length) { obody.appendChild(el('p', 'sheet-hint', 'No orders yet. Add services to your cart and place an order.')); return; }
    list.forEach(function (o) {
      var card = el('div', 'order-card');
      var top = el('div', 'order-top');
      top.appendChild(el('span', 'order-status st-' + o.status, STATUS[o.status] || 'Order under process'));
      top.appendChild(el('small', '', fmtDate(o.created_at)));
      card.appendChild(top);
      (o.items || []).forEach(function (i) {
        var line = el('div', 'order-line'); line.appendChild(spec(i.category, i.module, i.mode)); card.appendChild(line);
      });
      obody.appendChild(card);
    });
  }
  function openOrders() {
    owrap.hidden = false; document.body.style.overflow = 'hidden';
    var c = read(CLIENT), local = read(ORDERS) || [];
    obody.textContent = '';
    if (!c || !c.token) { renderOrders(local); return; }
    obody.appendChild(el('p', 'sheet-hint', 'Loading your orders...'));
    fetch(API + '/client/orders', { headers: { Authorization: 'Bearer ' + c.token } })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) { renderOrders(d.data || []); })
      .catch(function () { renderOrders(local); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-orders-open]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); openOrders(); });
  });

  function open() { if (step !== 'done') step = initialStep(); render(); wrap.hidden = false; document.body.style.overflow = 'hidden'; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cart-open]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!wrap.hidden) close(); if (!owrap.hidden) closeOrders(); } });

  window.IGCart = { add: add, open: open, items: items };
  updateBadges();
})();
