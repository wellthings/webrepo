(function () {
  var SITE = window.SITE || {};
  var API = SITE.apiBase;
  var C = window.CATALOG;
  if (!C) return;
  var LOC = 'ig_loc';

  // Supplier categories on the site mapped to supplier_categories ids in the database ([] = show every shop)
  var SUP_DB = {
    plywood: [1], laminates: [1], hardware: [4], 'electrical-supply': [5], 'lighting-supply': [5],
    'plumbing-supply': [2, 4], 'bath-fittings': [2], cement: [8], 'tiles-supply': [2, 7], 'paint-supply': [3],
    'glass-supply': [6], aluminium: [6, 4], steel: [4, 8], foam: [], gypsum: [8, 3], appliances: [],
    'wallpaper-supply': [3], 'blinds-supply': []
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function img(src, alt) {
    var i = el('img'); i.alt = alt || ''; i.loading = 'lazy'; i.decoding = 'async'; i.draggable = false; i.src = src;
    i.onerror = function () { i.style.display = 'none'; };
    return i;
  }
  function loc() { try { return JSON.parse(localStorage.getItem(LOC)); } catch (e) { return null; } }
  var partnerSrc = function (c, m) { return C.base + 'partner/' + c.id + '/' + m[0] + '.jpg'; };
  var supplierSrc = function (c, m) { return C.base + 'supplier/' + c.id + '/' + m[0] + '.jpg'; };

  // ---------- partner module card ----------
  // withModes: home page (Full interior / Repairing / New selector). Otherwise only the Add button (inspection page).
  function moduleCard(c, m, withModes) {
    var card = el('article', 'mod-card');
    var pic = el('div', 'mod-img');
    pic.appendChild(img(partnerSrc(c, m), m[1]));
    pic.appendChild(el('span', 'mod-cat', c.name));
    var mode = 'new', btns = [];
    if (withModes) {
      var row = el('div', 'mode-row');
      var full = el('a', 'mode', 'Full interior');
      full.href = 'inspection.html?cat=' + encodeURIComponent(c.id);
      row.appendChild(full);
      [['repair', 'Repairing'], ['new', 'New']].forEach(function (x) {
        var b = el('button', 'mode' + (x[0] === mode ? ' on' : ''), x[1]);
        b.type = 'button'; b.setAttribute('data-mode', x[0]);
        b.addEventListener('click', function () {
          mode = x[0];
          btns.forEach(function (o) { o.classList.toggle('on', o === b); });
        });
        btns.push(b); row.appendChild(b);
      });
      pic.appendChild(row);
    }
    card.appendChild(pic);
    var body = el('div', 'mod-body');
    body.appendChild(el('h3', '', m[1]));
    var add = el('button', 'add-btn', 'Add'); add.type = 'button';
    add.addEventListener('click', function () {
      if (!window.IGCart) return;
      window.IGCart.add({ cat: c.id, catName: c.name, module: m[0], label: m[1], mode: withModes ? mode : 'full_interior', img: partnerSrc(c, m) });
      add.textContent = 'Added'; add.classList.add('added');
      setTimeout(function () { add.textContent = 'Add'; add.classList.remove('added'); }, 1200);
    });
    body.appendChild(add);
    card.appendChild(body);
    return card;
  }

  // ---------- inspection page ----------
  var root = document.getElementById('insp-root');
  if (root) {
    var only = new URLSearchParams(location.search).get('cat');
    var q = document.getElementById('insp-search');
    function drawInsp() {
      var text = q ? q.value.trim().toLowerCase() : '';
      root.textContent = '';
      var shown = 0;
      C.partner.forEach(function (c) {
        if (only && c.id !== only) return;
        var mods = c.modules.filter(function (m) { return !text || (m[1] + ' ' + c.name).toLowerCase().indexOf(text) !== -1; });
        if (!mods.length) return;
        var g = el('section', 'insp-group'); g.appendChild(el('h2', '', c.icon + ' ' + c.name));
        var grid = el('div', 'insp-grid');
        mods.forEach(function (m) { grid.appendChild(moduleCard(c, m, false)); shown++; });
        g.appendChild(grid); root.appendChild(g);
      });
      if (!shown) root.appendChild(el('p', 'browse-empty', 'No matching services. Try a different search.'));
      var all = document.getElementById('insp-all');
      if (all) all.hidden = !only;
    }
    if (q) q.addEventListener('input', drawInsp);
    drawInsp();
    return;
  }

  // ---------- home page strip ----------
  var strip = document.getElementById('browse-strip');
  if (!strip) return;
  var title = document.getElementById('browse-title'), sub = document.getElementById('browse-sub'), empty = document.getElementById('browse-empty');
  var state = { role: 'partner', cat: '', q: '' };

  function draw() {
    strip.textContent = '';
    var shown = 0;
    if (state.role === 'partner') {
      title.textContent = 'Popular interior work';
      sub.textContent = 'Choose New or Repairing and add to your cart.';
      C.partner.forEach(function (c) {
        if (state.cat && c.id !== state.cat) return;
        c.modules.forEach(function (m) {
          if (state.q && (m[1] + ' ' + c.name).toLowerCase().indexOf(state.q) === -1) return;
          strip.appendChild(moduleCard(c, m, true)); shown++;
        });
      });
    } else {
      title.textContent = 'Material shops';
      sub.textContent = 'Tap a material to see shops in your zone.';
      C.supplier.forEach(function (c) {
        if (state.cat && c.id !== state.cat) return;
        c.items.forEach(function (m) {
          if (state.q && (m[1] + ' ' + c.name).toLowerCase().indexOf(state.q) === -1) return;
          var b = el('button', 'sup-card'); b.type = 'button';
          var pic = el('div', 'mod-img'); pic.appendChild(img(supplierSrc(c, m), m[1])); b.appendChild(pic);
          var lab = el('span', 'sup-label', m[1]); lab.appendChild(el('small', '', c.name)); b.appendChild(lab);
          b.addEventListener('click', function () { openSupplierSheet(c, m); });
          strip.appendChild(b); shown++;
        });
      });
    }
    empty.hidden = shown > 0;
    strip.scrollLeft = 0;
  }

  document.addEventListener('ig:filter', function (e) {
    state.role = e.detail.role; state.cat = e.detail.cat; state.q = e.detail.q;
    draw();
  });

  // swiper arrows and mouse drag
  Array.prototype.forEach.call(document.querySelectorAll('[data-swipe]'), function (b) {
    b.addEventListener('click', function () { strip.scrollBy({ left: (b.getAttribute('data-swipe') === 'next' ? 1 : -1) * strip.clientWidth * 0.8, behavior: 'smooth' }); });
  });
  (function () {
    var down = false, sx = 0, sl = 0, moved = false;
    strip.addEventListener('mousedown', function (e) { down = true; moved = false; sx = e.pageX; sl = strip.scrollLeft; });
    window.addEventListener('mouseup', function () { down = false; strip.style.scrollSnapType = ''; });
    strip.addEventListener('mousemove', function (e) {
      if (!down) return;
      if (Math.abs(e.pageX - sx) > 4) { moved = true; strip.style.scrollSnapType = 'none'; }
      strip.scrollLeft = sl - (e.pageX - sx);
    });
    strip.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  })();

  // ---------- supplier popup ----------
  var wrap = el('div', 'sheet-wrap'); wrap.hidden = true;
  var sheet = el('div', 'sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
  var closeBtn = el('button', 'sheet-close', '\u00d7'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close');
  var hero = el('div', 'sheet-hero'), heroTitle = el('h3'), sbody = el('div', 'sheet-body');
  sheet.appendChild(closeBtn); sheet.appendChild(hero); sheet.appendChild(sbody);
  wrap.appendChild(sheet); document.body.appendChild(wrap);
  function closeSheet() { wrap.hidden = true; document.body.style.overflow = ''; }
  closeBtn.addEventListener('click', closeSheet);
  wrap.addEventListener('click', function (e) { if (e.target === wrap) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !wrap.hidden) closeSheet(); });

  var current = null;
  function openSupplierSheet(c, m) {
    current = { c: c, m: m };
    hero.textContent = ''; hero.appendChild(img(supplierSrc(c, m), m[1])); heroTitle.textContent = m[1]; hero.appendChild(heroTitle);
    wrap.hidden = false; document.body.style.overflow = 'hidden'; sheet.scrollTop = 0;
    loadShops();
  }

  function note(text, withBtn) {
    sbody.textContent = '';
    var n = el('p', 'sheet-note', text);
    if (withBtn) {
      var b = el('button', 'btn', 'Set my location'); b.type = 'button';
      b.addEventListener('click', function () { document.dispatchEvent(new CustomEvent('ig:location-request')); });
      n.appendChild(document.createElement('br')); n.appendChild(b);
    }
    sbody.appendChild(n);
  }

  function loadShops() {
    if (!current) return;
    var l = loc();
    if (!l || typeof l.lat !== 'number') { note('Please set your address for best results, and see material shops under our zone.', true); return; }
    note('Finding shops near you...', false);
    var ids = SUP_DB[current.c.id] || [];
    var url = API + '/public/suppliers?lat=' + l.lat + '&lng=' + l.lng + (ids.length ? '&category_ids=' + ids.join(',') : '');
    var token = current;
    fetch(url).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message || 'Could not load shops.'); return d.data || []; }); })
      .then(function (list) {
        if (token !== current) return;
        sbody.textContent = '';
        if (!list.length) { note('No registered shops in your zone yet. We are adding more every day.', false); return; }
        list.forEach(function (s) { sbody.appendChild(shopCard(s)); });
      })
      .catch(function (err) { if (token === current) note(err.message, false); });
  }
  document.addEventListener('ig:location', function () { if (!wrap.hidden) loadShops(); });

  function contact(id, action) {
    // the new tab is opened inside the tap so browsers do not block it
    var w = action === 'call' ? null : window.open('', '_blank');
    if (w) w.opener = null;
    fetch(API + '/public/suppliers/' + id + '/contact?action=' + action)
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message || 'Not available'); return d.url; }); })
      .then(function (u) { if (w) w.location.href = u; else window.location.href = u; })
      .catch(function (err) { if (w) w.close(); alert(err.message); });
  }

  function shopCard(s) {
    var card = el('article', 'shop-card');
    var ban = el('div', 'shop-banner'); if (s.banner_url) ban.appendChild(img(s.banner_url, '')); card.appendChild(ban);
    var idr = el('div', 'shop-id');
    var av = el('div', 'shop-avatar'); if (s.profile_photo_url) av.appendChild(img(s.profile_photo_url, '')); else av.textContent = (s.business_name || '?').charAt(0).toUpperCase();
    idr.appendChild(av);
    var who = el('div', 'shop-who'); who.appendChild(el('strong', '', s.business_name || '')); who.appendChild(el('span', '', s.username ? '@' + s.username : ''));
    idr.appendChild(who);
    if (s.distance_km != null) idr.appendChild(el('span', 'shop-dist', s.distance_km + ' km'));
    card.appendChild(idr);
    var acts = el('div', 'shop-actions');
    var samples = el('div', 'shop-samples'); samples.hidden = true;
    [['call', 'Call'], ['chat', 'Chat'], ['navigate', 'Navigate'], ['samples', 'Samples']].forEach(function (a) {
      var b = el('button', a[0] === 'call' ? 'call' : '', a[1]); b.type = 'button';
      b.addEventListener('click', function () {
        if (a[0] === 'samples') return toggleSamples(s.id, samples);
        contact(s.id, a[0]);
      });
      acts.appendChild(b);
    });
    card.appendChild(acts); card.appendChild(samples);
    return card;
  }

  function toggleSamples(id, box) {
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.textContent = ''; box.appendChild(el('p', '', 'Loading...'));
    fetch(API + '/public/suppliers/' + id + '/samples').then(function (r) { return r.json(); }).then(function (d) {
      box.textContent = '';
      var list = (d.data || []).filter(function (x) { return x.media_type === 'image' || x.thumbnail_url; });
      if (!list.length) { box.appendChild(el('p', '', 'No samples added yet.')); return; }
      list.forEach(function (x) { box.appendChild(img(x.thumbnail_url || x.media_url, x.title || 'Sample')); });
    }).catch(function () { box.textContent = ''; box.appendChild(el('p', '', 'Could not load samples.')); });
  }

  draw();
})();
