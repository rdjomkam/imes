/* idb-profiles.js — mirror every activated company profile into IndexedDB.
   The learn bundle activates a profile via POST /api/profile; we wrap fetch
   so each successful activation is also stored in the `profiles` store,
   building a local library of learned companies. Guarded; depends on idb.js. */
(function () {
  var _f = window.fetch;
  window.fetch = function (url, opts) {
    var p = _f.apply(window, arguments);
    try {
      if (typeof url === 'string' && url.indexOf('/api/profile') !== -1 && opts && opts.method === 'POST') {
        var body = JSON.parse(opts.body || '{}');
        if (body && (body.shortName || body.name) && window.IMESIDB) {
          p.then(function (res) {
            if (res && res.ok) {
              var key = String(body.shortName || body.name).trim().toLowerCase();
              window.IMESIDB.put('profiles', { key: key, profile: body, ts: Date.now() });
            }
          }).catch(function () {});
        }
      }
    } catch (e) {}
    return p;
  };
})();
