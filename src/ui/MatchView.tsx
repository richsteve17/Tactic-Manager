import { useEffect, useRef, useState } from 'react';
import type { Team } from '../model/types';
import type { LiveMatch } from '../engine/match';
import type { MatchEvent } from '../engine/state';
import { startLiveMatch } from '../engine/match';
import { PitchView } from './PitchView';
import { buildReport } from '../engine/report';
import { ReportView } from './ReportView';

interface Props {
  home: Team;
  away: Team;
  onExit: () => void;
}

const SPEEDS = [0, 1, 4, 16, 64];

export function MatchView({ home, away, onExit }: Props) {
  const [tickCount, setTickCount] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [done, setDone] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const liveRef = useRef<LiveMatch | null>(null);
  if (!liveRef.current) {
    liveRef.current = startLiveMatch(home, away, Date.now() & 0xffffffff);
  }

  useEffect(() => {
    let raf: number | undefined;
    let last = performance.now();
    const loop = (now: number) => {
      const dtMs = now - last;
      last = now;
      const live = liveRef.current!;
      const speed = SPEEDS[speedIdx];
      if (speed > 0 && live.state.simSeconds < live.state.matchLengthSeconds) {
        const simAdvance = (dtMs / 1000) * speed;
        live.fastForward(simAdvance);
        setTickCount(t => t + 1);
      }
      if (live.state.simSeconds >= live.state.matchLengthSeconds && !done) {
        setDone(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [speedIdx, done]);

  const live = liveRef.current!;
  const state = live.state;
  const minutes = Math.floor(state.simSeconds / 60);
  const seconds = Math.floor(state.simSeconds % 60);
  const recent = state.events.slice(-200);

  void tickCount;

  if (done) {
    return (
      <div className="match-done">
        <ReportView state={state} report={buildReport(state)} />
        <div style={{ marginTop: 12 }}>
          <button onClick={onExit}>Back to setup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-layout">
      <section className="pitch-wrap match-stage">
        <div className="pitch-meta">
          <div className="clock">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
          <div className="score" style={{ color: home.primaryColor }}>{home.shortName} {state.score.home}</div>
          <div className="score">·</div>
          <div className="score" style={{ color: away.primaryColor }}>{state.score.away} {away.shortName}</div>
          <div className="phase">
            <div>Home phase: {state.phase.home}</div>
            <div>Away phase: {state.phase.away}</div>
          </div>
        </div>
        <PitchView state={state} />
        <div className="pitch-controls">
          <button onClick={() => setSpeedIdx(0)} disabled={speedIdx === 0}>Pause</button>
          <button onClick={() => setSpeedIdx(Math.max(0, speedIdx - 1))}>−</button>
          <span className="speed-readout">×{SPEEDS[speedIdx]}</span>
          <button onClick={() => setSpeedIdx(Math.min(SPEEDS.length - 1, speedIdx + 1))}>+</button>
          <button onClick={() => { live.fastForward(60); setTickCount(t => t + 1); }}>+1 min</button>
          <button onClick={() => { live.fastForward(state.matchLengthSeconds - state.simSeconds); setTickCount(t => t + 1); }}>Skip</button>
          <button className="mobile-log-toggle" onClick={() => setShowLog(v => !v)}>{showLog ? 'Pitch' : 'Log'}</button>
          <button onClick={onExit} className="exit-button">Exit</button>
        </div>
      </section>
      <EventLog events={recent} showOnMobile={showLog} />
    </div>
  );
}

function EventLog({ events, showOnMobile }: { events: MatchEvent[]; showOnMobile: boolean }) {
  return (
    <aside className={`pitch-wrap event-panel ${showOnMobile ? 'mobile-open' : ''}`}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Live events</div>
      <div className="event-log">
        {events.slice().reverse().map((ev, i) => {
          const min = Math.floor(ev.t / 60);
          const sec = Math.floor(ev.t % 60);
          const cls =
            ev.tag === 'goal' ? 'goal'
            : ev.tag === 'triggerFired' ? 'fired'
            : ev.tag === 'triggerMissed' ? 'missed'
            : ev.tag === 'runUnfound' ? 'run'
            : ev.tag === 'phaseChange' ? 'phase'
            : '';
          return (
            <div className={`row ${cls}`} key={i}>
              <span className="t">{min}'{String(sec).padStart(2, '0')}</span>
              <span>{labelOf(ev)}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function labelOf(ev: MatchEvent): string {
  const side = ev.side ? `[${ev.side}]` : '';
  switch (ev.tag) {
    case 'goal': return `GOAL ${side} ${ev.detail ?? ''}`;
    case 'triggerFired': return `${side} ✓ ${ev.detail ?? ev.kind}`;
    case 'triggerMissed': return `${side} ✗ ${ev.detail ?? ev.kind}`;
    case 'runUnfound': return `${side} ⚐ ${ev.detail ?? 'run unfound'}`;
    case 'phaseChange': return `${side} ${ev.detail ?? ev.kind}`;
    case 'shot': return `${side} shot`;
    case 'tackle': return `${side} tackle ${ev.detail ?? ''}`;
    default: return `${side} ${ev.kind} ${ev.detail ?? ''}`;
  }
}
