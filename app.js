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

  $$('[data-company]').forEach(function (el) { el.textContent = SITE.company; });
  $$('[data-udyam]').forEach(function (el) { el.textContent = SITE.udyam; });
  $$('[data-package]').forEach(function (el) { el.textContent = SITE.packageName; });

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
      if (/\.apk(\?|$)/.test(SITE.appUrl)) { el.setAttribute('download', ''); el.removeAttribute('target'); }
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

  // homepage partner and supplier category finder
  var palette = ['#f77f00', '#d62828', '#7b2cbf', '#0077b6', '#2a9d8f', '#e63946', '#3a86ff', '#fb5607', '#06a77d', '#c9184a'];
  var CAT = window.CATALOG || { partner: [], supplier: [] };
  var categoryLists = {
    partner: CAT.partner.map(function (c) { return [c.icon, c.name, c.id]; }),
    supplier: CAT.supplier.map(function (c) { return [c.icon, c.name, c.id]; })
  };
  var roleTabs = $$('[data-service-role]');
  var categoryPanels = $$('[data-role-panel]');
  var categorySearch = $('[data-service-search]');
  var categoryEmpty = $('[data-category-empty]');
  var activeRole = 'partner';

  Object.keys(categoryLists).forEach(function (role) {
    var list = $('[data-category-list="' + role + '"]');
    if (!list) return;
    categoryLists[role].forEach(function (item, index) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'category-tab';
      tab.style.setProperty('--c', palette[index % palette.length]);
      tab.innerHTML = '<span class="cat-icon" aria-hidden="true">' + item[0] + '</span><span class="cat-name"></span>';
      tab.lastChild.textContent = item[1];
      tab.setAttribute('aria-pressed', 'false');
      tab.setAttribute('data-cat', item[2]);
      tab.addEventListener('click', function () {
        var wasActive = tab.classList.contains('active');
        $$('.category-tab', list).forEach(function (item) {
          var selected = item === tab && !wasActive;
          item.classList.toggle('active', selected);
          item.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        emitFilter();
      });
      list.appendChild(tab);
    });
  });

  function showRole(role) {
    activeRole = role;
    roleTabs.forEach(function (tab) {
      var selected = tab.getAttribute('data-service-role') === role;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    categoryPanels.forEach(function (panel) {
      var selected = panel.getAttribute('data-role-panel') === role;
      panel.hidden = !selected;
      panel.classList.toggle('active', selected);
    });
    filterCategories();
  }

  // tabs stay visible; the search text and selected tab filter the cards below
  function emitFilter() {
    var panel = $('[data-role-panel="' + activeRole + '"]');
    var on = panel && $('.category-tab.active', panel);
    document.dispatchEvent(new CustomEvent('ig:filter', {
      detail: { role: activeRole, cat: on ? on.getAttribute('data-cat') : '', q: categorySearch ? categorySearch.value.trim().toLowerCase() : '' }
    }));
  }
  function filterCategories() { emitFilter(); }

  // mouse drag scrolling for the swipeable strips
  $$('.category-grid').forEach(function (strip) {
    var down = false, startX = 0, startLeft = 0, moved = false;
    strip.addEventListener('mousedown', function (e) { down = true; moved = false; startX = e.pageX; startLeft = strip.scrollLeft; });
    window.addEventListener('mouseup', function () { down = false; });
    strip.addEventListener('mousemove', function (e) {
      if (!down) return;
      if (Math.abs(e.pageX - startX) > 4) moved = true;
      strip.scrollLeft = startLeft - (e.pageX - startX);
    });
    strip.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  });

  // ---- location: ask on first visit (see geo.js), show it in the address box ----
  var locInput = $('#location-input');
  if (locInput && window.IGGeo) {
    var stored = IGGeo.saved();
    if (stored && stored.address) locInput.value = stored.address; else IGGeo.request();
    locInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); IGGeo.geocode(locInput.value); locInput.blur(); } });
    locInput.addEventListener('change', function () { IGGeo.geocode(locInput.value); });
    var locBtn = $('#loc-btn');
    if (locBtn) locBtn.addEventListener('click', IGGeo.request);
  }

  // ---- header: scrolling down hides everything but the category tabs; scrolling up brings it back ----
  var pinned = $('#top-fixed'), upper = $('#top-upper');
  if (pinned && upper) {
    var lastY = window.scrollY, hidden = false;
    function setHidden(h) {
      hidden = h;
      pinned.style.top = h ? -upper.offsetHeight + 'px' : '0px';
    }
    window.addEventListener('scroll', function () {
      var y = window.scrollY, delta = y - lastY;
      if (Math.abs(delta) < 6) return;
      if (delta > 0 && y > upper.offsetHeight && !hidden) setHidden(true);
      else if (delta < 0 && hidden) setHidden(false);
      lastY = y;
    }, { passive: true });
    window.addEventListener('resize', function () { if (hidden) setHidden(true); });
  }

  // footer social links
  $$('[data-social]').forEach(function (el) {
    var key = el.getAttribute('data-social');
    var url = SITE.social && SITE.social[key];
    if (key === 'whatsapp') {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var n = phone();
        if (n) window.open('https://wa.me/' + n.replace(/\D/g, ''), '_blank', 'noopener');
      });
      el.href = '#';
    } else if (url) {
      el.href = url; el.target = '_blank'; el.rel = 'noopener';
    }
  });

  // bottom bar pages are not built yet
  $$('[data-soon]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); });
  });

  roleTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showRole(tab.getAttribute('data-service-role'));
    });
  });
  if (categorySearch) categorySearch.addEventListener('input', filterCategories);
  $$('[data-role-link]').forEach(function (link) {
    link.addEventListener('click', function () {
      showRole(link.getAttribute('data-role-link'));
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
