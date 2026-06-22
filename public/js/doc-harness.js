/* doc-harness.js — feeds the Claude-designed document bundles real data.
   The bundle calls window.IMES_DOC_LOAD() on "Charger" and awaits
   window.IMES_DOC_RUN() on "Lancer", which: loads the prepared specimen →
   checks IndexedDB cache → else POST /api/document (Claude vision → DeepSeek) →
   caches → returns { type, mode:'live'|'cache'|'repli', steps[], result{} }.
   On any failure → the bundle's embedded repli (window.IMES_DOC_DATA). */
(function () {
  var CFG = window.IMES_DOC_CFG || { type: 'credit', specimen: '/specimens/credit.pdf' };
  var _file = null;
  var _lastExtracted = '', _lastHash = ''; // for follow-up Q&A (rapport)
  function idb() { return window.IMESIDB || null; }

  function loadSpecimen() {
    if (_file) return Promise.resolve(_file);
    return fetch(CFG.specimen).then(function (r) { if (!r.ok) throw new Error('no specimen'); return r.blob(); })
      .then(function (b) {
        return new Promise(function (res) {
          var fr = new FileReader();
          fr.onload = function () {
            var du = fr.result;
            _file = { base64: String(du).split(',')[1] || '', mime: b.type || 'application/pdf', filename: CFG.specimen.split('/').pop() };
            res(_file);
          };
          fr.readAsDataURL(b);
        });
      });
  }
  window.IMES_DOC_LOAD = function () { loadSpecimen().catch(function () {}); };

  // ---- "Téléverser mon document" : optional real upload, in addition to the
  // staged specimen. Injected as a small secondary action next to the bundle's
  // "Charger le document" button (no re-bundle). On pick → read base64, replace
  // the in-memory _file, then click the Charger button so React sets loaded=true.
  function readPicked(blob, name) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () {
        var du = fr.result;
        _file = { base64: String(du).split(',')[1] || '', mime: blob.type || 'application/pdf', filename: name || 'document', dataUrl: du };
        res(_file);
      };
      fr.readAsDataURL(blob);
    });
  }

  var _uploadInput = null, _uploadStatus = null, _injectedFor = null;
  function ensureUploadUI() {
    var btns = Array.from(document.querySelectorAll('button'));
    var charger = btns.find(function (b) { return /Charger le document/i.test(b.textContent || ''); });
    if (!charger || _injectedFor === charger) return;
    _injectedFor = charger;

    // hidden <input type=file>
    if (!_uploadInput) {
      _uploadInput = document.createElement('input');
      _uploadInput.type = 'file';
      _uploadInput.accept = 'application/pdf,image/*';
      _uploadInput.style.display = 'none';
      document.body.appendChild(_uploadInput);
      _uploadInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        readPicked(f, f.name).then(function () {
          if (_uploadStatus) _uploadStatus.textContent = '✓ ' + f.name;
          // Trigger the bundle's loaded state by simulating a click on Charger.
          charger.click();
        });
      });
    }

    // secondary action (link-styled, discreet)
    var link = document.createElement('button');
    link.type = 'button';
    link.textContent = '↑ Téléverser mon document';
    link.style.cssText = 'display:inline-flex;align-items:center;margin-left:14px;padding:8px 14px;background:transparent;border:1px dashed rgba(255,255,255,0.22);border-radius:8px;color:#9fadc9;font:600 13px/1.2 Inter,system-ui,-apple-system,sans-serif;cursor:pointer;letter-spacing:.01em;vertical-align:middle;';
    link.addEventListener('mouseenter', function () { link.style.borderColor = 'rgba(255,255,255,0.45)'; link.style.color = '#fff'; });
    link.addEventListener('mouseleave', function () { link.style.borderColor = 'rgba(255,255,255,0.22)'; link.style.color = '#9fadc9'; });
    link.addEventListener('click', function () { _uploadInput.value = ''; _uploadInput.click(); });

    // tiny status text after the action (filename of the picked file)
    _uploadStatus = document.createElement('span');
    _uploadStatus.style.cssText = 'display:inline-block;margin-left:10px;font:500 12px/1.2 IBM Plex Mono,ui-monospace,monospace;color:#7fe3a8;vertical-align:middle;';

    // Insert right after the Charger button.
    var parent = charger.parentNode;
    if (parent && charger.nextSibling) { parent.insertBefore(link, charger.nextSibling); parent.insertBefore(_uploadStatus, link.nextSibling); }
    else if (parent) { parent.appendChild(link); parent.appendChild(_uploadStatus); }
  }
  setInterval(ensureUploadUI, 300);

  function hash(b64) {
    try {
      var bin = atob(b64.slice(0, 200000)); var by = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i);
      return crypto.subtle.digest('SHA-256', by).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 24);
      });
    } catch (e) { return Promise.resolve('nohash'); }
  }

  // Keep the designed per-step icons (the API steps don't carry them): merge by index from the repli.
  function mergeIcons(steps) {
    var repli = (window.IMES_DOC_DATA && window.IMES_DOC_DATA.steps) || [];
    return (steps || []).map(function (s, i) { if (s && !s.icon && repli[i] && repli[i].icon) s.icon = repli[i].icon; return s; });
  }

  window.IMES_DOC_RUN = function () {
    return loadSpecimen().then(function (f) {
      return hash(f.base64).then(function (h) {
        var key = CFG.type + '::' + h;
        var cache = idb();
        var lookup = cache ? cache.get('documents', key) : Promise.resolve(null);
        _lastHash = h;
        return lookup.then(function (hit) {
          if (hit && hit.steps && hit.result) {
            _lastExtracted = hit.extracted || '';
            return { type: CFG.type, mode: 'cache', steps: mergeIcons(hit.steps), result: hit.result, meta: hit.meta, suggestions: (window.IMES_DOC_DATA||{}).suggestions || [] };
          }
          var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 120000);
          return fetch('/api/document', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
            body: JSON.stringify({ type: CFG.type, file: f.base64, mime: f.mime, filename: f.filename })
          }).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
            .then(function (d) {
              if (!d || !Array.isArray(d.steps) || !d.result) throw new Error('bad payload');
              _lastExtracted = d.extracted || '';
              if (cache) { try { cache.put('documents', { key: key, type: CFG.type, filename: f.filename, steps: d.steps, result: d.result, meta: d.meta, extracted: d.extracted || '', ts: Date.now() }); } catch (e) {} }
              return { type: CFG.type, mode: 'live', steps: mergeIcons(d.steps), result: d.result, meta: d.meta, suggestions: (window.IMES_DOC_DATA||{}).suggestions || [] };
            });
        });
      });
    }).catch(function () {
      var R = window.IMES_DOC_DATA || { steps: [], result: {} };
      return { type: CFG.type, mode: 'repli', steps: R.steps || [], result: R.result || {}, meta: R.meta, suggestions: R.suggestions || [] };
    });
  };

  // ---- Live follow-up Q&A (rapport) : DeepSeek sur la transcription, sinon repli. ----
  function liveAsk(question) {
    var qn = (question || '').trim().toLowerCase().replace(/\s+/g, ' ');
    var cache = idb();
    var qakey = CFG.type + '::' + _lastHash + '::' + qn;
    var lookup = (cache && _lastHash) ? cache.get('document_qa', qakey) : Promise.resolve(null);
    return lookup.then(function (hit) {
      if (hit && hit.answer != null) return { answer: hit.answer, pages: hit.pages || [] };
      if (!_lastExtracted) throw new Error('no transcription'); // → repli fallback
      var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 60000);
      return fetch('/api/document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ followup: true, type: CFG.type, question: question, extracted: _lastExtracted })
      }).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (d) {
          var out = { answer: d.answer || '', pages: d.pages || [] };
          if (cache && _lastHash) { try { cache.put('document_qa', { key: qakey, type: CFG.type, question: question, answer: out.answer, pages: out.pages, ts: Date.now() }); } catch (e) {} }
          return out;
        });
    });
  }

  // ---- Side panel : open the specimen PDF at a given page (page-badge clicks). ----
  // The bundle calls window.IMES_DOC_OPEN_PAGE(N) when a "p.N" badge is clicked.
  // Most browsers honor "#page=N" on a PDF iframe → jumps to that page.
  // All styles are set INLINE because the bundle's loader strips any <style> we
  // add to the document head when it replaces the document on render.
  var _panel = null, _backdrop = null, _frame = null, _ttl = null;
  function panelWidth() { return window.innerWidth <= 760 ? '100vw' : 'min(640px,60vw)'; }
  function ensurePanel() {
    if (_panel) return;
    _backdrop = document.createElement('div');
    _backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(8,16,33,0);z-index:99998;pointer-events:none;transition:background .25s ease;';
    _backdrop.addEventListener('click', closePanel);

    _panel = document.createElement('aside');
    _panel.setAttribute('aria-hidden', 'true');
    _panel.style.cssText = 'position:fixed;top:0;right:0;height:100vh;width:' + panelWidth() + ';background:#0C1E3C;color:#fff;z-index:99999;display:flex;flex-direction:column;box-shadow:-20px 0 50px rgba(0,0,0,.45);transform:translateX(102%);transition:transform .28s cubic-bezier(.2,.7,.2,1);font-family:Inter,system-ui,-apple-system,sans-serif;';

    var hdr = document.createElement('header');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);flex:none;';
    var ttlWrap = document.createElement('div');
    ttlWrap.innerHTML = '<div style="font-weight:700;font-size:14px;letter-spacing:.01em">Source citée</div><div id="imes-pdf-meta" style="font-weight:500;font-size:11.5px;color:#9fadc9;font-family:\'IBM Plex Mono\',ui-monospace,monospace;margin-top:2px">—</div>';
    var btn = document.createElement('button');
    btn.type = 'button'; btn.setAttribute('aria-label', 'Fermer'); btn.textContent = '✕';
    btn.style.cssText = 'appearance:none;border:none;background:rgba(255,255,255,.08);color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;';
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(255,255,255,.16)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(255,255,255,.08)'; });
    btn.addEventListener('click', closePanel);
    hdr.appendChild(ttlWrap); hdr.appendChild(btn);

    _frame = document.createElement('iframe');
    _frame.title = 'Document source';
    _frame.style.cssText = 'flex:1;border:none;width:100%;background:#fff;';

    _panel.appendChild(hdr); _panel.appendChild(_frame);
    document.body.appendChild(_backdrop); document.body.appendChild(_panel);
    _ttl = _panel.querySelector('#imes-pdf-meta');

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    window.addEventListener('resize', function () { if (_panel) _panel.style.width = panelWidth(); });
  }
  function openPanel(page) {
    ensurePanel();
    // Use Mozilla PDF.js viewer (pure JS) so the PDF renders in ANY browser /
    // preview, not only those with a native PDFium plugin enabled.
    var pdf = encodeURIComponent(CFG.specimen || '');
    var src = '/pdfjs/web/viewer.html?file=' + pdf + '#page=' + page + '&zoom=page-width';
    _frame.src = src;
    _ttl.textContent = (CFG.specimen ? CFG.specimen.split('/').pop() : 'document') + ' · page ' + page;
    requestAnimationFrame(function () {
      _panel.style.transform = 'translateX(0)';
      _backdrop.style.background = 'rgba(8,16,33,.35)';
      _backdrop.style.pointerEvents = 'auto';
      _panel.setAttribute('aria-hidden', 'false');
    });
  }
  function closePanel() {
    if (!_panel) return;
    _panel.style.transform = 'translateX(102%)';
    _backdrop.style.background = 'rgba(8,16,33,0)';
    _backdrop.style.pointerEvents = 'none';
    _panel.setAttribute('aria-hidden', 'true');
    // free the iframe so a re-open with the same page still scrolls
    setTimeout(function () { if (_frame) _frame.src = 'about:blank'; }, 320);
  }
  window.IMES_DOC_OPEN_PAGE = function (page) { openPanel(page); };

  // ---- Pipeline grid fix : prevent the journal column from squeezing the stepper.
  // The bundle uses `grid-template-columns: 1.05fr 0.95fr` which is really
  // `minmax(auto, …)` — so long journal log lines (whiteSpace:nowrap) push their
  // column wide, eating the stepper's width. We override to minmax(0, …) and let
  // each log line's text actually ellipsize (need min-width:0 on flex children).
  // Persisted via setInterval because the bundle's loader can drop <head> styles.
  function ensurePipelineFix() {
    if (document.getElementById('imes-fix-pipeline')) return;
    var st = document.createElement('style');
    st.id = 'imes-fix-pipeline';
    st.textContent =
      '.imes-pipe-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,0.95fr) !important}' +
      '.imes-logline{min-width:0 !important}' +
      '.imes-logline>span:last-child{min-width:0 !important;flex:1 1 0% !important;overflow:hidden !important;text-overflow:ellipsis !important}';
    (document.head || document.documentElement).appendChild(st);
  }
  ensurePipelineFix();
  setInterval(ensurePipelineFix, 300);

  // The bundle's repli sets window.IMES_DOC_ASK during unpack; once present, wrap it so
  // live answers are tried first and the repli stays as the offline fallback.
  var _wrapped = false;
  setInterval(function () {
    if (_wrapped) return;
    if (typeof window.IMES_DOC_ASK === 'function' && !window.IMES_DOC_ASK.__imesLive) {
      var repli = window.IMES_DOC_ASK;
      var w = function (q) { return liveAsk(q).catch(function () { return repli(q); }); };
      w.__imesLive = true;
      window.IMES_DOC_ASK = w;
      _wrapped = true;
    }
  }, 150);
})();
