(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var ROLE_LABELS = { supplier: 'Supplier', partner: 'Partner', architect: 'Architect', site_inspector: 'Site Inspector' };
  var $ = function (id) { return document.getElementById(id); };

  var state = { role: null, phoneOk: false, verified: false, otpToken: null, usernameOk: false, passwordOk: false };
  var el = {
    stepRole: $('step-role'), stepSignup: $('step-signup'), stepDone: $('step-done'),
    chosen: $('chosen-role'), phone: $('phone'), phoneHint: $('phone-hint'), send: $('send-otp'),
    otpField: $('otp-field'), otp: $('otp'), otpHint: $('otp-hint'), verify: $('verify-otp'), resend: $('resend-otp'),
    username: $('username'), usernameHint: $('username-hint'), password: $('password'), passwordHint: $('password-hint'),
    toggle: $('toggle-password'), agree: $('agree'), create: $('create-btn'), error: $('form-error')
  };
  var fieldOf = function (input) { return input.closest('.field'); };

  function mark(input, hintEl, status, text) {
    var f = fieldOf(input);
    f.classList.toggle('ok', status === 'ok');
    f.classList.toggle('bad', status === 'bad');
    if (text !== undefined) hintEl.textContent = text;
  }

  function api(path, options) {
    return fetch(API + path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var err = new Error(data.message || 'Something went wrong. Please try again.'); err.status = res.status; throw err; }
        return data;
      });
    });
  }
  function post(path, body) {
    return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); };
  }

  // role selection
  var cards = Array.prototype.slice.call(document.querySelectorAll('.role-card'));
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var role = card.getAttribute('data-role');
      if (state.role !== role) resetForm();
      state.role = role;
      cards.forEach(function (c) { c.setAttribute('aria-checked', c === card ? 'true' : 'false'); });
      el.chosen.textContent = ROLE_LABELS[role];
      el.stepSignup.hidden = false;
      el.stepSignup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  $('change-role').addEventListener('click', function () {
    el.stepRole.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function resetForm() {
    state.phoneOk = state.verified = state.usernameOk = state.passwordOk = false;
    state.otpToken = null;
    $('signup-form').reset();
    ['phone', 'otp', 'username', 'password'].forEach(function (n) { var f = document.querySelector('[data-field="' + n + '"]'); if (f) f.classList.remove('ok', 'bad'); });
    el.phoneHint.textContent = el.otpHint.textContent = '';
    el.phone.disabled = false;
    el.otpField.hidden = true;
    el.send.hidden = false;
    el.send.disabled = true;
    setAccountFieldsEnabled(false);
    el.error.hidden = true;
    refresh();
  }

  function setAccountFieldsEnabled(on) {
    el.username.disabled = el.password.disabled = el.toggle.disabled = !on;
  }

  // phone: digits only, live availability check
  var checkPhone = debounce(function (phone) {
    api('/availability?phone=' + phone).then(function (d) {
      if (el.phone.value !== phone) return;
      state.phoneOk = d.available;
      mark(el.phone, el.phoneHint, d.available ? 'ok' : 'bad', d.available ? 'Number is available.' : 'This number is already registered. Try logging in from the app.');
      el.send.disabled = !d.available;
    }).catch(function (e) {
      if (el.phone.value !== phone) return;
      mark(el.phone, el.phoneHint, 'bad', e.status === 429 ? 'Too many attempts. Please wait a moment.' : 'Could not check the number. Please try again.');
    });
  }, 400);

  el.phone.addEventListener('input', function () {
    el.phone.value = el.phone.value.replace(/\D/g, '').slice(0, 10);
    var v = el.phone.value;
    state.phoneOk = false;
    el.send.disabled = true;
    if (!v) return mark(el.phone, el.phoneHint, '', '');
    if (!/^[6-9]/.test(v)) return mark(el.phone, el.phoneHint, 'bad', 'Mobile number must start with 6, 7, 8 or 9.');
    if (v.length < 10) return mark(el.phone, el.phoneHint, '', v.length + ' of 10 digits');
    mark(el.phone, el.phoneHint, '', 'Checking availability...');
    checkPhone(v);
  });

  // OTP
  var resendTimer = null;
  function startResendTimer(seconds) {
    clearInterval(resendTimer);
    var left = seconds;
    el.resend.disabled = true;
    el.resend.textContent = 'Resend OTP in ' + left + 's';
    resendTimer = setInterval(function () {
      left -= 1;
      if (left <= 0) { clearInterval(resendTimer); el.resend.disabled = false; el.resend.textContent = 'Resend OTP'; }
      else el.resend.textContent = 'Resend OTP in ' + left + 's';
    }, 1000);
  }
  function sendOtp(button) {
    button.disabled = true;
    return post('/otp/send', { phone: el.phone.value }).then(function (d) {
      el.otpField.hidden = false;
      el.send.hidden = true;
      el.otp.focus();
      mark(el.otp, el.otpHint, '', 'We sent a 6 digit OTP to +91 ' + el.phone.value + '.');
      startResendTimer(d.resend_after || 30);
    }).catch(function (e) {
      button.disabled = false;
      var target = el.otpField.hidden ? el.phoneHint : el.otpHint;
      mark(el.otpField.hidden ? el.phone : el.otp, target, 'bad', e.message);
    });
  }
  el.send.addEventListener('click', function () { sendOtp(el.send); });
  el.resend.addEventListener('click', function () { sendOtp(el.resend); });

  el.otp.addEventListener('input', function () {
    el.otp.value = el.otp.value.replace(/\D/g, '').slice(0, 6);
    el.verify.disabled = el.otp.value.length !== 6;
  });
  el.verify.addEventListener('click', function () {
    el.verify.disabled = true;
    post('/otp/verify', { phone: el.phone.value, otp: el.otp.value }).then(function (d) {
      state.verified = true;
      state.otpToken = d.otpToken;
      clearInterval(resendTimer);
      el.phone.disabled = el.otp.disabled = true;
      el.resend.hidden = el.verify.hidden = true;
      mark(el.otp, el.otpHint, 'ok', 'Mobile number verified.');
      setAccountFieldsEnabled(true);
      el.username.focus();
      refresh();
    }).catch(function (e) {
      el.verify.disabled = false;
      mark(el.otp, el.otpHint, 'bad', e.message);
    });
  });

  // username
  var checkUsername = debounce(function (name) {
    api('/availability?username=' + encodeURIComponent(name)).then(function (d) {
      if (el.username.value.trim() !== name) return;
      state.usernameOk = d.available;
      mark(el.username, el.usernameHint, d.available ? 'ok' : 'bad', d.available ? 'Username is available.' : 'This username is taken. Try another one.');
      refresh();
    }).catch(function () {
      mark(el.username, el.usernameHint, 'bad', 'Could not check the username. Please try again.');
    });
  }, 400);
  el.username.addEventListener('input', function () {
    var v = el.username.value.trim();
    state.usernameOk = false;
    refresh();
    if (!v) return mark(el.username, el.usernameHint, '', 'Letters, numbers, dot or underscore. At least 3 characters.');
    if (!/^[A-Za-z0-9._]{3,60}$/.test(v)) return mark(el.username, el.usernameHint, 'bad', 'Use at least 3 letters, numbers, dot or underscore.');
    mark(el.username, el.usernameHint, '', 'Checking availability...');
    checkUsername(v);
  });

  // password
  el.password.addEventListener('input', function () {
    var v = el.password.value;
    state.passwordOk = v.length >= 6 && /[A-Za-z]/.test(v) && /\d/.test(v);
    if (!v) mark(el.password, el.passwordHint, '', 'At least 6 characters, mixing letters and numbers.');
    else mark(el.password, el.passwordHint, state.passwordOk ? 'ok' : 'bad', state.passwordOk ? 'Strong enough.' : 'Use at least 6 characters with both letters and numbers.');
    refresh();
  });
  el.toggle.addEventListener('click', function () {
    var show = el.password.type === 'password';
    el.password.type = show ? 'text' : 'password';
    el.toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
    el.toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    el.toggle.querySelector('.eye-open').hidden = show;
    el.toggle.querySelector('.eye-off').hidden = !show;
  });

  el.agree.addEventListener('change', refresh);
  function refresh() {
    el.create.disabled = !(el.agree.checked && state.verified && state.usernameOk && state.passwordOk);
  }

  // submit
  $('signup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (el.create.disabled) return;
    el.create.disabled = true;
    el.create.textContent = 'Creating account...';
    el.error.hidden = true;
    post('/register', {
      role: state.role, phone: el.phone.value, otpToken: state.otpToken, termsAccepted: true,
      username: el.username.value.trim(), password: el.password.value
    }).then(function (d) {
      try { sessionStorage.setItem('ig_session', JSON.stringify({ uuid: d.uuid, role: d.role, accessToken: d.accessToken, refreshToken: d.refreshToken })); } catch (err) { /* storage unavailable */ }
      el.stepRole.hidden = el.stepSignup.hidden = true;
      var ph = el.phone.value, un = el.username.value.trim();
      $('done-summary').textContent = ROLE_LABELS[state.role] + ' - +91 ' + ph + ' - ' + un;
      el.stepDone.hidden = false;
      $('step-business').hidden = false;
      $('step-business').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (err) {
      el.error.textContent = err.message;
      el.error.hidden = false;
      el.create.textContent = 'Create account';
      refresh();
    });
  });

  // terms and privacy, fetched from the backend (stored in the admin_uploads bucket)
  var modal = $('doc-modal'), body = $('doc-body'), lastFocus = null;
  var DOC_TITLES = { terms: 'Terms & Conditions', privacy: 'Privacy Policy' };
  function renderBlocks(blocks) {
    body.textContent = '';
    var list = null;
    blocks.forEach(function (b) {
      var bullet = b.type === 'paragraph' && /^[-•]\s+/.test(b.text);
      if (!bullet) list = null;
      var node;
      if (bullet) {
        if (!list) { list = document.createElement('ul'); body.appendChild(list); }
        node = document.createElement('li');
        node.textContent = b.text.replace(/^[-•]\s+/, '');
        list.appendChild(node);
        return;
      }
      node = document.createElement(b.type === 'title' ? 'h3' : b.type === 'heading' ? 'h4' : 'p');
      node.textContent = b.text;
      body.appendChild(node);
    });
  }
  function openDoc(doc) {
    lastFocus = document.activeElement;
    $('doc-title').textContent = DOC_TITLES[doc];
    body.textContent = 'Loading...';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('doc-close').focus();
    api('/content/common/' + doc).then(function (d) { renderBlocks(d.blocks || []); })
      .catch(function () { body.textContent = 'This document could not be loaded right now. Please try again in a moment.'; });
  }
  function closeDoc() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.doc-link'), function (b) {
    b.addEventListener('click', function () { openDoc(b.getAttribute('data-doc')); });
  });
  $('doc-close').addEventListener('click', closeDoc);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeDoc(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeDoc(); });
})();

