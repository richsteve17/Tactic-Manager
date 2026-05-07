import { describe, it, expect } from 'vitest';
import { initMatch } from '../src/engine/init';
import { determinePhases } from '../src/engine/phase';
import { HOME_TEAM, KLOPP_TEAM } from '../src/presets/teams';
import { PITCH_W, PITCH_H } from '../src/model/pitch';

describe('phase determination', () => {
  it('sets transitionToDefend right after we lose the ball', () => {
    const s = initMatch(HOME_TEAM, KLOPP_TEAM);
    s.simSeconds = 100;
    s.lastLossAt.home = 99;        // we lost it 1s ago
    s.ball = {
      kind: 'inPlay',
      pos: { x: PITCH_W * 0.5, y: PITCH_H * 0.5 },
      vel: { x: 0, y: 0 },
      possessor: { side: 'away', playerId: KLOPP_TEAM.squad.starters.AM },
    };
    const phases = determinePhases(s);
    expect(phases.home).toBe('transitionToDefend');
  });

  it('sets buildOutThird when we have it in our def third with no high press', () => {
    const s = initMatch(HOME_TEAM, KLOPP_TEAM);
    s.simSeconds = 100;
    s.lastLossAt.home = 0;
    s.lastWinAt.home = 0;
    // Move all opponents to their own half so it's not coded as a high press.
    for (const p of s.players) {
      if (p.side === 'away') p.pos = { x: PITCH_W * 0.7, y: p.pos.y };
    }
    s.ball = {
      kind: 'inPlay',
      pos: { x: PITCH_W * 0.15, y: PITCH_H * 0.5 },
      vel: { x: 0, y: 0 },
      possessor: { side: 'home', playerId: HOME_TEAM.squad.starters.RCB },
    };
    const phases = determinePhases(s);
    expect(phases.home).toBe('buildOutThird');
    expect(phases.away).toBe('theirBuildOut');
  });

  it('flips to ourGoalKickVsHighPress when opponents are pressing high', () => {
    const s = initMatch(HOME_TEAM, KLOPP_TEAM);
    s.simSeconds = 100;
    // Opponents pushed up.
    for (const p of s.players) {
      if (p.side === 'away') p.pos = { x: PITCH_W * 0.25, y: p.pos.y };
    }
    s.ball = {
      kind: 'inPlay',
      pos: { x: PITCH_W * 0.1, y: PITCH_H * 0.5 },
      vel: { x: 0, y: 0 },
      possessor: { side: 'home', playerId: HOME_TEAM.squad.starters.GK },
    };
    const phases = determinePhases(s);
    expect(phases.home).toBe('ourGoalKickVsHighPress');
  });
});
