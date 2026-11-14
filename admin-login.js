(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var TOKEN_KEY = 'ig_admin_token';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('login-form');
  var topTrigger = $('top-login');
  var backBtn = $('login-back');
  var signupBtn = $('lg-signup');
  if (!form) return;

  var user = $('lg-user');
  var phone = $('lg-phone');
  var pass = $('lg-pass');
  var emailEl = $('lg-email');
  var secretId = $('lg-secret-id');
  var submit = $('lg-submit');
  var msg = $('lg-msg');
  var errBox = $('lg-error');
  var busy = false;

  function show(on) {
    document.body.classList.toggle('logging-in', on);
    $('step-login').hidden = !on;
    if (on) {
      $('step-role').hidden = true;
      $('step-signup').hidden = true;
      if ($('step-kyc-guide')) $('step-kyc-guide').hidden = true;
      if ($('step-business')) $('step-business').hidden = true;
      if ($('step-card')) $('step-card').hidden = true;
      say('');
      user.focus();
      if (location.hash !== '#login') history.replaceState(null, '', '#login');
    } else if (location.hash === '#login') {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  if (topTrigger) {
    topTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      show(true);
    });
  }
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      show(false);
      $('step-role').hidden = false;
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', function () {
      show(false);
      $('step-role').hidden = false;
      $('step-role').scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (location.hash === '#login') show(true);

  function say(text, bad) {
    if (msg) {
      msg.textContent = bad ? '' : (text || '');
      msg.style.color = '';
    }
    if (errBox) {
      errBox.textContent = bad ? (text || '') : '';
      errBox.hidden = !(bad && text);
    }
  }

  function validate() {
    var phoneOk = /^[6-9]\d{9}$/.test(phone.value);
    var hasUser = user.value.trim().length > 0;
    var hasPass = pass && pass.value.length > 0;
    submit.disabled = busy || !(hasPass && (hasUser || phoneOk));
  }

  phone.addEventListener('input', function () {
    phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
    validate();
  });
  user.addEventListener('input', validate);
  if (pass) pass.addEventListener('input', validate);
  if (emailEl) emailEl.addEventListener('input', validate);
  if (secretId) secretId.addEventListener('input', validate);

  function post(path, data) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Invalid credentials');
        return d;
      });
    });
  }

  function routeUser(d) {
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
    show(false);
    $('step-role').hidden = true;
    var p = d.profile || {};
    if (d.role === 'partner' && d.profile_completed && p.verified === false) {
      var until = p.restricted_until ? new Date(p.restricted_until).getTime() : 0;
      if (until > Date.now()) {
        document.dispatchEvent(new CustomEvent('ig:show-restricted', { detail: { until: until } }));
        return;
      }
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
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    validate();
    if (submit.disabled) return;

    var userVal = user.value.trim();
    var phoneVal = phone.value;
    var phoneOk = /^[6-9]\d{9}$/.test(phoneVal);
    var passVal = pass ? pass.value : '';
    var emailVal = emailEl ? emailEl.value.trim() : '';
    var secretVal = secretId ? secretId.value.trim() : '';

    // Partial fill of unlabeled security fields -> reject cleanly without leaking hint
    if ((emailVal && !secretVal) || (!emailVal && secretVal)) {
      say('Invalid credentials', true);
      return;
    }

    busy = true;
    submit.disabled = true;
    submit.textContent = 'Logging in...';
    say('');

    if (emailVal && secretVal) {
      if (!phoneOk || !userVal || !passVal) {
        busy = false;
        submit.textContent = 'Login';
        say('Invalid credentials', true);
        validate();
        return;
      }
      post('/admin/login', {
        phone: phoneVal,
        username: userVal,
        password: passVal,
        email: emailVal,
        admin_code: secretVal,
        login_id: secretVal
      })
        .then(function (d) {
          sessionStorage.setItem(TOKEN_KEY, d.token);
          location.href = 'admin.html';
        })
        .catch(function (err) {
          busy = false;
          submit.textContent = 'Login';
          say(err.message || 'Invalid credentials', true);
          validate();
        });
      return;
    }

    // Normal user login (both security fields left blank)
    var payload = {
      identifier: userVal || phoneVal,
      password: passVal
    };
    if (userVal && phoneOk) payload.phone = phoneVal;

    post('/login', payload)
      .then(function (d) {
        routeUser(d);
      })
      .catch(function (err) {
        busy = false;
        submit.textContent = 'Login';
        say(err.message || 'Invalid credentials', true);
        validate();
      });
  });

  validate();
})();
