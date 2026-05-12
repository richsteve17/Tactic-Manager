import { useState } from 'react';
import type { Tactic, PhaseId, Trigger } from '../model/types';
import { ALL_PHASES } from '../model/types';
import { PITCH_W, PITCH_H } from '../model/pitch';

interface Props {
  tactic: Tactic;
  onChange: (next: Tactic) => void;
}

const PHASE_LABEL: Record<PhaseId, string> = {
  ourGoalKickVsHighPress: 'Our goal kick — vs high press',
  ourGoalKickVsMidBlock:  'Our goal kick — vs mid block',
  buildOutThird:          'Build-out (our def third)',
  progression:            'Progression (mid third)',
  finalThird:             'Final third',
  theirBuildOut:          "Their build-out (we're pressing)",
  theirProgression:       "Their progression (we're set)",
  theirFinalThird:        "Their attack on us (we're defending)",
  transitionToDefend:     'Transition to defend (just lost it)',
  transitionToAttack:     'Transition to attack (just won it)',
};

const PHASE_DESC: Record<PhaseId, string> = {
  ourGoalKickVsHighPress: 'GK has the ball. They are pressing 1v1 across the back. What now?',
  ourGoalKickVsMidBlock:  'GK has the ball. They sit at midfield, inviting us out.',
  buildOutThird:          'We have it in our defensive third, no immediate pressure. How do we circulate?',
  progression:            'Mid third, our possession. How do we break the second line?',
  finalThird:             'Our possession in their third. How do we create chances?',
  theirBuildOut:          'They have it in their defensive third. Press triggers go here.',
  theirProgression:       'They have it in midfield. Where is our block? What springs the press?',
  theirFinalThird:        'They are attacking us. Block shape, depth.',
  transitionToDefend:     'We just lost the ball. Counter-press window vs reset shape.',
  transitionToAttack:     'We just won it. Vertical now, or organize first?',
};

export function PhaseEditor({ tactic, onChange }: Props) {
  const [active, setActive] = useState<PhaseId>('theirBuildOut');

  const phase = tactic.phases[active];
  const triggers = phase?.triggers ?? [];

  function removeTrigger(triggerId: string) {
    const cur = tactic.phases[active];
    if (!cur) return;
    onChange({
      ...tactic,
      phases: { ...tactic.phases, [active]: { ...cur, triggers: cur.triggers.filter(t => t.id !== triggerId) } },
    });
  }

  function addTrigger(t: Trigger) {
    const cur = tactic.phases[active];
    if (!cur) return;
    if (cur.triggers.some(x => x.id === t.id)) return;
    onChange({
      ...tactic,
      phases: { ...tactic.phases, [active]: { ...cur, triggers: [...cur.triggers, t] } },
    });
  }

  return (
    <div className="phase-editor">
      <div>
        <div className="phase-list">
          {ALL_PHASES.map(p => {
            const def = tactic.phases[p];
            const triggerCount = def?.triggers.length ?? 0;
            return (
              <button key={p}
                   className={`phase ${p === active ? 'active' : ''}`}
                   onClick={() => setActive(p)}>
                <span>{PHASE_LABEL[p]}</span>
                <span className="badge">{triggerCount} trig</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ marginTop: 0 }}>{PHASE_LABEL[active]}</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>{PHASE_DESC[active]}</p>

        {phase ? (
          <>
            <h2 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Principles</h2>
            <ul style={{ marginTop: 4 }}>
              {phase.principles.map((pr, i) => <li key={i}>{pr}</li>)}
              {phase.principles.length === 0 && <li style={{ color: 'var(--muted)' }}>—</li>}
            </ul>

            <h2 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Triggers (active in this phase)</h2>
            {triggers.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>None. Add some from the library below or play and lose.</div>}
            {triggers.map(t => (
              <div className="trigger-card" key={t.id}>
                <div className="label">{t.label}</div>
                <div className="meta">when: {whenLabel(t)} → {thenLabel(t)} · IQ-gated</div>
                <button style={{ marginTop: 6 }} onClick={() => removeTrigger(t.id)}>Remove</button>
              </div>
            ))}

            <h2 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16 }}>Trigger library — tap to add</h2>
            {LIBRARY.map(t => (
              <button className="trigger-card trigger-button" key={t.id} onClick={() => addTrigger(t)}>
                <span className="label">{t.label}</span>
                <span className="meta">when: {whenLabel(t)} → {thenLabel(t)}</span>
              </button>
            ))}

            <h2 style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16 }}>Shape preview</h2>
            <ShapeMini phase={phase} />
          </>
        ) : (
          <p style={{ color: 'var(--muted)' }}>This phase has no instructions yet. (Inheriting defaults at runtime.)</p>
        )}
      </div>
    </div>
  );
}

