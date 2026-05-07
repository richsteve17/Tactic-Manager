import type { Vec2 } from '../model/pitch';
import { PITCH_W, PITCH_H, dist, clampToPitch } from '../model/pitch';
import { RNG } from '../model/rng';
import type { MatchState, PlayerState, Side, MatchEvent } from './state';
import { getPlayerState, teamOf } from './state';
import { determinePhases } from './phase';
import {
  evaluateTriggers, rollIQ, rollFailureMode,
  applyTrigger, applyGambledTrigger, applyWrongTargetTrigger,
} from './triggers';
import type { RoleId } from '../model/types';

export const TICK_DT = 0.1; // 10 Hz

// === Steering ===
function moveToward(p: PlayerState, target: Vec2, topSpeed: number, dt: number): void {
  const dx = target.x - p.pos.x;
  const dy = target.y - p.pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) {
    p.vel.x = 0;
    p.vel.y = 0;
    return;
  }
  const desired = topSpeed;
  // Stamina linearly drops top speed by up to 30%.
  const speed = Math.min(d / dt, desired * (0.7 + 0.3 * p.stamina));
  p.vel.x = (dx / d) * speed;
  p.vel.y = (dy / d) * speed;
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  const c = clampToPitch(p.pos);
  p.pos.x = c.x; p.pos.y = c.y;
}

function topSpeedOf(p: PlayerState, state: MatchState): number {
  const team = teamOf(state, p.side);
  const player = team.players.find(x => x.id === p.playerId)!;
  // pace 12 ≈ 6 m/s, scale linearly. Real top sprint ≈ 9 m/s.
  return 3 + (player.attrs.pace / 20) * 6;
}

// === Phase shape target ===
function shapeTargetFor(p: PlayerState, state: MatchState): Vec2 {
  const team = teamOf(state, p.side);
  const phaseId = state.phase[p.side];
  const phase = team.tactic.phases[phaseId] ?? team.tactic.phases.buildOutThird;
  if (!phase) return p.pos;
  const base = phase.shape[p.role];
  // Mirror for away side (they attack toward x=0).
  if (p.side === 'away') {
    return { x: PITCH_W - base.x, y: PITCH_H - base.y };
  }
  return { ...base };
}

