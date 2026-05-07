import type { PhaseId } from '../model/types';
import { zoneOf, PITCH_W } from '../model/pitch';
import type { MatchState, Side } from './state';

// Determine the current phase for both sides from match state.
// Phases are recomputed each tick — the tactic doesn't say "we are now in
// the build-out phase", the *state* says it.
export function determinePhases(state: MatchState): { home: PhaseId; away: PhaseId } {
  const ball = state.ball;
  if (ball.kind !== 'inPlay') {
    if (ball.kind === 'goalKick') {
      const home: PhaseId = ball.forSide === 'home' ? 'ourGoalKickVsMidBlock' : 'theirBuildOut';
      const away: PhaseId = ball.forSide === 'away' ? 'ourGoalKickVsMidBlock' : 'theirBuildOut';
      return { home, away };
    }
    return { home: 'buildOutThird', away: 'theirBuildOut' };
  }

  const possessor = ball.possessor;
  if (!possessor) {
    return { home: 'transitionToDefend', away: 'transitionToDefend' };
  }

  // Recent loss/gain creates transition phases.
  const sinceHomeLoss = state.simSeconds - state.lastLossAt.home;
  const sinceAwayLoss = state.simSeconds - state.lastLossAt.away;
  const sinceHomeWin = state.simSeconds - state.lastWinAt.home;
  const sinceAwayWin = state.simSeconds - state.lastWinAt.away;

  const TRANSITION = 5; // seconds

  // We use possessor.side to determine attacking direction for zone math.
  // Home attacks right, away attacks left.
  const attackingRight = possessor.side === 'home';
  const z = zoneOf(ball.pos, attackingRight);

  let homePhase: PhaseId;
  let awayPhase: PhaseId;

  if (possessor.side === 'home') {
    if (sinceHomeWin < TRANSITION) homePhase = 'transitionToAttack';
    else if (z.third === 'def') homePhase = 'buildOutThird';
    else if (z.third === 'mid') homePhase = 'progression';
    else homePhase = 'finalThird';

    if (sinceAwayLoss < TRANSITION) awayPhase = 'transitionToDefend';
    else if (z.third === 'def') awayPhase = 'theirBuildOut';   // for them, attacking from def
    else if (z.third === 'mid') awayPhase = 'theirProgression';
    else awayPhase = 'theirFinalThird';
  } else {
    if (sinceAwayWin < TRANSITION) awayPhase = 'transitionToAttack';
    else if (z.third === 'def') awayPhase = 'buildOutThird';
    else if (z.third === 'mid') awayPhase = 'progression';
    else awayPhase = 'finalThird';

    if (sinceHomeLoss < TRANSITION) homePhase = 'transitionToDefend';
    else if (z.third === 'def') homePhase = 'theirBuildOut';
    else if (z.third === 'mid') homePhase = 'theirProgression';
    else homePhase = 'theirFinalThird';
  }

  // Special-case: ball is in our own def third and possessed by GK with foes near = "vs high press"
  if (ball.pos.x < PITCH_W * 0.2 && possessor.side === 'home') {
    const oppNear = state.players.some(p => p.side === 'away' && p.pos.x < PITCH_W * 0.35);
    if (oppNear && homePhase === 'buildOutThird') homePhase = 'ourGoalKickVsHighPress';
  }
  if (ball.pos.x > PITCH_W * 0.8 && possessor.side === 'away') {
    const oppNear = state.players.some(p => p.side === 'home' && p.pos.x > PITCH_W * 0.65);
    if (oppNear && awayPhase === 'buildOutThird') awayPhase = 'ourGoalKickVsHighPress';
  }

  return { home: homePhase, away: awayPhase };
}

export function phaseFor(state: MatchState, side: Side): PhaseId {
  return state.phase[side];
}
