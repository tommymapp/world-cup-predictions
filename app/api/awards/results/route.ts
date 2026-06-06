import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

// GET: award results + per-player scores
export async function GET() {
  const { rows: results } = await sql`SELECT award_key, value FROM award_results`;

  const { rows: scores } = await sql`
    SELECT ap.player_name,
      SUM(CASE
        WHEN lower(ar.value) = lower(ap.value) THEN
          CASE WHEN ap.award_key IN ('golden_ball','golden_boot','golden_glove','best_young_player','goal_of_tournament') THEN 10 ELSE 5 END
        ELSE 0
      END)::int AS award_points
    FROM award_predictions ap
    LEFT JOIN award_results ar ON ar.award_key = ap.award_key
    WHERE ap.award_key != 'team_formation'
    GROUP BY ap.player_name
    HAVING SUM(CASE
      WHEN lower(ar.value) = lower(ap.value) THEN
        CASE WHEN ap.award_key IN ('golden_ball','golden_boot','golden_glove','best_young_player','goal_of_tournament') THEN 10 ELSE 5 END
      ELSE 0
    END) > 0
  `;

  return NextResponse.json({ results, scores });
}

// POST: admin sets an award result
export async function POST(req: NextRequest) {
  const { secret, awardKey, value } = await req.json();
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clean = String(value ?? '').trim().slice(0, 100);
  if (clean === '') {
    await sql`DELETE FROM award_results WHERE award_key = ${awardKey}`;
  } else {
    await sql`
      INSERT INTO award_results (award_key, value)
      VALUES (${awardKey}, ${clean})
      ON CONFLICT (award_key) DO UPDATE SET value = ${clean}
    `;
  }
  return NextResponse.json({ ok: true });
}
