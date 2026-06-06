import { NextResponse } from 'next/server';
import { sql, setupDb } from '@/lib/db';
import { GROUP_MATCHES } from '@/lib/matches';
import { KNOCKOUT_MATCHES } from '@/lib/knockout';

export async function POST() {
  await setupDb();

  for (const m of GROUP_MATCHES) {
    await sql`
      INSERT INTO matches (group_name, home_team, away_team, match_date)
      VALUES (${m.group}, ${m.home}, ${m.away}, ${m.date})
      ON CONFLICT DO NOTHING
    `;
  }

  for (const m of KNOCKOUT_MATCHES) {
    await sql`
      INSERT INTO knockout_matches (match_number, round, home_slot, away_slot)
      VALUES (${m.num}, ${m.round}, ${m.homeSlot}, ${m.awaySlot})
      ON CONFLICT (match_number) DO NOTHING
    `;
  }

  return NextResponse.json({ ok: true });
}
