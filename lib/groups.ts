import { GROUP_MATCHES } from './matches';

// Derive each group's 4 teams in fixture order
const groupMap = new Map<string, string[]>();
for (const m of GROUP_MATCHES) {
  if (!groupMap.has(m.group)) groupMap.set(m.group, []);
  const teams = groupMap.get(m.group)!;
  if (!teams.includes(m.home)) teams.push(m.home);
  if (!teams.includes(m.away)) teams.push(m.away);
}

export const GROUPS: Record<string, string[]> = Object.fromEntries(groupMap);
export const GROUP_NAMES = [...groupMap.keys()].sort();
