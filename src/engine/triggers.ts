import type { Trigger, TriggerWhen, TriggerThen, RoleId } from '../model/types';
import type { Vec2, ThirdX } from '../model/pitch';
import { PITCH_H, PITCH_W, zoneOf } from '../model/pitch';
import type { MatchState, Side } from './state';
import { findPlayer, getPlayerState, teamOf } from './state';
import type { RNG } from '../model/rng';

type RoleClass = 'fullback' | 'cb' | 'cm' | 'gk' | 'wing' | 'striker';

// Resolve which side has possession; returns undefined if ball is not in play.
function possessor(state: MatchState): { side: Side; playerId: string } | undefined {
  if (state.ball.kind === 'inPlay') return state.ball.possessor;
  return undefined;
}

function roleClassMatches(role: RoleId, cls: RoleClass): boolean {
  switch (cls) {
    case 'fullback': return role === 'RB' || role === 'LB';
    case 'cb':       return role === 'RCB' || role === 'LCB';
    case 'cm':       return role === 'RDM' || role === 'LDM' || role === 'AM';
    case 'gk':       return role === 'GK';
    case 'wing':     return role === 'RW' || role === 'LW';
    case 'striker':  return role === 'ST';
  }
}

function nearTouchline(p: Vec2): boolean {
  return p.y < PITCH_H * 0.18 || p.y > PITCH_H * 0.82;
}

// === Trigger evaluation ===
// We treat each trigger as a check against current state. Some triggers want
// edge events (ball just received) — we synthesize "just received" by
// detecting that the ball's last-received timestamp matches this tick.

export interface TriggerHit {
  trigger: Trigger;
  // The player who should react (the "who" in `then`).
  reactorPlayerId: string;
  reactorRole: RoleId;
  reactorSide: Side;
}

export function evaluateTriggers(state: MatchState, side: Side): TriggerHit[] {
  const team = teamOf(state, side);
  const phase = state.phase[side];
  const phaseDef = team.tactic.phases[phase];
  if (!phaseDef || phaseDef.triggers.length === 0) return [];

  const hits: TriggerHit[] = [];
  for (const trig of phaseDef.triggers) {
    if (!whenFires(trig.when, state, side)) continue;
    const reactorRole = thenReactor(trig.then);
    if (!reactorRole) continue;
    const reactorPlayerId = team.squad.starters[reactorRole];
    if (!reactorPlayerId) continue;
    hits.push({ trigger: trig, reactorPlayerId, reactorRole, reactorSide: side });
  }
  return hits;
}

function whenFires(w: TriggerWhen, state: MatchState, side: Side): boolean {
  if (state.ball.kind !== 'inPlay') return false;
  const pos = possessor(state);
  if (!pos) return false;
  // Triggers in defending phases fire on opposition possession; in attacking
  // phases they fire on own possession. We let the phase gate that — a
  // defending phase only has defending triggers, so by the time we're here,
  // it's reasonable to evaluate as written.

  switch (w.kind) {
    case 'ballReceivedBy': {
      // Only fire on the tick the ball was just received — within 0.4s.
      const last = state.ball.lastReceived;
      if (!last) return false;
      if (state.simSeconds - last.at > 0.4) return false;
      const found = findPlayer(state, last.playerId);
      if (!found) return false;
      // Only fires if the receiver is on the *opposite* side to the trigger
      // owner — defending triggers care about the opponent receiving.
      // For attacking triggers (own player making a third-man run when CM
      // receives), it should be same-side. Use the trigger's `then.who` to
      // disambiguate later — for now, we permit either; the phase context
      // makes this unambiguous in practice.
      void side;
      const ps = getPlayerState(state, last.playerId);
      if (!ps) return false;
      if (!roleClassMatches(ps.role, w.roleClass)) return false;
      if (w.nearTouchline && !nearTouchline(ps.pos)) return false;
      if (w.weakFoot !== undefined) {
        const player = found.player;
        // Heuristic: ball comes from one side; weak-foot reception means
        // pass came from the player's weak side.
        // For v0.1, approximate as 35% chance the reception is "weak-foot"
        // when receiver's preferred foot is not the natural side.
        // We don't have pass origin tracked richly enough yet — accept all
        // CB receptions and downstream IQ gate handles noise.
        if (player.preferredFoot && w.weakFoot) {
          // Permissive: ~50% of CB receptions count as weak-foot triggers.
          // The IQ gate is the real filter.
        }
      }
      if (w.inThird) {
        const attackingRight = pos.side === 'home';
        const z = zoneOf(state.ball.pos, attackingRight);
        if (z.third !== w.inThird) return false;
      }
      return true;
    }
    case 'looseTouch': {
      // Approximation: ball has high velocity but a possessor — fired on
      // marginal control events. v0.1: probabilistic each tick when ball
      // velocity is high.
      if (state.ball.kind !== 'inPlay') return false;
      const speed = Math.hypot(state.ball.vel.x, state.ball.vel.y);
      if (speed < 12) return false;
      const attackingRight = pos.side === 'home';
      const z = zoneOf(state.ball.pos, attackingRight);
      // The trigger says "in their def third" — interpret as the opponent's
      // defensive third, which is the team-in-possession's attacking third.
      const target: ThirdX = w.in === 'def' ? 'att' : w.in === 'att' ? 'def' : 'mid';
      return z.third === target;
    }
    case 'backPass': {
      const last = state.ball.lastReceived;
      if (!last) return false;
      if (state.simSeconds - last.at > 0.4) return false;
      const ps = getPlayerState(state, last.playerId);
      if (!ps) return false;
      // Receiver is GK and previous touch was a same-side defender.
      return ps.role === 'GK';
    }
    case 'ballHeldFor': {
      const held = state.ballHeldBy;
      if (!held) return false;
      if (state.simSeconds - state.ballHeldSince < w.minSeconds) return false;
      const ps = getPlayerState(state, held.playerId);
      if (!ps) return false;
      if (!roleClassMatches(ps.role, w.by)) return false;
      return true;
    }
  }
}

