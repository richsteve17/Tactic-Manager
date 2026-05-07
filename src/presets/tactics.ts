import type { Tactic, Trigger, PhaseId, PhaseInstructions } from '../model/types';
import {
  SHAPE_BUILD_OUT,
  SHAPE_GOAL_KICK_VS_PRESS,
  SHAPE_PROGRESSION,
  SHAPE_FINAL_THIRD,
  SHAPE_HIGH_BLOCK,
  SHAPE_MID_BLOCK,
  SHAPE_LOW_BLOCK,
} from './shapes';

// === Reusable triggers ===

const T_PRESS_FB_TOUCHLINE: Trigger = {
  id: 't.press.fb.touch',
  label: 'Press the moment the ball travels to the fullback near the touchline',
  when: { kind: 'ballReceivedBy', roleClass: 'fullback', nearTouchline: true },
  then: { kind: 'press', who: 'RW', commit: 'commit' },
  gatedBy: 'tacticalIQ',
};

const T_PRESS_FB_TOUCHLINE_LEFT: Trigger = {
  id: 't.press.fb.touch.left',
  label: 'Press their right-back near the touchline',
  when: { kind: 'ballReceivedBy', roleClass: 'fullback', nearTouchline: true },
  then: { kind: 'press', who: 'LW', commit: 'commit' },
  gatedBy: 'tacticalIQ',
};

const T_PRESS_CB_WEAKFOOT: Trigger = {
  id: 't.press.cb.weak',
  label: 'Press the CB on weak-foot reception',
  when: { kind: 'ballReceivedBy', roleClass: 'cb', weakFoot: true },
  then: { kind: 'press', who: 'ST', commit: 'commit' },
  gatedBy: 'tacticalIQ',
};

const T_PRESS_BACKPASS: Trigger = {
  id: 't.press.backpass',
  label: 'Spring the press on a back-pass to the GK',
  when: { kind: 'backPass', from: 'cb' },
  then: { kind: 'press', who: 'ST', commit: 'commit' },
  gatedBy: 'tacticalIQ',
};

const T_PRESS_HOLD_CM: Trigger = {
  id: 't.press.hold.cm',
  label: 'If their pivot holds the ball >2s, jump him',
  when: { kind: 'ballHeldFor', minSeconds: 2, by: 'cm' },
  then: { kind: 'press', who: 'AM', commit: 'shadow' },
  gatedBy: 'tacticalIQ',
};

const T_THIRD_MAN_RUN_RW: Trigger = {
  id: 't.thirdman.rw',
  label: 'When AM holds the ball in the half-space, RW makes a third-man run in behind',
  when: { kind: 'ballReceivedBy', roleClass: 'cm', inThird: 'att' },
  then: { kind: 'thirdManRun', who: 'RW', toThird: 'att', toHalf: 'right' },
  gatedBy: 'tacticalIQ',
};

const T_OVERLAP_LB: Trigger = {
  id: 't.overlap.lb',
  label: 'LB overlaps when LW receives in the final third',
  when: { kind: 'ballReceivedBy', roleClass: 'wing', inThird: 'att' },
  then: { kind: 'overlap', who: 'LB' },
  gatedBy: 'tacticalIQ',
};

const T_LOOSE_TOUCH_DEF: Trigger = {
  id: 't.loose.def',
  label: 'On a loose touch in their def third, the front line collapses',
  when: { kind: 'looseTouch', in: 'def' },
  then: { kind: 'press', who: 'ST', commit: 'commit' },
  gatedBy: 'tacticalIQ',
};

