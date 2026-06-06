import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function POST(req: NextRequest) {
  const { secret, qualifyingGroups } = await req.json();
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load all confirmed group standings
  const { rows: groupRows } = await sql`SELECT group_name, position, team FROM group_results`;
  const groups: Record<string, Record<number, string>> = {};
  for (const row of groupRows) {
    if (!groups[row.group_name as string]) groups[row.group_name as string] = {};
    groups[row.group_name as string][row.position as number] = row.team as string;
  }

  // Load third-place table if qualifying groups provided
  let thirdAssignments: Record<string, string> = {}; // matchNumber(str) → groupLetter
  if (Array.isArray(qualifyingGroups) && qualifyingGroups.length === 8) {
    const key = [...qualifyingGroups].sort().join('');
    const { rows } = await sql`
      SELECT m74, m77, m79, m80, m81, m82, m85, m87
      FROM third_place_table WHERE groups_key = ${key}
    `;
    if (rows.length > 0) {
      const r = rows[0];
      thirdAssignments = {
        '74': r.m74 as string, '77': r.m77 as string,
        '79': r.m79 as string, '80': r.m80 as string,
        '81': r.m81 as string, '82': r.m82 as string,
        '85': r.m85 as string, '87': r.m87 as string,
      };
    }
  }

  // Load R32 matches
  const { rows: r32 } = await sql`
    SELECT id, match_number, home_slot, away_slot, home_team, away_team
    FROM knockout_matches WHERE round = 'r32' ORDER BY match_number
  `;

  function resolveSlot(slot: string, matchNumber: number): string | null {
    if (slot.startsWith('1')) return groups[slot.slice(1)]?.[1] ?? null;
    if (slot.startsWith('2')) return groups[slot.slice(1)]?.[2] ?? null;
    if (slot.startsWith('3')) {
      const groupLetter = thirdAssignments[String(matchNumber)];
      return groupLetter ? (groups[groupLetter]?.[3] ?? null) : null;
    }
    return null;
  }

  const log: string[] = [];
  let filled = 0;

  for (const match of r32) {
    const num = match.match_number as number;
    const home = resolveSlot(match.home_slot as string, num);
    const away = resolveSlot(match.away_slot as string, num);

    if (home && home !== match.home_team) {
      await sql`UPDATE knockout_matches SET home_team = ${home} WHERE id = ${match.id}`;
      log.push(`M${num}: ${match.home_slot} → ${home}`);
      filled++;
    }
    if (away && away !== match.away_team) {
      await sql`UPDATE knockout_matches SET away_team = ${away} WHERE id = ${match.id}`;
      log.push(`M${num}: ${match.away_slot} → ${away}`);
      filled++;
    }
  }

  return NextResponse.json({ ok: true, filled, log });
}
