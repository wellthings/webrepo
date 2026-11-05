(function () {
  // Shared location helper: remembers the visitor's location in localStorage ("ig_loc") and tells the page about it.
  var LOC_KEY = 'ig_loc';
  function saved() { try { return JSON.parse(localStorage.getItem(LOC_KEY)); } catch (e) { return null; } }
  function box() { return document.getElementById('location-input'); }
  function set(l) {
    localStorage.setItem(LOC_KEY, JSON.stringify(l));
    if (box()) box().value = l.address || '';
    document.dispatchEvent(new CustomEvent('ig:location', { detail: l }));
  }
  function shortAddress(d) {
    var a = (d && d.address) || {};
    var parts = [a.road, a.neighbourhood || a.suburb, a.city_district, a.city || a.town || a.village || a.county, a.state, a.postcode];
    var seen = {};
    parts = parts.filter(function (p) { if (!p || seen[p]) return false; seen[p] = 1; return true; });
    return parts.length ? parts.join(', ') : (d && d.display_name) || '';
  }
  function request() {
    if (!navigator.geolocation) { if (box()) box().placeholder = 'Type your address'; return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lng = pos.coords.longitude;
      fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=' + lat + '&lon=' + lng)
        .then(function (r) { return r.json(); })
        .then(function (d) { set({ lat: lat, lng: lng, address: shortAddress(d) || lat.toFixed(4) + ', ' + lng.toFixed(4) }); })
        .catch(function () { set({ lat: lat, lng: lng, address: lat.toFixed(4) + ', ' + lng.toFixed(4) }); });
    }, function () { if (box()) box().placeholder = 'Location blocked. Type your address'; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }
  function geocode(text) {
    text = (text || '').trim();
    if (text.length < 3) return;
    fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=' + encodeURIComponent(text))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (!list.length) { if (box()) box().placeholder = 'Address not found. Try area and city'; return; }
        set({ lat: parseFloat(list[0].lat), lng: parseFloat(list[0].lon), address: text });
      }).catch(function () {});
  }
  document.addEventListener('ig:location-request', request);
  window.IGGeo = { saved: saved, request: request, geocode: geocode };
})();
