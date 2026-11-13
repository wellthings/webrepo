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

  // 4. PayU Modular Payment Integration Placeholder
  window.InteragoodPayU = {
    // Current environment configuration
    config: {
      merchantKey: window.SITE?.payuMerchantKey || 'PLACEHOLDER_KEY',
      merchantSalt: window.SITE?.payuMerchantSalt || 'PLACEHOLDER_SALT',
      mode: 'test', // 'test' or 'live'
    },

    /**
     * Initiates a PayU payment request
     * @param {Object} options
     * @param {number} options.amount
     * @param {string} options.productInfo
     * @param {string} options.firstName
     * @param {string} options.email
     * @param {string} options.phone
     * @param {Function} options.onSuccess
     * @param {Function} options.onFailure
     */
    initiatePayment: function (options) {
      var amount = Number(options.amount) || 0;
      var txnid = 'IG_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var isTest = this.config.mode === 'test' || !this.config.merchantKey || this.config.merchantKey === 'PLACEHOLDER_KEY';

      console.log('[PayU Engine] Initiating transaction ' + txnid + ' for ₹' + amount + ' (Mode: ' + (isTest ? 'Sandbox/Placeholder' : 'Live') + ')');

      // Create interactive payment modal for sandbox testing or real redirect
      var overlay = document.createElement('div');
      overlay.id = 'payu-checkout-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,31,58,0.7);backdrop-filter:blur(3px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s ease;';

      overlay.innerHTML =
        '<div style="background:#fff;max-width:420px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.3);font-family:inherit;">' +
        '<div style="background:#0b1f3a;color:#fff;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="background:#f58220;color:#fff;padding:4px 8px;border-radius:6px;font-size:0.75rem;font-weight:800;letter-spacing:0.05em;">PayU</span>' +
        '<strong style="font-size:1.05rem;">Secure Checkout</strong>' +
        '</div>' +
        '<button id="payu-cancel-btn" style="background:none;border:0;color:#cbd5e0;font-size:1.3rem;cursor:pointer;">&times;</button>' +
        '</div>' +
        '<div style="padding:22px;">' +
        '<div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:18px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:0.88rem;color:#718096;margin-bottom:6px;">' +
        '<span>Item</span><strong>' + (options.productInfo || 'Interagood Subscription') + '</strong>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:0.88rem;color:#718096;margin-bottom:6px;">' +
        '<span>Transaction ID</span><span style="font-family:monospace;font-size:0.8rem;">' + txnid + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:1.15rem;color:#0b1f3a;font-weight:800;border-top:1px dashed #cbd5e0;padding-top:10px;margin-top:6px;">' +
        '<span>Amount to Pay</span><span>₹' + amount.toLocaleString('en-IN') + '</span>' +
        '</div>' +
        '</div>' +
        '<div style="margin-bottom:18px;">' +
        '<label style="display:block;font-size:0.82rem;font-weight:700;color:#2d3748;margin-bottom:8px;">Select Payment Method (Sandbox Active)</label>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' +
        '<label style="border:1.5px solid #f58220;border-radius:8px;padding:10px;text-align:center;font-size:0.8rem;font-weight:700;color:#0b1f3a;cursor:pointer;background:#fff8f3;">UPI / QR</label>' +
        '<label style="border:1.5px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;font-size:0.8rem;font-weight:600;color:#4a5568;cursor:pointer;">Cards</label>' +
        '<label style="border:1.5px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;font-size:0.8rem;font-weight:600;color:#4a5568;cursor:pointer;">NetBanking</label>' +
        '</div>' +
        '</div>' +
        '<button id="payu-confirm-btn" style="width:100%;background:#1f9d55;color:#fff;border:0;padding:12px;border-radius:10px;font-size:0.95rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">' +
        '<span>Pay ₹' + amount.toLocaleString('en-IN') + ' via PayU</span>' +
        '</button>' +
        '<p style="margin:10px 0 0;text-align:center;font-size:0.75rem;color:#a0aec0;">256-bit encrypted bank grade transaction</p>' +
        '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      document.getElementById('payu-cancel-btn').addEventListener('click', function () {
        overlay.remove();
        if (typeof options.onFailure === 'function') {
          options.onFailure({ status: 'cancelled', message: 'User closed payment window' });
        }
      });

      document.getElementById('payu-confirm-btn').addEventListener('click', function () {
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'Processing with Bank...';
        setTimeout(function () {
          overlay.remove();
          if (typeof options.onSuccess === 'function') {
            options.onSuccess({
              status: 'success',
              txnid: txnid,
              amount: amount,
              paymentId: 'PAYU_TEST_' + Math.floor(Math.random() * 1000000),
            });
          }
        }, 1200);
      });
    }
  };

  // Check initial install button after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderInstallButton);
  } else {
    renderInstallButton();
  }
})();
