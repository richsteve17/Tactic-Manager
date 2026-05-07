import type { Player, RoleId, Team, PhaseId } from '../model/types';
import type { Vec2 } from '../model/pitch';

export type Side = 'home' | 'away';

// Per-player live state.
export interface PlayerState {
  playerId: string;
  side: Side;
  role: RoleId;
  pos: Vec2;
  vel: Vec2;
  // Override target imposed by an active trigger (e.g. "press carrier", "make a run").
  // Cleared when the trigger's intent expires.
  override?: {
    target: Vec2;
    kind: 'press' | 'run' | 'overlap' | 'shift';
    expiresAt: number; // simSeconds
    note?: string;
  };
  // Stamina drain over the match — affects steering top speed late on.
  stamina: number; // 0..1
}

export type BallState =
  | { kind: 'inPlay'; pos: Vec2; vel: Vec2; possessor?: { side: Side; playerId: string }; lastTouchSide?: Side; lastReceived?: { playerId: string; at: number } }
  | { kind: 'goalKick'; forSide: Side; at: number }
  | { kind: 'goal'; scoredBy: Side; at: number; resumeAt: number }
  | { kind: 'kickoff'; forSide: Side; at: number };

export interface MatchEvent {
  t: number;            // sim seconds
  kind: string;
  side?: Side;
  playerId?: string;
  detail?: string;
  // For pattern report
  tag?: 'triggerFired' | 'triggerMissed' | 'pass' | 'tackle' | 'shot' | 'goal' | 'phaseChange' | 'runUnfound';
}

export interface MatchState {
  seed: number;
  simSeconds: number;
  tickCount: number;
  matchLengthSeconds: number;
  home: Team;
  away: Team;
  players: PlayerState[];          // 22 entries
  ball: BallState;
  score: { home: number; away: number };
  phase: { home: PhaseId; away: PhaseId };
  events: MatchEvent[];
  lastLossAt: { home: number; away: number };
  lastWinAt: { home: number; away: number };
  ballHeldSince: number;           // simSeconds
  ballHeldBy?: { side: Side; playerId: string };
  ballLooseSince?: number;         // simSeconds
}

export function findPlayer(state: MatchState, playerId: string): { player: Player; side: Side } | undefined {
  for (const side of ['home', 'away'] as const) {
    const team = side === 'home' ? state.home : state.away;
    const p = team.players.find(x => x.id === playerId);
    if (p) return { player: p, side };
  }
  return undefined;
}

export function getPlayerState(state: MatchState, playerId: string): PlayerState | undefined {
  return state.players.find(p => p.playerId === playerId);
}

export function teamOf(state: MatchState, side: Side): Team {
  return side === 'home' ? state.home : state.away;
}
