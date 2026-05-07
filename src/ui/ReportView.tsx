import type { MatchState } from '../engine/state';
import type { PatternReport } from '../engine/report';

interface Props {
  state: MatchState;
  report: PatternReport;
}

export function ReportView({ state, report }: Props) {
  const home = state.home;
  const away = state.away;

  function nameOf(playerId: string): string {
    return [...home.players, ...away.players].find(p => p.id === playerId)?.name ?? '?';
  }
  function iqOf(playerId: string): number {
    return [...home.players, ...away.players].find(p => p.id === playerId)?.attrs.tacticalIQ ?? 0;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Match report — patterns, not ratings</h2>

      <div className="report-card">
        <h3>Final</h3>
        <div className="report-row">
          <span className="k">{home.name}</span>
          <span className="v" style={{ color: home.primaryColor }}>{report.finalScore.home}</span>
        </div>
        <div className="report-row">
          <span className="k">{away.name}</span>
          <span className="v" style={{ color: away.primaryColor }}>{report.finalScore.away}</span>
        </div>
      </div>

      <div className="report-card">
        <h3>Trigger reading</h3>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>
          Triggers fire when game state matches a tactical "if". The reactor's tactical IQ rolls
          to decide whether they actually execute. Failures become freezes (no action), gambles
          (act late) or wrong-targets (chase the wrong player).
        </p>
        <div className="report-row"><span className="k">Triggers fired (executed)</span><span className="v" style={{ color: 'var(--good)' }}>{report.triggers.fired}</span></div>
        <div className="report-row"><span className="k">— missed (frozen)</span><span className="v">{report.triggers.missedFreeze}</span></div>
        <div className="report-row"><span className="k">— missed (gambled, late)</span><span className="v">{report.triggers.missedGamble}</span></div>
        <div className="report-row"><span className="k">— missed (wrong target)</span><span className="v">{report.triggers.missedWrongTarget}</span></div>
      </div>

      <div className="report-card">
        <h3>Per-player IQ events</h3>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>
          Players with high "fired" / low "missed" are the ones executing your tactics.
          A 16-IQ kid with 10 fired / 1 missed is doing more for you than a 13-IQ veteran with 3/8.
        </p>
        {report.perPlayerIQEvents.slice(0, 12).map((row, i) => (
          <div className="report-row" key={i}>
            <span className="k">
              <span style={{ color: row.side === 'home' ? home.primaryColor : away.primaryColor, marginRight: 6 }}>●</span>
              {nameOf(row.playerId)} <span style={{ color: 'var(--muted)' }}>(IQ {iqOf(row.playerId)})</span>
            </span>
            <span className="v">
              <span style={{ color: 'var(--good)' }}>{row.fired}</span>
              {' / '}
              <span style={{ color: 'var(--bad)' }}>{row.missed}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="report-card">
        <h3>Patterns the manager should see</h3>
        <div className="report-row"><span className="k">Deep runs unfound (home)</span><span className="v">{report.unfoundRunsBySide.home}</span></div>
        <div className="report-row"><span className="k">Deep runs unfound (away)</span><span className="v">{report.unfoundRunsBySide.away}</span></div>
        <div className="report-row"><span className="k">Shots — home</span><span className="v">{report.shots.home}</span></div>
        <div className="report-row"><span className="k">Shots — away</span><span className="v">{report.shots.away}</span></div>
        <div className="report-row"><span className="k">Passes — home</span><span className="v">{report.passes.home}</span></div>
        <div className="report-row"><span className="k">Passes — away</span><span className="v">{report.passes.away}</span></div>
        <div className="report-row"><span className="k">Tackles — home</span><span className="v">{report.tackles.home}</span></div>
        <div className="report-row"><span className="k">Tackles — away</span><span className="v">{report.tackles.away}</span></div>
      </div>

      <div className="report-card">
        <h3>Notable events</h3>
        <div className="event-log" style={{ maxHeight: 300 }}>
          {report.notableEvents.map((ev, i) => {
            const min = Math.floor(ev.t / 60);
            const sec = Math.floor(ev.t % 60);
            return (
              <div className="row" key={i}>
                <span className="t">{min}'{String(sec).padStart(2, '0')}</span>
                <span>[{ev.side ?? '·'}] {ev.kind} — {ev.detail ?? ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
