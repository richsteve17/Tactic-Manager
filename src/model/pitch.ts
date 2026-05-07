// Pitch is 105m x 68m. Origin (0,0) is bottom-left from the home team's POV.
// Home team attacks toward x=PITCH_W (right). Away team attacks toward x=0.
export const PITCH_W = 105;
export const PITCH_H = 68;

export type Vec2 = { x: number; y: number };

// Coarse zones used by triggers and phase determination.
// Thirds along x; half along y.
export type ThirdX = 'def' | 'mid' | 'att';
export type HalfY = 'left' | 'right';

export interface Zone {
  third: ThirdX;
  half?: HalfY; // optional — some triggers don't care about side
}

export function zoneOf(p: Vec2, attackingRight: boolean): { third: ThirdX; half: HalfY } {
  // Always express zone from the perspective of the team in possession.
  const xRel = attackingRight ? p.x : PITCH_W - p.x;
  const third: ThirdX = xRel < PITCH_W / 3 ? 'def' : xRel < (2 * PITCH_W) / 3 ? 'mid' : 'att';
  const yRel = p.y;
  const half: HalfY = yRel < PITCH_H / 2 ? 'right' : 'left';
  return { third, half };
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampToPitch(p: Vec2): Vec2 {
  return { x: clamp(p.x, 0, PITCH_W), y: clamp(p.y, 0, PITCH_H) };
}
