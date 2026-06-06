import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ROUND_POINTS } from '@/lib/knockout';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function GET() {
  const { rows: scores } = await sql`
    SELECT kp.player_name,
           SUM(CASE
             WHEN km.result = 'home' AND kp.prediction = km.home_team THEN pts.points
             WHEN km.result = 'away' AND kp.prediction = km.away_team THEN pts.points
             ELSE 0
           END) AS knockout_points
    FROM knockout_predictions kp
    JOIN knockout_matches km ON km.id = kp.match_id
    JOIN (VALUES
      ('r32',   ${ROUND_POINTS.r32}::int),
      ('r16',   ${ROUND_POINTS.r16}::int),
      ('qf',    ${ROUND_POINTS.qf}::int),
      ('sf',    ${ROUND_POINTS.sf}::int),
      ('third', ${ROUND_POINTS.third}::int),
      ('final', ${ROUND_POINTS.final}::int)
    ) AS pts(round, points) ON pts.round = km.round
    WHERE km.result IS NOT NULL
    GROUP BY kp.player_name
    HAVING SUM(CASE
      WHEN km.result = 'home' AND kp.prediction = km.home_team THEN pts.points
      WHEN km.result = 'away' AND kp.prediction = km.away_team THEN pts.points
      ELSE 0
    END) > 0
  `;
  return NextResponse.json({ scores });
}

export async function POST(req: NextRequest) {
  const { secret, matchId, homeTeam, awayTeam, result } = await req.json();
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (homeTeam !== undefined && awayTeam !== undefined) {
    await sql`UPDATE knockout_matches SET home_team = ${homeTeam ?? null}, away_team = ${awayTeam ?? null} WHERE id = ${matchId}`;
  } else if (homeTeam !== undefined) {
    await sql`UPDATE knockout_matches SET home_team = ${homeTeam ?? null} WHERE id = ${matchId}`;
  } else if (awayTeam !== undefined) {
    await sql`UPDATE knockout_matches SET away_team = ${awayTeam ?? null} WHERE id = ${matchId}`;
  }

  if (result !== undefined) {
    const val = result === '' ? null : result;
    await sql`UPDATE knockout_matches SET result = ${val} WHERE id = ${matchId}`;
  }

  return NextResponse.json({ ok: true });
}
