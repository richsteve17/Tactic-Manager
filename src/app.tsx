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

  const home: Team = { ...HOME_TEAM, tactic };
  const away = OPPONENTS[opponentIdx];

  return (
    <div className="app">
      <div className="topbar">
        <h1>TACTIC MANAGER · v0.1</h1>
        <div className="tabs">
          <div className={`tab ${tab === 'tactics' ? 'active' : ''}`} onClick={() => setTab('tactics')}>Tactics</div>
          <div className={`tab ${tab === 'match' ? 'active' : ''}`} onClick={() => setTab('match')}>Match</div>
        </div>
      </div>

      <div className="sidebar">
        <h2>Your tactic</h2>
        <div style={{ fontWeight: 600 }}>{tactic.name}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{tactic.formationLabel}</div>

        <h2>Opponent</h2>
        <div className="opp-pick">
          {OPPONENTS.map((opp, i) => (
            <div key={opp.id}
                 className={`opt ${i === opponentIdx ? 'active' : ''}`}
                 onClick={() => setOpponentIdx(i)}>
              <div className="name" style={{ color: opp.primaryColor }}>{opp.name}</div>
              <div className="sub">{opp.tactic.name} · {opp.tactic.formationLabel}</div>
            </div>
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
        <button className="primary" style={{ width: '100%' }} onClick={() => { setTab('match'); setMatchKey(k => k + 1); }}>
          Kickoff vs {away.shortName}
        </button>
      </div>

      <div className="main">
        {tab === 'tactics' && <PhaseEditor tactic={tactic} onChange={setTactic} />}
        {tab === 'match' && (
          <MatchView key={matchKey} home={home} away={away} onExit={() => setTab('tactics')} />
        )}
      </div>

      <div className="rightbar">
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
