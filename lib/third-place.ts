// The 8 R32 knockout match numbers that have a 3rd-place team in the away slot,
// in the order they appear as assignment columns in the Wikipedia table.
export const THIRD_PLACE_MATCH_ORDER = [74, 77, 79, 80, 81, 82, 85, 87] as const;

// Extract group letters from a slot code like "3ABCDF"
export function thirdPlaceGroups(slot: string): string[] {
  if (!slot.startsWith('3')) return [];
  return slot.slice(1).split('');
}

// Parse the Wikipedia third-place table wikitext.
// Returns: Map<sorted-groups-key, Record<matchNumber, groupLetter>>
// e.g. "EFGHIJKL" → { 74: 'E', 77: 'J', 79: 'I', 80: 'F', 81: 'H', 82: 'G', 85: 'L', 87: 'K' }
export function parseThirdPlaceWikitext(wikitext: string): Map<string, Record<number, string>> {
  const table = new Map<string, Record<number, string>>();

  // Split on row boundaries
  const rows = wikitext.split(/\|-\s*\n/);

  for (const row of rows) {
    // Flatten to one line and split on cell separators || or |
    const flat = row.replace(/\n/g, ' ');

    // All cells separated by ||
    const raw = flat.split('||').map(s =>
      s.replace(/^[|!]\s*scope="row"\s*\|\s*\d+\s*/, '')  // strip row-number header
       .replace(/^[|!]\s*rowspan="\d+"\s*\|\s*/, '')       // strip rowspan header
       .replace(/^[|!]\s*/, '')                             // strip leading | or !
       .trim()
    );

    // Find 12 consecutive group-presence cells (letters A-L either bold or blank)
    // Bold = '''X''' means that group qualifies
    let groupStart = -1;
    let qualifyingGroups: string[] = [];

    for (let i = 0; i <= raw.length - 12; i++) {
      const slice = raw.slice(i, i + 12);
      const found: string[] = [];
      let valid = true;

      for (const cell of slice) {
        const bold = cell.match(/^'''([A-L])'''$/);
        if (bold) {
          found.push(bold[1]);
        } else if (cell !== '' && cell !== '|') {
          valid = false;
          break;
        }
      }

      if (valid && found.length === 8) {
        qualifyingGroups = found;
        groupStart = i;
        break;
      }
    }

    if (qualifyingGroups.length !== 8) continue;

    // Collect 8 assignment cells after the group cells
    const assignments: string[] = [];
    for (let i = groupStart + 12; i < raw.length && assignments.length < 8; i++) {
      const m = raw[i].match(/^3([A-L])$/);
      if (m) assignments.push(m[1]);
    }

    if (assignments.length !== 8) continue;

    const key = [...qualifyingGroups].sort().join('');
    const matchMap: Record<number, string> = {};
    for (let i = 0; i < 8; i++) {
      matchMap[THIRD_PLACE_MATCH_ORDER[i]] = assignments[i];
    }

    table.set(key, matchMap);
  }

  return table;
}

// Look up which group's 3rd-place team goes to each match, given exactly 8 qualifying groups.
export function lookupThirdPlace(
  qualifyingGroups: string[],
  table: Map<string, Record<number, string>>
): Record<number, string> | null {
  if (qualifyingGroups.length !== 8) return null;
  const key = [...qualifyingGroups].sort().join('');
  return table.get(key) ?? null;
}
