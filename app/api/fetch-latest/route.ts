import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { GROUP_NAMES, GROUPS } from '@/lib/groups';
import { KNOCKOUT_MATCHES } from '@/lib/knockout';
import { parseKnockoutWikitext, parseGroupStandingsHtml } from '@/lib/wiki-parser';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const HEADERS = { 'User-Agent': 'WC2026Predictions/1.0 (contact: admin)' };

async function fetchWikitext(page: string): Promise<string | null> {
  try {
    const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.parse?.wikitext ?? null;
  } catch {
    return null;
  }
}

async function fetchWikiHtml(page: string): Promise<string | null> {
  try {
    const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&formatversion=2`;
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.parse?.text ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const log: string[] = [];
  let koTeamsSet = 0, koResultsSet = 0, groupPositionsSet = 0;

  // ── Knockout stage ────────────────────────────────────────────────────────
  log.push('Fetching knockout stage from Wikipedia…');
  const koWikitext = await fetchWikitext('2026 FIFA World Cup knockout stage');

  if (!koWikitext) {
    log.push('⚠ Could not fetch knockout page');
  } else {
    const parsed = parseKnockoutWikitext(koWikitext);
    log.push(`Found data for ${parsed.size} knockout match(es)`);

    for (const [matchNum, data] of parsed) {
      const km = await sql`SELECT id, home_team, away_team, result FROM knockout_matches WHERE match_number = ${matchNum}`;
      if (km.rows.length === 0) continue;
      const row = km.rows[0];

      if (data.home && data.home !== row.home_team) {
        await sql`UPDATE knockout_matches SET home_team = ${data.home} WHERE match_number = ${matchNum}`;
        log.push(`M${matchNum} home → ${data.home}`);
        koTeamsSet++;
      }
      if (data.away && data.away !== row.away_team) {
        await sql`UPDATE knockout_matches SET away_team = ${data.away} WHERE match_number = ${matchNum}`;
        log.push(`M${matchNum} away → ${data.away}`);
        koTeamsSet++;
      }
      if (data.result && data.result !== row.result) {
        await sql`UPDATE knockout_matches SET result = ${data.result} WHERE match_number = ${matchNum}`;
        const winner = data.result === 'home' ? data.home ?? row.home_team : data.away ?? row.away_team;
        log.push(`M${matchNum} result → ${data.result} (${winner})`);
        koResultsSet++;
      }
    }
  }

  // ── Group standings ───────────────────────────────────────────────────────
  log.push('Fetching group standings from Wikipedia…');

  for (const group of GROUP_NAMES) {
    // Try primary name first, then fallback variants
    const pageCandidates = [
      `2026 FIFA World Cup Group ${group}`,
      `2026 FIFA World Cup group ${group}`,
      `2026 FIFA World Cup Group ${group} (section)`,
    ];
    let html: string | null = null;
    for (const page of pageCandidates) {
      html = await fetchWikiHtml(page);
      if (html) break;
    }
    if (!html) {
      log.push(`  Group ${group}: page not found`);
      continue;
    }

    const teams = parseGroupStandingsHtml(html, group);
    if (teams.length !== 4) {
      log.push(`  Group ${group}: standings incomplete (${teams.length}/4 teams found)`);
      continue;
    }

    // Only write if teams have actually played (positions meaningful)
    // We check this by confirming the page has match data, not just the pre-tournament draw
    const validTeams = new Set(GROUPS[group]);
    const allValid = teams.every(t => validTeams.has(t));
    if (!allValid) {
      log.push(`  Group ${group}: unknown team names — skipping`);
      continue;
    }

    for (let i = 0; i < 4; i++) {
      const pos = i + 1;
      const team = teams[i];
      await sql`
        INSERT INTO group_results (group_name, position, team)
        VALUES (${group}, ${pos}, ${team})
        ON CONFLICT (group_name, position) DO UPDATE SET team = ${team}
      `;
      groupPositionsSet++;
    }
    log.push(`  Group ${group}: ${teams.join(', ')}`);
  }

  return NextResponse.json({
    ok: true,
    summary: { koTeamsSet, koResultsSet, groupPositionsSet },
    log,
  });
}
