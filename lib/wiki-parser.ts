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
  'Republic of Congo': 'DR Congo',
};

export function normalizeName(raw: string): string {
  const s = raw.trim().replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1'); // strip wiki links
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
    s === 'TBD' ||
    s === ''
  );
}

function parseScore(scoreField: string): 'home' | 'away' | null {
  // {{score link|2–1|Match 73}} or {{score link|1–1 (a.e.t.) 4–2 p|Match 73}}
  // First param before | is the actual score string
  const inner = scoreField.match(/\{\{score link\|([^|]+)\|/);
  if (!inner) return null;
  const scoreStr = inner[1].trim();

  // Penalty shootout — decide on pen score, not 90-min score
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

  // Each match block: {{#invoke:football box|main ... }}
  const blockRe = /\{\{#invoke:football box\|main([\s\S]*?)\n\}\}/g;

  for (const block of wikitext.matchAll(blockRe)) {
    const content = block[1];

    const team1 = content.match(/\|\s*team1\s*=\s*([^\n|]+)/)?.[1]?.trim() ?? '';
    const team2 = content.match(/\|\s*team2\s*=\s*([^\n|]+)/)?.[1]?.trim() ?? '';
    const scoreField = content.match(/\|\s*score\s*=\s*([^\n]+)/)?.[1]?.trim() ?? '';

    // Match number lives inside the score link: {{score link|...|Match 73}}
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

export type GroupStandings = Record<string, string[]>; // group → [1st, 2nd, 3rd, 4th]

// Fetch and parse a single group's Wikipedia page for final standings.
// Returns teams in position order [1st, 2nd, 3rd, 4th], or [] if unavailable.
export function parseGroupStandingsHtml(html: string, group: string): string[] {
  const root = parseHtml(html);
  const validTeams = new Set(GROUPS[group] ?? []);
  const teams: string[] = [];

  // Group tables on Wikipedia are class="wikitable"
  // Team names are in the first <td> of each row, inside an <a> or directly
  const tables = root.querySelectorAll('table.wikitable');

  for (const table of tables) {
    const rows = table.querySelectorAll('tbody tr');
    const candidates: string[] = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 8) continue; // standings rows have Pld W D L GF GA GD Pts

      const firstCell = cells[0];
      // Team name is in an <a> tag or plain text
      const anchor = firstCell.querySelector('a');
      const raw = anchor ? anchor.text : firstCell.text;
      const name = normalizeName(raw.replace(/\(.*\)/, '').trim());

      if (validTeams.has(name)) candidates.push(name);
    }

    if (candidates.length === 4) {
      return candidates; // already in standings order (Wikipedia renders top-down)
    }
  }

  return teams;
}
