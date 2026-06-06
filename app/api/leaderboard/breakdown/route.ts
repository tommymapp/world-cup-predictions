import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ROUND_POINTS } from '@/lib/knockout';

export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');
  if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 });

  const [{ rows: groupRows }, { rows: koRows }, { rows: awardRows }] = await Promise.all([
    sql`
      SELECT gp.group_name, gp.position, gp.team AS predicted, gr.team AS actual
      FROM group_predictions gp
      LEFT JOIN group_results gr
        ON gr.group_name = gp.group_name AND gr.position = gp.position
      WHERE gp.player_name = ${player}
      ORDER BY gp.group_name, gp.position
    `,
    sql`
      SELECT km.match_number, km.round, kp.prediction,
             CASE WHEN km.result = 'home' THEN km.home_team
                  WHEN km.result = 'away' THEN km.away_team
                  ELSE NULL END AS actual_winner,
             km.result IS NOT NULL AS settled
      FROM knockout_predictions kp
      JOIN knockout_matches km ON km.id = kp.match_id
      WHERE kp.player_name = ${player}
      ORDER BY km.match_number
    `,
    sql`
      SELECT ap.award_key, ap.value AS predicted, ar.value AS actual
      FROM award_predictions ap
      LEFT JOIN award_results ar ON ar.award_key = ap.award_key
      WHERE ap.player_name = ${player}
      ORDER BY ap.award_key
    `,
  ]);

  // Group picks by group_name
  const groupMap: Record<string, { position: number; predicted: string; actual: string | null; correct: boolean }[]> = {};
  for (const r of groupRows) {
    const g = r.group_name as string;
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push({
      position: r.position as number,
      predicted: r.predicted as string,
      actual: (r.actual as string | null) ?? null,
      correct: r.actual !== null && r.actual === r.predicted,
    });
  }
  const groups = Object.entries(groupMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, picks]) => ({ group, picks }));

  const roundPoints: Record<string, number> = ROUND_POINTS as Record<string, number>;
  const knockout = koRows.map(r => ({
    match_number: r.match_number as number,
    round: r.round as string,
    predicted: r.prediction as string,
    actual_winner: (r.actual_winner as string | null) ?? null,
    settled: r.settled as boolean,
    correct: r.actual_winner !== null && r.actual_winner === r.prediction,
    points: roundPoints[r.round as string] ?? 0,
  }));

  const awards = awardRows.map(r => ({
    award_key: r.award_key as string,
    predicted: r.predicted as string,
    actual: (r.actual as string | null) ?? null,
    correct: r.actual !== null && (r.actual as string).toLowerCase() === (r.predicted as string).toLowerCase(),
  }));

  return NextResponse.json({ groups, knockout, awards });
}
