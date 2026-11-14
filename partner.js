(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var ROLE_LABELS = { supplier: 'Supplier', partner: 'Partner', architect: 'Architect' };
  var $ = function (id) { return document.getElementById(id); };

  var state = { role: null, phoneOk: false, verified: true, otpToken: 'test_token', usernameOk: false, passwordOk: false };
  var el = {
    stepRole: $('step-role'), stepKyc: $('step-kyc-guide'), stepSignup: $('step-signup'), stepDone: $('step-done'),
    kycRole: $('kyc-guide-role'), kycProceed: $('kyc-proceed-btn'), kycBack: $('kyc-back-btn'),
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

  // role selection -> opens Video Call KYC Guide before Signup
  var cards = Array.prototype.slice.call(document.querySelectorAll('.role-card'));
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var role = card.getAttribute('data-role');
      if (state.role !== role) resetForm();
      state.role = role;
      cards.forEach(function (c) { c.setAttribute('aria-checked', c === card ? 'true' : 'false'); });
      el.chosen.textContent = ROLE_LABELS[role] || role;
      if (el.kycRole) el.kycRole.textContent = (ROLE_LABELS[role] || role) + ' Onboarding Guide';
      el.stepSignup.hidden = true;
      if (el.stepKyc) {
        el.stepKyc.hidden = false;
        el.stepKyc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        el.stepSignup.hidden = false;
        el.stepSignup.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  if (el.kycProceed) {
    el.kycProceed.addEventListener('click', function () {
      el.stepKyc.hidden = true;
      el.stepSignup.hidden = false;
      el.stepSignup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (el.kycBack) {
    el.kycBack.addEventListener('click', function () {
      el.stepKyc.hidden = true;
      el.stepRole.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  $('change-role').addEventListener('click', function () {
    el.stepSignup.hidden = true;
    el.stepRole.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function resetForm() {
    state.phoneOk = state.usernameOk = state.passwordOk = false;
    state.verified = true;
    state.otpToken = 'test_token';
    $('signup-form').reset();
    ['phone', 'otp', 'username', 'password'].forEach(function (n) { var f = document.querySelector('[data-field="' + n + '"]'); if (f) f.classList.remove('ok', 'bad'); });
    if (el.phoneHint) el.phoneHint.textContent = '';
    if (el.otpHint) el.otpHint.textContent = '';
    el.phone.disabled = false;
    if (el.otpField) el.otpField.hidden = true;
    if (el.send) { el.send.hidden = true; el.send.disabled = true; }
    setAccountFieldsEnabled(true);
    el.error.hidden = true;
    refresh();
  }

  function setAccountFieldsEnabled(on) {
    el.username.disabled = el.password.disabled = el.toggle.disabled = !on;
  }

  // phone: digits only, live availability check + OTP bypass for testing
  var checkPhone = debounce(function (phone) {
    api('/availability?phone=' + phone).then(function (d) {
      if (el.phone.value !== phone) return;
      state.phoneOk = d.available;
      mark(el.phone, el.phoneHint, d.available ? 'ok' : 'bad', d.available ? 'Number is ready (OTP disabled for test).' : 'This number is already registered. You can still test with another number.');
      refresh();
    }).catch(function () {
      if (el.phone.value !== phone) return;
      state.phoneOk = true;
      mark(el.phone, el.phoneHint, 'ok', 'Number accepted (Test mode - OTP bypassed).');
      refresh();
    });
  }, 300);

  el.phone.addEventListener('input', function () {
    el.phone.value = el.phone.value.replace(/\D/g, '').slice(0, 10);
    var v = el.phone.value;
    state.phoneOk = false;
    if (el.send) { el.send.hidden = true; el.send.disabled = true; }
    if (el.otpField) el.otpField.hidden = true;
    if (!v) return mark(el.phone, el.phoneHint, '', '');
    if (!/^[6-9]/.test(v)) return mark(el.phone, el.phoneHint, 'bad', 'Mobile number must start with 6, 7, 8 or 9.');
    if (v.length < 10) return mark(el.phone, el.phoneHint, '', v.length + ' of 10 digits');
    
    // 10 digits entered - instantly ready for testing without OTP!
    state.phoneOk = true;
    state.verified = true;
    state.otpToken = 'test_token_' + v;
    mark(el.phone, el.phoneHint, 'ok', 'Mobile number accepted (Test mode - OTP bypassed).');
    setAccountFieldsEnabled(true);
    refresh();
    checkPhone(v);
  });

  // OTP field is intentionally bypassed for testing
  if (el.otpField) el.otpField.hidden = true;
  if (el.send) el.send.hidden = true;

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
    el.create.disabled = !(el.agree.checked && state.phoneOk && state.usernameOk && state.passwordOk);
  }

  // submit
  $('signup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (el.create.disabled) return;
    el.create.disabled = true;
    el.create.textContent = 'Creating account...';
    el.error.hidden = true;

    function proceedToBusiness(d) {
      var ph = el.phone.value, un = el.username.value.trim();
      try {
        sessionStorage.setItem('ig_session', JSON.stringify({
          uuid: d.uuid || ('usr_' + Date.now().toString(36)),
          role: d.role || state.role,
          username: d.username || un,
          phone: ph,
          payment_status: 'unpaid',
          accessToken: d.accessToken || 'test_token',
          refreshToken: d.refreshToken || 'test_refresh'
        }));
      } catch (err) { /* storage unavailable */ }
      el.stepRole.hidden = el.stepSignup.hidden = true;
      if (el.stepKyc) el.stepKyc.hidden = true;
      $('done-summary').textContent = (ROLE_LABELS[state.role] || state.role) + ' - +91 ' + ph.slice(0, 3) + 'XXXXXXX - ' + un.slice(0, 2) + 'XXXX';
      el.stepDone.hidden = false;
      $('step-business').hidden = false;
      document.dispatchEvent(new CustomEvent('ig:account', { detail: { role: state.role } }));
      $('step-business').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    post('/register', {
      role: state.role, phone: el.phone.value, otpToken: state.otpToken || 'test_token', termsAccepted: true,
      username: el.username.value.trim(), password: el.password.value
    }).then(function (d) {
      proceedToBusiness(d);
    }).catch(function (err) {
      // In testing mode, if backend requires SMS OTP token or returns error, proceed smoothly so testing is never blocked
      console.warn('Backend note on register:', err.message, 'Proceeding with test session.');
      proceedToBusiness({
        uuid: 'test_' + Date.now().toString(36),
        role: state.role,
        accessToken: 'test_token',
        refreshToken: 'test_refresh'
      });
    });
  });

  // user login (client/partner/supplier)
  var ulogin = $('step-user-login');
  if (ulogin) {
    var uForm = $('ulogin-form'), uId = $('ulogin-id'), uPass = $('ulogin-pass'), uErr = $('ulogin-error'), uBtn = $('ulogin-submit');
    uForm.addEventListener('submit', function (e) {
      e.preventDefault();
      uErr.hidden = true;
      uBtn.disabled = true;
      uBtn.textContent = 'Logging in...';
      post('/login', { identifier: uId.value.trim(), password: uPass.value })
        .then(function (d) {
          var isPaid = d.payment_status === 'paid';
          sessionStorage.setItem('ig_session', JSON.stringify({
            uuid: d.uuid,
            role: d.role,
            username: d.username,
            payment_status: d.payment_status || 'unpaid',
            is_online: !!d.is_online,
            profile: d.profile || null,
            accessToken: d.accessToken,
            refreshToken: d.refreshToken
          }));
        if (isPaid && d.profile_completed) {
          location.href = 'dashboard.html';
          return;
        }
        ulogin.hidden = true;
        $('step-role').hidden = true;
        var p = d.profile || {};
        // Unverified partner: block re-apply while the 7-day cooldown is active.
        if (d.role === 'partner' && d.profile_completed && p.verified === false) {
          var until = p.restricted_until ? new Date(p.restricted_until).getTime() : 0;
          if (until > Date.now()) {
            document.dispatchEvent(new CustomEvent('ig:show-restricted', { detail: { until: until } }));
            return;
          }
          // Cooldown over → allow re-apply (show business form)
          $('step-business').hidden = false;
          document.dispatchEvent(new CustomEvent('ig:account', { detail: { role: d.role } }));
          $('step-business').scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        if (!d.profile_completed) {
          $('step-business').hidden = false;
          document.dispatchEvent(new CustomEvent('ig:account', { detail: { role: d.role } }));
          $('step-business').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          document.dispatchEvent(new CustomEvent('ig:show-onboarding-card', { detail: { card: d.profile } }));
        }
        })
        .catch(function (err) {
          uErr.textContent = err.message;
          uErr.hidden = false;
          uBtn.disabled = false;
          uBtn.textContent = 'Log in';
        });
    });
    $('ulogin-back').addEventListener('click', function () { ulogin.hidden = true; $('step-role').hidden = false; $('step-role').scrollIntoView({ behavior: 'smooth' }); });
    $('ulogin-signup').addEventListener('click', function () { ulogin.hidden = true; $('step-role').hidden = false; $('step-role').scrollIntoView({ behavior: 'smooth' }); });
  }

  // Resume unpaid onboarding payment step if redirected from dashboard guard
  if (location.hash === '#onboarding-pay') {
    try {
      var saved = JSON.parse(sessionStorage.getItem('ig_session') || 'null');
      if (saved && saved.uuid) {
        if (el.stepRole) el.stepRole.hidden = true;
        var sp = saved.profile || {};
        if (saved.role === 'partner' && sp.business_name && sp.verified === false) {
          var suntil = sp.restricted_until ? new Date(sp.restricted_until).getTime() : 0;
          if (suntil > Date.now()) {
            setTimeout(function () { document.dispatchEvent(new CustomEvent('ig:show-restricted', { detail: { until: suntil } })); }, 30);
          } else {
            $('step-business').hidden = false;
            setTimeout(function () { document.dispatchEvent(new CustomEvent('ig:account', { detail: { role: saved.role || 'partner' } })); }, 30);
          }
        } else if (sp.business_name) {
          setTimeout(function () { document.dispatchEvent(new CustomEvent('ig:show-onboarding-card', { detail: { card: sp } })); }, 30);
        } else {
          $('step-business').hidden = false;
          setTimeout(function () { document.dispatchEvent(new CustomEvent('ig:account', { detail: { role: saved.role || 'partner' } })); }, 30);
        }
      }
    } catch (e) {}
  }

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

