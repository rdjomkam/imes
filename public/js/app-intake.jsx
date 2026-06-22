/* IMES — Agent d'intelligence de compte commercial
   Brand atoms + intake + running view. Loaded as text/babel.
   Depends on: data.js (window.IMES_AGENT), icons.js (window.IMESIcon). */

const { useState, useRef, useEffect } = React;
const A = window.IMES_AGENT;
const Icon = window.IMESIcon;

/* ----------------------------------------------------------------- */
/* Brand atoms                                                        */
/* ----------------------------------------------------------------- */
function Wordmark({ size = 26, inverse = true }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: size * 0.2, lineHeight: 1, userSelect: 'none' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size, letterSpacing: '0.01em', color: inverse ? '#fff' : 'var(--imes-blue)' }}>IMES</span>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: size * 0.52, color: 'var(--imes-red)' }}>Consulting</span>
    </span>
  );
}

function GovBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', borderRadius: 999,
      background: 'rgba(235,34,42,0.12)', border: '1px solid rgba(235,34,42,0.45)',
      color: '#ff8a8f', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--imes-red)', boxShadow: '0 0 0 3px rgba(235,34,42,0.25)' }} />
      DÉMO · DONNÉES FICTIVES
    </span>
  );
}

function ModePill({ mode }) {
  const live = mode === 'live';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 11px', borderRadius: 999,
      background: live ? 'rgba(31,138,91,0.14)' : 'rgba(255,255,255,0.05)',
      border: '1px solid ' + (live ? 'rgba(127,227,168,0.4)' : 'rgba(255,255,255,0.14)'),
      color: live ? '#7fe3a8' : '#9fb0d0', fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      <Icon name={live ? 'zap' : 'wifi-off'} size={13} />
      {live ? 'IA en direct' : 'Repli scénarisé'}
    </span>
  );
}

function Header({ mode, onHome, showHome }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      flex: 'none', position: 'relative', zIndex: 5, gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Wordmark size={24} />
        {showHome && (
          <button onClick={onHome} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent',
            border: '1px solid rgba(255,255,255,0.16)', color: '#aeb9d2', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 6, fontFamily: 'var(--font-body)', fontSize: 13, whiteSpace: 'nowrap',
          }}>← Nouveau compte</button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ModePill mode={mode} />
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- */
/* Intake screen                                                      */
/* ----------------------------------------------------------------- */
function Intake({ company, role, setCompany, setRole, onLaunch }) {
  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: 17,
    color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.16)',
    borderRadius: 8, padding: '15px 16px', outline: 'none', transition: 'border-color .15s, box-shadow .15s',
  };
  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8ea0c2', marginBottom: 9,
  };
  const focusOn = (e) => { e.target.style.borderColor = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.12)'; };
  const focusOff = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.16)'; e.target.style.boxShadow = 'none'; };
  const submit = (e) => { e.preventDefault(); onLaunch(); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', textAlign: 'center', position: 'relative', zIndex: 2, overflowY: 'auto' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--imes-red)', marginBottom: 18 }}>
        Intelligence de compte commercial
      </span>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.04, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 16px', maxWidth: 860 }}>
        L'IA ne répond pas.<br /><span style={{ fontStyle: 'italic', fontWeight: 500, color: '#aab8d8' }}>Elle travaille de bout en bout.</span>
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.55, color: '#9fadc9', maxWidth: 620, margin: '0 0 38px' }}>
        Saisissez un compte client et la fonction d'un interlocuteur. L'agent mène son enquête, raisonne, puis produit un dossier de stratégie commerciale exploitable.
      </p>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left' }}>
        <div>
          <label style={labelStyle} htmlFor="acc">Compte client (entreprise)</label>
          <input id="acc" value={company} onChange={(e) => setCompany(e.target.value)} onFocus={focusOn} onBlur={focusOff}
            placeholder="Ex. Cimenterie du Littoral (CIMLIT)" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="fon">Interlocuteur (fonction)</label>
          <input id="fon" value={role} onChange={(e) => setRole(e.target.value)} onFocus={focusOn} onBlur={focusOff}
            placeholder="Ex. Directrice des Achats" style={fieldStyle} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, fontSize: 12.5, color: '#7587a8' }}>
            <Icon name="lock" size={13} color="#7587a8" /> Une fonction, jamais le nom d'une personne. L'agent travaille au niveau entreprise.
          </span>
        </div>
        <button type="submit" style={{
          marginTop: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 11,
          background: 'var(--imes-red)', color: '#fff', border: 'none', borderRadius: 9,
          padding: '17px 24px', fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 12px 34px rgba(235,34,42,0.32)', transition: 'transform .14s, box-shadow .14s',
        }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <Icon name="play" size={20} /> Lancer l'agent
        </button>
      </form>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Running view — pipeline rail + journal + sources                  */
/* ----------------------------------------------------------------- */
function StepRow({ meta, state, conclusion, alert }) {
  const active = state === 'active';
  const done = state === 'done';
  return (
    <div style={{
      display: 'flex', gap: 15, alignItems: 'flex-start',
      padding: '13px 15px', borderRadius: 12,
      background: active ? 'rgba(43,57,145,0.30)' : 'transparent',
      border: active ? '1px solid rgba(108,119,189,0.5)' : '1px solid transparent',
      transition: 'background .35s, border-color .35s', opacity: state === 'pending' ? 0.4 : 1,
    }}>
      <div style={{
        width: 40, height: 40, flex: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? (alert ? 'rgba(235,34,42,0.16)' : 'rgba(31,138,91,0.18)') : active ? 'var(--imes-blue)' : 'rgba(255,255,255,0.05)',
        border: '1px solid ' + (done ? (alert ? 'rgba(235,34,42,0.4)' : 'rgba(127,227,168,0.4)') : 'rgba(255,255,255,0.10)'),
        position: 'relative',
      }}>
        {done ? <Icon name="check" size={21} color={alert ? '#ff8a8f' : '#7fe3a8'} /> : <Icon name={meta.icon} size={20} color="#fff" />}
        {active && <span className="imes-pulse" style={{ position: 'absolute', inset: -4, borderRadius: 12, border: '2px solid rgba(108,119,189,0.7)' }} />}
      </div>
      <div style={{ paddingTop: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: active ? '#aab8d8' : '#6b7a98' }}>{meta.n}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: active || done ? '#fff' : '#9fadc9' }}>{meta.title}</span>
          {active && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7fe3a8' }}>en cours…</span>}
          {done && alert && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#ff8a8f', border: '1px solid rgba(235,34,42,0.4)', borderRadius: 5, padding: '1px 6px', whiteSpace: 'nowrap' }}>signal fort</span>}
        </div>
        {done && conclusion
          ? <div className="imes-fade-in" style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.45, color: alert ? '#ffb3b6' : '#9fd9bd', marginTop: 4 }}>{conclusion}</div>
          : <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#8294b4', marginTop: 3 }}>{meta.desc}</div>}
      </div>
    </div>
  );
}

