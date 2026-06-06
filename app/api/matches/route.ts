import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const { rows } = await sql`
    SELECT id, group_name, home_team, away_team, match_date, result
    FROM matches
    ORDER BY match_date ASC, group_name ASC
  `;
  return NextResponse.json(rows);
}
