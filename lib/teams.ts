import { GROUP_MATCHES } from './matches';

// Derive all 48 teams from the group stage fixture list
const teamSet = new Set<string>();
for (const m of GROUP_MATCHES) {
  teamSet.add(m.home);
  teamSet.add(m.away);
}

export const ALL_TEAMS = [...teamSet].sort((a, b) => a.localeCompare(b));
