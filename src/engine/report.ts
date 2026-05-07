import type { MatchState, MatchEvent, Side } from './state';

// Pattern-oriented match report. Not a 6.4 rating — it shows the manager
// what *patterns* the match contained that they should care about.

export interface PatternReport {
  finalScore: { home: number; away: number };
  triggers: {
    fired: number;
    missedFreeze: number;
    missedGamble: number;
    missedWrongTarget: number;
    bySide: Record<Side, { fired: number; missed: number }>;
  };
  unfoundRuns: number;          // total deep runs not found
  unfoundRunsBySide: Record<Side, number>;
  shots: Record<Side, number>;
  passes: Record<Side, number>;
  tackles: Record<Side, number>;
  notableEvents: MatchEvent[];   // goals + first 30 trigger-related events
  perPlayerIQEvents: { playerId: string; side: Side; fired: number; missed: number }[];
}

export function buildReport(state: MatchState): PatternReport {
  const r: PatternReport = {
    finalScore: { ...state.score },
    triggers: {
      fired: 0, missedFreeze: 0, missedGamble: 0, missedWrongTarget: 0,
      bySide: { home: { fired: 0, missed: 0 }, away: { fired: 0, missed: 0 } },
    },
    unfoundRuns: 0,
    unfoundRunsBySide: { home: 0, away: 0 },
    shots: { home: 0, away: 0 },
    passes: { home: 0, away: 0 },
    tackles: { home: 0, away: 0 },
    notableEvents: [],
    perPlayerIQEvents: [],
  };

  const perPlayer = new Map<string, { side: Side; fired: number; missed: number }>();
  let triggerEventCount = 0;

  for (const ev of state.events) {
    if (ev.tag === 'triggerFired') {
      r.triggers.fired++;
      if (ev.side) r.triggers.bySide[ev.side].fired++;
      if (ev.playerId && ev.side) {
        const cur = perPlayer.get(ev.playerId) ?? { side: ev.side, fired: 0, missed: 0 };
        cur.fired++;
        perPlayer.set(ev.playerId, cur);
      }
      if (triggerEventCount++ < 30) r.notableEvents.push(ev);
    } else if (ev.tag === 'triggerMissed') {
      const det = ev.detail ?? '';
      if (det.startsWith('FREEZE')) r.triggers.missedFreeze++;
      else if (det.startsWith('GAMBLE')) r.triggers.missedGamble++;
      else if (det.startsWith('WRONGTARGET')) r.triggers.missedWrongTarget++;
      if (ev.side) r.triggers.bySide[ev.side].missed++;
      if (ev.playerId && ev.side) {
        const cur = perPlayer.get(ev.playerId) ?? { side: ev.side, fired: 0, missed: 0 };
        cur.missed++;
        perPlayer.set(ev.playerId, cur);
      }
      if (triggerEventCount++ < 30) r.notableEvents.push(ev);
    } else if (ev.tag === 'runUnfound') {
      r.unfoundRuns++;
      if (ev.side) r.unfoundRunsBySide[ev.side]++;
    } else if (ev.tag === 'shot' && ev.side) {
      r.shots[ev.side]++;
    } else if (ev.tag === 'pass' && ev.side) {
      r.passes[ev.side]++;
    } else if (ev.tag === 'tackle' && ev.side) {
      r.tackles[ev.side]++;
    } else if (ev.tag === 'goal') {
      r.notableEvents.push(ev);
    }
  }

  for (const [playerId, info] of perPlayer.entries()) {
    r.perPlayerIQEvents.push({ playerId, side: info.side, fired: info.fired, missed: info.missed });
  }
  r.perPlayerIQEvents.sort((a, b) => (b.fired + b.missed) - (a.fired + a.missed));
  return r;
}
