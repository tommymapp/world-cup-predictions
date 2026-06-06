import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

// GET: award results + per-player scores
export async function GET() {
  const { rows: results } = await sql`SELECT award_key, value FROM award_results`;

  const { rows: scores } = await sql`
    SELECT ap.player_name, COUNT(*) AS award_points
    FROM award_predictions ap
    JOIN award_results ar ON ar.award_key = ap.award_key AND ar.value = ap.value
    GROUP BY ap.player_name
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