// === Ball update ===
function updateBall(state: MatchState, rng: RNG): MatchEvent[] {
  const events: MatchEvent[] = [];
  const ball = state.ball;
  if (ball.kind === 'kickoff') {
    // Place the ball at center, give it to the kicking side's AM.
    const team = teamOf(state, ball.forSide);
    const amId = team.squad.starters.AM;
    state.ball = {
      kind: 'inPlay',
      pos: { x: PITCH_W / 2, y: PITCH_H / 2 },
      vel: { x: 0, y: 0 },
      possessor: { side: ball.forSide, playerId: amId },
      lastTouchSide: ball.forSide,
      lastReceived: { playerId: amId, at: state.simSeconds },
    };
    state.ballHeldBy = state.ball.possessor;
    state.ballHeldSince = state.simSeconds;
    state.ballLooseSince = undefined;
    events.push({ t: state.simSeconds, kind: 'kickoff', side: ball.forSide, tag: 'phaseChange' });
    return events;
  }
  if (ball.kind === 'goalKick') {
    // GK takes it; place at 6-yard, give to GK, in play.
    const team = teamOf(state, ball.forSide);
    const gkId = team.squad.starters.GK;
    const gkState = getPlayerState(state, gkId)!;
    const gkPos = ball.forSide === 'home' ? { x: 5, y: PITCH_H / 2 } : { x: PITCH_W - 5, y: PITCH_H / 2 };
    gkState.pos = { ...gkPos };
    state.ball = {
      kind: 'inPlay',
      pos: { ...gkPos },
      vel: { x: 0, y: 0 },
      possessor: { side: ball.forSide, playerId: gkId },
      lastTouchSide: ball.forSide,
      lastReceived: { playerId: gkId, at: state.simSeconds },
    };
    state.ballHeldBy = state.ball.possessor;
    state.ballHeldSince = state.simSeconds;
    return events;
  }
  if (ball.kind === 'goal') {
    // After a brief delay, reset to kickoff for the conceding side.
    if (state.simSeconds >= ball.resumeAt) {
      const conceding: import('./state').Side = ball.scoredBy === 'home' ? 'away' : 'home';
      // Reset all players to their build-out shape positions.
      for (const ps of state.players) {
        const team = teamOf(state, ps.side);
        const phase = team.tactic.phases.buildOutThird;
        if (phase) {
          const base = phase.shape[ps.role];
          if (ps.side === 'away') {
            ps.pos = { x: PITCH_W - base.x, y: PITCH_H - base.y };
          } else {
            ps.pos = { ...base };
          }
        }
        ps.vel = { x: 0, y: 0 };
        ps.override = undefined;
      }
      state.ball = { kind: 'kickoff', forSide: conceding, at: state.simSeconds };
      state.ballHeldBy = undefined;
      state.ballLooseSince = undefined;
    }
    return events;
  }

  // In play.
  if (!ball.possessor) {
    if (state.ballLooseSince === undefined) state.ballLooseSince = state.simSeconds;
    // Ball is loose — drift, decay velocity, nearest player picks it up.
    ball.pos.x += ball.vel.x * TICK_DT;
    ball.pos.y += ball.vel.y * TICK_DT;
    ball.vel.x *= 0.92; ball.vel.y *= 0.92;
    const c = clampToPitch(ball.pos);
    ball.pos.x = c.x; ball.pos.y = c.y;
    // Pickup: nearest player within 2m takes it.
    // Watchdog: if loose >2s, the closest player picks up regardless of distance.
    let nearest: PlayerState | undefined;
    let nd = Infinity;
    for (const ps of state.players) {
      const d = dist(ps.pos, ball.pos);
      if (d < nd) { nd = d; nearest = ps; }
    }
    const looseFor = state.simSeconds - (state.ballLooseSince ?? state.simSeconds);
    const pickupRadius = looseFor > 2 ? Infinity : 2.0;
    if (nearest && nd < pickupRadius) {
      const prevSide = ball.lastTouchSide;
      ball.possessor = { side: nearest.side, playerId: nearest.playerId };
      ball.lastTouchSide = nearest.side;
      ball.lastReceived = { playerId: nearest.playerId, at: state.simSeconds };
      ball.vel = { x: 0, y: 0 };
      state.ballHeldBy = ball.possessor;
      state.ballHeldSince = state.simSeconds;
      state.ballLooseSince = undefined;
      if (prevSide && prevSide !== nearest.side) {
        state.lastWinAt[nearest.side] = state.simSeconds;
        state.lastLossAt[prevSide] = state.simSeconds;
        events.push({ t: state.simSeconds, kind: 'turnover', side: nearest.side, tag: 'tackle', detail: 'won loose ball' });
      }
    }
    return events;
  }

  // Ball is carried. The possessor decides whether to pass/dribble/shoot.
  const carrier = getPlayerState(state, ball.possessor.playerId)!;
  // Carry the ball with the player, slightly ahead.
  ball.pos.x = carrier.pos.x;
  ball.pos.y = carrier.pos.y;
  ball.vel = { x: 0, y: 0 };

  // Decision frequency: ~once per 0.8s (every 8 ticks).
  if (state.tickCount % 8 !== 0) return events;

  const decision = decideAction(state, carrier, rng);
  if (decision.kind === 'pass') {
    return executePass(state, carrier, decision.targetId, rng);
  }
  if (decision.kind === 'shoot') {
    return executeShot(state, carrier, rng);
  }
  // Dribble: carrier overrides their target toward goal for ~0.7s.
  const attackingRight = carrier.side === 'home';
  const goalX = attackingRight ? PITCH_W - 5 : 5;
  carrier.override = {
    target: { x: goalX, y: carrier.pos.y + (rng.next() - 0.5) * 6 },
    kind: 'run',
    expiresAt: state.simSeconds + 0.7,
    note: 'dribble',
  };
  return events;
}

type Action =
  | { kind: 'dribble' }
  | { kind: 'pass'; targetId: string }
  | { kind: 'shoot' };

