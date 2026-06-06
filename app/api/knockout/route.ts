import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ALL_TEAMS } from '@/lib/teams';

const TEAM_SET = new Set(ALL_TEAMS);

export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');

  const { rows: matches } = await sql`
    SELECT id, match_number, round, home_slot, away_slot, home_team, away_team, result
    FROM knockout_matches
    ORDER BY match_number ASC
  `;

  if (!player) return NextResponse.json({ matches, predictions: [] });

  const { rows: predictions } = await sql`
    SELECT match_id, prediction FROM knockout_predictions WHERE player_name = ${player}
  `;

  return NextResponse.json({ matches, predictions });
}

export async function POST(req: NextRequest) {
  const { player, matchId, prediction } = await req.json();
  if (!prediction || !TEAM_SET.has(prediction)) {
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
  }
  await sql`
    INSERT INTO knockout_predictions (player_name, match_id, prediction)
    VALUES (${player}, ${matchId}, ${prediction})
    ON CONFLICT (player_name, match_id)
    DO UPDATE SET prediction = ${prediction}, created_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
