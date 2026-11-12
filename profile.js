(function () {
  'use strict';
  var API = (window.SITE && window.SITE.apiBase) || '';
  var $ = function (id) { return document.getElementById(id); };
  var ICONS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5"/>',
    shop: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    num: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
    pc: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  var TOGGLES = {
    partner: [
      ['has_team', 'Do you have a working team?'],
      ['has_tools', 'Do you have your own tool/toolbox?'],
      ['knows_work_completely', 'Do you have complete knowledge of your work, pricing, calculation and client dealing?']
    ]
  };
  var WARNINGS = {
    partner: 'WARNING: Strict KYC/Aadhaar verification in progress. Any mismatch or fake profile will lead to immediate account suspension. Ensure you possess the required team, tools, and technical skill before proceeding. For support: support@interagood.in',
    architect: 'NOTE: Architect accounts are reviewed. Any mismatch or fake profile will lead to immediate account suspension. Ensure your qualifications and design software details are accurate. For support: support@interagood.in'
  };
  var SKILL_LEVELS = [['new', 'New'], ['intermediate', 'Intermediate'], ['experienced', 'Experienced']];

  var session = null, role = null, built = false, toggles = {}, files = {}, urls = {};
  var el = { fields: $('biz-fields'), form: $('biz-form'), save: $('biz-save'), error: $('biz-error') };

  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>'; }
  function field(id, label, icon, control, hint) {
    return '<div class="field" data-field="' + id + '"><label for="' + id + '">' + label + '</label><div class="input' + (control.indexOf('<textarea') === 0 ? ' area' : '') + '">' + svg(icon) + control + '</div><p class="hint">' + (hint || '') + '</p></div>';
  }
  function text(id, label, icon, ph, extra) {
    return field(id, label, icon, '<input id="' + id + '" type="text" placeholder="' + ph + '" ' + (extra || '') + '>');
  }
  function select(id, label, icon, options, ph) {
    var o = '<option value="">' + ph + '</option>' + options.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('');
    return field(id, label, icon, '<select id="' + id + '">' + o + '</select>');
  }
  function toggle(key, label) {
    return '<div class="toggle-row"><span id="t-' + key + '">' + label + '</span><button type="button" class="switch" role="switch" aria-checked="false" aria-labelledby="t-' + key + '" data-toggle="' + key + '"></button></div>';
  }
  function photo(id, label, cls) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><div class="photo-pick ' + cls + '"><img id="' + id + '-img" alt="" hidden><input id="' + id + '" type="file" accept="image/jpeg,image/png,image/webp"></div><p class="hint" id="' + id + '-hint">Optional. JPG, PNG or WebP, up to 5 MB.</p></div>';
  }
  function docPick(id, label, hint) {
    return '<div class="field" data-field="' + id + '"><label for="' + id + '">' + label + '</label><div class="photo-pick"><img id="' + id + '-img" alt="" hidden><input id="' + id + '" type="file" accept="image/jpeg,image/png,image/webp"></div><p class="hint" id="' + id + '-hint">' + hint + '</p></div>';
  }
  function range(from, to, fmt) {
    var out = [];
    for (var i = from; i <= to; i++) out.push([String(i), fmt ? fmt(i) : String(i)]);
    return out;
  }

  // ---- upload a file to the backend media endpoint, returns the public URL ----
  function upload(kind, file) {
    if (!session) return Promise.reject(new Error('Not signed in.'));
    return fetch(API + '/users/' + session.uuid + '/upload?kind=' + encodeURIComponent(kind), {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        Authorization: 'Bearer ' + session.accessToken,
      },
      body: file,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || d.error || 'Upload failed');
        if (!d.url) throw new Error('Upload did not return a URL.');
        return d.url;
      });
    });
  }
  window.InteraUpload = upload;

  function build() {
    var h = '<div class="cover"><label class="cover-banner" for="banner"><img id="banner-img" alt="" hidden><span class="cover-ph">' + svg('pin').replace(ICONS.pin, '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>') + 'Add banner photo</span></label>' +
      '<input class="sr" id="banner" type="file" accept="image/jpeg,image/png,image/webp">' +
      '<label class="avatar" for="profile_photo"><img id="profile_photo-img" alt="" hidden><span class="avatar-ph">' + svg('user') + '</span><span class="avatar-plus">+</span></label>' +
      '<input class="sr" id="profile_photo" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
      '<p class="hint cover-hint" id="banner-hint">Banner and profile photo are optional. JPG, PNG or WebP, up to 5 MB.</p><p class="hint cover-hint" id="profile_photo-hint"></p>';
    if (WARNINGS[role]) {
      h += '<div class="warn-banner" role="alert">' + WARNINGS[role] + '</div>';
    }
    h += '<p class="biz-section">Basic details</p>';
    h += text('full_name', 'Full name (as per Aadhaar)', 'user', 'Your name exactly as on Aadhaar', 'maxlength="120"');
    h += text('business_name', 'Business name', 'shop', 'Your business or brand name', 'maxlength="150"');
    if (role === 'partner' || role === 'supplier') {
      h += select('category_id', role === 'partner' ? 'Your work category' : 'Supply category', 'list', [], 'Loading categories...');
    }
    if (role === 'partner' || role === 'architect') {
      h += select('skill_level', 'Skill level', 'cap', SKILL_LEVELS, 'Select skill level');
    }
    if (role === 'supplier') {
      h += select('shop_years', 'Years shop is active', 'clock', range(0, 60, function (n) { return n + (n === 1 ? ' year' : ' years'); }), 'Select years in business');
    }
    if (role !== 'supplier') {
      h += '<p class="biz-section">Experience</p><div class="field-row">';
      h += select('age', 'Age', 'num', range(18, 65), 'Select age');
      h += select('experience_years', 'Experience', 'clock', [['0', 'Fresher']].concat(range(1, 40, function (n) { return n + (n === 1 ? ' year' : ' years'); })), 'Select experience');
      h += '</div>';
    }
    if (role === 'architect') {
      h += '<p class="biz-section">Qualifications</p>';
      h += text('education', 'Courses completed', 'cap', 'e.g. B.Arch, Interior Design Diploma', 'maxlength="150"');
      h += text('design_software', 'Design software used', 'pc', 'e.g. AutoCAD, SketchUp, Revit', 'maxlength="80"');
      h += toggle('uses_boq_tools', 'Do you use BOQ tools?');
      h += toggle('worked_with_team_before', 'Have you worked with a team before?');
    }
    if (TOGGLES[role]) {
      h += '<p class="biz-section">About your work</p>';
      TOGGLES[role].forEach(function (t) {
        h += toggle(t[0], t[1]);
        if (t[0] === 'has_tools') h += '<div id="tools-wrap" hidden>' + docPick('tools_photo', 'Photo of your tools', 'Upload a clear photo of your tools. JPG, PNG or WebP, up to 5 MB.') + '</div>';
        if (t[0] === 'has_team') {
          h += '<div id="team-count-wrap" hidden>' + field('team_members_count', 'Team members', 'user', '<input id="team_members_count" type="text" inputmode="numeric" maxlength="3" placeholder="How many people in your team?">') +
            docPick('team_photo', 'Photo of your team', 'Upload a photo of you with your team. JPG, PNG or WebP, up to 5 MB.') + '</div>';
        }
      });
      h += '<p class="hint tip-hint">Tip: You can form a legal team with friends or family members who have the required tools and skills to meet the requirements above.</p>';
    }
    if (role === 'supplier') {
      h += '<p class="hint tip-hint">Note: No video call verification is required during onboarding. Your account is created instantly on submission.</p>';
    }
    h += '<p class="biz-section">Business address</p>';
    h += '<div class="field addr-search-field"><label for="addr-search">Search your address</label><div class="input">' + svg('pin') + '<input id="addr-search" type="text" placeholder="Search your address, use comma ( , )" autocomplete="off"></div><ul class="suggest" id="addr-suggest" hidden></ul><p class="hint" id="loc-hint">Example: Shivaji Road, Kasba Peth, Pune</p></div>';
    h += '<button type="button" class="btn-sm loc-btn" id="use-location">' + svg('pin').replace('<svg', '<svg class="btn-ic"') + 'Use current location</button>';
    h += field('address', 'Address', 'pin', '<textarea id="address" maxlength="300" placeholder="Shop / office address"></textarea>');
    h += '<div class="field-row">' + text('city', 'City', 'pin', 'City', 'maxlength="80"') + text('state', 'State', 'pin', 'State', 'maxlength="80"') + '</div>';
    h += text('pincode', 'Pincode', 'pin', '6 digit pincode', 'inputmode="numeric" maxlength="6"');
    el.fields.innerHTML = h;
    wire();
    if (role === 'partner' || role === 'supplier') loadCategories();
  }

  function loadCategories() {
    var sel = $('category_id');
    fetch(API + '/categories/' + role).then(function (r) { return r.json(); }).then(function (d) {
      sel.innerHTML = '<option value="">Select category</option>' + (d.data || []).map(function (c) {
        return '<option value="' + c.id + '">' + c.name.replace(/</g, '&lt;') + '</option>';
      }).join('');
    }).catch(function () { sel.innerHTML = '<option value="">Could not load. Reload the page.</option>'; });
  }

  function wire() {
    Array.prototype.forEach.call(el.fields.querySelectorAll('.switch'), function (b) {
      toggles[b.getAttribute('data-toggle')] = false;
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        toggles[b.getAttribute('data-toggle')] = on;
        if (b.getAttribute('data-toggle') === 'has_team' && $('team-count-wrap')) $('team-count-wrap').hidden = !on;
        if (b.getAttribute('data-toggle') === 'has_tools' && $('tools-wrap')) $('tools-wrap').hidden = !on;
      });
    });
    ['profile_photo', 'banner'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        var f = this.files[0], hint = $(id + '-hint'), img = $(id + '-img');
        files[id] = null; img.hidden = true;
        if (!f) return;
        if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { hint.textContent = 'Only JPG, PNG or WebP allowed.'; this.value = ''; return; }
        if (f.size > 5 * 1024 * 1024) { hint.textContent = 'File is larger than 5 MB.'; this.value = ''; return; }
        var input = this, kind = id === 'banner' ? 'banner' : 'profile', av = input.previousElementSibling;
        files[id] = true; hint.textContent = 'Uploading...';
        if (av) av.classList.add('uploading');
        upload(kind, f).then(function (url) {
          urls[id] = url;
          var shown = new Image();
          shown.onload = function () { img.src = url; img.hidden = false; };
          shown.src = url;
          hint.textContent = id === 'banner' ? 'Banner saved.' : 'Profile photo saved.';
        }).catch(function (err) {
          files[id] = null; urls[id] = null; input.value = '';
          hint.textContent = err.message;
        }).then(function () { files[id] = null; if (av) av.classList.remove('uploading'); });
      });
    });
    wireDocs();
    wireLocation();
    var pin = $('pincode');
    pin.addEventListener('input', function () { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    if ($('team_members_count')) $('team_members_count').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 3); });
  }


  // ---- extra photos (tools, team): uploaded on pick ----
  var DOC_KINDS = { tools_photo: 'tools', team_photo: 'team' };
  var busy = {};
  function showPreview(id, blob) {
    var img = $(id + '-img'); if (!img) return;
    img.src = URL.createObjectURL(blob); img.hidden = false;
  }
  function sendDoc(id, kind, blob, okText) {
    var hint = $(id + '-hint');
    busy[id] = true; urls[id] = null; hint.textContent = 'Uploading...';
    return upload(kind, blob).then(function (res) {
      urls[id] = res; showPreview(id, blob); hint.textContent = okText; hint.closest('.field').classList.remove('bad');
    }).catch(function (err) { hint.textContent = err.message; }).then(function () { busy[id] = false; });
  }
  function wireDocs() {
    Object.keys(DOC_KINDS).forEach(function (id) {
      var input = $(id); if (!input) return;
      input.addEventListener('change', function () {
        var f = this.files[0], hint = $(id + '-hint');
        urls[id] = null; $(id + '-img').hidden = true;
        if (!f) return;
        if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { hint.textContent = 'Only JPG, PNG or WebP allowed.'; this.value = ''; return; }
        if (f.size > 5 * 1024 * 1024) { hint.textContent = 'File is larger than 5 MB.'; this.value = ''; return; }
        sendDoc(id, DOC_KINDS[id], f, 'Uploaded.');
      });
    });
  }

  // ---- location: address search and current position (OpenStreetMap Nominatim), autofills the address fields ----
  var NOM = 'https://nominatim.openstreetmap.org';
  var coords = null;
  function setVal(id, v) { if (v) { $(id).value = v; $(id).closest('.field').classList.remove('bad'); } }
  function fillAddress(a, display) {
    a = a || {};
    var line = [a.house_number, a.road, a.neighbourhood || a.suburb || a.hamlet].filter(Boolean).join(', ');
    setVal('address', line || (display || '').split(',').slice(0, 3).join(',').trim());
    setVal('city', a.city || a.town || a.village || a.state_district || a.county);
    setVal('state', a.state);
    setVal('pincode', (a.postcode || '').replace(/\D/g, '').slice(0, 6));
  }
  function wireLocation() {
    var hint = $('loc-hint'), box = $('addr-search'), list = $('addr-suggest'), timer = null;
    $('use-location').addEventListener('click', function () {
      if (!navigator.geolocation) { hint.textContent = 'Location is not supported on this device.'; return; }
      hint.textContent = 'Waiting for location permission...';
      navigator.geolocation.getCurrentPosition(function (pos) {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        hint.textContent = 'Fetching address...';
        fetch(NOM + '/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=' + coords.lat + '&lon=' + coords.lng, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            fillAddress(d.address, d.display_name);
            box.value = d.display_name || '';
            hint.textContent = 'Address filled from your current location. You can edit it below.';
          })
          .catch(function () { hint.textContent = 'Location found, but the address could not be fetched. Please type it.'; });
      }, function (err) {
        hint.textContent = err.code === 1 ? 'Permission denied. Search or type your address instead.' : 'Could not get your location. Search or type your address.';
      }, { enableHighAccuracy: true, timeout: 15000 });
    });
    box.addEventListener('input', function () {
      clearTimeout(timer);
      var q = box.value.trim();
      if (q.length < 3) { list.hidden = true; return; }
      timer = setTimeout(function () {
        fetch(NOM + '/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json(); })
          .then(function (rows) {
            list.textContent = '';
            if (!rows.length) { list.hidden = true; return; }
            rows.forEach(function (r) {
              var li = document.createElement('li');
              li.textContent = r.display_name;
              li.addEventListener('click', function () {
                list.hidden = true; box.value = r.display_name;
                coords = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
                fillAddress(r.address, r.display_name);
                hint.textContent = 'Address filled. You can edit it below.';
              });
              list.appendChild(li);
            });
            list.hidden = false;
          }).catch(function () { list.hidden = true; });
      }, 500);
    });
    document.addEventListener('click', function (e) { if (!list.contains(e.target) && e.target !== box) list.hidden = true; });
  }

  function val(id) { var n = $(id); return n ? n.value.trim() : ''; }
  function setBad(id, msg) {
    var n = $(id); if (!n) return;
    var f = n.closest('.field'); f.classList.add('bad');
    var h = f.querySelector('.hint'); if (h) h.textContent = msg;
  }
  function validate(show) {
    if (show) Array.prototype.forEach.call(el.fields.querySelectorAll('.field.bad'), function (f) { f.classList.remove('bad'); });
    var bad = null;
    function need(id, ok, msg) { if (!ok) { if (show) setBad(id, msg); bad = bad || id; } }
    need('full_name', val('full_name').length >= 2, 'Enter your full name.');
    need('business_name', val('business_name').length >= 2, 'Enter your business name.');
    if ($('category_id')) need('category_id', !!val('category_id'), 'Select a category.');
    if ($('skill_level')) need('skill_level', !!val('skill_level'), 'Select your skill level.');
    if ($('shop_years')) need('shop_years', !!val('shop_years'), 'Select years in business.');
    if ($('age')) { need('age', !!val('age'), 'Select your age.'); need('experience_years', !!val('experience_years'), 'Select your experience.'); }
    if (role === 'partner') {
      if (!toggles.has_team) need('has_team', false, 'All mandatory toggles must be enabled.');
      if (!toggles.has_tools) need('has_tools', false, 'All mandatory toggles must be enabled.');
      if (!toggles.knows_work_completely) need('knows_work_completely', false, 'All mandatory toggles must be enabled.');
      if (toggles.has_tools) need('tools_photo', !!urls.tools_photo, 'Upload a photo of your tools.');
      if (toggles.has_team) {
        need('team_members_count', parseInt(val('team_members_count'), 10) > 0, 'Enter team size.');
        need('team_photo', !!urls.team_photo, 'Upload a photo of your team.');
      }
    }
    if (role === 'supplier') need('addr-search', !!coords, 'Search your shop address or use current location.');
    need('address', val('address').length >= 3, 'Enter your address.');
    need('city', val('city').length >= 2, 'Enter your city.');
    need('state', val('state').length >= 2, 'Enter your state.');
    need('pincode', /^\d{6}$/.test(val('pincode')), 'Pincode must be 6 digits.');
    if (show && bad) $(bad).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !bad;
  }

  function isUploading() { return !!(files.profile_photo || files.banner) || Object.keys(busy).some(function (k) { return busy[k]; }); }
  var submitting = false;
  function refresh() { if (built && !submitting) el.save.disabled = isUploading() || !validate(false); }
  setInterval(refresh, 300);

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (el.save.disabled || !session) return;
    if (isUploading() || !validate(true)) return;
    submitting = true; el.save.disabled = true; el.save.textContent = 'Submitting...'; el.error.hidden = true;
    var body = {
      full_name: val('full_name'), business_name: val('business_name'), address: val('address'),
      city: val('city'), state: val('state'), pincode: val('pincode')
    };
    ['category_id', 'age', 'experience_years', 'skill_level', 'shop_years', 'education', 'design_software'].forEach(function (k) { if ($(k)) body[k] = val(k); });
    Object.keys(toggles).forEach(function (k) { body[k] = !!toggles[k]; });
    if (coords) { body.latitude = coords.lat; body.longitude = coords.lng; }
    if (toggles.has_team) body.team_members_count = parseInt(val('team_members_count'), 10);
    if (urls.profile_photo) body.profile_photo_url = urls.profile_photo;
    if (urls.banner) body.banner_url = urls.banner;
    if (toggles.has_tools) body.tools_photo_url = urls.tools_photo;
    if (toggles.has_team) body.team_photo_url = urls.team_photo;
    Promise.resolve().then(function () {
      return fetch(API + '/users/' + session.uuid + '/profile-setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken }, body: JSON.stringify(body)
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || 'Could not save. Please try again.');
        return d;
      });
    }).then(function (d) {
      // Redirect to unified dashboard after profile setup (all roles)
      window.location.href = 'dashboard.html';
    }).catch(function (err) {
      submitting = false;
      el.error.textContent = err.message; el.error.hidden = false;
      el.save.textContent = 'Submit'; refresh();
    });
  });

  // ---- business card + payment ----
  var cardData = null;
  var AVATAR_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e9eef6"/><circle cx="60" cy="46" r="22" fill="#c3cede"/><path d="M18 120c0-24 19-38 42-38s42 14 42 38z" fill="#c3cede"/></svg>');
  var BANNER_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a192f"/><stop offset="1" stop-color="#112543"/></linearGradient></defs><rect width="600" height="200" fill="url(#g)"/></svg>');
  function showCard(c) {
    cardData = c;
    $('bc-name').textContent = c.business_name || '';
    $('bc-user').textContent = c.username ? '@' + c.username : '';
    $('bc-igid').textContent = c.ig_id || '';
    $('bc-role').textContent = c.role ? c.role.charAt(0).toUpperCase() + c.role.slice(1) : '';
    $('bc-category').textContent = c.category_name || '';
    $('bc-address').textContent = c.address || '';
    $('bc-initial').textContent = (c.business_name || '?').charAt(0).toUpperCase();
    [['bc-avatar', c.profile_photo_url], ['bc-banner', c.banner_url]].forEach(function (x) {
      var im = $(x[0]); if (!im) return;
      im.src = x[1] || (x[0] === 'bc-avatar' ? AVATAR_PLACEHOLDER : BANNER_PLACEHOLDER);
      im.hidden = false;
    });
    $('bc-initial').hidden = !!c.profile_photo_url;
    setOnline(!!c.is_online);
    $('pay-btn').textContent = 'Pay \u20B9' + (c.amount || '') + (c.role === 'supplier' ? ' & get deals' : ' & get leads');
    $('step-business').hidden = true;
    $('step-card').hidden = false;
    $('step-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function setOnline(on) {
    $('bc-online').setAttribute('aria-checked', on ? 'true' : 'false');
    $('bc-online').classList.toggle('on', on);
    $('bc-online-label').textContent = on ? 'Online' : 'Offline';
  }
  var isPaid = false;
  function authHeaders() { return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken }; }
  function payError(m) { $('pay-error').textContent = m; $('pay-error').hidden = !m; }

  $('bc-online').addEventListener('click', function () {
    if (!isPaid) { payError('Pay & go online'); return; }
    var want = this.getAttribute('aria-checked') !== 'true';
    payError('');
    fetch(API + '/users/' + session.uuid + '/status', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_online: want }) })
      .then(function (r) {
        if (r.status === 402) { isPaid = false; payError('Pay & go online'); return; }
        if (!r.ok) { payError('Could not change status.'); return; }
        setOnline(want);
      }).catch(function () { payError('Network error. Try again.'); });
  });

  function paid() {
    isPaid = true;
    window.location.href = 'dashboard.html';
  }

  function loadRazorpay() {
    return new Promise(function (ok, no) {
      if (window.Razorpay) return ok();
      var sc = document.createElement('script');
      sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
      sc.onload = ok; sc.onerror = function () { no(new Error('Could not load payment window.')); };
      document.head.appendChild(sc);
    });
  }
  $('pay-btn').addEventListener('click', function () {
    var btn = this, label = btn.textContent;
    payError(''); btn.disabled = true; btn.textContent = 'Please wait...';
    function reset() { btn.disabled = false; btn.textContent = label; }
    Promise.all([
      fetch(API + '/users/' + session.uuid + '/subscription', { method: 'POST', headers: authHeaders(), body: '{}' })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) throw new Error(r.status === 503 ? 'Payments are not available yet. Please try later.' : (d.message || 'Could not start payment.'));
          return d;
        }); }),
      loadRazorpay()
    ]).then(function (res) {
      var d = res[0];
      new window.Razorpay({
        key: d.key_id, subscription_id: d.subscription_id, name: 'Interagood',
        description: 'Monthly plan', prefill: { name: d.name, contact: d.contact, email: d.email },
        theme: { color: '#f58220' },
        modal: { ondismiss: reset },
        handler: function (resp) {
          fetch(API + '/users/' + session.uuid + '/subscription/verify', {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ razorpay_payment_id: resp.razorpay_payment_id, razorpay_subscription_id: resp.razorpay_subscription_id, razorpay_signature: resp.razorpay_signature })
          }).then(function (r) {
            if (!r.ok) throw new Error('Payment could not be confirmed. Contact support.');
            paid();
          }).catch(function (e) { payError(e.message); reset(); });
        }
      }).open();
    }).catch(function (e) { payError(e.message); reset(); });
  });

  document.addEventListener('ig:account', function (e) {
    try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (err) { session = null; }
    role = e.detail.role;
    if (!built) { built = true; build(); }
  });
})();