function decideAction(state: MatchState, carrier: PlayerState, rng: RNG): Action {
  const team = teamOf(state, carrier.side);
  const player = team.players.find(p => p.id === carrier.playerId)!;
  const attackingRight = carrier.side === 'home';
  const xRel = attackingRight ? carrier.pos.x : PITCH_W - carrier.pos.x;
  const distToGoal = attackingRight
    ? Math.hypot(PITCH_W - carrier.pos.x, PITCH_H / 2 - carrier.pos.y)
    : Math.hypot(carrier.pos.x, PITCH_H / 2 - carrier.pos.y);

  // Shoot if close to goal and a forward role and the player decides to.
  // Real football: ~10-15 shots per team per match. We're at 6750 decisions
  // per match, so a per-decision shot probability of ~0.002 produces a
  // realistic shot count.
  const isForward = carrier.role === 'ST' || carrier.role === 'RW' || carrier.role === 'LW' || carrier.role === 'AM';
  if (isForward && distToGoal < 18 && rng.chance(0.02 + (player.attrs.shooting / 20) * 0.05)) {
    return { kind: 'shoot' };
  }

  // Pressure check: if a foe is within 2.5m, prefer passing fast.
  let pressed = false;
  for (const opp of state.players) {
    if (opp.side === carrier.side) continue;
    if (dist(opp.pos, carrier.pos) < 2.5) { pressed = true; break; }
  }

  // Pass probability: higher when pressed; higher with passing skill.
  const passP = (pressed ? 0.85 : 0.55) + (player.attrs.passing / 20) * 0.10;
  if (!rng.chance(passP)) return { kind: 'dribble' };

  // Pick a target: prefer attacking direction, prefer open teammates.
  const teammates = state.players.filter(p => p.side === carrier.side && p.playerId !== carrier.playerId);
  let best: { p: PlayerState; score: number } | undefined;
  for (const tm of teammates) {
    const dxAttack = attackingRight ? (tm.pos.x - carrier.pos.x) : (carrier.pos.x - tm.pos.x);
    let score = dxAttack;                            // forward bias
    score -= dist(tm.pos, carrier.pos) * 0.05;       // very long passes slightly disfavored
    // Penalty if a defender is close to the receiver.
    for (const opp of state.players) {
      if (opp.side === carrier.side) continue;
      const od = dist(opp.pos, tm.pos);
      if (od < 3) score -= (3 - od) * 4;
    }
    // Add IQ-modulated noise — high-IQ carriers pick better.
    score += (rng.next() - 0.5) * (20 - player.attrs.tacticalIQ) * 0.8;
    if (!best || score > best.score) best = { p: tm, score };
  }
  void xRel;
  if (!best) return { kind: 'dribble' };
  return { kind: 'pass', targetId: best.p.playerId };
}

function executePass(state: MatchState, carrier: PlayerState, targetId: string, rng: RNG): MatchEvent[] {
  const events: MatchEvent[] = [];
  const ball = state.ball;
  if (ball.kind !== 'inPlay') return events;
  const target = getPlayerState(state, targetId);
  if (!target) return events;
  const team = teamOf(state, carrier.side);
  const carrierPlayer = team.players.find(p => p.id === carrier.playerId)!;

  // Ball travels from carrier to target. Speed ~ 18 m/s.
  const dx = target.pos.x - carrier.pos.x;
  const dy = target.pos.y - carrier.pos.y;
  const d = Math.hypot(dx, dy);
  const speed = 18;
  ball.vel = { x: (dx / d) * speed, y: (dy / d) * speed };
  ball.possessor = undefined;

  // Pass success roll. Influenced by passing attribute, distance, pressure.
  const distFactor = Math.max(0, 1 - d / 50);
  let pressFactor = 1;
  for (const opp of state.players) {
    if (opp.side === carrier.side) continue;
    // Defender close to the passing line reduces success.
    const distToLine = perpDistanceToSegment(opp.pos, carrier.pos, target.pos);
    if (distToLine < 2.5) pressFactor -= 0.15;
  }
  pressFactor = Math.max(0.3, pressFactor);
  const success = 0.55 + (carrierPlayer.attrs.passing / 20) * 0.4 * distFactor * pressFactor;
  ball.lastTouchSide = carrier.side;
  events.push({ t: state.simSeconds, kind: 'pass', side: carrier.side, playerId: carrier.playerId, tag: 'pass', detail: `→ #${targetPlayerShirt(state, target)}` });

  if (rng.chance(success)) {
    // Schedule the pass to land on target. Fast-forward by setting
    // possessor to target now (simplification — visualization will lerp).
    ball.possessor = { side: target.side, playerId: target.playerId };
    ball.lastReceived = { playerId: target.playerId, at: state.simSeconds + d / speed };
    state.ballHeldBy = ball.possessor;
    state.ballHeldSince = state.simSeconds;
    // The ball position will track the target via the carrier-update path next tick.
  } else {
    // Pass fails: ball becomes loose at the target's vicinity with deviation.
    const stray = { x: target.pos.x + rng.range(-3, 3), y: target.pos.y + rng.range(-3, 3) };
    ball.pos = clampToPitch(stray);
    ball.vel = { x: rng.range(-3, 3), y: rng.range(-3, 3) };
    ball.lastReceived = undefined;
    state.ballHeldBy = undefined;
  }
  return events;
}

function targetPlayerShirt(state: MatchState, p: PlayerState): number {
  const team = teamOf(state, p.side);
  const player = team.players.find(x => x.id === p.playerId);
  return player?.shirt ?? 0;
}

function perpDistanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function executeShot(state: MatchState, carrier: PlayerState, rng: RNG): MatchEvent[] {
  const events: MatchEvent[] = [];
  const ball = state.ball;
  if (ball.kind !== 'inPlay') return events;
  const team = teamOf(state, carrier.side);
  const carrierPlayer = team.players.find(p => p.id === carrier.playerId)!;
  const opp: Side = carrier.side === 'home' ? 'away' : 'home';
  const oppTeam = teamOf(state, opp);
  const gkId = oppTeam.squad.starters.GK;
  const gk = oppTeam.players.find(p => p.id === gkId)!;

  const distToGoal = carrier.side === 'home'
    ? Math.hypot(PITCH_W - carrier.pos.x, PITCH_H / 2 - carrier.pos.y)
    : Math.hypot(carrier.pos.x, PITCH_H / 2 - carrier.pos.y);

  // ~10% conversion target. Cap goalP at 0.20 even for great chances.
  const shotQ = (carrierPlayer.attrs.shooting / 20) * 0.20 + Math.max(0, (18 - distToGoal) / 18) * 0.18;
  const gkQ = (gk.attrs.tacticalIQ / 20) * 0.12 + 0.55;
  const goalP = Math.max(0.01, Math.min(0.20, shotQ - gkQ + 0.40));

  events.push({ t: state.simSeconds, kind: 'shot', side: carrier.side, playerId: carrier.playerId, tag: 'shot' });
  if (rng.chance(goalP)) {
    state.score[carrier.side]++;
    state.ball = { kind: 'goal', scoredBy: carrier.side, at: state.simSeconds, resumeAt: state.simSeconds + 3 };
    events.push({ t: state.simSeconds, kind: 'goal', side: carrier.side, playerId: carrier.playerId, tag: 'goal', detail: `Score ${state.score.home}-${state.score.away}` });
  } else {
    // Goal kick to defending side.
    state.ball = { kind: 'goalKick', forSide: opp, at: state.simSeconds + 2 };
    state.ballHeldBy = undefined;
  }
  return events;
}

// === Defensive interception (foes near the ball can win it) ===
function tryInterception(state: MatchState, rng: RNG): MatchEvent[] {
  const events: MatchEvent[] = [];
  const ball = state.ball;
  if (ball.kind !== 'inPlay' || !ball.possessor) return events;
  const carrier = getPlayerState(state, ball.possessor.playerId);
  if (!carrier) return events;
  const team = teamOf(state, carrier.side);
  const carrierPlayer = team.players.find(p => p.id === carrier.playerId)!;
  for (const opp of state.players) {
    if (opp.side === carrier.side) continue;
    if (dist(opp.pos, carrier.pos) > 1.6) continue;
    const oppTeam = teamOf(state, opp.side);
    const oppPlayer = oppTeam.players.find(p => p.id === opp.playerId)!;
    // Tackle roll: tackler's tackling vs carrier's dribbling.
    const tackleP = 0.05 + (oppPlayer.attrs.tackling / 20) * 0.15 - (carrierPlayer.attrs.dribbling / 20) * 0.12;
    if (rng.chance(Math.max(0.02, tackleP))) {
      const prevSide = carrier.side;
      ball.possessor = { side: opp.side, playerId: opp.playerId };
      ball.lastTouchSide = opp.side;
      ball.lastReceived = { playerId: opp.playerId, at: state.simSeconds };
      state.ballHeldBy = ball.possessor;
      state.ballHeldSince = state.simSeconds;
      state.lastWinAt[opp.side] = state.simSeconds;
      state.lastLossAt[prevSide] = state.simSeconds;
      events.push({ t: state.simSeconds, kind: 'tackle', side: opp.side, playerId: opp.playerId, tag: 'tackle' });
      break;
    }
  }
  return events;
}

// === Pattern detection: deep runs unfound ===
function detectUnfoundRuns(state: MatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  const ball = state.ball;
  if (ball.kind !== 'inPlay' || !ball.possessor) return events;
  // Once every ~5 seconds.
  if (state.tickCount % 50 !== 0) return events;
  const possessorSide = ball.possessor.side;
  const attackingRight = possessorSide === 'home';
  for (const ps of state.players) {
    if (ps.side !== possessorSide) continue;
    if (ps.role !== 'ST' && ps.role !== 'RW' && ps.role !== 'LW') continue;
    const xRel = attackingRight ? ps.pos.x : PITCH_W - ps.pos.x;
    if (xRel < PITCH_W * 0.7) continue;
    // Are there 0 defenders in front? Then it's a deep run that wasn't found.
    const defendersInFront = state.players.filter(d => d.side !== possessorSide && (attackingRight ? d.pos.x > ps.pos.x : d.pos.x < ps.pos.x)).length;
    if (defendersInFront <= 1) {
      events.push({ t: state.simSeconds, kind: 'runUnfound', side: ps.side, playerId: ps.playerId, tag: 'runUnfound', detail: `${ps.role} unfound in att third` });
    }
  }
  return events;
}

