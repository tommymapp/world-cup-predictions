export const INDIVIDUAL_AWARDS = [
  { key: 'golden_ball',        label: 'Golden Ball',             icon: '🏆', description: 'Best player of the tournament' },
  { key: 'golden_boot',        label: 'Golden Boot',             icon: '🥾', description: 'Top scorer' },
  { key: 'golden_glove',       label: 'Golden Glove',            icon: '🧤', description: 'Best goalkeeper' },
  { key: 'best_young_player',  label: 'Best Young Player',       icon: '⭐', description: 'Under-21 player of the tournament' },
  { key: 'goal_of_tournament', label: 'Goal of the Tournament',  icon: '🎯', description: 'Best goal of the tournament' },
];

export const FORMATIONS = [
  "4-4-2", "4-3-3", "4-2-3-1", "4-5-1",
  "3-5-2", "3-4-3", "5-3-2",   "5-4-1",
  "4-1-4-1", "4-3-2-1", "4-2-2-2", "3-4-2-1",
];

export const FORMATION_KEY = "team_formation";
export const TEAM_GK_KEY   = "team_gk";

// Each formation defines rows of position labels, ordered DEF → ... → FWD.
// 3-row formations: DEF / MID / FWD
// 4-row formations: DEF / DM  / AM  / FWD
const FORMATION_GRIDS: Record<string, string[][]> = {
  "4-4-2":   [["RB","CB","CB","LB"],           ["RM","CM","CM","LM"],            ["ST","ST"]],
  "4-3-3":   [["RB","CB","CB","LB"],           ["CM","CM","CM"],                 ["RW","ST","LW"]],
  "4-2-3-1": [["RB","CB","CB","LB"],           ["DM","DM"],     ["AM","AM","AM"],["ST"]],
  "4-5-1":   [["RB","CB","CB","LB"],           ["RM","CM","CM","CM","LM"],       ["ST"]],
  "3-5-2":   [["CB","CB","CB"],                ["RM","CM","CM","CM","LM"],       ["ST","ST"]],
  "3-4-3":   [["CB","CB","CB"],                ["RM","CM","CM","LM"],            ["RW","ST","LW"]],
  "5-3-2":   [["RWB","CB","CB","CB","LWB"],    ["CM","CM","CM"],                 ["ST","ST"]],
  "5-4-1":   [["RWB","CB","CB","CB","LWB"],    ["RM","CM","CM","LM"],            ["ST"]],
  "4-1-4-1": [["RB","CB","CB","LB"],           ["DM"],          ["RM","CM","CM","LM"],["ST"]],
  "4-3-2-1": [["RB","CB","CB","LB"],           ["CM","CM","CM"],["AM","AM"],     ["ST"]],
  "4-2-2-2": [["RB","CB","CB","LB"],           ["DM","DM"],     ["AM","AM"],     ["ST","ST"]],
  "3-4-2-1": [["CB","CB","CB"],                ["RM","CM","CM","LM"],["AM","AM"],["ST"]],
};

// Row → key prefix mapping.
// 3-row: row0=d, row1=m, row2=f
// 4-row: row0=d, row1=m (DM), row2=a (AM), row3=f
function rowPrefix(rowIndex: number, totalRows: number): string {
  if (rowIndex === 0)            return "d";
  if (rowIndex === totalRows - 1) return "f";
  if (totalRows === 3)           return "m";
  return rowIndex === 1 ? "m" : "a";
}

export type FormationSlot = { key: string; label: string };

export function getFormationLayout(formation: string): FormationSlot[][] {
  const grid = FORMATION_GRIDS[formation];
  if (!grid) return [];
  return grid.map((labels, rowIndex) =>
    labels.map((label, slotIndex) => ({
      key: `team_${rowPrefix(rowIndex, grid.length)}${slotIndex + 1}`,
      label,
    }))
  );
}

export const ALL_AWARD_KEYS = [
  ...INDIVIDUAL_AWARDS.map((a) => a.key),
  TEAM_GK_KEY,
  ...[1,2,3,4,5].map(n => `team_d${n}`),
  ...[1,2,3,4,5].map(n => `team_m${n}`),
  ...[1,2,3,4].map(n => `team_a${n}`),
  ...[1,2,3].map(n => `team_f${n}`),
  FORMATION_KEY,
];
