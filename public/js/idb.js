/* idb.js — minimal promise-wrapped IndexedDB for the IMES demo.
   DB: imes-cache (v1). Stores:
     - analyses  (keyPath 'key')  : cached dossiers  { key, account, recordedSteps, dossier, webResults, ref, ts }
     - profiles  (keyPath 'key')  : learned profiles { key, profile, ts }
   Everything is guarded so a failure (private mode, quota, unsupported)
   silently degrades to "no cache" — callers fall back to the live pipeline.
   Exposes window.IMESIDB = { get, put, getAll, del }. */
(function () {
  var DB = 'imes-cache', VER = 3;
  var _open = null;

  function open() {
    if (_open) return _open;
    _open = new Promise(function (resolve, reject) {
      try {
        if (!window.indexedDB) { reject(new Error('no indexedDB')); return; }
        var rq = indexedDB.open(DB, VER);
        rq.onupgradeneeded = function () {
          var db = rq.result;
          if (!db.objectStoreNames.contains('analyses')) db.createObjectStore('analyses', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'key' });
          // v2 — document agents
          if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('document_qa')) db.createObjectStore('document_qa', { keyPath: 'key' });
          // v3 — company disambiguation (user-confirmed entity → canonical record)
          if (!db.objectStoreNames.contains('company_resolved')) db.createObjectStore('company_resolved', { keyPath: 'key' });
        };
        rq.onsuccess = function () { resolve(rq.result); };
        rq.onerror = function () { reject(rq.error); };
      } catch (e) { reject(e); }
    });
    return _open;
  }

  function store(name, mode) {
    return open().then(function (db) {
      return db.transaction(name, mode).objectStore(name);
    });
  }

  function reqp(r) {
    return new Promise(function (res, rej) {
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }

  window.IMESIDB = {
    get: function (name, key) {
      return store(name, 'readonly').then(function (os) { return reqp(os.get(key)); }).catch(function () { return null; });
    },
    put: function (name, val) {
      return store(name, 'readwrite').then(function (os) { return reqp(os.put(val)); }).catch(function () { return null; });
    },
    getAll: function (name) {
      return store(name, 'readonly').then(function (os) { return reqp(os.getAll()); }).catch(function () { return []; });
    },
    del: function (name, key) {
      return store(name, 'readwrite').then(function (os) { return reqp(os.delete(key)); }).catch(function () { return null; });
    }
  };
})();
