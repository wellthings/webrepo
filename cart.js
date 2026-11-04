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

  function close() { wrap.hidden = true; document.body.style.overflow = ''; }
  wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  wrap.querySelector('.sheet-close').addEventListener('click', close);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  var step = 'list';
  function render() {
    body.textContent = '';
    var list = items();
    if (!list.length) {
      step = 'list';
      body.appendChild(el('p', 'sheet-hint', 'Your cart is empty. Add services from the home page.'));
      return;
    }
    if (step === 'form') return renderForm();
    list.forEach(function (it, idx) {
      var row = el('div', 'cart-item');
      if (it.img) { var im = el('img'); im.alt = ''; im.src = it.img; im.onerror = function () { im.style.visibility = 'hidden'; }; row.appendChild(im); } else row.appendChild(el('span', 'ph'));
      var d = el('div'); d.appendChild(el('strong', '', it.label)); d.appendChild(el('small', '', it.catName + ' - ' + (MODE_LABEL[it.mode] || it.mode)));
      row.appendChild(d);
      var rm = el('button', '', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', function () { var l = items(); l.splice(idx, 1); save(l); });
      row.appendChild(rm);
      body.appendChild(row);
    });
    var go = el('button', 'btn', 'Proceed'); go.type = 'button';
    go.addEventListener('click', function () {
      if (read(CLIENT)) return submit(read(CLIENT), go);
      step = 'form'; render();
    });
    body.appendChild(go);
    body.appendChild(el('p', 'cart-msg', ''));
  }

  function renderForm() {
    var loc = read(LOC) || {};
    var f = el('form', 'cart-form');
    f.noValidate = true;
    f.innerHTML =
      '<p class="sheet-hint">Sign up to send your request.</p>' +
      '<label for="cf-name">Your name</label><input id="cf-name" autocomplete="name" maxlength="80">' +
      '<label for="cf-phone">Mobile number</label><input id="cf-phone" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10 digit mobile number">' +
      '<label for="cf-loc">Location name</label><input id="cf-loc" autocomplete="street-address" maxlength="200" placeholder="Area, city">' +
      '<button type="submit" class="btn">Send request</button><p class="cart-msg err" role="alert"></p>';
    body.appendChild(f);
    var inLoc = f.querySelector('#cf-loc'); inLoc.value = loc.address || '';
    var phone = f.querySelector('#cf-phone');
    phone.addEventListener('input', function () { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });
    var msg = f.querySelector('.cart-msg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = { name: f.querySelector('#cf-name').value.trim(), phone: phone.value, location_name: inLoc.value.trim() };
      if (c.name.length < 2) { msg.textContent = 'Enter your name.'; return; }
      if (!/^[6-9]\d{9}$/.test(c.phone)) { msg.textContent = 'Enter a valid 10 digit mobile number.'; return; }
      if (c.location_name.length < 2) { msg.textContent = 'Enter your location name.'; return; }
      localStorage.setItem(CLIENT, JSON.stringify(c));
      step = 'list';
      submit(c, f.querySelector('.btn'), msg);
    });
  }

  function submit(c, btn, msgEl) {
    var loc = read(LOC) || {};
    var payload = {
      name: c.name, phone: c.phone, location_name: c.location_name,
      items: items().map(function (i) { return { category: i.catName, module: i.label, mode: i.mode }; })
    };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') { payload.latitude = loc.lat; payload.longitude = loc.lng; }
    var msg = msgEl || body.querySelector('.cart-msg');
    btn.disabled = true;
    fetch(API + '/cart-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.message || 'Could not send. Please try again.'); }); })
      .then(function () {
        localStorage.removeItem(KEY); updateBadges();
        body.textContent = '';
        body.appendChild(el('p', 'cart-msg ok', 'Request sent. Our team will contact you soon.'));
      })
      .catch(function (err) { btn.disabled = false; step = 'list'; if (msg) { msg.className = 'cart-msg err'; msg.textContent = err.message; } });
  }

  function open() { step = 'list'; render(); wrap.hidden = false; document.body.style.overflow = 'hidden'; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cart-open]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !wrap.hidden) close(); });

  window.IGCart = { add: add, open: open, items: items };
  updateBadges();
})();
