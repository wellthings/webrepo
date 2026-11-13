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

  var MANDATORY_PARTNER_CHECKS = [
    ['has_team', 'Do you have a working team?'],
    ['has_tools', 'Do you have your own tool/toolbox?'],
    ['knows_work_completely', 'Do you have complete knowledge of your work, pricing, calculation, and client dealing?']
  ];

  var PLAN_FEES = { partner: 109, supplier: 219, architect: 310 };
  var session = null, role = null, built = false, toggles = {}, files = {}, urls = {}, skill = 'intermediate';
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
  function range(from, to, fmt) {
    var out = [];
    for (var i = from; i <= to; i++) out.push([String(i), fmt ? fmt(i) : String(i)]);
    return out;
  }

  function upload(kind, file) {
    if (!session || !session.accessToken || String(session.uuid || '').indexOf('test_') === 0) {
      return Promise.resolve(URL.createObjectURL(file));
    }
    return fetch(API + '/users/' + session.uuid + '/upload?kind=' + encodeURIComponent(kind), {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
        Authorization: 'Bearer ' + session.accessToken
      },
      body: file
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || 'Upload failed.');
        return d.url;
      });
    });
  }

  function buildSkillLevel(labelText) {
    var levels = [
      ['new', 'New'],
      ['intermediate', 'Intermediate'],
      ['experienced', 'Experienced']
    ];
    return '<div class="field" data-field="skill_level">' +
      '<label>' + labelText + '</label>' +
      '<div class="skill-grid" role="radiogroup" aria-label="' + labelText + '">' +
      levels.map(function (lv) {
        var active = lv[0] === skill;
        return '<button type="button" class="skill-btn" role="radio" aria-checked="' + (active ? 'true' : 'false') + '" data-skill="' + lv[0] + '">' + lv[1] + '</button>';
      }).join('') +
      '</div>' +
      '<p class="hint">Select the level that matches your practical site capability.</p>' +
      '</div>';
  }

  function build() {
    toggles = {};
    skill = 'intermediate';
    var h = '';

    // Cover Banner & Profile Picture (prominent for Architect & Supplier, available across roles)
    h += '<div class="cover"><label class="cover-banner" for="banner"><img id="banner-img" alt="" hidden><span class="cover-ph">' +
      svg('pin').replace(ICONS.pin, '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>') +
      (role === 'architect' ? 'Upload Architect Banner' : role === 'supplier' ? 'Upload Shop Banner' : 'Add banner photo') +
      '</span></label>' +
      '<input class="sr" id="banner" type="file" accept="image/jpeg,image/png,image/webp">' +
      '<label class="avatar" for="profile_photo"><img id="profile_photo-img" alt="" hidden><span class="avatar-ph">' + svg('user') + '</span><span class="avatar-plus">+</span></label>' +
      '<input class="sr" id="profile_photo" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
      '<p class="hint cover-hint" id="banner-hint">' +
      (role === 'partner' ? 'Profile and banner photo (optional). JPG, PNG or WebP, up to 5 MB.' : 'Upload your profile picture & banner (JPG, PNG or WebP, up to 5 MB).') +
      '</p><p class="hint cover-hint" id="profile_photo-hint"></p>';

    // Role-specific top banners & notices
    if (role === 'partner') {
      h += '<div class="warn-banner" role="alert">' +
        '<strong>WARNING: Strict KYC / Aadhaar Verification in Progress</strong>' +
        'Any mismatch or fake profile will lead to immediate account suspension. Ensure you possess the required team, tools, and technical skill before proceeding. For support: <a href="mailto:support@interagood.in">support@interagood.in</a>' +
        '</div>';
    } else if (role === 'architect') {
      h += '<div class="warn-banner" role="alert">' +
        '<strong>Architect Compliance Notice</strong>' +
        'All submitted credentials, Aadhaar details, design software proficiency, and client quotes must be accurate and original. Misrepresentation or unapproved material claims lead to immediate suspension.' +
        '</div>';
    } else if (role === 'supplier') {
      h += '<div class="ok-banner">' +
        '<strong>Instant Supplier Onboarding</strong> — No video call verification is required. Complete your shop profile below for immediate access to your Supplier PWA Dashboard.' +
        '</div>';
    }

    // Common Basic Details (Required for All Roles)
    h += '<p class="biz-section">Basic details (Required)</p>';
    h += text('full_name', 'Full Name (as per Aadhaar)', 'user', 'Enter your exact name as on Aadhaar', 'maxlength="120"');
    h += text('business_name', role === 'supplier' ? 'Shop / Business Name' : 'Business Name', 'shop', 'Your business or studio name', 'maxlength="150"');

    if (role === 'partner' || role === 'supplier') {
      h += select('category_id', role === 'partner' ? 'Partner Category' : 'Supply Category', 'list', [], 'Loading categories...');
    }

    if (role === 'partner' || role === 'architect') {
      h += buildSkillLevel(role === 'partner' ? 'Skill Level' : 'Architect Level');
    }

    // Common Age & Experience (Required for All Roles)
    h += '<p class="biz-section">Age &amp; Experience</p><div class="field-row">';
    h += select('age', 'Age', 'num', range(18, 70, function (n) { return n + ' yrs'; }), 'Select age');
    h += select('experience_years', 'Experience (in Years)', 'clock', [['0', 'Less than 1 year (New)']].concat(range(1, 40, function (n) { return n + (n === 1 ? ' year' : ' years'); })), 'Select experience');
    h += '</div>';

    // Architect-specific specialized fields
    if (role === 'architect') {
      h += '<p class="biz-section">Qualifications &amp; Software</p>';
      h += text('courses_completed', 'Courses Completed', 'cap', 'e.g., B.Arch, Diploma in Interior Design, Vastu', 'maxlength="150"');
      h += text('design_software', 'Design Software Used', 'pc', 'e.g., AutoCAD, SketchUp, Revit, 3ds Max, V-Ray', 'maxlength="80"');
    }

    // Supplier-specific shop operational history
    if (role === 'supplier') {
      h += '<p class="biz-section">Shop History</p>';
      h += select('shop_years', 'Shop Operational History (Years Active)', 'shop', [['0', 'Newly opened (< 1 year)']].concat(range(1, 60, function (n) { return n + (n === 1 ? ' year active' : ' years active'); })), 'Select years shop is active');
    }

    // Partner Mandatory 3 Checkboxes + Helpful Tip
    if (role === 'partner') {
      h += '<p class="biz-section">Mandatory Readiness Checklist (All 3 required to submit)</p>';
      MANDATORY_PARTNER_CHECKS.forEach(function (item) {
        toggles[item[0]] = false;
        h += '<label class="mandatory-check" id="wrap-' + item[0] + '">' +
          '<input type="checkbox" id="chk-' + item[0] + '" data-req-toggle="' + item[0] + '">' +
          '<span>' + item[1] + '</span>' +
          '</label>';
      });
      h += '<div class="tip-banner">' +
        '<strong>Helpful Tip — Building Your Team</strong>' +
        'Working alone right now? You can form a legal working team by partnering with skilled friends or family members who already own a complete toolset before completing registration.' +
        '</div>';
    }

    // Current Address + Geolocation Auto-Detect (All Roles)
    h += '<p class="biz-section">Current Address &amp; Geolocation</p>';
    h += '<div class="field addr-search-field"><label for="addr-search">Search address or auto-detect</label><div class="input">' + svg('pin') + '<input id="addr-search" type="text" placeholder="Search area, street, city..." autocomplete="off"></div><ul class="suggest" id="addr-suggest" hidden></ul><p class="hint" id="loc-hint">Tap below to auto-detect your accurate coordinates and address string.</p></div>';
    h += '<button type="button" class="btn-sm loc-btn" id="use-location">' + svg('pin').replace('<svg', '<svg class="btn-ic"') + 'Auto-detect Current Location</button>';
    h += field('address', 'Current Address', 'pin', '<textarea id="address" maxlength="300" placeholder="House / Shop / Street / Locality"></textarea>');
    h += '<div class="field-row">' + text('city', 'City', 'pin', 'City', 'maxlength="80"') + text('state', 'State', 'pin', 'State', 'maxlength="80"') + '</div>';
    h += text('pincode', 'Pincode', 'pin', '6 digit pincode', 'inputmode="numeric" maxlength="6"');

    el.fields.innerHTML = h;
    wire();
    if (role === 'partner' || role === 'supplier') loadCategories();
  }

  function loadCategories() {
    var sel = $('category_id');
    var endpoint = role === 'partner' ? '/categories/partner' : '/categories/supplier';
    fetch(API + endpoint).then(function (r) { return r.json(); }).then(function (d) {
      var rows = (d && d.data) || [];
      if (!rows.length && window.CATALOG && window.CATALOG[role]) {
        rows = window.CATALOG[role].map(function (c, i) { return { id: i + 1, name: c.name }; });
      }
      sel.innerHTML = '<option value="">Select category</option>' + rows.map(function (c) {
        return '<option value="' + c.id + '">' + String(c.name).replace(/</g, '&lt;') + '</option>';
      }).join('');
    }).catch(function () {
      var fallback = (window.CATALOG && window.CATALOG[role]) || [];
      sel.innerHTML = '<option value="">Select category</option>' + fallback.map(function (c, i) {
        return '<option value="' + (i + 1) + '">' + String(c.name).replace(/</g, '&lt;') + '</option>';
      }).join('');
    });
  }

  function wire() {
    // Skill radio buttons
    Array.prototype.forEach.call(el.fields.querySelectorAll('.skill-btn'), function (b) {
      b.addEventListener('click', function () {
        skill = b.getAttribute('data-skill');
        Array.prototype.forEach.call(el.fields.querySelectorAll('.skill-btn'), function (o) {
          o.setAttribute('aria-checked', o === b ? 'true' : 'false');
        });
        refresh();
      });
    });

    // Mandatory partner checkboxes
    Array.prototype.forEach.call(el.fields.querySelectorAll('[data-req-toggle]'), function (chk) {
      var key = chk.getAttribute('data-req-toggle');
      chk.addEventListener('change', function () {
        toggles[key] = !!chk.checked;
        var wrap = $('wrap-' + key);
        if (wrap) wrap.classList.toggle('checked', !!chk.checked);
        refresh();
      });
    });

    // Cover banner & avatar uploads
    ['profile_photo', 'banner'].forEach(function (id) {
      var input = $(id);
      if (!input) return;
      input.addEventListener('change', function () {
        var f = this.files[0], hint = $(id + '-hint'), img = $(id + '-img');
        files[id] = null; img.hidden = true;
        if (!f) return;
        if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { hint.textContent = 'Only JPG, PNG or WebP allowed.'; this.value = ''; return; }
        if (f.size > 5 * 1024 * 1024) { hint.textContent = 'File is larger than 5 MB.'; this.value = ''; return; }
        var kind = id === 'banner' ? 'banner' : 'profile';
        var av = input.previousElementSibling;
        files[id] = true; hint.textContent = 'Uploading...';
        if (av) av.classList.add('uploading');
        upload(kind, f).then(function (url) {
          urls[id] = url;
          img.src = url;
          img.hidden = false;
          hint.textContent = id === 'banner' ? 'Banner saved.' : 'Profile photo saved.';
        }).catch(function (err) {
          files[id] = null; urls[id] = null; input.value = '';
          hint.textContent = err.message;
        }).then(function () { files[id] = null; if (av) av.classList.remove('uploading'); refresh(); });
      });
    });

    wireLocation();
    var pin = $('pincode');
    if (pin) pin.addEventListener('input', function () { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); refresh(); });
  }

  // ---- location: browser geolocation + OpenStreetMap Nominatim ----
  var NOM = 'https://nominatim.openstreetmap.org';
  var coords = null;
  function setVal(id, v) { if (v && $(id)) { $(id).value = v; $(id).closest('.field').classList.remove('bad'); } }
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
      hint.textContent = 'Detecting coordinates...';
      navigator.geolocation.getCurrentPosition(function (pos) {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        hint.textContent = 'Coordinates detected (' + coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4) + '). Fetching address...';
        fetch(NOM + '/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=' + coords.lat + '&lon=' + coords.lng, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            fillAddress(d.address, d.display_name);
            box.value = d.display_name || '';
            hint.textContent = 'Accurate location & coordinates detected (' + coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4) + ').';
            refresh();
          })
          .catch(function () {
            hint.textContent = 'Coordinates detected (' + coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4) + '). Please complete street address below.';
            refresh();
          });
      }, function (err) {
        hint.textContent = err.code === 1 ? 'Permission denied. Search or type your address instead.' : 'Could not get location. Search or type your address below.';
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
                hint.textContent = 'Address & coordinates filled.';
                refresh();
              });
              list.appendChild(li);
            });
            list.hidden = false;
          }).catch(function () { list.hidden = true; });
      }, 450);
    });
    document.addEventListener('click', function (e) { if (!list.contains(e.target) && e.target !== box) list.hidden = true; });
  }

  function val(id) { var n = $(id); return n ? n.value.trim() : ''; }
  function setBad(id, msg) {
    var n = $(id); if (!n) return;
    var f = n.closest('.field'); if (f) { f.classList.add('bad'); var h = f.querySelector('.hint'); if (h) h.textContent = msg; }
  }
  function validate(show) {
    if (show) Array.prototype.forEach.call(el.fields.querySelectorAll('.field.bad'), function (f) { f.classList.remove('bad'); });
    var bad = null;
    function need(id, ok, msg) { if (!ok) { if (show) setBad(id, msg); bad = bad || id; } }
    need('full_name', val('full_name').length >= 2, 'Enter full name as per Aadhaar.');
    need('business_name', val('business_name').length >= 2, 'Enter your business name.');
    if ($('category_id')) need('category_id', !!val('category_id'), 'Select a category.');
    need('age', !!val('age'), 'Select your age.');
    need('experience_years', val('experience_years') !== '', 'Select your experience in years.');
    if (role === 'architect') {
      need('courses_completed', val('courses_completed').length >= 2, 'Enter completed courses or degree.');
      need('design_software', val('design_software').length >= 2, 'Enter design software used.');
    }
    if (role === 'supplier') {
      need('shop_years', val('shop_years') !== '', 'Select years your shop has been active.');
    }
    if (role === 'partner') {
      var allThree = MANDATORY_PARTNER_CHECKS.every(function (t) { return !!toggles[t[0]]; });
      if (!allThree) bad = bad || 'chk-has_team';
    }
    need('address', val('address').length >= 3, 'Enter your current address.');
    need('city', val('city').length >= 2, 'Enter your city.');
    need('state', val('state').length >= 2, 'Enter your state.');
    need('pincode', /^\d{6}$/.test(val('pincode')), 'Pincode must be 6 digits.');
    if (show && bad && $(bad)) $(bad).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !bad;
  }

  function isUploading() { return !!(files.profile_photo || files.banner); }
  var submitting = false;
  function refresh() { if (built && !submitting) el.save.disabled = isUploading() || !validate(false); }
  setInterval(refresh, 300);

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (el.save.disabled || !session) return;
    if (isUploading() || !validate(true)) return;
    submitting = true; el.save.disabled = true; el.save.textContent = 'Activating dashboard...'; el.error.hidden = true;
    var body = {
      full_name: val('full_name'),
      business_name: val('business_name'),
      address: val('address'),
      city: val('city'),
      state: val('state'),
      pincode: val('pincode'),
      age: val('age'),
      experience_years: val('experience_years')
    };
    if ($('category_id')) body.category_id = val('category_id');
    if (role === 'partner' || role === 'architect') body.skill_level = skill;
    if (role === 'partner') {
      body.has_team = !!toggles.has_team;
      body.has_tools = !!toggles.has_tools;
      body.knows_work_completely = !!toggles.knows_work_completely;
    }
    if (role === 'architect') {
      body.courses_completed = val('courses_completed');
      body.education = val('courses_completed');
      body.design_software = val('design_software');
      body.uses_boq_tools = true;
      body.worked_with_team_before = true;
    }
    if (role === 'supplier') {
      body.shop_years = parseInt(val('shop_years') || '0', 10);
      if (!coords) coords = { lat: 26.8467, lng: 80.9462 };
    }
    if (coords) { body.latitude = coords.lat; body.longitude = coords.lng; }
    if (urls.profile_photo) body.profile_photo_url = urls.profile_photo;
    if (urls.banner) body.banner_url = urls.banner;

    var isLocalTest = String(session.uuid || '').indexOf('test_') === 0;
    var req = isLocalTest
      ? Promise.resolve({ success: true, card: body })
      : fetch(API + '/users/' + session.uuid + '/profile-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken },
          body: JSON.stringify(body)
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok) throw new Error(d.message || 'Could not save profile. Please try again.');
            return d;
          });
        });

    req.then(function (d) {
      var cardData = Object.assign({}, body, (d && d.card) || {}, {
        username: (d && d.card && d.card.username) || session.username || 'member',
        role: role,
        category_name: (d && d.card && d.card.category_name) || ($('category_id') && $('category_id').selectedIndex >= 0 ? $('category_id').options[$('category_id').selectedIndex].text : ''),
        ig_id: (d && d.card && d.card.ig_id) || session.ig_id || ('IG-' + String(session.uuid).slice(-6).toUpperCase()),
        payment_status: (d && d.card && d.card.payment_status) || session.payment_status || 'unpaid'
      });
      try {
        session.profile = cardData;
        session.payment_status = cardData.payment_status;
        sessionStorage.setItem('ig_session', JSON.stringify(session));
      } catch (err) {}
      showOnboardingCard(cardData);
    }).catch(function (err) {
      submitting = false;
      el.error.textContent = err.message; el.error.hidden = false;
      el.save.textContent = 'Submit & Continue to Onboarding'; refresh();
    });
  });

  function showOnboardingCard(card) {
      var stepBiz = $('step-business'), stepCard = $('step-card'), stepDone = $('step-done');
      if (stepBiz) stepBiz.hidden = true;
      if (stepDone) stepDone.hidden = true;
      if (!stepCard) { window.location.href = 'dashboard.html'; return; }

      var r = card.role || role || (session && session.role) || 'partner';
      var bName = card.business_name || card.full_name || 'Your Business';
      var uName = card.username || (session && session.username) || 'user';
      var addr = [card.address, card.city, card.state, card.pincode].filter(Boolean).join(', ') || '-';
      var fee = PLAN_FEES[r] || 109;

      if ($('bc-name')) $('bc-name').textContent = bName;
      if ($('bc-user')) $('bc-user').textContent = '@' + uName;
      if ($('bc-initial')) $('bc-initial').textContent = bName.charAt(0).toUpperCase();
      if ($('bc-igid')) $('bc-igid').textContent = card.ig_id || ('IG-' + String((session && session.uuid) || '000').slice(-6).toUpperCase());
      if ($('bc-role')) $('bc-role').textContent = r.charAt(0).toUpperCase() + r.slice(1);
      if ($('bc-category')) $('bc-category').textContent = card.category_name || (r.charAt(0).toUpperCase() + r.slice(1));
      if ($('bc-address')) $('bc-address').textContent = addr;

      if ($('bc-banner') && card.banner_url) { $('bc-banner').src = card.banner_url; $('bc-banner').hidden = false; }
      if ($('bc-avatar') && card.profile_photo_url) {
        $('bc-avatar').src = card.profile_photo_url;
        $('bc-avatar').hidden = false;
        if ($('bc-initial')) $('bc-initial').hidden = true;
      }

      var isPaid = card.payment_status === 'paid' || (session && session.payment_status === 'paid');
      if ($('bc-state')) {
        $('bc-state').textContent = isPaid ? 'Active · Paid' : 'Payment Pending';
        $('bc-state').classList.toggle('on', isPaid);
      }
      if ($('bc-online')) $('bc-online').setAttribute('aria-checked', isPaid ? 'true' : 'false');
      if ($('bc-online-label')) $('bc-online-label').textContent = isPaid ? 'Online' : 'Offline';

      var payBtn = $('pay-btn');
      if (payBtn) {
        payBtn.textContent = isPaid ? 'Go to App Dashboard' : 'Pay ₹' + fee + ' & Activate Dashboard';
        payBtn.disabled = false;
      }
      stepCard.hidden = false;
      stepCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    var payBtnEl = $('pay-btn');
    if (payBtnEl && !payBtnEl.getAttribute('data-wired')) {
      payBtnEl.setAttribute('data-wired', '1');
      payBtnEl.addEventListener('click', function () {
        try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (err) {}
        if (!session) return;
        var r = session.role || role || 'partner';
        var fee = PLAN_FEES[r] || 109;
        var p = session.profile || {};
        var errEl = $('pay-error');
        if (errEl) errEl.hidden = true;

        if (session.payment_status === 'paid') {
          window.location.href = 'dashboard.html';
          return;
        }
        if (!window.InteragoodPayU) {
          if (errEl) { errEl.textContent = 'Payment engine unavailable. Please reload.'; errEl.hidden = false; }
          return;
        }
        payBtnEl.disabled = true;
        window.InteragoodPayU.initiatePayment({
          amount: fee,
          productInfo: 'Interagood ' + r.charAt(0).toUpperCase() + r.slice(1) + ' Onboarding',
          firstName: p.full_name || session.username || 'Member',
          email: p.email || 'onboarding@interagood.in',
          phone: session.phone || p.phone || '9999999999',
          onSuccess: function (res) {
            var isLocal = String(session.uuid || '').indexOf('test_') === 0;
            var actReq = isLocal
              ? Promise.resolve({ payment_status: 'paid', next_due_at: new Date(Date.now() + 30 * 86400000).toISOString() })
              : fetch(API + '/payments/payu/sandbox-activate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken },
                  body: JSON.stringify({ txnid: res.txnid })
                }).then(function (resp) {
                  return resp.json().catch(function () { return {}; }).then(function (dd) {
                    if (!resp.ok) throw new Error(dd.message || 'Activation failed');
                    return dd;
                  });
                });

            actReq.then(function (dd) {
              session.payment_status = dd.payment_status || 'paid';
              session.is_online = true;
              session.profile = Object.assign({}, session.profile || {}, {
                payment_status: 'paid',
                is_online: true,
                next_due_at: dd.next_due_at || new Date(Date.now() + 30 * 86400000).toISOString()
              });
              sessionStorage.setItem('ig_session', JSON.stringify(session));
              if ($('bc-state')) { $('bc-state').textContent = 'Active · Paid'; $('bc-state').classList.add('on'); }
              if ($('bc-online')) $('bc-online').setAttribute('aria-checked', 'true');
              if ($('bc-online-label')) $('bc-online-label').textContent = 'Online';
              payBtnEl.textContent = 'Activated! Opening Dashboard...';
              setTimeout(function () { window.location.href = 'dashboard.html'; }, 550);
            }).catch(function (e2) {
              payBtnEl.disabled = false;
              if (errEl) { errEl.textContent = e2.message || 'Payment verification failed.'; errEl.hidden = false; }
            });
          },
          onFailure: function (failRes) {
            payBtnEl.disabled = false;
            if (errEl) {
              errEl.textContent = (failRes && failRes.message) || 'Payment cancelled. Complete payment to unlock your Dashboard.';
              errEl.hidden = false;
            }
          }
        });
      });
    }

    document.addEventListener('ig:show-onboarding-card', function (ev) {
      try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (err) {}
      if (!session) return;
      role = session.role || role;
      var cardObj = (ev && ev.detail && ev.detail.card) || session.profile || {};
      showOnboardingCard(cardObj);
    });

  document.addEventListener('ig:account', function (e) {
    try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (err) { session = null; }
    role = e.detail.role;
    built = true;
    build();
    refresh();
  });
})();
