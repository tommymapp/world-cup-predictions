import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');
  if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 });

  const { rows } = await sql`
    SELECT award_key, value FROM award_predictions WHERE player_name = ${player}
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { player, awardKey, value } = await req.json();
  if (!player || !awardKey) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const clean = String(value ?? '').trim().slice(0, 100);

  if (clean === '') {
    await sql`DELETE FROM award_predictions WHERE player_name = ${player} AND award_key = ${awardKey}`;
  } else {
    await sql`
      INSERT INTO award_predictions (player_name, award_key, value)
      VALUES (${player}, ${awardKey}, ${clean})
      ON CONFLICT (player_name, award_key)
      DO UPDATE SET value = ${clean}, created_at = NOW()
    `;
  }
  return NextResponse.json({ ok: true });
}