// === The default user tactic — possession-based, balanced press ===
export const DEFAULT_USER_TACTIC: Tactic = {
  id: 'tactic.user.default',
  name: 'Possession 4-3-3',
  formationLabel: '4-3-3',
  phases: {
    ourGoalKickVsHighPress: {
      principles: ['Split the CBs wide', 'GK steps up', 'Pivot drops between the lines'],
      shape: SHAPE_GOAL_KICK_VS_PRESS,
      triggers: [],
    },
    ourGoalKickVsMidBlock: {
      principles: ['Build short, draw them out'],
      shape: SHAPE_BUILD_OUT,
      triggers: [],
    },
    buildOutThird: {
      principles: ['Calm circulation', 'Pivot is the outlet'],
      shape: SHAPE_BUILD_OUT,
      triggers: [],
    },
    progression: {
      principles: ['LB inverts', 'Find AM between the lines'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
    finalThird: {
      principles: ['Width and depth', 'Late runners from midfield'],
      shape: SHAPE_FINAL_THIRD,
      triggers: [T_THIRD_MAN_RUN_RW, T_OVERLAP_LB],
    },
    theirBuildOut: {
      principles: ['Mid-block by default', 'Spring on triggers'],
      shape: SHAPE_MID_BLOCK,
      triggers: [T_PRESS_FB_TOUCHLINE, T_PRESS_FB_TOUCHLINE_LEFT, T_PRESS_BACKPASS],
    },
    theirProgression: {
      principles: ['Stay compact', 'Force them wide'],
      shape: SHAPE_MID_BLOCK,
      triggers: [T_PRESS_HOLD_CM, T_LOOSE_TOUCH_DEF],
    },
    theirFinalThird: {
      principles: ['Drop, deny depth, block crosses'],
      shape: SHAPE_LOW_BLOCK,
      triggers: [],
    },
    transitionToDefend: {
      principles: ['Counter-press 6 seconds, then drop'],
      shape: SHAPE_MID_BLOCK,
      triggers: [],
    },
    transitionToAttack: {
      principles: ['First pass forward', 'Run the channels'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
  } satisfies Partial<Record<PhaseId, PhaseInstructions>>,
};

// === Klopp: heavy metal football. High line, aggressive triggers everywhere. ===
export const TACTIC_KLOPP: Tactic = {
  id: 'tactic.klopp',
  name: 'Gegenpress 4-3-3',
  formationLabel: '4-3-3',
  phases: {
    ourGoalKickVsHighPress: {
      principles: ['Long if pressed, second balls'],
      shape: SHAPE_GOAL_KICK_VS_PRESS,
      triggers: [],
    },
    buildOutThird: {
      principles: ['Quick verticals'],
      shape: SHAPE_BUILD_OUT,
      triggers: [],
    },
    progression: {
      principles: ['Run hard, run forward'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
    finalThird: {
      principles: ['Crosses and cutbacks'],
      shape: SHAPE_FINAL_THIRD,
      triggers: [T_OVERLAP_LB],
    },
    theirBuildOut: {
      principles: ['Press from the front, always'],
      shape: SHAPE_HIGH_BLOCK,
      triggers: [T_PRESS_FB_TOUCHLINE, T_PRESS_FB_TOUCHLINE_LEFT, T_PRESS_BACKPASS, T_PRESS_CB_WEAKFOOT],
    },
    theirProgression: {
      principles: ['Counter-press the moment we lose it'],
      shape: SHAPE_HIGH_BLOCK,
      triggers: [T_PRESS_HOLD_CM, T_LOOSE_TOUCH_DEF],
    },
    theirFinalThird: {
      principles: ['Stay aggressive, dont retreat'],
      shape: SHAPE_MID_BLOCK,
      triggers: [],
    },
    transitionToDefend: {
      principles: ['6-second counter-press rule'],
      shape: SHAPE_HIGH_BLOCK,
      triggers: [T_LOOSE_TOUCH_DEF],
    },
    transitionToAttack: {
      principles: ['Vertical, vertical, vertical'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
  },
};

// === Mourinho: 4-2-3-1 low block, two banks of four, sting on transition. ===
export const TACTIC_MOU: Tactic = {
  id: 'tactic.mou',
  name: 'Low Block 4-2-3-1',
  formationLabel: '4-2-3-1',
  phases: {
    ourGoalKickVsHighPress: {
      principles: ['Long to the striker, second ball'],
      shape: SHAPE_GOAL_KICK_VS_PRESS,
      triggers: [],
    },
    buildOutThird: {
      principles: ['Safe, no risks'],
      shape: SHAPE_BUILD_OUT,
      triggers: [],
    },
    progression: {
      principles: ['Find the wide men quickly'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
    finalThird: {
      principles: ['Limited bodies forward'],
      shape: SHAPE_FINAL_THIRD,
      triggers: [],
    },
    theirBuildOut: {
      principles: ['Drop to mid block, no chasing'],
      shape: SHAPE_MID_BLOCK,
      triggers: [],
    },
    theirProgression: {
      principles: ['Compact and patient'],
      shape: SHAPE_LOW_BLOCK,
      triggers: [],
    },
    theirFinalThird: {
      principles: ['10 men behind the ball'],
      shape: SHAPE_LOW_BLOCK,
      triggers: [],
    },
    transitionToDefend: {
      principles: ['Foul if you have to, reset shape'],
      shape: SHAPE_LOW_BLOCK,
      triggers: [],
    },
    transitionToAttack: {
      principles: ['Long ball to the striker, the wingers run'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
  },
};

// === Pep: positional play, juego de posición. Inverted FBs, suffocate them. ===
export const TACTIC_PEP: Tactic = {
  id: 'tactic.pep',
  name: 'Positional 3-2-5',
  formationLabel: '3-2-5',
  phases: {
    ourGoalKickVsHighPress: {
      principles: ['GK plays out, always'],
      shape: SHAPE_GOAL_KICK_VS_PRESS,
      triggers: [],
    },
    buildOutThird: {
      principles: ['Clean lines, third man, no rush'],
      shape: SHAPE_BUILD_OUT,
      triggers: [],
    },
    progression: {
      principles: ['LB inverts to pivot, occupy half-spaces'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
    finalThird: {
      principles: ['5 across the front, suffocate'],
      shape: SHAPE_FINAL_THIRD,
      triggers: [T_OVERLAP_LB, T_THIRD_MAN_RUN_RW],
    },
    theirBuildOut: {
      principles: ['Press by triggers, not by chasing'],
      shape: SHAPE_HIGH_BLOCK,
      triggers: [T_PRESS_FB_TOUCHLINE, T_PRESS_BACKPASS],
    },
    theirProgression: {
      principles: ['Rest defense, three-second counter-press'],
      shape: SHAPE_HIGH_BLOCK,
      triggers: [T_LOOSE_TOUCH_DEF],
    },
    theirFinalThird: {
      principles: ['Push them backward'],
      shape: SHAPE_MID_BLOCK,
      triggers: [],
    },
    transitionToDefend: {
      principles: ['5 second counter-press rule'],
      shape: SHAPE_HIGH_BLOCK,
      triggers: [T_LOOSE_TOUCH_DEF],
    },
    transitionToAttack: {
      principles: ['Pause, organize, then attack'],
      shape: SHAPE_PROGRESSION,
      triggers: [],
    },
  },
};