// === Main tick ===
export function tick(state: MatchState, rng: RNG): void {
  // 1. Update phase.
  const newPhase = determinePhases(state);
  if (newPhase.home !== state.phase.home) {
    state.events.push({ t: state.simSeconds, kind: 'phase', side: 'home', detail: `${state.phase.home} → ${newPhase.home}`, tag: 'phaseChange' });
  }
  if (newPhase.away !== state.phase.away) {
    state.events.push({ t: state.simSeconds, kind: 'phase', side: 'away', detail: `${state.phase.away} → ${newPhase.away}`, tag: 'phaseChange' });
  }
  state.phase = newPhase;

  // 2. Evaluate triggers for both sides; gate by IQ; apply.
  for (const side of ['home', 'away'] as const) {
    const hits = evaluateTriggers(state, side);
    for (const hit of hits) {
      const team = teamOf(state, side);
      const player = team.players.find(p => p.id === hit.reactorPlayerId)!;
      const passed = rollIQ(player.attrs.tacticalIQ, rng);
      if (passed) {
        applyTrigger(state, hit);
        state.events.push({ t: state.simSeconds, kind: 'trigger', side, playerId: player.id, tag: 'triggerFired', detail: hit.trigger.label });
      } else {
        const fail = rollFailureMode(rng);
        if (fail === 'gamble') applyGambledTrigger(state, hit, rng);
        else if (fail === 'wrongTarget') applyWrongTargetTrigger(state, hit, rng);
        // freeze: do nothing.
        state.events.push({ t: state.simSeconds, kind: 'trigger-missed', side, playerId: player.id, tag: 'triggerMissed', detail: `${fail.toUpperCase()}: ${hit.trigger.label}` });
      }
    }
  }

  // 3. Move players. Override target trumps shape target.
  // When the ball is loose, the two closest players per side chase it.
  const looseChasers = looseBallChasers(state);
  for (const ps of state.players) {
    let target: Vec2;
    if (looseChasers.has(ps.playerId) && state.ball.kind === 'inPlay') {
      target = { ...state.ball.pos };
    } else if (ps.override && state.simSeconds < ps.override.expiresAt) {
      // For a press override, refresh target to current ball position (chase).
      if (ps.override.kind === 'press' && state.ball.kind === 'inPlay') {
        ps.override.target = { ...state.ball.pos };
      }
      target = ps.override.target;
    } else {
      ps.override = undefined;
      target = shapeTargetFor(ps, state);
    }
    moveToward(ps, target, topSpeedOf(ps, state), TICK_DT);
    // Stamina drain: 0.0001 per tick for everyone, more for runners with high vel.
    const v = Math.hypot(ps.vel.x, ps.vel.y);
    ps.stamina = Math.max(0.5, ps.stamina - (0.000005 + v * 0.000003));
  }

  // 4. Update the ball.
  state.events.push(...updateBall(state, rng));

  // 5. Possible interceptions.
  state.events.push(...tryInterception(state, rng));

  // 6. Pattern detection.
  state.events.push(...detectUnfoundRuns(state));

  // 7. Advance time.
  state.tickCount++;
  state.simSeconds = state.tickCount * TICK_DT;
}

// When the ball is loose, the two closest players per side (excluding GK
// unless they are very close) pursue it. Returns the set of playerIds that
// should override their movement target to the ball this tick.
function looseBallChasers(state: MatchState): Set<string> {
  const out = new Set<string>();
  const ball = state.ball;
  if (ball.kind !== 'inPlay') return out;
  if (ball.possessor) return out;
  for (const side of ['home', 'away'] as const) {
    const candidates = state.players
      .filter(p => p.side === side && p.role !== 'GK')
      .map(p => ({ p, d: dist(p.pos, ball.pos) }))
      .sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(2, candidates.length); i++) {
      out.add(candidates[i].p.playerId);
    }
  }
  return out;
}

// Convenience: role helper for outsiders.
export function _roles(): RoleId[] {
  return ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'AM', 'RW', 'ST', 'LW'];
}
