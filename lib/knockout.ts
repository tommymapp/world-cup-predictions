export type Round = 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

export const ROUND_LABELS: Record<Round, string> = {
  r32:   'Round of 32',
  r16:   'Round of 16',
  qf:    'Quarter-finals',
  sf:    'Semi-finals',
  third: 'Third Place Play-off',
  final: 'Final',
};

export const ROUND_POINTS: Record<Round, number> = {
  r32:   1,
  r16:   2,
  qf:    3,
  sf:    4,
  third: 4,
  final: 5,
};

export type KnockoutMatch = {
  num: number;
  round: Round;
  homeSlot: string; // e.g. "1A", "2B", "3ABCDF", "W73", "L101"
  awaySlot: string;
};

export const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // ── Round of 32 ──────────────────────────────────────────────────────────
  // Third-place slots are from FIFA's pre-set bracket (Annex C).
  // The specific third-place teams that fill each slot depend on which 8
  // groups produce 3rd-place qualifiers — determined after all group matches.
  { num: 73,  round: 'r32',   homeSlot: '2A',       awaySlot: '2B'       },
  { num: 74,  round: 'r32',   homeSlot: '1E',       awaySlot: '3ABCDF'   },
  { num: 75,  round: 'r32',   homeSlot: '1F',       awaySlot: '2C'       },
  { num: 76,  round: 'r32',   homeSlot: '1C',       awaySlot: '2F'       },
  { num: 77,  round: 'r32',   homeSlot: '1I',       awaySlot: '3CDFGH'   },
  { num: 78,  round: 'r32',   homeSlot: '2E',       awaySlot: '2I'       },
  { num: 79,  round: 'r32',   homeSlot: '1A',       awaySlot: '3CEFHI'   },
  { num: 80,  round: 'r32',   homeSlot: '1L',       awaySlot: '3EHIJK'   },
  { num: 81,  round: 'r32',   homeSlot: '1D',       awaySlot: '3BEFIJ'   },
  { num: 82,  round: 'r32',   homeSlot: '1G',       awaySlot: '3AEHIJ'   },
  { num: 83,  round: 'r32',   homeSlot: '2K',       awaySlot: '2L'       },
  { num: 84,  round: 'r32',   homeSlot: '1H',       awaySlot: '2J'       },
  { num: 85,  round: 'r32',   homeSlot: '1B',       awaySlot: '3EFGIJ'   },
  { num: 86,  round: 'r32',   homeSlot: '1J',       awaySlot: '2H'       },
  { num: 87,  round: 'r32',   homeSlot: '1K',       awaySlot: '3DEIJL'   },
  { num: 88,  round: 'r32',   homeSlot: '2D',       awaySlot: '2G'       },

  // ── Round of 16 ──────────────────────────────────────────────────────────
  { num: 89,  round: 'r16',   homeSlot: 'W74',      awaySlot: 'W77'      },
  { num: 90,  round: 'r16',   homeSlot: 'W73',      awaySlot: 'W75'      },
  { num: 91,  round: 'r16',   homeSlot: 'W76',      awaySlot: 'W78'      },
  { num: 92,  round: 'r16',   homeSlot: 'W79',      awaySlot: 'W80'      },
  { num: 93,  round: 'r16',   homeSlot: 'W83',      awaySlot: 'W84'      },
  { num: 94,  round: 'r16',   homeSlot: 'W81',      awaySlot: 'W82'      },
  { num: 95,  round: 'r16',   homeSlot: 'W86',      awaySlot: 'W88'      },
  { num: 96,  round: 'r16',   homeSlot: 'W85',      awaySlot: 'W87'      },

  // ── Quarter-finals ────────────────────────────────────────────────────────
  { num: 97,  round: 'qf',    homeSlot: 'W89',      awaySlot: 'W90'      },
  { num: 98,  round: 'qf',    homeSlot: 'W93',      awaySlot: 'W94'      },
  { num: 99,  round: 'qf',    homeSlot: 'W91',      awaySlot: 'W92'      },
  { num: 100, round: 'qf',    homeSlot: 'W95',      awaySlot: 'W96'      },

  // ── Semi-finals ───────────────────────────────────────────────────────────
  { num: 101, round: 'sf',    homeSlot: 'W97',      awaySlot: 'W98'      },
  { num: 102, round: 'sf',    homeSlot: 'W99',      awaySlot: 'W100'     },

  // ── Third Place Play-off ──────────────────────────────────────────────────
  { num: 103, round: 'third', homeSlot: 'L101',     awaySlot: 'L102'     },

  // ── Final ─────────────────────────────────────────────────────────────────
  { num: 104, round: 'final', homeSlot: 'W101',     awaySlot: 'W102'     },
];

/** Human-readable label for a slot code */
export function slotLabel(slot: string): string {
  if (slot.startsWith('W')) return `Winner M${slot.slice(1)}`;
  if (slot.startsWith('L')) return `Loser M${slot.slice(1)}`;
  if (slot.startsWith('1')) return `Winner Group ${slot.slice(1)}`;
  if (slot.startsWith('2')) return `Runner-up Group ${slot.slice(1)}`;
  if (slot.startsWith('3')) {
    const groups = slot.slice(1).split('').join('/');
    return `Best 3rd (${groups})`;
  }
  return slot;
}
