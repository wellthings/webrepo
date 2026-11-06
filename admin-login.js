(function () {
  var API = (window.SITE && window.SITE.apiBase) || '';
  var TOKEN_KEY = 'ig_admin_token';
  var $ = function (id) { return document.getElementById(id); };
  var trigger = $('top-login'), form = $('login-form');
  if (!trigger || !form) return;

  var phone = $('lg-phone'), otp = $('lg-otp'), user = $('lg-user'), lid = $('lg-id'), host = $('lg-host');
  var send = $('lg-send'), submit = $('lg-submit'), msg = $('lg-msg');
  var timer = null, busy = false;

  function show(on) {
    document.body.classList.toggle('logging-in', on);
    $('step-login').hidden = !on;
    if (on) { phone.focus(); if (location.hash !== '#login') history.replaceState(null, '', '#login'); }
    else if (location.hash === '#login') history.replaceState(null, '', location.pathname + location.search);
  }
  trigger.addEventListener('click', function (e) { e.preventDefault(); show(true); });
  $('login-back').addEventListener('click', function () { show(false); });
  if (location.hash === '#login') show(true);

  function say(text, bad) { msg.textContent = text || ''; msg.style.color = bad ? '#c0392b' : ''; }
  function validate() {
    send.disabled = !/^[6-9]\d{9}$/.test(phone.value) || !!timer;
    submit.disabled = busy || !(/^[6-9]\d{9}$/.test(phone.value) && /^\d{6}$/.test(otp.value) && user.value.trim() && lid.value.trim() && host.value);
  }
  phone.addEventListener('input', function () { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); validate(); });
  otp.addEventListener('input', function () { otp.value = otp.value.replace(/\D/g, '').slice(0, 6); validate(); });
  [user, lid, host].forEach(function (i) { i.addEventListener('input', validate); });

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
      var left = d.resend_after || 30;
      say('If this number can log in, an OTP has been sent.');
      send.textContent = 'Resend in ' + left + 's';
      timer = setInterval(function () {
        left--;
        if (left <= 0) { clearInterval(timer); timer = null; send.textContent = 'Resend OTP'; validate(); } else send.textContent = 'Resend in ' + left + 's';
      }, 1000);
      otp.focus();
    }).catch(function (e) { say(e.message, true); validate(); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    validate();
    if (submit.disabled) return;
    busy = true; submit.disabled = true; submit.textContent = 'Checking...'; say('');
    post('/admin/login', { phone: phone.value, otp: otp.value, username: user.value.trim(), login_id: lid.value.trim(), host: host.value })
      .then(function (d) {
        sessionStorage.setItem(TOKEN_KEY, d.token);
        host.value = '';
        location.href = 'admin.html';
      })
      .catch(function (err) {
        busy = false; submit.textContent = 'Login'; say(err.message, true);
        otp.value = ''; host.value = ''; validate();
      });
  });
  validate();
})();
