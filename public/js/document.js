/* Agent documentaire — flux commun (upload mis en scène → animation stepper+journal
   → résultat), avec cache IndexedDB (replay instantané), repli scénarisé hors-ligne
   (timeout/erreur → 503), indicateur live/repli/cache. Type via ?type=… (défaut manifeste). */
(function () {
  'use strict';

  // ---- inline icons (24px, stroke=currentColor) ----
  var ICONS = {
    scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M7 12h10"/>',
    layers: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
    scale: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>',
    alert: '<path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h8"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'
  };
  function svg(name, color) {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + (color || '#fff') +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.scan) + '</svg>';
  }

  // ---- per-type configuration ----
  var CONFIG = {
    manifeste: {
      tag: 'Agent · Manifeste & connaissement',
      eyebrow: 'Ports & logistique',
      title: 'Lecture & contrôle de connaissement',
      sub: "Chargez un connaissement (bill of lading) préparé. L'agent l'extrait, vérifie la cohérence et signale les anomalies — sans recherche externe.",
      runTitle: "Pipeline de l'agent",
      specimen: '/specimens/manifeste.pdf',
      steps: [
        { title: 'Redressement et lecture du document', icon: 'scan', desc: 'Correction de perspective, lecture multimodale.' },
        { title: 'Extraction structurée', icon: 'layers', desc: 'Expéditeur, navire, ports, marchandise, conteneurs, poids.' },
        { title: 'Contrôle de cohérence', icon: 'scale', desc: 'Poids vs conteneurs ; code douanier vs marchandise.' },
        { title: "Signalement de l'anomalie", icon: 'alert', desc: 'Écarts que l’opérateur pressé aurait ratés.' },
        { title: 'Mise en forme exploitable', icon: 'table', desc: 'Tableau prêt à exporter.' }
      ],
      renderResult: renderManifeste,
      repli: {
        steps: [
          { log: ['rotation +6° corrigée', 'lecture multimodale OK'], conclusion: 'Document redressé et lisible.', alert: false },
          { log: ['expéditeur, destinataire, navire extraits', 'marchandise : fèves de cacao', '1 conteneur 20′ · TCLU1234567'], conclusion: 'Champs clés extraits du connaissement.', alert: false },
          { log: ['poids brut déclaré : 54 000 kg', 'capacité utile 20′ ≈ 28 000 kg', 'code SH 1801.00 ↔ cacao : cohérent'], conclusion: 'Incohérence de poids détectée vs nombre de conteneurs.', alert: false },
          { log: ['ANOMALIE : 54 t pour un seul 20′ (impossible)', 'gravité : élevée'], conclusion: '⚠ Poids incompatible avec le conteneur annoncé.', alert: true },
          { log: ['tableau structuré généré', 'export prêt (sous réserve de l’anomalie)'], conclusion: 'Données mises en forme, anomalie remontée.', alert: false }
        ],
        result: {
          donnees: {
            expediteur: 'Sté Cacao du Sud SARL (Douala)',
            destinataire: 'Europe Trading GmbH (Anvers)',
            navire: 'MV Douala Star',
            port_chargement: 'Douala (CM)',
            port_dechargement: 'Anvers (BE)',
            marchandise: 'Fèves de cacao en sacs',
            poids_brut: '54 000 kg',
            nb_conteneurs: "1 × 20'",
            numeros_conteneurs: ['TCLU1234567'],
            code_douanier: '1801.00 — Cacao en fèves'
          },
          anomalies: [{
            champ: 'poids_brut ↔ nb_conteneurs',
            probleme: "54 000 kg déclarés pour un seul conteneur 20' (charge utile max ≈ 28 000 kg). Poids physiquement impossible — erreur de saisie ou conteneur manquant non déclaré.",
            gravite: 'élevée'
          }],
          pret_export: false
        }
      }
    },
    credit: {
      tag: 'Agent · Dossier de crédit',
      eyebrow: 'Banque & assurance',
      title: 'Analyse de dossier de crédit',
      sub: "Chargez un dossier de crédit préparé (CNI, bulletins, relevés…). L'agent trie les pièces, contrôle la cohérence des revenus et rend un avis motivé.",
      runTitle: "Pipeline de l'agent",
      specimen: '/specimens/credit.pdf',
      steps: [
        { title: 'Tri et classification des pièces', icon: 'layers', desc: 'Reconnaissance et regroupement des documents.' },
        { title: 'Extraction des données clés', icon: 'user', desc: 'Identité, revenus, charges, ancienneté.' },
        { title: 'Contrôle de cohérence', icon: 'scale', desc: 'Revenus déclarés vs virements réels.' },
        { title: 'Pièces manquantes & vigilance', icon: 'alert', desc: 'Pièces absentes et signaux d’alerte.' },
        { title: 'Capacité & taux d’endettement', icon: 'calc', desc: 'Ratios et capacité de remboursement.' },
        { title: "Fiche d'analyse & avis motivé", icon: 'file', desc: 'Décision argumentée.' }
      ],
      renderResult: renderCredit,
      repli: {
        steps: [
          { log: ['5 documents détectés', 'CNI, 1 bulletin, relevé, demande triés'], conclusion: 'Pièces classées par type.', alert: false },
          { log: ['demandeur : Jean-Paul MBARGA', 'crédit immobilier · 25 000 000 FCFA', 'ancienneté : 4 ans (CDI)'], conclusion: 'Données clés extraites.', alert: false },
          { log: ['bulletin : net à payer 850 000 FCFA', 'relevé : virements salaire 720 000 FCFA', 'écart : 130 000 FCFA (-15%)'], conclusion: 'Incohérence revenus déclarés vs constatés.', alert: false },
          { log: ['justificatif de domicile : ABSENT', 'écart de revenus confirmé', 'vigilance : sur-déclaration probable'], conclusion: '⚠ Pièce manquante + revenus sur-déclarés.', alert: true },
          { log: ['charges : 180 000 FCFA/mois', 'revenus retenus : 720 000 FCFA', 'taux d’endettement : 25%'], conclusion: "Taux d'endettement calculé sur revenus constatés.", alert: false },
          { log: ['synthèse rédigée', 'avis : favorable sous réserve'], conclusion: 'Fiche et avis motivé produits.', alert: false }
        ],
        result: {
          demandeur: { nom: 'M. Jean-Paul MBARGA', type_credit: 'Crédit immobilier', montant_demande: '25 000 000 FCFA' },
          pieces: [
            { nom: "Carte Nationale d'Identité (CNI)", present: true },
            { nom: 'Bulletins de salaire', present: true },
            { nom: 'Relevé bancaire (3 mois)', present: true },
            { nom: 'Demande de crédit signée', present: true },
            { nom: 'Justificatif de domicile', present: false }
          ],
          donnees: { revenus_declares: '850 000 FCFA', revenus_constates: '720 000 FCFA', charges: '180 000 FCFA', anciennete: '4 ans (CDI)' },
          ratios: { taux_endettement: '25 % (sur revenus constatés)', capacite_remboursement: '≈ 360 000 FCFA / mois' },
          incoherences: ['Revenu net déclaré (850 000 FCFA) supérieur de 130 000 FCFA aux virements de salaire réellement constatés (720 000 FCFA) — sur-déclaration de ~15 %.'],
          pieces_manquantes: ['Justificatif de domicile (non fourni)'],
          vigilance: ['Écart revenus déclarés/constatés', 'Crédit auto en cours (180 000 FCFA/mois) non négligeable'],
          avis: { decision: 'Favorable sous réserve', justification: 'Capacité de remboursement correcte sur revenus constatés (endettement 25 %), mais avis conditionné à la régularisation du justificatif de domicile et à la justification de l’écart de revenus déclaré.' }
        }
      }
    },
    // scaffolds — remplis au déroulé
    rapport: { tag: 'Agent · Synthèse de rapport', eyebrow: 'Énergie & audit', title: 'Synthèse & interrogation de rapport', sub: 'À venir.', runTitle: "Pipeline de l'agent", steps: [], renderResult: renderGeneric, repli: { steps: [], result: {} } },
    offre: { tag: "Agent · Appel d'offres", eyebrow: 'Cotation B2B', title: "Réponse à appel d'offres", sub: 'À venir.', runTitle: "Pipeline de l'agent", steps: [], renderResult: renderGeneric, repli: { steps: [], result: {} } }
  };

  var TYPE = (new URLSearchParams(location.search).get('type') || 'manifeste').toLowerCase();
  if (!CONFIG[TYPE]) TYPE = 'manifeste';
  var CFG = CONFIG[TYPE];

  var $ = function (id) { return document.getElementById(id); };
  var loaded = null; // { base64, mime, filename }

  // ---- init entry screen ----
  document.title = 'IMES · ' + CFG.tag;
  $('agent-tag').textContent = CFG.tag;
  $('eyebrow').textContent = CFG.eyebrow;
  $('title').textContent = CFG.title;
  $('sub').textContent = CFG.sub;
  $('run-title').textContent = CFG.runTitle;

  // Scaffolded (not-yet-built) agent → clean "coming soon" state, no broken run.
  if (!CFG.steps || !CFG.steps.length) {
    $('sub').textContent = 'Cet agent est en préparation — bientôt disponible.';
    var drop = document.querySelector('.drop'); if (drop) drop.style.display = 'none';
    $('launch-btn').style.display = 'none';
  }

  function setMode(mode) {
    var pill = $('mode-pill'), dot = pill.querySelector('.dot'), txt = $('mode-text');
    var map = {
      pret: ['prêt', 'var(--faint)'], live: ['IA en direct (Claude)', 'var(--green-d)'],
      repli: ['repli scénarisé', 'var(--amber)'], cache: ['cache local', 'var(--blue-300)']
    };
    var m = map[mode] || map.pret;
    txt.textContent = m[0]; dot.style.background = m[1];
  }

  function showScreen(name) {
    ['entry', 'running', 'result'].forEach(function (s) { $('screen-' + s).classList.toggle('active', s === name); });
  }

  // ---- file loading (staged) ----
  $('load-btn').addEventListener('click', function () {
    // Try the prepared specimen first; fall back to a file picker.
    if (CFG.specimen) {
      fetch(CFG.specimen).then(function (r) {
        if (!r.ok) throw new Error('no specimen');
        return r.blob();
      }).then(function (blob) {
        return readBlob(blob, CFG.specimen.split('/').pop());
      }).then(setLoaded).catch(function () { $('file-input').click(); });
    } else {
      $('file-input').click();
    }
  });
  $('file-input').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    if (f) readBlob(f, f.name).then(setLoaded);
  });

  function readBlob(blob, name) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () {
        var dataUrl = fr.result;
        var base64 = String(dataUrl).split(',')[1] || '';
        resolve({ base64: base64, mime: blob.type || 'application/pdf', filename: name || 'spécimen', dataUrl: dataUrl });
      };
      fr.readAsDataURL(blob);
    });
  }

  function setLoaded(file) {
    loaded = file;
    var prev = $('doc-preview'), card = $('doc-card');
    if (/^image\//.test(file.mime)) {
      prev.src = file.dataUrl; prev.style.display = 'block'; card.style.display = 'none';
    } else {
      $('doc-name').textContent = file.filename; card.style.display = 'inline-flex'; prev.style.display = 'none';
    }
    $('launch-btn').removeAttribute('disabled');
  }

  // ---- hashing for the cache key ----
  function fileHash(base64) {
    try {
      var bin = atob(base64.slice(0, 200000)); // cap for speed; enough to disambiguate specimens
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').slice(0, 24);
      });
    } catch (e) { return Promise.resolve('nohash'); }
  }
  function idb() { return window.IMESIDB || null; }

  // ---- launch ----
  $('launch-btn').addEventListener('click', function () {
    if (!loaded) return;
    $('chip-cache').style.display = 'none';
    showRunning(); // immediate feedback (arming) while we resolve cache / call the API
    fileHash(loaded.base64).then(function (hash) {
      var key = TYPE + '::' + hash;
      var cache = idb();
      var lookup = cache ? cache.get('documents', key) : Promise.resolve(null);
      lookup.then(function (hit) {
        if (hit && Array.isArray(hit.steps) && hit.result) {
          setMode('cache'); $('run-mode').textContent = '· cache local';
          showCacheChip();
          animate(hit.steps, hit.result);
          return;
        }
        // live
        $('run-mode').textContent = '· flux IA';
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 90000);
        fetch('/api/document', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ type: TYPE, file: loaded.base64, mime: loaded.mime, filename: loaded.filename })
        }).then(function (r) {
          clearTimeout(to);
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        }).then(function (d) {
          if (!d || !Array.isArray(d.steps) || !d.result) throw new Error('bad payload');
          setMode('live'); $('run-mode').textContent = '· flux IA (Claude)';
          if (cache) { try { cache.put('documents', { key: key, type: TYPE, filename: loaded.filename, steps: d.steps, result: d.result, ts: Date.now() }); } catch (e) {} }
          animate(d.steps, d.result);
        }).catch(function () {
          // repli scénarisé — hors-ligne, piège garanti
          setMode('repli'); $('run-mode').textContent = '· repli scénarisé';
          animate(CFG.repli.steps, CFG.repli.result);
        });
      });
    });
  });

  function showCacheChip() {
    var c = $('chip-cache'); c.style.display = 'block';
    setTimeout(function () { c.style.display = 'none'; }, 6000);
  }

  // ---- the animation (stepper + journal), paced at fixed cadence ----
  function stamp() { var x = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return p(x.getHours()) + ':' + p(x.getMinutes()) + ':' + p(x.getSeconds()); }

  // Build the running screen + step skeleton immediately (arming), before data.
  function showRunning() {
    showScreen('running');
    var stepsEl = $('steps'); stepsEl.innerHTML = '';
    var meta = CFG.steps;
    $('run-count').textContent = '0 / ' + meta.length;
    $('journal-lines').innerHTML = '';
    pushLog('connexion à l’agent · POST /api/document', true);
    meta.forEach(function (m, i) {
      var el = document.createElement('div');
      el.className = 'step'; el.id = 'step-' + i;
      el.innerHTML =
        '<div class="ico">' + svg(m.icon) + '</div>' +
        '<div class="body"><div class="num">' + ('0' + (i + 1)).slice(-2) + '</div>' +
        '<div class="title">' + esc(m.title) + '</div>' +
        '<div class="desc">' + esc(m.desc) + '</div>' +
        '<div class="concl"></div></div>';
      stepsEl.appendChild(el);
    });
  }

  // Animate the (already-built) stepper + journal from the resolved data.
  function animate(steps, result) {
    window.__lastSteps = steps; window.__lastResult = result;
    if (!$('step-0')) showRunning();
    var n = CFG.steps.length;
    var i = 0;
    function nextStep() {
      if (i >= n) { setTimeout(function () { showResult(result); }, 500); return; }
      var el = $('step-' + i);
      el.classList.add('active');
      var s = steps[i] || { log: [], conclusion: '', alert: false };
      pushLog('étape ' + ('0' + (i + 1)).slice(-2) + ' · ' + (CFG.steps[i].title.toLowerCase()), true);
      var logs = (s.log || []).slice();
      function nextLog() {
        if (logs.length) { pushLog(logs.shift()); setTimeout(nextLog, 360); return; }
        // mark done
        el.classList.remove('active'); el.classList.add('done');
        if (s.alert) el.classList.add('alert');
        var ico = el.querySelector('.ico');
        ico.innerHTML = svg('check', s.alert ? '#ff8a8f' : '#7fe3a8');
        if (s.conclusion) {
          var c = el.querySelector('.concl'); c.textContent = s.conclusion;
          if (s.alert) { c.innerHTML = '<span class="badge-alert">signal fort</span> ' + esc(s.conclusion); }
        }
        $('run-count').textContent = (i + 1) + ' / ' + n;
        i++; setTimeout(nextStep, 320);
      }
      setTimeout(nextLog, 260);
    }
    setTimeout(nextStep, 500);
  }

  function pushLog(text, accent) {
    var el = document.createElement('div');
    el.className = 'jline' + (accent ? ' accent' : '');
    el.innerHTML = '<span class="t">' + stamp() + '</span><span class="x">' + esc(text) + '</span>';
    var box = $('journal-lines'); box.appendChild(el); box.scrollTop = box.scrollHeight;
  }

  // ---- result rendering ----
  function showResult(result) {
    var host = $('screen-result');
    host.innerHTML = CFG.renderResult(result);
    showScreen('result');
    var nv = document.getElementById('btn-nouveau'); if (nv) nv.addEventListener('click', function () { location.reload(); });
    var rj = document.getElementById('btn-rejouer'); if (rj) rj.addEventListener('click', function () { showRunning(); animate(window.__lastSteps || CFG.repli.steps, window.__lastResult || result); });
  }

  function renderManifeste(r) {
    r = r || {}; var d = r.donnees || {};
    var rows = [
      ['Expéditeur', d.expediteur], ['Destinataire', d.destinataire], ['Navire', d.navire],
      ['Port de chargement', d.port_chargement], ['Port de déchargement', d.port_dechargement],
      ['Marchandise', d.marchandise], ['Poids brut', d.poids_brut], ['Conteneurs', d.nb_conteneurs],
      ['N° conteneurs', (d.numeros_conteneurs || []).join(', ')], ['Code douanier', d.code_douanier]
    ].map(function (kv) { return '<dt>' + esc(kv[0]) + '</dt><dd>' + esc(kv[1] || '—') + '</dd>'; }).join('');

    var anomalies = (r.anomalies || []);
    var anoHtml = anomalies.length ? anomalies.map(function (a) {
      return '<div class="anomaly"><span class="g">' + esc(a.gravite || '') + '</span><div><div style="font-weight:600;margin-bottom:3px">' + esc(a.champ || '') + '</div><div style="color:#e3e9f5;font-size:13.5px;line-height:1.5">' + esc(a.probleme || '') + '</div></div></div>';
    }).join('') : '<div class="anomaly" style="background:rgba(31,138,91,.1);border-color:rgba(127,227,168,.35)"><span class="none">✓</span><div>Aucune anomalie détectée.</div></div>';

    var exp = r.pret_export
      ? '<span class="export-status" style="color:var(--green)">✓ Prêt à exporter</span>'
      : '<span class="export-status" style="color:#ff8a8f">⚠ Export bloqué — anomalie à lever</span>';

    return '' +
      '<div class="rhead"><div class="ok">' + (anomalies.length ? '⚠ Anomalie détectée' : '✓ Analyse terminée') + '</div>' +
      '<h1>Connaissement analysé</h1></div>' +
      '<div class="card"><h3>' + svg('alert', '#ff9095') + ' Anomalies & vigilance</h3>' + anoHtml + '<div style="margin-top:8px">' + exp + '</div></div>' +
      '<div class="card"><h3>' + svg('table', '#aab8d8') + ' Données extraites</h3><dl class="kv">' + rows + '</dl></div>' +
      '<div class="actions"><button class="btn btn-accent" id="btn-rejouer" style="padding:12px 20px;font-size:15px">↻ Rejouer</button>' +
      '<button class="btn btn-ghost" id="btn-nouveau">Nouveau document</button></div>';
  }

  function renderCredit(r) {
    r = r || {}; var dem = r.demandeur || {}, don = r.donnees || {}, rat = r.ratios || {}, avis = r.avis || {};
    var dec = (avis.decision || '').toLowerCase();
    var decColor = dec.indexOf('défavor') !== -1 || dec.indexOf('defavor') !== -1 ? '#ff8a8f' : (dec.indexOf('réserve') !== -1 || dec.indexOf('reserve') !== -1 ? 'var(--amber)' : 'var(--green)');

    var incos = (r.incoherences || []), manq = (r.pieces_manquantes || []), vig = (r.vigilance || []);
    var flagged = incos.length || manq.length || vig.length;
    var alertBlocks = '';
    incos.forEach(function (s) { alertBlocks += '<div class="anomaly"><span class="g">incohérence</span><div style="font-size:13.5px;line-height:1.5;color:#e3e9f5">' + esc(s) + '</div></div>'; });
    manq.forEach(function (s) { alertBlocks += '<div class="anomaly"><span class="g">pièce manquante</span><div style="font-size:13.5px;line-height:1.5;color:#e3e9f5">' + esc(s) + '</div></div>'; });
    vig.forEach(function (s) { alertBlocks += '<div class="anomaly" style="background:rgba(244,183,64,.10);border-color:rgba(244,183,64,.35)"><span class="g" style="background:rgba(244,183,64,.2);color:var(--amber)">vigilance</span><div style="font-size:13.5px;line-height:1.5;color:#e3e9f5">' + esc(s) + '</div></div>'; });
    if (!flagged) alertBlocks = '<div class="anomaly" style="background:rgba(31,138,91,.1);border-color:rgba(127,227,168,.35)"><span class="none">✓</span><div>Aucune incohérence ni pièce manquante.</div></div>';

    var pieces = (r.pieces || []).map(function (p) {
      var ok = p.present;
      return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;font-size:14px">' +
        '<span style="color:' + (ok ? 'var(--green)' : '#ff8a8f') + ';font-weight:700;width:18px">' + (ok ? '✓' : '✗') + '</span>' +
        '<span style="color:' + (ok ? '#e3e9f5' : '#ff8a8f') + '">' + esc(p.nom) + (ok ? '' : ' — manquante') + '</span></div>';
    }).join('');

    var revAlert = don.revenus_declares && don.revenus_constates && (String(don.revenus_declares).replace(/\D/g, '') !== String(don.revenus_constates).replace(/\D/g, ''));

    return '' +
      '<div class="rhead"><div class="ok">' + (flagged ? '⚠ Points de vigilance détectés' : '✓ Dossier cohérent') + '</div><h1>Dossier de crédit analysé</h1></div>' +
      '<div class="card" style="border-color:' + decColor + '55"><h3>' + svg('file', decColor) + ' Avis motivé</h3>' +
        '<div style="font-family:var(--font-display);font-weight:800;font-size:22px;color:' + decColor + ';margin-bottom:6px">' + esc(avis.decision || '—') + '</div>' +
        '<div style="font-size:14px;line-height:1.55;color:#cdd7ea">' + esc(avis.justification || '') + '</div>' +
        '<dl class="kv" style="margin-top:14px"><dt>Demandeur</dt><dd>' + esc(dem.nom || '—') + '</dd><dt>Crédit</dt><dd>' + esc(dem.type_credit || '—') + ' · ' + esc(dem.montant_demande || '') + '</dd></dl></div>' +
      '<div class="card"><h3>' + svg('alert', '#ff9095') + ' Incohérences & vigilance</h3>' + alertBlocks + '</div>' +
      '<div class="card"><h3>' + svg('scale', '#aab8d8') + ' Revenus & ratios</h3>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px">' +
          '<div style="flex:1;min-width:160px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid var(--border)"><div style="font-size:11px;color:var(--lbl);text-transform:uppercase;letter-spacing:.08em">Revenus déclarés</div><div style="font-size:20px;font-weight:700;margin-top:3px' + (revAlert ? ';color:#ff8a8f' : '') + '">' + esc(don.revenus_declares || '—') + '</div></div>' +
          '<div style="flex:1;min-width:160px;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid ' + (revAlert ? 'rgba(127,227,168,.4)' : 'var(--border)') + '"><div style="font-size:11px;color:var(--lbl);text-transform:uppercase;letter-spacing:.08em">Revenus constatés</div><div style="font-size:20px;font-weight:700;margin-top:3px;color:var(--green)">' + esc(don.revenus_constates || '—') + '</div></div>' +
        '</div>' +
        '<dl class="kv"><dt>Charges mensuelles</dt><dd>' + esc(don.charges || '—') + '</dd><dt>Ancienneté</dt><dd>' + esc(don.anciennete || '—') + '</dd>' +
        '<dt>Taux d’endettement</dt><dd>' + esc(rat.taux_endettement || '—') + '</dd><dt>Capacité de remboursement</dt><dd>' + esc(rat.capacite_remboursement || '—') + '</dd></dl></div>' +
      '<div class="card"><h3>' + svg('layers', '#aab8d8') + ' Pièces du dossier</h3>' + pieces + '</div>' +
      '<div class="actions"><button class="btn btn-accent" id="btn-rejouer" style="padding:12px 20px;font-size:15px">↻ Rejouer</button>' +
      '<button class="btn btn-ghost" id="btn-nouveau">Nouveau document</button></div>';
  }

  function renderGeneric(r) {
    return '<div class="rhead"><div class="ok">✓ Analyse terminée</div><h1>Résultat</h1></div>' +
      '<div class="card"><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12.5px;color:#cdd7ea">' + esc(JSON.stringify(r, null, 2)) + '</pre></div>' +
      '<div class="actions"><button class="btn btn-ghost" id="btn-nouveau">Nouveau document</button></div>';
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = (s == null ? '' : s); return d.innerHTML; }

  setMode('pret');
})();
