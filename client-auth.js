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

    // Prefill saved GPS / typed location if available
    var savedLoc = readJson(LOC_KEY);
    if (locEl && savedLoc && savedLoc.address && !locEl.value) {
      locEl.value = savedLoc.address;
    }

    if (useLocBtn && locEl) {
      useLocBtn.addEventListener('click', function () {
        useLocBtn.disabled = true;
        useLocBtn.textContent = 'Detecting location...';
        if (signupMsg) { signupMsg.textContent = ''; signupMsg.className = 'ca-msg'; }
        document.dispatchEvent(new CustomEvent('ig:location-request'));
      });
      document.addEventListener('ig:location', function (e) {
        if (useLocBtn) {
          useLocBtn.disabled = false;
          useLocBtn.textContent = 'Use my current location';
        }
        if (e && e.detail && e.detail.address && locEl && document.activeElement !== locEl) {
          locEl.value = e.detail.address;
        }
      });
      document.addEventListener('ig:location-error', function () {
        if (useLocBtn) {
          useLocBtn.disabled = false;
          useLocBtn.textContent = 'Use my current location';
        }
        if (signupMsg) {
          signupMsg.className = 'ca-msg err';
          signupMsg.textContent = 'Could not detect GPS location. Please type your area & city.';
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
          setMsg(signupMsg, 'Please enter your area and city.', true);
          if (locEl) locEl.focus();
          return;
        }

        var latestLoc = readJson(LOC_KEY) || {};
        var payload = {
          name: nameVal,
          phone: phoneVal,
          otpToken: 'test_token_' + phoneVal,
          location_name: locVal
        };
        if (latestLoc.address === locVal && typeof latestLoc.lat === 'number' && typeof latestLoc.lng === 'number') {
          payload.latitude = latestLoc.lat;
          payload.longitude = latestLoc.lng;
        }

        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating your control panel...';
        setMsg(signupMsg, '', false);

        fetch(API + '/client/signup', {
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
            if (latestLoc.address !== locVal) {
              saveJson(LOC_KEY, { address: locVal, source: 'manual', ts: Date.now() });
            }
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
          })
          .catch(function (err) {
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
