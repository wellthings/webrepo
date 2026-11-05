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
  var sentItems = null;

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

  function summary(list, withRemove) {
    var box = el('div', 'cart-summary');
    list.forEach(function (it, idx) {
      var row = el('div', 'cart-item');
      if (it.img) { var im = el('img'); im.alt = ''; im.src = it.img; im.onerror = function () { im.style.visibility = 'hidden'; }; row.appendChild(im); } else row.appendChild(el('span', 'ph'));
      var d = el('div'); d.appendChild(el('strong', '', it.label)); d.appendChild(el('small', '', it.catName + ' - ' + (MODE_LABEL[it.mode] || it.mode)));
      row.appendChild(d);
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
    body.textContent = '';
    var list = items();
    if (step === 'done') return renderDone();
    if (!list.length) {
      step = 'list';
      body.appendChild(el('p', 'sheet-hint', 'Your cart is empty. Add services from the home page.'));
      return;
    }
    if (step === 'signup') return renderSignup(list);
    if (step === 'confirm') return renderConfirm(list);
    body.appendChild(summary(list, true));
    var go = el('button', 'btn', 'Proceed'); go.type = 'button';
    go.addEventListener('click', function () {
      var c = read(CLIENT), loc = read(LOC) || {};
      // signed up and an address is known: review and send; otherwise sign up first
      step = c && c.token && (loc.address || c.location_name) ? 'confirm' : 'signup';
      render();
    });
    body.appendChild(go);
  }

  function locationPayload(addr) {
    var loc = read(LOC) || {};
    var p = { location_name: addr };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number' && loc.address === addr) { p.latitude = loc.lat; p.longitude = loc.lng; }
    return p;
  }

  function sendRequest(addr, btn, msg) {
    var c = read(CLIENT);
    var payload = locationPayload(addr);
    payload.items = items().map(function (i) { return { category: i.catName, module: i.label, mode: i.mode }; });
    btn.disabled = true;
    return post('/cart-requests', payload, c && c.token).then(function () {
      sentItems = items();
      localStorage.removeItem(KEY); updateBadges();
      step = 'done'; render();
    }).catch(function (err) {
      btn.disabled = false;
      if (err.status === 401) { localStorage.removeItem(CLIENT); step = 'signup'; render(); return; }
      msg.textContent = err.message;
    });
  }

  function locationField(f, input, hint) {
    var useBtn = f.querySelector('.use-loc');
    function onLoc(e) { if (e.detail && e.detail.address) { input.value = e.detail.address; hint.textContent = ''; useBtn.disabled = false; useBtn.textContent = 'Use my current location'; } }
    document.addEventListener('ig:location', onLoc);
    useBtn.addEventListener('click', function () {
      useBtn.disabled = true; useBtn.textContent = 'Getting location...';
      document.dispatchEvent(new CustomEvent('ig:location-request'));
      setTimeout(function () { if (useBtn.disabled) { useBtn.disabled = false; useBtn.textContent = 'Use my current location'; hint.textContent = 'Could not get your location. Please type your address.'; } }, 16000);
    });
    if (!input.value) document.dispatchEvent(new CustomEvent('ig:location-request'));
  }

  function renderConfirm(list) {
    var c = read(CLIENT) || {}, loc = read(LOC) || {};
    body.appendChild(el('p', 'sheet-hint', 'You selected ' + list.length + (list.length === 1 ? ' service' : ' services') + ':'));
    body.appendChild(summary(list, false));
    var f = el('form', 'cart-form');
    f.noValidate = true;
    f.innerHTML =
      '<p class="cart-who"></p>' +
      '<label for="cf-loc">Your address</label><input id="cf-loc" autocomplete="street-address" maxlength="200" placeholder="Area, city">' +
      '<button type="button" class="link-btn use-loc">Use my current location</button><p class="cart-msg err" role="alert"></p>' +
      '<button type="submit" class="btn">Send request</button>' +
      '<button type="button" class="link-btn back">Back to cart</button>';
    f.querySelector('.cart-who').textContent = c.name + ' · +91 ' + c.phone;
    body.appendChild(f);
    var input = f.querySelector('#cf-loc'), msg = f.querySelector('.cart-msg');
    input.value = loc.address || c.location_name || '';
    locationField(f, input, msg);
    f.querySelector('.back').addEventListener('click', function () { step = 'list'; render(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var addr = input.value.trim();
      if (addr.length < 2) { msg.textContent = 'Please add your address.'; return; }
      sendRequest(addr, f.querySelector('.btn'), msg);
    });
  }

  function renderSignup(list) {
    var loc = read(LOC) || {};
    body.appendChild(el('p', 'sheet-hint', 'Sign up to send your ' + list.length + (list.length === 1 ? ' selected service' : ' selected services') + ':'));
    body.appendChild(summary(list, false));
    var f = el('form', 'cart-form');
    f.noValidate = true;
    f.innerHTML =
      '<label for="cf-name">Your name</label><input id="cf-name" autocomplete="name" maxlength="80">' +
      '<label for="cf-phone">Mobile number</label>' +
      '<div class="otp-row"><input id="cf-phone" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10 digit mobile number"><button type="button" class="btn-alt send-otp">Send OTP</button></div>' +
      '<div class="otp-field" hidden><label for="cf-otp">OTP</label><input id="cf-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digit OTP"></div>' +
      '<label for="cf-loc">Your address</label><input id="cf-loc" autocomplete="street-address" maxlength="200" placeholder="Area, city">' +
      '<button type="button" class="link-btn use-loc">Use my current location</button>' +
      '<p class="cart-msg err" role="alert"></p>' +
      '<button type="submit" class="btn" disabled>Verify &amp; send request</button>' +
      '<button type="button" class="link-btn back">Back to cart</button>';
    body.appendChild(f);
    var name = f.querySelector('#cf-name'), phone = f.querySelector('#cf-phone'), otp = f.querySelector('#cf-otp');
    var inLoc = f.querySelector('#cf-loc'), msg = f.querySelector('.cart-msg');
    var sendBtn = f.querySelector('.send-otp'), submitBtn = f.querySelector('button[type=submit]'), otpField = f.querySelector('.otp-field');
    inLoc.value = loc.address || '';
    locationField(f, inLoc, msg);
    var timer = null;

    phone.addEventListener('input', function () { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });
    otp.addEventListener('input', function () { otp.value = otp.value.replace(/\D/g, '').slice(0, 6); submitBtn.disabled = otp.value.length !== 6; });
    f.querySelector('.back').addEventListener('click', function () { clearInterval(timer); step = 'list'; render(); });

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
      var addr = inLoc.value.trim();
      if (name.value.trim().length < 2) { msg.textContent = 'Enter your name.'; return; }
      if (addr.length < 2) { msg.textContent = 'Please add your address or use current location.'; return; }
      submitBtn.disabled = true; msg.textContent = '';
      post('/otp/verify', { phone: phone.value, otp: otp.value })
        .then(function (v) {
          var p = locationPayload(addr);
          p.name = name.value.trim(); p.phone = phone.value; p.otpToken = v.otpToken;
          return post('/client/signup', p);
        })
        .then(function (d) {
          clearInterval(timer);
          localStorage.setItem(CLIENT, JSON.stringify({ token: d.token, name: d.client.name, phone: d.client.phone, location_name: addr }));
          return sendRequest(addr, submitBtn, msg);
        })
        .catch(function (err) { submitBtn.disabled = otp.value.length !== 6; msg.textContent = err.message; });
    });
  }

  function renderDone() {
    body.appendChild(el('p', 'cart-msg ok', 'Request sent. Our partner will contact you shortly.'));
    if (sentItems && sentItems.length) {
      body.appendChild(el('p', 'sheet-hint', 'Your selection:'));
      body.appendChild(summary(sentItems, false));
    }
    var ok = el('button', 'btn', 'Done'); ok.type = 'button';
    ok.addEventListener('click', function () { sentItems = null; step = 'list'; close(); render(); });
    body.appendChild(ok);
  }

  function open() { if (step !== 'done') step = 'list'; render(); wrap.hidden = false; document.body.style.overflow = 'hidden'; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cart-open]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !wrap.hidden) close(); });

  window.IGCart = { add: add, open: open, items: items };
  updateBadges();
})();
