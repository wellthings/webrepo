(function () {
  var API = (window.SITE && window.SITE.apiBase) || '';
  var TOKEN_KEY = 'ig_admin_token';
  var $ = function (id) { return document.getElementById(id); };
  var trigger = $('admin-login'), form = $('login-form');
  var userTrigger = $('top-login');
  if (userTrigger) {
    userTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      $('step-role').hidden = true;
      $('step-signup').hidden = true;
      $('step-user-login').hidden = false;
      $('step-user-login').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('ulogin-id').focus();
    });
  }
  if (!trigger || !form) return;

  var phone = $('lg-phone'), otp = $('lg-otp'), user = $('lg-user'), pass = $('lg-pass'), secretId = $('lg-secret-id');
  var otpWrap = $('lg-otp-wrap');
  var send = $('lg-send'), submit = $('lg-submit'), msg = $('lg-msg');
  var timer = null, busy = false;

  function show(on) {
    document.body.classList.toggle('logging-in', on);
    $('step-login').hidden = !on;
    if (on) {
      $('step-role').hidden = true;
      $('step-user-login').hidden = true;
      $('step-signup').hidden = true;
      user.focus();
      if (location.hash !== '#login') history.replaceState(null, '', '#login');
    } else if (location.hash === '#login') {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }
  trigger.addEventListener('click', function (e) { e.preventDefault(); show(true); });
  $('login-back').addEventListener('click', function () { show(false); $('step-role').hidden = false; });
  if (location.hash === '#login') show(true);

  function say(text, bad) { msg.textContent = text || ''; msg.style.color = bad ? '#c0392b' : ''; }
  function validate() {
    var phoneOk = /^[6-9]\d{9}$/.test(phone.value);
    send.disabled = !phoneOk || !!timer;
    var hasCred = (pass && pass.value.trim().length > 0) || (otp && /^\d{4,8}$/.test(otp.value));
    var hasSecret = secretId && secretId.value.trim().length > 0;
    submit.disabled = busy || !(phoneOk && user.value.trim().length > 0 && hasCred && hasSecret);
  }
  phone.addEventListener('input', function () { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); validate(); });
  if (otp) otp.addEventListener('input', function () { otp.value = otp.value.replace(/\D/g, '').slice(0, 6); validate(); });
  user.addEventListener('input', validate);
  if (pass) pass.addEventListener('input', validate);
  if (secretId) secretId.addEventListener('input', validate);

  function post(path, data) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Something went wrong. Please try again.');
        return d;
      });
    });
  }

  send.addEventListener('click', function () {
    say(''); send.disabled = true;
    post('/admin/otp/send', { phone: phone.value }).then(function (d) {
      if (otpWrap) otpWrap.hidden = false;
      var left = d.resend_after || 30;
      say('If this number can log in, an OTP has been sent.');
      send.textContent = 'Resend in ' + left + 's';
      timer = setInterval(function () {
        left--;
        if (left <= 0) { clearInterval(timer); timer = null; send.textContent = 'Resend OTP'; validate(); }
        else send.textContent = 'Resend in ' + left + 's';
      }, 1000);
      if (otp) otp.focus();
    }).catch(function (e) { say(e.message, true); validate(); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    validate();
    if (submit.disabled) return;
    busy = true; submit.disabled = true; submit.textContent = 'Verifying...'; say('');
    post('/admin/login', {
      phone: phone.value,
      username: user.value.trim(),
      password: pass ? pass.value : '',
      otp: otp ? otp.value : '',
      login_id: secretId ? secretId.value.trim() : ''
    })
      .then(function (d) {
        sessionStorage.setItem(TOKEN_KEY, d.token);
        location.href = 'admin.html';
      })
      .catch(function (err) {
        busy = false; submit.textContent = 'Login'; say(err.message, true);
        if (otp) otp.value = '';
        validate();
      });
  });
  validate();
})();
