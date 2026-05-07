import type { Vec2, ThirdX, HalfY } from './pitch';

// === Roles ===
// 11 slots, identified by a stable id. Role labels are display-only;
// the engine doesn't care if you call something a "Mezzala" — it cares
// where the role stands in each phase and which triggers it owns.
export type RoleId =
  | 'GK'
  | 'RB' | 'RCB' | 'LCB' | 'LB'
  | 'RDM' | 'LDM' | 'AM'
  | 'RW' | 'ST' | 'LW';

export const ALL_ROLES: RoleId[] = [
  'GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'AM', 'RW', 'ST', 'LW',
];

// === Phases ===
// Phases are the unit of tactical authoring. Shape and triggers live INSIDE
// a phase. The current phase is recomputed every tick from match state.
export type PhaseId =
  | 'ourGoalKickVsHighPress'
  | 'ourGoalKickVsMidBlock'
  | 'buildOutThird'         // we have ball in our def third, opp not pressing high
  | 'progression'           // we have ball in mid third
  | 'finalThird'            // we have ball in att third
  | 'theirBuildOut'         // they have ball in their def third
  | 'theirProgression'      // they have ball in mid third
  | 'theirFinalThird'       // they have ball in their att third (we're defending deep)
  | 'transitionToDefend'    // we just lost the ball (<3s)
  | 'transitionToAttack';   // we just won the ball (<3s)

export const ALL_PHASES: PhaseId[] = [
  'ourGoalKickVsHighPress',
  'ourGoalKickVsMidBlock',
  'buildOutThird',
  'progression',
  'finalThird',
  'theirBuildOut',
  'theirProgression',
  'theirFinalThird',
  'transitionToDefend',
  'transitionToAttack',
];

// === Triggers ===
// "When X happens, role Y does Z, gated by their tactical IQ."
// The engine evaluates triggers each tick and rolls IQ for execution.

export type TriggerWhen =
  | { kind: 'ballReceivedBy'; roleClass: 'fullback' | 'cb' | 'cm' | 'gk' | 'wing' | 'striker'; weakFoot?: boolean; inThird?: ThirdX; nearTouchline?: boolean }
  | { kind: 'looseTouch'; in: ThirdX }
  | { kind: 'backPass'; from: 'cb' | 'cm' | 'fullback' }
  | { kind: 'ballHeldFor'; minSeconds: number; by: 'cb' | 'cm' | 'gk' };

export type TriggerThen =
  | { kind: 'press'; who: RoleId; commit: 'shadow' | 'commit' }
  | { kind: 'shiftLine'; line: 'def' | 'mid' | 'fwd'; dx: number; dy: number }
  | { kind: 'thirdManRun'; who: RoleId; toThird: ThirdX; toHalf?: HalfY }
  | { kind: 'overlap'; who: RoleId };

export interface Trigger {
  id: string;
  label: string;          // human readable
  when: TriggerWhen;
  then: TriggerThen;
  // gatedBy is implicit (tactical IQ) for v0.1; left as a field for extension.
  gatedBy: 'tacticalIQ';
}

// === Phase instructions ===
// A phase carries: a base shape (where each role stands) and the triggers
// active in that phase. Shape positions are in pitch coords, attacking right.
export interface PhaseInstructions {
  principles: string[];                       // free text, advisory
  shape: Record<RoleId, Vec2>;                // base position per role
  triggers: Trigger[];                        // active when this phase is current
  defensiveLineY?: number;                    // optional vertical compactness hint
}

// === Tactic ===
export interface Tactic {
  id: string;
  name: string;
  // Baseline formation is a derived view but useful as a fallback / display.
  formationLabel: string;
  // Not every phase needs a definition — missing phases inherit from a default.
  phases: Partial<Record<PhaseId, PhaseInstructions>>;
}

// === Players ===
export interface Attributes {
  // Physical
  pace: number;       // 0-20
  stamina: number;
  // Technical
  passing: number;
  shooting: number;
  dribbling: number;
  tackling: number;
  // Mental — the load-bearing one
  tacticalIQ: number; // 0-20: probability of correctly reading + executing triggers
  composure: number;
}

export interface Player {
  id: string;
  name: string;
  shirt: number;
  attrs: Attributes;
  preferredFoot: 'L' | 'R';
}

export interface SquadAssignment {
  // role → playerId
  starters: Record<RoleId, string>;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  players: Player[];
  squad: SquadAssignment;
  tactic: Tactic;
}
