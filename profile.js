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
  var SOFTWARE = ['AutoCAD', 'SketchUp', '3ds Max', 'Revit', 'Lumion', 'V-Ray', 'Photoshop', 'Other'];
  var TOGGLES = {
    partner: [
      ['has_tools', 'Kya aapke paas auzar hain?'],
      ['has_team', 'Kya aapke saath kaam karne wali team hai?'],
      ['knows_work_completely', 'Kya aapko apne kaam ki poori jaankari hai?'],
      ['knows_pricing', 'Kya aapko apne kaam ki calculation aur pricing ke baare me pata hai?'],
      ['worked_with_team_before', 'Kya aapne apni team ke saath koi alag kaam kiya hai?']
    ],
    architect: [['uses_boq_tools', 'Kya aap quotation ke liye BOQ tools use karte hain?']],
    site_inspector: [
      ['has_tools', 'Kya aapke paas inspection ke auzar hain?'],
      ['knows_work_completely', 'Kya aapko site kaam ki poori jaankari hai?']
    ]
  };

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
  function range(from, to, fmt) {
    var out = [];
    for (var i = from; i <= to; i++) out.push([String(i), fmt ? fmt(i) : String(i)]);
    return out;
  }

  function build() {
    var h = '<div class="cover"><label class="cover-banner" for="banner"><img id="banner-img" alt="" hidden><span class="cover-ph">' + svg('pin').replace(ICONS.pin, '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>') + 'Add banner photo</span></label>' +
      '<input class="sr" id="banner" type="file" accept="image/jpeg,image/png,image/webp">' +
      '<label class="avatar" for="profile_photo"><img id="profile_photo-img" alt="" hidden><span class="avatar-ph">' + svg('user') + '</span><span class="avatar-plus">+</span></label>' +
      '<input class="sr" id="profile_photo" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
      '<p class="hint cover-hint" id="banner-hint">Banner and profile photo are optional. JPG, PNG or WebP, up to 5 MB.</p><p class="hint cover-hint" id="profile_photo-hint"></p>';
    h += '<p class="biz-section">Basic details</p>';
    h += text('full_name', 'Full name', 'user', 'Your full name', 'maxlength="120"');
    h += text('business_name', 'Business name', 'shop', 'Your business or brand name', 'maxlength="150"');
    if (role === 'partner' || role === 'supplier') {
      h += select('category_id', role === 'partner' ? 'Your work category' : 'Supply category', 'list', [], 'Loading categories...');
    }
    if (role !== 'supplier') {
      h += '<p class="biz-section">Experience</p><div class="field-row">';
      h += select('age', 'Age', 'num', range(18, 65), 'Select age');
      h += select('experience_years', 'Experience', 'clock', [['0', 'Fresher']].concat(range(1, 40, function (n) { return n + (n === 1 ? ' year' : ' years'); })), 'Select experience');
      h += '</div>';
    }
    if (role === 'architect') {
      h += text('education', 'Education / qualification', 'cap', 'e.g. B.Arch, Diploma in Architecture', 'maxlength="150"');
      h += select('design_software', 'Designing software', 'pc', SOFTWARE.map(function (s) { return [s, s]; }), 'Select software');
    }
    if (TOGGLES[role]) {
      h += '<p class="biz-section">About your work</p>';
      TOGGLES[role].forEach(function (t) { h += toggle(t[0], t[1]); });
      if (role === 'partner') {
        h += '<div id="team-count-wrap" hidden>' + field('team_members_count', 'Team members', 'user', '<input id="team_members_count" type="text" inputmode="numeric" maxlength="3" placeholder="How many people in your team?">') + '</div>';
      }
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
    wireLocation();
    var pin = $('pincode');
    pin.addEventListener('input', function () { pin.value = pin.value.replace(/\D/g, '').slice(0, 6); });
    if ($('team_members_count')) $('team_members_count').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 3); });
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
  function validate() {
    Array.prototype.forEach.call(el.fields.querySelectorAll('.field.bad'), function (f) { f.classList.remove('bad'); });
    var bad = null;
    function need(id, ok, msg) { if (!ok) { setBad(id, msg); bad = bad || id; } }
    need('full_name', val('full_name').length >= 2, 'Enter your full name.');
    need('business_name', val('business_name').length >= 2, 'Enter your business name.');
    if ($('category_id')) need('category_id', !!val('category_id'), 'Select a category.');
    if ($('age')) { need('age', !!val('age'), 'Select your age.'); need('experience_years', !!val('experience_years'), 'Select your experience.'); }
    if ($('education')) { need('education', val('education').length >= 2, 'Enter your education.'); need('design_software', !!val('design_software'), 'Select software.'); }
    if (toggles.has_team) need('team_members_count', parseInt(val('team_members_count'), 10) > 0, 'Enter team size.');
    if (role === 'supplier' && !coords) { setBad('addr-search', 'Search your shop address or use current location.'); bad = bad || 'addr-search'; }
    need('address', val('address').length >= 3, 'Enter your address.');
    need('city', val('city').length >= 2, 'Enter your city.');
    need('state', val('state').length >= 2, 'Enter your state.');
    need('pincode', /^\d{6}$/.test(val('pincode')), 'Pincode must be 6 digits.');
    if (bad) $(bad).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !bad;
  }

  function upload(kind, file) {
    return fetch(API + '/users/' + session.uuid + '/upload?kind=' + kind, {
      method: 'POST', headers: { 'Content-Type': file.type, Authorization: 'Bearer ' + session.accessToken }, body: file
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || 'Photo upload failed. Please try again.');
        return d.url;
      });
    });
  }

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (el.save.disabled || !session) return;
    if (files.profile_photo || files.banner) { el.error.textContent = 'Please wait, photo is still uploading.'; el.error.hidden = false; return; }
    if (!validate()) return;
    el.save.disabled = true; el.save.textContent = 'Saving...'; el.error.hidden = true;
    var body = {
      full_name: val('full_name'), business_name: val('business_name'), address: val('address'),
      city: val('city'), state: val('state'), pincode: val('pincode')
    };
    ['category_id', 'age', 'experience_years', 'education', 'design_software'].forEach(function (k) { if ($(k)) body[k] = val(k); });
    Object.keys(toggles).forEach(function (k) { body[k] = !!toggles[k]; });
    if (coords) { body.latitude = coords.lat; body.longitude = coords.lng; }
    if (toggles.has_team) body.team_members_count = parseInt(val('team_members_count'), 10);
    if (urls.profile_photo) body.profile_photo_url = urls.profile_photo;
    if (urls.banner) body.banner_url = urls.banner;
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
      $('biz-summary').textContent = body.business_name + ' - ' + body.city;
      $('step-business').hidden = true;
      $('step-biz-done').hidden = false;
      $('step-biz-done').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (err) {
      el.error.textContent = err.message; el.error.hidden = false;
      el.save.disabled = false; el.save.textContent = 'Save business profile';
    });
  });

  document.addEventListener('ig:account', function (e) {
    try { session = JSON.parse(sessionStorage.getItem('ig_session')); } catch (err) { session = null; }
    role = e.detail.role;
    if (!built) { built = true; build(); }
  });
})();
