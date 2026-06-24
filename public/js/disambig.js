/* disambig.js — Company disambiguation BEFORE the analysis pipeline.
   On "Lancer l'agent" click (intake page):
     1. Read the company input.
     2. Lookup IDB company_resolved cache. HIT → use canonical name directly.
     3. MISS → POST /api/company-search → if a strong autoSelect, use it.
     4. Otherwise → show a blocking modal with the LinkedIn candidates.
     5. Cache the choice in IDB, patch the input to the canonical name, then
        re-click Lancer so the bundle's normal flow runs with the locked name.
   The resolved metadata is also stashed in sessionStorage so stream.js attaches
   it to the /api/agent POST body (the LangGraph state will lock onto it). */
(function () {
  if (!/\/agent\.html(\?|$|#)/.test(location.pathname + location.search)) return;

  function $(s, root) { return (root || document).querySelector(s); }
  function idb() { return window.IMESIDB; }
  function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  // ---- modal (built once, inline styles so the bundler's loader can't drop them) ----
  var _modal = null, _bodyEl = null;
  function buildModal() {
    if (_modal) return _modal;
    var bg = document.createElement('div');
    bg.id = 'imes-disambig';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(8,16,33,0.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99998;display:none;align-items:flex-start;justify-content:center;padding:48px 16px;overflow-y:auto;font-family:Inter,system-ui,-apple-system,sans-serif;';

    var box = document.createElement('div');
    box.style.cssText = 'max-width:640px;width:100%;background:#0C1E3C;color:#fff;border:1px solid rgba(255,255,255,0.08);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,0.55);overflow:hidden;';
    box.innerHTML =
      '<div style="padding:22px 24px 18px;border-bottom:1px solid rgba(255,255,255,0.08)">' +
        '<div id="dd-eyebrow" style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#EB222A;margin-bottom:10px">Confirmation</div>' +
        '<h2 id="dd-title" style="font-family:Plus Jakarta Sans,Inter,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.01em;margin:0">Quelle est cette entreprise ?</h2>' +
        '<p id="dd-sub" style="font-size:13.5px;color:#9fadc9;margin:8px 0 0;line-height:1.5">Pour éviter d\'analyser une mauvaise société, sélectionne la correspondance exacte.</p>' +
      '</div>' +
      '<div id="dd-body" style="padding:8px 16px 16px;max-height:60vh;overflow-y:auto"></div>' +
      '<div style="padding:14px 22px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<button id="dd-degraded" type="button" style="background:transparent;border:none;color:#9fadc9;font-family:Inter;font-size:13px;font-weight:600;cursor:pointer;padding:6px 0">↺ Continuer sans correspondance LinkedIn</button>' +
        '<button id="dd-cancel" type="button" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);color:#fff;border-radius:8px;padding:9px 16px;font-family:Inter;font-size:13.5px;font-weight:600;cursor:pointer">Annuler</button>' +
      '</div>';
    bg.appendChild(box);
    document.body.appendChild(bg);
    _bodyEl = $('#dd-body', bg);
    _modal = bg;
    return bg;
  }

  function renderCandidates(candidates, onPick) {
    _bodyEl.innerHTML = '';
    if (!candidates.length) {
      _bodyEl.innerHTML = '<div style="padding:24px 8px;text-align:center;color:#9fadc9;font-size:14px;line-height:1.55">Aucune entreprise LinkedIn ne correspond à ce nom.<br>Tu peux <strong style="color:#fff">continuer en mode dégradé</strong> (analyse web générale) ou affiner le nom et réessayer.</div>';
      return;
    }
    candidates.forEach(function (c) {
      var card = document.createElement('button');
      card.type = 'button';
      card.style.cssText = 'display:block;width:100%;text-align:left;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:14px 16px;margin:8px 0;color:#fff;cursor:pointer;font-family:Inter,sans-serif;transition:transform .12s,border-color .12s,background .12s;';
      card.addEventListener('mouseenter', function () { card.style.transform = 'translateY(-1px)'; card.style.borderColor = 'rgba(127,227,168,0.45)'; card.style.background = 'rgba(255,255,255,0.07)'; });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; card.style.borderColor = 'rgba(255,255,255,0.10)'; card.style.background = 'rgba(255,255,255,0.04)'; });
      var sum = (c.summary || '').slice(0, 160);
      card.innerHTML =
        '<div style="font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">' + esc(c.canonicalName) + '</div>' +
        (sum ? '<div style="font-size:12.5px;color:#9fadc9;line-height:1.5;margin-bottom:8px">' + esc(sum) + (c.summary.length > 160 ? '…' : '') + '</div>' : '') +
        '<div style="font-family:IBM Plex Mono,ui-monospace,monospace;font-size:11px;color:#6c77bd;word-break:break-all">' + esc(c.linkedinUrl) + '</div>';
      card.addEventListener('click', function () { onPick(c); });
      _bodyEl.appendChild(card);
    });
  }

  function openModal(query, candidates) {
    return new Promise(function (resolve) {
      buildModal();
      $('#dd-eyebrow').textContent = candidates.length ? 'Confirmation' : 'Aucune correspondance';
      $('#dd-sub').textContent = 'Tu as cherché « ' + query + ' » — choisis l\'entreprise exacte ci-dessous.';
      function close(val) { _modal.style.display = 'none'; resolve(val); }
      renderCandidates(candidates, function (c) { close(c); });
      $('#dd-degraded').onclick = function () { close({ canonicalName: query, linkedinSlug: null, linkedinUrl: null, summary: '', degraded: true }); };
      $('#dd-cancel').onclick = function () { close(null); };
      _modal.style.display = 'flex';
    });
  }

  // ---- search + cache ----
  async function resolveCompany(query) {
    var key = norm(query);
    if (!key) return null;

    // Cache
    try {
      var cached = await idb().get('company_resolved', key);
      if (cached && cached.value) return cached.value;
    } catch (e) {}

    // Search
    var data = null;
    try {
      var res = await fetch('/api/company-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
      });
      if (res.ok) data = await res.json();
    } catch (e) {
      console.error('[disambig] search error', e);
    }

    var candidates = (data && data.candidates) || [];

    // Auto-select if the backend flagged a strong match
    if (data && data.autoSelect) {
      var v = data.autoSelect;
      try { await idb().put('company_resolved', { key: key, value: v, ts: Date.now() }); } catch (e) {}
      return v;
    }

    // Modal otherwise
    var picked = await openModal(query, candidates);
    if (picked) {
      try { await idb().put('company_resolved', { key: key, value: picked, ts: Date.now() }); } catch (e) {}
    }
    return picked;
  }

  // ---- Lancer button hijack (capture phase, before React) ----
  var __reentry = false;
  function hijack() {
    var btn = Array.from(document.querySelectorAll('button')).find(function (b) {
      return /lancer/i.test(b.textContent || '') && !b.dataset.imesDisambig;
    });
    if (!btn) return;
    btn.dataset.imesDisambig = '1';
    btn.addEventListener('click', async function (e) {
      if (__reentry) { __reentry = false; return; }  // second click after we resolved — let it through
      var input = $('#acc');
      var role = $('#fon');
      var q = input ? input.value.trim() : '';
      if (!q || !role || !role.value.trim()) return;  // empty — let bundle handle it
      e.preventDefault(); e.stopImmediatePropagation();

      // Visual hint that something is happening (the modal opens shortly after)
      btn.disabled = true; var origText = btn.innerHTML;
      btn.innerHTML = btn.innerHTML.replace(/Lancer.*$/i, 'Identification…');

      var resolved;
      try { resolved = await resolveCompany(q); }
      catch (err) { console.error('[disambig]', err); resolved = null; }

      btn.disabled = false; btn.innerHTML = origText;
      if (!resolved) return;  // user cancelled

      // Patch input to canonical (so the bundle's launch reads it as such)
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, resolved.canonicalName);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Stash for stream.js to attach to the /api/agent POST body
      try { sessionStorage.setItem('imes_resolved_company', JSON.stringify(resolved)); } catch (x) {}

      // Re-click without re-intercepting
      __reentry = true;
      setTimeout(function () { btn.click(); }, 50);
    }, true);  // capture
  }
  setInterval(hijack, 200);
})();