function thenReactor(t: TriggerThen): RoleId | undefined {
  switch (t.kind) {
    case 'press':         return t.who;
    case 'thirdManRun':   return t.who;
    case 'overlap':       return t.who;
    case 'shiftLine':     return undefined;
  }
}

// === IQ gate ===
// Tactical IQ 0..20. Conversion to probability is:
//   p = 0.30 + (iq / 20) * 0.65
// So IQ 0 → 30% (always *some* chance the trigger fires by accident),
// IQ 10 → 62.5%, IQ 20 → 95%.
export function rollIQ(iq: number, rng: RNG): boolean {
  const p = 0.30 + (iq / 20) * 0.65;
  return rng.next() < p;
}

// Read failure mode: when a trigger fails, the player either:
//   - "freeze" (60% of failures): no action, trigger missed entirely
//   - "gamble" (25%): act anyway but with a delay (already-late press)
//   - "wrong-target" (15%): act on the wrong target (chase the wrong player)
export type ReadFailure = 'freeze' | 'gamble' | 'wrongTarget';
export function rollFailureMode(rng: RNG): ReadFailure {
  const r = rng.next();
  if (r < 0.60) return 'freeze';
  if (r < 0.85) return 'gamble';
  return 'wrongTarget';
}

// Apply a successful trigger: set an override on the reactor.
export function applyTrigger(state: MatchState, hit: TriggerHit): void {
  const { trigger, reactorPlayerId } = hit;
  const ps = getPlayerState(state, reactorPlayerId);
  if (!ps) return;
  const t = trigger.then;
  const now = state.simSeconds;
  switch (t.kind) {
    case 'press': {
      // Target = ball position. Override expires after 4 seconds.
      if (state.ball.kind !== 'inPlay') return;
      ps.override = {
        target: { ...state.ball.pos },
        kind: 'press',
        expiresAt: now + 4,
        note: trigger.label,
      };
      break;
    }
    case 'thirdManRun': {
      // Target = position in the named third/half on the attacking goal side.
      const attackingRight = ps.side === 'home';
      const xRel = t.toThird === 'def' ? 0.15 : t.toThird === 'mid' ? 0.55 : 0.88;
      const x = attackingRight ? xRel * PITCH_W : (1 - xRel) * PITCH_W;
      const y = t.toHalf === 'right' ? PITCH_H * 0.18 : t.toHalf === 'left' ? PITCH_H * 0.82 : PITCH_H * 0.5;
      ps.override = { target: { x, y }, kind: 'run', expiresAt: now + 5, note: trigger.label };
      break;
    }
    case 'overlap': {
      const attackingRight = ps.side === 'home';
      const x = attackingRight ? PITCH_W * 0.85 : PITCH_W * 0.15;
      const y = ps.role === 'LB' ? PITCH_H * 0.85 : PITCH_H * 0.15;
      ps.override = { target: { x, y }, kind: 'overlap', expiresAt: now + 6, note: trigger.label };
      break;
    }
    case 'shiftLine':
      // Not used for individual reactors in v0.1.
      break;
  }
}

export function applyGambledTrigger(state: MatchState, hit: TriggerHit, _rng: RNG): void {
  // Same as a successful press but it arrives 1.5s late: we delay the override
  // by setting target slightly *behind* where the ball was, simulating a
  // late commit that gets bypassed.
  const ps = getPlayerState(state, hit.reactorPlayerId);
  if (!ps) return;
  if (state.ball.kind !== 'inPlay') return;
  const stale = { ...state.ball.pos };
  ps.override = {
    target: stale,
    kind: 'press',
    expiresAt: state.simSeconds + 2.5,
    note: `LATE: ${hit.trigger.label}`,
  };
}

export function applyWrongTargetTrigger(state: MatchState, hit: TriggerHit, rng: RNG): void {
  const ps = getPlayerState(state, hit.reactorPlayerId);
  if (!ps) return;
  // Pick a random opponent that isn't the carrier as the wrong target.
  const opp = state.players.filter(p => p.side !== hit.reactorSide);
  if (opp.length === 0) return;
  const target = opp[Math.floor(rng.next() * opp.length)];
  ps.override = {
    target: { ...target.pos },
    kind: 'press',
    expiresAt: state.simSeconds + 3,
    note: `WRONG TARGET: ${hit.trigger.label}`,
  };
}
