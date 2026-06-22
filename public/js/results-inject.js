/* results-inject.js — feeds LIVE pipeline data into the new dossier bundle.
   Runs in <head>, before the bundle unpacks. Reads the mapped dossier object
   that stream.js stashed in sessionStorage and traps window.IMES_DOSSIER_DATA
   so the bundle's CIMLIT fallback (set by its own data.js) is replaced by live
   data. If no live data exists (direct open of /results.html), the bundle's
   sample data renders untouched — demo-safe. */
(function () {
  // If this dossier was replayed from the IndexedDB cache, show a small chip so
  // the demo is honest that no live search/LLM call was made this time.
  try {
    if (sessionStorage.getItem('imes_from_cache') === '1') {
      sessionStorage.removeItem('imes_from_cache');
      var shown = false;
      var iv = setInterval(function () {
        if (shown || !document.body) return;
        shown = true;
        var chip = document.createElement('div');
        chip.textContent = '⚡ Résultat instantané — chargé depuis le cache local';
        chip.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:2147483647;background:rgba(43,57,145,0.96);color:#fff;font:600 12px/1.3 ui-sans-serif,system-ui,-apple-system,sans-serif;padding:10px 15px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,0.4);';
        document.body.appendChild(chip);
        clearInterval(iv);
        setTimeout(function () { if (chip.parentNode) chip.parentNode.removeChild(chip); }, 6000);
      }, 200);
      setTimeout(function () { clearInterval(iv); }, 6000);
    }
  } catch (e) {}

  var raw = null;
  try { raw = sessionStorage.getItem('imes_dossier'); } catch (e) {}
  if (!raw) return; // no live data → let the bundle's CIMLIT sample render

  var live = null;
  try { live = JSON.parse(raw); } catch (e) { return; }
  if (!live || typeof live !== 'object') return;

  // Trap the global: when the bundle's data.js assigns its fallback object,
  // swap in the live data instead. layout.js reads the trapped value afterwards.
  var _held = live;
  try {
    Object.defineProperty(window, 'IMES_DOSSIER_DATA', {
      configurable: true,
      get: function () { return _held; },
      set: function () { _held = live; } // ignore fallback assignment
    });
  } catch (e) {
    // Fallback if defineProperty is blocked: just set it directly.
    window.IMES_DOSSIER_DATA = live;
  }
})();
