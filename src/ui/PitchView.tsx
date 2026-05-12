import { useEffect, useRef } from 'react';
import type { MatchState } from '../engine/state';
import { PITCH_W, PITCH_H } from '../model/pitch';

const RENDER_W = 840;
const RENDER_H = RENDER_W * (PITCH_H / PITCH_W);

interface Props {
  state: MatchState;
}

// Renders the pitch + sprites (player tokens with shirt numbers + ball) on a canvas.
// "Sprites" in v0.1 are colored circles with shirt numbers and a thin override-ring
// that lights up when a trigger has overridden the player's behavior.
export function PitchView({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    drawPitch(ctx);
    drawState(ctx, state);
  }, [state, state.simSeconds]);

  return (
    <div className="pitch-canvas-shell">
      <canvas
        ref={canvasRef}
        width={RENDER_W}
        height={RENDER_H}
        className="pitch-canvas"
        aria-label="Live tactical pitch"
      />
    </div>
  );
}

function toScreen(x: number, y: number): { sx: number; sy: number } {
  return { sx: (x / PITCH_W) * RENDER_W, sy: (y / PITCH_H) * RENDER_H };
}

function drawPitch(ctx: CanvasRenderingContext2D) {
  const w = RENDER_W;
  const h = RENDER_H;
  // Grass with stripe texture.
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1d3a26' : '#234829';
    ctx.fillRect((i * w) / 20, 0, w / 20 + 1, h);
  }
  ctx.strokeStyle = '#d6e3d8';
  ctx.lineWidth = 2;
  // Outline.
  ctx.strokeRect(2, 2, w - 4, h - 4);
  // Halfway line.
  ctx.beginPath();
  ctx.moveTo(w / 2, 2);
  ctx.lineTo(w / 2, h - 2);
  ctx.stroke();
  // Center circle.
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.085, 0, Math.PI * 2);
  ctx.stroke();
  // Penalty boxes — 16.5m ≈ 16.5/105 of width.
  const boxW = (16.5 / PITCH_W) * w;
  const boxH = (40.32 / PITCH_H) * h;
  ctx.strokeRect(2, (h - boxH) / 2, boxW, boxH);
  ctx.strokeRect(w - 2 - boxW, (h - boxH) / 2, boxW, boxH);
  // 6-yard boxes.
  const sixW = (5.5 / PITCH_W) * w;
  const sixH = (18.32 / PITCH_H) * h;
  ctx.strokeRect(2, (h - sixH) / 2, sixW, sixH);
  ctx.strokeRect(w - 2 - sixW, (h - sixH) / 2, sixW, sixH);
}

function drawState(ctx: CanvasRenderingContext2D, state: MatchState) {
  // Players.
  for (const ps of state.players) {
    const { sx, sy } = toScreen(ps.pos.x, ps.pos.y);
    const team = ps.side === 'home' ? state.home : state.away;
    const player = team.players.find(p => p.id === ps.playerId)!;
    const r = 11;

    // Override ring (lights up when a trigger has them moving).
    if (ps.override && state.simSeconds < ps.override.expiresAt) {
      ctx.beginPath();
      ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
      const isLate = ps.override.note?.startsWith('LATE') || ps.override.note?.startsWith('WRONG');
      ctx.strokeStyle = isLate ? '#f85149' : '#ffd33d';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Shirt body.
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = team.primaryColor;
    ctx.fill();
    ctx.strokeStyle = '#0d1117';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shirt number.
    ctx.fillStyle = team.secondaryColor;
    ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(player.shirt), sx, sy + 0.5);

    // Role label below.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px -apple-system, system-ui, sans-serif';
    ctx.fillText(ps.role, sx, sy + r + 8);
  }

  // Ball.
  if (state.ball.kind === 'inPlay' || state.ball.kind === 'goal') {
    const pos = state.ball.kind === 'inPlay' ? state.ball.pos : { x: PITCH_W / 2, y: PITCH_H / 2 };
    const { sx, sy } = toScreen(pos.x, pos.y);
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0d1117';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