function whenLabel(t: Trigger): string {
  const w = t.when;
  switch (w.kind) {
    case 'ballReceivedBy':
      return `ball received by ${w.roleClass}${w.nearTouchline ? ' near touchline' : ''}${w.weakFoot ? ' on weak foot' : ''}${w.inThird ? ` in ${w.inThird} third` : ''}`;
    case 'looseTouch': return `loose touch in ${w.in} third`;
    case 'backPass':   return `back pass from ${w.from}`;
    case 'ballHeldFor': return `${w.by} holds ball >${w.minSeconds}s`;
  }
}

function thenLabel(t: Trigger): string {
  const x = t.then;
  switch (x.kind) {
    case 'press':       return `${x.who} ${x.commit} press`;
    case 'thirdManRun': return `${x.who} third-man run to ${x.toThird}${x.toHalf ? '/' + x.toHalf : ''}`;
    case 'overlap':     return `${x.who} overlaps`;
    case 'shiftLine':   return `shift ${x.line} line ${x.dx},${x.dy}`;
  }
}

function ShapeMini({ phase }: { phase: { shape: Record<string, { x: number; y: number }> } }) {
  const W = 320, H = W * (PITCH_H / PITCH_W);
  return (
    <svg className="shape-mini" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Shape preview">
      <rect x={1} y={1} width={W - 2} height={H - 2} stroke="#d6e3d8" fill="none" />
      <line x1={W / 2} y1={1} x2={W / 2} y2={H - 1} stroke="#d6e3d8" />
      <circle cx={W / 2} cy={H / 2} r={W * 0.085} stroke="#d6e3d8" fill="none" />
      {Object.entries(phase.shape).map(([role, p]) => (
        <g key={role}>
          <circle cx={(p.x / PITCH_W) * W} cy={(p.y / PITCH_H) * H} r={9} fill="#1f6feb" stroke="#0d1117" strokeWidth={1} />
          <text x={(p.x / PITCH_W) * W} y={(p.y / PITCH_H) * H + 3} textAnchor="middle" fontSize={9} fill="white">{role}</text>
        </g>
      ))}
    </svg>
  );
}

const LIBRARY: Trigger[] = [
  { id: 'lib.press.cb.weakfoot', label: 'Press the CB on weak-foot reception', when: { kind: 'ballReceivedBy', roleClass: 'cb', weakFoot: true }, then: { kind: 'press', who: 'ST', commit: 'commit' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.press.fb.touch.r', label: 'Press their LB near the touchline', when: { kind: 'ballReceivedBy', roleClass: 'fullback', nearTouchline: true }, then: { kind: 'press', who: 'RW', commit: 'commit' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.press.fb.touch.l', label: 'Press their RB near the touchline', when: { kind: 'ballReceivedBy', roleClass: 'fullback', nearTouchline: true }, then: { kind: 'press', who: 'LW', commit: 'commit' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.press.backpass', label: 'Spring on a back pass to the GK', when: { kind: 'backPass', from: 'cb' }, then: { kind: 'press', who: 'ST', commit: 'commit' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.press.hold.cm', label: 'Jump their pivot if he holds it', when: { kind: 'ballHeldFor', minSeconds: 2, by: 'cm' }, then: { kind: 'press', who: 'AM', commit: 'shadow' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.thirdman.rw', label: 'RW makes a third-man run when AM holds', when: { kind: 'ballReceivedBy', roleClass: 'cm', inThird: 'att' }, then: { kind: 'thirdManRun', who: 'RW', toThird: 'att', toHalf: 'right' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.thirdman.lw', label: 'LW makes a third-man run when AM holds', when: { kind: 'ballReceivedBy', roleClass: 'cm', inThird: 'att' }, then: { kind: 'thirdManRun', who: 'LW', toThird: 'att', toHalf: 'left' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.overlap.lb', label: 'LB overlaps on LW reception', when: { kind: 'ballReceivedBy', roleClass: 'wing', inThird: 'att' }, then: { kind: 'overlap', who: 'LB' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.overlap.rb', label: 'RB overlaps on RW reception', when: { kind: 'ballReceivedBy', roleClass: 'wing', inThird: 'att' }, then: { kind: 'overlap', who: 'RB' }, gatedBy: 'tacticalIQ' },
  { id: 'lib.loose.def', label: 'On loose touch in their def third, collapse the front line', when: { kind: 'looseTouch', in: 'def' }, then: { kind: 'press', who: 'ST', commit: 'commit' }, gatedBy: 'tacticalIQ' },
];
