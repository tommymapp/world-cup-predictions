import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { GROUPS } from '@/lib/groups';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

// GET: actual results + per-player scores (1pt per correct position)
export async function GET() {
  const { rows: results } = await sql`
    SELECT group_name, position, team FROM group_results ORDER BY group_name, position
  `;

  const { rows: scores } = await sql`
    SELECT gp.player_name,
      SUM(
        CASE WHEN gr_exact.team IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN gp.position IN (1, 2) AND gr_team.position IN (1, 2) THEN 1 ELSE 0 END
      )::int AS group_points
    FROM group_predictions gp
    LEFT JOIN group_results gr_exact
      ON gr_exact.group_name = gp.group_name
      AND gr_exact.position  = gp.position
      AND gr_exact.team      = gp.team
    LEFT JOIN group_results gr_team
      ON gr_team.group_name = gp.group_name
      AND gr_team.team      = gp.team
    GROUP BY gp.player_name
    HAVING SUM(
      CASE WHEN gr_exact.team IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN gp.position IN (1, 2) AND gr_team.position IN (1, 2) THEN 1 ELSE 0 END
    ) > 0
  `;

  return NextResponse.json({ results, scores });
}

// POST: admin sets a team's final position in a group
export async function POST(req: NextRequest) {
  const { secret, group, position, team } = await req.json();
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const validTeams = GROUPS[group];
  if (!validTeams) return NextResponse.json({ error: 'Invalid group' }, { status: 400 });
  if (![1, 2, 3, 4].includes(position)) return NextResponse.json({ error: 'Invalid position' }, { status: 400 });

  if (!team) {
    await sql`DELETE FROM group_results WHERE group_name = ${group} AND position = ${position}`;
  } else {
    if (!validTeams.includes(team)) return NextResponse.json({ error: 'Team not in group' }, { status: 400 });
    // Remove any existing entry for this team in this group first
    await sql`DELETE FROM group_results WHERE group_name = ${group} AND team = ${team}`;
    await sql`
      INSERT INTO group_results (group_name, position, team)
      VALUES (${group}, ${position}, ${team})
      ON CONFLICT (group_name, position) DO UPDATE SET team = ${team}
    `;
  }

  return NextResponse.json({ ok: true });
}
