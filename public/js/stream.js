(function () {
  var _f = window.fetch;
  var __recordedSteps = [];
  var __ref = '';

  // Active reference profile shortName — part of the analysis cache key, so a
  // re-learned reference company never serves another company's cached analyses.
  try {
    _f.call(window, '/api/profile').then(function (r) { return r.json(); })
      .then(function (p) { if (p && (p.shortName || p.name)) __ref = (p.shortName || p.name); })
      .catch(function () {});
  } catch (e) {}

  function _norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function _analysisKey(company, role) { return _norm(__ref) + '::' + _norm(company) + '::' + _norm(role); }
  function _idb() { return window.IMESIDB || null; }

  // "Rejouer" on the dossier stashes the account here and navigates to the intake;
  // we auto-fill the form and submit so the analysis re-runs (cache → instant replay).
  (function autoReplay() {
    var raw;
    try { raw = sessionStorage.getItem('imes_replay'); } catch (e) { return; }
    if (!raw) return;
    try { sessionStorage.removeItem('imes_replay'); } catch (e) {}
    var acct; try { acct = JSON.parse(raw); } catch (e) { return; }
    if (!acct || !acct.company) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var acc = document.querySelector('#acc'), fon = document.querySelector('#fon');
      if (acc && fon) {
        clearInterval(iv);
        var setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setVal.call(acc, acct.company || ''); acc.dispatchEvent(new Event('input', { bubbles: true }));
        setVal.call(fon, acct.role || ''); fon.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(function () {
          var bs = document.querySelectorAll('button'), btn = null;
          for (var i = 0; i < bs.length; i++) { if (/lancer|analyser|l['’]agent/i.test(bs[i].textContent)) { btn = bs[i]; break; } }
          if (!btn && bs.length) btn = bs[bs.length - 1];
          if (btn) btn.click();
        }, 200);
      } else if (tries > 50) { clearInterval(iv); }
    }, 100);
  })();

  // ========== Map live pipeline result → new dossier schema ==========
  function firstSentence(s) {
    if (!s) return '';
    var m = String(s).match(/^[\s\S]*?[.!?](\s|$)/);
    return (m ? m[0] : String(s)).trim();
  }

  function mapDossier(e) {
    var d = (e && e.dossier) || {};
    var acc = (e && e.account) || {};
    var web = (e && e.webResults) || [];
    var vpoints = Array.isArray(d.valeur_points) ? d.valeur_points : null;
    if (!vpoints && d.valeur) {
      vpoints = String(d.valeur).split(/(?<=[.!?])\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    return {
      account: { company: acc.company || d.company || '', role: acc.role || d.role || '' },
      mode: 'live',
      score: (d.score != null ? d.score : 0),
      potentiel_ca: d.potentiel_ca || 'Non estimable',
      resume: d.resume || firstSentence(d.profil) || '',
      profil: d.profil || '',
      signaux: Array.isArray(d.signaux) ? d.signaux : [],
      priorites: Array.isArray(d.priorites) ? d.priorites : [],
      concurrents: Array.isArray(d.concurrents) ? d.concurrents : [],
      angle: d.angle || '',
      valeur: d.valeur || '',
      valeur_points: vpoints && vpoints.length ? vpoints : [],
      email: {
        from: (d.email && d.email.from) || '',
        subject: (d.email && d.email.subject) || '',
        body: (d.email && d.email.body) || ''
      },
      objections: Array.isArray(d.objections) ? d.objections : [],
      timeline: Array.isArray(d.timeline) ? d.timeline : [],
      sources: (Array.isArray(web) ? web : []).map(function (r) {
        return { title: r.title || r.url || '', url: r.url || '', snippet: r.content || r.snippet || '' };
      }),
      next: d.next || ''
    };
  }

  // ========== Redirect to the new dossier page after the native animation ==========
  var __redirected = false;
  function redirectWithCover() {
    if (__redirected) return; __redirected = true;
    var cover = document.createElement('div');
    cover.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:#0C1E3C;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:system-ui,-apple-system,sans-serif;color:#fff;';
    cover.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px">' +
        '<span style="width:20px;height:20px;border:2.5px solid;border-color:#7fe3a8 rgba(127,227,168,0.25) rgba(127,227,168,0.25);border-radius:50%;animation:imes-spin .8s linear infinite"></span>' +
        '<span style="font-size:15px;font-weight:600">Ouverture du dossier…</span>' +
      '</div>';
    var st = document.createElement('style');
    st.textContent = '@keyframes imes-spin{to{transform:rotate(360deg)}}';
    (document.head || document.documentElement).appendChild(st);
    document.body.appendChild(cover);
    setTimeout(function () { window.location.href = '/results.html'; }, 450);
  }

  // Watch the bundle's OWN running view ("Pipeline de l'agent"): once its native
  // stepper+journal animation finishes and it leaves the running view, redirect
  // to the redesigned dossier. (No popup, no DOM-stepper hacking — the bundle
  // animates itself exactly as designed.)
  var __watching = false;
  function armDossierWatch() {
    if (__watching) return; __watching = true;
    var seenRunning = false;
    var iv = setInterval(function () {
      var running = false;
      var hs = document.querySelectorAll('h2');
      for (var i = 0; i < hs.length; i++) {
        if (hs[i].textContent.indexOf('Pipeline de l') !== -1) { running = true; break; }
      }
      if (running) seenRunning = true;
      else if (seenRunning) { clearInterval(iv); redirectWithCover(); }
    }, 150);
    setTimeout(function () { clearInterval(iv); }, 300000);
  }

  // Persist the analysis (IndexedDB), stash the mapped dossier for results.html,
  // and arm the redirect that fires after the bundle's native animation.
  function onFinal(data, key, idb) {
    try {
      if (idb && key && data.dossier && !data.dossier.error) {
        idb.put('analyses', {
          key: key, account: data.account || {}, recordedSteps: __recordedSteps.slice(),
          dossier: data.dossier, webResults: data.webResults || [], ref: __ref, ts: Date.now()
        });
      }
    } catch (e) {}
    try { sessionStorage.setItem('imes_dossier', JSON.stringify(mapDossier(data))); } catch (e) {}
    armDossierWatch();
  }

  function fakeResponse(payload) {
    return {
      ok: true, status: 200,
      headers: { get: function () { return 'application/json'; } },
      json: function () { return Promise.resolve(payload); },
      clone: function () { return this; }
    };
  }

  // ========== fetch override ==========
  // Cache-first. On a hit, hand the bundle the cached data immediately so ITS
  // native running view animates (and replay is instant). On a miss, read the
  // SSE, hand the bundle the final data so it animates, and cache the result.
  window.fetch = function (url, opts) {
    if (typeof url !== 'string' || url.indexOf('/api/agent') === -1 || !opts || opts.method !== 'POST')
      return _f.call(window, url, opts);

    var company = '', role = '';
    try { var b = JSON.parse(opts.body || '{}'); company = b.company || ''; role = b.role || ''; } catch (e) {}
    var key = _analysisKey(company, role);
    var idb = _idb();
    var lookup = (idb && key) ? idb.get('analyses', key) : Promise.resolve(null);

    return lookup.then(function (cached) {
      if (cached && cached.dossier && cached.recordedSteps && cached.recordedSteps.length) {
        try { sessionStorage.setItem('imes_from_cache', '1'); } catch (e) {}
        __recordedSteps = cached.recordedSteps.slice();
        var steps = [];
        cached.recordedSteps.forEach(function (rs) { if (rs && typeof rs.index === 'number') steps[rs.index] = rs.step; });
        var payload = {
          account: cached.account || { company: company, role: role },
          steps: steps.filter(Boolean), dossier: cached.dossier, webResults: cached.webResults || []
        };
        onFinal(cached, key, null); // stash + arm watch; don't re-cache
        return fakeResponse(payload);
      }
      return liveAgentFetch(url, opts, key);
    }).catch(function () { return liveAgentFetch(url, opts, key); });
  };

  function liveAgentFetch(url, opts, key) {
    var idb = _idb();
    var ctrl = new AbortController();
    setTimeout(function () { ctrl.abort(); }, 300000);
    // Attach the resolved company (chosen via the disambiguation modal) so the
    // backend anchors the pipeline on the canonical entity rather than free text.
    var body = opts.body;
    try {
      var raw = sessionStorage.getItem('imes_resolved_company');
      if (raw) {
        sessionStorage.removeItem('imes_resolved_company');
        var resolved = JSON.parse(raw);
        var parsed = JSON.parse(body || '{}');
        parsed.companyResolved = resolved;
        body = JSON.stringify(parsed);
      }
    } catch (e) { /* keep original body on any error */ }
    var newOpts = Object.assign({}, opts, { signal: ctrl.signal, body: body });

    return _f.call(window, url, newOpts).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('event-stream') === -1 || !res.body) return res;

      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      var finalData = null;
      __recordedSteps = [];

      function processEvent(raw) {
        try {
          var e = JSON.parse(raw);
          if (e.type === 'step') {
            __recordedSteps.push({ index: e.index, node: e.node, step: e.step });
          } else if (e.type === 'complete') {
            delete e.type;
            finalData = e;
            onFinal(e, key, idb);
          }
        } catch (x) {}
      }

      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            if (buf.trim()) buf.split('\n').forEach(function (l) { l = l.trim(); if (l.indexOf('data: ') === 0) processEvent(l.slice(6)); });
            if (!finalData) finalData = { error: 'stream ended' };
            return fakeResponse(finalData);
          }
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split('\n\n'); buf = parts.pop();
          parts.forEach(function (p) { p.split('\n').forEach(function (l) { l = l.trim(); if (l.indexOf('data: ') === 0) processEvent(l.slice(6)); }); });
          return pump();
        });
      }
      return pump();
    });
  }
})();
