import { describe, it, expect } from 'vitest';
import { runHeadlessMatch } from '../src/engine/match';
import { HOME_TEAM, KLOPP_TEAM, MOU_TEAM } from '../src/presets/teams';
import { buildReport } from '../src/engine/report';
import { rollIQ } from '../src/engine/triggers';
import { RNG } from '../src/model/rng';

describe('engine', () => {
  it('is deterministic given a seed', () => {
    const a = runHeadlessMatch(HOME_TEAM, KLOPP_TEAM, 42);
    const b = runHeadlessMatch(HOME_TEAM, KLOPP_TEAM, 42);
    expect(a.score).toEqual(b.score);
    expect(a.events.length).toEqual(b.events.length);
  });

  it('produces phase changes during a match', () => {
    const s = runHeadlessMatch(HOME_TEAM, KLOPP_TEAM, 7);
    const phaseChanges = s.events.filter(e => e.tag === 'phaseChange');
    expect(phaseChanges.length).toBeGreaterThan(20);
  });

  it('Klopp triggers fire more than Mou triggers in the same matchup', () => {
    const klopp = runHeadlessMatch(HOME_TEAM, KLOPP_TEAM, 11);
    const mou = runHeadlessMatch(HOME_TEAM, MOU_TEAM, 11);
    const kloppFires = klopp.events.filter(e => e.tag === 'triggerFired' && e.side === 'away').length;
    const mouFires = mou.events.filter(e => e.tag === 'triggerFired' && e.side === 'away').length;
    // Klopp's tactic has triggers in nearly every defending phase; Mou has none.
    expect(kloppFires).toBeGreaterThan(mouFires);
    expect(mouFires).toBe(0);
  });

  it('match runs to completion and produces a report', () => {
    const s = runHeadlessMatch(HOME_TEAM, KLOPP_TEAM, 13);
    const r = buildReport(s);
    expect(s.simSeconds).toBeGreaterThanOrEqual(s.matchLengthSeconds);
    expect(r.passes.home + r.passes.away).toBeGreaterThan(50);
  });
});

describe('IQ gating', () => {
  it('higher IQ is more likely to pass the gate', () => {
    const rng1 = new RNG(1);
    const rng2 = new RNG(1);
    let passLow = 0, passHigh = 0;
    for (let i = 0; i < 5000; i++) {
      if (rollIQ(5, rng1)) passLow++;
      if (rollIQ(18, rng2)) passHigh++;
    }
    expect(passHigh).toBeGreaterThan(passLow);
    // IQ 5: ~46% expected. IQ 18: ~89%.
    expect(passHigh / 5000).toBeGreaterThan(0.80);
    expect(passLow / 5000).toBeLessThan(0.55);
  });
});
