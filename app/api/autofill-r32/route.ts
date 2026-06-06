import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load all confirmed group standings
  const { rows: groupRows } = await sql`
    SELECT group_name, position, team FROM group_results
  `;
  const groups: Record<string, Record<number, string>> = {};
  for (const row of groupRows) {
    if (!groups[row.group_name as string]) groups[row.group_name as string] = {};
    groups[row.group_name as string][row.position as number] = row.team as string;
  }

  // Load R32 matches
  const { rows: r32 } = await sql`
    SELECT id, match_number, home_slot, away_slot, home_team, away_team
    FROM knockout_matches WHERE round = 'r32' ORDER BY match_number
  `;

  function resolveSlot(slot: string): string | null {
    if (slot.startsWith('1')) return groups[slot.slice(1)]?.[1] ?? null;
    if (slot.startsWith('2')) return groups[slot.slice(1)]?.[2] ?? null;
    return null; // 3rd-place slots left for manual entry
  }

  const log: string[] = [];
  let filled = 0;

  for (const match of r32) {
    const homeSlot = match.home_slot as string;
    const awaySlot = match.away_slot as string;
    const home = resolveSlot(homeSlot);
    const away = resolveSlot(awaySlot);

    if (home && home !== match.home_team) {
      await sql`UPDATE knockout_matches SET home_team = ${home} WHERE id = ${match.id}`;
      log.push(`M${match.match_number}: ${homeSlot} → ${home}`);
      filled++;
    }
    if (away && away !== match.away_team) {
      await sql`UPDATE knockout_matches SET away_team = ${away} WHERE id = ${match.id}`;
      log.push(`M${match.match_number}: ${awaySlot} → ${away}`);
      filled++;
    }
  }

  return NextResponse.json({ ok: true, filled, log });
}
