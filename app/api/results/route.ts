import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function POST(req: NextRequest) {
  const { secret, matchId, result } = await req.json();

  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!['home', 'draw', 'away'].includes(result)) {
    return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
  }

  await sql`UPDATE matches SET result = ${result} WHERE id = ${matchId}`;
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { rows } = await sql`
    SELECT
      p.player_name,
      COUNT(*) FILTER (WHERE p.prediction = m.result) AS points,
      COUNT(*) FILTER (WHERE m.result IS NOT NULL) AS predicted_played
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    GROUP BY p.player_name
    ORDER BY points DESC, player_name ASC
  `;
  return NextResponse.json(rows);
}
