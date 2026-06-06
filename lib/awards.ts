export const INDIVIDUAL_AWARDS = [
  { key: 'golden_ball',       label: 'Golden Ball',       icon: '🏆', description: 'Best player of the tournament' },
  { key: 'golden_boot',       label: 'Golden Boot',       icon: '🥾', description: 'Top scorer' },
  { key: 'golden_glove',      label: 'Golden Glove',      icon: '🧤', description: 'Best goalkeeper' },
  { key: 'best_young_player', label: 'Best Young Player', icon: '⭐', description: 'Under-21 player of the tournament' },
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

export const ALL_AWARD_KEYS = [
  ...INDIVIDUAL_AWARDS.map((a) => a.key),
  ...TEAM_POSITIONS.map((p) => p.key),
];
