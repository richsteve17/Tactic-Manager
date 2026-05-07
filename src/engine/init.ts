import type { Team, RoleId } from '../model/types';
import { ALL_ROLES } from '../model/types';
import type { Vec2 } from '../model/pitch';
import { PITCH_W, PITCH_H } from '../model/pitch';
import type { MatchState, PlayerState, Side } from './state';
import { SHAPE_BUILD_OUT } from '../presets/shapes';

// For away side, mirror x (they attack toward x=0).
function mirrorForAway(p: Vec2): Vec2 {
  return { x: PITCH_W - p.x, y: PITCH_H - p.y };
}

function buildPlayerStates(team: Team, side: Side): PlayerState[] {
  const out: PlayerState[] = [];
  for (const role of ALL_ROLES) {
    const playerId = team.squad.starters[role];
    if (!playerId) continue;
    let pos = SHAPE_BUILD_OUT[role];
    if (side === 'away') pos = mirrorForAway(pos);
    out.push({
      playerId,
      side,
      role: role as RoleId,
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      stamina: 1,
    });
  }
  return out;
}

export function initMatch(home: Team, away: Team, seed = 1, matchLengthSeconds = 90 * 60): MatchState {
  const players = [...buildPlayerStates(home, 'home'), ...buildPlayerStates(away, 'away')];
  return {
    seed,
    simSeconds: 0,
    tickCount: 0,
    matchLengthSeconds,
    home,
    away,
    players,
    ball: { kind: 'kickoff', forSide: 'home', at: 0 },
    score: { home: 0, away: 0 },
    phase: { home: 'buildOutThird', away: 'theirBuildOut' },
    events: [],
    lastLossAt: { home: -1000, away: -1000 },
    lastWinAt: { home: -1000, away: -1000 },
    ballHeldSince: 0,
  };
}
