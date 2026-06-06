export const INDIVIDUAL_AWARDS = [
  { key: 'golden_ball',       label: 'Golden Ball',       icon: '🏆', description: 'Best player of the tournament' },
  { key: 'golden_boot',       label: 'Golden Boot',       icon: '🥾', description: 'Top scorer' },
  { key: 'golden_glove',      label: 'Golden Glove',      icon: '🧤', description: 'Best goalkeeper' },
  { key: 'best_young_player', label: 'Best Young Player', icon: '⭐', description: 'Under-21 player of the tournament' },
  { key: 'goal_of_tournament', label: 'Goal of the Tournament', icon: '🎯', description: 'Best goal of the tournament' },
];

export const TEAM_POSITIONS = [
  { key: 'team_gk',  label: 'GK' },
  { key: 'team_rb',  label: 'RB' },
  { key: 'team_cb1', label: 'CB' },
  { key: 'team_cb2', label: 'CB' },
  { key: 'team_lb',  label: 'LB' },
  { key: 'team_rm',  label: 'CM' },
  { key: 'team_cm',  label: 'CM' },
  { key: 'team_lm',  label: 'CM' },
  { key: 'team_rw',  label: 'RW' },
  { key: 'team_st',  label: 'ST' },
  { key: 'team_lw',  label: 'LW' },
];

export const FORMATIONS = [
  "4-4-2", "4-3-3", "4-2-3-1", "4-5-1",
  "3-5-2", "3-4-3", "5-3-2", "5-4-1",
  "4-1-4-1", "4-3-2-1", "4-2-2-2", "3-4-2-1",
];

export const FORMATION_KEY = "team_formation";

export const ALL_AWARD_KEYS = [
  ...INDIVIDUAL_AWARDS.map((a) => a.key),
  ...TEAM_POSITIONS.map((p) => p.key),
  FORMATION_KEY,
];
