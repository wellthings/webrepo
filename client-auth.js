(function () {
  'use strict';
  var SITE = window.SITE || {};
  var API = SITE.apiBase || '';
  var CLIENT_KEY = 'ig_client';
  var CART_KEY = 'ig_cart';
  var LOC_KEY = 'ig_loc';

  function readJson(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
  }
  function saveJson(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function updateHeaderClientAction() {
    var link = document.getElementById('header-client-link');
    if (!link) return;
    var c = readJson(CLIENT_KEY);
    if (c && c.token) {
      link.textContent = 'Dashboard';
      link.href = 'client-dashboard.html';
      link.setAttribute('aria-label', 'Open Control Panel');
    } else {
      link.textContent = 'Sign Up';
      link.href = '#client-signup';
      link.setAttribute('aria-label', 'Sign Up');
    }
  }

  function syncLocalCartToServer(token) {
    var list = readJson(CART_KEY) || [];
    if (!token || !Array.isArray(list) || !list.length) return Promise.resolve();
    return fetch(API + '/client/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        items: list.map(function (i) {
          return { category: i.catName, module: i.label, mode: i.mode };
        })
      })
    }).catch(function () {});
  }

  function initClientAuthSection() {
    updateHeaderClientAction();
    var section = document.getElementById('client-signup');
    if (!section) return;

    var signedCard = document.getElementById('ca-signedin-card');
    var formsCard = document.getElementById('ca-forms-card');
    var whoName = document.getElementById('ca-who-name');
    var whoMeta = document.getElementById('ca-who-meta');
    var logoutBtn = document.getElementById('ca-logout-btn');

    var modeTabs = Array.prototype.slice.call(section.querySelectorAll('[data-ca-mode]'));
    var signupForm = document.getElementById('ca-signup-form');
    var loginForm = document.getElementById('ca-login-form');

    var nameEl = document.getElementById('ca-name');
    var phoneEl = document.getElementById('ca-phone');
    var locEl = document.getElementById('ca-location');
    var useLocBtn = document.getElementById('ca-use-loc');
    var termsCheck = document.getElementById('ca-terms-check');
    var signupMsg = document.getElementById('ca-signup-msg');
    var signupBtn = document.getElementById('ca-signup-submit');

    var loginPhoneEl = document.getElementById('cl-phone');
    var loginMsg = document.getElementById('ca-login-msg');
    var loginBtn = document.getElementById('ca-login-submit');

    function syncSignupButtonState() {
      if (!signupBtn) return;
      signupBtn.disabled = !(termsCheck && termsCheck.checked);
    }
    if (termsCheck) {
      termsCheck.addEventListener('change', function () {
        syncSignupButtonState();
        if (termsCheck.checked && signupMsg && signupMsg.className.indexOf('err') !== -1) {
          setMsg(signupMsg, '', false);
        }
      });
    }
    syncSignupButtonState();

    // Legal document modal (loaded from Supabase admin_uploads bucket via /api/content/client/{terms|privacy})
    var legalModal = document.getElementById('ca-legal-modal');
    var legalTitle = document.getElementById('ca-legal-title');
    var legalBody = document.getElementById('ca-legal-body');
    var legalCloseBtn = document.getElementById('ca-legal-close');
    var legalDoneBtn = document.getElementById('ca-legal-done');
    var legalCache = {};

    function closeLegalModal() {
      if (!legalModal) return;
      legalModal.hidden = true;
      document.body.style.overflow = '';
    }

    function renderLegalBlocks(blocks) {
      if (!legalBody) return;
      legalBody.innerHTML = '';
      if (!Array.isArray(blocks) || !blocks.length) {
        var empty = document.createElement('p');
        empty.className = 'ca-legal-para';
        empty.textContent = 'Document content is currently empty.';
        legalBody.appendChild(empty);
        return;
      }
      blocks.forEach(function (b, idx) {
        var txt = (b && b.text) || '';
        if (!txt) return;
        var el;
        if (b.type === 'title') {
          el = document.createElement('h4');
          el.className = 'ca-legal-doc-title';
        } else if (b.type === 'heading' && idx === 1 && txt.indexOf('Platform:') === 0) {
          el = document.createElement('p');
          el.className = 'ca-legal-meta';
        } else if (b.type === 'heading') {
          el = document.createElement('h5');
          el.className = 'ca-legal-heading';
        } else if (txt.indexOf('- ') === 0) {
          el = document.createElement('p');
          el.className = 'ca-legal-bullet';
          txt = '• ' + txt.slice(2);
        } else {
          el = document.createElement('p');
          el.className = 'ca-legal-para';
        }
        el.textContent = txt;
        legalBody.appendChild(el);
      });
    }

    function openLegalModal(docKey) {
      if (!legalModal || !legalBody) return;
      if (legalTitle) {
        legalTitle.textContent = docKey === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
      }
      legalModal.hidden = false;
      document.body.style.overflow = 'hidden';

      if (legalCache[docKey]) {
        renderLegalBlocks(legalCache[docKey]);
        return;
      }
      legalBody.innerHTML = '<p class="ca-legal-loading">Loading document...</p>';
      fetch(API + '/content/client/' + encodeURIComponent(docKey))
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok || !d.blocks) throw new Error(d.message || d.error || 'Could not load document.');
            return d.blocks;
          });
        })
        .then(function (blocks) {
          legalCache[docKey] = blocks;
          renderLegalBlocks(blocks);
        })
        .catch(function (err) {
          legalBody.innerHTML = '';
          var p = document.createElement('p');
          p.className = 'ca-legal-para';
          p.style.color = '#dc2626';
          p.textContent = (err && err.message) || 'Could not load document right now. Please try again.';
          legalBody.appendChild(p);
        });
    }

    Array.prototype.slice.call(section.querySelectorAll('[data-legal-doc]')).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLegalModal(btn.getAttribute('data-legal-doc'));
      });
    });
    if (legalCloseBtn) legalCloseBtn.addEventListener('click', closeLegalModal);
    if (legalDoneBtn) legalDoneBtn.addEventListener('click', closeLegalModal);
    if (legalModal) {
      legalModal.addEventListener('click', function (e) {
        if (e.target === legalModal) closeLegalModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && legalModal && !legalModal.hidden) closeLegalModal();
    });

    function renderSessionState() {
      var c = readJson(CLIENT_KEY);
      var hasSession = !!(c && c.token);
      if (signedCard) signedCard.hidden = !hasSession;
      if (formsCard) formsCard.hidden = hasSession;
      if (hasSession) {
        if (whoName) whoName.textContent = c.name || 'Welcome';
        if (whoMeta) {
          var parts = [];
          if (c.phone) parts.push('+91 ' + c.phone);
          if (c.location_name) parts.push(c.location_name);
          whoMeta.textContent = parts.join(' · ');
        }
      }
      updateHeaderClientAction();
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try { localStorage.removeItem(CLIENT_KEY); } catch (e) {}
        renderSessionState();
      });
    }

    modeTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = tab.getAttribute('data-ca-mode');
        modeTabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        if (signupForm) signupForm.hidden = mode !== 'signup';
        if (loginForm) loginForm.hidden = mode !== 'login';
      });
    });

    // Only prefill if user previously selected a searched location; otherwise leave empty so "Search city, area, road" shows cleanly
    var savedLoc = readJson(LOC_KEY);
    var selectedSearch = (savedLoc && savedLoc.address && savedLoc.source === 'search') ? savedLoc : null;
    var locClearBtn = document.getElementById('ca-loc-clear');
    var locSug = document.getElementById('ca-loc-suggestions');

    function syncClearBtn() {
      if (locClearBtn && locEl) locClearBtn.hidden = !locEl.value.trim();
    }

    if (locEl && selectedSearch) {
      locEl.value = selectedSearch.address;
    }
    syncClearBtn();

    function setUseLocLabel(text) {
      if (!useLocBtn) return;
      var span = useLocBtn.querySelector('span');
      if (span) span.textContent = text;
      else useLocBtn.textContent = text;
    }

    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function formatSearchAddress(item) {
      var a = (item && item.address) || {};
      var road = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ');
      var area = a.neighbourhood || a.suburb || a.residential || a.quarter || a.hamlet || a.village || '';
      var city = a.city || a.town || a.city_district || a.state_district || a.county || '';
      var state = a.state || '';
      var pin = a.postcode || '';
      var seen = {};
      var parts = [road, area, city, state, pin].filter(function (p) {
        if (!p || seen[p]) return false;
        seen[p] = 1;
        return true;
      });
      var full = parts.length ? parts.join(', ') : (item.display_name || '');
      var main = [road || area || item.name, city].filter(Boolean).filter(function (v, idx, arr) {
        return arr.indexOf(v) === idx;
      }).join(', ') || full;
      return { main: main, sub: full, full: full };
    }

    if (useLocBtn && locEl) {
      useLocBtn.addEventListener('click', function () {
        useLocBtn.disabled = true;
        setUseLocLabel('Detecting current location...');
        if (signupMsg) { signupMsg.textContent = ''; signupMsg.className = 'ca-msg'; }
        document.dispatchEvent(new CustomEvent('ig:location-request'));
      });
      document.addEventListener('ig:location', function (e) {
        useLocBtn.disabled = false;
        setUseLocLabel('Use my current location');
        if (e && e.detail && e.detail.address && locEl) {
          locEl.value = e.detail.address;
          selectedSearch = {
            address: e.detail.address,
            lat: e.detail.lat,
            lng: e.detail.lng,
            source: e.detail.source || 'gps',
            ts: Date.now()
          };
          syncClearBtn();
          if (locSug) locSug.hidden = true;
        }
      });
      document.addEventListener('ig:location-error', function () {
        useLocBtn.disabled = false;
        setUseLocLabel('Use my current location');
        if (signupMsg) {
          signupMsg.className = 'ca-msg err';
          signupMsg.textContent = 'Could not detect GPS location. Please search your city, area or road.';
        }
      });
    }

    var searchTimer = null;
    var activeSugIndex = -1;
    var lastFetchSeq = 0;

    function hideSuggestions() {
      if (!locSug) return;
      locSug.hidden = true;
      activeSugIndex = -1;
    }

    function pickSuggestion(btn) {
      if (!btn || !locEl) return;
      var addr = btn.getAttribute('data-display') || '';
      var lat = parseFloat(btn.getAttribute('data-lat'));
      var lng = parseFloat(btn.getAttribute('data-lng'));
      locEl.value = addr;
      selectedSearch = {
        address: addr,
        lat: isNaN(lat) ? undefined : lat,
        lng: isNaN(lng) ? undefined : lng,
        source: 'search',
        ts: Date.now()
      };
      saveJson(LOC_KEY, selectedSearch);
      syncClearBtn();
      hideSuggestions();
    }

    if (locClearBtn && locEl) {
      locClearBtn.addEventListener('click', function () {
        locEl.value = '';
        selectedSearch = null;
        syncClearBtn();
        hideSuggestions();
        locEl.focus();
      });
    }

    if (locEl && locSug) {
      locEl.addEventListener('input', function () {
        var q = locEl.value.trim();
        syncClearBtn();
        if (!selectedSearch || selectedSearch.address !== q) {
          selectedSearch = null;
        }
        clearTimeout(searchTimer);
        if (q.length < 3) {
          hideSuggestions();
          return;
        }
        var seq = ++lastFetchSeq;
        locSug.innerHTML = '<div class="ca-sug-status">Searching locations...</div>';
        locSug.hidden = false;
        searchTimer = setTimeout(function () {
          fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&accept-language=en&limit=6&q=' + encodeURIComponent(q))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (seq !== lastFetchSeq) return;
              if (!Array.isArray(data) || !data.length) {
                locSug.innerHTML = '<div class="ca-sug-status">No matching address found. Try nearby landmark or city.</div>';
                locSug.hidden = false;
                return;
              }
              activeSugIndex = -1;
              locSug.innerHTML = data.map(function (item) {
                var fmt = formatSearchAddress(item);
                return (
                  '<button type="button" class="ca-sug-item" role="option" data-display="' + escapeHtml(fmt.full) + '" data-lat="' + escapeHtml(item.lat) + '" data-lng="' + escapeHtml(item.lon) + '">' +
                  '<span class="ca-sug-main">' + escapeHtml(fmt.main) + '</span>' +
                  '<span class="ca-sug-sub">' + escapeHtml(fmt.sub) + '</span>' +
                  '</button>'
                );
              }).join('');
              locSug.hidden = false;
              Array.prototype.slice.call(locSug.querySelectorAll('.ca-sug-item')).forEach(function (btn) {
                btn.addEventListener('click', function () { pickSuggestion(btn); });
              });
            })
            .catch(function () {
              if (seq === lastFetchSeq) hideSuggestions();
            });
        }, 280);
      });

      locEl.addEventListener('keydown', function (e) {
        if (locSug.hidden) return;
        var items = Array.prototype.slice.call(locSug.querySelectorAll('.ca-sug-item'));
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeSugIndex = (activeSugIndex + 1) % items.length;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeSugIndex = (activeSugIndex - 1 + items.length) % items.length;
        } else if (e.key === 'Enter' && activeSugIndex >= 0) {
          e.preventDefault();
          pickSuggestion(items[activeSugIndex]);
          return;
        } else if (e.key === 'Escape') {
          hideSuggestions();
          return;
        } else {
          return;
        }
        items.forEach(function (el, idx) { el.classList.toggle('active', idx === activeSugIndex); });
      });

      document.addEventListener('click', function (e) {
        if (!locEl.contains(e.target) && !locSug.contains(e.target) && (!locClearBtn || !locClearBtn.contains(e.target))) {
          hideSuggestions();
        }
      });
    }

    if (phoneEl) {
      phoneEl.addEventListener('input', function () {
        phoneEl.value = phoneEl.value.replace(/\D/g, '').slice(0, 10);
      });
    }
    if (loginPhoneEl) {
      loginPhoneEl.addEventListener('input', function () {
        loginPhoneEl.value = loginPhoneEl.value.replace(/\D/g, '').slice(0, 10);
      });
    }

    function setMsg(el, text, isErr) {
      if (!el) return;
      el.textContent = text || '';
      el.className = 'ca-msg' + (isErr ? ' err' : text ? ' ok' : '');
    }

    function resolveCoordsForSignup(addrText) {
      var latestLoc = readJson(LOC_KEY) || {};
      if (selectedSearch && selectedSearch.address === addrText && typeof selectedSearch.lat === 'number' && typeof selectedSearch.lng === 'number') {
        return Promise.resolve({ lat: selectedSearch.lat, lng: selectedSearch.lng });
      }
      if (latestLoc.address === addrText && typeof latestLoc.lat === 'number' && typeof latestLoc.lng === 'number') {
        return Promise.resolve({ lat: latestLoc.lat, lng: latestLoc.lng });
      }
      return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&accept-language=en&q=' + encodeURIComponent(addrText))
        .then(function (r) { return r.json(); })
        .then(function (list) {
          if (Array.isArray(list) && list.length) {
            var lat = parseFloat(list[0].lat);
            var lng = parseFloat(list[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) return { lat: lat, lng: lng };
          }
          return null;
        })
        .catch(function () { return null; });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameVal = nameEl ? nameEl.value.trim() : '';
        var phoneVal = phoneEl ? phoneEl.value.trim() : '';
        var locVal = locEl ? locEl.value.trim() : '';

        if (!termsCheck || !termsCheck.checked) {
          setMsg(signupMsg, 'Please accept terms&conditions and privacy policy to continue.', true);
          syncSignupButtonState();
          if (termsCheck) termsCheck.focus();
          return;
        }
        if (nameVal.length < 2) {
          setMsg(signupMsg, 'Please enter your full name (at least 2 characters).', true);
          if (nameEl) nameEl.focus();
          return;
        }
        if (!/^[6-9]\d{9}$/.test(phoneVal)) {
          setMsg(signupMsg, 'Please enter a valid 10 digit mobile number starting with 6-9.', true);
          if (phoneEl) phoneEl.focus();
          return;
        }
        if (locVal.length < 2) {
          setMsg(signupMsg, 'Please search or enter your city, area or road.', true);
          if (locEl) locEl.focus();
          return;
        }

        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating your control panel...';
        setMsg(signupMsg, '', false);

        resolveCoordsForSignup(locVal).then(function (coords) {
          var payload = {
            name: nameVal,
            phone: phoneVal,
            otpToken: 'test_token_' + phoneVal,
            location_name: locVal
          };
          if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            payload.latitude = coords.lat;
            payload.longitude = coords.lng;
          }
          return fetch(API + '/client/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
            .then(function (r) {
              return r.json().catch(function () { return {}; }).then(function (d) {
                if (!r.ok) throw new Error(d.message || d.error || 'Could not sign up. Please try again.');
                return d;
              });
            })
            .then(function (d) {
              saveJson(LOC_KEY, {
                address: locVal,
                lat: coords ? coords.lat : undefined,
                lng: coords ? coords.lng : undefined,
                source: (selectedSearch && selectedSearch.source) || 'search',
                ts: Date.now()
              });
              saveJson(CLIENT_KEY, {
                id: d.client && d.client.id,
                token: d.token,
                name: (d.client && d.client.name) || nameVal,
                phone: (d.client && d.client.phone) || phoneVal,
                location_name: (d.client && d.client.location_name) || locVal,
                created_at: d.client && d.client.created_at
              });
              return syncLocalCartToServer(d.token).then(function () {
                location.href = 'client-dashboard.html';
              });
            });
        }).catch(function (err) {
          signupBtn.textContent = 'Create your control panel';
          syncSignupButtonState();
          setMsg(signupMsg, (err && err.message) || 'Could not complete signup.', true);
        });
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var phoneVal = loginPhoneEl ? loginPhoneEl.value.trim() : '';
        if (!/^[6-9]\d{9}$/.test(phoneVal)) {
          setMsg(loginMsg, 'Enter your registered 10 digit mobile number.', true);
          if (loginPhoneEl) loginPhoneEl.focus();
          return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        setMsg(loginMsg, '', false);

        fetch(API + '/client/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneVal, otpToken: 'test_token_' + phoneVal })
        })
          .then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              if (!r.ok) throw new Error(d.message || d.error || 'Login failed.');
              return d;
            });
          })
          .then(function (d) {
            saveJson(CLIENT_KEY, {
              id: d.client && d.client.id,
              token: d.token,
              name: d.client && d.client.name,
              phone: d.client && d.client.phone,
              location_name: d.client && d.client.location_name,
              created_at: d.client && d.client.created_at
            });
            return syncLocalCartToServer(d.token).then(function () {
              location.href = 'client-dashboard.html';
            });
          })
          .catch(function (err) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            setMsg(loginMsg, (err && err.message) || 'Account not found. Please sign up first.', true);
          });
      });
    }

    document.addEventListener('ig:client-changed', renderSessionState);
    renderSessionState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClientAuthSection);
  } else {
    initClientAuthSection();
  }
})();
