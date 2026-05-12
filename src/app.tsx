import { useState } from 'react';
import type { Tactic, Team } from './model/types';
import { HOME_TEAM, OPPONENTS } from './presets/teams';
import { PhaseEditor } from './ui/PhaseEditor';
import { MatchView } from './ui/MatchView';

type Tab = 'tactics' | 'match';

export function App() {
  const [tab, setTab] = useState<Tab>('tactics');
  const [tactic, setTactic] = useState<Tactic>(HOME_TEAM.tactic);
  const [opponentIdx, setOpponentIdx] = useState(0);
  const [matchKey, setMatchKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<'setup' | 'squad'>('setup');

  const home: Team = { ...HOME_TEAM, tactic };
  const away = OPPONENTS[opponentIdx];

  function kickoff() {
    setTab('match');
    setMatchKey(k => k + 1);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>TACTIC MANAGER · v0.1</h1>
        <nav className="tabs" aria-label="Main view">
          <button className={`tab ${tab === 'tactics' ? 'active' : ''}`} onClick={() => setTab('tactics')}>Tactics</button>
          <button className={`tab ${tab === 'match' ? 'active' : ''}`} onClick={() => setTab('match')}>Match</button>
        </nav>
      </header>

      <aside className={`sidebar mobile-${mobilePanel === 'setup' ? 'open' : 'closed'}`}>
        <h2>Your tactic</h2>
        <div style={{ fontWeight: 600 }}>{tactic.name}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{tactic.formationLabel}</div>

        <h2>Opponent</h2>
        <div className="opp-pick">
          {OPPONENTS.map((opp, i) => (
            <button key={opp.id}
                 className={`opt ${i === opponentIdx ? 'active' : ''}`}
                 onClick={() => setOpponentIdx(i)}>
              <span className="name" style={{ color: opp.primaryColor }}>{opp.name}</span>
              <span className="sub">{opp.tactic.name} · {opp.tactic.formationLabel}</span>
            </button>
          ))}
        </div>

        <h2>How it works</h2>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Tactics are organized by <b>phase</b>, not formation. Each phase carries
          shape and <b>triggers</b>. When a trigger fires, the responsible player
          <b> rolls their tactical IQ</b> to decide whether they execute.
          A frozen, gambled or wrong-targeted read is a <b>real cost</b>.
        </div>

        <h2>Run a match</h2>
        <button className="primary kickoff-button" onClick={kickoff}>
          Kickoff vs {away.shortName}
        </button>
      </aside>

      <main className="main">
        {tab === 'tactics' && <PhaseEditor tactic={tactic} onChange={setTactic} />}
        {tab === 'match' && (
          <MatchView key={matchKey} home={home} away={away} onExit={() => setTab('tactics')} />
        )}
      </main>

      <aside className={`rightbar mobile-${mobilePanel === 'squad' ? 'open' : 'closed'}`}>
        <h2 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, margin: 0 }}>Squad</h2>
        <div style={{ fontSize: 12, marginTop: 8 }}>
          {home.players.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #21262d' }}>
              <span><span style={{ color: 'var(--muted)' }}>#{p.shirt}</span> {p.name}</span>
              <span style={{ fontFamily: 'monospace' }}>
                <span title="Tactical IQ" style={{ color: iqColor(p.attrs.tacticalIQ) }}>IQ {p.attrs.tacticalIQ}</span>
              </span>
            </div>
          ))}
        </div>
      </aside>

      <div className="mobile-dock" aria-label="Mobile panels">
        <button className={mobilePanel === 'setup' ? 'active' : ''} onClick={() => setMobilePanel('setup')}>Setup</button>
        <button className={tab === 'match' ? 'active' : ''} onClick={kickoff}>Kickoff</button>
        <button className={mobilePanel === 'squad' ? 'active' : ''} onClick={() => setMobilePanel('squad')}>Squad</button>
      </div>
    </div>
  );
}

function iqColor(iq: number): string {
  if (iq >= 16) return '#2ea043';
  if (iq >= 13) return '#79c0ff';
  if (iq >= 10) return '#d29922';
  return '#f85149';
}
