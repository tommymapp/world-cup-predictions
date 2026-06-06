import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function POST(req: NextRequest) {
  const { secret, player } = await req.json();
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 });

  await Promise.all([
    sql`DELETE FROM group_predictions    WHERE player_name = ${player}`,
    sql`DELETE FROM knockout_predictions WHERE player_name = ${player}`,
    sql`DELETE FROM award_predictions    WHERE player_name = ${player}`,
  ]);

  return NextResponse.json({ ok: true });
}
