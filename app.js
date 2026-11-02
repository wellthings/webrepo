(function () {
  var SITE = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // footer year
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // mobile menu
  var btn = $('.menu-btn'), links = $('.nav-links');
  if (btn && links) {
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); });
    });
  }

  // highlight current page in the nav
  var here = (location.pathname.split('/').pop() || 'index.html');
  $$('.nav-links a').forEach(function (a) {
    if (a.getAttribute('href') === here) a.classList.add('active');
  });

  // email
  $$('[data-email]').forEach(function (el) {
    el.textContent = SITE.email;
    if (el.tagName === 'A') el.href = 'mailto:' + SITE.email;
  });
  $$('[data-hours]').forEach(function (el) { el.textContent = SITE.hours; });
  $$('[data-response]').forEach(function (el) { el.textContent = SITE.responseTime; });

  // address (hidden when empty)
  $$('[data-address]').forEach(function (el) {
    if (SITE.address) el.textContent = SITE.address;
    else (el.closest('[data-address-row]') || el).hidden = true;
  });

  // phone: shown masked, real number only used when tapped
  function phone() {
    try { return atob(SITE.phoneEncoded || ''); } catch (e) { return ''; }
  }
  $$('[data-call]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var n = phone();
      if (n) window.location.href = 'tel:' + n;
    });
  });

  // app link: live link once SITE.appUrl is set, "launching soon" until then
  $$('[data-app-link]').forEach(function (el) {
    if (SITE.appUrl) {
      el.href = SITE.appUrl;
      el.target = '_blank';
      el.rel = 'noopener';
      el.classList.remove('disabled');
      if (el.dataset.live) el.textContent = el.dataset.live;
    } else {
      el.removeAttribute('href');
    }
  });

  // role tabs
  $$('[data-tabs]').forEach(function (group) {
    var tabs = $$('.tab', group), panels = $$('.tab-panel', group);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
        panels.forEach(function (p) { p.classList.toggle('active', p.id === tab.getAttribute('data-target')); });
      });
    });
  });

  // contact form -> opens the visitor's mail app addressed to support
  var form = $('#contact-form');
  if (form) {
    var msg = $('.form-msg', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), email = form.email.value.trim();
      var topic = form.topic.value, text = form.message.value.trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !ok || text.length < 10) {
        msg.className = 'form-msg error';
        msg.textContent = 'Please enter your name, a valid email and a message of at least 10 characters.';
        return;
      }
      var subject = encodeURIComponent('[' + topic + '] Message from ' + name);
      var body = encodeURIComponent(text + '\n\n- ' + name + '\n' + email);
      msg.className = 'form-msg';
      msg.textContent = 'Opening your email app. If nothing opens, write to ' + SITE.email + ' directly.';
      window.location.href = 'mailto:' + SITE.email + '?subject=' + subject + '&body=' + body;
    });
  }

  // scroll reveal
  var items = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }
})();
