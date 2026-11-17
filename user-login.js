(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('login-form');
  var topTrigger = $('top-login');
  var backBtn = $('login-back');
  var signupBtn = $('lg-signup');
  if (!form) return;

  var phone = $('lg-phone');
  var pass = $('lg-pass');
  var togglePass = $('lg-toggle-pass');
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
      if (phone) phone.focus();
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

  if (togglePass && pass) {
    togglePass.addEventListener('click', function () {
      var isHidden = pass.type === 'password';
      pass.type = isHidden ? 'text' : 'password';
      togglePass.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
      togglePass.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      var openEye = togglePass.querySelector('.eye-open');
      var offEye = togglePass.querySelector('.eye-off');
      if (openEye) openEye.hidden = isHidden;
      if (offEye) offEye.hidden = !isHidden;
    });
  }

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
    var phoneOk = phone && /^[6-9]\d{9}$/.test(phone.value);
    var hasPass = pass && pass.value.length > 0;
    submit.disabled = busy || !(phoneOk && hasPass);
  }

  if (phone) {
    phone.addEventListener('input', function () {
      phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
      validate();
    });
  }
  if (pass) pass.addEventListener('input', validate);

  function post(path, data) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Invalid mobile number or password');
        return d;
      });
    });
  }

  function routeUser(d) {
    var isPaid = d.payment_active !== undefined ? !!d.payment_active : d.payment_status === 'paid';
    sessionStorage.setItem('ig_session', JSON.stringify({
      uuid: d.uuid,
      role: d.role,
      username: d.username,
      phone: (d.profile && d.profile.phone) || phone.value || '',
      payment_status: isPaid ? 'paid' : (d.payment_status || 'unpaid'),
      payment_active: isPaid,
      next_due_at: d.next_due_at || (d.profile && d.profile.next_due_at) || null,
      is_online: isPaid && !!d.is_online,
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

    var phoneVal = phone.value;
    var passVal = pass ? pass.value : '';

    busy = true;
    submit.disabled = true;
    submit.textContent = 'Logging in...';
    say('');

    post('/login', {
      identifier: phoneVal,
      phone: phoneVal,
      password: passVal
    })
      .then(function (d) {
        routeUser(d);
      })
      .catch(function (err) {
        busy = false;
        submit.textContent = 'Login';
        say(err.message || 'Invalid mobile number or password', true);
        validate();
      });
  });

  validate();
})();
