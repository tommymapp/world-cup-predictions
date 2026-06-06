import { parse as parseHtml } from 'node-html-parser';
import { GROUPS } from './groups';

// Map Wikipedia team names → our team names
const WIKI_NAMES: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Turkey': 'Türkiye',
  'DR Congo': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Democratic Republic of the Congo': 'DR Congo',
  'Republic of Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Czech Republic': 'Czechia',
  'Curacao': 'Curaçao',
  'Cape Verde Islands': 'Cape Verde',
  'Kyrgyzstan': 'Uzbekistan', // just in case
  'United States of America': 'United States',
  'USA': 'United States',
};

export function normalizeName(raw: string): string {
  // Strip wiki markup: [[Link|Label]] → Label, [[Link]] → Link, {{...}} → ''
  const s = raw
    .trim()
    .replace(/\{\{[^}]*\}\}/g, '')          // remove {{templates}}
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2') // [[Link|Label]] → Label
    .replace(/'''?/g, '')                   // remove bold/italic markers
    .replace(/\(.*?\)/g, '')               // remove parenthetical qualifiers
    .trim();
  return WIKI_NAMES[s] ?? s;
}

// ── Knockout wikitext parser ──────────────────────────────────────────────────

type KOMatchData = {
  home?: string;
  away?: string;
  result?: 'home' | 'away';
};

function isSlotDescription(s: string): boolean {
  return (
    s.includes('Group') ||
    s.includes('Winner') ||
    s.includes('Runner-up') ||
    s.includes('Loser') ||
    s.includes('{{') ||
    s.includes('<!--') ||
    s === 'TBD' ||
    s === ''
  );
}

function parseScore(scoreField: string): 'home' | 'away' | null {
  const inner = scoreField.match(/\{\{score link\|([^|]+)\|/);
  if (!inner) return null;
  const scoreStr = inner[1].trim();

  // Penalty shootout
  const pen = scoreStr.match(/\((\d+)[–\-](\d+)\)\s*p/);
  if (pen) {
    return parseInt(pen[1]) > parseInt(pen[2]) ? 'home' : 'away';
  }

  // Regular / AET score
  const main = scoreStr.match(/^(\d+)[–\-](\d+)/);
  if (main) {
    const h = parseInt(main[1]), a = parseInt(main[2]);
    if (h > a) return 'home';
    if (a > h) return 'away';
  }

  return null;
}

export function parseKnockoutWikitext(wikitext: string): Map<number, KOMatchData> {
  const results = new Map<number, KOMatchData>();

  const blockRe = /\{\{#invoke:football box\|main([\s\S]*?)\n\}\}/g;

  for (const block of wikitext.matchAll(blockRe)) {
    const content = block[1];

    const team1 = content.match(/\|\s*team1\s*=\s*([^\n|]+)/)?.[1]?.trim() ?? '';
    const team2 = content.match(/\|\s*team2\s*=\s*([^\n|]+)/)?.[1]?.trim() ?? '';
    const scoreField = content.match(/\|\s*score\s*=\s*([^\n]+)/)?.[1]?.trim() ?? '';

    const matchNumStr = scoreField.match(/Match\s+(\d+)/)?.[1];
    if (!matchNumStr) continue;
    const matchNum = parseInt(matchNumStr);
    if (matchNum < 73 || matchNum > 104) continue;

    const entry: KOMatchData = {};

    const home = normalizeName(team1);
    const away = normalizeName(team2);
    if (!isSlotDescription(home)) entry.home = home;
    if (!isSlotDescription(away)) entry.away = away;

    const result = parseScore(scoreField);
    if (result) entry.result = result;

    if (Object.keys(entry).length > 0) results.set(matchNum, entry);
  }

  return results;
}

// ── Group standings HTML parser ───────────────────────────────────────────────

export type GroupStandings = Record<string, string[]>;

export function parseGroupStandingsHtml(html: string, group: string): string[] {
  const root = parseHtml(html);
  const validTeams = new Set(GROUPS[group] ?? []);

  // Build a reverse map: any plausible Wikipedia name → our name
  const anyMatch = (raw: string): string | null => {
    const name = normalizeName(raw);
    if (validTeams.has(name)) return name;
    // Try partial match as a fallback (e.g. "Mexico national football team" → "Mexico")
    for (const t of validTeams) {
      if (name.includes(t) || t.includes(name)) return t;
    }
    return null;
  };

  const tables = root.querySelectorAll('table.wikitable');

  for (const table of tables) {
    const rows = table.querySelectorAll('tbody tr');
    const candidates: string[] = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      // Standings rows have at least Pld W D L GF GA GD Pts (8 cols) plus team name
      if (cells.length < 2) continue;

      // Try first and second cells for the team name (some tables have a flag cell first)
      let found: string | null = null;
      for (let i = 0; i < Math.min(3, cells.length) && !found; i++) {
        const cell = cells[i];
        const anchor = cell.querySelector('a');
        const raw = anchor ? anchor.text : cell.text;
        found = anyMatch(raw);
      }

      if (found && !candidates.includes(found)) candidates.push(found);
      if (candidates.length === 4) break;
    }

    if (candidates.length === 4) return candidates;
  }

  return [];
}
