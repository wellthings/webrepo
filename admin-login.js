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

  var phone = $('lg-phone');
  var pass = $('lg-pass');
  var otpWrap = $('lg-otp-wrap');
  var otp = $('lg-otp');
  var send = $('lg-send');
  var submit = $('lg-submit');
  var msg = $('lg-msg');
  var errBox = $('lg-error');
  var timer = null;
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
      phone.focus();
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
    var hasPass = pass && pass.value.length > 0;
    var otpVal = otp ? otp.value.trim() : '';
    var hasOtp = /^\d{4,8}$/.test(otpVal);
    if (send) send.disabled = !phoneOk || !!timer;

    // If OTP input has characters, require valid 4-8 digit OTP; otherwise Phone + Password
    var otpOk = otpVal.length === 0 || hasOtp;
    submit.disabled = busy || !(phoneOk && hasPass && otpOk);
  }

  phone.addEventListener('input', function () {
    phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
    validate();
  });
  if (otp) {
    otp.addEventListener('input', function () {
      otp.value = otp.value.replace(/\D/g, '').slice(0, 6);
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
        if (!r.ok) throw new Error(d.message || d.error || 'Invalid credentials');
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

  if (send) {
    send.addEventListener('click', function () {
      say('');
      send.disabled = true;
      post('/admin/otp/send', { phone: phone.value })
        .then(function (d) {
          if (otpWrap) otpWrap.hidden = false;
          var left = d.resend_after || 30;
          say('If this number can log in, an OTP has been sent.');
          send.textContent = 'Resend in ' + left + 's';
          timer = setInterval(function () {
            left--;
            if (left <= 0) {
              clearInterval(timer);
              timer = null;
              send.textContent = 'Resend OTP';
              validate();
            } else {
              send.textContent = 'Resend in ' + left + 's';
            }
          }, 1000);
          if (otp) otp.focus();
          validate();
        })
        .catch(function (e) {
          say(e.message || 'Could not send OTP', true);
          validate();
        });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    validate();
    if (submit.disabled) return;

    var phoneVal = phone.value;
    var phoneOk = /^[6-9]\d{9}$/.test(phoneVal);
    var passVal = pass ? pass.value : '';
    var otpVal = otp ? otp.value.trim() : '';

    busy = true;
    submit.disabled = true;
    submit.textContent = 'Logging in...';
    say('');

    if (otpVal) {
      if (!phoneOk || !passVal || !/^\d{4,8}$/.test(otpVal)) {
        busy = false;
        submit.textContent = 'Login';
        say('Invalid credentials', true);
        validate();
        return;
      }
      post('/admin/login', {
        phone: phoneVal,
        password: passVal,
        otp: otpVal
      })
        .then(function (d) {
          sessionStorage.setItem(TOKEN_KEY, d.token);
          location.href = 'admin.html';
        })
        .catch(function (err) {
          busy = false;
          submit.textContent = 'Login';
          if (otp) otp.value = '';
          say(err.message || 'Invalid credentials', true);
          validate();
        });
      return;
    }

    // Normal user login (Phone + Password, without OTP)
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
        say(err.message || 'Invalid credentials', true);
        validate();
      });
  });

  validate();
})();