function Journal({ lines }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="activity" size={15} color="#7fe3a8" />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8ea0c2' }}>Journal d'exécution</span>
      </div>
      <div ref={ref} style={{
        fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.8, color: '#c7d2e8',
        height: 218, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        {lines.map((l, i) => (
          <div key={i} className="imes-logline" style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#5f6f90', flex: 'none' }}>{l.t}</span>
            <span style={{ color: l.accent ? '#7fe3a8' : '#c7d2e8' }}>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sources({ items, total }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="globe" size={15} color="#8ea0c2" />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8ea0c2' }}>Sources consultées</span>
        {total > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#5f6f90' }}>{items.length}/{total}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((s, i) => (
          <div key={i} className="imes-fade-in" style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8,
          }}>
            <Icon name="search" size={15} color="#7fe3a8" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#e3e9f5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
          </div>
        ))}
        {items.length === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#5f6f90' }}>en attente de l'étape 02…</span>}
      </div>
    </div>
  );
}

function Running({ activeIdx, doneCount, conclusions, alerts, journal, sources, sourcesTotal, assembling, arming }) {
  const pct = (doneCount / A.STEP_META.length) * 100;
  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,0.92fr)', gap: 30, padding: '24px 30px 28px', overflow: 'hidden', position: 'relative', zIndex: 2 }}>
      {/* Left: pipeline rail */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 25, color: '#fff', margin: 0 }}>Pipeline de l'agent</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#8ea0c2' }}>{doneCount} / {A.STEP_META.length}</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--imes-blue), #7fe3a8)', borderRadius: 99, transition: 'width .5s var(--ease-out)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
          {A.STEP_META.map((m, i) => (
            <StepRow key={m.id} meta={m}
              state={i < doneCount ? 'done' : i === activeIdx ? 'active' : 'pending'}
              conclusion={conclusions[i]} alert={alerts[i]} />
          ))}
        </div>
      </div>
      {/* Right: journal + sources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'rgba(8,18,38,0.55)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '22px 24px', minHeight: 0 }}>
        <Journal lines={journal} />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <Sources items={sources} total={sourcesTotal} />
        {(assembling || arming) && (
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, color: '#7fe3a8', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <span className="imes-spin" style={{ width: 14, height: 14, border: '2px solid rgba(127,227,168,0.3)', borderTopColor: '#7fe3a8', borderRadius: '50%' }} />
            {arming ? "Connexion à l'agent · enquête en cours…" : 'Assemblage du dossier de stratégie…'}
          </div>
        )}
      </div>
    </div>
  );
}

window.IMES_PARTS = { Wordmark, GovBadge, Header, Intake, Running };
