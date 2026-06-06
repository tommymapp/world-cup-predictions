import { NextResponse } from 'next/server';
import { sql, setupDb } from '@/lib/db';
import { GROUP_MATCHES } from '@/lib/matches';
import { KNOCKOUT_MATCHES } from '@/lib/knockout';
import { parseThirdPlaceWikitext } from '@/lib/third-place';

const WIKI_API  = 'https://en.wikipedia.org/w/api.php';
const WIKI_PAGE = '2026 FIFA World Cup third-place table';

export async function POST() {
  await setupDb();

  // ── Group stage matches ────────────────────────────────────────────────────
  for (const m of GROUP_MATCHES) {
    await sql`
      INSERT INTO matches (group_name, home_team, away_team, match_date)
      VALUES (${m.group}, ${m.home}, ${m.away}, ${m.date})
      ON CONFLICT DO NOTHING
    `;
  }

  // ── Knockout match slots ───────────────────────────────────────────────────
  for (const m of KNOCKOUT_MATCHES) {
    await sql`
      INSERT INTO knockout_matches (match_number, round, home_slot, away_slot)
      VALUES (${m.num}, ${m.round}, ${m.homeSlot}, ${m.awaySlot})
      ON CONFLICT (match_number) DO NOTHING
    `;
  }

  // ── Third-place table ──────────────────────────────────────────────────────
  // Only seed if the table is empty (avoids re-fetching Wikipedia every reseed)
  const { rows: existing } = await sql`SELECT COUNT(*) AS n FROM third_place_table`;
  const alreadySeeded = parseInt(existing[0].n as string) > 0;

  let thirdPlaceRows = 0;
  let thirdPlaceError = '';

  if (!alreadySeeded) {
    try {
      const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&prop=wikitext&format=json&formatversion=2`;
      const res = await fetch(url, { headers: { 'User-Agent': 'WC2026Predictions/1.0' } });
      const json = await res.json();
      const wikitext: string = json?.parse?.wikitext ?? '';

      const table = parseThirdPlaceWikitext(wikitext);

      for (const [key, row] of table) {
        await sql`
          INSERT INTO third_place_table (groups_key, m74, m77, m79, m80, m81, m82, m85, m87)
          VALUES (
            ${key},
            ${row[74]}, ${row[77]}, ${row[79]}, ${row[80]},
            ${row[81]}, ${row[82]}, ${row[85]}, ${row[87]}
          )
          ON CONFLICT (groups_key) DO NOTHING
        `;
        thirdPlaceRows++;
      }
    } catch (e) {
      thirdPlaceError = String(e);
    }
  }

  return NextResponse.json({
    ok: true,
    thirdPlaceRows,
    thirdPlaceAlreadySeeded: alreadySeeded,
    ...(thirdPlaceError ? { thirdPlaceError } : {}),
  });
}
