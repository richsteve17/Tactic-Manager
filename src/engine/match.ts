import type { Team } from '../model/types';
import { RNG } from '../model/rng';
import type { MatchState } from './state';
import { initMatch } from './init';
import { tick } from './tick';

export function runHeadlessMatch(home: Team, away: Team, seed = 1): MatchState {
  const state = initMatch(home, away, seed);
  const rng = new RNG(seed);
  while (state.simSeconds < state.matchLengthSeconds) {
    tick(state, rng);
  }
  return state;
}

export interface LiveMatch {
  state: MatchState;
  rng: RNG;
  step(): void;
  fastForward(seconds: number): void;
}

export function startLiveMatch(home: Team, away: Team, seed = 1, matchLengthSeconds = 90 * 60): LiveMatch {
  const state = initMatch(home, away, seed, matchLengthSeconds);
  const rng = new RNG(seed);
  return {
    state,
    rng,
    step() { tick(state, rng); },
    fastForward(seconds: number) {
      const targetT = state.simSeconds + seconds;
      while (state.simSeconds < targetT && state.simSeconds < matchLengthSeconds) {
        tick(state, rng);
      }
    },
  };
}
