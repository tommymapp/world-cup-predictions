import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ROUND_POINTS } from '@/lib/knockout';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function GET() {
  const { rows: scores } = await sql`
    SELECT kp.player_name, SUM(pts.points) AS knockout_points
    FROM knockout_predictions kp
    JOIN knockout_matches km ON km.id = kp.match_id
    JOIN (VALUES
      ('r32',   ${ROUND_POINTS.r32}),
      ('r16',   ${ROUND_POINTS.r16}),
      ('qf',    ${ROUND_POINTS.qf}),
      ('sf',    ${ROUND_POINTS.sf}),
      ('third', ${ROUND_POINTS.third}),
      ('final', ${ROUND_POINTS.final})
    ) AS pts(round, points) ON pts.round = km.round
    WHERE km.result IS NOT NULL AND kp.prediction = km.result
    GROUP BY kp.player_name
  `;
  return NextResponse.json({ scores });
}

export async function POST(req: NextRequest) {
  const { secret, matchId, homeTeam, awayTeam, result } = await req.json();
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (homeTeam !== undefined || awayTeam !== undefined) {
    await sql`
      UPDATE knockout_matches
      SET
        home_team = COALESCE(${homeTeam ?? null}, home_team),
        away_team = COALESCE(${awayTeam ?? null}, away_team)
      WHERE id = ${matchId}
    `;
  }

  if (result !== undefined) {
    const val = result === '' ? null : result;
    await sql`UPDATE knockout_matches SET result = ${val} WHERE id = ${matchId}`;
  }

  return NextResponse.json({ ok: true });
}
