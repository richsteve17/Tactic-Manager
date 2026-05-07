import type { RoleId } from '../model/types';
import type { Vec2 } from '../model/pitch';
import { PITCH_W, PITCH_H } from '../model/pitch';

// Helper: build a shape from rough x/y in [0,1] coords (attacking right).
function shape(spec: Record<RoleId, [number, number]>): Record<RoleId, Vec2> {
  const out = {} as Record<RoleId, Vec2>;
  for (const [role, [nx, ny]] of Object.entries(spec) as [RoleId, [number, number]][]) {
    out[role] = { x: nx * PITCH_W, y: ny * PITCH_H };
  }
  return out;
}

// === Common shape templates ===

// Deep, compact 4-3-3 we use when we have the ball in our own third.
export const SHAPE_BUILD_OUT = shape({
  GK:  [0.05, 0.50],
  RB:  [0.18, 0.10],
  RCB: [0.14, 0.40],
  LCB: [0.14, 0.60],
  LB:  [0.18, 0.90],
  RDM: [0.30, 0.40],
  LDM: [0.30, 0.60],
  AM:  [0.45, 0.50],
  RW:  [0.45, 0.15],
  ST:  [0.55, 0.50],
  LW:  [0.45, 0.85],
});

// Goal kick vs high press: split the CBs wide, GK steps up, fullbacks high
// — a real "play through it" shape.
export const SHAPE_GOAL_KICK_VS_PRESS = shape({
  GK:  [0.10, 0.50],
  RB:  [0.25, 0.05],
  RCB: [0.12, 0.30],
  LCB: [0.12, 0.70],
  LB:  [0.25, 0.95],
  RDM: [0.22, 0.50],
  LDM: [0.35, 0.40],
  AM:  [0.45, 0.60],
  RW:  [0.50, 0.20],
  ST:  [0.55, 0.50],
  LW:  [0.50, 0.80],
});

// Mid-third progression: a 3-2-5 / 3-box-3-style attacking shape.
export const SHAPE_PROGRESSION = shape({
  GK:  [0.10, 0.50],
  RB:  [0.55, 0.10],
  RCB: [0.30, 0.35],
  LCB: [0.30, 0.65],
  LB:  [0.40, 0.50],   // inverted
  RDM: [0.45, 0.40],
  LDM: [0.45, 0.60],
  AM:  [0.65, 0.50],
  RW:  [0.75, 0.15],
  ST:  [0.80, 0.50],
  LW:  [0.75, 0.85],
});

// Final third: width and runners.
export const SHAPE_FINAL_THIRD = shape({
  GK:  [0.15, 0.50],
  RB:  [0.65, 0.10],
  RCB: [0.40, 0.35],
  LCB: [0.40, 0.65],
  LB:  [0.65, 0.90],
  RDM: [0.55, 0.45],
  LDM: [0.55, 0.55],
  AM:  [0.78, 0.50],
  RW:  [0.88, 0.15],
  ST:  [0.92, 0.50],
  LW:  [0.88, 0.85],
});

// Defensive shapes — "we don't have the ball." Mirror conceptually:
// these are home-team positions when the opponent has the ball. The engine
// flips for the away team automatically.

// High block: press-trigger oriented, fullbacks step up.
export const SHAPE_HIGH_BLOCK = shape({
  GK:  [0.20, 0.50],
  RB:  [0.50, 0.10],
  RCB: [0.42, 0.40],
  LCB: [0.42, 0.60],
  LB:  [0.50, 0.90],
  RDM: [0.55, 0.40],
  LDM: [0.55, 0.60],
  AM:  [0.65, 0.50],
  RW:  [0.70, 0.20],
  ST:  [0.75, 0.50],
  LW:  [0.70, 0.80],
});

// Mid block: 4-4-2-style mid press.
export const SHAPE_MID_BLOCK = shape({
  GK:  [0.10, 0.50],
  RB:  [0.30, 0.12],
  RCB: [0.25, 0.40],
  LCB: [0.25, 0.60],
  LB:  [0.30, 0.88],
  RDM: [0.40, 0.35],
  LDM: [0.40, 0.65],
  AM:  [0.50, 0.50],
  RW:  [0.50, 0.20],
  ST:  [0.60, 0.50],
  LW:  [0.50, 0.80],
});

// Low block: deep, compact.
export const SHAPE_LOW_BLOCK = shape({
  GK:  [0.05, 0.50],
  RB:  [0.18, 0.18],
  RCB: [0.15, 0.42],
  LCB: [0.15, 0.58],
  LB:  [0.18, 0.82],
  RDM: [0.25, 0.40],
  LDM: [0.25, 0.60],
  AM:  [0.35, 0.50],
  RW:  [0.35, 0.25],
  ST:  [0.45, 0.50],
  LW:  [0.35, 0.75],
});
