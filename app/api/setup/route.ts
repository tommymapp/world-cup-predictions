import { NextResponse } from 'next/server';
import { sql, setupDb } from '@/lib/db';
import { GROUP_MATCHES } from '@/lib/matches';

export async function POST() {
  await setupDb();

  for (const m of GROUP_MATCHES) {
    await sql`
      INSERT INTO matches (group_name, home_team, away_team, match_date)
      VALUES (${m.group}, ${m.home}, ${m.away}, ${m.date})
      ON CONFLICT DO NOTHING
    `;
  }

  return NextResponse.json({ ok: true });
}
