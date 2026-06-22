/* IMES Agent — Dossier (deliverable) + orchestrator + mount.
   Calls POST /api/agent (12 s timeout). On failure → embedded repli.
   Reveal is paced by the UI so live and repli look identical. */

const AG = window.IMES_AGENT;
const IconD = window.IMESIcon;
const { Header: HeaderD, Intake: IntakeD, Running: RunningD } = window.IMES_PARTS;
const sleepD = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- Dossier sub-parts ---- */
function SectionHead({ n, icon, title, dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
      <span style={{ width: 38, height: 38, borderRadius: 9, background: dark ? 'rgba(255,255,255,0.15)' : 'var(--imes-blue-050)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <IconD name={icon} size={20} color={dark ? '#fff' : 'var(--imes-blue)'} />
      </span>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: dark ? '#c9d0ee' : 'var(--imes-red)', letterSpacing: '0.08em' }}>{n}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, color: dark ? '#fff' : 'var(--navy-900)', margin: 0, lineHeight: 1.15 }}>{title}</h3>
      </div>
    </div>
  );
}

function Bullets({ items, accent }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
      {(items || []).map((t, i) => (
        <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ marginTop: 7, width: 7, height: 7, borderRadius: '50%', background: accent || 'var(--imes-blue)', flex: 'none' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, lineHeight: 1.5, color: 'var(--text-body)' }}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const btnAccent = { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--imes-red)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' };
const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: 'var(--navy-900)', border: '1.5px solid var(--border-default)', borderRadius: 8, padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' };
const cardSoft = { background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 22, boxShadow: 'var(--shadow-xs)' };

function Dossier({ data, mode, onReplay, onHome }) {
  const d = data.dossier;
  return (
    <div className="imes-dossier-scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-page)', position: 'relative', zIndex: 2 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '38px 40px 80px' }}>
        {/* Dossier header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--imes-red)' }}>Dossier de stratégie commerciale</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--navy-900)', margin: '13px 0 0' }}>{data.account.company}</h1>
            <div style={{ marginTop: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, background: 'var(--imes-blue-050)', color: 'var(--imes-blue)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 600 }}>
                <IconD name="target" size={15} color="var(--imes-blue)" /> {data.account.role}
              </span>
            </div>
          </div>
          <div className="imes-no-print" style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={btnGhost}><IconD name="file-text" size={16} /> Imprimer</button>
            <button onClick={onHome} style={btnGhost}>Nouveau compte</button>
            <button onClick={onReplay} style={btnAccent}><IconD name="rotate-ccw" size={16} /> Rejouer</button>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-default)', margin: '22px 0 30px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 30, alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            <section>
              <SectionHead n="01" icon="building-2" title="Profil du compte" />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)', margin: 0 }}>{d.profil}</p>
            </section>

            <section>
              <SectionHead n="02" icon="activity" title="Signaux récents" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(d.signaux || []).map((s, i) => (
                  <div key={i} style={{ padding: '15px 17px', background: '#fff', border: '1px solid var(--border-subtle)', borderLeft: '3px solid var(--imes-red)', borderRadius: '0 10px 10px 0', boxShadow: 'var(--shadow-xs)' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, lineHeight: 1.5, color: 'var(--text-strong)', fontWeight: 500 }}>{s.text}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>
                      <IconD name="search" size={12} color="var(--text-muted)" /> {s.source}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionHead n="06" icon="mail" title="Message d'approche prêt à envoyer" />
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '13px 18px', background: 'var(--navy-900)', color: '#fff' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8ea0c2', marginBottom: 4 }}>OBJET</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600 }}>{d.email.subject}</div>
                </div>
                <div style={{ padding: '18px 20px', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.62, color: 'var(--text-body)', whiteSpace: 'pre-wrap' }}>{d.email.body}</div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section style={cardSoft}><SectionHead n="03" icon="layers" title="Priorités probables" /><Bullets items={d.priorites} /></section>

            <section style={{ ...cardSoft, background: 'var(--imes-blue)', border: 'none' }}>
              <SectionHead n="04" icon="compass" title="Angle recommandé" dark />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,0.94)', margin: 0 }}>{d.angle}</p>
            </section>

            <section style={cardSoft}>
              <SectionHead n="05" icon="sparkles" title="Proposition de valeur" />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, lineHeight: 1.58, color: 'var(--text-body)', margin: 0 }}>{d.valeur}</p>
            </section>

            <section style={cardSoft}>
              <SectionHead n="07" icon="shield" title="Objections anticipées" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(d.objections || []).map((o, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15.5, color: 'var(--navy-900)', fontWeight: 500, marginBottom: 5 }}>{o.q}</div>
                    <div style={{ display: 'flex', gap: 9 }}>
                      <IconD name="arrow-right" size={15} color="var(--status-success)" style={{ marginTop: 3 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-body)' }}>{o.a}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Next action banner */}
        <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 18, padding: '22px 26px', background: 'var(--navy-900)', borderRadius: 14, boxShadow: 'var(--shadow-md)' }}>
          <span style={{ width: 46, height: 46, borderRadius: 11, background: 'var(--imes-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <IconD name="zap" size={24} color="#fff" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#ff8a8f', marginBottom: 5 }}>Prochaine action</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16.5, lineHeight: 1.45, color: '#fff', fontWeight: 500 }}>{d.next}</div>
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--text-faint)' }}>
            Dossier généré par l'Agent IMES · {mode === 'live' ? 'IA en direct (Claude)' : 'repli scénarisé hors-ligne'} · toutes les données sont fictives et illustratives.
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--imes-blue)' }}>IMES<span style={{ color: 'var(--imes-red)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, marginLeft: 4 }}>Consulting</span></span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Orchestrator                                                       */
/* ----------------------------------------------------------------- */
function stamp() {
  const x = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}`;
}

async function callAgent(company, role) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, role }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || !Array.isArray(j.steps) || j.steps.length === 0 || !j.dossier) return null;
    if (!j.account) j.account = { company, role };
    return j;
  } catch (e) { return null; }
}

function App() {
  const { useState, useRef } = React;
  const [phase, setPhase] = useState('intake');
  const [company, setCompany] = useState('Cimenterie du Littoral (CIMLIT)');
  const [role, setRole] = useState('Directrice des Achats');
  const [mode, setMode] = useState('fallback');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [doneCount, setDoneCount] = useState(0);
  const [conclusions, setConclusions] = useState(Array(7).fill(null));
  const [alerts, setAlerts] = useState(Array(7).fill(false));
  const [journal, setJournal] = useState([]);
  const [sources, setSources] = useState([]);
  const [sourcesTotal, setSourcesTotal] = useState(0);
  const [arming, setArming] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [result, setResult] = useState(null);
  const runRef = useRef(0);

  const launch = async () => {
    const myRun = ++runRef.current;
    const co = (company || '').trim() || 'Cimenterie du Littoral (CIMLIT)';
    const ro = (role || '').trim() || 'Directrice des Achats';
    setPhase('running');
    setActiveIdx(-1); setDoneCount(0); setConclusions(Array(7).fill(null)); setAlerts(Array(7).fill(false));
    setJournal([]); setSources([]); setSourcesTotal(0); setAssembling(false); setArming(true); setResult(null);

    const pushLog = (text, accent) => setJournal((p) => [...p, { t: stamp(), text, accent: !!accent }]);
    pushLog('connexion à l\u2019agent · POST /api/agent', true);

    // Resolve dataset: live within 12 s, else embedded repli. Min 1.4 s arming.
    const [live] = await Promise.all([callAgent(co, ro), sleepD(1400)]);
    if (runRef.current !== myRun) return;
    const ds = live || AG.repli(co, ro);
    const isLive = !!live;
    setMode(isLive ? 'live' : 'fallback');
    setArming(false);
    pushLog(isLive ? 'agent connecté · données en direct' : 'réseau indisponible · repli scénarisé', true);

    const steps = ds.steps.slice(0, AG.STEP_META.length);
    setSourcesTotal(steps.reduce((a, s) => a + ((s.sources && s.sources.length) || 0), 0));

    for (let i = 0; i < AG.STEP_META.length; i++) {
      if (runRef.current !== myRun) return;
      const st = steps[i] || { log: [], sources: [], conclusion: '', alert: false };
      setActiveIdx(i);
      pushLog(`étape ${AG.STEP_META[i].n} · ${(st.title || AG.STEP_META[i].title).toLowerCase()}`, true);
      for (const line of (st.log || [])) {
        await sleepD(420); if (runRef.current !== myRun) return;
        pushLog(line);
      }
      for (const src of (st.sources || [])) {
        await sleepD(240); if (runRef.current !== myRun) return;
        setSources((p) => [...p, src]);
      }
      await sleepD(360); if (runRef.current !== myRun) return;
      setConclusions((p) => { const n = p.slice(); n[i] = st.conclusion || ''; return n; });
      setAlerts((p) => { const n = p.slice(); n[i] = !!st.alert; return n; });
      setDoneCount(i + 1);
      setActiveIdx(-1);
    }

    setAssembling(true);
    await sleepD(750); if (runRef.current !== myRun) return;
    setResult(ds);
    setAssembling(false);
    setPhase('dossier');
  };

  const home = () => { runRef.current++; setPhase('intake'); };
  const replay = () => { launch(); };

  return (
    <div className="imes-app" style={{ display: 'flex', flexDirection: 'column', background: 'var(--navy-900)' }}>
      <div className="imes-bg-glow" />
      <HeaderD mode={mode} onHome={home} showHome={phase !== 'intake'} />
      {phase === 'intake' && <IntakeD company={company} role={role} setCompany={setCompany} setRole={setRole} onLaunch={launch} />}
      {phase === 'running' && <RunningD activeIdx={activeIdx} doneCount={doneCount} conclusions={conclusions} alerts={alerts} journal={journal} sources={sources} sourcesTotal={sourcesTotal} assembling={assembling} arming={arming} />}
      {phase === 'dossier' && result && <Dossier data={result} mode={mode} onReplay={replay} onHome={home} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
