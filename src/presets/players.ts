import type { Player, RoleId, SquadAssignment } from '../model/types';

let _id = 0;
const id = () => `p${++_id}`;

function mk(name: string, shirt: number, foot: 'L' | 'R', a: Partial<Player['attrs']>): Player {
  return {
    id: id(),
    name,
    shirt,
    preferredFoot: foot,
    attrs: {
      pace: a.pace ?? 12,
      stamina: a.stamina ?? 13,
      passing: a.passing ?? 12,
      shooting: a.shooting ?? 10,
      dribbling: a.dribbling ?? 11,
      tackling: a.tackling ?? 11,
      tacticalIQ: a.tacticalIQ ?? 12,
      composure: a.composure ?? 12,
    },
  };
}

// Two squads of 11. Stat distributions are deliberately uneven so IQ matters:
// some players have high IQ but mediocre physicals, etc.

function buildSquadHome(): { players: Player[]; squad: SquadAssignment } {
  const ps: Record<RoleId, Player> = {
    GK:  mk('Hartmann',     1, 'R', { tacticalIQ: 13, passing: 12 }),
    RB:  mk('Okafor',       2, 'R', { pace: 16, tacticalIQ: 11 }),
    RCB: mk('Vela',         4, 'R', { tackling: 16, tacticalIQ: 14, passing: 13 }),
    LCB: mk('Rønne',        5, 'L', { tackling: 15, tacticalIQ: 16, passing: 14, pace: 10 }),
    LB:  mk('Adeyemi',      3, 'L', { pace: 17, stamina: 16, tacticalIQ: 12 }),
    RDM: mk('Suarez',       6, 'R', { tackling: 14, tacticalIQ: 17, passing: 14, pace: 11 }),
    LDM: mk('Karlsson',     8, 'R', { passing: 16, tacticalIQ: 16, stamina: 17 }),
    AM:  mk('Mansur',      10, 'L', { passing: 17, dribbling: 15, tacticalIQ: 18, shooting: 14 }),
    RW:  mk('Foster',       7, 'L', { pace: 17, dribbling: 16, tacticalIQ: 13, shooting: 13 }),
    ST:  mk('Bekker',       9, 'R', { shooting: 17, pace: 15, tacticalIQ: 14, composure: 16 }),
    LW:  mk('Diop',        11, 'R', { pace: 16, dribbling: 17, tacticalIQ: 11, shooting: 12 }),
  };
  const players = Object.values(ps);
  const squad: SquadAssignment = {
    starters: Object.fromEntries(
      Object.entries(ps).map(([role, p]) => [role, p.id]),
    ) as Record<RoleId, string>,
  };
  return { players, squad };
}

function buildSquadAway(prefix: string, baseShirt = 100): { players: Player[]; squad: SquadAssignment } {
  // Slightly stronger opponent overall to keep matches competitive.
  const ps: Record<RoleId, Player> = {
    GK:  mk(`${prefix} #${baseShirt + 1}`,  baseShirt + 1,  'R', { tacticalIQ: 13 }),
    RB:  mk(`${prefix} #${baseShirt + 2}`,  baseShirt + 2,  'R', { pace: 15, tacticalIQ: 13 }),
    RCB: mk(`${prefix} #${baseShirt + 4}`,  baseShirt + 4,  'R', { tackling: 15, tacticalIQ: 14 }),
    LCB: mk(`${prefix} #${baseShirt + 5}`,  baseShirt + 5,  'L', { tackling: 15, tacticalIQ: 15 }),
    LB:  mk(`${prefix} #${baseShirt + 3}`,  baseShirt + 3,  'L', { pace: 15, tacticalIQ: 13 }),
    RDM: mk(`${prefix} #${baseShirt + 6}`,  baseShirt + 6,  'R', { tackling: 14, tacticalIQ: 16 }),
    LDM: mk(`${prefix} #${baseShirt + 8}`,  baseShirt + 8,  'R', { passing: 15, tacticalIQ: 15 }),
    AM:  mk(`${prefix} #${baseShirt + 10}`, baseShirt + 10, 'R', { passing: 16, tacticalIQ: 16, dribbling: 14 }),
    RW:  mk(`${prefix} #${baseShirt + 7}`,  baseShirt + 7,  'L', { pace: 16, dribbling: 15, tacticalIQ: 13 }),
    ST:  mk(`${prefix} #${baseShirt + 9}`,  baseShirt + 9,  'R', { shooting: 16, pace: 14, tacticalIQ: 13 }),
    LW:  mk(`${prefix} #${baseShirt + 11}`, baseShirt + 11, 'R', { pace: 16, dribbling: 15, tacticalIQ: 13 }),
  };
  const players = Object.values(ps);
  const squad: SquadAssignment = {
    starters: Object.fromEntries(
      Object.entries(ps).map(([role, p]) => [role, p.id]),
    ) as Record<RoleId, string>,
  };
  return { players, squad };
}

export const homeSquad = buildSquadHome();
export const kloppAwaySquad = buildSquadAway('LFC', 200);
export const mouAwaySquad = buildSquadAway('MOU', 300);
export const pepAwaySquad = buildSquadAway('CITY', 400);
