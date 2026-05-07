import type { Team } from '../model/types';
import { homeSquad, kloppAwaySquad, mouAwaySquad, pepAwaySquad } from './players';
import { DEFAULT_USER_TACTIC, TACTIC_KLOPP, TACTIC_MOU, TACTIC_PEP } from './tactics';

export const HOME_TEAM: Team = {
  id: 'team.home',
  name: 'Your Club FC',
  shortName: 'YOU',
  primaryColor: '#1f6feb',
  secondaryColor: '#ffffff',
  players: homeSquad.players,
  squad: homeSquad.squad,
  tactic: DEFAULT_USER_TACTIC,
};

export const KLOPP_TEAM: Team = {
  id: 'team.klopp',
  name: 'Pressmonster FC',
  shortName: 'PRS',
  primaryColor: '#c8102e',
  secondaryColor: '#ffffff',
  players: kloppAwaySquad.players,
  squad: kloppAwaySquad.squad,
  tactic: TACTIC_KLOPP,
};

export const MOU_TEAM: Team = {
  id: 'team.mou',
  name: 'Bus Parkers United',
  shortName: 'BUS',
  primaryColor: '#0a2351',
  secondaryColor: '#c0c0c0',
  players: mouAwaySquad.players,
  squad: mouAwaySquad.squad,
  tactic: TACTIC_MOU,
};

export const PEP_TEAM: Team = {
  id: 'team.pep',
  name: 'Posicional Athletic',
  shortName: 'POS',
  primaryColor: '#6cabdd',
  secondaryColor: '#ffffff',
  players: pepAwaySquad.players,
  squad: pepAwaySquad.squad,
  tactic: TACTIC_PEP,
};

export const OPPONENTS = [KLOPP_TEAM, MOU_TEAM, PEP_TEAM];
