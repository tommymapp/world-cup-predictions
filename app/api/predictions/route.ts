import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');
  if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 });

  const { rows } = await sql`
    SELECT match_id, prediction FROM predictions WHERE player_name = ${player}
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { player, matchId, prediction } = await req.json();
  if (!['home', 'draw', 'away'].includes(prediction)) {
    return NextResponse.json({ error: 'Invalid prediction' }, { status: 400 });
  }

  await sql`
    INSERT INTO predictions (player_name, match_id, prediction)
    VALUES (${player}, ${matchId}, ${prediction})
    ON CONFLICT (player_name, match_id)
    DO UPDATE SET prediction = ${prediction}, created_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
