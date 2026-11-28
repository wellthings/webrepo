/**
 * Interagood PWA Client Engine & PayU Modular Integration
 */
(function () {
  'use strict';

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.warn('[PWA] Service worker registration failed:', err);
      });
    });
  }

  // 2. Online / Offline status monitoring
  function updateOnlineStatus() {
    var indicator = document.getElementById('pwa-offline-indicator');
    if (!navigator.onLine) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'pwa-offline-indicator';
        indicator.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9999;background:#e65100;color:#fff;padding:8px 14px;border-radius:8px;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(0,0,0,0.25);';
        indicator.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#fff;animation:pulse 1.5s infinite"></span> Offline Mode — Cached data active';
        document.body.appendChild(indicator);
      }
    } else if (indicator) {
      indicator.remove();
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // 3. PWA Install Prompt
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    renderInstallButton();
  });

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  }

  function renderInstallButton() {
    if (isStandalone() || document.getElementById('pwa-install-banner') || sessionStorage.getItem('ig_pwa_dismissed') === '1') return;

    var hasAppBottomNav = !!document.querySelector('.app-bottom-nav');
    var bottomPx = hasAppBottomNav ? '78px' : '20px';

    var container = document.createElement('div');
    container.id = 'pwa-install-banner';
    container.style.cssText = 'position:fixed;bottom:' + bottomPx + ';right:16px;z-index:45;background:#0b1f3a;color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 8px 24px rgba(11,31,58,0.25);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.15);animation:fadeIn 0.3s ease;max-width:calc(100vw - 32px);';

    container.innerHTML = 
      '<div style="display:flex;flex-direction:column;">' +
      '<strong style="font-size:0.86rem;">Install Interagood App</strong>' +
      '<span style="font-size:0.72rem;color:#a0aec0;">Faster access to your dashboard</span>' +
      '</div>' +
      '<button id="pwa-install-btn" style="background:#f58220;color:#fff;border:0;padding:8px 12px;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;min-height:36px;">Install</button>' +
      '<button id="pwa-dismiss-btn" style="background:transparent;border:0;color:#a0aec0;font-size:1.15rem;cursor:pointer;padding:0 6px;min-width:32px;min-height:32px;" aria-label="Dismiss">&times;</button>';

    document.body.appendChild(container);

    document.getElementById('pwa-dismiss-btn').addEventListener('click', function () {
      try { sessionStorage.setItem('ig_pwa_dismissed', '1'); } catch (e) {}
      container.remove();
    });

    document.getElementById('pwa-install-btn').addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice.outcome === 'accepted') {
            container.remove();
          }
          deferredPrompt = null;
        });
      } else if (isIOS()) {
        showIOSGuide();
      }
    });
  }

  function showIOSGuide() {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = 
      '<div style="background:#fff;max-width:340px;width:100%;border-radius:16px;padding:22px;color:#0b1f3a;box-shadow:0 12px 36px rgba(0,0,0,0.3);">' +
      '<h3 style="margin:0 0 10px;font-size:1.15rem;">Install on iPhone / iPad</h3>' +
      '<p style="font-size:0.88rem;color:#4a5568;line-height:1.5;">1. Tap the <strong>Share</strong> icon in Safari toolbar.<br>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>' +
      '<button id="close-ios-guide" style="width:100%;margin-top:16px;background:#0b1f3a;color:#fff;border:0;padding:10px;border-radius:8px;font-weight:700;cursor:pointer;">Close</button>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('close-ios-guide').addEventListener('click', function () {
      modal.remove();
    });
  }

  // 4. PayU Checkout Engine (supports temporary payuTestMode while designing UI; real PayU SHA-512 form POST intact)
  window.InteragoodPayU = {
    initiatePayment: function (options) {
      options = options || {};
      var site = window.SITE || {};
      var apiBase = site.apiBase || '';
      var session = null;
      try { session = JSON.parse(sessionStorage.getItem('ig_session') || 'null'); } catch (e) { session = null; }
      var token = options.accessToken || (session && session.accessToken) || '';
      var purpose = options.purpose || (token ? 'subscription' : 'order');

      function fail(msg) {
        if (typeof options.onFailure === 'function') {
          options.onFailure({ status: 'failed', message: msg });
        }
      }

      if (site.payuTestMode) {
        if (purpose === 'subscription') {
          if (!token || !apiBase) {
            fail('Session missing. Please log in again.');
            return;
          }
          fetch(apiBase + '/payments/payu/sandbox-activate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({ test_mode: true })
          })
            .then(function (r) {
              return r.json().catch(function () { return {}; }).then(function (d) {
                if (!r.ok || !d.success) {
                  throw new Error(d.message || 'Test activation failed.');
                }
                return d;
              });
            })
            .then(function (d) {
              try {
                if (session) {
                  session.payment_status = 'paid';
                  session.payment_active = true;
                  session.is_online = true;
                  session.next_due_at = d.next_due_at || session.next_due_at || null;
                  if (session.profile) {
                    session.profile.payment_status = 'paid';
                    session.profile.payment_active = true;
                    session.profile.is_online = true;
                    session.profile.next_due_at = d.next_due_at || session.profile.next_due_at || null;
                  }
                  sessionStorage.setItem('ig_session', JSON.stringify(session));
                }
              } catch (e) {}
              if (typeof options.onSuccess === 'function') {
                options.onSuccess({ status: 'success', testMode: true, data: d });
              } else {
                window.location.href = 'dashboard.html';
              }
            })
            .catch(function (err) {
              fail((err && err.message) || 'Could not activate test account.');
            });
          return;
        }

        // Order / sample checkout in temporary test mode
        if (typeof options.onSuccess === 'function') {
          options.onSuccess({ status: 'success', testMode: true, txnid: 'test_' + Date.now() });
        }
        return;
      }

      if (purpose !== 'subscription' || !token) {
        fail('Online checkout requires an active account session. Please proceed with your request or contact support.');
        return;
      }
      if (!apiBase) {
        fail('Payment service URL is missing. Please reload the page.');
        return;
      }

      // Persist short-lived session backup for PayU redirect return across mobile/PWA webviews
      if (session && session.uuid && session.accessToken) {
        try {
          localStorage.setItem('ig_pay_resume', JSON.stringify({
            session: session,
            expiresAt: Date.now() + 20 * 60 * 1000
          }));
        } catch (e) {}
      }

      fetch(apiBase + '/payments/payu/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ returnOrigin: window.location.origin })
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok || !d.order || !d.order.action || !d.order.fields) {
              throw new Error(d.message || 'Could not start PayU payment.');
            }
            return d.order;
          });
        })
        .then(function (order) {
          var form = document.createElement('form');
          form.method = order.method || 'POST';
          form.action = order.action;
          form.style.display = 'none';
          Object.keys(order.fields).forEach(function (k) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = String(order.fields[k] == null ? '' : order.fields[k]);
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        })
        .catch(function (err) {
          try { localStorage.removeItem('ig_pay_resume'); } catch (e) {}
          fail((err && err.message) || 'Could not connect to PayU payment gateway.');
        });
    }
  };

  // 5. Site-wide Maintenance Banner
  function renderMaintenanceBanner() {
    var m = window.SITE && window.SITE.maintenance;
    if (!m || !m.enabled || document.getElementById('ig-maintenance-banner') || !document.body) return;

    var bar = document.createElement('div');
    bar.id = 'ig-maintenance-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Website maintenance notice');
    bar.style.cssText = 'position:relative;z-index:85;background:linear-gradient(90deg,#78350f 0%,#b45309 50%,#92400e 100%);color:#fffbeb;border-bottom:2px solid #f59e0b;padding:10px 14px;font-family:inherit;box-shadow:0 2px 10px rgba(120,53,15,0.22);';

    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px;text-align:center;line-height:1.4;';

    var badge = document.createElement('span');
    badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#78350f;font-size:0.74rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;padding:3px 10px;border-radius:6px;white-space:nowrap;';
    badge.textContent = m.badge || 'Under Maintenance';

    var msg = document.createElement('span');
    msg.style.cssText = 'font-size:0.86rem;font-weight:600;color:#fffbeb;';
    msg.textContent = m.message || 'Website is currently under maintenance. We will be back at full capacity shortly.';

    inner.appendChild(badge);
    inner.appendChild(msg);
    bar.appendChild(inner);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // Check initial install button & maintenance banner after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderMaintenanceBanner();
      renderInstallButton();
    });
  } else {
    renderMaintenanceBanner();
    renderInstallButton();
  }
})();
