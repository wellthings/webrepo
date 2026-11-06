(function () {
  // Shared location helper. Saves the visitor's location in localStorage ("ig_loc") and announces it with the
  // "ig:location" event. Accuracy rules: GPS only (high accuracy, no cached fix), several readings are
  // compared and the most accurate one wins, and the address detail is limited to what that accuracy can justify.
  var LOC_KEY = 'ig_loc';
  var GOOD_M = 40;          // stop early once a reading is this accurate (metres)
  var SETTLE_MS = 15000;    // otherwise keep the best reading after this long
  var HARD_MS = 25000;      // give up waiting for any reading
  var STALE_MS = 15 * 60 * 1000;
  var watchId = null, busy = false;

  function saved() { try { return JSON.parse(localStorage.getItem(LOC_KEY)); } catch (e) { return null; } }
  function box() { return document.getElementById('location-input'); }
  function hint(text) { var b = box(); if (b) { b.placeholder = text; } }

  function set(l) {
    localStorage.setItem(LOC_KEY, JSON.stringify(l));
    var b = box();
    if (b) {
      b.value = l.address || '';
      b.title = l.source === 'gps' && l.accuracy ? 'Detected location (accurate to about ' + Math.round(l.accuracy) + ' m)' : '';
    }
    document.dispatchEvent(new CustomEvent('ig:location', { detail: l }));
  }

  // zoom level for the address lookup: never name a street/building when the reading is too loose for that
  function zoomFor(acc) { return acc <= 100 ? 18 : acc <= 500 ? 16 : acc <= 3000 ? 14 : 12; }

  function shortAddress(d) {
    var a = (d && d.address) || {};
    var line = [a.house_number, a.road].filter(Boolean).join(' ');
    var parts = [
      line || a.pedestrian || a.amenity,
      a.neighbourhood || a.suburb || a.quarter || a.hamlet,
      a.city_district,
      a.city || a.town || a.village || a.county,
      a.state,
      a.postcode
    ];
    var seen = {};
    parts = parts.filter(function (p) { if (!p || seen[p]) return false; seen[p] = 1; return true; });
    return parts.length ? parts.join(', ') : (d && d.display_name) || '';
  }

  function finish(pos, silent) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude, acc = pos.coords.accuracy || 0;
    var done = function (address) {
      busy = false;
      set({ lat: lat, lng: lng, address: address, accuracy: Math.round(acc), source: 'gps', ts: Date.now() });
    };
    fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&zoom=' + zoomFor(acc) + '&lat=' + lat + '&lon=' + lng)
      .then(function (r) { return r.json(); })
      .then(function (d) { done(shortAddress(d) || lat.toFixed(5) + ', ' + lng.toFixed(5)); })
      .catch(function () { done(lat.toFixed(5) + ', ' + lng.toFixed(5)); });
  }

  function stop() { if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; } }

  function fail(err, silent) {
    busy = false; stop();
    document.dispatchEvent(new CustomEvent('ig:location-error', { detail: { code: err && err.code } }));
    if (silent) return;
    hint(err && err.code === 1
      ? 'Location is blocked. Allow it in browser settings, or type your address'
      : 'Could not get your exact location. Turn on GPS/location or type your address');
  }

  // opts.silent: refresh in the background without changing the box text or showing errors
  function request(opts) {
    var silent = !!(opts && opts.silent === true);
    if (!navigator.geolocation) { if (!silent) hint('Type your address'); return; }
    if (busy) return;
    busy = true;
    if (!silent) { hint('Detecting your exact location...'); }
    var best = null, settled = false;
    function settle() {
      if (settled) return;
      settled = true; clearTimeout(t1); clearTimeout(t2); stop();
      if (best) finish(best, silent); else fail({ code: 2 }, silent);
    }
    var t1 = setTimeout(function () { if (best) settle(); }, SETTLE_MS);
    var t2 = setTimeout(settle, HARD_MS);
    watchId = navigator.geolocation.watchPosition(function (pos) {
      if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
      if (pos.coords.accuracy <= GOOD_M) settle();
    }, function (err) {
      if (settled) return;
      if (best) return settle();
      settled = true; clearTimeout(t1); clearTimeout(t2);
      fail(err, silent);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: HARD_MS });
  }

  // typed address: look it up and remember it as a manual choice (never overwritten by GPS refreshes)
  function geocode(text) {
    text = (text || '').trim();
    if (text.length < 3) return;
    fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&accept-language=en&q=' + encodeURIComponent(text))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (!list.length) { hint('Address not found. Try area and city'); return; }
        set({ lat: parseFloat(list[0].lat), lng: parseFloat(list[0].lon), address: text, accuracy: 0, source: 'manual', ts: Date.now() });
      }).catch(function () {});
  }

  // on page load: reuse a fresh saved location, refresh a stale GPS one quietly (only if already allowed), else ask
  function init() {
    var s = saved();
    if (!s || !s.address) { request(); return; }
    var b = box(); if (b) b.value = s.address;
    var stale = s.source !== 'manual' && (!s.ts || Date.now() - s.ts > STALE_MS);
    if (!stale) return;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (p) {
        if (p.state === 'granted') request({ silent: true });
      }).catch(function () {});
    }
  }

  document.addEventListener('ig:location-request', function () { request(); });
  window.IGGeo = { saved: saved, request: request, geocode: geocode, init: init };
})();
